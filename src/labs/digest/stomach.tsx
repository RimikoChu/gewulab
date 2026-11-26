// 第 4 课：展台上放大 2.4 倍的胃。胃壁有厚度：外面是光滑的浆膜，里面是一道道纵行的皱襞；
// 前半边可以拿开（剖开），剖面上看得见浆膜、肌层、黏膜下层、黏膜几层。
// 蠕动：一道道收缩波从胃体推向幽门（顶点着色器里把胃壁朝中轴收）；食物块跟着翻动、变小，和胃液混成糊状的食糜；
// 幽门开一下，一小股食糜挤进十二指肠。形状和人体模型里的胃是同一个距离场（body.tsx 的 STOMACH_AXIS）。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Metal, disc } from '@/lab-kit'
import { STOMACH_AXIS, STOMACH_R } from './body'
import { chain, fbm, lin, mix3, noise, surfaceNetsGen, curveOf, type V3 } from './sdf'
import { planarUV, sweep, tissueBump } from './tube'
import { prioOf, useJob } from './job'
import { ease } from './parts'

export const ST_S = 2.4
/** 展台台面的中心（台面高 ST_AT[1]） */
export const ST_AT: V3 = [15.5, 5.2, 1.4]
/** 胃在身体坐标里的中心：放大以后对准展台上方 */
const C0: V3 = [0.45, 11.12, 0.08]
const LIFT = 0.95          // 胃的中心比台面高多少（身体坐标，乘 ST_S 以后是世界的）
/** 身体坐标里的一点 → 世界坐标 */
export const stW = (p: V3): V3 => [ST_AT[0] + (p[0] - C0[0]) * ST_S, ST_AT[1] + (p[1] - C0[1] + LIFT) * ST_S, ST_AT[2] + (p[2] - C0[2]) * ST_S]

