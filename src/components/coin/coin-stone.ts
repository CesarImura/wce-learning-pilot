// "Stones": the cosmic-crystal look for topic tokens, an alternative to the struck coins.
// Each topic is a faceted crystal in front of soft prism light. Topics you haven't
// unlocked are still sealed in a geode; starting one cracks it open (the reveal).
//
// The glass is faked rather than ray traced, so it stays cheap enough for lists:
//  - inside: three additive layers sample a dim world of soft light strips through
//    refraction, one per colour channel at a slightly different index, so colour only
//    fringes at the facet edges, as in real glass;
//  - outside: a faint shell reflects that world, and the edges catch a little light;
//  - behind: a static backdrop of stars and faint beams that doesn't turn with the stone.
// Brilliance tracks progress: a fresh stone is quiet, a mastered one glows.

import * as THREE from "three"
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { rng } from "@/lib/market"
import type { Topic } from "@/lib/topics"
import type { CoinSpec } from "./coin-engine"

type V3 = [number, number, number]
export type StoneModel = {
  group: THREE.Group
  backdrop: THREE.Object3D
  animated: boolean
  update: (time: number, dt: number) => void
  dispose: () => void
}

// ---------------------------------------------------------------------------
// Shared textures and the environment the glass sees

let beamTex: THREE.Texture | null = null
let flareTex: THREE.Texture | null = null
let refraction: THREE.CubeTexture | null = null
let reflection: THREE.Texture | null = null

/** A light beam: a soft white core with faint spectral fringes, fading along its length. */
function beam() {
  if (beamTex) return beamTex
  const c = document.createElement("canvas")
  c.width = 256
  c.height = 64
  const ctx = c.getContext("2d")!
  const across = ctx.createLinearGradient(0, 0, 0, 64)
  ;[
    [0, "#ff9a7a"],
    [0.3, "#ffe9c4"],
    [0.5, "#ffffff"],
    [0.7, "#cfe8ff"],
    [1, "#a99cff"],
  ].forEach(([o, col]) => across.addColorStop(o as number, col as string))
  ctx.fillStyle = across
  ctx.fillRect(0, 0, 256, 64)
  ctx.globalCompositeOperation = "destination-in"
  const along = ctx.createLinearGradient(0, 0, 256, 0)
  along.addColorStop(0, "rgba(0,0,0,0.8)")
  along.addColorStop(0.45, "rgba(0,0,0,0.3)")
  along.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = along
  ctx.fillRect(0, 0, 256, 64)
  const edge = ctx.createLinearGradient(0, 0, 0, 64)
  edge.addColorStop(0, "rgba(0,0,0,0)")
  edge.addColorStop(0.5, "rgba(0,0,0,1)")
  edge.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, 256, 64)
  beamTex = new THREE.CanvasTexture(c)
  beamTex.colorSpace = THREE.SRGBColorSpace
  return beamTex
}

/** A small star glint: soft glow with thin cross streaks. */
function flare() {
  if (flareTex) return flareTex
  const c = document.createElement("canvas")
  c.width = c.height = 256
  const ctx = c.getContext("2d")!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, "rgba(255,255,255,1)")
  g.addColorStop(0.06, "rgba(255,245,230,0.7)")
  g.addColorStop(0.25, "rgba(255,220,180,0.08)")
  g.addColorStop(1, "rgba(255,220,180,0)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  for (const [w, h] of [
    [256, 2],
    [2, 256],
  ]) {
    const s = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    s.addColorStop(0, "rgba(255,255,255,0.8)")
    s.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = s
    ctx.fillRect(128 - w / 2, 128 - h / 2, w, h)
  }
  flareTex = new THREE.CanvasTexture(c)
  return flareTex
}

/**
 * The world the crystals see: near-black space with soft light panels, mostly white,
 * a few faintly tinted. Rendered into a cube map for refraction and pre-filtered for
 * reflections, so the glass reads dark and clear with crisp highlights.
 */
