// 接触法制硫酸实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/sulfuric.md 里。相对原子质量：H 1、C 12、O 16、S 32、Fe 56、Cu 64。

/** 相对分子质量 */
export const M = { FeS2: 120, O2: 32, SO2: 64, SO3: 80, H2SO4: 98, Fe2O3: 160, H2O: 18, Cu: 64, C: 12, sucrose: 342, bluestone: 250, CuSO4: 160 } as const
export const fmt1 = (v: number) => v.toFixed(1)
export const fmt2 = (v: number) => v.toFixed(2)

// ---------- 第 1 课：沸腾炉造气 4FeS₂ + 11O₂ = 2Fe₂O₃ + 8SO₂ ----------
/** 两种矿料：粒径（mm，示意）和烧掉的快慢（每秒，示意） */
export const ORE = { lump: { name: '块矿', d: 30, k: 0.05 }, fine: { name: '矿粉', d: 3, k: 0.5 } } as const
export type OreKey = keyof typeof ORE
/** 同样质量的矿石，粒径从 d0 碎到 d1，总表面积变成原来的几倍（颗粒看成球：总表面积和粒径成反比） */
export const areaTimes = (d0: number, d1: number) => d0 / d1
/** 鼓风 t 秒后烧掉的比例（0–1，示意：按一级过程算，矿粒越细越快） */
export const burned = (ore: OreKey, t: number) => 1 - Math.exp(-ORE[ore].k * Math.max(0, t))
/** 焙烧的时长（s） */
export const T_ROAST = 10
/** m 吨 FeS₂ 完全焙烧，生成多少吨 SO₂ */
export const so2FromFeS2 = (m: number) => m * 8 * M.SO2 / (4 * M.FeS2)
/** m 吨 FeS₂ 完全焙烧，留下多少吨 Fe₂O₃ 炉渣 */
export const slagFromFeS2 = (m: number) => m * 2 * M.Fe2O3 / (4 * M.FeS2)

// ---------- 第 2 课：炉气的净化 ----------
/** 取样点：出沸腾炉、除尘以后、洗涤以后、干燥以后 */
export const TAPS = ['out', 'dust', 'wash', 'dry'] as const
export type Tap = (typeof TAPS)[number]
export const TAP_NAME: Record<Tap, string> = { out: '出炉', dust: '除尘后', wash: '洗涤后', dry: '干燥后' }
/** 各取样点炉气里三类杂质的相对含量（出炉时记作 100，示意）：矿尘、砷和硒的化合物、水蒸气 */
const DIRT: Record<Tap, { dust: number; arsenic: number; water: number }> = {
  out: { dust: 100, arsenic: 100, water: 100 },
  dust: { dust: 1, arsenic: 100, water: 100 },
  wash: { dust: 0, arsenic: 0, water: 100 },
  dry: { dust: 0, arsenic: 0, water: 0 },
}
export const dirtAt = (tap: Tap) => DIRT[tap]
/** 这样的炉气会不会让催化剂中毒（矿尘、砷硒化合物都会） */
export const poisons = (tap: Tap) => DIRT[tap].dust > 0 || DIRT[tap].arsenic > 0

// ---------- 第 3–5 课：2SO₂ + O₂ ⇌ 2SO₃ 的平衡 ----------
/** 原料气的体积分数（%）：SO₂ 7、O₂ 11、N₂ 82（教材数据表的条件） */
export const FEED = { so2: 7, o2: 11 } as const
export const TEMPS = [400, 450, 500, 550] as const
export const PRESS = [0.1, 0.5, 1, 10] as const
/** 教材的数据表：SO₂ 的平衡转化率（%）。行是温度（°C），列是压强（MPa） */
export const TABLE: Record<number, number[]> = {
  400: [99.2, 99.6, 99.7, 99.9],
  450: [97.5, 98.9, 99.2, 99.7],
  500: [93.5, 96.9, 97.8, 99.3],
  550: [85.6, 92.9, 94.9, 98.3],
}
/** 查表：温度 t（°C）、压强 p（MPa）下 SO₂ 的平衡转化率（%） */
export function xTable(t: number, p: number) {
  const row = TABLE[t], j = PRESS.indexOf(p as (typeof PRESS)[number])
  if (!row || j < 0) throw new Error('表里没有这个条件')
  return row[j]
}
/** 平衡时的反应商（压强以 0.1 MPa 为 1）：转化率 x（0–1），原料气里 SO₂、O₂ 的体积分数 a、b（%） */
const quotient = (x: number, a: number, b: number, p: number) => (x / (1 - x)) ** 2 * (100 - a * x / 2) / (b - a * x / 2) / (p / 0.1)
/** 各温度的平衡常数（以 0.1 MPa 为单位压强），由数据表里常压那一列反推 */
export const kp = (t: number) => quotient(TABLE[t][0] / 100, FEED.so2, FEED.o2, 0.1)
/**
 * 按平衡常数算 SO₂ 的平衡转化率（%）：温度 t（表里的四个温度）、压强 p（MPa）、原料气里 O₂ 的体积分数 o2（%，SO₂ 固定 7%）。
 * 换氧气用量时用它；表里有的条件，它和表差不到 0.1。
 */
