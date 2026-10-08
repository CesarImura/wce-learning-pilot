// "Stones": the cosmic-crystal look for topic tokens, an alternative to the struck coins.
// Each topic is a faceted crystal floating in front of prism light beams.
//
// The glass is faked rather than ray traced, so it stays cheap enough for lists:
//  - inside: three additive layers sample a rainbow-lit space through refraction, one per
//    colour channel at a slightly different index, which splits light like a prism;
//  - outside: a faint iridescent shell reflects the studio, and the edges catch light;
//  - around: rainbow beams, flares on the tips and a few stars.
// Brilliance tracks progress: a new topic's stone is dim, a mastered one blazes.

import * as THREE from "three"
import { rng } from "@/lib/market"
import type { Topic } from "@/lib/topics"
import type { CoinSpec } from "./coin-engine"

type V3 = [number, number, number]
export type StoneModel = { group: THREE.Group; animated: boolean; update: (time: number, dt: number) => void; dispose: () => void }

// ---------------------------------------------------------------------------
// Shared textures and the refraction environment

let rainbowTex: THREE.Texture | null = null
let flareTex: THREE.Texture | null = null
let refraction: THREE.CubeTexture | null = null

const SPECTRUM = ["#ff3b30", "#ff9f0a", "#ffd60a", "#ffffff", "#64d2ff", "#0a84ff", "#bf5af2"]

/** A prism beam: spectrum across its width, fading out along its length. */
function rainbow() {
  if (rainbowTex) return rainbowTex
  const c = document.createElement("canvas")
  c.width = 256
  c.height = 64
  const ctx = c.getContext("2d")!
  const across = ctx.createLinearGradient(0, 0, 0, 64)
  SPECTRUM.forEach((col, i) => across.addColorStop(i / (SPECTRUM.length - 1), col))
  ctx.fillStyle = across
  ctx.fillRect(0, 0, 256, 64)
  ctx.globalCompositeOperation = "destination-in"
  const along = ctx.createLinearGradient(0, 0, 256, 0)
  along.addColorStop(0, "rgba(0,0,0,0.9)")
  along.addColorStop(0.5, "rgba(0,0,0,0.45)")
  along.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = along
  ctx.fillRect(0, 0, 256, 64)
  const edge = ctx.createLinearGradient(0, 0, 0, 64)
  edge.addColorStop(0, "rgba(0,0,0,0)")
  edge.addColorStop(0.5, "rgba(0,0,0,1)")
  edge.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, 256, 64)
  rainbowTex = new THREE.CanvasTexture(c)
  rainbowTex.colorSpace = THREE.SRGBColorSpace
  return rainbowTex
}

/** A lens flare: soft glow with thin cross streaks. */
function flare() {
  if (flareTex) return flareTex
  const c = document.createElement("canvas")
  c.width = c.height = 256
  const ctx = c.getContext("2d")!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, "rgba(255,255,255,1)")
  g.addColorStop(0.08, "rgba(255,245,230,0.8)")
  g.addColorStop(0.3, "rgba(255,220,180,0.12)")
  g.addColorStop(1, "rgba(255,220,180,0)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  for (const [w, h] of [
    [256, 3],
    [3, 256],
  ]) {
    const s = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    s.addColorStop(0, "rgba(255,255,255,0.95)")
    s.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = s
    ctx.fillRect(128 - w / 2, 128 - h / 2, w, h)
  }
  flareTex = new THREE.CanvasTexture(c)
  return flareTex
}

/**
 * The world the crystals see: black space crossed by many thin rainbow and white light
 * strips. Rendered once into a cube map for refraction, and pre-filtered for reflections,
 * so the glass shows dark depths with streaks of spectrum rather than a grey studio.
 */
function spaceScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x010102)
  const r = rng(42)
  const tex = rainbow()
  for (let i = 0; i < 150; i++) {
    const white = i % 5 === 0
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(3 + r() * 10, 0.06 + r() * (white ? 0.25 : 0.7)),
      new THREE.MeshBasicMaterial({
        map: white ? null : tex,
        color: new THREE.Color(1, white ? 0.96 : 1, white ? 0.9 : 1).multiplyScalar((white ? 2.4 : 3) * (0.4 + r() * 0.8)),
        side: THREE.DoubleSide,
      }),
    )
    const dir = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(5 + r() * 4)
    m.position.copy(dir)
    m.lookAt(0, 0, 0)
    m.rotateZ(r() * Math.PI)
    scene.add(m)
  }
  return scene
}

let reflection: THREE.Texture | null = null

function spaceMaps(renderer: THREE.WebGLRenderer) {
  if (refraction && reflection) return { refraction, reflection }
  const scene = spaceScene()
  const rt = new THREE.WebGLCubeRenderTarget(512, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter })
  // the shared renderer runs with autoClear off; the cube faces need clearing
  const autoClear = renderer.autoClear
  renderer.autoClear = true
  new THREE.CubeCamera(0.1, 100, rt).update(renderer, scene)
  const pmrem = new THREE.PMREMGenerator(renderer)
  reflection = pmrem.fromScene(scene, 0.01).texture
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
// The model

