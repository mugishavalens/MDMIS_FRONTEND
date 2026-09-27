import { apiFetch } from '@/lib/api'

export interface AuditLog {
  id: string
  actorId: string | null
  actorName: string
  action: string
  resourceType: string
  resourceId: string
  detail: string
  created_at: string
}

export function fetchAuditLogs(): Promise<AuditLog[]> {
  return apiFetch<AuditLog[]>('/audit/')
}

export function fetchAuditSummary(): Promise<{ eventsToday: number }> {
  return apiFetch<{ eventsToday: number }>('/audit/summary')
}

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  'invite.create': 'Sent an invitation',
  'invite.revoke': 'Revoked an invitation',
  'safety.report': 'Reported a safety incident',
  'safety.acknowledge': 'Acknowledged a safety incident',
  'batch.flag_noncompliant': 'Flagged a batch non-compliant',
  'custody.flag': 'Flagged a custody event',
}

export type AuditLevel = 'info' | 'success' | 'warning' | 'danger'

export function auditLevel(action: string): AuditLevel {
  if (action.includes('flag')) return 'danger'
  if (action === 'invite.revoke') return 'warning'
  if (action === 'safety.acknowledge') return 'success'
  return 'info'
}
