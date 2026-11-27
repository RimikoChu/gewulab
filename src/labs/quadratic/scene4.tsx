// 二次函数 · 第 4 课的三维场景：篮球场上一台投篮机，出球口离地 2.25 m，离篮圈中心水平 4 m。
// 坐标平面立在出球口和篮圈所在的竖直面里，原点在出球口正下方的地面。球按真实的速度飞（约 0.8 秒进篮），身后留一串残影。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, shell, type Label } from '@/lab-kit'
import At, { Local, toWorld } from './at'
import { AxesPlane, Curve, Dash, Dot, type Axes } from './graph'
import { makeBall } from './mats'
import { HOOP, quad, SHOT, shotSpeed, vertexOf } from './physics'
import { P } from './world'

type V3 = [number, number, number]
const W = (p: V3) => toWorld(P.shot, 0, p)
const A: Axes = { xr: [-0.5, 4.6], yr: [0, 4], xStep: 1, yStep: 1, sx: 1, sy: 1, minor: [0.5, 0.5], xName: 'x / m', yName: 'y / m', font: 0.15, pad: 0.25 }
const R = 0.123   // 7 号球半径（m）
const [VX, VY] = vertexOf(SHOT.a, SHOT.b, SHOT.c)

/** 篮球：橙色颗粒皮、黑色的缝 */
export function Ball() {
  const map = makeBall()
  return <mesh castShadow><sphereGeometry args={[R, 40, 28]} /><meshStandardMaterial map={map} bumpMap={map} bumpScale={0.6} roughness={0.72} /></mesh>
}

/** 投篮机：带脚轮的底座、立柱、铁丝球筐、出球头（两只发球轮夹着一根 45° 的出球管） */
function Machine() {
  const basket = useMemo(() => shell([[0.3, 0], [0.42, 0.42]], 0.006, { segs: 40 }), [])
  // 金属网格：方格的铁丝，空的地方透明
  const grid = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 9); g.fillRect(0, 0, 9, 64); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 5); return t }, [])
  return (
    <group>
      <RoundedBox args={[0.9, 0.3, 0.7]} radius={0.05} position={[-0.25, 0.25, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#1f2328" roughness={0.4} clearcoat={0.5} /></RoundedBox>
      {[-0.6, 0.1].flatMap(x => [-0.28, 0.28].map(z => <group key={`${x}${z}`} position={[x, 0.07, z]}>
        <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.05, 20]} /><meshStandardMaterial color="#2b2f33" roughness={0.7} /></mesh>
        <mesh position-y={0.06}><boxGeometry args={[0.06, 0.08, 0.08]} /><Metal kind="steel" /></mesh>
      </group>))}
      {/* 立柱 */}
      <mesh position={[-0.12, 1.2, 0]} castShadow><cylinderGeometry args={[0.045, 0.045, 1.9, 20]} /><Metal kind="chrome" /></mesh>
      {/* 球筐：一只上大下小的铁丝筐，里面三只球 */}
      <group position={[-0.55, 1.05, 0]}>
        <mesh geometry={basket} castShadow><meshStandardMaterial color="#3a4046" roughness={0.38} metalness={0.85} alphaMap={grid} alphaTest={0.5} side={THREE.DoubleSide} /></mesh>
        <mesh position-y={0.42} rotation-x={Math.PI / 2}><torusGeometry args={[0.415, 0.012, 8, 40]} /><Metal kind="chrome" /></mesh>
        <group position={[0, 0.16, 0.12]}><Ball /></group><group position={[0.12, 0.2, -0.1]}><Ball /></group><group position={[-0.1, 0.33, -0.02]}><Ball /></group>
        <mesh position={[0.3, 0.05, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.02, 0.02, 0.3, 10]} /><Metal kind="chrome" /></mesh>
      </group>
      {/* 出球头 */}
      <group position={[0, SHOT.c, 0]} rotation-z={Math.atan(SHOT.b)}>
        <RoundedBox args={[0.5, 0.3, 0.42]} radius={0.04} position={[-0.32, 0, 0]} castShadow><meshPhysicalMaterial color="#d8461f" roughness={0.35} clearcoat={0.7} /></RoundedBox>
        <mesh position={[-0.05, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.15, 0.15, 0.12, 28, 1, true]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        {[-0.17, 0.17].map(z => <mesh key={z} position={[-0.3, 0, z]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.12, 0.12, 0.06, 28]} /><meshStandardMaterial color="#2d3135" roughness={0.6} /></mesh>)}
      </group>
      <mesh position={[-0.12, 2.05, 0]}><boxGeometry args={[0.16, 0.2, 0.16]} /><Metal kind="steel" grain="brushed" /></mesh>
    </group>
  )
}

