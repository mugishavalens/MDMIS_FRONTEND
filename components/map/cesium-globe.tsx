'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { DetectionSite } from '@/lib/mdmis-data'
import { SITES, SHIPMENTS } from '@/lib/mdmis-data'
import { MINERAL_HEX } from '@/lib/site-terrain'
import { 
  RotateCcw, ZoomIn, ZoomOut, Compass, Eye, EyeOff, 
  Layers, Navigation2, Drill, Truck, Mountain
} from 'lucide-react'

// ── Risk colours (plain hex — no CSS vars inside Cesium canvas) ───────────────
const RISK_HEX: Record<DetectionSite['riskLevel'], string> = {
  low:      '#3fcf8e',
  moderate: '#e6b84d',
  high:     '#f97316',
  critical: '#ef4444',
}

const STATUS_LABEL: Record<DetectionSite['status'], string> = {
  active:    'Active',
  surveying: 'Surveying',
  flagged:   'Flagged ⚠',
  depleted:  'Depleted',
}

export type BaseLayerType = 'satellite' | 'terrain' | 'streets'

interface Props {
  selectedId:           string | null
  onSelect:             (site: DetectionSite) => void
  onInspect:            (site: DetectionSite) => void
  onVisibleSitesChange: (ids: string[]) => void
}

/**
 * Robust loader that guarantees Cesium global is fully loaded and ready in the browser.
 */
function ensureCesium(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return

    ;(window as any).CESIUM_BASE_URL = '/cesium/'

    if ((window as any).Cesium) {
      resolve((window as any).Cesium)
      return
    }

    // Ensure stylesheet is in head
    if (!document.querySelector('link[href*="widgets.css"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = '/cesium/Widgets/widgets.css'
      document.head.appendChild(link)
    }

    let script = document.querySelector('script[src*="Cesium.js"]') as HTMLScriptElement
    if (!script) {
      script = document.createElement('script')
      script.src = '/cesium/Cesium.js'
      script.async = true
      document.head.appendChild(script)
    }

    let attempts = 0
    const maxAttempts = 100 // 10 seconds timeout

    const checkInterval = setInterval(() => {
      attempts++
      if ((window as any).Cesium) {
        clearInterval(checkInterval)
        ;(window as any).CESIUM_BASE_URL = '/cesium/'
        resolve((window as any).Cesium)
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval)
        reject(new Error('Cesium library failed to load within timeout.'))
      }
    }, 100)

    script.addEventListener('load', () => {
      if ((window as any).Cesium) {
        clearInterval(checkInterval)
        ;(window as any).CESIUM_BASE_URL = '/cesium/'
        resolve((window as any).Cesium)
      }
    })

    script.addEventListener('error', (err) => {
      clearInterval(checkInterval)
      reject(err)
    })
  })
}

