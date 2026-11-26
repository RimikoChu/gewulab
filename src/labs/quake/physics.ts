// 地震实验室的计算核心。画面、读数、任务判定、随堂检测都从这里取数，界面和场景文件里不做计算。
// 取值约定写在规格卡 docs/specs/quake.md 里：
//   地壳里的平均波速：纵波 6.0 km/s，横波 3.5 km/s；能量 lg E = 4.8 + 1.5 M（E 单位 J）；
//   预警：最近的台站测到纵波后，系统处理 8 s 发出警报；纵波影区按课本取 104°–143°。
// 区域沙盘的坐标：单位 km，原点在映秀（2008 年汶川地震的震中），x 指向东南（四川盆地），z 指向西南，−z 指向东北（龙门山的走向）。

// ---------- 地震波 ----------
export const VP = 6.0   // 地壳里纵波的平均速度（km/s）
export const VS = 3.5   // 横波（km/s）
/** 横波比纵波晚到 1 s，离震源就远约 8.4 km */
export const K = (VP * VS) / (VP - VS)
/** 震源距：地面一点到震源的直线距离（km）。d 震中距，h 震源深度 */
export const hypo = (d: number, h: number) => Math.hypot(d, h)
export const tP = (d: number, h: number) => hypo(d, h) / VP
export const tS = (d: number, h: number) => hypo(d, h) / VS
/** 横波比纵波晚到几秒 */
export const lagSP = (d: number, h: number) => tS(d, h) - tP(d, h)
/** 地震后 t 秒，速度 v 的波前在地面上走到离震中多远（km）；还没到地面是 0 */
export const groundRadius = (v: number, t: number, h: number) => { const r = v * t; return r > h ? Math.sqrt(r * r - h * h) : 0 }

// ---------- 震级、能量、震源深度 ----------
/** 释放的能量（J） */
export const energy = (M: number) => Math.pow(10, 4.8 + 1.5 * M)
/** 震级大 dM 级，能量是几倍 */
export const energyRatio = (dM: number) => Math.pow(10, 1.5 * dM)
export const depthType = (h: number) => (h < 70 ? '浅源地震' : h <= 300 ? '中源地震' : '深源地震')
/** 科学计数法的写法：3.2×10¹⁶ */
export function sci(x: number) {
  const e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e)
  return `${m.toFixed(1)}×10${String(e).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c] ?? c).join('')}`
}

/** 2008 年 5 月 12 日汶川地震：8.0 级，震源深度 14 km（中国地震台网发布） */
export const WENCHUAN = { M: 8.0, h: 14, epi: [0, 0] as [number, number] }

// ---------- 区域沙盘上的城镇 ----------
// 经纬度换成“向东、向北各多少千米”（以映秀为原点）后，再转到沙盘的坐标：x =（东 − 北）/√2，z = −（东 + 北）/√2。
// 东、北的千米数按各地的经纬度估算，城市之间的距离是约数。
const S2 = Math.SQRT1_2
const at = (e: number, n: number): [number, number] => [(e - n) * S2, -(e + n) * S2]
export const CITIES = {
  yingxiu: { name: '映秀', at: at(0, 0), elev: 0.9, r: 0.8 },
  dujiangyan: { name: '都江堰', at: at(12, -7), elev: 0.7, r: 3.2 },
  wenchuan: { name: '汶川县城', at: at(9, 47), elev: 1.3, r: 1.0 },
  chengdu: { name: '成都', at: at(55, -44), elev: 0.5, r: 9 },
  mianyang: { name: '绵阳', at: at(113, 45), elev: 0.47, r: 4.5 },
  beichuan: { name: '北川', at: at(92, 85), elev: 0.75, r: 0.9 },
} as const
export type CityKey = keyof typeof CITIES
/** 城镇到震中（映秀）的距离（km） */
export const epiDist = (k: CityKey, epi: [number, number] = WENCHUAN.epi) => Math.hypot(CITIES[k].at[0] - epi[0], CITIES[k].at[1] - epi[1])

// ---------- 第 2 课：烈度（示意的衰减关系） ----------
/** 破裂带：沿龙门山的走向（−z，东北），大地震的破裂主要往东北延伸。长度 lg L = 0.59 M − 2.44（km） */
export function rupture(M: number, epi: [number, number] = WENCHUAN.epi): [[number, number], [number, number]] {
  const L = Math.max(1, Math.pow(10, 0.59 * M - 2.44))
  return [[epi[0], epi[1] + L * 0.15], [epi[0], epi[1] - L * 0.85]]
}
function distSeg(p: [number, number], a: [number, number], b: [number, number]) {
  const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2))
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vy * t)
}
/**
 * 某处的烈度（1–12 度，连续值）。示意的经验式：I = 10.2 + 1.5 M − 7.95 lg(R + 10)，R 是到破裂带的距离和震源深度合成的距离（km）。
 * 系数按“8.0 级时映秀一带约 11 度、成都一带约 7 度”粗略标定，见规格卡待核实事项。
 */
