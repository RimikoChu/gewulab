// 山地消防的车和器材：水罐消防车、拖车式水炮、直升机、无人机、灭火弹、物资箱、橡皮冲锋舟、训练长台、戴手套的手。
// 尺寸按米写，照实物的比例：消防车长 8.6 m，直升机机身加尾梁约 11 m、旋翼直径 10.6 m，冲锋舟长 4.6 m。
// 车和飞机的原点都在自己的中心（车在地面上、船在水线上），车头朝 +x。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, useConcrete } from '@/lab-kit'
import { makeScale, makeShutter, makeSign } from './mats'

type V3 = [number, number, number]
const RED = <meshPhysicalMaterial color="#c21d16" roughness={0.3} clearcoat={0.85} clearcoatRoughness={0.14} />
const WHITE = <meshPhysicalMaterial color="#e9e7e0" roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.2} />
const GLASS = <meshPhysicalMaterial color="#17232b" roughness={0.05} metalness={0.2} clearcoat={1} envMapIntensity={1.8} />
const BLACK = <meshStandardMaterial color="#17181a" roughness={0.7} />
const RUBBER = <meshStandardMaterial color="#1c1d1f" roughness={0.85} />

// ---------- 消防车 ----------
function Wheel({ x, z, r = 0.5 }: { x: number; z: number; r?: number }) {
  const rim = useMemo(() => disc(r * 0.58, 0.06, { hole: 0.06 }), [r])
  const s = Math.sign(z)
  return <group position={[x, r, z]} rotation-x={Math.PI / 2}>
    <mesh castShadow><cylinderGeometry args={[r, r, 0.36, 32]} />{RUBBER}</mesh>
    <mesh position-y={s * 0.16}><torusGeometry args={[r * 0.88, 0.055, 8, 32]} />{RUBBER}</mesh>
    <mesh geometry={rim} position-y={s * 0.15} rotation-x={s > 0 ? 0 : Math.PI}><Metal kind="aluminum" grain="turned" rough={0.3} /></mesh>
    <mesh position-y={s * 0.2}><cylinderGeometry args={[0.09, 0.11, 0.06, 16]} /><Metal kind="chrome" rough={0.15} /></mesh>
  </group>
}
function Fender({ x, z, r = 0.6 }: { x: number; z: number; r?: number }) {
  return <mesh position={[x, 0.52, z]} rotation-x={Math.PI / 2}><cylinderGeometry args={[r, r, 0.42, 24, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#1b1c1e" roughness={0.6} side={THREE.DoubleSide} /></mesh>
}
/** 水罐消防车：双排座驾驶室、器材厢（两侧各三扇卷帘门）、厢顶拉梯和栏杆、三根轴。lights：警灯亮不亮 */
export function FireTruck({ lights = false }: { lights?: boolean }) {
  const shutter = makeShutter(), door = makeSign('119', { w: 256, h: 128, bg: '#c21d16', size: 0.7 })
  const bar = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (!bar.current) return; const t = clock.elapsedTime * 6; bar.current.children.forEach((m, i) => { ((m as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = lights ? (Math.sin(t + (i < 3 ? 0 : Math.PI)) > 0 ? 2.6 : 0.2) : 0.5 }) })
  const W = 2.5, half = W / 2
  return <group>
    {/* 大梁和前后保险杠 */}
    <mesh position={[0, 0.72, 0]} castShadow><boxGeometry args={[8.2, 0.28, 1.0]} />{BLACK}</mesh>
    <RoundedBox args={[0.24, 0.36, W]} radius={0.05} position={[4.26, 0.72, 0]} castShadow><Metal kind="chrome" rough={0.2} /></RoundedBox>
    <RoundedBox args={[0.16, 0.26, W]} radius={0.04} position={[-4.24, 0.72, 0]} castShadow>{BLACK}</RoundedBox>
    {/* 驾驶室 */}
    <RoundedBox args={[2.3, 2.0, W]} radius={0.22} smoothness={4} position={[3.05, 2.05, 0]} castShadow receiveShadow>{RED}</RoundedBox>
    <mesh position={[4.2, 1.32, 0]}><boxGeometry args={[0.05, 0.5, 1.4]} /><meshStandardMaterial color="#26282b" metalness={0.6} roughness={0.4} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[4.19, 1.32, s * 0.95]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.13, 0.13, 0.05, 20]} /><meshBasicMaterial color="#fff6dc" toneMapped={false} /></mesh>)}
    <mesh position={[4.19, 2.42, 0]} rotation-z={0.08}><boxGeometry args={[0.05, 0.95, W - 0.3]} />{GLASS}</mesh>
    {[-1, 1].flatMap(s => [3.65, 2.55].map(x => <mesh key={`${s}${x}`} position={[x, 2.46, s * (half + 0.005)]}><boxGeometry args={[0.85, 0.75, 0.02]} />{GLASS}</mesh>))}
    {[-1, 1].map(s => <mesh key={s} position={[3.1, 1.55, s * (half + 0.012)]} rotation-y={s > 0 ? 0 : Math.PI}><planeGeometry args={[0.8, 0.4]} /><meshStandardMaterial map={door} roughness={0.4} /></mesh>)}
    {[-1, 1].map(s => <group key={s}>
      <mesh position={[4.05, 2.4, s * (half + 0.25)]} castShadow><boxGeometry args={[0.06, 0.42, 0.2]} />{BLACK}</mesh>
      <mesh position={[3.9, 2.4, s * (half + 0.12)]}><boxGeometry args={[0.3, 0.03, 0.03]} />{BLACK}</mesh>
      <mesh position={[3.05, 0.7, s * (half - 0.05)]}><boxGeometry args={[1.9, 0.05, 0.3]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    </group>)}
    {/* 警灯 */}
    <RoundedBox args={[0.4, 0.14, 1.8]} radius={0.05} position={[3.5, 3.12, 0]}><meshStandardMaterial color="#2a2b2e" /></RoundedBox>
    <group ref={bar}>{[-3, -2, -1, 1, 2, 3].map(i => <mesh key={i} position={[3.5, 3.21, i * 0.26]}><boxGeometry args={[0.3, 0.08, 0.2]} /><meshStandardMaterial color={i < 0 ? '#ff2a1f' : '#2f6fff'} emissive={i < 0 ? '#ff2a1f' : '#2f6fff'} emissiveIntensity={0.5} toneMapped={false} /></mesh>)}</group>
    {/* 器材厢、卷帘门、反光条 */}
    <RoundedBox args={[6.0, 2.0, W]} radius={0.1} smoothness={3} position={[-1.2, 2.05, 0]} castShadow receiveShadow>{RED}</RoundedBox>
    {[-1, 1].flatMap(s => [0, 1, 2].map(i => <group key={`${s}${i}`} position={[0.75 - i * 1.9, 2.1, s * (half + 0.012)]} rotation-y={s > 0 ? 0 : Math.PI}>
      <mesh><planeGeometry args={[1.65, 1.5]} /><meshStandardMaterial map={shutter} metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[0, -0.78, 0.02]}><boxGeometry args={[1.7, 0.08, 0.04]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <mesh position={[0, -0.7, 0.04]}><boxGeometry args={[0.3, 0.05, 0.04]} /><Metal kind="chrome" /></mesh>
    </group>))}
    {[-1, 1].map(s => <mesh key={s} position={[0, 1.18, s * (half + 0.014)]} rotation-y={s > 0 ? 0 : Math.PI}><planeGeometry args={[8.3, 0.12]} /><meshStandardMaterial color="#f4f2ea" emissive="#555" roughness={0.3} /></mesh>)}
    {/* 厢顶的栏杆和拉梯 */}
    {[-1, 1].map(s => <mesh key={s} position={[-1.2, 3.22, s * 1.1]}><boxGeometry args={[5.6, 0.04, 0.04]} /><Metal kind="aluminum" /></mesh>)}
    {[-1, 1].flatMap(s => [-3.9, -2.1, -0.3, 1.5].map(x => <mesh key={`${s}${x}`} position={[x, 3.14, s * 1.1]}><boxGeometry args={[0.04, 0.18, 0.04]} /><Metal kind="aluminum" /></mesh>))}
    {[-1, 1].map(s => <mesh key={s} position={[-1.3, 3.14, s * 0.28]} castShadow><boxGeometry args={[5.4, 0.08, 0.06]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
    {Array.from({ length: 18 }, (_, i) => <mesh key={i} position={[-3.85 + i * 0.3, 3.14, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.018, 0.018, 0.56, 8]} /><Metal kind="aluminum" /></mesh>)}
    {/* 车尾的泵室面板和出水口 */}
    <mesh position={[-4.21, 1.9, 0]}><boxGeometry args={[0.03, 1.4, 1.9]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    {[-0.5, 0.5].map(z => <mesh key={z} position={[-4.28, 1.45, z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.14, 16]} /><Metal kind="brass" grain="turned" /></mesh>)}
    {[3.05, -1.9, -3.2].flatMap(x => [-1, 1].map(s => <group key={`${x}${s}`}><Wheel x={x} z={s * (half - 0.26)} /><Fender x={x} z={s * (half - 0.23)} /></group>))}
  </group>
}

// ---------- 拖车式水炮 ----------
/** 水带：沿地面铺的一根扁水带，从 from 到 to（都在地面上） */
export function Hose({ pts, r = 0.05, color = '#c9b98c' }: { pts: V3[]; r?: number; color?: string }) {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal'), 80, r, 8), [pts, r])
  return <mesh geometry={g} castShadow scale={[1, 0.6, 1]}><meshStandardMaterial color={color} roughness={0.85} /></mesh>
}
/**
 * 拖车式消防水炮。原点在炮管的俯仰轴上，炮口朝 +x；pivot：俯仰轴离地多高；angle：仰角（度）。
 * 两只轮子的拖车架、四条撑地的支腿、回转座、弯管、炮管、收口的铝炮嘴、压力表、手轮。
 */
export function Monitor({ angle, pivot = 0.8 }: { angle: number; pivot?: number }) {
  const nozzle = useMemo(() => lathe([[0.075, 0], [0.105, 0.02], [0.105, 0.1], [0.085, 0.14], [0.06, 0.42], [0.066, 0.44], [0.066, 0.5], [0.05, 0.5]]), [])
  const base = useMemo(() => lathe([[0.2, 0], [0.2, 0.05], [0.13, 0.08], [0.13, 0.2], [0.17, 0.22], [0.17, 0.28], [0.1, 0.3]]), [])
  const y0 = -pivot
  return <group>
    {/* 拖车架：一块钢板平台、牵引杆、两只小轮、四条支腿 */}
    <RoundedBox args={[1.7, 0.08, 0.9]} radius={0.02} position={[-0.15, y0 + 0.3, 0]} castShadow receiveShadow><meshStandardMaterial color="#2a2d31" roughness={0.6} metalness={0.5} /></RoundedBox>
    <mesh position={[-1.6, y0 + 0.3, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.035, 0.035, 1.3, 12]} /><Metal kind="steel" grain="brushed" /></mesh>
    <mesh position={[-2.3, y0 + 0.3, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.07, 0.022, 8, 20]} /><Metal kind="steel" /></mesh>
    {[-1, 1].map(s => <group key={s} position={[-0.15, y0, s * 0.58]} scale={0.6}><Wheel x={0} z={s * 0.01} r={0.5} /></group>)}
    {[[-0.9, 1], [-0.9, -1], [0.6, 1], [0.6, -1]].map(([x, s]) => <group key={`${x}${s}`}>
      <mesh position={[x, y0 + 0.15, s * 0.66]} castShadow><cylinderGeometry args={[0.03, 0.03, 0.3, 10]} /><Metal kind="steel" grain="turned" /></mesh>
      <mesh position={[x, y0 + 0.02, s * 0.66]}><cylinderGeometry args={[0.1, 0.11, 0.04, 16]} /><Metal kind="steel" /></mesh>
      <mesh position={[x, y0 + 0.3, s * 0.54]}><boxGeometry args={[0.1, 0.06, 0.3]} /><meshStandardMaterial color="#2a2d31" roughness={0.6} metalness={0.5} /></mesh>
    </group>)}
    {/* 进水口和回转座 */}
    <mesh position={[-0.6, y0 + 0.46, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.075, 0.075, 0.9, 16]} />{RED}</mesh>
    <mesh position={[-1.08, y0 + 0.46, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.1, 0.1, 0.1, 16]} /><Metal kind="aluminum" grain="turned" /></mesh>
    <mesh geometry={base} position={[0, y0 + 0.34, 0]} castShadow>{RED}</mesh>
    <mesh position={[0, y0 + 0.63, 0]}><cylinderGeometry args={[0.19, 0.19, 0.05, 24]} /><Metal kind="steel" grain="turned" /></mesh>
    <mesh position={[0, (y0 + 0.64) / 2, 0]} castShadow><cylinderGeometry args={[0.085, 0.085, Math.max(0.02, -(y0 + 0.64)), 16]} />{RED}</mesh>
    {/* 压力表 */}
    <group position={[0, y0 + 0.5, 0.19]}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.075, 0.075, 0.04, 24]} /><Metal kind="chrome" rough={0.2} /></mesh>
      <mesh position-z={0.022}><circleGeometry args={[0.065, 24]} /><meshStandardMaterial color="#f3f1ea" roughness={0.4} /></mesh>
      <mesh position={[0.012, 0.015, 0.024]} rotation-z={-0.7}><boxGeometry args={[0.008, 0.055, 0.002]} /><meshBasicMaterial color="#c21d16" /></mesh>
    </group>
    {/* 俯仰的部分：转鼓、炮管、炮嘴、手轮 */}
    <group rotation-z={angle * Math.PI / 180}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.13, 0.13, 0.3, 24]} /><Metal kind="steel" grain="turned" /></mesh>
      <mesh position={[0.4, 0, 0]} rotation-z={-Math.PI / 2} castShadow><cylinderGeometry args={[0.075, 0.085, 1.5, 20]} />{RED}</mesh>
      {[-0.3, 0.3, 0.8].map(x => <mesh key={x} position={[x, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.097, 0.097, 0.05, 20]} /><Metal kind="steel" grain="turned" /></mesh>)}
      <mesh geometry={nozzle} position={[1.15, 0, 0]} rotation-z={-Math.PI / 2} castShadow><Metal kind="aluminum" grain="turned" /></mesh>
      <group position={[0, 0, -0.24]}><mesh><torusGeometry args={[0.13, 0.015, 8, 24]} />{BLACK}</mesh><mesh position-z={0.06} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.02, 0.02, 0.14, 8]} /><Metal kind="steel" /></mesh></group>
    </group>
  </group>
}

