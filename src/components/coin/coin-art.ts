// Coin faces as textures for the Three.js coins (coin-engine.ts).
// Each face starts as a height map: thin raised ridges, sloped terraces and a raised lip,
// drawn with the canvas 2D API. From it we derive a normal map (the relief), crevice
// grime (dirt collects next to raised lines) and, with seeded noise, a mottled patina:
// the coins should read as old struck-metal artifacts. Tarnish fades as the learner
// progresses — studying a topic polishes its coin.

import { rng } from "@/lib/market"
import type { CoinShape, Metal, Pattern, Topic } from "@/lib/topics"

export type FaceStats = { primary: string; lines: string[] }
type RGB = [number, number, number]

/** Alloys: base colour, tarnish colour and the colour of the coin's edge. */
export const METALS: Record<Metal | "lead", { base: RGB; tarnish: RGB; edge: string }> = {
  brass: { base: [214, 172, 92], tarnish: [92, 66, 30], edge: "#b88f45" },
  copper: { base: [214, 140, 108], tarnish: [86, 44, 30], edge: "#b77458" },
  silver: { base: [206, 210, 214], tarnish: [78, 80, 84], edge: "#a9adb2" },
  verdigris: { base: [168, 186, 168], tarnish: [62, 84, 72], edge: "#8ea28f" },
  champagne: { base: [228, 206, 158], tarnish: [104, 88, 58], edge: "#c4ad7c" },
  lead: { base: [118, 118, 122], tarnish: [44, 44, 48], edge: "#5e5e62" },
  bronze: { base: [200, 128, 72], tarnish: [74, 44, 22], edge: "#a86a3c" },
  gold: { base: [238, 192, 84], tarnish: [112, 82, 26], edge: "#d0a23e" },
  obsidian: { base: [96, 100, 132], tarnish: [30, 32, 46], edge: "#4c5170" },
}

// ---------------------------------------------------------------------------
// Outlines (face units: -100..100, y down)

type Pt = [number, number]
const TAU = Math.PI * 2

/** The hole through a "vessel" coin. */
const VESSEL_HOLE = { x: 22, y: -16, r: 27 }

const pinwheelDiscs = () =>
  Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * TAU - Math.PI / 2
    return { x: 44 * Math.cos(a), y: 44 * Math.sin(a), r: 52, a }
  })

export function outline(shape: CoinShape, mirror = false): Pt[] {
  let pts: Pt[]
  switch (shape) {
    case "round":
      pts = Array.from({ length: 160 }, (_, i) => [100 * Math.cos((i / 160) * TAU), 100 * Math.sin((i / 160) * TAU)])
      break
    case "octagon":
      pts = Array.from({ length: 8 }, (_, i) => {
        const a = ((22.5 + i * 45) * Math.PI) / 180
        return [100 * Math.cos(a), 100 * Math.sin(a)] as Pt
      })
      break
    case "scallop": {
      // silhouette of the pinwheel's overlapping discs
      pts = []
      for (let i = 0; i < 270; i++) {
        const a = (i / 270) * TAU
        const u: Pt = [Math.cos(a), Math.sin(a)]
        let best = 0
        for (const c of pinwheelDiscs()) {
          const b = c.x * u[0] + c.y * u[1]
          const disc = b * b - (c.x * c.x + c.y * c.y - c.r * c.r)
          if (disc >= 0) best = Math.max(best, b + Math.sqrt(disc))
        }
        pts.push([best * u[0], best * u[1]])
      }
      break
    }
    case "vessel": {
      // a rounded triangle, point down (a triangle swept by a circle)
      const R = 68
      const rc = 30
      pts = []
      for (const deg of [210, 330, 90]) {
        const a = (deg * Math.PI) / 180
        const vx = R * Math.cos(a)
        const vy = R * Math.sin(a) - 8
        for (let i = 0; i <= 30; i++) {
          const t = a - Math.PI / 3 + ((2 * Math.PI) / 3) * (i / 30)
          pts.push([vx + rc * Math.cos(t), vy + rc * Math.sin(t)])
        }
      }
      break
    }
  }
  return mirror ? pts.map(([x, y]) => [-x, y] as Pt).reverse() : pts
}

