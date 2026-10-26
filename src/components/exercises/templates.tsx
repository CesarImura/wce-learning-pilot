"use client"

// Content-driven exercise templates. Course data passes everything through
// `step.props`, so new lessons (e.g. generated from transcripts) need no new code.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react"
import { ArrowDownRight, ArrowUpRight, Check, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { parseAnswer, seededShuffle, useAutoAnswer, WatchThumb, type ExerciseProps } from "./shared"

// ---------------------------------------------------------------------------
// Concept (learn step)

export type ConceptProps = {
  body: string[]
  points?: { title: string; text: string }[]
  quote?: string
  mentor?: { name: string; photo: string }
}

// Layout from the refined lesson design (Figma 10581:24714): title + body, the mentor's
// quote beside the video moment, then the key points as numbered cards.
export function Concept({ body, points, quote, mentor, title, onWatch }: ExerciseProps & ConceptProps) {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 text-white">
        {title && <h1 className="text-[26px] leading-[34px] tracking-[-0.6px] text-balance md:text-[32px] md:leading-10">{title}</h1>}
        <div className="flex flex-col gap-6 text-[16px] leading-6 text-pretty opacity-70">
          {body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>
      {quote && (
        <figure className="flex flex-col gap-4 rounded-[8px] bg-white/10 p-2 sm:flex-row sm:items-stretch">
          <WatchThumb onClick={onWatch} className="w-full sm:w-[264px]" />
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 px-2 pb-2 sm:px-0 sm:py-4">
            <blockquote className="font-serif text-[20px] leading-6 tracking-[-0.6px] text-white/94 italic">{quote}</blockquote>
            {mentor && <figcaption className="text-[16px] leading-6 text-white opacity-70">{mentor.name}</figcaption>}
          </div>
        </figure>
      )}
      {points && (
        // Columns follow the count so the cards always fill the row: 2 → 2, 4 → 2×2, 3 / 5 / 6 → 3.
        <ol
          className="grid gap-2 sm:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
          style={{ "--cols": points.length === 4 ? 2 : Math.min(points.length, 3) } as CSSProperties}
        >
          {points.map((pt, i) => (
            <li key={pt.title} className="flex flex-col gap-4 rounded-[8px] bg-white/10 p-4">
              <span className="w-8 text-center text-[16px] leading-5 font-medium text-brand">{i + 1}º</span>
              <div className="flex flex-col gap-1 text-[16px]">
                <p className="leading-5 font-medium text-white">{pt.title}</p>
                <p className="leading-6 text-[#cfcfcf] opacity-70">{pt.text}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Classify: tap an item, then tap the bucket it belongs to

export type ClassifyProps = {
  buckets: { id: string; label: string; hint?: string }[]
  items: { label: string; bucket: string }[]
  explain: string
}

export function Classify({ buckets, items, explain, phase, onReady, autoAnswer }: ExerciseProps & ClassifyProps) {
  const order = useMemo(() => seededShuffle(items, items.map((i) => i.label).join()), [items])
  const [placed, setPlaced] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(order[0]?.label ?? null)
  // Preview: every item in its bucket, or every item in the first bucket.
  useAutoAnswer(autoAnswer, (v) => {
    setPlaced(Object.fromEntries(items.map((i) => [i.label, v === "correct" ? i.bucket : buckets[0].id])))
    setSelected(null)
  })
  const review = phase === "review"
  const pool = order.filter((i) => !placed[i.label])
  const correctOf = (label: string) => items.find((i) => i.label === label)!.bucket

  useEffect(() => {
    if (pool.length > 0) return onReady(null)
    onReady(() => {
      const wrong = items.filter((i) => placed[i.label] !== i.bucket)
      return wrong.length === 0
        ? { correct: true, detail: explain }
        : {
            correct: false,
            detail: `${wrong.length} of ${items.length} in the wrong place. ${explain}`,
          }
    })
  }, [placed, pool.length, items, explain, onReady])

  function place(bucket: string) {
    if (review || !selected) return
    const next = { ...placed, [selected]: bucket }
    setPlaced(next)
    setSelected(order.find((i) => !next[i.label])?.label ?? null)
  }

  return (
    <div className="space-y-4">
      <div
        // Lock the pool at its starting height so the buckets don't jump as it empties.
        ref={(el) => {
          if (el && !el.style.minHeight) el.style.minHeight = `${el.offsetHeight}px`
        }}
        className="min-h-[52px] rounded-lg border border-dashed border-white/15 p-2"
      >
        {pool.length ? (
          <div className="flex flex-wrap gap-2">
            {pool.map((i) => (
              <button
                key={i.label}
                onClick={() => setSelected(i.label)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-[14px] transition-all",
                  selected === i.label
                    ? "border-brand bg-brand/15 text-white shadow-[0_0_0_3px_rgba(106,190,242,0.15)]"
                    : "border-white/15 bg-white/[0.04] text-white/80 hover:border-white/30",
                )}
              >
                {i.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="px-1 py-2 text-[13px] text-white/40">
            {review ? "Results below." : "All placed. Tap an item in a bucket to move it back."}
          </p>
        )}
      </div>
      <p className="px-1 text-[13px] text-white/45">
        {selected && !review ? (
          <>
            Where does <span className="text-white/80">“{selected}”</span> go? Tap a bucket.
          </>
        ) : (
          "Tap an item, then the bucket it belongs to."
        )}
      </p>
      <div className={cn("grid gap-3", buckets.length === 2 ? "sm:grid-cols-2" : buckets.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
        {buckets.map((b) => {
          const inside = order.filter((i) => placed[i.label] === b.id)
          return (
            <div
              key={b.id}
              role="button"
              tabIndex={0}
              onClick={() => place(b.id)}
              onKeyDown={(e) => e.key === "Enter" && place(b.id)}
              className={cn(
                "glass min-h-[76px] rounded-[8px] p-3 text-left transition-colors sm:min-h-[120px]",
                !review && selected && "cursor-pointer hover:border-brand/50 hover:bg-white/[0.07]",
              )}
            >
              <p className="text-[15px] font-semibold text-white">{b.label}</p>
              {b.hint && <p className="text-[12px] text-white/45">{b.hint}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {inside.map((i) => {
                  const ok = correctOf(i.label) === b.id
                  return (
                    <button
                      key={i.label}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (review) return
                        const next = { ...placed }
                        delete next[i.label]
                        setPlaced(next)
                        setSelected(i.label)
                      }}
                      className={cn(
                        "flex items-center gap-1 rounded-md border px-2 py-1 text-left text-[13px]",
                        !review && "border-white/15 bg-white/[0.06] text-white/85",
                        review && ok && "border-up/50 bg-up/10 text-white",
                        review && !ok && "border-down/50 bg-down/10 text-white",
                      )}
                    >
                      {review && (ok ? <Check className="size-3.5 text-up" /> : <X className="size-3.5 text-down" />)}
                      {i.label}
                      {review && !ok && (
                        <span className="text-white/50">→ {buckets.find((x) => x.id === correctOf(i.label))?.label}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Order: arrange items into the right sequence

export type OrderProps = {
  /** Items in the correct order (top → bottom). */
  items: string[]
  topLabel: string
  bottomLabel: string
  explain: string
}

export function OrderItems({ items, topLabel, bottomLabel, explain, phase, verdict, onReady, autoAnswer }: ExerciseProps & OrderProps) {
  const initial = useMemo(() => {
    let sh = seededShuffle(items, items.join())
    if (sh.every((x, i) => x === items[i])) sh = [...sh.slice(1), sh[0]]
    return sh
  }, [items])
  const [list, setList] = useState(initial)
  useAutoAnswer(autoAnswer, (v) => setList(v === "correct" ? items : initial))
  const review = phase === "review"

  useEffect(() => {
    onReady(() => {
      const wrong = list.filter((x, i) => x !== items[i]).length
      return wrong === 0
        ? { correct: true, detail: explain }
        : {
            correct: false,
            answer: items.join(" → "),
            detail: `${wrong} item${wrong > 1 ? "s are" : " is"} out of place. ${explain}`,
          }
    })
  }, [list, items, explain, onReady])

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (review || j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    setList(next)
  }

  // Drag and drop with pointer events, so it works with mouse and touch. The arrow
  // buttons stay for keyboard users. While dragging, the other rows slide out of the way.
  const rows = useRef<(HTMLLIElement | null)[]>([])
  const start = useRef<{ y: number; from: number; step: number; zoom: number } | null>(null)
  const [drag, setDrag] = useState<{ from: number; to: number; dy: number; step: number } | null>(null)

  function onRowDown(e: ReactPointerEvent<HTMLLIElement>, i: number) {
    if (review || (e.target as HTMLElement).closest("button")) return
    if (e.pointerType === "mouse" && e.button !== 0) return
    const el = rows.current[i]
    const near = rows.current[i + 1] ?? rows.current[i - 1]
    if (!el) return
    // The lesson player may zoom the question to fit the screen; pointer maths runs in screen pixels.
    const zoom = el.getBoundingClientRect().height / el.offsetHeight || 1
    const step = near ? Math.abs(near.getBoundingClientRect().top - el.getBoundingClientRect().top) / zoom : el.offsetHeight + 8
    // Capture keeps the drag alive when the pointer leaves the row; synthetic events have no pointer to capture.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    start.current = { y: e.clientY, from: i, step, zoom }
    setDrag({ from: i, to: i, dy: 0, step })
  }
  function onRowMove(e: ReactPointerEvent<HTMLLIElement>) {
    const s = start.current
    if (!s) return
    const dy = Math.max(-s.from * s.step, Math.min((list.length - 1 - s.from) * s.step, (e.clientY - s.y) / s.zoom))
    setDrag({ from: s.from, to: s.from + Math.round(dy / s.step), dy, step: s.step })
  }
  function onRowUp() {
    const d = drag
    start.current = null
    setDrag(null)
    if (!d || d.to === d.from) return
    const next = [...list]
    const [it] = next.splice(d.from, 1)
    next.splice(d.to, 0, it)
    setList(next)
  }
  const shift = (k: number) => {
    if (!drag || k === drag.from) return 0
    if (drag.from < drag.to && k > drag.from && k <= drag.to) return -drag.step
    if (drag.from > drag.to && k >= drag.to && k < drag.from) return drag.step
    return 0
  }

  // Rows from the lesson design (Figma 10596:52383): on review each row shows whether it landed in place.
  const tint = (ok: boolean) => {
    const c = ok ? "rgba(63,207,142,0.04)" : "rgba(242,84,91,0.04)"
    return `linear-gradient(${c}, ${c})`
  }
  // 32px visible, 40px to hit (the pseudo-element), pressed at 0.96.
  const arrow =
    "relative grid size-8 place-items-center rounded-[6px] bg-white/15 p-2 transition-[scale,background-color] duration-150 before:absolute before:-inset-1 enabled:hover:bg-white/20 enabled:active:scale-[0.96] disabled:opacity-30"
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-start justify-end gap-2 text-[12px] leading-4 text-[#9e9e9e]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/wce/lesson/chevron-up-label.svg" alt="" width={16} height={16} />
        {topLabel}
      </p>
      <ol className="flex flex-col gap-2">
        {list.map((item, i) => {
          const dragging = drag?.from === i
          return (
          <li
            key={item}
            ref={(el) => {
              rows.current[i] = el
            }}
            onPointerDown={(e) => onRowDown(e, i)}
            onPointerMove={onRowMove}
            onPointerUp={onRowUp}
            onPointerCancel={onRowUp}
            className={cn(
              "relative flex items-center gap-4 rounded-[8px] border border-transparent bg-white/10 p-4 select-none",
              verdict && (item === items[i] ? "border-[#0d3523]" : "border-[#3d0507]"),
              !review && "cursor-grab touch-none",
              dragging
                ? "z-10 cursor-grabbing shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)]"
                : "transition-[translate,background-color] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
            )}
            style={{
              ...(verdict ? { backgroundImage: tint(item === items[i]) } : {}),
              translate: `0 ${dragging ? drag!.dy : shift(i)}px`,
              scale: dragging ? "1.02" : undefined,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wce/lesson/draggable.svg" alt="" width={16} height={16} className="shrink-0" />
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="w-8 shrink-0 text-center text-[16px] leading-5 font-medium text-[#9e9e9e] tabular-nums">{i + 1}º</span>
              <span className="text-[16px] leading-5 font-medium text-white">{item}</span>
            </span>
            <span className={cn("flex shrink-0 gap-2", review && "pointer-events-none")}>
              <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className={arrow}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/wce/lesson/chevron-up.svg" alt="" width={16} height={16} />
              </button>
              <button aria-label="Move down" disabled={i === list.length - 1} onClick={() => move(i, 1)} className={arrow}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/wce/lesson/chevron-down.svg" alt="" width={16} height={16} />
              </button>
            </span>
          </li>
          )
        })}
      </ol>
      <p className="flex items-start justify-end gap-2 text-[12px] leading-4 text-[#9e9e9e]">
        {bottomLabel}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/wce/lesson/chevron-down-label.svg" alt="" width={16} height={16} />
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Directions: predict up / down for each row

export type DirectionsProps = {
  context?: string
  rows: { label: string; answer: "up" | "down"; why: string }[]
  upLabel?: string
  downLabel?: string
  explain: string
}

export function Directions({
  context,
  rows,
  upLabel = "Up",
  downLabel = "Down",
  explain,
  phase,
  onReady,
  autoAnswer,
}: ExerciseProps & DirectionsProps) {
  const [picks, setPicks] = useState<Record<number, "up" | "down">>({})
  useAutoAnswer(autoAnswer, (v) =>
    setPicks(Object.fromEntries(rows.map((row, i) => [i, v === "correct" ? row.answer : row.answer === "up" ? "down" : "up"]))),
  )
  const review = phase === "review"

  useEffect(() => {
    if (Object.keys(picks).length < rows.length) return onReady(null)
    onReady(() => {
      const wrong = rows.filter((r, i) => picks[i] !== r.answer).length
      return wrong === 0
        ? { correct: true, detail: explain }
        : { correct: false, detail: `${wrong} of ${rows.length} wrong. ${explain}` }
    })
  }, [picks, rows, explain, onReady])

  return (
    <div className="space-y-3">
      {context && (
        <div className="rounded-lg border border-brand/30 bg-brand/[0.07] px-4 py-3 text-[15px] text-brand-pale">{context}</div>
      )}
      {rows.map((r, i) => {
        const pick = picks[i]
        const ok = pick === r.answer
        return (
          <div
            key={r.label}
            className={cn(
              "rounded-lg border bg-white/[0.04] p-3 transition-colors",
              !review && "border-white/10",
              review && ok && "border-up/50 bg-up/[0.07]",
              review && !ok && "border-down/50 bg-down/[0.07]",
            )}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1 text-[15px] text-white/90">{r.label}</span>
              <div className="flex gap-1.5">
                {(["up", "down"] as const).map((d) => (
                  <button
                    key={d}
                    disabled={review}
                    onClick={() => setPicks((p) => ({ ...p, [i]: d }))}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-md border px-3 text-[14px] font-medium transition-all",
                      pick === d
                        ? d === "up"
                          ? "border-up bg-up/20 text-up"
                          : "border-down bg-down/20 text-down"
                        : "border-white/10 bg-white/5 text-white/60 hover:text-white",
                      review && r.answer === d && pick !== d && "border-dashed border-white/40 text-white",
                    )}
                  >
                    {d === "up" ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                    {d === "up" ? upLabel : downLabel}
                  </button>
                ))}
              </div>
            </div>
            {review && <p className="mt-2 text-[13px] text-white/60">{r.why}</p>}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Number: type a numeric answer (optionally with givens or a W/L sequence)

export type NumberProps = {
  question: string
  answer: number
  tolerance?: number
  unit?: string
  unitBefore?: boolean
  given?: { label: string; value: string }[]
  sequence?: { label: string; tone: "up" | "down" }[]
  correct: string
  hint: string
}

export function NumberAnswer({
  question,
  answer,
  tolerance = 0.01,
  unit,
  unitBefore,
  given,
  sequence,
  correct,
  phase,
  onReady,
  autoAnswer,
}: ExerciseProps & NumberProps) {
  const [raw, setRaw] = useState("")
  useAutoAnswer(autoAnswer, (v) => setRaw(String(v === "correct" ? answer : Math.round((answer * 1.5 + 1) * 100) / 100)))
  const review = phase === "review"

  useEffect(() => {
    const n = parseAnswer(raw)
    if (n === null) return onReady(null)
    // A wrong answer shows the right value and the worked explanation, not just a hint.
    const shown = `${unit && unitBefore ? unit : ""}${answer.toLocaleString("en-US", { maximumFractionDigits: 2 })}${unit && !unitBefore ? unit : ""}`
    onReady(() =>
      Math.abs(n - answer) <= Math.max(tolerance, Math.abs(answer) * 0.001)
        ? { correct: true, detail: correct }
        : { correct: false, answer: shown, detail: correct },
    )
  }, [raw, answer, tolerance, unit, unitBefore, correct, onReady])

  return (
    <div className="space-y-4">
      {given && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {given.map((g) => (
            <div key={g.label} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
              <p className="text-[11px] font-medium tracking-wide text-white/45 uppercase">{g.label}</p>
              <p className="text-[18px] font-semibold tabular-nums">{g.value}</p>
            </div>
          ))}
        </div>
      )}
      {sequence && (
        <div className="glass rounded-[8px] p-3">
          <div className="flex flex-wrap gap-1.5">
            {sequence.map((t, i) => (
              <span
                key={i}
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-md text-[13px] font-semibold tabular-nums",
                  t.tone === "up" ? "bg-up/15 text-up" : "bg-down/15 text-down",
                )}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2 rounded-lg border-2 border-dashed border-white/15 p-4">
        <Label htmlFor="num-answer" className="text-[15px] leading-snug text-white/85">
          {question}
        </Label>
        <div className="flex items-center gap-2">
          {unit && unitBefore && <span className="text-white/50">{unit}</span>}
          <Input
            id="num-answer"
            // The iOS decimal keypad has no minus key, so negative answers get the full keyboard.
            inputMode={answer < 0 ? "text" : "decimal"}
            autoComplete="off"
            placeholder="Your answer"
            value={raw}
            disabled={review}
            onChange={(e) => setRaw(e.target.value)}
            className="h-11 max-w-40 text-lg"
          />
          {unit && !unitBefore && <span className="text-white/50">{unit}</span>}
        </div>
      </div>
    </div>
  )
}
