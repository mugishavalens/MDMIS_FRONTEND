import { apiFetch } from '@/lib/api'
import type { Shipment } from '@/lib/mdmis-data'

// Backend mineral values are lowercase (e.g. "cassiterite") and not
// restricted to the frontend's known Mineral union, so this field is
// widened to `string` here — components doing a MINERAL_META lookup on it
// need a fallback for anything outside that union.
export type TransportShipment = Omit<Shipment, 'mineral'> & { mineral: string }

interface RawShipment {
  id: string
  lotId: string | null
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
}

function toShipment(raw: RawShipment): TransportShipment {
  return {
    id: raw.id,
    lotId: raw.lotId ?? '',
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
  }
}

export async function fetchShipments(): Promise<TransportShipment[]> {
  const raw = await apiFetch<RawShipment[]>('/transport/')
  return raw.map(toShipment)
}
