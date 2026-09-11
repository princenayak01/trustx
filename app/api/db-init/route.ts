import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

/**
 * One-time/demo database bootstrap for hosted PostgreSQL instances.
 * TrustX keeps its demo owner identity in an isolated table because an
 * existing authentication provider may already own the `users` table.
 * Production deployments should use formal Drizzle migrations instead.
 */
export async function POST() {
  try {
    await db.execute(sql`create extension if not exists pgcrypto`)
    await db.execute(sql`do $$ begin create type screening_status as enum ('QUEUED','PROCESSING','COMPLETED','FAILED','MANUAL_REVIEW'); exception when duplicate_object then null; end $$`)
    await db.execute(sql`do $$ begin create type risk_level as enum ('LOW','MEDIUM','HIGH','CRITICAL'); exception when duplicate_object then null; end $$`)

    await db.execute(sql`create table if not exists trustx_demo_users (
      id uuid primary key default gen_random_uuid(),
      email varchar(320) not null unique,
      full_name varchar(160) not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`)
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
    await db.execute(sql`create table if not exists reviews (
      id uuid primary key default gen_random_uuid(), screening_id uuid not null, reviewer_id uuid not null,
      decision varchar(40) not null, priority varchar(30) not null, notes text,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )`)
    await db.execute(sql`create table if not exists audit_logs (
      id uuid primary key default gen_random_uuid(), user_id uuid, action varchar(80) not null,
      resource_type varchar(80) not null, resource_id varchar(120), ip_hash varchar(128), metadata jsonb,
      created_at timestamptz not null default now()
    )`)
    await db.execute(sql`create table if not exists system_settings (
      id uuid primary key default gen_random_uuid(), setting_key varchar(80) not null unique,
      setting_value text not null, updated_by uuid, updated_at timestamptz not null default now()
    )`)
    await db.execute(sql`create table if not exists refresh_tokens (
      id uuid primary key default gen_random_uuid(), user_id uuid not null, token_hash text not null,
      expires_at timestamptz not null, revoked_at timestamptz, created_at timestamptz not null default now()
    )`)

    // The database may already contain foreign keys from an older schema that
    // point these UUID columns at an incompatible authentication `users` table.
    // TrustX demo identities live in trustx_demo_users, so those legacy FKs must
    // not block valid TrustX screening writes.
    await db.execute(sql`
      do $$
      declare
        constraint_record record;
      begin
        for constraint_record in
          select tc.table_name, tc.constraint_name
          from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu
            on tc.constraint_name = kcu.constraint_name
           and tc.table_schema = kcu.table_schema
           and tc.table_name = kcu.table_name
          where tc.constraint_type = 'FOREIGN KEY'
            and tc.table_schema = current_schema()
            and (
              (tc.table_name = 'documents' and kcu.column_name = 'owner_id')
              or (tc.table_name = 'screenings' and kcu.column_name = 'requested_by')
              or (tc.table_name = 'reviews' and kcu.column_name = 'reviewer_id')
              or (tc.table_name = 'audit_logs' and kcu.column_name = 'user_id')
              or (tc.table_name = 'refresh_tokens' and kcu.column_name = 'user_id')
            )
        loop
          execute format('alter table %I drop constraint if exists %I', constraint_record.table_name, constraint_record.constraint_name);
        end loop;
      end $$
    `)

    const result = await db.execute(sql`
      insert into trustx_demo_users (email, full_name)
      values ('demo@trustx.local', 'TrustX Demo User')
      on conflict (email) do update set updated_at = now()
      returning id
    `)
    const user = result.rows[0] as { id?: string } | undefined

    return NextResponse.json({
      success: true,
      data: { demoUserId: user?.id },
      message: 'TrustX database initialized.',
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'DB_INIT_FAILED',
        message: error instanceof Error ? error.message : 'Database initialization failed.',
      },
    }, { status: 500 })
  }
}
