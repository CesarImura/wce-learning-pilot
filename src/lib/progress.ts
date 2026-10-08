"use client"

// Learner progress, kept in localStorage for the prototype.
// In production this moves to the backend. `points` here is Academy XP, which is
// separate from the platform's trading points and Ranks.

import { useSyncExternalStore } from "react"
import { COURSES, courseLessons, unitTestId, type Course, type Unit } from "./courses"

export type LessonResult = {
  points: number
  accuracy: number
  completedAt: number
  /** Unit tests only: bonus points included in `points`. */
  bonus?: number
}
export type Progress = Record<string, LessonResult>

const KEY = "wce-academy-progress-v1"
/** Points the mock user already has on the platform (matches the Figma header). */
export const BASE_POINTS = 2345

// A little seeded history so the catalog has something to "continue".
const SEED: Progress = {
  "trading-fundamentals/candles": { points: 20, accuracy: 100, completedAt: 0 },
}

const EMPTY: Progress = {}
let cache: Progress | null = null
const listeners = new Set<() => void>()

function read(): Progress {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? (JSON.parse(raw) as Progress) : SEED
  } catch {
    cache = SEED
  }
  return cache
}

function write(next: Progress) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable (private mode etc.): keep the in-memory copy.
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Current progress outside React (e.g. to compare before/after recording a result). */
export const readProgress = () => read()

export function useProgress() {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

export function recordLesson(courseId: string, lessonId: string, result: Omit<LessonResult, "completedAt">) {
  const key = `${courseId}/${lessonId}`
  const prev = read()[key]
  // Keep the best attempt.
  if (prev && prev.points >= result.points) return
  write({ ...read(), [key]: { ...result, completedAt: Date.now() } })
}

export function resetProgress() {
  write({})
}


export function courseProgress(course: Course, p: Progress) {
  const lessons = courseLessons(course)
  const done = lessons.filter((l) => p[`${course.id}/${l.id}`])
  const next = lessons.find((l) => !p[`${course.id}/${l.id}`])
  return {
    done: done.length,
    total: lessons.length,
    pct: lessons.length ? Math.round((done.length / lessons.length) * 100) : 0,
    // Lessons and unit tests (including their bonuses).
    points: Object.entries(p)
      .filter(([k]) => k.startsWith(`${course.id}/`))
      .reduce((n, [, r]) => n + r.points, 0),
    testsPassed: course.units.filter((u) => unitMastered(course, u, p)).length,
    next,
  }
}

export function unitComplete(course: Course, unit: Unit, p: Progress) {
  return unit.lessons.every((l) => p[`${course.id}/${l.id}`])
}

export function unitMastered(course: Course, unit: Unit, p: Progress) {
  return Boolean(p[`${course.id}/${unitTestId(unit)}`])
}

export const fmtPoints = (n: number) => n.toLocaleString("de-DE")

/** Progress rolled up per topic, across every course (and mentor) that teaches it. */
export function topicProgress(topicId: string, p: Progress) {
  const courses = COURSES.filter((c) => c.topic === topicId && c.status === "available")
  const lessons = courses.flatMap((c) => courseLessons(c).map((l) => `${c.id}/${l.id}`))
  const units = courses.flatMap((c) => c.units.map((u) => ({ c, u })))
  const done = lessons.filter((k) => p[k]).length
  const mastered = units.filter(({ c, u }) => unitMastered(c, u, p)).length
  const xp = Object.entries(p)
    .filter(([k]) => courses.some((c) => k.startsWith(`${c.id}/`)))
    .reduce((n, [, r]) => n + r.points, 0)
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0
  const state =
    courses.length === 0
      ? ("locked" as const)
      : units.length > 0 && mastered === units.length
        ? ("mastered" as const)
        : done > 0
          ? ("active" as const)
          : ("new" as const)
  return { courses, done, total: lessons.length, units: units.length, mastered, xp, pct, state }
}
