// 放大的细胞模型：细胞膜（分裂时从中间缢裂）、剖开的核膜（前期消失、末期重现）、中心体和纺锤丝、染色体。
// 第 1、2 课的减数分裂按时期排好每根染色单体的位置（MEIO），时期之间平滑地走过去。尺寸都是示意（1 单位 = 1 cm），不按比例。
import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Chromatid, PAIRS } from './chromo'
import { ease, lerp, rng, type V3 } from './parts'

// ---------- 细胞膜 ----------
export interface Lobe { c: number; r: number }
/**
 * 沿一根轴缢裂的细胞膜：开始是一个半径 R 的球（k = 0），分裂完是 lobes 给出的几个球（k = 1，c 是沿轴的位置）。
 * 剖面半径取几个球的“软并集”：重叠的地方连成一体，中间的颈越收越细直到断开。轴沿 x 或 y
 */
export function membraneGeo(R: number, lobes: Lobe[], k: number) {
  const kk = ease(k), rp = R * Math.pow(1 - kk, 0.75)
  const balls = [{ c: 0, r: rp }, ...lobes.map(l => ({ c: lerp(l.c * 0.35, l.c, kk), r: lerp(Math.min(l.r, R * 0.6), l.r, kk) }))]
  const lo = Math.min(...balls.map(b => b.c - b.r)), hi = Math.max(...balls.map(b => b.c + b.r)), N = 120, pts: THREE.Vector2[] = []
  for (let i = 0; i <= N; i++) {
    const s = lerp(lo, hi, i / N)
    let acc = 0; for (const b of balls) { const f = Math.sqrt(Math.max(0, b.r * b.r - (s - b.c) ** 2)); acc += f ** 6 }
    pts.push(new THREE.Vector2(Math.max(0.0001, Math.pow(acc, 1 / 6)) * (i === 0 || i === N ? 0 : 1), s))
  }
  const g = new THREE.LatheGeometry(pts, 72)
  // 膜面不是光滑的球：沿经线加一点起伏
  const p = g.attributes.position, r = rng(5), ph = [r() * 6, r() * 6, r() * 6]
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), q = 1 + 0.012 * Math.sin(a * 5 + y * 0.31 + ph[0]) + 0.008 * Math.sin(a * 9 - y * 0.5 + ph[1])
    p.setX(i, x * q); p.setZ(i, z * q)
  }
  g.computeVertexNormals()
  return g
}
/** 一个细胞的膜：axis 为 'x' 时沿 x 缢裂 */
export function Membrane({ at, R, lobes = [], k = 0, axis = 'x', tint = '#cfe8dc', opacity = 1 }: { at: V3; R: number; lobes?: Lobe[]; k?: number; axis?: 'x' | 'y'; tint?: string; opacity?: number }) {
  const q = Math.round(k * 60) / 60
  const key = lobes.map(l => `${l.c},${l.r}`).join(';')
  const g = useMemo(() => membraneGeo(R, lobes, q), [R, key, q])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group position={at} rotation-z={axis === 'x' ? -Math.PI / 2 : 0}>
    {/* 外层：带一点清漆光泽的半透明膜；里层：很淡的细胞质 */}
    <mesh geometry={g} renderOrder={2}><meshPhysicalMaterial color={tint} roughness={0.2} clearcoat={1} clearcoatRoughness={0.15} sheen={0.35} sheenColor="#ffffff" sheenRoughness={0.5} transparent opacity={0.17 * opacity} side={THREE.DoubleSide} depthWrite={false} envMapIntensity={1.4} /></mesh>
    <mesh geometry={g} scale={0.985} renderOrder={1}><meshStandardMaterial color="#e6efe6" roughness={0.6} transparent opacity={0.05 * opacity} depthWrite={false} /></mesh>
  </group>
}

