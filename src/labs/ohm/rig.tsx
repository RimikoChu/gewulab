// 伏安法的那一套电路（第 1–6 课共用）。全部按厘米写，原点在台面上这一课的中心，前方 +z。
// 后排：左边直流稳压电源，中间电压表，右边电流表；中排：电压表前面是被测的元件；前排：左边开关，右边滑动变阻器。
// 电流从电源“+”出来，经开关、滑动变阻器（一下 A、一上 D）、电流表（“0.6”进、“−”出）、元件（从右往左），回到电源“−”；
// 电压表的两根线从后面接到元件两头（“3”接电流流进的那头）。这样摆，导线互不交叉，也不穿过器材。
// 第 3 课没有变阻器，开关直接接到电流表；第 6 课是两只电阻，可以只接一只、串联、并联。
import type { ReactNode } from 'react'
import { BLACK, Glove, KnifeSwitch, LampBoard, Meter, RED, ResBoard, Rheostat, Supply, add, meterPosts, resPosts, rheoPosts, supplyPosts, switchPosts, type V3 } from './gear'
import { Wire, type End } from './wires'
import { needle, type Combo } from './physics'

export const POS = { SUP: [-34, 0, -14] as V3, EL: [-10, 0, -6] as V3, VOLT: [-10, 0, -26] as V3, AMP: [16, 0, -12] as V3, SW: [-30, 0, 14] as V3, RHEO: [16, 0, 14] as V3 }
/** 第 6 课两只电阻各放在哪：只接一只时另一只放在台子前面；串联左右并排；并联前后排 */
export const COMBO_AT: Record<Combo, { r1: V3; r2: V3 }> = {
  r1: { r1: POS.EL, r2: [2, 0, 6] },
  r2: { r1: [-22, 0, 6], r2: POS.EL },
  series: { r1: [-17, 0, -6], r2: [-1, 0, -6] },
  parallel: { r1: [-10, 0, 0], r2: [-10, 0, -12] },
}
const SP = supplyPosts(), MP = meterPosts(), RP = resPosts(), HP = rheoPosts(), KP = switchPosts()
const Y = '#d8b33a', BLUE = '#2f62b0', GREEN = '#3c8a4c'
export const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]

export interface RigProps {
  /** rheo：带滑动变阻器；direct：开关直接接电流表（第 3 课）；combo：两只电阻（第 6 课） */
  mode: 'rheo' | 'direct' | 'combo'
  /** 被测元件：一只定值电阻（tag、print），或一只小灯泡（lamp 给出亮度） */
  tag?: string; print?: string[]; lamp?: number
  /** 第 6 课：现在怎么接；正在换接法时 from 是原来的接法，k 是挪了多少（挪的时候导线先拆掉） */
  combo?: Combo; from?: Combo | null; k?: number
  /** 开关合上了多少（0–1）；滑片位置；通过电流表的电流（A）；电压表两端的电压（V）；电源显示的电压和旋钮 */
  knife: number; p?: number; I: number; U: number; usup: number; knob?: number
  /** 并联时通过 R₂ 那条支路的电流（A） */
  i2?: number
  onDrag?: (p: number) => void; hand?: boolean
  /** 换下来的元件、正在换上去的元件：由这一课自己画（第 2、3 课）。el 给了就不画默认的那只；elWires 为假时元件两头的导线先拆掉 */
  spare?: ReactNode; el?: ReactNode; elWires?: boolean
}
interface W { a: End; b: End; color: string; via?: (V3 | [number, number])[]; flow: number }

