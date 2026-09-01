// Per-site 3D terrain-block presets for the Subsurface Explorer.
// Grounded in real Rwandan topography/geology per district (see research notes):
// Northern volcanic highlands (Rulindo/Gakenke), Congo-Nile ridge (Rutsiro),
// Lake Kivu shoreline (Karongi), Ruzizi rift valley floor (Rusizi/Bugarama),
// central thousand-hills plateau (Rwamagana), eastern savanna (Kayonza),
// and western foothill/river-wetland terrain (Ngororero/Gatumba).
// Colors are explicit hex (not oklch/CSS vars) because three.js materials
// can't parse those — kept in sync with MINERAL_META's chart-1..5 mapping.

import type { Mineral } from './mdmis-data'

export type BiomeId =
  | 'northernHighlands'
  | 'westernRidge'
  | 'lakeside'
  | 'riftValleyFloor'
  | 'centralHills'
  | 'easternSavanna'
  | 'westernFoothill'

export interface BiomePreset {
  label: string
  amplitude: number
  frequency: number
  colors: { low: string; mid: string; high: string; peak: string }
  hasWater: boolean
  waterColor: string
  treeDensity: number
  treeColors: string[]
  skyTint: string
}

export const BIOME_PRESETS: Record<BiomeId, BiomePreset> = {
  northernHighlands: {
    label: 'Northern volcanic highlands',
    amplitude: 3.2,
    frequency: 0.9,
    // Vivid Rwandan green — lush terraced hillsides, red-clay exposed soil
    colors: { low: '#5a9e45', mid: '#4db848', high: '#a8d070', peak: '#e8f4d8' },
    hasWater: false,
    waterColor: '#4a9fd4',
    treeDensity: 0.55,
    treeColors: ['#2d7a30', '#3d9040'],
    // Bright daytime sky — no dark horizon
    skyTint: '#b8d8f0',
  },
  westernRidge: {
    label: 'Congo-Nile divide ridge',
    amplitude: 4.0,
    frequency: 0.7,
    colors: { low: '#6b8a50', mid: '#92aa62', high: '#ccd4a0', peak: '#f0eedf' },
    hasWater: false,
    waterColor: '#4a88c0',
    treeDensity: 0.3,
    treeColors: ['#3a6030', '#4a7840'],
    skyTint: '#c4d8e8',
  },
  lakeside: {
    label: 'Lake Kivu shoreline hills',
    amplitude: 3.4,
    frequency: 0.85,
    colors: { low: '#3a8858', mid: '#5aaa5e', high: '#a0cc80', peak: '#e2f0d0' },
    hasWater: true,
    waterColor: '#1a78c0',
    treeDensity: 0.45,
    treeColors: ['#2a6840', '#40885a'],
    skyTint: '#b0d8f0',
  },
  riftValleyFloor: {
    label: 'Ruzizi rift valley floor',
    amplitude: 1.1,
    frequency: 0.5,
    colors: { low: '#a0b840', mid: '#c8cc50', high: '#dfd890', peak: '#f4f0c8' },
    hasWater: true,
    waterColor: '#2888b0',
    treeDensity: 0.2,
    treeColors: ['#88a030', '#a0b840'],
    skyTint: '#f0e8c0',
  },
  centralHills: {
    label: 'Central thousand-hills plateau',
    amplitude: 2.6,
    frequency: 0.95,
    colors: { low: '#5aaa48', mid: '#80c058', high: '#b8d880', peak: '#e8f4d0' },
    hasWater: false,
    waterColor: '#4890cc',
    treeDensity: 0.4,
    treeColors: ['#2a7030', '#408848'],
    skyTint: '#c0dce8',
  },
  easternSavanna: {
    label: 'Eastern savanna plains',
    amplitude: 0.9,
    frequency: 0.45,
    colors: { low: '#c8b050', mid: '#d8c870', high: '#e8dca0', peak: '#f5eec8' },
    hasWater: true,
    waterColor: '#3890a8',
    treeDensity: 0.12,
    treeColors: ['#908830', '#a8a040'],
    skyTint: '#f0e4b0',
  },
  westernFoothill: {
    label: 'Western foothill / river wetland',
    amplitude: 2.2,
    frequency: 0.8,
    colors: { low: '#4a9858', mid: '#70b858', high: '#b0cc88', peak: '#e4f0d0' },
    hasWater: true,
    waterColor: '#2878a8',
    treeDensity: 0.5,
    treeColors: ['#306838', '#409050'],
    skyTint: '#c0dce0',
  },
}

