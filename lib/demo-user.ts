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
  await db.execute(sql`
    create table if not exists trustx_demo_users (
      id uuid primary key default gen_random_uuid(),
      email varchar(320) not null unique,
      full_name varchar(160) not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
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
