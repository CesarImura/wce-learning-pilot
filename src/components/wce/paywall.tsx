"use client"

// Training Pro fake door (Discovery board · Paywall, 24 Oct). Group B sees the paywall at full price;
// tapping Subscribe reveals that Pro is in beta and the first month is free, so the tap still measures
// willingness to pay. Access never changes: after either answer the student keeps learning.
// Group A never sees it; at the same moments we only log that they would have.

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { BookOpen, Check, Copy, Heart, MessageSquarePlus, PlayCircle, RotateCcw, Sparkles, Ticket, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { track, type PaywallSource } from "@/lib/analytics"
import { readPaywallGroup, usePaywallGroup } from "@/components/prototype-panel"

export const PRO_PRICE = "$9.99"

// ---------------------------------------------------------------------------
// A tiny store so any screen (home, course page, lesson player) can open the paywall or the request form.

// late: the Unit 1 paywall arrives at a later lesson completion, so its headline can't say "Unit 1 done".
type Open = { kind: "paywall"; source: PaywallSource; then?: () => void; late?: boolean } | { kind: "request" } | null
let open: Open = null
const listeners = new Set<() => void>()
const emit = (next: Open) => {
  open = next
  listeners.forEach((l) => l())
}
const useOpen = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => open,
    () => null,
  )

export function openPaywall(source: PaywallSource, then?: () => void, late?: boolean) {
  emit({ kind: "paywall", source, then, late })
}
export const openCourseRequest = () => emit({ kind: "request" })

/**
 * The Pro doors: in group B the paywall comes first and the action runs after it closes (access is the
 * same either way). In group A the action runs straight away and we log that the paywall would have shown.
 */
export function proGate(source: PaywallSource, action: () => void) {
  if (readPaywallGroup() === "B") openPaywall(source, action)
  else {
    track("training_paywall_eligible", { source, group: "A" })
    action()
  }
}

// ---------------------------------------------------------------------------
// Main trigger (Discovery board · Paywall triggers): shown by us after passing the Unit 1 test, but
// - never in the student's first Training session: then it waits for a lesson completion in a later session;
// - at most once per session;
// - not again for COOLDOWN_DAYS after the student closes a paywall (open decision: 3 to 7 days).
// Passive doors (request card, Pro badge, mistakes review) are opened on purpose and have no cap.

export const COOLDOWN_DAYS = 5
const KEY = {
  session: "wce-paywall-session", // sessionStorage: this browser session's id
  first: "wce-paywall-first-session", // the id of the first session Training was opened in
  pending: "wce-paywall-unit-pending", // Unit 1 passed, paywall still owed
  shown: "wce-paywall-shown-unit_complete", // sessionStorage: main trigger already shown this session
  closedAt: "wce-paywall-closed-at",
  subscribed: "wce-paywall-subscribed",
}
const get = (s: Storage, k: string) => {
  try {
    return s.getItem(k)
  } catch {
    return null
  }
}
const put = (s: Storage, k: string, v: string | null) => {
  try {
    if (v === null) s.removeItem(k)
    else s.setItem(k, v)
  } catch {}
}

/** Marks the session Training is first opened in; call on every Training screen. */
export function markTrainingSession() {
  let id = get(sessionStorage, KEY.session)
  if (!id) put(sessionStorage, KEY.session, (id = Math.random().toString(36).slice(2)))
  if (!get(localStorage, KEY.first)) put(localStorage, KEY.first, id)
}
const isFirstSession = () => {
  markTrainingSession()
  return get(localStorage, KEY.first) === get(sessionStorage, KEY.session)
}
const blocked = () => {
  if (get(localStorage, KEY.subscribed)) return true
  if (get(sessionStorage, KEY.shown)) return true
  const closedAt = Number(get(localStorage, KEY.closedAt) || 0)
  return Date.now() - closedAt < COOLDOWN_DAYS * 86_400_000
}
function fireMain(late: boolean) {
  if (isFirstSession() || blocked()) {
    put(localStorage, KEY.pending, "1") // try again at a later lesson completion
    return
  }
  put(localStorage, KEY.pending, null)
  put(sessionStorage, KEY.shown, "1")
  if (readPaywallGroup() === "B") openPaywall("unit_complete", undefined, late)
  else track("training_paywall_eligible", { source: "unit_complete", group: "A" })
}
/** The Unit 1 test was just passed. */
export const onUnitOnePassed = () => fireMain(false)
/** Any other lesson or unit test was completed: deliver a paywall that was postponed. */
export function onLessonCompleted() {
  if (get(localStorage, KEY.pending)) fireMain(true)
}
/** Prototype: start the paywall test over (first session, cooldown, owed paywall). */
export function resetPaywallState() {
  for (const k of [KEY.first, KEY.pending, KEY.closedAt, KEY.subscribed]) put(localStorage, k, null)
  for (const k of [KEY.session, KEY.shown]) put(sessionStorage, k, null)
  markTrainingSession()
}

