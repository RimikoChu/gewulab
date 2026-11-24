// 欧姆定律实验室的大场景：一间电子元件检测车间。钢结构厂房，门式钢架、屋架和檩条，高处一圈采光窗，屋顶吊着一行行条形灯；
// 灰绿色环氧地坪，黄色的通道线。后墙一排防静电工作台（第 1–3 课），车间中间一排岛式工作台（第 4–6 课），
// 东墙安全角一块安全用电示教板（第 7 课），西头一张质检台，背后是元件料盘架（拓展课）。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。1 m 画成 10 个单位，台上的器材按厘米写，乘 CM。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Painted, mergeParts, type Label, type Part } from '@/lab-kit'
import { makeEpoxy, makeEsdMat, makeEsdSign, makeFlow, makeLouver, makePanel, makeSign, rng } from './mats'
import type { V3 } from './gear'

export const M = 10, CM = 0.1
/** 工作台台面（台垫上表面）的高度：80 cm */
export const TOP = 8
/** 厂房：x、z 的范围，檐口高、屋脊高 */
export const HALL = { x0: -180, x1: 180, z0: -90, z1: 60, h: 70, ridge: 84 }
/** 工作台：长 1.8 m、深 0.75 m */
export const BENCH = { L: 18, D: 7.5 }

/** 工作台灯灯头的位置（台子坐标）：灯光就从这里照下来 */
export const LAMP = { x: -3.6, y: TOP + 6.4, z: 0.6 }
/** 各课的台子：台面上这一课的中心、朝向（yaw：器材的正面转到哪个方向；0 朝 +z） */
export const ST = {
  l1: { p: [-90, TOP, -80] as V3, yaw: 0 },
  l2: { p: [-30, TOP, -80] as V3, yaw: 0 },
  l3: { p: [30, TOP, -80] as V3, yaw: 0 },
  l4: { p: [-90, TOP, -25] as V3, yaw: 0 },
  l5: { p: [-30, TOP, -25] as V3, yaw: 0 },
  l6: { p: [30, TOP, -25] as V3, yaw: 0 },
  x: { p: [-162, TOP, -30] as V3, yaw: Math.PI / 2 },
}
export type StKey = keyof typeof ST
/** 第 7 课的安全用电示教板：挂在东墙上，板面中心、朝 −x */
export const BOARD7 = { x: HALL.x1 - 0.6, y: 16, z: -40 }

/** 台上的厘米坐标（以这张台子上这一课的中心为原点，前方 +z）换成场景坐标 */
export function toWorld(at: StKey, p: V3): V3 {
  const s = ST[at], c = Math.cos(s.yaw), n = Math.sin(s.yaw)
  const x = p[0] * CM, y = p[1] * CM, z = p[2] * CM
  return [s.p[0] + x * c + z * n, s.p[1] + y, s.p[2] - x * n + z * c]
}
/** 一张台子上的器材：里面一律按厘米写，原点在台面上、这一课的中心，前方 +z */
export function Bench({ at, children }: { at: StKey; children: ReactNode }) {
  const s = ST[at]
  return <group position={s.p} rotation-y={s.yaw}><group scale={CM}>{children}</group></group>
}

