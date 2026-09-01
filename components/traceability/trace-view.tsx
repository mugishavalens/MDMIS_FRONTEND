'use client'

import { useState } from 'react'
import {
  Radar,
  Pickaxe,
  Tag,
  Truck,
  Warehouse,
  Ship,
  ShieldCheck,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { StatusPill } from '@/components/shell/status-pill'
import {
  LOTS,
  CUSTODY_ORDER,
  MINERAL_META,
  fmtDateTime,
  fmtNumber,
  type CustodyStage,
} from '@/lib/mdmis-data'
import { cn } from '@/lib/utils'

const STAGE_ICON: Record<CustodyStage, LucideIcon> = {
  Detected: Radar,
  Extracted: Pickaxe,
  Tagged: Tag,
  Transported: Truck,
  Warehoused: Warehouse,
  Exported: Ship,
}

export function TraceView() {
  const [selectedId, setSelectedId] = useState<string>(LOTS[0].id)
  const lot = LOTS.find((l) => l.id === selectedId)!
  const currentIndex = CUSTODY_ORDER.indexOf(lot.currentStage)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {/* lot selector */}
      <div className="space-y-2">
        {LOTS.map((l) => {
          const active = l.id === selectedId
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setSelectedId(l.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors',
                active ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border hover:border-primary/30',
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: MINERAL_META[l.mineral].color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{l.id}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{l.tagId}</p>
              </div>
              {l.compliant ? (
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
                {lot.id} · {lot.mineral}
              </CardTitle>
              <CardDescription>
                Tag {lot.tagId} · {fmtNumber(lot.weightKg)} kg · grade {lot.gradePct}% · from {lot.siteName}
              </CardDescription>
            </div>
            <StatusPill tone={lot.compliant ? 'success' : 'danger'}>
              {lot.compliant ? 'Chain verified' : 'Custody flagged'}
            </StatusPill>
          </div>

          {/* stage progress bar */}
          <div className="mt-5 flex items-center">
            {CUSTODY_ORDER.map((stage, i) => {
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
                      {stage}
                    </span>
                  </div>
                  {i < CUSTODY_ORDER.length - 1 && (
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
              <span>
                Custody break detected: this lot was extracted by an unregistered operator and tagged by a disputed
                agent. Export blocked pending RMB investigation.
              </span>
            </div>
          )}

          <ol className="relative space-y-1">
            {lot.events.map((ev, i) => {
              const Icon = STAGE_ICON[ev.stage]
              const flagged = ev.hash.includes('flag') || ev.actor.includes('disputed') || ev.actor.includes('Unregistered')
              return (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-md',
                        flagged ? 'bg-destructive/12 text-destructive' : 'bg-secondary/70 text-primary',
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    {i < lot.events.length - 1 && <span className="my-1 w-px flex-1 bg-border" aria-hidden />}
                  </div>
                  <div className="min-w-0 pb-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{ev.stage}</p>
                      <span className="font-mono text-[10px] text-muted-foreground">{fmtDateTime(ev.timestamp)}</span>
                    </div>
                    <p className={cn('text-xs', flagged ? 'text-destructive' : 'text-muted-foreground')}>
                      {ev.actor} · {ev.location}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">ledger {ev.hash}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
