// 简单机械实验室的大场景：一处建筑工地。左边是一长排敞着门脸的工棚，棚里靠后墙一长条实验台，杠杆尺和滑轮的实验在台上各占一格；
// 棚外是材料场（砖垛、钢筋、沙堆、手推车），后面是一栋搭着脚手架的在建楼，楼旁一台塔吊，四周一圈蓝色围挡，远处是城里的楼。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。画面里 1 cm 画成 U 个单位，1 m 是 M 个单位，棚里和工地是同一个比例。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Painted, mergeParts, type Part } from '@/lab-kit'
import { CRANE } from './physics'
import { makeBoard, makeBrick, makeConcrete, makeGravel, makeHoarding, makeNet, makeSand, makeSign, makeSteelSheet, makeWindows, makeWood, rng } from './mats'

export const U = 0.06, M = 6, TOP = 5.1      // 1 cm、1 m 在画面里多长；实验台台面的高度（85 cm）
export type V3 = [number, number, number]

/** 工棚：x 的范围、后墙和门脸的 z、前后檐的高度；实验台的范围；器材摆在 z = BZ 这条线上 */
export const SHED = { x0: -180, x1: 0, z0: -16, z1: 2, hb: 21.6, hf: 18.6 }
export const BENCH = { x0: -178.5, x1: -1.5, z0: -15.6, z1: -10.6 }
export const BZ = -12.6
/** 实验台上各课的位置（x）：每两根柱子之间一格 */
export const ST = { l2: -168, l3: -144, bal: -120, l5: -96, l6: -72, l7: -48, inc: -24 }
/** 棚外的几处：撬棍、沙堆旁的手推车和铁锹、脚手架上的绞车 */
export const YARD = { crow: { x: 36, z: 16 }, barrow: { x: 66, z: 16 }, shovel: { x: 96, z: 18 }, winch: { x: 62, z: -55.6 } }
/** 在建楼的范围（x、z）和每层的层高；脚手架两排立杆的 z */
const BLD = { x0: 30, x1: 150, z0: -110, z1: -62, floor: 18, n: 5 }, SCAF = { zi: -59, zo: -52.6, x0: 26, x1: 154, top: 98 }
/** 塔吊：塔身中心、塔身高度、起重臂和平衡臂的长度（画面单位） */
export const TC = { x: 175, z: -86, h: 180, jib: CRANE.jib * M, cjib: 72, w: 4.8 }
/** 小车离塔身中心 r 米时，吊钩在画面里的 x */
export const trolleyX = (r: number) => TC.x - r * M

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number], indoor: boolean, fog: [number, number] = [160, 900]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view, indoor, fog })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  l1: spot(YARD.crow.x + 2.2, 0.9, YARD.crow.z, 9.4, 4.6, [-0.1, 0.1], false),
  l2: spot(ST.l2 + 0.5, TOP + 2.2, BZ, 5.8, 3.5, [-0.1, 0.12], true),
  l3: spot(ST.l3 - 0.8, TOP + 2.6, BZ, 6.6, 5.2, [0.16, 0.1], true),
  barrow: spot(YARD.barrow.x + 4.0, 1.9, YARD.barrow.z, 12.4, 5.0, [-0.3, 0.2], false),
  shovel: spot(YARD.shovel.x + 3.1, 5.3, YARD.shovel.z, 8.2, 3.2, [0.18, 0.14], false),
  bal: spot(ST.bal, TOP + 0.95, BZ + 0.4, 3.0, 1.9, [-0.2, 0.24], true),
  l5: spot(ST.l5 + 0.2, TOP + 3.6, BZ, 6.0, 7.0, [-0.12, 0.06], true),
  l6: spot(ST.l6 + 0.1, TOP + 3.75, BZ, 7.4, 7.3, [0.08, 0.06], true),
  l7: spot(ST.l7 + 0.7, TOP + 4.0, BZ, 6.2, 7.9, [-0.18, 0.07], true),
  crane: spot(TC.x - 34, 120, TC.z, 290, 236, [-0.08, 0.1], false, [420, 1500]),
  winch: spot(YARD.winch.x + 0.8, 9.4, YARD.winch.z + 7, 9, 14, [0.16, 0.06], false),
  inc: spot(ST.inc + 1.0, TOP + 1.2, BZ + 0.3, 5.4, 3.0, [-0.3, 0.18], true),
  q: spot(30, 46, -50, 300, 150, [-0.3, 0.16], false, [420, 1500]),
}
export type SpotKey = keyof typeof SPOT
/** 每一课交给世界的要求：棚里的工作灯跟到哪；是不是在棚里；塔吊的小车开到离塔身多远（m）、吊着的钢筋在多高 */
export interface Want { x: number; indoor: boolean; trolley?: number }

