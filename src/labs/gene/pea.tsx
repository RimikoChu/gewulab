// 豌豆的模型：整株（茎一节一节地折，每节一对抱茎的大托叶、一片带两对小叶和分叉卷须的复叶，上部的节开花或结荚）、
// 田里用的小花、豆荚（侧扁、有喙、鼓出一粒粒豆）、剥开的豆荚、圆粒和皱粒的种子，以及温室里推近看的那朵大花（放大了画）。
// 画面里 1 个单位约等于 10 cm。
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Flesh, LeafMat, blob, fuse, helix, leafGeo, lerp, place, rng, tint, tube, type V3 } from './parts'

export type FlowerColor = 'purple' | 'white'
/** 花色：旗瓣、翼瓣、龙骨瓣各一种颜色（紫花的翼瓣最深） */
export const PETAL = {
  purple: { banner: ['#b27fc0', '#dcc0e6'], wing: ['#6e2a78', '#8e3d96'], keel: ['#d8c8d6', '#efe4ec'] },
  white: { banner: ['#e9eadb', '#fbfbf4'], wing: ['#eef0e2', '#ffffff'], keel: ['#e2e8cf', '#f4f6ea'] },
} as const

// ---------- 叶 ----------
/** 豌豆的叶是蓝绿色、带一层蜡粉的 */
const LEAFLETS = [0, 1, 2].map(i => leafGeo({ len: 0.6, wid: 0.4, basePow: 0.78, tipPow: 0.9, curl: 0.12 + i * 0.05, fold: 0.22, wave: 0.02, base: i % 2 ? '#4a7d5a' : '#4f8460', tip: '#78a77a', back: '#9bbb9a', nu: 5, nv: 1 }))
const STIPULES = [0, 1].map(i => leafGeo({ len: 0.68, wid: 0.56, basePow: 0.42, tipPow: 0.75, curl: 0.06 + i * 0.05, fold: 0.08, wave: 0.03, base: '#4b8058', tip: '#75a477', back: '#a4c3a1', nu: 5, nv: 1 }))
const SEPAL = leafGeo({ len: 0.07, wid: 0.03, basePow: 0.5, tipPow: 1.4, curl: 0.05, fold: 0.1, base: '#5f8f58', tip: '#7aa86a', nu: 3, nv: 1 })

// ---------- 田里的小花 ----------
const smallFlower = (c: FlowerColor) => {
  const P = PETAL[c], list: THREE.BufferGeometry[] = []
  const banner = leafGeo({ len: 0.2, wid: 0.24, basePow: 1.5, tipPow: 0.5, curl: -0.35, fold: 0.15, base: P.banner[0], tip: P.banner[1], back: P.banner[0], nu: 4, nv: 2 })
  const wing = leafGeo({ len: 0.15, wid: 0.09, basePow: 1.1, tipPow: 0.6, curl: 0.1, fold: 0, cup: 0.4, base: P.wing[0], tip: P.wing[1], back: P.wing[0], nu: 3, nv: 1 })
  list.push(place(banner, [0, 0.02, 0], 0, -1.25))
  for (const s of [-1, 1]) list.push(place(wing.clone(), [s * 0.025, 0.015, 0], s * 0.3, -0.05, 1, s * 0.5))
  list.push(place(blob(0.03, 0.035, 0.07, P.keel[0], P.keel[1], 8, 6), [0, 0.01, 0.06]))
  for (let k = 0; k < 5; k++) list.push(place(SEPAL.clone(), [0, 0, -0.01], k * 1.256, -2.4))
  return list
}
const SMALL = { purple: smallFlower('purple'), white: smallFlower('white') }

// ---------- 豆荚 ----------
/**
 * 一只豆荚：沿 +x 伸出去，侧扁（高 wid，厚 thick），里面每粒豆的地方鼓起来，末端一个上翘的喙。基部在原点。
 * 用参数曲面直接画，法线由网格算。
 */
