// 电流表和电压表：课堂上那种黑色胶木外壳、斜着的表盘、两排刻度、前面一条台阶上三个接线柱。
// 指针按偏转量 k（满偏为 1）转，带一点阻尼：会摆过头再停稳；接反时打到左边的限位，超量程时打到右边的限位。
// 按厘米写，原点在底面正中，正面朝 +z。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc } from '@/lab-kit'
import { DIAL, makeDial, makeMarks } from './mats'
import { BLACK, Post, RED, POST_Y } from './gear'
import type { MeterKind } from './physics'
import type { V3 } from './world'

const LEDGE_Y = 2.6, LEDGE_Z = 3.1
/** 三个接线柱：“−”、小量程、大量程 */
export const meterPosts = (): { neg: V3; lo: V3; hi: V3 } => ({ neg: [-3.6, LEDGE_Y + POST_Y, LEDGE_Z], lo: [0, LEDGE_Y + POST_Y, LEDGE_Z], hi: [3.6, LEDGE_Y + POST_Y, LEDGE_Z] })
/** 表盘在外壳里的位置：外壳往后仰 TILT */
const TILT = -0.2, DW = 10, DH = DW * DIAL.h / DIAL.w, DY = 5.3
const PIVOT_Y = DY + DH / 2 - DH * DIAL.cy / DIAL.h, NEEDLE = DW * DIAL.r1 / DIAL.w + 0.2
const HALF = DIAL.half * Math.PI / 180
const SCREW = disc(0.42, 0.2, { segs: 24 })
/** 指针停住的两头（满偏的几分之几） */
const LO = -0.07, HI = 1.07

export function Meter({ kind, k }: { kind: MeterKind; k: number }) {
  const dial = useMemo(() => makeDial(kind), [kind])
  const marks = useMemo(() => makeMarks(kind === 'A' ? ['−', '0.6', '3'] : ['−', '3', '15'], { w: 768, h: 64, bg: '#202224', size: 46, colors: ['#e9e6dc', '#ff8a7a', '#ff8a7a'] }), [kind])
  const needle = useRef<THREE.Group>(null), s = useRef({ x: 0, v: 0 }), goal = useRef(k); goal.current = k
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30), q = s.current, w = 9, z = 0.32
    // 二阶阻尼：像真的表那样摆过头一点再停住；碰到限位弹回一点
    for (let i = 0; i < 4; i++) {
      const h = dt / 4, a = -w * w * (q.x - goal.current) - 2 * z * w * q.v
      q.v += a * h; q.x += q.v * h
      if (q.x > HI) { q.x = HI; q.v = -q.v * 0.25 } else if (q.x < LO) { q.x = LO; q.v = -q.v * 0.25 }
    }
    if (needle.current) needle.current.rotation.z = -(-HALF + 2 * HALF * q.x)
  })
  const bake = <meshPhysicalMaterial color="#1a1b1d" roughness={0.38} clearcoat={0.55} clearcoatRoughness={0.3} />
  const P = meterPosts()
  return <group>
    {/* 底座和前面的台阶 */}
    <RoundedBox args={[12.8, 1.2, 9.6]} radius={0.3} smoothness={3} position={[0, 0.6, 0]} castShadow receiveShadow>{bake}</RoundedBox>
    <RoundedBox args={[12.2, 1.5, 3.4]} radius={0.3} smoothness={3} position={[0, 1.85, LEDGE_Z]} castShadow>{bake}</RoundedBox>
    <mesh position={[0, 1.78, LEDGE_Z + 1.71]}><planeGeometry args={[11.2, 0.93]} /><meshStandardMaterial map={marks} roughness={0.5} /></mesh>
    <Post at={[P.neg[0], LEDGE_Y, LEDGE_Z]} color={BLACK} /><Post at={[P.lo[0], LEDGE_Y, LEDGE_Z]} color={RED} /><Post at={[P.hi[0], LEDGE_Y, LEDGE_Z]} color={RED} />
    {/* 表身：往后仰一点，正面嵌着表盘、一圈边框、一块玻璃 */}
    <group position={[0, 1.1, -1.4]} rotation-x={TILT}>
      <RoundedBox args={[12.2, 9.4, 6.2]} radius={0.5} smoothness={4} position={[0, 4.7, 0]} castShadow>{bake}</RoundedBox>
      <mesh position={[0, DY, 3.13]}><planeGeometry args={[DW, DH]} /><meshStandardMaterial map={dial} color="#c9c7c0" roughness={0.85} envMapIntensity={0.4} /></mesh>
      {/* 边框：四条带圆角的窄条 */}
      {[[0, DY + DH / 2 + 0.25, DW + 1, 0.5], [0, DY - DH / 2 - 0.25, DW + 1, 0.5]].map(([x, y, w, h], i) => <RoundedBox key={i} args={[w, h, 0.36]} radius={0.12} smoothness={2} position={[x, y, 3.2]}>{bake}</RoundedBox>)}
      {[-1, 1].map(sx => <RoundedBox key={sx} args={[0.5, DH + 1, 0.36]} radius={0.12} smoothness={2} position={[sx * (DW / 2 + 0.25), DY, 3.2]}>{bake}</RoundedBox>)}
      {/* 指针：转轴在表盘下沿附近；一根细黑针，尾巴上一小块配重 */}
      <group ref={needle} position={[0, PIVOT_Y, 3.17]}>
        <mesh position={[0, NEEDLE / 2, 0]}><boxGeometry args={[0.1, NEEDLE, 0.03]} /><meshBasicMaterial color="#111" /></mesh>
        <mesh position={[0, NEEDLE - 0.5, 0.005]}><boxGeometry args={[0.07, 1.4, 0.03]} /><meshBasicMaterial color="#b0201a" /></mesh>
        <mesh position={[0, -0.5, 0]}><boxGeometry args={[0.3, 0.6, 0.06]} /><meshStandardMaterial color="#111" /></mesh>
      </group>
      {/* 指针转轴上的一块黑色挡板，遮住表芯 */}
      <mesh position={[0, PIVOT_Y - 0.05, 3.22]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.55, 0.55, 0.1, 32]} />{bake}</mesh>
      {/* 玻璃罩 */}
      <mesh position={[0, DY, 3.3]} renderOrder={4}><planeGeometry args={[DW, DH]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.1} roughness={0.05} envMapIntensity={1.5} depthWrite={false} clearcoat={1} /></mesh>
      {/* 调零螺丝 */}
      <mesh geometry={SCREW} position={[0, 1.35, 3.1]} rotation-x={Math.PI / 2}><Metal kind="steel" grain="turned" /></mesh>
      <mesh position={[0, 1.35, 3.31]} rotation-z={0.6}><boxGeometry args={[0.6, 0.08, 0.03]} /><meshStandardMaterial color="#222" /></mesh>
    </group>
  </group>
}
