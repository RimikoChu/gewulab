// 心脏：一整块心肌（四个腔、中间的隔、腔里的肉柱和乳头肌）、表面的冠状血管和脂肪、连着的大血管、两种瓣膜和腱索，
// 剖开时的剖面，跳动时的收缩，以及腔里流着的红细胞。坐标是心脏自己的：1 个单位 = 1 cm；x 指向身体的左侧（画面右边），y 向上，z 向前（朝镜头）。
// 剖面按教材的四腔示意图摆：z = 0 这个平面同时切开四个腔（规格卡“画面上的约定”）。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { phaseAt, squeeze, valves, type ChamberKey, type PhaseKey } from './physics'
import { curveOf, ellipsoid, fbm, hollowTube, lin, mix3, noise, roundCone, segDist, smin, sminAll, sstep, surfaceNets, type V3 } from './sdf'

// ---------- 形体 ----------
const RA_C: V3 = [-3.1, 1.85, -0.1], RA_R: V3 = [1.35, 1.6, 1.35]
const LA_C: V3 = [2.85, 2.2, -0.4], LA_R: V3 = [1.3, 1.2, 1.2]
const RV_C: V3 = [-1.8, -1.9, 0.15], RV_R: V3 = [1.3, 2.3, 1.0], RV_ROT = 0.38
const LV_C: V3 = [1.5, -1.95, -0.1], LV_R: V3 = [0.95, 2.45, 0.95], LV_ROT = 0.49
/** 各腔的中心（标签挂在这里） */
export const CH_AT: Record<ChamberKey, V3> = { ra: RA_C, la: LA_C, rv: [-1.9, -1.9, 0], lv: [1.75, -2.3, 0] }
/** 房室瓣、动脉瓣所在的口：中点、血流的方向、口的半径 */
interface Orifice { m: V3; d: V3; r: number }
const nrm = (v: V3): V3 => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l] }
const AV_R: Orifice = { m: [-2.8, 0.2, 0], d: nrm([0.35, -1, 0]), r: 0.62 }
const AV_L: Orifice = { m: [2.3, 0.35, -0.25], d: nrm([-0.45, -1, 0]), r: 0.6 }
const SL_A: Orifice = { m: [0.66, 1.45, -0.15], d: [0, 1, 0], r: 0.55 }
const SL_P: Orifice = { m: [-0.78, 1.45, 0.3], d: nrm([0.08, 1, 0]), r: 0.55 }
/** 心脏里各条通道（腔和腔、腔和大血管之间）：两端和半径 */
const CHAN: { a: V3; b: V3; r: number; side: 'r' | 'l' }[] = [
  { a: [-2.95, 0.6, 0], b: [-2.6, -0.3, 0.08], r: 0.62, side: 'r' },          // 右房室口
  { a: [2.7, 1.2, -0.35], b: [1.95, -0.55, -0.15], r: 0.6, side: 'l' },        // 左房室口
  { a: [0.62, -0.35, -0.1], b: [0.66, 1.9, -0.15], r: 0.55, side: 'l' },       // 左心室 → 主动脉
  { a: [-1.55, -0.45, 0.22], b: [-0.75, 1.9, 0.3], r: 0.55, side: 'r' },       // 右心室 → 肺动脉
  { a: [-3.1, 2.6, -0.1], b: [-3.1, 3.7, -0.12], r: 0.55, side: 'r' },          // 上腔静脉口
  { a: [-3.2, 0.7, -0.7], b: [-3.3, -0.9, -1.5], r: 0.58, side: 'r' },          // 下腔静脉口
  { a: [3.3, 2.5, -0.5], b: [4.5, 2.6, -0.6], r: 0.36, side: 'l' },            // 肺静脉口（左肺来的两根）
  { a: [3.3, 1.85, -0.6], b: [4.5, 1.8, -0.8], r: 0.34, side: 'l' },
  { a: [2.4, 2.4, -0.9], b: [1.3, 2.35, -1.8], r: 0.34, side: 'l' },           // 肺静脉口（右肺来的两根，从后面进来）
  { a: [2.5, 1.85, -0.9], b: [1.4, 1.8, -1.7], r: 0.32, side: 'l' },
]
/** 乳头肌：从心室壁伸向房室瓣的肉柱 */
const PAP: { a: V3; b: V3 }[] = [
  { a: [-2.2, -3.5, -0.3], b: [-2.5, -1.75, -0.05] }, { a: [-1.0, -3.4, 0.1], b: [-1.8, -1.6, 0.05] },
  { a: [2.7, -3.7, -0.4], b: [2.6, -1.95, -0.25] }, { a: [1.3, -3.9, -0.2], b: [1.65, -2.0, -0.2] },
]
const taperEll = (x: number, y: number, z: number, c: V3, r: V3, rot: number, taper: number) => {
  // 先转到椭球自己的坐标里，越靠近心尖越细
  const px = x - c[0], py = y - c[1], co = Math.cos(-rot), si = Math.sin(-rot), qx = px * co - py * si, qy = px * si + py * co
  const k = 1 - taper + taper * sstep(-r[1], r[1] * 0.6, qy)
  return ellipsoid(qx / k, qy, (z - c[2]) / k, [0, 0, 0], r) * k
}
/** 房室沟、前室间沟：外表面上的两道浅沟，冠状血管和脂肪就在沟里 */
const avGroove = (x: number, y: number) => Math.exp(-(((y - 0.55 - 0.17 * x) / 0.38) ** 2))
const ivGroove = (x: number, y: number, z: number) => { const d = Math.abs((x - 0.35) * 0.96 + (y - 0.6) * 0.29 - 0) - 0; const along = (0.6 - y); return along > -0.3 ? Math.exp(-(((x - 0.35 - 0.3 * along) / 0.34) ** 2)) * sstep(-0.5, 1.2, z) * (d >= 0 ? 1 : 1) : 0 }
function outerSdf(x: number, y: number, z: number) {
  const ven = taperEll(x, y, z, [0.25, -1.95, 0.05], [3.45, 3.55, 2.55], 0.45, 0.42)
  const ra = ellipsoid(x, y, z, RA_C, [RA_R[0] + 0.32, RA_R[1] + 0.3, RA_R[2] + 0.3])
  const la = ellipsoid(x, y, z, LA_C, [LA_R[0] + 0.32, LA_R[1] + 0.3, LA_R[2] + 0.3])
  const rau = ellipsoid(x, y, z, [-2.15, 3.0, 1.25], [1.15, 0.62, 0.7], -0.45)
  const lau = ellipsoid(x, y, z, [2.35, 2.95, 1.05], [0.95, 0.5, 0.62], 0.55)
  // 大血管出心脏的地方：一圈略粗的颈
  const necks = Math.min(roundCone(x, y, z, [0.62, 0.4, -0.12], [0.66, 2.0, -0.15], 1.05, 0.86), roundCone(x, y, z, [-1.3, 0.2, 0.25], [-0.76, 2.0, 0.3], 1.0, 0.85))
  let d = sminAll([ven, ra, la, rau, lau, necks], 0.9)
  d += 0.2 * avGroove(x, y) + 0.16 * ivGroove(x, y, z)
  d += 0.045 * fbm(x * 1.4, y * 1.4, z * 1.4)
  return d
}
function cavSdf(x: number, y: number, z: number) {
  const chan = (side: 'r' | 'l') => CHAN.filter(c => c.side === side).map(c => roundCone(x, y, z, c.a, c.b, c.r, c.r))
  const R = sminAll([ellipsoid(x, y, z, RA_C, RA_R), taperEll(x, y, z, RV_C, RV_R, RV_ROT, 0.35), ...chan('r')], 0.35)
  const L = sminAll([ellipsoid(x, y, z, LA_C, LA_R), taperEll(x, y, z, LV_C, LV_R, LV_ROT, 0.4), ...chan('l')], 0.35)
  let d = Math.min(R, L)
  // 心室里的肉柱：腔面不光滑
  if (y < 0.2) d += 0.1 * sstep(0.2, -1.2, y) * noise(x * 2.6, y * 1.3, z * 2.6)
  // 乳头肌把腔挖掉一块
  for (const p of PAP) d = Math.max(d, -roundCone(x, y, z, p.a, p.b, 0.3, 0.14))
  return d
}
/** 心肌：外表面以内、腔以外。外表面至少比腔大 0.28 cm，壁不会破 */
const wallSdf = (x: number, y: number, z: number) => {
  const o = outerSdf(x, y, z)
  if (o > 0.6) return o                     // 离外表面还远：用不着算腔
  const c = cavSdf(x, y, z); return Math.max(smin(o, c - 0.28, 0.3), -c)
}
const BOUNDS: [V3, V3] = [[-5.2, -6.2, -3.4], [5.6, 4.6, 3.2]]
/** 外表面上 (x, y) 处朝前那一面的 z：冠状血管贴着它走 */
function frontZ(x: number, y: number, side = 1) {
  let lo = 0, hi = 4 * side
  if (outerSdf(x, y, hi) < 0) return hi
  for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (outerSdf(x, y, m) < 0) lo = m; else hi = m }
  return (lo + hi) / 2
}

