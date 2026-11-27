// 勾股定理实验室的大场景：一座铺着青灰方砖的园林广场。北面一道粉墙黛瓦的院墙，墙外是城里的高楼；
// 西边木工棚、中间偏北四角亭、北边两层的木工坊、东边一段单独的粉墙、东南角竹林和池塘、广场中央一根旗杆。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。1 个单位 = 1 m。
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, useRipple } from '@/lab-kit'
import { flag } from './physics'
import { Barrow, Bench, BrickStack, Bucket, Carving, FlowerBed, InkReel, Lantern, RopeCoil, StakeBundle } from './props'
import { Tree } from './trees'
import { AXIS_V, granite, makeAxis, makeGrime, makeLattice, makeLeak, makeRoof, makeSign, makeSoil, makeTiles, makeTower, makeWhitewash, rng, stoneDark, woodDark, woodLight } from './mats'

export type V3 = [number, number, number]
/** 各课的位置 */
export const ST = {
  l1: { x: -17, z: 3 },          // 地砖上的三角形：直角顶点在这里
  l2: { x: -27, z: -9 },         // 木工棚的木工台
  l3: { x: -7, z: -12.5 },       // 四角亭的石桌
  l4: { x: 9, z: -16 },          // 木工坊的门洞（门脸在 z = -16）
  l5: { x: 24, z: -2.4 },          // 东边那段粉墙（东面在 x = 24.18）
  l6: { x: -2, z: 6.5 },         // 数轴的原点
  l7: { x: 10.5, z: 4.5 },       // 结绳的木桩
  bamboo: { x: 31, z: -2 },      // 折断的竹子
  pond: { x: 25, z: 12 },        // 池塘中心
  flag: { x: 3, z: -5 },         // 旗杆
}
export const BENCH_H = 0.86, TABLE_H = 0.78
export const WALL5 = { x: 24, t: 0.36, h: 3.4, z0: -11, z1: -1 }
/** 池塘：1 丈（10 尺）见方，水面比地面低 0.3 m，水深 12 尺；1 尺 = 1/3 m */
export const CHI = 1 / 3
export const POND = { half: 5 * CHI, water: -0.3, depth: 12 * CHI }

/** 每一课交给世界的要求：池塘要不要朝镜头剖开；旗杆上的绳子是不是由这一课自己画 */
export interface Want { cut?: boolean; ownRope?: boolean }

// ---------- 小工具 ----------
/** 一块按世界坐标铺贴图的板：贴图一格 k 米 */
function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? -p.getZ(i) / k : p.getY(i) / k)
  return g
}
function merge(gs: THREE.BufferGeometry[]) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = []
  for (const g0 of gs) { const g = g0.index ? g0.toNonIndexed() : g0; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return g
}

// ---------- 地面 ----------
const PLAZA = { x0: -36, x1: 36, z0: -22, z1: 50 }
/** 池塘周围挖开的范围：地面在这里留一个洞，由池塘自己的土块补上 */
const HOLE = { x0: ST.pond.x - 4, x1: ST.pond.x + 4, z0: ST.pond.z - 3.5, z1: ST.pond.z + 9 }
function Ground() {
  const { map, bump } = makeTiles()
  const geo = useMemo(() => {
    const s = new THREE.Shape([new THREE.Vector2(PLAZA.x0, -PLAZA.z1), new THREE.Vector2(PLAZA.x1, -PLAZA.z1), new THREE.Vector2(PLAZA.x1, -PLAZA.z0), new THREE.Vector2(PLAZA.x0, -PLAZA.z0)])
    s.holes.push(new THREE.Path([new THREE.Vector2(HOLE.x0, -HOLE.z1), new THREE.Vector2(HOLE.x0, -HOLE.z0), new THREE.Vector2(HOLE.x1, -HOLE.z0), new THREE.Vector2(HOLE.x1, -HOLE.z1)]))
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2)
    const p = g.attributes.position, uv = g.attributes.uv
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 4, -p.getZ(i) / 4)   // 一张贴图 4 m：0.5 m 一块砖，砖缝对齐整数米
    return g
  }, [])
  const soil = useMemo(() => { const t = makeSoil().clone(); t.needsUpdate = true; t.repeat.set(1 / 6, 1 / 6); return t }, [])
  const grimeGeo = useMemo(() => { const g = geo.clone(), p = g.attributes.position, uv = g.attributes.uv.clone(); for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 23 + 0.31, -p.getZ(i) / 19); g.setAttribute('uv', uv); return g }, [geo])
  return <group>
    <mesh geometry={geo} receiveShadow><meshStandardMaterial map={map} bumpMap={bump} bumpScale={1.4} roughness={0.86} color="#e4e6e2" /></mesh>
    {/* 大片的旧化：比方砖大得多的深浅斑，盖在地面上，方砖贴图就看不出重复 */}
    <mesh geometry={grimeGeo} position={[0, 0.0015, 0]} receiveShadow renderOrder={1}><meshStandardMaterial map={makeGrime()} transparent depthWrite={false} roughness={0.9} polygonOffset polygonOffsetFactor={-1} /></mesh>
    {/* 广场外：院墙外是土地和草 */}
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0]} receiveShadow><planeGeometry args={[900, 900]} /><meshStandardMaterial map={soil} color="#6f7a55" roughness={1} /></mesh>
    {/* 广场南沿一道花岗石路牙 */}
    <mesh position={[0, 0.04, PLAZA.z1 + 0.15]} receiveShadow castShadow><boxGeometry args={[PLAZA.x1 - PLAZA.x0, 0.12, 0.3]} /><meshStandardMaterial map={granite()} color="#c8c5bc" roughness={0.8} /></mesh>
  </group>
}

