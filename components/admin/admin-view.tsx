'use client'

import { useEffect, useState } from 'react'
import { Shield, Users, Activity, Settings, CheckCircle2, XCircle, Clock, BarChart3, Eye, Trash2, Send, Mail } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { StatusPill } from '@/components/shell/status-pill'
import { RoleGuard } from '@/components/shell/role-guard'
import { PERMISSIONS, ROLE_THEME, type Role } from '@/lib/rbac'
import { apiFetch, ApiError } from '@/lib/api'

interface OrgUser {
  name: string
  email: string
  role: string
  roleLabel: string
  initials: string
  isActive: boolean
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  expires_at: string
  created_at: string
}

const INVITABLE_ROLES = [
  { value: 'geologist', label: 'Geologist' },
  { value: 'compliance_manager', label: 'Compliance Officer' },
  { value: 'mine_manager', label: 'Mine Analyst' },
]

const AUDIT_LOGS = [
  { id: 1, user: 'D. Nzeyimana', action: 'Viewed scan SCN-24810', resource: 'Scans', time: '2 min ago', level: 'info' },
  { id: 2, user: 'J. Habimana', action: 'Annotated site RW-RTG-01', resource: 'Map', time: '15 min ago', level: 'info' },
  { id: 3, user: 'C. Mukamana', action: 'Submitted OECD Q2 report', resource: 'Compliance', time: '1h ago', level: 'success' },
  { id: 4, user: 'System', action: 'GPS integrity lost on SHP-4023', resource: 'Transport', time: '2h ago', level: 'warning' },
  { id: 5, user: 'D. Nzeyimana', action: 'Exported scan report PDF', resource: 'Scans', time: '3h ago', level: 'info' },
  { id: 6, user: 'System', action: 'Critical safety score at Musha Cassiterite', resource: 'Sites', time: '4h ago', level: 'danger' },
]

function roleTone(role: string) {
  return (role in ROLE_THEME ? ROLE_THEME[role as Role].tone : 'neutral')
}

