// 胸腔模型的形状：肋骨的走向和转动、胸骨、膈的穹顶、两肺、脊柱、皮肤轮廓。这里只有几何，不涉及画法（画法在 chest.tsx）。
// 坐标是世界的：1 个单位 = 10 cm；模型的脚底算在 y = 0（展柱把半身像托到这个高度），人面朝 +z（朝镜头），
// x 正方向是他的左手边（画面右边），所以右肺在 x < 0。
import * as THREE from 'three'
import { ellipsoid, fbm, roundCone, smin, sminAll, type V3 } from './sdf'
import { RIB_BUCKET, ribTurn } from './physics'

const DEG = Math.PI / 180
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
/** 平滑的交 */
const smax = (a: number, b: number, k: number) => -smin(-a, -b, k)
const sstep = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x) }

// ---------- 肋骨 ----------
/** 十二对肋骨：肋头高度、胸廓在这一层的半宽、半深，肋骨走到哪个角度为止（骨的部分），前端的高度 */
export interface RibDef { i: number; yh: number; W: number; D: number; pe: number; ye: number; kind: 'true' | 'false' | 'float' }
const W = [0.72, 1.0, 1.2, 1.33, 1.42, 1.47, 1.48, 1.46, 1.41, 1.33, 1.18, 1.0]
const Dd = [0.62, 0.72, 0.8, 0.85, 0.88, 0.9, 0.91, 0.9, 0.88, 0.84, 0.76, 0.66]
const PE = [2.2, 2.35, 2.42, 2.46, 2.5, 2.52, 2.52, 2.42, 2.3, 2.15, 1.75, 1.45]
/** 胸骨的前面：上端（胸骨柄）稍靠后，下端（剑突）稍靠前 */
export const STERNUM = { top: 14.38, bottom: 12.02, zTop: 0.58, zBottom: 0.86 }
export const sternumZ = (y: number) => STERNUM.zTop + (STERNUM.top - y) / (STERNUM.top - STERNUM.bottom) * (STERNUM.zBottom - STERNUM.zTop)
/** 第 i 对（0 起）真肋连到胸骨的高度 */
export const sternalY = (i: number) => 14.12 - i * 0.29
export const Z0 = -0.05
export const RIBS: RibDef[] = W.map((w, i) => ({
  i, yh: 14.6 - i * 0.285, W: w, D: Dd[i], pe: PE[i],
  ye: i < 7 ? sternalY(i) - 0.08 - 0.035 * i : [11.98, 11.66, 11.36, 11.38, 11.2][i - 7],
  kind: i < 7 ? 'true' : i < 10 ? 'false' : 'float',
}))
/** 肋骨从后往前走的起点角度（肋结节附近） */
export const PH0 = 0.5
/** 第 i 对肋骨、s 侧（1 左、−1 右）在角度 ph 处的中心点（静止时） */
export function ribPoint(r: RibDef, s: number, ph: number, out = new THREE.Vector3()) {
  const t = clamp01((ph - PH0) / (r.pe - PH0))
  const y = r.yh + (r.ye - r.yh) * Math.pow(sstep(t * 0.85 + 0.15 * t * t), 1.0)
  return out.set(s * r.W * Math.sin(ph), y, Z0 - r.D * Math.cos(ph))
}
/** 肋头（和脊柱相连的关节）：肋骨绕它转 */
export const ribHead = (r: RibDef, s: number) => new THREE.Vector3(s * 0.17, r.yh + 0.02, -0.6)
/** 从肋头到肋结节的一小段，接上主体 */
export function ribPath(r: RibDef, s: number, n: number) {
  const pts: THREE.Vector3[] = [ribHead(r, s), new THREE.Vector3(s * 0.33, r.yh + 0.01, -0.8)]
  for (let k = 0; k < n - 2; k++) pts.push(ribPoint(r, s, PH0 + 0.08 + (r.pe - PH0 - 0.08) * k / (n - 3)))
  return pts
}
/**
 * 肋骨的转动：k 是肋间肌收缩的程度。先像桶的提手一样绕“肋头—前端”那条线往外翻，再像水泵的把手一样绕横轴往上抬。
 * 上面几对主要往上抬，下面几对主要往外翻。浮肋动得小。
 */
