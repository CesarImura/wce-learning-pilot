import * as THREE from "three"
import { get as getSettings } from "./settings"

// Ported from public/lab/print-objects.html (three r128 -> 0.180). Settings are locked:
// Flat texture, 3-drawing boil, texture size 0.5, no jump.

export const VERTEX_SHADER = `attribute vec3 fcol;attribute float fdir;attribute float ftype;varying vec3 vP;varying vec3 vON;varying vec3 vC;varying float vD;varying float vT;
uniform float uExplode;void main(){vT=ftype;vP=position;vON=normal;vC=fcol;vD=fdir;gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*uExplode,1.);}`

export const FRAGMENT_SHADER = `uniform float uSeed,uJump,uMap,uDpr,uM,uTex,uScl;uniform vec2 uRes,uCtr;varying vec3 vP;varying vec3 vON;varying vec3 vC;varying float vD;varying float vT;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n2(p);p*=2.07;a*=.5;}return s;}
float stroke(vec2 uv,vec2 c,float an,float w,float len,vec2 o){float cs=cos(an),sn=sin(an);vec2 d=uv-c;float a=d.x*cs+d.y*sn,b=-d.x*sn+d.y*cs;
float ww=w*(1.+(fbm(vec2(a*.6,an*3.)+o*.003)-.5)*.9);float tp=smoothstep(-len,-len+.6,a)*(1.-smoothstep(len-1.2,len,a));
float br=n2(vec2(a*.45,b*11.)+o*.05);float dry=mix(.15,.6,smoothstep(-len*.3,len,a));return step(abs(b),ww*tp)*step(dry,br);}
void main(){vec3 N=normalize(vON);vec2 uv;vec2 uvS=(gl_FragCoord.xy/uDpr-uCtr)/(40.*uScl);
if(uMap<.5){uv=uvS;}
else if(uMap>1.5){vec3 up=abs(N.y)>.9?vec3(1,0,0):vec3(0,1,0);vec3 T=normalize(cross(up,N));vec3 B=cross(N,T);uv=vec2(dot(vP,T),dot(vP,B))*2.4+vec2(vD*2.3,vD*1.1);}
else{vec3 a=abs(N);uv=(a.y>a.x&&a.y>a.z?vP.xz:(a.x>a.z?vP.zy:vP.xy))*2.4;}
uv/=uTex;float fsd=uM*7.31;vec2 o=vec2(h(vec2(uSeed,1.7+fsd)),h(vec2(uSeed,4.3+fsd)))*41.;
vec2 jit=(vec2(h(vec2(uSeed,9.1+fsd)),h(vec2(uSeed,2.2+fsd)))-.5)*.5*uJump;float aj=(h(vec2(uSeed,5.5+fsd))-.5)*.35*uJump;
vec2 c1=vec2(h(vec2(uM,1.))-.5,h(vec2(uM,2.))-.5)*2.2+jit,c2=vec2(h(vec2(uM,3.))-.5,h(vec2(uM,4.))-.5)*3.+jit*1.3,c3=vec2(h(vec2(uM,5.))-.5,h(vec2(uM,6.))-.5)*2.4+jit*.6;
float m=stroke(uv,c1,uM*2.1+aj,.55,3.2,o);
m=max(m,stroke(uv,c2,uM*2.1+1.9-aj,.28,2.,o+3.));
float lum=dot(vC,vec3(.3,.59,.11))-.08;
vec3 up=abs(N.y)>.9?vec3(1,0,0):vec3(0,1,0);vec3 Tb=normalize(cross(up,N));vec3 Bb=cross(N,Tb);
vec2 fu=uMap<.5?uvS*1.15+vec2(vD*3.1,vD*1.7)+jit*1.6:vec2(dot(vP,Tb),dot(vP,Bb))*2.4+jit*.4;fu/=uTex;float ca=cos(vD),sa=sin(vD);vec2 fr=mat2(ca,-sa,sa,ca)*fu;
float dk=lum<.25?.45:1.;float fm=0.;
if(vT>.5&&vT<1.5){float dens=smoothstep(-1.4,1.4,fr.y);fm=step(h(floor(fu*30.)+o),dens*(.35+.65*fbm(fu*1.3+vD+o*.01))*dk);}
else if(vT>1.5&&vT<2.5){vec2 g=mat2(.7071,-.7071,.7071,.7071)*fu*3.;vec2 f=fract(g)-.5;float rad=.47*smoothstep(-1.6,1.6,fr.x)*dk;fm=1.-smoothstep(rad-.06,rad,length(f));}
else if(vT>2.5){float l=fract(fr.y*2.6+(fbm(fu*.7+vD)-.5)*.5);fm=step(l,mix(.12,.55,smoothstep(-1.5,1.5,fr.x))*dk);}
m=max(m,fm);
m*=.84+.16*h(floor(uv*61.)+o);
vec3 col=lum<.25?mix(vC,vec3(.91,.9,.86),m*.85):vC*mix(vec3(1.),vec3(.07),m*.92);
col+=(h(floor(uv*90.)+3.+o)-.5)*.05;gl_FragColor=vec4(col,1.);}`

