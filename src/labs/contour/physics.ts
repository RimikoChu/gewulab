// 等高线地形图实验室的计算核心：整块山地的海拔、等高线（用水平面切出来的交线）、坡度、示坡线、水往哪里流、剖面、选址。
// 画面、读数、任务判定都从这里取数，界面文件里不做计算。取值约定写在规格卡 docs/specs/contour.md 里。
//
// 坐标：x 向东、z 向南（地图上北在上，就是 -z 在上），单位“百米”：场景里 1 = 水平 100 m。海拔 h 用米。
// 这块山地是照真实地形的样子编出来的示意地形，不是哪一处真实的地方。

export const X0 = -60, X1 = 60, Z0 = -40, Z1 = 40
/** 场景里水平方向 1 个单位是多少米 */
export const UNIT = 100
/** 竖直方向放大几倍（示意：不放大的话山显得太平，看不清坡） */
export const VEX = 1.15
/** 海拔（m）换成场景里的高度 */
export const Y = (h: number) => (h / UNIT) * VEX

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const sm = (t: number) => { const k = clamp01(t); return k * k * (3 - 2 * k) }
/** 平滑的取大：两座山连在一起时，接合处是圆滑的而不是一道折痕 */
const smax = (a: number, b: number, k = 70) => { const h = clamp01(0.5 + (0.5 * (a - b)) / k); return b + (a - b) * h + k * h * (1 - h) * 0.5 }
const smin = (a: number, b: number, k = 40) => -smax(-a, -b, k)

// ---------- 起伏的细节：确定的“噪声”，每次算出来都一样 ----------
function hash(i: number, j: number) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
function vnoise(x: number, z: number) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz)
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1)
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1
}
export function fbm(x: number, z: number, oct = 4) {
  let s = 0, a = 0.5, f = 0.16
  for (let k = 0; k < oct; k++) { s += a * vnoise(x * f + k * 17.3, z * f - k * 9.1); a *= 0.5; f *= 2.03 }
  return s
}

/** 点到线段的距离和投影位置 t（0 到 1） */
function seg(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax, vz = bz - az, t = clamp01(((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz))
  return { d: Math.hypot(px - ax - vx * t, pz - az - vz * t), t }
}
type P2 = [number, number]

// ---------- 地形的各个部分 ----------
/** 主峰（A 峰）和东边的 B 峰 */
export const PEAK_A: P2 = [8, -8], PEAK_B: P2 = [33, -15]
/** 西北的高原、东南的盆地 */
export const PLATEAU: P2 = [-30, -24], BASIN: P2 = [42, 20]
/** 海岸线在哪个 x 上 */
export const coastX = (z: number) => -47 + 2.6 * Math.sin(z * 0.13 + 0.6) + 1.4 * Math.sin(z * 0.37)

/** 河：从 A、B 两峰之间的山谷流出，穿过峡谷，向西流到海里。每个点是 [x, z, 河床海拔] */
export const RIVER: [number, number, number][] = [
  [20.2, -3.5, 146], [20, -1.5, 142], [19.2, 2, 137], [18.3, 6, 131], [17.7, 9, 126], [17.4, 12, 121], [16, 15.5, 116],
  [11, 18.5, 108], [3, 20.5, 100], [-8, 21.5, 78], [-20, 22.5, 46], [-32, 23.2, 22], [-42, 23.6, 6], [-52, 24, -8],
]
/** 高原上的小溪：在南边的陡崖上跌下去成为瀑布，再向东南流进大河 */
export const BROOK: [number, number, number][] = [
  [-32, -27, 728], [-31, -21, 725], [-29.6, -15.35, 722], [-29.3, -14.6, 418], [-28.4, -11, 290], [-27.2, -6, 70], [-26, -1, 57], [-24, 6, 53], [-21.5, 16, 49], [-20, 22.5, 46],
]

/** 沿一条河道走：离河道最近的距离和那一处的河床海拔 */
function nearRiver(x: number, z: number, path: [number, number, number][]) {
  let best = 1e9, bed = 0
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az, ha] = path[i], [bx, bz, hb] = path[i + 1], s = seg(x, z, ax, az, bx, bz)
    if (s.d < best) { best = s.d; bed = ha + (hb - ha) * s.t }
  }
  return { d: best, bed }
}

