// 水厂的厂区：取水泵房、絮凝沉淀池、滤池、活性炭池、加氯间、清水池、送水泵房，中间用涂蓝漆的球墨铸铁管连着。
// 池子都朝镜头剖开（剖面在 z = CUT），前墙拿掉，两边墙的切口画出壁厚和剖面斜线；池里的水看得见颜色和分层。
// 尺寸在这里按画面单位写（1 m = M = 6 个单位）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, mergeParts, useConcrete, useRipple, type Part } from '@/lab-kit'
import { murk } from './physics'
import { waterLook } from './gear'
import { cutTex, grainTex, makeSign, tankLabel, wallTex } from './mats'

export const CUT = -20                 // 剖面所在的 z
const BACK = -70, WALL = 1.8           // 池子的后墙内侧、墙厚（单位）
/** 各座构筑物的 x 范围、墙高、水面高 */
export const TANK = {
  floc: { x0: -60, x1: -22, h: 25, w: 23 },
  sed: { x0: -22, x1: 62, h: 25, w: 23 },
  sand: { x0: 84, x1: 144, h: 22, w: 19, bed: 9, gravel: 3.4 },
  carbon: { x0: 164, x1: 214, h: 22, w: 19, bed: 11, gravel: 3 },
  clear: { x0: 284, x1: 368, h: 24, w: 20 },
}
export const PUMP = { x0: 390, x1: 450, z0: -88, z1: -44, h: 38 }
export const CHLOR = { x0: 228, x1: 264, z0: -66, z1: -34, h: 24 }
export const INTAKE = { x0: -276, x1: -242, z0: -52, z1: -24, h: 30 }

/** 一块板，贴图按它在世界里的位置铺，k 是贴图一格多大 */
export function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 6) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) / k : p.getY(i) / k)
  return g
}

/** 池顶走道的栏杆：立柱每 3 m 一根，两道横杆，脚下一道踢脚板。沿着 x 从 x0 到 x1，在 z、高 y */
function rail(P: Part[], x0: number, x1: number, y: number, z: number, c = '#d6dadb') {
  for (let x = x0; x <= x1 + 0.01; x += 9) P.push({ p: [x, y + 3.3, z], s: [0.22, 6.6, 0.22], c, cyl: true })
  for (const h of [3.4, 6.6]) P.push({ p: [(x0 + x1) / 2, y + h, z], s: [0.16, x1 - x0, 0.16], c, r: [0, 0, Math.PI / 2], cyl: true })
  P.push({ p: [(x0 + x1) / 2, y + 0.45, z], s: [x1 - x0, 0.9, 0.08], c: '#e2b21c' })
}
/** 一段管子加两头的法兰 */
function pipe(P: Part[], a: [number, number, number], b: [number, number, number], r: number, c = '#2e6ea6') {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), e = new THREE.Euler().setFromQuaternion(q)
  P.push({ p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: [r, len, r], c, r: [e.x, e.y, e.z], cyl: true })
  for (const t of [0.02, 0.98]) P.push({ p: [a[0] + d.x * t, a[1] + d.y * t, a[2] + d.z * t], s: [r * 1.35, 0.5, r * 1.35], c, r: [e.x, e.y, e.z], cyl: true })
}
/** 一只闸阀：阀体、立着的阀杆、顶上一只红色手轮 */
function Valve({ at, r }: { at: [number, number, number]; r: number }) {
  return <group position={at}>
    <mesh castShadow><boxGeometry args={[r * 2.2, r * 2.4, r * 2.2]} /><meshStandardMaterial color="#2e6ea6" roughness={0.5} metalness={0.3} /></mesh>
    <mesh position-y={r * 2.6}><cylinderGeometry args={[r * 0.18, r * 0.18, r * 3, 10]} /><Metal kind="stainless" /></mesh>
    <mesh position-y={r * 4.1} rotation-x={Math.PI / 2} castShadow><torusGeometry args={[r * 1.1, r * 0.13, 8, 28]} /><meshStandardMaterial color="#b8291f" roughness={0.45} /></mesh>
    {[0, 1, 2].map(i => <mesh key={i} position-y={r * 4.1} rotation-y={i * Math.PI / 3}><boxGeometry args={[r * 2.2, r * 0.12, r * 0.12]} /><meshStandardMaterial color="#b8291f" roughness={0.45} /></mesh>)}
  </group>
}

/**
 * 一座剖开的池子里的水：水体（不受光的半透明），朝镜头的剖面贴一层上亮下暗的渐变，最上面一道亮线是水面；水面带波纹。
 * k0 水面附近、k1 池底附近的浑浊程度
 */