const C: Record<string, [number, number, number]> = {
  bone: [0.913, 0.902, 0.863],
  blue: [0.416, 0.745, 0.949],
  deep: [0.122, 0.31, 0.47],
  black: [0.2, 0.235, 0.26],
  // League inks: each league prints in its own metal instead of the course blue.
  bronze: [0.784, 0.455, 0.227],
  bronzeDeep: [0.33, 0.18, 0.09],
  silver: [0.78, 0.83, 0.87],
  silverDeep: [0.17, 0.2, 0.25],
  gold: [0.96, 0.75, 0.26],
  goldDeep: [0.42, 0.29, 0.07],
  obsidian: [0.64, 0.52, 0.98],
  obsidianDeep: [0.13, 0.1, 0.22],
  // Hearts (out of hearts): the lesson's heart red.
  red: [0.89, 0.27, 0.36],
  redDeep: [0.33, 0.07, 0.11],
}

const hs = (s: string) => {
  let x = 0
  for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0
  return x
}

function prep(geo: THREE.BufferGeometry, pal: string[], salt: string) {
  const g = geo.index ? geo.toNonIndexed() : geo
  g.computeVertexNormals()
  const P = g.attributes.position
  const Nn = g.attributes.normal
  const n = P.count
  const fc = new Float32Array(n * 3)
  const fd = new Float32Array(n)
  const ft = new Float32Array(n)
  const order: Record<string, number> = {}
  let next = 0
  const off = hs(salt) % 4
  for (let i = 0; i < n; i += 3) {
    const key = [Nn.getX(i), Nn.getY(i), Nn.getZ(i)].map((v) => Math.round(v * 4)).join(",")
    if (!(key in order)) order[key] = next++
    const idx = order[key]
    const c = C[pal[idx % pal.length]]
    const k = hs(key + salt)
    for (let j = 0; j < 3; j++) {
      fc.set(c, (i + j) * 3)
      fd[i + j] = ((k % 97) / 97) * 6.28
      ft[i + j] = (idx + off + Math.floor(idx / pal.length)) % 4
    }
  }
  g.setAttribute("fcol", new THREE.BufferAttribute(fc, 3))
  g.setAttribute("fdir", new THREE.BufferAttribute(fd, 1))
  g.setAttribute("ftype", new THREE.BufferAttribute(ft, 1))
  return g
}

function tris(pts: number[][], idx: number[][]) {
  const g = new THREE.BufferGeometry()
  const a: number[] = []
  idx.forEach((t) => t.forEach((i) => a.push(...pts[i])))
  g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3))
  return g
}

const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return g
}

type Part = [THREE.BufferGeometry, string[], string]
type ModelDef = { parts: Part[]; rz: number }

const lathe = (pts: number[][], seg: number) => new THREE.LatheGeometry(pts.map((q) => new THREE.Vector2(q[0], q[1])), seg)

const BIDS = [0.7, 1.0, 0.85, 1.3, 1.1]
const ASKS = [0.5, 0.8, 0.65, 0.9, 0.6]
const RING_R = 1.55
const RING_TILT = (25 * Math.PI) / 180
// A point on the globe's orbit ring at angle a, ring tilted by t about Z.
const ringPoint = (a: number, t: number) => [RING_R * Math.cos(a) * Math.cos(t), RING_R * Math.cos(a) * Math.sin(t), RING_R * Math.sin(a)]

// League objects stand on a trophy plinth, unlike the course objects that float: the plinth and the metal inks set them apart.
const plinth = (ink: string): Part => [new THREE.CylinderGeometry(0.82, 0.92, 0.3, 6).translate(0, -1.04, 0), ["black", ink + "Deep", ink], "plinth"]

/** First league model index; 9 bronze bell, 10 silver medal, 11 gold cup, 12 obsidian crown. */
export const LEAGUE_MODEL = 9

