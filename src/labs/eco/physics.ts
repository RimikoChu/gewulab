// 生态系统实验室的计算核心。画面、读数、任务判定、随堂检测都从这里取数，界面文件里不做计算。
// 取值约定和来历写在规格卡 docs/specs/eco.md 里；标“示意”的数只说明趋势。

export const average = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length)

// ---------- 第 1 课：光对鼠妇分布的影响 ----------
/** 实验盒里放几只鼠妇 */
export const WOODLICE = 10
/** 每分钟统计一次、共 10 次：阴暗一侧的只数（一组典型结果，示意） */
export const DARK = [6, 7, 7, 8, 8, 9, 9, 9, 9, 10] as const
/** 第 n 次统计（从 0 起）时明亮一侧的只数 */
export const brightAt = (n: number) => WOODLICE - DARK[n]
/** 影响生物生活的非生物因素 */
export const ABIOTIC = ['光', '温度', '水', '空气', '土壤'] as const

// ---------- 第 2 课：生态系统的组成 ----------
export type Role = 'producer' | 'consumer' | 'decomposer' | 'abiotic'
export const ROLE_NAME: Record<Role, string> = { producer: '生产者', consumer: '消费者', decomposer: '分解者', abiotic: '非生物部分' }
/** 草原上的东西各属于哪一部分 */
export const ROLES: Record<string, Role> = {
  草: 'producer', 野花: 'producer', 灌木: 'producer', 水草: 'producer',
  兔: 'consumer', 鼠: 'consumer', 羊: 'consumer', 蝗虫: 'consumer', 狐: 'consumer', 蛇: 'consumer', 鹰: 'consumer', 狼: 'consumer', 鱼: 'consumer',
  蘑菇: 'decomposer', 细菌: 'decomposer',
  阳光: 'abiotic', 空气: 'abiotic', 水: 'abiotic', 土壤: 'abiotic',
}
/** 每一部分在草原上认哪几样（第 2 课按这个顺序一个个看） */
export const MEMBERS: Record<Role, string[]> = {
  producer: ['草', '野花', '灌木'],
  consumer: ['兔', '羊', '鼠', '蝗虫', '狐', '鹰'],
  decomposer: ['蘑菇', '细菌'],
  abiotic: ['阳光', '空气', '水', '土壤'],
}
export const ROLE_JOB: Record<Role, string> = {
  producer: '利用光能，通过光合作用制造有机物，为自身和其他生物提供食物和能量',
  consumer: '直接或间接以植物为食',
  decomposer: '把动植物遗体中的有机物分解成无机物，归还到环境中',
  abiotic: '阳光、空气、水、土壤等，为生物提供生存的条件',
}
export const roleOf = (name: string): Role | undefined => ROLES[name]

// ---------- 第 3 课：食物链 ----------
export const CHAINS = { rabbit: ['草', '兔', '狐'], mouse: ['草', '鼠', '蛇', '鹰'] } as const
export type ChainKey = keyof typeof CHAINS
export const chainText = (c: readonly string[]) => c.join(' → ')
/** 一条食物链的写法对不对。不对时给出原因 */
export function checkChain(c: readonly string[]): { ok: boolean; why: string } {
  if (c.some(x => roleOf(x) === 'abiotic')) return { ok: false, why: '食物链里没有非生物部分' }
  if (c.some(x => roleOf(x) === 'decomposer')) return { ok: false, why: '分解者不吃活的生物，不进入食物链' }
  if (roleOf(c[0]) !== 'producer') return { ok: false, why: '食物链要从生产者开始' }
  for (let i = 1; i < c.length; i++) if (!eats(c[i], c[i - 1])) return { ok: false, why: `${c[i]}不吃${c[i - 1]}：箭头要指向吃它的一方` }
  return { ok: true, why: '从生产者开始，箭头指向吃它的一方' }
}

// ---------- 第 4 课：食物网 ----------
/** 草原食物网里的捕食关系：[被吃的, 吃它的] */
export const WEB: [string, string][] = [['草', '兔'], ['草', '鼠'], ['兔', '狐'], ['兔', '鹰'], ['鼠', '狐'], ['鼠', '鹰'], ['鼠', '蛇'], ['蛇', '鹰']]
export const WEB_SPECIES = ['草', '兔', '鼠', '狐', '蛇', '鹰'] as const
export const eats = (eater: string, food: string) => WEB.some(([a, b]) => a === food && b === eater)
/** 食物网里全部的食物链：从生产者出发，一直走到没有谁再吃它为止 */
export function chainsOf(web: [string, string][] = WEB): string[][] {
  const out: string[][] = []
  const walk = (path: string[]) => {
    const next = web.filter(([a]) => a === path[path.length - 1]).map(([, b]) => b)
    if (!next.length) { out.push(path); return }
    for (const n of next) walk([...path, n])
  }
  for (const p of new Set(web.map(([a]) => a))) if (roleOf(p) === 'producer') walk([p])
  return out
}
/** 一种生物在各条链里是第几营养级（去重、从小到大） */
export const levelsOf = (name: string) => [...new Set(chainsOf().flatMap(c => c.indexOf(name) >= 0 ? [c.indexOf(name) + 1] : []))].sort((a, b) => a - b)
/** 两种生物之间的关系：捕食（一方吃另一方）、竞争（吃同一种食物） */
export function relation(a: string, b: string) {
  const r: string[] = []
  if (eats(a, b) || eats(b, a)) r.push('捕食')
  const foodA = WEB.filter(([, e]) => e === a).map(([f]) => f), foodB = WEB.filter(([, e]) => e === b).map(([f]) => f)
  if (foodA.some(f => foodB.includes(f))) r.push('竞争')
  return r
}
/** 两种生物共同的食物 */
export const sharedFood = (a: string, b: string) => WEB.filter(([, e]) => e === a).map(([f]) => f).filter(f => WEB.some(([g, e]) => e === b && g === f))

