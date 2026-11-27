// 遗传和变异实验室的大场景：一座豌豆试验园。中间是四块木框豆畦（亲代高茎、亲代矮茎、子一代、子二代），
// 左边一间砖砌的小实验室（显微镜、染色体模型、看片灯），右边一座白钢架的玻璃温室，温室门口一张工作台；后面一道砖砌的园墙。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。画面里 1 个单位约等于 10 cm。
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LabStage, Metal, Painted, makeGround, mergeParts, shell, type Label, type Part } from '@/lab-kit'
import { F1_N, f2Bed, isTall } from './physics'
import { Glass, Stake, blob, fuse, leafyTree, makeBrick, makeWood, place, rng, tint, tube, type V3 } from './parts'
import { PeaPatch, variant, type Spot } from './pea'

// ---------- 布局 ----------
/** 四块豆畦：x0–x1 是长度方向，z 是这一畦的中线，rows 是几行 */
export const BED = {
  tall: { x0: -46, x1: -26, z: -20, rows: 1, name: '亲代', sub: '高茎' },
  short: { x0: -20, x1: 0, z: -20, rows: 1, name: '亲代', sub: '矮茎' },
  f1: { x0: 8, x1: 32, z: -20, rows: 1, name: '子一代', sub: '' },
  f2: { x0: 40, x1: 72, z: -21, rows: 4, name: '子二代', sub: '' },
}
export type BedKey = keyof typeof BED
const ROW_GAP = 3.2
const bedDepth = (b: typeof BED[BedKey]) => (b.rows - 1) * ROW_GAP + 5
/** 第 1 课的样品台（两块亲代畦的前面） */
export const TABLE1 = { x: -55, z: -13, h: 7.5 }
/** 小实验室：屋里靠后墙一条实验台 */
export const LAB = { x0: -104, x1: -64, z0: -36, z1: -8, wall: 30, top: 9, benchZ: -32.6 }
export const AT_LAB = { scope: -96.5, model: -92.6, cells: -82, karyo: -71 }
/** 玻璃温室：前台（第 4 课）、后台（拓展） */
export const GH = { x0: 84, x1: 124, z0: -36, z1: -6, eave: 24, ridge: 32, knee: 3.5 }
export const POTS = { tall: [98, -14] as [number, number], short: [106, -14] as [number, number] }
export const BACK = { x: 104, z: -29, h: 8 }
/** 温室门口的工作台（第 7 课） */
export const DESK = { x: 104, z: 2.5, h: 8, w: 13, d: 6 }

/** 子一代、子二代每株的位置；子二代每株的基因组成 */
const bedSpots = (b: typeof BED[BedKey], n: number, seed: number, tall: (i: number) => boolean, rowsOf = b.rows) => {
  const r = rng(seed), per = Math.ceil(n / rowsOf), out: (Spot & { tall: boolean })[] = []
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / per), k = i % per, t = tall(i)
    out.push({ x: b.x0 + 0.8 + (k + 0.5) * (b.x1 - b.x0 - 1.6) / per + (r() - 0.5) * 0.25, z: b.z - (rowsOf - 1) * ROW_GAP / 2 + row * ROW_GAP + (r() - 0.5) * 0.3, yaw: r() * 6.28, s: 0.92 + r() * 0.16, v: (t ? 0 : 4) + Math.floor(r() * (t ? 4 : 3)), tall: t })
  }
  return out
}
export const F2_GENES = f2Bed()
export const SPOTS = {
  tall: bedSpots(BED.tall, 20, 11, () => true),
  short: bedSpots(BED.short, 20, 12, () => false),
  f1: bedSpots(BED.f1, F1_N, 13, () => true),
  f2: bedSpots(BED.f2, F2_GENES.length, 14, i => isTall(F2_GENES[i])),
}

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  beds: spot(-23, 11.5, -20.5, 14, 23.5, [Math.PI - 0.75, 0.06]),
  table: spot(TABLE1.x, TABLE1.h + 0.9, TABLE1.z + 0.2, 5.0, 3.4, [-0.1, 0.45]),
  scope: spot(AT_LAB.scope + 2.1, LAB.top + 2.9, LAB.benchZ + 0.6, 7.2, 5.6, [0.18, 0.14]),
  scopeIn: spot(AT_LAB.model, LAB.top + 3.6, LAB.benchZ + 0.6, 5.2, 4.4, [0.1, 0.1]),
  cells: spot(AT_LAB.cells, LAB.top + 1.7, LAB.benchZ + 0.7, 9.6, 4.2, [-0.04, 0.55]),
  karyo: spot(AT_LAB.karyo, LAB.top + 4.2, LAB.benchZ + 0.5, 13, 9.5, [0.0, 0.08]),
  bags: spot(AT_LAB.karyo + 1.8, LAB.top + 1.2, LAB.benchZ + 2.2, 8.5, 4.6, [-0.28, 0.42]),
  pots: spot(102, 11, -14, 18, 18, [-0.2, 0.1]),
  flower: spot(POTS.tall[0] + 1.25, 12.25, POTS.tall[1] + 1.0, 4.0, 3.2, [-0.25, 0.14]),
  f1: spot(20, 9, -20, 30, 19, [0.12, 0.14]),
  f2: spot(57, 9, -20, 30, 21, [-0.16, 0.26]),
  back: spot(BACK.x - 1, BACK.h + 0.3, BACK.z + 0.5, 5.0, 2.4, [0.05, 0.5]),
  test: spot(BACK.x - 1.5, 6.5, BACK.z + 7, 19, 12, [0.02, 0.2]),
  desk: spot(DESK.x, DESK.h + 0.45, DESK.z - 1.0, 4.6, 2.4, [-0.06, 0.4]),
  field: spot(10, 8, -20, 150, 40, [-0.3, 0.3]),
}
export type SpotKey = keyof typeof SPOT
export interface WorldWant { inside?: 'lab' | 'gh' | null; f1?: number; f2?: number }
/** 每一课用它代替 LabStage：只要说在哪一处。shift 把看向的点挪一点，span 换一个取景范围 */
export function Room({ at, labels, children = null, span, shift, world }: { at: SpotKey; labels: Label[]; children?: ReactNode; span?: [number, number]; shift?: V3; world?: WorldWant }) {
  const v = SPOT[at], sx = shift?.[0] ?? 0, sy = shift?.[1] ?? 0, sz = shift?.[2] ?? 0, w = span?.[0] ?? v.span[0], h = span?.[1] ?? v.span[1]
  const target = useMemo(() => v.target.clone().add(new THREE.Vector3(sx, sy, sz)), [v, sx, sy, sz])
  const sp = useMemo<[number, number]>(() => [w, h], [w, h])
  const inside = world?.inside ?? (at === 'scope' || at === 'scopeIn' || at === 'cells' || at === 'karyo' || at === 'bags' ? 'lab' : at === 'pots' || at === 'flower' || at === 'back' || at === 'test' ? 'gh' : null)
  return <LabStage<WorldWant> labels={labels} target={target} span={sp} view={v.view} sun={inside === 'lab' ? 2.6 : 3.1} env={inside === 'lab' ? 0.7 : 0.95} fog={[260, 900]} world={{ f1: 1, f2: 1, ...world, inside }}>{children}</LabStage>
}

