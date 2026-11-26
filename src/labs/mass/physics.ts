// 质量守恒定律实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 化学式、方程式、相对分子质量、质量比、配平、天平的砝码和偏转、解题过程里的数都在这里算。取值约定写在规格卡 docs/specs/mass.md 里。

// ---------- 相对原子质量和化学式 ----------
/** 相对原子质量（教材附录取值） */
export const AR = { H: 1, C: 12, O: 16, Na: 23, Mg: 24, P: 31, S: 32, Cl: 35.5, Ca: 40, Fe: 56, Cu: 64 } as const
export type El = keyof typeof AR
/** 元素名称 */
export const EL_NAME: Record<El, string> = { H: '氢', C: '碳', O: '氧', Na: '钠', Mg: '镁', P: '磷', S: '硫', Cl: '氯', Ca: '钙', Fe: '铁', Cu: '铜' }

/** 把 'Fe2O3' 这样的化学式拆成各元素的原子个数（本实验室的化学式都不带括号） */
export function parse(f: string): Partial<Record<El, number>> {
  const out: Partial<Record<El, number>> = {}
  for (const m of f.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    const e = m[1] as El
    if (!(e in AR)) throw new Error(`不认识的元素 ${e}`)
    out[e] = (out[e] ?? 0) + (m[2] ? Number(m[2]) : 1)
  }
  return out
}
/** 相对分子质量 */
export const mr = (f: string) => Object.entries(parse(f)).reduce((s, [e, n]) => s + AR[e as El] * (n as number), 0)
/** 化学式写成带下标的样子：Fe2O3 → Fe₂O₃ */
const SUB = '₀₁₂₃₄₅₆₇₈₉'
export const pretty = (f: string) => f.replace(/\d/g, d => SUB[Number(d)])

// ---------- 化学方程式 ----------
export interface Sp { f: string; name: string; gas?: boolean }
export interface Eq { left: Sp[]; right: Sp[]; coef: number[]; cond: string }
const sp = (f: string, name: string, gas = false): Sp => ({ f, name, gas })
/** 本实验室用到的方程式。coef 是配平后的系数，按 left、right 的顺序排 */
export const EQ = {
  phos: { left: [sp('P', '磷'), sp('O2', '氧气')], right: [sp('P2O5', '五氧化二磷')], coef: [4, 5, 2], cond: '点燃' },
  fecu: { left: [sp('Fe', '铁'), sp('CuSO4', '硫酸铜')], right: [sp('Cu', '铜'), sp('FeSO4', '硫酸亚铁')], coef: [1, 1, 1, 1], cond: '' },
  soda: { left: [sp('Na2CO3', '碳酸钠'), sp('HCl', '氯化氢')], right: [sp('NaCl', '氯化钠'), sp('H2O', '水'), sp('CO2', '二氧化碳', true)], coef: [1, 2, 2, 1, 1], cond: '' },
  mg: { left: [sp('Mg', '镁'), sp('O2', '氧气')], right: [sp('MgO', '氧化镁')], coef: [2, 1, 2], cond: '点燃' },
  water: { left: [sp('H2O', '水')], right: [sp('H2', '氢气', true), sp('O2', '氧气', true)], coef: [2, 2, 1], cond: '通电' },
  h2: { left: [sp('H2', '氢气'), sp('O2', '氧气')], right: [sp('H2O', '水')], coef: [2, 1, 2], cond: '点燃' },
  carbon: { left: [sp('C', '碳'), sp('O2', '氧气')], right: [sp('CO2', '二氧化碳')], coef: [1, 1, 1], cond: '点燃' },
  iron: { left: [sp('Fe2O3', '氧化铁'), sp('CO', '一氧化碳')], right: [sp('Fe', '铁'), sp('CO2', '二氧化碳')], coef: [1, 3, 2, 3], cond: '高温' },
  lime: { left: [sp('CaCO3', '碳酸钙')], right: [sp('CaO', '氧化钙'), sp('CO2', '二氧化碳', true)], coef: [1, 1, 1], cond: '高温' },
  steel: { left: [sp('Fe', '铁'), sp('O2', '氧气')], right: [sp('Fe3O4', '四氧化三铁')], coef: [3, 2, 1], cond: '点燃' },
} satisfies Record<string, Eq>
export type EqKey = keyof typeof EQ
export const species = (e: Eq) => [...e.left, ...e.right]
/** 方程式里每种物质的“系数 × 相对分子质量” */
export const massParts = (e: Eq, coef = e.coef) => species(e).map((s, i) => coef[i] * mr(s.f))
/** 已知第 i 种物质的质量，按方程式的质量比算出每种物质的质量 */
export function scaled(e: Eq, i: number, m: number) { const p = massParts(e); return p.map(x => x * m / p[i]) }
/** 方程式写成一行字：4P + 5O₂ =点燃= 2P₂O₅；arrow 为真时写成没配平的短线 */
export function eqText(e: Eq, coef: number[] = e.coef, arrow = false) {
  const side = (list: Sp[], off: number) => list.map((s, i) => `${coef[off + i] === 1 ? '' : coef[off + i]}${pretty(s.f)}${!arrow && s.gas && !e.left.some(l => l.gas) ? '↑' : ''}`).join(' + ')
  return `${side(e.left, 0)} ${arrow ? '—' : '='} ${side(e.right, e.left.length)}`
}

