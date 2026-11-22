// 光合作用和呼吸作用实验室里反复用到的器材：花盆和叶子、钟罩、台灯、烧杯、蜡烛、气泡。都是用基本形状拼的。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { lathe, shell } from '@/lab-kit'

export const GLASS = { color: '#cfe6ee', transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0, depthWrite: false } as const
export const C = { leaf: '#3f9b4b', leafDark: '#2f7d3c', pale: '#e9dfb0', blue: '#27357f', stem: '#6f8f4a', pot: '#b5613c', soil: '#4a3524', water: '#7fc4dc', wood: '#8b6a45' }
type V3 = [number, number, number]

/** 叶片的轮廓：边缘一圈圆圆的波浪，叶柄那里凹进去一个小缺口。half 只取左半或右半 */
const blades = new Map<string, THREE.ShapeGeometry>()
function blade(half?: 'l' | 'r') {
  const key = half ?? 'all'
  if (!blades.has(key)) {
    const a0 = half === 'l' ? Math.PI / 2 : half === 'r' ? -Math.PI / 2 : -Math.PI, a1 = half === 'l' ? Math.PI * 1.5 : half === 'r' ? Math.PI / 2 : Math.PI, N = half ? 40 : 80, sh = new THREE.Shape()
    for (let i = 0; i <= N; i++) {
      const t = a0 + (a1 - a0) * i / N, notch = Math.exp(-((Math.abs(((t + Math.PI * 1.5) % (Math.PI * 2)) - Math.PI)) ** 2) / 0.05)   // 缺口朝下（−y）
      const r = 1 + 0.07 * Math.cos(t * 9) - 0.42 * notch, x = Math.cos(t) * r, y = Math.sin(t) * r
      if (i) sh.lineTo(x, y); else sh.moveTo(x, y)
    }
    if (half) sh.lineTo(0, a1 > Math.PI ? -0.58 : 1.07)
    blades.set(key, new THREE.ShapeGeometry(sh))
  }
  return blades.get(key)!
}
/** 一片叶子：波浪边的圆叶，中间一道主脉和几条侧脉。half 只画左半或右半（第 1 课一片叶子两半颜色不同） */
export function Leaf({ r = 0.12, color = C.leaf, half, ...rest }: { r?: number; color?: string; half?: 'l' | 'r' } & Record<string, unknown>) {
  const vein = useMemo(() => new THREE.Color(color).lerp(new THREE.Color('#f2f5d8'), 0.35), [color])
  return (
    <group {...rest} scale={r}>
      <mesh geometry={blade(half)} castShadow><meshStandardMaterial color={color} roughness={0.62} side={THREE.DoubleSide} /></mesh>
      {!half && [[0, -0.5, 0, 1.4], [0.28, 0.05, -0.8, 0.7], [-0.28, 0.05, 0.8, 0.7], [0.3, -0.3, -1.2, 0.55], [-0.3, -0.3, 1.2, 0.55]].map(([x, y, rot, len], i) => (
        <mesh key={i} position={[x, y + len / 2 * Math.cos(rot) * (i ? 1 : 1), 0.004]} rotation-z={rot}><planeGeometry args={[i ? 0.022 : 0.035, len]} /><meshBasicMaterial color={vein} transparent opacity={0.55} side={THREE.DoubleSide} /></mesh>
      ))}
    </group>
  )
}

