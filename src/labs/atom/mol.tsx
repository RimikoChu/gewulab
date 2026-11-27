// 分子的比例模型（space-filling）：原子是有光泽的彩色小球，大小按范德华半径（H 120 pm、C 170 pm、N 155 pm、O 152 pm），
// 原子之间按键长重叠在一起。配色按常见的习惯：H 白、O 红、C 深灰、N 蓝。模型单位 1 = 1 Å（100 pm），由外面缩放。
// MolField 是一大群分子（水里、空气里），每个分子一直在抖动、转动；用 InstancedMesh 画，几千个分子也不卡。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rng } from './mats'

export type El = 'H' | 'O' | 'N' | 'C' | 'X'
export const EL: Record<El, { c: string; r: number }> = {
  H: { c: '#f2f3f1', r: 1.2 }, O: { c: '#d8322a', r: 1.52 }, N: { c: '#3b5fd6', r: 1.55 }, C: { c: '#3a3c40', r: 1.7 },
  X: { c: '#c8197a', r: 1.6 },   // 品红分子（示意）：用一团洋红色的球代表
}
type A = [El, number, number, number]
const hh = 104.5 / 2 * Math.PI / 180
export const MOLS: Record<string, A[]> = {
  H2O: [['O', 0, 0, 0], ['H', -Math.sin(hh) * 0.96, -Math.cos(hh) * 0.96, 0], ['H', Math.sin(hh) * 0.96, -Math.cos(hh) * 0.96, 0]],
  H2: [['H', -0.37, 0, 0], ['H', 0.37, 0, 0]],
  O2: [['O', -0.605, 0, 0], ['O', 0.605, 0, 0]],
  N2: [['N', -0.55, 0, 0], ['N', 0.55, 0, 0]],
  NH3: [['N', 0, 0.12, 0], ...[0, 1, 2].map(i => ['H', Math.cos(i * 2.094) * 0.94, -0.25, Math.sin(i * 2.094) * 0.94] as A)],
  // 乙醇 C₂H₅OH：两个碳、一个氧、六个氢
  C2H5OH: [['C', -0.76, 0, 0], ['C', 0.76, 0, 0], ['O', 1.24, 1.35, 0], ['H', 2.19, 1.36, 0], ['H', -1.12, 1.03, 0], ['H', -1.12, -0.51, 0.89], ['H', -1.12, -0.51, -0.89], ['H', 1.12, -0.51, 0.89], ['H', 1.12, -0.51, -0.89]],
  DYE: [['X', 0, 0, 0], ['X', 1.5, 0.6, 0.3], ['X', -1.4, 0.7, -0.2], ['X', 0.2, -1.5, 0.4], ['X', 0.4, 0.3, 1.4], ['X', -0.6, -0.4, -1.3]],
}
/** 分子的中心挪到原点：模型里第一个原子不一定在正中 */
const centered = (f: string) => { const a = MOLS[f], c = a.reduce((s, x) => [s[0] + x[1], s[1] + x[2], s[2] + x[3]], [0, 0, 0]).map(v => v / a.length); return a.map(([e, x, y, z]) => [e, x - c[0], y - c[1], z - c[2]] as A) }

const sphere = new THREE.SphereGeometry(1, 32, 22)
const matCache = new Map<string, THREE.MeshPhysicalMaterial>()
/** 原子的材质：带清漆的塑料球，有光泽 */
export function atomMat(el: El, key = '') {
  const k = el + key; let m = matCache.get(k)
  if (!m) { m = new THREE.MeshPhysicalMaterial({ color: EL[el].c, roughness: el === 'C' ? 0.32 : 0.26, clearcoat: 0.9, clearcoatRoughness: 0.12, envMapIntensity: 1.25 }); matCache.set(k, m) }
  return m
}

/** 一个静止的分子模型，原点在分子中心（raw：原点在模型里写的原点，比如水分子的氧原子） */
export function Molecule({ f, opacity = 1, cast = true, raw = false }: { f: string; opacity?: number; cast?: boolean; raw?: boolean }) {
  const atoms = useMemo(() => raw ? MOLS[f] : centered(f), [f, raw])
  const mats = useMemo(() => {
    const out = new Map<El, THREE.Material>()
    for (const [e] of atoms) if (!out.has(e)) { const m = atomMat(e).clone(); out.set(e, m) }
    return out
  }, [atoms])
  useEffect(() => { mats.forEach(m => { m.transparent = opacity < 0.999; m.opacity = opacity; m.depthWrite = opacity > 0.6; m.needsUpdate = true }) }, [opacity, mats])
  return <group>{atoms.map(([e, x, y, z], i) => <mesh key={i} geometry={sphere} material={mats.get(e)} position={[x, y, z]} scale={EL[e].r} castShadow={cast} visible={opacity > 0.01} />)}</group>
}

