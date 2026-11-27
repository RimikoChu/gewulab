// 光反应和暗反应 · 分子的模型：水、氧气、二氧化碳、H⁺、电子、ATP、ADP、Pi、NADPH、NADP⁺、C₃、C₅、糖类。
// 形状和颜色全实验室统一（MOL_COLOR），面板上的图例也用它。另有“沿一条路流动的一串分子”和“带箭头的路”，以及蛋白质团块的做法。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { fbm, type V3 } from './kit'

export type MolKind = 'h2o' | 'o2' | 'co2' | 'h' | 'e' | 'atp' | 'adp' | 'pi' | 'nadph' | 'nadp' | 'c3' | 'c5' | 'c1' | 'sugar'
/** 各种分子的颜色和写法 */
export const MOL_COLOR: Record<MolKind, string> = { h2o: '#6fc3ff', o2: '#ff5a4d', co2: '#b9c0c6', h: '#e9fbff', e: '#fff27a', atp: '#ffc21f', adp: '#c9a45a', pi: '#e8873a', nadph: '#b678f0', nadp: '#77609a', c3: '#ff9a3d', c5: '#3f9bff', c1: '#ffb7c8', sugar: '#ffb7c8' }
export const MOL_NAME: Record<MolKind, string> = { h2o: 'H₂O', o2: 'O₂', co2: 'CO₂', h: 'H⁺', e: 'e⁻', atp: 'ATP', adp: 'ADP', pi: 'Pi', nadph: 'NADPH', nadp: 'NADP⁺', c3: 'C₃', c5: 'C₅', c1: '(CH₂O)', sugar: '糖类' }

