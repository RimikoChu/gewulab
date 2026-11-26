// 剖开的汽油机：培训区展示台上的单缸四冲程机（第 6 课）。从正中竖着剖开，前半个机体去掉，剖面刷成红色；
// 会动的零件（活塞、连杆、曲轴、气门、凸轮轴、火花塞）保持完整。曲轴转一个角度，活塞、连杆、气门、凸轮跟着联动，
// 缸里的气体按冲程变色：吸气是淡蓝的混合气，压缩时变暖变亮，做功时火焰从火花塞往外烧开，排气时是灰色的废气。
// 固定的机体用剪切面切掉前半（z > 0 的部分不画），剖面是一张画好的贴图。单位 1 = 1 dm；原点在曲轴中心，剖面是 z = 0。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { METALS, Metal, lathe, makeGrain, type MetalName } from '@/lab-kit'
import { ENGINE, flameFront, gasHeat, pistonY, rodAngle, strokeIndex, valves } from './physics'

type V3 = [number, number, number]
type V2 = [number, number]
const S = 10                                    // 1 m = 10 个单位
export const BORE = ENGINE.bore / 2 * S          // 缸的半径 0.43
const R = BORE, CH = 0.32
export const CR = ENGINE.r * S    // 曲柄半径、活塞销到活塞顶
export const DECK = 2.04, HEAD0 = 2.07, TANP = 0.32, PHI = Math.atan(TANP)
export const APEX = HEAD0 + R * TANP            // 燃烧室最高处（火花塞的电极）
export const LINER = 0.85, CAVITY = 0.82, COVER_TOP = 3.92
const LIFT = 0.09
/** 燃烧室顶是两面坡：x 处顶有多高 */
const roof = (x: number) => HEAD0 + (R - Math.abs(x)) * TANP
/** 进气门（左）和排气门（右）：座在哪、轴线朝哪 */
const VALVE = [-1, 1].map(s => {
  const seat: V2 = [s * 0.2, roof(0.2)], u: V2 = [s * Math.sin(PHI), Math.cos(PHI)]
  const at = (k: number): V2 => [seat[0] + u[0] * k, seat[1] + u[1] * k]
  return { s, seat, u, at, cam: at(1.32), head: s < 0 ? 0.16 : 0.14 }
})
/** 进气道、排气道的中心线 */
const PORT: V2[][] = [
  [VALVE[0].at(0.08), VALVE[0].at(0.3), [-0.62, 2.62], [-1.06, 2.64]],
  [VALVE[1].at(0.08), VALVE[1].at(0.28), [0.6, 2.55], [1.06, 2.52]],
]
const PORT_R = [0.14, 0.12]
/** 活塞顶在多高 */
export const crownY = (a: number) => pistonY(a) * S + CH
/** 剖面贴图覆盖的范围 */
const BX0 = -1.1, BX1 = 1.1, BY0 = -1.52, BY1 = 3.98, PX = 360
/** 外壳的轮廓（剖面上的形状，也是后半个机体挤出来的截面）：缸体两侧一排散热筋，曲轴箱下沿收圆，缸盖两侧有进排气歧管的凸台、上沿倒角，气门室盖是两个包住凸轮轴的拱 */
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 18): V2[] => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] })
const FINS = [0.72, 0.92, 1.12, 1.32, 1.52, 1.72]
function blockOutline(): V2[] {
  const side = (s: number): V2[] => { const p: V2[] = []; for (const y of FINS) p.push([s * 0.8, y], [s * 0.95, y + 0.012], [s * 0.95, y + 0.068], [s * 0.8, y + 0.08]); return p }
  return [[-0.8, 0.5], [0.8, 0.5], ...side(1), [0.8, DECK], [-0.8, DECK], ...side(-1).reverse()]
}
const CASE: V2[] = [[-0.98, 0.6], [-0.98, -0.18], ...arc(-0.58, -0.18, 0.4, Math.PI, Math.PI * 1.32), [-0.4, -0.72], [0.4, -0.72], ...arc(0.58, -0.18, 0.4, Math.PI * 1.68, Math.PI * 2), [0.98, 0.6]]
const PAN: V2[] = [[-0.96, -0.66], [-0.96, -0.74], [-0.9, -0.76], [-0.9, -1.3], ...arc(-0.72, -1.3, 0.18, Math.PI, Math.PI * 1.5, 8), [0.72, -1.48], ...arc(0.72, -1.3, 0.18, Math.PI * 1.5, Math.PI * 2, 8), [0.9, -0.76], [0.96, -0.74], [0.96, -0.66]]
const HEAD: V2[] = [[-1.0, HEAD0], [1.0, HEAD0], [1.0, 2.36], [1.09, 2.36], [1.09, 2.72], [0.99, 2.74], [0.92, 3.02], [-0.92, 3.02], [-0.99, 2.86], [-1.09, 2.86], [-1.09, 2.44], [-1.0, 2.44]]
const COVER: V2[] = [[-0.98, 3.0], [-1.0, 3.5], ...arc(-0.58, 3.5, 0.42, Math.PI, 0.38), [0, 3.57], ...arc(0.58, 3.5, 0.42, Math.PI - 0.38, 0), [0.98, 3.0]]
/** 把轮廓挤成后半个机体（z 从 −d/2 到 d/2，前半会被剪掉） */
const extrude = (pts: V2[], d: number) => { const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))); return new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 8 }).translate(0, 0, -d / 2) }
export const SHELL = { block: extrude(blockOutline(), 1.6), case: extrude(CASE, 1.76), pan: extrude(PAN, 1.66), head: extrude(HEAD, 1.56), cover: extrude(COVER, 1.46) }
/** 剪掉前半的金属：底色、细纹和 Metal 一样，另外带剪切面 */
export function ClipMetal({ kind, clip, rough }: { kind: MetalName; clip: THREE.Plane[]; rough?: number }) {
  const m = METALS[kind], color = useMemo(() => new THREE.Color().setRGB(m.color[0], m.color[1], m.color[2]), [m])
  return <meshStandardMaterial color={color} metalness={m.metal} roughness={Math.min(1, (rough ?? m.rough) / 0.72)} roughnessMap={makeGrain('cast')} envMapIntensity={1.4} clippingPlanes={clip} clipShadows side={THREE.DoubleSide} />
}

