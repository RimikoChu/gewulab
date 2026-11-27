// 水溶液里的离子平衡实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/ionic.md 里：常温 25 °C；Kw = 1.0×10⁻¹⁴；Ka(CH₃COOH) = 1.75×10⁻⁵；Kb(NH₃·H₂O) = 1.8×10⁻⁵；
// H₂CO₃ 的 Ka2 = 4.7×10⁻¹¹；Ksp(AgCl) = 1.8×10⁻¹⁰，Ksp(AgI) = 8.5×10⁻¹⁷；稀溶液体积相加。

export const KW = 1.0e-14
export const KA_HAC = 1.75e-5
export const KB_NH3 = 1.8e-5
export const KA2_H2CO3 = 4.7e-11
export const KSP = { AgCl: 1.8e-10, AgI: 8.5e-17 } as const

/** 由氢离子浓度（mol/L）求 pH */
export const phOf = (cH: number) => -Math.log10(cH)
/** 由 pH 求氢离子浓度 */
export const cHOf = (pH: number) => 10 ** -pH
/** pH 计读数：两位小数 */
export const meter = (pH: number) => pH.toFixed(2)
/** 科学计数法写成 1.3×10⁻³ 这样 */
const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
export function sci(v: number, digits = 1) {
  if (v === 0) return '0'
  const e = Math.floor(Math.log10(Math.abs(v)) + 1e-9), m = v / 10 ** e
  const ms = m.toFixed(digits), [mm, ee] = +ms >= 10 ? [(m / 10).toFixed(digits), e + 1] : [ms, e]
  return `${mm}×10${String(ee).split('').map(c => SUP[c]).join('')}`
}

/** 弱酸 HA（浓度 c，电离常数 Ka）电离出的 c(H⁺)：解 x² / (c − x) = Ka，不忽略已电离的部分 */
export function weakAcidH(c: number, ka = KA_HAC) { return (-ka + Math.sqrt(ka * ka + 4 * ka * c)) / 2 }
/** 弱酸的电离度 α = c(H⁺) / c */
export const alphaOf = (c: number, ka = KA_HAC) => weakAcidH(c, ka) / c
/** 由 pH 计读数反算 Ka：Ka = c(H⁺)² / (c − c(H⁺)) */
export const kaFromPH = (c: number, pH: number) => { const h = cHOf(pH); return h * h / (c - h) }

// ---------- 第 1 课：强电解质和弱电解质 ----------
/** 两杯 0.10 mol/L 的酸：盐酸完全电离，醋酸部分电离 */
export const CELLS = {
  hcl: { name: '盐酸', formula: 'HCl', c: 0.1 },
  hac: { name: '醋酸', formula: 'CH₃COOH', c: 0.1 },
} as const
export type CellKey = keyof typeof CELLS
/** 溶液里 c(H⁺)（mol/L） */
export const cellH = (k: CellKey) => k === 'hcl' ? CELLS.hcl.c : weakAcidH(CELLS.hac.c)
/** 电离了几成（0–1） */
export const cellAlpha = (k: CellKey) => cellH(k) / CELLS[k].c
/** 灯泡亮度（0–1，示意）：按自由移动的离子浓度比，盐酸那杯算 1 */
export const glow = (k: CellKey) => cellH(k) / cellH('hcl')

// ---------- 第 2 课：醋酸的电离平衡 ----------
export const HAC = { c0: 0.1, c1: 0.01 }
/** 稀释前后醋酸的 pH */
export const hacPH = (c: number) => phOf(weakAcidH(c))

// ---------- 第 3 课：水的电离和水的离子积 ----------
/** 水的离子积随温度：25 °C 1.0×10⁻¹⁴，50 °C 5.3×10⁻¹⁴（教材数据表） */
export const KW_T = { 25: 1.0e-14, 50: 5.3e-14 } as const
export type Temp = keyof typeof KW_T
/** 纯水：c(H⁺) = c(OH⁻) = √Kw */
export const pureH = (t: Temp) => Math.sqrt(KW_T[t])
export const purePH = (t: Temp) => phOf(pureH(t))
/** 第 3 课的三杯：纯水、0.010 mol/L 盐酸、0.010 mol/L 氢氧化钠溶液（25 °C） */
export const WATERS = {
  water: { name: '纯水' },
  hcl: { name: '0.010 mol/L 盐酸' },
  naoh: { name: '0.010 mol/L NaOH 溶液' },
} as const
export type WaterKey = keyof typeof WATERS
/** 某杯在温度 t 下的 c(H⁺)、c(OH⁻)：酸碱的那两杯按完全电离、水电离的部分忽略 */
export function ions(k: WaterKey, t: Temp = 25) {
  const kw = KW_T[t]
  if (k === 'water') { const h = Math.sqrt(kw); return { h, oh: h } }
  if (k === 'hcl') return { h: 0.01, oh: kw / 0.01 }
  return { h: kw / 0.01, oh: 0.01 }
}
export const waterPH = (k: WaterKey, t: Temp = 25) => phOf(ions(k, t).h)

// ---------- 第 4 课：溶液 pH 的计算（稀释） ----------
/** 从 0.10 mol/L 起，每次稀释十倍；稀释 n 次后的浓度 */
export const dilC = (n: number) => 0.1 / 10 ** n
/** 强酸（盐酸）稀释 n 次后的 pH：c(H⁺) 里把水电离出的那一点也算上，所以无限稀释也只趋近 7 */
export function hclDilPH(n: number) { const c = dilC(n); return phOf((c + Math.sqrt(c * c + 4 * KW)) / 2) }
/** 弱酸（醋酸）稀释 n 次后的 pH */
export const hacDilPH = (n: number) => hacPH(dilC(n))
export type AcidKey = 'hcl' | 'hac'
export const dilPH = (k: AcidKey, n: number) => k === 'hcl' ? hclDilPH(n) : hacDilPH(n)
export const DIL_MAX = 3