export function Rig({ mode, tag = '', print = [], lamp, combo = 'r1', from = null, k = 1, knife, p = 1, I, U, usup, knob = 0.5, i2 = 0, onDrag, hand = false, spare, el, elWires = true }: RigProps) {
  const live = knife > 0.99, f = live ? I : 0
  const sPlus: End = { p: add(POS.SUP, SP.plus), d: [0, 0, 1] }, sMinus: End = { p: add(POS.SUP, SP.minus), d: [0, 0, 1] }
  const swA: End = { p: add(POS.SW, KP.a) }, swB: End = { p: add(POS.SW, KP.b) }
  const aLo: End = { p: add(POS.AMP, MP.lo) }, aNeg: End = { p: add(POS.AMP, MP.neg) }
  const vLo = add(POS.VOLT, MP.lo), vNeg = add(POS.VOLT, MP.neg)
  const ws: W[] = [{ a: sPlus, b: swA, color: RED, flow: f }]
  if (mode === 'rheo') ws.push(
    { a: swB, b: { p: add(POS.RHEO, HP.A) }, color: RED, flow: f },
    { a: { p: add(POS.RHEO, HP.D) }, b: aLo, color: Y, flow: f },
  )
  else ws.push({ a: swB, b: aLo, color: RED, flow: f, via: [[2, 13], [17, 3]] })
  // 元件那一段
  let body: ReactNode = null
  const moving = mode === 'combo' && from !== null && k < 1
  if (mode !== 'combo') {
    const l = add(POS.EL, RP.l), r = add(POS.EL, RP.r)
    if (elWires) {
      ws.push({ a: aNeg, b: { p: r }, color: Y, flow: f, via: [[10, -3]] }, { a: { p: l }, b: sMinus, color: BLACK, flow: f })
      ws.push({ a: { p: vLo }, b: { p: r, o: 1.3 }, color: RED, flow: 0 }, { a: { p: vNeg }, b: { p: l, o: 1.3 }, color: BLACK, flow: 0 })
    }
    body = el ?? <group position={POS.EL}>{lamp !== undefined ? <LampBoard glow={live ? lamp : 0} tag={tag} /> : <ResBoard tag={tag} print={print} />}</group>
  } else {
    const at = COMBO_AT[combo], was = from ? COMBO_AT[from] : at
    const r1 = moving ? lerp3(was.r1, at.r1, k) : at.r1, r2 = moving ? lerp3(was.r2, at.r2, k) : at.r2
    const p1 = { l: add(r1, RP.l), r: add(r1, RP.r) }, p2 = { l: add(r2, RP.l), r: add(r2, RP.r) }
    if (!moving) {
      if (combo === 'r1' || combo === 'r2') {
        const q = combo === 'r1' ? p1 : p2
        ws.push({ a: aNeg, b: { p: q.r }, color: Y, flow: f, via: [[10, -3]] }, { a: { p: q.l }, b: sMinus, color: BLACK, flow: f })
        ws.push({ a: { p: vLo }, b: { p: q.r, o: 1.3 }, color: RED, flow: 0 }, { a: { p: vNeg }, b: { p: q.l, o: 1.3 }, color: BLACK, flow: 0 })
      } else if (combo === 'series') {
        ws.push({ a: aNeg, b: { p: p2.r }, color: Y, flow: f, via: [[10, -3]] }, { a: { p: p2.l }, b: { p: p1.r }, color: GREEN, flow: f }, { a: { p: p1.l }, b: sMinus, color: BLACK, flow: f })
        ws.push({ a: { p: vLo }, b: { p: p2.r, o: 1.3 }, color: RED, flow: 0 }, { a: { p: vNeg }, b: { p: p1.l, o: 1.3 }, color: BLACK, flow: 0, via: [[-24, -17]] })
      } else {
        // 并联：两只电阻的右头连在一起、左头连在一起；电流在右头分成两股
        const b2 = live ? i2 : 0
        ws.push({ a: aNeg, b: { p: p1.r }, color: Y, flow: f, via: [[10, 1]] }, { a: { p: p1.r }, b: { p: p2.r }, color: GREEN, flow: b2 }, { a: { p: p2.l }, b: { p: p1.l }, color: BLUE, flow: b2 }, { a: { p: p1.l }, b: sMinus, color: BLACK, flow: f })
        ws.push({ a: { p: vLo }, b: { p: p2.r, o: 1.3 }, color: RED, flow: 0 }, { a: { p: vNeg }, b: { p: p2.l, o: 1.3 }, color: BLACK, flow: 0 })
      }
    }
    body = <>
      <group position={r1}><ResBoard tag="R₁ = 10 Ω" print={['5W', '10ΩJ']} />{moving && from !== combo && (was.r1 !== at.r1) && <group position={[0, 4.5, 1.5]} rotation-x={0.75}><Glove scale={0.32} /></group>}</group>
      <group position={r2}><ResBoard tag="R₂ = 15 Ω" print={['5W', '15ΩJ']} />{moving && was.r2 !== at.r2 && was.r1 === at.r1 && <group position={[0, 4.5, 1.5]} rotation-x={0.75}><Glove scale={0.32} /></group>}</group>
    </>
  }
  return <group>
    <group position={POS.SUP}><Supply u={usup} knob={knob} /></group>
    <group position={POS.SW}><KnifeSwitch on={knife} /></group>
    <group position={POS.AMP}><Meter kind="A" k={needle(f, 'A')} /></group>
    <group position={POS.VOLT}><Meter kind="V" k={needle(live ? U : 0, 'V')} /></group>
    {mode === 'rheo' && <group position={POS.RHEO}><Rheostat p={p} onDrag={onDrag} hand={hand} /></group>}
    {body}
    {spare}
    {ws.map((w, i) => <Wire key={`${mode}${combo}${i}`} {...w} />)}
  </group>
}
