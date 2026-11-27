// 射电望远镜的抛物面天线：反射面（一圈圈铝面板）、背后的桁架背架、中心筒、俯仰轴和两侧的支臂、方位转台、混凝土基座、
// 四根馈源支架和焦点上的馈源。天线口朝天。cut 为真时朝镜头的一半拿掉（反射面、背架、中心筒、设备舱、馈源都剖开），露出抛物线形的截面。
// 局部坐标：原点在反射面的顶点，y 轴是天线的轴；地面在 y = −DISH_H。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Metal, bolts, disc, type RY } from '@/lab-kit'
import { fuse, revolve, strut, type V3 } from './geo'
import { makePanels, makeStone, rep } from './mats'
import { DISH, paraY } from './physics'

/** 反射面顶点离地多高（m） */
export const DISH_H = 6.5
const { p: P, R } = DISH, T = 0.07
const yd = (r: number) => paraY(P, r)

function reflector(cut: boolean) {
  const n = 28, prof: RY[] = []
  for (let i = 0; i <= n; i++) { const r = R * i / n; prof.push([r, yd(r) - T]) }
  for (let i = n; i >= 0; i--) { const r = R * i / n; prof.push([r, yd(r)]) }
  return cut ? revolve(prof, 0, Math.PI, 48, 0.5) : revolve(prof, 0, Math.PI * 2, 96, 0.5)
}

/** 背架：16 榀径向桁架，三圈环向杆。cut 时只留背对镜头的一半 */
function backup(cut: boolean) {
  const N = 16, rs = [0.9, 2.2, 3.6, 5.0, 5.9], top = rs.map(r => yd(r) - T - 0.04), bot = [-1.5, -1.15, -0.5, 0.55, top[4]]
  const out: THREE.BufferGeometry[] = [], at = (k: number, r: number, y: number): V3 => { const a = (k + 0.5) / N * Math.PI * 2; return [r * Math.cos(a), y, r * Math.sin(a)] }
  const keep = (k: number) => !cut || Math.sin((k + 0.5) / N * Math.PI * 2) < 0
  for (let k = 0; k < N; k++) {
    if (!keep(k)) continue
    for (let i = 0; i < 4; i++) {
      out.push(strut(at(k, rs[i], top[i]), at(k, rs[i + 1], top[i + 1]), 0.035, 6), strut(at(k, rs[i], bot[i]), at(k, rs[i + 1], bot[i + 1]), 0.045, 6))
      if (i < 4) out.push(strut(at(k, rs[i], top[i]), at(k, rs[i], bot[i]), 0.03, 6))
      if (i < 3) out.push(i % 2 ? strut(at(k, rs[i], top[i]), at(k, rs[i + 1], bot[i + 1]), 0.026, 6) : strut(at(k, rs[i], bot[i]), at(k, rs[i + 1], top[i + 1]), 0.026, 6))
    }
    if (keep(k + 1) && (!cut || k < N - 1)) for (let i = 1; i < 4; i++) out.push(strut(at(k, rs[i], top[i]), at(k + 1, rs[i], top[i]), 0.028, 6), strut(at(k, rs[i], bot[i]), at(k + 1, rs[i], bot[i]), 0.035, 6))
  }
  return fuse(out)
}

/** 四根馈源支架：从反射面外圈伸到焦点上方的馈源舱 */
function quadripod(cut: boolean) {
  const out: THREE.BufferGeometry[] = []
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a)
    if (cut && s > 0) continue
    out.push(strut([5.3 * c, yd(5.3), 5.3 * s], [0.34 * c, P / 2 + 0.55, 0.34 * s], 0.065, 8))
  }
  return fuse(out)
}

