// 图形的变换实验室的计算核心：平移、轴对称、旋转三种变换，以及量距离、量角、判断平行和重合。
// 画面、读数、任务判定都从这里取数，界面文件里不做计算。图形都画在一张平面上，坐标 (u, v) 以“格”为单位，u 朝右、v 朝上；
// 每课一格多长写在各自的常数里。长度读数一律换成 cm、保留一位小数；角度取整数度。取值约定见规格卡 docs/specs/transform.md。

export type P = [number, number]

// ---------- 三种变换 ----------
/** 平移：每个点加上同一个向量 */
export const translate = (p: P, v: P): P => [p[0] + v[0], p[1] + v[1]]
/** 关于竖直的对称轴 u = u0 作轴对称 */
export const reflectU = (p: P, u0: number): P => [2 * u0 - p[0], p[1]]
/** 绕点 o 逆时针旋转 deg 度 */
export function rotate(p: P, o: P, deg: number): P {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), x = p[0] - o[0], y = p[1] - o[1]
  return [o[0] + x * c - y * s, o[1] + x * s + y * c]
}

// ---------- 量一量 ----------
export const dist = (a: P, b: P) => Math.hypot(b[0] - a[0], b[1] - a[1])
/** 角 aob 的大小（度，0–180） */
export function angleAt(a: P, o: P, b: P) {
  const x1 = a[0] - o[0], y1 = a[1] - o[1], x2 = b[0] - o[0], y2 = b[1] - o[1]
  return Math.acos(Math.max(-1, Math.min(1, (x1 * x2 + y1 * y2) / (Math.hypot(x1, y1) * Math.hypot(x2, y2))))) * 180 / Math.PI
}
/** 从 oa 逆时针转到 ob 的角（度，0–360） */
export function turnAngle(a: P, o: P, b: P) {
  const t = (Math.atan2(b[1] - o[1], b[0] - o[0]) - Math.atan2(a[1] - o[1], a[0] - o[0])) * 180 / Math.PI
  return ((t % 360) + 360) % 360
}
/** 两条线段方向是否平行（或在同一直线上） */
export const parallel = (a1: P, a2: P, b1: P, b2: P) => Math.abs((a2[0] - a1[0]) * (b2[1] - b1[1]) - (a2[1] - a1[1]) * (b2[0] - b1[0])) < 1e-9
/** 点 p 是否在线段 ab 上 */
export function onSegment(p: P, a: P, b: P) {
  const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  return Math.abs(cross) < 1e-9 && Math.min(a[0], b[0]) - 1e-9 <= p[0] && p[0] <= Math.max(a[0], b[0]) + 1e-9 && Math.min(a[1], b[1]) - 1e-9 <= p[1] && p[1] <= Math.max(a[1], b[1]) + 1e-9
}
/** 三角形（或多边形）的有向面积：正的是逆时针 */
export function signedArea(pts: P[]) { let s = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1] }); return s / 2 }
/** 绕向：A→B→C 是逆时针还是顺时针 */
export const turnDir = (pts: P[]) => signedArea(pts) > 0 ? '逆时针' : '顺时针'
/** 两组点是不是同一组（顺序可以不同）：判断“转过去以后和原来重合” */
export function sameSet(a: P[], b: P[]) { return a.length === b.length && a.every(p => b.some(q => dist(p, q) < 1e-6)) }
/** 多边形的中心（顶点的平均） */
export const center = (pts: P[]): P => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]

