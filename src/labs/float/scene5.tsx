// 第 5 课的三维场景：港池水面。木箱、冰块、压载箱、钢锭直接放进水里，自己上浮、下沉或停住。
// 水朝镜头的这一面是剖开的，能同时看到水上和水下。
// 码头环境和通用器材在 dock.tsx。物体的位置由 lesson5 里的运动计算驱动。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { FLOATERS, G, LIQUIDS, SEA5, TANK5, kN, wet5, type FloaterKey, type LiquidKey } from './physics'
import { DockStage, ForceArrow, OpenSea, Painted, QUAY_X, SEA_Y, YELLOW, mergeParts, useLiftDrag, type Label, type Part } from './dock'

const SX = 31.6, SZ = 81.6              // 物体的位置：离岸壁 5.5 m，离剖面 1.6 m
const CUT = 80                          // 剖面：镜头在它南边，朝北看
const BRIM = SEA_Y, BED = SEA_Y - SEA5.depth, TOP5 = SEA5.top
const WALL = SX - QUAY_X                // 岸壁在物体右边多远
const TARGET = new THREE.Vector3(SX + 0.2, SEA_Y - 0.9, SZ)
const SPAN: [number, number] = [8.6, 8.6]
const VIEW: [number, number] = [Math.PI - 0.3, 0.2]
const SEA_COLOR: Record<LiquidKey, string> = { fresh: '#1f7f9c', sea: '#1b8a78' }
const AX = 0.3, AZ = 0.75, ARROW = 1.5
const C_G = '#ff8a5c', C_B = '#35c7b3'
const RANGE = SEA5.top + SEA5.depth

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

/** 岸壁上的东西：防撞胶条、爬梯、系船柱，岸壁上的水尺 */
function Harbor() {
  const geo = useMemo(() => {
    const P: Part[] = []
    for (let i = -2; i <= 6; i++) P.push({ p: [WALL - 0.14, -0.9, -1.2 - i * 2.2], s: [0.22, 1.5, 0.34], c: '#1f2327' })
    for (const z of [-0.2, 0.3]) P.push({ p: [WALL - 0.1, (BED - 0.2) / 2 + 0.2, z - 0.4], s: [0.05, -BED + 0.4, 0.05], c: '#c9ced3' })
    for (let k = 0; k < 13; k++) P.push({ p: [WALL - 0.1, 0.1 - k * 0.36, -0.35], s: [0.04, 0.04, 0.5], c: '#c9ced3' })
    P.push({ p: [WALL + 0.35, 0.12, -8], s: [0.3, 0.24, 30], c: YELLOW })
    return mergeParts(P)
  }, [])
  return <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.8} metal={0.1} /></mesh>
}
/** 漂在水上的东西：靠岸的浮码头和工作艇、远一点的航标 */
function Floats() {
  const geo = useMemo(() => {
    const P: Part[] = [], y = SEA_Y
    // 浮码头：贴着岸壁
    P.push({ p: [WALL - 1.9, y + 0.1, -13.5], s: [3, 0.7, 6], c: '#6d757c' }, { p: [WALL - 1.9, y + 0.47, -13.5], s: [3.06, 0.06, 6.06], c: '#8a6a45' })
    for (const z of [-11, -16]) P.push({ p: [WALL - 3.2, y + 0.65, z], s: [0.1, 0.36, 0.1], c: '#2b2f33', cyl: true })
    for (const z of [-11.6, -13.5, -15.4]) P.push({ p: [WALL - 3.45, y + 0.1, z], s: [0.32, 0.16, 0.32], c: '#15181b', cyl: true, r: [0, 0, Math.PI / 2] })
    // 上岸的斜梯
    P.push({ p: [WALL - 0.9, y + 1.25, -15.7], s: [2.4, 0.08, 0.9], c: '#9aa3ad', r: [0, 0, 0.72] })
    // 工作艇：系在浮码头外侧
    P.push({ p: [WALL - 5.3, y + 0.25, -13.6], s: [1.9, 0.9, 5.2], c: '#d8d4c8' }, { p: [WALL - 5.3, y - 0.05, -13.6], s: [1.92, 0.34, 5.22], c: '#7c2f26' })
    P.push({ p: [WALL - 5.3, y + 1.25, -14.6], s: [1.5, 1.2, 1.8], c: '#22354a' }, { p: [WALL - 5.3, y + 1.9, -14.6], s: [1.7, 0.1, 2.0], c: '#e9e6dc' }, { p: [WALL - 5.3, y + 0.74, -13.6], s: [1.96, 0.1, 5.26], c: '#e8b21e' })
    // 航标：红的近，绿的远
    for (const [x, z, c] of [[-3.4, -7.5, '#c8372d'], [-9, -22, '#2f8f5a']] as const) {
      P.push({ p: [x, y + 0.15, z], s: [0.75, 0.6, 0.75], c, cyl: true }, { p: [x, y + 1.3, z], s: [0.06, 1.8, 0.06], c: '#2b2f33', cyl: true }, { p: [x, y + 2.25, z], s: [0.22, 0.34, 0.22], c, cyl: true })
    }
    return mergeParts(P)
  }, [])
  return <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.7} metal={0.15} /></mesh>
}

