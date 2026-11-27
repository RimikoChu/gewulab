// 合成氨工厂实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/ammonia.md 里：浓度 mol/L，速率 mol/(L·min)，温度 °C，压强 MPa。
export const R = 8.314 // J/(mol·K)
export const K0 = 273.15

// ---------- 第 1–4 课：示意温度下的 N₂ + 3H₂ ⇌ 2NH₃ ----------
/** 三种物质的浓度（mol/L） */
export interface Conc { n2: number; h2: number; nh3: number }
export const FEED: Conc = { n2: 1, h2: 3, nh3: 0 }
/** 示意温度下的平衡常数：起始 1、3、0 mol/L 时 N₂ 恰好转化一半 */
export const KC = 1 ** 2 / (0.5 * 1.5 ** 3)
/** 平衡常数的表达式 K = c²(NH₃) / [c(N₂)·c³(H₂)]（也用来算浓度商 Q） */
export const Kc = (c: Conc) => c.nh3 ** 2 / (c.n2 * c.h2 ** 3)

/** 速率常数（示意）：由“2 min 时 c(N₂) 降到 0.80 mol/L”定出，见文件末尾 */
let KF = 0.0055
/** 正、逆反应速率（按 N₂ 计，mol/(L·min)）：v正 = k正·c(N₂)·c³(H₂)，v逆 = k逆·c²(NH₃)，k正/k逆 = K */
export const rates = (c: Conc) => ({ fwd: KF * c.n2 * c.h2 ** 3, rev: (KF / KC) * c.nh3 ** 2 })
const step = (c: Conc, dt: number): Conc => {
  const f = (x: Conc) => { const r = rates(x); return r.fwd - r.rev }   // dξ/dt
  const add = (x: Conc, d: number): Conc => ({ n2: x.n2 - d, h2: x.h2 - 3 * d, nh3: x.nh3 + 2 * d })
  const k1 = f(c), k2 = f(add(c, k1 * dt / 2)), k3 = f(add(c, k2 * dt / 2)), k4 = f(add(c, k3 * dt))
  return add(c, (k1 + 2 * k2 + 2 * k3 + k4) / 6 * dt)
}
/** 从起始浓度 c0 反应 t 分钟以后的浓度（四阶龙格-库塔） */
export function run(c0: Conc, t: number): Conc {
  let c = { ...c0 }; const n = Math.max(1, Math.ceil(t / 0.02)), dt = t / n
  for (let i = 0; i < n; i++) c = step(c, dt)
  return c
}
/** 0 到 tEnd 分钟之间均匀取 n + 1 个点的浓度，画曲线用 */
export function series(c0: Conc, tEnd: number, n: number): Conc[] {
  const out: Conc[] = [{ ...c0 }]; let c = { ...c0 }; const sub = Math.max(1, Math.ceil(tEnd / n / 0.02)), dt = tEnd / n / sub
  for (let i = 0; i < n; i++) { for (let j = 0; j < sub; j++) c = step(c, dt); out.push(c) }
  return out
}
/** 平衡浓度：在 ξ 的可行范围里二分，解 Q = K */
export function equilibrium(c0: Conc): Conc {
  const at = (x: number): Conc => ({ n2: c0.n2 - x, h2: c0.h2 - 3 * x, nh3: c0.nh3 + 2 * x })
  let lo = -c0.nh3 / 2 + 1e-12, hi = Math.min(c0.n2, c0.h2 / 3) - 1e-12
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (Kc(at(m)) < KC) lo = m; else hi = m }
  return at((lo + hi) / 2)
}
/** N₂、H₂ 的转化率：消耗量 / 起始量 */
export const conversion = (c0: Conc, c: Conc) => ({ n2: (c0.n2 - c.n2) / c0.n2, h2: (c0.h2 - c.h2) / c0.h2 })
/** 一段时间里的平均速率（mol/(L·min)），按三种物质分别算：反应物取减少量 */
export const avgRate = (c0: Conc, c: Conc, dt: number) => ({ n2: (c0.n2 - c.n2) / dt, h2: (c0.h2 - c.h2) / dt, nh3: (c.nh3 - c0.nh3) / dt })
/** 读数保留两位小数（第 1 课按读数算速率） */
export const read2 = (x: number) => Math.round(x * 100) / 100
/** 浓度两位小数的字符串 */
export const fmt2 = (x: number) => (Math.abs(x) < 0.005 ? 0 : x).toFixed(2)

