// 兴奋的传导和传递实验室的大场景：放大了很多倍的神经组织内部。第一个神经元在左边（细胞体、树突），一根轴突朝右伸出去，
// 末端膨大成突触小体，贴着第二个神经元；第三个神经元的突触小体从上方贴在第二个神经元上。远处是暗下去的别的神经元。
// 轴突、突触小体、第二个神经元靠近突触的一段都朝镜头剖开一个缺口（第 1 课和随堂检测时盖上）。整个实验室只有这一个世界，换课时镜头沿着神经纤维飞过去。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, type Label } from '@/lab-kit'
import { useJob } from './job'
import { rng, type V3 } from './kit'
import { CUT, LID, bilayerMap, blob, lipidBump, revolveShell, smoothProfile, taper, type XR } from './membrane'
import { curveOf, ellipsoid, fbm, roundCone, smin, surfaceNetsGen } from './sdf'
import { excitable } from './wave'

// ---------- 布局 ----------
/** 轴突的外半径、膜厚 */
export const R = 2, TM = 0.34
/** 轴突从哪到哪；突触前膜、突触后膜的 x；第二个神经元那一段的半径 */
export const AX0 = 11, AX1 = 64, PRE = AX1 + 49 / 5, POST = PRE + 0.95, R2 = 3.8
/** 突触那一带的东西都跟着轴突的长度挪：原来按轴突到 78 摆的，K 是挪了多少 */
export const K = AX1 - 78
/** 第三个神经元的突触小体：贴在第二个神经元上方 */
export const N3X = 94 + K, N3Y = R2 + 0.95, N3L = 14.7
/** 各课膜上的器材不放固定通道的两段 */
export const WINDOWS: [number, number][] = [[18.6, 26.6], [28.2, 36.2]]
export const COLOR = { n1: '#a9a4ea', n1in: '#6c63b8', n2: '#e3a0c6', n2in: '#a8628e', n3: '#74cdb8', n3in: '#3f8f7e', na: '#ffb62e', k: '#46d9f0', cl: '#b9f04a', nt: '#ff6f91', nti: '#8fb4ff', naCh: '#f08a4b', kCh: '#2f9fb3', pump: '#79b85c', rec: '#8f7cf5', clCh: '#9aa83a' }

const spot = (p: V3, w: number, h: number, view: [number, number], open = true, far = false) => ({ target: new THREE.Vector3(...p), span: [w, h] as [number, number], view, open, far })
export const SPOT = {
  one: spot([24, 4, 0], 60, 30, [-0.88, 0.3], false, true),
  oneDen: spot([-3, 1, 0], 38, 26, [-0.5, 0.26], false, true),
  oneSoma: spot([2, 0, 0], 26, 16, [-0.15, 0.3], false, true),
  oneAxon: spot([38, 0, 0], 66, 24, [0.12, 0.34], false, true),
  oneEnd: spot([86 + K, 0.5, 0], 30, 18, [-0.35, 0.3], false, true),
  two: spot([22.6, 2.5, 0], 8.2, 5.2, [-0.16, 0.22]),
  three: spot([32.2, 1.9, 0], 7.6, 4.6, [0.2, 0.2]),
  four: spot([49, 1.0, 0], 11.4, 6.4, [-0.14, 0.42]),
  five: spot([49.4, 2.6, 0], 11.8, 8.6, [0.12, 0.36]),
  six: spot([89.3 + K, 2.9, 0], 12.4, 7.6, [-0.2, 0.24]),
  seven: spot([93 + K, 4.5, 0], 16.5, 13, [0.16, 0.2]),
  ext: spot([PRE - 5.2, 1.9, 0], 21, 10, [-0.24, 0.3]),
  quiz: spot([24, 3, 0], 58, 30, [-1.15, 0.44], false, true),
}
export type SpotKey = keyof typeof SPOT

/** 每一课用它代替 LabStage：只要说在哪一处 */
export function Room({ at, labels, children = null }: { at: SpotKey; labels: Label[]; children?: ReactNode }) {
  const v = SPOT[at]
  return <LabStage<{ open: boolean }> world={{ open: v.open }} labels={labels} target={v.target} span={v.span} view={v.view} sky={false} studio env={v.far ? 0.8 : 0.7} sun={v.far ? 2.2 : 1.9}
    backdrop="#06141b" fog={v.far ? [140, 560] : [45, 330]} bloom={0.5} free>{children}</LabStage>
}

