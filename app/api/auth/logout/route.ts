import { NextResponse } from 'next/server'
import { logoutUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST() {
  try {
    await logoutUser()
    return NextResponse.json({ success: true, message: 'Logged out successfully.' })
  } catch {
    return NextResponse.json({ success: false, error: { message: 'Unable to log out.' } }, { status: 500 })
  }
}
