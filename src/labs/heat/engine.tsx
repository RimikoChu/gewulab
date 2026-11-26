// 测试间里的直列四缸汽油机（外观）和它的台架：缸体、缸盖、气门室盖、点火线圈、排气歧管（烧热了会发红）、进气歧管、
// 前端的皮带轮和发电机、机油滤清器；台架有铸铁底板、支座、测功机、联轴器护罩、散热器和风扇。
// 曲轴沿 x 方向，前端（皮带轮）朝 −x，飞轮朝 +x；排气一侧朝 +z（对着镜头）。单位 1 = 1 dm。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, bolts, disc, lathe, shell } from '@/lab-kit'

type V3 = [number, number, number]
const ENV = 1.3
/** 黑色皱纹漆（气门室盖）、台架的黄漆、测功机的蓝灰漆 */
const Crinkle = () => <meshPhysicalMaterial color="#17191c" roughness={0.62} metalness={0.2} clearcoat={0.25} clearcoatRoughness={0.6} />
const Yellow = () => <meshPhysicalMaterial color="#d9a514" roughness={0.42} metalness={0.15} clearcoat={0.5} clearcoatRoughness={0.3} />
const Rubber = ({ color = '#141517' }: { color?: string }) => <meshStandardMaterial color={color} roughness={0.82} />

/** 一条沿着几点走的管子 */
function tube(pts: V3[], r: number, seg = 48, closed = false) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), closed, 'catmullrom', 0.3), seg, r, 14, closed)
}
/** 一组圆的凸包：皮带绕过几个皮带轮的路径（在 yz 平面里） */
function beltPath(circles: [number, number, number][]) {
  const pts: [number, number][] = []
  for (const [y, z, r] of circles) for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; pts.push([y + Math.cos(a) * r, z + Math.sin(a) * r]) }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo: [number, number][] = [], hi: [number, number][] = []
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p) }
  for (const p of [...pts].reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p) }
  return [...lo.slice(0, -1), ...hi.slice(0, -1)]
}

// ---------- 零件（只建一次） ----------
const PULLEY = lathe([[0, -0.2], [0.7, -0.2], [0.75, -0.16], [0.75, -0.12], [0.68, -0.1], [0.75, -0.06], [0.68, -0.02], [0.75, 0.02], [0.68, 0.06], [0.75, 0.1], [0.75, 0.16], [0.7, 0.2], [0.22, 0.2], [0.22, 0.32], [0, 0.32]], { segs: 40, crease: 40 })
const SMALL_PULLEY = lathe([[0, -0.14], [0.36, -0.14], [0.4, -0.1], [0.36, -0.04], [0.4, 0.02], [0.36, 0.08], [0.4, 0.12], [0.36, 0.16], [0.14, 0.16], [0.14, 0.24], [0, 0.24]], { segs: 32, crease: 40 })
const ALT = lathe([[0, -0.5], [0.52, -0.5], [0.6, -0.42], [0.6, 0.38], [0.5, 0.5], [0.2, 0.55], [0, 0.55]], { segs: 32 })
const FILTER = lathe([[0, 0], [0.4, 0], [0.43, 0.04], [0.43, 0.72], [0.4, 0.78], [0.18, 0.82], [0, 0.82]], { segs: 32 })
const FLY_HOUSING = shell([[2.2, 0], [2.2, 0.14], [1.9, 0.5], [1.2, 0.85], [0.7, 1.0]], 0.08, { segs: 48 })
const COIL = lathe([[0, 0], [0.18, 0], [0.18, 0.9], [0.24, 0.95], [0.24, 1.25], [0, 1.25]], { segs: 18 })
const CAP = lathe([[0, 0], [0.26, 0], [0.28, 0.04], [0.28, 0.16], [0.24, 0.2], [0, 0.2]], { segs: 20 })
const FREEZE = disc(0.2, 0.04, { chamfer: 0.01, segs: 20 })
const BOLTS = bolts(1, 0, 0.14, 0.08)