// ---------- 核膜 ----------
/** 剖开的细胞核：双层核膜只画朝后的大半圈，朝镜头的一面开着；膜上有核孔。opacity 为 0 时整个不画 */
export function Nucleus({ at, R, opacity }: { at: V3; R: number; opacity: number }) {
  const g = useMemo(() => {
    const open = (r: number) => new THREE.SphereGeometry(r, 48, 32, Math.PI * 0.75, Math.PI * 1.5)
    const pores: THREE.BufferGeometry[] = [], rr = rng(2)
    for (let i = 0; i < 46; i++) {
      const phi = Math.PI * 0.75 + rr() * Math.PI * 1.5, th = Math.acos(1 - 2 * rr()), n = new THREE.Vector3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th))
      const t = new THREE.TorusGeometry(R * 0.04, R * 0.014, 6, 12); t.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)); t.translate(...n.multiplyScalar(R * 1.004).toArray())
      pores.push(t)
    }
    return { outer: open(R), inner: open(R * 0.95), pores: mergeGeometries(pores) }
  }, [R])
  if (opacity <= 0.01) return null
  return <group position={at} rotation-y={-0.35}>
    <mesh geometry={g.outer} renderOrder={1}><meshPhysicalMaterial color="#b9a9dc" roughness={0.35} clearcoat={0.6} transparent opacity={0.42 * opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh geometry={g.inner} renderOrder={1}><meshPhysicalMaterial color="#ddd2f0" roughness={0.4} transparent opacity={0.26 * opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh geometry={g.pores}><meshStandardMaterial color="#6f58a0" roughness={0.5} transparent opacity={opacity} /></mesh>
  </group>
}

// ---------- 中心体和纺锤丝 ----------
/** 中心体：一对互相垂直的中心粒（九组短管围成的小圆筒），四周放射出星射线 */
function Centrosome({ at, dir, opacity }: { at: V3; dir: V3; opacity: number }) {
  const rays = useMemo(() => { const r = rng(at[0] * 7 + at[1] * 3 + 11), out: [V3, V3][] = []; for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, b = (r() - 0.5) * 2.6, L = 3 + r() * 2.5; out.push([[0, 0, 0], [Math.cos(a) * Math.cos(b) * L, Math.sin(a) * Math.cos(b) * L, Math.sin(b) * L * 0.6]]) } return out }, [at])   // eslint-disable-line react-hooks/exhaustive-deps
  const yaw = Math.atan2(dir[1], dir[0])
  return <group position={at} rotation-z={yaw}>
    {[0, 1].map(i => <group key={i} rotation={i ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2]} position={[i * 0.9, 0, 0]}>
      {Array.from({ length: 9 }, (_, j) => <mesh key={j} position={[Math.cos(j / 9 * Math.PI * 2) * 0.42, 0, Math.sin(j / 9 * Math.PI * 2) * 0.42]}><cylinderGeometry args={[0.13, 0.13, 1.5, 6]} /><meshStandardMaterial color="#5c8f4a" roughness={0.5} transparent opacity={opacity} /></mesh>)}
    </group>)}
    {rays.map((r, i) => <Line key={i} points={r} color="#9fd39a" lineWidth={1} transparent opacity={0.5 * opacity} />)}
  </group>
}
export interface SpindleSpec { poles: [V3, V3]; fibers: { to: V3; pole: 0 | 1 }[]; opacity: number }
/** 纺锤体：两极的中心体、牵引染色体的纺锤丝（连到着丝粒），和几根从一极搭到另一极的纺锤丝 */
export function Spindle({ s }: { s: SpindleSpec }) {
  if (s.opacity <= 0.01) return null
  const [a, b] = s.poles, mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
  const ax = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0).normalize(), nx = new THREE.Vector3(-ax.y, ax.x, 0), L = Math.hypot(b[0] - a[0], b[1] - a[1])
  const polar: V3[][] = [-1, -0.55, -0.2, 0.2, 0.55, 1].map((t, i) => {
    const bow = t * L * 0.32, dz = (i % 2 ? 1 : -1) * L * 0.08
    return Array.from({ length: 13 }, (_, j) => { const u = j / 12, w = Math.sin(u * Math.PI); return [a[0] + (b[0] - a[0]) * u + nx.x * bow * w, a[1] + (b[1] - a[1]) * u + nx.y * bow * w, mid[2] + dz * w] as V3 })
  })
  return <group>
    <Centrosome at={a} dir={[-ax.x, -ax.y, 0]} opacity={s.opacity} />
    <Centrosome at={b} dir={[ax.x, ax.y, 0]} opacity={s.opacity} />
    {polar.map((p, i) => <Line key={`p${i}`} points={p} color="#bfe8b8" lineWidth={1.4} transparent opacity={0.6 * s.opacity} />)}
    {s.fibers.map((f, i) => <Line key={i} points={[s.poles[f.pole], f.to]} color="#dcffd2" lineWidth={2.2} transparent opacity={s.opacity} />)}
  </group>
}

