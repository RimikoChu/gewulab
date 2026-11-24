// 厂区东边的玻璃温室（文洛式）：镀锌钢柱、桁架、铝合金天沟，每跨一道屋脊，玻璃屋面和玻璃墙，墙根一圈矮墙；
// 棚里铺白色地布，前面一条混凝土走道，往里是一行行吊在栽培槽上的番茄，走道之间是兼作轨道的暖气管；
// 走道一头是二氧化碳钢瓶组、汇流排和减压阀，主管沿前走道铺开，再沿每行作物分出一根打孔的补气软管；棚中间一台二氧化碳浓度计。
// 尺寸按画面单位写（1 m = 6 个单位）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, mergeParts, type Part } from '@/lab-kit'
import { clothTex, houseSign, rng } from './mats'

/** 温室：x、z 的范围，天沟高，屋脊比天沟高多少，每跨多宽 */
export const GH = { x0: 84, x1: 180, z0: -66, z1: 2, gutter: 27, rise: 4.8, bay: 24 }
const BAYS = (GH.x1 - GH.x0) / GH.bay
const COLZ = [2, -20.7, -43.3, -66]
/** 作物行：x 位置、起止 z */
export const ROWS = Array.from({ length: BAYS * 2 }, (_, i) => GH.x0 + GH.bay * (Math.floor(i / 2) + 0.5) + (i % 2 ? 6.5 : -6.5))
export const ROW_Z = [-64, -14] as const
/** 钢瓶组所在的位置；浓度计的读数屏中心（朝 +z） */
export const CYL = { x: 103, z: -7 }
export const SENSOR: [number, number, number] = [GH.x0 + GH.bay * 1.0, 10.5, -15.5]

