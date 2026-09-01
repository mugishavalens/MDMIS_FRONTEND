import { TopBar } from '@/components/shell/topbar'
import { ScansView } from '@/components/scans/scans-view'
import { RoleGuard } from '@/components/shell/role-guard'

export default function ScansPage() {
  return (
    <>
      <TopBar title="Mineral Scans & AI Classification"
        subtitle="Drone hyperspectral, GPR, electromagnetic and satellite scans classified by mdmis-specnet-v4" />
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin md:p-6">
        <div className="mx-auto max-w-7xl">
          <RoleGuard permission="scans.view">
            <ScansView />
          </RoleGuard>
        </div>
      </div>
    </>
  )
}
