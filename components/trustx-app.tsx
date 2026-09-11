'use client'

import useSWR from 'swr'
import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Database,
  Download,
  FileCheck2,
  FileSearch,
  Files,
  Fingerprint,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react'

const screenings = [
  { id: 'TX-10482', file: 'synthetic_passport_demo.pdf', type: 'Passport', score: 78, level: 'HIGH', status: 'Manual review', time: '2 min ago' },
  { id: 'TX-10481', file: 'demo_drivers_license.png', type: 'Driver license', score: 18, level: 'LOW', status: 'Completed', time: '18 min ago' },
  { id: 'TX-10480', file: 'test_identity_card.jpg', type: 'Identity card', score: 46, level: 'MEDIUM', status: 'Completed', time: '42 min ago' },
  { id: 'TX-10479', file: 'synthetic_id_front.png', type: 'Identity card', score: 84, level: 'CRITICAL', status: 'Escalated', time: '1 hr ago' },
]

const nav = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Screen document', icon: UploadCloud },
  { label: 'Screening history', icon: Files },
  { label: 'Reviews', icon: ClipboardCheck, badge: '7' },
  { label: 'Analytics', icon: BarChart3 },
]

const adminNav = [
  { label: 'Reports', icon: FileCheck2 },
  { label: 'Audit logs', icon: Fingerprint },
  { label: 'Settings', icon: Settings2 },
]

function RiskBadge({ level }: { level: string }) {
  return <span className={`risk-badge risk-${level.toLowerCase()}`}><span className="risk-dot" />{level}</span>
}

function Logo() {
  return <div className="brand"><div className="brand-mark"><ShieldCheck size={19} strokeWidth={2.5} /></div><div><strong>TRUST<span>X</span></strong><small>IDENTITY INTELLIGENCE</small></div></div>
}

