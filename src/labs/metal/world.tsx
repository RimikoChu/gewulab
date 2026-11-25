// 金属和炼铁实验室的大场景：一座钢铁厂。最西头是理化检验楼，一层敞着门脸的化验室里靠后墙一条长化验台，各课占一格；
// 往东是高炉区（高炉、热风炉、除尘器、出铁场、上料皮带通廊），再往东是轧钢车间。远处是煤气柜、烟囱和别的厂房。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。画面里 1 m 画成 M 个单位。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LabStage, Painted, mergeParts, type Label, type Part } from '@/lab-kit'
import { asphaltTex, benchTex, cladTex, makeBoard, makeSign, rep, tileTex, wallTex } from './mats'
import { rng } from './parts'
import { BF, Plant } from './plant'
import { MILL, Mill } from './mill'

export const M = 6, TOP = 0.85 * M      // 1 m 在画面里多长；化验台台面的高度
export type V3 = [number, number, number]

/** 化验室：x 的范围、后墙和门脸的 z、层高；化验台的前后沿；器材摆在 z = BZ 这条线上 */
export const HALL = { x0: -138, x1: 0, z0: -18, z1: 4, h: 22 }
export const BENCH = { z0: -17.4, z1: -12.9 }
export const BZ = -15
/** 化验台上各格的中心（x）：每两根柱子之间一格 */
export const ST = { l1: -126, l2: -108, l3: -90, l4: -72, l5: -54, l6: -36, l7: -18 }
/** 通风橱：中心 x、宽、前后、玻璃拉门提到多高（画面单位） */
export const HOOD = { x: -108, w: 5.8, z0: -17.8, z1: -12.5, sash: 7.2 }   // sash：拉门下沿离地 7.2（台面上方约 0.35 m）
const COLS = [-135, -117, -99, -81, -63, -45, -27, -9]

/** 一个机位：看向哪里、要装进画面的宽和高、方位角和仰角、是不是室内、雾的起止 */
export const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], indoor: boolean, fog: [number, number] = [160, 1200]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, indoor, fog })
/** 高炉区、轧钢车间在画面单位里的原点 */
const bx = (x: number) => BF.x + x * M, bz = (z: number) => BF.z + z * M
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  l1: spot(ST.l1, TOP + 0.55, BZ + 0.25, 2.9, 1.5, [-0.12, 0.2], true),
  l2: spot(ST.l2, TOP + 0.75, BZ + 0.2, 2.1, 1.5, [0.1, 0.12], true),
  l3: spot(ST.l3 + 0.1, TOP + 0.55, BZ + 0.2, 2.0, 1.25, [-0.16, 0.16], true),
  l4: spot(ST.l4, TOP + 0.5, BZ + 0.25, 1.9, 1.2, [0.18, 0.18], true),
  l5: spot(ST.l5, TOP + 1.9, BZ - 0.4, 5.6, 3.6, [-0.05, 0.1], true),
  l6: spot(ST.l6 + 0.3, TOP + 0.75, BZ + 0.2, 3.1, 1.6, [-0.1, 0.14], true),
  l7: spot(ST.l7, TOP + 0.5, BZ + 0.25, 1.7, 1.1, [0.14, 0.16], true),
  /** 第 6 课后半：高炉全景、出铁场 */
  bf: spot(bx(4), 30 * M, bz(-2), 110 * M, 66 * M, [-0.38, 0.13], false, [2500, 14000]),
  tap: spot(bx(1.5), 9.2 * M, bz(11), 21 * M, 10.5 * M, [-0.55, 0.36], false, [900, 6000]),
  x: spot(MILL.x + 30 * M, 3 * M, MILL.z + 2 * M, 44 * M, 15 * M, [-0.05, 0.3], false, [400, 4000]),
  q: spot(BF.x + 18 * M, 24 * M, BF.z - 4 * M, 120 * M, 60 * M, [-0.42, 0.26], false, [2500, 14000]),
}
export type SpotKey = keyof typeof SPOT
export type Spot = ReturnType<typeof spot>

