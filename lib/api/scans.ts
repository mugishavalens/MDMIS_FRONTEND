import { apiFetch } from '@/lib/api'

// Backend stores the raw sensor types used, not a single display label —
// this maps each one to the method label the old mock data showed.
export const SENSOR_METHOD_LABEL: Record<string, string> = {
  hyperspectral: 'Drone Hyperspectral',
  gpr: 'Ground Penetrating Radar',
  em: 'Electromagnetic',
  magnetometer: 'Magnetometer',
  gamma: 'Gamma Spectrometry',
  satellite: 'Satellite Multispectral',
  lab: 'Lab Analysis',
}

export function methodLabel(sensorTypes: string[]): string {
  if (sensorTypes.length === 0) return 'Unknown'
  return SENSOR_METHOD_LABEL[sensorTypes[0]] ?? sensorTypes[0]
}

export interface ConfidenceAlternative {
  mineral: string
  probability: number
}

export interface MineralZone {
  id: string
  scanSessionId: string
  mineral: string
  confidence: number
  alternatives: ConfidenceAlternative[]
  gradePct: number | null
  areaHa: number | null
  estimatedDepthM: number | null
  estimatedTonnage: number | null
  status: string
  flaggedAnomaly: boolean
  created_at: string
}

export interface ScanSession {
  id: string
  siteId: string
  operatorId: string | null
  operatorName: string | null
  sensorTypes: string[]
  status: string
  uploaded_at: string
  processed_at: string | null
  zones: MineralZone[]
}

export function fetchScanSessions(): Promise<ScanSession[]> {
  return apiFetch<ScanSession[]>('/scans/')
}

// Matches backend SENSOR_CHOICES / MINERAL_CHOICES (app/scans/models.py,
// app/sites/models.py) — kept here rather than fetched so the "New Scan"
// form always has options even before anything else has loaded.
export const SENSOR_TYPE_OPTIONS = ['hyperspectral', 'gpr', 'em', 'magnetometer', 'gamma', 'satellite', 'lab']
export const MINERAL_OPTIONS = [
  'cassiterite', 'coltan', 'wolframite', 'gold', 'beryl', 'lithium', 'cobalt', 'copper', 'gemstone', 'unknown',
]

export function createScanSession(payload: {
  site_id: string
  sensor_types: string[]
  status?: string
}): Promise<ScanSession> {
  return apiFetch<ScanSession>('/scans/', { method: 'POST', body: JSON.stringify(payload) })
}

export function createMineralZone(payload: {
  scan_session_id: string
  mineral_type: string
  confidence_score: number
  grade_pct?: number
  area_ha?: number
  flagged_anomaly?: boolean
}): Promise<MineralZone> {
  return apiFetch<MineralZone>('/mineral-zones/', { method: 'POST', body: JSON.stringify(payload) })
}

/** The zone this session's classification card should headline — the one the model is most confident about. */
export function primaryZone(session: ScanSession): MineralZone | null {
  if (session.zones.length === 0) return null
  return [...session.zones].sort((a, b) => b.confidence - a.confidence)[0]
}
