// 光反应和暗反应实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 这一间里的“量”多数是相对值（示意），只保证方向、顺序和守恒关系正确；取值约定写在规格卡 docs/specs/chloroplast.md 里。

// ---------- 第 1 课：叶绿体的结构 ----------
/** 模型里基粒的位置（叶绿体自己的坐标，长轴沿 x）和每个基粒有几层类囊体。world.tsx 照这张表摆 */
export const GRANA: { x: number; y: number; z: number; n: number }[] = [
  { x: -38, y: -2, z: -6, n: 6 }, { x: -27, y: 3, z: -14, n: 8 }, { x: -24, y: -5, z: 3, n: 7 }, { x: -14, y: 4, z: -4, n: 9 },
  { x: -11, y: -6, z: -17, n: 7 }, { x: -3, y: -4, z: 5, n: 8 }, { x: 0, y: 5, z: -13, n: 10 }, { x: 9, y: 3, z: 1, n: 9 },
  { x: 12, y: -6, z: -9, n: 7 }, { x: 20, y: 5, z: -16, n: 8 }, { x: 22, y: -3, z: 5, n: 8 }, { x: 31, y: 2, z: -6, n: 7 },
  { x: 34, y: -5, z: -17, n: 6 }, { x: 41, y: -1, z: 0, n: 6 },
]
/** 模型里一共几个基粒、几个类囊体 */
export const granaCount = () => GRANA.length
export const thylakoidCount = () => GRANA.reduce((s, g) => s + g.n, 0)
/** 叶绿体的四个部分：光反应、暗反应各在哪里 */
export const PARTS = [
  { key: 'envelope', name: '外膜和内膜', what: '双层膜，把叶绿体和细胞质基质隔开' },
  { key: 'granum', name: '基粒', what: '由一个个类囊体堆叠而成' },
  { key: 'thylakoid', name: '类囊体', what: '薄膜上分布着吸收光能的色素和有关的酶，光反应在这里进行' },
  { key: 'stroma', name: '基质', what: '含有与暗反应有关的多种酶，暗反应在这里进行' },
] as const

// ---------- 第 2 课：色素的提取和分离 ----------
/**
 * 四种色素。order：在层析液中的溶解度从高到低的名次（1 最高，随层析液在滤纸上扩散得最快）；
 * rf：色素带在滤纸条上走到溶剂前沿的几分之几（示意，只保证先后）；share：含量占四种色素的比例（教材：叶绿素约占 3/4，类胡萝卜素约占 1/4；
 * 其中各自怎么分是示意，只保证叶绿素 a 最多）
 */
export const PIGMENTS = [
  { key: 'carotene', name: '胡萝卜素', color: '#f08a24', hue: '橙黄色', group: '类胡萝卜素', rf: 0.94, share: 0.09 },
  { key: 'lutein', name: '叶黄素', color: '#f2d12e', hue: '黄色', group: '类胡萝卜素', rf: 0.72, share: 0.16 },
  { key: 'chla', name: '叶绿素 a', color: '#2f8f7a', hue: '蓝绿色', group: '叶绿素', rf: 0.44, share: 0.5 },
  { key: 'chlb', name: '叶绿素 b', color: '#9db53a', hue: '黄绿色', group: '叶绿素', rf: 0.27, share: 0.25 },
] as const
export type PigmentKey = typeof PIGMENTS[number]['key']
/** 滤纸条上从上到下的色素带（走得远的在上） */
export const bandsTopDown = () => [...PIGMENTS].sort((a, b) => b.rf - a.rf)
/** 最宽的色素带（含量最多的） */
export const widestBand = () => [...PIGMENTS].sort((a, b) => b.share - a.share)[0]
/** 某一类色素占的比例 */
export const groupShare = (group: '叶绿素' | '类胡萝卜素') => PIGMENTS.filter(p => p.group === group).reduce((s, p) => s + p.share, 0)
/** 层析到 t（0–1）时某条色素带离滤液细线多远（占整段可走距离的几分之几） */
export const bandAt = (key: PigmentKey, t: number) => PIGMENTS.find(p => p.key === key)!.rf * Math.min(1, Math.max(0, t))
/** 滤液细线能不能没进层析液：线比液面低就会被溶解掉，分不出色素带 */
export const lineSafe = (lineHeightCm: number, liquidCm: number) => lineHeightCm > liquidCm
/** 提取时加的几样东西各起什么作用 */
export const REAGENTS = [
  { name: '无水乙醇', use: '溶解色素（提取）' },
  { name: '二氧化硅', use: '使研磨充分' },
  { name: '碳酸钙', use: '防止研磨中色素被破坏' },
] as const
/** 秋天的黄叶：叶绿素大部分分解了，类胡萝卜素还在（拓展课用；比例是示意） */
export const YELLOW_LEAF: Record<PigmentKey, number> = { carotene: 0.09, lutein: 0.16, chla: 0.03, chlb: 0.015 }
export const GREEN_LEAF: Record<PigmentKey, number> = { carotene: 0.09, lutein: 0.16, chla: 0.5, chlb: 0.25 }
/** 一片叶子里某条色素带看得清吗（含量太少就看不清） */
export const bandVisible = (leaf: Record<PigmentKey, number>, key: PigmentKey) => leaf[key] >= 0.05