export function podGeo(len = 0.7, wid = 0.15, thick = 0.1, n = 6, c0 = '#5f9a45', c1 = '#7fb35a', NU = 28, NV = 14) {
  const pos: number[] = [], idx: number[] = []
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
    const u = i / NU, t = j / NV * Math.PI * 2
    const prof = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.04)), 0.45) * (u > 0.96 ? Math.max(0, (1 - u) / 0.04) : 1)
    const bump = u > 0.08 && u < 0.92 ? 0.82 + 0.18 * Math.pow(Math.abs(Math.sin((u - 0.08) / 0.84 * n * Math.PI)), 0.6) : 0.82
    const cy = -Math.sin(u * Math.PI) * len * 0.07 + Math.pow(u, 6) * wid * 0.5      // 微微弯，喙往上翘
    pos.push(u * len, cy + Math.sin(t) * wid / 2 * prof, Math.cos(t) * thick / 2 * prof * bump)
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  // 腹缝线（下沿）颜色略深
  tint(g, c0, c1)
  return g
}
/** 豆荚连着花萼和一小截果柄：花萼留在豆荚基部 */
function podWithCalyx(len: number, n: number) {
  const list: THREE.BufferGeometry[] = [podGeo(len, len * 0.21, len * 0.14, n)]
  for (let k = 0; k < 5; k++) list.push(place(SEPAL.clone(), [0.01, 0, 0], Math.PI / 2 + (k - 2) * 0.5, -0.2 + (k % 2) * 0.4, 1.3))
  return list
}