// ---------- 第 5 课：酸碱中和滴定 ----------
/** 用 0.1000 mol/L NaOH 溶液滴定 20.00 mL 0.1000 mol/L 盐酸 */
export const TITR = { vAcid: 20, cAcid: 0.1, cBase: 0.1, fast: 19.9, half: 0.02, full: 25 }
/** 加入 v mL NaOH 溶液后的 pH（强酸强碱，体积相加） */
export function titrationPH(v: number) {
  const { vAcid, cAcid, cBase } = TITR
  const d = vAcid * cAcid - v * cBase, tot = vAcid + v
  if (Math.abs(d) < 1e-9) return 7
  return d > 0 ? phOf(d / tot) : 14 + Math.log10(-d / tot)
}
/** 滴定管读数：两位小数 */
export const burette = (v: number) => v.toFixed(2)
/** 指示剂和它的变色范围（pH）、酸色和碱色 */
export const INDICATORS = {
  phenol: { name: '酚酞', range: [8.2, 10.0], acid: '无色', base: '红色' },
  methyl: { name: '甲基橙', range: [3.1, 4.4], acid: '红色', base: '黄色' },
  litmus: { name: '石蕊', range: [5.0, 8.0], acid: '红色', base: '蓝色' },
} as const
export type IndKey = keyof typeof INDICATORS
/** 酚酞在这个 pH 下红到几成（0–1，示意：变色范围里线性过渡） */
export const phenolPink = (pH: number) => Math.max(0, Math.min(1, (pH - 8.2) / 1.8))
/** 曲线：0–25 mL，19–21 mL 加密 */
export function titrationCurve() {
  const pts: [number, number][] = []
  for (let v = 0; v <= 25.0001; v += 0.25) pts.push([v, titrationPH(v)])
  for (let v = 19.5; v <= 20.5; v += 0.01) pts.push([v, titrationPH(v)])
  return pts.sort((a, b) => a[0] - b[0])
}
/** 突跃：差 0.1%（少加或多加 0.02 mL）时的 pH */
export const JUMP = { lo: titrationPH(19.98), hi: titrationPH(20.02) }

// ---------- 第 6 课：盐类的水解 ----------
export const SALTS = {
  nacl: { name: '氯化钠', formula: 'NaCl', c: 0.1 },
  hac: { name: '醋酸钠', formula: 'CH₃COONa', c: 0.1 },
  nh4: { name: '氯化铵', formula: 'NH₄Cl', c: 0.1 },
} as const
export type SaltKey = keyof typeof SALTS
/** 水解常数 Kh = Kw / Ka（或 Kw / Kb） */
export const KH = { hac: KW / KA_HAC, nh4: KW / KB_NH3 }
/** 盐溶液的 pH：强酸强碱盐不水解；弱酸强碱盐 c(OH⁻) 由 x²/(c−x) = Kh 解；强酸弱碱盐 c(H⁺) 同样解 */
export function saltPH(k: SaltKey) {
  const c = SALTS[k].c
  if (k === 'nacl') return 7
  const x = weakAcidH(c, KH[k])
  return k === 'hac' ? 14 + Math.log10(x) : phOf(x)
}
export const acidity = (pH: number) => pH < 6.995 ? '酸性' : pH > 7.005 ? '碱性' : '中性'

// ---------- 第 7 课：沉淀溶解平衡 ----------
/** 试管里 2 mL 0.1 mol/L NaCl 溶液，滴 2 滴 0.1 mol/L AgNO₃，再滴 4 滴 0.1 mol/L KI；一滴按 0.05 mL */
export const PPT = { vNaCl: 2, c: 0.1, drop: 0.05, agDrops: 2, kiDrops: 4 }
/** 刚滴进 AgNO₃ 还没沉淀时的离子积 Q = c(Ag⁺)·c(Cl⁻) */
export function qAgCl() {
  const { vNaCl, c, drop, agDrops } = PPT, v = vNaCl + agDrops * drop
  return (agDrops * drop * c / v) * (vNaCl * c / v)
}
/** AgCl 沉淀以后，溶液里剩下的 c(Ag⁺) = Ksp / c(Cl⁻)（Cl⁻ 大大过量） */
export function agLeft() {
  const { vNaCl, c, drop, agDrops } = PPT, v = vNaCl + agDrops * drop
  return KSP.AgCl / ((vNaCl * c - agDrops * drop * c) / v)
}
/** 滴进 KI 那一刻 AgI 的离子积 Q = c(Ag⁺)·c(I⁻) */
export function qAgI() {
  const { vNaCl, c, drop, agDrops, kiDrops } = PPT, v0 = vNaCl + agDrops * drop, v = v0 + kiDrops * drop
  return agLeft() * v0 / v * (kiDrops * drop * c / v)
}
/** Q 和 Ksp 比：大于就有沉淀析出 */
export const willPrecipitate = (q: number, ksp: number) => q > ksp
/** 沉淀转化 AgCl(s) + I⁻ ⇌ AgI(s) + Cl⁻ 的平衡常数 K = Ksp(AgCl) / Ksp(AgI) */
export const convK = () => KSP.AgCl / KSP.AgI

// ---------- 拓展：纯碱去油污、铝盐净水 ----------
/** 0.10 mol/L Na₂CO₃ 溶液的 pH：只算第一步水解，Kh1 = Kw / Ka2 */
export const SODA = { c: 0.1 }
export const sodaPH = () => 14 + Math.log10(weakAcidH(SODA.c, KW / KA2_H2CO3))
