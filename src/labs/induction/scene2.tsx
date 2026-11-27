// 电磁感应和电网 · 第 2 课 感应电流的条件的器材：实验室第二张台上的线圈、灵敏电流计和条形磁铁（器材见 coilrig.tsx）。
import { ST } from './layout'
import { CoilRig } from './coilrig'

export function Rig2(p: Parameters<typeof CoilRig>[0]) {
  return <group position={[ST.l2, 0, 0]}><CoilRig {...p} /></group>
}
