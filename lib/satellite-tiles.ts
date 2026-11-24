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
 * Lat/lon to global Web Mercator pixel coordinates (256 px tiles), unfloored
 */
export function latLonToPixel(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom) * 256
  const rad = (lat * Math.PI) / 180
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  }
}

// Largest texture side every WebGL device can take. Bigger textures (the
// stitched zoom-18 mosaic is ~7000 px) show as plain white or black on
// many integrated GPUs; 4096 px over the ~4 km block is still ~1 m/px.
const MAX_TEXTURE_PX = 4096

/**
 * Crop the stitched tile mosaic to exactly the requested box, so the photo
 * lines up with the terrain under it (whole tiles overhang the box by up
 * to a tile on each side), and scale it down to MAX_TEXTURE_PX.
 */
export function cropToBounds(
  mosaic: HTMLCanvasElement,
  minLat: number, maxLat: number, minLon: number, maxLon: number,
  zoom: number,
): HTMLCanvasElement {
  const origin = latLonToTile(maxLat, minLon, zoom)
  const nw = latLonToPixel(maxLat, minLon, zoom)
  const se = latLonToPixel(minLat, maxLon, zoom)
  const sx = nw.x - origin.x * 256
  const sy = nw.y - origin.y * 256
  const sw = se.x - nw.x
  const sh = se.y - nw.y
  const scale = Math.min(1, MAX_TEXTURE_PX / Math.max(sw, sh))
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(sw * scale))
  out.height = Math.max(1, Math.round(sh * scale))
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(mosaic, sx, sy, sw, sh, 0, 0, out.width, out.height)
  return out
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

// ── Missing imagery ───────────────────────────────────────────────────────
// Providers answer places they have no photos for with a placeholder image,
// not an error: Bing a small PNG (its real photos are JPEG), Esri a grey
// "Map data not yet available" JPEG. Drawn as-is they show up on the block as
// blank or labelled squares. Each tile therefore tries Bing, then Esri, at
// its zoom, then the same one level coarser (cropped and enlarged), so every
// site gets the sharpest imagery that actually exists there.
const MAX_FALLBACK_LEVELS = 4
const esriTileUrl = (x: number, y: number, z: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
// open Atlantic at zoom 19: always Esri's placeholder
const ESRI_MISSING_URL = esriTileUrl(233016, 307979, 19)
let esriMissing: Promise<Uint8Array | null> | null = null

function sameBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const img = new Image()
  const url = URL.createObjectURL(blob)
  try {
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** One tile's real imagery, or null if both providers only have a placeholder. */
async function fetchRealTile(x: number, y: number, z: number): Promise<HTMLImageElement | null> {
  try {
    const bing = await fetch(getBingMapsTileUrl(x, y, z))
    if (bing.ok && (bing.headers.get('content-type') ?? '').includes('jpeg')) return await blobToImage(await bing.blob())
  } catch { /* try Esri */ }
  try {
    esriMissing ??= fetch(ESRI_MISSING_URL).then(async (r) => new Uint8Array(await r.arrayBuffer())).catch(() => null)
    const esri = await fetch(esriTileUrl(x, y, z))
    if (!esri.ok) return null
    const bytes = new Uint8Array(await esri.arrayBuffer())
    const missing = await esriMissing
    if (missing && sameBytes(bytes, missing)) return null
    return await blobToImage(new Blob([bytes as BlobPart], { type: 'image/jpeg' }))
  } catch {
    return null
  }
}

async function bestTile(
  x: number, y: number, z: number, cache: Map<string, Promise<HTMLImageElement | null>>,
): Promise<{ img: HTMLImageElement; levelsUp: number } | null> {
  for (let d = 0; d <= MAX_FALLBACK_LEVELS; d++) {
    const key = `${z - d}/${x >> d}/${y >> d}`
    if (!cache.has(key)) cache.set(key, fetchRealTile(x >> d, y >> d, z - d))
    const img = await cache.get(key)!
    if (img) return { img, levelsUp: d }
  }
  return null
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

  // Fetch and draw tiles (coarser fallback tiles are shared between neighbours)
  const parents = new Map<string, Promise<HTMLImageElement | null>>()
  const tilePromises: Promise<void>[] = []
  for (let ty = topLeft.y; ty <= bottomRight.y; ty++) {
    for (let tx = topLeft.x; tx <= bottomRight.x; tx++) {
      const promise = (async () => {
        try {
          const found = await bestTile(tx, ty, zoom, parents)
          if (!found) {
            console.warn(`[Satellite] No imagery for tile ${tx},${ty} down to zoom ${zoom - MAX_FALLBACK_LEVELS}`)
            return
          }
          // a coarser tile covers 2^d x 2^d of ours: draw just our part, enlarged
          const part = 256 >> found.levelsUp
          const sx = (tx - ((tx >> found.levelsUp) << found.levelsUp)) * part
          const sy = (ty - ((ty >> found.levelsUp) << found.levelsUp)) * part
          ctx.drawImage(found.img, sx, sy, part, part, (tx - topLeft.x) * 256, (ty - topLeft.y) * 256, 256, 256)
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
  // The renderer outputs sRGB; untagged, the photo's colours get converted
  // twice and come out washed-out and pale.
  texture.colorSpace = THREE.SRGBColorSpace
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

  const zoom = 18
  const mosaic = await fetchSatelliteTiles(minLat, maxLat, minLon, maxLon, zoom)
  return canvasToTexture(cropToBounds(mosaic, minLat, maxLat, minLon, maxLon, zoom))
}
