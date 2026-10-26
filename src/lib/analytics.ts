// Training events, named as in the PostHog event plan (https://claude.ai/artifact/WLW8oo3PrVNYgP8PfhvsHx).
// The prototype has no PostHog key: events go to the console, and to posthog if a page ever loads it.

export type PaywallSource = "unit_complete" | "request_card" | "pro_badge" | "mistakes_review"

export type TrainingEvents = {
  training_paywall_viewed: { source: PaywallSource; group: "A" | "B" }
  training_paywall_eligible: { source: PaywallSource; group: "A" }
  training_paywall_subscribe_clicked: { source: PaywallSource }
  training_paywall_closed: { source: PaywallSource }
  training_paywall_survey_answered: { source: PaywallSource; outcome: "subscribed" | "closed"; answer: string }
  training_course_requested: { topic: string; level: string; group: "A" | "B" }
  training_coupon_copied: { course_id: string }
  training_waitlist_joined: Record<string, never>
}

export function track<E extends keyof TrainingEvents>(event: E, props: TrainingEvents[E]) {
  const ph = (globalThis as { posthog?: { capture: (e: string, p: object) => void } }).posthog
  if (ph) ph.capture(event, props)
  else if (process.env.NODE_ENV !== "production") console.debug("[track]", event, props)
}
