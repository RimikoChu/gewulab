// 内能和热机实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 物理量一律用国际单位（温度用 ℃，热量用 J）。取值约定写在规格卡 docs/specs/heat.md 里。

export const C_WATER = 4.2e3     // 水的比热容 J/(kg·℃)
export const C_AL = 0.88e3       // 铝的比热容 J/(kg·℃)
export const Q_PETROL = 4.6e7    // 汽油的热值 J/kg
export const Q_DIESEL = 4.3e7    // 柴油的热值 J/kg
export const ROOM = 20           // 室温 ℃

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
/** 一个数指数地靠向目标：tau 秒走掉 63% */
export const follow = (cur: number, target: number, dt: number, tau: number) => cur + (target - cur) * (1 - Math.exp(-dt / tau))

/** 热量 Q = c m Δt（Δt 是温度的变化量） */
export const heatQ = (c: number, m: number, dT: number) => c * m * dT
/** 比热容 c = Q / (m Δt) */
export const specific = (Q: number, m: number, dT: number) => Q / (m * dT)
/** 燃料完全燃烧放出的热 Q = m q */
export const fuelQ = (m: number, q: number) => m * q

/** 把一个很大或很小的数写成 a.bc×10ⁿ（界面上的热量都这样写） */
export function sci(x: number, digits = 2) {
  if (x === 0) return '0'
  const n = Math.floor(Math.log10(Math.abs(x))), a = x / 10 ** n
  const sup = String(n).split('').map(ch => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(ch)] ?? '⁻').join('')
  return n === 0 ? a.toFixed(digits) : `${(+a.toFixed(digits)).toString()}×10${sup}`
}

// ---------- 第 1 课 分子热运动 ----------
export const INK = { cold: 20, hot: 80, tauCold: 16, tauHot: 3.4 }
/** 红墨水散开的程度（0 刚滴进去，1 均匀）：t 是滴进去以后过了几秒 */
export const diffuse = (t: number, hot: boolean) => clamp01(1 - Math.exp(-t / (hot ? INK.tauHot : INK.tauCold)))
/** 红墨水算“基本均匀”的那一刻（散开 95%） */
export const evenAt = (hot: boolean) => -Math.log(0.05) * (hot ? INK.tauHot : INK.tauCold)
/** 抽掉玻璃片以后，上面那只瓶里二氧化氮占的比例（最后上下各一半） */
export const GAS_TAU = 4.5
export const gasMix = (t: number) => 0.5 * clamp01(1 - Math.exp(-t / GAS_TAU))
export const gasEvenAt = () => -Math.log(0.04) * GAS_TAU
/** 放大图里分子的平均速度（相对值）：和热力学温度的平方根成正比，以 20 ℃ 为 1 */
export const molSpeed = (T: number) => Math.sqrt((T + 273) / (ROOM + 273))

// ---------- 第 2 课 分子间的作用力 ----------
export const HOOKS = { n: 4, mass: 0.05 }
/** 注射器的活塞用同样的力推，能往里推进去多少（占原来长度的比例）：气体容易压缩，液体很难 */
export const SYRINGE = { air: { name: '空气', push: 0.5 }, water: { name: '水', push: 0.02 } } as const
export type Fill = keyof typeof SYRINGE
export const syringe = (f: Fill) => SYRINGE[f].push

// ---------- 第 3 课 内能 ----------
export const BATH = { m: 0.2, T: 80 }       // 热水：0.2 kg、80 ℃
export const AL = { m: 0.1, T: ROOM }       // 铝活塞：0.1 kg、20 ℃
/** 两个物体热传递到温度相同时的温度（忽略散热：水放出的热 = 铝吸收的热） */
export const mixT = (c1: number, m1: number, T1: number, c2: number, m2: number, T2: number) => (c1 * m1 * T1 + c2 * m2 * T2) / (c1 * m1 + c2 * m2)
export const bathEnd = () => mixT(C_WATER, BATH.m, BATH.T, C_AL, AL.m, AL.T)
/** 放进去 t 秒后水和铝的温度：两边都指数地靠向共同温度 */
export const TRANSFER_TAU = 2.2
export function transfer(t: number) {
  const k = 1 - Math.exp(-t / TRANSFER_TAU), end = bathEnd()
  return { water: BATH.T + (end - BATH.T) * k, al: AL.T + (end - AL.T) * k }
}

