// 光反应和暗反应 · 再放大的一处（第 4–6 课）：一摞类囊体朝镜头剖开的一角，和它右边的叶绿体基质。
// 类囊体薄膜有厚度（剖面上看得见两排磷脂的“头”），膜上嵌着光系统Ⅱ、光系统Ⅰ和 ATP 合酶；中间那层往右伸出去，是基质片层。
// 这里只放不动的结构和几样跟着课走的东西（光束、ATP 合酶的转动）；流动的分子在各课自己的场景里。坐标是这一处自己的，原点在最上面那层膜的剖面上。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rng, useLazy, type V3 } from './kit'
import { blobGeo, lobe } from './mol'

/** 各课写进来、这里每帧读的几个量：光照（0–1）、ATP 合酶转得多快 */
export const MACS = { lit: 0, spin: 0, hideAtp: false }
/** 三个膜蛋白的位置（x）和卡尔文循环那个圈的圆心、半径 */
export const X_PS2 = -27, X_PS1 = -18, X_ATP = -9
export const RING = { c: [10, 2.6, 3] as V3, r: 6.2 }
/** 圈上的一个点：角度按数学上的量法（上面是 90°，左边 180°） */
export const ringAt = (deg: number, k = 1): V3 => [RING.c[0] + Math.cos(deg * Math.PI / 180) * RING.r * k, RING.c[1] + Math.sin(deg * Math.PI / 180) * RING.r * k, RING.c[2]]
export const arc = (a0: number, a1: number, n = 14) => Array.from({ length: n + 1 }, (_, i) => ringAt(a0 + (a1 - a0) * i / n))
/** 各种分子走的路 */
export const PATH = {
  waterIn: [[-35.5, -2.2, 0.9], [-32, -2.7, 0.9], [-28.4, -2.9, 0.9]] as V3[],
  o2Out: [[-27, -3.1, 1.0], [-29.2, -3.3, 2.6], [-31.2, 0.5, 4.5], [-30.4, 6.4, 5.5]] as V3[],
  hLumen: [[-26, -2.5, 0.9], [-21, -3.0, 0.9], [-14, -2.8, 0.9], [-9.6, -2.6, 0.9]] as V3[],
  hUp: [[-9, -2.6, 1.5], [-9, -0.6, 1.6], [-9, 1.4, 1.6], [-7.2, 2.0, 1.6], [-5.6, 1.6, 1.6]] as V3[],
  eHop: [[-27, -0.15, 0.5], [-24.6, 0.25, 0.5], [-22.4, -0.25, 0.5], [-20.2, 0.2, 0.5], [-18, 0.4, 0.5], [-18, 2.4, 0.5]] as V3[],
  nadpIn: [[-11, 9.5, 1.6], [-13.8, 6.2, 1.3], [-16.9, 3.9, 0.9]] as V3[],
  nadphOut: [[-19.2, 3.9, 0.9], [-21.8, 6.4, 1.6], [-21, 10.5, 2.4]] as V3[],
  adpIn: [[-1, 9.5, 1.6], [-4.6, 7.2, 1.3], [-7.9, 5.7, 0.8]] as V3[],
  atpOut: [[-10, 5.8, 0.8], [-12.4, 8, 1.6], [-11.4, 11, 2.4]] as V3[],
  co2In: [[16.2, 12.6, 3], [13.2, 11.9, 3], [10.9, 10.3, 3]] as V3[],
  sugarOut: [ringAt(270), [12.8, -4.7, 3.4], [15.6, -4.4, 3.8], [17.0, -3.4, 4]] as V3[],
  toStroma: [[-8.6, 5.4, 1.2], [-4, 6.3, 2.4], [0.6, 5.0, 3], [3.9, 3.4, 3]] as V3[],
  toThylakoid: [[4.2, 1.2, 3], [0.6, 0.9, 3.1], [-3.2, 2.2, 2.4], [-7.2, 3.6, 1.4]] as V3[],
}
/** 攒葡萄糖的地方 */
export const TRAY: V3 = [17.6, -2.2, 4]