/** 标签用的几处位置（原点在曲轴中心） */
export const SPOTS = { plug: [0.0, 3.35, 0.1] as V3, intake: [-0.62, 2.9, 0.1] as V3, exhaust: [0.62, 2.9, 0.1] as V3, cam: [-0.72, VALVE[0].cam[1], 0.2] as V3, crank: [0.55, -0.35, 0.3] as V3, rod: [0.28, 0.9, 0.2] as V3, cyl: [0.62, 1.45, 0.05] as V3 }

// ---------- 剖面贴图 ----------
function makeCut() {
  const W = Math.round((BX1 - BX0) * PX), H = Math.round((BY1 - BY0) * PX), c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  const X = (x: number) => (x - BX0) * PX, Y = (y: number) => (BY1 - y) * PX
  const rect = (x0: number, y0: number, x1: number, y1: number) => g.rect(X(x0), Y(y1), (x1 - x0) * PX, (y1 - y0) * PX)
  const rrect = (x0: number, y0: number, x1: number, y1: number, r: number) => g.roundRect(X(x0), Y(y1), (x1 - x0) * PX, (y1 - y0) * PX, r * PX)
  const RED = '#8c2b22', RED2 = '#6e221b'
  const poly = (pts: V2[]) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))); g.closePath() }
  // 1. 实心的部分：缸体（带散热筋）、曲轴箱、缸盖、油底壳；气门室盖只是一层壳
  g.fillStyle = RED
  for (const o of [blockOutline(), CASE, HEAD, PAN]) { poly(o); g.fill() }
  poly(COVER); g.fill()
  // 缸套：颜色深一点
  g.fillStyle = RED2; g.beginPath(); rect(-R - 0.06, LINER, -R, DECK); rect(R, LINER, R + 0.06, DECK); g.fill()
  // 2. 挖空：缸筒和燃烧室、进排气道、曲轴箱、气门导管、弹簧座孔、挺柱孔、凸轮轴室、火花塞孔、油底壳里面
  g.globalCompositeOperation = 'destination-out'
  g.beginPath(); g.moveTo(X(-R), Y(LINER)); g.lineTo(X(-R), Y(HEAD0)); g.lineTo(X(0), Y(APEX)); g.lineTo(X(R), Y(HEAD0)); g.lineTo(X(R), Y(LINER)); g.closePath(); g.fill()
  PORT.forEach((p, i) => { g.lineCap = 'round'; g.lineWidth = PORT_R[i] * 2 * PX; g.beginPath(); g.moveTo(X(p[0][0]), Y(p[0][1])); g.bezierCurveTo(X(p[1][0]), Y(p[1][1]), X(p[2][0]), Y(p[2][1]), X(p[3][0]), Y(p[3][1])); g.stroke() })
  g.beginPath(); g.arc(X(0), Y(0), CAVITY * PX, 0, Math.PI * 2); rect(-0.5, 0.2, 0.5, LINER + 0.02); g.fill()
  for (const v of VALVE) {
    const band = (k0: number, k1: number, w: number) => { const [a0, a1] = [v.at(k0), v.at(k1)]; g.lineCap = 'butt'; g.lineWidth = w * PX; g.beginPath(); g.moveTo(X(a0[0]), Y(a0[1])); g.lineTo(X(a1[0]), Y(a1[1])); g.stroke() }
    band(0.2, 0.55, 0.075); band(0.5, 0.95, 0.27); band(0.9, 1.6, 0.33)
  }
  poly(COVER); g.fill()
  g.beginPath(); rect(-0.085, APEX - 0.02, 0.085, 3.1); g.fill()
  g.beginPath(); rrect(-0.86, -1.44, 0.86, -0.72, 0.07); g.fill()
  g.globalCompositeOperation = 'source-over'
  // 气门室盖的壳：沿轮廓往里留一圈壁厚；火花塞的点火线圈从中间穿出去
  g.save(); poly(COVER); g.clip(); g.strokeStyle = RED; g.lineWidth = 0.12 * PX; g.stroke(); g.restore()
  g.fillStyle = RED; g.beginPath(); rect(-0.93, 3.0, 0.93, 3.06); g.fill()
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); rect(-0.1, 3.0, 0.1, 3.7); g.fill(); g.globalCompositeOperation = 'source-over'
  // 3. 冷却液（水套）：缸套外面一圈，缸盖里两小块
  g.fillStyle = '#2f78c4'
  g.beginPath(); rrect(-0.66, 1.0, -0.5, 1.98, 0.04); rrect(0.5, 1.0, 0.66, 1.98, 0.04); rrect(-0.92, 2.12, -0.7, 2.4, 0.04); rrect(0.7, 2.11, 0.92, 2.34, 0.04); rrect(-0.5, 2.82, -0.16, 2.96, 0.03); rrect(0.16, 2.82, 0.5, 2.96, 0.03); g.fill()
  // 机油
  g.fillStyle = '#b8862a'; g.beginPath(); rect(-0.86, -1.44, 0.86, -1.2); g.fill()
  // 4. 缸盖螺栓的剖面、缸垫
  g.fillStyle = '#8c9196'; g.beginPath(); rect(-0.76, 1.15, -0.69, 2.98); rect(0.69, 1.15, 0.76, 2.98); g.fill()
  g.fillStyle = '#5c6166'; g.beginPath(); rect(-0.79, 2.92, -0.66, 3.0); rect(0.66, 2.92, 0.79, 3.0); g.fill()
  g.fillStyle = '#2a2b2d'; g.beginPath(); rect(-0.8, DECK, -R - 0.005, HEAD0); rect(R + 0.005, DECK, 0.8, HEAD0); g.fill()
  // 5. 剖面上的细斜线和一圈深色的边：看得出是切开的面
  g.globalCompositeOperation = 'source-atop'
  g.strokeStyle = 'rgba(30,6,4,0.2)'; g.lineWidth = 1.4
  for (let k = -H; k < W + H; k += 14) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k - H, H); g.stroke() }
  g.globalCompositeOperation = 'source-over'
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
  return tex
}
/** 缸壁的珩磨网纹 */
export function makeHone() {
  const S2 = 256, c = document.createElement('canvas'); c.width = c.height = S2
  const g = c.getContext('2d')!
  g.fillStyle = '#8f9396'; g.fillRect(0, 0, S2, S2)
  g.strokeStyle = 'rgba(40,44,48,0.25)'; g.lineWidth = 1
  for (let k = -S2; k < S2 * 2; k += 7) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S2 * 0.6, S2); g.stroke(); g.beginPath(); g.moveTo(k, 0); g.lineTo(k - S2 * 0.6, S2); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); t.anisotropy = 8
  return t
}

