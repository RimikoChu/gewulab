// 电磁感应和电网 · 第 4 课 法拉第电磁感应定律的器材：实验台上一台 C 形电磁铁，上下两块方形极靴之间是 0.50 T 的竖直磁场；
// 两根铜导轨从极靴之间穿过，左端接一只数字毫伏表；导轨上横着一根黄铜导体棒，戴手套的手推着它走。
// 导轨、导体棒和毫伏表围成的回路里，处在磁场中的那一块面积涂成淡蓝色：导体棒一动，这块面积就变。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Led, Metal } from '@/lab-kit'
import { COL, ST, TOP } from './layout'
import { makePanel, makeText, makeWinding, rep } from './mats'
import { CUT, type V3 } from './physics'
import { BLACK, Bench, Hand, Post, RED, Wire } from './gear'
import { FieldLines, LoopFlow } from './fx'

/** 器材的尺寸：极靴（沿 x 长、沿 z 深）、气隙、导轨的高度和左端 */
export const R4 = { poleL: 0.34, poleD: 0.16, gap: 0.11, railY: TOP + 0.085, x0: -0.17, railL: 0.5, start: -0.12, meter: [-0.42, TOP, 0.06] as V3 }
const FIELD_X0 = -R4.poleL / 2

/** C 形电磁铁：铸铁轭（背后一根立柱，上下两条臂），两只大线圈套在臂上，前端是磨亮的极靴 */
function Magnet() {
  const tex = useMemo(() => { const t = rep(makeWinding([170, 90, 44], 40), 1, 1); t.repeat.set(1, 6); return t }, [])
  const iron = <meshPhysicalMaterial color="#3d5266" roughness={0.42} clearcoat={0.4} metalness={0.3} />
  const yPole0 = R4.railY - 0.03, yPole1 = yPole0 + R4.gap
  return <group>
    <RoundedBox args={[0.42, 0.04, 0.42]} radius={0.006} smoothness={2} position={[0, TOP + 0.02, -0.1]} castShadow receiveShadow>{iron}</RoundedBox>
    <RoundedBox args={[0.2, yPole1 + 0.12 - TOP, 0.08]} radius={0.01} smoothness={2} position={[0, (yPole1 + 0.12 + TOP) / 2, -0.27]} castShadow>{iron}</RoundedBox>
    {[[yPole0 - 0.05, -1], [yPole1 + 0.05, 1]].map(([y, s]) => <group key={s}>
      <RoundedBox args={[0.2, 0.1, 0.26]} radius={0.01} smoothness={2} position={[0, y, -0.15]} castShadow>{iron}</RoundedBox>
      {/* 线圈：套在臂上，外面一圈黑色绝缘带 */}
      <mesh position={[0, y, -0.17]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.085, 0.085, 0.1, 40, 1, true]} /><meshPhysicalMaterial map={tex} roughness={0.3} metalness={0.6} clearcoat={0.5} side={THREE.DoubleSide} /></mesh>
      {[-0.22, -0.12].map(z => <mesh key={z} position={[0, y, z]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.09, 0.09, 0.012, 40]} /><meshStandardMaterial color="#1d1e20" roughness={0.6} /></mesh>)}
      {/* 极靴 */}
      <RoundedBox args={[R4.poleL, 0.03, R4.poleD]} radius={0.004} smoothness={2} position={[0, y - s * 0.035, 0]} castShadow><Metal kind="steel" rough={0.28} /></RoundedBox>
    </group>)}
  </group>
}