// ---------- 第 3 课：色素的吸收光谱 ----------
/** 可见光的范围（nm）和各色光的大致波段 */
export const VISIBLE: [number, number] = [400, 760]
export const COLORS = [
  { name: '紫', from: 400, to: 435 }, { name: '蓝', from: 435, to: 480 }, { name: '青', from: 480, to: 500 }, { name: '绿', from: 500, to: 565 },
  { name: '黄', from: 565, to: 595 }, { name: '橙', from: 595, to: 625 }, { name: '红', from: 625, to: 760 },
] as const
const bell = (x: number, mu: number, sd: number) => Math.exp(-(((x - mu) / sd) ** 2))
export type Sample = 'chl' | 'car'
/** 吸收了百分之多少的光（0–1，示意曲线）：叶绿素在蓝紫光区和红光区各有一个峰，类胡萝卜素只在蓝紫光区有 */
export function absorb(sample: Sample, nm: number) {
  if (sample === 'chl') return Math.min(1, 0.04 + 0.9 * bell(nm, 438, 26) + 0.45 * bell(nm, 466, 16) + 0.78 * bell(nm, 664, 17) + 0.3 * bell(nm, 640, 14))
  return Math.min(1, 0.03 + 0.85 * bell(nm, 450, 30) + 0.55 * bell(nm, 482, 16))
}
/** 某一波段平均吸收了多少 */
export function absorbBand(sample: Sample, from: number, to: number) { let s = 0, n = 0; for (let x = from; x <= to; x += 5) { s += absorb(sample, x); n++ } return s / n }
/** 蓝紫光区（400–480 nm）、绿光区（500–565 nm）、红光区（625–700 nm）各吸收多少 */
export const zones = (sample: Sample) => ({ blue: absorbBand(sample, 400, 480), green: absorbBand(sample, 500, 565), red: absorbBand(sample, 625, 700) })
/** 主要吸收哪些光：平均吸收超过 0.35 的算 */
export const mainlyAbsorbs = (sample: Sample) => { const z = zones(sample); return { blue: z.blue > 0.35, green: z.green > 0.35, red: z.red > 0.35 } }

// ---------- 第 4 课：光反应 ----------
/** n 个水分子光解：放出多少 O₂、H⁺、电子，电子和 H⁺ 最多能把多少 NADP⁺ 变成 NADPH */
export function photolysis(water: number) {
  const o2 = Math.floor(water / 2), used = o2 * 2
  return { water: used, o2, h: used * 2, e: used * 2, nadph: used }
}
/** 光反应的三件事发生在哪里 */
export const LIGHT_SITE = '类囊体的薄膜上'

