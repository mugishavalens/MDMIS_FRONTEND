// Tiny deterministic value-noise generator — no external dependency needed
// for the stylized terrain blocks (we don't need true Perlin/Simplex fidelity).

function hash(x: number, y: number, seed: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123
  return h - Math.floor(h)
}

function smooth(t: number) {
  return t * t * (3 - 2 * t)
}

function valueNoise2D(x: number, y: number, seed: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const tl = hash(xi, yi, seed)
  const tr = hash(xi + 1, yi, seed)
  const bl = hash(xi, yi + 1, seed)
  const br = hash(xi + 1, yi + 1, seed)
  const u = smooth(xf)
  const v = smooth(yf)
  const top = tl + (tr - tl) * u
  const bottom = bl + (br - bl) * u
  return top + (bottom - top) * v
}

/** Fractal Brownian motion — returns a value roughly in [0, 1]. */
export function fbm2D(x: number, y: number, seed: number, octaves = 4) {
  let amp = 0.5
  let freq = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise2D(x * freq, y * freq, seed + i * 17) * amp
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return norm === 0 ? 0 : sum / norm
}

/** GLSL-style scalar hash — deterministic pseudo-random number in [0, 1) from two numbers. */
export function hash2(a: number, b: number) {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453123
  return h - Math.floor(h)
}

/** Stable string -> number seed so each site gets a consistent, distinct terrain. */
export function seedFromString(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h) % 10000
}
