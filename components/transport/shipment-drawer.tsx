'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, Clock, Crosshair, Link2, MapPin, Package, Pause, Play, Radio, Truck, User, X,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { StatusPill } from '@/components/shell/status-pill'
import { RouteMap } from '@/components/transport/route-map'
import { ApiError } from '@/lib/api'
import {
  changeShipmentStatus, fetchShipment, recordShipmentPing,
  type ShipmentDetail, type ShipmentStatus, type ShipmentTimelineEvent,
} from '@/lib/api/transport'
import { CUSTODY_STAGE_LABEL, fetchBatch, type Batch } from '@/lib/api/traceability'
import { fmtNumber } from '@/lib/mdmis-data'
import { cn } from '@/lib/utils'

export function statusTone(s: ShipmentStatus) {
  switch (s) {
    case 'in-transit': return 'info' as const
    case 'delivered': return 'success' as const
    case 'delayed': return 'danger' as const
    default: return 'warning' as const
  }
}

export function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

const EVENT_META: Record<ShipmentTimelineEvent['eventType'], { label: string; tone: string }> = {
  created: { label: 'Shipment created', tone: 'bg-muted-foreground' },
  departed: { label: 'Departed', tone: 'bg-accent' },
  delayed: { label: 'Delay reported', tone: 'bg-destructive' },
  resumed: { label: 'Trip resumed', tone: 'bg-accent' },
  delivered: { label: 'Delivered', tone: 'bg-[var(--success)]' },
  note: { label: 'Note', tone: 'bg-muted-foreground' },
}

type Panel = null | 'delay' | 'ping'

