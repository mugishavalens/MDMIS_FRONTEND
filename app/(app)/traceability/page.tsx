import { TopBar } from '@/components/shell/topbar'
import { TraceView } from '@/components/traceability/trace-view'
import { RoleGuard } from '@/components/shell/role-guard'

export default function TraceabilityPage() {
  return (
    <>
      <TopBar title="Traceability — Chain of Custody"
        subtitle="Ledger-backed tracking of mineral lots from detection through export" />
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin md:p-6">
        <div className="mx-auto max-w-7xl">
          <RoleGuard permission="traceability.view">
            <TraceView />
          </RoleGuard>
        </div>
      </div>
    </>
  )
}
