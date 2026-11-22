// 植物的一生实验室的大场景：一块菜豆试验田（六垄，从刚出苗到结荚），田边的小路上立着两只观察箱（看萌发、看根），
// 右边是育苗棚和两张工作台，左边是一棵开花的桃树。整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。
// 画面里 1 个单位约等于 10 cm；工作台上的近景、桃树伸向镜头的那两根枝是放大了画的（见规格卡“画面上的约定”）。
import { useMemo, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LabStage, Metal, Painted, lathe, makeGround, mergeParts, shell, type Label, type Part } from '@/lab-kit'
import { Flesh, Glass, LeafMat, Stake, blob, fuse, leafGeo, makeBark, makeWood, place, rng, tint, tube, type V3 } from './parts'

/** 试验田 */
export const FIELD = { x0: -24, x1: 24, z0: -39, z1: -8, rows: [-11, -16, -21, -26, -31, -36], ridge: 0.42 }
/** 两只观察箱：看萌发的（第 3 课）、看根的（第 4 课）。x、z 是箱子中心，top 是土面的高度，face 是朝镜头那面玻璃的 z */
export const GERM = { x: 15, z: -2, w: 9, d: 3, y0: 1.5, top: 7, face: -1.0 }
export const ROOT = { x: -10, z: -2, w: 13, d: 3, y0: 0.5, top: 6.5, face: -1.0 }
/** 立式放大镜（第 4 课）：镜片的圆心和半径 */
export const LENS = { x: -0.4, y: 6.6, z: 2.6, r: 4.25 }
/** 育苗棚和里面两张工作台：A 台放第 1 课和发芽率，B 台放第 2 课和无土栽培 */
export const SHED = { x0: 22, x1: 58, z0: -28, z1: -7, eave: 21, ridge: 26 }
export const BENCH = { h: 8, a: { x: 33, z: -13, w: 17, d: 8 }, b: { x: 47, z: -25, w: 19, d: 5.4 } }
export const AT = { seed: { x: 30, z: -13 }, rate: { x: 37.6, z: -13 }, jars: { x: 43.8, z: -25 }, hydro: { x: 52.6, z: -25 } }
/** 桃树，和伸向镜头的两根枝上的位置：花（第 6、7 课）、另一朵花、叶芽（第 5 课） */
export const TREE = { x: -38, z: -18 }
export const FLOWER_A: V3 = [-30.2, 9.42, -8.6], FLOWER_B: V3 = [-27.1, 9.78, -8.3], BUD_AT: V3 = [-48.5, 8.9, -5.5]

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  s1: spot(AT.seed.x, BENCH.h + 0.7, AT.seed.z, 7.4, 4.0, [-0.3, 0.5]),
  s2: spot(AT.jars.x, BENCH.h + 1.45, AT.jars.z + 0.3, 10.6, 4.3, [0.12, 0.24]),
  s3: spot(GERM.x, 7.5, GERM.z, 9.6, 11.2, [0.26, 0.07]),
  s4: spot(-6.4, 6.2, ROOT.z + 1, 21.5, 11.5, [-0.2, 0.09]),
  s4b: spot(LENS.x + 0.9, LENS.y, LENS.z, 9.6, 9.2, [-0.06, 0.03]),
  s5: spot(BUD_AT[0], BUD_AT[1] + 0.95, BUD_AT[2], 4.4, 3.6, [1.45, 0.12]),
  s5b: spot(BUD_AT[0], BUD_AT[1] + 4.1, BUD_AT[2], 8.6, 10.4, [1.45, 0.08]),
  s6: spot(TREE.x + 3, 13, TREE.z + 3, 34, 25, [-0.5, 0.1]),
  s6b: spot(FLOWER_A[0] + 0.7, FLOWER_A[1] + 1.45, FLOWER_A[2], 5.9, 3.9, [-0.5, 0.2]),
  s7: spot(FLOWER_A[0], FLOWER_A[1] + 1.5, FLOWER_A[2] + 0.3, 3.0, 2.9, [-0.5, 0.1]),
  s7c: spot(FLOWER_A[0], FLOWER_A[1] + 1.02, FLOWER_A[2] + 0.25, 2.5, 1.8, [-0.5, 0.08]),
  s7b: spot(FLOWER_A[0], FLOWER_A[1] + 1.75, FLOWER_A[2], 5.2, 4.6, [-0.5, 0.1]),
  rate: spot(AT.rate.x, BENCH.h + 0.5, AT.rate.z, 7.2, 4.4, [-0.4, 0.62]),
  hydro: spot(AT.hydro.x, BENCH.h + 2.5, AT.hydro.z + 0.2, 8.6, 6.4, [-0.16, 0.16]),
  field: spot(2, 4, -20, 54, 25, [-0.42, 0.28]),
}
export type SpotKey = keyof typeof SPOT
/** 每一课用它代替 LabStage：只要说在哪一处，机位、天光都从这里取。shift 把看向的点挪一点，span 换一个取景范围 */
export function Room({ at, labels, children = null, span, shift }: { at: SpotKey; labels: Label[]; children?: ReactNode; span?: [number, number]; shift?: V3 }) {
  const v = SPOT[at], sx = shift?.[0] ?? 0, sy = shift?.[1] ?? 0, sz = shift?.[2] ?? 0, w = span?.[0] ?? v.span[0], h = span?.[1] ?? v.span[1]
  const target = useMemo(() => v.target.clone().add(new THREE.Vector3(sx, sy, sz)), [v, sx, sy, sz])
  const sp = useMemo<[number, number]>(() => [w, h], [w, h])
  return <LabStage labels={labels} target={target} span={sp} view={v.view} sun={3.1} env={0.95} fog={[160, 620]}>{children}</LabStage>
}

