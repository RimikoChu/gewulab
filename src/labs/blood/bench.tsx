// 两张展台上的东西：第 1 课的试管、试管架和显微镜视野展板（放大的血细胞），第 2 课的三段放大、纵向剖开的血管。
// 坐标是世界的，1 个单位 = 10 cm。放大的东西都标“示意”。计算（分层的高度、流速）从 physics.ts 取。
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, disc, lathe, shell } from '@/lab-kit'
import { BLUE, RED, rbcGeo } from './heart'
import { layers, speedOf, type CellKey, type VesselKey } from './physics'
import { ellipsoid, fbm, hollowTube, noise, surfaceNets, type V3 } from './sdf'

export const GLASS = { color: '#e4f1f4', transparent: true, opacity: 0.07, roughness: 0.06, metalness: 0, depthWrite: false, envMapIntensity: 0.32, side: THREE.DoubleSide } as const

// ---------- 展台 ----------
/** 一张展台：白色人造石台面、深灰的柜体、金属踢脚。top 是台面高度，w、d 宽和深 */
export function Plinth({ at, w, d, top }: { at: V3; w: number; d: number; top: number }) {
  return <group position={at}>
    <RoundedBox args={[w, 0.4, d]} radius={0.06} smoothness={3} position={[0, top - 0.2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#eceae4" roughness={0.32} clearcoat={0.4} clearcoatRoughness={0.3} /></RoundedBox>
    <RoundedBox args={[w - 0.5, top - 0.55, d - 0.5]} radius={0.05} smoothness={3} position={[0, (top - 0.35) / 2 + 0.15, 0]} castShadow receiveShadow><meshStandardMaterial color="#2b3036" roughness={0.55} /></RoundedBox>
    <mesh position={[0, 0.08, 0]}><boxGeometry args={[w - 0.42, 0.16, d - 0.42]} /><Metal kind="stainless" grain="brushed" /></mesh>
    {/* 台面下沿一道缝 */}
    <mesh position={[0, top - 0.42, d / 2 - 0.245]}><boxGeometry args={[w - 0.5, 0.03, 0.02]} /><meshStandardMaterial color="#14171a" /></mesh>
  </group>
}

// ---------- 第 1 课：试管和试管架 ----------
export const TUBE = { r: 0.08, h: 1.0, liquid: 0.66 }
let TS: THREE.BufferGeometry | null = null
/** 试管的玻璃：圆底、有壁厚 */
const tubeShell = () => (TS ??= shell([[0, 0], [TUBE.r * 0.55, 0.004], [TUBE.r * 0.9, 0.03], [TUBE.r, 0.08], [TUBE.r, TUBE.h]], 0.008, { segs: 40 }))
/** 一支加了抗凝剂的血液试管：玻璃管、浅蓝的胶塞（柠檬酸钠抗凝管）、里面的血。k 是静置的进度；hl 是亮起来的那一层 */
export function BloodTube({ k, hl }: { k: number; hl: 'plasma' | 'buffy' | 'red' | null }) {
  const geo = useMemo(() => ({
    glass: tubeShell(),
    stopper: lathe([[0, 0], [TUBE.r - 0.01, 0], [TUBE.r - 0.01, 0.08], [TUBE.r + 0.012, 0.09], [TUBE.r + 0.016, 0.24], [TUBE.r + 0.004, 0.25], [0, 0.25]], { segs: 32 }),
  }), [])
  const L = layers(k), H = TUBE.liquid, ri = TUBE.r - 0.009
  // 自下而上：红细胞（还没沉下去时是整管均匀的血）、白细胞和血小板、血浆
  const red = L.mixed * H, buffy = L.buffy * H, plasma = L.plasma * H
  const mixCol = useMemo(() => new THREE.Color(), [])
  mixCol.set('#7a0412').lerp(new THREE.Color('#5c030d'), k)
  const glow = (on: boolean) => on ? { emissive: '#ffd27a', emissiveIntensity: 0.35 } : {}
  return <group>
    <mesh geometry={geo.glass} renderOrder={3}><meshPhysicalMaterial {...GLASS} /></mesh>
    <mesh position={[0, TUBE.h - 0.08, 0]} geometry={geo.stopper} castShadow><meshPhysicalMaterial color="#7fb6e0" roughness={0.55} clearcoat={0.3} /></mesh>
    {/* 液柱：底下是圆的，跟着管底 */}
    <mesh position={[0, 0.012 + red / 2, 0]} renderOrder={4}><cylinderGeometry args={[ri, ri, red, 32]} /><meshStandardMaterial color={mixCol} transparent opacity={1} roughness={0.5} envMapIntensity={0.08} emissive={hl === 'red' ? '#ffd27a' : '#000000'} emissiveIntensity={hl === 'red' ? 0.35 : 0} /></mesh>
    {buffy > 0.002 && <mesh position={[0, 0.012 + red + buffy / 2, 0]}><cylinderGeometry args={[ri, ri, buffy, 32]} /><meshPhysicalMaterial color="#f1ece0" roughness={0.4} {...glow(hl === 'buffy')} /></mesh>}
    {plasma > 0.002 && <mesh position={[0, 0.012 + red + buffy + plasma / 2, 0]} renderOrder={2}><cylinderGeometry args={[ri, ri, plasma, 32]} /><meshPhysicalMaterial color="#e8c25a" transparent opacity={0.78} roughness={0.1} clearcoat={1} {...glow(hl === 'plasma')} /></mesh>}
    {/* 液面的弯月面 */}
    <mesh position={[0, 0.012 + H, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[ri, 32]} /><meshPhysicalMaterial color={plasma > 0.01 ? '#f0d47a' : '#6e0816'} transparent opacity={0.85} roughness={0.05} /></mesh>
    <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[ri * 0.7, 24]} /><meshStandardMaterial color="#5c0a16" /></mesh>
  </group>
}
/** 不锈钢丝的试管架：两层带孔的板，四根立柱 */
export function Rack() {
  const plate = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-0.55, -0.14); s.lineTo(0.55, -0.14); s.lineTo(0.55, 0.14); s.lineTo(-0.55, 0.14); s.lineTo(-0.55, -0.14)
    for (let i = 0; i < 5; i++) { const h = new THREE.Path(); h.absarc(-0.4 + i * 0.2, 0, 0.095, 0, Math.PI * 2, true); s.holes.push(h) }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 24 }); g.rotateX(-Math.PI / 2); return g
  }, [])
  return <group>
    {[0.04, 0.42].map(y => <mesh key={y} geometry={plate} position={[0, y, 0]} castShadow><Metal kind="stainless" grain="brushed" /></mesh>)}
    {[-0.53, 0.53].flatMap(x => [-0.12, 0.12].map(z => <mesh key={`${x}${z}`} position={[x, 0.24, z]} castShadow><cylinderGeometry args={[0.012, 0.012, 0.48, 10]} /><Metal kind="stainless" /></mesh>))}
    {/* 架上另外几支空管 */}
    {[-0.4, 0.0, 0.4].map(x => <mesh key={x} geometry={tubeShell()} position={[x, 0.04, 0]} renderOrder={3}><meshPhysicalMaterial {...GLASS} /></mesh>)}
  </group>
}

