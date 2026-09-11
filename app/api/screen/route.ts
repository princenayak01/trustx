import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditLogs, documents, forensicResults, ocrResults, riskFactors, screenings, validationResults } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'
import { calculateRisk } from '@/lib/risk-engine'
import { buildDemoAnalysis, sha256, validateUpload } from '@/lib/screening'

export const runtime = 'nodejs'

async function ensureScreeningStorageCompatibility() {
  // Self-heal the demo database. Vercel can deploy the app without ever calling
  // /api/db-init, so the screening endpoint must not assume tables already exist.
  await db.execute(sql`create extension if not exists pgcrypto`)
  await db.execute(sql`do $$ begin create type screening_status as enum ('QUEUED','PROCESSING','COMPLETED','FAILED','MANUAL_REVIEW'); exception when duplicate_object then null; end $$`)
  await db.execute(sql`do $$ begin create type risk_level as enum ('LOW','MEDIUM','HIGH','CRITICAL'); exception when duplicate_object then null; end $$`)

  await db.execute(sql`create table if not exists documents (
    id uuid primary key default gen_random_uuid(), owner_id uuid not null,
    original_filename varchar(255) not null, stored_filename varchar(255) not null,
    mime_type varchar(100) not null, file_size integer not null, document_type varchar(80) not null,
    file_hash varchar(128) not null, storage_key text not null, status varchar(40) not null default 'ACTIVE',
    created_at timestamptz not null default now()
  )`)
  await db.execute(sql`create table if not exists screenings (
    id uuid primary key default gen_random_uuid(), document_id uuid not null, requested_by uuid not null,
    risk_score real, risk_level risk_level, status screening_status not null default 'QUEUED',
    model_version varchar(80) not null default 'trustx-risk-model-v1.0',
    processing_started_at timestamptz, processing_completed_at timestamptz, created_at timestamptz not null default now()
  )`)
  await db.execute(sql`create table if not exists ocr_results (
    id uuid primary key default gen_random_uuid(), screening_id uuid not null, ocr_engine varchar(80) not null,
    confidence real not null, extracted_fields jsonb not null, created_at timestamptz not null default now()
  )`)
  await db.execute(sql`create table if not exists forensic_results (
    id uuid primary key default gen_random_uuid(), screening_id uuid not null, tampering_probability real not null,
    compression_anomaly real not null, copy_move_probability real not null, noise_inconsistency real not null,
    metadata_anomaly real not null, created_at timestamptz not null default now()
  )`)
  await db.execute(sql`create table if not exists validation_results (
    id uuid primary key default gen_random_uuid(), screening_id uuid not null, format_score real not null,
    structure_score real not null, field_consistency_score real not null, qr_consistency_score real not null,
    date_consistency_score real not null, created_at timestamptz not null default now()
  )`)
  await db.execute(sql`create table if not exists risk_factors (
    id uuid primary key default gen_random_uuid(), screening_id uuid not null, factor_type varchar(80) not null,
    severity varchar(30) not null, score real not null, description text not null, created_at timestamptz not null default now()
  )`)
  await db.execute(sql`create table if not exists audit_logs (
    id uuid primary key default gen_random_uuid(), user_id uuid, action varchar(80) not null,
    resource_type varchar(80) not null, resource_id varchar(120), ip_hash varchar(128), metadata jsonb,
    created_at timestamptz not null default now()
  )`)

  // Remove legacy foreign keys that point at an unrelated users table. TrustX
  // auth has its own user store, so these UUIDs intentionally have no FK.
  await db.execute(sql`
    do $$
    declare r record;
    begin
      for r in
        select distinct n.nspname as schema_name, c.relname as table_name, con.conname as constraint_name
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join pg_namespace n on n.oid = c.relnamespace
        join pg_class parent on parent.oid = con.confrelid
        join unnest(con.conkey) as k(attnum) on true
        join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
        where con.contype = 'f'
          and n.nspname not in ('pg_catalog', 'information_schema')
          and c.relname in ('documents', 'screenings', 'reviews', 'audit_logs', 'refresh_tokens')
          and a.attname in ('owner_id', 'requested_by', 'reviewer_id', 'user_id')
          and parent.relname in ('users', 'trustx_demo_users')
      loop
        execute format('alter table %I.%I drop constraint if exists %I', r.schema_name, r.table_name, r.constraint_name);
      end loop;
    end $$
  `)
}

