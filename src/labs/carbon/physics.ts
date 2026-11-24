// 碳和二氧化碳实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 化学计量用相对原子质量；气体密度按标准状况。取值约定写在规格卡 docs/specs/carbon.md 里。

export type P3 = [number, number, number]
/** 相对原子质量 */
export const AR = { C: 12, O: 16, Ca: 40, Cu: 64, H: 1, Cl: 35.5 } as const
/** 几种物质的相对分子质量 */
export const MR = { CO2: AR.C + 2 * AR.O, CaCO3: AR.Ca + AR.C + 3 * AR.O, CuO: AR.Cu + AR.O, Cu: AR.Cu } as const

// ---------- 第 1 课 碳的单质：三种结构的原子位置 ----------
/** 金刚石：立方晶胞（面心立方再错开四分之一体对角线），取以中心原子为心、半径 r（晶胞边长为 1）以内的原子 */
export function diamondAtoms(r = 0.9): P3[] {
  const base: P3[] = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]]
  const out: P3[] = []
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) for (const [x, y, z] of base) for (const o of [0, 0.25]) {
    const p: P3 = [x + o + i, y + o + j, z + o + k]
    if (Math.hypot(...p) <= r + 1e-9) out.push(p)
  }
  return out
}
/** 金刚石里相邻两个碳原子的距离（晶胞边长为 1）：体对角线的四分之一 */
export const DIAMOND_BOND = Math.sqrt(3) / 4

/** 石墨：几层六边形的平面网，层与层错开（ABA 堆叠）。键长为 1，层间距按 0.335 nm ÷ 0.142 nm 换算；每层取半径 r 以内的原子。层在 x–z 平面里，层间沿 y */
export const GRAPHITE_GAP = 0.335 / 0.142
export function graphiteAtoms(layers = 3, r = 2.6): P3[] {
  const out: P3[] = [], a = Math.sqrt(3)       // 晶格常数（键长的 √3 倍）
  for (let l = 0; l < layers; l++) {
    const shift = l % 2 ? 1 : 0                 // B 层整体挪一个键长
    for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) for (const s of [0, 1]) {
      // 六角格子的两个基矢 (a, 0)、(a/2, 1.5)，每个格点放两个原子（相距一个键长）
      const x = i * a + j * a / 2, z = j * 1.5 + s + shift - 0.5
      if (Math.hypot(x, z) <= r) out.push([x, (l - (layers - 1) / 2) * GRAPHITE_GAP, z])
    }
  }
  return out
}

/** C₆₀：截角二十面体的 60 个顶点（棱长 2），即 (0, ±1, ±3φ)、(±1, ±(2+φ), ±2φ)、(±φ, ±2, ±(2φ+1)) 的轮换 */
export function c60Atoms(): P3[] {
  const f = (1 + Math.sqrt(5)) / 2, out: P3[] = []
  for (const [a, b, c] of [[0, 1, 3 * f], [1, 2 + f, 2 * f], [f, 2, 2 * f + 1]]) {
    const signs = new Set<string>()
    for (const sa of [1, -1]) for (const sb of [1, -1]) for (const sc of [1, -1]) {
      const v: P3 = [a * sa, b * sb, c * sc], key = v.join()
      if (signs.has(key)) continue; signs.add(key)
      out.push(v, [v[1], v[2], v[0]], [v[2], v[0], v[1]])
    }
  }
  return out
}
export const C60_BOND = 2

/** 成键：两原子间距离在 len ± tol 以内就连一根键。返回原子编号对 */
export function bonds(atoms: P3[], len: number, tol = 0.05): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
    const d = Math.hypot(atoms[i][0] - atoms[j][0], atoms[i][1] - atoms[j][1], atoms[i][2] - atoms[j][2])
    if (Math.abs(d - len) < tol * len) out.push([i, j])
  }
  return out
}
/** 某个原子连着几根键 */
export const degree = (b: [number, number][], i: number) => b.filter(([p, q]) => p === i || q === i).length

