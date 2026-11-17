import { apiFetch } from '@/lib/api'

export interface MonthlyTrendPoint {
  month: string
  detections: number
  confidence: number
}

export interface MineralDistributionPoint {
  mineral: string
  detections: number
}

export interface ActivityItem {
  id: string
  kind: 'scan' | 'alert' | 'shipment' | 'compliance' | 'trace'
  title: string
  detail: string
  timestamp: string
}

export interface KpiTrends {
  sitesAdded30d: number
  scansLast7d: number
  scansPrev7d: number
  zonesDetected30d: number
  nonCompliantLots: number
}

export interface DashboardSummary {
  activeSites: number
  totalSites: number
  flaggedSites: number
  scansToday: number
  avgConfidence: number
  estimatedReserveTonnes: number
  compliantLotsPct: number
  trends: KpiTrends
  monthlyTrend: MonthlyTrendPoint[]
  mineralDistribution: MineralDistributionPoint[]
  activity: ActivityItem[]
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/dashboard/summary')
}

// Platform-wide totals for the public landing page (no sign-in needed).
export interface PublicStats {
  activeSites: number
  totalSites: number
  districtsCovered: number
  avgConfidence: number
  estimatedReserveTonnes: number
  compliantLotsPct: number
}

export function fetchPublicStats(): Promise<PublicStats> {
  return apiFetch<PublicStats>('/dashboard/public-stats', {}, { auth: false })
}
