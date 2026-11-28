// 兴奋的传导和传递实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 电位用 mV，时间用 ms，浓度用 mmol/L，沿神经纤维的位置用 cm。取值约定写在规格卡 docs/specs/neuron.md 里。

// ---------- 离子浓度和膜电位（第 2、3 课） ----------
export interface Ions { kIn: number; kOut: number; naIn: number; naOut: number }
/** 哺乳动物神经细胞的典型值（mmol/L） */
export const ION: Ions = { kIn: 140, kOut: 5, naIn: 15, naOut: 145 }
/** 37 °C 时能斯特方程前面的系数（mV） */
export const NERNST_K = 61.5
/** 某种离子单独决定的平衡电位（mV）：z 是离子带几个电荷，正离子为正 */
export const nernst = (out: number, inn: number, z = 1) => (NERNST_K / z) * Math.log10(out / inn)
/** 膜对 Na⁺ 的通透性是对 K⁺ 的多少倍：静息时很小，动作电位峰值时很大（模型参数） */
export const P_REST = 0.035, P_PEAK = 4.3
/** 膜电位（mV）：只考虑 K⁺ 和 Na⁺ 的戈德曼方程，pNa 是 Na⁺ 相对 K⁺ 的通透性 */
export const membraneV = (ion: Ions, pNa: number) => NERNST_K * Math.log10((ion.kOut + pNa * ion.naOut) / (ion.kIn + pNa * ion.naIn))
export const restV = (ion: Ions = ION) => membraneV(ion, P_REST)
export const peakV = (ion: Ions = ION) => membraneV(ion, P_PEAK)
/** 第 2 课：膜外 K⁺ 的两档 */
export const K_OUT = { normal: 5, high: 10 } as const
export type KKey = keyof typeof K_OUT
/** 第 3 课：膜外 Na⁺ 的两档 */
export const NA_OUT = { normal: 145, half: 72.5 } as const
export type NaKey = keyof typeof NA_OUT
/** 电表读数（mV）：两个电极都在膜外是 0，一个插进膜内读到静息电位 */
export const meterV = (inside: boolean, k: KKey) => inside ? restV({ ...ION, kOut: K_OUT[k] }) : 0

// ---------- 一次动作电位的曲线（第 3 课） ----------
/** 曲线上的几个时刻（ms）：刺激、到峰值、降到最低、恢复 */
export const AP_T = { stim: 1, peak: 1.6, low: 3, end: 5 } as const
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
/** t 时刻的膜电位（mV）。rest 静息电位，peak 峰值；降到最低时比静息电位低 8 mV（示意） */
export function apV(t: number, rest: number, peak: number) {
  const low = rest - 8
  if (t <= AP_T.stim) return rest
  if (t <= AP_T.peak) return rest + (peak - rest) * ss(AP_T.stim, AP_T.peak, t)
  if (t <= AP_T.low) return peak + (low - peak) * ss(AP_T.peak, AP_T.low, t)
  return low + (rest - low) * ss(AP_T.low, AP_T.end, t)
}
export type Phase = 'rest' | 'rise' | 'fall' | 'recover'
/** t 时刻处在哪一段：静息、上升（Na⁺ 内流）、下降（K⁺ 外流）、恢复 */
export const apPhase = (t: number): Phase => t <= AP_T.stim || t >= AP_T.end ? 'rest' : t <= AP_T.peak ? 'rise' : t <= AP_T.low ? 'fall' : 'recover'

