'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, MapPin, Layers, Mountain, Scan, Search, X, Globe,
  ArrowLeft, EyeOff, RotateCcw, ChevronDown,
} from 'lucide-react'
import { RISK_META, type DetectionSite } from '@/lib/mdmis-data'
import { fetchSites, type Site } from '@/lib/api/sites'
import { DataSourceCredit } from '@/components/map/data-source-credit'
import { StatusPill } from '@/components/shell/status-pill'
import { Button } from '@/components/ui/button'
import { Map3DErrorBoundary } from '@/components/map/map-3d-boundary'
import { SiteDetails } from '@/components/map/site-details'
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

export function CesiumExplorer() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [sitesLoading, setSitesLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [globeKey, setGlobeKey] = useState(0)
  const [query, setQuery] = useState('')

  // Unified State
  const [viewMode, setViewMode] = useState<'globe' | 'terrain'>('globe')
  const [xray, setXray] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const [mapKey, setMapKey] = useState(0)

  const selected = sites.find((s) => s.id === selectedId) ?? null
  const listRef = useRef<HTMLDivElement>(null)

  // Bring the opened site to the top of the list, whether it was opened here or
  // from its pin on the globe; runs after the dropdown has rendered, so closing
  // the one above it can't push it out of view
  useEffect(() => {
    const list = listRef.current
    if (!list || !selectedId) return
    const raf = requestAnimationFrame(() => {
      const row = list.querySelector<HTMLElement>(`[data-site-id="${CSS.escape(selectedId)}"]`)
      if (!row) return
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // the list is the rows' offset parent (position: relative), so offsetTop is already list-relative
      list.scrollTo({ top: row.offsetTop - 8, behavior: reduce ? 'auto' : 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [selectedId])

  // Fetch real sites once
  useEffect(() => {
    let cancelled = false
    fetchSites()
      .then((data) => { if (!cancelled) setSites(data) })
      .catch((err) => console.error('[MDMIS] Failed to load sites:', err))
      .finally(() => { if (!cancelled) setSitesLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Handle URL parameters for deep linking — wait for sites to load first
  useEffect(() => {
    if (sites.length === 0) return
    const urlParams = new URLSearchParams(window.location.search)
    const siteParam = urlParams.get('site')
    const viewParam = urlParams.get('view')

    if (siteParam && sites.find(s => s.id === siteParam)) {
      setSelectedId(siteParam)
      if (viewParam === 'terrain') {
        setViewMode('terrain')
      }
      // Clean up URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [sites])

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

  // Every site stays in the list wherever the camera is; only the search narrows it
  const q = query.trim().toLowerCase()
  const listSites = q
    ? sites.filter((s) =>
        [s.name, s.district, s.primaryMineral, s.id].some((field) => field.toLowerCase().includes(q)),
      )
    : sites

  const handleSelect  = useCallback((site: DetectionSite) => {
    setSelectedId(site.id)
    // If we select a new site while in terrain mode, we go back to globe for context
    if (viewMode === 'terrain' && site.id !== selectedId) {
      setViewMode('globe')
    }
  }, [selectedId, viewMode])

  // The sidebar is an accordion: one site open at a time, a second click closes it
  const toggleSite = useCallback((site: DetectionSite) => {
    if (site.id === selectedId) {
      setSelectedId(null)
      setViewMode('globe')
      return
    }
    handleSelect(site)
  }, [selectedId, handleSelect])

  const handleInspect = useCallback((site: DetectionSite) => {
    setSelectedId(site.id)
    setViewMode('terrain')
  }, [])

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
              {q ? 'Search results' : 'All sites'}
            </p>
            <span className="rounded-full bg-secondary/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {listSites.length}/{sites.length}
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

        {/* Site list */}
        <div
          ref={listRef}
          className="relative flex-1 overflow-y-auto p-2 scrollbar-thin"
          onKeyDown={(e) => {
            // Escape closes the open site from anywhere in the list and returns focus to its row
            if (e.key !== 'Escape' || !selected) return
            e.preventDefault()
            const id = selected.id
            toggleSite(selected)
            requestAnimationFrame(() => document.getElementById(`site-${id}-toggle`)?.focus())
          }}
        >
          {sitesLoading ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Globe className="size-8 animate-pulse opacity-30" />
              <p className="text-sm">Loading sites…</p>
            </div>
          ) : listSites.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Globe className="size-8 opacity-30" />
              <p className="text-sm">No sites match your search.</p>
              <button type="button" onClick={() => setQuery('')} className="text-xs text-primary underline">Clear search</button>
            </div>
          ) : listSites.map((s) => {
            const open = s.id === selectedId
            return (
              <div
                key={s.id}
                data-site-id={s.id}
                className={cn(
                  'mb-1 rounded-md border transition-colors',
                  open ? 'border-primary/40 bg-primary/8' : 'border-transparent hover:border-border hover:bg-secondary/50',
                )}
              >
                <button
                  type="button"
                  id={`site-${s.id}-toggle`}
                  aria-expanded={open}
                  aria-controls={`site-${s.id}-details`}
                  onClick={() => toggleSite(s)}
                  className="flex w-full cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                  <ChevronDown aria-hidden className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
                </button>

                {open && (
                  <div
                    id={`site-${s.id}-details`}
                    role="region"
                    aria-labelledby={`site-${s.id}-toggle`}
                    className="space-y-3 px-3 pb-3 animate-in fade-in slide-in-from-top-1 duration-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">{s.id} · {s.district}</p>
                        <DataSourceCredit source={s.dataSource} className="mt-0.5" />
                        {s.isShared && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">Demo site · shared with every organisation</p>
                        )}
                      </div>
                      <StatusPill tone={riskTone(s.riskLevel)}>{RISK_META[s.riskLevel].label}</StatusPill>
                    </div>
                    <SiteDetails
                      site={s}
                      inspecting={viewMode === 'terrain'}
                      onInspect={() => handleInspect(s)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
