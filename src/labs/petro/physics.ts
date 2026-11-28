// 从石油到塑料实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/petro.md 里：相对原子质量 H 1、C 12、O 16、Cl 35.5、Br 80；沸点是常压下的值；键长单位 pm。

/** 相对原子质量 */
export const AR = { C: 12, H: 1, O: 16, Cl: 35.5, Br: 80 } as const
export type Element = keyof typeof AR
/** 分子式：每种原子几个 */
export type Formula = Partial<Record<Element, number>>
/** 相对分子质量 */
export const mass = (f: Formula) => (Object.keys(f) as Element[]).reduce((s, e) => s + AR[e] * (f[e] ?? 0), 0)
const SUB = '₀₁₂₃₄₅₆₇₈₉'
/** 下标数字 */
export const sub = (n: number) => String(n).split('').map(d => SUB[+d]).join('')
/** 烃的分子式写成字：C₈H₁₈ */
export const text = (f: Formula) => (Object.keys(AR) as Element[]).filter(e => f[e]).map(e => e + (f[e]! > 1 ? sub(f[e]!) : '')).join('')
export const alkane = (n: number): Formula => ({ C: n, H: 2 * n + 2 })
export const alkene = (n: number): Formula => ({ C: n, H: 2 * n })

// ---------- 第 1 课：石油的分馏 ----------
/** 正构烷烃的沸点（°C，常压）。键是碳原子数 */
export const ALKANE_BP: Record<number, number> = {
  1: -161.5, 2: -88.6, 3: -42.1, 4: -0.5, 5: 36.1, 6: 68.7, 7: 98.4, 8: 125.7, 9: 150.8, 10: 174.1,
  11: 195.9, 12: 216.3, 13: 235.4, 14: 253.5, 15: 270.6, 16: 286.8, 17: 302.0, 18: 316.3, 19: 329.9, 20: 343.0, 25: 401.9,
}
/** 原油出加热炉、进分馏塔时的温度（°C，约） */
export const FEED_T = 360
/** 各种馏分：从塔顶到塔底。lo、hi 是沸点范围（°C，约），carbons 是碳原子数范围 */
export const FRACTIONS = [
  { key: 'gas', name: '石油气', carbons: 'C₁–C₄', lo: -Infinity, hi: 40, range: '40 °C 以下', out: '塔顶' },
  { key: 'gasoline', name: '汽油', carbons: 'C₅–C₁₁', lo: 40, hi: 200, range: '40–200 °C', out: '上部侧线' },
  { key: 'kerosene', name: '煤油', carbons: 'C₁₁–C₁₆', lo: 200, hi: 280, range: '200–280 °C', out: '中部侧线' },
  { key: 'diesel', name: '柴油', carbons: 'C₁₅–C₁₈', lo: 280, hi: 350, range: '280–350 °C', out: '下部侧线' },
  { key: 'residue', name: '重油', carbons: 'C₂₀ 以上', lo: 350, hi: Infinity, range: '350 °C 以上', out: '塔底' },
] as const
export type FractionKey = typeof FRACTIONS[number]['key']
/** 沸点为 bp 的烃落在哪一种馏分里 */
export const fractionOf = (bp: number) => FRACTIONS.find(f => bp >= f.lo && bp < f.hi)!
/** 这一课追踪的四种烷烃 */
export const PROBES = { c3: { n: 3, name: '丙烷' }, c8: { n: 8, name: '辛烷' }, c16: { n: 16, name: '十六烷' }, c25: { n: 25, name: '二十五烷' } } as const
export type ProbeKey = keyof typeof PROBES
export const probe = (k: ProbeKey) => { const { n, name } = PROBES[k], bp = ALKANE_BP[n]; return { n, name, bp, formula: alkane(n), fraction: fractionOf(bp), vapor: bp < FEED_T } }

// ---------- 第 2 课：裂化和裂解 ----------
/** 炉温（°C，约） */
export const CRACK_T = { crack: 500, pyro: 800 } as const
export type Furnace = keyof typeof CRACK_T
/** 四步断链：一个烷烃断成一个更短的烷烃和一个烯烃 */
export const CRACK = [
  { mode: 'crack', from: alkane(16), a: alkane(8), b: alkene(8), names: ['十六烷', '辛烷', '辛烯'] },
  { mode: 'crack', from: alkane(8), a: alkane(4), b: alkene(4), names: ['辛烷', '丁烷', '丁烯'] },
  { mode: 'pyro', from: alkane(4), a: alkane(2), b: alkene(2), names: ['丁烷', '乙烷', '乙烯'] },
  { mode: 'pyro', from: alkane(4), a: alkane(1), b: alkene(3), names: ['丁烷', '甲烷', '丙烯'] },
] as const satisfies readonly { mode: Furnace; from: Formula; a: Formula; b: Formula; names: readonly string[] }[]
/** 这一步的碳、氢原子数是不是守恒 */
export const balanced = (s: { from: Formula; a: Formula; b: Formula }) => s.from.C === (s.a.C ?? 0) + (s.b.C ?? 0) && s.from.H === (s.a.H ?? 0) + (s.b.H ?? 0)

