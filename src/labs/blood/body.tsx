// 展厅正中那个半透明的人：身体轮廓、两肺和气管、主要的动脉和静脉、各处的毛细血管网，以及沿着血管走的红细胞。
// 坐标是世界的：1 个单位 = 10 cm，脚底在 y = 0，人面朝 +z（朝镜头），x 正方向是他的左手边（画面右边）。
// 心脏的模型按 1 cm 一个单位做（heart.tsx），放进身体时缩小 10 倍，摆在 HEART_AT。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { BLUE, RED, rbcGeo, stubEnd } from './heart'
import { curveOf, ellipsoid, fbm, roundCone, sminAll, surfaceNets, type V3 } from './sdf'
import type { OrganKey } from './physics'

export const HEART_AT: V3 = [0.15, 12.35, 0.2]
export const HEART_S = 0.1
/** 心脏里的一点（cm，心脏自己的坐标）在世界里的位置 */
export const H = (p: V3): V3 => [HEART_AT[0] + p[0] * HEART_S, HEART_AT[1] + p[1] * HEART_S, HEART_AT[2] + p[2] * HEART_S]

// ---------- 身体轮廓 ----------
function bodySdf(x: number, y: number, z: number) {
  const ax = Math.abs(x)
  const d = sminAll([
    ellipsoid(x, y, z, [0, 16.5, 0.05], [0.74, 0.98, 0.9]),
    roundCone(x, y, z, [0, 15.0, -0.05], [0, 15.9, 0], 0.5, 0.44),
    ellipsoid(x, y, z, [0, 13.35, -0.05], [1.62, 1.75, 1.0]),
    ellipsoid(x, y, z, [0, 11.1, 0.02], [1.3, 1.55, 0.86]),
    ellipsoid(x, y, z, [0, 9.55, 0], [1.55, 1.05, 0.92]),
    roundCone(ax, y, z, [0.2, 14.45, -0.1], [1.72, 14.38, -0.08], 0.5, 0.48),
    roundCone(ax, y, z, [1.95, 14.3, -0.05], [2.62, 11.4, 0.02], 0.44, 0.35),
    roundCone(ax, y, z, [2.62, 11.4, 0.02], [3.15, 9.0, 0.22], 0.33, 0.24),
    ellipsoid(ax, y, z, [3.33, 8.25, 0.3], [0.2, 0.55, 0.36], 0.12),
    roundCone(ax, y, z, [0.85, 9.15, 0], [0.96, 5.1, 0.05], 0.7, 0.47),
    roundCone(ax, y, z, [0.96, 5.1, 0.05], [1.02, 0.9, -0.08], 0.45, 0.27),
    ellipsoid(ax, y, z, [1.0, 3.65, -0.16], [0.44, 1.25, 0.47]),
    ellipsoid(ax, y, z, [1.03, 0.33, 0.42], [0.34, 0.3, 1.02]),
  ], 0.32)
  return d + 0.012 * fbm(x * 2, y * 2, z * 2, 2)
}
/** 两叶肺：右肺（画面左）三叶、左肺两叶，这里只画外形；左肺内侧凹进去一块给心脏让地方 */
function lungSdf(x: number, y: number, z: number) {
  const s = x < 0 ? -1 : 1, ax = Math.abs(x)
  let d = ellipsoid(ax, y, z, [1.12, 13.05, -0.12], [0.82, 1.6, 0.85])
  d = Math.max(d, -(ellipsoid(ax, y, z, [0.0, 12.9, 0.1], [0.55, 2.4, 1.2])))   // 纵隔
  d = Math.max(d, 11.45 + 0.35 * ax * ax * 0.4 - y)                               // 下面平一点（膈）
  if (s > 0) d = Math.max(d, -ellipsoid(x, y, z, [0.35, 12.25, 0.35], [0.62, 0.62, 0.6]))
  return d + 0.02 * fbm(x * 3, y * 3, z * 3, 2)
}

