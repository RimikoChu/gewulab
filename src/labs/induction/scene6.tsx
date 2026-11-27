// 电磁感应和电网 · 第 6 课 变压器的器材：升压站里剖开的主变压器（见 tf.tsx）。
import { YARD } from './layout'
import { Transformer } from './tf'

/** whole：画成完整的（不剖开）；flux：铁芯里的磁通（−1 到 1，交变）；i1、i2：原、副线圈电流的相对大小（有正负） */
export function Rig6({ flux = 0, i1 = 0, i2 = 0, whole = false }: { flux?: number; i1?: number; i2?: number; whole?: boolean }) {
  return <group position={[YARD.tf[0], 0.3, YARD.tf[2]]}><Transformer cut={!whole} flux={flux} i1={i1} i2={i2} name="主变 10/110 kV" /></group>
}
