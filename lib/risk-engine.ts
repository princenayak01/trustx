export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type RiskInput = {
  tamperingProbability: number
  compressionAnomaly: number
  copyMoveProbability: number
  noiseInconsistency: number
  metadataAnomaly: number
  ocrConfidence: number
  formatScore: number
  structureScore: number
  fieldConsistencyScore: number
  qrConsistencyScore: number
  dateConsistencyScore: number
}

export type RiskFactor = {
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  score: number
  description: string
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))

export function riskLevel(score: number): RiskLevel {
  if (score <= 25) return 'LOW'
  if (score <= 60) return 'MEDIUM'
  if (score <= 80) return 'HIGH'
  return 'CRITICAL'
}

export function calculateRisk(input: RiskInput) {
  const forensic = (input.tamperingProbability * 0.45 + input.compressionAnomaly * 0.15 + input.copyMoveProbability * 0.2 + input.noiseInconsistency * 0.1 + input.metadataAnomaly * 0.1) * 100
  const consistency = (100 - input.fieldConsistencyScore) * 0.5 + (100 - input.dateConsistencyScore) * 0.25 + (100 - input.qrConsistencyScore) * 0.25
  const structure = (100 - input.formatScore) * 0.45 + (100 - input.structureScore) * 0.55
  const ocr = 100 - clamp(input.ocrConfidence * 100)
  let score = clamp(forensic * 0.30 + consistency * 0.20 + structure * 0.15 + ocr * 0.15 + (100 - input.qrConsistencyScore) * 0.10 + input.metadataAnomaly * 100 * 0.10)

  // Calibration guard: isolated metadata/compression noise must not turn a
  // document with consistently clean structural, OCR and forensic signals
  // into a false high-risk result. This is a risk estimate, not authenticity proof.
  const cleanEvidence =
    input.tamperingProbability < 0.15 &&
    input.copyMoveProbability < 0.15 &&
    input.noiseInconsistency < 0.15 &&
    input.ocrConfidence >= 0.90 &&
    input.formatScore >= 90 &&
    input.structureScore >= 90 &&
    input.fieldConsistencyScore >= 90 &&
    input.qrConsistencyScore >= 85 &&
    input.dateConsistencyScore >= 90

  if (cleanEvidence) score = Math.min(score, 20)

  const factors: RiskFactor[] = []
  const add = (type: string, value: number, description: string) => {
    const factorScore = Math.round(clamp(value))
    if (factorScore >= 20) factors.push({ type, severity: riskLevel(factorScore), score: factorScore, description })
  }

  add('IMAGE_TAMPERING', input.tamperingProbability * 100, 'Image-forensic signals indicate possible editing or manipulation.')
  add('FIELD_CONSISTENCY', 100 - input.fieldConsistencyScore, 'Extracted identity fields contain consistency anomalies.')
  add('DOCUMENT_STRUCTURE', 100 - input.structureScore, 'Document layout or expected structural patterns are inconsistent.')
  add('OCR_CONFIDENCE', 100 - input.ocrConfidence * 100, 'OCR confidence is below the expected quality threshold.')
  add('QR_CONSISTENCY', 100 - input.qrConsistencyScore, 'QR or barcode consistency could not be fully established.')
  add('METADATA_ANOMALY', input.metadataAnomaly * 100, 'File metadata contains signals that warrant additional review.')

  return {
    score: Math.round(score),
    level: riskLevel(score),
    factors: factors.sort((a, b) => b.score - a.score),
    modelVersion: 'trustx-risk-model-v1.2',
  }
}
