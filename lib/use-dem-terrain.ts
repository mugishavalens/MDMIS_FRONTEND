/**
 * Hook to load and manage DEM terrain data for a site
 * Handles caching, error states, and async loading
 */

import { useState, useEffect } from 'react'
import {
  fetchDemGridData,
  fetchSiteTerrain,
  DemGrid,
  normalizeElevationGrid,
  getSiteBoundingBox,
  downsampleElevationGrid,
} from './dem-fetcher'
import type { DetectionSite } from './mdmis-data'

export interface UseDemTerrainResult {
  status: 'loading' | 'ready' | 'error'
  demGrid: DemGrid | null
  normalizedElevations: number[][] | null
  error: string | null
  // 'ingested' = MDMIS terrain (drone DTM / Copernicus) via the backend;
  // 'open-elevation' = public API fallback; null = not loaded
  source: 'ingested' | 'open-elevation' | null
  sourceLabel: string | null
}

type LoadedDem = { grid: DemGrid; source: 'ingested' | 'open-elevation'; sourceLabel: string } | null

// Simple in-memory cache (one per site)
const demCache = new Map<string, Promise<LoadedDem>>()

async function loadDem(site: DetectionSite, gridSize: number): Promise<LoadedDem> {
  const ingested = await fetchSiteTerrain(site.id)
  if (ingested) {
    return { grid: ingested, source: 'ingested', sourceLabel: ingested.source ?? 'ingested terrain' }
  }
  const bbox = getSiteBoundingBox(site.lat, site.lng, 2) // 2km radius
  const grid = await fetchDemGridData(bbox.minLat, bbox.maxLat, bbox.minLon, bbox.maxLon, gridSize)
  return grid ? { grid, source: 'open-elevation', sourceLabel: 'Open-Elevation (public API)' } : null
}

export function useDemTerrain(site: DetectionSite, gridSize: number = 64): UseDemTerrainResult {
  const [state, setState] = useState<UseDemTerrainResult>({
    status: 'loading',
    demGrid: null,
    normalizedElevations: null,
    error: null,
    source: null,
    sourceLabel: null,
  })

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        let fetchPromise = demCache.get(site.id)
        if (!fetchPromise) {
          fetchPromise = loadDem(site, gridSize)
          demCache.set(site.id, fetchPromise)
        }
        const loaded = await fetchPromise
        if (!isMounted) return

        if (!loaded) {
          setState({
            status: 'error', demGrid: null, normalizedElevations: null,
            error: 'DEM data unavailable for this location', source: null, sourceLabel: null,
          })
          return
        }

        const { grid, source, sourceLabel } = loaded
        console.log(`[useDemTerrain] ${site.id}: ${source} ${grid.gridSize}x${grid.gridSize}, ` +
          `${grid.minElevation}-${grid.maxElevation} m`)
        setState({
          status: 'ready',
          demGrid: grid,
          normalizedElevations: normalizeElevationGrid(grid, 8),
          error: null,
          source,
          sourceLabel,
        })
      } catch (err) {
        console.error(`[useDemTerrain] Error loading DEM for ${site.id}:`, err)
        if (isMounted) {
          setState({
            status: 'error', demGrid: null, normalizedElevations: null,
            error: err instanceof Error ? err.message : 'Unknown error fetching terrain data',
            source: null, sourceLabel: null,
          })
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [site.id, site.lat, site.lng, gridSize])

  return state
}
