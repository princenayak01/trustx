'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import AuthLayout from '@/components/auth-layout'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    if (password !== confirm) { setError('Passwords do not match.'); setBusy(false); return }
    try {
      const response = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name, email, password }) })
      const data = await response.json(); if (!response.ok) throw new Error(data?.error?.message || 'Unable to create account.')
      router.replace('/'); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create account.') }
    finally { setBusy(false) }
  }
  return <AuthLayout title="Create your account" subtitle="Set up a secure TrustX analyst workspace."><form onSubmit={submit} className="space-y-4"><Field label="Full name" type="text" value={name} onChange={setName} placeholder="Your name"/><Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com"/><Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Minimum 8 characters"/><Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat password"/>{error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">{error}</div>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy && <Loader2 size={17} className="animate-spin"/>}{busy ? 'Creating account…' : 'Create account'}</button><p className="text-center text-sm text-slate-500">Already registered? <Link className="text-cyan-400 hover:text-cyan-300" href="/login">Sign in</Link></p></form></AuthLayout>
}
function Field({label,type,value,onChange,placeholder}:{label:string;type:string;value:string;onChange:(v:string)=>void;placeholder:string}) { return <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span><input required minLength={type==='password'?8:undefined} type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60"/></label> }
