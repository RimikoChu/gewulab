// 金属和炼铁实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 质量用 g（工业上用 t）；相对原子质量按教材附录取整（Cl 取 35.5）。取值约定写在规格卡 docs/specs/metal.md 里。

/** 相对原子质量 */
export const AR = { H: 1, C: 12, O: 16, Mg: 24, Al: 27, S: 32, Cl: 35.5, Fe: 56, Cu: 64, Zn: 65, Ag: 108 } as const

/** 两位小数的质量 */
export const fmtG = (g: number) => g.toFixed(2)

// ---------- 第 1 课：金属的物理性质 ----------
/** 教材数据表：导电性（以银为 100） */
export const CONDUCT = [['银', 100], ['铜', 99], ['金', 74], ['铝', 61], ['铁', 17]] as const
/** 教材数据表：硬度（以金刚石为 10） */
export const HARD = [['铁', '4–5'], ['铜', '2.5–3'], ['铝', '2–2.9']] as const
/** 刻画用的两种片：黄铜是铜锌合金 */
export type Sheet = 'brass' | 'copper'
const IS_ALLOY: Record<Sheet, boolean> = { brass: true, copper: false }
/** 两片互相刻画，返回硬的那一片（另一片上留下划痕）。依据：合金的硬度一般比组成它的纯金属大 */
export const harder = (a: Sheet, b: Sheet): Sheet => IS_ALLOY[a] === IS_ALLOY[b] ? a : IS_ALLOY[a] ? a : b
/** 第 1 课的四件事 */
export const PROPS = ['conduct', 'heat', 'ductile', 'scratch'] as const
export type Prop = (typeof PROPS)[number]

// ---------- 第 2 课：金属和氧气 ----------
export type OxMetal = 'Mg' | 'Al' | 'Cu' | 'Au'
/** 每种金属和氧气：什么条件下反应、看到什么、方程式 */
export const OXY: Record<OxMetal, { name: string; sample: string; cond: string; see: string; eq: string | null }> = {
  Mg: { name: '镁', sample: '镁条', cond: '点燃', see: '剧烈燃烧，发出耀眼的白光，生成白色固体', eq: '2Mg + O₂ =点燃= 2MgO' },
  Al: { name: '铝', sample: '铝箔', cond: '常温', see: '表面生成致密的氧化铝薄膜', eq: '4Al + 3O₂ = 2Al₂O₃' },
  Cu: { name: '铜', sample: '铜丝', cond: '加热', see: '红色的铜丝表面变黑', eq: '2Cu + O₂ =△= 2CuO' },
  Au: { name: '金', sample: '金丝', cond: '高温也不反应', see: '烧红了，冷却后仍是金黄色', eq: null },
}
/** 金属完全氧化后生成的氧化物质量（g）。金不反应，返回 0 */
export function oxideMass(metal: OxMetal, g: number) {
  if (metal === 'Mg') return g / AR.Mg * (AR.Mg + AR.O)                         // 2Mg + O₂ = 2MgO
  if (metal === 'Al') return g / (4 * AR.Al) * 2 * (2 * AR.Al + 3 * AR.O)       // 4Al + 3O₂ = 2Al₂O₃
  if (metal === 'Cu') return g / AR.Cu * (AR.Cu + AR.O)                         // 2Cu + O₂ = 2CuO
  return 0
}
/** 第 2 课点燃的镁条质量（g） */
export const MG_RIBBON = 0.24

