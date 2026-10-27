// Lessons are plain data: each step names an exercise type plus its prompt.
// In the real product these are generated from course transcripts.

/** The original demo exercises: self-contained, no props needed. */
export type DemoKind =
  | "candle-scrub"
  | "candle-builder"
  | "tap-engulfing"
  | "draw-support"
  | "sort-charts"
  | "ma-tuner"
  | "order-book"
  | "predict-fakeout"
  | "place-trade"
  | "position-sizer"
  | "expectancy-lab"
  | "trade-journal"

/** Template exercises: driven by `props`, so course content can reuse them. */
export type TemplateKind =
  | "concept"
  | "classify"
  | "order"
  | "directions"
  | "number"
  | "returns-reality"
  | "breakeven-curve"
  | "prop-firm"
  | "yield-curve"
  | "dividend-split"
  | "fed-cycle"
  | "carry-trade"
  | "real-yield-gold"
  | "volume-profile"
  | "orb-breakout"

export type ExerciseKind = DemoKind | TemplateKind

export type Step = {
  kind: ExerciseKind
  /** "learn" steps teach and only need Continue; "exercise" steps are graded. */
  mode: "learn" | "exercise"
  eyebrow: string
  prompt: string
  /** Content for template exercises (see src/components/exercises/templates). */
  props?: object
  /** Lesson this question reviews (unit tests). Defaults to the lesson it's played in. */
  source?: string
  /** Second in the lesson's video where this concept is taught. */
  at?: number
  /** "Need a hint?": a nudge, plus where to read more outside the Academy. */
  help?: StepHelp
}

export type StepHelp = {
  hint?: string
  links?: { label: string; source: string; url: string }[]
}

export type Lesson = {
  id: string
  title: string
  description: string
  icon: "candle" | "layers" | "target" | "shield" | "sparkles"
  steps: Step[]
  /** The course video this lesson is built from (Student Area). */
  video?: { title: string; url?: string }
  /** Set on unit tests: limited hearts, bonus points when passed. */
  test?: UnitTestRules
}

export type UnitTestRules = {
  unitId: string
  unitTitle: string
  hearts: number
  bonus: number
  flawlessBonus: number
}

export const STEPS: Record<DemoKind, Step> = {
  "candle-scrub": {
    kind: "candle-scrub",
    mode: "learn",
    eyebrow: "Concept",
    prompt: "How one hour of price becomes a single candle",
  },
  "candle-builder": {
    kind: "candle-builder",
    mode: "exercise",
    eyebrow: "Build",
    prompt: "Build the candle for this hour",
    help: { hint: "Open is the first price at 9:00 and Close the last one at 10:00. High and Low are the highest and lowest points the line reaches." },
  },
  "tap-engulfing": {
    kind: "tap-engulfing",
    mode: "exercise",
    eyebrow: "Spot it",
    prompt: "Tap the bullish engulfing candle",
    help: { hint: "Look at the end of the downtrend: a small red candle, then a green one whose body is bigger and covers it completely." },
  },
  "draw-support": {
    kind: "draw-support",
    mode: "exercise",
    eyebrow: "Draw",
    prompt: "Drag the line onto the support level",
    help: { hint: "Find the price where the lows keep stopping and bouncing back up. Three of them line up." },
  },
  "sort-charts": {
    kind: "sort-charts",
    mode: "exercise",
    eyebrow: "Classify",
    prompt: "Is each market trending or ranging?",
    help: { hint: "Trends keep making new highs (or new lows). Ranges keep bouncing between the same two levels." },
  },
  "ma-tuner": {
    kind: "ma-tuner",
    mode: "exercise",
    eyebrow: "Tune",
    prompt: "Tune the moving average until it gives 3 or fewer crossover signals",
    help: { hint: "Short averages hug price and flip sides often. Slide toward a longer period to smooth out the noise." },
  },
  "order-book": {
    kind: "order-book",
    mode: "exercise",
    eyebrow: "Experiment",
    prompt: "Find the biggest market buy that keeps slippage under 0.03%",
    help: { hint: "Each ask level costs more. Slippage stays tiny until you eat into the pricier levels, so push the size up until it only just stays under 0.03%." },
  },
  "predict-fakeout": {
    kind: "predict-fakeout",
    mode: "exercise",
    eyebrow: "Predict",
    prompt: "Your rule: only buy a breakout after a candle closes above resistance. What do you do?",
    help: { hint: "Look at where the last candle closed, not how high its wick went." },
  },
  "place-trade": {
    kind: "place-trade",
    mode: "exercise",
    eyebrow: "Plan the trade",
    prompt: "Price just broke out. Drag your stop loss and take profit to follow the plan.",
    help: { hint: "Put the stop just under 108. Your risk is entry minus stop; set the target at least twice that distance above the entry." },
  },
  "position-sizer": {
    kind: "position-sizer",
    mode: "exercise",
    eyebrow: "Calculate",
    prompt: "Use the lab to size your position",
    help: { hint: "Set the stop to 40 pips, then raise the risk until the position reads 0.5 lots." },
  },
  "expectancy-lab": {
    kind: "expectancy-lab",
    mode: "exercise",
    eyebrow: "Simulate",
    prompt: "Find a system that wins less than 40% of the time but still has an expectancy of at least +0.2R",
    help: { hint: "Expectancy = win rate × reward − loss rate × 1. Fewer wins means each win must pay more: lower the win rate, then raise the reward." },
  },
  "trade-journal": {
    kind: "trade-journal",
    mode: "exercise",
    eyebrow: "Analyze",
    prompt: "Review this trader's last 10 trades",
    help: { hint: "Add up every R in the log, then divide by the number of trades." },
  },
}

export const s = (...kinds: DemoKind[]) => kinds.map((k) => STEPS[k])

/** Human-readable name of each exercise type (course pages, exercise lab). */
export const KIND_LABELS: Record<ExerciseKind, string> = {
  "candle-scrub": "Candle anatomy",
  "candle-builder": "Build a candle",
  "tap-engulfing": "Spot patterns",
  "draw-support": "Draw support",
  "sort-charts": "Trend vs. range",
  "ma-tuner": "Tune indicators",
  "order-book": "Order book",
  "predict-fakeout": "Predict & reveal",
  "place-trade": "Plan a trade",
  "position-sizer": "Position sizing",
  "expectancy-lab": "Expectancy",
  "trade-journal": "Trade journal",
  concept: "Concept",
  classify: "Sort into buckets",
  order: "Put in order",
  directions: "Predict direction",
  number: "Calculate",
  "returns-reality": "Returns reality check",
  "breakeven-curve": "Break-even curve",
  "prop-firm": "Prop-firm payout",
  "yield-curve": "Yield curve",
  "dividend-split": "Dividends",
  "fed-cycle": "Central bank decisions",
  "carry-trade": "Carry trade",
  "real-yield-gold": "Real yields vs. gold",
  "volume-profile": "Volume profile",
  "orb-breakout": "Opening range breakout",
}
