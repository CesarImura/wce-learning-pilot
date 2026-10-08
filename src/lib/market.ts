// Synthetic market data. Every scenario is seeded so a lesson always shows
// the same chart, and patterns are "planted" so we know the right answer.

export type Candle = { o: number; h: number; l: number; c: number }

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function gauss(r: () => number) {
  const u = Math.max(r(), 1e-9)
  const v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

type AnchorOpts = {
  seed: number
  noise?: number
  wick?: number
  floor?: number
  ceil?: number
}

/** Builds candles whose closes follow piecewise-linear anchor points plus noise. */
export function fromAnchors(anchors: [number, number][], opts: AnchorOpts): Candle[] {
  const { seed, noise = 0.6, wick = 0.5, floor, ceil } = opts
  const r = rng(seed)
  const n = anchors[anchors.length - 1][0] + 1
  const out: Candle[] = []
  let prev = anchors[0][1]
  for (let i = 0; i < n; i++) {
    let k = 0
    while (k < anchors.length - 2 && anchors[k + 1][0] < i) k++
    const [i0, p0] = anchors[k]
    const [i1, p1] = anchors[k + 1]
    const t = i1 === i0 ? 0 : (i - i0) / (i1 - i0)
    const target = p0 + (p1 - p0) * Math.min(1, Math.max(0, t))
    const o = prev
    let c = target + gauss(r) * noise
    let h = Math.max(o, c) + Math.abs(gauss(r)) * wick
    let l = Math.min(o, c) - Math.abs(gauss(r)) * wick
    if (floor !== undefined) {
      l = Math.max(l, floor - r() * 0.15)
      c = Math.max(c, floor + 0.1)
    }
    if (ceil !== undefined) {
      h = Math.min(h, ceil + r() * 0.15)
      c = Math.min(c, ceil - 0.1)
    }
    h = Math.max(h, o, c)
    l = Math.min(l, o, c)
    out.push({ o, h, l, c })
    prev = c
  }
  return out
}

export function isBullishEngulfing(prev: Candle, cur: Candle) {
  return prev.c < prev.o && cur.c > cur.o && cur.o <= prev.c && cur.c >= prev.o
}

export function sma(candles: Candle[], period: number) {
  return candles.map((_, i) => {
    if (i < period - 1) return null
    let s = 0
    for (let k = i - period + 1; k <= i; k++) s += candles[k].c
    return s / period
  })
}

// ---------------------------------------------------------------------------
// Scenarios used by the mock lessons

/** Downtrend into a textbook bullish engulfing at index 30. */
export function engulfingScenario() {
  const target = 30
  const cs = fromAnchors(
    [
      [0, 121],
      [12, 114],
      [18, 116],
      [29, 104],
    ],
    { seed: 7, noise: 0.7, wick: 0.6 },
  )
  // Remove accidental engulfings so the answer is unambiguous.
  for (let i = 1; i < cs.length; i++) {
    if (isBullishEngulfing(cs[i - 1], cs[i])) {
      const p = cs[i - 1]
      cs[i].c = cs[i].o + (p.o - cs[i].o) * 0.5
      cs[i].h = Math.max(cs[i].h, cs[i].c)
    }
  }
  const last = cs[cs.length - 1]
  // Small red candle, then a big green one that swallows it.
  const red: Candle = { o: last.c, h: last.c + 0.3, l: last.c - 1.6, c: last.c - 1.3 }
  const green: Candle = { o: red.c - 0.2, h: last.c + 2.3, l: red.c - 0.7, c: last.c + 1.9 }
  cs.push(red, green)
  const rest = fromAnchors(
    [
      [0, green.c],
      [10, green.c + 5],
    ],
    { seed: 9, noise: 0.6, wick: 0.5 },
  ).slice(1)
  rest[0].o = green.c
  cs.push(...rest)
  return { candles: cs, target: target + 1 }
}

/** Range with three clean touches of support at 100. */
export function supportScenario() {
  return {
    candles: fromAnchors(
      [
        [0, 106],
        [6, 100.4],
        [12, 107],
        [19, 100.3],
        [26, 108],
        [33, 100.5],
        [40, 106.5],
        [46, 104],
      ],
      { seed: 21, noise: 0.5, wick: 0.5, floor: 100 },
    ),
    support: 100,
  }
}

/** Range 100–108, then price wicks above 108 and closes back inside (fakeout). */
export function fakeoutScenario() {
  const base = fromAnchors(
    [
      [0, 103],
      [7, 107.5],
      [14, 101],
      [21, 107.6],
      [28, 101.5],
      [36, 106.8],
    ],
    { seed: 33, noise: 0.45, wick: 0.4, floor: 100, ceil: 108 },
  )
  const last = base[base.length - 1]
  base.push({ o: last.c, h: 110.4, l: last.c - 0.3, c: 107.2 })
  const visible = base.length
  const after = fromAnchors(
    [
      [0, 107.2],
      [4, 105],
      [14, 100.6],
    ],
    { seed: 34, noise: 0.5, wick: 0.4 },
  ).slice(1)
  return { candles: [...base, ...after], visible, resistance: 108 }
}

/** Range 100–108, decisive close above, a retest, then continuation. */
export function breakoutScenario() {
  const base = fromAnchors(
    [
      [0, 102],
      [8, 107.4],
      [16, 100.8],
      [24, 107.6],
      [32, 101.4],
      [40, 107],
    ],
    { seed: 41, noise: 0.45, wick: 0.4, floor: 100, ceil: 108 },
  )
  const last = base[base.length - 1]
  base.push({ o: last.c, h: 110.2, l: last.c - 0.2, c: 109.8 })
  const visible = base.length
  const after = fromAnchors(
    [
      [0, 109.8],
      [5, 108.6],
      [9, 110.5],
      [24, 117.5],
    ],
    { seed: 42, noise: 0.45, wick: 0.4, floor: 108.3 },
  ).slice(1)
  return { candles: [...base, ...after], visible, resistance: 108 }
}

export function trendingSeries(seed: number, up: boolean) {
  const s = up ? 1 : -1
  return fromAnchors(
    [
      [0, 100],
      [8, 100 + s * 5],
      [12, 100 + s * 3],
      [22, 100 + s * 10],
      [26, 100 + s * 8],
      [36, 100 + s * 15],
    ],
    { seed, noise: 0.6, wick: 0.5 },
  )
}

export function rangingSeries(seed: number) {
  return fromAnchors(
    [
      [0, 100],
      [6, 104],
      [12, 99],
      [18, 104.5],
      [24, 99.5],
      [30, 104],
      [36, 101],
    ],
    { seed, noise: 0.6, wick: 0.5 },
  )
}

/** Noisy uptrend: short MAs whipsaw, long MAs stay clean. */
export function choppyTrend() {
  return fromAnchors(
    [
      [0, 100],
      [10, 103],
      [16, 101],
      [28, 107],
      [34, 105],
      [48, 111],
      [54, 109],
      [70, 116],
    ],
    { seed: 55, noise: 1.1, wick: 0.6 },
  )
}

/** One hour of tick prices that form a single candle. */
export function hourTicks() {
  const r = rng(77)
  const pts: number[] = []
  const anchors: [number, number][] = [
    [0, 100],
    [10, 98.2],
    [22, 103.6],
    [34, 101.4],
    [47, 102.4],
  ]
  for (let i = 0; i <= 47; i++) {
    let k = 0
    while (k < anchors.length - 2 && anchors[k + 1][0] < i) k++
    const [i0, p0] = anchors[k]
    const [i1, p1] = anchors[k + 1]
    const t = (i - i0) / (i1 - i0)
    const isAnchor = anchors.some(([ai]) => ai === i)
    pts.push(isAnchor ? p0 + (p1 - p0) * t : p0 + (p1 - p0) * t + gauss(r) * 0.25)
  }
  const o = pts[0]
  const c = pts[pts.length - 1]
  return { ticks: pts, ohlc: { o, h: Math.max(...pts), l: Math.min(...pts), c } }
}
