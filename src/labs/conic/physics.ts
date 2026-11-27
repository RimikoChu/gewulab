// 圆锥曲线实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 平面上的点一律写成 [x, y]；取值约定写在规格卡 docs/specs/conic.md 里。
export type P2 = [number, number]

const rad = (deg: number) => deg * Math.PI / 180
/** 读数的写法：最多 d 位小数，去掉末尾的 0，负号用 “−” */
export const fmt = (v: number, d = 2) => { const s = String(Math.round(v * 10 ** d) / 10 ** d); return (s === '-0' ? '0' : s).replace('-', '−') }
export const dist = (p: P2, q: P2) => Math.hypot(p[0] - q[0], p[1] - q[1])
/** 光线的反射：d 是入射方向，n 是镜面的法线（不必是单位向量），返回反射方向 */
export function reflect(d: P2, n: P2): P2 {
  const l = Math.hypot(n[0], n[1]), nx = n[0] / l, ny = n[1] / l, k = 2 * (d[0] * nx + d[1] * ny)
  return [d[0] - k * nx, d[1] - k * ny]
}
const unit = (v: P2): P2 => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l] }

// ---------- 第 1 课：平面切圆锥 ----------
/** 圆锥模型：母线和轴的夹角 α（度）、每一半的高（m） */
export const CONE = { alpha: 30, H: 1.2 }
export const CUTS = {
  circle: { name: '圆', plane: '垂直于轴', beta: 90, y0: 0.66, z0: 0 },
  ellipse: { name: '椭圆', plane: '斜一点', beta: 60, y0: 0.6, z0: 0 },
  parabola: { name: '抛物线', plane: '平行于母线', beta: 30, y0: 0.42, z0: 0 },
  hyperbola: { name: '双曲线', plane: '平行于轴', beta: 0, y0: 0, z0: 0.2 },
} as const
export type CutKey = keyof typeof CUTS
export const CUT_KEYS = Object.keys(CUTS) as CutKey[]
/** 截口是哪一种：β 是平面和轴的夹角，α 是母线和轴的夹角（度） */
export function sectionType(beta: number, alpha = CONE.alpha): CutKey {
  if (Math.abs(beta - 90) < 1e-6) return 'circle'
  if (Math.abs(beta - alpha) < 1e-6) return 'parabola'
  return beta > alpha ? 'ellipse' : 'hyperbola'
}
/** 截口的离心率 e = cos β / cos α */
export const sectionEcc = (beta: number, alpha = CONE.alpha) => Math.cos(rad(beta)) / Math.cos(rad(alpha))
/**
 * 平面切双圆锥得到的截口。圆锥顶点在原点、轴是 y 轴；平面过点 (0, y0, z0)，和轴的夹角是 beta（度），朝 +z 那一侧抬起。
 * 返回平面自己的坐标 (s, t) 里的一条或两条折线：s 沿水平方向，t 沿平面的上坡方向，原点是 (0, y0, z0)。
 */
export function sectionCurve(beta: number, y0: number, z0: number, alpha = CONE.alpha, H = CONE.H, n = 160): { pts: P2[]; closed: boolean }[] {
  const th = rad(90 - beta), k = Math.tan(rad(alpha)), sn = Math.sin(th), cs = Math.cos(th)
  // 平面上 t 处的一行：x² = k²y² − z²，落在圆锥里（|y| ≤ H）才算
  const x2 = (t: number) => { const y = y0 + t * sn, z = z0 - t * cs; return Math.abs(y) > H + 1e-9 ? -1 : k * k * y * y - z * z }
  const T = 4, M = 800, out: { pts: P2[]; closed: boolean }[] = []
  const edge = (bad: number, good: number) => { for (let i = 0; i < 40; i++) { const m = (bad + good) / 2; if (x2(m) >= 0) good = m; else bad = m } return good }
  let start: number | null = null
  for (let i = 0; i <= M + 1; i++) {
    const t = -T + 2 * T * i / M, ok = i <= M && x2(t) >= 0
    if (ok && start === null) start = i === 0 ? t : edge(t - 2 * T / M, t)
    if (!ok && start !== null) {
      const end = edge(t, t - 2 * T / M), plus: P2[] = [], minus: P2[] = []
      if (end - start > 1e-6) {
        for (let j = 0; j <= n; j++) {
          // 两头取得密一些：曲线在顶点处拐得急
          const u = (1 - Math.cos(Math.PI * j / n)) / 2, tt = start + (end - start) * u, s = Math.sqrt(Math.max(0, x2(tt)))
          plus.push([s, tt]); minus.push([-s, tt])
        }
        const a0 = plus[0][0] < 1e-4, a1 = plus[n][0] < 1e-4
        // 两头都收成一点：闭合的圈（圆、椭圆）。只有一头收成一点：从那一头的顶点向两边伸出去（抛物线、双曲线的一支）
        const pts = a0 && a1 ? [...plus, ...minus.reverse().slice(1)] : a1 ? [...plus, ...minus.reverse().slice(1)] : [...minus.reverse(), ...plus.slice(1)]
        out.push({ pts, closed: a0 && a1 })
      }
      start = null
    }
  }
  return out
}

