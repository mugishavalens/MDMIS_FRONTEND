import { Truck, MapPin, User, Package, Clock, SatelliteDish, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatusPill } from '@/components/shell/status-pill'
import { SHIPMENTS, MINERAL_META, fmtNumber, type Shipment } from '@/lib/mdmis-data'

function statusTone(s: Shipment['status']) {
  switch (s) {
    case 'in-transit':
      return 'info' as const
    case 'delivered':
      return 'success' as const
    case 'delayed':
      return 'danger' as const
    default:
      return 'warning' as const
  }
}

export function TransportView() {
  const inTransit = SHIPMENTS.filter((s) => s.status === 'in-transit').length
  const delayed = SHIPMENTS.filter((s) => s.status === 'delayed').length
  const totalKg = SHIPMENTS.reduce((a, s) => a + s.weightKg, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Summary icon={Truck} label="Active convoys" value={String(SHIPMENTS.length)} />
        <Summary icon={SatelliteDish} label="In transit" value={String(inTransit)} />
        <Summary icon={AlertTriangle} label="Delayed / GPS loss" value={String(delayed)} tone="danger" />
        <Summary icon={Package} label="Total in motion" value={`${fmtNumber(totalKg)} kg`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SHIPMENTS.map((s) => (
          <Card key={s.id} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-10 items-center justify-center rounded-md"
                    style={{ background: `color-mix(in oklch, ${MINERAL_META[s.mineral].color} 15%, transparent)` }}
                  >
                    <Truck className="size-5" style={{ color: MINERAL_META[s.mineral].color }} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {s.id} <span className="font-normal text-muted-foreground">· {s.vehicle}</span>
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {s.mineral} · {fmtNumber(s.weightKg)} kg · lot {s.lotId}
                    </p>
                  </div>
                </div>
                <StatusPill tone={statusTone(s.status)}>{s.status.replace('-', ' ')}</StatusPill>
              </div>

              {/* route */}
              <div className="mt-4 flex items-center gap-2 text-xs">
                <MapPin className="size-3.5 text-[var(--success)]" />
                <span className="truncate text-foreground">{s.origin.name}</span>
                <span className="flex-1 border-t border-dashed border-border" />
                <MapPin className="size-3.5 text-primary" />
                <span className="truncate text-foreground">{s.destination.name}</span>
              </div>

              <div className="mt-2">
                <Progress value={s.progress} className="h-1.5" />
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="size-3" /> {s.driver}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> ETA {s.etaHours}h
                  </span>
                </div>
              </div>

              {!s.gpsIntegrity && (
                <div className="mt-3 flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
                  <AlertTriangle className="size-3.5" /> GPS integrity lost — signal gap flagged for review
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
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