export default function CesiumGlobe({
  selectedId,
  onSelect,
  onInspect,
  onVisibleSitesChange,
}: Props) {
  const containerRef     = useRef<HTMLDivElement>(null)
  const viewerRef        = useRef<any>(null)
  const entitiesRef      = useRef<Map<string, any>>(new Map())
  const corridorsRef     = useRef<any[]>([])
  const depthPillarsRef  = useRef<any[]>([])

  const [is3D, setIs3D]                         = useState(true)
  const [showDepthPillars, setShowDepthPillars] = useState(true)
  const [showCorridors, setShowCorridors]       = useState(true)
  const [showLabels, setShowLabels]             = useState(true)
  const [activeBaseLayer, setActiveBaseLayer]   = useState<BaseLayerType>('satellite')
  const [layersMenuOpen, setLayersMenuOpen]     = useState(false)
  const [isLoaded, setIsLoaded]                 = useState(false)

  // ── Initialise once — wait for global Cesium ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return

    let destroyed = false
    let resizeObserver: ResizeObserver | null = null

    ensureCesium()
      .then((Cesium) => {
        if (destroyed || !containerRef.current || viewerRef.current) return

        try {
          // ── Create Cesium Viewer with zero-dependency synchronous baseLayer ─────
          const viewer = new Cesium.Viewer(containerRef.current!, {
            baseLayer: false, // We add imagery providers explicitly below
            terrainProvider: new Cesium.EllipsoidTerrainProvider(),
            animation:                              false,
            baseLayerPicker:                        false,
            fullscreenButton:                       false,
            geocoder:                               false,
            homeButton:                             false,
            infoBox:                                false,
            sceneModePicker:                        false,
            selectionIndicator:                     false,
            timeline:                               false,
            navigationHelpButton:                   false,
            navigationInstructionsInitiallyVisible: false,
            requestRenderMode:                      false,
            useBrowserRecommendedResolution:        true,
            shadows:                                false,
          })

          viewerRef.current = viewer
          const scene = viewer.scene
          const globe = scene.globe

          // ── Add Base Imagery Layer (High-Resolution Esri World Imagery) ───
          const defaultImagery = new Cesium.UrlTemplateImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 19,
            credit: 'Esri World Imagery',
          })
          viewer.imageryLayers.addImageryProvider(defaultImagery)

          // ── Visual enhancements ───────────────────────────────────────────
          scene.fog.enabled                   = true
          scene.fog.density                   = 0.00012
          scene.fog.minimumBrightness         = 0.2
          scene.skyAtmosphere.show            = true
          scene.skyAtmosphere.hueShift        = 0.0
          scene.skyAtmosphere.saturationShift = 0.1
          scene.skyAtmosphere.brightnessShift = 0.05

          scene.light = new Cesium.SunLight()
          globe.enableLighting                = true
          globe.dynamicAtmosphereLightingFromSun = true

          // ── Set initial camera to center over Rwanda ───────────────────────
          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(29.95, -1.94, 900_000),
            orientation: {
              heading: Cesium.Math.toRadians(0),
              pitch:   Cesium.Math.toRadians(-45),
              roll:    0,
            },
          })

          // ── Plot all mine sites & Subsurface Depth Pillars ─────────────────
          SITES.forEach((site) => {
            const canvas = document.createElement('canvas')
            canvas.width  = 44
            canvas.height = 44
            const ctx = canvas.getContext('2d')!

            // Outer ring (mineral colour)
            ctx.beginPath()
            ctx.arc(22, 22, 19, 0, Math.PI * 2)
            ctx.strokeStyle = MINERAL_HEX[site.primaryMineral] ?? '#9b6dff'
            ctx.lineWidth   = 3.5
            ctx.stroke()

            // Core dot (risk colour)
            ctx.beginPath()
            ctx.arc(22, 22, 11, 0, Math.PI * 2)
            ctx.fillStyle = RISK_HEX[site.riskLevel]
            ctx.fill()

            // White border on core
            ctx.beginPath()
            ctx.arc(22, 22, 11, 0, Math.PI * 2)
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth   = 2.0
            ctx.stroke()

            // Site Billboard Entity
            const entity = viewer.entities.add({
              id:       site.id,
              name:     site.name,
              position: Cesium.Cartesian3.fromDegrees(site.lng, site.lat, 0),
              billboard: {
                image:                    canvas,
                width:                    44,
                height:                   44,
                verticalOrigin:           Cesium.VerticalOrigin.CENTER,
                horizontalOrigin:         Cesium.HorizontalOrigin.CENTER,
                heightReference:          Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scaleByDistance:          new Cesium.NearFarScalar(1_000, 1.4, 8_000_000, 0.4),
              },
              label: {
                text:                     site.name,
                font:                     'bold 13px system-ui, sans-serif',
                fillColor:                Cesium.Color.WHITE,
                outlineColor:             Cesium.Color.fromCssColorString('#0a0d18ee'),
                outlineWidth:             4,
                style:                    Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin:           Cesium.VerticalOrigin.BOTTOM,
                pixelOffset:              new Cesium.Cartesian2(0, -28),
                heightReference:          Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                translucencyByDistance:   new Cesium.NearFarScalar(200_000, 1.0, 4_000_000, 0.0),
                scaleByDistance:          new Cesium.NearFarScalar(10_000, 1.1, 1_000_000, 0.7),
              },
            })

            entitiesRef.current.set(site.id, entity)

            // Subsurface Depth Beacon (Vertical 3D Pillar)
            const minHex = MINERAL_HEX[site.primaryMineral] ?? '#9b6dff'
            const depthPillar = viewer.entities.add({
              name: `${site.name} Subsurface Depth Beacon`,
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                  site.lng, site.lat, 0,
                  site.lng, site.lat, 1200 + site.depthMeters * 40,
                ]),
                width: 3.0,
                material: new Cesium.PolylineGlowMaterialProperty({
                  glowPower: 0.3,
                  taperPower: 0.6,
                  color: Cesium.Color.fromCssColorString(minHex),
                }),
                clampToGround: false,
              },
            })
            depthPillarsRef.current.push(depthPillar)
          })

          // ── Plot Active Transport Corridors ───────────────────────────────
          SHIPMENTS.forEach((shp) => {
            const isDelayed = shp.status === 'delayed'
            const arcColor = isDelayed ? '#ef4444' : '#4bc5d6'

            const corridor = viewer.entities.add({
              name: `Corridor: ${shp.origin.name} → ${shp.destination.name}`,
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray([
                  shp.origin.lng, shp.origin.lat,
                  shp.destination.lng, shp.destination.lat,
                ]),
                width: 3.5,
                arcType: Cesium.ArcType.GEODESIC,
                material: new Cesium.PolylineDashMaterialProperty({
                  color: Cesium.Color.fromCssColorString(arcColor),
                  dashLength: 20.0,
                }),
                clampToGround: true,
              },
            })
            corridorsRef.current.push(corridor)
          })

          // ── Click & Double Click Event Handling ───────────────────────────
          const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas)

          handler.setInputAction((click: any) => {
            const picked = scene.pick(click.position)
            if (!picked?.id?.id) return
            const site = SITES.find((s) => s.id === picked.id.id)
            if (!site) return
            onSelect(site)
            flyToSite(viewer, Cesium, site)
            showInfoOverlay(site)
          }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

          handler.setInputAction((click: any) => {
            const picked = scene.pick(click.position)
            if (!picked?.id?.id) return
            const site = SITES.find((s) => s.id === picked.id.id)
            if (site) onInspect(site)
          }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)

          // ── Visibility Tracking on Camera Move ────────────────────────────
          scene.camera.changed.addEventListener(() => {
            reportVisible(viewer, Cesium, onVisibleSitesChange)
          })
          setTimeout(() => reportVisible(viewer, Cesium, onVisibleSitesChange), 800)

          // ── Cursor Pointer on Hover ───────────────────────────────────────
          scene.canvas.addEventListener('mousemove', (e: MouseEvent) => {
            const pickedObj = scene.pick(new Cesium.Cartesian2(e.offsetX, e.offsetY))
            scene.canvas.style.cursor = pickedObj?.id?.id ? 'pointer' : 'default'
          })

          // ── Resize Observer for Full-Frame Canvas Guarantee ───────────────
          if (containerRef.current) {
            resizeObserver = new ResizeObserver(() => {
              if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.resize()
              }
            })
            resizeObserver.observe(containerRef.current)
          }

          // Initial resize trigger
          viewer.resize()
          requestAnimationFrame(() => {
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
              viewerRef.current.resize()
            }
          })

          setIsLoaded(true)
        } catch (err) {
          console.error('[MDMIS] Cesium setup error:', err)
        }
      })
      .catch((err) => {
        console.error('[MDMIS] Failed to load Cesium:', err)
      })

    return () => {
      destroyed = true
      if (resizeObserver) resizeObserver.disconnect()
      removeInfoOverlay()
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
      }
      viewerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fly to site when selectedId changes ────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = (globalThis as any).Cesium
    if (!viewer || !Cesium || !selectedId) return
    const site = SITES.find((s) => s.id === selectedId)
    if (!site) return
    removeInfoOverlay()
    flyToSite(viewer, Cesium, site)
    showInfoOverlay(site)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // ── Highlight selected entity ──────────────────────────────────────────────
  useEffect(() => {
    const Cesium = (globalThis as any).Cesium
    if (!Cesium) return
    entitiesRef.current.forEach((entity, id) => {
      const isSelected = id === selectedId
      if (entity.billboard) entity.billboard.scale = isSelected ? 1.45 : 1.0
      if (entity.label) {
        entity.label.fillColor = isSelected
          ? Cesium.Color.fromCssColorString('#3fcf8e')
          : Cesium.Color.WHITE
      }
    })
  }, [selectedId])

  // ── Toggle Depth Pillars Visibility ────────────────────────────────────────
  useEffect(() => {
    depthPillarsRef.current.forEach((p) => {
      p.show = showDepthPillars
    })
  }, [showDepthPillars])

  // ── Toggle Corridors Visibility ────────────────────────────────────────────
  useEffect(() => {
    corridorsRef.current.forEach((c) => {
      c.show = showCorridors
    })
  }, [showCorridors])

  // ── Toggle Labels Visibility ───────────────────────────────────────────────
  useEffect(() => {
    entitiesRef.current.forEach((entity) => {
      if (entity.label) {
        entity.label.show = showLabels
      }
    })
  }, [showLabels])

  // ── Base Layer Switcher Handler ────────────────────────────────────────────
  const changeBaseLayer = useCallback((layer: BaseLayerType) => {
    const viewer = viewerRef.current
    const Cesium = (globalThis as any).Cesium
    if (!viewer || !Cesium) return

    setActiveBaseLayer(layer)
    setLayersMenuOpen(false)

    try {
      const imageryLayers = viewer.imageryLayers
      imageryLayers.removeAll()

      let newProvider: any = null
      if (layer === 'satellite') {
        newProvider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          maximumLevel: 19,
          credit: 'Esri World Imagery',
        })
      } else if (layer === 'terrain') {
        newProvider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
          maximumLevel: 16,
          credit: 'National Geographic',
        })
      } else if (layer === 'streets') {
        newProvider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          maximumLevel: 19,
          credit: 'OpenStreetMap',
        })
      }

      if (newProvider) {
        imageryLayers.addImageryProvider(newProvider)
      }
    } catch (err) {
      console.error('Failed to change basemap:', err)
    }
  }, [])

  // ── Camera Action Controls ─────────────────────────────────────────────────
  const resetCamera = useCallback(() => {
    const viewer = viewerRef.current
    const Cesium = (globalThis as any).Cesium
    if (!viewer || !Cesium) return

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(29.95, -1.94, 900_000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch:   Cesium.Math.toRadians(-45),
        roll:    0,
      },
      duration: 1.8,
      easingFunction: Cesium.EasingFunction.QUINTIC_IN_OUT,
    })
  }, [])

  const zoomIn = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.4)
  }, [])

  const zoomOut = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.camera.zoomOut(viewer.camera.positionCartographic.height * 0.4)
  }, [])

  const togglePitch = useCallback(() => {
    const viewer = viewerRef.current
    const Cesium = (globalThis as any).Cesium
    if (!viewer || !Cesium) return

    const targetPitch = is3D ? -90 : -45
    setIs3D(!is3D)

    const carto = viewer.camera.positionCartographic
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height),
      orientation: {
        heading: viewer.camera.heading,
        pitch:   Cesium.Math.toRadians(targetPitch),
        roll:    0,
      },
      duration: 1.2,
    })
  }, [is3D])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#05080f]">
      {/* ── Cesium Canvas Container (Absolute 100% Inset) ── */}
      <div 
        ref={containerRef} 
        id="cesium-viewer-root"
        className="absolute inset-0 h-full w-full overflow-hidden" 
      />

      {/* ── Cesium Full-Frame Style Overrides ── */}
      <style>{`
        #cesium-viewer-root {
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          inset: 0 !important;
        }
        .cesium-viewer {
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          inset: 0 !important;
          overflow: hidden !important;
        }
        .cesium-viewer-cesiumWidgetContainer {
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          inset: 0 !important;
        }
        .cesium-widget {
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          inset: 0 !important;
        }
        .cesium-widget canvas {
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          inset: 0 !important;
          display: block !important;
          touch-action: none;
        }
        .cesium-widget-credits {
          bottom: 6px !important;
          right: 12px !important;
          font-size: 9px !important;
          opacity: 0.45 !important;
          z-index: 10 !important;
        }
        .cesium-widget-credits a { color: rgba(255,255,255,0.6) !important; }
        .cesium-viewer-toolbar { display: none !important; }
        .cesium-viewer-animationContainer { display: none !important; }
        .cesium-viewer-timelineContainer { display: none !important; }
        .cesium-viewer-bottom { bottom: 0 !important; }
      `}</style>

      {/* ── Floating Interactive Camera & Layer HUD Controls ── */}
      {isLoaded && (
        <div className="pointer-events-auto absolute right-4 top-4 z-20 flex flex-col gap-2">
          {/* Navigation & Zoom Tools */}
          <div className="flex flex-col overflow-hidden rounded-lg border border-white/15 bg-[#0a0d18]/90 shadow-2xl backdrop-blur">
            <button
              type="button"
              onClick={resetCamera}
              title="Reset View to Rwanda"
              className="flex size-9 items-center justify-center text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <RotateCcw className="size-4" />
            </button>
            <div className="h-px bg-white/10" />
            <button
              type="button"
              onClick={zoomIn}
              title="Zoom In"
              className="flex size-9 items-center justify-center text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              type="button"
              onClick={zoomOut}
              title="Zoom Out"
              className="flex size-9 items-center justify-center text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ZoomOut className="size-4" />
            </button>
            <div className="h-px bg-white/10" />
            <button
              type="button"
              onClick={togglePitch}
              title={is3D ? 'Switch to 2D Top-Down View' : 'Switch to 3D Oblique View'}
              className="flex size-9 items-center justify-center text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Compass className={`size-4 transition-transform ${is3D ? 'rotate-45 text-primary' : ''}`} />
            </button>
          </div>

          {/* Layer & Feature Toggles */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLayersMenuOpen(!layersMenuOpen)}
              title="Layer Settings & Basemaps"
              className="flex size-9 items-center justify-center rounded-lg border border-white/15 bg-[#0a0d18]/90 text-white/80 shadow-2xl backdrop-blur hover:bg-white/10 hover:text-white transition-colors"
            >
              <Layers className="size-4" />
            </button>

            {layersMenuOpen && (
              <div className="absolute right-0 top-11 w-52 rounded-xl border border-white/15 bg-[#0a0d18]/95 p-2.5 shadow-2xl backdrop-blur z-30 space-y-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">Basemap Layer</p>
                <div className="grid grid-cols-3 gap-1">
                  {(['satellite', 'terrain', 'streets'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => changeBaseLayer(l)}
                      className={`rounded-md px-2 py-1 text-center font-mono text-[10px] capitalize transition-colors ${
                        activeBaseLayer === l 
                          ? 'bg-primary text-primary-foreground font-semibold' 
                          : 'bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/10 my-1.5" />

                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">Intelligence Overlays</p>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setShowDepthPillars(!showDepthPillars)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-white/80 hover:bg-white/10 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Drill className="size-3.5 text-[#9b6dff]" /> Depth Beacons
                    </span>
                    {showDepthPillars ? <Eye className="size-3 text-[var(--success)]" /> : <EyeOff className="size-3 text-white/40" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCorridors(!showCorridors)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-white/80 hover:bg-white/10 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Truck className="size-3.5 text-accent" /> Mineral Corridors
                    </span>
                    {showCorridors ? <Eye className="size-3 text-[var(--success)]" /> : <EyeOff className="size-3 text-white/40" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLabels(!showLabels)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-white/80 hover:bg-white/10 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Navigation2 className="size-3.5 text-primary" /> Site Labels
                    </span>
                    {showLabels ? <Eye className="size-3 text-[var(--success)]" /> : <EyeOff className="size-3 text-white/40" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom Controls Help Bar ── */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="rounded-full border border-white/10 bg-[#0a0d18]/85 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/50 backdrop-blur whitespace-nowrap shadow-xl">
          Left-drag · orbit &nbsp;|&nbsp; Right-drag / scroll · zoom &nbsp;|&nbsp; Middle-drag · pan &nbsp;|&nbsp; Click site · details
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function flyToSite(viewer: any, Cesium: any, site: DetectionSite) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(site.lng, site.lat, 8_500),
    orientation: {
      heading: Cesium.Math.toRadians(-20),
      pitch:   Cesium.Math.toRadians(-35),
      roll:    0,
    },
    duration: 2.2,
    easingFunction: Cesium.EasingFunction.QUINTIC_IN_OUT,
  })
}

function reportVisible(viewer: any, Cesium: any, onVisibleSitesChange: (ids: string[]) => void) {
  if (!viewer || viewer.isDestroyed()) return
  const camera = viewer.camera
  const rect   = camera.computeViewRectangle(viewer.scene.globe.ellipsoid)
  if (!rect) { onVisibleSitesChange(SITES.map((s) => s.id)); return }

  const west  = Cesium.Math.toDegrees(rect.west)
  const east  = Cesium.Math.toDegrees(rect.east)
  const south = Cesium.Math.toDegrees(rect.south)
  const north = Cesium.Math.toDegrees(rect.north)

  const visible = SITES
    .filter((s) => s.lat >= south && s.lat <= north && s.lng >= west && s.lng <= east)
    .map((s) => s.id)
  onVisibleSitesChange(visible.length > 0 ? visible : SITES.map((s) => s.id))
}

let _currentOverlay: HTMLElement | null = null

function removeInfoOverlay() {
  if (_currentOverlay) {
    _currentOverlay.remove()
    _currentOverlay = null
  }
}

function showInfoOverlay(site: DetectionSite) {
  removeInfoOverlay()

  const RISK_HEX_MAP: Record<DetectionSite['riskLevel'], string> = {
    low: '#3fcf8e', moderate: '#e6b84d', high: '#f97316', critical: '#ef4444',
  }
  const MINERAL_HEX_MAP: Record<string, string> = {
    Cassiterite: '#4bc5d6', Coltan: '#9b6dff', Wolframite: '#e6b84d',
    Gold: '#f0c040', Beryl: '#3fcf8e', Lithium: '#e6563f',
  }
  const riskColor    = RISK_HEX_MAP[site.riskLevel]
  const mineralColor = MINERAL_HEX_MAP[site.primaryMineral] ?? '#9b6dff'

  const el = document.createElement('div')
  el.id = 'cesium-site-overlay'
  el.innerHTML = `
    <div style="
      position:absolute; bottom:64px; left:50%; transform:translateX(-50%);
      background:rgba(16, 20, 30, 0.95); border:1px solid rgba(255,255,255,0.16);
      border-radius:14px; padding:16px; min-width:280px; max-width:340px;
      font-family:system-ui,sans-serif; box-shadow:0 20px 50px rgba(0,0,0,0.85);
      z-index:9999; pointer-events:auto; backdrop-filter:blur(16px);
    ">
      <button id="cesium-overlay-close" style="
        position:absolute; top:10px; right:12px; background:none; border:none;
        color:rgba(255,255,255,0.5); font-size:20px; cursor:pointer; line-height:1;
        padding:0;
      ">×</button>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
        <span style="width:10px;height:10px;border-radius:50%;background:${riskColor};flex-shrink:0;display:inline-block;"></span>
        <span style="font-weight:700;font-size:15px;color:#fff;">${site.name}</span>
      </div>
      <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:12px;padding-left:18px;">
        ${site.district} · ${site.id}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;margin-bottom:14px;">
        ${row('Mineral', `<span style="color:${mineralColor}">${site.primaryMineral}</span>`)}
        ${row('Grade', `${site.gradePct}%`)}
        ${row('Depth', `${site.depthMeters}m`)}
        ${row('AI Conf.', `${site.confidence}%`)}
        ${row('Safety', `${site.safetyScore}/100`)}
        ${row('Status', STATUS_LABEL[site.status])}
      </div>
      <button id="cesium-overlay-inspect" style="
        width:100%; background:linear-gradient(135deg,#e6b84d,#c9962a);
        border:none; border-radius:8px;
        color:#111; font-size:12px; font-weight:700; padding:10px 14px;
        cursor:pointer; font-family:inherit; letter-spacing:0.02em;
        display:flex; align-items:center; justify-content:center; gap:6px;
      ">🔬 Enter 3D Terrain Block View</button>
    </div>
  `
  document.body.appendChild(el)
  _currentOverlay = el

  document.getElementById('cesium-overlay-close')?.addEventListener('click', removeInfoOverlay)
  document.getElementById('cesium-overlay-inspect')?.addEventListener('click', () => {
    removeInfoOverlay()
    window.dispatchEvent(new CustomEvent('cesium:inspect', { detail: { siteId: site.id } }))
  })
}

function row(label: string, value: string) {
  return `
    <div style="display:flex;flex-direction:column;gap:1px;">
      <span style="font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,0.4);">${label}</span>
      <span style="font-size:12px;font-weight:600;color:#fff;">${value}</span>
    </div>`
}
