import { ScanLine, AlertTriangle, Truck, ShieldCheck, Link2, type LucideIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ACTIVITY, timeAgo, type ActivityKind } from '@/lib/mdmis-data'
import { cn } from '@/lib/utils'

const KIND: Record<ActivityKind, { icon: LucideIcon; tone: string }> = {
  scan: { icon: ScanLine, tone: 'text-accent bg-accent/12' },
  alert: { icon: AlertTriangle, tone: 'text-destructive bg-destructive/12' },
  shipment: { icon: Truck, tone: 'text-primary bg-primary/12' },
  compliance: { icon: ShieldCheck, tone: 'text-[var(--success)] bg-[var(--success)]/12' },
  trace: { icon: Link2, tone: 'text-muted-foreground bg-muted' },
}

export function ActivityFeed() {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Operations activity</CardTitle>
        <span className="text-xs text-muted-foreground">Live feed</span>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-1">
          {ACTIVITY.map((a, i) => {
            const meta = KIND[a.kind]
            const Icon = meta.icon
            return (
              <li key={a.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn('flex size-8 items-center justify-center rounded-md', meta.tone)}>
                    <Icon className="size-4" />
                  </span>
                  {i < ACTIVITY.length - 1 && <span className="my-1 w-px flex-1 bg-border" aria-hidden />}
                </div>
                <div className="min-w-0 pb-4">
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {timeAgo(a.timestamp)}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