// ---------- 整株 ----------
export interface PlantOpt { tall: boolean; color?: FlowerColor; stage?: 0 | 1 | 2; seed?: number }
/** 一株豌豆，原点在茎基。返回三组：叶（叶脉材质）、茎和豆荚（顶点色实体）、花瓣（花瓣材质） */
export function peaPlant({ tall, color = 'purple', stage = 2, seed = 1 }: PlantOpt) {
  const r = rng(seed), leaf: THREE.BufferGeometry[] = [], body: THREE.BufferGeometry[] = [], petal: THREE.BufferGeometry[] = []
  const H = tall ? 18.5 * (0.92 + r() * 0.16) : 3.6 * (0.88 + r() * 0.24), N = tall ? 17 : 9
  // 茎：在每个节上轻轻折一下，左右交替（豌豆的茎是“之”字形的）
  const a0 = r() * 6.28, lean = (r() - 0.5) * 0.4
  const nodes: THREE.Vector3[] = []
  for (let k = 0; k <= N; k++) { const u = k / N, zz = (k % 2 ? 1 : -1) * 0.05; nodes.push(new THREE.Vector3(Math.cos(a0) * zz + lean * u * u * (tall ? 1 : 0.6), H * Math.pow(u, tall ? 0.95 : 0.85), Math.sin(a0) * zz + (tall ? -0.25 * u : 0))) }
  body.push(tube(nodes, tall ? 0.065 : 0.055, 0.028, '#7d9f64', '#9cc07a', 6, N * 3))
  for (let k = 1; k <= N; k++) {
    const P = nodes[k], side = k % 2 ? 1 : -1, yaw = a0 + (side > 0 ? 0 : Math.PI) + (r() - 0.5) * 0.7
    const top = k >= N - (tall ? 1 : 0)
    const s = top ? 0.55 : tall ? (0.85 + 0.25 * Math.sin(k / N * Math.PI)) : 0.75
    // 一对抱茎的托叶
    for (const sd of [-1, 1]) leaf.push(place(STIPULES[Math.floor(r() * 2)].clone(), [P.x, P.y - 0.05, P.z], yaw + sd * 0.75, -0.35 + r() * 0.3, s * (tall ? 1 : 0.85), sd * 0.3))
    // 叶轴：伸出去，两对小叶，末端分叉的卷须
    const up = 0.45 + r() * 0.35, L = (tall ? 1.35 : 0.85) * s
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(up), Math.sin(up), Math.cos(yaw) * Math.cos(up))
    const end = P.clone().addScaledVector(dir, L), mid = P.clone().addScaledVector(dir, L * 0.5).add(new THREE.Vector3(0, 0.06, 0))
    body.push(tube([P, mid, end], 0.022, 0.012, '#7fa266', '#90b674', 4, 6))
    const rach = new THREE.CatmullRomCurve3([P, mid, end]), Q = new THREE.Vector3()
    for (const u of k < N - (tall ? 4 : 2) ? [0.28, 0.55, 0.8] : [0.38, 0.72]) {
      rach.getPointAt(u, Q)
      for (const sd of [-1, 1]) leaf.push(place(LEAFLETS[Math.floor(r() * 3)].clone(), [Q.x, Q.y, Q.z], yaw + sd * (1.15 + r() * 0.3), 0.15 + r() * 0.35, s * (0.9 + r() * 0.25), sd * 0.25))
    }
    if (!top) for (let t = 0; t < 3; t++) {
      const ty = yaw + (t - 1) * 0.55 + (r() - 0.5) * 0.3, tl = (0.35 + r() * 0.3) * s, tu = 0.2 + r() * 0.6
      const td = new THREE.Vector3(Math.sin(ty) * Math.cos(tu), Math.sin(tu), Math.cos(ty) * Math.cos(tu))
      const e = end.clone().addScaledVector(td, tl)
      const coil = helix(0.035, 0, -0.06, 1.6, r() * 6).map(([x, y, z]) => new THREE.Vector3(e.x + x, e.y + y, e.z + z))
      body.push(tube([end, end.clone().addScaledVector(td, tl * 0.5).add(new THREE.Vector3(0, 0.04, 0)), ...coil], 0.008, 0.004, '#8fb46e', '#a8c784', 3, 14))
    }
    // 花和荚：长在上部几节的叶腋里
    const flowering = stage >= 1 && k >= (tall ? N - 7 : N - 4) && k < N
    if (flowering) {
      const py = yaw + Math.PI * 0.5 * side + (r() - 0.5) * 0.5, pl = (tall ? 0.45 : 0.32) * s
      const pd = new THREE.Vector3(Math.sin(py) * 0.75, 0.55, Math.cos(py) * 0.75).normalize()
      const tip = P.clone().addScaledVector(pd, pl)
      body.push(tube([P, P.clone().addScaledVector(pd, pl * 0.6).add(new THREE.Vector3(0, 0.05, 0)), tip], 0.012, 0.009, '#86a96a', '#9cbf7c', 3, 5))
      const podNow = stage === 2 && k < (tall ? N - 3 : N - 1)
      const nf = r() < 0.5 ? 2 : 1
      for (let f = 0; f < nf; f++) {
        const fy = py + (f - (nf - 1) / 2) * 0.9, at: V3 = [tip.x + Math.sin(fy) * 0.05, tip.y - f * 0.05, tip.z + Math.cos(fy) * 0.05]
        if (podNow) for (const g of podWithCalyx(0.62 + r() * 0.16, 5 + Math.floor(r() * 3))) body.push(place(g, at, fy + Math.PI / 2, 0, 1, -1.15 - r() * 0.35))
        else for (const g of SMALL[color]) petal.push(place(g.clone(), at, fy, 0.3, 1.05))
      }
    }
  }
  // 茎基：一点点土堆
  body.push(place(blob(0.22, 0.06, 0.22, '#5b4532', '#6b5340', 8, 5), [0, 0, 0]))
  return { leaf, body, petal }
}

