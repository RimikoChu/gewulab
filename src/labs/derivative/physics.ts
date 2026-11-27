// 导数实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/derivative.md 里：第 1、2 课 m、s；山路 x 单位百米、y 单位 m；易拉罐 cm；拓展 km、min、km/h、L。

export type Fn = (x: number) => number

/** 平均变化率：f 从 a 到 b */
export const avgRate = (f: Fn, a: number, b: number) => (f(b) - f(a)) / (b - a)
/** 过 (x0, f(x0))、斜率 k 的直线：y = kx + b */
export const lineThrough = (x0: number, y0: number, k: number) => ({ k, b: y0 - k * x0 })
/** 切线 */
export const tangent = (f: Fn, df: Fn, x0: number) => lineThrough(x0, f(x0), df(x0))
/** 数字的写法：去掉多余的 0，负号用 − */
export const fmt = (v: number, d = 3) => { const r = Math.round(v * 10 ** d) / 10 ** d; return (Object.is(r, -0) ? 0 : r).toString().replace('-', '−') }
/** y = kx + b 的写法 */
export function lineText(k: number, b: number, x = 'x', y = 'y') {
  const kt = k === 1 ? '' : k === -1 ? '−' : fmt(k)
  const bt = Math.abs(b) < 1e-9 ? '' : b > 0 ? ` + ${fmt(b)}` : ` − ${fmt(-b)}`
  return `${y} = ${kt}${x}${bt}`
}

// ---------- 第 1、2 课：车从停车线起步，s = t²（m，t 单位 s） ----------
export const dist = (t: number) => t * t
export const speed = (t: number) => 2 * t
export const RUN = 8                                    // 第 1 课开 8 s
export const SPANS = { a: [0, 2], b: [2, 6], c: [6, 8] } as const
export type SpanKey = keyof typeof SPANS
export const spanSpeed = (k: SpanKey) => avgRate(dist, SPANS[k][0], SPANS[k][1])
/** 第 2 课：t0 = 2 s 时的差商 */
export const T0 = 2
export const quotient = (t0: number, dt: number) => (dist(t0 + dt) - dist(t0)) / dt
export const DTS = [1, 0.1, 0.01, 0.001]
export const kmh = (ms: number) => ms * 3.6

// ---------- 山路的纵断面：y = f(x)，x 单位百米，y 单位 m（比谷底高多少） ----------
export const ROAD_X: [number, number] = [0, 6]
export const road = (x: number) => 0.5 * x ** 3 - 4.5 * x * x + 7.5 * x + 12.5
/** f′(x)：每走 100 m 升高几米，就是坡度的百分数 */
export const slope = (x: number) => 1.5 * x * x - 9 * x + 7.5
export const ROAD_TEXT = 'f(x) = 0.5x³ − 4.5x² + 7.5x + 12.5'
export const SLOPE_TEXT = 'f′(x) = 1.5x² − 9x + 7.5'
/** f′(x) = 0 的两个根（求根公式） */
export function rootsOfSlope(): [number, number] {
  const a = 1.5, b = -9, c = 7.5, d = Math.sqrt(b * b - 4 * a * c)
  return [(-b - d) / (2 * a), (-b + d) / (2 * a)]
}

// 第 3 课：P 在 x = 3，Q 从 x = 5 逼近
export const P3 = 3, Q3 = 5
export const DXS = [2, 1, 0.5, 0.1]
export const secant3 = (dx: number) => avgRate(road, P3, P3 + dx)

// 第 5 课：递增、递减区间
export function monotone() {
  const [r1, r2] = rootsOfSlope()
  return { up: [[ROAD_X[0], r1], [r2, ROAD_X[1]]] as [number, number][], down: [[r1, r2]] as [number, number][] }
}

// 第 6 课：极值和闭区间上的最值
export type Kind = 'max' | 'min' | 'none'
/** x0 附近左右各取 h，看 f′ 的符号怎么变 */
export function classify(x0: number, h = 0.5): { left: number; right: number; kind: Kind } {
  const left = slope(x0 - h), right = slope(x0 + h)
  return { left, right, kind: left > 0 && right < 0 ? 'max' : left < 0 && right > 0 ? 'min' : 'none' }
}
/** 闭区间 [a, b] 上的最大值、最小值：比较区间里的极值点和两个端点 */
export function extremaOn(a: number, b: number) {
  const cand = [a, ...rootsOfSlope().filter(r => r > a && r < b), b].map(x => ({ x, y: road(x) }))
  const max = cand.reduce((p, q) => (q.y > p.y ? q : p)), min = cand.reduce((p, q) => (q.y < p.y ? q : p))
  return { cand, max, min }
}
export const RANGE6: [number, number] = [2, 6]