function TankWater({ x0, x1, y0, y1, k0, k1 }: { x0: number; x1: number; y0: number; y1: number; k0: number; k1: number }) {
  const ripple = useRipple([(x1 - x0) / 14, (CUT - BACK) / 14], 0.01)
  const face = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256
    const g = c.getContext('2d')!, grad = g.createLinearGradient(0, 0, 0, 256), a = waterLook(k0), b = waterLook(k1)
    grad.addColorStop(0, a.color); grad.addColorStop(0.55, new THREE.Color(a.color).lerp(new THREE.Color(b.color), 0.5).getStyle()); grad.addColorStop(1, b.color)
    g.fillStyle = grad; g.fillRect(0, 0, 4, 256); g.fillStyle = 'rgba(240,250,252,0.9)'; g.fillRect(0, 0, 4, 3)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [k0, k1])
  const top = waterLook(k0)
  return <group>
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, (CUT + BACK) / 2]} renderOrder={2}><boxGeometry args={[x1 - x0, y1 - y0, CUT - BACK]} /><meshBasicMaterial color={new THREE.Color(top.color).multiplyScalar(0.55)} transparent opacity={0.35 + 0.4 * k1} depthWrite={false} /></mesh>
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, CUT + 0.02]} renderOrder={3}><planeGeometry args={[x1 - x0, y1 - y0]} /><meshBasicMaterial map={face} transparent opacity={0.5 + 0.4 * k1} depthWrite={false} toneMapped={false} /></mesh>
    <mesh position={[(x0 + x1) / 2, y1, (CUT + BACK) / 2]} rotation-x={-Math.PI / 2} renderOrder={3}><planeGeometry args={[x1 - x0, CUT - BACK]} /><meshPhysicalMaterial color={top.color} transparent opacity={0.6 + 0.3 * k0} roughness={0.06} normalMap={ripple} normalScale={new THREE.Vector2(0.35, 0.35)} clearcoat={1} envMapIntensity={1.3} depthWrite={false} /></mesh>
  </group>
}

/** 絮凝池里慢慢转的搅拌桨：一根横轴上几副十字桨叶 */
function Paddles({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, d) => { if (g.current) g.current.rotation.x += Math.min(d, 1 / 30) * 0.5 })
  const xs = useMemo(() => { const a: number[] = []; for (let x = x0 + 5; x < x1 - 3; x += 9) a.push(x); return a }, [x0, x1])
  return <group position={[0, y, (CUT + BACK) / 2]}>
    <group ref={g}>
      <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.35, 0.35, x1 - x0 - 2, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
      {xs.map(x => [0, 1].map(i => <mesh key={`${x}${i}`} position-x={x - (x0 + x1) / 2} rotation-x={i * Math.PI / 2}><boxGeometry args={[2.4, 16, 0.3]} /><meshStandardMaterial color="#8d969c" metalness={0.6} roughness={0.45} /></mesh>))}
    </group>
  </group>
}

/** 斜管沉淀区：一排排倾斜 60° 的蜂窝斜管，白色塑料，挂在水面下 */
function TubeSettlers({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const geo = useMemo(() => {
    const gs: THREE.BufferGeometry[] = []
    for (let x = x0 + 2; x < x1 - 2; x += 1.6) { const g = new THREE.BoxGeometry(0.18, 7, CUT - BACK - 1.5); g.rotateZ(Math.PI / 6); g.translate(x, y, (CUT + BACK) / 2); gs.push(g) }
    return mergeGeometries(gs)
  }, [x0, x1, y])
  return <mesh geometry={geo} renderOrder={4}><meshStandardMaterial color="#f2f3ee" roughness={0.6} transparent opacity={0.8} depthWrite={false} /></mesh>
}

/** 滤料层：一层层的砂、卵石、活性炭，朝镜头的剖面能看到颗粒 */
function Bed({ x0, x1, y0, y1, kind }: { x0: number; x1: number; y0: number; y1: number; kind: 'sand' | 'gravel' | 'carbon' }) {
  const t = useMemo(() => {
    const src = kind === 'sand' ? grainTex('#c7b48a', '#d9c9a2', '#a89270', 5, 11) : kind === 'gravel' ? grainTex('#8f8a7f', '#b3ada0', '#6d685f', 16, 13) : grainTex('#1d1e1f', '#2e3032', '#0f1010', 7, 17)
    const c = src.clone(); c.repeat.set((x1 - x0) / 10, (y1 - y0) / 10); c.needsUpdate = true
    return c
  }, [x0, x1, y0, y1, kind])
  return <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, (CUT + BACK) / 2]} receiveShadow><boxGeometry args={[x1 - x0, y1 - y0, CUT - BACK]} /><meshStandardMaterial map={t} roughness={1} /></mesh>
}