// ---------- 减数分裂的编排 ----------
/** 一根染色单体：第 pair 对、来自 who（0 母方 1 父方）、sis（0 靠里，1 靠外） */
export interface Pose { c: V3; th: number; op: number; sc: number }
const KEYS: [number, number, number][] = []
for (let p = 0; p < 2; p++) for (let w = 0; w < 2; w++) for (let s = 0; s < 2; s++) KEYS.push([p, w, s])
export const CHROMATIDS = KEYS
const rot = (th: number, x: number, y: number): [number, number] => [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)]
/** 同源染色体在细胞左右哪一边（中期Ⅰ以后）：flip 是这一对的排列方向 */
export const sideOf = (who: number, flip: boolean) => (who === 0 ? -1 : 1) * (flip ? -1 : 1)
/** 末期Ⅰ以后两个子细胞的中心 */
export const CELL2 = 22, CELL4Y = 16
export const R1 = 26, R2 = 20.6, R4 = 16.4
/** 姐妹染色单体离中线多远；四分体里靠里、靠外两根单体离四分体中线多远 */
const SO = 1.0, IN = 1.8, OUT = 3.8
export const GAP = IN * 2

/** 第 ph 个时期（PHASES 的序号）的定格姿势 */
function poseAt(ph: number, p: number, w: number, s: number, flip: boolean[]): Pose {
  const inner = s === 0
  // 间期：染色体散在核里
  const G1 = [[[-4.5, 3, 0.6], [5, -1.5, -0.8]], [[4, 6.5, -1.6], [-3.5, -6.5, 1.4]]][p][w] as V3
  const G1T = [[0.5, -0.7], [1.9, 2.5]][p][w]
  if (ph === 0) return { c: G1, th: G1T, op: s === 0 ? 0.8 : 0, sc: 0.86 }
  if (ph === 1) { const [x, y] = rot(G1T, s === 0 ? -SO : SO, 0); return { c: [G1[0] + x, G1[1] + y, G1[2]], th: G1T, op: 1, sc: 0.92 } }
  if (ph === 2) {
    // 前期Ⅰ：同源染色体两两配对（联会），四条单体并排成一个四分体
    const T = ([[-4.5, 1.5, 0], [6.5, -3.5, 1]] as V3[])[p], th = [0.32, -0.42][p], sg = w === 0 ? -1 : 1
    const [x, y] = rot(th, sg * (inner ? IN : OUT), 0)
    return { c: [T[0] + x, T[1] + y, T[2]], th, op: 1, sc: 1 }
  }
  const sg = sideOf(w, flip[p])
  const Y = [8, -8.8][p]
  if (ph === 3) return { c: [sg * (inner ? IN : OUT), Y, 0], th: 0, op: 1, sc: 1 }
  if (ph === 4) return { c: [sg * 15.5 + (inner ? -sg : sg) * SO, Y * 0.92, 0], th: -sg * 0.16, op: 1, sc: 1 }
  if (ph === 5) { const th = [0.35, -0.3][p], [x, y] = rot(th, (inner ? -sg : sg) * SO, 0); return { c: [sg * 20 + [-4, 4.5][p] + x, [2, -2.5][p] + y, 0], th, op: 1, sc: 1 } }
  const cx = sg * CELL2, sx = inner ? -SO : SO
  if (ph === 6) { const th = [0.45, -0.5][p], [x, y] = rot(th, sx, 0); return { c: [cx + [-4.5, 5][p] + x, [2.5, -3][p] + y, 0], th, op: 1, sc: 1 } }
  const X = cx + [-5.5, 7.5][p]
  if (ph === 7) { const th = Math.PI / 2 + [0.22, -0.2][p], [x, y] = rot(th, sx, 0); return { c: [X + x, [1.2, -1.2][p] + y, 0], th, op: 1, sc: 1 } }
  if (ph === 8) return { c: [X, Math.sign(sx) * 11.5 + [1.2, -1.2][p], 0], th: Math.PI / 2 + [0.22, -0.2][p], op: 1, sc: 1 }
  return { c: [cx + [-3.5, 4][p], Math.sign(sx) * 15.5, 0], th: [0.28, -0.3][p], op: 1, sc: 0.92 }
}
/** 从第 ph−1 个时期走向第 ph 个时期，走了 e（0–1） */
export function pose(ph: number, e: number, p: number, w: number, s: number, flip: boolean[]): Pose {
  const b = poseAt(ph, p, w, s, flip)
  if (ph === 0 || e >= 1) return b
  const a = poseAt(ph - 1, p, w, s, flip), k = ease(e)
  return { c: [lerp(a.c[0], b.c[0], k), lerp(a.c[1], b.c[1], k), lerp(a.c[2], b.c[2], k)], th: lerp(a.th, b.th, k), op: lerp(a.op, b.op, k), sc: lerp(a.sc, b.sc, k) }
}
/** 着丝粒在哪（单体中心加上沿轴的偏移） */
export function kinetochore(p: number, P: Pose): V3 {
  const off = (PAIRS[p].cen - 0.5) * PAIRS[p].len * P.sc, [x, y] = rot(P.th, 0, off)
  return [P.c[0] + x, P.c[1] + y, P.c[2]]
}
/** 基因所在的那一点 */
export function geneAt(p: number, P: Pose): V3 {
  const off = (PAIRS[p].gene - 0.5) * PAIRS[p].len * P.sc, [x, y] = rot(P.th, 0, off)
  return [P.c[0] + x, P.c[1] + y, P.c[2]]
}

