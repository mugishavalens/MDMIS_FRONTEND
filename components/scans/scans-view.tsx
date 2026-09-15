'use client'

import { useEffect, useState } from 'react'
import {
  Plane,
  Radar as RadarIcon,
  Zap,
  Satellite,
  Compass,
  Atom,
  FlaskConical,
  Cpu,
  CheckCircle2,
  Clock,
  Eye,
  AlertTriangle,
  X,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatusPill } from '@/components/shell/status-pill'
import { MINERAL_META, fmtDateTime } from '@/lib/mdmis-data'
import {
  fetchScanSessions, createScanSession, createMineralZone, primaryZone, methodLabel,
  SENSOR_TYPE_OPTIONS, SENSOR_METHOD_LABEL, MINERAL_OPTIONS, type ScanSession,
} from '@/lib/api/scans'
import { fetchSites, type Site } from '@/lib/api/sites'
import { useAuth } from '@/lib/auth-context'
import { can } from '@/lib/rbac'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const FALLBACK_MINERAL_COLOR = '#9b6dff'

const SENSOR_ICON: Record<string, LucideIcon> = {
  hyperspectral: Plane,
  gpr: RadarIcon,
  em: Zap,
  magnetometer: Compass,
  gamma: Atom,
  satellite: Satellite,
  lab: FlaskConical,
}

function sensorIcon(sensorTypes: string[]): LucideIcon {
  return SENSOR_ICON[sensorTypes[0]] ?? Cpu
}

function mineralLabel(mineral: string): string {
  return mineral ? mineral.charAt(0).toUpperCase() + mineral.slice(1) : 'Unclassified'
}

function mineralColor(mineral: string): string {
  return MINERAL_META[mineralLabel(mineral) as keyof typeof MINERAL_META]?.color ?? FALLBACK_MINERAL_COLOR
}

function statusMeta(s: string) {
  switch (s) {
    case 'complete':
      return { tone: 'success' as const, icon: CheckCircle2, label: 'Complete' }
    case 'classifying':
      return { tone: 'info' as const, icon: Clock, label: 'Classifying' }
    case 'ready':
      return { tone: 'info' as const, icon: Clock, label: 'Ready' }
    case 'preprocessing':
      return { tone: 'info' as const, icon: Clock, label: 'Preprocessing' }
    case 'failed':
      return { tone: 'danger' as const, icon: AlertTriangle, label: 'Failed' }
    default:
      return { tone: 'warning' as const, icon: Eye, label: 'Uploaded' }
  }
}

export function ScansView() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ScanSession[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [showNewScan, setShowNewScan] = useState(false)

  async function loadScans() {
    try {
      const [s, sites] = await Promise.all([fetchScanSessions(), fetchSites()])
      setSessions(s)
      setSites(sites)
    } catch (err) {
      console.error('[MDMIS] Failed to load scans:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadScans() }, [])

  const siteName = (siteId: string) => sites.find((s) => s.id === siteId)?.name ?? siteId
  const openSession = openId ? sessions.find((s) => s.id === openId) ?? null : null
  const canCreate = user ? can(user.role, 'scans.classify') : false

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowNewScan(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-3.5" /> New Scan
          </button>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-xs text-muted-foreground">Loading scans…</p>
      ) : sessions.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">No scan sessions recorded yet.</p>
      ) : (
      <div className="space-y-2">
      {sessions.map((s) => {
        const zone = primaryZone(s)
        const MethodIcon = sensorIcon(s.sensorTypes)
        const st = statusMeta(s.status)
        const classification = zone ? mineralLabel(zone.mineral) : 'Unclassified'
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => setOpenId(s.id)}
            className="flex w-full items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 text-left transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-md"
              style={{ background: `color-mix(in oklch, ${mineralColor(zone?.mineral ?? '')} 15%, transparent)` }}
            >
              <MethodIcon className="size-5" style={{ color: mineralColor(zone?.mineral ?? '') }} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{s.id.slice(0, 8)}</span>
                <StatusPill tone={st.tone}>{st.label}</StatusPill>
              </div>
              <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                {classification} <span className="text-muted-foreground">· {siteName(s.siteId)}</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {methodLabel(s.sensorTypes)} · {s.operatorName ?? 'System (auto)'} · {fmtDateTime(s.uploaded_at)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-base font-semibold text-foreground">{zone ? `${zone.confidence}%` : '—'}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">confidence</p>
            </div>
          </button>
        )
      })}
      </div>
      )}

      {openSession && (
        <ScanClassificationModal session={openSession} siteName={siteName(openSession.siteId)} onClose={() => setOpenId(null)} />
      )}
      {showNewScan && (
        <NewScanModal
          sites={sites}
          onClose={() => setShowNewScan(false)}
          onCreated={() => { setShowNewScan(false); loadScans() }}
        />
      )}
    </div>
  )
}

