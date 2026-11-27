// 导数 · 各课共用的舞台：选一处机位，把这一课自己的东西放进去。同一处机位始终是同一个对象，换课时镜头才会飞过去。
// RoadCar：停在（或开在）山路上的那辆蓝色小轿车，车身跟着路面的坡度俯仰。
import type { ReactNode } from 'react'
import { LabStage, type Label } from '@/lab-kit'
import { Sedan } from './car'
import { LANE, R, Rp } from './terrain'
import { SPOT } from './world'

const FOG: [number, number] = [320, 1500]
export default function At({ at, labels, children = null, bloom = 0.22 }: { at: keyof typeof SPOT; labels: Label[]; children?: ReactNode; bloom?: number }) {
  const v = SPOT[at]
  return <LabStage labels={labels} target={v.target} span={v.span} view={v.view} fog={FOG} bloom={bloom}>{children}</LabStage>
}

/** 车头朝 +x、开在去程车道上的小轿车；x 是车身中点的世界坐标 */
export function RoadCar({ x, color = '#2f6fb5' }: { x: number; color?: string }) {
  return <Sedan position={[x, R(x), LANE]} rotation={[0, 0, Math.atan(Rp(x))]} color={color} />
}
