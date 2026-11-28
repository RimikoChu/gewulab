// 化验台上的器材（第 7 课）：表面皿和胆矾、滴瓶和滴管、烧杯和蔗糖、铁架台、试管、酒精灯、导管、试剂瓶和洗瓶。
// 尺寸按米，原点都在器材的底面正中。玻璃用薄壁实体，里面的液体、固体各画一层。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Metal, disc, lathe, shell } from '@/lab-kit'
import { tagTex } from './mats'
import { pipeGeo, rng, type V3 } from './parts'

/** 便宜的玻璃：薄、透明、反光（里面还要画东西，所以不用折射） */
export const Glass = ({ opacity = 0.13, color = '#cfe0e2' }: { opacity?: number; color?: string }) => <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.04} clearcoat={1} envMapIntensity={1.1} depthWrite={false} side={THREE.DoubleSide} />
/** 杯口、管口的一圈亮边：玻璃的轮廓靠它显出来 */
const Rim = ({ r, y, t = 0.0011 }: { r: number; y: number; t?: number }) => <mesh position-y={y} rotation-x={Math.PI / 2} renderOrder={10}><torusGeometry args={[r, t, 8, 40]} /><meshPhysicalMaterial color="#eef6f6" transparent opacity={0.75} roughness={0.05} clearcoat={1} envMapIntensity={1.6} /></mesh>
const Liquid = ({ color, opacity = 0.8 }: { color: string; opacity?: number }) => <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.25} envMapIntensity={0.5} />

/** 烧杯：r 半径，h 高，带一圈翻边 */
export function Beaker({ r = 0.026, h = 0.07 }: { r?: number; h?: number }) {
  const g = useMemo(() => shell([[0, 0], [r - 0.003, 0], [r, 0.003], [r, h - 0.004], [r + 0.0025, h]], 0.0024, { segs: 48 }), [r, h])
  return <><mesh geometry={g} renderOrder={8}><Glass /></mesh><Rim r={r + 0.0018} y={h} /><Rim r={r - 0.001} y={0.0015} t={0.0009} /></>
}
/** 表面皿：一只很浅的玻璃碟 */
export function WatchGlass({ r = 0.05 }: { r?: number }) {
  const g = useMemo(() => shell(Array.from({ length: 9 }, (_, i) => { const a = i / 8; return [r * a, r * 0.22 * a * a] as [number, number] }), 0.003, { segs: 48 }), [r])
  return <><mesh geometry={g} renderOrder={8}><Glass opacity={0.24} /></mesh><Rim r={r - 0.001} y={r * 0.22} /></>
}
/** 棕色的滴瓶：瓶身、瓶颈、标签。滴管另外画 */
export function DropBottle({ name }: { name: string }) {
  const g = useMemo(() => shell([[0, 0], [0.02, 0], [0.023, 0.003], [0.023, 0.05], [0.012, 0.064], [0.012, 0.074], [0.014, 0.076]], 0.002, { segs: 40 }), [])
  const tex = useMemo(() => tagTex(name, '#b5372b'), [name])
  return <group>
    <mesh geometry={g} castShadow renderOrder={7}><meshPhysicalMaterial color="#6a3a12" transparent opacity={0.82} roughness={0.08} clearcoat={1} /></mesh>
    <mesh position-y={0.02}><cylinderGeometry args={[0.0205, 0.0205, 0.036, 32]} /><meshPhysicalMaterial color="#d9d2b8" transparent opacity={0.5} roughness={0.1} /></mesh>
    <mesh position={[0, 0.028, 0.0236]}><planeGeometry args={[0.032, 0.018]} /><meshStandardMaterial map={tex} roughness={0.7} /></mesh>
  </group>
}
/** 滴管：细玻璃管加一只红色的胶头。原点在管尖，管子朝上 */
export function Dropper({ full = 0.6 }: { full?: number }) {
  const g = useMemo(() => ({
    tube: shell([[0.0012, 0], [0.0032, 0.024], [0.0032, 0.07]], 0.0008, { segs: 20 }),
    bulb: lathe([[0, 0.067], [0.005, 0.067], [0.0055, 0.075], [0.0085, 0.083], [0.009, 0.098], [0.006, 0.108], [0, 0.11]], { segs: 24 }),
  }), [])
  return <group>
    <mesh geometry={g.tube} renderOrder={9}><Glass opacity={0.28} /></mesh>
    {full > 0.02 && <mesh position-y={0.01 + 0.024 * full}><cylinderGeometry args={[0.0022, 0.0012, 0.048 * full, 10]} /><Liquid color="#d9d2b8" opacity={0.75} /></mesh>}
    <mesh geometry={g.bulb} castShadow><meshStandardMaterial color="#b3382c" roughness={0.6} /></mesh>
  </group>
}
// ---------- 吸水性：胆矾 ----------
const BLUE = new THREE.Color('#1c63d0'), PALE = new THREE.Color('#e9ebe6')
/** 表面皿里的一小堆胆矾晶体：k 是变白的进度（0–1），从滴到的中间往外变白 */
export function Crystals({ k }: { k: number }) {
  const N = 70
  const seeds = useMemo(() => { const f = rng(41); return Array.from({ length: N }, () => { const a = f() * 6.28, q = Math.sqrt(f()) * 0.026; return { x: Math.cos(a) * q, z: Math.sin(a) * q, y: 0.004 + (0.026 - q) * 0.25 * f() + q * q * 4.4, s: 0.0035 + f() * 0.003, r: [f() * 6, f() * 6, f() * 6] as V3, q: q / 0.026 } }) }, [])
  const mesh = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), []), c = useMemo(() => new THREE.Color(), [])
  useFrame(() => {
    const m = mesh.current; if (!m) return
    seeds.forEach((p, i) => {
      o.position.set(p.x, p.y, p.z); o.rotation.set(...p.r); o.scale.set(p.s, p.s * 0.7, p.s * 1.2); o.updateMatrix(); m.setMatrixAt(i, o.matrix)
      c.copy(BLUE).lerp(PALE, THREE.MathUtils.smoothstep(k * 1.5 - p.q * 0.5, 0, 1)); m.setColorAt(i, c)
    })
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[undefined, undefined, N]} castShadow><octahedronGeometry args={[1, 0]} /><meshPhysicalMaterial roughness={0.25} clearcoat={0.6} flatShading /></instancedMesh>
}

