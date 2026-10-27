// Gamified feedback for the lesson player: burst, XP flight, shake, heart break.
// Imperative on purpose: every effect is a short-lived element in <body> animated with the Web
// Animations API, so it uses viewport coordinates (immune to the question's CSS zoom), never
// affects layout or scroll, and needs no per-exercise code or React state.

const GREEN = "var(--up, #2caf74)"
const GOLD = "#ffd36e"

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

function overlay(): HTMLDivElement {
  const el = document.createElement("div")
  el.setAttribute("aria-hidden", "true")
  el.style.cssText = "position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9999"
  document.body.appendChild(el)
  return el
}

// Run animations on children of a temporary overlay, then remove it.
function run(layer: HTMLElement, anims: Animation[]) {
  const done = () => layer.remove()
  if (!anims.length) return done()
  Promise.allSettled(anims.map((a) => a.finished)).then(done)
}

export function burst(x: number, y: number) {
  if (reduced()) return
  const layer = overlay()
  const anims: Animation[] = []
  const n = 14 + Math.floor(Math.random() * 7)
  for (let i = 0; i < n; i++) {
    const p = document.createElement("div")
    const size = 6 + Math.random() * 5
    const color = i % 5 === 0 ? GOLD : GREEN
    p.style.cssText = `position:absolute;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color}`
    layer.appendChild(p)
    // Spread evenly with a little jitter; gravity pulls the end point down.
    const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const d = 40 + Math.random() * 50
    const dx = Math.cos(a) * d
    const dy = Math.sin(a) * d
    anims.push(
      p.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          { transform: `translate(${dx}px,${dy}px) scale(1)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${dx * 1.15}px,${dy * 1.15 + 22}px) scale(0.3)`, opacity: 0 },
        ],
        { duration: 600 + Math.random() * 100, easing: "cubic-bezier(0.2,0.7,0.3,1)", fill: "forwards" },
      ),
    )
  }
  // A quick ring at the origin gives the burst its "pop".
  const ring = document.createElement("div")
  ring.style.cssText = `position:absolute;left:${x - 20}px;top:${y - 20}px;width:40px;height:40px;border-radius:50%;border:3px solid ${GREEN}`
  layer.appendChild(ring)
  anims.push(
    ring.animate(
      [
        { transform: "scale(0.3)", opacity: 0.9 },
        { transform: "scale(2.2)", opacity: 0 },
      ],
      { duration: 450, easing: "cubic-bezier(0.2,0.7,0.3,1)", fill: "forwards" },
    ),
  )
  run(layer, anims)
}

// "+N XP" chip from (x, y) along a slight arc to the counter, which bumps on landing.
export function flyXp(amount: number, x: number, y: number, target: HTMLElement | null) {
  if (!target) return
  const r = target.getBoundingClientRect()
  const tx = r.left + r.width / 2
  const ty = r.top + r.height / 2
  const bump = () => {
    if (reduced()) return
    target.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" })
  }
  const layer = overlay()
  const chip = document.createElement("div")
  chip.textContent = `+${amount} XP`
  chip.style.cssText =
    "position:absolute;left:0;top:0;white-space:nowrap;background:#ffd36e;color:#000;border-radius:4px;padding:4px 10px;font:600 13px/16px inherit;font-variant-numeric:tabular-nums;box-shadow:0 6px 20px rgba(0,0,0,.5)"
  layer.appendChild(chip)
  const w = chip.offsetWidth
  const h = chip.offsetHeight
  const at = (px: number, py: number, s: number) => `translate(${px - w / 2}px,${py - h / 2}px) scale(${s})`
  if (reduced()) {
    const a = chip.animate([{ transform: at(tx, ty, 1), opacity: 1 }, { transform: at(tx, ty, 1), opacity: 0 }], { duration: 700, fill: "forwards" })
    run(layer, [a])
    return
  }
  // The midpoint is lifted off the straight line to bend the path.
  const mx = (x + tx) / 2 + (ty - y) * 0.15
  const my = (y + ty) / 2 - 60
  const a = chip.animate(
    [
      { transform: at(x, y, 1.1), opacity: 0 },
      { transform: at(x, y, 1.1), opacity: 1, offset: 0.1 },
      { transform: at(mx, my, 0.95), opacity: 1, offset: 0.5 },
      { transform: at(tx, ty, 0.6), opacity: 1, offset: 0.92 },
      { transform: at(tx, ty, 0.5), opacity: 0 },
    ],
    { duration: 650, easing: "cubic-bezier(0.4,0,0.4,1)", fill: "forwards" },
  )
  run(layer, [a])
  a.finished.then(bump, () => {})
}

// One short horizontal shake with a red glow fading out.
export function shake(el: HTMLElement | null) {
  if (!el || reduced()) return
  el.animate(
    [
      { transform: "translateX(0)", boxShadow: "inset 0 0 0 2px rgba(238,37,46,.55), 0 0 24px rgba(238,37,46,.35)" },
      { transform: "translateX(-8px)", offset: 0.2 },
      { transform: "translateX(7px)", offset: 0.4 },
      { transform: "translateX(-5px)", offset: 0.6 },
      { transform: "translateX(3px)", offset: 0.8 },
      { transform: "translateX(0)", boxShadow: "inset 0 0 0 2px rgba(238,37,46,0), 0 0 24px rgba(238,37,46,0)" },
    ],
    { duration: 380, easing: "ease-out" },
  )
}

// The heart swells, then two halves drop away; the real icon stays and the count flashes.
export function breakHeart(wrap: HTMLElement | null) {
  if (!wrap || reduced()) return
  const img = wrap.querySelector("img")
  const count = wrap.querySelector<HTMLElement>("[data-heart-count]")
  count?.animate([{ transform: "scale(1)", color: "#fff" }, { transform: "scale(1.4)", color: "#fff", offset: 0.3 }, { transform: "scale(1)" }], { duration: 600, easing: "ease-out" })
  if (!img) return
  img.animate([{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" })
  const r = img.getBoundingClientRect()
  const layer = overlay()
  const anims: Animation[] = []
  for (const side of [-1, 1]) {
    const half = document.createElement("img")
    half.src = img.src
    half.alt = ""
    half.style.cssText = `position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;opacity:0;clip-path:inset(0 ${side < 0 ? "50% 0 0" : "0 0 50%"})`
    layer.appendChild(half)
    anims.push(
      half.animate(
        [
          { transform: "translate(0,0) rotate(0)", opacity: 0 },
          { transform: "translate(0,0) rotate(0)", opacity: 1, offset: 0.35 },
          { transform: `translate(${side * 6}px,26px) rotate(${side * 28}deg)`, opacity: 0 },
        ],
        { duration: 600, easing: "ease-in", fill: "forwards" },
      ),
    )
  }
  run(layer, anims)
}
