// 机械振动和机械波实验室的大场景：一座小渔港。整个实验室只有这一个世界，各课在里面各占一处，换课时画布不重建，镜头飞过去。
// 水面在 y = 0；岸线在 z = 0，z > 0 是码头面；z = −70 是抛石防波堤，留一个口门，口门里有两扇钢闸门；堤头有灯塔。各课的位置在 layout.ts。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LabStage, Metal, Painted, lathe, mergeParts, useConcrete, type Label, type Part } from '@/lab-kit'
import { FishingBoat } from './boats'
import { AT, PATCH, QUAY, SPOT, WALL, type PatchSpec, type SpotKey, type V3 } from './layout'
import { ribTex, rng, rockTex } from './mats'
import { Sea } from './sea'

/** 各课对世界的要求：gate 是口门现在留多宽（m） */
export interface Want { patch: PatchSpec | null; gate: number }

/** 每一课用它把器材、标签交给常驻的画布；at 决定机位和用哪块水面网格 */
export function Place({ at, labels, gate = WALL.gap, children = null }: { at: SpotKey; labels: Label[]; gate?: number; children?: ReactNode }) {
  const s = SPOT[at] as (typeof SPOT)[SpotKey] & { patch?: keyof typeof PATCH; fog?: [number, number]; sun?: number }
  const want = useMemo<Want>(() => ({ patch: s.patch ? PATCH[s.patch] : null, gate }), [s, gate])
  return <LabStage<Want> labels={labels} target={s.target} span={s.span as [number, number]} view={s.view as [number, number]} fog={s.fog ?? [110, 560]} sun={s.sun ?? 3.1} env={1.05} world={want}>{children}</LabStage>
}

const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string, r?: V3): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c, r })
const cyl = (x: number, y0: number, z: number, r: number, h: number, c: string, rot?: V3): Part => ({ p: [x, y0 + h / 2, z], s: [r, h, 0], c, cyl: true, r: rot })

// ---------- 码头 ----------
const BOLLARD: [number, number][] = [[0, 0], [0.21, 0], [0.21, 0.04], [0.15, 0.07], [0.13, 0.3], [0.15, 0.36], [0.24, 0.4], [0.25, 0.46], [0.2, 0.5], [0, 0.52]]
function Quay() {
  const W = QUAY.x1 - QUAY.x0, cx = (QUAY.x0 + QUAY.x1) / 2
  const [d, n, r] = useConcrete(W / 7, QUAY.depth / 7)
  const [d2, n2, r2] = useConcrete(W / 5, 1)
  const bollard = useMemo(() => lathe(BOLLARD, { segs: 28 }), [])
  const bits = useMemo(() => {
    const p: Part[] = []
    // 岸壁上的橡胶护舷：竖着的黑色半圆柱，隔 8 m 一根；护舷之间是潮水留下的深色水线
    for (let x = QUAY.x0 + 4; x < QUAY.x1; x += 8) p.push(cyl(x, 0.15, -0.16, 0.2, 1.2, '#15171a'))
    // 码头面边上的系缆环座和黄色警示边
    p.push(box(cx, QUAY.y, 0.45, W, 0.012, 0.16, '#c9a227'))
    return mergeParts(p)
  }, [W, cx])
  return <group>
    <mesh position={[cx, QUAY.y - 3, QUAY.depth / 2]} receiveShadow castShadow><boxGeometry args={[W, 6, QUAY.depth]} /><meshStandardMaterial map={d} normalMap={n} roughnessMap={r} color="#b4b1a6" /></mesh>
    {/* 岸壁正面：单独一层，纹理不被拉长；下半截长着青苔 */}
    <mesh position={[cx, QUAY.y - 1.5, -0.01]}><planeGeometry args={[W, 3]} /><meshStandardMaterial map={d2} normalMap={n2} roughnessMap={r2} color="#8f8c80" /></mesh>
    <mesh position={[cx, 0.05, -0.02]}><planeGeometry args={[W, 0.9]} /><meshStandardMaterial color="#343a2a" roughness={0.9} transparent opacity={0.82} /></mesh>
    <mesh position={[cx, QUAY.y - 0.14, -0.03]}><boxGeometry args={[W, 0.28, 0.1]} /><meshStandardMaterial color="#a3a094" roughness={0.9} /></mesh>
    <mesh geometry={bits} castShadow><Painted rough={0.8} metal={0.05} /></mesh>
    {Array.from({ length: 22 }, (_, i) => QUAY.x0 + 9 + i * 12).map(x => <mesh key={x} geometry={bollard} position={[x, QUAY.y, 1.1]} castShadow><Metal kind="iron" grain="cast" /></mesh>)}
  </group>
}

