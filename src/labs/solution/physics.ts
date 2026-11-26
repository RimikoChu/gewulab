// 溶液实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 质量用 g，温度用 ℃；1 mL 水按 1 g 算。取值约定和数据来历写在规格卡 docs/specs/solution.md 里。

/** 室温 */
export const ROOM = 20
/** 水的密度（g/mL） */
export const RHO_WATER = 1
const r1 = (x: number) => Math.round(x * 10) / 10

// ---------- 溶解度表（g / 100 g 水），0–100 ℃，10 ℃ 一格 ----------
export const TABLE = {
  NaCl: [35.7, 35.8, 36.0, 36.3, 36.6, 37.0, 37.3, 37.8, 38.4, 39.0, 39.8],
  KNO3: [13.3, 20.9, 31.6, 45.8, 63.9, 85.5, 110, 138, 169, 202, 246],
  CaOH2: [0.185, 0.176, 0.165, 0.153, 0.141, 0.128, 0.116, 0.106, 0.094, 0.085, 0.077],
} as const
export type Salt = keyof typeof TABLE
export const SALT_NAME: Record<Salt, string> = { NaCl: '氯化钠', KNO3: '硝酸钾', CaOH2: '氢氧化钙' }
/** 表里的温度点 */
export const TEMPS = TABLE.NaCl.map((_, i) => i * 10)

/** 溶解度（g / 100 g 水）：表里的两格之间按直线插值 */
export function solubility(s: Salt, t: number) {
  const k = Math.max(0, Math.min(100, t)) / 10, i = Math.min(9, Math.floor(k)), f = k - i, a = TABLE[s]
  return a[i] + (a[i + 1] - a[i]) * f
}

/** 往 water g 水里一共加了 added g 溶质，温度 t：溶了多少、剩下多少、饱和没有 */
export function dissolve(s: Salt, water: number, added: number, t: number) {
  const max = water * solubility(s, t) / 100
  const solved = Math.min(added, max)
  return { max, solved, left: Math.max(0, added - max), saturated: added >= max - 1e-9 }
}

// ---------- 第 1 课：三种分散系 ----------
export type Stuff = 'sugar' | 'soil' | 'oil'
export const STUFF_NAME: Record<Stuff, string> = { sugar: '蔗糖', soil: '泥沙', oil: '植物油' }
/** 加进水里搅拌以后得到的是什么；油水里加了洗涤剂是乳化 */
export function mixKind(s: Stuff, detergent = false) {
  if (s === 'sugar') return '溶液'
  if (s === 'soil') return '悬浊液'
  return detergent ? '乳化' : '乳浊液'
}
/** 静置以后分不分层 */
export const settles = (s: Stuff, detergent = false) => s === 'soil' || (s === 'oil' && !detergent)

// ---------- 第 2 课：溶解时的温度变化 ----------
/** 溶解热（kJ/mol，正为吸热）和摩尔质量（g/mol） */
export const HEAT = {
  NH4NO3: { name: '硝酸铵', dH: 25.7, M: 80 },
  NaOH: { name: '氢氧化钠', dH: -44.5, M: 40 },
  NaCl: { name: '氯化钠', dH: 3.9, M: 58.5 },
} as const
export type HeatKey = keyof typeof HEAT
export const C_WATER = 4.18 // J/(g·℃)
/** 把 m g 溶质溶进 w g 水里，初温 t0：溶解后的温度（不计散热，热量全给溶液） */
export function tempAfter(k: HeatKey, m: number, w: number, t0 = ROOM) {
  const q = m / HEAT[k].M * HEAT[k].dH * 1000
  return t0 - q / ((m + w) * C_WATER)
}
/** 第 2 课的用量：5 g 溶质，50 mL 水 */
export const L2 = { solute: 5, water: 50 }

// ---------- 第 3 课：饱和溶液 ----------
export const L3 = { water: 20, scoop: 5, addWater: 10, hot: 60 }

// ---------- 第 4 课：溶解度 ----------
export const L4 = { water: 100, hot: 60 }

// ---------- 第 5 课：溶解度曲线 ----------
/** 硝酸钾和氯化钠两条线的交点：逐格找符号改变的那一段，段内直线求交 */
export function crossing() {
  for (let i = 0; i < 10; i++) {
    const d0 = TABLE.KNO3[i] - TABLE.NaCl[i], d1 = TABLE.KNO3[i + 1] - TABLE.NaCl[i + 1]
    if (d0 <= 0 && d1 > 0) { const t = i * 10 + 10 * (-d0) / (d1 - d0); return { t, s: solubility('NaCl', t) } }
  }
  return { t: NaN, s: NaN }
}

// ---------- 第 6 课：结晶 ----------
/** 饱和溶液（含 water g 水）从 hi 降到 lo，析出多少晶体 */
export const cooled = (s: Salt, water: number, hi: number, lo: number) => water * (solubility(s, hi) - solubility(s, lo)) / 100
/** 含 m g 氯化钠的溶液在 t ℃ 下蒸发，水剩多少时开始析出 */
export const evapStart = (m: number, t: number) => m * 100 / solubility('NaCl', t)
/** 第 6 课的用量：蒸发皿里 5 g 氯化钠溶在 25 g 水里，按 100 ℃ 算；烧杯里 100 g 水的硝酸钾饱和溶液，60 ℃ 降到 20 ℃ */
export const L6 = { salt: 5, water: 25, boil: 100, kWater: 100, hi: 60, lo: ROOM }

// ---------- 第 7 课：溶质的质量分数 ----------
/** 质量分数（%） */
export const fraction = (solute: number, solution: number) => solute / solution * 100
/** 配 total g、w% 的溶液：要多少溶质、多少水（g，也是 mL） */
export function recipe(total: number, w: number) { const solute = total * w / 100; return { solute, water: total - solute, mL: (total - solute) / RHO_WATER } }
/** 用 hi% 的溶液配 total g、lo% 的溶液：要多少浓溶液、加多少水 */
export function dilute(total: number, hi: number, lo: number) { const conc = total * lo / hi; return { conc, water: total - conc } }
export const L7 = { total: 50, w: 6, low: 3 }

/** 显示：一位小数 */
export const g1 = (x: number) => r1(x).toFixed(1)