// ---------- 数原子 ----------
export type Tally = Partial<Record<El, number>>
/** 两边每种原子各有几个 */
export function atomCount(e: Eq, coef = e.coef) {
  const add = (t: Tally, f: string, k: number) => { for (const [el, n] of Object.entries(parse(f))) t[el as El] = (t[el as El] ?? 0) + (n as number) * k }
  const left: Tally = {}, right: Tally = {}
  e.left.forEach((s, i) => add(left, s.f, coef[i]))
  e.right.forEach((s, i) => add(right, s.f, coef[e.left.length + i]))
  const els = [...new Set([...Object.keys(left), ...Object.keys(right)])] as El[]
  return { left, right, els, ok: els.every(el => left[el] === right[el]) }
}

// ---------- 托盘天平 ----------
/** 天平的称量和标尺：游码 0–5 g，分度值 0.2 g */
export const CAPACITY = 200
export const RIDER = { max: 5, step: 0.2 }
/** 一套砝码（g） */
export const WEIGHTS = [100, 50, 20, 20, 10, 5] as const
/** 称一个质量：先用砝码从大到小凑整，剩下的拨游码 */
export function weigh(m: number) {
  let rest = m
  const on: number[] = []
  WEIGHTS.forEach((w, i) => { if (w <= rest + 1e-9) { on.push(i); rest -= w } })
  const rider = Math.round(rest / RIDER.step) * RIDER.step
  return { on, rider: Math.round(rider * 10) / 10, sum: on.reduce((s, i) => s + WEIGHTS[i], 0) + rider }
}
/** 右盘的质量：砝码加游码 */
export const reading = (on: readonly number[], rider: number) => on.reduce((s, i) => s + WEIGHTS[i], 0) + rider
/** 横梁偏向哪边（−1 到 1）：正数是左盘重、左盘下沉。差 0.5 g 以上偏到头（示意） */
export const FULL_TILT = 0.5
export const tilt = (left: number, right: number) => Math.max(-1, Math.min(1, (left - right) / FULL_TILT))
/** 指针停在哪：'mid' 正中，'left' 偏左（左盘重），'right' 偏右 */
export const pointer = (left: number, right: number): 'mid' | 'left' | 'right' => Math.abs(left - right) < 0.05 ? 'mid' : left > right ? 'left' : 'right'
/** 质量写成一位小数 */
export const g1 = (m: number) => (Math.round(m * 10) / 10).toFixed(1)

// ---------- 第 1 课：红磷燃烧 ----------
/** 锥形瓶（铺细沙、放红磷）、塞子、玻璃管、气球的总质量（g，设定值） */
export const L1 = { total: 118.6, p: 0.31 }
export const l1Parts = () => { const [p, o2, p2o5] = scaled(EQ.phos, 0, L1.p); return { p, o2, p2o5 } }

