// 燃烧和灭火实验室的大场景：一处消防训练基地。西边是敞着门脸的科普实验厅，靠后墙一条长实验台，台上各课占一格（第 3 格是通风橱）；
// 厅外是室外训练场：混凝土场地上有燃烧箱、灭火实训台、灭火器训练区；东边是五层的训练塔、消防车和一片草坪，后面是消防站的车库。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。画面里 1 m 画成 M 个单位。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Metal, Painted, mergeParts, type Label, type Part } from '@/lab-kit'
import { FireTruck } from './truck'
import { dryGrassTex, brickTex, epoxyTex, grassTex, hazardTex, makeBoard, makeSign, posterTex, rng, tileTex, yardTex } from './mats'

export const M = 6, TOP = 0.85 * M      // 1 m 在画面里多长；实验台台面的高度
export type V3 = [number, number, number]

/** 实验厅：x 的范围、后墙和门脸的 z、层高；实验台的前后沿；器材摆在 z = BZ 这条线上 */
export const HALL = { x0: -86, x1: -4, z0: -18, z1: 4, h: 24 }
export const BENCH = { z0: -17.4, z1: -12.9 }
export const BZ = -15
/** 实验台上各格的中心（x）：每两根柱子之间一格 */
export const ST = { l1: -74, l2: -56, l3: -38, l7: -20 }
/** 室外训练场上的几处 */
export const YARD = { box: { x: 26, z: 12 }, gas: { x: 54, z: 12 }, oil: { x: 68, z: 12 }, wood5: { x: 82, z: 12 }, rack: { x: 122, z: 2 }, wood6: { x: 108, z: 14 }, oil6: { x: 124, z: 16 }, file: { x: 140, z: 14 }, tower: { x: 196, z: -26 }, lawn: { x: 262, z: -16 }, room: { x: 8, z: -42 } }

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], indoor: boolean, fog: [number, number] = [160, 900]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, indoor, fog })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  l1: spot(ST.l1 - 0.25, TOP + 0.6, BZ, 2.8, 1.5, [-0.14, 0.2], true),
  l2: spot(ST.l2 - 0.1, TOP + 0.48, BZ, 2.6, 1.4, [0.16, 0.16], true),
  l3: spot(ST.l3 + 0.1, TOP + 0.62, BZ + 0.2, 2.5, 1.45, [-0.2, 0.2], true),
  l7: spot(ST.l7 + 0.5, TOP + 0.62, BZ + 0.15, 2.8, 1.6, [0.12, 0.12], true),
  signs: spot(ST.l7 + 0.2, TOP + 6.1, HALL.z0 + 1, 11, 4.0, [0.02, 0.06], true),
  l4: spot(YARD.box.x, 4.4, YARD.box.z, 13, 8, [-0.3, 0.14], false),
  gas: spot(YARD.gas.x, 5.2, YARD.gas.z, 10, 7, [-0.18, 0.2], false),
  oil: spot(YARD.oil.x, 5.4, YARD.oil.z, 10, 7, [0.05, 0.22], false),
  wood5: spot(YARD.wood5.x, 4.6, YARD.wood5.z, 11, 7, [0.25, 0.18], false),
  wood6: spot(YARD.wood6.x - 3, 5.4, YARD.wood6.z, 16, 9, [-0.2, 0.16], false),
  oil6: spot(YARD.oil6.x - 3, 5.0, YARD.oil6.z, 16, 9, [0.0, 0.18], false),
  file: spot(YARD.file.x - 3, 6.2, YARD.file.z, 16, 9, [0.22, 0.14], false),
  break: spot(YARD.lawn.x - 2, 4, YARD.lawn.z, 54, 22, [0.5, 0.36], false),
  escape: spot(YARD.room.x, 7.5, YARD.room.z, 30, 13, [-0.05, 0.08], false),
  hose: spot(YARD.tower.x - 18, 26, YARD.tower.z + 8, 64, 46, [-0.42, 0.12], false, [300, 1400]),
  q: spot(84, 2, -8, 110, 30, [-0.16, 0.36], false, [420, 1500]),
}
export type SpotKey = keyof typeof SPOT
/** 每一课交给世界的要求：厅里的工作灯跟到哪；是不是在厅里 */
export interface Want { x: number; indoor: boolean }