/** 一道山脊：从 a 到 b，脊顶高 crest(t)，两侧宽 w(t) */
function spur(x: number, z: number, a: P2, b: P2, crest: (t: number) => number, w: (t: number) => number) {
  const s = seg(x, z, a[0], a[1], b[0], b[1]); const ww = w(s.t)
  return crest(s.t) * Math.exp(-((s.d / ww) ** 2))
}

/** 不算河道时的地形（m）：平原、两座山、山脊、高原、盆地、丘陵，再加一点起伏 */
function land(x0: number, z0: number) {
  // 坐标稍微扭一扭，山的轮廓才不是规整的椭圆
  const x = x0 + 2.2 * fbm(z0 * 0.7 + 40, x0 * 0.7, 2), z = z0 + 2.2 * fbm(x0 * 0.7 - 30, z0 * 0.7, 2)
  const inland = x0 - coastX(z0)
  const base = 6 + inland * (inland < 0 ? 7 : 1.9)
  // 山体上一道道小山梁和冲沟（脊状噪声），越高越明显
  const gully = 1 - Math.abs(vnoise(x * 0.42 + 3, z * 0.42 - 7)), gully2 = 1 - Math.abs(vnoise(x * 0.9 - 11, z * 0.9 + 5))
  const carve = 1 - (0.16 * (1 - gully) + 0.06 * (1 - gully2))
  // A 峰：西坡缓、东坡陡
  const dx = x - PEAK_A[0], dz = z - PEAK_A[1]
  const a = 1440 * Math.exp(-((dx / (dx < 0 ? 21 : 8.2)) ** 2) - ((dz / (dz < 0 ? 10.5 : 9.5)) ** 2))
  const bx = x - PEAK_B[0], bz = z - PEAK_B[1]
  const b = 1060 * Math.exp(-((bx / 8) ** 2) - ((bz / 8.4) ** 2))
  let m = smax(a, b)
  m = smax(m, spur(x, z, [7.5, -6], [3, 17], t => 1150 * (1 - t) ** 1.35, t => 2.4 + 2.8 * t))           // A 峰向南伸出的山脊
  m = smax(m, spur(x, z, [6, -9], [-10, -2], t => 1250 * (1 - t) ** 1.5, t => 3 + 2.5 * t))              // A 峰向西的山脊
  m = smax(m, spur(x, z, [32, -12], [27.5, 13], t => 930 * (1 - t) ** 1.25, t => 2.6 + 2.4 * t))         // B 峰向南的山脊
  m = smax(m, spur(x, z, [34, -18], [46, -30], t => 900 * (1 - t) ** 1.4, t => 3 + 3 * t))               // B 峰向东北的山脊
  m = smax(m, spur(x, z, [27, 9], [20, 11], t => 330 - 60 * t, () => 2.2))                            // 两道从两边伸到河边的小山梁，夹出一段峡谷
  m = smax(m, spur(x, z, [10, 10.4], [15, 11.2], t => 280 - 40 * t, () => 2.1))
  m *= 1 - (1 - carve) * sm(m / 250) * (1 - sm((m - 950) / 350))   // 山顶附近不刻，免得山顶冒出一圈圈小环
  m = smax(m, spur(x, z, PEAK_A, PEAK_B, t => 885 - 95 * Math.sin(Math.PI * t), () => 3.3))             // 连着两峰的山脊，中间最低处是鞍部
  // 高原：顶面平坦、边缘陡；南缘中段是一道陡崖
  const px = (x0 - PLATEAU[0]) / 13 + 0.06 * fbm(z0, x0, 2), pz = (z0 - PLATEAU[1]) / 9, r = (Math.abs(px) ** 3 + Math.abs(pz) ** 3) ** (1 / 3)
  const cf = sm((z0 + 19.5) / 2) * sm((8 - Math.abs(x0 - PLATEAU[0])) / 3)
  const top = 735 + 10 * fbm(x * 1.4, z * 1.4, 2)
  const gentle = top * (1 - sm((r - 0.84) / 0.42)) * (0.92 + 0.08 * gully)
  const cliffy = r < 0.965 ? top : r < 1 ? top + (395 - top) * ((r - 0.965) / 0.035) : 395 * (1 - sm((r - 1) / 1.2))
  m = smax(m, gentle + (cliffy - gentle) * cf, 30)
  // 盆地：一圈山围着一块抬起来的平地
  const cx = x - BASIN[0], cz = z - BASIN[1], rr = Math.hypot(cx, cz) / 10, th = Math.atan2(cz, cx)
  const rim = 455 * (1 + 0.22 * Math.sin(3 * th + 1) + 0.1 * Math.sin(5 * th)) * Math.exp(-(((rr - 1) / 0.36) ** 2)) * carve
  const floor = 150 * (1 - sm((rr - 0.72) / 0.32))
  m = smax(m, smax(rim, floor, 60))
  // 丘陵：河南边一片低缓的小山
  for (const [hx, hz, hh, sx, sz] of HILLS) m = smax(m, hh * Math.exp(-(((x - hx) / sx) ** 2 + ((z - hz) / sz) ** 2)), 50)
  const rough = 3 + 0.01 * m
  return base + m + rough * fbm(x0, z0) + 0.25 * rough * fbm(x0 * 3.1, z0 * 3.1, 2)
}
const HILLS: [number, number, number, number, number][] = [
  [-3, 31, 170, 4.5, 2.6], [3, 27.5, 205, 3, 4], [9.5, 31.5, 250, 4.6, 3.2], [15.5, 27.5, 215, 3.6, 2.6], [20, 33, 225, 3, 4.2], [5, 36.5, 150, 5, 2.4], [14, 36.5, 175, 4.4, 2.6], [-9, 35, 120, 4, 2.8], [25, 28, 160, 2.6, 3.4],
]

