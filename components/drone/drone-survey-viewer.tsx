'use client'

/**
 * A drone survey's 3D block: bare ground, surface (trees, boulders), X-ray
 * and the dense point cloud, textured with the survey's own orthophoto.
 * Plain three.js in an effect: one self-contained scene, rebuilt when the
 * mode or vertical scale changes.
 */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import type { DemGrid } from '@/lib/dem-fetcher'
import type { SurveyModel } from '@/lib/api/drone-surveys'
import { cn } from '@/lib/utils'

export type ViewMode = 'ground' | 'surface' | 'xray' | 'points'

const MODES: { key: ViewMode; label: string; text: string }[] = [
  { key: 'surface', label: 'Surface', text: 'Everything the drone saw: ground plus trees, boulders and buildings.' },
  { key: 'ground', label: 'Bare ground', text: 'Trees, boulders and buildings removed; the ground under them filled from its surroundings.' },
  { key: 'xray', label: 'X-ray', text: 'Bare-ground block with see-through sides and a translucent top.' },
  { key: 'points', label: 'Point cloud', text: 'A sample of the measured 3D points in their own colours; orange cones are camera positions.' },
]
const STRATA = [[0.47, 0.37, 0.25], [0.56, 0.44, 0.29], [0.4, 0.33, 0.27], [0.33, 0.29, 0.26]]
const SPAN = 100 // longest side of the block in scene units

function extent(g: DemGrid) {
  const midLat = ((g.minLat + g.maxLat) / 2) * (Math.PI / 180)
  return { w: (g.maxLon - g.minLon) * 111_320 * Math.cos(midLat), d: (g.maxLat - g.minLat) * 110_574 }
}

function buildBlock(group: THREE.Group, grid: DemGrid, base: number, tex: THREE.Texture | null, mode: ViewMode, vex: number) {
  const { w, d } = extent(grid)
  const S = SPAN / Math.max(w, d)
  const W = w * S, D = d * S, n = grid.gridSize
  // DemGrid row 0 = south; PlaneGeometry vertex row 0 = north (-Z)
  const hAt = (row: number, col: number) => (grid.elevations[n - 1 - row][col] - base) * S * vex
  const top = new THREE.PlaneGeometry(W, D, n - 1, n - 1)
  top.rotateX(-Math.PI / 2)
  const pos = top.attributes.position as THREE.BufferAttribute
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) pos.setY(r * n + c, hAt(r, c))
  top.computeVertexNormals()

  const relief = (grid.maxElevation - base) * S * vex
  const bottom = -(10 + 0.25 * relief)
  const rim: [number, number][] = []
  for (let c = 0; c < n; c++) rim.push([0, c])
  for (let r = 1; r < n; r++) rim.push([r, n - 1])
  for (let c = n - 2; c >= 0; c--) rim.push([n - 1, c])
  for (let r = n - 2; r > 0; r--) rim.push([r, 0])
  const P = rim.map(([r, c]) => [-W / 2 + (c * W) / (n - 1), -D / 2 + (r * D) / (n - 1), hAt(r, c)])
  const wp: number[] = [], wc: number[] = []
  for (let k = 0; k < P.length; k++) {
    const a = P[k], b = P[(k + 1) % P.length]
    const tri = [[a[0], a[2], a[1]], [b[0], bottom, b[1]], [b[0], b[2], b[1]], [a[0], a[2], a[1]], [a[0], bottom, a[1]], [b[0], bottom, b[1]]]
    const topY = Math.max(a[2], b[2])
    for (const v of tri) { wp.push(...v); wc.push(...STRATA[Math.min(3, Math.floor(((topY - v[1]) / (topY - bottom + 1e-6)) * 4))]) }
  }
  wp.push(-W / 2, bottom, -D / 2, W / 2, bottom, D / 2, W / 2, bottom, -D / 2, -W / 2, bottom, -D / 2, -W / 2, bottom, D / 2, W / 2, bottom, D / 2)
  for (let i = 0; i < 6; i++) wc.push(0.3, 0.27, 0.24)
  const walls = new THREE.BufferGeometry()
  walls.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3))
  walls.setAttribute('color', new THREE.Float32BufferAttribute(wc, 3))
  walls.computeVertexNormals()

  const x = mode === 'xray'
  const topMat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide, transparent: x, opacity: x ? 0.45 : 1, depthWrite: !x })
  const wallMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: x, opacity: x ? 0.08 : 1, depthWrite: !x })
  group.add(new THREE.Mesh(top, topMat), new THREE.Mesh(walls, wallMat))
  if (x) group.add(new THREE.LineSegments(new THREE.EdgesGeometry(walls, 30), new THREE.LineBasicMaterial({ color: 0xe0a04a })))
  return S
}