// ---------- 分段做模型：一次只做一样，免得进页面卡住 ----------
const made = new Map<string, unknown>(), queue: { key: string; make: () => unknown; done: Set<() => void> }[] = []
let pumping = false
function pump() {
  const t0 = performance.now()
  while (queue.length && performance.now() - t0 < 14) { const j = queue.shift()!; made.set(j.key, j.make()); j.done.forEach(f => f()) }
  if (queue.length) setTimeout(pump, 0); else pumping = false
}
export function useLazy<T>(key: string, make: () => T): T | null {
  const [, bump] = useState(0)
  useEffect(() => {
    if (made.has(key)) return
    const f = () => bump(n => n + 1)
    let j = queue.find(q => q.key === key); if (!j) { j = { key, make, done: new Set() }; queue.push(j) }
    j.done.add(f)
    if (!pumping) { pumping = true; setTimeout(pump, 0) }
    return () => { j!.done.delete(f) }
  }, [key])   // eslint-disable-line react-hooks/exhaustive-deps
  return (made.get(key) as T) ?? null
}
/** 七种豌豆变体：0–3 高茎，4–6 矮茎（都是紫花、正在开花结荚） */
const VARIANTS = [0, 1, 2, 3].map(i => ({ tall: true, stage: 2 as const, seed: 101 + i })).concat([0, 1, 2].map(i => ({ tall: false, stage: 2 as const, seed: 201 + i })))
function useVariants() {
  const list = VARIANTS.map((o, i) => useLazy(`pea${i}`, () => variant(o)))   // eslint-disable-line react-hooks/rules-of-hooks
  return list.every(Boolean) ? (list as NonNullable<typeof list[number]>[]) : null
}

