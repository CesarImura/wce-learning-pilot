"use client"

import { useState } from "react"
import type { Lesson } from "@/lib/lessons"
import { LessonPlayer } from "@/components/lesson-player"
import { LessonPlayerV1 } from "@/components/lesson-player-v1"
import { readLayout, saveLayout, type Layout } from "@/components/prototype-panel"

/** Prototype comparison: plays the lesson in the layout picked on the floating panel (remembered per browser). */
export function LessonVersions(props: { lesson: Lesson; courseId: string; backHref: string }) {
  const [layout, setLayout] = useState<Layout>(readLayout)
  const choose = (next: Layout) => {
    saveLayout(next)
    setLayout(next)
  }
  return layout === "v1" ? <LessonPlayerV1 {...props} onLayout={choose} /> : <LessonPlayer {...props} onLayout={choose} />
}
