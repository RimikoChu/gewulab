// 光的反射和平面镜 · 第 2 课和随堂检测共用的一套器材：平放的平面镜、立在上面的可折转光屏、吸在光屏上的激光笔，和画在光屏上的光路。
import type { ReactNode } from 'react'
import type { Label } from '@/lab-kit'
import { Arc, Dark, Dot, Laser, Ray, type V2 } from './optics'
import { bounce } from './physics'
import { FlatMirror, ProtractorBoard } from './props'
import { ST, TOP } from './world'

// 入射点 O 在 (X0, MY)：镜面的高度。光屏的宽、高和量角刻度的半径
const X0 = ST.law, MY = TOP + 0.05, W = 2.7, H = 1.3, R = 0.74
export const O: V2 = [X0, MY]
const RED = '#ff5a4a'
/** 光屏上离入射点 r、偏离法线 a 度的一点（a 为负在左边），给标签用 */
export const boardAt = (a: number, r: number): [number, number, number] => [X0 + Math.sin(a * Math.PI / 180) * r, MY + Math.cos(a * Math.PI / 180) * r, 0.1]

/** i：入射角；fold：右半边光屏向后折了多少弧度；rev：让光逆着原来的反射光线射入；k：光路画出了多少（0 到 1） */
export default function Board({ i, fold = 0, rev = false, k = 1, labels, children = null }: { i: number; fold?: number; rev?: boolean; k?: number; labels: Label[]; children?: ReactNode }) {
  const b = bounce(i), s = rev ? -1 : 1, folded = fold > 0.02
  // 入射光线从哪来、反射光线往哪去。逆着射入时左右对调
  const src: V2 = [O[0] - s * b.d[0] * 0.86, O[1] - b.d[1] * 0.86], dst: V2 = [O[0] + s * b.out[0] * 1.18, O[1] + b.out[1] * 1.18]
  const kin = Math.min(1, k * 1.75), kout = Math.max(0, (k - 0.57) / 0.43)
  // 右半边光屏折到后面去了：反射光线还在原来的地方，但没有东西接住它，看不见了
  const hidOut = folded && !rev
  return (
    <Dark at="law" labels={labels}>
      <FlatMirror x={X0} y={MY} w={2.9} d={0.66} />
      <ProtractorBoard x={X0} y={MY} z={-0.012} W={W} H={H} R={R} fold={fold} />
      <Laser tip={src} dir={[s * b.d[0], b.d[1]]} z={0.036} mount />
      <Ray a={src} b={[src[0] + (O[0] - src[0]) * kin, src[1] + (O[1] - src[1]) * kin]} color={RED} z={0.006} arrow={kin >= 1} />
      {kout > 0 && !hidOut && <Ray a={O} b={[O[0] + (dst[0] - O[0]) * kout, O[1] + (dst[1] - O[1]) * kout]} color={RED} z={0.006} arrow={kout >= 1} />}
      <Dot at={O} r={0.016} />
      {kin >= 1 && <Arc at={O} from={90} to={90 + s * i} r={0.3} />}
      {kout >= 1 && !hidOut && <Arc at={O} from={90} to={90 - s * b.r} r={0.36} color="#7fe3d4" />}
      {children}
    </Dark>
  )
}