// ---------- 第 4 课 比热容 ----------
export const OIL_C = 2.1e3                   // 这次实验里食用油的比热容（由加热器设定得出）
export const OIL_RHO = 0.9e3, WATER_RHO = 1.0e3
export const HEAT = { m: 0.2, start: ROOM, perMin: 2.1e3, first: 4, total: 8 }
export type Stuff = 'water' | 'oil'
export const C_OF = { water: C_WATER, oil: OIL_C }
/** 加热 min 分钟后的温度：加热器每分钟给的热一样，升得多少看比热容 */
export const heaterT = (s: Stuff, min: number) => HEAT.start + HEAT.perMin * min / (C_OF[s] * HEAT.m)
/** 同样多的热：前 4 分钟加热器给的热量 */
export const heaterQ = (min: number) => HEAT.perMin * min
/** 两只杯里液体的体积（m³）：质量相同，油的密度小，体积大一点 */
export const volumeOf = (s: Stuff) => HEAT.m / (s === 'water' ? WATER_RHO : OIL_RHO)
/** 由这次实验的读数算出的油的比热容：Q 用水的读数算 */
export function oilFromRun() {
  const Q = heatQ(C_WATER, HEAT.m, heaterT('water', HEAT.first) - HEAT.start)
  return specific(Q, HEAT.m, heaterT('oil', HEAT.first) - HEAT.start)
}

// ---------- 第 5 课 热量的计算 ----------
export const COOL = { start: ROOM, hot: 90, cold: 40, masses: [5, 10] as const }
export type Mass = '5' | '10'
/** 发动机运转时冷却液的温度：t 秒，tau 秒内基本到 90 ℃（示意） */
export const WARM_SEC = 7, COOL_SEC = 6
export const warmT = (t: number) => COOL.start + (COOL.hot - COOL.start) * clamp01(t / WARM_SEC) ** 0.8
export const coolT = (t: number) => COOL.hot - (COOL.hot - COOL.cold) * clamp01(t / COOL_SEC) ** 0.7
/** 冷却液吸收的热 Q吸 = cm(t − t₀) */
export const absorbed = (m: number, t0: number, t: number) => heatQ(C_WATER, m, t - t0)
/** 冷却液放出的热 Q放 = cm(t₀ − t) */
export const released = (m: number, t0: number, t: number) => heatQ(C_WATER, m, t0 - t)