/** 海拔（m）：任意一点 (x, z) 的地面高度。河道处刻出 V 形的谷，河床顺流一路降低 */
export function height(x: number, z: number) {
  let h = land(x, z)
  for (const path of [RIVER, BROOK]) {
    const { d, bed } = nearRiver(x, z, path)
    if (path === RIVER) h += 40 * sm(d / 7) * (1 - sm((h - bed - 40) / 80)) * sm(h / 15)   // 谷底朝河边微微倾斜，雨水才会汇进河里
    if (d < 12) h = smin(h, bed + 3 + 8 * d + 12 * d * d + 6 * d * d * d, 25)
  }
  return h
}

// ---------- 网格：画面和等高线都用它 ----------
export interface Grid { nx: number; nz: number; dx: number; dz: number; h: Float32Array }
/** 分段生成网格的海拔：每做完一行让出一次（画面在 job.ts 里分段调用，进页面不卡） */
export function* gridGen(nx: number, nz: number): Generator<void, Grid> {
  const h = new Float32Array((nx + 1) * (nz + 1)), dx = (X1 - X0) / nx, dz = (Z1 - Z0) / nz
  for (let j = 0; j <= nz; j++) { for (let i = 0; i <= nx; i++) h[j * (nx + 1) + i] = height(X0 + i * dx, Z0 + j * dz); yield }
  return { nx, nz, dx, dz, h }
}
export function makeGrid(nx: number, nz: number) { const g = gridGen(nx, nz); let r = g.next(); while (!r.done) r = g.next(); return r.value }

