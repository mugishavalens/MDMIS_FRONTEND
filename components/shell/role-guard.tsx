'use client'

import { useAuth } from '@/lib/auth-context'
import { can, type Role } from '@/lib/rbac'
import { ShieldAlert } from 'lucide-react'

export function RoleGuard({
  permission,
  children,
  fallback,
}: {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { user } = useAuth()
  if (!user || !can(user.role as Role, permission)) {
    return fallback ? <>{fallback}</> : (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20 mb-4">
          <ShieldAlert className="size-7 text-destructive" />
        </div>
        <p className="text-base font-semibold text-foreground mb-1">Access Restricted</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your role <span className="font-medium text-foreground">({user?.roleLabel ?? 'Unknown'})</span> does not have permission to view this section.
        </p>
      </div>
    )
  }
  return <>{children}</>
}