// ---------- 沿神经纤维传导（第 4、5 课） ----------
/** 这根纤维的传导速度（m/s）：模型取值 */
export const SPEED = 30
/** 第 4 课那一段纤维长（cm） */
export const FIBER = 12
/** 兴奋从 s 处传到 x 处要多久（ms） */
export const arrive = (s: number, x: number) => Math.abs(x - s) / 100 / SPEED * 1000
/** 第 5 课：两个电极和三个刺激点的位置（cm） */
export const PROBE = { a: 4, b: 10 } as const
export const SITES = { left: 1, mid: 7, right: 13 } as const
export type SiteKey = keyof typeof SITES
/** 指针偏转：次数，以及先后朝哪个电极偏。兴奋先到的那个电极处膜外先变负，指针先朝它偏；同时到达不偏 */
export function deflect(s: number, a: number = PROBE.a, b: number = PROBE.b) {
  const ta = arrive(s, a), tb = arrive(s, b)
  if (Math.abs(ta - tb) < 1e-9) return { ta, tb, times: 0, order: [] as ('a' | 'b')[] }
  return { ta, tb, times: 2, order: (ta < tb ? ['a', 'b'] : ['b', 'a']) as ('a' | 'b')[] }
}

/** 兴奋区经过一个电极要多久（ms）：指针偏过去再回来的时间 */
export const PASS = 0.27
/** 刺激后 t 毫秒，指针偏到哪（−1 朝 a 偏到头，+1 朝 b 偏到头，0 在正中） */
export function needle(s: number, t: number, a: number = PROBE.a, b: number = PROBE.b) {
  const bump = (t0: number) => Math.exp(-(((t - t0) / PASS) ** 2))
  return bump(arrive(s, b)) - bump(arrive(s, a))
}

// ---------- 突触（第 6、7 课，拓展） ----------
/** 突触延搁（ms） */
export const DELAY = 0.5
/** 突触延搁的时间里，兴奋在这根纤维上能走多远（cm） */
export const delayDistance = () => SPEED * 100 * DELAY / 1000
/** 刺激突触的哪一侧，另一侧会不会兴奋：递质只能由突触前膜释放 */
export const synapse = (stim: 'pre' | 'post') => ({ crosses: stim === 'pre' })
/** 阈电位（mV） */
export const THRESHOLD = -55
/** 一次释放使突触后膜电位变化多少（mV，模型取值） */
export const PSP = { exc: 20, inh: -8 } as const
export type PostKey = 'exc' | 'inh' | 'both'
/** 突触后膜的电位到多少（mV），有没有产生动作电位 */
export function postV(kind: PostKey) {
  const dv = (kind !== 'inh' ? PSP.exc : 0) + (kind !== 'exc' ? PSP.inh : 0)
  const v = Math.round(restV()) + dv
  return { v, fires: v >= THRESHOLD }
}

/**
 * 第 7 课的曲线：一次传递从头到尾算 0–1，u 是走到哪了，返回突触后膜的电位（mV）。
 * 递质在 0.5–0.62 之间起作用，随后回落；到了阈电位，在 0.67 处出现一次动作电位（示意）
 */
export function postCurve(kind: PostKey, u: number) {
  const rest = Math.round(restV()), { v, fires } = postV(kind)
  const psp = rest + (v - rest) * ss(0.5, 0.62, u) * (1 - ss(0.72, 0.95, u))
  return fires ? psp + (Math.round(peakV()) - psp) * Math.exp(-(((u - 0.67) / 0.025) ** 2)) : psp
}

/** 拓展：药物和毒素卡在哪一步。ap 突触前有没有动作电位；release 递质放没放出来；bind 递质能不能和受体结合；post 后一个神经元：不兴奋、兴奋一次、持续兴奋 */
export const DRUGS = {
  ttx: { name: '河豚毒素', step: '堵住 Na⁺ 通道', ap: false, release: false, bind: false, post: 'none' },
  botox: { name: '肉毒毒素', step: '突触小泡放不出递质', ap: true, release: false, bind: false, post: 'none' },
  bgtx: { name: 'α-银环蛇毒素', step: '占住突触后膜上的受体', ap: true, release: true, bind: false, post: 'none' },
  op: { name: '有机磷农药', step: '递质不能被分解', ap: true, release: true, bind: true, post: 'lasting' },
} as const
export type DrugKey = keyof typeof DRUGS
export const drug = (k: DrugKey) => DRUGS[k]
