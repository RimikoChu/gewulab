// 电解和金属防护实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/electrolysis.md 里：相对原子质量 H 1、O 16、Na 23、Mg 24、Al 27、Cl 35.5、Fe 56、Cu 64、Zn 65；
// 标准状况下气体摩尔体积 22.4 L/mol。

/** 摩尔质量（g/mol） */
export const MOLAR = { H2: 2, O2: 32, Cl2: 71, NaOH: 40, Na: 23, Mg: 24, Al: 27, Cu: 64, Zn: 65, Fe: 56 } as const
/** 标准状况下的气体摩尔体积（L/mol） */
export const VM = 22.4
const round = (x: number, n = 2) => Math.round(x * 10 ** n) / 10 ** n

// ---------- 放电顺序（第 1、3 课） ----------
/** 阳离子在阴极上得电子的顺序（前面的先放电）。水溶液里排在 H⁺ 后面的不放电，由水电离出的 H⁺ 放电 */
export const CATHODE_ORDER = ['Ag⁺', 'Cu²⁺', 'H⁺', 'Zn²⁺', 'Fe²⁺', 'Al³⁺', 'Mg²⁺', 'Na⁺', 'K⁺'] as const
/** 阴离子在惰性阳极上失电子的顺序（前面的先放电） */
export const ANODE_ORDER = ['S²⁻', 'I⁻', 'Br⁻', 'Cl⁻', 'OH⁻', 'SO₄²⁻', 'NO₃⁻'] as const
export type Cation = typeof CATHODE_ORDER[number]
export type Anion = typeof ANODE_ORDER[number]
/** 几种离子里谁先放电：在顺序表里最靠前的那个 */
export const first = <T extends string>(order: readonly T[], ions: readonly T[]) => order.find(i => ions.includes(i))!

/** 第 3 课用惰性电极电解的四种溶液。ions 里含水电离出的 H⁺、OH⁻ */
export const SOLUTIONS = {
  cucl2: { name: 'CuCl₂ 溶液', short: 'CuCl₂', cations: ['Cu²⁺', 'H⁺'], anions: ['Cl⁻', 'OH⁻'] },
  nacl: { name: 'NaCl 溶液', short: 'NaCl', cations: ['Na⁺', 'H⁺'], anions: ['Cl⁻', 'OH⁻'] },
  cuso4: { name: 'CuSO₄ 溶液', short: 'CuSO₄', cations: ['Cu²⁺', 'H⁺'], anions: ['SO₄²⁻', 'OH⁻'] },
  na2so4: { name: 'Na₂SO₄ 溶液', short: 'Na₂SO₄', cations: ['Na⁺', 'H⁺'], anions: ['SO₄²⁻', 'OH⁻'] },
} as const satisfies Record<string, { name: string; short: string; cations: readonly Cation[]; anions: readonly Anion[] }>
export type SolKey = keyof typeof SOLUTIONS

const CATHODE_RX: Partial<Record<Cation, { product: string; eq: string; gas: boolean }>> = {
  'Cu²⁺': { product: 'Cu', eq: 'Cu²⁺ + 2e⁻ = Cu', gas: false },
  'H⁺': { product: 'H₂', eq: '2H₂O + 2e⁻ = H₂↑ + 2OH⁻', gas: true },
}
const ANODE_RX: Partial<Record<Anion, { product: string; eq: string }>> = {
  'Cl⁻': { product: 'Cl₂', eq: '2Cl⁻ − 2e⁻ = Cl₂↑' },
  'OH⁻': { product: 'O₂', eq: '2H₂O − 4e⁻ = O₂↑ + 4H⁺' },
}
const TOTAL: Record<SolKey, string> = {
  cucl2: 'CuCl₂ ═ Cu + Cl₂↑',
  nacl: '2NaCl + 2H₂O ═ 2NaOH + H₂↑ + Cl₂↑',
  cuso4: '2CuSO₄ + 2H₂O ═ 2Cu + O₂↑ + 2H₂SO₄',
  na2so4: '2H₂O ═ 2H₂↑ + O₂↑',
}
/**
 * 用惰性电极电解一种溶液：两极各是哪种离子放电、得到什么、电极反应式、总反应。
 * around：电解后电极附近溶液的酸碱性（阴极区、阳极区）；ratio：阴极气体和阳极气体的体积比（两极都出气体时才有）
 */
export function electrolyze(k: SolKey) {
  const s = SOLUTIONS[k], c = first(CATHODE_ORDER, s.cations), a = first(ANODE_ORDER, s.anions)
  const cat = CATHODE_RX[c]!, an = ANODE_RX[a]!
  const perE = (p: string) => p === 'O₂' ? 0.25 : 0.5                       // 每转移 1 mol 电子得到几摩尔气体
  return {
    cathodeIon: c, anodeIon: a, cathode: cat.product, anode: an.product, cathodeEq: cat.eq, anodeEq: an.eq, total: TOTAL[k],
    cathodeBase: c === 'H⁺', anodeAcid: a === 'OH⁻',
    ratio: cat.gas ? perE(cat.product) / perE(an.product) : null,
  }
}

