// 冰面上几课专用的器材：喷水滑车、跨在冰道上的光电门、压在两只冰壶之间的弹簧、长板和电动小车，还有一只推东西的手。
// 尺寸按实物，单位是米。会动的量（水位、喷水的强弱、弹簧的长度）由各课每帧写进 ref。
import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Led, Metal, disc, lathe, shell } from '@/lab-kit'
import { Glove, gloveQuat } from './gear'
import { makeWood, once, rep } from './mats'
import { BOAT, JET } from './physics'

const black = <meshStandardMaterial color="#17191c" roughness={0.55} />
const plastic = (c: string, rough = 0.5) => <meshPhysicalMaterial color={c} roughness={rough} clearcoat={0.3} clearcoatRoughness={0.4} />

const PUSH_Q = gloveQuat([1, -0.12, 0], [0, 1, 0.25])
/** 一只推东西的手：指尖顶在原点，朝 +x 推；手腕在后上方 */
export function Pusher({ flip = false }: { flip?: boolean }) {
  return <group rotation-y={flip ? Math.PI : 0}><group position={[-0.062, 0.012, 0]} quaternion={PUSH_Q}><Glove pinch={0.15} arm={0.36} /></group></group>
}

// ---------- 喷水滑车 ----------
/** 瓶子轴线的高度、瓶嘴（喷口）的位置、遮光片顶的高度 */
export const SLED = { axis: 0.125, nozzle: -0.3, flagY: 0.27 }
const SLED_G = once(() => ({
  // 1.5 L 的饮料瓶，横放：瓶底在 +x，瓶嘴在 -x。截面沿轴线从瓶嘴（0）到瓶底（0.31）
  bottle: shell([[0.013, 0], [0.013, 0.03], [0.02, 0.045], [0.04, 0.085], [0.046, 0.11], [0.046, 0.19], [0.043, 0.2], [0.046, 0.21], [0.046, 0.285], [0.04, 0.305], [0.02, 0.312], [0, 0.31]], 0.0012, { segs: 40 }),
  water: lathe([[0, 0.085], [0.038, 0.088], [0.044, 0.11], [0.044, 0.285], [0.038, 0.303], [0, 0.305]], { segs: 32 }),
  weight: disc(0.045, 0.024, { chamfer: 0.003 }),
  runner: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.27, 0.009, 0], [0.24, 0.009, 0], [0.29, 0.02, 0], [0.31, 0.045, 0]].map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.2), 30, 0.008, 10),
  spray: (() => { const g = new THREE.CylinderGeometry(0.1, 0.01, 0.9, 20, 4, true); g.rotateZ(Math.PI / 2); g.translate(-0.45, 0, 0); return g })(),
}))
/**
 * 喷水滑车：铝板底座坐在两根不锈钢滑条上，托架上横放一只装了水、打足气的饮料瓶，瓶嘴朝后，带一只红色阀门；
 * 顶上立着 5 cm 宽的遮光片。原点在滑车中心正下方的冰面上，车头朝 +x。
 * level：瓶里还剩多少水（0–1）；jet：喷水的强弱（0–1）；load：前面压几块 1 kg 的配重
 */