function frameParts() {
  const P: Part[] = [], G = '#b8bfc4', H = GH
  // 立柱：每条天沟下一排
  for (let k = 0; k <= BAYS; k++) for (const z of COLZ) P.push({ p: [H.x0 + k * H.bay, H.gutter / 2, z], s: [0.6, H.gutter, 0.6], c: G })
  // 天沟：铝合金，顺着 z
  for (let k = 0; k <= BAYS; k++) P.push({ p: [H.x0 + k * H.bay, H.gutter + 0.3, (H.z0 + H.z1) / 2], s: [1.2, 0.7, H.z1 - H.z0 + 0.6], c: '#c9cdd0' })
  // 桁架：每排柱子之间一榀，上下弦加斜腹杆
  for (const z of COLZ.slice(1, -1)) for (let k = 0; k < BAYS; k++) {
    const x0 = H.x0 + k * H.bay, x1 = x0 + H.bay
    for (const y of [H.gutter - 0.2, H.gutter - 3.4]) P.push({ p: [(x0 + x1) / 2, y, z], s: [H.bay, 0.3, 0.3], c: G })
    for (let i = 0; i < 6; i++) { const xa = x0 + i * H.bay / 6, dx = H.bay / 6; P.push({ p: [xa + dx / 2, H.gutter - 1.8, z], s: [0.16, Math.hypot(dx, 3.2), 0.16], c: G, r: [0, 0, (i % 2 ? 1 : -1) * Math.atan2(dx, 3.2)], cyl: true }) }
  }
  // 屋脊和玻璃压条：从天沟斜到屋脊，每 4.5 个单位一根
  for (let k = 0; k < BAYS; k++) {
    const xc = H.x0 + (k + 0.5) * H.bay, half = H.bay / 2, len = Math.hypot(half, H.rise), a = Math.atan2(H.rise, half)
    P.push({ p: [xc, H.gutter + H.rise + 0.4, (H.z0 + H.z1) / 2], s: [0.5, 0.5, H.z1 - H.z0], c: '#d4d7d9' })
    for (let z = H.z0; z <= H.z1 + 0.01; z += 4.53) for (const s of [-1, 1]) P.push({ p: [xc + s * half / 2, H.gutter + 0.6 + H.rise / 2, z], s: [len, 0.18, 0.22], c: '#d4d7d9', r: [0, 0, -s * a] })
  }
  // 墙面的竖框、横框（四面），墙根一圈矮墙
  const wall = (x0: number, z0: number, x1: number, z1: number) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 6), alongX = Math.abs(x1 - x0) > 0.1
    for (let i = 0; i <= n; i++) { const q = i / n; P.push({ p: [x0 + (x1 - x0) * q, H.gutter / 2, z0 + (z1 - z0) * q], s: [0.3, H.gutter, 0.3], c: '#d4d7d9' }) }
    for (const y of [3.6, 12, 20]) P.push({ p: [(x0 + x1) / 2, y, (z0 + z1) / 2], s: [alongX ? L : 0.3, 0.3, alongX ? 0.3 : L], c: '#d4d7d9' })
    P.push({ p: [(x0 + x1) / 2, 1.5, (z0 + z1) / 2], s: [alongX ? L + 0.8 : 0.8, 3, alongX ? 0.8 : L + 0.8], c: '#a8a49a' })
  }
  wall(H.x0, H.z1, H.x1, H.z1); wall(H.x0, H.z0, H.x1, H.z0); wall(H.x0, H.z0, H.x0, H.z1); wall(H.x1, H.z0, H.x1, H.z1)
  // 前门：推拉门的门框
  const dx = H.x0 + H.bay * 2
  P.push({ p: [dx - 5, 9, H.z1 + 0.3], s: [0.5, 18, 0.5], c: '#9aa1a6' }, { p: [dx + 5, 9, H.z1 + 0.3], s: [0.5, 18, 0.5], c: '#9aa1a6' }, { p: [dx, 18, H.z1 + 0.3], s: [10.5, 0.5, 0.5], c: '#9aa1a6' })
  // 前走道（混凝土），走道和作物区之间的暖气管轨道
  P.push({ p: [(H.x0 + H.x1) / 2, 0.08, -6], s: [H.x1 - H.x0 - 1, 0.16, 12], c: '#bdbab2' })
  for (let k = 0; k < BAYS; k++) { const xc = H.x0 + (k + 0.5) * H.bay; for (const o of [-1.4, 1.4]) P.push({ p: [xc + o, 0.9, (ROW_Z[0] + ROW_Z[1]) / 2], s: [0.31, ROW_Z[1] - ROW_Z[0], 0.31], c: '#eef0ee', r: [Math.PI / 2, 0, 0], cyl: true }) }
  // 栽培槽：吊在离地 0.6 m 的地方，上面一条条白色的椰糠条
  for (const x of ROWS) {
    P.push({ p: [x, 3.4, (ROW_Z[0] + ROW_Z[1]) / 2], s: [1.8, 0.3, ROW_Z[1] - ROW_Z[0]], c: '#4a4f52' })
    for (let z = ROW_Z[0] + 1; z < ROW_Z[1] - 1; z += 6) P.push({ p: [x, 3.9, z + 2.8], s: [1.2, 0.6, 5.6], c: '#f1f0ea' })
    for (let z = ROW_Z[0]; z <= ROW_Z[1]; z += 9) P.push({ p: [x, 1.7, z], s: [0.12, 3.4, 0.12], c: '#9aa1a6' })
    // 顶上的吊蔓钢丝
    P.push({ p: [x, 21.6, (ROW_Z[0] + ROW_Z[1]) / 2], s: [0.05, ROW_Z[1] - ROW_Z[0], 0.05], c: '#cfd3d6', r: [Math.PI / 2, 0, 0], cyl: true })
  }
  // 二氧化碳的主管（白色 PE 管）沿前走道，补气软管沿每行作物铺在栽培槽下面
  P.push({ p: [(CYL.x + ROWS[ROWS.length - 1]) / 2, 0.6, -12.6], s: [0.32, ROWS[ROWS.length - 1] - CYL.x, 0.32], c: '#f3f3ef', r: [0, 0, Math.PI / 2], cyl: true })
  for (const x of ROWS) P.push({ p: [x, 0.35, (ROW_Z[0] + ROW_Z[1]) / 2 - 0.5], s: [0.16, ROW_Z[1] - ROW_Z[0] + 1.4, 0.16], c: '#e9ece6', r: [Math.PI / 2, 0, 0], cyl: true })
  // 浓度计的立杆
  P.push({ p: [SENSOR[0], 5, SENSOR[2] - 0.4], s: [0.14, 10, 0.14], c: '#9aa1a6', cyl: true })
  return P
}
/** 所有的玻璃：两坡屋面每跨两块、四面墙。合成一个模型 */
function glassGeo() {
  const H = GH, gs: THREE.BufferGeometry[] = []
  for (let k = 0; k < BAYS; k++) {
    const xc = H.x0 + (k + 0.5) * H.bay, half = H.bay / 2, len = Math.hypot(half, H.rise), a = Math.atan2(H.rise, half)
    for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(len, H.z1 - H.z0); g.rotateX(-Math.PI / 2); g.rotateZ(-s * a); g.translate(xc + s * half / 2, H.gutter + 0.6 + H.rise / 2, (H.z0 + H.z1) / 2); gs.push(g) }
    // 山墙顶上的三角
    for (const z of [H.z0, H.z1]) { const sh = new THREE.Shape([new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0), new THREE.Vector2(0, H.rise)]); const g = new THREE.ShapeGeometry(sh); g.translate(xc, H.gutter + 0.6, z); gs.push(g) }
  }
  for (const z of [H.z0, H.z1]) gs.push(new THREE.PlaneGeometry(H.x1 - H.x0, H.gutter - 3).translate((H.x0 + H.x1) / 2, 3 + (H.gutter - 3) / 2, z))
  for (const x of [H.x0, H.x1]) gs.push(new THREE.PlaneGeometry(H.z1 - H.z0, H.gutter - 3).rotateY(Math.PI / 2).translate(x, 3 + (H.gutter - 3) / 2, (H.z0 + H.z1) / 2))
  return mergeGeometries(gs.map(g => g.index ? g.toNonIndexed() : g))
}

