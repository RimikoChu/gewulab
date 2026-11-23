// 简单机械实验室的计算核心。画面、读数、任务判定、随堂检测都从这里取数，界面和场景文件里不做计算。
// 物理量一律用国际单位（N、m、J）；画面上用到的厘米由这里换算好再交出去。取值约定写在规格卡 docs/specs/machine.md 里。

/** g 取 10 N/kg：一只 50 g 的钩码重 0.5 N，和教材探究里的钩码、习题里的取值一致（规格卡“取值约定”） */
export const G = 10
/** 一只钩码的质量（kg） */
export const HOOK_KG = 0.05
/** n 只钩码受到的重力（N） */
export const hooksN = (n: number) => Math.round(n * HOOK_KG * G * 1e9) / 1e9

/** 保留几位小数后再比较、再显示：避免 0.1 + 0.2 这类浮点尾巴 */
export const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d

// ---------- 力臂：支点到力的作用线的距离 ----------
export type P2 = [number, number]
/**
 * 支点 O 到力的作用线的距离。作用线过作用点 A、沿方向 d。
 * 返回垂足 foot、力臂 arm、垂足在作用线上离 A 多远 t（顺着 d 为正）：t 不为 0 时，作用线要延长才画得到垂足。
 */
export function armOf(O: P2, A: P2, d: P2) {
  const l = Math.hypot(d[0], d[1]) || 1, ux = d[0] / l, uy = d[1] / l
  const t = (O[0] - A[0]) * ux + (O[1] - A[1]) * uy
  const foot: P2 = [A[0] + ux * t, A[1] + uy * t]
  return { foot, arm: Math.hypot(O[0] - foot[0], O[1] - foot[1]), t }
}
/** 力使杠杆绕 O 转动的效果：逆时针为正（N·m）。用叉乘算，力臂和转动方向一起得到 */
export const turn = (O: P2, A: P2, F: P2) => (A[0] - O[0]) * F[1] - (A[1] - O[1]) * F[0]
/** 动力 × 动力臂 = 阻力 × 阻力臂 时，求动力 */
export const effort = (F2: number, l2: number, l1: number) => F2 * l2 / l1
/** 杠杆的类别：动力臂比阻力臂长是省力杠杆，短是费力杠杆，相等是等臂杠杆 */
export type Kind = '省力杠杆' | '费力杠杆' | '等臂杠杆'
export const classify = (l1: number, l2: number): Kind => Math.abs(l1 - l2) < 1e-9 ? '等臂杠杆' : l1 > l2 ? '省力杠杆' : '费力杠杆'

// ---------- 第 1 课 撬棍和杠杆的五要素 ----------
/**
 * 撬棍：长 1.2 m，斜靠在垫块上，和地面成 15°。垫块顶着的那一点是支点 O，离插在石块下面的尖端 0.2 m，离手压的那一头 1.0 m。
 * 石块压在尖端上的力（阻力）是 500 N，竖直向下。
 */
export const BAR = { len: 1.2, toTip: 0.2, toHand: 1.0, tilt: 15, F2: 500 }
const rad = (deg: number) => deg * Math.PI / 180
/** 撬棍从尖端指向手柄的方向 */
export const barDir = (): P2 => [Math.cos(rad(BAR.tilt)), Math.sin(rad(BAR.tilt))]
/** 动力的三种方向：竖直向下、垂直于撬棍向下、斜着向下（偏离垂直于撬棍的方向 45°，朝支点那边） */
export type Push = 'down' | 'normal' | 'slant'
export const PUSH: Record<Push, { name: string }> = { down: { name: '竖直向下' }, normal: { name: '垂直于撬棍' }, slant: { name: '斜着向下' } }
export const SLANT_OFF = 45
export function pushDir(p: Push): P2 {
  const [ux, uy] = barDir(), n: P2 = [uy, -ux]               // 垂直于撬棍、朝下的方向
  if (p === 'down') return [0, -1]
  if (p === 'normal') return n
  const c = Math.cos(rad(SLANT_OFF)), s = Math.sin(rad(SLANT_OFF))
  return [n[0] * c - ux * s, n[1] * c - uy * s]
}
/** 撬棍上的三个点（以支点为原点，单位 m）：尖端、支点、手压的地方 */
export function barPoints() {
  const [ux, uy] = barDir()
  return { O: [0, 0] as P2, tip: [-ux * BAR.toTip, -uy * BAR.toTip] as P2, hand: [ux * BAR.toHand, uy * BAR.toHand] as P2 }
}
/** 第 1 课的全部读数：两个力臂（m）、动力（N），以及画力臂要用的垂足 */
export function crowbar(p: Push) {
  const { O, tip, hand } = barPoints()
  const a1 = armOf(O, hand, pushDir(p)), a2 = armOf(O, tip, [0, -1])
  return { l1: a1.arm, l2: a2.arm, F1: effort(BAR.F2, a2.arm, a1.arm), F2: BAR.F2, foot1: a1.foot, foot2: a2.foot, t1: a1.t, t2: a2.t }
}

