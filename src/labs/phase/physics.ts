// 物态变化实验室的计算核心。画面、读数、任务判定、随堂检测都从这里取数，界面文件里不做计算。
// 温度一律用摄氏度（℃）；加热实验的时间用分钟；取值约定写在规格卡 docs/specs/phase.md 里。
const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))
const smooth = (x: number) => { const k = clamp(x); return k * k * (3 - 2 * k) }

// ---------- 取值约定 ----------
/** 标准大气压下：冰水混合物的温度、沸水的温度；实验室的室温 */
export const FREEZE = 0, BOIL = 100, ROOM = 20
/** 实验用温度计：量程和分度值 */
export const THERMO = { min: -20, max: 110, step: 1 }
/** 体温计：量程和分度值 */
export const CLINIC = { min: 35, max: 42, step: 0.1 }

// ---------- 第 1 课：温度和温度计 ----------
export const CUPS = {
  ice: { name: '冰水混合物', T: FREEZE },
  warm: { name: '温水', T: 35 },
  hot: { name: '热水', T: 68 },
} as const
export type CupKey = keyof typeof CUPS
/** 温度计的示数向周围的温度靠拢：现在是 cur，周围是 target，过了 dt 秒以后是多少。tau 越大变得越慢 */
export const follow = (cur: number, target: number, dt: number, tau: number) => target + (cur - target) * Math.exp(-dt / tau)
/** 按分度值读数 */
export const readT = (T: number, step = THERMO.step) => Math.round(T / step) * step
/** 示数是不是已经稳定在周围的温度上（差不到半格） */
export const steady = (cur: number, target: number) => Math.abs(cur - target) < THERMO.step / 2
/** 把 0 ℃ 到 100 ℃ 之间分成 100 等份，每一份是 1 ℃ */
export const celsiusStep = () => (BOIL - FREEZE) / 100

// ---------- 第 2 课：熔化和凝固 ----------
/** 水浴加热：从 40 ℃ 开始记，每分钟记一次，记 12 分钟；海波每分钟升 2 ℃，熔化用 4 分钟 */
export const BATH = { start: 40, rate: 2, hold: 4, total: 12 }
/** 海波的熔点（也是凝固点） */
export const HYPO_MELT = 48
export const STUFF = { hypo: { name: '海波', crystal: true }, wax: { name: '石蜡', crystal: false } } as const
export type Stuff = keyof typeof STUFF
/** 海波从开始加热到开始熔化要几分钟 */
export const hypoReach = () => (HYPO_MELT - BATH.start) / BATH.rate
/** 加热 t 分钟时的温度。海波：先升、到熔点停住、全部熔化后再升；石蜡：一直升，中间变软的时候升得慢一些（示意） */
export function heatT(s: Stuff, t: number): number {
  const u = clamp(t, 0, BATH.total), a = hypoReach()
  if (s === 'hypo') return u <= a ? BATH.start + BATH.rate * u : u <= a + BATH.hold ? HYPO_MELT : HYPO_MELT + BATH.rate * (u - a - BATH.hold)
  const k = u / BATH.total
  return BATH.start + (heatT('hypo', BATH.total) - BATH.start) * (k + 0.08 * Math.sin(2 * Math.PI * k))
}
/** 停止加热后 t 分钟，海波的温度：先降、到凝固点停住、全部凝固后再降（和加热时对称） */
export const coolT = (t: number) => heatT('hypo', BATH.total - clamp(t, 0, BATH.total))
/** 加热 t 分钟时，已经变成液体的占多少（0–1）。石蜡没有分明的界线，是慢慢变软的 */
export function meltFrac(s: Stuff, t: number) {
  return s === 'hypo' ? clamp((t - hypoReach()) / BATH.hold) : smooth((t - 1.5) / (BATH.total - 3))
}
/** 冷却 t 分钟时，还是液体的占多少 */
export const liquidLeft = (t: number) => meltFrac('hypo', BATH.total - clamp(t, 0, BATH.total))
/** 这时候试管里是什么状态 */
export function stateName(s: Stuff, liquid: number) {
  if (liquid <= 0) return '固态'
  if (liquid >= 1) return '液态'
  return s === 'hypo' ? '固液共存' : '变软、变稀'
}
/** 每分钟记一次：到第 t 分钟为止记下的点 [分钟, 温度] */
export function samples(f: (t: number) => number, t: number): [number, number][] {
  return Array.from({ length: Math.floor(clamp(t, 0, BATH.total) + 1e-6) + 1 }, (_, i) => [i, Math.round(f(i) * 10) / 10])
}

