// 相似和测量实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 长度一律用 m，角度用度。取值约定写在规格卡 docs/specs/similar.md 里：长度保留两位小数，三角函数值保留两位小数。
export type P2 = [number, number]

/** 保留两位小数（数值） */
export const r2 = (x: number) => Math.round(x * 100 + 1e-9) / 100
/** 保留一位小数（数值） */
export const r1 = (x: number) => Math.round(x * 10 + 1e-9) / 10
/** 写成两位小数的字符串 */
export const f2 = (x: number) => r2(x).toFixed(2)
/** 写成一位小数的字符串 */
export const f1 = (x: number) => r1(x).toFixed(1)
const rad = (d: number) => d * Math.PI / 180
const deg = (r: number) => r * 180 / Math.PI
const dist = (a: P2, b: P2) => Math.hypot(b[0] - a[0], b[1] - a[1])

/** 学生：身高 1.60 m，眼睛离地 1.50 m（全实验室同一个人） */
export const PERSON_H = 1.6
export const EYE = 1.5

// ---------- 多边形的通用计算 ----------
/** 各边长：第 i 条边从顶点 i 到顶点 i + 1 */
export const sidesOf = (pts: P2[]) => pts.map((p, i) => dist(p, pts[(i + 1) % pts.length]))
/** 各内角（度）：顶点按逆时针给 */
export function anglesOf(pts: P2[]) {
  const n = pts.length
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n]
    const u = [a[0] - p[0], a[1] - p[1]], v = [b[0] - p[0], b[1] - p[1]]
    return deg(Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))))
  })
}
/** 周长 */
export const perimeterOf = (pts: P2[]) => sidesOf(pts).reduce((s, x) => s + x, 0)
/** 面积（鞋带公式） */
export const areaOf = (pts: P2[]) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1] }, 0)) / 2

// ---------- 第 1 课 放大和缩小 ----------
/** 原来的四边形 ABCD（m，场景设定） */
export const QUAD: P2[] = [[0, 0], [1.2, 0], [1.0, 0.7], [0.25, 0.8]]
/** 三种做法：横向放大 kx 倍、纵向放大 ky 倍 */
export const SCALE1 = {
  k15: { name: '放大 1.5 倍', kx: 1.5, ky: 1.5 },
  k2: { name: '放大 2 倍', kx: 2, ky: 2 },
  wide: { name: '只拉长横向', kx: 2, ky: 1 },
} as const
export type Scale1 = keyof typeof SCALE1
/** 按某种做法得到的新四边形 */
export const quadOf = (k: Scale1): P2[] => QUAD.map(([x, y]) => [x * SCALE1[k].kx, y * SCALE1[k].ky])
/** 新旧对比：四条边的比、四个角是否不变、是否相似 */
export function compare1(k: Scale1) {
  const s0 = sidesOf(QUAD), s1 = sidesOf(quadOf(k)), a0 = anglesOf(QUAD), a1 = anglesOf(quadOf(k))
  const ratios = s1.map((s, i) => s / s0[i])
  const sameAngles = a1.every((a, i) => Math.abs(a - a0[i]) < 0.05)
  const sameRatio = ratios.every(r => Math.abs(r - ratios[0]) < 1e-6)
  return { s0, s1, a0, a1, ratios, sameAngles, similar: sameAngles && sameRatio, k: sameRatio ? ratios[0] : null }
}

// ---------- 第 2 课 两角相等就相似 ----------
/** 两个定好的角：∠A = 50°，∠B = 60°（场景设定） */
export const ANG2 = { A: 50, B: 60 }
export const BASES2 = [1, 1.5, 2] as const
/** 底边 AB = c 时的三角形：A 在原点，B 在 (c, 0)；返回三边、第三个角、顶点 */
export function tri2(c: number) {
  const C = 180 - ANG2.A - ANG2.B
  const a = c * Math.sin(rad(ANG2.A)) / Math.sin(rad(C))      // BC，对着 ∠A
  const b = c * Math.sin(rad(ANG2.B)) / Math.sin(rad(C))      // AC，对着 ∠B
  const apex: P2 = [b * Math.cos(rad(ANG2.A)), b * Math.sin(rad(ANG2.A))]
  return { c, a, b, C, pts: [[0, 0], [c, 0], apex] as P2[] }
}
/** 和第一组（底边 1 m）的三边之比 */
export function ratio2(c: number) {
  const t0 = tri2(BASES2[0]), t = tri2(c)
  return { c: t.c / t0.c, a: t.a / t0.a, b: t.b / t0.b }
}

// ---------- 第 3 课 周长比和面积比 ----------
/** 小三角形（m，场景设定） */
export const TRI3: P2[] = [[0, 0], [0.8, 0], [0.3, 0.6]]
export const K3 = [2, 3] as const
/** 相似比为 k 的大三角形：周长、面积、和小三角形的比、铺满要几块 */
export function tri3(k: number) {
  const big = TRI3.map(([x, y]) => [x * k, y * k] as P2)
  const p0 = perimeterOf(TRI3), p = perimeterOf(big), s0 = areaOf(TRI3), s = areaOf(big)
  return { big, p0, p, s0, s, pRatio: p / p0, sRatio: s / s0, tiles: Math.round(s / s0) }
}
/** 铺满大三角形的 k² 块小三角形：每块的三个顶点。k(k+1)/2 块正放、k(k−1)/2 块倒放 */
export function tiles3(k: number) {
  const [A, B, C] = TRI3, u: P2 = [B[0] - A[0], B[1] - A[1]], v: P2 = [C[0] - A[0], C[1] - A[1]]
  const at = (i: number, j: number): P2 => [i * u[0] + j * v[0], i * u[1] + j * v[1]]
  const out: { pts: P2[]; up: boolean }[] = []
  for (let j = 0; j < k; j++) for (let i = 0; i < k - j; i++) {
    out.push({ pts: [at(i, j), at(i + 1, j), at(i, j + 1)], up: true })
    if (i < k - j - 1) out.push({ pts: [at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)], up: false })
  }
  return out
}