// ---------- 第 2、3 课：椭圆 ----------
/** 第 2 课：绳长 2a = 10，钉距 2c 取三种（画板上的单位是 dm） */
export const STRING = 10
export const NAILS = [6, 8, 0] as const
/** 第 3 课：a = 5，c 取三种 */
export const A3 = 5
export const C3 = [3, 4, 1.4] as const
export const ellipseB = (a: number, c: number) => Math.sqrt(a * a - c * c)
export const ecc = (a: number, c: number) => c / a
export const ellipsePoint = (a: number, b: number, t: number): P2 => [a * Math.cos(t), b * Math.sin(t)]
/** 点到两个焦点 F₁(−c, 0)、F₂(c, 0) 的距离 */
export const focalRadii = (p: P2, c: number): [number, number] => [dist(p, [-c, 0]), dist(p, [c, 0])]
/** 把点代进 x²/a² + y²/b²：等于 1 在椭圆上，小于 1 在里面，大于 1 在外面 */
export const ellipseValue = (a: number, b: number, p: P2) => p[0] ** 2 / a ** 2 + p[1] ** 2 / b ** 2
/** 第 3 课要验的点 */
export const CHECK3: P2 = [3, 3.2]

// ---------- 第 4 课：双曲线 ----------
export const HYPER = { wide: { a: 3, b: 4 }, narrow: { a: 4, b: 3 } } as const
export type HyperKey = keyof typeof HYPER
export const hyperC = (a: number, b: number) => Math.sqrt(a * a + b * b)
/** 双曲线 x²/a² − y²/b² = 1 上的点：side = 1 是右支，−1 是左支 */
export const hyperPoint = (a: number, b: number, u: number, side: 1 | -1 = 1): P2 => [side * a * Math.cosh(u), b * Math.sinh(u)]
/** y 取这个值时，参数 u 是多少 */
export const hyperU = (b: number, y: number) => Math.asinh(y / b)
export const asymSlope = (a: number, b: number) => b / a

// ---------- 第 5、6 课：抛物线（天线的截面，x² = 2py，开口向上） ----------
/** 天线：口径 12 m，x² = 16y */
export const DISH = { p: 8, R: 6 }
export const paraY = (p: number, x: number) => x * x / (2 * p)
export const paraFocus = (p: number): P2 => [0, p / 2]
/** 抛物线上横坐标为 x 的点到焦点的距离、到准线 y = −p/2 的距离 */
export const paraFocalDist = (p: number, x: number) => dist([x, paraY(p, x)], paraFocus(p))
export const paraDirDist = (p: number, x: number) => paraY(p, x) + p / 2
/** 第 5 课量的三个点（横坐标） */
export const MEASURE5 = [0, 4, 6] as const
/**
 * 一条电波射到天线上：从高处的 (x0 − …) 沿和轴成 tilt 度的方向射下来，打在抛物线上横坐标为 x0 的点。
 * 返回入射方向、反射点、反射方向，以及反射线和对称轴的交点的纵坐标（不相交时为 null）
 */
export function dishRay(p: number, x0: number, tilt = 0) {
  const t = rad(tilt), dir: P2 = [Math.sin(t), -Math.cos(t)], hit: P2 = [x0, paraY(p, x0)]
  const out = unit(reflect(dir, [-x0, p]))
  const axisY = Math.abs(out[0]) < 1e-9 ? null : hit[1] - x0 * out[1] / out[0]
  return { dir, hit, out, axisY }
}
/** 第 6 课的六条电波（横坐标）。正中间那一条会被馈源挡住，不画 */
export const RAYS6 = [-5, -3.5, -2, 2, 3.5, 5] as const
/** 电波从多高的地方开始画（m，从顶点算起）、斜着进来时偏多少度 */
export const RAY_TOP = 9
export const RAY_TILT = 8
/** 从很高的同一个波前（y = top）到反射点再到焦点的路程：对每条平行于轴的电波都一样长，等于 top + p/2 */
export const dishPath = (p: number, x0: number, top: number) => top - paraY(p, x0) + paraFocalDist(p, x0)

