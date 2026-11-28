// 第 1、2 课、拓展课和随堂检测共用的激光双缝台：激光器、双缝、光屏排在一根导轨上。
import type { ReactNode } from 'react'
import type { Label } from '@/lab-kit'
import { Beam, Dark, Fan, Laser, Pattern, Rail, Screen, SlideBox, SlitHolder, SCREEN, type V3 } from './gear'
import { LIGHTS, SLIT_A, fringeGap, type LightKey } from './physics'
import { AX, ST } from './world'

/** 导轨上 1 m 画成多少个单位（沿光路方向缩短了画，器材的粗细没有缩） */
export const PER_M = 2.6
const X0 = ST.slit
/** 激光器出光嘴、双缝的位置；光屏在双缝后面 L 处 */
export const X_LASER = X0 - 2.2, X_SLIT = X0 - 1.55, screenX = (L: number) => X_SLIT + L * PER_M
/** 台上某一点给标签用的位置 */
export const benchAt = (x: number, up = 0, z = 0): V3 => [x, AX + up, z]
/** 屏上 mm 处在场景里的位置 */
export const onScreen = (L: number, mm: number, up = 0): V3 => [screenX(L) - 0.02, AX + up, mm / SCREEN.mm * SCREEN.w / 2]

/** light：哪种光；d：缝距（mm）；L：屏距（m）；one：挡住一条缝的程度（0–1）；gain：屏上的亮度；view、span：机位；pattern 为 false 时屏上的图样由 children 自己画 */
export default function Bench({ light, d, L, one = 0, gain = 1, pattern = true, slits = 2, view = [-0.95, 0.24], span = [4.4, 2.3], dx = -0.42, dy = 0.12, labels, children = null, onBoard = null }: {
  light: LightKey; d: number; L: number; one?: number; gain?: number; pattern?: boolean; slits?: 0 | 1 | 2; view?: [number, number]; span?: [number, number]; dx?: number; dy?: number; labels: Label[]; children?: ReactNode; onBoard?: ReactNode
}) {
  const { hex, nm } = LIGHTS[light], xs = screenX(L), env = fringeGap(L, nm, SLIT_A)
  return (
    <Dark at="slit" dx={dx} dy={dy} span={span} view={view} lamp={60} labels={labels}>
      <Rail x0={X0 - 3.4} x1={X0 + 2.2} perM={PER_M} />
      <Laser x={X_LASER} color={hex} />
      <SlideBox x={X0 - 0.9} z={0.95} />
      <Beam a={[X_LASER, AX, 0]} b={[X_SLIT - 0.008, AX, 0]} color={hex} />
      <SlitHolder x={X_SLIT} slits={slits} half={one > 0.5} spot={hex} />
      <Fan x0={X_SLIT} x1={xs} half={Math.min(SCREEN.w / 2, env / SCREEN.mm * SCREEN.w / 2)} color={hex} k={gain} />
      <Screen x={xs}>
        {pattern && <Pattern mode="double" color={hex} period={fringeGap(L, nm, d)} env={env} gain={gain * (1.15 + one * 1.2)} one={one} />}
        {onBoard}
      </Screen>
      <pointLight position={[xs - 0.5, AX, 0]} intensity={0.9 * gain} distance={3.2} decay={1.6} color={hex} />
      {children}
    </Dark>
  )
}
