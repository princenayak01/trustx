import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { documents, forensicResults, ocrResults, riskFactors, screenings, validationResults } from '@/lib/db/schema'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const [row] = await db.select({ screening: screenings, document: documents })
      .from(screenings).innerJoin(documents, eq(screenings.documentId, documents.id))
      .where(eq(screenings.id, id)).limit(1)
    if (!row) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Screening not found.' } }, { status: 404 })
    const [ocr, forensic, validation, factors] = await Promise.all([
      db.select().from(ocrResults).where(eq(ocrResults.screeningId, id)).limit(1),
      db.select().from(forensicResults).where(eq(forensicResults.screeningId, id)).limit(1),
      db.select().from(validationResults).where(eq(validationResults.screeningId, id)).limit(1),
      db.select().from(riskFactors).where(eq(riskFactors.screeningId, id)),
    ])
    return NextResponse.json({ success: true, data: { ...row, ocr: ocr[0] ?? null, forensic: forensic[0] ?? null, validation: validation[0] ?? null, factors }, message: 'Report data loaded' })
  } catch {
    return NextResponse.json({ success: false, error: { code: 'REPORT_FAILED', message: 'Unable to generate report data.' } }, { status: 503 })
  }
}