// ---------- 第 3 课：蒸发 ----------
/** 两滴一样多的水：对照的那一滴在画面里 12 秒蒸发完；另一滴改变一个条件后快到几倍（为了比较设的倍数，示意） */
export const EVAP = { base: 12, times: { temp: 3, area: 2, wind: 2.5 } } as const
export type Factor = keyof typeof EVAP.times
export const FACTORS: Record<Factor, { name: string; change: string; say: string }> = {
  temp: { name: '液体的温度', change: '右边的玻璃片用酒精灯加热', say: '液体的温度越高，蒸发越快' },
  area: { name: '液体的表面积', change: '右边的水滴摊开', say: '液体的表面积越大，蒸发越快' },
  wind: { name: '液面上方的空气流动', change: '用风扇吹右边的水滴', say: '液体表面上方空气流动越快，蒸发越快' },
}
/** 一滴水全部蒸发要多久（画面里的秒）；f 不给就是对照的那一滴 */
export const dryTime = (f?: Factor) => EVAP.base / (f ? EVAP.times[f] : 1)
/** 过了 t 秒，这滴水还剩多少（0–1） */
export const waterLeft = (t: number, f?: Factor) => clamp(1 - t / dryTime(f))
/** 蒸发吸热：玻璃泡上蘸了酒精，示数先降后回升。最多降 COOL.drop 度，COOL.at 秒时最低（示意） */
export const COOL = { drop: 6, at: 3, end: 9 }
export const wetT = (t: number) => t <= 0 ? ROOM : ROOM - COOL.drop * (t / COOL.at) * Math.exp(1 - t / COOL.at)

// ---------- 第 4 课：沸腾 ----------
/** 水的沸腾实验：从 90 ℃ 开始记，每分钟升 2 ℃；沸腾后再加热 4 分钟；撤掉酒精灯后每分钟降 1 ℃ */
export const BOILING = { start: 90, rate: 2, keep: 4, fall: 1 }
/** 加热到沸腾要几分钟；整个实验记几分钟 */
export const boilAt = () => (BOIL - BOILING.start) / BOILING.rate
export const boilTotal = () => boilAt() + BOILING.keep
/** 加热 t 分钟时的水温：到了沸点就不再升 */
export const boilT = (t: number) => Math.min(BOIL, BOILING.start + BOILING.rate * Math.max(0, t))
/** 撤掉酒精灯 t 分钟后的水温 */
export const afterOff = (T0: number, t: number) => Math.max(ROOM, T0 - BOILING.fall * Math.max(0, t))
/**
 * 烧杯里的气泡。没加热：没有；快要沸腾（92 ℃ 以上）：杯底的气泡上升时越来越小；沸腾：气泡上升时越来越大，到水面破裂。
 * vigor 是气泡多不多（0–1）
 */
export function bubbles(T: number, heating: boolean, boil = BOIL): { kind: 'none' | 'before' | 'boil'; vigor: number } {
  if (!heating) return { kind: 'none', vigor: 0 }
  if (T >= boil - 1e-6) return { kind: 'boil', vigor: 1 }
  const from = boil - 8
  return T > from ? { kind: 'before', vigor: (T - from) / (boil - from) } : { kind: 'none', vigor: 0 }
}

// ---------- 第 5 课：液化 ----------
/** 注射器里封着乙醚蒸气：拉开时 20 mL，推到 12 mL 开始出现液体，最多推到 5 mL（器材自定） */
export const SYRINGE = { open: 20, dew: 12, shut: 5 }
/** 活塞在 V 毫升处时，变成液体的乙醚占多少（0–1） */
export const etherLiquid = (V: number) => clamp((SYRINGE.dew - V) / (SYRINGE.dew - SYRINGE.shut))
/** 冷玻璃片放在管口 t 秒后，上面的水珠长到多大（0–1） */
export const DEW_TIME = 6
export const dewOn = (t: number) => smooth(t / DEW_TIME)
/** 液化的两种办法 */
export const LIQUEFY = { cool: '降低温度', press: '压缩体积' } as const

// ---------- 第 6 课：升华和凝华 ----------
/** 碘在热水里：t 秒后变成蒸气的占多少；移到冷水里 t 秒后，蒸气还剩多少 */
export const IODINE = { up: 7, down: 7, most: 0.7 }
export const iodineGas = (t: number) => IODINE.most * smooth(t / IODINE.up)
export const iodineBack = (gas0: number, t: number) => gas0 * (1 - smooth(t / IODINE.down))
/** 干冰：t 秒后还剩多少；罐子外壁的霜长到多少 */
export const DRYICE = { gone: 12, frost: 8 }
export const dryIceLeft = (t: number) => clamp(1 - t / DRYICE.gone)
export const frostOn = (t: number) => smooth((t - 1) / DRYICE.frost)

