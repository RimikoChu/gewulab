// 万有引力与航天实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 物理量一律用国际单位（m、s、kg）。取值约定写在规格卡 docs/specs/gravity.md 里。

// ---------- 常量 ----------
export const G = 6.67e-11              // 引力常量 N·m²/kg²
export const g = 9.8                   // 地面重力加速度 m/s²
export const R_E = 6.371e6             // 地球平均半径 m
export const M_E = 5.97e24             // 地球质量 kg（用来算卫星；第 4 课由学生自己“称”出来）
export const MU = G * M_E              // 地球的 GM
export const DAY = 86400               // 一天 s
export const AU = 1.496e11             // 日地平均距离 m
export const YEAR = 3.156e7            // 一年 s
export const M_SUN = 1.989e30          // 太阳质量 kg
export const MOON = { r: 3.84e8, T: 27.3 * DAY, R: 1.737e6, M: 7.35e22 }   // 月球：轨道半径、公转周期、半径、质量
export const MARS = { R: 3.39e6, M: 6.42e23 }

export const km = (m: number) => m / 1000
/** 科学计数法：5.96 × 10²⁴ 这样写 */
export function sci(x: number, d = 2) {
  if (x === 0) return '0'
  const e = Math.floor(Math.log10(Math.abs(x))), m = x / 10 ** e
  const sup = String(e).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] ?? (c === '-' ? '⁻' : c)).join('')
  return `${m.toFixed(d)} × 10${sup}`
}

// ---------- 第 1 课：开普勒第一、第二定律 ----------
/** 示意行星：半长轴 1 AU、偏心率 0.5、周期 1 年（真实行星的轨道都接近圆，这颗是为了看清楚故意画扁的） */
export const SHOW = { a: AU, e: 0.5, T: YEAR }
/** 解开普勒方程：时间 t（从近日点算起，单位：周期）→ 偏近点角 */
export function eccAnomaly(frac: number, e: number) {
  const M = 2 * Math.PI * (frac - Math.floor(frac))
  let E = e > 0.8 ? Math.PI : M
  for (let i = 0; i < 30; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  return E
}
/** 椭圆轨道上的位置（太阳在焦点、原点；近日点在 +x）。a 为半长轴，frac 为过近日点后的时间（以周期计） */
export function orbitPos(a: number, e: number, frac: number): [number, number] {
  const E = eccAnomaly(frac, e)
  return [a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E)]
}
/** 行星和太阳连线在 frac0 到 frac1 这段时间里扫过的面积（数值积分，单位和 a² 一样） */
export function sweptArea(a: number, e: number, frac0: number, frac1: number, n = 400) {
  let s = 0, [x0, y0] = orbitPos(a, e, frac0)
  for (let i = 1; i <= n; i++) { const [x, y] = orbitPos(a, e, frac0 + (frac1 - frac0) * i / n); s += (x0 * y - x * y0) / 2; x0 = x; y0 = y }
  return Math.abs(s)
}
export const ellipseArea = (a: number, e: number) => Math.PI * a * a * Math.sqrt(1 - e * e)
/** 绕太阳的速度（活力公式）m/s：r 是到太阳的距离 */
export const sunSpeed = (a: number, r: number) => Math.sqrt(G * M_SUN * (2 / r - 1 / a))
/** 示意行星在 frac0 到 frac1 这段时间扫过的面积占整个椭圆的几分之几 */
export const areaShare = (frac0: number, frac1: number) => sweptArea(1, SHOW.e, frac0, frac1) / ellipseArea(1, SHOW.e)
/** 示意行星此刻到太阳的距离（m）和速度（m/s） */
export const showState = (frac: number) => { const [x, y] = orbitPos(SHOW.a, SHOW.e, frac), r = Math.hypot(x, y); return { r, v: sunSpeed(SHOW.a, r) } }
export const toAU = (m: number) => m / AU
export const perihelion = (a: number, e: number) => a * (1 - e)
export const aphelion = (a: number, e: number) => a * (1 + e)

// ---------- 第 2 课：开普勒第三定律 ----------
/** 行星的轨道半长轴（AU）和公转周期（年） */
export const PLANETS = {
  mercury: { name: '水星', a: 0.387, T: 0.241, color: '#b8ada0', size: 0.9 },
  venus: { name: '金星', a: 0.723, T: 0.615, color: '#e8cf9a', size: 1.3 },
  earth: { name: '地球', a: 1.0, T: 1.0, color: '#5f9be0', size: 1.35 },
  mars: { name: '火星', a: 1.524, T: 1.881, color: '#c9643c', size: 1.1 },
  jupiter: { name: '木星', a: 5.203, T: 11.86, color: '#d8b78e', size: 2.6 },
} as const
export type PlanetKey = keyof typeof PLANETS
/** T²–a³ 图上的点：a³（AU³）、T²（年²） */
export const chartPoint = (p: PlanetKey) => ({ a3: PLANETS[p].a ** 3, t2: PLANETS[p].T ** 2 })
/** a³/T²（m³/s²）：对绕太阳的行星都一样 */
export const keplerK = (p: PlanetKey) => (PLANETS[p].a * AU) ** 3 / (PLANETS[p].T * YEAR) ** 2
/** 用太阳质量算出来的 k = GM/(4π²) */
export const sunK = () => G * M_SUN / (4 * Math.PI ** 2)