// ---------- 脱水性：蔗糖 ----------
/** 烧杯里的蔗糖：dark 0–1 从白变黄、变褐、变黑；rise 0–1 黑色的炭柱从烧杯里鼓出来 */
export function Sugar({ dark, rise }: { dark: number; rise: number }) {
  const g = useMemo(() => {
    const mound = lathe([[0, 0.002], [0.0245, 0.002], [0.0245, 0.016], [0.018, 0.021], [0.008, 0.024], [0, 0.0245]], { segs: 32 })
    // 炭柱：杯里的一段是直的，冒出杯口以后鼓出来一圈，顶上收圆。截面线每 3 mm 取一个点，表面的起伏才细
    const prof: [number, number][] = [[0, 0]]
    for (let y = 0; y <= 0.1321; y += 0.003) { const out = y < 0.062 ? 0.0236 : y < 0.105 ? 0.0236 + 0.0045 * Math.sin((y - 0.062) / 0.043 * Math.PI / 2) : 0.0281 * Math.sqrt(Math.max(0, 1 - ((y - 0.105) / 0.03) ** 2)); if (out > 0.002) prof.push([out, y]) }
    prof.push([0, 0.1345])
    const col = lathe(prof, { segs: 64, crease: 70 }), p = col.attributes.position
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x); if (r < 1e-6 || y < 0.004) continue; const k = 1 - 0.05 * (0.5 + 0.5 * Math.sin(7 * a + y * 150)) - 0.035 * (0.5 + 0.5 * Math.sin(13 * a - y * 420)) - 0.025 * (0.5 + 0.5 * Math.sin(y * 900 + 4 * a)); p.setX(i, x * k); p.setZ(i, z * k) }
    col.computeVertexNormals()
    return { mound, col }
  }, [])
  const c = useMemo(() => new THREE.Color(), [])
  c.set('#f4f2ea'); if (dark < 0.4) c.lerp(new THREE.Color('#d9a441'), dark / 0.4); else if (dark < 0.7) c.set('#d9a441').lerp(new THREE.Color('#5a3414'), (dark - 0.4) / 0.3); else c.set('#5a3414').lerp(new THREE.Color('#101010'), (dark - 0.7) / 0.3)
  return <group>
    <mesh geometry={g.mound}><meshStandardMaterial color={`#${c.getHexString()}`} roughness={0.95} /></mesh>
    {rise > 0.01 && <mesh geometry={g.col} position-y={0.008 + (rise - 1) * 0.062} scale={[0.85 + 0.15 * rise * rise, 0.45 + 0.55 * rise, 0.85 + 0.15 * rise * rise]} castShadow><meshStandardMaterial color="#17171a" roughness={1} metalness={0} envMapIntensity={0.25} /></mesh>}
  </group>
}

