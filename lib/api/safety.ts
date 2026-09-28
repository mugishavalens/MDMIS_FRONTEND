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
  resolvedById: string | null
  resolvedByName: string | null
  resolvedAt: string | null
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

export interface IncidentEvent {
  id: string
  eventType: 'reported' | 'acknowledged' | 'escalated' | 'resolved' | 'reopened' | 'note'
  note: string
  actorName: string
  createdAt: string
}

export type SafetyIncidentDetail = SafetyIncident & { events: IncidentEvent[] }

export function fetchSafetyIncident(id: string): Promise<SafetyIncidentDetail> {
  return apiFetch<SafetyIncidentDetail>(`/safety/${id}`)
}

/** status 'open' on a resolved incident reopens it. Escalate/resolve/reopen require a note. */
export function changeIncidentStatus(
  id: string,
  status: 'acknowledged' | 'escalated' | 'resolved' | 'open',
  note = '',
): Promise<SafetyIncident> {
  return apiFetch<SafetyIncident>(`/safety/${id}/status`, { method: 'POST', body: JSON.stringify({ status, note }) })
}

export function addIncidentNote(id: string, note: string): Promise<IncidentEvent> {
  return apiFetch<IncidentEvent>(`/safety/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) })
}
