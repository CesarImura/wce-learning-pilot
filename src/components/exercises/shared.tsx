"use client"

import { useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type Feedback = { correct: boolean; title?: string; detail: string }

export type Phase = "answer" | "review"

/** Every exercise gets the phase and reports a checker once it has an answer. */
export type ExerciseProps = {
  phase: Phase
  onReady: (checker: (() => Feedback) | null) => void
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
    <div className={cn("rounded-lg border bg-card px-3 py-2", className)}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-lg font-semibold tabular-nums",
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
  const s = raw.trim().toLowerCase().replace(/[$€%\s]/g, "")
  const mult = s.endsWith("k") ? 1_000 : s.endsWith("m") ? 1_000_000 : 1
  const body = s.replace(/[km]$/, "")
  // "6,000" → thousands separator; "0,5" → decimal comma.
  const normalized = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(body) ? body.replace(/,/g, "") : body.replace(",", ".")
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
