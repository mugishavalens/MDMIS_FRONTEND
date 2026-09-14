'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchDashboardSummary, type DashboardSummary } from '@/lib/api/dashboard'

interface DashboardSummaryContextValue {
  summary: DashboardSummary | null
  loading: boolean
}

const DashboardSummaryContext = createContext<DashboardSummaryContextValue>({ summary: null, loading: true })

/**
 * Fetches /api/dashboard/summary exactly once and shares it — that endpoint
 * runs ~15 queries (site/batch aggregates, two GROUP BYs, a 5-domain recent-
 * activity merge), so having KpiCards/DetectionCharts/ActivityFeed each
 * fetch it independently was tripling real backend load on every dashboard
 * load for identical data.
 */
export function DashboardSummaryProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchDashboardSummary()
      .then((data) => { if (!cancelled) setSummary(data) })
      .catch((err) => console.error('[MDMIS] Failed to load dashboard summary:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <DashboardSummaryContext.Provider value={{ summary, loading }}>
      {children}
    </DashboardSummaryContext.Provider>
  )
}

export function useDashboardSummary() {
  return useContext(DashboardSummaryContext)
}
