// 机械振动和机械波实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 物理量一律用国际单位；场景单位 1 = 1 m。取值约定写在规格卡 docs/specs/wave.md 里。
export const G = 9.8 // N/kg，也是 m/s²
const TAU = Math.PI * 2

// ---------- 第 1 课：弹簧振子 ----------
/** 三种搭配：砝码质量 m（kg）、弹簧的劲度系数 k（N/m） */
export const SPRINGS = {
  a: { name: '0.5 kg · 50 N/m', m: 0.5, k: 50 },
  b: { name: '2 kg · 50 N/m', m: 2, k: 50 },
  c: { name: '2 kg · 200 N/m', m: 2, k: 200 },
} as const
export type SpringKey = keyof typeof SPRINGS
/** 弹簧原长（m）和计时用的全振动次数 */
export const SPRING = { L0: 0.36, count: 10 }
/** 弹簧振子的周期 T = 2π√(m/k)（s） */
export const springT = (m: number, k: number) => TAU * Math.sqrt(m / k)
/** 挂上砝码后弹簧伸长多少（m）：mg = kx */
export const stretch = (m: number, k: number) => (m * G) / k
/** 从最大位移处松手，t 秒时离开平衡位置的位移（m，和松手时同侧为正） */
export const shm = (A: number, T: number, t: number) => A * Math.cos((TAU * t) / T)
/** 回复力 F = −kx（N） */
export const restoring = (k: number, x: number) => -k * x

// ---------- 第 2 课：单摆 ----------
export const PENDS = {
  steel: { name: '1.00 m · 钢球', L: 1, ball: '钢球', m: 0.89 },
  wood: { name: '1.00 m · 木球', L: 1, ball: '木球', m: 0.07 },
  short: { name: '0.25 m · 钢球', L: 0.25, ball: '钢球', m: 0.89 },
} as const
export type PendKey = keyof typeof PENDS
/** 摆角（度）和计时用的全振动次数 */
export const PEND = { deg: 5, count: 5 }
/** 单摆的周期 T = 2π√(l/g)（s） */
export const pendT = (L: number) => TAU * Math.sqrt(L / G)
/** 从摆角 θ0 处松手，t 秒时的摆角（和 θ0 同单位） */
export const pendAngle = (th0: number, L: number, t: number) => th0 * Math.cos(Math.sqrt(G / L) * t)
/** 由摆长和周期算重力加速度 g = 4π²l/T²（m/s²） */
export const gFrom = (L: number, T: number) => (4 * Math.PI ** 2 * L) / T ** 2

// ---------- 第 3 课：受迫振动和共振 ----------
/** 浮标：固有频率 f0（Hz）、阻尼比、涌浪的振幅 A（m）、压下去的深度（m） */
export const BUOY = { f0: 0.5, zeta: 0.1, A: 0.1, push: 0.4 }
export const SWELLS = { low: { name: '0.25 Hz', f: 0.25 }, mid: { name: '0.50 Hz', f: 0.5 }, high: { name: '1.00 Hz', f: 1 } } as const
export type SwellKey = keyof typeof SWELLS
/** 受迫振动稳定后的振幅是驱动振幅的多少倍：1/√((1−r²)²+(2ζr)²)，r = f/f0 */
export const gain = (f: number, f0 = BUOY.f0, zeta = BUOY.zeta) => { const r = f / f0; return 1 / Math.sqrt((1 - r * r) ** 2 + (2 * zeta * r) ** 2) }
/** 涌浪频率为 f 时，浮标稳定后的振幅（m） */
export const buoyAmp = (f: number) => BUOY.A * gain(f)
/** 浮标的运动走一小步：ÿ + 2ζω0·ẏ + ω0²·y = ω0²·yw，yw 是此刻浮标所在处的水面高度。返回新的位置和速度 */
export function heaveStep(y: number, vy: number, yw: number, dt: number): [number, number] {
  const w0 = TAU * BUOY.f0, a = w0 * w0 * (yw - y) - 2 * BUOY.zeta * w0 * vy
  const v1 = vy + a * dt
  return [y + v1 * dt, v1]
}
/** 浮标自由振动（有阻尼）的周期（s） */
export const buoyFreeT = () => 1 / (BUOY.f0 * Math.sqrt(1 - BUOY.zeta ** 2))

