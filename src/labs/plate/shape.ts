// 大剖面的形状：一条从太平洋经安第斯山、南美洲、大西洋中脊、非洲、东非大裂谷、印度洋、印度到喜马拉雅山和青藏高原的“地球切片”。
// 这里只管形状（地面高低、每一处从上到下是哪几层岩石），画法在 section.tsx。画面单位：x 沿剖面（西→东），y 朝上（海平面 0），z 朝镜头（剖面在 z = 0）。
// 不按比例：水平方向大大压缩，地形竖直放大约 40 倍，深处的分层竖直放大约 6 倍。界面上的数都来自 physics.ts，不从这里量。

/** 剖面上几处地方的 x */
export const X = {
  west: -420, trench: -262, andes: -238, saCoast: -150, ridge: -40, afCoast: 70, rift: 140, kili: 156, afEast: 192, inCoast: 250, suture: 318, east: 440,
} as const
/** 地形：1 km 的海拔画多高；深处：1 km 的深度画多深 */
export const TOPO = 0.8, DEEP = 0.2
/** 陆地再放大一些，山和高原才看得出来 */
export const LAND = 1.35
/** 剖面画到多深 */
export const BOTTOM = -70

/** 材料编号（着色器里同样的编号） */
export const MAT = { water: 1, sed: 2, ocrust: 3, ucrust: 4, lcrust: 5, lmantle: 6, astheno: 7, strata: 9 } as const
/** 洋底岩石跟着哪一块在动：着色器按它让花纹流动 */
export const FLOW = { none: 0, ridgeW: 1, ridgeE: 2, pacific: 3, india: 4 } as const

/** 会变的地形：张裂到哪一步（0 完整的大陆，1 裂谷（今天的东非），2 狭长的海）；碰撞到哪一步（0 还隔着大洋，0.5 刚碰上，1 今天） */
export interface Shape { rift: number; collide: number }
export const NOW: Shape = { rift: 1, collide: 1 }

// ---------- 小工具 ----------
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
function hash(i: number, j: number) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
/** 值噪声，0–1 */
export function vnoise(x: number, y: number) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy)
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
export function fbm(x: number, y: number, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * (vnoise(x * f, y * f) - 0.5); f *= 2.03; a *= 0.5 } return s * 2 }
/** 远处网格的行距大约多大（和 section.tsx 里的网格一致：近处 0.45，往后每行大 13%） */
export const rowGap = (z: number) => 0.45 + 0.13 * Math.max(0, -z)
/** 带低通的噪声：波长不到网格行距 3 倍的那几层去掉，远处才不会被拉成一道道竖纹 */
export function fbmL(x: number, y: number, f: number, oct: number, gap: number) {
  let s = 0, a = 0.5, k = f
  for (let i = 0; i < oct; i++) { const lam = 1 / k, w = sm(gap * 3, gap * 5, lam); s += a * w * (vnoise(x * k, y * k) - 0.5); k *= 2.03; a *= 0.5 }
  return s * 2
}
/** 按控制点平滑连起来（余弦插值） */
function curve(pts: [number, number][], x: number) {
  if (x <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    if (x <= x1) { const [x0, y0] = pts[i - 1], t = (x - x0) / (x1 - x0 || 1); return lerp(y0, y1, (1 - Math.cos(t * Math.PI)) / 2) }
  }
  return pts[pts.length - 1][1]
}
export const bump = (x: number, c: number, w: number) => { const t = (x - c) / w; return Math.abs(t) >= 1 ? 0 : (1 + Math.cos(t * Math.PI)) / 2 }

