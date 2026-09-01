'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Loader2, MapPin, Layers, Gauge, ShieldAlert, Boxes, Drill, Eye, Mountain, ArrowLeft, Scan, EyeOff, RotateCcw } from 'lucide-react'
import {
  SITES,
  RISK_META,
  MINERAL_META,
  fmtNumber,
  timeAgo,
  type DetectionSite,
} from '@/lib/mdmis-data'
import { StatusPill } from '@/components/shell/status-pill'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Map3DErrorBoundary } from '@/components/map/map-3d-boundary'

const GlobeScene = dynamic(() => import('@/components/map/globe-scene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 size-5 animate-spin" />
      <span className="text-sm">Initializing 3D subsurface globe…</span>
    </div>
  ),
})

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

export function MapExplorer() {
  const [selectedId, setSelectedId] = useState<string | null>('RW-RTG-01')
  const [showUnderground, setShowUnderground] = useState(true)
  const [viewMode, setViewMode] = useState<'globe' | 'terrain'>('globe')
  const [xray, setXray] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const [mapKey, setMapKey] = useState(0)
  const selected = SITES.find((s) => s.id === selectedId) ?? null

  function selectSite(id: string) {
    setSelectedId(id)
    setViewMode('globe')
    setXray(false)
  }

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_360px]">
      {/* 3D canvas: global overview or per-site terrain block */}
      <div className="relative min-h-[420px] overflow-hidden bg-[oklch(0.13_0.01_250)] grid-backdrop">
        <div className="relative h-full w-full" key={viewMode}>
          <Map3DErrorBoundary
            label={viewMode === 'terrain' ? '3D terrain view' : '3D subsurface globe'}
            onRetry={() => setMapKey((k) => k + 1)}
          >
            {viewMode === 'terrain' && selected ? (
              <SiteTerrainBlock
                key={mapKey}
                site={selected}
                xray={xray}
                resetSignal={resetSignal}
                onContextLost={() => setMapKey((k) => k + 1)}
              />
            ) : (
              <GlobeScene
                key={mapKey}
                selectedId={selectedId}
                onSelect={(s) => selectSite(s.id)}
                showUnderground={showUnderground}
                onContextLost={() => setMapKey((k) => k + 1)}
              />
            )}
          </Map3DErrorBoundary>
        </div>

        {viewMode === 'globe' && (
          <div className="pointer-events-auto absolute left-4 top-4 space-y-3">
            <div className="rounded-lg border border-border bg-card/85 p-3 text-xs backdrop-blur">
              <p className="mb-2 flex items-center gap-1.5 font-medium text-foreground">
                <Layers className="size-3.5 text-primary" /> Surface Detection Sites
              </p>
              <ul className="space-y-1.5">
                {(['low', 'moderate', 'high', 'critical'] as const).map((r) => (
                  <li key={r} className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ background: RISK_META[r].token }} />
                    {RISK_META[r].label} risk
                  </li>
                ))}
                <li className="mt-1 flex items-center gap-2 border-t border-border pt-1.5 text-muted-foreground">
                  <span className="h-0.5 w-4 rounded" style={{ background: 'var(--accent)' }} />
                  Transport route
                </li>
                {showUnderground && (
                  <li className="flex items-center gap-2 border-t border-border pt-1.5 text-muted-foreground">
                    <span className="size-2" style={{ color: '#9b6dff' }}>⬣</span>
                    Underground deposits
                  </li>
                )}
              </ul>
            </div>

            <Button
              variant={showUnderground ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowUnderground(!showUnderground)}
              className={cn('w-full justify-start gap-2', !showUnderground && 'bg-card/85 dark:bg-card/85 backdrop-blur')}
            >
              {showUnderground ? <Eye className="size-3.5" /> : <Drill className="size-3.5" />}
              {showUnderground ? 'Viewing Subsurface' : 'Show Underground'}
            </Button>

            {selected && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setViewMode('terrain')}
                className="w-full justify-start gap-2"
              >
                <Mountain className="size-3.5" />
                Enter 3D Terrain View
              </Button>
            )}
          </div>
        )}

        {viewMode === 'terrain' && selected && (
          <div className="pointer-events-auto absolute left-4 top-4 space-y-3">
            <Button variant="outline" size="sm" onClick={() => setViewMode('globe')} className="gap-2 bg-card/85 dark:bg-card/85 backdrop-blur">
              <ArrowLeft className="size-3.5" />
              Back to global map
            </Button>
            <div className="rounded-lg border border-border bg-card/85 p-3 text-xs backdrop-blur">
              <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                <Mountain className="size-3.5 text-primary" /> {selected.name}
              </p>
              <p className="text-muted-foreground">
                {selected.primaryMineral} deposit · {selected.depthMeters}m below surface
              </p>
            </div>
            <Button
              variant={xray ? 'default' : 'outline'}
              size="sm"
              onClick={() => setXray(!xray)}
              className={cn('w-full justify-start gap-2', !xray && 'bg-card/85 dark:bg-card/85 backdrop-blur')}
            >
              {xray ? <EyeOff className="size-3.5" /> : <Scan className="size-3.5" />}
              {xray ? 'Solid Ground' : 'X-Ray: See Through Ground'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetSignal((n) => n + 1)}
              className="w-full justify-start gap-2 bg-card/85 dark:bg-card/85 backdrop-blur"
            >
              <RotateCcw className="size-3.5" />
              Reset View
            </Button>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {viewMode === 'terrain'
            ? 'MDMIS · Subsurface Terrain Block · drag to orbit · scroll to zoom'
            : 'MDMIS · 3D Subsurface Explorer · drag · zoom · click sites'}
        </div>
      </div>

      {/* Side panel */}
      <div className="flex flex-col overflow-hidden border-t border-border lg:border-l lg:border-t-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {selected ? 'Site detail' : 'All sites'}
          </p>
        </div>

        {selected && (
          <div className="border-b border-border bg-card/40 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground">{selected.name}</h3>
                <p className="font-mono text-xs text-muted-foreground">
                  {selected.id} · {selected.district}
                </p>
              </div>
              <StatusPill tone={riskTone(selected.riskLevel)}>{RISK_META[selected.riskLevel].label}</StatusPill>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Metric icon={Boxes} label="Primary mineral" value={selected.primaryMineral} sub={MINERAL_META[selected.primaryMineral].commodity} />
                <Metric icon={Gauge} label="Ore grade" value={`${selected.gradePct}%`} sub={`${selected.confidence}% AI conf.`} />
              </div>
              
              {/* Depth & Underground Profile */}
              <div className="rounded-md border border-border bg-background/40 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Drill className="size-3.5 text-primary" />
                  <p className="text-xs font-medium text-foreground">Subsurface Profile</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Depth to deposit</span>
                    <span className="font-mono text-foreground">{selected.depthMeters}m</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Est. reserve</span>
                    <span className="font-mono text-foreground">{fmtNumber(selected.estimatedTonnage)} t</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Geological layer</span>
                    <span className="font-mono text-foreground">
                      {selected.depthMeters < 30 ? 'Weathered Zone' : selected.depthMeters < 60 ? 'Saprolite' : 'Bedrock'}
                    </span>
                  </div>
                  {/* Visual depth indicator */}
                  <div className="pt-2">
                    <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-accent to-[#9b6dff] rounded-full"
                        style={{ width: `${Math.min((selected.depthMeters / 100) * 100, 100)}%` }}
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

              <div className="grid grid-cols-2 gap-3">
                <Metric icon={Layers} label="Scan method" value={selected.lastScan.includes('T08') || selected.lastScan.includes('T09') ? 'Drone' : 'GPR'} sub={`${timeAgo(selected.lastScan)}`} />
                <Metric icon={ShieldAlert} label="Safety score" value={`${selected.safetyScore}/100`} sub={selected.safetyScore > 70 ? 'Stable' : 'Monitor'} />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ShieldAlert className="size-3" /> Subsurface stability
                </span>
                <span className={cn(
                  "font-mono font-semibold",
                  selected.safetyScore >= 80 ? "text-[var(--success)]" : selected.safetyScore >= 60 ? "text-primary" : "text-destructive"
                )}>{selected.safetyScore}%</span>
              </div>
              <Progress value={selected.safetyScore} className="h-2" />
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {selected.safetyScore >= 80 
                  ? 'Geologically stable • Safe for extraction operations' 
                  : selected.safetyScore >= 60 
                  ? 'Moderate stability • Regular monitoring recommended'
                  : 'Critical stability concern • Enhanced safety protocols required'}
              </p>
            </div>

            {selected.secondaryMinerals.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selected.secondaryMinerals.map((m) => (
                  <span key={m} className="rounded border border-border bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                    + {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          {SITES.map((s) => {
            const active = s.id === selectedId
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSite(s.id)}
                className={cn(
                  'mb-1 flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'border-primary/40 bg-primary/8'
                    : 'border-transparent hover:border-border hover:bg-secondary/50',
                )}
              >
                <span
                  className="mt-0.5 size-2.5 shrink-0 rounded-full"
                  style={{ background: RISK_META[s.riskLevel].token }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium text-foreground">{s.name}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {s.primaryMineral} · {s.gradePct}% · {s.district}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-xs text-foreground">{s.confidence}%</span>
                  <span className="block text-[10px] text-muted-foreground">conf.</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
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
