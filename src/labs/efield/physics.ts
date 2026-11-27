// 静电场实验室的计算核心。画面、读数、任务判定都从这里取数，界面文件里不做计算。
// 物理量一律用国际单位；场景单位 1 = 1 m。取值约定写在规格卡 docs/specs/efield.md 里。
export type V3 = [number, number, number]
export type V2 = [number, number]

/** 静电力常量（N·m²/C²） */
export const K = 9.0e9
/** 真空介电常数（F/m） */
export const EPS0 = 8.85e-12
/** 元电荷（C）、电子质量（kg） */
export const E_CHARGE = 1.6e-19
export const M_E = 9.11e-31
export const G = 9.8 // N/kg

/** 科学记数法：sci(1.44e-3, 2) → '1.44×10⁻³' */
export function sci(x: number, digits = 1) {
  if (x === 0) return '0'
  const sup = (n: number) => String(n).replace(/[-0-9]/g, c => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'[c === '-' ? 0 : Number(c) + 1])
  let e = Math.floor(Math.log10(Math.abs(x)) + 1e-9), m = x / 10 ** e
  if (Number(Math.abs(m).toFixed(digits)) >= 10) { m /= 10; e += 1 }
  return e === 0 ? m.toFixed(digits) : `${m.toFixed(digits)}×10${sup(e)}`
}

// ---------- 第 1 课：库仑定律（库仑扭秤） ----------
/** 两个点电荷之间的静电力大小（N） */
export const coulomb = (q1: number, q2: number, r: number) => K * Math.abs(q1 * q2) / (r * r)
/** 扭秤：两球各带 q0；r0 是起始的球心距离；悬丝每转过 1° 对应的力（N） */
export const TORSION = { q0: 4.0e-8, r0: 0.10, r1: 0.05, perDeg: 4.0e-5 }
/** 扭秤上两球之间的力（N）：near 为真时距离是 r1，half 为真时 C 球的电荷量减半 */
export const torsionForce = (near: boolean, half: boolean) => coulomb(TORSION.q0, half ? TORSION.q0 / 2 : TORSION.q0, near ? TORSION.r1 : TORSION.r0)
/** 把 A 球拉回原位，旋钮要转过的角度（°）：和力成正比 */
export const twist = (F: number) => F / TORSION.perDeg

// ---------- 第 2 课：电场强度（带电金属球和试探电荷） ----------
/** 金属球带电 Q；试探小球的质量 m、悬线长 L；两种试探电荷；三个位置（到球心的距离） */
export const DOME = { Q: 1.0e-7, R: 0.05, m: 5.0e-5, L: 0.16, q: [2.0e-9, 1.0e-9] as const, r: [0.10, 0.20, 0.30] as const }
/** 点电荷 Q 在距离 r 处的电场强度大小（N/C） */
export const pointField = (Q: number, r: number) => K * Math.abs(Q) / (r * r)
/** 试探电荷 q 在距离 r 处受的力（N） */
export const probeForce = (q: number, r: number) => q * pointField(DOME.Q, r)
/** 悬线偏离竖直方向的角度（rad）：tan θ = F / (mg) */
export const hangAngle = (F: number, m = DOME.m) => Math.atan(F / (m * G))

// ---------- 第 3 课：电场线（油盘里的电极） ----------
export interface Charge { p: V2; q: number }
/** 电极的摆法：单个正电荷、等量异种、等量同种、平行板 */
export type Layout = 'single' | 'dipole' | 'same' | 'plates'
/** 油盘：每个电极带电 Q，两电极到中心的距离 a，盘的半径 R；平行板长 w、相距 d，板间电压 U */
export const DISH = { Q: 2.0e-8, a: 0.06, R: 0.15, w: 0.14, d: 0.10, U: 5000 }
export const LAYOUTS: Record<Layout, { name: string; charges: Charge[] }> = {
  single: { name: '一个正电荷', charges: [{ p: [0, 0], q: DISH.Q }] },
  dipole: { name: '等量异种', charges: [{ p: [-DISH.a, 0], q: DISH.Q }, { p: [DISH.a, 0], q: -DISH.Q }] },
  same: { name: '等量同种', charges: [{ p: [-DISH.a, 0], q: DISH.Q }, { p: [DISH.a, 0], q: DISH.Q }] },
  plates: { name: '平行板', charges: [] },
}
/** 几个点电荷在 p 处合成的电场强度（N/C，平面矢量） */
export function fieldAt(charges: Charge[], p: V2): V2 {
  let ex = 0, ey = 0
  for (const c of charges) { const dx = p[0] - c.p[0], dy = p[1] - c.p[1], r2 = dx * dx + dy * dy, r = Math.sqrt(r2) || 1e-9, e = K * c.q / r2; ex += e * dx / r; ey += e * dy / r }
  return [ex, ey]
}
/** 两电极连线中点的电场强度大小（N/C）；平行板是 U/d */
export function midField(layout: Layout) {
  if (layout === 'plates') return DISH.U / DISH.d
  const p: V2 = layout === 'single' ? [DISH.a, 0] : [0, 0]
  return Math.hypot(...fieldAt(LAYOUTS[layout].charges, p))
}
/** 头发屑在 p 处顺着电场排成的方向（单位矢量）；那里没有电场（平行板外面、电场抵消的地方）就返回 null，头发屑保持原来的乱向 */
export function hairDir(layout: Layout, p: V2): V2 | null {
  if (layout === 'plates') return Math.abs(p[0]) < DISH.d / 2 && Math.abs(p[1]) < DISH.w / 2 ? [1, 0] : null
  const e = fieldAt(LAYOUTS[layout].charges, p), l = Math.hypot(...e)
  return l < 2e3 ? null : [e[0] / l, e[1] / l]
}
/** 从 start 出发顺着（dir = 1）或逆着（dir = −1）电场走出一条电场线；走到电极跟前或盘边就停 */
export function traceLine(charges: Charge[], start: V2, dir: 1 | -1, R = DISH.R, step = 0.003): V2[] {
  const pts: V2[] = [start]; let p = start
  for (let i = 0; i < 400; i++) {
    const e1 = fieldAt(charges, p), l1 = Math.hypot(...e1); if (l1 < 1e-6) break
    const mid: V2 = [p[0] + dir * e1[0] / l1 * step / 2, p[1] + dir * e1[1] / l1 * step / 2]   // 中点法，线才不会走歪
    const e2 = fieldAt(charges, mid), l2 = Math.hypot(...e2); if (l2 < 1e-6) break
    p = [p[0] + dir * e2[0] / l2 * step, p[1] + dir * e2[1] / l2 * step]
    if (Math.hypot(...p) > R) break
    if (charges.some(c => Math.hypot(p[0] - c.p[0], p[1] - c.p[1]) < 0.009)) { pts.push(p); break }
    pts.push(p)
  }
  return pts
}
/** 一种摆法的全部电场线（每条都是从正电荷指向负电荷或盘边的一串点）。每个电极均匀发出 n 条 */
export function fieldLines(layout: Layout, n = 12): V2[][] {
  if (layout === 'plates') {
    const out: V2[][] = []
    for (let i = 0; i < 7; i++) { const y = -DISH.w / 2 + 0.01 + i * (DISH.w - 0.02) / 6; out.push([[-DISH.d / 2, y], [DISH.d / 2, y]]) }
    return out
  }
  const cs = LAYOUTS[layout].charges, out: V2[][] = []
  for (const c of cs) {
    if (c.q < 0 && cs.some(o => o.q > 0) && layout === 'dipole') {
      // 负电荷：只补上从盘边进来的那几条（其余的已经从正电荷那边画过来了）
      for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2, s: V2 = [c.p[0] + 0.011 * Math.cos(a), c.p[1] + 0.011 * Math.sin(a)]; const l = traceLine(cs, s, -1); const end = l[l.length - 1]; if (Math.hypot(...end) > DISH.R - 0.006) out.push(l.reverse()) }
      continue
    }
    for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2; out.push(traceLine(cs, [c.p[0] + 0.011 * Math.cos(a), c.p[1] + 0.011 * Math.sin(a)], 1)) }
  }
  return out
}