/** 三种碳单质的性质（教材） */
export const ALLOTROPES = {
  diamond: { name: '金刚石', hard: '10', hardNote: '天然存在最硬的物质', elec: '不导电', look: '无色透明', form: '空间网状结构', use: '玻璃刀、钻探机钻头' },
  graphite: { name: '石墨', hard: '1–2', hardNote: '很软，有滑腻感', elec: '能导电', look: '深灰色、不透明', form: '层状结构', use: '铅笔芯、电极、润滑剂' },
  c60: { name: 'C₆₀', hard: '—', hardNote: '', elec: '—', look: '', form: '60 个碳原子构成的分子，形似足球', use: '超导、催化、材料科学等领域' },
} as const
export type Allotrope = keyof typeof ALLOTROPES

// ---------- 第 2 课 二氧化碳的制取 ----------
/** 碳酸钙完全反应生成二氧化碳的质量（g）：CaCO₃ + 2HCl = CaCl₂ + H₂O + CO₂↑，100 : 44 */
export const co2FromCaCO3 = (m: number) => m * MR.CO2 / MR.CaCO3
/** 锥形瓶里大理石的质量（g） */
export const MARBLE = 10
export type Acid = 'hcl' | 'h2so4'
export const ACIDS: Record<Acid, string> = { hcl: '稀盐酸', h2so4: '稀硫酸' }
/** 产气的快慢（相对，0–1，示意）：稀盐酸几乎一直这么快；稀硫酸生成的硫酸钙微溶，覆盖在大理石表面，很快慢下来 */
const TAU: Record<Acid, number> = { hcl: 60, h2so4: 1.6 }
export const genRate = (acid: Acid, t: number) => t < 0 ? 0 : Math.exp(-t / TAU[acid])
/** 集满一瓶要的“产气量”（画面加快以后按秒计） */
const FULL = 9
/** 反应了 t 秒（画面上的秒）以后，集气瓶里收集了几成（0–1，示意） */
export const collected = (acid: Acid, t: number) => t <= 0 ? 0 : Math.min(1, TAU[acid] * (1 - Math.exp(-t / TAU[acid])) / FULL)
/** 集满一瓶稀盐酸要几秒（画面上的秒） */
export const fullTime = () => -TAU.hcl * Math.log(1 - FULL / TAU.hcl)

// ---------- 第 3 课 二氧化碳的性质 ----------
/** 标准状况下的密度（g/L） */
export const DENSITY = { co2: 1.977, air: 1.293 } as const
/** 倒二氧化碳用几秒；烧杯里二氧化碳的高度（占烧杯高度的几成，示意） */
export const POUR_SEC = 4.5
export const beakerCO2 = (t: number) => Math.max(0, Math.min(1, t / POUR_SEC * 1.05))
/** 两支蜡烛的火焰在烧杯里的高度（占烧杯高度的几成）：下层、上层 */
export const CANDLE_AT = [0.3, 0.66] as const
/** 第 i 支蜡烛有没有灭：二氧化碳积到火焰的高度就灭 */
export const candleOut = (i: 0 | 1, t: number) => beakerCO2(t) >= CANDLE_AT[i]
/** 软塑料瓶：容积 V、加进去的水 w（mL）。通常状况下 1 体积水约能溶解 1 体积二氧化碳 */
export const BOTTLE = { V: 500, water: 170 } as const
export function squeeze(V: number, w: number) {
  const gas = V - w, dissolved = Math.min(gas, w * 1), left = gas - dissolved
  return { gas, dissolved, left, volume: w + left, k: (w + left) / V }
}

// ---------- 第 4 课 二氧化碳与水、石灰水 ----------
/** 二氧化碳和石灰水生成碳酸钙的质量：CO₂ + Ca(OH)₂ = CaCO₃↓ + H₂O，44 : 100 */
export const caco3FromCO2 = (m: number) => m * MR.CaCO3 / MR.CO2
/** 通气的速度（mL/s，示意） */
export const FLOW = 2
/** 石蕊溶液变红要通几秒、加热几秒变回紫色、石灰水变浑浊要通几秒（画面上的秒，示意） */
export const LITMUS_SEC = 4, HEAT_SEC = 5, LIME_SEC = 5

