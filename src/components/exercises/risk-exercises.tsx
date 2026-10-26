"use client"

import { useEffect, useMemo, useState } from "react"
import { Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { rng } from "@/lib/market"
import { cn } from "@/lib/utils"
import { ChartFrame, Stat, fmtUsd, sliderValue, type ExerciseProps } from "./shared"

function parseNum(s: string) {
  const n = parseFloat(s.replace(",", ".").replace(/[^0-9.\-]/g, ""))
  return Number.isFinite(n) ? n : null
}

// ---------------------------------------------------------------------------
// Position sizing lab

const ACCOUNT = 10_000
const PIP_VALUE = 10 // USD per pip per standard lot (EUR/USD)

export function PositionSizer({ phase, onReady }: ExerciseProps) {
  const [risk, setRisk] = useState(1)
  const [pips, setPips] = useState(25)
  const [answer, setAnswer] = useState("")
  const review = phase === "review"
  const dollars = (ACCOUNT * risk) / 100
  const lots = dollars / (pips * PIP_VALUE)

  // Equity after a streak of 10 losses at this risk %.
  const streak = Array.from({ length: 11 }, (_, i) => ACCOUNT * Math.pow(1 - risk / 100, i))

  useEffect(() => {
    const n = parseNum(answer)
    if (n === null) return onReady(null)
    onReady(() =>
      Math.abs(n - 2) < 0.01
        ? { correct: true, detail: "0.5 lots × 40 pips × $10 = $200, which is 2% of $10,000." }
        : {
            correct: false,
            detail: "Set the stop to 40 pips, then raise risk until the size reaches 0.5 lots. Or: 0.5 × 40 × $10 = $200 = 2%.",
          },
    )
  }, [answer, onReady])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Account" value={fmtUsd(ACCOUNT)} />
        <Stat label="At risk" value={fmtUsd(dollars)} tone="down" />
        <Stat label="Position" value={`${lots.toFixed(2)} lots`} />
      </div>
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Risk per trade</span>
            <span className="tabular-nums text-muted-foreground">{risk.toFixed(2)}%</span>
          </div>
          <Slider min={0.25} max={10} step={0.25} value={[risk]} onValueChange={(v) => setRisk(sliderValue(v))} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Stop distance</span>
            <span className="tabular-nums text-muted-foreground">{pips} pips</span>
          </div>
          <Slider min={10} max={100} step={5} value={[pips]} onValueChange={(v) => setPips(sliderValue(v))} />
        </div>
      </div>
      <ChartFrame>
        <div className="mb-2 flex items-baseline justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            10 losses in a row
          </span>
          <span className={cn("text-sm font-semibold tabular-nums", risk > 3 ? "text-down" : "text-foreground")}>
            {fmtUsd(streak[10])} left
          </span>
        </div>
        <div className="flex h-24 items-end gap-1">
          {streak.map((v, i) => (
            <div
              key={i}
              className={cn("flex-1 rounded-t transition-all", i === 0 ? "bg-brand" : "bg-down/70")}
              style={{ height: `${(v / ACCOUNT) * 100}%` }}
            />
          ))}
        </div>
      </ChartFrame>
      <div className="space-y-2 rounded-lg border-2 border-dashed p-4">
        <Label htmlFor="ps">Your stop is 40 pips and your broker caps you at 0.5 lots. What&apos;s the max risk %?</Label>
        <div className="flex items-center gap-2">
          <Input
            id="ps"
            inputMode="decimal"
            placeholder="e.g. 1.5"
            value={answer}
            disabled={review}
            onChange={(e) => setAnswer(e.target.value)}
            className="max-w-32 text-lg"
          />
          <span className="text-muted-foreground">%</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Expectancy simulator

const PATHS = 24
const TRADES = 100

export function ExpectancyLab({ phase, onReady }: ExerciseProps) {
  const [win, setWin] = useState(55)
  const [rr, setRr] = useState(1)
  const [seed, setSeed] = useState(1)
  const [moved, setMoved] = useState(false)
  const review = phase === "review"
  const w = win / 100
  // Rounded to the 2 decimals shown: 30% at 1:3 is 0.19999999999999996 in floating point, not +0.20R.
  const e = Math.round((w * rr - (1 - w)) * 100) / 100

  const paths = useMemo(() => {
    const r = rng(seed * 7919)
    return Array.from({ length: PATHS }, () => {
      let eq = 100
      const pts = [eq]
      for (let t = 0; t < TRADES; t++) {
        eq *= r() < w ? 1 + 0.01 * rr : 0.99
        pts.push(eq)
      }
      return pts
    })
  }, [seed, w, rr])

  const finals = paths.map((p) => p[p.length - 1]).sort((a, b) => a - b)
  const median = finals[Math.floor(finals.length / 2)]
  const profitable = finals.filter((f) => f > 100).length

  useEffect(() => {
    if (!moved) return onReady(null)
    onReady(() =>
      win < 40 && e >= 0.2
        ? {
            correct: true,
            detail: `${win}% winners at 1:${rr} gives +${e.toFixed(2)}R per trade. You can be wrong most of the time and still make money.`,
          }
        : win >= 40
          ? { correct: false, detail: "Bring the win rate below 40%, then find the R:R that still makes the edge positive." }
          : { correct: false, detail: `Expectancy is ${e.toFixed(2)}R. With so few winners, each win needs to pay more.` },
    )
  }, [win, rr, e, moved, onReady])

  const W = 640
  const H = 240
  const lo = Math.min(60, ...finals, ...paths.flat())
  const hi = Math.max(140, ...paths.flat())
  const x = (i: number) => 8 + (i / TRADES) * (W - 56)
  const y = (v: number) => 8 + ((hi - v) / (hi - lo)) * (H - 16)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Expectancy" value={`${e >= 0 ? "+" : ""}${e.toFixed(2)}R`} tone={e > 0 ? "up" : "down"} />
        <Stat label="Median end" value={`${(median - 100).toFixed(0)}%`} tone={median > 100 ? "up" : "down"} />
        <Stat label="Paths in profit" value={`${profitable}/${PATHS}`} />
      </div>
      <ChartFrame>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <line x1={8} x2={W - 48} y1={y(100)} y2={y(100)} stroke="var(--muted-foreground)" strokeDasharray="3 4" />
          <text x={W - 44} y={y(100) + 4} className="fill-muted-foreground text-[11px]">
            start
          </text>
          {paths.map((p, k) => (
            <polyline
              key={k}
              points={p.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke={p[p.length - 1] >= 100 ? "var(--up)" : "var(--down)"}
              strokeOpacity={0.45}
              strokeWidth={1.4}
            />
          ))}
        </svg>
        <div className="flex items-center justify-between px-1 pt-1 text-xs text-muted-foreground">
          <span>{PATHS} traders × {TRADES} trades, risking 1% each</span>
          <Button variant="ghost" size="sm" onClick={() => setSeed((s) => s + 1)}>
            <Shuffle /> Rerun
          </Button>
        </div>
      </ChartFrame>
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Win rate</span>
            <span className="tabular-nums text-muted-foreground">{win}%</span>
          </div>
          <Slider
            min={10}
            max={90}
            step={5}
            value={[win]}
            disabled={review}
            onValueChange={(v) => {
              setMoved(true)
              setWin(sliderValue(v))
            }}
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Reward : Risk</span>
            <span className="tabular-nums text-muted-foreground">1 : {rr.toFixed(2)}</span>
          </div>
          <Slider
            min={0.5}
            max={5}
            step={0.25}
            value={[rr]}
            disabled={review}
            onValueChange={(v) => {
              setMoved(true)
              setRr(sliderValue(v))
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Read the trade journal

const LOG = [
  { pair: "EUR/USD", side: "Long", r: 2 },
  { pair: "GBP/USD", side: "Short", r: -1 },
  { pair: "EUR/USD", side: "Long", r: -1 },
  { pair: "USD/JPY", side: "Long", r: 3 },
  { pair: "GBP/USD", side: "Long", r: -1 },
  { pair: "EUR/USD", side: "Short", r: 2 },
  { pair: "AUD/USD", side: "Long", r: -1 },
  { pair: "USD/JPY", side: "Short", r: -1 },
  { pair: "EUR/USD", side: "Long", r: 2.5 },
  { pair: "GBP/USD", side: "Short", r: -1 },
]

export function TradeJournal({ phase, onReady }: ExerciseProps) {
  const [answer, setAnswer] = useState("")
  const [hover, setHover] = useState<number | null>(null)
  const review = phase === "review"
  const total = LOG.reduce((s, t) => s + t.r, 0)
  const expectancy = total / LOG.length

  useEffect(() => {
    const n = parseNum(answer)
    if (n === null) return onReady(null)
    onReady(() =>
      Math.abs(n - expectancy) < 0.011
        ? {
            correct: true,
            detail: `Total +${total}R over ${LOG.length} trades = +${expectancy}R per trade, with only a 40% win rate.`,
          }
        : { correct: false, detail: `Add up all the R results (+${total}R), then divide by the number of trades (${LOG.length}).` },
    )
  }, [answer, expectancy, total, onReady])

  const cumulative = LOG.map((_, i) => LOG.slice(0, i + 1).reduce((s, t) => s + t.r, 0))
  const maxAbs = 3
  const W = 640
  const H = 160
  const bw = (W - 20) / LOG.length
  const mid = H * 0.62
  const by = (r: number) => mid - (r / maxAbs) * (H * 0.55)
  const cy = (v: number) => mid - (v / 6) * (H * 0.55)

  // Two columns on desktop: the chart and the question left, the trade log right.
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-4">
        <ChartFrame>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
            <line x1={10} x2={W - 10} y1={mid} y2={mid} stroke="var(--border)" />
            {LOG.map((t, i) => (
              <rect
                key={i}
                x={10 + i * bw + bw * 0.2}
                width={bw * 0.6}
                y={Math.min(by(t.r), mid)}
                height={Math.abs(by(t.r) - mid)}
                rx={3}
                fill={t.r > 0 ? "var(--up)" : "var(--down)"}
                opacity={hover === null || hover === i ? 1 : 0.35}
                onMouseEnter={() => setHover(i)}
              />
            ))}
            {review && (
              <polyline
                points={cumulative.map((v, i) => `${10 + i * bw + bw / 2},${cy(v)}`).join(" ")}
                fill="none"
                stroke="var(--brand)"
                strokeWidth={2.5}
              />
            )}
          </svg>
        </ChartFrame>
        <div className="space-y-2 rounded-lg border-2 border-dashed p-4">
          <Label htmlFor="exp">What is this trader&apos;s expectancy (average R per trade)?</Label>
          <div className="flex items-center gap-2">
            <Input
              id="exp"
              inputMode="decimal"
              placeholder="e.g. 0.5"
              value={answer}
              disabled={review}
              onChange={(e) => setAnswer(e.target.value)}
              className="max-w-32 text-lg"
            />
            <span className="text-muted-foreground">R</span>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Pair</th>
              <th className="px-3 py-2 text-left font-medium">Side</th>
              <th className="px-3 py-2 text-right font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {LOG.map((t, i) => (
              <tr
                key={i}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className={cn("border-t transition-colors", hover === i && "bg-muted/60")}
              >
                <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-1.5">{t.pair}</td>
                <td className="px-3 py-1.5">{t.side}</td>
                <td className={cn("px-3 py-1.5 text-right font-medium tabular-nums", t.r > 0 ? "text-up" : "text-down")}>
                  {t.r > 0 ? "+" : ""}
                  {t.r}R
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Order book sandbox

const ASKS = [
  { price: 64_000, size: 0.5 },
  { price: 64_010, size: 0.8 },
  { price: 64_025, size: 1.2 },
  { price: 64_050, size: 2 },
  { price: 64_100, size: 3 },
]
const BIDS = [
  { price: 63_990, size: 0.7 },
  { price: 63_975, size: 1.1 },
  { price: 63_950, size: 2.4 },
]

export function fillMarketBuy(size: number) {
  let left = size
  let cost = 0
  const used = ASKS.map((lvl) => {
    const take = Math.min(lvl.size, Math.max(0, left))
    left -= take
    cost += take * lvl.price
    return take
  })
  const filled = size - Math.max(0, left)
  const avg = filled > 0 ? cost / filled : ASKS[0].price
  return { used, avg, slippage: ((avg - ASKS[0].price) / ASKS[0].price) * 100 }
}

export function OrderBook({ phase, onReady }: ExerciseProps) {
  const [size, setSize] = useState(0.5)
  const [moved, setMoved] = useState(false)
  const review = phase === "review"
  const { used, avg, slippage } = fillMarketBuy(size)
  const maxSize = Math.max(...ASKS.map((a) => a.size), ...BIDS.map((b) => b.size))
  const limit = 0.03

  useEffect(() => {
    if (!moved) return onReady(null)
    onReady(() => {
      const ok = slippage < limit
      const nextOk = fillMarketBuy(+(size + 0.1).toFixed(1)).slippage < limit
      return ok && !nextOk
        ? { correct: true, detail: `${size} BTC is the most you can buy before the average fill drifts more than 0.03% above the best ask.` }
        : ok
          ? { correct: false, detail: `${size} BTC is within the limit, but you can buy more. Push the size up.` }
          : { correct: false, detail: `At ${size} BTC you're eating into expensive levels: slippage is ${slippage.toFixed(3)}%.` }
    })
  }, [size, slippage, moved, onReady])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Order" value={`${size.toFixed(1)} BTC`} />
        <Stat label="Avg fill" value={fmtUsd(avg, 2)} />
        {/* 4 decimals: the answer (2.8 BTC, 0.02958%) would round to "0.030%" and look like it misses the limit. */}
        <Stat label="Slippage" value={`${slippage.toFixed(4)}%`} tone={slippage < limit ? "up" : "down"} />
      </div>
      <div className="overflow-hidden rounded-lg border bg-card font-mono text-sm">
        <div className="grid grid-cols-3 bg-muted/60 px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>Price</span>
          <span className="text-right">Size</span>
          <span className="text-right">You take</span>
        </div>
        {[...ASKS].reverse().map((a) => {
          const idx = ASKS.indexOf(a)
          const take = used[idx]
          return (
            <div key={a.price} className="relative grid grid-cols-3 px-3 py-1.5">
              <div className="absolute inset-y-0 right-0 bg-down/10" style={{ width: `${(a.size / maxSize) * 100}%` }} />
              <div
                className="absolute inset-y-0 right-0 bg-down/35 transition-all"
                style={{ width: `${(take / maxSize) * 100}%` }}
              />
              <span className="relative text-down">{a.price.toLocaleString()}</span>
              <span className="relative text-right">{a.size.toFixed(1)}</span>
              <span className={cn("relative text-right", take > 0 ? "font-semibold" : "text-muted-foreground")}>
                {take > 0 ? take.toFixed(1) : "–"}
              </span>
            </div>
          )
        })}
        <div className="border-y bg-muted/40 px-3 py-1 text-center text-[11px] text-muted-foreground">spread 10</div>
        {BIDS.map((b) => (
          <div key={b.price} className="relative grid grid-cols-3 px-3 py-1.5 opacity-70">
            <div className="absolute inset-y-0 right-0 bg-up/10" style={{ width: `${(b.size / maxSize) * 100}%` }} />
            <span className="relative text-up">{b.price.toLocaleString()}</span>
            <span className="relative text-right">{b.size.toFixed(1)}</span>
            <span className="relative text-right text-muted-foreground">–</span>
          </div>
        ))}
      </div>
      <div className="space-y-2 rounded-lg border bg-card p-4">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Market buy size</span>
          <span className="tabular-nums text-muted-foreground">{size.toFixed(1)} BTC</span>
        </div>
        <Slider
          min={0.1}
          max={6}
          step={0.1}
          value={[size]}
          disabled={review}
          onValueChange={(v) => {
            setMoved(true)
            setSize(+sliderValue(v).toFixed(1))
          }}
        />
      </div>
    </div>
  )
}