// ---------- 第 7 课：行星的椭圆轨道 ----------
/** 长半轴 a（天文单位）、离心率 e */
export const ORBITS = {
  earth: { name: '地球', a: 1, e: 0.017 },
  mars: { name: '火星', a: 1.524, e: 0.093 },
  halley: { name: '哈雷彗星', a: 17.8, e: 0.967 },
} as const
export type OrbitKey = keyof typeof ORBITS
export const ORBIT_KEYS = Object.keys(ORBITS) as OrbitKey[]
export const perihelion = (a: number, e: number) => a * (1 - e)
export const aphelion = (a: number, e: number) => a * (1 + e)
/** 短半轴和长半轴的比 b/a = √(1 − e²) */
export const flatness = (e: number) => Math.sqrt(1 - e * e)
/** 开普勒方程 E − e sin E = M 的解（偏近点角） */
export function eccAnomaly(M: number, e: number) {
  let E = e < 0.8 ? M : Math.PI
  for (let i = 0; i < 60; i++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-12) break }
  return E
}
/** 一圈走了 frac（0–1，从近日点算起，按时间均匀）时的位置：椭圆中心在原点、太阳在右焦点 (ae, 0)。返回位置和到太阳的距离 */
export function orbitAt(a: number, e: number, frac: number): { p: P2; r: number } {
  const E = eccAnomaly(frac * 2 * Math.PI, e)
  return { p: [a * Math.cos(E), a * flatness(e) * Math.sin(E)], r: a * (1 - e * Math.cos(E)) }
}

// ---------- 拓展 ----------
/** 回音壁：椭圆形的矮墙，a = 5 m，b = 4 m，焦点相距 6 m */
export const WALL = { a: 5, b: 4, c: 3 }
/** 从左焦点朝椭圆上参数为 t 的点喊话：反射点、反射后的方向（单位向量）、总路程 */
export function ellipseBounce(a: number, b: number, t: number) {
  const c = Math.sqrt(a * a - b * b), hit = ellipsePoint(a, b, t), dir = unit([hit[0] + c, hit[1]])
  const out = unit(reflect(dir, [hit[0] / a ** 2, hit[1] / b ** 2]))
  return { hit, dir, out, path: dist(hit, [-c, 0]) + dist(hit, [c, 0]) }
}
export const WALL_T = [0.5, 1.15, 1.9, 2.6, -2.6, -1.9, -1.15, -0.5] as const
/** 从右焦点 F₂ 发出的光射到双曲线右支上参数为 u 的点：反射点、反射方向；反射线的反向延长线过左焦点 F₁ */
export function hyperBounce(a: number, b: number, u: number) {
  const c = hyperC(a, b), hit = hyperPoint(a, b, u), dir = unit([hit[0] - c, hit[1]])
  const out = unit(reflect(dir, [hit[0] / a ** 2, -hit[1] / b ** 2]))
  return { hit, dir, out }
}
export const MIRROR_U = [-1.0, -0.6, -0.25, 0.25, 0.6, 1.0] as const
/** 冷却塔：喉部半径 a（m）、喉部离地高、b、塔高。离地 y 处的半径 r = a√(1 + (y − 喉高)²/b²) */
export const TOWER = { a: 24, throat: 80, b: 58, top: 110, foot: 7 }
export const towerR = (y: number) => TOWER.a * Math.sqrt(1 + (y - TOWER.throat) ** 2 / TOWER.b ** 2)
/** 塔面上的一条直线：过喉部圆上角度为 phi 的点，dir = ±1 是两族直线。离地 y 处这条线上的点 [x, y, z] */
export function towerLine(phi: number, dir: 1 | -1, y: number): [number, number, number] {
  const s = (y - TOWER.throat) / TOWER.b
  return [TOWER.a * (Math.cos(phi) - dir * s * Math.sin(phi)), y, TOWER.a * (Math.sin(phi) + dir * s * Math.cos(phi))]
}