/** 试验棚：六根工字钢柱、单坡波纹板屋顶，靠海一侧只有半人高的矮墙，看得见港池 */
function Shed() {
  const [x, z] = AT.spring, W = 9, D = 7, H = 3.5
  const geo = useMemo(() => {
    const p: Part[] = [], steel = '#3d4a57'
    for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) {
      const h = H + (sz < 0 ? 0 : 0.5)
      p.push(box(sx * (W / 2 - 0.15), 0, sz * (D / 2 - 0.15), 0.16, h, 0.2, steel), box(sx * (W / 2 - 0.15), 0, sz * (D / 2 - 0.15), 0.34, 0.02, 0.34, '#2a3038'))
    }
    for (const sx of [-1, 0, 1]) p.push(box(sx * (W / 2 - 0.15), H + 0.07, 0, 0.12, 0.2, D + 0.6, steel, [0.0745, 0, 0]))
    for (const sz of [-1, -0.33, 0.33, 1]) p.push(box(0, H + 0.3 + sz * 0.25, sz * (D / 2 - 0.1), W + 0.5, 0.08, 0.08, steel))
    // 靠海一侧和西侧的矮墙
    p.push(box(0, 0, -D / 2 + 0.1, W - 0.4, 1.0, 0.06, '#4f6a7d'), box(0, 1.0, -D / 2 + 0.1, W - 0.3, 0.05, 0.1, steel))
    return mergeParts(p)
  }, [])
  const rib = useMemo(() => ribTex([36, 1]), [])
  const [fd, fn, fr] = useConcrete(5, 4)
  return <group position={[x, QUAY.y, z]}>
    {/* 棚里的地坪：刷了灰绿色地坪漆 */}
    <mesh position-y={0.006} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[W - 0.2, D - 0.2]} /><meshStandardMaterial map={fd} normalMap={fn} roughnessMap={fr} color="#9fb0a4" /></mesh>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.55} metal={0.4} /></mesh>
    <mesh position={[0, H + 0.42, 0]} rotation-x={0.0745}><boxGeometry args={[W + 0.8, 0.05, D + 1]} /><meshStandardMaterial color="#aab4bb" metalness={0.6} roughness={0.45} bumpMap={rib} bumpScale={1.2} /></mesh>
  </group>
}

