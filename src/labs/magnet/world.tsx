// 电与磁实验室的大场景：华北山地风电场的一角。山脚一座单层运维站，朝南的一面剖开，里面是实训室：
// 靠北墙一条长实验台，从西往东每 2.2 m 一格，第 1–7 课的桌面实验各占一格；东头一只控制柜（拓展课）。台子上方一排高窗，窗外是北边的山坡。
// 山坡上一行风机在转，第 7 课剖开的是离运维站最近的那台；运维站东边是升压站，输电铁塔沿山谷往东走。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。1 m 画成 10 个单位，台上的器材按厘米写，乘 CM。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Painted, mergeParts, useConcrete, type Label, type Part } from '@/lab-kit'
import { makeCladding, makeGrass, makeGravel, makePegboard, makeResin, makeText, makeTile, makeWall, rep } from './mats'
import { Turbine } from './turbine'
import type { V3 } from './gear'

export const M = 10, CM = 0.1
/** 实验台台面的高度：80 cm */
export const TOP = 8
/** 实训室：x、z 的范围和层高 */
export const ROOM = { x0: -100, x1: 100, z0: -30, z1: 22, h: 32 }
/** 实验台：前后沿；器材摆在 z = BZ 这条线上 */
export const BENCH = { x0: -92, x1: 68, z0: -29.4, z1: -21.9 }
export const BZ = -25.2
/** 各格的中心（x） */
export const ST = { l1: -77, l2: -55, l3: -33, l4: -11, l5: 11, l6: 33, l7: 55, x: 84 }
export type StKey = keyof typeof ST

/** 地面的高度（单位）：运维站一带是平的，往北是山坡，再远是起伏的山梁 */
export function ground(x: number, z: number) {
  const ripple = 26 * Math.sin(x / 310 + 1.3) * Math.sin(z / 270) + 12 * Math.sin(x / 130 - z / 170)
  const north = z < -250 ? 260 * Math.tanh(Math.pow((-z - 250) / 2200, 1.3)) * (1 + 0.22 * Math.sin(x / 700 + 0.4)) : 0
  // 运维站和升压站两处是平整过的场地
  const d = Math.min(Math.hypot(x - 100, z * 1.3), Math.hypot(x - 620, z + 40) * 0.95), f = THREE.MathUtils.smoothstep(d, 240, 560)
  return (north + ripple) * f
}
/** 风机的位置（单位）。T7 是第 7 课剖开的那台 */
export const T7: V3 = [300, 0, -1750]
T7[1] = ground(T7[0], T7[2])
/** 风机 T7 上的一点（相对塔筒底面中心，m；机舱主轴沿 +z）换成场景坐标 */
export const T7_YAW = 0.12
export function onT7(p: V3): V3 { const c = Math.cos(T7_YAW), n = Math.sin(T7_YAW); return [T7[0] + (p[0] * c + p[2] * n) * M, T7[1] + p[1] * M, T7[2] + (-p[0] * n + p[2] * c) * M] }
const FARM: [number, number][] = [[-1300, -2650], [-500, -2950], [1100, -2500], [1900, -2250], [-2100, -2400]]

/** 台上的厘米坐标（以这一格的中心为原点，前方 +z）换成场景坐标 */
export function toWorld(at: StKey, p: V3): V3 { return [ST[at] + p[0] * CM, TOP + p[1] * CM, BZ + p[2] * CM] }
/** 一格台子上的器材：里面一律按厘米写，原点在台面上、这一格的中心 */
export function Bench({ at, children }: { at: StKey; children: ReactNode }) {
  return <group position={[ST[at], TOP, BZ]}><group scale={CM}>{children}</group></group>
}

