"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight, Check, Hand, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { CandleChart, DragLine, domainOf } from "@/components/chart/candle-chart"
import {
  breakoutScenario,
  choppyTrend,
  engulfingScenario,
  fakeoutScenario,
  rangingSeries,
  sma,
  supportScenario,
  trendingSeries,
  type Candle,
} from "@/lib/market"
import { cn } from "@/lib/utils"
import { ChartFrame, Stat, sliderValue, useAutoAnswer, useReveal, type ExerciseProps } from "./shared"

// ---------------------------------------------------------------------------
// Tap the chart

export function TapEngulfing({ phase, onReady, autoAnswer }: ExerciseProps) {
  const { candles, target } = useMemo(() => engulfingScenario(), [])
  const [picked, setPicked] = useState<number | null>(null)
  useAutoAnswer(autoAnswer, (v) => setPicked(v === "correct" ? target : target - 4))
  const review = phase === "review"
  const visible = target + 5

  useEffect(() => {
    if (picked === null) return onReady(null)
    const visual = <EngulfingWhy candles={candles} target={target} />
    onReady(() =>
      picked === target
        ? {
            correct: true,
            detail: "The green body completely swallows the previous red body, right at the end of a downtrend.",
            visual,
          }
        : Math.abs(picked - target) === 1
          ? { correct: false, detail: "So close! The engulfing candle is the big green one that wraps the small red one.", visual }
          : {
              correct: false,
              detail: "Look for a small red candle followed by a green candle whose body covers it completely.",
              visual,
            },
    )
  }, [picked, target, candles, onReady])

  const highlight: Record<number, "correct" | "wrong" | "selected"> = {}
  if (picked !== null) highlight[picked] = review ? (picked === target ? "correct" : "wrong") : "selected"
  if (review) highlight[target] = "correct"

  return (
    <div className="space-y-3">
      <ChartFrame>
        <CandleChart
          candles={candles.slice(0, visible)}
          highlight={highlight}
          onCandleClick={review ? undefined : setPicked}
        />
      </ChartFrame>
      <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
        <Hand className="size-4" /> Tap a candle, or slide across the chart and let go on one.
      </p>
    </div>
  )
}

/**
 * "Why?" figure for the engulfing, drawn as a zoom: the downtrend on the left with the last two
 * candles boxed, and those two blown up on the right, the red body's range carried across so you
 * see the green body cover it. Numbers tie the figure to the three-step legend.
 */
