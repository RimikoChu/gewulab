// 电路实验室的大场景：一套正在做水电改造的复式住宅，客厅挑空两层。
// 靠窗一张马凳搭的长工作台（第 1–4 课），屋子中间一张折叠工作台（第 5、6 课），楼梯口一张小工作台（第 7 课）；
// 右边是上二楼的混凝土楼梯和二楼的走廊（拓展：双控开关），前墙一排插座（拓展：插座并联）。墙上开着槽，槽里埋着红蓝两色的线管。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。1 m 画成 10 个单位，桌上的器材按厘米写，乘 CM。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, lathe, makeGround, mergeParts, shell, useConcrete, type Part } from '@/lab-kit'
import { makeFilm, makePlaster, makePly, makeText, rng } from './mats'

export const M = 10, CM = 0.1
export type V3 = [number, number, number]
/** 台面的高度（80 cm） */
export const TOP = 8
/** 房子：x、z 的范围，层高（挑空的客厅两层高），二楼楼板的高度 */
export const ROOM = { x0: -80, x1: 80, z0: -50, z1: 50, h: 60, floor2: 30 }
/** 楼梯：靠右墙，从前往后上到二楼 */
export const STAIR = { x0: 68, x1: 80, zBot: 38, zTop: -14, n: 17 }
/** 二楼的走廊（楼梯上来的平台）：x、z 范围 */
const GALLERY = { x0: 40, x1: 80, z0: -50, z1: -14 }

/** 各课的台子：位置（台面上这一课的中心）和朝向（yaw：器材的正面转到哪个方向；0 朝 +z） */
export const ST = {
  l1: { p: [-58, TOP, -43] as V3, yaw: 0 },
  l2: { p: [-36, TOP, -43] as V3, yaw: 0 },
  l3: { p: [-13, TOP, -43] as V3, yaw: 0 },
  l4: { p: [7, TOP, -43] as V3, yaw: 0 },
  l5: { p: [-34, TOP, -4] as V3, yaw: Math.PI / 2 },
  l6: { p: [-34, TOP, 16] as V3, yaw: Math.PI / 2 },
  l7: { p: [42, TOP, 14] as V3, yaw: -Math.PI / 2 },
}
export type StKey = keyof typeof ST

/** 拓展课的几样东西：楼下、楼上的开关，楼梯中段的壁灯；前墙的插座 */
export const STAIR_SW = { down: [79.8, 13, 41] as V3, up: [79.8, ROOM.floor2 + 13, -17] as V3, lamp: [79.6, 37, 12] as V3 }
/** 楼梯墙上埋线管的槽：两根联络线在这个高度横着走 */
const RUN_Y = 52
export const OUTLET = { x: 14, y: 3.2, z: 49.8, gap: 1.6 }