/** 第三个神经元的突触小体现在兴奋了多少（0–1）：它是竖着的，不能按 x 坐标照亮，各课直接写这个数 */
export const N3_PULSE = { value: 0 }

// ---------- 细胞体和树突 ----------
interface Branch { pts: V3[]; r0: number; r1: number }
const norm = (d: V3): V3 => { const l = Math.hypot(...d) || 1; return [d[0] / l, d[1] / l, d[2] / l] }
/** 从每个方向长出一枝树突，分两次叉 */
function dendrites(c: V3, dirs: V3[], start: number, len: number, r: number, seed: number) {
  const out: Branch[] = [], rnd = rng(seed)
  const grow = (p: V3, d: V3, L: number, rr: number, lv: number) => {
    const pts: V3[] = [p]; let q = p, dd = d
    for (let i = 0; i < 4; i++) { dd = norm([dd[0] + (rnd() - 0.5) * 0.55, dd[1] + (rnd() - 0.5) * 0.55, dd[2] + (rnd() - 0.5) * 0.45]); q = [q[0] + dd[0] * L / 4, q[1] + dd[1] * L / 4, q[2] + dd[2] * L / 4]; pts.push(q) }
    out.push({ pts, r0: rr, r1: rr * 0.6 })
    if (lv >= 2) return
    for (const s of [-1, 1]) { const ax: V3 = [-dd[1] * s, dd[0] * s, (rnd() - 0.5) * 0.9]; grow(q, norm([dd[0] + ax[0] * 0.7, dd[1] + ax[1] * 0.7, dd[2] + ax[2] * 0.7]), L * 0.78, rr * 0.6, lv + 1) }
  }
  for (const d0 of dirs) { const d = norm(d0); grow([c[0] + d[0] * start, c[1] + d[1] * start, c[2] + d[2] * start], d, len, r, 0) }
  return out
}
const branchGeo = (bs: Branch[]) => mergeGeometries(bs.map(b => taper(curveOf(b.pts, 0.5), b.r0, b.r1, 14, 10)))

/** 第一个神经元的树突朝哪几个方向（6 条） */
export const DEN1: V3[] = [[-1, 0.15, 0.25], [-0.55, 0.9, -0.05], [-0.45, -0.9, 0.2], [0.3, 0.95, -0.45], [0.25, -0.9, -0.5], [-0.6, 0.05, -0.9]]
const DEN2: V3[] = [[0.3, 1, 0.1], [0.4, -1, 0.2], [0.9, 0.5, 0.5], [0.2, 0.3, -1], [0.7, -0.6, -0.6]]
const C2: V3 = [105.5 + K, 0, -0.5]
function body(c: V3, r: V3, dirs: V3[], neck: [V3, V3, number, number][]) {
  const tips = dirs.map(u0 => { const u = norm(u0); return [c[0] + u[0] * 9.2, c[1] + u[1] * 9.2, c[2] + u[2] * 9.2] as V3 })
  return (x: number, y: number, z: number) => {
    let d = ellipsoid(x, y, z, c, r)
    for (const t of tips) d = smin(d, roundCone(x, y, z, c, t, 2.7, 1.0), 2.2)
    for (const [a, b, ra, rb] of neck) d = smin(d, roundCone(x, y, z, a, b, ra, rb), 2.4)
    return d + 0.12 * fbm(x * 0.9, y * 0.9, z * 0.9, 3)
  }
}
const sdf1 = body([0, 0, 0], [6.2, 5.6, 5.4], DEN1, [[[2, 0, 0], [11.6, 0, 0], 4.2, R - TM - 0.04]])
const sdf2 = body(C2, [6.4, 5.8, 5.6], DEN2, [[[104 + K, 0, -0.3], [98.2 + K, 0, 0], 4.9, R2 - TM - 0.04], [[108 + K, 0, -2], [118 + K, -1, -8], 3.6, 1.5]])
function* gen1() { return yield* surfaceNetsGen(sdf1, [[-11.5, -11.5, -10.5], [14.5, 11.5, 10.5]], 0.3) }
function* gen2() { return yield* surfaceNetsGen(sdf2, [[96 + K, -11.5, -12], [121.5 + K, 11.5, 10.5]], 0.3) }