// ---------- 一大群分子 ----------
export interface Species { f: string; share: number }
interface FieldProps {
  species: Species[]
  /** 分子分布在半径 R（Å）的球里，间距 gap（Å）；hole：球心附近空出来多大（给单独画的那个分子让位） */
  R: number; gap: number; hole?: number
  /** 抖动的快慢倍数；drift：整体漂移的速度（Å/s，沿 x） */
  speed?: number; drift?: number
  opacity?: number; seed?: number
  /** 某一种分子只出现在 x 大于 front 的地方（模拟它从 +x 那边慢慢扩散过来），单位 Å */
  front?: { f: string; x: number }
  /** 不是球而是一块朝着镜头的扁片：[x 半径, y 半径, 往后多深, 往前多深]（Å）。放大时铺满画面用 */
  slab?: [number, number, number, number]
}
export function MolField({ species, R, gap, hole = 0, speed = 1, drift = 0, opacity = 1, seed = 3, front, slab }: FieldProps) {
  /** 一个点在区域里有多深：0 在边上，1 在里面（离边越近越小） */
  const inside = (p: THREE.Vector3) => slab ? Math.min(1 - Math.hypot(p.x / slab[0], p.y / slab[1]), (p.z + slab[2]) / slab[2], (slab[3] - p.z) / Math.max(1, slab[3]) + 0.25) : 1 - p.length() / R
  const data = useMemo(() => {
    const r = rng(seed), list: { f: string; p: THREE.Vector3; ax: THREE.Vector3; w: number; ph: number[] }[] = []
    const n = Math.ceil((slab ? Math.max(slab[0], slab[1], slab[2], slab[3]) : R) / gap)
    const tot = species.reduce((s, x) => s + x.share, 0)
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (let k = -n; k <= n; k++) {
      const p = new THREE.Vector3(i + (r() - 0.5) * 0.5, j + (r() - 0.5) * 0.5, k + (r() - 0.5) * 0.5).multiplyScalar(gap)
      if (inside(p) < 0 || p.length() < hole) continue
      let q = r() * tot, f = species[0].f
      for (const s of species) { if (q < s.share) { f = s.f; break } q -= s.share }
      list.push({ f, p, ax: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), w: 0.4 + r() * 1.2, ph: [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28] })
    }
    // 每种元素一个 InstancedMesh：数一数每种元素一共多少个原子
    const counts = new Map<El, number>()
    for (const m of list) for (const [e] of MOLS[m.f]) counts.set(e, (counts.get(e) ?? 0) + 1)
    const meshes = [...counts.entries()].map(([e, c]) => { const mm = new THREE.InstancedMesh(sphere, atomMat(e, ':field').clone(), c); mm.frustumCulled = false; return { e, mm } })
    return { list, meshes, atoms: Object.fromEntries(Object.keys(MOLS).map(f => [f, centered(f)])) as Record<string, A[]> }
  }, [species, R, gap, hole, seed, slab?.join()])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => data.meshes.forEach(({ mm }) => { mm.dispose(); (mm.material as THREE.Material).dispose() }), [data])
  useEffect(() => { data.meshes.forEach(({ mm }) => { const m = mm.material as THREE.MeshPhysicalMaterial; m.transparent = opacity < 0.999; m.opacity = opacity; m.depthWrite = opacity > 0.5; m.needsUpdate = true }) }, [opacity, data])
  const clock = useRef(0)
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), a: new THREE.Vector3(), s: new THREE.Vector3(), o: new THREE.Vector3() }), [])
  useFrame((_, d) => {
    if (opacity < 0.01) return
    clock.current += Math.min(d, 1 / 30) * speed
    const t = clock.current, idx = new Map<El, number>()
    for (const { e } of data.meshes) idx.set(e, 0)
    const byEl = new Map(data.meshes.map(x => [x.e, x.mm]))
    for (const m of data.list) {
      // 位置：原位附近抖动，再加上整体的漂移（漂出球就从另一边回来）
      const amp = 0.45
      tmp.o.set(m.p.x + Math.sin(t * 2.1 * m.w + m.ph[0]) * amp + Math.sin(t * 5.3 + m.ph[3]) * amp * 0.4, m.p.y + Math.sin(t * 1.7 * m.w + m.ph[1]) * amp, m.p.z + Math.sin(t * 1.9 * m.w + m.ph[2]) * amp)
      if (drift) { const x = tmp.o.x - t * drift; tmp.o.x = (((x + R) % (2 * R)) + 2 * R) % (2 * R) - R }
      // 区域边上的分子缩小，看起来是一团慢慢淡出的分子
      const q = inside(tmp.o)
      let k = q <= 0 ? 0 : Math.min(1, q / 0.22)
      if (front && m.f === front.f && tmp.o.x < front.x) k = 0
      tmp.q.setFromAxisAngle(m.ax, t * 1.3 * m.w + m.ph[1])
      for (const [e, x, y, z] of data.atoms[m.f]) {
        tmp.v.set(x, y, z).applyQuaternion(tmp.q).add(tmp.o)
        const r = EL[e].r * k
        tmp.m.compose(tmp.v, tmp.q, tmp.s.set(r, r, r))
        const mm = byEl.get(e)!, i = idx.get(e)!
        mm.setMatrixAt(i, tmp.m); idx.set(e, i + 1)
      }
    }
    for (const { mm } of data.meshes) mm.instanceMatrix.needsUpdate = true
  })
  return <group visible={opacity > 0.01}>{data.meshes.map(({ e, mm }) => <primitive key={e} object={mm} />)}</group>
}

