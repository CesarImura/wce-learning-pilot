"use client"

// Stand-in for the platform dashboard (Order Flow hero plus course rows, as on worldclassedge.app today),
// only here to stage the Training launch: the announcement plays over it once, then a New panel stays.

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Play } from "lucide-react"
import { PILOT_COURSES } from "@/lib/courses"
import { useIntro } from "@/lib/intro"
import { consumeReplay, useBeta } from "@/components/prototype-panel"
import { TopicCoin } from "./topic-coin"
import { TrainingLaunch, launchHref } from "./training-launch"
import { useProgress } from "@/lib/progress"

const POSTERS = [
  { src: "/wce/dashboard/order-flow.jpg", title: "The Complete Order Flow Framework", meta: "Fabio Valentini · 1:40:14" },
  { src: "/wce/dashboard/trading-fundamentals.jpg", title: "Trading Fundamentals", meta: "Andrea Cimitan · 4:19:58" },
  { src: "/wce/dashboard/trader-dna.jpg", title: "The Trader DNA Method", meta: "Tom Vorwald · 1:12:03" },
  { src: "/wce/dashboard/macro-investing.jpg", title: "Global Macro Investing", meta: "Lars Schmeldtenkopf · 1:22:17" },
  { src: "/wce/dashboard/institutional-edge.jpg", title: "Institutional Edge", meta: "Serge Hoffmann · 1:31:47" },
  { src: "/wce/dashboard/proptrading.jpg", title: "Proptrading Masterclass", meta: "Brandon Kioseff" },
]

export function Dashboard() {
  // Prototype panel › Launch › Replay: reset to a student new to Training once the dashboard is up.
  useEffect(consumeReplay, [])
  const intro = useIntro()
  const progress = useProgress()
  const beta = useBeta()
  return (
    <>
      <Hero />
      <div className="mx-auto grid max-w-[1440px] gap-x-4 gap-y-10 px-4 pt-10 pb-24 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-10">
        <section aria-label="Continue watching" className="min-w-0">
          <h2 className="mb-4 text-[20px] font-medium">Continue watching</h2>
          <PosterRow posters={POSTERS.slice(0, 4)} progress />
        </section>
        <TrainingPanel href={launchHref(beta, progress)} beta={beta} />
        <section aria-label="All courses" className="min-w-0 lg:col-span-2">
          <h2 className="mb-4 text-[20px] font-medium">All courses</h2>
          <PosterRow posters={POSTERS} />
        </section>
      </div>
      {intro && !intro.announced && <TrainingLaunch />}
    </>
  )
}

function Hero() {
  return (
    <section className="relative h-[440px] overflow-hidden">
      <div className="absolute inset-y-0 right-0 w-full sm:w-[70%]">
        <Image src="/wce/dashboard/hero-order-flow.jpg" alt="" fill priority sizes="70vw" className="object-cover object-[70%_20%]" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#000_0%,rgba(0,0,0,.85)_28%,transparent_60%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />
      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col justify-center gap-6 px-4 lg:px-10">
        <div className="leading-none">
          <p className="font-serif text-[22px] text-white/90 italic">the complete</p>
          <p className="font-poster text-[72px] leading-[0.84] tracking-[0.005em] uppercase sm:text-[96px]">Order Flow</p>
          <p className="font-poster text-[40px] leading-[0.9] text-[#bae5ff] uppercase">framework</p>
        </div>
        <p className="max-w-[460px] text-[16px] leading-6 text-white/70">
          In this class, Fabio introduces the foundation of his order flow methodology: Auction Market Theory.
        </p>
        <div className="flex items-center gap-3">
          <button className="flex h-12 items-center gap-2 rounded-[6px] bg-white px-5 text-[16px] font-medium text-black transition-colors hover:bg-white/90">
            <Play className="size-4 fill-black" /> Watch now
          </button>
          <span className="text-[14px] text-white/50">10 videos · 1:40:14</span>
        </div>
      </div>
    </section>
  )
}

function PosterRow({ posters, progress }: { posters: typeof POSTERS; progress?: boolean }) {
  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:-mx-0 lg:px-0">
      {posters.map((p, i) => (
        <div key={p.src} className="w-[172px] shrink-0 space-y-2">
          <div className="relative aspect-[2/3] overflow-hidden rounded-[8px] bg-white/5 ring-1 ring-white/5 ring-inset">
            <Image src={p.src} alt="" fill sizes="172px" className="object-cover" />
            {progress && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                <div className="h-full bg-white" style={{ width: `${[62, 30, 85, 12][i] ?? 0}%` }} />
              </div>
            )}
          </div>
          <p className="truncate text-[14px] font-medium">{p.title}</p>
          <p className="truncate text-[12px] text-white/50">{p.meta}</p>
        </div>
      ))}
    </div>
  )
}

/** The panel Training keeps on the dashboard once the launch moment is over. */
function TrainingPanel({ href, beta }: { href: string; beta: "in" | "out" }) {
  return (
    <section
      aria-label="Training"
      className="glass relative flex flex-col justify-between gap-6 overflow-hidden p-5 shadow-[inset_32px_0_32px_rgba(169,228,246,0.08)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] text-white/50">Training</span>
        <span className="rounded-[2px] bg-[#e3465b] px-1.5 text-[12px] leading-5 font-semibold text-white">New</span>
      </div>
      <div className="flex justify-center -space-x-6">
        {PILOT_COURSES.map((c) => (
          <TopicCoin key={c.id} topicId={c.topic} size={112} />
        ))}
      </div>
      <div className="space-y-1.5">
        <h2 className="text-[20px] leading-7 font-semibold">Practice what the mentors teach</h2>
        <p className="text-[15px] leading-6 text-white/60">
          Short interactive lessons on real charts, a daily streak and a weekly league.
        </p>
      </div>
      <Link
        href={href}
        className="flex h-10 items-center justify-center gap-2 rounded-[6px] border border-[#bae5ff]/10 bg-[#bae5ff]/5 px-4 text-[16px] font-medium text-[#bae5ff] transition-colors hover:bg-[#bae5ff]/10"
      >
        {beta === "out" ? "Join the waitlist" : "Open Training"} <ArrowRight className="size-4" />
      </Link>
    </section>
  )
}
