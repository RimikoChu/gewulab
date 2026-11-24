// 板块运动实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 经纬度用“度”（东经、北纬为正）；球面上的方向向量和地球的运动实验室一样：x 朝经度 0°，y 朝北极，z 朝西经 90°。
// 取值约定和每个数的来历写在规格卡 docs/specs/plate.md 里。
import { EXTRA_SEEDS, PLATES, PLATE_KEYS, QUAKES, RIFT, SEGS, VOLCANOES, type Belt, type LL, type PlateKey } from './plates'

const RAD = Math.PI / 180
export const R_EARTH = 6371                       // 地球平均半径（km）
export type V3 = [number, number, number]

// ---------- 球面上的几何 ----------
/** 经纬度 → 单位向量 */
export const toVec = ([lon, lat]: LL): V3 => { const c = Math.cos(lat * RAD); return [c * Math.cos(lon * RAD), Math.sin(lat * RAD), -c * Math.sin(lon * RAD)] }
/** 单位向量 → 经纬度 */
export const toLL = ([x, y, z]: V3): LL => [Math.atan2(-z, x) / RAD, Math.asin(Math.max(-1, Math.min(1, y))) / RAD]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
/** 绕过球心的轴 k（单位向量）转 deg 度（右手定则） */
export function rotate(v: V3, k: V3, deg: number): V3 {
  const t = deg * RAD, c = Math.cos(t), s = Math.sin(t), kv = cross(k, v), d = dot(k, v) * (1 - c)
  return [v[0] * c + kv[0] * s + k[0] * d, v[1] * c + kv[1] * s + k[1] * d, v[2] * c + kv[2] * s + k[2] * d]
}
/** 球面上两点之间的距离（km，沿大圆） */
export const distKm = (a: LL, b: LL) => Math.acos(Math.max(-1, Math.min(1, dot(toVec(a), toVec(b))))) * R_EARTH
/** 一点到一条折线（沿大圆的各段）的最近距离（km） */
export function distToLine(p: LL, line: LL[]) {
  const v = toVec(p); let best = Infinity
  for (let i = 0; i < line.length - 1; i++) {
    const a = toVec(line[i]), b = toVec(line[i + 1]), n = cross(a, b), nl = Math.hypot(...n)
    if (nl < 1e-9) { best = Math.min(best, distKm(p, line[i])); continue }
    const u: V3 = [n[0] / nl, n[1] / nl, n[2] / nl], off = Math.asin(Math.max(-1, Math.min(1, dot(v, u))))
    // 垂足落在这一段之内才算垂直距离，否则算到两头的距离
    const f: V3 = [v[0] - u[0] * Math.sin(off), v[1] - u[1] * Math.sin(off), v[2] - u[2] * Math.sin(off)]
    const inside = dot(cross(a, f), n) >= 0 && dot(cross(f, b), n) >= 0
    best = Math.min(best, inside ? Math.abs(off) * R_EARTH : Math.min(distKm(p, line[i]), distKm(p, line[i + 1])))
  }
  return best
}

// ---------- 第 1 课 大陆漂移的猜想 ----------
/** 把南美洲拼回非洲的转动：绕欧拉极转一个角度（布拉德等人 1965 年的拼合，数值待核实）。南美洲不动，非洲不动，只转南美 */
export const FIT = { pole: [-30.6, 44] as LL, angle: 57 }
export const FIT_AXIS = toVec(FIT.pole)
/** 合拢到 k（0 是今天，1 是拼在一起）时，南美洲上的一点转到哪里 */
export const driftSA = (p: LL, k: number): LL => toLL(rotate(toVec(p), FIT_AXIS, FIT.angle * k))
/** 巴西东北角的纳塔尔：南美洲伸进大西洋最远的地方 */
export const NATAL: LL = [-35.2, -5.8]
/** 拼在一起时纳塔尔贴着的那一处非洲海岸 */
export const NATAL_FIT = driftSA(NATAL, 1)
/** 大西洋的宽度：纳塔尔到它拼合时贴着的那处非洲海岸（km） */
export const atlanticGap = (k: number) => distKm(driftSA(NATAL, k), NATAL_FIT)
/** 南大西洋开始张开的年代（亿年前，约数，待核实） */
export const OPEN_AGE = 1.3
/** 合拢到 k 时，对应大约多少亿年前（按匀速张开估） */
export const ageAt = (k: number) => k * OPEN_AGE
/** 证据：同一种化石（中龙）、同样的古老岩层，分别在两岸的位置 */
export const FOSSIL = { sa: [[-50, -24], [-55, -31]] as LL[], af: [[16.5, -26], [19, -30.5]] as LL[] }
export const OLD_ROCK = { sa: [[-44.5, -3], [-40, -7]] as LL[], af: [[-2, 7], [-7, 6]] as LL[] }