// ---------- 直升机 ----------
/** 消防直升机：红白机身、深色风挡、尾梁和尾桨、四片旋翼、滑橇。机头朝 +x，原点在机舱中心 */
export function Helicopter() {
  const rotor = useRef<THREE.Group>(null), tail = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (rotor.current) rotor.current.rotation.y += dt * 22; if (tail.current) tail.current.rotation.z += dt * 40 })
  const boom = useMemo(() => { const g = new THREE.CylinderGeometry(0.16, 0.42, 5.4, 18); g.rotateZ(-Math.PI / 2); return g }, [])
  const skid = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(2.3, 0.28, 0), new THREE.Vector3(2.0, 0.04, 0), new THREE.Vector3(1.4, 0, 0), new THREE.Vector3(-1.9, 0, 0)]), 24, 0.05, 8), [])
  return <group>
    {/* 机舱：一个拉长的蛋形，下半截白色 */}
    <mesh scale={[2.5, 1.2, 1.1]} castShadow><sphereGeometry args={[1, 40, 28]} />{RED}</mesh>
    <mesh scale={[2.42, 1.0, 1.12]} position-y={-0.26}><sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45]} />{WHITE}</mesh>
    {/* 风挡：机头一大块深色玻璃，侧窗 */}
    <mesh scale={[1.5, 0.95, 1.02]} position={[1.12, 0.14, 0]}><sphereGeometry args={[1, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.62]} />{GLASS}</mesh>
    {[-1, 1].map(s => <mesh key={s} position={[-0.5, 0.25, s * 1.06]} rotation-y={s > 0 ? 0 : Math.PI}><planeGeometry args={[1.2, 0.6]} />{GLASS}</mesh>)}
    {/* 舱门的滑轨和门缝 */}
    {[-1, 1].map(s => <mesh key={s} position={[-0.3, -0.42, s * 1.09]}><boxGeometry args={[2.2, 0.03, 0.03]} /><Metal kind="aluminum" /></mesh>)}
    {/* 发动机整流罩和排气口 */}
    <RoundedBox args={[3.0, 0.7, 1.2]} radius={0.28} smoothness={4} position={[-0.5, 1.15, 0]} castShadow>{RED}</RoundedBox>
    {[-1, 1].map(s => <mesh key={s} position={[-1.7, 1.2, s * 0.5]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.13, 0.15, 0.5, 14]} /><Metal kind="steel" grain="turned" rough={0.5} /></mesh>)}
    {/* 尾梁、垂尾、平尾、尾桨 */}
    <mesh geometry={boom} position={[-4.6, 0.55, 0]} rotation-z={-0.07} castShadow>{RED}</mesh>
    <mesh position={[-7.2, 1.35, 0]} rotation-z={0.5} castShadow><boxGeometry args={[0.85, 2.0, 0.1]} />{RED}</mesh>
    <mesh position={[-6.3, 0.75, 0]} castShadow><boxGeometry args={[0.6, 0.06, 2.2]} />{WHITE}</mesh>
    <group ref={tail} position={[-7.45, 1.75, 0.16]}>
      <mesh><boxGeometry args={[0.12, 1.7, 0.03]} />{BLACK}</mesh><mesh><boxGeometry args={[1.7, 0.12, 0.03]} />{BLACK}</mesh>
      <mesh><circleGeometry args={[0.86, 32]} /><meshBasicMaterial color="#20242a" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    </group>
    {/* 旋翼 */}
    <mesh position={[-0.3, 1.7, 0]}><cylinderGeometry args={[0.1, 0.14, 0.5, 14]} /><Metal kind="steel" grain="turned" /></mesh>
    <group ref={rotor} position={[-0.3, 1.98, 0]}>
      <mesh><cylinderGeometry args={[0.3, 0.3, 0.12, 20]} /><Metal kind="steel" grain="turned" /></mesh>
      {[0, 1, 2, 3].map(i => <mesh key={i} rotation-y={i * Math.PI / 2} position={[Math.cos(i * Math.PI / 2) * 2.8, 0, -Math.sin(i * Math.PI / 2) * 2.8]} castShadow><boxGeometry args={[5.0, 0.04, 0.34]} /><meshStandardMaterial color="#25282c" roughness={0.5} /></mesh>)}
      <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[5.3, 48]} /><meshBasicMaterial color="#20242a" transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    </group>
    {/* 滑橇 */}
    {[-1, 1].map(s => <group key={s} position={[0, -1.72, s * 1.05]}>
      <mesh geometry={skid} castShadow><Metal kind="steel" grain="brushed" /></mesh>
      {[1.1, -1.1].map(x => <mesh key={x} position={[x, 0.36, -s * 0.2]} rotation-x={s * 0.5}><cylinderGeometry args={[0.04, 0.04, 0.85, 8]} /><Metal kind="steel" grain="brushed" /></mesh>)}
    </group>)}
    {/* 机腹的挂钩 */}
    <mesh position={[0, -1.2, 0]}><cylinderGeometry args={[0.06, 0.06, 0.2, 10]} /><Metal kind="steel" /></mesh>
  </group>
}