const LEAGUE_MODELS: (() => ModelDef)[] = [
  () => {
    // Exchange opening bell: lathe body, handle and knob.
    const pal = ["bronze", "bronzeDeep", "bone", "bronze"]
    const bell = lathe([[0, -0.86], [0.78, -0.86], [0.72, -0.72], [0.5, -0.32], [0.42, 0.2], [0.28, 0.44], [0, 0.48]], 8)
    const handle = new THREE.CylinderGeometry(0.09, 0.13, 0.55, 6).translate(0, 0.74, 0)
    const knob = new THREE.IcosahedronGeometry(0.17, 0).translate(0, 1.1, 0)
    return { parts: [plinth("bronze"), [bell, pal, "bell"], [handle, ["black", "bone"], "h"], [knob, ["bronze", "black"], "k"]], rz: 0 }
  },
  () => {
    // Medal on a post: a ten-sided disc, a raised centre and a two-strap ribbon.
    const disc = new THREE.CylinderGeometry(0.76, 0.76, 0.2, 10).rotateX(Math.PI / 2).translate(0, 0.12, 0)
    const boss = new THREE.CylinderGeometry(0.4, 0.4, 0.24, 5).rotateX(Math.PI / 2).translate(0, 0.12, 0)
    const post = new THREE.BoxGeometry(0.14, 0.4, 0.14).translate(0, -0.74, 0)
    const strap = (x: number, a: number) => new THREE.BoxGeometry(0.26, 0.7, 0.04).rotateZ(a).translate(x, 1.02, -0.04)
    return {
      parts: [
        plinth("silver"),
        [post, ["black"], "post"],
        [strap(-0.2, 0.32), ["silverDeep", "bone"], "s1"],
        [strap(0.2, -0.32), ["bone", "silverDeep"], "s2"],
        [disc, ["silver", "bone", "silver"], "disc"],
        [boss, ["silverDeep", "bone", "silver"], "boss"],
      ],
      rz: 0,
    }
  },
  () => {
    // Trophy cup: foot, stem, bowl and two handles.
    const cup = lathe([[0, -0.86], [0.42, -0.86], [0.42, -0.74], [0.12, -0.62], [0.1, -0.22], [0.5, 0.02], [0.68, 0.78], [0.56, 0.78], [0, 0.36]], 8)
    const handle = (x: number, a: number) => new THREE.TorusGeometry(0.26, 0.06, 3, 8, Math.PI).rotateZ(a).translate(x, 0.42, 0)
    return {
      parts: [
        plinth("gold"),
        [cup, ["gold", "goldDeep", "bone", "gold"], "cup"],
        [handle(-0.62, Math.PI / 2), ["gold", "black"], "hl"],
        [handle(0.62, -Math.PI / 2), ["goldDeep", "bone"], "hr"],
      ],
      rz: 0,
    }
  },
  () => {
    // Crown: an eight-sided band, five spikes and a gem on the front.
    const band = new THREE.CylinderGeometry(0.72, 0.66, 0.42, 8).translate(0, -0.66, 0)
    const spikes: Part[] = Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * Math.PI * 2 + Math.PI / 2
      const g = new THREE.ConeGeometry(0.2, 0.62, 4).translate(0.66 * Math.cos(a), -0.14, 0.66 * Math.sin(a))
      return [g, k % 2 ? ["obsidian", "obsidianDeep"] : ["obsidianDeep", "bone"], "sp" + k]
    })
    const gem = new THREE.OctahedronGeometry(0.17, 0).translate(0, -0.64, 0.74)
    return {
      parts: [plinth("obsidian"), [band, ["obsidianDeep", "obsidian", "black", "bone"], "band"], ...spikes, [gem, ["bone", "obsidian"], "gem"]],
      rz: 0,
    }
  },
]

/** Broken heart for the out-of-hearts screen: two extruded halves split along a zigzag crack. */
export const HEART_MODEL = LEAGUE_MODEL + LEAGUE_MODELS.length

// The classic parametric heart (x = 16 sin^3 t, ...), t from 0 (top dip) through pi (bottom tip).
const heartPt = (t: number) => [16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]
const CRACK = [[0, 5], [-1.6, 0], [1.4, -5], [-1.2, -10.5], [0, -17]]

