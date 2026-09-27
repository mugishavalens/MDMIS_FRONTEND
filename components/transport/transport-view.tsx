'use client'

import { useCallback, useEffect, useState } from 'react'
import { Truck, MapPin, User, Package, Clock, SatelliteDish, AlertTriangle, Plus, Radio, IdCard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatusPill } from '@/components/shell/status-pill'
import { DriversPanel, VehiclesPanel } from '@/components/transport/fleet-registry'
import { NewShipmentModal } from '@/components/transport/new-shipment-modal'
import { ShipmentDrawer, statusTone, timeAgo } from '@/components/transport/shipment-drawer'
import { useAuth } from '@/lib/auth-context'
import { can } from '@/lib/rbac'
import { MINERAL_META, fmtNumber } from '@/lib/mdmis-data'
import { fetchDrivers, fetchVehicles, type Driver, type Vehicle } from '@/lib/api/fleet'
import { fetchShipments, type ShipmentStatus, type TransportShipment } from '@/lib/api/transport'
import { cn } from '@/lib/utils'

const FALLBACK_MINERAL_COLOR = '#9b6dff'
// Positions and signal ages go stale fast; re-poll while the tab is visible.
const REFRESH_MS = 60_000

function mineralColor(mineral: string): string {
  return MINERAL_META[mineral as keyof typeof MINERAL_META]?.color ?? FALLBACK_MINERAL_COLOR
}

type Tab = 'shipments' | 'vehicles' | 'drivers'
type Filter = 'active' | ShipmentStatus | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'loading', label: 'Loading' },
  { key: 'in-transit', label: 'In transit' },
  { key: 'delayed', label: 'Delayed' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'all', label: 'All' },
]

export function TransportView() {
  const { user } = useAuth()
  const canEdit = user ? can(user.role, 'transport.edit') : false

  const [shipments, setShipments] = useState<TransportShipment[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('shipments')
  const [filter, setFilter] = useState<Filter>('active')
  const [openId, setOpenId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    try {
      const [s, v, d] = await Promise.all([fetchShipments(), fetchVehicles(), fetchDrivers()])
      setShipments(s)
      setVehicles(v)
      setDrivers(d)
    } catch (err) {
      console.error('[MDMIS] Failed to load fleet data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') load() }, REFRESH_MS)
    return () => window.clearInterval(t)
  }, [load])

  const active = shipments.filter((s) => s.status !== 'delivered')
  const inTransit = shipments.filter((s) => s.status === 'in-transit').length
  const attention = active.filter((s) => s.status === 'delayed' || !s.gpsIntegrity).length
  const totalKg = active.reduce((a, s) => a + s.weightKg, 0)
  const freeVehicles = vehicles.filter((v) => v.status === 'available' && !v.currentShipmentId).length
  const inService = vehicles.filter((v) => v.status !== 'retired').length

  const visible = shipments.filter((s) =>
    filter === 'all' ? true : filter === 'active' ? s.status !== 'delivered' : s.status === filter,
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Summary icon={Truck} label="Active convoys" value={String(active.length)} />
        <Summary icon={SatelliteDish} label="In transit" value={String(inTransit)} />
        <Summary icon={AlertTriangle} label="Delayed / GPS loss" value={String(attention)} tone={attention ? 'danger' : undefined} />
        <Summary icon={Package} label="Total in motion" value={`${fmtNumber(totalKg)} kg`} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {([
            ['shipments', 'Shipments', shipments.length],
            ['vehicles', 'Vehicles', `${freeVehicles}/${inService}`],
            ['drivers', 'Drivers', drivers.length],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                tab === key ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
              <span className="rounded bg-background/60 px-1.5 text-[10px] text-muted-foreground">{count}</span>
            </button>
          ))}
        </div>
        {canEdit && tab === 'shipments' && (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="size-3.5" /> New shipment
          </button>
        )}
      </div>

      {tab === 'vehicles' && (
        <VehiclesPanel vehicles={vehicles} canEdit={canEdit} onChanged={load} onOpenShipment={setOpenId} />
      )}
      {tab === 'drivers' && (
        <DriversPanel drivers={drivers} canEdit={canEdit} onChanged={load} onOpenShipment={setOpenId} />
      )}

      {tab === 'shipments' && (
        <>
          <div className="flex flex-wrap gap-1.5">
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
          </div>

          {loading ? (
            <p className="py-10 text-center text-xs text-muted-foreground">Loading shipments…</p>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">
              {shipments.length === 0 ? 'No shipments recorded yet.' : 'No shipments match this filter.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visible.map((s) => (
                <ShipmentCard key={s.id} s={s} onOpen={() => setOpenId(s.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {openId && (
        <ShipmentDrawer shipmentId={openId} canEdit={canEdit} onClose={() => setOpenId(null)} onChanged={load} />
      )}
      {showNew && (
        <NewShipmentModal
          shipments={shipments}
          onClose={() => setShowNew(false)}
          onCreated={(created) => { setShowNew(false); setFilter('active'); load(); setOpenId(created.id) }}
        />
      )}
    </div>
  )
}

function ShipmentCard({ s, onOpen }: { s: TransportShipment; onOpen: () => void }) {
  const color = mineralColor(s.mineral)
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className="cursor-pointer border-border bg-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-md"
              style={{ background: `color-mix(in oklch, ${color} 15%, transparent)` }}
            >
              <Truck className="size-5" style={{ color }} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                <span className="font-mono">{s.reference}</span>
                {s.vehicle && <span className="font-normal text-muted-foreground"> · {s.vehicle}</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {s.mineral} · {fmtNumber(s.weightKg)} kg
                {s.batchCode && <> · <span className="font-mono">{s.batchCode}</span></>}
              </p>
            </div>
          </div>
          <StatusPill tone={statusTone(s.status)} className="shrink-0">{s.status.replace('-', ' ')}</StatusPill>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs">
          <MapPin className="size-3.5 shrink-0 text-[var(--success)]" />
          <span className="truncate text-foreground">{s.origin.name}</span>
          <span className="flex-1 border-t border-dashed border-border" />
          <MapPin className="size-3.5 shrink-0 text-primary" />
          <span className="truncate text-foreground">{s.destination.name}</span>
        </div>

        <div className="mt-2">
          <Progress value={s.progress} className="h-1.5" />
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              {s.driver ? <><User className="size-3" /> {s.driver}</> : <><IdCard className="size-3" /> No driver assigned</>}
            </span>
            {s.lastPing && s.status !== 'delivered' && (
              <span className={cn('flex items-center gap-1', !s.gpsIntegrity && 'text-destructive')}>
                <Radio className="size-3" /> {timeAgo(s.lastPing.at)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> {s.status === 'delivered' ? `Delivered ${timeAgo(s.deliveredAt)}` : `ETA ${s.etaHours}h`}
            </span>
          </div>
        </div>

        {!s.gpsIntegrity && s.status !== 'delivered' && (
          <div className="mt-3 flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
            <AlertTriangle className="size-3.5" />
            GPS integrity lost{s.signalAgeMinutes !== null ? ` — no position for ${s.signalAgeMinutes} min` : ' — signal gap flagged for review'}
          </div>
        )}
      </CardContent>
    </Card>
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