// ---------- 试验田里的菜豆 ----------
const LEAFLETS = [0, 1, 2, 3].map(i => leafGeo({ len: 1, wid: 0.72, basePow: 0.62, tipPow: 0.85, curl: 0.12 + i * 0.06, fold: 0.2 + (i % 2) * 0.16, wave: 0.05, base: i % 2 ? '#3f7d33' : '#356f2e', tip: i > 1 ? '#6fa544' : '#5b983c', nu: 7, nv: 2 }))
const PETALS = [leafGeo({ len: 1, wid: 0.9, basePow: 1.5, tipPow: 0.6, curl: -0.25, fold: 0, cup: 0.5, base: '#e9e2f2', tip: '#ffffff', back: '#d9cfe6', nu: 4, nv: 1 })]
/**
 * 一株菜豆的参数化模型：一根略歪的茎，每个节伸出一根叶柄，托着三片小叶（最下面一对是单叶）；高矮、节数、朝向逐株随机。
 * stage：0 刚出土（两片子叶、一对真叶），1 幼苗，2 开花，3 结荚。返回叶和茎两组模型，原点在茎基
 */
export function beanPlant(r: () => number, stage: number) {
  const leaf: THREE.BufferGeometry[] = [], body: THREE.BufferGeometry[] = []
  const h = [1.25, 2.7, 4.3, 5.0][stage] * (0.78 + r() * 0.44), lx = (r() - 0.5) * 0.55, lz = (r() - 0.5) * 0.55
  const pts: V3[] = [[0, -0.1, 0], [lx * h * 0.1, h * 0.4, lz * h * 0.1], [lx * h * 0.22, h * 0.75, lz * h * 0.22], [lx * h * 0.3, h, lz * h * 0.3]]
  body.push(tube(pts, 0.055 + stage * 0.02, 0.03, '#6c8a43', '#93b35a', 6, 9))
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal'), P = new THREE.Vector3()
  const leaflet = (at: THREE.Vector3, yaw: number, pitch: number, s: number) => leaf.push(place(LEAFLETS[Math.floor(r() * 4)].clone(), [at.x, at.y, at.z], yaw, pitch, [s * (0.85 + r() * 0.3), s, s]))
  const a0 = r() * 6.28
  if (stage === 0) {
    curve.getPointAt(0.62, P)
    for (const s of [0, 1]) body.push(place(blob(0.2, 0.07, 0.3, '#b7c08a', '#cfd69c', 8, 6), [P.x + Math.sin(a0 + s * Math.PI) * 0.22, P.y, P.z + Math.cos(a0 + s * Math.PI) * 0.22], a0 + s * Math.PI, 0.3))
    curve.getPointAt(1, P)
    for (const s of [0, 1]) leaflet(P, a0 + 1.57 + s * Math.PI, -0.15 + r() * 0.3, 0.75 + r() * 0.25)
    return { leaf, body }
  }
  curve.getPointAt(0.3, P)
  for (const s of [0, 1]) { const yaw = a0 + s * Math.PI; body.push(tube([[P.x, P.y, P.z], [P.x + Math.sin(yaw) * 0.45, P.y + 0.28, P.z + Math.cos(yaw) * 0.45]], 0.03, 0.022, '#7c9a4c', '#93b35a', 5, 3)); leaflet(new THREE.Vector3(P.x + Math.sin(yaw) * 0.45, P.y + 0.28, P.z + Math.cos(yaw) * 0.45), yaw, 0.1 + r() * 0.3, 1.25) }
  const nodes = [0, 3, 6, 7][stage] + Math.floor(r() * 2)
  for (let k = 0; k < nodes; k++) {
    const u = 0.42 + (k / nodes) * 0.58, yaw = a0 + 1.2 + k * 2.4 + (r() - 0.5) * 0.6, up = 0.5 + r() * 0.35, L = (1.5 - u * 0.7) * (0.8 + r() * 0.4)
    curve.getPointAt(u, P)
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(up), Math.sin(up), Math.cos(yaw) * Math.cos(up)), end = P.clone().addScaledVector(dir, L), mid = P.clone().addScaledVector(dir, L * 0.55).add(new THREE.Vector3(0, 0.08, 0))
    body.push(tube([P.clone(), mid, end], 0.032, 0.02, '#7c9a4c', '#93b35a', 5, 5))
    const s = (1.35 - u * 0.5) * (0.85 + r() * 0.3), droop = 0.25 + r() * 0.4
    leaflet(end, yaw, droop, s)
    const j = P.clone().addScaledVector(dir, L * 0.74)
    for (const sd of [-1, 1]) leaflet(j, yaw + sd * (1.05 + r() * 0.3), droop + 0.1, s * 0.9)
    if (stage === 2 && k >= nodes - 4) for (let f = 0; f < 3; f++) { const fy = yaw + 1.2 + f * 2.1; for (const w of [-0.5, 0.5]) leaf.push(place(PETALS[0].clone(), [P.x + Math.sin(fy) * 0.16, P.y + 0.22 + f * 0.1, P.z + Math.cos(fy) * 0.16], fy + w, -0.9, 0.3)) }
    if (stage === 3 && k >= 1 && k < nodes - 1) for (let f = 0; f < 2; f++) {
      const py = yaw + 2 + f * 2.4, ox = Math.sin(py), oz = Math.cos(py), len = 1.1 + r() * 0.6
      body.push(place(tube([[P.x + ox * 0.05, P.y, P.z + oz * 0.05], [P.x + ox * 0.3, P.y - len * 0.35, P.z + oz * 0.3], [P.x + ox * 0.42, P.y - len * 0.75, P.z + oz * 0.42], [P.x + ox * 0.4, P.y - len, P.z + oz * 0.4]], 0.035, 0.085, '#7fa84a', '#8fbb55', 6, 8, 0.35), [0, 0, 0]))
    }
  }
  return { leaf, body }
}
const rowStage = (i: number) => [0, 1, 1, 2, 3, 3][i]
function Beans() {
  const { leaf, body } = useMemo(() => {
    const r = rng(20261121), leaf: THREE.BufferGeometry[] = [], body: THREE.BufferGeometry[] = []
    FIELD.rows.forEach((z, i) => {
      for (let x = FIELD.x0 + 2.6; x <= FIELD.x1 - 2.4; x += 2.9 - rowStage(i) * 0.1) {
        const p = beanPlant(r, rowStage(i)), at: V3 = [x + (r() - 0.5) * 0.7, FIELD.ridge, z + (r() - 0.5) * 0.5]
        p.leaf.forEach(g => leaf.push(g.translate(...at))); p.body.forEach(g => body.push(g.translate(...at)))
      }
    })
    return { leaf: fuse(leaf), body: fuse(body) }
  }, [])
  return <>
    <mesh geometry={leaf} castShadow receiveShadow><LeafMat /></mesh>
    <mesh geometry={body} castShadow receiveShadow><Flesh rough={0.6} /></mesh>
  </>
}