// ---------- 第 5 课：暗反应 ----------
/** 固定 n 个 CO₂：用掉 n 个 C₅，生成 2n 个 C₃（碳原子数：n + 5n = 3 × 2n） */
export function fixCO2(n: number) { return { c5: n, c3: 2 * n, carbonIn: n + 5 * n, carbonOut: 3 * 2 * n } }
/** 2n 个 C₃ 被还原之后的去向：n 个碳去合成糖类，其余再生成 n 个 C₅ */
export function reduceC3(c3: number) { const n = c3 / 2; return { sugarCarbon: n, c5: n, carbon: c3 * 3 } }
/** 卡尔文循环转 turns 圈（每圈固定 1 个 CO₂）：攒下几个去合成糖类的碳，够合成几个葡萄糖（C₆H₁₂O₆） */
export function calvin(turns: number) { return { co2: turns, sugarCarbon: turns, glucose: Math.floor(turns / 6), c5Change: 0 } }
export const DARK_SITE = '叶绿体的基质中'

// ---------- 第 6 课：两个阶段的联系、条件骤变 ----------
/** 叶绿体里几种物质的相对量：C₃、C₅、ATP 和 NADPH（合在一起记作 e，0–1） */
export interface Pools { c3: number; c5: number; e: number; sugar: number }
/** 光照和 CO₂ 都正常时的稳定状态：C₃ 是 C₅ 的 2 倍 */
export const STEADY: Pools = { c3: 6, c5: 3, e: 0.5, sugar: 0 }
const KF = 0.5, KR = 1, KL = 1.2, ALPHA = 0.2
/** 这一刻三个过程的快慢：CO₂ 的固定、C₃ 的还原、光反应生成 ATP 和 NADPH */
export function rates(p: Pools, light: boolean, co2: boolean) {
  return { fix: co2 ? KF * p.c5 : 0, reduce: KR * p.c3 * p.e, supply: light ? KL * (1 - p.e) : 0 }
}
/** 往前走 dt 秒。固定：1 C₅ → 2 C₃；还原：2 C₃ → 1 C₅ + 1 个去合成糖类的碳；还原要消耗 ATP 和 NADPH */
export function stepPools(p: Pools, light: boolean, co2: boolean, dt: number): Pools {
  let q = { ...p }
  const n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n
  for (let i = 0; i < n; i++) {
    const r = rates(q, light, co2)
    q = { c3: Math.max(0, q.c3 + (2 * r.fix - r.reduce) * h), c5: Math.max(0, q.c5 + (r.reduce / 2 - r.fix) * h), e: Math.min(1, Math.max(0, q.e + (r.supply - ALPHA * r.reduce) * h)), sugar: q.sugar + r.reduce / 2 * h }
  }
  return q
}
/** 从稳定状态出发，条件突然改变之后过 t 秒 */
export const after = (light: boolean, co2: boolean, t: number) => stepPools(STEADY, light, co2, t)
export type Trend = '增多' | '减少' | '基本不变'
const trend = (a: number, b: number): Trend => b > a * 1.08 ? '增多' : b < a * 0.92 ? '减少' : '基本不变'
/** 条件骤变后短时间内各物质怎样变 */
export function shift(kind: 'dark' | 'noCO2') {
  const p = after(kind !== 'dark', kind !== 'noCO2', 3)
  return { c3: trend(STEADY.c3, p.c3), c5: trend(STEADY.c5, p.c5), e: trend(STEADY.e, p.e) }
}

