// 万有引力与航天 · 第 1 课的三维场景：太阳系里一颗故意画扁的示意行星。太阳在椭圆的一个焦点上；扫过的面积画成扇形。
import { useMemo } from 'react'
import * as THREE from 'three'
import { LabStage, type Label } from '@/lab-kit'
import { OrbitBand, Planet } from './earth'
import { SHOW, aphelion, areaShare, orbitPos, perihelion, showState, toAU } from './physics'
import { SPACE } from './views'
import { ST, type Want } from './world'

/** 示意行星的轨道：半长轴 14 单位 */
export const A1 = 14, E1 = SHOW.e
const TARGET = ST.solar.clone().add(new THREE.Vector3(-A1 * E1 - 2.5, 0, 0.5))
const SPAN: [number, number] = [A1 * 2 + 8, A1 * 1.75]
const VIEW: [number, number] = [0.12, 0.5]
/** 椭圆上的点（场景坐标，相对太阳） */
export const at = (frac: number): [number, number, number] => { const [x, y] = orbitPos(A1, E1, frac); return [x, 0, -y] }
export interface Sector { from: number; to: number; color: string }

function Fan({ s }: { s: Sector }) {
  const geo = useMemo(() => {
    const n = 60, p: number[] = []
    for (let i = 0; i < n; i++) { const a = at(s.from + (s.to - s.from) * i / n), b = at(s.from + (s.to - s.from) * (i + 1) / n); p.push(0, 0, 0, ...a, ...b) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g
  }, [s.from, s.to])
  return <mesh geometry={geo} position={[0, 0.02, 0]} raycast={() => null}><meshBasicMaterial color={s.color} transparent opacity={0.42} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} /></mesh>
}

export default function Scene1({ frac, sectors, sweeping }: { frac: number; sectors: Sector[]; sweeping: Sector | null }) {
  const p = at(frac), S = ST.solar
  const w = (q: [number, number, number], dy = 0): [number, number, number] => [S.x + q[0], S.y + q[1] + dy, S.z + q[2]]
  const { v } = showState(frac)
  const all = sweeping ? [...sectors, sweeping] : sectors
  const labels: Label[] = [
    { id: 'v', at: w(p, 2.1), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>速度</small>{(v / 1000).toFixed(1)} km/s</> },
    { id: 'nS', at: w([0, 0, 0], -2.6), ax: 0.5, name: true, className: 'scene-name', children: '太阳（在焦点上）' },
    { id: 'nPl', at: w(p, -2.0), ax: 0.5, name: true, className: 'scene-name', children: '行星（示意大小）' },
    { id: 'nP', at: w(at(0), -1.3), ax: 0.5, name: true, className: 'scene-name', children: `近日点 · ${toAU(perihelion(SHOW.a, SHOW.e)).toFixed(1)} AU` },
    { id: 'nA', at: w(at(0.5), -1.3), ax: 0.5, name: true, className: 'scene-name', children: `远日点 · ${toAU(aphelion(SHOW.a, SHOW.e)).toFixed(1)} AU` },
    ...all.map((s, i) => { const m = at((s.from + s.to) / 2); return { id: `s${i}`, at: w([m[0] * 0.55, 0, m[2] * 0.55], 0.6), ax: 0.5, className: 'scene-tag -translate-y-1/2', children: <><small>一个月扫过</small>{(100 * areaShare(s.from, s.to)).toFixed(1)}%</> } as Label }),
  ]
  const want: Want = { space: true }
  return (
    <LabStage<Want> labels={labels} target={TARGET} span={SPAN} view={VIEW} {...SPACE} world={want}>
      <group position={S}>
        <OrbitBand a={A1} e={E1} width={0.7} color="#a9c8ff" opacity={0.85} />
        {/* 长轴：过两个焦点的一条虚线 */}
        <mesh position={[-A1 * E1, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, A1 * 2, 6]} /><meshBasicMaterial color="#8fa3c2" transparent opacity={0.4} toneMapped={false} /></mesh>
        <mesh position={[-2 * A1 * E1, 0, 0]}><sphereGeometry args={[0.18, 16, 12]} /><meshBasicMaterial color="#8fa3c2" toneMapped={false} /></mesh>
        {all.map((s, i) => <Fan key={i} s={s} />)}
        <group position={p}><Planet kind="show" r={1.4} /></group>
        {/* 行星到太阳的连线 */}
        <mesh position={[p[0] / 2, 0.03, p[2] / 2]} rotation-y={Math.atan2(-p[2], p[0])}><boxGeometry args={[Math.hypot(p[0], p[2]), 0.04, 0.04]} /><meshBasicMaterial color="#ffe9a8" toneMapped={false} /></mesh>
      </group>
    </LabStage>
  )
}