// ---------- 粉墙黛瓦 ----------
/** 一段院墙：沿 x 方向（rot = 0）或沿 z 方向（rot = π/2）；顶上一道两坡的瓦檐，墙脚一道深色的勒脚 */
export function GardenWall({ x, z, len, h = 3.2, t = 0.36, rot = 0, windows = [] }: { x: number; z: number; len: number; h?: number; t?: number; rot?: number; windows?: number[] }) {
  const wash = useMemo(() => { const tx = makeWhitewash().clone(); tx.needsUpdate = true; tx.repeat.set(len / 4, h / 4); return tx }, [len, h])
  const roof = useMemo(() => { const tx = makeRoof().clone(); tx.needsUpdate = true; tx.repeat.set(len / 1.6, 1); return tx }, [len])
  const leak = makeLeak()
  return <group position={[x, 0, z]} rotation-y={rot}>
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[len, h, t]} /><meshStandardMaterial map={wash} roughness={0.95} /></mesh>
    {/* 勒脚 */}
    <mesh position={[0, 0.25, 0]} castShadow receiveShadow><boxGeometry args={[len + 0.04, 0.5, t + 0.06]} /><meshStandardMaterial map={stoneDark()} color="#8c8a84" roughness={0.9} /></mesh>
    {/* 瓦檐：两坡，伸出墙面 0.3 m，屋脊一条 */}
    {[-1, 1].map(s => <mesh key={s} position={[0, h + 0.14, s * (t / 2 + 0.06)]} rotation-x={s * 0.5} castShadow><boxGeometry args={[len + 0.3, 0.06, 0.62]} /><meshStandardMaterial map={roof} roughness={0.8} /></mesh>)}
    <mesh position={[0, h + 0.3, 0]} castShadow><boxGeometry args={[len + 0.34, 0.16, 0.2]} /><meshStandardMaterial color="#2f3234" roughness={0.8} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * (len / 2 + 0.17), h + 0.36, 0]} rotation-z={s * -0.5}><boxGeometry args={[0.36, 0.12, 0.2]} /><meshStandardMaterial color="#2f3234" roughness={0.8} /></mesh>)}
    {/* 漏窗 */}
    {windows.map(wx => <group key={wx} position={[wx, 1.75, 0]}>
      {[-1, 1].map(s => <mesh key={s} position={[0, 0, s * (t / 2 + 0.003)]} rotation-y={s < 0 ? Math.PI : 0}><planeGeometry args={[1.1, 1.1]} /><meshStandardMaterial map={leak} transparent alphaTest={0.5} roughness={0.9} side={THREE.DoubleSide} /></mesh>)}
    </group>)}
  </group>
}

