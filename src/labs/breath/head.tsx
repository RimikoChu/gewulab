// 第 1 课的头颈部正中剖面模型（放大 1.5 倍）和气管内壁的放大模型。
// 剖面模型按 1 cm 一个单位做，放进展厅时乘 HEAD_S。脸朝 +x（朝展厅中间），剖开的一面朝 +z（朝镜头），留下远的那一半。
// 一口气从鼻孔进来：沿着鼻腔、咽、喉、气管走，走到哪一段那一段亮；灰尘按大小停在鼻毛上、黏液上，或者一直走下去。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Metal, disc } from '@/lab-kit'
import { DUST, catchAt, type AirwayKey, type DustSize } from './physics'
import { curveOf, ellipsoid, fbm, lin, mix3, roundCone, smin, sminAll, surfaceNetsGen, type V3 } from './sdf'
import { prioOf, useJob } from './job'
import { ghostMat } from './chest'

export const HEAD_S = 0.15

// ---------- 形状（cm） ----------
const AIR = {
  vest: [[12.3, 16.6, 0], [9.6, 17.6, 0]] as V3[],
}
/** 头颈的外形 */
function outer(x: number, y: number, z: number) {
  return sminAll([
    ellipsoid(x, y, z, [-0.8, 22.2, 0], [9.75, 8.8, 7.6]),
    ellipsoid(x, y, z, [4.2, 16.0, 0], [6.2, 6.8, 5.8]),
    roundCone(x, y, z, [2.5, 13.2, 0], [8.0, 11.4, 0], 4.0, 2.2),
    roundCone(x, y, z, [8.6, 21.3, 0], [11.6, 17.3, 0], 0.9, 1.7),
    ellipsoid(x, y, z, [9.7, 14.2, 0], [1.2, 1.7, 2.3]),
    roundCone(x, y, z, [-0.6, -0.5, 0], [0.2, 13.0, 0], 5.3, 5.0),
  ], 1.4)
}
/** 空腔：鼻腔、鼻咽、口咽、喉咽、喉、气管、口腔、食管（食管平时是扁的） */
function cavity(x: number, y: number, z: number) {
  const zz = z
  const nasal = Math.max(ellipsoid(x, y, zz, [7.0, 19.0, 0], [4.6, 2.7, 1.9]), -(y - 16.4))
  return sminAll([
    nasal,
    roundCone(x, y, zz, AIR.vest[0], AIR.vest[1], 0.75, 1.0),
    roundCone(x, y, zz, [3.6, 18.6, 0], [-0.3, 16.6, 0], 1.45, 1.35),
    roundCone(x, y, zz, [-0.3, 16.6, 0], [-0.3, 11.4, 0], 1.35, 1.2),
    roundCone(x, y, zz, [-0.3, 11.4, 0], [0.0, 8.2, 0], 1.15, 0.8),
    roundCone(x, y, zz, [0.0, 8.2, 0], [-0.4, -3, 0], 0.32, 0.3),                       // 食管
    roundCone(x, y, zz, [1.2, 10.6, 0], [2.3, 7.2, 0], 1.0, 0.95),                       // 喉
    roundCone(x, y, zz, [2.3, 7.2, 0], [2.8, -0.5, 0], 0.98, 0.98),                      // 气管
    ellipsoid(x, y, zz, [6.2, 14.6, 0], [4.0, 0.55, 2.2]),                                // 口腔（舌面上方的一道缝）
    roundCone(x, y, zz, [3.0, 14.7, 0], [0.4, 14.2, 0], 0.55, 0.7),
  ], 0.5)
}
/** 放回去的软组织：三个鼻甲（贴在外侧壁上）、会厌、声带 */
function inserts(x: number, y: number, z: number) {
  const tur = (y0: number, x0: number, x1: number, r: number) => roundCone(x, y, z, [x1, y0 + 0.1, -1.55], [x0, y0 - 0.25, -1.25], r, r * 0.6)
  return sminAll([
    tur(20.4, 4.8, 9.0, 0.5), tur(19.1, 4.2, 10.0, 0.62), tur(17.7, 4.0, 10.4, 0.62),
    roundCone(x, y, z, [1.9, 9.9, 0], [0.4, 12.3, 0], 0.32, 0.16),                       // 会厌
    roundCone(x, y, z, [1.4, 8.6, 0], [3.0, 8.4, 0], 0.18, 0.18),                        // 声带
  ], 0.25)
}
function headSdf(x: number, y: number, z: number) {
  const o = outer(x, y, z)
  // 离表面远的外面、离空腔远的里面，都不用细算空腔（空腔都在 |z| < 2.2 的一层里）
  if (o > 0.6 || z < -2.6 || x < -2.6 || y > 22) return Math.max(o, z, -0.5 - y)
  let d = Math.max(o, -cavity(x, y, z))
  d = Math.min(d, Math.max(inserts(x, y, z), o))
  return Math.max(d, z, -0.5 - y)          // 剖开：只留 z ≤ 0 的那一半；脖子在下面截平
}

