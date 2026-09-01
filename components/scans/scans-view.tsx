'use client'

import { useState } from 'react'
import {
  Plane,
  Radar as RadarIcon,
  Zap,
  Satellite,
  Cpu,
  CheckCircle2,
  Clock,
  Eye,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatusPill } from '@/components/shell/status-pill'
import { SCANS, MINERAL_META, fmtDateTime, type Scan, type ScanMethod } from '@/lib/mdmis-data'
import { cn } from '@/lib/utils'

const METHOD_ICON: Record<ScanMethod, LucideIcon> = {
  'Drone Hyperspectral': Plane,
  'Ground Penetrating Radar': RadarIcon,
  Electromagnetic: Zap,
  'Satellite Multispectral': Satellite,
}

function statusMeta(s: Scan['status']) {
  if (s === 'classified') return { tone: 'success' as const, icon: CheckCircle2, label: 'Classified' }
  if (s === 'processing') return { tone: 'info' as const, icon: Clock, label: 'Processing' }
  return { tone: 'warning' as const, icon: Eye, label: 'Needs review' }
}

export function ScansView() {
  const [selectedId, setSelectedId] = useState<string>(SCANS[0].id)
  const scan = SCANS.find((s) => s.id === selectedId)!

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
      {/* scan list */}
      <div className="space-y-2">
        {SCANS.map((s) => {
          const MethodIcon = METHOD_ICON[s.method]
          const st = statusMeta(s.status)
          const active = s.id === selectedId
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(s.id)}
              className={cn(
                'flex w-full items-center gap-4 rounded-lg border bg-card px-4 py-3 text-left transition-all',
                active 
                  ? 'border-primary/50 ring-2 ring-primary/20 shadow-md shadow-primary/10' 
                  : 'border-border hover:border-primary/30 hover:shadow-sm',
              )}
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-md"
                style={{ background: `color-mix(in oklch, ${MINERAL_META[s.classification].color} 15%, transparent)` }}
              >
                <MethodIcon className="size-5" style={{ color: MINERAL_META[s.classification].color }} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
                  <StatusPill tone={st.tone}>{st.label}</StatusPill>
                </div>
                <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                  {s.classification} <span className="text-muted-foreground">· {s.siteName}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.method} · {s.operator} · {fmtDateTime(s.capturedAt)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-base font-semibold text-foreground">{s.confidence}%</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">confidence</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* classification detail */}
      <Card className="h-fit border-border bg-card xl:sticky xl:top-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-primary" />
            <CardTitle className="text-sm">AI Classification — {scan.id}</CardTitle>
          </div>
          <CardDescription>
            {scan.siteName} · {scan.method}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border border-primary/25 bg-primary/8 p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Predicted mineral</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{scan.classification}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {MINERAL_META[scan.classification].symbol} · {MINERAL_META[scan.classification].commodity}
            </p>
            <p className="mt-2 font-mono text-sm text-primary">{scan.confidence}% confidence</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Class probabilities</p>
            <div className="space-y-2.5">
              {scan.alternatives.map((alt) => (
                <div key={alt.mineral}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-foreground">{alt.mineral}</span>
                    <span className="font-mono text-muted-foreground">{alt.probability}%</span>
                  </div>
                  <Progress value={alt.probability} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
            <Stat label="Grade" value={`${scan.gradePct}%`} />
            <Stat label="Bands" value={scan.spectralBands ? String(scan.spectralBands) : '—'} />
            <Stat label="Area" value={`${scan.areaHa} ha`} />
          </div>

          <p className="rounded-md bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
            Model <span className="font-mono text-foreground">mdmis-specnet-v4</span> fused{' '}
            {scan.spectralBands > 0 ? `${scan.spectralBands} spectral bands` : 'geophysical response'} with
            historical belt priors. Confidence above 90% is auto-accepted; lower scores are routed to human review.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 py-2">
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}
