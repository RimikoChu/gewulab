// 水循环实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 水体比例、水量平衡、更新周期是通行的全球估算值；径流系数、水库调节、洪水过程是简化模型，只用来比较大小。取值约定见 docs/specs/watercycle.md。

// ---------- 第 1 课：水都在哪里 ----------
/** 各种水体：占全球水量的百分比；淡水的另记它占淡水的百分比 */
export const BODIES = {
  ocean: { name: '海洋水', ofAll: 96.5, ofFresh: null, note: '咸水，不能直接喝，也不能直接浇地' },
  ice: { name: '冰川', ofAll: 1.72, ofFresh: 68.7, note: '淡水里最多的一种，但大多在南极和格陵兰，很难用上' },
  ground: { name: '地下淡水', ofAll: 0.75, ofFresh: 30.1, note: '埋得浅的可以打井取用，埋得深的很难开采' },
  river: { name: '河流和湖泊等', ofAll: 0.03, ofFresh: 1.2, note: '人们用得最多的就是这一点点，加上浅层地下水' },
} as const
export type BodyKey = keyof typeof BODIES
export const FRESH_OF_ALL = 2.5

// ---------- 第 2、3 课：环节和三种循环 ----------
export const LINKS = {
  evap: { name: '蒸发', say: '太阳晒着海面，海水变成水汽升到空中' },
  move: { name: '水汽输送', say: '风把海洋上空的水汽吹到陆地上空' },
  rain: { name: '降水', say: '水汽遇冷凝结成云，变成雨或雪落下来' },
  runoff: { name: '地表径流', say: '落在地面的水汇进河里，顺着地势流回海洋' },
  seep: { name: '下渗', say: '一部分水渗进土里，成了地下水' },
  under: { name: '地下径流', say: '地下水在含水层里慢慢流动，最后也回到河里或海里' },
  landEvap: { name: '陆地蒸发和植物蒸腾', say: '陆地上的水面、土壤和植物也向空中送水汽' },
  seaRain: { name: '海上降水', say: '海洋上空的水汽直接在海上落下来' },
} as const
export type LinkKey = keyof typeof LINKS
/** 第 2 课走的顺序 */
export const TRIP: LinkKey[] = ['evap', 'move', 'rain', 'runoff', 'seep', 'under']
export const LOOPS = {
  seaLand: { name: '海陆间循环', links: ['evap', 'move', 'rain', 'runoff', 'seep', 'under'] as LinkKey[], renews: true, say: '水在海洋和陆地之间来回。陆地上的淡水靠它不断得到补充，所以最重要' },
  land: { name: '陆地内循环', links: ['landEvap', 'rain'] as LinkKey[], renews: false, say: '陆地上蒸发的水又落回陆地。内流区主要靠它，水量很少' },
  sea: { name: '海上内循环', links: ['evap', 'seaRain'] as LinkKey[], renews: false, say: '海上蒸发的水又落回海里。参与的水量最大，但到不了陆地' },
} as const
export type LoopKey = keyof typeof LOOPS

// ---------- 第 4 课：径流和下渗 ----------
export const GROUNDS = {
  forest: { name: '林地', k: 0.2 }, grass: { name: '草地', k: 0.3 }, bare: { name: '裸地', k: 0.5 }, paved: { name: '硬化地面', k: 0.9 },
} as const
export type GroundKey = keyof typeof GROUNDS
export const RAIN = 50
/** 一场雨里从地面流走的水（mm）：降雨量 × 径流系数 */
export const runoff = (g: GroundKey, rain = RAIN) => rain * GROUNDS[g].k
/** 渗进地里的水（mm）：短时间内不计蒸发，剩下的都算下渗 */
export const seep = (g: GroundKey, rain = RAIN) => rain - runoff(g, rain)

// ---------- 第 5 课：水库 ----------
/** 一条夏汛型河流各月的天然流量（相对值） */
export const FLOW = [20, 20, 30, 50, 90, 150, 200, 180, 110, 60, 30, 20]
export const meanFlow = () => FLOW.reduce((a, b) => a + b, 0) / FLOW.length
/** 这个月的流量：有水库时，丰枯之间的差被削掉六成 */
export const flowAt = (month: number, dam: boolean) => { const q = FLOW[month], m = meanFlow(); return dam ? m + 0.4 * (q - m) : q }
export const flowRange = (dam: boolean) => { const all = FLOW.map((_, i) => flowAt(i, dam)); return { max: Math.max(...all), min: Math.min(...all) } }

// ---------- 第 6 课：城市和暴雨 ----------
export const CITIES = {
  before: { name: '开发前', k: 0.3, tp: 6, say: '到处是农田和树林，雨水大半渗进了地里' },
  hard: { name: '硬化后', k: 0.9, tp: 2, say: '地面铺满了水泥和沥青，雨水渗不下去，很快全涌进了下水道' },
  sponge: { name: '海绵改造后', k: 0.5, tp: 4, say: '加了绿地、透水铺装和蓄水池，一部分雨水被留住、渗下去了' },
} as const
export type CityKey = keyof typeof CITIES
/** 洪峰的大小（相对值）和出现的时间（雨后几小时） */
export const floodPeak = (c: CityKey) => ({ q: Math.round(CITIES[c].k * 100), t: CITIES[c].tp })
/** 雨后第 t 小时河里的流量（相对值）：先涨后落，洪峰在 tp 时 */
export const floodAt = (c: CityKey, t: number) => { const { k, tp } = CITIES[c]; return t <= 0 ? 0 : k * 100 * (t / tp) * Math.exp(1 - t / tp) }

// ---------- 第 7 课：一年的水账（千立方千米每年） ----------
export const BUDGET = { seaEvap: 505, seaRain: 458, landRain: 119, landEvap: 72 }
/** 海洋每年多蒸发掉的水 */
export const seaLoss = () => BUDGET.seaEvap - BUDGET.seaRain
/** 陆地每年多落下来的水 */
export const landGain = () => BUDGET.landRain - BUDGET.landEvap

// ---------- 拓展：更新周期（天） ----------
export const RENEW = [
  { name: '大气水', days: 8, text: '约 8 天' }, { name: '河水', days: 16, text: '约 16 天' }, { name: '湖泊水', days: 17 * 365, text: '约 17 年' },
  { name: '深层地下水', days: 1400 * 365, text: '约 1400 年' }, { name: '海洋水', days: 2500 * 365, text: '约 2500 年' }, { name: '极地冰川', days: 9700 * 365, text: '约 9700 年' },
]
