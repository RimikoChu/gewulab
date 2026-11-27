// 带电粒子在磁场中实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 物理量一律用国际单位；场景里 1 个单位 = 1 m。取值约定写在规格卡 docs/specs/bfield.md 里。

// ---------- 常量（CODATA 2018 推荐值） ----------
export const E = 1.602176634e-19        // 元电荷（C）
export const ME = 9.1093837015e-31      // 电子质量（kg）
export const MP = 1.67262192369e-27     // 质子质量（kg）
export const MA = 6.6446573357e-27      // α 粒子质量（kg）
export const U_AMU = 1.6605390666e-27   // 原子质量单位（kg）
export const G = 9.8                    // N/kg
export const MEV = 1e6 * E              // 1 MeV（J）

export type V2 = [number, number]
export type V3 = [number, number, number]

/** 一种带电粒子：电荷量（C，带正负号）和质量（kg） */
export interface Particle { name: string; q: number; m: number }
export const PARTICLES = {
  electron: { name: '电子', q: -E, m: ME },
  proton: { name: '质子', q: E, m: MP },
  alpha: { name: 'α 粒子', q: 2 * E, m: MA },
} satisfies Record<string, Particle>
export type ParticleKey = keyof typeof PARTICLES

// ---------- 通用公式 ----------
/** 安培力的大小 F = BIL sinθ（θ 是电流和磁场的夹角，默认垂直） */
export const ampere = (B: number, I: number, L: number, sin = 1) => B * I * L * sin
/** 洛伦兹力的大小 F = qvB（v 与 B 垂直） */
export const lorentz = (q: number, v: number, B: number) => Math.abs(q) * v * B
/** 经加速电压 U 从静止加速后的速度 v = √(2qU/m) */
export const speedAfter = (q: number, m: number, U: number) => Math.sqrt(2 * Math.abs(q) * U / m)
/** 匀强磁场中匀速圆周运动的半径 r = mv/(qB) */
export const radius = (m: number, v: number, q: number, B: number) => m * v / (Math.abs(q) * B)
/** 周期 T = 2πm/(qB)：和速度、半径都无关 */
export const period = (m: number, q: number, B: number) => 2 * Math.PI * m / (Math.abs(q) * B)
/** 比荷 q/m */
export const qm = (q: number, m: number) => Math.abs(q) / m

/** 三维叉乘 */
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
/** 洛伦兹力的方向 F ∝ q v × B（返回单位向量；v ∥ B 时为零向量） */
export function lorentzDir(q: number, v: V3, B: V3): V3 {
  const c = cross(v, B), s = Math.sign(q), l = Math.hypot(...c)
  return l < 1e-12 ? [0, 0, 0] : [c[0] / l * s, c[1] / l * s, c[2] / l * s]
}

/**
 * 圆弧上的点：从 p0 出发，初速度方向角 a0（弧度，平面内从 +x 量起），半径 r，turn = +1 逆时针 / −1 顺时针，走过弧长 s。
 * 返回位置和此刻的速度方向角。磁场垂直这个平面时，带电粒子就沿这样的圆弧走。
 */
export function arc(p0: V2, a0: number, r: number, turn: number, s: number): { p: V2; a: number } {
  const th = s / r, cx = p0[0] - turn * r * Math.sin(a0), cy = p0[1] + turn * r * Math.cos(a0), a = a0 + turn * th
  return { p: [cx + turn * r * Math.sin(a), cy - turn * r * Math.cos(a)], a }
}
/**
 * 粒子在垂直纸面的匀强磁场 Bz（+ 指向纸外）里的转向：F = q v × B。
 * 返回 +1（逆时针）或 −1（顺时针）。正电荷在指向纸外的磁场里顺时针转。
 */
export const turnSign = (q: number, Bz: number) => -Math.sign(q) * Math.sign(Bz)

/** 平面里在电场、磁场中运动的粒子：一步步积分出轨迹（速度选择器、磁流体发电机用）。E 是 [Ex, Ey]（V/m），Bz 垂直纸面（+ 指向纸外） */
export function crossedPath(p: Particle, v0: V2, E2: V2, Bz: number, { x0, x1, yLim, steps = 600, field = [-Infinity, Infinity] }: { x0: number; x1: number; yLim: number; steps?: number; field?: V2 }) {
  const k = p.q / p.m, pts: V2[] = []
  let x = x0, y = 0, vx = v0[0], vy = v0[1]
  const dt = (x1 - x0) / Math.hypot(...v0) / steps * 1.4
  pts.push([x, y])
  let hit: 'top' | 'bottom' | null = null
  for (let i = 0; i < steps * 4; i++) {
    // 速度 Verlet 的简化：先算加速度 a = (q/m)(E + v × B)，v × B = (vy·Bz, −vx·Bz)
    const f = x >= field[0] && x <= field[1] ? 1 : 0   // 只在两板之间有场
    const ax = f * k * (E2[0] + vy * Bz), ay = f * k * (E2[1] - vx * Bz)
    vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt
    pts.push([x, y])
    if (f && y > yLim) { hit = 'top'; break }
    if (f && y < -yLim) { hit = 'bottom'; break }
    if (x >= x1) break
  }
  return { pts, hit }
}

