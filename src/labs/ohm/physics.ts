// 欧姆定律实验室的计算核心。画面、读数、任务判定、随堂检测都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/ohm.md：电源 3.0 V、内阻不计；导线电阻不计；电表当作理想电表；
// 电流表 0–0.6 A（分度值 0.02 A），电压表 0–3 V（分度值 0.1 V）；滑动变阻器 20 Ω 2 A，一上一下接法。

/** 四舍五入到 d 位小数 */
export const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

// ---------- 欧姆定律 ----------
export const ohmI = (U: number, R: number) => U / R
export const ohmU = (I: number, R: number) => I * R
export const ohmR = (U: number, I: number) => U / I
export const seriesR = (a: number, b: number) => a + b
export const parallelR = (a: number, b: number) => a * b / (a + b)

// ---------- 器材 ----------
/** 电源输出电压（V） */
export const U0 = 3.0
/** 滑动变阻器的铭牌 */
export const RHEO = { max: 20, amp: 2 } as const
/** 一上一下接法：滑片位置 p（0 在下接线柱那一端，1 在另一端），接入电路的是下接线柱到滑片那一段 */
export const rheoR = (p: number) => RHEO.max * clamp01(p)
/** 电表的量程和分度值 */
export const METER = { A: { max: 0.6, step: 0.02 }, V: { max: 3, step: 0.1 } } as const
/** 读到分度值：取离指针最近的那一格 */
export const readA = (i: number) => round(Math.round(i / METER.A.step) * METER.A.step, 2)
export const readV = (u: number) => round(Math.round(u / METER.V.step) * METER.V.step, 1)
/** 指针偏了满偏的几分之几 */
export const needle = (x: number, kind: 'A' | 'V') => x / METER[kind].max

// ---------- 定值电阻和变阻器串联（第 1、2、4 课） ----------
/** 定值电阻 r 和变阻器串联在电源上：电流、电阻两端的电压 */
export function loop(r: number, rp: number, U = U0) {
  const I = U / (r + rp)
  return { I, U: I * r }
}
/** 要让 r 两端的电压是 u，变阻器该接入多少电阻、滑片在哪 */
export const rpForU = (r: number, u: number, U = U0) => r * (U / u - 1)
export const pForU = (r: number, u: number) => clamp01(rpForU(r, u) / RHEO.max)

/** 第 1 课：10 Ω，四个电压 */
export const L1 = { R: 10, targets: [1.0, 1.6, 2.2, 2.8] } as const
/** 第 2 课：三只电阻，电压保持 2.0 V */
export const L2 = { Rs: [5, 10, 20] as const, U: 2.0 }
export type R2 = (typeof L2.Rs)[number]
/** 过原点的直线 I = k U 的斜率（最小二乘） */
export function fitK(pts: { u: number; i: number }[]) {
  const a = pts.reduce((s, p) => s + p.u * p.i, 0), b = pts.reduce((s, p) => s + p.u * p.u, 0)
  return b > 0 ? a / b : 0
}

// ---------- 第 3 课：欧姆定律的计算 ----------
/** 四道题：已知什么、求什么、三个选项、正确答案、验证时电源调到多少、接哪只电阻 */
export const Q3 = [
  { id: 'i', R: 10, U: 3.0, ask: 'I', options: ['0.03 A', '0.3 A', '30 A'], answer: '0.3 A' },
  { id: 'u', R: 20, U: 2.0, ask: 'U', options: ['0.2 V', '2 V', '200 V'], answer: '2 V' },
  { id: 'r', R: 8, U: 2.4, ask: 'R', options: ['0.125 Ω', '8 Ω', '72 Ω'], answer: '8 Ω' },
  { id: 'same', R: 8, U: 1.6, ask: 'same', options: ['变大', '不变', '变小'], answer: '不变' },
] as const
export type Q3Id = (typeof Q3)[number]['id']

// ---------- 第 4 课：伏安法测定值电阻 ----------
/** 待测电阻的阻值：界面上不出，只出测量结果 */
export const RX = 8.2
export const L4 = { targets: [1.3, 2.0, 2.6] } as const
/** 一次测量：电压表、电流表的读数，算出来的电阻 */
export function measure(r: number, u: number) {
  const I = u / r, uR = readV(u), iR = readA(I)
  return { U: uR, I: iR, R: uR / iR }
}
export const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length)