/** 仓库：长条的双坡顶库房，波纹板外墙，朝港池一面有几扇卷帘门 */
function Warehouse({ x, z, w, color, roof }: { x: number; z: number; w: number; color: string; roof: string }) {
  const D = 16, H = 7
  const rib = useMemo(() => ribTex([w * 2.2, 1]), [w])
  const roofGeo = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-D / 2 - 0.5, 0); s.lineTo(0, 3); s.lineTo(D / 2 + 0.5, 0); s.lineTo(D / 2 + 0.5, -0.15); s.lineTo(-D / 2 - 0.5, -0.15); s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: w + 1, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(-(w + 1) / 2, 0, 0); return g
  }, [w])
  const doors = useMemo(() => mergeParts(Array.from({ length: Math.floor(w / 12) }, (_, i) => i).flatMap(i => {
    const dx = -w / 2 + 6 + i * 12
    return [box(dx, 0, -D / 2 - 0.03, 5, 4.6, 0.08, '#6b7479'), box(dx, 4.6, -D / 2 - 0.05, 5.4, 0.25, 0.14, '#3b4247'), box(dx + 4.4, 4.9, -D / 2 - 0.03, 2.6, 1, 0.06, '#1f2c36')]
  })), [w])
  return <group position={[x, QUAY.y, z]}>
    <mesh position-y={H / 2} castShadow receiveShadow><boxGeometry args={[w, H, D]} /><meshStandardMaterial color={color} roughness={0.7} metalness={0.2} bumpMap={rib} bumpScale={1} /></mesh>
    <mesh geometry={roofGeo} position-y={H + 0.15} castShadow><meshStandardMaterial color={roof} roughness={0.6} metalness={0.3} /></mesh>
    <mesh geometry={doors}><Painted rough={0.6} /></mesh>
  </group>
}

/** 集装箱堆场：几摞颜色不同的箱子 */
function Containers({ x, z }: { x: number; z: number }) {
  const rib = useMemo(() => ribTex([26, 1]), [])
  const list = useMemo(() => {
    const r = rng(3), cols = ['#9c3b2e', '#2d5f8a', '#c08a2b', '#3d6b4f', '#7b7f85', '#8a2f3c'], out: { p: V3; c: string }[] = []
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const h = 1 + Math.floor(r() * 3); for (let k = 0; k < h; k++) out.push({ p: [i * 6.4, 1.3 + k * 2.6, j * 2.7], c: cols[Math.floor(r() * cols.length)] }) }
    return out
  }, [])
  return <group position={[x, QUAY.y, z]}>{list.map((b, i) => <RoundedBox key={i} args={[6.06, 2.59, 2.44]} radius={0.04} position={b.p} castShadow receiveShadow><meshStandardMaterial color={b.c} roughness={0.55} metalness={0.35} bumpMap={rib} bumpScale={0.8} /></RoundedBox>)}</group>
}

/** 码头上的固定吊：圆筒基座、回转机房、斜伸出去的箱形吊臂、钢丝绳和吊钩 */
function Crane({ x, z }: { x: number; z: number }) {
  const geo = useMemo(() => mergeParts([
    cyl(0, 0, 0, 1.3, 0.5, '#4a4f55'), cyl(0, 0.5, 0, 0.95, 6.5, '#d9a21b'), cyl(0, 7, 0, 1.25, 0.35, '#2d3136'),
    box(-0.6, 7.35, 0, 4.2, 2.3, 2.4, '#d9a21b'), box(1.0, 7.9, 0, 0.08, 1.0, 1.9, '#18222b'), box(-2.4, 7.35, 0, 0.9, 1.6, 2.2, '#3a3f45'),
    box(0.6, 9.65, 0, 0.5, 3.2, 0.5, '#d9a21b'),
    // 吊臂：从机房前面斜着伸向港池上空
    box(-0.2, 12.3, -6.9, 0.9, 1.0, 16.5, '#d9a21b', [0.42, 0, 0]),
    box(0.6, 12.6, -3.4, 0.07, 0.07, 8.6, '#22262a', [-0.2, 0, 0]),
    cyl(-0.2, 2.2, -14.2, 0.025, 13.4, '#22262a'), box(-0.2, 1.5, -14.2, 0.5, 0.7, 0.3, '#c8342b'),
  ]), [])
  return <mesh geometry={geo} position={[x, QUAY.y, z]} castShadow receiveShadow><Painted rough={0.5} metal={0.35} /></mesh>
}