/** 釜里的压力（MPa，示意）：起始 4 mol/L 气体时 12 MPa，温度、体积不变时和气体总浓度成正比 */
export const P_START = 12
export const pressure = (c: Conc) => P_START * (c.n2 + c.h2 + c.nh3) / 4
// 第 1 课：2 min 时的读数
export const T1 = 2
export const reading1 = () => { const c = run(FEED, T1); return { n2: read2(c.n2), h2: read2(c.h2), nh3: read2(c.nh3) } }
export const rate1 = () => avgRate(FEED, reading1(), T1)

// 第 3 课：从正、逆两个方向开始
export const START3 = { fwd: FEED, rev: { n2: 0, h2: 0, nh3: 2 } as Conc }
/** 第 3、4 课反应进行的时长（min）：到这时已经和平衡分不出 */
export const T_EQ = 80
/** 是否已经到平衡：正逆速率相差不到 2% */
export const atEq = (c: Conc) => { const r = rates(c); return Math.abs(r.fwd - r.rev) <= 0.02 * Math.max(r.fwd, r.rev, 1e-9) }

// 第 4 课：三组不同的起始浓度
export const RUNS4: { key: string; name: string; c0: Conc }[] = [
  { key: 'a', name: '第一组', c0: { n2: 1, h2: 3, nh3: 0 } },
  { key: 'b', name: '第二组', c0: { n2: 2, h2: 3, nh3: 0 } },
  { key: 'c', name: '第三组', c0: { n2: 1, h2: 3, nh3: 1 } },
]

// ---------- 第 2 课：活化分子（示意） ----------
export const T2 = { base: 400, hot: 500 }
/** 无催化剂时 400 °C 下 Ea/RT = 2.3；铁催化剂把活化能降到 60% */
const EA_RT0 = 2.3, CAT = 0.6
/** 活化分子百分数（示意）：e^(−Ea/RT) */
export const activeFraction = (tC: number, cat: boolean) => Math.exp(-EA_RT0 * (CAT ** +cat) * (T2.base + K0) / (tC + K0))
export const COND2 = {
  base: { name: '原来', t: 400, n: 40, cat: false },
  conc: { name: '浓度加倍', t: 400, n: 80, cat: false },
  hot: { name: '升到 500 °C', t: 500, n: 40, cat: false },
  cat: { name: '加铁催化剂', t: 400, n: 40, cat: true },
} as const
export type Cond2 = keyof typeof COND2
/** 原来那种条件下 10 s 里有效碰撞 6 次；次数和单位体积活化分子数成正比 */
export const HITS0 = 6
export function cond2(k: Cond2) {
  const c = COND2[k], f = activeFraction(c.t, c.cat), act = c.n * f, base = COND2.base.n * activeFraction(400, false)
  return { n: c.n, f, act, hits: Math.round(HITS0 * act / base), speed: Math.sqrt((c.t + K0) / (400 + K0)), p: P_START * c.n / 40 * (c.t + K0) / (400 + K0) }
}

// ---------- 第 5 课：2NO₂ ⇌ N₂O₄ ----------
/** N₂O₄ ⇌ 2NO₂：25 °C 时 Kp ≈ 0.148（bar），ΔH ≈ +57.2 kJ/mol */
const KP25 = 0.148, DH = 57200, RL = 0.08314 // L·bar/(mol·K)
export const kpNO2 = (tC: number) => KP25 * Math.exp(DH / R * (1 / 298.15 - 1 / (tC + K0)))
/** 25 °C、总压 1 bar 时装进去的气体，折合成 N₂O₄ 的浓度 */
const C_TOT0 = (() => { const ct = 1 / (RL * 298.15), k = KP25 / (RL * 298.15), x = (-2 * k + Math.sqrt(4 * k * k + 16 * k * ct)) / 8; return ct - x })()   // 总浓度 = c0 + x，4x² = Kc(c0 − x)
/** 温度 tC、体积是原来的 v 倍时的平衡浓度（mol/L）：c0 折合 N₂O₄，解 4x² = Kc(c0 − x) */
export function no2(tC: number, v = 1) {
  const c0 = C_TOT0 / v, Kc5 = kpNO2(tC) / (RL * (tC + K0))
  const x = (-Kc5 + Math.sqrt(Kc5 * Kc5 + 16 * Kc5 * c0)) / 8
  return { no2: 2 * x, n2o4: c0 - x }
}
/** NO₂ 浓度和 25 °C、原体积时的比值：颜色深浅和它成正比 */
export const no2Ratio = (tC: number, v = 1) => no2(tC, v).no2 / no2(25, 1).no2
/** 体积从 from 突然变成 to、平衡还没移动的那一刻：NO₂ 浓度（和原来的比值）按体积反比变 */
export const no2Jump = (k: number, from: number, to: number) => k * from / to
export const T5 = { hot: 80, cold: 0, room: 25 }

