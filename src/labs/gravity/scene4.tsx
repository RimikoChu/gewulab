// 万有引力与航天 · 第 4 课的三维场景：称量地球。三种方法三个机位：地面上的一个物体（g 和 R）、月球绕地球（r 和 T）、贴着地面飞的卫星（算密度）。
import * as THREE from 'three'
import { ForceArrow, LabStage, type Label } from '@/lab-kit'
import { Satellite } from './craft'
import { OrbitLine } from './earth'
import { Circle } from './orbiter'
import { MOON, g, nearPeriod } from './physics'
import { SPACE } from './views'
import { MOON_ANG, MOON_D, RE, ST, moonAt, spinFacing, type Want } from './world'

export type Method = 'g' | 'moon' | 'near'
const E = ST.earth
const VIEWS: Record<Method, { target: THREE.Vector3; span: [number, number]; view: [number, number] }> = {
  g: { target: E.clone().add(new THREE.Vector3(0, 1.5, 0)), span: [RE * 3.0, RE * 2.4], view: [0.6, 0.15] },
  moon: { target: E.clone().lerp(moonAt(), 0.5), span: [MOON_D * 1.35, MOON_D * 0.62], view: [MOON_ANG - 0.3, 0.3] },
  near: { target: E.clone(), span: [RE * 3.4, RE * 2.6], view: [0.2, 0.5] },
}
/** 地面上的那个物体所在的方向（朝镜头偏上） */
const UP = new THREE.Vector3(-Math.cos(0.6) * 0.5, 0.86, Math.sin(0.6) * 0.5).normalize()

export default function Scene4({ method }: { method: Method }) {
  const V = VIEWS[method], m = moonAt()
  const p = E.clone().addScaledVector(UP, RE)
  const labels: Label[] = method === 'g' ? [
    { id: 'R', at: E.clone().addScaledVector(UP, RE * 0.5).add(new THREE.Vector3(0.5, 0, 0)).toArray(), className: 'scene-tag -translate-y-1/2', children: <><small>地球半径 R</small>6371 km</> },
    { id: 'g', at: p.clone().addScaledVector(UP, 1.8).toArray(), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>地面上</small>g = {g} m/s²</> },
  ] : method === 'moon' ? [
    { id: 'm', at: [m.x, m.y + 6, m.z], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>月球</small>T = {(MOON.T / 86400).toFixed(1)} 天</> },
    { id: 'r', at: E.clone().lerp(m, 0.5).add(new THREE.Vector3(0, 2, 0)).toArray(), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>r</small>3.84 × 10⁵ km</> },
    { id: 'nO', at: [E.x, E.y - 16, E.z], ax: 0.5, name: true, className: 'scene-name', children: '月球轨道画小了（示意）' },
  ] : [
    { id: 'T', at: [E.x, E.y + RE + 3, E.z], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>贴地飞一圈</small>T = {(nearPeriod() / 60).toFixed(1)} 分钟</> },
  ]
  const want: Want = { space: true, earthLight: true, spin: spinFacing(110, 0.6), moonOrbit: method === 'moon' }
  return (
    <LabStage<Want> labels={labels} target={V.target} span={V.span} view={V.view} {...SPACE} world={want}>
      {method === 'g' && <group>
        {/* 半径：从地心到地面的一条线 */}
        <mesh position={E.clone().addScaledVector(UP, RE / 2)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), UP)}><cylinderGeometry args={[0.07, 0.07, RE, 8]} /><meshBasicMaterial color="#ffe9a8" depthTest={false} transparent toneMapped={false} /></mesh>
        <mesh position={p.clone().addScaledVector(UP, 0.6)}><boxGeometry args={[1.1, 1.1, 1.1]} /><meshStandardMaterial color="#c9a26b" roughness={0.7} /></mesh>
        <ForceArrow tip={p.clone().addScaledVector(UP, -0.05).toArray()} dir={UP.clone().negate().toArray()} len={3.2} color="#ff7a5a" thick={2.4} />
      </group>}
      {method === 'moon' && <group>
        <mesh position={E.clone().lerp(m, 0.5)} rotation-y={MOON_ANG} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.18, 0.18, MOON_D, 8]} /><meshBasicMaterial color="#ffe9a8" transparent opacity={0.7} toneMapped={false} /></mesh>
      </group>}
      {method === 'near' && <group position={E}>
        <OrbitLine a={RE * 1.012} color="#7fe3d4" opacity={0.9} width={1.6} />
        <Circle r={RE * 1.03} T={nearPeriod()} phase={1}><group scale={0.18}><Satellite /></group></Circle>
      </group>}
    </LabStage>
  )
}
