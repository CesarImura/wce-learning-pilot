"use client"

// Training home (v2): one page with a bit of everything (where to continue, your courses,
// this week's league and your coins), each linking to its full page. Follows the learn-home
// pattern of Duolingo, Uxcel and Brilliant on Mobbin: a main column plus a side rail.
// The league owns the right column; streak and totals sit in the main column.

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronRight, Flame, FlaskConical, Gift, MessageSquarePlus } from "lucide-react"
import { OreArt } from "@/components/academy/league"
import { StandingRow, ZoneDivider } from "@/components/academy/league-page"
import { ALL_TYPES, PILOT_COURSES, type Course } from "@/lib/courses"
import { DEMOTE, GROUP_SIZE, LEAGUES, PROMOTE, academyStats, timeLeft, weekId, weeklyStatus } from "@/lib/league"
import { syncLeagueWeek, useLeague, useStreak } from "@/lib/engagement"
import { fmtPoints, topicProgress, useProgress, type Progress } from "@/lib/progress"
import { TOPIC_LIST } from "@/lib/topics"
import { track } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import { useBeta, useHomeLayout, usePaywallGroup, useWeekCard } from "@/components/prototype-panel"
import { ProBadge, openCourseRequest, proGate } from "./paywall"
import { Catalog, ContinueCard, CourseRow, statusOf } from "./catalog"
import { TopicCoin } from "./topic-coin"

/** /courses: the prototype panel picks between the original catalog (v1) and this home (v2). */
export function TrainingEntry() {
  const layout = useHomeLayout()
  if (useBeta() === "out") return <Waitlist />
  return layout === "v1" ? <Catalog /> : <TrainingHome />
}

