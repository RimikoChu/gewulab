// 各课器材静止时的样子：不在这一课时，大场景里照样摆着它们（远处看得见）。
import type { ReactNode } from 'react'
import type { StKey } from './layout'
import { Rig1 } from './scene1'
import { Rig2 } from './scene2'
import { Rig3 } from './scene3'
import { Rig4 } from './scene4'
import { Rig5 } from './scene5'
import { Rig6 } from './scene6'
import { RigX } from './scenex'

/** cur：现在在上哪一课（随堂检测的全景里主变压器画成完整的，不剖开） */
export const IDLE: Partial<Record<StKey, (cur: string) => ReactNode>> = {
  l1: () => <Rig1 deg={30} />,
  l2: () => <Rig2 />,
  l3: () => <Rig3 pole="S" />,
  l4: () => <Rig4 />,
  l5: () => <Rig5 screen={false} />,
  l6: cur => <Rig6 whole={cur === 'q'} />,
  x: () => <RigX />,
}
