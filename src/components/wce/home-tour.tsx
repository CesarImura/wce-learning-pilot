"use client"

// Training launch, last part: once the first lesson is done and the student lands on the Training home,
// a classic spotlight tour dims the page and explains one part at a time (streak, league, courses),
// ending on the next lesson so it leads to an action rather than just "this is where things live".

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { COURSES, PILOT_COURSES } from "@/lib/courses"
import { GROUP_SIZE, LEAGUES, PROMOTE, DEMOTE } from "@/lib/league"
import { useLeague, useStreak } from "@/lib/engagement"
import { INTRO_LESSON, markIntro } from "@/lib/intro"
import { courseProgress, type Progress } from "@/lib/progress"
import { track } from "@/lib/analytics"
import { cn } from "@/lib/utils"

type TourStep = { id: string; title: string; body: string; action?: { label: string; href: string } }

const PAD = 8
const GAP = 16
const CARD_W = 360

export function HomeTour({ progress }: { progress: Progress }) {
  const { streak } = useStreak()
  const { league, weekXp } = useLeague()
  const course = COURSES.find((c) => c.id === INTRO_LESSON.courseId)!
  const next = courseProgress(course, progress).next
  const here = LEAGUES[league]
  const up = LEAGUES[league + 1]
  const titles = PILOT_COURSES.map((c) => c.title)

  const steps: TourStep[] = [
    {
      id: "week",
      title: streak > 1 ? `Day ${streak} of your streak` : "Your streak starts today",
      body: "One lesson a day keeps the flame lit. Miss a whole day and it starts again from zero.",
    },
    {
      id: "league",
      title: `You’re in the ${here.name}`,
      body: `Every lesson earns XP, and you have ${weekXp} this week. On Monday the top ${PROMOTE} of ${GROUP_SIZE}${
        up ? ` move up to the ${up.name}` : " stay at the top"
      }${league > 0 ? ` and the bottom ${DEMOTE} move down` : ""}.`,
    },
    {
      id: "courses",
      title: `${PILOT_COURSES.length} free courses`,
      body: `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}, built from the mentors’ classes. Each unit ends with a short test.`,
    },
    {
      id: "continue",
      title: next ? `Next up: ${next.title}` : "Pick up where you left off",
      body: next
        ? `Lesson 2 of the ${course.title} picks up where Lesson 1 left off. It takes a few minutes.`
        : "Your next lesson is always here, first thing on the Training home.",
      action: next ? { label: "Start lesson 2", href: `/courses/${course.id}/${next.id}` } : undefined,
    },
  ]

  const [index, setIndex] = useState(-1) // -1 until the page has settled
  const [hole, setHole] = useState<DOMRect | null>(null)
  const [cardH, setCardH] = useState(220)
  const card = useRef<HTMLDivElement>(null)
  const step = steps[Math.max(0, index)]

  const finish = (outcome: "completed" | "skipped") => {
    track("training_tour_finished", { outcome, last_step: step.id })
    markIntro({ toured: true })
  }

  // Start once the home has rendered (coins and the league fill in after mount).
  useEffect(() => {
    const t = setTimeout(() => setIndex(0), 700)
    return () => clearTimeout(t)
  }, [])

  // Each step: bring its part of the page into view, then follow it every frame (smooth scroll, sticky rail, resize).
  useEffect(() => {
    if (index < 0) return
    const el = document.querySelector<HTMLElement>(`[data-tour="${steps[index].id}"]`)
    if (!el) return
    track("training_tour_step_viewed", { step: steps[index].id, index })
    const tall = el.offsetHeight > window.innerHeight * 0.7
    el.scrollIntoView({ behavior: "smooth", block: tall ? "start" : "center" })
    let raf = 0
    const follow = () => {
      const r = el.getBoundingClientRect()
      setHole((h) => (h && h.x === r.x && h.y === r.y && h.width === r.width && h.height === r.height ? h : r))
      raf = requestAnimationFrame(follow)
    }
    follow()
    return () => cancelAnimationFrame(raf)
    // `steps` is rebuilt every render; the step id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight)
  }, [index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish("skipped")
      if (e.key === "ArrowRight" && index < steps.length - 1) setIndex((i) => i + 1)
      if (e.key === "ArrowLeft" && index > 0) setIndex((i) => i - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  if (index < 0 || !hole) return null

  const box = { x: hole.x - PAD, y: hole.y - PAD, w: hole.width + PAD * 2, h: Math.min(hole.height + PAD * 2, window.innerHeight - 24) }
  const pos = placeCard(box, cardH)
  const last = index === steps.length - 1

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* The page stays still while the tour talks about it; a click outside the card ends the tour,
          so nobody is ever stuck behind it. */}
      <div className="launch-scrim absolute inset-0" onClick={() => finish("skipped")} />
      <div
        aria-hidden
        className="launch-scrim pointer-events-none absolute rounded-[16px] ring-1 ring-white/25 transition-[top,left,width,height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ top: box.y, left: box.x, width: box.w, height: box.h, boxShadow: "0 0 0 200vmax rgba(0,0,0,0.74)" }}
      />
      <div
        ref={card}
        key={step.id}
        className="launch-rise absolute flex flex-col gap-4 rounded-[12px] border border-white/10 bg-[#151515] p-5 shadow-[0_16px_60px_rgba(0,0,0,0.8)] transition-[top,left] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ top: pos.top, left: pos.left, width: Math.min(CARD_W, window.innerWidth - 32), "--d": "120ms" } as CSSProperties}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] text-white/50 tabular-nums">
            {index + 1} of {steps.length}
          </span>
          <span className="flex gap-1.5" aria-hidden>
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={cn("h-1.5 rounded-full transition-[width,background-color] duration-300", i === index ? "w-5 bg-[#6abef2]" : "w-1.5 bg-white/25")}
              />
            ))}
          </span>
        </div>
        <div className="space-y-1.5">
          <h2 id="tour-title" className="text-[20px] leading-7 font-semibold">
            {step.title}
          </h2>
          <p className="text-[16px] leading-6 text-white/70">{step.body}</p>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1">
          <button onClick={() => finish("skipped")} className="text-[14px] whitespace-nowrap text-white/50 transition-colors hover:text-white">
            {last ? "Explore on my own" : "Skip tour"}
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && !last && (
              <button
                onClick={() => setIndex(index - 1)}
                className="h-10 rounded-[6px] bg-white/10 px-4 text-[15px] font-medium text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                Back
              </button>
            )}
            {last && step.action ? (
              <Link
                href={step.action.href}
                autoFocus
                onClick={() => finish("completed")}
                className="flex h-10 items-center gap-2 rounded-[6px] bg-white px-4 text-[15px] font-medium whitespace-nowrap text-black transition-colors hover:bg-white/90"
              >
                {step.action.label} <ArrowRight className="size-4" />
              </Link>
            ) : (
              <button
                autoFocus
                onClick={() => (last ? finish("completed") : setIndex(index + 1))}
                className="h-10 rounded-[6px] bg-white px-4 text-[15px] font-medium text-black transition-colors hover:bg-white/90"
              >
                {last ? "Done" : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Below the spotlight if it fits, else above, else beside it (tall parts like the league rail), else pinned to the bottom. */
function placeCard(box: { x: number; y: number; w: number; h: number }, h: number) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = Math.min(CARD_W, vw - 32)
  const clampX = (x: number) => Math.min(Math.max(16, x), vw - w - 16)
  const clampY = (y: number) => Math.min(Math.max(16, y), vh - h - 16)
  if (box.y + box.h + GAP + h <= vh - 16) return { top: box.y + box.h + GAP, left: clampX(box.x) }
  if (box.y - GAP - h >= 16) return { top: box.y - GAP - h, left: clampX(box.x) }
  if (box.x - GAP - w >= 16) return { top: clampY(box.y + box.h / 2 - h / 2), left: box.x - GAP - w }
  if (box.x + box.w + GAP + w <= vw - 16) return { top: clampY(box.y + box.h / 2 - h / 2), left: box.x + box.w + GAP }
  return { top: vh - h - 16, left: clampX(vw / 2 - w / 2) }
}