function spaceMaps(renderer: THREE.WebGLRenderer) {
  if (refraction && reflection) return { refraction, reflection }
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020203)
  const r = rng(42)
  const tints = ["#ffffff", "#ffffff", "#ffffff", "#fff1dc", "#dcecff", "#ffd9c8", "#e6dcff"]
  for (let i = 0; i < 60; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5 + r() * 6, 0.1 + r() * 0.9),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(tints[i % tints.length]).multiplyScalar(0.6 + r() * 1.6), side: THREE.DoubleSide }),
    )
    m.position.copy(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(5 + r() * 4))
    m.lookAt(0, 0, 0)
    m.rotateZ(r() * Math.PI)
    scene.add(m)
  }
  // big soft glows, so facets shade across their surface instead of reading flat
  const glow = document.createElement("canvas")
  glow.width = glow.height = 128
  const gctx = glow.getContext("2d")!
  const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, "rgba(255,255,255,1)")
  grad.addColorStop(1, "rgba(255,255,255,0)")
  gctx.fillStyle = grad
  gctx.fillRect(0, 0, 128, 128)
  const glowTex = new THREE.CanvasTexture(glow)
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(tints[i % tints.length]).multiplyScalar(0.25 + r() * 0.35), side: THREE.DoubleSide }),
    )
    m.position.copy(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(7))
    m.lookAt(0, 0, 0)
    scene.add(m)
  }
  const rt = new THREE.WebGLCubeRenderTarget(512, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter })
  // the shared renderer runs with autoClear off; the cube faces need clearing
  const autoClear = renderer.autoClear
  renderer.autoClear = true
  new THREE.CubeCamera(0.1, 100, rt).update(renderer, scene)
  const pmrem = new THREE.PMREMGenerator(renderer)
  reflection = pmrem.fromScene(scene, 0.015).texture
  pmrem.dispose()
  renderer.autoClear = autoClear
  rt.texture.mapping = THREE.CubeRefractionMapping
  refraction = rt.texture
  return { refraction, reflection }
}

// ---------------------------------------------------------------------------
// Crystal shapes (radius ~1, flat shaded)

/** Collects triangles, flipping any that face inwards (all shapes are star-shaped round the origin). */
class Facets {
  pos: number[] = []
  tri(a: V3, b: V3, c: V3) {
    const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2])
    const n = ab.cross(ac)
    const centroid = new THREE.Vector3((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3)
    if (n.dot(centroid) < 0) this.pos.push(...a, ...c, ...b)
    else this.pos.push(...a, ...b, ...c)
  }
  /** A four-sided pyramid pointing along `dir`: the arm of a star. */
  spike(dir: V3, len: number, w: number, d: number) {
    const D = new THREE.Vector3(...dir).normalize()
    const up = Math.abs(D.z) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1)
    const u = new THREE.Vector3().crossVectors(D, up).normalize()
    const v = new THREE.Vector3().crossVectors(D, u).normalize()
    const tip = D.clone().multiplyScalar(len).toArray() as V3
    const p = (s: THREE.Vector3, k: number) => s.clone().multiplyScalar(k).toArray() as V3
    const ring = [p(u, w), p(v, d), p(u, -w), p(v, -d)]
    for (let i = 0; i < 4; i++) this.tri(tip, ring[i], ring[(i + 1) % 4])
  }
  geometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3))
    g.computeVertexNormals()
    return g
  }
}

/** Flat-shade any geometry: split shared vertices so every facet has its own normal. */
function faceted(g: THREE.BufferGeometry) {
  const out = g.index ? g.toNonIndexed() : g
  out.deleteAttribute("normal")
  out.computeVertexNormals()
  return out
}