// ---------- 第 1 课：显微镜视野展板 ----------
/** 白细胞：表面起皱的大细胞，里面一个分叶的细胞核 */
let WBC: { cell: THREE.BufferGeometry; nuc: THREE.BufferGeometry } | null = null
const wbcGeo = () => (WBC ??= {
  cell: surfaceNets((x, y, z) => ellipsoid(x, y, z, [0, 0, 0], [1, 0.9, 0.95]) + 0.07 * fbm(x * 3, y * 3, z * 3), [[-1.3, -1.2, -1.2], [1.3, 1.2, 1.2]], 0.07),
  nuc: surfaceNets((x, y, z) => Math.min(ellipsoid(x, y, z, [-0.35, 0.15, 0], [0.33, 0.28, 0.3]), ellipsoid(x, y, z, [0.1, 0.28, 0.05], [0.3, 0.26, 0.28]), ellipsoid(x, y, z, [0.42, -0.05, 0], [0.3, 0.27, 0.27])) - 0.06 + 0.03 * noise(x * 5, y * 5, z * 5), [[-0.9, -0.5, -0.5], [0.9, 0.8, 0.5]], 0.05),
})
/** 血小板：小小的、形状不规则的碎片 */
let PLT: THREE.BufferGeometry | null = null
const pltGeo = () => (PLT ??= surfaceNets((x, y, z) => ellipsoid(x, y, z, [0, 0, 0], [1, 0.45, 0.8]) + 0.25 * noise(x * 2.2 + 3, y * 2.2, z * 2.2), [[-1.5, -1, -1.3], [1.5, 1, 1.3]], 0.1))

