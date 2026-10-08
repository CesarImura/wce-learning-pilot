"use client"

// Daily streak, one-time "firsts" and the sound preference. localStorage for the prototype.

import { useSyncExternalStore } from "react"
import { weekId, weekStart, weeklyStatus } from "./league"

/**
 * A tiny localStorage-backed store. `initial` is the static server snapshot;
 * `seed` (client only) fills in demo data when nothing is stored yet.
 */
function createStore<T>(key: string, initial: T, seed?: () => T) {
  let cache: T | null = null
  const listeners = new Set<() => void>()
  const read = (): T => {
    if (cache) return cache
    try {
      const raw = localStorage.getItem(key)
      cache = raw ? { ...initial, ...JSON.parse(raw) } : (seed?.() ?? initial)
    } catch {
      cache = initial
    }
    return cache!
  }
  const write = (next: T) => {
    cache = next
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // Storage unavailable: keep in memory.
    }
    listeners.forEach((l) => l())
  }
  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }
  const use = () => useSyncExternalStore(subscribe, read, () => initial)
  return { read, write, use }
}

// ---------------------------------------------------------------------------
// Daily streak

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

const streakStore = createStore<{ days: string[] }>("wce-academy-streak-v1", { days: [] })

function streakLength(days: Set<string>, from: Date) {
  let n = 0
  const d = new Date(from)
  while (days.has(dayKey(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

/** The current week (Mon–Sun) with which days had activity. */
function weekOf(days: Set<string>, today: Date) {
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return { label: "MTWTFSS"[i], active: days.has(dayKey(d)), today: dayKey(d) === dayKey(today) }
  })
}

/** Records today's activity. `newDay` is true the first time each day (that's when we celebrate). */
export function recordActivity(now = new Date()) {
  const days = new Set(streakStore.read().days)
  const newDay = !days.has(dayKey(now))
  if (newDay) {
    days.add(dayKey(now))
    streakStore.write({ days: [...days].sort().slice(-400) })
  }
  return { newDay, streak: streakLength(days, now), week: weekOf(days, now) }
}

// ---------------------------------------------------------------------------
// Client clock: time-dependent UI reads the current minute here, so nothing
// time-based is evaluated while the page is prerendered (0 on the server).

const subscribeMinute = (cb: () => void) => {
  const id = setInterval(cb, 30_000)
  return () => clearInterval(id)
}
export function useNowMinute() {
  return useSyncExternalStore(subscribeMinute, () => Math.floor(Date.now() / 60_000), () => 0)
}

export function useStreak() {
  const { days } = streakStore.use()
  const minute = useNowMinute()
  if (!minute) return { streak: 0, activeToday: false, week: [] as ReturnType<typeof weekOf> }
  const set = new Set(days)
  const now = new Date(minute * 60_000)
  // A streak survives until the end of the day after the last activity.
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const streak = set.has(dayKey(now)) ? streakLength(set, now) : streakLength(set, yesterday)
  return { streak, activeToday: set.has(dayKey(now)), week: weekOf(set, now) }
}

// ---------------------------------------------------------------------------
// One-time "firsts"

export type FirstKind = "first-lesson" | "first-flawless-test" | "first-course"
const firstsStore = createStore<Partial<Record<FirstKind, number>>>("wce-academy-firsts-v1", {})

/** Marks a first; returns true only the very first time. */
export function claimFirst(kind: FirstKind) {
  const cur = firstsStore.read()
  if (cur[kind]) return false
  firstsStore.write({ ...cur, [kind]: Date.now() })
  return true
}

// ---------------------------------------------------------------------------
// Sound (off by default)

const soundStore = createStore<{ on: boolean }>("wce-academy-sound-v1", { on: false })
export const soundOn = () => soundStore.read().on
export const setSound = (on: boolean) => soundStore.write({ on })
export const useSound = () => soundStore.use().on

// ---------------------------------------------------------------------------
// XP log (every completion earns XP, including repeats) and league membership

type XpEvent = { t: number; xp: number }
const xpStore = createStore<{ events: XpEvent[] }>("wce-academy-xp-v1", { events: [] })

export function addXp(xp: number, now = Date.now()) {
  if (xp <= 0) return
  const events = [...xpStore.read().events, { t: now, xp }].slice(-2000)
  xpStore.write({ events })
}

export function xpInWeek(events: XpEvent[], week: string) {
  return events.filter((e) => weekId(new Date(e.t)) === week).reduce((n, e) => n + e.xp, 0)
}

export type WeekResult = { week: string; from: number; to: number; rank: number }

type LeagueState = {
  league: number
  week: string
  /** Highest league ever reached (rewards stay unlocked). */
  best: number
  history: WeekResult[]
  /** Last rollover result, shown once on the league page. */
  pending?: WeekResult
}

// Demo seed: promoted from Bronze last week, now competing in Silver.
function seedLeague(): LeagueState {
  const last = new Date()
  last.setDate(last.getDate() - 7)
  return { league: 1, week: weekId(), best: 1, history: [{ week: weekId(last), from: 0, to: 1, rank: 3 }] }
}
const leagueStore = createStore<LeagueState>(
  "wce-academy-league-v1",
  { league: 1, week: "", best: 1, history: [] },
  seedLeague,
)

// Demo seed for the XP log: a bit of activity earlier this week.
if (typeof window !== "undefined" && xpStore.read().events.length === 0) {
  const start = weekStart().getTime()
  const now = Date.now()
  const seed = [60, 45, 70].map((xp, i) => ({ t: Math.min(now - 60_000, start + (i + 1) * 3_600_000 * 7), xp }))
  xpStore.write({ events: seed.filter((e) => e.t >= start) })
}

/** Applies Monday's promotion/demotion if a week has rolled over. Safe to call often. */
export function syncLeagueWeek(now = new Date()) {
  const s = leagueStore.read()
  const current = weekId(now)
  if (s.week === current) return
  // Settle the week that just ended, at its final state.
  const end = weekStart(now)
  end.setMilliseconds(-1)
  const xp = xpInWeek(xpStore.read().events, s.week)
  const { me } = weeklyStatus(s.league, s.week, xp, end)
  const to = me.zone === "promote" ? s.league + 1 : me.zone === "demote" ? s.league - 1 : s.league
  const result = { week: s.week, from: s.league, to, rank: me.rank }
  leagueStore.write({
    league: to,
    week: current,
    best: Math.max(s.best, to),
    history: [...s.history, result].slice(-52),
    pending: result,
  })
}

export const dismissLeagueResult = () => leagueStore.write({ ...leagueStore.read(), pending: undefined })

export function readLeague() {
  const s = leagueStore.read()
  return { ...s, weekXp: xpInWeek(xpStore.read().events, weekId()) }
}

/** League membership + this week's XP, live. `now` is null until the client clock is available. */
export function useLeague() {
  const s = leagueStore.use()
  const { events } = xpStore.use()
  const minute = useNowMinute()
  const now = minute ? new Date(minute * 60_000) : null
  return { ...s, now, weekXp: now ? xpInWeek(events, weekId(now)) : 0 }
}

// ---------------------------------------------------------------------------
// Topic token look (testing two directions: struck "coins" vs cosmic "stones")

export type TokenLook = "coins" | "stones"
const lookStore = createStore<{ look: TokenLook }>("wce-academy-look-v1", { look: "coins" })
export const useTokenLook = () => lookStore.use().look
export const setTokenLook = (look: TokenLook) => lookStore.write({ look })

/** Topics whose stone has already cracked out of its geode (the reveal plays once). */
const revealStore = createStore<{ topics: string[] }>("wce-academy-revealed-v1", { topics: [] })
export const useRevealed = () => revealStore.use().topics
export function markRevealed(topic: string) {
  const { topics } = revealStore.read()
  if (!topics.includes(topic)) revealStore.write({ topics: [...topics, topic] })
}
export const resetRevealed = () => revealStore.write({ topics: [] })