/** 机位：at 一张台子上的哪一处（厘米，台子的坐标），span 装进画面的宽和高（厘米），view 相对台子正面的方位角和仰角 */
function bench(at: StKey, local: V3, span: [number, number], view: [number, number]) {
  const s = ST[at], c = Math.cos(s.yaw), n = Math.sin(s.yaw), x = local[0] * CM, z = local[2] * CM
  const target = new THREE.Vector3(s.p[0] + x * c + z * n, s.p[1] + local[1] * CM, s.p[2] - x * n + z * c)
  // 工作灯在器材的左前上方
  const kx = -30 * CM, kz = 110 * CM
  const key: V3 = [s.p[0] + kx * c + kz * n, s.p[1] + 14, s.p[2] - kx * n + kz * c]
  return { target, span: [span[0] * CM, span[1] * CM] as [number, number], view: [s.yaw + view[0], view[1]] as [number, number], key, aim: target.toArray() as V3, fog: [400, 1400] as [number, number] }
}
const free = (t: V3, span: [number, number], view: [number, number], key: V3, light: { sun?: number; env?: number } = {}) => ({ target: new THREE.Vector3(...t), span, view, key, aim: t, fog: [500, 1600] as [number, number], ...light })
export const SPOT = {
  l1: bench('l1', [-2, 6, 1], [31, 13], [-0.12, 0.28]),
  l2: bench('l2', [-3.5, 7, 1], [38, 17], [0.14, 0.36]),
  l3: bench('l3', [-1, 8, 0], [37, 17], [-0.1, 0.24]),
  l4: bench('l4', [2, 10, -3], [50, 23], [-0.14, 0.42]),
  l5: bench('l5', [0, 9, -4], [40, 19], [-0.16, 0.28]),
  l6: bench('l6', [0, 10, -5], [52, 25], [0.14, 0.38]),
  l7: bench('l7', [-6, 9, 4], [70, 30], [-0.05, 0.46]),
  stairDown: free([78, 32, 26], [40, 44], [-1.42, 0.06], [56, 36, 30], { env: 0.85 }),
  stairUp: free([78, 45, -3], [40, 22], [-1.72, 0.08], [56, 54, 0], { env: 0.85 }),
  outlet: free([11, 3.5, 47], [18, 8], [Math.PI + 0.12, 0.2], [14, 18, 34], { env: 0.85, sun: 1.8 }),
  q: free([0, 18, 0], [170, 70], [-0.42, 0.42], [0, 40, 20], { env: 1.1, sun: 2.8 }),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给房子的要求：工作灯在哪；楼梯灯亮不亮、两个开关扳在哪；插座上插着什么 */
export interface Want { light: V3; aim: V3; stairLamp?: boolean; sw?: [0 | 1, 0 | 1]; plugs?: { lamp: boolean; kettle: boolean } }

// ---------- 拼墙用的小工具 ----------
/** 一面墙（只画朝里的一面）：从 (a) 到 (b) 横着走，高 h，holes 是窗洞或门洞（沿墙的距离 u0–u1、高度 v0–v1）。贴图按米铺 */
function wall(a: [number, number], b: [number, number], h: number, holes: [number, number, number, number][] = [], y0 = 0) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(len, 0), new THREE.Vector2(len, h), new THREE.Vector2(0, h)])
  for (const [u0, u1, v0, v1] of holes) s.holes.push(new THREE.Path([new THREE.Vector2(u0, v0), new THREE.Vector2(u0, v1), new THREE.Vector2(u1, v1), new THREE.Vector2(u1, v0)]))
  const g = new THREE.ShapeGeometry(s)
  const uv = g.attributes.uv, p = g.attributes.position
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 14, p.getY(i) / 14)
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
  g.rotateY(-ang); g.translate(a[0], y0, a[1])
  return g
}
/** 两点之间的一根杆（方或圆） */
const up = new THREE.Vector3(0, 1, 0), qa = new THREE.Quaternion(), ea = new THREE.Euler()
function strut(a: V3, b: V3, w: number, c: string, cyl = false): Part {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length()
  qa.setFromUnitVectors(up, d.normalize()); ea.setFromQuaternion(qa)
  return { p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: cyl ? [w / 2, len, w / 2] : [w, len, w], c, r: [ea.x, ea.y, ea.z], cyl }
}

// ---------- 工作台 ----------
/** 马凳：两副 A 字形的木腿，上面一根横木 */
function sawhorse(x: number, z: number, depth: number, P: Part[]) {
  const h = TOP - 0.36, wood = '#a9814f', dark = '#8d6a3f'
  P.push({ p: [x, h - 0.35, z], s: [0.9, 0.7, depth + 0.6], c: wood })
  for (const s of [-1, 1]) for (const e of [-1, 1]) P.push(strut([x + s * 0.3, h - 0.5, z + e * (depth / 2 - 0.2)], [x + s * 2.4, 0, z + e * (depth / 2 + 0.3)], 0.45, dark))
  for (const e of [-1, 1]) P.push({ p: [x, 2.4, z + e * (depth / 2 + 0.05)], s: [3.4, 0.4, 0.25], c: dark })
}
/** 折叠工作台：钢管的腿，交叉撑，上面一块板 */
function folding(cx: number, cz: number, lx: number, lz: number, P: Part[]) {
  const steel = '#3c4a55', h = TOP - 0.36
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push({ p: [cx + sx * (lx / 2 - 0.8), h / 2, cz + sz * (lz / 2 - 0.8)], s: [0.5, h, 0.5], c: steel })
  for (const sx of [-1, 1]) { P.push({ p: [cx + sx * (lx / 2 - 0.8), 1.6, cz], s: [0.35, 0.35, lz - 1.6], c: steel }); P.push(strut([cx + sx * (lx / 2 - 0.8), 1.6, cz - lz / 2 + 0.8], [cx + sx * (lx / 2 - 0.8), h - 0.6, cz + lz / 2 - 0.8], 0.3, steel)) }
  for (const sz of [-1, 1]) P.push({ p: [cx, h - 0.4, cz + sz * (lz / 2 - 0.8)], s: [lx - 1.2, 0.6, 0.4], c: steel })
  P.push({ p: [cx, 2.2, cz], s: [lx - 2, 0.2, lz - 2], c: '#56636c' })
}
/** 台面：一块多层板，贴图按世界位置铺 */
function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 12) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) / k : p.getY(i) / k)
  return g
}
const TOPS: [number, number, number, number][] = [
  [-72, -26, -47, -39],   // 长工作台西半张
  [-25, 21, -47, -39],    // 长工作台东半张
  [-38.5, -29.5, -12, 26], // 折叠工作台（沿 z 放）
  [37.5, 46.5, 4, 24],    // 楼梯口的小工作台
]