// ---------- 第 2 课 探究杠杆的平衡条件 ----------
/** 杠杆尺：每边 6 格，每格 5 cm */
export const RULER = { grid: 0.05, n: 6 }
/** 挂在杠杆一侧的一串钩码：几只、挂在第几格 */
export interface Hang { n: number; at: number }
/** 一侧的钩码使杠杆转动的效果（N·m）= 钩码重 × 到支点的距离（杠杆水平时） */
export const sideMoment = (h: Hang) => hooksN(h.n) * h.at * RULER.grid
/** 三组实验：左边的钩码挂好不动，右边挂几只是定好的，学生找右边挂在第几格能平衡 */
export const GROUPS: { left: Hang; right: number }[] = [
  { left: { n: 2, at: 3 }, right: 3 },
  { left: { n: 3, at: 4 }, right: 2 },
  { left: { n: 4, at: 2 }, right: 2 },
]
/** 右边的钩码挂在第几格才平衡；不在格上就返回 null */
export function balanceAt(g: { left: Hang; right: number }) {
  const at = sideMoment(g.left) / (hooksN(g.right) * RULER.grid)
  const k = Math.round(at)
  return Math.abs(at - k) < 1e-9 && k >= 1 && k <= RULER.n ? k : null
}
/** 没调好时两端的平衡螺母相当于给左边多加了多少转动效果（N·m）：杠杆左端下沉 */
export const NUT_OFF = 0.04
/**
 * 杠杆尺的倾角（度）：左边的转动效果比右边大多少（N·m），倾向哪边。左端下沉为正。
 * 杠杆尺的转轴略高于它的重心，歪了会有一点回正的作用，所以差一点歪一点、差多了才歪到底。画面用的简化，见规格卡
 */
export const TILT_MAX = 10
export const leverTilt = (net: number) => TILT_MAX * Math.tanh(net / 0.02)
/** 一组数据：F₁、l₁、F₂、l₂（N、cm）和两边的乘积（N·cm） */
export function row(left: Hang, right: Hang) {
  const F1 = hooksN(left.n), l1 = round(left.at * RULER.grid * 100, 1), F2 = hooksN(right.n), l2 = round(right.at * RULER.grid * 100, 1)
  return { F1, l1, F2, l2, m1: round(F1 * l1, 2), m2: round(F2 * l2, 2) }
}

// ---------- 第 3 课 斜着拉 ----------
/** 左边第 3 格挂 4 只钩码（2 N）；弹簧测力计钩在左边第 6 格往上拉。拉的方向偏离竖直 0°、30°、60° */
export const SLANT = { hang: { n: 4, at: 3 } as Hang, pullAt: 6, angles: [0, 30, 60] as const }
export type Angle = (typeof SLANT.angles)[number]
/** 斜着拉时的力臂（m）：作用点到支点 l，拉力偏离竖直 θ，力臂 = l cos θ */
export const slantArm = (deg: number) => SLANT.pullAt * RULER.grid * Math.cos(rad(deg))
/** 杠杆在水平位置平衡时测力计的示数（N） */
export const slantForce = (deg: number) => sideMoment(SLANT.hang) / slantArm(deg)

