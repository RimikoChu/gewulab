// 二次函数 · 各课共用的舞台：选一处机位，把这一课自己的东西放进去。同一处机位始终是同一个对象，换课时镜头才会飞过去。
// Local：这一处的局部坐标（原点放在 origin，绕 y 轴转到和机位一致：局部 +x 是屏幕右边，+z 朝着镜头）。
import type { ReactNode } from 'react'
import { LabStage, type Label } from '@/lab-kit'
import { SPOT, type WorldWant } from './world'

const FOG: [number, number] = [160, 700]
export default function At({ at, labels, world, children = null }: { at: keyof typeof SPOT; labels: Label[]; world?: WorldWant; children?: ReactNode }) {
  const v = SPOT[at]
  return <LabStage labels={labels} target={v.target} span={v.span} view={v.view} fog={FOG} world={world}>{children}</LabStage>
}

type V3 = [number, number, number]
export function Local({ origin, az, children }: { origin: V3; az: number; children: ReactNode }) {
  return <group position={origin} rotation-y={az}>{children}</group>
}
/** 把局部坐标换成世界坐标（给文字标签用） */
export function toWorld(origin: V3, az: number, p: V3): V3 {
  const c = Math.cos(az), s = Math.sin(az)
  return [origin[0] + p[0] * c + p[2] * s, origin[1] + p[1], origin[2] - p[0] * s + p[2] * c]
}