// ---------- 地面、田垄、小路、篱笆 ----------
function Ground() {
  const grass = useMemo(() => { const t = makeGround('#6f8a4c', '84,112,58', '150,166,96'); t.repeat.set(70, 70); return t }, [])
  const soil = useMemo(() => { const t = makeGround('#5b4433', '54,38,28', '128,100,74', 3); t.repeat.set(9, 6); return t }, [])
  const path = useMemo(() => { const t = makeGround('#a89572', '132,116,88', '196,182,150', 5); t.repeat.set(22, 3); return t }, [])
  const ridges = useMemo(() => {
    const w = FIELD.x1 - FIELD.x0, d = FIELD.z1 - FIELD.z0, g = new THREE.PlaneGeometry(w, d, 120, 124); g.rotateX(-Math.PI / 2); g.translate((FIELD.x0 + FIELD.x1) / 2, 0, (FIELD.z0 + FIELD.z1) / 2)
    const p = g.attributes.position, r = rng(4)
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), edge = Math.min(1, Math.min(x - FIELD.x0, FIELD.x1 - x, z - FIELD.z0, FIELD.z1 - z) / 1.2)
      p.setY(i, (0.04 + FIELD.ridge * Math.pow(0.5 + 0.5 * Math.cos((z + 11) / 5 * Math.PI * 2), 1.4) + (r() - 0.5) * 0.09) * Math.max(0, edge))
    }
    g.computeVertexNormals()
    return g
  }, [])
  const tufts = useMemo(() => {
    const r = rng(8), blade = leafGeo({ len: 0.8, wid: 0.13, basePow: 0.5, tipPow: 1.6, curl: 0.35, fold: 0.3, wave: 0, base: '#6f9a45', tip: '#b9cf78', back: '#7fa650', nu: 4, nv: 1 }), list: THREE.BufferGeometry[] = []
    const put = (x: number, z: number) => { const n = 4 + Math.floor(r() * 4); for (let k = 0; k < n; k++) list.push(place(blade.clone(), [x + (r() - 0.5) * 0.3, 0, z + (r() - 0.5) * 0.3], r() * 6.28, -1.0 - r() * 0.45, 0.5 + r() * 0.8)) }
    for (let i = 0; i < 950; i++) {
      const x = -62 + r() * 124, z = -52 + r() * 62
      if (x > FIELD.x0 - 0.6 && x < FIELD.x1 + 0.6 && z > FIELD.z0 - 0.6 && z < FIELD.z1 + 0.6) continue
      if (z > -7 && z < -3.4) continue                                                        // 小路上不长草
      if (x > SHED.x0 && x < SHED.x1 && z > SHED.z0 && z < SHED.z1 + 1) continue
      put(x, z)
    }
    return fuse(list)
  }, [])
  const fence = useMemo(() => {
    const parts: Part[] = [], wood = ['#a58a62', '#b0946a', '#9a8058']
    const run = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 5.5), ang = Math.atan2(-(z1 - z0), x1 - x0)
      for (let i = 0; i <= n; i++) parts.push({ p: [x0 + (x1 - x0) * i / n, 1.9, z0 + (z1 - z0) * i / n], s: [0.34, 3.8, 0.34], c: wood[i % 3] })
      for (const y of [1.3, 2.9]) parts.push({ p: [(x0 + x1) / 2, y, (z0 + z1) / 2], s: [len, 0.28, 0.12], c: wood[y > 2 ? 0 : 1], r: [0, ang, 0] })
    }
    run(FIELD.x0 - 1.6, FIELD.z1 + 0.6, FIELD.x0 - 1.6, FIELD.z0 - 1.6); run(FIELD.x0 - 1.6, FIELD.z0 - 1.6, FIELD.x1 + 1.6, FIELD.z0 - 1.6); run(FIELD.x1 + 1.6, FIELD.z0 - 1.6, FIELD.x1 + 1.6, FIELD.z1 + 0.6)
    return mergeParts(parts)
  }, [])
  const names = ['出苗', '幼苗', '幼苗', '开花', '结荚', '结荚']
  return <>
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow><planeGeometry args={[700, 700]} /><meshStandardMaterial map={grass} roughness={1} /></mesh>
    <mesh geometry={ridges} receiveShadow><meshStandardMaterial map={soil} roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[2, 0.015, -5.2]} receiveShadow><planeGeometry args={[130, 3.6]} /><meshStandardMaterial map={path} roughness={1} /></mesh>
    <mesh geometry={tufts} receiveShadow><LeafMat rough={0.8} /></mesh>
    <mesh geometry={fence} castShadow receiveShadow><Painted rough={0.9} metal={0} /></mesh>
    {FIELD.rows.map((z, i) => <Stake key={z} at={[FIELD.x0 + 0.9, 0.1, z + 1.6]} text={names[i]} sub={`第 ${i + 1} 垄`} yaw={0.5} s={1.25} />)}
  </>
}
/** 远处：一圈树篱、几棵树、低低的山 */
function Far() {
  const { bush, hills } = useMemo(() => {
    const r = rng(31), list: THREE.BufferGeometry[] = []
    const lump = (x: number, z: number, s: number, tall = 1) => {
      const g = new THREE.SphereGeometry(1, 18, 12), p = g.attributes.position
      for (let i = 0; i < p.count; i++) { const k = 1 + 0.13 * Math.sin(p.getX(i) * 5 + x) * Math.cos(p.getY(i) * 4 + z) + 0.08 * Math.sin(p.getZ(i) * 9 + p.getX(i) * 7); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k) }
      g.computeVertexNormals()
      list.push(place(tint(g, r() < 0.5 ? '#274a26' : '#30572a', r() < 0.5 ? '#557f3c' : '#648a42'), [x, s * tall * 0.75, z], r() * 6, 0, [s, s * tall, s]))
    }
    for (let x = -130; x <= 130; x += 5 + r() * 3) lump(x, -70 - r() * 8, 3.6 + r() * 2.4)
    for (let z = -60; z <= 10; z += 7 + r() * 4) { lump(-78 - r() * 10, z, 3.6 + r() * 2.4); lump(84 + r() * 10, z, 3.6 + r() * 2.4) }
    for (let i = 0; i < 9; i++) { const x = -118 + i * 29 + r() * 8, z = -92 - r() * 24, s = 6 + r() * 3; list.push(place(tint(new THREE.CylinderGeometry(0.8, 1.2, s * 2.4, 7), '#5a4636'), [x, s * 1.2, z])); for (let k = 0; k < 4; k++) list.push(place(tint(new THREE.SphereGeometry(1, 12, 9), '#2b5129', '#5f8a40'), [x + (r() - 0.5) * s, s * 2.2 + r() * s * 1.2, z + (r() - 0.5) * s], 0, 0, s * (0.75 + r() * 0.4))) }
    const hl: THREE.BufferGeometry[] = []
    for (let i = 0; i < 6; i++) hl.push(place(tint(new THREE.SphereGeometry(1, 24, 12), '#4f6f50', '#7f9a78'), [-260 + i * 105 + r() * 30, -6, -300 - r() * 60], 0, 0, [110 + r() * 50, 30 + r() * 18, 60]))
    return { bush: fuse(list), hills: fuse(hl) }
  }, [])
  return <>
    <mesh geometry={bush} castShadow receiveShadow><Flesh rough={0.95} /></mesh>
    <mesh geometry={hills}><Flesh rough={1} /></mesh>
  </>
}

