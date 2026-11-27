// 化验台上的器材：玻璃件（试管、量筒、水槽、洗气瓶、滴液漏斗）都有壁厚，液体有颜色和液面；铁架台、台灯、小钢瓶、试管架、振荡器。单位 m。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, bolts, disc, lathe, shell, type RY } from '@/lab-kit'
import { makeSign } from './mats'
import { pipeGeo, type V3 } from './parts'

/** 玻璃：薄、透明、有高光。容器里还要画液体，所以不写深度 */
export const GlassMat = ({ tint = '#7fa3ab', o = 0.12 }: { tint?: string; o?: number }) => <meshPhysicalMaterial color={tint} transparent opacity={o} roughness={0.05} envMapIntensity={0.9} depthWrite={false} side={THREE.DoubleSide} />
/** 液体：有颜色、表面光亮。o 是不透明度 */
export const LiquidMat = ({ color, o = 0.8 }: { color: THREE.ColorRepresentation; o?: number }) => <meshBasicMaterial color={color} transparent opacity={o} depthWrite={o > 0.6} toneMapped={false} />

/** 圆底的一段液柱：半径 r，底在 y0（圆底），液面在 y1 */
export function column(r: number, y0: number, y1: number, round = true): THREE.BufferGeometry {
  const p: RY[] = round ? [[0, y0], ...Array.from({ length: 8 }, (_, i) => { const a = (i + 1) / 8 * Math.PI / 2; return [r * Math.sin(a), y0 + r - r * Math.cos(a)] as RY }), [r, Math.max(y1, y0 + r)], [0, Math.max(y1, y0 + r)]] : [[0, y0], [r, y0], [r, y1], [0, y1]]
  return lathe(p, { segs: 28 })
}
/** 试管：半径 r、长 h，圆底，管口有一圈卷边。原点在管底 */
export function Tube({ r = 0.012, h = 0.15, children }: { r?: number; h?: number; children?: ReactNode }) {
  const g = useMemo(() => shell([[0, 0], ...Array.from({ length: 8 }, (_, i) => { const a = (i + 1) / 8 * Math.PI / 2; return [r * Math.sin(a), r - r * Math.cos(a)] as RY }), [r, h - 0.004], [r * 1.12, h]], r * 0.09, { segs: 32 }), [r, h])
  return <group>{children}<mesh geometry={g} renderOrder={6}><GlassMat o={0.16} /></mesh></group>
}
/** 铁架台：底座、立杆、十字夹和一只夹子。夹子伸向 +x，夹口中心在 (reach, y, 0) */
export function Stand({ y = 0.3, reach = 0.12, h = 0.6, clamp = 0.02 }: { y?: number; reach?: number; h?: number; clamp?: number }) {
  return <group>
    <RoundedBox args={[0.16, 0.014, 0.26]} radius={0.004} position={[0.02, 0.007, 0]} castShadow receiveShadow><meshStandardMaterial color="#2c3034" roughness={0.6} metalness={0.5} /></RoundedBox>
    <mesh position={[0, h / 2, -0.09]} castShadow><cylinderGeometry args={[0.006, 0.006, h, 16]} /><Metal kind="chrome" rough={0.2} /></mesh>
    <group position={[0, y, -0.09]}>
      <mesh castShadow><boxGeometry args={[0.026, 0.026, 0.026]} /><Metal kind="aluminum" grain="cast" /></mesh>
      <mesh position={[0.016, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.006, 0.006, 0.02, 12]} /><Metal kind="steel" /></mesh>
      <mesh position={[reach / 2, 0, 0.045]} rotation={[0, Math.atan2(-0.09, reach), Math.PI / 2]} castShadow><cylinderGeometry args={[0.004, 0.004, Math.hypot(reach, 0.09) - clamp, 12]} /><Metal kind="chrome" rough={0.25} /></mesh>
      {[1, -1].map(s => <mesh key={s} position={[reach, 0, 0.09 + s * (clamp + 0.004)]} castShadow><boxGeometry args={[0.03, 0.014, 0.006]} /><meshStandardMaterial color="#3a3d40" roughness={0.7} /></mesh>)}
      <mesh position={[reach - 0.018, 0, 0.09]} castShadow><boxGeometry args={[0.008, 0.014, clamp * 2 + 0.014]} /><Metal kind="aluminum" grain="cast" /></mesh>
    </group>
  </group>
}
/** 台灯：底座、弯臂、灯头。灯头朝 +x 偏下照。on 时灯头发亮，照出一束光 */
export function Lamp({ on }: { on: boolean }) {
  const arm = useMemo(() => pipeGeo([[0, 0.02, 0], [0, 0.3, 0], [0.05, 0.4, 0], [0.13, 0.4, 0]], 0.006, 0.05, 10), [])
  const beam = useRef<THREE.Mesh>(null)
  useFrame((_, d) => { const m = beam.current?.material as THREE.MeshBasicMaterial | undefined; if (m) m.opacity += ((on ? 0.13 : 0) - m.opacity) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.15)) })
  return <group>
    <mesh position-y={0.01} castShadow receiveShadow><cylinderGeometry args={[0.06, 0.065, 0.02, 32]} /><meshStandardMaterial color="#2a2d31" roughness={0.5} metalness={0.4} /></mesh>
    <mesh geometry={arm} castShadow><Metal kind="chrome" rough={0.2} /></mesh>
    <group position={[0.15, 0.39, 0]} rotation-z={1.05}>
      <mesh castShadow><cylinderGeometry args={[0.022, 0.045, 0.07, 28, 1, true]} /><meshStandardMaterial color="#d8dadc" roughness={0.4} metalness={0.6} side={THREE.DoubleSide} /></mesh>
      <mesh position-y={-0.02}><sphereGeometry args={[0.02, 20, 14]} /><meshStandardMaterial color="#fff6dc" emissive="#fff0c0" emissiveIntensity={on ? 3 : 0} /></mesh>
      <mesh ref={beam} position-y={-0.2}><cylinderGeometry args={[0.04, 0.12, 0.34, 28, 1, true]} /><meshBasicMaterial color="#fff3c8" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} /></mesh>
      {on && <pointLight position-y={-0.08} intensity={0.5} distance={0.9} decay={2} color="#fff0c8" />}
    </group>
  </group>
}
/** 小钢瓶：瓶身、瓶肩、瓶阀、减压阀（两只表）、瓶身上的字 */
export function GasBottle({ color, name, text = '#ffffff' }: { color: string; name: string; text?: string }) {
  const g = useMemo(() => lathe([[0, 0.004], [0.042, 0], [0.05, 0.008], [0.05, 0.33], [0.04, 0.37], [0.02, 0.4], [0.016, 0.42], [0, 0.42]], { segs: 36 }), [])
  const sign = useMemo(() => makeSign([name], color, text, 256, 128), [name, color, text])
  return <group>
    <mesh geometry={g} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={0.4} metalness={0.3} clearcoat={0.5} /></mesh>
    <mesh position={[0, 0.2, 0.0505]}><planeGeometry args={[0.07, 0.035]} /><meshStandardMaterial map={sign} roughness={0.5} /></mesh>
    <mesh position-y={0.44} castShadow><cylinderGeometry args={[0.012, 0.014, 0.04, 6]} /><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={[0.03, 0.445, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.009, 0.009, 0.05, 12]} /><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={[0.06, 0.445, 0]} castShadow><boxGeometry args={[0.03, 0.03, 0.03]} /><Metal kind="brass" /></mesh>
    {[0.013, -0.013].map((z, i) => <group key={i} position={[0.06 + (i ? 0 : 0.0), 0.475 + i * 0.0, z * 2.2]}>
      <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.019, 0.019, 0.012, 24]} /><Metal kind="chrome" rough={0.2} /></mesh>
      <mesh position-z={z > 0 ? 0.0065 : -0.0065} rotation-y={z > 0 ? 0 : Math.PI}><circleGeometry args={[0.016, 24]} /><meshStandardMaterial color="#f4f3ee" roughness={0.4} /></mesh>
    </group>)}
    <mesh position-y={0.458} castShadow><cylinderGeometry args={[0.02, 0.02, 0.008, 10]} /><meshStandardMaterial color="#1f2124" roughness={0.6} /></mesh>
  </group>
}
/** 洗气瓶：广口瓶、橡胶塞、长进短出两根玻璃管，瓶里是有颜色的溶液。原点在瓶底。bubbling 时进气管口冒泡 */
export function WashBottle({ color, bubbling, level = 0.085 }: { color: THREE.ColorRepresentation; bubbling: boolean; level?: number }) {
  const g = useMemo(() => ({
    body: shell([[0, 0], [0.036, 0], [0.04, 0.004], [0.04, 0.105], [0.022, 0.128], [0.022, 0.15], [0.025, 0.152]], 0.0025, { segs: 40 }),
    liq: lathe([[0, 0.003], [0.0365, 0.003], [0.0372, 0.006], [0.0372, level], [0, level]], { segs: 36 }),
    tin: pipeGeo([[-0.05, 0.19, 0], [-0.008, 0.19, 0], [-0.008, 0.016, 0]], 0.0032, 0.012, 10), tout: pipeGeo([[0.008, 0.13, 0], [0.008, 0.19, 0], [0.05, 0.19, 0]], 0.0032, 0.012, 10),
    stopper: lathe([[0, 0.14], [0.018, 0.14], [0.022, 0.165], [0, 0.165]], { segs: 28 }),
  }), [level])
  const bub = useRef<THREE.InstancedMesh>(null), tmp = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const m = bub.current; if (!m) return
    m.visible = bubbling; if (!bubbling) return
    for (let i = 0; i < 10; i++) { const u = (clock.elapsedTime * 0.9 + i / 10) % 1, y = 0.016 + u * (level - 0.02); tmp.position.set(-0.008 + Math.sin(i * 2.4 + u * 7) * 0.008 * u, y, Math.cos(i * 1.7 + u * 5) * 0.008 * u); tmp.scale.setScalar(0.0022 + 0.0018 * ((i * 7) % 3) / 2 + u * 0.0012); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix) }
    m.instanceMatrix.needsUpdate = true
  })
  return <group>
    <mesh geometry={g.liq} renderOrder={2}><LiquidMat color={color} o={0.96} /></mesh>
    <instancedMesh ref={bub} args={[undefined, undefined, 10]} renderOrder={3} visible={false}><sphereGeometry args={[1, 10, 8]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.75} roughness={0.05} /></instancedMesh>
    <mesh geometry={g.stopper} castShadow><meshStandardMaterial color="#3a2f2a" roughness={0.85} /></mesh>
    <mesh geometry={g.tin} renderOrder={5}><GlassMat o={0.35} /></mesh><mesh geometry={g.tout} renderOrder={5}><GlassMat o={0.35} /></mesh>
    <mesh geometry={g.body} castShadow renderOrder={6}><GlassMat /></mesh>
  </group>
}
/** 橡胶管 */
export function Hose({ pts, r = 0.0045, color = '#b5562c' }: { pts: V3[]; r?: number; color?: string }) {
  const g = useMemo(() => { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5); return new THREE.TubeGeometry(c, 60, r, 10) }, [pts, r])
  return <mesh geometry={g} castShadow><meshStandardMaterial color={color} roughness={0.75} /></mesh>
}
/** 滴液漏斗：梨形的玻璃球、上口的塞子、下面的活塞和细管。原点在细管的下口；fill 是里面还剩多少液体（0–1） */
export function Funnel({ fill, color = '#cfd8d4' }: { fill: number; color?: string }) {
  const g = useMemo(() => ({
    body: shell([[0.004, 0], [0.004, 0.06], [0.006, 0.075], [0.024, 0.1], [0.027, 0.125], [0.02, 0.15], [0.009, 0.16], [0.009, 0.172]], 0.0016, { segs: 32 }),
    cock: (() => { const c = new THREE.CylinderGeometry(0.0045, 0.0045, 0.03, 12); c.rotateX(Math.PI / 2); return c })(),
    stopper: lathe([[0, 0.166], [0.0075, 0.166], [0.009, 0.182], [0, 0.182]], { segs: 20 }),
  }), [])
  const liq = useMemo(() => fill > 0.03 ? lathe([[0, 0.078], [0.0055, 0.078], [0.0225, 0.1], [0.0225 + 0.003 * Math.min(1, fill * 2), 0.1 + 0.034 * fill], [0, 0.1 + 0.034 * fill]], { segs: 28 }) : null, [fill])
  return <group>
    {liq && <mesh geometry={liq} renderOrder={2}><LiquidMat color={color} o={0.55} /></mesh>}
    <mesh geometry={g.cock} position={[0, 0.066, 0]} castShadow><meshStandardMaterial color="#e9e6da" roughness={0.4} /></mesh>
    <mesh position={[0, 0.066, 0.02]} castShadow><boxGeometry args={[0.02, 0.006, 0.004]} /><meshStandardMaterial color="#e9e6da" roughness={0.4} /></mesh>
    <mesh geometry={g.stopper}><GlassMat o={0.45} /></mesh>
    <mesh geometry={g.body} castShadow renderOrder={6}><GlassMat /></mesh>
  </group>
}
/** 玻璃水槽：圆形、厚壁、口沿磨边。原点在槽底 */
export function Trough({ r = 0.1, h = 0.08, level = 0.055, color = '#6fa3b3' }: { r?: number; h?: number; level?: number; color?: string }) {
  const g = useMemo(() => ({ body: shell([[0, 0], [r - 0.004, 0], [r, 0.004], [r, h]], 0.005, { segs: 56 }), liq: lathe([[0, 0.005], [r - 0.0052, 0.005], [r - 0.0052, level], [0, level]], { segs: 48 }) }), [r, h, level])
  return <group>
    <mesh geometry={g.liq} renderOrder={1}><LiquidMat color={color} o={0.22} /></mesh>
    <mesh geometry={g.body} castShadow renderOrder={7}><GlassMat o={0.14} /></mesh>
  </group>
}
/** 台式振荡器：机箱、面板上的旋钮和小屏、上面一块带防滑垫的托盘。托盘的中心在 (0, 0.085, 0) */
export function Shaker({ children, shake }: { children?: ReactNode; shake: number }) {
  const tray = useRef<THREE.Group>(null)
  const knob = useMemo(() => ({ d: disc(0.012, 0.01), b: bolts(4, 0.06, 0.006) }), [])
  useFrame(({ clock }) => { if (tray.current) { tray.current.position.x = Math.sin(clock.elapsedTime * 38) * 0.004 * shake; tray.current.position.z = Math.cos(clock.elapsedTime * 38) * 0.004 * shake } })
  return <group>
    <RoundedBox args={[0.22, 0.07, 0.2]} radius={0.008} position-y={0.035} castShadow receiveShadow><meshPhysicalMaterial color="#d9dcd9" roughness={0.45} clearcoat={0.3} /></RoundedBox>
    <mesh position={[0.06, 0.035, 0.101]} rotation-x={Math.PI / 2} geometry={knob.d} castShadow><meshStandardMaterial color="#26292c" roughness={0.5} /></mesh>
    <mesh position={[-0.04, 0.038, 0.1005]}><planeGeometry args={[0.06, 0.022]} /><meshBasicMaterial color="#0f2018" toneMapped={false} /></mesh>
    <group ref={tray}>
      <RoundedBox args={[0.2, 0.01, 0.18]} radius={0.004} position-y={0.078} castShadow><meshStandardMaterial color="#2b2e31" roughness={0.9} /></RoundedBox>
      <group position-y={0.083}>{children}</group>
    </group>
  </group>
}
/** 试管架：两层带孔的板、两头的立板。n 个孔，孔距 pitch；试管底座在 y = 0.012 */
export function Rack({ n = 2, pitch = 0.05 }: { n?: number; pitch?: number }) {
  const w = n * pitch + 0.03
  return <group>
    <RoundedBox args={[w, 0.008, 0.05]} radius={0.002} position-y={0.004} castShadow receiveShadow><meshStandardMaterial color="#c9a56b" roughness={0.7} /></RoundedBox>
    {[0.05, 0.095].map(y => <mesh key={y} position-y={y} castShadow><boxGeometry args={[w, 0.006, 0.05]} /><meshStandardMaterial color="#c9a56b" roughness={0.7} transparent opacity={0.96} /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[s * (w / 2 - 0.004), 0.052, 0]} castShadow><boxGeometry args={[0.008, 0.096, 0.05]} /><meshStandardMaterial color="#b8935a" roughness={0.7} /></mesh>)}
  </group>
}
