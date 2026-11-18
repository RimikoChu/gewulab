// 压强 · 第 2 课的三维场景：水电站工地的软土路（地形在 hydro.tsx，这里只放车、钢板和车辙）。卡车和挖掘机从硬地面开上软土，看谁陷下去。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { CARS, kPa, type CarKey } from './physics'
import { Painted, mergeParts, type Label, type Part } from '../float/dock'
import { ST } from './hydro'
import { LabStage } from './stage'
import { useSlide } from './world'

const X0 = ST.road                              // 这一课在大场景里的位置
const TARGET = new THREE.Vector3(X0 - 3.6, 1.25, -1.2)
const SPAN: [number, number] = [17, 6.6]
const VIEW: [number, number] = [0.16, 0.13]
const PAD = -3                                  // 硬地面到这里为止，往右是软土
const X_PAD = -7.6, X_SOIL = 1.6                // 车停在硬地面、软土上时车身中心的位置
const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k) }

/** 轮式自卸卡车：车头朝右。靠镜头这一侧的轮子外沿贴着剖面 */
function Truck() {
  const body = useMemo(() => {
    const P: Part[] = []
    P.push({ p: [-0.2, 0.95, -1.25], s: [6.6, 0.24, 1.0], c: '#2b2f33' })                                 // 大梁
    P.push({ p: [-1.2, 1.85, -1.25], s: [4.4, 1.3, 2.4], c: '#d9651e' }, { p: [-1.2, 2.55, -1.25], s: [4.5, 0.12, 2.5], c: '#b9521a' })   // 货斗
    for (let i = 0; i < 6; i++) P.push({ p: [-3.2 + i * 0.8, 1.85, 0.0], s: [0.08, 1.2, 0.05], c: '#b9521a' })
    P.push({ p: [1.35, 1.3, -1.25], s: [0.5, 0.5, 2.3], c: '#2b2f33' }, { p: [3.25, 0.75, -1.25], s: [0.16, 0.36, 2.4], c: '#3c4249' })    // 油箱、保险杠
    for (const x of [2.1, -1.5, -2.7]) for (const z of [-0.25, -2.25]) P.push({ p: [x, 0.5, z], s: [0.5, 0.5, 0.5], c: '#1c1f22', cyl: true, r: [Math.PI / 2, 0, 0] }, { p: [x, 0.5, z + (z > -1 ? 0.2 : -0.2)], s: [0.24, 0.12, 0.24], c: '#c9ced3', cyl: true, r: [Math.PI / 2, 0, 0] })
    return mergeParts(P)
  }, [])
  return (
    <group>
      <mesh geometry={body} castShadow><Painted rough={0.6} metal={0.3} /></mesh>
      <RoundedBox args={[1.9, 1.75, 2.36]} radius={0.16} smoothness={4} position={[2.25, 1.95, -1.25]} castShadow><meshStandardMaterial color="#e9e6dc" roughness={0.45} metalness={0.2} /></RoundedBox>
      <mesh position={[2.6, 2.3, -0.06]}><planeGeometry args={[0.9, 0.7]} /><meshStandardMaterial color="#22354a" roughness={0.15} metalness={0.4} /></mesh>
      <mesh position={[3.21, 2.3, -1.25]} rotation-y={Math.PI / 2}><planeGeometry args={[2, 0.75]} /><meshStandardMaterial color="#22354a" roughness={0.15} metalness={0.4} /></mesh>
    </group>
  )
}

/** 履带挖掘机：车头朝右。靠镜头这一侧的履带外沿贴着剖面 */
function Digger() {
  const parts = useMemo(() => {
    const P: Part[] = [], Y = '#e8b21e'
    for (const z of [-0.3, -2.3]) for (let i = 0; i < 5; i++) P.push({ p: [-1.4 + i * 0.7, 0.36, z + (z > -1 ? 0.31 : -0.31)], s: [0.2, 0.04, 0.2], c: '#8d949c', cyl: true, r: [Math.PI / 2, 0, 0] })
    P.push({ p: [0, 0.95, -1.3], s: [1.4, 0.3, 1.6], c: '#2b2f33' })                                      // 回转座
    P.push({ p: [-1.0, 1.75, -1.3], s: [1.6, 1.1, 2.3], c: '#3c4249' })                                   // 配重和发动机罩
    // 动臂、斗杆、铲斗
    P.push({ p: [2.0, 2.9, -1.6], s: [3.4, 0.4, 0.36], c: Y, r: [0, 0, 0.62] }, { p: [3.85, 2.9, -1.6], s: [2.6, 0.3, 0.3], c: Y, r: [0, 0, -1.05] })
    P.push({ p: [4.45, 1.55, -1.6], s: [0.9, 0.7, 0.9], c: '#3c4249', r: [0, 0, 0.4] })
    P.push({ p: [1.9, 2.2, -1.6], s: [1.5, 0.12, 0.12], c: '#c9ced3', r: [0, 0, 0.95] })
    return mergeParts(P)
  }, [])
  const track = <meshStandardMaterial color="#22262a" roughness={0.85} metalness={0.3} />
  return (
    <group>
      {[-0.3, -2.3].map(z => <RoundedBox key={z} args={[3.5, 0.72, 0.6]} radius={0.3} smoothness={5} position={[0, 0.36, z]} castShadow>{track}</RoundedBox>)}
      <mesh geometry={parts} castShadow><Painted rough={0.55} metal={0.35} /></mesh>
      <RoundedBox args={[2.5, 1.2, 2.4]} radius={0.12} smoothness={4} position={[-0.2, 1.72, -1.3]} castShadow><meshStandardMaterial color="#e8b21e" roughness={0.5} metalness={0.3} /></RoundedBox>
      <RoundedBox args={[1.15, 1.5, 1.0]} radius={0.1} smoothness={4} position={[0.55, 2.35, -0.72]} castShadow><meshStandardMaterial color="#e8b21e" roughness={0.5} metalness={0.3} /></RoundedBox>
      <mesh position={[0.55, 2.45, -0.21]}><planeGeometry args={[0.9, 1.0]} /><meshStandardMaterial color="#22354a" roughness={0.15} metalness={0.4} /></mesh>
    </group>
  )
}

