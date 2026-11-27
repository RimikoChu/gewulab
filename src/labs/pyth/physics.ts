// 勾股定理实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 场景单位 1 = 1 m。取值约定写在规格卡 docs/specs/pyth.md 里：开不尽的平方根写成最简根式，近似值保留两位小数。

export const round = (x: number, d = 2) => { const k = 10 ** d; return Math.round(x * k + Math.sign(x) * 1e-9) / k }
export const sq = (x: number) => x * x
/** 斜边：√(a² + b²) */
export const hyp = (a: number, b: number) => Math.sqrt(a * a + b * b)
/** 已知斜边 c 和一条直角边 a，求另一条直角边：√(c² − a²) */
export const leg = (c: number, a: number) => Math.sqrt(c * c - a * a)

/** 最简根式：n = k² × m，返回 k、m（m 里不再含平方因数）。只对正整数用 */
export function radical(n: number) {
  let k = 1, m = n
  for (let f = 2; f * f <= m; f++) while (m % (f * f) === 0) { m /= f * f; k *= f }
  return { k, m }
}
/** 把“边长的平方”写成边长：完全平方数写整数；否则写最简根式加近似值，如 “√13 ≈ 3.61”“2√2 ≈ 2.83” */
export function fmtLen(n2: number, unit = '') {
  const u = unit ? ` ${unit}` : ''
  if (Number.isInteger(n2)) {
    const { k, m } = radical(n2)
    if (m === 1) return `${k}${u}`
    return `${k === 1 ? '' : k}√${m} ≈ ${round(Math.sqrt(n2)).toFixed(2)}${u}`
  }
  return `√${n2} ≈ ${round(Math.sqrt(n2)).toFixed(2)}${u}`
}
/** 只写根式，不写近似值（√13、2√2、5） */
export function rootOf(n2: number) {
  const { k, m } = radical(n2)
  return m === 1 ? `${k}` : `${k === 1 ? '' : k}√${m}`
}
/** 近似值，两位小数 */
export const approx = (x: number) => round(x).toFixed(2)

// ---------- 第 1 课：方砖上的发现（单位：块砖） ----------
export const TILE = 0.5   // 每块方砖边长 0.5 m
export const TRI1 = { iso: { a: 2, b: 2, name: '2 和 2' }, t34: { a: 3, b: 4, name: '3 和 4' }, t23: { a: 2, b: 3, name: '2 和 3' } } as const
export type Tri1 = keyof typeof TRI1
/** 斜边上的正方形是斜的：在外面套一个边长 a + b 的大正方形，减去四个角上的直角三角形 */
export function cutCount(a: number, b: number) {
  const outer = sq(a + b), corner = a * b / 2, c2 = outer - 4 * corner
  return { outer, corner, corners: 4 * corner, c2 }
}
/** 第 1 课一行数据：两直角边上的正方形、斜边上的正方形 */
export const row1 = (k: Tri1) => { const { a, b } = TRI1[k]; return { a, b, A: sq(a), B: sq(b), C: cutCount(a, b).c2 } }

// ---------- 第 2 课：拼图证明（单位：dm） ----------
export const FRAME = 7    // 木框内边 7 dm 见方
export const SETS2 = { t34: { a: 3, b: 4, name: '3 dm × 4 dm' }, t25: { a: 2, b: 5, name: '2 dm × 5 dm' } } as const
export type Set2 = keyof typeof SETS2
/** 一块三角板放在哪：直角顶点 (x, y)、转角 θ（弧度）。三角板自己的样子：直角在原点，长 a 的直角边朝 +x，长 b 的朝 +y */
export interface Pose { x: number; y: number; th: number }
/**
 * 两种摆法。第一种：四个直角各占木框一角，中间空出斜着的正方形（边长 c）。
 * 第二种：第二块不动，另外三块只平移不转，空出边长 a 和 b 的两个正方形。
 */