// ---------- 膜 ----------
const knob: XR[] = smoothProfile(([[78, R], [79.5, 2.15], [81, 2.9], [82.6, 3.9], [84.2, 4.45], [85.6, 4.5], [86.7, 4.15], [87.4, 3.45], [87.74, 2.8]] as XR[]).map(p => [p[0] + K, p[1]] as XR), 0.3)
/** 第一个神经元的轴突和突触小体：外表面的轮廓 */
export const PROFILE1: XR[] = [...Array.from({ length: Math.round((AX1 - AX0) / 0.5) }, (_, i) => [AX0 + i * 0.5, R] as XR), ...knob, [PRE, 2.2], [PRE, 1.5], [PRE, 0.8], [PRE, 0]]
/** 第二个神经元靠近突触的一段 */
export const PROFILE2: XR[] = [[POST, 0], [POST, 0.8], [POST, 1.6], [POST, 2.4], ...smoothProfile([[POST + 0.02, 3.0], [89.2 + K, 3.5], [90.1 + K, 3.76], [91.2 + K, R2]], 0.3), ...Array.from({ length: 17 }, (_, i) => [91.7 + K + i * 0.5, R2] as XR)]
/** 第三个神经元的突触小体（自己的坐标：沿 +x 伸出去，末端是突触前膜） */
export const PROFILE3: XR[] = [[0, 1.2], [3, 1.2], [6, 1.2], ...smoothProfile([[9, 1.2], [10, 1.5], [11.2, 2.4], [12.4, 2.95], [13.5, 2.9], [14.3, 2.35], [14.64, 1.85]], 0.3), [N3L, 1.3], [N3L, 0.6], [N3L, 0]]
const D = Math.PI / 180

let TEX: { bump: THREE.Texture; cut: THREE.Texture } | null = null
const tex = () => (TEX ??= { bump: lipidBump(), cut: bilayerMap() })
function skin(color: string, glow: boolean, gain = 1) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.35, sheen: 0.7, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffe6f4'), bumpMap: tex().bump, bumpScale: 0.6 })
  return glow ? excitable(m, gain) : m
}
/** 一层膜：外表面、内表面、断面；lid 是盖住缺口的那一块（open 时淡出） */
function Shell({ profile, cut, lid, outer, inner, glow = true, open, pulse }: { profile: XR[]; cut: [number, number]; lid: [number, number]; outer: string; inner: string; glow?: boolean; open: boolean; pulse?: { value: number } }) {
  const g = useMemo(() => ({ s: revolveShell(profile, TM, cut), l: revolveShell(profile, TM, lid, 36).outer }), [profile, cut, lid])
  const m = useMemo(() => {
    const cutM = new THREE.MeshStandardMaterial({ map: tex().cut, roughness: 0.55, bumpMap: tex().cut, bumpScale: 0.5 })
    // 兴奋处：断面上一条亮带，膜的内外表面只淡淡带一点，膜两侧的正负号才看得清
    return { o: skin(outer, glow, 0.16), i: skin(inner, glow, 0.16), c: glow ? excitable(cutM, 1.6) : cutM, l: skin(outer, glow) }
  }, [outer, inner, glow])
  const lidRef = useRef<THREE.Mesh>(null), a = useRef(open ? 0 : 1)
  useFrame((_, dt) => {
    const to = open ? 0 : 1; a.current += Math.sign(to - a.current) * Math.min(Math.abs(to - a.current), dt * 1.6)
    m.l.opacity = a.current; m.l.transparent = a.current < 0.999; m.l.depthWrite = a.current > 0.5
    if (lidRef.current) lidRef.current.visible = a.current > 0.01
    if (pulse) for (const x of [m.o, m.i, m.l]) { x.emissive.set('#ffd98a'); x.emissiveIntensity = pulse.value * 0.45 }
  })
  return <group>
    <mesh geometry={g.s.outer} material={m.o} castShadow receiveShadow />
    <mesh geometry={g.s.inner} material={m.i} receiveShadow />
    <mesh geometry={g.s.cut} material={m.c} />
    <mesh ref={lidRef} geometry={g.l} material={m.l} />
  </group>
}