// ---------- 颜色 ----------
const MUSCLE = lin('#8c2230'), MUSCLE2 = lin('#a7394a'), ATRIUM = lin('#7a2638'), FAT = lin('#d9b46a'), FAT2 = lin('#c79a52'), INNER = lin('#5e121c'), INNER2 = lin('#7d1d29')
function wallColor(p: V3): V3 {
  const [x, y, z] = p, o = outerSdf(x, y, z)
  if (o < -0.14) {           // 腔的内面：暗红，有点斑驳
    return mix3(INNER, INNER2, 0.5 + 0.5 * noise(x * 3, y * 3, z * 3))
  }
  const n = fbm(x * 2.2, y * 2.2, z * 2.2), atr = sstep(0.4, 1.6, y - 0.17 * x)
  let c = mix3(mix3(MUSCLE, MUSCLE2, 0.5 + 0.6 * n), ATRIUM, atr * 0.7)
  // 沟里和大血管根部堆着黄色的脂肪
  const fat = Math.max(avGroove(x, y) * 1.1, ivGroove(x, y, z) * 0.95, sstep(1.2, 2.2, y) * sstep(1.6, 0.6, Math.abs(x)) * 0.7) + 0.25 * noise(x * 3.1, y * 3.1, z * 3.1)
  c = mix3(c, mix3(FAT2, FAT, 0.5 + 0.5 * n), sstep(0.45, 0.85, fat))
  return c
}
/** 顶点属于哪个腔的内面（1 右心房，2 右心室，3 左心房，4 左心室；0 是外表面） */
function wallTag(p: V3) {
  const [x, y, z] = p
  if (outerSdf(x, y, z) > -0.14) return 0
  const d = [ellipsoid(x, y, z, RA_C, RA_R), taperEll(x, y, z, RV_C, RV_R, RV_ROT, 0.35), ellipsoid(x, y, z, LA_C, LA_R), taperEll(x, y, z, LV_C, LV_R, LV_ROT, 0.4)]
  let k = 0; for (let i = 1; i < 4; i++) if (d[i] < d[k]) k = i
  return d[k] < 0.9 ? k + 1 : 0
}
export const TAG: Record<ChamberKey, number> = { ra: 1, rv: 2, la: 3, lv: 4 }