/** 池子的混凝土外壳：底板、后墙、两端墙、中间的隔墙（xs），前面剖开。剖开的墙头贴剖面斜线 */
function Shell({ x0, x1, h, inner = [], concrete }: { x0: number; x1: number; h: number; inner?: number[]; concrete: THREE.Texture[] }) {
  const { g, cuts } = useMemo(() => {
    const gs = [slab(x0 - WALL, x1 + WALL, -1.5, 0, BACK - WALL, CUT, 8), slab(x0 - WALL, x1 + WALL, 0, h, BACK - WALL, BACK, 8)]
    const walls = [x0 - WALL, x1, ...inner.map(x => x - WALL / 2)]
    for (const x of walls) gs.push(slab(x, x + WALL, 0, h, BACK, CUT, 8))
    return { g: mergeGeometries(gs), cuts: walls }
  }, [x0, x1, h, inner])
  // 压顶：每道墙顶上一条比墙宽一点的混凝土压顶，颜色浅一些，外沿有一道滴水线
  const cap = useMemo(() => mergeGeometries([slab(x0 - WALL - 0.4, x1 + WALL + 0.4, h, h + 0.6, BACK - WALL - 0.4, BACK + 0.3, 4), ...cuts.map(x => slab(x - 0.35, x + WALL + 0.35, h, h + 0.6, BACK, CUT + 0.35, 4))]), [x0, x1, h, cuts])
  const [d, n, r] = concrete, ct = cutTex()
  return <group>
    <mesh geometry={g} castShadow receiveShadow><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#c8c5bc" /></mesh>
    <mesh geometry={cap} castShadow receiveShadow><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#e2dfd6" /></mesh>
    {cuts.map(x => <mesh key={x} position={[x + WALL / 2, h / 2, CUT + 0.03]}><planeGeometry args={[WALL, h]} /><meshStandardMaterial map={ct} roughness={0.9} /></mesh>)}
    <mesh position={[(x0 + x1) / 2, -0.75, CUT + 0.03]}><planeGeometry args={[x1 - x0 + WALL * 2, 1.5]} /><meshStandardMaterial map={ct} roughness={0.9} /></mesh>
  </group>
}

/** 池顶的走道：沿后墙一条格栅板走道，外沿一道栏杆；剖面一侧也立一道栏杆（真实的池子前墙顶上有走道） */
function walkParts(P: Part[], x0: number, x1: number, h: number) {
  // 后墙外挑的一条走道：钢格栅板、下面的三角托架，外沿一道栏杆；池边压顶上也立一道栏杆
  P.push({ p: [(x0 + x1) / 2, h + 0.45, BACK - WALL - 3.4], s: [x1 - x0 + WALL * 2, 0.3, 6], c: '#7e858a' })
  for (let x = x0; x <= x1; x += 9) P.push({ p: [x, h - 1.4, BACK - WALL - 3], s: [0.4, 3.6, 5.2], c: '#6f767b' })
  rail(P, x0 - WALL, x1 + WALL, h + 0.6, BACK - WALL - 6.2)
  rail(P, x0 - WALL, x1 + WALL, h + 0.6, BACK + 0.2)
}

type Box = { x0: number; x1: number; z0: number; z1: number; h: number }
/**
 * 一栋单层的工业厂房：混凝土勒脚和墙裙，墙面每隔一跨一根凸出的壁柱，墙顶一圈女儿墙和金属压顶（平屋顶）；
 * 窗是贴着檐口的一条高侧窗；正面一扇能进出设备的大卷帘门，门上一道雨篷。hoist 为真时，门上方伸出一根吊装用的单轨（工字钢），挂着电动葫芦和吊钩。门窗朝 +z
 */