// ---------- 剖面上各种组织的颜色 ----------
const C = { skin: lin('#d9a58a'), flesh: lin('#d48878'), muscle: lin('#a8424a'), mucosa: lin('#e06c78'), bone: lin('#ece2cc'), marrow: lin('#c9a77f'), brain: lin('#d9b8b4'), cart: lin('#cfe0e6'), fat: lin('#e8cf9a') }
function tissue(x: number, y: number, z: number): V3 {
  const skull = ellipsoid(x, y, z, [-0.8, 22.4, 0], [9.2, 8.2, 7.0])
  if (skull < -0.75 && y > 17.6) return mix3(C.brain, C.flesh, 0.25 * Math.max(0, Math.sin(x * 2.2 + 3 * fbm(x * 0.4, y * 0.4, 0, 2)) * Math.sin(y * 2.0)))
  if (skull < 0.05 && y > 17.4 && x < 6.5) return C.bone
  if (roundCone(x, y, z, [9.2, 16.25, 0], [3.4, 16.45, 0], 0.42, 0.42) < 0) return C.bone          // 硬腭
  // 颈椎：一节节圆角的椎体（外面一圈骨密质、里面松质），节间是椎间盘；椎体后面是棘突
  if (y < 15.6 && y > -0.8 && x < -1.9 && x > -6.2) {
    const k = Math.floor((y + 0.6) / 1.65), cy = -0.6 + (k + 0.5) * 1.65, ly = y - cy
    const rr = (hx: number, hy: number, r: number, px: number, py: number) => { const qx = Math.abs(px) - hx + r, qy = Math.abs(py) - hy + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r }
    const body = rr(1.2, 0.68, 0.35, x + 3.35, ly), spin = rr(0.75, 0.3, 0.25, x + 5.35, ly + 0.25)
    if (body < 0) return body < -0.18 ? C.marrow : C.bone
    if (spin < 0) return C.bone
    if (x > -4.6 && Math.abs(ly) > 0.6) return C.cart
  }
  const cav = cavity(x, y, z)
  if (cav < 0.42) return C.mucosa
  if (roundCone(x, y, z, [2.6, 10.2, 0], [3.6, 6.4, 0], 0.55, 0.5) < 0) return C.cart              // 甲状软骨
  if (y < 6.2 && x > 3.3 && x < 4.0 && ((y + 10) % 0.9) < 0.55) return C.cart                         // 气管软骨环
  if (ellipsoid(x, y, z, [4.6, 13.2, 0], [4.4, 1.9, 2.5]) < 0) return C.muscle                         // 舌
  return mix3(C.flesh, C.fat, Math.max(0, fbm(x * 0.5, y * 0.5, 0, 2)) * 0.5)
}

/** 分段生成（见 job.ts） */
function headGen() {
  // 剖面上的颜色在周围几处取样再平均，组织的分界不会是一格一格的台阶
  const O: [number, number][] = [[0, 0], [0.07, 0], [-0.07, 0], [0, 0.07], [0, -0.07], [0.05, 0.05], [-0.05, -0.05]]
  return surfaceNetsGen(headSdf, [[-11.2, -1.0, -8.0], [13.4, 31.4, 0.4]], 0.13, (p, n) => {
    if (n[2] > 0.82 && p[2] > -0.25) { const c: V3 = [0, 0, 0]; for (const [dx, dy] of O) { const t = tissue(p[0] + dx, p[1] + dy, 0); c[0] += t[0] / O.length; c[1] += t[1] / O.length; c[2] += t[2] / O.length } return c }
    if (cavity(p[0], p[1], p[2]) < 0.2) return C.mucosa
    return mix3(C.skin, C.flesh, 0.15 + 0.15 * fbm(p[0], p[1], p[2], 2))
  })
}

