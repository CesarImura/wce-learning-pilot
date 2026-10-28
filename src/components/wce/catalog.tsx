"use client"

// Academy home: a focused learning dashboard, deliberately different from the
// platform's Student Area (video library) so the two aren't confused.

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, Check, Flame, Lock, RotateCcw, Sparkles, Trophy } from "lucide-react"
import { LeagueCard } from "@/components/academy/league"
import { DelightPreview } from "@/components/academy/delight"
import { CoinLab } from "@/components/coin/coin-lab"
import { ALL_TYPES, COURSES, courseStats, topicOf, type Course } from "@/lib/courses"
import { KIND_LABELS, type ExerciseKind } from "@/lib/lessons"
import { academyStats } from "@/lib/league"
import { useStreak } from "@/lib/engagement"
import { courseProgress, fmtPoints, useProgress, type Progress } from "@/lib/progress"
import { cn } from "@/lib/utils"
import { NewTag } from "./course-card"
import { TopicCoin } from "./topic-coin"
import { resetLearner, useCourseArt } from "@/components/prototype-panel"

type Status = "progress" | "new" | "done" | "soon"

export function statusOf(c: Course, p: Progress): Status {
  if (c.status === "coming-soon") return "soon"
  const prog = courseProgress(c, p)
  if (prog.done === 0) return "new"
  return prog.next ? "progress" : "done"
}

const STATUS_LABEL: Record<Status, string> = {
  progress: "In progress",
  new: "Not started",
  done: "Completed",
  soon: "Coming soon",
}

// ---------------------------------------------------------------------------

export function ContinueCard({ progress }: { progress: Progress }) {
  // The most advanced course that still has lessons left, else the first available one.
  const candidates = COURSES.filter((c) => c.status === "available")
  const course =
    candidates
      .map((c) => ({ c, p: courseProgress(c, progress) }))
      .filter(({ p }) => p.done > 0 && p.next)
      .sort((a, b) => b.p.pct - a.p.pct)[0]?.c ?? candidates[0]
  const prog = courseProgress(course, progress)
  const unit = course.units.find((u) => u.lessons.some((l) => l.id === prog.next?.id))
  const topic = topicOf(course)
  const art = useCourseArt()

  return (
    <Link
      href={`/courses/${course.id}`}
      className="glass group grid overflow-hidden transition-colors hover:border-white/25 sm:grid-cols-[260px_1fr]"
    >
      <div
        className="grid place-items-center py-5 sm:py-8"
        style={art === "print" ? undefined : { backgroundImage: `radial-gradient(circle at 50% 50%, ${topic.color}22, transparent 65%)` }}
      >
        <TopicCoin topicId={course.topic} size={art === "print" ? 220 : 168} float active className="max-sm:size-[140px]!" />
      </div>
      <div className="flex flex-col justify-between gap-5 p-5">
        <div className="space-y-1">
          <p className="eyebrow">
            {prog.done ? "Continue where you left off" : "Start here"} ·{" "}
            <span style={{ color: topic.color }}>{topic.name}</span>
          </p>
          <h2 className="text-[22px] font-medium">{course.title}</h2>
          {prog.next && (
            <p className="text-[15px] text-white/60">
              {unit?.title} <span className="text-white/30">·</span> Next:{" "}
              <span className="text-white">{prog.next.title}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[160px] flex-1 space-y-1.5">
            <div className="flex justify-between text-[12px] text-white/50 uppercase">
              <span>
                {prog.done}/{prog.total} lessons
              </span>
              <span className="tabular-nums">{prog.pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-[1.3px] bg-white/10">
              <div className="h-full bg-brand" style={{ width: `${prog.pct}%` }} />
            </div>
          </div>
          <span className="flex h-[38px] items-center gap-1.5 rounded-[5px] bg-white px-4 text-[14px] font-semibold tracking-[-0.02em] text-black transition-colors group-hover:bg-white/85">
            {prog.done ? "Continue course" : "Open course"} <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export function CourseRow({ course, progress }: { course: Course; progress: Progress }) {
  const status = statusOf(course, progress)
  const prog = courseProgress(course, progress)
  const stats = courseStats(course)
  const soon = status === "soon"
  const topic = topicOf(course)
  const body = (
    <>
      <div className="grid w-[76px] shrink-0 place-items-center py-1 sm:w-[104px]">
        <TopicCoin topicId={course.topic} size={92} className="max-sm:size-[68px]!" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p
          className="text-[11px] font-medium tracking-[0.12em] uppercase"
          style={{ color: soon ? "rgb(255 255 255 / 0.4)" : topic.color }}
        >
          {topic.name}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[17px] font-medium">{course.title}</p>
          {course.isNew && !soon && <NewTag className="px-1 py-0.5 text-[11px]" />}
        </div>
        <p className="line-clamp-1 text-[14px] text-white/55">{course.tagline}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/45">
          <span>{course.level}</span>
          {course.mentor && <span>with {course.mentor}</span>}
          {!soon && (
            <span className="flex items-center gap-1">
              <BookOpen className="size-3.5" /> {stats.lessons} lessons
            </span>
          )}
          {!soon && (
            <span className="flex items-center gap-1">
              <Trophy className="size-3.5" /> {prog.testsPassed}/{course.units.length} units mastered
            </span>
          )}
        </p>
      </div>
      <div className="flex w-full shrink-0 items-center gap-3 sm:w-[200px] sm:flex-col sm:items-end">
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium whitespace-nowrap",
            status === "progress" && "bg-brand/15 text-brand-soft",
            status === "new" && "bg-white/10 text-white/70",
            status === "done" && "bg-up/15 text-up",
            status === "soon" && "bg-white/5 text-white/40",
          )}
        >
          {status === "done" && <Check className="size-3.5" />}
          {status === "soon" && <Lock className="size-3" />}
          {STATUS_LABEL[status]}
        </span>
        {!soon && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10 sm:w-32">
            <div className="h-full bg-brand" style={{ width: `${prog.pct}%` }} />
          </div>
        )}
      </div>
    </>
  )
  const cls = "flex flex-wrap items-center gap-4 p-3 sm:flex-nowrap"
  return soon ? (
    <div className={cn(cls, "cursor-not-allowed")}>{body}</div>
  ) : (
    <Link href={`/courses/${course.id}`} className={cn(cls, "transition-colors hover:bg-white/[0.04]")}>
      {body}
    </Link>
  )
}

type Filter = "all" | Status
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "progress", label: "In progress" },
  { id: "new", label: "Not started" },
  { id: "done", label: "Completed" },
]