/** 一片番茄的复叶：中间一根叶轴，两边几对小叶，末端一片。平放在 x–z 平面里，叶柄在原点，叶尖朝 +x，往下垂一点 */
function leafGeo() {
  const gs: THREE.BufferGeometry[] = []
  const blade = (len: number, w: number) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(len * 0.25, w, len * 0.7, w * 0.9, len, 0); s.bezierCurveTo(len * 0.7, -w * 0.9, len * 0.25, -w, 0, 0); return new THREE.ShapeGeometry(s, 6) }
  const rib = new THREE.PlaneGeometry(2.4, 0.06); rib.translate(1.2, 0, 0); gs.push(rib)
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const g = blade(0.75 - i * 0.08, 0.28); g.rotateZ(s * (1.0 - i * 0.12)); g.translate(0.5 + i * 0.62, s * 0.03, 0); gs.push(g) }
  const tip = blade(0.8, 0.3); tip.translate(2.3, 0, 0); gs.push(tip)
  const g = mergeGeometries(gs.map(q => q.toNonIndexed()))
  g.rotateX(-Math.PI / 2)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, -0.12 * x * x - 0.35 * z * z) }
  g.computeVertexNormals()
  return g
}

/** 一行行的番茄：茎、复叶、一串串果（下面红、上面绿），用实例化的模型一次画完 */
function Crops() {
  const data = useMemo(() => {
    const r = rng(29), stems: THREE.Matrix4[] = [], leaves: { m: THREE.Matrix4; c: THREE.Color }[] = [], fruits: { m: THREE.Matrix4; c: THREE.Color }[] = []
    const o = new THREE.Object3D()
    for (const x of ROWS) for (let z = ROW_Z[0] + 1.5; z < ROW_Z[1]; z += 2.6) for (const side of [-0.5, 0.5]) {
      const px = x + side + (r() - 0.5) * 0.3, pz = z + (r() - 0.5) * 0.6, h = 15 + r() * 3, lean = (r() - 0.5) * 0.06
      o.position.set(px, 4.2 + h / 2, pz); o.rotation.set(lean, 0, (r() - 0.5) * 0.05); o.scale.set(1, h, 1); o.updateMatrix(); stems.push(o.matrix.clone())
      for (let y = 6; y < 4 + h; y += 1.5 + r() * 0.6) {
        o.position.set(px, y, pz); o.rotation.set(0, r() * Math.PI * 2, -0.35 - r() * 0.3); o.scale.setScalar(1 + (1 - (y - 6) / h) * 0.35)
        o.updateMatrix(); leaves.push({ m: o.matrix.clone(), c: new THREE.Color().setHSL(0.27 + r() * 0.04, 0.42 + r() * 0.15, 0.24 + r() * 0.08) })
      }
      for (let t = 0; t < 3; t++) {
        const y = 6.2 + t * 2.6 + r() * 0.6, a = r() * 6.28, ripe = t === 0 ? 0.9 : t === 1 ? 0.45 : 0
        for (let f = 0; f < 4; f++) {
          o.position.set(px + Math.cos(a) * 0.55 + (f - 1.5) * 0.18, y - f * 0.32, pz + Math.sin(a) * 0.55 + (r() - 0.5) * 0.2); o.rotation.set(0, 0, 0); o.scale.setScalar(0.2 + r() * 0.05); o.updateMatrix()
          const k = Math.max(0, Math.min(1, ripe + (r() - 0.5) * 0.4))
          fruits.push({ m: o.matrix.clone(), c: new THREE.Color('#5f8f2e').lerp(new THREE.Color('#d8361d'), k) })
        }
      }
    }
    return { stems, leaves, fruits }
  }, [])
  const geo = useMemo(() => ({ stem: new THREE.CylinderGeometry(0.11, 0.13, 1, 6), leaf: leafGeo(), fruit: new THREE.SphereGeometry(1, 12, 10) }), [])
  const mk = (ref: THREE.InstancedMesh | null, list: { m: THREE.Matrix4; c?: THREE.Color }[] | THREE.Matrix4[]) => {
    if (!ref) return
    list.forEach((it, i) => { if (it instanceof THREE.Matrix4) ref.setMatrixAt(i, it); else { ref.setMatrixAt(i, it.m); if (it.c) ref.setColorAt(i, it.c) } })
    ref.instanceMatrix.needsUpdate = true; if (ref.instanceColor) ref.instanceColor.needsUpdate = true
  }
  return <group>
    <instancedMesh ref={r => mk(r, data.stems)} args={[geo.stem, undefined, data.stems.length]} castShadow frustumCulled={false}><meshStandardMaterial color="#5c7a34" roughness={0.8} /></instancedMesh>
    <instancedMesh ref={r => mk(r, data.leaves)} args={[geo.leaf, undefined, data.leaves.length]} castShadow receiveShadow frustumCulled={false}><meshStandardMaterial roughness={0.7} side={THREE.DoubleSide} /></instancedMesh>
    <instancedMesh ref={r => mk(r, data.fruits)} args={[geo.fruit, undefined, data.fruits.length]} castShadow frustumCulled={false}><meshPhysicalMaterial roughness={0.28} clearcoat={0.6} /></instancedMesh>
  </group>
}

