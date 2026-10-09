"use client"

import { useCallback, useRef, useState, type ComponentType, type ReactNode } from "react"
import Link from "next/link"
import {
  BookOpen,
  CheckCircle2,
  Flame,
  Heart,
  HeartCrack,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Trophy,
  Volume2,
  Zap,
  VolumeX,
  X,
  XCircle,
} from "lucide-react"
import { TouchStage } from "@/components/exercises/touch-stage"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ExerciseKind, Lesson, Step } from "@/lib/lessons"
import { POINTS_PER_CORRECT, getCourse } from "@/lib/courses"
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
import { ReviewPanel } from "@/components/academy/review"
import type { ExerciseProps, Feedback } from "@/components/exercises/shared"
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
/** Below this accuracy (or after losing 2+ hearts) the results page recommends a review. */
const REVIEW_BELOW = 70

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
}: {
  lesson: Lesson
  courseId: string
  backHref: string
}) {
  const test = lesson.test
  const maxHearts = test?.hearts ?? MAX_HEARTS
  const isLab = courseId === "lab"

  // A "practice your mistakes" run replaces the steps with the missed ones.
  const [practice, setPractice] = useState<Step[] | null>(null)
  const steps = practice ?? lesson.steps

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
  const progress = ((index + (feedback || done ? 1 : 0)) / steps.length) * 100
  const flawless = graded.total > 0 && graded.right === graded.total
  const bonus = test && !practice ? test.bonus + (flawless ? test.flawlessBonus : 0) : 0

  const onReady = useCallback((fn: (() => Feedback) | null) => {
    checker.current = fn
    setReady(!!fn)
  }, [])
  const clearToast = useCallback(() => setToast(null), [])

  function check() {
    if (!checker.current) return
    const fb = checker.current()
    const total = graded.total + 1
    setGraded((g) => ({ right: g.right + (fb.correct ? 1 : 0), total }))

    if (!fb.correct) {
      setFeedback(fb)
      setHearts((h) => Math.max(0, h - 1))
      setMissed((m) => [...m, step])
      setCombo(0)
      setLastWrong(true)
      playSfx("wrong")
      return
    }

    const n = combo + 1
    const extra = practice ? 0 : comboBonus(n)
    setCombo(n)
    setPoints((p) => p + (practice ? 0 : POINTS_PER_CORRECT) + extra)
    setComboPoints((c) => c + extra)
    setFeedback(
      extra
        ? { ...fb, title: `${n} in a row! +${POINTS_PER_CORRECT} XP · +${extra} combo` }
        : practice
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
    if (index + 1 < steps.length) {
      checker.current = null
      setReady(false)
      setFeedback(null)
      setIndex((i) => i + 1)
      return
    }
    finish()
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
  }
  const practiceMistakes = () => restart([...missed])

  const accuracy = graded.total ? Math.round((graded.right / graded.total) * 100) : 100
  const struggled = missed.length > 0 && (accuracy < REVIEW_BELOW || maxHearts - hearts >= 2)

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

  if (done) {
    return (
      <Backdrop>
        <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-7 px-6 py-12 text-center">
          <div
            className={cn(
              "relative grid size-28 place-items-center rounded-full border animate-in zoom-in-50 duration-500",
              struggled
                ? "border-white/15 bg-white/[0.06]"
                : "border-gold/30 bg-gold/10 shadow-[0_0_60px_rgba(255,218,116,0.25)]",
            )}
          >
            {!struggled && <Sparks count={18} spread={140} />}
            {struggled ? <BookOpen className="size-12 text-white/70" /> : <Trophy className="size-12 text-gold" />}
          </div>
          <div className="space-y-2">
            <p className="eyebrow">{struggled ? "Lesson finished" : "Lesson complete"}</p>
            <h1 className="font-serif text-[40px] leading-tight font-medium tracking-[-0.02em]">{lesson.title}</h1>
            {struggled && <p className="text-[15px] text-white/60">Some of this didn&apos;t click yet, and that&apos;s normal.</p>}
          </div>
          <div className="glass grid w-full grid-cols-3 divide-x divide-white/10 py-4">
            <SummaryTile icon={<Zap className="size-5 fill-[#f5c451] text-[#f5c451]" />} label="XP" value={`+${points}`} tone="text-[#f5ddb1]" />
            <SummaryTile icon={<CheckCircle2 className="size-5 text-up" />} label="Accuracy" value={`${accuracy}%`} />
            <SummaryTile icon={<Heart className="size-5 fill-down text-down" />} label="Hearts" value={hearts} />
          </div>
          {comboPoints > 0 && (
            <p className="-mt-3 flex items-center gap-1.5 text-[14px] text-[#ffcf6e]">
              <Flame className="size-4" /> Includes +{comboPoints} XP combo bonus
            </p>
          )}
          {leagueSnap && <LeagueStanding {...leagueSnap} />}
          {struggled && (
            <ReviewPanel courseId={courseId} lesson={lesson} missed={missed} onPracticeMistakes={practiceMistakes} />
          )}
          <div className="flex w-full flex-col gap-2">
            <Link href={backHref} className={cn(bigButton, "flex items-center justify-center bg-white text-black hover:bg-white/85")}>
              Continue
            </Link>
            <Button variant="ghost" className={cn(bigButton, "text-white/70")} onClick={() => restart()}>
              Practice again
            </Button>
          </div>
        </main>
      </Backdrop>
    )
  }

  // ---------------------------------------------------------------------------
  // Playing

  return (
    <Backdrop>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-3">
          <Link href={backHref} aria-label="Exit lesson" className="text-white/50 hover:text-white">
            <X className="size-5" />
          </Link>
          {test && !practice && (
            <span className="hidden items-center gap-1.5 rounded-[4px] border border-gold/30 bg-gold/10 px-2 py-1 text-[12px] font-semibold tracking-wide text-gold uppercase sm:flex">
              <Trophy className="size-3.5" /> Unit test
            </span>
          )}
          {practice && (
            <span className="hidden items-center gap-1.5 rounded-[4px] border border-brand/30 bg-brand/10 px-2 py-1 text-[12px] font-semibold tracking-wide text-brand-pale uppercase sm:flex">
              <RotateCcw className="size-3.5" /> Mistakes
            </span>
          )}
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                test && !practice
                  ? "bg-gold shadow-[0_0_12px_rgba(255,218,116,0.5)]"
                  : "bg-brand shadow-[0_0_12px_rgba(106,190,242,0.6)]",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          {combo >= 2 && (
            <span
              key={combo}
              className="animate-pop flex items-center gap-1 text-[14px] font-semibold text-[#ffcf6e] tabular-nums"
              title="Correct answers in a row"
            >
              <Flame className="size-4 fill-[#ff9f43]" />
              {combo}
            </span>
          )}
          {test && !practice ? (
            <div className="flex items-center gap-0.5" aria-label={`${hearts} of ${maxHearts} hearts left`}>
              {Array.from({ length: maxHearts }, (_, i) => (
                <Heart key={i} className={cn("size-5 transition-all", i < hearts ? "fill-down text-down" : "scale-90 text-white/20")} />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[14px] font-semibold text-down tabular-nums">
              <Heart className="size-5 fill-current" />
              {hearts}
            </div>
          )}
          <div
            className="flex items-center gap-1 rounded-[4px] bg-white/5 py-1 pr-2.5 pl-1.5 text-[14px] font-bold text-[#f5ddb1] tabular-nums"
            title="XP earned in this lesson"
          >
            <Zap className="size-4 fill-[#f5c451] text-[#f5c451]" />
            {points} XP
          </div>
          <button
            onClick={() => setSound(!sound)}
            aria-label={sound ? "Turn sound off" : "Turn sound on"}
            title={sound ? "Sound on" : "Sound off"}
            className="text-white/40 hover:text-white"
          >
            {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 pb-44">
        <div key={`${attempt}-${index}`} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.12em] text-brand-soft uppercase">
              {isLearn && <Sparkles className="size-3.5" />}
              {step.eyebrow}
              <span className="text-white/30">·</span>
              <span className="text-white/40">{practice ? "Practice your mistakes" : lesson.title}</span>
            </p>
            <h1 className="text-[22px] leading-snug font-semibold tracking-[-0.01em] sm:text-[26px]">{step.prompt}</h1>
          </div>
          <TouchStage>
            <Exercise {...step.props} phase={feedback ? "review" : "answer"} onReady={onReady} />
          </TouchStage>
        </div>
      </main>

      <footer
        className={cn(
          "fixed inset-x-0 bottom-0 z-10 border-t backdrop-blur transition-colors",
          !feedback && "border-white/10 bg-black/85",
          feedback?.correct && "border-up/30 bg-up-soft/95",
          feedback && !feedback.correct && "border-down/30 bg-down-soft/95",
        )}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          {feedback ? (
            <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
              {feedback.correct ? (
                <CheckCircle2 className="mt-0.5 size-7 shrink-0 text-up" />
              ) : (
                <XCircle className="mt-0.5 size-7 shrink-0 text-down" />
              )}
              <div>
                <p className={cn("text-[18px] font-semibold", feedback.correct ? "text-up" : "text-down")}>
                  {feedback.title ?? (feedback.correct ? `Nicely done! +${POINTS_PER_CORRECT} XP` : "Not quite")}
                </p>
                <p className="text-[14px] text-white/75">{feedback.detail}</p>
              </div>
            </div>
          ) : (
            <span className="hidden text-[12px] tracking-wide text-white/40 uppercase sm:block">
              Step {index + 1} of {steps.length}
            </span>
          )}
          {isLearn ? (
            <Button className={cn(bigButton, "bg-white text-black hover:bg-white/85")} onClick={next}>
              Continue
            </Button>
          ) : feedback ? (
            <Button
              className={cn(bigButton, "text-black", feedback.correct ? "bg-up hover:bg-up/90" : "bg-down hover:bg-down/90")}
              onClick={next}
            >
              Continue
            </Button>
          ) : (
            <Button
              className={cn(
                bigButton,
                "bg-white text-black hover:bg-white/85 disabled:bg-white/15 disabled:text-white/40 disabled:opacity-100",
              )}
              disabled={!ready}
              onClick={check}
            >
              Check
            </Button>
          )}
        </div>
      </footer>

      {toast && <Toast onDone={clearToast}>{toast}</Toast>}
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

function Backdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-160px] left-1/2 h-[420px] w-[1600px] -translate-x-1/2 opacity-80 blur-[200px]"
        style={{ backgroundImage: "linear-gradient(180deg, rgb(12,30,41) 13%, rgb(49,76,94) 120%)" }}
      />
      <div className="relative flex flex-1 flex-col">{children}</div>
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

function SummaryTile({ icon, label, value, tone }: { icon: ReactNode; label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {icon}
      <span className={cn("text-[24px] font-medium tabular-nums", tone)}>{value}</span>
      <span className="text-[12px] tracking-wide text-white/40 uppercase">{label}</span>
    </div>
  )
}