/** 机位：at 一张台子上的哪一处（厘米），span 装进画面的宽和高（厘米），view 相对台子正面的方位角和仰角 */
function bench(at: StKey, local: V3, span: [number, number], view: [number, number]) {
  const s = ST[at], target = new THREE.Vector3(...toWorld(at, local)), c = Math.cos(s.yaw), n = Math.sin(s.yaw)
  // 工作灯在器材的左前上方
  const kx = LAMP.x, kz = LAMP.z + 0.3
  const key: V3 = [s.p[0] + kx * c + kz * n, LAMP.y - 0.4, s.p[2] - kx * n + kz * c]
  return { target, span: [span[0] * CM, span[1] * CM] as [number, number], view: [s.yaw + view[0], view[1]] as [number, number], key, aim: target.toArray() as V3, fog: [400, 1500] as [number, number] }
}
const free = (t: V3, span: [number, number], view: [number, number], key: V3) => ({ target: new THREE.Vector3(...t), span, view, key, aim: t, fog: [600, 2000] as [number, number] })
export const SPOT = {
  // 第 1 课：整套电路，镜头压低一点、拉近，电源、两只电表、电阻、变阻器占满画面中间
  l1: bench('l1', [-5, 5, -6], [82, 33], [-0.06, 0.38]),
  // 第 2 课：主角是前面料盒里换用的三只电阻和接在电路里的那只
  l2: bench('l2', [-2, 3, 8], [64, 31], [0.2, 0.5]),
  // 第 3 课：可调电源和两只电表
  l3: bench('l3', [-6, 6, -2], [66, 32], [-0.12, 0.44]),
  // 第 4 课：待测电阻和它两旁的电表
  l4: bench('l4', [-4, 4, -14], [56, 26], [0.1, 0.46]),
  // 第 5 课：亮着的小灯泡，镜头最近
  l5: bench('l5', [-9, 5, -10], [46, 21], [-0.16, 0.34]),
  // 第 6 课：两只电阻的接法，从上方看清导线怎么连
  l6: bench('l6', [-3, 3, -6], [52, 25], [0.08, 0.6]),
  x: bench('x', [-10, 6, -2], [68, 31], [-0.06, 0.42]),
  xFuel: bench('x', [50, 10, -4], [60, 34], [0.12, 0.3]),
  l7: free([BOARD7.x - 1.5, BOARD7.y - 0.5, BOARD7.z], [13, 9], [-Math.PI / 2 + 0.16, 0.12], [BOARD7.x - 16, 26, BOARD7.z + 6]),
  // 随堂检测：在车间里面，从前墙高处往里俯视
  q: free([0, 6, -52], [74, 32], [-0.32, 0.42], [0, 50, -20]),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给车间的要求：工作灯从哪照向哪 */
export interface Want { light: V3; aim: V3 }
/** 这一课的舞台：选一处机位，交出器材和标签 */
export function Place({ at, labels, children = null }: { at: SpotKey; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  const w = useMemo<Want>(() => ({ light: v.key, aim: v.aim }), [v])
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={0.55} env={0.42} studio fog={v.fog} bloom={0.5} world={w}>{children}</LabStage>
}

// ---------- 拼厂房用的小工具 ----------
const up = new THREE.Vector3(0, 1, 0), qa = new THREE.Quaternion(), ea = new THREE.Euler()
/** 两点之间的一根杆（方或圆） */
function strut(a: V3, b: V3, w: number, c: string, cyl = false, d = w): Part {
  const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = v.length()
  qa.setFromUnitVectors(up, v.normalize()); ea.setFromQuaternion(qa)
  return { p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: cyl ? [w / 2, len, w / 2] : [w, len, d], c, r: [ea.x, ea.y, ea.z], cyl }
}
/** 一根竖着的 H 型钢柱：两块翼缘一块腹板，柱脚一块底板。翼缘沿 x 方向 */
function hColumn(x: number, z: number, h: number, P: Part[], c = '#5d6b78') {
  const W = 2.2, D = 4, t = 0.24
  P.push({ p: [x, h / 2, z - D / 2 + t / 2], s: [W, h, t], c }, { p: [x, h / 2, z + D / 2 - t / 2], s: [W, h, t], c }, { p: [x, h / 2, z], s: [t, h, D], c })
  P.push({ p: [x, 0.15, z], s: [W + 1.2, 0.3, D + 1.2], c: '#4b5560' })
}

// ---------- 厂房的钢结构和墙 ----------
const FRAMES = [-180, -120, -60, 0, 60, 120, 180]
const roofY = (z: number) => { const mid = (HALL.z0 + HALL.z1) / 2, half = (HALL.z1 - HALL.z0) / 2; return HALL.h + (HALL.ridge - HALL.h) * (1 - Math.abs(z - mid) / half) }
function steelParts() {
  const P: Part[] = [], H = HALL, mid = (H.z0 + H.z1) / 2
  for (const x of FRAMES) {
    hColumn(x, H.z0 + 2.2, H.h, P); hColumn(x, H.z1 - 2.2, H.h, P)
    // 斜梁：从柱顶到屋脊，变截面的 H 型钢
    for (const [z0, z1] of [[H.z0 + 2.2, mid], [H.z1 - 2.2, mid]] as [number, number][]) {
      P.push(strut([x, roofY(z0) - 2.4, z0], [x, roofY(z1) - 1.6, z1], 0.24, '#5d6b78', false, 3.6))
      P.push(strut([x, roofY(z0) - 0.4, z0], [x, roofY(z1) - 0.2, z1], 2.2, '#5d6b78', false, 0.24))
      P.push(strut([x, roofY(z0) - 4.4, z0], [x, roofY(z1) - 3.0, z1], 2.2, '#5d6b78', false, 0.24))
    }
    // 柱顶的牛腿和隅撑
    P.push(strut([x, H.h - 8, H.z0 + 4.2], [x, H.h - 3, H.z0 + 10], 0.5, '#5d6b78'), strut([x, H.h - 8, H.z1 - 4.2], [x, H.h - 3, H.z1 - 10], 0.5, '#5d6b78'))
  }
  // 檩条：顺着 x 走，C 型钢
  for (let k = 0; k <= 12; k++) {
    for (const s of [-1, 1]) {
      const z = mid + s * (k / 12) * ((H.z1 - H.z0) / 2 - 2)
      P.push({ p: [0, roofY(z) + 0.4, z], s: [H.x1 - H.x0, 1.6, 0.5], c: '#8a949b' })
    }
  }
  // 墙梁
  for (const y of [24, 40, 60]) { P.push({ p: [0, y, H.z0 + 0.6], s: [H.x1 - H.x0, 1.4, 0.5], c: '#8a949b' }); for (const x of [H.x0 + 0.6, H.x1 - 0.6]) P.push({ p: [x, y, (H.z0 + H.z1) / 2], s: [0.5, 1.4, H.z1 - H.z0], c: '#8a949b' }) }
  // 吊车梁下的一圈消防喷淋管（红色）
  P.push({ p: [0, H.h - 5, H.z0 + 8], s: [0.5, H.x1 - H.x0, 0.5], c: '#b8352a', r: [0, 0, Math.PI / 2], cyl: true })
  return P
}
/** 一面墙：从 a 横着走到 b，只画朝里的一面；holes 是窗洞（沿墙的距离 u0–u1、高度 v0–v1）。贴图按 tile 个单位铺一块 */
function wall(a: [number, number], b: [number, number], y0: number, y1: number, holes: [number, number, number, number][] = [], tile = 8) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), h = y1 - y0
  const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(len, 0), new THREE.Vector2(len, h), new THREE.Vector2(0, h)])
  for (const [u0, u1, v0, v1] of holes) s.holes.push(new THREE.Path([new THREE.Vector2(u0, v0 - y0), new THREE.Vector2(u0, v1 - y0), new THREE.Vector2(u1, v1 - y0), new THREE.Vector2(u1, v0 - y0)]))
  const g = new THREE.ShapeGeometry(s), uv = g.attributes.uv, p = g.attributes.position
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / tile, p.getY(i) / tile)
  g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0])); g.translate(a[0], y0, a[1])
  return g
}
/** 窗带：每一跨两扇，离地 4.4–5.8 m */
const WIN_Y: [number, number] = [44, 58]
const winHoles = (len: number) => { const out: [number, number, number, number][] = []; for (let u = 6; u + 22 <= len - 4; u += 30) out.push([u, u + 22, WIN_Y[0], WIN_Y[1]]); return out }

