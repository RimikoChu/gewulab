// 各课装置静止时的样子：不在这一课时，大场景里照样摆着它们（远处看得见）。
import type { ReactNode } from 'react'
import type { StKey } from './layout'
import { Rig1 } from './scene1'
import { Rig2 } from './scene2'
import { Rig3 } from './scene3'
import { Rig4 } from './scene4'
import { Rig5 } from './scene5'
import { Rig6 } from './scene6'
import { Rig7 } from './scene7'
import { RigX } from './scenex'

export const IDLE: Partial<Record<StKey, () => ReactNode>> = {
  l1: () => <Rig1 />,
  l2: () => <Rig2 />,
  l3: () => <Rig3 />,
  l4: () => <Rig4 />,
  l5: () => <Rig5 />,
  l6: () => <Rig6 />,
  l7: () => <Rig7 />,
  x: () => <RigX />,
}