// ---------- 第 1 课：电解氯化铜溶液 ----------
/** 转移 n mol 电子：阴极析出多少克铜，阳极放出多少升氯气（标准状况） */
export const cucl2Yield = (nE: number) => ({ cu: round(nE / 2 * MOLAR.Cu), cl2: round(nE / 2 * VM) })
/** 湿润的淀粉碘化钾试纸遇到这种气体变不变蓝：氯气把 I⁻ 氧化成 I₂，I₂ 遇淀粉变蓝 */
export const paperBlue = (gas: string) => gas === 'Cl₂'

// ---------- 第 2 课：电解池和原电池 ----------
export const CELLS = {
  electro: { name: '电解池', power: true, energy: '电能 → 化学能', ox: '阳极', red: '阴极', oxLink: '接电源正极', redLink: '接电源负极', electron: '电源负极 → 阴极，阳极 → 电源正极', cation: '阴极', anion: '阳极' },
  galvanic: { name: '原电池', power: false, energy: '化学能 → 电能', ox: '负极', red: '正极', oxLink: '较活泼的金属', redLink: '较不活泼的金属或石墨', electron: '负极 → 导线 → 正极', cation: '正极', anion: '负极' },
} as const
export type CellKey = keyof typeof CELLS
/** 发生氧化反应的那一极叫什么 */
export const oxidationAt = (k: CellKey) => CELLS[k].ox
/** 阳离子往哪一极移动：总是移向发生还原反应的那一极 */
export const cationTo = (k: CellKey) => CELLS[k].cation

// ---------- 第 4 课：电解饱和食盐水 ----------
/** 转移 n mol 电子：氢气、氯气、氢氧化钠各多少摩尔，以及质量（g）和气体体积（L，标准状况） */
export function chlorAlkali(nE: number) {
  const h2 = nE / 2, cl2 = nE / 2, naoh = nE
  return { h2, cl2, naoh, h2L: round(h2 * VM), cl2L: round(cl2 * VM), naohG: round(naoh * MOLAR.NaOH), cl2G: round(cl2 * MOLAR.Cl2), h2G: round(h2 * MOLAR.H2) }
}
/** 阳离子交换膜只让阳离子通过 */
export const membranePass = (ion: string) => /⁺$/.test(ion)
export const BRINE = { cathodeEq: '2H₂O + 2e⁻ = H₂↑ + 2OH⁻', anodeEq: '2Cl⁻ − 2e⁻ = Cl₂↑', total: TOTAL.nacl }

// ---------- 第 5 课：电镀和电解精炼铜 ----------
/** 金属活动性顺序（前面的活泼） */
export const ACTIVITY = ['K', 'Ca', 'Na', 'Mg', 'Al', 'Zn', 'Fe', 'Sn', 'Pb', 'H', 'Cu', 'Hg', 'Ag', 'Pt', 'Au'] as const
export type Metal = typeof ACTIVITY[number]
/** a 比 b 活泼吗 */
export const moreActive = (a: Metal, b: Metal) => ACTIVITY.indexOf(a) < ACTIVITY.indexOf(b)
/** 粗铜做阳极时，里面的这种金属去了哪里：比铜活泼的失电子进入溶液，铜溶解，比铜不活泼的沉到槽底成阳极泥 */
export const crudeFate = (m: Metal): 'ion' | 'copper' | 'mud' => m === 'Cu' ? 'copper' : moreActive(m, 'Cu') ? 'ion' : 'mud'
export const PLATING = {
  plate: { name: '铁件镀铜', anode: '铜片（镀层金属）', cathode: '铁件（镀件）', bath: 'CuSO₄ 溶液（含镀层金属离子）', anodeEq: 'Cu − 2e⁻ = Cu²⁺', cathodeEq: 'Cu²⁺ + 2e⁻ = Cu' },
  refine: { name: '电解精炼铜', anode: '粗铜', cathode: '纯铜', bath: 'CuSO₄ 溶液', anodeEq: 'Cu − 2e⁻ = Cu²⁺（Zn、Fe 等也失电子）', cathodeEq: 'Cu²⁺ + 2e⁻ = Cu' },
} as const
export type PlateKey = keyof typeof PLATING
/**
 * 转移 n mol 电子后两极质量的变化（g）。电镀：阳极溶解多少铜，阴极就镀上多少，溶液里 Cu²⁺ 浓度不变。
 * 精炼：阴极增加的全是铜；阳极除了铜还有锌、铁等溶解，银、金沉到槽底，所以阳极减少的质量和阴极增加的不相等（anodeLoss 给 null），Cu²⁺ 浓度略有减小
 */
