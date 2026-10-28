"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/** `answer` is the right answer, shown when the learner gets it wrong; `visual` illustrates the reasoning in "Why?". */
export type Feedback = { correct: boolean; title?: string; detail: string; answer?: string; visual?: ReactNode }

export type Phase = "answer" | "review"

/** Every exercise gets the phase and reports a checker once it has an answer. */
export type ExerciseProps = {
  phase: Phase
  onReady: (checker: (() => Feedback) | null) => void
  /** Set in the review phase: tints the answer with the verdict. */
  verdict?: "correct" | "wrong"
  /** Opens the instructor's video moment for this step (concept screens). */
  onWatch?: () => void
  /** The step's prompt, for templates that lay out their own title (concept screens). */
  title?: string
  /** Prototype preview: fill in a right or wrong answer on mount (lesson player's Default / Wrong / Right switch). */
  autoAnswer?: "correct" | "wrong"
}

/** Applies a scripted answer once, on mount, when the lesson player asks for a preview state. */
export function useAutoAnswer(auto: ExerciseProps["autoAnswer"], apply: (verdict: "correct" | "wrong") => void) {
  const applied = useRef(false)
  useEffect(() => {
    if (!auto || applied.current) return
    applied.current = true
    apply(auto)
  }, [auto, apply])
}

/** Video thumbnail with the "Watch explanation" pill (lesson design, Figma 10581:24982). */
export function WatchThumb({ onClick, className }: { onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Watch the instructor explain this"
      className={cn(
        "group relative block h-[154px] shrink-0 overflow-hidden rounded-[6px] border border-white/15 transition-[scale] duration-150 active:scale-[0.96]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wce/lesson/video-thumb.jpg" alt="" className="absolute inset-0 size-full object-cover" />
      <span className="absolute inset-0 bg-black opacity-70 transition-opacity duration-150 group-hover:opacity-55" />
      {/* Centered with inset + margin so the pill sizes to its content instead of the half-width left after `left: 50%`. */}
      <span className="absolute inset-0 m-auto flex h-10 w-max items-center gap-3 rounded-[6px] border border-white/12 bg-white/24 py-2 pr-4 pl-3.5 whitespace-nowrap backdrop-blur-[2px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/wce/lesson/play.svg" alt="" width={17} height={16} className="translate-x-px" />
        <span className="text-[16px] leading-6 text-white">Watch explanation</span>
      </span>
    </button>
  )
}

/** Animates a candle count from `from` to `to` once `active` turns true. */
export function useReveal(active: boolean, from: number, to: number, ms = 80) {
  const [ticks, setTicks] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setTicks((t) => t + 1), ms)
    return () => clearInterval(id)
  }, [active, ms])
  return active ? Math.min(to, from + ticks) : from
}

export function ChartFrame({ children, className }: { children: ReactNode; className?: string }) {
  // on phones the frame bleeds into the page margin, so charts get every pixel of width
  return <div className={cn("-mx-2 rounded-lg border bg-card p-1.5 shadow-xs sm:mx-0 sm:p-3", className)}>{children}</div>
}

export function Stat({
  label,
  value,
  tone,
  className,
}: {
  label: string
  value: ReactNode
  tone?: "up" | "down" | "muted"
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-[8px] bg-white/10 px-3 py-2.5", className)}>
      <div className="text-[12px] leading-4 text-[#9e9e9e]">{label}</div>
      <div
        className={cn(
          "text-[18px] leading-6 font-semibold tabular-nums",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </div>
    </div>
  )
}

export function sliderValue(v: number | readonly number[]) {
  return Array.isArray(v) ? (v as number[])[0] : (v as number)
}

export const fmtUsd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d })

/** Parses typed answers like "6,000", "$6000", "6k", "33%" or "0,5". */
export function parseAnswer(raw: string) {
  // Typographic minus/dash count as a minus sign ("−1%", as the questions themselves write it).
  const s = raw.trim().toLowerCase().replace(/[$€%\s]/g, "").replace(/[−–]/g, "-")
  const mult = s.endsWith("k") ? 1_000 : s.endsWith("m") ? 1_000_000 : 1
  const body = s.replace(/[km]$/, "")
  // "6,000" → thousands separator; "0,5" → decimal comma.
  // "18.135" → dot thousands (European); always ≥ 1000, so "1.5", "0.25" and "2.94" stay decimals.
  const normalized = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(body)
    ? body.replace(/,/g, "")
    : /^-?\d{1,3}(\.\d{3})+$/.test(body)
      ? body.replace(/\./g, "")
      : body.replace(",", ".")
  const n = parseFloat(normalized.replace(/[^0-9.\-]/g, ""))
  return Number.isFinite(n) ? n * mult : null
}

/** Deterministic shuffle so a lesson always looks the same. */
export function seededShuffle<T>(items: T[], seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    const j = Math.abs(h) % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
