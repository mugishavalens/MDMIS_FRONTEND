'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState, useRef } from 'react'
import {
  ArrowLeft, Scan, EyeOff, RotateCcw, Loader2, Mountain,
  Drill, Layers, Gauge, ShieldAlert, Boxes, MapPin,
} from 'lucide-react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatusPill } from '@/components/shell/status-pill'
import { Map3DErrorBoundary } from '@/components/map/map-3d-boundary'
import { RISK_META, MINERAL_META, fmtNumber, timeAgo, type DetectionSite } from '@/lib/mdmis-data'
import { cn } from '@/lib/utils'

const SiteTerrainBlock = dynamic(() => import('@/components/map/site-terrain-block'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 size-5 animate-spin" />
      <span className="text-sm">Carving subsurface terrain block…</span>
    </div>
  ),
})

function riskTone(level: DetectionSite['riskLevel']) {
  return level === 'low' ? 'success' : level === 'moderate' ? 'warning' : 'danger'
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2.5">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" /> {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
      <p className="truncate text-[10px] text-muted-foreground">{sub}</p>
    </div>
  )
}

export function InspectClient({ site }: { site: DetectionSite }) {
  const [xray, setXray] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const [mapKey, setMapKey] = useState(0)

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur">
        <Link href="/map/globe">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="size-3.5" />
            Back to Globe
          </Button>
        </Link>

        <div className="mx-3 h-5 w-px bg-border" />

        <Mountain className="size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground leading-tight">{site.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {site.id} · {site.district} · {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <StatusPill tone={riskTone(site.riskLevel)}>{RISK_META[site.riskLevel].label} risk</StatusPill>

          <Button
            variant={xray ? 'default' : 'outline'}
            size="sm"
            onClick={() => setXray((v) => !v)}
            className="gap-2"
          >
            {xray ? <EyeOff className="size-3.5" /> : <Scan className="size-3.5" />}
            {xray ? 'Solid Ground' : 'X-Ray'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetSignal((n) => n + 1)}
            className="gap-2"
          >
            <RotateCcw className="size-3.5" />
            Reset View
          </Button>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 3D terrain block — takes all remaining width */}
        <div className="relative min-w-0 flex-1 overflow-hidden bg-[oklch(0.13_0.01_250)]">
          <Map3DErrorBoundary
            label="3D terrain block"
            onRetry={() => setMapKey((k) => k + 1)}
          >
            <SiteTerrainBlock
              key={mapKey}
              site={site}
              xray={xray}
              resetSignal={resetSignal}
              onContextLost={() => setMapKey((k) => k + 1)}
            />
          </Map3DErrorBoundary>

          {/* Floating hint overlay */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="rounded-full border border-white/10 bg-[#1a1d23]/80 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/50 backdrop-blur">
              drag to orbit · scroll to zoom · {xray ? 'x-ray active — deposit visible' : 'toggle x-ray to reveal deposit'}
            </div>
          </div>

          {/* X-ray indicator badge */}
          {xray && (
            <div className="pointer-events-none absolute right-4 top-4">
              <div className="flex items-center gap-2 rounded-md border border-[#3fcf8e]/30 bg-[#0d2b1f]/80 px-3 py-1.5 backdrop-blur">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3fcf8e] opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#3fcf8e]" />
                </span>
                <span className="font-mono text-[11px] font-semibold text-[#3fcf8e]">X-RAY ACTIVE</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Side panel ──────────────────────────────────────────────────── */}
        <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-border bg-card/40">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Site Detail</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin space-y-4">
            {/* Identity */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-foreground">{site.name}</h2>
                <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground mt-0.5">
                  <MapPin className="size-3" /> {site.district}
                </p>
              </div>
              <StatusPill tone={riskTone(site.riskLevel)} className="shrink-0">
                {RISK_META[site.riskLevel].label}
              </StatusPill>
            </div>

            {/* Primary metrics */}
            <div className="grid grid-cols-2 gap-2.5">
              <Metric icon={Boxes} label="Primary mineral" value={site.primaryMineral} sub={MINERAL_META[site.primaryMineral].commodity} />
              <Metric icon={Gauge} label="Ore grade" value={`${site.gradePct}%`} sub={`${site.confidence}% AI conf.`} />
            </div>

            {/* Subsurface profile */}
            <div className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <Drill className="size-3.5 text-primary" />
                <p className="text-xs font-medium text-foreground">Subsurface Profile</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Depth to deposit</span>
                  <span className="font-mono text-foreground">{site.depthMeters}m</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Est. reserve</span>
                  <span className="font-mono text-foreground">{fmtNumber(site.estimatedTonnage)} t</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Geological layer</span>
                  <span className="font-mono text-foreground">
                    {site.depthMeters < 30 ? 'Weathered Zone' : site.depthMeters < 60 ? 'Saprolite' : 'Bedrock'}
                  </span>
                </div>
                <div className="pt-1.5">
                  <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-accent to-[#9b6dff]"
                      style={{ width: `${Math.min((site.depthMeters / 100) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                    <span>0m</span>
                    <span>50m</span>
                    <span>100m+</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operations */}
            <div className="grid grid-cols-2 gap-2.5">
              <Metric
                icon={Layers}
                label="Scan method"
                value={site.lastScan.includes('T08') || site.lastScan.includes('T09') ? 'Drone' : 'GPR'}
                sub={timeAgo(site.lastScan)}
              />
              <Metric
                icon={ShieldAlert}
                label="Safety score"
                value={`${site.safetyScore}/100`}
                sub={site.safetyScore > 70 ? 'Stable' : 'Monitor'}
              />
            </div>

            {/* Safety bar */}
            <div className="rounded-md border border-border bg-background/40 p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ShieldAlert className="size-3" /> Subsurface stability
                </span>
                <span
                  className={cn(
                    'font-mono font-semibold',
                    site.safetyScore >= 80
                      ? 'text-[var(--success)]'
                      : site.safetyScore >= 60
                      ? 'text-primary'
                      : 'text-destructive',
                  )}
                >
                  {site.safetyScore}%
                </span>
              </div>
              <Progress value={site.safetyScore} className="h-2" />
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {site.safetyScore >= 80
                  ? 'Geologically stable · Safe for extraction operations'
                  : site.safetyScore >= 60
                  ? 'Moderate stability · Regular monitoring recommended'
                  : 'Critical stability concern · Enhanced safety protocols required'}
              </p>
            </div>

            {/* Secondary minerals */}
            {site.secondaryMinerals.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Secondary minerals
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {site.secondaryMinerals.map((m) => (
                    <span
                      key={m}
                      className="rounded border border-border bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      + {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* X-ray guide */}
            <div className="rounded-md border border-border bg-background/40 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground text-[11px]">X-Ray Mode</p>
              <p>
                Toggle X-Ray in the toolbar above to make the ground translucent and reveal the{' '}
                <span className="font-semibold text-foreground">{site.primaryMineral}</span> ore blob at{' '}
                <span className="font-mono text-foreground">{site.depthMeters}m</span> depth. The glowing
                vein on the cutaway walls and the depth scale on the right show the same deposit.
              </p>
            </div>

            {/* Coordinates */}
            <div className="rounded-md border border-border bg-background/40 p-3">
              <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Coordinates</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Latitude</span>
                  <span className="font-mono text-foreground">{site.lat.toFixed(6)}°</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Longitude</span>
                  <span className="font-mono text-foreground">{site.lng.toFixed(6)}°</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