// ---------- 第 4 课起：港池里的水波 ----------
/** 这片水面的波速（m/s）：由介质决定，各课都用它 */
export const WATER = { v: 2 }
/** 波长 λ = v / f（m） */
export const lambda = (f: number, v = WATER.v) => v / f
/** 波速 v = λf（m/s） */
export const speed = (lam: number, f: number) => lam * f
/** 沿 x 传播的简谐波：波源在 x = 0，从 t = 0 起振，先向上。波还没传到的地方是 0 */
export function travel(A: number, f: number, x: number, t: number, v = WATER.v) {
  const s = t - x / v
  return s <= 0 || x < 0 ? 0 : A * Math.sin(TAU * f * s)
}
/** 此刻各个波峰在哪（离波源的距离，m），只要 0 到 max 之间的，从近到远 */
export function crests(f: number, t: number, max: number, v = WATER.v) {
  const out: number[] = []
  for (let n = Math.floor(t * f); n >= 0; n--) { const x = v * (t - (n + 0.25) / f); if (x > 0 && x < max) out.push(x) }
  return out
}
/** 第 4 课的造波：振幅（m）、两种频率 */
export const LINE = { A: 0.2, n: 21, gap: 1, red: 8 }
export const TONES = { slow: { name: '0.5 Hz', f: 0.5 }, fast: { name: '1.0 Hz', f: 1 } } as const
export type ToneKey = keyof typeof TONES

// ---------- 第 5 课：波的干涉 ----------
/** 两个波源 S1、S2 相距 d（m），同频同相；单个波源在各处引起的振幅按 A 算（不计随距离的衰减） */
export const TWIN = { d: 8, f: 0.5, A: 0.15 }
/** 三个观察点：到两个波源的距离 r1、r2（m） */
export const SPOTS = {
  P: { name: 'P', r1: 12, r2: 12 },
  Q: { name: 'Q', r1: 12, r2: 10 },
  R: { name: 'R', r1: 14, r2: 10 },
} as const
export type SpotKey = keyof typeof SPOTS
/** 由 r1、r2 求观察点的位置：S1 在 (−d/2, 0)，S2 在 (d/2, 0)，返回 (x, 离波源连线的距离) */
export function spotAt(k: SpotKey): [number, number] {
  const { r1, r2 } = SPOTS[k], x = (r1 * r1 - r2 * r2) / (2 * TWIN.d)
  return [x, Math.sqrt(r1 * r1 - (x + TWIN.d / 2) ** 2)]
}
/** 路程差 Δr = |r1 − r2|（m） */
export const pathDiff = (k: SpotKey) => Math.abs(SPOTS[k].r1 - SPOTS[k].r2)
/** 两列振幅都是 A 的波叠加后的振幅：2A·|cos(πΔr/λ)| */
export const twinAmp = (dr: number, lam: number, A = TWIN.A) => 2 * A * Math.abs(Math.cos((Math.PI * dr) / lam))
/** 观察点的振幅（m）：on 是开着几个波源 */
export const spotAmp = (k: SpotKey, on: number) => on === 0 ? 0 : on === 1 ? TWIN.A : twinAmp(pathDiff(k), lambda(TWIN.f))
/** 一个点波源在距离 r 处、t 时刻引起的位移：从 t = 0 起振；紧挨波源的地方收小一点，免得出尖 */
export function ring(A: number, f: number, r: number, t: number, v = WATER.v) {
  const s = t - r / v
  return s <= 0 ? 0 : A * Math.min(1, r / 0.7) * Math.min(1, s * f * 2) * Math.sin(TAU * f * s)
}

// ---------- 第 6 课：波的衍射 ----------
/** 防波堤口门的三种情况：口门宽 d（m）、波的频率 f（Hz） */
export const GAPS = {
  wide: { name: '口门 16 m · 波长 4 m', d: 16, f: 0.5 },
  narrow: { name: '口门 4 m · 波长 4 m', d: 4, f: 0.5 },
  long: { name: '口门 8 m · 波长 8 m', d: 8, f: 0.25 },
} as const
export type GapKey = keyof typeof GAPS
/** 外海来波的振幅（m）；堤后观察点 B 的位置：偏离口门中线 x（m）、离堤 z（m）。对照点 C 在口门正后方，离口门中心和 B 一样远 */
export const BREAK = { A: 0.2, bx: 12, bz: 20 }
export const axisZ = () => Math.hypot(BREAK.bx, BREAK.bz)
/**
 * 口门后面一点的波：按惠更斯原理，把口门上每一小段都当成新的波源，把它们传来的子波加起来。
 * 口门在 z = 0、x 从 −d/2 到 d/2，波从 z < 0 垂直入射。堤是直立不透水的，子波向堤后各个方向一样强。返回复振幅 [实部, 虚部]，入射波的振幅算 1。
 */
