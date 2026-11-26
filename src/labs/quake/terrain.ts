// 龙门山沙盘的地形（示意）：西北是高山和高原，中间是龙门山，东南是成都平原，岷江从山里穿出来。
// 单位 km，坐标同 physics.ts（原点映秀，x 指向东南，−z 指向东北）。这里只管画面上的地形，不做课上要读的计算。
import { CITIES } from './physics'

export const X0 = -70, X1 = 110, Z0 = -135, Z1 = 25
/** 前缘滑块：z 从 0 到 Z1 的一条，第 1 课把它挪开，露出穿过震中的剖面 */
export const CUT_Z = 0
/** 地块的底面（km，按实际深度） */
export const FLOOR = -24
/** 地形高度放大 2 倍；地下按实际深度 */
export const VE = 2
export const Y = (hKm: number) => hKm * VE

function hash(x: number, y: number) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
export function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
export function fbm(x: number, y: number, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * noise(x * f, y * f); f *= 2.03; a *= 0.5 } return s }
function ridged(x: number, y: number) { let s = 0, a = 0.6, f = 1; for (let i = 0; i < 5; i++) { s += a * (1 - Math.abs(noise(x * f + i * 7.3, y * f) * 2 - 1)) ** 2; f *= 2.05; a *= 0.5 } return s }
export const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k) }

/** 岷江和涪江：[x, z, 河床海拔 km] */
export const MINJIANG: [number, number, number][] = [[-36, -138, 1.9], [-29, -104, 1.65], [-25, -73, 1.5], [-31, -56, 1.42], [-27, -40, 1.3], [-17, -25, 1.12], [-7, -11, 0.98], [0, 0, 0.88], [7, -1.5, 0.76], [13.4, -3.5, 0.68], [24, -2, 0.6], [42, 1, 0.53], [66, -3, 0.48], [90, 1, 0.44], [114, 4, 0.4]]
export const FUJIANG: [number, number, number][] = [[-22, -138, 1.5], [-6, -131, 1.0], [4.9, -125, 0.75], [16, -119, 0.6], [32, -114, 0.52], [48, -111, 0.46], [72, -102, 0.42], [114, -92, 0.38]]

function nearRiver(path: [number, number, number][], x: number, z: number) {
  let best = Infinity, bh = 0
  for (let i = 1; i < path.length; i++) {
    const [ax, az, ah] = path[i - 1], [bx, bz, bh2] = path[i], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2)), d = Math.hypot(x - ax - vx * t, z - az - vz * t)
    if (d < best) { best = d; bh = ah + (bh2 - ah) * t }
  }
  return { d: best, h: bh }
}
/** 山和平原的分界（龙门山的山前）：大致沿 x ≈ 12 km */
export const frontX = (z: number) => 12 + 3 * Math.sin(z * 0.031) + 4 * (noise(z * 0.05, 3.1) - 0.5)

/** 地面海拔（km） */
export function height(x: number, z: number) {
  // 先把坐标扭一扭，山脊才不会是一条条直的
  const wx = x + 9 * (fbm(x / 26 + 3, z / 26, 3) - 0.5), wz = z + 14 * (fbm(x / 26, z / 26 + 7, 3) - 0.5)
  const u = frontX(z) - x                                    // 往山里有多深
  const plain = 0.62 - 0.0016 * (x - 12) + 0.025 * (fbm(x * 0.15, z * 0.15, 3) - 0.5)
  const m = smooth((u + 1) / 22), hi = smooth((u - 38) / 30)
  // 两种尺度的山脊：大的沿龙门山走向（−z）拉长，小的是两侧的支脉
  const r1 = ridged(wx / 9 + 4, wz / 17 + 2), r2 = ridged(wx / 3.6 + 11, wz / 4.4 + 5), f = fbm(x / 5 + 9, z / 5 + 1, 4)
  let h = plain + m * (1.55 + 1.15 * r1 + 0.55 * r2 * (0.4 + 0.6 * m) + 0.25 * f) + hi * 0.35 + smooth((u + 5) / 5) * (1 - m) * 0.2 * f
  // 河谷：越靠近河，越接近河床的高度；山里的谷窄，出了山口变宽
  for (const path of [MINJIANG, FUJIANG]) {
    const n = nearRiver(path, x, z), w = 4.5 + 3 * smooth((n.h - 0.8) / 1) + (u < 0 ? 7 : 2 * smooth((4 - u) / 4)), fl = 0.6
    const k = smooth((n.d - fl) / w) * 0.7 + 0.3 * smooth((n.d - fl) / (w * 3.2))
    if (h > n.h) h = n.h + (h - n.h) * k
  }
  // 城镇所在的地方是一块平地
  for (const c of Object.values(CITIES)) {
    const d = Math.hypot(x - c.at[0], z - c.at[1]), k = smooth((d - c.r) / (c.r * 0.8 + 1.2))
    h = c.elev + (h - c.elev) * k
  }
  return h
}
/** 平原上的程度：0 山里，1 平原（上色用） */
export const plainness = (x: number, z: number) => smooth((x - frontX(z) + 1) / 5)
