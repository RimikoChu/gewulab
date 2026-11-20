// 光的折射和凸透镜成像 · 第 3、4、5 课和随堂检测共用的光具座：蜡烛、凸透镜、光屏，以及成的像和三条特殊光线。
import type { ReactNode } from 'react'
import type { Label } from '@/lab-kit'
import { Axis, Candle, Dark, Lens, Ray, Screen } from './optics'
import { F, imageDistance, magnify, nature } from './physics'
import { AXIS, CM, ST } from './world'

const H = 6                                   // 蜡烛的高度（cm）
const X = (cm: number) => ST.bench + cm * CM, Y = (cm: number) => AXIS + cm * CM
const TINT = ['#ffd24a', '#7fe3d4', '#ff8fb3']
/** 光具座上某一点在场景里的位置，给标签用 */
export const benchAt = (cm: number, up = 0): [number, number, number] => [X(cm), Y(up), 0.3]

/** u：物距；screen：光屏放在离透镜多少厘米处（不放就不传）；image：把像画出来；rays：画出前几条特殊光线；f：焦距；k：整体缩小多少（物距很大时用） */
export default function Bench({ u, screen, image = false, rays = 0, f = F, k = 1, labels, children = null }: { u: number; screen?: number; image?: boolean; rays?: number; f?: number; k?: number; labels: Label[]; children?: ReactNode }) {
  const v = imageDistance(u, f), m = magnify(u, f), n = nature(u, f), real = !!n?.real
  const x = (cm: number) => X(cm * k), y = (cm: number) => Y(cm * k)
  const A: [number, number] = [x(-u), y(H)], B: [number, number] = n ? [x(v), y(real ? -m * H : m * H)] : [0, 0], far = 46 / k
  // 三条特殊光线在透镜上的落点高度，和通过透镜以后的去向
  const hit = [H, 0, real ? -m * H : m * H]
  const out = (i: number): [number, number] => real ? B : i === 0 ? [x(far), y(H - H * far / f)] : i === 1 ? [x(far), y(-H * far / u)] : [x(far), y(hit[2])]
  return (
    <Dark at="bench" labels={labels}>
      <Axis x0={X(-45)} x1={X(55)} y={AXIS} marks={[-2 * f, -f, f, 2 * f].map(c => x(c))} />
      <Lens x={X(0)} y={AXIS} h={0.5 * Math.min(1, k + 0.2)} />
      <Candle x={x(-u)} y={AXIS} h={H * CM * k} />
      {screen != null && <Screen x={x(screen)} y={AXIS} />}
      {image && n && <Candle x={B[0]} y={AXIS} h={(real ? -m : m) * H * CM * k} ghost={!real} />}
      {[0, 1, 2].slice(0, rays).map(i => n && (
        <group key={i}>
          <Ray a={A} b={[X(0), y(hit[i])]} color={TINT[i]} />
          <Ray a={[X(0), y(hit[i])]} b={out(i)} color={TINT[i]} />
          {!real && <Ray a={[X(0), y(hit[i])]} b={B} color={TINT[i]} dash />}
          {i === 2 && !real && <Ray a={[x(-f), y(0)]} b={A} color={TINT[i]} dash />}
        </group>
      ))}
      {children}
    </Dark>
  )
}