export function gapField(d: number, lam: number, x: number, z: number): [number, number] {
  const k = TAU / lam, n = Math.max(8, Math.round((d / lam) * 16)), ds = d / n
  let re = 0, im = 0
  for (let j = 0; j < n; j++) {
    const sx = -d / 2 + (j + 0.5) * ds, r = Math.max(ds * 0.5, Math.hypot(x - sx, z))
    const a = z <= 0 ? 0 : ds / Math.sqrt(lam * r), ph = k * r - Math.PI / 4
    re += a * Math.cos(ph); im += a * Math.sin(ph)
  }
  return [re, im]
}
/** 堤后观察点 B 的振幅（m） */
export function shadowAmp(key: GapKey) {
  const g = GAPS[key], [re, im] = gapField(g.d, lambda(g.f), BREAK.bx, BREAK.bz)
  return BREAK.A * Math.hypot(re, im)
}
/** 口门正后方对照点 C 的振幅（m） */
export function axisAmp(key: GapKey) {
  const g = GAPS[key], [re, im] = gapField(g.d, lambda(g.f), 0, axisZ())
  return BREAK.A * Math.hypot(re, im)
}
/** 绕到堤后的程度：B 处的振幅是正后方 C 处的几分之几 */
export const bend = (key: GapKey) => shadowAmp(key) / axisAmp(key)
/** 口门宽是波长的几倍 */
export const gapRatio = (key: GapKey) => GAPS[key].d / lambda(GAPS[key].f)

// ---------- 第 7 课：多普勒效应 ----------
/** 小艇拖着起波器：频率 f（Hz）、振幅（m）；前方浮标 A、后方浮标 B 离出发点的距离（m）；一次航行多久（s） */
export const TOW = { f: 0.5, A: 0.12, ahead: 14, behind: 12, T: 12 }
export const BOATS = { rest: { name: '停着', u: 0 }, half: { name: '0.5 m/s', u: 0.5 }, full: { name: '1.0 m/s', u: 1 } } as const
export type BoatKey = keyof typeof BOATS
/** 波源以速度 u 朝观察者运动（远离取负）时，观察者接收到的频率：f·v/(v − u) */
export const doppler = (f: number, u: number, v = WATER.v) => (f * v) / (v - u)
/** 波源前方、后方的波长（m） */
export const lamAhead = (f: number, u: number, v = WATER.v) => (v - u) / f
export const lamBehind = (f: number, u: number, v = WATER.v) => (v + u) / f
/**
 * 运动的波源在 (px, pz) 处引起的位移。波源 t = 0 时在原点，沿 +x 以 u 匀速运动，一直在振动。
 * 此刻传到这里的波，是波源在更早的时刻 τ 发出的：|P − S(τ)| = v(t − τ)。u > v 时可能有两个这样的时刻，都加起来。
 */
export function towField(A: number, f: number, u: number, px: number, pz: number, t: number, v = WATER.v) {
  const a = u * u - v * v, b = 2 * (v * v * t - u * px), c = px * px + pz * pz - v * v * t * t
  let y = 0
  const add = (tau: number) => {
    if (!(tau >= 0 && tau <= t)) return
    const r = v * (t - tau)
    y += A * Math.min(1, r / 0.9) * Math.min(1, tau * f * 2 + 0.25) * Math.sin(TAU * f * tau)
  }
  if (Math.abs(a) < 1e-9) { if (Math.abs(b) > 1e-9) add(-c / b); return y }
  const D = b * b - 4 * a * c
  if (D < 0) return 0
  const q = Math.sqrt(D)
  add((-b + q) / (2 * a)); if (q > 1e-9) add((-b - q) / (2 * a))
  return y
}
/** 汽笛的例子：声速（m/s）、笛声频率（Hz）、船速（m/s） */
export const HORN = { v: 340, f: 400, u: 17 }

// ---------- 拓展 ----------
/** 驻波：波垂直撞上直立的码头岸壁，入射波和反射波叠加。离岸壁 z 处的振幅（m）：2A·|cos(2πz/λ)|，岸壁处是波腹 */
export const STAND = { A: 0.1 }
export const standAmp = (z: number, lam: number, A = STAND.A) => 2 * A * Math.abs(Math.cos((TAU * z) / lam))
/** 离岸壁最近的波节在哪（m）：λ/4 */
export const firstNode = (lam: number) => lam / 4
/** 驻波在 t 时刻的位移（稳定以后） */
export const standAt = (z: number, lam: number, f: number, t: number, A = STAND.A) => 2 * A * Math.cos((TAU * z) / lam) * Math.cos(TAU * f * t)
/** 艏波：艇速 u 大于波速 v 时，波面叠成 V 形，半顶角 θ 满足 sinθ = v/u。返回角度（度） */
export const wedge = (u: number, v = WATER.v) => (Math.asin(v / u) * 180) / Math.PI
export const FAST = { a: { name: '3 m/s', u: 3 }, b: { name: '4 m/s', u: 4 } } as const
export type FastKey = keyof typeof FAST
