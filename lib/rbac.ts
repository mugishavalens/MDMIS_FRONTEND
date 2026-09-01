// MDMIS Role-Based Access Control definitions.
// 5-role model: system_admin (platform), org_admin (per-organisation owner,
// invites teammates), and the 3 invitable roles below. Role identity comes
// from the FastAPI backend (see ../backend/app/accounts) via auth-context;
// this file only maps a role slug to permissions/nav.

export type Role =
  | 'geologist'
  | 'compliance_manager'
  | 'mine_manager'
  | 'org_admin'
  | 'system_admin'

export interface RoleUser {
  name: string
  email: string
  role: Role
  roleLabel: string
  initials: string
}

// Permissions per role.
export const PERMISSIONS: Record<Role, string[]> = {
  geologist: [
    'dashboard.view', 'map.view', 'map.annotate', 'scans.view', 'scans.classify', 'traceability.view',
  ],
  mine_manager: [
    'dashboard.view', 'map.view', 'map.annotate', 'scans.view', 'scans.classify',
    'traceability.view', 'traceability.edit', 'transport.view', 'compliance.view',
  ],
  compliance_manager: [
    'dashboard.view', 'compliance.view', 'compliance.submit', 'compliance.edit',
    'traceability.view', 'transport.view', 'scans.view',
  ],
  org_admin: [
    'dashboard.view', 'dashboard.admin', 'map.view', 'map.annotate', 'scans.view', 'scans.classify',
    'traceability.view', 'traceability.edit', 'transport.view', 'compliance.view', 'compliance.submit',
    'users.manage', 'users.invite', 'audit.view',
  ],
  system_admin: [
    'dashboard.view', 'dashboard.admin', 'map.view', 'map.edit', 'scans.view', 'scans.classify', 'scans.delete',
    'traceability.view', 'traceability.edit', 'transport.view', 'transport.edit', 'compliance.view',
    'compliance.submit', 'compliance.approve', 'users.manage', 'users.invite', 'audit.view', 'system.configure',
  ],
}

export function can(role: Role, permission: string): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false
}

// Single source of truth for role colors — every role-tagged UI (dashboard
// greeting card, admin badges, login demo button, etc.) reads from here so
// a given role always renders in the same color everywhere.
export type RoleTone = 'danger' | 'warning' | 'info' | 'success' | 'accent'

export const ROLE_THEME: Record<Role, { tone: RoleTone; text: string; bg: string }> = {
  system_admin: { tone: 'danger', text: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
  org_admin: { tone: 'accent', text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  mine_manager: { tone: 'warning', text: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
  geologist: { tone: 'info', text: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
  compliance_manager: {
    tone: 'success', text: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10 border-[var(--success)]/20',
  },
}

// Nav items visible per role.
export const ROLE_NAV: Record<Role, string[]> = {
  geologist: ['/dashboard', '/map/globe', '/map', '/scans', '/traceability'],
  mine_manager: ['/dashboard', '/map/globe', '/map', '/scans', '/traceability', '/transport', '/compliance'],
  compliance_manager: ['/dashboard', '/compliance', '/traceability', '/transport', '/scans'],
  org_admin: ['/dashboard', '/map/globe', '/map', '/scans', '/traceability', '/transport', '/compliance', '/admin'],
  system_admin: ['/dashboard', '/map/globe', '/map', '/scans', '/traceability', '/transport', '/compliance', '/admin'],
}
