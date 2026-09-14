'use client'

import { useEffect, useState } from 'react'
import {
  Pickaxe,
  Scale,
  Boxes,
  Send,
  MapPin,
  PackageCheck,
  Factory,
  Ship,
  Ban,
  ShieldCheck,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { StatusPill } from '@/components/shell/status-pill'
import { MINERAL_META, fmtDateTime, fmtNumber } from '@/lib/mdmis-data'
import {
  fetchBatches,
  CUSTODY_STAGE_ORDER,
  CUSTODY_STAGE_LABEL,
  type Batch,
  type CustodyStage,
} from '@/lib/api/traceability'
import { fetchSites, type Site } from '@/lib/api/sites'
import { cn } from '@/lib/utils'

const FALLBACK_MINERAL_COLOR = '#9b6dff'

const STAGE_ICON: Record<CustodyStage, LucideIcon> = {
  extraction: Pickaxe,
  weigh_in: Scale,
  storage_in: Boxes,
  dispatch: Send,
  waypoint: MapPin,
  receipt: PackageCheck,
  processing: Factory,
  export: Ship,
  rejection: Ban,
}

function mineralLabel(mineral: string): string {
  return mineral ? mineral.charAt(0).toUpperCase() + mineral.slice(1) : 'Unknown'
}

function mineralColor(mineral: string): string {
  return MINERAL_META[mineralLabel(mineral) as keyof typeof MINERAL_META]?.color ?? FALLBACK_MINERAL_COLOR
}

export function TraceView() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchBatches(), fetchSites()])
      .then(([b, s]) => {
        if (cancelled) return
        setBatches(b)
        setSites(s)
        setSelectedId((prev) => prev ?? b[0]?.id ?? null)
      })
      .catch((err) => console.error('[MDMIS] Failed to load traceability data:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const siteName = (siteId: string) => sites.find((s) => s.id === siteId)?.name ?? siteId
  const lot = batches.find((b) => b.id === selectedId) ?? null
  const currentIndex = lot ? CUSTODY_STAGE_ORDER.indexOf(lot.currentStage as (typeof CUSTODY_STAGE_ORDER)[number]) : -1

  if (loading) {
    return <p className="py-10 text-center text-xs text-muted-foreground">Loading chain-of-custody records…</p>
  }

  if (batches.length === 0 || !lot) {
    return <p className="py-10 text-center text-xs text-muted-foreground">No mineral batches recorded yet.</p>
  }

  const grade = lot.gradeConfirmed ?? lot.gradeDetected ?? 0

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {/* lot selector */}
      <div className="space-y-2">
        {batches.map((b) => {
          const active = b.id === selectedId
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedId(b.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors',
                active ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border hover:border-primary/30',
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: mineralColor(b.mineral) }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs font-medium text-foreground">{b.tagId}</p>
                <p className="truncate text-xs text-muted-foreground">{mineralLabel(b.mineral)} · {siteName(b.siteId)}</p>
              </div>
              {b.compliant ? (
                <ShieldCheck className="size-4 shrink-0 text-[var(--success)]" />
              ) : (
                <ShieldAlert className="size-4 shrink-0 text-destructive" />
              )}
            </button>
          )
        })}
      </div>

      {/* custody detail */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {lot.tagId} · {mineralLabel(lot.mineral)}
              </CardTitle>
              <CardDescription>
                {fmtNumber(lot.weightKg)} kg · grade {grade}% · from {siteName(lot.siteId)}
              </CardDescription>
            </div>
            <StatusPill tone={lot.compliant ? 'success' : 'danger'}>
              {lot.compliant ? 'Chain verified' : 'Custody flagged'}
            </StatusPill>
          </div>

          {/* stage progress bar */}
          <div className="mt-5 flex items-center">
            {CUSTODY_STAGE_ORDER.map((stage, i) => {
              const done = i <= currentIndex
              return (
                <div key={stage} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        'flex size-7 items-center justify-center rounded-full border text-[10px] font-semibold',
                        done
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-secondary text-muted-foreground',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className={cn('hidden text-[9px] sm:block', done ? 'text-foreground' : 'text-muted-foreground')}>
                      {CUSTODY_STAGE_LABEL[stage]}
                    </span>
                  </div>
                  {i < CUSTODY_STAGE_ORDER.length - 1 && (
                    <span className={cn('mx-1 h-px flex-1', i < currentIndex ? 'bg-primary' : 'bg-border')} />
                  )}
                </div>
              )
            })}
          </div>
        </CardHeader>

        <CardContent>
          {!lot.compliant && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>{lot.complianceNote || 'This batch has been flagged non-compliant.'}</span>
            </div>
          )}

          {lot.events.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No custody events recorded yet.</p>
          ) : (
            <ol className="relative space-y-1">
              {lot.events.map((ev, i) => {
                const Icon = STAGE_ICON[ev.stage] ?? Pickaxe
                return (
                  <li key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'flex size-8 items-center justify-center rounded-md',
                          ev.flagged ? 'bg-destructive/12 text-destructive' : 'bg-secondary/70 text-primary',
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      {i < lot.events.length - 1 && <span className="my-1 w-px flex-1 bg-border" aria-hidden />}
                    </div>
                    <div className="min-w-0 pb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{CUSTODY_STAGE_LABEL[ev.stage] ?? ev.stage}</p>
                        <span className="font-mono text-[10px] text-muted-foreground">{fmtDateTime(ev.timestamp)}</span>
                      </div>
                      <p className={cn('text-xs', ev.flagged ? 'text-destructive' : 'text-muted-foreground')}>
                        {ev.fromParty || 'Unknown'} → {ev.toParty || 'Unknown'}
                        {ev.gpsLat != null && ev.gpsLng != null ? ` · ${ev.gpsLat.toFixed(4)}, ${ev.gpsLng.toFixed(4)}` : ''}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">event {ev.id.slice(0, 8)}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