export const FIELD = { r: 1.35 }
/**
 * 视野展板：一块圆形的深色背板，前面一层淡黄的血浆，里面浮着放大的红细胞、白细胞、血小板。
 * focus：亮起来的那一种（其余变淡）；at：展板中心
 */
export function Field({ at, focus }: { at: V3; focus: CellKey | 'plasma' | null }) {
  const R = FIELD.r
  const g = useMemo(() => {
    let sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    const inDisc = (rr: number) => { for (;;) { const x = (rnd() * 2 - 1) * rr, y = (rnd() * 2 - 1) * rr; if (x * x + y * y < rr * rr) return [x, y] } }
    const rbc = Array.from({ length: 150 }, () => { const [x, y] = inDisc(R * 0.93); return { p: [x, y, 0.05 + rnd() * 0.16] as V3, r: [rnd() * 0.9 + 0.35, rnd() * 6, 0] as V3, s: 0.92 + rnd() * 0.16 } })
    const wbc = [[-0.55, 0.42], [0.62, -0.38], [0.2, 0.85]].map(([x, y], i) => ({ p: [x, y, 0.18] as V3, s: 0.2 + i * 0.012 }))
    const plt = Array.from({ length: 16 }, () => { const [x, y] = inDisc(R * 0.9); return { p: [x, y, 0.3] as V3, r: rnd() * 6, s: 0.035 + rnd() * 0.02 } })
    return { rbc, wbc, plt }
  }, [R])
  const rbcG = useMemo(() => rbcGeo(0.19), [])
  const mesh = useRef<THREE.InstancedMesh>(null), drift = useRef<THREE.Group>(null)
  const dim = (k: CellKey) => (focus && focus !== k ? 0.22 : 1)
  useFrame(st => {
    const m = mesh.current; if (!m) return
    const t = st.clock.elapsedTime, M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3()
    g.rbc.forEach((c, i) => { v.set(c.p[0] + 0.01 * Math.sin(t * 0.4 + i), c.p[1] + 0.01 * Math.cos(t * 0.3 + i * 1.3), c.p[2]); q.setFromEuler(e.set(Math.PI / 2 + c.r[0] * 0.5 * Math.sin(i), c.r[1] + t * 0.05, 0)); m.setMatrixAt(i, M.compose(v, q, sc.setScalar(c.s))) })
    m.instanceMatrix.needsUpdate = true
    if (drift.current) drift.current.rotation.z = Math.sin(t * 0.1) * 0.01
  })
  const W = wbcGeo(), P = pltGeo()
  const rbcMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#c62a32', roughness: 0.35, clearcoat: 0.6, transparent: true }), [])
  rbcMat.opacity = dim('rbc'); rbcMat.depthWrite = dim('rbc') > 0.5
  rbcMat.emissive.set(focus === 'rbc' ? '#5a0d10' : '#000000')
  return <group position={at}>
    {/* 背板：深色圆盘，一圈金属边，下面一根立杆 */}
    <mesh position={[0, 0, -0.06]} rotation-x={Math.PI / 2} geometry={useMemo(() => disc(R + 0.08, 0.06, { chamfer: 0.015, segs: 64 }), [R])} castShadow><meshStandardMaterial color="#14181c" roughness={0.6} /></mesh>
    <mesh position={[0, 0, -0.01]}><torusGeometry args={[R + 0.06, 0.03, 12, 96]} /><Metal kind="aluminum" grain="turned" /></mesh>
    <mesh position={[0, -R - 0.9, -0.1]} castShadow><cylinderGeometry args={[0.04, 0.05, 1.8, 16]} /><Metal kind="stainless" grain="brushed" /></mesh>
    {/* 血浆：淡黄的一层，透明 */}
    <mesh position={[0, 0, 0.2]} rotation-x={Math.PI / 2} renderOrder={2}><cylinderGeometry args={[R, R, 0.36, 64]} /><meshPhysicalMaterial color="#f3d98a" transparent opacity={focus === 'plasma' ? 0.42 : 0.14} roughness={0.1} depthWrite={false} emissive={focus === 'plasma' ? '#6a5212' : '#000000'} /></mesh>
    <group ref={drift}>
      <instancedMesh ref={mesh} args={[rbcG, rbcMat, g.rbc.length]} castShadow />
      {g.wbc.map((w, i) => <group key={i} position={w.p} scale={w.s} rotation-z={i * 1.7}>
        <mesh geometry={W.cell} renderOrder={3}><meshPhysicalMaterial color="#c9b6dc" transparent opacity={0.32 * dim('wbc')} roughness={0.35} clearcoat={0.5} depthWrite={false} emissive={focus === 'wbc' ? '#2d1d40' : '#000000'} /></mesh>
        <mesh geometry={W.nuc} renderOrder={2}><meshPhysicalMaterial color="#4a2a7a" roughness={0.45} transparent opacity={dim('wbc')} emissive={focus === 'wbc' ? '#24103c' : '#000000'} /></mesh>
      </group>)}
      {g.plt.map((p, i) => <mesh key={i} geometry={P} position={p.p} rotation={[p.r, p.r * 0.6, p.r * 1.3]} scale={p.s * (focus === 'plt' ? 1.25 : 1)}><meshStandardMaterial color="#c9a7c9" roughness={0.6} transparent opacity={dim('plt')} emissive={focus === 'plt' ? '#6a3a6a' : '#000000'} /></mesh>)}
    </group>
  </group>
}

