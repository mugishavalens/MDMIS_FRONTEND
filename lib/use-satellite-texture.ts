/**
 * Hook to load and manage satellite texture for terrain
 * Fetches Bing Maps tiles and converts to Three.js texture
 */

import { useState, useEffect } from 'react'
import { getSatelliteTextureForSite } from './satellite-tiles'
import type { DetectionSite } from './mdmis-data'
import * as THREE from 'three'

export interface UseSatelliteTextureResult {
  status: 'loading' | 'ready' | 'error'
  texture: THREE.Texture | null
  error: string | null
}

// In-memory cache for satellite textures
const satelliteCache = new Map<string, Promise<THREE.Texture | null>>()

export function useSatelliteTexture(site: DetectionSite, radiusKm: number = 2): UseSatelliteTextureResult {
  const [state, setState] = useState<UseSatelliteTextureResult>({
    status: 'loading',
    texture: null,
    error: null,
  })

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        console.log(`[useSatelliteTexture] Loading satellite texture for ${site.id} (${radiusKm}km radius)`)

        // Check cache first
        let texturePromise = satelliteCache.get(site.id)

        if (!texturePromise) {
          console.log(`[useSatelliteTexture] Cache miss for ${site.id}, fetching tiles...`)
          // Fetch new texture
          texturePromise = getSatelliteTextureForSite(site.lat, site.lng, radiusKm)
          satelliteCache.set(site.id, texturePromise)
        } else {
          console.log(`[useSatelliteTexture] Cache hit for ${site.id}`)
        }

        const texture = await texturePromise

        if (!isMounted) return

        if (!texture) {
          console.warn(`[useSatelliteTexture] Texture is null for ${site.id}`)
          setState({
            status: 'error',
            texture: null,
            error: 'Failed to load satellite imagery',
          })
          return
        }

        console.log(`[useSatelliteTexture] Successfully loaded texture for ${site.id}`)

        setState({
          status: 'ready',
          texture,
          error: null,
        })
      } catch (err) {
        console.error(`[useSatelliteTexture] Error loading texture for ${site.id}:`, err)
        if (isMounted) {
          setState({
            status: 'error',
            texture: null,
            error: err instanceof Error ? err.message : 'Unknown error loading satellite imagery',
          })
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [site.id, site.lat, site.lng, radiusKm])

  return state
}