export function JetSled({ level, jet, load = 0 }: { level: RefObject<number>; jet: RefObject<number>; load?: number }) {
  const G = SLED_G(), water = useRef<THREE.Mesh>(null), spray = useRef<THREE.Group>(null), valve = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const l = Math.max(0.02, level.current ?? 0), j = jet.current ?? 0
    if (water.current) { water.current.scale.set(l, 1, 1); water.current.position.set((1 - l) * 0.043, 0, 0); water.current.visible = l > 0.03 }
    if (spray.current) { spray.current.visible = j > 0.02; const f = 1 + Math.sin(clock.elapsedTime * 50) * 0.06; spray.current.scale.set(j * f, 0.6 + 0.4 * j, 0.6 + 0.4 * j) }
    if (valve.current) valve.current.rotation.y = j > 0.02 ? 0 : Math.PI / 2
  })
  return <group>
    {[-0.105, 0.105].map(z => <mesh key={z} geometry={G.runner} position-z={z} castShadow><Metal kind="stainless" rough={0.15} /></mesh>)}
    {[-0.2, 0.18].flatMap(x => [-0.105, 0.105].map(z => <mesh key={`${x}${z}`} position={[x, 0.03, z]}><boxGeometry args={[0.02, 0.03, 0.02]} /><Metal kind="aluminum" /></mesh>))}
    <RoundedBox args={[0.5, 0.012, 0.25]} radius={0.004} smoothness={2} position={[-0.01, 0.05, 0]} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" /></RoundedBox>
    {/* 两道托架和绑带 */}
    {[-0.12, 0.08].map(x => <group key={x} position={[x, 0, 0]}>
      <mesh position={[0, 0.072, 0]} castShadow><boxGeometry args={[0.03, 0.036, 0.11]} />{black}</mesh>
      <mesh position-y={SLED.axis} rotation-y={Math.PI / 2}><torusGeometry args={[0.0475, 0.0022, 6, 36]} /><meshStandardMaterial color="#d2452f" roughness={0.7} /></mesh>
    </group>)}
    {/* 瓶子、瓶里的水、瓶嘴上的阀门和喷嘴 */}
    <group position={[SLED.nozzle + 0.06, SLED.axis, 0]} rotation-z={-Math.PI / 2}>
      <mesh ref={water} geometry={G.water}><meshPhysicalMaterial color="#4f9fe0" transparent opacity={0.75} roughness={0.1} /></mesh>
      <mesh geometry={G.bottle} renderOrder={3} castShadow><meshPhysicalMaterial color="#dff0f7" transparent opacity={0.3} roughness={0.05} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} envMapIntensity={1.6} /></mesh>
    </group>
    <mesh position={[SLED.nozzle + 0.045, SLED.axis, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.017, 0.017, 0.035, 20]} /><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={[SLED.nozzle + 0.012, SLED.axis, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.006, 0.012, 0.03, 16]} /><Metal kind="brass" grain="turned" /></mesh>
    <mesh ref={valve} position={[SLED.nozzle + 0.045, SLED.axis + 0.03, 0]}><boxGeometry args={[0.012, 0.008, 0.06]} />{plastic('#c2362c', 0.4)}</mesh>
    <group ref={spray} position={[SLED.nozzle, SLED.axis, 0]} rotation-z={0.07} visible={false}>
      <mesh geometry={G.spray}><meshBasicMaterial color="#bfe2ff" transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={G.spray} scale={[0.8, 0.4, 0.4]}><meshBasicMaterial color="#ffffff" transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    </group>
    {/* 遮光片 */}
    <mesh position={[0.05, 0.19, 0.07]} castShadow><cylinderGeometry args={[0.004, 0.004, 0.27, 10]} /><Metal kind="stainless" /></mesh>
    <mesh position={[0.05, SLED.flagY, 0.07]} castShadow><boxGeometry args={[JET.flag, 0.09, 0.002]} />{black}</mesh>
    {/* 配重：开槽的铁砝码，叠在车头 */}
    {Array.from({ length: load }, (_, i) => <mesh key={i} geometry={G.weight} position={[0.18, 0.068 + i * 0.025, -0.02]} castShadow><Metal kind="iron" grain="cast" /></mesh>)}
  </group>
}
/** 跨在冰道上的光电门：两根立柱、一根横梁，立柱内侧对着的发射头和接收头，横梁上一块显示屏。原点在冰道中线上，冰道沿 x 方向 */
export function IceGate({ text = '0.0' }: { text?: string }) {
  return <group>
    {[-0.36, 0.36].map(z => <group key={z} position-z={z}>
      <mesh position-y={0.012} castShadow><cylinderGeometry args={[0.09, 0.1, 0.024, 28]} /><Metal kind="iron" grain="cast" /></mesh>
      <mesh position-y={0.24} castShadow><cylinderGeometry args={[0.011, 0.011, 0.46, 14]} /><Metal kind="stainless" /></mesh>
      <RoundedBox args={[0.05, 0.05, 0.06]} radius={0.008} smoothness={2} position={[0, SLED.flagY, -Math.sign(z) * 0.03]} castShadow>{black}</RoundedBox>
      <mesh position={[0, SLED.flagY, -Math.sign(z) * 0.061]}><sphereGeometry args={[0.007, 10, 8]} /><meshBasicMaterial color={z > 0 ? '#ff3b30' : '#30343a'} toneMapped={false} /></mesh>
    </group>)}
    <mesh position-y={0.47} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.011, 0.011, 0.76, 14]} /><Metal kind="stainless" /></mesh>
    <group position={[0, 0.56, 0]} rotation-y={0.5}>
      <RoundedBox args={[0.05, 0.13, 0.3]} radius={0.012} smoothness={3} castShadow>{plastic('#30363c', 0.6)}</RoundedBox>
      <Led text={text} w={0.24} h={0.09} position={[-0.0255, 0, 0]} rotation-y={-Math.PI / 2} />
    </group>
  </group>
}

