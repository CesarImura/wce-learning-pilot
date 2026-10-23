"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react"
import Link from "next/link"
import { Dialog } from "@base-ui/react/dialog"
import {
  ArrowUpRight,
  Flame,
  Lightbulb,
  Play,
  HeartCrack,
  RotateCcw,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ExerciseKind, Lesson, Step } from "@/lib/lessons"
import { POINTS_PER_CORRECT, POINTS_PER_RETRY, courseLessons, getCourse } from "@/lib/courses"
import { courseProgress, readProgress, recordLesson } from "@/lib/progress"
import { LEAGUES, academyStats, weekId, weeklyStatus, type League } from "@/lib/league"
import { addXp, claimFirst, readLeague, recordActivity, setSound, useSound, type FirstKind } from "@/lib/engagement"
import { playSfx } from "@/lib/sound"
import {
  ComboMoment,
  FirstScreen,
  HalfwayMoment,
  LeagueStanding,
  Sparks,
  StreakScreen,
  Toast,
} from "@/components/academy/delight"
import { ReviewPanel, VideoSheet, fmtTime } from "@/components/academy/review"
import { OreArt } from "@/components/academy/league"
import type { ExerciseProps, Feedback } from "@/components/exercises/shared"
import { PrototypePanel, type Layout, type PreviewMode } from "@/components/prototype-panel"
import { TOPICS } from "@/lib/topics"
import { CandleBuilder, CandleScrub } from "@/components/exercises/candle-exercises"
import {
  DrawSupport,
  MaTuner,
  PlaceTrade,
  PredictFakeout,
  SortCharts,
  TapEngulfing,
} from "@/components/exercises/chart-exercises"
import { ExpectancyLab, OrderBook, PositionSizer, TradeJournal } from "@/components/exercises/risk-exercises"
import { Classify, Concept, Directions, NumberAnswer, OrderItems } from "@/components/exercises/templates"
import {
  BreakevenCurve,
  CarryTrade,
  DividendSplit,
  FedCycle,
  OrbBreakout,
  PropFirm,
  RealYieldGold,
  ReturnsReality,
  VolumeProfileTap,
  YieldCurveBuilder,
} from "@/components/exercises/widgets"

// Template exercises take their content from `step.props`, typed per component.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<ExerciseKind, ComponentType<ExerciseProps & any>> = {
  "candle-scrub": CandleScrub,
  "candle-builder": CandleBuilder,
  "tap-engulfing": TapEngulfing,
  "draw-support": DrawSupport,
  "sort-charts": SortCharts,
  "ma-tuner": MaTuner,
  "order-book": OrderBook,
  "predict-fakeout": PredictFakeout,
  "place-trade": PlaceTrade,
  "position-sizer": PositionSizer,
  "expectancy-lab": ExpectancyLab,
  "trade-journal": TradeJournal,
  concept: Concept,
  classify: Classify,
  order: OrderItems,
  directions: Directions,
  number: NumberAnswer,
  "returns-reality": ReturnsReality,
  "breakeven-curve": BreakevenCurve,
  "prop-firm": PropFirm,
  "yield-curve": YieldCurveBuilder,
  "dividend-split": DividendSplit,
  "fed-cycle": FedCycle,
  "carry-trade": CarryTrade,
  "real-yield-gold": RealYieldGold,
  "volume-profile": VolumeProfileTap,
  "orb-breakout": OrbBreakout,
}

const MAX_HEARTS = 5

const WIDE_KINDS: ExerciseKind[] = ["prop-firm", "carry-trade", "trade-journal"]

/** Combo bonus for the Nth correct answer in a row (0 = no bonus). */
const comboBonus = (n: number) => (n === 3 ? 5 : n >= 5 && n % 5 === 0 ? 10 : 0)

const bigButton = "h-12 shrink-0 rounded-[5px] px-8 text-[15px] font-semibold tracking-[-0.02em] transition-none sm:min-w-44"

type Moment = { kind: "combo"; combo: number; bonus: number } | { kind: "halfway" }
type EndScreenKind = FirstKind | "streak"
type LeagueSnap = {
  league: League
  before: { rank: number; xp: number }
  after: { rank: number; xp: number }
  toPromotion: number
  zone: "promote" | "demote" | "safe"
  canPromote: boolean
}

