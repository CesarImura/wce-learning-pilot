"use client"

// League visuals, matched to the Figma "Ranks and Rewards" frame (node 8342:4546):
// 310px cards, 24px titles, ore discs with a thin outer ring, the current card
// taller with a warm gold border and progress ring, a "Rewards" pill divider
// (with laurels on the current card) and diamond-bulleted reward lists.

import { useEffect, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Check, ChevronRight, Lock } from "lucide-react"
import { LEAGUES, ORE_ART, PROMOTE, timeLeft, weekId, weeklyStatus, type League, type Ore } from "@/lib/league"
import { syncLeagueWeek, useLeague } from "@/lib/engagement"
import { cn } from "@/lib/utils"

/** Ore artwork on its dark disc, with the faint outer ring from the Figma cards. */
export function OreArt({ ore, mystery, className }: { ore: Ore; mystery?: boolean; className?: string }) {
  return (
    <div className={cn("relative aspect-square rounded-full p-[7%] ring-1 ring-white/10", className)}>
      <div
        className={cn(
          "relative size-full overflow-hidden rounded-full [container-type:size]",
          ore === "bronze" && "bg-[radial-gradient(circle_at_50%_35%,#7a5d40_0%,#2a2119_55%,#141110_100%)]",
          ore === "silver" && "bg-[radial-gradient(circle_at_50%_35%,#5c6166_0%,#25282b_55%,#121416_100%)]",
          ore === "gold" && "bg-[radial-gradient(circle_at_50%_35%,#6e5a22_0%,#2a2414_55%,#141210_100%)]",
          ore === "obsidian" && "bg-[radial-gradient(circle_at_50%_35%,#35566b_0%,#172631_55%,#0d1419_100%)]",
        )}
      >
        {ore === "silver" ? (
          // The silver render sits on white; the Figma file masks it with the ore outline.
          <div
            className="absolute inset-[6%] rotate-[15deg]"
            style={{
              maskImage: "url(/wce/league/silver-mask.svg)",
              maskRepeat: "no-repeat",
              maskSize: "50% 82%",
              maskPosition: "48% 40%",
            }}
          >
            <Image src={ORE_ART.silver} alt="" fill sizes="240px" className="object-cover" />
          </div>
        ) : (
          <Image
            src={ORE_ART[ore]}
            alt=""
            fill
            sizes="240px"
            className={cn(
              "object-contain p-[12%] drop-shadow-[0_18px_24px_rgba(0,0,0,0.6)]",
              mystery && "brightness-[0.55]",
            )}
          />
        )}
        {mystery && (
          <span className="absolute inset-0 grid place-items-center font-serif text-[30cqw] text-white/75">?</span>
        )}
      </div>
    </div>
  )
}

/** Gold progress ring around the current league's ore, with the small marker from the design. */
export function Ring({ pct, children }: { pct: number; children: ReactNode }) {
  const r = 47
  const c = 2 * Math.PI * r
  const a = (pct / 100) * 2 * Math.PI - Math.PI / 2
  return (
    <div className="relative">
      <svg viewBox="0 0 100 100" className="absolute inset-0 overflow-visible">
        <circle cx={50} cy={50} r={r} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth={2.5} strokeDasharray="0.8 1.4" />
        <circle
          cx={50}
          cy={50}
          r={r}
          fill="none"
          stroke="url(#league-ring)"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          transform="rotate(-90 50 50)"
          className="transition-[stroke-dasharray] duration-1000"
        />
        {pct > 2 && (
          <path
            d="M0,-3 L2.6,1.6 L-2.6,1.6 Z"
            transform={`translate(${50 + r * Math.cos(a)} ${50 + r * Math.sin(a) + 5.5}) rotate(180)`}
            fill="#f5ddb1"
          />
        )}
        <defs>
          <linearGradient id="league-ring" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff1c2" />
            <stop offset="100%" stopColor="#d4a93c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="p-[6%]">{children}</div>
    </div>
  )
}

/** Small laurel branch for the current card's "Rewards" pill. */
function Laurel({ flip }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 12 18" className={cn("h-3.5 w-2.5", flip && "-scale-x-100")} fill="currentColor" aria-hidden>
      <path d="M9 17 C4 13 3 8 6 2" fill="none" stroke="currentColor" strokeWidth="1" />
      <ellipse cx="4.2" cy="5" rx="1.4" ry="2.6" transform="rotate(-25 4.2 5)" />
      <ellipse cx="3.8" cy="9.5" rx="1.4" ry="2.6" transform="rotate(-40 3.8 9.5)" />
      <ellipse cx="5.6" cy="13.8" rx="1.4" ry="2.6" transform="rotate(-60 5.6 13.8)" />
    </svg>
  )
}

export type LeagueCardState = "achieved" | "current" | "locked"

