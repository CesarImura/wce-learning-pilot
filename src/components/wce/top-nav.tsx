"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Coins, FlaskConical, Lock, Search, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { BASE_POINTS, fmtPoints } from "@/lib/progress"
import { HomeLayoutSwitch, useHomeLayout } from "@/components/prototype-panel"

// Mirrors the platform's top bar (Figma "Sidebar" component). Only Student Area
// is built in this prototype; the other tabs are inert placeholders.
const TABS: { label: string; href?: string; match?: (p: string) => boolean; locked?: boolean }[] = [
  { label: "Dashboard" },
  { label: "Student Area" },
  {
    label: "Training",
    href: "/courses",
    match: (p) => p === "/" || ["/courses", "/league", "/collection", "/lab"].some((x) => p.startsWith(x)),
  },
  { label: "Ranks" },
  { label: "Leaderboard" },
  { label: "Community" },
  { label: "Macrodashboard", locked: true },
  { label: "Rewards" },
]

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/courses" className={cn("flex shrink-0 items-center gap-2", className)}>
      <Image src="/wce/logo-mark.svg" alt="" width={23} height={24} priority />
      <span className="font-serif text-[18px] font-medium tracking-[-0.01em] text-[#cfcfd0]">World Class Edge</span>
    </Link>
  )
}

export function PointsTracker() {
  return (
    <button className="flex h-[38px] items-center gap-3 rounded-[4px] bg-white/5 px-2 transition-colors hover:bg-white/10">
      <span className="flex items-center gap-2">
        <Image src="/wce/points-badge.svg" alt="" width={32} height={32} />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[14px] font-bold tracking-[0.01em] whitespace-nowrap text-brand-pale tabular-nums">
            {fmtPoints(BASE_POINTS)}
          </span>
          <span className="mt-0.5 text-[12px] font-medium whitespace-nowrap uppercase text-white/40">rank 1</span>
        </span>
      </span>
      <ChevronDown className="size-5 text-white/60" />
    </button>
  )
}

export function TopNav() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 shadow-[0_4px_10px_rgba(0,0,0,0.24)] backdrop-blur">
      <div className="mx-auto flex h-[50px] max-w-[1920px] items-center justify-between gap-6 px-4 lg:px-10">
        <div className="flex h-full items-center gap-6 2xl:gap-12">
          <Logo />
          <nav className="hidden h-full items-center xl:flex">
            {TABS.map((t) => {
              const active = t.match?.(pathname) ?? false
              const content = t.locked ? (
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2">
                  <Lock className="size-4" />
                  {t.label}
                </span>
              ) : (
                t.label
              )
              const cls = cn(
                "flex h-[50px] items-center px-2 text-[14px] whitespace-nowrap text-white transition-opacity 2xl:px-3",
                active ? "border-b border-brand" : "opacity-50 hover:opacity-80",
              )
              return t.href ? (
                <Link key={t.label} href={t.href} className={cls}>
                  {content}
                </Link>
              ) : (
                <span key={t.label} className={cn(cls, "cursor-default")}>
                  {content}
                </span>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <label className="hidden h-[38px] w-[264px] items-center gap-2 rounded-[4px] bg-white/5 px-3 min-[1560px]:flex">
              <Search className="size-5 text-white/70" />
              <input
                placeholder="Search courses"
                className="w-full bg-transparent text-[14px] font-medium text-white placeholder:text-white/70 focus:outline-none"
              />
            </label>
            <button
              aria-label="Notifications"
              className="hidden h-[38px] items-center rounded-[4px] bg-white/5 px-5 hover:bg-white/10 sm:flex"
            >
              <Bell className="size-5 fill-white text-white" />
            </button>
            <PointsTracker />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[14px] font-medium whitespace-nowrap text-white/70 min-[1360px]:block">Phillip Krawath</span>
            <span className="rounded-[7px] border border-brand/60 p-[3px]">
              <Image src="/wce/avatar.png" alt="" width={32} height={32} className="size-8 rounded-[4px] object-cover" />
            </span>
            <ChevronDown className="hidden size-5 text-white/60 md:block" />
          </div>
        </div>
      </div>
    </header>
  )
}

const ACADEMY_TABS = [
  { label: "Learn", href: "/courses", icon: BookOpen, match: (p: string) => p.startsWith("/courses") },
  { label: "League", href: "/league", icon: Trophy, match: (p: string) => p.startsWith("/league") },
  { label: "Collection", href: "/collection", icon: Coins, match: (p: string) => p.startsWith("/collection") },
  { label: "Exercise lab", short: "Lab", href: "/lab", icon: FlaskConical, match: (p: string) => p.startsWith("/lab") },
]

/** The Academy's own sub navigation, under the platform bar. */
function AcademyNav() {
  const pathname = usePathname()
  return (
    <div className="hidden border-b border-white/10 bg-black/40 backdrop-blur md:block">
      <div className="mx-auto flex h-12 max-w-[1440px] items-center gap-6 px-4 lg:px-10">
        <span className="font-serif text-[18px] text-white/90 italic">Training</span>
        <nav className="flex h-full items-center gap-1">
          {ACADEMY_TABS.map((t) => {
            const active = t.match(pathname)
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[14px] transition-colors",
                  active ? "bg-white/10 text-white" : "text-white/55 hover:text-white",
                )}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

/** On phones the Academy tabs move to a bottom tab bar, within thumb reach. */
function AcademyTabBar() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="grid h-16 grid-cols-4">
        {ACADEMY_TABS.map((t) => {
          const active = t.match(pathname)
          const Icon = t.icon
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                active ? "text-white" : "text-white/45",
              )}
            >
              <Icon className={cn("size-[22px]", active && "text-brand")} strokeWidth={active ? 2.2 : 1.8} />
              {t.short ?? t.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// v2: inner pages hang off the Training home, so they get a way back instead of section tabs.
const CRUMBS: Record<string, { label: string; wide?: boolean }> = {
  "/courses/all": { label: "All courses" },
  "/league": { label: "League", wide: true },
  "/collection": { label: "Coin collection" },
  "/lab": { label: "Exercise lab" },
}

function TrainingCrumb() {
  const crumb = CRUMBS[usePathname()]
  if (!crumb) return null
  return (
    // Same container as the page below it, so the crumb lines up with the title (the league page is wider).
    <div className={cn("mx-auto px-4 pt-5 lg:px-10", crumb.wide ? "max-w-[1680px]" : "max-w-[1440px]")}>
      <nav className="flex items-center gap-1.5 text-[14px] text-white/50">
        <Link href="/courses" className="-ml-1 flex items-center gap-1 rounded-[4px] px-1 py-0.5 transition-colors hover:text-white">
          <ChevronLeft className="size-4" />
          Training
        </Link>
        <ChevronRight className="size-4 text-white/30" />
        <span className="text-white/80">{crumb.label}</span>
      </nav>
    </div>
  )
}

/** Page background: black canvas with the blurred navy glow behind the header. */
export function PageShell({ children }: { children: ReactNode }) {
  const hub = useHomeLayout() === "v2"
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-120px] left-1/2 h-[420px] w-[1924px] -translate-x-1/2 opacity-90 blur-[200px]"
        style={{ backgroundImage: "linear-gradient(180deg, rgb(12,30,41) 13%, rgb(49,76,94) 120%)" }}
      />
      <TopNav />
      {hub ? <TrainingCrumb /> : <AcademyNav />}
      <div className={cn("relative", !hub && "pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0")}>{children}</div>
      {!hub && <AcademyTabBar />}
      <HomeLayoutSwitch />
    </div>
  )
}
