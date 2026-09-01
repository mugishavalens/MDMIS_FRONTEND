'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Settings as SettingsIcon, Moon, Sun, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/components/shell/theme-provider'
import { can } from '@/lib/rbac'
import { cn } from '@/lib/utils'

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!user) return null

  // Check if user has admin permissions
  const canAccessSettings = can(user.role, 'system.configure')

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    router.push('/')
  }

  const handleDashboardClick = () => {
    setIsOpen(false)
    router.push('/dashboard')
  }

  const handleProfileClick = () => {
    setIsOpen(false)
    router.push('/profile')
  }

  const handleSettingsClick = () => {
    setIsOpen(false)
    router.push('/admin')
  }

  const handleThemeToggle = () => {
    toggle()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-accent/60 transition-colors"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {user.initials}
        </div>
        <div className="hidden sm:block text-left min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.roleLabel}</p>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card shadow-xl shadow-black/10 overflow-hidden z-50">
          {/* User Info */}
          <div className="border-b border-border px-4 py-3 bg-accent/30">
            <p className="font-semibold text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <span className="inline-block mt-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary border border-primary/20">
              {user.roleLabel}
            </span>
          </div>

          {/* Menu Items */}
          <div className="py-1.5">
            <button
              onClick={handleDashboardClick}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-foreground hover:bg-accent/60 transition-colors"
            >
              <LayoutDashboard className="size-[18px] text-muted-foreground" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={handleProfileClick}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-foreground hover:bg-accent/60 transition-colors"
            >
              <User className="size-[18px] text-muted-foreground" />
              <span>Profile</span>
            </button>

            {canAccessSettings && (
              <button
                onClick={handleSettingsClick}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-foreground hover:bg-accent/60 transition-colors"
              >
                <SettingsIcon className="size-[18px] text-muted-foreground" />
                <span>Settings</span>
              </button>
            )}

            <button
              onClick={handleThemeToggle}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-foreground hover:bg-accent/60 transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="size-[18px] text-muted-foreground" />
                  <span>Light mode</span>
                </>
              ) : (
                <>
                  <Moon className="size-[18px] text-muted-foreground" />
                  <span>Dark mode</span>
                </>
              )}
            </button>
          </div>

          {/* Sign Out */}
          <div className="border-t border-border py-1.5">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="size-[18px]" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