// ---------- 强氧化性：铜和浓硫酸 ----------
/** 试管：r 半径，len 长，圆底，口上一圈翻边。原点在管底，管口朝上 */
export function TestTube({ r = 0.0125, len = 0.17, children }: { r?: number; len?: number; children?: React.ReactNode }) {
  const g = useMemo(() => shell([[0, 0], [r * 0.6, r * 0.2], [r * 0.92, r * 0.62], [r, r], [r, len - 0.003], [r + 0.0018, len]], 0.0016, { segs: 32 }), [r, len])
  return <group>{children}<mesh geometry={g} renderOrder={9}><Glass opacity={0.18} /></mesh><Rim r={r + 0.001} y={len} t={0.0009} /></group>
}
/** 试管里的一段液体：从管底到高 h */
export function TubeLiquid({ r = 0.0125, h, color, opacity = 0.8 }: { r?: number; h: number; color: string; opacity?: number }) {
  const g = useMemo(() => lathe([[0, 0.0012], [r * 0.58, r * 0.22], [r * 0.9 - 0.001, r * 0.64], [r - 0.0012, r], [r - 0.0012, h], [0, h]], { segs: 28 }), [r, h])
  return <mesh geometry={g} renderOrder={6}><Liquid color={color} opacity={opacity} /></mesh>
}
/** 铁架台：底座、立杆、十字夹和试管夹（夹在 y 处，朝 +x 伸出 reach） */
export function Stand({ y = 0.2, reach = 0.1 }: { y?: number; reach?: number }) {
  const g = useMemo(() => ({ base: disc(0.01, 0.012), knob: lathe([[0, 0], [0.007, 0], [0.008, 0.002], [0.008, 0.012], [0.006, 0.014], [0, 0.014]], { segs: 16 }) }), [])
  return <group>
    <mesh position={[0, 0.006, 0]} castShadow receiveShadow><boxGeometry args={[0.15, 0.012, 0.22]} /><meshStandardMaterial color="#26282b" roughness={0.6} metalness={0.5} /></mesh>
    <mesh position={[0, 0.3, -0.07]} castShadow><cylinderGeometry args={[0.006, 0.006, 0.6, 16]} /><Metal kind="steel" grain="turned" /></mesh>
    <mesh position={[0, y, -0.07]} castShadow><boxGeometry args={[0.024, 0.024, 0.024]} /><Metal kind="aluminum" grain="cast" /></mesh>
    <mesh geometry={g.knob} position={[-0.012, y, -0.07]} rotation-z={Math.PI / 2}><Metal kind="steel" grain="turned" /></mesh>
    {/* 夹杆从立杆伸到前面，再向右伸出两片夹爪 */}
    <mesh position={[0, y, -0.035]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.004, 0.004, 0.07, 12]} /><Metal kind="steel" grain="turned" /></mesh>
    <mesh position={[reach / 2, y, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.004, 0.004, reach, 12]} /><Metal kind="steel" grain="turned" /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[reach + 0.004, y, s * 0.014]} castShadow><boxGeometry args={[0.03, 0.012, 0.003]} /><meshStandardMaterial color="#8a6a4a" roughness={0.8} /></mesh>)}
  </group>
}
/** 酒精灯：玻璃灯壶、瓷灯芯管、灯芯；lit 时有火焰 */
export function Lamp({ lit }: { lit: boolean }) {
  const g = useMemo(() => ({ pot: shell([[0, 0], [0.026, 0], [0.036, 0.012], [0.036, 0.028], [0.014, 0.046], [0.012, 0.054]], 0.002, { segs: 40 }), neck: lathe([[0.005, 0.05], [0.016, 0.05], [0.016, 0.054], [0.008, 0.058], [0.008, 0.068], [0.005, 0.068]], { segs: 20, closed: true }) }), [])
  const flame = useRef<THREE.Group>(null), light = useRef<THREE.PointLight>(null), k = useRef(0)
  useFrame(({ clock }, d) => {
    k.current += ((lit ? 1 : 0) - k.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.25))
    const t = clock.elapsedTime, f = flame.current
    if (f) { f.visible = k.current > 0.03; f.scale.set(k.current * (1 + Math.sin(t * 17) * 0.06), k.current * (1 + Math.sin(t * 11.3) * 0.1 + Math.sin(t * 23) * 0.05), k.current) }
    if (light.current) light.current.intensity = k.current * (0.5 + Math.sin(t * 13) * 0.06)
  })
  return <group>
    <mesh geometry={g.pot} renderOrder={8}><Glass opacity={0.18} /></mesh>
    <mesh position-y={0.014}><cylinderGeometry args={[0.033, 0.025, 0.024, 32]} /><Liquid color="#cfe6f2" opacity={0.5} /></mesh>
    <mesh geometry={g.neck} castShadow><meshStandardMaterial color="#efeee8" roughness={0.5} /></mesh>
    <mesh position-y={0.072}><cylinderGeometry args={[0.004, 0.004, 0.01, 10]} /><meshStandardMaterial color="#d9d4c4" roughness={1} /></mesh>
    <group ref={flame} position-y={0.076} visible={false}>
      <mesh position-y={0.026} renderOrder={12}><coneGeometry args={[0.011, 0.056, 20, 1, true]} /><meshBasicMaterial color="#ffb24a" transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <mesh position-y={0.016} renderOrder={12}><coneGeometry args={[0.007, 0.034, 16, 1, true]} /><meshBasicMaterial color="#6fa8ff" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <mesh position-y={0.004}><sphereGeometry args={[0.008, 12, 10]} /><meshBasicMaterial color="#5a8cff" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
    </group>
    <pointLight ref={light} position-y={0.1} color="#ffb060" intensity={0} distance={0.6} decay={1.5} />
  </group>
}
/** 一根弯的玻璃导管：沿折线走 */
export function GlassTube({ pts, r = 0.003 }: { pts: V3[]; r?: number }) {
  const g = useMemo(() => pipeGeo(pts, r, 0.012, 10), [pts, r])
  return <mesh geometry={g} renderOrder={9}><Glass opacity={0.34} /></mesh>
}
/** 试管架：两层木板，上层有孔，四根立柱 */
export function Rack() {
  return <group>
    <mesh position-y={0.006} castShadow receiveShadow><boxGeometry args={[0.12, 0.012, 0.05]} /><meshStandardMaterial color="#b98a55" roughness={0.75} /></mesh>
    <mesh position-y={0.09} castShadow><boxGeometry args={[0.12, 0.008, 0.05]} /><meshStandardMaterial color="#b98a55" roughness={0.75} /></mesh>
    {[-0.054, 0.054].flatMap(x => [-0.02, 0.02].map(z => <mesh key={`${x}${z}`} position={[x, 0.048, z]} castShadow><cylinderGeometry args={[0.004, 0.004, 0.084, 10]} /><meshStandardMaterial color="#a67a48" roughness={0.75} /></mesh>))}
    {[-0.03, 0.03].map(x => <mesh key={x} position={[x, 0.0945, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.013, 0.0155, 24]} /><meshStandardMaterial color="#6f4f2c" roughness={0.9} /></mesh>)}
  </group>
}
/** 液体里往上冒的一串小气泡：在 at 附近，高 h */
export function Bubbles({ h, on, n = 14, spread = 0.006 }: { h: number; on: number; n?: number; spread?: number }) {
  const seeds = useMemo(() => { const f = rng(63); return Array.from({ length: n }, () => ({ x: (f() - 0.5) * 2 * spread, z: (f() - 0.5) * 2 * spread, u: f(), v: 0.6 + f() * 0.6, s: 0.0009 + f() * 0.0009 })) }, [n, spread])
  const mesh = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const m = mesh.current; if (!m) return
    m.visible = on > 0.02; if (!m.visible) return
    seeds.forEach((p, i) => { p.u = (p.u + Math.min(d, 1 / 30) * p.v * 0.5) % 1; o.position.set(p.x, p.u * h, p.z); o.scale.setScalar(p.s * on * (0.6 + p.u)); o.updateMatrix(); m.setMatrixAt(i, o.matrix) })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[undefined, undefined, n]} renderOrder={10}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthWrite={false} toneMapped={false} /></instancedMesh>
}

