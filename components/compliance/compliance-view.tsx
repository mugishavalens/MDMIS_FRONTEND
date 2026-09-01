import { FileCheck2, FileClock, FileWarning, FileText, Download, ShieldCheck } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
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
import { REPORTS, KPIS, type ComplianceReport } from '@/lib/mdmis-data'

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
  const avgCoverage = Math.round(REPORTS.reduce((a, r) => a + r.coveragePct, 0) / REPORTS.length)
  const flagged = REPORTS.reduce((a, r) => a + r.flaggedLots, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex size-11 items-center justify-center rounded-md bg-[var(--success)]/12 text-[var(--success)]">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-foreground">{KPIS.compliantLotsPct}%</p>
              <p className="text-xs text-muted-foreground">Lots fully compliant</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex size-11 items-center justify-center rounded-md bg-secondary/70 text-primary">
              <FileText className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-foreground">{avgCoverage}%</p>
              <p className="text-xs text-muted-foreground">Avg. supply-chain coverage</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex size-11 items-center justify-center rounded-md bg-destructive/12 text-destructive">
              <FileWarning className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-foreground">{flagged}</p>
              <p className="text-xs text-muted-foreground">Flagged lots in reports</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm">Regulatory reports</CardTitle>
          <CardDescription>OECD, EU Conflict Minerals, ITSCI and Rwanda Mines Board submissions</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
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
              {REPORTS.map((r) => {
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
                            {r.id} · to {r.submittedTo}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{r.framework}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  )
}
