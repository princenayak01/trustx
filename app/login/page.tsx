'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, LockKeyhole, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message || 'Unable to sign in.')
      router.replace('/'); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.') }
    finally { setBusy(false) }
  }

  return <AuthLayout title="Welcome back" subtitle="Sign in to your secure TrustX workspace."><form onSubmit={submit} className="space-y-4"><Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com"/><Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••"/>{error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">{error}</div>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy && <Loader2 size={17} className="animate-spin"/>}{busy ? 'Signing in…' : 'Sign in'}</button><p className="text-center text-sm text-slate-500">Don't have an account? <Link className="text-cyan-400 hover:text-cyan-300" href="/register">Create one</Link></p></form></AuthLayout>
}

function Field({label,type,value,onChange,placeholder}:{label:string;type:string;value:string;onChange:(v:string)=>void;placeholder:string}) { return <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span><div className="relative"><input required type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60"/>{type==='password' && <LockKeyhole size={15} className="pointer-events-none absolute right-3 top-3.5 text-slate-600"/>}</div></label> }

export function AuthLayout({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}) { return <main className="flex min-h-screen items-center justify-center bg-[#07101d] px-5 py-10 text-slate-100"><div className="w-full max-w-md"><div className="mb-7 flex items-center gap-3"><div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-400"><ShieldCheck size={24}/></div><div><b className="tracking-[.22em]">TRUST<span className="text-cyan-400">X</span></b><small className="block text-[9px] tracking-[.2em] text-slate-500">IDENTITY INTELLIGENCE</small></div></div><section className="rounded-2xl border border-slate-800 bg-[#0b1726] p-7 shadow-2xl shadow-cyan-950/20"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-1.5 mb-6 text-sm text-slate-500">{subtitle}</p>{children}</section><p className="mt-5 text-center text-[10px] leading-5 text-slate-600">TrustX provides AI-assisted fraud-risk assessment. Use synthetic or authorized documents only.</p></div></main> }