export function puzzle(a: number, b: number, arr: 1 | 2): Pose[] {
  const s = a + b, R = Math.PI / 2
  return arr === 1
    ? [{ x: 0, y: 0, th: 0 }, { x: s, y: 0, th: R }, { x: s, y: s, th: 2 * R }, { x: 0, y: s, th: 3 * R }]
    : [{ x: 0, y: a, th: 0 }, { x: s, y: 0, th: R }, { x: a, y: s, th: 2 * R }, { x: a, y: a, th: 3 * R }]
}
/** 木框里空出来的面积：木框面积减去四块三角板 */
export function holes(a: number, b: number) {
  const frame = sq(a + b), tris = 4 * a * b / 2
  return { frame, tris, left: frame - tris, a2: sq(a), b2: sq(b), c2: sq(a) + sq(b) }
}
/** 三角板的三个顶点（摆好以后，在木框的坐标里） */
export function corners(a: number, b: number, p: Pose): [number, number][] {
  const c = Math.cos(p.th), s = Math.sin(p.th)
  return ([[0, 0], [a, 0], [0, b]] as [number, number][]).map(([u, v]) => [p.x + u * c - v * s, p.y + u * s + v * c])
}

// ---------- 第 3 课：赵爽弦图（单位：dm） ----------
export const ZHAO = { a: 3, b: 4 }
/**
 * 弦图：边长 c 的大正方形里四块直角三角形（朱实）围着一块边长 b − a 的小正方形（黄实）。
 * 坐标取“两个正方形并排”那种摆法：b² 在 [0, b]²，a² 在 [b, a + b] × [0, a]；大正方形的四个顶点是 (a, 0)、(a + b, a)、(b, a + b)、(0, b)。
 * 出入相补：第 1、2 块在大正方形外面，各绕一个顶点转 90° 进到两个正方形里，另两块和小正方形不动。
 */
export function zhao(a: number, b: number) {
  const R = Math.PI / 2
  const tri = a * b / 2, inner = sq(b - a)
  return {
    tri, inner, big: 4 * tri + inner, a2: sq(a), b2: sq(b),
    /** 弦图里四块的位置 */
    xian: [{ x: b, y: b, th: R }, { x: b, y: a, th: 0 }, { x: a, y: a, th: 3 * R }, { x: a, y: b, th: 2 * R }] as Pose[],
    /** 转过去以后：第 1 块绕 (0, b) 转 −90°，第 2 块绕 (a + b, a) 转 +90° */
    moved: [{ x: 0, y: 0, th: 0 }, { x: a + b, y: 0, th: R }, { x: a, y: a, th: 3 * R }, { x: a, y: b, th: 2 * R }] as Pose[],
    pivots: [[0, b], [a + b, a]] as [number, number][],
    turn: [-R, R],
    innerAt: [a, a] as [number, number],
    bigCorners: [[a, 0], [a + b, a], [b, a + b], [0, b]] as [number, number][],
  }
}

// ---------- 第 4 课：木板过门框（单位：m） ----------
export const DOOR = { w: 1, h: 2 }
export const BOARD = { len: 3, wid: 2.2 }
export const DIAG2 = sq(DOOR.w) + sq(DOOR.h)   // 对角线的平方 = 5
export const diag = () => Math.sqrt(DIAG2)
export const HOLD = { across: '横着', upright: '竖着', slant: '斜着' } as const
export type Hold = keyof typeof HOLD
/** 木板这样拿，宽边要对着门框的哪一段；那一段够不够宽 */
export function boardPass(h: Hold) {
  const room = h === 'across' ? DOOR.w : h === 'upright' ? DOOR.h : diag()
  return { room, fits: room >= BOARD.wid, what: h === 'across' ? '门框的宽' : h === 'upright' ? '门框的高' : '门框的对角线' }
}

