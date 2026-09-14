'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, MapPin, Layers, Gauge, ShieldAlert, Boxes,
  Drill, Mountain, Scan, Search, X, Globe, ChevronRight,
  ArrowLeft, EyeOff, RotateCcw,
} from 'lucide-react'
import {
  SITES, RISK_META, MINERAL_META, fmtNumber, timeAgo,
  type DetectionSite,
} from '@/lib/mdmis-data'
import { StatusPill } from '@/components/shell/status-pill'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Map3DErrorBoundary } from '@/components/map/map-3d-boundary'
import { cn } from '@/lib/utils'

const CesiumGlobe = dynamic(() => import('@/components/map/cesium-globe'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#05080f] text-muted-foreground">
      <Loader2 className="size-7 animate-spin text-primary" />
      <span className="text-sm font-medium text-white/70">Loading 3D globe…</span>
      <span className="text-xs text-white/30">Cesium World Terrain · Bing satellite imagery</span>
    </div>
  ),
})

const SiteTerrainBlock = dynamic(() => import('@/components/map/site-terrain-block'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground bg-[oklch(0.13_0.01_250)]">
      <Loader2 className="mr-2 size-5 animate-spin" />
      <span className="text-sm">Carving subsurface terrain block…</span>
    </div>
  ),
})

function riskTone(level: DetectionSite['riskLevel']) {
  return level === 'low' ? 'success' : level === 'moderate' ? 'warning' : 'danger'
}

const RISK_HEX: Record<DetectionSite['riskLevel'], string> = {
  low: '#3fcf8e', moderate: '#e6b84d', high: '#f97316', critical: '#ef4444',
}