// ---------- 中轴：最近点、沿轴的位置 t、绕轴的角度 ----------
// 中轴是 STOMACH_AXIS 连成的光滑曲线，取 28 个点；半径也沿曲线光滑地变
const AXC = curveOf(STOMACH_AXIS, 0.5), NA = 28
const A = Array.from({ length: NA }, (_, i) => AXC.getPoint(i / (NA - 1)))
const RA = A.map((_, i) => { const u = (i / (NA - 1)) * (STOMACH_R.length - 1), k = Math.min(STOMACH_R.length - 2, Math.floor(u)), f = u - k, f2 = f * f * (3 - 2 * f); return STOMACH_R[k] + (STOMACH_R[k + 1] - STOMACH_R[k]) * f2 })
const SEGL = A.slice(1).map((p, i) => p.distanceTo(A[i])), TOTAL = SEGL.reduce((a, b) => a + b, 0)
const tmpV = new THREE.Vector3(), tmpD = new THREE.Vector3()
/** 离 (x,y,z) 最近的中轴点、它在中轴上的位置 t（0 贲门 – 1 幽门）、那里的半径 */
function nearAxis(x: number, y: number, z: number) {
  let best = 1e9, bi = 0, bt = 0
  for (let i = 0; i < A.length - 1; i++) {
    const a = A[i], b = A[i + 1], bx = b.x - a.x, by = b.y - a.y, bz = b.z - a.z
    const t = Math.min(1, Math.max(0, ((x - a.x) * bx + (y - a.y) * by + (z - a.z) * bz) / (bx * bx + by * by + bz * bz)))
    const d = (x - a.x - bx * t) ** 2 + (y - a.y - by * t) ** 2 + (z - a.z - bz * t) ** 2
    if (d < best) { best = d; bi = i; bt = t }
  }
  const a = A[bi], b = A[bi + 1], cx = a.x + (b.x - a.x) * bt, cy = a.y + (b.y - a.y) * bt, cz = a.z + (b.z - a.z) * bt
  let s = 0; for (let i = 0; i < bi; i++) s += SEGL[i]; s += SEGL[bi] * bt
  return { c: [cx, cy, cz] as V3, t: s / TOTAL, r: RA[bi] + (RA[bi + 1] - RA[bi]) * bt, seg: bi }
}
/** 光滑的外壁：和人体模型里的胃同一个形状，略胖一点 */
const outer = (x: number, y: number, z: number) => chain(x, y, z, STOMACH_AXIS, STOMACH_R.map(r => r * 1.04), 0.12) + 0.006 * fbm(x * 8, y * 8, z * 8, 2)
const WALL = 0.055
/** 胃壁（有厚度、带皱襞）。side = −1 留后半边，+1 留前半边，0 整个（没剖开时用） */
function wallSdf(x: number, y: number, z: number, side: number) {
  const o = outer(x, y, z)
  if (o > 0.04) return o
  const n = nearAxis(x, y, z)
  const rx = x - n.c[0], ry = y - n.c[1], rz = z - n.c[2], d = Math.hypot(rx, ry, rz)
  // 绕轴的角度：用轴的方向和 z 轴定一个参考方向
  const a = A[n.seg], b = A[n.seg + 1]
  tmpD.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize(); tmpV.set(0, 0, 1).cross(tmpD).normalize()
  const u = (rx * tmpV.x + ry * tmpV.y + rz * tmpV.z) / (d || 1), w = rz / (d || 1)
  const ang = Math.atan2(w, u)
  // 皱襞：沿着胃的长轴走、有点弯弯曲曲的棱，幽门附近变浅
  const ridge = Math.max(0, Math.sin(ang * 11 + 2.2 * noise(n.t * 6, ang, 0.5) + n.t * 3)) ** 1.6 * (0.022 * (1 - 0.6 * n.t))
  const inner = -(o + WALL + ridge + 0.004 * noise(x * 50, y * 50, z * 50))
  if (side === 0) return Math.max(o, inner)
  const cut = side * (n.c[2] - z) - 0.002      // 前后两半：按中轴各处的 z 剖开
  return Math.max(o, inner, cut)
}
const COL = { serosa: lin('#d98a7c'), serosaL: lin('#f0b4a4'), vessel: lin('#a83a42'), muscle: lin('#a8393f'), muscleL: lin('#c85a5a'), sub: lin('#efd2c0'), mucosa: lin('#c44c56'), mucosaL: lin('#e87a7e') }
function wallColor(p: V3, nrm: V3, side: number): V3 {
  const n = nearAxis(p[0], p[1], p[2]), depth = -outer(p[0], p[1], p[2]) / WALL
  const onCut = Math.abs(n.c[2] - p[2]) < 0.012 && Math.abs(nrm[2]) > 0.6
  if (onCut) {
    // 剖面：外面薄薄一层浆膜，厚的肌层（三层肌纤维，带条纹），浅色的黏膜下层，最里面的黏膜
    if (depth < 0.1) return COL.serosaL
    if (depth < 0.66) return mix3(COL.muscle, COL.muscleL, 0.5 + 0.5 * Math.sin(depth * 70))
    if (depth < 0.8) return COL.sub
    return COL.mucosa
  }
  if (depth > 0.5) return mix3(COL.mucosa, COL.mucosaL, 0.45 + 0.8 * fbm(p[0] * 12, p[1] * 12, p[2] * 12, 2))
  const v = Math.max(0, 1 - Math.abs(fbm(p[0] * 5 + 2, p[1] * 5, p[2] * 5, 2)) * 22)
  return mix3(mix3(COL.serosa, COL.serosaL, 0.4 + 0.7 * fbm(p[0] * 4, p[1] * 4, p[2] * 4, 3)), COL.vessel, v * 0.28)
}
/** 胃液和食糜：胃腔里液面以下、后半边的那一团 */
function chymeSdf(x: number, y: number, z: number) {
  const o = outer(x, y, z); if (o > 0) return o
  const n = nearAxis(x, y, z)
  return Math.max(o + WALL + 0.03, y - 10.98, z - n.c[2] + 0.004)
}
const B: [V3, V3] = [[-0.14, 10.36, -0.52], [1.3, 12.06, 0.62]]
function* stomachGen() {
  const extra = (p: V3) => nearAxis(p[0], p[1], p[2]).t
  const back = planarUV(yield* surfaceNetsGen((x, y, z) => wallSdf(x, y, z, -1), B, 0.0125, (p, n) => wallColor(p, n, -1), extra), 12)
  const front = planarUV(yield* surfaceNetsGen((x, y, z) => wallSdf(x, y, z, 1), B, 0.0125, (p, n) => wallColor(p, n, 1), extra), 12)
  const whole = planarUV(yield* surfaceNetsGen((x, y, z) => wallSdf(x, y, z, 0), B, 0.0125, (p, n) => wallColor(p, n, 0), extra), 12)
  const chyme = yield* surfaceNetsGen(chymeSdf, [[-0.1, 10.4, -0.5], [1.25, 11.05, 0.5]], 0.016)
  // 每个顶点离它最近的中轴点：蠕动时胃壁朝它收
  for (const g of [back, front, whole]) {
    const p = g.attributes.position, ax = new Float32Array(p.count * 3)
    for (let i = 0; i < p.count; i++) { if (i % 4000 === 0) yield; const c = nearAxis(p.getX(i), p.getY(i), p.getZ(i)).c; ax[i * 3] = c[0]; ax[i * 3 + 1] = c[1]; ax[i * 3 + 2] = c[2] }
    g.setAttribute('aAxis', new THREE.BufferAttribute(ax, 3))
  }
  return { back, front, whole, chyme }
}