// ---------- 第 4 课：基本初等函数的导数 ----------
export type FnKey = 'pow' | 'sin' | 'exp' | 'ln' | 'sin2'
export interface FnCase { name: string; f: Fn; df: Fn; dText: string; fText: string; xr: [number, number]; yr: [number, number]; dyr: [number, number]; at: number; xStep: number; yStep: number; dyStep: number }
export const FUNCS: Record<FnKey, FnCase> = {
  pow: { name: 'x³', fText: 'f(x) = x³', dText: 'f′(x) = 3x²', f: x => x ** 3, df: x => 3 * x * x, xr: [-2, 2], yr: [-8, 8], dyr: [-2, 12], at: 2, xStep: 1, yStep: 4, dyStep: 4 },
  sin: { name: 'sin x', fText: 'f(x) = sin x', dText: 'f′(x) = cos x', f: Math.sin, df: Math.cos, xr: [-6.5, 6.5], yr: [-1.5, 1.5], dyr: [-1.5, 1.5], at: 0, xStep: 1, yStep: 1, dyStep: 1 },
  exp: { name: 'eˣ', fText: 'f(x) = eˣ', dText: 'f′(x) = eˣ', f: Math.exp, df: Math.exp, xr: [-3, 2.1], yr: [-1, 8], dyr: [-1, 8], at: 1, xStep: 1, yStep: 2, dyStep: 2 },
  ln: { name: 'ln x', fText: 'f(x) = ln x', dText: 'f′(x) = 1/x', f: Math.log, df: x => 1 / x, xr: [0.12, 6], yr: [-2.5, 2], dyr: [-0.5, 4], at: 2, xStep: 1, yStep: 1, dyStep: 1 },
  sin2: { name: 'sin 2x', fText: 'f(x) = sin 2x', dText: 'f′(x) = 2cos 2x', f: x => Math.sin(2 * x), df: x => 2 * Math.cos(2 * x), xr: [-3.3, 3.3], yr: [-1.5, 1.5], dyr: [-2.5, 2.5], at: 0, xStep: 1, yStep: 1, dyStep: 1 },
}
export const FN_KEYS = Object.keys(FUNCS) as FnKey[]
/** 用差商近似切线斜率（Δx 很小）：描导函数时屏上画的是它，和公式对照 */
export const numSlope = (f: Fn, x: number, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h)

// ---------- 第 7 课：易拉罐（看成圆柱），容积 330 cm³ ----------
export const CAN_V = 330
export const canHeight = (r: number) => CAN_V / (Math.PI * r * r)
/** 表面积 S(r) = 2πr² + 2V/r（cm²） */
export const canArea = (r: number) => 2 * Math.PI * r * r + (2 * CAN_V) / r
export const canAreaD = (r: number) => 4 * Math.PI * r - (2 * CAN_V) / (r * r)
/** S′(r) = 0：r³ = V/(2π) */
export const canBest = () => { const r = Math.cbrt(CAN_V / (2 * Math.PI)); return { r, h: canHeight(r), s: canArea(r) } }
export const RADII = [3, 5]

// ---------- 拓展：区间测速、最省油的车速 ----------
export const ZONE = { km: 20, min: 12, limit: 80 }
/** 一辆车进入测速区间后的路程（km，t 单位 min），示意 */
export const trip = (t: number) => (4 / 3) * t + (t * t) / 12 - t ** 3 / 216
/** 速度（km/h） */
export const tripSpeed = (t: number) => ((4 / 3) + t / 6 - (t * t) / 72) * 60
export const zoneAvg = () => (ZONE.km / ZONE.min) * 60
/** 瞬时速度正好等于平均速度的两个时刻：t² − 12t + 24 = 0 */
export const mvtTimes = (): [number, number] => [6 - 2 * Math.sqrt(3), 6 + 2 * Math.sqrt(3)]
/** 每小时耗油（L），v 单位 km/h（0 < v ≤ 120），示意模型 */
export const fuelPerHour = (v: number) => v ** 3 / 128000 - (3 * v) / 80 + 8
/** 走 100 km 的耗油 Q(v) = (100 / v)·y(v) */
export const fuel = (v: number) => (100 / v) * fuelPerHour(v)
export const fuelD = (v: number) => v / 640 - 800 / (v * v)
export const fuelBest = () => { const v = Math.cbrt(512000); return { v, q: fuel(v) } }