// ---------- 大血管 ----------
export type Blood = 'a' | 'v'
export const RED = '#c8232f', BLUE = '#33509e', RED_DEEP = '#9e1a26', BLUE_DEEP = '#273f80'
interface Vessel { key: string; pts: V3[]; r: number; wall: number; blood: Blood }
/** 连在心脏上的几根大血管，剪短了的样子；身体里的血管从这些断口接着往外走 */
export const STUBS: Vessel[] = [
  { key: 'aorta', pts: [[0.66, 1.95, -0.15], [0.7, 3.6, -0.05], [1.0, 5.3, -0.3], [2.0, 6.2, -1.2], [3.0, 5.9, -2.1], [3.4, 4.5, -2.6], [3.45, 3.0, -2.8]], r: 0.82, wall: 0.24, blood: 'a' },
  { key: 'brach', pts: [[1.15, 5.7, -0.5], [0.9, 6.6, -0.45], [0.6, 7.3, -0.4]], r: 0.38, wall: 0.1, blood: 'a' },
  { key: 'lcar', pts: [[1.8, 6.05, -1.0], [1.8, 6.9, -1.0], [1.8, 7.5, -1.0]], r: 0.3, wall: 0.09, blood: 'a' },
  { key: 'lsub', pts: [[2.45, 6.05, -1.5], [2.7, 6.9, -1.55], [2.9, 7.4, -1.6]], r: 0.32, wall: 0.09, blood: 'a' },
  { key: 'pa', pts: [[-0.76, 1.95, 0.3], [-0.62, 3.0, 0.5], [-0.3, 3.9, 0.15]], r: 0.8, wall: 0.17, blood: 'v' },
  { key: 'lpa', pts: [[0.1, 4.05, -0.2], [0.9, 4.35, -0.9], [2.4, 4.3, -1.4]], r: 0.52, wall: 0.12, blood: 'v' },
  { key: 'rpa', pts: [[-0.75, 4.05, -0.2], [-1.6, 4.3, -1.0], [-3.0, 4.1, -1.5]], r: 0.52, wall: 0.12, blood: 'v' },
  { key: 'svc', pts: [[-3.1, 7.1, -0.2], [-3.1, 5.4, -0.15], [-3.1, 3.75, -0.12]], r: 0.74, wall: 0.11, blood: 'v' },
  { key: 'ivc', pts: [[-3.3, -0.95, -1.5], [-3.3, -2.2, -1.5], [-3.25, -3.4, -1.3]], r: 0.8, wall: 0.12, blood: 'v' },
  { key: 'pv1', pts: [[4.5, 2.6, -0.6], [5.0, 2.7, -0.7], [5.6, 2.9, -0.8]], r: 0.5, wall: 0.1, blood: 'a' },
  { key: 'pv2', pts: [[4.5, 1.8, -0.8], [5.0, 1.75, -0.9], [5.6, 1.7, -1.0]], r: 0.48, wall: 0.1, blood: 'a' },
  { key: 'pv3', pts: [[1.3, 2.35, -1.8], [0.2, 2.5, -2.4], [-1.2, 2.6, -3.0]], r: 0.48, wall: 0.1, blood: 'a' },
  { key: 'pv4', pts: [[1.4, 1.8, -1.7], [0.2, 1.75, -2.4], [-1.2, 1.7, -3.0]], r: 0.46, wall: 0.1, blood: 'a' },
]
export const stubEnd = (k: string) => STUBS.find(s => s.key === k)!.pts.at(-1)!
/** 各腔连着的血管（第 3 课亮起来的） */
export const CH_VESSELS: Record<ChamberKey, string[]> = { ra: ['svc', 'ivc'], rv: ['pa', 'lpa', 'rpa'], la: ['pv1', 'pv2', 'pv3', 'pv4'], lv: ['aorta', 'brach', 'lcar', 'lsub'] }

