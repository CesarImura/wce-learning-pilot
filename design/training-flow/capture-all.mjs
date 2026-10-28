// Photographs the whole Training journey (entry, home, courses, lessons with right and wrong answers,
// unit tests, league, collection, lab) from the running prototype (port 3430) with headless Chrome.
// The paywall screens come from capture.mjs. node capture-all.mjs [id,id] -> shots/<id>.jpg
import { spawn } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { setTimeout as sleep } from "node:timers/promises"

const DIR = new URL(".", import.meta.url).pathname
const OUT = DIR + "shots/"
mkdirSync(OUT, { recursive: true })
const BASE = "http://localhost:3430"
const PORT = 9337
const only = process.argv[2]?.split(",")

const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${DIR}chrome-profile-all`, "--no-first-run", "--no-default-browser-check",
  "--hide-scrollbars", "--force-color-profile=srgb", "--enable-unsafe-swiftshader", "--window-size=1440,900",
], { stdio: "ignore" })
let ver
for (let i = 0; i < 60; i++) {
  try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break } catch { await sleep(250) }
}
const ws = new WebSocket(ver.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener("open", r, { once: true }))
let seq = 0
const pending = new Map()
const listeners = new Set()
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? rej(new Error(m.error.message)) : res(m.result)
  } else listeners.forEach((l) => l(m))
})
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++seq
  pending.set(id, { res, rej })
  ws.send(JSON.stringify({ id, method, params, sessionId }))
})
const { targetId } = await send("Target.createTarget", { url: "about:blank" })
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true })
const s = (m, p) => send(m, p, sessionId)
await s("Page.enable")
await s("Runtime.enable")
await s("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
const evaluate = async (expression) => {
  const r = await s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
  return r.result.value
}
const loaded = () => new Promise((res) => {
  const l = (m) => { if (m.method === "Page.loadEventFired" && m.sessionId === sessionId) { listeners.delete(l); res() } }
  listeners.add(l)
})
const HIDE = `(() => { if (document.getElementById('__hide')) return; const st = document.createElement('style'); st.id='__hide'; st.textContent = 'nextjs-portal,[aria-label="Prototype review"],[aria-label="Show prototype review"],[aria-label="Prototype versions"]{display:none!important} *,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}'; document.head.appendChild(st) })()`
async function go(path, wait = 1800) {
  const p = loaded()
  await s("Page.navigate", { url: BASE + path })
  await p
  await sleep(wait)
  await evaluate(HIDE)
}

// A returning group B student in the beta, with the demo history. reset: forget lessons, firsts and streak.
const BASE_STORAGE = {
  "wce-academy-layout": "v2", "wce-academy-home": "v2", "wce-academy-corners": "12", "wce-academy-sound-v1": JSON.stringify({ on: false }),
  "wce-academy-firsts-v1": JSON.stringify({ "first-lesson": 1, "first-flawless-test": 1, "first-course": 1, "first-perfect": 1, "first-streak": 1, "first-test": 1 }),
  "wce-training-paywall-group": "B", "wce-training-beta": "in", "wce-paywall-first-session": "earlier",
}
async function fresh(extra = {}, { newStudent = false } = {}) {
  await go("/courses", 1200)
  await evaluate(`(() => {
    sessionStorage.clear(); ["wce-paywall-unit-pending", "wce-paywall-closed-at", "wce-paywall-subscribed"].forEach((k) => localStorage.removeItem(k));
    const d = ${JSON.stringify({ ...BASE_STORAGE, ...extra })}; for (const k in d) localStorage.setItem(k, d[k]);
    ${newStudent ? `localStorage.setItem("wce-academy-firsts-v1", "{}")` : ""}
  })()`)
}

const click = (label, last = true) => evaluate(`(() => { const bs = [...document.querySelectorAll('button,a')].filter(b => b.textContent.trim() === ${JSON.stringify(label)} && !b.disabled); const b = ${last ? "bs.at(-1)" : "bs[0]"}; if (!b) return false; b.click(); return true })()`)
const has = (t) => evaluate(`document.body.innerText.includes(${JSON.stringify(t)})`)
async function shot(id) {
  if (only && !only.includes(id)) return
  await sleep(500)
  const r = await s("Page.captureScreenshot", { format: "jpeg", quality: 80 })
  writeFileSync(OUT + id + ".jpg", Buffer.from(r.data, "base64"))
  console.log("shot", id)
}
const radio = (label) => `[...document.querySelectorAll('[role=radio]')].find(b => b.textContent.trim() === ${JSON.stringify(label)})`
const isExercise = () => evaluate(`(() => { const w = ${radio("Wrong")}; return !!w && !w.disabled })()`)
// Skips learn screens until an exercise is up.
async function toExercise() {
  for (let i = 0; i < 12 && !(await isExercise()); i++) { await click("Continue"); await sleep(650) }
}
// A real, graded wrong answer: fill the scripted wrong answer, touch the exercise, press Check before the preview grades it.
async function answerWrong() {
  return evaluate(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const w = ${radio("Wrong")};
    if (!w || w.disabled) return false
    w.click()
    await sleep(50)
    document.querySelector('[class*="overscroll-contain"] > div')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    for (let k = 0; k < 12; k++) {
      await sleep(8)
      const c = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Check' && !b.disabled)
      if (c) { c.click(); return true }
    }
    return false
  })()`)
}
async function answerRight() {
  await evaluate(`(() => { const r = ${radio("Right")}; if (r && !r.disabled && r.getAttribute('aria-checked') !== 'true') r.click() })()`)
  await sleep(600)
}
// Plays on with right answers until one of the texts shows.
async function playUntil(texts, max = 60) {
  for (let i = 0; i < max; i++) {
    for (const t of texts) if (await has(t)) return t
    if (await isExercise()) await answerRight()
    if (!(await click("Check"))) await click("Continue")
    await sleep(650)
  }
  throw new Error("stuck before " + texts.join(" / ") + ": " + (await evaluate("document.body.innerText")).slice(0, 200))
}