// ---------- 第 7 课：影响光合速率的环境因素 ----------
/** 这株植物的参数（相对值）：最大总光合速率、呼吸速率 */
export const PMAX = 12, RESP = 2
const A_LIGHT = 0.5, A_CO2 = 0.04, T_OPT = 25, T_WIDTH = 13
export type Factor = 'light' | 'co2' | 'temp'
export const FACTORS: Record<Factor, { name: string; unit: string; range: [number, number]; std: number; axis: string }> = {
  light: { name: '光照强度', unit: '', range: [0, 100], std: 60, axis: '光照强度（相对值）' },
  co2: { name: 'CO₂ 浓度', unit: '', range: [0, 1200], std: 400, axis: 'CO₂ 浓度（相对值）' },
  temp: { name: '温度', unit: '℃', range: [5, 45], std: 25, axis: '温度（℃）' },
}
const sat = (x: number) => Math.tanh(Math.max(0, x))
const tempK = (t: number) => Math.exp(-(((t - T_OPT) / T_WIDTH) ** 2))
/** 呼吸速率随温度升高（在这个范围里） */
export const respiration = (temp = T_OPT) => RESP * Math.pow(2, (temp - T_OPT) / 14)
/** 总光合速率（相对值）：光照、CO₂ 都是先升后平，温度是先升后降 */
export function gross(light: number, co2: number, temp: number) {
  return PMAX * sat(A_LIGHT * light / PMAX) * sat(A_CO2 * co2 / PMAX) / sat(A_CO2 * FACTORS.co2.std / PMAX) * tempK(temp)
}
/** 净光合速率 = 总光合速率 − 呼吸速率（用 CO₂ 吸收速率表示；负数就是在放出 CO₂） */
export const net = (light: number, co2: number, temp: number) => gross(light, co2, temp) - respiration(temp)
/** 只改一个因素，其余取标准值 */
export function netOf(f: Factor, x: number) { return f === 'light' ? net(x, FACTORS.co2.std, T_OPT) : f === 'co2' ? net(FACTORS.light.std, x, T_OPT) : net(FACTORS.light.std, FACTORS.co2.std, x) }
/** 曲线上的 n+1 个点 */
export function curve(f: Factor, n = 40) { const [a, b] = FACTORS[f].range; return Array.from({ length: n + 1 }, (_, i) => { const x = a + (b - a) * i / n; return { x, y: netOf(f, x) } }) }
function root(fn: (x: number) => number, a: number, b: number) { for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (fn(a) * fn(m) <= 0) b = m; else a = m } return (a + b) / 2 }
/** 补偿点：光合速率等于呼吸速率（净光合速率为 0）时的光照强度或 CO₂ 浓度 */
export const compensation = (f: 'light' | 'co2') => root(x => netOf(f, x), 0, FACTORS[f].range[1])
/** 饱和点：再增强，光合速率也基本不再增加（这里取达到最大值的 96% 处） */
export function saturation(f: 'light' | 'co2') { const top = netOf(f, 1e6) + respiration(); return root(x => netOf(f, x) + respiration() - 0.96 * top, 0, FACTORS[f].range[1] * 4) }
/** 净光合速率最大时的温度（逐 0.5 ℃ 找） */
export function bestTemp() { let best = 0, at = 0; for (let t = 5; t <= 45; t += 0.5) { const y = netOf('temp', t); if (y > best) { best = y; at = t } } return at }

// ---------- 拓展 ----------
export type LampColor = 'green' | 'redblue'
/** 同样强度的光，换一种颜色：被色素吸收得多，能用来做光反应的就多（示意）。按叶绿素和类胡萝卜素的吸收算 */
export function colorUse(c: LampColor) {
  // 叶片里色素一层叠一层：吸收得少的光多穿过几层，也能被吸收一部分（按指数衰减算，厚度取 6）
  const a = (from: number, to: number) => 1 - Math.exp(-6 * (0.75 * absorbBand('chl', from, to) + 0.25 * absorbBand('car', from, to)))
  return c === 'green' ? a(510, 560) : (a(430, 470) + a(640, 680)) / 2
}
/** 同样强度（取 30，还没到光饱和点）下，不同颜色的光的净光合速率 */
export const netColor = (c: LampColor) => net(30 * colorUse(c) / colorUse('redblue'), FACTORS.co2.std, T_OPT)
/** 大棚里增施 CO₂（“气肥”）：从 400 提到 800 */
export const co2Boost = () => ({ before: netOf('co2', 400), after: netOf('co2', 800) })
