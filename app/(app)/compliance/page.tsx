import { TopBar } from '@/components/shell/topbar'
import { ComplianceView } from '@/components/compliance/compliance-view'
import { RoleGuard } from '@/components/shell/role-guard'

export default function CompliancePage() {
  return (
    <>
      <TopBar title="Compliance & Reporting"
        subtitle="OECD due diligence, ITSCI reconciliation and government licensing returns" />
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin md:p-6">
        <div className="mx-auto max-w-7xl">
          <RoleGuard permission="compliance.view">
            <ComplianceView />
          </RoleGuard>
        </div>
      </div>
    </>
  )
}
