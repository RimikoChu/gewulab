// 压强 · 第 7 课的三维场景：工地旁的风洞试验棚。左边是风洞，透明的试验段里架着一段机翼；右边吊着两张纸，头顶一根吹风管。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { paperGap, type solve7 } from './physics'
import { ST } from './hydro'
import { LabStage, Painted, mergeParts, type Label, type Part } from '@/lab-kit'

const X0 = ST.tunnel, Z0 = -3
const CY = 1.9                                           // 试验段中心的高度
const PX = 6.2                                           // 两张纸在风洞右边多远
const T_WING = new THREE.Vector3(X0 - 0.4, 1.55, Z0), T_PAPER = new THREE.Vector3(X0 + PX, 2.0, Z0)
const S_WING: [number, number] = [10.4, 5.2], S_PAPER: [number, number] = [4.6, 3.6]
const VIEW: [number, number] = [0.14, 0.1]

interface SceneProps { mode: 'paper' | 'wing'; v: number; r: ReturnType<typeof solve7> }

/** 试验棚和风洞的外壳 */
function Shed() {
  const geo = useMemo(() => {
    const P: Part[] = [], Y = '#e8b21e'
    // 棚子：四根柱、屋架、屋面、后墙
    for (const x of [-6.5, 9]) for (const z of [-3.2, 2.6]) P.push({ p: [x, 2.5, z + Z0 + 0.3], s: [0.18, 5, 0.18], c: '#56616b' })
    P.push({ p: [1.25, 5.1, Z0], s: [16.2, 0.16, 6.6], c: '#3c5964' }, { p: [1.25, 2.5, Z0 - 3.1], s: [15.5, 5, 0.1], c: '#c9cdd0' }, { p: [1.25, 0.03, Z0], s: [16, 0.06, 6.2], c: '#b7b5ab' })
    // 风洞：进风的大喇叭口、风机段、收缩段、试验段的钢框和支架
    P.push({ p: [-5.2, CY, Z0], s: [1.25, 0.8, 1.25], c: '#d8d4c8', cyl: true, r: [0, 0, Math.PI / 2] }, { p: [-4.3, CY, Z0], s: [1.05, 1.0, 1.05], c: '#3f5a66', cyl: true, r: [0, 0, Math.PI / 2] })
    P.push({ p: [-3.3, CY, Z0], s: [0.95, 1.0, 0.95], c: '#d8d4c8', cyl: true, r: [0, 0, Math.PI / 2] })
    for (const x of [-2.75, 3.25]) P.push({ p: [x, CY, Z0], s: [0.12, 1.9, 1.9], c: '#59626b' })
    for (const y of [CY - 0.9, CY + 0.9]) for (const z of [-0.9, 0.9]) P.push({ p: [0.25, y, Z0 + z], s: [6, 0.08, 0.08], c: '#59626b' })
    for (const x of [-4.8, -3, -1.5, 2]) P.push({ p: [x, (CY - 0.95) / 2, Z0], s: [0.14, CY - 0.95, 1.2], c: Y })
    P.push({ p: [4.3, CY, Z0], s: [0.9, 2, 0.9], c: '#d8d4c8', cyl: true, r: [0, 0, Math.PI / 2] })
    // 右边吊纸的架子和朝下的吹风管
    P.push({ p: [PX, 3.3, Z0 - 0.6], s: [1.6, 0.08, 0.08], c: '#59626b' }, { p: [PX - 0.8, 1.65, Z0 - 0.6], s: [0.08, 3.3, 0.08], c: '#59626b' }, { p: [PX + 0.8, 1.65, Z0 - 0.6], s: [0.08, 3.3, 0.08], c: '#59626b' })
    P.push({ p: [PX, 3.3, Z0 - 0.3], s: [0.06, 0.06, 0.6], c: '#59626b' }, { p: [PX, 3.55, Z0], s: [0.11, 0.7, 0.11], c: '#3f5a66', cyl: true }, { p: [PX, 3.16, Z0], s: [0.07, 0.14, 0.07], c: '#22262a', cyl: true })
    return mergeParts(P)
  }, [])
  return <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.65} metal={0.3} /></mesh>
}

/** 风机的叶片：风越大转得越快 */
function Fan({ v }: { v: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.x += dt * v * 0.9 })
  return (
    <group ref={ref} position={[-5.62, CY, Z0]}>
      {[0, 1, 2, 3, 4].map(i => <mesh key={i} rotation-x={i * Math.PI * 0.4}><boxGeometry args={[0.04, 2.3, 0.34]} /><meshStandardMaterial color="#22262a" metalness={0.5} roughness={0.5} /></mesh>)}
      <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.22, 0.22, 0.2, 20]} /><meshStandardMaterial color="#e8b21e" metalness={0.4} roughness={0.5} /></mesh>
    </group>
  )
}

