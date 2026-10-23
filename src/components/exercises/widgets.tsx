"use client"

// Interactive widgets for the Beginner Series (Andrea Cimitan). Each one turns a
// concept from the transcripts into something the learner manipulates.

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react"
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { CandleChart, useDragY, useSvgPoint } from "@/components/chart/candle-chart"
import { fromAnchors, rng, type Candle } from "@/lib/market"
import { cn } from "@/lib/utils"
import { ChartFrame, Stat, fmtUsd, parseAnswer, sliderValue, useAutoAnswer, useReveal, type ExerciseProps } from "./shared"

// ---------------------------------------------------------------------------
// Shared bits

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[14px]">
        <span className="font-medium">{label}</span>
        <span className="text-white/60 tabular-nums">{display}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        disabled={disabled}
        onValueChange={(v) => onChange(sliderValue(v))}
      />
    </div>
  )
}

/** A numeric question box wired to onReady. */
function useNumberQuestion(
  raw: string,
  answer: number,
  tolerance: number,
  correct: string,
  shown: string,
  onReady: ExerciseProps["onReady"],
) {
  useEffect(() => {
    const n = parseAnswer(raw)
    if (n === null) return onReady(null)
    // A wrong answer shows the right value and the same worked explanation as a right one.
    onReady(() =>
      Math.abs(n - answer) <= tolerance
        ? { correct: true, detail: correct }
        : { correct: false, answer: shown, detail: correct },
    )
  }, [raw, answer, tolerance, correct, shown, onReady])
}

/**
 * The task: what the learner has to answer. It always comes first, so the
 * question is read before the tools that help answer it.
 */
