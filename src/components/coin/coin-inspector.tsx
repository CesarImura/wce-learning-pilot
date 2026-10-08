"use client"

// The coin inspector: clicking a coin brings it forward from where it sits, spins it
// once and lets you turn it by hand (drag), flip it (click), zoom (scroll) and read the
// reverse. Mounted once in the root layout.

import { useEffect, useRef, useState } from "react"
import { RotateCcw, Repeat2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CoinCanvas } from "./coin"
import { closeInspector, useInspected, type Inspected } from "./inspector-store"

export function CoinInspector() {
  const item = useInspected()
  if (!item) return null
  return <Stage key={item.key} item={item} />
}

const STATE_LABEL = { locked: "Coming soon", new: "Not started", active: "In progress", mastered: "Mastered" } as const
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)"

function Stage({ item }: { item: Inspected }) {
  const { props, rect } = item
  const [vp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const S = Math.round(Math.min(vp.h * 0.58, vp.w * 0.84, 520))
  const cx = vp.w / 2
  const cy = vp.h / 2 - Math.min(56, vp.h * 0.06)

  const [phase, setPhase] = useState<"enter" | "open" | "leave">("enter")
  const [origin, setOrigin] = useState(rect)
  const [rot, setRot] = useState({ rx: item.from.rx, ry: item.from.ry })
  const [zoom, setZoom] = useState(1)

  // Rotation runs on its own frame loop so the coin turns, settles, spins and coasts smoothly.
  const cur = useRef({ ...item.from })
  const target = useRef({ rx: -6, ry: item.from.ry + 360 })
  const vel = useRef({ rx: 0, ry: 0 })
  const drag = useRef<{ x: number; y: number; moved: number; t: number } | null>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const c = cur.current
      const t = target.current
      const v = vel.current
      if (!drag.current && (Math.abs(v.ry) > 0.02 || Math.abs(v.rx) > 0.02)) {
        // coasting after a throw
        t.ry += v.ry
        t.rx = clamp(t.rx + v.rx, -55, 55)
        v.ry *= 0.94
        v.rx *= 0.9
      }
      const k = drag.current ? 1 : 0.085
      const nx = c.rx + (t.rx - c.rx) * k
      const ny = c.ry + (t.ry - c.ry) * k
      if (Math.abs(nx - c.rx) > 0.005 || Math.abs(ny - c.ry) > 0.005) {
        cur.current = { rx: nx, ry: ny }
        setRot(cur.current)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const open = requestAnimationFrame(() => requestAnimationFrame(() => setPhase("open")))
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(open)
      document.body.style.overflow = prev
    }
  }, [])

  function close() {
    if (phase === "leave") return
    // Return to wherever the inline coin is now (the page may have moved).
    const el = document.querySelector(`[data-coin="${CSS.escape(item.key)}"]`)
    if (el) setOrigin(el.getBoundingClientRect())
    vel.current = { rx: 0, ry: 0 }
    target.current = { rx: 0, ry: Math.round(cur.current.ry / 360) * 360 }
    setZoom(1)
    setPhase("leave")
    window.setTimeout(closeInspector, 560)
  }
  function flip() {
    vel.current = { rx: 0, ry: 0 }
    target.current = { rx: target.current.rx, ry: Math.round(target.current.ry / 180) * 180 + 180 }
  }
  function reset() {
    vel.current = { rx: 0, ry: 0 }
    target.current = { rx: -6, ry: Math.round(cur.current.ry / 360) * 360 }
    setZoom(1)
  }

  // Keep the latest handlers for the key listener without re-subscribing.
  const keys = useRef({ close, flip })
  useEffect(() => {
    keys.current = { close, flip }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") keys.current.close()
      else if (e.key === "f" || e.key === "F" || e.key === " ") {
        e.preventDefault()
        keys.current.flip()
      } else if (e.key === "ArrowLeft") target.current.ry -= 30
      else if (e.key === "ArrowRight") target.current.ry += 30
      else if (e.key === "ArrowUp") target.current.rx = clamp(target.current.rx + 15, -55, 55)
      else if (e.key === "ArrowDown") target.current.rx = clamp(target.current.rx - 15, -55, 55)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    vel.current = { rx: 0, ry: 0 }
    target.current = { ...cur.current }
    drag.current = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now() }
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    const now = performance.now()
    const dt = Math.max(8, now - d.t)
    d.moved += Math.abs(dx) + Math.abs(dy)
    d.x = e.clientX
    d.y = e.clientY
    d.t = now
    const t = target.current
    t.ry += dx * 0.5
    t.rx = clamp(t.rx - dy * 0.4, -55, 55)
    // per-frame velocity for the throw
    vel.current = { ry: ((dx * 0.5) / dt) * 16, rx: ((-dy * 0.4) / dt) * 16 }
  }
  function onPointerUp() {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.moved < 6) flip()
    else if (performance.now() - d.t > 90) vel.current = { rx: 0, ry: 0 }
  }

  const open = phase === "open"
  const s0 = origin.width / S
  const dx = origin.left + origin.width / 2 - cx
  const dy = origin.top + origin.height / 2 - cy
  const { topic, state, stats } = props
  const facingBack = Math.cos((rot.ry * Math.PI) / 180) < 0

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal aria-label={`${topic.name} coin`}>
      <div
        onClick={close}
        className="absolute inset-0 bg-[#05070a]/80 backdrop-blur-md"
        style={{ opacity: open ? 1 : 0, transition: `opacity 500ms ${EASE}` }}
      />
      {/* halo in the topic's colour behind the coin */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{
          left: cx - S * 0.6,
          top: cy - S * 0.6,
          width: S * 1.2,
          height: S * 1.2,
          background: `radial-gradient(circle, ${topic.color}33 0%, transparent 65%)`,
          opacity: open ? 1 : 0,
          transition: `opacity 700ms ${EASE}`,
        }}
      />

      <div
        className="absolute touch-none"
        style={{
          left: cx - S / 2,
          top: cy - S / 2,
          width: S,
          height: S,
          transform: open ? `scale(${zoom})` : `translate(${dx}px, ${dy}px) scale(${s0})`,
          transition: `transform ${phase === "enter" ? 650 : 520}ms ${EASE}`,
        }}
      >
        <div
          className="size-full cursor-grab active:cursor-grabbing"
                    onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(e) => setZoom((z) => clamp(z * Math.exp(-e.deltaY * 0.0015), 0.7, 1.6))}
        >
          <CoinCanvas {...props} className={undefined} reveal={false} rx={rot.rx} ry={rot.ry} ease={1} />
        </div>
      </div>

      {/* details */}
      <div
        className="absolute inset-x-0 flex flex-col items-center gap-3 px-4 text-center"
        style={{
          top: cy + S / 2 + 28,
          opacity: open ? 1 : 0,
          transform: open ? "none" : "translateY(12px)",
          transition: `opacity 400ms ${EASE} ${open ? 250 : 0}ms, transform 400ms ${EASE} ${open ? 250 : 0}ms`,
        }}
      >
        <div>
          <p className="eyebrow" style={{ color: topic.color }}>
            {STATE_LABEL[state]}
          </p>
          <h2 className="font-serif text-[28px] leading-tight">{topic.name}</h2>
          {stats && (
            <p className="mt-1 text-[14px] text-white/60 tabular-nums">
              {[stats.primary, ...stats.lines].join("  ·  ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={flip}>
            <Repeat2 /> {facingBack ? "Show front" : "Show reverse"}
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw /> Reset
          </Button>
        </div>
        <p className="text-[12px] text-white/40">
          <span className="pointer-coarse:hidden">Drag to turn · Click to flip · Scroll to zoom · Esc to close</span>
          <span className="hidden pointer-coarse:inline">Drag to turn · Tap to flip</span>
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={close}
        aria-label="Close"
        className="absolute top-4 right-4"
        style={{ opacity: open ? 1 : 0, transition: `opacity 300ms ${EASE}` }}
      >
        <X />
      </Button>
    </div>
  )
}
