// 二次函数 · 第 1 课的三维场景：草坪上一根木桩、一根绳子；拉直绳子绕一圈，用白灰画出圆形花坛。旁边一块 S–r 图表板。
import { useMemo } from 'react'
import * as THREE from 'three'
import type { Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { AxesPlane, Curve, Dash, Dot, type Axes } from './graph'
import { makeWood, rep } from './mats'
import { circleArea, fmt } from './physics'
import { P } from './world'
import { Board } from './props'

type V3 = [number, number, number]
const AZ = 0
const W = (p: V3) => toWorld(P.bed1, AZ, p)
export const A1: Axes = { xr: [0, 3.5], yr: [0, 32], xStep: 1, yStep: 5, sx: 0.9, sy: 0.08, minor: [0.5, 2.5], xName: 'r / m', yName: 'S / m²', font: 0.2, pad: 0.4 }
const BOARD: V3 = [-1.6, 0.3, -4.2]   // 图表板立在花坛后面、绿篱前面

/** 一根木桩：削尖的方木，顶上一圈铁箍 */
function Stake({ h = 0.55 }: { h?: number }) {
  const wood = useMemo(() => rep(makeWood([170, 128, 84]), 1, 1), [])
  return (
    <group>
      <mesh position-y={h / 2} castShadow><boxGeometry args={[0.07, h, 0.07]} /><meshStandardMaterial map={wood} roughness={0.85} /></mesh>
      <mesh position-y={h - 0.06}><boxGeometry args={[0.078, 0.03, 0.078]} /><meshStandardMaterial color="#555b60" metalness={0.7} roughness={0.4} /></mesh>
    </group>
  )
}

/** 还没画时的虚线轮廓：一段段石灰点出这根绳子能画多大的圆 */
function ChalkDash({ r }: { r: number }) {
  const n = Math.max(12, Math.round(r * 18))
  return <group>{Array.from({ length: n }, (_, i) => { const a = (i + 0.25) / n * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * r, 0.017, -Math.sin(a) * r]} rotation={[-Math.PI / 2, 0, a + Math.PI / 2]}><planeGeometry args={[Math.PI * 2 * r / n * 0.5, 0.05]} /><meshStandardMaterial color="#f3f1ea" roughness={0.95} transparent opacity={0.8} /></mesh> })}</group>
}

/**
 * r：绳长（过渡中）；turn：已经画过的角度（0 到 2π）；rings：画好的圆；soil：翻过土的圆的半径；
 * pts：图表板上描的点；link：连成曲线
 */
export default function Scene1({ r, turn, rings, soil, pts, link }: { r: number; turn: number; rings: number[]; soil: number; pts: number[]; link: boolean }) {
  const tip: V3 = [Math.cos(turn) * r, 0, -Math.sin(turn) * r]
  const rope = useMemo(() => new THREE.CylinderGeometry(0.008, 0.008, 1, 6), [])
  const labels: Label[] = [
    { id: 'r', at: W([tip[0] / 2, 0.45, tip[2] / 2]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>绳长</small>r = {fmt(r)} m</> },
    ...(soil > 0 ? [{ id: 's', at: W([0, 0.05, soil * 0.55]), ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: <><small>面积</small>S ≈ {fmt(circleArea(soil))} m²</> } satisfies Label] : []),
    { id: 'nb', at: W([BOARD[0] + 1.6, BOARD[1] + 3.05, BOARD[2]]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '图表板：面积 S 和半径 r' },
    { id: 'ns', at: W([0, 0.62, 0]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '木桩' },
  ]
  const len = r, ang = turn
  return (
    <At at="bed1" labels={labels}>
      <Local origin={P.bed1} az={AZ}>
        {/* 翻过土的圆 */}
        {soil > 0 && <mesh position-y={0.012} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[soil, 72]} /><meshStandardMaterial color="#5b4330" roughness={1} /></mesh>}
        {/* 画好的白灰线 */}
        {rings.map(rr => <mesh key={rr} position-y={0.02} rotation-x={-Math.PI / 2}><ringGeometry args={[rr - 0.04, rr + 0.04, 96]} /><meshStandardMaterial color="#f3f1ea" roughness={0.95} /></mesh>)}
        {turn > 0.01 && turn < Math.PI * 2 - 0.01 && <mesh position-y={0.021} rotation-x={-Math.PI / 2}><ringGeometry args={[r - 0.04, r + 0.04, 96, 1, 0, turn]} /><meshStandardMaterial color="#f3f1ea" roughness={0.95} /></mesh>}
        {/* 还没画的时候，用一圈淡淡的虚影提示这根绳子能画多大的圆 */}
        {/* 3 m 的虚线轮廓一直在：最大的那个圆有多大；还没画的这一圈用淡淡的实线提示 */}
        {!rings.includes(3) && !(turn > 0.01 && r > 2.99) && <ChalkDash r={3} />}
        {turn < 0.01 && <mesh position-y={0.018} rotation-x={-Math.PI / 2}><ringGeometry args={[r - 0.03, r + 0.03, 96]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} /></mesh>}
        {/* 石灰撒的半径线：从木桩到绳头 */}
        <mesh position={[tip[0] / 2, 0.016, tip[2] / 2]} rotation={[-Math.PI / 2, 0, ang]}><planeGeometry args={[Math.max(0.01, r), 0.05]} /><meshStandardMaterial color="#f3f1ea" roughness={0.95} /></mesh>
        {/* 中间的木桩、绳子、画线的木桩（顶上系一条红布条，远看也找得到） */}
        <Stake />
        <mesh geometry={rope} position={[tip[0] / 2, 0.32, tip[2] / 2]} rotation={[0, ang, Math.PI / 2]} scale={[1, len, 1]} castShadow><meshStandardMaterial color="#d8c79a" roughness={0.9} /></mesh>
        <group position={tip} rotation-z={0.18 * Math.cos(ang)} rotation-x={0.18 * Math.sin(ang)}><Stake h={0.7} /><mesh position={[0.09, 0.62, 0]}><boxGeometry args={[0.18, 0.1, 0.005]} /><meshStandardMaterial color="#d8402f" roughness={0.7} side={THREE.DoubleSide} /></mesh></group>
        {/* 白灰桶 */}
        <group position={[-1.4, 0, 1.6]}>
          <mesh position-y={0.17} castShadow><cylinderGeometry args={[0.15, 0.12, 0.34, 24, 1, true]} /><meshStandardMaterial color="#e8e6df" roughness={0.6} side={THREE.DoubleSide} /></mesh>
          <mesh position-y={0.3} rotation-x={-Math.PI / 2}><circleGeometry args={[0.145, 24]} /><meshStandardMaterial color="#fbfaf6" roughness={1} /></mesh>
        </group>
        {/* 图表板 */}
        <group position={BOARD}>
          <Board A={A1} lift={0.3}>
            {pts.map(x => <Dot key={x} A={A1} x={x} y={circleArea(x)} r={0.08} />)}
            {link && <>
              <Curve A={A1} f={x => circleArea(x)} xr={[0, 3.25]} color="#ffd25a" width={0.05} />
              <Dash A={A1} p={[1, circleArea(1)]} q={[3, circleArea(3)]} color="#9fd8ff" width={0.03} gap={0.16} />
            </>}
          </Board>
        </group>
      </Local>
    </At>
  )
}