/** 每一课交给世界的要求：化验室的工作灯跟到哪；是不是在室内 */
export interface Want { x: number; indoor: boolean }

/** 这一课的舞台：选一处机位。室内点亮工作灯、换成摄影棚式的环境光；室外是傍晚的斜阳 */
export function Place({ at, labels, children = null }: { at: SpotKey | Spot; labels: Label[]; children?: ReactNode }) {
  const v = typeof at === 'string' ? SPOT[at] : at
  const want = useMemo<Want>(() => ({ x: v.target.x, indoor: v.indoor }), [v])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={v.indoor ? 1.0 : 2.4} env={v.indoor ? 0.6 : 0.85} studio={v.indoor} fog={v.fog} bloom={v.indoor ? 0.6 : 0.85} world={want}>{children}</LabStage>
}

// ---------- 化验室 ----------
/** 一块立方体，按“底面在 y0”放：省掉高度除以 2 的心算 */
const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c })
function hallParts() {
  const P: Part[] = [], H = HALL, B = BENCH
  // 柱子：白色方柱，柱脚一圈深灰的踢脚；门脸上一道大梁
  for (const x of COLS) { P.push(box(x, 0, H.z0 + 0.7, 1.4, H.h, 1.4, '#e4e4df'), box(x, 0, H.z0 + 0.7, 1.5, 1, 1.5, '#5b6063')) }
  for (const x of [COLS[0], COLS[4], COLS[7]]) P.push(box(x, 0, H.z1 - 0.8, 1.6, H.h, 1.6, '#e4e4df'))
  P.push(box((H.x0 + H.x1) / 2, H.h - 3.2, H.z1 - 0.8, H.x1 - H.x0, 3.2, 1.6, '#d9d8d1'))
  // 化验台：一条长的柜体，柜门一扇扇，每扇一只拉手；第 2 格是通风橱，台面另做
  for (let x = H.x0 + 2; x < H.x1 - 2; x += 4.5) {
    if (Math.abs(x + 2.25 - ST.l2) < 2.5) continue
    P.push(box(x + 2.25, 0.3, B.z1 - 0.12, 4.3, TOP - 0.9, 0.2, '#d7dad8'))
    P.push(box(x + 2.25, TOP - 1.28, B.z1 + 0.04, 1.3, 0.16, 0.16, '#7b8085'))
  }
  P.push(box((H.x0 + H.x1) / 2, 0, (B.z0 + B.z1) / 2, H.x1 - H.x0 - 4, 0.3, B.z1 - B.z0 - 0.4, '#3d4146'))
  // 台面后面的挡板和一条设备带（插座）
  P.push(box((H.x0 + H.x1) / 2, TOP, B.z0 + 0.12, H.x1 - H.x0 - 4, 1.6, 0.24, '#dfe2df'))
  for (const x of Object.values(ST)) if (x !== ST.l2 && x !== ST.l5) for (const s of [-1, 1]) P.push(box(x + s * 7, TOP + 0.8, B.z0 + 0.3, 0.9, 0.6, 0.12, '#e8e6df'))
  // 墙上的吊柜：玻璃门的木柜，放试剂瓶（第 5 格留给挂图）
  for (const x of [ST.l1, ST.l3, ST.l4, ST.l6, ST.l7]) {
    P.push(box(x, TOP + 4.6, H.z0 + 1.1, 13, 0.3, 2.2, '#b89668'), box(x, TOP + 8.6, H.z0 + 1.1, 13, 0.3, 2.2, '#b89668'))
    for (const s of [-1, 1]) P.push(box(x + s * 6.35, TOP + 4.6, H.z0 + 1.1, 0.3, 4.3, 2.2, '#b89668'))
    P.push(box(x, TOP + 6.6, H.z0 + 1.1, 12.4, 0.2, 2, '#c8a676'))
  }
  // 两格之间的水槽和鹅颈龙头
  for (const x of [ST.l3 + 9, ST.l6 + 9]) { P.push(box(x, TOP - 0.02, (B.z0 + B.z1) / 2 - 0.6, 2.2, 0.06, 1.6, '#9aa0a4')); P.push({ p: [x, TOP + 1.3, B.z0 + 0.5], s: [0.1, 2.6, 0.1], c: '#c6cbce', cyl: true }) }
  // 通风橱（第 2 格）：下面柜体，上面一个罩子，前面一扇提拉的玻璃门框，顶上一根排风管通到吊顶
  const { x: hx, w: hw, z0: hz0, z1: hz1, sash } = HOOD
  P.push(box(hx, 0.3, (hz0 + hz1) / 2, hw, TOP - 0.6, hz1 - hz0 - 0.2, '#e3e5e3'))
  for (let k = -1; k <= 1; k += 2) P.push(box(hx + k * hw / 4, 1.0, hz1 - 0.02, hw / 2 - 0.3, TOP - 1.9, 0.12, '#d7dad8'), box(hx + k * hw / 4, TOP - 1.4, hz1 + 0.06, 1.1, 0.14, 0.14, '#7b8085'))
  // 两侧的厚壁板（外白内浅灰）、顶上的罩子、后面的导流板（上中下三道排风缝）
  for (const k of [-1, 1]) P.push(box(hx + k * (hw / 2 - 0.3), TOP, (hz0 + hz1) / 2, 0.6, 10.2, hz1 - hz0, '#eef0ee'))
  P.push(box(hx, TOP + 10.2, (hz0 + hz1) / 2, hw, 2.2, hz1 - hz0, '#eef0ee'), box(hx, TOP + 12.4, (hz0 + hz1) / 2, hw - 1, 0.3, hz1 - hz0 - 0.6, '#c9cdcf'))
  P.push(box(hx, TOP + 0.02, hz0 + 0.45, hw - 1.2, 10.2, 0.25, '#dfe2e0'))
  for (const y of [0.35, 4.8, 9.3]) P.push(box(hx, TOP + y, hz0 + 0.6, hw - 2, 0.35, 0.05, '#3a3e41'))
  // 提拉玻璃门：两侧的导轨、门框、底下一道拉手；门现在提到台面上方 sash 处
  for (const k of [-1, 1]) P.push(box(hx + k * (hw / 2 - 0.65), sash, hz1 + 0.12, 0.18, TOP + 10.2 - sash, 0.18, '#a7acaf'))
  P.push(box(hx, sash - 0.1, hz1 + 0.14, hw - 1.3, 0.3, 0.22, '#a7acaf'), box(hx, sash - 0.35, hz1 + 0.32, hw * 0.45, 0.12, 0.12, '#5d6366'))
  P.push(box(hx, TOP + 10.1, hz1 + 0.14, hw - 1.3, 0.2, 0.2, '#a7acaf'))
  // 侧壁上的开关面板
  P.push(box(hx + hw / 2 - 0.62, TOP + 1.6, hz1 + 0.01, 0.06, 1.6, 0.9, '#2c3033'))
  // 顶上的排风管通到吊顶
  P.push({ p: [hx, TOP + 12.6 + (H.h - TOP - 12.6) / 2, (hz0 + hz1) / 2 - 0.4], s: [1.1, H.h - TOP - 12.6, 1.1], c: '#c9cdcf', cyl: true })
  // 窗台下的暖气片、灭火器箱
  P.push(box(COLS[7] + 4, 0.4, H.z1 - 1.8, 1.4, 2.6, 0.9, '#b8322a'))
  return P
}
/** 吊柜里的试剂瓶：棕色的、透明的 */
function bottles() {
  const P: Part[] = [], r = rng(17)
  for (const x0 of [ST.l1, ST.l3, ST.l4, ST.l6, ST.l7]) for (const y of [TOP + 4.75, TOP + 6.7]) for (let i = 0; i < 11; i++) {
    if (r() < 0.18) continue
    const rad = 0.24 + r() * 0.14, h = 0.9 + r() * 0.7, x = x0 - 5.6 + i * 1.12, z = HALL.z0 + 1.0 + (r() - 0.5) * 0.6
    const col = r() < 0.55 ? '#5a3214' : '#b9cccf', capC = r() < 0.5 ? '#1f2124' : '#d6d4cc'
    P.push({ p: [x, y + h / 2, z], s: [rad, h, rad], c: col, cyl: true }, { p: [x, y + h + 0.12, z], s: [rad * 0.5, 0.24, rad * 0.5], c: col, cyl: true }, { p: [x, y + h + 0.32, z], s: [rad * 0.55, 0.18, rad * 0.55], c: capC, cyl: true })
  }
  return mergeParts(P)
}
/** 化验楼的外壳：屋顶、外墙、女儿墙，以及门脸两侧的窗 */
function buildingParts() {
  const P: Part[] = [], H = HALL
  P.push(box((H.x0 + H.x1) / 2, H.h + 0.6, (H.z0 + H.z1) / 2 - 1, H.x1 - H.x0 + 3, 3.4, H.z1 - H.z0 + 4, '#d6d2c8'))
  P.push(box((H.x0 + H.x1) / 2, H.h + 4, (H.z0 + H.z1) / 2 - 1, H.x1 - H.x0 + 3.6, 1.2, H.z1 - H.z0 + 4.6, '#bdb8ad'))
  // 楼上一层（办公）：只看外面，一排窗
  P.push(box((H.x0 + H.x1) / 2, H.h + 4, (H.z0 + H.z1) / 2 - 1, H.x1 - H.x0 + 1, 20, H.z1 - H.z0 + 2, '#e1ddd2'))
  P.push(box((H.x0 + H.x1) / 2, H.h + 24, (H.z0 + H.z1) / 2 - 1, H.x1 - H.x0 + 2, 1.2, H.z1 - H.z0 + 3, '#bdb8ad'))
  for (let x = H.x0 + 6; x < H.x1 - 3; x += 9) P.push(box(x, H.h + 9, H.z1 + 0.05, 5.6, 9, 0.12, '#33454f'))
  return P
}
/** 室内的工作灯：跟着当前这一课从前上方打下来，只在室内的课亮 */
function Key({ x, on }: { x: number; on: boolean }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    l.position.set(cur.current - 4, HALL.h - 2, BZ + 14); aim.position.set(cur.current, TOP + 1, BZ); aim.updateMatrixWorld()
    l.intensity += ((on ? 240 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.5} penumbra={0.9} intensity={0} distance={60} decay={1.6} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}

/** 平铺的薄板：x0–x1、y0–y1、z0–z1，uv 按 k 个单位一格 */
export function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k: number) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); const [u, v] = ay > 0.5 ? [p.getX(i), p.getZ(i)] : ax > 0.5 ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)]; uv.setXY(i, u / k, v / k) }
  return g
}