function Building({ b, win = 3, hoist = false }: { b: Box; win?: number; hoist?: boolean }) {
  const w = b.x1 - b.x0, cx = (b.x0 + b.x1) / 2
  const g = useMemo(() => {
    const walls = slab(b.x0, b.x1, 2.4, b.h, b.z0, b.z1, 7.2)
    const plinth = slab(b.x0 - 0.3, b.x1 + 0.3, -0.5, 2.4, b.z0 - 0.3, b.z1 + 0.3, 6)
    const roof = mergeGeometries([slab(b.x0, b.x1, b.h, b.h + 2, b.z0, b.z1, 6)])
    const P: Part[] = [], glass: THREE.BufferGeometry[] = []
    // 女儿墙的金属压顶、壁柱
    P.push({ p: [cx, b.h + 2.1, b.z1 + 0.1], s: [w + 0.5, 0.35, 0.6], c: '#8d9396' }, { p: [cx, b.h + 2.1, b.z0 - 0.1], s: [w + 0.5, 0.35, 0.6], c: '#8d9396' })
    for (const z of [b.z0, b.z1]) P.push({ p: [b.x0 - 0.1, b.h + 2.1, (b.z0 + b.z1) / 2], s: [0.6, 0.35, b.z1 - b.z0 + 0.5], c: '#8d9396' }, { p: [b.x1 + 0.1, b.h + 2.1, z === b.z0 ? (b.z0 + b.z1) / 2 : (b.z0 + b.z1) / 2], s: [0.6, 0.35, b.z1 - b.z0 + 0.5], c: '#8d9396' })
    const bays = Math.max(2, Math.round(w / 9))
    for (let i = 0; i <= bays; i++) P.push({ p: [b.x0 + w * i / bays, b.h / 2 + 1, b.z1 + 0.35], s: [1.1, b.h - 2, 0.7], c: '#d4d0c6' })
    // 高侧窗：每一跨一樘，贴着檐口
    const wy = b.h * 0.8, wh = b.h * 0.15
    for (let i = 0; i < bays; i++) {
      const x = b.x0 + w * (i + 0.5) / bays, ww = w / bays - 2.4
      if (ww < 1) continue
      P.push({ p: [x, wy, b.z1 + 0.05], s: [ww + 0.5, wh + 0.5, 0.3], c: '#9aa3a8' }, { p: [x, wy - wh / 2 - 0.3, b.z1 + 0.35], s: [ww + 0.8, 0.25, 0.6], c: '#c7c3b8' })
      for (let k = 1; k < 4; k++) P.push({ p: [x - ww / 2 + ww * k / 4, wy, b.z1 + 0.2], s: [0.18, wh, 0.2], c: '#9aa3a8' })
      const pane = new THREE.BoxGeometry(ww, wh, 0.1); pane.translate(x, wy, b.z1 + 0.12); glass.push(pane)
    }
    void win
    // 设备进出的大门：宽而高的卷帘门，钢门框，上面一道雨篷，门前一道坡道
    const dw = Math.min(11, w * 0.36), dh = Math.min(b.h * 0.56, 14), dx = cx
    P.push({ p: [dx, 2.4 + dh / 2 - 2.4 / 2 + 1.2, b.z1 + 0.15], s: [dw, dh, 0.2], c: '#8592a0' })
    for (let k = 0; k < dh / 0.6; k++) P.push({ p: [dx, 1.2 + k * 0.6, b.z1 + 0.28], s: [dw - 0.2, 0.08, 0.06], c: '#69757f' })
    for (const sx of [-1, 1]) P.push({ p: [dx + sx * (dw / 2 + 0.3), dh / 2 + 0.6, b.z1 + 0.3], s: [0.6, dh + 1.2, 0.6], c: '#4a5560' })
    P.push({ p: [dx, dh + 1.2, b.z1 + 0.3], s: [dw + 1.2, 0.6, 0.6], c: '#4a5560' }, { p: [dx, dh + 2.6, b.z1 + 1.6], s: [dw + 3, 0.35, 3.2], c: '#5d6770' }, { p: [dx, 0.2, b.z1 + 2.5], s: [dw + 1.5, 0.4, 5], c: '#a9a69d' })
    // 单轨吊：工字钢从屋里伸出门外，端头有挡块；电动葫芦、吊钩
    if (hoist) {
      const y = dh + 4.4, z0 = b.z1 - 4, z1 = b.z1 + 8
      P.push({ p: [dx, y, (z0 + z1) / 2], s: [0.25, 1.4, z1 - z0], c: '#e2b21c' }, { p: [dx, y + 0.65, (z0 + z1) / 2], s: [1.2, 0.15, z1 - z0], c: '#e2b21c' }, { p: [dx, y - 0.65, (z0 + z1) / 2], s: [1.2, 0.15, z1 - z0], c: '#e2b21c' })
      P.push({ p: [dx, y - 0.2, z1 - 0.2], s: [1.4, 1.6, 0.4], c: '#3b3f43' }, { p: [dx, y + 0.9, b.z1 + 0.7], s: [0.6, 1.6, 1.4], c: '#4a5560' })
      P.push({ p: [dx, y - 1.5, z1 - 2.4], s: [1.6, 1.6, 2], c: '#2f5d8a' }, { p: [dx, y - 4, z1 - 2.4], s: [0.12, 3.4, 0.12], c: '#3b3f43', cyl: true }, { p: [dx, y - 6, z1 - 2.4], s: [0.9, 0.9, 0.35], c: '#e2b21c' })
    }
    for (const x of [b.x0 + 0.6, b.x1 - 0.6]) P.push({ p: [x, b.h / 2 + 1, b.z1 + 0.75], s: [0.35, b.h + 2, 0.35], c: '#a9aeb0', cyl: true })
    return { walls, plinth, roof, trim: mergeParts(P), glass: mergeGeometries(glass) }
  }, [b, win, hoist, w, cx])
  const wt = wallTex()
  return <group>
    <mesh geometry={g.walls} castShadow receiveShadow><meshStandardMaterial map={wt} color="#bdbcb6" roughness={0.9} /></mesh>
    <mesh geometry={g.plinth} castShadow receiveShadow><meshStandardMaterial color="#8a8984" roughness={0.95} /></mesh>
    <mesh geometry={g.roof} castShadow receiveShadow><meshStandardMaterial color="#bdbcb6" roughness={0.9} /></mesh>
    <mesh geometry={g.trim} castShadow receiveShadow><Painted rough={0.5} metal={0.25} /></mesh>
    <mesh geometry={g.glass}><meshPhysicalMaterial color="#1d2a33" roughness={0.08} metalness={0.3} clearcoat={1} envMapIntensity={0.9} /></mesh>
  </group>
}

