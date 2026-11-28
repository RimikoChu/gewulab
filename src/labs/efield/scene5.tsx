// 静电场 · 第 5 课 电容器的器材：导轨上一对圆形铝板组成的平行板电容器，右板固定、接静电计，左板接地，可以拉远、可以横着错开；
// 后面一条横轨上有一块有机玻璃介质板，可以推进两板之间。右边是静电计：圆金属壳、玻璃面，里面一根指针，张角表示两板间的电压。
// 前面两只闸刀开关：一只接高压电源（充电），一只接地（放电）。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, shell } from '@/lab-kit'
import { ST, TOP } from './layout'
import { makeDial } from './mats'
import { CAP, type V3 } from './physics'
import { Sign, Spark } from './fx'
import { Acrylic, Bakelite, Cable, GlassMat, Knife, Supply } from './gear'

/** 极板中心的高度、极板半径（面积 0.030 m²）、静电计的位置 */
export const R5 = { y: 0.2, r: Math.sqrt(CAP.S / Math.PI), meter: [0.33, 0.2, -0.02] as V3 }

/** 一块极板连它的滑座：side −1 是左板（轴套朝左） */
function Plate({ side }: { side: 1 | -1 }) {
  const geo = useMemo(() => ({ plate: disc(R5.r, 0.004, { chamfer: 0.001, segs: 72 }), hub: disc(0.012, 0.034, { segs: 24 }) }), [])
  return <group>
    <mesh geometry={geo.plate} position={[side > 0 ? 0 : -0.004, R5.y, 0]} rotation-z={-Math.PI / 2} castShadow><meshStandardMaterial color="#c2c7cb" metalness={0.6} roughness={0.42} /></mesh>
    <mesh geometry={geo.hub} position={[side * 0.004, R5.y, 0]} rotation-z={-side * Math.PI / 2} castShadow><Bakelite /></mesh>
    <mesh position={[side * 0.03, R5.y / 2 + 0.01, 0]} castShadow><cylinderGeometry args={[0.007, 0.007, R5.y - 0.02, 20]} /><Acrylic /></mesh>
    <RoundedBox args={[0.05, 0.02, 0.085]} radius={0.004} position={[side * 0.03, 0.03, 0]} castShadow><Bakelite /></RoundedBox>
  </group>
}