interface Spot { target: THREE.Vector3; span: [number, number]; view: [number, number]; indoor: boolean; fog: [number, number]; key: V3 }
/** 台上一格的机位：local 是这一格上的哪一处（厘米），span 装进画面的宽和高（厘米），view 方位角和仰角 */
function bench(at: StKey, local: V3, span: [number, number], view: [number, number]): Spot {
  const t = toWorld(at, local)
  return { target: new THREE.Vector3(...t), span: [span[0] * CM, span[1] * CM], view, indoor: true, fog: [400, 2600], key: [t[0] - 3.4, TOP + 7.5, BZ + 5] }
}
const out = (t: V3, span: [number, number], view: [number, number], fog: [number, number] = [4000, 30000]): Spot => ({ target: new THREE.Vector3(...t), span, view, indoor: false, fog, key: t })
const HUB: V3 = [T7[0], T7[1] + 802, T7[2] + 60]
export const SPOT = {
  // 第 1 课：悬挂架、材料盘、回形针盒，镜头稍低
  l1: bench('l1', [3, 2, -1], [42, 21], [0.12, 0.64]),
  l1b: bench('l1', [-12, 12, -11], [34, 26], [0.78, 0.36]),
  // 第 2 课：玻璃板上的铁屑，从上方往下看
  l2: bench('l2', [0, 1, 1], [42, 24], [-0.04, 0.95]),
  l2e: bench('l2', [44, 16, -3], [48, 36], [-0.22, 0.16]),
  // 第 3 课：南北方向拉直的导线和小磁针（偏左），螺线管（偏右）
  l3: bench('l3', [-20, 4, -4], [50, 28], [0.28, 0.55]),
  l3b: bench('l3', [12, 4, 0], [36, 20], [-0.18, 0.5]),
  // 第 4 课：吊着的电磁铁和大头针，镜头平一点
  l4: bench('l4', [2, 11, -4], [46, 22], [-0.04, 0.18]),
  // 第 5 课：导轨和导体棒；电动机模型
  l5: bench('l5', [-11, 5, 2], [34, 17], [0.45, 0.24]),
  l5b: bench('l5', [34, 6, 0], [30, 17], [-0.3, 0.36]),
  // 第 6 课：蹄形磁体和导体棒，正面平视
  l6: bench('l6', [-8, 7, 1], [36, 18], [0.4, 0.2]),
  // 第 7 课：手摇发电机；风机整机；剖开的机舱
  l7: bench('l7', [-9, 8, 0], [52, 26], [-0.14, 0.36]),
  l7t: out([T7[0], T7[1] + 480, T7[2]], [1500, 1200], [-0.62, 0.12]),
  l7c: out([HUB[0] + 4, HUB[1] - 14, HUB[2] - 80], [190, 84], [Math.PI / 2 + 0.38, 0.26], [3000, 30000]),
  // 拓展：东头的控制柜
  x: bench('x', [6, 52, -18], [62, 34], [-0.16, 0.08]),
  xs: bench('x', [60, 9, -4], [44, 28], [-0.08, 0.2]),
  // 随堂检测：风电场全景，从山谷南边高处看
  q: out([430, 300, -520], [2300, 1120], [-0.22, 0.36], [6000, 40000]),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求：工作灯照哪；在不在室内；第 7 课那台风机转不转、剖不剖开、电缆里有没有电流 */
export interface Want { light: V3; aim: V3; indoor: boolean; spin?: boolean; cut?: number; flow?: number }
export function Place({ at, labels, world, children = null }: { at: SpotKey; labels: Label[]; world?: { spin?: boolean; cut?: number; flow?: number }; children?: ReactNode }) {
  const v = SPOT[at]
  const w = useMemo<Want>(() => ({ light: v.key, aim: v.target.toArray() as V3, indoor: v.indoor, ...world }), [v, world?.spin, world?.cut, world?.flow])   // eslint-disable-line react-hooks/exhaustive-deps
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={v.indoor ? 1.1 : 2.6} env={v.indoor ? 0.55 : 0.9} studio={v.indoor} fog={v.fog} bloom={v.indoor ? 0.55 : 0.35} world={w}>{children}</LabStage>
}

// ---------- 拼房子用的小工具 ----------
const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c })
/** 一面竖在 x–y 平面里的墙：从 x0 到 x1、y0 到 y1，前表面在 z，往后厚 t；holes 是窗洞 [x0, x1, y0, y1] */
function wallXY(x0: number, x1: number, y0: number, y1: number, z: number, t: number, holes: [number, number, number, number][] = [], tile = 20) {
  const s = new THREE.Shape([new THREE.Vector2(x0, y0), new THREE.Vector2(x1, y0), new THREE.Vector2(x1, y1), new THREE.Vector2(x0, y1)])
  for (const [a, b, c, d] of holes) s.holes.push(new THREE.Path([new THREE.Vector2(a, c), new THREE.Vector2(a, d), new THREE.Vector2(b, d), new THREE.Vector2(b, c)]))
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); g.translate(0, 0, z - t)
  const uv = g.attributes.uv, p = g.attributes.position, n = g.attributes.normal
  for (let i = 0; i < uv.count; i++) { const sideFace = Math.abs(n.getZ(i)) < 0.5; uv.setXY(i, (sideFace ? p.getZ(i) + p.getX(i) : p.getX(i)) / tile, p.getY(i) / tile) }
  return g
}
const slab = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g }
const WIN = Object.values(ST).filter(x => x < 70).map(x => [x - 7, x + 7, 15, 26] as [number, number, number, number])

