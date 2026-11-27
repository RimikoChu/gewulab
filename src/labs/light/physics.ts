// 光的波动性和光电效应实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/light.md 里：h 取 6.63×10⁻³⁴ J·s，c 取 3.00×10⁸ m/s，e 取 1.60×10⁻¹⁹ C。
export const H = 6.63e-34      // 普朗克常量（J·s）
export const C = 3.0e8         // 真空中的光速（m/s）
export const E = 1.6e-19       // 元电荷（C）

// ---------- 光源 ----------
/** 实验里用到的几种单色光：波长（nm）和画面上用的颜色 */
export const LIGHTS = {
  red: { name: '红光', nm: 650, hex: '#ff2a1a' },
  green: { name: '绿光', nm: 532, hex: '#3dff5a' },
  blue: { name: '蓝光', nm: 450, hex: '#2f6bff' },
  violet: { name: '紫光', nm: 405, hex: '#9a4dff' },
} as const
export type LightKey = keyof typeof LIGHTS
/** 频率（Hz） */
export const freq = (nm: number) => C / (nm * 1e-9)
/** 频率写成“几点几 ×10¹⁴ Hz”里的那个数 */
export const freq14 = (nm: number) => freq(nm) / 1e14

// ---------- 第 1、2 课：双缝干涉 ----------
/** 双缝每条缝的宽度（mm）：决定屏上那片光带有多宽 */
export const SLIT_A = 0.04
/** 相邻两条亮纹（或暗纹）中心的间距 Δx = Lλ/d（mm）。L 用 m，λ 用 nm，d 用 mm */
export const fringeGap = (L: number, nm: number, d: number) => (L * nm * 1e-9) / (d * 1e-3) * 1e3
/** 单缝衍射中央亮纹的宽度 2Lλ/a（mm）。a 是缝宽（mm） */
export const centralWidth = (L: number, nm: number, a: number) => 2 * fringeGap(L, nm, a)
const sinc2 = (u: number) => (Math.abs(u) < 1e-9 ? 1 : (Math.sin(u) / u) ** 2)
/** 单缝衍射在屏上 x（mm）处的相对亮度：中央为 1 */
export const singleSlitI = (x: number, L: number, nm: number, a: number) => sinc2(Math.PI * x / fringeGap(L, nm, a))
/** 双缝干涉在屏上 x（mm）处的相对亮度：中央亮纹为 1。open 为 false 时挡住一条缝，只剩单缝的光带 */
export const doubleSlitI = (x: number, L: number, nm: number, d: number, open = true) =>
  singleSlitI(x, L, nm, SLIT_A) * (open ? Math.cos(Math.PI * x / fringeGap(L, nm, d)) ** 2 : 0.25)
/** 第 1 课的固定条件 */
export const L1 = { L: 1.2, d: 0.2, light: 'red' as LightKey }
/** 第 2 课可以换的缝距（mm）和屏距（m） */
export const GAPS = [0.2, 0.1] as const, DISTS = [1.2, 0.6] as const

// ---------- 第 3 课：用双缝干涉测量光的波长 ----------
/** 双缝干涉仪：缝距（mm）、双缝到毛玻璃屏的距离（m）、两种滤光片透过的波长（nm）、第 1 条亮纹处手轮的读数（mm） */
export const RIG = { d: 0.2, L: 0.7, filters: { red: { name: '红色滤光片', nm: 660, x1: 2.32, hex: '#ff2a1a' }, green: { name: '绿色滤光片', nm: 540, x1: 2.53, hex: '#4dff4a' } } } as const
export type FilterKey = keyof typeof RIG.filters
/** 分划板中心刻线对准第 n 条亮纹时，手轮的读数（mm） */
export const headReading = (f: FilterKey, n: number) => RIG.filters[f].x1 + (n - 1) * fringeGap(RIG.L, RIG.filters[f].nm, RIG.d)
/** 由两次读数算波长（nm）：Δx = (xn − x1)/(n − 1)，λ = dΔx/L */
export const wavelengthFrom = (x1: number, xn: number, n: number, d = RIG.d, L = RIG.L) => ((xn - x1) / (n - 1)) * 1e-3 * (d * 1e-3) / L * 1e9

