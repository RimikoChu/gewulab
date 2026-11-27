// 基因的表达实验室的大场景：放大的一个真核细胞内部。左边是细胞核（双层核膜、核孔复合体、染色质丝、核仁），
// 核里暗紫色；核膜外是细胞质：一层层粗面内质网（表面密布核糖体）、剖开的线粒体、游离核糖体、囊泡、微管。
// 前四课在核里，后三课和拓展在核外。整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。画面里的大小都是示意，不按比例。
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, type Label } from '@/lab-kit'
import { fbm, rng, type V3 } from './kit'
import { BASE_COLOR, blobGeo } from './mol'

// ---------- 布局 ----------
export const NUC_R = 70
/** 第 4 课 mRNA 出去的那个核孔：朝 +x 稍偏前 */
export const PORE_DIR = new THREE.Vector3(1, 0, 0.12).normalize()
export const PORE: V3 = PORE_DIR.clone().multiplyScalar(NUC_R + 0.8).toArray() as V3
/** 各课器材的位置 */
export const AT = {
  one: [-30, 4, 14] as V3,
  two: [-10, -8, 28] as V3,
  three: [-2, 10, -20] as V3,
  four: [44, 0, 5] as V3,
  five: [92, 3, 12] as V3,
  six: [114, -1, 3] as V3,
  seven: [138, 3, 12] as V3,
  ext: [112, 26, 34] as V3,
}
/** 粗面内质网最上面一层的高度（第 6 课的核糖体贴在它上面） */
export const ER_TOP = -6.6

const spot = (p: V3, dy: number, w: number, h: number, view: [number, number], inside: boolean) => ({ target: new THREE.Vector3(p[0], p[1] + dy, p[2]), span: [w, h] as [number, number], view, inside })
export const SPOT = {
  one: spot(AT.one, -0.2, 7.9, 4.8, [-0.12, 0.08], true),
  oneHelix: spot(AT.one, 0, 7.8, 5.0, [-0.45, 0.18], true),
  two: spot(AT.two, 0.3, 11.5, 6.6, [0.4, 0.16], true),
  twoGen: spot(AT.two, 0, 13, 9.2, [0.2, 0.22], true),
  three0: spot([AT.three[0] - 23, AT.three[1], AT.three[2]], 0, 50, 24, [0.3, 0.16], true),
  three1: spot([AT.three[0] - 3, AT.three[1], AT.three[2]], 0, 27, 13, [0.12, 0.14], true),
  three2: spot([AT.three[0] + 23.2, AT.three[1], AT.three[2]], 0, 21, 8, [-0.05, 0.1], true),
  four: spot(AT.four, 0.8, 15, 8.4, [-0.08, 0.1], true),
  fourOut: spot(PORE_DIR.clone().multiplyScalar(NUC_R - 9).toArray() as V3, 0, 17, 11, [-1.2, 0.16], true),
  five: spot(AT.five, 3.0, 14.6, 13.2, [0.04, 0.06], false),
  six: spot(AT.six, 2.8, 15, 12, [-0.2, 0.1], false),
  seven: spot([AT.seven[0], AT.seven[1], AT.seven[2]], -1.2, 15, 14.2, [0.03, 0.02], false),
  ext: spot(AT.ext, 0.6, 19, 13, [-0.05, 0.1], false),
  extGel: spot([AT.ext[0] + 18, AT.ext[1], AT.ext[2]], 0.2, 8.6, 7.6, [0.08, 0.06], false),
  cell: spot([48, 4, 0], 0, 250, 135, [-0.62, 0.38], false),
}
export type SpotKey = keyof typeof SPOT

/** 每一课用它代替 LabStage：只要说在哪一处 */
export function Room({ at, labels, children = null, span, aim }: { at: SpotKey; labels: Label[]; children?: ReactNode; span?: [number, number]; aim?: V3 }) {
  const v = SPOT[at], w = span?.[0] ?? v.span[0], h = span?.[1] ?? v.span[1]
  const sp = useMemo<[number, number]>(() => [w, h], [w, h])
  const ax = aim?.[0], ay = aim?.[1], az = aim?.[2]
  const target = useMemo(() => ax === undefined ? v.target : new THREE.Vector3(ax, ay, az), [v, ax, ay, az])
  return <LabStage<{ cut: boolean }> world={{ cut: at === 'cell' }} labels={labels} target={target} span={sp} view={v.view} sky={false} studio env={at === 'cell' ? 1.0 : v.inside ? 0.55 : 0.6} sun={at === 'cell' ? 2.6 : v.inside ? 1.5 : 1.7}
    backdrop={at === 'cell' ? '#0b1c22' : v.inside ? '#140d20' : '#071519'} fog={at === 'cell' ? [320, 1000] : v.inside ? [26, 150] : [30, 190]} free>{children}</LabStage>
}

