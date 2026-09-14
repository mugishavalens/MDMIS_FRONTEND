'use client'

import { useEffect, useState } from 'react'
import {
  HardHat,
  AlertTriangle,
  AlertOctagon,
  Clock,
  CheckCircle2,
  MapPin,
  User,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusPill } from '@/components/shell/status-pill'
import { useAuth } from '@/lib/auth-context'
import { can } from '@/lib/rbac'
import { ApiError } from '@/lib/api'
import {
  fetchSafetyIncidents,
  acknowledgeSafetyIncident,
  INCIDENT_TYPE_LABEL,
  type SafetyIncident,
  type IncidentStatus,
} from '@/lib/api/safety'
import { fetchSites, type Site } from '@/lib/api/sites'
import { fmtDateTime } from '@/lib/mdmis-data'

function statusMeta(s: IncidentStatus) {
  switch (s) {
    case 'resolved':
      return { tone: 'success' as const, icon: CheckCircle2, label: 'Resolved' }
    case 'acknowledged':
      return { tone: 'info' as const, icon: Clock, label: 'Acknowledged' }
    case 'escalated':
      return { tone: 'danger' as const, icon: AlertOctagon, label: 'Escalated' }
    default:
      return { tone: 'danger' as const, icon: AlertTriangle, label: 'Open' }
  }
}

function riskTone(score: number): 'danger' | 'warning' | 'success' {
  if (score >= 70) return 'danger'
  if (score >= 40) return 'warning'
  return 'success'
}

export function SafetyView() {
  const { user } = useAuth()
  const [incidents, setIncidents] = useState<SafetyIncident[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchSafetyIncidents(), fetchSites()])
      .then(([i, s]) => {
        if (cancelled) return
        setIncidents(i)
        setSites(s)
      })
      .catch((err) => console.error('[MDMIS] Failed to load safety incidents:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const siteName = (siteId: string) => sites.find((s) => s.id === siteId)?.name ?? siteId
  const canAcknowledge = user ? can(user.role, 'safety.acknowledge') : false

  async function handleAcknowledge(id: string) {
    setAcknowledgingId(id)
    setError(null)
    try {
      const updated = await acknowledgeSafetyIncident(id)
      setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to acknowledge incident.')
    } finally {
      setAcknowledgingId(null)
    }
  }

  const open = incidents.filter((i) => i.status === 'open').length
  const escalated = incidents.filter((i) => i.status === 'escalated').length
  const avgRisk = incidents.length > 0 ? Math.round(incidents.reduce((a, i) => a + i.riskScore, 0) / incidents.length) : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Summary icon={HardHat} label="Total incidents" value={String(incidents.length)} />
        <Summary icon={AlertTriangle} label="Open" value={String(open)} tone="danger" />
        <Summary icon={AlertOctagon} label="Escalated" value={String(escalated)} tone="danger" />
        <Summary icon={ShieldAlert} label="Avg. risk score" value={String(avgRisk)} />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-xs text-muted-foreground">Loading safety incidents…</p>
      ) : incidents.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">No safety incidents recorded.</p>
      ) : (
        <div className="space-y-2">
          {incidents.map((i) => {
            const st = statusMeta(i.status)
            const StatusIcon = st.icon
            return (
              <Card key={i.id} className="border-border bg-card">
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={
                        riskTone(i.riskScore) === 'danger'
                          ? 'flex size-10 shrink-0 items-center justify-center rounded-md bg-destructive/12 text-destructive'
                          : riskTone(i.riskScore) === 'warning'
                          ? 'flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary'
                          : 'flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--success)]/12 text-[var(--success)]'
                      }
                    >
                      <StatusIcon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {INCIDENT_TYPE_LABEL[i.incidentType] ?? i.incidentType}
                        </p>
                        <StatusPill tone={st.tone}>{st.label}</StatusPill>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {siteName(i.siteId)}
                      </p>
                      {i.description && (
                        <p className="mt-1 max-w-md text-xs text-muted-foreground">{i.description}</p>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <User className="size-3" /> reported by {i.reportedByName ?? 'Unknown'} · {fmtDateTime(i.created_at)}
                        {i.acknowledgedByName && ` · acknowledged by ${i.acknowledgedByName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="font-mono text-lg font-semibold text-foreground">{i.riskScore}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">risk score</p>
                    </div>
                    {i.status === 'open' && canAcknowledge && (
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(i.id)}
                        disabled={acknowledgingId === i.id}
                        className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                      >
                        {acknowledgingId === i.id ? 'Acknowledging…' : 'Acknowledge'}
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Summary({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType
  label: string
  value: string
  tone?: 'danger'
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={
            tone === 'danger'
              ? 'flex size-9 items-center justify-center rounded-md bg-destructive/12 text-destructive'
              : 'flex size-9 items-center justify-center rounded-md bg-secondary/70 text-primary'
          }
        >
          <Icon className="size-4.5" />
        </span>
        <div>
          <p className="text-xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
