import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

/**
 * One-time/demo database bootstrap for hosted PostgreSQL instances.
 * This intentionally creates only the TrustX tables required by the MVP.
 * Production deployments should use formal Drizzle migrations instead.
 */
export async function POST() {
  try {
    await db.execute(sql`create extension if not exists pgcrypto`)
    await db.execute(sql`do $$ begin create type role as enum ('ADMIN','ANALYST','REVIEWER','USER'); exception when duplicate_object then null; end $$`)
    await db.execute(sql`do $$ begin create type screening_status as enum ('QUEUED','PROCESSING','COMPLETED','FAILED','MANUAL_REVIEW'); exception when duplicate_object then null; end $$`)
    await db.execute(sql`do $$ begin create type risk_level as enum ('LOW','MEDIUM','HIGH','CRITICAL'); exception when duplicate_object then null; end $$`)

    await db.execute(sql`create table if not exists users (
      id uuid primary key default gen_random_uuid(), full_name varchar(160) not null,
      email varchar(320) not null unique, password_hash text not null,
      role role not null default 'USER', is_active boolean not null default true,
      last_login_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
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

    const [user] = await db.execute(sql`insert into users (full_name,email,password_hash,role,is_active)
      values ('TrustX Demo User','demo@trustx.local','demo-account-not-for-authentication','ADMIN',true)
      on conflict (email) do update set is_active=true, updated_at=now()
      returning id`)

    return NextResponse.json({ success: true, data: { demoUserId: (user as { id: string }).id }, message: 'TrustX database initialized.' })
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_INIT_FAILED', message: error instanceof Error ? error.message : 'Database initialization failed.' } }, { status: 500 })
  }
}
