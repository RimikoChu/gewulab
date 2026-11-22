// 光合作用和呼吸作用实验室里反复用到的器材：花盆和叶子、钟罩、台灯、烧杯、蜡烛、气泡。都是用基本形状拼的。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { lathe, shell } from '@/lab-kit'

export const GLASS = { color: '#cfe6ee', transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0, depthWrite: false } as const
export const C = { leaf: '#3f9b4b', leafDark: '#2f7d3c', pale: '#e9dfb0', blue: '#27357f', stem: '#6f8f4a', pot: '#b5613c', soil: '#4a3524', water: '#7fc4dc', wood: '#8b6a45' }
type V3 = [number, number, number]

// ---------- 叶片 ----------
/** 叶缘到叶心的距离：一圈圆圆的波浪，叶柄那里凹进去一个缺口（朝 −y） */
const edgeR = (t: number) => { const d = Math.abs(((t + Math.PI * 1.5) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI); return 1 + 0.07 * Math.cos(t * 9) - 0.42 * Math.exp(-(d * d) / 0.05) }
/** 叶面不是平的：整片微微向上兜着，边缘一圈起伏，叶尖略往下垂 */
const lift = (x: number, y: number, t: number, q: number) => 0.2 * (x * x + y * y) + 0.05 * Math.sin(t * 9 + 0.6) * q ** 3 - 0.1 * Math.max(0, y) ** 2 * q
/** 叶脉：从叶柄那一点放射出去的几条主脉，各带几条细的侧脉。画成一张贴图，叶面的颜色乘上它 */
let veinTex: THREE.CanvasTexture | null = null
function veins() {
  if (!veinTex) {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S
    const g = c.getContext('2d')!, px = (x: number, y: number): [number, number] => [(x / 2.3 + 0.5) * S, (0.5 - y / 2.3) * S]
    g.fillStyle = '#cfcfcf'; g.fillRect(0, 0, S, S)
    let sd = 5; const rnd = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '120,120,120'},0.07)`; g.fillRect(rnd() * S, rnd() * S, 2, 2) }   // 叶肉上细细的斑驳
    const base: [number, number] = [0, -0.58]
    g.lineCap = 'round'
    for (const [ang, len] of [[90, 1.5], [52, 1.35], [128, 1.35], [18, 1.05], [162, 1.05], [-16, 0.7], [196, 0.7]] as const) {
      const a = ang * Math.PI / 180, tip: [number, number] = [base[0] + Math.cos(a) * len, base[1] + Math.sin(a) * len]
      g.strokeStyle = '#ffffff'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(...px(...base)); g.lineTo(...px(...tip)); g.stroke()
      for (let k = 1; k <= 4; k++) for (const s of [-1, 1]) {
        const f = k / 5, o: [number, number] = [base[0] + (tip[0] - base[0]) * f, base[1] + (tip[1] - base[1]) * f], b2 = a + s * 0.75, l2 = len * 0.3 * (1 - f * 0.5)
        g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(...px(...o)); g.lineTo(...px(o[0] + Math.cos(b2) * l2, o[1] + Math.sin(b2) * l2)); g.stroke()
      }
    }
    veinTex = new THREE.CanvasTexture(c); veinTex.colorSpace = THREE.SRGBColorSpace; veinTex.anisotropy = 8
  }
  return veinTex
}
/**
 * 叶片的模型：从叶心往外一圈圈铺开的曲面，每个顶点带颜色。
 * 颜色从叶心到叶缘慢慢变浅；中间有一道马蹄形的深色环纹（天竺葵叶子上常见）；edge 给最外面一圈另一种颜色（银边）。half 只取左半或右半
 */
const blades = new Map<string, THREE.BufferGeometry>()
function blade(color: string, half?: 'l' | 'r', edge?: string) {
  const key = `${color}|${half ?? ''}|${edge ?? ''}`
  if (!blades.has(key)) {
    const a0 = half === 'l' ? Math.PI / 2 : half === 'r' ? -Math.PI / 2 : -Math.PI, a1 = half === 'l' ? Math.PI * 1.5 : half === 'r' ? Math.PI / 2 : Math.PI
    const NT = half ? 48 : 96, NR = 10, pos: number[] = [], col: number[] = [], uv: number[] = [], idx: number[] = []
    const base = new THREE.Color(color), dark = base.clone().multiplyScalar(0.62), light = base.clone().lerp(new THREE.Color('#dfe9b4'), 0.28), rim = edge ? new THREE.Color(edge) : null, c = new THREE.Color()
    for (let i = 0; i <= NT; i++) for (let j = 0; j <= NR; j++) {
      const t = a0 + (a1 - a0) * i / NT, q = j / NR, r = edgeR(t) * q, x = Math.cos(t) * r, y = Math.sin(t) * r
      pos.push(x, y, lift(x, y, t, q)); uv.push(x / 2.3 + 0.5, y / 2.3 + 0.5)
      const zone = Math.exp(-((q - 0.56) ** 2) / 0.012) * (0.55 + 0.45 * Math.sin(t))          // 深色环纹，靠叶柄那一侧淡下去
      c.copy(base).lerp(light, q * q * 0.7).lerp(dark, Math.max(0, zone) * 0.55)
      if (rim && q > 0.72) c.lerp(rim, Math.min(1, (q - 0.72) / 0.06))
      col.push(c.r, c.g, c.b)
    }
    for (let i = 0; i < NT; i++) for (let j = 0; j < NR; j++) { const p = i * (NR + 1) + j, n = p + NR + 1; idx.push(p, p + 1, n, n, p + 1, n + 1) }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx); g.computeVertexNormals()
    blades.set(key, g)
  }
  return blades.get(key)!
}
/** 一片叶子：波浪边的圆叶，叶面微微兜着，正面看得见放射状的叶脉，背面颜色浅一些。half 只画左半或右半（第 1 课一片叶子两半颜色不同）；edge 是叶缘那一圈的颜色（银边） */
export function Leaf({ r = 0.12, color = C.leaf, half, edge, ...rest }: { r?: number; color?: string; half?: 'l' | 'r'; edge?: string } & Record<string, unknown>) {
  const geo = blade(color, half, edge), map = useMemo(veins, [])
  const back = useMemo(() => new THREE.Color(color).lerp(new THREE.Color('#e3e8c9'), 0.45), [color])
  return (
    <group {...rest} scale={r}>
      <mesh geometry={geo} castShadow><meshStandardMaterial vertexColors map={map} color="#ffffff" roughness={0.55} side={THREE.FrontSide} /></mesh>
      <mesh geometry={geo}><meshStandardMaterial color={back} roughness={0.8} side={THREE.BackSide} /></mesh>
    </group>
  )
}

/** 一条弯的细杆（茎、叶柄、花梗）：经过几个点 */
function Stalk({ pts, r0, r1, color }: { pts: V3[]; r0: number; r1: number; color: string }) {
  const geo = useMemo(() => {
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 14, 1, 7), p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv
    for (let i = 0; i < p.count; i++) { const k = r0 + (r1 - r0) * u.getX(i) - 1; p.setXYZ(i, p.getX(i) + n.getX(i) * k, p.getY(i) + n.getY(i) * k, p.getZ(i) + n.getZ(i) * k) }   // 管子本来半径是 1，沿法线收到要的粗细，根粗梢细
    return g
  }, [pts, r0, r1])
  return <mesh geometry={geo} castShadow><meshStandardMaterial color={color} roughness={0.7} /></mesh>
}

/**
 * 一盆天竺葵：花盆里一根主茎分出两三枝，每个节上伸出一根叶柄托着一片叶子，叶子大小、朝向、俯仰各不相同；顶上一簇红花。
 * leaf 是叶子的颜色；rim 给叶子加一圈浅色的边（银边天竺葵）；n 是叶子的片数；compact 是长得紧凑一些（要罩进钟罩里的那几盆）
 */
export function Plant({ position, s = 1, leaf = C.leaf, rim, n = 9, compact = false }: { position: V3; s?: number; leaf?: string; rim?: string; n?: number; compact?: boolean }) {
  const P = useMemo(() => {
    let sd = Math.floor(Math.abs(position[0] * 97 + position[2] * 31 + n * 13 + (rim ? 7 : 0)) * 10) + 3
    const rnd = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296
    const top = (compact ? 0.4 : 0.5) + rnd() * 0.05, lean = (rnd() - 0.5) * 0.06, K = compact ? 0.62 : 1
    const stem: V3[] = [[0, 0.17, 0], [lean * 0.4, 0.3, lean * 0.3], [lean, 0.42, -lean * 0.5], [lean * 1.3, top, -lean]]
    const at = (t: number): V3 => { const k = t * (stem.length - 1), i = Math.min(stem.length - 2, Math.floor(k)), f = k - i; return [stem[i][0] + (stem[i + 1][0] - stem[i][0]) * f, stem[i][1] + (stem[i + 1][1] - stem[i][1]) * f, stem[i][2] + (stem[i + 1][2] - stem[i][2]) * f] }
    const leaves = Array.from({ length: n }, (_, i) => {
      const a = i * 2.39996 + rnd() * 0.5, t = 0.12 + 0.8 * (i / Math.max(1, n - 1)) * (0.85 + rnd() * 0.15), o = at(t), len = (0.13 + rnd() * 0.07 + (1 - t) * 0.05) * K, up = 0.04 + rnd() * 0.06 + t * 0.04
      const tip: V3 = [o[0] + Math.cos(a) * len, o[1] + up, o[2] + Math.sin(a) * len], mid: V3 = [o[0] + Math.cos(a) * len * 0.5, o[1] + up * 0.8 + 0.015, o[2] + Math.sin(a) * len * 0.5]
      return { a, o, mid, tip, r: (0.092 + rnd() * 0.035 + (1 - t) * 0.015) * (compact ? 0.8 : 1), tilt: 0.12 + rnd() * 0.4, roll: (rnd() - 0.5) * 0.4, dark: rnd() < 0.4 }
    })
    const head: V3 = [stem[3][0] + 0.02, top + (compact ? 0.09 : 0.15), stem[3][2] + 0.01]
    const buds = Array.from({ length: 11 }, (_, i) => { const a = i * 2.39996, q = 0.3 + (i % 4) * 0.2; return { p: [Math.cos(a) * 0.045 * q + (rnd() - 0.5) * 0.01, 0.02 - q * 0.02 + rnd() * 0.012, Math.sin(a) * 0.045 * q] as V3, a } })
    return { stem, leaves, head, buds }
  }, [position[0], position[2], n, rim, compact])   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={position} scale={s}>
      <mesh geometry={POT.saucer} castShadow><meshStandardMaterial color="#a4552f" roughness={0.85} /></mesh>
      <mesh geometry={POT.pot} position={[0, 0.012, 0]} castShadow><meshStandardMaterial color={C.pot} roughness={0.85} /></mesh>
      <mesh position={[0, 0.172, 0]}><cylinderGeometry args={[0.116, 0.116, 0.012, 24]} /><meshStandardMaterial color={C.soil} roughness={1} /></mesh>
      <Stalk pts={P.stem} r0={0.017} r1={0.009} color={C.stem} />
      {P.leaves.map((l, i) => (
        <group key={i}>
          <Stalk pts={[l.o, l.mid, l.tip]} r0={0.0065} r1={0.004} color="#7fa055" />
          {/* 叶片的缺口接在叶柄的顶上，叶面朝上略向外倾 */}
          <group position={l.tip} rotation-y={-(l.a + Math.PI / 2)}>
            <group rotation={[-Math.PI / 2 + l.tilt, 0, l.roll]}>
              <Leaf r={l.r} color={l.dark && leaf === C.leaf ? C.leafDark : leaf} edge={rim} position={[0, 0.58 * l.r, 0]} />
            </group>
          </group>
        </group>
      ))}
      {/* 花：一根长花梗顶着一簇小红花，每朵五片花瓣 */}
      <Stalk pts={[P.stem[3], [P.head[0] - 0.01, (P.stem[3][1] + P.head[1]) / 2, P.head[2]], P.head]} r0={0.006} r1={0.004} color="#7fa055" />
      <group position={P.head}>
        {P.buds.map((b, i) => <group key={i} position={b.p} rotation={[0.5 * Math.sin(b.a), b.a, 0.5 * Math.cos(b.a)]}>
          {[0, 1, 2, 3, 4].map(k => <mesh key={k} position={[Math.cos(k * 1.2566) * 0.011, 0.004, Math.sin(k * 1.2566) * 0.011]} rotation-y={-k * 1.2566} scale={[1, 0.25, 0.7]}><sphereGeometry args={[0.011, 8, 6]} /><meshStandardMaterial color={i % 3 ? '#d83a4a' : '#e85a66'} roughness={0.6} /></mesh>)}
          <mesh position-y={0.005}><sphereGeometry args={[0.0035, 6, 5]} /><meshStandardMaterial color="#f4d35e" /></mesh>
        </group>)}
      </group>
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
