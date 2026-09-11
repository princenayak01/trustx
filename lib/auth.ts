import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import { cookies } from 'next/headers'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

const SESSION_COOKIE = 'trustx_session'
const SESSION_DAYS = 7

export type AuthUser = { id: string; name: string; email: string; role: string }

async function ensureAuthTables() {
  await db.execute(sql`create extension if not exists pgcrypto`)
  await db.execute(sql`create table if not exists trustx_auth_users (
    id uuid primary key default gen_random_uuid(), full_name varchar(160) not null,
    email varchar(320) not null unique, password_hash text not null,
    role varchar(30) not null default 'USER', is_active boolean not null default true,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  )`)
  await db.execute(sql`create table if not exists trustx_auth_sessions (
    id uuid primary key default gen_random_uuid(), user_id uuid not null,
    token_hash varchar(128) not null unique, expires_at timestamptz not null,
    created_at timestamptz not null default now()
  )`)
  await db.execute(sql`create index if not exists trustx_auth_sessions_token_idx on trustx_auth_sessions(token_hash)`)
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

function verifyPassword(password: string, encoded: string) {
  const [, salt, expected] = encoded.split('$')
  if (!salt || !expected) return false
  try {
    const actual = scryptSync(password, salt, 64)
    const expectedBuffer = Buffer.from(expected, 'hex')
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer)
  } catch { return false }
}

function hashToken(token: string) { return createHash('sha256').update(token).digest('hex') }

export async function registerUser(name: string, email: string, password: string) {
  await ensureAuthTables()
  const normalizedEmail = email.trim().toLowerCase()
  const existingResult = await db.execute(sql`select id from trustx_auth_users where email = ${normalizedEmail} limit 1`)
  if (existingResult.rows[0]) throw new Error('An account with this email already exists.')
  const result = await db.execute(sql`insert into trustx_auth_users (full_name, email, password_hash)
    values (${name.trim()}, ${normalizedEmail}, ${hashPassword(password)}) returning id, full_name, email, role`)
  const user = result.rows[0] as { id:string; full_name:string; email:string; role:string }
  return createSession({ id:user.id, name:user.full_name, email:user.email, role:user.role })
}

export async function loginUser(email: string, password: string) {
  await ensureAuthTables()
  const normalizedEmail = email.trim().toLowerCase()
  const result = await db.execute(sql`select id, full_name, email, role, password_hash, is_active
    from trustx_auth_users where email = ${normalizedEmail} limit 1`)
  const user = result.rows[0] as { id:string; full_name:string; email:string; role:string; password_hash:string; is_active:boolean } | undefined
  if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) throw new Error('Invalid email or password.')
  return createSession({ id:user.id, name:user.full_name, email:user.email, role:user.role })
}

export async function createSession(user: AuthUser) {
  await ensureAuthTables()
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000)
  await db.execute(sql`insert into trustx_auth_sessions (user_id, token_hash, expires_at) values (${user.id}, ${hashToken(token)}, ${expires})`)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, { httpOnly:true, secure:process.env.NODE_ENV === 'production', sameSite:'lax', path:'/', expires, maxAge:SESSION_DAYS*86400 })
  return user
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  await ensureAuthTables()
  const store = await cookies(); const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const result = await db.execute(sql`select u.id, u.full_name, u.email, u.role from trustx_auth_sessions s
    join trustx_auth_users u on u.id = s.user_id
    where s.token_hash = ${hashToken(token)} and s.expires_at > now() and u.is_active = true limit 1`)
  const row = result.rows[0] as { id:string; full_name:string; email:string; role:string } | undefined
  return row ? { id:row.id, name:row.full_name, email:row.email, role:row.role } : null
}

export async function logoutUser() {
  await ensureAuthTables()
  const store = await cookies(); const token = store.get(SESSION_COOKIE)?.value
  if (token) await db.execute(sql`delete from trustx_auth_sessions where token_hash = ${hashToken(token)}`)
  store.set(SESSION_COOKIE, '', { httpOnly:true, secure:process.env.NODE_ENV === 'production', sameSite:'lax', path:'/', maxAge:0 })
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Authentication required.')
  return user
}
