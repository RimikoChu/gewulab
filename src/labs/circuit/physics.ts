// 电路实验室的计算核心。画面、读数、任务判定、随堂检测都从这里取数，界面文件里不做计算。
// 取值约定写在规格卡 docs/specs/circuit.md：一节干电池 1.5 V；电池内阻、导线电阻不计；电表当作理想电表；小灯泡当作阻值不变的用电器。

/** 四舍五入到 d 位小数 */
export const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d

// ---------- 电源和灯泡 ----------
/** 一节干电池的电压（V） */
export const CELL = 1.5
/** n 节干电池串联的电压（V） */
export const batteryU = (n: number) => CELL * n
/** 电池盒里两节干电池：各课的电源电压 */
export const U0 = batteryU(2)
/** 两只规格不同的小灯泡（Ω）：阻值按不变处理 */
export const LAMP = { L1: 10, L2: 15 } as const
export type LampKey = keyof typeof LAMP
/** 亮度满格对应的功率（W）：只用于画面上灯丝的亮度 */
const P_FULL = 0.9
/** 灯泡的亮度（0–1）：按实际功率 U²/R 和 P_FULL 比，开个方让“较暗”也看得出在亮 */
export const brightness = (u: number, r: number) => u <= 0 ? 0 : Math.min(1, Math.sqrt((u * u / r) / P_FULL))

// ---------- 第 1 课：电路的三种状态 ----------
export type Loop = 'open' | 'closed' | 'short'
export const LOOP_NAME: Record<Loop, string> = { open: '断路', closed: '通路', short: '短路' }
/** 开关闭合没有、电池两极有没有被导线直接连起来 */
export function loopState(switchOn: boolean, shortWire: boolean): Loop {
  if (shortWire) return 'short'          // 导线直接接在电池两极上：开关断开也一样是短路
  return switchOn ? 'closed' : 'open'
}
/** 只有一只灯 L₁ 的电路：灯两端的电压、通过的电流。短路时电流不出数（不计内阻时是无穷大） */
export function singleLamp(state: Loop) {
  if (state === 'closed') return { u: U0, i: U0 / LAMP.L1, lit: brightness(U0, LAMP.L1) }
  return { u: 0, i: state === 'short' ? Infinity : 0, lit: 0 }
}

// ---------- 第 2、4、6 课：串联和并联 ----------
export type Link = 'series' | 'parallel'
export const LINK_NAME: Record<Link, string> = { series: '串联', parallel: '并联' }
export interface Two { I: number; I1: number; I2: number; U1: number; U2: number; U: number; b1: number; b2: number; paths: number }
/** 两只灯串联：off 是拧下了哪只（拧下的地方断开） */
export function seriesCircuit(on: boolean, off: LampKey | null = null, U = U0): Two {
  if (!on || off) return { I: 0, I1: 0, I2: 0, U1: 0, U2: 0, U: on ? U : U, b1: 0, b2: 0, paths: 1 }
  const I = U / (LAMP.L1 + LAMP.L2), U1 = I * LAMP.L1, U2 = I * LAMP.L2
  return { I, I1: I, I2: I, U1, U2, U, b1: brightness(U1, LAMP.L1), b2: brightness(U2, LAMP.L2), paths: 1 }
}
/** 两只灯并联：拧下一只，只断那一条支路 */
export function parallelCircuit(on: boolean, off: LampKey | null = null, U = U0): Two {
  if (!on) return { I: 0, I1: 0, I2: 0, U1: 0, U2: 0, U, b1: 0, b2: 0, paths: 2 }
  const I1 = off === 'L1' ? 0 : U / LAMP.L1, I2 = off === 'L2' ? 0 : U / LAMP.L2
  return { I: I1 + I2, I1, I2, U1: U, U2: U, U, b1: off === 'L1' ? 0 : brightness(U, LAMP.L1), b2: off === 'L2' ? 0 : brightness(U, LAMP.L2), paths: 2 }
}
export const twoLamps = (link: Link, on: boolean, off: LampKey | null = null) => link === 'series' ? seriesCircuit(on, off) : parallelCircuit(on, off)

/** 第 4 课：电流表接的三处。串联时 A 在 L₁ 前、B 在两灯之间、C 在 L₂ 后；并联时 A 在 L₁ 支路、B 在 L₂ 支路、C 在干路 */
export type Point = 'A' | 'B' | 'C'
export const ammeterAt = (link: Link, at: Point) => { const c = twoLamps(link, true); return link === 'series' ? c.I : at === 'A' ? c.I1 : at === 'B' ? c.I2 : c.I }
/** 第 6 课：电压表接在哪两点之间 */
export type Across = 'L1' | 'L2' | 'src'
export const voltmeterAt = (link: Link, at: Across) => { const c = twoLamps(link, true); return at === 'L1' ? c.U1 : at === 'L2' ? c.U2 : c.U }

