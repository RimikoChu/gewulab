// 放大的神经元（第 2 课）：细胞体（里面有细胞核）、一丛分枝的树突、一条长长的轴突（外面一节一节包着髓鞘）、末端分成细枝的神经末梢；
// 旁边一段剖开的神经：许多神经纤维集结成束，外面包着膜。坐标是模型自己的：细胞体在原点，轴突朝 +x，1 个单位约等于真实的 10 µm 的很多倍（示意）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { tagged, wetMat } from './mats'
import { useJob } from './job'
import { curveOf, ellipsoid, fbm, roundCone, smin, surfaceNetsGen, type V3 } from './sdf'

/** 一根两头粗细不同的管子 */
export function taper(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, segs = 32, radial = 10) {
  const g = new THREE.TubeGeometry(curve, segs, 1, radial), p = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3()
  for (let i = 0; i <= segs; i++) { curve.getPointAt(i / segs, c); const r = r0 + (r1 - r0) * i / segs; for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c); p.setXYZ(k, v.x, v.y, v.z) } }
  g.computeVertexNormals(); return g
}

// ---------- 树突：从细胞体朝左、上、下长出几枝，一级级分叉 ----------
const rnd0 = (seed: number) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647 }
interface Branch { pts: V3[]; r0: number; r1: number }
const PRIMARY: V3[] = [[-1, 0.15, 0.1], [-0.6, 0.85, 0.2], [-0.4, -0.9, 0.15], [0.15, 1, -0.2], [0.1, -1, -0.25], [-0.75, 0.1, -0.7], [-0.6, 0.4, 0.7]]
export const DENDRITES: Branch[] = (() => {
  const out: Branch[] = [], rnd = rnd0(7)
  const grow = (p: V3, d: V3, len: number, r: number, lv: number) => {
    const n = 4, pts: V3[] = [p]
    let q = p, dd = d
    for (let i = 0; i < n; i++) { dd = [dd[0] + (rnd() - 0.5) * 0.5, dd[1] + (rnd() - 0.5) * 0.5, dd[2] + (rnd() - 0.5) * 0.4]; const l = Math.hypot(...dd); dd = [dd[0] / l, dd[1] / l, dd[2] / l]; q = [q[0] + dd[0] * len / n, q[1] + dd[1] * len / n, q[2] + dd[2] * len / n]; pts.push(q) }
    out.push({ pts, r0: r, r1: r * 0.62 })
    if (lv >= 3) return
    for (const s of [-1, 1]) { const ax: V3 = [-dd[1] * s, dd[0] * s, (rnd() - 0.5) * 0.6]; grow(q, [dd[0] + ax[0] * 0.75, dd[1] + ax[1] * 0.75, dd[2] + ax[2] * 0.75], len * 0.7, r * 0.6, lv + 1) }
  }
  PRIMARY.forEach(d => { const l = Math.hypot(...d), u: V3 = [d[0] / l, d[1] / l, d[2] / l]; grow([u[0] * 0.7, u[1] * 0.7, u[2] * 0.7], u, 1.35, 0.17, 0) })
  return out
})()
/** 轴突：从细胞体右边出发，略有起伏，长 9 */
export const AXON: V3[] = [[0.8, -0.05, 0], [1.6, 0.05, 0.05], [3.5, -0.2, 0.15], [5.5, 0.15, -0.1], [7.5, -0.1, 0.05], [9.0, 0.0, 0]]
const axonCurve = curveOf(AXON, 0.5)
/** 髓鞘：一节一节，中间留出很短的空隙 */
export const MYELIN = Array.from({ length: 13 }, (_, i) => [0.09 + i * 0.07, 0.09 + i * 0.07 + 0.064] as [number, number]).filter(([, b]) => b < 0.97)
/** 神经末梢：轴突末端分成几根细枝，末端一个个小球 */
export const TERMINALS: V3[][] = [[0.35, 0.5, 0.1], [0.6, 0.0, 0.25], [0.45, -0.5, -0.15], [0.7, 0.25, -0.3], [0.55, -0.25, 0.4]].map((d, i) => {
  const e: V3 = [9.0, 0, 0]
  return [e, [e[0] + d[0] * 0.5, e[1] + d[1] * 0.45, e[2] + d[2] * 0.5], [e[0] + d[0] * 1.2 + 0.1 * i, e[1] + d[1] * 1.25, e[2] + d[2] * 1.1]]
})

