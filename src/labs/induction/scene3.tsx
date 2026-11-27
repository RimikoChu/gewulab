// 电磁感应和电网 · 第 3 课 楞次定律的器材：实验室第三张台上另一套线圈、灵敏电流计和条形磁铁（器材见 coilrig.tsx），
// 这一课多画感应电流的磁场（橙色）。
import { ST } from './layout'
import { CoilRig } from './coilrig'

export function Rig3(p: Parameters<typeof CoilRig>[0]) {
  return <group position={[ST.l3, 0, 0]}><CoilRig {...p} /></group>
}