/** 远处：煤气柜、烟囱、几排厂房和围墙，让厂区有纵深 */
function farParts() {
  const P: Part[] = [], r = rng(77)
  for (let i = 0; i < 16; i++) { const w = 60 + r() * 90, h = 40 + r() * 80, x = -500 + i * 150 + r() * 40, z = -1100 - r() * 300; P.push(box(x, 0, z, w, h, 70 + r() * 60, r() < 0.5 ? '#7f8486' : '#8c8a82')) }
  for (let i = 0; i < 5; i++) { const x = 1500 + r() * 400, z = -600 + i * 220; P.push(box(x, 0, z, 120, 60 + r() * 40, 100, '#a9adad')) }
  return P
}

export function World({ x = ST.l1, indoor = true }: Partial<Want>) {
  const tex = useMemo(() => ({
    ground: rep(asphaltTex(), 90, 90), road: rep(asphaltTex(), 60, 2), tile: rep(tileTex(), 1, 1), bench: benchTex(), wall: rep(wallTex(), 1, 1), clad: rep(cladTex(), 1, 1),
    name: makeSign(['理化检验中心'], '#2b5f86', '#ffffff', 768, 128),
    rules: makeBoard('化验室安全守则', ['进入化验室穿好实验服', '加热试管先预热', '点燃可燃性气体前先验纯', '酒精灯用灯帽盖灭', '实验后关好水电']),
  }), [])
  const geo = useMemo(() => {
    const H = HALL
    return {
      hall: mergeParts(hallParts()), bottles: bottles(), outside: mergeParts(buildingParts()), far: mergeParts(farParts()),
      floor: slab(H.x0, H.x1, 0, 0.12, H.z0, H.z1, 3.6), back: slab(H.x0, H.x1, 0, H.h, H.z0 - 0.6, H.z0, 7.2),
      ends: (() => { const a = slab(H.x0 - 0.6, H.x0, 0, H.h, H.z0, H.z1, 7.2), b = slab(H.x1, H.x1 + 0.6, 0, H.h, H.z0, H.z1, 7.2); return [a, b] })(),
      ceil: slab(H.x0, H.x1, H.h, H.h + 0.6, H.z0, H.z1, 12),
      top: slab(H.x0 + 2, H.x1 - 2, TOP - 0.3, TOP, BENCH.z0, BENCH.z1, 3),
    }
  }, [])
  return (
    <group>
      <hemisphereLight args={['#eef2f6', '#8a8276', indoor ? 0.75 : 0.35]} />
      <Key x={x} on={indoor} />
      {/* 地面：一大片沥青厂区；远处一圈草地 */}
      <mesh rotation-x={-Math.PI / 2} position={[600, -0.05, -200]} receiveShadow><planeGeometry args={[5000, 4000]} /><meshStandardMaterial map={tex.ground} color="#9a9894" roughness={0.95} /></mesh>
      {/* 厂区道路：一条东西向的主路（浅色混凝土，两道白线），化验楼门前一片混凝土场地 */}
      <mesh rotation-x={-Math.PI / 2} position={[700, 0.02, 100]} receiveShadow><planeGeometry args={[2400, 60]} /><meshStandardMaterial map={tex.road} color="#b5b2aa" roughness={0.92} /></mesh>
      {[-24, 24].map(z => <mesh key={z} rotation-x={-Math.PI / 2} position={[700, 0.04, 100 + z]}><planeGeometry args={[2400, 0.8]} /><meshStandardMaterial color="#a9a69c" roughness={0.9} /></mesh>)}
      <mesh rotation-x={-Math.PI / 2} position={[(HALL.x0 + HALL.x1) / 2, 0.03, 16]} receiveShadow><planeGeometry args={[HALL.x1 - HALL.x0 + 40, 24]} /><meshStandardMaterial map={tex.road} color="#c4c1b8" roughness={0.9} /></mesh>
      {/* 化验室 */}
      <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} roughness={0.35} /></mesh>
      <mesh geometry={geo.back} receiveShadow><meshStandardMaterial color="#eceeeb" roughness={0.9} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, 3.2, HALL.z0 + 0.02]}><planeGeometry args={[HALL.x1 - HALL.x0, 6.4]} /><meshStandardMaterial color="#c3cccc" roughness={0.7} /></mesh>
      {geo.ends.map((g, i) => <mesh key={i} geometry={g} receiveShadow castShadow><meshStandardMaterial map={tex.wall} roughness={0.9} /></mesh>)}
      <mesh geometry={geo.ceil}><meshStandardMaterial color="#dadad5" roughness={0.9} /></mesh>
      {[-126, -108, -90, -72, -54, -36, -18].flatMap(cx => [-12, -4].map(cz => <mesh key={`${cx}${cz}`} position={[cx, HALL.h - 0.05, cz]} rotation-x={Math.PI / 2}><planeGeometry args={[7, 3.4]} /><meshBasicMaterial color="#fff8ea" toneMapped={false} /></mesh>))}
      <mesh geometry={geo.hall} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>
      <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.bench} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, TOP - 0.15, BENCH.z1]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.15, 0.15, HALL.x1 - HALL.x0 - 4, 16]} /><meshPhysicalMaterial color="#5a6266" roughness={0.4} clearcoat={0.4} /></mesh>
      <mesh geometry={geo.bottles} castShadow><meshPhysicalMaterial vertexColors roughness={0.15} clearcoat={1} transparent opacity={0.9} /></mesh>
      {/* 吊柜的玻璃门 */}
      {[ST.l1, ST.l3, ST.l4, ST.l6, ST.l7].map(cx => <mesh key={cx} position={[cx, TOP + 6.75, HALL.z0 + 2.22]} renderOrder={3}><planeGeometry args={[12.4, 4]} /><meshPhysicalMaterial color="#20302f" transparent opacity={0.16} roughness={0.04} clearcoat={1} envMapIntensity={2} depthWrite={false} /></mesh>)}
      {/* 通风橱的玻璃门和里面的灯 */}
      <mesh position={[HOOD.x, (HOOD.sash + TOP + 10.1) / 2, HOOD.z1 + 0.14]} renderOrder={3}><planeGeometry args={[HOOD.w - 1.3, TOP + 10.1 - HOOD.sash]} /><meshPhysicalMaterial color="#cfe2e3" transparent opacity={0.12} roughness={0.03} clearcoat={1} envMapIntensity={2.2} depthWrite={false} /></mesh>
      <mesh position={[HOOD.x, TOP + 10.15, (HOOD.z0 + HOOD.z1) / 2]} rotation-x={Math.PI / 2}><planeGeometry args={[HOOD.w - 1.6, 1.6]} /><meshBasicMaterial color="#fff6e6" toneMapped={false} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, HALL.h - 1.6, HALL.z1 + 0.02]}><planeGeometry args={[24, 2.4]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
      <mesh position={[ST.l5 + 13, TOP + 6.6, HALL.z0 + 0.05]}><planeGeometry args={[4.2, 5.6]} /><meshStandardMaterial map={tex.rules} roughness={0.8} /></mesh>
      <mesh geometry={geo.outside} castShadow receiveShadow><Painted rough={0.85} metal={0} /></mesh>
      {/* 高炉区、轧钢车间、远景 */}
      <Plant />
      <Mill lit={x > 800} />
      <mesh geometry={geo.far} receiveShadow><Painted rough={0.9} metal={0.05} /></mesh>
      <Gasholder at={[-420, 0, -900]} />
      {[[-80, -980], [60, -1040]].map(([cx, cz]) => <Chimney key={cx} at={[cx, 0, cz]} h={110 * M / 3} />)}
    </group>
  )
}