// ---------- 气流的路 ----------
/** 一口气走的路（cm）。每一段标着是呼吸道的哪一部分 */
const PATH: { p: V3; at: AirwayKey }[] = [
  { p: [12.6, 16.5, -0.4], at: 'nose' }, { p: [10.6, 17.3, -0.5], at: 'nose' }, { p: [8.0, 18.6, -0.7], at: 'nose' }, { p: [5.2, 18.9, -0.7], at: 'nose' },
  { p: [2.6, 18.2, -0.6], at: 'pharynx' }, { p: [0.2, 16.6, -0.6], at: 'pharynx' }, { p: [-0.5, 13.8, -0.6], at: 'pharynx' }, { p: [-0.2, 11.6, -0.6], at: 'pharynx' },
  { p: [1.0, 10.2, -0.6], at: 'larynx' }, { p: [1.9, 8.6, -0.6], at: 'larynx' }, { p: [2.35, 6.8, -0.6], at: 'trachea' }, { p: [2.7, 2.0, -0.6], at: 'trachea' },
  { p: [2.85, -2.6, -0.6], at: 'trachea' }, { p: [2.9, -4.4, -0.6], at: 'bronchi' }, { p: [3.2, -6.0, 1.6], at: 'bronchi' }, { p: [3.5, -7.2, 3.6], at: 'bronchi' },
]
export const AIR_CURVE = curveOf(PATH.map(q => q.p), 0.4)
/** 每一段从路上的哪里开始（0–1） */
export const AIR_MARK: Record<AirwayKey, number> = (() => {
  const pts = AIR_CURVE.getSpacedPoints(400), out = {} as Record<AirwayKey, number>
  for (const q of PATH) { if (out[q.at] !== undefined) continue; let bi = 0, bd = 1e9; pts.forEach((p, i) => { const d = p.distanceToSquared(new THREE.Vector3(...q.p)); if (d < bd) { bd = d; bi = i } }); out[q.at] = bi / 400 }
  return out
})()
/** 进度 s 处是哪一段 */
export function airwayAt(s: number): AirwayKey { let k: AirwayKey = 'nose'; for (const [kk, v] of Object.entries(AIR_MARK)) if (s >= v && v >= AIR_MARK[k]) k = kk as AirwayKey; return k }
/** 灰尘停在路上的哪里：鼻毛在鼻孔里，黏液一半在鼻腔、一半在气管；很细的一直走到头 */
function stopAt(size: DustSize, i: number) {
  const c = catchAt(size)
  return c === 'hair' ? 0.035 + (i % 3) * 0.012 : c === 'mucus' ? (i % 2 ? 0.13 + (i % 4) * 0.03 : AIR_MARK.trachea + 0.05 + (i % 4) * 0.04) : 1.2
}
/** 路上 s 处在模型里的位置（cm），加一点偏移 */
export const airPoint = (s: number) => AIR_CURVE.getPointAt(Math.min(1, Math.max(0, s)))