function heartHalf(side: 1 | -1) {
  const pts: number[][] = []
  const n = 9 // few segments on purpose: faceted like the other print objects
  for (let k = 0; k <= n; k++) pts.push(heartPt(side === 1 ? (k / n) * Math.PI : Math.PI + (k / n) * Math.PI))
  // Right half runs top -> bottom along its edge, then climbs the crack; the left half runs bottom -> top and comes down it.
  const crack = side === 1 ? [...CRACK].reverse().slice(1, -1) : CRACK.slice(1, -1)
  const shape = new THREE.Shape([...pts, ...crack].map(([x, y]) => new THREE.Vector2(x, y + 2.5)))
  const g = new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: false, curveSegments: 1 })
  g.translate(side * 0.9, 0, -2.5)
  g.scale(1 / 14.5, 1 / 14.5, 1 / 14.5)
  return g
}

const MODELS: (() => ModelDef)[] = [
  () => {
    const pal = ["bone", "blue", "black", "bone"]
    const p = [[0, -1.05], [0.34, -1.05], [0.5, -0.86], [0.5, 0.86], [0.34, 1.05], [0, 1.05]]
    const w1 = new THREE.CylinderGeometry(0.05, 0.05, 0.75, 4)
    w1.translate(0, 1.42, 0)
    const w2 = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 4)
    w2.translate(0, -1.3, 0)
    return { parts: [[lathe(p, 8), pal, "a"], [w1, ["bone"], "w"], [w2, ["bone"], "w"]], rz: 0 }
  },
  () => {
    const pal = ["blue", "bone", "black"]
    return {
      parts: [
        [box(0.6, 0.4, 1, -0.6, -0.5, 0), pal, ""],
        [box(0.6, 0.8, 1, 0, -0.3, 0), pal, ""],
        [box(0.6, 1.2, 1, 0.6, -0.1, 0), pal, ""],
      ],
      rz: 0,
    }
  },
  () => {
    const xs = [-1.3, -0.65, 0, 0.65, 1.3]
    const ys = [0, 0.45, 0, 0.45, 0]
    const pts: number[][] = []
    const idx: number[][] = []
    xs.forEach((x, i) => {
      pts.push([x, ys[i] - 0.4, -0.55], [x, ys[i] - 0.4, 0.55])
    })
    for (let i = 0; i < 4; i++) {
      const a = i * 2
      idx.push([a, a + 1, a + 3], [a, a + 3, a + 2])
    }
    const ball = new THREE.IcosahedronGeometry(0.34, 0)
    ball.translate(0.45, 0.55, 0)
    return { parts: [[tris(pts, idx), ["blue", "bone"], "z"], [ball, ["black", "deep", "black"], "b"]], rz: 0 }
  },
  () => {
    const N = [0, 0, 1.3], L = [-1, 0.12, -0.85], R = [1, 0.12, -0.85], K = [0, -0.42, -0.85], Cc = [0, 0.04, -0.85]
    return {
      parts: [[tris([N, L, R, K, Cc], [[0, 1, 4], [0, 4, 2], [0, 4, 3]]), ["bone", "blue", "deep", "bone"], "p"]],
      rz: 0.1,
    }
  },
  () => {
    const p = [[0, -1.35], [0.72, -0.25], [0.72, 0.35], [0.42, 0.95], [0, 1.05]]
    return { parts: [[lathe(p, 6), ["blue", "black", "bone", "blue"], "c"]], rz: 0.35 }
  },
  () => {
    const pal = ["bone", "blue", "black"]
    return {
      parts: [
        [box(1.1, 1.1, 1.1, -0.35, -0.4, 0.2), pal, "1"],
        [box(0.72, 0.72, 0.72, 0.55, 0.5, -0.3), ["blue", "bone", "black"], "2"],
      ],
      rz: 0,
    }
  },
  () => {
    // Order book ladder: bids stack down on the left, asks stack up on the right, a spread gap between.
    const parts: Part[] = []
    BIDS.forEach((w, k) => parts.push([box(w, 0.18, 0.6, -0.1 - w / 2, -0.15 - k * 0.26, 0), k % 2 ? ["deep", "blue", "deep"] : ["blue", "deep", "blue"], "bid" + k]))
    ASKS.forEach((w, k) => parts.push([box(w, 0.18, 0.6, 0.1 + w / 2, 0.15 + k * 0.26, 0), k % 2 ? ["black", "bone", "black"] : ["bone", "black", "bone"], "ask" + k]))
    return { parts, rz: 0 }
  },
  () => {
    // Portico: step, three columns, entablature, pediment (hand-written prism).
    const cols: Part[] = [-0.95, 0, 0.95].map((x, k) => {
      const c = new THREE.CylinderGeometry(0.22, 0.22, 1.4, 6)
      c.translate(x, -0.1, 0)
      return [c, k === 1 ? ["bone", "blue", "bone"] : ["bone", "bone", "black"], "col" + k]
    })
    const pts = [[-1.3, 0.82, 0.4], [1.3, 0.82, 0.4], [0, 1.32, 0.4], [-1.3, 0.82, -0.4], [1.3, 0.82, -0.4], [0, 1.32, -0.4]]
    const ped = tris(pts, [[0, 1, 2], [3, 5, 4], [0, 2, 5], [0, 5, 3], [1, 4, 5], [1, 5, 2], [0, 3, 4], [0, 4, 1]])
    return {
      parts: [
        [box(3, 0.2, 1, 0, -0.9, 0), ["bone", "black", "bone"], "base"],
        ...cols,
        [box(2.8, 0.22, 0.8, 0, 0.71, 0), ["bone", "blue", "bone", "black"], "ent"],
        [ped, ["blue", "bone", "bone", "black"], "ped"],
      ],
      rz: 0,
    }
  },
  () => {
    // Faceted globe, a tilted orbit ring and a tiny satellite parked on it (animation moves it along the ring).
    const ring = new THREE.TorusGeometry(RING_R, 0.07, 3, 12)
    ring.rotateX(Math.PI / 2)
    ring.rotateZ(RING_TILT)
    const sat = new THREE.IcosahedronGeometry(0.1, 0)
    const q = ringPoint(0, RING_TILT)
    sat.translate(q[0], q[1], q[2])
    return {
      parts: [
        [new THREE.IcosahedronGeometry(1, 1), ["blue", "deep", "bone", "blue", "deep"], "g"],
        [ring, ["bone"], "r"],
        [sat, ["black", "bone"], "s"],
      ],
      rz: 0,
    }
  },
  ...LEAGUE_MODELS,
  () => ({
    parts: [
      [heartHalf(-1), ["red", "redDeep", "bone"], "hl"],
      [heartHalf(1), ["redDeep", "red", "black"], "hr"],
    ],
    rz: 0,
  }),
]