/** 二氧化碳钢瓶组：六只铝白色的钢瓶立在架子上，瓶顶的阀门接到黄铜汇流排，汇流排出来经减压阀（带加热器）接到主管 */
export const CYL_N = 6
export function cylAt(i: number): [number, number, number] { return [CYL.x + (i % 3) * 1.7, 0, CYL.z - 1.2 + Math.floor(i / 3) * 1.8] }
function Cylinders() {
  const label = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512
    const g = c.getContext('2d')!; g.fillStyle = '#d7d9d6'; g.fillRect(0, 0, 256, 512)
    g.fillStyle = '#1a1a1a'; g.font = '700 54px "PingFang SC", "Microsoft YaHei", sans-serif'; g.textAlign = 'center'
    '液化二氧化碳'.split('').forEach((ch, i) => g.fillText(ch, 128, 80 + i * 70))
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const body = useMemo(() => { const g = new THREE.CylinderGeometry(0.66, 0.66, 7.6, 32, 1, true); g.translate(0, 4.2, 0); return g }, [])
  return <group>
    {Array.from({ length: CYL_N }, (_, i) => { const [x, , z] = cylAt(i); return <group key={i} position={[x, 0, z]}>
      <mesh geometry={body} castShadow><meshPhysicalMaterial map={label} roughness={0.4} clearcoat={0.5} /></mesh>
      <mesh position-y={8} castShadow><sphereGeometry args={[0.66, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#d7d9d6" roughness={0.4} clearcoat={0.5} /></mesh>
      <mesh position-y={0.4} castShadow><cylinderGeometry args={[0.66, 0.6, 0.8, 32]} /><meshPhysicalMaterial color="#d7d9d6" roughness={0.4} clearcoat={0.5} /></mesh>
      <mesh position-y={8.9}><cylinderGeometry args={[0.18, 0.22, 0.8, 12]} /><Metal kind="brass" grain="turned" /></mesh>
      <mesh position={[0, 9.4, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.32, 0.06, 8, 20]} /><meshStandardMaterial color="#2c2f33" roughness={0.5} /></mesh>
      <mesh position={[0, 9.0, 0.5]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 1, 8]} /><Metal kind="copper" /></mesh>
    </group> })}
    {/* 架子：两道箍、两根立柱 */}
    {[-1, 1].map(s => <mesh key={s} position={[CYL.x + 1.7 + s * 2.8, 5, CYL.z - 2.4]} castShadow><boxGeometry args={[0.25, 10, 0.25]} /><meshStandardMaterial color="#2f6aa3" roughness={0.5} metalness={0.4} /></mesh>)}
    {[3, 6.5].map(y => <mesh key={y} position={[CYL.x + 1.7, y, CYL.z - 2.4]}><boxGeometry args={[5.8, 0.25, 0.25]} /><meshStandardMaterial color="#2f6aa3" roughness={0.5} metalness={0.4} /></mesh>)}
    {/* 汇流排和减压阀 */}
    <mesh position={[CYL.x + 1.7, 9.6, CYL.z + 1.4]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.14, 0.14, 5.4, 12]} /><Metal kind="brass" grain="turned" /></mesh>
    <group position={[CYL.x + 5.2, 8.6, CYL.z + 1.4]}>
      <mesh castShadow><cylinderGeometry args={[0.5, 0.5, 0.9, 24]} /><Metal kind="brass" grain="turned" /></mesh>
      <mesh position={[0, 0, 0.55]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.42, 0.42, 0.2, 28]} /><Metal kind="chrome" /></mesh>
      <mesh position={[0, 0, 0.66]}><circleGeometry args={[0.36, 28]} /><meshStandardMaterial color="#f4f3ee" roughness={0.5} /></mesh>
      <mesh position={[0, -1.1, 0]}><boxGeometry args={[0.9, 1.2, 0.7]} /><meshStandardMaterial color="#26292c" roughness={0.6} /></mesh>
      <mesh position={[0, -4.8, 0]}><cylinderGeometry args={[0.16, 0.16, 6.4, 10]} /><meshStandardMaterial color="#f3f3ef" roughness={0.6} /></mesh>
    </group>
  </group>
}
/** 浓度计：一只白色的机盒，正面一块读数屏（读数由第 7 课画） */
function Sensor() {
  return <group position={SENSOR}>
    <mesh position-z={-0.2} castShadow><boxGeometry args={[2.4, 1.8, 0.6]} /><meshPhysicalMaterial color="#eceeea" roughness={0.4} clearcoat={0.4} /></mesh>
    <mesh position={[0, -1.15, -0.2]}><cylinderGeometry args={[0.35, 0.35, 0.5, 16]} /><meshStandardMaterial color="#cfd3d0" roughness={0.6} /></mesh>
  </group>
}

