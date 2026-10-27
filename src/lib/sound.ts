"use client"

// Tiny synthesized sound effects (Web Audio, no asset files). Only plays when the
// learner has turned sound on.

import { soundOn } from "./engagement"

export type Sfx = "correct" | "wrong" | "combo" | "complete" | "streak" | "grab" | "drop"

// Notes as [frequency Hz, start s, duration s].
const PATTERNS: Record<Sfx, { notes: [number, number, number][]; type: OscillatorType; gain: number }> = {
  correct: { notes: [[660, 0, 0.09], [990, 0.08, 0.16]], type: "sine", gain: 0.18 },
  wrong: { notes: [[220, 0, 0.12], [175, 0.1, 0.2]], type: "triangle", gain: 0.16 },
  combo: { notes: [[523, 0, 0.1], [659, 0.08, 0.1], [784, 0.16, 0.1], [1047, 0.24, 0.25]], type: "sine", gain: 0.16 },
  complete: {
    notes: [[523, 0, 0.14], [659, 0.12, 0.14], [784, 0.24, 0.14], [1047, 0.36, 0.4], [1319, 0.36, 0.4]],
    type: "triangle",
    gain: 0.14,
  },
  streak: { notes: [[392, 0, 0.12], [587, 0.1, 0.12], [784, 0.2, 0.35]], type: "sawtooth", gain: 0.07 },
  grab: { notes: [[900, 0, 0.04]], type: "sine", gain: 0.06 },
  drop: { notes: [[600, 0, 0.05]], type: "sine", gain: 0.05 },
}

let ctx: AudioContext | null = null

export function playSfx(kind: Sfx) {
  if (typeof window === "undefined" || !soundOn()) return
  try {
    ctx ??= new AudioContext()
    const now = ctx.currentTime
    const { notes, type, gain } = PATTERNS[kind]
    for (const [freq, start, dur] of notes) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, now + start)
      g.gain.linearRampToValueAtTime(gain, now + start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
      osc.connect(g).connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.02)
    }
  } catch {
    // Audio unavailable: stay silent.
  }
}