// ---------- 无人机 ----------
/** 四旋翼消防无人机：机身、四条机臂、电机和桨、起落架、机腹的投放挂架。原点在机身中心，机头朝 +x */
export function Drone({ scale = 1 }: { scale?: number }) {
  const props = useRef<THREE.Group>(null)
  useFrame((_, dt) => { props.current?.children.forEach((c, i) => { c.rotation.y += dt * 60 * (i % 2 ? 1 : -1) }) })
  const arms: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
  return <group scale={scale}>
    <RoundedBox args={[0.62, 0.2, 0.44]} radius={0.07} smoothness={4} castShadow><meshPhysicalMaterial color="#e6e3db" roughness={0.35} clearcoat={0.5} /></RoundedBox>
    <RoundedBox args={[0.4, 0.1, 0.3]} radius={0.04} position={[0, 0.13, 0]}><meshStandardMaterial color="#c21d16" roughness={0.4} /></RoundedBox>
    <mesh position={[0.33, -0.02, 0]}><sphereGeometry args={[0.07, 16, 12]} />{GLASS}</mesh>
    {arms.map(([sx, sz]) => <group key={`${sx}${sz}`}>
      <mesh position={[sx * 0.42, 0.02, sz * 0.42]} rotation-y={-Math.atan2(sz, sx)} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.028, 0.034, 0.8, 10]} /><meshStandardMaterial color="#232528" roughness={0.5} /></mesh>
      <mesh position={[sx * 0.7, 0.08, sz * 0.7]}><cylinderGeometry args={[0.06, 0.06, 0.14, 16]} /><Metal kind="aluminum" grain="turned" /></mesh>
    </group>)}
    <group ref={props}>{arms.map(([sx, sz]) => <group key={`${sx}${sz}`} position={[sx * 0.7, 0.17, sz * 0.7]}>
      <mesh><boxGeometry args={[0.7, 0.012, 0.06]} />{BLACK}</mesh>
      <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[0.36, 24]} /><meshBasicMaterial color="#20242a" transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    </group>)}</group>
    {/* 起落架：两根横杆、四条斜腿 */}
    {[-1, 1].map(s => <group key={s}>
      <mesh position={[0, -0.42, s * 0.3]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.018, 0.018, 0.7, 8]} />{BLACK}</mesh>
      {[-0.2, 0.2].map(x => <mesh key={x} position={[x, -0.26, s * 0.25]} rotation-x={-s * 0.3}><cylinderGeometry args={[0.014, 0.014, 0.36, 8]} />{BLACK}</mesh>)}
    </group>)}
    <mesh position={[0, -0.14, 0]}><boxGeometry args={[0.16, 0.08, 0.16]} /><Metal kind="steel" /></mesh>
  </group>
}

