// 展厅正中的人体模型：一个半透明的人，身体里是完整的消化系统。
// 坐标是身体自己的：1 个单位 = 10 cm，脚底 y = 0，人面朝 +z（朝镜头），x 正方向是他的左手边（画面右边）。
// 器官都是实心的、湿润的：肝、胃、胰、胆囊、舌、唾液腺用距离场分段生成（job.ts）；食道、小肠、大肠是沿曲线扫出来的管子。
// 一口食物沿着消化道走的路（TRACT_CURVE）也在这里，拓展课和第 2 课都用它。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { chain, curveOf, ellipsoid, fbm, lin, mix3, noise, roundCone, smin, sminAll, surfaceNetsGen, type V3 } from './sdf'
import { planarUV, sweep, wetMat } from './tube'
import { prioOf, useJob } from './job'
import { HeadSection } from './head'

// ---------- 各器官的位置 ----------
export const MOUTH_AT: V3 = [0, 15.98, 0.42]
const PHARYNX: V3[] = [[0, 16.02, 0.02], [0, 15.75, -0.12], [0, 15.42, -0.14]]
const ESO: V3[] = [[0, 15.42, -0.14], [0, 14.6, -0.22], [0.02, 13.4, -0.3], [0.1, 12.35, -0.3], [0.28, 11.85, -0.22], [0.42, 11.6, -0.12]]
/** 胃的中轴（贲门 → 胃底 → 胃体 → 胃窦 → 幽门）和各处半径 */
export const STOMACH_AXIS: V3[] = [[0.42, 11.6, -0.12], [0.66, 11.66, -0.12], [0.82, 11.38, -0.02], [0.86, 11.02, 0.1], [0.72, 10.72, 0.2], [0.42, 10.58, 0.27], [0.14, 10.64, 0.27], [-0.02, 10.7, 0.26]]
export const STOMACH_R = [0.13, 0.33, 0.37, 0.36, 0.31, 0.24, 0.16, 0.1]
const DUO: V3[] = [[-0.02, 10.7, 0.26], [-0.3, 10.7, 0.18], [-0.5, 10.52, 0.04], [-0.53, 10.22, -0.02], [-0.36, 10.05, -0.08], [0.0, 10.05, -0.12], [0.3, 10.14, -0.1], [0.42, 10.24, -0.02]]
/**
 * 空肠、回肠：从十二指肠的末端开始，在腹腔里弯弯曲曲地盘绕，最后在右下腹接到盲肠。
 * 做法是一条“不自己穿过自己”的随机路：每一步在几个方向里挑一个，既不出腹腔、又离走过的路够远、转弯不太急。
 */