/** 长度读数：格数 × 每格多少 cm，保留一位小数 */
export const cm = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)} cm`
export const deg = (d: number) => `${Math.round(d)}°`

// ---------- 小旗：第 1、5 课共用的不对称图形 ----------
/** 旗杆 1 格宽、4 格高，右上挂一面三角旗。不对称，翻过去和转过去都看得出来 */
export const FLAG: P[] = [[0, 0], [1, 0], [1, 2], [3, 3], [1, 4], [0, 4]]
/** 标出来的三个点：A 杆顶，B 旗尖，C 杆脚右边 */
export const FLAG_ABC: P[] = [[0, 4], [3, 3], [1, 0]]
export const NAMES = ['A', 'B', 'C', 'D'] as const

// ---------- 第 1 课：地砖上的平移 ----------
/** 一格是一块青砖，30 cm */
export const TILE1 = 30
export const VEC1 = {
  r5: { name: '右 5 格', v: [5, 0] as P },
  u3: { name: '上 3 格', v: [0, 3] as P },
  d43: { name: '右 4 上 3', v: [4, 3] as P },
}
export type Vec1 = keyof typeof VEC1
/** 平移以后：三对对应点、连线长（cm）、三条连线是否都平行、长度是否都相等 */
export function shift1(key: Vec1) {
  const v = VEC1[key].v
  const pairs = FLAG_ABC.map(p => ({ p, q: translate(p, v), len: dist(p, translate(p, v)) * TILE1 }))
  return {
    v, pairs, len: pairs[0].len,
    equal: pairs.every(x => Math.abs(x.len - pairs[0].len) < 1e-9),
    parallel: pairs.every(x => parallel(pairs[0].p, pairs[0].q, x.p, x.q)),
    image: FLAG.map(p => translate(p, v)),
  }
}

// ---------- 第 2 课：对折剪窗花 ----------
/** 一格 1 cm。红纸 24 cm 见方，折痕在 u = 0。花样只画左半边：从折痕上端起，沿外轮廓走到折痕下端；holes 是半边里的镂空 */
export const PAPER2 = 24
export const CUT2 = {
  fly: {
    name: '蝴蝶',
    half: [[0, 6.5], [-2.5, 10.6], [-3, 10.3], [-0.9, 6.1], [-1.3, 5.5], [-4, 8.6], [-8, 10], [-10, 8.6], [-9.6, 5], [-7, 2.2], [-2.2, 0.6], [-6.5, -0.6], [-9, -3.5], [-8.4, -7], [-5.6, -8.6], [-3, -7.4], [-1.5, -4.6], [-0.9, -6.6], [0, -7.6]] as P[],
    holes: [[[-5, 7], [-7.6, 8.4], [-8.6, 6.6], [-7.4, 4.6], [-5.2, 5]], [[-3.2, 4.4], [-4.6, 3.4], [-3, 2.6], [-2.2, 3.4]], [[-4.6, -2.6], [-7.4, -3.4], [-6.8, -6], [-4.8, -5.6]]] as P[][],
    abc: [[-10, 8.6], [-7, 2.2], [-5.6, -8.6]] as P[],
  },
  vase: {
    name: '花瓶',
    half: [[0, 10.5], [-3, 10.5], [-3, 9.4], [-2, 8.4], [-2, 6.6], [-6, 3], [-6.4, 0], [-6, -3], [-4, -7], [-5, -9], [-5, -10], [0, -10]] as P[],
    holes: [[[-1.4, 3], [-3.6, 1], [-1.4, -1], [-0.6, 1]], [[-4.4, 1.4], [-5, 0], [-4.4, -1.4], [-3.8, 0]], [[-1.2, -4.2], [-3.4, -5.4], [-2.6, -7.6], [-1.2, -7]]] as P[][],
    abc: [[-3, 10.5], [-6, 3], [-5, -9]] as P[],
  },
}
export type Cut2 = keyof typeof CUT2
/** 展开以后：整个轮廓（左半边接上右半边）、镂空、三对对应点和它们到折痕的距离（cm）、连线和折痕的夹角 */
export function cut2(key: Cut2) {
  const d = CUT2[key]
  const right = d.half.slice().reverse().map(p => reflectU(p, 0))
  const outline = [...d.half, ...right.slice(1, -1)]
  const pairs = d.abc.map(p => { const q = reflectU(p, 0); return { p, q, dp: Math.abs(p[0]), dq: Math.abs(q[0]), angle: angleAt(q, [0, p[1]], [0, p[1] + 1]), mid: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as P } })
  return { outline, holes: [...d.holes, ...d.holes.map(h => h.map(p => reflectU(p, 0)).reverse())], pairs }
}

// ---------- 第 3 课：补全木花窗 ----------
/** 一格 10 cm。对称轴 u = 0，内框 u 从 −4 到 4、v 从 0 到 9。左半边的木条沿这条折线走：从轴上 (0, 8) 出发，经过 A、B、C、D，回到轴上 (0, 1) */
export const GRID3 = 10
export const WIN3 = { top: [0, 8] as P, pts: [[-2, 7], [-3, 5], [-1, 4], [-3, 2]] as P[], bottom: [0, 1] as P, w: 8, h: 9 }
/** 四个对称点：过点作对称轴的垂线，在另一侧截取一样长 */
export function win3() {
  return WIN3.pts.map(p => { const q = reflectU(p, 0); return { p, q, foot: [0, p[1]] as P, dp: Math.abs(p[0]) * GRID3, dq: Math.abs(q[0]) * GRID3 } })
}

// ---------- 第 4 课：风车叶片 ----------
/** 一格 5 cm。叶片是三角形 OAB，O 是轴钉 */
export const GRID4 = 5
export const BLADE: { O: P; A: P; B: P } = { O: [0, 0], A: [6, 0], B: [3, 4] }
export const ANG4 = { a90: { name: '90°', deg: 90 }, a120: { name: '120°', deg: 120 } }
export type Ang4 = keyof typeof ANG4
/** 按这个角一片片转下去：一圈能放几片；第 1 片转过去以后的 A′、B′、OA、OA′、OB、OB′ 和量到的两个角 */
export function blades4(key: Ang4) {
  const d = ANG4[key].deg, { O, A, B } = BLADE
  const A1 = rotate(A, O, d), B1 = rotate(B, O, d)
  return {
    deg: d, count: Math.round(360 / d), A1, B1,
    OA: dist(O, A) * GRID4, OA1: dist(O, A1) * GRID4, OB: dist(O, B) * GRID4, OB1: dist(O, B1) * GRID4,
    angA: turnAngle(A, O, A1), angB: turnAngle(B, O, B1),
  }
}

// ---------- 第 5 课：转半圈 ----------
/** 一格 5 cm。小旗绕 O(3, 1) 转 180° */
export const GRID5 = 5
export const O5: P = [3, 1]
export function half5() {
  const pairs = FLAG_ABC.map(p => { const q = rotate(p, O5, 180); return { p, q, op: dist(O5, p) * GRID5, oq: dist(O5, q) * GRID5, through: onSegment(O5, p, q) } })
  return { pairs, image: FLAG.map(p => rotate(p, O5, 180)) }
}
/** 两块花砖：转 180° 后和自己重合吗 */
export const SELF5 = {
  para: { name: '平行四边形', pts: [[0, 0], [4, 0], [5, 2.4], [1, 2.4]] as P[] },
  tri: { name: '正三角形', pts: [[0, 0], [4, 0], [2, 2 * Math.sqrt(3)]] as P[] },
}
export type Self5 = keyof typeof SELF5
export function selfTurn5(key: Self5) {
  const pts = SELF5[key].pts, c = center(pts), turned = pts.map(p => rotate(p, c, 180))
  return { c, turned, same: sameSet(pts, turned) }
}

// ---------- 第 6 课：形状大小不变 ----------
/** 一格 4 cm。三角形 ABC */
export const GRID6 = 4
export const TRI6: P[] = [[0, 0], [4, 0], [1, 3]]
export const MOVE6 = {
  shift: { name: '平移', f: (p: P) => translate(p, [6, 1]) },
  flip: { name: '轴对称', f: (p: P) => reflectU(p, 5.5) },
  turn: { name: '旋转', f: (p: P) => rotate(p, [5, 0], 90) },
}
export type Move6 = keyof typeof MOVE6
/** 旋转中心、对称轴、平移向量（画图用） */
export const AXIS6 = 5.5, PIVOT6: P = [5, 0], VEC6: P = [6, 1]
/** 三边 AB、BC、CA（cm） */
export const sides = (t: P[]) => [dist(t[0], t[1]), dist(t[1], t[2]), dist(t[2], t[0])].map(x => x * GRID6)
/** 三个角 ∠A、∠B、∠C（度） */
export const angles = (t: P[]) => [angleAt(t[1], t[0], t[2]), angleAt(t[0], t[1], t[2]), angleAt(t[0], t[2], t[1])]
export function move6(key: Move6) {
  const img = TRI6.map(MOVE6[key].f)
  return { img, sides: sides(img), angles: angles(img), dir: turnDir(img), same: sides(img).every((s, i) => Math.abs(s - sides(TRI6)[i]) < 1e-9) && angles(img).every((a, i) => Math.abs(a - angles(TRI6)[i]) < 1e-9) }
}

// ---------- 第 7 课：印一块花布 ----------
/** 一格 1 cm。一片花瓣：从团花中心往右长出去，尖上带一个勾，所以转着印能看出转的方向 */
export const PETAL: P[] = ([[1.2, 0.4], [3, 2.2], [5.4, 3], [7.4, 2.4], [8.4, 0.6], [7.6, -0.4], [7.6, 1.2], [6.4, 1.6], [5.4, 0.6], [4.4, -0.6], [2.6, -0.8]] as P[]).map(([u, v]) => [u * 1.35, v * 1.35] as P)
/** 团花之间平移 28 cm；布上印两行三列 */
export const STEP7 = 28
export const GRID7: P[] = [[-28, 14], [0, 14], [28, 14], [-28, -14], [0, -14], [28, -14]]
/** 一朵团花四片花瓣：第 k 片是第一片绕中心转 k × 90° */
export const petalAngles = () => [0, 90, 180, 270]
export function print7() {
  return { angles: petalAngles(), flowers: GRID7, shift: dist(GRID7[0], GRID7[1]), petals: petalAngles().length * GRID7.length }
}

// ---------- 拓展：团花和密铺 ----------
/** 红纸折成 wedges 层（扇形）剪出的团花：对称轴 wedges / 2 条，最少转 360 ÷ 条数 度和自己重合 */
export function tuan(wedges: number) { const axes = wedges / 2; return { axes, turn: 360 / axes, wedge: 360 / wedges } }
export const TUAN = { w4: { name: '折成 4 层', wedges: 4 }, w8: { name: '折成 8 层', wedges: 8 } }
export type Tuan = keyof typeof TUAN
/** 正 n 边形的一个内角；围着一点能放几块；角度和；留下的缝 */
export function tess(n: number) {
  const angle = (n - 2) * 180 / n, count = Math.floor(360 / angle + 1e-9), sum = count * angle
  return { angle, count, sum, gap: 360 - sum, fit: Math.abs(360 - sum) < 1e-9 }
}
export const TESS = { n6: { name: '正六边形', n: 6 }, n5: { name: '正五边形', n: 5 } }
export type Tess = keyof typeof TESS