/** 皮带轮、风扇这些会转的东西：run 0–1 是转速 */
function useSpin(run: number, rate = 14) {
  const g = useRef<THREE.Group>(null), k = useRef(run); k.current = run
  const cur = useRef(0)
  useFrame((_, d) => { const dt = Math.min(d, 1 / 30); cur.current += (k.current - cur.current) * (1 - Math.exp(-dt / 0.6)); if (g.current) g.current.rotation.x -= dt * rate * cur.current })
  return g
}

/**
 * 直列四缸机。at：底座上的那一点（油底壳底面正下方）；run：转不转（0–1）；hot：排气歧管有多热（0–1，烧到暗红再到橙色）。
 * pallet：放在总装线的托盘上（没有台架的支脚）
 */
export function Engine({ at, run, hot, pallet = false }: { at: V3; run: number; hot: number; pallet?: boolean }) {
  const base = pallet ? 0.7 : 3.2, yc = base + 2.0                      // 油底壳底面、曲轴中心的高度
  const spinA = useSpin(run), spinB = useSpin(run, 22), body = useRef<THREE.Group>(null)
  const live = useRef(run); live.current = run
  useFrame(({ clock }) => { if (body.current) { const t = clock.elapsedTime, k = live.current; body.current.position.y = Math.sin(t * 61) * 0.012 * k; body.current.rotation.x = Math.sin(t * 47) * 0.0025 * k } })
  const geo = useMemo(() => {
    const port = (i: number) => -1.95 + i * 1.3
    // 排气歧管：四根管从缸盖出来，往外、往下弯，汇到一起，再一根下来
    const ex = [0, 1, 2, 3].map(i => tube([[port(i), 2.95, 1.3], [port(i), 2.95, 1.85], [port(i) * 0.75 + 0.25, 2.2, 2.35], [0.55 + (i - 1.5) * 0.12, 1.3, 2.45], [0.55, 0.9, 2.45]], 0.24))
    const down = tube([[0.55, 1.1, 2.45], [0.55, 0.3, 2.45], [0.9, -0.6, 2.5], [1.8, -1.3, 2.6], [2.8, -1.6, 2.7]], 0.3)
    // 进气歧管：一根粗的稳压腔，四根歧管弯到缸盖上
    const inl = [0, 1, 2, 3].map(i => tube([[port(i), 2.95, -1.3], [port(i), 3.1, -1.9], [port(i), 3.7, -2.4], [port(i) * 0.9, 4.0, -2.9]], 0.26))
    const belt = beltPath([[0, 0, 0.76], [1.9, 1.75, 0.41], [1.65, 0.25, 0.41], [1.05, 1.05, 0.25]])
    const beltG = tube(belt.map(([y, z]) => [0, y, z] as V3), 0.06, 160, true)
    // 冷却液管：节温器到前面（散热器那头）、水泵进水口
    const upper = tube([[-2.6, 3.4, 0.7], [-3.4, 3.6, 0.7], [-4.6, 3.3, 0.9], [-5.9, 3.0, 1.1]], 0.2)
    const lower = tube([[-2.8, 1.0, 0.9], [-3.6, 0.6, 1.2], [-4.8, -1.2, 1.3], [-5.9, -1.75, 1.1]], 0.2)
    return { ex, down, inl, beltG, upper, lower }
  }, [])
  // 排气歧管：冷的时候是不锈钢的本色，越热颜色越深（发蓝发褐），再热就从里往外透出暗红
  const exColor = useMemo(() => new THREE.Color(), [])
  exColor.setRGB(0.5, 0.48, 0.46).lerp(new THREE.Color().setRGB(0.12, 0.08, 0.07), Math.min(1, hot * 1.2))
  const exMat = <meshStandardMaterial color={exColor} metalness={0.85} roughness={0.42} envMapIntensity={ENV} emissive="#a81a06" emissiveIntensity={Math.max(0, hot - 0.4) ** 1.5 * 2.2} />
  return <group position={at}>
    <group ref={body} position-y={yc}>
      {/* 缸体：铝合金铸件，侧面几道加强筋和三个水堵 */}
      <RoundedBox args={[5.2, 2.75, 2.5]} radius={0.12} smoothness={3} position={[0, 0.95, 0]} castShadow receiveShadow><Metal kind="aluminum" grain="cast" rough={0.55} env={ENV} /></RoundedBox>
      <RoundedBox args={[5.0, 1.0, 2.8]} radius={0.1} smoothness={3} position={[0, -0.55, 0]} castShadow><Metal kind="aluminum" grain="cast" rough={0.55} env={ENV} /></RoundedBox>
      {[-2.0, -0.65, 0.65, 2.0].map(x => <mesh key={x} position={[x, 0.9, 1.3]}><boxGeometry args={[0.16, 2.3, 0.14]} /><Metal kind="aluminum" grain="cast" rough={0.55} env={ENV} /></mesh>)}
      {[-1.3, 0, 1.3].map(x => <mesh key={x} geometry={FREEZE} position={[x, 1.4, 1.26]} rotation-x={Math.PI / 2}><Metal kind="brass" env={ENV} /></mesh>)}
      {/* 缸垫的一道缝、缸盖 */}
      <mesh position={[0, 2.34, 0]}><boxGeometry args={[5.22, 0.05, 2.52]} /><meshStandardMaterial color="#202326" roughness={0.6} /></mesh>
      <RoundedBox args={[5.3, 1.2, 2.6]} radius={0.1} smoothness={3} position={[0, 2.96, 0]} castShadow receiveShadow><Metal kind="aluminum" grain="cast" rough={0.45} env={ENV} /></RoundedBox>
      {/* 气门室盖：黑色皱纹漆，中间一道脊，四个点火线圈插在上面，前头一个加机油口盖 */}
      <RoundedBox args={[5.1, 0.7, 2.3]} radius={0.22} smoothness={4} position={[0, 3.85, 0]} castShadow><Crinkle /></RoundedBox>
      <RoundedBox args={[4.6, 0.3, 0.9]} radius={0.1} smoothness={3} position={[0, 4.25, 0]} castShadow><Crinkle /></RoundedBox>
      {[-1.95, -0.65, 0.65, 1.95].map(x => <group key={x} position={[x, 3.7, 0]}><mesh geometry={COIL} castShadow><meshPhysicalMaterial color="#0e0f11" roughness={0.35} clearcoat={0.6} /></mesh><mesh position={[0.24, 1.08, 0]}><boxGeometry args={[0.2, 0.22, 0.3]} /><meshStandardMaterial color="#2a2d31" roughness={0.6} /></mesh></group>)}
      <mesh geometry={CAP} position={[-2.0, 4.2, 0.7]}><meshPhysicalMaterial color="#e0a817" roughness={0.4} clearcoat={0.5} /></mesh>
      {Array.from({ length: 10 }, (_, i) => <mesh key={i} geometry={BOLTS} position={[-2.35 + (i % 5) * 1.175, 4.2, (i < 5 ? 1 : -1) * 1.0]}><Metal kind="steel" env={ENV} /></mesh>)}
      {/* 油底壳：铸铝的，下面一圈散热筋，一颗放油螺塞 */}
      <RoundedBox args={[4.8, 1.0, 2.4]} radius={0.16} smoothness={3} position={[0, -1.5, 0]} castShadow><Metal kind="aluminum" grain="cast" rough={0.6} env={ENV} /></RoundedBox>
      {[-1.6, -0.8, 0, 0.8, 1.6].map(x => <mesh key={x} position={[x, -1.8, 1.22]}><boxGeometry args={[0.1, 0.4, 0.08]} /><Metal kind="aluminum" grain="cast" rough={0.6} env={ENV} /></mesh>)}
      <mesh position={[1.5, -2.02, 0]}><cylinderGeometry args={[0.12, 0.12, 0.08, 6]} /><Metal kind="steel" env={ENV} /></mesh>
      {/* 排气歧管和下行管 */}
      {[0, 1, 2, 3].map(i => <mesh key={i} position={[-1.95 + i * 1.3, 2.95, 1.36]}><boxGeometry args={[0.9, 0.75, 0.12]} /><Metal kind="steel" env={ENV} /></mesh>)}
      {geo.ex.map((g, i) => <mesh key={i} geometry={g} castShadow>{exMat}</mesh>)}
      <mesh geometry={geo.down} castShadow>{exMat}</mesh>
      {/* 进气歧管：塑料的，黑色；稳压腔；前头接节气门 */}
      {geo.inl.map((g, i) => <mesh key={i} geometry={g} castShadow><meshStandardMaterial color="#202326" roughness={0.55} /></mesh>)}
      <mesh position={[0, 4.05, -2.95]} rotation-z={Math.PI / 2} castShadow><capsuleGeometry args={[0.55, 4.0, 8, 20]} /><meshStandardMaterial color="#202326" roughness={0.55} /></mesh>
      <mesh position={[-2.9, 4.05, -2.95]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.45, 0.45, 0.5, 24]} /><Metal kind="aluminum" grain="cast" env={ENV} /></mesh>
      {/* 机油滤清器：蓝色的罐，螺在缸体侧面 */}
      <group position={[1.1, -0.3, 1.4]} rotation-x={Math.PI / 2}><mesh geometry={FILTER} castShadow><meshPhysicalMaterial color="#1f4f8f" roughness={0.35} clearcoat={0.7} /></mesh></group>
      {/* 前端：正时罩、曲轴皮带轮、水泵皮带轮、发电机、张紧轮和皮带 */}
      <RoundedBox args={[0.24, 4.4, 2.2]} radius={0.1} smoothness={3} position={[-2.7, 1.2, 0]} castShadow><Metal kind="aluminum" grain="cast" rough={0.5} env={ENV} /></RoundedBox>
      <group position={[-3.05, 0, 0]}>
        <group ref={spinA}><mesh geometry={PULLEY} rotation-z={Math.PI / 2} castShadow><Metal kind="iron" grain="turned" env={ENV} /></mesh><mesh position={[-0.33, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.12, 0.12, 0.06, 6]} /><Metal kind="steel" env={ENV} /></mesh></group>
        <group ref={spinB} position={[0, 1.65, 0.25]}><mesh geometry={SMALL_PULLEY} rotation-z={Math.PI / 2} castShadow><Metal kind="steel" grain="turned" env={ENV} /></mesh></group>
        <mesh geometry={SMALL_PULLEY} position={[0, 1.9, 1.75]} rotation-z={Math.PI / 2} castShadow><Metal kind="steel" grain="turned" env={ENV} /></mesh>
        <mesh position={[0, 1.05, 1.05]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.25, 0.25, 0.3, 24]} /><meshStandardMaterial color="#1b1d20" roughness={0.4} /></mesh>
        <mesh geometry={geo.beltG} castShadow><Rubber /></mesh>
      </group>
      <group position={[-2.35, 1.9, 1.75]} rotation-z={Math.PI / 2}><mesh geometry={ALT} castShadow><Metal kind="aluminum" grain="cast" rough={0.4} env={ENV} /></mesh></group>
      {/* 节温器座和两根冷却液管（台架上才接到散热器） */}
      <mesh position={[-2.45, 3.4, 0.7]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.3, 0.3, 0.4, 20]} /><Metal kind="aluminum" grain="cast" env={ENV} /></mesh>
      {!pallet && <><mesh geometry={geo.upper} castShadow><Rubber /></mesh><mesh geometry={geo.lower} castShadow><Rubber /></mesh></>}
      {/* 飞轮壳：喇叭口朝 +x */}
      <mesh geometry={FLY_HOUSING} position={[2.6, 0, 0]} rotation-z={-Math.PI / 2} castShadow><Metal kind="aluminum" grain="cast" rough={0.5} env={ENV} /></mesh>
      {/* 支脚：两侧各一块安装支架 */}
      {!pallet && [-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 2.9, -0.75, sz * 1.0]} castShadow><boxGeometry args={[0.5, 0.4, 0.5]} /><Metal kind="iron" grain="cast" env={ENV} /></mesh>))}
    </group>
    {/* 托盘：钢框加四个定位销 */}
    {pallet && <group>
      <RoundedBox args={[7, 0.7, 5.4]} radius={0.06} smoothness={2} position={[0, 0.35, 0]} castShadow receiveShadow><Metal kind="steel" grain="brushed" rough={0.45} env={ENV} /></RoundedBox>
      {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 1.9, 0.7 + 0.6, sz * 1.65]} castShadow><boxGeometry args={[0.5, 1.2, 0.5]} /><Yellow /></mesh>))}
    </group>}
  </group>
}

