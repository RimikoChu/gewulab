// 电与磁实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 台上的器材按厘米算；平面上的点写成 [u, v]：桌面上 u 朝东（+x）、v 朝南（+z，朝镜头）。场景里北是 −z。
// 取值约定写在规格卡 docs/specs/magnet.md 里。

export type P2 = [number, number]

// ---------- 磁极模型（示意） ----------
// N 极当作正“磁荷”、S 极当作负“磁荷”，每个磁荷在一点产生的场沿连线方向、按距离平方反比衰减，叠加起来就是磁体的磁场。
// 这是为了画铁屑、小磁针、磁感线用的简化模型，磁体外部的形状和教材的图一致。
export interface Charge { p: P2; q: number }
export type MagnetKind = 'bar' | 'horse' | 'solenoidE' | 'solenoidW' | 'earth'

/** 条形磁体：长 20 cm，N 极在东头；蹄形磁体平放，两脚朝南，N 脚在西、S 脚在东，两脚相距 6 cm；螺线管长 12 cm；地球：竖直平面里的一个偶极子（v 朝地理北极，半径 10） */
export const BAR = { len: 20, w: 3, h: 1.5 }
export const HORSE = { gap: 6, tipV: 4 }
export const EARTH = { R: 10, tilt: 11 * Math.PI / 180 }
export function poles(kind: MagnetKind): Charge[] {
  const spread = (u: number, q: number, half: number): Charge[] => [-half, 0, half].map(d => ({ p: [u, d], q: q / 3 }))
  switch (kind) {
    case 'bar': return [...spread(8.6, 1, 0.9), ...spread(-8.6, -1, 0.9)]
    case 'horse': return [{ p: [-HORSE.gap / 2, HORSE.tipV], q: 1 }, { p: [HORSE.gap / 2, HORSE.tipV], q: -1 }]
    case 'solenoidE': return [...spread(5.6, 1, 1.2), ...spread(-5.6, -1, 1.2)]
    case 'solenoidW': return [...spread(-5.6, 1, 1.2), ...spread(5.6, -1, 1.2)]
    case 'earth': {
      // 地磁的 N 极在地理南极附近（向下、偏一点），S 极在地理北极附近；v 朝地理北极
      const a = Math.PI / 2 + EARTH.tilt, d = 2.2
      return [{ p: [Math.cos(a) * d, Math.sin(a) * d], q: -1 }, { p: [-Math.cos(a) * d, -Math.sin(a) * d], q: 1 }]
    }
  }
}

/** 平面上一点的磁场（大小以“离单位磁荷 1 cm 处”为 1）。soft 让紧挨着磁荷的地方不发散 */
export function field(ch: Charge[], p: P2, soft = 0.35): P2 {
  let bu = 0, bv = 0
  for (const c of ch) {
    const du = p[0] - c.p[0], dv = p[1] - c.p[1], r2 = du * du + dv * dv + soft * soft, k = c.q / (r2 * Math.sqrt(r2))
    bu += k * du; bv += k * dv
  }
  return [bu, bv]
}
export const mag = (b: P2) => Math.hypot(b[0], b[1])

/** 一条磁感线：从 start 出发沿磁场方向一步步走（中点法），走到负磁荷（S 极）附近、出了范围或步数用完就停 */
export function traceLine(ch: Charge[], start: P2, { step = 0.25, max = 600, box = 40, stopR = 0.8 }: { step?: number; max?: number; box?: number; stopR?: number } = {}): P2[] {
  const pts: P2[] = [start]
  let p: P2 = start
  for (let i = 0; i < max; i++) {
    const b1 = field(ch, p), m1 = mag(b1) || 1
    const mid: P2 = [p[0] + b1[0] / m1 * step / 2, p[1] + b1[1] / m1 * step / 2]
    const b2 = field(ch, mid), m2 = mag(b2) || 1
    p = [p[0] + b2[0] / m2 * step, p[1] + b2[1] / m2 * step]
    pts.push(p)
    if (Math.abs(p[0]) > box || Math.abs(p[1]) > box) break
    if (ch.some(c => c.q < 0 && Math.hypot(p[0] - c.p[0], p[1] - c.p[1]) < stopR)) break
  }
  return pts
}

