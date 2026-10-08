"use client"

import { Coin } from "@/components/coin/coin"
import { fmtPoints, topicProgress, useProgress } from "@/lib/progress"
import { TOPICS, type TopicId } from "@/lib/topics"

/** A topic's coin with live progress; its reverse (in the inspector) shows lessons, units and XP. */
export function TopicCoin({
  topicId,
  size,
  float,
  className,
}: {
  topicId: TopicId
  size: number
  float?: boolean
  className?: string
}) {
  const p = useProgress()
  const topic = TOPICS[topicId]
  const tp = topicProgress(topicId, p)
  return (
    <Coin
      topic={topic}
      state={tp.state}
      pct={tp.state === "mastered" ? 100 : tp.pct}
      size={size}
      float={float}
      className={className}
      stats={
        tp.state === "locked"
          ? { primary: "Soon", lines: ["Coming to the Academy"] }
          : {
              primary: tp.state === "mastered" ? "Mastered" : `${tp.pct}%`,
              lines: [`${tp.done}/${tp.total} lessons`, `${fmtPoints(tp.xp)} XP`],
            }
      }
    />
  )
}
