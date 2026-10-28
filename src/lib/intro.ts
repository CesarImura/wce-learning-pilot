"use client"

// Launching Training to every student (Discovery, 27 Oct): a one-time announcement on the platform
// dashboard, then straight into Lesson 1 of the Beginner Series with a short primer, and only after
// that first lesson a classic spotlight tour of the Training home. localStorage for the prototype.

import { useSyncExternalStore } from "react"

export const INTRO_LESSON = { courseId: "beginner-series", lessonId: "not-a-business-model" } as const
export const INTRO_LESSON_HREF = `/courses/${INTRO_LESSON.courseId}/${INTRO_LESSON.lessonId}`
export const isIntroLesson = (courseId: string, lessonId: string) =>
  courseId === INTRO_LESSON.courseId && lessonId === INTRO_LESSON.lessonId

export type IntroState = {
  /** The dashboard announcement was shown (and closed or followed). */
  announced: boolean
  /** Training already sent the student to Lesson 1 once, or they found their own way past the home.
   *  The redirect never repeats, so every "back to Training" link keeps working. */
  routed: boolean
  /** The first-lesson primer was answered (started or skipped): Training stops sending the student to Lesson 1. */
  primed: boolean
  /** The home tour ran to the end or was skipped. */
  toured: boolean
}

const KEY = "wce-training-intro-v1"
const FRESH: IntroState = { announced: false, routed: false, primed: false, toured: false }
let cache: IntroState | null = null
const listeners = new Set<() => void>()

function read(): IntroState {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? { ...FRESH, ...JSON.parse(raw) } : FRESH
  } catch {
    cache = FRESH
  }
  return cache!
}

function write(next: IntroState) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** `null` until the client has read storage, so nothing intro-related flashes during prerender. */
export function useIntro(): IntroState | null {
  return useSyncExternalStore(subscribe, read, () => null)
}
export const readIntro = () => read()
export const markIntro = (patch: Partial<IntroState>) => write({ ...read(), ...patch })
export const resetIntro = () => write(FRESH)
