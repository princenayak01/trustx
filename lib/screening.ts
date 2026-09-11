import { createHash } from 'node:crypto'
import { calculateRisk, type RiskInput } from './risk-engine'

export const MAX_SCREENING_FILE_SIZE = 10 * 1024 * 1024
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const

export function sha256(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

export function validateUpload(file: File) {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) throw new Error('Unsupported file type. Use PDF, JPEG, or PNG.')
  if (file.size <= 0 || file.size > MAX_SCREENING_FILE_SIZE) throw new Error('File must be between 1 byte and 10 MB.')
}

/**
 * Safe fallback used when the optional Python AI service is unavailable.
 * It must NOT randomly label an uploaded document as fraudulent: a hash is
 * not evidence of tampering. The fallback therefore represents a clean,
 * low-risk synthetic baseline until real analysis is available.
 */
export function buildDemoAnalysis(_seed = 0) {
  const input: RiskInput = {
    tamperingProbability: 0.02,
    compressionAnomaly: 0.08,
    copyMoveProbability: 0.04,
    noiseInconsistency: 0.06,
    metadataAnomaly: 0.05,
    ocrConfidence: 0.96,
    formatScore: 94,
    structureScore: 92,
    fieldConsistencyScore: 94,
    qrConsistencyScore: 91,
    dateConsistencyScore: 96,
  }
  return calculateRisk(input)
}
