// 带电粒子在磁场中实验室的大场景：一座加速器实验大厅。钢结构厂房，环氧地坪上画着黄色安全线；
// 北面一道混凝土屏蔽墙，墙上开着一个口子，后面的隧道里是储存环的一段（蓝色二极磁铁、红色四极磁铁、不锈钢束流管）。
// 各课的装置沿屏蔽墙从西往东一字排开（位置见 layout.ts）。整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。
// 当前这一课的装置由那一课自己画（带着它的状态）；别的课的装置在这里按静止的样子画，远处看得见。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Metal, Painted, mergeParts, useConcrete, type Label, type Part } from '@/lab-kit'
import { HALL, SPOT, ST, WALL_Z, type SpotKey, type StKey } from './layout'
import { makeCladding, makeFloor, makeHazard, makeText, rep } from './mats'
import type { V3 } from './physics'
import { IDLE } from './idle'

/** 屏蔽墙上的口子（x 范围、高度） */
const GAP = { x0: 5.2, x1: 12.8, h: 3.4 }
/** 储存环：圆心和半径（m）；在口子后面露出一段 */
const RING = { cx: 9, cz: -66, R: 60 }

/** 每一课交给世界的要求：工作灯照哪；哪一处装置由这一课自己画 */
export interface Want { light: V3; aim: V3; cur: StKey | 'q' }
export function Place({ at, cur, labels, children = null }: { at: SpotKey; cur: StKey | 'q'; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  const w = useMemo<Want>(() => ({ light: v.light, aim: v.target.toArray() as V3, cur }), [v, cur])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sky={false} backdrop="#0a0d11" studio env={0.6} sun={0.5} fog={at === 'q' ? [40, 220] : [14, 90]} bloom={0.8} world={w}>{children}</LabStage>
}

const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string, r?: [number, number, number]): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c, r })

/** 钢结构：屏蔽墙后面和大厅南边两排 H 型钢柱，柱顶的屋架，行车轨道和一台黄色行车，墙上的电缆桥架 */
function frameParts() {
  const P: Part[] = [], H = HALL
  for (let x = H.x0 + 2; x <= H.x1 - 1; x += 6) for (const z of [WALL_Z - 2.4]) {
    P.push(box(x, 0, z, 0.36, H.h - 0.4, 0.04, '#3e4a55'), box(x - 0.17, 0, z, 0.02, H.h - 0.4, 0.36, '#3e4a55'), box(x + 0.17, 0, z, 0.02, H.h - 0.4, 0.36, '#3e4a55'))
    P.push(box(x, 8.6, z + (z > 0 ? -0.35 : 0.35), 0.3, 0.5, 0.5, '#3e4a55'))   // 牛腿
  }
  // 行车轨道梁、屋架下弦和上弦
  P.push(box((H.x0 + H.x1) / 2, 9.1, WALL_Z - 2.05, H.x1 - H.x0, 0.5, 0.3, '#46515b'))
  for (let x = H.x0 + 2; x <= H.x1 - 1; x += 6) {
    P.push(box(x, H.h - 1.3, (WALL_Z - 2.4 + H.z1) / 2, 0.2, 0.22, H.z1 - WALL_Z + 2.4, '#4d5862'))
    P.push(box(x, H.h - 0.4, (WALL_Z - 2.4 + H.z1) / 2, 0.2, 0.22, H.z1 - WALL_Z + 2.4, '#4d5862'))
    for (let k = 0; k <= 8; k++) { const z = WALL_Z - 2.4 + k * (H.z1 - WALL_Z + 2.4) / 8; P.push(box(x, H.h - 1.2, z, 0.08, 0.8, 0.08, '#4d5862')) }
  }
  for (let k = 0; k <= 8; k++) { const z = WALL_Z - 2.4 + k * (H.z1 - WALL_Z + 2.4) / 8; P.push(box((H.x0 + H.x1) / 2, H.h - 0.2, z, H.x1 - H.x0, 0.16, 0.12, '#4d5862')) }
  // 墙上的电缆桥架：屏蔽墙顶上一条，带几根下来的线槽
  P.push(box((H.x0 + H.x1) / 2, 5.1, WALL_Z + 0.25, H.x1 - H.x0, 0.12, 0.45, '#8f979c'))
  for (const x of [ST.l3, ST.l7 + 2.2, ST.l6]) P.push(box(x + 0.9, 1.0, WALL_Z + 0.08, 0.16, 4.1, 0.12, '#8f979c'))
  return P
}