export function ribTurnQ(r: RibDef, s: number, k: number, out = new THREE.Quaternion()) {
  const head = ribHead(r, s), front = ribPoint(r, s, r.pe), mid = ribPoint(r, s, 1.55)
  const pump = ribTurn(k) * DEG * (1.05 - 0.045 * r.i) * (r.kind === 'float' ? 0.5 : 1)
  const bucket = RIB_BUCKET * clamp01(k) * DEG * (0.45 + 0.07 * r.i) * (r.kind === 'float' ? 0.6 : 1)
  const ax = front.clone().sub(head).normalize()
  // 往哪边转才是把肋骨中段抬起来：试一下
  const qb = new THREE.Quaternion().setFromAxisAngle(ax, bucket)
  const m1 = mid.clone().sub(head).applyQuaternion(qb)
  if (m1.y < mid.y - head.y) qb.setFromAxisAngle(ax, -bucket)
  const qp = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pump)
  return out.copy(qp).multiply(qb)
}
/** 转过以后的点：绕肋头转 */
export const turnAbout = (p: THREE.Vector3, head: THREE.Vector3, q: THREE.Quaternion, out = new THREE.Vector3()) => out.copy(p).sub(head).applyQuaternion(q).add(head)

// ---------- 膈 ----------
/** 膈的边缘（附着在胸廓下口）：一个椭圆，前高（剑突）后低（腰椎）。rib 让边缘跟着下面几对肋骨往外、往上一点 */
export const DOME = { Wr: 1.34, Dr: 0.7, zc: 0.08 }
export const rimY = (ph: number, rib = 0) => 10.82 + 1.2 * Math.pow((1 + Math.cos(ph)) / 2, 1.3) + 0.05 * rib
export const rimScale = (rib: number) => 1 + 0.05 * rib
/** 膈顶的高度：右边（画面左）比左边高一点，中间心脏压着略低 */
const peakY = (x: number, dia: number) => 12.5 + 0.2 * Math.exp(-(((x + 0.62) / 0.5) ** 2)) + 0.1 * Math.exp(-(((x - 0.62) / 0.5) ** 2)) - 0.3 * dia
/** 穹顶：ρ（0 中心到 1 边缘）、ph（0 在前面）处的高度。收缩时变低、变平 */
export function domeAt(rho: number, ph: number, dia: number, rib = 0) {
  const sc = rimScale(rib), x = DOME.Wr * sc * rho * Math.sin(ph), z = DOME.zc + DOME.Dr * sc * rho * Math.cos(ph)
  const p = 0.55 - 0.2 * dia, ry = rimY(ph, rib)
  return { x, z, y: ry + (peakY(x, dia) - ry) * Math.pow(Math.max(0, 1 - rho * rho), p) }
}
/** (x, z) 处膈的高度（在边缘外面就取边缘的高度） */
export function domeY(x: number, z: number, dia = 0, rib = 0) {
  const sc = rimScale(rib), u = x / (DOME.Wr * sc), v = (z - DOME.zc) / (DOME.Dr * sc)
  const rho = Math.min(1, Math.hypot(u, v)), ph = Math.atan2(u, v)
  return domeAt(rho, ph, dia, rib).y
}

// ---------- 两肺 ----------
export const APEX_Y = 14.92
/** 肺：右肺（x < 0）三叶，左肺两叶，叶之间有裂；左肺内侧有心切迹；底面贴着膈 */
export function lungSdf(x: number, y: number, z: number) {
  const s = x < 0 ? -1 : 1, ax = Math.abs(x)
  let d = sminAll([
    ellipsoid(ax, y, z, [0.8, 13.2, -0.12], [0.6, 1.72, 0.8]),
    ellipsoid(ax, y, z, [0.98, 12.3, -0.18], [0.52, 1.0, 0.76]),
    roundCone(ax, y, z, [0.72, 14.6, -0.15], [0.8, 13.6, -0.1], 0.22, 0.55),
  ], 0.35)
  d = smin(d, ellipsoid(ax, y, z, [0.62, 12.15, -0.55], [0.42, 0.75, 0.38]), 0.3)          // 后下方深一点（肋膈隐窝）
  // 削掉的地方用平滑的交（smax），不然折角处的法线来回跳，看着像一级级台阶
  d = smax(d, -ellipsoid(ax, y, z, [0.0, 12.9, 0.05], [0.34, 2.6, 1.2]), 0.12)                 // 纵隔
  // 胸廓里面：每一层不超过肋骨围成的椭圆
  const t = clamp01((14.6 - y) / (14.6 - 11.4)), wi = 0.72 + (1.46 - 0.72) * Math.sqrt(t), di = 0.62 + (0.9 - 0.62) * Math.sqrt(t)
  d = smax(d, (Math.hypot(ax / (wi - 0.07), (z - Z0) / (di - 0.07)) - 1) * Math.min(wi, di), 0.12)
  d = smax(d, domeY(x, z) + 0.035 - y, 0.1)                                                     // 底面贴着膈
  if (s > 0) d = smax(d, -ellipsoid(x, y, z, [0.34, 12.55, 0.42], [0.5, 0.62, 0.55]), 0.1)    // 心切迹
  // 叶间裂：斜裂（两肺都有，后面高、前面低），右肺还有水平裂（只在斜裂前上方）。只刻在表面往里 0.15 的一层，
  // 刻得太细太深网格分辨不出来，会碎成一格一格的
  const d0 = d, obl = (y - 14.0 + 1.14 * (z + 0.8)) / 1.52, near = -d0 - 0.15
  d = Math.max(d, -Math.max(Math.abs(obl) - 0.03, near))
  if (s < 0) d = Math.max(d, -Math.max(Math.abs(y - 13.12) - 0.03, -obl, -(z + 0.2), near))
  return d + 0.012 * fbm(x * 3.5, y * 3.5, z * 3.5, 2)
}
/**
 * 两肺跟着胸廓胀大：底面始终贴着膈（膈顶降多少，那里的肺就往下长多少，边缘几乎不动），左右前后跟着肋骨往外。
 * 按顶点算：给静止时肺里的一点，返回此刻它在哪里
 */