function EngulfingWhy({ candles, target }: { candles: Candle[]; target: number }) {
  const lead = candles.slice(target - 9, target + 1)
  const red = candles[target - 1]
  const green = candles[target]
  const H = 200
  const scale = (cs: Candle[], top: number, bottom: number) => {
    const hi = Math.max(...cs.map((c) => c.h))
    const lo = Math.min(...cs.map((c) => c.l))
    return (v: number) => top + ((hi - v) / (hi - lo)) * (bottom - top)
  }
  const ly = scale(lead, 44, H - 16)
  const zy = scale([red, green], 36, H - 20)
  const lx = (i: number) => 16 + i * 22
  const redX = 345
  const greenX = 395
  const candle = (c: Candle, x: number, w: number, y: (v: number) => number, className: string) => (
    <g key={x} className={className}>
      <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} strokeWidth={1.5} className="stroke-current" />
      <rect x={x - w / 2} y={y(Math.max(c.o, c.c))} width={w} height={Math.max(2, Math.abs(y(c.o) - y(c.c)))} rx={1.5} className="fill-current" />
    </g>
  )
  const marker = (n: number, x: number, y: number, on = false) => (
    <g>
      <circle cx={x} cy={y} r={10} className={on ? "fill-up" : "fill-[#2e2e2e]"} />
      <text x={x} y={y + 4.5} textAnchor="middle" className={cn("text-[12px] font-semibold", on ? "fill-black" : "fill-white")}>
        {n}
      </text>
    </g>
  )
  // The boxed pair on the left, and the zoom panel it opens into.
  const box = { x: lx(8) - 9, y: Math.min(ly(red.h), ly(green.h)) - 6, w: lx(9) - lx(8) + 18 }
  box.w = Math.max(box.w, 18)
  const boxBottom = Math.max(ly(red.l), ly(green.l)) + 6
  const zoom = { x: 290, y: 8, w: 226, h: H - 16 }
  const steps = ["Price is falling", "Small red candle", "Green body covers it"]
  return (
    <figure className="flex flex-col gap-4 rounded-[8px] border border-white/10 bg-[#0c0c0c] p-4">
      <svg viewBox={`0 0 520 ${H}`} className="w-full" role="img" aria-label="A downtrend ending in a small red candle and a green candle whose body covers the red body">
        {lead.map((c, i) => candle(c, lx(i), 10, ly, cn(c.c >= c.o ? "text-up" : "text-down", i < 8 ? "opacity-40" : "opacity-90")))}
        {marker(1, lx(0) + 4, ly(lead[0].h) - 24)}

        {/* Lines from the boxed pair to the zoom panel. */}
        <path
          d={`M${box.x + box.w} ${box.y} L${zoom.x} ${zoom.y} M${box.x + box.w} ${boxBottom} L${zoom.x} ${zoom.y + zoom.h}`}
          strokeDasharray="3 4"
          className="stroke-white/20"
        />
        <rect x={box.x} y={box.y} width={box.w} height={boxBottom - box.y} rx={3} fill="none" className="stroke-white/50" />
        <rect x={zoom.x} y={zoom.y} width={zoom.w} height={zoom.h} rx={8} className="fill-white/[0.03] stroke-white/15" />

        {/* The red body's range, carried across the green candle. */}
        <rect
          x={redX - 22}
          y={zy(red.o)}
          width={greenX - redX + 38}
          height={zy(red.c) - zy(red.o)}
          strokeDasharray="3 3"
          className="fill-down/10 stroke-down/60"
        />
        {candle(red, redX, 22, zy, "text-down")}
        {candle(green, greenX, 22, zy, "text-up")}
        <path d={`M${greenX + 19} ${zy(green.c)} h5 V${zy(green.o)} h-5`} fill="none" strokeWidth={1.5} className="stroke-up" />
        <text x={greenX + 32} y={zy(green.c) + 12} className="fill-white text-[13px]">
          Green
        </text>
        <text x={greenX + 32} y={zy(green.c) + 28} className="fill-white text-[13px]">
          body
        </text>
        <text x={greenX + 32} y={(zy(red.o) + zy(red.c)) / 2 + 4.5} className="fill-white/60 text-[13px]">
          Red body
        </text>
        {marker(2, redX, zy(red.h) - 22)}
        {marker(3, greenX, zy(green.h) - 18, true)}
      </svg>
      <ol className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-4">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-2 text-[14px] leading-5 text-white/80">
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full text-[12px] font-semibold tabular-nums",
                i === 2 ? "bg-up text-black" : "bg-[#2e2e2e] text-white",
              )}
            >
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </figure>
  )
}

// ---------------------------------------------------------------------------
// Draw support