/** 幽灵壳：边缘亮、中间透，叠加着画，看得见里面 */
function ghostMat(color: string, base: number, rim: number, pow = 2.4) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uBase: { value: base }, uRim: { value: rim }, uPow: { value: pow }, uFade: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uBase; uniform float uRim; uniform float uPow; uniform float uFade; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), uPow); gl_FragColor = vec4(uColor * (uBase + uRim * f) * uFade * uFade, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
}

// ---------- 血管 ----------
const L = 1, R_ = -1
/** 下肢的动脉、静脉（s = 1 左腿，−1 右腿） */
const legA = (s: number): V3[] => [[0.2 + s * 0.35, 9.45, -0.3], [s * 0.85, 8.6, 0.02], [s * 0.95, 6.6, 0.12], [s * 1.0, 5.2, 0.0], [s * 1.02, 3.5, -0.12], [s * 1.04, 1.6, -0.06], [s * 1.05, 0.8, 0.1]]
const legV = (s: number): V3[] => [[s * 1.0, 0.8, -0.16], [s * 0.97, 1.7, -0.22], [s * 0.95, 3.5, -0.26], [s * 0.88, 5.2, -0.1], [s * 0.8, 6.6, 0.0], [s * 0.68, 8.6, -0.12], [-0.1 + s * 0.4, 9.45, -0.36]]
const armA = (s: number): V3[] => [[s * 1.75, 14.15, 0.05], [s * 2.3, 13.0, 0.12], [s * 2.62, 11.4, 0.16], [s * 2.92, 10.1, 0.3], [s * 3.18, 9.0, 0.38]]
const armV = (s: number): V3[] => [[s * 3.24, 8.95, 0.16], [s * 2.95, 10.1, 0.1], [s * 2.6, 11.4, -0.02], [s * 2.25, 13.0, -0.08], [s * 1.7, 14.05, -0.08]]
const DESC: V3[] = [H(stubEnd('aorta')), [0.48, 11.6, -0.48], [0.32, 10.8, -0.52], [0.2, 9.95, -0.46]]
const IVC: V3[] = [[-0.1, 9.95, -0.44], [-0.14, 10.8, -0.44], [-0.16, 11.5, -0.3], H(stubEnd('ivc'))]
const SVC_TOP = H(stubEnd('svc'))
/** 各处毛细血管网的中心和大小 */
export const BEDS = {
  legL: { c: [1.05, 0.42, 0.36] as V3, r: 0.32 }, legR: { c: [-1.05, 0.42, 0.36] as V3, r: 0.32 },
  head: { c: [0, 16.55, 0.3] as V3, r: 0.45 },
  armL: { c: [3.36, 8.3, 0.34] as V3, r: 0.26 }, armR: { c: [-3.36, 8.3, 0.34] as V3, r: 0.26 },
  gut: { c: [0.0, 10.35, 0.38] as V3, r: 0.5 },
  lungL: { c: [1.15, 13.1, -0.1] as V3, r: 0.62 }, lungR: { c: [-1.15, 13.1, -0.1] as V3, r: 0.62 },
}
type BedKey = keyof typeof BEDS
/** 一条路上的一段：几个点、哪种血、粗细、名字（提示语里说“到了哪一站”） */
interface Seg { pts: V3[]; blood: 'a' | 'v' | 'cap'; r: number; name: string; tube?: boolean; bed?: BedKey; lung?: boolean }
const seg = (name: string, blood: Seg['blood'], r: number, pts: V3[], tube = true): Seg => ({ name, blood, r, pts, tube })
const bed = (k: BedKey, name: string, lung = false): Seg => ({ name, blood: 'cap', r: 0.014, pts: [BEDS[k].c], bed: k, lung, tube: false })

