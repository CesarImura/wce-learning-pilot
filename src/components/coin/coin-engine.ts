// Three.js coins. One WebGL renderer draws every coin on the page: each coin has its
// own scene and a plain 2D <canvas> in the DOM, and each frame the renderer draws the
// coin into a corner of its buffer and copies it into that canvas. That way there is
// only one GL context however many coins are on screen, and coins stack and clip like
// any other element (under the nav, behind dialogs).
//
// The look: struck metal in a photo studio. A dim grey room with large softboxes, so the
// faces carry broad soft reflections and the relief and worn high points catch sharper
// light as the coin turns, like the product shots it is modelled on.

import * as THREE from "three";
import type { CoinShape, Topic } from "@/lib/topics";
import { faceMaps, holeOf, METALS, outline, type FaceStats } from "./coin-art";
import { stoneModel } from "./coin-stone";

export type CoinState = "locked" | "new" | "active" | "mastered";
/** "coins": struck-metal artifacts. "stones": cosmic crystals (coin-stone.ts). */
export type CoinLook = "coins" | "stones";
export type CoinSpec = {
  topic: Topic;
  state: CoinState;
  pct: number;
  stats?: FaceStats;
  look?: CoinLook;
};
type Pose = { rx: number; ry: number; scale: number };

const DEG = Math.PI / 180;
const DEPTH = 0.09;
const BEVEL = 0.025;
const FRONT_Z = DEPTH / 2 + BEVEL;

// ---------------------------------------------------------------------------
// Shared renderer

function studio() {
  const scene = new THREE.Scene();
  scene.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(30, 30, 30),
      new THREE.MeshBasicMaterial({ color: 0x2a2a2c, side: THREE.BackSide }),
    ),
  );
  const panel = (
    w: number,
    h: number,
    pos: [number, number, number],
    intensity: number,
    color = "#ffffff",
  ) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide,
      }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(11, 6, [-1, 4, 7], 4.2); // key softbox, above and behind the camera
  panel(8, 3, [0, 8, 1], 2.4); // overhead
  panel(2.4, 12, [-8, 0, 2], 3); // strip on the left
  panel(2, 10, [8, 1, 0], 2.4, "#ffe0bd"); // warm kicker on the right
  panel(10, 3, [0, -7, 5], 1.4); // low bounce
  return scene;
}

class Engine {
  renderer: THREE.WebGLRenderer;
  env: THREE.Texture;
  handles = new Set<CoinHandle>();
  raf = 0;
  last = 0;
  fontsVersion = 0;