export function plating(k: PlateKey, nE: number) {
  const gain = round(nE / 2 * MOLAR.Cu)
  return k === 'plate' ? { gain, anodeLoss: gain as number | null, cu: '不变' } : { gain, anodeLoss: null as number | null, cu: '略有减小' }
}
/** 第 5 课每次通电转移的电子（mol） */
export const PLATE_NE = 0.2

// ---------- 第 6 课：金属的电化学腐蚀 ----------
export const CORROSION = {
  neutral: { name: '食盐水（中性）', kind: '吸氧腐蚀', neg: 'Fe − 2e⁻ = Fe²⁺', pos: 'O₂ + 2H₂O + 4e⁻ = 4OH⁻', gas: -1 },
  acid: { name: '稀酸（酸性较强）', kind: '析氢腐蚀', neg: 'Fe − 2e⁻ = Fe²⁺', pos: '2H⁺ + 2e⁻ = H₂↑', gas: 1 },
} as const
export type EnvKey = keyof typeof CORROSION
/** 水膜的酸碱性决定腐蚀类型：酸性较强时析氢，酸性很弱或中性时吸氧 */
export const corrosionKind = (env: EnvKey) => CORROSION[env].kind
/** 密闭的试管里气体是变多（+1）还是变少（−1）：吸氧腐蚀消耗氧气，导管里的水柱上升；析氢腐蚀放出氢气，水柱被压下去 */
export const gasChange = (env: EnvKey) => CORROSION[env].gas
/** 导管里水柱相对起始位置的高度变化（示意，单位 cm）：t 是观察了几分钟，几分钟后变化趋缓 */
export const columnShift = (env: EnvKey, min: number) => round(-gasChange(env) * 3 * (1 - Math.exp(-min / 3)), 1)

// ---------- 第 7 课：金属的电化学防护 ----------
export const GUARDS = {
  none: { name: '不保护', method: '', principle: '钢里的铁和碳、海水构成无数微小的原电池', steel: '负极', steelSafe: false },
  zinc: { name: '挂锌块', method: '牺牲阳极法', principle: '原电池原理', steel: '正极', steelSafe: true },
  copper: { name: '挂铜块', method: '', principle: '原电池原理（接反了）', steel: '负极', steelSafe: false },
  power: { name: '外加电流', method: '外加电流法', principle: '电解池原理', steel: '阴极', steelSafe: true },
} as const
export type GuardKey = keyof typeof GUARDS
/** 和钢连在一起泡在海水里的另一块金属，能不能保护钢：必须比铁活泼，自己做负极被腐蚀 */
export const sacrificial = (m: Metal) => moreActive(m, 'Fe')
/** 钢桩腐蚀的快慢（0 不腐蚀，1 自然腐蚀，2 比不保护还快）：受保护时为 0；和不活泼的金属相连时更快 */
export const steelRate = (k: GuardKey) => GUARDS[k].steelSafe ? 0 : k === 'copper' ? 2 : 1
/** 电子在导线里往哪流 */
export const guardFlow = (k: GuardKey) => k === 'zinc' ? '锌块 → 钢桩' : k === 'copper' ? '钢桩 → 铜块' : k === 'power' ? '电源负极 → 钢桩' : '铁 → 钢里的碳'

// ---------- 拓展课：电冶金 ----------
export const SMELT = {
  Na: { name: '钠', raw: '熔融 NaCl', z: 1, cathodeEq: 'Na⁺ + e⁻ = Na', anodeEq: '2Cl⁻ − 2e⁻ = Cl₂↑', total: '2NaCl（熔融）═ 2Na + Cl₂↑', gas: 'Cl₂', ion: 'Na⁺', anion: 'Cl⁻' },
  Mg: { name: '镁', raw: '熔融 MgCl₂', z: 2, cathodeEq: 'Mg²⁺ + 2e⁻ = Mg', anodeEq: '2Cl⁻ − 2e⁻ = Cl₂↑', total: 'MgCl₂（熔融）═ Mg + Cl₂↑', gas: 'Cl₂', ion: 'Mg²⁺', anion: 'Cl⁻' },
  Al: { name: '铝', raw: '熔融 Al₂O₃（加冰晶石）', z: 3, cathodeEq: 'Al³⁺ + 3e⁻ = Al', anodeEq: '2O²⁻ − 4e⁻ = O₂↑', total: '2Al₂O₃（熔融）═ 4Al + 3O₂↑', gas: 'O₂', ion: 'Al³⁺', anion: 'O²⁻' },
} as const
export type SmeltKey = keyof typeof SMELT
/** 转移 n mol 电子得到多少克金属 */
export const smeltMass = (k: SmeltKey, nE: number) => round(nE / SMELT[k].z * MOLAR[k])
/** 拓展课每次送电转移的电子（mol） */
export const SMELT_NE = 6
/** 电解食盐水溶液得不到钠：水溶液里 H⁺ 比 Na⁺ 先放电 */
export const sodiumFromBrine = () => first(CATHODE_ORDER, SOLUTIONS.nacl.cations) === 'Na⁺'
