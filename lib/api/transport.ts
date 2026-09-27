import { apiFetch } from '@/lib/api'
import type { Shipment } from '@/lib/mdmis-data'

// Backend mineral values are lowercase (e.g. "cassiterite") and not
// restricted to the frontend's known Mineral union, so this field is
// widened to `string` here — components doing a MINERAL_META lookup on it
// need a fallback for anything outside that union.
export type TransportShipment = Omit<Shipment, 'mineral'> & {
  mineral: string
  reference: string
  batchCode: string | null
  vehicleId: string | null
  driverId: string | null
  lastPing: { lat: number; lng: number; at: string } | null
  signalAgeMinutes: number | null
  departedAt: string | null
  deliveredAt: string | null
  createdAt: string
}

export type ShipmentStatus = Shipment['status']

export interface ShipmentPing {
  id: string
  lat: number
  lng: number
  speedKmh: number | null
  source: 'device' | 'manual'
  recordedAt: string
}

export interface ShipmentTimelineEvent {
  id: string
  eventType: 'created' | 'departed' | 'delayed' | 'resumed' | 'delivered' | 'note'
  note: string
  actorName: string
  createdAt: string
}

export type ShipmentDetail = TransportShipment & {
  pings: ShipmentPing[]
  events: ShipmentTimelineEvent[]
}

interface RawShipment {
  id: string
  reference: string
  lotId: string | null
  batchCode: string | null
  vehicleId: string | null
  driverId: string | null
  mineral: string
  originName: string
  originLat: number
  originLng: number
  destinationName: string
  destinationLat: number
  destinationLng: number
  driver: string
  vehicle: string
  status: Shipment['status']
  progress: number
  etaHours: number
  weightKg: number
  gpsIntegrity: boolean
  lastPing: { lat: number; lng: number; at: string } | null
  signalAgeMinutes: number | null
  departedAt: string | null
  deliveredAt: string | null
  created_at: string
}

function toShipment(raw: RawShipment): TransportShipment {
  return {
    id: raw.id,
    reference: raw.reference,
    lotId: raw.lotId ?? '',
    batchCode: raw.batchCode,
    vehicleId: raw.vehicleId,
    driverId: raw.driverId,
    mineral: raw.mineral ? raw.mineral.charAt(0).toUpperCase() + raw.mineral.slice(1) : 'Unknown',
    origin: { name: raw.originName, lat: raw.originLat, lng: raw.originLng },
    destination: { name: raw.destinationName, lat: raw.destinationLat, lng: raw.destinationLng },
    driver: raw.driver,
    vehicle: raw.vehicle,
    status: raw.status,
    progress: raw.progress,
    etaHours: raw.etaHours,
    weightKg: raw.weightKg,
    gpsIntegrity: raw.gpsIntegrity,
    lastPing: raw.lastPing,
    signalAgeMinutes: raw.signalAgeMinutes,
    departedAt: raw.departedAt,
    deliveredAt: raw.deliveredAt,
    createdAt: raw.created_at,
  }
}

export async function fetchShipments(): Promise<TransportShipment[]> {
  const raw = await apiFetch<RawShipment[]>('/transport/')
  return raw.map(toShipment)
}

export async function fetchShipment(id: string): Promise<ShipmentDetail> {
  const raw = await apiFetch<RawShipment & { pings: ShipmentPing[]; events: ShipmentTimelineEvent[] }>(
    `/transport/${id}`,
  )
  return { ...toShipment(raw), pings: raw.pings, events: raw.events }
}

export async function createShipment(payload: {
  batch_id?: string
  vehicle_id?: string
  driver_id?: string
  mineral_type?: string
  weight_kg?: number
  origin_name?: string
  origin_lat?: number
  origin_lng?: number
  destination_name: string
  destination_lat: number
  destination_lng: number
  eta_hours?: number
  note?: string
}): Promise<TransportShipment> {
  return toShipment(await apiFetch<RawShipment>('/transport/', { method: 'POST', body: JSON.stringify(payload) }))
}

export async function changeShipmentStatus(id: string, status: ShipmentStatus, note = ''): Promise<TransportShipment> {
  return toShipment(
    await apiFetch<RawShipment>(`/transport/${id}/status`, { method: 'POST', body: JSON.stringify({ status, note }) }),
  )
}

export async function recordShipmentPing(
  id: string,
  ping: { lat: number; lng: number; speed_kmh?: number },
): Promise<TransportShipment> {
  return toShipment(
    await apiFetch<RawShipment>(`/transport/${id}/pings`, { method: 'POST', body: JSON.stringify(ping) }),
  )
}

// Fixed logistics endpoints shipments commonly run to/from — matches the
// backend seed's hubs. Sites come from the API.
export const TRANSPORT_HUBS = [
  { name: 'Kigali Logistics Hub', lat: -1.9441, lng: 30.0619 },
  { name: 'Port of Mombasa', lat: -4.0435, lng: 39.6682 },
  { name: 'Port of Dar es Salaam', lat: -6.7924, lng: 39.2083 },
] as const