/** 灭火弹：一只红色的球壳，中间一道白色腰带，顶上一个引信帽。r 是半径 */
export function Bomb({ r = 0.3, color = '#d0271d' }: { r?: number; color?: string }) {
  return <group>
    <mesh castShadow><sphereGeometry args={[r, 32, 24]} /><meshPhysicalMaterial color={color} roughness={0.32} clearcoat={0.7} /></mesh>
    <mesh rotation-x={Math.PI / 2}><torusGeometry args={[r * 1.0, r * 0.07, 8, 32]} /><meshStandardMaterial color="#f0eee6" roughness={0.5} /></mesh>
    <mesh position-y={r * 0.98}><cylinderGeometry args={[r * 0.2, r * 0.26, r * 0.22, 16]} /><Metal kind="aluminum" grain="turned" /></mesh>
  </group>
}

/** 空投的物资箱：橙色的硬箱，两道黑色捆扎带，侧面贴着白底红字的标签。s 是边长 */
export function Crate({ s = 1 }: { s?: number }) {
  const sign = makeSign('救援物资', { w: 256, h: 96, bg: '#f4f2ea', fg: '#c21d16', size: 0.5 })
  return <group scale={s}>
    <RoundedBox args={[1.1, 0.8, 0.8]} radius={0.06} smoothness={3} castShadow><meshStandardMaterial color="#e07a1f" roughness={0.55} /></RoundedBox>
    {[-0.3, 0.3].map(x => <mesh key={x} position-x={x}><boxGeometry args={[0.07, 0.82, 0.82]} /><meshStandardMaterial color="#1d1e20" roughness={0.8} /></mesh>)}
    <mesh position={[0, 0.05, 0.405]}><planeGeometry args={[0.46, 0.2]} /><meshStandardMaterial map={sign} roughness={0.5} /></mesh>
  </group>
}