/** 大厅里的杂物：两课之间靠墙摆着机柜、气瓶、码起来的屏蔽块和电缆盘，让大厅不空 */
function propParts() {
  const P: Part[] = [], xs = Object.values(ST)
  xs.slice(0, -1).forEach((x0, i) => {
    const x = (x0 + xs[i + 1]) / 2, z = WALL_Z + 0.55, k = i % 3
    if (k === 0) {   // 两台机柜：深灰柜体、前门一道缝、几颗指示灯
      for (const dx of [-0.33, 0.33]) {
        P.push(box(x + dx, 0, z, 0.6, 2.0, 0.6, '#2d3338'), box(x + dx, 0.05, z + 0.301, 0.56, 1.9, 0.004, '#3a4148'), box(x + dx + 0.22, 1.0, z + 0.305, 0.02, 0.3, 0.01, '#9aa1a8'))
        for (let j = 0; j < 4; j++) P.push(box(x + dx - 0.2 + j * 0.05, 1.75, z + 0.305, 0.02, 0.02, 0.01, j % 2 ? '#3ad37a' : '#e8b13a'))
      }
    } else if (k === 1) {   // 一组气瓶：绿色、灰色，顶上一圈瓶帽，后面一根拦链
      [['#3d6b4a', -0.3], ['#9aa0a6', 0], ['#3d6b4a', 0.3]].forEach(([c, dx]) => {
        P.push({ p: [x + (dx as number), 0.7, z], s: [0.11, 1.4, 0], c: c as string, cyl: true }, { p: [x + (dx as number), 1.47, z], s: [0.06, 0.14, 0], c: '#c9c3b4', cyl: true })
      })
      P.push(box(x, 1.05, z - 0.13, 0.9, 0.03, 0.03, '#d4b22a'))
    } else {   // 码起来的混凝土屏蔽块和一只电缆盘
      P.push(box(x - 0.3, 0, z, 1.0, 0.5, 0.5, '#aaa79f'), box(x - 0.3, 0.5, z, 1.0, 0.5, 0.5, '#b3b0a8'), box(x + 0.25, 0.0, z + 0.05, 0.08, 0.02, 0.4, '#e0b21c'))
      P.push({ p: [x + 0.55, 0.32, z], s: [0.32, 0.12, 0], c: '#6e5132', cyl: true, r: [Math.PI / 2, 0, 0] }, { p: [x + 0.55, 0.32, z], s: [0.24, 0.2, 0], c: '#1f1f1f', cyl: true, r: [Math.PI / 2, 0, 0] })
    }
  })
  return P
}

/** 地面上的东西：一条盖着花纹钢板的电缆槽（每 1.2 m 一块盖板），回旋加速器周围一圈黄色警戒线 */
function floorParts() {
  const P: Part[] = []
  for (let x = HALL.x0 + 1; x < HALL.x1 - 1; x += 1.2) P.push(box(x + 0.6, 0, 2.7, 1.18, 0.012, 0.42, '#5d6266'), box(x + 0.6, 0.012, 2.7, 0.06, 0.003, 0.05, '#3a3e41'))
  P.push(box((HALL.x0 + HALL.x1) / 2, 0, 2.47, HALL.x1 - HALL.x0 - 2, 0.016, 0.03, '#8b9195'), box((HALL.x0 + HALL.x1) / 2, 0, 2.93, HALL.x1 - HALL.x0 - 2, 0.016, 0.03, '#8b9195'))
  const [x0, x1, z0, z1] = [ST.l7 - 1.6, ST.l7 + 1.6, -1.6, 1.25]
  P.push(box((x0 + x1) / 2, 0, z0, x1 - x0, 0.004, 0.08, '#e0b21c'), box((x0 + x1) / 2, 0, z1, x1 - x0, 0.004, 0.08, '#e0b21c'), box(x0, 0, (z0 + z1) / 2, 0.08, 0.004, z1 - z0, '#e0b21c'), box(x1, 0, (z0 + z1) / 2, 0.08, 0.004, z1 - z0, '#e0b21c'))
  // 从各课装置到电缆槽的一段段黄色走线护套
  for (const x of Object.values(ST)) P.push(box(x + 0.9, 0, 2.0, 0.12, 0.02, 1.0, '#c99a14'))
  return P
}