export const MODEL_COUNT = MODELS.length

// Objects stand still until hovered, so each starts at a 3/4 angle that shows its shape (the columns side by side,
// both sides of the order book). Index = model.
const REST_YAW: (number | undefined)[] = [0.4, 0.5, 0.3, 0.6, 0.5, 0.6, -0.45, 0.35, 0.5, 0.5, 0.57, 0.55, 0.4, 0.5]

type Uniforms = {
  uTex: { value: number }
  uScl: { value: number }
  uExplode: { value: number }
  uSeed: { value: number }
  uJump: { value: number }
  uMap: { value: number }
  uDpr: { value: number }
  uM: { value: number }
  uRes: { value: THREE.Vector2 }
  uCtr: { value: THREE.Vector2 }
}

export type PrintItem = {
  U: Uniforms
  grp: THREE.Group
  sc: THREE.Scene
  cam: THREE.OrthographicCamera
  ms: THREE.Mesh[]
  yaw: number
  fold: number
  hs: number
  index: number
  dispose: () => void
}

export type Engine = {
  rd: THREE.WebGLRenderer
  mat: THREE.ShaderMaterial
  dpr: number
  /** Grow the offscreen drawing buffer (never shrinks, so it is not resized per frame). */
  ensure: (w: number, h: number) => void
  dispose: () => void
}

/** One offscreen renderer and ONE shader material shared by every slot, so the shader compiles once. */
export function createEngine(dpr: number): Engine {
  const canvas = document.createElement("canvas")
  const rd = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true })
  rd.setPixelRatio(1)
  rd.setScissorTest(true)
  rd.setClearColor(0x000000, 0)
  const U = {
    uTex: { value: 0.5 },
    uScl: { value: 1 },
    uExplode: { value: 0 },
    uSeed: { value: 0 },
    uJump: { value: 0 },
    uMap: { value: 0 },
    uDpr: { value: dpr },
    uM: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uCtr: { value: new THREE.Vector2(0, 0) },
  }
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER, side: THREE.DoubleSide })
  let cw = 0
  let ch = 0
  return {
    rd,
    mat,
    dpr,
    ensure: (w, h) => {
      if (w > cw || h > ch) {
        cw = Math.max(cw, w)
        ch = Math.max(ch, h)
        rd.setSize(cw, ch, false)
      }
    },
    dispose: () => {
      mat.dispose()
      rd.dispose()
      rd.forceContextLoss()
    },
  }
}

