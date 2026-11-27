// 光反应和暗反应 · 第 1 课的器材：实验台上的一盆菠菜（从它的一片叶子放大进去）。叶肉细胞和叶绿体在 world.tsx。
import { Bottle, Pot } from './gear'
import { BZ, M, ST, TOP } from './world'

export default function Scene1() {
  return <group position={[ST.l1, TOP, BZ]}>
    <group position={[0, 0, 0.3]} rotation-y={0.5}><Pot /></group>
    <group position={[-0.24 * M, 0, -0.16 * M]}><Bottle band="#3a9a5a" h={0.13} /></group>
  </group>
}
