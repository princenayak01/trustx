import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditLogs, documents, forensicResults, ocrResults, riskFactors, screenings, validationResults } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'
import { calculateRisk } from '@/lib/risk-engine'
import { buildDemoAnalysis, sha256, validateUpload } from '@/lib/screening'

export const runtime = 'nodejs'

/**
 * Hosted PostgreSQL databases can retain a legacy FK such as
 * documents.owner_id -> users.id from an older auth schema. TrustX auth now
 * uses trustx_auth_users, so that legacy FK makes an otherwise valid upload
 * fail with a misleading Drizzle "Failed query" message. Remove only those
 * legacy FKs; do not remove unrelated constraints.
 */
async function ensureScreeningStorageCompatibility() {
  await db.execute(sql`
    do $$
    declare r record;
    begin
      for r in
        select distinct
          n.nspname as schema_name,
          c.relname as table_name,
          con.conname as constraint_name
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join pg_namespace n on n.oid = c.relnamespace
        join pg_class parent on parent.oid = con.confrelid
        join pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
        join unnest(con.conkey) as k(attnum) on true
        join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
        where con.contype = 'f'
          and n.nspname not in ('pg_catalog', 'information_schema')
          and c.relname in ('documents', 'screenings', 'reviews', 'audit_logs', 'refresh_tokens')
          and a.attname in ('owner_id', 'requested_by', 'reviewer_id', 'user_id')
          and parent.relname in ('users', 'trustx_demo_users')
      loop
        execute format(
          'alter table %I.%I drop constraint if exists %I',
          r.schema_name, r.table_name, r.constraint_name
        );
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
  try {
    const user = await requireUser()
    await ensureScreeningStorageCompatibility()

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: { code: 'FILE_REQUIRED', message: 'A document file is required.' } }, { status: 400 })
    validateUpload(file)

    const ownerId = user.id
    const documentType = String(form.get('documentType') || 'IDENTITY_DOCUMENT')
    const bytes = Buffer.from(await file.arrayBuffer())
    const hash = sha256(bytes)
    const storedFilename = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const storageKey = `private/${storedFilename}`

    const [document] = await db.insert(documents).values({ ownerId, originalFilename: file.name.slice(0, 255), storedFilename, mimeType: file.type, fileSize: file.size, documentType: documentType.slice(0, 80), fileHash: hash, storageKey }).returning()
    const [screening] = await db.insert(screenings).values({ documentId: document.id, requestedBy: ownerId, status: 'PROCESSING', processingStartedAt: new Date() }).returning()

    const ai = await runAIService({ screeningId: screening.id, filename: file.name, mimeType: file.type, bytes })
    let analysis: ReturnType<typeof buildDemoAnalysis>
    let ocrConfidence: number
    let forensic: { tampering_probability:number; compression_anomaly:number; copy_move_probability:number; noise_inconsistency:number; metadata_anomaly:number }
    let validation: { format_score:number; structure_score:number; field_consistency_score:number; qr_consistency_score:number; date_consistency_score:number }
    let analysisMode = 'DEMO_FALLBACK'

    if (ai?.ocr && ai?.forensics && ai?.validation) {
      ocrConfidence = Number(ai.ocr.confidence); forensic = ai.forensics; validation = ai.validation
      analysis = calculateRisk({ tamperingProbability:Number(forensic.tampering_probability), compressionAnomaly:Number(forensic.compression_anomaly), copyMoveProbability:Number(forensic.copy_move_probability), noiseInconsistency:Number(forensic.noise_inconsistency), metadataAnomaly:Number(forensic.metadata_anomaly), ocrConfidence, formatScore:Number(validation.format_score), structureScore:Number(validation.structure_score), fieldConsistencyScore:Number(validation.field_consistency_score), qrConsistencyScore:Number(validation.qr_consistency_score), dateConsistencyScore:Number(validation.date_consistency_score) })
      analysisMode = 'PYTHON_AI_SERVICE'
    } else {
      analysis = buildDemoAnalysis(parseInt(hash.slice(0, 8), 16)); ocrConfidence = analysis.level === 'CRITICAL' ? 0.71 : analysis.level === 'HIGH' ? 0.84 : 0.96
      forensic = { tampering_probability:0.02, compression_anomaly:0.08, copy_move_probability:0.04, noise_inconsistency:0.06, metadata_anomaly:0.05 }
      validation = { format_score:94, structure_score:92, field_consistency_score:94, qr_consistency_score:91, date_consistency_score:96 }
    }

    await db.insert(ocrResults).values({ screeningId:screening.id, ocrEngine:ai?.ocr?.engine || 'trustx-ocr-adapter', confidence:ocrConfidence, extractedFields:{ documentType, mode:analysisMode, fields:ai?.ocr?.fields || [] } })
    await db.insert(forensicResults).values({ screeningId:screening.id, tamperingProbability:Number(forensic.tampering_probability), compressionAnomaly:Number(forensic.compression_anomaly), copyMoveProbability:Number(forensic.copy_move_probability), noiseInconsistency:Number(forensic.noise_inconsistency), metadataAnomaly:Number(forensic.metadata_anomaly) })
    await db.insert(validationResults).values({ screeningId:screening.id, formatScore:Number(validation.format_score), structureScore:Number(validation.structure_score), fieldConsistencyScore:Number(validation.field_consistency_score), qrConsistencyScore:Number(validation.qr_consistency_score), dateConsistencyScore:Number(validation.date_consistency_score) })
    if (analysis.factors.length) await db.insert(riskFactors).values(analysis.factors.map((f) => ({ screeningId:screening.id, factorType:f.type, severity:f.severity, score:f.score, description:f.description })))

    const finalStatus = analysis.level === 'HIGH' || analysis.level === 'CRITICAL' ? 'MANUAL_REVIEW' : 'COMPLETED'
    const [updated] = await db.update(screenings).set({ riskScore:analysis.score, riskLevel:analysis.level, status:finalStatus, modelVersion:analysis.modelVersion, processingCompletedAt:new Date() }).where(eq(screenings.id, screening.id)).returning()
    await db.insert(auditLogs).values({ userId:ownerId, action:'SCREENING_CREATED', resourceType:'SCREENING', resourceId:screening.id, metadata:{ documentHash:hash, mode:analysisMode } })
    return NextResponse.json({ success:true, data:{ document, screening:updated, analysis, mode:analysisMode }, message:'Document screened successfully.' }, { status:201 })
  } catch (error) {
    const err = error as { message?: string; code?: string; detail?: string; constraint?: string }
    const message = err?.message || 'Unable to process document.'
    const status = message === 'Authentication required.' ? 401 : 400
    // Keep the client message useful without exposing SQL text, connection
    // strings, query parameters, or uploaded document contents.
    const safeMessage = status === 401
      ? message
      : process.env.NODE_ENV === 'development'
        ? `${message}${err.code ? ` [${err.code}]` : ''}${err.constraint ? ` (${err.constraint})` : ''}`
        : 'Unable to process document. Please retry; if it persists, check the TrustX server logs.'
    console.error('TrustX screening error:', { code: err.code, message: err.message, detail: err.detail, constraint: err.constraint })
    return NextResponse.json({ success:false, error:{ code:status === 401 ? 'UNAUTHORIZED' : 'SCREENING_FAILED', message: safeMessage } }, { status })
  }
}