export function createItem(i: number, eng: Engine): PrintItem {
  const d = MODELS[i]()
  const U: Uniforms = {
    uTex: { value: 0.5 },
    uScl: { value: 1 },
    uExplode: { value: 0 },
    uSeed: { value: 0 },
    uJump: { value: 0 },
    uMap: { value: 0 },
    uDpr: { value: eng.dpr },
    uM: { value: i * 1.37 + 0.4 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uCtr: { value: new THREE.Vector2(0, 0) },
  }
  const mat = eng.mat
  const grp = new THREE.Group()
  const geos: THREE.BufferGeometry[] = []
  const ms = d.parts.map(([geo, pal, salt]) => {
    const g = prep(geo, pal, salt)
    geos.push(g)
    const m = new THREE.Mesh(g, mat)
    m.userData.bp = m.position.clone()
    grp.add(m)
    return m
  })
  grp.rotation.z = d.rz
  if (i === 0) {
    grp.scale.setScalar(0.8)
    // Centre the candle's true middle (wicks included: +1.80 to -1.55, scaled 0.8) on the frame centre (-0.06).
    grp.position.y = -0.16
  }
  if (i === 6) grp.scale.setScalar(0.75)
  if (i === 7) {
    grp.scale.setScalar(0.7)
    grp.position.y = -0.17
  }
  if (i === 8) grp.scale.setScalar(0.72)
  if (i === HEART_MODEL) grp.scale.setScalar(1.3)
  if (i >= LEAGUE_MODEL && i < HEART_MODEL) {
    grp.scale.setScalar(0.88)
    grp.position.y = 0.1
  }
  const sc = new THREE.Scene()
  sc.add(grp)
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50)
  cam.position.set(3.2, 2.2, 5)
  cam.lookAt(0, 0, 0)
  return {
    U, grp, sc, cam, ms, yaw: REST_YAW[i] ?? i * 0.7, fold: 0, hs: 0, index: i,
    dispose: () => {
      geos.forEach((g) => g.dispose())
    },
  }
}

const ob = (x: number) => {
  const c = 1.7
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2)
}

