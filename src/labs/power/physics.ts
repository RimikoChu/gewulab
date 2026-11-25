// 电功率和生活用电实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 物理量一律用国际单位（电能另给 kW·h）；取值约定写在规格卡 docs/specs/power.md 里。

/** 家庭电路的电压（V） */
export const U_HOME = 220
/** 1 kW·h 合多少焦耳 */
export const J_PER_KWH = 3.6e6
export const kwhToJ = (kwh: number) => kwh * J_PER_KWH
/** 保留 n 位小数 */
export const round = (x: number, n = 0) => { const k = 10 ** n; return Math.round(x * k + 1e-9) / k }

// ---------- 电能表 ----------
/** 电子式电能表的铭牌 */
export const METER = { u: 220, i: '10(40)', hz: 50, imp: 3200 }

// ---------- 第 1 课：一个月用了多少电 ----------
/** 一周七天每天的用电量（kW·h，设定值），按周循环 */
export const WEEK = [4.6, 4.9, 5.2, 4.8, 5.0, 6.3, 6.6]
export const DAYS = 30
export const R0 = 3268.4
/** 第 d 天结束时（d = 0 是月初）电能表的示数（kW·h）；d 可以是小数，一天里匀速走 */
export function meterAt(d: number) {
  const dd = Math.max(0, Math.min(DAYS, d)), whole = Math.floor(dd)
  let s = 0
  for (let i = 0; i < whole; i++) s += WEEK[i % 7]
  if (whole < DAYS) s += WEEK[whole % 7] * (dd - whole)
  return R0 + s
}
/** 液晶屏上的示数：读到 0.1 kW·h（往下取，表上的数不会多走） */
export const meterShow = (d: number) => Math.floor(meterAt(d) * 10 + 1e-6) / 10
export const R1 = () => meterShow(DAYS)
/** 一个月用的电（kW·h） */
export const monthKwh = () => round(R1() - R0, 1)

// ---------- 第 2 课：用电能表测功率 ----------
export const APPLIANCES = {
  kettle: { name: '电水壶', p: 1800 },
  cooker: { name: '电饭煲', p: 900 },
} as const
export type ApplianceKey = keyof typeof APPLIANCES
/** 功率 p（W）的用电器工作 t 秒，电能表闪几次 */
export const flashes = (p: number, t: number) => Math.floor(p * t * METER.imp / J_PER_KWH + 1e-9)
/** 闪了 n 次用掉的电能（kW·h） */
export const kwhOfFlashes = (n: number) => n / METER.imp
/** 由闪的次数和时间（s）算功率（W） */
export const powerFromFlashes = (n: number, t: number) => kwhOfFlashes(n) * J_PER_KWH / t
export const L2_T = 60

// ---------- 第 3 课：小灯泡的实际功率 ----------
export const BULB = { u: 2.5, i: 0.3 }
export const L3 = { us: 4.5, rMax: 20, targets: [2.5, 2.0, 3.0] }
/** 小灯泡的电流（示意模型：灯丝越热电阻越大，电流随电压增长得越来越慢） */
export const lampI = (u: number) => u <= 0 ? 0 : BULB.i * Math.pow(u / BULB.u, 0.55)
/** 变阻器接入 r 欧时，灯两端的电压和电流（二分法解 U + I(U)·r = 电源电压） */
export function lampAt(r: number) {
  let lo = 0, hi = L3.us
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (m + lampI(m) * r > L3.us) hi = m; else lo = m }
  const u = (lo + hi) / 2
  return { u, i: lampI(u) }
}
/** 要让灯两端是 u 伏，滑片该在哪（0–1，1 是阻值最大） */
export const pForLampU = (u: number) => Math.min(1, (L3.us - u) / lampI(u) / L3.rMax)
/** 电流表读数：0–0.6 A 量程，分度值 0.02 A */
export const readA02 = (i: number) => round(Math.round(i / 0.02 + 1e-9) * 0.02, 2)
/** 电压表读数：分度值 0.1 V */
export const readV = (u: number) => round(u, 1)
/** 电功率 P = UI */
export const powerUI = (u: number, i: number) => u * i
/** 灯的亮度（0–1 多一点）：按实际功率和额定功率之比 */
export const glow = (p: number) => Math.min(1.4, p / (BULB.u * BULB.i))

// ---------- 第 4 课：焦耳定律 ----------
export const JOULE = { r1: 5, r2: 10, m: 0.1, c: 2.1e3, t0: 20, step: 120, currents: [1.0, 2.0] }
/** 电流通过电阻 r 产生的热量（J）：Q = I²Rt */
export const heat = (i: number, r: number, t: number) => i * i * r * t
/** 煤油升高的温度（℃），不计热损失 */
export const rise = (i: number, r: number, t: number) => heat(i, r, t) / (JOULE.c * JOULE.m)

// ---------- 第 5 课：家庭电路的组成 ----------
/** 功率 p 的用电器在家庭电路里的电流（A） */
export const amps = (p: number) => p / U_HOME
export const L5 = { lamp: 36, tv: 150 }

// ---------- 第 6 课：安全用电 ----------
/** 插座三个孔对地的电压：左零右火上接地 */
export const HOLES = { left: { name: '零线', u: 0 }, right: { name: '火线', u: U_HOME } } as const
export type Hole = keyof typeof HOLES
/** 试电笔的氖管亮不亮：笔尖接触的线对地有电压，并且手接触着笔尾金属体，电流才能经过人体流到大地 */
export const penGlows = (hole: Hole, touchTail: boolean) => touchTail && HOLES[hole].u > 36

// ---------- 第 7 课：电流过大的原因 ----------
export const KITCHEN = { breaker: 16, items: [{ key: 'cooker', name: '电饭煲', p: 900 }, { key: 'kettle', name: '电水壶', p: 1800 }, { key: 'oven', name: '电烤箱', p: 2000 }] } as const
/** 插上前 n 个电器时的总功率（W） */
export const kitchenP = (n: number) => KITCHEN.items.slice(0, n).reduce((s, x) => s + x.p, 0)
/** 总电流超过额定电流就会跳闸（或熔断） */
export const breakerTrips = (i: number) => i > KITCHEN.breaker
/** 短路时导线回路的电阻（Ω，示意值）和短路电流 */
export const SHORT_R = 0.5
export const shortI = () => U_HOME / SHORT_R

// ---------- 拓展：配电房、一天的电 ----------
export const TRANSFORMER = { hv: 10, lv: 0.4, kva: 630 }
export const DAY = [
  { name: '冰箱', p: 0, h: 24, kwh: 0.9 },
  { name: '电热水器', p: 2000, h: 1 },
  { name: '电视', p: 120, h: 4 },
  { name: '电水壶', p: 1800, h: 0.25 },
  { name: '电饭煲', p: 900, h: 0.5 },
  { name: '灯', p: 60, h: 5 },
  { name: '洗衣机', p: 300, h: 1 },
] as { name: string; p: number; h: number; kwh?: number }[]
/** 一项电器一天用的电（kW·h）：W = Pt */
export const itemKwh = (k: number) => DAY[k].kwh ?? DAY[k].p * DAY[k].h / 1000
/** 前 n 项加起来 */
export const dayBill = (n = DAY.length) => round(DAY.slice(0, n).reduce((s, _, k) => s + itemKwh(k), 0), 2)