// ---------- 会动的零件 ----------
export const PISTON = lathe([[0, 0.12], [0.38, 0.12], [0.38, -0.27], [0.42, -0.27], [0.425, -0.25], [0.425, 0.17], [0.405, 0.17], [0.405, 0.19], [0.425, 0.19], [0.425, 0.22], [0.405, 0.22], [0.405, 0.24], [0.425, 0.24], [0.425, 0.27], [0.405, 0.27], [0.405, 0.29], [0.425, 0.29], [0.425, 0.31], [0.41, 0.32], [0, 0.32]], { segs: 56, crease: 40 })
export const RING = new THREE.TorusGeometry(0.418, 0.0085, 6, 56).rotateX(Math.PI / 2)
function rodShape() {
  const L = ENGINE.l * S, s = new THREE.Shape()
  s.absarc(0, 0, 0.29, Math.PI * 0.08, Math.PI * 0.92, true)
  s.lineTo(-0.075, L - 0.12); s.absarc(0, L, 0.135, Math.PI * 1.3, Math.PI * -0.3, true); s.lineTo(0.075, L - 0.12); s.closePath()
  const big = new THREE.Path(); big.absarc(0, 0, 0.205, 0, Math.PI * 2, false); s.holes.push(big)
  const small = new THREE.Path(); small.absarc(0, L, 0.085, 0, Math.PI * 2, false); s.holes.push(small)
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 28 })
  return g.translate(0, 0, -0.08)
}
export const ROD = rodShape()
/** 曲柄臂：一块连着曲柄销的臂，加一块扇形的平衡重 */
function webShape() {
  const s = new THREE.Shape()
  s.moveTo(-0.27, 0); s.lineTo(-0.27, CR); s.absarc(0, CR, 0.27, Math.PI, 0, true); s.lineTo(0.27, 0)
  s.absarc(0, 0, 0.27, 0, -Math.PI * 0.18, true)
  s.lineTo(Math.cos(-Math.PI * 0.18) * 0.56, Math.sin(-Math.PI * 0.18) * 0.56)
  s.absarc(0, 0, 0.56, -Math.PI * 0.18, -Math.PI * 0.82, true)
  s.absarc(0, 0, 0.27, -Math.PI * 0.82, -Math.PI, true)
  return new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 32 }).translate(0, 0, -0.06)
}
export const WEB = webShape()
/** 凸轮：基圆加一个桃尖 */
function camShape() {
  const s = new THREE.Shape(), rb = 0.19, N = 72
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2, d = Math.atan2(Math.sin(a), Math.cos(a)), w = 1.25
    const r = rb + (Math.abs(d) < w ? LIFT * Math.cos(d / w * Math.PI / 2) ** 2 : 0)
    const x = -Math.sin(a) * r, y = Math.cos(a) * r
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y)
  }
  return new THREE.ExtrudeGeometry(s, { depth: 0.15, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 }).translate(0, 0, -0.075)
}
export const CAM = camShape()
const valveGeo = (h: number) => lathe([[0, 0], [h - 0.012, 0], [h, 0.012], [h - 0.012, 0.03], [0.06, 0.1], [0.03, 0.18], [0.03, 0.97], [0.024, 0.975], [0.024, 0.99], [0.03, 0.995], [0.03, 1.02], [0, 1.02]], { segs: 32, crease: 40 })
const VALVES = [valveGeo(0.16), valveGeo(0.14)]
const SPRING = (() => { const pts: THREE.Vector3[] = [], turns = 6, L = 0.38, rr = 0.105; for (let i = 0; i <= 240; i++) { const t = i / 240, a = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * rr, t * L, Math.sin(a) * rr)) } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.019, 6) })()
const BUCKET = lathe([[0, 0], [0.145, 0], [0.15, 0.01], [0.15, 0.18], [0.14, 0.19], [0, 0.19]], { segs: 32 })
const RETAINER = lathe([[0, 0], [0.13, 0], [0.13, 0.03], [0.05, 0.06], [0, 0.06]], { segs: 24 })
/** 火花塞：电极、螺纹、六角、白色瓷体（几道伞裙）、接线头；上面插着一支笔式点火线圈 */
export const PLUG = lathe([[0, -0.02], [0.012, -0.02], [0.012, 0.01], [0.06, 0.01], [0.07, 0.03], [0.07, 0.2], [0.1, 0.21], [0.1, 0.3], [0.06, 0.31], [0.055, 0.36], [0.065, 0.38], [0.055, 0.4], [0.065, 0.42], [0.055, 0.44], [0.065, 0.46], [0.05, 0.6], [0.03, 0.62], [0.03, 0.7], [0, 0.7]], { segs: 28, crease: 40 })
export const PORCELAIN_FROM = 0.31
/** 气体那张面片：盖住从活塞最低处到燃烧室顶 */
export const GAS_PLANE = new THREE.PlaneGeometry(2 * R, APEX - 1.15).translate(0, (APEX + 1.15) / 2, 0)

