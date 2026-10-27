import * as THREE from "three"

// Ported from public/lab/print-objects.html (three r128 -> 0.180). Settings are locked:
// Flat texture, 3-drawing boil, texture size 0.5, no jump.

export const VERTEX_SHADER = `attribute vec3 fcol;attribute float fdir;attribute float ftype;varying vec3 vP;varying vec3 vON;varying vec3 vC;varying float vD;varying float vT;
uniform float uExplode;void main(){vT=ftype;vP=position;vON=normal;vC=fcol;vD=fdir;gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*uExplode,1.);}`

export const FRAGMENT_SHADER = `uniform float uSeed,uJump,uMap,uDpr,uM,uTex;uniform vec2 uRes,uCtr;varying vec3 vP;varying vec3 vON;varying vec3 vC;varying float vD;varying float vT;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n2(p);p*=2.07;a*=.5;}return s;}
float stroke(vec2 uv,vec2 c,float an,float w,float len,vec2 o){float cs=cos(an),sn=sin(an);vec2 d=uv-c;float a=d.x*cs+d.y*sn,b=-d.x*sn+d.y*cs;
float ww=w*(1.+(fbm(vec2(a*.6,an*3.)+o*.003)-.5)*.9);float tp=smoothstep(-len,-len+.6,a)*(1.-smoothstep(len-1.2,len,a));
float br=n2(vec2(a*.45,b*11.)+o*.05);float dry=mix(.15,.6,smoothstep(-len*.3,len,a));return step(abs(b),ww*tp)*step(dry,br);}
void main(){vec3 N=normalize(vON);vec2 uv;vec2 uvS=(gl_FragCoord.xy/uDpr-uCtr)/40.;
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
]

export const MODEL_COUNT = MODELS.length

type Uniforms = {
  uTex: { value: number }
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

export function createItem(i: number, dpr: number): PrintItem {
  const d = MODELS[i]()
  const U: Uniforms = {
    uTex: { value: 0.5 },
    uExplode: { value: 0 },
    uSeed: { value: 0 },
    uJump: { value: 0 },
    uMap: { value: 0 },
    uDpr: { value: dpr },
    uM: { value: i * 1.37 + 0.4 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uCtr: { value: new THREE.Vector2(0, 0) },
  }
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER, side: THREE.DoubleSide })
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
    grp.position.y = -0.45
  }
  const sc = new THREE.Scene()
  sc.add(grp)
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50)
  cam.position.set(3.2, 2.2, 5)
  cam.lookAt(0, 0, 0)
  return {
    U, grp, sc, cam, ms, yaw: i * 0.7, fold: 0, hs: 0, index: i,
    dispose: () => {
      geos.forEach((g) => g.dispose())
      mat.dispose()
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
    const ph = (th % 1.5) / 1.5
    it.U.uExplode.value = ph < 0.5 ? 0.38 * Math.sin(((ph / 0.5) * Math.PI) / 2) : 0.38 * Math.max(0, 1 - ob(Math.min((ph - 0.5) / 0.3, 1)))
    it.ms[0].rotation.y = ph * 0.6
  },
  (it, th) => {
    const w = (1 - Math.cos(th * 3.2)) / 2
    const [a, b] = it.ms
    a.scale.setScalar(1 - 0.38 * w)
    b.scale.setScalar(1 + 0.55 * w)
    b.position.y = 0.25 * w
  },
]

const ONE = new THREE.Vector3(1, 1, 1)

function rest(it: PrintItem) {
  it.ms.forEach((m) => {
    m.position.lerp(m.userData.bp, 0.4)
    m.scale.lerp(ONE, 0.4)
    m.rotation.x *= 0.6
    m.rotation.y *= 0.6
    m.rotation.z *= 0.6
  })
  it.U.uExplode.value *= 0.5
}

/** Advance one stepped frame of a slot and draw it into the given viewport (bottom-origin canvas px). */
export function renderItem(
  rd: THREE.WebGLRenderer,
  it: PrintItem,
  o: { x: number; y: number; w: number; h: number; cw: number; ch: number; tick: number; t: number; hovered: boolean; still: boolean; advance: boolean },
) {
  const { x, y, w, h } = o
  rd.setViewport(x, y, w, h)
  rd.setScissor(x, y, w, h)
  // Course art slots replace the coins: no label above, so frame tight and nearly centred, with room for hover gestures.
  const s = 1.2
  const a = w / h
  Object.assign(it.cam, { left: -s * a, right: s * a, top: s * 0.95, bottom: -s * 1.05 })
  it.cam.updateProjectionMatrix()
  // Textures boil slower than the motion: a new drawing every 3rd tick (~4 per second).
  it.U.uSeed.value = o.still ? 1 : (Math.floor(o.tick / 3) % 3) + 1
  it.U.uRes.value.set(o.cw, o.ch)
  it.U.uCtr.value.set(x + w / 2, y + h / 2)
  if (!o.advance) {
    // scroll redraw: same pose, new position
  } else if (!o.still) {
    it.yaw += 0.05
    if (o.hovered) {
      if (!it.hs) it.hs = performance.now()
      ANIM[it.index](it, (performance.now() - it.hs) / 1000)
    } else {
      it.hs = 0
      rest(it)
    }
  } else {
    rest(it)
  }
  if (o.advance) it.fold += ((o.hovered && !o.still ? 1 : 0) - it.fold) * 0.35
  it.grp.rotation.y = it.yaw
  it.grp.rotation.x = o.still ? 0 : Math.sin(o.t / 1100 + it.index) * 0.08 + it.fold * 0.22
  rd.render(it.sc, it.cam)
}
