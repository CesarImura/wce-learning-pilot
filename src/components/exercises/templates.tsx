"use client"

// Content-driven exercise templates. Course data passes everything through
// `step.props`, so new lessons (e.g. generated from transcripts) need no new code.

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, Check, Quote, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { parseAnswer, seededShuffle, type ExerciseProps } from "./shared"

// ---------------------------------------------------------------------------
// Concept (learn step)

export type ConceptProps = {
  body: string[]
  points?: { title: string; text: string }[]
  quote?: string
  mentor?: { name: string; photo: string }
}

export function Concept({ body, points, quote, mentor }: ExerciseProps & ConceptProps) {
  return (
    <div className="space-y-5">
      {quote && (
        <figure className="glass flex gap-4 p-4">
          {mentor ? (
            <Image
              src={mentor.photo}
              alt={mentor.name}
              width={48}
              height={48}
              className="size-12 shrink-0 rounded-[8px] border border-brand/40 object-cover"
            />
          ) : (
            <Quote className="size-6 shrink-0 text-brand-soft" />
          )}
          <div>
            <blockquote className="font-serif text-[20px] leading-snug text-white/90 italic">“{quote}”</blockquote>
            {mentor && <figcaption className="mt-1.5 text-[13px] text-white/50">{mentor.name}</figcaption>}
          </div>
        </figure>
      )}
      <div className="space-y-3 text-[16px] leading-relaxed text-white/75">
        {body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      {points && (
        <ol className="grid gap-2 sm:grid-cols-2">
          {points.map((pt, i) => (
            <li key={pt.title} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand/15 text-[12px] font-semibold text-brand-pale">
                {i + 1}
              </span>
              <div>
                <p className="text-[15px] font-medium text-white">{pt.title}</p>
                <p className="text-[14px] text-white/60">{pt.text}</p>
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

export function Classify({ buckets, items, explain, phase, onReady }: ExerciseProps & ClassifyProps) {
  const order = useMemo(() => seededShuffle(items, items.map((i) => i.label).join()), [items])
  const [placed, setPlaced] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(order[0]?.label ?? null)
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
                "glass min-h-[76px] p-3 text-left transition-colors sm:min-h-[120px]",
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

export function OrderItems({ items, topLabel, bottomLabel, explain, phase, onReady }: ExerciseProps & OrderProps) {
  const initial = useMemo(() => {
    let sh = seededShuffle(items, items.join())
    if (sh.every((x, i) => x === items[i])) sh = [...sh.slice(1), sh[0]]
    return sh
  }, [items])
  const [list, setList] = useState(initial)
  const review = phase === "review"

  useEffect(() => {
    onReady(() => {
      const wrong = list.filter((x, i) => x !== items[i]).length
      return wrong === 0
        ? { correct: true, detail: explain }
        : { correct: false, detail: `${wrong} item${wrong > 1 ? "s are" : " is"} out of place. ${explain}` }
    })
  }, [list, items, explain, onReady])

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    setList(next)
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 px-1 text-[12px] tracking-wide text-white/45 uppercase">
        <ArrowUp className="size-3.5" /> {topLabel}
      </p>
      <ol className="space-y-2">
        {list.map((item, i) => {
          const ok = item === items[i]
          return (
            <li
              key={item}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-white/[0.04] p-2 pl-3 transition-all duration-300",
                !review && "border-white/10",
                review && ok && "border-up/50 bg-up/10",
                review && !ok && "border-down/50 bg-down/10",
              )}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-[13px] font-semibold tabular-nums">
                {i + 1}
              </span>
              <span className="flex-1 text-[15px] text-white/90">{item}</span>
              {review ? (
                !ok && <span className="text-[12px] text-white/50">should be #{items.indexOf(item) + 1}</span>
              ) : (
                <span className="flex gap-1">
                  <button
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="grid size-9 place-items-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    aria-label="Move down"
                    disabled={i === list.length - 1}
                    onClick={() => move(i, 1)}
                    className="grid size-9 place-items-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <p className="flex items-center gap-1.5 px-1 text-[12px] tracking-wide text-white/45 uppercase">
        <ArrowDown className="size-3.5" /> {bottomLabel}
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
}: ExerciseProps & DirectionsProps) {
  const [picks, setPicks] = useState<Record<number, "up" | "down">>({})
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
  hint,
  phase,
  onReady,
}: ExerciseProps & NumberProps) {
  const [raw, setRaw] = useState("")
  const review = phase === "review"

  useEffect(() => {
    const n = parseAnswer(raw)
    if (n === null) return onReady(null)
    onReady(() =>
      Math.abs(n - answer) <= Math.max(tolerance, Math.abs(answer) * 0.001)
        ? { correct: true, detail: correct }
        : { correct: false, detail: hint },
    )
  }, [raw, answer, tolerance, correct, hint, onReady])

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
        <div className="glass p-3">
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
            inputMode="decimal"
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
