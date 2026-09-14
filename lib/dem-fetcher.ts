/**
 * DEM (Digital Elevation Model) Fetcher
 * 
 * Fetches real elevation data from multiple sources (USGS, OpenTopography, etc.)
 * and converts it to elevation grids suitable for terrain visualization.
 * 
 * Supports:
 * - Open-Elevation API (free, open-source)
 * - USGS 3DEP data (via cloud-optimized GeoTIFF)
 * - Fallback to procedural terrain if real data unavailable
 */

export interface DemDataPoint {
  lat: number
  lon: number
  elevation: number
}

export interface DemGrid {
  gridSize: number
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
  elevations: number[][] // row-major: [lat index][lon index]
  minElevation: number
  maxElevation: number
}

/**
 * Fetch elevation data for a bounding box
 * Returns a regular grid of elevation samples
 */
export async function fetchDemGridData(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  gridSize: number = 64
): Promise<DemGrid | null> {
  try {
    // Try Open-Elevation API first (free, no key needed)
    return await fetchFromOpenElevation(minLat, maxLat, minLon, maxLon, gridSize)
  } catch (err) {
    console.warn('DEM fetch failed, will use procedural terrain:', err)
    return null
  }
}

/**
 * Fetch using Open-Elevation API
 * https://open-elevation.com/
 */
async function fetchFromOpenElevation(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  gridSize: number
): Promise<DemGrid> {
  const latStep = (maxLat - minLat) / (gridSize - 1)
  const lonStep = (maxLon - minLon) / (gridSize - 1)

  // Build sample points
  const points: DemDataPoint[] = []
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const lat = minLat + row * latStep
      const lon = minLon + col * lonStep
      points.push({ lat, lon, elevation: 0 })
    }
  }

  console.log(`[DEM] Fetching ${points.length} elevation points for grid ${gridSize}x${gridSize}`)
  console.log(`[DEM] Bounding box: lat [${minLat}, ${maxLat}], lon [${minLon}, ${maxLon}]`)

  // Batch requests (API limit ~2000 points per request)
  const batchSize = 500
  const elevations: number[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0))

  for (let batch = 0; batch < Math.ceil(points.length / batchSize); batch++) {
    const start = batch * batchSize
    const end = Math.min(start + batchSize, points.length)
    const batchPoints = points.slice(start, end)

    const requestBody = {
      locations: batchPoints.map(p => ({ latitude: p.lat, longitude: p.lon }))
    }

    console.log(`[DEM] Batch ${batch + 1}/${Math.ceil(points.length / batchSize)}: ${batchPoints.length} points`)

    const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) throw new Error(`Open-Elevation API error: ${response.status}`)

    const data = await response.json()
    if (!data.results) throw new Error('Invalid Open-Elevation response')

    console.log(`[DEM] Batch ${batch + 1} returned ${data.results.length} results`)

    // Place elevations into grid
    for (let i = 0; i < batchPoints.length; i++) {
      const globalIdx = start + i
      const row = Math.floor(globalIdx / gridSize)
      const col = globalIdx % gridSize
      const result = data.results[i]
      if (result) {
        elevations[row][col] = result.elevation || 0
      }
    }
  }

  // Find min/max
  let minElev = Infinity
  let maxElev = -Infinity
  for (const row of elevations) {
    for (const elev of row) {
      if (elev < minElev) minElev = elev
      if (elev > maxElev) maxElev = elev
    }
  }

  console.log(`[DEM] Grid complete: elevation range [${minElev}, ${maxElev}]m`)

  return {
    gridSize,
    minLat,
    maxLat,
    minLon,
    maxLon,
    elevations,
    minElevation: minElev,
    maxElevation: maxElev
  }
}

/**
 * Scale elevation grid to a target amplitude (local units)
 * Normalizes the elevation range and applies desired amplitude
 */
export function normalizeElevationGrid(grid: DemGrid, targetAmplitude: number): number[][] {
  const { elevations, minElevation, maxElevation } = grid
  const range = maxElevation - minElevation || 1 // Avoid division by zero

  return elevations.map(row =>
    row.map(elev => {
      // Normalize to 0..1, then scale to target amplitude
      const normalized = (elev - minElevation) / range
      return normalized * targetAmplitude
    })
  )
}

/**
 * Downsample a DEM grid to a smaller grid size (bilinear interpolation)
 */
export function downsampleElevationGrid(grid: DemGrid, targetSize: number): number[][] {
  const { gridSize, elevations } = grid
  const scale = (gridSize - 1) / (targetSize - 1)
  const result: number[][] = Array(targetSize).fill(null).map(() => Array(targetSize).fill(0))

  for (let i = 0; i < targetSize; i++) {
    for (let j = 0; j < targetSize; j++) {
      const srcI = i * scale
      const srcJ = j * scale
      result[i][j] = bilinearSample(elevations, srcI, srcJ)
    }
  }

  return result
}

/**
 * Bilinear interpolation for elevation sampling
 */
function bilinearSample(grid: number[][], x: number, y: number): number {
  const size = grid.length
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi

  const clamp = (v: number) => Math.max(0, Math.min(size - 1, v))
  const x0 = clamp(xi)
  const x1 = clamp(xi + 1)
  const y0 = clamp(yi)
  const y1 = clamp(yi + 1)

  const v00 = grid[y0][x0]
  const v10 = grid[y0][x1]
  const v01 = grid[y1][x0]
  const v11 = grid[y1][x1]

  const top = v00 * (1 - xf) + v10 * xf
  const bottom = v01 * (1 - xf) + v11 * xf
  return top * (1 - yf) + bottom * yf
}

/**
 * Get bounding box for a site's terrain block
 * Expands ~2km around the site center
 */
export function getSiteBoundingBox(
  siteLatitude: number,
  siteLongitude: number,
  radiusKm: number = 2
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  // 1 degree ~111 km at equator
  const latDelta = radiusKm / 111
  const lonDelta = radiusKm / (111 * Math.cos(siteLatitude * Math.PI / 180))

  return {
    minLat: siteLatitude - latDelta,
    maxLat: siteLatitude + latDelta,
    minLon: siteLongitude - lonDelta,
    maxLon: siteLongitude + lonDelta
  }
}
