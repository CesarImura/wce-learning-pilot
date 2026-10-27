"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  BookOpen,
  CandlestickChart,
  Check,
  ChevronRight,
  Clock,
  Layers,
  Lock,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { FLAWLESS_BONUS, UNIT_BONUS, courseStats, lessonPoints, unitTest, type Course, type Unit } from "@/lib/courses"
import type { Lesson } from "@/lib/lessons"
import { courseProgress, fmtPoints, unitComplete, useProgress, type Progress } from "@/lib/progress"
import { cn } from "@/lib/utils"
import { OreArt } from "@/components/academy/league"
import { syncLeagueWeek, useLeague } from "@/lib/engagement"
import { LEAGUES, weekId, weeklyStatus } from "@/lib/league"
import { NewTag } from "./course-card"
import { TopicCoin } from "./topic-coin"
import { CourseReward } from "./paywall"
import { topicOf } from "@/lib/courses"

const ICONS: Record<Lesson["icon"], LucideIcon> = {
  candle: CandlestickChart,
  layers: Layers,
  target: Target,
  shield: ShieldCheck,
  sparkles: Sparkles,
}

// Zig-zag offsets for the lesson path.
const OFFSETS = ["translate-x-0", "-translate-x-16", "translate-x-0", "translate-x-16"]

function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-[1.3px] bg-white/10", className)}>
      <div className="h-full rounded-[1.3px] bg-brand transition-all duration-700" style={{ width: `${pct}%` }} />
    </div>
  )
}

function LessonNode({
  course,
  lesson,
  state,
  index,
  result,
  started,
}: {
  course: Course
  lesson: Lesson
  state: "done" | "current" | "upcoming"
  index: number
  result?: Progress[string]
  /** Whether any lesson of the course is done: the marker then says where you left off. */
  started: boolean
}) {
  const Icon = ICONS[lesson.icon]
  return (
    <div data-current={state === "current" || undefined} className={cn("flex scroll-my-32 flex-col items-center gap-3", OFFSETS[index % OFFSETS.length])}>
      {state === "current" && (
        <span className="relative animate-bounce rounded-[6px] bg-white px-2.5 py-1 text-[13px] font-semibold text-black motion-reduce:animate-none">
          {started ? "Continue here" : "Start here"}
          <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-white" />
        </span>
      )}
      <Link
        href={`/courses/${course.id}/${lesson.id}`}
        aria-label={lesson.title}
        className={cn(
          "grid size-[76px] place-items-center rounded-full border shadow-[inset_0_-5px_0_rgba(0,0,0,0.3)] transition-all hover:scale-105 active:translate-y-0.5 active:shadow-none",
          state === "done" && "border-brand/50 bg-brand/15 text-brand-pale",
          state === "current" &&
            "border-white bg-white text-black ring-8 ring-white/10 shadow-[inset_0_-5px_0_rgba(0,0,0,0.18),0_0_40px_rgba(106,190,242,0.35)]",
          state === "upcoming" && "border-white/10 bg-white/5 text-white/60 hover:text-white",
        )}
      >
        {state === "done" ? <Check className="size-8" strokeWidth={2.5} /> : <Icon className="size-8" />}
      </Link>
      <div className="text-center">
        <p className={cn("text-[16px] font-medium", state === "upcoming" ? "text-white/70" : "text-white")}>
          {lesson.title}
        </p>
        <p className="text-[13px] text-white/50 tabular-nums">
          {result
            ? `${result.points} / ${lessonPoints(lesson)} XP`
            : `${lesson.steps.length} steps · ${lessonPoints(lesson)} XP`}
        </p>
      </div>
    </div>
  )
}