// ---------- 台架 ----------
/** 散热器芯子的细散热片：一道道竖线 */
function makeFins() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#25292d'; g.fillRect(0, 0, 256, 64)
  g.fillStyle = '#80878c'; for (let x = 0; x < 256; x += 4) g.fillRect(x, 0, 1.6, 64)
  g.fillStyle = 'rgba(20,22,24,0.9)'; for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 256, 3)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 6); t.anisotropy = 8
  return t
}
const DYNO = lathe([[0, -1.7], [1.5, -1.7], [1.75, -1.55], [1.95, -1.5], [2.0, -1.3], [2.0, 1.3], [1.95, 1.5], [1.75, 1.55], [1.5, 1.7], [0, 1.7]], { segs: 48 })
const FAN_BLADE = (() => { const s = new THREE.Shape(); s.moveTo(0.25, -0.12); s.quadraticCurveTo(1.0, -0.4, 1.75, -0.3); s.quadraticCurveTo(1.85, 0, 1.7, 0.35); s.quadraticCurveTo(1.0, 0.3, 0.25, 0.12); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false }) })()

/** 台架：铸铁 T 形槽底板、两个支座、联轴器护罩、测功机；kind 为 radiator 时前面还有散热器、风扇、膨胀水箱 */
export function TestStand({ at, kind, run = 0 }: { at: V3; kind: 'radiator' | 'dyno'; run?: number }) {
  const fins = useMemo(makeFins, [])
  return <group position={at}>
    {/* 底板 */}
    <RoundedBox args={[22, 0.7, 9]} radius={0.08} smoothness={2} position={[1.5, 0.35, 0]} castShadow receiveShadow><Metal kind="iron" grain="cast" env={ENV} /></RoundedBox>
    {[-3, -1, 1, 3].map(z => <mesh key={z} position={[1.5, 0.705, z]} rotation-x={-Math.PI / 2}><planeGeometry args={[21.6, 0.28]} /><meshStandardMaterial color="#0d0e10" roughness={0.9} /></mesh>)}
    {/* 支座：黄漆的钢立柱，托住发动机的四个支脚 */}
    {[-1, 1].map(sx => <group key={sx} position={[sx * 2.9, 0.7, 0]}>
      {[-1, 1].map(sz => <group key={sz} position-z={sz * 1.0}>
        <RoundedBox args={[0.6, 3.3, 0.6]} radius={0.05} smoothness={2} position={[0, 1.65, 0]} castShadow><Yellow /></RoundedBox>
        <mesh position={[0, 3.42, 0]}><cylinderGeometry args={[0.26, 0.3, 0.2, 20]} /><Rubber color="#1e1f21" /></mesh>
      </group>)}
      <RoundedBox args={[0.5, 0.4, 2.6]} radius={0.04} smoothness={2} position={[0, 1.0, 0]} castShadow><Yellow /></RoundedBox>
      <RoundedBox args={[1.2, 0.2, 3.2]} radius={0.04} smoothness={2} position={[0, 0.1, 0]} castShadow><Yellow /></RoundedBox>
    </group>)}
    {/* 联轴器和护罩（橙色的网罩） */}
    <mesh position={[4.6, 5.2, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.28, 0.28, 3.2, 20]} /><Metal kind="steel" grain="turned" env={ENV} /></mesh>
    <mesh position={[4.6, 5.2, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[1.0, 1.0, 2.6, 28, 1, true, Math.PI * 0.05, Math.PI * 1.1]} /><meshStandardMaterial color="#e06b1e" roughness={0.5} side={THREE.DoubleSide} transparent opacity={0.55} depthWrite={false} /></mesh>
    {/* 测功机：蓝灰色的壳，两端的轴承座，下面一个托架 */}
    <group position={[8.6, 5.2, 0]}>
      <mesh geometry={DYNO} rotation-z={Math.PI / 2} castShadow receiveShadow><meshPhysicalMaterial color="#2c4a66" roughness={0.38} metalness={0.25} clearcoat={0.7} clearcoatRoughness={0.25} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * 1.75, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.6, 0.6, 0.3, 28]} /><Metal kind="steel" grain="turned" env={ENV} /></mesh>)}
      <mesh position={[0, 2.05, 0]}><boxGeometry args={[1.2, 0.2, 0.8]} /><Metal kind="aluminum" grain="brushed" env={ENV} /></mesh>
      {/* 冷却水进出管 */}
      {[-0.6, 0.6].map(x => <mesh key={x} position={[x, -1.5, 1.6]} rotation-x={0.6}><cylinderGeometry args={[0.15, 0.15, 1.4, 14]} /><Metal kind="copper" env={ENV} /></mesh>)}
      <RoundedBox args={[3.6, 3.0, 3.4]} radius={0.08} smoothness={2} position={[0, -3.2, 0]} castShadow><meshPhysicalMaterial color="#2c4a66" roughness={0.45} metalness={0.2} clearcoat={0.5} /></RoundedBox>
    </group>
    {kind === 'radiator' && <group position={[-7.2, 0.7, 1.0]} rotation-y={-0.75}>
      {/* 散热器：芯子、上下水室、两根立柱，后面一圈导风罩和风扇 */}
      {[-1, 1].map(s => <mesh key={s} position={[0, 3.8, s * 2.6]} castShadow><boxGeometry args={[0.5, 7.6, 0.5]} /><Yellow /></mesh>)}
      <mesh position={[0, 5.0, 0]} castShadow><boxGeometry args={[0.42, 4.2, 4.6]} /><meshStandardMaterial color="#26292c" roughness={0.6} metalness={0.5} /></mesh>
      {[1, -1].map(s => <mesh key={s} position={[s * 0.215, 5.0, 0]} rotation-y={s * Math.PI / 2}><planeGeometry args={[4.5, 4.1]} /><meshStandardMaterial map={fins} roughness={0.5} metalness={0.6} /></mesh>)}
      {[7.35, 2.65].map(y => <RoundedBox key={y} args={[0.7, 0.5, 4.8]} radius={0.08} smoothness={2} position={[0, y, 0]} castShadow><meshStandardMaterial color="#141517" roughness={0.45} /></RoundedBox>)}
      <mesh position={[-0.55, 5.0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[2.05, 2.05, 0.5, 40, 1, true]} /><meshStandardMaterial color="#1c1e21" roughness={0.6} side={THREE.DoubleSide} /></mesh>
      <Fan run={run} />
      {/* 膨胀水箱：半透明的白塑料壶，看得见里面粉色冷却液的液面 */}
      <group position={[1.4, 6.4, -2.2]}>
        <RoundedBox args={[1.2, 1.3, 0.9]} radius={0.18} smoothness={3} position={[0, 0.65, 0]} renderOrder={3}><meshPhysicalMaterial color="#f4f1ea" roughness={0.35} transparent opacity={0.55} depthWrite={false} /></RoundedBox>
        <RoundedBox args={[1.1, 0.75, 0.8]} radius={0.14} smoothness={3} position={[0, 0.42, 0]} renderOrder={2}><meshStandardMaterial color="#e0457a" roughness={0.2} transparent opacity={0.75} /></RoundedBox>
        <mesh position={[0.2, 1.4, 0]}><cylinderGeometry args={[0.22, 0.22, 0.2, 20]} /><meshStandardMaterial color="#1a1b1d" roughness={0.5} /></mesh>
        <mesh position={[0, -0.6, 0]}><boxGeometry args={[0.2, 1.4, 0.2]} /><Yellow /></mesh>
      </group>
    </group>}
  </group>
}
/** 散热器后面的风扇：七片叶，跟着发动机转 */
function Fan({ run }: { run: number }) {
  const g = useSpin(run, 9)
  return <group ref={g} position={[-0.75, 5.0, 0]}>
    {Array.from({ length: 7 }, (_, i) => <mesh key={i} geometry={FAN_BLADE} rotation={[i / 7 * Math.PI * 2, Math.PI / 2, 0.25]} castShadow><meshStandardMaterial color="#202224" roughness={0.5} /></mesh>)}
    <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.35, 0.35, 0.4, 20]} /><Metal kind="steel" env={ENV} /></mesh>
  </group>
}