/** 一盆天竺葵：花盆、茎、一圈叶子。leaf 是叶子的颜色；rim 给叶子加一圈浅色的边（银边天竺葵） */
export function Plant({ position, s = 1, leaf = C.leaf, rim, n = 9 }: { position: V3; s?: number; leaf?: string; rim?: string; n?: number }) {
  const leaves = useMemo(() => Array.from({ length: n }, (_, i) => { const a = i * 2.4, h = 0.3 + (i % 4) * 0.07, d = 0.11 + (i % 3) * 0.04; return { p: [Math.cos(a) * d, h, Math.sin(a) * d] as V3, ry: -a, tilt: 0.9 + (i % 3) * 0.2 } }), [n])
  return (
    <group position={position} scale={s}>
      <mesh geometry={POT.saucer} castShadow><meshStandardMaterial color="#a4552f" roughness={0.85} /></mesh>
      <mesh geometry={POT.pot} position={[0, 0.012, 0]} castShadow><meshStandardMaterial color={C.pot} roughness={0.85} /></mesh>
      <mesh position={[0, 0.172, 0]}><cylinderGeometry args={[0.116, 0.116, 0.012, 24]} /><meshStandardMaterial color={C.soil} roughness={1} /></mesh>
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

// 花盆：有壁厚的陶盆，盆口一圈加厚的沿；底下一只浅托盘
const POT = { pot: shell([[0, 0], [0.09, 0], [0.095, 0.006], [0.122, 0.15], [0.136, 0.15], [0.138, 0.154], [0.138, 0.178], [0.134, 0.182]], 0.012, { segs: 36 }), saucer: shell([[0, 0], [0.12, 0], [0.135, 0.014], [0.14, 0.022]], 0.008, { segs: 36 }) }
/** 钟罩和烧杯用的玻璃：有反光，不遮里面的东西 */
const Glass = ({ opacity = 0.07 }: { opacity?: number }) => <meshPhysicalMaterial color="#eaf6f9" transparent opacity={opacity} roughness={0.03} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={0.9} depthWrite={false} side={THREE.DoubleSide} />

/** 玻璃钟罩：一段圆筒加一个半球顶。shade 是罩在外面的黑布（放在暗处） */
export function BellJar({ position, r = 0.3, h = 0.5, shade = false, children }: { position: V3; r?: number; h?: number; shade?: boolean; children?: ReactNode }) {
  // 罩身：直筒往上收成圆顶，顶上一截细颈托着提钮；罩口向外翻一道沿。底下一块带凹槽的底板
  const jar = useMemo(() => { const p: [number, number][] = [[r + 0.02, 0], [r + 0.02, 0.012], [r, 0.02], [r, h]]; for (let i = 1; i <= 10; i++) { const a = i / 10 * Math.PI / 2 * 0.94; p.push([r * Math.cos(a), h + r * Math.sin(a)]) } p.push([0.022, h + r + 0.012]); return shell(p, 0.008, { segs: 48, crease: 50 }) }, [r, h])
  const plate = useMemo(() => lathe([[0, 0], [r + 0.07, 0], [r + 0.075, 0.004], [r + 0.075, 0.014], [r + 0.07, 0.018], [0, 0.018]], { segs: 48 }), [r])
  return (
    <group position={position}>
      {children}
      <mesh geometry={jar} renderOrder={3}><Glass /></mesh>
      <mesh position={[0, h + r + 0.045, 0]} renderOrder={3}><sphereGeometry args={[0.04, 20, 14]} /><Glass opacity={0.3} /></mesh>
      <mesh geometry={plate} receiveShadow><meshPhysicalMaterial color="#e3e7e8" roughness={0.25} clearcoat={0.6} /></mesh>
      {shade && <mesh position={[0, (h + r) / 2 + 0.01, 0]}><cylinderGeometry args={[r * 0.75, r + 0.03, h + r + 0.02, 24]} /><meshStandardMaterial color="#15171a" transparent opacity={0.82} roughness={1} /></mesh>}
    </group>
  )
}

const LAMP = { base: lathe([[0, 0], [0.12, 0], [0.125, 0.006], [0.125, 0.018], [0.1, 0.03], [0.03, 0.036], [0.02, 0.05], [0, 0.05]], { segs: 36 }), shade: shell([[0.13, 0], [0.12, 0.05], [0.07, 0.13], [0.03, 0.16], [0.028, 0.19]], 0.004, { segs: 36 }) }
/** 台灯：底座、立杆、灯罩；开着的时候灯泡发亮并带一盏真的灯 */
export function Lamp({ position, on, h = 0.9, toward = 1 }: { position: V3; on: boolean; h?: number; toward?: 1 | -1 }) {
  return (
    <group position={position}>
      <mesh geometry={LAMP.base} castShadow><meshPhysicalMaterial color="#262b30" roughness={0.4} clearcoat={0.6} /></mesh>
      <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.011, 0.011, h, 12]} /><meshStandardMaterial color="#c4cacf" metalness={1} roughness={0.25} /></mesh>
      <mesh position={[0, h, 0]}><sphereGeometry args={[0.022, 14, 10]} /><meshStandardMaterial color="#262b30" roughness={0.5} /></mesh>
      <group position={[toward * 0.1, h, 0]} rotation-z={toward * 0.9}>
        <mesh geometry={LAMP.shade} position={[0, -0.08, 0]} castShadow><meshPhysicalMaterial color="#262b30" roughness={0.4} clearcoat={0.6} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, -0.05, 0]}><sphereGeometry args={[0.05, 14, 12]} /><meshBasicMaterial color={on ? '#fff3c4' : '#6b6f72'} toneMapped={false} /></mesh>
        {on && <pointLight position={[0, -0.1, 0]} intensity={2.2} distance={3} decay={1.6} color="#fff0c8" />}
      </group>
    </group>
  )
}

/** 烧杯或水槽：一段玻璃圆筒，里面装到 fill 高的液体 */
export function Beaker({ position, r = 0.1, h = 0.18, fill = 0.6, liquid = C.water, opacity = 0.55 }: { position: V3; r?: number; h?: number; fill?: number; liquid?: string; opacity?: number }) {
  const glass = useMemo(() => shell([[0, 0], [r - 0.008, 0], [r, 0.008], [r, h - 0.008], [r + 0.006, h]], Math.min(0.006, r * 0.08), { segs: 40 }), [r, h])
  return (
    <group position={position}>
      <mesh geometry={glass} renderOrder={3}><Glass opacity={0.1} /></mesh>
      {fill > 0 && <mesh position={[0, h * fill / 2 + 0.003, 0]}><cylinderGeometry args={[r * 0.93, r * 0.9, h * fill, 32]} /><meshStandardMaterial color={liquid} transparent opacity={opacity} roughness={0.1} depthWrite={false} /></mesh>}
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