// ---------- 细胞体 ----------
function somaSdf(x: number, y: number, z: number) {
  let d = ellipsoid(x, y, z, [0, 0, 0], [0.92, 0.82, 0.8])
  for (const b of DENDRITES.slice(0, PRIMARY.length)) d = smin(d, roundCone(x, y, z, [0, 0, 0], b.pts[1], 0.45, b.r0 * 0.9), 0.35)
  d = smin(d, roundCone(x, y, z, [0.3, -0.03, 0], [1.25, 0.0, 0.03], 0.5, 0.12), 0.3)          // 轴丘
  return d + 0.02 * fbm(x * 5, y * 5, z * 5, 2)
}
function* somaGen() { return yield* surfaceNetsGen(somaSdf, [[-1.5, -1.4, -1.4], [1.5, 1.4, 1.4]], 0.035) }

/** 区域号：0 细胞体，1 树突，2 轴突，3 神经末梢 */
export const NTAG = { body: 0, dendrite: 1, axon: 2, terminal: 3 } as const
function withTag(g: THREE.BufferGeometry, t: number) { const n = g.attributes.position.count; g.setAttribute('aTag', new THREE.BufferAttribute(new Float32Array(n).fill(t), 1)); if (!g.index) return g; return g.toNonIndexed() }
function plainGeos() {
  const den = mergeGeometries(DENDRITES.map(b => withTag(taper(curveOf(b.pts, 0.5), b.r0, b.r1, 16, 8), NTAG.dendrite)))
  const axon = withTag(taper(axonCurve, 0.12, 0.1, 160, 12), NTAG.axon)
  const term = mergeGeometries([...TERMINALS.map(p => withTag(taper(curveOf(p, 0.5), 0.08, 0.04, 16, 8), NTAG.terminal)), ...TERMINALS.map(p => { const g = new THREE.SphereGeometry(0.11, 16, 12); g.translate(...p[2]); return withTag(g, NTAG.terminal) })])
  const my = mergeGeometries(MYELIN.map(([a, b]) => {
    // 一节髓鞘：沿轴突的一小段管子，两头收圆
    const sub = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => axonCurve.getPointAt(a + (b - a) * i / 8)))
    const g = new THREE.TubeGeometry(sub, 24, 1, 16), p = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3()
    for (let i = 0; i <= 24; i++) { sub.getPointAt(i / 24, c); const t = i / 24, r = 0.19 * Math.sqrt(Math.max(0.02, 1 - Math.pow(2 * t - 1, 8))); for (let j = 0; j <= 16; j++) { const k = i * 17 + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c); p.setXYZ(k, v.x, v.y, v.z) } }
    g.computeVertexNormals(); return g
  }))
  return { den, axon, term, my }
}
let PG: ReturnType<typeof plainGeos> | null = null
const pgeo = () => (PG ??= plainGeos())

/** 冲动走的路：从最左边一枝树突的末梢 → 细胞体 → 轴突 → 中间那一枝神经末梢 */
export const IMPULSE_LEGS = (): V3[][] => {
  const d0 = DENDRITES[0], d1 = DENDRITES.find(b => b.pts[0] === d0.pts.at(-1)) ?? d0
  return [[...d1.pts].reverse(), [...d0.pts].reverse(), [[0, 0, 0], [0.8, -0.03, 0]], AXON, TERMINALS[1]]
}

