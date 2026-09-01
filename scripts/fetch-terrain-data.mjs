// One-time data generator for the per-site 3D terrain view.
//
// Fetches real elevation (Open-Elevation, SRTM-derived) and real satellite
// imagery (Esri World Imagery tiles) for each mine site's actual coordinates
// and bakes them into static files under public/terrain/<siteId>/. The app
// never calls these external services at runtime — it only reads the files
// this script produces — so re-run this manually if site coordinates change:
//
//   node scripts/fetch-terrain-data.mjs
//
// Site list is mirrored from lib/mdmis-data.ts SITES (id/lat/lng only) —
// keep the two in sync if a site is added, removed, or relocated.

const SITES = [
  { id: 'RW-RTG-01', lat: -1.7783, lng: 30.0611 },
  { id: 'RW-GTB-02', lat: -1.8642, lng: 29.5231 },
  { id: 'RW-NYK-03', lat: -1.7419, lng: 30.0089 },
  { id: 'RW-GFW-04', lat: -1.9928, lng: 29.4102 },
  { id: 'RW-RWK-05', lat: -2.1481, lng: 30.5892 },
  { id: 'RW-NMB-06', lat: -1.6892, lng: 29.7743 },
  { id: 'RW-BGR-07', lat: -2.6889, lng: 29.0031 },
  { id: 'RW-MSH-08', lat: -1.9231, lng: 30.3402 },
  { id: 'RW-KRG-09', lat: -2.0031, lng: 29.3781 },
  { id: 'RW-RTS-10', lat: -1.9312, lng: 29.3312 },
]

const HALF_EXTENT_M = 450 // ~900m x 900m box per site
const ELEV_GRID_SIZE = 33 // 33x33 = 1089 points, one batch request per site
const TILE_ZOOM = 17 // ~1.19 m/px at these latitudes -> ~305m per 256px tile

const OUT_ROOT = new URL('../public/terrain/', import.meta.url)

function metersPerDegLat() {
  return 111320
}
function metersPerDegLng(lat) {
  return 111320 * Math.cos((lat * Math.PI) / 180)
}

function bboxFor(lat, lng) {
  const dLat = HALF_EXTENT_M / metersPerDegLat()
  const dLng = HALF_EXTENT_M / metersPerDegLng(lat)
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng }
}

function lonToTileX(lon, z) {
  return Math.floor(((lon + 180) / 360) * 2 ** z)
}
function latToTileY(lat, z) {
  const r = (lat * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z)
}

async function fetchWithRetry(url, options, tries = 3) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, options)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res
    } catch (err) {
      lastErr = err
      await new Promise((r) => setTimeout(r, 800 * (i + 1)))
    }
  }
  throw lastErr
}

async function fetchElevationGrid(bbox) {
  const locations = []
  for (let i = 0; i < ELEV_GRID_SIZE; i++) {
    const lat = bbox.minLat + ((bbox.maxLat - bbox.minLat) * i) / (ELEV_GRID_SIZE - 1)
    for (let j = 0; j < ELEV_GRID_SIZE; j++) {
      const lng = bbox.minLng + ((bbox.maxLng - bbox.minLng) * j) / (ELEV_GRID_SIZE - 1)
      locations.push({ latitude: lat, longitude: lng })
    }
  }
  const res = await fetchWithRetry('https://api.open-elevation.com/api/v1/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locations }),
  })
  const data = await res.json()
  const values = []
  for (let i = 0; i < ELEV_GRID_SIZE; i++) {
    const row = []
    for (let j = 0; j < ELEV_GRID_SIZE; j++) {
      row.push(data.results[i * ELEV_GRID_SIZE + j].elevation)
    }
    values.push(row)
  }
  return values
}

async function fetchTiles(bbox, siteDir) {
  const xMin = lonToTileX(bbox.minLng, TILE_ZOOM)
  const xMax = lonToTileX(bbox.maxLng, TILE_ZOOM)
  const yMin = latToTileY(bbox.maxLat, TILE_ZOOM) // smaller y = further north
  const yMax = latToTileY(bbox.minLat, TILE_ZOOM)

  const cols = xMax - xMin + 1
  const rows = yMax - yMin + 1
  const tilesDir = new URL('tiles/', siteDir)
  const fs = await import('node:fs/promises')
  await fs.mkdir(tilesDir, { recursive: true })

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = xMin + c
      const y = yMin + r
      const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${TILE_ZOOM}/${y}/${x}`
      const res = await fetchWithRetry(url)
      const buf = Buffer.from(await res.arrayBuffer())
      await fs.writeFile(new URL(`${r}_${c}.jpg`, tilesDir), buf)
    }
  }

  return {
    rows,
    cols,
    z: TILE_ZOOM,
    // real-world bounds actually covered by the fetched tile grid (slightly
    // larger than bbox since tiles are fetched in whole-tile increments)
  }
}

async function main() {
  const fs = await import('node:fs/promises')
  await fs.mkdir(OUT_ROOT, { recursive: true })

  const failures = []
  for (const site of SITES) {
    process.stdout.write(`${site.id}: `)
    try {
      const bbox = bboxFor(site.lat, site.lng)
      const siteDir = new URL(`${site.id}/`, OUT_ROOT)
      await fs.mkdir(siteDir, { recursive: true })

      const [elevationValues, tileGrid] = await Promise.all([fetchElevationGrid(bbox), fetchTiles(bbox, siteDir)])

      const manifest = {
        siteId: site.id,
        center: { lat: site.lat, lng: site.lng },
        bbox,
        tileGrid,
        elevation: {
          gridSize: ELEV_GRID_SIZE,
          minLat: bbox.minLat,
          maxLat: bbox.maxLat,
          minLng: bbox.minLng,
          maxLng: bbox.maxLng,
          values: elevationValues,
        },
      }
      await fs.writeFile(new URL('manifest.json', siteDir), JSON.stringify(manifest))

      const flat = elevationValues.flat()
      const relief = Math.max(...flat) - Math.min(...flat)
      console.log(`ok (${tileGrid.rows}x${tileGrid.cols} tiles, relief ${relief}m)`)
    } catch (err) {
      console.log(`FAILED (${err.message})`)
      failures.push(site.id)
    }
  }

  if (failures.length) {
    console.log(`\n${failures.length} site(s) failed: ${failures.join(', ')} — re-run the script to retry them.`)
    process.exitCode = 1
  } else {
    console.log('\nAll sites generated successfully.')
  }
}

main()