/** 等高线：用海拔为 level 的水平面切地形，交线就是这条等高线。返回一段段的线 [x1, z1, x2, z2, …]（行进方格法） */
export function contourSegments(g: Grid, level: number) {
  const out: number[] = [], W = g.nx + 1
  const lerp = (a: number, b: number) => (level - a) / (b - a)
  for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) {
    const h0 = g.h[j * W + i], h1 = g.h[j * W + i + 1], h2 = g.h[(j + 1) * W + i + 1], h3 = g.h[(j + 1) * W + i]
    const c = (h0 > level ? 1 : 0) | (h1 > level ? 2 : 0) | (h2 > level ? 4 : 0) | (h3 > level ? 8 : 0)
    if (c === 0 || c === 15) continue
    const x = X0 + i * g.dx, z = Z0 + j * g.dz
    // 四条边上的交点：上 (0-1)、右 (1-2)、下 (3-2)、左 (0-3)
    const e = [
      () => [x + g.dx * lerp(h0, h1), z], () => [x + g.dx, z + g.dz * lerp(h1, h2)],
      () => [x + g.dx * lerp(h3, h2), z + g.dz], () => [x, z + g.dz * lerp(h0, h3)],
    ]
    const pairs = CASES[c] === 'saddle' ? ((h0 + h1 + h2 + h3) / 4 > level ? (c === 5 ? [[0, 3], [1, 2]] : [[0, 1], [2, 3]]) : (c === 5 ? [[0, 1], [2, 3]] : [[0, 3], [1, 2]])) : CASES[c] as number[][]
    for (const [a, b] of pairs) { const p = e[a](), q = e[b](); out.push(p[0], p[1], q[0], q[1]) }
  }
  return out
}
const CASES: (number[][] | 'saddle')[] = [
  [], [[0, 3]], [[0, 1]], [[1, 3]], [[1, 2]], 'saddle', [[0, 2]], [[2, 3]], [[2, 3]], [[0, 2]], 'saddle', [[1, 2]], [[1, 3]], [[0, 1]], [[0, 3]], [],
]
/** 一组等高线的海拔：从 step 起，每隔 step 一条，到 top 为止 */
export const levels = (step: number, top = 1600) => Array.from({ length: Math.floor(top / step) }, (_, k) => (k + 1) * step)

/** 坡往哪边下：海拔变化最快的方向（指向低处，单位向量） */
export function downhill(x: number, z: number): P2 {
  const e = 0.15, gx = height(x + e, z) - height(x - e, z), gz = height(x, z + e) - height(x, z - e), l = Math.hypot(gx, gz) || 1
  return [-gx / l, -gz / l]
}
/** 一点的坡度：每走水平 100 m 升高或降低多少米 */
export const steepness = (x: number, z: number) => { const e = 0.15; return Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e) }

/** 在附近找最高点（爬坡法）：山顶的准确位置 */
export function summit(p: P2): P2 {
  let [x, z] = p, s = 0.6
  for (let k = 0; k < 400 && s > 0.005; k++) {
    let best = height(x, z), bx = x, bz = z
    for (const [ox, oz] of [[s, 0], [-s, 0], [0, s], [0, -s], [s, s], [-s, s], [s, -s], [-s, -s]]) { const h = height(x + ox, z + oz); if (h > best) { best = h; bx = x + ox; bz = z + oz } }
    if (bx === x && bz === z) s *= 0.5; else { x = bx; z = bz }
  }
  return [x, z]
}
export const round = (x: number, step = 1) => Math.round(x / step) * step

// ---------- 第 1 课 海拔和相对高度 ----------
export const TOP_A = summit(PEAK_A), TOP_B = summit(PEAK_B)
/** 山脚下的村子 */
export const VILLAGE: P2 = [-15, 9]
export const SPOTS = {
  peak: { name: 'A 峰山顶', at: TOP_A },
  village: { name: '山脚村庄', at: VILLAGE },
} as const
export type SpotKey = keyof typeof SPOTS
/** 一处的海拔（m，取整）：从海平面算起 */
export const altitude = (p: P2) => Math.round(height(p[0], p[1]))
/** 相对高度：两地海拔之差 */
export const relHeight = (a: P2, b: P2) => altitude(a) - altitude(b)

// ---------- 第 2 课 等高线是怎么画出来的 ----------
/** 两种等高距（m） */
export const STEPS = [200, 100] as const
export type Step = (typeof STEPS)[number]
/** 切 A 峰时从上往下切的各层：从山顶下面第一层切到 step */
export const sliceLevels = (step: number) => levels(step, altitude(TOP_A)).reverse()
/** A 峰上一共能画出几条等高线 */
export const linesOnPeak = (step: number) => Math.floor(altitude(TOP_A) / step)

