import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const DEMO_USER_EMAIL = 'demo@trustx.local'

/**
 * TrustX screening APIs need a UUID owner/reviewer, but hosted databases may
 * already contain an auth-managed `users` table with a different schema.
 * Keep the demo identity in an isolated table so auth migrations cannot break
 * screening uploads.
 */
export async function ensureDemoUser() {
  await db.execute(sql`create extension if not exists pgcrypto`)

  await db.execute(sql`
    create table if not exists trustx_demo_users (
      id uuid primary key default gen_random_uuid(),
      email varchar(320) not null unique,
      full_name varchar(160) not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)

  // Hosted databases can contain foreign keys left over from an auth schema.
  // Those constraints may point owner/reviewer IDs at an incompatible `users`
  // table and reject otherwise valid TrustX demo UUIDs. Remove only FK
  // constraints attached to TrustX identity columns; no user data is deleted.
  await db.execute(sql`
    do $$
    declare
      r record;
    begin
      for r in
        select
          n.nspname as schema_name,
          c.relname as table_name,
          con.conname as constraint_name
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join pg_namespace n on n.oid = c.relnamespace
        join unnest(con.conkey) with ordinality as k(attnum, ord) on true
        join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
        where con.contype = 'f'
          and n.nspname = current_schema()
          and c.relname in ('documents', 'screenings', 'reviews', 'audit_logs', 'refresh_tokens')
          and a.attname in ('owner_id', 'requested_by', 'reviewer_id', 'user_id')
      loop
        execute format(
          'alter table %I.%I drop constraint if exists %I',
          r.schema_name, r.table_name, r.constraint_name
        );
      end loop;
    end $$
  `)

  const result = await db.execute(sql`
    insert into trustx_demo_users (email, full_name)
    values (${DEMO_USER_EMAIL}, 'TrustX Demo User')
    on conflict (email) do update set updated_at = now()
    returning id
  `)

  const user = result.rows[0] as { id?: string } | undefined
  if (!user?.id) throw new Error('Unable to initialize the TrustX demo user.')
  return user.id
}