// ---------- 头颈部模型 ----------
/** flow：这口气走到哪了（0 还没吸，1 走完）；hl：哪一段亮着 */
export function HeadModel(props: { flow: number; show: { pharynx: boolean } }) {
  const geo = useJob('head', headGen, prioOf('head'))
  return geo ? <HeadInner geo={geo} {...props} /> : null
}
function HeadInner({ flow, show, geo }: { flow: number; show: { pharynx: boolean }; geo: THREE.BufferGeometry }) {
  const air = useRef<THREE.InstancedMesh>(null), dust = useRef<THREE.InstancedMesh>(null)
  const glowGeo = useMemo(() => new THREE.TubeGeometry(AIR_CURVE, 300, 0.42, 12), [])
  const glowM = useMemo(() => ghostMat('#7fe3ff', 0.05, 0.6, 1.6), [])
  const foodGeo = useMemo(() => new THREE.TubeGeometry(curveOf([[8.5, 14.6, -0.9], [3.0, 14.6, -0.9], [-0.6, 13.6, -0.9], [-0.7, 11.0, -0.9], [-0.1, 8.0, -0.9], [-0.3, 2.0, -0.9], [-0.4, -0.4, -0.9]], 0.4), 200, 0.36, 12), [])
  const foodM = useMemo(() => ghostMat('#ffd27a', 0.05, 0.6, 1.6), [])
  // 鼻毛：鼻孔里一圈细毛，朝里斜着长
  const hairs = useMemo(() => {
    let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    const g: THREE.BufferGeometry[] = []
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, t = r(), base = new THREE.Vector3(12.4 - t * 2.0, 16.6 + t * 0.4 + Math.sin(a) * 0.72, Math.cos(a) * 0.72 - 0.7)
      const tip = base.clone().add(new THREE.Vector3(-0.5 - r() * 0.4, -Math.sin(a) * 0.55, -Math.cos(a) * 0.55 + 0.05))
      const c = new THREE.QuadraticBezierCurve3(base, base.clone().lerp(tip, 0.5).add(new THREE.Vector3(0.1, 0.12, 0)), tip)
      g.push(new THREE.TubeGeometry(c, 5, 0.035, 4))
    }
    return g
  }, [])
  const dusts = useMemo(() => DUST.map((d, i) => ({ d, stop: stopAt(d, i), lag: (i * 0.37) % 0.25, off: [Math.sin(i * 2.3) * 0.35, Math.cos(i * 1.7) * 0.3, 0.25 + 0.2 * Math.sin(i)] as V3, size: d === 'big' ? 0.34 : d === 'mid' ? 0.2 : 0.11 })), [])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), v: new THREE.Vector3(), c: new THREE.Color(), cold: new THREE.Color('#9fd8ff'), warm: new THREE.Color('#ffd2b0') }), [])
  useFrame(s => {
    const t = s.clock.elapsedTime
    // 发光的那一截：从鼻孔一直亮到气流的前头
    const total = glowGeo.index!.count, segs = 300
    glowGeo.setDrawRange(0, Math.floor(total * Math.min(1, flow) / 6) * 6 || 0)
    void segs
    const a = air.current
    if (a) {
      for (let i = 0; i < 60; i++) {
        const ph = (i / 60 + t * 0.12) % 1, ss = Math.min(flow, ph * 1.0), on = flow > 0.01 && ph < flow
        const p = airPoint(ss)
        tmp.v.set(p.x + Math.sin(i * 7.1) * 0.35, p.y + Math.cos(i * 3.3) * 0.35, p.z + 0.15 * Math.sin(i))
        a.setMatrixAt(i, tmp.m.makeScale(on ? 0.16 : 0.0001, on ? 0.16 : 0.0001, on ? 0.16 : 0.0001).setPosition(tmp.v))
        a.setColorAt(i, tmp.c.copy(tmp.cold).lerp(tmp.warm, Math.min(1, ss / AIR_MARK.pharynx)))
      }
      a.instanceMatrix.needsUpdate = true; if (a.instanceColor) a.instanceColor.needsUpdate = true
    }
    const dm = dust.current
    if (dm) {
      dusts.forEach((q, i) => {
        const ss = Math.min(q.stop, Math.max(0, flow * 1.25 - q.lag)), on = flow > 0.005 && ss > 0.002 && ss < 1.15
        const p = airPoint(ss), stuck = ss >= q.stop - 1e-4
        tmp.v.set(p.x + q.off[0] * (stuck ? 1.6 : 1), p.y + q.off[1] * (stuck ? 1.6 : 1), p.z + q.off[2])
        dm.setMatrixAt(i, tmp.m.makeScale(on ? q.size : 0.0001, on ? q.size : 0.0001, on ? q.size : 0.0001).setPosition(tmp.v))
      })
      dm.instanceMatrix.needsUpdate = true
    }
  })
  return (
    <group scale={HEAD_S}>
      <mesh geometry={geo} castShadow receiveShadow><meshPhysicalMaterial vertexColors roughness={0.55} clearcoat={0.35} clearcoatRoughness={0.5} sheen={0.4} sheenColor="#ffd8cc" /></mesh>
      {hairs.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial color="#3a2a22" roughness={0.7} /></mesh>)}
      <mesh geometry={glowGeo} material={glowM} renderOrder={9} />
      {show.pharynx && <mesh geometry={foodGeo} material={foodM} renderOrder={9} />}
      <instancedMesh ref={air} args={[undefined, undefined, 60]} frustumCulled={false}><sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial transparent opacity={0.75} toneMapped={false} /></instancedMesh>
      <instancedMesh ref={dust} args={[undefined, undefined, DUST.length]} frustumCulled={false}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#6b5a45" roughness={0.9} /></instancedMesh>
      <Bronchi />
    </group>
  )
}