// ---------- 楼梯和二楼的走廊 ----------
function stairParts() {
  const P: Part[] = [], S = STAIR, run = (S.zBot - S.zTop) / S.n, rise = ROOM.floor2 / S.n, conc = '#a3a097'
  for (let i = 0; i < S.n; i++) {
    const z1 = S.zBot - i * run, y1 = (i + 1) * rise
    const h = y1                      // 踏步一直砌到地面：楼梯侧面是实心的
    P.push({ p: [(S.x0 + S.x1) / 2, y1 - h / 2, z1 - run / 2], s: [S.x1 - S.x0, h, run], c: i % 2 ? conc : '#a8a59c' })
    // 踏步的边：一道深一点的护角
    P.push({ p: [(S.x0 + S.x1) / 2, y1 - 0.08, z1 - 0.1], s: [S.x1 - S.x0, 0.16, 0.2], c: '#8e8b83' })
  }
  // 楼梯下面的斜板（梯段板）
  P.push(strut([S.x0 + 6, 0.8, S.zBot - 2], [S.x0 + 6, ROOM.floor2 - 2.2, S.zTop + 1], 2.4, '#9b988f'))
  // 扶手：一排钢立杆，顶上一根圆管
  for (let i = 0; i <= S.n; i += 2) { const z = S.zBot - i * run - run / 2, y = (i + 1) * rise; P.push({ p: [S.x0 + 0.5, y + 4.5, z], s: [0.35, 9, 0.35], c: '#2d3338' }) }
  P.push(strut([S.x0 + 0.5, rise + 9.2, S.zBot - run / 2], [S.x0 + 0.5, ROOM.floor2 + 9.2, S.zTop - run / 2], 0.7, '#2d3338', true))
  // 二楼走廊：楼板、楼板边的栏杆
  const G = GALLERY
  P.push({ p: [(G.x0 + G.x1) / 2, ROOM.floor2 - 1.2, (G.z0 + G.z1) / 2], s: [G.x1 - G.x0, 2.4, G.z1 - G.z0], c: '#a6a39a' })
  for (let x = G.x0 + 0.5; x <= S.x0; x += 3) P.push({ p: [x, ROOM.floor2 + 5, G.z1 - 0.5], s: [0.3, 10, 0.3], c: '#2d3338' })
  P.push({ p: [(G.x0 + S.x0) / 2, ROOM.floor2 + 10, G.z1 - 0.5], s: [S.x0 - G.x0, 0.5, 0.7], c: '#2d3338' })
  for (let z = G.z0 + 1; z <= G.z1; z += 3) P.push({ p: [G.x0 + 0.5, ROOM.floor2 + 5, z], s: [0.3, 10, 0.3], c: '#2d3338' })
  P.push({ p: [G.x0 + 0.5, ROOM.floor2 + 10, (G.z0 + G.z1) / 2], s: [0.7, 0.5, G.z1 - G.z0], c: '#2d3338' })
  return P
}