// ---------- 第 5 课：梯子滑下来（单位：m） ----------
export const LADDER = { L: 3, top: 2.5, drop: 0.5 }
/** 梯子顶端离地 h 时，梯脚到墙的距离 */
export const ladderFoot = (h: number) => leg(LADDER.L, h)
export function ladder() {
  const h0 = LADDER.top, h1 = LADDER.top - LADDER.drop
  const x0 = ladderFoot(h0), x1 = ladderFoot(h1)
  return { h0, h1, x0, x1, x0sq: sq(LADDER.L) - sq(h0), x1sq: sq(LADDER.L) - sq(h1), move: x1 - x0 }
}

// ---------- 第 6 课：在数轴上画出无理数（单位：m） ----------
export const ROOTS = { r2: { p: 1, q: 1 }, r5: { p: 2, q: 1 }, r13: { p: 2, q: 3 } } as const
export type RootKey = keyof typeof ROOTS
/** 在数轴上 p 处立一根长 q 的垂线，以原点为圆心、斜边为半径画弧：交点 */
export const numberLine = (k: RootKey) => { const { p, q } = ROOTS[k]; const n2 = sq(p) + sq(q); return { p, q, n2, x: Math.sqrt(n2), name: rootOf(n2) } }

// ---------- 第 7 课：结绳定直角 ----------
export const KNOT = 0.5   // 每段 0.5 m，13 个结、12 段
export const ROPES = { t345: [3, 4, 5], t444: [4, 4, 4], t255: [2, 5, 5] } as const
export type RopeKey = keyof typeof ROPES
/** 三段绳子拉成的三角形：最长边 c 对着的角最大。是不是直角，看 a² + b² 和 c² */
export function ropeTri(k: RopeKey) {
  const [a, b, c] = [...ROPES[k]].sort((x, y) => x - y)
  const lhs = sq(a) + sq(b), rhs = sq(c)
  const deg = Math.acos((sq(a) + sq(b) - sq(c)) / (2 * a * b)) * 180 / Math.PI   // 余弦定理：只用来画图、摆角尺
  return { a, b, c, lhs, rhs, right: lhs === rhs, deg, cmp: lhs === rhs ? '=' : lhs > rhs ? '>' : '<' }
}
/** 三根木桩的位置（m）：最长边放在地上，从 A 到 B；第三个桩 C 在上方 */
export function ropeStakes(k: RopeKey): [number, number][] {
  const { a, b, c } = ropeTri(k)
  const A = c * KNOT, la = b * KNOT, lb = a * KNOT          // 最长边 AB；AC = b 段，BC = a 段
  const x = (sq(la) - sq(lb) + sq(A)) / (2 * A), y = Math.sqrt(Math.max(0, sq(la) - sq(x)))
  return [[0, 0], [A, 0], [x, y]]
}

// ---------- 拓展：三道古题 ----------
/** x² + d² = (x + k)²  ⇒  x = (d² − k²) ÷ 2k */
export const solveEq = (d: number, k: number) => (sq(d) - sq(k)) / (2 * k)
export const CLASSIC = {
  bamboo: { name: '折断的竹子', H: 10, d: 3 },         // 尺
  reed: { name: '池中的芦苇', side: 10, above: 1 },    // 尺
  flag: { name: '旗杆的绳子', extra: 1, d: 5 },        // m
} as const
export type ClassicKey = keyof typeof CLASSIC
/** 竹子：折断处离地 x，上面那截长 10 − x，竹梢离竹根 3 尺：x² + 3² = (10 − x)² */
export function bamboo() { const { H, d } = CLASSIC.bamboo; const x = (sq(H) - sq(d)) / (2 * H); return { x, top: H - x, d, H } }
/** 芦苇：水深 x，芦苇长 x + 1，拉到岸边中点水平走了半边 5 尺 */
export function reed() { const { side, above } = CLASSIC.reed; const half = side / 2, x = solveEq(half, above); return { depth: x, len: x + above, half, above } }
/** 旗杆：高 x，绳长 x + 1，拉直后离底部 5 m */
export function flag() { const { extra, d } = CLASSIC.flag; const x = solveEq(d, extra); return { h: x, rope: x + extra, d, extra } }
