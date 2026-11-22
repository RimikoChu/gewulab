// 光的反射和平面镜实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 长度用厘米，角度用度；取值约定写在规格卡 docs/specs/mirror.md 里。
const RAD = Math.PI / 180
/** 光路所在平面里的一个点或一个方向：[横, 竖] */
export type V2 = [number, number]

// ---------- 通用：反射定律 ----------
/** 反射光线的方向：d 是入射光线的方向，n 是法线（单位向量）。r = d − 2(d·n)n */
export const reflect = (d: V2, n: V2): V2 => { const k = 2 * (d[0] * n[0] + d[1] * n[1]); return [d[0] - k * n[0], d[1] - k * n[1]] }
/** 一条光线和法线的夹角（度，0 到 90） */
export const angleTo = (d: V2, n: V2) => Math.acos(Math.min(1, Math.abs(d[0] * n[0] + d[1] * n[1]) / (Math.hypot(d[0], d[1]) * Math.hypot(n[0], n[1])))) / RAD

// ---------- 第 1 课：光沿直线传播，小孔成像 ----------
/** 蜡烛（连火焰）高 6 cm；半透明屏离小孔 15 cm；蜡烛离小孔的三个距离 */
export const CANDLE = 6, SCREEN = 15, HOLE_US = [30, 15, 10] as const
/** 小孔成像的像高（cm）：物高 × 像距 ÷ 物距（相似三角形） */
export const pinholeHeight = (u: number, h = CANDLE, v = SCREEN) => h * v / u
export const pinholeSize = (u: number) => { const k = pinholeHeight(u) / CANDLE; return Math.abs(k - 1) < 1e-9 ? '等大' : k < 1 ? '缩小' : '放大' }

// ---------- 第 2 课：光的反射定律 ----------
export const ANGLES = [30, 45, 60] as const
/** 镜面水平、法线竖直：入射角 i 的光从左上方射来。返回入射光线和反射光线的方向，以及量出来的反射角 */
export function bounce(i: number) {
  const d: V2 = [Math.sin(i * RAD), -Math.cos(i * RAD)], out = reflect(d, [0, 1])
  return { d, out, r: angleTo(out, [0, 1]) }
}

// ---------- 第 3 课：镜面反射和漫反射 ----------
/** 一束平行光的入射角（对整块表面的法线）；五条光线落在表面上的位置（cm）；白纸表面在这五处各自歪了多少度 */
export const BEAM_IN = 40, SPOTS = [-8, -4, 0, 4, 8] as const, TILTS = [-16, 12, -5, 20, -10] as const
export const SURFACES = {
  mirror: { name: '镜面', kind: '镜面反射', say: '反射光线仍然互相平行，只朝一个方向射出' },
  paper: { name: '白纸', kind: '漫反射', say: '反射光线射向四面八方' },
} as const
export type SurfaceKey = keyof typeof SURFACES
export interface Bounce { x: number; n: V2; out: V2; i: number; r: number; dir: number }
/** 五条平行光各自怎样反射：n 是落点处的法线，i、r 是相对这条法线的入射角和反射角，dir 是反射光线偏离竖直方向多少度 */
export function scatter(kind: SurfaceKey): Bounce[] {
  const d: V2 = [Math.sin(BEAM_IN * RAD), -Math.cos(BEAM_IN * RAD)]
  return SPOTS.map((x, k) => {
    const t = (kind === 'mirror' ? 0 : TILTS[k]) * RAD, n: V2 = [-Math.sin(t), Math.cos(t)], out = reflect(d, n)
    return { x, n, out, i: angleTo(d, n), r: angleTo(out, n), dir: Math.atan2(out[0], out[1]) / RAD }
  })
}
/** 放大了的白纸表面：一条高低不平的折线（cm）。五条光线各落在一小段斜面的正中 */
export function paperProfile(): V2[] {
  const W = 1.4, mid = [-0.5, 0.45, -0.55, 0.5], pts: V2[] = [[-12, -0.3], [-10.6, 0.35]]
  SPOTS.forEach((x, k) => {
    const s = Math.tan(TILTS[k] * RAD) * W
    pts.push([x - W, -s], [x + W, s])
    if (k < mid.length) pts.push([x + 2, mid[k]])
  })
  pts.push([10.6, -0.4], [12, 0.2])
  return pts
}