function buildPoints(group: THREE.Group, model: SurveyModel, base: number, vex: number) {
  const g = model.ground
  const { w, d } = extent(g)
  const S = SPAN / Math.max(w, d)
  const cLat = (g.minLat + g.maxLat) / 2, cLon = (g.minLon + g.maxLon) / 2
  const kx = 111_320 * Math.cos((cLat * Math.PI) / 180), ky = 110_574
  const toScene = (lat: number, lon: number, z: number): [number, number, number] =>
    [(lon - cLon) * kx * S, (z - base) * S * vex, -(lat - cLat) * ky * S]
  const pts = model.cloud.points, cols = model.cloud.colors
  const pp = new Float32Array(pts.length * 3), pc = new Float32Array(pts.length * 3)
  pts.forEach(([lat, lon, z], i) => {
    pp.set(toScene(lat, lon, z), i * 3)
    // photo colours are sRGB; the renderer works in linear light
    pc.set(cols[i].map((v) => (v / 255) ** 2.2), i * 3)
  })
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pp, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(pc, 3))
  group.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.6, vertexColors: true })))
  const coneGeo = new THREE.ConeGeometry(0.8, 1.6, 4)
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xe0a04a })
  for (const [lat, lon, z] of model.cloud.cameras) {
    const m = new THREE.Mesh(coneGeo, coneMat)
    m.rotation.x = Math.PI
    m.position.set(...toScene(lat, lon, z))
    group.add(m)
  }
}

export function DroneSurveyViewer({ model, orthoUrl, className }: { model: SurveyModel; orthoUrl: string | null; className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<ViewMode>('surface')
  const [vex, setVex] = useState(1)
  const [texVersion, setTexVersion] = useState(0)
  const sceneRef = useRef<{ scene: THREE.Scene; group: THREE.Group; tex: THREE.Texture | null; render: () => void } | null>(null)

  // renderer, camera and controls live for the component's lifetime
  useEffect(() => {
    const mount = mountRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 3000)
    camera.position.set(80, 70, 110)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, -6, 0) // middle of the block, not the top of the ground
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI * 0.49
    controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    controls.autoRotateSpeed = 0.5
    controls.addEventListener('start', () => { controls.autoRotate = false })
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 2.2))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(-60, 120, 40)
    scene.add(sun)
    const group = new THREE.Group()
    scene.add(group)
    const render = () => renderer.render(scene, camera)
    sceneRef.current = { scene, group, tex: null, render }
    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(mount)
    resize()
    let raf = 0
    const loop = () => { raf = requestAnimationFrame(loop); controls.update(); render() }
    loop()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      sceneRef.current = null
    }
  }, [])

  // orthophoto texture
  useEffect(() => {
    if (!orthoUrl || !sceneRef.current) return
    let cancelled = false
    new THREE.TextureLoader().load(orthoUrl, (tex) => {
      if (cancelled || !sceneRef.current) { tex.dispose(); return }
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 8
      sceneRef.current.tex?.dispose()
      sceneRef.current.tex = tex
      setTexVersion((t) => t + 1) // rebuild with the texture in place
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orthoUrl])

  const rebuild = () => {
    const s = sceneRef.current
    if (!s) return
    s.group.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose()
    })
    s.group.clear()
    const base = model.ground.minElevation
    if (mode === 'points') buildPoints(s.group, model, base, vex)
    else buildBlock(s.group, mode === 'surface' ? model.surface : model.ground, base, s.tex, mode, vex)
    s.render()
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(rebuild, [model, mode, vex, texVersion])

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-secondary/60 to-background', className)}>
      <div ref={mountRef} className="absolute inset-0 [&>canvas]:h-full [&>canvas]:w-full" />
      <div className="absolute left-3 top-3 flex flex-wrap overflow-hidden rounded-lg border border-border bg-card/90 backdrop-blur">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            aria-pressed={mode === m.key}
            className={cn('px-3 py-1.5 text-xs font-medium transition-colors',
              mode === m.key ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary')}
          >
            {m.label}
          </button>
        ))}
      </div>
      <label className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-card/80 px-2 py-1 font-mono text-[11px] text-muted-foreground">
        Vertical ×
        <input type="range" min={1} max={4} step={0.5} value={vex} onChange={(e) => setVex(+e.target.value)} className="w-24" />
        {vex.toFixed(1)}
      </label>
      <p className="absolute bottom-3 right-3 max-w-[50%] rounded-md bg-card/80 px-2 py-1 text-right text-[11px] text-muted-foreground">
        {MODES.find((m) => m.key === mode)!.text}
      </p>
    </div>
  )
}