// ---------- 防波堤 ----------
/** 一段抛石堤：横截面是梯形，表面的石块高低不平。沿 x 从 x0 到 x1 */
function rubble(x0: number, x1: number, seed: number) {
  const prof: [number, number][] = [[-10.5, -2.2], [-7.5, -0.4], [-4.6, 1.0], [-2.6, 1.55], [2.6, 1.55], [4.4, 0.9], [6.6, -0.4], [9, -2.2]]
  const L = x1 - x0, nx = Math.max(2, Math.round(L / 1.6)), r = rng(seed), pos: number[] = [], uv: number[] = [], idx: number[] = []
  for (let i = 0; i <= nx; i++) for (let j = 0; j < prof.length; j++) {
    const flat = j === 3 || j === 4, k = flat ? 0.08 : 0.42
    pos.push(x0 + (i / nx) * L + (r() - 0.5) * k, prof[j][1] + (r() - 0.5) * k, WALL.z + prof[j][0] + (r() - 0.5) * k)
    uv.push((i / nx) * L / 7, j / 2.2)
  }
  const m = prof.length
  for (let i = 0; i < nx; i++) for (let j = 0; j < m - 1; j++) { const a = i * m + j, b = a + 1, c = a + m, d = c + 1; idx.push(a, b, c, b, d, c) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals()
  return g
}
const TOWER: [number, number][] = [[0, 0], [2.3, 0], [2.3, 0.5], [1.75, 0.6], [1.2, 10.2], [1.75, 10.35], [1.75, 10.6], [1.15, 10.6], [1.15, 10.65], [0, 10.65]]
/** 灯塔：白色塔身两道红箍，上面一圈带栏杆的平台、玻璃灯室、红色的圆顶 */
function Lighthouse({ x, z, y }: { x: number; z: number; y: number }) {
  const tower = useMemo(() => lathe(TOWER, { segs: 40 }), [])
  const rail = useMemo(() => mergeParts([...Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return cyl(Math.cos(a) * 1.66, 10.6, Math.sin(a) * 1.66, 0.025, 0.95, '#e8e8e4') })]), [])
  const lamp = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (lamp.current) lamp.current.rotation.y = clock.elapsedTime * 0.8 })
  return <group position={[x, y, z]}>
    <mesh geometry={tower} castShadow receiveShadow><meshStandardMaterial color="#eceae2" roughness={0.6} /></mesh>
    {[3.2, 7].map(h => <mesh key={h} position-y={h}><cylinderGeometry args={[1.94 - h * 0.062 - 0.07, 1.94 - h * 0.062 + 0.07, 1.6, 40, 1, true]} /><meshStandardMaterial color="#b9322a" roughness={0.55} /></mesh>)}
    <mesh position={[0, 1.6, 1.99]}><boxGeometry args={[0.8, 1.9, 0.08]} /><meshStandardMaterial color="#27506b" roughness={0.5} /></mesh>
    <mesh geometry={rail}><Painted rough={0.4} metal={0.6} /></mesh>
    <mesh position-y={11.55} rotation-x={Math.PI / 2}><torusGeometry args={[1.66, 0.03, 8, 40]} /><meshStandardMaterial color="#e8e8e4" metalness={0.6} roughness={0.4} /></mesh>
    <mesh position-y={11.45}><cylinderGeometry args={[0.95, 0.95, 1.6, 12, 1, true]} /><meshPhysicalMaterial color="#cfe6ee" roughness={0.05} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} envMapIntensity={1.6} /></mesh>
    <mesh ref={lamp} position-y={11.4}><boxGeometry args={[0.5, 0.7, 0.2]} /><meshStandardMaterial color="#fff6d0" emissive="#ffe9a0" emissiveIntensity={2.4} toneMapped={false} /></mesh>
    {Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2).map(a => <mesh key={a} position={[Math.cos(a) * 0.95, 11.45, Math.sin(a) * 0.95]}><boxGeometry args={[0.05, 1.6, 0.05]} /><meshStandardMaterial color="#2a2f33" metalness={0.5} roughness={0.5} /></mesh>)}
    <mesh position-y={12.25}><coneGeometry args={[1.2, 1.1, 24]} /><meshStandardMaterial color="#a82c25" roughness={0.45} metalness={0.3} /></mesh>
    <mesh position-y={12.95}><sphereGeometry args={[0.14, 12, 8]} /><Metal kind="brass" /></mesh>
  </group>
}