export function intensity(M: number, p: [number, number], h = WENCHUAN.h, epi: [number, number] = WENCHUAN.epi) {
  const [a, b] = rupture(M, epi), R = Math.hypot(distSeg(p, a, b), h)
  return Math.max(1, Math.min(12, 10.2 + 1.5 * M - 7.95 * Math.log10(R + 10)))
}
/** 烈度取整（度） */
export const degree = (I: number) => Math.max(1, Math.min(12, Math.round(I)))
export const cityIntensity = (k: CityKey, M: number) => degree(intensity(M, [...CITIES[k].at] as [number, number]))

// ---------- 第 3 课：先颠后晃 ----------
/** 小镇离震中多远（km）：三种情况 */
export const TOWN_DIST = { near: 30, mid: 60, far: 100 } as const
export type TownDist = keyof typeof TOWN_DIST

/** 一条合成的地震记录：上下（纵波为主）和水平（横波为主）两个分量。确定的伪随机，每次一样 */
export function seismogram(d: number, h: number, dur = 40, n = 800, seed = 1) {
  let s = seed * 9973 + 7
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) - 0.5
  const p = tP(d, h), q = tS(d, h), z = new Float32Array(n), x = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = (i / n) * dur
    let vz = rnd() * 0.03, vx = rnd() * 0.03
    if (t > p) { const u = t - p, e = Math.exp(-u * 0.8); vz += Math.sin(u * 2 * Math.PI * 5) * 0.42 * e + rnd() * 0.12 * e; vx += Math.sin(u * 2 * Math.PI * 4.3) * 0.1 * e }
    if (t > q) { const u = t - q, e = Math.exp(-u * 0.3), on = Math.min(1, u * 3); vx += Math.sin(u * 2 * Math.PI * 1.7) * 1.0 * e * on + rnd() * 0.25 * e; vz += Math.sin(u * 2 * Math.PI * 2.1) * 0.25 * e * on }
    z[i] = vz; x[i] = vx
  }
  return { z, x, dur, p, q }
}

// ---------- 第 4 课：地震预警 ----------
/** 预警系统从台站测到纵波到发出警报要处理几秒（示意） */
export const PROC = 8
/** 地震台：沙盘上每隔约 25 km 一个（示意的台网） */
export const STATIONS: [number, number][] = (() => {
  const out: [number, number][] = []
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) {
    const x = -58 + i * 25 + (j % 2 ? 12.5 : 0), z = 20 - j * 22
    if (x > 105 || z < -128) continue
    out.push([x, z])
  }
  return out
})()
/** 离震中最近的地震台 */
export function nearestStation(epi: [number, number] = WENCHUAN.epi) {
  let best = 0, d = Infinity
  STATIONS.forEach((s, i) => { const k = Math.hypot(s[0] - epi[0], s[1] - epi[1]); if (k < d) { d = k; best = i } })
  return { i: best, d }
}
/** 发出警报的时刻（地震后几秒） */
export const alertTime = (h = WENCHUAN.h, proc = PROC) => tP(nearestStation().d, h) + proc
/** 一座城能提前几秒收到警报（负数：警报发出时横波已经到了，在盲区里） */
export const leadTime = (k: CityKey, h = WENCHUAN.h, proc = PROC) => tS(epiDist(k), h) - alertTime(h, proc)
/** 盲区的半径：警报发出时，横波在地面上已经走到的范围（km） */
export const blindRadius = (h = WENCHUAN.h, proc = PROC) => groundRadius(VS, alertTime(h, proc), h)
export const WARN_CITIES: CityKey[] = ['dujiangyan', 'wenchuan', 'chengdu', 'mianyang']