/** 这一课的舞台：选一处机位。厅里的课点亮工作灯、换成摄影棚式的环境光；室外是傍晚的斜阳。暗一点、开泛光，火焰才亮得出来 */
export function Place({ at, labels, children = null }: { at: SpotKey; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, indoor: v.indoor }), [v])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={v.indoor ? 1.0 : 2.2} env={v.indoor ? 0.55 : 0.75} studio={v.indoor} fog={v.fog} bloom={0.7} world={want}>{children}</LabStage>
}

// ---------- 拼模型的小工具 ----------
/** 一块板，贴图按它在世界里的位置铺，k 是贴图一格多大 */
function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 6) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) / k : p.getY(i) / k)
  return g
}
const up = new THREE.Vector3(0, 1, 0), qa = new THREE.Quaternion(), ea = new THREE.Euler()
function strut(a: V3, b: V3, w: number, c: string, cyl = false): Part {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length()
  qa.setFromUnitVectors(up, d.normalize()); ea.setFromQuaternion(qa)
  return { p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: cyl ? [w / 2, len, w / 2] : [w, len, w], c, r: [ea.x, ea.y, ea.z], cyl }
}

// ---------- 科普实验厅 ----------
function hallParts() {
  const P: Part[] = [], H = HALL, B = BENCH
  // 柱子：白色的方柱，柱脚一圈深灰的踢脚
  for (const x of [-83, -65, -47, -29, -11]) { P.push({ p: [x, H.h / 2, H.z0 + 0.7], s: [1.4, H.h, 1.4], c: '#e4e2dc' }, { p: [x, 0.5, H.z0 + 0.7], s: [1.5, 1, 1.5], c: '#5b5f63' }) }
  for (const x of [-83, -47, -11]) P.push({ p: [x, H.h / 2, H.z1 - 0.8], s: [1.6, H.h, 1.6], c: '#e4e2dc' })
  // 门脸上方的一道梁和招牌底板
  P.push({ p: [(H.x0 + H.x1) / 2, H.h - 1.6, H.z1 - 0.8], s: [H.x1 - H.x0, 3.2, 1.6], c: '#d9d6ce' })
  // 实验台：一条长的柜体，柜门一扇扇，每扇一只拉手；台面下一道深色的收边
  for (let x = H.x0 + 2; x < H.x1 - 2; x += 4.5) {
    if (x > ST.l3 - 6 && x < ST.l3 + 6) continue        // 通风橱那一格另做
    P.push({ p: [x + 2.25, (TOP - 0.4) / 2 + 0.3, B.z1 - 0.12], s: [4.3, TOP - 0.9, 0.2], c: '#cfd2d0' })
    P.push({ p: [x + 2.25, TOP - 1.2, B.z1 + 0.04], s: [1.3, 0.16, 0.16], c: '#7b8085' })
  }
  P.push({ p: [(H.x0 + H.x1) / 2, 0.15, (B.z0 + B.z1) / 2], s: [H.x1 - H.x0 - 4, 0.3, B.z1 - B.z0 - 0.4], c: '#3d4146' })
  // 台面后面的挡水板和一条设备带（插座、气阀）
  P.push({ p: [(H.x0 + H.x1) / 2, TOP + 0.8, B.z0 + 0.12], s: [H.x1 - H.x0 - 4, 1.6, 0.24], c: '#2a2e32' })
  for (const x of [ST.l1, ST.l2, ST.l7]) for (const s of [-1, 1]) P.push({ p: [x + s * 5.4, TOP + 1.1, B.z0 + 0.3], s: [0.9, 0.6, 0.12], c: '#e8e6df' })
  // 墙上的试剂架：两层搁板
  for (const x of [ST.l1, ST.l2]) for (const y of [TOP + 5.4, TOP + 8.2]) P.push({ p: [x, y, H.z0 + 0.9], s: [12, 0.25, 1.6], c: '#b48a5a' })
  // 消火栓箱（红色，玻璃门）、一只挂墙的灭火器箱
  P.push({ p: [-8, 6, H.z0 + 0.5], s: [4.2, 6.4, 1.0], c: '#b3241c' })
  P.push({ p: [-62, 2.4, H.z0 + 0.8], s: [2.4, 4.4, 1.4], c: '#b3241c' })
  return P
}

