"use client"

// Results-page recommendations when a learner struggles: the lessons to review
// (with the exact moment in the course video) and a "practice your mistakes" run.

import { useState } from "react"
import Link from "next/link"
import { BookOpen, PlayCircle, RotateCcw, X } from "lucide-react"
import { getCourse, courseLessons } from "@/lib/courses"
import type { Lesson, Step } from "@/lib/lessons"
import { cn } from "@/lib/utils"
import { TopicCoin } from "@/components/wce/topic-coin"

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

type Missed = { step: Step; lessonId: string }

export function ReviewPanel({
  courseId,
  lesson,
  missed,
  onPracticeMistakes,
}: {
  courseId: string
  /** The lesson or test just played. */
  lesson: Lesson
  missed: Step[]
  onPracticeMistakes: () => void
}) {
  const [video, setVideo] = useState<{ lesson: Lesson; at: number } | null>(null)
  const course = getCourse(courseId)
  const lessons = course ? courseLessons(course) : []

  // Group misses by the lesson they review (tests) or the lesson itself.
  const groups = new Map<string, Missed[]>()
  for (const step of missed) {
    const id = step.source ?? lesson.id
    groups.set(id, [...(groups.get(id) ?? []), { step, lessonId: id }])
  }

  return (
    <section className="w-full space-y-3 text-left">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Recommended review</p>
          <p className="text-[14px] text-white/60">A few concepts didn&apos;t stick yet. Here&apos;s where to look.</p>
        </div>
      </div>

      <button
        onClick={onPracticeMistakes}
        className="flex w-full items-center gap-3 rounded-lg border border-brand/40 bg-brand/[0.08] p-3 text-left transition-colors hover:bg-brand/[0.14]"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand/20 text-brand-pale">
          <RotateCcw className="size-5" />
        </span>
        <span className="flex-1">
          <span className="block text-[15px] font-medium">Practice your mistakes</span>
          <span className="block text-[13px] text-white/55">
            Retry the {missed.length} question{missed.length > 1 ? "s" : ""} you missed, right now
          </span>
        </span>
      </button>

      {[...groups.entries()].map(([id, items]) => {
        const target = lessons.find((l) => l.id === id) ?? lesson
        const at = Math.min(...items.map((m) => m.step.at ?? Infinity))
        return (
          <div key={id} className="glass flex flex-wrap items-center gap-3 rounded-[8px] p-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">{target.title}</p>
              <p className="text-[13px] text-white/55">
                Missed {items.length} question{items.length > 1 ? "s" : ""} on this lesson
              </p>
            </div>
            <div className="flex gap-2">
              {target.video && Number.isFinite(at) && (
                <button
                  onClick={() => setVideo({ lesson: target, at })}
                  className="flex h-9 items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 text-[13px] text-white/85 hover:bg-white/10"
                >
                  <PlayCircle className="size-4" /> Rewatch at {fmtTime(at)}
                </button>
              )}
              {course && target.id !== lesson.id && (
                <Link
                  href={`/courses/${courseId}/${target.id}`}
                  className="flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-[13px] font-semibold text-black hover:bg-white/85"
                >
                  <BookOpen className="size-4" /> Review lesson
                </Link>
              )}
            </div>
          </div>
        )
      })}

      {video && course && <VideoSheet courseId={courseId} lesson={video.lesson} at={video.at} onClose={() => setVideo(null)} />}
    </section>
  )
}

/** Stand-in for the Student Area player: shows exactly which video moment would open. */
export function VideoSheet({ courseId, lesson, at, onClose }: { courseId: string; lesson: Lesson; at: number; onClose: () => void }) {
  const course = getCourse(courseId)!
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-xl border border-white/10 bg-[#111315] animate-in fade-in slide-in-from-bottom-4 sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative grid aspect-video place-items-center bg-[radial-gradient(circle_at_50%_45%,#1d232a,#0b0d0f_70%)]">
          <TopicCoin topicId={course.topic} size={120} />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <PlayCircle className="size-14 text-white/90 drop-shadow-lg" strokeWidth={1.2} />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <div className="h-full bg-white" style={{ width: "30%" }} />
          </div>
          <button aria-label="Close" onClick={onClose} className="absolute top-3 right-3 rounded-full bg-black/60 p-1.5">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-1 p-4">
          <p className="text-[12px] tracking-wide text-white/45 uppercase">{lesson.video?.title}</p>
          <p className="text-[17px] font-medium">
            {lesson.title} <span className={cn("text-brand-soft")}>· from {fmtTime(at)}</span>
          </p>
          <p className="text-[13px] text-white/50">
            In the live platform this opens the Student Area player at {fmtTime(at)}. (Video links are mocked in this
            prototype.)
          </p>
        </div>
      </div>
    </div>
  )
}