/** 防波堤：两段抛石堤、堤顶的混凝土路面和挡浪墙、口门两边方正的沉箱堤头、灯塔和对面的绿色灯桩；两扇钢闸门可以推出来把口门收窄 */
function Breakwater({ gate }: { gate: number }) {
  const { gx, gap, z, top } = WALL, hx = gap / 2, HEAD = 10
  const [, cn, cr] = useConcrete(6, 3)
  const rocks = useMemo(() => [rubble(QUAY.x0 - 20, gx - hx - HEAD + 1, 2), rubble(gx + hx + HEAD - 1, QUAY.x1 + 20, 4)], [gx, hx])
  const map = useMemo(() => rockTex('map', [1, 1]), []), bump = useMemo(() => rockTex('bump', [1, 1]), [])
  const caps = useMemo(() => mergeParts([
    box((QUAY.x0 - 20 + gx - hx - HEAD) / 2, 1.5, z, gx - hx - HEAD - QUAY.x0 + 20, 0.45, 4.6, '#a9a69b'), box((QUAY.x0 - 20 + gx - hx - HEAD) / 2, 1.95, z - 2.0, gx - hx - HEAD - QUAY.x0 + 20, 1.1, 0.5, '#9c998e'),
    box((gx + hx + HEAD + QUAY.x1 + 20) / 2, 1.5, z, QUAY.x1 + 20 - gx - hx - HEAD, 0.45, 4.6, '#a9a69b'), box((gx + hx + HEAD + QUAY.x1 + 20) / 2, 1.95, z - 2.0, QUAY.x1 + 20 - gx - hx - HEAD, 1.1, 0.5, '#9c998e'),
    // 堤头上的系缆桩和护栏立柱
    ...[-1, 1].flatMap(s => [-3.6, 3.6].map(dz => cyl(gx + s * (hx + 0.7), top, z + dz, 0.16, 0.45, '#22262a'))),
    // 绿色灯桩（口门西侧）
    cyl(gx - hx - 3, top, z, 0.5, 0.4, '#8e8b80'), cyl(gx - hx - 3, top + 0.4, z, 0.16, 4.2, '#2f7d4f'), cyl(gx - hx - 3, top + 4.6, z, 0.3, 0.5, '#e9f3ea'), cyl(gx - hx - 3, top + 5.1, z, 0.34, 0.12, '#2f7d4f'),
  ]), [gx, hx, z, top])
  // 闸门：平时缩在堤头里，推出来把口门收窄
  const leafL = 8.3, gz = z + 4.5 - 0.62, gl = useRef<THREE.Group>(null), gr = useRef<THREE.Group>(null), cur = useRef(gate)
  useFrame((_, d) => {
    const k = Math.min(1, d * 1.2); cur.current += (gate - cur.current) * k
    const e = (gap - cur.current) / 2
    gl.current?.position.set(gx - hx - leafL / 2 + e - 0.05, 0, gz); gr.current?.position.set(gx + hx + leafL / 2 - e + 0.05, 0, gz)
  })
  const leaf = useMemo(() => mergeParts([
    box(0, -2.2, 0, leafL, 4.1, 0.9, '#3f5a70'),
    ...Array.from({ length: 7 }, (_, i) => box(-leafL / 2 + 0.6 + i * 1.18, -0.3, 0, 0.14, 2.2, 1.02, '#35495b')),
    box(0, 1.9, 0, leafL, 0.14, 1.1, '#c9a227'), box(0, 0.75, 0, leafL, 0.1, 1.02, '#35495b'),
  ]), [])
  return <group>
    {rocks.map((g, i) => <mesh key={i} geometry={g} castShadow receiveShadow><meshStandardMaterial map={map} bumpMap={bump} bumpScale={3} roughness={0.95} color="#9a968c" /></mesh>)}
    <mesh geometry={caps} castShadow receiveShadow><Painted rough={0.85} metal={0.05} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[gx + s * (hx + HEAD / 2), (top - 2.4) / 2, z]} castShadow receiveShadow><boxGeometry args={[HEAD, top + 2.4, 9]} /><meshStandardMaterial normalMap={cn} roughnessMap={cr} color="#a9a69b" /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[gx + s * (hx + 0.02), 0.1, z]}><boxGeometry args={[0.06, 1.0, 9.02]} /><meshStandardMaterial color="#343a2a" roughness={0.9} /></mesh>)}
    <group ref={gl}><mesh geometry={leaf} castShadow receiveShadow><Painted rough={0.5} metal={0.5} /></mesh></group>
    <group ref={gr}><mesh geometry={leaf} castShadow receiveShadow><Painted rough={0.5} metal={0.5} /></mesh></group>
    <Lighthouse x={gx + hx + 5.5} y={top} z={z} />
  </group>
}

