// 光合作用和呼吸作用实验室里反复用到的器材：花盆和叶子、钟罩、台灯、烧杯、蜡烛、气泡。都是用基本形状拼的。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const GLASS = { color: '#cfe6ee', transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0, depthWrite: false } as const
export const C = { leaf: '#3f9b4b', leafDark: '#2f7d3c', pale: '#e9dfb0', blue: '#27357f', stem: '#6f8f4a', pot: '#b5613c', soil: '#4a3524', water: '#7fc4dc', wood: '#8b6a45' }
type V3 = [number, number, number]

/** 一片叶子：一张略微上翘的圆片。half 只画左半或右半（第 1 课一片叶子两半颜色不同） */
export function Leaf({ r = 0.12, color = C.leaf, half, ...rest }: { r?: number; color?: string; half?: 'l' | 'r' } & Record<string, unknown>) {
  const args: [number, number, number, number] = half === 'l' ? [r, 20, Math.PI / 2, Math.PI] : half === 'r' ? [r, 20, -Math.PI / 2, Math.PI] : [r, 28, 0, Math.PI * 2]
  return <mesh {...rest} castShadow><circleGeometry args={args} /><meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} /></mesh>
}

/** 一盆天竺葵：花盆、茎、一圈叶子。leaf 是叶子的颜色；rim 给叶子加一圈浅色的边（银边天竺葵） */
export function Plant({ position, s = 1, leaf = C.leaf, rim, n = 9 }: { position: V3; s?: number; leaf?: string; rim?: string; n?: number }) {
  const leaves = useMemo(() => Array.from({ length: n }, (_, i) => { const a = i * 2.4, h = 0.3 + (i % 4) * 0.07, d = 0.11 + (i % 3) * 0.04; return { p: [Math.cos(a) * d, h, Math.sin(a) * d] as V3, ry: -a, tilt: 0.9 + (i % 3) * 0.2 } }), [n])
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.09, 0]} castShadow><cylinderGeometry args={[0.13, 0.095, 0.18, 20]} /><meshStandardMaterial color={C.pot} roughness={0.85} /></mesh>
      <mesh position={[0, 0.175, 0]}><cylinderGeometry args={[0.12, 0.12, 0.012, 20]} /><meshStandardMaterial color={C.soil} roughness={1} /></mesh>
      <mesh position={[0, 0.32, 0]}><cylinderGeometry args={[0.012, 0.016, 0.3, 8]} /><meshStandardMaterial color={C.stem} /></mesh>
      {leaves.map((l, i) => (
        <group key={i} position={l.p} rotation={[0, l.ry, 0]}>
          <group rotation={[-l.tilt, 0, 0]}>
            {rim && <Leaf r={0.1} color={rim} position={[0, 0, -0.002]} />}
            <Leaf r={rim ? 0.068 : 0.1} color={i % 2 ? leaf : leaf === C.leaf ? C.leafDark : leaf} />
          </group>
        </group>
      ))}
    </group>
  )
}

/** 玻璃钟罩：一段圆筒加一个半球顶。shade 是罩在外面的黑布（放在暗处） */
export function BellJar({ position, r = 0.3, h = 0.5, shade = false, children }: { position: V3; r?: number; h?: number; shade?: boolean; children?: ReactNode }) {
  return (
    <group position={position}>
      {children}
      <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[r, r, h, 32, 1, true]} /><meshStandardMaterial {...GLASS} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, h, 0]}><sphereGeometry args={[r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial {...GLASS} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, h + r + 0.03, 0]}><sphereGeometry args={[0.035, 12, 10]} /><meshStandardMaterial color="#9fb7c0" roughness={0.2} /></mesh>
      <mesh position={[0, 0.008, 0]}><cylinderGeometry args={[r + 0.05, r + 0.05, 0.016, 32]} /><meshStandardMaterial color="#d9dedf" roughness={0.4} /></mesh>
      {shade && <mesh position={[0, (h + r) / 2 + 0.01, 0]}><cylinderGeometry args={[r * 0.75, r + 0.03, h + r + 0.02, 24]} /><meshStandardMaterial color="#15171a" transparent opacity={0.82} roughness={1} /></mesh>}
    </group>
  )
}

