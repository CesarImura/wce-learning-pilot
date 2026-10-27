"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { MODEL_COUNT, createItem, renderItem, type PrintItem } from "./print-objects"

type Slot = { el: HTMLElement; item: PrintItem; hovered: boolean }

const STEP_MS = 83 // ~12 fps, stepped on purpose
const slots = new Set<Slot>()
let shared: { rd: THREE.WebGLRenderer; canvas: HTMLCanvasElement; dpr: number; stop: () => void; w: number; h: number } | null = null

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

function ensureRenderer() {
  if (shared) return shared
  const canvas = document.createElement("canvas")
  canvas.setAttribute("aria-hidden", "true")
  // Below the sticky header (z-40) so scrolled cards never paint over the nav.
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:30"
  document.body.appendChild(canvas)
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const rd = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true })
  rd.setPixelRatio(dpr)
  rd.setScissorTest(true)
  rd.setClearColor(0x000000, 0)

  let last = 0
  let tick = 0
  let raf = 0
  let dirty = true
  const onScroll = () => {
    dirty = true
  }
  window.addEventListener("scroll", onScroll, { passive: true, capture: true })

  const draw = (t: number, advance: boolean) => {
    const iw = window.innerWidth
    const ih = window.innerHeight
    if (iw !== s.w || ih !== s.h) {
      s.w = iw
      s.h = ih
      rd.setSize(iw, ih, false)
    }
    rd.setScissor(0, 0, iw, ih)
    rd.clear()
    const still = reduced()
    slots.forEach((slot) => {
      const r = slot.el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > ih || r.right < 0 || r.left > iw) return
      renderItem(rd, slot.item, { x: r.left, y: ih - r.bottom, w: r.width, h: r.height, cw: iw, ch: ih, tick, t, hovered: slot.hovered, still, advance })
    })
  }

  const loop = (t: number) => {
    raf = requestAnimationFrame(loop)
    if (t - last >= STEP_MS) {
      last = t
      tick++
      dirty = false
      draw(t, true)
    } else if (dirty) {
      dirty = false
      draw(t, false)
    }
  }
  raf = requestAnimationFrame(loop)

  const s = {
    rd,
    canvas,
    dpr,
    w: 0,
    h: 0,
    stop: () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll, { capture: true })
      rd.dispose()
      canvas.remove()
    },
  }
  shared = s
  return s
}

function register(el: HTMLElement, model: number) {
  const s = ensureRenderer()
  const slot: Slot = { el, item: createItem(model, s.dpr), hovered: false }
  slots.add(slot)
  return {
    slot,
    release: () => {
      slots.delete(slot)
      slot.item.dispose()
      if (slots.size === 0 && shared) {
        shared.stop()
        shared = null
      }
    },
  }
}

/** A 3D folded-paper topic object drawn with the print shader on one shared full-screen canvas. */
export function PrintObject({ model, hovered = false, className }: { model: number; hovered?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const slotRef = useRef<Slot | null>(null)
  const m = ((model % MODEL_COUNT) + MODEL_COUNT) % MODEL_COUNT

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const { slot, release } = register(el, m)
    slotRef.current = slot
    return () => {
      slotRef.current = null
      release()
    }
  }, [m])

  useEffect(() => {
    if (slotRef.current) slotRef.current.hovered = hovered
  }, [hovered, m])

  return <div ref={ref} aria-hidden className={className} />
}
