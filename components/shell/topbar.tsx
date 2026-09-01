'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Bell, ChevronDown, Sun, Moon, LogOut, User, Settings, LayoutDashboard } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PRICES } from '@/lib/mdmis-data'
import { useTheme } from '@/components/shell/theme-provider'
import { useAuth } from '@/lib/auth-context'
import { can } from '@/lib/rbac'
import { cn } from '@/lib/utils'

export function TopBar({ title, subtitle }: { title: string; subtitle: string }) {
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleLogout() {
    setMenuOpen(false)
    logout()
    router.push('/')
  }

  // Check if user has admin permissions
  const canAccessSettings = user ? can(user.role, 'system.configure') : false

  const displayName = user?.name ?? 'Guest'
  const displayRole = user?.roleLabel ?? ''
  const initials = user?.initials ?? 'GU'

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-lg">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="relative hidden lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search sites, scans, lots…"
            className="h-10 w-64 border-border bg-secondary/60 pl-9 text-[15px] transition-all focus:w-72" />
        </div>

        <button type="button" onClick={toggle}
          className="flex size-9 items-center justify-center rounded-md border border-border bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
          aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        <button type="button"
          className="relative flex size-9 items-center justify-center rounded-md border border-border bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
          aria-label="Notifications">
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive animate-pulse" />
        </button>

        <div className="relative" ref={menuRef}>
          <button type="button" onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md border border-border bg-secondary/60 py-1 pl-1 pr-2 transition-colors hover:border-primary/40">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden leading-tight sm:block text-left">
              <p className="text-xs font-medium text-foreground">{displayName}</p>
              <p className="text-[10px] text-muted-foreground">{displayRole}</p>
            </div>
            <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', menuOpen && 'rotate-180')} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-popover shadow-xl shadow-black/20 overflow-hidden z-50">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <span className="mt-1 inline-block rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{displayRole}</span>
              </div>
              <div className="p-1">
                <button type="button" onClick={() => { setMenuOpen(false); router.push('/dashboard') }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] text-foreground hover:bg-secondary transition-colors">
                  <LayoutDashboard className="size-[18px] text-muted-foreground" /> Dashboard
                </button>
                <button type="button" onClick={() => { setMenuOpen(false); router.push('/profile') }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] text-foreground hover:bg-secondary transition-colors">
                  <User className="size-[18px] text-muted-foreground" /> Profile
                </button>
                {canAccessSettings && (
                  <button type="button" onClick={() => { setMenuOpen(false); router.push('/admin') }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] text-foreground hover:bg-secondary transition-colors">
                    <Settings className="size-[18px] text-muted-foreground" /> Settings
                  </button>
                )}
                <button type="button" onClick={toggle}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] text-foreground hover:bg-secondary transition-colors">
                  {theme === 'dark' ? <Sun className="size-[18px] text-muted-foreground" /> : <Moon className="size-[18px] text-muted-foreground" />}
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
              </div>
              <div className="border-t border-border p-1">
                <button type="button" onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] text-destructive hover:bg-destructive/10 transition-colors">
                  <LogOut className="size-[18px]" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 overflow-x-auto border-t border-border bg-card/40 px-4 py-1.5 text-xs scrollbar-thin md:px-6">
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[var(--success)]" />
          </span>
          Live prices
        </span>
        {PRICES.map((p) => (
          <div key={p.commodity} className="flex shrink-0 items-center gap-2">
            <span className="text-muted-foreground">{p.commodity}</span>
            <span className="font-mono font-medium text-foreground">
              {p.unit.startsWith('USD') ? '$' : ''}{p.price.toLocaleString()}
            </span>
            <span className={cn('font-mono', p.changePct >= 0 ? 'text-[var(--success)]' : 'text-destructive')}>
              {p.changePct >= 0 ? '▲' : '▼'} {Math.abs(p.changePct)}%
            </span>
          </div>
        ))}
      </div>
    </header>
  )
}
