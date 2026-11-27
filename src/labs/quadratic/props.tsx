// 几课共用的小器材：立在草坪、岸边的玻璃图表板（铝框、两根立柱、混凝土底座）。
import type { ReactNode } from 'react'
import { Metal } from '@/lab-kit'
import { AxesPlane, bounds, type Axes } from './graph'

/** 图表板：坐标平面装在铝框里，下面两根不锈钢立柱落到地面。lift：坐标原点离地面多高 */
/** screen：后面加一块深色背板（像电子屏），板后的东西不透过来 */
export function Board({ A, lift, screen = false, children }: { A: Axes; lift: number; screen?: boolean; children?: ReactNode }) {
  const B = bounds(A), top = B.y1, w = B.x1 - B.x0, h = B.y1 - B.y0
  return (
    <group>
      {screen && <mesh position={[(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, -0.05]} castShadow><boxGeometry args={[w, h, 0.06]} /><meshStandardMaterial color="#0e1a20" roughness={0.6} metalness={0.2} /></mesh>}
      <AxesPlane A={A}>{children}</AxesPlane>
      {[B.x0 + w * 0.12, B.x1 - w * 0.12].map(x => <group key={x} position={[x, 0, -0.08]}>
        <mesh position-y={(top - lift) / 2 - 0.1} castShadow><cylinderGeometry args={[0.045, 0.05, top + lift - 0.2, 16]} /><Metal kind="stainless" grain="brushed" /></mesh>
        <mesh position-y={-lift + 0.06} castShadow receiveShadow><boxGeometry args={[0.36, 0.12, 0.36]} /><meshStandardMaterial color="#a8a69f" roughness={0.9} /></mesh>
      </group>)}
    </group>
  )
}