const ball = (r: number, p: V3, hex: string, seg = 18) => {
  const g = new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)); g.translate(...p)
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) a.set([c.r, c.g, c.b], k * 3)
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g
}
const stick = (a: V3, b: V3, r: number, hex: string) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), g = new THREE.CylinderGeometry(r, r, A.distanceTo(B), 8)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize())); g.translate(...A.clone().lerp(B, 0.5).toArray())
  const c = new THREE.Color(hex), n = g.attributes.position.count, col = new Float32Array(n * 3); for (let k = 0; k < n; k++) col.set([c.r, c.g, c.b], k * 3)
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g
}
const join = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map(g => g.index ? g.toNonIndexed() : g))
/** 一串碳：n 个球连成折线 */
const chain = (n: number, hex: string, r = 0.36) => { const pts = Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * 0.56, i % 2 ? 0.17 : -0.17, 0] as V3); return join([...pts.map(p => ball(r, p, hex)), ...pts.slice(1).map((p, i) => stick(pts[i], p, 0.12, '#e8e8e8'))]) }
const cache = new Map<MolKind, THREE.BufferGeometry>()
/** 一个分子的模型（大小约 1） */
export function molGeo(kind: MolKind) {
  if (!cache.has(kind)) cache.set(kind, (() => {
    const C = MOL_COLOR
    switch (kind) {
      case 'h2o': return join([ball(0.42, [0, 0, 0], '#ff5a4d'), ball(0.26, [0.36, 0.3, 0], '#f4f8fb'), ball(0.26, [-0.36, 0.3, 0], '#f4f8fb')])
      case 'o2': return join([ball(0.42, [-0.3, 0, 0], C.o2), ball(0.42, [0.3, 0, 0], C.o2)])
      case 'co2': return join([ball(0.36, [0, 0, 0], '#5f666c'), ball(0.38, [-0.62, 0, 0], '#ff5a4d'), ball(0.38, [0.62, 0, 0], '#ff5a4d')])
      case 'h': return ball(0.27, [0, 0, 0], C.h, 12)
      case 'e': return ball(0.2, [0, 0, 0], C.e, 10)
      case 'pi': return ball(0.26, [0, 0, 0], C.pi, 12)
      case 'atp': case 'adp': { const n = kind === 'atp' ? 3 : 2, body = new THREE.CapsuleGeometry(0.34, 0.42, 4, 12); body.rotateZ(Math.PI / 2); body.translate(-0.55, 0, 0); const col = new THREE.Color(C[kind]), k = body.attributes.position.count, a = new Float32Array(k * 3); for (let i = 0; i < k; i++) a.set([col.r, col.g, col.b], i * 3); body.setAttribute('color', new THREE.BufferAttribute(a, 3))
        return join([body, ...Array.from({ length: n }, (_, i) => ball(0.24, [0.22 + i * 0.42, i % 2 ? 0.1 : -0.06, 0], i === 2 ? '#ff7b2e' : C.pi, 12))]) }
      case 'nadph': return join([ball(0.44, [-0.3, 0, 0], C.nadph), ball(0.4, [0.36, 0.06, 0], '#9a5fe0'), ball(0.22, [0.78, 0.3, 0], '#ffffff', 12)])
      case 'nadp': return join([ball(0.44, [-0.3, 0, 0], C.nadp), ball(0.4, [0.36, 0.06, 0], '#665089')])
      case 'c3': return chain(3, C.c3)
      case 'c5': return chain(5, C.c5, 0.33)
      case 'c1': return ball(0.34, [0, 0, 0], C.c1)
      case 'sugar': { const pts = Array.from({ length: 6 }, (_, i) => [Math.cos(i / 6 * Math.PI * 2) * 0.58, Math.sin(i / 6 * Math.PI * 2) * 0.58, 0] as V3); return join([...pts.map(p => ball(0.3, p, C.sugar)), ...pts.map((p, i) => stick(p, pts[(i + 1) % 6], 0.1, '#f2f2f2'))]) }
    }
  })())
  return cache.get(kind)!
}
const GLOW: Partial<Record<MolKind, number>> = { e: 2.2, h: 0.9, atp: 0.5, nadph: 0.45, o2: 0.3 }
const mats = new Map<MolKind, THREE.MeshStandardMaterial>()
/** 分子的材质：电子、H⁺ 自己发一点光，暗处也看得清 */
export function molMat(kind: MolKind) {
  if (!mats.has(kind)) mats.set(kind, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: new THREE.Color(MOL_COLOR[kind]), emissiveIntensity: GLOW[kind] ?? 0.22 }))
  return mats.get(kind)!
}
/** 放一个分子 */
export function Mol({ kind, s = 1, ...rest }: { kind: MolKind; s?: number } & Record<string, unknown>) {
  return <mesh geometry={molGeo(kind)} material={molMat(kind)} scale={s} {...rest} />
}

// ---------- 沿一条路流动的一串分子 ----------
/** 路：经过几个点的光滑曲线 */
export const pathOf = (pts: V3[]) => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal', 0.5)
/**
 * 一串分子沿路流动。kinds 轮流排；n 一共几个；on 流不流（不流时慢慢消失）；level 显示其中的几成（0–1）；
 * speed 每秒走这条路的几分之几；rate 再乘一个快慢（0 就停在路上）；s 大小；hold：到头以后停在终点附近攒着，不消失
 */
