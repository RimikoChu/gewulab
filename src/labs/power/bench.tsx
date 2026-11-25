// 电工值班室工作台上的实验器材：学生电源、单刀开关、滑动变阻器、电流表、电压表、灯座和小灯泡、焦耳定律的两只烧瓶，以及导线。
// 全部按厘米写（外面套 Cm），原点在器材的底面正中，正面朝 +z。每样器材导出接线柱的位置，导线从那里接。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Led, Metal, lathe, shell, type RY } from '@/lab-kit'
import { FONT, makeText } from './mats'
import type { P3 } from './home'

export const add = (a: P3, b: P3): P3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const RED = '#c4302a', BLACK = '#1c1d1f'

// ---------- 接线柱 ----------
const CAP = lathe([[0, 0.5], [0.45, 0.5], [0.52, 0.6], [0.52, 1.2], [0.45, 1.3], [0, 1.32]], { segs: 20, crease: 40 })
const NUT = (() => { const g = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 6); g.translate(0, 0.15, 0); return g })()
export function Post({ at, color = BLACK }: { at: P3; color?: string }) {
  return <group position={at}>
    <mesh geometry={NUT} castShadow><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.17, 0.17, 0.4, 10]} /><Metal kind="brass" /></mesh>
    <mesh geometry={CAP} castShadow><meshPhysicalMaterial color={color} roughness={0.32} clearcoat={0.5} /></mesh>
  </group>
}