// ---------- 类囊体的剖面 ----------
const TH = { t: 1.4, h: 6, pitch: 6.5, depth: 24, x0: -56 }
const LAYERS = [{ top: 0.7, x1: -4 }, { top: 0.7 - TH.pitch, x1: 44 }, { top: 0.7 - TH.pitch * 2, x1: -6.5 }]
function outline(top: number, x1: number, inset: number) {
  const s = new THREE.Shape(), R = TH.h / 2 - inset, cy = top - TH.h / 2, x0 = TH.x0 + inset
  s.moveTo(x0, top - inset); s.lineTo(x1 - TH.h / 2, top - inset); s.absarc(x1 - TH.h / 2, cy, R, Math.PI / 2, -Math.PI / 2, true); s.lineTo(x0, top - TH.h + inset); s.closePath()
  return s
}
function membraneGeo(top: number, x1: number) {
  const s = outline(top, x1, 0); s.holes.push(outline(top, x1, TH.t))
  const g = new THREE.ExtrudeGeometry(s, { depth: TH.depth, bevelEnabled: false, curveSegments: 24 }); g.translate(0, 0, -TH.depth); return g
}
function lumenGeo(top: number, x1: number) { const g = new THREE.ExtrudeGeometry(outline(top, x1, TH.t), { depth: TH.depth - 0.4, bevelEnabled: false, curveSegments: 24 }); g.translate(0, 0, -TH.depth + 0.2); return g }
/** 磷脂的“头”：剖面上沿膜的里外两条边各一排，朝上的膜面上铺一层 */
function heads() {
  const out: V3[] = [], r = rng(7)
  for (const L of LAYERS) for (const inset of [0.12, TH.t - 0.12]) {
    const pts = outline(L.top, L.x1, inset).getSpacedPoints(Math.round((L.x1 - TH.x0) * 2 / 0.56 + 16))
    for (const p of pts) if (p.x > -50 && p.x < 36) out.push([p.x, p.y, 0.06])
  }
  const skip = (x: number, z: number) => [X_PS2, X_PS1].some(c => Math.hypot(x - c, z) < 2.3) || Math.hypot(x - X_ATP, z) < 1.5
  for (let x = -46; x < -4.2; x += 0.62) for (let z = -TH.depth + 0.4; z < -0.2; z += 0.62) { if (x > -7 && (x + 7) ** 2 > 7.4) continue; const px = x + (r() - 0.5) * 0.2, pz = z + (r() - 0.5) * 0.2; if (!skip(px, pz)) out.push([px, 0.7 - (x > -7 ? (x + 7) ** 2 * 0.17 : 0), pz]) }
  for (let x = -3.6; x < 34; x += 0.62) for (let z = -TH.depth + 0.4; z < -0.2; z += 0.62) out.push([x + (r() - 0.5) * 0.2, LAYERS[1].top, z + (r() - 0.5) * 0.2])
  return out
}
/** 远处别的基粒：一摞大圆饼，在雾里 */
function farStack(n: number) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, -2.6), new THREE.Vector2(23, -2.6)]
  for (let i = 1; i < 8; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI; pts.push(new THREE.Vector2(23 + Math.cos(a) * 2.6, Math.sin(a) * 2.6)) }
  pts.push(new THREE.Vector2(23, 2.6), new THREE.Vector2(0, 2.6))
  const one = new THREE.LatheGeometry(pts, 56)
  return Array.from({ length: n }, (_, i) => ({ g: one, y: (i - (n - 1) / 2) * 6.4 }))
}
const FAR: { p: V3; n: number }[] = [{ p: [-36, 5, -74], n: 5 }, { p: [22, -4, -62], n: 4 }, { p: [66, 6, -88], n: 6 }, { p: [-92, -2, -96], n: 5 }, { p: [112, -6, -70], n: 4 }]