// ---------- 拼模型的小工具 ----------
/** 两点之间的一根方钢（或圆管）：拼桁架、脚手架用 */
const up = new THREE.Vector3(0, 1, 0), qa = new THREE.Quaternion(), ea = new THREE.Euler()
function strut(a: V3, b: V3, w: number, c: string, cyl = false): Part {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length()
  qa.setFromUnitVectors(up, d.normalize()); ea.setFromQuaternion(qa)
  return { p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: cyl ? [w / 2, len, w / 2] : [w, len, w], c, r: [ea.x, ea.y, ea.z], cyl }
}
/** 一块板，贴图按它在世界里的位置铺，k 是贴图一格多大 */
function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 6) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) / k : p.getY(i) / k)
  return g
}
function tint(g: THREE.BufferGeometry, color: string) {
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  return g.index ? g.toNonIndexed() : g
}

// ---------- 塔吊 ----------
const YEL = '#e2a51b', YEL2 = '#c98f12'
/** 塔吊不动的部分：混凝土基础、桁架塔身、回转平台和司机室、塔帽、起重臂、平衡臂和配重、拉杆 */
function craneParts() {
  const P: Part[] = [], { x: X, z: Z, h: H, w } = TC
  P.push({ p: [X, 2.2, Z], s: [30, 4.4, 30], c: '#9c9a92' }); P.push({ p: [X, 5.2, Z], s: [14, 1.6, 14], c: '#6b6f73' })
  // 塔身：四根主肢，每 3 m 一节，每节四面各一道横杆、一道斜杆
  const cs: [number, number][] = [[-w, -w], [w, -w], [w, w], [-w, w]]
  for (const [a, b] of cs) P.push({ p: [X + a, 6 + (H - 6) / 2, Z + b], s: [1.1, H - 6, 1.1], c: YEL })
  for (let y = 6; y < H - 1; y += 18) for (let i = 0; i < 4; i++) {
    const [a1, b1] = cs[i], [a2, b2] = cs[(i + 1) % 4]
    P.push(strut([X + a1, y, Z + b1], [X + a2, y, Z + b2], 0.6, YEL2))
    P.push(strut([X + a1, y, Z + b1], [X + a2, Math.min(H, y + 18), Z + b2], 0.5, YEL2))
  }
  // 回转平台、司机室、塔帽
  P.push({ p: [X, H + 1.4, Z], s: [13, 2.8, 13], c: '#3d4247' }); P.push({ p: [X, H + 3.5, Z], s: [11, 1.4, 11], c: YEL })
  P.push({ p: [X - 4, H + 8.4, Z + 9.2], s: [6.4, 7.6, 6.2], c: '#e9ebe6' }); P.push({ p: [X - 4, H + 12.4, Z + 9.2], s: [6.8, 0.5, 6.6], c: YEL2 })
  P.push({ p: [X - 4, H + 9.2, Z + 12.36], s: [5.4, 4.2, 0.1], c: '#2c4a5e' }); P.push({ p: [X - 7.25, H + 9.2, Z + 9.2], s: [0.1, 4.2, 5], c: '#2c4a5e' })
  const apex: V3 = [X, H + 48, Z]
  for (const [a, b] of cs) P.push(strut([X + a * 0.9, H + 4, Z + b * 0.9], apex, 1.0, YEL))
  for (let y = H + 14; y < H + 44; y += 12) { const k = 1 - (y - H - 4) / 44; for (let i = 0; i < 4; i++) { const [a1, b1] = cs[i], [a2, b2] = cs[(i + 1) % 4]; P.push(strut([X + a1 * 0.9 * k, y, Z + b1 * 0.9 * k], [X + a2 * 0.9 * k, y, Z + b2 * 0.9 * k], 0.45, YEL2)) } }
  // 起重臂：三角形截面的桁架，下面两根弦杆（小车在上面跑），上面一根，侧面和底面都是之字形的腹杆
  const J0 = X - 5, J1 = X - TC.jib - 4, yb = H + 4.2, yt = H + 12.6, zw = 3.6
  for (const s of [-1, 1]) P.push(strut([J0, yb, Z + s * zw], [J1, yb, Z + s * zw], 0.9, YEL))
  P.push(strut([J0, yt, Z], [J1 + 6, yb + 2, Z], 0.9, YEL))
  const topY = (x: number) => yt + (yb + 2 - yt) * (J0 - x) / (J0 - J1 - 6)
  for (let x = J0, k = 0; x > J1 + 4; x -= 10, k++) {
    for (const s of [-1, 1]) P.push(strut([x, yb, Z + s * zw], [x - 5, topY(x - 5), Z], 0.42, YEL2), strut([x - 5, topY(x - 5), Z], [x - 10, yb, Z + s * zw], 0.42, YEL2))
    P.push(strut([x, yb, Z - zw], [x, yb, Z + zw], 0.4, YEL2)); P.push(strut([x, yb, Z + (k % 2 ? zw : -zw)], [x - 10, yb, Z + (k % 2 ? -zw : zw)], 0.36, YEL2))
  }
  // 平衡臂：两根槽钢、走道板和栏杆，上面一台起升卷扬机，尾部挂着一摞混凝土配重块
  const C0 = X + 5, C1 = X + TC.cjib
  for (const s of [-1, 1]) { P.push({ p: [(C0 + C1) / 2, yb, Z + s * zw], s: [C1 - C0, 1.4, 0.8], c: YEL }); P.push({ p: [(C0 + C1) / 2, yb + 4.4, Z + s * (zw + 0.6)], s: [C1 - C0, 0.3, 0.3], c: YEL2 }) }
  for (let x = C0 + 2; x < C1; x += 8) for (const s of [-1, 1]) P.push({ p: [x, yb + 2.2, Z + s * (zw + 0.6)], s: [0.3, 4.4, 0.3], c: YEL2 })
  P.push({ p: [(C0 + C1) / 2, yb + 0.8, Z], s: [C1 - C0, 0.25, zw * 2 + 1.6], c: '#5a5f63' })
  P.push({ p: [X + 24, yb + 3.6, Z], s: [7, 5.2, 6], c: '#3b6f9b' }); P.push({ p: [X + 30, yb + 3.4, Z], s: [3.2, 3.2, 6.6], c: '#2c3135', cyl: false })
  const CW = X + CRANE.counterArm * M
  for (let i = 0; i < 4; i++) P.push({ p: [CW - 4.5 + i * 3, yb - 6, Z], s: [2.8, 18, 10], c: i % 2 ? '#a9a69c' : '#b3b0a6' })
  P.push({ p: [CW, yb + 3.4, Z], s: [13, 0.8, 11], c: YEL2 })
  // 拉杆：从塔帽顶拉到起重臂和平衡臂
  P.push(strut(apex, [X - 110, topY(X - 110) + 0.4, Z], 0.4, '#5a5f63'))
  P.push(strut(apex, [X - 40, yt, Z], 0.4, '#5a5f63'))
  for (const s of [-1, 1]) P.push(strut(apex, [C1 - 2, yb + 1, Z + s * zw], 0.4, '#5a5f63'))
  return P
}

