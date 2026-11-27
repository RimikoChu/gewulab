// 种群和生态系统实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 数量的单位是“只”“株”，时间的单位是“年”，能量的单位是 kJ。取值约定写在规格卡 docs/specs/population.md 里。

// ---------- 第 1 课：样方法 ----------
/** 一个 1 m² 样方里的蒲公英：框内的、压在上边线、左边线、下边线、右边线上的各几株 */
export interface Quadrat { inside: number; top: number; left: number; bottom: number; right: number }
export const QUADRATS: Quadrat[] = [
  { inside: 5, top: 1, left: 1, bottom: 1, right: 1 },
  { inside: 7, top: 1, left: 1, bottom: 0, right: 1 },
  { inside: 6, top: 1, left: 1, bottom: 1, right: 0 },
  { inside: 5, top: 0, left: 1, bottom: 1, right: 1 },
  { inside: 8, top: 1, left: 1, bottom: 1, right: 1 },
]
/** 计数规则：half 是“计上不计下，计左不计右”（只数相邻两边上的），all 是压线的全都数 */
export type Rule = 'half' | 'all'
export const RULE_NAME: Record<Rule, string> = { half: '计上不计下', all: '压线的全数' }
/** 样方面积（m²）和调查地块的面积（m²） */
export const QUADRAT_AREA = 1, PLOT_AREA = 100
/** 一个样方按规则数出几株 */
export const countQuadrat = (q: Quadrat, rule: Rule = 'half') => q.inside + q.top + q.left + (rule === 'all' ? q.bottom + q.right : 0)
/** 各样方密度的平均值（株/m²）：这就是种群密度的估计值 */
export const meanDensity = (rule: Rule = 'half', qs = QUADRATS) => qs.reduce((s, q) => s + countQuadrat(q, rule), 0) / qs.length / QUADRAT_AREA
/** 按平均密度估计整个地块里的总株数 */
export const plotTotal = (rule: Rule = 'half') => meanDensity(rule) * PLOT_AREA

// ---------- 第 2 课：标记重捕法 ----------
/** 第一次捕获并标记 M 只；第二次捕获 n 只，其中带标记 m 只；lost 是重捕到的个体里标记物脱落的只数 */
export const MARK = { M: 40, n: 50, m: 10, lost: 2, real: 200 }
/** 标记重捕法估计的个体总数：N = M × n ÷ m */
export const lincoln = (M: number, n: number, m: number) => (M * n) / m
/** 标记物脱落 lost 只以后，数到的带标记个体变少，估计值偏大 */
export const lincolnLost = (lost = MARK.lost) => lincoln(MARK.M, MARK.n, MARK.m - lost)

// ---------- 第 3 课：年龄结构 ----------
export type AgeKey = 'grow' | 'stable' | 'decline'
/** 三种年龄结构（各年龄期个体占的百分比）和这一年的出生率、死亡率 */
export const AGES: Record<AgeKey, { name: string; young: number; adult: number; old: number; birth: number; death: number }> = {
  grow: { name: '增长型', young: 50, adult: 35, old: 15, birth: 0.4, death: 0.15 },
  stable: { name: '稳定型', young: 33, adult: 34, old: 33, birth: 0.25, death: 0.25 },
  decline: { name: '衰退型', young: 15, adult: 35, old: 50, birth: 0.12, death: 0.3 },
}
export const AGE_N0 = 100, AGE_YEARS = 5
/** 增长率 = 出生率 − 死亡率 */
export const growthRate = (k: AgeKey) => AGES[k].birth - AGES[k].death
/** 出生率、死亡率保持不变时，t 年后的数量（只） */
export const projectAge = (k: AgeKey, t: number) => AGE_N0 * Math.pow(1 + growthRate(k), t)

// ---------- 第 4 课：J 形增长 ----------
export const J_N0 = 20, J_YEARS = 10
export const LAMBDAS = [1.3, 1.5, 1] as const
export type Lambda = (typeof LAMBDAS)[number]
/** J 形增长：Nt = N0 × λ^t */
export const jGrowth = (lambda: number, t: number, N0 = J_N0) => N0 * Math.pow(lambda, t)

// ---------- 第 5 课：S 形增长 ----------
export const S_N0 = 20, S_R = 0.6, S_YEARS = 20
export type Pasture = 'good' | 'poor'
/** 环境容纳量 K（只）：草场完好和草场退化两种情况 */
export const K_OF: Record<Pasture, number> = { good: 2400, poor: 1200 }
export const PASTURE_NAME: Record<Pasture, string> = { good: '草场完好', poor: '草场退化' }
/** S 形增长（逻辑斯谛模型）t 年时的数量 */
export const logistic = (K: number, t: number, N0 = S_N0, r = S_R) => K / (1 + (K / N0 - 1) * Math.exp(-r * t))
/** 增长速率（只/年）：r N (1 − N/K)；N = K/2 时最大 */
export const logisticRate = (N: number, K: number, r = S_R) => r * N * (1 - N / K)
/** 数量到达 K/2 的时刻（年） */
export const tHalf = (K: number, N0 = S_N0, r = S_R) => Math.log(K / N0 - 1) / r
/** 最大增长速率（只/年）：r K / 4 */
export const maxRate = (K: number, r = S_R) => (r * K) / 4