function ileumPath(): V3[] {
  let sd = 4049; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  const C = new THREE.Vector3(0, 9.6, 0.17), RX = 0.74, RY = 0.5, RZ = 0.3, STEP = 0.09, GAP = 0.215
  const pts = [new THREE.Vector3(0.42, 10.24, -0.02), new THREE.Vector3(0.52, 10.12, 0.08)]
  let dir = new THREE.Vector3(0.2, -1, 0.3).normalize()
  const inside = (p: THREE.Vector3) => ((p.x - C.x) / RX) ** 2 + ((p.y - C.y) / RY) ** 2 + ((p.z - C.z) / RZ) ** 2
  for (let n = 0; n < 230; n++) {
    let best: THREE.Vector3 | null = null, bs = -1e9, bd = dir
    for (let k = 0; k < 28; k++) {
      const d = dir.clone().add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(1.5)).normalize()
      const p = pts[pts.length - 1].clone().addScaledVector(d, STEP)
      let near = 9; for (let i = 0; i < pts.length - 4; i++) near = Math.min(near, pts[i].distanceTo(p))
      const sc = Math.min(near, GAP) * 6 - Math.max(0, inside(p) - 0.85) * 12 + d.dot(dir) * 0.3 + rnd() * 0.05
      if (sc > bs) { bs = sc; best = p; bd = d }
    }
    pts.push(best!); dir = bd
  }
  // 最后一段朝右下腹的盲肠走
  const end = [new THREE.Vector3(-0.5, 9.1, 0.2), new THREE.Vector3(-0.72, 9.1, 0.16)]
  return [...pts.filter((_, i) => i % 2 === 0 || i < 2), ...end].map(p => [p.x, p.y, p.z] as V3)
}
export const ILEUM = ileumPath()
/** 大肠：盲肠 → 升结肠 → 横结肠 → 降结肠 → 乙状结肠 → 直肠 → 肛门 */
const COLON: V3[] = [[-0.86, 9.0, 0.16], [-0.94, 9.35, 0.14], [-0.96, 9.85, 0.12], [-0.9, 10.3, 0.2], [-0.62, 10.36, 0.42], [-0.15, 10.2, 0.54], [0.35, 10.2, 0.52], [0.78, 10.36, 0.36], [0.98, 10.5, 0.12], [1.02, 10.05, 0.04], [1.0, 9.5, 0.04], [0.9, 9.12, 0.12], [0.5, 9.02, 0.3], [0.16, 9.04, 0.06], [0.02, 8.92, -0.24], [0.0, 8.72, -0.3]]
const ANAL: V3[] = [[0.0, 8.72, -0.3], [0.0, 8.6, -0.28], [0.0, 8.5, -0.24]]
export const ANUS_AT: V3 = [0, 8.5, -0.24]
const APPENDIX: V3[] = [[-0.84, 8.92, 0.12], [-0.78, 8.74, 0.08], [-0.66, 8.68, 0.16], [-0.6, 8.76, 0.24]]
const BILE: V3[] = [[-0.36, 10.92, 0.3], [-0.38, 10.7, 0.12], [-0.46, 10.42, 0.04]]

/** 第 2 课和拓展课的标签对准的地方 */
export const SPOTS: Record<string, V3> = {
  mouth: [0.0, 15.93, 0.55], pharynx: [0, 15.78, -0.07], esophagus: [0.02, 13.6, -0.3], stomach: [0.86, 11.15, 0.36], small: [0.55, 9.6, 0.45], large: [-0.98, 9.8, 0.28], anus: ANUS_AT,
  saliva: [0.32, 15.68, 0.3], liver: [-0.95, 11.3, 0.4], pancreas: [0.6, 10.58, -0.34], gastric: [0.82, 10.9, 0.38], intestinal: [-0.2, 9.5, 0.45], gall: [-0.4, 10.78, 0.52],
}

// ---------- 身体的外形（半透明壳） ----------
function bodySdf(x: number, y: number, z: number) {
  const ax = Math.abs(x)
  const d = sminAll([
    ellipsoid(x, y, z, [0, 16.5, 0.05], [0.72, 0.96, 0.88]),
    ellipsoid(x, y, z, [0, 15.85, 0.32], [0.5, 0.42, 0.55]),
    roundCone(x, y, z, [0, 14.95, -0.05], [0, 15.85, 0], 0.48, 0.42),
    ellipsoid(x, y, z, [0, 13.35, -0.05], [1.6, 1.72, 0.98]),
    ellipsoid(x, y, z, [0, 11.1, 0.04], [1.28, 1.55, 0.88]),
    ellipsoid(x, y, z, [0, 9.62, 0], [1.5, 1.1, 0.92]),
    roundCone(ax, y, z, [0.2, 14.45, -0.1], [1.72, 14.38, -0.08], 0.5, 0.48),
    roundCone(ax, y, z, [1.95, 14.3, -0.05], [2.6, 11.4, 0.02], 0.44, 0.35),
    roundCone(ax, y, z, [2.6, 11.4, 0.02], [3.12, 9.0, 0.22], 0.33, 0.24),
    ellipsoid(ax, y, z, [3.3, 8.25, 0.3], [0.2, 0.55, 0.36], 0.12),
    roundCone(ax, y, z, [0.82, 9.05, 0], [0.95, 5.1, 0.05], 0.68, 0.46),
    roundCone(ax, y, z, [0.95, 5.1, 0.05], [1.02, 0.9, -0.08], 0.45, 0.27),
    ellipsoid(ax, y, z, [1.0, 3.65, -0.16], [0.44, 1.25, 0.47]),
    ellipsoid(ax, y, z, [1.03, 0.33, 0.42], [0.34, 0.3, 1.02]),
  ], 0.32)
  return d + 0.012 * fbm(x * 2, y * 2, z * 2, 2)
}

