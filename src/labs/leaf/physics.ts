// 光合作用和呼吸作用实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 这里的“计算”大多是简化模型，系数是为了让现象看得清而取的，不是测量值；取值约定写在规格卡 docs/specs/leaf.md 里。

// ---------- 第 1、3 课和拓展：能不能制造淀粉 ----------
/** 光、二氧化碳、叶绿体，三样都有才能制造淀粉 */
export const makesStarch = (c: { light: boolean; co2: boolean; chloroplast: boolean }) => c.light && c.co2 && c.chloroplast
/** 第 1 课的步骤，按顺序做 */
export const STEPS = [
  { key: 'dark', name: '暗处理', does: '放到黑暗处一昼夜', why: '把叶片里原有的淀粉运走、耗尽' },
  { key: 'cover', name: '遮光', does: '用黑纸片把一片叶子的一半上下两面遮住', why: '同一片叶子上，一半见光、一半不见光，做对照' },
  { key: 'light', name: '照光', does: '移到光下照几小时', why: '让见光的部分进行光合作用' },
  { key: 'bleach', name: '脱色', does: '摘下叶片，放进酒精里隔水加热', why: '把叶绿素溶解到酒精里，叶片变成黄白色，后面的颜色才看得清' },
] as const
export type StepKey = typeof STEPS[number]['key']

// ---------- 第 3 课：两只钟罩 ----------
/** 氢氧化钠溶液会把罩里的二氧化碳吸收掉；清水不会 */
export const JARS = { water: { name: '清水', co2: true }, naoh: { name: '氢氧化钠溶液', co2: false } } as const
export type JarKey = keyof typeof JARS

// ---------- 第 2 课：气泡 ----------
export const LAMP_CM = [10, 20, 30] as const
/** 每分钟冒出的气泡数：光强和距离的平方成反比，气泡数和光强成正比，10 cm 时取 60 个 */
export const bubbles = (cm: number) => Math.round(60 * (10 / cm) ** 2)

// ---------- 第 4 课：叶片的结构 ----------
export const PARTS = {
  skin: { name: '表皮', what: '上下各一层，细胞排得很紧，不含叶绿体，保护叶片', does: '保护' },
  meso: { name: '叶肉', what: '细胞里有大量叶绿体，叶子是绿的就因为它。光合作用主要在这里进行', does: '制造有机物' },
  vein: { name: '叶脉', what: '里面有导管和筛管：导管把水和无机盐运进来，筛管把有机物运出去', does: '运输' },
  stoma: { name: '气孔', what: '一对保卫细胞围成的小孔，多在下表皮。二氧化碳、氧气、水蒸气都从这里进出', does: '气体进出的门' },
} as const
export type PartKey = keyof typeof PARTS
/** 保卫细胞吸水膨胀，气孔张开；失水收缩，气孔关闭 */
export const stomaOpen = (guard: 'swollen' | 'shrunk') => guard === 'swollen'

// ---------- 第 5 课：种子的呼吸 ----------
export const SEEDS = { alive: { name: '萌发的种子', alive: true }, boiled: { name: '煮熟的种子', alive: false } } as const
export type SeedKey = keyof typeof SEEDS
export const T0 = 22, WAIT_H = 6
/** 保温瓶里的温度（℃）：萌发的种子每小时升高 0.5 ℃，6 小时后不再升；煮熟的不变 */
export const flaskTemp = (seed: SeedKey, hours: number) => T0 + (SEEDS[seed].alive ? 0.5 * Math.min(Math.max(hours, 0), WAIT_H) : 0)
/** 活的种子在呼吸：放出二氧化碳（石灰水变浑浊），消耗氧气（蜡烛熄灭） */
export const breathes = (seed: SeedKey) => SEEDS[seed].alive

