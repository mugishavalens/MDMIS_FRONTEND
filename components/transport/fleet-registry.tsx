'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusPill } from '@/components/shell/status-pill'
import { ApiError } from '@/lib/api'
import {
  createDriver, createVehicle, updateDriver, updateVehicle, VEHICLE_TYPE_OPTIONS,
  type Driver, type DriverStatus, type Vehicle, type VehicleStatus, type VehicleType,
} from '@/lib/api/fleet'
import { fmtNumber } from '@/lib/mdmis-data'
import { cn } from '@/lib/utils'

const inputClass = 'h-8 w-full rounded-md border border-border bg-background/60 px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary'
const thClass = 'px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground'
const tdClass = 'px-3 py-2.5 text-xs'

function vehicleTone(v: Vehicle) {
  if (v.currentShipmentId) return { tone: 'info' as const, label: 'On trip' }
  if (v.status === 'available') return { tone: 'success' as const, label: 'Available' }
  if (v.status === 'maintenance') return { tone: 'warning' as const, label: 'Maintenance' }
  return { tone: 'neutral' as const, label: 'Retired' }
}

function driverTone(d: Driver) {
  if (d.currentShipmentId) return { tone: 'info' as const, label: 'On trip' }
  if (d.status === 'active') return { tone: 'success' as const, label: 'Available' }
  return { tone: 'neutral' as const, label: 'Inactive' }
}

function ShipmentLink({ id, reference, onOpen }: { id: string | null; reference: string | null; onOpen: (id: string) => void }) {
  if (!id) return <span className="text-muted-foreground">—</span>
  return (
    <button type="button" onClick={() => onOpen(id)} className="font-mono text-primary hover:underline">
      {reference}
    </button>
  )
}

