import { Radar, ScanLine, Layers, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { KPIS, fmtNumber } from '@/lib/mdmis-data'
import { cn } from '@/lib/utils'

const CARDS = [
  {
    label: 'Active geophysical survey sites',
    value: `${KPIS.activeSites}`,
    sub: `of ${KPIS.totalSites} licensed concessions`,
    icon: Radar,
    trend: '+2 new permits',
    up: true,
  },
  {
    label: 'Multi-sensor scans processed',
    value: `${KPIS.scansToday}`,
    sub: `avg ${KPIS.avgConfidence}% AI confidence`,
    icon: ScanLine,
    trend: '+18% vs. previous',
    up: true,
  },
  {
    label: 'Indicated mineral reserves',
    value: `${fmtNumber(Math.round(KPIS.estimatedReserveTonnes / 1000))}k t`,
    sub: 'across active deposits',
    icon: Layers,
    trend: '+4.1% revised NI 43-101',
    up: true,
  },
  {
    label: 'Non-compliant / flagged sites',
    value: `${KPIS.flaggedSites}`,
    sub: `${KPIS.compliantLotsPct}% lots pass due diligence`,
    icon: ShieldAlert,
    trend: '1 critical audit',
    up: false,
  },
]

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((c) => {
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