// ---------- 第 3 课：金属和酸 ----------
export type AcidMetal = 'Mg' | 'Zn' | 'Fe' | 'Cu'
export const ACID_METALS: AcidMetal[] = ['Mg', 'Zn', 'Fe', 'Cu']
/** 放进稀盐酸：名称、样子、冒泡快慢的说法、画面用的相对快慢（示意，界面不出数）、方程式 */
export const ACID: Record<AcidMetal, { name: string; sample: string; word: string; rate: number; eq: string | null }> = {
  Mg: { name: '镁', sample: '镁条', word: '剧烈', rate: 1, eq: 'Mg + 2HCl = MgCl₂ + H₂↑' },
  Zn: { name: '锌', sample: '锌粒', word: '较快', rate: 0.45, eq: 'Zn + 2HCl = ZnCl₂ + H₂↑' },
  Fe: { name: '铁', sample: '铁片', word: '较慢', rate: 0.13, eq: 'Fe + 2HCl = FeCl₂ + H₂↑' },
  Cu: { name: '铜', sample: '铜片', word: '无气泡', rate: 0, eq: null },
}
/** 一定质量的金属和足量稀盐酸反应生成的氢气质量（g）。镁、锌、铁都是 +2 价：1 份金属原子换出 1 个 H₂ */
export function h2Mass(metal: AcidMetal, g: number) {
  if (metal === 'Cu') return 0
  return g / AR[metal] * 2 * AR.H
}
/** 第 3 课收集氢气用的锌的质量（g） */
export const ZN_GRAMS = 6.5

// ---------- 第 4 课：金属和盐溶液 ----------
export type SaltCase = 'feCu' | 'cuAg' | 'cuAl'
export const SALT_CASES: SaltCase[] = ['feCu', 'cuAg', 'cuAl']
/** 三组：放进去的金属、溶液、能不能反应、现象、方程式；固体质量：放进去多少 g 金属，换出多少 g 金属 */
export const SALT: Record<SaltCase, { short: string; metal: string; solution: string; ok: boolean; see: string; eq: string | null; inG: number; outG: number }> = {
  feCu: { short: '铁 + 硫酸铜', metal: '铁丝', solution: '硫酸铜溶液', ok: true, see: '铁丝表面覆盖一层红色的铜，溶液由蓝色变成浅绿色', eq: 'Fe + CuSO₄ = FeSO₄ + Cu', inG: AR.Fe, outG: AR.Cu },
  cuAg: { short: '铜 + 硝酸银', metal: '铜丝', solution: '硝酸银溶液', ok: true, see: '铜丝表面生成银白色的银，溶液变成蓝色', eq: 'Cu + 2AgNO₃ = Cu(NO₃)₂ + 2Ag', inG: AR.Cu, outG: 2 * AR.Ag },
  cuAl: { short: '铜 + 硫酸铝', metal: '铜丝', solution: '硫酸铝溶液', ok: false, see: '没有变化', eq: null, inG: AR.Cu, outG: 0 },
}
/** 能不能反应（由活动性顺序判断） */
export const displace = (c: SaltCase) => {
  const [m, s] = c === 'feCu' ? ['Fe', 'Cu'] : c === 'cuAg' ? ['Cu', 'Ag'] : ['Cu', 'Al']
  return canDisplace(m as Sym, s as Sym)
}

// ---------- 第 5 课：金属活动性顺序 ----------
/** 教材的金属活动性顺序（H 不是金属，放在中间作分界） */
export const ORDER = ['K', 'Ca', 'Na', 'Mg', 'Al', 'Zn', 'Fe', 'Sn', 'Pb', 'H', 'Cu', 'Hg', 'Ag', 'Pt', 'Au'] as const
export type Sym = (typeof ORDER)[number]
export const NAME: Record<Sym, string> = { K: '钾', Ca: '钙', Na: '钠', Mg: '镁', Al: '铝', Zn: '锌', Fe: '铁', Sn: '锡', Pb: '铅', H: '氢', Cu: '铜', Hg: '汞', Ag: '银', Pt: '铂', Au: '金' }
/** 在顺序里排第几（从 0 起） */
export const rank = (s: Sym) => ORDER.indexOf(s)
/** 能不能和稀盐酸、稀硫酸反应放出氢气：排在氢前面的才能 */
export const canAcid = (s: Sym) => rank(s) < rank('H')
/** 金属 a 能不能把 b 从 b 的盐溶液里置换出来：a 排在 b 前面，且 a 不是钾、钙、钠 */
export const canDisplace = (a: Sym, b: Sym) => rank(a) < rank(b) && !['K', 'Ca', 'Na'].includes(a)
/** 前三课做过的五种金属，按做实验时摆的顺序 */
export const SAMPLES: Sym[] = ['Cu', 'Mg', 'Ag', 'Fe', 'Zn']
/** 排好以后的顺序（从活泼到不活泼） */
export const sorted = (xs: Sym[]) => [...xs].sort((a, b) => rank(a) - rank(b))
/** 第 5 课要判断的三个反应：金属、溶液、要比的对象（盐里的金属，或氢） */
export const JUDGE = [
  { id: 'zn', text: '锌能和硫酸亚铁溶液反应吗？', metal: 'Zn', other: 'Fe', acid: false },
  { id: 'ag', text: '银能和稀盐酸反应吗？', metal: 'Ag', other: 'H', acid: true },
  { id: 'cu', text: '铜能和硝酸汞溶液反应吗？', metal: 'Cu', other: 'Hg', acid: false },
] as const
export const judge = (j: (typeof JUDGE)[number]) => j.acid ? canAcid(j.metal) : canDisplace(j.metal, j.other)