export function Greenhouse({ night = false }: { night?: boolean }) {
  const geo = useMemo(() => ({ frame: mergeParts(frameParts()), glass: glassGeo() }), [])
  const cloth = useMemo(() => { const t = clothTex().clone(); t.repeat.set(20, 14); t.needsUpdate = true; return t }, [])
  const sign = useMemo(() => houseSign(), [])
  return <group>
    <mesh rotation-x={-Math.PI / 2} position={[(GH.x0 + GH.x1) / 2, 0.06, (GH.z0 + GH.z1) / 2]} receiveShadow><planeGeometry args={[GH.x1 - GH.x0, GH.z1 - GH.z0]} /><meshStandardMaterial map={cloth} roughness={0.95} /></mesh>
    <mesh geometry={geo.frame} castShadow receiveShadow><Painted rough={0.42} metal={0.55} /></mesh>
    <mesh geometry={geo.glass} renderOrder={2}><meshPhysicalMaterial color={night ? '#1a2530' : '#e8f2f2'} transparent opacity={night ? 0.14 : 0.05} roughness={0.04} clearcoat={0.4} envMapIntensity={0.5} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <Crops />
    <Cylinders />
    <Sensor />
    <mesh position={[GH.x0 + GH.bay * 0.9, 22, GH.z1 + 0.4]}><planeGeometry args={[9, 2.8]} /><meshStandardMaterial map={sign} roughness={0.6} /></mesh>
  </group>
}