// ---------- 第 4 课：电势、电势差和电场力做功（两块大平行板之间的匀强电场） ----------
/** 两板电压 U、板间距 d；试探电荷 q；A、B、C 三点：x 是到正极板的距离，y 是高度上的偏移（m） */
export const UNI = { U: 600, d: 0.30, q: 2.0e-8, A: [0.05, 0] as V2, B: [0.25, 0] as V2, C: [0.25, 0.10] as V2 }
export type Pt = 'A' | 'B' | 'C'
/** 匀强电场的场强（V/m）：E = U/d */
export const uniField = () => UNI.U / UNI.d
/** 离正极板 x 处的电势（V），负极板接地取 0 */
export const potential = (x: number) => Math.round(UNI.U * (1 - x / UNI.d) * 1e6) / 1e6
/** 两点之间的电势差 U_ab（V） */
export const potDiff = (a: Pt, b: Pt) => potential(UNI[a][0]) - potential(UNI[b][0])
/** 试探电荷从离正极板 xa 处移到 xb 处，电场力做的功（J） */
export const workBetween = (xa: number, xb: number, q = UNI.q) => q * (potential(xa) - potential(xb))
/** 把试探电荷从 a 移到 b，电场力做的功（J）：W = qU，与路径无关 */
export const fieldWork = (a: Pt, b: Pt, q = UNI.q) => q * potDiff(a, b)