export function Dish({ cut }: { cut: boolean }) {
  const g = useMemo(() => ({
    full: reflector(false), half: reflector(true), backFull: backup(false), backHalf: backup(true), podFull: quadripod(false), podHalf: quadripod(true),
    table: disc(3.1, 0.28, { chamfer: 0.04, segs: 64 }), tableBolts: bolts(24, 2.85, 0.14), base: disc(2.5, 1.15, { chamfer: 0.06, segs: 64 }),
    legs: fuse([-1, 1].flatMap(sx => [
      strut([sx * 2.4, -2.0, 0], [sx * 2.7, -5.1, 1.7], 0.13, 10), strut([sx * 2.4, -2.0, 0], [sx * 2.7, -5.1, -1.7], 0.13, 10),
      strut([sx * 2.62, -4.1, 1.15], [sx * 2.62, -4.1, -1.15], 0.07, 8), strut([sx * 2.5, -3.0, 0.55], [sx * 2.5, -3.0, -0.55], 0.06, 8),
      strut([sx * 2.7, -5.1, 1.7], [sx * 2.7, -5.1, -1.7], 0.09, 8),
    ])),
    rail: fuse([new THREE.TorusGeometry(3.0, 0.03, 6, 64).rotateX(Math.PI / 2).translate(0, -4.05, 0), new THREE.TorusGeometry(3.0, 0.022, 6, 64).rotateX(Math.PI / 2).translate(0, -4.55, 0),
      ...Array.from({ length: 20 }, (_, i) => { const a = i / 20 * Math.PI * 2; return strut([3 * Math.cos(a), -5.1, 3 * Math.sin(a)], [3 * Math.cos(a), -4.05, 3 * Math.sin(a)], 0.025, 6) })]),
  }), [])
  const panels = useMemo(() => rep(makePanels(), 1, 2), []), stone = useMemo(() => rep(makeStone([170, 168, 160], 9), 6, 1), [])
  const white = <meshStandardMaterial color="#cfd2d0" roughness={0.55} metalness={0.15} />
  const whiteD = <meshStandardMaterial color="#cfd2d0" roughness={0.55} metalness={0.15} side={THREE.DoubleSide} />
  // 剖开时馈源也只留背对镜头的一半
  const half: [number, number] = cut ? [Math.PI / 2, Math.PI] : [0, Math.PI * 2]
  return (
    <group>
      {/* 反射面 */}
      <mesh geometry={cut ? g.half : g.full} castShadow receiveShadow><meshStandardMaterial map={panels} color="#d4d7d5" roughness={0.5} metalness={0.2} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={cut ? g.backHalf : g.backFull} castShadow>{white}</mesh>
      {/* 中心筒：桁架都接在它上面 */}
      <mesh position-y={-0.8} castShadow><cylinderGeometry args={[0.9, 0.9, 1.4, 32, 1, true, cut ? Math.PI / 2 : 0, cut ? Math.PI : Math.PI * 2]} /><meshStandardMaterial color="#dfe2e0" roughness={0.5} metalness={0.2} side={THREE.DoubleSide} /></mesh>
      {/* 馈源支架和馈源：喇叭口正对着反射面，口在焦点上 */}
      <mesh geometry={cut ? g.podHalf : g.podFull} castShadow>{white}</mesh>
      <group position-y={P / 2}>
        <mesh position-y={0.42} castShadow><cylinderGeometry args={[0.42, 0.42, 0.7, 32, 1, cut, ...half]} />{whiteD}</mesh>
        <mesh position-y={0.8} castShadow><cylinderGeometry args={[0.3, 0.42, 0.08, 32, 1, cut, ...half]} />{whiteD}</mesh>
        <mesh position-y={-0.08} castShadow><cylinderGeometry args={[0.16, 0.32, 0.34, 32, 1, true, ...half]} /><meshStandardMaterial color="#c9a64e" roughness={0.35} metalness={0.9} side={THREE.DoubleSide} /></mesh>
        <mesh position-y={0.09}><cylinderGeometry args={[0.2, 0.2, 0.04, 32, 1, cut, ...half]} /><meshStandardMaterial color="#b9bdc0" roughness={0.4} metalness={0.9} side={THREE.DoubleSide} /></mesh>
      </group>
      {/* 俯仰机构：设备舱、俯仰轴、半圈大齿圈 */}
      <mesh position={[0, -2.2, cut ? -0.475 : 0]} castShadow><boxGeometry args={[1.9, 1.4, cut ? 0.95 : 1.9]} />{white}</mesh>
      <mesh position={[0, -2.0, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.2, 0.2, 5.3, 24]} /><Metal kind="steel" grain="turned" /></mesh>
      {[-2.4, 2.4].map(x => <mesh key={x} position={[x, -2.0, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.42, 0.42, 0.5, 24]} /><Metal kind="iron" grain="cast" /></mesh>)}
      <mesh position={[0, -2.0, 0]} rotation={cut ? [0, Math.PI / 2, -Math.PI / 2] : [0, Math.PI / 2, 0]} castShadow><torusGeometry args={[1.75, 0.09, 8, 48, Math.PI]} /><Metal kind="steel" grain="cast" /></mesh>
      {!cut && <mesh position={[0, -2.0, 0]} rotation={[Math.PI, Math.PI / 2, 0]} castShadow><torusGeometry args={[1.75, 0.09, 8, 48, Math.PI]} /><Metal kind="steel" grain="cast" /></mesh>}
      {/* 两侧的支臂、方位转台、栏杆、基座 */}
      <mesh geometry={g.legs} castShadow>{white}</mesh>
      <mesh geometry={g.table} position-y={-5.38} castShadow receiveShadow><Metal kind="steel" grain="turned" rough={0.5} /></mesh>
      <mesh geometry={g.tableBolts} position-y={-5.1}><Metal kind="iron" /></mesh>
      <mesh geometry={g.rail}><Metal kind="stainless" grain="brushed" /></mesh>
      <mesh position={[0, -4.7, 0]} castShadow><boxGeometry args={[1.5, 0.8, 1.3]} /><meshStandardMaterial color="#4c5a62" roughness={0.6} metalness={0.3} /></mesh>
      <mesh geometry={g.base} position-y={-DISH_H} castShadow receiveShadow><meshStandardMaterial map={stone} roughness={0.9} /></mesh>
      <mesh position={[0, -DISH_H + 0.52, 2.5]}><boxGeometry args={[0.9, 1.0, 0.06]} /><meshStandardMaterial color="#39444b" roughness={0.5} metalness={0.5} /></mesh>
    </group>
  )
}