/** 一只带标签的试剂瓶（细口瓶，磨砂玻璃塞）：brown 棕色瓶装见光易变质或浓酸，否则是无色瓶；liquid 是里面液体的颜色 */
export function Reagent({ name, brown = false, liquid = '#e8eef0', band = '#2f6fb3', k = 1, solid = false }: { name: string; brown?: boolean; liquid?: string; band?: string; k?: number; solid?: boolean }) {
  const g = useMemo(() => ({ body: shell([[0, 0], [0.03, 0], [0.034, 0.004], [0.034, 0.078], [0.014, 0.098], [0.014, 0.112], [0.017, 0.114]], 0.0022, { segs: 40 }), cap: lathe([[0, 0.108], [0.012, 0.108], [0.012, 0.118], [0.016, 0.12], [0.016, 0.13], [0.012, 0.134], [0, 0.134]], { segs: 24 }) }), [])
  const tex = useMemo(() => tagTex(name, band), [name, band])
  return <group scale={k}>
    <mesh position-y={0.036}><cylinderGeometry args={[0.031, 0.031, 0.064, 32]} /><meshStandardMaterial color={liquid} transparent={!solid} opacity={solid ? 1 : brown ? 0.4 : 0.85} roughness={solid ? 0.9 : 0.3} envMapIntensity={0.5} /></mesh>
    <mesh geometry={g.body} castShadow renderOrder={7}>{brown ? <meshPhysicalMaterial color="#6a3a12" transparent opacity={0.8} roughness={0.08} clearcoat={1} /> : <Glass opacity={0.16} />}</mesh>
    <mesh geometry={g.cap} castShadow><meshPhysicalMaterial color={brown ? '#5a3212' : '#dfe8e8'} transparent opacity={0.85} roughness={0.3} /></mesh>
    <mesh position={[0, 0.044, 0.0346]}><planeGeometry args={[0.046, 0.026]} /><meshStandardMaterial map={tex} roughness={0.7} /></mesh>
  </group>
}
/** 洗瓶：软塑料瓶，一根弯嘴 */
export function WashBottle() {
  const g = useMemo(() => ({ body: lathe([[0, 0], [0.03, 0], [0.033, 0.004], [0.033, 0.09], [0.016, 0.108], [0.016, 0.12], [0, 0.12]], { segs: 36 }), cap: lathe([[0, 0.118], [0.018, 0.118], [0.018, 0.134], [0.006, 0.14], [0, 0.14]], { segs: 24 }), spout: pipeGeo([[0, 0.136, 0], [0, 0.165, 0], [0.05, 0.15, 0]], 0.0028, 0.012, 8) }), [])
  return <group>
    <mesh geometry={g.body} castShadow><meshPhysicalMaterial color="#eef3f4" transparent opacity={0.75} roughness={0.45} /></mesh>
    <mesh geometry={g.cap} castShadow><meshStandardMaterial color="#2f6fb3" roughness={0.5} /></mesh>
    <mesh geometry={g.spout} castShadow><meshStandardMaterial color="#2f6fb3" roughness={0.5} /></mesh>
  </group>
}
