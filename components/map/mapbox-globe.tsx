'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { KeyRound } from 'lucide-react'
import { SITES, type DetectionSite } from '@/lib/mdmis-data'
import { MINERAL_HEX } from '@/lib/site-terrain'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN

const RISK_HEX: Record<DetectionSite['riskLevel'], string> = {
  low: '#3fcf8e',
  moderate: '#e6b84d',
  high: '#f97316',
  critical: '#ef4444',
}

const STATUS_HEX: Record<DetectionSite['status'], string> = {
  active: '#3fcf8e',
  surveying: '#4bc5d6',
  flagged: '#ef4444',
  depleted: '#6b7280',
}

interface Props {
  selectedId: string | null
  onSelect: (site: DetectionSite) => void
  onInspect: (site: DetectionSite) => void
  onVisibleSitesChange: (ids: string[]) => void
}

function buildSitesGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: SITES.map((s) => ({
      type: 'Feature',
      id: s.id,
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      properties: {
        id: s.id,
        name: s.name,
        district: s.district,
        mineral: s.primaryMineral,
        risk: s.riskLevel,
        status: s.status,
        riskColor: RISK_HEX[s.riskLevel],
        mineralColor: MINERAL_HEX[s.primaryMineral] ?? '#9b6dff',
        statusColor: STATUS_HEX[s.status],
        confidence: s.confidence,
        depth: s.depthMeters,
        grade: s.gradePct,
        tonnage: s.estimatedTonnage,
        safetyScore: s.safetyScore,
      },
    })),
  }
}

type InteractionMode = 'pan' | 'orbit'