// 心脏里那一段（只走路，不画管子：心脏自己画）
const inLV: V3[] = ([[2.0, -2.2, -0.2], [0.85, -1.0, -0.2], [0.66, 1.4, -0.2], [0.72, 3.6, -0.1], [1.2, 5.6, -0.5]] as V3[]).map(H)
const archToDesc: V3[] = ([[2.0, 6.2, -1.2], [3.0, 5.9, -2.1], [3.4, 4.5, -2.6]] as V3[]).map(H)
const inRV: V3[] = ([[-2.0, -1.8, 0.0], [-1.4, -0.4, 0.1], [-0.78, 1.4, 0.2], [-0.62, 3.0, 0.4], [-0.3, 4.0, 0.05]] as V3[]).map(H)
const toRA = (from: 'svc' | 'ivc'): V3[] => (from === 'svc' ? [[-3.1, 5.0, -0.15], [-3.1, 3.2, -0.12], [-3.1, 1.9, -0.1]] : [[-3.3, -2.0, -1.5], [-3.25, -0.4, -1.25], [-3.1, 1.6, -0.2]]).map(p => H(p as V3))
const toLA = (side: 'l' | 'r'): V3[] => (side === 'l' ? [[5.0, 2.7, -0.7], [4.3, 2.55, -0.58], [2.85, 2.2, -0.4]] : [[0.2, 2.5, -2.4], [1.45, 2.35, -1.72], [2.85, 2.2, -0.4]]).map(p => H(p as V3))

/** 体循环去四处、肺循环去两肺的路：每条都是从心室出发、回到心房 */
export const ROUTES: Record<OrganKey | 'lungL' | 'lungR', Seg[]> = {
  leg: [seg('左心室', 'a', 0, inLV, false), seg('主动脉', 'a', 0, archToDesc, false), seg('主动脉', 'a', 0.075, DESC), seg('下肢的动脉', 'a', 0.05, legA(L)), bed('legL', '下肢的毛细血管'), seg('下肢的静脉', 'v', 0.058, legV(L)), seg('下腔静脉', 'v', 0.085, IVC), seg('右心房', 'v', 0, toRA('ivc'), false)],
  gut: [seg('左心室', 'a', 0, inLV, false), seg('主动脉', 'a', 0, archToDesc, false), seg('主动脉', 'a', 0.075, DESC.slice(0, 3)), seg('腹部的动脉', 'a', 0.04, [[0.32, 10.8, -0.52], [0.3, 10.65, -0.05], [0.2, 10.45, 0.2]]), bed('gut', '腹部器官的毛细血管'), seg('腹部的静脉', 'v', 0.045, [[-0.2, 10.5, 0.2], [-0.25, 10.65, -0.05], [-0.14, 10.85, -0.44]]), seg('下腔静脉', 'v', 0.085, IVC.slice(1)), seg('右心房', 'v', 0, toRA('ivc'), false)],
  head: [seg('左心室', 'a', 0, inLV.slice(0, 4), false), seg('主动脉', 'a', 0, [[1.8, 6.05, -1.0], [1.8, 7.5, -1.0]].map(p => H(p as V3)), false), seg('颈部的动脉', 'a', 0.04, [H([1.8, 7.5, -1.0]), [0.36, 14.1, 0.16], [0.38, 15.0, 0.22], [0.3, 15.9, 0.2]]), bed('head', '头部的毛细血管'), seg('颈部的静脉', 'v', 0.05, [[-0.3, 15.9, 0.06], [-0.45, 15.0, 0.0], [-0.42, 14.1, 0.0], SVC_TOP]), seg('上腔静脉', 'v', 0, toRA('svc').slice(0, 2), false), seg('右心房', 'v', 0, toRA('svc').slice(2), false)],
  arm: [seg('左心室', 'a', 0, inLV.slice(0, 4), false), seg('主动脉', 'a', 0, [[2.45, 6.05, -1.5], [2.9, 7.4, -1.6]].map(p => H(p as V3)), false), seg('上肢的动脉', 'a', 0.04, [H([2.9, 7.4, -1.6]), [1.0, 13.9, 0.0], ...armA(L)]), bed('armL', '上肢的毛细血管'), seg('上肢的静脉', 'v', 0.045, [...armV(L), [0.9, 13.8, 0.05], SVC_TOP]), seg('上腔静脉', 'v', 0, toRA('svc').slice(0, 2), false), seg('右心房', 'v', 0, toRA('svc').slice(2), false)],
  lungL: [seg('右心室', 'v', 0, inRV, false), seg('肺动脉', 'v', 0, [[0.9, 4.35, -0.9], [2.4, 4.3, -1.4]].map(p => H(p as V3)), false), seg('肺动脉', 'v', 0.045, [H([2.4, 4.3, -1.4]), [0.75, 12.9, 0.0], [0.95, 13.05, -0.05]]), bed('lungL', '肺部的毛细血管', true), seg('肺静脉', 'a', 0.045, [[0.95, 12.75, 0.05], [0.8, 12.66, 0.1], H(stubEnd('pv1'))]), seg('左心房', 'a', 0, toLA('l'), false)],
  lungR: [seg('右心室', 'v', 0, inRV, false), seg('肺动脉', 'v', 0, [[-1.6, 4.3, -1.0], [-3.0, 4.1, -1.5]].map(p => H(p as V3)), false), seg('肺动脉', 'v', 0.045, [H([-3.0, 4.1, -1.5]), [-0.6, 12.9, -0.05], [-0.95, 13.05, -0.1]]), bed('lungR', '肺部的毛细血管', true), seg('肺静脉', 'a', 0.045, [[-0.95, 12.72, -0.12], [-0.4, 12.62, -0.1], H(stubEnd('pv3'))]), seg('左心房', 'a', 0, toLA('r'), false)],
}
/** 画管子用的另外几根（右侧的上下肢，路上没走到的） */
const EXTRA: Seg[] = [
  seg('', 'a', 0.05, legA(R_)), seg('', 'v', 0.058, legV(R_)),
  seg('', 'a', 0.04, [H([0.6, 7.3, -0.4]), [-0.4, 13.6, 0.1], [-1.0, 13.9, 0.0], ...armA(R_)]), seg('', 'v', 0.045, [...armV(R_), [-0.9, 13.8, 0.05], SVC_TOP]),
  seg('', 'a', 0.035, [H([0.6, 7.3, -0.4]), [-0.3, 14.1, 0.14], [-0.35, 15.0, 0.2], [-0.28, 15.9, 0.18]]), seg('', 'v', 0.045, [[0.3, 15.9, 0.04], [0.45, 15.0, 0.0], [0.42, 14.1, 0.0], SVC_TOP]),
  seg('', 'v', 0.045, [H(stubEnd('pv2')), [0.85, 12.55, 0.05], [1.05, 12.7, -0.15]]), seg('', 'v', 0.045, [H(stubEnd('pv4')), [-0.45, 12.52, -0.15], [-1.0, 12.62, -0.2]]),
]
EXTRA[6].blood = 'a'; EXTRA[7].blood = 'a'

