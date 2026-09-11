'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('unauthenticated')
        return response.json()
      })
      .then((data) => {
        if (active && data.success) setChecking(false)
        else if (active) router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`)
      })
      .catch(() => {
        if (active) router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`)
      })
    return () => { active = false }
  }, [pathname, router])

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-[#07101d] text-slate-100"><div className="flex flex-col items-center gap-3"><div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400"><ShieldCheck size={28}/></div><Loader2 className="animate-spin text-cyan-400" size={20}/><p className="text-xs tracking-widest text-slate-500">AUTHENTICATING TRUSTX SESSION</p></div></main>
  return <>{children}</>
}
