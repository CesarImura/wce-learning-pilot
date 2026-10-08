"use client"

// Topic coins, rendered in 3D with Three.js (coin-engine.ts): struck-metal artifacts,
// each topic with its own alloy, outline and line pattern (coin-art.ts). A topic's coin
// starts tarnished and polishes up as the learner progresses.
// Hovering tilts a coin; clicking brings it forward into the inspector (coin-inspector.tsx).

import { useEffect, useId, useRef, useState } from "react"
import { Lock } from "lucide-react"
import type { Topic } from "@/lib/topics"
import { cn } from "@/lib/utils"
import type { FaceStats } from "./coin-art"
import { mountCoin, type CoinHandle, type CoinLook, type CoinState } from "./coin-engine"
import { openInspector, useInspectedKey } from "./inspector-store"

export type { CoinLook, CoinState }

export type CoinProps = {
  topic: Topic
  state: CoinState
  /** Progress through the topic, 0–100. */
  pct?: number
  size: number
  /** Progress shown on the reverse. */
  stats?: FaceStats
  /** Struck coins or cosmic stones. */
  look?: CoinLook
  float?: boolean
  className?: string
  label?: string
}

/** The 3D coin itself, posed at the given angles (CSS-style degrees). */
export function CoinCanvas({
  topic,
  state,
  pct = 0,
  stats,
  look = "coins",
  rx,
  ry,
  scale = 1,
  ease,
  className,
}: Omit<CoinProps, "size"> & { rx: number; ry: number; scale?: number; ease?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const handle = useRef<CoinHandle | null>(null)
  const spec = { topic, state, pct, stats, look }
  const latest = useRef(spec)
  const specKey = `${topic.id}|${state}|${pct}|${look}|${stats ? [stats.primary, ...stats.lines].join("|") : ""}`

  useEffect(() => {
    latest.current = spec
  })
  useEffect(() => {
    const h = mountCoin(ref.current!, latest.current)
    handle.current = h
    return () => {
      h.dispose()
      handle.current = null
    }
  }, [])
  useEffect(() => {
    handle.current?.setSpec(latest.current)
  }, [specKey])
  useEffect(() => {
    const h = handle.current
    if (!h) return
    h.target = { rx, ry, scale }
    if (ease) h.ease = ease
  }, [rx, ry, scale, ease])

  return <canvas ref={ref} aria-hidden className={cn("block size-full", className)} />
}

/**
 * A topic coin. It tilts towards the pointer; clicking brings it forward into the
 * inspector. Coins often sit inside links, so the click never navigates.
 */
export function Coin(props: CoinProps) {
  const { topic, state, size, float = false, className, label } = props
  const key = useId()
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false })
  const frame = useRef(0)
  const inspected = useInspectedKey() === key
  const locked = state === "locked"

  function onMove(e: React.PointerEvent) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => setTilt({ x: (0.5 - y) * 30, y: (x - 0.5) * 36, active: true }))
  }
  function onLeave() {
    cancelAnimationFrame(frame.current)
    setTilt({ x: 0, y: 0, active: false })
  }
  function inspect(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault()
    e.stopPropagation()
    const el = ref.current
    if (!el) return
    openInspector({ key, props, rect: el.getBoundingClientRect(), from: { rx: tilt.x, ry: tilt.y } })
    onLeave()
  }

  return (
    <div
      ref={ref}
      data-coin={key}
      role="button"
      tabIndex={0}
      aria-label={`${label ?? topic.name} coin. Click to inspect`}
      onClick={inspect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inspect(e)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("relative shrink-0 cursor-zoom-in select-none outline-none", float && "coin-float", className)}
      style={{ width: size, height: size, visibility: inspected ? "hidden" : undefined }}
    >
      {/* soft contact shadow */}
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-black/70 blur-md transition-all duration-300"
        style={{ bottom: "-4%", width: tilt.active ? "60%" : "70%", height: "9%" }}
      />
      <CoinCanvas
        {...props}
        className="relative"
        rx={tilt.x}
        ry={tilt.y}
        scale={tilt.active && !locked ? 1.04 : 1}
        ease={tilt.active ? 0.25 : 0.1}
      />
      {locked && (
        <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-black/80 px-2 py-0.5 text-[11px] text-white/70">
          <Lock className="size-3" /> Soon
        </span>
      )}
    </div>
  )
}