// ---------- 冠状血管：贴着外表面走 ----------
function coronary() {
  const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647 })()
  const on = (x: number, y: number, lift: number): V3 => [x, y, frontZ(x, y) + lift]
  const lines: { pts: V3[]; r: number; vein: boolean }[] = []
  // 前室间支（沿着前室间沟往心尖走）
  const lad: V3[] = []; for (let i = 0; i <= 14; i++) { const t = i / 14, x = 0.35 + 0.3 * (6.2 * t) * 0.5 + 0.08 * Math.sin(t * 11), y = 0.8 - 5.6 * t; lad.push(on(x, y, 0.05)) }
  lines.push({ pts: lad, r: 0.11, vein: false })
  // 心大静脉：伴着它走
  const gcv: V3[] = []; for (let i = 0; i <= 12; i++) { const t = i / 12, x = 0.62 + 0.3 * (5.0 * t) * 0.5 + 0.1 * Math.sin(t * 9 + 1), y = 0.6 - 4.8 * t; gcv.push(on(x, y, 0.06)) }
  lines.push({ pts: gcv, r: 0.1, vein: true })
  // 右冠状动脉：顺着右房室沟往右绕
  const rca: V3[] = []; for (let i = 0; i <= 12; i++) { const t = i / 12, x = 0.2 - 4.3 * t, y = 0.55 + 0.17 * x - 0.06 * Math.sin(t * 7); rca.push(on(x, y, 0.04)) }
  lines.push({ pts: rca, r: 0.1, vein: false })
  // 旋支：顺着左房室沟往左绕
  const cx: V3[] = []; for (let i = 0; i <= 10; i++) { const t = i / 10, x = 0.6 + 3.8 * t, y = 0.6 + 0.17 * x; cx.push(on(x, y, 0.04)) }
  lines.push({ pts: cx, r: 0.09, vein: false })
  // 从主干分出去的细支：对角支、右缘支
  for (let b = 0; b < 6; b++) {
    const base = lad[2 + b * 2], pts: V3[] = [base]; let x = base[0], y = base[1]
    for (let i = 0; i < 5; i++) { x += 0.38 + rnd() * 0.12; y -= 0.35 + rnd() * 0.15; pts.push(on(x, y, 0.03)) }
    lines.push({ pts, r: 0.06 - b * 0.004, vein: false })
  }
  for (let b = 0; b < 3; b++) {
    const base = rca[5 + b * 3], pts: V3[] = [base]; let x = base[0], y = base[1]
    for (let i = 0; i < 6; i++) { x += 0.12 + rnd() * 0.15; y -= 0.55 + rnd() * 0.15; pts.push(on(x, y, 0.03)) }
    lines.push({ pts, r: 0.065, vein: b === 1 })
  }
  return lines
}

// ---------- 剖面：z = 0 处的切面画成一张图，贴在一张和心脏一起变形的网格上 ----------
const CAP = { x0: BOUNDS[0][0], x1: BOUNDS[1][0], y0: BOUNDS[0][1], y1: 7.8 }
function capTexture() {
  const W = 400, H = Math.round(W * (CAP.y1 - CAP.y0) / (CAP.x1 - CAP.x0)), c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, img = g.createImageData(W, H)
  const ring = STUBS.map(s => ({ s, segs: s.pts.slice(1).map((p, i) => [s.pts[i], p] as [V3, V3]) }))
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = CAP.x0 + (i + 0.5) / W * (CAP.x1 - CAP.x0), y = CAP.y1 - (j + 0.5) / H * (CAP.y1 - CAP.y0), z = 0, k = (j * W + i) * 4
    let rgb: V3 | null = null
    const o0 = outerSdf(x, y, z)
    if (o0 < 0 && wallSdf(x, y, z) < 0) {
      // 心肌的切面：一道道斜着的肌纤维，靠外面一圈浅一点（心外膜），沟里是脂肪
      const o = outerSdf(x, y, z), fib = 0.5 + 0.5 * Math.sin((x * 0.8 + y * 1.6) * 9 + 3 * noise(x * 2, y * 2, 1.7))
      rgb = mix3(lin('#9a2a36'), lin('#b7404c'), fib * 0.55 + 0.25 * noise(x * 6, y * 6, 0.3))
      rgb = mix3(rgb, lin('#6f1722'), sstep(-0.12, 0.02, cavSdf(x, y, z) * -1 + 0.0) * 0)
      if (o > -0.045) rgb = mix3(rgb, lin('#c98a8a'), 0.4)
      const fat = Math.max(avGroove(x, y), ivGroove(x, y, z))
      if (o > -0.35 && fat > 0.5) rgb = mix3(rgb, lin('#dcb86e'), 0.85)
    } else {
      for (const { s, segs } of ring) {
        // 只取线段中间（投影落在线段上）的距离：两头的球面距离会在剖面上画出一个圈
        let d = 1e9
        for (const [a, b] of segs) { const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], t = ((x - a[0]) * bx + (y - a[1]) * by + (z - a[2]) * bz) / (bx * bx + by * by + bz * bz); if (t >= -0.02 && t <= 1.02) d = Math.min(d, segDist(x, y, z, a, b)) }
        if (d < s.r && d > s.r - s.wall) { rgb = s.blood === 'a' ? lin('#b8505a') : lin('#6f78aa'); break }
      }
    }
    if (rgb) { img.data[k] = Math.round(Math.pow(rgb[0], 1 / 2.2) * 255); img.data[k + 1] = Math.round(Math.pow(rgb[1], 1 / 2.2) * 255); img.data[k + 2] = Math.round(Math.pow(rgb[2], 1 / 2.2) * 255); img.data[k + 3] = 255 }
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

