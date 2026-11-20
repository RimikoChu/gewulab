// 原电池实验室里反复用到的器材：烧杯、电极片、电流表、小灯泡、导线和里面跑的电子、气泡。都是用基本形状拼的。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSlide } from '@/lab-kit'
import { METALS, type MetalKey } from './physics'

type V3 = [number, number, number]
export const GLASS = { color: '#cfe6ee', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false } as const
export const LIQUID = { acid: '#cfe3ee', alcohol: '#f1f0e4', copper: '#3d8fd9', zinc: '#e4ecef', juice: '#f0e08a' }

export function Beaker({ position, r = 0.24, h = 0.36, fill = 0.7, liquid = LIQUID.acid }: { position: V3; r?: number; h?: number; fill?: number; liquid?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[r, r, h, 32, 1, true]} /><meshStandardMaterial {...GLASS} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.006, 0]}><cylinderGeometry args={[r, r, 0.012, 32]} /><meshStandardMaterial {...GLASS} opacity={0.35} /></mesh>
      {fill > 0 && <mesh position={[0, h * fill / 2 + 0.012, 0]}><cylinderGeometry args={[r * 0.96, r * 0.96, h * fill, 32]} /><meshStandardMaterial color={liquid} transparent opacity={0.5} roughness={0.1} depthWrite={false} /></mesh>}
    </group>
  )
}

/** 一片电极：金属片，顶上一个接线的小夹子 */
export function Plate({ position, metal, h = 0.44 }: { position: V3; metal: MetalKey; h?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow><boxGeometry args={[0.022, h, 0.13]} /><meshStandardMaterial color={METALS[metal].color} metalness={metal === 'C' ? 0.1 : 0.75} roughness={metal === 'C' ? 0.8 : 0.35} /></mesh>
      <mesh position={[0, h + 0.012, 0]}><boxGeometry args={[0.04, 0.03, 0.05]} /><meshStandardMaterial color="#c9453a" roughness={0.5} /></mesh>
    </group>
  )
}

/** 电流表：指针偏多少由 value 决定（−1 到 1，0 在正中） */
export function Meter({ position, value }: { position: V3; value: number }) {
  const a = useSlide(Math.max(-1, Math.min(1, value)) * 0.9, 2.5)
  return (
    <group position={position}>
      <mesh position={[0, 0.13, 0]} castShadow><boxGeometry args={[0.34, 0.26, 0.12]} /><meshStandardMaterial color="#20262b" roughness={0.6} /></mesh>
      <mesh position={[0, 0.15, 0.062]}><planeGeometry args={[0.28, 0.17]} /><meshBasicMaterial color="#f4f1e6" toneMapped={false} /></mesh>
      {[-0.9, -0.45, 0, 0.45, 0.9].map(t => <mesh key={t} position={[Math.sin(t) * 0.11, 0.1 + Math.cos(t) * 0.11, 0.064]} rotation-z={-t}><planeGeometry args={[0.006, 0.02]} /><meshBasicMaterial color="#30343a" /></mesh>)}
      <group position={[0, 0.1, 0.066]} rotation-z={-a}><mesh position={[0, 0.055, 0]}><planeGeometry args={[0.008, 0.11]} /><meshBasicMaterial color="#d2362f" toneMapped={false} /></mesh></group>
    </group>
  )
}

/** 小灯泡：on 是亮度（0–1） */
export function Bulb({ position, on }: { position: V3; on: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.03, 0.035, 0.06, 14]} /><meshStandardMaterial color="#8a8f94" metalness={0.7} roughness={0.4} /></mesh>
      <mesh position={[0, 0.1, 0]}><sphereGeometry args={[0.05, 16, 12]} /><meshBasicMaterial color={new THREE.Color('#5d6164').lerp(new THREE.Color('#fff1a8'), Math.min(1, on))} toneMapped={false} /></mesh>
      {on > 0.05 && <pointLight position={[0, 0.12, 0]} intensity={1.2 * on} distance={1.6} color="#fff0b0" />}
    </group>
  )
}

/** 一根导线：经过几个点的一条细管。flow 不为 0 时里面有电子在跑（正数顺着点的顺序，负数反过来） */
export function Wire({ points, flow = 0, color = '#c9453a', cut = false }: { points: V3[]; flow?: number; color?: string; cut?: boolean }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.2), [points])
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 60, 0.008, 6), [curve])
  const ref = useRef<THREE.Group>(null), v = useMemo(() => new THREE.Vector3(), []), n = 9
  useFrame(({ clock }) => { ref.current?.children.forEach((m, i) => { const k = (((clock.elapsedTime * 0.25 * Math.sign(flow) + i / n) % 1) + 1) % 1; curve.getPointAt(k, v); m.position.copy(v) }) })
  return (
    <group>
      <mesh geometry={geo}><meshStandardMaterial color={color} roughness={0.6} transparent opacity={cut ? 0.25 : 1} /></mesh>
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