/** 屏蔽墙：一块块混凝土屏蔽块垒起来（每块 2 m × 1 m），口子上方一根过梁 */
function wallGeo() {
  const gs: THREE.BufferGeometry[] = [], H = 5, T = 2, rows = 5
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? 1 : 0
    for (let x = HALL.x0 - off; x < HALL.x1; x += 2) {
      const x0 = Math.max(HALL.x0, x), x1 = Math.min(HALL.x1, x + 2), y0 = r * (H / rows), y1 = y0 + H / rows
      if (x1 <= x0) continue
      if (y0 < GAP.h - 0.01 && x1 > GAP.x0 && x0 < GAP.x1) {   // 口子里的块去掉，只留两侧
        for (const [a, b] of [[x0, Math.min(x1, GAP.x0)], [Math.max(x0, GAP.x1), x1]]) if (b - a > 0.05) { const g = new THREE.BoxGeometry(b - a - 0.02, H / rows - 0.02, T); g.translate((a + b) / 2, (y0 + y1) / 2, WALL_Z - T / 2); gs.push(g) }
        continue
      }
      const g = new THREE.BoxGeometry(x1 - x0 - 0.02, H / rows - 0.02, T); g.translate((x0 + x1) / 2, (y0 + y1) / 2, WALL_Z - T / 2); gs.push(g)
    }
  }
  // 每个面按世界坐标贴图，块与块之间的缝是 2 cm 的空隙
  const g = mergeGeometriesSafe(gs), p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) { const ax = Math.abs(n.getX(i)) > 0.5, ay = Math.abs(n.getY(i)) > 0.5; uv.setXY(i, (ax ? p.getZ(i) : p.getX(i)) / 3, (ay ? p.getZ(i) : p.getY(i)) / 3) }
  return g
}
const mergeGeometriesSafe = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map(g => g.index ? g.toNonIndexed() : g))

/** 储存环的一段：沿圆弧排着二极磁铁（蓝）、四极磁铁（红），中间一根不锈钢束流管，下面是混凝土支墩 */
function ringParts() {
  const P: Part[] = [], { cx, cz, R } = RING
  for (let a = -0.2; a <= 0.2; a += 0.0105) {
    const k = Math.round(a / 0.0105), x = cx + R * Math.sin(a), z = cz + R * Math.cos(a), rot: [number, number, number] = [0, a, 0]
    const kind = ((k % 4) + 4) % 4
    P.push({ p: [x, 0.35, z], s: [0.5, 0.7, 0.5], c: '#9a9890', r: rot })
    if (kind === 0) P.push({ p: [x, 1.2, z], s: [1.6, 0.7, 0.9], c: '#2d5aa8', r: rot }, { p: [x, 1.2, z + 0.0], s: [1.62, 0.18, 0.5], c: '#b5672e', r: rot })
    else if (kind === 2) P.push({ p: [x, 1.2, z], s: [0.5, 0.8, 0.8], c: '#c23a2c', r: rot })
    else P.push({ p: [x, 1.2, z], s: [0.3, 0.5, 0.5], c: '#d7b33a', r: rot })
  }
  return P
}
function ringPipe() {
  const pts: THREE.Vector3[] = []
  for (let a = -0.22; a <= 0.22; a += 0.01) pts.push(new THREE.Vector3(RING.cx + RING.R * Math.sin(a), 1.2, RING.cz + RING.R * Math.cos(a)))
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.05, 12)
}