// ---------- 木工坊（第 4 课的门） ----------
/** 两层的木工坊：一层门脸正中一个 1 m × 2 m 的门洞，门框是深色的硬木；二楼一排木格窗，顶上小青瓦的两坡屋顶。门洞后面是屋里 */
function Workshop() {
  const X = ST.l4.x, Z = ST.l4.z, W = 10, D = 5.6, H1 = 3.4, H2 = 3.0
  const wash = useMemo(() => { const t = makeWhitewash().clone(); t.needsUpdate = true; t.repeat.set(2.5, 1.6); return t }, [])
  const roof = useMemo(() => { const t = makeRoof().clone(); t.needsUpdate = true; t.repeat.set(7, 2); return t }, [])
  const sign = useMemo(() => makeSign('木工坊'), [])
  const wood = woodDark(), lat = makeLattice()
  // 门脸：门洞两边、门洞上方三块墙
  const dw = 1, dh = 2, jamb = 0.09
  const front = useMemo(() => merge([
    slab(X - W / 2, X - dw / 2 - jamb, 0, H1 + H2, Z - 0.3, Z, 4), slab(X + dw / 2 + jamb, X + W / 2, 0, H1 + H2, Z - 0.3, Z, 4),
    slab(X - dw / 2 - jamb, X + dw / 2 + jamb, dh + jamb, H1 + H2, Z - 0.3, Z, 4),
  ]), [X, Z])
  return <group>
    <mesh geometry={front} castShadow receiveShadow><meshStandardMaterial map={wash} roughness={0.95} /></mesh>
    {/* 两侧墙和后墙，屋里是暗的 */}
    <mesh position={[X - W / 2 + 0.15, (H1 + H2) / 2, Z - D / 2]} castShadow receiveShadow><boxGeometry args={[0.3, H1 + H2, D]} /><meshStandardMaterial map={wash} roughness={0.95} /></mesh>
    <mesh position={[X + W / 2 - 0.15, (H1 + H2) / 2, Z - D / 2]} castShadow receiveShadow><boxGeometry args={[0.3, H1 + H2, D]} /><meshStandardMaterial map={wash} roughness={0.95} /></mesh>
    <mesh position={[X, (H1 + H2) / 2, Z - D + 0.15]} castShadow receiveShadow><boxGeometry args={[W, H1 + H2, 0.3]} /><meshStandardMaterial map={wash} roughness={0.95} /></mesh>
    <mesh position={[X, H1, Z - D / 2]} receiveShadow><boxGeometry args={[W - 0.4, 0.2, D - 0.4]} /><meshStandardMaterial color="#5b4634" roughness={0.9} /></mesh>
    <mesh position={[X, 0.01, Z - D / 2]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[W - 0.6, D - 0.6]} /><meshStandardMaterial color="#5e5850" roughness={1} /></mesh>
    {/* 屋里靠后墙的木料架和刨花：从门洞里看得见一点 */}
    <mesh position={[X - 1.2, 1.1, Z - D + 0.6]} castShadow><boxGeometry args={[2.4, 2.2, 0.5]} /><meshStandardMaterial map={wood} roughness={0.8} color="#a08060" /></mesh>
    {/* 门框：两根门柱、门楣、门槛，外沿一道线脚 */}
    <mesh position={[X - dw / 2 - jamb / 2, dh / 2, Z + 0.02]} castShadow><boxGeometry args={[jamb, dh + jamb, 0.36]} /><meshStandardMaterial map={wood} roughness={0.7} /></mesh>
    <mesh position={[X + dw / 2 + jamb / 2, dh / 2, Z + 0.02]} castShadow><boxGeometry args={[jamb, dh + jamb, 0.36]} /><meshStandardMaterial map={wood} roughness={0.7} /></mesh>
    <mesh position={[X, dh + jamb / 2, Z + 0.02]} castShadow><boxGeometry args={[dw + jamb * 2, jamb, 0.36]} /><meshStandardMaterial map={wood} roughness={0.7} /></mesh>
    <mesh position={[X, 0.03, Z - 0.1]} castShadow receiveShadow><boxGeometry args={[dw + jamb * 2 + 0.2, 0.06, 0.5]} /><meshStandardMaterial map={granite()} roughness={0.8} /></mesh>
    {/* 门头的木匾 */}
    <mesh position={[X, dh + 0.62, Z + 0.04]}><planeGeometry args={[1.5, 0.47]} /><meshStandardMaterial map={sign} roughness={0.6} /></mesh>
    {/* 一层两边的窗、二楼一排木格窗 */}
    {[-3.2, 3.2].map(dx => <group key={dx} position={[X + dx, 1.7, Z + 0.01]}>
      <mesh><planeGeometry args={[1.6, 1.3]} /><meshStandardMaterial map={lat} roughness={0.7} /></mesh>
      <mesh position={[0, -0.7, 0.04]} castShadow><boxGeometry args={[1.8, 0.1, 0.12]} /><meshStandardMaterial map={granite()} roughness={0.8} /></mesh>
    </group>)}
    {[-3.4, -1.15, 1.15, 3.4].map(dx => <mesh key={dx} position={[X + dx, H1 + 1.4, Z + 0.01]}><planeGeometry args={[1.5, 1.4]} /><meshStandardMaterial map={lat} roughness={0.7} /></mesh>)}
    {/* 一二层之间一道披檐 */}
    <mesh position={[X, H1 + 0.1, Z + 0.35]} rotation-x={0.42} castShadow><boxGeometry args={[W + 0.4, 0.06, 0.9]} /><meshStandardMaterial map={roof} roughness={0.8} /></mesh>
    {/* 两坡屋顶 */}
    {[-1, 1].map(s => <mesh key={s} position={[X, H1 + H2 + 0.85, Z - D / 2 + s * 1.55]} rotation-x={s * 0.56} castShadow receiveShadow><boxGeometry args={[W + 0.8, 0.1, 3.7]} /><meshStandardMaterial map={roof} roughness={0.8} /></mesh>)}
    <mesh position={[X, H1 + H2 + 1.85, Z - D / 2]} castShadow><boxGeometry args={[W + 1, 0.24, 0.3]} /><meshStandardMaterial color="#2c2f31" roughness={0.8} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[X + s * (W / 2 + 0.45), H1 + H2 + 2.0, Z - D / 2]} rotation-z={s * -0.6}><boxGeometry args={[0.6, 0.18, 0.3]} /><meshStandardMaterial color="#2c2f31" roughness={0.8} /></mesh>)}
    {/* 山墙：两头三角形的墙 */}
    {[-1, 1].map(s => <mesh key={s} position={[X + s * (W / 2 - 0.15), H1 + H2, Z - D / 2]} rotation-y={Math.PI / 2}>
      <shapeGeometry args={[new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, 1.75)])]} /><meshStandardMaterial map={wash} side={THREE.DoubleSide} roughness={0.95} />
    </mesh>)}
  </group>
}