// ---------- 成片的豌豆：几种变体，每种用实例化铺开 ----------
export interface Spot { x: number; z: number; yaw: number; s: number; v: number }
type Variant = { leaf: THREE.BufferGeometry; body: THREE.BufferGeometry; petal: THREE.BufferGeometry | null }
const variantCache = new Map<string, Variant>()
export function variant(o: PlantOpt) {
  const key = `${o.tall}|${o.color}|${o.stage}|${o.seed}`
  let v = variantCache.get(key)
  if (!v) { const p = peaPlant(o); v = { leaf: fuse(p.leaf), body: fuse(p.body), petal: p.petal.length ? fuse(p.petal) : null }; variantCache.set(key, v) }
  return v
}
function Instances({ geo, spots, grow, y, children }: { geo: THREE.BufferGeometry; spots: Spot[]; grow: number; y: number; children: React.ReactNode }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0)
    spots.forEach((s, i) => { q.setFromAxisAngle(up, s.yaw); const g = Math.max(0.001, grow); M.compose(new THREE.Vector3(s.x, y, s.z), q, new THREE.Vector3(s.s * Math.min(1, g * 1.5), s.s * g, s.s * Math.min(1, g * 1.5))); m.setMatrixAt(i, M) })
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere()
  }, [spots, grow, y])
  return <instancedMesh ref={ref} args={[geo, undefined, spots.length]} castShadow receiveShadow frustumCulled={false}>{children}</instancedMesh>
}
/** 一片豌豆：spots 里每株用第 v 种变体 */
export function PeaPatch({ spots, variants, grow = 1, y = 0 }: { spots: Spot[]; variants: Variant[]; grow?: number; y?: number }) {
  const by = useMemo(() => variants.map((_, i) => spots.filter(s => s.v === i)), [spots, variants])
  return <>{variants.map((v, i) => by[i].length > 0 && <group key={i}>
    <Instances geo={v.leaf} spots={by[i]} grow={grow} y={y}><LeafMat /></Instances>
    <Instances geo={v.body} spots={by[i]} grow={grow} y={y}><Flesh rough={0.55} /></Instances>
    {v.petal && <Instances geo={v.petal} spots={by[i]} grow={grow} y={y}><LeafMat petal rough={0.5} /></Instances>}
  </group>)}</>
}

// ---------- 种子 ----------
/** 一粒豌豆：圆粒饱满光滑；皱粒表面一道道皱缩的沟（失水后皱起来）。半径 1，原点在中心 */
export function seedGeo(wrinkled: boolean, seed = 1, detail = 4) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, r = rng(seed), ph = [r() * 6, r() * 6, r() * 6, r() * 6]
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize()
    let k = 1 + 0.025 * Math.sin(v.x * 3 + ph[0]) * Math.cos(v.y * 2 + ph[1])
    if (wrinkled) {
      const a = Math.abs(Math.sin(v.x * 5.2 + v.y * 2.1 + ph[0])) * Math.abs(Math.cos(v.z * 4.6 - v.x * 1.7 + ph[1])), b = Math.abs(Math.sin(v.y * 6.3 + v.z * 2.4 + ph[2]))
      k = 0.86 - 0.11 * (1 - Math.pow(a, 0.35)) - 0.06 * (1 - Math.pow(b, 0.3)) + 0.05 * Math.sin(v.x * 2 + ph[3])
    }
    p.setXYZ(i, v.x * k * 1.04, v.y * k * 0.9, v.z * k)
  }
  g.computeVertexNormals()
  return g
}
/** 种子的颜色：黄色子叶透过种皮，略带绿 */
export const SEED_COLOR = { round: '#d6c26a', wrinkled: '#b9aa58' }

