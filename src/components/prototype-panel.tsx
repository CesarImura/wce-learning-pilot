"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { COOLDOWN_DAYS, resetPaywallState } from "@/components/wce/paywall"
import {
  reset as resetPrint,
  set as setPrint,
  usePrintSettings,
} from "@/components/print-objects/settings"

export type Layout = "v1" | "v2"
export type PreviewMode = "default" | "wrong" | "right"

const LAYOUT_KEY = "wce-academy-layout"

export function readLayout(): Layout {
  try {
    return localStorage.getItem(LAYOUT_KEY) === "v1" ? "v1" : "v2"
  } catch {
    return "v2"
  }
}

/** A prototype choice kept in localStorage, shared live by every component that reads it. */
function createPref<T extends string>(key: string, values: readonly T[], fallback: T) {
  const listeners = new Set<() => void>()
  const read = (): T => {
    try {
      const v = localStorage.getItem(key)
      return values.includes(v as T) ? (v as T) : fallback
    } catch {
      return fallback
    }
  }
  const set = (value: T) => {
    try {
      localStorage.setItem(key, value)
    } catch {}
    listeners.forEach((l) => l())
  }
  const subscribe = (cb: () => void) => {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }
  const use = () => useSyncExternalStore(subscribe, read, () => fallback)
  return { use, set, read }
}

// Training home layout: v1 = one page per section (Learn, League, Collection, Lab tabs),
// v2 = a single home with a bit of each, linking to the full pages.
const homePref = createPref<Layout>("wce-academy-home", ["v1", "v2"], "v2")
export const setHomeLayout = homePref.set
export const useHomeLayout = homePref.use

// "Your week" card on the v2 home: v1 = the first take, v2 = streak line and days in one box.
const weekPref = createPref<Layout>("wce-academy-week-card", ["v1", "v2"], "v2")
export const useWeekCard = weekPref.use

// Paywall test: A = control (Training always free, no paywall), B = fake door paywall (Discovery board, 24 Oct).
export type PaywallGroup = "A" | "B"
const paywallPref = createPref<PaywallGroup>("wce-training-paywall-group", ["A", "B"], "B")
export const usePaywallGroup = paywallPref.use
export const readPaywallGroup = paywallPref.read

// Closed beta: students outside the beta see a waitlist instead of Training.
const betaPref = createPref<"in" | "out">("wce-training-beta", ["in", "out"], "in")
export const useBeta = betaPref.use

// Card corners: 8px (shadcn default) or 12px (Cesar's ask). The glass utility reads <html data-corners>.
type Corners = "8" | "12"
const cornersPref = createPref<Corners>("wce-academy-corners", ["8", "12"], "12")

// Course art: the metal topic coins or the 3D print objects (one folded-paper object per course topic).
type CourseArt = "coins" | "print"
const courseArtPref = createPref<CourseArt>("wce-course-art", ["coins", "print"], "print")
export const useCourseArt = courseArtPref.use