// ---------- 第 2 课：三段放大、纵向剖开的血管 ----------
/** 三种血管的尺寸（画面单位，放大的示意）：外半径、内半径；毛细血管另外放大 */
export const VES: Record<VesselKey, { R: number; r: number; len: number; z: number; flat?: number }> = {
  artery: { R: 0.46, r: 0.2, len: 4.4, z: 0 },
  vein: { R: 0.5, r: 0.43, len: 4.4, z: 1.45, flat: 0.74 },
  capillary: { R: 0.15, r: 0.115, len: 4.4, z: 2.8 },
}
/** 管壁的剖面：从里到外几层的颜色（动脉三层：内膜、中膜的平滑肌和弹性纤维、外膜） */
const LAYERS_OF: Record<VesselKey, [number, string][]> = {
  artery: [[0.08, '#f2dcd4'], [0.7, '#c9606a'], [1, '#e6cf9c']],
  vein: [[0.18, '#eedad6'], [0.55, '#b36b86'], [1, '#d9c4a0']],
  capillary: [[1, '#efc9c9']],
}
function stripTex(v: VesselKey) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128
  const g = c.getContext('2d')!; let y0 = 0
  for (const [f, col] of LAYERS_OF[v]) { g.fillStyle = col; g.fillRect(0, y0, 4, f * 128 - y0); y0 = f * 128 }
  for (let i = 0; i < 128; i += 9) { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, i, 4, 1) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