/** 一种磁体的一组磁感线：在 N 极周围一圈均匀取起点 */
export function fieldLines(kind: MagnetKind): P2[][] {
  const ch = poles(kind)
  if (kind === 'earth') {
    // 从地面南半球（地磁 N 极一侧）出发，回到北半球
    const R = EARTH.R, out: P2[][] = []
    // 起点离地磁轴 0.62–1.15 弧度：太靠近轴的线绕得太远，太靠近赤道的又太扁
    for (const s of [-1, 1]) for (const off of [0.62, 0.8, 0.98, 1.15]) {
      const a = -Math.PI / 2 + EARTH.tilt + s * off
      out.push(traceLine(ch, [Math.cos(a) * R, Math.sin(a) * R], { step: 0.3, box: 60, stopR: R * 0.98 }))
    }
    return out.map(l => l.filter((_, k) => k === 0 || Math.hypot(l[k][0], l[k][1]) >= R * 0.99))
  }
  if (kind === 'horse') {
    // 蹄形磁体：在 N 脚端头周围一圈取起点
    const [cu, cv] = [-HORSE.gap / 2, HORSE.tipV], out: P2[][] = []
    for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * Math.PI * 2; out.push(traceLine(ch, [cu + Math.cos(a) * 0.9, cv + Math.sin(a) * 0.9], { box: 18 })) }
    return out
  }
  // 条形磁体、螺线管：起点沿 N 极那一半的外轮廓取（端面 5 条、两侧各 3 条），磁体内部不画
  const half = kind === 'bar' ? BAR.len / 2 : 6.2, hw = kind === 'bar' ? BAR.w / 2 : 1.9, s = kind === 'solenoidW' ? -1 : 1
  const starts: P2[] = [-0.8, -0.4, 0, 0.4, 0.8].map(k => [s * (half + 0.3), k * hw] as P2)
  for (const u of [0.92, 0.75, 0.55]) for (const side of [-1, 1]) starts.push([s * half * u, side * (hw + 0.3)])
  return starts.map(p => traceLine(ch, p, { box: 30 }))
}

/** 简单的伪随机数：同一个种子每次撒出一样的铁屑 */
export function rng(seed: number) { return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296 }

/** 一根铁屑：位置、朝向（弧度，从 +u 量起）、长度（cm） */
export interface Filing { u: number; v: number; a: number; len: number }
/**
 * 铁屑：在 w × h 的玻璃板上撒 n 根。场强大的地方多撒；每根的朝向取那一点的磁场方向；
 * 一颗“种子”往磁场方向连出一到三根，像真的铁屑那样连成一小串。skip：哪些地方不撒（磁体本身占的地方）
 */
export function filings(kind: MagnetKind, n: number, w: number, h: number, seed = 5, skip?: (p: P2) => boolean): Filing[] {
  const ch = poles(kind), r = rng(seed), out: Filing[] = []
  let guard = 0
  while (out.length < n && guard++ < n * 60) {
    const p: P2 = [(r() - 0.5) * w, (r() - 0.5) * h]
    if (skip?.(p)) continue
    const b = mag(field(ch, p))
    if (r() > Math.min(1, 0.12 + Math.pow(b / 0.05, 0.55) * 0.5)) continue
    let q = p
    const links = 1 + Math.floor(r() * 3)
    for (let k = 0; k < links && out.length < n; k++) {
      const f = field(ch, q), a = Math.atan2(f[1], f[0]) + (r() - 0.5) * 0.18, len = 0.22 + r() * 0.26
      out.push({ u: q[0], v: q[1], a, len })
      q = [q[0] + Math.cos(a) * (len + 0.04), q[1] + Math.sin(a) * (len + 0.04)]
      if (Math.abs(q[0]) > w / 2 || Math.abs(q[1]) > h / 2 || skip?.(q)) break
    }
  }
  return out
}

/** 地磁场在桌面上的水平分量：指北（−v）。和磁体的场比，大小取 0.004（示意：离磁体远的小磁针才看得出它） */
export const EARTH_H: P2 = [0, -0.004]
/** 放在 p 处的小磁针静止时 N 极的朝向（弧度，从 +u 量起） */
export function needleAngle(kind: MagnetKind | null, p: P2): number {
  const b = kind ? field(poles(kind), p) : [0, 0]
  return Math.atan2(b[1] + EARTH_H[1], b[0] + EARTH_H[0])
}
/** 朝向换成方位角（度，北 0°、顺时针为正，东 90°） */
export const bearing = (a: number) => { const d = (a * 180 / Math.PI + 90 + 360) % 360; return Math.round(d) % 360 }

