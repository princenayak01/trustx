import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim()
    const password = String(body.password || '')
    if (name.length < 2 || name.length > 160) return NextResponse.json({ success: false, error: { message: 'Enter a valid full name.' } }, { status: 400 })
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ success: false, error: { message: 'Enter a valid email address.' } }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ success: false, error: { message: 'Password must be at least 8 characters.' } }, { status: 400 })
    const user = await registerUser(name, email, password)
    return NextResponse.json({ success: true, data: { user }, message: 'Account created successfully.' }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error instanceof Error ? error.message : 'Unable to create account.' } }, { status: 400 })
  }
}
