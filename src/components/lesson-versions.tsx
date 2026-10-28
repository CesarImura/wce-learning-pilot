"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Lesson } from "@/lib/lessons"
import { getCourse } from "@/lib/courses"
import { isIntroLesson, markIntro, useIntro } from "@/lib/intro"
import { useProgress } from "@/lib/progress"
import { track } from "@/lib/analytics"
import { LessonPlayer } from "@/components/lesson-player"
import { LessonPlayerV1 } from "@/components/lesson-player-v1"
import { LessonPrimer } from "@/components/wce/lesson-primer"
import { readLayout, saveLayout, type Layout } from "@/components/prototype-panel"

/** Prototype comparison: plays the lesson in the layout picked on the floating panel (remembered per browser). */
export function LessonVersions(props: { lesson: Lesson; courseId: string; backHref: string }) {
  const [layout, setLayout] = useState<Layout>(readLayout)
  const choose = (next: Layout) => {
    saveLayout(next)
    setLayout(next)
  }

  // Training launch: Lesson 1 of the Beginner Series opens on a primer until it's done once, and while
  // the home tour is still ahead, leaving the lesson goes to the Training home (where the tour waits).
  const intro = useIntro()
  const progress = useProgress()
  const router = useRouter()
  const [started, setStarted] = useState(false)
  const introLesson = isIntroLesson(props.courseId, props.lesson.id) && !!intro && !intro.toured
  const done = !!progress[`${props.courseId}/${props.lesson.id}`]
  if (introLesson && !done && !started) {
    const course = getCourse(props.courseId)
    return (
      <LessonPrimer
        lesson={props.lesson}
        courseTitle={course?.title ?? ""}
        mentor={course?.mentor}
        onStart={() => {
          track("training_primer_clicked", { action: "start" })
          markIntro({ primed: true })
          setStarted(true)
        }}
        onSkip={() => {
          track("training_primer_clicked", { action: "skip" })
          markIntro({ primed: true })
          router.push("/courses")
        }}
      />
    )
  }
  const shown = introLesson ? { ...props, backHref: "/courses" } : props
  return layout === "v1" ? <LessonPlayerV1 {...shown} onLayout={choose} /> : <LessonPlayer {...shown} onLayout={choose} />
}
