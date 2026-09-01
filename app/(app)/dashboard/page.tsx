import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { TopBar } from '@/components/shell/topbar'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { DetectionCharts } from '@/components/dashboard/detection-charts'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { RoleDashboard } from '@/components/dashboard/role-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusPill } from '@/components/shell/status-pill'
import { SITES, RISK_META } from '@/lib/mdmis-data'

export default function DashboardPage() {
  const priority = [...SITES]
    .filter((s) => s.riskLevel === 'critical' || s.riskLevel === 'high' || s.status === 'flagged')
    .sort((a, b) => a.safetyScore - b.safetyScore)

  return (
    <>
      <TopBar title="Mining Intelligence Overview"
        subtitle="Real-time detection, classification and supply-chain status · Kigali operations center" />
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Role-specific welcome banner */}
          <RoleDashboard />

          <KpiCards />
          <DetectionCharts />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <ActivityFeed />
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Priority sites requiring review</CardTitle>
                <Link href="/map" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  Open map <ArrowUpRight className="size-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {priority.map((s) => (
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
          </div>
        </div>
      </div>
    </>
  )
}
