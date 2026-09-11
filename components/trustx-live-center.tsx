'use client'

import './trustx-live-center.css'
import { useState } from 'react'
import { BarChart3, Check, ClipboardCheck, Download, FileText, RefreshCw, ShieldAlert, X } from 'lucide-react'

type Analytics = { total: number; low: number; medium: number; high: number; critical: number; manual_reviews: number; average_score: number }
type Review = { id: string; screeningId: string; reviewerId: string; decision: string; priority: string; notes?: string | null; createdAt: string }
type ScreeningRow = { screening: { id: string; riskLevel?: string | null; status?: string }; document: { originalFilename?: string } }

export default function TrustXLiveCenter() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'reviews' | 'analytics' | 'report'>('reviews')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [screeningId, setScreeningId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function loadLatestScreening() {
    try {
      const response = await fetch('/api/screenings', { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.error?.message || 'Unable to load screenings')
      const latest = (json.data || [])[0] as ScreeningRow | undefined
      setScreeningId(latest?.screening?.id || '')
      return latest?.screening?.id || ''
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load screenings')
      return ''
    }
  }

  async function loadReviews() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/reviews', { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.error?.message || 'Unable to load reviews')
      setReviews(json.data || [])
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load reviews') }
    finally { setBusy(false) }
  }

  async function loadAnalytics() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/analytics', { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.error?.message || 'Unable to load analytics')
      setAnalytics(json.data?.summary || json.data || null)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load analytics') }
    finally { setBusy(false) }
  }

  async function createReview(decision: 'APPROVE' | 'REJECT' | 'ESCALATE' | 'REQUEST_REVERIFICATION') {
    setBusy(true); setMessage('')
    try {
      const currentId = screeningId || await loadLatestScreening()
      if (!currentId) throw new Error('No screening is available yet. Upload a document first.')
      const response = await fetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screeningId: currentId, decision, notes: 'Decision recorded from TrustX review center.' }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.error?.message || 'Unable to record review')
      setMessage(`Review decision ${decision.replaceAll('_', ' ').toLowerCase()} recorded.`)
      await loadReviews()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to record review') }
    finally { setBusy(false) }
  }

  function exportReport() {
    if (!screeningId) { setMessage('No screening is available yet. Upload a document first.'); return }
    window.open(`/api/reports/${screeningId}`, '_blank', 'noopener,noreferrer')
  }

  function printReport() {
    if (!screeningId) { setMessage('No screening is available yet. Upload a document first.'); return }
    window.open(`/api/reports/${screeningId}`, '_blank', 'noopener,noreferrer')
    setMessage('Report data opened. Use your browser Print → Save as PDF.')
  }

  async function openCenter() {
    setOpen(true)
    await Promise.all([loadLatestScreening(), loadReviews()])
  }

  return <>
    <button className="live-center-trigger" onClick={openCenter} aria-label="Open live TrustX center"><ShieldAlert size={15} /> Live center</button>
    {open && <div className="live-center-backdrop" onClick={() => setOpen(false)}>
      <section className="live-center" onClick={(event) => event.stopPropagation()}>
        <header className="live-center-header"><div><span>TRUSTX / LIVE OPERATIONS</span><h2>Reviews, analytics & reports</h2></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button></header>
        <nav className="live-center-tabs">
          <button className={tab === 'reviews' ? 'active' : ''} onClick={() => { setTab('reviews'); loadReviews() }}><ClipboardCheck size={15} /> Reviews</button>
          <button className={tab === 'analytics' ? 'active' : ''} onClick={() => { setTab('analytics'); loadAnalytics() }}><BarChart3 size={15} /> Analytics</button>
          <button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}><FileText size={15} /> Report</button>
        </nav>
        {message && <div className="live-center-message">{message}</div>}
        {busy && <div className="live-center-loading"><RefreshCw size={14} className="spin" /> Syncing with PostgreSQL…</div>}
        {tab === 'reviews' && <div className="live-center-content"><div className="live-action-grid"><button onClick={() => createReview('APPROVE')}><Check size={15} /> Approve</button><button onClick={() => createReview('REJECT')}><X size={15} /> Reject</button><button onClick={() => createReview('ESCALATE')}><ShieldAlert size={15} /> Escalate</button><button onClick={() => createReview('REQUEST_REVERIFICATION')}><RefreshCw size={15} /> Re-verify</button></div><div className="live-list">{reviews.length === 0 ? <p className="live-empty">No review records returned yet.</p> : reviews.slice(0, 8).map((review) => <div className="live-row" key={review.id}><div><strong>{review.decision.replaceAll('_', ' ')}</strong><span>{review.priority} priority · {new Date(review.createdAt).toLocaleString()}</span></div><small>{review.screeningId.slice(0, 8)}…</small></div>)}</div></div>}
        {tab === 'analytics' && <div className="live-center-content">{!analytics ? <button className="button button-primary" onClick={loadAnalytics}>Load live analytics</button> : <div className="live-stat-grid">{[['Screened', analytics.total], ['Low risk', analytics.low], ['Medium', analytics.medium], ['High', analytics.high], ['Critical', analytics.critical], ['Manual review', analytics.manual_reviews], ['Avg score', analytics.average_score.toFixed(1)]].map(([label, value]) => <div className="live-stat" key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</div>}</div>}
        {tab === 'report' && <div className="live-center-content report-actions"><div className="report-card"><FileText size={22} /><div><strong>Screening report</strong><span>{screeningId ? `Live report for screening ${screeningId.slice(0, 8)}…` : 'Upload a document to create a screening report.'}</span></div></div><button className="button button-primary" onClick={exportReport}><Download size={15} /> Open report JSON</button><button className="button button-secondary" onClick={printReport}><Download size={15} /> Print / Save as PDF</button></div>}
      </section>
    </div>}
  </>
}
