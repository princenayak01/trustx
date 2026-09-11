import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditLogs, reviews, screenings } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const reviewer = await requireUser()
    const body = await request.json()
    const screeningId = String(body.screeningId || '')
    const decision = String(body.decision || '').toUpperCase()
    const notes = body.notes ? String(body.notes).slice(0, 4000) : null
    if (!/^[0-9a-f-]{36}$/i.test(screeningId)) return NextResponse.json({ success:false, error:{ code:'INVALID_SCREENING', message:'A valid screeningId is required.' } }, { status:400 })
    if (!['APPROVE','REJECT','ESCALATE','REQUEST_REVERIFICATION'].includes(decision)) return NextResponse.json({ success:false, error:{ code:'INVALID_DECISION', message:'Unsupported review decision.' } }, { status:400 })
    const [screening] = await db.select().from(screenings).where(eq(screenings.id, screeningId)).limit(1)
    if (!screening) return NextResponse.json({ success:false, error:{ code:'NOT_FOUND', message:'Screening not found.' } }, { status:404 })
    const priority = screening.riskLevel === 'CRITICAL' ? 'CRITICAL' : screening.riskLevel === 'HIGH' ? 'HIGH' : 'NORMAL'
    const [review] = await db.insert(reviews).values({ screeningId, reviewerId:reviewer.id, decision, priority, notes }).returning()
    const nextStatus = decision === 'ESCALATE' || decision === 'REQUEST_REVERIFICATION' ? 'MANUAL_REVIEW' : 'COMPLETED'
    await db.update(screenings).set({ status:nextStatus }).where(eq(screenings.id, screeningId))
    await db.insert(auditLogs).values({ userId:reviewer.id, action:`REVIEW_${decision}`, resourceType:'SCREENING', resourceId:screeningId, metadata:{ decision, priority } })
    return NextResponse.json({ success:true, data:{ review, status:nextStatus }, message:'Review decision recorded.' }, { status:201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to record review.'
    return NextResponse.json({ success:false, error:{ code:message === 'Authentication required.' ? 'UNAUTHORIZED' : 'REVIEW_FAILED', message } }, { status:message === 'Authentication required.' ? 401 : 400 })
  }
}

export async function GET() {
  try {
    await requireUser()
    const rows = await db.select().from(reviews).orderBy(reviews.createdAt)
    return NextResponse.json({ success:true, data:rows })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reviews are temporarily unavailable.'
    return NextResponse.json({ success:false, error:{ code:message === 'Authentication required.' ? 'UNAUTHORIZED' : 'DATABASE_UNAVAILABLE', message } }, { status:message === 'Authentication required.' ? 401 : 503 })
  }
}