export type RockToneId =
  | 'paleQuartzite'
  | 'darkVeinMetasediment'
  | 'blackShale'
  | 'brightPegmatite'
  | 'mixedPegmatiteSchist'
  | 'orogenicQuartzVein'

export interface StrataPreset {
  label: string
  /** bottom (bedrock) -> top (subsoil, just under the surface layer) */
  bands: string[]
}

export const STRATA_PRESETS: Record<RockToneId, StrataPreset> = {
  paleQuartzite: {
    label: 'Quartzite anticline, tin-bearing veins',
    bands: ['#6f5e49', '#8a7660', '#a8916f', '#c7ac84', '#e0c99e'],
  },
  darkVeinMetasediment: {
    label: 'Dense metasediment, wolframite veins',
    bands: ['#3c322d', '#514136', '#6b5646', '#8a6f58', '#ad8c6c'],
  },
  blackShale: {
    label: 'Graphite-rich black shale',
    bands: ['#232326', '#333133', '#474442', '#615c56', '#7d766c'],
  },
  brightPegmatite: {
    label: 'Crystalline LCT pegmatite',
    bands: ['#6a5876', '#8a7395', '#ab8fb3', '#cbb0cf', '#e8d4e8'],
  },
  mixedPegmatiteSchist: {
    label: 'Pegmatite dikes cutting mica-schist',
    bands: ['#5c4c3e', '#75614c', '#93795d', '#b39871', '#d3ba93'],
  },
  orogenicQuartzVein: {
    label: 'Shallow orogenic quartz-gold veins',
    bands: ['#4d3f36', '#685544', '#87715a', '#a58a6a', '#c9ab84'],
  },
}

// Hex equivalents of the app's --chart-1..5 tokens (three.js can't parse
// oklch), kept aligned with MINERAL_META's commodity color assignments.
export const MINERAL_HEX: Record<Mineral, string> = {
  Cassiterite: '#e6b84d',
  Gold: '#e6b84d',
  Coltan: '#4bc5d6',
  Wolframite: '#3fcf8e',
  Beryl: '#9b6dff',
  Lithium: '#e65a46',
}

export interface SiteTerrainPreset {
  biome: BiomeId
  rockTone: RockToneId
}

// Rock tone is picked from each site's actual primary/secondary mineralogy
// rather than assigned round-robin, so two sites only ever share a cutaway
// palette when they share a real deposit type (e.g. the two wolframite
// veins, or the two orogenic gold-quartz sites) — never by coincidence.
export const SITE_TERRAIN: Record<string, SiteTerrainPreset> = {
  'RW-RTG-01': { biome: 'northernHighlands', rockTone: 'paleQuartzite' }, // Cassiterite — quartzite tin-vein belt
  'RW-GTB-02': { biome: 'westernFoothill', rockTone: 'brightPegmatite' }, // Coltan+Beryl — Gatumba's classic LCT pegmatite field
  'RW-NYK-03': { biome: 'northernHighlands', rockTone: 'darkVeinMetasediment' }, // Wolframite veins
  'RW-GFW-04': { biome: 'westernRidge', rockTone: 'darkVeinMetasediment' }, // Wolframite veins
  'RW-RWK-05': { biome: 'easternSavanna', rockTone: 'orogenicQuartzVein' }, // Gold
  'RW-NMB-06': { biome: 'northernHighlands', rockTone: 'mixedPegmatiteSchist' }, // Coltan — pegmatite dikes in schist
  'RW-BGR-07': { biome: 'riftValleyFloor', rockTone: 'brightPegmatite' }, // Lithium+Beryl — LCT pegmatite
  'RW-MSH-08': { biome: 'centralHills', rockTone: 'blackShale' }, // flagged/unstable — darker graphitic host reads as the outlier
  'RW-KRG-09': { biome: 'lakeside', rockTone: 'mixedPegmatiteSchist' }, // Beryl — pegmatite/schist contact zone
  'RW-RTS-10': { biome: 'westernRidge', rockTone: 'orogenicQuartzVein' }, // Gold
}