// ---------- 冲锋舟 ----------
/** 橡皮冲锋舟：一圈橙色的气囊（船头翘起收拢）、灰色的船底板、尾板上挂一台舷外机、两只座箱。船头朝 +x，原点在水线上的船中心 */
export function Boat() {
  const tube = useMemo(() => {
    const p: V3[] = [[-2.2, 0.3, 0.72], [-0.5, 0.3, 0.78], [1.0, 0.33, 0.72], [1.9, 0.42, 0.42], [2.25, 0.5, 0], [1.9, 0.42, -0.42], [1.0, 0.33, -0.72], [-0.5, 0.3, -0.78], [-2.2, 0.3, -0.72]]
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p.map(v => new THREE.Vector3(...v)), false, 'centripetal'), 80, 0.27, 16)
  }, [])
  const rope = useMemo(() => {
    const p: V3[] = [[-2.0, 0.5, 0.98], [-0.5, 0.52, 1.04], [1.0, 0.55, 0.97], [1.95, 0.64, 0.6], [2.5, 0.7, 0], [1.95, 0.64, -0.6], [1.0, 0.55, -0.97], [-0.5, 0.52, -1.04], [-2.0, 0.5, -0.98]]
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p.map(v => new THREE.Vector3(...v))), 80, 0.018, 6)
  }, [])
  return <group>
    <mesh geometry={tube} castShadow><meshStandardMaterial color="#e2611c" roughness={0.6} /></mesh>
    {[-2.2].flatMap(x => [-1, 1].map(s => <mesh key={`${x}${s}`} position={[x - 0.05, 0.3, s * 0.72]} rotation-z={Math.PI / 2}><coneGeometry args={[0.27, 0.4, 16]} /><meshStandardMaterial color="#2a2b2d" roughness={0.7} /></mesh>))}
    <mesh geometry={rope}><meshStandardMaterial color="#f0ede2" roughness={0.9} /></mesh>
    {/* 船底板和尾板 */}
    <mesh position={[-0.1, 0.1, 0]} receiveShadow><boxGeometry args={[4.0, 0.08, 1.2]} /><meshStandardMaterial color="#5c6166" roughness={0.8} /></mesh>
    <mesh position={[1.75, 0.16, 0]} rotation-z={0.25}><boxGeometry args={[0.7, 0.08, 0.7]} /><meshStandardMaterial color="#5c6166" roughness={0.8} /></mesh>
    <mesh position={[-2.05, 0.38, 0]} castShadow><boxGeometry args={[0.07, 0.6, 1.25]} /><meshStandardMaterial color="#3a3d40" roughness={0.6} /></mesh>
    {/* 座箱 */}
    {[-0.9, 0.4].map(x => <RoundedBox key={x} args={[0.4, 0.3, 1.1]} radius={0.04} position={[x, 0.3, 0]} castShadow><meshStandardMaterial color="#d8d5cc" roughness={0.6} /></RoundedBox>)}
    {/* 舷外机 */}
    <group position={[-2.3, 0.55, 0]}>
      <RoundedBox args={[0.42, 0.5, 0.34]} radius={0.1} smoothness={4} position={[0, 0.3, 0]} castShadow><meshPhysicalMaterial color="#1b1d20" roughness={0.3} clearcoat={0.7} /></RoundedBox>
      <mesh position={[0, 0.07, 0]}><boxGeometry args={[0.3, 0.05, 0.3]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <mesh position={[-0.02, -0.4, 0]}><boxGeometry args={[0.16, 0.9, 0.1]} /><meshStandardMaterial color="#2a2c2f" roughness={0.5} metalness={0.4} /></mesh>
      <mesh position={[0.5, 0.25, 0.1]} rotation-z={Math.PI / 2 - 0.2}><cylinderGeometry args={[0.022, 0.022, 0.7, 8]} />{BLACK}</mesh>
    </group>
  </group>
}

