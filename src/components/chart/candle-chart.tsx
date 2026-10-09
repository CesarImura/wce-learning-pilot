"use client"

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from "react"
import type { Candle } from "@/lib/market"
import { cn } from "@/lib/utils"

export type Scale = {
  W: number
  H: number
  left: number
  right: number
  top: number
  bottom: number
  bw: number
  x: (i: number) => number
  y: (price: number) => number
  price: (py: number) => number
  index: (px: number) => number
}

export function makeScale(
  n: number,
  min: number,
  max: number,
  W: number,
  H: number,
  pad = { l: 8, r: 52, t: 12, b: 12 },
): Scale {
  const left = pad.l
  const right = W - pad.r
  const top = pad.t
  const bottom = H - pad.b
  const step = (right - left) / n
  return {
    W,
    H,
    left,
    right,
    top,
    bottom,
    bw: Math.max(2, step * 0.62),
    x: (i) => left + step * (i + 0.5),
    y: (p) => bottom - ((p - min) / (max - min)) * (bottom - top),
    price: (py) => min + ((bottom - py) / (bottom - top)) * (max - min),
    index: (px) => Math.floor((px - left) / step),
  }
}

export function domainOf(candles: Candle[], padPct = 0.08): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const c of candles) {
    lo = Math.min(lo, c.l)
    hi = Math.max(hi, c.h)
  }
  const pad = (hi - lo) * padPct
  return [lo - pad, hi + pad]
}

/** Converts a pointer event to SVG viewBox coordinates. */
export function useSvgPoint(svgRef: RefObject<SVGSVGElement | null>) {
  return useCallback(
    (e: { clientX: number; clientY: number }) => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const m = svg.getScreenCTM()
      if (!m) return { x: 0, y: 0 }
      const p = pt.matrixTransform(m.inverse())
      return { x: p.x, y: p.y }
    },
    [svgRef],
  )
}

function niceTicks(min: number, max: number, count = 5) {
  const span = max - min
  const raw = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? raw
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push(+v.toFixed(6))
  return out
}

type Props = {
  candles: Candle[]
  /** Only the first `visible` candles are drawn; the scale still uses all of them so a reveal doesn't jump. */
  visible?: number
  width?: number
  height?: number
  domain?: [number, number]
  highlight?: Record<number, "correct" | "wrong" | "selected">
  onCandleClick?: (i: number) => void
  svgRef?: RefObject<SVGSVGElement | null>
  className?: string
  axis?: boolean
  pad?: { l: number; r: number; t: number; b: number }
  children?: (s: Scale) => ReactNode
  under?: (s: Scale) => ReactNode
}

export function CandleChart({
  candles,
  visible = candles.length,
  width = 640,
  height = 320,
  domain,
  highlight,
  onCandleClick,
  svgRef,
  className,
  axis = true,
  pad,
  children,
  under,
}: Props) {
  const localRef = useRef<SVGSVGElement>(null)
  const ref = svgRef ?? localRef
  const [min, max] = domain ?? domainOf(candles)

  // On narrow screens a 640-wide chart would render at half size. Re-lay it out in a
  // narrower, taller space instead: labels and candles come out larger, and the extra
  // height gives more precision when dragging price levels. Exercises draw through the
  // scale `s`, so they follow along unchanged.
  const [cw, setCw] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  const compact = width >= 500 && cw > 0 && cw < 560
  const W = compact ? Math.round(Math.max(380, cw * 1.15)) : width
  const H = compact ? Math.round(W * (height / width) * 1.35) : height

  const s = makeScale(candles.length, min, max, W, H, pad ?? (axis ? undefined : { l: 4, r: 4, t: 6, b: 6 }))
  const ticks = axis ? niceTicks(min, max) : []

  // Picking a candle: press anywhere and slide; the nearest candle is previewed and
  // lifting the finger picks it. Much easier than hitting a thin column on a phone.
  const toPoint = useSvgPoint(ref)
  const [preview, setPreview] = useState<number | null>(null)
  const nearest = (e: { clientX: number; clientY: number }) => Math.min(visible - 1, Math.max(0, s.index(toPoint(e).x)))
  const scrub = onCandleClick
    ? {
        onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setPreview(nearest(e))
        },
        onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
          if (preview !== null) setPreview(nearest(e))
        },
        onPointerUp: () => {
          if (preview !== null) onCandleClick(preview)
          setPreview(null)
        },
        onPointerCancel: () => setPreview(null),
      }
    : {}
  const step = (s.right - s.left) / candles.length

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      className={cn("w-full select-none touch-none", onCandleClick && "cursor-pointer", className)}
      role="img"
      {...scrub}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={s.left} x2={s.right} y1={s.y(t)} y2={s.y(t)} className="stroke-border" strokeDasharray="2 4" />
          <text x={s.right + 6} y={s.y(t) + 4} className="fill-muted-foreground text-[11px] tabular-nums">
            {t.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </text>
        </g>
      ))}
      {under?.(s)}
      {preview !== null && (
        <g pointerEvents="none">
          <rect x={s.x(preview) - step / 2} y={s.top} width={step} height={s.bottom - s.top} rx={3} className="fill-brand/15" />
          <line x1={s.x(preview)} x2={s.x(preview)} y1={s.top} y2={s.bottom} className="stroke-brand" strokeDasharray="3 3" />
        </g>
      )}
      {candles.slice(0, visible).map((c, i) => {
        const up = c.c >= c.o
        const color = up ? "var(--up)" : "var(--down)"
        const hl = highlight?.[i]
        const top = s.y(Math.max(c.o, c.c))
        const bodyH = Math.max(1, Math.abs(s.y(c.o) - s.y(c.c)))
        return (
          <g key={i}>
            {hl && (
              <rect
                x={s.x(i) - s.bw}
                y={s.y(c.h) - 8}
                width={s.bw * 2}
                height={s.y(c.l) - s.y(c.h) + 16}
                rx={4}
                className={cn(
                  hl === "correct" && "fill-up/20 stroke-up",
                  hl === "wrong" && "fill-down/20 stroke-down",
                  hl === "selected" && "fill-brand/15 stroke-brand",
                )}
                strokeWidth={1.5}
              />
            )}
            <line x1={s.x(i)} x2={s.x(i)} y1={s.y(c.h)} y2={s.y(c.l)} stroke={color} strokeWidth={1.2} />
            <rect x={s.x(i) - s.bw / 2} y={top} width={s.bw} height={bodyH} fill={color} rx={1} />
          </g>
        )
      })}
      {children?.(s)}
    </svg>
  )
}