// ---------- 第 6 课 四冲程汽油机 ----------
/** 单缸机的尺寸（m）：曲柄半径（行程的一半）、连杆长、缸径 */
export const ENGINE = { r: 0.04, l: 0.13, bore: 0.086 }
export const STROKES = ['吸气', '压缩', '做功', '排气'] as const
export type Stroke = typeof STROKES[number]
/** 曲轴转角 a（度，0 是吸气冲程开始时活塞在最高处）在第几个冲程 */
export const strokeIndex = (a: number) => Math.floor((((a % 720) + 720) % 720) / 180)
export const strokeOf = (a: number): Stroke => STROKES[strokeIndex(a)]
/** 活塞销离曲轴中心多高（m） */
export function pistonY(a: number) {
  const t = a * Math.PI / 180, { r, l } = ENGINE
  return r * Math.cos(t) + Math.sqrt(l * l - (r * Math.sin(t)) ** 2)
}
/** 连杆偏离竖直的角度（弧度），曲柄销在右边时连杆往右斜 */
export const rodAngle = (a: number) => Math.asin(ENGINE.r * Math.sin(a * Math.PI / 180) / ENGINE.l)
/** 活塞离最高处多远（0 在上止点，1 在下止点） */
export const travel = (a: number) => (pistonY(0) - pistonY(a)) / (2 * ENGINE.r)
/** 气门开度（0–1）：进气门在吸气冲程、排气门在排气冲程开，两头留一小段渐开渐关 */
export function valves(a: number) {
  const x = ((a % 720) + 720) % 720, bump = (from: number, to: number) => x <= from || x >= to ? 0 : Math.sin((x - from) / (to - from) * Math.PI) ** 0.8
  return { intake: bump(-6 + 6, 186), exhaust: bump(534, 720) }
}
/** 缸内气体有多“热”（0–1，画面颜色用）：压缩时随着被压缩越来越热；做功开始最热，往下慢慢变冷；排气时是废气 */
export function gasHeat(a: number) {
  const x = ((a % 720) + 720) % 720
  if (x < 180) return 0
  if (x < 360) return 0.35 * (1 - travel(x)) ** 2
  if (x < 540) return 1 - 0.6 * travel(x)
  return 0.35
}
/** 做功冲程里火焰烧开了多大（0 刚点火，1 烧满整个燃烧室） */
export const flameFront = (a: number) => { const x = ((a % 720) + 720) % 720; return x < 360 || x >= 540 ? 0 : clamp01((x - 360) / 40) }
/** 这个冲程里能量怎样转化 */
export const ENERGY: Record<Stroke, string> = { 吸气: '吸进汽油和空气的混合物', 压缩: '机械能转化为内能', 做功: '内能转化为机械能', 排气: '排出废气' }
/** 各冲程的气门和活塞 */
export const STROKE_INFO: Record<Stroke, { intake: string; exhaust: string; piston: string }> = {
  吸气: { intake: '打开', exhaust: '关闭', piston: '向下' },
  压缩: { intake: '关闭', exhaust: '关闭', piston: '向上' },
  做功: { intake: '关闭', exhaust: '关闭', piston: '向下' },
  排气: { intake: '关闭', exhaust: '打开', piston: '向上' },
}
/** 曲轴转了 a 度时转过几圈、做功几次 */
export const cycles = (a: number) => ({ turns: Math.floor(a / 360 + 1e-6), works: a < 540 - 1e-6 ? 0 : Math.floor((a - 540) / 720 + 1e-6) + 1 })

// ---------- 第 7 课 热值和热机效率 ----------
export const RUN = { fuel: 0.1, work: 1.15e6, sec: 8 }
/** 能量去向（示意，占燃料放出的热的比例） */
export const FLOW = [
  { key: 'exhaust', name: '废气带走', share: 0.35, color: '#9aa3ab' },
  { key: 'cool', name: '冷却液带走', share: 0.3, color: '#5aa9e6' },
  { key: 'loss', name: '摩擦和其他', share: 0.1, color: '#c9a15a' },
  { key: 'work', name: '有用功', share: 0.25, color: '#35c7b3' },
] as const
export const efficiency = (W: number, Q: number) => W / Q
/** 燃料秤上还剩多少汽油（kg） */
export const fuelLeft = (t: number) => RUN.fuel * (1 - clamp01(t / RUN.sec))

// ---------- 拓展 四缸机 ----------
/** 直列四缸机的点火顺序 1-3-4-2：各缸的曲轴转角比 1 缸落后多少度 */
export const ORDER = [1, 3, 4, 2] as const
export const PHASE: Record<number, number> = { 1: 0, 3: 180, 4: 360, 2: 540 }
/** 曲轴转角 a 时第 n 缸的“自己的”转角（0 是它的吸气开始） */
export const cylAngle = (a: number, n: number) => a - PHASE[n]
/** 现在是哪一缸在做功 */
export const working = (a: number) => [1, 2, 3, 4].find(n => strokeOf(cylAngle(a, n)) === '做功')!
export const EFF = { petrol: [20, 30], diesel: [30, 45] } as const
/** 液体在半径 r（m）的圆筒形杯里有多深（m） */
export const depthIn = (s: Stuff, r: number) => volumeOf(s) / (Math.PI * r * r)