/** 一张防静电工作台的静止部分（台子自己的坐标，台面中心在 (0, TOP, 0)，前方 +z）：钢架、台面、抽屉柜、立柱、上层搁板、灯罩、插座条、挂板上的零件盒 */
function benchParts() {
  const P: Part[] = [], { L, D } = BENCH, frame = '#c3c8cb', h = TOP - 0.45
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    P.push({ p: [sx * (L / 2 - 0.5), h / 2 + 0.2, sz * (D / 2 - 0.45)], s: [0.45, h - 0.4, 0.45], c: frame })
    P.push({ p: [sx * (L / 2 - 0.5), 0.1, sz * (D / 2 - 0.45)], s: [0.34, 0.2, 0.34], c: '#303336', cyl: true })
  }
  for (const sx of [-1, 1]) P.push({ p: [sx * (L / 2 - 0.5), 1.4, 0], s: [0.36, 0.36, D - 0.9], c: frame })
  P.push({ p: [0, 1.4, -(D / 2 - 0.45)], s: [L - 1, 0.36, 0.36], c: frame })
  P.push({ p: [0, h - 0.35, D / 2 - 0.45], s: [L - 1, 0.5, 0.3], c: frame })
  // 台面板（灰色的贴面），前沿一条铝包边
  P.push({ p: [0, TOP - 0.25, 0], s: [L, 0.4, D], c: '#8e979c' })
  P.push({ p: [0, TOP - 0.24, D / 2 + 0.06], s: [L, 0.5, 0.12], c: '#b9bfc3' })
  // 抽屉柜：挂在台面下左边，三只抽屉，每只一道缝一只拉手
  const cx = -L / 2 + 3.2, ch = 4.6
  P.push({ p: [cx, TOP - 0.45 - ch / 2, 0], s: [4.6, ch, D - 1.2], c: '#d3d7d9' })
  for (let i = 0; i < 3; i++) { const y = TOP - 0.45 - 0.2 - i * 1.5; P.push({ p: [cx, y - 1.45, D / 2 - 0.58], s: [4.4, 0.06, 0.06], c: '#6e7478' }, { p: [cx, y - 0.6, D / 2 - 0.5], s: [1.6, 0.18, 0.2], c: '#7d8488' }) }
  // 立柱、上层搁板、灯罩、插座条
  for (const sx of [-1, 1]) P.push({ p: [sx * (L / 2 - 0.3), TOP + 5.6, -(D / 2 - 0.25)], s: [0.5, 11.2, 0.5], c: frame })
  P.push({ p: [0, TOP + 9.3, -(D / 2 - 1.75)], s: [L - 0.2, 0.22, 3], c: '#d0d4d6' }, { p: [0, TOP + 9.5, -(D / 2 - 3.2)], s: [L - 0.2, 0.6, 0.1], c: '#d0d4d6' })
  for (const sx of [-1, 1]) P.push(strut([sx * (L / 2 - 0.3), TOP + 7.6, -(D / 2 - 0.4)], [sx * (L / 2 - 0.3), TOP + 9.2, -(D / 2 - 2.9)], 0.22, frame))
  P.push({ p: [0, TOP + 8.95, -(D / 2 - 1.8)], s: [L - 3, 0.36, 0.9], c: '#2c3135' })
  P.push({ p: [0, TOP + 1.0, -(D / 2 - 0.42)], s: [L - 1.6, 0.9, 0.5], c: '#dfe2e3' })
  for (let i = 0; i < 6; i++) P.push({ p: [-6 + i * 2.4, TOP + 1.0, -(D / 2 - 0.69)], s: [0.8, 0.5, 0.04], c: '#3a3e42' })
  // 挂板上的零件盒：蓝色、红色的斜口盒
  const r = rng(13)
  for (let i = 0; i < 7; i++) {
    const x = -7 + i * 2.2 + (r() - 0.5) * 0.3, y = TOP + (i % 2 ? 6.6 : 4.4), z = -(D / 2 - 0.95), c = i % 3 === 1 ? '#d9584a' : '#4a86d6'
    // 斜口零件盒：后高前低，前面一块白色标签
    P.push({ p: [x, y, z], s: [1.7, 1.3, 1.1], c }, { p: [x, y + 0.75, z - 0.25], s: [1.7, 0.3, 0.6], c }, { p: [x, y + 0.1, z + 0.56], s: [0.9, 0.35, 0.03], c: '#f2f1ec' })
  }
  // 搁板上的几盒元件和一卷料盘
  for (let i = 0; i < 4; i++) P.push({ p: [-6 + i * 1.6, TOP + 9.75, -(D / 2 - 1.6)], s: [1.2, 0.7, 1.6], c: i % 2 ? '#d8d4c8' : '#e9e7e0' })
  P.push({ p: [5.5, TOP + 10.6, -(D / 2 - 1.7)], s: [1.6, 0.4, 1.6], c: '#1f2a36', r: [Math.PI / 2, 0, 0], cyl: true })
  // 夹在台子后沿的工作台灯：两节臂，灯头伸到台面左前上方
  const L0: V3 = [LAMP.x, TOP + 0.2, -(D / 2 - 0.4)], L1: V3 = [LAMP.x - 0.6, TOP + 7.2, -1.6]
  P.push({ p: [L0[0], TOP + 0.5, L0[2]], s: [1.0, 1.0, 0.9], c: '#2b2f33' })
  P.push(strut(L0, L1, 0.28, '#2b2f33'), strut(L1, [LAMP.x + 0.9, LAMP.y + 0.6, LAMP.z - 0.4], 0.24, '#2b2f33'))
  P.push({ p: L1, s: [0.45, 0.6, 0.45], c: '#1b1e21', cyl: true })
  return P
}
/** 西墙边的料盘架：蓝色立柱、橙色横梁，四层，每层排着一盘盘编带的元件 */
function rackParts() {
  const P: Part[] = [], x0 = HALL.x0 + 4, z0 = -60, r = rng(31)
  for (let b = 0; b < 4; b++) {
    const za = z0 + b * 16
    for (const z of [za, za + 16]) for (const dx of [0, 6]) P.push({ p: [x0 + dx, 13, z], s: [0.5, 26, 0.5], c: '#2f5fa0' })
    for (const y of [1, 7.5, 14, 20.5]) {
      for (const dx of [0, 6]) P.push({ p: [x0 + dx, y, za + 8], s: [0.4, 0.8, 16], c: '#e07a1f' })
      P.push({ p: [x0 + 3, y + 0.45, za + 8], s: [6, 0.1, 16], c: '#9aa1a6' })
      for (let i = 0; i < 9; i++) { const col = ['#1e2a36', '#2b5aa8', '#e8e6df', '#1e2a36'][Math.floor(r() * 4)]; P.push({ p: [x0 + 3, y + 0.5 + 1.75, za + 1 + i * 1.6 + r() * 0.2], s: [1.75, 0.5, 1.75], c: col, r: [Math.PI / 2, 0, 0], cyl: true }) }
    }
  }
  return P
}
/** 别的东西：东墙的配电柜、灭火器箱，车间中间的物料推车和几只防静电凳 */
function propParts() {
  const P: Part[] = [], H = HALL
  P.push({ p: [H.x1 - 2, 11, -12], s: [3.5, 22, 9], c: '#c9cccb' }, { p: [H.x1 - 3.8, 11, -12], s: [0.1, 20, 8.4], c: '#b6b9b8' }, { p: [H.x1 - 3.9, 13, -9], s: [0.2, 2, 0.5], c: '#444' })
  P.push({ p: [H.x1 - 1, 4, -60], s: [2, 8, 5], c: '#c23a2c' }, { p: [H.x1 - 2.05, 4.5, -60], s: [0.1, 5, 3.6], c: '#e5e3dc' })
  P.push({ p: [H.x0 + 1, 4, 10], s: [2, 8, 5], c: '#c23a2c' })
  // 物料推车：两层搁板，四只轮子
  for (const [cx, cz] of [[95, -58], [-130, 0]] as [number, number][]) {
    for (const y of [3, 8.5]) P.push({ p: [cx, y, cz], s: [9, 0.4, 5], c: '#cfd3d5' })
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { P.push({ p: [cx + sx * 4.2, 5.5, cz + sz * 2.2], s: [0.35, 9, 0.35], c: '#9aa1a6' }); P.push({ p: [cx + sx * 4.2, 0.6, cz + sz * 2.2], s: [0.6, 0.5, 0.6], c: '#222', r: [Math.PI / 2, 0, 0], cyl: true }) }
    for (let i = 0; i < 4; i++) P.push({ p: [cx - 3 + i * 2, 9.4, cz], s: [1.6, 1.4, 3.4], c: i % 2 ? '#2f63ad' : '#d8d4c8' })
  }
  // 防静电凳：推在每张工作台的一头，不挡器材
  for (const [x, z] of [[-90, -66], [-30, -66], [30, -66], [-90, -11], [-30, -11], [30, -11]] as [number, number][]) {
    const sx = x + 11
    P.push({ p: [sx, 5.4, z], s: [2.0, 0.6, 2.0], c: '#20262c', cyl: true }, { p: [sx, 2.8, z], s: [0.3, 4.6, 0.3], c: '#9aa1a6', cyl: true }, { p: [sx, 0.4, z], s: [1.9, 0.3, 1.9], c: '#2a2f34', cyl: true })
  }
  return P
}
/** 屋顶下吊着的条形灯：一行行，每只 1.2 m */
function lampGeo() {
  const gs: THREE.BufferGeometry[] = []
  for (const z of [-72, -42, -18, 12, 40]) for (let x = -165; x <= 165; x += 22) { const g = new THREE.BoxGeometry(12, 0.25, 0.8); g.translate(x, 60, z); gs.push(g) }
  return mergeGeometries(gs)
}
function lampHousing() {
  const P: Part[] = []
  for (const z of [-72, -42, -18, 12, 40]) for (let x = -165; x <= 165; x += 22) { P.push({ p: [x, 60.4, z], s: [12.4, 0.6, 1.2], c: '#d7dadb' }); for (const s of [-1, 1]) P.push({ p: [x + s * 5, (60.7 + roofY(z)) / 2, z], s: [0.04, roofY(z) - 60.7, 0.04], c: '#555' }) }
  return P
}