// ---------------------------------------------------------------------------
// Copy

// Training only (Discovery board · What Pro offers): nothing outside Training, and removing ads is not a benefit.
// Suggested set: Unlimited lives, Mistakes review, Explain this answer, Every new course. Request a course leads
// only when the student came through the request card. At most 4 on screen so the test isn't diluted.
const BENEFITS = {
  courses: { icon: BookOpen, title: "Every new course", text: "Futures, CFDs and prop firm rules as they launch in Training. The 3 pilot courses stay free." },
  lives: { icon: Heart, title: "Unlimited lives", text: "Keep practicing after a mistake. On the free plan, lives refill once a day." },
  mistakes: { icon: RotateCcw, title: "Mistakes review", text: "A practice session made only of the questions you got wrong." },
  explain: { icon: PlayCircle, title: "Explain this answer", text: "After a mistake, watch the instructor's clip that explains the concept." },
  request: { icon: MessageSquarePlus, title: "Request a course", text: "Tell us what you want to learn and we build the course for you." },
} as const
type Benefit = keyof typeof BENEFITS
const SUGGESTED: Benefit[] = ["lives", "mistakes", "explain", "courses"]

// The first benefit matches the door the student came through.
const FIRST: Record<PaywallSource, Benefit> = {
  unit_complete: "courses",
  request_card: "request",
  mistakes_review: "mistakes",
  pro_badge: "lives",
}
const HEADLINE: Record<PaywallSource, string> = {
  unit_complete: "Unit 1 done. Take your training further",
  request_card: "Get the course you ask for",
  mistakes_review: "Turn your mistakes into practice",
  pro_badge: "Get more out of Training",
}
const SURVEY = {
  subscribed: { q: "What made you want Pro?", a: ["Unlimited lives", "Mistakes review", "New courses", "Request a course", "Other"] },
  closed: { q: "What held you back?", a: ["Too expensive", "Not right now", "I don't need Pro", "Not sure what Pro gives me", "Other"] },
}

// ---------------------------------------------------------------------------

const button =
  "flex h-12 w-full items-center justify-center gap-2 rounded-[6px] px-4 text-[16px] font-medium transition-[scale,background-color] duration-150 active:scale-[0.97]"

export function PaywallHost() {
  const current = useOpen()
  useEffect(() => markTrainingSession(), [])
  return (
    <>
      {current?.kind === "paywall" && <Paywall key={current.source} source={current.source} then={current.then} late={current.late} />}
      {current?.kind === "request" && <RequestCourse />}
    </>
  )
}

