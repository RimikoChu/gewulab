// 升压站：碎石铺的场地、钢丝网围栏；主变压器的混凝土基础和油坑；从厂房东墙引过来的封闭母线接到主变的低压侧；
// 主变的高压侧经一组断路器、隔离开关（瓷柱上的设备）接到出线构架。主变压器本身由第 6 课画（见 idle.tsx）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Painted, mergeParts, type Part } from '@/lab-kit'
import { HALL, LINE, YARD } from './layout'
import { makeGravel, rep } from './mats'
import type { V3 } from './physics'
import { Bushing, Pad, TK } from './tf'
import { gantryPhases } from './grid'
import { span } from './tower'

const Y = YARD
/** 断路器和隔离开关所在的 x */
const BAY = [62, 66]

function fenceParts() {
  const P: Part[] = []
  const posts: [number, number][] = []
  for (let x = Y.x0; x <= Y.x1; x += 3) posts.push([x, Y.z0], [x, Y.z1])
  for (let z = Y.z0; z <= Y.z1; z += 3) posts.push([Y.x0, z], [Y.x1, z])
  for (const [x, z] of posts) P.push({ p: [x, 1.1, z], s: [0.05, 2.2, 0], c: '#8a9196', cyl: true })
  for (const y of [0.15, 2.15]) { P.push({ p: [(Y.x0 + Y.x1) / 2, y, Y.z0], s: [Y.x1 - Y.x0, 0.05, 0.05], c: '#8a9196' }, { p: [(Y.x0 + Y.x1) / 2, y, Y.z1], s: [Y.x1 - Y.x0, 0.05, 0.05], c: '#8a9196' }, { p: [Y.x0, y, (Y.z0 + Y.z1) / 2], s: [0.05, 0.05, Y.z1 - Y.z0], c: '#8a9196' }, { p: [Y.x1, y, (Y.z0 + Y.z1) / 2], s: [0.05, 0.05, Y.z1 - Y.z0], c: '#8a9196' }) }
  // 封闭母线：从厂房东墙出来，架在钢支架上，接到主变低压侧
  const [tx, , tz] = Y.tf
  P.push({ p: [(HALL.x1 + tx - 1.4) / 2, 4.2, tz - 0.4], s: [tx - 1.4 - HALL.x1, 0.5, 0.5], c: '#9aa3a8' })
  for (let x = HALL.x1 + 2; x < tx - 2; x += 4) P.push({ p: [x, 2.0, tz - 0.4], s: [0.15, 4.0, 0.15], c: '#7d868b' })
  P.push({ p: [tx - 1.2, 3.6, tz - 0.4], s: [0.5, 1.4, 0.5], c: '#9aa3a8' })
  // 断路器、隔离开关的支架（钢管柱）
  for (const x of BAY) for (const dz of [-4, 0, 4]) P.push({ p: [x, 1.25, LINE.z + dz], s: [0.14, 2.5, 0], c: '#8d969b', cyl: true }, { p: [x, 2.55, LINE.z + dz], s: [0.7, 0.1, 0.7], c: '#7d868b' })
  return P
}

export function Yard() {
  const tex = useMemo(() => rep(makeGravel(), (Y.x1 - Y.x0) / 2, (Y.z1 - Y.z0) / 2), [])
  const geo = useMemo(() => {
    const [tx, ty, tz] = Y.tf, g = gantryPhases(Y.gantry)
    // 高压套管顶端 → 断路器 → 隔离开关 → 出线构架
    const wires = [0, 1, 2].map(k => {
      const top: V3 = [tx + TK.limbs[k], ty + TK.H + 2.1, tz + 0.35], dz = [-4, 4, 0][k]
      const a: V3 = [BAY[0], 4.6, LINE.z + dz], b: V3 = [BAY[1], 4.6, LINE.z + dz]
      return [...span(top, a, 0.6, 10), ...span(a, b, 0.15, 4).slice(1), ...span(b, g[k], 0.8, 10).slice(1)]
    })
    return { fence: mergeParts(fenceParts()), wires: wires.map(w => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(w.map(p => new THREE.Vector3(...p))), 60, 0.05, 6)) }
  }, [])
  return <group>
    <mesh rotation-x={-Math.PI / 2} position={[(Y.x0 + Y.x1) / 2, 0.03, (Y.z0 + Y.z1) / 2]} receiveShadow><planeGeometry args={[Y.x1 - Y.x0, Y.z1 - Y.z0]} /><meshStandardMaterial map={tex} color="#b9b3a6" roughness={0.95} /></mesh>
    <group position={Y.tf}><Pad /></group>
    <mesh geometry={geo.fence} castShadow><Painted rough={0.5} metal={0.4} /></mesh>
    {/* 围栏的钢丝网：一张半透明的网面 */}
    {[[(Y.x0 + Y.x1) / 2, Y.z0, Y.x1 - Y.x0, 0], [(Y.x0 + Y.x1) / 2, Y.z1, Y.x1 - Y.x0, 0], [Y.x0, (Y.z0 + Y.z1) / 2, Y.z1 - Y.z0, 1], [Y.x1, (Y.z0 + Y.z1) / 2, Y.z1 - Y.z0, 1]].map(([x, z, w, r], i) => <mesh key={i} position={[x, 1.15, z]} rotation-y={r ? Math.PI / 2 : 0}><planeGeometry args={[w, 2.0]} /><meshStandardMaterial color="#9aa1a6" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}
    {/* 断路器（瓷柱高）和隔离开关（瓷柱矮）：每相一组 */}
    {BAY.flatMap((x, j) => [-4, 0, 4].map(dz => <group key={`${x}${dz}`} position={[x, 2.6, LINE.z + dz]}><Bushing h={j ? 1.4 : 1.9} r={j ? 0.08 : 0.13} sheds={j ? 7 : 10} color="#9c6b48" /></group>))}
    {geo.wires.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial color="#a6acae" metalness={0.8} roughness={0.35} /></mesh>)}
  </group>
}