function ScanClassificationModal({
  session,
  siteName,
  onClose,
}: {
  session: ScanSession
  siteName: string
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const zone = primaryZone(session)

  // Esc to close + lock background scroll while the popup is open
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  if (!zone) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <Card className="w-full max-w-md border-border bg-card p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground">No mineral zones have been detected in this scan yet.</p>
        </Card>
      </div>
    )
  }

  const classification = mineralLabel(zone.mineral)
  const mineralMeta = MINERAL_META[classification as keyof typeof MINERAL_META]

  const predictedMineral = (
    <div className="rounded-lg border border-primary/25 bg-primary/8 p-4 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Predicted mineral</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{classification}</p>
      {mineralMeta && (
        <p className="font-mono text-xs text-muted-foreground">
          {mineralMeta.symbol} · {mineralMeta.commodity}
        </p>
      )}
      <p className="mt-2 font-mono text-sm text-primary">{zone.confidence}% confidence</p>
    </div>
  )

  const stats = (
    <div className="grid grid-cols-3 gap-2 text-center">
      <Stat label="Grade" value={zone.gradePct != null ? `${zone.gradePct}%` : '—'} />
      <Stat label="Zones" value={String(session.zones.length)} />
      <Stat label="Area" value={zone.areaHa != null ? `${zone.areaHa} ha` : '—'} />
    </div>
  )

  const classProbabilities = (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Class probabilities</p>
      {zone.alternatives.length === 0 ? (
        <p className="text-xs text-muted-foreground">No probability breakdown recorded for this zone.</p>
      ) : (
        <div className="space-y-2.5">
          {zone.alternatives.map((alt) => (
            <div key={alt.mineral}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-foreground">{mineralLabel(alt.mineral)}</span>
                <span className="font-mono text-muted-foreground">{alt.probability}%</span>
              </div>
              <Progress value={alt.probability} className="h-1.5" />
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const modelNote = (
    <p className="rounded-md bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
      {session.zones.length} zone(s) detected via {methodLabel(session.sensorTypes)}.
      Confidence above 90% is auto-accepted; lower scores are routed to human review.
    </p>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <Card
        className={cn(
          'w-full border-border bg-card shadow-2xl transition-all max-h-[90vh] overflow-y-auto scrollbar-thin',
          expanded ? 'max-w-4xl' : 'max-w-lg',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="relative">
          <div className="absolute right-4 top-4 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Collapse' : 'Expand'}
              title={expanded ? 'Collapse' : 'Expand'}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-primary" />
            <CardTitle className="text-sm">AI Classification — {session.id.slice(0, 8)}</CardTitle>
          </div>
          <CardDescription>
            {siteName} · {methodLabel(session.sensorTypes)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {expanded ? (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-5">
                {predictedMineral}
                {stats}
              </div>
              <div className="space-y-5">
                {classProbabilities}
                {modelNote}
              </div>
            </div>
          ) : (
            <>
              {predictedMineral}
              {classProbabilities}
              <div className="border-t border-border pt-4">{stats}</div>
              {modelNote}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface ZoneDraft {
  mineral: string
  confidence: string
  gradePct: string
  areaHa: string
  flagged: boolean
}

const EMPTY_ZONE: ZoneDraft = { mineral: MINERAL_OPTIONS[0], confidence: '', gradePct: '', areaHa: '', flagged: false }

function NewScanModal({
  sites,
  onClose,
  onCreated,
}: {
  sites: Site[]
  onClose: () => void
  onCreated: () => void
}) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '')
  const [sensorType, setSensorType] = useState(SENSOR_TYPE_OPTIONS[0])
  const [zones, setZones] = useState<ZoneDraft[]>([{ ...EMPTY_ZONE }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  function updateZone(i: number, patch: Partial<ZoneDraft>) {
    setZones((prev) => prev.map((z, idx) => (idx === i ? { ...z, ...patch } : z)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!siteId) { setError('Select a site.'); return }
    const validZones = zones.filter((z) => z.mineral && z.confidence !== '')
    if (validZones.length === 0) { setError('Enter at least one zone with a mineral and confidence.'); return }

    setSubmitting(true)
    setError('')
    try {
      const session = await createScanSession({ site_id: siteId, sensor_types: [sensorType], status: 'complete' })
      for (const z of validZones) {
        await createMineralZone({
          scan_session_id: session.id,
          mineral_type: z.mineral,
          confidence_score: Math.max(0, Math.min(100, Number(z.confidence) || 0)),
          grade_pct: z.gradePct ? Number(z.gradePct) : undefined,
          area_ha: z.areaHa ? Number(z.areaHa) : undefined,
          flagged_anomaly: z.flagged,
        })
      }
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save scan.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'h-8 rounded-md border border-border bg-background/60 px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-lg border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <CardTitle className="text-sm">New Scan</CardTitle>
          <CardDescription>Record a confirmed field observation — grade and area come from what was measured, not a model.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1 text-xs">
                <span className="text-muted-foreground">Site</span>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className={cn(inputClass, 'w-full')}
                >
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="block space-y-1 text-xs">
                <span className="text-muted-foreground">Method</span>
                <select
                  value={sensorType}
                  onChange={(e) => setSensorType(e.target.value)}
                  className={cn(inputClass, 'w-full')}
                >
                  {SENSOR_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{SENSOR_METHOD_LABEL[t]}</option>)}
                </select>
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Zones detected</p>
                <button
                  type="button"
                  onClick={() => setZones((prev) => [...prev, { ...EMPTY_ZONE }])}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="size-3" /> Add zone
                </button>
              </div>
              {zones.map((z, i) => (
                <div key={i} className="space-y-2 rounded-md border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Zone {i + 1}</span>
                    {zones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setZones((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={z.mineral}
                      onChange={(e) => updateZone(i, { mineral: e.target.value })}
                      className={inputClass}
                    >
                      {MINERAL_OPTIONS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                    </select>
                    <input
                      type="number" min={0} max={100} placeholder="Confidence %"
                      value={z.confidence} onChange={(e) => updateZone(i, { confidence: e.target.value })}
                      className={inputClass}
                    />
                    <input
                      type="number" step="0.01" placeholder="Grade %"
                      value={z.gradePct} onChange={(e) => updateZone(i, { gradePct: e.target.value })}
                      className={inputClass}
                    />
                    <input
                      type="number" step="0.1" placeholder="Area (ha)"
                      value={z.areaHa} onChange={(e) => updateZone(i, { areaHa: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox" checked={z.flagged}
                      onChange={(e) => updateZone(i, { flagged: e.target.checked })}
                    />
                    Flag as anomaly
                  </label>
                </div>
              ))}
            </div>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </CardContent>
          <div className="flex justify-end gap-2 border-t border-border p-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save scan'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 py-2">
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}
