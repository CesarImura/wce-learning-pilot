import { createRequire } from "node:module"
const root = new URL("../..", import.meta.url).pathname.replace(/\/$/, "") // the repo root
const require = createRequire(root + "/package.json")
const { createJiti } = require("jiti")
const jiti = createJiti(root + "/", { alias: { "@": root + "/src" } })
const c = await jiti.import(root + "/src/lib/courses.ts")
const out = []
for (const course of c.COURSES) {
  course.units.forEach((unit, u) => {
    const lessons = [...unit.lessons, c.unitTest ? c.unitTest(unit) : null].filter(Boolean)
    for (const lesson of lessons) {
      lesson.steps.forEach((st, i) =>
        out.push({ course: course.title, courseId: course.id, unit: `Unit ${u + 1}: ${unit.title}`, lesson: lesson.title, lessonId: lesson.id, isTest: !!lesson.test, n: i + 1, kind: st.kind, mode: st.mode, eyebrow: st.eyebrow, prompt: st.prompt, props: st.props ?? null, help: st.help ?? null, source: st.source ?? null }),
      )
    }
  })
}
console.log(JSON.stringify(out))