// ---------- 豆畦 ----------
function Bed({ b, net, grow = 1 }: { b: typeof BED[BedKey]; net: boolean; grow?: number }) {
  const d = bedDepth(b), w = b.x1 - b.x0, cx = (b.x0 + b.x1) / 2
  const wood = useMemo(() => { const t = makeWood('#8d7350', '64,46,28', '178,152,110', 2, 7); t.repeat.set(w / 8, 1); return t }, [w])
  const soil = useMemo(() => {
    const t = makeGround('#5a4332', '46,32,24', '120,96,70', 3); t.repeat.set(w / 6, d / 6)
    const g = new THREE.PlaneGeometry(w - 0.4, d - 0.4, Math.round(w * 2), Math.round(d * 2)); g.rotateX(-Math.PI / 2)
    const p = g.attributes.position, r = rng(w * 10 + d)
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), edge = Math.min(1, Math.min(w / 2 - 0.2 - Math.abs(x), d / 2 - 0.2 - Math.abs(z)) / 1.2); p.setY(i, 1.7 + (0.25 + (r() - 0.5) * 0.12) * Math.max(0, edge)) }
    g.computeVertexNormals()
    return { t, g }
  }, [w, d])
  const sticks = useMemo(() => {
    if (!net) return null
    const list: THREE.BufferGeometry[] = []
    for (let row = 0; row < b.rows; row++) {
      const z = b.z - (b.rows - 1) * ROW_GAP / 2 + row * ROW_GAP - 0.5
      for (let x = b.x0 + 0.6; x <= b.x1 - 0.5; x += (w - 1.1) / Math.round(w / 6)) {
        list.push(tube([[x, 1.5, z], [x + 0.05, 11, z], [x - 0.03, 21, z]], 0.07, 0.05, '#8f8160', '#a39574', 6, 10))
      }
      for (let y = 4; y <= 20; y += 3.2) list.push(tube([[b.x0 + 0.6, y, z], [cx, y - 0.12, z], [b.x1 - 0.5, y, z]], 0.018, 0.018, '#a99d80', '#a99d80', 4, 12))
      for (let x = b.x0 + 1.2; x < b.x1 - 0.6; x += 1.2) list.push(tube([[x, 2, z], [x + 0.03, 20, z]], 0.012, 0.012, '#a99d80', '#a99d80', 3, 2))
    }
    return fuse(list)
  }, [b, net, w, cx])
  return <group>
    {/* 木框：四块厚木板、四角的方桩 */}
    {[-1, 1].map(s => <RoundedBox key={`l${s}`} args={[w, 2.2, 0.3]} radius={0.06} smoothness={2} position={[cx, 1.1, b.z + s * d / 2]} castShadow receiveShadow><meshStandardMaterial map={wood} roughness={0.85} /></RoundedBox>)}
    {[-1, 1].map(s => <RoundedBox key={`e${s}`} args={[0.3, 2.2, d]} radius={0.06} smoothness={2} position={[s > 0 ? b.x1 : b.x0, 1.1, b.z]} castShadow receiveShadow><meshStandardMaterial map={wood} roughness={0.85} /></RoundedBox>)}
    {[b.x0, b.x1].flatMap(x => [-1, 1].map(s => <RoundedBox key={`${x}${s}`} args={[0.5, 2.6, 0.5]} radius={0.06} smoothness={2} position={[x, 1.3, b.z + s * d / 2]} castShadow><meshStandardMaterial color="#6f5838" roughness={0.9} /></RoundedBox>))}
    <mesh geometry={soil.g} position={[cx, 0, b.z]} receiveShadow><meshStandardMaterial map={soil.t} roughness={1} /></mesh>
    {/* 架子跟着苗长：苗还小的时候只插着矮矮的一截 */}
    {sticks && <mesh geometry={sticks} scale={[1, Math.max(0.18, Math.min(1, grow * 1.2)), 1]} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.8} /></mesh>}
    <Stake at={[b.x0 + 1.6, 1.9, b.z + d / 2 - 0.6]} text={b.name} sub={b.sub || undefined} yaw={-0.1} s={1.5} />
  </group>
}
/** 一畦里的豌豆。grow：长到多高（0–1），种下以后从地里长出来 */
function BedPlants({ spots, grow = 1 }: { spots: Spot[]; grow?: number }) {
  const vs = useVariants()
  if (!vs || grow <= 0.001) return null
  return <PeaPatch spots={spots} variants={vs} grow={grow} y={1.8} />
}

