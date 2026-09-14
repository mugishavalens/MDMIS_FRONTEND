import { apiFetch } from '@/lib/api'

export const INCIDENT_TYPE_LABEL: Record<string, string> = {
  gas_threshold: 'Gas Threshold',
  structural_instability: 'Structural Instability',
  slope_failure: 'Slope Failure',
  equipment: 'Equipment',
  proximity_breach: 'Proximity Breach',
  environmental: 'Environmental',
  other: 'Other',
}

export type IncidentStatus = 'open' | 'acknowledged' | 'resolved' | 'escalated'

export interface SafetyIncident {
  id: string
  siteId: string
  zoneId: string | null
  incidentType: string
  riskScore: number
  sensorReadings: Record<string, unknown>
  gpsLat: number | null
  gpsLng: number | null
  reportedById: string | null
  reportedByName: string | null
  acknowledgedById: string | null
  acknowledgedByName: string | null
  acknowledgedAt: string | null
  status: IncidentStatus
  description: string
  created_at: string
}

export function fetchSafetyIncidents(): Promise<SafetyIncident[]> {
  return apiFetch<SafetyIncident[]>('/safety/')
}

export function acknowledgeSafetyIncident(id: string): Promise<SafetyIncident> {
  return apiFetch<SafetyIncident>(`/safety/${id}/acknowledge`, { method: 'POST' })
}