// ---------- 第 2 课：铁和硫酸铜溶液 ----------
export const L2 = { total: 146.4, fe: 0.56 }
export const l2Parts = () => { const [fe, cuso4, cu, feso4] = scaled(EQ.fecu, 0, L2.fe); return { fe, cuso4, cu, feso4 } }

// ---------- 第 3 课：敞口和密闭 ----------
/** 三个实验：装置反应前的总质量（g，设定值），参加反应的那种固体的质量 */
export const L3 = {
  open: { name: '敞口烧杯', total: 72.6, solid: 1.06 },
  mg: { name: '镁条', total: 28.4, solid: 0.24 },
  sealed: { name: '密闭锥形瓶', total: 96.2, solid: 1.06 },
} as const
export type L3Key = keyof typeof L3
/** 反应后再称时，装置的质量变了多少（g）：敞口烧杯跑掉二氧化碳，镁条多了氧气，密闭的不变 */
export function l3Delta(k: L3Key) {
  if (k === 'open') return -scaled(EQ.soda, 0, L3.open.solid)[4]
  if (k === 'mg') return scaled(EQ.mg, 0, L3.mg.solid)[1]
  return 0
}
export const l3After = (k: L3Key) => L3[k].total + l3Delta(k)

// ---------- 第 4 课：原子的重新组合 ----------
export type L4Key = 'water' | 'h2'
/** 每种物质有几个分子（配平后的系数），以及反应前后的原子个数 */
export const l4 = (k: L4Key) => ({ eq: EQ[k], count: atomCount(EQ[k]), parts: massParts(EQ[k]) })
/** 电解水：正极氧气、负极氢气，体积比 1 : 2 */
export const ELECTRO = { o2: 1, h2: 2 }

// ---------- 第 5 课：化学方程式的意义 ----------
export type L5Key = 'carbon' | 'h2'
/** 燃烧炉的投料（kg）：按方程式里的质量比，每一份取 1 kg（示意） */
export const l5Feed = (k: L5Key) => massParts(EQ[k])
/** 粒子个数比就是系数比 */
export const l5Ratio = (k: L5Key) => EQ[k].coef

// ---------- 第 6 课：配平 ----------
export type L6Key = 'phos' | 'iron'
export interface Step { coef: number[]; note: string }
/** 没配平时的系数，和配平的每一步（只改系数，不改化学式） */
export const BAL: Record<L6Key, { start: number[]; method: string; steps: Step[] }> = {
  phos: {
    start: [1, 1, 1], method: '最小公倍数法',
    steps: [
      { coef: [1, 1, 2], note: '氧原子左边 2 个、右边 5 个，最小公倍数是 10：P₂O₅ 前配 2' },
      { coef: [1, 5, 2], note: '右边有 10 个氧原子：O₂ 前配 5' },
      { coef: [4, 5, 2], note: '右边有 4 个磷原子：P 前配 4' },
    ],
  },
  iron: {
    start: [1, 1, 1, 1], method: '观察法',
    steps: [
      { coef: [1, 3, 1, 3], note: '每个 CO 夺取 1 个氧原子变成 CO₂；Fe₂O₃ 有 3 个氧原子：CO、CO₂ 前都配 3' },
      { coef: [1, 3, 2, 3], note: 'Fe₂O₃ 有 2 个铁原子：Fe 前配 2' },
    ],
  },
}

// ---------- 第 7 课：根据化学方程式计算 ----------
/** 要制取 cao 吨氧化钙，需要多少吨碳酸钙。返回解题要用的相对质量和结果 */
export function solveLime(cao: number) {
  const [a, b] = massParts(EQ.lime)
  return { mrA: a, mrB: b, x: cao * a / b }
}
export const L7 = { cao: 5.6 }
/** 投入 m 吨碳酸钙，煅烧后得到的氧化钙和二氧化碳（t，按纯碳酸钙算） */
export function kiln(m: number) { const [, cao, co2] = scaled(EQ.lime, 0, m); return { cao, co2 } }

// ---------- 拓展 ----------
/** 钢丝棉：参加反应的铁（g）和装置质量（g，设定值） */
export const LX = { total: 12.4, fe: 0.84, kilnIn: 100 }
export const lxGain = () => scaled(EQ.steel, 0, LX.fe)[1]
