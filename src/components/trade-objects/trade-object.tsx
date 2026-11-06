"use client"

import { useEffect, useRef } from "react"
import type { TradeKind } from "./trade-objects"

// three and the scenes load on demand, so none of it is in the page's initial JS.
type Lib = typeof import("./trade-objects")
type Slot = {
  el: HTMLElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D | null
  kind: TradeKind
  item: ReturnType<Lib["createItem"]> | null
  hovered: boolean
  active: boolean
  visible: boolean
  energy: number
  t: number
  dirty: boolean
}

const slots = new Set<Slot>()
const byEl = new Map<Element, Slot>()
let lib: Lib | null = null
let engine: ReturnType<Lib["createEngine"]> | null = null
let loading = false
let raf = 0
let last = 0
let made = 0
let io: IntersectionObserver | null = null
let ro: ResizeObserver | null = null

// Mirrors BLEED in trade-objects.ts (kept here so three stays out of this file).
const BLEED = 1.6

// Pointer position, so a hovered object can turn to face it.
let mx = 0
let my = 0
function onMove(e: PointerEvent) {
  mx = e.clientX
  my = e.clientY
}
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v))

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

function schedule() {
  if (!raf && engine) raf = requestAnimationFrame(loop)
}

function loop(now: number) {
  raf = 0
  if (!engine || !lib) return
  const dt = Math.min(0.1, (now - last) / 1000)
  // 30 frames a second is plenty for slow metal, and half the work.
  if (dt < 1 / 32) return schedule()
  last = now
  const still = reduced()
  let more = false
  slots.forEach((s) => {
    if (!s.visible || !s.ctx || s.canvas.width < 2) return
    if (still && !s.dirty) return
    s.energy += ((s.hovered || s.active ? 1 : 0) - s.energy) * Math.min(1, dt * 5)
    if (!s.item)
      s.item = lib!.createItem(s.kind, engine!, () => {
        // The image arrives after the first frame: draw again, or a still page (reduced motion) stays empty.
        s.dirty = true
        schedule()
      })
    // Always moving a little; hovering the card (or being the hero) wakes it up.
    if (!still) s.t += dt * (0.5 + 1.1 * s.energy)
    let px = 0
    let py = 0
    if (s.hovered && !still) {
      const r = s.el.getBoundingClientRect()
      px = clamp1((mx - (r.left + r.width / 2)) / (r.width * 1.2))
      py = clamp1((my - (r.top + r.height / 2)) / (r.height * 1.2))
    }
    s.item.update(s.t, s.energy, s.hovered || s.active, s.hovered, px, py)
    lib!.renderItem(engine!, s.item, s.ctx, s.canvas.width, s.canvas.height)
    s.dirty = false
    if (!still) more = true
  })
  if (more) schedule()
}

async function ensureEngine() {
  if (engine || loading) return
  loading = true
  try {
    lib = lib ?? (await import("./trade-objects"))
    if (!engine && slots.size > 0) engine = lib.createEngine()
    schedule()
  } finally {
    loading = false
  }
}

function register(s: Slot) {
  slots.add(s)
  byEl.set(s.el, s)
  if (!io) {
    window.addEventListener("pointermove", onMove, { passive: true })
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const x = byEl.get(e.target)
          if (!x) return
          x.visible = e.isIntersecting
          x.dirty = true
        })
        schedule()
      },
      { rootMargin: "80px" },
    )
    ro = new ResizeObserver((entries) => {
      entries.forEach((e) => {
        const x = byEl.get(e.target)
        if (!x) return
        const dpr = Math.min(2, window.devicePixelRatio || 1)
        x.canvas.width = Math.max(1, Math.round(e.contentRect.width * BLEED * dpr))
        x.canvas.height = Math.max(1, Math.round(e.contentRect.height * BLEED * dpr))
        x.dirty = true
      })
      schedule()
    })
  }
  io.observe(s.el)
  ro!.observe(s.el)
  void ensureEngine()
}

function release(s: Slot) {
  slots.delete(s)
  byEl.delete(s.el)
  io?.unobserve(s.el)
  ro?.unobserve(s.el)
  s.item?.dispose()
  s.item = null
  if (slots.size === 0) {
    cancelAnimationFrame(raf)
    raf = 0
    io?.disconnect()
    ro?.disconnect()
    io = ro = null
    window.removeEventListener("pointermove", onMove)
    engine?.dispose()
    engine = null
  }
}

/** A trading object in dark brushed steel: it sways on its own, and turns to face the pointer on hover. */
export function TradeObject({
  kind,
  hovered = false,
  active = false,
  className,
}: {
  kind: TradeKind
  hovered?: boolean
  active?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const slotRef = useRef<Slot | null>(null)

  useEffect(() => {
    const el = ref.current
    const canvas = canvasRef.current
    if (!el || !canvas) return
    // Each object starts at its own point in time, so two of the same kind never move in step.
    const slot: Slot = { el, canvas, ctx: canvas.getContext("2d"), kind, item: null, hovered: false, active: false, visible: false, energy: 0, t: made++ * 1.7, dirty: true }
    slotRef.current = slot
    register(slot)
    return () => {
      slotRef.current = null
      release(slot)
    }
  }, [kind])

  useEffect(() => {
    const s = slotRef.current
    if (!s) return
    s.hovered = hovered
    s.active = active
    s.dirty = true
    schedule()
  }, [hovered, active, kind])

  return (
    <div ref={ref} aria-hidden className={className}>
      <canvas ref={canvasRef} aria-hidden style={{ position: "absolute", left: "-30%", top: "-30%", width: "160%", height: "160%", pointerEvents: "none" }} />
    </div>
  )
}