/** 一条路：连成一条曲线，记下每一段从哪儿开始、毛细血管在哪儿 */
export interface Route { curve: THREE.CatmullRomCurve3; len: number; table: THREE.Vector3[]; marks: { s: number; name: string }[]; cap: [number, number]; lung: boolean; toward: 'a' | 'v' }
function bedWalk(k: BedKey, a: V3, b: V3): V3[] {
  const { c, r } = BEDS[k]
  return [[a[0] + (c[0] - a[0]) * 0.55, a[1] + (c[1] - a[1]) * 0.55 + r * 0.25, a[2] + (c[2] - a[2]) * 0.55], [c[0] + r * 0.2, c[1], c[2] + r * 0.2], [b[0] + (c[0] - b[0]) * 0.55, b[1] + (c[1] - b[1]) * 0.55 - r * 0.25, b[2] + (c[2] - b[2]) * 0.55]]
}
export function makeRoute(segs: Seg[]): Route {
  const pts: V3[] = [], starts: { i: number; name: string }[] = []
  let capA = 0, capB = 0
  segs.forEach((s, k) => {
    if (s.bed) { const a = pts[pts.length - 1], b = segs[k + 1].pts[0]; capA = pts.length; starts.push({ i: pts.length, name: s.name }); pts.push(...bedWalk(s.bed, a, b)); capB = pts.length; return }
    starts.push({ i: pts.length, name: s.name }); pts.push(...s.pts)
  })
  const clean = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]) > 1e-3)
  const curve = curveOf(clean, 0.3), len = curve.getLength(), N = 900, table = curve.getSpacedPoints(N)
  // 每个原始点在曲线上的位置（按弧长）
  const sOf = (i: number) => { const p = new THREE.Vector3(...pts[Math.min(i, pts.length - 1)]); let bi = 0, bd = 1e9; table.forEach((q, j) => { const d = q.distanceToSquared(p); if (d < bd) { bd = d; bi = j } }); return bi / N }
  const lung = segs.some(s => s.lung)
  return { curve, len, table, marks: starts.map(m => ({ s: sOf(m.i), name: m.name })), cap: [sOf(capA - 1) + 0.002, sOf(capB)], lung, toward: lung ? 'a' : 'v' }
}
let ROUTE_CACHE: Record<string, Route> | null = null
export const routes = () => (ROUTE_CACHE ??= Object.fromEntries(Object.entries(ROUTES).map(([k, v]) => [k, makeRoute(v)])) as Record<keyof typeof ROUTES, Route>)
/** 这条路上 s 处血里的氧：1 动脉血，0 静脉血，毛细血管里慢慢变 */
export function oxyAt(r: Route, s: number) {
  const k = Math.min(1, Math.max(0, (s - r.cap[0]) / Math.max(1e-4, r.cap[1] - r.cap[0])))
  return r.lung ? k : 1 - k
}
/** 这条路上 s 处是哪一站 */
export const stationAt = (r: Route, s: number) => { let n = r.marks[0].name; for (const m of r.marks) if (s >= m.s) n = m.name; return n }
const cRed = new THREE.Color(RED), cBlue = new THREE.Color(BLUE)
export const oxyColor = (o: number, out = new THREE.Color()) => out.copy(cBlue).lerp(cRed, o)