// ---------- 墙上的槽和线管、配电箱、窗框 ----------
const RED = '#c8402f', BLUE = '#2f62b0'
function conduitParts() {
  const P: Part[] = [], B = ROOM.z0 + 0.25
  // 后墙：几条从地面上来的竖槽，接到离地 30 cm 的插座底盒和离地 1.3 m 的开关底盒
  for (const [x, top, c] of [[-66, 3, RED], [-47, 13, BLUE], [-27, 3, RED], [-4, 13, BLUE], [26, 3, RED]] as [number, number, string][]) {
    P.push({ p: [x, ROOM.h / 2, B], s: [0.14, ROOM.h, 0.14], c, cyl: true })
    P.push({ p: [x, top, B + 0.05], s: [0.9, 0.9, 0.4], c: '#3b3f44' })
  }
  // 后墙顶上一条横槽
  P.push({ p: [-20, 40, B], s: [0.14, 100, 0.14], c: BLUE, r: [0, 0, Math.PI / 2], cyl: true })
  // 左墙的配电箱：一个灰色的铁箱，箱门开着，里面一排空气开关
  const L = ROOM.x0 + 0.3
  P.push({ p: [L + 0.6, 17, 8], s: [1.2, 3.6, 5], c: '#cfd2d2' })
  P.push({ p: [L + 1.25, 17, 8], s: [0.1, 3, 4.4], c: '#30353a' })
  for (let i = 0; i < 7; i++) P.push({ p: [L + 1.4, 17.4, 6.3 + i * 0.58], s: [0.4, 1.3, 0.5], c: i === 0 ? '#d9d7cf' : '#eeede7' }, { p: [L + 1.65, 17.6, 6.3 + i * 0.58], s: [0.2, 0.32, 0.2], c: i === 0 ? '#c33' : '#2a2d30' })
  P.push(strut([L + 1.2, 19.3, 10.6], [L + 1.2 + 4.5 * Math.sin(0.9), 19.3, 10.6 + 4.5 * Math.cos(0.9) - 4.5 + 4.5], 0.1, '#cfd2d2'))
  for (const [z, c] of [[6.6, RED], [7.6, BLUE], [8.6, RED], [9.4, BLUE]] as [number, string][]) P.push({ p: [L, 19 + (ROOM.h - 19) / 2, z], s: [0.14, ROOM.h - 19, 0.14], c, cyl: true })
  // 楼梯墙（右墙）：楼下开关、楼梯灯、楼上开关之间的线管。两根联络线（红、蓝）从楼下开关上去，在 RUN_Y 横着走到楼上开关；
  // 火线（红）从楼下开关往下进地面，楼上开关到灯一根（黄）
  const X = ROOM.x1 - 0.2, D = STAIR_SW.down, U = STAIR_SW.up, Lp = STAIR_SW.lamp, pipe = 0.13
  const run = (pts: [number, number][], c: string, dz = 0) => { for (let i = 0; i < pts.length - 1; i++) { const [z0, y0] = pts[i], [z1, y1] = pts[i + 1]; P.push(strut([X, y0, z0 + dz], [X, y1, z1 + dz], pipe * 2, c, true)); P.push(strut([X + 0.55, y0, z0 + dz], [X + 0.55, y1, z1 + dz], 0.75, '#77746c')) } }
  run([[D[2], D[1]], [D[2], RUN_Y], [U[2], RUN_Y], [U[2], U[1]]], RED, -0.35)
  run([[D[2], D[1]], [D[2], RUN_Y + 0.6], [U[2], RUN_Y + 0.6], [U[2], U[1]]], BLUE, 0.35)
  run([[D[2], D[1]], [D[2], 0]], RED)
  run([[U[2], U[1]], [U[2] + 3, U[1]], [U[2] + 3, RUN_Y - 3], [Lp[2], RUN_Y - 3], [Lp[2], Lp[1]]], '#d8b33a')
  for (const p of [D, U]) P.push({ p: [X + 0.3, p[1], p[2]], s: [0.3, 1.1, 1.1], c: '#3b3f44' })
  // 前墙：插座底下的横槽
  P.push({ p: [OUTLET.x - 14, 3.2, ROOM.z1 - 0.15], s: [0.14, 26, 0.14], c: RED, r: [0, 0, Math.PI / 2], cyl: true }, { p: [OUTLET.x - 29, ROOM.h / 2, ROOM.z1 - 0.25], s: [0.14, ROOM.h, 0.14], c: RED, cyl: true })
  return P
}
/** 后墙的窗洞：沿墙的位置（从西头量）和高度 */
const WINS: [number, number, number, number][] = [[10, 30, 17, 50], [62, 82, 17, 50], [114, 134, 17, 50]]
function windowParts() {
  const P: Part[] = [], z = ROOM.z0, f = '#8f969a'
  for (const [u0, u1, v0, v1] of WINS) {
    const x0 = ROOM.x0 + u0, x1 = ROOM.x0 + u1
    for (const x of [x0, x1, (x0 + x1) / 2]) P.push({ p: [x, (v0 + v1) / 2, z - 0.6], s: [0.6, v1 - v0, 1.2], c: f })
    for (const y of [v0, v1, 30]) P.push({ p: [(x0 + x1) / 2, y, z - 0.6], s: [x1 - x0, 0.6, 1.2], c: f })
    P.push({ p: [(x0 + x1) / 2, v0 - 0.3, z + 0.5], s: [x1 - x0 + 1.2, 0.6, 2], c: '#9a978f' })   // 窗台
  }
  return P
}