/** Outside the closed beta, Training is a waitlist (Discovery board · Paywall, "In closed beta?"). */
function Waitlist() {
  const [joined, setJoined] = useState(false)
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-[560px] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="flex -space-x-4">
        {PILOT_COURSES.map((c) => (
          <TopicCoin key={c.id} topicId={c.topic} size={88} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="text-[32px] leading-10 font-medium tracking-[-0.6px] text-balance">Training is in closed beta</h1>
        <p className="text-[16px] leading-6 text-[#cfcfd0]">
          Short interactive lessons built from the mentors’ classes, with a daily streak and a weekly league. We’re opening it to students in small groups.
        </p>
      </div>
      {joined ? (
        <p className="flex h-12 items-center rounded-[6px] bg-white/5 px-5 text-[16px] text-white">You’re on the list. We’ll email you when your group opens.</p>
      ) : (
        <button
          onClick={() => {
            setJoined(true)
            track("training_waitlist_joined", {})
          }}
          className="h-12 rounded-[6px] bg-white px-6 text-[16px] font-medium text-black transition-colors hover:bg-white/90"
        >
          Join the waitlist
        </button>
      )}
    </div>
  )
}

export function TrainingHome() {
  const progress = useProgress()
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-8 pb-24 lg:px-10">
      {/* Phones read top to bottom: continue, league, your week, courses, coins. Desktop gives the league the right column,
          starting level with the continue card and one screen tall so the whole board has room. */}
      <h1 className="sr-only">Training</h1>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="lg:col-start-1">
          <ContinueCard progress={progress} />
        </div>
        <aside className="lg:sticky lg:top-[70px] lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-start">
          <LeagueSpotlight />
        </aside>
        <div className="lg:col-start-1">
          <WeekCard progress={progress} />
        </div>
        <div className="lg:col-start-1">
          <CoursesPreview progress={progress} />
        </div>
        <div className="lg:col-start-1">
          <CollectionStrip progress={progress} />
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ title, href, link, note }: { title: string; href?: string; link?: string; note?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[18px] font-medium">{title}</h2>
      {href && link ? (
        <Link href={href} className="group flex items-center gap-1 text-[14px] text-white/60 transition-colors hover:text-white">
          {link}
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : (
        note && <span className="text-[14px] text-white/50">{note}</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main column

const STATUS_ORDER = { progress: 0, new: 1, done: 2, soon: 3 } as const

function CoursesPreview({ progress }: { progress: Progress }) {
  // Every course fits here (there are only a handful): what you're doing first, then what's next.
  const list = [...PILOT_COURSES].sort((a: Course, b: Course) => STATUS_ORDER[statusOf(a, progress)] - STATUS_ORDER[statusOf(b, progress)])
  return (
    <section>
      <SectionHeader title="Courses" note={`${PILOT_COURSES.length} free courses`} />
      <div className="glass divide-y divide-white/10 overflow-hidden">
        {list.map((c) => (
          <CourseRow key={c.id} course={c} progress={progress} />
        ))}
        <RequestCourseRow />
      </div>
    </section>
  )
}

/** The 4th card: ask for a course. In the paywall test it is one of the Pro doors. */
function RequestCourseRow() {
  const group = usePaywallGroup()
  return (
    <button
      onClick={() => proGate("request_card", openCourseRequest)}
      className="group flex w-full flex-wrap items-center gap-4 p-3 text-left transition-colors hover:bg-white/[0.03] sm:flex-nowrap"
    >
      <span className="grid w-[76px] shrink-0 place-items-center py-1 sm:w-[104px]">
        <span className="grid size-[68px] place-items-center rounded-full border border-dashed border-white/25 bg-white/[0.03] text-white/70 transition-colors group-hover:border-[#6abef2]/60 group-hover:text-[#bae5ff] sm:size-[92px]">
          <MessageSquarePlus className="size-7" />
        </span>
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[17px] font-medium">Request a course</span>
          {group === "B" && <ProBadge />}
        </span>
        <span className="block text-[14px] text-white/55">Futures, CFDs, prop firm rules… tell us what to build next.</span>
      </span>
      <span className="flex h-9 shrink-0 items-center gap-1 rounded-[6px] border border-white/15 px-3 text-[14px] font-medium text-white/80 transition-colors group-hover:border-white/30 group-hover:text-white">
        Request
        <ChevronRight className="size-4" />
      </span>
    </button>
  )
}

const COIN_STATE = { locked: "Coming soon", new: "Not started", active: "Polishing", mastered: "Mastered" } as const

function CollectionStrip({ progress }: { progress: Progress }) {
  const mastered = TOPIC_LIST.filter((t) => topicProgress(t.id, progress).state === "mastered").length
  return (
    <section>
      <SectionHeader title="Coin collection" href="/collection" link={`${mastered} of ${TOPIC_LIST.length} mastered`} />
      <Link
        href="/collection"
        className="glass -mx-4 flex snap-x gap-2 overflow-x-auto rounded-none border-x-0 p-3 [scrollbar-width:none] transition-colors hover:border-white/25 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:rounded-(--card-radius) sm:border-x"
      >
        {TOPIC_LIST.map((t) => {
          const tp = topicProgress(t.id, progress)
          return (
            <span key={t.id} className="flex w-[112px] shrink-0 snap-start flex-col items-center gap-2 p-2 text-center sm:w-auto">
              <TopicCoin topicId={t.id} size={72} />
              <span className="flex flex-col">
                <span className="text-[13px] leading-4 font-medium text-white">{t.name}</span>
                <span className="text-[12px] leading-4" style={{ color: tp.state === "locked" ? "rgb(255 255 255 / 0.4)" : t.color }}>
                  {COIN_STATE[tp.state]}
                </span>
              </span>
            </span>
          )
        })}
      </Link>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Rail

/**
 * This week's league, owning the right column: the tiers with the current one centred, the quest
 * to the next league as a track between the two ores, and the whole group in a board that scrolls
 * inside the card and opens on you. On desktop the card is one screen tall, so the board is always
 * in view (composition from Uxcel, Speak and Mimo league screens, and the tier-progress tracks of
 * American Airlines and Azar, on Mobbin).
 */
function LeagueSpotlight() {
  const s = useLeague()
  const board = useRef<HTMLDivElement>(null)
  const ready = !!s.now
  useEffect(() => syncLeagueWeek(), [])
  useEffect(() => {
    const b = board.current
    const you = b?.querySelector<HTMLElement>("[data-you]")
    if (b && you) b.scrollTop = you.offsetTop - b.clientHeight / 2 + you.offsetHeight / 2
  }, [ready])
  // Time-dependent: render once the client clock is ready (nothing time-based is prerendered).
  if (!s.now) return <div className="glass h-[640px] animate-pulse" />
  const league = LEAGUES[s.league]
  const next = LEAGUES[s.league + 1]
  const { table, me, canPromote, promotionXp, toPromotion } = weeklyStatus(s.league, weekId(s.now), s.weekXp, s.now)
  const left = timeLeft(s.now)
  const pct = Math.min(100, promotionXp ? (s.weekXp / promotionXp) * 100 : 100)
  const below = LEAGUES.slice(0, s.league)
  const above = LEAGUES.slice(s.league + 1)

  return (
    <section className="glass flex flex-col overflow-hidden lg:h-[calc(100dvh-106px)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h2 className="text-[16px] font-medium">This week&apos;s league</h2>
        <Link href="/league" className="group flex items-center gap-1 text-[14px] text-white/60 transition-colors hover:text-white">
          View league
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div
        className="flex shrink-0 flex-col gap-4 px-4 pt-5 pb-4"
        style={{ backgroundImage: "radial-gradient(circle at 50% 18%, rgb(255 255 255 / 0.07), transparent 55%)" }}
      >
        {/* Current league centred; lower tiers to its left, higher ones to its right. */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2" aria-label={`League ${s.league + 1} of ${LEAGUES.length}`}>
          <div className="flex justify-end gap-2">
            {below.map((l) => (
              <div key={l.id} className="w-9 opacity-70" title={l.name}>
                <OreArt ore={l.ore} />
              </div>
            ))}
          </div>
          <div className="w-24">
            <OreArt ore={league.ore} />
          </div>
          <div className="flex justify-start gap-2">
            {above.map((l) => (
              <div key={l.id} className="w-9 opacity-70" title={l.name}>
                <OreArt ore={l.ore} mystery />
              </div>
            ))}
          </div>
        </div>
        <div className="text-center">
          <p className="text-[20px] leading-6 font-medium">{league.name}</p>
          <p className="text-[13px] text-white/55">
            #{me.rank} of {table.length} · {left.days}d {left.hours}h left
          </p>
        </div>

        {canPromote && next ? (
          <div className="flex flex-col gap-3 rounded-[8px] bg-white/[0.05] p-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[14px] font-medium">Quest to {next.name.replace(" League", "")}</p>
              <p className={cn("text-[13px] tabular-nums", me.zone === "promote" ? "text-up" : "text-white/60")}>
                {me.zone === "promote" ? "In the promotion zone" : `${toPromotion} XP to go`}
              </p>
            </div>
            {/* The track runs from this league's ore to the next one's; the marker is you. */}
            <div className="flex items-center gap-2">
              <div className="w-7 shrink-0">
                <OreArt ore={league.ore} />
              </div>
              <div className="relative h-1.5 flex-1 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#d4a93c] to-[#f5ddb1] transition-[width] duration-700" style={{ width: `${pct}%` }} />
                <span
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-[#f5ddb1]"
                  style={{ left: `${pct}%` }}
                />
              </div>
              <div className="w-7 shrink-0">
                <OreArt ore={next.ore} mystery={me.zone !== "promote"} />
              </div>
            </div>
            <div className="flex justify-between gap-3 text-[12px] text-white/50 tabular-nums">
              <span>You · {s.weekXp} XP</span>
              <span>
                Top {PROMOTE} · {promotionXp} XP
              </span>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {next.rewards.map((r) => (
                <li key={r} className="flex items-center gap-1.5 rounded-[4px] bg-[#f5ddb1]/[0.08] px-2 py-1 text-[12px] text-[#f5ddb1]">
                  <Gift className="size-3.5" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-center text-[14px] text-white/60">You&apos;re in the top league. Keep earning XP to stay there.</p>
        )}
      </div>

      {/* The whole group scrolls inside the card and opens centred on you. */}
      <div className="relative h-[340px] border-t border-white/10 lg:h-auto lg:min-h-0 lg:flex-1">
        <div ref={board} className="absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          {table.map((row, i) => (
            <div key={row.name}>
              {i === PROMOTE && canPromote && <ZoneDivider kind="promote" />}
              {i === GROUP_SIZE - DEMOTE && s.league > 0 && <ZoneDivider kind="demote" />}
              <StandingRow row={row} />
            </div>
          ))}
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
    </section>
  )
}

/** The prototype panel picks the week card: v1 = first take (kept to compare), v2 = aligned one. */
function WeekCard({ progress }: { progress: Progress }) {
  return useWeekCard() === "v1" ? <YourWeekV1 progress={progress} /> : <YourWeek progress={progress} />
}

/** First take of the week card, kept as-is for the v1/v2 comparison. */
function YourWeekV1({ progress }: { progress: Progress }) {
  const { streak, activeToday, week } = useStreak()
  const stats = academyStats(progress)
  const totals = [
    { v: fmtPoints(stats.xp), l: "Total XP" },
    { v: stats.lessons, l: "Lessons done" },
    { v: stats.testsPassed, l: "Units mastered" },
  ]
  return (
    <section className="glass overflow-hidden">
      <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8">
        <div className="flex flex-col gap-4">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Flame className={cn("size-6", activeToday ? "fill-[#ff9f43] text-[#ffcf6e]" : "text-white/40")} />
            <span className="text-[24px] leading-none font-medium tabular-nums">{streak}</span>
            <span className="text-[14px] text-white/60">day streak</span>
            <span className="text-[13px] text-white/40">· {activeToday ? "done for today" : "train today to keep it"}</span>
          </p>
          <div className="grid max-w-[420px] grid-cols-7 gap-1">
            {week.map((d, i) => (
              <span key={i} className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full border",
                    d.active ? "border-[#ff9f43]/60 bg-[#ff9f43]/20" : "border-white/10 bg-white/[0.03]",
                    d.today && !d.active && "border-white/40",
                  )}
                >
                  {d.active && <Flame className="size-3.5 fill-[#ff9f43] text-[#ffcf6e]" />}
                </span>
                <span className={cn("text-[11px]", d.today ? "font-semibold text-white" : "text-white/45")}>{d.label}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-4 text-center md:border-t-0 md:border-l md:pt-0 md:pl-8">
          {totals.map((t) => (
            <div key={t.l} className="flex flex-col gap-0.5">
              <span className="text-[22px] leading-7 font-medium tabular-nums">{t.v}</span>
              <span className="text-[12px] whitespace-nowrap text-white/50">{t.l}</span>
            </div>
          ))}
        </div>
      </div>
      <Link href="/lab" className="group flex items-center gap-3 border-t border-white/10 px-5 py-3 transition-colors hover:bg-white/[0.03]">
        <FlaskConical className="size-5 shrink-0 text-brand" />
        <span className="text-[15px] font-medium">Exercise lab</span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-white/55">Try all {ALL_TYPES.steps.length} interactive exercise types</span>
        <ChevronRight className="size-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  )
}

/**
 * Streak, totals and the exercise lab in one card: your week at a glance. The streak line and the
 * day row share one box (first and last circle sit on its edges, status on the right), like the
 * Uxcel streak card; consecutive days join into a run as in Duolingo's calendar; the totals sit
 * beside it as Coursera's weekly tracker does, centred on the whole block.
 */
function YourWeek({ progress }: { progress: Progress }) {
  const { streak, activeToday, week } = useStreak()
  const stats = academyStats(progress)
  const totals = [
    { v: fmtPoints(stats.xp), l: "Total XP" },
    { v: stats.lessons, l: "Lessons done" },
    { v: stats.testsPassed, l: "Units mastered" },
  ]
  return (
    <section className="glass overflow-hidden">
      <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,400px)_minmax(0,1fr)] md:gap-0">
        <div className="flex flex-col gap-4 md:pr-8">
          <div className="flex h-8 items-center justify-between gap-3">
            <p className="flex items-center gap-2">
              <Flame className={cn("-ml-0.5 size-6", activeToday ? "fill-[#ff9f43] text-[#ffcf6e]" : "text-white/40")} />
              <span className="text-[24px] leading-none font-medium tabular-nums">{streak}</span>
              <span className="text-[16px] text-white/70">day streak</span>
            </p>
            <span className={cn("text-[14px]", activeToday ? "text-[#ffcf6e]" : "text-white/50")}>
              {activeToday ? "Done for today" : "Train today to keep it"}
            </span>
          </div>
          <ol className="flex items-start" aria-label="This week">
            {week.map((d, i) => {
              const joined = d.active && week[i + 1]?.active
              return (
                <li key={i} className={cn("flex items-start", i < week.length - 1 && "flex-1")}>
                  <span className="flex w-8 flex-col items-center gap-1.5">
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-full border",
                        d.active ? "border-[#ff9f43]/60 bg-[#ff9f43]/20" : "border-white/10 bg-white/[0.03]",
                        d.today && !d.active && "border-white/40",
                      )}
                    >
                      {d.active && <Flame className="size-4 fill-[#ff9f43] text-[#ffcf6e]" />}
                    </span>
                    <span className={cn("text-[12px] leading-4", d.today ? "font-semibold text-white" : "text-white/50")}>{d.label}</span>
                  </span>
                  {i < week.length - 1 && (
                    <span aria-hidden className={cn("mt-[15px] h-0.5 flex-1", joined ? "bg-[#ff9f43]/50" : "bg-transparent")} />
                  )}
                </li>
              )
            })}
          </ol>
        </div>
        <div className="grid grid-cols-3 items-center border-t border-white/10 pt-5 text-center md:border-t-0 md:border-l md:pt-0 md:pl-8">
          {totals.map((t) => (
            <div key={t.l} className="flex flex-col gap-1">
              <span className="text-[24px] leading-7 font-medium tabular-nums">{t.v}</span>
              <span className="text-[13px] whitespace-nowrap text-white/50">{t.l}</span>
            </div>
          ))}
        </div>
      </div>
      <Link href="/lab" className="group flex items-center gap-3 border-t border-white/10 px-5 py-3 transition-colors hover:bg-white/[0.03]">
        <FlaskConical className="size-5 shrink-0 text-brand" />
        <span className="text-[15px] font-medium">Exercise lab</span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-white/55">Try all {ALL_TYPES.steps.length} interactive exercise types</span>
        <ChevronRight className="size-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  )
}