// ---------- 第 4 课 影子测旗杆 ----------
/** 旗杆高 12 m（场景设定，学生不知道，要量出来） */
export const POLE_H = 12
/** 两种太阳高度：用高度角的正切给，影长 = 物高 ÷ 正切 */
export const SUN4 = { low: { name: '太阳低一些', tan: 0.8 }, high: { name: '太阳高一些', tan: 1.25 } } as const
export type Sun4 = keyof typeof SUN4
/** 太阳高度角（度） */
export const elev4 = (k: Sun4) => deg(Math.atan(SUN4[k].tan))
/** 物高 h 的影长（m，量出来保留两位小数） */
export const shadow4 = (h: number, k: Sun4) => r2(h / SUN4[k].tan)
/** 用量到的两条影子算旗杆高：旗杆高 ∶ 旗杆影 = 身高 ∶ 人影 */
export function pole4(k: Sun4) {
  const s1 = shadow4(PERSON_H, k), s2 = shadow4(POLE_H, k)
  return { s1, s2, h: r1(PERSON_H * s2 / s1) }
}

// ---------- 第 5 课 镜子和标杆 ----------
/** 教学楼女儿墙顶离地 15.0 m（场景设定） */
export const BUILD_H = 15
export const MIRROR5 = [18, 12] as const
/** 镜子离楼 d2：人往后退到在镜子里看见楼顶时，人到镜子的距离 d1；用 d1、d2 算出的楼高 */
export function mirror5(d2: number) {
  const d1 = r2(EYE * d2 / BUILD_H)
  return { d1, d2, h: r1(EYE * d2 / d1) }
}
/** 标杆：高 2.50 m，离楼 15 m */
export const ROD = { h: 2.5, D: 15 }
/** 人退到眼睛、杆顶、楼顶三点一线时离标杆 d；用 d 算出的楼高 */
export function rod5() {
  const d = r2((ROD.h - EYE) * ROD.D / (BUILD_H - ROD.h))
  return { d, total: r2(d + ROD.D), h: r1(EYE + (ROD.h - EYE) * (d + ROD.D) / d) }
}

// ---------- 第 6 课 斜坡上的比 ----------
export const SLOPE6 = { s30: { name: '30° 坡', a: 30 }, s45: { name: '45° 坡', a: 45 } } as const
export type Slope6 = keyof typeof SLOPE6
/** 护坡高 3 m（场景设定） */
export const SLOPE_H = 3
export const AT6 = [2, 4] as const
/** 坡上离坡脚 s（沿坡）的一点：竖直高、水平长（m，两位小数） */
export function slope6(k: Slope6, s: number) {
  const a = rad(SLOPE6[k].a)
  return { s, h: r2(s * Math.sin(a)), l: r2(s * Math.cos(a)) }
}
/** 这个角的正弦、余弦、正切（两位小数）和坡度 1 ∶ m */
export function trig6(k: Slope6) {
  const a = rad(SLOPE6[k].a)
  return { sin: r2(Math.sin(a)), cos: r2(Math.cos(a)), tan: r2(Math.tan(a)), m: r2(1 / Math.tan(a)) }
}

// ---------- 第 7 课 测角仪测塔高 ----------
/** 古塔从地面到塔刹顶 31.5 m，塔基半宽 4.00 m（场景设定） */
export const TOWER = { h: 31.5, half: 4 }
export const D7 = [30, 50] as const
/** 站在离塔中心 D 处：量到塔基的长度、测角仪读数（整度）、tan（两位小数）、算出的塔高 */
export function tower7(D: number) {
  const exact = deg(Math.atan((TOWER.h - EYE) / D)), read = Math.round(exact), tan = r2(Math.tan(rad(read)))
  return { D, tape: r2(D - TOWER.half), exact, read, tan, rise: r1(D * tan), h: r1(EYE + D * tan) }
}

// ---------- 拓展 ----------
/** 两次测角：在离塔 50 m 处和往前走 20 m 后各测一次（塔底到不了，只量两处之间的距离） */
export function twice() {
  const far = tower7(50), near = tower7(30), d = 50 - 30
  const rise = d / (1 / far.tan - 1 / near.tan)
  return { far, near, d, rise: r1(rise), h: r1(EYE + rise) }
}
/** 手机测角：离楼 18 m，读到 0.1° */
export function phoneX() {
  const D = 18, read = r1(deg(Math.atan((BUILD_H - EYE) / D))), tan = r2(Math.tan(rad(read)))
  return { D, read, tan, rise: r1(D * tan), h: r1(EYE + D * tan) }
}
