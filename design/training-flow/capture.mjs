// Photographs every screen of the Training Pro paywall test from the running prototype (port 3430)
// with headless Chrome. node capture.mjs [only-id] -> shots/<id>.jpg
import { spawn } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { setTimeout as sleep } from "node:timers/promises"

const DIR = new URL(".", import.meta.url).pathname
const OUT = DIR + "shots/"
mkdirSync(OUT, { recursive: true })
const BASE = "http://localhost:3430"
const PORT = 9336
const only = process.argv[2]

const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${DIR}chrome-profile`, "--no-first-run", "--no-default-browser-check",
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
async function go(path) {
  const p = loaded()
  await s("Page.navigate", { url: BASE + path })
  await p
  await sleep(1800)
  await evaluate(HIDE)
}

const BASE_STORAGE = {
  "wce-academy-layout": "v2", "wce-academy-home": "v2", "wce-academy-corners": "12", "wce-academy-sound-v1": JSON.stringify({ on: false }),
  "wce-academy-firsts-v1": JSON.stringify({ "first-lesson": 1, "first-perfect": 1, "first-streak": 1, "first-test": 1 }),
  "wce-training-paywall-group": "B", "wce-training-beta": "in",
}
const PAYWALL_KEYS = ["wce-paywall-first-session", "wce-paywall-unit-pending", "wce-paywall-closed-at", "wce-paywall-subscribed"]
// A returning student: Training was first opened in an earlier session.
async function fresh(extra = {}, { returning = true } = {}) {
  await go("/courses")
  await evaluate(`(() => {
    const d = ${JSON.stringify({ ...BASE_STORAGE, ...extra })}; for (const k in d) localStorage.setItem(k, d[k]);
    ${JSON.stringify(PAYWALL_KEYS)}.forEach((k) => localStorage.removeItem(k)); sessionStorage.clear()
    ${returning ? `localStorage.setItem("wce-paywall-first-session", "earlier")` : ""}
  })()`)
}

const HIDE = `(() => { if (document.getElementById('__hide')) return; const st = document.createElement('style'); st.id='__hide'; st.textContent = 'nextjs-portal,[aria-label="Prototype review"],[aria-label="Show prototype review"],[aria-label="Prototype versions"]{display:none!important} *,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}'; document.head.appendChild(st) })()`
const click = (label, last = true) => evaluate(`(() => { const bs = [...document.querySelectorAll('button,a')].filter(b => b.textContent.trim() === ${JSON.stringify(label)} && !b.disabled); const b = ${last ? "bs.at(-1)" : "bs[0]"}; if (!b) return false; b.click(); return true })()`)
const clickContains = (t) => evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(t)})); if (!b) return false; b.click(); return true })()`)
const has = (t) => evaluate(`document.body.innerText.includes(${JSON.stringify(t)})`)
const dialog = () => evaluate(`!!document.querySelector('[role=dialog]')`)
async function shot(id) {
  if (only && !only.split(",").includes(id)) return
  await sleep(500)
  const r = await s("Page.captureScreenshot", { format: "jpeg", quality: 80 })
  writeFileSync(OUT + id + ".jpg", Buffer.from(r.data, "base64"))
  console.log("shot", id)
}
// Answers every exercise through the preview panel until one of the end texts shows up.
// After the flip: only Continue until the end screen (the preview answers Wrong by itself).
play.finish = async (endTexts) => {
  for (let i = 0; i < 20; i++) {
    for (const t of endTexts) if (await has(t)) return t
    await click("Continue")
    await sleep(700)
  }
  throw new Error("stuck after the retry")
}
async function play(path, endTexts, { wrongFirst = false, retryAfter = 3 } = {}) {
  await go(path)
  let wrongDone = !wrongFirst
  let rights = 0
  for (let i = 0; i < 80; i++) {
    for (const t of endTexts) if (await has(t)) return t
    if (!wrongDone) {
      // The lesson's first exercise sorts styles into two buckets: fill them so at least one lands wrong.
      const graded = await evaluate(`(async () => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
        const bucket = (t) => [...document.querySelectorAll('div')].filter((e) => e.textContent.trim().startsWith(t)).at(-1)
        const check = () => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Check' && !b.disabled)
        if (!bucket('3–4 hours a day')) return false
        // The player only counts an exercise as touched on a real pointer press.
        bucket('3–4 hours a day').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
        bucket('3–4 hours a day').click()
        for (let i = 0; i < 8 && !check(); i++) { await sleep(150); bucket('A few hours a week or less').click() }
        await sleep(200)
        if (!check()) return false
        check().click(); return true
      })()`)
      await sleep(500)
      if (graded && (await has("Not quite"))) wrongDone = true
      await click("Continue")
      await sleep(650)
      continue
    }
    // Preview answers are graded, the moment an exercise loads. To keep the mistake for the review, the preview flips
    // to Wrong in the same tick as Continue on the last regular exercise, so the returning question is missed again.
    await evaluate(`(() => { const b = [...document.querySelectorAll('[role=radio]')].find(b => b.textContent.trim() === 'Right'); if (!b || b.disabled) return false; if (b.getAttribute('aria-checked') !== 'true') b.click(); return true })()`)
    await sleep(500)
    if (await evaluate(`/^\\s*\\+\\d+ XP/m.test(document.body.innerText)`)) rights++
    if (wrongFirst && rights >= retryAfter) {
      await evaluate(`(() => {
        const c = [...document.querySelectorAll('button,a')].find(b => b.textContent.trim() === 'Continue' && !b.disabled)
        if (!c) return false
        c.click()
        ;[...document.querySelectorAll('[role=radio]')].find(b => b.textContent.trim() === 'Wrong')?.click()
        return true
      })()`)
      await sleep(1200)
      return play.finish(endTexts)
    }
    if (!(await click("Check"))) await click("Continue")
    await sleep(650)
  }
  throw new Error(`stuck in ${path}: ${(await evaluate("document.body.innerText")).slice(0, 300)}`)
}

