import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auditLogs, documents, forensicResults, ocrResults, riskFactors, screenings, validationResults } from '@/lib/db/schema'
import { buildDemoAnalysis, sha256, validateUpload } from '@/lib/screening'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    const ownerId = String(form.get('ownerId') || '')
    const documentType = String(form.get('documentType') || 'IDENTITY_DOCUMENT')

    if (!(file instanceof File)) return NextResponse.json({ success: false, error: { code: 'FILE_REQUIRED', message: 'A document file is required.' } }, { status: 400 })
    if (!/^[0-9a-f-]{36}$/i.test(ownerId)) return NextResponse.json({ success: false, error: { code: 'OWNER_REQUIRED', message: 'A valid ownerId is required.' } }, { status: 400 })
    validateUpload(file)

    const bytes = Buffer.from(await file.arrayBuffer())
    const hash = sha256(bytes)
    const storedFilename = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const storageKey = `private/${storedFilename}`

    const [document] = await db.insert(documents).values({ ownerId, originalFilename: file.name.slice(0, 255), storedFilename, mimeType: file.type, fileSize: file.size, documentType: documentType.slice(0, 80), fileHash: hash, storageKey }).returning()
    const [screening] = await db.insert(screenings).values({ documentId: document.id, requestedBy: ownerId, status: 'PROCESSING', processingStartedAt: new Date() }).returning()

    // Demo-safe deterministic analysis. Replace the adapter with the Python AI service in production.
    const analysis = buildDemoAnalysis(parseInt(hash.slice(0, 8), 16))
    const ocrConfidence = analysis.level === 'CRITICAL' ? 0.71 : analysis.level === 'HIGH' ? 0.84 : 0.96

    await db.insert(ocrResults).values({ screeningId: screening.id, ocrEngine: 'trustx-ocr-adapter', confidence: ocrConfidence, extractedFields: { documentType, demoMode: true } })
    await db.insert(forensicResults).values({ screeningId: screening.id, tamperingProbability: analysis.factors.find(f => f.type === 'IMAGE_TAMPERING')?.score ? (analysis.factors.find(f => f.type === 'IMAGE_TAMPERING')!.score / 100) : 0.02, compressionAnomaly: 0.08, copyMoveProbability: 0.04, noiseInconsistency: 0.06, metadataAnomaly: 0.05 })
    await db.insert(validationResults).values({ screeningId: screening.id, formatScore: 94, structureScore: 92, fieldConsistencyScore: 94, qrConsistencyScore: 91, dateConsistencyScore: 96 })
    if (analysis.factors.length) await db.insert(riskFactors).values(analysis.factors.map(f => ({ screeningId: screening.id, factorType: f.type, severity: f.severity, score: f.score, description: f.description })))

    const finalStatus = analysis.level === 'HIGH' || analysis.level === 'CRITICAL' ? 'MANUAL_REVIEW' : 'COMPLETED'
    const [updated] = await db.update(screenings).set({ riskScore: analysis.score, riskLevel: analysis.level, status: finalStatus, modelVersion: analysis.modelVersion, processingCompletedAt: new Date() }).where((await import('drizzle-orm')).eq(screenings.id, screening.id)).returning()
    await db.insert(auditLogs).values({ userId: ownerId, action: 'SCREENING_CREATED', resourceType: 'SCREENING', resourceId: screening.id, metadata: { documentHash: hash, mode: 'DEMO_AI_ADAPTER' } })

    return NextResponse.json({ success: true, data: { document, screening: updated, analysis }, message: 'Document screened successfully.' }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to process document.'
    return NextResponse.json({ success: false, error: { code: 'SCREENING_FAILED', message } }, { status: 400 })
  }
}
