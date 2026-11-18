// 第 5 课的三维场景：木箱、冰块、压载箱、钢锭直接放进试验水池，自己上浮、下沉或停住。
// 码头环境和通用器材在 dock.tsx。物体的位置由 lesson5 里的运动计算驱动。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { FLOATERS, G, LIQUIDS, POOL, TANK5, TOP5, kN, wet5, type FloaterKey, type LiquidKey } from './physics'
import { BRIM, Crane, DockStage, ForceArrow, HALF, Hoist, Painted, Pool, Water, YELLOW, mergeParts, useLiftDrag, type Label, type Part } from './dock'

const TARGET = new THREE.Vector3(0.3, 3.6, 0)
const SPAN: [number, number] = [8.4, 9.6]
const AX = 0.3, AZ = 0.75, ARROW = 1.5
const C_G = '#ff8a5c', C_B = '#35c7b3'
const RANGE = TOP5 - (POOL.floor - POOL.brim)

/** 木箱：四面钉着横条 */
function Crate() {
  const slats = useMemo(() => {
    const P: Part[] = [], c = '#8a5a30'
    for (const y of [-0.34, 0, 0.34]) for (const s of [-1, 1]) { P.push({ p: [0, y, s * 0.505], s: [1.02, 0.12, 0.03], c }); P.push({ p: [s * 0.505, y, 0], s: [0.03, 0.12, 1.02], c }) }
    for (const x of [-0.46, 0.46]) for (const z of [-0.46, 0.46]) P.push({ p: [x, 0, z], s: [0.1, 1.02, 0.1], c })
    return mergeParts(P)
  }, [])
  return <><RoundedBox args={[1, 1, 1]} radius={0.015} castShadow><meshStandardMaterial color="#b98650" roughness={0.85} /></RoundedBox><mesh geometry={slats} castShadow><Painted rough={0.9} metal={0} /></mesh></>
}
/** 压载箱：黄色钢箱，正面有一条观察窗，能看到里面装了多少水 */
function Ballast({ fill }: { fill: number }) {
  return (
    <>
      <RoundedBox args={[1, 1, 1]} radius={0.02} castShadow><meshStandardMaterial color={YELLOW} metalness={0.4} roughness={0.5} /></RoundedBox>
      {[-1, 1].map(s => <mesh key={s} position={[0, s * 0.47, 0]}><boxGeometry args={[1.03, 0.06, 1.03]} /><meshStandardMaterial color="#3c4249" metalness={0.6} roughness={0.5} /></mesh>)}
      <mesh position={[0, 0, 0.503]}><planeGeometry args={[0.2, 0.8]} /><meshBasicMaterial color="#12181c" /></mesh>
      {fill > 0.005 && <mesh position={[0, -0.4 + fill * 0.4, 0.506]}><planeGeometry args={[0.16, fill * 0.8]} /><meshBasicMaterial color="#39b6e0" toneMapped={false} /></mesh>}
      <mesh position={[0.28, 0.5, 0.2]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.08, 16]} /><meshStandardMaterial color="#3c4249" metalness={0.7} roughness={0.4} /></mesh>
    </>
  )
}

interface SceneProps { obj: FloaterKey; mass: number; liquid: LiquidKey; b: number; moving: boolean; onMove: (b: number) => void; onEnd: () => void; dragHint?: boolean }

function Apparatus({ obj, mass, liquid, b, moving, onMove, onEnd }: SceneProps) {
  const rho = LIQUIDS[liquid].rho, w = wet5(b, rho)
  const grab = useLiftDrag(TOP5 - b, RANGE, v => onMove(TOP5 - v), TARGET, onEnd)
  const stir = useRef(0)
  useFrame((_, dt) => { stir.current = Math.min(1, Math.max(0, stir.current - dt * 0.5) + (moving && w.wet > 0.005 ? dt * 2.2 : 0)) })
  const mid = BRIM + b + 0.5, g = mass * G, k = ARROW / Math.max(g, rho * G)
  return (
    <group>
      <Pool spout={false} />
      <Crane />
      <Hoist y={7.3} reading="0.00" />
      <Water levelY={BRIM + w.level} color={LIQUIDS[liquid].color} stir={stir} />
      <group {...grab} position={[0, mid, 0]}>
        {obj === 'wood' && <Crate />}
        {obj === 'ice' && <RoundedBox args={[1, 1, 1]} radius={0.06} smoothness={4}><meshPhysicalMaterial color="#dff3fb" transparent opacity={0.78} roughness={0.12} envMapIntensity={1.6} clearcoat={1} /></RoundedBox>}
        {obj === 'tank' && <Ballast fill={(mass - TANK5.empty) / (TANK5.max - TANK5.empty)} />}
        {obj === 'steel' && <RoundedBox args={[1, 1, 1]} radius={0.025} castShadow><meshStandardMaterial color="#aeb6be" metalness={0.85} roughness={0.42} envMapIntensity={1.1} /></RoundedBox>}
        <mesh visible={false}><boxGeometry args={[1.4, 1.4, 1.4]} /></mesh>
      </group>
      {/* 两个力：重力向下，浮力向上，用同一把尺子画，一眼能比出谁大 */}
      <ForceArrow tip={[-AX, mid - g * k, AZ]} dir={[0, -1, 0]} len={g * k} color={C_G} />
      <ForceArrow tip={[AX, mid + w.fBuoy * k, AZ]} dir={[0, 1, 0]} len={w.fBuoy * k} color={C_B} />
    </group>
  )
}

export default function Scene5(props: SceneProps) {
  const { obj, mass, liquid, b } = props, rho = LIQUIDS[liquid].rho, w = wet5(b, rho)
  const mid = BRIM + b + 0.5, g = mass * G, k = ARROW / Math.max(g, rho * G)
  const labels: Label[] = [
    { id: 'fB', at: [AX + 0.2, mid + Math.max(0.15, w.fBuoy * k * 0.6), AZ], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: w.fBuoy > 5 ? 1 : 0 }, children: <><small>F浮</small>{kN(w.fBuoy)} kN</> },
    { id: 'fG', at: [-AX - 0.25, mid - Math.min(g * k, 1.2) * 0.7, AZ], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small style={{ color: '#d2542a' }}>G</small>{kN(g)} kN</> },
    { id: 'liq', at: [HALF + 0.35, BRIM - 0.1, HALF + 0.2], className: 'scene-tag -translate-y-1/2', children: <><small>池里是</small>{LIQUIDS[liquid].name}</> },
    { id: 'nItem', at: [0.7, mid + 0.75, 0], name: true, className: 'scene-name -translate-y-1/2', children: `${FLOATERS[obj].name} · 1 m³` },
    { id: 'drag', at: [-1.9, mid, 0.5], className: '', style: { display: props.dragHint ? undefined : 'none' }, children: <div className="drag-hint">↕ 按下去再松手</div> },
  ]
  return <DockStage labels={labels} target={TARGET} span={SPAN}><Apparatus {...props} /></DockStage>
}
