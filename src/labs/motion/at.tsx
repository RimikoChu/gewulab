// 机械运动 · 各课共用的舞台：选一处机位，把这一课自己的东西放进去。同一处机位始终是同一个对象，换课时镜头才会飞过去。
import type { ReactNode } from 'react'
import { LabStage, type Label } from '@/lab-kit'
import { SPOT } from './world'

const FOG: [number, number] = [220, 900]
export default function At({ at, labels, children = null }: { at: keyof typeof SPOT; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  return <LabStage labels={labels} target={v.target} span={v.span} view={v.view} fog={FOG}>{children}</LabStage>
}