/** 气流里的烟迹：一串小点顺着风走。机翼上方的走得快、还要绕过拱起的翼面；下方的走得慢 */
function Smoke({ v, lift }: { v: number; lift: number }) {
  const N = 84, ref = useRef<THREE.InstancedMesh>(null), m = useMemo(() => new THREE.Matrix4(), []), ph = useRef(new Float32Array(N).map((_, i) => (i * 0.618) % 1))
  useFrame((_, dt) => {
    if (!ref.current) return
    for (let i = 0; i < N; i++) {
      const lane = i % 6, upper = lane < 3, k = upper ? 1.25 : 0.95
      ph.current[i] = (ph.current[i] + dt * v * k / 6) % 1
      const x = -2.6 + ph.current[i] * 5.7, off = (lane % 3) * 0.2 + 0.14
      const bump = Math.exp(-((x - 0.1) ** 2) / 0.7)
      const y = CY + lift + (upper ? off + bump * (0.3 - (lane % 3) * 0.07) : -off - bump * 0.05)
      const s = v > 0.5 ? 1 : 0
      m.makeScale(s * (1.3 + (upper ? bump * 0.9 : 0)), s * 0.7, s * 0.7).setPosition(X0 + x, y, Z0 + ((i * 7) % 5 - 2) * 0.12); ref.current.setMatrixAt(i, m)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}><sphereGeometry args={[0.028, 8, 6]} /><meshBasicMaterial color="#f4f8fb" transparent opacity={0.85} toneMapped={false} /></instancedMesh>
}

function Apparatus({ mode, v, lift }: SceneProps & { lift: number }) {
  // 机翼剖面：上表面拱起，下表面较平
  const wing = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-0.85, 0); s.bezierCurveTo(-0.85, 0.3, -0.2, 0.36, 0.2, 0.26); s.bezierCurveTo(0.6, 0.16, 0.9, 0.04, 0.95, 0); s.bezierCurveTo(0.5, -0.05, -0.5, -0.1, -0.85, 0)
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 24 }); g.translate(0, 0, -0.65)
    return g
  }, [])
  const a = Math.min(0.2, 0.00023 * v * v) * (mode === 'paper' ? 1 : 0)
  return (
    <group>
      <group position={[X0, 0, 0]}>
        <Shed />
        <Fan v={mode === 'wing' ? v : 0} />
        {/* 试验段的透明罩 */}
        <mesh position={[0.25, CY, Z0]} renderOrder={5}><boxGeometry args={[6, 1.8, 1.8]} /><meshPhysicalMaterial color="#e8f6fb" transparent opacity={0.1} roughness={0.05} envMapIntensity={1.4} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        {/* 机翼：架在一根立杆上，升力够大时被托起来一点 */}
        <mesh position={[0.1, (CY - 0.95) / 2 + 0.2, Z0]} castShadow><cylinderGeometry args={[0.035, 0.035, CY + lift * 2 - 0.6, 12]} /><meshStandardMaterial color="#8d949c" metalness={0.8} roughness={0.4} /></mesh>
        <mesh geometry={wing} position={[0.1, CY + lift - 0.08, Z0]} castShadow><meshStandardMaterial color="#d9651e" metalness={0.3} roughness={0.4} envMapIntensity={1.1} /></mesh>
        {/* 两张纸：上端夹住，下端自由；往中间吹气，它们向中间靠 */}
        {[-1, 1].map(s => <group key={s} position={[PX + s * 0.25, 3.1, Z0]} rotation-z={s * a}>
          <mesh position={[0, -0.6, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[0.8, 1.2]} /><meshStandardMaterial color="#fbfaf5" roughness={0.9} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 0, 0]}><boxGeometry args={[0.05, 0.06, 0.84]} /><meshStandardMaterial color="#30353b" /></mesh>
        </group>)}
      </group>
      {mode === 'wing' && <Smoke v={v} lift={lift} />}
      {mode === 'paper' && v > 0.5 && [0, 1, 2, 3, 4].map(i => <Puff key={i} i={i} v={v} />)}
    </group>
  )
}
/** 吹风管里往下吹出的一小股气 */
function Puff({ i, v }: { i: number; v: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (ref.current) { const t = (clock.elapsedTime * v * 0.12 + i / 5) % 1; ref.current.position.set(X0 + PX, 3.05 - t * 1.3, Z0); ref.current.scale.setScalar(0.6 + t) } })
  return <mesh ref={ref}><sphereGeometry args={[0.035, 8, 6]} /><meshBasicMaterial color="#f4f8fb" transparent opacity={0.8} toneMapped={false} /></mesh>
}

export default function Scene7(props: SceneProps) {
  const { mode, v, r } = props
  const lift = mode === 'wing' && r.up ? 0.22 : 0
  const gap = paperGap(mode === 'paper' ? v : 0)
  const labels: Label[] = mode === 'wing' ? [
    { id: 'top', at: [X0 + 0.1, CY + lift + 0.75, Z0], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: v > 0.5 ? 1 : 0 }, children: <><small>上表面 比周围低</small>{r.top.toFixed(0)} Pa</> },
    { id: 'bot', at: [X0 + 0.1, CY + lift - 0.62, Z0], ax: 0.5, className: 'scene-tag transition-opacity', style: { opacity: v > 0.5 ? 1 : 0 }, children: <><small>下表面 比周围高</small>{r.bot.toFixed(0)} Pa</> },
    { id: 'v', at: [X0 - 4.3, CY + 1.3, Z0], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>风速</small>{v.toFixed(0)} m/s</> },
    { id: 'nFan', at: [X0 - 5.2, CY - 1.5, Z0], ax: 0.5, name: true, className: 'scene-name', children: '风机' },
    { id: 'nWing', at: [X0 + 1.5, CY + lift - 0.1, Z0], name: true, className: 'scene-name -translate-y-1/2', children: '机翼模型 · 重 400 N' },
  ] : [
    { id: 'gap', at: [X0 + PX, 1.72, Z0], ax: 0.5, className: 'scene-tag key', children: <><small>下端相距</small>{Math.round(gap * 100)} cm</> },
    { id: 'nPipe', at: [X0 + PX + 0.2, 3.6, Z0], name: true, className: 'scene-name -translate-y-1/2', children: '吹风管：往两张纸中间吹' },
  ]
  return <LabStage labels={labels} target={mode === 'wing' ? T_WING : T_PAPER} span={mode === 'wing' ? S_WING : S_PAPER} view={VIEW}><Apparatus {...props} lift={lift} /></LabStage>
}