/** 台灯：底座、立杆、灯罩；开着的时候灯泡发亮并带一盏真的灯 */
export function Lamp({ position, on, h = 0.9, toward = 1 }: { position: V3; on: boolean; h?: number; toward?: 1 | -1 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.015, 0]} castShadow><cylinderGeometry args={[0.11, 0.12, 0.03, 20]} /><meshStandardMaterial color="#2d3238" metalness={0.5} roughness={0.5} /></mesh>
      <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.012, 0.012, h, 8]} /><meshStandardMaterial color="#5a6068" metalness={0.6} roughness={0.4} /></mesh>
      <group position={[toward * 0.1, h, 0]} rotation-z={toward * 0.9}>
        <mesh><coneGeometry args={[0.12, 0.16, 20, 1, true]} /><meshStandardMaterial color="#2d3238" metalness={0.4} roughness={0.5} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, -0.05, 0]}><sphereGeometry args={[0.05, 14, 12]} /><meshBasicMaterial color={on ? '#fff3c4' : '#6b6f72'} toneMapped={false} /></mesh>
        {on && <pointLight position={[0, -0.1, 0]} intensity={2.2} distance={3} decay={1.6} color="#fff0c8" />}
      </group>
    </group>
  )
}

/** 烧杯或水槽：一段玻璃圆筒，里面装到 fill 高的液体 */
export function Beaker({ position, r = 0.1, h = 0.18, fill = 0.6, liquid = C.water, opacity = 0.55 }: { position: V3; r?: number; h?: number; fill?: number; liquid?: string; opacity?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[r, r, h, 28, 1, true]} /><meshStandardMaterial {...GLASS} side={THREE.DoubleSide} /></mesh>
      {fill > 0 && <mesh position={[0, h * fill / 2 + 0.003, 0]}><cylinderGeometry args={[r * 0.96, r * 0.96, h * fill, 28]} /><meshStandardMaterial color={liquid} transparent opacity={opacity} roughness={0.1} depthWrite={false} /></mesh>}
    </group>
  )
}

/** 蜡烛：烧着的时候有一朵火苗 */
export function Candle({ position, lit, h = 0.14 }: { position: V3; lit: boolean; h?: number }) {
  const flame = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (flame.current) flame.current.scale.y = 1 + Math.sin(clock.elapsedTime * 11) * 0.12 })
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.022, 0.022, h, 12]} /><meshStandardMaterial color="#efe6d2" roughness={0.6} /></mesh>
      <mesh position={[0, h + 0.008, 0]}><cylinderGeometry args={[0.002, 0.002, 0.016, 5]} /><meshBasicMaterial color="#222" /></mesh>
      {lit && <mesh ref={flame} position={[0, h + 0.04, 0]}><coneGeometry args={[0.014, 0.05, 10]} /><meshBasicMaterial color="#ffb347" toneMapped={false} /></mesh>}
      {lit && <pointLight position={[0, h + 0.05, 0]} intensity={0.35} distance={1} color="#ffb060" />}
    </group>
  )
}

/** 一串往上冒的气泡：rate 是每秒冒几个（0 就不冒），从 from 升到 top 的高度 */
export function Bubbles({ from, top, rate, color = '#ffffff', size = 0.012, spread = 0.02, n = 14 }: { from: V3; top: number; rate: number; color?: string; size?: number; spread?: number; n?: number }) {
  const ref = useRef<THREE.Group>(null), t = useRef(0)
  useFrame((_, dt) => {
    t.current += dt * rate
    ref.current?.children.forEach((m, i) => {
      const ph = t.current / n * 4 - i / n, k = ((ph % 1) + 1) % 1
      m.visible = rate > 0 && ph > 0
      m.position.set(from[0] + Math.sin(i * 7.3 + k * 6) * spread, from[1] + (top - from[1]) * k, from[2] + Math.cos(i * 4.1) * spread)
    })
  })
  return <group ref={ref}>{Array.from({ length: n }, (_, i) => <mesh key={i} visible={false}><sphereGeometry args={[size, 8, 6]} /><meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} /></mesh>)}</group>
}