/** 实训室的静止部分：实验台的柜体和台面的前沿、窗框、踢脚线、门、灭火器 */
function roomParts() {
  const P: Part[] = [], R = ROOM, B = BENCH
  // 实验台：下面是一排浅灰色的钢制柜子，每 1.1 m 一扇门，门上一条把手；柜脚一圈黑色踢脚
  P.push(box((B.x0 + B.x1) / 2, 0, (B.z0 + B.z1) / 2, B.x1 - B.x0, 0.9, B.z1 - B.z0 - 0.6, '#2c2f31'))
  for (let x = B.x0; x < B.x1 - 0.1; x += 11) {
    P.push(box(x + 5.5, 0.9, B.z1 - 0.35, 10.8, TOP - 1.2, 0.3, '#c9cdcd'))
    P.push(box(x + 5.5, TOP - 1.6, B.z1 - 0.15, 3.6, 0.3, 0.3, '#7d8386'))
  }
  P.push(box((B.x0 + B.x1) / 2, 0.9, (B.z0 + B.z1) / 2 - 0.3, B.x1 - B.x0, TOP - 1.2, B.z1 - B.z0 - 0.8, '#b9bebe'))
  // 窗框：铝合金框、中梃、窗台石
  for (const [x0, x1, y0, y1] of WIN) {
    const mx = (x0 + x1) / 2
    P.push(box(mx, y0 - 0.5, R.z0 + 0.6, x1 - x0 + 1.2, 0.5, 1.6, '#e3e1da'))
    for (const x of [x0 + 0.3, mx, x1 - 0.3]) P.push(box(x, y0, R.z0 - 1.2, 0.6, y1 - y0, 0.7, '#d4d7d8'))
    for (const y of [y0 + 0.3, y1 - 0.3, (y0 + y1) / 2 + 2]) P.push(box(mx, y - 0.3, R.z0 - 1.2, x1 - x0, 0.6, 0.7, '#d4d7d8'))
  }
  // 踢脚线
  P.push(box(0, 0, R.z0 + 0.15, R.x1 - R.x0, 1.2, 0.3, '#6f7473'))
  // 西墙上的门、东墙边的灭火器
  P.push(box(R.x0 + 0.2, 0, -6, 0.4, 21, 10, '#8a9295'), box(R.x0 + 0.4, 10, -2.2, 0.3, 0.4, 1.6, '#c7c9c9'))
  P.push({ p: [R.x1 - 2, 3.2, 10], s: [0.9, 6.4, 0.9], c: '#c52a22', cyl: true }, box(R.x1 - 2, 6.4, 10, 0.5, 0.9, 0.5, '#222'))
  return P
}

