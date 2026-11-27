// 万有引力与航天 · 第 6 课的三维场景：地球和赤道面上的三条圆轨道（近地、中圆、同步），半径之比真实；卫星画大了（示意），按真实周期之比转。
// 镜头推近到中圆轨道，同步轨道一部分出画；左下角一个放大小窗，看选中轨道上那颗卫星的样子。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LabStage, type Label } from '@/lab-kit'
import { Satellite } from './craft'
import { OrbitBand } from './earth'
import { Circle } from './orbiter'
import { DAY, ORBITS, circT, height, km, type OrbitKey } from './physics'
import { SPACE } from './views'
import { RE, SIM, ST, phaseFacing, spinFacing, toScene, type Want } from './world'

const TARGET = ST.earth.clone().add(new THREE.Vector3(0, -4, 0))
const SPAN: [number, number] = [toScene(ORBITS.meo.r) * 2.15, toScene(ORBITS.meo.r) * 1.05]
const VIEW: [number, number] = [0.5, 0.36]
/** 放大小窗的位置：画面左下方，离镜头近一些 */
const RIGHT = new THREE.Vector3(Math.cos(VIEW[0]), 0, -Math.sin(VIEW[0])), TOCAM = new THREE.Vector3(Math.sin(VIEW[0]) * Math.cos(VIEW[1]), Math.sin(VIEW[1]), Math.cos(VIEW[0]) * Math.cos(VIEW[1]))
const WIN = new THREE.Vector3().addScaledVector(RIGHT, -27).addScaledVector(TOCAM, 34).add(new THREE.Vector3(0, -19, 0))
const WIN_R = 9.5

/** 放大小窗：一个对着镜头的圆框，里面是选中那颗卫星的放大模型（慢慢转），一根细线连到轨道上那颗卫星 */
function Magnifier({ track, color }: { track: { current: THREE.Vector3 }; color: string }) {
  const frame = useRef<THREE.Group>(null), spin = useRef<THREE.Group>(null)
  const line = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }, dt) => {
    if (frame.current) frame.current.quaternion.copy(camera.quaternion)
    if (spin.current) spin.current.rotation.y += dt * 0.35
    const toSat = tmp.copy(track.current).sub(WIN), d = toSat.length()
    const a = WIN.clone().addScaledVector(toSat, WIN_R / Math.max(d, 1e-3))
    const p = line.attributes.position as THREE.BufferAttribute
    p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, track.current.x, track.current.y, track.current.z); p.needsUpdate = true
  })
  return (
    <group>
      <group position={WIN} ref={frame}>
        <mesh position={[0, 0, -9]} renderOrder={-1}><circleGeometry args={[WIN_R, 64]} /><meshBasicMaterial color="#05080f" transparent opacity={0.78} depthWrite={false} toneMapped={false} /></mesh>
        <mesh position={[0, 0, -9]}><ringGeometry args={[WIN_R, WIN_R + 0.25, 96]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      </group>
      <group position={WIN.clone().add(new THREE.Vector3(0, -0.5, 0))}>
        <group ref={spin} rotation-x={0.35}><group scale={0.9}><Satellite /></group></group>
      </group>
      <line>
        <primitive object={line} attach="geometry" />
        <lineBasicMaterial color={color} transparent opacity={0.8} toneMapped={false} />
      </line>
    </group>
  )
}
const KEYS = Object.keys(ORBITS) as OrbitKey[]
const COLOR: Record<OrbitKey, string> = { leo: '#7fe3d4', meo: '#9ec5ff', geo: '#ffd27a' }
const SPIN0 = spinFacing(110, VIEW[0])
/** 同步卫星起始时在东经 110° 的赤道上空 */
const GEO_PHASE = phaseFacing(VIEW[0])

export default function Scene6({ focus }: { focus: OrbitKey }) {
  const E = ST.earth
  const track = useRef(new THREE.Vector3())
  const labels: Label[] = KEYS.map(k => {
    const r = toScene(ORBITS[k].r), a = VIEW[0] + Math.PI + (k === 'leo' ? 0.9 : 0.45)
    return { id: k, at: [E.x + Math.sin(a) * r, E.y + 0.6, E.z + Math.cos(a) * r] as [number, number, number], ax: 0.5, className: k === focus ? 'scene-tag key -translate-y-full' : 'scene-name -translate-y-full', children: k === focus ? <><small>{ORBITS[k].name}</small>离地 {Math.round(km(height(ORBITS[k].r))).toLocaleString()} km</> : ORBITS[k].name }
  })
  labels.push({ id: 'win', at: [E.x + WIN.x, E.y + WIN.y + WIN_R + 0.6, E.z + WIN.z], ax: 0.5, className: 'scene-name -translate-y-full', children: `${ORBITS[focus].name}上的卫星 · 放大看（示意）` })
  const want: Want = { space: true, earthLight: true, spin: SPIN0, spinRate: 2 * Math.PI / DAY * SIM }
  return (
    <LabStage<Want> labels={labels} target={TARGET} span={SPAN} view={VIEW} {...SPACE} world={want}>
      <group position={E}>
        {KEYS.map(k => <OrbitBand key={k} a={toScene(ORBITS[k].r)} color={COLOR[k]} opacity={k === focus ? 1 : 0.4} width={k === focus ? 0.9 : 0.5} />)}
        {KEYS.map((k, i) => (
          <Circle key={k} r={toScene(ORBITS[k].r)} T={circT(ORBITS[k].r)} phase={k === 'geo' ? GEO_PHASE : 1.2 + i * 2.1} at={k === focus ? a => track.current.set(Math.cos(a) * toScene(ORBITS[k].r), 0, -Math.sin(a) * toScene(ORBITS[k].r)) : undefined}>
            <group scale={k === 'leo' ? 0.3 : 0.75}><Satellite wings={k === 'meo' ? 2 : 3} /></group>
          </Circle>
        ))}
        {/* 赤道上的一点：和同步卫星一起转，卫星始终在它正上方 */}
        <Circle r={RE * 1.004} T={DAY} phase={GEO_PHASE}>
          <mesh rotation-z={-Math.PI / 2}><coneGeometry args={[0.35, 0.8, 16]} /><meshBasicMaterial color="#ffd27a" toneMapped={false} /></mesh>
        </Circle>
        <Magnifier track={track} color={COLOR[focus]} />
        {focus === 'geo' && <Circle r={0} T={DAY} phase={GEO_PHASE}>
          <mesh position={[(RE + toScene(ORBITS.geo.r)) / 2, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.06, 0.06, toScene(ORBITS.geo.r) - RE, 6]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0.55} toneMapped={false} /></mesh>
        </Circle>}
      </group>
    </LabStage>
  )
}
