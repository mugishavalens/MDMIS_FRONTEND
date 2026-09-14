import { apiFetch } from '@/lib/api'

// Backend stores short framework codes; the UI wants the full names the
// old mock data used.
export const FRAMEWORK_LABEL: Record<string, string> = {
  oecd: 'OECD Due Diligence',
  itsci: 'ITSCI',
  rmb: 'RMB Licensing',
  eu: 'EU Conflict Minerals',
}

export interface ComplianceReport {
  id: string
  title: string
  framework: string
  period: string
  status: 'submitted' | 'draft' | 'overdue' | 'approved'
  coveragePct: number
  flaggedLots: number
  submittedTo: string
}

export function fetchComplianceReports(): Promise<ComplianceReport[]> {
  return apiFetch<ComplianceReport[]>('/compliance/')
}
