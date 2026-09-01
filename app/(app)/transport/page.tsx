import { TopBar } from '@/components/shell/topbar'
import { TransportView } from '@/components/transport/transport-view'
import { RoleGuard } from '@/components/shell/role-guard'

export default function TransportPage() {
  return (
    <>
      <TopBar title="Transportation Tracking"
        subtitle="Live convoy positions, GPS integrity and delivery status across export corridors" />
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin md:p-6">
        <div className="mx-auto max-w-7xl">
          <RoleGuard permission="transport.view">
            <TransportView />
          </RoleGuard>
        </div>
      </div>
    </>
  )
}