function Metric({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string; sub: string
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

export function CesiumExplorer() {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [visibleIds, setVisibleIds] = useState(() => SITES.map((s) => s.id))
  const [globeKey, setGlobeKey] = useState(0)
  const [query, setQuery] = useState('')

  // Unified State
  const [viewMode, setViewMode] = useState<'globe' | 'terrain'>('globe')
  const [xray, setXray] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const [mapKey, setMapKey] = useState(0)

  const selected = SITES.find((s) => s.id === selectedId) ?? null

  // Handle URL parameters for deep linking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const siteParam = urlParams.get('site')
    const viewParam = urlParams.get('view')
    
    if (siteParam && SITES.find(s => s.id === siteParam)) {
      setSelectedId(siteParam)
      if (viewParam === 'terrain') {
        setViewMode('terrain')
      }
      // Clean up URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [])

  // Listen for the inspect event dispatched by the Cesium overlay button
  useEffect(() => {
    const handler = (e: Event) => {
      const siteId = (e as CustomEvent<{ siteId: string }>).detail.siteId
      setSelectedId(siteId)
      setViewMode('terrain')
    }
    window.addEventListener('cesium:inspect', handler)
    return () => window.removeEventListener('cesium:inspect', handler)
  }, [])

  const filteredSites = SITES.filter((s) => {
    const inView = visibleIds.includes(s.id)
    const match =
      query.length === 0 ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.district.toLowerCase().includes(query.toLowerCase()) ||
      s.primaryMineral.toLowerCase().includes(query.toLowerCase()) ||
      s.id.toLowerCase().includes(query.toLowerCase())
    return inView && match
  })

  const listSites =
    filteredSites.length > 0
      ? filteredSites
      : query.length > 0
      ? SITES.filter((s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.district.toLowerCase().includes(query.toLowerCase()) ||
          s.primaryMineral.toLowerCase().includes(query.toLowerCase()) ||
          s.id.toLowerCase().includes(query.toLowerCase()),
        )
      : SITES

  const handleSelect  = useCallback((site: DetectionSite) => {
    setSelectedId(site.id)
    // If we select a new site while in terrain mode, we go back to globe for context
    if (viewMode === 'terrain' && site.id !== selectedId) {
      setViewMode('globe')
    }
  }, [selectedId, viewMode])

  const handleInspect = useCallback((site: DetectionSite) => {
    setSelectedId(site.id)
    setViewMode('terrain')
  }, [])

  const handleVisible = useCallback((ids: string[]) => setVisibleIds(ids), [])

  return (
    <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[1fr_320px] lg:grid-rows-1 lg:grid-cols-[1fr_340px]">

      {/* ── 3D View Container ────────────────────────────────────────────── */}
      <div className="relative h-full min-h-[380px] overflow-hidden bg-[#05080f]">
        <Map3DErrorBoundary
          label={viewMode === 'terrain' ? '3D terrain block' : '3D globe'}
          onRetry={() => {
            setGlobeKey((k) => k + 1)
            setMapKey((k) => k + 1)
          }}
        >
          {viewMode === 'terrain' && selected ? (
            <div className="h-full w-full bg-[oklch(0.13_0.01_250)]">
              <SiteTerrainBlock
                key={mapKey}
                site={selected}
                xray={xray}
                resetSignal={resetSignal}
                onContextLost={() => setMapKey((k) => k + 1)}
              />
            </div>
          ) : (
            <CesiumGlobe
              key={globeKey}
              selectedId={selectedId}
              onSelect={handleSelect}
              onInspect={handleInspect}
              onVisibleSitesChange={handleVisible}
            />
          )}
        </Map3DErrorBoundary>

        {/* Legend (Globe Only) */}
        {viewMode === 'globe' && (
          <div className="pointer-events-none absolute left-4 top-4">
            <div className="rounded-lg border border-white/10 bg-[#0a0d18]/88 p-3 text-xs backdrop-blur">
              <p className="mb-2 flex items-center gap-1.5 font-semibold text-white">
                <Layers className="size-3.5 text-primary" /> Mining Sites
              </p>
              <ul className="space-y-1.5">
                {(['low', 'moderate', 'high', 'critical'] as const).map((r) => (
                  <li key={r} className="flex items-center gap-2 text-white/55">
                    <span className="size-2 rounded-full" style={{ background: RISK_HEX[r] }} />
                    {RISK_META[r].label} risk
                  </li>
                ))}
                <li className="mt-1.5 flex items-center gap-2 border-t border-white/10 pt-1.5 text-white/55">
                  <span className="size-2 rounded-full border-2 border-[#9b6dff] bg-transparent" />
                  Mineral ring colour
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Terrain Controls Overlay */}
        {viewMode === 'terrain' && selected && (
          <div className="pointer-events-auto absolute left-4 top-4 space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('globe')}
              className="gap-2 border-white/15 bg-[#0a0d18]/85 text-white backdrop-blur hover:bg-white/10"
            >
              <ArrowLeft className="size-3.5" />
              Back to global globe
            </Button>
            <div className="rounded-lg border border-white/15 bg-[#0a0d18]/85 p-3 text-xs text-white backdrop-blur">
              <p className="mb-1 flex items-center gap-1.5 font-medium">
                <Mountain className="size-3.5 text-primary" /> {selected.name}
              </p>
              <p className="text-white/60">
                {selected.primaryMineral} deposit · {selected.depthMeters}m depth
              </p>
            </div>
            <Button
              variant={xray ? 'default' : 'outline'}
              size="sm"
              onClick={() => setXray(!xray)}
              className={cn(
                'w-full justify-start gap-2 border-white/15 backdrop-blur',
                !xray && 'bg-[#0a0d18]/85 text-white hover:bg-white/10'
              )}
            >
              {xray ? <EyeOff className="size-3.5" /> : <Scan className="size-3.5" />}
              {xray ? 'Solid Ground' : 'X-Ray View'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetSignal((n) => n + 1)}
              className="w-full justify-start gap-2 border-white/15 bg-[#0a0d18]/85 text-white backdrop-blur hover:bg-white/10"
            >
              <RotateCcw className="size-3.5" />
              Reset View
            </Button>
          </div>
        )}

        {/* Selected pill (Globe Only) */}
        {viewMode === 'globe' && selected && (
          <div className="pointer-events-auto absolute bottom-14 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-[#0a0d18]/92 px-4 py-2 shadow-xl backdrop-blur">
              <span className="size-2 rounded-full" style={{ background: RISK_HEX[selected.riskLevel] }} />
              <span className="text-sm font-semibold text-white">{selected.name}</span>
              <span className="mx-1 h-4 w-px bg-white/20" />
              <Button size="sm" variant="default"
                className="h-7 gap-1.5 rounded-full px-3 text-xs"
                onClick={() => handleInspect(selected)}
              >
                <Mountain className="size-3" /> Inspect
              </Button>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-widest text-white/40">
          {viewMode === 'terrain'
            ? 'MDMIS · Subsurface Terrain Block · drag to orbit · scroll to zoom'
            : 'MDMIS · 3D Satellite Globe · drag · zoom · click sites'}
        </div>
      </div>

      {/* ── Side panel ───────────────────────────────────────────────────── */}
      <div className="flex flex-col overflow-hidden border-t border-border lg:border-l lg:border-t-0">

        {/* Header + search */}
        <div className="space-y-2.5 border-b border-border px-3 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {query ? 'Search results' : visibleIds.length < SITES.length ? `In view (${visibleIds.length})` : 'All sites'}
            </p>
            <span className="rounded-full bg-secondary/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {listSites.length}/{SITES.length}
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sites, minerals, districts…"
              className="h-8 w-full rounded-md border border-border bg-background/60 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Selected site card */}
        {selected && (
          <div className="space-y-3 border-b border-border bg-card/40 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground">{selected.name}</h3>
                <p className="font-mono text-xs text-muted-foreground">{selected.id} · {selected.district}</p>
              </div>
              <StatusPill tone={riskTone(selected.riskLevel)}>{RISK_META[selected.riskLevel].label}</StatusPill>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Metric icon={Boxes} label="Primary mineral" value={selected.primaryMineral} sub={MINERAL_META[selected.primaryMineral].commodity} />
              <Metric icon={Gauge} label="Ore grade" value={`${selected.gradePct}%`} sub={`${selected.confidence}% AI conf.`} />
            </div>

            <div className="rounded-md border border-border bg-background/40 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Drill className="size-3.5 text-primary" />
                <p className="text-xs font-medium text-foreground">Subsurface Profile</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Depth to deposit</span>
                  <span className="font-mono text-foreground">{selected.depthMeters}m</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Est. reserve</span>
                  <span className="font-mono text-foreground">{fmtNumber(selected.estimatedTonnage)} t</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Geological layer</span>
                  <span className="font-mono text-foreground">
                    {selected.depthMeters < 30 ? 'Weathered Zone' : selected.depthMeters < 60 ? 'Saprolite' : 'Bedrock'}
                  </span>
                </div>
                <div className="pt-1">
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-accent to-[#9b6dff]"
                      style={{ width: `${Math.min((selected.depthMeters / 100) * 100, 100)}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                    <span>0m</span><span>50m</span><span>100m+</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Metric icon={Layers} label="Scan method"
                value={selected.lastScan.includes('T08') || selected.lastScan.includes('T09') ? 'Drone' : 'GPR'}
                sub={timeAgo(selected.lastScan)} />
              <Metric icon={ShieldAlert} label="Safety score"
                value={`${selected.safetyScore}/100`} sub={selected.safetyScore > 70 ? 'Stable' : 'Monitor'} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ShieldAlert className="size-3" /> Stability
                </span>
                <span className={cn('font-mono font-semibold',
                  selected.safetyScore >= 80 ? 'text-[var(--success)]' :
                  selected.safetyScore >= 60 ? 'text-primary' : 'text-destructive')}>
                  {selected.safetyScore}%
                </span>
              </div>
              <Progress value={selected.safetyScore} className="h-1.5" />
            </div>

            {selected.secondaryMinerals.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selected.secondaryMinerals.map((m) => (
                  <span key={m} className="rounded border border-border bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                    + {m}
                  </span>
                ))}
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={() => handleInspect(selected)}
              disabled={viewMode === 'terrain'}
            >
              <Mountain className="size-3.5" />
              {viewMode === 'terrain' ? 'Viewing Terrain Inspection' : 'Open Full Terrain Inspection'}
              <ChevronRight className="ml-auto size-3.5" />
            </Button>
          </div>
        )}

        {/* Site list */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          {listSites.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Globe className="size-8 opacity-30" />
              <p className="text-sm">No sites match your search.</p>
              <button type="button" onClick={() => setQuery('')} className="text-xs text-primary underline">Clear search</button>
            </div>
          ) : listSites.map((s) => {
            const active = s.id === selectedId
            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(s)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelect(s)
                  }
                }}
                className={cn(
                  'mb-1 flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors cursor-pointer select-none',
                  active ? 'border-primary/40 bg-primary/8' : 'border-transparent hover:border-border hover:bg-secondary/50',
                )}
              >
                <span className="mt-0.5 size-2.5 shrink-0 rounded-full" style={{ background: RISK_HEX[s.riskLevel] }} />
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
                {active && (
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); handleInspect(s) }}
                    className={cn(
                      "shrink-0 rounded-md border p-1 transition-colors",
                      viewMode === 'terrain'
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                    title="Inspect terrain block"
                  >
                    <Scan className="size-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