export function getSiteTerrain(siteId: string): SiteTerrainPreset {
  return SITE_TERRAIN[siteId] ?? { biome: 'centralHills', rockTone: 'mixedPegmatiteSchist' }
}

// Real SRTM elevation (meters) at each site's exact coordinates, looked up
// via the open-elevation API. Rwanda's mining districts span a genuinely
// wide range — the Ruzizi rift floor at Bugarama sits ~1150m lower than the
// Gatumba ridge — so this is used to scale terrain height/ruggedness per
// site instead of only bucketing by biome.
export const ELEVATION_M: Record<string, number> = {
  'RW-RTG-01': 1696,
  'RW-GTB-02': 2135,
  'RW-NYK-03': 1978,
  'RW-GFW-04': 1909,
  'RW-RWK-05': 1438,
  'RW-NMB-06': 1717,
  'RW-BGR-07': 980,
  'RW-MSH-08': 1617,
  'RW-KRG-09': 1700,
  'RW-RTS-10': 1632,
}

const ELEVATION_MIN = 950
const ELEVATION_MAX = 2150

export function getElevationM(siteId: string): number {
  return ELEVATION_M[siteId] ?? 1600
}

/** 0 (valley floor) .. 1 (highest ridge), from each site's real elevation. */
export function getElevationFactor(siteId: string): number {
  const e = getElevationM(siteId)
  return Math.min(1, Math.max(0, (e - ELEVATION_MIN) / (ELEVATION_MAX - ELEVATION_MIN)))
}

// --- deterministic per-site color jitter (hex <-> HSL, dependency-free) ---

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h /= 6
  }
  return [h * 360, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = (((h % 360) + 360) % 360) / 360
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  let r: number
  let g: number
  let b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, hue + 1 / 3)
    g = hue2rgb(p, q, hue)
    b = hue2rgb(p, q, hue - 1 / 3)
  }
  const toHex = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function siteHash(seedNum: number, salt: number) {
  const h = Math.sin(seedNum * 12.9898 + salt * 78.233) * 43758.5453123
  return h - Math.floor(h)
}

function jitterHex(hex: string, seedNum: number, salt: number, hueRange = 10, lightRange = 0.05): string {
  const [h, s, l] = hexToHsl(hex)
  const hueShift = (siteHash(seedNum, salt) - 0.5) * 2 * hueRange
  const lightShift = (siteHash(seedNum, salt + 7) - 0.5) * 2 * lightRange
  return hslToHex(h + hueShift, s, Math.min(0.95, Math.max(0.05, l + lightShift)))
}

export interface ResolvedTerrainConfig {
  biome: BiomePreset
  strata: StrataPreset
  /** strata.bands nudged by the same per-site jitter as the surface colors,
   *  so two sites sharing a rockTone (e.g. the two wolframite veins) still
   *  show a visibly different cutaway rather than identical hex bands. */
  strataBands: string[]
  colors: BiomePreset['colors']
  amplitude: number
  frequency: number
  elevationM: number
  elevationFactor: number
}

/**
 * Resolves a site's final terrain look: biome palette nudged by a small
 * deterministic per-site hue/lightness jitter (so sites sharing a biome
 * bucket aren't visually identical), with amplitude/ruggedness scaled by
 * the site's real elevation.
 */
export function getResolvedTerrainConfig(siteId: string, seedNum: number): ResolvedTerrainConfig {
  const preset = getSiteTerrain(siteId)
  const biome = BIOME_PRESETS[preset.biome]
  const strata = STRATA_PRESETS[preset.rockTone]
  const elevationFactor = getElevationFactor(siteId)

  const colors = {
    low: jitterHex(biome.colors.low, seedNum, 1),
    mid: jitterHex(biome.colors.mid, seedNum, 2),
    high: jitterHex(biome.colors.high, seedNum, 3),
    peak: jitterHex(biome.colors.peak, seedNum, 4),
  }

  const strataBands = strata.bands.map((hex, i) => jitterHex(hex, seedNum, 20 + i, 8, 0.04))

  const amplitude = biome.amplitude * (0.5 + elevationFactor * 1.0)
  const frequency = biome.frequency * (0.85 + elevationFactor * 0.3)

  return {
    biome,
    strata,
    strataBands,
    colors,
    amplitude,
    frequency,
    elevationM: getElevationM(siteId),
    elevationFactor,
  }
}
