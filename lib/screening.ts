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

export function buildDemoAnalysis(seed = 0) {
  const normalized = Math.abs(seed) % 100
  const input: RiskInput = {
    tamperingProbability: normalized > 70 ? 0.72 : normalized > 45 ? 0.28 : 0.06,
    compressionAnomaly: normalized > 60 ? 0.48 : 0.12,
    copyMoveProbability: normalized > 75 ? 0.64 : 0.08,
    noiseInconsistency: normalized > 55 ? 0.32 : 0.07,
    metadataAnomaly: normalized > 65 ? 0.44 : 0.05,
    ocrConfidence: normalized > 80 ? 0.71 : 0.95,
    formatScore: normalized > 70 ? 64 : 96,
    structureScore: normalized > 70 ? 58 : 94,
    fieldConsistencyScore: normalized > 60 ? 63 : 96,
    qrConsistencyScore: normalized > 75 ? 55 : 93,
    dateConsistencyScore: normalized > 65 ? 70 : 97,
  }
  return calculateRisk(input)
}