// ---------- 第 3 课：卡文迪什扭秤 ----------
/** 这台扭秤的参数（示意）：大铅球 M、小铅球 m、两球球心距 r、T 形架两小球的距离 L、石英丝的扭转系数 κ、镜子到刻度尺 D */
export const BAL = { M: 158, m: 0.73, r: 0.225, L: 1.8, kappa: 6.0e-5, D: 5 }
/** 一个大球吸一个小球的力 N */
export const ballForce = (Gv = G) => Gv * BAL.M * BAL.m / BAL.r ** 2
/** 扭转角 rad：两对引力的力矩 F·L 和石英丝的回复力矩 κθ 平衡 */
export const twist = (Gv = G) => ballForce(Gv) * BAL.L / BAL.kappa
/** 镜子转过 θ 时光点在尺上的位置 m：反射光转 2θ */
export const spotOf = (theta: number) => BAL.D * Math.tan(2 * theta)
/** 光点在刻度尺上移动的距离 m */
export const spotShift = (Gv = G) => spotOf(twist(Gv))
/** 扭转后来回摆动、慢慢停下：t 秒时的扭转角（示意：真实的扭秤摆一个来回要几分钟，这里放快了） */
export const swing = (from: number, to: number, t: number) => to + (from - to) * Math.exp(-t / 1.6) * Math.cos(t * 2.4)
/** 由光点移动量反算 G：大球从一侧换到另一侧，光点移动 2s */
export function measureG(shiftBothSides: number) {
  const theta = Math.atan(shiftBothSides / 2 / BAL.D) / 2
  return BAL.kappa * theta / BAL.L * BAL.r ** 2 / (BAL.M * BAL.m)
}

// ---------- 第 4 课：称量地球质量 ----------
/** 地面上 mg = GMm/R²：M = gR²/G */
export const massFromG = (gv = g, R = R_E) => gv * R * R / G
/** 月球绕地球：GMm/r² = m·4π²r/T²，M = 4π²r³/(GT²) */
export const massFromOrbit = (r: number, T: number) => 4 * Math.PI ** 2 * r ** 3 / (G * T * T)
/** 贴着地面飞的卫星周期 s */
export const nearPeriod = () => 2 * Math.PI * Math.sqrt(R_E ** 3 / MU)
/** 密度：ρ = M/(4πR³/3)；对贴着表面飞的卫星，化简成 3π/(GT²) */
export const density = (M: number, R = R_E) => M / (4 / 3 * Math.PI * R ** 3)
export const densityFromNear = (T: number) => 3 * Math.PI / (G * T * T)

// ---------- 第 5 课：宇宙速度 ----------
/** 第一宇宙速度：v = √(GM/R) */
export const v1 = (mu = MU, R = R_E) => Math.sqrt(mu / R)
/** 用地面的 g：v = √(gR) */
export const v1FromG = () => Math.sqrt(g * R_E)
/** 第二宇宙速度：v = √(2GM/R) */
export const v2 = (mu = MU, R = R_E) => Math.sqrt(2 * mu / R)
/** 第三宇宙速度：先在地球轨道上逃出太阳要多出的那份速度 (√2 − 1)·v地，再加上逃出地球 */
export function v3() {
  const vE = Math.sqrt(G * M_SUN / AU), inf = (Math.SQRT2 - 1) * vE
  return Math.sqrt(inf * inf + v2() ** 2)
}
/** 牛顿设想的高山：山顶在大气层以上（示意取 400 km），水平打出炮弹，不计空气 */
export const PEAK = 4.0e5
/** 能选的出口速度 m/s */
export const SHOTS = [2000, 4000, 6000, 7900, 11200] as const
export type Shot = typeof SHOTS[number]
/** 从山顶水平打出去，每隔 dt 秒的位置（地心为原点、单位 m、山顶在 +y 上方，炮口朝 +x）。落地、绕回山顶或飞出 rMax 时停 */
export function cannonPath(v: number, { h0 = PEAK, dt = 10, tMax = 8 * 3600, rMax = 9 * R_E } = {}) {
  let x = 0, y = R_E + h0, vx = v, vy = 0
  const pts: [number, number][] = [[x, y]]
  const acc = (px: number, py: number): [number, number] => { const r = Math.hypot(px, py), k = -MU / r ** 3; return [k * px, k * py] }
  let turned = 0, prev = 0
  for (let t = 0; t < tMax; t += dt) {
    // 四阶龙格-库塔
    const [ax1, ay1] = acc(x, y)
    const [ax2, ay2] = acc(x + vx * dt / 2, y + vy * dt / 2)
    const [ax3, ay3] = acc(x + (vx + ax1 * dt / 2) * dt / 2, y + (vy + ay1 * dt / 2) * dt / 2)
    const [ax4, ay4] = acc(x + (vx + ax2 * dt / 2) * dt, y + (vy + ay2 * dt / 2) * dt)
    const k2x = vx + ax1 * dt / 2, k2y = vy + ay1 * dt / 2, k3x = vx + ax2 * dt / 2, k3y = vy + ay2 * dt / 2, k4x = vx + ax3 * dt, k4y = vy + ay3 * dt
    x += (vx + 2 * k2x + 2 * k3x + k4x) * dt / 6; y += (vy + 2 * k2y + 2 * k3y + k4y) * dt / 6
    vx += (ax1 + 2 * ax2 + 2 * ax3 + ax4) * dt / 6; vy += (ay1 + 2 * ay2 + 2 * ay3 + ay4) * dt / 6
    const r = Math.hypot(x, y)
    if (r < R_E) { const k = R_E / r; pts.push([x * k, y * k]); break }   // 落到地面
    pts.push([x, y])
    if (r > rMax) break
    const ang = Math.atan2(x, y); let d = ang - prev; if (d < -Math.PI) d += 2 * Math.PI; if (d > Math.PI) d -= 2 * Math.PI
    turned += d; prev = ang
    if (turned >= 2 * Math.PI) break                                     // 绕回了山顶
  }
  return pts
}
/** 这个速度打出去会怎样：落回地面、绕地球转、一去不回 */
export function shotFate(v: number): 'fall' | 'orbit' | 'escape' {
  const p = cannonPath(v), [x, y] = p[p.length - 1], r = Math.hypot(x, y)
  return r <= R_E * 1.0001 ? 'fall' : r > 8 * R_E ? 'escape' : 'orbit'
}
/** 落点离山脚的地面距离 m（没落地返回 null） */
export function cannonRange(v: number) {
  if (shotFate(v) !== 'fall') return null
  const p = cannonPath(v), [x, y] = p[p.length - 1], ang = Math.atan2(x, y)
  return R_E * (ang < 0 ? ang + 2 * Math.PI : ang)
}