// ---------- 分段生成：一次只做一样，免得进页面卡住 ----------
const made = new Map<string, unknown>(), queue: { key: string; make: () => unknown; done: Set<() => void> }[] = []
let pumping = false
function pump() {
  const t0 = performance.now()
  while (queue.length && performance.now() - t0 < 12) { const j = queue.shift()!; made.set(j.key, j.make()); j.done.forEach(f => f()) }
  if (queue.length) setTimeout(pump, 16); else pumping = false
}
export function useLazy<T>(key: string, make: () => T): T | null {
  const [, bump] = useState(0)
  useEffect(() => {
    if (made.has(key)) return
    const f = () => bump(n => n + 1)
    let j = queue.find(q => q.key === key); if (!j) { j = { key, make, done: new Set() }; queue.push(j) }
    j.done.add(f)
    if (!pumping) { pumping = true; setTimeout(pump, 30) }
    return () => { j!.done.delete(f) }
  }, [key])   // eslint-disable-line react-hooks/exhaustive-deps
  return (made.get(key) as T) ?? null
}

const paint = (g: THREE.BufferGeometry, hex: string, vary = 0, seed = 1) => {
  const c = new THREE.Color(), base = new THREE.Color(hex), p = g.attributes.position, a = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) { const n = vary ? fbm(p.getX(i) * 0.3 + seed, p.getY(i) * 0.3, p.getZ(i) * 0.3) : 0; c.copy(base).multiplyScalar(1 + vary * n); a.set([c.r, c.g, c.b], i * 3) }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g
}

