// 光的折射和凸透镜成像实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 长度用厘米，角度用度；取值约定写在规格卡 docs/specs/lens.md 里。
const RAD = Math.PI / 180

// ---------- 第 1 课：光的折射 ----------
export const N_WATER = 1.33
export const ANGLES = [0, 30, 60] as const
/** 光从空气斜射进水里：折射角（度）。sin i = n · sin r */
export const refract = (i: number, n = N_WATER) => Math.asin(Math.sin(i * RAD) / n) / RAD

/** 光从水里斜射向空气：折射角比入射角大。入射角太大时折射光线消失，光全部反射回水里（全反射，高中才学），这时返回 null */
export const refractOut = (i: number, n = N_WATER) => { const x = Math.sin(i * RAD) * n; return x >= 1 ? null : Math.asin(x) / RAD }

// ---------- 第 2 课：透镜对光的作用 ----------
export const F = 10      // 这块凸透镜的焦距（cm）
export const LENSES = {
  convex: { name: '凸透镜', shape: '中间厚、边缘薄', act: '会聚', say: '平行于主光轴的光通过它以后会聚到一点，这一点叫焦点' },
  concave: { name: '凹透镜', shape: '中间薄、边缘厚', act: '发散', say: '平行光通过它以后散开了，反向延长才交于一点（虚焦点）' },
} as const
export type LensKey = keyof typeof LENSES

// ---------- 第 3–5 课：凸透镜成像 ----------
export const US = [30, 20, 15, 5] as const
/** 像距（cm）：1/u + 1/v = 1/f。正数是实像（在透镜另一侧），负数是虚像（和物体同侧）；u = f 时不成像 */
export const imageDistance = (u: number, f = F) => u === f ? Infinity : u * f / (u - f)
/** 像是物体的多少倍 */
export const magnify = (u: number, f = F) => Math.abs(imageDistance(u, f) / u)
export interface Image { real: boolean; upright: boolean; size: '缩小' | '等大' | '放大'; text: string; use: string }
/** 像的性质 */
export function nature(u: number, f = F): Image | null {
  if (u === f) return null
  if (u > 2 * f) return { real: true, upright: false, size: '缩小', text: '倒立、缩小的实像', use: '照相机' }
  if (u === 2 * f) return { real: true, upright: false, size: '等大', text: '倒立、等大的实像', use: '测焦距' }
  if (u > f) return { real: true, upright: false, size: '放大', text: '倒立、放大的实像', use: '投影仪' }
  return { real: false, upright: true, size: '放大', text: '正立、放大的虚像', use: '放大镜' }
}
/** 透镜的半径（cm）和蜡烛的高度（cm） */
export const LENS_R = 8, CANDLE = 7
/** 光屏放在离透镜 screen 厘米处时，烛焰尖上发出的光在屏上摊成多大一片（cm）。正好在像的位置时是 0：像最清楚 */
export const blurSize = (u: number, screen: number, f = F) => { const v = imageDistance(u, f); return v > 0 && Number.isFinite(v) ? 2 * LENS_R * Math.abs(screen - v) / v : 2 * LENS_R * (1 + screen * (f - u) / (u * f)) }

export const RAYS = [
  { key: 'parallel', name: '平行于主光轴的光', say: '通过凸透镜后经过另一侧的焦点' },
  { key: 'center', name: '通过光心的光', say: '传播方向不变' },
  { key: 'focus', name: '通过焦点的光', say: '通过凸透镜后平行于主光轴' },
] as const
export const DEVICES = {
  camera: { name: '照相机', u: 30, where: '物体在二倍焦距以外', say: '镜头相当于凸透镜，在感光元件上成倒立、缩小的实像' },
  projector: { name: '投影仪', u: 15, where: '物体在一倍和二倍焦距之间', say: '在屏幕上成倒立、放大的实像，所以胶片要倒着放' },
  magnifier: { name: '放大镜', u: 5, where: '物体在一倍焦距以内', say: '透过透镜看到正立、放大的虚像，光屏接不到' },
} as const
export type DeviceKey = keyof typeof DEVICES

// ---------- 第 6 课：眼睛和眼镜 ----------
export const EYE = 2.4     // 模型里晶状体到视网膜的距离（cm）
export const EYES = {
  normal: { name: '正常的眼睛', f: 2.4, glasses: null, say: '远处来的平行光正好会聚在视网膜上' },
  near: { name: '近视眼', f: 2.1, glasses: 'concave', say: '晶状体太厚、折光太强，或者眼球前后方向太长，光会聚在视网膜前面' },
  far: { name: '远视眼', f: 2.8, glasses: 'convex', say: '晶状体太薄、折光太弱，或者眼球前后方向太短，光要到视网膜后面才会聚' },
} as const
export type EyeKey = keyof typeof EYES
/** 平行光进入眼睛后会聚在离晶状体多远的地方（cm）；戴上合适的眼镜就落回视网膜上 */
export const focusAt = (eye: EyeKey, glasses: boolean) => glasses && EYES[eye].glasses ? EYE : EYES[eye].f
export const where = (eye: EyeKey, glasses: boolean) => { const d = focusAt(eye, glasses) - EYE; return Math.abs(d) < 1e-9 ? '视网膜上' : d < 0 ? '视网膜前面' : '视网膜后面' }

// ---------- 第 7 课：望远镜和显微镜 ----------
export const SCOPES = {
  telescope: { name: '望远镜', steps: ['物镜把远处物体射来的光会聚，成一个倒立、缩小的实像', '目镜像放大镜一样，把这个实像再放大'] },
  microscope: { name: '显微镜', steps: ['物镜离标本很近，成一个倒立、放大的实像', '目镜把这个实像再放大一次：两次放大'] },
} as const
export type ScopeKey = keyof typeof SCOPES

// ---------- 拓展：变焦 ----------
export const ZOOM = { u: 60, f: [10, 20] as const }
