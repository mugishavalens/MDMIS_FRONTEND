'use client'

import Link from 'next/link'
import { BarChart3, Globe2, ShieldCheck, Shield, ArrowRight, MapPin, ScanLine, Link2, Truck, FileCheck2, Users, Settings } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ROLE_THEME, type Role } from '@/lib/rbac'

// Color comes from the shared ROLE_THEME (lib/rbac.ts) — only the
// role-specific copy and quick links live here.
const ROLE_CONFIG: Record<Role, {
  icon: React.ElementType
  greeting: string
  desc: string
  quickLinks: { href: string; label: string; icon: React.ElementType }[]
}> = {
  system_admin: {
    icon: Shield,
    greeting: 'System Administrator Portal',
    desc: 'Full platform access — manage users, review audit logs, configure system settings and monitor all operations.',
    quickLinks: [
      { href: '/admin', label: 'User Management', icon: Users },
      { href: '/admin', label: 'Audit Logs', icon: FileCheck2 },
      { href: '/admin', label: 'System Config', icon: Settings },
      { href: '/compliance', label: 'Compliance Reports', icon: ShieldCheck },
    ],
  },
  org_admin: {
    icon: Shield,
    greeting: 'Organisation Admin Portal',
    desc: 'Invite and manage your organisation’s users, review the org-wide audit trail and configure notifications.',
    quickLinks: [
      { href: '/admin', label: 'Invite Users', icon: Users },
      { href: '/admin', label: 'Audit Logs', icon: FileCheck2 },
      { href: '/map', label: 'Site Overview', icon: MapPin },
      { href: '/compliance', label: 'Compliance Reports', icon: ShieldCheck },
    ],
  },
  mine_manager: {
    icon: BarChart3,
    greeting: 'Mine Manager Portal',
    desc: 'View detection sites, run AI classifications, export scan reports and monitor supply-chain compliance status.',
    quickLinks: [
      { href: '/scans', label: 'AI Scan Analysis', icon: ScanLine },
      { href: '/map', label: '3D Site Map', icon: MapPin },
      { href: '/traceability', label: 'Chain of Custody', icon: Link2 },
      { href: '/transport', label: 'Fleet Status', icon: Truck },
    ],
  },
  geologist: {
    icon: Globe2,
    greeting: 'Geologist Portal',
    desc: 'Explore 3D subsurface maps, annotate detection sites, analyze multi-sensor scan data and review geological survey results.',
    quickLinks: [
      { href: '/map', label: '3D Subsurface Explorer', icon: Globe2 },
      { href: '/scans', label: 'Hyperspectral Scans', icon: ScanLine },
      { href: '/traceability', label: 'Site Traceability', icon: Link2 },
      { href: '/map', label: 'Annotate Sites', icon: MapPin },
    ],
  },
  compliance_manager: {
    icon: ShieldCheck,
    greeting: 'Compliance Manager Portal',
    desc: 'Manage OECD due diligence reports, ITSCI tag reconciliation, RMB licensing returns and flag non-compliant mineral lots.',
    quickLinks: [
      { href: '/compliance', label: 'OECD Reports', icon: ShieldCheck },
      { href: '/traceability', label: 'Chain of Custody', icon: Link2 },
      { href: '/transport', label: 'Convoy Compliance', icon: Truck },
      { href: '/scans', label: 'Scan Records', icon: ScanLine },
    ],
  },
}

export function RoleDashboard() {
  const { user } = useAuth()
  if (!user) return null

  const role = (user.role as Role) in ROLE_CONFIG ? (user.role as Role) : 'mine_manager'
  const cfg = ROLE_CONFIG[role]
  const theme = ROLE_THEME[role]
  const Icon = cfg.icon

  return (
    <div className={`rounded-xl border p-5 ${theme.bg}`}>
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-current/20 bg-background/40">
          <Icon className={`size-6 ${theme.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className={`text-base font-bold ${theme.text}`}>{cfg.greeting}</h2>
            <span className="rounded-full border border-current/20 bg-background/40 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
              {user.name}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{cfg.desc}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cfg.quickLinks.map(({ href, label, icon: LinkIcon }) => (
          <Link key={label} href={href}
            className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2.5 text-sm text-foreground hover:border-primary/40 hover:bg-background/80 transition-all group">
            <LinkIcon className={`size-4 shrink-0 ${theme.text} group-hover:scale-110 transition-transform`} />
            <span className="truncate text-xs font-medium">{label}</span>
            <ArrowRight className="size-3 ml-auto shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  )
}