// ---------- 地面、小路、园墙、远景 ----------
function Ground() {
  const grass = useMemo(() => { const t = makeGround('#6c874a', '82,108,56', '146,162,94'); t.repeat.set(90, 90); return t }, [])
  const gravel = useMemo(() => { const t = makeGround('#a99c84', '128,118,100', '206,196,174', 5); t.repeat.set(60, 2); return t }, [])
  const tufts = useMemo(() => {
    const r = rng(8), blade = new THREE.ConeGeometry(0.06, 0.9, 3, 1, true), list: THREE.BufferGeometry[] = []
    for (let i = 0; i < 1300; i++) {
      const x = -150 + r() * 320, z = -58 + r() * 70
      if (z > -9 && z < -3) continue
      if (x > -50 && x < 76 && z > -31 && z < -9) continue
      if (x > LAB.x0 - 1 && x < LAB.x1 + 1 && z > LAB.z0 - 1 && z < LAB.z1 + 1) continue
      if (x > GH.x0 - 1 && x < GH.x1 + 1 && z > GH.z0 - 1 && z < GH.z1 + 6) continue
      const n = 3 + Math.floor(r() * 4)
      for (let k = 0; k < n; k++) list.push(place(tint(blade.clone(), '#56783a', '#a8bf6e'), [x + (r() - 0.5) * 0.4, 0.4, z + (r() - 0.5) * 0.4], r() * 6, (r() - 0.5) * 0.5, 0.6 + r() * 0.9))
    }
    return fuse(list)
  }, [])
  return <>
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow><planeGeometry args={[900, 900]} /><meshStandardMaterial map={grass} roughness={1} /></mesh>
    {/* 园子前面一条碎石路，从实验室门口通到温室门口 */}
    <mesh rotation-x={-Math.PI / 2} position={[10, 0.02, -5.8]} receiveShadow><planeGeometry args={[250, 4.4]} /><meshStandardMaterial map={gravel} roughness={1} /></mesh>
    <mesh geometry={tufts} receiveShadow><meshStandardMaterial vertexColors roughness={0.9} side={THREE.DoubleSide} /></mesh>
  </>
}
function GardenWall() {
  const brick = useMemo(() => { const t = makeBrick(9); t.repeat.set(260 / 8, 26 / 8); return t }, [])
  return <group>
    <mesh position={[0, 12, -62.5]} castShadow receiveShadow><boxGeometry args={[260, 24, 1.2]} /><meshStandardMaterial map={brick} roughness={0.9} /></mesh>
    <mesh position={[0, 24.3, -62.5]} castShadow><boxGeometry args={[261, 0.7, 1.8]} /><meshStandardMaterial color="#9b9387" roughness={0.85} /></mesh>
  </group>
}
/** 园墙外和两侧的树：阔叶树，一团团叶片组成的树冠。分几批做，进页面不卡 */
const TREE_SPOTS = (() => {
  const r = rng(31), out: [number, number, number][] = []
  for (let x = -170; x <= 180; x += 12 + r() * 9) out.push([x, -72 - r() * 14, 42 + r() * 30])
  for (let z = -50; z <= 25; z += 14 + r() * 8) { out.push([-150 - r() * 14, z, 40 + r() * 25]); out.push([165 + r() * 14, z, 40 + r() * 25]) }
  return out
})()
const TREE_BATCH = 6
function TreeBatch({ i }: { i: number }) {
  const g = useLazy(`trees${i}`, () => {
    const w: THREE.BufferGeometry[] = [], l: THREE.BufferGeometry[] = []
    TREE_SPOTS.slice(i * TREE_BATCH, (i + 1) * TREE_BATCH).forEach(([x, z, h], k) => { const t = leafyTree(i * 100 + k + 7, h, 230); w.push(place(t.wood, [x, 0, z], k * 1.3)); l.push(place(t.leaves, [x, 0, z], k * 1.3)) })
    return { w: fuse(w), l: fuse(l) }
  })
  if (!g) return null
  return <>
    <mesh geometry={g.w}><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
    <mesh geometry={g.l}><meshStandardMaterial vertexColors roughness={0.8} side={THREE.DoubleSide} envMapIntensity={0.6} /></mesh>
  </>
}
function Far() {
  return <>{Array.from({ length: Math.ceil(TREE_SPOTS.length / TREE_BATCH) }, (_, i) => <TreeBatch key={i} i={i} />)}</>
}