// ---------- 第 3 课 等高线疏密和坡度 ----------
/** 两条登山路线都从海拔 START 的地方出发，直线爬到 A 峰山顶 */
export const START = 600
function startFrom(dir: P2): P2 {
  const l = Math.hypot(dir[0], dir[1]), ux = dir[0] / l, uz = dir[1] / l
  let d = 0
  while (height(TOP_A[0] + ux * d, TOP_A[1] + uz * d) > START && d < 60) d += 0.02
  return [TOP_A[0] + ux * d, TOP_A[1] + uz * d]
}
export const ROUTES = {
  west: { name: '西坡', from: startFrom([-1, 0.12]) },
  east: { name: '东坡', from: startFrom([1, 0.35]) },
} as const
export type RouteKey = keyof typeof ROUTES
/** 一条路线：水平距离（km）、升高（m）、穿过几条等高线（等高距 100 m）、相邻两条平均相隔多远（m） */
export function climb(k: RouteKey) {
  const [x, z] = ROUTES[k].from, dist = Math.hypot(TOP_A[0] - x, TOP_A[1] - z) * UNIT
  const rise = altitude(TOP_A) - START, n = Math.floor(altitude(TOP_A) / 100) - START / 100
  return { km: Math.round(dist / 100) / 10, rise, lines: n, gap: Math.round(dist / n / 10) * 10, per100: Math.round((rise / dist) * 100) }
}
/** 沿路线走到 t（0 到 1）时的位置 */
export const routeAt = (k: RouteKey, t: number): P2 => { const [x, z] = ROUTES[k].from; return [x + (TOP_A[0] - x) * t, z + (TOP_A[1] - z) * t] }

// ---------- 第 4 课 山峰和盆地 ----------
/** 盆地中心 */
export const BASIN_C: P2 = [BASIN[0] - 0.5, BASIN[1] + 0.5]
/** 闭合等高线里最里面的一圈：山峰是比中心低的最高一条，盆地是比中心高的最低一条 */
export const innerRing = (p: P2, kind: 'peak' | 'basin', step = 100) => kind === 'peak' ? Math.floor(altitude(p) / step) * step : Math.ceil(altitude(p) / step) * step
/** 再往外一圈 */
export const outerRing = (p: P2, kind: 'peak' | 'basin', step = 100) => innerRing(p, kind, step) + (kind === 'peak' ? -step : step)
/** 示坡线：在一条闭合等高线上取 n 处，各画一小段指向低处的短线。返回 [x, z, 指向低处的 dx, dz] */
export function slopeTicks(center: P2, level: number, n: number): [number, number, number, number][] {
  const out: [number, number, number, number][] = [], inside = height(center[0], center[1]) > level
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.3, ux = Math.cos(a), uz = Math.sin(a)
    let d = 0
    while (d < 16 && (height(center[0] + ux * d, center[1] + uz * d) > level) === inside) d += 0.04
    const x = center[0] + ux * d, z = center[1] + uz * d
    out.push([x, z, ...downhill(x, z)])
  }
  return out
}