/** 半片豆荚壳：沿 +x，开口朝上的槽。外面绿、里面浅（两层面） */
export function valveGeo(len: number, wid: number, thick: number, NU = 30, NV = 12) {
  const make = (k: number, inner: boolean) => {
    const pos: number[] = [], idx: number[] = []
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
      const u = i / NU, t = Math.PI / 2 + j / NV * Math.PI
      const prof = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.04)), 0.45) * (u > 0.96 ? Math.max(0, (1 - u) / 0.04) : 1)
      const cy = Math.pow(u, 6) * thick * 0.6 + Math.sin(u * Math.PI) * len * 0.03
      pos.push(u * len, cy + Math.cos(t) * thick / 2 * prof * k + thick / 2, Math.sin(t) * wid / 2 * prof * k)
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; if (inner) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
    return tint(g, inner ? '#dcebc4' : '#5f9a45', inner ? '#e8f2d6' : '#7fb35a')
  }
  return fuse([make(1, false), make(0.93, true)])
}
/** 剥开的豆荚：一片荚壳开口朝上，里面一排豆，另一片扣着放在旁边。round 里是每粒是不是圆粒。沿 +x 放 */
export function OpenPod({ round, len = 1, scale = 1 }: { round: boolean[]; len?: number; scale?: number }) {
  const geo = useMemo(() => valveGeo(len, len * 0.22, len * 0.13), [len])
  const seeds = useMemo(() => [seedGeo(false, 3, 3), seedGeo(false, 9, 3), seedGeo(true, 5, 4), seedGeo(true, 7, 4)], [])
  return <group scale={scale}>
    <mesh geometry={geo} castShadow receiveShadow><Flesh rough={0.55} /></mesh>
    <mesh geometry={geo} position={[0, len * 0.065, -len * 0.11]} rotation-x={-2.3} castShadow receiveShadow><Flesh rough={0.55} /></mesh>
    {round.map((ok, i) => {
      const x = len * (0.14 + 0.72 * (i + 0.5) / round.length), rr = len * 0.05
      return <mesh key={i} geometry={seeds[(ok ? 0 : 2) + (i % 2)]} position={[x, len * 0.02 + rr * 0.9, 0]} rotation={[i, i * 2, 0]} scale={rr} castShadow>
        <meshPhysicalMaterial color={ok ? SEED_COLOR.round : SEED_COLOR.wrinkled} roughness={ok ? 0.35 : 0.55} clearcoat={ok ? 0.5 : 0.15} clearcoatRoughness={0.3} />
      </mesh>
    })}
  </group>
}

// ---------- 推近看的那朵大花（第 4 课，放大了画） ----------
/** 大花各部分在花自己坐标里的位置：花柄朝 −z，花冠朝 +z，旗瓣朝上 */
export const HF = { stigma: [0, 0.1, 0.43] as V3, anther: [0, 0.07, 0.36] as V3, keel: [0, -0.02, 0.28] as V3, banner: [0, 0.4, 0.05] as V3 }
const HERO = (() => {
  const c = PETAL.purple
  const banner = leafGeo({ len: 0.52, wid: 0.72, basePow: 1.7, tipPow: 0.35, curl: -0.45, fold: 0.28, wave: 0.025, notch: 0.12, base: '#8a4f9c', tip: '#dcc6e8', back: '#b58cc4', nu: 16, nv: 6 })
  const wing = leafGeo({ len: 0.4, wid: 0.24, basePow: 1.25, tipPow: 0.5, curl: 0.12, fold: 0.05, cup: 0.6, wave: 0.015, base: '#6a1f68', tip: '#a3397f', back: '#5a1f5a', nu: 12, nv: 4 })
  const keel = leafGeo({ len: 0.38, wid: 0.17, basePow: 1.0, tipPow: 0.75, curl: -0.4, fold: 0.0, cup: 0.9, base: '#e6ddc9', tip: '#f2e9ee', back: '#d4c9b8', nu: 12, nv: 3 })
  const sepal = leafGeo({ len: 0.2, wid: 0.075, basePow: 0.5, tipPow: 1.4, curl: 0.06, fold: 0.2, base: '#57894f', tip: '#79a868', nu: 5, nv: 1 })
  const calyx = fuse([place(tint(new THREE.CylinderGeometry(0.075, 0.05, 0.14, 16, 1, true), '#5a8a50', '#6f9e5f'), [0, 0, -0.03], 0, Math.PI / 2), ...[0, 1, 2, 3, 4].map(k => place(sepal.clone(), [Math.cos(k * 1.256) * 0.06, Math.sin(k * 1.256) * 0.06, 0.03], 0, -Math.sin(k * 1.256) * 0.4, 1, k * 1.256 - Math.PI / 2))])
  const stalk = tube([[0, -0.02, -0.75], [0, 0.0, -0.4], [0, 0, -0.1]], 0.03, 0.026, '#7ea266', '#8fb575', 8, 10)
  // 雄蕊：九根花丝连成一束，另一根单独；都沿着龙骨瓣向上弯，顶端是花药
  const fil: THREE.BufferGeometry[] = [], anth: THREE.BufferGeometry[] = []
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, rr = 0.03, x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.6
    fil.push(tube([[x, y, 0.02], [x * 0.9, y + 0.0, 0.18], [x * 0.6, 0.03 + y * 0.6, 0.3], [x * 0.4, 0.07 + y * 0.4, 0.355]], 0.008, 0.005, '#eef0dc', '#f6f4e4', 5, 10))
    anth.push(place(blob(0.012, 0.009, 0.02, '#e9b633', '#f5cf4a', 8, 6), [x * 0.4, 0.07 + y * 0.4, 0.365]))
  }
  const pistil = fuse([tint(podGeo(0.3, 0.06, 0.045, 6, '#7fb05a', '#98c46c', 18, 10), '#83b35e'), place(tube([[0.3, 0.02, 0], [0.34, 0.06, 0], [0.36, 0.09, 0]], 0.009, 0.006, '#9cc27a', '#b7d48d', 5, 6), [0, 0, 0])])
  const stigma = blob(0.018, 0.016, 0.018, '#c8dc8e', '#e4eeb0', 10, 8)
  return { banner, wing, keel, calyx, stalk, fil: fuse(fil), anth: fuse(anth), pistil, stigma }
})()
/**
 * 推近看的那朵大花。open：0 是花蕾（旗瓣包着），1 是开放；part：龙骨瓣被拨开多少（0–1）；stamens：雄蕊还剩多少（1 全在，0 去掉了）；
 * pollen：柱头上沾了多少花粉（0–1）
 */