export function stoneModel(spec: CoinSpec, renderer: THREE.WebGLRenderer): StoneModel {
  const { topic, state, pct } = spec
  const locked = state === "locked"
  const brilliance = locked ? 0 : state === "mastered" ? 1 : 0.35 + 0.55 * (pct / 100)
  const r = rng([...topic.id].reduce((h, c) => h * 31 + c.charCodeAt(0), 11))
  const group = new THREE.Group()
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x)

  const geo = track(crystal(topic))
  // A hint of the topic's colour in the glass; locked stones are smoky
  const tint = locked ? new THREE.Color(0.35, 0.35, 0.38) : new THREE.Color(1, 1, 1).lerp(new THREE.Color(topic.color), 0.3)
  const additive = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false } as const

  // Backdrop: stars and prism beams radiating from behind the stone
  const back = new THREE.Group()
  back.position.z = -0.7
  if (!locked) {
    const n = 7
    const base = r() * Math.PI
    for (let i = 0; i < n; i++) {
      const len = 1.05 + r() * 0.15
      const w = 0.04 + r() * 0.14
      const plane = track(new THREE.PlaneGeometry(len, w))
      plane.translate(len / 2, 0, 0)
      const beam = new THREE.Mesh(
        plane,
        track(new THREE.MeshBasicMaterial({ ...additive, map: rainbow(), color: new THREE.Color(1, 1, 1).multiplyScalar(0.2 + 0.5 * brilliance), side: THREE.DoubleSide })),
      )
      // beams come in near-opposite pairs, like light passing through the stone
      beam.rotation.z = base + (i % 2 ? Math.PI : 0) + Math.floor(i / 2) * (0.5 + r() * 0.6) + (r() - 0.5) * 0.2
      beam.renderOrder = -2
      back.add(beam)
    }
  }
  const starPos: number[] = []
  const starCol: number[] = []
  for (let i = 0; i < 220; i++) {
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * 0.98
    starPos.push(d * Math.cos(a), d * Math.sin(a), -0.2 * r())
    const b = (0.25 + r() * 0.75) * (1 - (d / 0.98) ** 2) * (locked ? 0.4 : 1)
    starCol.push(b, b, b * 0.95)
  }
  const starGeo = track(new THREE.BufferGeometry())
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3))
  starGeo.setAttribute("color", new THREE.Float32BufferAttribute(starCol, 3))
  const stars = new THREE.Points(starGeo, track(new THREE.PointsMaterial({ ...additive, size: 1.6, sizeAttenuation: false, vertexColors: true })))
  stars.renderOrder = -2
  back.add(stars)
  group.add(back)

  // The crystal
  const gem = new THREE.Group()
  const { refraction: env, reflection } = spaceMaps(renderer)
  // Depth pre-pass: the additive layers below then light only the front surface, so
  // overlapping arms don't pile up into a white blob
  const prepass = new THREE.Mesh(geo, track(new THREE.MeshBasicMaterial({ colorWrite: false })))
  prepass.renderOrder = -1
  gem.add(prepass)
  const inner = 0.3 + 0.5 * brilliance
  ;[
    [new THREE.Color(1, 0, 0), 0.6],
    [new THREE.Color(0, 1, 0), 0.63],
    [new THREE.Color(0, 0, 1), 0.66],
  ].forEach(([channel, ratio]) => {
    const color = (channel as THREE.Color).clone().multiply(tint).multiplyScalar(inner)
    gem.add(new THREE.Mesh(geo, track(new THREE.MeshBasicMaterial({ ...additive, toneMapped: true, envMap: env, refractionRatio: ratio as number, color }))))
  })
  // iridescent outer shell, reflecting the studio
  gem.add(
    new THREE.Mesh(
      geo,
      track(
        new THREE.MeshPhysicalMaterial({
          ...additive,
          toneMapped: true,
          color: "#ffffff",
          metalness: 0,
          roughness: 0.03,
          iridescence: 1,
          iridescenceIOR: 1.7,
          iridescenceThicknessRange: [180, 720],
          clearcoat: 1,
          specularIntensity: 1,
          envMap: reflection,
          envMapIntensity: locked ? 0.4 : 1.1,
          opacity: 0.32,
        }),
      ),
    ),
  )
  // facet edges catching the light
  const edges = track(new THREE.EdgesGeometry(geo, 12))
  gem.add(new THREE.LineSegments(edges, track(new THREE.LineBasicMaterial({ ...additive, color: tint.clone().multiplyScalar(0.2 + 0.35 * brilliance) }))))
  // leave room round the stone so beams and flares fade out inside the frame
  gem.scale.setScalar(0.72)
  group.add(gem)

  // Flares: one at the heart, a couple on tips
  const flares: { s: THREE.Sprite; base: number; phase: number }[] = []
  if (!locked) {
    const pos = geo.attributes.position
    let far = 0
    const tips: THREE.Vector3[] = []
    for (let i = 0; i < pos.count; i++) far = Math.max(far, new THREE.Vector3().fromBufferAttribute(pos, i).length())
    for (let i = 0; i < pos.count && tips.length < 2; i += 7) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i)
      if (v.length() > far * 0.95 && v.z > -0.1 && !tips.some((t) => t.distanceTo(v) < 0.3)) tips.push(v)
    }
    const add = (p: THREE.Vector3, base: number) => {
      const s = new THREE.Sprite(track(new THREE.SpriteMaterial({ ...additive, depthTest: false, map: flare(), color: new THREE.Color(1, 0.97, 0.92) })))
      s.position.copy(p)
      s.scale.setScalar(base)
      gem.add(s)
      flares.push({ s, base, phase: r() * 6 })
    }
    if (brilliance > 0.6) add(new THREE.Vector3(0, 0, 0.3), 0.32 * brilliance)
    tips.forEach((t) => add(t, 0.2 * brilliance))
  }

  return {
    group,
    animated: true,
    update: (time, dt) => {
      // a slow turn and a gentle bob, so light runs across the facets
      gem.rotation.y += dt * (locked ? 0.12 : 0.35)
      gem.rotation.x = Math.sin(time * 0.5) * 0.12
      back.rotation.z += dt * 0.02
      for (const f of flares) f.s.scale.setScalar(f.base * (0.8 + 0.35 * Math.sin(time * 2.2 + f.phase)))
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}