// ---------- 第 5 课：能量流动 ----------
/** 能量流动这一课用的食物链 */
export const ENERGY_CHAIN = ['草', '鼠', '蛇', '鹰'] as const
/** 草固定的太阳能（kJ，示意） */
export const GRASS_ENERGY = 10000
/** 传到下一营养级的比例：教材说大约只有 10%–20% */
export const RATES = { low: 0.1, high: 0.2 } as const
export type RateKey = keyof typeof RATES
/** 第 level 级（草是第 1 级）得到的能量（kJ） */
export const energyAt = (level: number, rate: number) => Math.round(GRASS_ENERGY * Math.pow(rate, level - 1) * 1000) / 1000

// ---------- 第 6 课：物质循环和生物富集 ----------
/** 一个碳走一圈：在哪、经过什么过程到下一处 */
export const CARBON = [
  { at: '空气', what: '二氧化碳', via: '光合作用', note: '草通过光合作用，把空气里的二氧化碳和水合成有机物' },
  { at: '草', what: '有机物', via: '被兔吃掉', note: '有机物沿食物链传给兔' },
  { at: '兔', what: '有机物', via: '呼吸作用', note: '兔通过呼吸作用把一部分有机物分解，放出二氧化碳' },
  { at: '空气', what: '二氧化碳', via: '光合作用', note: '回到空气里，又能被草利用' },
  { at: '草', what: '有机物', via: '落叶、遗体', note: '草的落叶、动物的遗体和粪便里也有有机物' },
  { at: '蘑菇', what: '有机物', via: '分解作用', note: '分解者把遗体里的有机物分解成二氧化碳、水和无机盐' },
  { at: '空气', what: '二氧化碳', via: '', note: '碳又回到了空气里：物质在生物和无机环境之间循环' },
] as const
/** 生物富集这一课用的食物链 */
export const TOXIN_CHAIN = ['草', '鼠', '蛇', '鹰'] as const
/** 每升高一个营养级，有毒物质的相对含量乘几（示意） */
export const TOXIN_FACTOR = 10
/** 第 level 级体内有毒物质的相对含量（草为 1，示意） */
export const toxinAt = (level: number) => Math.pow(TOXIN_FACTOR, level - 1)

// ---------- 第 7 课：生态平衡（草、兔、狼的简化模型，示意） ----------
export type Hunt = 'none' | 'some' | 'many'
export const HUNT_NAME: Record<Hunt, string> = { none: '不捕杀', some: '少量捕杀', many: '大量捕杀' }
export const START = { grass: 80, rabbit: 200, wolf: 12 }
export const YEARS = 12
const M = { a: 0.1, h: 20, b: 1.6, mR: 0.4, cR: 0.001, p: 68 / 3, s: 200, e: 1.4, mW: 0.1, qW: 0.05 }
export interface Point { year: number; grass: number; rabbit: number; wolf: number }
/** 按捕杀方式算 YEARS 年里的变化。每 0.25 年记一个点 */
export function simulate(hunt: Hunt, years = YEARS): Point[] {
  const kill = hunt === 'many' ? 0.95 : hunt === 'some' ? 0.4 : 0, keep = hunt === 'many' ? 3 : 0, dt = 0.01
  let G = START.grass, R = START.rabbit, W = START.wolf * (1 - kill)
  const out: Point[] = [], n = Math.round(years / dt), every = Math.round(0.25 / dt)
  for (let i = 0; i <= n; i++) {
    if (i % every === 0) out.push({ year: i * dt, grass: G, rabbit: R, wolf: W })
    const f = G / (G + M.h), pr = W * R / (R + M.s)
    const dG = G * (1 - G / 100) - M.a * R * f
    const dR = M.b * R * f - M.mR * R - M.cR * R * R - M.p * pr
    const dW = M.e * pr - M.mW * W - M.qW * W * W - keep * W
    G = Math.max(0.5, G + dG * dt); R = Math.max(1, R + dR * dt); W = Math.max(0, W + dW * dt)
  }
  return out
}
/** 一组结果里的几个关键数：兔最多多少、哪一年；草最少多少；最后一年的三者 */
export function summary(pts: Point[]) {
  const top = pts.reduce((a, b) => (b.rabbit > a.rabbit ? b : a)), low = pts.reduce((a, b) => (b.grass < a.grass ? b : a)), end = pts[pts.length - 1]
  return { maxRabbit: top.rabbit, maxYear: top.year, minGrass: low.grass, end }
}

// ---------- 拓展：不同的生态系统、生态瓶 ----------
export const SYSTEMS = {
  grass: { name: '草原生态系统', producer: '草', note: '分布在干旱地区，动植物种类比森林少' },
  lake: { name: '湖泊生态系统', producer: '水草、藻类', note: '水里的生产者主要是藻类和水草' },
  forest: { name: '森林生态系统', producer: '乔木、灌木', note: '动植物种类多，自我调节能力最强' },
  farm: { name: '农田生态系统', producer: '小麦', note: '以农作物为主，动植物种类少，离不开人的管理' },
} as const
export type SystemKey = keyof typeof SYSTEMS
/** 自我调节能力从强到弱（教材：森林最强；农田种类少，调节能力弱） */
export const STRONGEST: SystemKey = 'forest'
export type Bottle = 'light' | 'dark'
/** 生态瓶：光下的瓶里水草能进行光合作用，放出氧气，小鱼活得更久 */
export const lastsLonger = (): Bottle => 'light'
export const BOTTLE_PARTS = { producer: '水草', consumer: '小鱼、螺', decomposer: '泥沙里的细菌和真菌', abiotic: '水、泥沙、阳光' } as const