// ---------- 地形（剖面上的地面高度） ----------
const WEST: [number, number][] = [
  [-900, -5.0], [-420, -5.1], [-320, -5.0], [-285, -5.4], [X.trench - 5, -8.2], [X.trench, -9.0], [X.trench + 4, -7.6], [X.trench + 11, -3.6], [X.trench + 17, -0.4],
  [X.trench + 20, 2.2], [X.andes - 1.5, 6.4], [X.andes + 1.5, 6.5], [-231, 4.6], [-224, 3.0], [-214, 1.3], [-202, 0.55], [-175, 0.4], [-158, 0.25], [X.saCoast, 0.04],
  [-146, -0.35], [-141, -1.1], [-131, -4.0], [-110, -4.7], [-85, -4.4], [-64, -3.7], [-50, -3.0], [-44, -2.45], [-41.6, -2.6], [-40, -3.05], [-38.4, -2.6], [-36, -2.45],
  [-30, -3.0], [-16, -3.7], [5, -4.4], [30, -4.7], [50, -4.1], [59, -1.1], [65, -0.3], [X.afCoast, 0.05], [76, 0.65], [88, 1.15], [96, 1.3],
]
/** 东非：张裂的样子随 r 变 */
function riftH(x: number, r: number) {
  const d = Math.abs(x - X.rift)
  const w = riftHalf(r)                                            // 谷底半宽
  const lift = r <= 1 ? 0.55 * r : 0.55 - 0.3 * (r - 1)            // 两侧的肩隆起：缓缓的，不高
  const floor = riftFloor(r)                                       // 谷底
  const plateau = 1.35 + 0.25 * Math.exp(-(((x - X.rift) / 40) ** 2))
  const shoulder = plateau + lift * Math.exp(-(((d - w - 4) / 24) ** 2)) * sm(0, 2, d - w)
  // 谷底略向中间低一点；两侧是陡的断崖
  const bottom = floor - 0.15 * (1 - (d / Math.max(1, w)) ** 2)
  let h = d < w ? bottom : lerp(bottom, shoulder, sm(w, w + 2.2, d))
  h = lerp(plateau, h, sm(0, 0.25, r))                              // 还没张裂时是一整块平缓的高原
  // 狭长的海中间新长出来的洋中脊
  if (r > 1.4) h += 0.9 * sm(1.4, 2, r) * bump(x, X.rift, 4)
  // 东岸
  return lerp(h, curve([[178, 0.6], [186, 0.35], [X.afEast, 0.04], [196, -0.3], [200, -1.2], [210, -4.2], [222, -4.6]], x), sm(176, 186, x))
}
/** 火山的中心在剖面后面多远 */
export const KILI_Z = -3
/** 裂谷谷底的半宽、谷底高度（未放大的地形单位） */
export const riftHalf = (r: number) => (r <= 1 ? 3 + 7 * r : 10 + 16 * (r - 1))
export const riftFloor = (r: number) => (r <= 1 ? 1.35 - 1.05 * r : 0.3 - 2.9 * (r - 1))
/** 裂谷里的湖：张裂到裂谷那一步才有，变成海以后就没了。返回湖面高度（放大后的画面单位）和有多满（0–1） */
export function riftLake(r: number) {
  const on = sm(0.55, 0.85, r) * (1 - sm(1.25, 1.45, r))
  return { y: riftFloor(r) * LAND + 0.35, on, half: riftHalf(r) - 1.2 }
}
/** 剖面深处压扁一些：海平面以下 6 个单位往下，竖直方向只画 0.55 倍，地表和地壳在画面里才占主体 */
export const deep = (y: number) => (y > -6 ? y : -6 + (y + 6) * 0.55)
/** 碰撞：印度和亚洲，随 c 变 */
export const indiaShift = (c: number) => -50 * (1 - sm(0, 0.5, c))
export const peakUnits = (m: number) => (m / 1000) * TOPO
export const tibetH = (c: number) => lerp(0.7, 3.6, sm(0.45, 1, c))
function collideH(x: number, c: number, peakM: number) {
  const off = indiaShift(c), north = X.suture - 12 + off            // 印度大陆北缘
  const ocean = -4.6
  // 印度洋—印度—特提斯洋—亚洲
  const india = curve([[X.inCoast + off - 12, -4.4], [X.inCoast + off - 4, -1.2], [X.inCoast + off, 0.04], [X.inCoast + off + 8, 0.35], [north - 6, 0.4], [north, -0.2], [north + 4, -1.5], [north + 10, -4.4]], x)
  const trench = X.suture - 4
  const seaBetween = c < 0.5 ? ocean - 2.2 * bump(x, trench, 5) * (1 - sm(0.3, 0.5, c)) : ocean
  const asia = curve([[X.suture - 3, -6], [X.suture + 1, -2.5], [X.suture + 6, 0.6], [X.suture + 12, 1.4 + 0.6 * (1 - sm(0.45, 1, c))], [X.suture + 26, tibetH(c)], [900, tibetH(c)]], x)
  let h = Math.max(x < north + 10 ? india : seaBetween, seaBetween, asia)
  if (x < X.inCoast + off - 12) h = ocean
  // 喜马拉雅山：碰上以后才长；主峰在缝合线南边一点，北坡接青藏高原
  const pk = peakUnits(peakM)
  if (pk > 0) {
    const m = pk * (0.78 * bump(x, X.suture - 6, 13) + 0.22 * bump(x, X.suture - 6, 4.5)) + pk * 0.3 * bump(x, X.suture - 19, 7)
    h = Math.max(h, lerp(h, m + 0.4, sm(0, 1, m)))
  }
  return h
}
/** 剖面线上（z = 0）不带细节的地面高度 */
export function baseH(x: number, s: Shape, peakM: number) {
  if (x < 96) return curve(WEST, x)
  if (x < 222) return lerp(riftH(x, s.rift), collideH(x, s.collide, peakM), sm(205, 222, x))
  return collideH(x, s.collide, peakM)
}
/** 地形起伏的幅度：山地大、平原小、洋底一点点 */
function roughness(x: number, h: number) {
  if (h < -0.4) return 0.22 + 0.25 * bump(x, X.ridge, 30)
  return 0.12 + 0.11 * Math.max(0, h)
}
/** 往后（z 越小越远）地貌的走向略有弯曲 */
export const wiggle = (z: number) => 5 * Math.sin(z * 0.011) + 2.2 * Math.sin(z * 0.029 + 1.3)
/** 场景里任意一点的地面高度：剖面线（z = 0）上的就是剖面的顶 */
export function heightAt(x: number, z: number, s: Shape, peakM: number) {
  const xs = x + wiggle(z) - wiggle(0)
  const hb = baseH(xs, s, peakM), h0 = hb > 0 ? hb * LAND : hb
  const r = roughness(xs, h0)
  const gap = rowGap(z)
  let h = h0 + r * fbmL(xs, z, 0.09, 4, gap) * 2.4
  if (h0 > 2) h += (h0 - 2) * 0.32 * fbmL(xs + 140, z, 0.05, 3, gap)      // 山脉沿走向起伏，有峰有坳
  // 裂谷边上的火山：一座孤立的锥，中心在剖面后面一点，剖面正好切过它
  if (xs > X.rift && xs < X.kili + 14) {
    const kv = 4.7 * LAND * sm(0.55, 1, s.rift) * (1 - sm(1.15, 1.5, s.rift)), dk = Math.hypot(xs - X.kili, (z - KILI_Z) * 0.9)
    if (kv > 0 && dk < 11) h = Math.max(h, 1.6 * LAND + kv * (1 - dk / 11) ** 1.5 - (dk < 1.1 ? 0.4 * (1 - dk / 1.1) : 0))
  }
  // 离海岸线近的地方别让噪声把海岸弄成一片碎岛
  if (Math.abs(h0) < 0.5) h = h0 + (h - h0) * 0.4
  return h
}

