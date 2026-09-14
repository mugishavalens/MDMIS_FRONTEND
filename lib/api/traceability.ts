import { apiFetch } from '@/lib/api'

// The real custody-event vocabulary (matches backend CUSTODY_EVENT_CHOICES),
// not the 6-stage vocabulary the old mock data invented. "rejection" is a
// terminal exception branch, not a position in the linear happy-path order.
export const CUSTODY_STAGE_ORDER = [
  'extraction', 'weigh_in', 'storage_in', 'dispatch', 'waypoint', 'receipt', 'processing', 'export',
] as const
export type CustodyStage = (typeof CUSTODY_STAGE_ORDER)[number] | 'rejection'

export const CUSTODY_STAGE_LABEL: Record<CustodyStage, string> = {
  extraction: 'Extraction',
  weigh_in: 'Weigh-In',
  storage_in: 'Storage',
  dispatch: 'Dispatch',
  waypoint: 'Waypoint',
  receipt: 'Receipt',
  processing: 'Processing',
  export: 'Export',
  rejection: 'Rejected',
}

export interface CustodyEvent {
  id: string
  batchId: string
  stage: CustodyStage
  fromParty: string
  toParty: string
  gpsLat: number | null
  gpsLng: number | null
  quantityKg: number
  timestamp: string
  notes: string
  flagged: boolean
}

export interface Batch {
  id: string
  tagId: string
  siteId: string
  mineral: string
  weightKg: number
  gradeDetected: number | null
  gradeConfirmed: number | null
  status: string
  compliant: boolean
  complianceNote: string
  currentStage: CustodyStage
  events: CustodyEvent[]
}

export function fetchBatches(): Promise<Batch[]> {
  return apiFetch<Batch[]>('/traceability/')
}

export function createCustodyEvent(payload: {
  batch_id: string
  event_type: CustodyStage
  from_party?: string
  to_party?: string
  quantity_kg?: number
  notes?: string
  flagged?: boolean
}): Promise<CustodyEvent> {
  return apiFetch<CustodyEvent>('/custody-events/', { method: 'POST', body: JSON.stringify(payload) })
}
