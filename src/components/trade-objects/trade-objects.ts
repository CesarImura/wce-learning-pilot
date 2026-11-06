// Trading objects in dark brushed steel (the coins of the five topics and the four league trophies).
// Each one is two images in public/wce/art-trade: <kind>.jpg, this week's chrome illustration with trading
// symbols and minted ornaments (edited in Google Flow from the original stills), and <kind>-depth.jpg, its depth
// map, also from Flow. Here they become a real relief: the depth map is the
// geometry (raised symbol and rim, recessed face, rounded at the silhouette) and the normals for a light that
// moves as the object turns; the illustration is the texture. One shared WebGL renderer draws every object
// offscreen and copies it into the slot's canvas.
import * as THREE from "three"

export type TradeKind = "foundations" | "order-flow" | "edge" | "institutional" | "macro" | "bronze" | "silver" | "gold" | "obsidian"

const GL = 1024
// The canvas is 1.6x its box, so the turn spills over the card instead of being cropped.
export const BLEED = 1.6
const ORDER: TradeKind[] = ["foundations", "order-flow", "edge", "institutional", "macro", "bronze", "silver", "gold", "obsidian"]
const SIZE = 2.5
const SEG = 192
// The height field has twice the resolution of the mesh, for the lighting.
const N = SEG * 2 + 1

export type Engine = { rd: THREE.WebGLRenderer; dispose: () => void }
export type TradeItem = {
  sc: THREE.Scene
  cam: THREE.PerspectiveCamera
  /** t = the slot's clock, e = 0 at rest to 1 hovered or selected, px and py = pointer from the centre (-1 to 1). */
  update: (t: number, e: number, spinning: boolean, hovered: boolean, px?: number, py?: number) => void
  dispose: () => void
}

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
// The illustration already holds the studio light of the still. Here it is lit again relative to that: the
// normal comes from the height field, and the brightness and the highlights change with the angle to a fixed
// light, so turning the object moves the light across the relief. Output is premultiplied.
const FRAG = `
uniform sampler2D uMap; uniform sampler2D uH; uniform float uTexel; uniform float uStep; uniform mat3 normalMatrix;
varying vec2 vUv;
void main() {
  float h = texture2D(uH, vUv).r;
  float hl = texture2D(uH, vUv - vec2(uTexel, 0.0)).r;
  float hr = texture2D(uH, vUv + vec2(uTexel, 0.0)).r;
  float hd = texture2D(uH, vUv - vec2(0.0, uTexel)).r;
  float hu = texture2D(uH, vUv + vec2(0.0, uTexel)).r;
  vec3 n = normalize(vec3((hl - hr) / uStep, (hd - hu) / uStep, 1.0));
  vec3 nv = normalize(normalMatrix * n);
  if (!gl_FrontFacing) nv = -nv;
  vec3 c = texture2D(uMap, vUv).rgb;
  float mx = max(c.r, max(c.g, c.b));
  vec3 L = normalize(vec3(-0.5, 0.6, 0.65));
  vec3 L2 = normalize(vec3(0.75, -0.25, 0.5));
  float lit = (0.62 + 0.8 * max(dot(nv, L), 0.0) + 0.3 * max(dot(nv, L2), 0.0)) / (0.62 + 0.8 * max(dot(n, L), 0.0) + 0.3 * max(dot(n, L2), 0.0));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = max(pow(max(dot(nv, H), 0.0), 42.0) - 0.7 * pow(max(dot(n, H), 0.0), 42.0), 0.0);
  // The highlight takes the colour of the metal (white on steel, warm on bronze and gold).
  vec3 metal = mix(vec3(1.0), c / max(mx, 0.08), 0.6);
  vec3 col = c * lit + metal * spec * (0.22 + 0.5 * mx);
  float a = smoothstep(0.0, 0.02, h);
  gl_FragColor = vec4(min(col, vec3(1.0)) * a, a);
}`
// The soft halo of the rim light, which is around the object and not part of it: it stays flat, behind.
const HALO_FRAG = `
uniform sampler2D uMap; uniform sampler2D uH;
varying vec2 vUv;
void main() {
  vec3 c = max(texture2D(uMap, vUv).rgb - 0.03, 0.0);
  float out_ = 1.0 - smoothstep(0.0, 0.02, texture2D(uH, vUv).r);
  float a = clamp(max(c.r, max(c.g, c.b)) * 1.7, 0.0, 1.0) * out_;
  gl_FragColor = vec4(c * out_, a);
}`

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image()
    im.onload = () => res(im)
    im.onerror = rej
    im.src = src
  })

/** Height of every point, top row first: the depth map, rounded to zero at the silhouette (thin parts stay thin). */
function heights(depth: HTMLImageElement) {
  const n = N
  const c = document.createElement("canvas")
  c.width = c.height = n
  const g = c.getContext("2d", { willReadFrequently: true })!
  g.drawImage(depth, 0, 0, n, n)
  const px = g.getImageData(0, 0, n, n).data
  const d = new Float32Array(n * n)
  const dist = new Float32Array(n * n)
  for (let i = 0; i < n * n; i++) {
    d[i] = px[i * 4] / 255
    // In the depth map everything that is not the object is black.
    dist[i] = d[i] > 0.1 ? 1e6 : 0
  }
  // Two-pass chamfer distance to the silhouette, in cells.
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= n || y >= n ? 0 : dist[y * n + x])
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x
      if (dist[i]) dist[i] = Math.min(dist[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414)
    }
  for (let y = n - 1; y >= 0; y--)
    for (let x = n - 1; x >= 0; x--) {
      const i = y * n + x
      if (dist[i]) dist[i] = Math.min(dist[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414)
    }
  const R = n * 0.045
  let h = new Float32Array(n * n)
  for (let i = 0; i < n * n; i++) {
    const u = 1 - Math.min(dist[i] / R, 1)
    h[i] = Math.sqrt(1 - u * u) * (0.1 + 0.28 * d[i])
  }
  // Three soft passes, so the 8-bit steps of the depth map do not show in the light.
  for (let pass = 0; pass < 3; pass++) {
    const out = new Float32Array(n * n)
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        let sum = 0
        let k = 0
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx
            const yy = y + dy
            if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue
            sum += h[yy * n + xx]
            k++
          }
        out[y * n + x] = sum / k
      }
    h = out
  }
  return h
}