const LESSON = "/courses/beginner-series/who-moves-markets"
const LESSON2 = "/courses/beginner-series/what-you-need"
const UNIT_TEST = "/courses/beginner-series/test-the-profession"

if (!process.env.SKIP_HAPPY) {
// --- First lesson ever, happy path: learn screen, exercise, hint, right answer, Why?, then firsts, streak, results
await fresh({ "wce-academy-streak-v1": JSON.stringify({ days: [] }) }, { newStudent: true })
await go(LESSON)
await shot("learn-step")
await toExercise()
await shot("exercise")
if (await click("Need a hint?")) { await sleep(600); await shot("hint"); await click("Hide help") }
await answerRight()
await shot("correct")
if (await click("Why?")) { await sleep(700); await shot("why"); await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await sleep(400) }
const end = await playUntil(["You did your first lesson", "First lesson", "day streak", "Lesson complete"])
console.log("end screen:", end)
for (let i = 0; i < 4 && !(await has("Lesson complete")); i++) {
  const t = await evaluate("document.body.innerText.slice(0, 80).replace(/\\n/g, ' ')")
  await shot(i === 0 ? "first-lesson" : "streak")
  console.log("end queue:", t)
  await click("Continue")
  await sleep(900)
}
await shot("lesson-perfect")

}
if (!process.env.SKIP_ERROR) {
// --- Error path: a wrong answer, the retry at the end, results with mistakes
await fresh()
await go(LESSON2)
await toExercise()
await answerWrong()
await sleep(700)
await shot("wrong")
await click("Continue")
await sleep(700)
await playUntil(["You missed this one earlier", "Lesson complete"])
if (await has("You missed this one earlier")) await shot("retry")
await playUntil(["Lesson complete"])
await sleep(2400)
await shot("lesson-mistakes")

}
if (!process.env.SKIP_TEST) {
// --- Unit test: question with hearts, a wrong answer, out of hearts
await fresh()
await go(UNIT_TEST)
await toExercise()
await shot("test-question")
await answerWrong()
await sleep(700)
await shot("test-wrong")
for (let q = 0; q < 6 && !(await has("Out of hearts")); q++) {
  await click("Continue")
  await sleep(700)
  await toExercise()
  await answerWrong()
  await sleep(700)
}
await sleep(800)
await shot("out-of-hearts")

}
// --- Unit test passed, and a whole course finished (coupon)
await fresh()
if (!process.env.SKIP_TEST) await playUntilPath(UNIT_TEST, "Claim & continue")
if (!process.env.SKIP_TEST) await shot("unit-reward")
// Order Flow has a single unit, so its test is also a Unit 1: show the coupon as group A, without the paywall on top.
await fresh({ "wce-training-paywall-group": "A" })
const lastTest = "/courses/order-flow/test-liquidity" // its only unit
console.log("order flow test:", lastTest)
if (lastTest) {
  await playUntilPath(lastTest, "Claim & continue")
  await sleep(1500)
  await shot("course-complete")
  await evaluate(`[...document.querySelectorAll('*')].find(e => e.textContent.trim() === 'Course reward')?.scrollIntoView({ block: 'center' })`)
  await sleep(500)
  await shot("course-coupon")
}
async function playUntilPath(path, text) {
  await go(path)
  return playUntil([text])
}

// --- League: weekly table, last week's result, demotion zone
await fresh()
await go("/league")
await shot("league")
await evaluate(`(() => {
  const id = (d) => { d = new Date(d); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") }
  const now = Date.now(), last = id(now - 7 * 86400000)
  const r = { week: last, from: 1, to: 2, rank: 2 }
  localStorage.setItem("wce-academy-league-v1", JSON.stringify({ league: 2, week: id(now), best: 2, history: [r], pending: r }))
})()`)
await go("/league")
await shot("league-result")
await fresh({ "wce-academy-xp-v1": JSON.stringify({ events: [] }) })
await evaluate(`localStorage.removeItem("wce-academy-league-v1")`)
await go("/league")
await shot("league-demotion")

// --- Collection, coin inspector, exercise lab
await fresh()
await go("/collection")
await shot("collection")
await evaluate(`document.querySelector('[aria-label$="Click to inspect"]')?.click()`)
await sleep(1500)
await shot("coin-inspector")
await go("/lab")
await shot("lab")

// Home and course page last, so they show the progress made above.
await fresh()
await evaluate(`localStorage.removeItem("wce-academy-league-v1")`)
// --- Home, catalog, course page
await fresh()
await go("/courses")
await shot("home-b")
await evaluate(`localStorage.setItem("wce-training-paywall-group", "A")`)
await go("/courses")
await shot("home-a")
await evaluate(`localStorage.setItem("wce-training-paywall-group", "B")`)
await go("/courses/all")
await shot("all-courses")
await go("/courses/beginner-series")
await shot("course")

ws.close()
chrome.kill()
process.exit(0)