// ---------- 第 1 课 安培力 ----------
/** 安培力演示：蹄形磁体两极之间的磁场、导体棒在磁场里的长度、导体棒的质量 */
export const AMP = { B: 0.20, L: 0.10, m: 0.010, currents: [1, 2, 3] as const }
/** 第 1 课的安培力（N） */
export const ampForce = (I: number) => ampere(AMP.B, I, AMP.L)
/** 导体棒用两根软导线吊着，受水平的安培力后偏离竖直方向的角度：tanθ = F / mg */
export const swingAngle = (F: number, m = AMP.m) => Math.atan2(F, m * G)
/**
 * 安培力往哪边：电流沿 +x（cur = +1）或 −x，磁场竖直向下（field = +1，N 极在上）或向上。
 * F = I L × B：返回力沿 z 的方向（+1 朝镜头一侧，−1 朝里）。
 */
export function ampereSide(cur: 1 | -1, field: 1 | -1) {
  const f = cross([cur, 0, 0], [0, -field, 0])
  return Math.sign(f[2]) as 1 | -1
}

// ---------- 第 2 课 洛伦兹力（电子射线管） ----------
/** 电子射线管：阳极电压、磁体靠近时管内的磁场（约），荧光屏长度 */
export const CRT = { U: 2000, B: 2.0e-3, len: 0.10 }
export const crtSpeed = () => speedAfter(-E, ME, CRT.U)
export const crtRadius = () => radius(ME, crtSpeed(), -E, CRT.B)
export const crtForce = () => lorentz(-E, crtSpeed(), CRT.B)
/**
 * 磁体从前面（朝镜头一侧）靠近，朝前的一端是 face。N 极靠近时，管里的磁场从前往后（−z）；S 极靠近时从后往前。
 * 电子沿 +x 运动，返回洛伦兹力沿 y 的方向：−1 向下、+1 向上。
 */
export function crtBend(face: 'N' | 'S') {
  const B: V3 = [0, 0, face === 'N' ? -1 : 1]
  return Math.sign(lorentzDir(-E, [1, 0, 0], B)[1]) as 1 | -1
}

// ---------- 第 3 课 洛伦兹力演示仪（亥姆霍兹线圈 + 玻璃泡） ----------
/** 两档磁场、两档加速电压；亥姆霍兹线圈每只 N 匝、半径 coil（m）。电子从泡底的电子枪水平射出 */
export const BULB = { B0: 0.6e-3, U0: 75, R: 0.08, N: 130, coil: 0.15 }
export const MU0 = 4 * Math.PI * 1e-7
/** 亥姆霍兹线圈中心的磁场 B = (4/5)^(3/2)·μ0·N·I/R，反过来算要多大的线圈电流 */
export const coilField = (I: number) => Math.pow(0.8, 1.5) * MU0 * BULB.N * I / BULB.coil
export const coilCurrent = (B: number) => B / coilField(1)
/** 第 3 课电子的速度：加速电压 U */
export const bulbSpeed = (U: number) => speedAfter(-E, ME, U)
/** 第 3 课电子圆周的半径（m） */
export const bulbRadius = (B: number, U: number) => radius(ME, bulbSpeed(U), -E, B)
export const bulbPeriod = (B: number) => period(ME, -E, B)

// ---------- 第 4 课 周期与速度无关 ----------
/** 电磁铁两极之间的匀强磁场，三个粒子的速度是 v0、2v0、3v0 */
export const CYC = { B0: 0.5, v0: 2.0e6, mult: [1, 2, 3] as const }
export const orbitRadius = (k: ParticleKey, B: number, v: number) => { const p = PARTICLES[k]; return radius(p.m, v, p.q, B) }
export const orbitPeriod = (k: ParticleKey, B: number) => { const p = PARTICLES[k]; return period(p.m, p.q, B) }