export function HeroFlower({ open = 1, part = 0, stamens = 1, pollen = 0, lift = 0, wither = 0, pod = 0 }: { open?: number; part?: number; stamens?: number; pollen?: number; lift?: number; wither?: number; pod?: number }) {
  const grains = useMemo(() => { const r = rng(4); return Array.from({ length: 14 }, () => [(r() - 0.5) * 0.03, (r() - 0.2) * 0.022, (r() - 0.5) * 0.03] as V3) }, [])
  const bannerPitch = lerp(-0.25, -1.45, open) + wither * 0.9, wingOpen = lerp(0.05, 0.32, open), sc = lerp(0.72, 1, open) * (1 - wither * 0.55)
  const podGeoBig = useMemo(() => podGeo(0.95, 0.2, 0.13, 6, '#5f9a45', '#86bb5c'), [])
  return <group>
    <mesh geometry={HERO.stalk} castShadow><Flesh rough={0.55} /></mesh>
    <mesh geometry={HERO.calyx} castShadow><Flesh rough={0.6} /></mesh>
    <group scale={sc}>
      {/* 旗瓣：最大的一片，开花时向上翻起 */}
      <mesh geometry={HERO.banner} position={[0, 0.06, 0.02]} rotation={[bannerPitch, 0, 0, 'YXZ']} castShadow><LeafMat petal rough={0.5} /></mesh>
      {/* 两片翼瓣：夹在两侧 */}
      {[-1, 1].map(s => <mesh key={s} geometry={HERO.wing} position={[s * 0.05, 0.03, 0.04]} rotation={[-0.15, s * wingOpen, s * 1.2, 'YXZ']} castShadow><LeafMat petal rough={0.5} /></mesh>)}
      {/* 龙骨瓣：两片合成小船的样子，把雄蕊和雌蕊包在里面；去雄时被拨开 */}
      {[-1, 1].map(s => <mesh key={s} geometry={HERO.keel} position={[s * (0.012 + part * 0.07), -0.03, 0.03]} rotation={[-0.05, s * part * 0.35, s * (1.45 + part * 0.6), 'YXZ']} castShadow><LeafMat petal rough={0.45} /></mesh>)}
    </group>
    {/* 雌蕊：子房（将来长成豆荚）、花柱、柱头 */}
    {pod < 0.02 ? <>
      <group position={[0, 0.0, 0.05]} rotation-y={-Math.PI / 2}>
        <mesh geometry={HERO.pistil} castShadow><Flesh rough={0.5} /></mesh>
      </group>
      <mesh geometry={HERO.stigma} position={HF.stigma}><Flesh rough={0.7} /></mesh>
    </> : <group position={[0, 0, 0.04]} rotation={[0, -Math.PI / 2, -0.9 * pod, 'YXZ']} scale={[lerp(0.35, 1, pod), lerp(0.3, 1, pod), lerp(0.3, 1, pod)]}>
      <mesh geometry={podGeoBig} castShadow><Flesh rough={0.45} clear={0.4} /></mesh>
    </group>}
    {pollen > 0 && pod < 0.02 && grains.slice(0, Math.round(pollen * grains.length)).map((g, i) => <mesh key={i} position={[HF.stigma[0] + g[0], HF.stigma[1] + 0.012 + g[1], HF.stigma[2] + g[2]]}><sphereGeometry args={[0.0065, 8, 6]} /><meshStandardMaterial color="#f2c53a" roughness={0.6} /></mesh>)}
    {/* 雄蕊：去雄时被镊子夹起来拿走 */}
    {stamens > 0 && <group position={[0, lift * 0.5, lift * 0.25]} scale={Math.max(0.001, stamens)}>
      <mesh geometry={HERO.fil}><Flesh rough={0.6} /></mesh>
      <mesh geometry={HERO.anth}><Flesh rough={0.55} /></mesh>
    </group>}
  </group>
}

