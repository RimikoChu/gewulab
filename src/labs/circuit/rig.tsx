// 两只灯的电路（第 2、4、6 课共用）：电池盒在左前，开关在右前，两只灯在后面。
// 串联时两只灯左右并排，首尾相接；并联时两只灯前后排，各自一条支路，两条支路都从开关的右接线柱出发、回到电池的负极（一个接线柱上接两根导线）。
// 电流表接在 A、B、C 哪一处，就把那一处的导线断开、电流表串进去；电压表的两根线接在被测元件的两头。
// 全部按厘米写。这里只摆器材、连导线，电流和电压都由调用的那一课从 physics.ts 取来交进来。
import { BatteryBox, KnifeSwitch, Lamp, RED, BLACK, add, boxPosts, lampPosts, switchPosts } from './gear'
import { Meter, meterPosts } from './meter'
import type { Across, Link, Point, Two } from './physics'
import { Glove, lerp3 } from './parts'
import { Wire } from './wires'
import type { V3 } from './world'

export const BAT: V3 = [-10, 0, 9], SW: V3 = [10, 0, 9]
/** 两只灯的位置：串联左右并排，并联前后排 */
export const LAMPS: Record<Link, { L1: V3; L2: V3 }> = { series: { L1: [-8, 0, -5], L2: [8, 0, -5] }, parallel: { L1: [0, 0, -3], L2: [0, 0, -12.5] } }
/** 电流表放在哪（串联、并联各三处） */
export const AMP_AT: Record<Link, Record<Point, V3>> = {
  series: { A: [-14, 0, -17], B: [0, 0, -17], C: [14, 0, -17] },
  parallel: { A: [-14, 0, -2.6], B: [-15, 0, -14.5], C: [12, 0, -21] },
}
/** A、B、C 三处的字标在导线上的哪里 */
export const POINT_TAG: Record<Link, Record<Point, V3>> = {
  series: { A: [-17, 1.5, 3], B: [0, 1.5, -9.5], C: [17, 1.5, 2] },
  parallel: { A: [-12, 1.5, -1], B: [-12, 1.5, -10.5], C: [20, 1.5, 1] },
}
/** 电压表放在后面正中 */
export const VOLT_AT: V3 = [0, 0, -23]
const BP = boxPosts(2), LP = lampPosts(), SP = switchPosts(), MP = meterPosts()
const Y = '#d8b33a', BLUE = '#2f62b0'