// ---------- 观察箱 ----------
/** 一只观察箱：木框，装满土，朝镜头的一面是玻璃，土里的东西贴着玻璃看得见 */
function SoilBox({ x, z, w, d, y0, top, legs }: { x: number; z: number; w: number; d: number; y0: number; top: number; legs: boolean }) {
  const face = useMemo(() => { const t = makeGround('#3f2f24', '30,21,15', '104,82,60', 12); t.repeat.set(w / 7, 0.8); return t }, [w])
  const soil = useMemo(() => { const t = makeGround('#4a382a', '46,32,24', '110,86,62', 3); t.repeat.set(w / 5, 1); return t }, [w])
  const wood = useMemo(() => { const t = makeWood(); t.repeat.set(w / 6, 1); return t }, [w])
  const h = top - y0
  return (
    <group position={[x, 0, z]}>
      {/* 土：比木框低一点；朝镜头那面是一层层的剖面 */}
      <mesh position={[0, y0 + h / 2 - 0.1, -0.3]} receiveShadow><boxGeometry args={[w - 0.3, h - 0.2, d - 0.9]} /><meshStandardMaterial map={soil} roughness={1} /></mesh>
      <mesh position={[0, top - 0.2, 0.98]} receiveShadow><boxGeometry args={[w - 0.3, 0.1, 0.5]} /><meshStandardMaterial map={soil} roughness={1} /></mesh>
      <mesh position={[0, y0 + h / 2 - 0.1, d / 2 - 0.74]} receiveShadow><planeGeometry args={[w - 0.3, h - 0.2]} /><meshStandardMaterial map={face} roughness={1} /></mesh>
      {/* 木框：底板、背板、两块侧板、四角的立柱、前面上下两根横档 */}
      <mesh position={[0, y0 - 0.15, 0]} castShadow receiveShadow><boxGeometry args={[w + 0.3, 0.3, d + 0.2]} /><meshStandardMaterial map={wood} roughness={0.85} /></mesh>
      <mesh position={[0, y0 + h / 2, -d / 2]} castShadow receiveShadow><boxGeometry args={[w, h + 0.3, 0.24]} /><meshStandardMaterial map={wood} roughness={0.85} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * w / 2, y0 + h / 2, 0]} rotation-y={Math.PI / 2} castShadow receiveShadow><boxGeometry args={[d, h + 0.3, 0.24]} /><meshStandardMaterial map={wood} roughness={0.85} /></mesh>)}
      {[-1, 1].map(s => <RoundedBox key={s} args={[0.5, top + 0.5, 0.5]} radius={0.06} position={[s * (w / 2 + 0.05), (top + 0.5) / 2, d / 2 - 0.1]} castShadow receiveShadow><meshStandardMaterial color="#7d6240" roughness={0.85} /></RoundedBox>)}
      {[y0 + 0.05, top + 0.12].map(y => <RoundedBox key={y} args={[w + 0.3, 0.34, 0.3]} radius={0.05} position={[0, y, d / 2 - 0.08]} castShadow><meshStandardMaterial color="#84683f" roughness={0.85} /></RoundedBox>)}
      {legs && [-1, 1].map(s => <RoundedBox key={s} args={[0.5, y0, 0.5]} radius={0.06} position={[s * (w / 2 + 0.05), y0 / 2, -d / 2 + 0.1]} castShadow><meshStandardMaterial color="#7d6240" roughness={0.85} /></RoundedBox>)}
      {/* 玻璃 */}
      <mesh position={[0, y0 + h / 2, d / 2 - 0.2]} renderOrder={5}><boxGeometry args={[w - 0.1, h, 0.08]} /><meshPhysicalMaterial color="#a9c6c9" transparent opacity={0.07} roughness={0.08} clearcoat={0.6} envMapIntensity={0.35} depthWrite={false} /></mesh>
    </group>
  )
}
/** 看根的那只箱子上长着的四株菜豆，和它们贴着玻璃长的根 */
export const ROOT_PLANTS = [-4.4, -1.5, 1.6, 4.5]
function RootBoxPlants() {
  const { leaf, body, roots } = useMemo(() => {
    const r = rng(77), leaf: THREE.BufferGeometry[] = [], body: THREE.BufferGeometry[] = [], roots: THREE.BufferGeometry[] = []
    ROOT_PLANTS.forEach((dx, i) => {
      const p = beanPlant(r, i === 1 ? 2 : 1), at: V3 = [ROOT.x + dx, ROOT.top - 0.15, ROOT.face]
      p.leaf.forEach(g => leaf.push(g.translate(...at))); p.body.forEach(g => body.push(g.translate(...at)))
      // 主根往下，侧根斜着岔出去，越往下越细
      const zf = ROOT.face, depth = 4.2 + r() * 0.9, x0 = ROOT.x + dx
      const main: V3[] = [[x0, ROOT.top - 0.1, zf], [x0 + 0.1, ROOT.top - 0.9, zf], [x0 - 0.2 + r() * 0.3, ROOT.top - depth * 0.55, zf], [x0 + (r() - 0.5) * 0.5, ROOT.top - depth, zf]]
      roots.push(tube(main, 0.1, 0.022, '#d9cdae', '#efe7d0', 6, 14))
      for (let k = 0; k < 11; k++) {
        const y = ROOT.top - 0.5 - (k + r() * 0.7) * (depth - 1.3) / 11, sd = r() < 0.5 ? 1 : -1, L = (1.9 - k * 0.11) * (0.45 + r() * 0.8), dip = 0.25 + r() * 0.7
        const end: V3 = [x0 + sd * L, y - L * dip, zf]
        roots.push(tube([[x0, y, zf], [x0 + sd * L * 0.45, y - L * dip * 0.25 - r() * 0.1, zf + 0.02], end], 0.04, 0.01, '#d9cdae', '#efe7d0', 5, 8))
        if (r() < 0.6) roots.push(tube([[x0 + sd * L * 0.5, y - L * dip * 0.3, zf], [x0 + sd * L * 0.62, y - L * dip * 0.3 - 0.4 - r() * 0.5, zf]], 0.018, 0.007, '#e4dabd', '#efe7d0', 4, 4))
      }
    })
    return { leaf: fuse(leaf), body: fuse(body), roots: fuse(roots) }
  }, [])
  return <>
    <mesh geometry={leaf} castShadow receiveShadow><LeafMat /></mesh>
    <mesh geometry={body} castShadow><Flesh rough={0.6} /></mesh>
    <mesh geometry={roots}><Flesh rough={0.8} /></mesh>
  </>
}

