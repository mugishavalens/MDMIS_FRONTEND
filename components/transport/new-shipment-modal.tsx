'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api'
import { fetchDrivers, fetchVehicles, type Driver, type Vehicle } from '@/lib/api/fleet'
import { MINERAL_OPTIONS } from '@/lib/api/scans'
import { fetchSites, type Site } from '@/lib/api/sites'
import { fetchBatches, type Batch } from '@/lib/api/traceability'
import { createShipment, TRANSPORT_HUBS, type TransportShipment } from '@/lib/api/transport'
import { fmtNumber } from '@/lib/mdmis-data'
import { cn } from '@/lib/utils'

interface Place { name: string; lat: number; lng: number }

const CUSTOM = '__custom__'
const inputClass = 'h-8 w-full rounded-md border border-border bg-background/60 px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary'

export function NewShipmentModal({
  shipments,
  onClose,
  onCreated,
}: {
  shipments: TransportShipment[]
  onClose: () => void
  onCreated: (s: TransportShipment) => void
}) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])

  const [batchId, setBatchId] = useState('')
  const [mineral, setMineral] = useState(MINERAL_OPTIONS[0])
  const [weight, setWeight] = useState('')
  const [originKey, setOriginKey] = useState('')
  const [destKey, setDestKey] = useState<string>(TRANSPORT_HUBS[1].name)
  const [custom, setCustom] = useState({ name: '', lat: '', lng: '' })
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [eta, setEta] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchBatches(), fetchSites(), fetchVehicles(), fetchDrivers()])
      .then(([b, st, v, d]) => { setBatches(b); setSites(st); setVehicles(v); setDrivers(d) })
      .catch(() => setError('Failed to load batches, sites or fleet.'))
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const places: Place[] = useMemo(
    () => [...TRANSPORT_HUBS, ...sites.map((s) => ({ name: s.name, lat: s.lat, lng: s.lng }))],
    [sites],
  )

  // A batch can only ride one active shipment; exported/rejected lots don't ship.
  const shippableBatches = useMemo(() => {
    const onRoad = new Set(shipments.filter((s) => s.status !== 'delivered').map((s) => s.lotId))
    return batches.filter((b) => !onRoad.has(b.id) && b.currentStage !== 'export' && b.currentStage !== 'rejection')
  }, [batches, shipments])

  const batch = batches.find((b) => b.id === batchId) ?? null
  const batchSite = batch ? sites.find((s) => s.id === batch.siteId) : undefined
  const loadKg = batch ? batch.weightKg : Number(weight) || 0

  const freeVehicles = vehicles.filter((v) => v.status === 'available' && !v.currentShipmentId)
  const freeDrivers = drivers.filter((d) => d.status === 'active' && !d.currentShipmentId)
  const vehicle = vehicles.find((v) => v.id === vehicleId)
  const overCapacity = !!vehicle && vehicle.capacityKg > 0 && loadKg > vehicle.capacityKg

  function resolvePlace(key: string): Place | null {
    if (key === CUSTOM) {
      const lat = Number(custom.lat)
      const lng = Number(custom.lng)
      if (!custom.name.trim() || custom.lat === '' || custom.lng === '' || isNaN(lat) || isNaN(lng)) return null
      return { name: custom.name.trim(), lat, lng }
    }
    return places.find((p) => p.name === key) ?? null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const dest = resolvePlace(destKey)
    if (!dest) { setError('Choose a destination (custom destinations need a name, latitude and longitude).'); return }
    const origin = batch ? null : resolvePlace(originKey)
    if (!batch && !origin) { setError('Choose an origin, or pick a batch to ship from its site.'); return }
    if (origin && origin.name === dest.name) { setError('Origin and destination must differ.'); return }
    if (overCapacity) { setError(`${vehicle!.name} can carry at most ${fmtNumber(vehicle!.capacityKg)} kg.`); return }

    setSubmitting(true)
    setError('')
    try {
      const created = await createShipment({
        batch_id: batch?.id,
        vehicle_id: vehicleId || undefined,
        driver_id: driverId || undefined,
        mineral_type: batch ? undefined : mineral,
        weight_kg: batch ? undefined : loadKg,
        origin_name: origin?.name,
        origin_lat: origin?.lat,
        origin_lng: origin?.lng,
        destination_name: dest.name,
        destination_lat: dest.lat,
        destination_lng: dest.lng,
        eta_hours: eta ? Number(eta) : undefined,
        note: note.trim() || undefined,
      })
      onCreated(created)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create shipment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <Card
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-border bg-card shadow-2xl scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="relative">
          <button type="button" onClick={onClose} aria-label="Close"
            className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <X className="size-4" />
          </button>
          <CardTitle className="text-sm">New shipment</CardTitle>
          <CardDescription>
            Ship a traced batch (its mineral, weight and origin site fill in automatically) or an untracked load.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Field label="Mineral batch">
              <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={inputClass}>
                <option value="">No batch — untracked load</option>
                {shippableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.tagId} · {b.mineral} · {fmtNumber(b.weightKg)} kg
                  </option>
                ))}
              </select>
            </Field>

            {batch ? (
              <p className="rounded-md border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                Origin <span className="text-foreground">{batchSite?.name ?? batch.siteId}</span> · load{' '}
                <span className="text-foreground">{fmtNumber(batch.weightKg)} kg</span> of{' '}
                <span className="capitalize text-foreground">{batch.mineral}</span>
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mineral">
                  <select value={mineral} onChange={(e) => setMineral(e.target.value)} className={cn(inputClass, 'capitalize')}>
                    {MINERAL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Weight (kg)">
                  <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className={inputClass} placeholder="e.g. 1200" />
                </Field>
                <Field label="Origin" className="col-span-2">
                  <select value={originKey} onChange={(e) => setOriginKey(e.target.value)} className={inputClass}>
                    <option value="">Select origin…</option>
                    <PlaceOptions places={places} />
                  </select>
                </Field>
              </div>
            )}

            <Field label="Destination">
              <select value={destKey} onChange={(e) => setDestKey(e.target.value)} className={inputClass}>
                <PlaceOptions places={places} />
                <option value={CUSTOM}>Custom location…</option>
              </select>
            </Field>
            {destKey === CUSTOM && (
              <div className="grid grid-cols-3 gap-2">
                <input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} className={inputClass} placeholder="Name" />
                <input value={custom.lat} onChange={(e) => setCustom({ ...custom, lat: e.target.value })} className={inputClass} placeholder="Latitude" inputMode="decimal" />
                <input value={custom.lng} onChange={(e) => setCustom({ ...custom, lng: e.target.value })} className={inputClass} placeholder="Longitude" inputMode="decimal" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Vehicle">
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={inputClass}>
                  <option value="">Assign later</option>
                  {freeVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} · {v.plate}{v.capacityKg ? ` · ${fmtNumber(v.capacityKg)} kg` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Driver">
                <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={inputClass}>
                  <option value="">Assign later</option>
                  {freeDrivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                </select>
              </Field>
            </div>
            {overCapacity && (
              <p className="text-[11px] text-destructive">
                {fmtNumber(loadKg)} kg exceeds {vehicle!.name}&apos;s {fmtNumber(vehicle!.capacityKg)} kg capacity.
              </p>
            )}
            {vehicles.length > 0 && freeVehicles.length === 0 && (
              <p className="text-[11px] text-muted-foreground">Every vehicle is on a trip or in maintenance.</p>
            )}

            <div className="grid grid-cols-[1fr_2fr] gap-3">
              <Field label="ETA (hours)">
                <input value={eta} onChange={(e) => setEta(e.target.value)} inputMode="decimal" className={inputClass} placeholder="optional" />
              </Field>
              <Field label="Note">
                <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="optional" />
              </Field>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="h-8 rounded-md border border-border px-3 text-xs text-foreground hover:bg-secondary">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50">
                {submitting ? 'Creating…' : 'Create shipment'}
              </button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('block space-y-1 text-xs', className)}>
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function PlaceOptions({ places }: { places: Place[] }) {
  return (
    <>
      <optgroup label="Hubs & ports">
        {places.slice(0, TRANSPORT_HUBS.length).map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
      </optgroup>
      <optgroup label="Mine sites">
        {places.slice(TRANSPORT_HUBS.length).map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
      </optgroup>
    </>
  )
}