/** Last node of every unit: the unit test, worth bonus XP. */
function UnitTestNode({ course, unit, progress }: { course: Course; unit: Unit; progress: Progress }) {
  const test = unitTest(unit)
  const result = progress[`${course.id}/${test.id}`]
  const unlocked = unitComplete(course, unit, progress)
  const state = result ? "mastered" : unlocked ? "ready" : "locked"
  const node = (
    <span
      className={cn(
        "relative grid size-[92px] place-items-center rounded-[28px] border-2 shadow-[inset_0_-6px_0_rgba(0,0,0,0.3)] transition-all",
        state === "locked" && "border-white/10 bg-white/[0.03] text-white/30",
        state === "ready" &&
          "border-gold bg-gradient-to-b from-gold/40 to-gold/10 text-gold shadow-[inset_0_-6px_0_rgba(0,0,0,0.25),0_0_50px_rgba(255,218,116,0.35)] group-hover:scale-105",
        state === "mastered" && "border-gold/70 bg-gold text-black group-hover:scale-105",
      )}
    >
      {state === "locked" ? <Lock className="size-8" /> : <Trophy className="size-10" strokeWidth={1.75} />}
      {state === "mastered" && (
        <span className="absolute -right-2 -bottom-2 grid size-8 place-items-center rounded-full border-2 border-black bg-up text-black">
          <Check className="size-4" strokeWidth={3} />
        </span>
      )}
    </span>
  )
  return (
    <div className="flex w-full flex-col items-center gap-3 border-t border-dashed border-white/10 pt-10">
      {state === "ready" && (
        <span className="relative animate-bounce rounded-[6px] bg-gold px-2.5 py-1 text-[13px] font-semibold text-black motion-reduce:animate-none">
          +{UNIT_BONUS} XP bonus
          <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-gold" />
        </span>
      )}
      {state === "locked" ? (
        <div aria-disabled className="cursor-not-allowed">
          {node}
        </div>
      ) : (
        <Link href={`/courses/${course.id}/${test.id}`} aria-label={`${unit.title} unit test`} className="group">
          {node}
        </Link>
      )}
      <div className="text-center">
        <p className={cn("text-[16px] font-medium", state === "locked" ? "text-white/50" : "text-gold")}>
          {state === "mastered" ? "Unit mastered" : "Unit test"}
        </p>
        <p className="text-[13px] text-white/50">
          {state === "mastered"
            ? `${result.points} XP earned · tap to retake`
            : state === "ready"
              ? `${test.steps.length} questions · ${test.test!.hearts} hearts · +${UNIT_BONUS} XP (+${FLAWLESS_BONUS} flawless)`
              : `Finish all ${unit.lessons.length} lessons to unlock`}
        </p>
      </div>
    </div>
  )
}