// ---------- 第 6 课：铁的冶炼 ----------
/** Fe₂O₃ 的相对分子质量；其中铁的质量 */
export const FE2O3 = 2 * AR.Fe + 3 * AR.O
/** m g 氧化铁完全还原，生成多少 g 铁 */
export const feFromOxide = (m: number) => m * 2 * AR.Fe / FE2O3
/** 玻璃管里放的氧化铁（g） */
export const OXIDE_G = 1.6
/** 铁矿石 ore t，含氧化铁 pct（0–1），炼出含铁 fePct 的生铁多少 t */
export const pigIron = (ore: number, pct: number, fePct: number) => feFromOxide(ore * pct) / fePct
export const ORE = { t: 1000, pct: 0.8, fe: 0.96 }
/** 实验的步骤：先通 CO，再加热，停止加热后继续通气到冷却 */
export type ReduceStep = 'idle' | 'gas' | 'heat' | 'cool'
/** 操作顺序对不对：没通气就加热是不行的（玻璃管里的空气和一氧化碳混合，加热可能爆炸） */
export const safeToHeat = (gasOn: boolean) => gasOn

// ---------- 第 7 课：铁的锈蚀和防护 ----------
export type Tube = 'A' | 'B' | 'C'
/** 三支试管里的铁钉接触到什么 */
export const TUBES: Record<Tube, { water: boolean; air: boolean; name: string; how: string }> = {
  A: { water: true, air: true, name: '水和空气', how: '一半浸在水里' },
  B: { water: true, air: false, name: '只有水', how: '煮沸过的蒸馏水，上面一层植物油' },
  C: { water: false, air: true, name: '只有干燥空气', how: '放干燥剂，塞紧' },
}
export type Guard = 'paint' | 'oil' | 'zinc'
export const GUARD: Record<Guard, { name: string; how: string }> = {
  paint: { name: '刷漆', how: '漆膜把铁和水、氧气隔开' },
  oil: { name: '涂油', how: '油膜把铁和水、氧气隔开' },
  zinc: { name: '镀锌', how: '锌层把铁和水、氧气隔开' },
}
/** 会不会生锈：同时接触水和氧气、又没有防护层 */
export const rusts = (water: boolean, air: boolean, guarded = false) => water && air && !guarded
/** 放置的天数 */
export const DAYS = 7

// ---------- 拓展：轧钢 ----------
/** 钢坯：厚 230 mm、长 10 m；每道轧后的厚度（mm，示意） */
export const SLAB = { thick: 230, len: 10 }
export const PASSES = [160, 110, 75, 45, 25]
/** 体积不变、宽度不变：轧后的长度（m） */
export const rolled = (len: number, t0: number, t1: number) => len * t0 / t1
/** 含碳量（%） */
export const CARBON = { pig: { name: '生铁', lo: 2, hi: 4.3 }, steel: { name: '钢', lo: 0.03, hi: 2 } }
