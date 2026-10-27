"use client"

import { useState } from "react"
import { Coin } from "@/components/coin/coin"
import { PrintObject } from "@/components/print-objects/print-object"
import { useCourseArt } from "@/components/prototype-panel"
import { fmtPoints, topicProgress, useProgress } from "@/lib/progress"
import { TOPICS, type TopicId } from "@/lib/topics"
import { cn } from "@/lib/utils"

// Topic -> print object model (0 candle, 1 staircase, 2 folded floor + ball, 3 plane, 4 crystal, 5 two boxes).
const PRINT_MODEL: Record<TopicId, number> = { foundations: 0, "order-flow": 1, edge: 4, institutional: 5, macro: 3 }

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
  const art = useCourseArt()
  const [hovered, setHovered] = useState(false)
  const topic = TOPICS[topicId]
  const tp = topicProgress(topicId, p)
  if (art === "print")
    return (
      <div
        style={{ width: size, height: size }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn("relative shrink-0", tp.state === "locked" && "opacity-40", className)}
      >
        {/* A printed halftone shadow instead of a soft glow, so the object sits on the card like the print. */}
        <div
          aria-hidden
          className="absolute bottom-[6%] left-1/2 h-[13%] w-[58%] -translate-x-1/2"
          style={{
            backgroundImage: "radial-gradient(circle, rgb(255 255 255 / 0.2) 0.9px, transparent 1.3px)",
            backgroundSize: "5px 5px",
            maskImage: "radial-gradient(closest-side, #000 35%, transparent)",
          }}
        />
        <PrintObject model={PRINT_MODEL[topicId]} hovered={hovered} className="absolute inset-0" />
      </div>
    )
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
          ? { primary: "Soon", lines: ["Coming to Training"] }
          : {
              primary: tp.state === "mastered" ? "Mastered" : `${tp.pct}%`,
              lines: [`${tp.done}/${tp.total} lessons`, `${fmtPoints(tp.xp)} XP`],
            }
      }
    />
  )
}