/** 工作灯：跟着当前这一课从左前上方照下来 */
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
    <spotLight ref={light} target={target} angle={0.75} penumbra={0.9} intensity={150} distance={45} decay={1.5} color="#ffdcae" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}

/** 一张工作台（静止部分合成一个模型，台垫、挂板、灯管单独画） */
function BenchModel({ p, yaw, geo, tex }: { p: V3; yaw: number; geo: THREE.BufferGeometry; tex: { mat: THREE.Texture; louver: THREE.Texture; sign: THREE.Texture } }) {
  const { L, D } = BENCH
  return <group position={[p[0], 0, p[2]]} rotation-y={yaw}>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.5} metal={0.25} /></mesh>
    <mesh position={[0, TOP - 0.025, 0]} receiveShadow><boxGeometry args={[L - 0.3, 0.05, D - 0.3]} /><meshStandardMaterial map={tex.mat} roughness={0.85} /></mesh>
    <mesh position={[0, TOP + 5.4, -(D / 2 - 0.35)]} receiveShadow><boxGeometry args={[L - 1.1, 7.6, 0.12]} /><meshStandardMaterial map={tex.louver} color="#6f777d" roughness={0.6} metalness={0.3} /></mesh>
    <mesh position={[0, TOP + 8.76, -(D / 2 - 1.8)]} rotation-x={Math.PI / 2}><planeGeometry args={[L - 3.4, 0.7]} /><meshBasicMaterial color="#cfc6b8" toneMapped={false} /></mesh>
    <mesh position={[L / 2 - 2.2, TOP + 3.4, -(D / 2 - 0.42)]}><planeGeometry args={[1.6, 2]} /><meshStandardMaterial map={tex.sign} roughness={0.7} /></mesh>
    {/* 台灯灯头：铝的灯罩，里面一圈暖光 */}
    <group position={[LAMP.x, LAMP.y, LAMP.z]} rotation-z={0.25}>
      <mesh castShadow><cylinderGeometry args={[0.55, 1.25, 1.2, 28, 1, true]} /><meshStandardMaterial color="#c8ccd0" metalness={0.8} roughness={0.35} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.56, 0.56, 0.1, 28]} /><meshStandardMaterial color="#2b2f33" /></mesh>
      <mesh position={[0, -0.45, 0]} rotation-x={Math.PI / 2}><circleGeometry args={[1.1, 28]} /><meshBasicMaterial color="#ffe2b8" toneMapped={false} side={THREE.DoubleSide} /></mesh>
    </group>
    {/* 台角的接地扣：一根黄绿色的接地线 */}
    <mesh position={[L / 2 - 0.8, TOP + 0.08, D / 2 - 0.7]}><cylinderGeometry args={[0.22, 0.22, 0.16, 16]} /><meshStandardMaterial color="#c9ccd0" metalness={1} roughness={0.3} /></mesh>
  </group>
}