/** 飞行中的球：t 是出手后的时间（s）；没出手时停在出球口 */
function Flying({ t, trail }: { t: number | null; trail: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const v = shotSpeed()
  const pos = (tt: number): V3 => {
    const x = Math.min(HOOP.x, v * tt)
    if (v * tt <= HOOP.x) return [x, quad(SHOT.a, SHOT.b, SHOT.c, x), 0]
    const dt = tt - HOOP.x / v, y = HOOP.y - 4.9 * dt * dt - 0.6 * dt   // 进篮以后穿网落下
    return [HOOP.x, Math.max(R, y), 0]
  }
  useFrame(() => { if (ref.current) { const tt = t ?? 0, [x, y] = pos(tt); ref.current.position.set(x, y, 0); ref.current.rotation.z = -tt * 9 } })
  const ghosts = useMemo(() => Array.from({ length: 9 }, (_, i) => (i + 1) * (HOOP.x / v) / 10), [v])
  return (
    <group>
      <group ref={ref} position={[0, SHOT.c, 0]}><Ball /></group>
      {trail && ghosts.map(g => { const [x, y] = pos(g); return <mesh key={g} position={[x, y, 0]} renderOrder={4}><sphereGeometry args={[R * 0.9, 20, 14]} /><meshStandardMaterial color="#e5803e" transparent opacity={0.3} depthWrite={false} /></mesh> })}
    </group>
  )
}

export default function Scene4({ t, flown, vertex }: { t: number | null; flown: boolean; vertex: boolean }) {
  const labels: Label[] = [
    { id: 'hoop', at: W([HOOP.x + 0.28, HOOP.y + 0.1, 0]), className: 'scene-tag -translate-y-full', children: <><small>篮圈</small>3.05 m</> },
    { id: 'rel', at: W([-0.25, SHOT.c, 0.3]), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>出手</small>2.25 m</> },
    ...(vertex ? [{ id: 'v', at: W([VX, VY + 0.15, 0.1]), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>最高点</small>(2.5, 3.5)</> } satisfies Label] : []),
    { id: 'n', at: W([-0.25, 0.75, 0.5]), ax: 0.5, name: true, className: 'scene-name', children: '投篮机' },
  ]
  return (
    <At at="shot" labels={labels}>
      <Local origin={P.shot} az={0}>
        <group position-x={-0.18}><Machine /></group>
        <Flying t={t} trail={flown} />
        <group position-z={0}>
          <AxesPlane A={A} frame={false}>
            {flown && <Curve A={A} f={x => quad(SHOT.a, SHOT.b, SHOT.c, x)} xr={[0, HOOP.x]} color="#ffd25a" width={0.03} />}
            <Dot A={A} x={0} y={SHOT.c} r={0.06} color="#ff9f7a" />
            <Dot A={A} x={HOOP.x} y={HOOP.y} r={0.06} color="#ff9f7a" />
            {vertex && <>
              <Dot A={A} x={VX} y={VY} r={0.07} color="#ff7a59" />
              <Dash A={A} p={[VX, 0]} q={[VX, VY]} width={0.022} gap={0.12} />
              <Dash A={A} p={[0, VY]} q={[VX, VY]} width={0.022} gap={0.12} />
            </>}
          </AxesPlane>
        </group>
      </Local>
    </At>
  )
}
