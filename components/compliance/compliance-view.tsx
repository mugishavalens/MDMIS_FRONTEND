'use client'

import { useEffect, useState } from 'react'
import { FileCheck2, FileClock, FileWarning, FileText, Download, ShieldCheck } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/shell/stat-card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { StatusPill } from '@/components/shell/status-pill'
import { fetchComplianceReports, FRAMEWORK_LABEL, type ComplianceReport } from '@/lib/api/compliance'
import { fetchDashboardSummary } from '@/lib/api/dashboard'

function statusMeta(s: ComplianceReport['status']) {
  switch (s) {
    case 'approved':
      return { tone: 'success' as const, icon: FileCheck2 }
    case 'submitted':
      return { tone: 'info' as const, icon: FileCheck2 }
    case 'draft':
      return { tone: 'warning' as const, icon: FileClock }
    default:
      return { tone: 'danger' as const, icon: FileWarning }
  }
}

export function ComplianceView() {
  const [reports, setReports] = useState<ComplianceReport[]>([])
  const [compliantLotsPct, setCompliantLotsPct] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const [lowestCoverageFirst, setLowestCoverageFirst] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchComplianceReports(), fetchDashboardSummary()])
      .then(([r, summary]) => {
        if (cancelled) return
        setReports(r)
        setCompliantLotsPct(summary.compliantLotsPct)
      })
      .catch((err) => console.error('[MDMIS] Failed to load compliance data:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const avgCoverage = reports.length > 0 ? Math.round(reports.reduce((a, r) => a + r.coveragePct, 0) / reports.length) : 0
  const flagged = reports.reduce((a, r) => a + r.flaggedLots, 0)
  const filteredReports = onlyFlagged ? reports.filter((r) => r.flaggedLots > 0) : reports
  const shownReports = lowestCoverageFirst
    ? [...filteredReports].sort((a, b) => a.coveragePct - b.coveragePct)
    : filteredReports

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={ShieldCheck} tone="success" label="Lots fully compliant"
          value={compliantLotsPct === null ? '—' : `${compliantLotsPct}%`}
          hint="Open Chain of Custody to see each lot's compliance" href="/traceability" />
        <StatCard icon={FileText} label="Avg. supply-chain coverage" value={`${avgCoverage}%`}
          hint="Sort reports by coverage, lowest first" selected={lowestCoverageFirst}
          onClick={() => setLowestCoverageFirst((v) => !v)} />
        <StatCard icon={FileWarning} tone="danger" label="Flagged lots in reports" value={String(flagged)}
          hint="Show only reports that contain flagged lots" selected={onlyFlagged}
          onClick={() => setOnlyFlagged((v) => !v)} />
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm">Regulatory reports</CardTitle>
          <CardDescription>
            {onlyFlagged || lowestCoverageFirst ? (
              <>
                Showing {onlyFlagged ? 'reports with flagged lots' : 'all reports'}
                {lowestCoverageFirst ? ', lowest coverage first' : ''} ·{' '}
                <button type="button" className="text-primary hover:underline"
                  onClick={() => { setOnlyFlagged(false); setLowestCoverageFirst(false) }}>
                  Show all
                </button>
              </>
            ) : (
              'OECD, EU Conflict Minerals, ITSCI and Rwanda Mines Board submissions'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <p className="py-10 text-center text-xs text-muted-foreground">Loading reports…</p>
          ) : reports.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">No compliance reports recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Report</TableHead>
                  <TableHead className="hidden md:table-cell">Framework</TableHead>
                  <TableHead className="hidden sm:table-cell">Period</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Export</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shownReports.map((r) => {
                  const st = statusMeta(r.status)
                  const Icon = st.icon
                  return (
                    <TableRow key={r.id} className="border-border">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              to {r.submittedTo || 'unassigned'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {FRAMEWORK_LABEL[r.framework] ?? r.framework}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">{r.period}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={r.coveragePct} className="h-1.5 w-16" />
                          <span className="font-mono text-xs text-foreground">{r.coveragePct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={st.tone}>{r.status}</StatusPill>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Download className="size-3" /> PDF
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
