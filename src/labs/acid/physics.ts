// 酸、碱和中和实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/acid.md 里：常温 25 °C，水的离子积 1×10⁻¹⁴；相对原子质量 H 1、O 16、S 32、Ca 40。
export const KW = 1e-14

/** 由氢离子浓度（mol/L）求 pH */
export const phOf = (cH: number) => -Math.log10(cH)
/** 由氢氧根浓度（mol/L）求 pH */
export const phOfOH = (cOH: number) => 14 + Math.log10(cOH)
/** pH 计的读数：保留一位小数 */
export const meter = (pH: number) => pH.toFixed(1)

// ---------- 指示剂（第 1 课、第 5 课） ----------
export type Hue = 'red' | 'purple' | 'blue' | 'none' | 'pink' | 'green'
/** 紫色石蕊溶液：遇酸变红、遇碱变蓝、中性仍为紫色（按 pH < 5 红、> 8 蓝） */
export const litmus = (pH: number): Hue => pH < 5 ? 'red' : pH > 8 ? 'blue' : 'purple'
/** 无色酚酞溶液：遇碱变红（pH ≥ 8.2），遇酸和中性不变色 */
export const PHENOL_TURN = 8.2
export const phenol = (pH: number): Hue => pH >= PHENOL_TURN ? 'pink' : 'none'
/** 紫甘蓝汁（拓展）：遇酸变红，中性紫色，遇碱变绿 */
export const cabbage = (pH: number): Hue => pH < 6 ? 'red' : pH > 8 ? 'green' : 'purple'
export const HUE_NAME: Record<Hue, string> = { red: '变红', purple: '紫色不变', blue: '变蓝', none: '不变色', pink: '变红', green: '变绿' }

/** 第 1 课的三种溶液：pH 只用来定颜色，界面上不显示 */
export const SAMPLES = {
  acid: { name: '稀盐酸', pH: 1, kind: '酸' },
  salt: { name: '食盐水', pH: 7, kind: '中性' },
  lime: { name: '石灰水', pH: 12, kind: '碱' },
} as const
export type SampleKey = keyof typeof SAMPLES

// ---------- 第 5 课：中和滴定 ----------
export const TITR = { vBase: 20, cBase: 0.1, cAcid: 0.1, drop: 0.05, fast: 19.5 }
/** 往 20.00 mL 0.100 mol/L 氢氧化钠溶液里加入 v mL 0.100 mol/L 盐酸后的 pH（强酸强碱，体积相加） */
export function titrationPH(v: number) {
  const { vBase, cBase, cAcid } = TITR
  const nOH = vBase * cBase, nH = v * cAcid, tot = vBase + v
  const d = nOH - nH
  if (Math.abs(d) < 1e-9) return 7
  return d > 0 ? phOfOH(d / tot) : phOf(-d / tot)
}
/** 滴定管读数：两位小数 */
export const burette = (v: number) => v.toFixed(2)
/** 加到 v mL 时溶液里滴了酚酞会不会红 */
export const titrationPink = (v: number) => phenol(titrationPH(v)) === 'pink'
/** 曲线：0–25 mL 每 0.25 mL 一个点，19–21 mL 加密 */
export function titrationCurve() {
  const pts: [number, number][] = []
  for (let v = 0; v <= 25.0001; v += 0.25) pts.push([v, titrationPH(v)])
  for (let v = 19.5; v <= 20.5; v += 0.01) pts.push([v, titrationPH(v)])
  return pts.sort((a, b) => a[0] - b[0])
}

// ---------- 第 6 课：pH 试纸 ----------
/** 广泛 pH 试纸的标准比色卡（1–14） */
export const CHART = ['#d7262b', '#ea4a2d', '#f07a2a', '#f4a52b', '#f2cb2e', '#cfd33a', '#8cc43f', '#3fa64a', '#1f8f6e', '#2a6f9e', '#2f4f9a', '#3e3a8f', '#55308a', '#5c2672']
/** 试纸读数：整数，0–14 之间 */
export const paperRead = (pH: number) => Math.max(1, Math.min(14, Math.round(pH)))
export const paperColor = (pH: number) => CHART[paperRead(pH) - 1]
export const acidity = (pH: number) => pH < 7 ? '酸性' : pH > 7 ? '碱性' : '中性'
/** 第 6 课的三瓶水样：按浓度设定（规格卡），读数由浓度算 */
export const WATERS = {
  inflow: { name: '调节池进水', pH: phOf(0.01) },
  outflow: { name: '中和池出水', pH: 7 },
  alkali: { name: '加药间碱液', pH: phOfOH(0.01) },
} as const
export type WaterKey = keyof typeof WATERS
/** 排放要求：pH 6–9（GB 18918-2002 基本控制项目） */
export const DISCHARGE = [6, 9] as const
export const canDischarge = (pH: number) => pH >= DISCHARGE[0] && pH <= DISCHARGE[1]

// ---------- 第 7 课：中和池 ----------
export const MR = { CaOH2: 40 + 2 * (16 + 1), H2SO4: 2 + 32 + 64 }
/** 一池废水：100 m³，含硫酸 0.005 mol/L */
export const POND = { vol: 100, cAcid: 0.005 }
/** 这一池里的硫酸（mol） */
export const acidMol = (vol = POND.vol, c = POND.cAcid) => vol * 1000 * c
/** 恰好中和要的熟石灰（kg）：Ca(OH)₂ + H₂SO₄ = CaSO₄ + 2H₂O，1 : 1 */
export const limeNeed = (vol = POND.vol, c = POND.cAcid) => acidMol(vol, c) * MR.CaOH2 / 1000
/** 投加 kg 千克熟石灰、搅匀后池水的 pH */
export function pondPH(kg: number, vol = POND.vol, c = POND.cAcid) {
  const L = vol * 1000, nAcid = acidMol(vol, c), nBase = kg * 1000 / MR.CaOH2, d = nAcid - nBase
  if (Math.abs(d) < 1e-6) return 7
  return d > 0 ? phOf(2 * d / L) : phOfOH(-2 * d / L)
}
export const DOSES = [20, 37, 50] as const
export type Dose = typeof DOSES[number]

// ---------- 拓展：中和放热 ----------
export const HEAT = { v: 50, c: 0.5, q: 57.3, cp: 4.18, t0: 20 }
/** 50 mL 0.50 mol/L 盐酸和 50 mL 0.50 mol/L 氢氧化钠混合，升高的温度（°C），不计散热 */
export function heatRise() {
  const n = HEAT.v / 1000 * HEAT.c, m = HEAT.v * 2
  return n * HEAT.q * 1000 / (m * HEAT.cp)
}