async function runAIService(input: { screeningId: string; filename: string; mimeType: string; bytes: Buffer }) {
  const url = process.env.AI_SERVICE_URL
  if (!url) return null
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/analyze`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ screening_id: input.screeningId, filename: input.filename, mime_type: input.mimeType, content_base64: input.bytes.toString('base64') }),
      signal: controller.signal, cache: 'no-store',
    })
    if (!response.ok) return null
    const result = await response.json()
    return result?.success ? result : null
  } catch { return null } finally { clearTimeout(timeout) }
}

export async function POST(request: NextRequest) {
  let stage = 'authentication'
  try {
    const user = await requireUser()
    stage = 'database compatibility check'
    await ensureScreeningStorageCompatibility()
    stage = 'reading upload'
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ success:false, error:{ code:'FILE_REQUIRED', message:'A document file is required.' } }, { status:400 })
    stage = 'validating upload'
    validateUpload(file)

    const ownerId = user.id
    const documentType = String(form.get('documentType') || 'IDENTITY_DOCUMENT')
    const bytes = Buffer.from(await file.arrayBuffer())
    const hash = sha256(bytes)
    const storedFilename = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const storageKey = `private/${storedFilename}`

    stage = 'creating document record'
    const [document] = await db.insert(documents).values({ ownerId, originalFilename:file.name.slice(0,255), storedFilename, mimeType:file.type, fileSize:file.size, documentType:documentType.slice(0,80), fileHash:hash, storageKey }).returning()
    stage = 'creating screening record'
    const [screening] = await db.insert(screenings).values({ documentId:document.id, requestedBy:ownerId, status:'PROCESSING', processingStartedAt:new Date() }).returning()

    stage = 'AI analysis'
    const ai = await runAIService({ screeningId:screening.id, filename:file.name, mimeType:file.type, bytes })
    let analysis: ReturnType<typeof buildDemoAnalysis>
    let ocrConfidence:number
    let forensic:{tampering_probability:number;compression_anomaly:number;copy_move_probability:number;noise_inconsistency:number;metadata_anomaly:number}
    let validation:{format_score:number;structure_score:number;field_consistency_score:number;qr_consistency_score:number;date_consistency_score:number}
    let analysisMode = 'DEMO_FALLBACK'
    if (ai?.ocr && ai?.forensics && ai?.validation) {
      ocrConfidence=Number(ai.ocr.confidence); forensic=ai.forensics; validation=ai.validation
      analysis=calculateRisk({ tamperingProbability:Number(forensic.tampering_probability), compressionAnomaly:Number(forensic.compression_anomaly), copyMoveProbability:Number(forensic.copy_move_probability), noiseInconsistency:Number(forensic.noise_inconsistency), metadataAnomaly:Number(forensic.metadata_anomaly), ocrConfidence, formatScore:Number(validation.format_score), structureScore:Number(validation.structure_score), fieldConsistencyScore:Number(validation.field_consistency_score), qrConsistencyScore:Number(validation.qr_consistency_score), dateConsistencyScore:Number(validation.date_consistency_score) })
      analysisMode='PYTHON_AI_SERVICE'
    } else {
      analysis=buildDemoAnalysis(parseInt(hash.slice(0,8),16)); ocrConfidence=analysis.level==='CRITICAL'?0.71:analysis.level==='HIGH'?0.84:0.96
      forensic={tampering_probability:0.02,compression_anomaly:0.08,copy_move_probability:0.04,noise_inconsistency:0.06,metadata_anomaly:0.05}
      validation={format_score:94,structure_score:92,field_consistency_score:94,qr_consistency_score:91,date_consistency_score:96}
    }

    stage='saving OCR result'
    await db.insert(ocrResults).values({ screeningId:screening.id, ocrEngine:ai?.ocr?.engine||'trustx-ocr-adapter', confidence:ocrConfidence, extractedFields:{documentType,mode:analysisMode,fields:ai?.ocr?.fields||[]} })
    stage='saving forensic result'
    await db.insert(forensicResults).values({screeningId:screening.id,tamperingProbability:Number(forensic.tampering_probability),compressionAnomaly:Number(forensic.compression_anomaly),copyMoveProbability:Number(forensic.copy_move_probability),noiseInconsistency:Number(forensic.noise_inconsistency),metadataAnomaly:Number(forensic.metadata_anomaly)})
    stage='saving validation result'
    await db.insert(validationResults).values({screeningId:screening.id,formatScore:Number(validation.format_score),structureScore:Number(validation.structure_score),fieldConsistencyScore:Number(validation.field_consistency_score),qrConsistencyScore:Number(validation.qr_consistency_score),dateConsistencyScore:Number(validation.date_consistency_score)})
    stage='saving risk factors'
    if (analysis.factors.length) await db.insert(riskFactors).values(analysis.factors.map(f=>({screeningId:screening.id,factorType:f.type,severity:f.severity,score:f.score,description:f.description})))
    stage='updating screening result'
    const finalStatus=analysis.level==='HIGH'||analysis.level==='CRITICAL'?'MANUAL_REVIEW':'COMPLETED'
    const [updated]=await db.update(screenings).set({riskScore:analysis.score,riskLevel:analysis.level,status:finalStatus,modelVersion:analysis.modelVersion,processingCompletedAt:new Date()}).where(eq(screenings.id,screening.id)).returning()
    stage='writing audit log'
    await db.insert(auditLogs).values({userId:ownerId,action:'SCREENING_CREATED',resourceType:'SCREENING',resourceId:screening.id,metadata:{documentHash:hash,mode:analysisMode}})
    return NextResponse.json({success:true,data:{document,screening:updated,analysis,mode:analysisMode},message:'Document screened successfully.'},{status:201})
  } catch(error) {
    const err=error as {message?:string;code?:string;detail?:string;constraint?:string;cause?:{code?:string;detail?:string;constraint?:string}}
    const cause=err.cause||{}; const code=err.code||cause.code||'UNKNOWN'; const constraint=err.constraint||cause.constraint; const detail=err.detail||cause.detail; const rawMessage=err.message||'Unable to process document.'
    console.error('TrustX screening error',{stage,code,message:rawMessage,detail,constraint})
    if(rawMessage==='Authentication required.') return NextResponse.json({success:false,error:{code:'UNAUTHORIZED',message:rawMessage}},{status:401})
    const diagnostic=[`Upload failed during ${stage}.`,rawMessage,code!=='UNKNOWN'?`Database code: ${code}.`:'',constraint?`Constraint: ${constraint}.`:'',detail?`Detail: ${detail}.`:''].filter(Boolean).join(' ')
    return NextResponse.json({success:false,error:{code:'SCREENING_FAILED',message:diagnostic}},{status:400})
  }
}