/** 塔吊会动的部分：起重臂下面的小车、吊钩（一组动滑轮）、钢丝绳和吊着的一捆钢筋。r 是小车离塔身中心多少米 */
function CraneRig({ r }: { r: number }) {
  const g = useRef<THREE.Group>(null), cur = useRef(r)
  useFrame((_, d) => { cur.current += (r - cur.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.08)); g.current?.position.set(trolleyX(cur.current), 0, 0) })
  const H = TC.h, yb = H + 4.2, hook = 128
  const geo = useMemo(() => {
    const P: Part[] = []
    // 小车：一个框，四只轮子压在两根弦杆上
    P.push({ p: [0, yb - 1.6, TC.z], s: [6, 1.4, 8.6], c: '#3d4247' })
    for (const a of [-2.2, 2.2]) for (const s of [-1, 1]) P.push({ p: [a, yb - 0.1, TC.z + s * 3.6], s: [1.6, 1.6, 0.6], c: '#22262a', cyl: false })
    // 钢丝绳：两根从小车下来，绕过吊钩上的滑轮
    for (const s of [-1, 1]) P.push({ p: [s * 1.2, (yb - 2.4 + hook + 6) / 2, TC.z], s: [0.18, yb - 2.4 - hook - 6, 0.18], c: '#2b2e31' })
    // 吊钩：滑轮夹板、配重块、钩子
    P.push({ p: [0, hook + 5, TC.z], s: [3.6, 4, 2.2], c: YEL }); P.push({ p: [0, hook + 2.2, TC.z], s: [2.6, 2, 1.6], c: '#2c3135' })
    P.push({ p: [0, hook + 0.4, TC.z], s: [0.7, 2, 0.7], c: '#3a3e42' })
    // 两根吊索，下面一捆钢筋
    for (const s of [-1, 1]) P.push(strut([0, hook, TC.z], [s * 9, hook - 9, TC.z], 0.22, '#2b2e31'))
    const rb = rng(41)
    for (let i = 0; i < 30; i++) { const a = i * 2.4, rr = Math.sqrt(i / 30) * 1.6; P.push({ p: [0, hook - 10.6 + Math.sin(a) * rr, TC.z + Math.cos(a) * rr], s: [0.18, 24 + rb() * 0.6, 0.18], c: rb() < 0.5 ? '#5d4a3f' : '#6a5446', r: [0, 0, Math.PI / 2], cyl: true }) }
    for (const s of [-1, 1]) P.push({ p: [s * 9, hook - 10.6, TC.z], s: [0.5, 3.8, 3.8], c: '#2b2e31' })
    return mergeParts(P)
  }, [hook, yb])
  return <group ref={g}><mesh geometry={geo} castShadow><Painted rough={0.5} metal={0.5} /></mesh></group>
}

