'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/shell/sidebar'
import { useAuth } from '@/lib/auth-context'

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  // AuthProvider withholds rendering until the initial session check
  // resolves, so by the time this mounts we already know for sure whether
  // there's a real signed-in user — no auth means someone reached a
  // protected route directly (deep link, stale tab, dead session) and
  // should be bounced to /login rather than shown a degraded "Guest" shell.
  useEffect(() => {
    if (!isAuthenticated) router.replace('/login')
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}