/** 跟着这一课走的工作灯：从器材左前上方照下来 */
function Key({ at, aim }: { at: V3; aim: V3 }) {
  const light = useRef<THREE.SpotLight>(null), target = useMemo(() => new THREE.Object3D(), [])
  const cur = useRef(new THREE.Vector3(...at)), look = useRef(new THREE.Vector3(...aim))
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const k = 1 - Math.exp(-Math.min(d, 1 / 30) / 0.5)
    cur.current.lerp(new THREE.Vector3(...at), k); look.current.lerp(new THREE.Vector3(...aim), k)
    l.position.copy(cur.current); target.position.copy(look.current); target.updateMatrixWorld()
  })
  return <>
    <primitive object={target} />
    <spotLight ref={light} target={target} angle={0.62} penumbra={0.85} intensity={36} distance={14} decay={1.4} color="#fff2e0" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.01} />
  </>
}

export function World({ light = [ST.l1 - 1.6, 4, 2.4], aim = [ST.l1, 0.9, 0], cur = 'l1' }: Partial<Want>) {
  const [cd, cn, cr] = useConcrete(1, 1)
  const tex = useMemo(() => ({
    floor: rep(makeFloor(), (HALL.x1 - HALL.x0 + 40) / 6, (HALL.z1 - WALL_Z + 30) / 6), hazard: rep(makeHazard(), 40, 1), haz2: rep(makeHazard(), 6, 1),
    clad: rep(makeCladding(), (HALL.x1 - HALL.x0) / 2, 1), cladSide: rep(makeCladding('#525c63'), 9, 1),
    sign: makeText(['加速器实验大厅'], { w: 1024, h: 160, bg: '#1d4f7a', fg: '#ffffff', size: 84 }),
    warn: makeText(['辐射区 · 束流运行时禁止进入'], { w: 1024, h: 128, bg: '#f2c419', fg: '#1a1a1a', size: 62, weight: 700 }),
  }), [])
  const conc = useMemo(() => [cd, cn, cr].map(t => { const c = t.clone(); c.repeat.set(1, 1); c.needsUpdate = true; return c }), [cd, cn, cr])
  const geo = useMemo(() => ({
    wall: wallGeo(), frame: mergeParts(frameParts()), props: mergeParts(propParts()), floor: mergeParts(floorParts()), ring: mergeParts(ringParts()), pipe: ringPipe(),
  }), [])
  const H = HALL
  return (
    <group>
      <hemisphereLight args={['#dfe7f0', '#3a3833', 0.42]} />
      <Key at={light} aim={aim} />
      {/* 大厅的灯：屋架下一排排工矿灯，各打一束朝下的光 */}
      {[-18, -6, 6, 18, 30].map(x => <pointLight key={x} position={[x, 9.5, 4]} intensity={22} distance={22} decay={1.3} color="#fdf3e2" />)}
      {[-18, -12, -6, 0, 6, 12, 18, 24, 30].flatMap(x => [0.8, 7.5].map(z => <group key={`${x}${z}`} position={[x, H.h - 1.6, z]}>
        <mesh><cylinderGeometry args={[0.22, 0.3, 0.3, 24, 1, true]} /><meshStandardMaterial color="#6e767c" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, -0.14, 0]} rotation-x={Math.PI / 2}><circleGeometry args={[0.28, 24]} /><meshBasicMaterial color="#fff7e6" toneMapped={false} side={THREE.DoubleSide} /></mesh>
      </group>))}
      {/* 地坪、安全线 */}
      <mesh rotation-x={-Math.PI / 2} position={[(H.x0 + H.x1) / 2, 0, (WALL_Z + H.z1) / 2 + 5]} receiveShadow><planeGeometry args={[H.x1 - H.x0 + 40, H.z1 - WALL_Z + 30]} /><meshPhysicalMaterial map={tex.floor} color="#a9aeb1" roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.4} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(H.x0 + H.x1) / 2, 0.002, 1.55]}><planeGeometry args={[H.x1 - H.x0 - 2, 0.08]} /><meshStandardMaterial color="#e0b21c" roughness={0.6} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(GAP.x0 + GAP.x1) / 2, 0.003, WALL_Z + 0.2]}><planeGeometry args={[GAP.x1 - GAP.x0, 0.3]} /><meshStandardMaterial map={tex.haz2} roughness={0.6} /></mesh>
      {/* 屏蔽墙和口子上方的警示牌 */}
      <mesh geometry={geo.wall} castShadow receiveShadow><meshStandardMaterial map={conc[0]} normalMap={conc[1]} roughnessMap={conc[2]} color="#b9b6ad" /></mesh>
      <mesh position={[(GAP.x0 + GAP.x1) / 2, GAP.h + 0.45, WALL_Z + 0.01]}><planeGeometry args={[3.4, 0.42]} /><meshStandardMaterial map={tex.warn} roughness={0.6} /></mesh>
      <mesh position={[-6, 6.8, WALL_Z - 2.15]}><planeGeometry args={[6, 0.94]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
      {/* 墙后：隧道地面、远处的弧形隧道墙、储存环 */}
      <mesh rotation-x={-Math.PI / 2} position={[9, -0.002, -12]}><planeGeometry args={[30, 14]} /><meshStandardMaterial color="#5d6164" roughness={0.8} /></mesh>
      <mesh position={[RING.cx, 2.6, RING.cz]}><cylinderGeometry args={[RING.R - 4.6, RING.R - 4.6, 5.2, 160, 1, true, -0.3, 0.6]} /><meshStandardMaterial map={conc[0]} color="#8f8d86" roughness={0.9} side={THREE.BackSide} /></mesh>
      <mesh geometry={geo.ring} castShadow receiveShadow><Painted rough={0.45} metal={0.3} /></mesh>
      <mesh geometry={geo.pipe}><Metal kind="stainless" grain="brushed" /></mesh>
      {[-0.12, 0, 0.12].map(a => <pointLight key={a} position={[RING.cx + (RING.R - 2) * Math.sin(a), 4.2, RING.cz + (RING.R - 2) * Math.cos(a)]} intensity={6} distance={9} color="#d8e6ff" />)}
      {/* 墙上方的彩钢墙板、两头的山墙 */}
      <mesh position={[(H.x0 + H.x1) / 2, (5 + H.h) / 2, WALL_Z - 2.6]}><planeGeometry args={[H.x1 - H.x0 + 2, H.h - 5]} /><meshStandardMaterial map={tex.clad} color="#9aa3aa" roughness={0.6} metalness={0.35} /></mesh>
      {[H.x0 - 0.5, H.x1 + 0.5].map((x, i) => <mesh key={i} position={[x, H.h / 2, (WALL_Z + H.z1) / 2]} rotation-y={i ? -Math.PI / 2 : Math.PI / 2}><planeGeometry args={[H.z1 - WALL_Z + 6, H.h]} /><meshStandardMaterial map={tex.cladSide} color="#8d969c" roughness={0.6} metalness={0.3} /></mesh>)}
      <mesh position={[(H.x0 + H.x1) / 2, H.h + 0.05, (WALL_Z + H.z1) / 2]} rotation-x={Math.PI / 2}><planeGeometry args={[H.x1 - H.x0 + 2, H.z1 - WALL_Z + 6]} /><meshStandardMaterial color="#3d444a" roughness={0.8} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo.frame} castShadow receiveShadow><Painted rough={0.55} metal={0.35} /></mesh>
      <mesh geometry={geo.floor} receiveShadow><Painted rough={0.6} metal={0.4} /></mesh>
      <mesh geometry={geo.props} castShadow receiveShadow><Painted rough={0.5} metal={0.3} /></mesh>
      {/* 各课的装置：当前这一课自己画，别的按静止的样子画 */}
      {(Object.keys(IDLE) as StKey[]).filter(k => k !== cur).map(k => <group key={k}>{IDLE[k]?.()}</group>)}
    </group>
  )
}