// ---------- 训练长台 ----------
/** 喷水训练用的混凝土长台：台面和炮口一样高，台面上一条距离刻度带。原点在长台靠炮口一端的地面，沿 +x 伸出去 len 米 */
export function LongDeck({ len, h, w = 2.4, from = 2 }: { len: number; h: number; w?: number; from?: number }) {
  const [d, n, r] = useConcrete(len / 3, 1), scale = useMemo(() => { const t = makeScale(len).clone(); t.offset.x = from / len; t.repeat.x = (len - from) / len; t.needsUpdate = true; return t }, [len, from])
  return <group>
    <mesh position={[(from + len) / 2, h / 2 - 0.02, 0]} castShadow receiveShadow><boxGeometry args={[len - from, h - 0.04, w]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#b4b1a8" /></mesh>
    <RoundedBox args={[len - from + 0.12, 0.08, w + 0.12]} radius={0.02} position={[(from + len) / 2, h - 0.04, 0]} receiveShadow castShadow><meshStandardMaterial color="#a9a69d" roughness={0.85} /></RoundedBox>
    {/* 朝外的一面贴着距离刻度带：从炮口量起，每 5 m 写一个数 */}
    <mesh position={[(from + len) / 2, h - 0.3, w / 2 + 0.065]}><planeGeometry args={[len - from, 0.36]} /><meshStandardMaterial map={scale} roughness={0.7} /></mesh>
  </group>
}

// ---------- 石头 ----------
/** 河滩、山脚的石头：list 是 [x, y, z, 大小] */
export function Rocks({ list }: { list: [number, number, number, number][] }) {
  const geo = useMemo(() => { const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.8 + 0.4 * Math.abs(Math.sin(p.getX(i) * 12.9 + p.getY(i) * 78.2 + p.getZ(i) * 37.7) * 43758.5 % 1); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k) } g.computeVertexNormals(); return g }, [])
  return <>{list.map(([x, y, z, s], i) => <mesh key={i} geometry={geo} position={[x, y, z]} scale={s} rotation-y={i * 1.7} castShadow receiveShadow><meshStandardMaterial color={i % 2 ? '#8b877d' : '#77746c'} roughness={0.95} flatShading /></mesh>)}</>
}