// ---------- 育苗棚 ----------
function Bench({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  const top = useMemo(() => { const t = makeWood('#a98454', '84,58,32', '208,172,122', 3, 3); t.repeat.set(w / 7, d / 7); return t }, [w, d])
  const legs = useMemo(() => mergeParts([-1, 1].flatMap(sx => [-1, 1].map(sz => ({ p: [sx * (w / 2 - 0.7), (BENCH.h - 0.5) / 2, sz * (d / 2 - 0.6)], s: [0.6, BENCH.h - 0.5, 0.6], c: '#6f5636' } as Part))).concat([
    { p: [0, 2.2, -(d / 2 - 0.6)], s: [w - 1.4, 0.5, 0.3], c: '#7a6040' }, { p: [0, 2.2, d / 2 - 0.6], s: [w - 1.4, 0.5, 0.3], c: '#7a6040' }, { p: [0, 2.5, 0], s: [w - 1, 0.16, d - 1], c: '#8a6e48' },
    { p: [0, BENCH.h - 0.85, d / 2 - 0.25], s: [w - 0.6, 0.7, 0.2], c: '#7a6040' }, { p: [0, BENCH.h - 0.85, -(d / 2 - 0.25)], s: [w - 0.6, 0.7, 0.2], c: '#7a6040' },
  ])), [w, d])
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[w, 0.5, d]} radius={0.08} position={[0, BENCH.h - 0.25, 0]} castShadow receiveShadow><meshStandardMaterial map={top} roughness={0.7} /></RoundedBox>
      <mesh geometry={legs} castShadow receiveShadow><Painted rough={0.9} metal={0} /></mesh>
    </group>
  )
}
const POT = shell([[0, 0], [0.42, 0], [0.62, 0.9], [0.7, 0.9], [0.7, 1.02]], 0.06, { segs: 24 })
/** 一盘穴盘苗：黑色的盘，一格一棵小苗 */
function Tray({ at, yaw = 0, seed = 1 }: { at: V3; yaw?: number; seed?: number }) {
  const g = useMemo(() => {
    const r = rng(seed), leaf: THREE.BufferGeometry[] = [], l = leafGeo({ len: 0.36, wid: 0.3, basePow: 0.7, tipPow: 0.8, curl: 0.2, fold: 0.2, base: '#4a8a38', tip: '#86b955', nu: 4, nv: 1 })
    for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
      const x = -1.75 + i * 0.5, z = -0.75 + j * 0.5, h = 0.3 + r() * 0.35, a = r() * 6.28
      leaf.push(place(tube([[0, 0, 0], [0.02, h, 0]], 0.022, 0.018, '#9ab868', '#9ab868', 5, 2), [x, 0.22, z]))
      for (const s of [0, 1]) leaf.push(place(l.clone(), [x, 0.22 + h, z], a + s * Math.PI, -0.2 + r() * 0.3, 0.7 + r() * 0.6))
    }
    return fuse(leaf)
  }, [seed])
  return (
    <group position={at} rotation-y={yaw}>
      <RoundedBox args={[4.3, 0.26, 2.3]} radius={0.05} position={[0, 0.13, 0]} castShadow receiveShadow><meshStandardMaterial color="#23272a" roughness={0.7} /></RoundedBox>
      <mesh position={[0, 0.262, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[4.1, 2.1]} /><meshStandardMaterial color="#3b2c21" roughness={1} /></mesh>
      <mesh geometry={g} castShadow><LeafMat /></mesh>
    </group>
  )
}
function Shed() {
  const frame = useMemo(() => {
    const { x0, x1, z0, z1, eave, ridge } = SHED, parts: Part[] = [], c = '#7d6444', c2 = '#8a7050'
    const xs = [x0, (x0 + x1) / 2, x1]
    for (const x of xs) { parts.push({ p: [x, ridge / 2, z1], s: [0.7, ridge, 0.7], c }); parts.push({ p: [x, eave / 2, z0], s: [0.7, eave, 0.7], c }) }
    const slope = Math.hypot(z1 - z0, ridge - eave), ang = Math.atan2(ridge - eave, z1 - z0)
    for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 8) parts.push({ p: [x, (eave + ridge) / 2 + 0.2, (z0 + z1) / 2], s: [0.3, 0.5, slope + 1.6], c: c2, r: [-ang, 0, 0] })
    parts.push({ p: [(x0 + x1) / 2, ridge - 0.1, z1], s: [x1 - x0 + 1.4, 0.6, 0.5], c }, { p: [(x0 + x1) / 2, eave - 0.1, z0], s: [x1 - x0 + 1.4, 0.6, 0.5], c })
    // 后墙：一块块竖着的木板，中间留一扇窗
    for (let x = x0 + 0.6, i = 0; x < x1; x += 1.2, i++) {
      const win = x > x0 + 7 && x < x0 + 14
      if (win) { parts.push({ p: [x, 4.2, z0 + 0.1], s: [1.14, 8.4, 0.2], c: i % 2 ? '#917652' : '#86694a' }); parts.push({ p: [x, 17.6, z0 + 0.1], s: [1.14, 6.4, 0.2], c: i % 2 ? '#917652' : '#86694a' }) }
      else parts.push({ p: [x, eave / 2 - 0.2, z0 + 0.1], s: [1.14, eave - 0.6, 0.2], c: i % 3 === 0 ? '#917652' : i % 3 === 1 ? '#86694a' : '#8c7150' })
    }
    // 后墙上的搁板
    parts.push({ p: [48, 13.6, z0 + 1], s: [18, 0.24, 1.9], c: '#9a7c52' }, { p: [40.4, 13, z0 + 0.9], s: [0.2, 1.2, 1.6], c }, { p: [55.6, 13, z0 + 0.9], s: [0.2, 1.2, 1.6], c })
    return mergeParts(parts)
  }, [])
  const floor = useMemo(() => { const t = makeGround('#8c7a62', '112,98,78', '168,152,126', 9); t.repeat.set(8, 5); return t }, [])
  const slope = Math.hypot(SHED.z1 - SHED.z0, SHED.ridge - SHED.eave), ang = Math.atan2(SHED.ridge - SHED.eave, SHED.z1 - SHED.z0)
  const cx = (SHED.x0 + SHED.x1) / 2, cz = (SHED.z0 + SHED.z1) / 2
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.02, cz]} receiveShadow><planeGeometry args={[SHED.x1 - SHED.x0 + 2, SHED.z1 - SHED.z0 + 2]} /><meshStandardMaterial map={floor} roughness={1} /></mesh>
      <mesh geometry={frame} castShadow receiveShadow><Painted rough={0.9} metal={0} /></mesh>
      {/* 透光的棚顶：阳光照得进来 */}
      <mesh position={[cx, (SHED.eave + SHED.ridge) / 2 + 0.55, cz]} rotation-x={Math.PI / 2 - ang}><planeGeometry args={[SHED.x1 - SHED.x0 + 2, slope + 2]} /><meshPhysicalMaterial color="#dfe9e4" transparent opacity={0.28} roughness={0.35} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {/* 窗玻璃 */}
      <mesh position={[SHED.x0 + 10.5, 11.4, SHED.z0 + 0.1]}><planeGeometry args={[7.2, 6]} /><Glass opacity={0.16} /></mesh>
      <Bench {...BENCH.a} />
      <Bench {...BENCH.b} />
      {/* 搁板上的花盆、穴盘 */}
      {[41.6, 43.2, 44.8].map((x, i) => <mesh key={x} geometry={POT} position={[x, 13.72, SHED.z0 + 1]} scale={1.1 - i * 0.12} castShadow><meshStandardMaterial color="#b0603c" roughness={0.85} side={THREE.DoubleSide} /></mesh>)}
      <Tray at={[49, 13.72, SHED.z0 + 1.05]} seed={3} />
      <Tray at={[53.6, 13.72, SHED.z0 + 1.05]} seed={5} />
      {/* 地上：一摞花盆、一袋营养土、几盘苗 */}
      {[0, 1, 2].map(i => <mesh key={i} geometry={POT} position={[24.6, 0.02 + i * 0.34, -24.5]} scale={1.9} castShadow><meshStandardMaterial color="#b0603c" roughness={0.85} side={THREE.DoubleSide} /></mesh>)}
      <RoundedBox args={[4, 1.5, 2.6]} radius={0.5} position={[29, 0.8, -25]} rotation-y={0.3} castShadow receiveShadow><meshStandardMaterial color="#c9b68c" roughness={0.95} /></RoundedBox>
      <Tray at={[36, 2.62, -13]} seed={7} /><Tray at={[30.6, 2.62, -13]} yaw={0.05} seed={9} />
      <Tray at={[45, 2.62, -25]} seed={11} /><Tray at={[50.4, 2.62, -25]} seed={13} />
    </group>
  )
}

