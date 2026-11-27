// 公路上空的坐标平面（第 6、7 课）：横轴就是这段路的里程，车开到哪，点就描在它头顶上。
import type { ReactNode } from 'react'
import { AxesPlane, GlassFrame, at, type Axes } from './graph'
import { Milestone } from './equip'

export interface Road { A: Axes; X0: number; base: number }
/** 数据点 (x, y) 在世界里的位置 */
export const roadPoint = (R: Road, x: number, y: number, z = 0.12): [number, number, number] => { const p = at(R.A, x, y, z); return [R.X0 + p[0], R.base + p[1], p[2]] }
/** 横轴上 x 对应的路面位置（世界 x） */
export const roadX = (R: Road, x: number) => R.X0 + R.A.ox + x * R.A.sx

export function RoadPlane({ R, posts, children }: { R: Road; posts: number[]; children?: ReactNode }) {
  return (
    <>
      <group position={[R.X0, R.base, 0]}>
        <GlassFrame A={R.A} base={R.base} />
        <AxesPlane A={R.A}>{children}</AxesPlane>
      </group>
      {posts.map(km => <Milestone key={km} km={km} position={[roadX(R, km), 0, 1.05]} />)}
    </>
  )
}