// ---------- 第 5 课：小灯泡 ----------
/** 小灯泡的额定电压（V） */
export const LAMP_U = 2.5
/** 灯丝的电阻（Ω）：示意模型，电压越高、灯丝越热、电阻越大；2.5 V 时约 8.3 Ω */
export const lampR = (u: number) => 2 + 4 * Math.sqrt(Math.max(0, u))
export const lampI = (u: number) => u / lampR(u)
/** 灯和变阻器串联：解出灯两端的电压（二分法） */
export function lampLoop(rp: number, U = U0) {
  let lo = 0, hi = U
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (m + lampI(m) * rp > U) hi = m; else lo = m }
  const u = (lo + hi) / 2
  return { U: u, I: lampI(u) }
}
/** 要让灯两端是 u，滑片在哪 */
export const lampP = (u: number, U = U0) => clamp01((U - u) / lampI(u) / RHEO.max)
/** 测一次小灯泡：电压表、电流表的读数和算出来的电阻 */
export function measureLamp(u: number) { const uR = readV(u), iR = readA(lampI(u)); return { U: uR, I: iR, R: uR / iR } }
export const L5 = { targets: [1.0, 1.5, 2.0, 2.5] } as const
/** 灯的亮度（0–1）：按功率和额定功率比，开方让暗的时候也看得出在亮 */
export const lampGlow = (u: number) => Math.min(1.1, Math.sqrt((u * lampI(u)) / (LAMP_U * lampI(LAMP_U))))

// ---------- 第 6 课：串联和并联的电阻 ----------
export const L6 = { R1: 10, R2: 15 } as const
export type Combo = 'r1' | 'r2' | 'series' | 'parallel'
export const COMBO_NAME: Record<Combo, string> = { r1: '只接 R₁', r2: '只接 R₂', series: '串联', parallel: '并联' }
export const comboR = (c: Combo) => c === 'r1' ? L6.R1 : c === 'r2' ? L6.R2 : c === 'series' ? seriesR(L6.R1, L6.R2) : parallelR(L6.R1, L6.R2)
export const comboI = (c: Combo, U = U0) => U / comboR(c)
/** 并联时两条支路各自的电流（A） */
export const branchI = (U = U0) => ({ i1: U / L6.R1, i2: U / L6.R2 })

// ---------- 第 7 课：安全用电 ----------
export const MAINS = 220
/** 人体电阻（Ω）：示意值，干燥和潮湿相差约十倍 */
export const BODY = { dry: 10000, wet: 1000 } as const
export type Skin = keyof typeof BODY
export const bodyI = (skin: Skin, U = MAINS) => U / BODY[skin]
/** 同上，单位换成 mA */
export const bodyMA = (skin: Skin) => bodyI(skin) * 1000
/** 220 V 100 W 的白炽灯 */
export const BULB = { U: 220, P: 100 } as const
export const bulbR = () => BULB.U ** 2 / BULB.P
export const bulbI = () => MAINS / bulbR()
/** 短路导线的电阻（Ω）：示意值 */
export const SHORT_R = 0.05
export const shortI = () => MAINS / SHORT_R

// ---------- 拓展：色环电阻 ----------
export const COLORS = ['黑', '棕', '红', '橙', '黄', '绿', '蓝', '紫', '灰', '白'] as const
/** 四环电阻的读法：第一、二环是有效数字，第三环是乘数（10 的几次方），第四环金色 ±5% */
export const bands = (a: number, b: number, mul: number) => (a * 10 + b) * 10 ** mul
export const BATCH = { bands: [1, 0, 0] as [number, number, number], tol: 0.05 }
export const nominal = () => bands(...BATCH.bands)
export const range = () => [nominal() * (1 - BATCH.tol), nominal() * (1 + BATCH.tol)] as const
/** 三只样品：测试夹具上的电压 2.00 V，电流读数（A） */
export const SAMPLES = [{ U: 2.0, I: 0.198 }, { U: 2.0, I: 0.204 }, { U: 2.0, I: 0.179 }] as const
export const sampleR = (k: number) => SAMPLES[k].U / SAMPLES[k].I
export const passes = (r: number) => { const [lo, hi] = range(); return r >= lo && r <= hi }

// ---------- 拓展：油量表 ----------
/** 示意参数：电源 6 V，保护电阻 10 Ω，变阻器 0–50 Ω。油越多，浮子越高，接入的电阻越小 */
export const FUEL = { U: 6, R0: 10, Rmax: 50 } as const
export const fuelR = (level: number) => FUEL.Rmax * (1 - clamp01(level))
export const fuelI = (level: number) => FUEL.U / (FUEL.R0 + fuelR(level))
/** 油量表指针的位置（0 指 E，1 指 F）：表就是一只电流表，空箱 E 对应的电流到满箱 F 对应的电流之间等分 */
export const gaugeK = (level: number) => (fuelI(level) - fuelI(0)) / (fuelI(1) - fuelI(0))
