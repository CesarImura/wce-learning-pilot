"use client"

// The Training launch moment on the dashboard, shown once to every student (both paywall groups
// and students outside the beta). It leads to one action: in the beta, Lesson 1 of the Beginner
// Series (no "here is where things live" tour first); outside it, the waitlist.

import { useEffect, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { ALL_TYPES, PILOT_COURSES, courseLessons } from "@/lib/courses"
import { INTRO_LESSON, INTRO_LESSON_HREF, markIntro } from "@/lib/intro"
import { useProgress, type Progress } from "@/lib/progress"
import { track } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import { useBeta } from "@/components/prototype-panel"
import { useCountUp } from "@/components/academy/delight"
import { TopicCoin } from "./topic-coin"

/** Where Training's launch actions go: Lesson 1 for a student who hasn't done it, else the Training home (or waitlist). */
export function launchHref(beta: "in" | "out", progress: Progress) {
  if (beta === "out") return "/courses"
  return progress[`${INTRO_LESSON.courseId}/${INTRO_LESSON.lessonId}`] ? "/courses" : INTRO_LESSON_HREF
}

const TITLE = "Training"

export function TrainingLaunch() {
  const beta = useBeta()
  const progress = useProgress()
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  const lessons = PILOT_COURSES.reduce((n, c) => n + courseLessons(c).length, 0)
  const stats = [
    { value: useCountUp(PILOT_COURSES.length, 0, 900, 2300), label: "free courses" },
    { value: useCountUp(lessons, 0, 900, 2380), label: "short lessons" },
    { value: useCountUp(ALL_TYPES.steps.length, 0, 900, 2460), label: "kinds of exercise" },
  ]

  const close = (action: "start" | "waitlist" | "later") => {
    if (leaving) return
    track("training_intro_clicked", { action })
    setLeaving(true)
    if (action !== "later") {
      markIntro({ routed: true })
      router.push(launchHref(beta, progress))
    }
    setTimeout(() => markIntro({ announced: true }), 360)
  }

  useEffect(() => {
    track("training_intro_viewed", { beta })
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close("later")
    window.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
    // Once per mount: `close` only needs the latest state when a key is pressed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="training-launch-title"
      className={cn("fixed inset-0 z-[60] overflow-hidden", leaving && "launch-leave")}
    >
      <div className="launch-scrim absolute inset-0 bg-black/95 backdrop-blur-md" />
      <div
        aria-hidden
        className="launch-glow pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 45% at 50% 46%, rgba(106,190,242,0.20), transparent 70%)" }}
      />
      <CandleField />

      {/* A click on the empty dark area is "Maybe later". */}
      <div
        onClick={(e) => e.target === e.currentTarget && close("later")}
        className="relative flex h-full flex-col items-center justify-center gap-7 overflow-y-auto px-6 py-10 text-center"
      >
        <div className="flex items-end justify-center -space-x-10">
          {PILOT_COURSES.map((c, i) => (
            <div key={c.id} className="launch-obj" style={{ "--i": i === 1 ? 0 : i === 0 ? 1 : 2 } as CSSProperties}>
              <TopicCoin topicId={c.topic} size={i === 1 ? 210 : 160} float active={i === 1} />
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="launch-rise font-serif text-[24px] text-white/75 italic" style={{ "--d": "1350ms" } as CSSProperties}>
            New in World Class Edge
          </p>
          <h1
            id="training-launch-title"
            aria-label={TITLE}
            className="overflow-hidden font-poster text-[clamp(88px,13vw,176px)] leading-[0.86] tracking-[0.01em] uppercase"
          >
            {TITLE.split("").map((ch, i) => (
              <span key={i} aria-hidden className="launch-letter" style={{ "--i": i } as CSSProperties}>
                {ch}
              </span>
            ))}
          </h1>
        </div>

        <p
          className="launch-rise max-w-[560px] text-[18px] leading-7 text-white/70"
          style={{ "--d": "2050ms" } as CSSProperties}
        >
          Practice what the mentors teach. Short interactive lessons on real charts, a daily streak and a weekly league.
          {beta === "out" && " We’re opening it to students in small groups."}
        </p>

        <dl className="launch-rise flex items-start gap-10" style={{ "--d": "2250ms" } as CSSProperties}>
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-0.5">
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-[40px] leading-none font-medium tabular-nums">{s.value}</dd>
              <dd aria-hidden className="text-[14px] text-white/50">
                {s.label}
              </dd>
            </div>
          ))}
        </dl>

        <div className="launch-rise flex flex-wrap items-center justify-center gap-3" style={{ "--d": "2700ms" } as CSSProperties}>
          <button
            autoFocus
            onClick={() => close(beta === "out" ? "waitlist" : "start")}
            className="flex h-12 items-center gap-2 rounded-[6px] bg-white px-6 text-[16px] font-medium text-black transition-[background-color,scale] duration-150 hover:bg-white/90 active:scale-[0.97]"
          >
            {beta === "out" ? "Join the waitlist" : "Start your first lesson"} <ArrowRight className="size-4" />
          </button>
          <button
            onClick={() => close("later")}
            className="h-12 rounded-[6px] bg-white/10 px-5 text-[16px] font-medium text-white/80 transition-[background-color,color,scale] duration-150 hover:bg-white/15 hover:text-white active:scale-[0.97]"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}

// Deterministic noise around a gentle uptrend.
const CANDLES = (() => {
  let price = 120
  return Array.from({ length: 44 }, (_, i) => {
    const swing = Math.sin(i * 1.7) * 9 + Math.cos(i * 0.6) * 6
    const open = price
    const close = price + 2.2 + swing * 0.6
    const high = Math.max(open, close) + 4 + Math.abs(Math.sin(i * 2.3)) * 8
    const low = Math.min(open, close) - 4 - Math.abs(Math.cos(i * 1.9)) * 8
    price = close
    return { i, open, close, high, low, up: close >= open }
  })
})()

/** A field of candles rising along a sky horizon behind the objects: an uptrend, faded at the edges. */
function CandleField() {
  const candles = CANDLES
  const top = Math.max(...candles.map((c) => c.high))
  const y = (v: number) => 300 - ((v - 60) / (top - 60)) * 260
  return (
    <svg
      aria-hidden
      viewBox="0 0 1320 300"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[26%] w-full opacity-40"
      style={{
        maskImage: "linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent), linear-gradient(0deg, #000 5%, transparent 90%)",
        maskComposite: "intersect",
      }}
    >
      <line className="launch-line" x1="0" x2="1320" y1="298" y2="298" stroke="#6abef2" strokeWidth="2" />
      {candles.map((c) => {
        const x = 20 + c.i * 30
        const color = c.up ? "#46d285" : "#e3465b"
        return (
          <g key={c.i} className="launch-candle" style={{ "--i": c.i } as CSSProperties}>
            <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.5" />
            <rect
              x={x - 7}
              width="14"
              y={y(Math.max(c.open, c.close))}
              height={Math.max(2, Math.abs(y(c.open) - y(c.close)))}
              rx="1"
              fill={color}
            />
          </g>
        )
      })}
    </svg>
  )
}