function crystal(topic: Topic): THREE.BufferGeometry {
  const r = rng([...topic.id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7))
  switch (topic.shape) {
    case "octagon": {
      // eight-point star: four long arms, four short diagonals, a little depth front and back
      const f = new Facets()
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + Math.PI / 2
        const long = i % 2 === 0
        f.spike([Math.cos(a), Math.sin(a), 0], long ? (i % 4 === 0 ? 1.12 : 0.95) : 0.55, long ? 0.2 : 0.13, long ? 0.24 : 0.16)
      }
      f.spike([0, 0, 1], 0.42, 0.2, 0.2)
      f.spike([0, 0, -1], 0.42, 0.2, 0.2)
      return f.geometry()
    }
    case "scallop": {
      // a rough-cut chunk: a jittered icosahedron
      const g = new THREE.IcosahedronGeometry(0.82, 0)
      const pos = g.attributes.position
      const moved = new Map<string, V3>()
      for (let i = 0; i < pos.count; i++) {
        const k = [pos.getX(i), pos.getY(i), pos.getZ(i)].map((n) => n.toFixed(3)).join(",")
        if (!moved.has(k)) {
          const s = 0.85 + r() * 0.3
          moved.set(k, [pos.getX(i) * s, pos.getY(i) * s * 1.18, pos.getZ(i) * s * 0.9])
        }
        pos.setXYZ(i, ...moved.get(k)!)
      }
      g.rotateZ(0.35)
      return faceted(g)
    }
    case "round": {
      if (topic.pattern === "dome") {
        // a brilliant-cut diamond, tipped to show its table
        const g = new THREE.LatheGeometry(
          [new THREE.Vector2(0, -0.92), new THREE.Vector2(0.98, 0.02), new THREE.Vector2(0.98, 0.1), new THREE.Vector2(0.58, 0.44), new THREE.Vector2(0, 0.44)],
          8,
        )
        g.translate(0, 0.2, 0)
        g.rotateX(0.42)
        return faceted(g)
      }
      // a tall hexagonal crystal, pointed at both ends
      const g = new THREE.LatheGeometry(
        [new THREE.Vector2(0, -0.82), new THREE.Vector2(0.6, -0.12), new THREE.Vector2(0.5, 0.22), new THREE.Vector2(0, 1.12)],
        6,
      )
      g.translate(0, -0.12, 0)
      g.rotateY(0.3)
      return faceted(g)
    }
    case "vessel": {
      // four-point star, taller than wide
      const f = new Facets()
      f.spike([0, 1, 0], 1.12, 0.36, 0.3)
      f.spike([0, -1, 0], 1.12, 0.36, 0.3)
      f.spike([1, 0, 0], 0.82, 0.34, 0.28)
      f.spike([-1, 0, 0], 0.82, 0.34, 0.28)
      f.spike([0, 0, 1], 0.32, 0.3, 0.3)
      f.spike([0, 0, -1], 0.32, 0.3, 0.3)
      return f.geometry()
    }
  }
}

// ---------------------------------------------------------------------------
// The geode: a rough rock that splits in two along a seam

/** Smooth pseudo-noise on the sphere: a sum of seeded sine waves. */
function waves(seed: number, n: number, freq: number) {
  const r = rng(seed)
  const ws = Array.from({ length: n }, () => ({
    k: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(freq * (0.6 + r() * 0.8)),
    p: r() * Math.PI * 2,
  }))
  return (v: THREE.Vector3) => ws.reduce((s, w) => s + Math.sin(v.dot(w.k) + w.p), 0) / n
}

