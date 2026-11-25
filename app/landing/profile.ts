import SITES from './sites.json'

export type Site = {
  id: string
  name: string
  district: string
  mineral: string
  min: number
  max: number
  grid: number[][] // 33 x 33 ground elevations in metres, row 0 = north
}

export const sites = SITES as Site[]

/**
 * The page's one shape: the real ground profile of the Rutongo tin belt
 * (RW-RTG-01), taken from the row of its elevation grid with the most
 * relief. It cuts the top edge of every block, picture and band on the page,
 * the way MDMIS cuts a site out of the ground.
 */
const rutongo = sites.find((s) => s.id === 'RW-RTG-01')!
const row = rutongo.grid.reduce((best, r) =>
  Math.max(...r) - Math.min(...r) > Math.max(...best) - Math.min(...best) ? r : best)
const lo = Math.min(...row)
const hi = Math.max(...row)

/** 0..1 heights along the profile, west to east */
export const PROFILE = row.map((v) => (v - lo) / (hi - lo || 1))

/** clip-path whose top edge is the profile, `depth` = how deep the cut runs (CSS length) */
export function profileClip(depth: string, flip = false): string {
  const n = PROFILE.length - 1
  const pts = PROFILE.map((v, i) => {
    const x = flip ? 100 - (i / n) * 100 : (i / n) * 100
    return `${x.toFixed(2)}% calc(${depth} * ${(1 - v).toFixed(3)})`
  })
  return `polygon(${pts.join(', ')}, 100% 100%, 0% 100%)`
}

/** Heights for the footer's block letters: the profile sampled at n points */
export function profileSamples(n: number): number[] {
  return Array.from({ length: n }, (_, i) => PROFILE[Math.round((i / (n - 1)) * (PROFILE.length - 1))])
}

export const MINERAL_LABEL: Record<string, string> = {
  cassiterite: 'Cassiterite', coltan: 'Coltan', wolframite: 'Wolframite',
  gold: 'Gold', lithium: 'Spodumene', beryl: 'Beryl',
}
