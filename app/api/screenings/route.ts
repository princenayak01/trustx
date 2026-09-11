import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { documents, screenings } from '@/lib/db/schema'

const createScreeningSchema = z.object({
  ownerId: z.string().uuid(),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
  documentType: z.string().min(1).max(80),
})

export async function GET() {
  try {
    const rows = await db.select({ screening: screenings, document: documents })
      .from(screenings)
      .innerJoin(documents, eq(screenings.documentId, documents.id))
      .orderBy(desc(screenings.createdAt))
      .limit(50)
    return NextResponse.json({ success: true, data: rows, message: 'Screenings loaded' })
  } catch {
    return NextResponse.json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Screenings are temporarily unavailable.' } }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = createScreeningSchema.parse(await request.json())
    const [document] = await db.insert(documents).values({
      ownerId: payload.ownerId,
      originalFilename: payload.originalFilename,
      storedFilename: crypto.randomUUID(),
      mimeType: payload.mimeType,
      fileSize: payload.fileSize,
      documentType: payload.documentType,
      fileHash: 'pending',
      storageKey: `private/${crypto.randomUUID()}`,
    }).returning()
    const [screening] = await db.insert(screenings).values({ documentId: document.id, requestedBy: payload.ownerId }).returning()
    return NextResponse.json({ success: true, data: { document, screening }, message: 'Screening queued' }, { status: 201 })
  } catch (error) {
    const message = error instanceof z.ZodError ? 'Invalid screening payload.' : 'Unable to queue screening.'
    return NextResponse.json({ success: false, error: { code: 'INVALID_SCREENING', message } }, { status: 400 })
  }
}