export function LeagueTile({
  league,
  index,
  state,
  weekXp,
  promotionXp,
  rank,
  promotedRank,
}: {
  league: League
  index: number
  state: LeagueCardState
  weekXp: number
  promotionXp: number
  rank: number
  /** For achieved leagues: the rank you finished with when promoted out, if known. */
  promotedRank?: number
}) {
  const current = state === "current"
  const locked = state === "locked"
  const prev = LEAGUES[index - 1]
  const top = index === LEAGUES.length - 1
  return (
    <div
      className={cn(
        "relative flex h-full flex-col items-center overflow-hidden rounded-lg border px-5 pt-[30px] pb-7 text-center",
        current
          ? "min-h-[613px] border-[rgba(245,221,177,0.48)] bg-[linear-gradient(180deg,#2b2618_0%,#1b1913_45%,#121212_100%)] shadow-[0_0_80px_rgba(245,221,177,0.08)]"
          : "min-h-[591px] border-white/10 bg-white/[0.02]",
        locked && "bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.035)_0_1px,transparent_1px_9px)]",
      )}
    >
      <h3 className={cn("text-[24px] font-medium", locked ? "text-white/70" : "text-white")}>{league.name}</h3>

      <div className={cn("relative", current ? "mt-5 w-[240px] max-w-[85%]" : "mt-[30px] w-[220px] max-w-[80%]")}>
        {current ? (
          <Ring pct={Math.min(100, promotionXp ? (weekXp / promotionXp) * 100 : 100)}>
            <OreArt ore={league.ore} className="ring-0" />
          </Ring>
        ) : (
          <OreArt ore={locked ? "obsidian" : league.ore} mystery={locked} />
        )}
        {locked && (
          <span className="absolute bottom-[2%] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-[4px] bg-[#f5c451] px-2.5 py-1 text-[16px] font-medium whitespace-nowrap text-black">
            <Lock className="size-4" /> Reach {league.name.replace(" League", "")}
          </span>
        )}
      </div>

      {/* Middle block: quests (achieved), weekly progress (current) or entry rule (locked) */}
      <div className="mt-6 flex min-h-[72px] w-full flex-col items-center justify-start gap-2">
        {current &&
          (top ? (
            <p className="text-[24px] font-medium tabular-nums">
              {weekXp} <span className="text-white/40">XP this week</span>
            </p>
          ) : (
            <>
              <p className="text-[24px] font-medium tabular-nums">
                {weekXp} <span className="text-white/40">/ {Math.max(promotionXp, 5)} XP</span>
              </p>
              <p className="text-[14px] text-white/50">
                #{rank} this week · top {PROMOTE} move up
              </p>
            </>
          ))}
        {state === "achieved" &&
          [
            index === 0 ? "Join the Academy" : `Reach ${league.name}`,
            ...(promotedRank ? [`Finish #${promotedRank} to move up`] : []),
          ].map((q) => (
            <p key={q} className="flex items-center gap-2 text-[16px] text-white/60 line-through decoration-white/50">
              <span className="grid size-5 shrink-0 place-items-center rounded-[4px] bg-white/15">
                <Check className="size-3.5 text-white" strokeWidth={3} />
              </span>
              {q}
            </p>
          ))}
        {locked && prev && (
          <p className="text-[24px] font-medium text-white/30">Top {PROMOTE} in {prev.name.replace(" League", "")}</p>
        )}
      </div>

      <div className="mt-auto w-full">
        <div className="relative my-5 flex items-center justify-center">
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
          <span
            className={cn(
              "relative flex items-center gap-1 rounded-full border px-3 py-1 text-[14px] font-medium",
              current
                ? "border-[rgba(245,221,177,0.35)] bg-[#1b1913] text-[#f5ddb1]"
                : "border-white/10 bg-[#0d0d0d] text-white/30",
            )}
          >
            {current && <Laurel />}
            Rewards
            {current && <Laurel flip />}
          </span>
        </div>
        <ul className="space-y-1">
          {league.rewards.map((r) => (
            <li
              key={r}
              className={cn(
                "flex items-center justify-center gap-2 text-[16px] font-medium",
                current ? "text-white" : "text-white/60",
              )}
            >
              <span className="size-2 rotate-45 rounded-[1px] bg-[#f5c451]" />
              {r}
              {state === "achieved" && <Check className="size-4 text-up" />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Compact league status for sidebars. */
export function LeagueCard({ className }: { className?: string }) {
  const s = useLeague()
  useEffect(() => syncLeagueWeek(), [])
  // Time-dependent: render once the client clock is ready (nothing time-based is prerendered).
  if (!s.now)
    return <div className={cn("glass h-[158px] animate-pulse", className)} />
  const now = s.now
  const league = LEAGUES[s.league]
  const { me, toPromotion, canPromote } = weeklyStatus(s.league, weekId(now), s.weekXp, now)
  const left = timeLeft(now)
  return (
    <Link href="/league" className={cn("glass group block p-4 transition-colors hover:border-[#f5ddb1]/40", className)}>
      <div className="flex items-center justify-between">
        <p className="eyebrow">Your league</p>
        <span className="flex items-center gap-1 text-[12px] text-white/40">
          {left.days}d {left.hours}h left
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="w-20 shrink-0">
          <OreArt ore={league.ore} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[20px] leading-tight font-medium">{league.name}</p>
          <p className="mt-0.5 text-[14px] text-white/70">
            <span className="font-wide text-[13px] text-white">#{me.rank}</span> · {s.weekXp} XP this week
          </p>
          <p
            className={cn(
              "mt-0.5 text-[13px]",
              me.zone === "promote" ? "text-up" : me.zone === "demote" ? "text-down" : "text-white/50",
            )}
          >
            {me.zone === "promote"
              ? "In the promotion zone"
              : me.zone === "demote"
                ? "In the demotion zone: earn XP to stay"
                : canPromote
                  ? `${toPromotion} XP to the promotion zone`
                  : "Top league"}
          </p>
        </div>
      </div>
    </Link>
  )
}
