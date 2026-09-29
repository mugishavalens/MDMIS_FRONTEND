'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  HardHat,
  AlertTriangle,
  AlertOctagon,
  MapPin,
  User,
  ShieldAlert,
  type LucideIcon,
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
import { cn } from '@/lib/utils'
import { IncidentDrawer, riskTone, statusMeta } from '@/components/safety/incident-drawer'
import { StatCard } from '@/components/shell/stat-card'

type Filter = 'active' | IncidentStatus | 'all'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'active', label: 'Needs attention' },
  { key: 'open', label: 'Open' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
]

export function SafetyView() {
  const { user } = useAuth()
  const [incidents, setIncidents] = useState<SafetyIncident[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [sortByRisk, setSortByRisk] = useState(false)

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

  const reloadIncidents = useCallback(() => {
    fetchSafetyIncidents()
      .then(setIncidents)
      .catch((err) => console.error('[MDMIS] Failed to reload safety incidents:', err))
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
  const filtered = incidents.filter((i) =>
    filter === 'all' ? true : filter === 'active' ? i.status !== 'resolved' : i.status === filter,
  )
  const visible = sortByRisk ? [...filtered].sort((a, b) => b.riskScore - a.riskScore) : filtered
  // Cards filter the list; clicking the active card again clears it.
  const toggleFilter = (f: Filter) => setFilter((cur) => (cur === f ? 'all' : f))
  const avgRisk = incidents.length > 0 ? Math.round(incidents.reduce((a, i) => a + i.riskScore, 0) / incidents.length) : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={HardHat} label="Total incidents" value={String(incidents.length)}
          hint="Show all incidents" selected={filter === 'all' && !sortByRisk}
          onClick={() => { setFilter('all'); setSortByRisk(false) }} />
        <StatCard icon={AlertTriangle} label="Open" value={String(open)} tone="danger"
          hint="Show only open incidents" selected={filter === 'open'} onClick={() => toggleFilter('open')} />
        <StatCard icon={AlertOctagon} label="Escalated" value={String(escalated)} tone="danger"
          hint="Show only escalated incidents" selected={filter === 'escalated'} onClick={() => toggleFilter('escalated')} />
        <StatCard icon={ShieldAlert} label="Avg. risk score" value={String(avgRisk)}
          hint="Sort incidents by risk, highest first" selected={sortByRisk} onClick={() => setSortByRisk((v) => !v)} />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
              filter === f.key
                ? 'border-primary/40 bg-primary/12 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
        {sortByRisk && (
          <button type="button" onClick={() => setSortByRisk(false)}
            className="rounded-full border border-primary/40 bg-primary/12 px-2.5 py-1 text-[11px] font-medium text-primary">
            Sorted by highest risk · Clear
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-xs text-muted-foreground">Loading safety incidents…</p>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">
          {incidents.length === 0 ? 'No safety incidents recorded.' : 'No incidents match this filter.'}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((i) => {
            const st = statusMeta(i.status)
            const StatusIcon = st.icon
            return (
              <Card
                key={i.id}
                role="button"
                tabIndex={0}
                onClick={() => setOpenId(i.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(i.id) } }}
                className="cursor-pointer border-border bg-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
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
                        {i.resolvedByName && ` · resolved by ${i.resolvedByName}`}
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
                        onClick={(e) => { e.stopPropagation(); handleAcknowledge(i.id) }}
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

      {openId && (
        <IncidentDrawer
          incidentId={openId}
          siteName={siteName}
          canRespond={canAcknowledge}
          onClose={() => setOpenId(null)}
          onChanged={reloadIncidents}
        />
      )}
    </div>
  )
}