/** Segmented control styled like the dashboard's Points / P&L toggle. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string }[]
}) {
  return (
    <div className="flex items-center overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-[33px] rounded-lg px-3 text-[14px] font-medium tracking-[0.02em] whitespace-nowrap transition-all",
            value === o.id
              ? "border border-white/10 bg-white/5 text-white"
              : "border border-transparent text-white/60 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Courses({ progress }: { progress: Progress }) {
  const [filter, setFilter] = useState<Filter>("all")
  const list = COURSES.filter((c) => filter === "all" || statusOf(c, progress) === filter)
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-medium">Courses</h2>
        <Segmented value={filter} onChange={setFilter} options={FILTERS} />
      </div>
      <div className="glass divide-y divide-white/10 overflow-hidden">
        {list.length ? (
          list.map((c) => <CourseRow key={c.id} course={c} progress={progress} />)
        ) : (
          <p className="px-4 py-10 text-center text-white/50">Nothing here yet.</p>
        )}
      </div>
    </section>
  )
}

export function Catalog() {
  const progress = useProgress()
  const stats = academyStats(progress)
  const { streak, activeToday } = useStreak()
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-8 pb-24 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-medium">Welcome back, Phillip</h1>
          <p className="text-[15px] text-white/60">Learn by doing: every lesson is interactive.</p>
        </div>
        <div className="flex gap-6 text-right">
          <div title={activeToday ? "You trained today" : "Complete a lesson today to keep your streak"}>
            <p
              className={cn(
                "flex items-center justify-end gap-1 text-[22px] font-medium tabular-nums",
                activeToday ? "text-[#ffcf6e]" : "text-white/50",
              )}
            >
              <Flame className={cn("size-5", activeToday && "fill-[#ff9f43]")} /> {streak}
            </p>
            <p className="text-[11px] tracking-wide text-white/45 uppercase">Day streak</p>
          </div>
          {[
            { v: fmtPoints(stats.xp), l: "Total XP" },
            { v: stats.lessons, l: "Lessons done" },
            { v: stats.testsPassed, l: "Units mastered" },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-[22px] font-medium tabular-nums">{s.v}</p>
              <p className="text-[11px] tracking-wide text-white/45 uppercase">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <ContinueCard progress={progress} />
          <Courses progress={progress} />
        </div>
        <aside className="space-y-6 lg:sticky lg:top-[110px] lg:self-start">
          <LeagueCard />
          <Link href="/lab" className="glass group block p-4 transition-colors hover:border-brand/40">
            <p className="eyebrow flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> Exercise lab
            </p>
            <p className="mt-1 text-[15px] text-white/80">Try all {ALL_TYPES.steps.length} interactive exercise types.</p>
          </Link>
        </aside>
      </div>
    </div>
  )
}

/** Every course with filters: the full list behind "All courses" on the Training home. */
export function AllCourses() {
  const progress = useProgress()
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-6 pb-24 lg:px-10">
      <Courses progress={progress} />
    </div>
  )
}