// ---------- 在建楼和脚手架 ----------
function buildingParts() {
  const P: Part[] = [], B = BLD
  const xs: number[] = []; for (let x = B.x0; x <= B.x1 + 0.1; x += 24) xs.push(x)
  const zs = [B.z0, (B.z0 + B.z1) / 2, B.z1]
  for (let f = 0; f < B.n; f++) {
    const y0 = f * B.floor
    for (const x of xs) for (const z of zs) P.push({ p: [x, y0 + B.floor / 2, z], s: [3, B.floor, 3], c: '#a7a59d' })
    P.push({ p: [(B.x0 + B.x1) / 2, y0 + B.floor - 0.6, (B.z0 + B.z1) / 2], s: [B.x1 - B.x0 + 4, 1.2, B.z1 - B.z0 + 4], c: '#b1afa7' })
    for (const x of xs.slice(0, -1)) P.push({ p: [x + 12, y0 + B.floor - 2, B.z1], s: [24, 2.2, 2.4], c: '#a2a098' })
  }
  // 最上一层：柱子只浇了一截，露着钢筋；楼面上码着模板和钢管
  const y5 = B.n * B.floor
  for (const x of xs) for (const z of zs) { P.push({ p: [x, y5 + 2, z], s: [3, 4, 3], c: '#a7a59d' }); for (const a of [-1, 1]) for (const b of [-1, 1]) P.push({ p: [x + a * 1, y5 + 7, z + b * 1], s: [0.12, 8, 0.12], c: '#6a4a3a', cyl: true }) }
  for (let i = 0; i < 6; i++) P.push({ p: [60 + i * 0.3, y5 + 0.5 + i * 0.3, -80], s: [14, 0.3, 7], c: '#b07a3c' })
  // 塔吊身后、楼的东头码着的一堆钢管
  return P
}
function scaffoldParts() {
  const P: Part[] = [], S = SCAF, tube = '#8d949a', yel = '#d9a521'
  for (let x = S.x0; x <= S.x1 + 0.1; x += 9) for (const z of [S.zi, S.zo]) P.push({ p: [x, S.top / 2, z], s: [0.3, S.top, 0.3], c: tube, cyl: true })
  for (let y = 1.2; y < S.top; y += 10.8) for (const z of [S.zi, S.zo]) P.push({ p: [(S.x0 + S.x1) / 2, y, z], s: [0.3, S.x1 - S.x0, 0.3], c: tube, r: [0, 0, Math.PI / 2], cyl: true })
  for (let y = 1.2; y < S.top; y += 10.8) for (let x = S.x0; x <= S.x1 + 0.1; x += 9) P.push({ p: [x, y + 0.3, (S.zi + S.zo) / 2], s: [0.3, S.zo - S.zi + 1.2, 0.3], c: tube, r: [Math.PI / 2, 0, 0], cyl: true })
  // 外侧的剪刀撑
  for (let x = S.x0; x < S.x1 - 30; x += 36) { P.push(strut([x, 1.2, S.zo + 0.4], [x + 36, 44.4, S.zo + 0.4], 0.3, tube, true)); P.push(strut([x + 36, 1.2, S.zo + 0.4], [x, 44.4, S.zo + 0.4], 0.3, tube, true)) }
  // 脚手板（每隔一层铺一层）和黄色的挡脚板
  for (const y of [12, 33.6, 55.2, 76.8]) { P.push({ p: [(S.x0 + S.x1) / 2, y + 0.25, (S.zi + S.zo) / 2], s: [S.x1 - S.x0, 0.35, S.zo - S.zi - 0.6], c: '#a57c4c' }); P.push({ p: [(S.x0 + S.x1) / 2, y + 1.2, S.zo - 0.2], s: [S.x1 - S.x0, 1.4, 0.12], c: yel }) }
  for (let x = S.x0; x <= S.x1; x += 9) P.push({ p: [x, 0.3, S.zi], s: [1.4, 0.6, 1.4], c: '#7a6248' }, { p: [x, 0.3, S.zo], s: [1.4, 0.6, 1.4], c: '#7a6248' })
  return P
}

