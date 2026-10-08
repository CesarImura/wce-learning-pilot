"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, Info, Trophy, X } from "lucide-react"
import { FLAWLESS_BONUS, POINTS_PER_CORRECT, UNIT_BONUS } from "@/lib/courses"
import { DEMOTE, GROUP_SIZE, LEAGUES, PROMOTE, timeLeft, weekId, weeklyStatus, type Standing } from "@/lib/league"
import { dismissLeagueResult, syncLeagueWeek, useLeague } from "@/lib/engagement"
import { cn } from "@/lib/utils"
import { LeagueTile, OreArt } from "./league"

export function LeaguePage() {
  const s = useLeague()
  useEffect(() => syncLeagueWeek(), [])
  // Time-dependent: render once the client clock is ready (nothing time-based is prerendered).
  if (!s.now)
    return <div className="mx-auto h-[720px] max-w-[1680px] px-4 pt-6 lg:px-10" />
  const now = s.now
  const league = LEAGUES[s.league]
  const next = LEAGUES[s.league + 1]
  const { table, me, promotionXp, canPromote } = weeklyStatus(s.league, weekId(now), s.weekXp, now)
  const left = timeLeft(now)
  const promotedRank = (i: number) => s.history.find((h) => h.from === i && h.to === i + 1)?.rank

  return (
    <div className="relative overflow-x-clip">
      {/* Faint concentric circles behind the cards, as in the Figma frame */}
      <div aria-hidden className="pointer-events-none absolute top-[420px] left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[1823, 1790, 1743].map((d) => (
          <div
            key={d}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]"
            style={{ width: d, height: d * 0.97 }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-[1680px] space-y-10 px-4 pt-6 pb-24 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-medium">Leagues</h1>
            <p className="text-[16px] text-white/60">
              Earn XP in lessons to climb from Bronze to Obsidian. Separate from your trading Ranks.
            </p>
          </div>
          <a
            href="#how-it-works"
            className="flex h-10 items-center gap-2 rounded-lg bg-white/10 px-4 text-[16px] font-medium text-white/70 hover:bg-white/15"
          >
            <Info className="size-4" /> How leagues work
          </a>
        </div>

        {s.pending && <WeekResultBanner result={s.pending} onClose={dismissLeagueResult} />}

        {/* League cards: swipeable on small screens (opens on the current league), a row on desktop */}
        <div className="-mx-4 flex snap-x snap-mandatory items-center gap-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {LEAGUES.map((l, i) => (
            <div
              key={l.id}
              className="w-[80%] max-w-[310px] shrink-0 snap-center sm:w-[44%] lg:w-auto lg:max-w-none"
              ref={(el) => {
                const row = el?.parentElement
                if (el && row && i === s.league && row.scrollLeft === 0 && row.scrollWidth > row.clientWidth)
                  row.scrollLeft = el.offsetLeft - (row.clientWidth - el.clientWidth) / 2
              }}
            >
              <LeagueTile
                league={l}
                index={i}
                state={i < s.league ? "achieved" : i === s.league ? "current" : "locked"}
                weekXp={s.weekXp}
                promotionXp={promotionXp}
                rank={me.rank}
                promotedRank={promotedRank(i)}
              />
            </div>
          ))}
          <div className="flex min-h-[591px] w-[80%] max-w-[310px] shrink-0 snap-center flex-col items-center justify-center rounded-lg border border-white/10 bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.035)_0_1px,transparent_1px_9px)] px-6 text-center sm:w-[44%] lg:w-auto lg:max-w-none">
            <p className="text-[24px] font-medium">Coming Soon!</p>
            <p className="mt-2 text-[16px] text-white/60">Keep it going, there are more leagues and rewards to come in the future!</p>
          </div>
        </div>

        {/* Quest to next league */}
        {canPromote && next && (
          <section className="mx-auto max-w-[446px] space-y-2">
            <p className="text-center text-[14px] font-medium tracking-wide text-white/40 uppercase">Quest to next league</p>
            <div className="flex items-stretch gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-2 backdrop-blur">
              <LeagueNumber n={s.league + 1} />
              <div className="flex-1 space-y-2 py-1">
                <p className="text-[16px]">Finish in the top {PROMOTE} this week</p>
                <div className="h-1.5 overflow-hidden rounded-full bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.14)_0_5px,transparent_5px_8px)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#d4a93c] to-[#f5ddb1] transition-all duration-700"
                    style={{ width: `${Math.min(100, promotionXp ? (s.weekXp / promotionXp) * 100 : 0)}%` }}
                  />
                </div>
                <p className="text-[14px] text-white/60 tabular-nums">
                  {s.weekXp}/{promotionXp} XP · {left.days}d {left.hours}h left
                </p>
              </div>
              <LeagueNumber n={s.league + 2} />
            </div>
          </section>
        )}

        {/* This week's group */}
        <section className="mx-auto max-w-3xl space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10">
                <OreArt ore={league.ore} />
              </div>
              <div>
                <h2 className="text-[18px] font-medium">This week in {league.name}</h2>
                <p className="text-[13px] text-white/50">
                  {GROUP_SIZE} learners · resets Monday · {left.days}d {left.hours}h left
                </p>
              </div>
            </div>
          </div>
          <div className="glass overflow-hidden">
            {table.map((row, i) => (
              <div key={row.name}>
                {i === PROMOTE && canPromote && <ZoneDivider kind="promote" />}
                {i === GROUP_SIZE - DEMOTE && s.league > 0 && <ZoneDivider kind="demote" />}
                <StandingRow row={row} />
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="glass mx-auto max-w-4xl scroll-mt-28 p-6">
          <h2 className="mb-5 text-[18px] font-medium">How leagues work</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                t: "Earn XP",
                d: `+${POINTS_PER_CORRECT} XP per correct exercise, combo bonuses, +${UNIT_BONUS} XP per unit test (+${FLAWLESS_BONUS} flawless). Replays count too.`,
              },
              {
                t: "Compete weekly",
                d: `You're grouped with ${GROUP_SIZE - 1} other learners. Every Monday the top ${PROMOTE} move up a league and the bottom ${DEMOTE} move down (not below Bronze).`,
              },
              {
                t: "Unlock rewards",
                d: "Reaching a league for the first time unlocks its rewards for good. Leagues are about learning; trading performance lives in Ranks.",
              },
            ].map((x) => (
              <div key={x.t}>
                <p className="text-[16px] font-medium text-[#f5ddb1]">{x.t}</p>
                <p className="mt-1 text-[14px] text-white/60">{x.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[13px] text-white/40">
            <Link href="/courses" className="text-white underline underline-offset-4">
              Keep learning
            </Link>{" "}
            to earn XP this week.
          </p>
        </section>
      </div>
    </div>
  )
}

function LeagueNumber({ n }: { n: number }) {
  return (
    <span className="grid w-14 shrink-0 place-items-center rounded-[6px] bg-white/[0.06] font-wide text-[16px] tracking-[0.05em]">
      {String(n).padStart(2, "0")}
    </span>
  )
}

function ZoneDivider({ kind }: { kind: "promote" | "demote" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-y px-4 py-1.5 text-[12px] font-medium tracking-wide uppercase",
        kind === "promote" ? "border-up/20 bg-up/[0.06] text-up" : "border-down/20 bg-down/[0.06] text-down",
      )}
    >
      {kind === "promote" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
      {kind === "promote" ? "Promotion zone above" : "Demotion zone below"}
    </div>
  )
}

const MEDAL = ["text-[#ffda74] bg-[#ffda74]/10", "text-[#d2d2d2] bg-[#d2d2d2]/10", "text-[#e3b991] bg-[#e3b991]/10"]

function StandingRow({ row }: { row: Standing }) {
  const initials = row.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-white/[0.06] px-3 py-2 first:border-t-0",
        row.you && "bg-white/[0.07]",
      )}
    >
      <span
        className={cn(
          "flex w-14 shrink-0 items-center justify-center gap-1 rounded-full py-1 text-[14px] font-medium tabular-nums",
          row.rank <= 3 ? MEDAL[row.rank - 1] : "bg-white/[0.02] text-white/60",
        )}
      >
        {row.rank <= 3 && <Trophy className="size-3.5" />}
        {row.rank <= 3 ? ["1st", "2nd", "3rd"][row.rank - 1] : String(row.rank).padStart(2, "0")}
      </span>
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
          row.you ? "bg-brand/25 text-brand-pale" : "bg-white/10 text-white/70",
        )}
      >
        {row.you ? "PK" : initials}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2 text-[15px]">
        <span className="truncate">{row.you ? "Phillip Krawath" : row.name}</span>
        {row.you && <span className="rounded-md bg-[#ffda74] px-1.5 py-0.5 text-[11px] font-semibold text-black">YOU</span>}
      </span>
      <span className="text-[15px] font-medium tabular-nums">
        {row.xp} <span className="text-[12px] text-white/50 uppercase">XP</span>
      </span>
    </div>
  )
}

function WeekResultBanner({ result, onClose }: { result: { from: number; to: number; rank: number }; onClose: () => void }) {
  const up = result.to > result.from
  const down = result.to < result.from
  const l = LEAGUES[result.to]
  return (
    <div
      className={cn(
        "relative flex items-center gap-4 rounded-lg border p-4",
        up ? "border-[#f5ddb1]/50 bg-[#2b2618]/60" : down ? "border-down/40 bg-down/[0.06]" : "border-white/10 bg-white/[0.04]",
      )}
    >
      <div className="w-14 shrink-0">
        <OreArt ore={l.ore} />
      </div>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.18em] text-[#f5ddb1] uppercase">Last week&apos;s result</p>
        <p className="text-[17px] font-medium">
          {up ? `Promoted to ${l.name}!` : down ? `Moved down to ${l.name}` : `You stayed in ${l.name}`}{" "}
          <span className="text-white/50">You finished #{result.rank}.</span>
        </p>
        {up && <p className="text-[13px] text-white/60">Unlocked: {l.rewards.join(", ")}</p>}
      </div>
      <button aria-label="Dismiss" onClick={onClose} className="absolute top-3 right-3 text-white/40 hover:text-white">
        <X className="size-4" />
      </button>
    </div>
  )
}