/** All exercise types in one place (demo / authoring reference). */
/** Exercises changed in the pre-demo pass (Oct 2026), tagged on their lab card; the note shows on hover. */
const UPDATED: Partial<Record<ExerciseKind, string>> = {
  "candle-scrub": "New chunky slider",
  "candle-builder": "Looser tolerance, handles pop and glow on hover/drag",
  "draw-support": "Price line reacts on hover/drag",
  "ma-tuner": "New chunky slider",
  "order-book": "Slippage shows 4 decimals, new slider",
  "place-trade": "R:R graded as shown (1 : 2.0 passes), lines snap to 0.05",
  "position-sizer": "New chunky sliders",
  "expectancy-lab": "30% at 1:3 now counts as +0.20R, new sliders",
  order: "Arrows locked after Check",
  "returns-reality": "New chunky slider",
  "breakeven-curve": "Wider 30–37% window, dot pops on hover/drag",
  number: "Negative answers typeable on iPhone",
  "prop-firm": "New chunky sliders",
  "yield-curve": "Dots pop and glow on hover/drag",
  "dividend-split": "New chunky slider",
  "carry-trade": "New chunky sliders",
  "real-yield-gold": "New chunky sliders",
}

export function ExerciseLab() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 pt-8 pb-24 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-medium">Exercise lab</h1>
          <p className="text-[15px] text-white/60">
            The {ALL_TYPES.steps.length} exercise templates that every course is built from. Play one, or all of them in a
            row.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetLearner}
            className="flex h-[38px] items-center gap-1.5 rounded-[5px] border border-white/15 px-3 text-[14px] text-white/70 hover:text-white"
          >
            <RotateCcw className="size-4" /> Reset demo
          </button>
          <Link
            href="/courses/lab/all"
            className="flex h-[38px] items-center gap-1.5 rounded-[5px] bg-white px-4 text-[14px] font-semibold tracking-[-0.02em] text-black hover:bg-white/85"
          >
            Play all <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ALL_TYPES.steps.map((st) => (
          <Link
            key={st.kind}
            href={`/courses/lab/${st.kind}`}
            className="group rounded-lg border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-brand/40 hover:bg-white/[0.06]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] font-medium tracking-wide text-brand-soft uppercase">{KIND_LABELS[st.kind]}</p>
              {UPDATED[st.kind] && (
                <span title={UPDATED[st.kind]} className="pearl-chip shrink-0">
                  Updated
                </span>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-[14px] text-white/80 group-hover:text-white">{st.prompt}</p>
          </Link>
        ))}
      </div>
      <div className="pt-6">
        <CoinLab />
      </div>
      <div className="pt-6">
        <DelightPreview />
      </div>
    </div>
  )
}