function geode(seed: number) {
  const big = waves(seed, 7, 2.4)
  const fine = waves(seed + 9, 9, 7)
  const grit = waves(seed + 17, 12, 16)
  const radius = (d: THREE.Vector3) => 0.74 * (1 + 0.17 * big(d) + 0.08 * fine(d) + 0.035 * grit(d))
  const base = mergeVertices(new THREE.IcosahedronGeometry(1, 5))
  const pos = base.attributes.position
  const col: number[] = []
  const v = new THREE.Vector3()
  const tone = waves(seed + 3, 6, 3.5)
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    const rr = radius(v)
    pos.setXYZ(i, v.x * rr, v.y * rr * 0.92, v.z * rr)
    // mottled rind: dusty browns and greys
    const t = 0.5 + 0.5 * tone(v)
    const c = new THREE.Color("#2e2620").lerp(new THREE.Color("#5e534b"), t).multiplyScalar(0.7 + 0.6 * (0.5 + 0.5 * grit(v)))
    col.push(c.r, c.g, c.b)
  }
  base.setAttribute("color", new THREE.Float32BufferAttribute(col, 3))
  base.computeVertexNormals()

  // split into two halves along a tilted seam
  const seam = new THREE.Vector3(0.25, 1, 0.15).normalize()
  const flat = base.toNonIndexed()
  const halves = [[], []] as number[][][]
  const P = flat.attributes.position
  const N = flat.attributes.normal
  const C = flat.attributes.color
  for (let t = 0; t < P.count; t += 3) {
    const c = new THREE.Vector3()
    for (let k = 0; k < 3; k++) c.add(new THREE.Vector3().fromBufferAttribute(P, t + k))
    const h = c.dot(seam) > 0 ? 0 : 1
    for (let k = 0; k < 3; k++) {
      halves[h][0] ??= []
      halves[h][1] ??= []
      halves[h][2] ??= []
      halves[h][0].push(P.getX(t + k), P.getY(t + k), P.getZ(t + k))
      halves[h][1].push(N.getX(t + k), N.getY(t + k), N.getZ(t + k))
      halves[h][2].push(C.getX(t + k), C.getY(t + k), C.getZ(t + k))
    }
  }
  const geos = halves.map(([p, n, c]) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3))
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3))
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3))
    return g
  })
  // the crack: a jagged loop where the seam meets the surface
  const u = new THREE.Vector3().crossVectors(seam, new THREE.Vector3(0, 0, 1)).normalize()
  const w = new THREE.Vector3().crossVectors(seam, u).normalize()
  const r = rng(seed + 5)
  const crack: number[] = []
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2
    const d = u.clone().multiplyScalar(Math.cos(a)).add(w.clone().multiplyScalar(Math.sin(a))).add(seam.clone().multiplyScalar((r() - 0.5) * 0.08)).normalize()
    const rr = radius(d) * 1.005
    crack.push(d.x * rr, d.y * rr * 0.92, d.z * rr)
  }
  // a thin glowing tube, so the seam reads at any size
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < crack.length; i += 3) pts.push(new THREE.Vector3(crack[i], crack[i + 1], crack[i + 2]))
  const crackGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 240, 0.012, 5, true)
  base.dispose()
  flat.dispose()
  return { halves: geos, crack: crackGeo, seam }
}

// ---------------------------------------------------------------------------
// The model

const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

/** Reveal timeline (seconds): shake, then split and rise. */
const SHAKE = 0.9
const SPLIT = 1.0
const DONE = 2.6

