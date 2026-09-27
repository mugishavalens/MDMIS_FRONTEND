import { apiFetch } from '@/lib/api'
import type { DetectionSite, Mineral } from '@/lib/mdmis-data'

export interface Site extends DetectionSite {
  lastScanMethod: string
}

// Backend stores minerals lowercase ("cassiterite"); MINERAL_META and the
// map's colour tables are keyed by the capitalised Mineral names.
function toMineral(raw: string): Mineral {
  return (raw.charAt(0).toUpperCase() + raw.slice(1)) as Mineral
}

function toSite(raw: Site): Site {
  return {
    ...raw,
    primaryMineral: toMineral(raw.primaryMineral),
    secondaryMinerals: raw.secondaryMinerals.map(toMineral),
  }
}

export async function fetchSites(): Promise<Site[]> {
  const raw = await apiFetch<Site[]>('/sites/')
  return raw.map(toSite)
}

export async function fetchSite(id: string): Promise<Site> {
  return toSite(await apiFetch<Site>(`/sites/${id}`))
}