export function AdminView() {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'permissions' | 'system'>('users')

  const [users, setUsers] = useState<OrgUser[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState(INVITABLE_ROLES[0].value)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSent, setInviteSent] = useState(false)

  async function loadUsersAndInvites() {
    setLoadingUsers(true)
    try {
      const [u, i] = await Promise.all([
        apiFetch<OrgUser[]>('/accounts/users/'),
        apiFetch<Invitation[]>('/accounts/invitations/'),
      ])
      setUsers(u)
      setInvitations(i)
    } catch {
      // Non-org-admin viewers (e.g. a role without users.manage) simply see nothing.
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => { loadUsersAndInvites() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail) { setInviteError('Enter an email address.'); return }
    setInviteError('')
    setInviting(true)
    try {
      await apiFetch('/accounts/invitations/', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      setInviteEmail('')
      setInviteSent(true)
      setTimeout(() => setInviteSent(false), 3000)
      await loadUsersAndInvites()
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : 'Could not send invitation.')
    } finally {
      setInviting(false)
    }
  }

  async function handleRevoke(id: string) {
    try {
      await apiFetch(`/accounts/invitations/${id}`, { method: 'DELETE' })
      setInvitations((prev) => prev.filter((inv) => inv.id !== id))
    } catch {
      // best-effort — the list will resync on next load
    }
  }

  const pendingInvites = invitations.filter((i) => i.status === 'pending')
  const systemStats = [
    { label: 'Total Users', value: String(users.length), icon: Users, color: 'text-primary' },
    { label: 'Pending Invitations', value: String(pendingInvites.length), icon: Clock, color: 'text-destructive' },
    { label: 'Audit Events Today', value: '47', icon: Eye, color: 'text-[var(--success)]' },
    { label: 'Active Sessions', value: '—', icon: Activity, color: 'text-accent' },
  ]

  return (
    <RoleGuard permission="users.manage">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {systemStats.map((s) => {
            const Icon = s.icon
            return (
              <Card key={s.label} className="border-border bg-card">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex size-10 items-center justify-center rounded-md bg-secondary/70">
                    <Icon className={`size-5 ${s.color}`} />
                  </span>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-border bg-card/40 p-1 w-fit">
          {(['users', 'audit', 'permissions', 'system'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setActiveTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === t ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'users' ? 'User Management' : t === 'audit' ? 'Audit Logs' : t === 'permissions' ? 'Role Permissions' : 'System Config'}
            </button>
          ))}
        </div>

        {/* USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm">Invite a teammate</CardTitle>
                <CardDescription>They'll get an email link to set their own password and sign in.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Work email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@organization.rw"
                      className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="sm:w-52">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {INVITABLE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={inviting}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    <Send className="size-3.5" /> {inviting ? 'Sending…' : 'Send Invite'}
                  </button>
                </form>
                {inviteError && <p className="mt-2 text-xs text-destructive">{inviteError}</p>}
                {inviteSent && <p className="mt-2 text-xs text-[var(--success)]">Invitation sent.</p>}
              </CardContent>
            </Card>

            {pendingInvites.length > 0 && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-sm">Pending invitations</CardTitle>
                  <CardDescription>{pendingInvites.length} awaiting acceptance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingInvites.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background/40 px-4 py-2.5">
                      <Mail className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">{inv.email}</p>
                        <p className="text-[10px] text-muted-foreground">Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                      </div>
                      <StatusPill tone={roleTone(inv.role)}>
                        {INVITABLE_ROLES.find((r) => r.value === inv.role)?.label ?? inv.role}
                      </StatusPill>
                      <button type="button" onClick={() => handleRevoke(inv.id)} className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm">Organisation Members</CardTitle>
                <CardDescription>{loadingUsers ? 'Loading…' : `${users.length} account${users.length === 1 ? '' : 's'}`}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {users.map((u) => (
                  <div key={u.email} className="flex items-center gap-4 rounded-lg border border-border bg-background/40 px-4 py-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {u.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <StatusPill tone={roleTone(u.role)}>{u.roleLabel}</StatusPill>
                    {u.isActive
                      ? <CheckCircle2 className="size-4 text-[var(--success)]" />
                      : <XCircle className="size-4 text-muted-foreground" />}
                  </div>
                ))}
                {!loadingUsers && users.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No organisation members yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* AUDIT LOGS */}
        {activeTab === 'audit' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm">Audit Trail</CardTitle>
              <CardDescription>All user actions logged per OECD compliance requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {AUDIT_LOGS.map((log) => (
                <div key={log.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-4 py-2.5">
                  <span className={`size-2 shrink-0 rounded-full ${log.level === 'danger' ? 'bg-destructive' : log.level === 'warning' ? 'bg-primary' : log.level === 'success' ? 'bg-[var(--success)]' : 'bg-accent'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground"><span className="font-medium">{log.user}</span> — {log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.resource} · {log.time}</p>
                  </div>
                  <StatusPill tone={log.level === 'danger' ? 'danger' : log.level === 'warning' ? 'warning' : log.level === 'success' ? 'success' : 'info'}>
                    {log.level}
                  </StatusPill>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ROLE PERMISSIONS */}
        {activeTab === 'permissions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.entries(PERMISSIONS) as [string, string[]][]).map(([role, perms]) => (
              <Card key={role} className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-sm capitalize">{role.replace('_', ' ')}</CardTitle>
                  <CardDescription>{perms.length} permissions granted</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.map((p) => (
                      <span key={p} className="flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="size-3 text-[var(--success)]" /> {p}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* SYSTEM CONFIG */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Shield, title: 'Session Length', value: '30 minutes', desc: 'Access tokens expire after 30 min; silent refresh keeps you signed in', color: 'text-primary' },
              { icon: Activity, title: 'Sensor Network', value: 'Online', desc: '12 UAV units · 34 ground nodes · Kigali hub', color: 'text-[var(--success)]' },
              { icon: BarChart3, title: 'AI Model Version', value: 'specnet-v4', desc: 'Last retrained: 2026-06-01 · 97.8% peak accuracy', color: 'text-accent' },
              { icon: Settings, title: 'Compliance Mode', value: 'OECD + ITSCI', desc: 'EU Conflict Minerals Reg. 2017/821 active', color: 'text-[var(--success)]' },
              { icon: XCircle, title: 'Failed Logins (24h)', value: '0', desc: 'No brute-force attempts detected', color: 'text-[var(--success)]' },
              { icon: Users, title: 'RMB Integration', value: 'Connected', desc: 'Rwanda Mines Board API · last sync 4 min ago', color: 'text-accent' },
            ].map(({ icon: Icon, title, value, desc, color }) => (
              <Card key={title} className="border-border bg-card">
                <CardContent className="flex items-start gap-4 p-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary/70">
                    <Icon className={`size-5 ${color}`} />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
                    <p className="text-lg font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
