'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { SITES, SHIPMENTS, RISK_META, type DetectionSite } from '@/lib/mdmis-data'
import { MINERAL_HEX } from '@/lib/site-terrain'

// three.js can't parse oklch()/lab() CSS colors, so the globe uses explicit
// hex colors tuned to match the app's theme tokens.
const GLOBE_COLORS = {
  low: '#3fcf8e',
  moderate: '#e6b84d',
  high: '#e6963c',
  critical: '#e65a46',
  arc: '#4bc5d6',
  underground: '#9b6dff',
  subsurface: 'rgba(155, 109, 255, 0.3)',
} as const

interface Props {
  selectedId: string | null
  onSelect: (site: DetectionSite) => void
  showUnderground: boolean
  /** Called if the WebGL context is lost (GPU reset, too many contexts,
   *  driver issue) so the parent can force a clean remount. */
  onContextLost?: () => void
}

export default function GlobeScene({ selectedId, onSelect, showUnderground, onContextLost }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [ready, setReady] = useState(false)

  const colors = GLOBE_COLORS

  // Cleanup on unmount to prevent WebGL context loss
  useEffect(() => {
    return () => {
      if (globeRef.current) {
        const gl = (globeRef.current as any)._renderer?.domElement?.getContext?.('webgl2') || 
                   (globeRef.current as any)._renderer?.domElement?.getContext?.('webgl')
        if (gl && typeof gl.getExtension === 'function') {
          const loseContext = gl.getExtension('WEBGL_lose_context')
          if (loseContext) loseContext.loseContext()
        }
      }
    }
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Recover from a lost WebGL context (e.g. GPU driver reset, or the
  // browser reclaiming a context under memory pressure) instead of leaving
  // the globe permanently blank.
  useEffect(() => {
    if (!ready || !globeRef.current || !onContextLost) return
    const canvas = globeRef.current.renderer().domElement
    const handleLost = (e: Event) => {
      e.preventDefault()
      onContextLost()
    }
    canvas.addEventListener('webglcontextlost', handleLost)
    return () => canvas.removeEventListener('webglcontextlost', handleLost)
  }, [ready, onContextLost])

  // initial camera: center on Rwanda / East Africa
  useEffect(() => {
    if (!ready || !globeRef.current) return
    const g = globeRef.current
    g.pointOfView({ lat: -1.94, lng: 30.06, altitude: 1.8 }, 0)
    const controls = g.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.35
    controls.enableZoom = true
  }, [ready])

  // fly to selected site
  useEffect(() => {
    if (!ready || !globeRef.current || !selectedId) return
    const site = SITES.find((s) => s.id === selectedId)
    if (!site) return
    globeRef.current.pointOfView({ lat: site.lat, lng: site.lng, altitude: 0.6 }, 1200)
    const controls = globeRef.current.controls()
    controls.autoRotate = false
  }, [selectedId, ready])

  const pointColor = (s: DetectionSite) => colors[s.riskLevel]

  const arcs = useMemo(
    () =>
      SHIPMENTS.map((s) => ({
        startLat: s.origin.lat,
        startLng: s.origin.lng,
        endLat: s.destination.lat,
        endLng: s.destination.lng,
        color: s.status === 'delayed' ? colors.critical : colors.arc,
      })),
    [colors],
  )

  // Underground mineral deposits - hexagons showing subsurface layers,
  // colored per mineral (not MINERAL_META.color, which is an oklch() CSS
  // token three.js/react-globe.gl can't render) so deposits of different
  // minerals are visually distinct instead of a uniform purple.
  const subsurfaceData = useMemo(() => {
    if (!showUnderground) return []
    return SITES.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      altitude: -0.01 - (s.depthMeters / 10000), // negative altitude for underground
      size: Math.sqrt(s.estimatedTonnage) / 50,
      color: MINERAL_HEX[s.primaryMineral] ?? colors.underground,
      site: s,
    }))
  }, [showUnderground, colors])

  // Depth visualization - paths from surface to underground deposit
  const depthPaths = useMemo(() => {
    if (!showUnderground || !selectedId) return []
    const site = SITES.find((s) => s.id === selectedId)
    if (!site) return []
    
    return [{
      startLat: site.lat,
      startLng: site.lng,
      startAlt: 0.06,
      endLat: site.lat,
      endLng: site.lng,
      endAlt: -0.01 - (site.depthMeters / 10000),
      color: colors.underground,
    }]
  }, [showUnderground, selectedId, colors])

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        onGlobeReady={() => setReady(true)}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        atmosphereColor={colors.arc}
        atmosphereAltitude={0.18}
        
        // Surface detection points
        pointsData={SITES}
        pointLat={(d) => (d as DetectionSite).lat}
        pointLng={(d) => (d as DetectionSite).lng}
        pointColor={(d) => pointColor(d as DetectionSite)}
        pointAltitude={(d) => {
          const s = d as DetectionSite
          return (s.id === selectedId ? 0.14 : 0.06) + s.estimatedTonnage / 900000
        }}
        pointRadius={(d) => ((d as DetectionSite).id === selectedId ? 0.55 : 0.32)}
        pointLabel={(d) => {
          const s = d as DetectionSite
          return `
            <div style="font-family:var(--font-geist-sans),sans-serif;background:#1a1d23;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 12px;color:#fff;min-width:200px">
              <div style="font-weight:600;font-size:13px;margin-bottom:4px">${s.name}</div>
              <div style="font-size:10px;color:#9aa0a6;margin-bottom:6px">${s.district} · ${s.id}</div>
              <div style="font-size:11px;line-height:1.5;margin-bottom:2px">
                <span style="color:#e6b84d">●</span> ${s.primaryMineral} · ${s.gradePct}% grade
              </div>
              <div style="font-size:11px;line-height:1.5;margin-bottom:2px">
                <span style="color:#4bc5d6">●</span> Depth: ${s.depthMeters}m below surface
              </div>
              <div style="font-size:11px;line-height:1.5;margin-bottom:2px">
                <span style="color:#9b6dff">●</span> Reserve: ${(s.estimatedTonnage / 1000).toFixed(1)}k tonnes
              </div>
              <div style="font-size:11px;line-height:1.5">
                <span style="color:${colors[s.riskLevel]}">●</span> Risk: ${RISK_META[s.riskLevel].label} · Safety ${s.safetyScore}/100
              </div>
            </div>`
        }}
        onPointClick={(d) => onSelect(d as DetectionSite)}
        pointsMerge={false}
        
        // Flagged sites ring indicators
        ringsData={SITES.filter((s) => s.status === 'flagged')}
        ringLat={(d) => (d as DetectionSite).lat}
        ringLng={(d) => (d as DetectionSite).lng}
        ringColor={() => (t: number) => `rgba(230,90,70,${1 - t})`}
        ringMaxRadius={3}
        ringPropagationSpeed={2}
        ringRepeatPeriod={900}
        
        // Transport arcs
        arcsData={arcs}
        arcColor={'color'}
        arcStroke={0.5}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={2500}
        arcAltitudeAutoScale={0.4}
        
        // Underground mineral deposits (hexagons) — height scales with depth
        // below surface (a real "how deep" scale), color keys to mineral type
        // so deposits don't all read as the same undifferentiated blob.
        hexBinPointsData={subsurfaceData}
        hexBinPointLat={(d: any) => d.lat}
        hexBinPointLng={(d: any) => d.lng}
        hexBinPointWeight={(d: any) => d.site.depthMeters}
        hexAltitude={(d: any) => 0.006 + Math.abs(d.sumWeight) * 0.0009}
        hexTopColor={(d: any) => d.points?.[0]?.color ?? colors.underground}
        hexSideColor={(d: any) => d.points?.[0]?.color ?? colors.underground}
        hexBinResolution={4}
        hexMargin={0.2}
        hexLabel={(d: any) => {
          const site = d.points?.[0]?.site
          const color = d.points?.[0]?.color ?? colors.underground
          if (!site) return ''
          return `
            <div style="font-family:var(--font-geist-sans),sans-serif;background:#1a1d23;border:1px solid ${color}66;border-radius:8px;padding:8px 10px;color:#fff">
              <div style="font-weight:600;font-size:11px;color:${color};margin-bottom:3px">⬣ ${site.primaryMineral} deposit</div>
              <div style="font-size:10px;color:#9aa0a6">${site.name} · ${site.depthMeters}m below surface</div>
            </div>`
        }}
        
        // Vertical depth paths (surface to underground)
        pathsData={depthPaths}
        pathPoints={(d: any) => [[d.startLat, d.startLng, d.startAlt], [d.endLat, d.endLng, d.endAlt]]}
        pathPointLat={(p: any) => p[0]}
        pathPointLng={(p: any) => p[1]}
        pathPointAlt={(p: any) => p[2]}
        pathColor={(d: any) => d.color}
        pathStroke={2}
        pathDashLength={0.3}
        pathDashGap={0.15}
        pathDashAnimateTime={3000}
      />
    </div>
  )
}