export function holeOf(shape: CoinShape, mirror = false) {
  if (shape !== "vessel") return null
  return { ...VESSEL_HOLE, x: mirror ? -VESSEL_HOLE.x : VESSEL_HOLE.x }
}

function shapePath(shape: CoinShape, mirror: boolean, scale = 1) {
  const p = new Path2D()
  outline(shape, mirror).forEach(([x, y], i) => {
    if (i) p.lineTo(x * scale, y * scale)
    else p.moveTo(x * scale, y * scale)
  })
  p.closePath()
  return p
}

// ---------------------------------------------------------------------------
// Canvas helpers

function canvas(px: number) {
  const c = document.createElement("canvas")
  c.width = c.height = px
  const ctx = c.getContext("2d", { willReadFrequently: true })!
  ctx.setTransform(px / 200, 0, 0, px / 200, px / 2, px / 2)
  return { c, ctx }
}

const gray = (v: number) => {
  const c = Math.round(Math.max(0, Math.min(1, v)) * 255)
  return `rgb(${c},${c},${c})`
}

/** Smooth fractal noise: random pixels scaled up with smoothing, octave over octave. */
function noise(px: number, seed: number, base: number, octaves: number) {
  const out = document.createElement("canvas")
  out.width = out.height = px
  const ctx = out.getContext("2d", { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  const r = rng(seed)
  for (let o = 0; o < octaves; o++) {
    const n = base * 2 ** o
    const small = document.createElement("canvas")
    small.width = small.height = n
    const sctx = small.getContext("2d")!
    const img = sctx.createImageData(n, n)
    for (let i = 0; i < n * n; i++) {
      const v = Math.floor(r() * 256)
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
      img.data[i * 4 + 3] = 255
    }
    sctx.putImageData(img, 0, 0)
    ctx.globalAlpha = o === 0 ? 1 : 0.5
    ctx.drawImage(small, 0, 0, px, px)
  }
  return ctx.getImageData(0, 0, px, px).data
}

const serif = () =>
  (typeof document !== "undefined" && getComputedStyle(document.documentElement).getPropertyValue("--font-newsreader").trim()) || "Georgia, serif"

let mark: Path2D | null = null
const wceMark = () =>
  (mark ??= new Path2D(
    "M23 1.97697V24H20.8905V6.98202C20.8905 5.81653 19.8383 4.87162 18.5408 4.87162C17.2432 4.87162 16.1903 5.81653 16.1903 6.98202V24H13.7772V9.00119C13.7772 7.83571 12.7257 6.89079 11.4275 6.89079C10.1292 6.89079 9.07771 7.83571 9.07771 9.00119V24H6.66467V11.021C6.66467 9.85556 5.61243 8.91065 4.3149 8.91065C3.01737 8.91065 1.96513 9.85556 1.96513 11.021V24H0V6.32303L22.9979 0L23 1.97697Z",
  ))

// ---------------------------------------------------------------------------
// Patterns. `layer` is "height" (ridges and terraces) or "tone" (per-region shade, 0.5 neutral).

type Layer = "height" | "tone"

function ridges(ctx: CanvasRenderingContext2D, w: number, draw: () => void) {
  ctx.strokeStyle = gray(0.95)
  ctx.lineWidth = w
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.beginPath()
  draw()
  ctx.stroke()
}

function polyline(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
}

function pattern(ctx: CanvasRenderingContext2D, p: Pattern, layer: Layer, r: () => number) {
  switch (p) {
    case "web": {
      // rays fanning from a point near the bottom, crossed by concentric arcs
      const O: Pt = [0, 84]
      const n = 12
      const angle = (i: number) => ((-168 + (156 * i) / n) * Math.PI) / 180
      const far = (i: number): Pt => [O[0] + 260 * Math.cos(angle(i)), O[1] + 260 * Math.sin(angle(i))]
      if (layer === "tone") {
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = gray(0.42 + (i % 2) * 0.12 + r() * 0.06)
          ctx.beginPath()
          polyline(ctx, [O, far(i), far(i + 1)])
          ctx.fill()
        }
        return
      }
      ridges(ctx, 1.7, () => {
        for (let i = 0; i <= n; i++) polyline(ctx, [O, far(i)])
      })
      ridges(ctx, 1.5, () => {
        for (let rr = 30; rr < 200; rr += 22) {
          ctx.moveTo(O[0] + rr * Math.cos(angle(0)), O[1] + rr * Math.sin(angle(0)))
          ctx.arc(O[0], O[1], rr, angle(0), angle(n))
        }
      })
      return
    }
    case "pinwheel": {
      // nine discs fanned like a shutter, each a sloped shingle with a raised lip
      const discs = pinwheelDiscs()
      ;[...discs, discs[0]].forEach((d, i) => {
        ctx.save()
        if (i === discs.length) {
          // close the cycle: the first disc lies over the last one, only where they overlap
          const last = discs[discs.length - 1]
          ctx.beginPath()
          ctx.arc(last.x, last.y, last.r, 0, TAU)
          ctx.clip()
        }
        const dir = d.a + Math.PI / 2
        const g = ctx.createLinearGradient(d.x - d.r * Math.cos(dir), d.y - d.r * Math.sin(dir), d.x + d.r * Math.cos(dir), d.y + d.r * Math.sin(dir))
        const t = layer === "height" ? 0.42 : 0.4 + (((i % 9) * 4) % 9) / 32
        g.addColorStop(0, gray(t - (layer === "height" ? 0.2 : 0.06)))
        g.addColorStop(1, gray(t + (layer === "height" ? 0.2 : 0.08)))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, TAU)
        ctx.fill()
        if (layer === "height") ridges(ctx, 1.8, () => ctx.arc(d.x, d.y, d.r - 1.2, 0, TAU))
        ctx.restore()
      })
      return
    }
    case "flower": {
      // the "flower of life": circles round a circle
      if (layer === "tone") return
      ridges(ctx, 1.5, () => {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU
          ctx.moveTo(42 * Math.cos(a) + 42, 42 * Math.sin(a))
          ctx.arc(42 * Math.cos(a), 42 * Math.sin(a), 42, 0, TAU)
        }
        ctx.moveTo(42, 0)
        ctx.arc(0, 0, 42, 0, TAU)
        ctx.moveTo(84, 0)
        ctx.arc(0, 0, 84, 0, TAU)
      })
      return
    }
    case "blades": {
      // curved blades sweeping out of the hole, like a turbine
      const H = VESSEL_HOLE
      const n = 22
      const blade = (k: number) =>
        Array.from({ length: 31 }, (_, i): Pt => {
          const s = i / 30
          const a = (k / n) * TAU + s * 1.15
          const rad = H.r + 2 + s * 150
          return [H.x + rad * Math.cos(a), H.y + rad * Math.sin(a)]
        })
      for (let k = 0; k < n; k++) {
        // each blade slopes a little differently, so neighbours catch the light apart
        ctx.fillStyle = layer === "tone" ? gray(0.4 + (k % 2) * 0.14 + r() * 0.05) : gray(0.3 + (k % 2) * 0.1)
        ctx.beginPath()
        polyline(ctx, [...blade(k), ...blade(k + 1).reverse()])
        ctx.fill()
      }
      if (layer === "height")
        ridges(ctx, 1.6, () => {
          for (let k = 0; k < n; k++) polyline(ctx, blade(k))
        })
      return
    }
    case "dome": {
      // a lattice dome seen from above: eccentric rings and meridians to an off-centre pole
      if (layer === "tone") return
      const ring = (t: number) => ({ cy: -38 + t * 46, r: t * 104 })
      ridges(ctx, 1.4, () => {
        for (let k = 1; k <= 9; k++) {
          const c = ring(k / 9)
          ctx.moveTo(c.r, c.cy)
          ctx.arc(0, c.cy, c.r, 0, TAU)
        }
        for (let m = 0; m < 28; m++) {
          const a = (m / 28) * TAU
          polyline(
            ctx,
            Array.from({ length: 25 }, (_, i): Pt => {
              const c = ring(i / 24)
              return [c.r * Math.cos(a), c.cy + c.r * Math.sin(a)]
            }),
          )
        }
      })
      ctx.fillStyle = gray(0.9)
      ctx.beginPath()
      ctx.arc(0, -38, 5, 0, TAU)
      ctx.fill()
      return
    }
  }
}