export function ShipmentDrawer({
  shipmentId,
  canEdit,
  onClose,
  onChanged,
}: {
  shipmentId: string
  canEdit: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null)
  const [batch, setBatch] = useState<Batch | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)

  const load = useCallback(async () => {
    try {
      const s = await fetchShipment(shipmentId)
      setShipment(s)
      setBatch(s.lotId ? await fetchBatch(s.lotId).catch(() => null) : null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load shipment.')
    }
  }, [shipmentId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
      setPanel(null)
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  const s = shipment
  const onRoad = s?.status === 'in-transit' || s?.status === 'delayed'

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-label="Shipment details"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border p-5">
          {s ? (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono text-sm font-semibold text-foreground">{s.reference}</h2>
                <StatusPill tone={statusTone(s.status)}>{s.status.replace('-', ' ')}</StatusPill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.mineral} · {fmtNumber(s.weightKg)} kg
                {s.batchCode && <> · batch <span className="font-mono">{s.batchCode}</span></>}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading shipment…</p>
          )}
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <X className="size-4" />
          </button>
        </header>

        {s && (
          <div className="flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
            )}

            <RouteMap
              origin={{ ...s.origin }}
              destination={{ ...s.destination }}
              trail={s.pings.map((p) => ({ lat: p.lat, lng: p.lng }))}
              current={s.lastPing}
              gpsLost={!s.gpsIntegrity}
              moving={s.status === 'in-transit'}
            />

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-foreground">
                  <MapPin className="size-3.5 text-[var(--success)]" /> {s.origin.name}
                </span>
                <span className="flex items-center gap-1.5 text-foreground">
                  <MapPin className="size-3.5 text-primary" /> {s.destination.name}
                </span>
              </div>
              <Progress value={s.progress} className="h-1.5" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Stat label="Progress" value={`${s.progress}%`} />
              <Stat label="ETA" value={s.status === 'delivered' ? 'Arrived' : `${s.etaHours}h`} />
              <Stat
                label="Last signal"
                value={s.lastPing ? timeAgo(s.lastPing.at) : 'No fix yet'}
                danger={!s.gpsIntegrity}
              />
              <Stat label="Departed" value={s.departedAt ? timeAgo(s.departedAt) : 'Not yet'} />
            </div>

            {!s.gpsIntegrity && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  GPS integrity lost
                  {s.signalAgeMinutes !== null ? ` — no position for ${s.signalAgeMinutes} min` : ''}. Signal gap flagged for review.
                </span>
              </div>
            )}

            <section className="grid grid-cols-2 gap-2.5">
              <Info icon={Truck} label="Vehicle" value={s.vehicle || 'Unassigned'} />
              <Info icon={User} label="Driver" value={s.driver || 'Unassigned'} />
            </section>

            {canEdit && s.status !== 'delivered' && (
              <section className="space-y-2.5">
                <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {s.status === 'loading' && (
                    <ActionButton icon={Play} disabled={busy} onClick={() => run(() => changeShipmentStatus(s.id, 'in-transit'))}>
                      Start trip
                    </ActionButton>
                  )}
                  {s.status === 'delayed' && (
                    <ActionButton icon={Play} disabled={busy} onClick={() => run(() => changeShipmentStatus(s.id, 'in-transit'))}>
                      Resume trip
                    </ActionButton>
                  )}
                  {onRoad && (
                    <ActionButton icon={Crosshair} disabled={busy} active={panel === 'ping'}
                      onClick={() => setPanel(panel === 'ping' ? null : 'ping')}>
                      Log position
                    </ActionButton>
                  )}
                  {s.status === 'in-transit' && (
                    <ActionButton icon={Pause} disabled={busy} active={panel === 'delay'}
                      onClick={() => setPanel(panel === 'delay' ? null : 'delay')}>
                      Report delay
                    </ActionButton>
                  )}
                  {onRoad && (
                    <ActionButton icon={CheckCircle2} tone="success" disabled={busy}
                      onClick={() => run(() => changeShipmentStatus(s.id, 'delivered'))}>
                      Mark delivered
                    </ActionButton>
                  )}
                </div>
                {panel === 'delay' && (
                  <DelayForm busy={busy} onSubmit={(note) => run(() => changeShipmentStatus(s.id, 'delayed', note))} />
                )}
                {panel === 'ping' && (
                  <PingForm
                    busy={busy}
                    start={s.lastPing ?? s.origin}
                    onSubmit={(ping) => run(() => recordShipmentPing(s.id, ping))}
                  />
                )}
                {s.batchCode && s.status === 'loading' && (
                  <p className="text-[11px] text-muted-foreground">
                    Starting the trip records a <span className="text-foreground">dispatch</span> event on batch {s.batchCode}&apos;s
                    chain of custody; delivery records the <span className="text-foreground">receipt</span>.
                  </p>
                )}
              </section>
            )}

            <section className="space-y-2.5">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Timeline</h3>
              <ol className="space-y-3 border-l border-border pl-4">
                {s.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className={cn('absolute -left-[21px] top-1 size-2.5 rounded-full ring-2 ring-card', EVENT_META[e.eventType]?.tone)} />
                    <p className="text-xs font-medium text-foreground">{EVENT_META[e.eventType]?.label ?? e.eventType}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtTime(e.createdAt)}{e.actorName ? ` · ${e.actorName}` : ''}
                    </p>
                    {e.note && <p className="mt-0.5 text-[11px] text-foreground/80">{e.note}</p>}
                  </li>
                ))}
              </ol>
            </section>

            <section className="space-y-2.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Radio className="size-3" /> Position reports ({s.pings.length})
              </h3>
              {s.pings.length === 0 ? (
                <p className="text-xs text-muted-foreground">No positions reported yet.</p>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {[...s.pings].reverse().slice(0, 6).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11px]">
                      <span className="font-mono text-foreground">{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</span>
                      <span className="text-muted-foreground">
                        {p.speedKmh !== null ? `${p.speedKmh} km/h · ` : ''}{p.source} · {timeAgo(p.recordedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {batch && (
              <section className="space-y-2.5">
                <h3 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Link2 className="size-3" /> Chain of custody · {batch.tagId}
                </h3>
                <div className="rounded-md border border-border">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs">
                    <span className="flex items-center gap-1.5 text-foreground"><Package className="size-3.5" /> Current stage</span>
                    <span className="font-medium text-foreground">{CUSTODY_STAGE_LABEL[batch.currentStage] ?? batch.currentStage}</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {[...batch.events]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((e) => (
                        <li key={e.id} className="px-3 py-1.5 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn('font-medium', e.flagged ? 'text-destructive' : 'text-foreground')}>
                              {CUSTODY_STAGE_LABEL[e.stage] ?? e.stage}
                            </span>
                            <span className="text-muted-foreground">{fmtTime(e.timestamp)}</span>
                          </div>
                          <p className="text-muted-foreground">{e.fromParty || '—'} → {e.toParty || '—'}</p>
                        </li>
                      ))}
                  </ul>
                </div>
              </section>
            )}

            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="size-3" /> Created {fmtTime(s.createdAt)}
              {s.deliveredAt && <> · delivered {fmtTime(s.deliveredAt)}</>}
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-1 truncate text-sm font-semibold', danger ? 'text-destructive' : 'text-foreground')}>{value}</p>
    </div>
  )
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border bg-background/40 p-2.5">
      <Icon className="size-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-xs font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

function ActionButton({
  icon: Icon, children, onClick, disabled, active, tone,
}: {
  icon: React.ElementType
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
  tone?: 'success'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors disabled:opacity-50',
        tone === 'success'
          ? 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20'
          : active
            ? 'border-primary/40 bg-primary/15 text-primary'
            : 'border-border bg-background/60 text-foreground hover:bg-secondary',
      )}
    >
      <Icon className="size-3.5" /> {children}
    </button>
  )
}

const inputClass = 'h-8 w-full rounded-md border border-border bg-background/60 px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary'

function DelayForm({ busy, onSubmit }: { busy: boolean; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState('')
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => { e.preventDefault(); if (note.trim()) onSubmit(note.trim()) }}
    >
      <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} className={inputClass}
        placeholder="Reason, e.g. border queue at Rusumo" />
      <button type="submit" disabled={busy || !note.trim()}
        className="h-8 shrink-0 rounded-md bg-destructive px-3 text-xs font-medium text-white disabled:opacity-50">
        Report
      </button>
    </form>
  )
}