// ---------- 第 5 课 山脊和山谷 ----------
/** A 峰向南伸出的山脊：脊线（沿山脊最高的一条线） */
export const RIDGE_LINE: P2[] = Array.from({ length: 13 }, (_, k) => {
  const t = 0.12 + k * 0.06, ax = 7.5 + (3 - 7.5) * t, az = -6 + (17 + 6) * t
  let best = -1e9, bx = ax
  for (let o = -3; o <= 3; o += 0.05) { const h = height(ax + o, az); if (h > best) { best = h; bx = ax + o } }
  return [bx, az] as P2
})
/** 两峰之间的山谷：谷线就是河道的上游一段 */
export const VALLEY_LINE: P2[] = RIVER.slice(0, 7).map(([x, z]) => [x, z] as P2)
/** 雨水往哪里流：每一步朝最陡的下坡走 0.25（25 m）。流到河边就并进河里；流到山脚（低于 foot）、海里或者洼地就停 */
export function flowPath(x: number, z: number, foot = 170, max = 200): [number, number, number][] {
  const out: [number, number, number][] = [[x, z, height(x, z)]]
  for (let k = 0; k < max; k++) {
    const [dx, dz] = downhill(x, z), nx = x + dx * 0.25, nz = z + dz * 0.25, h = height(nx, nz)
    if (h > out[out.length - 1][2] + 1.5) break
    x = nx; z = nz; out.push([x, z, h])
    const r = nearRiver(x, z, RIVER)
    if (r.d < 1.6) {
      // 并进河里：找河道上最近的一点
      let best = 1e9, bp: [number, number] = [x, z]
      for (let i = 0; i < RIVER.length - 1; i++) for (let t = 0; t <= 1; t += 0.05) { const px = RIVER[i][0] + (RIVER[i + 1][0] - RIVER[i][0]) * t, pz = RIVER[i][1] + (RIVER[i + 1][1] - RIVER[i][1]) * t, d = Math.hypot(px - x, pz - z); if (d < best) { best = d; bp = [px, pz] } }
      out.push([bp[0], bp[1], height(bp[0], bp[1])]); break
    }
    if (h < Math.max(1, foot)) break
  }
  return out
}
/** 一场雨：在脊线或谷线两侧各落几滴，算每一滴的去向 */
export function rainOn(kind: 'ridge' | 'valley') {
  const line = kind === 'ridge' ? RIDGE_LINE.slice(3, 11) : VALLEY_LINE.slice(1, 5)
  const drops: [number, number][] = []
  line.forEach(([x, z], i) => { for (const s of [-1, 1]) drops.push([x + s * (kind === 'ridge' ? 1.2 : 4.6 + (i % 2) * 0.8), z]) })
  return drops.map(([x, z]) => flowPath(x, z, kind === 'ridge' ? 170 : -1e9))
}
/** 雨水最后到了哪一边：脊线以东、以西；或者流进了河 */
export function rainSummary(kind: 'ridge' | 'valley') {
  const paths = rainOn(kind), ends = paths.map(p => p[p.length - 1])
  if (kind === 'ridge') {
    // 落在脊线西侧的（偶数号）和东侧的（奇数号）各往哪边去了
    const west = paths.filter((p, i) => i % 2 === 0 && p[p.length - 1][0] < p[0][0]).length
    const east = paths.filter((p, i) => i % 2 === 1 && p[p.length - 1][0] > p[0][0]).length
    return { total: paths.length, east, west, river: 0 }
  }
  const river = ends.filter(e => nearRiver(e[0], e[1], RIVER).d < 0.3).length
  return { total: paths.length, east: 0, west: 0, river }
}

// ---------- 第 6 课 鞍部和陡崖 ----------
/** 鞍部：沿 A、B 两峰之间的山脊，每一处取横着最高的点（脊线），脊线上最低的那一点就是鞍部 */
export const SADDLE = (() => {
  let low = 1e9, at: P2 = [0, 0]
  for (let t = 0.25; t <= 0.85; t += 0.01) {
    const ax = PEAK_A[0] + (PEAK_B[0] - PEAK_A[0]) * t, az = PEAK_A[1] + (PEAK_B[1] - PEAK_A[1]) * t
    let best = -1e9, bp: P2 = [ax, az]
    for (let o = -3; o <= 3; o += 0.05) { const x = ax - 0.27 * o, z = az - 0.96 * o, h = height(x, z); if (h > best) { best = h; bp = [x, z] } }
    if (best < low) { low = best; at = bp }
  }
  return { at, h: Math.round(low) }
})()
/** 陡崖：高原南缘、瀑布所在的那一处，崖顶和崖脚的海拔 */
export const CLIFF = (() => {
  const x = -30.5
  let top = 0, foot = 0, zTop = 0
  for (let z = -18; z < -12; z += 0.01) { const a = height(x, z), b = height(x, z + 0.01); if (a - b > top - foot || (top === 0)) { if (a - b > 10) { top = a; foot = b; zTop = z } } }
  // 往下找到崖脚：海拔下降变缓的地方
  let z = zTop, h = height(x, z)
  while (z < -12) { const n = height(x, z + 0.01); if (h - n < 1.5) break; z += 0.01; h = n }
  return { at: [x, zTop] as P2, top: Math.round(height(x, zTop - 0.05)), foot: Math.round(h) }
})()
/** 崖顶和崖脚之间夹着几条等高线（它们在图上重合在一起） */
export const overlapCount = (top: number, foot: number, step = 100) => Math.floor(top / step) - Math.floor(foot / step)
/** 陡崖相对高度的范围：n 条线重合、等高距 d，(n − 1)d ≤ H < (n + 1)d */
export const cliffRange = (n: number, d: number): [number, number] => [(n - 1) * d, (n + 1) * d]
/** 重合的是哪几条线 */
export const overlapLevels = (top: number, foot: number, step = 100) => Array.from({ length: overlapCount(top, foot, step) }, (_, k) => (Math.floor(foot / step) + 1 + k) * step)

