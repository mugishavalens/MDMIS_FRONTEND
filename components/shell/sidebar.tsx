'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Globe2, ScanLine, Link2, Truck,
  ShieldCheck, Mountain, Settings, Satellite, HardHat, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { ROLE_NAV } from '@/lib/rbac'
import { UserAvatar } from '@/components/shell/user-avatar'
import { fetchDeviceSummary } from '@/lib/api/sensors'

const ALL_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/map', label: 'Intelligence Explorer', icon: Globe2 },
  { href: '/scans', label: 'Survey Analysis', icon: ScanLine },
  { href: '/sensors', label: 'Sensor Data', icon: Satellite },
  { href: '/traceability', label: 'Chain of Custody', icon: Link2 },
  { href: '/transport', label: 'Fleet Management', icon: Truck },
  { href: '/compliance', label: 'Regulatory Compliance', icon: ShieldCheck },
  { href: '/safety', label: 'Safety Incidents', icon: HardHat },
  { href: '/admin', label: 'System Admin', icon: Settings },
]

const COLLAPSED_KEY = 'mdmis_sidebar_collapsed'

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [network, setNetwork] = useState<{ total: number; active: number; online: number } | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  // Remember the choice across visits (read after mount to avoid a hydration mismatch).
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1') } catch { /* storage unavailable */ }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1') } catch { /* storage unavailable */ }
      return !c
    })
  }, [])

  // Ctrl+B / Cmd+B toggles the sidebar, as in most editors.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleCollapsed()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleCollapsed])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = () => fetchDeviceSummary().then((s) => { if (!cancelled) setNetwork(s) }).catch(() => {})
    load()
    const t = window.setInterval(load, 60_000)
    return () => { cancelled = true; window.clearInterval(t) }
  }, [user])

  const networkOk = !!network && network.active > 0 && network.online === network.active
  const networkLabel = !network || network.active === 0
    ? 'No sensors connected'
    : network.online === network.active ? 'Sensor network online'
    : network.online === 0 ? 'Sensor network offline' : 'Sensor network degraded'
  const networkDetail = network
    ? `${network.online} of ${network.active} device${network.active === 1 ? '' : 's'} reporting`
    : 'Checking…'

  const allowedHrefs = user ? ROLE_NAV[user.role] : ['/dashboard']
  const nav = ALL_NAV.filter((n) => allowedHrefs.includes(n.href))

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-sidebar-border',
          collapsed ? 'justify-center' : 'gap-2 pl-5 pr-3',
        )}
      >
        {!collapsed && (
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-3 rounded-md transition-opacity hover:opacity-90">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Mountain className="size-5" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-base font-semibold tracking-tight text-sidebar-foreground">MDMIS</p>
              <p className="truncate text-xs text-muted-foreground">Mining Intelligence</p>
            </div>
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-sidebar-border text-sidebar-foreground transition-colors hover:border-primary/50 hover:bg-sidebar-accent"
        >
          {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
        </button>
      </div>

      {/* User badge */}
      {user && (
        <div className={cn('border-b border-sidebar-border py-3', collapsed ? 'px-2' : 'px-4')}>
          <div
            title={collapsed ? `${user.name} · ${user.roleLabel}` : undefined}
            className={cn('flex items-center gap-2.5 rounded-lg bg-sidebar-accent/60 py-2', collapsed ? 'justify-center px-0' : 'px-3')}
          >
            <UserAvatar initials={user.initials} avatarUrl={user.avatarUrl} className="size-8 text-sm" />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.roleLabel}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <nav className={cn('flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden scrollbar-thin', collapsed ? 'p-2' : 'p-3')}>
        {!collapsed && (
          <p className="px-3 pb-2 pt-2 text-xs font-medium text-muted-foreground">Operations</p>
        )}
        {nav.map((item) => {
          // Exact match first, then a prefix match that requires a '/'
          // continuation and no more-specific nav item claiming the path.
          const isExact = pathname === item.href
          const isPrefix = pathname.startsWith(item.href + '/') &&
            !ALL_NAV.some(
              (other) =>
                other.href !== item.href &&
                other.href.length > item.href.length &&
                pathname.startsWith(other.href),
            )
          const active = isExact || isPrefix
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-md py-2.5 text-[15px] transition-colors',
                collapsed ? 'justify-center px-0' : 'px-3',
                active
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <Icon className={cn('size-[18px] shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground')} />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {active && (
                <span
                  className={cn('size-1.5 rounded-full bg-primary', collapsed && 'absolute right-1.5 top-1.5')}
                  aria-hidden
                />
              )}
            </Link>
          )
        })}
      </nav>

      <div className={cn('border-t border-sidebar-border', collapsed ? 'p-2' : 'p-3')}>
        <Link
          href="/sensors"
          title={collapsed ? `${networkLabel} · ${networkDetail}` : undefined}
          className={cn(
            'flex items-center gap-2.5 rounded-md bg-sidebar-accent/50 py-2 transition-colors hover:bg-sidebar-accent',
            collapsed ? 'justify-center px-0' : 'px-3',
          )}
        >
          <span className="relative flex size-2 shrink-0">
            {networkOk && <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--success)] opacity-60" />}
            <span className={cn('relative inline-flex size-2 rounded-full',
              networkOk ? 'bg-[var(--success)]' : network && network.online > 0 ? 'bg-primary' : 'bg-muted-foreground')} />
          </span>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-medium text-sidebar-foreground">{networkLabel}</p>
              <p className="truncate text-xs text-muted-foreground">{networkDetail}</p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  )
}
