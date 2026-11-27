// 基因的表达 · 第 5 课的器材：刚出核孔的那条 mRNA 平摊在细胞质里，上方立着一块遗传密码表。亮框从 5′ 端往后，三个碱基一格地框过去，表上对应的格子跟着亮。
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MRNA } from './physics'
import { CodonFrame, NtSet, RISE, TableScreen, rnaLine } from './mol'
import { type V3 } from './kit'
import { AT } from './world'

export const O5: V3 = [AT.five[0] - (MRNA.length - 1) / 2 * RISE, AT.five[1] - 2.6, AT.five[2] + 1.2]
/** 第 k 个密码子中间那个碱基的位置 */
export const codonAt5 = (k: number): V3 => [O5[0] + (k * 3 + 1) * RISE, O5[1], O5[2]]
export const TABLE5: V3 = [AT.five[0], AT.five[1] + 4.9, AT.five[2] - 0.8]

/** frame：亮框所在的密码子序号（可以是小数，框在滑动）；show：框要不要出来 */
export function Scene5({ frame, show, hl, cur }: { frame: { current: number }; show: boolean; hl: string[]; cur?: string }) {
  const nts = rnaLine(O5, MRNA)
  const ref = useRef<THREE.Group>(null)
  useFrame(() => { if (ref.current) { const p = codonAt5(frame.current); ref.current.position.set(p[0], p[1] + 0.55, p[2]); ref.current.visible = show } })
  return <group>
    <NtSet get={() => ({ strands: [nts] })} cap={30} ls={0.5} />
    <group ref={ref}><CodonFrame at={[0, 0, 0]} h={1.75} /></group>
    <TableScreen hl={hl} cur={cur} w={13} position={TABLE5} />
  </group>
}