interface SceneProps { car: CarKey; plates: boolean; onSoil: boolean; sink: number; p: number; rut: { depth: number; car: CarKey } | null }

function Apparatus({ car, plates, sink, rut, x }: SceneProps & { x: number }) {
  const on = smooth((x - (PAD - 1)) / 3.4), y = -sink * on
  const feet = car === 'truck' ? [2.1, -1.5, -2.7].map(k => [k, 0.56] as const) : [[0, 3.56] as const]
  return (
    <group position={[X0, 0, 0]}>
      {/* 垫在软土上的两块钢板 */}
      {plates && [-0.25, -2.25].map(z => <mesh key={z} position={[X_SOIL - 0.3, 0.03 - sink * on * 0.9, z]} castShadow receiveShadow><boxGeometry args={[6, 0.05, 1]} /><meshStandardMaterial color="#6b737a" metalness={0.8} roughness={0.45} /></mesh>)}
      {/* 车辙：剖面上的深色缺口 */}
      {rut && rut.depth > 0.02 && (rut.car === 'truck' ? [2.1, -1.5, -2.7].map(k => [k, 0.6] as const) : [[0, 3.6] as const]).map(([k, w]) => <mesh key={k} position={[X_SOIL + k, -rut.depth / 2, 0.009]}><planeGeometry args={[w, rut.depth]} /><meshBasicMaterial color="#3a3024" /></mesh>)}
      <group position={[x, y, 0.016]}>{car === 'truck' ? <Truck /> : <Digger />}</group>
      {/* 着地的地方：一条亮线标出来 */}
      {on > 0.98 && feet.map(([k, w]) => <mesh key={k} position={[x + k, y + 0.004, 0.03]}><planeGeometry args={[w, 0.035]} /><meshBasicMaterial color="#35c7b3" toneMapped={false} /></mesh>)}
    </group>
  )
}

export default function Scene2(props: SceneProps) {
  const { car, onSoil, sink, p, rut } = props
  const x = useSlide(onSoil ? X_SOIL : X_PAD, 4.2)
  const there = onSoil && Math.abs(x - X_SOIL) < 0.01
  const labels: Label[] = [
    { id: 'p', at: [X0 + x + 0.2, 3.9, 0], ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: there ? 1 : 0 }, children: <><small>对地面的压强</small>{kPa(p)} kPa</> },
    { id: 'sink', at: [X0 + X_SOIL + (car === 'truck' ? 2.75 : 2.1), -Math.max(0.16, sink / 2), 0], className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: there ? 1 : 0 }, children: sink > 0.08 ? <><small>陷下去</small>{Math.round(sink * 100)} cm</> : <>几乎不陷</> },
    { id: 'nCar', at: [X0 + x - 1, 3.2, 0], ax: 0.5, name: true, className: 'scene-name', children: `${CARS[car].name} · 20 吨` },
    { id: 'nPad', at: [X0 + PAD - 3.4, -0.5, 0], ax: 0.5, name: true, className: 'scene-name', children: '硬地面' },
    { id: 'nSoil', at: [X0 + X_SOIL + 0.4, -1.9, 0], ax: 0.5, name: true, className: 'scene-name', children: '软土（剖面）' },
    { id: 'rut', at: [X0 + X_SOIL - 3.1, -0.3, 0], ax: 1, className: 'scene-name -translate-y-1/2', style: { opacity: rut && rut.depth > 0.02 && !there ? 1 : 0 }, children: '刚才压出来的车辙' },
  ]
  return <LabStage labels={labels} target={TARGET} span={SPAN} view={VIEW}><Apparatus {...props} x={x} /></LabStage>
}