// ---------- 剖面上从上到下的分层 ----------
/** 一层：从 y 往下是材料 mat，直到下一层；u 是花纹的流动坐标，flow 是它跟着谁动 */
export interface Layer { y: number; mat: number; u: number; flow: number }
export const MAX_LAYERS = 12
/** 俯冲板块的顶面：离海沟 dx 处有多深 */
export const slabTop = (dx: number, hT = -9) => hT - 0.6 * dx - 0.004 * dx * dx

/** 从上到下按厚度往下排；thick 小的跳过 */
function stack(top: number, parts: [number, number][], flow: number, u: number, out: Layer[]) {
  let y = top
  for (const [mat, t] of parts) { if (t < 0.02) continue; out.push({ y, mat, u, flow }); y -= t }
  out.push({ y, mat: MAT.astheno, u, flow: FLOW.none })
  return out
}
/** 大陆和大洋过渡处岩石圈地幔的厚度：让岩石圈的底从大陆的（-23）平滑过渡到大洋的（海底往下 17），不出台阶。cont 是“像大陆”的程度 */
function lmTo(h: number, above: number[], cont: number) {
  const crustBottom = h - above.reduce((a, b) => a + b, 0)
  return Math.max(0.3, crustBottom - lerp(h - 17, -23, cont))
}
/** 大洋的一列：海水、沉积物、洋壳、岩石圈地幔；litho 是岩石圈从海底往下有多厚 */
function oceanColumn(x: number, h: number, sed: number, litho: number, flow: number, u: number) {
  const out: Layer[] = h < 0 ? [{ y: 0, mat: MAT.water, u, flow }] : []
  void x
  return stack(h, [[MAT.sed, sed], [MAT.ocrust, 1.5], [MAT.lmantle, Math.max(0.3, litho - 1.5 - sed)]], flow, u, out)
}
/** 大陆的一列：上地壳、下地壳、岩石圈地幔（地面在海平面以下就先放海水） */
function landColumn(h: number, up: number, low: number, moho: number, litho: number, flow = FLOW.none, u = 0) {
  const out: Layer[] = h < 0 ? [{ y: 0, mat: MAT.water, u, flow }] : []
  const ub = h - up
  return stack(h, [[MAT.ucrust, up], [MAT.lcrust, Math.max(0.2, ub - moho)], [MAT.lmantle, moho - litho]], flow, u, out)
}
/** 俯冲：上面的板块切到板块顶面为止，再接上斜插下去的洋板块 */
function withSlab(over: Layer[], yS: number, u: number, flow: number) {
  const out = over.filter(l => l.y > yS + 0.05)
  out.push({ y: yS, mat: MAT.sed, u, flow }, { y: yS - 0.35, mat: MAT.ocrust, u, flow }, { y: yS - 1.85, mat: MAT.lmantle, u, flow }, { y: yS - 16.5, mat: MAT.astheno, u, flow: FLOW.none })
  return out
}