/**
 * 一片毛细血管网：动脉的末端一级级分叉（每级分两枝，越分越细、颜色越淡），静脉那一头也是一棵这样的树；
 * 两棵树最细的枝梢一对一用更细的毛细血管连起来，颜色在这一段里从动脉血变成静脉血（肺里反过来）。合成一个模型
 */
function bedGeo(k: BedKey, a: V3, b: V3, lung: boolean) {
  const { c, r } = BEDS[k]
  let sd = Math.round(Math.abs(c[0] * 100 + c[1] * 37)) + 911; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  const parts: THREE.BufferGeometry[] = [], up = new THREE.Vector3(0, 1, 0)
  const cIn = oxyColor(lung ? 0 : 1), cOut = oxyColor(lung ? 1 : 0), bg = new THREE.Color('#1a1e26')
  /** 一段直的小管，两头粗细不同，带颜色 */
  const piece = (p: THREE.Vector3, q: THREE.Vector3, r0: number, r1: number, c0: THREE.Color, c1: THREE.Color) => {
    const d = q.clone().sub(p), len = d.length(); if (len < 1e-4) return
    const g = new THREE.CylinderGeometry(r1, r0, len, 6, 1, true)
    const n = g.attributes.position.count, col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { const t = g.attributes.position.getY(i) / len + 0.5, cc = c0.clone().lerp(c1, t); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize())); g.translate((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2)
    parts.push(g)
  }
  const C = new THREE.Vector3(...c)
  /** 从 root 朝 C 长出一棵分叉的树，返回最细的枝梢 */
  const grow = (root: V3, col: THREE.Color) => {
    const tips: THREE.Vector3[] = [], R0 = lung ? 0.03 : 0.022, L0 = Math.min(new THREE.Vector3(...root).distanceTo(C) * 0.6, r * (lung ? 1.0 : 0.9))
    const go = (p: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, lv: number) => {
      // 往中心那边偏一点，枝不会长出这一片
      const toC = C.clone().sub(p), pull = toC.length() > r * 0.9 ? 0.45 : 0.05
      const d = dir.clone().lerp(toC.normalize(), pull).normalize()
      const q = p.clone().addScaledVector(d, len)
      const fade = (l: number) => col.clone().lerp(bg, Math.min(0.5, l * 0.12))
      piece(p, q, rad, rad * 0.78, fade(lv), fade(lv + 1))
      if (lv >= (lung ? 5 : 4)) { tips.push(q); return }
      // 分两枝：绕一根随机的垂直轴各转开一个角度
      const ax = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).cross(d).normalize(), ang = 0.45 + rnd() * 0.25
      for (const s of [-1, 1]) go(q, d.clone().applyAxisAngle(ax, s * ang), len * (0.66 + rnd() * 0.1), rad * 0.72, lv + 1)
    }
    go(new THREE.Vector3(...root), C.clone().sub(new THREE.Vector3(...root)).normalize(), L0, R0, 0)
    return tips
  }
  const ta = grow(a, cIn), tv = grow(b, cOut)
  // 枝梢一对一连起来：每个动脉的枝梢找还没用过的、最近的静脉枝梢
  const used = new Set<number>()
  for (const p of ta) {
    let bi = -1, bd = 1e9; tv.forEach((q, i) => { if (used.has(i)) return; const d = p.distanceTo(q); if (d < bd) { bd = d; bi = i } })
    if (bi < 0) break; used.add(bi)
    const q = tv[bi], m = p.clone().lerp(q, 0.5).add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(r * 0.15))
    const fa = cIn.clone().lerp(bg, 0.5), fv = cOut.clone().lerp(bg, 0.5), mid = fa.clone().lerp(fv, 0.5)
    piece(p, m, 0.0045, 0.0045, fa, mid); piece(m, q, 0.0045, 0.0045, mid, fv)
  }
  return [mergeGeometries(parts)]
}