/** x：导体棒离极靴左沿多远（m）；emf：毫伏表的读数（V）；flow：回路里的电流（有正负）；hand：手在不在 */
export function Rig4({ x = R4.start, emf = 0, flow = 0, push = 0 }: { x?: number; emf?: number; flow?: number; push?: number }) {
  const y = R4.railY, L = CUT.L, rodX = FIELD_X0 + (x - R4.start) + (R4.start - FIELD_X0)
  // 竖直向下的磁感线：极靴之间一片 7 × 4 根
  const lines = useMemo(() => {
    const out: V3[][] = []
    for (let i = 0; i < 9; i++) for (let k = 0; k < 4; k++) { const lx = -R4.poleL / 2 + 0.02 + i * (R4.poleL - 0.04) / 8, lz = -0.06 + k * 0.04; out.push([[lx, y + R4.gap - 0.035, lz], [lx, y - 0.025, lz]]) }
    return out
  }, [y])
  const area = Math.max(0.001, rodX - FIELD_X0)
  const plate = makeText(['数字毫伏表'], { w: 256, h: 48, bg: '#2b2f33', fg: '#cdd2d6', size: 26, weight: 500 })
  const panel = useMemo(() => rep(makePanel('#c3c7c6'), 1, 1), [])
  const M = R4.meter, mv = (emf * 1e3)
  const loop: V3[] = [[R4.x0 - 0.18, y + 0.006, -L / 2], [rodX, y + 0.006, -L / 2], [rodX, y + 0.006, L / 2], [R4.x0 - 0.18, y + 0.006, L / 2]]
  return <group position={[ST.l4, 0, 0]}>
    <Bench w={1.4} />
    <Magnet />
    {/* 胶木垫板和两根铜导轨 */}
    <mesh position={[-0.06, y - 0.012, 0]} castShadow receiveShadow><boxGeometry args={[R4.railL + 0.12, 0.012, L + 0.06]} /><meshPhysicalMaterial color="#5a3b24" roughness={0.45} clearcoat={0.4} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[R4.x0 + R4.railL / 2 - 0.18, y, s * L / 2]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.004, 0.004, R4.railL, 16]} /><Metal kind="copper" grain="turned" /></mesh>)}
    {/* 磁场里被回路围住的面积 */}
    <mesh position={[(FIELD_X0 + rodX) / 2, y + 0.001, 0]} rotation-x={-Math.PI / 2} scale={[area, 1, 1]} renderOrder={3}><planeGeometry args={[1, L]} /><meshBasicMaterial color={COL.B} transparent opacity={0.28} depthWrite={false} toneMapped={false} /></mesh>
    <FieldLines lines={lines} heads={1} head={0.01} r={0.001} opacity={0.85} />
    {/* 导体棒和推它的手 */}
    <mesh position={[rodX, y + 0.008, 0]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.005, 0.005, L + 0.04, 20]} /><Metal kind="brass" grain="turned" /></mesh>
    <group position={[rodX - 0.07, y + 0.03, 0.02]} rotation={[Math.PI / 2, 0, 0]} visible={push > 0}><Hand side="right" curl={0.5} thumb={0.9} scale={0.75} sleeve={0.08} /></group>
    <LoopFlow pts={loop} flow={flow} dots={20} size={0.003} />
    {/* 数字毫伏表 */}
    <group position={M} rotation-y={0.35}>
      <RoundedBox args={[0.18, 0.1, 0.14]} radius={0.008} smoothness={3} position={[0, 0.056, 0]} castShadow receiveShadow><meshStandardMaterial map={panel} color="#d3d6d5" roughness={0.45} metalness={0.3} /></RoundedBox>
      <mesh position={[0, 0.056, 0.0705]}><planeGeometry args={[0.16, 0.08]} /><meshStandardMaterial color="#26292d" roughness={0.5} /></mesh>
      <Led text={`${mv >= 0 ? ' ' : '-'}${Math.abs(mv).toFixed(1)}`} w={0.11} h={0.04} position={[0, 0.066, 0.0715]} />
      <mesh position={[0, 0.026, 0.0715]}><planeGeometry args={[0.07, 0.013]} /><meshBasicMaterial map={plate} /></mesh>
      <Post at={[0.04, 0.012, 0.075]} color={RED} /><Post at={[0.065, 0.012, 0.075]} color={BLACK} />
    </group>
    <Wire pts={[[M[0] + 0.03, M[1] + 0.03, M[2] + 0.08], [-0.33, TOP + 0.02, 0.1], [R4.x0 - 0.18, y, L / 2]]} color={RED} flow={flow} />
    <Wire pts={[[M[0] + 0.055, M[1] + 0.03, M[2] + 0.08], [-0.32, TOP + 0.02, 0.0], [R4.x0 - 0.18, y, -L / 2]]} color={BLACK} flow={-flow} />
  </group>
}