// ---------- 木工棚（第 2 课） ----------
function Shed() {
  const { x: X, z: Z } = ST.l2, wood = woodDark(), light = woodLight()
  const roof = useMemo(() => { const t = makeRoof().clone(); t.needsUpdate = true; t.repeat.set(4, 2); return t }, [])
  const posts: [number, number][] = [[-3, -2.2], [3, -2.2], [-3, 2.2], [3, 2.2]]
  return <group position={[X, 0, Z]}>
    {posts.map(([px, pz]) => <group key={`${px}${pz}`}>
      <mesh position={[px, 1.6, pz]} castShadow><boxGeometry args={[0.18, 3.2, 0.18]} /><meshStandardMaterial map={wood} roughness={0.75} /></mesh>
      <mesh position={[px, 0.08, pz]} castShadow receiveShadow><cylinderGeometry args={[0.18, 0.22, 0.16, 16]} /><meshStandardMaterial map={granite()} roughness={0.8} /></mesh>
    </group>)}
    {[-2.2, 2.2].map(pz => <mesh key={pz} position={[0, 3.2, pz]} castShadow><boxGeometry args={[6.4, 0.2, 0.2]} /><meshStandardMaterial map={wood} roughness={0.75} /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[0, 3.75, s * 1.35]} rotation-x={s * 0.42} castShadow receiveShadow><boxGeometry args={[7.2, 0.08, 3.2]} /><meshStandardMaterial map={roof} roughness={0.8} /></mesh>)}
    <mesh position={[0, 4.36, 0]} castShadow><boxGeometry args={[7.4, 0.18, 0.24]} /><meshStandardMaterial color="#2c2f31" roughness={0.8} /></mesh>
    {/* 木工台：厚台面、四条腿、两道横撑，前沿一只木台钳；台面上一道刨痕 */}
    <mesh position={[0, BENCH_H - 0.045, 0]} castShadow receiveShadow><boxGeometry args={[2.4, 0.09, 1.0]} /><meshStandardMaterial map={light} roughness={0.7} /></mesh>
    {[[-1.05, -0.4], [1.05, -0.4], [-1.05, 0.4], [1.05, 0.4]].map(([lx, lz]) => <mesh key={`${lx}${lz}`} position={[lx, (BENCH_H - 0.09) / 2, lz]} castShadow><boxGeometry args={[0.1, BENCH_H - 0.09, 0.1]} /><meshStandardMaterial map={light} roughness={0.75} color="#b8946a" /></mesh>)}
    {[-0.4, 0.4].map(lz => <mesh key={lz} position={[0, 0.22, lz]} castShadow><boxGeometry args={[2.1, 0.08, 0.06]} /><meshStandardMaterial map={light} roughness={0.75} color="#b8946a" /></mesh>)}
    <mesh position={[0, 0.25, 0]} castShadow receiveShadow><boxGeometry args={[2.1, 0.03, 0.8]} /><meshStandardMaterial map={light} roughness={0.8} color="#a88660" /></mesh>
    <mesh position={[-0.95, BENCH_H - 0.1, 0.53]} castShadow><boxGeometry args={[0.36, 0.2, 0.06]} /><meshStandardMaterial map={light} roughness={0.7} color="#9c7650" /></mesh>
    <mesh position={[-0.95, BENCH_H - 0.1, 0.6]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.015, 0.015, 0.16, 10]} /><Metal kind="steel" grain="turned" /></mesh>
    {/* 后墙一排挂着的工具板、一摞木料 */}
    <mesh position={[0, 1.7, -2.1]} receiveShadow><boxGeometry args={[4.2, 1.6, 0.04]} /><meshStandardMaterial map={wood} roughness={0.85} color="#8a6a4a" /></mesh>
    {[-1.6, -0.9, 0.2, 1.0].map((tx, i) => <mesh key={tx} position={[tx, 1.7, -2.06]} rotation-z={i * 0.4 - 0.6} castShadow><boxGeometry args={[0.05, 0.6 - i * 0.06, 0.03]} /><meshStandardMaterial color="#5a3e28" roughness={0.6} /></mesh>)}
    {[0, 1, 2, 3].map(k => <mesh key={k} position={[2.3, 0.1 + k * 0.08, 1.3 - k * 0.02]} rotation-y={0.04 * k} castShadow receiveShadow><boxGeometry args={[0.24, 0.07, 2.4]} /><meshStandardMaterial map={light} roughness={0.8} color="#d0b088" /></mesh>)}
  </group>
}