/** 套在花上的纸袋：硫酸纸做的，底下收口扎在花柄上，袋身有几道压痕 */
export const BAG = (() => {
  // 硫酸纸袋：扁扁的长方形纸袋，袋口一头收拢扎在花柄上，另一头折过来封住；沿 +y
  const NU = 30, NV = 32, pos: number[] = [], idx: number[] = []
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
    const u = i / NU, t = j / NV * Math.PI * 2, y = u * 1.55
    const open = u < 0.2 ? Math.sin(u / 0.2 * Math.PI / 2) : 1, end = u > 0.94 ? Math.max(0.05, (1 - u) / 0.06) : 1
    const w = lerp(0.09, 0.5, open), d = lerp(0.09, 0.2, open) * end
    const c = Math.cos(t), sn = Math.sin(t), e = 0.45   // 方中带圆的截面
    const x = w * Math.sign(c) * Math.pow(Math.abs(c), e), z = d * Math.sign(sn) * Math.pow(Math.abs(sn), e)
    const crinkle = u < 0.2 ? 0.02 * Math.sin(t * 14) : 0.006 * Math.sin(t * 5 + u * 20)
    pos.push(x * (1 + crinkle), y, z * (1 + crinkle))
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1) }
  const uv: number[] = []; for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) uv.push(j / NV, i / NU)
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals()
  return g
})()
let _paper: THREE.CanvasTexture | null = null
/** 纸袋的纸：细纤维纹、两道竖着的折痕、封口那头一道横折 */
export function paperTex() {
  if (_paper) return _paper
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d')!, r = rng(21)
  g.fillStyle = '#f2ecdc'; g.fillRect(0, 0, 256, 512)
  for (let i = 0; i < 1600; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '160,140,100' : '255,255,255'},${0.08 + r() * 0.1})`; g.lineWidth = 0.6; const x = r() * 256, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 10, y + (r() - 0.5) * 10); g.stroke() }
  for (const x of [64, 192]) { const gr = g.createLinearGradient(x - 6, 0, x + 6, 0); gr.addColorStop(0, 'rgba(120,100,70,0)'); gr.addColorStop(0.5, 'rgba(120,100,70,0.35)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - 6, 100, 12, 412) }
  g.fillStyle = 'rgba(120,100,70,0.35)'; g.fillRect(0, 462, 256, 3); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, 465, 256, 2)
  for (let x = 0; x < 256; x += 9) { g.fillStyle = 'rgba(120,100,70,0.25)'; g.fillRect(x, 0, 2, 90) }
  _paper = new THREE.CanvasTexture(c); _paper.colorSpace = THREE.SRGBColorSpace; _paper.anisotropy = 8
  return _paper
}