/** 卧式储罐：圆柱罐身两头是碟形封头，坐在两只鞍座上，侧面贴着标识，顶上一只人孔、一根出料管。原点在罐底正中，罐身沿 x */
function HTank({ len, r, label }: { len: number; r: number; label: THREE.Texture }) {
  return <group>
    {[-1, 1].map(s => <mesh key={s} position={[s * len * 0.3, r * 0.45, 0]} castShadow><boxGeometry args={[1.2, r * 0.9, r * 1.6]} /><meshStandardMaterial color="#5c6166" roughness={0.6} metalness={0.4} /></mesh>)}
    <group position-y={r + 0.6}>
      <mesh rotation-z={Math.PI / 2} castShadow receiveShadow><cylinderGeometry args={[r, r, len, 40]} /><meshPhysicalMaterial color="#e9eae6" roughness={0.35} clearcoat={0.5} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position-x={s * len / 2} scale={[0.35, 1, 1]} castShadow><sphereGeometry args={[r, 32, 16, 0, Math.PI * 2]} /><meshPhysicalMaterial color="#e9eae6" roughness={0.35} clearcoat={0.5} /></mesh>)}
      {[-0.42, 0.42].map(k => <mesh key={k} position-x={k * len} rotation-z={Math.PI / 2}><cylinderGeometry args={[r * 1.01, r * 1.01, 0.5, 40]} /><meshStandardMaterial color="#2a6f9e" roughness={0.5} /></mesh>)}
      <mesh position={[0, 0, r + 0.06]}><planeGeometry args={[len * 0.42, r * 0.84]} /><meshStandardMaterial map={label} roughness={0.6} /></mesh>
      <mesh position={[len * 0.2, r + 0.4, 0]}><cylinderGeometry args={[1, 1, 0.8, 24]} /><Metal kind="stainless" grain="brushed" /></mesh>
      <mesh position={[-len * 0.25, r + 0.9, 0]}><cylinderGeometry args={[0.3, 0.3, 1.8, 12]} /><meshStandardMaterial color="#f2f1ec" roughness={0.4} /></mesh>
    </group>
  </group>
}

/** 漂在絮凝池水面上的一团团矾花 */
function SurfaceFlocs({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), N = 260
  const pts = useMemo(() => { let s = 91; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; return Array.from({ length: N }, () => ({ x: x0 + 1 + r() * (x1 - x0 - 2), z: BACK + 1 + r() * (CUT - BACK - 2), s: 0.25 + r() * 0.5, ph: r() * 6.3 })) }, [x0, x1])
  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const m = ref.current; if (!m) return
    const t = clock.elapsedTime
    pts.forEach((p, i) => { o.position.set(p.x + Math.sin(t * 0.2 + p.ph) * 0.6, y + 0.06, p.z + Math.cos(t * 0.17 + p.ph) * 0.6); o.scale.set(p.s, 0.08, p.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix) })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}><sphereGeometry args={[1, 10, 6]} /><meshStandardMaterial color="#8a7046" roughness={1} /></instancedMesh>
}