// ---------- 第 4 课：薄膜干涉 ----------
/** 肥皂水的折射率 */
export const N_SOAP = 1.33
/** 钠黄光的波长（nm） */
export const NA = 589
/** 相邻两条亮纹处，膜的厚度相差 λ/(2n)（nm） */
export const filmStep = (nm: number, n = N_SOAP) => nm / (2 * n)
/** 肥皂膜的厚度（nm）：v 是从上沿（0）到下沿（1）的位置，age 是肥皂水往下流了多久（0 刚拉出来，1 流了一阵）。上薄下厚 */
export const filmThickness = (v: number, age: number) => (1 - age) * (300 + 1500 * v) + age * 2400 * Math.pow(Math.max(0, v), 1.6)
/** 厚度 t 的膜反射某一波长的光的相对亮度：前后两个表面的反射光叠加，前表面有半波损失，所以膜极薄时是暗的 */
export const filmReflect = (t: number, nm: number, n = N_SOAP) => Math.sin(2 * Math.PI * n * t / nm) ** 2
/** 整张膜上能数出几条亮纹 */
export function filmFringes(age: number, nm: number, n = N_SOAP) {
  const lo = 2 * n * filmThickness(0, age) / nm, hi = 2 * n * filmThickness(1, age) / nm
  return Math.max(0, Math.floor(hi - 0.5) - Math.ceil(lo - 0.5) + 1)
}

// ---------- 第 5 课：衍射和偏振 ----------
/** 可调单缝的两档缝宽（mm），屏距（m） */
export const SLITS = [0.4, 0.1] as const, L5 = 1.2
/** 自然光先过起偏器（剩一半），再过检偏器：透过的光占入射自然光的几分之几。deg 是两片透振方向的夹角 */
export const polarized = (deg: number) => 0.5 * Math.cos(deg * Math.PI / 180) ** 2
/** 屏上的亮度和两片平行时相比（0–1） */
export const analyzer = (deg: number) => Math.cos(deg * Math.PI / 180) ** 2

// ---------- 第 6、7 课：光电效应 ----------
/** 阴极材料钾的截止频率（Hz） */
export const NU_C = 5.44e14
/** 逸出功 W0 = hνc（J） */
export const W0 = H * NU_C
export const toEV = (j: number) => j / E
/** 一个光子的能量 hν（eV） */
export const photonEV = (nm: number) => toEV(H * freq(nm))
/** 这种光能不能打出光电子：频率要高于截止频率 */
export const emits = (nm: number) => freq(nm) > NU_C
/** 光电子的最大初动能 Ek = hν − W0（eV）；打不出电子时为 0 */
export const ekMax = (nm: number) => Math.max(0, toEV(H * freq(nm) - W0))
/** 遏止电压 Uc = Ek/e（V） */
export const stopU = (nm: number) => ekMax(nm)
/** 频率为 nu（Hz）的光对应的遏止电压（V）：画 Uc–ν 图线用 */
export const stopUAt = (nu: number) => Math.max(0, toEV(H * nu - W0))
/** 第 6 课加在光电管上的正向电压（V） */
export const U_FWD = 1.0
/** 弱光时的饱和光电流（μA）：实验仪上设定的值；光强加倍，电流加倍 */
export const I_UNIT = 12
/** 光电流（μA）。level：光强是弱光的几倍；reverse：加在光电管上的反向电压（V），0 表示加正向电压、电流已饱和 */
export function photoCurrent(nm: number, level: number, reverse = 0) {
  if (!emits(nm)) return 0
  const uc = stopU(nm)
  return reverse >= uc ? 0 : I_UNIT * level * (1 - reverse / uc) ** 2
}
/** 由两种光的遏止电压算普朗克常量（J·s）：h = e(U2 − U1)/(ν2 − ν1) */
export const planckFrom = (nm1: number, u1: number, nm2: number, u2: number) => E * (u2 - u1) / (freq(nm2) - freq(nm1))

// ---------- 拓展课 ----------
/** 增透膜：玻璃和氟化镁的折射率，设计波长（nm，绿光） */
export const AR = { glass: 1.5, film: 1.38, nm: 550 }
/** 增透膜的厚度：光在膜里波长的四分之一 λ/(4n)（nm） */
export const arThickness = () => AR.nm / (4 * AR.film)
/** 垂直入射时玻璃表面反射掉的光的比例：没有膜时 ((n−1)/(n+1))²；镀了四分之一波长的膜时 ((ng − nf²)/(ng + nf²))² */
export const reflectance = (coated: boolean) => coated ? ((AR.glass - AR.film ** 2) / (AR.glass + AR.film ** 2)) ** 2 : ((AR.glass - 1) / (AR.glass + 1)) ** 2
/** 一个一个光子通过双缝：每个光子落在屏上哪里（mm）是随机的，落在各处的机会按干涉条纹的亮度分配。用固定的种子，每次画出来一样 */
export function photonHits(n: number, L: number, nm: number, d: number, half = 20, seed = 7): [number, number][] {
  let s = seed
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
  const out: [number, number][] = []
  while (out.length < n) {
    const x = (rnd() * 2 - 1) * half, keep = rnd(), y = (rnd() + rnd() + rnd() - 1.5) * 5
    if (keep < doubleSlitI(x, L, nm, d)) out.push([x, y])
  }
  return out
}