// ---------- 第 6 课：合成氨的适宜条件 ----------
/** 课本数据表：平衡混合物中氨的体积分数（%），H₂ : N₂ = 3 : 1 */
export const EQ_T = [200, 300, 400, 500, 600]
export const EQ_P = [0.1, 10, 20, 30, 60, 100]
export const EQ_TABLE = [
  [15.3, 81.5, 86.4, 89.9, 95.4, 98.8],
  [2.2, 52.0, 64.2, 71.0, 84.2, 92.6],
  [0.4, 25.1, 38.2, 47.0, 65.2, 79.8],
  [0.1, 10.6, 19.1, 26.4, 42.2, 57.5],
  [0.05, 4.5, 9.1, 13.8, 23.1, 31.4],
]
const logit = (y: number) => Math.log(y / (100 - y)), unlogit = (z: number) => 100 / (1 + Math.exp(-z))
/** 平衡时氨的体积分数（%）：表里有的直接取，中间温度按 logit 线性插，压强按对数插 */
export function nh3Eq(tC: number, p: number) {
  const ti = Math.min(EQ_T.length - 2, Math.max(0, Math.floor((tC - 200) / 100))), ft = (tC - EQ_T[ti]) / 100
  let pj = 0; while (pj < EQ_P.length - 2 && EQ_P[pj + 1] < p) pj++
  const fp = (Math.log(p) - Math.log(EQ_P[pj])) / (Math.log(EQ_P[pj + 1]) - Math.log(EQ_P[pj]))
  const row = (i: number) => logit(EQ_TABLE[i][pj]) + (logit(EQ_TABLE[i][pj + 1]) - logit(EQ_TABLE[i][pj])) * fp
  return unlogit(row(ti) + (row(ti + 1) - row(ti)) * ft)
}
/** 出塔气里氨的体积分数（%，示意）：平衡氨含量 × (1 − e^(−kτ))；k 按 Ea = 80 kJ/mol，kτ(500 °C, 20 MPa) = 1.5，和压强成正比 */
const EA6 = 80000, KT500 = 1.5
export const ktau = (tC: number, p: number) => KT500 * (p / 20) * Math.exp(EA6 / R * (1 / (500 + K0) - 1 / (tC + K0)))
export const nh3Out = (tC: number, p: number) => nh3Eq(tC, p) * (1 - Math.exp(-ktau(tC, p)))
export const TEMPS6 = [300, 400, 500, 600] as const
export const P6 = { low: 20, high: 30 }
/** 一位小数 */
export const fmt1 = (x: number) => x.toFixed(1)

// ---------- 第 7 课：分离和循环 ----------
/** 单程转化率：4 体积原料（N₂ : H₂ = 1 : 3）转化 ξ，出口氨的体积分数 y = 2ξ/(4 − 2ξ)，转化率 = ξ */
export const passConv = (yPct: number) => { const y = yPct / 100; return 2 * y / (1 + y) }
/** 循环 n 次后原料累计的利用率（不计放空） */
export const loopUse = (a: number, n: number) => 1 - (1 - a) ** n
export const LOOP = { t: 500, p: 20 }
export const loopPass = () => passConv(nh3Out(LOOP.t, LOOP.p))
/** 累计利用率超过多少算完成 */
export const LOOP_GOAL = 0.95
export const loopsFor = (goal: number) => Math.ceil(Math.log(1 - goal) / Math.log(1 - loopPass()))

// ---------- 拓展课 ----------
/** 氨在常压下的沸点（°C，约） */
export const NH3_BP = -33
/** 2NH₃ + CO₂ = CO(NH₂)₂ + H₂O：m 吨氨理论上制多少吨尿素 */
export const ureaFromNH3 = (m: number) => m * 60.06 / (2 * 17.03)

// 速率常数的定标：二分 k正，使 2 min 时 c(N₂) = 0.80 mol/L
{
  let lo = 1e-4, hi = 0.1
  for (let i = 0; i < 60; i++) { KF = (lo + hi) / 2; if (run(FEED, T1).n2 > 0.8) lo = KF; else hi = KF }
  KF = (lo + hi) / 2
}
export const kf = () => KF
