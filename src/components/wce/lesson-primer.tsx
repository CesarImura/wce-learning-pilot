"use client"

// First lesson primer (Training launch): before Lesson 1 of the Beginner Series, one screen of context
// in the Brilliant / Duolingo way. Not "this is where things live", but what this lesson is about,
// why mistakes are safe here, and one button into it.

import { useEffect, type CSSProperties } from "react"
import Image from "next/image"
import { ArrowRight, BookOpen, RotateCcw, X } from "lucide-react"
import type { Lesson } from "@/lib/lessons"
import { track } from "@/lib/analytics"

export function LessonPrimer({
  lesson,
  courseTitle,
  mentor,
  onStart,
  onSkip,
}: {
  lesson: Lesson
  courseTitle: string
  mentor?: string
  onStart: () => void
  onSkip: () => void
}) {
  useEffect(() => track("training_primer_viewed", {}), [])
  const reads = lesson.steps.filter((s) => s.mode === "learn").length
  const questions = lesson.steps.length - reads
  const first = mentor?.split(" ")[0] ?? "the mentor"
  const points = [
    {
      icon: RotateCcw,
      title: "Mistakes cost nothing here",
      text: "Get one wrong and you see why straight away. Every question you miss comes back once at the end.",
    },
    {
      icon: BookOpen,
      title: "Read it, then try it",
      text: `${reads} short reads from ${first}’s class, then ${questions} questions on what you just read.`,
    },
  ]
  return (
    <main className="relative grid min-h-dvh overflow-hidden bg-black lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Mentor photo: right half on desktop, a dimmed backdrop on phones. */}
      <div aria-hidden className="absolute inset-0 lg:relative lg:order-2">
        <Image
          src="/wce/mentors/andrea-cimitan.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="launch-scrim object-cover object-top opacity-40 grayscale lg:opacity-80"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#000_0%,rgba(0,0,0,.6)_35%,transparent_75%)] max-lg:bg-black/50" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
      </div>

      <button
        onClick={onSkip}
        aria-label="Not now"
        className="absolute top-5 right-5 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
      >
        <X className="size-5" />
      </button>

      <div className="relative flex flex-col justify-center gap-8 px-6 py-16 sm:px-12 lg:px-20 xl:px-28">
        <div className="space-y-4">
          <p className="launch-rise text-[16px] text-[#bae5ff]" style={{ "--d": "150ms" } as CSSProperties}>
            Your first lesson · {courseTitle}
          </p>
          <h1
            className="launch-rise font-serif text-[44px] leading-[1.05] tracking-[-0.02em] sm:text-[56px]"
            style={{ "--d": "250ms" } as CSSProperties}
          >
            Practice without fear.
          </h1>
          <p className="launch-rise max-w-[520px] text-[18px] leading-7 text-white/70" style={{ "--d": "350ms" } as CSSProperties}>
            {mentor ?? "Your mentor"} opens the course with the uncomfortable part: finance wasn’t built for you to make a living
            from it. In <span className="text-white">{lesson.title}</span> you’ll see why, and what you need before your first
            trade.
          </p>
        </div>

        <ul className="flex max-w-[520px] flex-col gap-5">
          {points.map((p, i) => (
            <li
              key={p.title}
              className="launch-rise flex gap-4"
              style={{ "--d": `${500 + i * 90}ms` } as CSSProperties}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5">
                <p.icon className="size-[18px] text-[#bae5ff]" />
              </span>
              <span className="space-y-0.5">
                <span className="block text-[16px] font-medium">{p.title}</span>
                <span className="block text-[15px] leading-6 text-white/60">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="launch-rise flex flex-wrap items-center gap-x-5 gap-y-3" style={{ "--d": "750ms" } as CSSProperties}>
          <button
            autoFocus
            onClick={onStart}
            className="flex h-12 items-center gap-2 rounded-[6px] bg-white px-6 text-[16px] font-medium text-black transition-[background-color,scale] duration-150 hover:bg-white/90 active:scale-[0.97]"
          >
            Start lesson 1 <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </main>
  )
}