// ---------- 第 4 课 杠杆的分类 ----------
export type Tool = 'barrow' | 'shovel' | 'balance'
/**
 * 三件工具在用的时候：动力臂 l1、阻力臂 l2（m），阻力 F2（N），手移动 hand（m）。
 * 手推车：支点是轮轴，砖和车厢的重力作用在离轮轴 0.4 m 处，手抬车把的地方离轮轴 1.2 m（水平距离）。
 * 铁锹：后手握住锹把顶端不动（支点），前手离它 0.35 m 往上抬，锹头上的沙子离后手 1.05 m。
 * 托盘天平：横梁两臂一样长，各 0.12 m；左盘一个 100 g 的物体，右盘一个 100 g 的砝码。
 */
export const TOOLS: Record<Tool, { name: string; l1: number; l2: number; F2: number; hand: number }> = {
  barrow: { name: '手推车', l1: 1.2, l2: 0.4, F2: 900, hand: 0.3 },
  shovel: { name: '铁锹', l1: 0.35, l2: 1.05, F2: 30, hand: 0.1 },
  balance: { name: '托盘天平', l1: 0.12, l2: 0.12, F2: 1, hand: 0.012 },
}
/** 用一件工具：动力 F1（N）、类别、阻力作用点移动的距离（m）。两个力都竖直，作用点移动的距离和力臂成正比 */
export function toolUse(t: Tool) {
  const T = TOOLS[t]
  return { F1: effort(T.F2, T.l2, T.l1), kind: classify(T.l1, T.l2), load: T.hand * T.l2 / T.l1 }
}

// ---------- 第 5 课 定滑轮和动滑轮 ----------
/** 4 只钩码（2 N），提升 10 cm。这两只滑轮是很轻的塑料轮，滑轮重和摩擦都不计 */
export const PULLEY = { hooks: 4, h: 0.1 }
export type Rig5 = 'fixed' | 'slant' | 'movable'
/** 定滑轮：拉力等于物重，绳端移动的距离等于物体升高的距离；动滑轮：拉力是物重的一半，绳端移动两倍的距离 */
export function rig5(r: Rig5) {
  const Gw = hooksN(PULLEY.hooks), n = r === 'movable' ? 2 : 1
  return { G: Gw, F: Gw / n, h: PULLEY.h, s: n * PULLEY.h, n }
}
/** 定滑轮斜着拉时，拉力偏离竖直多少度 */
export const FIXED_SLANT = 30

// ---------- 第 6 课 滑轮组 ----------
/** 6 只钩码（3 N），提升 10 cm；不计滑轮重、绳重和摩擦 */
export const BLOCK = { hooks: 6, h: 0.1 }
export type Wind = 'n2' | 'n3' | 'n4'
export const WINDS: Record<Wind, { name: string; n: number; up: boolean }> = {
  n2: { name: '一定一动 · 向下拉', n: 2, up: false },
  n3: { name: '一定一动 · 向上拉', n: 3, up: true },
  n4: { name: '二定二动 · 向下拉', n: 4, up: false },
}
/** 承担物重的绳子有 n 段：F = G ÷ n，s = n h */
export const groupForce = (Gw: number, n: number) => Gw / n
export const ropeEnd = (h: number, n: number) => n * h
export function rig6(w: Wind) {
  const Gw = hooksN(BLOCK.hooks), n = WINDS[w].n
  return { G: Gw, n, F: groupForce(Gw, n), h: BLOCK.h, s: ropeEnd(BLOCK.h, n) }
}

// ---------- 第 7 课 机械效率 ----------
/**
 * 一套钢制的滑轮组（一定一动，绳端向上拉，n = 3）。动滑轮和下面的挂钩共重 0.5 N；
 * 绳子和轮轴之间的摩擦折合到绳端，相当于多拉 0.1 N。每次都匀速提升 10 cm。
 */