// ---------- 第 5 课：找到震中 ----------
/** 一次假想的小地震（示意）：震中在成都平原北部，震源深 10 km */
export const QUIZ_QUAKE = { epi: [40, -55] as [number, number], h: 10 }
export const ABC = {
  A: { at: [20, -40] as [number, number] },
  B: { at: [75, -30] as [number, number] },
  C: { at: [20, -105] as [number, number] },
}
export type StationKey = keyof typeof ABC
/** 这个台站记录到的横波比纵波晚几秒 */
export const stationLag = (k: StationKey) => lagSP(Math.hypot(ABC[k].at[0] - QUIZ_QUAKE.epi[0], ABC[k].at[1] - QUIZ_QUAKE.epi[1]), QUIZ_QUAKE.h)
/** 由时间差算到震源的距离：D = 时间差 × 8.4 km/s */
export const hypoFromLag = (lag: number) => lag * K
/** 由时间差算震中距（画圆的半径）：先算震源距，再扣掉震源深度 */
export const radiusFromLag = (lag: number, h = QUIZ_QUAKE.h) => { const D = hypoFromLag(lag); return Math.sqrt(Math.max(0, D * D - h * h)) }
/** 几个圆的交点：离各圆周距离的平方和最小的那一点（在沙盘范围里网格搜索再细化） */
export function locate(cs: { c: [number, number]; r: number }[]) {
  const cost = (x: number, z: number) => cs.reduce((s, { c, r }) => s + (Math.hypot(x - c[0], z - c[1]) - r) ** 2, 0)
  let bx = 0, bz = 0, bc = Infinity
  for (let x = -70; x <= 110; x += 2) for (let z = -135; z <= 25; z += 2) { const v = cost(x, z); if (v < bc) { bc = v; bx = x; bz = z } }
  for (let step = 1; step > 0.01; step /= 2) for (let k = 0; k < 8; k++) {
    let moved = false
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) { const v = cost(bx + dx, bz + dz); if (v < bc) { bc = v; bx += dx; bz += dz; moved = true } }
    if (!moved) break
  }
  return { at: [bx, bz] as [number, number], err: Math.sqrt(bc / cs.length) }
}
/** 两个圆的交点（没有交点时为空） */
export function circleCross(a: { c: [number, number]; r: number }, b: { c: [number, number]; r: number }): [number, number][] {
  const dx = b.c[0] - a.c[0], dz = b.c[1] - a.c[1], d = Math.hypot(dx, dz)
  if (d > a.r + b.r || d < Math.abs(a.r - b.r) || d === 0) return []
  const l = (a.r * a.r - b.r * b.r + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, a.r * a.r - l * l))
  const mx = a.c[0] + (dx * l) / d, mz = a.c[1] + (dz * l) / d
  return [[mx + (dz * hh) / d, mz - (dx * hh) / d], [mx - (dz * hh) / d, mz + (dx * hh) / d]]
}

// ---------- 第 6 课：看穿地球（简化的地球模型，参照 PREM 取整） ----------
export const R_E = 6371, R_MOHO = 6338, R_660 = 5711, R_CMB = 3480, R_ICB = 1221
/** 古登堡面的深度（km） */
export const D_CMB = R_E - R_CMB
/** 内核和外核分界的深度（km） */
export const D_ICB = R_E - R_ICB
export type Layer = '地壳' | '地幔' | '外核' | '内核'
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** 半径 r（km）处的纵波、横波速度（km/s）和所在的圈层 */
export function vel(r: number): { vp: number; vs: number; layer: Layer } {
  if (r >= R_MOHO) { const t = (R_E - r) / (R_E - R_MOHO); return { vp: lerp(5.8, 6.5, t), vs: lerp(3.4, 3.75, t), layer: '地壳' } }
  if (r >= R_660) { const t = (R_MOHO - r) / (R_MOHO - R_660); return { vp: lerp(8.0, 10.3, t), vs: lerp(4.45, 5.6, t), layer: '地幔' } }
  if (r >= R_CMB) { const t = (R_660 - r) / (R_660 - R_CMB); return { vp: lerp(10.75, 13.7, t), vs: lerp(5.95, 7.25, t), layer: '地幔' } }
  if (r >= R_ICB) { const t = (R_CMB - r) / (R_CMB - R_ICB); return { vp: lerp(8.0, 10.36, t), vs: 0, layer: '外核' } }
  const t = (R_ICB - r) / R_ICB; return { vp: lerp(11.03, 11.26, t), vs: lerp(3.5, 3.67, t), layer: '内核' }
}
export const velAtDepth = (d: number) => vel(R_E - d)
const shell = (r: number) => (r >= R_MOHO ? 0 : r >= R_660 ? 1 : r >= R_CMB ? 2 : r >= R_ICB ? 3 : 4)
/** 纵波影区：离震中多少度到多少度之间收不到直达的纵波和横波（按课本） */
export const SHADOW: [number, number] = [104, 143]
/** 离震中 deg 度的地方能收到什么 */
export const receives = (deg: number) => (deg < SHADOW[0] ? { p: true, s: true } : deg <= SHADOW[1] ? { p: false, s: false } : { p: true, s: false })

/** 一条射线上的点：[半径 km，离震中的角度 rad，走时 s] */
export type RayPt = [number, number, number]
/**
 * 球对称地球里的一条地震射线：射线参数 p = r·sin i / v 守恒，逐段往前走；遇到速度突变的界面按折射定律换方向，
 * 进不去的（全反射）就折回；横波碰到外核（速度为 0）就停下。i0 是离开震源时和竖直向下方向的夹角（度）
 */
