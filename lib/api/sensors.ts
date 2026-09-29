import { API_URL, apiFetch } from '@/lib/api'

// ---- Sensor types ----------------------------------------------------------------

// Survey sensors (SRS 4.1.1) send files; gas/geotechnical devices send live readings.
export const FILE_SENSOR_TYPES = ['hyperspectral', 'gpr', 'em', 'magnetometer', 'gamma', 'satellite', 'lab'] as const
export const DEVICE_SENSOR_TYPES = [...FILE_SENSOR_TYPES, 'gas', 'geotechnical'] as const
export type DeviceSensorType = (typeof DEVICE_SENSOR_TYPES)[number]

export const SENSOR_LABEL: Record<DeviceSensorType, string> = {
  hyperspectral: 'Drone hyperspectral',
  gpr: 'Ground penetrating radar',
  em: 'Electromagnetic (EM)',
  magnetometer: 'Magnetometer',
  gamma: 'Gamma-ray spectrometer',
  satellite: 'Sentinel-2 satellite',
  lab: 'Lab spectrometer',
  gas: 'Gas monitor (live)',
  geotechnical: 'Slope / displacement (live)',
}

// Mirrors backend app/ingestion/validation.py SENSOR_FORMATS.
export const SENSOR_ACCEPT: Record<(typeof FILE_SENSOR_TYPES)[number], { hint: string; accept: string }> = {
  hyperspectral: { hint: 'HDF5 or GeoTIFF', accept: '.h5,.hdf5,.he5,.hdf,.tif,.tiff' },
  gpr: { hint: 'SEG-Y or binary (.dzt)', accept: '.sgy,.segy,.dzt,.rd3,.dt1,.bin' },
  em: { hint: 'CSV or binary', accept: '.csv,.txt,.xyz,.asc,.bin' },
  magnetometer: { hint: 'CSV / ASCII with lat & lon columns', accept: '.csv,.txt,.xyz,.asc' },
  gamma: { hint: 'CSV / ASCII with lat & lon columns', accept: '.csv,.txt,.xyz,.asc' },
  satellite: { hint: 'GeoTIFF (13 bands)', accept: '.tif,.tiff' },
  lab: { hint: 'CSV or JSON with lat & lon per sample', accept: '.csv,.txt,.json' },
}

export function isLiveSensor(t: string): boolean {
  return t === 'gas' || t === 'geotechnical'
}

// ---- Files -----------------------------------------------------------------------

export interface ValidationIssue {
  check: string
  message: string
  fix: string
}

export interface SensorFile {
  id: string
  siteId: string
  scanSessionId: string | null
  sensorType: string
  originalFilename: string
  fileKind: string | null
  sizeBytes: number
  sha256: string
  bbox: [number, number, number, number] | null
  metadata: Record<string, unknown>
  status: 'validated' | 'rejected'
  errors: ValidationIssue[]
  warnings: string[]
  uploadMethod: 'manual' | 'api'
  uploadedByName: string | null
  deviceId: string | null
  deviceName: string | null
  created_at: string
}

export function fetchSensorFiles(): Promise<SensorFile[]> {
  return apiFetch<SensorFile[]>('/sensor-files/')
}

export function uploadSensorFile(form: {
  file: File
  siteId: string
  sensorType: string
  bbox?: { minLat: number; minLng: number; maxLat: number; maxLng: number }
}): Promise<SensorFile> {
  const body = new FormData()
  body.append('file', form.file)
  body.append('site_id', form.siteId)
  body.append('sensor_type', form.sensorType)
  if (form.bbox) {
    body.append('min_lat', String(form.bbox.minLat))
    body.append('min_lng', String(form.bbox.minLng))
    body.append('max_lat', String(form.bbox.maxLat))
    body.append('max_lng', String(form.bbox.maxLng))
  }
  return apiFetch<SensorFile>('/sensor-files/', { method: 'POST', body })
}

/** Resolves a short-lived (15 min) download link for a stored file. */
export async function sensorFileDownloadUrl(id: string): Promise<string> {
  const d = await apiFetch<{ url: string; external: boolean }>(`/sensor-files/${id}/download-url`)
  return d.external ? d.url : `${API_URL}${d.url}`
}

// ---- Devices ---------------------------------------------------------------------

export interface SensorDevice {
  id: string
  siteId: string
  name: string
  sensorType: DeviceSensorType
  apiKeyPrefix: string
  isActive: boolean
  lastSeenAt: string | null
  lastValues: Record<string, number>
  online: boolean
  created_at: string
}

export type SensorDeviceWithKey = SensorDevice & { apiKey: string }

export function fetchDevices(): Promise<SensorDevice[]> {
  return apiFetch<SensorDevice[]>('/devices/')
}

export function fetchDeviceSummary(): Promise<{ total: number; active: number; online: number }> {
  return apiFetch('/devices/summary')
}

export function registerDevice(payload: { name: string; site_id: string; sensor_type: DeviceSensorType }): Promise<SensorDeviceWithKey> {
  return apiFetch<SensorDeviceWithKey>('/devices/', { method: 'POST', body: JSON.stringify(payload) })
}

export function setDeviceActive(id: string, isActive: boolean): Promise<SensorDevice> {
  return apiFetch<SensorDevice>(`/devices/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive }) })
}

export function rotateDeviceKey(id: string): Promise<SensorDeviceWithKey> {
  return apiFetch<SensorDeviceWithKey>(`/devices/${id}/rotate-key`, { method: 'POST' })
}

// ---- Readings --------------------------------------------------------------------

export interface SensorReading {
  id: string
  deviceId: string
  siteId: string
  sensorType: string
  recordedAt: string
  lat: number | null
  lng: number | null
  values: Record<string, number>
}

export function fetchReadings(deviceId: string, limit = 60): Promise<SensorReading[]> {
  return apiFetch<SensorReading[]>(`/sensor-readings/?device_id=${deviceId}&limit=${limit}`)
}

// ---- Safety threshold rules ------------------------------------------------------

export interface SafetyRule {
  id: string
  siteId: string | null
  metric: string
  comparator: 'gt' | 'lt'
  threshold: number
  incidentType: string
  riskScore: number
  enabled: boolean
}

export function fetchSafetyRules(): Promise<SafetyRule[]> {
  return apiFetch<SafetyRule[]>('/safety-rules/')
}

export function updateSafetyRule(
  id: string,
  patch: Partial<{ threshold: number; comparator: 'gt' | 'lt'; risk_score: number; enabled: boolean }>,
): Promise<SafetyRule> {
  return apiFetch<SafetyRule>(`/safety-rules/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

// ---- Metric display --------------------------------------------------------------

const METRIC_META: Record<string, { label: string; unit: string }> = {
  co_ppm: { label: 'CO', unit: 'ppm' },
  h2s_ppm: { label: 'H₂S', unit: 'ppm' },
  ch4_pct_lel: { label: 'CH₄', unit: '% LEL' },
  o2_pct: { label: 'O₂', unit: '%' },
  co2_ppm: { label: 'CO₂', unit: 'ppm' },
  slope_angle_deg: { label: 'Slope angle', unit: '°' },
  displacement_rate_mm_per_h: { label: 'Displacement', unit: 'mm/h' },
  pore_pressure_kpa: { label: 'Pore pressure', unit: 'kPa' },
}

export function metricMeta(key: string): { label: string; unit: string } {
  return METRIC_META[key] ?? { label: key.replace(/_/g, ' '), unit: '' }
}