/** 墙上试剂架上的瓶子：棕色的、透明的，大大小小 */
function bottles() {
  const gs: THREE.BufferGeometry[] = [], r = rng(17)
  for (const x0 of [ST.l1, ST.l2]) for (const y of [TOP + 5.53, TOP + 8.33]) for (let i = 0; i < 11; i++) {
    if (r() < 0.16) continue
    const rad = 0.24 + r() * 0.14, h = 0.9 + r() * 0.7, x = x0 - 5.4 + i * 1.05, z = HALL.z0 + 0.9 + (r() - 0.5) * 0.5
    const body = new THREE.CylinderGeometry(rad, rad, h, 14); body.translate(x, y + h / 2, z)
    const neck = new THREE.CylinderGeometry(rad * 0.45, rad * 0.55, h * 0.22, 12); neck.translate(x, y + h + h * 0.11, z)
    const cap = new THREE.CylinderGeometry(rad * 0.5, rad * 0.5, h * 0.12, 12); cap.translate(x, y + h * 1.28, z)
    const col = new THREE.Color(r() < 0.55 ? '#5a3214' : '#c7d6d8'), capC = new THREE.Color(r() < 0.5 ? '#1f2124' : '#d6d4cc')
    for (const [g, c] of [[body, col], [neck, col], [cap, capC]] as [THREE.BufferGeometry, THREE.Color][]) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) { a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); gs.push(g.toNonIndexed()) }
  }
  return mergeGeometries(gs)
}