let GEO: ReturnType<typeof buildBody> | null = null
function buildBody() {
  const body = surfaceNets(bodySdf, [[-4, -0.1, -1.4], [4, 17.7, 1.9]], 0.11)
  const lungs = surfaceNets(lungSdf, [[-2.2, 11.2, -1.2], [2.2, 14.9, 1.0]], 0.075)
  // 气管和两根支气管
  const trachea = [new THREE.TubeGeometry(curveOf([[0, 15.6, -0.2], [0, 14.6, -0.24], [0, 13.95, -0.3]]), 16, 0.11, 12), ...[-1, 1].map(s => new THREE.TubeGeometry(curveOf([[0, 13.95, -0.3], [s * 0.35, 13.7, -0.3], [s * 0.75, 13.45, -0.25]]), 12, 0.075, 10))]
  const tubes: { geo: THREE.BufferGeometry; blood: 'a' | 'v' }[] = []
  const beds: THREE.BufferGeometry[] = []
  const add = (s: Seg) => { if (s.tube && s.r > 0 && s.blood !== 'cap') tubes.push({ geo: new THREE.TubeGeometry(curveOf(s.pts, 0.3), Math.max(12, s.pts.length * 10), s.r, 10), blood: s.blood }) }
  for (const segs of Object.values(ROUTES)) segs.forEach((s, k) => { add(s); if (s.bed) beds.push(...bedGeo(s.bed, segs[k - 1].pts.at(-1)!, segs[k + 1].pts[0], !!s.lung)) })
  EXTRA.forEach(add)
  // 右侧上下肢、另一侧的头和肺也画一片毛细血管网
  beds.push(...bedGeo('legR', legA(R_).at(-1)!, legV(R_)[0], false), ...bedGeo('armR', armA(R_).at(-1)!, armV(R_)[0], false))
  return { body, lungs, trachea, tubes, beds }
}
export const bodyGeo = () => (GEO ??= buildBody())