// ---------- 导线 ----------
/** 一根实验导线：从 a 到 b 拱起一道弯，via 是中途贴着台面经过的点。flow：电流（A），有电流时一串亮点沿线走 */
export function Wire({ a, b, color, via = [], lift = 1.6, flow = 0 }: { a: P3; b: P3; color: string; via?: P3[]; lift?: number; flow?: number }) {
  const { geo, curve, len } = useMemo(() => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b)
    const pts = [A, A.clone().add(new THREE.Vector3(0, lift, 0)), ...via.map(v => new THREE.Vector3(...v)), B.clone().add(new THREE.Vector3(0, lift, 0)), B]
    if (!via.length) pts.splice(2, 0, A.clone().lerp(B, 0.5).setY(Math.max(a[1], b[1]) + lift * 0.8 + A.distanceTo(B) * 0.04))
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
    return { curve, len: curve.getLength(), geo: new THREE.TubeGeometry(curve, 64, 0.17, 8, false) }
  }, [JSON.stringify([a, b, via, lift])])   // eslint-disable-line react-hooks/exhaustive-deps
  return <group>
    <mesh geometry={geo} castShadow><meshPhysicalMaterial color={color} roughness={0.38} clearcoat={0.4} /></mesh>
    {Math.abs(flow) > 1e-6 && <Flow curve={curve} len={len} flow={flow} />}
  </group>
}
const DOT = new THREE.SphereGeometry(0.22, 10, 8)
/** 沿导线走的亮点：每 2.6 cm 一个，电流越大走得越快 */
export function Flow({ curve, len, flow, size = 1, max = 2 }: { curve: THREE.Curve<THREE.Vector3>; len: number; flow: number; size?: number; max?: number }) {
  const n = Math.max(2, Math.round(len / (2.6 * size))), ref = useRef<THREE.InstancedMesh>(null), ph = useRef(0)
  const m = useMemo(() => new THREE.Matrix4(), []), p = useMemo(() => new THREE.Vector3(), [])
  const speed = Math.sign(flow) * (3 + Math.min(1, Math.abs(flow) / max) * 22) * size
  useFrame((_, d) => {
    const im = ref.current; if (!im) return
    ph.current = (ph.current + Math.min(d, 1 / 30) * speed / len + 1) % 1
    for (let i = 0; i < n; i++) { const u = (ph.current + i / n) % 1; curve.getPointAt(u, p); const s = Math.min(1, u * 8, (1 - u) * 8) * size; m.makeScale(s, s, s).setPosition(p); im.setMatrixAt(i, m) }
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[DOT, undefined, n]} frustumCulled={false}><meshBasicMaterial color="#ffe27a" toneMapped={false} /></instancedMesh>
}

// ---------- 学生电源 ----------
/** 学生电源：浅灰机壳 22 × 10 × 16 cm，前面板上一块电压显示屏、调压旋钮、电源开关，右下一对输出接线柱 */
export const SUP = { w: 22, h: 10, d: 16 }
export const supPosts = (): { plus: P3; minus: P3 } => ({ plus: [5, 1.6, SUP.d / 2 + 1.2], minus: [8.6, 1.6, SUP.d / 2 + 1.2] })
export function Supply({ u, on }: { u: number; on: boolean }) {
  const { w, h, d } = SUP
  const name = useMemo(() => makeText(['学生电源'], { w: 256, h: 64, bg: '#2a2e33', fg: '#d9dde0', size: 36 }), [])
  const P = supPosts()
  return <group>
    <RoundedBox args={[w, h, d]} radius={0.6} smoothness={3} position={[0, h / 2 + 0.5, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#cfd1cd" roughness={0.42} clearcoat={0.45} /></RoundedBox>
    <RoundedBox args={[w - 1.2, h - 1.2, 0.4]} radius={0.2} smoothness={2} position={[0, h / 2 + 0.5, d / 2 + 0.05]}><meshPhysicalMaterial color="#2a2e33" roughness={0.5} clearcoat={0.3} /></RoundedBox>
    <mesh position={[-5, h - 0.8, d / 2 + 0.27]}><planeGeometry args={[6, 1.5]} /><meshStandardMaterial map={name} roughness={0.6} /></mesh>
    <RoundedBox args={[8, 3.2, 0.3]} radius={0.15} smoothness={2} position={[-5, h / 2 + 0.9, d / 2 + 0.3]}><meshStandardMaterial color="#0d0f10" roughness={0.3} /></RoundedBox>
    <Led text={on ? u.toFixed(1) : ''} w={6.6} h={2.4} position={[-5, h / 2 + 0.9, d / 2 + 0.47]} />
    <group position={[5.6, h / 2 + 1.6, d / 2 + 0.25]} rotation-x={Math.PI / 2}>
      <mesh castShadow><cylinderGeometry args={[1.3, 1.35, 1.6, 30]} /><meshPhysicalMaterial color="#17181a" roughness={0.35} clearcoat={0.6} /></mesh>
      <mesh position={[0, 0.82, -0.7]}><boxGeometry args={[0.16, 0.02, 0.9]} /><meshBasicMaterial color="#f2f2ea" /></mesh>
    </group>
    <RoundedBox args={[2.4, 1.6, 0.5]} radius={0.12} smoothness={2} position={[-8.4, 2.4, d / 2 + 0.3]}><meshStandardMaterial color="#c3332a" roughness={0.4} /></RoundedBox>
    <Post at={[P.plus[0], P.plus[1] - 1.2, P.plus[2] - 1.2]} color={RED} />
    <Post at={[P.minus[0], P.minus[1] - 1.2, P.minus[2] - 1.2]} />
    {/* 接线柱伸在前面一条台阶上 */}
    <RoundedBox args={[7, 1.2, 2.6]} radius={0.3} smoothness={2} position={[6.8, 0.6, d / 2 + 1.2]} castShadow><meshPhysicalMaterial color="#2a2e33" roughness={0.5} /></RoundedBox>
  </group>
}

// ---------- 单刀开关 ----------
/** 胶木底座上的单刀开关：闸刀绕后面的铰链转，close 0–1；接线柱在两头 */
export const switchPosts = (): { a: P3; b: P3 } => ({ a: [-4.2, 1.0, 0], b: [4.2, 1.0, 0] })
export function KnifeSwitch({ close }: { close: number }) {
  const P = switchPosts()
  return <group>
    <RoundedBox args={[11, 1, 4.4]} radius={0.3} smoothness={2} position={[0, 0.5, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#5a2f22" roughness={0.4} clearcoat={0.5} /></RoundedBox>
    {[-2.6, 2.6].map(x => <mesh key={x} position={[x, 1.6, 0]}><boxGeometry args={[0.6, 1.4, 1.6]} /><Metal kind="copper" /></mesh>)}
    <group position={[-2.6, 2.1, 0]} rotation-z={(1 - close) * 1.1}>
      <mesh position={[2.9, 0, 0]}><boxGeometry args={[5.8, 0.25, 1]} /><Metal kind="copper" grain="brushed" /></mesh>
      <mesh position={[6.2, 0.6, 0]}><cylinderGeometry args={[0.4, 0.4, 1.6, 16]} /><meshPhysicalMaterial color="#141414" roughness={0.3} clearcoat={0.6} /></mesh>
    </group>
    <Post at={P.a} /><Post at={P.b} />
  </group>
}

// ---------- 滑动变阻器 ----------
/** 瓷管上密绕电阻丝，上面一根金属杆和滑片；接线柱：下面左端 lo、杆的右端 hi。p 是滑片位置（0 左、1 右，接入的阻值从左到滑片） */
export const RH = { len: 20, bar: 6.4 }
export const sliderX = (p: number) => -RH.len / 2 + 1 + p * (RH.len - 2)
export const rheoPosts = (): { lo: P3; hi: P3 } => ({ lo: [-RH.len / 2 - 1.4, 1.2, 1.8], hi: [RH.len / 2 + 1.4, RH.bar + 0.3, 0] })
export function Rheostat({ p }: { p: number }) {
  const coil = useMemo(() => { const c = document.createElement('canvas'); c.width = 512; c.height = 32; const g = c.getContext('2d')!; g.fillStyle = '#5d4a3a'; g.fillRect(0, 0, 512, 32); for (let i = 0; i < 512; i += 4) { g.fillStyle = '#b48a55'; g.fillRect(i, 0, 2.6, 32) } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(4, 1); return t }, [])
  const P = rheoPosts(), sx = sliderX(p)
  return <group>
    {[-1, 1].map(s => <group key={s} position={[s * (RH.len / 2 + 1.2), 0, 0]}>
      <RoundedBox args={[1.6, RH.bar + 0.4, 4]} radius={0.2} smoothness={2} position={[0, (RH.bar + 0.4) / 2, 0]} castShadow><meshPhysicalMaterial color="#20262c" roughness={0.4} clearcoat={0.4} /></RoundedBox>
    </group>)}
    <mesh position={[0, 3.2, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[1.7, 1.7, RH.len, 32]} /><meshStandardMaterial map={coil} roughness={0.5} metalness={0.4} /></mesh>
    <mesh position={[0, RH.bar, 0]} rotation-z={Math.PI / 2}><boxGeometry args={[0.7, RH.len + 2, 0.7]} /><Metal kind="brass" grain="brushed" /></mesh>
    <group position={[sx, RH.bar, 0]}>
      <RoundedBox args={[1.6, 1.4, 2.2]} radius={0.2} smoothness={2} castShadow><meshPhysicalMaterial color="#1c1d1f" roughness={0.35} clearcoat={0.5} /></RoundedBox>
      <mesh position={[0, -1.6, 0]}><boxGeometry args={[0.5, 1.8, 1.2]} /><Metal kind="copper" /></mesh>
    </group>
    <Post at={P.lo} /><Post at={P.hi} />
  </group>
}

// ---------- 电流表、电压表 ----------
function dial(kind: 'A' | 'V') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320; const g = c.getContext('2d')!
  g.fillStyle = '#f5f3ec'; g.fillRect(0, 0, 512, 320)
  const cx = 256, cy = 300, r1 = 250, r2 = 205, half = 46 * Math.PI / 180, a0 = -Math.PI / 2 - half, a1 = -Math.PI / 2 + half
  const at = (k: number, R: number): [number, number] => { const a = a0 + (a1 - a0) * k; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R] }
  g.strokeStyle = '#1b1d20'; g.lineWidth = 2
  for (const R of [r1, r2]) { g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke() }
  for (let i = 0; i <= 30; i++) { const k = i / 30, l = i % 10 ? (i % 5 ? 8 : 13) : 18; g.lineWidth = i % 10 ? 1.4 : 2.6; let [x0, y0] = at(k, r1), [x1, y1] = at(k, r1 + l); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();[x0, y0] = at(k, r2); [x1, y1] = at(k, r2 - l); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke() }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1b1d20'; g.font = `600 22px ${FONT}`
  const hi = kind === 'A' ? ['0', '1', '2', '3'] : ['0', '5', '10', '15'], lo = kind === 'A' ? ['0', '0.2', '0.4', '0.6'] : ['0', '1', '2', '3']
  hi.forEach((l, i) => { const [x, y] = at(i / 3, r1 + 34); g.fillText(l, x, y) })
  g.fillStyle = '#9c2a20'; lo.forEach((l, i) => { const [x, y] = at(i / 3, r2 - 32); g.fillText(l, x, y) })
  g.fillStyle = '#1b1d20'; g.font = '700 64px "Times New Roman",serif'; g.fillText(kind, cx, cy - 110)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
/** 三个接线柱：“−”、小量程、大量程 */
export const meterPosts = (): { neg: P3; lo: P3; hi: P3 } => ({ neg: [-3.6, 2.2, 3.4], lo: [0, 2.2, 3.4], hi: [3.6, 2.2, 3.4] })
/** 课堂上的指针式电表：深灰胶木外壳往后仰，表盘两排刻度。k：指针偏了满偏的几分之几（小量程），带阻尼 */
export function Meter({ kind, k }: { kind: 'A' | 'V'; k: number }) {
  const tex = useMemo(() => dial(kind), [kind])
  const marks = useMemo(() => makeText(kind === 'A' ? ['−    0.6    3'] : ['−    3    15'], { w: 512, h: 64, bg: '#232a31', fg: '#e9e6dc', size: 40 }), [kind])
  const needle = useRef<THREE.Group>(null), s = useRef({ x: 0, v: 0 }), goal = useRef(k); goal.current = k
  useFrame((_, d) => {
    const dt = Math.min(d, 1 / 30), q = s.current, w = 8.5, z = 0.36
    for (let i = 0; i < 4; i++) { const h = dt / 4, a = -w * w * (q.x - goal.current) - 2 * z * w * q.v; q.v += a * h; q.x += q.v * h }
    q.x = Math.max(-0.04, Math.min(1.06, q.x))
    if (needle.current) needle.current.rotation.z = -(-0.8 + 1.6 * q.x)
  })
  const bake = <meshPhysicalMaterial color="#26313b" roughness={0.36} clearcoat={0.55} clearcoatRoughness={0.3} />
  const P = meterPosts()
  return <group>
    <RoundedBox args={[12, 1.2, 9]} radius={0.3} smoothness={3} position={[0, 0.6, 0]} castShadow receiveShadow>{bake}</RoundedBox>
    <RoundedBox args={[11.4, 1.4, 2.6]} radius={0.3} smoothness={3} position={[0, 1.6, 3.4]} castShadow>{bake}</RoundedBox>
    <group position={[0, 1.2, -0.6]} rotation-x={-0.22}>
      <RoundedBox args={[12, 9.4, 3.6]} radius={0.6} smoothness={3} position={[0, 4.7, -1]} castShadow>{bake}</RoundedBox>
      <mesh position={[0, 5.3, 0.82]}><planeGeometry args={[10, 6.25]} /><meshStandardMaterial map={tex} roughness={0.5} /></mesh>
      <mesh position={[0, 5.3, 0.9]}><planeGeometry args={[10.2, 6.4]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.08} roughness={0.03} envMapIntensity={1.6} depthWrite={false} /></mesh>
      <group ref={needle} position={[0, 2.4, 0.86]}><mesh position={[0, 3.2, 0]}><boxGeometry args={[0.07, 6.2, 0.04]} /><meshBasicMaterial color="#111" /></mesh></group>
      <mesh position={[0, 2.4, 0.86]}><circleGeometry args={[0.45, 20]} /><meshStandardMaterial color="#1a1b1d" roughness={0.4} /></mesh>
    </group>
    <mesh position={[0, 2.31, 4.72]} rotation-x={-Math.PI / 2}><planeGeometry args={[10, 1.2]} /><meshStandardMaterial map={marks} roughness={0.6} /></mesh>
    <Post at={P.neg} /><Post at={P.lo} color={RED} /><Post at={P.hi} color={RED} />
  </group>
}

// ---------- 灯座和小灯泡 ----------
/** 灯座：小底板上一只螺口灯座，两只接线柱；小灯泡的钨丝随功率发光。b：亮度（0–1.4） */
export const bulbPosts = (): { a: P3; b: P3 } => ({ a: [-3, 1.1, 1.4], b: [3, 1.1, 1.4] })
export function Bulb({ b }: { b: number }) {
  const glass = useMemo(() => shell([[0, 0], [0.55, 0], [0.6, 0.4], [1.3, 1.4], [1.45, 2.4], [1.2, 3.3], [0.5, 3.75], [0, 3.8]].slice(1) as RY[], 0.06), [])
  const fil = useRef<THREE.MeshStandardMaterial>(null), k = useRef(0)
  useFrame((_, d) => { k.current += (b - k.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.12)); if (fil.current) fil.current.emissiveIntensity = Math.pow(k.current, 1.6) * 9 })
  const P = bulbPosts()
  return <group>
    <RoundedBox args={[9, 1, 5]} radius={0.3} smoothness={2} position={[0, 0.5, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#e7e5de" roughness={0.4} clearcoat={0.4} /></RoundedBox>
    <mesh position={[0, 1.9, 0]}><cylinderGeometry args={[1.25, 1.4, 1.8, 24]} /><meshPhysicalMaterial color="#141414" roughness={0.35} clearcoat={0.5} /></mesh>
    <mesh position={[0, 3.3, 0]}><cylinderGeometry args={[0.62, 0.62, 1.2, 20]} /><Metal kind="aluminum" grain="turned" /></mesh>
    <group position={[0, 3.8, 0]}>
      <mesh geometry={glass}><meshPhysicalMaterial color="#ffffff" transparent opacity={0.18} roughness={0.03} envMapIntensity={1.8} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      {[-0.35, 0.35].map(x => <mesh key={x} position={[x, 1.0, 0]}><boxGeometry args={[0.05, 1.8, 0.05]} /><meshStandardMaterial color="#888" metalness={0.8} /></mesh>)}
      <mesh position={[0, 1.95, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.75, 8]} /><meshStandardMaterial ref={fil} color="#3a2a1a" emissive="#ffb54a" emissiveIntensity={0} toneMapped={false} /></mesh>
      <pointLight position={[0, 2, 0]} color="#ffc27a" intensity={Math.pow(Math.max(0, b), 1.6) * 7} distance={30} decay={2} />
    </group>
    <Post at={P.a} /><Post at={P.b} />
  </group>
}

// ---------- 焦耳定律的烧瓶 ----------
/** 平底烧瓶：玻璃有壁厚，里面装着淡黄的煤油；瓶口塞着橡胶塞，塞子上插一支温度计、两根粗铜丝，铜丝下面接一段螺旋电阻丝。
 *  temp：温度计读数（℃），heat：电阻丝发热的程度（0–1）。接线柱是两根铜丝的上端 */
export const FLASK = { r: 4.6, neck: 1.3, h: 12.5 }
export const flaskPosts = (): { a: P3; b: P3 } => ({ a: [-0.8, FLASK.h + 3.4, 0], b: [0.8, FLASK.h + 3.4, 0] })
const tempY = (t: number) => 9 + t * 0.27
export function Flask({ temp, heat }: { temp: number; heat: number }) {
  const g = useMemo(() => {
    const out: RY[] = [[0, 0], [3.6, 0], [4.3, 0.5], [4.6, 2.4], [4.4, 5.8], [3.2, 8.2], [1.5, 9.6], [FLASK.neck, 10.4], [FLASK.neck, FLASK.h]]
    const oil: RY[] = [[0, 0.22], [3.5, 0.22], [4.15, 0.6], [4.4, 2.4], [4.2, 5.8], [3.0, 8.0], [0, 8.0]]
    const helix: THREE.Vector3[] = []; for (let i = 0; i <= 140; i++) { const a = i / 140 * Math.PI * 2 * 9; helix.push(new THREE.Vector3(Math.cos(a) * 0.55, 2.2 + i / 140 * 3.2, Math.sin(a) * 0.55)) }
    return { glass: shell(out, 0.16, { segs: 48 }), oil: lathe(oil, { segs: 48 }), coil: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 280, 0.07, 6, false),
      stopper: lathe([[0, FLASK.h - 1.2], [1.15, FLASK.h - 1.2], [1.6, FLASK.h + 1.4], [0, FLASK.h + 1.4]], { segs: 32 }),
      tube: new THREE.CylinderGeometry(0.28, 0.28, 20, 16), bulb: new THREE.CapsuleGeometry(0.36, 1.2, 6, 12) }
  }, [])
  const coilMat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => { if (coilMat.current) coilMat.current.emissiveIntensity = heat * 1.6 })
  const ty = tempY(temp), base = 3.6
  return <group>
    {/* 煤油、玻璃 */}
    <mesh geometry={g.oil}><meshPhysicalMaterial color="#d9b44a" transparent opacity={0.34} roughness={0.1} depthWrite={false} /></mesh>
    <mesh geometry={g.glass} renderOrder={2}><meshPhysicalMaterial color="#ffffff" transparent opacity={0.1} roughness={0.03} envMapIntensity={1.8} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={g.stopper} castShadow><meshStandardMaterial color="#c43e2a" roughness={0.75} /></mesh>
    {/* 两根铜丝和电阻丝 */}
    {[-0.8, 0.8].map(x => <mesh key={x} position={[x * (x < 0 ? 0.7 : 0.7), (2.2 + FLASK.h + 3.4) / 2, 0]}><cylinderGeometry args={[0.1, 0.1, FLASK.h + 1.2, 8]} /><Metal kind="copper" /></mesh>)}
    <mesh geometry={g.coil}><meshStandardMaterial ref={coilMat} color="#8b7a6a" emissive="#ff5a1a" emissiveIntensity={0} metalness={0.7} roughness={0.4} /></mesh>
    {/* 温度计：插过橡胶塞，玻璃泡浸在煤油里；红色液柱跟着温度升高 */}
    <group position={[0, 0, 0.7]}>
      <mesh geometry={g.tube} position={[0, base + 10, 0]}><meshPhysicalMaterial color="#ffffff" transparent opacity={0.22} roughness={0.03} envMapIntensity={1.6} depthWrite={false} /></mesh>
      <mesh geometry={g.bulb} position={[0, base + 0.6, 0]}><meshStandardMaterial color="#c8262a" roughness={0.3} /></mesh>
      <mesh position={[0, (base + 1.2 + ty) / 2, 0]}><cylinderGeometry args={[0.08, 0.08, Math.max(0.01, ty - base - 1.2), 8]} /><meshStandardMaterial color="#d22a2a" roughness={0.3} /></mesh>
      {/* 刻度：每 5 ℃ 一条 */}
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0.2, tempY(10 + i * 5), 0.24]}><planeGeometry args={[i % 2 ? 0.22 : 0.4, 0.04]} /><meshBasicMaterial color="#222" /></mesh>)}
    </group>
  </group>
}
