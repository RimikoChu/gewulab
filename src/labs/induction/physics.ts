// 电磁感应和电网实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 物理量一律用国际单位；场景单位 1 = 1 m。取值约定写在规格卡 docs/specs/induction.md 里。
export type V3 = [number, number, number]
export const G = 9.8 // N/kg
export const MU0 = 4 * Math.PI * 1e-7 // T·m/A
const DEG = Math.PI / 180

// ---------- 第 1 课 磁通量 ----------
/** 亥姆霍兹线圈：每只 N 匝、电流 I、半径 R；中间的小线圈边长 a */
export const HELM = { N: 200, I: 2.0, R: 0.2, a: 0.1 }
/** 亥姆霍兹线圈中间的磁感应强度（T）：B = (4/5)^(3/2) μ₀NI/R */
export const helmholtzB = () => Math.pow(4 / 5, 1.5) * MU0 * HELM.N * HELM.I / HELM.R
/** 线圈的面积（m²） */
export const coilArea = () => HELM.a * HELM.a
/** 线圈平面的法线和磁场成 θ 度时的磁通量（Wb）：Φ = BS cosθ */
export const flux = (deg: number) => helmholtzB() * coilArea() * Math.cos(deg * DEG)
/** 磁感线的间距（m）和画出来的范围：横竖各 16 根，中间 8 × 8 根正好落在线圈里 */
export const LINE_STEP = 0.0125
export const lineGrid = (): [number, number][] => {
  const out: [number, number][] = []
  for (let i = -8; i < 8; i++) for (let j = -8; j < 8; j++) out.push([(i + 0.5) * LINE_STEP, (j + 0.5) * LINE_STEP])
  return out
}
/** 一根磁感线（在 y–z 平面里的位置 [y, z]）穿不穿过转了 θ 度的线圈（线圈绕竖直轴 y 转） */
export const passes = ([y, z]: [number, number], deg: number) => Math.abs(y) < HELM.a / 2 && Math.abs(z) < (HELM.a / 2) * Math.abs(Math.cos(deg * DEG)) - 1e-9
/** 穿过线圈的磁感线根数 */
export const linesThrough = (deg: number) => lineGrid().filter(p => passes(p, deg)).length
export const ANGLES = [0, 60, 90, 180] as const

// ---------- 第 2 课 感应电流的条件（示意模型） ----------
/** 磁铁插入线圈的深度 d（m，0 是在线圈外，DEPTH 是插到底）；穿过线圈的磁通量用相对值 0–1 */
export const DEPTH = 0.12
/** 穿过线圈的磁通量（相对值）：磁铁越往里越多，插到底是 1 */
export const magnetFlux = (d: number) => { const u = Math.min(1, Math.max(0, d / DEPTH)); return u * u * (3 - 2 * u) }
/** 穿过线圈的磁感线根数：插到底 24 根 */
export const MAX_LINES = 24
export const coilLines = (d: number) => Math.round(MAX_LINES * magnetFlux(d))
/** 磁铁的两种速度（m/s） */
export const SPEEDS = { slow: 0.08, fast: 0.24 } as const
export type Speed = keyof typeof SPEEDS
/** 电流计的偏转（−1 到 1，示意）：正比于 −dΦ/dt。磁铁以 v（插入为正）走到 d 处时；gain 是这套线圈和电流计的灵敏度 */
export function galvo(d: number, v: number, gain = 0.32) {
  const h = 1e-4, dPhi = (magnetFlux(d + h) - magnetFlux(d - h)) / (2 * h)
  return Math.max(-1, Math.min(1, -dPhi * v * gain))
}
/** 第 3 课那套线圈匝数多，灵敏度高一些；磁铁也动得慢一些，好看清感应磁场 */
export const LENZ = { v: 0.05, gain: 1.2 }
/** 电流计满偏是 2 格：偏转换成格数 */
export const divisions = (k: number) => k * 2
/** 插入（或拔出）过程中偏转的最大值 */
export const peakGalvo = (v: number) => { let m = 0; for (let i = 0; i <= 200; i++) { const g = galvo(DEPTH * i / 200, v); if (Math.abs(g) > Math.abs(m)) m = g } return m }