/** 厅里的工作灯：跟着当前这一课从前上方打下来，只在厅里的课亮 */
function Key({ x, on }: { x: number; on: boolean }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    l.position.set(cur.current - 4, HALL.h - 2, BZ + 14); aim.position.set(cur.current, TOP + 1, BZ); aim.updateMatrixWorld()
    l.intensity += ((on ? 260 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.5} penumbra={0.9} intensity={0} distance={60} decay={1.6} color="#fff1dc" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}

// ---------- 训练场 ----------
/** 训练塔：五层的砖塔，每层朝场地两个窗洞，侧面一道室外钢梯，顶上一圈栏杆 */
const TW = { w: 30, d: 24, floor: 18, n: 5 }
function towerParts() {
  const P: Part[] = [], { x, z } = YARD.tower, top = TW.floor * TW.n
  // 楼板的混凝土边、窗洞的深色框
  for (let f = 1; f <= TW.n; f++) P.push({ p: [x, f * TW.floor - 0.4, z + TW.d / 2 + 0.2], s: [TW.w + 0.6, 0.8, 0.6], c: '#9b978e' })
  for (let f = 0; f < TW.n; f++) for (const dx of [-7, 7]) P.push({ p: [x + dx, f * TW.floor + 8.5, z + TW.d / 2 + 0.05], s: [7, 9, 0.3], c: '#151515' })
  // 钢梯：沿着东侧墙，一跑一跑地往上
  const sx = x + TW.w / 2 + 3
  for (let f = 0; f < TW.n; f++) {
    const y0 = f * TW.floor
    P.push(strut([sx, y0, z + TW.d / 2 - 2], [sx, y0 + TW.floor, z - TW.d / 2 + 2], 0.5, '#7b2a22'))
    P.push({ p: [sx, y0 + TW.floor - 0.2, z], s: [5, 0.3, TW.d - 2], c: '#6b6f73' })
    for (const s of [-1, 1]) P.push({ p: [sx + s * 2.5, y0 + TW.floor + 2, z], s: [0.2, 4, TW.d - 2], c: '#a6301f' })
  }
  for (const zz of [z - TW.d / 2 + 2, z + TW.d / 2 - 2]) P.push({ p: [sx + 2.5, top / 2, zz], s: [0.5, top, 0.5], c: '#6b6f73' }, { p: [sx - 2.5, top / 2, zz], s: [0.5, top, 0.5], c: '#6b6f73' })
  // 屋顶的栏杆
  for (let i = -TW.w / 2; i <= TW.w / 2; i += 3) P.push({ p: [x + i, top + 2, z + TW.d / 2 - 0.2], s: [0.25, 4, 0.25], c: '#a6301f' })
  P.push({ p: [x, top + 4, z + TW.d / 2 - 0.2], s: [TW.w, 0.3, 0.3], c: '#a6301f' })
  return P
}
/** 消防站的车库：一排红色卷帘门，二层是值班室的窗；楼顶一块牌子 */
function stationParts() {
  const P: Part[] = [], x0 = 60, x1 = 200, z = -80
  P.push({ p: [(x0 + x1) / 2, 18, z], s: [x1 - x0, 36, 24], c: '#d9d5cb' })
  for (let i = 0; i < 6; i++) { const x = x0 + 14 + i * 22; P.push({ p: [x, 9, z + 12.1], s: [17, 17, 0.3], c: '#b3241c' }); P.push({ p: [x, 27, z + 12.1], s: [15, 6, 0.3], c: '#2c3e4e' }) }
  P.push({ p: [(x0 + x1) / 2, 36.6, z + 11.5], s: [x1 - x0 + 1, 1.2, 1.4], c: '#b3241c' })
  return P
}
/** 场地四周的围墙和远处的一排楼 */
function fenceParts() {
  const P: Part[] = []
  for (let x = -120; x <= 280; x += 12) { P.push({ p: [x, 5, -130], s: [1.2, 10, 1.2], c: '#b9b4a8' }) }
  P.push({ p: [80, 4.5, -130], s: [400, 9, 0.6], c: '#cfcabe' })
  const r = rng(77)
  for (let i = 0; i < 16; i++) { const w = 40 + r() * 30, h = 60 + r() * 120; P.push({ p: [-260 + i * 52, h / 2, -300 - r() * 120], s: [w, h, 40], c: r() < 0.5 ? '#a9aeb2' : '#bdb8ae' }) }
  return P
}
/** 训练场上的配景：一排锥桶、一摞轮胎、水带卷、一只消火栓 */
function yardParts() {
  const P: Part[] = []
  for (let i = 0; i < 6; i++) { const x = 10 + i * 6; P.push({ p: [x, 0.08, 34], s: [2, 0.16, 2], c: '#2b2b2b' }, { p: [x, 1.6, 34], s: [0.5, 3, 0.5], c: '#e0542a', cyl: true }) }
  for (let i = 0; i < 4; i++) P.push({ p: [150, 0.9 + i * 1.7, 30], s: [3.6, 1.6, 3.6], c: '#1c1d1e', cyl: true })
  // 地上的消火栓：红色的立柱、两个出水口
  P.push({ p: [96, 2.4, -14], s: [0.9, 4.8, 0.9], c: '#c3281f', cyl: true }, { p: [96, 5, -14], s: [1.1, 0.6, 1.1], c: '#c3281f', cyl: true })
  for (const s of [-1, 1]) P.push({ p: [96 + s * 0.9, 3.2, -14], s: [0.42, 1.0, 0.42], c: '#9a1e18', r: [0, 0, Math.PI / 2], cyl: true })
  return P
}

export function World({ x = ST.l3, indoor = true }: Partial<Want>) {
  const tex = useMemo(() => {
    const yard = yardTex().clone(); yard.repeat.set(24, 20); yard.needsUpdate = true
    const grass = grassTex().clone(); grass.repeat.set(60, 60); grass.needsUpdate = true
    const tile = tileTex().clone(); tile.repeat.set(1, 1); tile.needsUpdate = true
    const brick = brickTex().clone(); brick.repeat.set(1, 1); brick.needsUpdate = true
    return { yard, grass, tile, brick, dry: dryGrassTex(), epoxy: epoxyTex(), hazard: hazardTex(), poster: posterTex(),
      name: makeSign(['消防科普实验厅'], '#b3241c', '#ffffff', 768, 128), station: makeSign(['消防训练基地'], '#b3241c', '#ffffff', 768, 128),
      rules: makeBoard('实验室规则', ['进入实验室穿好实验服', '取用药品不用手直接接触', '酒精灯用灯帽盖灭', '不用嘴吹灭酒精灯', '实验后关好水电气']), drill: makeBoard('训练须知', ['听从教官的口令', '穿戴好防护装备', '灭火时站在上风方向', '对准火焰根部喷射', '训练后检查余火']) }
  }, [])
  const geo = useMemo(() => {
    const H = HALL
    const hall = mergeParts(hallParts()), tower = mergeParts(towerParts()), station = mergeParts(stationParts()), fence = mergeParts(fenceParts()), yard = mergeParts(yardParts())
    // 厅的地面、后墙（下半截一道墙裙）、两头的墙、吊顶
    const floor = slab(H.x0, H.x1, 0, 0.12, H.z0, H.z1, 3.6)
    const back = slab(H.x0, H.x1, 0, H.h, H.z0 - 0.6, H.z0, 12), ends = mergeGeometries([slab(H.x0 - 0.6, H.x0, 0, H.h, H.z0, H.z1, 12), slab(H.x1, H.x1 + 0.6, 0, H.h, H.z0, H.z1, 12)])
    const ceil = slab(H.x0, H.x1, H.h, H.h + 0.6, H.z0, H.z1, 12)
    const top = slab(H.x0 + 2, H.x1 - 2, TOP - 0.3, TOP, BENCH.z0, BENCH.z1, 3)
    // 训练塔的四面墙（朝场地的一面留着窗洞）
    const { x: tx, z: tz } = YARD.tower, walls: THREE.BufferGeometry[] = [], top5 = TW.floor * TW.n
    walls.push(slab(tx - TW.w / 2, tx + TW.w / 2, 0, top5, tz - TW.d / 2, tz - TW.d / 2 + 0.8, 8))
    for (const ex of [tx - TW.w / 2, tx + TW.w / 2 - 0.8]) walls.push(slab(ex, ex + 0.8, 0, top5, tz - TW.d / 2, tz + TW.d / 2, 8))
    for (let f = 0; f < TW.n; f++) { const y0 = f * TW.floor
      walls.push(slab(tx - TW.w / 2, tx + TW.w / 2, y0, y0 + 4, tz + TW.d / 2 - 0.8, tz + TW.d / 2, 8), slab(tx - TW.w / 2, tx + TW.w / 2, y0 + 13, y0 + TW.floor, tz + TW.d / 2 - 0.8, tz + TW.d / 2, 8))
      for (const [a, b] of [[-TW.w / 2, -10.5], [-3.5, 3.5], [10.5, TW.w / 2]]) walls.push(slab(tx + a, tx + b, y0 + 4, y0 + 13, tz + TW.d / 2 - 0.8, tz + TW.d / 2, 8))
    }
    return { hall, tower, station, fence, yard, floor, back, ends, ceil, top, walls: mergeGeometries(walls), bottles: bottles() }
  }, [])
  return (
    <group>
      <hemisphereLight args={['#dfe7f0', '#7d7466', indoor ? 0.5 : 0.28]} />
      <Key x={x} on={indoor} />
      {/* 地面：远处是草地，训练场是一大块混凝土地，场上画着黄色的停车线和白色的训练区边线 */}
      <mesh rotation-x={-Math.PI / 2} position={[60, -0.05, -40]} receiveShadow><planeGeometry args={[1800, 1400]} /><meshStandardMaterial map={tex.grass} roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[100, 0.01, -20]} receiveShadow><planeGeometry args={[260, 200]} /><meshStandardMaterial map={tex.yard} roughness={0.92} /></mesh>
      {[[0, 8, 150, 0.6], [0, 36, 150, 0.6], [92, 22, 0.6, 28]].map(([x0, z, w, d], i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[x0 + (w > 1 ? 75 + 2 : 0), 0.03, z]}><planeGeometry args={[w, d]} /><meshStandardMaterial color="#e9e6dc" roughness={0.8} /></mesh>)}
      {/* 训练塔东边的一片枯草地（拓展课“隔离带”烧的就是它）：比实际的草场多出一圈，边上淡进周围的绿草地 */}
      <mesh rotation-x={-Math.PI / 2} position={[YARD.lawn.x, 0.04, YARD.lawn.z]} receiveShadow><planeGeometry args={[76, 48]} /><meshStandardMaterial map={tex.dry} transparent depthWrite={false} roughness={1} /></mesh>
      {/* 科普实验厅 */}
      <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} roughness={0.35} /></mesh>
      <mesh geometry={geo.back} receiveShadow><meshStandardMaterial color="#ecebe6" roughness={0.9} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, 3.2, HALL.z0 + 0.02]}><planeGeometry args={[HALL.x1 - HALL.x0, 6.4]} /><meshStandardMaterial color="#b7c2c4" roughness={0.7} /></mesh>
      <mesh geometry={geo.ends} receiveShadow><meshStandardMaterial color="#e6e4de" roughness={0.9} /></mesh>
      <mesh geometry={geo.ceil}><meshStandardMaterial color="#d9d8d3" roughness={0.9} /></mesh>
      {/* 吊顶上的平板灯 */}
      {[-76, -58, -40, -22].flatMap(cx => [-12, -4].map(cz => <mesh key={`${cx}${cz}`} position={[cx, HALL.h - 0.05, cz]} rotation-x={Math.PI / 2}><planeGeometry args={[7, 3.6]} /><meshBasicMaterial color="#fff8ea" toneMapped={false} /></mesh>))}
      <mesh geometry={geo.hall} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>
      <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.epoxy} roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.4} /></mesh>
      {/* 台面前沿的圆角：一道略亮的圆边，看得出台面有厚度、边上倒过角 */}
      <mesh position={[(HALL.x0 + HALL.x1) / 2, TOP - 0.15, BENCH.z1]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.15, 0.15, HALL.x1 - HALL.x0 - 4, 16]} /><meshPhysicalMaterial color="#555c61" roughness={0.38} clearcoat={0.4} /></mesh>
      <mesh geometry={geo.bottles} castShadow><meshPhysicalMaterial vertexColors roughness={0.15} clearcoat={1} transparent opacity={0.88} /></mesh>
      <mesh position={[(HALL.x0 + HALL.x1) / 2, HALL.h - 1.6, HALL.z1 + 0.02]}><planeGeometry args={[22, 2.4]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
      <mesh position={[-29 + 8, TOP + 12.2, HALL.z0 + 0.05]}><planeGeometry args={[9.6, 5.6]} /><meshStandardMaterial map={tex.poster} roughness={0.8} /></mesh>
      <mesh position={[ST.l1 - 4, TOP + 12.2, HALL.z0 + 0.05]}><planeGeometry args={[4.2, 5.6]} /><meshStandardMaterial map={tex.rules} roughness={0.8} /></mesh>
      <mesh position={[-8, 6, HALL.z0 + 1.02]}><planeGeometry args={[3.4, 5.6]} /><meshPhysicalMaterial color="#9fb6c0" transparent opacity={0.35} roughness={0.05} clearcoat={1} /></mesh>
      {/* 训练塔、消防车、车库、围墙 */}
      <mesh geometry={geo.walls} castShadow receiveShadow><meshStandardMaterial map={tex.brick} roughness={0.92} /></mesh>
      <mesh geometry={geo.tower} castShadow receiveShadow><Painted rough={0.7} metal={0.2} /></mesh>
      <group position={[150, 0, -6]}><FireTruck /></group>
      <mesh geometry={geo.station} castShadow receiveShadow><Painted rough={0.8} metal={0.05} /></mesh>
      <mesh position={[130, 33, -67.6]}><planeGeometry args={[44, 7.3]} /><meshStandardMaterial map={tex.station} roughness={0.6} /></mesh>
      <mesh geometry={geo.fence} receiveShadow><Painted rough={0.9} metal={0} /></mesh>
      <mesh geometry={geo.yard} castShadow receiveShadow><Painted rough={0.6} metal={0.1} /></mesh>
      <mesh position={[112, 4.4, -20]} castShadow><boxGeometry args={[5, 6.4, 0.3]} /><meshStandardMaterial color="#444" /></mesh>
      <mesh position={[112, 4.4, -19.84]}><planeGeometry args={[4.6, 6]} /><meshStandardMaterial map={tex.drill} roughness={0.8} /></mesh>
      {[[112, 0, -20.1, 0.3]].map(([px, , pz]) => <mesh key={px} position={[px, 0.7, pz]}><boxGeometry args={[4.6, 1.4, 0.2]} /><meshStandardMaterial map={tex.hazard} /></mesh>)}
      {/* 旗杆 */}
      <mesh position={[0, 30, 50]} castShadow><cylinderGeometry args={[0.18, 0.26, 60, 12]} /><Metal kind="stainless" grain="brushed" /></mesh>
    </group>
  )
}

