'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusPill } from '@/components/shell/status-pill'
import { RISK_META } from '@/lib/mdmis-data'
import { fetchSites, type Site } from '@/lib/api/sites'

export function PrioritySites() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchSites()
      .then((data) => { if (!cancelled) setSites(data) })
      .catch((err) => console.error('[MDMIS] Failed to load sites:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const priority = [...sites]
    .filter((s) => s.riskLevel === 'critical' || s.riskLevel === 'high' || s.status === 'flagged')
    .sort((a, b) => a.safetyScore - b.safetyScore)

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Priority sites requiring review</CardTitle>
        <Link href="/map" className="flex items-center gap-1 text-xs text-primary hover:underline">
          Open map <ArrowUpRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
        ) : priority.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No sites need review right now.</p>
        ) : priority.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{s.id} · safety {s.safetyScore}/100</p>
            </div>
            <StatusPill tone={s.riskLevel === 'critical' ? 'danger' : 'warning'}>
              {RISK_META[s.riskLevel].label}
            </StatusPill>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
