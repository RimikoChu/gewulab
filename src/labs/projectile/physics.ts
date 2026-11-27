// 抛体运动实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 物理量一律用国际单位；场景单位 1 = 1 m。取值约定写在规格卡 docs/specs/projectile.md 里。
// 全部不计空气阻力（拓展课“有风的空投”除外，那里的风按恒定的水平加速度算，是示意）。
export const G = 9.8 // m/s²（也就是 N/kg）

export const rad = (deg: number) => deg * Math.PI / 180
export const deg = (r: number) => r * 180 / Math.PI
/** 读数的写法：最多 n 位小数，去掉末尾的 0，负号用 − */
export const fmt = (x: number, n = 2) => { const s = String(+x.toFixed(n)); return s.startsWith('-') ? '−' + s.slice(1) : s }

// ---------- 通用：抛体 ----------
export interface State { x: number; y: number; vx: number; vy: number }
/** 从原点以 v0、仰角 deg 抛出，t 秒后的位置和速度（y 向上为正） */
export function fly(v0: number, angle: number, t: number): State {
  const vx = v0 * Math.cos(rad(angle)), vy0 = v0 * Math.sin(rad(angle))
  return { x: vx * t, y: vy0 * t - 0.5 * G * t * t, vx, vy: vy0 - G * t }
}
/** 从 h 高处自由下落（或平抛）到地面的时间 */
export const fallTime = (h: number) => Math.sqrt(2 * h / G)
/** 合速度的大小 */
export const speedOf = (vx: number, vy: number) => Math.hypot(vx, vy)
/** 速度方向和水平方向的夹角（度，取正） */
export const dipOf = (vx: number, vy: number) => deg(Math.atan2(Math.abs(vy), Math.abs(vx)))

// ---------- 第 1 课：弯道上的速度方向 ----------
/** 训练道路：直道 lead → 左弯 90°（半径 R）→ 直道 mid → 右弯 90° → 直道 lead。车速不变 */
export const ROAD = { R: 16, lead: 8, mid: 10, speed: 10 }
const ARC = ROAD.R * Math.PI / 2
export const ROAD_LEN = ROAD.lead * 2 + ARC * 2 + ROAD.mid
/** 路上三个标记点：A 在左弯正中，B 在中间直道正中，C 在右弯正中 */
export const MARKS = [
  { key: 'A', s: ROAD.lead + ARC / 2 },
  { key: 'B', s: ROAD.lead + ARC + ROAD.mid / 2 },
  { key: 'C', s: ROAD.lead + ARC + ROAD.mid + ARC / 2 },
] as const
export type MarkKey = typeof MARKS[number]['key']
/**
 * 沿路走了 s 米时车在哪、朝哪。坐标：x 是出发时的前进方向，z 是出发时的左手边。
 * heading：速度方向和出发方向的夹角（度，往左为正）；turn：这一段往哪边弯（1 左、−1 右、0 直）
 */
export function roadAt(s: number): { x: number; z: number; heading: number; turn: 1 | 0 | -1 } {
  const { R, lead, mid } = ROAD
  s = Math.min(Math.max(s, 0), ROAD_LEN)
  if (s <= lead) return { x: s, z: 0, heading: 0, turn: 0 }
  s -= lead
  if (s <= ARC) { const a = s / R; return { x: lead + R * Math.sin(a), z: R * (1 - Math.cos(a)), heading: deg(a), turn: 1 } }
  s -= ARC
  if (s <= mid) return { x: lead + R, z: R + s, heading: 90, turn: 0 }
  s -= mid
  if (s <= ARC) { const a = s / R; return { x: lead + R + R * (1 - Math.cos(a)), z: R + mid + R * Math.sin(a), heading: 90 - deg(a), turn: -1 } }
  s -= ARC
  return { x: lead + 2 * R + s, z: 2 * R + mid, heading: 0, turn: 0 }
}
/** 速度的方向（单位向量，切线方向） */
export function tangentAt(s: number): [number, number] { const h = rad(roadAt(s).heading); return [Math.cos(h), Math.sin(h)] }
/** 合力的方向：弯道上指向弯道内侧（垂直于速度）；直道上合力为零，返回 null */
export function forceDirAt(s: number): [number, number] | null {
  const p = roadAt(s); if (!p.turn) return null
  const h = rad(p.heading); return [-Math.sin(h) * p.turn, Math.cos(h) * p.turn]
}