// ---------- 第 6、7 课：大棚的一昼夜 ----------
export const PMAX = 10, RESP = 2, DAWN = 6
export const PLANS = {
  none: { name: '不处理', dayLen: 12, pGain: 1, nightResp: 1 },
  light: { name: '延长光照', dayLen: 15, pGain: 1, nightResp: 1 },
  co2: { name: '增施二氧化碳', dayLen: 12, pGain: 1.3, nightResp: 1 },
  cool: { name: '夜间降温', dayLen: 12, pGain: 1, nightResp: 0.6 },
} as const
export type PlanKey = keyof typeof PLANS
/** 这个时刻的光照（0–1）：天亮以后按正弦升降 */
export const lightAt = (t: number, dayLen = 12) => { const x = (((t % 24) + 24) % 24) - DAWN; return x > 0 && x < dayLen ? Math.sin(Math.PI * x / dayLen) : 0 }
/** 光合强度和呼吸强度（相对值） */
export const photoAt = (t: number, plan: PlanKey = 'none') => PMAX * PLANS[plan].pGain * lightAt(t, PLANS[plan].dayLen)
export const respAt = (t: number, plan: PlanKey = 'none') => RESP * (lightAt(t, PLANS[plan].dayLen) > 0 ? 1 : PLANS[plan].nightResp)
/** 从 0 时到这个时刻，一共制造的和消耗的有机物（相对值）。t 在 0–24 之间 */
export function totals(t: number, plan: PlanKey = 'none') {
  const { dayLen, pGain, nightResp } = PLANS[plan], x = Math.min(Math.max(t - DAWN, 0), dayLen)
  const made = PMAX * pGain * dayLen / Math.PI * (1 - Math.cos(Math.PI * x / dayLen))
  const night = Math.min(t, DAWN) + Math.max(t - DAWN - dayLen, 0)
  return { made, used: RESP * (x + night * nightResp) }
}
/** 有机物的积累：制造的减去消耗的 */
export const stored = (t: number, plan: PlanKey = 'none') => { const s = totals(t, plan); return s.made - s.used }
/** 棚里的二氧化碳浓度，0 时算 100：呼吸放出多少就加多少，光合吸收多少就减多少 */
export const co2At = (t: number, plan: PlanKey = 'none') => 100 - stored(t, plan)
/** 光合强度等于呼吸强度的两个时刻：二氧化碳在前一个时刻最高、后一个时刻最低 */
export function balanceTimes(plan: PlanKey = 'none'): [number, number] {
  const { dayLen, pGain } = PLANS[plan], x = dayLen / Math.PI * Math.asin(RESP / (PMAX * pGain))
  return [DAWN + x, DAWN + dayLen - x]
}
/** 一天的有机物积累，不处理的算 100 */
export const yieldIndex = (plan: PlanKey) => Math.round(stored(24, plan) / stored(24, 'none') * 100)
export const clock = (t: number) => { const m = Math.round(t * 60); return `${Math.floor(m / 60)} 时${m % 60 ? ` ${m % 60} 分` : ''}` }
export const MARKS = [6, 12, 18, 24] as const

// ---------- 拓展 ----------
/** 钟罩里的蜡烛：有植物、又有光，氧气才补得上 */
export const candleKeeps = (jar: { plant: boolean; light: boolean }) => jar.plant && jar.light
/** 海尔蒙特的柳树（原始记录：5 磅、169 磅 3 盎司，土少了 2 盎司；5 年） */
export const WILLOW = { years: 5, tree0: 2.3, tree1: 76.7, soilLost: 57 }
export const willowGain = () => WILLOW.tree1 - WILLOW.tree0

// ---------- 第 7 课：画面上的设备什么时候起作用 ----------
/** 到这个时刻为止的有机物积累，按“不处理的一整天 = 100”折算 */
export const yieldSoFar = (t: number, plan: PlanKey) => Math.round(stored(t, plan) / stored(24, 'none') * 100)
/** 补光灯：天然光没有了、但延长的光照时段还没结束 */
export const lampsOn = (t: number, plan: PlanKey) => plan === 'light' && lightAt(t, PLANS.light.dayLen) > 0 && t > DAWN + 12
/** 夜里开天窗降温 */
export const ventOpen = (t: number, plan: PlanKey) => plan === 'cool' && lightAt(t, PLANS.cool.dayLen) === 0
/** 柳树和土在第几年的重量：按匀速增长画（过程是示意，只有起点和终点是记录下来的） */
export const willowAt = (years: number) => { const k = Math.min(Math.max(years / WILLOW.years, 0), 1); return { tree: WILLOW.tree0 + (WILLOW.tree1 - WILLOW.tree0) * k, soilLost: WILLOW.soilLost * k } }
export const XJARS = [
  { key: 'a', name: '只有蜡烛', plant: false, light: true },
  { key: 'b', name: '蜡烛和植物，放在光下', plant: true, light: true },
  { key: 'c', name: '蜡烛和植物，放在暗处', plant: true, light: false },
] as const