export function stoneModel(spec: CoinSpec, renderer: THREE.WebGLRenderer): StoneModel {
  const { topic, state, pct, reveal, onRevealed } = spec
  const sealed = state === "locked" || state === "new"
  const revealing = !sealed && !!reveal
  const brilliance = state === "mastered" ? 1 : 0.4 + 0.45 * (pct / 100)
  const seed = [...topic.id].reduce((h, c) => h * 31 + c.charCodeAt(0), 11)
  const r = rng(seed)
  const group = new THREE.Group()
  const backdrop = new THREE.Group()
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x)
  const additive = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false } as const

  // Backdrop: stars, and (once unlocked) a few faint beams. It doesn't rotate.
  backdrop.position.z = -0.8
  const beams: THREE.MeshBasicMaterial[] = []
  if (!sealed) {
    const base = r() * Math.PI
    for (let i = 0; i < 4; i++) {
      const len = 1.1 + r() * 0.1
      const plane = track(new THREE.PlaneGeometry(len, 0.03 + r() * 0.08))
      plane.translate(len / 2, 0, 0)
      const mat = track(new THREE.MeshBasicMaterial({ ...additive, map: beam(), color: new THREE.Color(1, 1, 1).multiplyScalar(0.12 + 0.3 * brilliance), side: THREE.DoubleSide }))
      beams.push(mat)
      const m = new THREE.Mesh(plane, mat)
      m.rotation.z = base + (i % 2 ? Math.PI : 0) + Math.floor(i / 2) * (0.6 + r() * 0.5)
      m.renderOrder = -2
      backdrop.add(m)
    }
  }
  const starPos: number[] = []
  const starCol: number[] = []
  for (let i = 0; i < 200; i++) {
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * 0.98
    starPos.push(d * Math.cos(a), d * Math.sin(a), -0.2 * r())
    const b = (0.2 + r() * 0.6) * (1 - (d / 0.98) ** 2) * (state === "locked" ? 0.4 : 1)
    starCol.push(b, b, b * 0.95)
  }
  const starGeo = track(new THREE.BufferGeometry())
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3))
  starGeo.setAttribute("color", new THREE.Float32BufferAttribute(starCol, 3))
  const stars = new THREE.Points(starGeo, track(new THREE.PointsMaterial({ ...additive, size: 1.5, sizeAttenuation: false, vertexColors: true })))
  stars.renderOrder = -2
  backdrop.add(stars)

  // The crystal (not built while the geode is still sealed)
  const gem = new THREE.Group()
  const flares: { s: THREE.Sprite; base: number; phase: number }[] = []
  if (!sealed) {
    const geo = track(crystal(topic))
    const tint = new THREE.Color(1, 1, 1).lerp(new THREE.Color(topic.color), 0.18)
    const { refraction: env, reflection } = spaceMaps(renderer)
    // depth pre-pass: the additive layers then light only the front surface
    const prepass = new THREE.Mesh(geo, track(new THREE.MeshBasicMaterial({ colorWrite: false })))
    prepass.renderOrder = -1
    gem.add(prepass)
    const inner = 0.4 + 0.4 * brilliance
    ;(
      [
        [new THREE.Color(1, 0, 0), 0.625],
        [new THREE.Color(0, 1, 0), 0.635],
        [new THREE.Color(0, 0, 1), 0.645],
      ] as const
    ).forEach(([channel, ratio]) => {
      const color = channel.clone().multiply(tint).multiplyScalar(inner)
      gem.add(new THREE.Mesh(geo, track(new THREE.MeshBasicMaterial({ ...additive, toneMapped: true, envMap: env, refractionRatio: ratio, color }))))
    })
    gem.add(
      new THREE.Mesh(
        geo,
        track(
          new THREE.MeshPhysicalMaterial({
            ...additive,
            toneMapped: true,
            color: "#ffffff",
            metalness: 0,
            roughness: 0.08,
            iridescence: 0.25,
            iridescenceIOR: 1.4,
            clearcoat: 0.6,
            envMap: reflection,
            envMapIntensity: 0.7,
            opacity: 0.25,
          }),
        ),
      ),
    )
    const edges = track(new THREE.EdgesGeometry(geo, 12))
    gem.add(new THREE.LineSegments(edges, track(new THREE.LineBasicMaterial({ ...additive, color: tint.clone().multiplyScalar(0.1 + 0.16 * brilliance) }))))

    // a glint on a tip or two; mastered stones get one at the heart
    const pos = geo.attributes.position
    let far = 0
    for (let i = 0; i < pos.count; i++) far = Math.max(far, new THREE.Vector3().fromBufferAttribute(pos, i).length())
    const tips: THREE.Vector3[] = []
    for (let i = 0; i < pos.count && tips.length < 2; i += 7) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i)
      if (v.length() > far * 0.95 && v.z > -0.1 && !tips.some((t) => t.distanceTo(v) < 0.3)) tips.push(v)
    }
    const add = (p: THREE.Vector3, base: number) => {
      const s = new THREE.Sprite(track(new THREE.SpriteMaterial({ ...additive, depthTest: false, map: flare(), color: new THREE.Color(1, 0.97, 0.92).multiplyScalar(0.8) })))
      s.position.copy(p)
      s.scale.setScalar(base)
      gem.add(s)
      flares.push({ s, base, phase: r() * 6 })
    }
    tips.forEach((t) => add(t, 0.14 + 0.1 * brilliance))
    if (state === "mastered") add(new THREE.Vector3(0, 0, 0.3), 0.28)
  }
  gem.scale.setScalar(revealing ? 0.0001 : 0.72)
  group.add(gem)

  // The geode, while sealed or while it cracks open
  const rock = new THREE.Group()
  let crackMat: THREE.MeshBasicMaterial | null = null
  const halfMeshes: THREE.Mesh[] = []
  let seam = new THREE.Vector3(0, 1, 0)
  let burst: THREE.Sprite | null = null
  if (sealed || revealing) {
    const g = geode(seed)
    seam = g.seam
    g.halves.forEach((h) => {
      track(h)
      const m = new THREE.Mesh(
        h,
        track(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0, envMapIntensity: 0.3, side: THREE.DoubleSide, transparent: true })),
      )
      halfMeshes.push(m)
      rock.add(m)
    })
    track(g.crack)
    // the seam glows faintly on a topic you can start; not on one that's coming soon
    crackMat = track(new THREE.MeshBasicMaterial({ ...additive, color: new THREE.Color("#ffd9a8").multiplyScalar(state === "locked" ? 0 : 0.6) }))
    rock.add(new THREE.Mesh(g.crack, crackMat))
    if (state === "locked") halfMeshes.forEach((m) => (m.material as THREE.MeshStandardMaterial).color.setScalar(0.6))
    if (revealing) {
      burst = new THREE.Sprite(track(new THREE.SpriteMaterial({ ...additive, depthTest: false, map: flare(), opacity: 0 })))
      burst.scale.setScalar(0.01)
      group.add(burst)
    }
    rock.rotation.set(0.2, 0.4, 0)
    group.add(rock)
  }
  beams.forEach((b) => (b.opacity = revealing ? 0 : 1))

  let t0 = -1
  let revealed = false
  return {
    group,
    backdrop,
    animated: true,
    update: (time, dt) => {
      if (!sealed) {
        // the stone turns slowly so light runs across its facets
        gem.rotation.y += dt * 0.3
        gem.rotation.x = Math.sin(time * 0.5) * 0.1
        for (const f of flares) f.s.scale.setScalar(f.base * (0.75 + 0.3 * Math.sin(time * 2 + f.phase)))
      } else {
        rock.rotation.y += dt * 0.15
        if (crackMat && state === "new") crackMat.color.setRGB(1, 0.85, 0.66).multiplyScalar(0.35 + 0.25 * Math.sin(time * 1.6))
      }
      if (!revealing || revealed) return
      if (t0 < 0) t0 = time
      const t = time - t0
      // 1. the geode shudders and its seam blazes
      const shake = t < SHAKE ? (t / SHAKE) ** 2 : 0
      rock.position.set(Math.sin(t * 47) * 0.025 * shake, Math.sin(t * 61) * 0.02 * shake, 0)
      crackMat?.color.setRGB(1, 0.88, 0.7).multiplyScalar(0.4 + 2.2 * clamp01(t / SHAKE))
      // 2. it splits: the halves fly apart along the seam and fade
      const s = clamp01((t - SHAKE) / SPLIT)
      if (s > 0) {
        const e = easeOut(s)
        halfMeshes.forEach((m, i) => {
          const dir = i === 0 ? 1 : -1
          m.position.copy(seam).multiplyScalar(dir * e * 0.42)
          m.rotation.set(dir * e * 0.5, 0, dir * e * 0.25)
          ;(m.material as THREE.MeshStandardMaterial).opacity = 1 - clamp01((s - 0.2) / 0.5)
        })
        if (crackMat) crackMat.opacity = 1 - clamp01(s * 3)
        if (burst) {
          const b = clamp01(s * 2.2)
          burst.scale.setScalar(0.4 + 1.6 * b)
          ;(burst.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * b) * 0.9
        }
        // 3. the crystal rises out of it and the light comes up
        gem.scale.setScalar(Math.max(0.0001, 0.72 * easeOutBack(clamp01((t - SHAKE - 0.1) / 1.1))))
        beams.forEach((m) => (m.opacity = clamp01((t - SHAKE - 0.3) / 1.2)))
      }
      if (t > DONE) {
        revealed = true
        group.remove(rock)
        if (burst) group.remove(burst)
        onRevealed?.()
      }
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}