// ---------- 第 2 课：小船过河 ----------
export const RIVER = { width: 30, vBoat: 5, vWater: 3 }
/** 船头的两种指向：正对对岸；偏向上游，使合速度正对对岸（sin θ = v水 ÷ v船） */
export const HEADS = {
  straight: { name: '正对对岸', angle: 0 },
  up: { name: '偏向上游 37°', angle: deg(Math.asin(RIVER.vWater / RIVER.vBoat)) },
} as const
export type HeadKey = keyof typeof HEADS
/** 过河：船头偏向上游 angle 度。along：沿河岸的分速度（顺水为正）；across：垂直河岸的分速度 */
export function cross(angle: number) {
  const { width, vBoat, vWater } = RIVER
  const along = vWater - vBoat * Math.sin(rad(angle)), across = vBoat * Math.cos(rad(angle))
  const time = width / across, drift = along * time
  return { along, across, v: Math.hypot(along, across), time, drift, path: Math.hypot(width, drift) }
}
/** 开船 t 秒后船的位置：x 顺水漂了多远，y 离出发的岸多远 */
export function boatAt(angle: number, t: number): [number, number] { const c = cross(angle), tt = Math.min(Math.max(t, 0), c.time); return [c.along * tt, c.across * tt] }

// ---------- 第 3 课：平抛和自由落体同时落地；频闪 ----------
export const DRONE = { h: 19.6, speeds: [10, 5] as const, strobe: 0.5 }
/** 平抛 t 秒后：x 水平走了多远，drop 往下落了多少 */
export function flat(v0: number, t: number) { return { x: v0 * t, drop: 0.5 * G * t * t, vx: v0, vy: G * t } }
/** 频闪的各个时刻：从 0 起每隔 dt 一次，到落地为止 */
export function strobeTimes(h: number, dt: number) { const T = fallTime(h), out: number[] = []; for (let i = 0; i * dt <= T + 1e-9; i++) out.push(i * dt); return out }

// ---------- 第 4 课：斜槽小球，描轨迹求初速度 ----------
/** 小球离开槽口的速度（m/s）；挡板三次放的深度（m，从槽口往下量） */
export const RAMP = { v0: 1.2, drops: [0.049, 0.196, 0.441] as const }
/** 挡板放在 drop 深处时，小球打在板上离槽口多远（m） */
export const hitX = (drop: number, v0 = RAMP.v0) => v0 * Math.sqrt(2 * drop / G)
/** 由轨迹上一个点 (x, y) 求初速度：v0 = x √(g ÷ 2y) */
export const v0From = (x: number, y: number) => x * Math.sqrt(G / (2 * y))

// ---------- 第 5 课：空投，提前多远投 ----------
export const HELI = { v0: 20, heights: { low: 19.6, high: 44.1 } as const, leads: [40, 60] as const }
export type HeightKey = keyof typeof HELI.heights
/** 从 h 高处以 v0 水平投下：下落时间、水平走的距离、落地时的速度（分量、大小、和水平方向的夹角） */
export function airdrop(h: number, v0 = HELI.v0) {
  const t = fallTime(h), vy = G * t
  return { t, x: v0 * t, vx: v0, vy, v: speedOf(v0, vy), dip: dipOf(v0, vy) }
}
/** 提前 lead 米投放，落点比目标远多少（正：越过了；负：没到；0：正中） */
export const overshoot = (h: number, lead: number, v0 = HELI.v0) => airdrop(h, v0).x - lead