// ---------- 第 7 课 分层设色和剖面 ----------
export const LANDFORMS = {
  plain: { name: '平原', at: [-30, 10] as P2, r: 9 },
  hill: { name: '丘陵', at: [8, 31] as P2, r: 6 },
  mount: { name: '山地', at: [14, -10] as P2, r: 9 },
  plateau: { name: '高原', at: PLATEAU, r: 7 },
  basin: { name: '盆地', at: BASIN_C, r: 12 },
} as const
export type LandKey = keyof typeof LANDFORMS
/** 一块地方的海拔范围（m，取整到 10 m）：在半径 r 的圆里取样 */
export function landRange(k: LandKey) {
  const { at, r } = LANDFORMS[k]
  let lo = 1e9, hi = -1e9
  for (let a = 0; a < 24; a++) for (let d = 0; d <= r; d += r / 6) { const h = height(at[0] + Math.cos(a / 24 * Math.PI * 2) * d, at[1] + Math.sin(a / 24 * Math.PI * 2) * d); lo = Math.min(lo, h); hi = Math.max(hi, h) }
  return { lo: round(Math.max(0, lo), 10), hi: round(hi, 10), relief: round(hi - lo, 10) }
}
/** 剖面线 AB：从西边的平原穿过高原、A 峰、鞍部到 B 峰 */
export const PROFILE: [P2, P2] = [[-52, -25], [50, -12.5]]
/** 沿剖面线取样：[离 A 点多远（km）, 海拔（m）] */
export function profile(n = 160): [number, number][] {
  const [[ax, az], [bx, bz]] = PROFILE, L = Math.hypot(bx - ax, bz - az) * UNIT / 1000
  return Array.from({ length: n + 1 }, (_, k) => { const t = k / n; return [t * L, Math.round(height(ax + (bx - ax) * t, az + (bz - az) * t))] as [number, number] })
}