// ---------- 工棚 ----------
function shedParts() {
  const P: Part[] = [], S = SHED, B = BENCH, steel = '#3f5566', H = (z: number) => S.hf + (S.hb - S.hf) * (S.z1 - z) / (S.z1 - S.z0)
  for (let x = S.x0; x <= S.x1 + 0.1; x += 24) for (const z of [S.z0 + 0.6, S.z1 - 0.6]) {
    const h = H(z)
    P.push({ p: [x, h / 2, z], s: [1.2, h, 0.16], c: steel }, { p: [x, h / 2, z + 0.5], s: [1.2, h, 0.16], c: steel }, { p: [x, h / 2, z + 0.25], s: [0.14, h, 0.5], c: steel })
    P.push({ p: [x, 0.15, z + 0.25], s: [2, 0.3, 2], c: '#9e9b92' })
  }
  // 屋架：每根柱子上一根斜梁，梁上一道道檩条
  for (let x = S.x0; x <= S.x1 + 0.1; x += 24) P.push(strut([x, S.hb - 0.5, S.z0], [x, S.hf - 0.5, S.z1 + 1.6], 1.0, steel))
  for (let z = S.z0 + 1; z < S.z1 + 2; z += 3.6) P.push({ p: [(S.x0 + S.x1) / 2, H(z) - 1.3, z], s: [S.x1 - S.x0 + 2, 0.7, 0.4], c: '#566b7a' })
  // 实验台：钢架、下层搁板、一格格抽屉；每格一块绿色的橡胶垫
  for (let x = B.x0 + 0.6; x <= B.x1; x += 12) for (const z of [B.z0 + 0.4, B.z1 - 0.4]) P.push({ p: [x, (TOP - 0.3) / 2, z], s: [0.5, TOP - 0.3, 0.5], c: '#4b5b52' })
  P.push({ p: [(B.x0 + B.x1) / 2, 1.3, (B.z0 + B.z1) / 2], s: [B.x1 - B.x0 - 0.4, 0.2, B.z1 - B.z0 - 0.4], c: '#56665d' })
  P.push({ p: [(B.x0 + B.x1) / 2, TOP - 0.55, B.z1 - 0.3], s: [B.x1 - B.x0, 0.5, 0.4], c: '#4b5b52' })
  for (let x = S.x0 + 12; x < S.x1; x += 24) {
    // 后墙上：一条搁板、上面一排安全帽；挂工具的孔板；一块写着规矩的牌子
    P.push({ p: [x - 6, TOP + 9.6, S.z0 + 0.8], s: [7, 0.25, 1.2], c: '#7a6248' })
    for (let i = 0; i < 4; i++) P.push({ p: [x - 8.4 + i * 1.6, TOP + 9.45, S.z0 + 0.3], s: [0.12, 0.5, 0.8], c: '#2d3135' })
    P.push({ p: [x + 8, TOP + 6.2, S.z0 + 0.16], s: [4.8, 3.3, 0.12], c: '#4a5048' })
  }
  // 两头：东头一台灭火器箱，西头一排储物柜
  P.push({ p: [S.x0 + 4.5, 7.5, S.z0 + 2.2], s: [6.4, 15, 3.4], c: '#55707e' }); for (const s of [-1, 1]) P.push({ p: [S.x0 + 4.5 + s * 1.6, 7.7, S.z0 + 3.95], s: [3.06, 14, 0.06], c: '#668493' })
  P.push({ p: [S.x1 - 3, 2.4, S.z1 - 1.4], s: [3, 4.8, 1.4], c: '#b23a30' })
  return P
}
/** 安全帽：一个半球加一圈帽檐，几种颜色 */
function helmets() {
  const gs: THREE.BufferGeometry[] = [], cols = ['#e7b319', '#d84a2c', '#e9e7e0', '#2f6fb3']
  for (let x = SHED.x0 + 12, k = 0; x < SHED.x1; x += 24, k++) for (let i = 0; i < 4; i++) {
    if ((i + k) % 5 === 4) continue
    const c = cols[(i + k) % 4], cx = x - 8.4 + i * 1.6 + 0.2, cy = TOP + 9.73, cz = SHED.z0 + 0.95
    const dome = new THREE.SphereGeometry(0.78, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 0.9, 1.1); dome.translate(cx, cy + 0.12, cz); gs.push(tint(dome, c))
    const brim = new THREE.CylinderGeometry(0.98, 0.98, 0.08, 20); brim.scale(1, 1, 1.18); brim.translate(cx, cy + 0.12, cz + 0.12); gs.push(tint(brim, c))
    const rib = new THREE.BoxGeometry(0.16, 0.2, 1.7); rib.translate(cx, cy + 0.82, cz); gs.push(tint(rib, c))
  }
  return mergeGeometries(gs)
}

