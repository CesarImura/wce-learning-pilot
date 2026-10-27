"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Slider } from "@/components/ui/slider"
import { useDragY } from "@/components/chart/candle-chart"
import { hourTicks } from "@/lib/market"
import { ChartFrame, sliderValue, type ExerciseProps } from "./shared"

const W = 640
const H = 300
const LINE_L = 16
const LINE_R = 430
const CANDLE_X = 540
const MIN = 97.2
const MAX = 104.6
const y = (p: number) => 16 + ((MAX - p) / (MAX - MIN)) * (H - 32)
const price = (py: number) => MAX - ((py - 16) / (H - 32)) * (MAX - MIN)

function TickLine({ ticks, upto }: { ticks: number[]; upto: number }) {
  const step = (LINE_R - LINE_L) / (ticks.length - 1)
  const pts = ticks.slice(0, upto).map((p, i) => `${LINE_L + i * step},${y(p)}`)
  const last = ticks[upto - 1]
  return (
    <>
      <text x={LINE_L} y={H - 2} className="fill-muted-foreground text-[11px]">
        9:00
      </text>
      <text x={LINE_R - 24} y={H - 2} className="fill-muted-foreground text-[11px]">
        10:00
      </text>
      <polyline points={pts.join(" ")} fill="none" stroke="var(--foreground)" strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={LINE_L + (upto - 1) * step} cy={y(last)} r={4} fill="var(--brand)" />
    </>
  )
}

function CandleShape({
  o,
  h,
  l,
  c,
  x = CANDLE_X,
  ghost,
}: {
  o: number
  h: number
  l: number
  c: number
  x?: number
  ghost?: boolean
}) {
  const color = c >= o ? "var(--up)" : "var(--down)"
  const top = y(Math.max(o, c))
  const bh = Math.max(2, Math.abs(y(o) - y(c)))
  if (ghost)
    return (
      <g opacity={0.9}>
        <line x1={x} x2={x} y1={y(h)} y2={y(l)} stroke="var(--foreground)" strokeDasharray="3 3" />
        <rect x={x - 14} y={top} width={28} height={bh} fill="none" stroke="var(--foreground)" strokeDasharray="3 3" />
      </g>
    )
  return (
    <g>
      <line x1={x} x2={x} y1={y(h)} y2={y(l)} stroke={color} strokeWidth={2.5} />
      <rect x={x - 16} y={top} width={32} height={bh} fill={color} rx={2} />
    </g>
  )
}

/** Lays labels out top-to-bottom by price, keeping them at least 15px apart. */
function spread(items: { k: string; v: number }[]) {
  const sorted = [...items].sort((a, b) => b.v - a.v)
  let last = -Infinity
  return sorted.map((it) => {
    const ly = Math.max(y(it.v), last + 15)
    last = ly
    return { ...it, ly }
  })
}

/** Learn step: scrub through an hour of ticks and watch the candle form. */
export function CandleScrub() {
  const { ticks } = useMemo(() => hourTicks(), [])
  const [t, setT] = useState(6)
  const seen = ticks.slice(0, t)
  const o = seen[0]
  const c = seen[seen.length - 1]
  const h = Math.max(...seen)
  const l = Math.min(...seen)

  return (
    <div className="space-y-4">
      <ChartFrame>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <TickLine ticks={ticks} upto={t} />
          {[
            { k: "H", v: h },
            { k: "L", v: l },
          ].map(({ k, v }) => (
            <line key={k} x1={LINE_L} x2={CANDLE_X} y1={y(v)} y2={y(v)} stroke="var(--muted-foreground)" strokeDasharray="2 4" />
          ))}
          <CandleShape o={o} h={h} l={l} c={c} />
          {spread([
            { k: "High", v: h },
            { k: "Open", v: o },
            { k: "Close", v: c },
            { k: "Low", v: l },
          ]).map(({ k, v, ly }) => (
            <text key={k} x={CANDLE_X + 26} y={ly + 4} className="fill-foreground text-[11px] font-medium tabular-nums">
              {k} {v.toFixed(2)}
            </text>
          ))}
        </svg>
      </ChartFrame>
      <div className="space-y-2 px-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Drag the time slider</span>
          <span className="tabular-nums">9:{String(Math.round((t - 1) * (60 / 47))).padStart(2, "0")}</span>
        </div>
        <Slider min={1} max={ticks.length} step={1} value={[t]} onValueChange={(v) => setT(sliderValue(v))} />
      </div>
      <p className="text-sm text-muted-foreground">
        A candle is a summary of everything price did in one period: where it <b>opened</b>, the <b>highest</b> and{" "}
        <b>lowest</b> points it touched, and where it <b>closed</b>. Notice the candle turns green the moment price sits
        above the open.
      </p>
    </div>
  )
}

