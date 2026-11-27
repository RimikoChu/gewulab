// 化验台第一格（第 1、2 课共用）：小型高压反应釜、控制器、两只小钢瓶和不锈钢细管，旁边一台显示器画曲线。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Metal } from '@/lab-kit'
import { AC, Autoclave, Controller, Cylinder } from './gear'
import { pipeGeo, type V3 } from './parts'
import { Screen, type ChartSpec } from './screen'
import { BZ, ST, TOP } from './world'

export const X1 = ST.l1
/** 各件在台面上的位置 */
export const RIG = { clave: [X1, TOP, BZ + 0.06] as V3, ctrl: [X1 - 0.33, TOP, BZ + 0.0] as V3, mon: [X1 + 0.44, TOP, BZ - 0.02] as V3 }
const MON = { w: 0.6, h: 0.36, y: 0.36 }

/** 台式显示器：底座、支杆、黑边框，屏上画一张图 */
export function Monitor({ spec, at }: { spec: ChartSpec; at: V3 }) {
  return <group position={at}>
    <RoundedBox args={[0.22, 0.012, 0.16]} radius={0.005} position-y={0.006} castShadow receiveShadow><meshStandardMaterial color="#2a2d31" roughness={0.45} metalness={0.4} /></RoundedBox>
    <mesh position={[0, MON.y / 2 - 0.02, -0.03]} castShadow><boxGeometry args={[0.04, MON.y - 0.04, 0.02]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    <RoundedBox args={[MON.w + 0.024, MON.h + 0.024, 0.022]} radius={0.006} position={[0, MON.y, -0.012]} castShadow><meshStandardMaterial color="#17191c" roughness={0.4} metalness={0.3} /></RoundedBox>
    <Screen w={MON.w} h={MON.h} spec={spec} position={[0, MON.y, 0.0005]} />
  </group>
}

/** 第一格的全部器材。p 是釜里压力，temp 控制器上的温度，heat 炉子热到什么程度 */
export function Rig({ p, temp, heat, spec }: { p: number; temp: number; heat: number; spec?: ChartSpec }) {
  const [cx, cy, cz] = RIG.clave
  const tubes = useMemo(() => [
    pipeGeo([[X1 - 0.58, TOP + 0.5, BZ - 0.08], [X1 - 0.58, TOP + 0.56, BZ - 0.08], [X1 - 0.2, TOP + 0.56, BZ - 0.08], [cx - 0.055, cy + AC.y1 + 0.12, cz + 0.02], [cx - 0.055, cy + AC.y1 + 0.07, cz + 0.02]], 0.003, 0.03, 8),
    pipeGeo([[X1 - 0.48, TOP + 0.5, BZ - 0.12], [X1 - 0.48, TOP + 0.6, BZ - 0.12], [X1 - 0.2, TOP + 0.6, BZ - 0.1], [cx - 0.055, cy + AC.y1 + 0.13, cz + 0.02]], 0.003, 0.03, 8),
    pipeGeo([[RIG.ctrl[0] + 0.12, TOP + 0.05, BZ + 0.0], [cx - 0.12, TOP + 0.05, cz], [cx - AC.furnaceR, TOP + 0.05, cz]], 0.004, 0.03, 8),
  ], [cx, cy, cz])
  return <>
    <group position={RIG.clave}><Autoclave p={p} heat={heat} /></group>
    <group position={RIG.ctrl}><Controller temp={temp.toFixed(0)} p={p.toFixed(1)} rpm="300" /></group>
    <group position={[X1 - 0.58, TOP, BZ - 0.08]} scale={0.34}><Cylinder color="#1a1b1d" name="氮气" /></group>
    <group position={[X1 - 0.48, TOP, BZ - 0.12]} scale={0.34}><Cylinder color="#7fb48a" name="氢气" /></group>
    {tubes.slice(0, 2).map((g, i) => <mesh key={i} geometry={g} castShadow><Metal kind="stainless" /></mesh>)}
    <mesh geometry={tubes[2]} castShadow><meshStandardMaterial color="#1f2124" roughness={0.7} /></mesh>
    {spec && <Monitor spec={spec} at={RIG.mon} />}
  </>
}