// ---------- 细胞核 ----------
function membraneGeo(r: number, seed: number) {
  // 双层核膜的一层：表面有起伏和大块的明暗；核孔处两层膜往中间凹进去连在一起，形成一个个孔
  const g = new THREE.SphereGeometry(r, 320, 220), p = g.attributes.position, v = new THREE.Vector3(), col = new Float32Array(p.count * 3), c = new THREE.Color()
  const inner = seed === 0, base = new THREE.Color(inner ? '#6a5590' : '#8b76ad'), pit = new THREE.Color(inner ? '#1b1026' : '#3b2c52'), rim = new THREE.Color(inner ? '#a78bd0' : '#c8b2ea')
  const cosIn = Math.cos(0.05), cosOut = Math.cos(0.085)
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize()
    let best = -1; for (const d of PORES) { const k = v.dot(d); if (k > best) best = k }
    const t = best > cosOut ? Math.min(1, (best - cosOut) / (cosIn - cosOut)) : 0, f = t * t * (3 - 2 * t)
    const n = fbm(v.x * 4 + seed, v.y * 4, v.z * 4, 4), big = fbm(v.x * 9 + 3, v.y * 9, v.z * 9, 2)
    v.multiplyScalar(r * (1 + 0.01 * n) + (inner ? 0.8 : -0.8) * f); p.setXYZ(i, v.x, v.y, v.z)
    c.copy(base).multiplyScalar(0.6 + 0.5 * (n + 0.5) + 0.35 * big)
    if (f > 0) c.lerp(f > 0.85 ? pit : rim, f > 0.85 ? (f - 0.85) / 0.15 : f * 0.6)
    col.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g
}
/** 核孔的位置：球面上均匀撒开的点，再加上第 4 课用的那一个 */
const PORES = (() => {
  const out: THREE.Vector3[] = [PORE_DIR.clone()], N = 110, ga = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < N; i++) { const y = 1 - (i + 0.5) / N * 2, r = Math.sqrt(1 - y * y), t = ga * i; const d = new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r); if (d.angleTo(PORE_DIR) > 0.14) out.push(d) }
  return out
})()
/** 核孔复合体：八根辐条围成的环，中间一个塞子，环心发一点光 */
function poreGeo() {
  const parts: THREE.BufferGeometry[] = []
  const ring = new THREE.TorusGeometry(2.3, 0.62, 12, 40); parts.push(paint(ring, '#c3a8de', 0.2))
  const ring2 = new THREE.TorusGeometry(2.3, 0.45, 10, 40); ring2.translate(0, 0, -1.6); parts.push(paint(ring2, '#a58cc4', 0.2))
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, s = new THREE.CapsuleGeometry(0.32, 1.6, 4, 8); s.rotateX(Math.PI / 2); s.translate(Math.cos(a) * 2.3, Math.sin(a) * 2.3, -0.8); parts.push(paint(s, '#b79ad6', 0.2)) }
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, s = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 6); s.rotateZ(a + Math.PI / 2); s.translate(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0.1); parts.push(paint(s, '#d8c6ea')) }
  const plug = new THREE.SphereGeometry(0.75, 16, 12); plug.scale(1, 1, 1.3); parts.push(paint(plug, '#e2d4f0'))
  return mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g))
}
/** 随堂检测时把细胞核朝镜头的一半切掉，看得见里面 */
export const CUT = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)]
function Nucleus({ cut }: { cut: boolean }) {
  const inner = useLazy('memIn', () => membraneGeo(NUC_R, 0)), outer = useLazy('memOut', () => membraneGeo(NUC_R + 1.6, 3))
  const pore = useLazy('pore', poreGeo)
  const clip = cut ? CUT : []
  const inst = useMemo(() => {
    if (!pore) return null
    const m = new THREE.InstancedMesh(pore, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }), PORES.length)
    const glow = new THREE.InstancedMesh(new THREE.CircleGeometry(3.0, 32), new THREE.MeshBasicMaterial({ color: '#163a3c', transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }), PORES.length)
    const q = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1), M = new THREE.Matrix4(), S = new THREE.Vector3(1.9, 1.9, 1.9)
    PORES.forEach((d, i) => { q.setFromUnitVectors(Z, d); M.compose(d.clone().multiplyScalar(NUC_R + 1.6), q, S); m.setMatrixAt(i, M); M.compose(d.clone().multiplyScalar(NUC_R + 0.8), q, new THREE.Vector3(1, 1, 1)); glow.setMatrixAt(i, M) })
    return { m, glow }
  }, [pore])
  useEffect(() => { if (inst) { (inst.m.material as THREE.Material).clippingPlanes = clip; (inst.glow.material as THREE.Material).clippingPlanes = clip } }, [inst, clip])
  return <group>
    {inner && <mesh geometry={inner} receiveShadow><meshStandardMaterial vertexColors side={cut ? THREE.DoubleSide : THREE.BackSide} roughness={0.75} emissive="#3a2450" emissiveIntensity={0.8} clippingPlanes={clip} /></mesh>}
    {outer && <mesh geometry={outer}><meshPhysicalMaterial vertexColors side={cut ? THREE.DoubleSide : THREE.FrontSide} roughness={0.55} sheen={0.8} sheenColor="#e9d8ff" emissive="#20142e" emissiveIntensity={0.5} clippingPlanes={clip} /></mesh>}
    {inst && <><primitive object={inst.m} /><primitive object={inst.glow} /></>}
  </group>
}

/** 核里的染色质丝：一团团弯弯曲曲的细丝，绕开各课的器材 */
function chromatinGeo() {
  const r = rng(17), list: THREE.BufferGeometry[] = [], keep = [AT.one, AT.two, AT.four, [AT.three[0] + 18, AT.three[1], AT.three[2]] as V3, [AT.three[0] - 30, AT.three[1], AT.three[2]] as V3, [AT.three[0], AT.three[1], AT.three[2]] as V3]
  const kv = keep.flatMap(k => [0, 12, 24, 36].map(dz => new THREE.Vector3(k[0], k[1], k[2] + dz)))
  const near = (p: THREE.Vector3) => kv.some(k => p.distanceTo(k) < 16) || p.length() > NUC_R - 6
  for (let n = 0; n < 46; n++) {
    let p = new THREE.Vector3((r() - 0.5) * 100, (r() - 0.5) * 90, (r() - 0.5) * 100)
    if (near(p)) continue
    const pts = [p.clone()], d = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize()
    for (let k = 0; k < 40; k++) {
      d.add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.9)).normalize()
      p = p.clone().addScaledVector(d, 2.6)
      if (near(p)) break
      pts.push(p)
    }
    if (pts.length < 5) continue
    const t = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 6, 0.32 + r() * 0.3, 7, false)
    list.push(paint(t, r() > 0.5 ? '#4f3a6b' : '#5d4378', 0.3, n))
  }
  return mergeGeometries(list)
}
const nucleolusGeo = () => blobGeo(v => 1 + 0.2 * fbm(v.x * 2, v.y * 2, v.z * 2), { amp: 0.12, freq: 4, seed: 11, color: '#7b5a99' })