// ---------- 膜上的蛋白质 ----------
const ps2Geo = () => blobGeo(v => 1 + lobe(v, [0, -1, 0], 0.5, 0.32) + lobe(v, [0.9, 0.3, 0], 0.3, 0.12) + lobe(v, [-0.9, 0.2, 0], 0.3, 0.14), { amp: 0.1, freq: 2.6, seed: 3, color: '#1f9a62', flat: 0.02, cut: '#2fae74' })
const ps1Geo = () => blobGeo(v => 1 + lobe(v, [0, 1, 0], 0.5, 0.3) + lobe(v, [0.85, -0.2, 0], 0.3, 0.14) + lobe(v, [-0.85, -0.1, 0], 0.3, 0.12), { amp: 0.1, freq: 2.6, seed: 8, color: '#2b86bd', flat: 0.02, cut: '#3a9ad2' })
/** 色素分子：蛋白质剖面上的一圈小绿点，照光时发亮 */
const PIGS: V3[] = [[0, 0, 0], [0.9, 0.3, 0], [-0.9, 0.25, 0], [0.5, -0.6, 0], [-0.5, -0.55, 0], [0.2, 0.75, 0], [-0.4, 0.7, 0], [1.2, -0.3, 0], [-1.25, -0.25, 0]]
function Photosystem({ x, y, two }: { x: number; y: number; two: boolean }) {
  const geo = useLazy(two ? 'mac-ps2' : 'mac-ps1', two ? ps2Geo : ps1Geo)
  const pm = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3ddc5a', emissive: '#a8ff5a', emissiveIntensity: 0.25, roughness: 0.4 }), [])
  useFrame(({ clock }) => { pm.emissiveIntensity = 0.25 + MACS.lit * (1.5 + 0.5 * Math.sin(clock.elapsedTime * 5 + x)) })
  return <group position={[x, y, 0]}>
    {geo && <mesh geometry={geo} scale={[2.3, 2.3, 2.3]}><meshStandardMaterial vertexColors roughness={0.62} emissive={two ? '#06301c' : '#082a40'} emissiveIntensity={0.5} /></mesh>}
    {PIGS.map((p, i) => <mesh key={i} position={[p[0] * 1.25, p[1] * 1.25 + (two ? -0.1 : 0.1), 0.12]} scale={[1, 1, 0.5]} material={pm}><sphereGeometry args={[0.2, 12, 8]} /></mesh>)}
  </group>
}
/** ATP 合酶：嵌在膜里的转子、中间的轴、伸进基质的头部 */
function ATPSynthase() {
  const rot = useRef<THREE.Group>(null), all = useRef<THREE.Group>(null)
  useFrame((_, d) => { if (rot.current) rot.current.rotation.y += MACS.spin * Math.min(d, 1 / 30); if (all.current) all.current.visible = !MACS.hideAtp })
  const head = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ a: i / 6 * Math.PI * 2, c: i % 2 ? '#f3cf86' : '#e59a34' })), [])
  return <group ref={all} position={[X_ATP, 0, 0.1]}>
    {/* 嵌在膜里的转子：一圈亚基；连着中间的轴，一起转 */}
    <group ref={rot}>
      {Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95]}><capsuleGeometry args={[0.3, 1.25, 4, 10]} /><meshStandardMaterial color={i % 2 ? '#d9813a' : '#c46e2c'} roughness={0.5} emissive="#3a1806" emissiveIntensity={0.5} /></mesh> })}
      <mesh position={[0, 1.7, 0]}><capsuleGeometry args={[0.34, 2.4, 4, 12]} /><meshStandardMaterial color="#f0c98a" roughness={0.5} /></mesh>
      <mesh position={[0.3, 2.6, 0]} rotation-z={0.5}><capsuleGeometry args={[0.24, 0.5, 4, 10]} /><meshStandardMaterial color="#f0c98a" roughness={0.5} /></mesh>
    </group>
    {/* 伸进基质的头部：六瓣，ATP 在这里合成；旁边一根固定它的臂 */}
    {head.map((h, i) => <mesh key={i} position={[Math.cos(h.a) * 0.85, 3.9, Math.sin(h.a) * 0.85]} scale={[0.95, 1.35, 0.95]}><sphereGeometry args={[0.82, 20, 14]} /><meshPhysicalMaterial color={h.c} roughness={0.45} sheen={0.6} sheenColor="#fff4d8" emissive="#3a2206" emissiveIntensity={0.5} /></mesh>)}
    <mesh position={[1.85, 2.2, -0.3]} rotation-z={-0.05}><capsuleGeometry args={[0.2, 4.2, 4, 10]} /><meshStandardMaterial color="#a8642c" roughness={0.6} /></mesh>
    <mesh position={[1.3, 4.6, -0.3]} rotation-z={Math.PI / 2 - 0.3}><capsuleGeometry args={[0.2, 0.9, 4, 10]} /><meshStandardMaterial color="#a8642c" roughness={0.6} /></mesh>
  </group>
}
/** 一束照在光系统上的光：黄色，从左上方斜着下来 */
function Beam({ x, y }: { x: number; y: number }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null), k = useRef(0)
  const { pos, quat, len } = useMemo(() => { const a = new THREE.Vector3(x - 7, 15, 5), b = new THREE.Vector3(x, y, 0.4), d = b.clone().sub(a); return { pos: a.clone().lerp(b, 0.5), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), len: d.length() } }, [x, y])
  useFrame(({ clock }, d) => { k.current += (MACS.lit - k.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.25)); if (mat.current) mat.current.opacity = k.current * (0.2 + 0.04 * Math.sin(clock.elapsedTime * 6 + x)) })
  return <mesh position={pos} quaternion={quat} renderOrder={9}><cylinderGeometry args={[1.5, 1.0, len, 24, 1, true]} /><meshBasicMaterial ref={mat} color="#ffd83a" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} /></mesh>
}

