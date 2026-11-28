// 静电场 · 第 4 课 电势和等势面的器材：两块方形大铝板立在有机玻璃支柱上，相距 0.30 m，左板接电源正极、右板接地，中间是匀强电场。
// 电场线是从左到右的平行线；每隔 100 V 画一张半透明的等势面，和电场线垂直。前面一条导轨上有一只探针，针尖伸到两板中间量电势。
// 试探电荷是一颗带正电的小球，沿选定的路径移动。
import { useMemo } from 'react'
import { Edges, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { COL, ST, TOP } from './layout'
import { UNI, potential, type V2, type V3 } from './physics'
import { FieldLines, Glow, Sign } from './fx'
import { Acrylic, Bakelite, Cable, Supply } from './gear'

/** 极板中心的高度（从台面算起）、极板边长、导轨的 z */
export const R4 = { y: 0.27, plate: 0.36, rail: 0.27 }
/** 电场里的一点（x 是到正极板的距离，y 是高度偏移）→ 相对台面中心的位置 */
export const inField = (p: V2, z = 0): V3 => [-UNI.d / 2 + p[0], R4.y + p[1], z]
const PLANES = [0.05, 0.10, 0.15, 0.20, 0.25]

/** probe：探针针尖到正极板的距离；charge：试探电荷的位置；trail：它已经走过的路（起点）；fade：等势面和电场线的明暗 */
export function Rig4({ probe = 0.15, charge = UNI.A, trail = null, level = 1 }: { probe?: number; charge?: V2; trail?: V2 | null; level?: number }) {
  const lines = useMemo(() => [-0.11, 0, 0.11].flatMap(y => [-0.11, 0, 0.11].map(z => [[-UNI.d / 2 + 0.004, R4.y + y, z], [UNI.d / 2 - 0.004, R4.y + y, z]] as V3[])), [])
  const tint = useMemo(() => PLANES.map((_, i) => new THREE.Color(COL.pos).lerp(new THREE.Color(COL.neg), i / (PLANES.length - 1))), [])
  const px = -UNI.d / 2 + probe, c = inField(charge)
  return <group position={[ST.l4, TOP, 0]}>
    {/* 两块极板：拉丝铝板，各由两根有机玻璃柱撑在胶木底座上 */}
    {[-1, 1].map(s => <group key={s} position={[s * (UNI.d / 2 + 0.003), 0, 0]}>
      <RoundedBox args={[0.05, 0.02, 0.34]} radius={0.004} position={[0, 0.01, 0]} castShadow receiveShadow><Bakelite /></RoundedBox>
      {[-0.11, 0.11].map(z => <mesh key={z} position={[0, 0.02 + (R4.y - R4.plate / 2 - 0.02) / 2, z]} castShadow><cylinderGeometry args={[0.008, 0.008, R4.y - R4.plate / 2 - 0.02, 20]} /><Acrylic /></mesh>)}
      <RoundedBox args={[0.005, R4.plate, R4.plate]} radius={0.002} position={[0, R4.y, 0]} castShadow><meshStandardMaterial color="#c2c7cb" metalness={0.6} roughness={0.42} /></RoundedBox>
      <mesh position={[s * 0.008, R4.y + R4.plate / 2 - 0.03, -R4.plate / 2 + 0.03]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.006, 0.007, 0.012, 16]} /><Bakelite color={s < 0 ? '#c4302a' : '#1c1d1f'} /></mesh>
      <Sign at={[s * -0.004, R4.y + R4.plate / 2 + 0.03, 0]} kind={s < 0 ? '+' : '−'} size={0.03} />
    </group>)}
    {/* 电场线和等势面 */}
    <FieldLines lines={lines} level={0.75 * level} heads={2} head={0.013} r={0.0011} />
    {PLANES.map((x, i) => <mesh key={x} position={[-UNI.d / 2 + x, R4.y, 0]} rotation-y={Math.PI / 2} renderOrder={3}>
      <planeGeometry args={[R4.plate - 0.04, R4.plate - 0.04]} /><meshBasicMaterial color={tint[i]} transparent opacity={0.085 * level} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      <Edges color={tint[i]} />
    </mesh>)}
    {/* A、B、C 三点 */}
    {[UNI.A, UNI.B, UNI.C].map((p, i) => <mesh key={i} position={inField(p)} renderOrder={8}><sphereGeometry args={[0.0045, 16, 12]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>)}
    {/* 试探电荷和它走过的路 */}
    {trail && <Glow pts={[inField(trail), c]} color={COL.pos} r={0.0014} level={0.9} halo={3} />}
    <mesh position={c} castShadow><sphereGeometry args={[0.011, 24, 18]} /><meshStandardMaterial color="#ff7a5c" emissive={COL.pos} emissiveIntensity={0.9} roughness={0.3} /></mesh>
    <Sign at={c} kind="+" size={0.016} />
    {/* 探针：前面导轨上的滑座、立杆，针尖伸到两板中间 */}
    <RoundedBox args={[0.46, 0.012, 0.04]} radius={0.003} position={[0, 0.006, R4.rail]} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" rough={0.45} env={0.6} /></RoundedBox>
    <group position={[px, 0, R4.rail]}>
      <RoundedBox args={[0.05, 0.022, 0.056]} radius={0.004} position={[0, 0.017, 0]} castShadow><Bakelite /></RoundedBox>
      <mesh position={[0, 0.028 + (R4.y - 0.028) / 2, 0]} castShadow><cylinderGeometry args={[0.004, 0.004, R4.y - 0.028, 16]} /><Acrylic /></mesh>
      <mesh position={[0, R4.y, -R4.rail / 2 + 0.004]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.0014, 0.0014, R4.rail - 0.008, 10]} /><Metal kind="chrome" /></mesh>
      <mesh position={[0, R4.y, 0]} castShadow><boxGeometry args={[0.014, 0.014, 0.014]} /><Bakelite color="#7a1f1a" /></mesh>
      <mesh position={[0, R4.y, -R4.rail + 0.003]}><sphereGeometry args={[0.003, 12, 10]} /><Metal kind="brass" /></mesh>
    </group>
    {/* 电源：接左板正极，右板接地 */}
    <group position={[-0.5, 0, -0.2]} rotation-y={0.4}><Supply text={`${UNI.U} V`} name="直流高压电源" /></group>
    <group position={[-0.47, 0, 0.12]} rotation-y={0.55}><Supply text={`${potential(probe).toFixed(0)} V`} name="探针电势" w={0.2} h={0.1} d={0.16} /></group>
    <Cable pts={[[-UNI.d / 2 - 0.012, R4.y + R4.plate / 2 - 0.03, -R4.plate / 2 + 0.03], [-0.24, R4.y + 0.1, -0.2], [-0.34, 0.08, -0.12], [-0.42, 0.045, -0.085]]} />
    <Cable color="#1c1d1f" pts={[[UNI.d / 2 + 0.012, R4.y + R4.plate / 2 - 0.03, -R4.plate / 2 + 0.03], [0.2, R4.y + 0.05, -0.26], [0, 0.012, -0.3], [-0.3, 0.03, -0.16], [-0.39, 0.045, -0.1]]} />
  </group>
}
