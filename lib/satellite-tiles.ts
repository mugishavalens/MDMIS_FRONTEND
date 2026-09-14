/**
 * Satellite tile fetching from Bing Maps
 * Used to get realistic aerial imagery for 3D terrain blocks
 * 
 * Bing Maps Tiles API: https://learn.microsoft.com/en-us/bingmaps/articles/bing-maps-tile-system
 */

export interface TileCoord {
  x: number
  y: number
  z: number
}

/**
 * Convert lat/lon to Web Mercator tile coordinates at a given zoom level
 */
export function latLonToTile(lat: number, lon: number, zoom: number): TileCoord {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lon + 180) / 360) * n)
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
  )
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)), z: zoom }
}

/**
 * Convert tile coordinates to quadkey (Bing Maps format)
 */
export function tileToQuadkey(x: number, y: number, z: number): string {
  let quadkey = ''
  for (let i = z; i > 0; i--) {
    let digit = 0
    const mask = 1 << (i - 1)
    if ((x & mask) !== 0) digit += 1
    if ((y & mask) !== 0) digit += 2
    quadkey += digit
  }
  return quadkey
}

/**
 * Get Bing Maps satellite tile URL
 * Uses the domain rotation (0,1,2,3) for load balancing
 */
export function getBingMapsTileUrl(x: number, y: number, z: number): string {
  const quadkey = tileToQuadkey(x, y, z)
  // Bing uses server rotation: t0, t1, t2, t3
  const serverNum = (x + y) % 4
  return `https://t${serverNum}.tiles.virtualearth.net/tiles/a${quadkey}.jpeg?g=13213`
}

/**
 * Fetch satellite image tiles covering a bounding box
 * Returns a canvas with stitched tiles
 */
export async function fetchSatelliteTiles(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  zoom: number = 18 // High zoom for detailed imagery
): Promise<HTMLCanvasElement> {
  console.log(`[Satellite] Fetching tiles for bbox: [${minLat}, ${minLon}] to [${maxLat}, ${maxLon}] at zoom ${zoom}`)

  // Get tile coordinates for corners
  const topLeft = latLonToTile(maxLat, minLon, zoom)
  const bottomRight = latLonToTile(minLat, maxLon, zoom)

  const tileWidth = bottomRight.x - topLeft.x + 1
  const tileHeight = bottomRight.y - topLeft.y + 1

  console.log(`[Satellite] Grid: ${tileWidth}x${tileHeight} tiles`)

  // Create canvas to stitch tiles
  const canvasWidth = tileWidth * 256
  const canvasHeight = tileHeight * 256
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')!

  // Fetch and draw tiles
  const tilePromises: Promise<void>[] = []
  for (let ty = topLeft.y; ty <= bottomRight.y; ty++) {
    for (let tx = topLeft.x; tx <= bottomRight.x; tx++) {
      const promise = (async () => {
        try {
          const url = getBingMapsTileUrl(tx, ty, zoom)
          const response = await fetch(url)
          if (!response.ok) {
            console.warn(`[Satellite] Failed to fetch tile ${tx},${ty}: ${response.status}`)
            return
          }
          const blob = await response.blob()
          const img = new Image()
          img.crossOrigin = 'anonymous'

          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = URL.createObjectURL(blob)
          })

          const canvasX = (tx - topLeft.x) * 256
          const canvasY = (ty - topLeft.y) * 256
          ctx.drawImage(img, canvasX, canvasY, 256, 256)
          URL.revokeObjectURL(img.src)

          console.log(`[Satellite] Stitched tile ${tx},${ty}`)
        } catch (err) {
          console.warn(`[Satellite] Error fetching tile ${tx},${ty}:`, err)
        }
      })()
      tilePromises.push(promise)
    }
  }

  await Promise.all(tilePromises)
  console.log(`[Satellite] Completed stitching ${tileWidth}x${tileHeight} tile grid into ${canvasWidth}x${canvasHeight} canvas`)

  return canvas
}

/**
 * Create Three.js texture from satellite canvas
 */
export async function canvasToTexture(canvas: HTMLCanvasElement) {
  const THREE = await import('three')
  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipMapLinearFilter
  texture.generateMipmaps = true
  return texture
}

/**
 * Get Bing Maps satellite imagery for a site and return as Three.js texture
 */
export async function getSatelliteTextureForSite(lat: number, lon: number, radiusKm: number = 2) {
  // Approximate radius in degrees (1 degree ≈ 111 km)
  const latDelta = radiusKm / 111
  const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))

  const minLat = lat - latDelta
  const maxLat = lat + latDelta
  const minLon = lon - lonDelta
  const maxLon = lon + lonDelta

  const canvas = await fetchSatelliteTiles(minLat, maxLat, minLon, maxLon, 18)
  return canvasToTexture(canvas)
}