// ---------- 第 6 课：捕食者和猎物 ----------
/** 模型参数：兔按 S 形增长（r、K），狐每年每只捕食的比例 b，吃下的兔转化成小狐的比例 e，狐的死亡率 d */
export const PP = { r: 0.6, K: 2400, b: 0.02, e: 0.05, d: 0.5, H0: 2400, P0: 10, years: 30, per: 4 }
export interface Pt { t: number; H: number; P: number }
/** 兔（H）和狐（P）的数量随时间的变化，每年 per 个点。fox=false 时岛上没有狐，兔从 H0 开始按 S 形增长 */
export function simulate(fox: boolean, H0 = PP.H0, P0 = fox ? PP.P0 : 0, years = PP.years): Pt[] {
  const { r, K, b, e, d, per } = PP, sub = 20, dt = 1 / per / sub, out: Pt[] = [{ t: 0, H: H0, P: P0 }]
  const f = (H: number, P: number): [number, number] => [r * H * (1 - H / K) - b * H * P, e * b * H * P - d * P]
  let H = H0, P = P0
  for (let i = 1; i <= years * per; i++) {
    for (let k = 0; k < sub; k++) {
      const a = f(H, P), b2 = f(H + a[0] * dt / 2, P + a[1] * dt / 2), c = f(H + b2[0] * dt / 2, P + b2[1] * dt / 2), g = f(H + c[0] * dt, P + c[1] * dt)
      H += dt * (a[0] + 2 * b2[0] + 2 * c[0] + g[0]) / 6; P += dt * (a[1] + 2 * b2[1] + 2 * c[1] + g[1]) / 6
    }
    out.push({ t: i / per, H, P })
  }
  return out
}
/** 一条曲线上第 from 年以后的第一个峰：{ t 年份, v 数量 } */
export function firstPeak(pts: Pt[], key: 'H' | 'P', from = 5) {
  for (let i = 1; i < pts.length - 1; i++) if (pts[i].t >= from && pts[i][key] > pts[i - 1][key] && pts[i][key] >= pts[i + 1][key]) return { t: pts[i].t, v: pts[i][key] }
  return { t: pts[pts.length - 1].t, v: pts[pts.length - 1][key] }
}
/** 有狐时两者最后趋向的数量：兔 d/(e b)，狐 (r/b)(1 − 兔/K) */
export const balance = () => { const H = PP.d / (PP.e * PP.b); return { H, P: (PP.r / PP.b) * (1 - H / PP.K) } }

// ---------- 第 7 课：能量流动 ----------
/** 一个营养级一年里同化的能量（kJ）和它的四个去向：呼吸作用散失、流向分解者、未利用、流入下一营养级 */
export interface Level { name: string; level: string; got: number; resp: number; decomp: number; unused: number; next: number }
export const ENERGY: Level[] = [
  { name: '草', level: '第一营养级', got: 10000, resp: 4500, decomp: 1500, unused: 2500, next: 1500 },
  { name: '兔', level: '第二营养级', got: 1500, resp: 900, decomp: 200, unused: 220, next: 180 },
  { name: '狐', level: '第三营养级', got: 180, resp: 130, decomp: 20, unused: 30, next: 0 },
]
/** 第 i 个营养级到下一个营养级的能量传递效率 = 下一营养级的同化量 ÷ 这一营养级的同化量 */
export const efficiency = (i: number) => ENERGY[i + 1].got / ENERGY[i].got
/** 一个营养级的四个去向加起来，应当等于它的同化量 */
export const outSum = (l: Level) => l.resp + l.decomp + l.unused + l.next

// ---------- 拓展：碳循环、渔场 ----------
/** 碳循环的五条途径：碳以什么形式、从哪到哪 */
export const CARBON = [
  { id: 'photo', name: '光合作用', from: '大气中的二氧化碳库', to: '生产者', form: '二氧化碳 → 含碳有机物' },
  { id: 'feed', name: '捕食', from: '生产者', to: '消费者', form: '含碳有机物' },
  { id: 'resp', name: '呼吸作用', from: '生产者和消费者', to: '大气中的二氧化碳库', form: '含碳有机物 → 二氧化碳' },
  { id: 'decomp', name: '分解作用', from: '遗体和粪便', to: '大气中的二氧化碳库', form: '分解者把有机物分解成二氧化碳' },
  { id: 'burn', name: '化石燃料的燃烧', from: '煤、石油、天然气', to: '大气中的二氧化碳库', form: '含碳有机物 → 二氧化碳' },
] as const
/** 渔场：鱼群按 S 形增长，K 是环境容纳量（尾），r 是增长率 */
export const FISH = { K: 8000, r: 0.5, crate: 250 }
export type Left = 'quarter' | 'half' | 'most'
export const LEFT: Record<Left, { name: string; N: number }> = { quarter: { name: 'K/4', N: FISH.K / 4 }, half: { name: 'K/2', N: FISH.K / 2 }, most: { name: '3K/4', N: (FISH.K * 3) / 4 } }
/** 捕捞后剩下 N 尾时，鱼群一年能长回来多少（尾/年）：这就是每年可以持续捕捞的量 */
export const fishYield = (k: Left) => logisticRate(LEFT[k].N, FISH.K, FISH.r)

// ---------- 读数的写法 ----------
export const fmt = (v: number, d = 0) => v.toFixed(d)
export const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`
