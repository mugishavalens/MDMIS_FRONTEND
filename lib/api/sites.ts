import { apiFetch } from '@/lib/api'
import type { DetectionSite } from '@/lib/mdmis-data'

export interface Site extends DetectionSite {
  lastScanMethod: string
}

export function fetchSites(): Promise<Site[]> {
  return apiFetch<Site[]>('/sites/')
}

export function fetchSite(id: string): Promise<Site> {
  return apiFetch<Site>(`/sites/${id}`)
}
