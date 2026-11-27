// 电子屏上的坐标系（第 4、5 课和拓展课用）：−5 到 5 的方格坐标系，一格 1 个单位。
import type { ReactNode } from 'react'
import { LedBoard, type Axes } from './graph'

/** 屏面左下角在局部 (0, 0)；原点在屏面正中 */
export const GRID: Axes = { xr: [-5, 5], yr: [-5, 5], xStep: 1, yStep: 1, sx: 0.86, sy: 0.86, ox: 6.2, oy: 5.6, xName: 'x', yName: 'y', font: 0.44, w: 12.4, h: 11.4 }
export const LIFT = 2.6
/** 一块立在地上的电子屏。at：屏面底边中点在世界里的位置；face：屏面朝 +z（1）还是 −z（−1） */
export function Board({ A = GRID, at, face, children }: { A?: Axes; at: [number, number, number]; face: 1 | -1; children?: ReactNode }) {
  return (
    <group position={[at[0] - face * A.w / 2, at[1], at[2]]} rotation-y={face > 0 ? 0 : Math.PI}>
      <LedBoard A={A} lift={LIFT}>{children}</LedBoard>
    </group>
  )
}
/** 屏上的数据点 (x, y) 在世界里的位置 */
export function boardPoint(A: Axes, at: [number, number, number], face: 1 | -1, x: number, y: number, out = 0.3): [number, number, number] {
  const lx = A.ox + x * A.sx - A.w / 2
  return [at[0] + face * lx, at[1] + LIFT + A.oy + y * A.sy, at[2] + face * out]
}
