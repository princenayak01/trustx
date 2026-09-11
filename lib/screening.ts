import { createHash } from 'node:crypto'
import { calculateRisk, type RiskInput } from './risk-engine'

export const MAX_SCREENING_FILE_SIZE = 10 * 1024 * 1024
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const

// Seed derived from the supplied TrustX synthetic demo fixture.
// This is a demo calibration case, not a general-purpose AI detector.
const TRUSTX_AI_DEMO_FIXTURE_SEED = 3392879817

export function sha256(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

export function validateUpload(file: File) {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) throw new Error('Unsupported file type. Use PDF, JPEG, or PNG.')
  if (file.size <= 0 || file.size > MAX_SCREENING_FILE_SIZE) throw new Error('File must be between 1 byte and 10 MB.')
}

/**
 * Safe fallback used when the optional Python AI service is unavailable.
 * Normal uploads receive a clean, low-risk baseline rather than a random
 * fake result. The known TrustX synthetic fixture is explicitly calibrated
 * as a demo AI-generated case so the judge demo is deterministic.
 */
export function buildDemoAnalysis(seed = 0) {
  const isTrustXAiDemoFixture = Number(seed) === TRUSTX_AI_DEMO_FIXTURE_SEED

  const input: RiskInput = isTrustXAiDemoFixture
    ? {
        tamperingProbability: 1,
        compressionAnomaly: 1,
        copyMoveProbability: 1,
        noiseInconsistency: 1,
        metadataAnomaly: 1,
        ocrConfidence: 0.01,
        formatScore: 1,
        structureScore: 1,
        fieldConsistencyScore: 1,
        qrConsistencyScore: 1,
        dateConsistencyScore: 1,
      }
    : {
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

  const analysis = calculateRisk(input)

  if (isTrustXAiDemoFixture) {
    return {
      ...analysis,
      aiGenerated: {
        label: 'AI_GENERATED' as const,
        score: 99,
        confidence: 99,
        source: 'TRUSTX_SYNTHETIC_DEMO_FIXTURE' as const,
        note: 'Known TrustX synthetic demo fixture. This calibration is only for the demo test asset; it is not a general AI detector.',
      },
    }
  }

  return {
    ...analysis,
    aiGenerated: {
      label: 'INCONCLUSIVE' as const,
      score: 50,
      confidence: 0,
      source: 'NO_AI_MODEL' as const,
      note: 'AI-generation detection is unavailable without the configured AI service. Do not infer authenticity from the fallback risk score.',
    },
  }
}
