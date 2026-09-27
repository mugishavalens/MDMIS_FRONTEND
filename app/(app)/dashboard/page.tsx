import { TopBar } from '@/components/shell/topbar'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { DetectionCharts } from '@/components/dashboard/detection-charts'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { RoleDashboard } from '@/components/dashboard/role-dashboard'
import { PrioritySites } from '@/components/dashboard/priority-sites'
import { DashboardSummaryProvider } from '@/lib/dashboard-context'

export default function DashboardPage() {
  return (
    <>
      <TopBar title="Mining Intelligence Overview"
        subtitle="Real-time detection, classification and supply-chain status · Kigali operations center" />
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Role-specific welcome banner */}
          <RoleDashboard />

          <DashboardSummaryProvider>
            <KpiCards />
            <DetectionCharts />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
              <ActivityFeed />
              <PrioritySites />
            </div>
          </DashboardSummaryProvider>
        </div>
      </div>
    </>
  )
}
