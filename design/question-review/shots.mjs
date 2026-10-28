// Walks every lesson in the prototype with headless Chrome and photographs each step twice:
// as the learner first sees it, and after a right answer (preview panel "Right").
// node shots.mjs  -> shots/<ID>-q.jpg, shots/<ID>-a.jpg, shots.json
import { spawn } from "node:child_process"
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { setTimeout as sleep } from "node:timers/promises"

const DIR = new URL(".", import.meta.url).pathname
const OUT = DIR + "shots/"
mkdirSync(OUT, { recursive: true })
const BASE = "http://localhost:3430"
const PORT = 9334
const rows = JSON.parse(readFileSync(DIR + "rows.json", "utf8"))
const steps = JSON.parse(readFileSync(DIR + "steps.json", "utf8"))
const only = process.argv[2]

// which question id each (course, lesson, step) belongs to
const keyOf = (s) => `${s.kind}|${s.prompt}|${JSON.stringify(s.props, Object.keys(s.props || {}).sort())}`
const wanted = new Map(rows.map((r) => [`${r.courseId}/${r.lessonId}/${r.step}`, r.id]))
const lessons = []
for (const s of steps) {
  const k = `${s.courseId}/${s.lessonId}`
  let l = lessons.find((x) => x.k === k)
  if (!l) lessons.push((l = { k, course: s.courseId, lesson: s.lessonId, steps: [] }))
  l.steps.push(s)
}
// only walk lessons that own at least one question
const todo = lessons.filter((l) => l.steps.some((s) => wanted.has(`${l.k}/${s.n}`)) && (!only || l.k.includes(only)))

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
async function go(url) {
  const p = loaded()
  await s("Page.navigate", { url })
  await p
}
const STORAGE = {
  "wce-academy-layout": "v2", "wce-academy-home": "v2", "wce-academy-corners": "12", "wce-academy-sound-v1": JSON.stringify({ on: false }),
  "wce-academy-firsts-v1": JSON.stringify({ "first-lesson": 1, "first-perfect": 1, "first-streak": 1, "first-test": 1 }),
  "wce-training-intro-v1": JSON.stringify({ announced: true, routed: true, primed: true, toured: true }), "wce-training-beta": "in", "wce-training-paywall-group": "A",
}
await go(BASE + "/courses")
await evaluate(`(() => { const d = ${JSON.stringify(STORAGE)}; for (const k in d) localStorage.setItem(k, d[k]) })()`)

const HIDE = `(() => { if (document.getElementById('__hide')) return; const st = document.createElement('style'); st.id='__hide'; st.textContent = 'nextjs-portal,[aria-label="Prototype review"],[aria-label="Prototype versions"],[aria-label="Show prototype review"]{display:none!important} *,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}'; document.head.appendChild(st) })()`
const click = (label, last = false) => `(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === ${JSON.stringify(label)} && !b.disabled); const b = ${last ? "bs.at(-1)" : "bs[0]"}; if (!b) return false; b.click(); return true })()`
const bodyHas = (t) => `!!document.body?.innerText?.includes(${JSON.stringify(t)})`
async function shot(file) {
  const r = await s("Page.captureScreenshot", { format: "jpeg", quality: 72 })
  writeFileSync(OUT + file, Buffer.from(r.data, "base64"))
}

const result = {}
for (const l of todo) {
  await go(`${BASE}/courses/${l.course}/${l.lesson}`)
  await sleep(2200)
  await evaluate(HIDE)
  for (const st of l.steps) {
    const qid = wanted.get(`${l.k}/${st.n}`)
    // make sure we're on this step's screen
    const firstWords = st.prompt.slice(0, 40)
    for (let t = 0; t < 10 && !(await evaluate(bodyHas(firstWords))); t++) await sleep(300)
    const here = await evaluate(bodyHas(firstWords))
    if (!here) console.log(`  ! ${l.k} step ${st.n}: prompt not found`)
    const learn = st.mode === "learn"
    if (!learn) { await evaluate(click("Default")); await sleep(900) }
    if (qid && (here || learn)) { await shot(`${qid}-q.jpg`); result[qid] = { q: `shots/${qid}-q.jpg` } }
    if (learn) {
      await evaluate(click("Continue", true))
    } else {
      await evaluate(click("Right"))
      await sleep(1600)
      const placeholder = await evaluate(bodyHas("Preview only"))
      if (qid && here && !placeholder) { await shot(`${qid}-a.jpg`); result[qid].a = `shots/${qid}-a.jpg` }
      // Back to Default in the same tick as Continue, or the next step grades itself on load.
      await evaluate(`(${click("Continue", true)}, ${click("Default")})`)
    }
    await sleep(1100)
  }
  console.log(`${l.k}: ${l.steps.length} steps`)
}
const prevShots = (() => { try { return JSON.parse(readFileSync(DIR + "shots.json", "utf8")) } catch { return {} } })()
writeFileSync(DIR + "shots.json", JSON.stringify({ ...prevShots, ...result }, null, 1))
console.log("questions with shots:", Object.keys(result).length, "with answer shot:", Object.values(result).filter((r) => r.a).length)
ws.close()
chrome.kill()
process.exit(0)