/** 一道山脊：长 w、最高 h、厚 d，山脊线高低起伏（几组正弦叠出来），两头落到海平面 */
function ridge(w: number, h: number, d: number, seed: number) {
  const NX = 72, NZ = 10, r = rng(seed), ph = [r() * 6.28, r() * 6.28, r() * 6.28], pos: number[] = [], idx: number[] = []
  for (let i = 0; i <= NX; i++) {
    const u = i / NX, env = Math.pow(Math.sin(Math.PI * u), 0.7), top = h * env * (0.62 + 0.2 * Math.sin(u * 7 + ph[0]) + 0.12 * Math.sin(u * 17 + ph[1]) + 0.06 * Math.sin(u * 41 + ph[2]))
    for (let j = 0; j <= NZ; j++) { const v = j / NZ, s = Math.sin(Math.PI * v); pos.push((u - 0.5) * w, top * Math.pow(s, 1.4) - 1, (v - 0.5) * d * (0.5 + 0.5 * env)) }
  }
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const a = i * (NZ + 1) + j, b = a + 1, c = a + NZ + 1, e = c + 1; idx.push(a, b, c, b, e, c) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  return g
}
/** 远处的山和岬角：很淡，只为了让海平线不是一条空线 */
function Hills() {
  const list = useMemo(() => ([[-340, -440, 520, 54, 150, 1, 0.1], [140, -620, 620, 40, 140, 2, -0.05], [470, -400, 420, 66, 160, 3, -0.5], [-420, 240, 420, 70, 160, 4, 0.6], [330, 280, 460, 60, 160, 5, -0.4], [-20, 360, 520, 50, 150, 6, 0]] as const).map(([x, z, w, h, d, seed, rot]) => ({ x, z, rot, geo: ridge(w, h, d, seed) })), [])
  return <group>{list.map((h, i) => <mesh key={i} geometry={h.geo} position={[h.x, 0, h.z]} rotation-y={h.rot}><meshStandardMaterial color={i % 2 ? '#4d5d50' : '#56654f'} roughness={1} side={THREE.DoubleSide} /></mesh>)}</group>
}

export function World({ patch = null, gate = WALL.gap }: Partial<Want>) {
  return (
    <group>
      <Sea hole={patch} />
      <Quay />
      <Shed />
      <Warehouse x={-70} z={52} w={72} color="#c4c0b0" roof="#7d3b33" />
      <Warehouse x={48} z={56} w={60} color="#9fb1bb" roof="#3f5565" />
      <Containers x={66} z={18} />
      <Crane x={98} z={7} />
      <Breakwater gate={gate} />
      <Hills />
      <FishingBoat x={-104} z={-3.4} hull="#2f5d86" />
      <FishingBoat x={-88} z={-3.6} hull="#8a3328" turn />
      <FishingBoat x={104} z={-3.5} hull="#2e6b57" />
    </group>
  )
}
