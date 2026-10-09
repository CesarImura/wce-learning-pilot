"use client"

// Makes the exercises comfortable on phones without changing the exercises themselves.
// Every exercise SVG is drawn in a fixed coordinate space (usually 640 units wide), so
// on a phone it renders at about half size: labels shrink to ~6px and handles to ~20px.
// This stage measures, for each SVG inside it, how many SVG units one screen pixel covers
// (`--k`), and globals.css uses that to:
//  - scale chart labels up so they stay readable (`--tboost`),
//  - on touch screens, grow invisible hit areas (`.touch-hit`, `.touch-hit-y`) to at
//    least ~44px (price lines, `.touch-hit-y`, to ~48px) and handles (`.touch-knob`)
//    so a thumb can grab them.

import { useEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

function measure(root: HTMLElement) {
  root.querySelectorAll<SVGSVGElement>("svg[viewBox]").forEach((svg) => {
    const w = svg.getBoundingClientRect().width
    const vb = svg.viewBox.baseVal
    if (!w || !vb?.width) return
    const k = vb.width / w
    svg.dataset.k = k.toFixed(2)
    svg.style.setProperty("--k", k.toFixed(3))
    // labels: only boost when the drawing is noticeably shrunk, and never by more than 1.45x
    svg.style.setProperty("--tboost", Math.min(1.45, Math.max(1, k * 0.78)).toFixed(3))
    // hit areas: 44 units drawn at k units per pixel need k times more to reach 44px
    svg.style.setProperty("--hit", Math.max(1, k).toFixed(3))
    // price lines have a 24-unit grab band: grow it to ~48px
    svg.style.setProperty("--hit-line", Math.max(1, (k * 48) / 24).toFixed(3))
    svg.style.setProperty("--knob", Math.min(1.6, Math.max(1, k * 0.75)).toFixed(3))
  })
}

export function TouchStage({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    let raf = 0
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => measure(root))
    }
    schedule()
    // re-measure when the layout changes size or an exercise swaps its SVGs
    const ro = new ResizeObserver(schedule)
    ro.observe(root)
    const mo = new MutationObserver(schedule)
    mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["viewBox"] })
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo.disconnect()
    }
  }, [])
  return (
    <div ref={ref} className={cn("touch-stage", className)}>
      {children}
    </div>
  )
}