// ---------- 距离场器官 ----------
function liverSdf(x: number, y: number, z: number) {
  let d = smin(ellipsoid(x, y, z, [-0.5, 11.36, 0.0], [0.9, 0.62, 0.66]), ellipsoid(x, y, z, [0.12, 11.56, 0.22], [0.55, 0.24, 0.36], -0.12), 0.25)
  d = Math.max(d, 10.92 + 0.3 * x - 0.15 * z - y)                 // 下面是斜的脏面
  d = Math.max(d, y - 11.95 + 0.25 * x * x)                          // 上面贴着膈，是圆顶
  d = Math.max(d, -ellipsoid(x, y, z, [0.5, 11.3, -0.05], [0.42, 0.4, 0.42]))   // 给胃让出地方
  return d + 0.012 * fbm(x * 5, y * 5, z * 5, 2)
}
function gallSdf(x: number, y: number, z: number) { return roundCone(x, y, z, [-0.4, 10.8, 0.48], [-0.34, 11.02, 0.3], 0.085, 0.05) }
export function stomachSdf(x: number, y: number, z: number) {
  return chain(x, y, z, STOMACH_AXIS, STOMACH_R, 0.12) + 0.008 * fbm(x * 8, y * 8, z * 8, 2)
}
function pancreasSdf(x: number, y: number, z: number) {
  const d = chain(x, y, z, [[-0.34, 10.34, -0.02], [-0.05, 10.44, -0.2], [0.4, 10.55, -0.3], [0.84, 10.66, -0.34]], [0.12, 0.09, 0.08, 0.055], 0.08)
  return d + 0.018 * noise(x * 22, y * 22, z * 22) + 0.01 * fbm(x * 9, y * 9, z * 9, 2)   // 一粒粒的小叶
}
const C = {
  liver: lin('#6e231d'), liverL: lin('#9a3a2e'), gall: lin('#4f6e2a'), gallL: lin('#89a04a'),
  stomach: lin('#d27f72'), stomachL: lin('#eaa898'), vessel: lin('#a0353c'),
  pan: lin('#e2ae7c'), panL: lin('#f2cfa0'), tongue: lin('#c4545a'), tongueL: lin('#e0837f'), gland: lin('#e2a98e'), glandL: lin('#f4cdb4'),
}
function* bodyGen() {
  const shell = yield* surfaceNetsGen(bodySdf, [[-3.8, -0.1, -1.3], [3.8, 17.6, 1.9]], 0.11)
  const liver = planarUV(yield* surfaceNetsGen(liverSdf, [[-1.5, 10.55, -0.72], [0.75, 12.05, 0.76]], 0.026, p => mix3(C.liver, C.liverL, 0.45 + 0.7 * fbm(p[0] * 5, p[1] * 5, p[2] * 5, 3))), 3)
  const gall = yield* surfaceNetsGen(gallSdf, [[-0.55, 10.65, 0.18], [-0.22, 11.12, 0.62]], 0.014, p => mix3(C.gall, C.gallL, 0.4 + 0.6 * fbm(p[0] * 9, p[1] * 9, p[2] * 9, 2)))
  // 胃：浆膜面上淡淡几条沿大弯、小弯走的血管
  const stomach = planarUV(yield* surfaceNetsGen(stomachSdf, [[-0.15, 10.38, -0.5], [1.28, 12.05, 0.7]], 0.022, p => {
    const v = Math.max(0, 1 - Math.abs(fbm(p[0] * 6 + 2, p[1] * 6, p[2] * 6, 2)) * 14)
    return mix3(mix3(C.stomach, C.stomachL, 0.4 + 0.7 * fbm(p[0] * 4, p[1] * 4, p[2] * 4, 3)), C.vessel, v * 0.55)
  }), 3)
  const pancreas = planarUV(yield* surfaceNetsGen(pancreasSdf, [[-0.5, 10.16, -0.48], [0.95, 10.78, 0.14]], 0.016, p => mix3(C.pan, C.panL, 0.35 + 0.8 * noise(p[0] * 22, p[1] * 22, p[2] * 22))), 4)
  return { shell, liver, gall, stomach, pancreas }
}
export type BodyGeo = ReturnType<typeof bodyGen> extends Generator<void, infer R> ? R : never