/** 室外：升压站的围墙、主变压器、构架；输电铁塔；运维站门前的车 */
function outsideParts() {
  const P: Part[] = []
  // 升压站：围墙（灰色砌块墙）、主变压器（灰色油箱、散热片）、门型构架、几排设备支架
  const SX = 620, SZ = -40
  for (const [x, z, w, d] of [[SX, SZ - 120, 360, 3], [SX, SZ + 120, 360, 3], [SX - 180, SZ, 3, 240], [SX + 180, SZ, 3, 240]] as [number, number, number, number][]) P.push(box(x, 0, z, w, 24, d, '#b9b6ad'))
  P.push(box(SX - 40, 0, SZ, 60, 4, 44, '#9c9c96'))
  P.push(box(SX - 40, 4, SZ, 40, 32, 26, '#7f8a8c'), box(SX - 40, 36, SZ, 30, 6, 18, '#78827f'))
  for (let i = 0; i < 9; i++) P.push(box(SX - 58 + i * 4.4, 6, SZ + 16, 1.2, 26, 8, '#6f797b'), box(SX - 58 + i * 4.4, 6, SZ - 16, 1.2, 26, 8, '#6f797b'))
  for (const dx of [-24, -12, 0]) P.push({ p: [SX - 40 + dx * 0.6 + 6, 50, SZ], s: [1.6, 24, 1.6], c: '#b5ad9a', cyl: true })
  for (const x of [SX + 40, SX + 120]) {
    for (const z of [SZ - 60, SZ + 60]) P.push(box(x, 0, z, 4, 130, 4, '#9aa0a2'))
    P.push(box(x, 124, SZ, 4, 6, 124, '#9aa0a2'))
  }
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) P.push(box(SX + 30 + c * 22, 0, SZ - 50 + r * 50, 2, 40, 2, '#8b9294'), box(SX + 30 + c * 22, 40, SZ - 50 + r * 50, 6, 10, 6, '#cfcbc0'))
  P.push(box(SX - 130, 0, SZ + 60, 60, 36, 40, '#e7e6e0'), box(SX - 130, 36, SZ + 60, 62, 2, 42, '#8a9294'))
  // 输电铁塔：沿山谷往东，四根主材收成上窄下宽，三层横担
  const towers: V3[] = [[SX + 360, 0, SZ - 40], [SX + 980, 0, SZ - 220], [SX + 1620, 0, SZ - 420], [SX + 2280, 0, SZ - 600]]
  for (const [tx, , tz] of towers) {
    const y0 = ground(tx, tz), H = 380
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const a: V3 = [tx + sx * 26, y0, tz + sz * 26], b: V3 = [tx + sx * 5, y0 + H, tz + sz * 5]
      const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = v.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()), e = new THREE.Euler().setFromQuaternion(q)
      P.push({ p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: [2.2, len, 2.2], c: '#8e9597', r: [e.x, e.y, e.z] })
    }
    for (let k = 0; k < 8; k++) { const y = y0 + 30 + k * 44, w = 2 * (26 - 21 * (y - y0) / H); P.push(box(tx, y, tz - w / 2, w, 1.2, 1.2, '#8e9597'), box(tx, y, tz + w / 2, w, 1.2, 1.2, '#8e9597'), box(tx - w / 2, y, tz, 1.2, 1.2, w, '#8e9597'), box(tx + w / 2, y, tz, 1.2, 1.2, w, '#8e9597')) }
    for (const [y, w] of [[H - 10, 110], [H - 70, 140], [H - 130, 110]] as [number, number][]) P.push(box(tx, y0 + y, tz, 4, 4, w, '#8e9597'))
  }
  // 门前停着一辆运维车
  P.push(box(60, 2, 80, 46, 14, 19, '#f1f1ee'), box(48, 16, 80, 22, 8, 18, '#dfe5e8'), box(60, 0, 80, 40, 3, 17, '#222'))
  return P
}