export function lungMove(x: number, y: number, z: number, rib: number, dia: number, out: V3) {
  if (Math.abs(rib) < 1e-4 && Math.abs(dia) < 1e-4) { out[0] = x; out[1] = y; out[2] = z; return out }
  const y0 = domeY(x, z, 0, 0), y1 = domeY(x, z, dia, rib), s = (APEX_Y - y1) / Math.max(0.2, APEX_Y - y0)
  const ny = y < APEX_Y ? APEX_Y - (APEX_Y - y) * s : y
  const w = clamp01((APEX_Y - 0.2 - y) / 1.4)
  out[0] = x * (1 + 0.055 * rib * w); out[1] = ny; out[2] = Z0 + (z - Z0) * (1 + 0.05 * rib * w)
  return out
}

// ---------- 心脏（摆在纵隔里，这一间不讲它，只要像） ----------
// 心尖朝左下前方；右心房在右边；主动脉从中间升起、向左后方弯成主动脉弓再往下走；肺动脉干在主动脉前面向左上方分叉；上腔静脉在右边。
const HV = {
  aorta: [[0.02, 12.98, 0.02], [0.0, 13.62, -0.02], [0.18, 13.86, -0.22], [0.36, 13.7, -0.46], [0.34, 13.1, -0.52], [0.32, 12.3, -0.52]] as V3[],
  pulm: [[0.16, 12.98, 0.3], [0.26, 13.36, 0.2], [0.34, 13.48, 0.02]] as V3[],
  pulmL: [[0.34, 13.48, 0.02], [0.62, 13.5, -0.12]] as V3[],
  pulmR: [[0.3, 13.46, 0.0], [-0.1, 13.44, -0.22], [-0.42, 13.42, -0.2]] as V3[],
  svc: [[-0.34, 13.0, -0.06], [-0.34, 13.9, -0.1]] as V3[],
}
const tube = (x: number, y: number, z: number, pts: V3[], r: number) => { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, roundCone(x, y, z, pts[i], pts[i + 1], r, r)); return d }
export function heartSdf(x: number, y: number, z: number) {
  const vent = smin(roundCone(x, y, z, [0.02, 12.88, 0.08], [0.5, 12.28, 0.38], 0.44, 0.1), ellipsoid(x, y, z, [0.06, 12.78, 0.1], [0.48, 0.32, 0.36], -0.45), 0.12)
  const atria = sminAll([ellipsoid(x, y, z, [-0.38, 12.86, 0.02], [0.24, 0.3, 0.26]), ellipsoid(x, y, z, [0.12, 12.98, -0.22], [0.36, 0.2, 0.22]), ellipsoid(x, y, z, [0.36, 13.08, 0.18], [0.14, 0.08, 0.11], 0.4)], 0.08)
  const body = Math.max(smin(vent, atria, 0.1), (z - 0.12) * 0.9 - 0.55)   // 后面略平
  const ves = Math.min(tube(x, y, z, HV.aorta, 0.11), tube(x, y, z, HV.pulm, 0.1), tube(x, y, z, HV.pulmL, 0.07), tube(x, y, z, HV.pulmR, 0.07), tube(x, y, z, HV.svc, 0.085))
  return smin(body, ves, 0.05) + 0.006 * fbm(x * 9, y * 9, z * 9, 2)
}
/** 心脏表面的颜色：心肌暗红，冠状沟和前室间沟里有黄色的脂肪；主动脉红（动脉血），肺动脉和上腔静脉蓝（静脉血），和血液循环实验室一致 */
export function heartColor(x: number, y: number, z: number): V3 {
  if (tube(x, y, z, HV.aorta, 0.13) < 0) return [0.55, 0.05, 0.07]
  if (Math.min(tube(x, y, z, HV.pulm, 0.12), tube(x, y, z, HV.pulmL, 0.09), tube(x, y, z, HV.pulmR, 0.09), tube(x, y, z, HV.svc, 0.105)) < 0) return [0.06, 0.1, 0.32]
  const groove = Math.abs((y - 12.95) + 0.55 * (x + 0.1)) < 0.035 || segDist2(x, y, z, [0.2, 12.95, 0.42], [0.46, 12.36, 0.44]) < 0.03
  const n = 0.5 + 0.5 * fbm(x * 7, y * 7, z * 7, 2)
  return groove ? [0.7, 0.5, 0.18] : [0.32 + 0.08 * n, 0.06 + 0.02 * n, 0.07]
}
const segDist2 = (x: number, y: number, z: number, a: V3, b: V3) => roundCone(x, y, z, a, b, 0, 0)