// ---------- 第 6 课：人造卫星 ----------
/** 圆轨道的线速度 m/s、角速度 rad/s、周期 s */
export const circV = (r: number) => Math.sqrt(MU / r)
export const circW = (r: number) => Math.sqrt(MU / r ** 3)
export const circT = (r: number) => 2 * Math.PI * Math.sqrt(r ** 3 / MU)
/** 周期为 T 的圆轨道半径 */
export const radiusForPeriod = (T: number) => Math.cbrt(MU * T * T / (4 * Math.PI ** 2))
/** 同步卫星：周期 24 h */
export const GEO_R = radiusForPeriod(DAY)
export const ORBITS = {
  leo: { name: '近地轨道', r: 6.7e6 },
  meo: { name: '中圆轨道', r: 2.79e7 },
  geo: { name: '同步轨道', r: GEO_R },
} as const
export type OrbitKey = keyof typeof ORBITS
export const height = (r: number) => r - R_E

// ---------- 第 7 课：卫星变轨 ----------
/** 近地圆轨道 → 椭圆转移轨道 → 同步圆轨道：两次点火的速度 m/s */
export function transfer(r1 = ORBITS.leo.r, r2 = GEO_R) {
  const a = (r1 + r2) / 2
  const c1 = circV(r1), c2 = circV(r2)
  const vp = Math.sqrt(MU * (2 / r1 - 1 / a)), va = Math.sqrt(MU * (2 / r2 - 1 / a))
  return { c1, vp, dv1: vp - c1, va, c2, dv2: c2 - va, a, e: (r2 - r1) / (r2 + r1), half: Math.PI * Math.sqrt(a ** 3 / MU) }
}
/** 转移轨道上的位置（近地点在 +x，地心为原点），frac 为过近地点后的时间（以转移轨道周期计） */
export const transferPos = (frac: number, r1 = ORBITS.leo.r, r2 = GEO_R) => { const t = transfer(r1, r2); return orbitPos(t.a, t.e, frac) }
/** 椭圆轨道上离中心 r 处的速度 */
export const ellipseSpeed = (a: number, r: number) => Math.sqrt(MU * (2 / r - 1 / a))

// ---------- 拓展：空间站、月球上的第一宇宙速度 ----------
/** 空间站轨道高度约 400 km */
export const STATION_H = 4.0e5
export const stationT = () => circT(R_E + STATION_H)
/** 一天绕地球几圈 */
export const laps = (T: number) => DAY / T
export const BODIES = {
  earth: { name: '地球', M: M_E, R: R_E },
  moon: { name: '月球', M: MOON.M, R: MOON.R },
  mars: { name: '火星', M: MARS.M, R: MARS.R },
} as const
export type BodyKey = keyof typeof BODIES
export const bodyV1 = (b: BodyKey) => Math.sqrt(G * BODIES[b].M / BODIES[b].R)
export const bodyG = (b: BodyKey) => G * BODIES[b].M / BODIES[b].R ** 2
/** 贴着星球表面绕一圈的周期 s */
export const lowOrbitT = (b: BodyKey) => 2 * Math.PI * BODIES[b].R / bodyV1(b)