export function VehiclesPanel({
  vehicles, canEdit, onChanged, onOpenShipment,
}: {
  vehicles: Vehicle[]
  canEdit: boolean
  onChanged: () => void
  onOpenShipment: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', plate: '', type: 'truck' as VehicleType, capacity: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function act(fn: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await fn()
      onChanged()
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.plate.trim()) { setError('Name and plate are required.'); return }
    const ok = await act(() => createVehicle({
      name: form.name.trim(), plate: form.plate.trim(), vehicle_type: form.type, capacity_kg: Number(form.capacity) || 0,
    }))
    if (ok) { setForm({ name: '', plate: '', type: 'truck', capacity: '' }); setAdding(false) }
  }

  const onTrip = vehicles.filter((v) => v.currentShipmentId).length
  const available = vehicles.filter((v) => v.status === 'available' && !v.currentShipmentId).length

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {vehicles.length} vehicles · <span className="text-foreground">{available} available</span> · {onTrip} on trip
          </p>
          {canEdit && !adding && (
            <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="size-3.5" /> Add vehicle
            </button>
          )}
        </div>

        {adding && (
          <form onSubmit={add} className="grid grid-cols-2 gap-2 rounded-md border border-border bg-background/40 p-3 sm:grid-cols-5">
            <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Name, e.g. Truck-40" />
            <input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} className={inputClass} placeholder="Plate, e.g. RAF 123 A" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as VehicleType })} className={cn(inputClass, 'capitalize')}>
              {VEHICLE_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} inputMode="decimal" className={inputClass} placeholder="Capacity kg" />
            <div className="col-span-2 flex gap-2 sm:col-span-1">
              <button type="submit" disabled={busy} className="h-8 flex-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50">Save</button>
              <button type="button" onClick={() => { setAdding(false); setError('') }} className="h-8 rounded-md border border-border px-2 text-xs hover:bg-secondary">Cancel</button>
            </div>
          </form>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="border-b border-border">
              <tr>
                <th className={thClass}>Vehicle</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Capacity</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Current trip</th>
                {canEdit && <th className={thClass}>Set status</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vehicles.map((v) => {
                const t = vehicleTone(v)
                return (
                  <tr key={v.id}>
                    <td className={tdClass}>
                      <p className="font-medium text-foreground">{v.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{v.plate}</p>
                    </td>
                    <td className={cn(tdClass, 'capitalize text-muted-foreground')}>{v.vehicleType}</td>
                    <td className={cn(tdClass, 'text-muted-foreground')}>{v.capacityKg ? `${fmtNumber(v.capacityKg)} kg` : '—'}</td>
                    <td className={tdClass}><StatusPill tone={t.tone}>{t.label}</StatusPill></td>
                    <td className={tdClass}><ShipmentLink id={v.currentShipmentId} reference={v.currentShipmentRef} onOpen={onOpenShipment} /></td>
                    {canEdit && (
                      <td className={tdClass}>
                        <select
                          value={v.status}
                          disabled={busy || !!v.currentShipmentId}
                          title={v.currentShipmentId ? 'On a trip — status changes after delivery' : undefined}
                          onChange={(e) => act(() => updateVehicle(v.id, { status: e.target.value as VehicleStatus }))}
                          className={cn(inputClass, 'w-32 disabled:opacity-50')}
                        >
                          <option value="available">Available</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="retired">Retired</option>
                        </select>
                      </td>
                    )}
                  </tr>
                )
              })}
              {vehicles.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">No vehicles registered yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function DriversPanel({
  drivers, canEdit, onChanged, onOpenShipment,
}: {
  drivers: Driver[]
  canEdit: boolean
  onChanged: () => void
  onOpenShipment: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', license: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function act(fn: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await fn()
      onChanged()
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    const ok = await act(() => createDriver({ full_name: form.name.trim(), phone: form.phone.trim(), license_no: form.license.trim() }))
    if (ok) { setForm({ name: '', phone: '', license: '' }); setAdding(false) }
  }

  const onTrip = drivers.filter((d) => d.currentShipmentId).length

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{drivers.length} drivers · {onTrip} on trip</p>
          {canEdit && !adding && (
            <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="size-3.5" /> Add driver
            </button>
          )}
        </div>

        {adding && (
          <form onSubmit={add} className="grid grid-cols-2 gap-2 rounded-md border border-border bg-background/40 p-3 sm:grid-cols-4">
            <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Full name" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="Phone" />
            <input value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} className={inputClass} placeholder="Licence no." />
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="h-8 flex-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50">Save</button>
              <button type="button" onClick={() => { setAdding(false); setError('') }} className="h-8 rounded-md border border-border px-2 text-xs hover:bg-secondary">Cancel</button>
            </div>
          </form>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="border-b border-border">
              <tr>
                <th className={thClass}>Driver</th>
                <th className={thClass}>Phone</th>
                <th className={thClass}>Licence</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Current trip</th>
                {canEdit && <th className={thClass}>Set status</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {drivers.map((d) => {
                const t = driverTone(d)
                return (
                  <tr key={d.id}>
                    <td className={cn(tdClass, 'font-medium text-foreground')}>{d.fullName}</td>
                    <td className={cn(tdClass, 'text-muted-foreground')}>{d.phone || '—'}</td>
                    <td className={cn(tdClass, 'font-mono text-muted-foreground')}>{d.licenseNo || '—'}</td>
                    <td className={tdClass}><StatusPill tone={t.tone}>{t.label}</StatusPill></td>
                    <td className={tdClass}><ShipmentLink id={d.currentShipmentId} reference={d.currentShipmentRef} onOpen={onOpenShipment} /></td>
                    {canEdit && (
                      <td className={tdClass}>
                        <select
                          value={d.status}
                          disabled={busy || !!d.currentShipmentId}
                          title={d.currentShipmentId ? 'On a trip — status changes after delivery' : undefined}
                          onChange={(e) => act(() => updateDriver(d.id, { status: e.target.value as DriverStatus }))}
                          className={cn(inputClass, 'w-28 disabled:opacity-50')}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                    )}
                  </tr>
                )
              })}
              {drivers.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">No drivers registered yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