/** 在第 i 层的顶上盖一层 t 厚的沉积岩层（原来那层的顶往下挪，不越过再下面一层） */
function cap(over: Layer[], i: number, t: number) {
  const top = over[i].y
  over.splice(i, 0, { y: top, mat: MAT.strata, u: 0, flow: FLOW.none })
  over[i + 1].y = Math.max(top - t, (over[i + 2]?.y ?? top - t - 1) + 0.3)
}
/** 剖面上 x 处从上到下的各层：各层的顶必须一层比一层低 */
export function column(x: number, s: Shape, peakM: number): Layer[] {
  const ls = rawColumn(x, s, peakM)
  for (const l of ls) l.y = deep(l.y)
  for (let i = 1; i < ls.length; i++) if (ls[i].y > ls[i - 1].y - 0.01) ls[i].y = ls[i - 1].y - 0.01
  return ls
}
function rawColumn(x: number, s: Shape, peakM: number): Layer[] {
  const h = heightAt(x, 0, s, peakM)
  // 太平洋：老的洋板块朝海沟走
  if (x < X.trench) {
    return oceanColumn(x, h, 0.35, 17, FLOW.pacific, x)
  }
  // 安第斯山和南美洲：大陆在上，太平洋板块从下面斜插进去
  if (x < X.saCoast + 4) {
    const dx = x - X.trench, root = 6 * bump(x, X.andes + 4, 30), wedge = 1 - sm(0, 16, dx)
    const over = landColumn(h, 3.6 * (1 - wedge * 0.9) + root * 0.4, 0, -7 - root, -23, FLOW.none, 0)
    if (wedge > 0.02) cap(over, h < 0 ? 1 : 0, 3 * wedge)       // 海沟边上刮下来堆着的沉积物
    const yS = slabTop(dx)
    return yS > BOTTOM - 20 ? withSlab(over, yS, X.trench + dx * 1.17, FLOW.pacific) : over
  }
  // 大西洋：中脊两侧对称地往外推
  if (x < X.afCoast - 2) {
    const toW = sm(X.saCoast - 4, X.saCoast + 14, x), toE = 1 - sm(X.afCoast - 16, X.afCoast + 2, x)
    const cont = Math.max(1 - toW, 1 - toE)                                         // 靠近大陆的那一截还是大陆地壳
    const s_ = Math.abs(x - X.ridge), age = Math.min(1, s_ / 95)
    const flow = x < X.ridge ? FLOW.ridgeW : FLOW.ridgeE
    if (cont > 0.02) {
      const out: Layer[] = h < 0 ? [{ y: 0, mat: MAT.water, u: x - X.ridge, flow }] : []
      return stack(h, [[MAT.sed, 0.6 + 0.6 * cont], [MAT.ucrust, 3.4 * cont], [MAT.lcrust, 3.2 * cont], [MAT.ocrust, 1.5 * (1 - cont)], [MAT.lmantle, lmTo(h, [0.6 + 0.6 * cont, 3.4 * cont, 3.2 * cont, 1.5 * (1 - cont)], cont)]], flow, x - X.ridge, out)
    }
    return oceanColumn(x, h, 0.05 + 0.6 * age, 2.2 + 15 * Math.sqrt(age), flow, x - X.ridge)
  }
  // 非洲：大陆，中间被东非大裂谷拉薄
  if (x < 204) {
    const d = Math.abs(x - X.rift), r = s.rift
    const thin = (r <= 1 ? 0.45 * r : 0.45 + 0.4 * (r - 1)) * Math.exp(-((d / (16 + 10 * r)) ** 2))
    const toE = sm(184, 200, x)
    const oceanic = r > 1 && d < 16 * (r - 1)                                                     // 狭长的海：中间已经是新的洋壳
    const litho = -23 + 15 * thin * 1.4
    if (oceanic) return oceanColumn(x, h, 0.05, 2.2 + 0.3 * d, x < X.rift ? FLOW.ridgeW : FLOW.ridgeE, x - X.rift)
    if (toE > 0.02) {
      const out: Layer[] = h < 0 ? [{ y: 0, mat: MAT.water, u: x, flow: FLOW.india }] : []
      return stack(h, [[MAT.sed, 0.5 + 0.6 * (1 - toE)], [MAT.ucrust, 3.4 * (1 - toE)], [MAT.lcrust, 3.2 * (1 - toE)], [MAT.ocrust, 1.5 * toE], [MAT.lmantle, lmTo(h, [0.5 + 0.6 * (1 - toE), 3.4 * (1 - toE), 3.2 * (1 - toE), 1.5 * toE], 1 - toE)]], FLOW.india, x, out)
    }
    const land = landColumn(h, 3.6 * (1 - thin), 0, -7 * (1 - thin * 0.9) + (h - 1.3) * 0.2, litho)
    const lake = riftLake(r)
    if (lake.on > 0.05 && d < lake.half && h < lake.y) land.unshift({ y: lake.y, mat: MAT.water, u: 0, flow: FLOW.none })
    return land
  }
  // 印度洋—印度—（特提斯洋）—喜马拉雅—青藏高原
  const c = s.collide, off = indiaShift(c), north = X.suture - 12 + off
  const inLand = x > X.inCoast + off - 8 && x < north + 8
  const k = sm(0.45, 1, c)
  if (x < X.inCoast + off - 8) return oceanColumn(x, h, 0.7, 17, FLOW.india, x - off)
  if (inLand && x < X.suture - 16) {
    const toW = 1 - sm(X.inCoast + off - 8, X.inCoast + off + 6, x)
    const toN = c < 0.5 ? sm(north - 8, north + 8, x) : 0
    const t = Math.max(toW, toN)
    const out: Layer[] = h < 0 ? [{ y: 0, mat: MAT.water, u: x - off, flow: FLOW.india }] : []
    return stack(h, [[MAT.sed, 0.4 + 0.5 * t], [MAT.ucrust, 3.4 * (1 - t)], [MAT.lcrust, 3.2 * (1 - t)], [MAT.ocrust, 1.5 * t], [MAT.lmantle, lmTo(h, [0.4 + 0.5 * t, 3.4 * (1 - t), 3.2 * (1 - t), 1.5 * t], 1 - t)]], FLOW.india, x - off, out)
  }
  // 还没碰上：中间是正在俯冲到亚洲下面的特提斯洋
  if (c < 0.5 && x < X.suture - 4) {
    const out = oceanColumn(x, h, 0.9, 17, FLOW.india, x - off)
    out[1].mat = MAT.strata                                                                       // 海底的沉积物：里面埋着海洋生物
    return out
  }
  // 亚洲（青藏高原），碰撞以后地壳加厚一倍；喜马拉雅山的上部是原来海底的沉积岩层
  const root = (3 + 6.5 * k) * sm(X.suture - 18, X.suture + 30, x) * (x < 520 ? 1 : 1 - sm(520, 620, x))
  const pk = peakUnits(peakM)
  const strataT = pk > 0 ? Math.max(0, (pk * 0.85 + 1.4) * bump(x, X.suture - 8, 16)) : 0
  const over = landColumn(h, 3.8 + root * 0.45, 0, -7 - root, -24 - root * 0.4)
  if (strataT > 0.05) cap(over, 0, strataT)
  if (c < 0.5) {
    const dx = x - (X.suture - 4), yS = slabTop(dx, -6.5)
    if (yS > BOTTOM - 20) return withSlab(over, yS, dx, FLOW.india)
  } else {
    // 碰上以后：原来那块洋板块断开，往深处沉下去
    const dx = x - (X.suture - 4), yS = slabTop(dx, -6.5) - 70 * sm(0.5, 0.85, c) - 26
    if (dx > 0 && yS > BOTTOM - 20 && yS < -26) {
      const out = over.filter(l => l.y > yS + 0.05)
      out.push({ y: yS, mat: MAT.lmantle, u: dx, flow: FLOW.none }, { y: yS - 12, mat: MAT.astheno, u: 0, flow: FLOW.none })
      return out
    }
  }
  return over
}
