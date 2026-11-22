// 原电池实验室里反复用到的器材：烧杯、电极片、电流表、小灯泡、导线和里面跑的电子、气泡。都是用基本形状拼的。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { lathe, makeGrain, shell, useSlide } from '@/lab-kit'
import { METALS, type MetalKey } from './physics'

type V3 = [number, number, number]
/** 没有壁厚的玻璃件（钟罩、管子）用的便宜玻璃 */
export const GLASS = { color: '#cfe6ee', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false } as const
export const LIQUID = { acid: '#cfe3ee', alcohol: '#f1f0e4', copper: '#3d8fd9', zinc: '#e4ecef', juice: '#f0e08a' }

/** 烧杯：有壁厚的玻璃杯，杯口向外翻一道沿，杯身上几道刻度线；里面的液体顶上是一层略亮的液面 */
export function Beaker({ position, r = 0.24, h = 0.36, fill = 0.7, liquid = LIQUID.acid }: { position: V3; r?: number; h?: number; fill?: number; liquid?: string }) {
  const glass = useMemo(() => shell([[0, 0], [r - 0.02, 0], [r, 0.02], [r, h - 0.02], [r + 0.012, h - 0.004], [r + 0.016, h]], 0.009, { segs: 48 }), [r, h])
  return (
    <group position={position}>
      <mesh geometry={glass} renderOrder={3}><meshPhysicalMaterial color="#dff1f6" transparent opacity={0.2} roughness={0.03} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={2.2} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      {[0.3, 0.45, 0.6, 0.75].map((k, i) => <mesh key={k} position={[0, h * k, 0]} rotation-y={-0.5}><cylinderGeometry args={[r + 0.001, r + 0.001, 0.003, 24, 1, true, 0, i % 2 ? 0.35 : 0.6]} /><meshBasicMaterial color="#f4f7f8" transparent opacity={0.75} side={THREE.DoubleSide} /></mesh>)}
      {fill > 0 && <>
        <mesh position={[0, h * fill / 2 + 0.012, 0]}><cylinderGeometry args={[r - 0.012, r - 0.02, h * fill, 40]} /><meshPhysicalMaterial color={liquid} transparent opacity={0.5} roughness={0.08} clearcoat={0.6} depthWrite={false} /></mesh>
        <mesh position={[0, h * fill + 0.013, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[r - 0.03, r - 0.011, 40]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.35} depthWrite={false} /></mesh>
      </>}
    </group>
  )
}

/** 一片电极：有厚度的金属片，表面是拉丝的纹路，上端打一个孔；顶上夹着一只鳄鱼夹 */
export function Plate({ position, metal, h = 0.44 }: { position: V3; metal: MetalKey; h?: number }) {
  const grain = useMemo(() => makeGrain('brushed', [1, 3]), [])
  const carbon = metal === 'C'
  return (
    <group position={position}>
      <RoundedBox args={[0.026, h, 0.13]} radius={0.006} smoothness={3} position={[0, h / 2, 0]} castShadow>
        <meshStandardMaterial color={METALS[metal].color} metalness={carbon ? 0.15 : 1} roughness={carbon ? 0.85 : 0.55} roughnessMap={carbon ? null : grain} envMapIntensity={1.4} />
      </RoundedBox>
      <mesh position={[0, h - 0.035, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.028, 14]} /><meshStandardMaterial color="#1a1d20" roughness={0.9} /></mesh>
      {/* 鳄鱼夹：两片夹嘴、一截胶套 */}
      {[-1, 1].map(k => <mesh key={k} position={[k * 0.02, h + 0.004, 0]} rotation-z={k * 0.16}><boxGeometry args={[0.008, 0.07, 0.034]} /><meshStandardMaterial color="#c8ccd0" metalness={1} roughness={0.3} /></mesh>)}
      <mesh position={[0, h + 0.07, 0]}><cylinderGeometry args={[0.017, 0.024, 0.07, 14]} /><meshStandardMaterial color="#c9453a" roughness={0.55} /></mesh>
    </group>
  )
}

/** 电流表：指针偏多少由 value 决定（−1 到 1，0 在正中）。斜面的表壳，玻璃表窗，底下两只接线柱 */
export function Meter({ position, value }: { position: V3; value: number }) {
  const a = useSlide(Math.max(-1, Math.min(1, value)) * 0.9, 2.5)
  const post = useMemo(() => lathe([[0, 0], [0.016, 0], [0.016, 0.01], [0.009, 0.012], [0.009, 0.022], [0.017, 0.024], [0.019, 0.027], [0.019, 0.04], [0.017, 0.043], [0, 0.043]], { segs: 18 }), [])
  return (
    <group position={position}>
      <RoundedBox args={[0.36, 0.05, 0.2]} radius={0.012} smoothness={3} position={[0, 0.025, 0.02]} castShadow><meshStandardMaterial color="#2a3036" roughness={0.6} /></RoundedBox>
      <group position={[0, 0.05, -0.02]} rotation-x={-0.22}>
        <RoundedBox args={[0.34, 0.25, 0.1]} radius={0.02} smoothness={4} position={[0, 0.125, 0]} castShadow><meshPhysicalMaterial color="#1c2227" roughness={0.45} clearcoat={0.5} clearcoatRoughness={0.3} /></RoundedBox>
        <mesh position={[0, 0.14, 0.051]}><planeGeometry args={[0.28, 0.17]} /><meshBasicMaterial color="#f4f1e6" toneMapped={false} /></mesh>
        {Array.from({ length: 21 }, (_, i) => -0.9 + i * 0.09).map((t, i) => <mesh key={i} position={[Math.sin(t) * 0.118, 0.09 + Math.cos(t) * 0.118, 0.0525]} rotation-z={-t}><planeGeometry args={[i % 5 === 0 ? 0.005 : 0.0025, i % 5 === 0 ? 0.022 : 0.012]} /><meshBasicMaterial color="#30343a" /></mesh>)}
        <mesh position={[0, 0.073, 0.0525]}><circleGeometry args={[0.014, 16]} /><meshBasicMaterial color="#30343a" /></mesh>
        <group position={[0, 0.09, 0.054]} rotation-z={-a}><mesh position={[0, 0.055, 0]}><planeGeometry args={[0.006, 0.12]} /><meshBasicMaterial color="#d2362f" toneMapped={false} /></mesh></group>
        <mesh position={[0, 0.14, 0.056]}><planeGeometry args={[0.28, 0.17]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.12} roughness={0.02} clearcoat={1} envMapIntensity={2} depthWrite={false} /></mesh>
      </group>
      {[-0.11, 0.11].map(x => <mesh key={x} geometry={post} position={[x, 0.05, 0.085]}><meshStandardMaterial color={x < 0 ? '#22272b' : '#c9453a'} roughness={0.5} /></mesh>)}
    </group>
  )
}

/** 小灯泡：on 是亮度（0–1）。拧在一只带底板的灯座上，玻璃泡里看得见灯丝 */
export function Bulb({ position, on }: { position: V3; on: number }) {
  const g = useMemo(() => ({
    glass: lathe([[0, 0.05], [0.02, 0.05], [0.024, 0.07], [0.044, 0.1], [0.05, 0.125], [0.044, 0.152], [0.026, 0.17], [0, 0.175]], { segs: 28, crease: 60 }),
    screw: lathe([[0, 0], [0.022, 0], [0.024, 0.006], [0.022, 0.012], [0.024, 0.018], [0.022, 0.024], [0.024, 0.03], [0.022, 0.036], [0.022, 0.05], [0, 0.05]], { segs: 20 }),
    seat: lathe([[0, 0], [0.04, 0], [0.042, 0.004], [0.042, 0.022], [0.03, 0.03], [0, 0.03]], { segs: 24 }),
  }), [])
  const k = Math.min(1, on)
  return (
    <group position={position}>
      <RoundedBox args={[0.14, 0.014, 0.1]} radius={0.005} smoothness={2} position={[0, 0.007, 0]} castShadow><meshStandardMaterial color="#2a3036" roughness={0.6} /></RoundedBox>
      <mesh geometry={g.seat} position={[0, 0.014, 0]}><meshStandardMaterial color="#e9e6dc" roughness={0.5} /></mesh>
      <mesh geometry={g.screw} position={[0, 0.03, 0]}><meshStandardMaterial color="#b9a36a" metalness={1} roughness={0.35} /></mesh>
      <mesh position={[0, 0.125, 0]}><torusGeometry args={[0.012, 0.0025, 6, 14, Math.PI]} /><meshBasicMaterial color={new THREE.Color('#6a5a3a').lerp(new THREE.Color('#fff6c8'), k)} toneMapped={false} /></mesh>
      <mesh geometry={g.glass} position={[0, 0.03, 0]} renderOrder={3}><meshPhysicalMaterial color={new THREE.Color('#e9f1f4').lerp(new THREE.Color('#fff1a8'), k)} emissive="#ffe9a0" emissiveIntensity={k * 1.6} transparent opacity={0.28 + k * 0.5} roughness={0.03} clearcoat={1} envMapIntensity={2} depthWrite={false} toneMapped={false} /></mesh>
      {on > 0.05 && <pointLight position={[0, 0.15, 0]} intensity={1.2 * on} distance={1.6} color="#fff0b0" />}
    </group>
  )
}

/** 一根导线：经过几个点的一条细管。flow 不为 0 时里面有电子在跑（正数顺着点的顺序，负数反过来） */
export function Wire({ points, flow = 0, color = '#c9453a', cut = false }: { points: V3[]; flow?: number; color?: string; cut?: boolean }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.2), [points])
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 80, 0.01, 10), [curve])
  const ref = useRef<THREE.Group>(null), v = useMemo(() => new THREE.Vector3(), []), n = 9
  useFrame(({ clock }) => { ref.current?.children.forEach((m, i) => { const k = (((clock.elapsedTime * 0.25 * Math.sign(flow) + i / n) % 1) + 1) % 1; curve.getPointAt(k, v); m.position.copy(v) }) })
  return (
    <group>
      <mesh geometry={geo} castShadow={!cut}><meshPhysicalMaterial color={color} roughness={0.5} clearcoat={0.4} transparent opacity={cut ? 0.25 : 1} /></mesh>
      {flow !== 0 && <group ref={ref}>{Array.from({ length: n }, (_, i) => <mesh key={i}><sphereGeometry args={[0.018, 10, 8]} /><meshBasicMaterial color="#ffe14d" toneMapped={false} /></mesh>)}</group>}
    </group>
  )
}

/** 贴着电极片往上冒的气泡 */
export function Bubbles({ at, top, rate, n = 10 }: { at: V3; top: number; rate: number; n?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { ref.current?.children.forEach((m, i) => { const k = (clock.elapsedTime * 0.5 + i / n) % 1; m.visible = rate > 0 && i < n * Math.min(1, rate); m.position.set(at[0] + Math.sin(i * 5.3) * 0.025, at[1] + (top - at[1]) * k, at[2] + Math.cos(i * 3.7) * 0.05) }) })
  return <group ref={ref}>{Array.from({ length: n }, (_, i) => <mesh key={i} visible={false}><sphereGeometry args={[0.011, 8, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.9} toneMapped={false} /></mesh>)}</group>
}