/** 这一时期的细胞膜、核膜、纺锤体 */
export function frame(ph: number, e: number, poses: Map<string, Pose>) {
  const k = ease(e)
  const membranes: { at: V3; R: number; lobes?: Lobe[]; k?: number; axis?: 'x' | 'y' }[] = []
  const nuclei: { at: V3; R: number; opacity: number }[] = []
  const spindles: SpindleSpec[] = []
  if (ph <= 4) membranes.push({ at: [0, 0, 0], R: R1 })
  else if (ph === 5) membranes.push({ at: [0, 0, 0], R: R1, lobes: [{ c: -CELL2, r: R2 }, { c: CELL2, r: R2 }], k: e, axis: 'x' })
  else if (ph <= 8) for (const sx of [-1, 1]) membranes.push({ at: [sx * CELL2, 0, 0], R: R2 })
  else for (const sx of [-1, 1]) membranes.push({ at: [sx * CELL2, 0, 0], R: R2, lobes: [{ c: -CELL4Y, r: R4 }, { c: CELL4Y, r: R4 }], k: e, axis: 'y' })

  if (ph <= 1) nuclei.push({ at: [0, 0, 0], R: 15, opacity: 1 })
  if (ph === 2) nuclei.push({ at: [0, 0, 0], R: 15, opacity: 1 - k })
  if (ph === 5) for (const sx of [-1, 1]) nuclei.push({ at: [sx * 20, 0, 0], R: 11, opacity: k })
  if (ph === 6) for (const sx of [-1, 1]) nuclei.push({ at: [sx * CELL2, 0, 0], R: 11, opacity: 1 - k })
  if (ph === 9) for (const sx of [-1, 1]) for (const sy of [-1, 1]) nuclei.push({ at: [sx * CELL2, sy * 14.5, 0], R: 8, opacity: k })

  const kin = (p: number, w: number, s: number) => kinetochore(p, poses.get(`${p}${w}${s}`)!)
  if (ph >= 2 && ph <= 5) {
    const op = ph === 2 ? k : ph === 5 ? 1 - k : 1, spread = ph === 2 ? lerp(8, 23, k) : 23
    const fibers: SpindleSpec['fibers'] = []
    if (ph >= 3) for (let p = 0; p < 2; p++) for (let w = 0; w < 2; w++) {
      const a = kin(p, w, 0), b = kin(p, w, 1), x = (a[0] + b[0]) / 2
      fibers.push({ to: [x, (a[1] + b[1]) / 2, 0], pole: x < 0 ? 0 : 1 })
    }
    spindles.push({ poles: [[-spread, 0, -1], [spread, 0, -1]], fibers, opacity: op })
  }
  if (ph >= 6) {
    const op = ph === 6 ? k : ph === 9 ? 1 - k : 1, spread = ph === 6 ? lerp(5, 16.5, k) : 16.5
    for (const sx of [-1, 1]) {
      const fibers: SpindleSpec['fibers'] = []
      if (ph >= 7) for (const [p, w, s] of KEYS) { const t = kin(p, w, s); if (Math.sign(t[0]) !== sx) continue; fibers.push({ to: t, pole: t[1] < 0 ? 0 : 1 }) }
      spindles.push({ poles: [[sx * CELL2, -spread, -1], [sx * CELL2, spread, -1]], fibers, opacity: op })
    }
  }
  return { membranes, nuclei, spindles }
}

