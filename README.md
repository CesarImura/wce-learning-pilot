# WCE Academy — interactive trading lessons (draft)

Duolingo-style path + Brilliant-style interactive exercises, built with Next.js and shadcn/ui,
styled after the World Class Edge platform (Figma: "World-Class-Edge – Platform v2").

```bash
npm run dev   # http://localhost:3000
```

## Pages

- `/courses` — Student Area–style catalog: featured-course hero, continue learning, all courses (filterable), exercise lab.
- `/courses/[courseId]` — course page: units with the lesson path, progress, course leaderboard.
- `/courses/[courseId]/[lessonId]` — the lesson player. `/courses/lab/all` (or `/courses/lab/<exercise-kind>`) plays the exercise demos.

## Where things live

- `src/lib/courses.ts` — the course catalog (courses → units → lessons).
- `src/lib/content/beginner-series.ts` — Andrea Cimitan's Beginner Series, written from the 12 video transcripts (one lesson per video). Use it as the model for new courses.
- `src/lib/lessons.ts` — the exercise step definitions (exercise type + prompt).
- `src/lib/progress.ts` — learner progress + points (localStorage for now).
- `src/components/wce/` — platform shell (top nav), catalog, course page.
- `public/wce/` — logo, points badge, avatar and course artwork exported from the Figma file.
- `src/lib/market.ts` — seeded synthetic chart generator with "planted" patterns (so every answer is known).
- `src/components/chart/candle-chart.tsx` — SVG candlestick chart, draggable price lines.
- `src/components/exercises/` — exercise components. Each receives `phase` and calls `onReady(checker)` when it has an answer.
  - `templates.tsx` — content-driven templates (concept, classify, order, directions, number): new lessons only need data.
  - `widgets.tsx` — custom interactive widgets (break-even curve, yield curve, carry trade, ORB…).
  - `chart-exercises.tsx`, `candle-exercises.tsx`, `risk-exercises.tsx` — the original demo exercises.
- `src/components/lesson-player.tsx` — progress bar, hearts, XP, Check/Continue feedback bar, completion screen.

All content is mock content for demonstrating the exercise types.