// ---------- 桃树 ----------
const BLOSSOM = (() => {
  const petal = leafGeo({ len: 0.3, wid: 0.27, basePow: 1.55, tipPow: 0.55, curl: -0.3, fold: 0, cup: 0.7, wave: 0.02, base: '#e58aa6', tip: '#fbdde6', back: '#f0b6c6', nu: 4, nv: 1 }), list: THREE.BufferGeometry[] = []
  for (let k = 0; k < 5; k++) list.push(place(petal.clone(), [0, 0, 0], k * Math.PI * 2 / 5, -0.35))
  list.push(place(blob(0.07, 0.05, 0.07, '#d8a43a', '#f2d46a', 8, 6), [0, 0.05, 0]))
  return fuse(list)
})()
function Peach() {
  const bark = useMemo(() => { const t = makeBark(); t.repeat.set(3, 6); return t }, [])
  const { wood, hero, flowers } = useMemo(() => {
    const r = rng(404), wood: THREE.BufferGeometry[] = [], spots: { p: THREE.Vector3; n: THREE.Vector3 }[] = []
    const T = new THREE.Vector3(TREE.x, 0, TREE.z), V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).add(T)
    wood.push(tube([V(0, -0.3, 0), V(0.25, 3.5, 0.1), V(-0.1, 6.5, 0.25), V(0.2, 9, 0.2)], 1.25, 0.95, '#6b5548', '#6b5548', 12, 12))
    const dress = (pts: THREE.Vector3[], every: number) => {
      const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), n = Math.floor(c.getLength() / every)
      for (let i = 1; i <= n; i++) { const p = c.getPointAt(i / (n + 0.3)), d = new THREE.Vector3(r() - 0.5, r() * 0.9 + 0.1, r() - 0.5).normalize(); spots.push({ p: p.addScaledVector(d, 0.12), n: d }) }
    }
    for (let k = 0; k < 6; k++) {
      const az = k * 1.047 + (r() - 0.5) * 0.5, el = 0.55 + r() * 0.35, L = 10 + r() * 4, dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el))
      const a = V(0.1, 8.3 + r() * 0.8, 0.2), mid = a.clone().addScaledVector(dir, L * 0.5).add(new THREE.Vector3(0, 0.9, 0)), end = a.clone().addScaledVector(dir, L).add(new THREE.Vector3(0, -0.6, 0))
      const limb = [a, mid, end]; wood.push(tube(limb, 0.62, 0.16, '#6b5548', '#7a5f4e', 8, 12)); dress(limb.slice(1), 0.8)
      const lc = new THREE.CatmullRomCurve3(limb)
      for (let j = 0; j < 5; j++) {
        const s = lc.getPointAt(0.3 + j * 0.15), baz = az + (j % 2 ? 1 : -1) * (0.7 + r() * 0.6), bel = 0.2 + r() * 0.7, BL = 4.5 + r() * 3.5, bd = new THREE.Vector3(Math.cos(baz) * Math.cos(bel), Math.sin(bel), Math.sin(baz) * Math.cos(bel))
        const br = [s, s.clone().addScaledVector(bd, BL * 0.5).add(new THREE.Vector3(0, 0.4, 0)), s.clone().addScaledVector(bd, BL)]
        wood.push(tube(br, 0.2, 0.05, '#7a5f4e', '#8a6a55', 6, 9)); dress(br, 0.42)
        const bc = new THREE.CatmullRomCurve3(br)
        for (let m = 0; m < 4; m++) {
          const q = bc.getPointAt(0.25 + m * 0.2), taz = baz + (m % 2 ? 1 : -1) * (0.8 + r() * 0.5), td = new THREE.Vector3(Math.cos(taz) * 0.8, 0.35 + r() * 0.5, Math.sin(taz) * 0.8), TL = 2 + r() * 1.8
          const tw = [q, q.clone().addScaledVector(td, TL)]; wood.push(tube(tw, 0.06, 0.02, '#8a6a55', '#9a6f5a', 5, 4)); dress(tw, 0.36)
        }
      }
    }
    // 伸向镜头的两根枝：上面的花和芽是放大了画的
    const hero = [
      tube([V(0.4, 8, 0.2), new THREE.Vector3(-35.6, 9.5, -13), new THREE.Vector3(-33.2, 9.2, -9.85), new THREE.Vector3(FLOWER_A[0], FLOWER_A[1] - 0.14, FLOWER_A[2]), new THREE.Vector3(FLOWER_B[0], FLOWER_B[1] - 0.12, FLOWER_B[2]), new THREE.Vector3(-25.2, 10.1, -8.2)], 0.55, 0.07, '#7a5f4e', '#9a6a52', 10, 40, 0.5),
      tube([V(-0.3, 7.6, 0.3), new THREE.Vector3(-42, 8.5, -12.6), new THREE.Vector3(-45.6, 8.6, -8.7), new THREE.Vector3(BUD_AT[0], BUD_AT[1] - 0.4, BUD_AT[2]), new THREE.Vector3(-50.6, 8.7, -3.1), new THREE.Vector3(-52, 9.2, -1.4)], 0.64, 0.3, '#7a5f4e', '#8f6a55', 12, 44, 0.6),
    ]
    const mesh = new THREE.InstancedMesh(BLOSSOM, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.FrontSide }), spots.length)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color()
    spots.forEach((s, i) => { q.setFromUnitVectors(up, s.n); const k = 1.1 + r() * 0.9; m.compose(s.p, q, new THREE.Vector3(k, k, k)); mesh.setMatrixAt(i, m); mesh.setColorAt(i, c.setHSL(0.94 + r() * 0.04, 0.5, 0.82 + r() * 0.16)) })
    mesh.castShadow = true; mesh.instanceMatrix.needsUpdate = true
    return { wood: fuse(wood), hero: fuse(hero), flowers: mesh }
  }, [])
  return <>
    <mesh geometry={wood} castShadow receiveShadow><meshStandardMaterial vertexColors map={bark} roughness={0.95} /></mesh>
    <mesh geometry={hero} castShadow receiveShadow><meshStandardMaterial vertexColors map={bark} roughness={0.92} /></mesh>
    <primitive object={flowers} />
  </>
}