// ---------- 收缩：顶点着色器里把心房、心室往各自的中心收 ----------
export interface Squeeze { a: { value: number }; v: { value: number }; focus: { value: number }; glow: { value: number } }
const DEFORM = /* glsl */`
  vec3 heartDeform(vec3 p) {
    float wv = 1.0 - smoothstep(-1.6, 0.35, p.y);
    float wa = smoothstep(0.9, 2.0, p.y) * smoothstep(1.35, 1.95, abs(p.x));
    vec2 cv = vec2(0.2, -1.9);
    p.x += (cv.x - p.x) * 0.1 * uV * wv;
    p.y += (0.4 - p.y) * 0.1 * uV * wv;
    vec2 ca = mix(vec2(-3.1, 1.85), vec2(2.85, 2.2), smoothstep(-0.6, 0.6, p.x));
    p.xy += (ca - p.xy) * 0.14 * uA * wa;
    return p;
  }
`
/** 和画面里一样的变形，给腔里的红细胞用 */
export function deform(p: THREE.Vector3, a: number, v: number) {
  const ss = (e0: number, e1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t) }
  const wv = 1 - ss(-1.6, 0.35, p.y), wa = ss(0.9, 2.0, p.y) * ss(1.35, 1.95, Math.abs(p.x))
  p.x += (0.2 - p.x) * 0.1 * v * wv; p.y += (0.4 - p.y) * 0.1 * v * wv
  const k = ss(-0.6, 0.6, p.x), cx = -3.1 + (2.85 + 3.1) * k, cy = 1.85 + (2.2 - 1.85) * k
  p.x += (cx - p.x) * 0.14 * a * wa; p.y += (cy - p.y) * 0.14 * a * wa
  return p
}
function patch(m: THREE.Material, u: Squeeze, tagged: boolean) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uA = u.a; sh.uniforms.uV = u.v; sh.uniforms.uFocus = u.focus; sh.uniforms.uGlow = u.glow
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nuniform float uA; uniform float uV;\n${tagged ? 'attribute float aTag; varying float vTag;' : ''}\n${DEFORM}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed = heartDeform(transformed);${tagged ? '\nvTag = aTag;' : ''}`)
    if (tagged) sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFocus; uniform float uGlow; varying float vTag;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nif (uFocus > 0.5 && abs(vTag - uFocus) < 0.5) totalEmissiveRadiance += vec3(0.04, 0.3, 0.26) * uGlow;')
  }
  m.customProgramCacheKey = () => (tagged ? 'heart-tag' : 'heart')
}

// ---------- 一次算好的几何体 ----------
let GEO: ReturnType<typeof build> | null = null
function build() {
  const wall = surfaceNets(wallSdf, BOUNDS, 0.11, wallColor, wallTag)
  const stubs = STUBS.map(s => ({ s, geo: hollowTube(curveOf(s.pts), s.r, s.wall, 48, 22) }))
  const cor = coronary().map(l => ({ ...l, geo: new THREE.TubeGeometry(curveOf(l.pts), l.pts.length * 4, l.r, 8) }))
  const cap = new THREE.PlaneGeometry(CAP.x1 - CAP.x0, CAP.y1 - CAP.y0, 110, 130); cap.translate((CAP.x0 + CAP.x1) / 2, (CAP.y0 + CAP.y1) / 2, 0)
  // 一片瓣叶：侧面看是一道弯弯的、根厚梢薄的月牙，沿 z 拉出宽度。x 从铰链指向瓣尖，铰链在原点
  const leaf = (L: number, w: number, bulge: number) => {
    const s = new THREE.Shape(), N = 12, top: [number, number][] = [], bot: [number, number][] = []
    for (let i = 0; i <= N; i++) { const t = i / N, x = L * t, y = bulge * L * Math.sin(Math.PI * t * 0.85), th = 0.15 * (1 - t) + 0.05; top.push([x, y + th / 2]); bot.push([x, y - th / 2]) }
    s.moveTo(...top[0]); top.slice(1).forEach(p => s.lineTo(...p)); bot.reverse().forEach(p => s.lineTo(...p)); s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: w * 2, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 8 }); g.translate(0, 0, -w)
    g.computeVertexNormals(); return g
  }
  const capTex = capTexture()
  return { wall, stubs, cor, cap, capTex, avLeaf: leaf(0.7, 0.62, 0.14), slLeaf: leaf(0.55, 0.5, -0.22) }
}
export const heartGeo = () => (GEO ??= build())

// ---------- 跳动：各课共用的控制 ----------
/** mode：still 不跳；auto 按真实节拍跳；manual 由第 4 课一步一步给出时期。rev：试着让血倒流（两道瓣膜都关上） */
export const beat = { mode: 'still' as 'still' | 'auto' | 'manual', phase: 'rest' as PhaseKey, start: 0, dur: 2.4, rev: false, slow: 1 }
/** 第 4 课：开始一个时期，dur 秒走完 */
export const runPhase = (p: PhaseKey, dur: number) => { beat.mode = 'manual'; beat.phase = p; beat.start = performance.now() / 1000; beat.dur = dur; beat.rev = false }
/** 此刻的时期、收缩强弱、两道瓣膜（开 1，关 0） */
function now() {
  const t = performance.now() / 1000
  if (beat.mode === 'auto') { const ph = phaseAt(t / beat.slow); const s = squeeze(ph.key, ph.k), v = valves(ph.key); return { ...s, av: v.av ? 1 : 0, sl: v.sl ? 1 : 0, key: ph.key, k: ph.k } }
  if (beat.mode === 'manual') {
    const k = Math.min(1, (performance.now() / 1000 - beat.start) / beat.dur), s = squeeze(beat.phase, k), v = valves(beat.phase)
    if (beat.rev) return { atria: 0, ventricles: 0, av: 0, sl: 0, key: beat.phase, k }
    return { ...s, av: v.av ? 1 : 0, sl: v.sl ? 1 : 0, key: beat.phase, k }
  }
  return { atria: 0, ventricles: 0, av: 1, sl: 0, key: 'rest' as PhaseKey, k: 0 }
}

// ---------- 腔里流着的红细胞（第 4 课） ----------
const FLOW_PATHS: { pts: V3[]; blood: Blood }[] = [
  { pts: [[-3.1, 5.6, -0.25], [-3.1, 3.4, -0.25], [-3.2, 1.9, -0.3], [-2.85, 0.2, -0.25], [-2.3, -1.4, -0.3], [-1.6, -2.9, -0.3], [-1.1, -2.0, -0.3], [-1.35, -0.4, -0.28], [-0.8, 1.4, -0.12], [-0.62, 3.0, -0.1], [-0.25, 4.0, -0.2]], blood: 'v' },
  { pts: [[-3.25, -3.3, -1.3], [-3.3, -1.6, -1.2], [-3.2, 0.6, -0.6], [-3.0, 1.5, -0.35], [-2.85, 0.2, -0.3], [-2.2, -1.6, -0.32], [-1.4, -3.1, -0.3], [-1.05, -1.8, -0.3], [-1.3, -0.3, -0.26], [-0.8, 1.4, -0.14], [-0.6, 3.0, -0.14], [-0.25, 4.0, -0.25]], blood: 'v' },
  { pts: [[5.4, 2.8, -0.75], [4.3, 2.5, -0.55], [2.9, 2.2, -0.42], [2.3, 0.35, -0.3], [2.0, -1.8, -0.3], [2.4, -3.4, -0.3], [1.5, -3.0, -0.3], [0.85, -1.2, -0.3], [0.64, 0.6, -0.3], [0.66, 1.6, -0.35], [0.7, 3.6, -0.3], [1.0, 5.2, -0.4]], blood: 'a' },
]
/** 一条路上两道瓣膜所在的位置（0–1） */
function valveS(c: THREE.CatmullRomCurve3, at: V3[]) {
  const pts = c.getSpacedPoints(400)
  return at.map(a => { let bi = 0, bd = 1e9; pts.forEach((p, i) => { const d = p.distanceToSquared(new THREE.Vector3(...a)); if (d < bd) { bd = d; bi = i } }); return bi / 400 })
}
/** 红细胞的模型：两面凹的圆饼 */
export function rbcGeo(d = 1) {
  // 截面用 Evans–Fung 的红细胞形状：中间薄、靠边缘厚
  const R = d / 2, half = (p: number) => R / 2 * Math.sqrt(Math.max(0, 1 - p * p)) * (0.207 + 2.003 * p * p - 1.123 * p ** 4)
  const top: THREE.Vector2[] = []
  for (let i = 0; i <= 14; i++) { const p = Math.sin(i / 14 * Math.PI / 2); top.push(new THREE.Vector2(Math.max(1e-4, p * R), half(p))) }
  const pts = [...top.slice().reverse().map(v => new THREE.Vector2(v.x, -v.y)), ...top.slice(1)]
  const g = new THREE.LatheGeometry(pts, 20); g.computeVertexNormals(); return g
}

function HeartFlow({ u }: { u: Squeeze }) {
  const N = 64
  const data = useMemo(() => FLOW_PATHS.map((f, pi) => {
    const c = curveOf(f.pts)
    const [sAV, sSL] = valveS(c, pi < 2 ? [AV_R.m, SL_P.m] : [AV_L.m, SL_A.m])
    const table = c.getSpacedPoints(300)
    let sd = 7 + pi * 31; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    return { f, table, sAV, sSL, s: Array.from({ length: N }, (_, i) => i / N + rnd() * 0.01), j: Array.from({ length: N }, () => [(rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.7, -rnd() * 0.45] as V3), rot: Array.from({ length: N }, () => [rnd() * 6, rnd() * 6, rnd() * 6] as V3) }
  }), [])
  const mesh = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => rbcGeo(0.34), [])
  const m4 = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), e = useMemo(() => new THREE.Euler(), []), v = useMemo(() => new THREE.Vector3(), []), sc = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  useEffect(() => {
    const c = new THREE.Color(); let i = 0
    for (const d of data) for (let k = 0; k < N; k++) mesh.current!.setColorAt(i++, c.set(d.f.blood === 'a' ? RED : BLUE).multiplyScalar(0.8 + (k % 5) * 0.08))
    mesh.current!.instanceColor!.needsUpdate = true
  }, [data])
  useFrame((st, dt0) => {
    const dt = Math.min(dt0, 1 / 30), n = now()
    // 三段的速度（每秒走全程的几成）：静脉和心房、心室、动脉
    const sp = beat.rev ? [-0.06, -0.14, -0.14]
      : n.key === 'atria' ? [0.15, 0.07, 0.03] : n.key === 'ventricles' ? [0.05, 0.22, 0.24] : [0.06, 0.05, 0.03]
    const moving = beat.mode === 'manual' ? (n.k < 1 ? 1 : 0.25) : 1
    let i = 0
    for (const d of data) for (let k = 0; k < N; k++) {
      let s = d.s[k]; const z = s < d.sAV ? 0 : s < d.sSL ? 1 : 2
      let ns = s + sp[z] * moving * dt * (0.8 + (k % 7) * 0.05)
      const jit = (k % 9) * 0.004
      // 瓣膜关着就过不去：往前走的堆在它前面，往回走的堆在它后面
      if (s < d.sAV && ns >= d.sAV && n.av < 0.5) ns = d.sAV - 0.006 - jit
      if (s >= d.sAV && ns < d.sAV) ns = n.av < 0.5 || beat.rev ? d.sAV + 0.006 + jit : ns
      if (s < d.sSL && ns >= d.sSL && n.sl < 0.5) ns = d.sSL - 0.006 - jit
      if (s >= d.sSL && ns < d.sSL) ns = d.sSL + 0.006 + jit
      if (ns > 1) ns -= 1
      if (ns < 0) ns = 0
      d.s[k] = s = ns
      const t = s * 299, a = Math.floor(t), f = t - a, p0 = d.table[a], p1 = d.table[Math.min(299, a + 1)]
      v.set(p0.x + (p1.x - p0.x) * f + d.j[k][0] * (z === 1 ? 1.4 : 0.6), p0.y + (p1.y - p0.y) * f + d.j[k][1] * (z === 1 ? 1.6 : 0.6), p0.z + (p1.z - p0.z) * f + d.j[k][2])
      deform(v, u.a.value, u.v.value)
      const fadeIn = Math.min(1, s / 0.04, (1 - s) / 0.04)
      q.setFromEuler(e.set(d.rot[k][0] + s * 9, d.rot[k][1], d.rot[k][2]))
      m4.compose(v, q, sc.setScalar(Math.max(0.001, fadeIn)))
      mesh.current!.setMatrixAt(i++, m4)
    }
    mesh.current!.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[geo, undefined, N * FLOW_PATHS.length]} frustumCulled={false}><meshPhysicalMaterial roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.3} /></instancedMesh>
}

// ---------- 瓣膜 ----------
/** 一道瓣膜的两片瓣叶。open() 0–1（每帧读）；av 为真是房室瓣（打开时垂进心室，有腱索拉着），否则是动脉瓣（打开时贴着管壁） */
function Valve({ o, av, open, glow, clip }: { o: Orifice; av: boolean; open: () => number; glow: boolean; clip: THREE.Plane[] }) {
  const { avLeaf, slLeaf } = heartGeo()
  const g = useRef<(THREE.Group | null)[]>([]), cur = useRef(open())
  const P: V3 = nrm([-o.d[1], o.d[0], 0])              // 口所在平面里和血流垂直的方向
  const L = o.r * (av ? 1.08 : 1.0)
  const hinge = (s: number): V3 => [o.m[0] + P[0] * o.r * s, o.m[1] + P[1] * o.r * s, o.m[2]]
  // 打开：顺着血流，略贴向管壁；关上：指向口的中心，略往血流的反方向兜
  const aOpen = (s: number) => Math.atan2(o.d[1] + P[1] * s * 0.18, o.d[0] + P[0] * s * 0.18)
  const aShut = (s: number) => Math.atan2(-P[1] * s - o.d[1] * 0.32, -P[0] * s - o.d[0] * 0.32)
  const ang = (s: number, k: number) => { const c = aShut(s); let d = aOpen(s) - c; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return c + d * k }
  const cords = useRef<THREE.InstancedMesh>(null)
  const tmp = useMemo(() => ({ m4: new THREE.Matrix4(), q: new THREE.Quaternion(), A: new THREE.Vector3(), B: new THREE.Vector3(), d: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), s: new THREE.Vector3() }), [])
  useFrame((_, dt) => {
    cur.current += (open() - cur.current) * (1 - Math.exp(-Math.min(dt, 1 / 30) / 0.07))
    const k = cur.current
    ;[-1, 1].forEach((s, i) => { const gg = g.current[i]; if (gg) gg.rotation.z = ang(s, k) })
    // 腱索：从瓣尖连到心室里的乳头肌
    if (av && cords.current) {
      let n = 0
      for (const s of [-1, 1]) {
        const a = ang(s, k), h = hinge(s)
        tmp.B.set(o.m[0] + o.d[0] * 2.0 + P[0] * s * 0.32, o.m[1] + o.d[1] * 2.0 + P[1] * s * 0.32, o.m[2] - 0.1)
        for (const z of [-0.42, -0.12]) {
          tmp.A.set(h[0] + Math.cos(a) * L * 0.92, h[1] + Math.sin(a) * L * 0.92, o.m[2] + z)
          tmp.d.copy(tmp.B).sub(tmp.A); const len = tmp.d.length()
          tmp.m4.compose(tmp.s.copy(tmp.A).add(tmp.B).multiplyScalar(0.5), tmp.q.setFromUnitVectors(tmp.up, tmp.d.normalize()), new THREE.Vector3(1, len, 1))
          cords.current.setMatrixAt(n++, tmp.m4)
        }
      }
      cords.current.instanceMatrix.needsUpdate = true
    }
  })
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#ead8c8', roughness: 0.45, clearcoat: 0.5, side: THREE.DoubleSide, clippingPlanes: clip }), [clip])
  const cordMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f0e6d6', roughness: 0.6, clippingPlanes: clip }), [clip])
  useEffect(() => { mat.emissive.set(glow ? '#b07a18' : '#000000'); mat.emissiveIntensity = glow ? 0.75 : 0; mat.color.set(glow ? '#ffe7b0' : '#ead8c8') }, [glow, mat])
  return <group>
    {[-1, 1].map((s, i) => <group key={s} ref={e => { g.current[i] = e }} position={hinge(s)}><mesh geometry={av ? avLeaf : slLeaf} material={mat} scale={[L / (av ? 0.7 : 0.55), -s, 1]} /></group>)}
    {av && <instancedMesh ref={cords} args={[undefined, cordMat, 4]} frustumCulled={false}><cylinderGeometry args={[0.024, 0.024, 1, 5]} /></instancedMesh>}
  </group>
}

// ---------- 整颗心脏 ----------
export interface HeartProps {
  /** 剖开的进度：0 完整，1 前半边已经拿开 */
  cut: number
  /** 亮起来的腔和连着的血管（第 3 课），或 'valves' 亮瓣膜 */
  focus?: ChamberKey | 'valves' | null
  /** 第 4 课：腔里流着红细胞 */
  flow?: boolean
}
export function Heart({ cut, focus = null, flow = false }: HeartProps) {
  const G = heartGeo()
  const gl = useThree(s => s.gl)
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  const root = useRef<THREE.Group>(null), front = useRef<THREE.Group>(null)
  const u = useMemo<Squeeze>(() => ({ a: { value: 0 }, v: { value: 0 }, focus: { value: 0 }, glow: { value: 0 } }), [])
  // 两个剖切面：后半边留 z ≤ 0，前半边留 z ≥ 0（前半边拿开时跟着它走）
  const backPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), [])
  const frontPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
  const backClip = useMemo(() => [backPlane], [backPlane])
  const cutOn = cut > 0.001
  const mats = useMemo(() => {
    const mk = (isFront: boolean) => {
      const wall = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.28, sheen: 0.4, sheenColor: new THREE.Color('#ff9a9a'), sheenRoughness: 0.5, side: THREE.DoubleSide })
      patch(wall, u, !isFront)
      const cap = new THREE.MeshStandardMaterial({ map: G.capTex, alphaTest: 0.5, roughness: 0.7, side: THREE.DoubleSide }); patch(cap, u, false)
      const vessel = (b: Blood, hl: boolean) => { const m = new THREE.MeshPhysicalMaterial({ color: b === 'a' ? '#c23a43' : '#4a5d9c', roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25, side: THREE.DoubleSide, emissive: hl ? '#1f8a7c' : '#000000', emissiveIntensity: hl ? 0.75 : 0 }); patch(m, u, false); return m }
      const cor = (vein: boolean) => { const m = new THREE.MeshPhysicalMaterial({ color: vein ? '#4b3f78' : '#c12a33', roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }); patch(m, u, false); return m }
      return { wall, cap, va: vessel('a', false), vv: vessel('v', false), vaH: vessel('a', true), vvH: vessel('v', true), ca: cor(false), cv: cor(true) }
    }
    return { b: mk(false), f: mk(true) }
  }, [G, u])
  const all = (h: typeof mats.b) => [h.wall, h.cap, h.va, h.vv, h.vaH, h.vvH, h.ca, h.cv]
  // 剖开以前只画一颗完整的心；剖开以后后半边切掉 z > 0，前半边切掉 z < 0，前半边拿开
  useEffect(() => {
    for (const m of all(mats.b)) { m.clippingPlanes = cutOn ? [backPlane] : []; m.needsUpdate = true }
    for (const m of all(mats.f)) { m.clippingPlanes = [frontPlane]; m.transparent = true; m.needsUpdate = true }
  }, [cutOn, mats, backPlane, frontPlane])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { u.focus.value = focus && focus !== 'valves' ? TAG[focus] : 0 }, [focus, u])
  useFrame((st, dt) => {
    const n = now(), k = 1 - Math.exp(-Math.min(dt, 1 / 30) / 0.06)
    u.a.value += (n.atria - u.a.value) * k; u.v.value += (n.ventricles - u.v.value) * k
    u.glow.value = 0.7 + 0.3 * Math.sin(st.clock.elapsedTime * 3.2)
    if (!root.current) return
    root.current.updateMatrixWorld()
    backPlane.set(new THREE.Vector3(0, 0, -1), 0).applyMatrix4(root.current.matrixWorld)
    // 前半边：往前、往上拿开，慢慢淡掉
    const f = front.current
    if (f) {
      const e = cut * cut * (3 - 2 * cut)
      f.position.set(-0.8 * e, 1.6 * e, 7 * e); f.rotation.set(-0.6 * e, 0.7 * e, 0)
      f.visible = cutOn && cut < 0.995
      f.updateMatrixWorld()
      frontPlane.set(new THREE.Vector3(0, 0, 1), 0).applyMatrix4(f.matrixWorld)
      const op = 1 - sstep(0.3, 0.95, cut)
      for (const m of all(mats.f)) { m.opacity = op; m.depthWrite = op > 0.6 }
    }
  })
  const hl = (k: string) => !!focus && focus !== 'valves' && CH_VESSELS[focus].includes(k)
  const half = (h: typeof mats.b, isFront: boolean) => <>
    <mesh geometry={G.wall} material={h.wall} castShadow={!isFront} receiveShadow={!isFront} />
    {cutOn && <mesh geometry={G.cap} material={h.cap} position-z={isFront ? 0.004 : -0.004} />}
    {G.stubs.map(({ s, geo }) => <mesh key={s.key} geometry={geo} material={s.blood === 'a' ? (hl(s.key) ? h.vaH : h.va) : (hl(s.key) ? h.vvH : h.vv)} castShadow={!isFront} />)}
    {G.cor.map((c, i) => <mesh key={i} geometry={c.geo} material={c.vein ? h.cv : h.ca} />)}
  </>
  return (
    <group ref={root}>
      {half(mats.b, false)}
      <group ref={front}>{half(mats.f, true)}</group>
      {cutOn && <>
        <Valve o={AV_R} av open={() => now().av} glow={focus === 'valves'} clip={backClip} />
        <Valve o={AV_L} av open={() => now().av} glow={focus === 'valves'} clip={backClip} />
        <Valve o={SL_A} av={false} open={() => now().sl} glow={focus === 'valves'} clip={backClip} />
        <Valve o={SL_P} av={false} open={() => now().sl} glow={focus === 'valves'} clip={backClip} />
      </>}
      {flow && cutOn && <HeartFlow u={u} />}
    </group>
  )
}
/** 瓣膜和口的位置（标签用） */
export const VALVE_AT = { avR: AV_R.m, avL: AV_L.m, slA: SL_A.m, slP: SL_P.m }
