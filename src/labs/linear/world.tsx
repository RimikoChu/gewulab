// 一次函数实验室的大场景：一段双向四车道的高速公路。公路沿 x 方向，去程朝 +x，靠右行驶（去程在 +z 一侧）。
// 路的一侧是服务区（加油站、停车场、服务楼）；往回是收费站和出口。讲图像的几课，坐标平面立在中央分隔带上空。
// 整个实验室只有这一个世界，换课时画布不重建，镜头沿着公路飞。各课的位置和机位写在 SPOT 里。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, makeGround, mergeParts, type Part } from '@/lab-kit'
import { Sedan, Truck } from './car'
import { Pump } from './equip'
import { makeAsphalt, makeSign } from './mats'
import { Trees, ridgeGeo } from './trees'

type V3 = [number, number, number]
/** 横断面（z）：中央分隔带 ±0.4，内侧黄线 ±1.6，车道分界 ±5.25，外侧白线 ±9，路肩外沿 ±12.75 */
export const ROAD = { yellow: 1.6, lane: 5.25, edge: 9, side: 12.75, x0: -260, x1: 760 }
/** 去程两条车道的中心 */
export const LANE = { fast: 3.375, slow: 7.125 }
/** 各处的位置 */
export const P = {
  cockpit: 440,                      // 第 1 课：车停在这里（看起来在开）
  pump: [25, 0, 33.5] as V3,         // 第 2 课：加油机
  car2: [28.6, 0, 36.05] as V3,         // 第 2 课：加油的车
  plane3: 120, plane6: 205, plane7: 292,  // 第 3、6、7 课：坐标平面左下角的 x
  board4: [62, 0, 30] as V3,         // 第 4 课：服务区的电子屏（朝 −z）
  board5: [-112, 0, 31] as V3,       // 第 5 课：收费站边的电子屏（朝 +z）
  boardX: [-196, 0, 19] as V3,       // 拓展：出口路边的电子屏（朝 −z）
  toll: -120,
}
/** 第 1 课往前的这一段路上不画车道虚线和护栏立柱：它们由第 1 课自己画，跟着“车速”往后退 */
export const OPEN = [P.cockpit - 30, ROAD.x1]

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
export const SPOT = {
  cockpit: { target: v(P.cockpit + 0.5, 1.08, LANE.fast - 0.37), span: [0.86, 0.58] as [number, number], view: [-Math.PI / 2 + 0.02, 0.06] as [number, number] },
  pump: { target: v(P.pump[0] + 1.6, 1.35, P.pump[2] + 1.3), span: [6.6, 3.4] as [number, number], view: [Math.PI - 0.62, 0.16] as [number, number] },
  plane3: { target: v(P.plane3 + 19.5, 11.5, 0), span: [41, 23] as [number, number], view: [0.1, 0.15] as [number, number] },
  board4: { target: v(P.board4[0], 7.2, P.board4[2]), span: [19, 11.5] as [number, number], view: [Math.PI + 0.12, 0.08] as [number, number] },
  board5: { target: v(P.board5[0], 7.2, P.board5[2]), span: [19, 11.5] as [number, number], view: [-0.14, 0.1] as [number, number] },
  plane6: { target: v(P.plane6 + 21.7, 14.4, 0), span: [45, 26] as [number, number], view: [-0.08, 0.1] as [number, number] },
  plane7: { target: v(P.plane7 + 21.7, 14.4, 0), span: [45, 26] as [number, number], view: [0.12, 0.12] as [number, number] },
  boardX: { target: v(P.boardX[0] + 2.5, 6.0, P.boardX[2]), span: [24, 14] as [number, number], view: [Math.PI - 0.16, 0.1] as [number, number] },
  over: { target: v(38, 3, 18), span: [100, 36] as [number, number], view: [Math.PI + 0.55, 0.17] as [number, number] },
}

const inOpen = (x: number) => x > OPEN[0] && x < OPEN[1]
const inToll = (x: number) => x > P.toll - 48 && x < P.toll + 48
const inService = (x: number) => x > -50 && x < 110

/** 新泽西式混凝土护栏的截面（z, y） */
function barrierGeo(x0: number, x1: number) {
  const s = new THREE.Shape(), h = [[-0.4, 0], [-0.4, 0.08], [-0.2, 0.33], [-0.1, 0.85], [0.1, 0.85], [0.2, 0.33], [0.4, 0.08], [0.4, 0]]
  s.moveTo(h[0][0], h[0][1]); for (const [z, y] of h.slice(1)) s.lineTo(z, y); s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(x0, 0, 0)
  return g
}