/** 核里和细胞质里漂着的游离核苷酸（原料），慢慢飘 */
function Drifters({ n, box, seed, rna }: { n: number; box: [V3, V3]; seed: number; rna?: boolean }) {
  const mesh = useMemo(() => {
    const g = new THREE.CapsuleGeometry(0.1, 0.34, 3, 8)
    const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.5, transparent: true, opacity: 0.8 }), n)
    const r = rng(seed), bases = rna ? ['A', 'U', 'G', 'C'] : ['A', 'T', 'G', 'C'], c = new THREE.Color()
    const data = Array.from({ length: n }, (_, i) => { c.set(BASE_COLOR[bases[i % 4] as 'A']); m.setColorAt(i, c); let p = new THREE.Vector3()
      for (let t = 0; t < 30; t++) { p = new THREE.Vector3(box[0][0] + r() * (box[1][0] - box[0][0]), box[0][1] + r() * (box[1][1] - box[0][1]), box[0][2] + r() * (box[1][2] - box[0][2])); if (!SPOTS_ALL.some(k => [0, 10, 20, 30].some(dz => p.distanceTo(new THREE.Vector3(k[0], k[1], k[2] + dz)) < 11))) break }
      return { p, a: new THREE.Euler(r() * 6, r() * 6, r() * 6), w: r() * 6 } })
    return { m, data }
  }, [n, box, seed, rna])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, M = new THREE.Matrix4(), q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3()
    mesh.data.forEach((d, i) => { P.copy(d.p).add(new THREE.Vector3(Math.sin(t * 0.3 + d.w) * 0.6, Math.cos(t * 0.23 + d.w) * 0.6, Math.sin(t * 0.19 + d.w * 2) * 0.6)); q.setFromEuler(new THREE.Euler(d.a.x + t * 0.2, d.a.y + t * 0.15, d.a.z)); M.compose(P, q, S); mesh.m.setMatrixAt(i, M) })
    mesh.m.instanceMatrix.needsUpdate = true
  })
  return <primitive object={mesh.m} />
}