const ANIM: ((it: PrintItem, th: number) => void)[] = [
  (it, th) => {
    const s = 1 + 0.38 * ob(Math.min(th / 0.45, 1)) + 0.04 * Math.sin(th * 6)
    const [b, w1, w2] = it.ms
    b.scale.y = s
    w1.position.y = 1.42 * (s - 1)
    w2.position.y = -1.3 * (s - 1)
  },
  (it, th) => {
    it.ms.forEach((m, k) => {
      const d = (((th - k * 0.14) % 1.3) + 1.3) % 1.3
      m.position.y = d < 0.45 ? 0.32 * Math.sin((d / 0.45) * Math.PI) : 0
    })
  },
  (it, th) => {
    const [f, b] = it.ms
    const ph = (th % 0.8) / 0.8
    b.position.y = 1.1 * 4 * ph * (1 - ph)
    const sq = 1 - Math.max(0, 1 - ph / 0.1) * 0.35 - Math.max(0, (ph - 0.9) / 0.1) * 0.35
    b.scale.set(2 - sq, sq, 2 - sq)
    f.scale.y = 1 - 0.25 * Math.max(0, 1 - Math.abs(ph - 0) / 0.1)
  },
  (it, th) => {
    const m = it.ms[0]
    m.position.set(Math.sin(th * 2.2) * 0.35, Math.sin(th * 4.4) * 0.22 + 0.1, Math.sin(th * 2.2) * 0.2)
    m.rotation.set(-0.25 + Math.sin(th * 4.4) * 0.12, 0, Math.sin(th * 2.2) * 0.45)
  },
  (it, th) => {
    // Quarter-turn snap with overshoot, hold, then a small scale settle: a sharp edge catching the light.
    const m = it.ms[0]
    m.rotation.y = (Math.PI / 2) * ob(Math.min(th / 0.35, 1))
    const q = (th - 0.35) / 0.35
    m.scale.setScalar(q > 0 && q < 1 ? 1 + 0.06 * Math.sin(q * Math.PI) : 1)
  },
  (it, th) => {
    const w = (1 - Math.cos(th * 3.2)) / 2
    const [a, b] = it.ms
    a.scale.setScalar(1 - 0.38 * w)
    b.scale.setScalar(1 + 0.55 * w)
    b.position.y = 0.25 * w
  },
  (it, th) => {
    // Buyers lift the offer: bids widen in sequence while the asks shrink.
    const env = (d: number) => (d < 0.4 ? ob(d / 0.4) : d < 1 ? 1 : d < 1.4 ? 1 - (d - 1) / 0.4 : 0)
    const ph = (k: number) => (((th - k * 0.08) % 1.6) + 1.6) % 1.6
    BIDS.forEach((w, k) => {
      const m = it.ms[k]
      const s = 1 + 0.5 * env(ph(k))
      m.scale.x = s
      m.position.x = -((s - 1) * w) / 2
    })
    ASKS.forEach((w, k) => {
      const m = it.ms[BIDS.length + k]
      const s = 1 - (0.15 + 0.15 * k) * env(ph(k + BIDS.length))
      m.scale.x = s
      m.position.x = ((s - 1) * w) / 2
    })
  },
  (it, th) => {
    // Columns rise one by one, the entablature and pediment ride the tallest.
    const lift = (k: number) => {
      const d = (((th - k * 0.12) % 1.4) + 1.4) % 1.4
      return d < 0.6 ? Math.sin((d / 0.6) * Math.PI) : 0
    }
    for (let k = 0; k < 3; k++) {
      const m = it.ms[1 + k]
      const l = lift(k)
      m.position.y = 0.25 * l
      m.scale.y = 1 + 0.08 * l
    }
    it.ms[4].position.y = it.ms[5].position.y = 0.25 * lift(2)
  },
  (it, th) => {
    // Globe spins up, the ring tilts toward 50 degrees and back, the satellite runs the ring.
    const V = 6, T = 0.6
    it.ms[0].rotation.y = th < T ? (V * th * th * th) / (3 * T * T) : (V * T) / 3 + V * (th - T)
    const tilt = RING_TILT + ((25 * Math.PI) / 180) * (1 - Math.cos(th * 2.4)) / 2
    it.ms[1].rotation.z = tilt - RING_TILT
    const a = th * 3, p = ringPoint(a, tilt), p0 = ringPoint(0, RING_TILT)
    it.ms[2].position.set(p[0] - p0[0], p[1] - p0[1], p[2] - p0[2])
  },
  (it, th) => {
    // Bell rings: a damped swing of body, handle and knob, repeating every 1.6s.
    const d = th % 1.6
    const a = 0.32 * Math.sin(d * 14) * Math.exp(-d * 2.4)
    for (let k = 1; k < 4; k++) {
      const m = it.ms[k]
      m.rotation.z = a
      m.position.x = -a * 0.6
    }
  },
  (it, th) => {
    // Medal flips a full turn with overshoot, holds, flips again.
    const d = th % 1.8
    const r = Math.PI * 2 * ob(Math.min(d / 0.7, 1))
    for (let k = 2; k < 6; k++) it.ms[k].rotation.y = r
  },
  (it, th) => {
    // Cup hops off the plinth with a squash on landing and a half turn in the air.
    const ph = (th % 1.1) / 1.1
    const up = ph < 0.6 ? Math.sin((ph / 0.6) * Math.PI) : 0
    const sq = ph >= 0.6 && ph < 0.75 ? Math.sin(((ph - 0.6) / 0.15) * Math.PI) : 0
    for (let k = 1; k < 4; k++) {
      const m = it.ms[k]
      m.position.y = 0.42 * up
      m.rotation.y = ph < 0.6 ? Math.PI * ob(ph / 0.6) : 0
      m.scale.set(1 + 0.12 * sq, 1 - 0.14 * sq, 1 + 0.12 * sq)
    }
  },
  (it, th) => {
    // Crown spikes rise one after another, the gem pulses.
    for (let k = 0; k < 5; k++) {
      const d = (((th - k * 0.1) % 1.4) + 1.4) % 1.4
      const l = d < 0.5 ? Math.sin((d / 0.5) * Math.PI) : 0
      const m = it.ms[2 + k]
      m.position.y = 0.22 * l
      m.scale.y = 1 + 0.25 * l
    }
    it.ms[7].scale.setScalar(1 + 0.3 * Math.max(0, Math.sin(th * 5)))
  },
  (it, th) => {
    // A beat that breaks: both halves swell, then drift apart along the crack and settle back.
    const ph = (th % 1.4) / 1.4
    const beat = ph < 0.15 ? Math.sin((ph / 0.15) * Math.PI) : 0
    const split = ph >= 0.15 && ph < 0.7 ? Math.sin(((ph - 0.15) / 0.55) * Math.PI) : 0
    it.ms.forEach((m, k) => {
      const side = k === 0 ? -1 : 1
      m.scale.setScalar(1 + 0.08 * beat)
      m.position.set(side * 0.22 * split, -0.08 * split, 0)
      m.rotation.z = -side * 0.22 * split
    })
  },
]

