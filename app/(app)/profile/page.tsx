import { TopBar } from '@/components/shell/topbar'
import { ProfileView } from '@/components/profile/profile-view'

export default function ProfilePage() {
  return (
    <>
      <TopBar title="My Profile" subtitle="Manage your account settings, personal information and preferences" />
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin md:p-6">
        <div className="mx-auto max-w-4xl">
          <ProfileView />
        </div>
      </div>
    </>
  )
}
