// 二次函数实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 长度 m、面积 m²、时间 s；场景单位 1 = 1 m。取值约定写在规格卡 docs/specs/quadratic.md 里。
export const G = 9.8 // N/kg，水柱和球按斜抛算

// ---------- 通用 ----------
/** 一般式 y = ax² + bx + c */
export const quad = (a: number, b: number, c: number, x: number) => a * x * x + b * x + c
/** 顶点式 y = a(x − h)² + k */
export const vform = (a: number, h: number, k: number, x: number) => a * (x - h) ** 2 + k
/** 一般式的顶点 (−b/2a, (4ac − b²)/4a) */
export const vertexOf = (a: number, b: number, c: number): [number, number] => [-b / (2 * a), (4 * a * c - b * b) / (4 * a)]
/** 判别式 Δ = b² − 4ac */
export const disc = (a: number, b: number, c: number) => b * b - 4 * a * c
/** ax² + bx + c = 0 的实数根，从小到大；Δ = 0 只给一个 */
export function roots(a: number, b: number, c: number): number[] {
  const d = disc(a, b, c)
  if (Math.abs(d) < 1e-9) return [-b / (2 * a)]
  if (d < 0) return []
  const s = Math.sqrt(d), r = [(-b - s) / (2 * a), (-b + s) / (2 * a)]
  return r.map(v => v + 0).sort((p, q) => p - q)   // + 0：把 −0 变成 0
}
/** 一个数写成界面上的样子：最多两位小数，负号用 − */
export const fmt = (v: number, d = 2) => { const s = String(Math.round(v * 10 ** d) / 10 ** d); return s.replace('-', '−') }
/** 系数写进式子：a = 1 不写 1，a = −1 只写负号 */
export const coef = (v: number) => (v === 1 ? '' : v === -1 ? '−' : fmt(v))
/** 顶点式写成文字：y = −(x − 2)² + 1 */
export function vformText(a: number, h: number, k: number) {
  const sq = h === 0 ? 'x²' : `(x ${h > 0 ? '−' : '+'} ${fmt(Math.abs(h))})²`
  const tail = k === 0 ? '' : ` ${k > 0 ? '+' : '−'} ${fmt(Math.abs(k))}`
  return `y = ${coef(a)}${sq}${tail}`
}

// ---------- 第 1 课：圆形花坛 ----------
export const RADII = [1, 2, 3] as const
/** 圆的面积 S = πr²（m²） */
export const circleArea = (r: number) => Math.PI * r * r

// ---------- 第 2、3 课：喷泉的水柱 ----------
/** 第 2 课：水柱最高点（原点）离水面多高（m） */
export const JET_TOP = 3
export const A2 = [-0.5, -1, -2, 1] as const
/** 水柱 y = a(x − h)² + k 碰到高度为 floor 的水面的两个 x；碰不到给 null */
export function landX(a: number, h: number, k: number, floor: number): [number, number] | null {
  const r = roots(a, -2 * a * h, a * h * h + k - floor)
  return r.length === 2 ? [r[0], r[1]] : null
}
/** 水柱的水平速度（m/s）：y = a(x − h)² + k 的斜抛，a = −g ÷ (2v²) */
export const jetSpeed = (a: number) => Math.sqrt(G / (-2 * a))
/** 第 3 课的三步：上移 1、右移 2、换 a = −2 */
export const SHIFT = { up: 1, right: 2 } as const
/** 第 3 课：喷头在水面上，水面在 y = −3 */
export const FLOOR3 = -3