// ---------- 髓鞘 ----------
/** 髓鞘：第一节从哪开始、每节多长、节与节之间的空隙（郎飞结）多宽、一共几节 */
export const MYELIN = { x0: 13.4, len: 5.5, gap: 0.85, n: 8 }
/** 一节节髓鞘套在轴突外面。只在看整个神经元时出现（第 1 课、随堂检测）；后面几课要看膜上的离子，把它拿掉 */
function Myelin({ open }: { open: boolean }) {
  const g = useMemo(() => {
    const L = MYELIN.len, pts = ([[2.02, 0], [2.3, 0.1], [2.52, 0.3], [2.62, 0.7], [2.62, L - 0.7], [2.52, L - 0.3], [2.3, L - 0.1], [2.02, L]] as XR[]).map(p => new THREE.Vector2(p[0], p[1]))
    const one = new THREE.LatheGeometry(pts, 40).rotateZ(-Math.PI / 2)
    return mergeGeometries(Array.from({ length: MYELIN.n }, (_, i) => one.clone().translate(MYELIN.x0 + i * (L + MYELIN.gap), 0, 0)))
  }, [])
  const m = useMemo(() => excitable(new THREE.MeshPhysicalMaterial({ color: '#f1e7cf', roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.6, sheenColor: new THREE.Color('#fff6dc') }), 2.2), [])
  const ref = useRef<THREE.Mesh>(null), a = useRef(open ? 0 : 1)
  useFrame((_, dt) => {
    const to = open ? 0 : 1; a.current += Math.sign(to - a.current) * Math.min(Math.abs(to - a.current), dt * 1.6)
    m.opacity = a.current; m.transparent = a.current < 0.999; m.depthWrite = a.current > 0.5
    if (ref.current) ref.current.visible = a.current > 0.01
  })
  return <mesh ref={ref} geometry={g} material={m} castShadow />
}
/** 细胞核：深色的球，里面一个更深的核仁。隔着半透明的细胞体看得见 */
function Nucleus({ at, color }: { at: V3; color: string }) {
  return <group position={at}>
    <mesh scale={[1, 0.92, 0.94]}><sphereGeometry args={[2.7, 40, 28]} /><meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.5} sheen={0.5} sheenColor="#ffffff" /></mesh>
    <mesh position={[0.7, 0.5, 1.9]}><sphereGeometry args={[0.72, 20, 14]} /><meshStandardMaterial color="#241438" roughness={0.5} /></mesh>
  </group>
}

// ---------- 突触小泡、线粒体 ----------
/** 一群突触小泡：半透明的小球，里面几粒神经递质 */
export function Vesicles({ at, color, r = 0.42 }: { at: V3[]; color: string; r?: number }) {
  const g = useMemo(() => {
    const rnd = rng(11), s = new THREE.SphereGeometry(r, 20, 14), d = new THREE.SphereGeometry(r * 0.17, 8, 6)
    const shells = mergeGeometries(at.map(p => s.clone().translate(...p)))
    const dots = mergeGeometries(at.flatMap(p => Array.from({ length: 5 }, () => { const a = rnd() * 6.28, b = rnd() * 3.14, q = r * 0.55 * Math.cbrt(rnd()); return d.clone().translate(p[0] + q * Math.sin(b) * Math.cos(a), p[1] + q * Math.cos(b), p[2] + q * Math.sin(b) * Math.sin(a)) })))
    return { shells, dots }
  }, [at, r])
  return <group>
    <mesh geometry={g.dots}><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} /></mesh>
    <mesh geometry={g.shells} renderOrder={2}><meshPhysicalMaterial color="#e9e2ff" roughness={0.25} clearcoat={0.8} transparent opacity={0.42} depthWrite={false} /></mesh>
  </group>
}
/** 突触小体里固定不动的小泡的位置：避开各课要动的那几个小泡走的路 */
const VES1: V3[] = (() => {
  const rnd = rng(5), out: V3[] = []
  while (out.length < 20) {
    const x = 81.2 + rnd() * 5.6, rr = (x < 84 ? 2.2 + (x - 81.2) * 0.5 : 3.5) - 0.3, a = rnd() * 6.28, q = Math.sqrt(rnd()) * rr, p: V3 = [x + K, Math.sin(a) * q, Math.cos(a) * q]
    if (x > 84.6 && p[1] > -0.1 && p[1] < 3.2 && p[2] > -0.9) continue
    if (out.every(o => Math.hypot(o[0] - p[0], o[1] - p[1], o[2] - p[2]) > 0.95)) out.push(p)
  }
  return out
})()
const VES3: V3[] = (() => {
  const rnd = rng(9), out: V3[] = []
  while (out.length < 9) {
    const x = 10.6 + rnd() * 2.6, a = Math.PI / 2 + rnd() * Math.PI, q = Math.sqrt(rnd()) * 1.9, p: V3 = [x, Math.sin(a) * q, Math.cos(a) * q - 0.5]
    if (x > 12.4 && Math.abs(p[1]) < 1.5 && p[2] > -1.2) continue
    if (out.every(o => Math.hypot(o[0] - p[0], o[1] - p[1], o[2] - p[2]) > 0.9)) out.push(p)
  }
  return out
})()
function Mito({ position, rotation }: { position: V3; rotation: V3 }) {
  const g = useMemo(() => blob([1.25, 0.52, 0.52], 0.07, 3, 32), [])
  return <mesh geometry={g} position={position} rotation={rotation} castShadow><meshPhysicalMaterial color="#d98a62" roughness={0.45} clearcoat={0.5} sheen={0.6} sheenColor="#ffd9b8" /></mesh>
}