/** Pointer handlers that report the dragged y position in SVG coordinates. */
export function useDragY(
  svgRef: RefObject<SVGSVGElement | null>,
  onY: (y: number) => void,
  disabled?: boolean,
) {
  const toPoint = useSvgPoint(svgRef)
  const dragging = useRef(false)
  return {
    onPointerDown: (e: PointerEvent<SVGGElement>) => {
      if (disabled) return
      dragging.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      onY(toPoint(e).y)
    },
    onPointerMove: (e: PointerEvent<SVGGElement>) => {
      if (dragging.current) onY(toPoint(e).y)
    },
    onPointerUp: () => {
      dragging.current = false
    },
    onPointerCancel: () => {
      dragging.current = false
    },
  }
}

/** A horizontal price line the learner can drag up and down. */
export function DragLine({
  s,
  price,
  onChange,
  svgRef,
  label,
  tone = "primary",
  disabled,
}: {
  s: Scale
  price: number
  onChange: (p: number) => void
  svgRef: RefObject<SVGSVGElement | null>
  label: string
  tone?: "primary" | "up" | "down" | "muted"
  disabled?: boolean
}) {
  const drag = useDragY(svgRef, (py) => onChange(s.price(Math.min(s.bottom, Math.max(s.top, py)))), disabled)
  const y = s.y(price)
  const color = {
    primary: "var(--brand)",
    up: "var(--up)",
    down: "var(--down)",
    muted: "#8a9ba6",
  }[tone]
  const ink = "#000"

  return (
    <g className={cn(!disabled && "cursor-ns-resize")} {...drag}>
      <rect x={s.left} y={y - 12} width={s.W - s.left} height={24} fill="transparent" className="touch-hit-y" />
      <line x1={s.left} x2={s.right} y1={y} y2={y} stroke={color} strokeWidth={2} strokeDasharray={disabled ? "6 4" : undefined} />
      <rect x={s.right + 2} y={y - 10} width={s.W - s.right - 4} height={20} rx={4} fill={color} />
      <text x={s.right + 6} y={y + 4} fill={ink} className="text-[11px] font-semibold tabular-nums">
        {price.toFixed(2)}
      </text>
      {!disabled && (
        <g transform={`translate(${s.left + 6}, ${y - 10})`}>
          <rect width={label.length * 6.6 + 14} height={20} rx={10} fill={color} />
          <text x={7} y={14} fill={ink} className="text-[11px] font-semibold">
            {label}
          </text>
        </g>
      )}
      {disabled && (
        <text x={s.left + 6} y={y - 6} className="text-[11px] font-semibold" fill={color}>
          {label}
        </text>
      )}
    </g>
  )
}