function MetricCard({ label, value, change, icon: Icon, tone = 'blue' }: { label: string; value: string; change: string; icon: typeof Gauge; tone?: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={17} /></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-change"><ArrowUpRight size={13} /> {change}</div></div>
}

const fetcher = (url: string) => fetch(url).then((response) => response.json())

type DashboardStats = { total: number; low: number; medium: number; high: number; manual_reviews: number; average_score: number }

function Overview({ setView }: { setView: (view: string) => void }) {
  const { data: statsResponse } = useSWR<{ success: boolean; data?: DashboardStats }>('/api/dashboard/stats', fetcher, { refreshInterval: 30000 })
  const stats = statsResponse?.data
  return <>
    <div className="page-heading"><div><div className="eyebrow">COMMAND CENTER / OVERVIEW</div><h1>Good morning, Alex</h1><p>Here&apos;s what&apos;s happening across your identity screening operations.</p></div><button className="button button-primary" onClick={() => setView('Screen document')}><UploadCloud size={16} /> Start screening</button></div>
    <div className="metric-grid">
<MetricCard label="Documents screened" value={stats ? stats.total.toLocaleString() : '—'} change="Live from PostgreSQL" icon={Files} />
 <MetricCard label="Average risk score" value={stats ? stats.average_score.toFixed(1) : '—'} change="Live from PostgreSQL" icon={Gauge} tone="cyan" />
 <MetricCard label="Manual reviews" value={stats ? stats.manual_reviews.toString() : '—'} change={stats ? `${stats.high} high-risk cases` : 'Loading database'} icon={ClipboardCheck} tone="amber" />
      <MetricCard label="Detection accuracy" value="98.4%" change="0.6% vs last month" icon={ShieldCheck} tone="green" />
    </div>
    <div className="content-grid">
      <section className="panel trend-panel"><div className="panel-header"><div><h2>Screening activity</h2><p>Document volume and risk distribution</p></div><button className="select-button">Last 30 days <ChevronRight size={14} /></button></div><div className="chart-wrap"><div className="chart-y"><span>120</span><span>90</span><span>60</span><span>30</span><span>0</span></div><div className="chart"><div className="chart-grid-lines"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 600 190" preserveAspectRatio="none" role="img" aria-label="Screening activity trend"><path d="M0,142 C34,136 44,148 72,126 S104,96 132,117 S172,104 202,108 S235,70 264,86 S300,99 328,67 S358,92 385,77 S417,91 444,63 S478,78 508,49 S542,63 572,42 S594,38 600,31" fill="none" stroke="#38bdf8" strokeWidth="2.5" /><path d="M0,142 C34,136 44,148 72,126 S104,96 132,117 S172,104 202,108 S235,70 264,86 S300,99 328,67 S358,92 385,77 S417,91 444,63 S478,78 508,49 S542,63 572,42 S594,38 600,31 L600,190 L0,190 Z" fill="url(#chartFill)" opacity=".35" /><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#38bdf8" /><stop offset="1" stopColor="#38bdf8" stopOpacity="0" /></linearGradient></defs></svg><div className="chart-x"><span>Aug 12</span><span>Aug 18</span><span>Aug 24</span><span>Aug 30</span><span>Sep 05</span><span>Sep 11</span></div></div></div><div className="chart-legend"><span><i className="legend-line blue" /> Documents screened <b>1,284</b></span><span><i className="legend-line amber" /> Flagged for review <b>86</b></span></div></section>
      <section className="panel security-panel"><div className="panel-header"><div><h2>Security center</h2><p>Live platform health</p></div><span className="live-status"><i /> Operational</span></div><div className="service-list"><Service icon={Sparkles} label="AI detection engine" value="Online" tone="green" /><Service icon={FileSearch} label="OCR service" value="Online" tone="green" /><Service icon={Database} label="Data layer" value="Connected" tone="green" /><Service icon={Activity} label="Processing queue" value="Healthy" tone="cyan" /></div><div className="model-card"><div><span>ACTIVE MODEL</span><strong>trustx-risk-model-v1.0</strong></div><span className="model-pill">99.1% confidence</span></div></section>
    </div>
    <div className="section-heading"><div><div className="eyebrow">LIVE OPERATIONS</div><h2>Recent screenings</h2></div><button className="text-button" onClick={() => setView('Screening history')}>View all screenings <ArrowUpRight size={14} /></button></div>
    <ScreeningTable compact setView={setView} />
  </>
}

function Service({ icon: Icon, label, value, tone }: { icon: typeof Sparkles; label: string; value: string; tone: string }) { return <div className="service-row"><div className="service-icon"><Icon size={16} /></div><span>{label}</span><strong className={tone}><i />{value}</strong></div> }

function ScreeningTable({ compact = false, setView }: { compact?: boolean; setView: (view: string) => void }) {
  return <div className="panel table-panel"><div className="table-toolbar"><div className="search-field"><Search size={15} /><input aria-label="Search screenings" placeholder="Search by ID or filename" /></div><div className="toolbar-actions"><button className="filter-button"><SlidersHorizontal size={14} /> Filters</button><button className="icon-button" aria-label="More options"><MoreHorizontal size={17} /></button></div></div><div className="table-scroll"><table><thead><tr><th>SCREENING</th><th>DOCUMENT</th><th>RISK SCORE</th><th>LEVEL</th><th>STATUS</th><th>CREATED</th><th /></tr></thead><tbody>{screenings.slice(0, compact ? 4 : 4).map((item) => <tr key={item.id}><td><button className="id-link" onClick={() => setView('Screening detail')}>{item.id}</button></td><td><div className="file-cell"><div className="file-icon"><FileCheck2 size={15} /></div><span>{item.file}</span><small>{item.type}</small></div></td><td><strong className={item.score > 60 ? 'score-high' : item.score > 25 ? 'score-medium' : 'score-low'}>{item.score}<small>/100</small></strong></td><td><RiskBadge level={item.level} /></td><td><span className="status-text"><i className={item.status === 'Completed' ? 'status-green' : 'status-amber'} />{item.status}</span></td><td className="muted-cell">{item.time}</td><td><button className="row-action" onClick={() => setView('Screening detail')}>View <ChevronRight size={13} /></button></td></tr>)}</tbody></table></div></div>
}

function ScreeningWorkspace({ setView }: { setView: (view: string) => void }) {
  const [uploaded, setUploaded] = useState(false)
  const [processing, setProcessing] = useState(false)
  return <><div className="page-heading"><div><div className="eyebrow">SECURE WORKSPACE / NEW ANALYSIS</div><h1>Screen document</h1><p>Upload a synthetic or authorized identity document for AI-assisted risk assessment.</p></div><div className="secure-label"><LockKeyhole size={14} /> Encrypted workspace</div></div><div className="pipeline"><div className="pipeline-step active"><span>01</span><strong>Upload</strong></div><div className="pipeline-line active" /><div className={`pipeline-step ${processing ? 'active' : ''}`}><span>02</span><strong>AI analysis</strong></div><div className="pipeline-line" /><div className="pipeline-step"><span>03</span><strong>Risk report</strong></div><div className="pipeline-line" /><div className="pipeline-step"><span>04</span><strong>Review</strong></div></div><div className="screen-layout"><section className="panel upload-panel"><div className="panel-header"><div><h2>Upload document</h2><p>JPG, PNG or PDF · Maximum 10 MB</p></div><Shield size={18} /></div><button className={`dropzone ${uploaded ? 'uploaded' : ''}`} onClick={() => setUploaded(true)}><div className="upload-orb">{uploaded ? <Check size={24} /> : <UploadCloud size={24} />}</div><strong>{uploaded ? 'synthetic_passport_demo.pdf' : 'Drop your document here'}</strong><span>{uploaded ? 'Ready for secure analysis · 2.4 MB' : 'or click to browse from your device'}</span>{uploaded && <div className="file-progress"><i /></div>}</button><div className="upload-note"><LockKeyhole size={13} /> Files are encrypted in transit and automatically removed after 24 hours.</div>{uploaded && <button className="button button-primary full-button" onClick={() => { setProcessing(true); setTimeout(() => setView('Screening detail'), 900) }}>{processing ? <><Activity size={16} className="spin" /> Running analysis...</> : <><Zap size={16} /> Start AI analysis</>}</button>}</section><section className="panel guidance-panel"><div className="panel-header"><div><h2>Analysis coverage</h2><p>What TrustX evaluates</p></div></div><div className="coverage-list"><Coverage icon={FileSearch} title="OCR & field extraction" text="Names, dates, identifiers and address fields" /><Coverage icon={Fingerprint} title="Forensic inspection" text="Compression, resampling and altered regions" /><Coverage icon={ClipboardCheck} title="Consistency checks" text="Format, layout and QR data comparison" /><Coverage icon={Gauge} title="Explainable risk score" text="Weighted signals with recommended action" /></div><div className="disclaimer-box"><AlertTriangle size={15} /><span>Results are probabilistic and should be combined with authorized verification procedures and human review.</span></div></section></div></>
}
function Coverage({ icon: Icon, title, text }: { icon: typeof FileSearch; title: string; text: string }) { return <div className="coverage-item"><div className="coverage-icon"><Icon size={16} /></div><div><strong>{title}</strong><span>{text}</span></div><Check size={14} className="coverage-check" /></div> }

function Detail({ setView }: { setView: (view: string) => void }) { return <><div className="back-link" onClick={() => setView('Overview')}><ChevronRight size={14} className="back-arrow" /> Back to screenings</div><div className="page-heading detail-heading"><div><div className="eyebrow">SCREENING / TX-10482</div><h1>Analysis report</h1><p>synthetic_passport_demo.pdf · Completed 2 minutes ago</p></div><div className="detail-actions"><button className="button button-secondary"><Download size={15} /> Download PDF</button><button className="button button-primary" onClick={() => setView('Reviews')}><ClipboardCheck size={15} /> Send to review</button></div></div><div className="report-hero panel"><div className="report-score"><div className="score-ring"><strong>78</strong><span>/100</span></div><div><span className="eyebrow">OVERALL RISK SCORE</span><h2>High risk</h2><p>Manual verification required</p></div></div><div className="report-meta"><div><span>SCREENING ID</span><strong>TX-10482</strong></div><div><span>MODEL VERSION</span><strong>trustx-risk-model-v1.0</strong></div><div><span>PROCESSING TIME</span><strong>18.4 seconds</strong></div></div></div><div className="detail-grid"><section className="panel evidence-panel"><div className="panel-header"><div><h2>AI findings</h2><p>Evidence behind the risk assessment</p></div><span className="confidence"><Sparkles size={13} /> 91% confidence</span></div><div className="finding"><div className="finding-severity critical"><AlertTriangle size={16} /></div><div><strong>Image compression inconsistency</strong><p>Uneven JPEG quantization detected around the portrait and document number regions.</p></div><span>0.87</span></div><div className="finding"><div className="finding-severity high"><AlertTriangle size={16} /></div><div><strong>Possible altered text region</strong><p>Noise profile differs from surrounding print layer in the lower identifier field.</p></div><span>0.76</span></div><div className="finding"><div className="finding-severity medium"><AlertTriangle size={16} /></div><div><strong>OCR confidence mismatch</strong><p>Document number confidence is below the configured review threshold.</p></div><span>0.62</span></div><div className="recommendation"><div className="recommendation-icon"><ClipboardCheck size={16} /></div><div><span>RECOMMENDED ACTION</span><strong>Route to manual verification</strong><p>Do not make an irreversible decision based solely on automated results.</p></div></div></section><section className="panel doc-panel"><div className="panel-header"><div><h2>Document preview</h2><p>Suspicious regions highlighted</p></div><button className="icon-button"><MoreHorizontal size={17} /></button></div><div className="document-preview"><div className="document-top"><div className="doc-emblem"><Shield size={25} /></div><div><span>REPUBLIC OF SYNTHETICA</span><strong>PASSPORT</strong></div><span className="doc-code">P&lt;SYNDEMO&lt;&lt;USER</span></div><div className="doc-body"><div className="portrait"><UserRound size={42} /></div><div className="doc-lines"><i /><i /><i /><i /><i /></div></div><div className="anomaly-box"><span>Potential anomaly</span></div><div className="doc-mrz">P&lt;SYNDEMO&lt;&lt;USER&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />X00000001SYN0001012M3001017&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;8</div></div><div className="doc-caption"><i /> Region flagged by forensic model <span>2 areas</span></div></section></div></> }

function OtherView({ view }: { view: string }) { const title = view === 'Reviews' ? 'Review queue' : view === 'Analytics' ? 'Analytics' : view === 'Admin' ? 'Administration' : view; return <><div className="page-heading"><div><div className="eyebrow">TRUSTX / {view.toUpperCase()}</div><h1>{title}</h1><p>{view === 'Reviews' ? 'Resolve flagged screenings with accountable human review.' : 'Operational intelligence from your identity screening program.'}</p></div><button className="button button-secondary"><Download size={15} /> Export report</button></div>{view === 'Reviews' ? <div className="review-grid"><div className="review-summary panel"><div className="eyebrow">NEEDS ATTENTION</div><strong>7</strong><span>screenings awaiting review</span><div className="mini-bars"><i /><i /><i /><i /><i /><i /><i /></div></div>{['TX-10482','TX-10479','TX-10473'].map((id, i) => <div className="review-card panel" key={id}><div className="review-card-top"><RiskBadge level={i === 1 ? 'CRITICAL' : 'HIGH'} /><span>{i + 1}h ago</span></div><h3>{id}</h3><p>{i === 1 ? 'synthetic_id_front.png' : 'synthetic_passport_demo.pdf'}</p><div className="review-factors"><span><AlertTriangle size={12} /> {i + 2} risk factors</span><span><UserRound size={12} /> Unassigned</span></div><button className="button button-secondary full-button">Open case <ChevronRight size={14} /></button></div>)}</div> : <><div className="metric-grid"><MetricCard label="Total screenings" value="1,284" change="12.8% vs last month" icon={Files} /><MetricCard label="High risk rate" value="6.7%" change="1.2% improvement" icon={AlertTriangle} tone="amber" /><MetricCard label="Review completion" value="94.2%" change="3.8% vs last month" icon={ClipboardCheck} tone="green" /></div><div className="panel empty-analytics"><BarChart3 size={32} /><h2>{view === 'Analytics' ? 'Risk intelligence overview' : 'Control center'}</h2><p>Detailed {view.toLowerCase()} modules connect to live PostgreSQL queries, audit trails, and role-based controls in the production service.</p><div className="feature-row"><span><Database size={14} /> PostgreSQL ready</span><span><LockKeyhole size={14} /> RBAC enforced</span><span><Activity size={14} /> Audit logged</span></div></div></>}</> }

export default function TrustXApp() {
  const [view, setView] = useState('Overview')
  const [mobileNav, setMobileNav] = useState(false)
  const showDetail = view === 'Screening detail'
  return <div className="trustx-shell"><aside className={`sidebar ${mobileNav ? 'open' : ''}`}><div className="sidebar-top"><Logo /><button className="close-nav" onClick={() => setMobileNav(false)}><X size={18} /></button></div><div className="workspace-switch"><div className="workspace-avatar">A</div><div><span>Workspace</span><strong>Acme Financial</strong></div><ChevronRight size={14} /></div><nav><span className="nav-label">WORKSPACE</span>{nav.map(({ label, icon: Icon, badge }) => <button key={label} className={view === label ? 'active' : ''} onClick={() => { setView(label); setMobileNav(false) }}><Icon size={17} /><span>{label}</span>{badge && <b>{badge}</b>}</button>)}<span className="nav-label admin-label">ADMINISTRATION</span>{adminNav.map(({ label, icon: Icon }) => <button key={label} className={view === label ? 'active' : ''} onClick={() => { setView(label); setMobileNav(false) }}><Icon size={17} /><span>{label}</span></button>)}</nav><div className="sidebar-bottom"><div className="help-card"><CircleHelp size={17} /><div><strong>Need help?</strong><span>Read the TrustX guide</span></div><ArrowUpRight size={14} /></div><div className="user-row"><div className="user-avatar">AM</div><div><strong>Alex Morgan</strong><span>Administrator</span></div><MoreHorizontal size={17} /></div></div></aside><main className="main-content"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={19} /></button><div className="topbar-search"><Search size={16} /><input aria-label="Global search" placeholder="Search screenings, documents..." /><kbd>⌘ K</kbd></div><div className="topbar-actions"><div className="operational"><i /> All systems operational</div><button className="icon-button notification" aria-label="Notifications"><Bell size={17} /><i /></button><div className="topbar-divider" /><div className="top-user"><div className="user-avatar small">AM</div><span>Alex Morgan</span><ChevronRight size={14} /></div></div></header><div className="content">{showDetail ? <Detail setView={setView} /> : view === 'Overview' ? <Overview setView={setView} /> : view === 'Screen document' ? <ScreeningWorkspace setView={setView} /> : view === 'Screening history' ? <><div className="page-heading"><div><div className="eyebrow">WORKSPACE / SCREENING HISTORY</div><h1>Screening history</h1><p>Search and review every document processed by TrustX.</p></div><button className="button button-primary" onClick={() => setView('Screen document')}><UploadCloud size={16} /> New screening</button></div><ScreeningTable setView={setView} /></> : <OtherView view={view} />}</div><footer className="app-footer"><span>TrustX v1.0.0</span><span>AI-assisted fraud-risk assessment. Results are probabilistic and require human review.</span><span><LockKeyhole size={12} /> Secure workspace</span></footer></main></div>
}

export { RiskBadge }