/** 管子表面的颜色：外膜湿润的结缔组织，一块块深浅不一（动脉、静脉）；或者一层扁平的上皮细胞（毛细血管） */
function skinTex(v: VesselKey) {
  const S = 256, c = document.createElement('canvas'); c.width = S * 2; c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = v === 'artery' ? '#c25560' : v === 'vein' ? '#3b4f92' : '#d78b8f'; g.fillRect(0, 0, S * 2, S)
  let sd = v.length * 13; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  if (v === 'capillary') {
    // 一块块扁平的上皮细胞，边界细线，中间一个核
    for (let i = 0; i < 26; i++) { const x = (i % 13) * (S * 2 / 13) + rnd() * 12, y = Math.floor(i / 13) * (S / 2) + rnd() * 20; g.strokeStyle = 'rgba(120,40,50,0.5)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x + 20, y + 60, 36, 58, 0, 0, Math.PI * 2); g.stroke(); g.fillStyle = 'rgba(110,50,90,0.5)'; g.beginPath(); g.ellipse(x + 20, y + 60, 9, 15, 0, 0, Math.PI * 2); g.fill() }
  } else {
    // 柔和的斑块：组织的深浅；再加极淡的纵向纤维
    const light = v === 'artery' ? '236,170,170' : '120,140,200', dark = v === 'artery' ? '110,25,40' : '20,28,70'
    for (let i = 0; i < 160; i++) {
      const x = rnd() * S * 2, y = rnd() * S, r = 10 + rnd() * 34, col = rnd() < 0.5 ? light : dark
      for (const ox of [-S * 2, 0, S * 2]) for (const oy of [-S, 0, S]) { const q = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); q.addColorStop(0, `rgba(${col},0.16)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2) }
    }
    for (let i = 0; i < 260; i++) { const x = rnd() * S * 2, y = rnd() * S; g.strokeStyle = `rgba(${rnd() < 0.5 ? light : dark},0.05)`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + rnd() * 30, y + (rnd() - 0.5) * 3); g.stroke() }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); t.anisotropy = 8; return t
}
/** 表面的细微起伏（凹凸贴图）：小颗粒加柔和的鼓包 */
function bumpTex(seed: number) {
  const S = 256, c = document.createElement('canvas'); c.width = S * 2; c.height = S
  const g = c.getContext('2d')!; g.fillStyle = '#808080'; g.fillRect(0, 0, S * 2, S)
  let sd = seed; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 220; i++) { const x = rnd() * S * 2, y = rnd() * S, r = 6 + rnd() * 22, w = rnd() < 0.5 ? '255,255,255' : '0,0,0'; const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(${w},0.22)`); q.addColorStop(1, `rgba(${w},0)`); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},0.12)`; g.fillRect(rnd() * S * 2, rnd() * S, 1.5, 1.5) }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); return t
}
/** 外膜上自己的细小血管（滋养血管）：几条贴着管壁弯弯曲曲走的细管，各分出一两个小枝 */
function vasaGeo(R: number, len: number, seed: number) {
  let sd = seed; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  const geos: THREE.BufferGeometry[] = []
  const on = (x: number, th: number, lift = 0.012) => new THREE.Vector3(x, Math.cos(th) * (R + lift), Math.sin(th) * (R + lift))
  for (let k = 0; k < 3; k++) {
    const th0 = rnd() * Math.PI * 2, x0 = -len / 2 + rnd() * len * 0.3, pts: THREE.Vector3[] = []
    for (let i = 0; i <= 14; i++) { const x = x0 + i * len * 0.05; if (x > len / 2 - 0.05) break; pts.push(on(x, th0 + 0.35 * Math.sin(i * 0.9 + k) + i * 0.04)) }
    if (pts.length < 4) continue
    geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 4, 0.013, 5))
    for (let b = 0; b < 2; b++) {
      const i0 = 2 + Math.floor(rnd() * (pts.length - 3)), p = pts[i0], th = Math.atan2(p.z, p.y), sgn = rnd() < 0.5 ? -1 : 1, br: THREE.Vector3[] = []
      for (let j = 0; j <= 5; j++) br.push(on(p.x + j * 0.05, th + sgn * j * 0.12))
      geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(br), 12, 0.008, 4))
    }
  }
  return mergeGeometries(geos)
}
/** 静脉瓣的一片：从管壁伸出来的薄片，顺着血流方向（+x）斜着。open 0–1 */
function Cusp({ R, side, open, clip }: { R: number; side: 1 | -1; open: () => number; clip: THREE.Plane[] }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(R * 1.05, R * 1.7, 8, 10), p = g.attributes.position
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + R * 0.525, z = p.getY(i), q = z / (R * 0.85); p.setXYZ(i, x, 0.16 * R * Math.sin(Math.PI * x / (R * 1.05)) * (1 - q * q), z * Math.sqrt(Math.max(0, 1 - (x / (R * 1.3)) ** 2 * 0.3))) }
    g.computeVertexNormals(); return g
  }, [R])
  const ref = useRef<THREE.Group>(null), cur = useRef(open())
  useFrame((_, dt) => { cur.current += (open() - cur.current) * (1 - Math.exp(-Math.min(dt, 1 / 30) / 0.12)); if (ref.current) ref.current.rotation.z = side * (-(Math.PI / 2 - 0.42) * (1 - cur.current) - 0.12 * cur.current) })
  return <group position={[0, side * R * 0.98, 0]}><group ref={ref}><mesh geometry={geo} scale={[1, side, 1]}><meshPhysicalMaterial color="#e8d2dc" roughness={0.45} clearcoat={0.4} side={THREE.DoubleSide} transparent opacity={0.92} clippingPlanes={clip} /></mesh></group></group>
}
/**
 * 一段血管：横躺着（沿 x），血流向 +x。cut：剖开（前半边拿掉，剖面朝镜头）；hl：亮起来；reverse：血往回流（静脉瓣合上）
 * rows 里的红细胞按 physics 里的相对速度走；动脉里一冲一冲
 */
export function VesselSeg({ kind, at, cut, hl, reverse = false }: { kind: VesselKey; at: V3; cut: number; hl: boolean; reverse?: boolean }) {
  const v = VES[kind], { len } = v
  const gl = useThree(s => s.gl)
  const root = useRef<THREE.Group>(null)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), [])
  const clip = useMemo(() => [plane], [plane])
  const geo = useMemo(() => {
    const curve = new THREE.LineCurve3(new THREE.Vector3(-len / 2, 0, 0), new THREE.Vector3(len / 2, 0, 0))
    const tube = hollowTube(curve, v.R, v.R - v.r, 2, 64)
    // 剖面上的两条管壁：上下各一块，贴着层次的颜色
    const strip = new THREE.PlaneGeometry(len, v.R - v.r, 1, 1)
    return { tube, strip, strips: stripTex(kind), skin: skinTex(kind), bump: bumpTex(kind.length * 31 + 7), vasa: kind === 'capillary' ? null : vasaGeo(v.R, len, kind.length * 17 + 3) }
  }, [kind, len, v.R, v.r])
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  const front = useRef<THREE.Group>(null)
  const fPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
  // 湿润的组织：表面一层清漆样的高光，细微起伏，带一点绒感；静脉壁薄，透出一点里面的血
  const wet = (planes: THREE.Plane[], transparent: boolean) => new THREE.MeshPhysicalMaterial({ map: geo.skin, bumpMap: geo.bump, bumpScale: 1.4, roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.32, envMapIntensity: 0.6, sheen: 0.5, sheenColor: new THREE.Color(kind === 'vein' ? '#8fa6ff' : '#ffb0b0'), sheenRoughness: 0.5, side: THREE.DoubleSide, clippingPlanes: planes, transparent: transparent || kind === 'vein', opacity: kind === 'vein' ? 0.86 : 1 })
  const skinMat = useMemo(() => wet(clip, false), [geo, clip])   // eslint-disable-line react-hooks/exhaustive-deps
  const frontMat = useMemo(() => wet([fPlane], true), [geo, fPlane])   // eslint-disable-line react-hooks/exhaustive-deps
  const vasaMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#9a1c28', roughness: 0.35, clearcoat: 0.8, clippingPlanes: clip }), [clip])
  useFrame(() => {
    if (!root.current) return
    root.current.updateMatrixWorld()
    plane.set(new THREE.Vector3(0, 0, -1), 0).applyMatrix4(root.current.matrixWorld)
    if (cut < 0.001) plane.constant += 100     // 没剖开：剖切面推到很远，整根管子都画
    const f = front.current
    if (f) {
      const e = cut * cut * (3 - 2 * cut); f.position.set(0, 0.9 * e, 1.6 * e); f.visible = cut > 0.001 && cut < 0.99
      f.updateMatrixWorld(); fPlane.set(new THREE.Vector3(0, 0, 1), 0).applyMatrix4(f.matrixWorld); frontMat.opacity = (kind === 'vein' ? 0.86 : 1) * (1 - e)
    }
  })
  skinMat.emissive.set(hl ? '#4a3010' : '#000000')
  const sy = v.flat ?? 1
  return <group position={at}>
    <group ref={root} scale={[1, sy, 1]}>
      <mesh geometry={geo.tube} material={skinMat} castShadow />
      {geo.vasa && <mesh geometry={geo.vasa} material={vasaMat} />}
      {/* 剖面：上下两条管壁的切口 */}
      {cut > 0.001 && [1, -1].map(s => <mesh key={s} geometry={geo.strip} position={[0, s * (v.r + (v.R - v.r) / 2), 0.002]} rotation-z={s < 0 ? Math.PI : 0}><meshStandardMaterial map={geo.strips} roughness={0.7} /></mesh>)}
      {/* 静脉瓣：两对 */}
      {kind === 'vein' && cut > 0.001 && [-0.9, 1.0].map(x => <group key={x} position={[x, 0, 0]}>{([1, -1] as const).map(s => <Cusp key={s} R={v.r} side={s} open={() => (reverse ? 0 : 1)} clip={cut > 0.001 ? clip : []} />)}</group>)}
      <Cells kind={kind} reverse={reverse} />
    </group>
    {/* 拿开的前半边 */}
    <group ref={front} scale={[1, sy, 1]}><mesh geometry={geo.tube} material={frontMat} /></group>
  </group>
}
/** 一段血管里流着的红细胞 */
function Cells({ kind, reverse }: { kind: VesselKey; reverse: boolean }) {
  const v = VES[kind], n = kind === 'capillary' ? 16 : kind === 'artery' ? 70 : 90
  const rbc = useMemo(() => rbcGeo(kind === 'capillary' ? 0.2 : 0.17), [kind])
  const mesh = useRef<THREE.InstancedMesh>(null)
  const st = useMemo(() => { let sd = kind.length * 7 + 1; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; return Array.from({ length: n }, (_, i) => ({ x: (i / n) * v.len - v.len / 2, y: kind === 'capillary' ? 0 : (rnd() * 2 - 1) * v.r * 0.75, z: kind === 'capillary' ? -0.02 : -rnd() * v.r * 0.75, a: rnd() * 6, b: rnd() * 6 })) }, [kind, n, v.len, v.r])
  const col = kind === 'vein' ? BLUE : RED
  useFrame((s, dt0) => {
    const dt = Math.min(dt0, 1 / 30), t = s.clock.elapsedTime, m = mesh.current; if (!m) return
    const pulse = kind === 'artery' ? 0.35 + 1.4 * Math.max(0, Math.sin(t * Math.PI * 2 / 0.8)) ** 3 : 1
    const sp = speedOf(kind) * 1.4 * pulse
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3()
    st.forEach((c, i) => {
      if (reverse && kind === 'vein') {
        // 往回流：被合上的静脉瓣挡住，堆在瓣膜后面
        const nx = c.x - 0.35 * dt, stop = [-0.9, 1.0].find(x => c.x > x + 0.08 && nx <= x + 0.08 + (i % 5) * 0.05)
        c.x = stop !== undefined ? c.x : nx < -v.len / 2 ? -v.len / 2 : nx
      } else c.x += sp * dt
      if (c.x > v.len / 2) c.x -= v.len
      const wob = kind === 'capillary' ? 0 : 0.02 * Math.sin(t * 1.3 + i)
      p.set(c.x, c.y + wob, c.z)
      q.setFromEuler(e.set(kind === 'capillary' ? 0 : c.a + t * 0.3, kind === 'capillary' ? 0 : c.b, kind === 'capillary' ? Math.PI / 2 : 0))
      // 毛细血管里挤得变形：沿流向压扁一点
      sc.set(kind === 'capillary' ? 0.8 : 1, 1, kind === 'capillary' ? 0.8 : 1)
      m.setMatrixAt(i, M.compose(p, q, sc))
    })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[rbc, undefined, n]} frustumCulled={false}><meshPhysicalMaterial color={col} roughness={0.35} clearcoat={0.5} /></instancedMesh>
}
/** 血流方向的箭头：一条细杆加箭头，平躺在管子后面的台面上 */
export function FlowArrow({ at, len, color = '#e8e2d6' }: { at: V3; len: number; color?: string }) {
  return <group position={at}>
    <mesh rotation-z={-Math.PI / 2} position={[0, 0, 0]}><cylinderGeometry args={[0.018, 0.018, len, 8]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
    <mesh rotation-z={-Math.PI / 2} position={[len / 2 + 0.06, 0, 0]}><coneGeometry args={[0.06, 0.14, 14]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
  </group>
}
