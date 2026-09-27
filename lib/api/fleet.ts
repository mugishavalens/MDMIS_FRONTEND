import { apiFetch } from '@/lib/api'

export type VehicleType = 'truck' | 'pickup' | 'trailer' | 'van' | 'other'
export type VehicleStatus = 'available' | 'maintenance' | 'retired'
export type DriverStatus = 'active' | 'inactive'

export const VEHICLE_TYPE_OPTIONS: VehicleType[] = ['truck', 'pickup', 'trailer', 'van', 'other']

export interface Vehicle {
  id: string
  name: string
  plate: string
  vehicleType: VehicleType
  capacityKg: number
  status: VehicleStatus
  currentShipmentId: string | null
  currentShipmentRef: string | null
}

export interface Driver {
  id: string
  fullName: string
  phone: string
  licenseNo: string
  status: DriverStatus
  currentShipmentId: string | null
  currentShipmentRef: string | null
}

export function fetchVehicles(): Promise<Vehicle[]> {
  return apiFetch<Vehicle[]>('/vehicles/')
}

export function createVehicle(payload: {
  name: string
  plate: string
  vehicle_type: VehicleType
  capacity_kg: number
}): Promise<Vehicle> {
  return apiFetch<Vehicle>('/vehicles/', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateVehicle(id: string, payload: { status?: VehicleStatus }): Promise<Vehicle> {
  return apiFetch<Vehicle>(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function fetchDrivers(): Promise<Driver[]> {
  return apiFetch<Driver[]>('/drivers/')
}

export function createDriver(payload: { full_name: string; phone: string; license_no: string }): Promise<Driver> {
  return apiFetch<Driver>('/drivers/', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateDriver(id: string, payload: { status?: DriverStatus }): Promise<Driver> {
  return apiFetch<Driver>(`/drivers/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}