// ---------- 第 4 课：投篮 ----------
/** 投篮机出球后的轨迹 y = −0.2x² + x + 2.25（原点在出手点正下方的地面） */
export const SHOT = { a: -0.2, b: 1, c: 2.25 } as const
export const HOOP = { x: 4, y: 3.05 } as const   // 篮圈中心：离出手处水平 4 m、离地 3.05 m
/** 球的水平速度（m/s） */
export const shotSpeed = () => jetSpeed(SHOT.a)
/** 配方的几行：一般式 → 提出 a → 加上再减去 → 顶点式 */
export function complete(a: number, b: number, c: number) {
  const p = b / a, half = p / 2, sq = half * half, [h, k] = vertexOf(a, b, c)
  const inner = (s: string) => `${fmt(a)}(${s})`
  const pTxt = `x² ${p < 0 ? '−' : '+'} ${fmt(Math.abs(p))}x`
  return [
    `y = ${coef(a)}x² + ${coef(b)}x + ${fmt(c)}`,
    `y = ${inner(pTxt)} + ${fmt(c)}`,
    `y = ${inner(`${pTxt} + ${fmt(sq)} − ${fmt(sq)}`)} + ${fmt(c)}`,
    `y = ${fmt(a)}(x ${h > 0 ? '−' : '+'} ${fmt(Math.abs(h))})² + ${fmt(k)}`,
  ]
}

// ---------- 第 5 课：江心高喷 ----------
/** 水滴的高度 h = 20t − 5t²（m） */
export const HIGH = { v: 20, half: 5 } as const
export const heightAt = (t: number) => HIGH.v * t - HIGH.half * t * t
export const LEVELS = [15, 20, 25, 0] as const
/** 水滴到 m 米高的时刻：解 −5t² + 20t − m = 0 */
export const timesAt = (m: number) => roots(-HIGH.half, HIGH.v, -m)
export const discAt = (m: number) => disc(-HIGH.half, HIGH.v, -m)

// ---------- 第 6 课：拱桥 ----------
export const ARCH = { width: 12, rise: 4 } as const          // 常水位时水面宽 12 m，拱顶离水面 4 m
/** 拱 y = ax²（原点在拱顶）的 a */
export const archA = (width: number, rise: number) => -rise / (width / 2) ** 2
/** 水面在拱顶下 depth 米时的水面宽 */
export const waterWidth = (a: number, depth: number) => 2 * Math.sqrt(depth / -a)
export const WATER = { normal: 0, low: -1, flood: 1 } as const   // 相对常水位涨落了多少米
export type WaterKey = keyof typeof WATER
/** 水面在拱顶下多深 */
export const depthOf = (w: WaterKey) => ARCH.rise - WATER[w]
export const BOAT = { w: 6, h: 2.5 } as const                 // 游船宽 6 m、露出水面 2.5 m
/** 船靠中间走时，船边上方离桥拱还有多高 */
export const clearance = (w: WaterKey) => { const a = archA(ARCH.width, ARCH.rise); return depthOf(w) + a * (BOAT.w / 2) ** 2 }
export const canPass = (w: WaterKey) => clearance(w) >= BOAT.h

// ---------- 第 7 课：花圃 ----------
export const FENCE = 20                                       // 栅栏总长（m），一面靠墙
export const SIDES = [3, 5, 7] as const
/** 垂直于墙的边长 x 时的面积 S = x(20 − 2x) */
export const fenceArea = (x: number, L = FENCE) => x * (L - 2 * x)

// ---------- 拓展 ----------
export const RENT = { cost: 20, base: 40, n0: 60, drop: 2 } as const   // 成本 20 元；40 元时租 60 船次；每涨 1 元少 2 船次
export const rented = (p: number) => RENT.n0 - RENT.drop * (p - RENT.base)
export const profit = (p: number) => (p - RENT.cost) * rented(p)
export const PRICES = [40, 45, 50] as const
/** 过三个点的抛物线 y = ax² + bx + c */
export function fit3(p: [number, number][]): [number, number, number] {
  const [[x1, y1], [x2, y2], [x3, y3]] = p
  const d = (x1 - x2) * (x1 - x3) * (x2 - x3)
  const a = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / d
  const b = (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) / d
  const c = y1 - a * x1 * x1 - b * x1
  return [a, b, c]
}
export const THREE_PTS: [number, number][] = [[0, 0], [1, 1.5], [2, 2]]
