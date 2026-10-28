"use client"

// Delight moments: combo and halfway interstitials, toasts, the daily-streak screen,
// one-time "firsts" and an animated league progress bar. WCE-styled: gold, ore and
// chart motifs instead of cartoon mascots. Every full-screen moment can be tapped away.

import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import { Flame, Heart, Sparkles, Trophy } from "lucide-react"
import { LEAGUES, mondayNote, type League } from "@/lib/league"
import { cn } from "@/lib/utils"
import { OreArt } from "./league"

/** Animates a number from `from` to `to`. */
export function useCountUp(to: number, from = 0, ms = 900, delay = 0) {
  const [v, setV] = useState(from)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now() + delay
    const tick = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / ms))
      setV(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, from, ms, delay])
  return v
}

/** A burst of gold sparks around the centre of its parent. */
export function Sparks({ count = 22, spread = 160, className }: { count?: number; spread?: number; className?: string }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + (i % 3) * 0.3
        const d = spread * (0.55 + ((i * 37) % 10) / 22)
        return {
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          size: 3 + (i % 4),
          delay: (i % 5) * 40,
          gold: i % 3 !== 0,
        }
      }),
    [count, spread],
  )
  return (
    <div aria-hidden className={cn("pointer-events-none absolute top-1/2 left-1/2", className)}>
      {parts.map((p, i) => (
        <span
          key={i}
          className={cn("animate-spark absolute rounded-full", p.gold ? "bg-gold" : "bg-white")}
          style={
            {
              width: p.size,
              height: p.size,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--delay": `${p.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

/** Full-screen moment that dismisses itself (or on tap). */
export function Interstitial({ onDone, ms = 1900, children }: { onDone: () => void; ms?: number; children: ReactNode }) {
  useEffect(() => {
    const id = setTimeout(onDone, ms)
    return () => clearTimeout(id)
  }, [onDone, ms])
  return (
    <button
      onClick={onDone}
      aria-label="Continue"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      {children}
      <span className="absolute bottom-10 text-[12px] tracking-[0.2em] text-white/30 uppercase">Tap to continue</span>
    </button>
  )
}

/** "3 in a row": green candles rising, one per correct answer. */
export function ComboMoment({ combo, bonus, onDone }: { combo: number; bonus: number; onDone: () => void }) {
  const heights = [38, 52, 46, 68, 62, 84, 78, 100]
  return (
    <Interstitial onDone={onDone}>
      <div className="relative flex h-52 items-end gap-3">
        <Sparks count={26} spread={190} className="-translate-y-6" />
        {Array.from({ length: Math.min(combo, 8) }, (_, i) => (
          <div key={i} className="flex flex-col items-center" style={{ height: `${heights[i]}%` }}>
            <div className="w-[2px] flex-[0_0_14%] bg-up/70" />
            <div
              className="animate-candle w-7 flex-1 rounded-[3px] bg-up shadow-[0_0_20px_rgba(63,207,142,0.5)]"
              style={{ "--delay": `${i * 110}ms` } as CSSProperties}
            />
            <div className="w-[2px] flex-[0_0_10%] bg-up/70" />
          </div>
        ))}
      </div>
      <p
        className="animate-pop mt-8 font-serif text-[64px] leading-none text-white italic"
        style={{ "--delay": `${Math.min(combo, 8) * 110}ms` } as CSSProperties}
      >
        {combo} in a row
      </p>
      <p className="mt-3 text-[16px] text-white/60">You&apos;re on a roll. Keep the trend going.</p>
      <p className="mt-5 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-[15px] font-semibold text-gold">
        +{bonus} XP combo bonus
      </p>
    </Interstitial>
  )
}

/** Halfway through a unit test without losing a heart. */
export function HalfwayMoment({ hearts, onDone }: { hearts: number; onDone: () => void }) {
  return (
    <Interstitial onDone={onDone}>
      <div className="relative flex gap-3">
        <Sparks count={18} spread={150} />
        {Array.from({ length: hearts }, (_, i) => (
          <Heart
            key={i}
            className="animate-pop size-14 fill-down text-down drop-shadow-[0_0_18px_rgba(242,84,91,0.6)]"
            style={{ "--delay": `${i * 140}ms` } as CSSProperties}
          />
        ))}
      </div>
      <p className="mt-8 font-serif text-[52px] leading-none text-white italic">Halfway there</p>
      <p className="mt-3 text-[16px] text-white/60">Flawless so far. The +25 XP flawless bonus is within reach.</p>
    </Interstitial>
  )
}

/** Small non-blocking message above the footer. */
export function Toast({ children, onDone }: { children: ReactNode; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 1800)
    return () => clearTimeout(id)
  }, [onDone])
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center">
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-[#151719]/95 px-4 py-2 text-[14px] font-medium shadow-xl backdrop-blur animate-in fade-in slide-in-from-top-3 duration-300">
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// End-of-lesson screens

function EndScreen({ children, onContinue, cta = "Continue" }: { children: ReactNode; onContinue: () => void; cta?: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-8 px-6 text-center">
      {children}
      <button
        onClick={onContinue}
        className="h-12 w-full rounded-[5px] bg-white text-[15px] font-semibold tracking-[-0.02em] text-black hover:bg-white/85"
      >
        {cta}
      </button>
    </main>
  )
}

/**
 * Today's streak day catching fire, after Dayrise: the dashed "to do" ring closes, an ember
 * catches at the bottom, the flame grows out of it, then it keeps flickering and shedding sparks.
 * Timing lives in globals.css (.ignite-*), all offset by `delay`.
 */
export function IgniteDay({ size = 36, delay = 500 }: { size?: number; delay?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "")
  return (
    <span
      className="ignite relative grid shrink-0 place-items-center"
      style={{ width: size, height: size, "--delay": `${delay}ms` } as CSSProperties}
    >
      <span className="ignite-bg absolute inset-[2px] rounded-full" />
      <svg viewBox="0 0 40 40" className="absolute inset-0 overflow-visible" aria-hidden>
        <circle className="ignite-ring" cx="20" cy="20" r="18.5" fill="none" strokeWidth="2" pathLength={60} />
      </svg>
      <svg viewBox="0 0 24 24" className="relative size-[78%] translate-y-[4%] overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff4d2e" />
            <stop offset="1" stopColor="#ff9f43" />
          </linearGradient>
          <radialGradient id={`${id}c`} cx="0.5" cy="0.75" r="0.6">
            <stop offset="0" stopColor="#fff1c2" />
            <stop offset="0.55" stopColor="#ffcf6e" />
            <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="ignite-grow">
          <g className="ignite-flicker">
            <path
              fill={`url(#${id}f)`}
              d="M12 22C7.6 22 5 19 5 15.2c0-3.6 2.4-5.8 3.6-8 .4 1.6 1.2 2.6 2.2 3 -.2-3.6 1.6-6.6 4.4-8.2 -.4 2.6.8 4.6 2 6.4 1.2 1.8 1.8 4 1.8 6.8C19 19 16.4 22 12 22Z"
            />
            <path
              className="ignite-core"
              fill={`url(#${id}c)`}
              d="M12 21c-2.4 0-3.6-1.6-3.6-3.4 0-2 1.6-3.2 2.8-5 .4 1.4 1.4 2 2.2 2.2 0-.8.4-1.4.8-1.8 1 1.4 1.4 2.8 1.4 4.6C15.6 19.4 14.4 21 12 21Z"
            />
          </g>
        </g>
        <circle className="ignite-ember" cx="12" cy="20" r="1.8" fill="#ffd27a" />
        {[-3, 2, -1].map((dx, i) => (
          <circle
            key={i}
            className="ignite-spark"
            cx={14 + i * 0.6}
            cy="3.5"
            r="0.9"
            fill="#ffcf6e"
            style={{ "--i": i, "--dx": `${dx}px` } as CSSProperties}
          />
        ))}
      </svg>
    </span>
  )
}

/** Duolingo-style daily streak: flame, count-up and the week filling in. */
export function StreakScreen({
  streak,
  week,
  onContinue,
  ignite = false,
}: {
  streak: number
  week: { label: string; active: boolean; today: boolean }[]
  onContinue: () => void
  /** Today's day catches fire instead of popping in (v2). */
  ignite?: boolean
}) {
  const n = useCountUp(streak, Math.max(0, streak - 1), 700, 300)
  return (
    <EndScreen onContinue={onContinue}>
      <div className="relative">
        <Sparks count={24} spread={170} />
        <Flame className="animate-flicker size-28 fill-[#ff9f43] text-[#ffcf6e]" strokeWidth={1.2} />
      </div>
      <div className="space-y-1">
        <p className="text-[80px] leading-none font-semibold text-[#ffcf6e] tabular-nums">{n}</p>
        <p className="text-[20px] font-medium">day streak</p>
        <p className="text-[14px] text-white/55">
          {streak === 1 ? "Day one. Come back tomorrow to start a streak." : "You showed up again. Come back tomorrow to keep it alive."}
        </p>
      </div>
      <div className="glass flex w-full justify-between px-4 py-3">
        {week.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className={cn("text-[12px]", d.today ? "text-white" : "text-white/40")}>{d.label}</span>
            {ignite && d.today && d.active ? (
              <IgniteDay size={32} delay={600} />
            ) : (
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full",
                  d.active ? "bg-gradient-to-b from-[#ffcf6e] to-[#ff9f43] text-black" : "bg-white/[0.06]",
                  d.today && d.active && "animate-day-fill ring-2 ring-[#ffcf6e]/40",
                )}
                style={{ "--delay": "500ms" } as CSSProperties}
              >
                {d.active && <Flame className="size-4" />}
              </span>
            )}
          </div>
        ))}
      </div>
    </EndScreen>
  )
}

const FIRSTS = {
  "first-lesson": { title: "Your first lesson", text: "Welcome to Training. One down, many to go." },
  "first-flawless-test": { title: "Flawless", text: "Your first unit test without a single mistake." },
  "first-course": { title: "Course complete", text: "You finished every lesson in a course. That's rare." },
} as const

export function FirstScreen({ kind, onContinue }: { kind: keyof typeof FIRSTS; onContinue: () => void }) {
  const f = FIRSTS[kind]
  return (
    <EndScreen onContinue={onContinue}>
      <div className="relative">
        <Sparks count={30} spread={200} />
        <div className="animate-pop grid size-32 place-items-center rounded-full border-2 border-gold/60 bg-gradient-to-b from-gold/30 to-gold/5 shadow-[0_0_80px_rgba(255,218,116,0.45)]">
          {kind === "first-lesson" ? (
            <Sparkles className="size-14 text-gold" strokeWidth={1.5} />
          ) : (
            <Trophy className="size-14 text-gold" strokeWidth={1.5} />
          )}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[12px] font-semibold tracking-[0.2em] text-gold uppercase">Achievement unlocked</p>
        <h1 className="font-serif text-[40px] leading-tight">{f.title}</h1>
        <p className="text-[15px] text-white/60">{f.text}</p>
      </div>
    </EndScreen>
  )
}

/** Weekly league standing on the results screen: rank and XP animate from before to after. */
export function LeagueStanding({
  league,
  before,
  after,
  toPromotion,
  zone,
}: {
  league: League
  before: { rank: number; xp: number }
  after: { rank: number; xp: number }
  toPromotion: number
  zone: "promote" | "demote" | "safe"
  canPromote: boolean
}) {
  const xp = useCountUp(after.xp, before.xp, 1100, 300)
  const rank = useCountUp(after.rank, before.rank, 1100, 300)
  const climbed = after.rank < before.rank
  return (
    <div className="glass flex w-full items-center gap-4 p-3 text-left">
      <div className="w-14 shrink-0">
        <OreArt ore={league.ore} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-white/55">{league.name} · this week</p>
        <p className="flex items-baseline gap-2">
          <span className="font-wide text-[20px] tabular-nums">#{rank}</span>
          {climbed && (
            <span className="text-[13px] font-medium text-up">
              ▲ {before.rank - after.rank} place{before.rank - after.rank > 1 ? "s" : ""}
            </span>
          )}
          <span className="ml-auto text-[14px] text-white/70 tabular-nums">{xp} XP</span>
        </p>
        <p className={cn("text-[12px]", zone === "promote" ? "text-up" : zone === "demote" ? "text-down" : "text-white/45")}>
          {mondayNote(LEAGUES.findIndex((l) => l.id === league.id), zone, toPromotion)}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Preview (Exercise lab): trigger every moment on demand.

export function DelightPreview() {
  const [open, setOpen] = useState<string | null>(null)
  const close = () => setOpen(null)
  const week = "MTWTFSS".split("").map((label, i) => ({ label, active: i <= 2, today: i === 2 }))
  const items = [
    { id: "combo3", label: "Combo: 3 in a row" },
    { id: "combo5", label: "Combo: 5 in a row" },
    { id: "halfway", label: "Unit test halfway" },
    { id: "toast", label: "Toast: nice recovery" },
    { id: "streak", label: "Daily streak" },
    { id: "streak-ignite", label: "Daily streak: ignite" },
    { id: "first", label: "First lesson" },
    { id: "flawless", label: "First flawless test" },
  ]
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[18px] font-medium">Delight moments</h2>
        <p className="text-[14px] text-white/55">Preview the celebration screens learners see during and after lessons.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setOpen(it.id)}
            className="rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[14px] text-white/80 hover:border-gold/50 hover:text-white"
          >
            {it.label}
          </button>
        ))}
      </div>
      {open === "combo3" && <ComboMoment combo={3} bonus={5} onDone={close} />}
      {open === "combo5" && <ComboMoment combo={5} bonus={10} onDone={close} />}
      {open === "halfway" && <HalfwayMoment hearts={3} onDone={close} />}
      {open === "toast" && <Toast onDone={close}>↗ Nice recovery</Toast>}
      {(open === "streak" || open === "streak-ignite" || open === "first" || open === "flawless") && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black">
          {open === "streak" && <StreakScreen streak={3} week={week} onContinue={close} />}
          {open === "streak-ignite" && <StreakScreen ignite streak={3} week={week} onContinue={close} />}
          {open === "first" && <FirstScreen kind="first-lesson" onContinue={close} />}
          {open === "flawless" && <FirstScreen kind="first-flawless-test" onContinue={close} />}
        </div>
      )}
    </section>
  )
}