// ---------- 第 3 课 楞次定律 ----------
export type Pole = 'N' | 'S'
export type Move = 'in' | 'out'
/** 磁铁在线圈正上方、朝下的那一极是 pole，插入或拔出 */
export function lenz(pole: Pole, move: Move) {
  const fieldDown = pole === 'N'                 // 线圈里原磁场的方向：N 极朝下插，磁感线从 N 出来向下
  const grow = move === 'in'                      // 磁通量增大还是减小
  const inducedDown = grow ? !fieldDown : fieldDown   // 增反减同
  const top: Pole = inducedDown ? 'S' : 'N'       // 感应电流的磁场向上，线圈上端是 N 极
  const ccw = !inducedDown                        // 右手螺旋：磁场向上，从上往下看电流逆时针
  const repel = top === pole                      // 同名极相对：斥（来拒）；异名极相对：吸（去留）
  return { fieldDown, grow, inducedDown, top, ccw, repel, needle: (ccw ? -1 : 1) as 1 | -1 }
}
export const CASES: [Pole, Move][] = [['N', 'in'], ['N', 'out'], ['S', 'in'], ['S', 'out']]

// ---------- 第 4 课 导体切割磁感线 ----------
export const CUT = { B: 0.5, L: 0.1, run: 0.24 }
export const CUT_V = [0.1, 0.2] as const
/** 导体棒垂直切割磁感线的感应电动势（V）：E = BLv */
export const cutEmf = (v: number) => CUT.B * CUT.L * v
/** 回路围住的磁通量（Wb）：导体棒离导轨左端 x 时 Φ = BLx */
export const loopFlux = (x: number) => CUT.B * CUT.L * x

// ---------- 第 5 课 交流发电机 ----------
/** 1 号机：8 对磁极，额定转速 375 r/min，输出电压（有效值，约） */
export const GEN = { pairs: 8, rpm: 375, U: 10e3 }
export const genFreq = () => GEN.pairs * GEN.rpm / 60
export const genPeriod = () => 1 / genFreq()
export const genPeak = () => Math.SQRT2 * GEN.U
/** 转子转过的电角度 φ（从中性面算起，弧度）时线圈里的电动势（V）：e = Em sinφ */
export const genEmf = (phi: number) => genPeak() * Math.sin(phi)
/** 穿过线圈的磁通量（相对值）：Φ = Φm cosφ */
export const genFlux = (phi: number) => Math.cos(phi)
/** 电角度换成转子的机械角度 */
export const mechAngle = (phi: number) => phi / GEN.pairs
/** 画面里一个周期放慢成多少秒 */
export const SLOW_T = 4

// ---------- 第 6 课 变压器 ----------
export const TF = { U1: 10e3, n1: 1, n2: 11 }
/** 理想变压器：U₂ = U₁n₂/n₁；P₁ = P₂，I₂ = P/U₂，I₁ = P/U₁ */
export function transformer(P: number, U1 = TF.U1, n1 = TF.n1, n2 = TF.n2) {
  const U2 = U1 * n2 / n1
  return { U2, I1: P / U1, I2: P / U2, P1: P, P2: P }
}
export const LOADS = { full: 11e6, half: 5.5e6 } as const

// ---------- 第 7 课 远距离输电 ----------
export const LINE = { P: 11e6, R: 5 }
export const LINE_U = [10e3, 110e3, 220e3] as const
/** 用电压 U 输送功率 P：线路电流、损耗、损耗占的比例、到达的功率 */
export function lineLoss(U: number, P = LINE.P, R = LINE.R) {
  const I = P / U, loss = I * I * R
  return { I, loss, ratio: loss / P, arrive: P - loss }
}
/** 送到住户的两级降压：变电站 110 kV → 10 kV，配电变压器 10 kV → 0.4 kV，住户 220 V */
export const STEPS = { sub: [110e3, 10e3], dist: [10e3, 400], home: 220 } as const
export const stepRatio = ([a, b]: readonly [number, number]) => a / b

// ---------- 拓展课 ----------
export const PIPE = { h: 0.6, vt: 0.15 }
/** 磁铁从 h 高的管口落到管底要多久（s）：塑料管里自由落体；铝管里很快达到收尾速度（示意） */
export const fallTime = (pipe: 'plastic' | 'alu') => pipe === 'plastic' ? Math.sqrt(2 * PIPE.h / G) : PIPE.h / PIPE.vt
/** 落了 t 秒以后的下落距离（m） */
export const fallDist = (pipe: 'plastic' | 'alu', t: number) => Math.min(PIPE.h, pipe === 'plastic' ? 0.5 * G * t * t : PIPE.vt * t)

// ---------- 数字的写法 ----------
/** 用合适的单位写一个电压 */
export const kv = (U: number) => (U >= 1e3 ? `${+(U / 1e3).toFixed(U >= 1e5 ? 0 : 1)} kV` : `${Math.round(U)} V`)
/** 用合适的单位写一个功率 */
export const watt = (P: number) => (P >= 1e6 ? `${+(P / 1e6).toFixed(2)} MW` : P >= 1e3 ? `${+(P / 1e3).toFixed(1)} kW` : `${Math.round(P)} W`)