/** d：板距；shift：左板横着错开的距离；slab：介质板推进去的程度（0–1）；U：两板间的电压；angle：静电计指针的张角（°）；k1、k2：充电、放电开关合上的程度；fire：放电火花 */
export function Rig5({ d = CAP.d, shift = 0, slab = 0, U = 0, angle = 0, k1 = 0, k2 = 0, fire = 0 }: { d?: number; shift?: number; slab?: number; U?: number; angle?: number; k1?: number; k2?: number; fire?: number }) {
  const geo = useMemo(() => ({
    caseRing: shell([[0.08, 0], [0.08, 0.05]], 0.004, { segs: 72 }), back: disc(0.077, 0.003, { segs: 64 }), bung: lathe([[0.004, 0], [0.012, 0], [0.014, 0.02], [0.004, 0.02]], { closed: true }),
    base: lathe([[0, 0], [0.06, 0], [0.06, 0.008], [0.05, 0.016], [0.014, 0.02], [0.014, 0.1], [0, 0.1]]),
  }), [])
  const dial = makeDial('#eef0ea'), [mx, my, mz] = R5.meter, live = U > 5
  return <group position={[ST.l5, TOP, 0]}>
    {/* 导轨：一根铝型材，后面接一条横轨（介质板走的） */}
    <RoundedBox args={[0.44, 0.02, 0.06]} radius={0.004} position={[-0.06, 0.01, 0]} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" rough={0.45} env={0.6} /></RoundedBox>
    <RoundedBox args={[0.05, 0.02, 0.32]} radius={0.004} position={[-CAP.d / 2, 0.01, -0.19]} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" rough={0.45} env={0.6} /></RoundedBox>
    <group position={[0, 0, 0]}><Plate side={1} /></group>
    <group position={[-d, 0, shift]}><Plate side={-1} /></group>
    <Sign at={[0.03, R5.y + R5.r + 0.025, 0]} kind="+" size={0.026} opacity={live ? 1 : 0} />
    <Sign at={[-d - 0.03, R5.y + R5.r + 0.025, shift]} kind="−" size={0.026} opacity={live ? 1 : 0} />
    {/* 介质板：有机玻璃，立在横轨的滑座上 */}
    <group position={[-CAP.d / 2, 0, -0.3 * (1 - slab)]}>
      <RoundedBox args={[0.012, 0.215, 0.215]} radius={0.003} position={[0, R5.y + 0.004, 0]} castShadow><Acrylic color="#bfe0ee" opacity={0.5} /></RoundedBox>
      <RoundedBox args={[0.022, 0.074, 0.05]} radius={0.004} position={[0, 0.057, 0]} castShadow><Bakelite /></RoundedBox>
    </group>
    {/* 静电计 */}
    <group position={[mx, 0, mz]}>
      <mesh geometry={geo.base} castShadow receiveShadow><Bakelite /></mesh>
      <group position={[0, my, 0]}>
        <mesh geometry={geo.caseRing} position={[0, 0, -0.025]} rotation-x={Math.PI / 2} castShadow><Metal kind="aluminum" grain="turned" rough={0.4} /></mesh>
        <mesh geometry={geo.back} position={[0, 0, -0.024]} rotation-x={Math.PI / 2}><meshStandardMaterial color="#d9dcd6" roughness={0.7} /></mesh>
        <mesh position={[0, 0, -0.0205]}><circleGeometry args={[0.074, 64]} /><meshStandardMaterial map={dial} roughness={0.7} /></mesh>
        <mesh position={[0, 0, 0.024]} renderOrder={9}><circleGeometry args={[0.077, 64]} /><GlassMat opacity={0.12} /></mesh>
        {/* 中间的黄铜杆从顶上的绝缘塞穿进来，指针挂在杆上 */}
        <mesh geometry={geo.bung} position={[0, 0.07, 0]}><meshStandardMaterial color="#e6dfc8" roughness={0.6} /></mesh>
        <mesh position={[0, 0.045, 0]} castShadow><cylinderGeometry args={[0.003, 0.003, 0.2, 12]} /><Metal kind="brass" grain="turned" /></mesh>
        <mesh position={[0, 0.15, 0]} castShadow><sphereGeometry args={[0.013, 24, 18]} /><Metal kind="brass" /></mesh>
        <group position={[0, 0.012, 0.004]} rotation-z={angle * Math.PI / 180}>
          <mesh position={[0, -0.022, 0]}><boxGeometry args={[0.0028, 0.094, 0.0012]} /><Metal kind="aluminum" rough={0.3} /></mesh>
          <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.004, 0.004, 0.006, 12]} /><Metal kind="brass" /></mesh>
        </group>
      </group>
    </group>
    {/* 电源、两只闸刀开关和导线 */}
    <group position={[-0.52, 0, -0.14]} rotation-y={0.4}><Supply text={`${CAP.U0} V`} name="直流高压电源" /></group>
    <group position={[0.06, 0, 0.24]}><Knife closed={k1} /></group>
    <group position={[0.33, 0, 0.22]}><Knife closed={k2} /></group>
    <Spark at={[0.365, 0.03, 0.22]} fire={fire} size={0.022} />
    <Cable pts={[[-0.43, 0.045, -0.05], [-0.3, 0.02, 0.12], [-0.1, 0.012, 0.25], [0.025, 0.02, 0.24]]} />
    <Cable pts={[[0.095, 0.02, 0.24], [0.14, 0.03, 0.16], [0.09, 0.1, 0.05], [0.036, R5.y, 0.006]]} />
    <Cable pts={[[0.032, R5.y + 0.006, 0], [0.12, R5.y + 0.16, -0.01], [0.25, my + 0.19, mz], [mx, my + 0.158, mz]]} color="#b98a2c" r={0.0016} />
    <Cable color="#1c1d1f" pts={[[0.295, 0.02, 0.22], [0.25, 0.012, 0.14], [0.3, 0.012, 0.06], [mx - 0.03, 0.03, mz + 0.05]]} />
    <Cable color="#1c1d1f" pts={[[0.365, 0.02, 0.22], [0.45, 0.012, 0.16], [0.5, 0.012, -0.1], [0.5, 0.03, -0.33]]} />
  </group>
}