export function Plant({ chlorine = false }: { chlorine?: boolean; station?: number }) {
  const concrete = useConcrete(1, 1)
  const kFloc = murk(40), kSed0 = murk(3), kSed1 = murk(30)
  const T = TANK
  const parts = useMemo(() => {
    const P: Part[] = []
    for (const t of [T.floc, T.sed, T.sand, T.carbon, T.clear]) walkParts(P, t.x0, t.x1, t.h)
    // 沉淀池的集水槽：横跨池子的一道道不锈钢槽
    for (let x = T.sed.x0 + 22; x < T.sed.x1 - 4; x += 8) P.push({ p: [x, T.sed.w + 0.4, (CUT + BACK) / 2], s: [1.4, 1.6, CUT - BACK - 2], c: '#aeb4b8' })
    // 滤池的排水槽（反冲洗时用）
    for (const t of [T.sand, T.carbon]) for (let x = t.x0 + 10; x < t.x1 - 5; x += 15) P.push({ p: [x, t.w - 2.5, (CUT + BACK) / 2], s: [2.2, 3, CUT - BACK - 2], c: '#b3b0a8' })
    // 清水池的顶盖：一块混凝土板，盖着土和草；几只通气帽
    P.push({ p: [(T.clear.x0 + T.clear.x1) / 2, T.clear.h + 0.8, (CUT + BACK) / 2 - 1], s: [T.clear.x1 - T.clear.x0 + WALL * 2, 1.6, CUT - BACK + 2], c: '#c8c5bc' })
    for (let x = T.clear.x0 + 12; x < T.clear.x1; x += 22) P.push({ p: [x, T.clear.h + 3, -50], s: [1, 3, 1], c: '#d6dadb', cyl: true }, { p: [x, T.clear.h + 4.8, -50], s: [2.4, 0.8, 2.4], c: '#d6dadb', cyl: true })
    // 取水泵房立在河边的混凝土底座上，底座一直伸到水下
    P.push({ p: [(INTAKE.x0 + INTAKE.x1) / 2, -6, (INTAKE.z0 + INTAKE.z1) / 2], s: [INTAKE.x1 - INTAKE.x0 + 2, 12, INTAKE.z1 - INTAKE.z0 + 2], c: '#a9a59a' })
    // 管线：取水泵房 → 絮凝池；沉淀池 → 滤池 → 炭池 → 清水池 → 送水泵房 → 出厂
    const Y = 4
    pipe(P, [INTAKE.x1, Y, -32], [T.floc.x0 - WALL - 4, Y, -32], 2.2)
    for (let x = INTAKE.x1 + 20; x < T.floc.x0 - 10; x += 24) P.push({ p: [x, Y / 2 - 0.5, -32], s: [2.4, Y - 1, 3], c: '#a9a59a' })
    pipe(P, [T.floc.x0 - WALL - 4, Y, -32], [T.floc.x0 - WALL - 4, T.floc.h - 4, -32], 2.2)
    pipe(P, [T.sed.x1 + WALL, T.sed.w - 3, -78], [T.sand.x0 - WALL, T.sed.w - 3, -78], 1.8)
    pipe(P, [T.sand.x1 + WALL, 3, -78], [T.carbon.x0 - WALL, 3, -78], 1.8)
    pipe(P, [T.carbon.x1 + WALL, 3, -78], [T.clear.x0 - WALL, 3, -78], 1.8)
    pipe(P, [T.clear.x1 + WALL, 3, -60], [PUMP.x0, 3, -60], 2)
    pipe(P, [PUMP.x1, 4, -60], [560, 4, -60], 2.6)
    // 加氯间 → 清水池进水口：一根细的投药管
    pipe(P, [CHLOR.x1, CHLOR.h * 0.4, -50], [T.clear.x0 - WALL - 1, CHLOR.h * 0.4, -50], 0.4, '#e8e6df')
    pipe(P, [T.clear.x0 - WALL - 1, CHLOR.h * 0.4, -50], [T.clear.x0 - WALL - 1, T.clear.h + 2, -50], 0.4, '#e8e6df')
    // 加氯间门口的储罐区：一圈矮的混凝土围堰，两只卧式储罐的出料管接进加氯间
    const bx0 = CHLOR.x0 + 1, bx1 = CHLOR.x1 - 1, bz0 = CHLOR.z1 + 2, bz1 = CHLOR.z1 + 26
    for (const [a, b2, c, d] of [[bx0, bx1, bz0, bz0 + 0.6], [bx0, bx1, bz1 - 0.6, bz1], [bx0, bx0 + 0.6, bz0, bz1], [bx1 - 0.6, bx1, bz0, bz1]]) P.push({ p: [(a + b2) / 2, 0.6, (c + d) / 2], s: [b2 - a, 1.2, d - c], c: '#b9b5aa' })
    for (const z of [CHLOR.z1 + 8, CHLOR.z1 + 19]) { pipe(P, [CHLOR.x0 + 6, 4.6, z], [CHLOR.x0 + 6, 4.6, CHLOR.z1 + 0.5], 0.35, '#f2f1ec'); pipe(P, [CHLOR.x0 + 6, 4.6, z], [CHLOR.x0 + 6, 1.6, z], 0.35, '#f2f1ec') }
    // 沉淀池上的一座刮泥桥：横跨池子的钢桁架、桥面、栏杆，桥头一台驱动电机
    const bxs = T.sed.x0 + 30
    for (const zz of [BACK - WALL, CUT + 0.5]) P.push({ p: [bxs, T.sed.h + 1.4, zz], s: [3, 2.2, 1.4], c: '#3b4a55' })
    P.push({ p: [bxs, T.sed.h + 2.7, (CUT + BACK) / 2], s: [3.2, 0.3, CUT - BACK + WALL], c: '#6f767b' })
    for (const dx of [-1.5, 1.5]) { P.push({ p: [bxs + dx, T.sed.h + 1.9, (CUT + BACK) / 2], s: [0.35, 1.3, CUT - BACK + WALL], c: '#2a6f9e' }); for (let z = BACK; z <= CUT; z += 5) P.push({ p: [bxs + dx, T.sed.h + 4.6, z], s: [0.16, 3.6, 0.16], c: '#e2b21c', cyl: true }); P.push({ p: [bxs + dx, T.sed.h + 6.3, (CUT + BACK) / 2], s: [0.14, CUT - BACK, 0.14], c: '#e2b21c', r: [Math.PI / 2, 0, 0], cyl: true }) }
    P.push({ p: [bxs, T.sed.h + 4, BACK - WALL + 1.5], s: [2.6, 2.4, 2.6], c: '#2a6f9e' })
    for (let z = BACK + 4; z < CUT; z += 6) P.push({ p: [bxs, T.sed.w / 2, z], s: [0.3, T.sed.w, 0.3], c: '#55616a' })
    // 滤池中间一条横跨的格栅走道，后墙边一排气动阀的执行器
    for (const t of [T.sand, T.carbon]) {
      const xm = (t.x0 + t.x1) / 2
      P.push({ p: [xm, t.h + 0.5, (CUT + BACK) / 2], s: [3, 0.25, CUT - BACK], c: '#7e858a' })
      for (const dx of [-1.5, 1.5]) { for (let z = BACK; z <= CUT; z += 5) P.push({ p: [xm + dx, t.h + 3.6, z], s: [0.16, 6, 0.16], c: '#e2b21c', cyl: true }); P.push({ p: [xm + dx, t.h + 6.4, (CUT + BACK) / 2], s: [0.14, CUT - BACK, 0.14], c: '#e2b21c', r: [Math.PI / 2, 0, 0], cyl: true }) }
      for (let x = t.x0 + 5; x < t.x1; x += 10) P.push({ p: [x, t.h + 2, BACK - WALL - 8.4], s: [1.6, 2.4, 1.6], c: '#2a6f9e' }, { p: [x, t.h + 3.6, BACK - WALL - 8.4], s: [1, 0.8, 1], c: '#e2b21c' })
      pipe(P, [t.x0, t.h - 3, BACK - WALL - 8.4], [t.x1, t.h - 3, BACK - WALL - 8.4], 1.1)
    }
    // 取水头部：河里一座混凝土格栅井，迎水面一排拦污栅；一座钢便桥连到泵房；井上一座门形吊架，提格栅用
    const wx0 = INTAKE.x0 - 22, wx1 = INTAKE.x0 - 12, wz0 = -44, wz1 = -30
    P.push({ p: [(wx0 + wx1) / 2, -4.5, (wz0 + wz1) / 2], s: [wx1 - wx0, 12, wz1 - wz0], c: '#a9a59a' }, { p: [(wx0 + wx1) / 2, 1.65, (wz0 + wz1) / 2], s: [wx1 - wx0 + 0.6, 0.3, wz1 - wz0 + 0.6], c: '#b8b4a8' })
    for (let z = wz0 + 0.8; z < wz1; z += 0.9) P.push({ p: [wx0 - 0.4, -3.2, z], s: [0.16, 9.6, 0.16], c: '#4f565c', cyl: true })
    P.push({ p: [wx0 - 0.4, 1.4, (wz0 + wz1) / 2], s: [0.5, 0.5, wz1 - wz0], c: '#4f565c' })
    P.push({ p: [(wx1 + INTAKE.x0) / 2, 1.5, -37], s: [INTAKE.x0 - wx1 + 1, 0.3, 3.4], c: '#7e858a' })
    for (const sz of [-1, 1]) { P.push({ p: [(wx1 + INTAKE.x0) / 2, 4.9, -37 + sz * 1.6], s: [0.14, INTAKE.x0 - wx1, 0.14], c: '#e2b21c', r: [0, 0, Math.PI / 2], cyl: true }); for (let x = wx1; x <= INTAKE.x0; x += 3) P.push({ p: [x, 3.2, -37 + sz * 1.6], s: [0.14, 3.4, 0.14], c: '#e2b21c', cyl: true }) }
    rail(P, wx0, wx1, 1.8, wz1 + 0.2)
    for (const z of [wz0 + 0.6, wz1 - 0.6]) for (const x of [wx0 + 0.6, wx1 - 0.6]) P.push({ p: [x, 6.8, z], s: [0.6, 10, 0.6], c: '#2f5d8a' })
    for (const x of [wx0 + 0.6, wx1 - 0.6]) P.push({ p: [x, 12, (wz0 + wz1) / 2], s: [0.7, 0.7, wz1 - wz0], c: '#2f5d8a' })
    P.push({ p: [(wx0 + wx1) / 2, 12, (wz0 + wz1) / 2], s: [wx1 - wx0, 0.9, 0.7], c: '#e2b21c' }, { p: [(wx0 + wx1) / 2 - 1, 10.9, (wz0 + wz1) / 2], s: [1.4, 1.2, 1.2], c: '#3b3f43' }, { p: [(wx0 + wx1) / 2 - 1, 8.5, (wz0 + wz1) / 2], s: [0.1, 3.6, 0.1], c: '#3b3f43', cyl: true })
    return mergeParts(P)
  }, [T])
  const labelT = useMemo(() => tankLabel('次氯酸钠', 'NaClO · 消毒剂'), [])
  const signs = useMemo(() => ({
    floc: makeSign(['絮凝沉淀池'], '#2a6f9e', '#fff', 512, 112), sand: makeSign(['滤池'], '#2a6f9e', '#fff', 512, 112), carbon: makeSign(['活性炭池'], '#2a6f9e', '#fff', 512, 112),
    clear: makeSign(['清水池'], '#2a6f9e', '#fff', 512, 112), pump: makeSign(['送水泵房'], '#2a6f9e', '#fff', 512, 112), chlor: makeSign(['加氯间'], '#2a6f9e', '#fff', 512, 112), intake: makeSign(['取水泵房'], '#2a6f9e', '#fff', 512, 112),
  }), [])
  return <group>
    <mesh geometry={parts} castShadow receiveShadow><Painted rough={0.55} metal={0.15} /></mesh>
    {/* 絮凝池：浑水里搅拌桨慢慢转；沉淀池：上面清、下面浑，池底一层泥 */}
    <Shell x0={T.floc.x0} x1={T.sed.x1} h={T.floc.h} inner={[T.floc.x1]} concrete={concrete} />
    <TankWater x0={T.floc.x0} x1={T.floc.x1 - WALL / 2} y0={0} y1={T.floc.w} k0={kFloc} k1={kFloc} />
    <Paddles x0={T.floc.x0} x1={T.floc.x1 - WALL / 2} y={T.floc.w * 0.5} />
    <TankWater x0={T.sed.x0 + WALL / 2} x1={T.sed.x1} y0={2.2} y1={T.sed.w} k0={kSed0} k1={kSed1} />
    <TubeSettlers x0={T.sed.x0 + 14} x1={T.sed.x1 - 2} y={T.sed.w - 6} />
    <SurfaceFlocs x0={T.floc.x0} x1={T.floc.x1 - WALL} y={T.floc.w} />
    {/* 厂房和储罐 */}
    <Building b={INTAKE} hoist />
    <Building b={CHLOR} />
    <Building b={PUMP} hoist />
    {[CHLOR.z1 + 8, CHLOR.z1 + 19].map(z => <group key={z} position={[(CHLOR.x0 + CHLOR.x1) / 2 + 2, 0, z]}><HTank len={20} r={4} label={labelT} /></group>)}
    <mesh position={[(T.sed.x0 + T.sed.x1) / 2 + WALL / 4, 1.1, (CUT + BACK) / 2]}><boxGeometry args={[T.sed.x1 - T.sed.x0 - WALL / 2, 2.2, CUT - BACK]} /><meshStandardMaterial color="#5d4a32" roughness={1} /></mesh>
    {/* 滤池：上面一层水，下面石英砂、卵石承托层 */}
    <Shell x0={T.sand.x0} x1={T.sand.x1} h={T.sand.h} inner={[T.sand.x0 + 20, T.sand.x0 + 40]} concrete={concrete} />
    <Bed x0={T.sand.x0} x1={T.sand.x1} y0={0} y1={T.sand.gravel} kind="gravel" />
    <Bed x0={T.sand.x0} x1={T.sand.x1} y0={T.sand.gravel} y1={T.sand.bed} kind="sand" />
    <TankWater x0={T.sand.x0} x1={T.sand.x1} y0={T.sand.bed} y1={T.sand.w} k0={kSed0} k1={kSed0} />
    {/* 活性炭池：黑色的颗粒活性炭 */}
    <Shell x0={T.carbon.x0} x1={T.carbon.x1} h={T.carbon.h} inner={[T.carbon.x0 + 25]} concrete={concrete} />
    <Bed x0={T.carbon.x0} x1={T.carbon.x1} y0={0} y1={T.carbon.gravel} kind="gravel" />
    <Bed x0={T.carbon.x0} x1={T.carbon.x1} y0={T.carbon.gravel} y1={T.carbon.bed} kind="carbon" />
    <TankWater x0={T.carbon.x0} x1={T.carbon.x1} y0={T.carbon.bed} y1={T.carbon.w} k0={murk(0.6)} k1={murk(0.6)} />
    {/* 清水池：加盖的，剖开能看到清水和导流墙 */}
    <Shell x0={T.clear.x0} x1={T.clear.x1} h={T.clear.h} inner={[T.clear.x0 + 28, T.clear.x0 + 56]} concrete={concrete} />
    <TankWater x0={T.clear.x0} x1={T.clear.x1} y0={0} y1={T.clear.w} k0={0} k1={chlorine ? 0 : 0.02} />
    {/* 阀门 */}
    <Valve at={[T.floc.x0 - WALL - 4, 9, -32]} r={1.3} />
    <Valve at={[(T.sand.x1 + T.carbon.x0) / 2, 3, -78]} r={1.1} />
    <Valve at={[(T.clear.x1 + PUMP.x0) / 2, 3, -60]} r={1.2} />
    <Valve at={[PUMP.x1 + 20, 4, -60]} r={1.5} />
    {/* 牌子：挂在池子后面的走道栏杆上，朝镜头 */}
    {([['floc', (T.floc.x0 + T.sed.x1) / 2, T.floc.h + 9], ['sand', (T.sand.x0 + T.sand.x1) / 2, T.sand.h + 9], ['carbon', (T.carbon.x0 + T.carbon.x1) / 2, T.carbon.h + 9], ['clear', (T.clear.x0 + T.clear.x1) / 2, T.clear.h + 9]] as const).map(([k, x, y]) =>
      <mesh key={k} position={[x, y, BACK - WALL - 5.6]}><planeGeometry args={[16, 3.5]} /><meshStandardMaterial map={signs[k]} roughness={0.6} /></mesh>)}
    <mesh position={[PUMP.x0 + (PUMP.x1 - PUMP.x0) * 0.17, PUMP.h * 0.55, PUMP.z1 + 0.75]}><planeGeometry args={[12, 2.6]} /><meshStandardMaterial map={signs.pump} roughness={0.6} /></mesh>
    <mesh position={[CHLOR.x0 + 5.5, CHLOR.h * 0.6, CHLOR.z1 + 0.75]}><planeGeometry args={[8, 1.8]} /><meshStandardMaterial map={signs.chlor} roughness={0.6} /></mesh>
    <mesh position={[INTAKE.x0 + 6.5, INTAKE.h * 0.55, INTAKE.z1 + 0.75]}><planeGeometry args={[9, 2]} /><meshStandardMaterial map={signs.intake} roughness={0.6} /></mesh>
    {/* 加氯间的投药泵指示灯：投加时亮 */}
    <mesh position={[(CHLOR.x0 + CHLOR.x1) / 2 + 8, CHLOR.h * 0.35, CHLOR.z1 + 0.3]}><circleGeometry args={[0.8, 20]} /><meshBasicMaterial color={chlorine ? '#5dff9c' : '#3a4a40'} toneMapped={false} /></mesh>
  </group>
}