/** 脖子下面露出来的一截气管和两根支气管（半透明，看得见里面的气流），由一根不锈钢支杆托着 */
function Bronchi() {
  const g = useMemo(() => {
    const tr = new THREE.TubeGeometry(curveOf([[2.8, -0.4, -0.6], [2.85, -2.6, -0.6], [2.9, -4.4, -0.6]]), 24, 0.98, 18)
    const bl = new THREE.TubeGeometry(curveOf([[2.9, -4.2, -0.6], [3.2, -6.0, 1.6], [3.5, -7.4, 3.8]]), 24, 0.7, 16)
    const br = new THREE.TubeGeometry(curveOf([[2.9, -4.2, -0.6], [3.1, -5.8, -2.6], [3.3, -7.0, -4.8]]), 24, 0.75, 16)
    return [tr, bl, br]
  }, [])
  const rings = useMemo(() => Array.from({ length: 4 }, (_, i) => -0.9 - i * 0.85), [])
  return <group>
    {g.map((x, i) => <mesh key={i} geometry={x}><meshPhysicalMaterial color="#e9c9c0" roughness={0.3} clearcoat={0.8} transparent opacity={0.45} depthWrite={false} side={THREE.DoubleSide} /></mesh>)}
    {rings.map(y => <mesh key={y} position={[2.83, y, -0.6]} rotation-x={Math.PI / 2}><torusGeometry args={[0.98, 0.1, 8, 28, Math.PI * 1.55]} /><meshPhysicalMaterial color="#dbe7ea" roughness={0.35} clearcoat={0.6} /></mesh>)}
  </group>
}

/** 头颈部模型的展台：台座、托住脖子的支杆 */
export function HeadPlinth({ at }: { at: V3 }) {
  const base = useMemo(() => disc(1.3, 0.06, { chamfer: 0.015, segs: 64 }), [])
  const topY = at[1] - 12 * HEAD_S
  return <group>
    <mesh position={[at[0] + 0.3, topY / 2, at[2] - 0.6]} castShadow receiveShadow><boxGeometry args={[3.4, topY, 2.4]} /><meshPhysicalMaterial color="#1d242b" roughness={0.35} clearcoat={0.5} /></mesh>
    <mesh geometry={base} position={[at[0] + 0.3, topY, at[2] - 0.6]} receiveShadow><Metal kind="aluminum" grain="turned" /></mesh>
    <mesh position={[at[0] - 0.1, topY + (at[1] - 0.1 - topY) / 2, at[2] - 0.6]} castShadow><cylinderGeometry args={[0.05, 0.05, at[1] - 0.1 - topY, 16]} /><Metal kind="stainless" grain="brushed" /></mesh>
  </group>
}

// ---------- 气管内壁（放大） ----------
/**
 * 一小片气管内壁：下面是一排排柱状的上皮细胞（有几个杯状细胞，顶上鼓着黏液），细胞顶上密密的纤毛像麦浪一样摆，
 * 最上面一层半透明的黏液，带着灰尘往咽喉那边（+x）走。on 为假时纤毛停住
 */