const UNIT_TEST = "/courses/beginner-series/test-the-profession"
const LESSON = "/courses/beginner-series/what-you-need"

const mistakesOnly = only?.includes("mistake")
if (!mistakesOnly) {
// 1. Entry
await fresh({ "wce-training-beta": "out" })
await go("/courses")
await shot("waitlist")
await fresh({ "wce-training-paywall-group": "A" })
await go("/courses")
await shot("home-a")
await fresh()
await go("/courses")
await shot("home-b")

// 2. Main trigger, first session: the reward screen, nothing opens, paywall is owed
await fresh({}, { returning: false })
await go("/courses") // this is the student's first Training session
await play(UNIT_TEST, ["Claim & continue"])
await shot("unit-reward")
await sleep(2200)
console.log("first session: dialog =", await dialog(), "pending =", await evaluate(`localStorage.getItem("wce-paywall-unit-pending")`))

// 3. ...a later session: the next lesson completion delivers it, with the headline that doesn't say Unit 1
await evaluate(`sessionStorage.clear()`)
await play(LESSON, ["Lesson complete"])
await shot("lesson-complete")
await sleep(2200)
await shot("paywall-late")

// 4. Main trigger in a later session: right on the Unit 1 reward
await fresh()
await play(UNIT_TEST, ["Claim & continue"])
await sleep(2400)
await shot("paywall-unit")
await click("Subscribe for $9.99 a month")
await sleep(600)
await shot("reveal")
await click("Unlimited lives")
await sleep(400)
await shot("reveal-survey")

// 5. Doors
await fresh()
await go("/courses")
await click("Get Training Pro")
await sleep(800)
await shot("paywall-badge")
await click("Not now")
await sleep(600)
await shot("closed")

await fresh()
await go("/courses")
await clickContains("Request a course")
await sleep(800)
await shot("paywall-request")
await click("Not now")
await sleep(400)
await click("Continue")
await sleep(700)
await shot("request-form")

}
await fresh()
await play(LESSON, ["Lesson complete"], { wrongFirst: true })
await sleep(2200) // main trigger isn't owed, so nothing opens by itself
await shot("lesson-mistakes")
await click("Practice your mistakes")
await sleep(800)
await shot("paywall-mistakes")
await click("Not now")
await sleep(400)
await click("Continue")
await sleep(1500)
await shot("mistakes-practice")

ws.close()
chrome.kill()
process.exit(0)
