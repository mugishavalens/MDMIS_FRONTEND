import { TopBar } from '@/components/shell/topbar'
import { SafetyView } from '@/components/safety/safety-view'
import { RoleGuard } from '@/components/shell/role-guard'

export default function SafetyPage() {
  return (
    <>
      <TopBar title="Safety Incidents"
        subtitle="Sensor-triggered safety alerts across active sites — gas thresholds, structural instability, slope failure and more" />
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin md:p-6">
        <div className="mx-auto max-w-7xl">
          <RoleGuard permission="safety.view">
            <SafetyView />
          </RoleGuard>
        </div>
      </div>
    </>
  )
}
