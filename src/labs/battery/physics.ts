// 原电池实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。取值约定见 docs/specs/battery.md。

// ---------- 金属和它们的标准电极电势（伏，25 ℃，相对标准氢电极） ----------
export const METALS = {
  Mg: { name: '镁', ion: 'Mg²⁺', e: -2.37, color: '#d9dde0' },
  Zn: { name: '锌', ion: 'Zn²⁺', e: -0.76, color: '#aab4bd' },
  Fe: { name: '铁', ion: 'Fe²⁺', e: -0.44, color: '#6f757b' },
  Cu: { name: '铜', ion: 'Cu²⁺', e: 0.34, color: '#c9753d' },
  C: { name: '石墨', ion: '', e: 99, color: '#2b2e31' },      // 石墨不参加反应，只导电：永远做正极
} as const
export type MetalKey = keyof typeof METALS
/** 两个电极里更活泼的那个（电势更低）做负极 */
export const negativeOf = (a: MetalKey, b: MetalKey): MetalKey | null => a === b ? null : METALS[a].e < METALS[b].e ? a : b
/** 两种金属各自浸在自己的盐溶液里组成电池时，标准状态下的理论电压（伏） */
export const emf = (a: MetalKey, b: MetalKey) => Math.round(Math.abs(METALS[a].e - METALS[b].e) * 100) / 100
/** 能不能和稀硫酸里的氢离子反应：排在氢前面（电势为负）的金属才行 */
export const reactsWithAcid = (m: MetalKey) => METALS[m].e < 0

// ---------- 第 1、3 课：能不能形成原电池 ----------
export interface Setup { a: MetalKey; b: MetalKey; electrolyte: boolean; closed: boolean }
/** 四个条件：两个活泼性不同的电极、电解质溶液、闭合回路、能自发进行的氧化还原反应 */
export const checks = (s: Setup) => ({
  electrodes: s.a !== s.b, electrolyte: s.electrolyte, closed: s.closed,
  reaction: s.electrolyte && (reactsWithAcid(s.a) || reactsWithAcid(s.b)),
})
export const works = (s: Setup) => Object.values(checks(s)).every(Boolean)
export const SETUPS = {
  ok: { name: '锌、铜、稀硫酸', a: 'Zn', b: 'Cu', electrolyte: true, closed: true, miss: '' },
  same: { name: '两片都是铜', a: 'Cu', b: 'Cu', electrolyte: true, closed: true, miss: '两个电极一样，没有活泼性的差别' },
  alcohol: { name: '稀硫酸换成酒精', a: 'Zn', b: 'Cu', electrolyte: false, closed: true, miss: '酒精不是电解质，溶液里没有能自由移动的离子' },
  apart: { name: '分装在两只烧杯里', a: 'Zn', b: 'Cu', electrolyte: true, closed: false, miss: '两只烧杯不相通，没有形成闭合回路' },
} as const satisfies Record<string, Setup & { name: string; miss: string }>
export type SetupKey = keyof typeof SETUPS

// ---------- 第 2 课：电子的去向 ----------
export const MICRO = [
  { key: 'lose', name: '锌失去电子', where: '负极（锌片）', eq: 'Zn − 2e⁻ = Zn²⁺', kind: '氧化反应', say: '锌原子把电子留在锌片上，自己变成锌离子进入溶液' },
  { key: 'wire', name: '电子沿导线流向铜片', where: '导线', eq: '电子：锌 → 铜', kind: '电流方向相反：铜 → 锌', say: '电子从负极经导线流到正极。电子不会走进溶液' },
  { key: 'gain', name: '氢离子在铜片上得到电子', where: '正极（铜片）', eq: '2H⁺ + 2e⁻ = H₂↑', kind: '还原反应', say: '溶液里的氢离子游到铜片表面，拿走电子，变成氢气冒出来' },
  { key: 'ions', name: '溶液里的离子定向移动', where: '溶液', eq: '阳离子 → 正极，阴离子 → 负极', kind: '内电路', say: '氢离子、锌离子往铜片那边移，硫酸根离子往锌片那边移，回路就接通了' },
] as const
/** 转移 n 摩尔电子时：溶解的锌（克）和生成的氢气（克、标准状况下的升） */
export const perElectrons = (mol: number) => ({ zn: mol / 2 * 65, h2: mol / 2 * 2, liters: mol / 2 * 22.4 })

// ---------- 第 5 课：单液和双液 ----------
/** 接通 t 分钟后的电流（相对值，刚接通时算 100）。单液电池里锌直接和铜离子反应，电流很快衰减；用盐桥隔开后基本稳定 */
export const currentAt = (bridge: boolean, t: number) => bridge ? 100 - 0.4 * t : 30 + 70 * Math.exp(-t / 3)
export const RUN_MIN = 10

// ---------- 第 6 课：干电池 ----------
export const DRY = {
  zinc: { name: '锌筒', role: '负极', say: '电池的外壳就是负极。用着用着锌被消耗，筒壁会变薄甚至穿孔' },
  carbon: { name: '石墨棒', role: '正极', say: '插在正中间，只导电，自己不参加反应' },
  paste: { name: '二氧化锰和氯化铵糊', role: '正极反应物和电解质', say: '二氧化锰在正极得到电子；氯化铵糊是电解质。糊状的不会流出来，所以叫“干”电池' },
  seal: { name: '封口和金属帽', role: '密封、接触', say: '防止里面的糊变干或漏出来。顶上的金属帽和石墨棒相连，是正极的接头' },
} as const
export type DryKey = keyof typeof DRY
export const DRY_VOLT = 1.5

// ---------- 第 7 课：氢氧燃料电池 ----------
export const FUEL = { neg: '氢气', pos: '氧气', product: '水', total: '2H₂ + O₂ = 2H₂O' }
/** 两种气体都通进去才有电 */
export const fuelRuns = (h2: boolean, o2: boolean) => h2 && o2