const ONE = new THREE.Vector3(1, 1, 1)

export function rest(it: PrintItem) {
  it.ms.forEach((m) => {
    m.position.lerp(m.userData.bp, 0.4)
    m.scale.lerp(ONE, 0.4)
    m.rotation.x *= 0.6
    m.rotation.y *= 0.6
    m.rotation.z *= 0.6
  })
  it.U.uExplode.value *= 0.5
}

/**
 * Advance one stepped frame of a slot and draw it into its own 2D canvas. The canvas is the slot box plus a bleed
 * of max(w,h)*0.6 on every side, so tall objects and hover gestures can spill over the card instead of being cropped.
 */
export function renderItem(
  eng: Engine,
  it: PrintItem,
  ctx: CanvasRenderingContext2D,
  o: { w: number; h: number; tick: number; t: number; hovered: boolean; still: boolean; advance: boolean; speed?: number },
) {
  const { rd } = eng
  const { w, h } = o
  const p = Math.max(w, h) * 0.6
  const W = w + 2 * p
  const H = h + 2 * p
  const bw = ctx.canvas.width
  const bh = ctx.canvas.height
  if (bw < 1 || bh < 1) return
  eng.ensure(bw, bh)
  rd.setViewport(0, 0, bw, bh)
  rd.setScissor(0, 0, bw, bh)
  // Course art slots replace the coins: no label above, so frame tight and nearly centred. The camera keeps the
  // slot's scale and widens with the bleed, so the object stays the same size.
  const s = 1.2
  const a = w / h
  const c = -0.05 * s
  Object.assign(it.cam, { left: (-s * a * W) / w, right: (s * a * W) / w, top: c + (s * H) / h, bottom: c - (s * H) / h })
  it.cam.updateProjectionMatrix()
  // Textures boil slower than the motion: a new drawing every 3rd tick (~4 per second).
  const cfg = getSettings()
  const step = Math.floor(o.tick / Math.max(1, Math.round(cfg.boilEvery)))
  it.U.uSeed.value = o.still || cfg.boil === "off" ? 1 : cfg.boil === "random" ? step + 1 : (step % 3) + 1
  // League objects keep their print wrapped on the object (it turns with them); course objects follow the panel.
  it.U.uMap.value = it.index >= LEAGUE_MODEL ? 1 : cfg.map
  it.U.uTex.value = cfg.tex
  it.U.uJump.value = cfg.jump
  it.U.uRes.value.set(W, H)
  // Slot centre inside the render viewport (CSS px; the shader divides gl_FragCoord by uDpr).
  it.U.uCtr.value.set(bw / (2 * eng.dpr), bh / (2 * eng.dpr))
  // Flat prints scale with the object: pixels per world unit here vs the lab's 230px cards at camera size 2.2
  // (52px per unit), so a 68px row icon and the 220px banner show the same print relative to the shape.
  it.U.uScl.value = h / (2 * s) / (230 / (2 * 2.2))
  if (o.advance) {
    if (!o.still) {
      const speed = o.speed ?? 1
      it.yaw += cfg.spin * speed
      if (o.hovered) {
        if (!it.hs) it.hs = performance.now()
        ANIM[it.index](it, ((performance.now() - it.hs) / 1000) * speed)
      } else {
        it.hs = 0
        rest(it)
      }
    } else {
      rest(it)
    }
    it.fold += ((o.hovered && !o.still ? 1 : 0) - it.fold) * 0.35
  }
  it.grp.rotation.y = it.yaw
  it.grp.rotation.x = o.still ? 0 : Math.sin(o.t / 1100 + it.index) * 0.08 + it.fold * 0.22
  // Copy this slot's values into the shared material's uniforms.
  const U = eng.mat.uniforms
  for (const k in it.U) {
    const src = (it.U as Record<string, { value: unknown }>)[k].value
    const dst = U[k].value
    if (typeof src === "number") U[k].value = src
    else (dst as THREE.Vector2).copy(src as THREE.Vector2)
  }
  rd.clear()
  rd.render(it.sc, it.cam)
  ctx.clearRect(0, 0, bw, bh)
  // GL origin is bottom-left: the viewport sits at the bottom of the offscreen buffer.
  ctx.drawImage(rd.domElement, 0, rd.domElement.height - bh, bw, bh, 0, 0, bw, bh)
}