  constructor() {
    const r = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    r.setPixelRatio(1);
    r.setSize(512, 512, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.3;
    r.setClearColor(0x000000, 0);
    r.autoClear = false;
    this.renderer = r;
    const pmrem = new THREE.PMREMGenerator(r);
    this.env = pmrem.fromScene(studio(), 0.02).texture;
    pmrem.dispose();
    // The reverse is lettered in the page's web font: repaint once it has loaded.
    document.fonts?.ready.then(() => {
      this.fontsVersion++;
      this.handles.forEach((h) => h.rebuild());
    });
  }

  add(h: CoinHandle) {
    this.handles.add(h);
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }
  remove(h: CoinHandle) {
    this.handles.delete(h);
  }

  frame = (now: number) => {
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    // (browsers already pause animation frames in background tabs)
    for (const h of this.handles) {
      if (!h.visible) continue;
      // one broken token shouldn't stop every other coin on the page
      try {
        h.tick(dt, now / 1000);
      } catch (err) {
        h.visible = false;
        console.error("[coin] render failed", err);
      }
    }
    this.raf = this.handles.size ? requestAnimationFrame(this.frame) : 0;
    if (!this.raf) this.last = 0;
  };

  draw(h: CoinHandle, w: number, hh: number) {
    const r = this.renderer;
    const c = r.domElement;
    if (c.width < w || c.height < hh)
      r.setSize(Math.max(c.width, w), Math.max(c.height, hh), false);
    r.setViewport(0, 0, w, hh);
    r.setScissor(0, 0, w, hh);
    r.setScissorTest(true);
    r.clear();
    r.render(h.scene, h.camera);
    h.ctx.clearRect(0, 0, w, hh);
    h.ctx.drawImage(c, 0, c.height - hh, w, hh, 0, 0, w, hh);
  }
}

let engine: Engine | null = null;
const getEngine = () => (engine ??= new Engine());

// ---------------------------------------------------------------------------
// Geometry and texture caches

const geometries = new Map<string, THREE.BufferGeometry>();
const textures = new Map<
  string,
  { color: THREE.Texture; normal: THREE.Texture; data: THREE.Texture }
>();

/** The coin outline as a Three shape (y up, radius ~1), with its hole if it has one. */
function shapeOf(kind: CoinShape, mirror = false) {
  const s = new THREE.Shape(
    outline(kind, mirror).map(([x, y]) => new THREE.Vector2(x / 100, -y / 100)),
  );
  const hole = holeOf(kind, mirror);
  if (hole)
    s.holes.push(
      new THREE.Path().absarc(
        hole.x / 100,
        -hole.y / 100,
        hole.r / 100,
        0,
        Math.PI * 2,
        true,
      ),
    );
  return s;
}

function cached(key: string, make: () => THREE.BufferGeometry) {
  let g = geometries.get(key);
  if (!g) geometries.set(key, (g = make()));
  return g;
}

const bodyGeometry = (kind: CoinShape) =>
  cached(`body-${kind}`, () => {
    const g = new THREE.ExtrudeGeometry(shapeOf(kind), {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: 0.018,
      bevelSegments: 5,
      curveSegments: 64,
    });
    g.translate(0, 0, -DEPTH / 2);
    return g;
  });

/** Face geometry. The reverse is built mirrored so a hole lines up through the coin. */
const faceGeometry = (kind: CoinShape, side: "front" | "back") =>
  cached(`face-${kind}-${side}`, () => {
    const g = new THREE.ShapeGeometry(shapeOf(kind, side === "back"), 64);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++)
      uv.setXY(i, pos.getX(i) * 0.5 + 0.5, pos.getY(i) * 0.5 + 0.5);
    return g;
  });

function faceTextures(key: string, make: () => ReturnType<typeof faceMaps>) {
  let t = textures.get(key);
  if (!t) {
    const maps = make();
    const tex = (c: HTMLCanvasElement, color: boolean) => {
      const x = new THREE.CanvasTexture(c);
      x.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      x.anisotropy = 8;
      return x;
    };
    t = {
      color: tex(maps.color, true),
      normal: tex(maps.normal, false),
      data: tex(maps.data, false),
    };
    textures.set(key, t);
  }
  return t;
}

// ---------------------------------------------------------------------------
// The model

type Model = {
  group: THREE.Group;
  animated: boolean;
  update?: (time: number, dt: number) => void;
  dispose: () => void;
};