// ---------- 第 3、5 课：电表 ----------
export type MeterKind = 'A' | 'V'
/** 两种电表的两个量程：满偏的值和分度值 */
export const RANGES = { A: { lo: { max: 0.6, step: 0.02 }, hi: { max: 3, step: 0.1 } }, V: { lo: { max: 3, step: 0.1 }, hi: { max: 15, step: 0.5 } } } as const
export type Range = 'lo' | 'hi'
/** 指针能偏到哪：满偏以外再多一点就碰到限位 */
export const STOP = 1.08
/**
 * 电表的示数：x 是通过电流表的电流或电压表两端的电压，range 接的是哪个量程，reversed 正负接线柱接反了没有。
 * 返回指针偏了满偏的几分之几（接反为负、超量程封顶）、读数（量程以外读不出）、是不是超过了量程。
 */
export function meterRead(kind: MeterKind, range: Range, x: number, reversed = false) {
  const R = RANGES[kind][range], k = x / R.max * (reversed ? -1 : 1)
  const over = k > 1.0001, back = k < -0.0001
  return { k: Math.max(-0.12, Math.min(STOP, k)), value: over || back ? null : round(x, kind === 'A' ? 2 : 1), over, back, max: R.max, step: R.step, divisions: Math.round(R.max / R.step) }
}
/** 第 3 课：只接 L₁ 的电路里的电流 */
export const lessonThreeI = () => U0 / LAMP.L1

// ---------- 第 5 课：电池的电压 ----------
export const CELLS = [1, 2, 3] as const

// ---------- 第 7 课：电阻 ----------
/** 长 1 m、横截面积 1 mm² 的导线在 20 ℃ 时的电阻（Ω）：教材里的表 */
export const RHO = { nichrome: { name: '镍铬合金', r: 1.1 }, manganin: { name: '锰铜合金', r: 0.44 } } as const
/** 细金属丝的横截面积（mm²）：自定的器材参数，界面上不出 */
const THIN = 0.055
/** 导体的电阻 R = ρ l ÷ S：mat 材料，l 长度（m），s 横截面积（mm²） */
export const wireR = (mat: keyof typeof RHO, l: number, s: number) => RHO[mat].r * l / s
/** 电阻示教板上的四根金属丝 */
export const WIRES = {
  a: { name: 'a', mat: 'nichrome', l: 0.5, s: THIN, desc: '镍铬合金 · 长 0.5 m · 细' },
  b: { name: 'b', mat: 'nichrome', l: 0.25, s: THIN, desc: '镍铬合金 · 长 0.25 m · 细' },
  c: { name: 'c', mat: 'nichrome', l: 0.5, s: THIN * 2, desc: '镍铬合金 · 长 0.5 m · 粗' },
  d: { name: 'd', mat: 'manganin', l: 0.5, s: THIN, desc: '锰铜合金 · 长 0.5 m · 细' },
} as const
export type WireKey = keyof typeof WIRES
export const wireOf = (k: WireKey) => wireR(WIRES[k].mat, WIRES[k].l, WIRES[k].s)
/** 灯泡 L₁ 和一段电阻 r 串联在 3 V 上的电流 */
export const withLamp = (r: number) => U0 / (LAMP.L1 + r)
export const boardI = (k: WireKey) => withLamp(wireOf(k))
/** 滑动变阻器的铭牌 */
export const RHEO = { max: 20, amp: 2 } as const
/** 一上一下接法：滑片位置 p（0 在下接线柱那一端，1 在另一端），接入电路的是滑片到下接线柱那一段线圈 */
export const rheoR = (p: number) => RHEO.max * Math.min(1, Math.max(0, p))
export const rheoI = (p: number) => withLamp(rheoR(p))

// ---------- 拓展课 ----------
/** 家庭电路的电压（V） */
export const MAINS = 220
/** 楼梯灯的双控开关：两个单刀双掷开关用两根联络线相连，扳到同一根线上时灯亮 */
export const twoWay = (down: 0 | 1, up: 0 | 1) => down === up
/** 插座上的用电器并联在 220 V 上：插着的都在工作，电压都是 220 V */
export const sockets = (plugged: Record<string, boolean>) => Object.fromEntries(Object.entries(plugged).map(([k, on]) => [k, { on, u: on ? MAINS : 0 }]))
/** 第 7 课：灯泡 L₁ 通过电流 i 时的亮度 */
export const lampLit = (i: number) => brightness(i * LAMP.L1, LAMP.L1)