// ---------- 小实验室 ----------
/** 一面带窗洞的墙：沿 x 宽 w、高 h、厚 t，holes 是 [x 中心, y 底, 宽, 高] */
function wallGeo(w: number, h: number, t: number, holes: [number, number, number, number][]) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath()
  for (const [x, y, hw, hh] of holes) { const p = new THREE.Path(); p.moveTo(x - hw / 2, y); p.lineTo(x - hw / 2, y + hh); p.lineTo(x + hw / 2, y + hh); p.lineTo(x + hw / 2, y); p.closePath(); s.holes.push(p) }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); g.translate(0, 0, -t / 2)
  return g
}
/** 一扇白漆木窗：窗框、十字窗棂、玻璃，窗台一块石板 */
function Window({ at, w, h, yaw = 0 }: { at: V3; w: number; h: number; yaw?: number }) {
  const frame = useMemo(() => mergeParts([
    { p: [0, h / 2 - 0.2, 0], s: [w, 0.4, 0.6], c: '#eeeae0' }, { p: [0, -h / 2 + 0.2, 0], s: [w, 0.4, 0.6], c: '#eeeae0' },
    { p: [-w / 2 + 0.2, 0, 0], s: [0.4, h, 0.6], c: '#eeeae0' }, { p: [w / 2 - 0.2, 0, 0], s: [0.4, h, 0.6], c: '#eeeae0' },
    { p: [0, 0, 0], s: [0.18, h - 0.6, 0.3], c: '#e6e2d6' }, { p: [0, h * 0.18, 0], s: [w - 0.6, 0.18, 0.3], c: '#e6e2d6' },
    { p: [0, -h / 2 - 0.25, 0.4], s: [w + 0.8, 0.35, 1.3], c: '#a9a497' },
  ]), [w, h])
  return <group position={at} rotation-y={yaw}>
    <mesh geometry={frame} castShadow receiveShadow><Painted rough={0.5} metal={0} /></mesh>
    <mesh><planeGeometry args={[w - 0.6, h - 0.6]} /><Glass opacity={0.18} /></mesh>
  </group>
}
function Bottles() {
  const BOTTLE = useMemo(() => shell([[0, 0], [0.32, 0], [0.34, 0.04], [0.34, 0.8], [0.2, 1.0], [0.13, 1.05], [0.13, 1.25]], 0.03, { segs: 20 }), [])
  const r = rng(5), list: { p: V3; c: string; s: number }[] = []
  for (const y of [LAB.top + 9.3, LAB.top + 13.3]) for (let x = LAB.x0 + 3; x < LAB.x1 - 3; x += 1.1 + r() * 0.6) if (r() < 0.75) list.push({ p: [x, y, LAB.z0 + 1.6], c: ['#7a5a30', '#d9e3e6', '#5f7d8a', '#8a3a2a', '#e9e6dc'][Math.floor(r() * 5)], s: 0.8 + r() * 0.5 })
  return <>{list.map((b, i) => <group key={i} position={b.p} scale={b.s}>
    <mesh geometry={BOTTLE} castShadow><meshPhysicalMaterial color={b.c} roughness={0.15} clearcoat={1} transparent opacity={0.75} /></mesh>
    <mesh position={[0, 1.3, 0]}><cylinderGeometry args={[0.15, 0.15, 0.18, 12]} /><meshStandardMaterial color="#20262a" roughness={0.6} /></mesh>
  </group>)}</>
}
function LabHouse({ open }: { open: boolean }) {
  const { x0, x1, z0, z1, wall, top, benchZ } = LAB, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2
  const brick = useMemo(() => { const t = makeBrick(4); t.repeat.set(1 / 8, 1 / 8); return t }, [])
  const brickIn = useMemo(() => { const t = makeBrick(6); t.repeat.set(1 / 8, 1 / 8); return t }, [])
  const geo = useMemo(() => ({
    front: wallGeo(w, wall, 1.2, [[-10, 9, 9, 12], [10, 9, 9, 12], [0, 0, 6, 21]]),
    back: wallGeo(w, wall, 1.2, [[-12, 17, 7, 9], [12, 17, 7, 9]]),
    side: wallGeo(d, wall, 1.2, [[0, 10, 8, 11]]),
    gable: (() => { const s = new THREE.Shape(); s.moveTo(-d / 2 - 0.6, 0); s.lineTo(d / 2 + 0.6, 0); s.lineTo(0, 11); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false }); g.translate(0, 0, -0.6); return g })(),
  }), [w, d, wall])
  const tiles = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d')!, r = rng(3)
    g.fillStyle = '#6e3a2c'; g.fillRect(0, 0, 256, 256)
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const gr = g.createLinearGradient(0, y * 32, 0, y * 32 + 32); const v = 0.85 + r() * 0.3; gr.addColorStop(0, `rgb(${150 * v},${78 * v},${58 * v})`); gr.addColorStop(1, `rgb(${96 * v},${48 * v},${36 * v})`); g.fillStyle = gr; g.fillRect(x * 32 + (y % 2) * 16 + 1, y * 32, 30, 31) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 4, 4); t.anisotropy = 8
    return t
  }, [w])
  const slope = Math.hypot(d / 2 + 2, 11), ang = Math.atan2(11, d / 2 + 2)
  const floor = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!, r = rng(2)
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = 200 + r() * 30; g.fillStyle = (x + y) % 2 ? `rgb(${v},${v - 6},${v - 16})` : `rgb(${v - 70},${v - 74},${v - 80})`; g.fillRect(x * 32, y * 32, 32, 32) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 8, d / 8)
    return t
  }, [w, d])
  // 实验台：白色柜体、深色台面；墙上两层搁板
  const bench = useMemo(() => mergeParts([
    { p: [cx, top - 0.3, benchZ], s: [w - 2.6, 0.6, 6.4], c: '#2c3438' },
    { p: [cx, (top - 0.6) / 2, benchZ - 0.2], s: [w - 3, top - 0.6, 5.6], c: '#dfe3e1' },
    ...Array.from({ length: 11 }, (_, i) => ({ p: [x0 + 2.4 + i * (w - 4.8) / 10, (top - 0.6) / 2, benchZ + 2.62] as V3, s: [0.08, top - 1.6, 0.06] as V3, c: '#9aa3a6' })),
    ...Array.from({ length: 10 }, (_, i) => ({ p: [x0 + 4.2 + i * (w - 4.8) / 10, top - 2, benchZ + 2.65] as V3, s: [1.4, 0.16, 0.12] as V3, c: '#8f989c' })),
    { p: [cx, 0.3, benchZ + 2.5], s: [w - 3, 0.6, 0.1], c: '#4a5358' },
    { p: [cx, top + 9, z0 + 1.6], s: [w - 3, 0.25, 2.6], c: '#d2d6d3' }, { p: [cx, top + 13, z0 + 1.6], s: [w - 3, 0.25, 2.6], c: '#d2d6d3' },
    // 第 3 课的黑台面
    { p: [AT_LAB.cells, top + 0.05, benchZ + 0.3], s: [15, 0.12, 5.2], c: '#111417' },
  ]), [cx, w, top, benchZ, x0, z0])
  return <group>
    <mesh rotation-x={-Math.PI / 2} position={[cx, 0.05, (z0 + z1) / 2]} receiveShadow><planeGeometry args={[w, d]} /><meshStandardMaterial map={floor} roughness={0.6} /></mesh>
    {open ? null : <mesh geometry={geo.front} position={[cx, 0, z1]} castShadow receiveShadow><meshStandardMaterial map={brick} roughness={0.9} /></mesh>}
    {!open && [-10, 10].map(x => <Window key={x} at={[cx + x, 15, z1]} w={9} h={12} />)}
    {!open && <RoundedBox args={[6, 21, 0.4]} radius={0.1} position={[cx, 10.5, z1 - 0.3]} castShadow><meshStandardMaterial color="#3e5a50" roughness={0.6} /></RoundedBox>}
    <mesh geometry={geo.back} position={[cx, 0, z0]} castShadow receiveShadow><meshStandardMaterial map={brickIn} roughness={0.9} /></mesh>
    {/* 屋里的墙抹了白灰，下半截刷一道浅灰绿的墙裙 */}
    <mesh geometry={geo.back} position={[cx, 0, z0 + 0.62]} scale={[0.999, 1, 0.02]} receiveShadow><meshStandardMaterial color="#ebe8df" roughness={0.95} /></mesh>
    {[x0, x1].map((x, i) => <mesh key={`in${x}`} geometry={geo.side} position={[x + (i ? -0.62 : 0.62), 0, (z0 + z1) / 2]} rotation-y={Math.PI / 2} scale={[0.999, 1, 0.02]} receiveShadow><meshStandardMaterial color="#ebe8df" roughness={0.95} /></mesh>)}
    <mesh position={[cx, 4.5, z0 + 0.66]} receiveShadow><boxGeometry args={[w - 1.3, 9, 0.04]} /><meshStandardMaterial color="#b9c4bb" roughness={0.7} /></mesh>
    {[-12, 12].map(x => <Window key={x} at={[cx + x, 21.5, z0]} w={7} h={9} />)}
    {[x0, x1].map(x => <mesh key={x} geometry={geo.side} position={[x, 0, (z0 + z1) / 2]} rotation-y={Math.PI / 2} castShadow receiveShadow><meshStandardMaterial map={brick} roughness={0.9} /></mesh>)}
    {[x0, x1].map(x => <Window key={`w${x}`} at={[x, 15.5, (z0 + z1) / 2]} w={8} h={11} yaw={Math.PI / 2} />)}
    {[x0, x1].map(x => <mesh key={`g${x}`} geometry={geo.gable} position={[x, wall, (z0 + z1) / 2]} rotation-y={Math.PI / 2} castShadow><meshStandardMaterial color="#9a5a44" roughness={0.9} /></mesh>)}
    {/* 坡屋顶：两面瓦，屋脊一道脊瓦；前坡在屋里上课时不画 */}
    {[-1, 1].map(s => (s > 0 && open) ? null : <mesh key={s} position={[cx, wall + 5.5, (z0 + z1) / 2 + s * (d / 4 + 0.5)]} rotation-x={s * ang} castShadow receiveShadow><boxGeometry args={[w + 3, 0.5, slope]} /><meshStandardMaterial map={tiles} roughness={0.8} /></mesh>)}
    <mesh position={[cx, wall + 11.1, (z0 + z1) / 2]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.5, 0.5, w + 3, 12]} /><meshStandardMaterial color="#7a3e2e" roughness={0.8} /></mesh>
    {/* 屋里：天花板、实验台、搁板上的试剂瓶、两盏吊灯 */}
    <mesh position={[cx, wall - 0.05, (z0 + z1) / 2]} rotation-x={Math.PI / 2} receiveShadow><planeGeometry args={[w, d]} /><meshStandardMaterial color="#e9e7e0" roughness={0.9} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={bench} castShadow receiveShadow><Painted rough={0.6} metal={0.05} /></mesh>
    <Bottles />
    {[-12, 0, 12].map(x => <group key={x} position={[cx + x, wall - 3, benchZ + 3]}>
      <mesh><cylinderGeometry args={[0.04, 0.04, 6, 6]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0, -3, 0]}><boxGeometry args={[7, 0.3, 1]} /><meshStandardMaterial color="#f8f8f2" emissive="#fffbe8" emissiveIntensity={0.9} /></mesh>
      <pointLight position={[0, -4, 0]} intensity={60} distance={30} decay={1.6} color="#fff6e4" />
    </group>)}
    <Stake at={[cx + 20, 0, z1 + 2.4]} text="实验室" yaw={-0.2} s={1.6} />
  </group>
}