// ---------- 拓展 ----------
/** 翻山：从山谷里出发，翻过 A、B 两峰之间的山岭到北边去，两条路 */
export const PASS_FROM: P2 = [20, 1], PASS_TO: P2 = [19, -26]
export const TRAILS = {
  saddle: { name: '甲：经鞍部翻过去', pts: [PASS_FROM, [20.2, -5], SADDLE.at, [19.5, -18], PASS_TO] as P2[] },
  peak: { name: '乙：翻过 A 峰', pts: [PASS_FROM, [14, -4], TOP_A, [12, -18], PASS_TO] as P2[] },
} as const
export type TrailKey = keyof typeof TRAILS
/** 一条路：全长（km）、路上最高处的海拔（m）、从起点算要爬升多少（m） */
export function trail(k: TrailKey) {
  const pts = TRAILS[k].pts; let len = 0, top = -1e9
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.1)
    for (let s = 0; s <= n; s++) top = Math.max(top, height(ax + (bx - ax) * s / n, az + (bz - az) * s / n))
    len += d
  }
  return { km: Math.round(len * UNIT / 100) / 10, top: Math.round(top), climb: Math.round(top) - altitude(PASS_FROM) }
}
/** 修水库：两处坝址，水面都蓄到海拔 WATER */
export const WATER = 260
export const DAMS = {
  gorge: { name: '甲：峡谷口', at: [17.5, 11] as P2 },
  open: { name: '乙：宽谷中', at: [19.2, 2] as P2 },
} as const
export type DamKey = keyof typeof DAMS
/** 坝要修多长（m）：在坝址处横着量，两岸海拔都到 WATER 的地方之间 */
export function damLength(k: DamKey) {
  const [x, z] = DAMS[k].at
  let l = 0, r = 0
  while (height(x - l, z) < WATER && l < 30) l += 0.02
  while (height(x + r, z) < WATER && r < 30) r += 0.02
  return round((l + r) * UNIT, 10)
}
/** 坝的两头（x） */
export function damEnds(k: DamKey): [number, number] {
  const [x, z] = DAMS[k].at
  let l = 0, r = 0
  while (height(x - l, z) < WATER && l < 30) l += 0.02
  while (height(x + r, z) < WATER && r < 30) r += 0.02
  return [x - l, x + r]
}
/** 水库淹到哪里：从坝的上游一点开始，往四周找海拔低于水面的格子（每格 50 m），返回格子的中心和面积（km²） */
export function reservoir(k: DamKey) {
  const [x0, z0] = DAMS[k].at, c = 0.5, cells: P2[] = [], seen = new Set<string>()
  const stack: [number, number][] = [[Math.round(x0 / c), Math.round((z0 - 1) / c)]]
  while (stack.length && cells.length < 20000) {
    const [i, j] = stack.pop()!, key = `${i},${j}`
    if (seen.has(key)) continue
    seen.add(key)
    const x = i * c, z = j * c
    if (z > z0 - 0.25 || x < X0 || x > X1 || z < Z0 || height(x, z) >= WATER) continue
    cells.push([x, z])
    stack.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1])
  }
  return { cells, km2: Math.round(cells.length * c * c * UNIT * UNIT / 1e5) / 10 }
}
/** 看日出：两处观景点 */
export const VIEWPOINTS = {
  peakA: { name: 'A 峰山顶', at: TOP_A },
  saddle: { name: '鞍部', at: SADDLE.at },
} as const
export type LookKey = keyof typeof VIEWPOINTS
/** 朝东望：东边的地面最多比视线高出几度（负数说明一览无余），挡住视线的地方在哪 */
export function eastView(k: LookKey) {
  const [x, z] = VIEWPOINTS[k].at, h0 = height(x, z) + 2
  let best = -90, at: P2 = [x, z], hb = 0
  for (let d = 0.5; x + d <= X1; d += 0.25) { const h = height(x + d, z), a = Math.atan2(h - h0, d * UNIT) * 180 / Math.PI; if (a > best) { best = a; at = [x + d, z]; hb = h } }
  return { deg: Math.round(best * 10) / 10, blocked: best > 0, at, block: Math.round(hb) }
}

/** 从 p 出发朝 dir 方向走，走到海拔刚好是 level 的地方（标数字、放标签用） */
export function rayToLevel(p: P2, dir: P2, level: number): P2 {
  const l = Math.hypot(dir[0], dir[1]), ux = dir[0] / l, uz = dir[1] / l, above = height(p[0], p[1]) > level
  let d = 0
  while (d < 40 && (height(p[0] + ux * d, p[1] + uz * d) > level) === above) d += 0.03
  return [p[0] + ux * d, p[1] + uz * d]
}

/** 沿一条折线（脊线、谷线）走，海拔穿过 level 的地方：就是这条等高线弯得最厉害的那一处 */
export function crossOnLine(line: P2[], level: number): P2 | null {
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1]
    for (let s = 0; s < 20; s++) {
      const t0 = s / 20, t1 = (s + 1) / 20, h0 = height(ax + (bx - ax) * t0, az + (bz - az) * t0), h1 = height(ax + (bx - ax) * t1, az + (bz - az) * t1)
      if ((h0 - level) * (h1 - level) <= 0) { const t = t0 + (t1 - t0) * (h0 - level) / (h0 - h1 || 1); return [ax + (bx - ax) * t, az + (bz - az) * t] }
    }
  }
  return null
}

/** 陡崖在图上的位置：高原南缘一段，每处取往南落差最大的地方，连成一条线（画陡崖符号用） */
export const CLIFF_LINE: P2[] = (() => {
  const out: P2[] = []
  for (let x = PLATEAU[0] - 9; x <= PLATEAU[0] + 9; x += 0.5) {
    let best = 0, bz = 0
    for (let z = -19; z < -12; z += 0.02) { const d = height(x, z) - height(x, z + 0.06); if (d > best) { best = d; bz = z } }
    if (best > 25) out.push([x, bz + 0.03])
  }
  return out
})()
