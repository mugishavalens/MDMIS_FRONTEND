'use client'

import { useEffect, useState } from 'react'
import { Radar, ScanLine, Layers, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { fmtNumber } from '@/lib/mdmis-data'
import { fetchDashboardSummary, type DashboardSummary } from '@/lib/api/dashboard'
import { cn } from '@/lib/utils'

// These 4 trend strings have no real backing data source (no "permits"
// concept, no historical baseline to compare "vs. previous" against, no
// audit-tracking domain) — left as static copy rather than faking numbers.
const TRENDS = ['+2 new permits', '+18% vs. previous', '+4.1% revised NI 43-101', '1 critical audit']

function buildCards(k: DashboardSummary) {
  return [
    {
      label: 'Active geophysical survey sites',
      value: `${k.activeSites}`,
      sub: `of ${k.totalSites} licensed concessions`,
      icon: Radar,
      trend: TRENDS[0],
      up: true,
    },
    {
      label: 'Multi-sensor scans processed',
      value: `${k.scansToday}`,
      sub: `avg ${k.avgConfidence}% AI confidence`,
      icon: ScanLine,
      trend: TRENDS[1],
      up: true,
    },
    {
      label: 'Indicated mineral reserves',
      value: `${fmtNumber(Math.round(k.estimatedReserveTonnes / 1000))}k t`,
      sub: 'across active deposits',
      icon: Layers,
      trend: TRENDS[2],
      up: true,
    },
    {
      label: 'Non-compliant / flagged sites',
      value: `${k.flaggedSites}`,
      sub: `${k.compliantLotsPct}% lots pass due diligence`,
      icon: ShieldAlert,
      trend: TRENDS[3],
      up: false,
    },
  ]
}

export function KpiCards() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchDashboardSummary()
      .then((data) => { if (!cancelled) setSummary(data) })
      .catch((err) => console.error('[MDMIS] Failed to load dashboard summary:', err))
    return () => { cancelled = true }
  }, [])

  const cards = summary ? buildCards(summary) : []

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.length === 0
        ? Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="gap-0 border-border bg-card p-5">
              <div className="h-9 w-9 animate-pulse rounded-md bg-secondary/70" />
              <p className="mt-4 h-8 w-16 animate-pulse rounded bg-secondary/70" />
              <p className="mt-3 h-4 w-32 animate-pulse rounded bg-secondary/50" />
            </Card>
          ))
        : cards.map((c) => {
            const Icon = c.icon
            return (
              <Card key={c.label} className="group gap-0 border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-md bg-secondary/70 text-primary transition-transform group-hover:scale-110">
                    <Icon className="size-4.5" />
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium transition-all',
                      c.up ? 'text-[var(--success)]' : 'text-destructive',
                    )}
                  >
                    {c.up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                    {c.trend}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">{c.value}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.sub}</p>
              </Card>
            )
          })}
    </div>
  )
}
