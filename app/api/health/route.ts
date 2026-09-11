import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export async function GET() {
  let database = 'unavailable'
  try {
    await db.execute(sql`select 1`)
    database = 'connected'
  } catch {
    database = process.env.DATABASE_URL ? 'degraded' : 'not_configured'
  }
  const aiConfigured = Boolean(process.env.AI_SERVICE_URL)
  const data = { database, aiService: aiConfigured ? 'configured' : 'not_configured', storage: process.env.STORAGE_PATH ? 'configured' : 'not_configured', redis: process.env.REDIS_URL ? 'configured' : 'not_configured', worker: 'ready', overall: database === 'connected' ? 'operational' : 'degraded' }
  return NextResponse.json({ success: true, data, message: 'TrustX platform health' })
}
