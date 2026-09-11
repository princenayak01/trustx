import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [summary] = await db.execute(sql`
      select
        count(*)::int as total,
        count(*) filter (where risk_level = 'LOW')::int as low,
        count(*) filter (where risk_level = 'MEDIUM')::int as medium,
        count(*) filter (where risk_level = 'HIGH')::int as high,
        count(*) filter (where risk_level = 'CRITICAL')::int as critical,
        count(*) filter (where status = 'MANUAL_REVIEW')::int as manual_reviews,
        coalesce(round(avg(risk_score)::numeric, 1), 0)::float as average_score
      from screenings
    `)
    const daily = await db.execute(sql`
      select date_trunc('day', created_at)::date as day, count(*)::int as screened,
        count(*) filter (where status = 'MANUAL_REVIEW')::int as flagged
      from screenings
      where created_at >= now() - interval '30 days'
      group by 1 order by 1
    `)
    return NextResponse.json({ success: true, data: { summary, daily }, message: 'Analytics loaded' })
  } catch {
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Analytics are temporarily unavailable.' } }, { status: 503 })
  }
}
