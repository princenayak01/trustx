import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body.email || '').trim()
    const password = String(body.password || '')
    if (!email || !password) return NextResponse.json({ success: false, error: { message: 'Email and password are required.' } }, { status: 400 })
    const user = await loginUser(email, password)
    return NextResponse.json({ success: true, data: { user }, message: 'Login successful.' })
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error instanceof Error ? error.message : 'Unable to sign in.' } }, { status: 401 })
  }
}