// ---------- 扫出来的管子 ----------
const P = { eso: lin('#c9736d'), esoL: lin('#e09a90'), si: lin('#e3a08c'), siL: lin('#f2c3ae'), siV: lin('#b2464a'), col: lin('#cf9a7c'), colL: lin('#e6bea0'), colD: lin('#a8705a'), bile: lin('#6f8a32'), mucosa: lin('#c06a62') }
function tubes() {
  // 食道从颈根往下画（颈部以上在头颈剖面模型里）
  const eso = sweep(curveOf([[0, 14.6, -0.2], ...ESO.slice(2)], 0.4), { segs: 120, radial: 16, r: t => 0.075 * (1 + 0.04 * Math.sin(t * 90)) + (t < 0.03 ? 0.006 : 0), color: (t, a) => mix3(P.eso, P.esoL, 0.5 + 0.5 * Math.sin(a * 3 + t * 40) * 0.3) })
  const duoCurve = curveOf(DUO, 0.4), ilCurve = curveOf(ILEUM, 0.5)
  const siColor = (t: number, a: number): V3 => { const v = Math.max(0, Math.sin(t * 260 + a * 1.5)) ** 30; return mix3(mix3(P.si, P.siL, 0.5 + 0.35 * noise(t * 80, a * 2, 0)), P.siV, v * 0.6) }
  const duo = sweep(duoCurve, { segs: 90, radial: 16, r: () => 0.105, color: siColor })
  const ileum = sweep(ilCurve, { segs: 900, radial: 16, r: (t, a) => 0.1 * (1 + 0.05 * Math.sin(t * 600) + 0.02 * Math.sin(a * 3)), color: siColor })
  // 结肠：一节节的结肠袋，三条结肠带（纵向的浅沟）
  const colCurve = curveOf(COLON, 0.45)
  const colR = (t: number, a: number) => {
    const base = t < 0.05 ? 0.2 : t < 0.78 ? 0.17 : t < 0.9 ? 0.13 : 0.15
    const haus = t < 0.9 ? 0.13 * Math.max(0, Math.sin(t * Math.PI * 46)) ** 0.7 : 0.02
    const band = -0.07 * Math.max(0, Math.cos((a - 0.4) * 3)) ** 12
    return base * (1 + haus + band)
  }
  const colon = sweep(colCurve, { segs: 600, radial: 24, r: colR, caps: true, color: (t, a) => mix3(mix3(P.col, P.colL, 0.5 + 0.6 * Math.max(0, Math.sin(t * Math.PI * 46))), P.colD, 0.3 * Math.max(0, Math.cos((a - 0.4) * 3)) ** 12) })
  const anal = sweep(curveOf(ANAL, 0.5), { segs: 20, radial: 16, r: t => 0.12 - t * 0.06, caps: true, color: () => P.mucosa })
  const appendix = sweep(curveOf(APPENDIX, 0.5), { segs: 30, radial: 10, r: t => 0.04 - t * 0.012, caps: true, color: () => P.col })
  const bile = sweep(curveOf(BILE, 0.5), { segs: 30, radial: 8, r: () => 0.022, color: () => P.bile })
  return { eso, duo, ileum, colon, anal, appendix, bile }
}
let TUBES: ReturnType<typeof tubes> | null = null
const tubeGeo = () => (TUBES ??= tubes())