// ---------- 四角亭（第 3 课） ----------
const FLOOR3 = 0.42
export const TABLE_TOP = FLOOR3 + TABLE_H
function Pavilion() {
  const { x: X, z: Z } = ST.l3, R = 2.3
  const roof = useMemo(() => { const t = makeRoof().clone(); t.needsUpdate = true; t.repeat.set(4, 4); return t }, [])
  const col = useMemo(() => lathe([[0, 0], [0.13, 0], [0.13, 0.04], [0.11, 0.06], [0.11, 3.0], [0.13, 3.04], [0.13, 3.1], [0, 3.1]], { segs: 24 }), [])
  const drum = useMemo(() => lathe([[0, 0], [0.16, 0], [0.2, 0.08], [0.22, 0.22], [0.2, 0.36], [0.16, 0.44], [0, 0.44]], { segs: 32 }), [])
  const base = useMemo(() => disc(0.24, 0.06), [])
  const stem = useMemo(() => lathe([[0, 0], [0.32, 0], [0.32, 0.06], [0.2, 0.12], [0.16, 0.4], [0.2, 0.62], [0.3, 0.7], [0, 0.7]], { segs: 4, crease: 20 }), [])
  // 屋面：四坡攒尖，四角起翘
  const top = useMemo(() => {
    const g = new THREE.ConeGeometry(R * 1.62, 1.7, 4, 6, true); g.rotateY(Math.PI / 4)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = (0.85 - y) / 1.7       // 0 顶，1 檐口
      const ang = Math.atan2(z, x), corner = Math.abs(Math.cos(2 * ang))           // 越靠近四个角越翘
      p.setY(i, y - 0.35 * Math.sin(k * Math.PI) * 0.9 + corner * k ** 4 * 0.55)
    }
    g.computeVertexNormals(); return g
  }, [])
  return <group position={[X, 0, Z]}>
    {/* 台基：花岗石，四面各一级台阶 */}
    <mesh position={[0, FLOOR3 / 2, 0]} castShadow receiveShadow><boxGeometry args={[R * 2 + 0.6, FLOOR3, R * 2 + 0.6]} /><meshStandardMaterial map={granite()} roughness={0.8} /></mesh>
    <mesh position={[0, FLOOR3 / 4, R + 0.55]} castShadow receiveShadow><boxGeometry args={[1.6, FLOOR3 / 2, 0.5]} /><meshStandardMaterial map={granite()} roughness={0.8} /></mesh>
    {/* 四根红柱子、柱础 */}
    {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => <group key={`${sx}${sz}`} position={[sx * R, FLOOR3, sz * R]}>
      <mesh geometry={base} castShadow><meshStandardMaterial map={granite()} roughness={0.8} /></mesh>
      <mesh geometry={col} position={[0, 0.06, 0]} castShadow><meshStandardMaterial color="#8e2a1f" roughness={0.45} /></mesh>
    </group>)}
    {/* 檐下的额枋，四面一圈；柱间的美人靠 */}
    {[0, 1, 2, 3].map(i => <group key={i} rotation-y={i * Math.PI / 2}>
      <mesh position={[0, FLOOR3 + 3.0, R]} castShadow><boxGeometry args={[R * 2 + 0.3, 0.26, 0.2]} /><meshStandardMaterial color="#6f241a" roughness={0.5} /></mesh>
      <mesh position={[0, FLOOR3 + 2.72, R]} castShadow><boxGeometry args={[R * 2, 0.1, 0.12]} /><meshStandardMaterial color="#2f5d55" roughness={0.6} /></mesh>
      {i !== 0 && <mesh position={[0, FLOOR3 + 0.46, R]} castShadow><boxGeometry args={[R * 2 - 0.3, 0.08, 0.34]} /><meshStandardMaterial color="#7a2a1e" roughness={0.5} /></mesh>}
    </group>)}
    <mesh geometry={top} position={[0, FLOOR3 + 3.13 + 0.85, 0]} castShadow receiveShadow><meshStandardMaterial map={roof} roughness={0.8} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, FLOOR3 + 3.0, 0]} receiveShadow><boxGeometry args={[R * 2 + 0.2, 0.06, R * 2 + 0.2]} /><meshStandardMaterial color="#4a2a1c" roughness={0.8} /></mesh>
    <mesh position={[0, FLOOR3 + 5.0, 0]} castShadow><cylinderGeometry args={[0.1, 0.18, 0.5, 12]} /><meshStandardMaterial color="#2c2f31" roughness={0.6} /></mesh>
    <mesh position={[0, FLOOR3 + 5.32, 0]} castShadow><sphereGeometry args={[0.16, 16, 12]} /><meshStandardMaterial color="#2c2f31" roughness={0.6} /></mesh>
    {/* 方石桌：一根束腰的石墩，上面一块方桌面；四只鼓凳 */}
    <group position={[0, FLOOR3, 0]}>
      <mesh geometry={stem} rotation-y={Math.PI / 4} castShadow receiveShadow><meshStandardMaterial map={granite()} roughness={0.75} /></mesh>
      <RoundedBox args={[1.12, 0.08, 1.12]} radius={0.015} position={[0, TABLE_H - 0.04, 0]} castShadow receiveShadow><meshStandardMaterial map={granite()} roughness={0.6} color="#d8d5cc" /></RoundedBox>
      {[[0, 1], [1, 0], [0, -1], [-1, 0]].map(([dx, dz]) => <mesh key={`${dx}${dz}`} geometry={drum} position={[dx * 1.05, 0, dz * 1.05]} castShadow receiveShadow><meshStandardMaterial map={granite()} roughness={0.75} /></mesh>)}
    </group>
  </group>
}