// ---------- 第 1 课 磁现象 ----------
export const MATERIALS = { iron: { name: '铁钉', magnetic: true }, copper: { name: '铜片', magnetic: false }, alu: { name: '铝片', magnetic: false } } as const
export type MaterialKey = keyof typeof MATERIALS
/** 磁体能不能吸引这种物质 */
export const attracts = (m: MaterialKey) => MATERIALS[m].magnetic
/** 两块磁体相对的两端：同名相斥（−1），异名相吸（+1） */
export const interact = (a: 'N' | 'S', b: 'N' | 'S') => (a === b ? -1 : 1)
/** 回形针挂在磁体上的多少：沿磁体从一头到另一头（x 从 −1 到 1），两端最多、中间几乎没有（示意） */
export const clipDensity = (x: number) => Math.max(0, (Math.abs(x) - 0.45) / 0.55) ** 1.6

// ---------- 第 3 课 电生磁 ----------
export const L3 = { U: 3, R: 2 }
/** 电流表读数（A）：两节干电池 3 V，导线和保护电阻共 2 Ω */
export const l3Current = () => L3.U / L3.R
/** 奥斯特实验：导线南北方向放在小磁针正上方。dir = 1 电流从南流向北。返回小磁针 N 极偏离北方的角度（弧度，东为正）。
 *  导线下方的磁场方向：电流朝北（−z），导线到小磁针朝下（−y），(−z) × (−y) = −x，指西。偏转的大小按导线的场是地磁场的 1.5 倍示意 */
export function wireDeflect(dir: 1 | -1): number {
  const bw = -dir * 1.5   // 指东为正
  return Math.atan2(bw, 1)
}
/** 螺线管哪一端是 N 极。线圈的绕法：从东头看，dir = 1 时电流沿逆时针方向流（安培定则：大拇指指东） */
export const solenoidN = (dir: 1 | -1): 'east' | 'west' => (dir > 0 ? 'east' : 'west')

// ---------- 第 4 课 电磁铁 ----------
/** 吸起的大头针数（示意）：有铁芯 N·I/5，没有铁芯 N·I/50，取整 */
export function pins(turns: number, I: number, core: boolean) { return Math.round(turns * I / (core ? 5 : 50)) }
export const L4 = { lowI: 0.5, highI: 1.0, turns: [50, 100] as const }

// ---------- 第 5 课 电动机 ----------
/** 两条导轨沿东西方向穿过蹄形磁体的两极之间，导体棒沿南北方向搭在导轨上。i = 1 棒里电流向南（+z）；b = 1 N 极在上（磁场向下）。
 *  受力方向 F ∝ I × B = (i·z) × (−b·y) = i·b·x：返回 x 方向的正负（+1 向东滚，−1 向西滚） */
export const forceX = (i: 1 | -1, b: 1 | -1) => (i * b) as 1 | -1
/** 线圈转过 rev 圈，换向器改变了几次电流方向（每半圈一次） */
export const commutations = (rev: number) => Math.floor(rev * 2 + 1e-9)

// ---------- 第 6 课 电磁感应 ----------
export type Move = 'up' | 'down' | 'left' | 'right'
/** 导体棒沿南北方向（z）放在两极之间，磁场竖直（b = 1 N 极在上，磁场向下）。
 *  感应电流方向 ∝ v × B：向东运动 (x) × (−b·y) = −b·z。上下运动顺着磁感线，不产生电流。返回棒里电流沿 z 的正负，0 表示没有电流 */
export function induced(move: Move, b: 1 | -1): -1 | 0 | 1 {
  if (move === 'up' || move === 'down') return 0
  const vx = move === 'right' ? 1 : -1
  return (-vx * b) as -1 | 1
}

// ---------- 第 7 课 发电机 ----------
/** 交流电的频率（Hz）：转速 n（r/min），磁极对数 p */
export const acFreq = (n: number, p: number) => p * n / 60
export const period = (f: number) => 1 / f
/** 每秒电流方向改变几次：每个周期两次 */
export const flips = (f: number) => 2 * f
/** 发电机转速（r/min）= 叶轮转速 × 齿轮箱增速比 */
export const genRpm = (rotor: number, ratio: number) => rotor * ratio
export const TURBINE = { hub: 80, blade: 50, rotor: 15, ratio: 100, pairs: 2 }
/** 手摇发电机模型：每秒摇 1 圈，一对磁极 */
export const MODEL = { rps: 1, pairs: 1 }
/** 线圈转到 θ（弧度）时的感应电流（相对值）：线圈平面和磁感线平行时最大，垂直时为零 */
export const coilCurrent = (theta: number) => Math.sin(theta)

// ---------- 拓展 ----------
export const RELAY = { control: 6, work: 220 }