// ---------- 材料场 ----------
function yardParts() {
  const P: Part[] = [], r = rng(9)
  // 砖垛：码在木托盘上，一层横一层竖
  for (const [bx, bz] of [[48, -22], [58, -22], [48, -34], [-198, 30]] as [number, number][]) {
    P.push({ p: [bx, 0.5, bz], s: [7, 1, 6], c: '#8a6a46' })
    for (let l = 0; l < 7; l++) for (let i = 0; i < 4; i++) { const v = 0.8 + r() * 0.2, c = `rgb(${Math.round(160 * v)},${Math.round(78 * v)},${Math.round(56 * v)})`; P.push(l % 2 ? { p: [bx - 2.6 + i * 1.75, 1.35 + l * 0.66, bz], s: [1.6, 0.62, 5.6], c } : { p: [bx, 1.35 + l * 0.66, bz - 2.1 + i * 1.4], s: [6.6, 0.62, 1.3], c }) }
  }
  // 钢筋：垫在两根方木上的一排排长钢筋
  for (const [cx, cz, n] of [[150, 34, 40], [118, -24, 30]] as [number, number, number][]) {
    for (const s of [-12, 0, 12]) P.push({ p: [cx + s, 0.4, cz], s: [1.2, 0.8, 7], c: '#7a6248' })
    for (let i = 0; i < n; i++) P.push({ p: [cx + (r() - 0.5) * 0.6, 0.95 + Math.floor(i / 14) * 0.32, cz - 3 + (i % 14) * 0.44], s: [0.15, 40, 0.15], c: r() < 0.5 ? '#5d4a3f' : '#6e5546', r: [0, 0, Math.PI / 2], cyl: true })
  }
  // 水泥袋：一托盘码好的
  P.push({ p: [20, 0.5, -24], s: [7, 1, 6], c: '#8a6a46' })
  for (let l = 0; l < 5; l++) for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) P.push({ p: [17.8 + i * 4.4, 1.5 + l * 0.9, -26 + j * 2], s: [4.2, 0.85, 1.9], c: r() < 0.5 ? '#c9c2ae' : '#bdb6a2' })
  // 一摞模板（胶合板）、几根方木
  for (let i = 0; i < 10; i++) P.push({ p: [8 + r() * 0.3, 0.2 + i * 0.25, 30], s: [14.6, 0.22, 7.3], c: i % 2 ? '#b8823f' : '#a9743a' })
  for (let i = 0; i < 6; i++) P.push({ p: [-6, 0.35 + Math.floor(i / 3) * 0.6, 22 + (i % 3) * 0.8], s: [24, 0.6, 0.6], c: '#9c7a52' })
  // 交通锥
  for (const [cx, cz] of [[22, 44], [30, 46], [126, 40], [140, 6]] as [number, number][]) { P.push({ p: [cx, 0.08, cz], s: [2, 0.16, 2], c: '#2b2b2b' }); P.push({ p: [cx, 1.6, cz], s: [0.5, 3, 0.5], c: '#e0542a', cyl: true }) }
  // 东头：两层的集装箱活动板房（工地办公室）、一个门卫亭
  for (let f = 0; f < 2; f++) for (let i = 0; i < 3; i++) { const x = -226 + i * 0, z = -10 - i * 15; P.push({ p: [x - 6, 7.6 + f * 15.2, z], s: [36, 15, 14.4], c: f ? '#dfe3e2' : '#d6dbda' }); P.push({ p: [x - 6, 13.6 + f * 15.2, z + 7.25], s: [36, 1, 0.2], c: '#2f6fb3' }) }
  P.push({ p: [-206, 15.4, -25], s: [2, 0.4, 44], c: '#2f6fb3' })
  return P
}

// ---------- 围挡和远处的楼 ----------
function fenceGeo() {
  const gs: THREE.BufferGeometry[] = [], H = 14.4
  const run = (x0: number, z0: number, x1: number, z1: number) => { const len = Math.hypot(x1 - x0, z1 - z0), g = new THREE.PlaneGeometry(len, H); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 30); g.rotateY(-Math.atan2(z1 - z0, x1 - x0)); g.translate((x0 + x1) / 2, H / 2, (z0 + z1) / 2); gs.push(g) }
  run(-250, 90, 300, 90); run(-250, -190, 300, -190); run(-250, -190, -250, 90); run(300, -190, 300, 90)
  return mergeGeometries(gs)
}
function cityGeo() {
  const groups: THREE.BufferGeometry[][] = [[], [], []], r = rng(77)
  const tower = (x: number, z: number, w: number, d: number, h: number) => { const g = slab(x - w / 2, x + w / 2, 0, h, z - d / 2, z + d / 2, 26); groups[Math.floor(r() * 3)].push(g) }
  for (let i = 0; i < 24; i++) tower(-640 + i * 58 + r() * 20, -520 - r() * 220, 44 + r() * 30, 44 + r() * 30, 60 + r() * 170)
  for (let i = 0; i < 12; i++) { const s = i % 2 ? 1 : -1; tower(s * (560 + r() * 140) + 30, -300 + i * 50, 50, 50, 50 + r() * 110) }
  return groups.map(g => mergeGeometries(g))
}

