import { TopBar } from '@/components/shell/topbar'
import { RoleGuard } from '@/components/shell/role-guard'
import { SensorsView } from '@/components/sensors/sensors-view'

export default function SensorsPage() {
  return (
    <>
      <TopBar title="Sensor Data"
        subtitle="Survey uploads, connected field sensors, live readings and automatic safety alerts" />
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin md:p-6">
        <div className="mx-auto max-w-7xl">
          <RoleGuard permission="sensors.view">
            <SensorsView />
          </RoleGuard>
        </div>
      </div>
    </>
  )
}