// ---------- 零碎的陈设 ----------
const BUCKET = shell([[0, 0], [1.0, 0], [1.3, 2.4], [1.38, 2.4], [1.38, 2.52]], 0.07, { segs: 32 })
const CAN = lathe([[0, 0], [1.05, 0], [1.1, 0.1], [1.1, 2.3], [0.9, 2.6], [0.6, 2.7], [0, 2.7]], { segs: 32 })
function Props() {
  const spout = useMemo(() => tube([[1, 0.7, 0], [1.9, 1.5, 0], [2.7, 2.7, 0], [3.0, 3.0, 0]], 0.2, 0.11, '#ffffff', '#ffffff', 10, 12), [])
  return <>
    {/* 水桶和喷壶：放在两只观察箱之间的小路边 */}
    <group position={[8.6, 0, 0.9]}>
      <mesh geometry={BUCKET} castShadow receiveShadow><Metal kind="zinc" grain="brushed" /></mesh>
      <mesh position={[0, 2.05, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[1.2, 32]} /><meshPhysicalMaterial color="#5f8fa0" roughness={0.08} transparent opacity={0.85} /></mesh>
      <mesh position={[0, 2.5, 0]} rotation-z={0.5}><torusGeometry args={[1.42, 0.05, 8, 32, Math.PI]} /><Metal kind="steel" /></mesh>
    </group>
    <group position={[6.0, 0, -1.4]} rotation-y={2.5}>
      <mesh geometry={CAN} castShadow receiveShadow><meshPhysicalMaterial color="#3f7a5a" roughness={0.4} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>
      <mesh geometry={spout} castShadow><meshPhysicalMaterial color="#3f7a5a" roughness={0.4} clearcoat={0.5} /></mesh>
      <mesh position={[3.05, 3.05, 0]} rotation-z={-0.78}><cylinderGeometry args={[0.36, 0.12, 0.3, 16]} /><Metal kind="brass" grain="turned" /></mesh>
      <mesh position={[-0.7, 1.7, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.85, 0.09, 8, 24, Math.PI * 1.2]} /><meshPhysicalMaterial color="#3f7a5a" roughness={0.4} clearcoat={0.5} /></mesh>
    </group>
    {/* 靠在篱笆上的铁锹和锄头 */}
    <group position={[FIELD.x1 + 1.2, 0, -10.5]} rotation-z={0.16}>
      <mesh position={[0, 5.2, 0]} castShadow><cylinderGeometry args={[0.14, 0.16, 9, 10]} /><meshStandardMaterial color="#b89462" roughness={0.8} /></mesh>
      <RoundedBox args={[1.5, 2.2, 0.1]} radius={0.04} position={[0, 0.9, 0]} rotation-x={0.12} castShadow><Metal kind="steel" grain="brushed" rough={0.45} /></RoundedBox>
    </group>
    <group position={[FIELD.x1 + 1.25, 0, -13.2]} rotation-z={0.13}>
      <mesh position={[0, 5, 0]} castShadow><cylinderGeometry args={[0.13, 0.15, 10, 10]} /><meshStandardMaterial color="#a88758" roughness={0.8} /></mesh>
      <RoundedBox args={[0.1, 1.2, 1.7]} radius={0.04} position={[0.5, 0.5, 0]} rotation-z={1.3} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    </group>
    {/* 一只木箱，里面是刚摘的豆荚 */}
    <group position={[FIELD.x1 - 3, 0, -5.8]} rotation-y={0.3}>
      <mesh castShadow receiveShadow geometry={CRATE}><Painted rough={0.9} metal={0} /></mesh>
      <mesh geometry={PODS} castShadow><Flesh rough={0.55} /></mesh>
    </group>
    <Stake at={[GERM.x - GERM.w / 2 - 1.3, 0, GERM.z + 1.4]} text="萌发" sub="观察箱" yaw={0.35} s={1.5} />
    <Stake at={[ROOT.x - ROOT.w / 2 - 1.5, 0, ROOT.z + 1.6]} text="根" sub="观察箱" yaw={0.3} s={1.5} />
    <Stake at={[TREE.x + 4.4, 0, TREE.z + 5]} text="桃" sub="花期" yaw={0.5} s={1.6} />
  </>
}
const CRATE = mergeParts([
  { p: [0, 0.12, 0], s: [4, 0.24, 2.6], c: '#a58a62' },
  ...[0.55, 1.25, 1.95].flatMap(y => [{ p: [0, y, 1.3], s: [4.2, 0.5, 0.14], c: '#b0946a' }, { p: [0, y, -1.3], s: [4.2, 0.5, 0.14], c: '#a08258' }, { p: [2.05, y, 0], s: [0.14, 0.5, 2.6], c: '#a98c62' }, { p: [-2.05, y, 0], s: [0.14, 0.5, 2.6], c: '#a98c62' }] as Part[]),
  ...[-1, 1].flatMap(sx => [-1, 1].map(sz => ({ p: [sx * 1.98, 1.15, sz * 1.22], s: [0.24, 2.3, 0.24], c: '#8f744e' } as Part))),
])
const PODS = (() => { const r = rng(6), l: THREE.BufferGeometry[] = []; for (let i = 0; i < 46; i++) { const len = 1.2 + r() * 0.6; l.push(place(tube([[-len / 2, 0, 0], [0, 0.12, 0.05], [len / 2, 0, 0]], 0.06, 0.09, '#7fa84a', '#93bd58', 6, 6, 0.4), [(r() - 0.5) * 3, 1.4 + r() * 0.75, (r() - 0.5) * 1.8], r() * 6.28, (r() - 0.5) * 0.5)) } return fuse(l) })()

export function World() {
  return (
    <group>
      <Ground />
      <Beans />
      <Far />
      <SoilBox {...GERM} legs />
      <SoilBox {...ROOT} legs={false} />
      <RootBoxPlants />
      <Shed />
      <Peach />
      <Props />
    </group>
  )
}
