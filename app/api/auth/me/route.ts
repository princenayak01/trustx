import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ success: false, error: { message: 'Not authenticated.' } }, { status: 401 })
    return NextResponse.json({ success: true, data: { user } })
  } catch {
    return NextResponse.json({ success: false, error: { message: 'Authentication service unavailable.' } }, { status: 503 })
  }
}