export function traceRay(i0: number, wave: 'P' | 'S', depth = 20, ds = 8): { pts: RayPt[]; end: 'surface' | 'stop' | 'lost' } {
  const v = (r: number) => (wave === 'P' ? vel(r).vp : vel(r).vs)
  let r = R_E - depth, phi = 0, dir = -1, t = 0
  const p = (r * Math.sin((i0 * Math.PI) / 180)) / v(r)
  const pts: RayPt[] = [[r, phi, 0]]
  for (let k = 0; k < 8000; k++) {
    const vr = v(r); if (vr <= 0) return { pts, end: 'stop' }
    let si = (p * vr) / r; if (si >= 1) { si = 1; if (dir < 0) dir = 1 }
    const ci = Math.sqrt(Math.max(0, 1 - si * si))
    let nr = r + dir * Math.max(ci, 0.02) * ds
    if (dir < 0 && nr <= 0) { phi += Math.PI; nr = -nr; dir = 1 }
    if (shell(nr) !== shell(r)) {
      const v2 = v(nr + dir * 0.5)
      if (v2 <= 0) { pts.push([dir < 0 ? Math.max(nr, R_CMB) : nr, phi, t + ds / vr]); return { pts, end: 'stop' } }
      if ((p * v2) / nr > 1) { dir = -dir; nr = r }
    }
    phi += (si * ds) / r; t += ds / vr; r = nr
    if (r >= R_E) { pts.push([R_E, phi, t]); return { pts, end: 'surface' } }
    pts.push([r, phi, t])
  }
  return { pts, end: 'lost' }
}
/** 第 6 课画出来的一把射线：离开震源的角度从陡到缓 */
export function rayFan(wave: 'P' | 'S') {
  const angs: number[] = []
  for (let i = 2; i < 16; i += 1.1) angs.push(i)
  for (let i = 16; i < 40; i += 1.6) angs.push(i)
  for (let i = 40; i < 88; i += 6) angs.push(i)
  // 简化模型里有一两条穿过内核的纵波会落进影区（实际上那里只有很弱的反射波），不画
  return angs.map(a => traceRay(a, wave, 20, 12)).filter(r => { const d = landDeg(r); return d === null || d < SHADOW[0] || d >= SHADOW[1] })
}
/** 射线落到地面的地方离震中多少度 */
export const landDeg = (ray: { pts: RayPt[]; end: string }) => {
  if (ray.end !== 'surface') return null
  let d = ((ray.pts[ray.pts.length - 1][1] * 180) / Math.PI) % 360
  if (d > 180) d = 360 - d
  return d
}

// ---------- 第 7 课：房屋抗震 ----------
/** 楼的固有周期（s）：经验上约为层数 × 0.1 s */
export const natPeriod = (floors: number) => Math.max(0.08, 0.1 * floors)
export const BUILDINGS = [
  { key: 'low', floors: 3, name: '3 层' },
  { key: 'mid', floors: 10, name: '10 层' },
  { key: 'high', floors: 20, name: '20 层' },
] as const
export type BuildingKey = (typeof BUILDINGS)[number]['key']
/** 楼本身的阻尼比：一般的楼约 5%；装了阻尼器的示意取 20% */
export const ZETA = 0.05, ZETA_DAMPED = 0.2
/** 地震波的几种主要周期（s） */
export const WAVE_T = { short: 0.3, one: 1, two: 2 } as const
export type WaveT = keyof typeof WAVE_T
/**
 * 地面按周期 Tg 来回晃时，楼顶晃动是地面的几倍（绝对加速度的传递率），以及楼顶比地面晚多少（相位，rad）。
 * 楼看成一个单自由度的振子：r = Tn / Tg，TR = √(1 + (2ζr)²) / √((1 − r²)² + (2ζr)²)
 */
export function response(Tn: number, Tg: number, zeta = ZETA) {
  const r = Tn / Tg, a = 1 - r * r, b = 2 * zeta * r
  return { tr: Math.sqrt(1 + b * b) / Math.sqrt(a * a + b * b), phase: Math.atan2(2 * zeta * r * r * r, a + b * b) }
}
export const buildingTR = (floors: number, Tg: number, damped = false) => response(natPeriod(floors), Tg, damped ? ZETA_DAMPED : ZETA).tr
/** 晃得最凶的那栋 */
export function worst(Tg: number) {
  let k: BuildingKey = 'low', v = -1
  for (const b of BUILDINGS) { const tr = buildingTR(b.floors, Tg); if (tr > v) { v = tr; k = b.key } }
  return k
}

// ---------- 拓展：预警响了 ----------
/** 拓展课里，教学楼收到警报时横波还有几秒到（示意，和第 4 课成都的情况差不多） */
export const SCHOOL_LEAD = 10

/** 地震后 t 秒，速度 v 的波前离震源多远（km） */
export const frontDist = (v: number, t: number) => v * t
