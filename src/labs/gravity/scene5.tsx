// 万有引力与航天 · 第 5 课的三维场景：牛顿的大炮。地球北极上立一座设想的高山（山顶 400 km，在大气层以上，示意），山顶的炮水平开炮；
// 每一炮的轨迹由 physics.ts 数值积分算出，按时间匀速放出来，打过的轨迹留在画面上。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LabStage, Metal, lathe, type Label } from '@/lab-kit'
import { PEAK, cannonPath, shotFate, type Shot } from './physics'
import { SPACE } from './views'
import { RE, ST, spinFacing, toScene, type Want } from './world'

/** 近看山顶（前两炮）和看整个地球（后两炮）两个机位 */
const NEAR_T = ST.earth.clone().add(new THREE.Vector3(2.4, RE + 0.2, 0)), NEAR_S: [number, number] = [12, 5.5]
const FAR_T = ST.earth.clone().add(new THREE.Vector3(0, 1.5, 0)), FAR_S: [number, number] = [RE * 3.4, RE * 2.6]
const VIEW: [number, number] = [0, 0.04]
export const FATE_COLOR = { fall: '#ffb347', orbit: '#7fe3d4', escape: '#ff7a7a' } as const
/** 每一炮放多久（秒） */
export const SHOT_SECONDS = { fall: 2.4, orbit: 7, escape: 6 } as const

function pathPts(v: Shot) { return cannonPath(v).map(([x, y]) => new THREE.Vector3(toScene(x), toScene(y), 0)) }

/** 一条轨迹：k 从 0 到 1 画出来；ball 为真时最前面带一颗炮弹 */
function Trail({ v, start, done }: { v: Shot; start: number; done: boolean }) {
  const pts = useMemo(() => pathPts(v), [v])
  const fate = shotFate(v), color = FATE_COLOR[fate]
  const RAD = 6
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length - 1, 0.07, RAD, false), [pts])
  const ball = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const k = done ? 1 : Math.min(1, (performance.now() - start) / 1000 / SHOT_SECONDS[fate])
    const n = Math.max(2, Math.round(k * (pts.length - 1)) + 1)
    geo.setDrawRange(0, (n - 1) * RAD * 6)
    if (ball.current) { ball.current.position.copy(pts[n - 1]); ball.current.visible = k < 1 || fate === 'orbit' }
  })
  return (
    <group>
      <mesh geometry={geo} raycast={() => null}><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      <mesh ref={ball}><sphereGeometry args={[0.13, 16, 12]} /><meshBasicMaterial color="#fff6d8" toneMapped={false} /></mesh>
    </group>
  )
}

/** 设想的高山和山顶的炮 */
function Mountain() {
  const h = toScene(PEAK)
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(1.5, h + 0.3, 48, 8)
    const p = g.attributes.position, v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x), k = (v.y + (h + 0.3) / 2) / (h + 0.3); const n = 1 + 0.12 * Math.sin(a * 5 + k * 7) + 0.06 * Math.sin(a * 13); p.setXYZ(i, v.x * n, v.y, v.z * n) }
    g.computeVertexNormals(); return g
  }, [h])
  const barrel = useMemo(() => lathe([[0.03, 0], [0.065, 0], [0.065, 0.06], [0.05, 0.08], [0.045, 0.55], [0.055, 0.56], [0.055, 0.6], [0.035, 0.6]], { segs: 24 }), [])
  return (
    <group>
      <mesh geometry={geo} position={[0, RE + (h + 0.3) / 2 - 0.3, 0]}><meshStandardMaterial color="#7a6f62" roughness={0.95} flatShading /></mesh>
      <mesh position={[0, RE + h - 0.08, 0]}><coneGeometry args={[0.32, 0.22, 24]} /><meshStandardMaterial color="#f2f4f6" roughness={0.7} /></mesh>
      {/* 炮：炮身朝 +x 水平 */}
      <group position={[0, RE + h + 0.02, 0]}>
        <mesh geometry={barrel} rotation-z={-Math.PI / 2} position={[-0.12, 0.08, 0]}><Metal kind="iron" grain="cast" /></mesh>
        {[1, -1].map(s => <mesh key={s} position={[-0.05, 0.05, s * 0.08]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.02, 16]} /><meshStandardMaterial color="#5a4632" roughness={0.8} /></mesh>)}
      </group>
    </group>
  )
}

export default function Scene5({ shots, wide }: { shots: { v: Shot; start: number; done: boolean }[]; wide: boolean }) {
  const E = ST.earth, h = toScene(PEAK)
  const labels: Label[] = [
    { id: 'nM', at: [E.x - 0.4, E.y + RE + h * 0.5, E.z], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '设想的高山：山顶在大气层以上（示意）' },
    ...shots.filter(s => s.done).slice(-1).map(s => { const p = cannonPath(s.v), [x, y] = p[Math.floor(p.length * (shotFate(s.v) === 'orbit' ? 0.5 : 0.999))]; return { id: `s${s.v}`, at: [E.x + toScene(x), E.y + toScene(y), E.z] as [number, number, number], ax: 0.5, className: 'scene-tag -translate-y-full', children: <>{(s.v / 1000).toFixed(1)} km/s</> } as Label }),
  ]
  const want: Want = { space: true, earthLight: true, spin: spinFacing(100, VIEW[0]) }
  return (
    <LabStage<Want> labels={labels} target={wide ? FAR_T : NEAR_T} span={wide ? FAR_S : NEAR_S} view={VIEW} {...SPACE} world={want}>
      <group position={E}>
        <Mountain />
        {shots.map(s => <Trail key={s.v} v={s.v} start={s.start} done={s.done} />)}
      </group>
    </LabStage>
  )
}