// ---------- 一口食物走的路 ----------
/** 口腔 → 咽 → 食道 → 胃 → 十二指肠 → 空肠回肠 → 大肠 → 肛门。marks 是每一段在路上从哪里开始（0–1） */
export const TRACT_PATH = (() => {
  const segs: { key: string; pts: V3[] }[] = [
    { key: 'mouth', pts: [[0, 15.98, 0.7], [0, 16.0, 0.42], [0, 16.02, 0.15]] },
    { key: 'pharynx', pts: PHARYNX },
    { key: 'esophagus', pts: ESO.slice(1, -1) },
    { key: 'stomach', pts: [[0.52, 11.58, -0.1], [0.72, 11.42, 0.0], [0.78, 11.05, 0.1], [0.64, 10.76, 0.2], [0.38, 10.64, 0.26], [0.1, 10.66, 0.26]] },
    { key: 'small', pts: [...DUO.slice(1), ...ILEUM.slice(1)] },
    { key: 'large', pts: COLON },
    { key: 'anus', pts: ANAL.slice(1) },
  ]
  const pts: V3[] = [], starts: { key: string; i: number }[] = []
  for (const s of segs) { starts.push({ key: s.key, i: pts.length }); pts.push(...s.pts) }
  const curve = curveOf(pts, 0.4), N = 1600, table = curve.getSpacedPoints(N)
  const sOf = (i: number) => { const p = new THREE.Vector3(...pts[i]); let bi = 0, bd = 1e9; table.forEach((q, j) => { const d = q.distanceToSquared(p); if (d < bd) { bd = d; bi = j } }); return bi / N }
  const marks: Record<string, number> = {}
  for (const s of starts) marks[s.key] = sOf(s.i)
  return { curve, table, N, marks }
})()
/** 路上 s 处的位置 */
export function tractAt(s: number, out = new THREE.Vector3()) {
  const { table, N } = TRACT_PATH, x = Math.min(1, Math.max(0, s)) * N, a = Math.floor(x), f = x - a, p0 = table[a], p1 = table[Math.min(N, a + 1)]
  return out.set(p0.x + (p1.x - p0.x) * f, p0.y + (p1.y - p0.y) * f, p0.z + (p1.z - p0.z) * f)
}

// ---------- 画出来 ----------
/** 幽灵壳：边缘亮、中间透，叠加着画 */
function ghostMat(color: string, base: number, rim: number, pow = 2.4) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uBase: { value: base }, uRim: { value: rim }, uPow: { value: pow }, uFade: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uBase; uniform float uRim; uniform float uPow; uniform float uFade; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), uPow); gl_FragColor = vec4(uColor * (uBase + uRim * f) * uFade, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
}

export type OrganKey = 'mouth' | 'pharynx' | 'esophagus' | 'stomach' | 'small' | 'large' | 'anus' | 'saliva' | 'liver' | 'pancreas' | 'gastric' | 'intestinal'
/** hl：亮起来的器官；dim：没亮的器官变淡（0–1，1 不变淡）；shell：身体外壳的亮度 */
/** head：头颈剖面显示多少（0–1，看头颈部时为 1） */
export interface BodyLook { hl?: OrganKey[]; dim?: number; shell?: number; head?: number }