/** 剪掉 z > 0 那一半（世界坐标里的剖面 z = cutZ）；并打开渲染器的剪切功能 */
export function useCut(cutZ: number) {
  const gl = useThree(s => s.gl)
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  return useMemo(() => [new THREE.Plane(new THREE.Vector3(0, 0, -1), cutZ)], [cutZ])
}

// ---------- 缸里的气体 ----------
const GAS_V = /* glsl */`varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const GAS_F = /* glsl */`
uniform float uTime, uMode, uHeat, uFlame, uR, uHead, uTan, uCrown, uApex, uDiesel, uSeed;
varying vec2 vP;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
void main() {
  float x = vP.x, y = vP.y;
  float top = uHead + (uR - abs(x)) * uTan;
  if (y > top || y < uCrown || abs(x) > uR) discard;
  float t = uTime + uSeed * 7.0;
  float n = fbm(vec2(x * 4.2 + t * 0.6, y * 4.2 - t * 1.3));
  vec3 fresh = uDiesel > 0.5 ? vec3(0.72, 0.8, 0.88) : vec3(0.42, 0.6, 1.0);
  float fa = uDiesel > 0.5 ? 0.1 : 0.26;
  vec3 warm = vec3(1.0, 0.5, 0.2);
  vec3 col; float a;
  if (uMode < 0.5) {
    // 吸气：混合气从左上方的进气门涌进来
    float swirl = fbm(vec2(x * 3.0 - t * 1.6, y * 3.0 + t * 0.9));
    col = fresh * (0.9 + 0.3 * swirl); a = fa + 0.14 * swirl;
  } else if (uMode < 1.5) {
    // 压缩：越压越热、越亮
    float k = clamp(uHeat / 0.35, 0.0, 1.0);
    col = mix(fresh, warm, k * 0.85) * (1.0 + k * (uDiesel > 0.5 ? 1.6 : 0.9));
    a = fa + 0.3 * k + 0.08 * n;
  } else if (uMode < 2.5) {
    // 做功：火焰从火花塞往外烧开；烧过的地方又亮又热，前沿一圈最亮
    float d = length(vec2(x, (y - uApex) * 1.15)) + (n - 0.5) * 0.16;
    float R = uFlame * 1.3;
    float burnt = smoothstep(R, R - 0.1, d);
    vec3 hot = mix(vec3(0.95, 0.32, 0.06), vec3(1.0, 0.82, 0.42), clamp(uHeat * 1.1 - 0.1, 0.0, 1.0)) * (0.45 + 1.7 * uHeat * uHeat);
    float band = smoothstep(0.09, 0.0, abs(d - R)) * step(0.01, uFlame) * (1.0 - smoothstep(0.8, 1.0, uFlame));
    col = mix(mix(fresh, warm, 0.85) * 1.5, hot, burnt) + vec3(1.0, 0.92, 0.7) * 2.6 * band;
    a = mix(0.56, 0.9, burnt);
  } else {
    // 排气：灰褐色的废气，往右上方的排气门涌出去
    float drift = fbm(vec2(x * 3.4 - t * 1.2, y * 3.4 - t * 1.6));
    col = mix(vec3(0.36, 0.32, 0.29), vec3(0.6, 0.54, 0.48), drift) + vec3(0.25, 0.08, 0.0) * uHeat;
    a = 0.5 + 0.25 * drift;
  }
  gl_FragColor = vec4(col * a, a);
}`
export function makeGas(seed = 0, diesel = false, head = HEAD0, tan = TANP) {
  return new THREE.ShaderMaterial({
    vertexShader: GAS_V, fragmentShader: GAS_F, transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    uniforms: { uTime: { value: 0 }, uMode: { value: 0 }, uHeat: { value: 0 }, uFlame: { value: 0 }, uR: { value: R - 0.004 }, uHead: { value: head }, uTan: { value: tan }, uCrown: { value: 2 }, uApex: { value: APEX }, uDiesel: { value: diesel ? 1 : 0 }, uSeed: { value: seed } },
  })
}
/** 把气体的着色器参数按曲轴转角 a 设好 */
export function setGas(m: THREE.ShaderMaterial, a: number, t: number) {
  m.uniforms.uTime.value = t; m.uniforms.uMode.value = strokeIndex(a); m.uniforms.uHeat.value = gasHeat(a); m.uniforms.uFlame.value = flameFront(a); m.uniforms.uCrown.value = crownY(a) - 0.002
}

let dot: THREE.CanvasTexture | null = null
export function softDot() {
  if (dot) return dot
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d')!, q = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(0.45, 'rgba(255,255,255,0.4)'); q.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = q; g.fillRect(0, 0, 64, 64)
  return (dot = new THREE.CanvasTexture(c))
}
const frac = (x: number) => x - Math.floor(x)

/**
 * 剖开的单缸汽油机。at：放在哪（剖面所在的那个竖直面就是 at 的 z）；angle：曲轴转角（度）。
 * 曲轴、凸轮轴、气门、活塞都由 angle 算出来；气体的颜色、火焰、火花也是。
 */
export function Cutaway({ at, angle }: { at: V3; angle: number }) {
  const clip = useCut(at[2])
  const tex = useMemo(() => ({ cut: makeCut(), hone: makeHone() }), [])
  const gas = useMemo(() => makeGas(), [])
  const live = useRef(angle); live.current = angle
  const g = useRef<{ piston: THREE.Group | null; rod: THREE.Group | null; crank: THREE.Group | null; v: (THREE.Group | null)[]; spring: (THREE.Mesh | null)[]; cam: (THREE.Group | null)[]; spark: THREE.Sprite | null; light: THREE.PointLight | null; flowI: THREE.Group | null; flowE: THREE.Group | null }>({ piston: null, rod: null, crank: null, v: [null, null], spring: [null, null], cam: [null, null], spark: null, light: null, flowI: null, flowE: null })
  const ports = useMemo(() => PORT.map(p => new THREE.CubicBezierCurve3(...p.map(([x, y]) => new THREE.Vector3(x, y, -0.02)) as [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3])), [])
  const portGeo = useMemo(() => ports.map((c, i) => new THREE.TubeGeometry(c, 40, PORT_R[i], 20)), [ports])
  // 进气道外面接的进气管、排气道外面接的排气管
  const pipes = useMemo(() => [
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-1.03, 2.64, 0], [-1.35, 2.7, 0], [-1.62, 3.0, 0], [-1.72, 3.5, 0]].map(p => new THREE.Vector3(...p as V3))), 40, 0.16, 20),
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[1.03, 2.52, 0], [1.35, 2.45, 0], [1.6, 2.1, 0], [1.66, 1.4, 0]].map(p => new THREE.Vector3(...p as V3))), 40, 0.14, 20),
  ], [])
  useFrame(({ clock }) => {
    const a = live.current, q = g.current, t = clock.elapsedTime, rad = a * Math.PI / 180
    const py = pistonY(a) * S
    q.piston?.position.set(0, py, 0)
    if (q.rod) { q.rod.position.set(CR * Math.sin(rad), CR * Math.cos(rad), 0); q.rod.rotation.z = rodAngle(a) }
    if (q.crank) q.crank.rotation.z = -rad
    const vl = valves(a), lifts = [vl.intake * LIFT, vl.exhaust * LIFT]
    VALVE.forEach((v, i) => {
      q.v[i]?.position.set(v.seat[0] - v.u[0] * lifts[i], v.seat[1] - v.u[1] * lifts[i], 0)
      q.spring[i]?.scale.set(1, (0.38 - lifts[i]) / 0.38, 1)
      if (q.cam[i]) q.cam[i]!.rotation.z = (i === 0 ? -(Math.PI - PHI) + 93 / 2 * Math.PI / 180 : Math.PI - PHI + 627 / 2 * Math.PI / 180) - rad / 2
    })
    setGas(gas, a, t)
    const x = ((a % 720) + 720) % 720
    const spark = x > 352 && x < 372 ? Math.sin((x - 352) / 20 * Math.PI) : 0
    if (q.spark) { q.spark.visible = spark > 0.02; q.spark.scale.setScalar(0.12 + spark * 0.22); (q.spark.material as THREE.SpriteMaterial).opacity = spark }
    if (q.light) q.light.intensity = 0.6 * spark * 10 + (x >= 360 && x < 540 ? 4 * gasHeat(a) ** 2 : x >= 180 && x < 360 ? 2 * gasHeat(a) : 0)
    // 进气道、排气道里流动的气
    const flow = (grp: THREE.Group | null, curve: THREE.Curve<THREE.Vector3>, on: number, inward: boolean) => grp?.children.forEach((s, i) => {
      const p = frac(t * 0.9 + i / grp.children.length), u = inward ? 1 - p : p
      curve.getPoint(Math.min(1, Math.max(0, u)), s.position); s.position.z = -0.04 - (i % 3) * 0.03
      s.scale.setScalar(0.12 + 0.05 * Math.sin(i * 3.1)); ((s as THREE.Sprite).material as THREE.SpriteMaterial).opacity = on * Math.sin(p * Math.PI) * 0.8
    })
    flow(q.flowI, ports[0], vl.intake, true); flow(q.flowE, ports[1], vl.exhaust, false)
  })
  const cast = (rough = 0.6) => <meshStandardMaterial color="#9ea3a6" roughness={rough} metalness={0.55} clippingPlanes={clip} clipShadows side={THREE.DoubleSide} />
  const W = BX1 - BX0, Hh = BY1 - BY0
  return <group position={at}>
    {/* 剖面 */}
    <mesh position={[(BX0 + BX1) / 2, (BY0 + BY1) / 2, 0]} receiveShadow><planeGeometry args={[W, Hh]} /><meshStandardMaterial map={tex.cut} color="#a8a4a2" alphaTest={0.5} roughness={0.62} metalness={0.05} /></mesh>
    {/* 后半个机体：缸体、曲轴箱、缸盖、气门室盖、油底壳（剪掉前半） */}
    <mesh geometry={SHELL.block} castShadow receiveShadow><ClipMetal kind="iron" clip={clip} rough={0.62} /></mesh>
    <mesh geometry={SHELL.case} castShadow receiveShadow><ClipMetal kind="iron" clip={clip} rough={0.62} /></mesh>
    <mesh geometry={SHELL.head} castShadow receiveShadow><ClipMetal kind="aluminum" clip={clip} rough={0.5} /></mesh>
    <mesh geometry={SHELL.cover} castShadow><meshPhysicalMaterial color="#17191c" roughness={0.6} metalness={0.2} clearcoat={0.3} clippingPlanes={clip} clipShadows side={THREE.DoubleSide} /></mesh>
    <mesh geometry={SHELL.pan} castShadow><ClipMetal kind="steel" clip={clip} rough={0.45} /></mesh>
    {/* 缸筒内壁（珩磨纹）、燃烧室后壁、曲轴箱的腔、后主轴承座、油面 */}
    <mesh position={[0, (LINER + APEX) / 2, 0]}><cylinderGeometry args={[R, R, APEX - LINER, 48, 1, true]} /><meshStandardMaterial map={tex.hone} roughness={0.35} metalness={0.7} side={THREE.BackSide} clippingPlanes={clip} /></mesh>
    <mesh position={[0, 0, -0.21]} rotation-x={Math.PI / 2}><cylinderGeometry args={[CAVITY, CAVITY, 0.42, 48, 1, true]} /><meshStandardMaterial color="#4a4f53" roughness={0.7} metalness={0.4} side={THREE.BackSide} /></mesh>
    <mesh position={[0, 0, -0.44]}><ringGeometry args={[0.25, CAVITY + 0.01, 48]} /><meshStandardMaterial color="#3d4246" roughness={0.7} metalness={0.4} /></mesh>
    <mesh position={[0, -1.2, -0.4]} rotation-x={-Math.PI / 2}><planeGeometry args={[1.72, 0.8]} /><meshPhysicalMaterial color="#7a5214" roughness={0.12} clearcoat={1} /></mesh>
    {portGeo.map((pg, i) => <mesh key={i} geometry={pg}><meshStandardMaterial color="#8d8f8c" roughness={0.55} metalness={0.5} side={THREE.BackSide} clippingPlanes={clip} /></mesh>)}
    {pipes.map((pg, i) => <mesh key={i} geometry={pg} castShadow>{i ? <meshStandardMaterial color="#6f6a63" roughness={0.45} metalness={0.9} side={THREE.DoubleSide} clippingPlanes={clip} /> : <meshStandardMaterial color="#202326" roughness={0.5} side={THREE.DoubleSide} clippingPlanes={clip} />}</mesh>)}
    {/* 缸里的气体和火焰 */}
    <mesh position={[0, 0, 0.004]} material={gas} geometry={GAS_PLANE} renderOrder={6} />
    <pointLight ref={e => { g.current.light = e }} position={[0, 2.0, 0.5]} color="#ff8a3a" distance={4} decay={1.6} intensity={0} />
    {/* 活塞和活塞环 */}
    <group ref={e => { g.current.piston = e }}>
      <mesh geometry={PISTON} castShadow><Metal kind="aluminum" grain="turned" rough={0.32} /></mesh>
      {[0.18, 0.23, 0.28].map(y => <mesh key={y} geometry={RING} position-y={y}><Metal kind="steel" rough={0.25} /></mesh>)}
    </group>
    {/* 连杆：大头上的分界线和两颗连杆螺栓 */}
    <group ref={e => { g.current.rod = e }}>
      <mesh geometry={ROD} castShadow><Metal kind="steel" grain="cast" rough={0.36} /></mesh>
      <mesh position={[0, -0.02, 0]}><boxGeometry args={[0.6, 0.012, 0.19]} /><meshStandardMaterial color="#1a1c1e" /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * 0.2, -0.26, 0]}><cylinderGeometry args={[0.04, 0.04, 0.08, 6]} /><Metal kind="steel" /></mesh>)}
    </group>
    {/* 曲轴：两块曲柄臂、曲柄销、前后主轴颈，后头一个飞轮 */}
    <group ref={e => { g.current.crank = e }}>
      {[-1, 1].map(s => <mesh key={s} geometry={WEB} position-z={s * 0.17} castShadow><Metal kind="steel" grain="turned" rough={0.3} /></mesh>)}
      <mesh position={[0, CR, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.2, 0.2, 0.36, 32]} /><Metal kind="steel" grain="turned" rough={0.16} env={1.6} /></mesh>
      <mesh position={[0, 0, 0.42]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.24, 0.24, 0.44, 32]} /><Metal kind="steel" grain="turned" rough={0.2} env={1.6} /></mesh>
      <mesh position={[0, 0, 0.66]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.15, 0.15, 0.06, 6]} /><Metal kind="steel" env={1.6} /></mesh>
      <mesh position={[0, 0, -0.62]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.24, 0.24, 0.8, 32]} /><Metal kind="steel" grain="turned" rough={0.2} env={1.6} /></mesh>
      <mesh position={[0, 0, -1.08]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[1.08, 1.08, 0.16, 64]} /><Metal kind="iron" grain="turned" /></mesh>
      <mesh position={[0, 0, -1.08]}><torusGeometry args={[1.08, 0.04, 6, 90]} /><Metal kind="steel" /></mesh>
      <mesh position={[0.6, 0, -0.99]}><cylinderGeometry args={[0.06, 0.06, 0.02, 12]} /><meshStandardMaterial color="#d8d2c0" /></mesh>
    </group>
    {/* 气门、弹簧、挺柱、凸轮轴 */}
    {VALVE.map((v, i) => <group key={i}>
      <group ref={e => { g.current.v[i] = e }} rotation-z={-v.s * PHI}>
        <mesh geometry={VALVES[i]} castShadow><Metal kind={i ? 'steel' : 'stainless'} grain="turned" rough={0.28} /></mesh>
        <mesh geometry={RETAINER} position-y={0.88}><Metal kind="steel" /></mesh>
        <mesh geometry={BUCKET} position-y={0.93}><Metal kind="steel" grain="turned" rough={0.2} /></mesh>
      </group>
      <group position={[v.at(0.52)[0], v.at(0.52)[1], 0]} rotation-z={-v.s * PHI}><mesh ref={e => { g.current.spring[i] = e }} geometry={SPRING}><Metal kind="steel" rough={0.3} /></mesh></group>
      <mesh position={[v.seat[0], v.seat[1], 0]} rotation={[Math.PI / 2, -v.s * PHI, 0]}><torusGeometry args={[v.head - 0.01, 0.012, 6, 32]} /><Metal kind="copper" /></mesh>
      <group position={[v.cam[0], v.cam[1], 0]}>
        <group ref={e => { g.current.cam[i] = e }}><mesh geometry={CAM} castShadow><Metal kind="iron" grain="turned" rough={0.3} env={1.4} /></mesh></group>
        <mesh position-z={-0.25} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.11, 0.11, 0.9, 24]} /><Metal kind="steel" grain="turned" rough={0.25} /></mesh>
      </group>
    </group>)}
    {/* 火花塞和点火线圈；电极上的电火花 */}
    <group position={[0, APEX - 0.01, 0]}>
      <mesh geometry={PLUG} castShadow><Metal kind="steel" grain="turned" rough={0.3} /></mesh>
      <mesh position-y={PORCELAIN_FROM + 0.16} renderOrder={1}><cylinderGeometry args={[0.062, 0.067, 0.3, 24]} /><meshPhysicalMaterial color="#f1efe8" roughness={0.25} clearcoat={0.8} /></mesh>
      <mesh position-y={0.7 + (COVER_TOP + 0.3 - APEX - 0.7) / 2}><cylinderGeometry args={[0.085, 0.09, COVER_TOP + 0.3 - APEX - 0.7, 24]} /><meshPhysicalMaterial color="#141517" roughness={0.4} clearcoat={0.5} /></mesh>
      <mesh position={[0.06, COVER_TOP + 0.36 - APEX, 0]}><boxGeometry args={[0.32, 0.18, 0.2]} /><meshPhysicalMaterial color="#141517" roughness={0.4} clearcoat={0.5} /></mesh>
      <sprite ref={e => { g.current.spark = e }} position={[0, -0.03, 0.05]} renderOrder={9}><spriteMaterial map={softDot()} color="#bfe4ff" transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} opacity={0} /></sprite>
    </group>
    <group ref={e => { g.current.flowI = e }}>{Array.from({ length: 14 }, (_, i) => <sprite key={i} renderOrder={5}><spriteMaterial map={softDot()} color="#7fb2ff" transparent opacity={0} depthWrite={false} /></sprite>)}</group>
    <group ref={e => { g.current.flowE = e }}>{Array.from({ length: 14 }, (_, i) => <sprite key={i} renderOrder={5}><spriteMaterial map={softDot()} color="#8b8178" transparent opacity={0} depthWrite={false} /></sprite>)}</group>
  </group>
}