// ---------- 第 3 课：甲烷的取代 ----------
export const METHANE_ANGLE = '109°28′'
/** 四种氯代物 */
export const CHLORO = [
  { formula: 'CH₃Cl', name: '一氯甲烷', state: '气体' }, { formula: 'CH₂Cl₂', name: '二氯甲烷', state: '油状液体' },
  { formula: 'CHCl₃', name: '三氯甲烷', state: '油状液体' }, { formula: 'CCl₄', name: '四氯化碳', state: '油状液体' },
] as const
/** 取代了 n 个氢：消耗几个 Cl₂、生成几个 HCl、有机产物是什么 */
export const substituted = (n: number) => ({ cl2: n, hcl: n, product: n === 0 ? { formula: 'CH₄', name: '甲烷', state: '气体' } : CHLORO[n - 1], mass: mass({ C: 1, H: 4 - n, Cl: n }) })

// ---------- 第 4、5 课：乙烯、苯 ----------
/** 碳碳键的键长（pm） */
export const BOND = { single: 154, double: 134, benzene: 140 } as const
export type Sample = 'methane' | 'ethene' | 'benzene'
export type Solution = 'br2' | 'kmno4'
/** 通进去（或加进去）以后溶液褪不褪色，为什么 */
export function fades(s: Sample, sol: Solution): { fade: boolean; why: string } {
  if (s === 'ethene') return sol === 'br2' ? { fade: true, why: '加成反应' } : { fade: true, why: '乙烯被氧化' }
  if (s === 'methane') return { fade: false, why: '不反应' }
  return { fade: false, why: sol === 'br2' ? '只是萃取，没有反应' : '不反应' }
}
/** 乙烯和溴加成：反应物和产物的相对分子质量 */
export const ADDITION = { ethene: mass({ C: 2, H: 4 }), br2: mass({ Br: 2 }), product: mass({ C: 2, H: 4, Br: 2 }) }

// ---------- 第 6 课：官能团的转化 ----------
export type Reagent = 'water' | 'oxygen' | 'ethanol'
/** 一路上的五种物质 */
export const ROUTE = [
  { name: '乙烯', short: 'CH₂=CH₂', formula: { C: 2, H: 4 } as Formula, group: '碳碳双键' },
  { name: '乙醇', short: 'CH₃CH₂OH', formula: { C: 2, H: 6, O: 1 } as Formula, group: '羟基 —OH' },
  { name: '乙醛', short: 'CH₃CHO', formula: { C: 2, H: 4, O: 1 } as Formula, group: '醛基 —CHO' },
  { name: '乙酸', short: 'CH₃COOH', formula: { C: 2, H: 4, O: 2 } as Formula, group: '羧基 —COOH' },
  { name: '乙酸乙酯', short: 'CH₃COOC₂H₅', formula: { C: 4, H: 8, O: 2 } as Formula, group: '酯基 —COO—' },
] as const
/** 四步各加什么、是哪一类反应 */
export const STEPS6: { add: Reagent; kind: string; unit: string }[] = [
  { add: 'water', kind: '加成反应', unit: '水合反应器' }, { add: 'oxygen', kind: '氧化反应', unit: '乙醇氧化反应器' },
  { add: 'oxygen', kind: '氧化反应', unit: '乙醛氧化塔' }, { add: 'ethanol', kind: '酯化反应（取代反应）', unit: '酯化釜' },
]
/** t 吨乙烯理论上最多得到多少吨乙酸乙酯：2 个乙烯（一个变乙酸、一个变乙醇）得 1 个乙酸乙酯 */
export const esterFromEthene = (t: number) => t / (2 * mass(ROUTE[0].formula)) * mass(ROUTE[4].formula)

// ---------- 第 7 课：加聚反应 ----------
/** 链节 —CH₂—CH₂— 的式量 */
export const UNIT_MASS = mass({ C: 2, H: 4 })
export const DEGREES = [1000, 5000, 10000] as const
/** 聚合度为 n 的聚乙烯的相对分子质量 */
export const polymerMass = (n: number) => UNIT_MASS * n

// ---------- 拓展课：塑料的回收 ----------
/** 回收标志 1 到 6 */
export const RESINS = [
  { code: 1, abbr: 'PET', name: '聚对苯二甲酸乙二酯', item: '饮料瓶' }, { code: 2, abbr: 'HDPE', name: '高密度聚乙烯', item: '洗衣液桶' },
  { code: 3, abbr: 'PVC', name: '聚氯乙烯', item: '水管' }, { code: 4, abbr: 'LDPE', name: '低密度聚乙烯', item: '塑料袋' },
  { code: 5, abbr: 'PP', name: '聚丙烯', item: '餐盒' }, { code: 6, abbr: 'PS', name: '聚苯乙烯', item: '泡沫盒' },
] as const
/** 加热后会不会熔化 */
export const PLASTICS = { pe: { name: '聚乙烯', structure: '线型', kind: '热塑性', melts: true }, pf: { name: '酚醛塑料（电木）', structure: '网状', kind: '热固性', melts: false } } as const
export type PlasticKey = keyof typeof PLASTICS