// ---------- 第 7 课：六种物态变化 ----------
export type Phase = '固态' | '液态' | '气态'
export type Change = 'melt' | 'freeze' | 'vapor' | 'liquefy' | 'sublime' | 'deposit'
export const CHANGES: Record<Change, { name: string; from: Phase; to: Phase; heat: '吸热' | '放热' }> = {
  melt: { name: '熔化', from: '固态', to: '液态', heat: '吸热' },
  freeze: { name: '凝固', from: '液态', to: '固态', heat: '放热' },
  vapor: { name: '汽化', from: '液态', to: '气态', heat: '吸热' },
  liquefy: { name: '液化', from: '气态', to: '液态', heat: '放热' },
  sublime: { name: '升华', from: '固态', to: '气态', heat: '吸热' },
  deposit: { name: '凝华', from: '气态', to: '固态', heat: '放热' },
}
export const CHANGE_KEYS = Object.keys(CHANGES) as Change[]
/** 从一种状态变成另一种状态，叫什么 */
export const changeOf = (from: Phase, to: Phase) => CHANGE_KEYS.find(k => CHANGES[k].from === from && CHANGES[k].to === to) ?? null
/** 反过来的那种变化（熔化 ↔ 凝固） */
export const reverseOf = (c: Change) => changeOf(CHANGES[c].to, CHANGES[c].from)!
/** 吸热的三种、放热的三种 */
export const byHeat = (heat: '吸热' | '放热') => CHANGE_KEYS.filter(k => CHANGES[k].heat === heat)
/** 山上的六处现象，各是哪一种物态变化 */
export const NATURE = [
  { key: 'thaw', name: '冰雪消融', where: '山腰的溪边', is: 'melt', why: '冰和雪（固态）变成水（液态）' },
  { key: 'pond', name: '湖面结冰', where: '雪线下的小湖', is: 'freeze', why: '湖水（液态）变成冰（固态）' },
  { key: 'dry', name: '湿衣服晾干', where: '山脚的院子', is: 'vapor', why: '衣服上的水（液态）变成水蒸气（气态）' },
  { key: 'dew', name: '露和雾', where: '山脚的草地', is: 'liquefy', why: '空气中的水蒸气（气态）遇冷变成小水珠（液态）' },
  { key: 'stiff', name: '冻硬的衣服也变干', where: '雪线上的木屋旁', is: 'sublime', why: '衣服上的冰（固态）直接变成水蒸气（气态）' },
  { key: 'frost', name: '霜和雪', where: '雪线上的百叶箱', is: 'deposit', why: '空气中的水蒸气（气态）直接变成小冰晶（固态）' },
] as const satisfies readonly { key: string; name: string; where: string; is: Change; why: string }[]
export type NatureKey = typeof NATURE[number]['key']
/** 一对一对地认：固和液之间、液和气之间、固和气之间 */
export const PAIRS: { id: string; name: string; keys: NatureKey[] }[] = [
  { id: 'sl', name: '固态和液态之间', keys: ['thaw', 'pond'] },
  { id: 'lg', name: '液态和气态之间', keys: ['dry', 'dew'] },
  { id: 'sg', name: '固态和气态之间', keys: ['stiff', 'frost'] },
]

// ---------- 拓展课 ----------
/** 电冰箱：制冷剂在哪里发生什么 */
export const FRIDGE = [
  { part: '冷冻室里的管子', is: 'vapor', say: '液态的制冷剂在这里汽化，从冰箱里面吸热' },
  { part: '压缩机', is: null, say: '把气态的制冷剂抽走，压进冷凝器' },
  { part: '冷凝器', is: 'liquefy', say: '气态的制冷剂在这里被压缩而液化，把热放到冰箱外面' },
] as const
/** 烧瓶里的水停止加热后放了几分钟，再往外抽气 */
export const FLASK = { wait: 4 }
export const flaskT = () => afterOff(BOIL, FLASK.wait)
/** 气压降低，沸点降低：抽气以后，水温只要不低于新的沸点就又沸腾。这里只判断会不会沸腾，不给沸点的数 */
export const boilsAgain = (pumped: boolean) => pumped && flaskT() < BOIL
/** 水循环里的一圈 */
export const CYCLE = [
  { name: '蒸发', is: 'vapor', say: '海水、湖水吸热，汽化成水蒸气升到空中' },
  { name: '成云', is: 'liquefy', say: '水蒸气在高空遇冷，液化成小水滴或凝华成小冰晶，聚成云' },
  { name: '降水', is: 'melt', say: '小冰晶越聚越大往下落，在下落途中熔化成雨；气温很低时落下来的就是雪' },
  { name: '回流', is: null, say: '雨水和融化的雪水汇成河，流回湖和海' },
] as const