// ---------- 玻璃温室 ----------
function Greenhouse({ open }: { open: boolean }) {
  const { x0, x1, z0, z1, eave, ridge, knee } = GH, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const slope = Math.hypot(d / 2, ridge - eave), ang = Math.atan2(ridge - eave, d / 2)
  const brick = useMemo(() => { const t = makeBrick(12); t.repeat.set(1 / 8, 1 / 8); return t }, [])
  const frame = useMemo(() => {
    const parts: Part[] = [], c = '#f1f1ec', bays = 8
    for (let i = 0; i <= bays; i++) {
      const x = x0 + i * w / bays
      for (const z of open ? [z0] : [z0, z1]) parts.push({ p: [x, (eave + knee) / 2, z], s: [0.35, eave - knee, 0.35], c })
      if (open) parts.push({ p: [x, (eave + knee) / 2, z1], s: [0.35, eave - knee, 0.35], c })
      for (const s of [-1, 1]) parts.push({ p: [x, (eave + ridge) / 2, cz + s * d / 4], s: [0.3, 0.45, slope], c, r: [s * ang, 0, 0] })
      // 玻璃上的细窗棂
      for (let k = 1; k < 3; k++) { const xx = x + k * w / bays / 3; if (xx < x1) for (const s of [-1, 1]) parts.push({ p: [xx, (eave + ridge) / 2, cz + s * d / 4], s: [0.12, 0.2, slope], c, r: [s * ang, 0, 0] }) }
    }
    for (const z of [z0, z1]) for (const y of [eave, knee + 0.2, (knee + eave) / 2]) parts.push({ p: [cx, y, z], s: [w + 0.4, 0.3, 0.35], c })
    parts.push({ p: [cx, ridge, cz], s: [w + 0.6, 0.5, 0.6], c })
    for (const x of [x0, x1]) { for (let z = z0; z <= z1 + 0.01; z += d / 6) { const hh = ridge - Math.abs(z - cz) / (d / 2) * (ridge - eave); parts.push({ p: [x, (hh + knee) / 2, z], s: [0.3, hh - knee, 0.3], c }) } parts.push({ p: [x, eave, cz], s: [0.3, 0.3, d], c }) }
    return mergeParts(parts)
  }, [x0, w, z0, z1, eave, ridge, knee, cx, cz, d, slope, ang, open])
  const endGlass = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-d / 2, knee); s.lineTo(d / 2, knee); s.lineTo(d / 2, eave); s.lineTo(0, ridge); s.lineTo(-d / 2, eave); s.closePath(); return new THREE.ShapeGeometry(s) }, [d, knee, eave, ridge])
  const floor = useMemo(() => { const t = makeGround('#8f8576', '110,102,90', '170,160,144', 9); t.repeat.set(8, 5); return t }, [])
  const benchTop = useMemo(() => { const t = makeWood('#9c7e54', '80,58,32', '200,170,120', 6, 5); t.repeat.set(3, 1); return t }, [])
  return <group>
    <mesh rotation-x={-Math.PI / 2} position={[cx, 0.03, cz]} receiveShadow><planeGeometry args={[w, d]} /><meshStandardMaterial map={floor} roughness={1} /></mesh>
    {/* 矮砖墙勒脚，上面是钢架和玻璃 */}
    {[z0, ...(open ? [] : [z1])].map(z => <mesh key={z} position={[cx, knee / 2, z]} castShadow receiveShadow><boxGeometry args={[w + 0.6, knee, 0.8]} /><meshStandardMaterial map={brick} roughness={0.9} /></mesh>)}
    {[x0, x1].map(x => <mesh key={x} position={[x, knee / 2, cz]} castShadow receiveShadow><boxGeometry args={[0.8, knee, d]} /><meshStandardMaterial map={brick} roughness={0.9} /></mesh>)}
    <mesh geometry={frame} castShadow receiveShadow><Painted rough={0.4} metal={0.3} /></mesh>
    {[z0, ...(open ? [] : [z1])].map(z => <mesh key={z} position={[cx, (eave + knee) / 2, z]}><planeGeometry args={[w, eave - knee]} /><Glass opacity={0.1} /></mesh>)}
    {[-1, 1].map(s => (open && s > 0) ? null : <mesh key={s} position={[cx, (eave + ridge) / 2 + 0.25, cz + s * d / 4]} rotation-x={-Math.PI / 2 + s * ang}><planeGeometry args={[w, slope]} /><Glass opacity={0.12} /></mesh>)}
    {[x0, x1].map(x => <mesh key={x} geometry={endGlass} position={[x, 0, cz]} rotation-y={Math.PI / 2}><Glass opacity={0.1} /></mesh>)}
    {/* 门：前面正中两扇玻璃门 */}
    {!open && <RoundedBox args={[6, 18, 0.4]} radius={0.08} position={[cx, 9, z1]} castShadow><meshPhysicalMaterial color="#e9ece6" transparent opacity={0.35} roughness={0.1} clearcoat={1} depthWrite={false} /></RoundedBox>}
    {/* 后台：长长一张木台 */}
    <RoundedBox args={[22, 0.5, 5]} radius={0.08} position={[BACK.x, BACK.h - 0.25, BACK.z]} castShadow receiveShadow><meshStandardMaterial map={benchTop} roughness={0.75} /></RoundedBox>
    {[-1, 1].flatMap(s => [-1, 1].map(t => <mesh key={`${s}${t}`} position={[BACK.x + s * 10.3, (BACK.h - 0.5) / 2, BACK.z + t * 2]} castShadow><boxGeometry args={[0.4, BACK.h - 0.5, 0.4]} /><Metal kind="zinc" grain="brushed" /></mesh>))}
    <Stake at={[x1 - 4, 0, z1 + 2.4]} text="温室" yaw={-0.3} s={1.6} />
  </group>
}
const POT = shell([[0, 0], [1.3, 0], [1.75, 3.6], [1.95, 3.6], [1.95, 4.1]], 0.12, { segs: 32 })
/** 一个陶土花盆，里面是土 */
export function Pot({ at, s = 1 }: { at: V3; s?: number }) {
  return <group position={at} scale={s}>
    <mesh geometry={POT} castShadow receiveShadow><meshStandardMaterial color="#b2643f" roughness={0.85} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 3.7, 0]} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[1.78, 32]} /><meshStandardMaterial color="#4a3829" roughness={1} /></mesh>
  </group>
}
/** 温室门口的工作台 */
function Desk() {
  const top = useMemo(() => { const t = makeWood('#a5865a', '84,58,32', '210,180,130', 5, 9); t.repeat.set(2, 1); return t }, [])
  return <group position={[DESK.x, 0, DESK.z]}>
    <RoundedBox args={[DESK.w, 0.5, DESK.d]} radius={0.08} position={[0, DESK.h - 0.25, 0]} castShadow receiveShadow><meshStandardMaterial map={top} roughness={0.75} /></RoundedBox>
    {[-1, 1].flatMap(s => [-1, 1].map(t => <RoundedBox key={`${s}${t}`} args={[0.5, DESK.h - 0.5, 0.5]} radius={0.06} position={[s * (DESK.w / 2 - 0.6), (DESK.h - 0.5) / 2, t * (DESK.d / 2 - 0.5)]} castShadow><meshStandardMaterial color="#6f5636" roughness={0.9} /></RoundedBox>))}
    <mesh position={[0, 2.2, 0]} castShadow receiveShadow><boxGeometry args={[DESK.w - 1.4, 0.2, DESK.d - 1.2]} /><meshStandardMaterial color="#7a6040" roughness={0.9} /></mesh>
  </group>
}
/** 第 1 课的样品台：一张小木桌 */
function SampleTable() {
  const top = useMemo(() => { const t = makeWood('#a5865a', '84,58,32', '210,180,130', 4, 11); t.repeat.set(1, 1); return t }, [])
  return <group position={[TABLE1.x, 0, TABLE1.z]}>
    <RoundedBox args={[5.6, 0.4, 3.2]} radius={0.06} position={[0, TABLE1.h - 0.2, 0]} castShadow receiveShadow><meshStandardMaterial map={top} roughness={0.75} /></RoundedBox>
    {[-1, 1].flatMap(s => [-1, 1].map(t => <RoundedBox key={`${s}${t}`} args={[0.36, TABLE1.h - 0.4, 0.36]} radius={0.05} position={[s * 2.5, (TABLE1.h - 0.4) / 2, t * 1.3]} castShadow><meshStandardMaterial color="#6f5636" roughness={0.9} /></RoundedBox>))}
  </group>
}
/** 零碎的陈设：喷壶、一捆竹竿、一摞花盆 */
function Props() {
  const CAN = useMemo(() => shell([[0, 0], [0.9, 0], [0.95, 0.1], [0.95, 2.1], [0.7, 2.4], [0.4, 2.45]], 0.05, { segs: 28 }), [])
  const spout = useMemo(() => tube([[0.8, 0.5, 0], [1.6, 1.3, 0], [2.4, 2.4, 0], [2.6, 2.7, 0]], 0.14, 0.08, '#ffffff', '#ffffff', 10, 12), [])
  const poles = useMemo(() => fuse(Array.from({ length: 9 }, (_, i) => tube([[i * 0.28 - 1.1, 0, 0], [i * 0.25 - 0.9, 10, 0.5], [i * 0.22 - 0.6, 20, 1]], 0.11, 0.08, '#b79a62', '#c9ad74', 6, 6))), [])
  return <>
    <group position={[2.5, 0, -10]} rotation-y={2.2}>
      <mesh geometry={CAN} castShadow receiveShadow><Metal kind="zinc" grain="brushed" /></mesh>
      <mesh geometry={spout} castShadow><Metal kind="zinc" /></mesh>
      <mesh position={[-0.6, 1.5, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.7, 0.07, 8, 24, Math.PI * 1.2]} /><Metal kind="zinc" /></mesh>
    </group>
    <group position={[78, 0, -30]} rotation-z={-0.1}><mesh geometry={poles} castShadow><meshStandardMaterial vertexColors roughness={0.8} /></mesh></group>
    {[0, 1, 2, 3].map(i => <Pot key={i} at={[80, i * 1.1, -12]} s={0.7} />)}
    <mesh position={[81.5, 1.2, -16]} castShadow geometry={useMemo(() => place(blob(1.8, 1.2, 1.3, '#c8b48a', '#d8c69c'), [0, 0, 0]), [])}><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
  </>
}

export function World({ want }: { want?: WorldWant }) {
  const f1 = want?.f1 ?? 1, f2 = want?.f2 ?? 1
  return (
    <group>
      <Ground />
      <GardenWall />
      <Far />
      {(Object.keys(BED) as BedKey[]).map(k => <Bed key={k} b={BED[k]} net={k !== 'short'} grow={k === 'f1' ? f1 : k === 'f2' ? f2 : 1} />)}
      <BedPlants spots={SPOTS.tall} />
      <BedPlants spots={SPOTS.short} />
      <BedPlants spots={SPOTS.f1} grow={f1} />
      <BedPlants spots={SPOTS.f2} grow={f2} />
      <SampleTable />
      <LabHouse open={want?.inside === 'lab'} />
      <Greenhouse open={want?.inside === 'gh'} />
      <Desk />
      <Props />
    </group>
  )
}