// ---------------------------------------------------------------------------
// The reverse: a maker's mark and a few engraved words

function drawBack(ctx: CanvasRenderingContext2D, topic: Topic, stats: FaceStats | undefined) {
  // lathe rings: faint concentric texture
  ctx.strokeStyle = gray(0.4)
  ctx.lineWidth = 0.35
  for (let rr = 6; rr < 100; rr += 2.6) {
    ctx.beginPath()
    ctx.arc(0, 0, rr, 0, TAU)
    ctx.stroke()
  }
  // the reverse of a vessel has its hole on the left: keep the words below it, where
  // the triangle is still wide enough, and scale them down to fit
  const vessel = topic.shape === "vessel"
  const sc = vessel ? 0.78 : 1
  const [x, y] = vessel ? [0, 34] : [0, 10]
  ctx.fillStyle = gray(0.85)
  ctx.save()
  ctx.translate(vessel ? 26 : -11.5, vessel ? -38 : -40)
  ctx.fill(wceMark())
  ctx.restore()

  ctx.fillStyle = gray(0.06)
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `500 ${9 * sc}px ${serif()}`
  ctx.letterSpacing = `${3 * sc}px`
  ctx.fillText(topic.name.toUpperCase(), x, y - 14 * sc)
  if (stats) {
    ctx.letterSpacing = "0px"
    ctx.font = `500 ${(stats.primary.length > 5 ? 14 : 19) * sc}px ${serif()}`
    ctx.fillText(stats.primary, x, y + 5 * sc)
    if (stats.lines[0]) {
      ctx.font = `500 ${6.5 * sc}px ${serif()}`
      ctx.letterSpacing = `${1.5 * sc}px`
      ctx.fillText(stats.lines[0].toUpperCase(), x, y + 21 * sc)
    }
  }
  ctx.letterSpacing = "0px"
}