/** 远处的山：几座低矮的山包，顶上圆缓，表面起伏一点；颜色发灰发蓝（雾里） */
function farHills() {
  const hills: [number, number, number, number, string][] = [[-6000, -9500, 4800, 800, '#4f5d4b'], [1500, -11000, 6000, 1000, '#515e50'], [8000, -9000, 5000, 750, '#4c5a49'], [-11000, -4500, 4600, 600, '#566250'], [11500, -3500, 4800, 650, '#536050'], [3500, 9500, 5600, 500, '#5a6553'], [-6500, 8500, 5200, 480, '#5a6553']]
  const col = new THREE.Color()
  return mergeGeometries(hills.map(([x, z, r, h, c], k) => {
    const g = new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2)
    const p = g.attributes.position, a = new Float32Array(p.count * 3)
    col.set(c)
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), ang = Math.atan2(pz, px), bump = 1 + 0.08 * Math.sin(ang * 3 + k) + 0.05 * Math.sin(ang * 7 + k * 2)
      p.setXYZ(i, x + px * r * bump, py * h * (0.9 + 0.1 * Math.sin(ang * 5 + k)) - 20, z + pz * r * bump)
      a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); g.computeVertexNormals()
    return g
  }))
}

/** 地形：一大块网格，按 ground() 起伏 */
function terrainGeo() {
  const S = 22000, N = 220, g = new THREE.PlaneGeometry(S, S, N, N)
  g.rotateX(-Math.PI / 2)
  const p = g.attributes.position
  const col = new Float32Array(p.count * 3), a = new THREE.Color('#ffffff'), dry = new THREE.Color('#d8c99a'), lush = new THREE.Color('#8fae7a'), c = new THREE.Color()
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i)
    p.setY(i, ground(x, z))
    // 大片的颜色起伏：有的地方草枯黄，有的地方绿一些，看着不是一整块平的草皮
    const n = 0.5 + 0.28 * Math.sin(x / 420 + Math.sin(z / 530) * 2) + 0.22 * Math.sin(z / 310 - x / 700)
    c.copy(a).lerp(n > 0.5 ? dry : lush, Math.abs(n - 0.5) * 1.6)
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

/** 一条贴着地面的路：途经的点（x, z），宽 4.4 m */
function roadGeo(pts2: [number, number][]) {
  const pts = pts2.map(([x, z]) => new THREE.Vector3(x, ground(x, z) + 10, z))
  const c = new THREE.CatmullRomCurve3(pts), N = Math.max(60, Math.round(c.getLength() / 20)), pos: number[] = [], uv: number[] = [], idx: number[] = []
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = c.getPointAt(u), tn = c.getTangentAt(u), side = new THREE.Vector3(-tn.z, 0, tn.x).normalize().multiplyScalar(30)
    for (const s of [-1, 1]) { const q = p.clone().addScaledVector(side, s); q.y = ground(q.x, q.z) + 10; pos.push(q.x, q.y, q.z); uv.push(s < 0 ? 0 : 1, u * c.getLength() / 40) }
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals()
  return g
}

/** 跟着这一课走的工作灯：从器材左前上方照下来 */
function Key({ at, aim, on }: { at: V3; aim: V3; on: boolean }) {
  const light = useRef<THREE.SpotLight>(null), target = useMemo(() => new THREE.Object3D(), [])
  const cur = useRef(new THREE.Vector3(...at)), look = useRef(new THREE.Vector3(...aim)), lvl = useRef(on ? 1 : 0)
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const k = 1 - Math.exp(-Math.min(d, 1 / 30) / 0.5)
    cur.current.lerp(new THREE.Vector3(...at), k); look.current.lerp(new THREE.Vector3(...aim), k)
    lvl.current += ((on ? 1 : 0) - lvl.current) * k
    l.position.copy(cur.current); target.position.copy(look.current); target.updateMatrixWorld(); l.intensity = 90 * lvl.current
  })
  return <>
    <primitive object={target} />
    <spotLight ref={light} target={target} angle={0.7} penumbra={0.9} intensity={90} distance={40} decay={1.5} color="#fff0dc" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}