// Prototype panel itself: collapsed to its header, and the 3D assets section inside it.
const panelPref = createPref<"open" | "closed">("wce-proto-panel", ["open", "closed"], "open")
const threeDPref = createPref<"open" | "closed">("wce-proto-3d", ["open", "closed"], "closed")

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className="w-[62px] shrink-0 text-[12px] whitespace-nowrap text-[#9e9e9e]"
      >
        {label}
      </label>
      <input
        id={id}
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: "#6abef2" }}
        className="h-7 min-w-0 flex-1"
      />
      <span className="w-9 shrink-0 text-right text-[12px] text-white/80 tabular-nums">
        {format ? format(value) : value}
      </span>
    </div>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; title: string; label?: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center justify-between gap-3">
      <span className="text-[12px] whitespace-nowrap text-[#9e9e9e]">{label}</span>
      <div
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        }}
        className="grid gap-0.5 rounded-[6px] bg-black/40 p-0.5"
      >
        {options.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={value === o.id}
            title={o.title}
            onClick={() => onChange(o.id)}
            className={cn(
              "h-7 min-w-9 px-1.5 rounded-[4px] text-[12px] font-semibold transition-[background-color,color,scale] duration-150 active:scale-[0.96]",
              value === o.id ? "bg-white text-black" : "text-white/60 hover:text-white",
            )}
          >
            {o.label ?? o.id}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Prototype-only: compare Training versions (home layout, week card, corners). Floats bottom left on the Training pages. */
export function HomeLayoutSwitch() {
  const layout = useHomeLayout()
  const week = useWeekCard()
  const corners = cornersPref.use()
  const courseArt = courseArtPref.use()
  const paywall = usePaywallGroup()
  const beta = useBeta()
  const panel = panelPref.use()
  const threeD = threeDPref.use()
  const print = usePrintSettings()
  const open = panel === "open"
  const onHome = usePathname() === "/courses"
  useEffect(() => {
    document.documentElement.dataset.corners = corners
  }, [corners])
  return (
    <div
      aria-label="Prototype versions"
      className={cn(
        "fixed left-3 z-40 flex flex-col rounded-[8px] border border-white/10 bg-[#1a1a1a]/95 py-1.5 pr-1.5 pl-3 shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur md:bottom-4 md:left-4",
        // v1 has a bottom tab bar on phones; sit above it.
        layout === "v1" ? "bottom-[84px]" : "bottom-4",
      )}
    >
      <div className={cn("flex items-center justify-between gap-3", open && "w-[184px]")}>
        <span className="text-[11px] text-[#9e9e9e]">Prototype</span>
        <button
          onClick={() => panelPref.set(open ? "closed" : "open")}
          aria-expanded={open}
          aria-label={open ? "Collapse prototype panel" : "Expand prototype panel"}
          className="grid size-7 place-items-center rounded-[4px] text-white/60 transition-[background-color,color,scale] duration-150 hover:bg-white/5 hover:text-white active:scale-[0.96]"
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      </div>
      {open && (
        <div className="flex max-h-[calc(100dvh-5rem)] w-[184px] flex-col gap-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Segmented
            label="Layout"
            value={layout}
            onChange={setHomeLayout}
            options={[
              { id: "v1", title: "One page per section" },
              { id: "v2", title: "One home with a bit of everything" },
            ]}
          />
          {layout === "v2" && onHome && (
            <Segmented
              label="Week card"
              value={week}
              onChange={weekPref.set}
              options={[
                { id: "v1", title: "First take of the week card" },
                { id: "v2", title: "Streak line and days share one box" },
              ]}
            />
          )}
          <Segmented
            label="Paywall"
            value={paywall}
            onChange={paywallPref.set}
            options={[
              { id: "A", title: "Group A: control, Training always free" },
              { id: "B", title: "Group B: fake door paywall" },
            ]}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] whitespace-nowrap text-[#9e9e9e]">Paywall rules</span>
            <button
              onClick={resetPaywallState}
              title={`Start over as a first session: no cooldown (${COOLDOWN_DAYS} days after a close), no owed paywall`}
              className="h-7 rounded-[4px] px-2 text-[12px] font-semibold text-white/60 transition-[background-color,color,scale] duration-150 hover:bg-white/5 hover:text-white active:scale-[0.96]"
            >
              Reset
            </button>
          </div>
          {onHome && (
            <Segmented
              label="Beta"
              value={beta}
              onChange={betaPref.set}
              options={[
                { id: "in", title: "In the closed beta" },
                { id: "out", title: "Outside the beta: waitlist" },
              ]}
            />
          )}
          <Segmented
            label="Corners"
            value={corners}
            onChange={cornersPref.set}
            options={[
              { id: "8", title: "Cards at 8px" },
              { id: "12", title: "Cards at 12px" },
            ]}
          />
          <Segmented
            label="Course art"
            value={courseArt}
            onChange={courseArtPref.set}
            options={[
              { id: "coins", title: "Metal coins" },
              { id: "print", title: "Print objects" },
            ]}
          />
          {courseArt === "print" && (
            <>
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-[#9e9e9e]">3D assets</span>
                <div className="flex items-center">
                  {threeD === "open" && (
                    <button
                      onClick={resetPrint}
                      className="h-7 rounded-[4px] px-2 text-[12px] font-semibold text-white/60 transition-[background-color,color,scale] duration-150 hover:bg-white/5 hover:text-white active:scale-[0.96]"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => threeDPref.set(threeD === "open" ? "closed" : "open")}
                    aria-expanded={threeD === "open"}
                    aria-label={threeD === "open" ? "Collapse 3D assets" : "Expand 3D assets"}
                    className="grid size-7 place-items-center rounded-[4px] text-white/60 transition-[background-color,color,scale] duration-150 hover:bg-white/5 hover:text-white active:scale-[0.96]"
                  >
                    {threeD === "open" ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              {threeD === "open" && (
                <>
                  <Segmented
                    label="Texture"
                    value={String(print.map) as "0" | "1" | "2"}
                    onChange={(v) => setPrint({ map: Number(v) as 0 | 1 | 2 })}
                    options={[
                      { id: "0", label: "Flat", title: "Flat on screen" },
                      { id: "1", label: "Wrap", title: "Wrapped on object" },
                      { id: "2", label: "Face", title: "Per face" },
                    ]}
                  />
                  <Segmented
                    label="Boil"
                    value={print.boil}
                    onChange={(v) => setPrint({ boil: v })}
                    options={[
                      { id: "3", label: "3", title: "3 drawings" },
                      {
                        id: "random",
                        label: "Rnd",
                        title: "Random: a new drawing every step",
                      },
                      { id: "off", label: "Off", title: "No boil" },
                    ]}
                  />
                  <Slider
                    id="print-boil-every"
                    label="Boil speed"
                    value={print.boilEvery}
                    min={1}
                    max={6}
                    step={1}
                    format={(v) => `/${v}f`}
                    onChange={(v) => setPrint({ boilEvery: v })}
                  />
                  <Slider
                    id="print-tex"
                    label="Tex size"
                    value={print.tex}
                    min={0.3}
                    max={2}
                    step={0.05}
                    format={(v) => v.toFixed(2)}
                    onChange={(v) => setPrint({ tex: v })}
                  />
                  <Slider
                    id="print-jump"
                    label="Jump"
                    value={print.jump}
                    min={0}
                    max={2}
                    step={0.05}
                    format={(v) => v.toFixed(2)}
                    onChange={(v) => setPrint({ jump: v })}
                  />
                  <Slider
                    id="print-fps"
                    label="FPS"
                    value={print.fps}
                    min={6}
                    max={24}
                    step={1}
                    onChange={(v) => setPrint({ fps: v })}
                  />
                  <Slider
                    id="print-spin"
                    label="Spin"
                    value={print.spin}
                    min={0}
                    max={0.15}
                    step={0.005}
                    format={(v) => v.toFixed(3)}
                    onChange={(v) => setPrint({ spin: v })}
                  />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function saveLayout(layout: Layout) {
  try {
    localStorage.setItem(LAYOUT_KEY, layout)
  } catch {}
}

/**
 * Prototype-only review tool, floating on the left: compare Cesar's original lesson layout (v1)
 * with the redesign (v2), and preview any exercise unanswered, answered wrong or answered right.
 */
export function PrototypePanel({
  layout,
  onLayout,
  state,
  onState,
  stateDisabled,
}: {
  layout: Layout
  onLayout: (layout: Layout) => void
  state: PreviewMode
  onState: (mode: PreviewMode) => void
  stateDisabled: boolean
}) {
  const layouts: { id: Layout; label: string; title: string }[] = [
    { id: "v1", label: "v1", title: "Original lesson layout" },
    { id: "v2", label: "v2", title: "Redesign from Figma" },
  ]
  const states: { id: PreviewMode; label: string; dot: string }[] = [
    { id: "default", label: "Default", dot: "bg-white/50" },
    { id: "wrong", label: "Wrong", dot: "bg-down" },
    { id: "right", label: "Right", dot: "bg-up" },
  ]
  // Always open beside the card on desktop; a button on phones so it never covers the actions.
  const [open, setOpen] = useState(false)
  const option =
    "flex h-8 w-full items-center gap-2 rounded-[4px] px-2.5 text-[12px] leading-4 font-medium transition-[background-color,color,scale] duration-150 enabled:active:scale-[0.96]"
  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Hide prototype review" : "Show prototype review"}
        aria-expanded={open}
        className="fixed top-[68px] left-3 z-40 grid size-9 place-items-center rounded-[6px] border border-white/10 bg-[#1a1a1a] shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-[scale] duration-150 active:scale-[0.96] md:hidden"
      >
        {open ? <X className="size-4" /> : <SlidersHorizontal className="size-4" />}
      </button>
      <aside
        aria-label="Prototype review"
        className={cn(
          "fixed top-[112px] left-3 z-40 w-[104px] flex-col gap-3 rounded-[8px] border border-white/10 bg-[#1a1a1a]/95 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur md:top-1/2 md:left-4 md:flex md:-translate-y-1/2",
          open ? "flex" : "hidden",
        )}
      >
        <div role="radiogroup" aria-label="Layout version" className="flex flex-col gap-1">
          <p className="px-2.5 pt-1 text-[11px] leading-4 text-[#9e9e9e]">Layout</p>
          <div className="grid grid-cols-2 gap-0.5 rounded-[6px] bg-black/40 p-0.5">
            {layouts.map((l) => (
              <button
                key={l.id}
                role="radio"
                aria-checked={layout === l.id}
                title={l.title}
                onClick={() => onLayout(l.id)}
                className={cn(
                  "h-7 rounded-[4px] text-[12px] font-semibold transition-[background-color,color,scale] duration-150 active:scale-[0.96]",
                  layout === l.id ? "bg-white text-black" : "text-white/60 hover:text-white",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div
          role="radiogroup"
          aria-label="Preview state"
          title={
            stateDisabled
              ? "Concept screens have no answer to preview"
              : "Preview this exercise unanswered, wrong or right"
          }
          className={cn("flex flex-col gap-0.5", stateDisabled && "opacity-40")}
        >
          <p className="px-2.5 pb-0.5 text-[11px] leading-4 text-[#9e9e9e]">State</p>
          {states.map((o) => (
            <button
              key={o.id}
              role="radio"
              aria-checked={state === o.id}
              disabled={stateDisabled}
              onClick={() => onState(o.id)}
              className={cn(
                option,
                state === o.id
                  ? "bg-white text-black"
                  : "text-white/60 enabled:hover:bg-white/5 enabled:hover:text-white",
              )}
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", o.dot)} />
              {o.label}
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}