// ---------- 细胞质 ----------
/** 一层内质网扁囊：一张起伏的“扁饼”，两层膜中间是腔 */
function cisternaGeo(sx: number, sz: number, seed: number) {
  const g = new THREE.SphereGeometry(1, 96, 48), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color()
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) * sx, z = p.getZ(i) * sz, y0 = p.getY(i)
    const n = fbm(x * 0.06 + seed, z * 0.06, seed)
    const y = Math.sign(y0) * Math.pow(Math.abs(y0), 0.35) * 0.55 + 2.2 * n + 0.8 * Math.sin(x * 0.12 + seed)
    p.setXYZ(i, x, y, z)
    c.set(y0 > 0 ? '#3f9a96' : '#2f7d7c').multiplyScalar(0.85 + 0.3 * (fbm(x * 0.3, z * 0.3, seed) + 0.5)); col.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g
}
const SPOTS_ALL: V3[] = Object.values(AT)
const ER_SHEETS: { p: V3; s: [number, number]; seed: number; ry: number }[] = [
  { p: [106, ER_TOP - 2.6, -10], s: [26, 16], seed: 1, ry: 0.1 },
  { p: [104, ER_TOP - 5.0, -12], s: [28, 16], seed: 2, ry: -0.05 },
  { p: [102, ER_TOP - 8.4, -14], s: [30, 17], seed: 3, ry: 0.12 },
  { p: [100, ER_TOP - 11.8, -16], s: [30, 17], seed: 4, ry: -0.08 },
  { p: [100, 6, -34], s: [30, 14], seed: 5, ry: 0.5 },
  { p: [98, 1, -38], s: [32, 15], seed: 6, ry: 0.55 },
  { p: [146, 10, -30], s: [26, 14], seed: 7, ry: -0.4 },
  { p: [30, 82, -30], s: [34, 18], seed: 8, ry: 0.9 },
  { p: [26, 88, -34], s: [30, 16], seed: 9, ry: 0.95 },
  { p: [-20, -84, -20], s: [34, 18], seed: 10, ry: -0.6 },
  { p: [-24, -90, -24], s: [30, 16], seed: 11, ry: -0.55 },
]
/** 内质网表面的核糖体：两瓣的小团，实例化撒满上表面 */
function erRibosomes() {
  const r = rng(29), out: THREE.Matrix4[] = [], q = new THREE.Quaternion(), e = new THREE.Euler()
  for (const s of ER_SHEETS) for (let k = 0; k < 70; k++) {
    const u = r() * 2 - 1, v = r() * 2 - 1; if (u * u + v * v > 0.85) continue
    const lx = u * s.s[0], lz = v * s.s[1], n = fbm(lx * 0.06 + s.seed, lz * 0.06, s.seed), ly = 2.2 * n + 0.8 * Math.sin(lx * 0.12 + s.seed) + 0.75
    const c = Math.cos(s.ry), si = Math.sin(s.ry)
    const p = new THREE.Vector3(s.p[0] + lx * c + lz * si, s.p[1] + ly, s.p[2] - lx * si + lz * c)
    if (p.distanceTo(new THREE.Vector3(...AT.six)) < 16 || p.distanceTo(new THREE.Vector3(...AT.seven)) < 12) continue
    q.setFromEuler(e.set(r() * 0.4, r() * 6, r() * 0.4)); out.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.55 + r() * 0.2)))
  }
  return out
}
const miniRiboGeo = () => { const a = blobGeo(() => 0.9, { amp: 0.15, seg: 20, seed: 2, color: '#8aa1d9' }); a.translate(0, 0.55, 0); const b = blobGeo(() => 0.65, { amp: 0.15, seg: 18, seed: 4, color: '#c1aee6' }); b.scale(1.1, 0.75, 0.9); return mergeGeometries([a, b]) }
/** 线粒体：朝镜头剖开，剖面上是一道道嵴 */
function mitoGeo(seed: number) {
  const g = new THREE.CapsuleGeometry(2.4, 7, 16, 40), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color()
  g.rotateZ(Math.PI / 2)
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = fbm(x * 0.4 + seed, y * 0.4, z * 0.4)
    x *= 1 + 0.03 * n; y *= 1 + 0.05 * n
    const cut = z > 0.6
    if (cut) z = 0.6
    p.setXYZ(i, x, y, z)
    if (cut) { const ring = Math.hypot(x / 5.4, y / 2.2), crista = Math.sin(x * 2.3) > 0.35 && Math.abs(y) < 1.9 * (1 - Math.pow(Math.abs(x) / 6.2, 4)); c.set(ring > 0.93 ? '#e0896a' : crista ? '#f3b48d' : '#a8463a') }
    else c.set('#c9654c').multiplyScalar(0.85 + 0.3 * (n + 0.5))
    col.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g
}
const MITOS: { p: V3; r: V3 }[] = [{ p: [70, 62, -10], r: [0.3, 0.4, 0.6] }, { p: [-60, 72, -30], r: [0.1, -0.5, 0.2] }, { p: [60, -70, 10], r: [-0.4, 0.8, 0.1] }, { p: [96, -16, 26], r: [0.2, 0.5, 0.1] }, { p: [160, 22, -14], r: [-0.3, -0.6, 0.4] }, { p: [84, 22, -12], r: [0.1, 0.9, -0.3] }, { p: [128, -20, 34], r: [0.3, -0.2, 0.2] }, { p: [168, -6, 22], r: [0, 1.2, 0.5] }]
/** 微管：几根长长的细管，横贯细胞质 */
function tubulesGeo() {
  const r = rng(41), list: THREE.BufferGeometry[] = []
  for (let n = 0; n < 16; n++) {
    const a = new THREE.Vector3(80 + r() * 20, (r() - 0.5) * 80, (r() - 0.5) * 90), b = new THREE.Vector3(170 + r() * 40, (r() - 0.5) * 80, (r() - 0.5) * 90), m = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, (r() - 0.5) * 30, (r() - 0.5) * 30))
    if ([AT.five, AT.six, AT.seven, AT.ext].some(k => new THREE.Line3(a, b).closestPointToPoint(new THREE.Vector3(...k), true, new THREE.Vector3()).distanceTo(new THREE.Vector3(...k)) < 12)) continue
    list.push(paint(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 60, 0.22, 6, false), '#5fb3a0'))
  }
  return mergeGeometries(list)
}

