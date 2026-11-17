'use client'

import Link from 'next/link'
import { Radar, ScanLine, Layers, ShieldAlert, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { fmtNumber } from '@/lib/mdmis-data'
import { type DashboardSummary, type KpiTrends } from '@/lib/api/dashboard'
import { useDashboardSummary } from '@/lib/dashboard-context'
import { cn } from '@/lib/utils'

type Tone = 'good' | 'bad' | 'flat'

// Each badge is computed from the summary's real trends; when nothing moved
// it says so in a neutral tone rather than showing an arrow.
function buildTrends(t: KpiTrends): { text: string; tone: Tone }[] {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

  let scans: { text: string; tone: Tone }
  if (t.scansLast7d === 0 && t.scansPrev7d === 0) scans = { text: 'No scans in 14 days', tone: 'flat' }
  else if (t.scansPrev7d === 0) scans = { text: `${plural(t.scansLast7d, 'scan')} this week`, tone: 'good' }
  else {
    const pct = Math.round(((t.scansLast7d - t.scansPrev7d) / t.scansPrev7d) * 100)
    scans = {
      text: pct === 0 ? 'Same as last week' : `${pct > 0 ? '+' : ''}${pct}% vs last week`,
      tone: pct > 0 ? 'good' : pct < 0 ? 'bad' : 'flat',
    }
  }

  return [
    t.sitesAdded30d > 0
      ? { text: `+${plural(t.sitesAdded30d, 'site')} in 30 days`, tone: 'good' }
      : { text: 'No new sites in 30 days', tone: 'flat' },
    scans,
    t.zonesDetected30d > 0
      ? { text: `+${plural(t.zonesDetected30d, 'zone')} in 30 days`, tone: 'good' }
      : { text: 'No new zones in 30 days', tone: 'flat' },
    t.nonCompliantLots > 0
      ? { text: `${plural(t.nonCompliantLots, 'non-compliant lot')}`, tone: 'bad' }
      : { text: 'All lots compliant', tone: 'good' },
  ]
}

function buildCards(k: DashboardSummary) {
  const trends = buildTrends(k.trends)
  return [
    {
      label: 'Active geophysical survey sites',
      value: `${k.activeSites}`,
      sub: `of ${k.totalSites} licensed concessions`,
      icon: Radar,
      href: '/map',
      hint: 'Open Intelligence Explorer to see every site on the map',
      trend: trends[0],
    },
    {
      label: 'Multi-sensor scans processed',
      value: `${k.scansToday}`,
      sub: `avg ${k.avgConfidence}% AI confidence`,
      icon: ScanLine,
      href: '/scans',
      hint: 'Open Survey Analysis to see the scans and their classifications',
      trend: trends[1],
    },
    {
      label: 'Indicated mineral reserves',
      value: `${fmtNumber(Math.round(k.estimatedReserveTonnes / 1000))}k t`,
      sub: 'across active deposits',
      icon: Layers,
      href: '/scans',
      hint: 'Open Survey Analysis to see the zones behind these reserves',
      trend: trends[2],
    },
    {
      label: 'Non-compliant / flagged sites',
      value: `${k.flaggedSites}`,
      sub: `${k.compliantLotsPct}% lots pass due diligence`,
      icon: ShieldAlert,
      href: '/compliance',
      hint: 'Open Regulatory Compliance to review flagged lots',
      trend: trends[3],
    },
  ]
}

export function KpiCards() {
  const { summary } = useDashboardSummary()

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
              <Link key={c.label} href={c.href} title={c.hint}
                className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
              <Card className="h-full gap-0 border-border bg-card p-5 transition-all group-hover:border-primary/30 group-hover:shadow-md group-hover:shadow-primary/5 group-hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-md bg-secondary/70 text-primary transition-transform group-hover:scale-110">
                    <Icon className="size-4.5" />
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium transition-all',
                      c.trend.tone === 'good' && 'text-[var(--success)]',
                      c.trend.tone === 'bad' && 'text-destructive',
                      c.trend.tone === 'flat' && 'text-muted-foreground',
                    )}
                  >
                    {c.trend.tone === 'good' ? <TrendingUp className="size-3.5" />
                      : c.trend.tone === 'bad' ? <TrendingDown className="size-3.5" />
                      : <Minus className="size-3.5" />}
                    {c.trend.text}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">{c.value}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.sub}</p>
              </Card>
              </Link>
            )
          })}
    </div>
  )
}
