'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, MapPin, Layers, Gauge, ShieldAlert, Boxes,
  Drill, Mountain, Scan, Search, X, Globe, ChevronRight,
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

const MapboxGlobe = dynamic(() => import('@/components/map/mapbox-globe'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-6 animate-spin text-primary" />
      <span className="text-sm">Loading satellite globe…</span>
      <span className="text-xs text-muted-foreground/60">Fetching real terrain data</span>
    </div>
  ),
})

function riskTone(level: DetectionSite['riskLevel']) {
  return level === 'low' ? 'success' : level === 'moderate' ? 'warning' : 'danger'
}

// Hex colours matching RISK_META CSS tokens — needed for plain HTML elements
const RISK_HEX: Record<DetectionSite['riskLevel'], string> = {
  low: '#3fcf8e',
  moderate: '#e6b84d',
  high: '#f97316',
  critical: '#ef4444',
}

function Metric({
  icon: Icon, label, value, sub,
}: {
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

export function MapboxExplorer() {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [visibleIds, setVisibleIds] = useState<string[]>(SITES.map((s) => s.id))
  const [mapKey, setMapKey] = useState(0)
  const [query, setQuery] = useState('')

  const selected = SITES.find((s) => s.id === selectedId) ?? null

  // Filter side list: visible-in-viewport AND matching search query
  const filteredSites = SITES.filter((s) => {
    const inViewport = visibleIds.includes(s.id)
    const matchesQuery =
      query.length === 0 ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.district.toLowerCase().includes(query.toLowerCase()) ||
      s.primaryMineral.toLowerCase().includes(query.toLowerCase()) ||
      s.id.toLowerCase().includes(query.toLowerCase())
    return inViewport && matchesQuery
  })

  // Show all sites when search is active and none visible matches — fallback
  const listSites =
    filteredSites.length > 0
      ? filteredSites
      : query.length > 0
      ? SITES.filter(
          (s) =>
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.district.toLowerCase().includes(query.toLowerCase()) ||
            s.primaryMineral.toLowerCase().includes(query.toLowerCase()) ||
            s.id.toLowerCase().includes(query.toLowerCase()),
        )
      : SITES

  const handleSelect = useCallback((site: DetectionSite) => {
    setSelectedId(site.id)
  }, [])

  const handleInspect = useCallback((site: DetectionSite) => {
    router.push(`/map/inspect/${site.id}`)
  }, [router])

  const handleVisibleChange = useCallback((ids: string[]) => {
    setVisibleIds(ids)
  }, [])

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_360px]">
      {/* ── Globe canvas ──────────────────────────────────────────────────── */}
      <div className="relative min-h-[420px] overflow-hidden bg-[#0a0d14]">
        <Map3DErrorBoundary
          label="Satellite globe"
          onRetry={() => setMapKey((k) => k + 1)}
        >
          <MapboxGlobe
            key={mapKey}
            selectedId={selectedId}
            onSelect={handleSelect}
            onInspect={handleInspect}
            onVisibleSitesChange={handleVisibleChange}
          />
        </Map3DErrorBoundary>

        {/* Legend overlay */}
        <div className="pointer-events-none absolute left-4 top-4 space-y-2">
          <div className="rounded-lg border border-white/10 bg-[#1a1d23]/85 p-3 text-xs backdrop-blur">
            <p className="mb-2 flex items-center gap-1.5 font-medium text-white">
              <Layers className="size-3.5 text-primary" /> Detection Sites
            </p>
            <ul className="space-y-1.5">
              {(['low', 'moderate', 'high', 'critical'] as const).map((r) => (
                <li key={r} className="flex items-center gap-2 text-white/60">
                  <span className="size-2 rounded-full" style={{ background: RISK_HEX[r] }} />
                  {RISK_META[r].label} risk
                </li>
              ))}
              <li className="mt-1.5 flex items-center gap-2 border-t border-white/10 pt-1.5 text-white/60">
                <span className="size-2 rounded-full border-2 border-[#9b6dff] bg-transparent" />
                Mineral ring colour
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom hint */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="rounded-full border border-white/10 bg-[#1a1d23]/70 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40 backdrop-blur whitespace-nowrap">
            MDMIS · Real-world satellite terrain · drag · zoom · click a site
          </div>
        </div>

        {/* Selected site quick-action bar (appears when a site is selected) */}
        {selected && (
          <div className="pointer-events-auto absolute bottom-12 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-[#1a1d23]/90 px-4 py-2 backdrop-blur shadow-xl">
              <span
                className="size-2 rounded-full"
                style={{ background: RISK_HEX[selected.riskLevel] }}
              />
              <span className="text-sm font-semibold text-white">{selected.name}</span>
              <span className="mx-1 h-4 w-px bg-white/20" />
              <Button
                size="sm"
                variant="default"
                className="h-7 gap-1.5 rounded-full px-3 text-xs"
                onClick={() => handleInspect(selected)}
              >
                <Mountain className="size-3" />
                Inspect
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Side panel ────────────────────────────────────────────────────── */}
      <div className="flex flex-col overflow-hidden border-t border-border lg:border-l lg:border-t-0">

        {/* Search + header */}
        <div className="border-b border-border px-3 py-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {query ? 'Search results' : visibleIds.length < SITES.length ? `In view (${visibleIds.length})` : 'All sites'}
            </p>
            <span className="rounded-full bg-secondary/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {listSites.length} / {SITES.length}
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sites, minerals, districts…"
              className="h-8 w-full rounded-md border border-border bg-background/60 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Selected site detail card */}
        {selected && (
          <div className="border-b border-border bg-card/40 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground">{selected.name}</h3>
                <p className="font-mono text-xs text-muted-foreground">
                  {selected.id} · {selected.district}
                </p>
              </div>
              <StatusPill tone={riskTone(selected.riskLevel)}>
                {RISK_META[selected.riskLevel].label}
              </StatusPill>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Metric icon={Boxes} label="Primary mineral" value={selected.primaryMineral} sub={MINERAL_META[selected.primaryMineral].commodity} />
              <Metric icon={Gauge} label="Ore grade" value={`${selected.gradePct}%`} sub={`${selected.confidence}% AI conf.`} />
            </div>

            {/* Subsurface profile */}
            <div className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Drill className="size-3.5 text-primary" />
                <p className="text-xs font-medium text-foreground">Subsurface Profile</p>
              </div>
              <div className="space-y-1.5">
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
                <div className="pt-1">
                  <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-accent to-[#9b6dff]"
                      style={{ width: `${Math.min((selected.depthMeters / 100) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                    <span>0m</span><span>50m</span><span>100m+</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Metric
                icon={Layers}
                label="Scan method"
                value={selected.lastScan.includes('T08') || selected.lastScan.includes('T09') ? 'Drone' : 'GPR'}
                sub={timeAgo(selected.lastScan)}
              />
              <Metric icon={ShieldAlert} label="Safety score" value={`${selected.safetyScore}/100`} sub={selected.safetyScore > 70 ? 'Stable' : 'Monitor'} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ShieldAlert className="size-3" /> Subsurface stability
                </span>
                <span className={cn(
                  'font-mono font-semibold',
                  selected.safetyScore >= 80 ? 'text-[var(--success)]' : selected.safetyScore >= 60 ? 'text-primary' : 'text-destructive',
                )}>{selected.safetyScore}%</span>
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

            {/* Inspect CTA */}
            <Button
              className="w-full gap-2"
              onClick={() => handleInspect(selected)}
            >
              <Mountain className="size-3.5" />
              Open Full Terrain Inspection
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
              <button type="button" onClick={() => setQuery('')} className="text-xs text-primary underline">
                Clear search
              </button>
            </div>
          ) : (
            listSites.map((s) => {
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
                    active
                      ? 'border-primary/40 bg-primary/8'
                      : 'border-transparent hover:border-border hover:bg-secondary/50',
                  )}
                >
                  <span
                    className="mt-0.5 size-2.5 shrink-0 rounded-full"
                    style={{ background: RISK_HEX[s.riskLevel] }}
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
                  {active && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleInspect(s) }}
                      className="shrink-0 rounded-md border border-primary/30 bg-primary/10 p-1 hover:bg-primary/20 transition-colors"
                      title="Inspect terrain block"
                    >
                      <Scan className="size-3 text-primary" />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