export function LessonPlayer({
  lesson,
  courseId,
  backHref,
  onLayout,
}: {
  lesson: Lesson
  courseId: string
  backHref: string
  /** Prototype comparison: switch to Cesar's original lesson layout. */
  onLayout: (layout: Layout) => void
}) {
  const test = lesson.test
  const maxHearts = test?.hearts ?? MAX_HEARTS
  const isLab = courseId === "lab"

  // A "practice your mistakes" run replaces the steps with the missed ones.
  const [practice, setPractice] = useState<Step[] | null>(null)
  // In a lesson, every missed question comes back once at the end ("second try").
  const [retries, setRetries] = useState<Step[]>([])
  const base = practice ?? lesson.steps
  const steps = retries.length ? [...base, ...retries] : base
  const canRetry = !test && !practice

  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [ready, setReady] = useState(false)
  const [hearts, setHearts] = useState(maxHearts)
  const [points, setPoints] = useState(0)
  const [comboPoints, setComboPoints] = useState(0)
  const [graded, setGraded] = useState({ right: 0, total: 0 })
  const [missed, setMissed] = useState<Step[]>([])
  const [combo, setCombo] = useState(0)
  const [lastWrong, setLastWrong] = useState(false)
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [clip, setClip] = useState<{ lesson: Lesson; at: number } | null>(null)
  // The learner has interacted with the current exercise (enables Start over / Continue).
  const [touched, setTouched] = useState(false)
  // "Start over" after a wrong answer retries the question right away.
  const [retryNow, setRetryNow] = useState(false)
  // Prototype review switch: show any exercise as the learner would see it unanswered, wrong or right.
  const [preview, setPreview] = useState<PreviewMode>("default")
  // "+10 XP" pop under the header counter, one per right answer.
  const [xpPop, setXpPop] = useState<{ id: number; amount: number } | null>(null)
  // The "Why?" explanation, open for the feedback it was asked about (closes itself when the step moves on).
  const [whyFor, setWhyFor] = useState<Feedback | null>(null)

  // Delight state: at most one full-screen moment per run; the rest become toasts.
  const [pendingMoment, setPendingMoment] = useState<Moment | null>(null)
  const [moment, setMoment] = useState<Moment | null>(null)
  const [bigShown, setBigShown] = useState(false)
  const [toast, setToast] = useState<ReactNode | null>(null)

  // End sequence
  const [endQueue, setEndQueue] = useState<EndScreenKind[]>([])
  const [streakInfo, setStreakInfo] = useState<ReturnType<typeof recordActivity> | null>(null)
  const [leagueSnap, setLeagueSnap] = useState<LeagueSnap | null>(null)

  const checker = useRef<(() => Feedback) | null>(null)
  const sound = useSound()

  const step = steps[index]
  const Exercise = REGISTRY[step.kind]
  const isLearn = step.mode === "learn"
  // Calculator-heavy widgets lay out in two columns on desktop, so they get a wider column.
  const wide = WIDE_KINDS.includes(step.kind)
  const isRetry = index >= base.length || retryNow
  const course = getCourse(courseId)
  const topic = course ? TOPICS[course.topic] : undefined
  const mentorName = course?.mentor?.split(" ")[0]
  const coinSrc = `/wce/coins/${course?.topic ?? "foundations"}-front.png`
  // Unit-test questions point back to the lesson (and video) they come from.
  const clipLesson =
    (step.source && course ? courseLessons(course).find((l) => l.id === step.source) : undefined) ?? lesson
  const progress = ((index + (feedback || done ? 1 : 0)) / steps.length) * 100
  const flawless = graded.total > 0 && graded.right === graded.total
  const bonus = test && !practice ? test.bonus + (flawless ? test.flawlessBonus : 0) : 0

  // Preview: once the exercise has filled in its scripted answer, show the feedback it produces.
  // Nothing here touches hearts, XP or the review list.
  useEffect(() => {
    if (preview === "default" || isLearn || feedback || done) return
    const want = preview === "right"
    const t = setTimeout(() => {
      const fb = checker.current?.()
      setFeedback(
        fb && fb.correct === want
          ? fb
          : { correct: want, detail: `Preview only: this exercise has no scripted ${want ? "right" : "wrong"} answer yet, so it shows the feedback layout without its real copy.` },
      )
    }, 150)
    return () => clearTimeout(t)
  }, [preview, index, attempt, isLearn, feedback, done])

  useEffect(() => {
    if (!xpPop) return
    const t = setTimeout(() => setXpPop(null), 1400)
    return () => clearTimeout(t)
  }, [xpPop])

  const onReady = useCallback((fn: (() => Feedback) | null) => {
    checker.current = fn
    setReady(!!fn)
  }, [])
  const clearToast = useCallback(() => setToast(null), [])
  // Long exercises shrink a little to fit the card on laptop screens.
  const [fitRoot, scrollBox, fitContent] = useFitScale(`${attempt}-${index}-${done}`)

  function check() {
    if (!checker.current) return
    const fb = checker.current()
    // Accuracy counts first attempts only; a second try can't raise or lower it.
    if (!isRetry) setGraded((g) => ({ right: g.right + (fb.correct ? 1 : 0), total: g.total + 1 }))

    if (!fb.correct) {
      setFeedback(isRetry ? { ...fb, title: "Still not quite" } : fb)
      setCombo(0)
      setLastWrong(true)
      playSfx("wrong")
      if (isRetry) return
      setHearts((h) => Math.max(0, h - 1))
      setMissed((m) => [...m, step])
      if (canRetry) setRetries((r) => [...r, step])
      return
    }

    // A fixed mistake leaves the review list (and the end-of-lesson queue when fixed on the spot).
    if (isRetry) setMissed((m) => m.filter((s) => s !== step))
    if (retryNow) setRetries((r) => r.filter((s) => s !== step))
    const n = combo + 1
    const plain = practice || isRetry
    const extra = plain ? 0 : comboBonus(n)
    // Every right answer earns XP: full on the first try, half after a retry. Combos add on top.
    const gained = (plain ? POINTS_PER_RETRY : POINTS_PER_CORRECT) + extra
    setCombo(n)
    setPoints((p) => p + gained)
    setXpPop({ id: Date.now(), amount: gained })
    setComboPoints((c) => c + extra)
    setFeedback(
      extra
        ? { ...fb, title: `${n} in a row! +${POINTS_PER_CORRECT} XP · +${extra} combo` }
        : plain
          ? { ...fb, title: "Got it this time" }
          : fb,
    )
    playSfx(extra ? "combo" : "correct")

    if (extra) {
      if (!bigShown) setPendingMoment({ kind: "combo", combo: n, bonus: extra })
      else setToast(<><Flame className="size-4 text-[#ffcf6e]" /> {n} in a row · +{extra}</>)
    } else if (lastWrong) {
      setToast(<><TrendingUp className="size-4 text-up" /> Nice recovery</>)
    }
    setLastWrong(false)

    // Halfway through a unit test with every heart intact.
    const half = Math.ceil(steps.length / 2)
    if (test && !practice && !extra && !bigShown && index + 1 === half && hearts === maxHearts && steps.length >= 4)
      setPendingMoment({ kind: "halfway" })
  }

  function next() {
    if (test && !practice && hearts === 0) {
      setFailed(true)
      return
    }
    if (pendingMoment) {
      setMoment(pendingMoment)
      setPendingMoment(null)
      setBigShown(true)
      return
    }
    advance()
  }

  function advance() {
    setTouched(false)
    setRetryNow(false)
    if (index + 1 < steps.length) {
      checker.current = null
      setReady(false)
      setFeedback(null)
      setIndex((i) => i + 1)
      return
    }
    finish()
  }

  function choosePreview(mode: PreviewMode) {
    checker.current = null
    setReady(false)
    setFeedback(null)
    setTouched(false)
    setRetryNow(false)
    setAttempt((a) => a + 1)
    setPreview(mode)
  }

  /** Resets the exercise. After a wrong answer it's an immediate second try. */
  function startOver() {
    setPreview("default")
    if (feedback && !feedback.correct) setRetryNow(true)
    checker.current = null
    setReady(false)
    setFeedback(null)
    setTouched(false)
    setAttempt((a) => a + 1)
  }

  function finish() {
    setDone(true)
    playSfx("complete")
    if (isLab || practice) return

    const accuracy = graded.total ? Math.round((graded.right / graded.total) * 100) : 100
    const before = readProgress()
    const course = getCourse(courseId)
    const courseWasOpen = course ? Boolean(courseProgress(course, before).next) : false
    const lessonsBefore = academyStats(before).lessons
    const earned = points + bonus

    recordLesson(courseId, lesson.id, { points: earned, accuracy, bonus: bonus || undefined })

    // Every completion earns league XP (replays included); show the weekly standing change.
    const lg = readLeague()
    const was = weeklyStatus(lg.league, weekId(), lg.weekXp)
    addXp(earned)
    const now = weeklyStatus(lg.league, weekId(), lg.weekXp + earned)
    setLeagueSnap({
      league: LEAGUES[lg.league],
      before: { rank: was.me.rank, xp: lg.weekXp },
      after: { rank: now.me.rank, xp: lg.weekXp + earned },
      toPromotion: now.toPromotion,
      zone: now.me.zone,
      canPromote: now.canPromote,
    })

    const after = readProgress()
    const queue: EndScreenKind[] = []
    // "Firsts": the seeded demo history counts as one lesson.
    if (!test && lessonsBefore <= 1 && claimFirst("first-lesson")) queue.push("first-lesson")
    if (test && flawless && claimFirst("first-flawless-test")) queue.push("first-flawless-test")
    if (course && courseWasOpen && !courseProgress(course, after).next && claimFirst("first-course"))
      queue.push("first-course")
    const s = recordActivity()
    setStreakInfo(s)
    if (s.newDay) queue.push("streak")
    setEndQueue(queue)
  }

  function restart(withSteps: Step[] | null = null) {
    setPractice(withSteps)
    setIndex(0)
    setFeedback(null)
    setReady(false)
    setHearts(maxHearts)
    setPoints(0)
    setComboPoints(0)
    setGraded({ right: 0, total: 0 })
    setMissed([])
    setRetries([])
    setClip(null)
    setCombo(0)
    setLastWrong(false)
    setDone(false)
    setFailed(false)
    setEndQueue([])
    setLeagueSnap(null)
    setPendingMoment(null)
    setMoment(null)
    setBigShown(false)
    setToast(null)
    setAttempt((a) => a + 1)
    setTouched(false)
    setRetryNow(false)
    setXpPop(null)
  }
  const practiceMistakes = () => restart([...missed])

  const accuracy = graded.total ? Math.round((graded.right / graded.total) * 100) : 100

  // ---------------------------------------------------------------------------
  // Out of hearts (unit tests)

  if (failed && test) {
    return (
      <Backdrop>
        <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-7 px-6 py-12 text-center">
          <div className="grid size-28 place-items-center rounded-full border border-down/30 bg-down/10 animate-in zoom-in-50 duration-500">
            <HeartCrack className="size-12 text-down" />
          </div>
          <div className="space-y-2">
            <p className="eyebrow">Out of hearts</p>
            <h1 className="font-serif text-[36px] leading-tight font-medium tracking-[-0.02em]">Not this time</h1>
            <p className="text-[15px] text-white/60">
              You got {graded.right} of {graded.total} right. The <span className="text-gold">+{test.bonus} bonus</span>{" "}
              is still waiting.
            </p>
          </div>
          <ReviewPanel courseId={courseId} lesson={lesson} missed={missed} onPracticeMistakes={practiceMistakes} />
          <div className="flex w-full flex-col gap-2">
            <Button className={cn(bigButton, "bg-white text-black hover:bg-white/85")} onClick={() => restart()}>
              Try the test again
            </Button>
            <Link href={backHref} className={cn(bigButton, "flex items-center justify-center text-white/70 hover:text-white")}>
              Back to the course
            </Link>
          </div>
        </main>
      </Backdrop>
    )
  }

  // ---------------------------------------------------------------------------
  // End sequence: firsts → streak → results

  if (done && endQueue.length > 0) {
    const current = endQueue[0]
    const shift = () => setEndQueue((q) => q.slice(1))
    return (
      <Backdrop>
        {current === "streak" && streakInfo ? (
          <StreakScreen streak={streakInfo.streak} week={streakInfo.week} onContinue={shift} />
        ) : (
          <FirstScreen kind={current as FirstKind} onContinue={shift} />
        )}
      </Backdrop>
    )
  }

  if (done && practice) {
    const fixed = graded.right
    return (
      <Backdrop>
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-7 px-6 text-center">
          <div className="relative">
            {fixed === graded.total && <Sparks count={20} spread={150} />}
            <div className="grid size-28 place-items-center rounded-full border border-brand/40 bg-brand/10">
              <RotateCcw className="size-12 text-brand-pale" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="eyebrow">Mistakes practiced</p>
            <h1 className="font-serif text-[36px] leading-tight">
              {fixed} of {graded.total} fixed
            </h1>
            <p className="text-[15px] text-white/60">
              {fixed === graded.total
                ? "Every one of them. Those concepts are sticking now."
                : "Getting there. Rewatching the video moment can help."}
            </p>
          </div>
          {missed.length > 0 && (
            <ReviewPanel courseId={courseId} lesson={lesson} missed={missed} onPracticeMistakes={practiceMistakes} />
          )}
          <div className="flex w-full flex-col gap-2">
            {test && (
              <Button className={cn(bigButton, "bg-white text-black hover:bg-white/85")} onClick={() => restart()}>
                Retake the unit test
              </Button>
            )}
            <Link
              href={backHref}
              className={cn(
                bigButton,
                "flex items-center justify-center",
                test ? "text-white/70 hover:text-white" : "bg-white text-black hover:bg-white/85",
              )}
            >
              Back to the course
            </Link>
          </div>
        </main>
      </Backdrop>
    )
  }

  if (done && test) {
    return (
      <Backdrop>
        <TestReward
          unitTitle={test.unitTitle}
          right={graded.right}
          total={graded.total}
          points={points - comboPoints}
          combo={comboPoints}
          bonus={test.bonus}
          flawlessBonus={flawless ? test.flawlessBonus : 0}
          backHref={backHref}
          league={leagueSnap}
          review={
            missed.length > 0 ? (
              <ReviewPanel courseId={courseId} lesson={lesson} missed={missed} onPracticeMistakes={practiceMistakes} />
            ) : null
          }
        />
      </Backdrop>
    )
  }

  // Lesson end, from the refined lesson design (Figma 10579:24139)
  if (done) {
    return (
      <Backdrop>
        <main className="mx-auto flex min-h-dvh w-full max-w-[582px] flex-col items-center justify-center gap-10 px-4 py-12 md:max-w-[550px] md:gap-14 md:px-0 md:py-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coinSrc} alt="" width={160} height={160} className="size-32 object-contain animate-in zoom-in-75 duration-500 md:size-40" />
          <div className="flex w-full flex-col items-center gap-2 text-center">
            <p className="text-[14px] leading-4 font-medium text-[#9e9e9e]">Lesson complete</p>
            <h1 className="text-[24px] leading-8 tracking-[-0.6px] text-white">{lesson.title}</h1>
          </div>
          <div className="flex w-full flex-col gap-1">
            <div className="flex w-full gap-1">
              <EndStat icon="/wce/lesson/heart.svg" value={hearts} label="Hearts" tone="text-down" />
              <EndStat icon="/wce/lesson/xp.svg" value={`+${points}`} label="XP" tone="text-[#ffd36e]" />
              <EndStat icon="/wce/lesson/check.svg" value={`${accuracy}%`} label="Accuracy" tone="text-up" />
            </div>
            {leagueSnap && <LeagueRow snap={leagueSnap} />}
          </div>
          <div className="flex w-full flex-col gap-4">
            <Link href={backHref} className={cn(lessonButton, "bg-white text-black hover:bg-white/90")}>
              Continue
            </Link>
            <button
              onClick={missed.length ? practiceMistakes : () => restart()}
              className={cn(lessonButton, "gap-2 bg-[#262626] text-white hover:bg-[#2e2e2e]")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wce/lesson/restart.svg" alt="" width={16} height={16} />
              {missed.length ? "Practice your mistakes" : "Practice again"}
            </button>
          </div>
        </main>
      </Backdrop>
    )
  }

  // ---------------------------------------------------------------------------
  // Playing, from the refined lesson design (Figma 10581:25009)

  const canContinue = ready && touched
  const watchAt = step.at ?? lesson.steps.find((s) => s.at !== undefined)?.at ?? 0
  const eyebrow = isRetry ? "Second try" : practice ? "Practice your mistakes" : test ? "Unit test" : null
  const watch =
    step.at !== undefined
      ? { label: `${mentorName ?? "The instructor"} in “${clipLesson.title}” · ${fmtTime(step.at)}`, open: () => setClip({ lesson: clipLesson, at: step.at! }) }
      : undefined

  return (
    <Backdrop>
      {/* The page is exactly one screen tall: header, then the card. Only the question inside the card scrolls. */}
      <div className="flex h-dvh flex-col px-4 pb-4 md:px-10">
        <header className="relative z-30 flex shrink-0 items-center gap-4 py-3 md:px-6 md:py-4">
          <div className="flex shrink-0 items-center xl:w-[267px]">
            <Link
              href={backHref}
              aria-label="Exit lesson"
              className="-m-2.5 grid size-10 place-items-center opacity-80 transition-[opacity,scale] duration-150 hover:opacity-100 active:scale-[0.96]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wce/lesson/close.svg" alt="" width={20} height={20} />
            </Link>
          </div>
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-[4px] bg-[#1a1a1a]">
            <div className="h-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-4 md:gap-6 xl:w-[267px]">
            <span className="flex items-center gap-2" aria-label={`${hearts} hearts left`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wce/lesson/heart.svg" alt="" width={20} height={20} />
              <span className="text-[16px] leading-5 font-semibold text-down tabular-nums">{hearts}</span>
            </span>
            <span className="relative flex items-center gap-1.5" title="XP earned in this lesson">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wce/lesson/xp.svg" alt="" width={20} height={20} />
              <span key={points} className="text-[16px] leading-5 font-semibold whitespace-nowrap text-[#ffd36e] tabular-nums animate-in zoom-in-110 duration-200">
                {points} XP
              </span>
              {xpPop && (
                <span
                  key={xpPop.id}
                  role="status"
                  className="pointer-events-none absolute top-full right-0 mt-2 rounded-[4px] bg-[#ffd36e] px-2.5 py-1 text-[13px] leading-4 font-semibold whitespace-nowrap text-black tabular-nums shadow-[0_6px_20px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  +{xpPop.amount} XP
                </span>
              )}
            </span>
            <button
              onClick={() => setSound(!sound)}
              aria-label={sound ? "Turn sound off" : "Turn sound on"}
              title={sound ? "Sound on" : "Sound off"}
              className={cn("hidden transition-opacity sm:block", sound ? "opacity-100" : "opacity-35")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wce/lesson/volume.svg" alt="" width={20} height={20} />
            </button>
          </div>
        </header>

        {/* Card from the lesson design (Figma 10596:52267 / 52383 / 52574): the question on top, the verdict bar underneath in its colour. */}
        <div
          ref={fitRoot}
          className={cn(
            "flex min-h-0 flex-1 flex-col rounded-[12px] transition-colors duration-300",
            // 70% so the verdict colour melts into the black page instead of sitting on it as a slab.
            !feedback ? "bg-black" : feedback.correct ? "bg-[#0b2d1e]/70" : "bg-[#340406]/70",
          )}
        >
          <main
            className={cn(
              "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border bg-black transition-colors duration-300",
              !feedback ? "border-[#262626]" : feedback.correct ? "border-[#185e3e]/70" : "border-[#63080c]/70",
            )}
          >
            {/* Light from the top in the verdict's colour; panels inside the exercise are translucent so it shows through. */}
            {[
              { on: !feedback, from: "from-[#314c5e]" },
              { on: !!feedback && !feedback.correct, from: "from-[#3d0507]" },
              { on: !!feedback?.correct, from: "from-[#0b2d1e]" },
            ].map((l) => (
              <div
                key={l.from}
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 h-[547px] max-h-[60%] bg-gradient-to-b to-transparent transition-opacity duration-500",
                  l.from,
                  l.on ? "opacity-45" : "opacity-0",
                )}
              />
            ))}
            {/* Keyed by step so every new question starts scrolled to the top. */}
            <div
              key={`${attempt}-${index}`}
              ref={scrollBox}
              className="relative flex flex-1 flex-col items-center overflow-y-auto overscroll-contain px-5 py-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-20 md:py-6"
            >
              <div
                ref={fitContent}
                className={cn(
                  // transition-none: duration-300 would otherwise animate the fit zoom and make it bounce.
                  "flex w-full shrink-0 flex-col gap-8 transition-none animate-in fade-in slide-in-from-right-4 duration-300",
                  isLearn ? "max-w-[550px]" : wide ? "max-w-[832px] lg:max-w-[1200px]" : "max-w-[832px]",
                )}
                onPointerDownCapture={() => !feedback && setTouched(true)}
                onKeyDownCapture={() => !feedback && setTouched(true)}
              >
                {isLearn && (
                  <div className="flex flex-col items-center gap-4 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coinSrc} alt="" width={64} height={64} className="size-16 object-contain" />
                    <div className="flex flex-col gap-1">
                      {topic && <p className="text-[12px] leading-4" style={{ color: topic.color }}>{topic.name}</p>}
                      <p className="text-[24px] leading-8 tracking-[-0.6px] text-white">{course?.title ?? lesson.title}</p>
                    </div>
                  </div>
                )}
                {!isLearn && (
                  <div className="flex flex-col gap-2">
                    {eyebrow && (
                      <p className="flex items-center gap-1.5 text-[12px] leading-4 font-medium text-brand">
                        {isRetry && <RotateCcw className="size-3.5" />}
                        {eyebrow}
                      </p>
                    )}
                    <h1 className="text-[22px] leading-8 tracking-[-0.6px] text-balance text-white md:text-[24px]">{step.prompt}</h1>
                    {isRetry && !feedback && (
                      <p className="text-[14px] text-white/55">You missed this one earlier. Give it another go.</p>
                    )}
                    <HelpPanel key={`${attempt}-${index}`} hint={step.help?.hint ?? (step.props as { hint?: string } | undefined)?.hint} links={step.help?.links} watch={watch} />
                  </div>
                )}

                <div>
                  <Exercise
                    {...step.props}
                    title={isLearn ? step.prompt : undefined}
                    phase={feedback ? "review" : "answer"}
                    verdict={feedback ? (feedback.correct ? "correct" : "wrong") : undefined}
                    onReady={onReady}
                    autoAnswer={preview === "default" || isLearn ? undefined : preview === "right" ? "correct" : "wrong"}
                    onWatch={() => setClip({ lesson: clipLesson, at: watchAt })}
                  />
                </div>
              </div>
            </div>
          </main>

          <div className="shrink-0 px-5 py-4">
            <div
              className={cn(
                "mx-auto flex w-full flex-wrap items-center gap-3 md:flex-nowrap md:gap-4",
                isLearn
                  ? "max-w-[calc(550px*var(--fit,1))]"
                  : wide
                    ? "max-w-[calc(832px*var(--fit,1))] lg:max-w-[calc(1200px*var(--fit,1))]"
                    : "max-w-[calc(832px*var(--fit,1))]",
              )}
            >
              {feedback && (
                <div role="status" className="flex basis-full flex-col gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200 md:flex-1 md:basis-auto">
                  <p className={cn("flex items-center gap-2 text-[20px] leading-6 font-semibold tracking-[-0.6px]", feedback.correct ? "text-up" : "text-down")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={feedback.correct ? "/wce/lesson/checkmark-filled.svg" : "/wce/lesson/error.svg"} alt="" width={20} height={20} />
                    {verdictTitle(feedback)}
                  </p>
                  {/* A miss explains itself right here; a hit keeps it behind "Why?". */}
                  {!feedback.correct && (
                    <div className="text-[16px] leading-6 text-pretty text-white/70">
                      {feedback.answer && <p>{feedback.answer}</p>}
                      <p>{feedback.detail}</p>
                    </div>
                  )}
                </div>
              )}
              {isLearn ? (
                <button onClick={next} className={cn(lessonButton, "mx-auto w-full bg-white text-black hover:bg-white/90 md:w-[448px]")}>
                  Continue
                </button>
              ) : feedback ? (
                <>
                  {feedback.correct && (
                    <button onClick={() => setWhyFor(feedback)} className={cn(lessonButton, "flex-1 bg-[#3d3d3d] px-6 text-white hover:bg-[#474747] md:flex-none")}>
                      Why?
                    </button>
                  )}
                  <button
                    onClick={next}
                    className={cn(
                      lessonButton,
                      "flex-1 text-white md:w-[200px] md:flex-none",
                      feedback.correct ? "bg-[#2caf74] hover:bg-[#31bd7d]" : "bg-[#ee252e] hover:bg-[#f2343d]",
                    )}
                  >
                    Continue
                  </button>
                </>
              ) : canContinue ? (
                <>
                  <button onClick={startOver} className={cn(lessonButton, "flex-1 gap-2 bg-[#262626] text-white hover:bg-[#2e2e2e] md:flex-none md:px-6")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/wce/lesson/restart.svg" alt="" width={16} height={16} />
                    Start over
                  </button>
                  {/* Start over sits on the left, away from Check, so the two aren't mixed up. */}
                  <button onClick={check} className={cn(lessonButton, "flex-1 bg-white text-black hover:bg-white/90 md:ml-auto md:w-[200px] md:flex-none")}>
                    Check
                  </button>
                </>
              ) : (
                <button disabled className={cn(lessonButton, "mx-auto w-full bg-[#1a1a1a] text-[#6e6e6e] md:w-[448px]")}>
                  Check
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <PrototypePanel layout="v2" onLayout={onLayout} state={preview} onState={choosePreview} stateDisabled={isLearn} />

      {whyFor && whyFor === feedback && (
        <WhyDialog
          feedback={feedback}
          prompt={step.prompt}
          watch={watch}
          links={step.help?.links}
          onClose={() => setWhyFor(null)}
          onStartOver={() => {
            setWhyFor(null)
            startOver()
          }}
          onContinue={() => {
            setWhyFor(null)
            next()
          }}
        />
      )}
      {toast && <Toast onDone={clearToast}>{toast}</Toast>}
      {clip && <VideoSheet courseId={courseId} lesson={clip.lesson} at={clip.at} onClose={() => setClip(null)} />}
      {moment?.kind === "combo" && (
        <ComboMoment
          combo={moment.combo}
          bonus={moment.bonus}
          onDone={() => {
            setMoment(null)
            advance()
          }}
        />
      )}
      {moment?.kind === "halfway" && (
        <HalfwayMoment
          hearts={hearts}
          onDone={() => {
            setMoment(null)
            advance()
          }}
        />
      )}
    </Backdrop>
  )
}


/**
 * "Need a hint?" under the question: a nudge, the moment in the course video that teaches it,
 * and outside reading for anything the course doesn't cover.
 */
function HelpPanel({
  hint,
  links,
  watch,
}: {
  hint?: string
  links?: ReadLink[]
  watch?: WatchLink
}) {
  const [open, setOpen] = useState(false)
  if (!hint && !links?.length && !watch) return null
  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="-mx-1 flex w-fit items-center gap-1.5 rounded-[6px] px-1 py-1 text-[14px] leading-5 font-medium text-brand transition-[color,scale] duration-150 hover:text-brand-soft active:scale-[0.96]"
      >
        <Lightbulb className="size-4" strokeWidth={2} />
        {open ? "Hide help" : "Need a hint?"}
      </button>
      {open && (
        <div className="flex flex-col gap-4 rounded-[8px] bg-white/10 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
          {hint && <p className="text-[15px] leading-6 text-pretty text-white/80">{hint}</p>}
          {watch && <WatchRow watch={watch} />}
          {links && links.length > 0 && <ReadMore links={links} />}
        </div>
      )}
    </div>
  )
}

type WatchLink = { label: string; open: () => void }
type ReadLink = { label: string; source: string; url: string }

/** The moment in the course video that teaches this step. */
function WatchRow({ watch }: { watch: WatchLink }) {
  return (
    <button
      onClick={watch.open}
      className="flex items-center gap-3 rounded-[8px] bg-black/40 p-3 text-left transition-[background-color,scale] duration-150 hover:bg-black/60 active:scale-[0.98]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10">
        <Play className="size-4 translate-x-px fill-white text-white" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[12px] leading-4 text-[#9e9e9e]">Watch it in the course</span>
        <span className="truncate text-[14px] leading-5 text-white">{watch.label}</span>
      </span>
    </button>
  )
}

/** Outside reading for anything the course doesn't cover. */
function ReadMore({ links }: { links: ReadLink[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] leading-4 text-[#9e9e9e]">Read more outside WCE</p>
      <ul className="flex flex-col gap-1">
        {links.map((l) => (
          <li key={l.url}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group -mx-2 flex items-center justify-between gap-3 rounded-[6px] px-2 py-2 transition-colors hover:bg-white/5"
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-[14px] leading-5 text-white">{l.label}</span>
                <span className="text-[12px] leading-4 text-[#9e9e9e]">{l.source}</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-white/40 transition-colors group-hover:text-white" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

const MIN_FIT = 0.8

/**
 * Scales the question down (never below 80%) when it is taller than the card, so charts and
 * calculators fit a laptop screen without scrolling. Phones keep full size and scroll instead.
 */
function useFitScale(key: string) {
  const root = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const r = root.current
    const b = box.current
    const c = content.current
    if (!r || !b || !c) return
    const measure = () => {
      // Always measure at full size: measuring the shrunk content lets text rewrap and the scale bounce.
      c.style.zoom = ""
      const css = getComputedStyle(b)
      // A few pixels of slack absorb shadows and rounding that spill past the content box.
      const room = b.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom) - 8
      const natural = c.getBoundingClientRect().height
      const next = window.innerWidth < 768 ? 1 : Math.max(MIN_FIT, Math.min(1, Math.floor((room / natural) * 100) / 100))
      c.style.zoom = next === 1 ? "" : String(next)
      // The verdict bar reads this to stay as wide as the (shrunk) question.
      r.style.setProperty("--fit", String(next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(b)
    ro.observe(c)
    return () => ro.disconnect()
  }, [key])
  return [root, box, content] as const
}

const lessonButton =
  "flex h-12 items-center justify-center rounded-[6px] px-4 py-3 text-[16px] leading-5 font-medium whitespace-nowrap transition-[scale,background-color] duration-150 enabled:active:scale-[0.96] disabled:cursor-not-allowed [a&]:active:scale-[0.96]"

function Backdrop({ children }: { children: ReactNode }) {
  return <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-black">{children}</div>
}

const verdictTitle = (f: Feedback) => f.title ?? (f.correct ? "Correct!" : "Not quite")

/** "Why?" from the verdict bar: the right answer, the reasoning, the course moment that teaches it and outside reading. */
function WhyDialog({
  feedback,
  prompt,
  watch,
  links,
  onClose,
  onStartOver,
  onContinue,
}: {
  feedback: Feedback
  prompt: string
  watch?: WatchLink
  links?: ReadLink[]
  onClose: () => void
  onStartOver: () => void
  onContinue: () => void
}) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col overflow-y-auto rounded-t-[12px] border border-white/10 bg-[#141414] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.2,0,0,1)] outline-none data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0 md:inset-0 md:m-auto md:h-fit md:w-[min(600px,calc(100vw-48px))] md:rounded-[12px] md:p-8">
          <div className="flex items-start justify-between gap-4">
            <p className={cn("flex items-center gap-2 text-[14px] leading-5 font-semibold", feedback.correct ? "text-up" : "text-down")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={feedback.correct ? "/wce/lesson/checkmark-filled.svg" : "/wce/lesson/error.svg"} alt="" width={16} height={16} />
              {verdictTitle(feedback)}
            </p>
            <Dialog.Close
              aria-label="Close"
              className="-m-2.5 grid size-10 shrink-0 place-items-center rounded-full opacity-70 transition-[opacity,scale] duration-150 hover:opacity-100 active:scale-[0.96]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wce/lesson/close.svg" alt="" width={16} height={16} />
            </Dialog.Close>
          </div>

          <Dialog.Title className="mt-3 text-[22px] leading-8 tracking-[-0.6px] text-balance text-white">{prompt}</Dialog.Title>

          <div className="mt-6 flex flex-col gap-6">
            {feedback.visual}
            {!feedback.correct && feedback.answer && (
              <div className="flex flex-col gap-1 rounded-[8px] border border-[#0d3523] bg-[#0b2d1e]/50 p-4">
                <p className="text-[12px] leading-4 text-[#9e9e9e]">The right answer</p>
                <p className="text-[16px] leading-6 font-medium text-white">{feedback.answer}</p>
              </div>
            )}
            <Dialog.Description className="text-[16px] leading-6 text-pretty text-white/80">{feedback.detail}</Dialog.Description>
            {watch && <WatchRow watch={watch} />}
            {links && links.length > 0 && <ReadMore links={links} />}
          </div>

          <div className="mt-8 flex gap-3">
            {!feedback.correct && (
              <button onClick={onStartOver} className={cn(lessonButton, "flex-1 gap-2 bg-[#262626] text-white hover:bg-[#2e2e2e]")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/wce/lesson/restart.svg" alt="" width={16} height={16} />
                Try again now
              </button>
            )}
            <button
              onClick={onContinue}
              className={cn(lessonButton, "flex-1 text-white", feedback.correct ? "bg-[#2caf74] hover:bg-[#31bd7d]" : "bg-[#ee252e] hover:bg-[#f2343d]")}
            >
              Continue
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EndStat({ icon, value, label, tone }: { icon: string; value: ReactNode; label: string; tone: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-[12px] bg-[#1c1c1c] p-4 md:p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" width={20} height={20} />
      <span className={cn("text-[24px] leading-8 tracking-[-0.6px] tabular-nums", tone)}>{value}</span>
      <span className="text-[16px] leading-5 font-medium text-[#8f8f8f]">{label}</span>
    </div>
  )
}

/** This week's league standing after the lesson (Figma 10580:24504). */
function LeagueRow({ snap }: { snap: LeagueSnap }) {
  const climbed = snap.before.rank - snap.after.rank
  return (
    <div className="flex items-center gap-4 rounded-[12px] bg-[#1c1c1c] p-4 md:gap-6 md:p-6">
      <div className="shrink-0 rounded-full border-2 border-[#3d3d3d] p-0.5">
        <div className="size-14 overflow-hidden rounded-full bg-[#262626]">
          <OreArt ore={snap.league.ore} className="size-full p-0 ring-0" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 text-[16px] leading-6 tracking-[-0.6px] text-white">
        <span className="font-bold">#{snap.after.rank}</span>
        <span>{snap.league.name}</span>
        {climbed > 0 && (
          <span className="flex items-center gap-1 leading-5 font-medium tracking-normal text-up">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wce/lesson/up-triangle.svg" alt="" width={16} height={12} />
            {climbed} place{climbed > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <span className="shrink-0 rounded-[6px] bg-[#2e2e2e] px-3 py-2 text-[14px] leading-4 tracking-[-0.6px] text-white tabular-nums">
        {snap.after.xp} XP
      </span>
    </div>
  )
}

/** Reward screen for a passed unit test: the bonus is the hero. */
function TestReward({
  unitTitle,
  right,
  total,
  points,
  combo,
  bonus,
  flawlessBonus,
  backHref,
  league,
  review,
}: {
  unitTitle: string
  right: number
  total: number
  points: number
  combo: number
  bonus: number
  flawlessBonus: number
  backHref: string
  league: LeagueSnap | null
  review: ReactNode
}) {
  const rows = [
    { label: `Correct answers (${right}/${total})`, value: points },
    ...(combo ? [{ label: "Combo bonus", value: combo, gold: true }] : []),
    { label: "Unit bonus", value: bonus, gold: true },
    ...(flawlessBonus ? [{ label: "Flawless run", value: flawlessBonus, gold: true }] : []),
  ]
  const totalPts = rows.reduce((n, r) => n + r.value, 0)
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-7 px-6 py-12 text-center">
      <div className="relative">
        <Sparks count={28} spread={180} />
        <div className="absolute inset-0 animate-ping rounded-full bg-gold/20 [animation-duration:2s]" />
        <div className="relative grid size-32 place-items-center rounded-full border-2 border-gold/60 bg-gradient-to-b from-gold/30 to-gold/5 shadow-[0_0_80px_rgba(255,218,116,0.45)] animate-in zoom-in-50 spin-in-12 duration-700">
          <Trophy className="size-14 text-gold" strokeWidth={1.75} />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[12px] font-semibold tracking-[0.2em] text-gold uppercase">Unit mastered</p>
        <h1 className="font-serif text-[36px] leading-tight font-medium tracking-[-0.02em]">{unitTitle}</h1>
      </div>
      <div className="glass w-full divide-y divide-white/10 text-left">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className="flex items-center justify-between px-4 py-3 animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
            style={{ animationDelay: `${300 + i * 250}ms` }}
          >
            <span className={cn("text-[15px]", r.gold ? "text-gold" : "text-white/70")}>{r.label}</span>
            <span className={cn("text-[17px] font-semibold tabular-nums", r.gold ? "text-gold" : "text-white")}>
              +{r.value}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between bg-white/[0.03] px-4 py-3">
          <span className="flex items-center gap-2 text-[15px] font-medium">
            <Zap className="size-5 fill-[#f5c451] text-[#f5c451]" /> Total
          </span>
          <span className="text-[22px] font-semibold text-[#f5ddb1] tabular-nums">+{totalPts} XP</span>
        </div>
      </div>
      {league && <LeagueStanding {...league} />}
      {review}
      <Link href={backHref} className={cn(bigButton, "flex w-full items-center justify-center bg-gold text-black hover:bg-gold/90")}>
        Claim & continue
      </Link>
    </main>
  )
}
