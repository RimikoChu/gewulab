// 圆锥曲线 · 各课共用的舞台：选一处机位，把这一课自己的东西放进去。同一处机位始终是同一个对象，换课时镜头才会飞过去。
// Frame：一处的局部坐标（原点在 origin，绕 y 轴转 az：局部 +x 是屏幕右边、+z 朝着镜头；再向后仰 tilt）。画图的小件都画在局部的 z = 0 平面里。
import type { ReactNode } from 'react'
import { LabStage, type Label } from '@/lab-kit'
import { SPOT, type WorldWant } from './world'

const FOG: [number, number] = [220, 1000]
export default function At({ at, labels, world, bloom, children = null }: { at: keyof typeof SPOT; labels: Label[]; world?: WorldWant; bloom?: number; children?: ReactNode }) {
  const v = SPOT[at]
  return <LabStage labels={labels} target={v.target} span={v.span} view={v.view} fog={FOG} world={world} bloom={bloom}>{children}</LabStage>
}

type V3 = [number, number, number]
export interface Frame { origin: V3; az: number; tilt?: number }
export function Local({ f, children }: { f: Frame; children: ReactNode }) {
  return <group position={f.origin} rotation-y={f.az}><group rotation-x={-(f.tilt ?? 0)}>{children}</group></group>
}
/** 把局部坐标换成世界坐标（给文字标签用） */
export function toWorld(f: Frame, x: number, y: number, z = 0.05): V3 {
  const t = f.tilt ?? 0, y1 = y * Math.cos(t) + z * Math.sin(t), z1 = -y * Math.sin(t) + z * Math.cos(t)
  const c = Math.cos(f.az), s = Math.sin(f.az)
  return [f.origin[0] + x * c + z1 * s, f.origin[1] + y1, f.origin[2] - x * s + z1 * c]
}