export const EFF = { n: 3, Gm: 0.5, f: 0.1, h: 0.1, loads: [2, 4, 6] as const }
export const work = (F: number, s: number) => F * s
export const efficiency = (useful: number, total: number) => useful / total
/** 提 k 只钩码：拉力、绳端移动的距离、有用功、总功、额外功、机械效率 */
export function lift(k: number) {
  const Gw = hooksN(k), F = (Gw + EFF.Gm) / EFF.n + EFF.f, s = EFF.n * EFF.h
  const Wu = work(Gw, EFF.h), Wt = work(F, s)
  return { G: Gw, F, h: EFF.h, s, Wu, Wt, Wx: Wt - Wu, eta: efficiency(Wu, Wt) }
}
/** 百分数，保留一位小数 */
export const pct = (x: number) => `${(Math.round(x * 1000) / 10).toFixed(1)}%`

// ---------- 拓展 ----------
/**
 * 塔吊：把它简化成一根绕塔身转的杠杆（不计起重臂、平衡臂自身的重）。平衡臂上的配重 4 t，离塔身中心 10 m；
 * 吊着 2 t 的钢筋，小车从离塔身 8 m 处往外开。吊重 × 幅度 不能超过 配重 × 配重臂。
 */
export const CRANE = { counter: 4000, counterArm: 10, load: 2000, start: 8, jib: 30 }
export const weightOf = (kg: number) => kg * G
/** 吊重最远能开到离塔身多远（m） */
export const craneReach = () => weightOf(CRANE.counter) * CRANE.counterArm / weightOf(CRANE.load)
/** 小车在 r 处时，吊重和配重各自的转动效果（N·m） */
export const craneMoments = (r: number) => ({ load: weightOf(CRANE.load) * r, counter: weightOf(CRANE.counter) * CRANE.counterArm })
/** 手摇绞车（轮轴）：摇把转的半径 R = 0.4 m（轮），卷绳的鼓筒半径 r = 0.08 m（轴），吊一桶 300 N 的砂浆 */
export const WINCH = { R: 0.4, r: 0.08, G: 300 }
/** 轮轴：F × R = G × r */
export const winchForce = () => WINCH.G * WINCH.r / WINCH.R
/** 摇一圈：手走过的路程、砂浆桶升高的距离（m） */
export const winchTurn = () => ({ hand: 2 * Math.PI * WINCH.R, rise: 2 * Math.PI * WINCH.r })
/** 斜面：长 0.5 m、高 0.2 m 的木板，把 4 N 的小车匀速拉上去；小车受到的摩擦力 0.4 N */
export const INCLINE = { L: 0.5, h: 0.2, G: 4, f: 0.4 }
export function incline() {
  const { L, h, G: Gw, f } = INCLINE
  const ideal = Gw * h / L, F = ideal + f, Wu = work(Gw, h), Wt = work(F, L)
  return { ideal, F, Wu, Wt, eta: efficiency(Wu, Wt) }
}
/** 科学计数法：4×10⁵ 这样写 */
export function sci(x: number) {
  if (x === 0) return '0'
  const e = Math.floor(Math.log10(Math.abs(x))), m = round(x / 10 ** e, 2)
  const sup = String(e).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c] ?? c).join('')
  return e === 0 ? String(m) : `${m}×10${sup}`
}

// ---------- 第 1 课：换方向时箭头是转过去的，转到半路的读数也照算 ----------
/** 动力方向的角度（度，从 +x 逆时针量） */
export const pushAngle = (p: Push) => { const d = pushDir(p); return Math.atan2(d[1], d[0]) * 180 / Math.PI }
/** 动力沿 deg 方向时的读数：和 crowbar 一样，只是方向用角度给 */
export function crowbarAt(deg: number) {
  const { O, tip, hand } = barPoints(), d: P2 = [Math.cos(rad(deg)), Math.sin(rad(deg))]
  const a1 = armOf(O, hand, d), a2 = armOf(O, tip, [0, -1])
  return { dir: d, l1: a1.arm, l2: a2.arm, F1: effort(BAR.F2, a2.arm, a1.arm), F2: BAR.F2, foot1: a1.foot, foot2: a2.foot, O, tip, hand }
}
/** 第 7 课：手拉着不动时测力计的示数（没有摩擦的那一份）。读数要在匀速拉动时读 */
export const holdPull = (k: number) => (hooksN(k) + EFF.Gm) / EFF.n