// ---------- 第 6 课的数轴石条 ----------
/** 数轴石条：花岗石，嵌在方砖里和地面齐平，宽 0.7 m；四周一圈深色的勾缝 */
export const AXIS_W = 0.7
export const AXIS = { y: 0.012, z: ST.l6.z - AXIS_W / 2 + AXIS_V * AXIS_W }
function AxisStrip() {
  const t = makeAxis()
  return <group position={[ST.l6.x + 2.75, 0, ST.l6.z]}>
    <mesh position={[0, -0.03, 0]} receiveShadow><boxGeometry args={[6.64, 0.08, AXIS_W + 0.05]} /><meshStandardMaterial color="#3e403f" roughness={0.9} /></mesh>
    <mesh position={[0, 0.011, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[6.5, AXIS_W]} /><meshStandardMaterial map={t} roughness={0.7} /></mesh>
  </group>
}

// ---------- 旗杆 ----------
export const FLAG = { h: flag().h }
function FlagPole({ ownRope }: { ownRope?: boolean }) {
  const { x: X, z: Z } = ST.flag
  const pole = useMemo(() => lathe([[0, 0], [0.09, 0], [0.09, 0.3], [0.075, 0.34], [0.05, FLAG.h - 0.06], [0, FLAG.h - 0.06]], { segs: 28 }), [])
  const flange = useMemo(() => disc(0.2, 0.05), [])
  const cloth = useMemo(() => new THREE.PlaneGeometry(2.4, 1.6, 24, 12).translate(1.2, 0, 0), [])
  const base0 = useMemo(() => cloth.attributes.position.array.slice(), [cloth])
  useFrame(({ clock }) => {
    const p = cloth.attributes.position, t = clock.elapsedTime
    for (let i = 0; i < p.count; i++) { const x = base0[i * 3], y = base0[i * 3 + 1]; p.setZ(i, Math.sin(x * 2.2 - t * 3.2 + y * 0.6) * 0.13 * (x / 2.4)); p.setY(i, y - (x / 2.4) ** 2 * 0.12) }
    p.needsUpdate = true; cloth.computeVertexNormals()
  })
  return <group position={[X, 0, Z]}>
    {/* 旗杆底下：和地面齐平的一块花岗石，中间一圈不锈钢的底座法兰 */}
    <mesh position={[0, 0.0, 0]} receiveShadow><boxGeometry args={[2.0, 0.02, 2.0]} /><meshStandardMaterial map={granite()} roughness={0.75} /></mesh>
    <mesh geometry={flange} position={[0, 0.01, 0]} castShadow receiveShadow><Metal kind="stainless" grain="turned" /></mesh>
    <mesh geometry={pole} position={[0, 0.06, 0]} castShadow><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh position={[0, FLAG.h + 0.08, 0]} castShadow><sphereGeometry args={[0.1, 20, 14]} /><Metal kind="chrome" /></mesh>
    <mesh geometry={cloth} position={[0.05, FLAG.h - 0.4, 0]} castShadow><meshStandardMaterial color="#c8231d" roughness={0.75} side={THREE.DoubleSide} /></mesh>
    {/* 平时的绳子：贴着旗杆垂下来，拴在系绳器上 */}
    {!ownRope && <mesh position={[0.1, (FLAG.h + 1.3) / 2, 0]}><cylinderGeometry args={[0.008, 0.008, FLAG.h - 1.3, 6]} /><meshStandardMaterial color="#e8e2d0" roughness={0.9} /></mesh>}
    <mesh position={[0.11, 1.3, 0]}><boxGeometry args={[0.04, 0.16, 0.05]} /><Metal kind="stainless" /></mesh>
  </group>
}

// ---------- 竹林 ----------
function Bamboo() {
  const { x: X, z: Z } = ST.bamboo
  const { culm, leaf } = useMemo(() => {
    const r = rng(5), parts: THREE.BufferGeometry[] = [], leaves: THREE.BufferGeometry[] = []
    for (let i = 0; i < 46; i++) {
      const x = X - 2 + r() * 6, z = Z - 15 + r() * 5, h = 5 + r() * 4, rad = 0.035 + r() * 0.03, lean = (r() - 0.5) * 0.12
      const g = new THREE.CylinderGeometry(rad * 0.7, rad, h, 8, 1); g.translate(0, h / 2, 0); g.rotateZ(lean); g.translate(x, 0, z); parts.push(g)
      for (let y = 0.4; y < h; y += 0.38 + r() * 0.1) { const n = new THREE.TorusGeometry(rad * 1.02, rad * 0.12, 4, 10); n.rotateX(Math.PI / 2); n.translate(0, y, 0); n.rotateZ(lean); n.translate(x, 0, z); parts.push(n) }
      for (let k = 0; k < 16; k++) {
        const y = h * (0.45 + r() * 0.55), a = r() * Math.PI * 2, L = 0.25 + r() * 0.2
        const lg = new THREE.PlaneGeometry(L, 0.05); lg.translate(L / 2, 0, 0); lg.rotateX(r() * 3); lg.rotateZ(-0.5 - r() * 0.6); lg.rotateY(a)
        const cx = x - Math.sin(lean) * y, cz = z
        for (let m = 0; m < 3; m++) { const l2 = lg.clone(); l2.rotateY(m * 0.5); l2.translate(cx + (r() - 0.5) * 0.3, y + (r() - 0.5) * 0.3, cz + (r() - 0.5) * 0.3); leaves.push(l2) }
      }
    }
    return { culm: merge(parts), leaf: merge(leaves) }
  }, [X, Z])
  return <group>
    <mesh geometry={culm} castShadow><meshStandardMaterial color="#6f8a3c" roughness={0.55} /></mesh>
    <mesh geometry={leaf} castShadow><meshStandardMaterial color="#4f7a32" roughness={0.7} side={THREE.DoubleSide} /></mesh>
    {/* 竹林下的一圈石块围边和泥土 */}
    <mesh position={[X + 1, 0.01, Z - 12.5]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[8, 7]} /><meshStandardMaterial map={makeSoil()} color="#7a6a50" roughness={1} /></mesh>
  </group>
}

// ---------- 池塘（拓展：引葭赴岸） ----------
/** 池塘挖在地里：池边一圈花岗石压顶，池壁砌石，水面比地面低 0.3 m。cut 时朝镜头（南边）剖开，看得见水下和芦苇的根 */
function Pond({ cut }: { cut?: boolean }) {
  const { x: X, z: Z } = ST.pond, h = POND.half, B = -POND.depth + POND.water   // 池底
  const D = -5
  const { map, bump } = makeTiles()
  const ripple = useRipple([2, 2], 0.02)
  const soil = useMemo(() => { const t = makeSoil().clone(); t.needsUpdate = true; t.repeat.set(1 / 4, 1 / 4); return t }, [])
  const tiles = useMemo(() => { const m = map.clone(); m.needsUpdate = true; return m }, [map])
  // 四周的土块：顶面是方砖，侧面是泥土
  const block = (x0: number, x1: number, z0: number, z1: number, k: string) => <group key={k}>
    <mesh geometry={slab(x0, x1, D, -0.001, z0, z1, 4)} receiveShadow castShadow><meshStandardMaterial map={soil} roughness={1} /></mesh>
    <mesh geometry={slab(x0, x1, -0.02, 0, z0, z1, 4)} receiveShadow><meshStandardMaterial map={tiles} bumpMap={bump} bumpScale={1.4} roughness={0.86} color="#e4e6e2" /></mesh>
  </group>
  const wall = 0.3
  return <group>
    {block(HOLE.x0, HOLE.x1, HOLE.z0, Z - h - wall, 'n')}
    {block(HOLE.x0, X - h - wall, Z - h - wall, HOLE.z1, 'w')}
    {block(X + h + wall, HOLE.x1, Z - h - wall, HOLE.z1, 'e')}
    {!cut && block(X - h - wall, X + h + wall, Z + h + wall, HOLE.z1, 's')}
    {cut && <mesh geometry={slab(X - h - wall, X + h + wall, D, D + 0.4, Z + h, HOLE.z1, 4)} receiveShadow><meshStandardMaterial map={soil} roughness={1} /></mesh>}
    {/* 池壁：砌石，剖开时南面那道墙去掉 */}
    {([[X - h - wall, X + h + wall, Z - h - wall, Z - h], [X - h - wall, X - h, Z - h, Z + h], [X + h, X + h + wall, Z - h, Z + h], ...(cut ? [] : [[X - h - wall, X + h + wall, Z + h, Z + h + wall]])] as number[][]).map((q, i) =>
      <mesh key={i} geometry={slab(q[0], q[1], B - 0.3, 0, q[2], q[3], 1.2)} castShadow receiveShadow><meshStandardMaterial map={stoneDark()} color="#8a8880" roughness={0.9} /></mesh>)}
    {/* 池底 */}
    <mesh geometry={slab(X - h, X + h, B - 0.3, B, Z - h, Z + h, 1.5)} receiveShadow><meshStandardMaterial map={stoneDark()} color="#6a675e" roughness={1} /></mesh>
    {/* 压顶石 */}
    {[[0, -1], [-1, 0], [1, 0], [0, 1]].map(([sx, sz]) => (cut && sz === 1) ? null : <mesh key={`c${sx}${sz}`} position={[X + sx * (h + 0.15), 0.06, Z + sz * (h + 0.15)]} castShadow receiveShadow><boxGeometry args={[sx === 0 ? 2 * h + 0.6 : 0.34, 0.14, sz === 0 ? 2 * h + 0.6 : 0.34]} /><meshStandardMaterial map={granite()} roughness={0.75} /></mesh>)}
    {/* 水：一整块，剖开时南面就是水的剖面 */}
    <mesh position={[X, (POND.water + B) / 2, Z]} renderOrder={2}><boxGeometry args={[2 * h - 0.01, POND.water - B, 2 * h - 0.01]} /><meshPhysicalMaterial color="#2f6b72" transparent opacity={cut ? 0.42 : 0.82} roughness={0.15} depthWrite={false} /></mesh>
    <mesh position={[X, POND.water + 0.002, Z]} rotation-x={-Math.PI / 2} renderOrder={3}><planeGeometry args={[2 * h - 0.01, 2 * h - 0.01]} /><meshPhysicalMaterial color="#3d7a80" normalMap={ripple} normalScale={new THREE.Vector2(0.3, 0.3)} roughness={0.08} metalness={0.1} transparent opacity={0.75} /></mesh>
    {/* 剖开以后，剖面上一道深色的边，看得出是切开的 */}
    {cut && <mesh position={[X, (B - 0.3) / 2, Z + h + 0.002]}><planeGeometry args={[2 * h + 2 * wall, -(B - 0.3)]} /><meshBasicMaterial color="#1b3a3e" transparent opacity={0.12} depthWrite={false} /></mesh>}
  </group>
}

// ---------- 园子里的树 ----------
/** 沿着院墙、广场四角的几棵阔叶树 */
const TREES: [number, number, number][] = [[-33, -19, 7], [-21, -19.5, 6], [-14.5, -19, 7.5], [18, -19.5, 6.5], [32.5, -19, 8], [-33, 9, 6.5], [-33, 20, 7.5], [33, 20, 6], [-20, 20.5, 6.5], [12, 21, 7]]
function Trees() {
  return <>{TREES.map(([x, z, h], i) => <Tree key={i} x={x} z={z} h={h} seed={i * 13 + 5} />)}</>
}

// ---------- 施工的道具和园林小品 ----------
function Props() {
  return <group>
    {/* 第 1 课旁边：一垛青砖、一辆手推车、水桶、墨斗 */}
    <BrickStack at={[ST.l1.x - 4.2, 0, ST.l1.z + 2.4]} rot={0.3} />
    <BrickStack at={[ST.l1.x - 5.4, 0, ST.l1.z + 1.6]} rot={-0.1} rows={5} seed={4} />
    <Barrow at={[ST.l1.x - 4.6, 0, ST.l1.z - 1.2]} rot={2.4} />
    <Bucket at={[ST.l1.x + 4.6, 0, ST.l1.z + 1.4]} />
    <InkReel at={[ST.l1.x - 0.9, 0, ST.l1.z + 0.8]} rot={0.4} />
    {/* 第 6 课旁边：水桶、一盘绳子 */}
    <Bucket at={[ST.l6.x - 1.0, 0, ST.l6.z + 0.85]} />
    <RopeCoil at={[ST.l6.x - 0.45, 0, ST.l6.z + 0.75]} />
    <StakeBundle at={[ST.l6.x + 0.35, 0, ST.l6.z + 0.7]} rot={0.2} />
    {/* 第 7 课旁边：一捆木桩和木槌、墨斗 */}
    <StakeBundle at={[ST.l7.x - 0.9, 0, ST.l7.z + 0.8]} rot={0.5} />
    <InkReel at={[ST.l7.x + 3.2, 0, ST.l7.z + 0.6]} rot={-0.6} />
    <BrickStack at={[ST.l7.x + 4.6, 0, ST.l7.z - 2.4]} rot={1.2} seed={9} />
    {/* 广场南边：花坛、石凳、石灯笼，中间一块勾股图石刻 */}
    <FlowerBed at={[-12, 0, 15.5]} w={7} d={2} seed={2} />
    <FlowerBed at={[16, 0, 17]} w={6} d={2} seed={6} />
    <FlowerBed at={[-30, 0, -6]} w={2} d={7} seed={8} />
    <Bench at={[-12, 0, 13.4]} />
    <Bench at={[16, 0, 15]} rot={0} />
    <Bench at={[-3, 0, -6.5]} rot={Math.PI / 2} />
    <Lantern at={[-16.2, 0, 15.5]} />
    <Lantern at={[19.6, 0, 17]} />
    <Carving at={[0, 0, 14]} />
  </group>
}

// ---------- 墙外的城市 ----------
function City() {
  const list = useMemo(() => {
    const r = rng(19), out: { x: number; z: number; w: number; d: number; h: number; t: number }[] = []
    for (let i = 0; i < 26; i++) out.push({ x: -150 + i * 12 + (r() - 0.5) * 6, z: -60 - r() * 90, w: 12 + r() * 14, d: 12 + r() * 12, h: 30 + r() * 80, t: Math.floor(r() * 3) })
    return out
  }, [])
  const texs = useMemo(() => [makeTower(1), makeTower(2, [110, 120, 118]), makeTower(3, [84, 98, 120])], [])
  return <group>
    {list.map((b, i) => <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow={false}>
      <boxGeometry args={[b.w, b.h, b.d]} />
      <meshStandardMaterial map={texs[b.t]} roughness={0.35} metalness={0.25} />
    </mesh>)}
  </group>
}

export function World({ cut, ownRope }: Want = {}) {
  return (
    <group>
      <Ground />
      {/* 北面院墙（木工坊那一段被房子占了）、东西两面院墙 */}
      <GardenWall x={-16} z={-22.2} len={40} windows={[-14, -6, 4, 12]} />
      <GardenWall x={26} z={-22.2} len={20} windows={[2, 6]} />
      <GardenWall x={-36.2} z={14} len={72} rot={Math.PI / 2} windows={[-23, -7, 15]} />
      <GardenWall x={36.2} z={14} len={72} rot={Math.PI / 2} windows={[-25, 12]} />
      {/* 第 5 课那段单独的粉墙 */}
      <GardenWall x={WALL5.x} z={(WALL5.z0 + WALL5.z1) / 2} len={WALL5.z1 - WALL5.z0} h={WALL5.h} t={WALL5.t} rot={Math.PI / 2} />
      <Workshop />
      <Shed />
      <Pavilion />
      <AxisStrip />
      <FlagPole ownRope={ownRope} />
      <Bamboo />
      <Pond cut={cut} />
      <Trees />
      <Props />
      <City />
    </group>
  )
}