// ---------- 弹簧 ----------
const SPRING_G = once(() => {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 160; i++) { const k = i / 160; pts.push(new THREE.Vector3(k - 0.5, Math.cos(k * Math.PI * 2 * 7) * 0.03, Math.sin(k * Math.PI * 2 * 7) * 0.03)) }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.0035, 8)
})
/** 一根压缩弹簧，轴线沿 x，中点在原点。len：现在的长度（m），每帧读一次 */
export function Spring({ len }: { len: RefObject<number> }) {
  const m = useRef<THREE.Mesh>(null)
  useFrame(() => { if (m.current) m.current.scale.x = Math.max(0.02, len.current ?? 0.1) })
  return <mesh ref={m} geometry={SPRING_G()} castShadow><Metal kind="steel" rough={0.25} /></mesh>
}

// ---------- 长板和电动小车 ----------
const boardTex = once(() => makeWood('#c9a877', '110,76,38', 19))
/** 长板：2 m 长的胶合板，底下四只滑垫；板面上每 10 cm 一道刻线。原点在板中点正下方的冰面上，板沿 x 方向。板面高度是 BOARD_Y */
export const BOARD_Y = 0.04
export function Board() {
  const map = useMemo(() => rep(boardTex(), 3, 1), [])
  return <group>
    <RoundedBox args={[BOAT.L, 0.022, 0.3]} radius={0.006} smoothness={2} position={[0, BOARD_Y - 0.011, 0]} castShadow receiveShadow><meshStandardMaterial map={map} roughness={0.6} /></RoundedBox>
    {[-0.85, 0.85].flatMap(x => [-0.1, 0.1].map(z => <mesh key={`${x}${z}`} position={[x, 0.009, z]}><cylinderGeometry args={[0.03, 0.03, 0.018, 20]} /><meshStandardMaterial color="#eef0f1" roughness={0.3} /></mesh>))}
    {Array.from({ length: 21 }, (_, i) => <mesh key={i} position={[-1 + i * 0.1, BOARD_Y + 0.0005, 0.13]} rotation-x={-Math.PI / 2}><planeGeometry args={[i % 5 ? 0.003 : 0.006, i % 5 ? 0.025 : 0.04]} /><meshBasicMaterial color="#2a2019" /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[s * (BOAT.L / 2 - 0.006), BOARD_Y + 0.012, 0]} castShadow><boxGeometry args={[0.012, 0.024, 0.3]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
  </group>
}
/** 电动小车：黄色车壳、四只橡胶轮、车顶一只电池盒。heavy：车顶再压一块黄铜配重。原点在车中心正下方的板面上，车头朝 +x */
export function Car({ heavy = false, spin }: { heavy?: boolean; spin?: RefObject<number> }) {
  const wheels = useRef<(THREE.Mesh | null)[]>([])
  useFrame(() => { wheels.current.forEach(w => { if (w) w.rotation.y = (spin?.current ?? 0) / 0.028 }) })
  return <group>
    {[-0.06, 0.06].flatMap((x, i) => [-0.058, 0.058].map((z, j) => <group key={`${x}${z}`} position={[x, 0.028, z]} rotation-x={Math.PI / 2}>
      <mesh ref={e => { wheels.current[i * 2 + j] = e }} castShadow><cylinderGeometry args={[0.028, 0.028, 0.02, 24]} />{black}</mesh>
      <mesh position-y={z > 0 ? 0.0105 : -0.0105}><cylinderGeometry args={[0.012, 0.012, 0.002, 6]} /><meshStandardMaterial color="#c9ced3" roughness={0.4} metalness={0.8} /></mesh>
    </group>))}
    <RoundedBox args={[0.2, 0.045, 0.092]} radius={0.014} smoothness={3} position={[0, 0.052, 0]} castShadow>{plastic('#e0b423', 0.35)}</RoundedBox>
    <RoundedBox args={[0.09, 0.03, 0.07]} radius={0.008} smoothness={2} position={[-0.03, 0.089, 0]} castShadow>{plastic('#2b2f34', 0.5)}</RoundedBox>
    <mesh position={[0.101, 0.055, 0]}><boxGeometry args={[0.004, 0.02, 0.06]} /><meshStandardMaterial color="#f4f1e4" roughness={0.3} /></mesh>
    {heavy && <RoundedBox args={[0.07, 0.04, 0.07]} radius={0.004} smoothness={2} position={[0.055, 0.095, 0]} castShadow><Metal kind="brass" grain="brushed" /></RoundedBox>}
  </group>
}
