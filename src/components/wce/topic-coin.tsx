"use client"

import { Coin } from "@/components/coin/coin"
import { setTokenLook, useTokenLook, type TokenLook } from "@/lib/engagement"
import { fmtPoints, topicProgress, useProgress } from "@/lib/progress"
import { TOPICS, type TopicId } from "@/lib/topics"
import { cn } from "@/lib/utils"

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
  const look = useTokenLook()
  const topic = TOPICS[topicId]
  const tp = topicProgress(topicId, p)
  return (
    <Coin
      topic={topic}
      state={tp.state}
      pct={tp.state === "mastered" ? 100 : tp.pct}
      size={size}
      look={look}
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

const LOOKS: { id: TokenLook; label: string }[] = [
  { id: "coins", label: "Coins" },
  { id: "stones", label: "Stones" },
]

/** Switch every topic token between the two looks being tested. */
export function TokenLookToggle({ className }: { className?: string }) {
  const look = useTokenLook()
  return (
    <div className={cn("flex items-center rounded-xl border border-white/10 bg-white/5 p-1", className)}>
      {LOOKS.map((l) => (
        <button
          key={l.id}
          onClick={() => setTokenLook(l.id)}
          className={cn(
            "h-[30px] rounded-lg px-3 text-[13px] font-medium transition-all",
            look === l.id ? "border border-white/10 bg-white/10 text-white" : "border border-transparent text-white/55 hover:text-white",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
