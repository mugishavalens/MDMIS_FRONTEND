'use client'

import { useMemo } from 'react'

interface Point { lat: number; lng: number }

const W = 480
const H = 240
const PAD = 36

/**
 * Schematic route view: planned origin→destination line, the reported GPS
 * trail, and the latest position. A plain SVG projection (equirectangular,
 * corrected for latitude) rather than a map library — at corridor scale
 * the shape is what matters, and it keeps the detail panel instant.
 */
export function RouteMap({
  origin,
  destination,
  trail,
  current,
  gpsLost,
  moving,
}: {
  origin: Point & { name: string }
  destination: Point & { name: string }
  trail: Point[]
  current: Point | null
  gpsLost: boolean
  moving: boolean
}) {
  const project = useMemo(() => {
    const pts = [origin, destination, ...trail]
    const lats = pts.map((p) => p.lat)
    const lngs = pts.map((p) => p.lng)
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
    const kx = Math.cos((midLat * Math.PI) / 180)
    const minX = Math.min(...lngs) * kx
    const maxX = Math.max(...lngs) * kx
    const minY = Math.min(...lats)
    const maxY = Math.max(...lats)
    const spanX = Math.max(maxX - minX, 0.01)
    const spanY = Math.max(maxY - minY, 0.01)
    const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY)
    const offX = (W - spanX * scale) / 2
    const offY = (H - spanY * scale) / 2
    return (p: Point) => ({
      x: offX + (p.lng * kx - minX) * scale,
      y: H - (offY + (p.lat - minY) * scale),
    })
  }, [origin, destination, trail])

  const o = project(origin)
  const d = project(destination)
  const trailPts = trail.map(project)
  const cur = current ? project(current) : null
  const markerColor = gpsLost ? 'var(--destructive)' : 'var(--accent)'

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background/40">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img"
        aria-label={`Route from ${origin.name} to ${destination.name}`}>
        <defs>
          <pattern id="route-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--border)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#route-grid)" opacity="0.6" />

        {/* planned route */}
        <line x1={o.x} y1={o.y} x2={d.x} y2={d.y} stroke="var(--muted-foreground)" strokeWidth="1.5"
          strokeDasharray="5 5" opacity="0.6" />

        {/* reported trail, from the origin through each ping */}
        {trailPts.length > 0 && (
          <polyline
            points={[o, ...trailPts].map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
          />
        )}
        {trailPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--primary)" />
        ))}

        <Endpoint x={o.x} y={o.y} color="var(--success)" label={origin.name} />
        <Endpoint x={d.x} y={d.y} color="var(--primary)" label={destination.name} />

        {cur && (
          <g>
            {moving && !gpsLost && (
              <circle cx={cur.x} cy={cur.y} r="8" fill={markerColor} opacity="0.35">
                <animate attributeName="r" from="6" to="16" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.45" to="0" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={cur.x} cy={cur.y} r="6" fill={markerColor} stroke="var(--background)" strokeWidth="2" />
          </g>
        )}
      </svg>
    </div>
  )
}

function Endpoint({ x, y, color, label }: { x: number; y: number; color: string; label: string }) {
  const anchor = x > W * 0.7 ? 'end' : x < W * 0.3 ? 'start' : 'middle'
  return (
    <g>
      <circle cx={x} cy={y} r="5" fill={color} stroke="var(--background)" strokeWidth="2" />
      <text x={x} y={y - 10} textAnchor={anchor} fontSize="11" fill="var(--foreground)" fontWeight="500">
        {label}
      </text>
    </g>
  )
}