// ---------- 第 5 课：电容器（平行板电容器和静电计） ----------
/** 圆形极板：正对面积 S、板距 d，充电到 U0 后断开电源；介质板的相对介电常数 eps */
export const CAP = { S: 0.030, d: 0.020, U0: 1000, eps: 3 }
export type CapMode = 'base' | 'far' | 'half' | 'slab'
export const CAP_MODES: Record<CapMode, { name: string; S: number; d: number; eps: number }> = {
  base: { name: '原样', S: CAP.S, d: CAP.d, eps: 1 },
  far: { name: '板距加倍', S: CAP.S, d: CAP.d * 2, eps: 1 },
  half: { name: '正对面积减半', S: CAP.S / 2, d: CAP.d, eps: 1 },
  slab: { name: '插入介质板', S: CAP.S, d: CAP.d, eps: CAP.eps },
}
/** 平行板电容器的电容（F）：C = ε_r ε₀ S / d */
export const capacitance = (S: number, d: number, eps = 1) => eps * EPS0 * S / d
export const capOf = (m: CapMode) => capacitance(CAP_MODES[m].S, CAP_MODES[m].d, CAP_MODES[m].eps)
/** 充电后极板上的电荷量（C）：断开电源后保持不变 */
export const capCharge = () => capOf('base') * CAP.U0
/** 电荷量不变时，改变电容器以后两板间的电压（V）：U = Q / C */
export const capVoltage = (m: CapMode) => capCharge() / capOf(m)
/** 静电计指针张开的角度（°）：和电压成正比，2000 V 时张开 56° */
export const meterAngle = (U: number) => Math.min(70, U / 2000 * 56)

// ---------- 第 6 课：带电粒子的加速（示波管里的电子枪） ----------
export const GUN = { U: [500, 1000, 2000] as const, gap: 0.03 }
/** 电子从静止经电压 U 加速后的速度（m/s）：qU = ½mv² */
export const gunSpeed = (U: number, q = E_CHARGE, m = M_E) => Math.sqrt(2 * q * U / m)
/** 加速后的动能，用电子伏表示（eV） */
export const gunEnergyEV = (U: number) => U

// ---------- 第 7 课：带电粒子的偏转（喷码机的打印头） ----------
/** 墨滴质量 m、初速度 v0；偏转板长 L、间距 d、电压 U；出板后到纸面的距离 D；墨滴的充电量分三档 */
export const JET = { m: 1.0e-10, v0: 20, L: 0.020, d: 0.010, U: 6000, D: 0.030, q: [0, 2.0e-13, 4.0e-13] as const }
/** 墨滴在偏转板里做类平抛运动：返回加速度、穿过板的时间、出板时的侧移和偏角正切、落在纸上的侧移（都是国际单位） */
export function deflect(q: number, U: number = JET.U) {
  const E = U / JET.d, a = q * E / JET.m, t = JET.L / JET.v0
  const y1 = 0.5 * a * t * t, vy = a * t, tan = vy / JET.v0
  return { E, a, t, y1, vy, tan, y: y1 + JET.D * tan }
}
/** 墨滴飞行中的位置：x 是离偏转板入口的距离（可以为负，还没进板），返回侧移 y */
export function jetPath(q: number, U: number, x: number) {
  const f = deflect(q, U)
  if (x <= 0) return 0
  if (x <= JET.L) return 0.5 * f.a * (x / JET.v0) ** 2
  return f.y1 + (x - JET.L) * f.tan
}

// ---------- 拓展课：喷码（点阵字）和静电屏蔽 ----------
/** 七行五列的点阵字：1 是要打点的地方；第 0 行在最上面 */
export const GLYPHS: Record<string, string[]> = {
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
}
/** 点阵里从下往上第 k 行（k = 1…7）的墨滴要带的电荷量（C）：最下面一行 1.5×10⁻¹³ C（再少就飞不过回收槽），每高一行多带 0.5×10⁻¹³ C */
export const rowCharge = (k: number) => 1.0e-13 + k * 0.5e-13
/** 第 k 行的墨滴落在纸上的侧移（m） */
export const rowOffset = (k: number) => deflect(rowCharge(k)).y