// ---------- 地上的东西：人字梯、电线盘、漆桶、线管、纸箱 ----------
function propParts() {
  const P: Part[] = [], r = rng(21)
  // 人字梯（铝合金），靠在左墙边，撑开着
  const lx = -72, lz = 26, lh = 18
  for (const s of [-1, 1]) for (const e of [-1, 1]) P.push(strut([lx + s * 0.1, lh, lz + e * 2.2], [lx + s * 4.2, 0, lz + e * 2.6], 0.5, '#c8cdd0'))
  for (let i = 1; i < 6; i++) { const k = i / 6, y = lh * (1 - k); for (const s of [-1, 1]) P.push({ p: [lx + s * 4.2 * k, y, lz], s: [0.7, 0.25, 4.6 + 0.4 * k], c: '#b9bec1' }) }
  P.push({ p: [lx, lh + 0.2, lz], s: [1.6, 0.4, 5.2], c: '#d5402b' })
  // 乳胶漆桶
  for (const [x, z, c] of [[-72, 40, '#d9d6cc'], [-68.4, 41.5, '#d3d0c6'], [-70, 37, '#cfccc2']] as [number, number, string][]) { P.push({ p: [x, 1.9, z], s: [1.6, 3.8, 1.6], c, cyl: true }); P.push({ p: [x, 3.85, z], s: [1.65, 0.15, 1.65], c: '#bdb9ae', cyl: true }) }
  // 一捆 PVC 线管（白色，3.8 m 长），横放在地上
  for (let i = 0; i < 9; i++) P.push({ p: [10 + (r() - 0.5) * 0.4, 0.42 + Math.floor(i / 4) * 0.4, 12 + (i % 4) * 0.42], s: [0.2, 38, 0.2], c: i % 3 ? '#e7e6e0' : '#dcdad2', r: [0, 0, Math.PI / 2], cyl: true })
  // 纸箱
  for (const [x, z, w, h, d] of [[-8, 44, 6, 5, 5], [-1.5, 45, 5, 4, 4], [-5, 44.5, 4.5, 3.6, 4]] as number[][]) P.push({ p: [x, (h) / 2 + (w === 4.5 ? 5 : 0), z], s: [w, h, d], c: r() < 0.5 ? '#b58c5a' : '#a98252' })
  return P
}
/** 一盘电线（BV 线）：一圈圈绕在纸芯上，平放在地上 */
function spool(x: number, z: number, color: string) {
  const gs: THREE.BufferGeometry[] = []
  for (let i = 0; i < 6; i++) { const t = new THREE.TorusGeometry(2.2 - i * 0.05, 0.42, 8, 36); t.rotateX(Math.PI / 2); t.translate(x, 0.42 + i * 0.5, z); gs.push(t) }
  const g = mergeGeometries(gs)
  return <mesh geometry={g} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.45} /></mesh>
}

// ---------- 灯 ----------
/** 屋顶吊下来的临时灯泡：一根花线吊着一只灯头和一只亮着的灯泡 */
function HangBulb({ at }: { at: V3 }) {
  const bulb = useMemo(() => lathe([[0, -1.8], [0.5, -1.7], [0.85, -1.1], [0.9, -0.6], [0.55, 0], [0.45, 0.4], [0, 0.45]], { segs: 32 }), [])
  return <group position={at}>
    <mesh position={[0, (ROOM.h - at[1]) / 2 + 1, 0]}><cylinderGeometry args={[0.08, 0.08, ROOM.h - at[1] - 2, 6]} /><meshStandardMaterial color="#222" /></mesh>
    <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.5, 0.45, 1.2, 16]} /><meshStandardMaterial color="#1a1a1a" roughness={0.4} /></mesh>
    <mesh geometry={bulb}><meshStandardMaterial color="#fff3d6" emissive="#ffd9a0" emissiveIntensity={2.4} toneMapped={false} /></mesh>
    <pointLight position={[0, -1, 0]} intensity={260} distance={90} decay={1.6} color="#ffe2b8" />
  </group>
}
/** 工作灯：三脚架上的一盏方形 LED 灯，跟着当前这一课从左前上方照过来 */
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
    <spotLight ref={light} target={target} angle={0.55} penumbra={0.9} intensity={360} distance={60} decay={1.5} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}