/** 棚里的工作灯：跟着当前这一课从前上方打下来，只在棚里的课亮 */
function Key({ x, on }: { x: number; on: boolean }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30)
    cur.current += (x - cur.current) * (1 - Math.exp(-dt / 0.45))
    l.position.set(cur.current - 3, SHED.hf - 2.5, BZ + 13); aim.position.set(cur.current, TOP + 1.5, BZ); aim.updateMatrixWorld()
    l.intensity += ((on ? 170 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.62} penumbra={0.85} intensity={0} distance={44} decay={1.6} color="#fff2de" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} shadow-normalBias={0.02} />
  </>
}

export function World({ x = ST.l2, indoor = false, trolley = CRANE.start }: Partial<Want>) {
  const tex = useMemo(() => {
    const ground = makeGravel(4); ground.repeat.set(160, 120)
    const conc = makeConcrete(); conc.repeat.set(1, 1)
    const roof = makeSteelSheet([62, 118, 172], 10), wall = makeSteelSheet([150, 160, 164], 10), bench = makeWood('#b88a55', '110,72,38', 9, 3)
    const net = makeNet(); net.repeat.set(24, 18)
    const fence = makeHoarding(), sand = makeSand(); sand.repeat.set(3, 2)
    const brick = makeBrick(); const win = [makeWindows(3, '#8f969b'), makeWindows(5, '#a9a397'), makeWindows(8, '#7d8a92')]
    return { ground, conc, roof, wall, bench, net, fence, sand, brick, win, rules: [makeBoard('试验室规程', ['进入工地必须戴好安全帽', '钩码、砝码轻拿轻放', '测力计使用前先调零', '读数时视线与刻度垂直', '实验后器材归位']), makeBoard('塔吊安全须知', ['吊物下方严禁站人', '风力六级以上停止作业', '不得超过额定起重力矩', '信号不清不准起吊'])], sign: makeSign(['试验室', '杠杆 · 滑轮 · 机械效率'], '#24476b', '#eef3f6', 512, 192), board: makeSign(['安全第一'], '#b5372b', '#f3efe6', 384, 128) }
  }, [])
  const geo = useMemo(() => {
    const S = SHED
    const shed = mergeParts(shedParts()), crane = mergeParts(craneParts()), bld = mergeParts(buildingParts()), scaf = mergeParts(scaffoldParts()), yard = mergeParts(yardParts())
    // 彩钢瓦屋面：顺着坡铺，前后都出一点檐
    const len = Math.hypot(S.z1 + 2 - S.z0 + 1, S.hb - S.hf), roof = new THREE.PlaneGeometry(S.x1 - S.x0 + 4, len)
    { const uv = roof.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (S.x1 - S.x0) / 4, uv.getY(i)) }
    roof.rotateX(-Math.PI / 2 - Math.atan2(S.hb - S.hf, S.z1 + 2 - S.z0 + 1)); roof.translate((S.x0 + S.x1) / 2, (S.hb + S.hf) / 2 + 0.1, (S.z0 - 1 + S.z1 + 2) / 2)
    const back = new THREE.PlaneGeometry(S.x1 - S.x0, S.hb); { const uv = back.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (S.x1 - S.x0) / 4, uv.getY(i) * 2) } back.translate((S.x0 + S.x1) / 2, S.hb / 2, S.z0)
    const ends = mergeGeometries([S.x0, S.x1].map(ex => { const g = new THREE.PlaneGeometry(S.z1 - S.z0, S.hb); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (S.z1 - S.z0) / 4, uv.getY(i) * 2); g.rotateY(ex === S.x0 ? Math.PI / 2 : -Math.PI / 2); g.translate(ex, S.hb / 2, (S.z0 + S.z1) / 2); return g }))
    // 在建楼底下三层的砖墙（后面和两头），留着窗洞
    const walls: THREE.BufferGeometry[] = []
    for (let f = 0; f < 3; f++) { const y0 = f * BLD.floor + 0.2, y1 = y0 + BLD.floor - 2.6
      for (let x = BLD.x0; x < BLD.x1; x += 24) { walls.push(slab(x + 1.5, x + 6, y0, y1, BLD.z0 - 0.6, BLD.z0 + 0.6, 12), slab(x + 18, x + 22.5, y0, y1, BLD.z0 - 0.6, BLD.z0 + 0.6, 12), slab(x + 6, x + 18, y0, y0 + 5, BLD.z0 - 0.6, BLD.z0 + 0.6, 12)) }
      for (const ex of [BLD.x0, BLD.x1]) walls.push(slab(ex - 0.6, ex + 0.6, y0, y1, BLD.z0, BLD.z1, 12))
    }
    return { shed, crane, bld, scaf, yard, roof, back, ends, walls: mergeGeometries(walls), helmets: helmets(), fence: fenceGeo(), city: cityGeo(),
      floor: slab(S.x0, S.x1, 0, 0.12, S.z0, S.z1 + 1, 24), top: slab(BENCH.x0, BENCH.x1, TOP - 0.3, TOP, BENCH.z0, BENCH.z1, 9) }
  }, [])
  return (
    <group>
      <hemisphereLight args={['#dce8f4', '#8d8270', indoor ? 0.55 : 0.32]} />
      <Key x={x} on={indoor} />
      {/* 地面：工地的砂石地，棚里是一块水泥地坪 */}
      <mesh rotation-x={-Math.PI / 2} position={[30, -0.02, -60]} receiveShadow><planeGeometry args={[1600, 1200]} /><meshStandardMaterial map={tex.ground} roughness={0.97} /></mesh>
      <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.conc} roughness={0.85} /></mesh>
      {/* 工棚：钢架、彩钢瓦屋面和后墙，屋面不投影子，斜阳才照得进来 */}
      <mesh geometry={geo.shed} castShadow receiveShadow><Painted rough={0.55} metal={0.35} /></mesh>
      <mesh geometry={geo.roof}><meshStandardMaterial map={tex.roof} roughness={0.5} metalness={0.35} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo.back} receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.6} metalness={0.2} /></mesh>
      <mesh geometry={geo.ends} receiveShadow><meshStandardMaterial map={tex.wall} roughness={0.6} metalness={0.2} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo.top} castShadow receiveShadow><meshStandardMaterial map={tex.bench} roughness={0.62} /></mesh>
      <mesh geometry={geo.helmets} castShadow><meshPhysicalMaterial vertexColors roughness={0.35} clearcoat={0.6} /></mesh>
      {[-160, -40].map(sx => <mesh key={sx} position={[sx, TOP + 12.2, SHED.z0 + 0.06]}><planeGeometry args={[9, 3.4]} /><meshStandardMaterial map={tex.sign} roughness={0.7} /></mesh>)}
      {Object.values(ST).map((sx, i) => <mesh key={sx} position={[sx + 8, TOP + 6.2, SHED.z0 + 0.23]}><planeGeometry args={[4.5, 3]} /><meshStandardMaterial map={tex.rules[i % 2]} roughness={0.8} /></mesh>)}
      {/* 塔吊、在建楼、脚手架和安全网、材料场 */}
      <mesh geometry={geo.crane} castShadow receiveShadow><Painted rough={0.5} metal={0.4} /></mesh>
      <CraneRig r={trolley} />
      <mesh geometry={geo.bld} castShadow receiveShadow><Painted rough={0.9} metal={0} /></mesh>
      <mesh geometry={geo.walls} castShadow receiveShadow><meshStandardMaterial map={tex.brick} roughness={0.92} /></mesh>
      <mesh geometry={geo.scaf} castShadow receiveShadow><Painted rough={0.45} metal={0.6} /></mesh>
      <mesh position={[(SCAF.x0 + SCAF.x1) / 2, 14 + (SCAF.top - 14) / 2, SCAF.zo + 0.7]}><planeGeometry args={[SCAF.x1 - SCAF.x0, SCAF.top - 14]} /><meshStandardMaterial map={tex.net} transparent opacity={0.92} roughness={0.9} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[90, 20, SCAF.zo + 0.82]}><planeGeometry args={[14, 4.6]} /><meshStandardMaterial map={tex.board} roughness={0.7} /></mesh>
      <mesh geometry={geo.yard} castShadow receiveShadow><Painted rough={0.8} metal={0.08} /></mesh>
      {/* 沙堆 */}
      <mesh position={[114, 0, -12]} scale={[1, 0.5, 0.8]} castShadow receiveShadow><sphereGeometry args={[10, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial map={tex.sand} roughness={1} /></mesh>
      {/* 围挡和远处的楼 */}
      <mesh geometry={geo.fence}><meshStandardMaterial map={tex.fence} roughness={0.6} side={THREE.DoubleSide} /></mesh>
      {geo.city.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial map={tex.win[i]} roughness={0.7} /></mesh>)}
    </group>
  )
}