/** 第 4–6 课那一处不动的东西 */
export function MacroWorld() {
  const mem = useLazy('mac-mem', () => LAYERS.map(L => membraneGeo(L.top, L.x1))), lum = useLazy('mac-lum', () => LAYERS.map(L => lumenGeo(L.top, L.x1)))
  const side = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#2f8a3e', roughness: 0.55, sheen: 0.8, sheenColor: new THREE.Color('#d8ffb8'), emissive: '#0b2a10', emissiveIntensity: 0.6 }), [])
  const cap = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8c36e', roughness: 0.7, emissive: '#3a3010', emissiveIntensity: 0.45 }), [])
  const beads = useLazy('mac-heads', () => {
    const list = heads(), m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshStandardMaterial({ color: '#5fbf52', roughness: 0.45, emissive: '#123a10', emissiveIntensity: 0.5 }), list.length), M4 = new THREE.Matrix4()
    list.forEach((p, i) => { M4.makeTranslation(...p); m.setMatrixAt(i, M4) }); return m
  })
  const far = useMemo(() => FAR.map(f => farStack(f.n)), [])
  return <group>
    {mem?.map((g, i) => <mesh key={i} geometry={g} material={[cap, side]} receiveShadow />)}
    {lum?.map((g, i) => <mesh key={i} geometry={g} renderOrder={2}><meshStandardMaterial color="#3f9fb8" transparent opacity={0.1} roughness={0.6} depthWrite={false} /></mesh>)}
    {beads && <primitive object={beads} />}
    <Photosystem x={X_PS2} y={-0.3} two />
    <Photosystem x={X_PS1} y={0.3} two={false} />
    <ATPSynthase />
    <Beam x={X_PS2} y={1.6} /><Beam x={X_PS1} y={2.4} />
    {FAR.map((f, i) => <group key={i} position={f.p}>{far[i].map((d, k) => <mesh key={k} geometry={d.g} position-y={d.y}><meshStandardMaterial color={k % 2 ? '#1f6a30' : '#1a5c2a'} roughness={0.7} emissive="#07200c" emissiveIntensity={0.7} /></mesh>)}</group>)}
    <pointLight position={[-20, 12, 16]} intensity={520} distance={70} decay={2} color="#fff6d8" />
    <pointLight position={[10, 10, 18]} intensity={420} distance={70} decay={2} color="#e0fff0" />
    <pointLight position={[-4, -4, 14]} intensity={160} distance={50} decay={2} color="#c8f0ff" />
  </group>
}