// ---------- 脊柱 ----------
/** 每节椎骨的中心高度、椎体半径、半高 */
export const VERTS: { y: number; r: number; h: number; t: number }[] = (() => {
  const out: { y: number; r: number; h: number; t: number }[] = []
  for (let k = 0; k < 7; k++) out.push({ y: 15.95 - k * 0.2, r: 0.12, h: 0.07, t: 0.2 })                       // 颈椎
  for (let k = 0; k < 12; k++) out.push({ y: RIBS[k].yh, r: 0.14 + k * 0.006, h: 0.1 + k * 0.003, t: 0.3 })     // 胸椎
  for (let k = 0; k < 4; k++) out.push({ y: RIBS[11].yh - 0.36 - k * 0.38, r: 0.22, h: 0.14, t: 0.36 })          // 腰椎
  return out
})()
export const SPINE_Z = -0.55
export function spineSdf(x: number, y: number, z: number) {
  let d = 1e9
  for (const v of VERTS) {
    if (Math.abs(y - v.y) > 0.4) continue
    const dz = z - SPINE_Z, rr = Math.hypot(x, dz * 1.15) - v.r, hh = Math.abs(y - v.y) - v.h
    const body = Math.hypot(Math.max(rr, 0), Math.max(hh, 0)) + Math.min(Math.max(rr, hh), 0) - 0.025
    const spinous = roundCone(x, y, z, [0, v.y, SPINE_Z - 0.2], [0, v.y - 0.12, SPINE_Z - 0.42], 0.05, 0.035)
    const arch = roundCone(Math.abs(x), y, z, [0.08, v.y + 0.02, SPINE_Z - 0.16], [v.t, v.y + 0.03, SPINE_Z - 0.2], 0.05, 0.04)
    d = Math.min(d, smin(body, smin(spinous, arch, 0.05), 0.06))
  }
  return d
}

// ---------- 胸骨 ----------
export function sternumSdf(x: number, y: number, z: number) {
  const zc = sternumZ(y) - 0.05
  const man = smin(ellipsoid(x, y, z, [0, 14.22, sternumZ(14.22) - 0.05], [0.27, 0.13, 0.065]), ellipsoid(x, y, z, [0, 14.0, sternumZ(14.0) - 0.05], [0.17, 0.2, 0.065]), 0.08)
  const body = roundCone(x / 1.6, y, z, [0, 13.85, sternumZ(13.85) - 0.05], [0, 12.4, sternumZ(12.4) - 0.05], 0.09, 0.11)
  const xi = roundCone(x, y, z, [0, 12.35, sternumZ(12.35) - 0.05], [0, 12.0, sternumZ(12.0) - 0.04], 0.06, 0.025)
  const flat = Math.abs(z - zc) - 0.055
  return Math.max(sminAll([man, body, xi], 0.06), flat) + 0.004 * fbm(x * 8, y * 8, z * 8, 2)
}

// ---------- 皮肤（半透明的壳） ----------
export function skinSdf(x: number, y: number, z: number) {
  const ax = Math.abs(x)
  const arm = Math.max(sminAll([
    roundCone(ax, y, z, [0.2, 14.45, -0.1], [1.72, 14.38, -0.08], 0.5, 0.48),
    roundCone(ax, y, z, [1.95, 14.3, -0.05], [2.45, 12.2, 0.0], 0.44, 0.37),
  ], 0.3), 12.3 - y)
  const d = sminAll([
    ellipsoid(x, y, z, [0, 16.5, 0.05], [0.74, 0.98, 0.9]),
    roundCone(x, y, z, [0, 15.0, -0.05], [0, 15.9, 0], 0.5, 0.44),
    ellipsoid(x, y, z, [0, 13.35, -0.05], [1.62, 1.75, 1.0]),
    ellipsoid(x, y, z, [0, 11.1, 0.02], [1.3, 1.55, 0.86]),
    ellipsoid(x, y, z, [0, 9.75, 0], [1.5, 1.0, 0.92]),
    arm,
  ], 0.32)
  return Math.max(d + 0.01 * fbm(x * 2, y * 2, z * 2, 2), 9.2 - y)
}

/** 气管：从喉下面到分成两根主支气管的地方 */
export const TRACHEA = { top: [0, 15.5, -0.2] as V3, carina: [0, 13.95, -0.26] as V3 }
