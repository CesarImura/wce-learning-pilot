"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"
import { SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"

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
  return { use, set }
}

// Training home layout: v1 = one page per section (Learn, League, Collection, Lab tabs),
// v2 = a single home with a bit of each, linking to the full pages.
const homePref = createPref<Layout>("wce-academy-home", ["v1", "v2"], "v2")
export const setHomeLayout = homePref.set
export const useHomeLayout = homePref.use

// "Your week" card on the v2 home: v1 = the first take, v2 = streak line and days in one box.
const weekPref = createPref<Layout>("wce-academy-week-card", ["v1", "v2"], "v2")
export const useWeekCard = weekPref.use

// Card corners: 8px (shadcn default) or 12px (Cesar's ask). The glass utility reads <html data-corners>.
type Corners = "8" | "12"
const cornersPref = createPref<Corners>("wce-academy-corners", ["8", "12"], "12")

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; title: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center justify-between gap-3">
      <span className="text-[12px] whitespace-nowrap text-[#9e9e9e]">{label}</span>
      <div className="grid grid-cols-2 gap-0.5 rounded-[6px] bg-black/40 p-0.5">
        {options.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={value === o.id}
            title={o.title}
            onClick={() => onChange(o.id)}
            className={cn(
              "h-7 w-9 rounded-[4px] text-[12px] font-semibold transition-[background-color,color,scale] duration-150 active:scale-[0.96]",
              value === o.id ? "bg-white text-black" : "text-white/60 hover:text-white",
            )}
          >
            {o.id}
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
  const onHome = usePathname() === "/courses"
  useEffect(() => {
    document.documentElement.dataset.corners = corners
  }, [corners])
  return (
    <div
      aria-label="Prototype versions"
      className={cn(
        "fixed left-3 z-40 flex w-[184px] flex-col gap-1 rounded-[8px] border border-white/10 bg-[#1a1a1a]/95 py-1.5 pr-1.5 pl-3 shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur md:bottom-4 md:left-4",
        // v1 has a bottom tab bar on phones; sit above it.
        layout === "v1" ? "bottom-[84px]" : "bottom-4",
      )}
    >
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
        label="Corners"
        value={corners}
        onChange={cornersPref.set}
        options={[
          { id: "8", title: "Cards at 8px" },
          { id: "12", title: "Cards at 12px" },
        ]}
      />
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
