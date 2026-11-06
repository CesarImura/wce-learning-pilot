"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { LEAGUE_MODEL, PrintObject } from "@/components/print-objects/print-object"
import { TradeObject } from "@/components/trade-objects/trade-object"
import type { TradeKind } from "@/components/trade-objects/trade-objects"
import { setCourseArt, setLeagueArt } from "@/components/prototype-panel"

// kind, name, Cesar's print model, what the object is in each version.
const ROWS: [TradeKind, string, number, string, string][] = [
  ["foundations", "Foundations", 0, "Candle", "Candle on an octagonal coin"],
  ["order-flow", "Order Flow", 6, "Order book ladder", "Order book ladder on a scalloped coin"],
  ["edge", "Trading Edge", 4, "Crystal", "Three rising candles and an arrow"],
  ["institutional", "Institutional", 7, "Bank columns", "Bank with laurel branches"],
  ["macro", "Macro", 8, "Globe", "Globe with an orbit"],
  ["bronze", "Bronze League", LEAGUE_MODEL, "Bell", "Opening bell with engraved candles"],
  ["silver", "Silver League", LEAGUE_MODEL + 1, "Medal", "Medal with a bear"],
  ["gold", "Gold League", LEAGUE_MODEL + 2, "Cup", "Charging bull"],
  ["obsidian", "Obsidian League", LEAGUE_MODEL + 3, "Crown", "Crown of candles"],
]

/** Review page for the Training art: Cesar's print objects beside the latest steel version, one row per object. */
export default function TradeLab() {
  const [hover, setHover] = useState<string | null>(null)
  const router = useRouter()
  const openHome = (art: "print" | "trade") => {
    setCourseArt(art)
    setLeagueArt(art)
    router.push("/courses")
  }
  return (
    <main className="min-h-screen bg-black px-4 pb-24 text-white sm:px-8">
      <div className="mx-auto max-w-[1040px]">
        <header className="pt-12 pb-8">
          <h1 className="text-[28px] leading-tight font-semibold text-balance">Training art: Cesar&apos;s original and the latest version</h1>
          <p className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-white/60">
            On the left, the print objects Cesar built. On the right, the latest version: the dark steel of this week&apos;s stills, with trading symbols
            and minted ornaments, as a real relief in three. Move the pointer over a row: Cesar&apos;s object plays its gesture and the steel one turns
            to face the pointer.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => openHome("trade")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[14px] font-medium text-black transition-colors hover:bg-white/90">
              See the latest version on the home <ArrowRight className="size-4" />
            </button>
            <button type="button" onClick={() => openHome("print")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-white/10 px-4 text-[14px] font-medium text-white transition-colors hover:bg-white/15">
              See Cesar&apos;s original on the home <ArrowRight className="size-4" />
            </button>
          </div>
        </header>

        <div className="sticky top-0 z-10 grid grid-cols-2 gap-4 border-b border-white/10 bg-black/85 py-3 backdrop-blur md:grid-cols-[200px_1fr_1fr]">
          <span className="hidden md:block" />
          <span className="text-center text-[15px] font-medium">Cesar&apos;s original</span>
          <span className="text-center text-[15px] font-medium">Latest version</span>
        </div>

        {ROWS.map(([kind, name, model, before, after]) => (
          <section
            key={kind}
            onPointerEnter={() => setHover(kind)}
            onPointerLeave={() => setHover(null)}
            className="grid grid-cols-2 items-center gap-4 border-b border-white/10 py-6 md:grid-cols-[200px_1fr_1fr]"
          >
            <h2 className="col-span-2 text-[18px] font-semibold md:col-span-1">{name}</h2>
            <figure className="flex flex-col items-center gap-2">
              <PrintObject model={model} hovered={hover === kind} className="relative aspect-square w-full max-w-[340px]" />
              <figcaption className="text-center text-[14px] text-white/50">{before}</figcaption>
            </figure>
            <figure className="flex flex-col items-center gap-2">
              <TradeObject kind={kind} hovered={hover === kind} className="relative aspect-square w-full max-w-[340px]" />
              <figcaption className="text-center text-[14px] text-white/50">{after}</figcaption>
            </figure>
          </section>
        ))}

        <p className="mt-8 max-w-[68ch] text-[14px] leading-relaxed text-white/50">
          On any Training page, the Prototype panel at the bottom left has an Art switch: Cesar (print objects), Now (this week&apos;s stills, not
          animated) and New (the latest version shown here).
        </p>
      </div>
    </main>
  )
}
