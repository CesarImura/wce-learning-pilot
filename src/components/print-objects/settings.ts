import { useSyncExternalStore } from "react"

export type PrintSettings = {
  /** Texture mapping: 0 Flat, 1 Wrapped on object, 2 Per face. */
  map: 0 | 1 | 2
  boil: "3" | "random" | "off"
  /** Ticks between boil steps. */
  boilEvery: number
  tex: number
  jump: number
  fps: number
  /** Yaw added per tick. */
  spin: number
}

export const PRINT_DEFAULTS: PrintSettings = { map: 0, boil: "3", boilEvery: 3, tex: 0.5, jump: 0, fps: 12, spin: 0.05 }

const KEY = "wce-print-settings"
const listeners = new Set<() => void>()
let current: PrintSettings = { ...PRINT_DEFAULTS }
let loaded = false

function load() {
  if (loaded || typeof window === "undefined") return
  loaded = true
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) current = { ...PRINT_DEFAULTS, ...JSON.parse(raw) }
  } catch {}
}

export function get(): PrintSettings {
  load()
  return current
}

export function set(partial: Partial<PrintSettings>) {
  load()
  current = { ...current, ...partial }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {}
  listeners.forEach((l) => l())
}

export function reset() {
  set(PRINT_DEFAULTS)
}

export function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function usePrintSettings(): PrintSettings {
  return useSyncExternalStore(subscribe, get, () => PRINT_DEFAULTS)
}