// ---------- 画出来 ----------
export interface BodyLook { shell: number; lungs: number; tree: number }
export function Body({ look }: { look: BodyLook }) {
  const G = bodyGeo()
  const shell = useMemo(() => ghostMat('#8fd3ff', 0.03, 0.55), [])
  const lungM = useMemo(() => ghostMat('#ff9aa8', 0.08, 0.7, 1.8), [])
  const mats = useMemo(() => ({
    a: new THREE.MeshPhysicalMaterial({ color: '#c62a35', roughness: 0.35, clearcoat: 0.6, transparent: true }),
    v: new THREE.MeshPhysicalMaterial({ color: '#3a58a8', roughness: 0.35, clearcoat: 0.6, transparent: true }),
    bed: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, transparent: true, emissive: '#2a0a10', emissiveIntensity: 0.4 }),
    tr: new THREE.MeshStandardMaterial({ color: '#d8d0c8', roughness: 0.6, transparent: true, opacity: 0.5, depthWrite: false }),
  }), [])
  const cur = useRef({ ...look })
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 1 / 30) / 0.35), c = cur.current
    c.shell += (look.shell - c.shell) * k; c.lungs += (look.lungs - c.lungs) * k; c.tree += (look.tree - c.tree) * k
    shell.uniforms.uFade.value = c.shell; lungM.uniforms.uFade.value = c.lungs
    for (const m of [mats.a, mats.v, mats.bed]) { m.opacity = c.tree; m.depthWrite = c.tree > 0.6; m.visible = c.tree > 0.02 }
    mats.tr.opacity = 0.5 * c.lungs; mats.tr.visible = c.lungs > 0.02
  })
  return (
    <group>
      <mesh geometry={G.body} material={shell} renderOrder={5} />
      <mesh geometry={G.lungs} material={lungM} renderOrder={4} />
      {G.trachea.map((g, i) => <mesh key={i} geometry={g} material={mats.tr} />)}
      {G.tubes.map((t, i) => <mesh key={i} geometry={t.geo} material={t.blood === 'a' ? mats.a : mats.v} />)}
      {G.beds.map((g, i) => <mesh key={i} geometry={g} material={mats.bed} />)}
    </group>
  )
}

// ---------- 沿着血管走的红细胞 ----------
/** 全身的血一起流：每条路上一串红细胞，颜色在毛细血管里慢慢变。which：只流哪几条路；speed：每秒走多少单位 */
export function Stream({ which, n = 90, size = 0.075, speed = 2.2, opacity = 1 }: { which: (keyof typeof ROUTES)[]; n?: number; size?: number; speed?: number; opacity?: number }) {
  const R = routes()
  const list = useMemo(() => which.map(k => R[k]), [which, R])
  const mesh = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => rbcGeo(size), [size])
  const st = useMemo(() => {
    let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    return list.map(r => ({ r, s: Array.from({ length: n }, (_, i) => (i + rnd() * 0.6) / n), j: Array.from({ length: n }, () => [(rnd() - 0.5), (rnd() - 0.5), (rnd() - 0.5)] as V3), e: Array.from({ length: n }, () => [rnd() * 6, rnd() * 6] as [number, number]) }))
  }, [list, n])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), sc: new THREE.Vector3(), c: new THREE.Color() }), [])
  useEffect(() => { if (mesh.current) mesh.current.count = list.length * n }, [list, n])
  useFrame((s, dt0) => {
    const dt = Math.min(dt0, 1 / 30), t = s.clock.elapsedTime, m = mesh.current; if (!m) return
    const pulse = 0.65 + 0.7 * Math.max(0, Math.sin(t * Math.PI * 2 / 0.8)) ** 3    // 动脉里一冲一冲
    let i = 0
    for (const { r, s: ss, j, e } of st) for (let k = 0; k < n; k++) {
      const s0 = ss[k], inCap = s0 > r.cap[0] && s0 < r.cap[1], art = (s0 < r.cap[0]) !== r.lung
      ss[k] = (s0 + dt * speed * (inCap ? 0.35 : art ? pulse : 0.8) / r.len) % 1
      const x = ss[k] * 900, a = Math.floor(x), f = x - a, p0 = r.table[a], p1 = r.table[Math.min(900, a + 1)]
      const spread = inCap ? 0.02 : 0.025
      tmp.v.set(p0.x + (p1.x - p0.x) * f + j[k][0] * spread, p0.y + (p1.y - p0.y) * f + j[k][1] * spread, p0.z + (p1.z - p0.z) * f + j[k][2] * spread)
      tmp.q.setFromEuler(tmp.e.set(e[k][0] + t * 0.7, e[k][1], 0))
      m.setMatrixAt(i, tmp.m.compose(tmp.v, tmp.q, tmp.sc.setScalar(opacity)))
      m.setColorAt(i, oxyColor(oxyAt(r, ss[k]), tmp.c))
      i++
    }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[geo, undefined, Math.max(1, list.length * n)]} frustumCulled={false}><meshStandardMaterial roughness={0.4} emissive="#300808" emissiveIntensity={0.5} /></instancedMesh>
}