export function World({ light = [ST.l1, 16, -20], aim = [ST.l1, TOP, BZ], indoor = true, spin = true, cut = 0, flow = 0 }: Partial<Want>) {
  const [cd, cn, cr] = useConcrete(30, 30)
  const tex = useMemo(() => ({
    grass: rep(makeGrass(), 900, 900), gravel: rep(makeGravel(), 4, 1), tile: rep(makeTile(), ROOM.x1 - ROOM.x0, ROOM.z1 - ROOM.z0).clone(), resin: rep(makeResin(), 8, 1),
    wall: rep(makeWall(), 1, 1), outWall: rep(makeWall('#f1f0ea'), 1, 1), roof: rep(makeCladding('#7f898f'), 60, 1), peg: rep(makePegboard(), 4, 2),
    sign: makeText(['运维站实训室'], { w: 768, h: 128, bg: '#1f4f7a', fg: '#ffffff', size: 64 }),
    rules: makeText(['实训室安全须知', '· 通电前检查接线', '· 改接电路先断开开关', '· 磁体远离仪表和手机', '· 用完关闭电源'], { w: 512, h: 512, bg: '#f4f3ee', fg: '#2a2e31', size: 40, weight: 500 }),
  }), [])
  const geo = useMemo(() => {
    const R = ROOM, t = 2.4
    return {
      terrain: terrainGeo(),
      back: wallXY(R.x0 - t, R.x1 + t, 0, R.h, R.z0, t, WIN),
      ends: [(() => { const g = wallXY(R.z0, R.z1, 0, R.h, 0, t); g.rotateY(-Math.PI / 2); g.translate(R.x0 - t, 0, 0); return g })(), (() => { const g = wallXY(R.z0, R.z1, 0, R.h, 0, t); g.rotateY(-Math.PI / 2); g.translate(R.x1, 0, 0); return g })()],
      ceil: slab(R.x0 - t, R.x1 + t, R.h, R.h + 3, R.z0 - t, R.z1),
      roof: slab(R.x0 - 4, R.x1 + 4, R.h + 3, R.h + 3.6, R.z0 - 5, R.z1 + 3),
      floor: slab(R.x0, R.x1, -0.3, 0.02, R.z0, R.z1),
      top: slab(BENCH.x0, BENCH.x1, TOP - 0.3, TOP, BENCH.z0, BENCH.z1),
      room: mergeParts(roomParts()), outside: mergeParts(outsideParts()), hills: farHills(),
      apron: slab(R.x0 - 20, R.x1 + 60, -0.2, 0.15, R.z1, R.z1 + 60),
    }
  }, [])
  // 碎石路：从门前往东到升压站，再拐上山
  // 碎石路：一条从南边山谷进来到运维站门前，一条从门前往东到升压站，再拐上山
  const roads = useMemo(() => [
    [[60, 1900], [-40, 1300], [40, 800], [90, 400], [110, 120], [120, 50]],
    [[120, 50], [300, 60], [440, 40], [470, -60], [420, -400], [340, -900], [300, -1400], [300, -1680]],
    [[340, -900], [0, -1300], [-400, -2000], [-500, -2700]],
  ].map(r => roadGeo(r as [number, number][])), [])
  const R = ROOM
  return (
    <group>
      <hemisphereLight args={['#e8eef4', '#7a7466', indoor ? 0.55 : 0.4]} />
      <Key at={light} aim={aim} on={indoor} />
      {/* 地形、远山、门前的混凝土场地、碎石路 */}
      <mesh geometry={geo.terrain} receiveShadow><meshStandardMaterial map={tex.grass} vertexColors color="#a2a888" roughness={0.97} /></mesh>
      <mesh geometry={geo.hills}><Painted rough={1} metal={0} /></mesh>
      <mesh geometry={geo.apron} receiveShadow><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#c2c0b8" /></mesh>
      {roads.map((g, i) => <mesh key={i} geometry={g} receiveShadow><meshStandardMaterial map={tex.gravel} color="#e2dccd" roughness={0.95} side={THREE.DoubleSide} /></mesh>)}
      {/* 运维站：地面、墙、顶 */}
      <mesh geometry={geo.floor} receiveShadow><meshPhysicalMaterial map={tex.tile} roughness={0.32} clearcoat={0.3} /></mesh>
      <mesh geometry={geo.back} receiveShadow castShadow><meshStandardMaterial map={tex.wall} roughness={0.92} /></mesh>
      {geo.ends.map((g, i) => <mesh key={i} geometry={g} receiveShadow castShadow><meshStandardMaterial map={tex.wall} roughness={0.92} /></mesh>)}
      <mesh geometry={geo.ceil}><meshStandardMaterial color="#e4e3dd" roughness={0.95} /></mesh>
      <mesh geometry={geo.roof} castShadow><meshStandardMaterial map={tex.roof} color="#c3c9cc" metalness={0.45} roughness={0.5} /></mesh>
      {/* 外墙下面一圈灰色勒脚 */}
      <mesh position={[0, 3, R.z0 - 2.45]}><boxGeometry args={[R.x1 - R.x0 + 4.9, 6, 0.1]} /><meshStandardMaterial color="#8d918f" roughness={0.9} /></mesh>
      {/* 窗外的光：玻璃 */}
      {WIN.map(([x0, x1, y0, y1], i) => <mesh key={i} position={[(x0 + x1) / 2, (y0 + y1) / 2, R.z0 - 1.5]} renderOrder={2}><planeGeometry args={[x1 - x0, y1 - y0]} /><meshPhysicalMaterial color="#cfe0e6" transparent opacity={0.12} roughness={0.03} envMapIntensity={1.4} depthWrite={false} /></mesh>)}
      {/* 顶灯：一排排条形灯 */}
      {[-80, -50, -20, 10, 40, 70].flatMap(x => [-18, 2].map(z => <mesh key={`${x}${z}`} position={[x, R.h - 0.05, z]} rotation-x={Math.PI / 2}><planeGeometry args={[12, 1.4]} /><meshBasicMaterial color="#fff9ee" toneMapped={false} /></mesh>))}
      <mesh geometry={geo.room} castShadow receiveShadow><Painted rough={0.55} metal={0.2} /></mesh>
      <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.resin} roughness={0.38} clearcoat={0.5} clearcoatRoughness={0.25} /></mesh>
      {/* 台面上方墙上：挂板（每两格窗之间） */}
      {Object.values(ST).filter(x => x < 70).slice(0, -1).map(x => <mesh key={x} position={[x + 11, TOP + 7, R.z0 + 0.05]}><planeGeometry args={[6, 7]} /><meshStandardMaterial map={tex.peg} roughness={0.6} metalness={0.3} /></mesh>)}
      <mesh position={[ST.l4 + 11, TOP + 13.5, R.z0 + 0.06]}><planeGeometry args={[6, 6]} /><meshStandardMaterial map={tex.rules} roughness={0.8} /></mesh>
      <mesh position={[-20, R.h + 0.8, R.z1 + 0.02]}><planeGeometry args={[30, 5]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
      <mesh geometry={geo.outside} castShadow receiveShadow><Painted rough={0.75} metal={0.15} /></mesh>
      {/* 风机：一行在山梁上，T7 离运维站最近 */}
      {FARM.map(([x, z], i) => <group key={i} position={[x, ground(x, z), z]} rotation-y={0.12}><group scale={M}><Turbine detail={false} rpm={14 + i * 0.6} /></group></group>)}
      <group position={T7} rotation-y={T7_YAW}><group scale={M}><Turbine spin={spin} cut={cut} flow={flow} /></group></group>
    </group>
  )
}
