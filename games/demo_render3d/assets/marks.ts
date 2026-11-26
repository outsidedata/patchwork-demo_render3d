// The pictures of the marks scene's marks (`marks.decal3d.json`), drawn from noise and written as PNGs
// beside this file, 256 pixels a side, RGBA, their alpha the mark's shape:
//   hole.png         a bullet's hole: a black core, a torn grey rim with cracks running out, a faint soot
//   hole-normal.png  the hole's normal map, tangent space, from the same crater's heights: sunk at the
//                    core, raised at the rim (a `space: 'linear'` texture entry)
//   scorch.png       a blast's scorch: soot, dense at the middle, its edge ragged
//   splat.png        a splash of paint, white so the look's colour tints it: a lumpy blob and drops
//                    flung out round it
// Run from the repo root to draw them again:
//   node --experimental-strip-types games/demo_render3d/assets/marks.ts
import { writeFileSync } from 'node:fs'
import { zlibSync } from 'fflate'

const N = 256

// A hash of two whole numbers and a seed, 0 to 1.
function hash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
// Smooth value noise, 0 to 1.
function noise(x: number, y: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi
  const s = (t: number) => t * t * (3 - 2 * t)
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed)
  return a + (b - a) * s(fx) + (c - a) * s(fy) + (a - b - c + d) * s(fx) * s(fy)
}
// Octaves of it, 0 to 1.
function fbm(x: number, y: number, seed: number, octaves = 5) {
  let sum = 0, amp = 0.5, f = 1, norm = 0
  for (let o = 0; o < octaves; o++) { sum += noise(x * f, y * f, seed + o * 31) * amp; norm += amp; amp *= 0.5; f *= 2 }
  return sum / norm
}
// Noise round a circle, so it meets itself: `a` radians, `k` bumps a turn.
const round = (a: number, k: number, seed: number) => fbm(Math.cos(a) * k + 50, Math.sin(a) * k + 50, seed, 4)
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (e0: number, e1: number, v: number) => { const t = clamp((v - e0) / (e1 - e0)); return t * t * (3 - 2 * t) }

// A PNG of RGBA pixels, each 0 to 1.
function png(path: string, px: (x: number, y: number) => [number, number, number, number]) {
  const raw = new Uint8Array(N * (N * 4 + 1))
  for (let y = 0; y < N; y++) {
    raw[y * (N * 4 + 1)] = 0
    for (let x = 0; x < N; x++) {
      const [r, g, b, a] = px(x, y)
      const o = y * (N * 4 + 1) + 1 + x * 4
      raw[o] = Math.round(clamp(r) * 255); raw[o + 1] = Math.round(clamp(g) * 255); raw[o + 2] = Math.round(clamp(b) * 255); raw[o + 3] = Math.round(clamp(a) * 255)
    }
  }
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0 }
  const crc = (bytes: Uint8Array) => { let c = 0xffffffff; for (const b of bytes) c = table[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length)
    const v = new DataView(out.buffer)
    v.setUint32(0, data.length)
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
    out.set(data, 8)
    v.setUint32(8 + data.length, crc(out.subarray(4, 8 + data.length)))
    return out
  }
  const head = new Uint8Array(13)
  const hv = new DataView(head.buffer)
  hv.setUint32(0, N); hv.setUint32(4, N); head[8] = 8; head[9] = 6
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', zlibSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0))]
  const file = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  let at = 0
  for (const p of parts) { file.set(p, at); at += p.length }
  writeFileSync(new URL(path, import.meta.url), file)
}

// Where a pixel is: its distance from the middle, 0 to 1 at the picture's edge, and its angle.
const polar = (x: number, y: number) => {
  const u = ((x + 0.5) / N) * 2 - 1, v = ((y + 0.5) / N) * 2 - 1
  return { u, v, r: Math.hypot(u, v), a: Math.atan2(v, u) }
}

// The hole's crater: its height at a pixel, −1 sunk at the core to a rim raised near 0.3, flat past it,
// its rim torn by noise round it.
function crater(x: number, y: number) {
  const { r, a, u, v } = polar(x, y)
  const torn = 0.26 + 0.07 * (round(a, 3, 7) - 0.5) + 0.03 * (fbm(u * 9, v * 9, 3) - 0.5)
  const core = 0.11 + 0.025 * (round(a, 5, 11) - 0.5)
  if (r < core) return -1
  if (r < torn) { const t = (r - core) / (torn - core); return -1 + 1.45 * Math.sin((t * Math.PI) / 2) }
  const out = (r - torn) / 0.06
  return 0.45 * Math.exp(-out * out)
}

png('./hole.png', (x, y) => {
  const { r, a, u, v } = polar(x, y)
  const h = crater(x, y)
  const cracks = Math.max(0, 1 - Math.abs(round(a, 4, 21) - 0.5) * 9) * smooth(0.5, 0.18, r + 0.1 * (fbm(u * 7, v * 7, 23) - 0.5))
  const soot = smooth(0.5, 0.18, r + 0.08 * (fbm(u * 4, v * 4, 5) - 0.5))
  const shade = h <= -1 ? 0.02 : 0.08 + 0.32 * clamp(h + 0.6) - 0.12 * cracks
  const alpha = Math.max(h <= -1 ? 1 : smooth(0.34, 0.2, r) * 0.95, soot * 0.55, cracks * 0.8)
  return [shade, shade * 0.97, shade * 0.93, alpha]
})

png('./hole-normal.png', (x, y) => {
  const e = 1
  const dx = (crater(Math.min(N - 1, x + e), y) - crater(Math.max(0, x - e), y)) / (2 * e)
  const dy = (crater(x, Math.min(N - 1, y + e)) - crater(x, Math.max(0, y - e))) / (2 * e)
  const k = 22
  // the picture's rows run down while its v runs up, so the slope down the picture is the height's fall in v
  const n = [-dx * k, dy * k, 1]
  const l = Math.hypot(n[0], n[1], n[2])
  return [n[0] / l * 0.5 + 0.5, n[1] / l * 0.5 + 0.5, n[2] / l * 0.5 + 0.5, 1]
})

png('./scorch.png', (x, y) => {
  const { r, a, u, v } = polar(x, y)
  const edge = 0.62 + 0.22 * (round(a, 4, 41) - 0.5) + 0.12 * (fbm(u * 6, v * 6, 43) - 0.5)
  const soot = smooth(edge, edge * 0.35, r)
  const streak = 0.5 + 0.5 * round(a, 14, 47)
  const tone = 0.03 + 0.06 * fbm(u * 10, v * 10, 49)
  return [tone * 1.3, tone * 1.05, tone * 0.8, soot * (0.75 + 0.25 * streak)]
})

// The splat's drops: where each is flung, and how big.
const drops = Array.from({ length: 14 }, (_, i) => {
  const a = hash(i, 1, 61) * Math.PI * 2, d = 0.5 + 0.38 * hash(i, 2, 61)
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: 0.018 + 0.045 * hash(i, 3, 61) }
})
png('./splat.png', (x, y) => {
  const { r, a, u, v } = polar(x, y)
  const edge = 0.38 + 0.16 * (round(a, 3, 63) - 0.5) + 0.1 * (round(a, 8, 67) - 0.5)
  let inside = smooth(edge + 0.012, edge - 0.012, r)
  for (const d of drops) inside = Math.max(inside, smooth(d.r + 0.01, d.r - 0.01, Math.hypot(u - d.x, v - d.y)))
  const sheen = 0.86 + 0.14 * fbm(u * 5, v * 5, 71)
  return [sheen, sheen, sheen, inside]
})