/** 一个柱状细胞顶面的高度 */
const cellTop = (h: number) => h / 2 - 0.12 + 1.5 * (h / 2 - 0.08)
export function Cilia({ on }: { on: boolean }) {
  const NX = 14, NZ = 8, W = 2.6, D = 1.5
  const cells = useMemo(() => {
    const out: { x: number; z: number; h: number; goblet: boolean }[] = []
    let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) out.push({ x: -W / 2 + (i + 0.5) * W / NX + (j % 2) * W / NX / 2, z: -D / 2 + (j + 0.5) * D / NZ, h: 0.62 + r() * 0.08, goblet: r() < 0.12 })
    return out
  }, [])
  const cellGeo = useMemo(() => { const g = new THREE.CapsuleGeometry(1, 1, 4, 10); return g }, [])
  const cilia = useRef<THREE.InstancedMesh>(null), mucus = useRef<THREE.Mesh>(null), specks = useRef<THREE.InstancedMesh>(null)
  const roots = useMemo(() => { const out: { p: THREE.Vector3; ph: number }[] = []; let s = 13; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; cells.forEach(c => { if (c.goblet) return; for (let k = 0; k < 12; k++) out.push({ p: new THREE.Vector3(c.x + (r() - 0.5) * 0.13, cellTop(c.h) - 0.02, c.z + (r() - 0.5) * 0.13), ph: c.x * 9 + c.z * 2 }) }); return out }, [cells])
  const ciliaGeo = useMemo(() => { const g = new THREE.CylinderGeometry(0.006, 0.009, 0.2, 5, 4); g.translate(0, 0.1, 0); return g }, [])
  const mGeo = useMemo(() => new THREE.PlaneGeometry(W, D, 40, 16), [])
  const sp = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ x: -W / 2 + (i / 10) * W, z: -D / 2 + 0.15 + ((i * 0.37) % 1) * (D - 0.3), r: 0.04 + (i % 3) * 0.02 })), [])
  const t0 = useRef(0)
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), s: new THREE.Vector3(1, 1, 1), v: new THREE.Vector3() }), [])
  useFrame((st, dt0) => {
    const dt = Math.min(dt0, 1 / 30); if (on) t0.current += dt
    const t = t0.current, c = cilia.current
    if (c) {
      roots.forEach((r, i) => {
        // 有力的一扫朝 +x，慢慢收回；相邻的错开一点相位，连起来像麦浪
        const ph = (t * 1.6 - r.ph * 0.06) % 1, a = ph < 0.3 ? -0.7 + 1.4 * (ph / 0.3) : 0.7 - 1.4 * ((ph - 0.3) / 0.7)
        c.setMatrixAt(i, tmp.m.compose(r.p, tmp.q.setFromEuler(tmp.e.set(0, 0, -a * 0.9)), tmp.s))
      })
      c.instanceMatrix.needsUpdate = true
    }
    const sm = specks.current
    if (sm) { sp.forEach((p, i) => { const x = ((p.x + W / 2 + t * 0.18) % W) - W / 2; sm.setMatrixAt(i, tmp.m.makeScale(p.r, p.r, p.r).setPosition(x, 0.8 + 0.03 * Math.sin(x * 5), p.z)) }); sm.instanceMatrix.needsUpdate = true }
    const mm = mucus.current
    if (mm) { const P = mGeo.attributes.position as THREE.BufferAttribute; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, 0.025 * Math.sin(x * 6 - t * 2.2) + 0.012 * Math.sin(y * 9 + x * 3)) } P.needsUpdate = true; mGeo.computeVertexNormals() }
    void st
  })
  return <group>
    {/* 基膜和下面的结缔组织 */}
    <mesh position={[0, -0.28, 0]} receiveShadow><boxGeometry args={[W + 0.1, 0.24, D + 0.1]} /><meshPhysicalMaterial color="#d99a95" roughness={0.6} sheen={0.4} sheenColor="#ffc0b8" /></mesh>
    {cells.map((c, i) => <group key={i} position={[c.x, c.h / 2 - 0.12, c.z]}>
      <mesh geometry={cellGeo} scale={[W / NX * 0.47, c.h / 2 - 0.08, D / NZ * 0.45]}><meshPhysicalMaterial color={c.goblet ? '#f1d9e6' : '#f0b8b6'} roughness={0.45} clearcoat={0.4} sheen={0.5} sheenColor="#ffd8d8" /></mesh>
      <mesh position={[0, -c.h * 0.12, D / NZ * 0.3]} scale={[0.05, 0.09, 0.04]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#6b3a6a" roughness={0.5} /></mesh>
      {c.goblet && <mesh position={[0, cellTop(c.h) - (c.h / 2 - 0.12), 0]} scale={[0.08, 0.07, 0.07]}><sphereGeometry args={[1, 14, 10]} /><meshPhysicalMaterial color="#e8f0f6" transparent opacity={0.8} roughness={0.15} clearcoat={1} /></mesh>}
    </group>)}
    <instancedMesh ref={cilia} args={[ciliaGeo, undefined, roots.length]} frustumCulled={false}><meshStandardMaterial color="#f6dcd6" roughness={0.5} /></instancedMesh>
    <mesh ref={mucus} geometry={mGeo} rotation-x={-Math.PI / 2} position={[0, 0.76, 0]} renderOrder={5}><meshPhysicalMaterial color="#e6f2ea" transparent opacity={0.45} roughness={0.08} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <instancedMesh ref={specks} args={[undefined, undefined, sp.length]} frustumCulled={false}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#5e4c3a" roughness={0.9} /></instancedMesh>
  </group>
}
