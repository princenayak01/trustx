import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export const DEMO_USER_EMAIL = 'demo@trustx.local'

/**
 * Creates or reuses the TrustX demo user using PostgreSQL's unique-email
 * constraint. This avoids placeholder UUIDs and avoids a preliminary SELECT
 * that can fail on a partially migrated production database.
 */
export async function ensureDemoUser() {
  const [user] = await db
    .insert(users)
    .values({
      fullName: 'TrustX Demo User',
      email: DEMO_USER_EMAIL,
      passwordHash: 'demo-account-not-for-authentication',
      role: 'ADMIN',
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { updatedAt: new Date(), isActive: true },
    })
    .returning({ id: users.id })

  if (!user?.id) throw new Error('Unable to initialize the TrustX demo user.')
  return user.id
}