// ---------- 第 5 课 汽水厂 ----------
/** 一个大气压下二氧化碳在水里的溶解度（g/L），按温度（°C） */
export const SOLUBILITY: Record<number, number> = { 0: 3.35, 5: 2.77, 10: 2.32, 20: 1.69, 30: 1.26 }
/** 碳化的温度（°C） */
export const CARB_T = 5
/** 一个大气压（kPa） */
export const ATM = 101.325
/** 亨利定律：溶解的二氧化碳与它的压强成正比。T 温度（°C），p 二氧化碳的压强（kPa），返回 g/L */
export const dissolved = (T: number, p: number) => SOLUBILITY[T] * p / ATM
export const PRESSURES = [100, 200, 300] as const
export type Pressure = typeof PRESSURES[number]
/** 碳化罐充气多久（画面上的秒）、开瓶后多久跑到和空气平衡（示意） */
export const CARB_SEC = 3.5, FIZZ_SEC = 7
/** 开瓶 t 秒后瓶里还溶着多少（g/L，示意）：从 c0 往一个大气压下的溶解量掉 */
export const afterOpen = (c0: number, t: number) => { const c1 = dissolved(CARB_T, ATM); return c1 + (c0 - c1) * Math.exp(-t / 2.2) }
/** 二氧化碳的“体积数”：1 L 水里溶着几升（标准状况）二氧化碳 */
export const volumes = (gPerL: number) => gPerL / DENSITY.co2

// ---------- 第 6 课 一氧化碳 ----------
/** 氧化铜被还原成铜：CO + CuO =△= Cu + CO₂，80 : 64 */
export const cuFromCuO = (m: number) => m * MR.Cu / MR.CuO
/** 玻璃管里的氧化铜（g） */
export const CUO = 2
/** 排空气要通几秒；加热几秒反应完；停热以后冷却几秒（画面上的秒，示意） */
export const PURGE_SEC = 3, REDUCE_SEC = 8, COOL_SEC = 4
/** 加热了 t 秒，玻璃管里的固体有多重（g） */
export const solidMass = (t: number) => CUO - (CUO - cuFromCuO(CUO)) * Math.min(1, Math.max(0, t / REDUCE_SEC))

// ---------- 第 7 课 碳循环 ----------
/** 室外空气里的二氧化碳（ppm）；补气的目标浓度 */
export const AIR_PPM = 420, TARGET_PPM = 1000
/** 温室模型的几个数（示意）：光合作用最大吸收速率、半饱和浓度、呼吸放出速率、补气速率，单位 ppm/分钟 */
export const GH = { pmax: 14, K: 400, resp: 2.4, supply: 60 } as const
/** 光合作用的相对快慢：以 400 ppm 时为 100% */
export const photoRel = (c: number) => (c / (c + GH.K)) / (400 / (400 + GH.K)) * 100
/** 温室里的二氧化碳过 dt 分钟以后是多少：有光就吸收，一直有呼吸，开着补气且没到目标就补 */
export function greenhouseStep(c: number, light: boolean, feed: boolean, dt: number) {
  const up = light ? GH.pmax * c / (c + GH.K) : 0
  const sup = feed && c < TARGET_PPM ? GH.supply : 0
  const next = c + (sup - up + GH.resp) * dt
  return feed && c < TARGET_PPM && next > TARGET_PPM ? TARGET_PPM : next
}
/** 画面上 1 秒是温室里的几分钟 */
export const GH_FAST = 6

// ---------- 拓展 干冰 ----------
/** 一个大气压下干冰的升华温度（°C） */
export const DRY_ICE_T = -78.5
/** 放上天平的干冰（g）和每秒少多少（示意，画面加快） */
export const DRY = { m0: 20, rate: 0.35 } as const
export const sublime = (t: number) => Math.max(0, DRY.m0 - DRY.rate * t)

/** 质量的写法：不足 1 g 保留三位小数，否则两位 */
export const fmtG = (g: number) => g < 1 ? g.toFixed(3) : g.toFixed(2)