function coinModel(
  spec: CoinSpec,
  px: number,
  fonts: number,
  key: THREE.DirectionalLight,
): Model {
  const { topic, state, pct, stats } = spec;
  const locked = state === "locked";
  const metal = METALS[locked ? "lead" : topic.metal];
  // Studying polishes the coin: new topics are heavily tarnished, mastered ones gleam.
  const tarnish = locked
    ? 1
    : state === "mastered"
      ? 0.15
      : 0.85 - 0.6 * (Math.round(pct / 10) / 10);
  const group = new THREE.Group();
  const mats: THREE.Material[] = [];

  const edge = new THREE.MeshStandardMaterial({
    color: metal.edge,
    metalness: 1,
    roughness: 0.42,
    envMapIntensity: 1,
  });
  mats.push(edge);
  group.add(new THREE.Mesh(bodyGeometry(topic.shape), edge));

  for (const side of ["front", "back"] as const) {
    const k = `${topic.id}|${side}|${tarnish.toFixed(2)}|${locked}|${side === "back" && stats ? [stats.primary, ...stats.lines].join("|") : ""}|${px}|${fonts}`;
    const t = faceTextures(k, () =>
      faceMaps(topic, side, tarnish, locked, stats, px),
    );
    const m = new THREE.MeshStandardMaterial({
      map: t.color,
      normalMap: t.normal,
      normalScale: new THREE.Vector2(1, 1),
      roughnessMap: t.data,
      metalnessMap: t.data,
      roughness: 1,
      metalness: 1,
      envMapIntensity: 1.5,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    mats.push(m);
    const face = new THREE.Mesh(faceGeometry(topic.shape, side), m);
    face.position.z = side === "front" ? FRONT_Z : -FRONT_Z;
    if (side === "back") face.rotation.y = Math.PI;
    group.add(face);
  }

  const mastered = state === "mastered";
  return {
    group,
    // Mastered coins catch a slowly travelling light, so they glint
    animated: mastered,
    update: mastered
      ? (time) => key.position.set(-3 + Math.sin(time * 0.8) * 3, 3, 4)
      : undefined,
    dispose: () => mats.forEach((m) => m.dispose()),
  };
}

// ---------------------------------------------------------------------------
// A coin on the page

export class CoinHandle {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
  pivot = new THREE.Group();
  key = new THREE.DirectionalLight("#fff3e2", 1.6);
  model: Model | null = null;
  spec: CoinSpec;
  target: Pose = { rx: 0, ry: 0, scale: 1 };
  cur: Pose = { rx: 0, ry: 0, scale: 1 };
  /** 0..1 per frame at 60fps; 1 follows the target exactly (the inspector smooths itself). */
  ease = 0.14;
  visible = true;
  dirty = true;
  tier = 0;
  io: IntersectionObserver;
  eng: Engine;

  constructor(canvas: HTMLCanvasElement, spec: CoinSpec) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.spec = spec;
    this.eng = getEngine();
    this.scene.environment = this.eng.env;
    this.camera.position.set(0, 0, 1.12 / Math.tan(13 * DEG));
    this.key.position.set(-3, 3, 4);
    this.scene.add(this.key, this.pivot);
    this.io = new IntersectionObserver(
      ([e]) => {
        this.visible = e.isIntersecting;
        if (this.visible) this.dirty = true;
      },
      { rootMargin: "100px" },
    );
    this.io.observe(canvas);
    this.eng.add(this);
  }

  setSpec(spec: CoinSpec) {
    this.spec = spec;
    this.rebuild();
  }

  rebuild() {
    if (!this.tier) return; // built on the first frame, once the size is known
    this.model?.dispose();
    if (this.model) this.pivot.remove(this.model.group);
    this.key.position.set(-3, 3, 4);
    this.model =
      this.spec.look === "stones"
        ? stoneModel(this.spec, this.eng.renderer)
        : coinModel(this.spec, this.tier, this.eng.fontsVersion, this.key);
    this.pivot.add(this.model.group);
    this.dirty = true;
  }

  tick(dt: number, time: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(this.canvas.clientWidth * dpr);
    const h = Math.round(this.canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.dirty = true;
    }
    const tier = w > 600 ? 1024 : 512;
    if (tier !== this.tier) {
      this.tier = tier;
      this.rebuild();
    }

    const k = 1 - Math.pow(1 - this.ease, dt * 60);
    let moving = false;
    for (const p of ["rx", "ry", "scale"] as const) {
      const d = this.target[p] - this.cur[p];
      if (Math.abs(d) > (p === "scale" ? 0.0005 : 0.02)) {
        this.cur[p] += d * k;
        moving = true;
      } else this.cur[p] = this.target[p];
    }
    if (!this.dirty && !moving && !this.model?.animated) return;
    // CSS-style angles: positive rx tips the top away from the viewer
    this.pivot.rotation.set(-this.cur.rx * DEG, this.cur.ry * DEG, 0);
    this.pivot.scale.setScalar(this.cur.scale);
    this.model?.update?.(time, dt);
    this.eng.draw(this, w, h);
    this.dirty = false;
  }

  dispose() {
    this.io.disconnect();
    this.eng.remove(this);
    this.model?.dispose();
  }
}

export const mountCoin = (canvas: HTMLCanvasElement, spec: CoinSpec) =>
  new CoinHandle(canvas, spec);