// ---------- 放大示意圈 ----------
/**
 * 画在器材旁边的一个“放大示意”圆球：深色的底、一圈亮边，里面是一群分子；一条细线连到放大的那个地方。
 * at：圆球中心；from：线的另一头（器材上的那一点）；r：圆球半径（画面单位）；fieldR：里面那群分子的半径（Å），按它缩放到圆球里
 */
export function Callout({ at, from, r, fieldR, show = 1, children }: { at: [number, number, number]; from: [number, number, number]; r: number; fieldR: number; show?: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const line = useMemo(() => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...at), d = b.clone().sub(a), len = d.length() - r
    const geo = new THREE.CylinderGeometry(0.006, 0.006, Math.max(0.01, len), 6); geo.translate(0, len / 2, 0)
    return { geo, pos: a, quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()) }
  }, [at[0], at[1], at[2], from[0], from[1], from[2], r])   // eslint-disable-line react-hooks/exhaustive-deps
  const k = Math.max(0.001, show)
  return <group ref={g} visible={show > 0.01}>
    <mesh geometry={line.geo} position={line.pos} quaternion={line.quat} scale={[1, k, 1]}><meshBasicMaterial color="#cfe9ff" transparent opacity={0.65 * k} toneMapped={false} depthWrite={false} /></mesh>
    <mesh position={from}><sphereGeometry args={[0.03, 12, 8]} /><meshBasicMaterial color="#cfe9ff" toneMapped={false} transparent opacity={k} /></mesh>
    <group position={at} scale={k}>
      {/* 背后一块深色的圆底、正面一圈亮边；分子就画在这个球里 */}
      <mesh renderOrder={-1}><sphereGeometry args={[r, 48, 32]} /><meshBasicMaterial color="#0a1622" side={THREE.BackSide} transparent opacity={0.88} depthWrite={false} /></mesh>
      <Rim r={r} />
      <group scale={r * 0.97 / fieldR}>{children}</group>
    </group>
  </group>
}
/** 圆球的亮边：一个朝着镜头的细圆环，跟着镜头转 */
function Rim({ r }: { r: number }) {
  const g = useRef<THREE.Mesh>(null)
  useFrame(({ camera }) => { if (g.current) g.current.quaternion.copy(camera.quaternion) })
  return <mesh ref={g}><ringGeometry args={[r * 0.985, r * 1.03, 96]} /><meshBasicMaterial color="#d9efff" transparent opacity={0.8} toneMapped={false} side={THREE.DoubleSide} /></mesh>
}
