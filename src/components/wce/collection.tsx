"use client"

// Coin collection: one struck coin per topic. Coins start tarnished and polish up as
// the learner works through the topic's courses; mastering every unit polishes it fully.

import Link from "next/link"
import { ArrowRight, Lock } from "lucide-react"
import { COURSES } from "@/lib/courses"
import { courseProgress, fmtPoints, topicProgress, useProgress, type Progress } from "@/lib/progress"
import { TOPIC_LIST, type Topic } from "@/lib/topics"
import { cn } from "@/lib/utils"
import { TopicCoin } from "./topic-coin"
import { useCourseArt } from "@/components/prototype-panel"

const STATE_LABEL = { locked: "Coming soon", new: "Not started", active: "Polishing", mastered: "Mastered" } as const

function CoinCard({ topic, progress }: { topic: Topic; progress: Progress }) {
  const tp = topicProgress(topic.id, progress)
  const art = useCourseArt()
  const locked = tp.state === "locked"
  const courses = COURSES.filter((c) => c.topic === topic.id)
  const next = tp.courses.find((c) => courseProgress(c, progress).next) ?? tp.courses[0]

  return (
    <div className={cn("glass flex gap-4 p-4 sm:flex-col sm:items-center sm:gap-5 sm:p-6 sm:text-center", locked && "opacity-80")}>
      <div
        className="grid shrink-0 place-items-center rounded-[10px] p-2 sm:w-full sm:py-6"
        style={art === "print" ? undefined : { backgroundImage: `radial-gradient(circle at 50% 50%, ${topic.color}1f, transparent 65%)` }}
      >
        <TopicCoin topicId={topic.id} size={176} className="max-sm:size-[104px]!" />
      </div>
      <div className="min-w-0 flex-1 space-y-2 sm:w-full">
        <div>
          <p className="eyebrow" style={{ color: locked ? undefined : topic.color }}>
            {STATE_LABEL[tp.state]}
          </p>
          <h2 className="font-serif text-[22px] leading-tight sm:text-[24px]">{topic.name}</h2>
        </div>
        {!locked && (
          <div className="space-y-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${tp.pct}%`, background: topic.color }} />
            </div>
            <p className="text-[12px] text-white/50 tabular-nums">
              {tp.done}/{tp.total} lessons · {tp.mastered}/{tp.units} units · {fmtPoints(tp.xp)} XP
            </p>
          </div>
        )}
        <ul className="space-y-0.5 text-[13px] text-white/60">
          {courses.map((c) => (
            <li key={c.id} className="truncate">
              {c.title}
              {c.mentor && <span className="text-white/40"> · {c.mentor}</span>}
            </li>
          ))}
        </ul>
        {locked ? (
          <p className="flex items-center gap-1.5 pt-1 text-[13px] text-white/45 sm:justify-center">
            <Lock className="size-3.5" /> Courses coming to Training
          </p>
        ) : (
          next && (
            <Link
              href={`/courses/${next.id}`}
              className="inline-flex items-center gap-1 pt-1 text-[13px] font-medium text-white hover:text-brand"
            >
              {tp.state === "new" ? "Start" : tp.state === "mastered" ? "Review" : "Continue"} {next.title}
              <ArrowRight className="size-3.5" />
            </Link>
          )
        )}
      </div>
    </div>
  )
}

export function Collection() {
  const progress = useProgress()
  const earned = TOPIC_LIST.filter((t) => topicProgress(t.id, progress).state === "mastered").length
  const open = TOPIC_LIST.filter((t) => topicProgress(t.id, progress).state !== "locked").length
  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 pt-6 pb-24 sm:pt-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-medium sm:text-[24px]">Coin collection</h1>
          <p className="max-w-[560px] text-[14px] text-white/60 sm:text-[15px]">
            One coin per topic, whoever teaches it. Coins start tarnished and polish up as you learn. Tap a coin to inspect it.
          </p>
        </div>
        <p className="text-[14px] text-white/60 tabular-nums">
          <span className="text-[22px] font-medium text-white">{earned}</span> / {open} mastered
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {TOPIC_LIST.map((t) => (
          <CoinCard key={t.id} topic={t} progress={progress} />
        ))}
      </div>
    </div>
  )
}