export default function MapboxGlobe({ selectedId, onSelect, onInspect, onVisibleSitesChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const popupRef = useRef<mapboxgl.Popup | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mode, setMode] = useState<InteractionMode>('pan')
  const [pitch, setPitch] = useState(0)
  const [bearing, setBearing] = useState(0)
  const orbitRef = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 })
  const modeRef = useRef<InteractionMode>('pan')
  useEffect(() => { modeRef.current = mode }, [mode])

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      // globe = real sphere — the key setting
      projection: 'globe',
      // Start far out so the full sphere is visible
      center: [30.0, -1.9],
      zoom: 1.8,
      pitch: 0,
      bearing: 0,
      antialias: true,
    })

    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-right')

    map.on('pitch', () => setPitch(Math.round(map.getPitch())))
    map.on('rotate', () => setBearing(Math.round(map.getBearing())))

    // ── Orbit mode: left-drag rotates instead of pans ──────────────────────
    const canvas = map.getCanvas()
    const onMouseDown = (e: MouseEvent) => {
      if (modeRef.current !== 'orbit' || e.button !== 0) return
      e.stopPropagation()
      orbitRef.current = { active: true, lastX: e.clientX, lastY: e.clientY }
      canvas.style.cursor = 'grabbing'
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!orbitRef.current.active) return
      const dx = e.clientX - orbitRef.current.lastX
      const dy = e.clientY - orbitRef.current.lastY
      orbitRef.current.lastX = e.clientX
      orbitRef.current.lastY = e.clientY
      map.setBearing(map.getBearing() - dx * 0.35)
      map.setPitch(Math.min(85, Math.max(0, map.getPitch() - dy * 0.35)))
    }
    const onMouseUp = () => {
      if (!orbitRef.current.active) return
      orbitRef.current.active = false
      canvas.style.cursor = modeRef.current === 'orbit' ? 'grab' : ''
    }
    canvas.addEventListener('mousedown', onMouseDown, { capture: true })
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    map.on('dragstart', (e: mapboxgl.MapMouseEvent) => {
      if (modeRef.current === 'orbit' && (e as any).originalEvent?.button === 0) map.dragPan.disable()
    })
    map.on('dragend', () => {
      if (modeRef.current === 'orbit') map.dragPan.enable()
    })

    map.on('load', () => {
      // ── Globe atmosphere — makes it look like Earth from space ─────────────
      map.setFog({
        // The horizon and atmosphere glow
        color: 'rgb(186, 210, 235)',          // light blue horizon
        'high-color': 'rgb(36, 92, 223)',     // deep blue upper atmosphere
        'horizon-blend': 0.02,                // thin, sharp horizon line
        'space-color': 'rgb(11, 11, 25)',     // near-black space
        'star-intensity': 0.6,
      })

      // ── Real 3-D terrain ───────────────────────────────────────────────────
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 3.0 })

      // ── Sky layer — daytime blue, no dark band ─────────────────────────────
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 60.0],
          'sky-atmosphere-sun-intensity': 12,
          'sky-atmosphere-color': 'rgba(135, 206, 235, 1)',
          'sky-atmosphere-halo-color': 'rgba(255, 255, 255, 0.5)',
        },
      })

      // ── Sites source + layers ──────────────────────────────────────────────
      map.addSource('sites', { type: 'geojson', data: buildSitesGeoJSON() })

      // Glow halo
      map.addLayer({
        id: 'sites-halo',
        type: 'circle',
        source: 'sites',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 8, 6, 14, 10, 22, 14, 32],
          'circle-color': ['get', 'riskColor'],
          'circle-opacity': 0.22,
          'circle-blur': 0.5,
          'circle-pitch-alignment': 'map',
        },
      })
      // Mineral ring
      map.addLayer({
        id: 'sites-ring',
        type: 'circle',
        source: 'sites',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 5, 6, 9, 10, 15, 14, 22],
          'circle-color': 'transparent',
          'circle-stroke-width': 2,
          'circle-stroke-color': ['get', 'mineralColor'],
          'circle-stroke-opacity': 0.9,
          'circle-pitch-alignment': 'map',
        },
      })
      // Core dot
      map.addLayer({
        id: 'sites-dot',
        type: 'circle',
        source: 'sites',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 4, 6, 7, 10, 11, 14, 16],
          'circle-color': ['get', 'riskColor'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 1,
          'circle-pitch-alignment': 'map',
        },
      })
      // Selected ring
      map.addLayer({
        id: 'sites-selected',
        type: 'circle',
        source: 'sites',
        filter: ['==', ['get', 'id'], selectedId ?? ''],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 9, 6, 14, 10, 22, 14, 32],
          'circle-color': 'transparent',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 1,
          'circle-pitch-alignment': 'map',
        },
      })
      // Labels (zoom 7+)
      map.addLayer({
        id: 'sites-labels',
        type: 'symbol',
        source: 'sites',
        minzoom: 7,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 7, 11, 13, 15],
          'text-offset': [0, 1.8],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 8.5, 1],
        },
      })
      // Flagged pulse ring
      map.addLayer({
        id: 'sites-flagged',
        type: 'circle',
        source: 'sites',
        filter: ['==', ['get', 'status'], 'flagged'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 10, 6, 17, 10, 26, 14, 38],
          'circle-color': 'transparent',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ef4444',
          'circle-stroke-opacity': 0.6,
          'circle-pitch-alignment': 'map',
        },
      })

      // Visibility tracking
      const reportVisible = () => {
        const bounds = map.getBounds()
        if (!bounds) return
        onVisibleSitesChange(
          SITES.filter(s =>
            s.lat >= bounds.getSouth() && s.lat <= bounds.getNorth() &&
            s.lng >= bounds.getWest() && s.lng <= bounds.getEast()
          ).map(s => s.id)
        )
      }
      map.on('moveend', reportVisible)
      map.on('zoomend', reportVisible)
      reportVisible()

      setMapLoaded(true)
    })

    // Hover cursor
    map.on('mouseenter', 'sites-dot', () => {
      if (modeRef.current === 'pan') canvas.style.cursor = 'pointer'
    })
    map.on('mouseleave', 'sites-dot', () => {
      canvas.style.cursor = modeRef.current === 'orbit' ? 'grab' : ''
    })

    // Click → select + popup
    map.on('click', ['sites-dot', 'sites-halo', 'sites-ring'], (e) => {
      if (!e.features?.length) return
      const props = e.features[0].properties as {
        id: string; name: string; district: string; mineral: string
        confidence: number; depth: number; grade: number
        riskColor: string; mineralColor: string; safetyScore: number
        status: string; statusColor: string
      }
      const site = SITES.find(s => s.id === props.id)
      if (!site) return
      onSelect(site)
      popupRef.current?.remove()

      const popup = new mapboxgl.Popup({
        closeButton: true, closeOnClick: false,
        className: 'mdmis-mapbox-popup', maxWidth: '264px', offset: [0, -12],
      })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="mdmis-popup">
            <div class="mdmis-popup-header">
              <span class="mdmis-popup-dot" style="background:${props.riskColor}"></span>
              <span class="mdmis-popup-name">${props.name}</span>
            </div>
            <div class="mdmis-popup-meta">${props.district} · ${props.id}</div>
            <div class="mdmis-popup-rows">
              <div class="mdmis-popup-row"><span class="mdmis-popup-label">Mineral</span><span class="mdmis-popup-value" style="color:${props.mineralColor}">${props.mineral}</span></div>
              <div class="mdmis-popup-row"><span class="mdmis-popup-label">Grade</span><span class="mdmis-popup-value">${props.grade}%</span></div>
              <div class="mdmis-popup-row"><span class="mdmis-popup-label">Depth</span><span class="mdmis-popup-value">${props.depth}m</span></div>
              <div class="mdmis-popup-row"><span class="mdmis-popup-label">AI Conf.</span><span class="mdmis-popup-value">${props.confidence}%</span></div>
              <div class="mdmis-popup-row"><span class="mdmis-popup-label">Safety</span><span class="mdmis-popup-value">${props.safetyScore}/100</span></div>
              <div class="mdmis-popup-row"><span class="mdmis-popup-label">Status</span><span class="mdmis-popup-value" style="color:${props.statusColor}">${props.status}</span></div>
            </div>
            <button class="mdmis-popup-inspect" id="inspect-btn-${site.id}">🔬 Inspect Terrain Block</button>
          </div>
        `)
        .addTo(map)

      popupRef.current = popup
      popup.on('open', () => {
        document.getElementById(`inspect-btn-${site.id}`)?.addEventListener('click', () => {
          popup.remove()
          onInspect(site)
        })
      })
    })

    // Cinematic intro: start showing the full globe, slowly zoom into Africa
    setTimeout(() => {
      map.flyTo({
        center: [30.0, -1.9],
        zoom: 4.5,
        pitch: 0,
        bearing: 0,
        duration: 4000,
        essential: true,
      })
    }, 500)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown, { capture: true })
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      popupRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync selected filter
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    map.getLayer('sites-selected') &&
      map.setFilter('sites-selected', ['==', ['get', 'id'], selectedId ?? ''])
  }, [selectedId, mapLoaded])

  // Fly to site — zoom close enough that terrain relief is visible
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || !selectedId) return
    const site = SITES.find(s => s.id === selectedId)
    if (!site) return
    popupRef.current?.remove()
    map.flyTo({
      center: [site.lng, site.lat],
      zoom: 13.5,
      pitch: 62,
      bearing: -28,
      duration: 2400,
      essential: true,
    })
  }, [selectedId, mapLoaded])

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = mode === 'orbit' ? 'grab' : ''
  }, [mode])

  function resetView() {
    mapRef.current?.flyTo({ center: [30.0, -1.9], zoom: 4.5, pitch: 0, bearing: 0, duration: 1800, essential: true })
  }

  function setPitchTo(p: number) {
    mapRef.current?.easeTo({ pitch: p, duration: 500 })
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#0a0d14] p-8 text-center">
        <KeyRound className="size-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">Mapbox token not configured</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            The satellite globe needs a free Mapbox public token. Get one at{' '}
            <span className="text-foreground">mapbox.com/account/access-tokens</span>, then add it to{' '}
            <span className="font-mono text-foreground">frontend/.env.local</span> as{' '}
            <span className="font-mono text-foreground">NEXT_PUBLIC_MAPBOX_TOKEN</span> and restart the dev server.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <style>{`
        .mapboxgl-popup-content{background:transparent!important;padding:0!important;box-shadow:none!important}
        .mapboxgl-popup-tip{border-top-color:#141720!important}
        .mdmis-mapbox-popup .mapboxgl-popup-close-button{color:rgba(255,255,255,0.6);font-size:16px;right:6px;top:4px;background:transparent;border:none;z-index:10;line-height:1}
        .mdmis-mapbox-popup .mapboxgl-popup-close-button:hover{color:#fff;background:rgba(255,255,255,0.1);border-radius:4px}
        .mdmis-popup{background:#141720;border:1px solid rgba(255,255,255,0.14);border-radius:11px;padding:13px 15px 11px;min-width:228px;font-family:var(--font-geist-sans,system-ui,sans-serif);box-shadow:0 12px 40px rgba(0,0,0,0.7)}
        .mdmis-popup-header{display:flex;align-items:center;gap:8px;margin-bottom:3px}
        .mdmis-popup-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
        .mdmis-popup-name{font-weight:700;font-size:13px;color:#fff;line-height:1.2}
        .mdmis-popup-meta{font-size:10px;color:rgba(255,255,255,0.42);margin-bottom:10px;padding-left:17px}
        .mdmis-popup-rows{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;margin-bottom:11px}
        .mdmis-popup-row{display:flex;flex-direction:column;gap:1px}
        .mdmis-popup-label{font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,0.38)}
        .mdmis-popup-value{font-size:12px;font-weight:600;color:#fff;font-variant-numeric:tabular-nums}
        .mdmis-popup-inspect{width:100%;background:linear-gradient(135deg,#2d6a4f,#1a4731);border:1px solid rgba(63,207,142,0.4);border-radius:7px;color:#3fcf8e;font-size:11px;font-weight:600;padding:8px 10px;cursor:pointer;text-align:center;font-family:inherit;letter-spacing:.02em;transition:background .15s,border-color .15s}
        .mdmis-popup-inspect:hover{background:linear-gradient(135deg,#3a8a63,#235f42);border-color:rgba(63,207,142,0.75)}
      `}</style>

      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* ── Overlay controls ─────────────────────────────────────────────── */}
      <div className="pointer-events-auto absolute bottom-10 right-4 flex flex-col gap-1.5">
        {/* Pan / Orbit */}
        <div className="flex overflow-hidden rounded-lg border border-white/15 bg-[#141720]/92 shadow-xl backdrop-blur">
          {(['pan', 'orbit'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'text-white/55 hover:text-white hover:bg-white/10'}`}
            >
              {m === 'pan' ? (
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-4 0v0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
              ) : (
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M22 12 18 8l-4 4"/><path d="M2 12h4"/><path d="M12 2v4"/></svg>
              )}
              {m === 'pan' ? 'Pan' : 'Orbit'}
            </button>
          ))}
        </div>
        {/* Pitch presets */}
        <div className="flex overflow-hidden rounded-lg border border-white/15 bg-[#141720]/92 shadow-xl backdrop-blur">
          {([0, 30, 60, 80] as const).map((p) => (
            <button key={p} type="button" onClick={() => setPitchTo(p)}
              className={`flex-1 px-2.5 py-1.5 font-mono text-[10px] font-semibold transition-colors ${Math.abs(pitch - p) < 9 ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white hover:bg-white/10'}`}
            >{p}°</button>
          ))}
        </div>
        {/* Home */}
        <button type="button" onClick={resetView}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-[#141720]/92 px-3 py-1.5 text-[10px] font-semibold text-white/60 shadow-xl backdrop-blur hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          Globe view
        </button>
      </div>

      {/* Hint */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="rounded-full border border-white/10 bg-[#141720]/70 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40 backdrop-blur whitespace-nowrap">
          {mode === 'orbit' ? 'ORBIT · drag to rotate & tilt · scroll to zoom' : 'PAN · drag to move · scroll to zoom · click a site'}
        </div>
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute right-16 top-4 flex items-center gap-2 rounded-lg border border-white/10 bg-[#141720]/72 px-3 py-1.5 backdrop-blur">
        <span className="font-mono text-[9px] text-white/45 uppercase">Tilt</span>
        <span className="font-mono text-xs font-bold text-white">{pitch}°</span>
        <span className="mx-1 h-3 w-px bg-white/20" />
        <span className="font-mono text-[9px] text-white/45 uppercase">Hdg</span>
        <span className="font-mono text-xs font-bold text-white">{((bearing % 360) + 360) % 360}°</span>
      </div>
    </div>
  )
}
