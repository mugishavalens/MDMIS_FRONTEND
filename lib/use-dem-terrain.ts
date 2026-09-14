/**
 * Hook to load and manage DEM terrain data for a site
 * Handles caching, error states, and async loading
 */

import { useState, useEffect } from 'react'
import {
  fetchDemGridData,
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
}

// Simple in-memory cache (one per site)
const demCache = new Map<string, Promise<DemGrid | null>>()

export function useDemTerrain(site: DetectionSite, gridSize: number = 64): UseDemTerrainResult {
  const [state, setState] = useState<UseDemTerrainResult>({
    status: 'loading',
    demGrid: null,
    normalizedElevations: null,
    error: null
  })

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        console.log(`[useDemTerrain] Loading DEM for site: ${site.id} (lat: ${site.lat}, lng: ${site.lng})`)
        
        // Check cache first
        let fetchPromise = demCache.get(site.id)
        
        if (!fetchPromise) {
          console.log(`[useDemTerrain] Cache miss for ${site.id}, fetching new data...`)
          // Fetch new data
          const bbox = getSiteBoundingBox(site.lat, site.lng, 2) // 2km radius
          fetchPromise = fetchDemGridData(
            bbox.minLat,
            bbox.maxLat,
            bbox.minLon,
            bbox.maxLon,
            gridSize
          )
          demCache.set(site.id, fetchPromise)
        } else {
          console.log(`[useDemTerrain] Cache hit for ${site.id}`)
        }

        const demGrid = await fetchPromise

        if (!isMounted) return

        if (!demGrid) {
          console.warn(`[useDemTerrain] DEM grid is null for ${site.id}`)
          setState({
            status: 'error',
            demGrid: null,
            normalizedElevations: null,
            error: 'DEM data unavailable for this location'
          })
          return
        }

        console.log(`[useDemTerrain] DEM grid received: ${demGrid.gridSize}x${demGrid.gridSize}, elevation range [${demGrid.minElevation}, ${demGrid.maxElevation}]m`)

        // Normalize elevations to terrain amplitude
        // Use a moderate amplitude for realistic hills (not too exaggerated)
        const targetAmplitude = 8 // local units, roughly 8-10m per unit
        const normalized = normalizeElevationGrid(demGrid, targetAmplitude)

        console.log(`[useDemTerrain] Normalized elevations to amplitude ${targetAmplitude}`)

        setState({
          status: 'ready',
          demGrid,
          normalizedElevations: normalized,
          error: null
        })
      } catch (err) {
        console.error(`[useDemTerrain] Error loading DEM for ${site.id}:`, err)
        if (isMounted) {
          setState({
            status: 'error',
            demGrid: null,
            normalizedElevations: null,
            error: err instanceof Error ? err.message : 'Unknown error fetching terrain data'
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