/** 神经元。hi：各部分亮多少（0–1）；dim：其余部分压暗 */
export function Neuron({ hi, dim = 0 }: { hi: Partial<Record<keyof typeof NTAG, number>>; dim?: number }) {
  const soma = useJob('neuron', somaGen)
  const G = pgeo()
  const m = useMemo(() => {
    const t = tagged(wetMat('#c8b2d6', { roughness: 0.34, clearcoat: 0.8, sheen: 0.6, sheenColor: new THREE.Color('#f3dcff') }), '#8ff3ff')
    return { t, my: wetMat('#f1e9d6', { roughness: 0.26, clearcoat: 1, sheen: 0.4 }), nuc: wetMat('#6b3f7c', { roughness: 0.3 }), soma: tagged(wetMat('#c8b2d6', { roughness: 0.34, clearcoat: 0.8, sheen: 0.6, sheenColor: new THREE.Color('#f3dcff'), transparent: true, opacity: 0.78 }), '#8ff3ff') }
  }, [])
  for (const [k, i] of Object.entries(NTAG)) { const v = hi[k as keyof typeof NTAG] ?? 0; m.t.u.uHi.value[i] = v; m.soma.u.uHi.value[i] = v }
  m.t.u.uDim.value = dim; m.soma.u.uDim.value = dim
  const somaG = useMemo(() => soma && withTag(soma.clone(), NTAG.body), [soma])
  return <group>
    {somaG && <mesh geometry={somaG} material={m.soma.mat} castShadow renderOrder={3} />}
    <mesh scale={[0.4, 0.36, 0.36]} position={[-0.05, 0.05, 0]} material={m.nuc}><sphereGeometry args={[1, 32, 20]} /></mesh>
    <mesh scale={0.1} position={[0.05, 0.12, 0.2]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#2c1636" /></mesh>
    <mesh geometry={G.den} material={m.t.mat} castShadow />
    <mesh geometry={G.axon} material={m.t.mat} castShadow />
    <mesh geometry={G.term} material={m.t.mat} castShadow />
    <mesh geometry={G.my} material={m.my} castShadow />
  </group>
}

// ---------- 一束神经（剖开） ----------
/** 一段神经：外面一层膜，里面是许多神经纤维（每根有一圈髓鞘），分成几小束。轴线沿 x，切面朝 +x */
export function Bundle() {
  const g = useMemo(() => {
    const rnd = rnd0(31), fibers: THREE.BufferGeometry[] = [], sheaths: THREE.BufferGeometry[] = []
    const fasc: [number, number, number][] = [[0, 0.32, 0.5], [0.32, -0.28, 0.42], [-0.35, -0.22, 0.4], [-0.05, -0.05, 0.25]]
    for (const [cy, cz, r] of fasc) {
      const sh = new THREE.CylinderGeometry(r, r, 2.2, 40, 1, true); sh.rotateZ(Math.PI / 2); sh.translate(-1.1, cy, cz); sheaths.push(sh)
      for (let i = 0; i < 60; i++) {
        const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * (r - 0.07), fr = 0.035 + rnd() * 0.025
        const f = new THREE.CylinderGeometry(fr, fr, 2.2 + rnd() * 0.15, 10); f.rotateZ(Math.PI / 2); f.translate(-1.1 + rnd() * 0.08, cy + Math.cos(a) * rr, cz + Math.sin(a) * rr); fibers.push(f)
      }
    }
    return { fibers: mergeGeometries(fibers), sheaths: mergeGeometries(sheaths), outer: new THREE.CylinderGeometry(1.0, 1.0, 2.3, 64, 1, true).rotateZ(Math.PI / 2).translate(-1.15, 0, 0) }
  }, [])
  return <group>
    <mesh geometry={g.outer}><meshPhysicalMaterial color="#f0dcc2" roughness={0.5} sheen={0.6} sheenColor="#fff2d8" side={THREE.DoubleSide} transparent opacity={0.92} /></mesh>
    <mesh geometry={g.sheaths}><meshPhysicalMaterial color="#e8c8a8" roughness={0.45} side={THREE.DoubleSide} transparent opacity={0.6} /></mesh>
    <mesh geometry={g.fibers}><meshPhysicalMaterial color="#f6efe0" roughness={0.3} clearcoat={0.8} emissive="#ffd890" emissiveIntensity={0.08} /></mesh>
    {/* 切面上：外膜一圈、里面填一层淡淡的结缔组织 */}
    <mesh position={[0.001, 0, 0]} rotation-y={Math.PI / 2}><circleGeometry args={[1.0, 64]} /><meshPhysicalMaterial color="#e9cfae" roughness={0.6} transparent opacity={0.35} depthWrite={false} /></mesh>
  </group>
}
