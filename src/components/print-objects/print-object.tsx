"use client"

import { useEffect, useRef } from "react"
import { get as getSettings, subscribe } from "./settings"

// three and the renderer are loaded on demand (dynamic import), so none of it is in the page's initial JS.
type Lib = typeof import("./print-objects")
type Item = ReturnType<Lib["createItem"]>
type Engine = ReturnType<Lib["createEngine"]>

type Slot = {
  el: HTMLElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D | null
  model: number
  item: Item | null
  hovered: boolean
  active: boolean
  speed: number
  visible: boolean
  w: number
  h: number
  dirty: boolean
  /** Keep ticking until this time (ms) so rest() can settle after hover ends. */
  settleUntil: number
}

const SETTLE_MS = 600

const slots = new Set<Slot>()
const byEl = new Map<Element, Slot>()
let lib: Lib | null = null
let engine: Engine | null = null
let compiled = false
let loading = false
let raf = 0
let last = 0
let tick = 0
let io: IntersectionObserver | null = null
let ro: ResizeObserver | null = null
let unsub: (() => void) | null = null

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
const getDpr = () => Math.min(window.matchMedia("(pointer: coarse)").matches ? 1.5 : 2, window.devicePixelRatio || 1)

const isLive = (s: Slot, now: number) => s.visible && !reduced() && (s.hovered || s.active || now < s.settleUntil)

function schedule() {
  if (!raf && engine) raf = requestAnimationFrame(loop)
}

function draw(s: Slot, t: number) {
  if (!engine || !lib || !s.ctx || s.w < 1 || s.h < 1) return
  if (!s.item) s.item = lib.createItem(s.model, engine)
  if (!compiled) {
    compiled = true
    engine.rd.compile(s.item.sc, s.item.cam)
  }
  const still = reduced() || (!s.hovered && !s.active)
  lib.renderItem(engine, s.item, s.ctx, { w: s.w, h: s.h, tick, t, hovered: s.hovered, still, advance: true, speed: s.speed })
}

function loop(t: number) {
  raf = 0
  if (!engine) return
  if (t - last < 1000 / getSettings().fps) {
    schedule()
    return
  }
  last = t
  tick++
  const now = performance.now()
  let more = false
  slots.forEach((s) => {
    if (!s.visible) return
    const live = isLive(s, now)
    // A slot whose settle time just ran out gets one last still frame.
    const final = !live && s.settleUntil > 0
    if (final) s.settleUntil = 0
    if (live || final || s.dirty) {
      s.dirty = false
      draw(s, t)
    }
    if (live) more = true
  })
  if (more) schedule()
}

function markAllDirty() {
  slots.forEach((s) => (s.dirty = true))
  schedule()
}

function sizeSlot(s: Slot, w: number, h: number) {
  s.w = w
  s.h = h
  const p = Math.max(w, h) * 0.6
  const W = w + 2 * p
  const H = h + 2 * p
  const dpr = getDpr()
  const c = s.canvas
  c.style.left = c.style.top = `${-p}px`
  c.style.width = `${W}px`
  c.style.height = `${H}px`
  c.width = Math.max(1, Math.round(W * dpr))
  c.height = Math.max(1, Math.round(H * dpr))
  s.dirty = true
  schedule()
}

async function ensureEngine() {
  if (engine || loading) return
  loading = true
  try {
    const l = lib ?? (await import("./print-objects"))
    lib = l
    if (engine || slots.size === 0) return
    engine = l.createEngine(getDpr())
    schedule()
  } finally {
    loading = false
  }
}

function register(slot: Slot) {
  slots.add(slot)
  byEl.set(slot.el, slot)
  if (!io) {
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const s = byEl.get(e.target)
          if (!s) return
          s.visible = e.isIntersecting
          if (s.visible) s.dirty = true
        })
        schedule()
      },
      { rootMargin: "100px" },
    )
    ro = new ResizeObserver((entries) => {
      entries.forEach((e) => {
        const s = byEl.get(e.target)
        if (s) sizeSlot(s, e.contentRect.width, e.contentRect.height)
      })
    })
    unsub = subscribe(markAllDirty)
  }
  io.observe(slot.el)
  ro!.observe(slot.el)
  const start = () => void ensureEngine()
  if (engine) schedule()
  else if (typeof requestIdleCallback === "function") requestIdleCallback(start, { timeout: 1500 })
  else setTimeout(start, 200)
}

function release(slot: Slot) {
  slots.delete(slot)
  byEl.delete(slot.el)
  io?.unobserve(slot.el)
  ro?.unobserve(slot.el)
  slot.item?.dispose()
  slot.item = null
  if (slots.size === 0) {
    cancelAnimationFrame(raf)
    raf = 0
    io?.disconnect()
    ro?.disconnect()
    io = ro = null
    unsub?.()
    unsub = null
    engine?.dispose()
    engine = null
    compiled = false
  }
}

/** A 3D folded-paper topic object drawn with the print shader, rendered offscreen and copied into a canvas inside its box. */
/** Still (one fixed print) until hovered; `active` keeps it spinning and boiling, for the one hero object on a page. */
/** First league trophy model (bell, medal, cup, crown); mirrors LEAGUE_MODEL in print-objects.ts, which pulls in three. */
export const LEAGUE_MODEL = 9
/** Broken heart (out of hearts); mirrors HEART_MODEL in print-objects.ts. */
export const HEART_MODEL = 13

export function PrintObject({
  model,
  hovered = false,
  active = false,
  speed = 1,
  className,
}: {
  model: number
  hovered?: boolean
  active?: boolean
  /** Gesture and spin speed multiplier (1 = normal). */
  speed?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const slotRef = useRef<Slot | null>(null)
  // Kept in sync with print-objects.ts by hand, so three stays out of this file: 9 course objects, 4 league objects, 1 heart.
  const MODEL_COUNT = 14
  const m = ((model % MODEL_COUNT) + MODEL_COUNT) % MODEL_COUNT

  useEffect(() => {
    const el = ref.current
    const canvas = canvasRef.current
    if (!el || !canvas) return
    const slot: Slot = {
      el,
      canvas,
      ctx: canvas.getContext("2d"),
      model: m,
      item: null,
      hovered: false,
      active: false,
      speed: 1,
      visible: false,
      w: 0,
      h: 0,
      dirty: true,
      settleUntil: 0,
    }
    slotRef.current = slot
    register(slot)
    return () => {
      slotRef.current = null
      release(slot)
    }
  }, [m])

  useEffect(() => {
    const s = slotRef.current
    if (!s) return
    if (s.hovered && !hovered) s.settleUntil = performance.now() + SETTLE_MS
    if (s.active && !active) s.settleUntil = performance.now() + SETTLE_MS
    s.hovered = hovered
    s.active = active
    s.speed = speed
    s.dirty = true
    schedule()
  }, [hovered, active, speed, m])

  return (
    <div ref={ref} aria-hidden className={className}>
      <canvas ref={canvasRef} aria-hidden style={{ position: "absolute", pointerEvents: "none", width: 0, height: 0 }} />
    </div>
  )
}