/** 一团血：一小簇红细胞沿着一条路走，走过的路留下一条发光的轨迹。s 是这团血走到哪了（0–1），由课里给 */
export function Bolus({ route, s, trail = true, size = 0.1 }: { route: keyof typeof ROUTES; s: number; trail?: boolean; size?: number }) {
  const r = routes()[route]
  const N = 34
  const mesh = useRef<THREE.InstancedMesh>(null), halo = useRef<THREE.Mesh>(null)
  const geo = useMemo(() => rbcGeo(size), [size])
  const off = useMemo(() => { let sd = 77; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; return Array.from({ length: N }, () => [(rnd() - 0.5) * size * 0.8, (rnd() - 0.5) * size * 0.8, (rnd() - 0.5) * size * 0.8, rnd() * 0.012, rnd() * 6] as number[]) }, [size])
  // 轨迹：整条路做成一根细管，只画走过的那一截；颜色按血里的氧
  const trailGeo = useMemo(() => {
    const g = new THREE.TubeGeometry(r.curve, 900, size * 0.25, 6), n = g.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color()
    for (let v = 0; v < n; v++) { oxyColor(oxyAt(r, Math.floor(v / 7) / 900), col); c[v * 3] = col.r; c[v * 3 + 1] = col.g; c[v * 3 + 2] = col.b }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g
  }, [r, size])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), sc: new THREE.Vector3(1, 1, 1), c: new THREE.Color() }), [])
  useFrame(st => {
    const m = mesh.current; if (!m) return
    for (let i = 0; i < N; i++) {
      const o = off[i], ss = Math.min(1, Math.max(0, s - o[3])), x = ss * 900, a = Math.floor(x), f = x - a, p0 = r.table[a], p1 = r.table[Math.min(900, a + 1)]
      tmp.v.set(p0.x + (p1.x - p0.x) * f + o[0], p0.y + (p1.y - p0.y) * f + o[1], p0.z + (p1.z - p0.z) * f + o[2])
      tmp.q.setFromEuler(tmp.e.set(o[4] + st.clock.elapsedTime, o[4] * 0.5, 0))
      m.setMatrixAt(i, tmp.m.compose(tmp.v, tmp.q, tmp.sc.setScalar(s > 0 && s < 1 ? 1 : 0.0001)))
      m.setColorAt(i, oxyColor(oxyAt(r, ss), tmp.c))
    }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
    // 一团血外面一圈淡淡的光：在全身的大画面里也找得到它
    const h = halo.current
    if (h) { const x = Math.min(1, Math.max(0, s)) * 900, a = Math.floor(x), p0 = r.table[a]; h.position.copy(p0); h.visible = s > 0 && s < 1; (h.material as THREE.MeshBasicMaterial).color.copy(oxyColor(oxyAt(r, s), tmp.c)).multiplyScalar(0.55) }
  })
  return <group>
    <instancedMesh ref={mesh} args={[geo, undefined, N]} frustumCulled={false}><meshStandardMaterial roughness={0.35} emissive="#ffffff" emissiveIntensity={0.08} /></instancedMesh>
    <mesh ref={halo} renderOrder={7}><sphereGeometry args={[size * 2.2, 24, 16]} /><meshBasicMaterial transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
    {trail && s > 0 && <mesh geometry={trailGeo} renderOrder={6}><meshBasicMaterial vertexColors transparent opacity={0.85} toneMapped={false} depthTest={false} /></mesh>}
    {trail && <TrailRange g={trailGeo} s={s} />}
  </group>
}
/** 轨迹只画到 s 处 */
function TrailRange({ g, s }: { g: THREE.BufferGeometry; s: number }) {
  useEffect(() => { const total = g.index ? g.index.count : g.attributes.position.count; g.setDrawRange(0, Math.floor(total * Math.min(1, s) / 6) * 6) }, [g, s])
  return null
}
