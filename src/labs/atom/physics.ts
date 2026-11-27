// 分子和原子实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/atom.md 里：温度用 20 °C、80 °C；相对原子质量 H 1、C 12、N 14、O 16。
export const NA = 6.02e23          // 每摩尔的粒子数
export const R = 8.314             // J/(mol·K)
export const T0 = 273.15
export const COLD = 20, HOT = 80   // 第 3 课、拓展课的水温（°C）

// ---------- 第 1 课：一滴水 ----------
export const DROPS_PER_ML = 20
/** 一滴水的体积（mL）：20 滴水约 1 mL */
export const dropVolume = () => 1 / DROPS_PER_ML
/** 一滴水里的水分子数：0.05 g ÷ 18 g/mol × NA */
export const moleculesInDrop = () => dropVolume() * 1.0 / 18 * NA
/** 一个水分子的质量（kg） */
export const waterMoleculeMass = () => 18 / NA / 1000

/** 放大级 z：第 0 级视野宽 30 cm，每升一级缩小 10 倍 */
export const VIEW0 = 0.3
export const viewWidth = (z: number) => VIEW0 * Math.pow(10, -z)
/** 各个停靠的放大级：实验台（第 1 课从 20 cm 宽看表面皿，第 6 课从 5 cm 宽看滴管尖）、水滴、水分子、原子、原子核 */
export const STOPS = { bench: 0, bench1: Math.log10(VIEW0 / 0.2), bench6: Math.log10(VIEW0 / 0.05), drop: Math.log10(VIEW0 / 0.012), mol: Math.log10(VIEW0 / 4e-9), atom: Math.log10(VIEW0 / 6e-10), nuc: Math.log10(VIEW0 / 1.4e-14) }
export type Stop = keyof typeof STOPS
/** 视野宽度写成带单位的字：取 1–999 之间的数 */
export function fmtWidth(w: number) {
  const U: [number, string][] = [[1, 'm'], [1e-2, 'cm'], [1e-3, 'mm'], [1e-6, 'μm'], [1e-9, 'nm'], [1e-12, 'pm'], [1e-15, 'fm']]
  for (const [k, u] of U) if (w >= k * 0.999) { const v = w / k; return `${v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(0) : v.toFixed(1)} ${u}` }
  return `${(w / 1e-15).toFixed(1)} fm`
}
/** 从开始的视野放大了多少倍 */
export const magnify = (z: number, z0: number) => Math.pow(10, z - z0)
/** 10 的几次方写成上标形式 */
export function sci(v: number, digits = 2) {
  const e = Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, e)
  const sup = String(e).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] ?? (c === '-' ? '⁻' : c)).join('')
  return `${m.toFixed(digits)}×10${sup}`
}

// ---------- 第 2、3 课：分子运动 ----------
/** 分子热运动的平均速率 √(8RT/πM)（m/s）；Mr 相对分子质量，t 摄氏温度 */
export const meanSpeed = (Mr: number, t: number) => Math.sqrt(8 * R * (t + T0) / (Math.PI * Mr / 1000))
/** 水的黏度（mPa·s） */
const ETA: Record<number, number> = { [COLD]: 1.002, [HOT]: 0.355 }
/** 品红在水里扩散的快慢，相对 20 °C：D ∝ T/η。只用来驱动动画 */
export const diffuseRate = (t: number) => ((t + T0) / ETA[t]) / ((COLD + T0) / ETA[COLD])
/** 扩散开的程度（0–1）：时间 s 秒（动画里的秒）后品红散开了多少 */
export const spread = (t: number, s: number) => 1 - Math.exp(-s * diffuseRate(t) / 40)

// ---------- 第 4 课：酒精和水 ----------
export const RHO = { ethanol: 0.7893, water: 0.9982 }     // 20 °C，g/mL
/** 乙醇水溶液的密度（20 °C，g/mL），按乙醇的质量分数插值 */
const MIX: [number, number][] = [[0, 0.9982], [10, 0.9819], [20, 0.9686], [30, 0.9538], [40, 0.9352], [50, 0.9139], [60, 0.8911], [70, 0.8676], [80, 0.8434], [90, 0.8180], [100, 0.7893]]
export function mixDensity(w: number) {
  for (let i = 1; i < MIX.length; i++) if (w <= MIX[i][0]) { const [a, ra] = MIX[i - 1], [b, rb] = MIX[i]; return ra + (rb - ra) * (w - a) / (b - a) }
  return MIX[MIX.length - 1][1]
}
/** a mL 酒精和 w mL 水混合后的体积（mL） */
export function mixVolume(a: number, w: number) {
  const ma = a * RHO.ethanol, mw = w * RHO.water
  return (ma + mw) / mixDensity(ma / (ma + mw) * 100)
}

// ---------- 第 5 课：电解水 ----------
/** 2H₂O = 2H₂↑ + O₂↑：通电 k（0–1）时，负极、正极各有多少 mL 气体 */
export const GAS_FULL = 20
export const electrolysis = (k: number) => ({ h2: GAS_FULL * k, o2: GAS_FULL * k / 2 })
/** 反应前后的分子和原子个数 */
export const REACTION = { before: { mol: 2, H: 4, O: 2 }, after: { mol: 3, H: 4, O: 2 } }

// ---------- 第 6、7 课：原子 ----------
export const ATOMS = {
  H: { name: '氢', sym: 'H', p: 1, n: 0, Z: 1 },
  O: { name: '氧', sym: 'O', p: 8, n: 8, Z: 8 },
  C12: { name: '碳', sym: 'C', p: 6, n: 6, Z: 6 },
  C14: { name: '碳', sym: 'C', p: 6, n: 8, Z: 6 },
  N14: { name: '氮', sym: 'N', p: 7, n: 7, Z: 7 },
} as const
export type AtomKey = keyof typeof ATOMS
/** 核电荷数 = 质子数 */
export const nucleusCharge = (k: AtomKey) => ATOMS[k].p
/** 核外电子数：原子里等于质子数 */
export const electrons = (k: AtomKey) => ATOMS[k].p
/** 整个原子带的电：质子 +1、电子 −1、中子 0 */
export const netCharge = (k: AtomKey) => ATOMS[k].p * 1 + ATOMS[k].n * 0 - electrons(k)
/** 相对原子质量 ≈ 质子数 + 中子数 */
export const relMass = (k: AtomKey) => ATOMS[k].p + ATOMS[k].n
/** 两个原子是不是同一种元素：看质子数 */
export const sameElement = (a: AtomKey, b: AtomKey) => ATOMS[a].p === ATOMS[b].p
/** 原子核半径（fm）：1.2 × A^(1/3) */
export const nucleusRadius = (A: number) => 1.2 * Math.cbrt(A)
/** 核外电子分层：2、8 */
export const shells = (e: number) => e <= 2 ? [e] : [2, e - 2]

// ---------- 拓展：注射器、乒乓球 ----------
export const SYRINGE_V = 20     // mL
/** 等温时压强变成 p 倍，空气体积（mL） */
export const airVolume = (p: number) => SYRINGE_V / p
/** 水几乎不能压缩：体积压缩系数 4.6×10⁻¹⁰ /Pa，加 1 个大气压后的体积（mL） */
export const waterVolume = (extraAtm: number) => SYRINGE_V * (1 - 4.6e-10 * 101325 * extraAtm)
/** 等压时空气从 20 °C 加热到 t，体积是原来的几倍 */
export const ballGrow = (t: number) => (t + T0) / (COLD + T0)