function PingForm({
  busy, start, onSubmit,
}: {
  busy: boolean
  start: { lat: number; lng: number }
  onSubmit: (ping: { lat: number; lng: number; speed_kmh?: number }) => void
}) {
  const [lat, setLat] = useState(start.lat.toFixed(5))
  const [lng, setLng] = useState(start.lng.toFixed(5))
  const [speed, setSpeed] = useState('')
  const valid = lat !== '' && lng !== '' && !isNaN(Number(lat)) && !isNaN(Number(lng))
  return (
    <form
      className="space-y-2 rounded-md border border-border bg-background/40 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSubmit({ lat: Number(lat), lng: Number(lng), speed_kmh: speed ? Number(speed) : undefined })
      }}
    >
      <p className="text-[11px] text-muted-foreground">
        Manual check-in (e.g. driver called in). Tracker devices post to the same endpoint automatically.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1 text-[11px]">
          <span className="text-muted-foreground">Latitude</span>
          <input value={lat} onChange={(e) => setLat(e.target.value)} className={inputClass} inputMode="decimal" />
        </label>
        <label className="space-y-1 text-[11px]">
          <span className="text-muted-foreground">Longitude</span>
          <input value={lng} onChange={(e) => setLng(e.target.value)} className={inputClass} inputMode="decimal" />
        </label>
        <label className="space-y-1 text-[11px]">
          <span className="text-muted-foreground">Speed km/h</span>
          <input value={speed} onChange={(e) => setSpeed(e.target.value)} className={inputClass} inputMode="decimal" placeholder="optional" />
        </label>
      </div>
      <button type="submit" disabled={busy || !valid}
        className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50">
        Save position
      </button>
    </form>
  )
}