// ---------- 第 5 课 速度选择器 ----------
/** 两块平行金属板：电压 U、间距 d、长 len；板间垂直纸面向里的磁场 B */
export const SEL = { U: 200, d: 0.020, len: 0.10, B: 0.10 }
export const selE = () => SEL.U / SEL.d
/** 能沿直线通过的速度 v = E/B */
export const selSpeed = () => selE() / SEL.B
/** 第 5 课的四种入射粒子：慢的、正好的、快的质子，和速度正好的电子 */
export const SEL_BEAMS = {
  slow: { name: '慢质子', p: PARTICLES.proton, k: 0.5 },
  mid: { name: '质子', p: PARTICLES.proton, k: 1 },
  fast: { name: '快质子', p: PARTICLES.proton, k: 2 },
  electron: { name: '电子', p: PARTICLES.electron, k: 1 },
} as const
export type BeamKey = keyof typeof SEL_BEAMS
/** 第 5 课的轨迹：上板接正极（电场向下），磁场垂直纸面向里。返回途经的点（m）和打在哪块板上 */
export function selectorPath(beam: BeamKey, eOn: boolean, bOn: boolean) {
  const b = SEL_BEAMS[beam], v = selSpeed() * b.k
  return crossedPath(b.p, [v, 0], [0, eOn ? -selE() : 0], bOn ? -SEL.B : 0, { x0: -SEL.len / 2 - 0.03, x1: SEL.len / 2 + 0.05, yLim: SEL.d / 2, field: [-SEL.len / 2, SEL.len / 2] })
}
/** 两种力的大小（N）：电场力 qE、洛伦兹力 qvB */
export function selForces(beam: BeamKey, eOn: boolean, bOn: boolean) {
  const b = SEL_BEAMS[beam], v = selSpeed() * b.k
  return { fe: eOn ? Math.abs(b.p.q) * selE() : 0, fb: bOn ? lorentz(b.p.q, v, SEL.B) : 0, v }
}

// ---------- 第 6 课 质谱仪 ----------
/** 氖的两种同位素，经加速电压 U 进入匀强磁场 B，转半圈打在底片上 */
export const SPEC = { U: 1000, B: 0.20 }
export const NEON = { ne20: { name: '氖 20', A: 20 }, ne22: { name: '氖 22', A: 22 } } as const
export type IsoKey = keyof typeof NEON
/** 离子质量：按质量数乘原子质量单位（示意，忽略质量亏损和电子质量） */
export const ionMass = (k: IsoKey) => NEON[k].A * U_AMU
/** 进入磁场后的半径 r = (1/B)√(2mU/q) */
export const specRadius = (k: IsoKey, U = SPEC.U, B = SPEC.B) => Math.sqrt(2 * ionMass(k) * U / E) / B
/** 谱线到入口狭缝的距离 x = 2r */
export const specLine = (k: IsoKey, U = SPEC.U, B = SPEC.B) => 2 * specRadius(k, U, B)
/** 由谱线位置反算比荷：q/m = 8U/(B²x²) */
export const specRatio = (x: number, U = SPEC.U, B = SPEC.B) => 8 * U / (B * B * x * x)

// ---------- 第 7 课 回旋加速器 ----------
/** 磁场 B、两 D 形盒之间的交变电压峰值 U（每次过缝获得的能量 qU） */
export const CYCLO = { B: 1.0, U: 1.0e5, radii: [0.30, 0.50] as const }
/** 回旋周期和交变电压的频率 f = qB/(2πm) */
export const cycloFreq = (B = CYCLO.B) => E * B / (2 * Math.PI * MP)
/** 最大动能 Ek = q²B²R²/(2m)（J），只由 B 和 D 形盒半径 R 决定 */
export const cycloEk = (R: number, B = CYCLO.B) => (E * B * R) ** 2 / (2 * MP)
/** 质子要过缝多少次才能到 D 形盒边缘（每次加 qU），向上取整 */
export const cycloCrossings = (R: number, U = CYCLO.U, B = CYCLO.B) => Math.ceil(cycloEk(R, B) / (E * U))
/** 一共转多少圈（每圈过缝两次） */
export const cycloTurns = (R: number, U = CYCLO.U, B = CYCLO.B) => Math.ceil(cycloCrossings(R, U, B) / 2)
/** 第 k 个半圈的半径：已经过缝 k 次，动能 kqU（第 0 个半圈是离开离子源后还没被加速的那一小段，按 0.5 次算） */
export function cycloHalfRadii(R: number, U = CYCLO.U, B = CYCLO.B) {
  const out: number[] = []
  for (let k = 0; ; k++) {
    const ek = Math.max(0.5, k) * E * U, r = Math.sqrt(2 * MP * ek) / (E * B)
    if (r > R) break
    out.push(r)
  }
  return out
}

// ---------- 拓展：磁流体发电机 ----------
/** 两板间距 d、等离子体速度 v、磁场 B：稳定时 qU/d = qvB，电动势 U = Bdv */
export const MHD = { B: 1.0, d: 0.20, v: 1000 }
export const mhdVoltage = () => MHD.B * MHD.d * MHD.v

// ---------- 显示用的小工具 ----------
/** 把一个数写成 a.b×10ⁿ 的样子（digits 位小数） */
export function sci(x: number, digits = 1) {
  if (x === 0) return '0'
  let n = Math.floor(Math.log10(Math.abs(x))), s = (x / 10 ** n).toFixed(digits)
  if (Math.abs(Number(s)) >= 10) { n += 1; s = (x / 10 ** n).toFixed(digits) }   // 9.96 进位成 10.0 时挪一位
  return `${s}×10${sup(n)}`
}
const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
const sup = (n: number) => String(n).split('').map(c => SUP[c]).join('')
