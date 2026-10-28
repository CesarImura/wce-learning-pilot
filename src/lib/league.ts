// Academy Leagues (Duolingo-style), deliberately separate from the platform's
// trading Ranks: learners earn XP in lessons and compete in weekly groups of 20.
// The top 5 move up a league each Monday, the bottom 5 move down.
// Visual language follows the Figma frame (node 8342:4546): ore art per league.

import { rng } from "./market"
import type { Progress } from "./progress"

export type Ore = "bronze" | "silver" | "gold" | "obsidian"

export type League = {
  id: string
  name: string
  ore: Ore
  /** Unlocked the first time you reach this league. */
  rewards: string[]
  /** Typical weekly XP of a group member (drives the simulated competitors). */
  pace: number
}

export const LEAGUES: League[] = [
  { id: "bronze", name: "Bronze League", ore: "bronze", rewards: ["Video courses", "Exercise lab"], pace: 160 },
  { id: "silver", name: "Silver League", ore: "silver", rewards: ["Macrodashboard access"], pace: 260 },
  { id: "gold", name: "Gold League", ore: "gold", rewards: ["VIP support on IQ Capital", "Free 50K Eval"], pace: 380 },
  {
    id: "obsidian",
    name: "Obsidian League",
    ore: "obsidian",
    rewards: ["Free DeepCharts 3 months", "Free 50K Instant"],
    pace: 520,
  },
]

export const GROUP_SIZE = 20
export const PROMOTE = 5
export const DEMOTE = 5

export const ORE_ART: Record<Ore, string> = {
  bronze: "/wce/league/bronze.png",
  silver: "/wce/league/silver.png",
  gold: "/wce/league/gold.png",
  obsidian: "/wce/league/obsidian.png",
}

// ---------------------------------------------------------------------------
// Weeks (Monday 00:00 local → next Monday)

export function weekStart(d = new Date()) {
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
  return s
}
export const weekId = (d = new Date()) => {
  const s = weekStart(d)
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`
}
export function timeLeft(now = new Date()) {
  const end = weekStart(now)
  end.setDate(end.getDate() + 7)
  const ms = Math.max(0, end.getTime() - now.getTime())
  return { ms, days: Math.floor(ms / 86_400_000), hours: Math.floor((ms % 86_400_000) / 3_600_000) }
}
const weekFraction = (now: Date) => Math.min(1, Math.max(0, (now.getTime() - weekStart(now).getTime()) / (7 * 86_400_000)))

// ---------------------------------------------------------------------------
// Weekly group (simulated competitors for the prototype)

const HANDLES = [
  "Max Verstoploss", "Mcappe", "Schumaker", "Trade Status Jr.", "HODL my beer", "Candle Whisperer", "Bid Ask Betty",
  "Long Gamma Larry", "Pip Hunter", "Theta Gang", "Wick Rider", "Mean Reversion Mia", "Breakout Bob",
  "Delta Neutral", "Liquidity Lou", "The VWAP", "Stop Hunter", "Green Candle Gina", "Risk Off Rita",
  "Fair Value Fred", "Order Flow Olga", "Gap Filler", "Carry Trader", "Volume Node", "Failed Auction",
]

export type Standing = {
  rank: number
  name: string
  xp: number
  you: boolean
  zone: "promote" | "demote" | "safe"
}

/** The 20-person group for a league and week, with your XP slotted in. */
export function standings(league: number, week: string, yourXp: number, now = new Date()): Standing[] {
  const r = rng([...`${week}:${league}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7))
  const names = [...HANDLES].sort(() => r() - 0.5).slice(0, GROUP_SIZE - 1)
  const f = weekFraction(now)
  const pace = LEAGUES[league].pace
  const peers = names.map((name) => {
    // Some members barely play; a few grind. Each has their own rhythm through the week.
    const final = r() < 0.15 ? Math.round(r() * 40) : Math.round(pace * (0.35 + Math.pow(r(), 1.4) * 1.6))
    const curve = 0.6 + r() * 1.1
    return { name, xp: Math.round((final * Math.pow(f, curve)) / 5) * 5, you: false }
  })
  const all = [...peers, { name: "You", xp: yourXp, you: true }].sort((a, b) => b.xp - a.xp || (a.you ? -1 : 1))
  const top = league < LEAGUES.length - 1 ? PROMOTE : 0
  const bottom = league > 0 ? DEMOTE : 0
  return all.map((s, i) => ({
    ...s,
    rank: i + 1,
    zone: i < top ? "promote" : i >= GROUP_SIZE - bottom ? "demote" : "safe",
  }))
}

/** Your place this week plus what it takes to move up. */
export function weeklyStatus(league: number, week: string, yourXp: number, now = new Date()) {
  const table = standings(league, week, yourXp, now)
  const me = table.find((s) => s.you)!
  const canPromote = league < LEAGUES.length - 1
  const line = canPromote ? table[PROMOTE - 1] : undefined
  const inZone = me.rank <= PROMOTE
  // XP needed to pass the current #5 (0 if you're already in the zone).
  const toPromotion = line && !inZone ? line.xp - yourXp + 5 : 0
  // The promotion line: #5's XP while you're below it; once you're in, the best XP outside the zone (#6) chasing you.
  const cutXp = canPromote ? (inZone ? (table[PROMOTE]?.xp ?? 0) : line!.xp) : 0
  // The score to reach for a "you / goal" readout; 0 once you're in the zone (there's no goal left, just stay ahead).
  const goalXp = canPromote && !inZone ? yourXp + toPromotion : 0
  return { table, me, canPromote, cutXp, goalXp, toPromotion }
}

/**
 * What happens to you on Monday, said plainly: leagues only move when the week closes, so every standing readout
 * names the day and the league you'd land in.
 */
export function mondayNote(league: number, zone: Standing["zone"], toPromotion: number) {
  const up = LEAGUES[league + 1]
  const down = LEAGUES[league - 1]
  if (zone === "promote" && up) return `In the top ${PROMOTE}: you move up to ${up.name.replace(" League", "")} on Monday`
  if (zone === "demote" && down) return `Bottom ${DEMOTE}: you'd drop to ${down.name.replace(" League", "")} on Monday`
  if (!up) return "Top league: keep your place"
  return `${toPromotion} XP to the top ${PROMOTE}. Leagues move on Monday`
}

// ---------------------------------------------------------------------------
// Totals shown around the Academy (all-time, not weekly)

export function academyStats(p: Progress) {
  const results = Object.entries(p)
  return {
    xp: results.reduce((n, [, r]) => n + r.points, 0),
    lessons: results.filter(([k]) => !k.split("/")[1]?.startsWith("test-")).length,
    testsPassed: results.filter(([k]) => k.split("/")[1]?.startsWith("test-")).length,
  }
}