type Ohlc = { o: number; h: number; l: number; c: number }

/** Exercise: drag the four handles to build the candle for this hour. */
export function CandleBuilder({ phase, onReady }: ExerciseProps) {
  const { ticks, ohlc } = useMemo(() => hourTicks(), [])
  const [v, setV] = useState<Ohlc>({ h: 104.4, o: 101.6, c: 99.6, l: 97.5 })
  const [touched, setTouched] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const review = phase === "review"

  useEffect(() => {
    if (!touched) return onReady(null)
    onReady(() => {
      // 0.45 is ~16 SVG units, about 9px on a phone; 0.3 left a 6px window per handle with no price labels to go by.
      const tol = 0.45
      const off = (["o", "h", "l", "c"] as const).filter((k) => Math.abs(v[k] - ohlc[k]) > tol)
      const names = { o: "Open", h: "High", l: "Low", c: "Close" }
      return off.length === 0
        ? { correct: true, detail: "That's exactly the candle for this hour. The body is green because it closed above the open." }
        : {
            correct: false,
            detail: `Check your ${off.map((k) => names[k]).join(", ")}. The dashed outline shows the real candle.`,
          }
    })
  }, [v, touched, ohlc, onReady])

  const set = (k: keyof Ohlc) => (py: number) => {
    setTouched(true)
    setV((s) => ({ ...s, [k]: Math.min(MAX - 0.05, Math.max(MIN + 0.05, price(py))) }))
  }
  const handles: { k: keyof Ohlc; x: number; color: string }[] = [
    { k: "h", x: CANDLE_X, color: "var(--brand-pale)" },
    { k: "l", x: CANDLE_X, color: "var(--brand-pale)" },
    { k: "o", x: CANDLE_X - 42, color: "var(--brand)" },
    { k: "c", x: CANDLE_X + 42, color: "var(--brand)" },
  ]
  const dragH = useDragY(svgRef, set("h"), review)
  const dragL = useDragY(svgRef, set("l"), review)
  const dragO = useDragY(svgRef, set("o"), review)
  const dragC = useDragY(svgRef, set("c"), review)
  const drags = { h: dragH, l: dragL, o: dragO, c: dragC }

  const shown = { ...v, h: Math.max(v.h, v.o, v.c), l: Math.min(v.l, v.o, v.c) }

  return (
    <div className="space-y-3">
      <ChartFrame>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none">
          <TickLine ticks={ticks} upto={ticks.length} />
          {handles.map(({ k }) => (
            <line
              key={k}
              x1={LINE_L}
              x2={CANDLE_X}
              y1={y(v[k])}
              y2={y(v[k])}
              stroke="var(--muted-foreground)"
              strokeDasharray="2 4"
              opacity={0.7}
            />
          ))}
          <CandleShape {...shown} />
          {review && <CandleShape {...ohlc} x={CANDLE_X + 72} ghost />}
          {review && (
            <text x={CANDLE_X + 72} y={H - 4} textAnchor="middle" className="fill-muted-foreground text-[11px]">
              actual
            </text>
          )}
          {handles.map(({ k, x, color }) => (
            <g key={k} {...drags[k]} className={review ? "" : "drag-knob"}>
              <rect x={x - 22} y={y(v[k]) - 16} width={44} height={32} fill="transparent" className="touch-hit" />
              <circle cx={x} cy={y(v[k])} r={11} fill={color} className="knob-halo" />
              <g className="knob-face">
                <circle cx={x} cy={y(v[k])} r={11} fill={color} stroke="var(--background)" strokeWidth={2} className="touch-knob" />
                <text x={x} y={y(v[k]) + 4} textAnchor="middle" fill="#000" className="text-[11px] font-bold">
                  {k.toUpperCase()}
                </text>
              </g>
            </g>
          ))}
        </svg>
      </ChartFrame>
      <p className="px-1 text-sm text-muted-foreground">
        Drag <b>O</b>, <b>H</b>, <b>L</b> and <b>C</b> so the candle matches the hour of price action on the left.
      </p>
    </div>
  )
}
