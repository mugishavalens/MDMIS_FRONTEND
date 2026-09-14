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

export interface DashboardSummary {
  activeSites: number
  totalSites: number
  flaggedSites: number
  scansToday: number
  avgConfidence: number
  estimatedReserveTonnes: number
  compliantLotsPct: number
  monthlyTrend: MonthlyTrendPoint[]
  mineralDistribution: MineralDistributionPoint[]
  activity: ActivityItem[]
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/dashboard/summary')
}
