'use client'

import Link from 'next/link'
import { Globe2, ShieldCheck, MapPin, ScanLine, Link2, Truck, FileCheck2, Users, Settings } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ROLE_THEME, type Role } from '@/lib/rbac'

// Color comes from the shared ROLE_THEME (lib/rbac.ts) — only the
// role-specific copy, background photo and quick links live here.
const ROLE_CONFIG: Record<Role, {
  eyebrow: string
  greeting: string
  desc: string
  image: string
  quickLinks: { href: string; label: string; icon: React.ElementType }[]
}> = {
  system_admin: {
    eyebrow: 'Platform Control',
    greeting: 'System Administrator Portal',
    desc: 'Full platform access — manage users, review audit logs, configure system settings and monitor all operations.',
    image: '/mine/mine-sunset.png',
    quickLinks: [
      { href: '/admin', label: 'User Management', icon: Users },
      { href: '/admin', label: 'Audit Logs', icon: FileCheck2 },
      { href: '/admin', label: 'System Config', icon: Settings },
      { href: '/compliance', label: 'Compliance Reports', icon: ShieldCheck },
    ],
  },
  org_admin: {
    eyebrow: 'Organisation Workspace',
    greeting: 'Organisation Admin Portal',
    desc: 'Invite and manage your organisation’s users, review the org-wide audit trail and configure notifications.',
    image: '/mine/mine-panorama.png',
    quickLinks: [
      { href: '/admin', label: 'Invite Users', icon: Users },
      { href: '/admin', label: 'Audit Logs', icon: FileCheck2 },
      { href: '/map', label: 'Site Overview', icon: MapPin },
      { href: '/compliance', label: 'Compliance Reports', icon: ShieldCheck },
    ],
  },
  mine_manager: {
    eyebrow: 'Operations Workspace',
    greeting: 'Mine Manager Portal',
    desc: 'View detection sites, run AI classifications, export scan reports and monitor supply-chain compliance status.',
    image: '/mine/haul-truck.png',
    quickLinks: [
      { href: '/scans', label: 'AI Scan Analysis', icon: ScanLine },
      { href: '/map', label: '3D Site Map', icon: MapPin },
      { href: '/traceability', label: 'Chain of Custody', icon: Link2 },
      { href: '/transport', label: 'Fleet Status', icon: Truck },
    ],
  },
  geologist: {
    eyebrow: 'Exploration Workspace',
    greeting: 'Geologist Portal',
    desc: 'Explore 3D subsurface maps, annotate detection sites, analyze multi-sensor scan data and review geological survey results.',
    image: '/mine/excavator-aerial.png',
    quickLinks: [
      { href: '/map', label: '3D Globe & Terrain', icon: Globe2 },
      { href: '/scans', label: 'Hyperspectral Scans', icon: ScanLine },
      { href: '/traceability', label: 'Site Traceability', icon: Link2 },
      { href: '/compliance', label: 'Compliance Status', icon: ShieldCheck },
    ],
  },
  compliance_manager: {
    eyebrow: 'Compliance Workspace',
    greeting: 'Compliance Manager Portal',
    desc: 'Manage OECD due diligence reports, ITSCI tag reconciliation, RMB licensing returns and flag non-compliant mineral lots.',
    image: '/mine/processing-plant.png',
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

  const [primaryLink, ...restLinks] = cfg.quickLinks

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 shadow-lg shadow-black/10">
      <img src={cfg.image} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/25" />

      <div className="relative p-6">
        <div className="flex items-center gap-2">
          <span className={`inline-flex size-2 rounded-full ${theme.text} bg-current`} />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/85">{cfg.eyebrow}</span>
          <span className="rounded-full border border-white/20 bg-black/30 px-2 py-0.5 text-[10px] font-mono text-white/70">
            {user.name}
          </span>
        </div>

        <h2 className="mt-3 text-2xl font-bold leading-tight text-white drop-shadow-sm md:text-3xl">
          {cfg.greeting}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">{cfg.desc}</p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {primaryLink && (
            <Link
              href={primaryLink.href}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 ${theme.solidBg}`}
            >
              <primaryLink.icon className="size-4" />
              {primaryLink.label}
            </Link>
          )}
          {restLinks.map(({ href, label, icon: LinkIcon }) => (
            <Link
              key={label}
              href={href}
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-black/30 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-black/45"
            >
              <LinkIcon className="size-4 text-white/80" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
