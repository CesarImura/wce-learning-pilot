"use client"

import { useEffect, useRef, useState } from "react"
import { Coin } from "@/components/coin/coin"
import { PrintObject } from "@/components/print-objects/print-object"
import { useCourseArt } from "@/components/prototype-panel"
import { fmtPoints, topicProgress, useProgress } from "@/lib/progress"
import { TOPICS, type TopicId } from "@/lib/topics"
import { cn } from "@/lib/utils"

// Topic -> print object model (0 candle, 4 crystal, 6 order book ladder, 7 columns, 8 globe; 1-3 and 5 are spares).
const PRINT_MODEL: Record<TopicId, number> = { foundations: 0, "order-flow": 6, edge: 4, institutional: 7, macro: 8 }

/** A topic's coin with live progress; its reverse (in the inspector) shows lessons, units and XP. */
export function TopicCoin({
  topicId,
  size,
  float,
  active,
  autoplay,
  speed,
  className,
}: {
  topicId: TopicId
  size: number
  float?: boolean
  /** Print art only: keep the object moving without hover (the page's hero object). */
  active?: boolean
  /** Print art only: play the hover gesture on loop without hover (the course page header). */
  autoplay?: boolean
  /** Print art only: gesture and spin speed multiplier. */
  speed?: number
  className?: string
}) {
  const p = useProgress()
  const art = useCourseArt()
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const topic = TOPICS[topicId]
  const tp = topicProgress(topicId, p)
  // The object wakes when its whole card or list row is hovered, not only the art itself.
  useEffect(() => {
    const host = ref.current?.closest<HTMLElement>("[data-print-hover], a, .glass, li") ?? ref.current
    if (!host) return
    const on = () => setHovered(true)
    const off = () => setHovered(false)
    host.addEventListener("pointerenter", on)
    host.addEventListener("pointerleave", off)
    return () => {
      host.removeEventListener("pointerenter", on)
      host.removeEventListener("pointerleave", off)
    }
  }, [art])
  if (art === "print")
    return (
      <div
        ref={ref}
        style={{ width: size, height: size }}
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
        <PrintObject model={PRINT_MODEL[topicId]} hovered={hovered || !!autoplay} active={active} speed={speed} className="absolute inset-0" />
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