export function xEq(t: number, p: number, o2: number = FEED.o2) {
  const K = kp(t), a = FEED.so2
  let lo = 0, hi = Math.min(1, 2 * o2 / a) - 1e-9
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (quotient(mid, a, o2, p) < K) lo = mid; else hi = mid }
  return lo * 100
}
/** 恰好按 2 : 1 反应时，原料气里 O₂ 的体积分数（%） */
export const O2_EXACT = FEED.so2 / 2

/** 第 3 课的条件：450 °C、常压 */
export const T3 = 450, P3 = 0.1
/** 通气的时长（相对时间，示意） */
export const T_RUN = 60
/** 趋近平衡的快慢（示意）：有催化剂快，没有催化剂极慢 */
const K3 = { cat: 0.12, none: 0.0012 }
export type Cat = keyof typeof K3
/** 通气到时刻 t，SO₂ 的转化率（%，示意：按一级过程趋近平衡转化率） */
export const conv3 = (cat: Cat, t: number) => xTable(T3, P3) * (1 - Math.exp(-K3[cat] * Math.max(0, t)))
/** 这时正、逆反应速率的相对大小（刚通气时的正反应速率记作 1，示意）：平衡时两者相等 */
export function rates3(cat: Cat, t: number) {
  const xe = xTable(T3, P3) / 100, x = conv3(cat, t) / 100
  return { fwd: 1 - x, rev: x * (1 - xe) / xe }
}
/** 平衡时还剩多少 SO₂ 没有转化（%） */
export const left3 = () => 100 - xTable(T3, P3)

// ---------- 第 4 课：温度的选择（常压） ----------
/** 气体流过催化剂层的那段时间里，实际达到的转化率（%，示意）：温度低，催化剂活性低、反应慢，离平衡远 */
export function xOut(t: number) {
  const k = 2.5 * Math.exp((t - 400) / 55)          // 相对速率：每升高约 40 °C 翻一倍（示意）
  return xTable(t, 0.1) * (1 - Math.exp(-k))
}
/** 四个温度里，出口转化率最高的那个 */
export const bestTemp = () => [...TEMPS].sort((a, b) => xOut(b) - xOut(a))[0]

// ---------- 第 5 课：压强和空气用量 ----------
export const T5 = 450
/** 从常压加到 p，平衡转化率多了几个百分点 */
export const gainByPressure = (p: number) => xTable(T5, p) - xTable(T5, 0.1)

// ---------- 第 6 课：吸收和尾气 ----------
export const ABSORB = { water: { name: '水', mist: 1, rate: 60 }, acid: { name: '98.3% 浓硫酸', mist: 0, rate: 99.9 } } as const
export type Liquid = keyof typeof ABSORB
/** 吸收以后尾气里 SO₂ 的体积分数（%）：转化率 x（%），SO₃ 全部被吸收 */
export function tailSO2(x: number) {
  const a = FEED.so2, k = x / 100
  return a * (1 - k) / (100 - a * k / 2 - a * k) * 100
}
/** 氨水吸收尾气里的 SO₂：去掉的比例（示意） */
export const SCRUB = 0.95
export const tailAfter = (x: number) => tailSO2(x) * (1 - SCRUB)

// ---------- 第 7 课：浓硫酸的性质 ----------
/** 吸水性：m 克胆矾（CuSO₄·5H₂O）失去全部结晶水，失去多少克水 */
export const waterFromBluestone = (m: number) => m * 5 * M.H2O / M.bluestone
/** 脱水性：m 克蔗糖（C₁₂H₂₂O₁₁）被脱去全部的氢和氧，留下多少克碳 */
export const carbonFromSucrose = (m: number) => m * 12 * M.C / M.sucrose
/** 强氧化性：Cu + 2H₂SO₄(浓) = CuSO₄ + SO₂↑ + 2H₂O，m 克铜完全反应，生成 SO₂ 多少升（标准状况） */
export const so2FromCu = (m: number) => m / M.Cu * 22.4
export const SAMPLE = { bluestone: 25, sucrose: 34.2, cu: 6.4 } as const

// ---------- 拓展课：热交换器、产量 ----------
/** 热交换器（示意）：热气 hot、冷气 cold（°C），两股气体流量和比热相同，换热效率 eff。返回两股气体出口的温度 */
export function exchange(hot: number, cold: number, eff: number) {
  const q = eff * (hot - cold)
  return { hotOut: hot - q, coldOut: cold + q }
}
export const HX = { hot: 580, cold: 60, eff: 0.7 } as const
/** m 吨矿石（含 FeS₂ 的质量分数 w），理论上能制多少吨质量分数为 c 的硫酸：FeS₂ ~ 2H₂SO₄ */
export const acidFromOre = (m: number, w: number, c = 0.98) => m * w * 2 * M.H2SO4 / M.FeS2 / c
