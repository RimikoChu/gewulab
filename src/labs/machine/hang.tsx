// 一串挂在杠杆尺上的钩码：放在钩码盒里时看不见（盒里本来就立着一排）；要挂上去时，手套从盒里捏起一串，提起、平移、挂到孔上。
// 挂到孔上以后跟着杠杆一起上下。
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Hooks, chainLen } from './gear'
import { Carry } from './parts'
import { U, type V3 } from './world'

/** n 只钩码；at：挂在哪（钩子的挂点），null 表示收在盒子 box 里；follow：挂在杠杆上时每帧的位移；onMove：开始搬、搬到位时各报告一次 */
export function HangChain({ n, at, box, follow, onMove }: { n: number; at: V3 | null; box: V3; follow?: () => V3; onMove?: (moving: boolean) => void }) {
  const vis = useRef<THREE.Group>(null), moving = useRef(false)
  const target: V3 = at ?? [box[0], box[1] + chainLen(n) + 0.3 * U, box[2]]
  useFrame(() => { if (vis.current) vis.current.visible = !!at || moving.current })
  return <group ref={vis} visible={!!at}>
    <Carry at={target} follow={at ? follow : undefined} grip={[0, 0.9 * U, 0]} speed={2.6} lift={0.5} flag={m => { if (m !== moving.current) { moving.current = m; onMove?.(m) } }}>
      <Hooks n={n} />
    </Carry>
  </group>
}