// ---------------------------------------------------------------------------
// The face

/**
 * Colour, normal and data (G = roughness, B = metalness) maps for one face.
 * `tarnish` is 0 (polished) .. 1 (heavily aged).
 */
export function faceMaps(topic: Topic, side: "front" | "back", tarnish: number, locked: boolean, stats: FaceStats | undefined, px: number) {
  const mirror = side === "back"
  const metal = METALS[locked ? "lead" : topic.metal]
  const seed = [...topic.id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7) + (mirror ? 101 : 0)
  const r = rng(seed)
  const shape = shapePath(topic.shape, mirror)
  const hole = holeOf(topic.shape, mirror)
  const k = px / 200
  const scallop = topic.shape === "scallop"

  // Height
  const H = canvas(px)
  H.ctx.fillStyle = gray(0.35)
  H.ctx.fillRect(-100, -100, 200, 200)
  H.ctx.save()
  H.ctx.clip(shape)
  if (side === "front") pattern(H.ctx, topic.pattern, "height", r)
  else drawBack(H.ctx, topic, stats)
  // raised lip round the edge (and round the hole)
  H.ctx.strokeStyle = gray(0.78)
  H.ctx.lineWidth = scallop ? 4 : 11
  H.ctx.stroke(shape)
  H.ctx.strokeStyle = gray(1)
  H.ctx.lineWidth = 1.4
  if (!scallop) H.ctx.stroke(shapePath(topic.shape, mirror, 0.945))
  if (hole) {
    H.ctx.lineWidth = 7
    H.ctx.strokeStyle = gray(0.78)
    H.ctx.beginPath()
    H.ctx.arc(hole.x, hole.y, hole.r + 3, 0, TAU)
    H.ctx.stroke()
  }
  H.ctx.restore()

  // soften the relief into rounded bevels; a wide blur finds the crevices
  const blurred = (amount: number) => {
    const b = canvas(px)
    b.ctx.setTransform(1, 0, 0, 1, 0, 0)
    b.ctx.filter = `blur(${amount * k}px)`
    b.ctx.drawImage(H.c, 0, 0)
    return b.ctx.getImageData(0, 0, px, px).data
  }
  const h = blurred(0.45)
  const hw = blurred(3)

  // Tone: regions of the pattern shaded differently
  const T = canvas(px)
  T.ctx.fillStyle = gray(0.5)
  T.ctx.fillRect(-100, -100, 200, 200)
  if (side === "front") pattern(T.ctx, topic.pattern, "tone", rng(seed + 3))
  const tone = T.ctx.getImageData(0, 0, px, px).data

  // Scratches: fine hairlines in the polish
  const S = canvas(px)
  S.ctx.strokeStyle = "rgba(255,255,255,0.5)"
  S.ctx.lineWidth = 0.25
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * 190
    const y = (r() - 0.5) * 190
    const a = r() * TAU
    const l = 6 + r() * 30
    S.ctx.beginPath()
    S.ctx.moveTo(x, y)
    S.ctx.quadraticCurveTo(x + l * 0.5 * Math.cos(a + 0.3), y + l * 0.5 * Math.sin(a + 0.3), x + l * Math.cos(a), y + l * Math.sin(a))
    S.ctx.stroke()
  }
  const scratch = S.ctx.getImageData(0, 0, px, px).data

  const blotch = noise(px, seed + 11, 4, 4)
  const grain = noise(px, seed + 23, 40, 3)

  const out = canvas(px)
  const ci = out.ctx.createImageData(px, px)
  const ni = out.ctx.createImageData(px, px)
  const di = out.ctx.createImageData(px, px)
  const strength = 3.2 * (px / 512)
  const idx = (x: number, y: number) => (Math.min(px - 1, Math.max(0, y)) * px + Math.min(px - 1, Math.max(0, x))) * 4

  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const i = (y * px + x) * 4
      const hh = h[i] / 255
      const n1 = blotch[i] / 255
      // relief, plus a faint hammered dimpling from the grain
      const nx = (-(h[idx(x + 1, y)] - h[idx(x - 1, y)]) * strength - (grain[idx(x + 1, y)] - grain[idx(x - 1, y)]) * 0.04) / 255
      const ny = (-(h[idx(x, y - 1)] - h[idx(x, y + 1)]) * strength - (grain[idx(x, y - 1)] - grain[idx(x, y + 1)]) * 0.04) / 255
      const inv = 1 / Math.hypot(nx, ny, 1)
      ni.data[i] = (nx * inv * 0.5 + 0.5) * 255
      ni.data[i + 1] = (ny * inv * 0.5 + 0.5) * 255
      ni.data[i + 2] = (inv * 0.5 + 0.5) * 255
      ni.data[i + 3] = 255

      // crevice grime: lower than its surroundings means dirt collects there
      const ao = Math.max(0, Math.min(1, (hw[i] / 255 - hh) * 5))
      // patina: blotchy, worse in crevices, worn away on the high points
      const patina = 0.65 * Math.max(0, Math.min(1, ((n1 - 0.5) * 2.4 + ao * 0.7 - (hh - 0.5) * 1.2) * tarnish))
      const shade = (0.86 + 0.26 * n1) * (0.78 + 0.44 * (tone[i] / 255)) * (1 + (hh - 0.4) * 0.35) * (1 - ao * 0.55)
      const sc = scratch[i + 3] / 255
      for (let c = 0; c < 3; c++) {
        const base = metal.base[c] * shade
        ci.data[i + c] = Math.min(255, base + (metal.tarnish[c] - base) * patina * 0.85 + sc * 18)
      }
      ci.data[i + 3] = 255

      const rough = 0.3 + 0.1 * (grain[i] / 255) + 0.3 * patina + 0.18 * ao - Math.max(0, hh - 0.7) * 0.25 + sc * 0.2
      di.data[i + 1] = Math.max(0, Math.min(1, rough)) * 255
      di.data[i + 2] = (1 - 0.35 * patina) * 255
      di.data[i + 3] = 255
    }
  }
  const toCanvas = (img: ImageData) => {
    const c = document.createElement("canvas")
    c.width = c.height = px
    c.getContext("2d")!.putImageData(img, 0, 0)
    return c
  }
  return { color: toCanvas(ci), normal: toCanvas(ni), data: toCanvas(di) }
}