export function Body({ look }: { look: BodyLook }) {
  const G = useJob('body', bodyGen, prioOf('body'))
  const T = tubeGeo()
  const shellM = useMemo(() => ghostMat('#9fd4ff', 0.025, 0.5), [])
  const mats = useMemo(() => ({
    liver: wetMat({ vertexColors: true, sheen: '#ff9a80', coat: 0.9, rough: 0.38, bump: 0.6 }),
    gall: wetMat({ vertexColors: true, sheen: '#d8ff9a', coat: 1, rough: 0.3 }),
    stomach: wetMat({ vertexColors: true, bump: 0.8 }),
    pancreas: wetMat({ vertexColors: true, sheen: '#ffe0b0', coat: 0.6, rough: 0.55, bump: 1.2 }),
    eso: wetMat({ vertexColors: true, bump: 1 }),
    small: wetMat({ vertexColors: true, bump: 0.9 }),
    large: wetMat({ vertexColors: true, bump: 1.1, rough: 0.5 }),
    anus: wetMat({ vertexColors: true }),
    bile: wetMat({ vertexColors: true, coat: 1 }),
  }), [])
  /** 每个器官用哪几块材质（亮起来、变淡都按它） */
  const owner: Record<OrganKey, THREE.MeshPhysicalMaterial[]> = useMemo(() => ({
    mouth: [], pharynx: [], esophagus: [mats.eso], stomach: [mats.stomach], small: [mats.small], large: [mats.large], anus: [mats.anus],
    saliva: [], liver: [mats.liver, mats.gall, mats.bile], pancreas: [mats.pancreas], gastric: [mats.stomach], intestinal: [mats.small],
  }), [mats])
  const all = useMemo(() => Object.values(mats), [mats])
  const cur = useRef(new Map<THREE.Material, { glow: number; op: number }>())
  useFrame(({ clock }, dt0) => {
    const dt = Math.min(dt0, 1 / 30), k = 1 - Math.exp(-dt / 0.25), hl = new Set<THREE.Material>()
    for (const o of look.hl ?? []) for (const m of owner[o]) hl.add(m)
    const pulse = 0.55 + 0.45 * Math.sin(clock.elapsedTime * 3.2)
    for (const m of all) {
      const c = cur.current.get(m) ?? { glow: 0, op: 1 }
      const on = hl.has(m), wantOp = hl.size && !on ? look.dim ?? 1 : 1
      c.glow += ((on ? 1 : 0) - c.glow) * k; c.op += (wantOp - c.op) * k
      cur.current.set(m, c)
      m.emissive.set('#ffd2a8'); m.emissiveIntensity = c.glow * (0.07 + 0.11 * pulse)
      const tr = c.op < 0.98
      if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true }
      m.opacity = c.op; m.depthWrite = c.op > 0.6
    }
    shellM.uniforms.uFade.value += ((look.shell ?? 1) - shellM.uniforms.uFade.value) * k
  })
  return (
    <group>
      {G && <mesh geometry={G.shell} material={shellM} renderOrder={8} />}
      {G && <>
        <mesh geometry={G.liver} material={mats.liver} castShadow />
        <mesh geometry={G.gall} material={mats.gall} />
        <mesh geometry={G.stomach} material={mats.stomach} castShadow />
        <mesh geometry={G.pancreas} material={mats.pancreas} />
      </>}
      <mesh geometry={T.eso} material={mats.eso} />
      <HeadSection on={look.head ?? 0} hl={look.hl?.includes('mouth') ? 1 : look.hl?.includes('pharynx') ? 2 : look.hl?.includes('esophagus') ? 3 : 0} glands={!!look.hl?.includes('saliva')} />
      <mesh geometry={T.duo} material={mats.small} />
      <mesh geometry={T.ileum} material={mats.small} castShadow />
      <mesh geometry={T.colon} material={mats.large} castShadow />
      <mesh geometry={T.appendix} material={mats.large} />
      <mesh geometry={T.anal} material={mats.anus} />
      <mesh geometry={T.bile} material={mats.bile} />
    </group>
  )
}

/** 一口馒头：沿着消化道走，s 是走到哪了（0–1）；size 随着被嚼碎、消化变小。外面一圈淡淡的光，全身的画面里也找得到 */
export function Bolus({ s, size, color }: { s: number; size: number; color: string }) {
  const g = useRef<THREE.Group>(null)
  const geo = useMemo(() => {
    const s0 = new THREE.SphereGeometry(1, 40, 28), p = s0.attributes.position
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.18 * fbm(x * 2 + 5, y * 2, z * 2, 3); p.setXYZ(i, x * k, y * k * 0.85, z * k) }
    s0.computeVertexNormals(); return s0
  }, [])
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => { if (!g.current) return; tractAt(s, v); g.current.position.copy(v); g.current.rotation.set(clock.elapsedTime * 0.6, clock.elapsedTime * 0.4, 0); g.current.visible = s > 0.001 && s < 0.999 })
  return <group ref={g}>
    <mesh geometry={geo} scale={size}><meshPhysicalMaterial color={color} roughness={0.55} clearcoat={0.5} sheen={0.6} sheenColor="#ffffff" /></mesh>
    <mesh scale={size * 1.7} renderOrder={9}><sphereGeometry args={[1, 24, 16]} /><meshBasicMaterial color="#ffd48a" transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
  </group>
}
