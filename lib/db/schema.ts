import { boolean, integer, jsonb, pgEnum, pgTable, real, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['ADMIN', 'ANALYST', 'REVIEWER', 'USER'])
export const screeningStatusEnum = pgEnum('screening_status', ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'MANUAL_REVIEW'])
export const riskLevelEnum = pgEnum('risk_level', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: varchar('full_name', { length: 160 }).notNull(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').default('USER').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  storedFilename: varchar('stored_filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  documentType: varchar('document_type', { length: 80 }).notNull(),
  fileHash: varchar('file_hash', { length: 128 }).notNull(),
  storageKey: text('storage_key').notNull(),
  status: varchar('status', { length: 40 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const screenings = pgTable('screenings', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id').notNull(),
  requestedBy: uuid('requested_by').notNull(),
  riskScore: real('risk_score'),
  riskLevel: riskLevelEnum('risk_level'),
  status: screeningStatusEnum('status').default('QUEUED').notNull(),
  modelVersion: varchar('model_version', { length: 80 }).default('trustx-risk-model-v1.0').notNull(),
  processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
  processingCompletedAt: timestamp('processing_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const ocrResults = pgTable('ocr_results', { id: uuid('id').defaultRandom().primaryKey(), screeningId: uuid('screening_id').notNull(), ocrEngine: varchar('ocr_engine', { length: 80 }).notNull(), confidence: real('confidence').notNull(), extractedFields: jsonb('extracted_fields').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull() })
export const forensicResults = pgTable('forensic_results', { id: uuid('id').defaultRandom().primaryKey(), screeningId: uuid('screening_id').notNull(), tamperingProbability: real('tampering_probability').notNull(), compressionAnomaly: real('compression_anomaly').notNull(), copyMoveProbability: real('copy_move_probability').notNull(), noiseInconsistency: real('noise_inconsistency').notNull(), metadataAnomaly: real('metadata_anomaly').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull() })
export const validationResults = pgTable('validation_results', { id: uuid('id').defaultRandom().primaryKey(), screeningId: uuid('screening_id').notNull(), formatScore: real('format_score').notNull(), structureScore: real('structure_score').notNull(), fieldConsistencyScore: real('field_consistency_score').notNull(), qrConsistencyScore: real('qr_consistency_score').notNull(), dateConsistencyScore: real('date_consistency_score').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull() })
export const riskFactors = pgTable('risk_factors', { id: uuid('id').defaultRandom().primaryKey(), screeningId: uuid('screening_id').notNull(), factorType: varchar('factor_type', { length: 80 }).notNull(), severity: varchar('severity', { length: 30 }).notNull(), score: real('score').notNull(), description: text('description').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull() })
export const reviews = pgTable('reviews', { id: uuid('id').defaultRandom().primaryKey(), screeningId: uuid('screening_id').notNull(), reviewerId: uuid('reviewer_id').notNull(), decision: varchar('decision', { length: 40 }).notNull(), priority: varchar('priority', { length: 30 }).notNull(), notes: text('notes'), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull() })
export const auditLogs = pgTable('audit_logs', { id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id'), action: varchar('action', { length: 80 }).notNull(), resourceType: varchar('resource_type', { length: 80 }).notNull(), resourceId: varchar('resource_id', { length: 120 }), ipHash: varchar('ip_hash', { length: 128 }), metadata: jsonb('metadata'), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull() })
export const systemSettings = pgTable('system_settings', { id: uuid('id').defaultRandom().primaryKey(), settingKey: varchar('setting_key', { length: 80 }).notNull().unique(), settingValue: text('setting_value').notNull(), updatedBy: uuid('updated_by'), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull() })

export const refreshTokens = pgTable('refresh_tokens', { id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull(), tokenHash: text('token_hash').notNull(), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), revokedAt: timestamp('revoked_at', { withTimezone: true }), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull() })

export type Screening = typeof screenings.$inferSelect
export type User = typeof users.$inferSelect