// ---------- 拓展课用到的：楼梯的开关和壁灯、前墙的插座和用电器 ----------
/** 墙上的翘板开关：一块白面板，中间一块翘板，on 时往上翘。朝 −x（贴在右墙上） */
function WallSwitch({ at, on }: { at: V3; on: 0 | 1 }) {
  return <group position={at} rotation-y={-Math.PI / 2}>
    <RoundedBox args={[0.86, 0.86, 0.12]} radius={0.04} smoothness={2} position={[0, 0, 0.06]} castShadow><meshPhysicalMaterial color="#f4f3ee" roughness={0.3} clearcoat={0.5} /></RoundedBox>
    <RoundedBox args={[0.5, 0.56, 0.1]} radius={0.03} smoothness={2} position={[0, 0, 0.15]} rotation-x={on ? -0.12 : 0.12}><meshPhysicalMaterial color="#fbfaf6" roughness={0.25} clearcoat={0.6} /></RoundedBox>
  </group>
}
function WallLamp({ at, on }: { at: V3; on: boolean }) {
  const glass = useMemo(() => shell([[0, 0], [0.9, 0], [1.1, 0.4], [1.1, 1.6], [0.9, 2.0]], 0.06, { segs: 32 }), [])
  return <group position={at} rotation-z={Math.PI / 2} scale={1.5}>
    <mesh position={[0, -0.1, 0]}><cylinderGeometry args={[0.7, 0.7, 0.2, 24]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    <mesh geometry={glass} position={[0, 0, 0]}><meshStandardMaterial color="#fffaf0" emissive="#ffd9a0" emissiveIntensity={on ? 2.2 : 0} transparent opacity={on ? 0.95 : 0.7} roughness={0.5} toneMapped={!on} /></mesh>
    {on && <pointLight position={[0, 1.4, 0]} intensity={120} distance={50} decay={1.5} color="#ffe2b8" />}
  </group>
}
/** 前墙的一排五孔插座（朝 −z），下面地上：一个木箱，上面一盏台灯、一只电热水壶。插着的那只插头连着线 */
function Outlets({ plugs }: { plugs: { lamp: boolean; kettle: boolean } }) {
  const { x, y, z, gap } = OUTLET, BX = -6.5
  const shade = useMemo(() => shell([[0.9, 0], [1.6, 0], [1.0, 1.5]].map(([r, h]) => [r, h]) as [number, number][], 0.05, { segs: 32 }), [])
  const kettle = useMemo(() => lathe([[0, 0], [1.05, 0], [1.1, 0.2], [1.0, 2.0], [0.7, 2.3], [0.2, 2.35], [0, 2.4]], { segs: 32 }), [])
  return <group>
    {[0, 1, 2].map(i => <group key={i} position={[x - gap + i * gap, y, z]} rotation-y={Math.PI}>
      <RoundedBox args={[0.86, 0.86, 0.12]} radius={0.04} smoothness={2} position={[0, 0, 0.06]} castShadow><meshPhysicalMaterial color="#f4f3ee" roughness={0.3} clearcoat={0.5} /></RoundedBox>
      {[[-0.14, 0.18], [0.14, 0.18], [0, -0.16]].map(([sx, sy], j) => <mesh key={j} position={[sx, sy, 0.125]}><boxGeometry args={[0.05, 0.14, 0.02]} /><meshStandardMaterial color="#222" /></mesh>)}
    </group>)}
    {/* 木箱 */}
    <RoundedBox args={[8, 1.8, 3.6]} radius={0.12} smoothness={2} position={[x + BX, 0.9, z - 3.2]} castShadow receiveShadow><meshStandardMaterial color="#b58c5a" roughness={0.8} /></RoundedBox>
    {/* 台灯：底座、弯杆、灯罩，开着时灯罩里亮 */}
    <group position={[x + BX - 2.2, 1.8, z - 3.2]}>
      <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.8, 0.9, 0.24, 28]} /><meshStandardMaterial color="#2b2e31" roughness={0.4} /></mesh>
      <mesh position={[0, 1.6, 0]} castShadow><cylinderGeometry args={[0.08, 0.08, 3, 10]} /><Metal kind="chrome" /></mesh>
      <mesh geometry={shade} position={[0, 2.4, 0]} castShadow><meshStandardMaterial color="#efe9dc" side={THREE.DoubleSide} emissive="#ffd9a0" emissiveIntensity={plugs.lamp ? 1.6 : 0} roughness={0.7} /></mesh>
      {plugs.lamp && <pointLight position={[0, 2.6, 0]} intensity={60} distance={20} decay={1.5} color="#ffe2b8" />}
    </group>
    {/* 电热水壶：亮着一圈蓝色的指示灯 */}
    <group position={[x + BX + 2.2, 1.8, z - 3.2]}>
      <mesh position={[0, 0.1, 0]} castShadow><cylinderGeometry args={[1.2, 1.25, 0.2, 32]} /><meshStandardMaterial color="#202326" roughness={0.4} /></mesh>
      <mesh geometry={kettle} position={[0, 0.2, 0]} castShadow><Metal kind="stainless" grain="brushed" /></mesh>
      <mesh position={[0, 0.32, 0]}><torusGeometry args={[1.08, 0.05, 6, 40]} /><meshStandardMaterial color="#5ac8ff" emissive="#5ac8ff" emissiveIntensity={plugs.kettle ? 3 : 0} toneMapped={!plugs.kettle} /></mesh>
      <mesh position={[0, 2.7, 0]}><cylinderGeometry args={[0.25, 0.3, 0.3, 16]} /><meshStandardMaterial color="#202326" /></mesh>
    </group>
    {/* 插头和电线：插着的从插座垂到箱子上的用电器 */}
    {([['lamp', -2.2, 0], ['kettle', 2.2, 1]] as const).map(([k, dx, slot]) => {
      const on = plugs[k], sx = x - gap + slot * gap
      const ax = x + BX + dx, plug: V3 = on ? [sx, y, z - 0.45] : [ax - 1.2, 0.35, z - 1.2]
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(plug[0], plug[1] - 0.3, plug[2] - 0.1), new THREE.Vector3(plug[0], 0.12, z - 1.0), new THREE.Vector3((plug[0] + ax) / 2, 0.12, z - 1.4), new THREE.Vector3(ax, 0.12, z - 1.3), new THREE.Vector3(ax, 1.9, z - 1.9)])
      return <group key={k}>
        <RoundedBox args={[0.6, 0.7, 0.7]} radius={0.08} smoothness={2} position={plug} castShadow><meshStandardMaterial color="#f2f1ec" roughness={0.4} /></RoundedBox>
        <mesh castShadow><tubeGeometry args={[curve, 40, 0.09, 6, false]} /><meshStandardMaterial color="#efeee8" roughness={0.5} /></mesh>
      </group>
    })}
  </group>
}