interface SceneProps { obj: FloaterKey; mass: number; liquid: LiquidKey; b: number; moving: boolean; onMove: (b: number) => void; onEnd: () => void; dragHint?: boolean }

function Apparatus({ obj, mass, liquid, b, moving, onMove, onEnd }: SceneProps) {
  const rho = LIQUIDS[liquid].rho, w = wet5(b, rho)
  const grab = useLiftDrag(TOP5 - b, RANGE, v => onMove(TOP5 - v), TARGET, onEnd)
  const ring = useRef<THREE.Mesh>(null), bob = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ring.current) { const k = (clock.elapsedTime * 0.6) % 1; ring.current.scale.setScalar(0.7 + k * 1.2); (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - k) }
    if (bob.current) { bob.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.03; bob.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.012 }
  })
  const mid = BRIM + b + 0.5, g = mass * G, k = ARROW / Math.max(g, rho * G)
  return (
    <><OpenSea depth={SEA5.depth} cut={CUT} dir={-1} color={SEA_COLOR[liquid]} tint={0.4} />
    {/* 这一组转了半圈：+z 朝镜头，+x 朝岸壁 */}
    <group position={[SX, 0, SZ]} rotation-y={Math.PI}>
      <Harbor />
      <group ref={bob}><Floats /></group>
      {moving && w.wet > 0.02 && w.wet < 0.98 && <mesh ref={ring} position={[0, BRIM + 0.02, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.8, 0.93, 48]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} /></mesh>}
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
    </group></>
  )
}

export default function Scene5(props: SceneProps) {
  const { obj, mass, liquid, b } = props, rho = LIQUIDS[liquid].rho, w = wet5(b, rho)
  const mid = BRIM + b + 0.5, g = mass * G, k = ARROW / Math.max(g, rho * G)
  const at = (x: number, y: number, z: number): [number, number, number] => [SX - x, y, SZ - z]   // 器材那一组转了半圈
  const labels: Label[] = [
    { id: 'fB', at: at(AX + 0.2, mid + Math.max(0.15, w.fBuoy * k * 0.6), AZ), className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: w.fBuoy > 5 ? 1 : 0 }, children: <><small>F浮</small>{kN(w.fBuoy)} kN</> },
    { id: 'fG', at: at(-AX - 0.25, mid - Math.min(g * k, 1.2) * 0.7, AZ), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small style={{ color: '#d2542a' }}>G</small>{kN(g)} kN</> },
    { id: 'liq', at: at(-4.2, BRIM - 0.45, 1.6), ax: 0.5, className: 'scene-tag -translate-y-1/2', children: <><small>这里是</small>{LIQUIDS[liquid].name}</> },
    { id: 'nItem', at: at(0.7, mid + 0.75, 0), name: true, className: 'scene-name -translate-y-1/2', children: `${FLOATERS[obj].name} · 1 m³` },
    { id: 'nBed', at: at(-2.6, BED + 0.3, 1.6), name: true, className: 'scene-name', children: `港池 · 水深 ${SEA5.depth} m` },
    { id: 'drag', at: at(-1.9, mid, 0.5), className: '', style: { display: props.dragHint ? undefined : 'none' }, children: <div className="drag-hint">↕ 按下去再松手</div> },
  ]
  return <DockStage labels={labels} target={TARGET} span={SPAN} view={VIEW} sea={false}><Apparatus {...props} /></DockStage>
}