export function Stream({ pts, kinds, n = 4, on = true, level = 1, speed = 0.16, rate = 1, s = 1, phase = 0, spin = 0.6 }: { pts: V3[]; kinds: MolKind[]; n?: number; on?: boolean; level?: number; speed?: number; rate?: number; s?: number; phase?: number; spin?: number }) {
  const curve = useMemo(() => pathOf(pts), [JSON.stringify(pts)])   // eslint-disable-line react-hooks/exhaustive-deps
  const group = useRef<THREE.Group>(null), st = useRef({ u: phase, k: 0, shown: [] as number[] })
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, d) => {
    const g = group.current; if (!g) return
    const dt = Math.min(d, 1 / 30), S = st.current
    S.u = (S.u + speed * rate * dt) % 1
    S.k += ((on ? 1 : 0) - S.k) * (1 - Math.exp(-dt / 0.35))
    g.visible = S.k > 0.01
    if (!g.visible) return
    const show = level * n
    g.children.forEach((m, i) => {
      const u = (S.u + i / n) % 1
      curve.getPointAt(u, v); m.position.copy(v)
      const want = i < show - 0.5 ? 1 : 0; S.shown[i] = (S.shown[i] ?? want) + (want - (S.shown[i] ?? want)) * (1 - Math.exp(-dt / 0.3))
      const edge = Math.min(1, u / 0.08) * Math.min(1, (1 - u) / 0.08)
      m.scale.setScalar(Math.max(0.0001, s * S.k * S.shown[i] * edge))
      m.rotation.z = Math.sin(u * 9 + i) * 0.4 * spin; m.rotation.y += dt * spin * 0.5
    })
  })
  return <group ref={group}>{Array.from({ length: n }, (_, i) => <Mol key={i} kind={kinds[i % kinds.length]} />)}</group>
}
/** 一条带箭头的路：淡淡的一根管子，上面几个箭头指着流动的方向；on 时亮一些 */
export function Track({ pts, color = '#9fe8c0', on = true, arrows = 3, r = 0.07, dim = 0.12 }: { pts: V3[]; color?: string; on?: boolean; arrows?: number; r?: number; dim?: number }) {
  const { tube, heads } = useMemo(() => {
    const c = pathOf(pts), tube = new THREE.TubeGeometry(c, 80, r, 8, false)
    const heads = Array.from({ length: arrows }, (_, i) => { const u = (i + 0.7) / arrows * 0.96, p = c.getPointAt(u), t = c.getTangentAt(u); return { p: p.toArray() as V3, q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), t) } })
    return { tube, heads }
  }, [JSON.stringify(pts), arrows, r])   // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useRef<THREE.MeshBasicMaterial>(null), mat2 = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((_, d) => { for (const m of [mat.current, mat2.current]) if (m) m.opacity += ((on ? 0.6 : dim) - m.opacity) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.3)) })
  return <group>
    <mesh geometry={tube}><meshBasicMaterial ref={mat} color={color} transparent opacity={dim} depthWrite={false} /></mesh>
    {heads.map((h, i) => <mesh key={i} position={h.p} quaternion={h.q}><coneGeometry args={[r * 4.2, r * 9, 12]} /><meshBasicMaterial ref={i === 0 ? mat2 : undefined} color={color} transparent opacity={on ? 0.75 : dim * 2} depthWrite={false} /></mesh>)}
  </group>
}

// ---------- 蛋白质：有起伏的团块 ----------
/** 给每个方向一个半径，做一个团块；amp、freq 是表面起伏。flat：把 z 大于它的部分压平（剖面） */
export function blobGeo(fn: (v: THREE.Vector3) => number, { amp = 0.06, freq = 2.2, seg = 72, seed = 0, color = '#ffffff', flat, cut = '#ffffff' }: { amp?: number; freq?: number; seg?: number; seed?: number; color?: string; flat?: number; cut?: string } = {}) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7))
  const p = g.attributes.position, v = new THREE.Vector3(), col = new Float32Array(p.count * 3), A = new THREE.Color(color), C = new THREE.Color(cut), c = new THREE.Color()
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize()
    const n = fbm(v.x * freq + seed, v.y * freq, v.z * freq, 4)
    v.multiplyScalar(fn(v) * (1 + amp * n))
    let isCut = false
    if (flat !== undefined && v.z > flat) { v.z = flat; isCut = true }
    p.setXYZ(i, v.x, v.y, v.z)
    c.copy(isCut ? C : A).multiplyScalar(isCut ? 0.85 + 0.3 * (n + 0.5) : 0.86 + 0.3 * (n + 0.5)); col.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g
}
/** 在 axis 方向鼓出一块：w 越大越宽 */
export const lobe = (v: THREE.Vector3, axis: V3, w: number, amp: number) => { const a = new THREE.Vector3(...axis).normalize(); return amp * Math.exp(-(1 - v.dot(a)) / w) }
