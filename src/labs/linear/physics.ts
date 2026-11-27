// 一次函数实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/linear.md 里：车速 100 km/h；轿车满箱 50 L、百千米 8 L；汽油 7.50 元/L；货车满箱 300 L、百千米 30 L。

/** 保留 n 位小数后再比较，免得 0.1 + 0.2 这类浮点误差出现在界面上 */
export const round = (v: number, n = 6) => { const p = 10 ** n; return Math.round(v * p) / p }

// ---------- 第 1 课：谁在变 ----------
export const SPEED = 100          // km/h
export const TANK = 50            // L，轿车满箱
export const RATE = 0.08          // L/km，轿车每百千米 8 L
/** 匀速行驶 t 小时：里程、油量、速度 */
export const drive = (t: number) => { const s = SPEED * t; return { t, s, fuel: round(TANK - RATE * s), v: SPEED } }
export const QTY = { t: '行驶时间', s: '里程', fuel: '油量', v: '速度' } as const
export type QtyKey = keyof typeof QTY
/** 从 t1 开到 t2，这个量变没变 */
export const changed = (q: QtyKey, t1: number, t2: number) => drive(t1)[q] !== drive(t2)[q]

// ---------- 第 2 课：一个对一个 ----------
export const PRICE = 7.5          // 元/L
/** 加 x 升油要付的钱（元） */
export const cost = (x: number) => round(PRICE * x, 2)

// ---------- 第 3 课：列表、描点、连线 ----------
/** 开了 x 千米，油箱里还剩多少油（L） */
export const fuelLeft = (x: number) => round(TANK - RATE * x)
export const TRIP_XS = [0, 100, 200, 300, 400, 500]
export const READ_X = 250

// ---------- 第 4、5 课：正比例函数、一次函数 ----------
export const lin = (k: number, b: number, x: number) => round(k * x + b)
export const prop = (k: number, x: number) => lin(k, 0, x)
/** k 定增减：上升、下降、水平 */
export const trend = (k: number) => k > 0 ? '上升' : k < 0 ? '下降' : '水平'
/** 经过哪几个象限（不算坐标轴上的点） */
export function quadrants(k: number, b: number) {
  const q = new Set<number>()
  for (let x = -50; x <= 50; x += 0.25) { const y = lin(k, b, x); if (x === 0 || y === 0) continue; q.add(x > 0 ? (y > 0 ? 1 : 4) : (y > 0 ? 2 : 3)) }
  return [...q].sort()
}
/** 两条直线平行：k 相同、b 不同 */
export const parallel = (k1: number, b1: number, k2: number, b2: number) => k1 === k2 && b1 !== b2
/** 直线和 y 轴的交点 */
export const yCross = (k: number, b: number): [number, number] => [0, lin(k, b, 0)]
/** 直线和 x 轴的交点（k 为 0 时没有） */
export const xCross = (k: number, b: number): [number, number] | null => k === 0 ? null : [round(-b / k), 0]

/** 直线 y = kx + b 在画框 xr × yr 里的两个端点；整条都在框外时返回 null */
export function clip(k: number, b: number, xr: [number, number], yr: [number, number]): [[number, number], [number, number]] | null {
  let x0 = xr[0], x1 = xr[1]
  if (Math.abs(k) > 1e-9) {
    const a = (yr[0] - b) / k, c = (yr[1] - b) / k
    x0 = Math.max(x0, Math.min(a, c)); x1 = Math.min(x1, Math.max(a, c))
  } else if (b < yr[0] || b > yr[1]) return null
  if (x1 - x0 < 1e-9) return null
  return [[x0, k * x0 + b], [x1, k * x1 + b]]
}

// ---------- 第 6 课：两组读数定直线 ----------
export const TRUCK_TANK = 300     // L
export const TRUCK_RATE = 0.3     // L/km，每百千米 30 L
export const truckFuel = (x: number) => round(TRUCK_TANK - TRUCK_RATE * x)
export const POSTS6 = [100, 300]
export const STATION = 800        // 前方加油站的里程
/** 待定系数法：过两点的直线 y = kx + b */
export function solve2(p: [number, number], q: [number, number]) {
  const k = round((q[1] - p[1]) / (q[0] - p[0])), b = round(p[1] - k * p[0])
  return { k, b }
}

// ---------- 第 7 课：选哪种运费 ----------
export const PLAN = { a: { name: '甲', k: 5, b: 200 }, b: { name: '乙', k: 7, b: 0 } } as const
export const planA = (x: number) => lin(PLAN.a.k, PLAN.a.b, x)
export const planB = (x: number) => lin(PLAN.b.k, PLAN.b.b, x)
/** 两条直线的交点：解 k1·x + b1 = k2·x + b2 */
export function meet(k1: number, b1: number, k2: number, b2: number): [number, number] | null {
  if (k1 === k2) return null
  const x = round((b2 - b1) / (k1 - k2)); return [x, lin(k1, b1, x)]
}
/** 运 x 千米哪家便宜：'a'、'b' 或一样 'same' */
export const cheaper = (x: number) => { const a = planA(x), b = planB(x); return a < b ? 'a' : a > b ? 'b' : 'same' }
export const DISTS = [60, 100, 200] as const

// ---------- 拓展：出租车、温度 ----------
export const TAXI = { start: 10, within: 3, per: 2 }
/** 出租车打表：3 km 以内 10 元，超过的每千米 2 元 */
export const taxi = (x: number) => x <= TAXI.within ? TAXI.start : round(TAXI.start + TAXI.per * (x - TAXI.within))
export const TAXI_TRIP = 8
/** 摄氏度换华氏度 */
export const toF = (c: number) => round(1.8 * c + 32)
export const TEMPS = [0, 20, -10]

/** 解析式的写法：y = 2x + 2、y = −x − 3、y = 0.5x */
export function formula(k: number, b: number, x = 'x', y = 'y') {
  const kk = k === 1 ? '' : k === -1 ? '−' : String(k).replace('-', '−')
  const head = k === 0 ? '' : `${kk}${x}`
  const tail = b === 0 ? (k === 0 ? '0' : '') : `${head ? (b > 0 ? ' + ' : ' − ') : (b < 0 ? '−' : '')}${Math.abs(b)}`
  return `${y} = ${head}${tail}`
}
