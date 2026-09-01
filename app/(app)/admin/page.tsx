import { TopBar } from '@/components/shell/topbar'
import { AdminView } from '@/components/admin/admin-view'

export default function AdminPage() {
  return (
    <>
      <TopBar title="System Administration" subtitle="User management, audit logs, system configuration and RBAC control" />
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin md:p-6">
        <div className="mx-auto max-w-7xl">
          <AdminView />
        </div>
      </div>
    </>
  )
}
