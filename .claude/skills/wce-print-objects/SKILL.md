---
name: wce-print-objects
description: The WCE "print objects" style for Training topic art — 3D folded-paper objects with a flat, boiling riso-print shader. Use when adding a new course object, changing the look, or touching the print-object renderer that replaces the course coins.
---

# WCE print objects

Course art for Training: each course (by its topic) gets a small 3D folded-paper object that replaces its metal coin (candle, staircase, folded floor with ball, paper plane, crystal, two boxes) rendered with a custom shader that makes it look printed, not rendered. Inspired by a paper-folding motion piece Cesar shared (Pinterest pin 835136324709290529), rebuilt on the WCE brand.

## Where things live
- `public/lab/print-objects.html` — standalone lab with every model and tuning controls (served at `/lab/print-objects.html`). It is the reference for the look: port from it, don't drift.
- `src/components/print-objects/print-objects.ts` (shader, models, animations) and `print-object.tsx` (shared renderer + `<PrintObject model hovered />`), plus the "Course art" toggle (coins / print) in `src/components/prototype-panel.tsx`. `src/components/wce/topic-coin.tsx` swaps the coin for `<PrintObject>` and maps topic → model (foundations candle, order-flow order book ladder, edge crystal, institutional columns, macro faceted globe; staircase, folded floor, plane and boxes are spares). Lessons keep their icons.
- Shared lab for people without the repo: https://claude.ai/artifact/PG3VpC2UgMVjYJoMWRiKAV (ask Cesar for access).

## The locked look (26 Oct 2026, Cesar)
| Setting | Value | Uniform |
|---|---|---|
| Texture mode | Flat: each face is a window onto its own flat 2D print, no perspective distortion | `uMap = 0` |
| Boil | 3 drawings, a new one every 3rd tick (~4 per second, slower than the motion) | `uSeed = floor(tick / 3) % 3 + 1` |
| Texture size | 0.5 (finer than the lab's 1.0 start) | `uTex = 0.5` |
| Jump | 0 (prints re-roll their grain but do not shift) | `uJump = 0` |
| Cards | Dark WCE cards `#0d0d0d`, hairline `white/10` border |  |
| Motion | Still (one fixed print, 3/4 resting angle) until hovered; hover brings spin, boil and the model's gesture. Only the page's hero object (`<PrintObject active>`, the Continue banner) moves without hover. Stepped at ~12 fps | |
| Live tuning | Prototype panel → 3D assets (texture, boil, speed, size, jump, fps, spin), stored under `wce-print-settings` | `settings.ts` |

## Rules of the style (why it looks printed, not plastic)
1. **No lighting.** Faces are flat inks. Form comes from which ink each face gets, never from a light. No rim light, no gradients.
2. **Orthographic camera**, slight isometric angle (`camera.position (3.2, 2.2, 5)`).
3. **Few inks per object.** 2–3 from the WCE palette: bone `#e9e6dc`, brand blue `#6abef2`, deep blue `#1f4f78`, graphite (`black` in the code, lifted to `#333c42` so it reads on dark cards). Green `#3fcf8e` / red `#f2545b` only when they mean up / down.
4. **Every face gets its own treatment.** Distinct face normals get inks and treatments round-robin (`prep()`): solid, speckle gradient, halftone, engraving lines. Neighbouring faces should never look the same.
5. **Inks multiply** on light faces (transparent riso ink); on dark faces the ink is bone at lower density.
6. **Boil, don't animate textures smoothly.** Textures change only on ticks, cycling 3 drawings.
7. **Motion on twos.** Never render the objects at 60 fps.

## Adding a new object
1. Build the geometry from simple, faceted primitives (`BoxGeometry`, `LatheGeometry` with 6–8 segments, `IcosahedronGeometry(r, 0)`, or hand-written triangles). Low poly: every face must be big enough to show its print.
2. Return `{ parts: [[geometry, palette, salt], ...], rz }`. Separate parts that animate (e.g. the ball, each step) so the hover animation can move them.
3. Pick a 2–4 entry palette; repeat an ink to weight it.
4. Write a hover animation: one meaningful gesture tied to the topic (candle grows, steps pop in sequence, ball bounces, plane flies, crystal shatters via `uExplode`, boxes swap size). Ease back with `rest()`.
5. Check framing in the lab: nothing clipped by the card, nothing over the label, every silhouette readable on the dark card.

## Gotchas
- One offscreen WebGL renderer and one shared material for all objects; each object copies its frame into its own 2D canvas inside the card (so it scrolls natively on phones). Never one WebGL canvas per object: browsers cap WebGL contexts at ~16.
- Render on change only: still objects draw once (mount, resize, settings change, becoming visible); only hovered, `active` or autoplay ones tick. No scroll listeners, no per-frame layout reads. `three` loads lazily.
- `uCtr` is the slot centre inside the render viewport, or the Flat prints slide off-centre. `MODEL_COUNT` in `print-object.tsx` is hard-coded: bump it when adding a model.
- Flat prints scale with the object (`uScl` = slot pixels per world unit ÷ the lab's 52px), so texture size stays proportional from a 68px list icon to the 220px banner. `tex` in the panel multiplies on top.
- Respect `prefers-reduced-motion`: still frame, no boil.