export function DrawSupport({ phase, onReady }: ExerciseProps) {
  const { candles, support } = useMemo(() => supportScenario(), [])
  const [level, setLevel] = useState(104.5)
  const [moved, setMoved] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const review = phase === "review"
  const tol = 0.7

  useEffect(() => {
    if (!moved) return onReady(null)
    onReady(() =>
      Math.abs(level - support) <= tol
        ? { correct: true, detail: "Price bounced off ~100 three times. Each touch makes the level more significant." }
        : { correct: false, detail: "Support is the floor price keeps bouncing from. Look for the lows that line up." },
    )
  }, [level, moved, support, onReady])

  const touches = candles
    .map((c, i) => ({ i, l: c.l }))
    .filter((c, idx, arr) => c.l - support < 0.6 && (idx === 0 || arr[idx - 1].l - support >= 0.6))

  return (
    <div className="space-y-3">
      <ChartFrame>
        <CandleChart
          candles={candles}
          svgRef={svgRef}
          domain={[98, 110]}
          under={(s) =>
            review && (
              <rect
                x={s.left}
                width={s.right - s.left}
                y={s.y(support + 0.5)}
                height={s.y(support - 0.5) - s.y(support + 0.5)}
                className="fill-up/15"
              />
            )
          }
        >
          {(s) => (
            <>
              {review &&
                touches.map(({ i, l }) => (
                  <circle key={i} cx={s.x(i)} cy={s.y(l) + 8} r={5} className="fill-up" />
                ))}
              <DragLine
                s={s}
                svgRef={svgRef}
                price={level}
                label="Support"
                disabled={review}
                onChange={(p) => {
                  setMoved(true)
                  setLevel(p)
                }}
              />
            </>
          )}
        </CandleChart>
      </ChartFrame>
      <p className="px-1 text-sm text-muted-foreground">Drag the line to where buyers keep stepping in.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sort the charts

type Regime = "trend" | "range"
const SORT_ITEMS: { id: string; regime: Regime; make: () => ReturnType<typeof rangingSeries> }[] = [
  { id: "A", regime: "range", make: () => rangingSeries(3) },
  { id: "B", regime: "trend", make: () => trendingSeries(5, true) },
  { id: "C", regime: "trend", make: () => trendingSeries(8, false) },
  { id: "D", regime: "range", make: () => rangingSeries(12) },
]

export function SortCharts({ phase, onReady }: ExerciseProps) {
  const series = useMemo(() => SORT_ITEMS.map((it) => ({ ...it, candles: it.make() })), [])
  const [labels, setLabels] = useState<Record<string, Regime | undefined>>({})
  const review = phase === "review"

  useEffect(() => {
    if (series.some((s) => !labels[s.id])) return onReady(null)
    onReady(() => {
      const wrong = series.filter((s) => labels[s.id] !== s.regime).map((s) => s.id)
      return wrong.length === 0
        ? { correct: true, detail: "Trends make higher highs and higher lows (or the reverse). Ranges keep returning to the same levels." }
        : { correct: false, detail: `Chart ${wrong.join(" and ")} ${wrong.length > 1 ? "are" : "is"} misclassified.` }
    })
  }, [labels, series, onReady])

  return (
    <div className="grid grid-cols-2 gap-3">
      {series.map((s) => {
        const label = labels[s.id]
        const ok = review && label === s.regime
        const bad = review && label !== s.regime
        return (
          <div
            key={s.id}
            className={cn(
              "rounded-lg border-2 bg-card p-2 transition-colors",
              ok && "border-up bg-up/5",
              bad && "border-down bg-down/5",
            )}
          >
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-muted-foreground">Chart {s.id}</span>
              {review && <Badge variant="outline">{s.regime === "trend" ? "Trending" : "Ranging"}</Badge>}
            </div>
            <CandleChart candles={s.candles} width={300} height={150} axis={false} />
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {(["trend", "range"] as Regime[]).map((r) => (
                <button
                  key={r}
                  disabled={review}
                  onClick={() => setLabels((l) => ({ ...l, [s.id]: r }))}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
                    label === r ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {r === "trend" ? "Trending" : "Ranging"}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Moving average tuner

export function countCrosses(closes: number[], ma: (number | null)[]) {
  let crosses = 0
  const at: number[] = []
  let prev: number | null = null
  for (let i = 0; i < closes.length; i++) {
    const m = ma[i]
    if (m === null) continue
    const side = Math.sign(closes[i] - m)
    if (prev !== null && side !== 0 && side !== prev) {
      crosses++
      at.push(i)
    }
    if (side !== 0) prev = side
  }
  return { crosses, at }
}

export function MaTuner({ phase, onReady }: ExerciseProps) {
  const candles = useMemo(() => choppyTrend(), [])
  const [period, setPeriod] = useState(5)
  const [moved, setMoved] = useState(false)
  const review = phase === "review"
  const ma = useMemo(() => sma(candles, period), [candles, period])
  const { crosses, at } = useMemo(
    () => countCrosses(candles.map((c) => c.c), ma),
    [candles, ma],
  )
  const target = 3

  useEffect(() => {
    if (!moved) return onReady(null)
    onReady(() =>
      crosses <= target
        ? {
            correct: true,
            detail: `With a ${period}-period MA you only get ${crosses} signal${crosses === 1 ? "" : "s"}. The trade-off: longer MAs react later, so you enter later.`,
          }
        : {
            correct: false,
            detail: `Still ${crosses} crossovers, every one a potential losing trade. Try a longer period to smooth out the noise.`,
          },
    )
  }, [crosses, period, moved, onReady])

  return (
    <div className="space-y-3">
      <ChartFrame>
        <CandleChart candles={candles}>
          {(s) => (
            <>
              <polyline
                points={ma
                  .map((m, i) => (m === null ? null : `${s.x(i)},${s.y(m)}`))
                  .filter(Boolean)
                  .join(" ")}
                fill="none"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
              {at.map((i) => (
                <circle key={i} cx={s.x(i)} cy={s.y(ma[i]!)} r={5} fill="var(--chart-3)" stroke="var(--background)" strokeWidth={1.5} />
              ))}
            </>
          )}
        </CandleChart>
      </ChartFrame>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="MA period" value={period} />
        <Stat label="Crossovers" value={crosses} tone={crosses <= target ? "up" : "down"} />
      </div>
      <div className="space-y-2 px-1">
        <Slider
          min={3}
          max={40}
          step={1}
          value={[period]}
          disabled={review}
          onValueChange={(v) => {
            setMoved(true)
            setPeriod(sliderValue(v))
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Fast · noisy</span>
          <span>Slow · smooth</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Predict, then reveal

type Call = "long" | "wait" | "short"

export function PredictFakeout({ phase, onReady }: ExerciseProps) {
  const { candles, visible, resistance } = useMemo(() => fakeoutScenario(), [])
  const [call, setCall] = useState<Call | null>(null)
  const review = phase === "review"
  const shown = useReveal(review, visible, candles.length)

  useEffect(() => {
    if (!call) return onReady(null)
    onReady(() =>
      call === "wait"
        ? {
            correct: true,
            detail: "The candle poked above 108 but closed back inside the range. No close above resistance means no breakout, and price fell back.",
          }
        : call === "long"
          ? {
              correct: false,
              detail: "The wick went above 108, but the candle closed back inside. That's a fakeout, and longs got trapped.",
            }
          : {
              correct: false,
              detail: "It worked this time, but shorting a wick is a guess, not your rule. The rule says: wait for a close.",
            },
    )
  }, [call, onReady])

  const opts: { id: Call; label: string; icon: ReactNode; tone: string }[] = [
    { id: "long", label: "Go long", icon: <ArrowUpRight className="size-5" />, tone: "text-up" },
    { id: "wait", label: "Wait", icon: <Hand className="size-5" />, tone: "text-muted-foreground" },
    { id: "short", label: "Go short", icon: <ArrowDownRight className="size-5" />, tone: "text-down" },
  ]

  return (
    <div className="space-y-3">
      <ChartFrame className="relative">
        <CandleChart candles={candles} visible={shown} domain={domainOf(candles.slice(0, visible), 0.15)}>
          {(s) => (
            <>
              <line
                x1={s.left}
                x2={s.right}
                y1={s.y(resistance)}
                y2={s.y(resistance)}
                stroke="var(--down)"
                strokeDasharray="6 4"
                strokeWidth={1.5}
              />
              <text x={s.left + 4} y={s.y(resistance) - 6} className="fill-down text-[11px] font-semibold">
                Resistance 108
              </text>
              {!review && (
                <rect
                  x={s.x(visible) - s.bw}
                  y={s.top}
                  width={s.right - s.x(visible) + s.bw}
                  height={s.bottom - s.top}
                  className="fill-muted/60"
                />
              )}
              {!review && (
                <text x={(s.x(visible) + s.right) / 2} y={(s.top + s.bottom) / 2} textAnchor="middle" className="fill-muted-foreground text-[28px] font-bold">
                  ?
                </text>
              )}
            </>
          )}
        </CandleChart>
      </ChartFrame>
      <div className="grid grid-cols-3 gap-2">
        {opts.map((o) => (
          <button
            key={o.id}
            disabled={review}
            onClick={() => setCall(o.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border-2 border-b-4 border-white/10 bg-card px-3 py-3 text-sm font-semibold transition-all active:translate-y-0.5 active:border-b-2",
              call === o.id ? "border-brand bg-brand/10" : "hover:bg-muted",
            )}
          >
            <span className={o.tone}>{o.icon}</span>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Place the trade

/** Snaps a dragged price to 0.05 so the lines land on the round levels their labels show. */
const snap = (p: number) => Math.round(p * 20) / 20

export function PlaceTrade({ phase, onReady }: ExerciseProps) {
  const { candles, visible, resistance } = useMemo(() => breakoutScenario(), [])
  const entry = candles[visible - 1].c
  const [stop, setStop] = useState(109)
  const [tp, setTp] = useState(111)
  const svgRef = useRef<SVGSVGElement>(null)
  const review = phase === "review"
  const shown = useReveal(review, visible, candles.length, 70)

  const risk = entry - stop
  const reward = tp - entry
  const rr = risk > 0 ? reward / risk : 0
  // Graded on the R:R as shown (one decimal), so "1 : 2.0" always passes.
  const rrShown = Math.round(rr * 10) / 10
  const rules = [
    { ok: stop < resistance, text: "Stop below the broken resistance (108)" },
    { ok: rrShown >= 2, text: "Reward is at least 2× the risk" },
    { ok: stop < entry && tp > entry, text: "Stop under entry, target above" },
  ]
  const allOk = rules.every((r) => r.ok)

  const outcome = (() => {
    for (let i = visible; i < candles.length; i++) {
      if (candles[i].l <= stop) return { hit: "stop" as const, i }
      if (candles[i].h >= tp) return { hit: "target" as const, i }
    }
    return { hit: "open" as const, i: candles.length - 1 }
  })()

  const result =
    outcome.hit === "target"
      ? `Target hit: +${rr.toFixed(1)}R.`
      : outcome.hit === "stop"
        ? "Stopped out: −1R."
        : "Trade still open at the end of the replay."
  const correct = allOk
  const detail = allOk
    ? `Solid plan. ${result} A good plan is judged by its rules, not by one outcome.`
    : `${result} The plan broke a rule: ${rules
        .filter((r) => !r.ok)
        .map((r) => r.text.toLowerCase())
        .join("; ")}.`

  useEffect(() => {
    onReady(() => ({ correct, detail }))
  }, [correct, detail, onReady])

  const [lo, hi] = domainOf(candles.slice(0, visible), 0.1)

  return (
    <div className="space-y-3">
      <ChartFrame>
        <CandleChart
          candles={candles}
          visible={shown}
          svgRef={svgRef}
          height={400}
          domain={[Math.min(lo, 104), Math.max(hi, 118)]}
        >
          {(s) => (
            <>
              <rect
                x={s.x(visible - 1)}
                width={s.right - s.x(visible - 1)}
                y={s.y(tp)}
                height={Math.max(0, s.y(entry) - s.y(tp))}
                className="fill-up/12"
              />
              <rect
                x={s.x(visible - 1)}
                width={s.right - s.x(visible - 1)}
                y={s.y(entry)}
                height={Math.max(0, s.y(stop) - s.y(entry))}
                className="fill-down/12"
              />
              <line
                x1={s.left}
                x2={s.right}
                y1={s.y(resistance)}
                y2={s.y(resistance)}
                stroke="var(--muted-foreground)"
                strokeDasharray="2 4"
              />
              <DragLine s={s} svgRef={svgRef} price={entry} label="Entry (market)" tone="muted" disabled onChange={() => {}} />
              <DragLine s={s} svgRef={svgRef} price={tp} label="Take profit" tone="up" disabled={review} onChange={(p) => setTp(snap(p))} />
              <DragLine s={s} svgRef={svgRef} price={stop} label="Stop loss" tone="down" disabled={review} onChange={(p) => setStop(snap(p))} />
              {review && shown > outcome.i && outcome.hit !== "open" && (
                <circle
                  cx={s.x(outcome.i)}
                  cy={s.y(outcome.hit === "target" ? tp : stop)}
                  r={8}
                  fill={outcome.hit === "target" ? "var(--up)" : "var(--down)"}
                  stroke="var(--background)"
                  strokeWidth={2}
                />
              )}
            </>
          )}
        </CandleChart>
      </ChartFrame>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Risk" value={risk.toFixed(2)} tone="down" />
        <Stat label="Reward" value={reward.toFixed(2)} tone="up" />
        <Stat label="R:R" value={`1 : ${rrShown.toFixed(1)}`} tone={rrShown >= 2 ? "up" : "down"} />
      </div>
      <ul className="space-y-1.5 px-1">
        {rules.map((r) => (
          <li key={r.text} className="flex items-center gap-2 text-sm">
            {r.ok ? <Check className="size-4 text-up" /> : <X className="size-4 text-down" />}
            <span className={r.ok ? "" : "text-muted-foreground"}>{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