// ---------- 戴手套的手 ----------
const FINGER = new THREE.CapsuleGeometry(1, 3.2, 6, 14)
/**
 * 一只戴蓝色丁腈手套的手，手腕接着橙色抢险服的袖口。原点在指尖捏住东西的地方，手从上方伸下来。
 * pinch：0 张开、1 捏紧；arm：袖子的长度（m）
 */
export function Glove({ pinch = 0, arm = 0.3 }: { pinch?: number; arm?: number }) {
  const glove = <meshStandardMaterial color="#4a76bd" roughness={0.62} />
  const cloth = <meshStandardMaterial color="#d8632a" roughness={0.88} />
  const grip = 0.15 + pinch * 0.75, sl = Math.max(10, arm * 100)
  return <group rotation-z={Math.PI}><group rotation-x={Math.PI / 2}><group scale={0.01}>
    <RoundedBox args={[8.2, 8.6, 3.4]} radius={1.5} smoothness={4} position={[0, 4.4, 0]} castShadow>{glove}</RoundedBox>
    {[-2.85, -0.95, 0.95, 2.85].map((x, i) => <group key={x} position={[x, 0.2, 0]} rotation-x={-grip * 1.1}>
      <mesh geometry={FINGER} position={[0, -2.2 + Math.abs(i - 1.5) * 0.4, 0]} scale={[0.95, 0.95 - Math.abs(i - 1.5) * 0.08, 0.95]} castShadow>{glove}</mesh>
    </group>)}
    <group position={[4.4, 3.4, -0.6]} rotation={[-grip * 0.6, 0, 0.75]}><mesh geometry={FINGER} position-y={-2.4} scale={[1.08, 0.82, 1.08]} castShadow>{glove}</mesh></group>
    <mesh position={[0, 10.2, 0]} castShadow><cylinderGeometry args={[3.7, 4.3, 3.2, 28]} />{glove}</mesh>
    <mesh position={[0, 11.9, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[3.75, 0.4, 8, 28]} />{glove}</mesh>
    <mesh position={[0, 12 + sl / 2, 0]} castShadow><cylinderGeometry args={[5.4, 4.9, sl, 28]} />{cloth}</mesh>
    <mesh position={[0, 12.4, 0]} castShadow><cylinderGeometry args={[4.95, 4.95, 1.2, 28]} /><meshStandardMaterial color="#e9e4c8" roughness={0.9} /></mesh>
  </group></group></group>
}