// ---------- 第 6 课：斜抛的射高和射程 ----------
export const CANNON = { v0: 14, angles: [30, 45, 60] as const, pot: 20 }
/** 落回和炮口同高处的时间、水平射程、射高 */
export const flightTime = (v0: number, angle: number) => 2 * v0 * Math.sin(rad(angle)) / G
export const rangeOf = (v0: number, angle: number) => v0 * v0 * Math.sin(rad(2 * angle)) / G
export const apexOf = (v0: number, angle: number) => (v0 * Math.sin(rad(angle))) ** 2 / (2 * G)

// ---------- 第 7 课：打中山坡上的火点 ----------
/**
 * 以炮口为原点。炮口离地 muzzle；山坡从炮口前 foot 米处起，坡度 slope（每进 1 m 升 slope m），升到 top 高为止是平顶。
 * 火点在水平 fire.x、比炮口高 fire.y 的坡面上。水压三档对应三种出口速度
 */
export const HILL = { muzzle: 1.6, foot: 10, slope: 0.5, top: 20, fire: { x: 30, y: 10 }, speeds: [14, 21, 28] as const, angles: [30, 45, 60] as const }
/** 炮口前 x 米处地面的高度（相对炮口） */
export const profile = (x: number) => Math.min(HILL.top, Math.max(-HILL.muzzle, HILL.slope * (x - HILL.foot)))
/** 水柱在水平 x 处的高度：y = x tan θ − g x² ÷ (2 v0² cos² θ) */
export const heightAt = (v0: number, angle: number, x: number) => x * Math.tan(rad(angle)) - G * x * x / (2 * (v0 * Math.cos(rad(angle))) ** 2)
/** 水柱落在地面（山坡）上的位置和时间：沿轨迹一小步一小步找到第一次碰到地面的地方，再二分 */
export function landOn(v0: number, angle: number, ground: (x: number) => number = profile) {
  let lo = 0.05, hi = lo
  const above = (t: number) => { const s = fly(v0, angle, t); return s.y - ground(s.x) }
  while (above(hi) > 0 && hi < 60) { lo = hi; hi += 0.02 }
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (above(m) > 0) lo = m; else hi = m }
  const s = fly(v0, angle, hi)
  return { t: hi, x: s.x, y: s.y }
}
export type Shot = 'hit' | 'short' | 'low' | 'over'
/** 这一炮打得怎样：hit 打中火点；short 够不着（落点离火点水平超过 12 m）；low 打低了（落在火点下方的坡上）；over 从火点上方越过去 */
export function judge(v0: number, angle: number): Shot {
  const d = heightAt(v0, angle, HILL.fire.x) - HILL.fire.y
  if (Math.abs(d) < 0.5) return 'hit'
  if (d > 0) return 'over'
  return landOn(v0, angle).x < HILL.fire.x - 12 ? 'short' : 'low'
}

// ---------- 拓展 ----------
/** 斜面上的平抛：从坡顶水平抛出，坡度 tan θ = slope。落到坡面的时间 t = 2 v0 tan θ ÷ g */
export const SLOPE = { slope: 0.5, speeds: [9.8, 19.6] as const }
export function slopeThrow(v0: number, slope = SLOPE.slope) {
  const t = 2 * v0 * slope / G, x = v0 * t, drop = 0.5 * G * t * t, vy = G * t
  return { t, x, drop, along: Math.hypot(x, drop), vy, dip: dipOf(v0, vy) }
}
/** 有风的空投（示意）：风让物资在水平方向有一个恒定的加速度 a（逆风为负）。竖直方向不变 */
export const WIND = { h: HELI.heights.low, v0: HELI.v0, a: -2 }
export function windDrop(a: number, h = WIND.h, v0 = WIND.v0) { const t = fallTime(h); return { t, x: v0 * t + 0.5 * a * t * t } }
/** 有风时 t 秒后的位置 */
export function windAt(a: number, t: number, v0 = WIND.v0) { return { x: v0 * t + 0.5 * a * t * t, drop: 0.5 * G * t * t } }