/** 第 1、2 课的细胞模型：ph、e 是时期和走到哪；flip 每对同源染色体的排列方向；cross 交叉互换的程度（0–1，1 以后换成重组的单体），crossed 已经交换过 */
export function MeiosisModel({ at, ph, e, flip, cross, crossed }: { at: V3; ph: number; e: number; flip: boolean[]; cross: number; crossed: boolean }) {
  const poses = new Map<string, Pose>()
  for (const [p, w, s] of KEYS) poses.set(`${p}${w}${s}`, pose(ph, e, p, w, s, flip))
  const f = frame(ph, e, poses)
  return <group position={at}>
    {f.membranes.map((m, i) => <Membrane key={`${f.membranes.length}-${i}`} {...m} />)}
    {f.nuclei.map((n, i) => <Nucleus key={`${f.nuclei.length}-${i}`} {...n} />)}
    {f.spindles.map((s, i) => <Spindle key={i} s={s} />)}
    {KEYS.map(([p, w, s]) => {
      const P = poses.get(`${p}${w}${s}`)!
      // 交叉只发生在第 1 对的两根靠里的单体之间
      const inner = s === 0 && p === 0
      return <Chromatid key={`${p}${w}${s}`} pair={p} who={w} inner={inner} dir={w === 0 ? 1 : -1} gap={GAP} at={P.c} th={P.th} opacity={P.op} scale={P.sc} morph={inner ? cross : 0} recomb={inner && crossed} />
    })}
  </group>
}

/** 基因字母的标签：两条姐妹单体挨在一起时合成一个（如“A a”），分开以后各标各的 */
export function geneLabels(at: V3, ph: number, e: number, flip: boolean[], crossed: boolean) {
  const out: { id: string; at: V3; ax: number; className: string; children: string }[] = []
  for (let p = 0; p < 2; p++) for (let w = 0; w < 2; w++) {
    const pts = [0, 1].map(s => { const Q = pose(ph, e, p, w, s, flip), g = geneAt(p, Q), who = crossed && p === 0 && s === 0 ? 1 - w : w; return { g, L: PAIRS[p].letters[who] } }).sort((a, b) => a.g[0] - b.g[0])
    const near = Math.hypot(pts[0].g[0] - pts[1].g[0], pts[0].g[1] - pts[1].g[1]) < 5
    const cls = 'scene-tag !px-1.5 !py-0 -translate-y-1/2'
    // 同源的另一条在哪边：标签放在外侧，免得两对字母挤在一起
    const mate = pose(ph, e, p, 1 - w, 0, flip).c[0], mx = (pts[0].g[0] + pts[1].g[0]) / 2, out1 = mx < mate ? -1 : 1
    if (near) out.push({ id: `g${p}${w}`, at: [at[0] + mx + out1 * 4.2, at[1] + (pts[0].g[1] + pts[1].g[1]) / 2, at[2] + 3], ax: out1 < 0 ? 1 : 0, className: cls, children: `${pts[0].L} ${pts[1].L}` })
    else pts.forEach((q, s) => out.push({ id: `g${p}${w}${s}`, at: [at[0] + q.g[0] + 3, at[1] + q.g[1], at[2] + 3], ax: 0, className: cls, children: q.L }))
  }
  return out
}