// ---------- 膜上固定的通道（各课自己的那几个另画） ----------
/** 膜上固定的通道在哪（x）：一个 Na⁺ 通道、一个 K⁺ 通道交替排 */
export const RIM: number[] = (() => { const xs: number[] = []; for (let x = 13.2; x < AX1 - 1; x += 1.5) if (!WINDOWS.some(([a, b]) => x > a && x < b)) xs.push(x); return xs })()
/** 其中哪些是 Na⁺ 通道 */
export const RIM_NA = RIM.filter((_, i) => i % 2 === 0)
function RimChannels() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const g = useMemo(() => blob([0.17, 0.44, 0.2], 0.1, 2, 14), [])
  const list = RIM
  useFrame(() => {
    const m = ref.current; if (!m || m.userData.done) return
    const o = new THREE.Object3D(), c = new THREE.Color()
    list.forEach((x, i) => { for (const s of [0, 1]) { o.position.set(x + (s ? 0.16 : -0.16), R - TM / 2, 0); o.rotation.y = s ? Math.PI : 0; o.updateMatrix(); m.setMatrixAt(i * 2 + s, o.matrix); m.setColorAt(i * 2 + s, c.set(i % 2 ? COLOR.kCh : COLOR.naCh)) } })
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.userData.done = true
  })
  return <instancedMesh ref={ref} args={[g, undefined, list.length * 2]}><meshPhysicalMaterial roughness={0.5} sheen={0.5} clearcoat={0.3} side={THREE.DoubleSide} /></instancedMesh>
}

// ---------- 远处的神经元 ----------
function Far() {
  const g = useMemo(() => {
    const rnd = rng(77), parts: THREE.BufferGeometry[] = []
    const dirs = (n: number) => Array.from({ length: n }, () => [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5] as V3)
    for (let i = 0; i < 11; i++) {
      const c: V3 = [-50 + i * 17 + rnd() * 10, -78 + rnd() * 92, -55 - rnd() * 80], s = 2.6 + rnd() * 2.6
      parts.push(blob([s, s * 0.9, s * 0.9], 0.18, i + 1, 16).translate(...c).toNonIndexed())
      for (const b of dendrites(c, dirs(6), s * 0.8, 9 + rnd() * 8, s * 0.3, 100 + i)) parts.push(taper(curveOf(b.pts, 0.5), b.r0, b.r1, 8, 6).toNonIndexed())
      // 一根长长的轴突，伸向别处
      const e: V3 = [c[0] + (rnd() - 0.5) * 120, c[1] + (rnd() - 0.5) * 50, c[2] - rnd() * 40]
      parts.push(taper(curveOf([c, [(c[0] + e[0]) / 2, (c[1] + e[1]) / 2 + (rnd() - 0.5) * 16, (c[2] + e[2]) / 2], e], 0.5), s * 0.22, s * 0.14, 24, 6).toNonIndexed())
    }
    for (const p of parts) p.deleteAttribute('uv')
    const dust = new Float32Array(420 * 3)
    for (let i = 0; i < 420; i++) dust.set([-30 + rnd() * 170, -28 + rnd() * 56, -45 + rnd() * 60], i * 3)
    return { far: mergeGeometries(parts), dust: new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dust, 3)) }
  }, [])
  return <group>
    <mesh geometry={g.far}><meshStandardMaterial color="#274a5a" roughness={0.7} emissive="#0c2531" emissiveIntensity={0.8} /></mesh>
    <points geometry={g.dust}><pointsMaterial color="#9fd8e8" size={0.16} transparent opacity={0.35} sizeAttenuation depthWrite={false} /></points>
  </group>
}

