'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Globe2, ScanLine, Link2, Truck,
  ShieldCheck, Mountain, Radio, LogOut, Sun, Moon, Settings, Satellite,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/shell/theme-provider'
import { useAuth } from '@/lib/auth-context'
import { ROLE_NAV } from '@/lib/rbac'

const ALL_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/map/globe', label: 'Satellite Globe', icon: Satellite },
  { href: '/map', label: 'Subsurface Explorer', icon: Globe2 },
  { href: '/scans', label: 'Survey Analysis', icon: ScanLine },
  { href: '/traceability', label: 'Chain of Custody', icon: Link2 },
  { href: '/transport', label: 'Fleet Management', icon: Truck },
  { href: '/compliance', label: 'Regulatory Compliance', icon: ShieldCheck },
  { href: '/admin', label: 'System Admin', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()

  const allowedHrefs = user ? ROLE_NAV[user.role] : ['/dashboard']
  const nav = ALL_NAV.filter((n) => allowedHrefs.includes(n.href))

  function handleLogout() {
    logout()
    router.push('/')
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <Link href="/" className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5 transition-colors hover:bg-sidebar-accent/30">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Mountain className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="font-mono text-base font-semibold tracking-tight text-sidebar-foreground">MDMIS</p>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Mining Intelligence</p>
        </div>
      </Link>

      {/* User badge */}
      {user && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/60 px-3 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {user.initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.roleLabel}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 scrollbar-thin">
        <p className="px-3 pb-2 pt-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Operations
        </p>
        {nav.map((item) => {
          // /map/globe and /map/inspect/* must not highlight the /map entry,
        // and /map must not highlight /map/globe — so we do an exact match
        // first, then a prefix match that requires a '/' continuation AND
        // that no other nav item is a more-specific prefix.
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
            <Link key={item.href} href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}>
              <Icon className={cn('size-[18px] shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground')} />
              <span className="flex-1 truncate">{item.label}</span>
              {active && <span className="size-1.5 rounded-full bg-primary" aria-hidden />}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-1">
        <div className="flex items-center gap-2.5 rounded-md bg-sidebar-accent/50 px-3 py-2 mb-2">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-[var(--success)]" />
          </span>
          <div className="leading-tight min-w-0">
            <p className="flex items-center gap-1 text-sm font-medium text-sidebar-foreground">
              <Radio className="size-3.5 text-muted-foreground" /> Sensor network online
            </p>
            <p className="text-xs text-muted-foreground truncate">12 UAVs · 34 ground nodes</p>
          </div>
        </div>

        <button type="button" onClick={toggle}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[15px] text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors">
          {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>

        <button type="button" onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[15px] text-destructive hover:bg-destructive/10 transition-colors">
          <LogOut className="size-[18px]" /> Sign out
        </button>
      </div>
    </aside>
  )
}