// ---------- 第 2 课 海底扩张 ----------
/** 大西洋中脊每一侧每年推开的距离（cm/a，约数，待核实；整个洋中脊张开的速度是它的两倍） */
export const HALF_RATE = 1.5
/** 离洋中脊 d km 的洋底岩石有多老（百万年）：d ÷ 每侧的扩张速度 */
export const rockAge = (dKm: number) => (Math.abs(dKm) * 1e5) / HALF_RATE / 1e6
/** 过了 t 百万年，洋中脊一侧新长出来多宽的洋底（km） */
export const spreadKm = (tMyr: number) => HALF_RATE * tMyr * 10
/** 钻探船可以去的几处：离洋中脊多远（km，西边为负） */
export const DRILL = { w60: { name: '西 60 km', d: -60 }, e60: { name: '东 60 km', d: 60 }, e120: { name: '东 120 km', d: 120 } } as const
export type DrillKey = keyof typeof DRILL
/** 年代写成“500 万年” */
export const ageText = (myr: number) => `${Math.round(myr * 100)} 万年`

// ---------- 第 3 课 六大板块 ----------
export const PLATE_COUNT = PLATE_KEYS.length
/** 岩石圈的厚度（km，约数）：板块就是一块块岩石圈，下面是软流层 */
export const LITHO_KM = 100

// ---------- 第 4 课 板块张裂 ----------
/** 张裂的几个阶段：完整的大陆、裂谷、狭长的海、大洋 */
export const RIFT_STAGES = [
  { key: 'whole', name: '完整的大陆', t: 0 },
  { key: 'rift', name: '裂谷', t: 5 },
  { key: 'sea', name: '狭长的海', t: 25 },
] as const
/** 张裂的速度（cm/a，两侧合起来，示意取值，待核实） */
export const RIFT_RATE = 1
/** 张开了 t 百万年以后，裂开的宽度（km） */
export const riftWidth = (tMyr: number) => RIFT_RATE * tMyr * 10

// ---------- 第 5 课 大陆和大陆相撞 ----------
/** 珠穆朗玛峰的高度（m，2020 年中国和尼泊尔共同公布） */
export const EVEREST = 8848.86
/** 青藏高原的平均海拔（m，教材写“4000 米以上”） */
export const TIBET = 4000
/** 碰撞进行到 p（0 还隔着大洋，1 是今天）时，最高峰的高度（m） */
export const peakAt = (p: number) => (p <= 0.45 ? 0 : EVEREST * Math.min(1, (p - 0.45) / 0.55) ** 0.8)
/** 印度洋板块向北推进的速度（cm/a，约数，待核实） */
export const INDIA_RATE = 5

// ---------- 第 6 课 大洋和大陆相撞 ----------
/** 俯冲下去的洋板块和水平面的夹角（度，示意取值） */
export const SLAB_DIP = 30
/** 地震震源：离海沟多远（km）、深多少（km）。洋板块顶面往下斜着插，离海沟越远震源越深 */
export const quakeDepth = (fromTrenchKm: number) => 8 + fromTrenchKm * Math.tan(SLAB_DIP * RAD)
export const FOCI = [60, 160, 300] as const
/** 智利—秘鲁海沟最深处（m，约数，待核实）、阿空加瓜山（m） */
export const TRENCH_DEPTH = 8000
export const ACONCAGUA = 6961

// ---------- 第 7 课 火山和地震带 ----------
/** 一点离最近的板块交界有多远（km）。东非大裂谷也算一处交界 */
export function nearestBoundary(p: LL): { km: number; belt: Belt } {
  let best = { km: Infinity, belt: 'none' as Belt }
  for (const s of SEGS) { const d = distToLine(p, s.line); if (d < best.km) best = { km: d, belt: s.belt } }
  const r = distToLine(p, RIFT); if (r < best.km) best = { km: r, belt: 'none' }
  return best
}
export const BELTS = { pacific: '环太平洋火山地震带', alpide: '地中海—喜马拉雅火山地震带' } as const
export type BeltKey = keyof typeof BELTS
/** 图上的火山、地震各有多少落在这条带上 */
export function beltCount(belt: BeltKey) {
  const v = VOLCANOES.filter(x => nearestBoundary(x.at).belt === belt).length
  const q = QUAKES.filter(x => nearestBoundary(x.at).belt === belt).length
  return { v, q, vAll: VOLCANOES.length, qAll: QUAKES.length }
}
/** 图上的火山和地震，离板块交界最远的那一个有多远（km） */
export const farthestFromBoundary = () => Math.max(...[...VOLCANOES, ...QUAKES].map(x => nearestBoundary(x.at).km))

// ---------- 拓展 ----------
/** 几个地方：离板块交界多远 */
export const PLACES = {
  tokyo: { name: '东京', at: [139.7, 35.7] as LL },
  iceland: { name: '雷克雅未克', at: [-21.9, 64.15] as LL },
  sydney: { name: '悉尼', at: [151.2, -33.9] as LL },
} as const
export type PlaceKey = keyof typeof PLACES
/** 板块移动的速度（cm/a）：走过的距离（km）÷ 用的时间（百万年） */
export const rateCmYr = (km: number, myr: number) => (km * 1e5) / (myr * 1e6)
/** 一年几厘米，走 t 百万年是多少千米 */
export const kmAfter = (cmYr: number, myr: number) => (cmYr * myr * 1e6) / 1e5

/** 板块的名字和填色用的种子点 */
export const plateName = (k: PlateKey) => PLATES[k].name
export const plateSeeds = (): [PlateKey, LL][] => [...PLATE_KEYS.map(k => [k, PLATES[k].seed] as [PlateKey, LL]), ...EXTRA_SEEDS]