export function World({ light = SPOT.l1.key, aim = SPOT.l1.aim, stairLamp = false, sw = [0, 1], plugs = { lamp: false, kettle: false } }: Partial<Want>) {
  const [cd, cn, cr] = useConcrete(16, 10)
  const tex = useMemo(() => {
    const plaster = makePlaster(), ply = makePly(), film = makeFilm()
    const ground = makeGround('#7d7a6b', '96,92,80', '140,134,118'); ground.repeat.set(60, 60)
    return { plaster, ply, film, ground, sign: makeText(['水电改造中', '施工请佩戴安全帽'], { w: 512, h: 192, bg: '#e3b02b', fg: '#1f1f1f', size: 52 }) }
  }, [])
  const geo = useMemo(() => {
    const R = ROOM
    const walls = mergeGeometries([
      wall([R.x0, R.z0], [R.x1, R.z0], R.h, WINS),                  // 后墙（朝 +z）
      wall([R.x1, R.z1], [R.x0, R.z1], R.h),   // 前墙（朝 −z）
      wall([R.x0, R.z1], [R.x0, R.z0], R.h, [[22, 32, 0, 21]]),       // 左墙，开着门洞（朝 +x）
      wall([R.x1, R.z0], [R.x1, R.z1], R.h),                          // 右墙（朝 −x）
    ])
    const ceil = new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0); ceil.rotateX(Math.PI / 2); ceil.translate(0, R.h, 0)
    const tops = mergeGeometries(TOPS.map(([x0, x1, z0, z1]) => slab(x0, x1, TOP - 0.36, TOP, z0, z1)))
    const legs: Part[] = []
    for (const x of [-66, -32, -19, 15]) sawhorse(x, -43, 8, legs)
    folding(-34, 7, 9, 38, legs); folding(42, 14, 9, 20, legs)
    const glass = mergeGeometries(WINS.map(([u0, u1, v0, v1]) => { const g = new THREE.PlaneGeometry(u1 - u0, v1 - v0); g.translate(R.x0 + (u0 + u1) / 2, (v0 + v1) / 2, R.z0 - 0.6); return g }))
    // 窗外：远处几栋楼
    const r = rng(33), city: Part[] = []
    for (let i = 0; i < 14; i++) city.push({ p: [-260 + i * 40 + r() * 10, 0, -170 - r() * 120], s: [28 + r() * 16, 80 + r() * 160, 28], c: r() < 0.5 ? '#b9bcbd' : '#a8aeb2' })
    for (const c of city) c.p[1] = c.s[1] / 2
    return { walls, ceil, tops, legs: mergeParts(legs), stair: mergeParts(stairParts()), conduit: mergeParts(conduitParts()), win: mergeParts(windowParts()), props: mergeParts(propParts()), glass, city: mergeParts(city) }
  }, [])
  return (
    <group>
      <hemisphereLight args={['#e6ecf2', '#8a8274', 0.5]} />
      <Key at={light} aim={aim} />
      {/* 窗外：地面、远处的楼 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, -200]}><planeGeometry args={[900, 400]} /><meshStandardMaterial map={tex.ground} roughness={1} /></mesh>
      <mesh geometry={geo.city}><Painted rough={0.8} metal={0} /></mesh>
      {/* 水泥地坪 */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[ROOM.x1 - ROOM.x0, ROOM.z1 - ROOM.z0]} /><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#dcd8cc" /></mesh>
      {/* 墙和顶：只画朝里的一面，转到外面看不挡视线；墙不投影子 */}
      <mesh geometry={geo.walls} receiveShadow><meshStandardMaterial map={tex.plaster} roughness={0.95} /></mesh>
      <mesh geometry={geo.ceil}><meshStandardMaterial map={tex.plaster} color="#bdbab2" roughness={0.95} /></mesh>
      <mesh geometry={geo.win} castShadow receiveShadow><Painted rough={0.4} metal={0.6} /></mesh>
      <mesh geometry={geo.glass}><meshStandardMaterial map={tex.film} transparent opacity={0.55} roughness={0.1} metalness={0.2} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo.conduit} castShadow receiveShadow><Painted rough={0.45} metal={0.05} /></mesh>
      <mesh position={[-42, 22, ROOM.z0 + 0.2]}><planeGeometry args={[9, 3.4]} /><meshStandardMaterial map={tex.sign} roughness={0.7} /></mesh>
      {/* 工作台 */}
      <mesh geometry={geo.tops} castShadow receiveShadow><meshStandardMaterial map={tex.ply} roughness={0.7} /></mesh>
      <mesh geometry={geo.legs} castShadow receiveShadow><Painted rough={0.65} metal={0.2} /></mesh>
      {/* 楼梯、二楼走廊、地上的杂物 */}
      <mesh geometry={geo.stair} castShadow receiveShadow><Painted rough={0.9} metal={0.05} /></mesh>
      <mesh geometry={geo.props} castShadow receiveShadow><Painted rough={0.6} metal={0.15} /></mesh>
      {spool(-50, 34, RED)}{spool(-45, 36.5, BLUE)}{spool(-47.5, 31.5, '#d8c23a')}
      <HangBulb at={[-10, 42, 0]} />
      <HangBulb at={[18, 44, 42]} />
      <HangBulb at={[63, 46, 36]} />
      {/* 拓展课：楼梯的双控开关和壁灯，前墙的插座 */}
      <WallSwitch at={STAIR_SW.down} on={sw[0]} />
      <WallSwitch at={STAIR_SW.up} on={sw[1]} />
      <WallLamp at={STAIR_SW.lamp} on={stairLamp} />
      <Outlets plugs={plugs} />
    </group>
  )
}