/** 煤气柜：一座多边形的高柜子，外面一道道立柱和环梁 */
function Gasholder({ at }: { at: V3 }) {
  const g = useMemo(() => {
    const P: Part[] = [], R = 150, H = 380, n = 20
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; P.push({ p: [Math.cos(a) * R, H / 2, Math.sin(a) * R], s: [5, H, 5], c: '#8f9497', r: [0, -a, 0] }) }
    for (let y = 40; y < H; y += 60) for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2; P.push({ p: [Math.cos(a) * R, y, Math.sin(a) * R], s: [2 * R * Math.sin(Math.PI / n), 3, 3], c: '#8f9497', r: [0, -a + Math.PI / 2, 0] }) }
    return mergeParts(P)
  }, [])
  return <group position={at}>
    <mesh position-y={190}><cylinderGeometry args={[146, 146, 380, 20, 1]} /><meshStandardMaterial color="#9aa2a6" roughness={0.6} metalness={0.3} /></mesh>
    <mesh position-y={384}><cylinderGeometry args={[60, 148, 20, 20]} /><meshStandardMaterial color="#8a9296" roughness={0.6} metalness={0.3} /></mesh>
    <mesh geometry={g}><Painted rough={0.7} metal={0.3} /></mesh>
  </group>
}
/** 一根烟囱：红白相间的筒身 */
export function Chimney({ at, h, r = 12 }: { at: V3; h: number; r?: number }) {
  const bands = 7
  return <group position={at}>
    {Array.from({ length: bands }, (_, i) => <mesh key={i} position-y={h * (i + 0.5) / bands}><cylinderGeometry args={[r * (1 - (i + 1) / bands * 0.3), r * (1 - i / bands * 0.3), h / bands, 24]} /><meshStandardMaterial color={i % 2 ? '#e8e4dc' : '#b23a2c'} roughness={0.85} /></mesh>)}
  </group>
}
