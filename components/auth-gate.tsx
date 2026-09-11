'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Loader2, ShieldCheck } from 'lucide-react'

type User = { name: string; email: string; role: string }

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const pathname = usePathname()
  const [checking, setChecking] = useState(true); const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/auth/me', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('unauthenticated')
      return response.json()
    }).then((data) => {
      if (!active) return
      if (data.success) { setUser(data.data.user); setChecking(false) }
      else router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`)
    }).catch(() => { if (active) router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`) })
    return () => { active = false }
  }, [pathname, router])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login'); router.refresh()
  }

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-[#07101d] text-slate-100"><div className="flex flex-col items-center gap-3"><div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400"><ShieldCheck size={28}/></div><Loader2 className="animate-spin text-cyan-400" size={20}/><p className="text-xs tracking-widest text-slate-500">AUTHENTICATING TRUSTX SESSION</p></div></main>
  return <>{children}<div className="fixed right-4 top-4 z-[60] flex items-center gap-2 rounded-lg border border-slate-700 bg-[#091321]/95 px-2 py-1.5 shadow-xl backdrop-blur"><div className="hidden text-right sm:block"><div className="text-[11px] font-semibold text-slate-200">{user?.name}</div><div className="text-[9px] text-slate-500">{user?.role}</div></div><button onClick={logout} title="Sign out" className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><LogOut size={15}/></button></div></>
}