/** 树的位置 [x, z, 高]：公路两侧成片，避开服务区、收费站和各课镜头前面的地方 */
function treeSpots() {
  let seed = 21; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
  const out: [number, number, number][] = []
  const blocked = (x: number, z: number) =>
    (z > 12 && z < 150 && x > 95 && x < 380) || (z < -12 && z > -75 && x > 100 && x < 370) ||   // 第 3、6、7 课的镜头前、坐标平面后
    (z > 12 && z < 90 && x > -60 && x < 120) ||                                                 // 服务区
    (Math.abs(z) < 40 && inToll(x)) || (z > 20 && z < 90 && x > -150 && x < -70) ||             // 收费站和第 5 课的镜头
    (z > 10 && z < 34 && x > -215 && x < -175) || (z < -14 && z > -40 && x > -215 && x < -175)  // 拓展课的电子屏和镜头
  for (let i = 0; i < 900 && out.length < 520; i++) {
    const x = -300 + rnd() * 1100, side = rnd() < 0.5 ? 1 : -1, z = side * (18 + Math.pow(rnd(), 0.8) * 120)
    if (blocked(x, z)) continue
    out.push([x, z, 9 + rnd() * 7])
  }
  for (let i = 0; i < 90; i++) out.push([90 + rnd() * 300, 160 + rnd() * 60, 10 + rnd() * 6])
  return out
}
/** 草地：细草纹贴图上再乘一层顶点色，做出大块的深浅 */
function groundGeo() {
  const g = new THREE.PlaneGeometry(3000, 2400, 240, 180); g.rotateX(-Math.PI / 2)
  const p = g.attributes.position, col = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i)
    const n = 0.5 + 0.22 * Math.sin(x * 0.021 + Math.sin(z * 0.017) * 2) + 0.16 * Math.sin(z * 0.033 + x * 0.011) + 0.1 * Math.sin((x + z) * 0.07)
    const dry = Math.max(0, Math.sin(x * 0.009 - z * 0.013) * 0.6)
    col.set([0.78 + n * 0.32 + dry * 0.18, 0.82 + n * 0.28 + dry * 0.08, 0.72 + n * 0.22 - dry * 0.05], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

/** 公路上的标线、护栏、服务区和收费站里的静态件，合成一个模型 */
function makeRoadParts() {
  const parts: Part[] = []
  const Y = 0.035
  // 车道虚线：线长 6 m、间隔 9 m；内侧黄色实线、外侧白色实线
  for (const s of [1, -1]) {
    for (let x = ROAD.x0; x < ROAD.x1; x += 15) if (!inToll(x) && !inOpen(x)) parts.push({ p: [x + 3, Y, s * ROAD.lane], s: [6, 0.01, 0.15], c: '#e9e9e4' })
    for (const [a, b] of [[ROAD.x0, P.toll - 48], [P.toll + 48, ROAD.x1]]) {
      parts.push({ p: [(a + b) / 2, Y, s * ROAD.yellow], s: [b - a, 0.01, 0.15], c: '#d9b23a' })
      parts.push({ p: [(a + b) / 2, Y, s * ROAD.edge], s: [b - a, 0.01, 0.2], c: '#e9e9e4' })
    }
  }
  // 波形护栏：两道钢板加立柱，立在路肩外沿；服务区入口、收费站处断开
  for (const s of [1, -1]) {
    const runs = s > 0 ? [[ROAD.x0, P.toll - 50], [P.toll + 50, -52], [112, ROAD.x1]] : [[ROAD.x0, P.toll - 50], [P.toll + 50, ROAD.x1]]
    for (const [a, b] of runs) {
      parts.push({ p: [(a + b) / 2, 0.62, s * 12.45], s: [b - a, 0.31, 0.06], c: '#c3c7c9' })
      parts.push({ p: [(a + b) / 2, 0.62, s * 12.42], s: [b - a, 0.1, 0.09], c: '#d6d9db' })
      for (let x = a; x <= b; x += 4) if (!inOpen(x)) parts.push({ p: [x, 0.4, s * 12.55], s: [0.08, 0.8, 0], c: '#9aa0a4', cyl: true })
    }
  }
  // 服务区：减速车道的标线、停车位
  for (let x = -40; x < 105; x += 4) parts.push({ p: [x + 1.5, Y, 12.6], s: [3, 0.01, 0.2], c: '#e9e9e4' })
  for (let x = 44; x <= 82; x += 2.8) parts.push({ p: [x, Y, 49.5], s: [0.12, 0.01, 5], c: '#e9e9e4' })
  parts.push({ p: [63, Y, 47], s: [38.2, 0.01, 0.12], c: '#e9e9e4' })
  // 加油站的两条加油岛：混凝土台、黄黑相间的端头
  for (const z of [33.5, 40.5]) {
    parts.push({ p: [25, 0.12, z], s: [22, 0.24, 1.3], c: '#bdbab2' })
    for (const x of [13.6, 36.4]) parts.push({ p: [x, 0.13, z], s: [0.8, 0.26, 1.32], c: '#e1b52f' })
  }
  // 收费站：一排收费岛和岗亭
  for (let i = 0; i < 9; i++) {
    const z = -22.4 + i * 5.6
    parts.push({ p: [P.toll, 0.15, z], s: [14, 0.3, 1.6], c: '#c4c1b9' })
    parts.push({ p: [P.toll - 7.2, 0.16, z], s: [0.6, 0.32, 1.62], c: '#e1b52f' })
    if (i > 0 && i < 8) {
      parts.push({ p: [P.toll + 1, 1.5, z], s: [2.4, 2.6, 1.3], c: '#e9ebea' }); parts.push({ p: [P.toll + 1, 1.8, z], s: [2.2, 1.0, 1.34], c: '#3d5a6a' })
      parts.push({ p: [P.toll + 1, 2.9, z], s: [2.6, 0.2, 1.5], c: '#9aa0a4' })
    }
    for (const x of [P.toll - 5.5, P.toll + 5.5]) parts.push({ p: [x, 3.3, z], s: [0.45, 6.6, 0.45], c: '#e3e5e4' })
  }
  for (let i = 0; i < 8; i++) for (let x = P.toll - 40; x < P.toll - 8; x += 6) parts.push({ p: [x + 1.5, Y, -19.6 + i * 5.6], s: [3, 0.01, 0.12], c: '#e9e9e4' })
  return mergeParts(parts)
}

export function World() {
  const grass = useMemo(() => { const t = makeGround('#7d8f5e', '96,116,70', '150,156,100', 13); t.repeat.set(120, 60); return t }, [])
  const asphalt = useMemo(() => { const t = makeAsphalt().clone(); t.repeat.set((ROAD.x1 - ROAD.x0) / 12, 2.2); t.needsUpdate = true; return t }, [])
  const plaza = useMemo(() => { const t = makeAsphalt().clone(); t.repeat.set(10, 6); t.needsUpdate = true; return t }, [])
  const spots = useMemo(treeSpots, [])
  const ground = useMemo(groundGeo, [])
  const hills = useMemo(() => ({
    a: ridgeGeo(3, 2400, 260, 70, '#6f8478', '#a9b8bf'), b: ridgeGeo(7, 2400, 300, 90, '#7d8f88', '#b4c1c8'), c: ridgeGeo(13, 1400, 260, 80, '#748a80', '#adbcc3'),
  }), [])
  const parts = useMemo(makeRoadParts, [])
  const barrier = useMemo(() => mergeGeometries([barrierGeo(ROAD.x0, P.toll - 52), barrierGeo(P.toll + 52, ROAD.x1)]), [])
  const tollTaper = useMemo(() => {
    const s = new THREE.Shape(), a = P.toll, w = 24.5, r = ROAD.side
    s.moveTo(a - 90, -r); s.lineTo(a - 48, -w); s.lineTo(a + 48, -w); s.lineTo(a + 90, -r); s.lineTo(a + 90, r); s.lineTo(a + 48, w); s.lineTo(a - 48, w); s.lineTo(a - 90, r); s.closePath()
    const g = new THREE.ShapeGeometry(s); g.rotateX(Math.PI / 2); return g
  }, [])
  const serviceSign = makeSign('服务区', { w: 512, h: 160, bg: '#1f6d4a', fg: '#ffffff', size: 0.6 })
  const tollSign = makeSign('收费站', { w: 512, h: 160, bg: '#1f6d4a', fg: '#ffffff', size: 0.6 })
  const fuelSign = makeSign('加油站', { w: 512, h: 128, bg: '#f4f5f2', fg: '#1b7a52', size: 0.62 })
  return (
    <group>
      <mesh geometry={ground} position={[200, -0.02, 0]} receiveShadow><meshStandardMaterial map={grass} vertexColors roughness={1} /></mesh>
      {/* 路面：主线、收费广场、服务区的场地 */}
      <mesh rotation-x={-Math.PI / 2} position={[(ROAD.x0 + ROAD.x1) / 2, 0.01, 0]} receiveShadow><planeGeometry args={[ROAD.x1 - ROAD.x0, ROAD.side * 2]} /><meshStandardMaterial map={asphalt} roughness={0.92} /></mesh>
      <mesh geometry={tollTaper} position={[0, 0.012, 0]} receiveShadow><meshStandardMaterial map={plaza} roughness={0.92} side={THREE.DoubleSide} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[30, 0.012, 15.5]} receiveShadow><planeGeometry args={[160, 6]} /><meshStandardMaterial map={plaza} roughness={0.92} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[45, 0.011, 43]} receiveShadow><planeGeometry args={[110, 56]} /><meshStandardMaterial map={plaza} roughness={0.92} color="#d9d9d9" /></mesh>
      <mesh geometry={parts} castShadow receiveShadow><Painted rough={0.7} metal={0.2} /></mesh>
      <mesh geometry={barrier} castShadow receiveShadow><meshStandardMaterial color="#c9c6be" roughness={0.9} /></mesh>
      <Trees spots={spots} />
      {/* 远山：两侧各一道柔和起伏的山脊，第 1 课往前看的尽头也有一道；颜色偏冷，雾里发淡 */}
      <mesh geometry={hills.a} position={[200, 0, -560]}><meshStandardMaterial vertexColors roughness={1} /></mesh>
      <mesh geometry={hills.b} position={[150, 0, 640]}><meshStandardMaterial vertexColors roughness={1} /></mesh>
      <mesh geometry={hills.c} position={[1180, 0, 0]} rotation-y={Math.PI / 2}><meshStandardMaterial vertexColors roughness={1} /></mesh>
      {/* 加油站：罩棚、立柱、棚顶下的灯；两条岛上各三台加油机（第 2 课那一台由第 2 课自己画） */}
      <group position={[25, 0, 37]}>
        <RoundedBox args={[30, 1.1, 16]} radius={0.12} position={[0, 6.35, 0]} castShadow receiveShadow><meshStandardMaterial color="#f2f3f1" roughness={0.5} /></RoundedBox>
        {[1, -1].map(s => <mesh key={s} position={[0, 6.2, s * 8.02]}><boxGeometry args={[30.1, 0.34, 0.05]} /><meshStandardMaterial color="#1b7a52" roughness={0.5} /></mesh>)}
        <mesh position={[0, 6.4, -8.04]} rotation-y={Math.PI}><planeGeometry args={[6, 1.5]} /><meshStandardMaterial map={fuelSign} roughness={0.5} /></mesh>
        <mesh position={[0, 6.4, 8.04]}><planeGeometry args={[6, 1.5]} /><meshStandardMaterial map={fuelSign} roughness={0.5} /></mesh>
        {[-9, 0, 9].flatMap(x => [-4, 3].map(z => <mesh key={`${x}${z}`} position={[x, 5.79, z]} rotation-x={Math.PI / 2}><planeGeometry args={[2.4, 0.9]} /><meshStandardMaterial color="#ffffff" emissive="#fff6e6" emissiveIntensity={1.2} side={THREE.DoubleSide} /></mesh>))}
        {[-8, 8].flatMap(x => [-3.5, 3.5].map(z => <mesh key={`c${x}${z}`} position={[x, 2.9, z]} castShadow><boxGeometry args={[0.6, 5.8, 0.6]} /><meshStandardMaterial color="#e6e8e6" roughness={0.5} /></mesh>))}
      </group>
      {[18, 32].map(x => <Pump key={`a${x}`} position={[x, 0.24, 33.5]} grade={x === 18 ? '95#' : '92#'} />)}
      {[18, 25, 32].map(x => <Pump key={`b${x}`} position={[x, 0.24, 40.5]} grade={x === 18 ? '0#' : x === 25 ? '95#' : '92#'} />)}
      {/* 服务楼：石材墙基、一整面玻璃幕墙（竖梃、横档）、入口雨棚和立柱、女儿墙、屋顶的空调机组和牌子 */}
      <group position={[63, 0, 60]}>
        <mesh position={[0, 3.5, 0]} castShadow receiveShadow><boxGeometry args={[44, 7, 14]} /><meshStandardMaterial color="#d9d3c6" roughness={0.85} /></mesh>
        <mesh position={[0, 0.4, -7.02]}><boxGeometry args={[44.2, 0.8, 0.1]} /><meshStandardMaterial color="#8f8a80" roughness={0.9} /></mesh>
        <mesh position={[0, 3.3, -7.03]}><planeGeometry args={[40, 5]} /><meshPhysicalMaterial color="#3f5f70" roughness={0.06} metalness={0.6} clearcoat={1} envMapIntensity={1.3} /></mesh>
        {Array.from({ length: 21 }, (_, i) => <mesh key={i} position={[-20 + i * 2, 3.3, -7.08]}><boxGeometry args={[0.12, 5, 0.12]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
        {[1.1, 3.3, 5.75].map(y => <mesh key={y} position={[0, y, -7.08]}><boxGeometry args={[40, 0.1, 0.12]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
        <mesh position={[0, 1.4, -7.06]}><planeGeometry args={[6, 2.6]} /><meshPhysicalMaterial color="#20313a" roughness={0.05} metalness={0.5} clearcoat={1} /></mesh>
        <RoundedBox args={[10, 0.35, 4]} radius={0.08} position={[0, 3.2, -9]} castShadow><meshStandardMaterial color="#eef0ee" roughness={0.45} /></RoundedBox>
        {[-4.5, 4.5].map(x => <mesh key={x} position={[x, 1.5, -10.6]} castShadow><cylinderGeometry args={[0.16, 0.16, 3, 16]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
        <mesh position={[0, 7.35, 0]} castShadow><boxGeometry args={[44.6, 0.7, 14.6]} /><meshStandardMaterial color="#eceeed" roughness={0.5} /></mesh>
        <mesh position={[0, 6.85, -7.32]}><boxGeometry args={[44.6, 0.3, 0.05]} /><meshStandardMaterial color="#1b7a52" roughness={0.5} /></mesh>
        {[-14, -9, 9, 14].map(x => <RoundedBox key={x} args={[2.6, 1.2, 1.8]} radius={0.05} position={[x, 8.3, 2]} castShadow><meshStandardMaterial color="#c9ccce" roughness={0.5} metalness={0.3} /></RoundedBox>)}
        <group position={[0, 9.0, -6.4]}>
          {[-3.6, 3.6].map(x => <mesh key={x} position={[x, -0.7, 0.3]}><boxGeometry args={[0.15, 1.4, 0.15]} /><Metal kind="steel" /></mesh>)}
          <RoundedBox args={[9, 2.2, 0.3]} radius={0.06}><meshStandardMaterial color="#1f6d4a" roughness={0.5} /></RoundedBox>
          <mesh position={[0, 0, -0.16]} rotation-y={Math.PI}><planeGeometry args={[8.6, 1.9]} /><meshStandardMaterial map={serviceSign} roughness={0.5} /></mesh>
        </group>
      </group>
      {/* 收费站的大棚 */}
      <group position={[P.toll, 0, 0]}>
        <RoundedBox args={[16, 1.2, 48]} radius={0.15} position={[0, 7.2, 0]} castShadow receiveShadow><meshStandardMaterial color="#f0f1ef" roughness={0.5} /></RoundedBox>
        {[1, -1].map(s => <mesh key={s} position={[s * 8.03, 7.2, 0]} rotation-y={s > 0 ? Math.PI / 2 : -Math.PI / 2}><planeGeometry args={[47, 0.5]} /><meshStandardMaterial color="#1b7a52" roughness={0.5} /></mesh>)}
        <mesh position={[8.06, 7.25, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[7, 1.1]} /><meshStandardMaterial map={tollSign} roughness={0.5} /></mesh>
        <mesh position={[-8.06, 7.25, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[7, 1.1]} /><meshStandardMaterial map={tollSign} roughness={0.5} /></mesh>
      </group>
      {/* 停着的车：服务区里几辆，对向车道上几辆 */}
      {([[50, 50, '#2d3e5c'], [58.4, 50, '#e9ebec'], [64, 50, '#8a1f24'], [72.4, 50, '#3b3f44'], [78, 50, '#b9bdc0']] as const).map(([x, z, c]) => <Sedan key={`p${x}`} position={[x, 0, z]} rotation-y={Math.PI / 2} color={c} />)}
      <Truck position={[95, 0, 30]} rotation-y={0.1} cab="#b1352c" />
      {([[-30, -LANE.fast, '#e3e5e6'], [60, -LANE.slow, '#3b4552'], [-210, -LANE.slow, '#2f4a6b']] as const).map(([x, z, c]) => <Sedan key={`o${x}`} position={[x, 0, z]} rotation-y={Math.PI} color={c} />)}
      <Truck position={[395, 0, -LANE.slow]} rotation-y={Math.PI} cab="#d9dcde" />
    </group>
  )
}
export type { V3 }
