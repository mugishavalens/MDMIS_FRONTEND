import { TopBar } from '@/components/shell/topbar'
import { RoleGuard } from '@/components/shell/role-guard'
import { DroneSurveysView } from '@/components/drone/drone-surveys-view'

export default function DroneSurveysPage() {
  return (
    <>
      <TopBar title="Drone Surveys"
        subtitle="Upload a flight's photos and get a 3D block: bare ground, trees and boulders, and an orthophoto" />
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin md:p-6">
        <div className="mx-auto max-w-7xl">
          <RoleGuard permission="map.view">
            <DroneSurveysView />
          </RoleGuard>
        </div>
      </div>
    </>
  )
}