/** 带蠕动的湿润组织材质：顶点着色器里，靠近收缩波的地方朝中轴收 */
function peristalsisMat(wave: { value: number }, amp: { value: number }) {
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.45, sheenColor: new THREE.Color('#ffb8a8'), sheenRoughness: 0.45, bumpMap: tissueBump(), bumpScale: 0.9, side: THREE.DoubleSide, transparent: true, envMapIntensity: 0.8 })
  m.onBeforeCompile = sh => {
    sh.uniforms.uWave = wave; sh.uniforms.uAmp = amp
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTag; attribute vec3 aAxis; uniform float uWave; uniform float uAmp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ float g = 0.0; for (int i = 0; i < 2; i++) { float c = fract(uWave + float(i) * 0.5) * 0.75 + 0.3; g += exp(-pow((aTag - c) / 0.055, 2.0)); } transformed = mix(transformed, aAxis, uAmp * g * smoothstep(0.2, 0.45, aTag)); }')
  }
  return m
}

/** 第 4 课交给世界的：剖开（0–1）、蠕动的进度（0–1，大于 0 时在蠕动）、食糜化的程度、幽门开着（0–1） */
export interface StWant { cut: number; churn: number; chyme: number; pylorus: number }

export function StomachModel({ want }: { want?: StWant }) {
  const w = want ?? { cut: 0, churn: 0, chyme: 0, pylorus: 0 }
  const G = useJob('stomach', stomachGen, prioOf('stomach'))
  const gl = useThree(s => s.gl)
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  const U = useMemo(() => ({ wave: { value: 0 }, amp: { value: 0 } }), [])
  const mats = useMemo(() => ({ back: peristalsisMat(U.wave, U.amp), front: peristalsisMat(U.wave, U.amp) }), [U])
  const chymeMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#d9cba4', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), [])
  // 胃里的食物块：瘦肉（红褐）和馒头（米白），翻动、变小
  const bits = useMemo(() => {
    let sd = 19; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    const out: { p: V3; s: number; meat: boolean; ph: number }[] = []
    while (out.length < 46) {
      const t = 0.15 + rnd() * 0.62, i = Math.min(A.length - 2, Math.floor(t * (A.length - 1))), f = t * (A.length - 1) - i
      const c = A[i].clone().lerp(A[i + 1], f), r = (RA[i] + (RA[i + 1] - RA[i]) * f) * 0.62
      const p: V3 = [c.x + (rnd() - 0.5) * 2 * r, c.y + (rnd() - 0.5) * 2 * r, c.z - rnd() * r]
      if (p[1] > 10.95) continue
      out.push({ p, s: 0.03 + rnd() * 0.035, meat: rnd() < 0.5, ph: rnd() * 6 })
    }
    return out
  }, [])
  const bitGeo = useMemo(() => { const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.3 * noise(x * 2 + 1, y * 2, z * 2); p.setXYZ(i, x * k * 1.2, y * k * 0.8, z * k) } g.computeVertexNormals(); return g }, [])
  const meatRef = useRef<THREE.InstancedMesh>(null), bunRef = useRef<THREE.InstancedMesh>(null)
  const meatN = bits.filter(b => b.meat).length, bunN = bits.length - meatN
  // 幽门里挤出来的食糜：几团沿十二指肠走
  const duoCurve = useMemo(() => curveOf([[-0.02, 10.7, 0.26], [-0.3, 10.7, 0.18], [-0.5, 10.52, 0.04], [-0.53, 10.22, -0.02]], 0.4), [])
  const duo = useMemo(() => sweep(duoCurve, { segs: 60, radial: 20, r: () => 0.105, color: (t, a) => mix3(lin('#e09a88'), lin('#f0bca8'), 0.5 + 0.35 * noise(t * 30, a, 3)) }), [duoCurve])
  const eso = useMemo(() => sweep(curveOf([[0.43, 11.58, -0.12], [0.4, 11.8, -0.14], [0.36, 12.02, -0.17]], 0.5), { segs: 24, radial: 20, r: t => 0.08 + 0.03 * (1 - t) ** 3, color: (t, a) => mix3(lin('#c9736d'), lin('#e09a90'), 0.5 + 0.3 * noise(t * 20, a, 1)) }), [])
  const duoClip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), [])
  const esoClip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), [])
  const root = useRef<THREE.Group>(null), frontRef = useRef<THREE.Group>(null)
  const blobs = useRef<THREE.Group>(null)
  const sph = useRef<THREE.Mesh>(null)
  const st = useRef({ wave: 0 })
  useFrame(({ clock }, dt0) => {
    const dt = Math.min(dt0, 1 / 30), t = clock.elapsedTime
    const moving = w.churn > 0 && w.churn < 1
    st.current.wave = (st.current.wave + dt * (moving ? 0.32 : 0.05)) % 1
    U.wave.value = st.current.wave
    U.amp.value += ((moving ? 0.3 : 0) - U.amp.value) * (1 - Math.exp(-dt / 0.4))
    const e = ease(w.cut)
    if (frontRef.current) { frontRef.current.position.set(0, 0.05 * e, 0.9 * e); frontRef.current.visible = e < 0.99 }
    mats.front.opacity = 1 - e * 0.95
    if (root.current) { root.current.updateMatrixWorld(); duoClip.set(new THREE.Vector3(0, 0, -1), 0.12).applyMatrix4(root.current.matrixWorld); esoClip.set(new THREE.Vector3(0, 0, -1), -0.14).applyMatrix4(root.current.matrixWorld) }
    // 食物块：蠕动时绕着胃腔翻动，越来越小，颜色向食糜靠
    const shrink = 1 - 0.75 * w.chyme
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3()
    let im = 0, ib = 0
    for (const b of bits) {
      const amp = moving ? 0.035 : 0.006, ph = b.ph + t * (moving ? 2.2 : 0.4)
      v.set(b.p[0] + amp * Math.sin(ph), b.p[1] + amp * Math.cos(ph * 0.8), b.p[2] + amp * 0.5 * Math.sin(ph * 1.3))
      q.setFromEuler(eu.set(ph * 0.5, ph * 0.3, 0)); sc.setScalar(b.s * shrink * (b.meat ? 1 : 1 - 0.15 * w.chyme))
      M.compose(v, q, sc)
      if (b.meat) meatRef.current?.setMatrixAt(im++, M); else bunRef.current?.setMatrixAt(ib++, M)
    }
    if (meatRef.current) meatRef.current.instanceMatrix.needsUpdate = true
    if (bunRef.current) bunRef.current.instanceMatrix.needsUpdate = true
    chymeMat.color.set('#d8e4dc').lerp(new THREE.Color('#d9c08c'), w.chyme); chymeMat.opacity = 0.16 + 0.42 * w.chyme
    // 幽门：一圈括约肌，开的时候变松
    if (sph.current) sph.current.scale.setScalar(1 + 0.35 * w.pylorus)
    if (blobs.current) blobs.current.children.forEach((c, i) => {
      const s = (w.pylorus > 0 ? (t * 0.25 + i * 0.22) % 1 : 0)
      const p = duoCurve.getPointAt(Math.min(1, s)); c.position.copy(p); c.visible = w.pylorus > 0.3 && s < 0.95
    })
  })
  const meatMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#8a3b2e', roughness: 0.5, clearcoat: 0.6 }), [])
  const bunMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#efe6d0', roughness: 0.7, sheen: 0.5, sheenColor: new THREE.Color('#ffffff') }), [])
  meatMat.color.set('#8a3b2e').lerp(new THREE.Color('#c9a27a'), w.chyme * 0.8)
  // 支架：底座、立杆，托在胃的后面
  const base = useMemo(() => disc(0.6, 0.08, { chamfer: 0.02, segs: 64 }), [])
  const top = ST_AT[1], back = stW([0.5, 11.0, -0.38])
  return <group>
    <mesh geometry={base} position={[back[0], top, back[2]]} castShadow receiveShadow><Metal kind="stainless" grain="turned" /></mesh>
    <mesh position={[back[0], (top + back[1]) / 2, back[2]]} castShadow><cylinderGeometry args={[0.05, 0.06, back[1] - top, 20]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <group ref={root} position={[ST_AT[0] - C0[0] * ST_S, ST_AT[1] + (LIFT - C0[1]) * ST_S, ST_AT[2] - C0[2] * ST_S]} scale={ST_S}>
      {G && <>
        {w.cut > 0 ? <>
          <mesh geometry={G.back} material={mats.back} castShadow receiveShadow />
          <group ref={frontRef}><mesh geometry={G.front} material={mats.front} /></group>
        </> : <mesh geometry={G.whole} material={mats.back} castShadow receiveShadow />}
        {w.cut > 0.5 && <mesh geometry={G.chyme} material={chymeMat} renderOrder={3} />}
      </>}
      {w.cut > 0.5 && <>
        <instancedMesh ref={meatRef} args={[bitGeo, meatMat, meatN]} castShadow />
        <instancedMesh ref={bunRef} args={[bitGeo, bunMat, bunN]} castShadow />
      </>}
      {/* 食道的一小截和十二指肠的开头（剖开，后半边） */}
      <mesh geometry={duo}><meshPhysicalMaterial vertexColors roughness={0.45} clearcoat={0.8} side={THREE.DoubleSide} clippingPlanes={w.cut > 0.5 ? [duoClip] : []} bumpMap={tissueBump()} bumpScale={0.8} /></mesh>
      <mesh ref={sph} position={[-0.02, 10.7, 0.26]} rotation-y={Math.PI / 2}><torusGeometry args={[0.1, 0.03, 12, 32]} /><meshPhysicalMaterial color="#b84a50" roughness={0.4} clearcoat={0.8} /></mesh>
      <group ref={blobs}>{[0, 1, 2, 3].map(i => <mesh key={i} scale={0.05}><sphereGeometry args={[1, 16, 12]} /><meshPhysicalMaterial color="#dcc89a" roughness={0.3} clearcoat={1} /></mesh>)}</group>
      <mesh geometry={eso}><meshPhysicalMaterial vertexColors roughness={0.45} clearcoat={0.8} side={THREE.DoubleSide} clippingPlanes={w.cut > 0.5 ? [esoClip] : []} bumpMap={tissueBump()} bumpScale={0.8} /></mesh>
    </group>
  </group>
}
