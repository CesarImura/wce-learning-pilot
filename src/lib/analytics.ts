// Training events, named as in the PostHog event plan (https://claude.ai/artifact/WLW8oo3PrVNYgP8PfhvsHx).
// The prototype has no PostHog key: events go to the console, and to posthog if a page ever loads it.

export type PaywallSource = "unit_complete" | "pro_badge" | "mistakes_review"

export type TrainingEvents = {
  // delivered_later: the Unit 1 paywall was owed and arrived at a lesson completion in a later session.
  training_paywall_viewed: { source: PaywallSource; group: "A" | "B"; delivered_later: boolean }
  training_paywall_eligible: { source: PaywallSource; group: "A"; delivered_later: boolean }
  training_paywall_subscribe_clicked: { source: PaywallSource }
  training_paywall_closed: { source: PaywallSource }
  training_paywall_survey_answered: { source: PaywallSource; outcome: "subscribed" | "closed"; answer: string }
  // topic is one of the suggested chips or "other": what the student typed goes to the request list, never to analytics.
  training_course_requested: { topic: string; level: string; group: "A" | "B" }
  training_coupon_copied: { course_id: string }
  training_waitlist_joined: Record<string, never>
  // Launch of Training to every student: dashboard announcement, first-lesson primer, home tour.
  training_intro_viewed: { beta: "in" | "out" }
  training_intro_clicked: { action: "start" | "waitlist" | "later" }
  training_primer_viewed: Record<string, never>
  training_primer_clicked: { action: "start" | "skip" }
  training_tour_step_viewed: { step: string; index: number }
  training_tour_finished: { outcome: "completed" | "skipped"; last_step: string }
}

export function track<E extends keyof TrainingEvents>(event: E, props: TrainingEvents[E]) {
  const ph = (globalThis as { posthog?: { capture: (e: string, p: object) => void } }).posthog
  if (ph) ph.capture(event, props)
  else if (process.env.NODE_ENV !== "production") console.debug("[track]", event, props)
}
