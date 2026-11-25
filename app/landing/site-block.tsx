'use client'

/**
 * The page's live thing: pick one of the ten demo sites and its real ground
 * (a 33 x 33 elevation grid, the same data the app's 3D block uses) is cut
 * out and drawn as a block. A fragment of the product, so it follows the
 * app's own conventions inside (data-ui).
 */
import { useEffect, useRef, useState } from 'react'
import { MINERAL_LABEL, sites, type Site } from './profile'
import s from './landing.module.css'

const EARTH = ['#8a3b22', '#a4562c', '#6b3a24', '#3e2a1f'] // laterite, then down to bedrock
const GREEN_LO = [47, 92, 52]
const GREEN_HI = [196, 186, 104]

function mix(a: number[], b: number[], t: number) {
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`
}

function draw(canvas: HTMLCanvasElement, grid: number[][], lo: number, hi: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth, h = canvas.clientHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)
  const n = grid.length
  const cell = Math.min(w / (n * 1.8), h / (n * 1.25))
  const relief = cell * 7 // vertical scale for the ground
  const base = cell * 9 // thickness of the block below the lowest ground
  const ox = w / 2, oy = h * 0.2
  const iso = (r: number, c: number, z: number): [number, number] =>
    [ox + (c - r) * cell * 0.87, oy + (c + r) * cell * 0.5 - z]
  const zAt = (r: number, c: number) => ((grid[r][c] - lo) / (hi - lo || 1)) * relief

  // sides: south-west (r = n-1) and south-east (c = n-1) faces, in strata
  const side = (pts: [number, number][], color: string) => {
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }
  const bands = [0, 0.22, 0.48, 0.74, 1]
  for (let b = 0; b < 4; b++) {
    for (const face of ['sw', 'se'] as const) {
      const top: [number, number][] = []
      const bottom: [number, number][] = []
      for (let k = 0; k < n; k++) {
        const r = face === 'sw' ? n - 1 : k, c = face === 'sw' ? k : n - 1
        const zg = zAt(r, c)
        // each band spans a share of the column from the ground down to the base
        const z0 = zg - (zg + base) * bands[b], z1 = zg - (zg + base) * bands[b + 1]
        top.push(iso(r + (face === 'sw' ? 1 : 0), c + (face === 'se' ? 1 : 0), z0))
        bottom.push(iso(r + (face === 'sw' ? 1 : 0), c + (face === 'se' ? 1 : 0), z1))
      }
      side([...top, ...bottom.reverse()], face === 'sw' ? EARTH[b] : mix(hex(EARTH[b]), [0, 0, 0], 0.28))
    }
  }
  // ground: back to front so nearer cells cover farther ones
  for (let sum = 0; sum <= 2 * (n - 1); sum++) {
    for (let r = 0; r < n; r++) {
      const c = sum - r
      if (c < 0 || c >= n) continue
      const r1 = Math.min(r + 1, n - 1), c1 = Math.min(c + 1, n - 1)
      const z = zAt(r, c)
      const slope = (zAt(r, c1) - zAt(r1, c)) / cell // lit from the north-east
      const t = (grid[r][c] - lo) / (hi - lo || 1)
      ctx.beginPath()
      const p = [iso(r, c, z), iso(r, c + 1, zAt(r, c1)), iso(r + 1, c + 1, zAt(r1, c1)), iso(r + 1, c, zAt(r1, c))]
      p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.closePath()
      ctx.fillStyle = mix(mix2(GREEN_LO, GREEN_HI, t), slope > 0 ? [255, 244, 190] : [10, 30, 16], Math.min(0.35, Math.abs(slope) * 0.25))
      ctx.fill()
    }
  }
}

function hex(h: string) {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
}
function mix2(a: number[], b: number[], t: number) {
  return a.map((v, i) => v + (b[i] - v) * t)
}

export function SiteBlock() {
  const [site, setSite] = useState<Site>(sites[0])
  const canvas = useRef<HTMLCanvasElement>(null)
  const shown = useRef<number[][]>(sites[0].grid)

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const from = shown.current, to = site.grid
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const t0 = performance.now()
    const frame = (now: number) => {
      const k = reduce ? 1 : Math.min(1, (now - t0) / 450)
      const e = 1 - Math.pow(1 - k, 3)
      const g = to.map((row, r) => row.map((v, cc) => from[r][cc] + (v - from[r][cc]) * e))
      // scale each frame by its own range so the block always fills its height
      const flat = g.flat()
      draw(c, g, Math.min(...flat), Math.max(...flat))
      if (k < 1) raf = requestAnimationFrame(frame)
      else shown.current = to
    }
    raf = requestAnimationFrame(frame)
    const onResize = () => draw(c, site.grid, site.min, site.max)
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [site])

  return (
    <div data-ui className={s.ui}>
      <div className={s.uiHead}>
        <span className={s.uiTitle}>Site block</span>
        <span className={s.uiMeta}>Elevation grid 33 × 33</span>
      </div>
      <div className={s.uiTabs} role="tablist" aria-label="Demo sites">
        {sites.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === site.id}
            className={s.uiTab}
            onClick={() => setSite(x)}
          >
            {x.name.split(' ')[0]}
          </button>
        ))}
      </div>
      <canvas ref={canvas} className={s.uiCanvas} aria-label={`Ground of ${site.name} drawn as a block`} role="img" />
      <dl className={s.uiRead}>
        <div><dt>Site</dt><dd>{site.name}</dd></div>
        <div><dt>District</dt><dd>{site.district}</dd></div>
        <div><dt>Target</dt><dd>{MINERAL_LABEL[site.mineral] ?? site.mineral}</dd></div>
        <div><dt>Ground</dt><dd>{site.min.toLocaleString()}–{site.max.toLocaleString()} m</dd></div>
      </dl>
    </div>
  )
}