// ---------- 三个神经元 ----------
const B1 = dendrites([0, 0, 0], DEN1, 8.6, 7.5, 1.02, 7), B2 = dendrites(C2, DEN2, 8.6, 7.5, 1.02, 23)
export function World({ open }: { open: boolean }) {
  const s1 = useJob('n1', gen1), s2 = useJob('n2', gen2)
  const g = useMemo(() => ({
    d1: branchGeo(B1), d2: branchGeo(B2),
    ax2: taper(curveOf([[117 + K, -0.9, -7.4], [128 + K, -3, -16], [146 + K, 2, -30], [175 + K, -4, -52]], 0.5), 1.6, 1.3, 40, 14),
    ax3: taper(curveOf([[N3X, N3Y + N3L - 0.3, 0], [N3X - 1, N3Y + N3L + 7, -4], [N3X - 8, N3Y + N3L + 16, -16], [N3X - 26, N3Y + N3L + 24, -44]], 0.5), 1.2, 1.0, 40, 14),
  }), [])
  const m = useMemo(() => {
    // 细胞体半透明，露出里面的细胞核
    const soma = (c: string) => { const x = skin(c, true); x.transparent = true; x.opacity = 0.62; x.depthWrite = false; return x }
    return { n1: skin(COLOR.n1, true), n2: skin(COLOR.n2, true), n3: skin(COLOR.n3, false), s1: soma(COLOR.n1), s2: soma(COLOR.n2) }
  }, [])
  return <group>
    <Far />
    {/* 第一个神经元 */}
    <Nucleus at={[-0.6, 0.2, 0]} color="#5a3c96" />
    {s1 && <mesh geometry={s1} material={m.s1} castShadow renderOrder={3} />}
    <Myelin open={open} />
    <mesh geometry={g.d1} material={m.n1} castShadow />
    <Shell profile={PROFILE1} cut={CUT} lid={LID} outer={COLOR.n1} inner={COLOR.n1in} open={open} />
    <RimChannels />
    <Vesicles at={VES1} color={COLOR.nt} />
    <Mito position={[82.6 + K, -1.3, -1.2]} rotation={[0.3, 0.5, 0.5]} />
    <Mito position={[84.6 + K, 1.9, -2.6]} rotation={[0.2, -0.4, -0.3]} />
    {/* 第二个神经元 */}
    <Nucleus at={[C2[0] + 0.8, 0.2, C2[2]]} color="#8a3d70" />
    {s2 && <mesh geometry={s2} material={m.s2} castShadow renderOrder={3} />}
    <mesh geometry={g.d2} material={m.n2} castShadow />
    <mesh geometry={g.ax2} material={m.n2} />
    <Shell profile={PROFILE2} cut={CUT} lid={LID} outer={COLOR.n2} inner={COLOR.n2in} open={open} />
    {/* 第三个神经元：突触小体朝下，贴在第二个神经元上方 */}
    <mesh geometry={g.ax3} material={m.n3} />
    <group position={[N3X, N3Y + N3L, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <Shell profile={PROFILE3} cut={[90 * D, 270 * D]} lid={[-90 * D, 90 * D]} outer={COLOR.n3} inner={COLOR.n3in} glow={false} open={open} pulse={N3_PULSE} />
      <Vesicles at={VES3} color={COLOR.nti} r={0.36} />
    </group>
  </group>
}
