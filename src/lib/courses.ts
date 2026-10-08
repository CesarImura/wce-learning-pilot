// Course catalog. Courses → units → lessons → steps.
// Titles and artwork mirror the WCE Student Area; lesson content is mock content.

import { beginnerSeries } from "./content/beginner-series"
import { KIND_LABELS, s, STEPS, type Lesson, type Step } from "./lessons"
import { TOPICS, type TopicId } from "./topics"

export type Unit = {
  id: string
  title: string
  description: string
  lessons: Lesson[]
  /** Hand-written unit test questions. Without them, the test is assembled from the unit's exercises. */
  test?: Step[]
}

export type Course = {
  id: string
  title: string
  tagline: string
  description: string
  /** What the course teaches; its coin is the course's visual identity in the Academy. */
  topic: TopicId
  level: "Beginner" | "Intermediate" | "Advanced" | "All levels"
  mentor?: string
  isNew?: boolean
  status: "available" | "coming-soon"
  units: Unit[]
}

export const POINTS_PER_CORRECT = 10

// Unit tests: the last node of every unit. Pass (finish with hearts left) for bonus points.
export const TEST_HEARTS = 3
export const UNIT_BONUS = 50
export const FLAWLESS_BONUS = 25
const AUTO_TEST_LENGTH = 6

export const COURSES: Course[] = [
  beginnerSeries,
  {
    id: "trading-fundamentals",
    title: "Trading Fundamentals",
    tagline: "Read charts, plan trades and manage risk",
    description:
      "Start here. Learn how candles are built, how to read market structure, how to plan a trade with a stop and a target, and how to size positions so one bad trade never hurts you.",
    topic: "foundations",
    level: "Beginner",
    status: "available",
    units: [
      {
        id: "reading-the-chart",
        title: "Reading the chart",
        description: "Candles, support and market regimes",
        lessons: [
          {
            id: "candles",
            title: "Candles 101",
            description: "Read and build candlesticks",
            icon: "candle",
            steps: s("candle-scrub", "candle-builder", "tap-engulfing"),
          },
          {
            id: "structure",
            title: "Market structure",
            description: "Support, trends and moving averages",
            icon: "layers",
            steps: s("draw-support", "sort-charts", "ma-tuner"),
          },
        ],
      },
      {
        id: "trading-with-a-plan",
        title: "Trading with a plan",
        description: "Execution, risk and your edge",
        lessons: [
          {
            id: "execution",
            title: "Executing trades",
            description: "Orders, breakouts and trade plans",
            icon: "target",
            steps: s("order-book", "predict-fakeout", "place-trade"),
          },
          {
            id: "risk",
            title: "Risk & edge",
            description: "Position sizing and expectancy",
            icon: "shield",
            steps: s("position-sizer", "expectancy-lab", "trade-journal"),
          },
        ],
      },
    ],
  },
  {
    id: "order-flow",
    title: "The Complete Order Flow",
    tagline: "See who is really moving price",
    description:
      "Order flow from first principles: how liquidity sits in the book, why big orders slip, and how to tell a real breakout from a trap.",
    topic: "order-flow",
    level: "Intermediate",
    mentor: "Fabio Valentini",
    isNew: true,
    status: "available",
    units: [
      {
        id: "liquidity",
        title: "Liquidity",
        description: "The order book and slippage",
        lessons: [
          {
            id: "order-book",
            title: "Reading the book",
            description: "Depth, fills and slippage",
            icon: "layers",
            steps: s("order-book", "candle-builder"),
          },
          {
            id: "breakouts",
            title: "Breakouts & traps",
            description: "Acceptance vs. rejection",
            icon: "target",
            steps: s("draw-support", "predict-fakeout", "place-trade"),
          },
        ],
      },
    ],
  },
  {
    id: "trader-dna",
    title: "The Trader DNA Method",
    tagline: "Know your numbers, trade your edge",
    description:
      "Turn your trading into data. Measure expectancy, read your own journal like a pro, and size positions so your edge can play out.",
    topic: "edge",
    level: "All levels",
    isNew: true,
    status: "available",
    units: [
      {
        id: "your-edge",
        title: "Your edge in numbers",
        description: "Expectancy and journaling",
        lessons: [
          {
            id: "expectancy",
            title: "Expectancy",
            description: "Win rate × reward-to-risk",
            icon: "sparkles",
            steps: s("expectancy-lab", "trade-journal"),
          },
          {
            id: "sizing",
            title: "Sizing like a pro",
            description: "Risk per trade and drawdowns",
            icon: "shield",
            steps: s("position-sizer", "ma-tuner"),
          },
        ],
      },
    ],
  },
  {
    id: "institutional-edge",
    title: "Institutional Edge",
    tagline: "Trade like the desks do",
    description: "How institutional traders think about risk, execution and size.",
    topic: "institutional",
    level: "Advanced",
    isNew: true,
    status: "coming-soon",
    units: [],
  },
  {
    id: "macro-investing",
    title: "Global Macro Investing",
    tagline: "From central banks to your portfolio",
    description: "Read the macro picture and turn it into positions.",
    topic: "macro",
    level: "Intermediate",
    isNew: true,
    status: "coming-soon",
    units: [],
  },
]