export function createEngine(): Engine {
  const cv = document.createElement("canvas")
  cv.width = cv.height = GL
  const rd = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, premultipliedAlpha: true })
  rd.setPixelRatio(1)
  rd.setSize(GL, GL, false)
  rd.setClearColor(0x000000, 0)
  rd.setScissorTest(true)
  return {
    rd,
    dispose: () => {
      rd.dispose()
      rd.forceContextLoss()
    },
  }
}

export function createItem(kind: TradeKind, _eng: Engine, onReady?: () => void): TradeItem {
  const sc = new THREE.Scene()
  const grp = new THREE.Group()
  sc.add(grp)
  // Close enough for real perspective; 1.92 = the print objects' frame (1.2) times the canvas bleed.
  const cam = new THREE.PerspectiveCamera((2 * Math.atan((1.2 * BLEED) / 6) * 180) / Math.PI, 1, 0.1, 50)
  cam.position.set(0, 0, 6)
  const made: { dispose: () => void }[] = []
  Promise.all([loadImage(`/wce/art-trade/${kind}.jpg`), loadImage(`/wce/art-trade/${kind}-depth.jpg`)]).then(([img, dep]) => {
    const h = heights(dep)
    const map = new THREE.Texture(img)
    // Passed through as it is: the image is already display colour.
    map.colorSpace = THREE.NoColorSpace
    map.anisotropy = 8
    map.needsUpdate = true
    // The height field as a texture, bottom row first like the uvs.
    const data = new Uint16Array(N * N)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) data[(N - 1 - y) * N + x] = THREE.DataUtils.toHalfFloat(h[y * N + x])
    const hmap = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.HalfFloatType)
    hmap.minFilter = hmap.magFilter = THREE.LinearFilter
    hmap.needsUpdate = true
    const blend = { transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor } as const

    const flat = new THREE.PlaneGeometry(SIZE, SIZE)
    const haloMat = new THREE.ShaderMaterial({ uniforms: { uMap: { value: map }, uH: { value: hmap } }, vertexShader: VERT, fragmentShader: HALO_FRAG, depthWrite: false, depthTest: false, ...blend })
    const halo = new THREE.Mesh(flat, haloMat)
    halo.renderOrder = 0
    grp.add(halo)

    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG)
    const P = geo.attributes.position
    // PlaneGeometry runs left to right, top to bottom, like the image.
    for (let r = 0; r <= SEG; r++) for (let c = 0; c <= SEG; c++) P.setZ(r * (SEG + 1) + c, h[r * 2 * N + c * 2])
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map }, uH: { value: hmap }, uTexel: { value: 1 / N }, uStep: { value: (2 * SIZE) / N } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.DoubleSide,
      ...blend,
    })
    const body = new THREE.Mesh(geo, mat)
    body.renderOrder = 1
    grp.add(body)
    made.push(map, hmap, flat, haloMat, geo, mat)
    onReady?.()
  })
  // Each object sways out of step with its neighbours.
  const ph = ORDER.indexOf(kind) * 1.7
  let yaw = 0
  let pitch = 0
  let follow = 0
  return {
    sc,
    cam,
    update: (t, e, _spinning, hovered, px = 0, py = 0) => {
      // On its own it sways; under the pointer it turns to face it. Never far enough to show the open back.
      follow += ((hovered ? 1 : 0) - follow) * 0.12
      const sway = 0.34 + 0.14 * e
      const ty = (1 - follow) * sway * Math.sin(t * 0.9 + ph) + follow * px * 0.62
      const tx = (1 - follow) * 0.1 * Math.sin(t * 0.6 + ph) + follow * py * 0.42
      yaw += (ty - yaw) * 0.14
      pitch += (tx - pitch) * 0.14
      grp.rotation.y = yaw
      grp.rotation.x = pitch
      grp.position.y = 0.04 * Math.sin(t * 0.75 + ph)
      grp.scale.setScalar(1 + 0.05 * e)
    },
    dispose: () => made.forEach((x) => x.dispose()),
  }
}

export function renderItem(eng: Engine, it: TradeItem, ctx: CanvasRenderingContext2D, pw: number, ph: number) {
  const w = Math.min(pw, GL)
  const h = Math.min(ph, GL)
  eng.rd.setViewport(0, 0, w, h)
  eng.rd.setScissor(0, 0, w, h)
  eng.rd.clear()
  it.cam.aspect = w / h
  it.cam.updateProjectionMatrix()
  eng.rd.render(it.sc, it.cam)
  ctx.clearRect(0, 0, pw, ph)
  ctx.drawImage(eng.rd.domElement, 0, GL - h, w, h, 0, 0, pw, ph)
}