function Cytoplasm() {
  const sheets = useLazy('er', () => ER_SHEETS.map(s => cisternaGeo(s.s[0], s.s[1], s.seed)))
  const ribo = useLazy('ribo', () => { const g = miniRiboGeo(), list = erRibosomes(), r = rng(5); for (let k = 0; k < 160; k++) { const p = new THREE.Vector3(80 + r() * 100, (r() - 0.5) * 60, (r() - 0.5) * 80); if ([AT.five, AT.six, AT.seven, AT.ext].some(a => p.distanceTo(new THREE.Vector3(...a)) < 13) || p.length() < NUC_R + 6) continue; list.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, 0)), new THREE.Vector3(0.6, 0.6, 0.6))) } const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, color: '#8d94a8' }), list.length); list.forEach((x, i) => m.setMatrixAt(i, x)); return m })
  const mitos = useLazy('mito', () => MITOS.map((_, i) => mitoGeo(i)))
  const tubes = useLazy('tubes', tubulesGeo)
  const vesicles = useMemo(() => { const r = rng(9); return Array.from({ length: 22 }, () => ({ p: [84 + r() * 90, (r() - 0.5) * 50, (r() - 0.5) * 70] as V3, s: 0.8 + r() * 1.6 })).filter(v => [AT.five, AT.six, AT.seven, AT.ext].every(a => new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...v.p)) > 10)) }, [])
  return <group>
    {sheets && ER_SHEETS.map((s, i) => <mesh key={i} geometry={sheets[i]} position={s.p} rotation-y={s.ry} receiveShadow><meshPhysicalMaterial vertexColors roughness={0.5} sheen={0.7} sheenColor="#bff5ee" transparent opacity={0.92} /></mesh>)}
    {ribo && <primitive object={ribo} />}
    {mitos && MITOS.map((m, i) => <mesh key={i} geometry={mitos[i]} position={m.p} rotation={m.r}><meshPhysicalMaterial vertexColors roughness={0.55} sheen={0.6} sheenColor="#ffd2c0" /></mesh>)}
    {tubes && <mesh geometry={tubes}><meshStandardMaterial vertexColors roughness={0.6} transparent opacity={0.55} /></mesh>}
    {vesicles.map((v, i) => <mesh key={i} position={v.p} scale={v.s}><sphereGeometry args={[1, 24, 16]} /><meshPhysicalMaterial color="#9fd8d0" roughness={0.2} transparent opacity={0.35} clearcoat={1} depthWrite={false} /></mesh>)}
  </group>
}

function WorldInner({ cut = false }: { cut?: boolean }) {
  const gl = useThree(st => st.gl)
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  const chroma = useLazy('chroma', chromatinGeo)
  const nucleolus = useLazy('nucleolus', nucleolusGeo)
  const boxIn = useMemo<[V3, V3]>(() => [[-45, -30, -20], [55, 30, 40]], []), boxOut = useMemo<[V3, V3]>(() => [[78, -12, -20], [160, 30, 40]], [])
  return (
    <group>
      <Nucleus cut={cut} />
      {chroma && <mesh geometry={chroma}><meshStandardMaterial vertexColors roughness={0.8} emissive="#26163a" emissiveIntensity={cut ? 1.2 : 0.7} /></mesh>}
      {nucleolus && <mesh geometry={nucleolus} position={[-52, -34, -10]} scale={[12, 10, 11]}><meshStandardMaterial vertexColors roughness={0.7} emissive="#2a1640" emissiveIntensity={0.6} /></mesh>}
      <Drifters n={45} box={boxIn} seed={3} />
      <Drifters n={30} box={boxOut} seed={8} rna />
      <Cytoplasm />
      {/* 暗处的几盏柔光：核里偏紫、核外偏青 */}
      <pointLight position={[-20, 25, 30]} intensity={900} distance={120} decay={2} color="#d6b8ff" />
      <pointLight position={[40, -10, 25]} intensity={700} distance={100} decay={2} color="#ffc9a8" />
      <pointLight position={[110, 18, 30]} intensity={1400} distance={140} decay={2} color="#b8fff0" />
      <pointLight position={[140, -8, -10]} intensity={900} distance={120} decay={2} color="#ffd9b8" />
      <hemisphereLight args={['#b9c7ff', '#1a1020', 0.35]} />
    </group>
  )
}
export const World = memo(WorldInner)