interface W { a: V3; b: V3; color: string; via?: V3[]; flow: number; lift?: number; m?: boolean }
export interface RigProps {
  link: Link; c: Two
  /** 开关合上了多少（0–1）；拧下 L₁ 拧了多少（0–1）；两只灯正从一种排法挪到另一种（0 串联的位置，1 并联的位置） */
  knife: number; out?: number; move: number
  /** 导线连好了没有（挪灯的时候先拆掉） */
  wired: boolean
  amp?: Point | null; ampK?: number
  /** 电流表正在挪：画在这里，接它的两根导线先不画 */
  ampPos?: V3 | null
  volt?: Across | null; voltK?: number
}
export function TwoLampRig({ link, c, knife, out = 0, move, wired, amp = null, ampK = 0, ampPos = null, volt = null, voltK = 0 }: RigProps) {
  const L1 = lerp3(LAMPS.series.L1, LAMPS.parallel.L1, move), L2 = lerp3(LAMPS.series.L2, LAMPS.parallel.L2, move)
  const live = knife > 0.99
  const bPlus = add(BAT, BP.plus), bMinus = add(BAT, BP.minus), sA = add(SW, SP.a), sB = add(SW, SP.b)
  const l1a = add(L1, LP.a), l1b = add(L1, LP.b), l2a = add(L2, LP.a), l2b = add(L2, LP.b)
  const f = (i: number) => live ? i : 0
  const M = amp ? AMP_AT[link][amp] : null, mLo = M && add(M, MP.lo), mNeg = M && add(M, MP.neg)
  // 一段导线：要是电流表接在这一处，就拆成两段，中间串进电流表（电流从“0.6”进、从“−”出）
  const seg = (at: Point | null, w: W, toMeter: V3[] = [], fromMeter: V3[] = []): W[] => (at && amp === at && mLo && mNeg)
    ? [{ ...w, b: mLo, via: toMeter, m: true }, { ...w, a: mNeg, via: fromMeter, color: BLACK, m: true }] : [w]
  let ws: W[] = []
  if (link === 'series') {
    ws = [
      { a: bPlus, b: sA, color: RED, flow: f(c.I) },
      ...seg('C', { a: sB, b: l2b, color: Y, flow: f(c.I), via: [[16, 0, 1]] }, [[18, 0, 2], [19, 0, -10]], [[10, 0, -10]]),
      ...seg('B', { a: l2a, b: l1b, color: Y, flow: f(c.I), via: [[0, 0, -9]] }, [[4, 0, -11]], [[-4, 0, -11]]),
      ...seg('A', { a: l1a, b: bMinus, color: BLACK, flow: f(c.I), via: [[-16, 0, 2]] }, [[-11, 0, -10]], [[-21, 0, -8], [-21, 0, 6]]),
    ]
  } else {
    // 干路上的电流表接在开关和两条支路的分支点之间：它的“−”接线柱就是分支点
    const C = amp === 'C' && mLo && mNeg, P = C ? mNeg : sB
    ws = [
      { a: bPlus, b: sA, color: RED, flow: f(c.I) },
      ...(C ? [{ a: sB, b: mLo, color: Y, flow: f(c.I), via: [[20, 0, 2], [20, 0, -14]] as V3[], m: true }] : []),
      { a: P, b: l1b, color: Y, flow: f(c.I1), via: C ? [[7, 0, -9]] : [[15, 0, -0.5]], m: !!C },
      { a: P, b: l2b, color: Y, flow: f(c.I2), via: C ? [] : [[19, 0, -8], [8, 0, -10.5]], m: !!C },
      ...seg('A', { a: l1a, b: bMinus, color: BLACK, flow: f(c.I1), via: [[-13, 0, -1]] }, [[-8, 0, -0.5]], [[-18, 0, 4]]),
      ...seg('B', { a: l2a, b: bMinus, color: BLUE, flow: f(c.I2), via: [[-10, 0, -10.5], [-21, 0, -6], [-22, 0, 6]] }, [[-8, 0, -11]], [[-22, 0, -4], [-22, 0, 6]]),
    ]
  }
  // 电压表：两根线接到被测的两点（电流进去的那头接“3”）
  if (volt) {
    const V = VOLT_AT, vLo = add(V, MP.lo), vNeg = add(V, MP.neg)
    const [hi, lo]: [V3, V3] = volt === 'L1' ? [l1b, l1a] : volt === 'L2' ? [l2b, l2a] : [bPlus, bMinus]
    ws.push({ a: hi, b: vLo, color: RED, flow: 0, lift: volt === 'src' ? 0 : 0, via: volt === 'src' ? (link === 'series' ? [[0, 0, 3], [1, 0, -12]] : [[5, 0, 4], [9, 0, -7], [6, 0, -18]]) : [] },
      { a: lo, b: vNeg, color: BLACK, flow: 0, via: volt === 'src' ? [[-20, 0, 0], [-17, 0, -14], [-7, 0, -19]] : [] })
  }
  return <group>
    <group position={BAT}><BatteryBox n={2} /></group>
    <group position={SW}><KnifeSwitch on={knife} /></group>
    <group position={L1}><Lamp lit={live ? c.b1 : 0} out={out} name="L₁" /></group>
    <group position={L2}><Lamp lit={live ? c.b2 : 0} name="L₂" /></group>
    {M && <group position={ampPos ?? M}><Meter kind="A" k={ampK} />{ampPos && <group position={[0, 11.2, -2.4]}><Glove scale={0.5} /></group>}</group>}
    {volt && <group position={VOLT_AT}><Meter kind="V" k={voltK} /></group>}
    {wired && ws.map((w, i) => (!w.m || !ampPos) && <Wire key={`${link}${amp}${volt}${i}`} {...w} />)}
  </group>
}