export function getCourse(id: string) {
  return COURSES.find((c) => c.id === id)
}

export const topicOf = (course: Course) => TOPICS[course.topic]

export function courseLessons(course: Course) {
  return course.units.flatMap((u) => u.lessons)
}

/** One example of every exercise type, taken from the course content (the "exercise lab"). */
export const LAB_STEPS: Record<string, Step> = (() => {
  const out: Record<string, Step> = { ...STEPS }
  for (const c of COURSES)
    for (const l of courseLessons(c)) for (const st of l.steps) if (!(st.kind in out)) out[st.kind] = st
  return out
})()

export const ALL_TYPES: Lesson = {
  id: "all",
  title: "All exercise types",
  description: "Every interaction in one run",
  icon: "sparkles",
  steps: Object.values(LAB_STEPS),
}

export const unitTestId = (unit: Unit) => `test-${unit.id}`

/** The unit test as a playable lesson. */
export function unitTest(unit: Unit): Lesson {
  let steps = unit.test
  if (!steps) {
    // Round-robin over the unit's lessons so the test covers all of them.
    const pools = unit.lessons.map((l) =>
      l.steps.filter((st) => st.mode === "exercise").map((st) => ({ ...st, source: st.source ?? l.id })),
    )
    steps = []
    for (let i = 0; steps.length < AUTO_TEST_LENGTH && pools.some((p) => p[i]); i++)
      for (const p of pools) if (p[i] && steps.length < AUTO_TEST_LENGTH) steps.push(p[i])
  }
  return {
    id: unitTestId(unit),
    title: `${unit.title}: unit test`,
    description: "Prove what you learned",
    icon: "shield",
    steps,
    test: { unitId: unit.id, unitTitle: unit.title, hearts: TEST_HEARTS, bonus: UNIT_BONUS, flawlessBonus: FLAWLESS_BONUS },
  }
}

export function getLesson(courseId: string, lessonId: string): Lesson | undefined {
  if (courseId === "lab") {
    if (lessonId === "all") return ALL_TYPES
    const step = LAB_STEPS[lessonId]
    return step ? { ...ALL_TYPES, id: lessonId, title: KIND_LABELS[step.kind], steps: [step] } : undefined
  }
  const course = getCourse(courseId)
  if (!course) return undefined
  const unit = course.units.find((u) => unitTestId(u) === lessonId)
  return unit ? unitTest(unit) : courseLessons(course).find((l) => l.id === lessonId)
}

export function lessonPoints(lesson: Lesson) {
  return lesson.steps.filter((st) => st.mode === "exercise").length * POINTS_PER_CORRECT
}

export function courseStats(course: Course) {
  const lessons = courseLessons(course)
  return {
    units: course.units.length,
    lessons: lessons.length,
    exercises: lessons.reduce((n, l) => n + l.steps.filter((st) => st.mode === "exercise").length, 0),
    points:
      lessons.reduce((n, l) => n + lessonPoints(l), 0) +
      course.units.reduce((n, u) => n + lessonPoints(unitTest(u)) + UNIT_BONUS, 0),
    minutes: lessons.reduce((n, l) => n + l.steps.length * 2, 0),
  }
}