export function CourseDetail({ course }: { course: Course }) {
  const progress = useProgress()
  const stats = courseStats(course)
  const prog = courseProgress(course, progress)
  // The coupon for finishing the course; ?reward=preview shows it before the course is done (prototype).
  const previewReward = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(location.search).get("reward") === "preview",
    () => false,
  )
  const finished = prog.total > 0 && prog.done >= prog.total && prog.testsPassed >= course.units.length
  const results = Object.entries(progress).filter(([k]) => k.startsWith(`${course.id}/`))
  const accuracy = results.length ? Math.round(results.reduce((n, [, r]) => n + r.accuracy, 0) / results.length) : null
  const ctaHref = prog.next
    ? `/courses/${course.id}/${prog.next.id}`
    : `/courses/${course.id}/${course.units[0].lessons[0].id}`

  // Open on where you left off: on desktop the header stays put in the rail, so bring the current lesson into view.
  const path = useRef<HTMLDivElement>(null)
  const ready = Object.keys(progress).length > 0
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return
    const here = path.current?.querySelector<HTMLElement>("[data-current]")
    if (!here) return
    const r = here.getBoundingClientRect()
    if (r.top > 0 && r.bottom < window.innerHeight) return
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    here.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" })
  }, [ready])

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-6 pb-24 lg:px-10">
      <nav className="mb-5 flex items-center gap-1.5 text-[14px] whitespace-nowrap text-white/50">
        <Link href="/courses" className="shrink-0 hover:text-white">
          Training
        </Link>
        <ChevronRight className="size-4" />
        <span className="truncate text-white/80">{course.title}</span>
      </nav>

      {/* The course and where you stand in it live in a rail that stays put on desktop; the path scrolls beside it. */}
      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
        <aside className="glass flex flex-col overflow-hidden lg:sticky lg:top-[70px] lg:max-h-[calc(100dvh-90px)] lg:overflow-y-auto lg:[scrollbar-width:none]">
          <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center gap-4">
              <div
                className="grid size-[104px] shrink-0 place-items-center rounded-full"
                style={{ backgroundImage: `radial-gradient(circle at 50% 50%, ${topicOf(course).color}33, transparent 70%)` }}
              >
                <TopicCoin topicId={course.topic} size={96} float />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-white/55">
                  <span className="font-medium" style={{ color: topicOf(course).color }}>
                    {topicOf(course).name}
                  </span>
                  {course.isNew && <NewTag className="px-1 py-0.5 text-[11px]" />}
                  <span>· {course.level}</span>
                </div>
                <h1 className="text-[24px] leading-tight font-medium text-balance">{course.title}</h1>
              </div>
            </div>
            <p className="text-[15px] text-pretty text-white/65">{course.tagline}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px] whitespace-nowrap text-white/60">
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-4" /> {stats.lessons} lessons
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-4" /> {stats.exercises} exercises
              </span>
              <span className="flex items-center gap-1.5">
                <Trophy className="size-4" /> {course.units.length} unit tests
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" /> ~{stats.minutes} min
              </span>
            </div>
            <Link
              href={ctaHref}
              className="flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-[6px] bg-white px-4 text-[14px] font-semibold tracking-[-0.02em] text-black hover:bg-white/85"
            >
              {prog.next ? <Play className="size-4 shrink-0 fill-black" /> : <RotateCcw className="size-4 shrink-0" />}
              <span className="truncate">{prog.done === 0 ? "Start first lesson" : prog.next ? `Continue: ${prog.next.title}` : "Review course"}</span>
            </Link>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 p-5">
            <p className="text-[13px] text-white/55">Your progress</p>
            <div className="flex items-center gap-2">
              <Zap className="size-6 fill-[#f5c451] text-[#f5c451]" />
              <p className="text-[24px] leading-7 font-medium tabular-nums">
                {fmtPoints(prog.points)} <span className="text-[15px] text-white/50">/ {stats.points} XP</span>
              </p>
            </div>
            <ProgressBar pct={prog.pct} />
            <div className="grid grid-cols-4 gap-2">
              {[
                { v: `${prog.done}/${prog.total}`, l: "Lessons" },
                { v: `${prog.pct}%`, l: "Complete" },
                { v: accuracy === null ? "–" : `${accuracy}%`, l: "Accuracy" },
                { v: `${prog.testsPassed}/${course.units.length}`, l: "Units", gold: true },
              ].map((x) => (
                <div key={x.l}>
                  <p className={cn("text-[18px] leading-6 font-medium tabular-nums", x.gold && "text-gold")}>{x.v}</p>
                  <p className="text-[12px] text-white/45">{x.l}</p>
                </div>
              ))}
            </div>
          </div>
          <CourseLeague />
          {(finished || previewReward) && (
            <div className="border-t border-white/10 p-4">
              <CourseReward courseId={course.id} courseTitle={course.title} compact />
            </div>
          )}
        </aside>

        {/* Units + lesson path */}
        <div ref={path} className="space-y-6">
          {course.units.map((unit, u) => {
            const done = unit.lessons.filter((l) => progress[`${course.id}/${l.id}`]).length
            const mastered = !!progress[`${course.id}/${unitTest(unit).id}`]
            return (
              <section key={unit.id} className="glass overflow-hidden">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
                  <div>
                    <p className="text-[13px] text-white/50">Unit {u + 1}</p>
                    <h2 className="mt-0.5 text-[20px] font-semibold">{unit.title}</h2>
                    <p className="text-[14px] text-white/60">{unit.description}</p>
                  </div>
                  <div className="w-44 space-y-1.5">
                    <p className="flex items-center justify-end gap-1.5 text-right text-[13px] whitespace-nowrap text-white/55 tabular-nums">
                      {mastered && (
                        <span className="flex items-center gap-1 text-gold">
                          <Trophy className="size-3.5" /> Mastered ·
                        </span>
                      )}
                      {done} of {unit.lessons.length} lessons
                    </p>
                    <ProgressBar pct={(done / unit.lessons.length) * 100} />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-10 px-4 py-10">
                  {unit.lessons.map((lesson, i) => {
                    const result = progress[`${course.id}/${lesson.id}`]
                    const state = result ? "done" : prog.next?.id === lesson.id ? "current" : "upcoming"
                    return (
                      <LessonNode
                        key={lesson.id}
                        course={course}
                        lesson={lesson}
                        state={state}
                        index={i}
                        result={result}
                        started={prog.done > 0}
                      />
                    )
                  })}
                  <UnitTestNode course={course} unit={unit} progress={progress} />
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Your league, in a line: lives in the course header next to your progress. */
function CourseLeague() {
  const s = useLeague()
  useEffect(() => syncLeagueWeek(), [])
  if (!s.now) return <div className="h-[76px] border-t border-white/10" />
  const league = LEAGUES[s.league]
  const { me, toPromotion, canPromote } = weeklyStatus(s.league, weekId(s.now), s.weekXp, s.now)
  return (
    <Link href="/league" className="group mt-auto flex items-center gap-3 border-t border-white/10 px-5 py-4 transition-colors hover:bg-white/[0.03]">
      <div className="w-11 shrink-0">
        <OreArt ore={league.ore} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{league.name}</p>
        <p
          className={cn(
            "text-[13px]",
            me.zone === "promote" ? "text-up" : me.zone === "demote" ? "text-down" : "text-white/55",
          )}
        >
          #{me.rank} · {s.weekXp} XP this week ·{" "}
          {me.zone === "promote" ? "promotion zone" : me.zone === "demote" ? "demotion zone" : canPromote ? `${toPromotion} XP to move up` : "top league"}
        </p>
      </div>
      <ChevronRight className="size-4 text-white/40 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