// ---------- 第 4、5 课：平面镜成像 ----------
export const PLATE_US = [6, 9, 12] as const
export const DRAW_US = [8, 14] as const
/** 平面镜成的像和物体关于镜面对称。镜面在 x = mx 处：点 p 的像 */
export const mirrorPoint = (p: V2, mx = 0): V2 => [2 * mx - p[0], p[1]]
/** 像到镜面的距离等于物体到镜面的距离 */
export const imageDistance = (u: number) => Math.abs(mirrorPoint([-u, 0])[0])
/** 镜面在 x = 0，物点 S 在镜前。要让反射光线射到 E，光该打在镜面的哪个高度：像点和 E 的连线与镜面的交点 */
export const hitHeight = (S: V2, E: V2) => { const I = mirrorPoint(S); return I[1] + (E[1] - I[1]) * I[0] / (I[0] - E[0]) }

// ---------- 第 6 课：平面镜的应用 ----------
/** 人偶的身高和眼睛的高度（cm）；它离镜子的两个距离 */
export const DOLL = { height: 16, eye: 15 }, DOLL_US = [10, 18] as const
/** 照见全身，镜子至少要多长、该挂在哪：下沿在眼睛高度的一半，上沿在头顶和眼睛的正中，长度是身高的一半。和人离镜子多远无关 */
export const mirrorNeed = (height: number = DOLL.height, eye: number = DOLL.eye) => ({ bottom: eye / 2, top: (height + eye) / 2, length: height / 2 })
/** 光被一面镜子反射后，传播方向改变了多少度 */
export const turnAngle = (i: number) => 180 - 2 * i
/** 潜望镜里两面镜子都和光线成 45° */
export const PERISCOPE = 45

// ---------- 第 7 课：凸面镜和凹面镜 ----------
/** 球面镜的半径（cm）；五条平行光离主轴的高度（cm） */
export const R_CURVE = 20, RAY_HS = [-5, -2.5, 0, 2.5, 5] as const
export const CURVES = {
  concave: { name: '凹面镜', act: '会聚', say: '平行光被它反射后会聚到一点', use: '太阳灶', useSay: '太阳灶用凹面镜把太阳光会聚到锅底，把水烧开。手电筒、汽车头灯的反光碗反过来用：把灯泡放在会聚点上，射出去的就是平行光' },
  convex: { name: '凸面镜', act: '发散', say: '平行光被它反射后向四周散开', use: '街角的反光镜', useSay: '凸面镜把光发散，镜子里能照到的范围比同样大的平面镜大得多。路口拐弯处的反光镜、汽车的后视镜用的都是它' },
} as const
export type CurveKey = keyof typeof CURVES
/** 一条平行于主轴、离主轴 h 的光射到球面镜上：落点、法线、反射方向，以及反射光线（或它的反向延长线）和主轴相交在哪。镜面顶点在原点，光从左边来 */
export function curveRay(kind: CurveKey, h: number, R = R_CURVE) {
  const sag = R - Math.sqrt(R * R - h * h), s = kind === 'concave' ? -1 : 1
  const hit: V2 = [s * sag, h], c: V2 = [s * R, 0]
  const n: V2 = [-s * (hit[0] - c[0]) / R, -s * (hit[1] - c[1]) / R]
  const out = reflect([1, 0], n)
  return { hit, n, out, cross: Math.abs(out[1]) < 1e-12 ? null : hit[0] - hit[1] * out[0] / out[1] }
}

// ---------- 拓展 ----------
/** 两面镜子夹成 angle 度，中间放一个物体，能看到几个像 */
export const imageCount = (angle: number) => Math.round(360 / angle) - 1
/** 这些像各在哪个方向（从第一面镜子量起的角度）；flip 表示这个像是左右相反的。物体在 theta 处 */
export function wedgeImages(theta: number, alpha: number) {
  const n = Math.round(360 / alpha), out: { a: number; flip: boolean }[] = []
  for (let m = 0; m < n / 2; m++) { if (m > 0) out.push({ a: 2 * m * alpha + theta, flip: false }); out.push({ a: 2 * (m + 1) * alpha - theta, flip: true }) }
  return out
}
export const WEDGES = [90, 60] as const
/** 角反射器：两面互相垂直的镜子。光先后被两面镜子各反射一次 */
export const retro = (d: V2): V2 => reflect(reflect(d, [0, 1]), [1, 0])
export const RETRO_IN = [35, 55] as const