function Shell({ children, onClose, accent = "#edd066", label }: { children: ReactNode; onClose: () => void; accent?: string; label: string }) {
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          aria-label={label}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-y-auto rounded-t-[12px] border border-white/10 bg-[#141414] shadow-[0_24px_64px_rgba(0,0,0,0.6)] transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.2,0,0,1)] outline-none data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0 md:inset-0 md:m-auto md:h-fit md:w-[min(480px,calc(100vw-48px))] md:rounded-[12px]"
        >
          {/* Offer accent: a hairline on top and a folded corner, as on the platform's offer pop-ups. */}
          <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: accent }} />
          <span aria-hidden className="absolute top-0 right-0 size-3" style={{ background: `linear-gradient(225deg, ${accent} 50%, transparent 50%)` }} />
          <Dialog.Close aria-label="Close" className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/5 hover:text-white">
            <X className="size-5" />
          </Dialog.Close>
          <div className="flex flex-col gap-6 p-6 md:p-8">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Paywall({ source, then, late }: { source: PaywallSource; then?: () => void; late?: boolean }) {
  const group = usePaywallGroup()
  const [stage, setStage] = useState<"offer" | "subscribed" | "closed">("offer")
  const [answer, setAnswer] = useState<string | null>(null)
  useEffect(() => track("training_paywall_viewed", { source, group }), [source, group])
  const finish = () => {
    emit(null)
    then?.()
  }
  const closeOffer = () => {
    track("training_paywall_closed", { source })
    put(localStorage, KEY.closedAt, String(Date.now())) // starts the cooldown for the main trigger
    setStage("closed")
  }
  const order: Benefit[] = [FIRST[source], ...SUGGESTED.filter((b) => b !== FIRST[source])].slice(0, 4)

  if (stage === "offer")
    return (
      <Shell label="Training Pro" onClose={closeOffer}>
        <div className="flex flex-col gap-3 pr-8">
          <ProBadge label="Training Pro" />
          <Dialog.Title className="text-[24px] leading-8 font-medium tracking-[-0.4px] text-balance text-white">
            {late ? HEADLINE.pro_badge : HEADLINE[source]}
          </Dialog.Title>
          <p className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-[40px] leading-none font-medium text-white">{PRO_PRICE}</span>
            <span className="text-[16px] text-white/50">a month</span>
          </p>
          <p className="text-[14px] leading-5 text-white/50">
            Billed monthly. Cancel anytime. Only for Training: the rest of World Class Edge stays the same for you.
          </p>
        </div>
        <ul className="flex flex-col gap-1">
          {order.map((b, i) => {
            const B = BENEFITS[b]
            return (
              <li key={b} className={cn("flex gap-3 rounded-[8px] p-3", i === 0 && "bg-[#edd066]/[0.06] ring-1 ring-[#edd066]/20")}>
                <B.icon className={cn("mt-0.5 size-5 shrink-0", i === 0 ? "text-[#edd066]" : "text-white/60")} />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[16px] font-medium text-white">{B.title}</span>
                  <span className="text-[14px] leading-5 text-[#cfcfd0]">{B.text}</span>
                </span>
              </li>
            )
          })}
        </ul>
        <div className="flex flex-col gap-2">
          <button
            className={cn(button, "bg-white text-black hover:bg-white/90")}
            onClick={() => {
              track("training_paywall_subscribe_clicked", { source })
              put(localStorage, KEY.subscribed, "1") // a Founding Member never sees the main trigger again
              setStage("subscribed")
            }}
          >
            Subscribe for {PRO_PRICE} a month
          </button>
          <button className={cn(button, "text-white/70 hover:bg-white/5 hover:text-white")} onClick={closeOffer}>
            Not now
          </button>
        </div>
        <p className="text-center text-[12px] leading-4 text-white/40">Educational content, not financial advice.</p>
      </Shell>
    )

  // Both outcomes keep full access; the copy says exactly what is free and for how long.
  const subscribed = stage === "subscribed"
  const survey = SURVEY[stage]
  return (
    <Shell label={subscribed ? "You're a Founding Member" : "Keep learning"} onClose={finish} accent={subscribed ? "#edd066" : "#bae5ff"}>
      <div className="flex flex-col gap-3 pr-8">
        {subscribed ? <Sparkles className="size-8 text-[#edd066]" /> : <Check className="size-8 text-[#bae5ff]" />}
        <Dialog.Title className="text-[24px] leading-8 font-medium tracking-[-0.4px] text-white">
          {subscribed ? "You're a Founding Member" : "No problem, keep learning"}
        </Dialog.Title>
        <Dialog.Description className="text-[16px] leading-6 text-[#cfcfd0]">
          {subscribed
            ? "Training Pro is still in beta, so your first month is on us. No card needed and nothing will be charged. We'll tell you before anything changes."
            : "You still have full access to Training."}
        </Dialog.Description>
      </div>
      <button className={cn(button, "bg-white text-black hover:bg-white/90")} onClick={finish}>
        {subscribed ? "Keep learning" : "Continue"}
      </button>
      <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
        <p className="text-[14px] text-white/70">
          {survey.q} <span className="text-white/40">Optional</span>
        </p>
        {answer ? (
          <p className="flex items-center gap-2 text-[14px] text-up">
            <Check className="size-4" /> Thanks, that helps us decide what Pro should be.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {survey.a.map((a) => (
              <button
                key={a}
                onClick={() => {
                  setAnswer(a)
                  track("training_paywall_survey_answered", { source, outcome: subscribed ? "subscribed" : "closed", answer: a })
                }}
                className="h-9 rounded-[6px] border border-white/15 px-3 text-[14px] text-white/80 transition-colors hover:border-white/30 hover:text-white"
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}

export function ProBadge({ className, label = "Pro" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex w-fit items-center gap-1 rounded-[4px] bg-[#edd066] px-1.5 py-0.5 text-[12px] font-semibold text-black", className)}>
      <Sparkles className="size-3" /> {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Request a course (the 4th card on the Training home)

const TOPICS = ["What is Futures?", "CFDs explained", "Prop firm rules", "Crypto trading", "Risk management", "Reading the order book"]
const LEVELS = ["New to trading", "Some experience", "Experienced"]
const REQUESTS = "wce-training-course-requests"

function RequestCourse() {
  const group = usePaywallGroup()
  const [topic, setTopic] = useState("")
  const [level, setLevel] = useState(LEVELS[0])
  const [sent, setSent] = useState(false)
  const close = () => emit(null)
  const submit = () => {
    if (!topic.trim()) return
    try {
      const list = JSON.parse(localStorage.getItem(REQUESTS) || "[]")
      localStorage.setItem(REQUESTS, JSON.stringify([...list, { topic: topic.trim(), level, at: Date.now() }]))
    } catch {}
    track("training_course_requested", { topic: topic.trim(), level, group })
    setSent(true)
  }
  if (sent)
    return (
      <Shell label="Request sent" onClose={close} accent="#bae5ff">
        <div className="flex flex-col gap-3 pr-8">
          <Check className="size-8 text-[#bae5ff]" />
          <Dialog.Title className="text-[24px] leading-8 font-medium text-white">Request sent</Dialog.Title>
          <Dialog.Description className="text-[16px] leading-6 text-[#cfcfd0]">
            We read every request. When “{topic.trim()}” turns into a course, it shows up in Training and we email you.
          </Dialog.Description>
        </div>
        <button className={cn(button, "bg-white text-black hover:bg-white/90")} onClick={close}>
          Back to Training
        </button>
      </Shell>
    )
  return (
    <Shell label="Request a course" onClose={close} accent="#bae5ff">
      <div className="flex flex-col gap-2 pr-8">
        <Dialog.Title className="text-[24px] leading-8 font-medium text-white">Request a course</Dialog.Title>
        <Dialog.Description className="text-[16px] leading-6 text-[#cfcfd0]">
          What do you want to learn next? Courses are built from the WCE mentors’ classes.
        </Dialog.Description>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="request-topic" className="text-[14px] text-white/70">
          Topic
        </label>
        <input
          id="request-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="For example: how futures contracts work"
          className="h-12 rounded-[6px] border border-white/15 bg-white/[0.04] px-3 text-[16px] text-white outline-none placeholder:text-white/35 focus:border-[#6abef2]"
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={cn("h-8 rounded-[6px] border px-2.5 text-[13px] transition-colors", topic === t ? "border-[#6abef2] text-white" : "border-white/15 text-white/70 hover:text-white")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[14px] text-white/70">Your level</span>
        <div className="grid grid-cols-3 gap-1 rounded-[8px] bg-white/[0.04] p-1">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={cn("h-10 rounded-[6px] text-[13px] transition-colors", level === l ? "bg-white/10 text-white ring-1 ring-white/15" : "text-white/60 hover:text-white")}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <button disabled={!topic.trim()} className={cn(button, "bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40")} onClick={submit}>
        Send request
      </button>
    </Shell>
  )
}

// ---------------------------------------------------------------------------
// Course completion reward: a coupon for IQ Capital, where the students trade.

export function couponFor(courseId: string) {
  return `WCE-${courseId.split("-").map((w) => w.slice(0, 4).toUpperCase()).join("")}-20`
}

export function CourseReward({ courseId, courseTitle, compact }: { courseId: string; courseTitle: string; compact?: boolean }) {
  const code = couponFor(courseId)
  const [copied, setCopied] = useState(false)
  const copy = () => {
    track("training_coupon_copied", { course_id: courseId })
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
      () => {},
    )
  }
  return (
    <div className={cn("flex w-full flex-col gap-3 rounded-[8px] border border-[#edd066]/25 bg-[#edd066]/[0.05] text-left", compact ? "p-4" : "p-5")}>
      <div className="flex items-center gap-2 text-[#edd066]">
        <Ticket className="size-5" />
        <span className="text-[14px] font-medium">Course reward</span>
      </div>
      <p className="text-[16px] leading-6 text-white">
        You finished {courseTitle}. Here is <b className="font-medium">20% off</b> your next IQ Capital challenge.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex h-11 flex-1 items-center rounded-[6px] border border-dashed border-[#edd066]/40 px-3 font-mono text-[15px] tracking-wide text-[#edd066]">{code}</code>
        <button onClick={copy} className="flex h-11 items-center gap-1.5 rounded-[6px] bg-white px-4 text-[15px] font-medium text-black transition-colors hover:bg-white/90">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-[12px] text-white/45">One use per account, valid for 30 days at checkout on IQ Capital.</p>
    </div>
  )
}

/** Small print on every Training surface. */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-[12px] leading-4 text-white/40", className)}>
      Educational content only, not financial advice. Trading involves risk of loss. XP is not IQ Capital points.
    </p>
  )
}