function QuestionBox({
  id,
  question,
  value,
  onChange,
  disabled,
  before,
  after,
}: {
  id: string
  question: ReactNode
  value: string
  onChange: (v: string) => void
  disabled: boolean
  before?: string
  after?: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[8px] bg-white/10 p-4">
      <Label htmlFor={id} className="text-[16px] leading-6 font-normal text-pretty text-white">
        {question}
      </Label>
      <div className="flex items-center gap-2">
        {before && <span className="text-[16px] text-[#9e9e9e]">{before}</span>}
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="Your answer"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 max-w-48 rounded-[6px] border-[#333] bg-black/40 text-[18px] tabular-nums md:text-[18px]"
        />
        {after && <span className="text-[16px] text-[#9e9e9e]">{after}</span>}
      </div>
    </div>
  )
}

/** A calculator to work the answer out: the inputs, then the results they produce right under them. */
function Calculator({ hint, children, results }: { hint: string; children: ReactNode; results: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-[8px] border border-white/15 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-[16px] leading-5 font-medium text-white">Calculator</p>
        <p className="text-[14px] leading-5 text-pretty text-[#9e9e9e]">{hint}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
      <div className="flex flex-col gap-3">{results}</div>
    </section>
  )
}

/** Sets a calculator to the question's own numbers once the answer is checked, so the review shows the worked result. */
function useSolvedOnReview(review: boolean, solve: () => void) {
  const done = useRef(false)
  useEffect(() => {
    if (!review || done.current) return
    done.current = true
    solve()
  }, [review, solve])
}

/** Context shown once the learner has answered: the "why" behind the numbers. */
function Insight({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[8px] bg-white/10 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className="text-[16px] leading-5 font-medium text-white">{title}</p>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// 1. Returns reality check (Video 01)

const BENCHMARKS = [
  { id: "sp", label: "S&P 500, long-run average", short: "S&P 500", rate: 0.09 },
  { id: "buffett", label: "Warren Buffett, ~15–20% a year", short: "Buffett", rate: 0.175 },
  { id: "simons", label: "Jim Simons, ~60% a year (world record)", short: "Simons", rate: 0.6 },
  { id: "guru", label: "Instagram guru: “10% a month”", short: "Guru", rate: Math.pow(1.1, 12) - 1 },
]

export function ReturnsReality({ phase, onReady, autoAnswer }: ExerciseProps) {
  const [account, setAccount] = useState(25_000)
  const [raw, setRaw] = useState("")
  const review = phase === "review"
  useNumberQuestion(
    raw,
    6000,
    1,
    "Even matching the best quant fund in history turns $10,000 into a $6,000 profit. Nobody lives on that, which is why trading isn't a get-rich-quick business model.",
    "$6,000",
    onReady,
  )
  useAutoAnswer(autoAnswer, (v) => setRaw(v === "correct" ? "6000" : "15000"))
  // After answering, the calculator shows the worked question.
  useSolvedOnReview(review, () => setAccount(10_000))
  const max = account * BENCHMARKS[3].rate

  return (
    <div className="flex flex-col gap-4">
      <QuestionBox
        id="rr-q"
        question="With $10,000 and Jim Simons-level returns (60% a year), how much do you make in a year?"
        value={raw}
        onChange={setRaw}
        disabled={review}
        before="$"
      />
      <Calculator
        hint="Set the account size from the question, then read the yearly profit of each investor."
        results={
          <div className="flex flex-col gap-3 rounded-[8px] bg-white/10 p-4">
            {BENCHMARKS.map((b) => {
              const profit = account * b.rate
              const guru = b.id === "guru"
              return (
                <div key={b.id} className="flex flex-col gap-1">
                  <div className="flex justify-between gap-3 text-[14px]">
                    <span className={guru ? "text-down" : "text-white/70"}>{b.label}</span>
                    <span className={cn("font-semibold tabular-nums", guru ? "text-down" : "text-white")}>+{fmtUsd(profit)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-[2px] bg-white/5">
                    <div
                      className={cn(
                        "h-full rounded-[2px] transition-[width] duration-300",
                        guru ? "bg-[repeating-linear-gradient(45deg,var(--down)_0_6px,transparent_6px_10px)]" : "bg-brand",
                      )}
                      style={{ width: `${Math.max(1, (profit / max) * 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <p className="pt-1 text-[12px] text-white/40">Yearly profit. 80–90% of hedge funds fail to beat the S&P 500 over the long run.</p>
          </div>
        }
      >
        <SliderRow label="Account size" value={account} display={fmtUsd(account)} min={1000} max={100_000} step={1000} onChange={setAccount} />
      </Calculator>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Break-even curve (Video 01): win rate = 1 / (1 + R)

export function BreakevenCurve({ phase, onReady, autoAnswer }: ExerciseProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const toPoint = useSvgPoint(svgRef)
  const [pt, setPt] = useState({ r: 1, w: 70 })
  const [moved, setMoved] = useState(false)
  const dragging = useRef(false)
  useAutoAnswer(autoAnswer, (v) => {
    setPt(v === "correct" ? { r: 2, w: 33 } : { r: 1, w: 70 })
    setMoved(true)
  })
  const review = phase === "review"

  const W = 640
  const H = 360
  const L = 52
  const R = 620
  const T = 16
  const B = 316
  const rMin = 0.25
  const rMax = 4
  const x = (r: number) => L + ((r - rMin) / (rMax - rMin)) * (R - L)
  const y = (w: number) => B - (w / 100) * (B - T)
  const fromX = (px: number) => rMin + ((px - L) / (R - L)) * (rMax - rMin)
  const fromY = (py: number) => ((B - py) / (B - T)) * 100

  const be = (r: number) => 100 / (1 + r)
  const curve = Array.from({ length: 80 }, (_, i) => {
    const r = rMin + (i / 79) * (rMax - rMin)
    return [x(r), y(be(r))] as const
  })
  const curvePath = curve.map(([a, b], i) => `${i ? "L" : "M"}${a},${b}`).join(" ")
  const profitArea = `${curvePath} L${R},${T} L${L},${T} Z`
  const lossArea = `${curvePath} L${R},${B} L${L},${B} Z`

  const w = pt.w / 100
  const pf = w >= 1 ? Infinity : (w * pt.r) / (1 - w)

  function update(e: { clientX: number; clientY: number }) {
    const p = toPoint(e)
    const r = Math.min(rMax, Math.max(rMin, Math.round(fromX(p.x) * 4) / 4))
    const wr = Math.min(99, Math.max(1, Math.round(fromY(p.y))))
    setPt({ r, w: wr })
    setMoved(true)
  }

  useEffect(() => {
    if (!moved) return onReady(null)
    onReady(() =>
      pt.r === 2 && Math.abs(pt.w - 100 / 3) <= 2.5
        ? {
            correct: true,
            detail: `At 1:2 you only need to win 1 / (1 + 2) = 33% of the time to break even. Anything above the line has a profit factor above 1.`,
          }
        : {
            correct: false,
            answer: "1 : 2 at a 33% win rate",
            detail:
              pt.r !== 2
                ? `You're at 1 : ${pt.r}. Slide right to 1 : 2 (x = 2): there you only need to win 1 / (1 + 2) = 33% of the time to break even.`
                : `Close: at 1 : 2 break-even is 1 / (1 + 2) ≈ 33%. You're at ${pt.w}% (profit factor ${pf.toFixed(2)}).`,
          },
    )
  }, [pt, moved, pf, onReady])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Reward : risk" value={`1 : ${pt.r}`} />
        <Stat label="Win rate" value={`${pt.w}%`} />
        <Stat
          label="Profit factor"
          value={Number.isFinite(pf) ? pf.toFixed(2) : "∞"}
          tone={pf > 1.02 ? "up" : pf < 0.98 ? "down" : undefined}
        />
      </div>
      <ChartFrame>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className={cn("w-full touch-none select-none", !review && "cursor-crosshair")}
          onPointerDown={(e) => {
            if (review) return
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            update(e)
          }}
          onPointerMove={(e) => dragging.current && update(e)}
          onPointerUp={() => (dragging.current = false)}
        >
          <path d={profitArea} className="fill-up/10" />
          <path d={lossArea} className="fill-down/10" />
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={L} x2={R} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray="2 4" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-white/40 text-[11px] tabular-nums">
                {t}%
              </text>
            </g>
          ))}
          {[0.5, 1, 2, 3, 4].map((t) => (
            <text key={t} x={x(t)} y={B + 18} textAnchor="middle" className="fill-white/40 text-[11px] tabular-nums">
              1:{t}
            </text>
          ))}
          <text x={R} y={B + 36} textAnchor="end" className="fill-white/40 text-[11px] uppercase">
            reward : risk →
          </text>
          <text x={x(3.2)} y={y(70)} className="fill-up text-[13px] font-semibold">
            Profitable (PF &gt; 1)
          </text>
          <text x={x(0.4)} y={y(12)} className="fill-down text-[13px] font-semibold">
            Losing (PF &lt; 1)
          </text>
          <path d={curvePath} fill="none" stroke="#fff" strokeWidth={2} />
          <text x={x(3.4)} y={y(be(3.4)) - 8} className="fill-white text-[11px]">
            random / break-even
          </text>
          {review && (
            <g>
              <line x1={x(2)} x2={x(2)} y1={T} y2={B} stroke="var(--brand)" strokeDasharray="4 4" />
              <circle cx={x(2)} cy={y(100 / 3)} r={7} fill="none" stroke="var(--brand)" strokeWidth={2} />
            </g>
          )}
          <line x1={x(pt.r)} x2={x(pt.r)} y1={y(pt.w)} y2={B} stroke="var(--brand)" strokeOpacity={0.4} />
          <line x1={L} x2={x(pt.r)} y1={y(pt.w)} y2={y(pt.w)} stroke="var(--brand)" strokeOpacity={0.4} />
          <circle cx={x(pt.r)} cy={y(pt.w)} r={10} fill="var(--brand)" stroke="#000" strokeWidth={3} />
        </svg>
      </ChartFrame>
      <p className="px-1 text-[13px] text-white/50">Drag the dot. Each point is a strategy: its reward-to-risk and win rate.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. Prop firm payout + business model (Video 02)

export function PropFirm({ phase, onReady, autoAnswer }: ExerciseProps) {
  const [size, setSize] = useState(50_000)
  const [ret, setRet] = useState(5)
  const [split, setSplit] = useState(80)
  const [raw, setRaw] = useState("")
  const review = phase === "review"
  const profit = size * (ret / 100)
  const payout = profit * (split / 100)
  useNumberQuestion(
    raw,
    16000,
    1,
    "$200,000 × 10% = $20,000 profit, and an 80% split pays you $16,000. Big upside, but most challenge buyers fail, and those fees fund the few payouts.",
    "$16,000",
    onReady,
  )
  useAutoAnswer(autoAnswer, (v) => setRaw(v === "correct" ? "16000" : "20000"))
  useSolvedOnReview(review, () => {
    setSize(200_000)
    setRet(10)
    setSplit(80)
  })


  // Two columns on desktop: the task (and, once answered, who pays) left, the calculator right.
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-4">
        <QuestionBox
          id="pf-q"
          question="You pass a $200,000 challenge and make 10%. With an 80% split, what's your payout?"
          value={raw}
          onChange={setRaw}
          disabled={review}
          before="$"
        />
        {review && <PropFirmInsight />}
      </div>
      <Calculator
        hint="Set it to the numbers in the question (account size, return and split) and read your payout."
        results={
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Profit" value={fmtUsd(profit)} />
            <Stat label="Your payout" value={fmtUsd(payout)} tone="up" />
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-medium">Account size</span>
          <div className="grid grid-cols-3 gap-2">
            {[50_000, 100_000, 200_000].map((v) => (
              <button
                key={v}
                disabled={review}
                onClick={() => setSize(v)}
                aria-pressed={size === v}
                className={cn(
                  "h-10 rounded-[6px] border px-2 text-[14px] font-medium tabular-nums transition-[scale,background-color,border-color] duration-150 enabled:active:scale-[0.96]",
                  size === v ? "border-brand bg-brand/15 text-white" : "border-transparent bg-white/15 text-white/70 enabled:hover:bg-white/20",
                )}
              >
                {fmtUsd(v)}
              </button>
            ))}
          </div>
        </div>
        <SliderRow label="Your return" value={ret} display={`${ret}%`} min={1} max={20} step={1} onChange={setRet} disabled={review} />
        <SliderRow label="Profit split" value={split} display={`${split}%`} min={70} max={90} step={5} onChange={setSplit} disabled={review} />
      </Calculator>
    </div>
  )
}

// Who funds the payout: 10,000 buyers pay $1,000 each, 3 pass (~0.03%, from the lesson).
function PropFirmInsight() {
  return (
    <Insight title="Who pays your payout?">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="People who buy a $1,000 challenge" value="10,000" className="bg-black/40" />
        <Stat label="People who pass and get paid" value="3" className="bg-black/40 [&>div:last-child]:text-gold" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[14px] leading-5 text-white/70">
          Where the <span className="text-white">$10,000,000</span> in challenge fees goes
        </p>
        <div className="flex h-3 overflow-hidden rounded-full bg-white/10" role="img" aria-label="0.5% paid to winners, 99.5% kept by the firm">
          <div className="h-full min-w-1 bg-gold" style={{ width: "0.48%" }} />
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[13px] text-white/60 tabular-nums">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-gold" /> Paid to the 3 winners: $48,000
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-white/30" /> Kept by the firm: $9,952,000
          </span>
        </div>
      </div>
      <p className="text-[14px] leading-5 text-pretty text-white/70">
        Most buyers fail, and their fees pay the few who pass. Prop firms are usually unregulated, so do your due diligence.
      </p>
    </Insight>
  )
}

// ---------------------------------------------------------------------------
// 4. Yield curve builder (Video 04)

const MATURITIES = ["3M", "1Y", "2Y", "5Y", "10Y", "30Y"]

export function YieldCurveBuilder({ phase, onReady }: ExerciseProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [yields, setYields] = useState([5.4, 3.1, 4.6, 2.4, 3.8, 3.2])
  const [moved, setMoved] = useState(false)
  const review = phase === "review"
  const W = 640
  const H = 320
  const L = 48
  const R = 610
  const T = 20
  const B = 280
  const x = (i: number) => L + (i / (MATURITIES.length - 1)) * (R - L)
  const y = (v: number) => B - (v / 8) * (B - T)
  const fromY = (py: number) => Math.min(8, Math.max(0, ((B - py) / (B - T)) * 8))

  const normal = yields.every((v, i) => i === 0 || v >= yields[i - 1] - 0.05) && yields[5] - yields[0] >= 1
  useEffect(() => {
    if (!moved) return onReady(null)
    onReady(() =>
      normal
        ? {
            correct: true,
            detail:
              "That's a normal yield curve: the longer you lend, the more you get paid (the term premium). When short yields rise above long ones, the curve inverts, typically when rate hikes are expected.",
          }
        : {
            correct: false,
            detail:
              "Each maturity should pay at least as much as the shorter one before it, and 30Y should pay clearly more than 3M (at least 1% more).",
          },
    )
  }, [moved, normal, onReady])

  return (
    <div className="space-y-3">
      <ChartFrame>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none">
          {[0, 2, 4, 6, 8].map((t) => (
            <g key={t}>
              <line x1={L} x2={R} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray="2 4" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-white/40 text-[11px] tabular-nums">
                {t}%
              </text>
            </g>
          ))}
          <polyline
            points={yields.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            fill="none"
            stroke={review ? (normal ? "var(--up)" : "var(--down)") : "var(--brand)"}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {yields.map((v, i) => (
            <YieldDot
              key={i}
              svgRef={svgRef}
              cx={x(i)}
              cy={y(v)}
              label={`${v.toFixed(1)}%`}
              disabled={review}
              onY={(py) => {
                setMoved(true)
                setYields((ys) => ys.map((old, k) => (k === i ? Math.round(fromY(py) * 10) / 10 : old)))
              }}
            />
          ))}
          {MATURITIES.map((m, i) => (
            <text key={m} x={x(i)} y={B + 26} textAnchor="middle" className="fill-white/60 text-[12px] font-medium">
              {m}
            </text>
          ))}
        </svg>
      </ChartFrame>
      <p className="px-1 text-[13px] text-white/50">
        Drag each dot up or down. X axis: how long you lend (maturity). Y axis: the yield you demand.
      </p>
    </div>
  )
}

function YieldDot({
  svgRef,
  cx,
  cy,
  label,
  onY,
  disabled,
}: {
  svgRef: RefObject<SVGSVGElement | null>
  cx: number
  cy: number
  label: string
  onY: (y: number) => void
  disabled: boolean
}) {
  const drag = useDragY(svgRef, onY, disabled)
  return (
    <g {...drag} className={disabled ? "" : "cursor-ns-resize"}>
      <rect x={cx - 24} y={cy - 24} width={48} height={48} fill="transparent" />
      <circle cx={cx} cy={cy} r={9} fill="var(--brand)" stroke="#000" strokeWidth={3} />
      <text x={cx} y={cy - 16} textAnchor="middle" className="fill-white text-[11px] font-semibold tabular-nums">
        {label}
      </text>
    </g>
  )
}

// ---------------------------------------------------------------------------
// 5. Dividend split (Video 05)

const OWNERS = [
  { id: "A", share: 0.25, color: "var(--brand)" },
  { id: "B", share: 0.25, color: "var(--chart-4)" },
  { id: "C", share: 0.5, color: "var(--gold)" },
]

export function DividendSplit({ phase, onReady, autoAnswer }: ExerciseProps) {
  const [reinvest, setReinvest] = useState(0)
  const [raw, setRaw] = useState("")
  const review = phase === "review"
  const earnings = 500_000
  const paid = earnings - reinvest
  useNumberQuestion(
    raw,
    200_000,
    1,
    "$500k − $100k reinvested = $400k paid out. C owns 50%, so C receives $200k. Shares give you ownership and a cut of the profits.",
    "$200,000",
    onReady,
  )
  useAutoAnswer(autoAnswer, (v) => setRaw(v === "correct" ? "200000" : "250000"))
  useSolvedOnReview(review, () => setReinvest(100_000))

  // Donut arcs
  const arcs = OWNERS.map((o, k) => {
    const start = OWNERS.slice(0, k).reduce((n, x) => n + x.share, 0)
    const a0 = start * 2 * Math.PI - Math.PI / 2
    const a1 = (start + o.share) * 2 * Math.PI - Math.PI / 2
    const r = 70
    const large = o.share > 0.5 ? 1 : 0
    const p = (a: number) => `${100 + r * Math.cos(a)},${100 + r * Math.sin(a)}`
    return { ...o, d: `M${p(a0)} A${r},${r} 0 ${large} 1 ${p(a1)}` }
  })

  return (
    <div className="flex flex-col gap-4">
      <QuestionBox
        id="div-q"
        question="The company reinvests $100k of its $500k earnings. How much does founder C receive?"
        value={raw}
        onChange={setRaw}
        disabled={review}
        before="$"
      />
      <Calculator
        hint="Set how much the company reinvests, then read what each founder receives."
        results={
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Net earnings" value="$500k" />
              <Stat label="Reinvested" value={fmtUsd(reinvest)} />
              <Stat label="Paid out" value={fmtUsd(paid)} tone="up" />
            </div>
            <div className="grid items-center gap-4 rounded-[8px] bg-white/10 p-4 sm:grid-cols-[160px_1fr]">
              <svg viewBox="0 0 200 200" className="mx-auto w-36" aria-hidden>
                {arcs.map((a) => (
                  <path key={a.id} d={a.d} fill="none" stroke={a.color} strokeWidth={34} />
                ))}
                <text x={100} y={96} textAnchor="middle" className="fill-white/50 text-[12px]">
                  Ownership
                </text>
                <text x={100} y={114} textAnchor="middle" className="fill-white text-[14px] font-semibold">
                  400 shares
                </text>
              </svg>
              <div className="flex flex-col gap-3">
                {OWNERS.map((o) => (
                  <div key={o.id} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[14px]">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: o.color }} />
                        Founder {o.id} · {o.share * 100}%
                      </span>
                      <span className="font-semibold tabular-nums">{fmtUsd(paid * o.share)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-[2px] bg-white/5">
                      <div
                        className="h-full transition-[width] duration-300"
                        style={{ width: `${((paid * o.share) / (earnings * 0.5)) * 100}%`, background: o.color }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-[12px] text-white/40">Dividends paid this year</p>
              </div>
            </div>
          </>
        }
      >
        <SliderRow
          label="Reinvested in the business"
          value={reinvest}
          display={fmtUsd(reinvest)}
          min={0}
          max={500_000}
          step={25_000}
          onChange={setReinvest}
          disabled={review}
        />
      </Calculator>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 6. Central bank vs. the cycle (Video 06)

type Move = "cut" | "hike"
const CYCLE_POINTS: { t: number; title: string; text: string; answer: Move }[] = [
  { t: 0.25, title: "Recession", text: "Jobs are being lost, prices are calm", answer: "cut" },
  { t: 0.75, title: "Overheating", text: "Everyone is spending, inflation is above 2%", answer: "hike" },
  { t: 1.25, title: "Downturn again", text: "Unemployment is the problem now", answer: "cut" },
]

export function FedCycle({ phase, onReady }: ExerciseProps) {
  const [picks, setPicks] = useState<Record<number, Move>>({})
  const review = phase === "review"
  const W = 640
  const H = 240
  const econ = (t: number) => 120 - 70 * Math.sin(2 * Math.PI * (t - 0.5))
  const xs = (t: number) => 20 + (t / 1.5) * 600
  const path = (shift: number) =>
    Array.from({ length: 121 }, (_, i) => {
      const t = (i / 120) * 1.5
      return `${i ? "L" : "M"}${xs(t)},${econ(t + shift)}`
    }).join(" ")

  useEffect(() => {
    if (Object.keys(picks).length < CYCLE_POINTS.length) return onReady(null)
    onReady(() => {
      const wrong = CYCLE_POINTS.filter((p, i) => picks[i] !== p.answer).length
      return wrong === 0
        ? {
            correct: true,
            detail:
              "Cut when unemployment is the problem (cheap credit → more borrowing → more spending). Hike when inflation is the problem. And notice markets move 6–9 months ahead of the economy.",
          }
        : {
            correct: false,
            detail:
              "Central banks cut rates to fight unemployment and hike rates to fight inflation. Low rates make borrowing (and new money) cheaper.",
          }
    })
  }, [picks, onReady])

  return (
    <div className="space-y-4">
      <ChartFrame>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <line x1={20} x2={620} y1={120} y2={120} stroke="var(--border)" strokeDasharray="2 4" />
          <path d={path(0.12)} fill="none" stroke="var(--brand)" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.7} />
          <path d={path(0)} fill="none" stroke="#fff" strokeWidth={2.5} />
          <text x={24} y={22} className="fill-white text-[12px] font-medium">
            ── Economy
          </text>
          <text x={120} y={22} className="fill-brand text-[12px] font-medium">
            - - Stock market (6–9 months ahead)
          </text>
          {CYCLE_POINTS.map((p, i) => {
            const pick = picks[i]
            const ok = pick === p.answer
            return (
              <g key={i}>
                <circle
                  cx={xs(p.t)}
                  cy={econ(p.t)}
                  r={13}
                  fill={review ? (ok ? "var(--up)" : "var(--down)") : pick ? "var(--brand)" : "#000"}
                  stroke="#fff"
                  strokeWidth={2}
                />
                <text x={xs(p.t)} y={econ(p.t) + 4} textAnchor="middle" className="fill-white text-[12px] font-bold">
                  {i + 1}
                </text>
              </g>
            )
          })}
        </svg>
      </ChartFrame>
      <div className="grid gap-2 sm:grid-cols-3">
        {CYCLE_POINTS.map((p, i) => {
          const pick = picks[i]
          const ok = pick === p.answer
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg border bg-white/[0.04] p-3",
                !review && "border-white/10",
                review && ok && "border-up/50",
                review && !ok && "border-down/50",
              )}
            >
              <p className="text-[12px] tracking-wide text-white/45 uppercase">Point {i + 1}</p>
              <p className="text-[15px] font-semibold">{p.title}</p>
              <p className="mb-3 text-[13px] text-white/60">{p.text}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["cut", "hike"] as const).map((m) => (
                  <button
                    key={m}
                    disabled={review}
                    onClick={() => setPicks((s) => ({ ...s, [i]: m }))}
                    className={cn(
                      "h-9 rounded-md border text-[14px] font-medium",
                      pick === m ? "border-brand bg-brand/15 text-white" : "border-white/10 bg-white/5 text-white/60",
                      review && p.answer === m && pick !== m && "border-dashed border-white/50 text-white",
                    )}
                  >
                    {m === "cut" ? "Cut rates" : "Hike rates"}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 7. Carry trade & rate differentials (Video 07)

export function CarryTrade({ phase, onReady, autoAnswer }: ExerciseProps) {
  const [us, setUs] = useState(5)
  const [jp, setJp] = useState(0)
  const [raw, setRaw] = useState("")
  const review = phase === "review"
  const diff = us - jp
  const carry = 100_000 * (diff / 100)
  useNumberQuestion(
    raw,
    4000,
    1,
    "4.5% − 0.5% = 4% on $100,000 = $4,000 a year for borrowing cheap and lending dear. That flow into dollars is why USD/JPY trends when rate gaps are wide.",
    "$4,000",
    onReady,
  )
  useAutoAnswer(autoAnswer, (v) => setRaw(v === "correct" ? "4000" : "5000"))
  useSolvedOnReview(review, () => {
    setUs(4.5)
    setJp(0.5)
  })

  const series = useMemo(() => {
    const r = rng(17)
    const out = [150]
    for (let i = 1; i < 60; i++) out.push(out[i - 1] + diff * 0.12 + (r() - 0.5) * 1.6)
    return out
  }, [diff])
  const lo = Math.min(...series, 140)
  const hi = Math.max(...series, 160)
  const bias = diff > 0.5 ? "up" : diff < -0.5 ? "down" : "flat"

  // Two columns on desktop: the task and calculator left, the USD/JPY drift it produces right.
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-4">
        <QuestionBox
          id="carry-q"
          question="The Fed is at 4.5% and the Bank of Japan at 0.5%. What does the $100,000 carry trade earn per year?"
          value={raw}
          onChange={setRaw}
          disabled={review}
          before="$"
        />
        <Calculator
          hint="Borrow $100,000 worth of yen and lend it in dollars. Set both rates from the question and read the carry per year."
          results={
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Rate gap" value={`${diff > 0 ? "+" : ""}${diff.toFixed(2)}%`} />
              <Stat label="Carry per year" value={fmtUsd(carry)} tone={carry > 0 ? "up" : carry < 0 ? "down" : undefined} />
              <Stat
                label="USD/JPY bias"
                value={
                  <span className="flex items-center gap-1">
                    {bias === "up" ? <ArrowUpRight className="size-5" /> : bias === "down" ? <ArrowDownRight className="size-5" /> : <ArrowRight className="size-5" />}
                    {bias === "up" ? "Up" : bias === "down" ? "Down" : "Range"}
                  </span>
                }
                tone={bias === "up" ? "up" : bias === "down" ? "down" : undefined}
              />
            </div>
          }
        >
          <SliderRow label="Fed rate (US)" value={us} display={`${us.toFixed(2)}%`} min={0} max={6} step={0.25} onChange={setUs} disabled={review} />
          <SliderRow label="Bank of Japan rate" value={jp} display={`${jp.toFixed(2)}%`} min={0} max={3} step={0.25} onChange={setJp} disabled={review} />
        </Calculator>
      </div>
      <div className="flex flex-col gap-2 rounded-[8px] bg-white/10 p-4">
        <p className="text-[12px] text-white/50">USD/JPY: simulated drift from the rate gap</p>
        <svg viewBox="0 0 640 200" className="w-full lg:aspect-[4/3]" preserveAspectRatio="none" aria-hidden>
          <polyline
            points={series.map((v, i) => `${10 + i * 10.4},${190 - ((v - lo) / (hi - lo)) * 175}`).join(" ")}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 8. Real yields vs. gold (Video 08)

export function RealYieldGold({ phase, onReady, autoAnswer }: ExerciseProps) {
  const [nominal, setNominal] = useState(4.5)
  const [inflation, setInflation] = useState(4)
  const [raw, setRaw] = useState("")
  const review = phase === "review"
  const real = nominal - inflation
  const bondShare = Math.min(0.9, Math.max(0.1, 0.5 + real * 0.14))
  useNumberQuestion(
    raw,
    3,
    0.01,
    "5% − 2% = a 3% real yield. That's a solid, safe inflation hedge, so money prefers bonds and gold tends to suffer. When real yields fall, gold shines.",
    "3%",
    onReady,
  )
  useAutoAnswer(autoAnswer, (v) => setRaw(v === "correct" ? "3" : "7"))
  useSolvedOnReview(review, () => {
    setNominal(5)
    setInflation(2)
  })
  const goldView =
    real >= 2 ? "Bonds win, gold under pressure" : real >= 0 ? "Close call, gold steady" : "Negative real yields, gold's strongest setup"

  return (
    <div className="flex flex-col gap-4">
      <QuestionBox
        id="ry-q"
        question="A bond yields 5% and inflation is 2%. What's the real yield?"
        value={raw}
        onChange={setRaw}
        disabled={review}
        after="%"
      />
      <Calculator
        hint="Set the bond yield and inflation from the question, then read the real yield."
        results={
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Bond yield" value={`${nominal.toFixed(1)}%`} />
              <Stat label="Inflation" value={`${inflation.toFixed(1)}%`} />
              <Stat label="Real yield" value={`${real > 0 ? "+" : ""}${real.toFixed(1)}%`} tone={real >= 0 ? "up" : "down"} />
            </div>
            <div className="flex flex-col gap-3 rounded-[8px] bg-white/10 p-4">
              <p className="text-[12px] text-white/50">Where inflation-hedge money goes</p>
              <div className="flex h-10 overflow-hidden rounded-[4px] text-[13px] font-semibold">
                <div
                  className="flex items-center justify-center bg-brand text-black transition-[width] duration-500"
                  style={{ width: `${bondShare * 100}%` }}
                >
                  Bonds {Math.round(bondShare * 100)}%
                </div>
                <div
                  className="flex items-center justify-center bg-gold text-black transition-[width] duration-500"
                  style={{ width: `${(1 - bondShare) * 100}%` }}
                >
                  Gold {Math.round((1 - bondShare) * 100)}%
                </div>
              </div>
              <p className="text-[14px] text-white/70">{goldView}</p>
            </div>
          </>
        }
      >
        <SliderRow label="Bond yield (nominal)" value={nominal} display={`${nominal.toFixed(1)}%`} min={0} max={8} step={0.5} onChange={setNominal} disabled={review} />
        <SliderRow label="Inflation" value={inflation} display={`${inflation.toFixed(1)}%`} min={0} max={8} step={0.5} onChange={setInflation} disabled={review} />
      </Calculator>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 9. Volume profile: find the point of control (Video 10)

function profileScenario() {
  const cs = fromAnchors(
    [
      [0, 101],
      [6, 99.6],
      [12, 101.6],
      [18, 100.2],
      [22, 101],
      [30, 106.5],
      [36, 105.2],
      [42, 106.8],
      [48, 105.4],
      [54, 106.6],
      [60, 105.8],
      [66, 106.4],
    ],
    { seed: 91, noise: 0.35, wick: 0.35 },
  )
  const r = rng(92)
  const vol = cs.map((_, i) => (i > 22 && i < 30 ? 0.35 : 1) * (0.6 + r()))
  const lo = Math.floor(Math.min(...cs.map((c) => c.l)) * 2) / 2
  const hi = Math.ceil(Math.max(...cs.map((c) => c.h)) * 2) / 2
  const bins = Array.from({ length: Math.round((hi - lo) / 0.5) }, (_, k) => ({ lo: lo + k * 0.5, v: 0 }))
  cs.forEach((c, i) => {
    const hit = bins.filter((b) => b.lo + 0.5 > c.l && b.lo < c.h)
    hit.forEach((b) => (b.v += vol[i] / hit.length))
  })
  const poc = bins.reduce((m, b, k) => (b.v > bins[m].v ? k : m), 0)
  // Value area: grow from the POC until 70% of the volume is inside.
  const total = bins.reduce((n, b) => n + b.v, 0)
  let a = poc
  let z = poc
  let inside = bins[poc].v
  while (inside < total * 0.7) {
    const up = z + 1 < bins.length ? bins[z + 1].v : -1
    const dn = a - 1 >= 0 ? bins[a - 1].v : -1
    if (up >= dn) inside += bins[++z].v
    else inside += bins[--a].v
  }
  return { candles: cs, bins, poc, va: [a, z] as const }
}

export function VolumeProfileTap({ phase, onReady }: ExerciseProps) {
  const { candles, bins, poc, va } = useMemo(() => profileScenario(), [])
  const [pick, setPick] = useState<number | null>(null)
  const review = phase === "review"
  const maxV = Math.max(...bins.map((b) => b.v))

  useEffect(() => {
    if (pick === null) return onReady(null)
    onReady(() =>
      Math.abs(pick - poc) <= 1
        ? {
            correct: true,
            detail:
              "The point of control is the price where the most money changed hands. The shaded value area holds 70% of the volume, and the thin zone between the two balances is a low-volume node.",
          }
        : {
            correct: false,
            detail:
              "The POC is the single longest bar: where most trading happened. Price spent the most time there, in balance.",
          },
    )
  }, [pick, poc, onReady])

  return (
    <div className="space-y-3">
      <ChartFrame>
        <CandleChart
          candles={candles}
          domain={[bins[0].lo - 0.3, bins[bins.length - 1].lo + 0.8]}
          under={(s) =>
            review && (
              <rect
                x={s.left}
                width={s.right - s.left}
                y={s.y(bins[va[1]].lo + 0.5)}
                height={s.y(bins[va[0]].lo) - s.y(bins[va[1]].lo + 0.5)}
                className="fill-brand/10"
              />
            )
          }
        >
          {(s) => (
            <g>
              {bins.map((b, k) => {
                const w = (b.v / maxV) * 200
                const y0 = s.y(b.lo + 0.5)
                const h = s.y(b.lo) - y0 - 1
                const isPoc = k === poc
                return (
                  <g key={k} onClick={() => !review && setPick(k)} className={review ? "" : "cursor-pointer"}>
                    <rect x={s.right - 200} y={y0} width={200} height={h + 1} fill="transparent" />
                    <rect
                      x={s.right - w}
                      y={y0}
                      width={w}
                      height={Math.max(1, h)}
                      rx={1}
                      fill={
                        review && isPoc
                          ? "var(--gold)"
                          : pick === k
                            ? review
                              ? "var(--down)"
                              : "var(--brand)"
                            : "rgb(255 255 255 / 0.32)"
                      }
                    />
                  </g>
                )
              })}
              {review && (
                <>
                  <line
                    x1={s.left}
                    x2={s.right}
                    y1={s.y(bins[poc].lo + 0.25)}
                    y2={s.y(bins[poc].lo + 0.25)}
                    stroke="var(--gold)"
                    strokeDasharray="5 4"
                  />
                  <text x={s.left + 4} y={s.y(bins[poc].lo + 0.25) - 6} className="fill-gold text-[11px] font-semibold">
                    POC
                  </text>
                  <text x={s.left + 4} y={s.y(bins[va[1]].lo + 0.5) - 4} className="fill-brand text-[11px] font-semibold">
                    VAH
                  </text>
                  <text x={s.left + 4} y={s.y(bins[va[0]].lo) + 13} className="fill-brand text-[11px] font-semibold">
                    VAL
                  </text>
                </>
              )}
            </g>
          )}
        </CandleChart>
      </ChartFrame>
      <p className="px-1 text-[13px] text-white/50">
        The bars on the right are the volume profile: how much traded at each price. Tap one.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 10. Opening range breakout (Video 12)

function orbScenario() {
  const c = (o: number, h: number, l: number, cl: number): Candle => ({ o, h, l, c: cl })
  // First 6 five-minute candles = the 30-minute opening range (100 → 103).
  const range: Candle[] = [
    c(101.2, 102.4, 100.6, 102.1),
    c(102.1, 103.0, 101.5, 101.8),
    c(101.8, 102.0, 100.0, 100.4),
    c(100.4, 101.6, 100.2, 101.4),
    c(101.4, 102.6, 101.0, 102.3),
    c(102.3, 102.8, 101.6, 102.0),
  ]
  const after: Candle[] = [
    c(102.0, 102.7, 101.4, 102.5),
    c(102.5, 103.5, 102.2, 102.7), // wick above, closes inside
    c(102.7, 102.9, 101.9, 102.2),
    c(102.2, 102.8, 101.8, 102.6),
    c(102.6, 103.4, 102.3, 102.8), // wick above again, closes inside
    c(102.8, 103.9, 102.6, 103.8), // ← first close above 103: breakout
  ]
  const breakout = range.length + after.length - 1
  const rest = fromAnchors(
    [
      [0, 103.8],
      [3, 104.6],
      [5, 104.0],
      [12, 108.2],
      [15, 107.6],
      [22, 113],
    ],
    { seed: 120, noise: 0.35, wick: 0.3, floor: 103.2 },
  ).slice(1)
  rest[0].o = 103.8
  const candles = [...range, ...after, ...rest]
  const r = rng(121)
  const volume = candles.map((_, i) =>
    i < 6 ? 1.1 + r() * 0.5 : i === breakout ? 2.6 : i > breakout && i < breakout + 4 ? 1.4 + r() * 0.4 : 0.5 + r() * 0.4,
  )
  return { candles, volume, breakout, orHigh: 103, orLow: 100 }
}

export function OrbBreakout({ phase, onReady }: ExerciseProps) {
  const { candles, volume, breakout, orHigh, orLow } = useMemo(() => orbScenario(), [])
  const [pick, setPick] = useState<number | null>(null)
  const review = phase === "review"
  const visible = breakout + 3
  const shown = useReveal(review, visible, candles.length, 70)
  const entry = candles[breakout].c
  const stop = orLow
  const target = entry + 2 * (entry - stop)
  const maxVol = Math.max(...volume)

  useEffect(() => {
    if (pick === null) return onReady(null)
    onReady(() =>
      pick === breakout
        ? {
            correct: true,
            detail: `First 5-minute close above the opening range, on a volume spike. Entry ${entry.toFixed(1)}, stop below the range at ${stop}, target at 1:2 = ${target.toFixed(1)}.`,
          }
        : pick < 6
          ? { correct: false, detail: "Those candles are the opening range itself. Wait for the first 30 minutes to finish." }
          : candles[pick].h > orHigh && candles[pick].c <= orHigh
            ? {
                correct: false,
                detail: "That candle wicked above the range but closed back inside. The rule needs a candle that closes above the high.",
              }
            : { correct: false, detail: "Look for the first candle whose close is above the opening-range high, with volume picking up." },
    )
  }, [pick, breakout, candles, orHigh, entry, stop, target, onReady])

  const highlight: Record<number, "correct" | "wrong" | "selected"> = {}
  if (pick !== null) highlight[pick] = review ? (pick === breakout ? "correct" : "wrong") : "selected"
  if (review) highlight[breakout] = "correct"

  return (
    <div className="space-y-3">
      <ChartFrame>
        <CandleChart
          candles={candles}
          visible={shown}
          height={360}
          // Zoomed in while answering (so wicks vs. closes are readable), zoomed out for the replay.
          domain={review ? [96.5, 114.5] : [98.5, 105.5]}
          highlight={highlight}
          onCandleClick={review ? undefined : (i) => i < visible && setPick(i)}
          under={(s) => (
            <>
              <rect
                x={s.x(0) - s.bw}
                width={s.x(5) - s.x(0) + s.bw * 2}
                y={s.y(orHigh)}
                height={s.y(orLow) - s.y(orHigh)}
                className="fill-white/[0.06]"
              />
              <text x={s.x(0) - s.bw} y={s.y(orHigh) - 6} className="fill-white/50 text-[10px] uppercase">
                30-min range
              </text>
              {[orHigh, orLow].map((p) => (
                <line key={p} x1={s.left} x2={s.right} y1={s.y(p)} y2={s.y(p)} stroke="var(--brand)" strokeDasharray="4 4" opacity={0.6} />
              ))}
              {volume.slice(0, shown).map((v, i) => (
                <rect
                  key={i}
                  x={s.x(i) - s.bw / 2}
                  width={s.bw}
                  y={s.bottom - (v / maxVol) * 40}
                  height={(v / maxVol) * 40}
                  className={i === breakout && review ? "fill-gold/70" : "fill-white/15"}
                />
              ))}
            </>
          )}
        >
          {(s) =>
            review && (
              <g>
                {[
                  { p: target, label: `Target ${target.toFixed(1)}`, c: "var(--up)" },
                  { p: entry, label: `Entry ${entry.toFixed(1)}`, c: "#fff" },
                  { p: stop, label: `Stop ${stop}`, c: "var(--down)" },
                ].map((l) => (
                  <g key={l.label}>
                    <line x1={s.x(breakout)} x2={s.right} y1={s.y(l.p)} y2={s.y(l.p)} stroke={l.c} strokeWidth={1.5} />
                    <text x={s.x(breakout) + 4} y={s.y(l.p) - 5} fill={l.c} className="text-[11px] font-semibold">
                      {l.label}
                    </text>
                  </g>
                ))}
              </g>
            )
          }
        </CandleChart>
      </ChartFrame>
      <p className="px-1 text-[13px] text-white/50">NQ, 5-minute candles. The bars at the bottom are volume. Tap a candle.</p>
    </div>
  )
}
