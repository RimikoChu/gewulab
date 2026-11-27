// 空气和氧气实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/air.md 里：空气成分按体积分数，气体密度取 0 ℃、101 kPa 下的值，沸点取常压下的值。

// ---------- 取值约定 ----------
/** 空气的成分（体积分数，%） */
export const AIR = { n2: 78, o2: 21, rare: 0.94, co2: 0.03, other: 0.03 } as const
/** 气体密度（g/L，0 ℃、101 kPa） */
export const RHO = { o2: 1.429, air: 1.293, he: 0.179 } as const
/** 沸点（℃，常压） */
export const BOIL = { n2: -196, o2: -183 } as const
/** 集气瓶的容积（L） */
export const JAR_L = 0.25

// ---------- 第 1 课：空气里有什么 ----------
/** 钟罩：截面积（cm²）、水面以上的高度（mm）、容积（L） */
export const BELL = { area: 200, height: 500, volume: 10.0 } as const
/** 水槽：水面的面积（cm²，含钟罩所在的那一块） */
export const TROUGH_AREA = 800
export const FUELS = {
  p: { name: '红磷', product: '五氧化二磷', solid: true, smoke: '大量白烟' },
  c: { name: '木炭', product: '二氧化碳', solid: false, smoke: '' },
} as const
export type Fuel = keyof typeof FUELS
/** 燃烧后钟罩里气体减少的体积分数：生成物是固体，减少的就是被消耗的氧气；生成物是气体（木炭生成二氧化碳），占回了氧气的位置 */
export const gasLoss = (fuel: Fuel) => (FUELS[fuel].solid ? AIR.o2 / 100 : 0)
/** 钟罩里的气体减少了 frac（体积分数），水面上升多少（mm）：V = S·h */
export const riseMM = (frac: number) => (BELL.volume * frac * 1000) / BELL.area * 10
/** 被消耗的氧气体积（L） */
export const o2Used = (frac: number) => BELL.volume * frac
/** 钟罩里的水面升了 rise（mm），罩外水槽的水面降多少（mm）：升进去的水是从罩外来的 */
export const outsideDropMM = (rise: number) => (rise * BELL.area) / (TROUGH_AREA - BELL.area)

// ---------- 第 2 课：一瓶氧气 ----------
/** 瓶内气体的质量（g）：m = ρV */
export const bottleMass = (rho: number, V: number) => rho * V
export type Gas = 'o2' | 'air'
export const GAS_NAME: Record<Gas, string> = { o2: '氧气', air: '空气' }
/** 一只 250 mL 集气瓶里气体的质量（g） */
export const jarMass = (gas: Gas) => bottleMass(RHO[gas], JAR_L)
/** 带火星的木条伸进去会不会复燃 */
export const relights = (gas: Gas) => gas === 'o2'

// ---------- 第 3 课：氧气里的燃烧 ----------
/** 瓶内氧气的体积分数（%） */
export const O2_FRAC: Record<Gas, number> = { air: AIR.o2, o2: 100 }
/** 按瓶内氧气的体积分数，燃烧表现分两档 */
export const burnAt = (frac: number): Gas => (frac > 60 ? 'o2' : 'air')
export const SAMPLES = {
  c: { name: '木炭', air: '持续红热，不发白光', o2: '剧烈燃烧，发出白光，放出热量' },
  s: { name: '硫', air: '发出微弱的淡蓝色火焰', o2: '发出明亮的蓝紫色火焰，生成有刺激性气味的气体' },
  fe: { name: '铁丝', air: '只能烧到红热，不能燃烧', o2: '剧烈燃烧，火星四射，生成黑色固体' },
} as const
export type Sample = keyof typeof SAMPLES
/** 某样品在某一瓶里的现象 */
export const phenomenon = (s: Sample, gas: Gas) => SAMPLES[s][burnAt(O2_FRAC[gas])]

// ---------- 第 4 课：多变一 ----------
export const REACTIONS = {
  c: { name: '木炭燃烧', reactants: ['碳', '氧气'], products: ['二氧化碳'], formula: 'C + O₂ → CO₂' },
  s: { name: '硫燃烧', reactants: ['硫', '氧气'], products: ['二氧化硫'], formula: 'S + O₂ → SO₂' },
  fe: { name: '铁丝燃烧', reactants: ['铁', '氧气'], products: ['四氧化三铁'], formula: '3Fe + 2O₂ → Fe₃O₄' },
  wax: { name: '石蜡燃烧', reactants: ['石蜡', '氧气'], products: ['二氧化碳', '水'], formula: '石蜡 + 氧气 → 二氧化碳 + 水' },
} as const
export type Reaction = keyof typeof REACTIONS
/** 化合反应：两种或两种以上物质生成另一种物质（多变一） */
export const isCombination = (reactants: number, products: number) => reactants >= 2 && products === 1
export const combines = (r: Reaction) => isCombination(REACTIONS[r].reactants.length, REACTIONS[r].products.length)
/** 氧化反应：物质与氧气发生的反应 */
export const isOxidation = (r: Reaction) => (REACTIONS[r].reactants as readonly string[]).includes('氧气')

// ---------- 第 5 课：实验室里制氧气 ----------
export const DRUGS = { k: { name: '高锰酸钾', heat: true }, h: { name: '过氧化氢', heat: false } } as const
export type Drug = keyof typeof DRUGS
/** 排水法：收集到 V（L）气体，从瓶里排出多少水（mL） */
export const collect = (V: number) => V * 1000
/** 收集了 t 秒时瓶里的气体（L）：画面上按匀速收，SEC 秒收满一瓶（示意，不是真实的速率） */
export const COLLECT_SEC = 7
export const gathered = (t: number) => JAR_L * Math.max(0, Math.min(1, t / COLLECT_SEC))

// ---------- 第 6 课：二氧化锰为什么用不完 ----------
/** 这次实验加入的二氧化锰（g） */
export const MNO2 = 2.0
/** 反应后回收的二氧化锰质量（g）：催化剂本身的质量在反应前后不变 */
export const catalystMass = (m0: number) => m0
/** 过氧化氢冒气泡的快慢（0–1，示意）：不加二氧化锰很慢，加了很快 */
export const bubbleRate = (catalyst: boolean) => (catalyst ? 1 : 0.06)

// ---------- 第 7 课：工厂里怎么制氧 ----------
export const T_ROOM = 25, T_COLD = -200
export type Stage = 'gas' | 'liquid' | 'n2' | 'o2'
/** 塔内温度 T（℃）时：处在哪个阶段，已馏出的氮、氧各占空气体积的百分之几 */
export function distill(T: number): { stage: Stage; n2: number; o2: number } {
  if (T >= BOIL.o2) return { stage: 'o2', n2: AIR.n2, o2: AIR.o2 }
  if (T >= BOIL.n2) return { stage: 'n2', n2: AIR.n2, o2: 0 }
  return { stage: 'liquid', n2: 0, o2: 0 }
}

// ---------- 拓展 ----------
/** 同体积的氦气球比空气球轻多少倍：密度之比 */
export const heliumRatio = () => RHO.air / RHO.he
/** 气球放开后往哪边走：比空气轻的上升 */
export const floats = (rho: number) => rho < RHO.air
/** 密封盒里放进脱氧剂以后，每过一天盒里氧气的相对多少（示意：只表示越来越少，不是测量值） */
export const SCAVENGE = [1, 0.62, 0.36, 0.18, 0.08, 0.03] as const
/** 两处采样点颗粒物读数的相对高低（示意：只用来比较，不是测量值） */
export const DUST = { gate: 0.62, edge: 0.34 } as const
export type Site = keyof typeof DUST
