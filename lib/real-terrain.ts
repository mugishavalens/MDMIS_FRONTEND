'use client'

import { useEffect, useState } from 'react'
import * as THREE from 'three'

// Loads the real elevation + satellite-imagery data baked per site by
// scripts/fetch-terrain-data.mjs. These are static files served from
// public/terrain/<siteId>/ — this hook never calls an external service at
// runtime, only same-origin fetches, so it can't reproduce the "map failing
// to load" failure a live third-party dependency would risk.

export interface TerrainManifest {
  siteId: string
  center: { lat: number; lng: number }
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  tileGrid: { rows: number; cols: number; z: number }
  elevation: {
    gridSize: number
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
    values: number[][]
  }
}

export interface SiteRealTerrain {
  status: 'loading' | 'ready' | 'unavailable'
  manifest: TerrainManifest | null
  /** Composited satellite-imagery texture — the manifest's tile grid
   *  stitched into one canvas, north row first. */
  texture: THREE.CanvasTexture | null
}

const TILE_PX = 256

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`failed to load ${src}`))
    img.src = src
  })
}

async function loadRealTerrain(siteId: string): Promise<{ manifest: TerrainManifest; texture: THREE.CanvasTexture } | null> {
  const res = await fetch(`/terrain/${siteId}/manifest.json`)
  if (!res.ok) return null
  const manifest: TerrainManifest = await res.json()

  const { rows, cols } = manifest.tileGrid
  const canvas = document.createElement('canvas')
  canvas.width = cols * TILE_PX
  canvas.height = rows * TILE_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const tiles = await Promise.all(
    Array.from({ length: rows * cols }, (_, i) => {
      const r = Math.floor(i / cols)
      const c = i % cols
      return loadImage(`/terrain/${siteId}/tiles/${r}_${c}.jpg`).then((img) => ({ r, c, img }))
    }),
  )
  for (const { r, c, img } of tiles) {
    ctx.drawImage(img, c * TILE_PX, r * TILE_PX, TILE_PX, TILE_PX)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  return { manifest, texture }
}

/** Loads a site's baked real-terrain data (elevation grid + satellite
 *  texture). Resolves to 'unavailable' — never throws — if the site has no
 *  generated data or a tile fails to load, so callers can fall back to the
 *  procedural terrain rather than breaking the view. */
export function useSiteRealTerrain(siteId: string): SiteRealTerrain {
  const [state, setState] = useState<SiteRealTerrain>({ status: 'loading', manifest: null, texture: null })

  useEffect(() => {
    let active = true
    setState({ status: 'loading', manifest: null, texture: null })

    loadRealTerrain(siteId)
      .then((result) => {
        if (!active) return
        if (result) setState({ status: 'ready', manifest: result.manifest, texture: result.texture })
        else setState({ status: 'unavailable', manifest: null, texture: null })
      })
      .catch(() => {
        if (active) setState({ status: 'unavailable', manifest: null, texture: null })
      })

    return () => {
      active = false
    }
  }, [siteId])

  return state
}
