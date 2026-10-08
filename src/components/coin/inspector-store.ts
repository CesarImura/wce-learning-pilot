"use client"

// Which coin is in the inspector. A module store so any coin on the page can open it
// and the single <CoinInspector /> in the root layout can render it.

import { useSyncExternalStore } from "react"
import type { CoinProps } from "./coin"

export type Inspected = {
  /** Identifies the inline coin, which hides while its twin is in the inspector. */
  key: string
  props: CoinProps
  /** Where the inline coin sits, so the inspector can grow out of it and return to it. */
  rect: DOMRect
  from: { rx: number; ry: number }
}

let current: Inspected | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function openInspector(i: Inspected) {
  current = i
  emit()
}
export function closeInspector() {
  current = null
  emit()
}
export const useInspected = () => useSyncExternalStore(subscribe, () => current, () => null)
export const useInspectedKey = () => useSyncExternalStore(subscribe, () => current?.key ?? null, () => null)