export function World({ light = SPOT.l1.key, aim = SPOT.l1.aim }: Partial<Want>) {
  const tex = useMemo(() => {
    const floor = makeEpoxy().clone(); floor.repeat.set(36, 15); floor.needsUpdate = true
    const panel = makePanel('#8e979c').clone(); panel.repeat.set(1, 1); panel.needsUpdate = true
    const roof = makePanel('#c9cdcf').clone(); roof.needsUpdate = true
    const mat = makeEsdMat().clone(); mat.repeat.set(3, 1.3); mat.needsUpdate = true
    const louver = makeLouver().clone(); louver.repeat.set(5, 2.2); louver.needsUpdate = true
    return { floor, panel, roof, mat, louver, sign: makeEsdSign(),
      name: makeSign(['电子元件检测车间'], '#1f5c8a', '#ffffff', 1024, 160), flow: makeFlow(['来料', '外观检查', '阻值测试', '分选', '包装入库']),
      safe: makeSign(['安全用电'], '#2f8a4a', '#ffffff', 512, 160), qc: makeSign(['质检台'], '#1f5c8a', '#ffffff', 512, 160) }
  }, [])
  const geo = useMemo(() => {
    const H = HALL, mid = (H.z0 + H.z1) / 2
    // 彩钢板墙：窗带上下各一条，窗与窗之间是窗间墙（不用挖洞，拼成几条，三角化稳定）
    const strips = (a: [number, number], b: [number, number], wins: boolean) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len
      const at = (u: number): [number, number] => [a[0] + dx * u, a[1] + dz * u]
      if (!wins) return [wall(a, b, 12, H.h)]
      const out = [wall(a, b, 12, WIN_Y[0]), wall(a, b, WIN_Y[1], H.h)]
      let u = 0
      for (const [u0, u1] of winHoles(len)) { if (u0 > u) out.push(wall(at(u), at(u0), WIN_Y[0], WIN_Y[1])); u = u1 }
      out.push(wall(at(u), b, WIN_Y[0], WIN_Y[1]))
      return out
    }
    const panelWalls = mergeGeometries([
      ...strips([H.x0, H.z0], [H.x1, H.z0], true), ...strips([H.x1, H.z1], [H.x0, H.z1], true),
      ...strips([H.x0, H.z1], [H.x0, H.z0], false), ...strips([H.x1, H.z0], [H.x1, H.z1], false),
    ])
    const lowWalls = mergeGeometries([wall([H.x0, H.z0], [H.x1, H.z0], 0, 12, [], 40), wall([H.x1, H.z1], [H.x0, H.z1], 0, 12, [], 40), wall([H.x0, H.z1], [H.x0, H.z0], 0, 12, [], 40), wall([H.x1, H.z0], [H.x1, H.z1], 0, 12, [], 40)])
    // 山墙：屋檐到屋脊的三角
    const gable = (x: number, flip: boolean) => { const s = new THREE.Shape([new THREE.Vector2(H.z0, H.h), new THREE.Vector2(H.z1, H.h), new THREE.Vector2(mid, H.ridge)]); const g = new THREE.ShapeGeometry(s); g.rotateY(flip ? -Math.PI / 2 : Math.PI / 2); g.translate(x, 0, 0); return g }
    const roof = mergeGeometries([-1, 1].map(s => { const len = Math.hypot((H.z1 - H.z0) / 2, H.ridge - H.h), g = new THREE.PlaneGeometry(H.x1 - H.x0, len); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (H.x1 - H.x0) / 8, uv.getY(i) * 2); g.rotateX(Math.PI / 2 + s * Math.atan2(H.ridge - H.h, (H.z1 - H.z0) / 2)); g.rotateY(0); g.translate(0, (H.h + H.ridge) / 2 + 2, mid + s * (H.z1 - H.z0) / 4); return g }))
    const glass = mergeGeometries([H.z0 + 0.3, H.z1 - 0.3].flatMap(z => winHoles(H.x1 - H.x0).map(([u0, u1, v0, v1]) => { const g = new THREE.PlaneGeometry(u1 - u0, v1 - v0); if (z > 0) g.rotateY(Math.PI); g.translate(z > 0 ? H.x1 - (u0 + u1) / 2 : H.x0 + (u0 + u1) / 2, (v0 + v1) / 2, z - (z > 0 ? -0.2 : 0.2)); return g })))
    const mullions: Part[] = []
    for (const z of [H.z0 + 0.4, H.z1 - 0.4]) for (const [u0, u1] of winHoles(H.x1 - H.x0)) {
      const x0 = z > 0 ? H.x1 - u1 : H.x0 + u0, x1 = x0 + (u1 - u0)
      for (const x of [x0, (x0 + x1) / 2, x1]) mullions.push({ p: [x, (WIN_Y[0] + WIN_Y[1]) / 2, z], s: [0.5, WIN_Y[1] - WIN_Y[0], 0.6], c: '#5f686e' })
      for (const y of WIN_Y) mullions.push({ p: [(x0 + x1) / 2, y, z], s: [x1 - x0, 0.5, 0.6], c: '#5f686e' })
    }
    // 地上的黄色通道线
    const lines = mergeGeometries([...[-58, -46, -2, 8].map(z => { const g = new THREE.PlaneGeometry(H.x1 - H.x0 - 16, 0.9); g.rotateX(-Math.PI / 2); g.translate(0, 0.03, z); return g }),
      ...[-140, 140].map(x => { const g = new THREE.PlaneGeometry(0.9, 100); g.rotateX(-Math.PI / 2); g.translate(x, 0.03, -42); return g })])
    return { steel: mergeParts([...steelParts(), ...mullions]), panelWalls, lowWalls, gable: mergeGeometries([gable(H.x0, false), gable(H.x1, true)]), roof, glass, lines,
      bench: mergeParts(benchParts()), rack: mergeParts(rackParts()), props: mergeParts([...propParts(), ...lampHousing()]), lamps: lampGeo() }
  }, [])
  const benches: { p: V3; yaw: number }[] = [ST.l1, ST.l2, ST.l3, ST.l4, ST.l5, ST.l6, ST.x]
  return (
    <group>
      <hemisphereLight args={['#dfe6ec', '#55605a', 0.28]} />
      <Key at={light} aim={aim} />
      {/* 地坪、通道线 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, (HALL.z0 + HALL.z1) / 2]} receiveShadow><planeGeometry args={[HALL.x1 - HALL.x0, HALL.z1 - HALL.z0]} /><meshPhysicalMaterial map={tex.floor} roughness={0.32} clearcoat={0.5} clearcoatRoughness={0.4} /></mesh>
      <mesh geometry={geo.lines}><meshStandardMaterial color="#e3b21e" roughness={0.6} /></mesh>
      {/* 墙：下面一圈刷漆的砌块墙，上面是彩钢板，高处一圈窗 */}
      <mesh geometry={geo.lowWalls} receiveShadow><meshStandardMaterial color="#9aa29e" roughness={0.9} /></mesh>
      <mesh geometry={geo.panelWalls} receiveShadow><meshStandardMaterial map={tex.panel} roughness={0.6} metalness={0.2} /></mesh>
      <mesh geometry={geo.gable}><meshStandardMaterial map={tex.panel} roughness={0.6} metalness={0.2} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo.roof}><meshStandardMaterial map={tex.roof} roughness={0.7} metalness={0.2} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo.glass}><meshBasicMaterial color="#eef6ff" toneMapped={false} /></mesh>
      <mesh geometry={geo.steel} castShadow receiveShadow><Painted rough={0.55} metal={0.35} /></mesh>
      <mesh geometry={geo.lamps}><meshBasicMaterial color="#fffaf0" toneMapped={false} /></mesh>
      <mesh geometry={geo.props} castShadow receiveShadow><Painted rough={0.55} metal={0.2} /></mesh>
      <mesh geometry={geo.rack} castShadow receiveShadow><Painted rough={0.55} metal={0.2} /></mesh>
      {/* 后墙上的车间名、流程看板；东墙的安全用电牌；西头的质检台牌 */}
      <mesh position={[-30, 34, HALL.z0 + 0.15]}><planeGeometry args={[40, 6.25]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
      <mesh position={[60, 22, HALL.z0 + 0.15]}><planeGeometry args={[30, 5]} /><meshStandardMaterial map={tex.flow} roughness={0.7} /></mesh>
      <mesh position={[HALL.x1 - 0.15, 30, BOARD7.z]} rotation-y={-Math.PI / 2}><planeGeometry args={[12, 3.75]} /><meshStandardMaterial map={tex.safe} roughness={0.6} /></mesh>
      <mesh position={[HALL.x0 + 0.15, 30, -30]} rotation-y={Math.PI / 2}><planeGeometry args={[10, 3.1]} /><meshStandardMaterial map={tex.qc} roughness={0.6} /></mesh>
      {benches.map((b, i) => <BenchModel key={i} p={b.p} yaw={b.yaw} geo={geo.bench} tex={tex} />)}
    </group>
  )
}
