// 果蝇实验台和台上的器材：钢制柜体、黑色环氧树脂台面；体视显微镜、CO₂ 麻醉板（接硅胶管到台上的小钢瓶和减压阀）、白瓷计数板、
// 手按计数器、分拣毛笔、两架果蝇管、几只带棉塞的大培养瓶、记号笔和记录本；以及各课要用的戴手套的手、单独的培养瓶。
// 画面里 1 个单位 = 1 cm，器材按实物尺寸画。
import { useMemo, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, disc, lathe, shell } from '@/lab-kit'
import { Fly, type FlyLook } from './fly'
import { canvasTex, rng, tube, type V3 } from './parts'

export { Fly, FlyFlock, flyGeo, type FlyLook, type FlyPose } from './fly'

// ---------- 布局（世界坐标，cm），和 world.tsx 的 BENCH 一致 ----------
const B = { x0: -500, x1: -150, z0: -220, z1: -140, top: 90 }
const SC = { x: -320, z: -168 }          // 体视显微镜底座中心
const BASE_H = 5.2                        // 显微镜底座高
const PAD_BASE_H = 1.4, PAD_H = 0.6      // 麻醉板：灰色塑料底座、白色多孔板
const STAGE_Z = 3                         // 载物台中心在底座中心前面多少
/** 麻醉板顶面中心（世界坐标）和板面大小：w 沿 x，d 沿 z */
export const PAD = { p: [SC.x, B.top + BASE_H + PAD_BASE_H + PAD_H, SC.z + STAGE_Z] as V3, w: 10, d: 7 }
/** 显微镜物镜的下端（世界坐标），手和毛笔不要伸到它上面 */
export const OBJECTIVE = [SC.x, B.top + 20.5, SC.z + STAGE_Z] as V3
/** 各课自己画的两只“正在用的”培养瓶放在哪（台面上，世界坐标，瓶底中心） */
export const RACK_SLOTS: V3[] = [[SC.x - 30, B.top, SC.z + 30], [SC.x - 20, B.top, SC.z + 33]]
/** 白瓷计数板的中心（板面，世界坐标） */
export const COUNT_PLATE = [SC.x + 27, B.top + 0.9, SC.z + 8] as V3

// ---------- 材质 ----------
const Enamel = ({ color, rough = 0.3 }: { color: string; rough?: number }) => <meshPhysicalMaterial color={color} roughness={rough} metalness={0.1} clearcoat={0.7} clearcoatRoughness={0.2} />
const GlassM = ({ opacity = 0.18, tint = '#dfeef0' }: { opacity?: number; tint?: string }) =>
  <meshPhysicalMaterial color={tint} transparent opacity={opacity} roughness={0.04} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={1.6} side={THREE.DoubleSide} depthWrite={false} />
const Rubber = () => <meshStandardMaterial color="#141516" roughness={0.85} />

/** 白色多孔聚乙烯板：细密的小孔 */
function poreTex() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rng(17)
  g.fillStyle = '#eceae4'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.7 ? '150,148,140' : '255,255,255'},${0.15 + r() * 0.3})`; const s = 0.8 + r() * 1.6; g.beginPath(); g.arc(r() * S, r() * S, s, 0, 7); g.fill() }
  const t = canvasTex(c); t.repeat.set(2, 1.4); return t
}
/** 白瓷计数板：浅灰的 4×4 方格线 */
function gridTex() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#f6f6f3'; g.fillRect(0, 0, S, S)
  g.strokeStyle = 'rgba(90,100,110,0.45)'; g.lineWidth = 3
  for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(k * S / 4, 18); g.lineTo(k * S / 4, S - 18); g.stroke(); g.beginPath(); g.moveTo(18, k * S / 4); g.lineTo(S - 18, k * S / 4); g.stroke() }
  g.strokeStyle = 'rgba(90,100,110,0.7)'; g.lineWidth = 4; g.strokeRect(18, 18, S - 36, S - 36)
  return canvasTex(c, false)
}
/** 记录本的封面和内页 */
function bookTex() {
  const S = 512, c = document.createElement('canvas'); c.width = S; c.height = 360
  const g = c.getContext('2d')!
  g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, S, 360)
  g.strokeStyle = 'rgba(80,120,170,0.35)'; g.lineWidth = 1.5
  for (let y = 40; y < 360; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke() }
  g.strokeStyle = 'rgba(200,60,60,0.4)'; g.beginPath(); g.moveTo(60, 0); g.lineTo(60, 360); g.stroke()
  g.strokeStyle = 'rgba(30,40,80,0.75)'; g.lineWidth = 2; const r = rng(4)
  for (let row = 0; row < 7; row++) { let x = 72; const y = 58 + row * 22; while (x < 380 - r() * 120) { const w = 8 + r() * 26; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + w * 0.3, y - 6, x + w * 0.6, y + 4, x + w, y - 2); g.stroke(); x += w + 6 } }
  return canvasTex(c, false)
}

// ---------- 体视显微镜 ----------
const SCOPE = (() => ({
  base: (() => { const s = new THREE.Shape(); const w = 13, d = 15, rr = 2.5; s.moveTo(-w + rr, -d); s.lineTo(w - rr, -d); s.quadraticCurveTo(w, -d, w, -d + rr); s.lineTo(w, d - rr); s.quadraticCurveTo(w, d, w - rr, d); s.lineTo(-w + rr, d); s.quadraticCurveTo(-w, d, -w, d - rr); s.lineTo(-w, -d + rr); s.quadraticCurveTo(-w, -d, -w + rr, -d)
    const g = new THREE.ExtrudeGeometry(s, { depth: BASE_H - 0.8, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.5, bevelSegments: 3, curveSegments: 10 }); g.rotateX(-Math.PI / 2); g.translate(0, 0.4, 0); return g })(),
  stagePlate: disc(5, 0.3, { chamfer: 0.08 }),
  pillar: lathe([[0, 0], [2.2, 0], [2.2, 0.6], [1.6, 1.2], [1.6, 33], [1.3, 33.6], [0, 33.6]], { segs: 36 }),
  mount: lathe([[0, 0], [3.2, 0], [3.4, 0.3], [3.4, 6.7], [3.2, 7], [0, 7]], { segs: 36 }),
  zoom: lathe([[0, 0], [3.0, 0], [3.4, 0.6], [4.4, 1.6], [4.6, 2.2], [4.6, 9.4], [4.2, 10], [0, 10]], { segs: 48 }),
  objective: lathe([[0, 0], [2.6, 0], [3.0, 0.4], [3.2, 1.2], [3.2, 2.6], [3.6, 3.0], [3.6, 3.6], [0, 3.6]], { segs: 40 }),
  ring: lathe([[3.4, 0], [5.6, 0], [5.9, 0.3], [5.9, 1.6], [5.6, 1.9], [3.4, 1.9]], { segs: 48, closed: true }),
  knob: lathe([[0, 0], [2.6, 0], [2.9, 0.3], [2.9, 1.5], [2.6, 1.8], [0, 1.8]], { segs: 32 }),
  focus: lathe([[0, 0], [2.2, 0], [2.4, 0.25], [2.4, 1.3], [2.2, 1.55], [0, 1.55]], { segs: 28 }),
  eyeTube: lathe([[0, 0], [1.6, 0], [1.6, 7], [1.75, 7.2], [1.75, 8.6], [0, 8.6]], { segs: 32 }),
  eyecup: shell([[1.6, 0], [1.75, 0.4], [1.95, 2.2]], 0.25, { segs: 32 }),
  head: (() => { const s = new THREE.Shape(); s.moveTo(-5.4, -3); s.lineTo(5.4, -3); s.quadraticCurveTo(6.2, -3, 6.2, -2.2); s.lineTo(5, 3.2); s.quadraticCurveTo(4.6, 4, 3.8, 4); s.lineTo(-3.8, 4); s.quadraticCurveTo(-4.6, 4, -5, 3.2); s.lineTo(-6.2, -2.2); s.quadraticCurveTo(-6.2, -3, -5.4, -3)
    const g = new THREE.ExtrudeGeometry(s, { depth: 7, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 3, curveSegments: 8 }); return g })(),
}))()
/** 体视显微镜：底座里有透射光（中间一块磨砂玻璃圆板），后面一根立柱，调焦架、变倍体（两侧大旋钮）、物镜和一圈 LED 环形灯，顶上双目镜筒朝前斜着伸出来 */
function StereoScope({ lamp = true }: { lamp?: boolean }) {
  const s = SCOPE
  const ivory = <Enamel color="#e9e7e1" rough={0.32} />
  const black = <Enamel color="#18191b" rough={0.38} />
  const headY = 23.5   // 变倍体下沿
  return <group position={[SC.x, B.top, SC.z]}>
    <mesh geometry={s.base} castShadow receiveShadow>{ivory}</mesh>
    {/* 透射光的磨砂玻璃板和亮度旋钮、电源开关 */}
    <mesh geometry={s.stagePlate} position={[0, BASE_H - 0.15, STAGE_Z]}><meshPhysicalMaterial color="#f4f8f8" roughness={0.55} transmission={0} emissive="#fffaf0" emissiveIntensity={lamp ? 0.25 : 0} /></mesh>
    <mesh geometry={s.focus} position={[13.2, 2.6, 8]} rotation-z={-Math.PI / 2}><Metal kind="aluminum" grain="turned" /></mesh>
    <RoundedBox args={[1.6, 0.9, 2.4]} radius={0.3} position={[-13.1, 2.6, 9]}><meshStandardMaterial color="#2a2c2e" roughness={0.6} /></RoundedBox>
    {[-1, 1].flatMap(x => [-1, 1].map(z => <mesh key={`${x}${z}`} position={[x * 11, -0.15, z * 13]}><cylinderGeometry args={[1, 1, 0.3, 16]} /><Rubber /></mesh>))}
    {/* 立柱和调焦架 */}
    <mesh geometry={s.pillar} position={[0, BASE_H, -10]} castShadow><Metal kind="chrome" /></mesh>
    <group position={[0, 18.5, -10]}>
      <mesh geometry={s.mount} castShadow>{ivory}</mesh>
      <RoundedBox args={[4.4, 6.4, 8]} radius={0.8} smoothness={3} position={[0, 3.5, 5]} castShadow>{ivory}</RoundedBox>
      {[-1, 1].map(sd => <mesh key={sd} geometry={s.focus} position={[sd * 2.2, 3.5, 3.2]} rotation-z={-sd * Math.PI / 2} castShadow>{black}</mesh>)}
      {[-1, 1].map(sd => <mesh key={`k${sd}`} position={[sd * 3.8, 3.5, 3.2]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.5, 0.5, 0.3, 16]} /><Metal kind="chrome" /></mesh>)}
    </group>
    {/* 变倍体：竖着的圆筒，两侧大的变倍旋钮（滚花橡胶圈），下面物镜和环形灯 */}
    <group position={[0, headY, STAGE_Z]}>
      <mesh geometry={s.zoom} castShadow>{ivory}</mesh>
      {[0.2, 9.75].map(y => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[4.62, 4.62, 0.25, 48]} /><Metal kind="chrome" /></mesh>)}
      {[-1, 1].map(sd => <group key={sd} position={[sd * 4.5, 5.6, 0]} rotation-z={-sd * Math.PI / 2}>
        <mesh geometry={s.knob} castShadow>{black}</mesh>
        {Array.from({ length: 24 }, (_, i) => <mesh key={i} position={[Math.cos(i / 24 * 6.283) * 2.9, 0.9, Math.sin(i / 24 * 6.283) * 2.9]} rotation-y={-i / 24 * 6.283}><boxGeometry args={[0.18, 1.1, 0.26]} /><Rubber /></mesh>)}
        <mesh position={[0, 1.82, 0]}><cylinderGeometry args={[1.6, 1.6, 0.05, 28]} /><Metal kind="aluminum" grain="turned" /></mesh>
      </group>)}
      {/* 物镜：倒挂在变倍体下面 */}
      <mesh geometry={s.objective} position={[0, 0, 0]} rotation-x={Math.PI} castShadow><Metal kind="aluminum" grain="turned" /></mesh>
      <mesh position={[0, -3.62, 0]} rotation-x={Math.PI / 2}><circleGeometry args={[2.4, 32]} /><meshPhysicalMaterial color="#1c2a33" roughness={0.02} clearcoat={1} metalness={0.3} /></mesh>
      {/* 环形 LED 灯：套在物镜上，下面一圈发光 */}
      <mesh geometry={s.ring} position={[0, -3.4, 0]} castShadow>{black}</mesh>
      <mesh position={[0, -3.42, 0]} rotation-x={Math.PI / 2}><ringGeometry args={[3.9, 5.3, 48]} /><meshBasicMaterial color={lamp ? '#fffdf3' : '#3a3a3a'} toneMapped={!lamp} side={THREE.DoubleSide} /></mesh>
      <mesh position={[4, -1.8, -5.5]} rotation-x={0.3}>{/* 灯线 */}<cylinderGeometry args={[0.25, 0.25, 4, 8]} /><Rubber /></mesh>
      {/* 双目头：楔形的壳，两只目镜筒朝学生斜伸出来，橡胶眼罩 */}
      <group position={[0, 10.2, 0]}>
        <mesh geometry={s.head} rotation-x={-Math.PI / 2} position={[0, 0, 0]} castShadow>{ivory}</mesh>
        {[-1, 1].map(sd => <group key={sd} position={[sd * 3.1, 4.6, 0.8]} rotation-x={0.72} rotation-z={sd * -0.04}>
          <mesh geometry={s.eyeTube} castShadow>{black}</mesh>
          <mesh geometry={s.eyecup} position={[0, 8.6, 0]} castShadow><Rubber /></mesh>
          <mesh position={[0, 8.7, 0]}><cylinderGeometry args={[1.05, 1.05, 0.05, 24]} /><meshPhysicalMaterial color="#25404c" roughness={0.02} clearcoat={1} /></mesh>
          <mesh position={[0, 5.5, 0]}><cylinderGeometry args={[1.66, 1.66, 0.5, 28]} /><Metal kind="chrome" /></mesh>
        </group>)}
      </group>
    </group>
    {lamp && <pointLight position={[0, headY - 5, STAGE_Z]} intensity={0.8} distance={30} decay={1} color="#fffaf0" />}
  </group>
}

// ---------- CO₂ 麻醉板、气路 ----------
function Co2Pad() {
  const pores = useMemo(poreTex, [])
  const y0 = B.top + BASE_H
  const tubeG = useMemo(() => tube([[SC.x - PAD.w / 2 - 1.6, y0 + 0.7, PAD.p[2] - 1], [SC.x - 12, y0 + 0.4, PAD.p[2] - 2], [SC.x - 17, B.top + 3, PAD.p[2] - 6], [SC.x - 22, B.top + 0.5, PAD.p[2] - 14], [SC.x - 36, B.top + 0.5, SC.z - 30], [SC.x - 44, B.top + 4, SC.z - 38]], 0.32, 0.32, '#dfe8e6', '#dfe8e6', 10, 80), [y0])
  return <group>
    <group position={[PAD.p[0], y0, PAD.p[2]]}>
      <RoundedBox args={[PAD.w + 1.4, PAD_BASE_H, PAD.d + 1.4]} radius={0.35} smoothness={3} position={[0, PAD_BASE_H / 2, 0]} castShadow receiveShadow><meshStandardMaterial color="#6d7378" roughness={0.55} /></RoundedBox>
      <RoundedBox args={[PAD.w, PAD_H, PAD.d]} radius={0.15} smoothness={2} position={[0, PAD_BASE_H + PAD_H / 2 - 0.02, 0]} receiveShadow><meshStandardMaterial map={pores} roughness={0.95} /></RoundedBox>
      {/* 进气嘴：黄铜宝塔接头 */}
      <mesh position={[-PAD.w / 2 - 1.2, 0.7, -1]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.28, 0.4, 1.4, 16]} /><Metal kind="brass" grain="turned" /></mesh>
    </group>
    {/* 透明硅胶管：一头在麻醉板，一头接到减压阀 */}
    <mesh geometry={tubeG}><meshPhysicalMaterial vertexColors transparent opacity={0.6} roughness={0.25} clearcoat={0.8} /></mesh>
    <Co2Tank at={[SC.x - 46, B.top, SC.z - 40]} />
  </group>
}
/** 小号 CO₂ 钢瓶：灰色瓶身、肩部写着字的标签环，顶上黄铜减压阀、压力表和针阀 */
function Co2Tank({ at }: { at: V3 }) {
  const g = useMemo(() => ({
    body: lathe([[0, 0], [4.6, 0], [5, 0.6], [5, 30], [4.6, 33], [3.2, 35.5], [1.6, 36.5], [1.6, 38], [0, 38]], { segs: 48 }),
    gauge: disc(2.4, 1.2, { chamfer: 0.2 }),
  }), [])
  return <group position={at}>
    <mesh geometry={g.body} castShadow receiveShadow><Enamel color="#5f6a70" rough={0.4} /></mesh>
    <mesh position={[0, 29, 0]}><cylinderGeometry args={[5.02, 5.02, 3, 48, 1, true]} /><meshStandardMaterial color="#d8d9d2" roughness={0.6} /></mesh>
    <group position={[0, 38, 0]}>
      <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[1.4, 1.4, 3.2, 6]} /><Metal kind="brass" /></mesh>
      <mesh position={[0, 4, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[1.5, 1.5, 4.5, 20]} /><Metal kind="brass" grain="turned" /></mesh>
      <group position={[0, 4, 2]} rotation-x={Math.PI / 2}>
        <mesh geometry={g.gauge}><Metal kind="chrome" /></mesh>
        <mesh position={[0, 1.22, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[2.1, 32]} /><meshStandardMaterial color="#f3f1ea" roughness={0.4} /></mesh>
        <mesh position={[0.4, 1.25, 0.3]} rotation={[-Math.PI / 2, 0, 0.8]}><planeGeometry args={[0.12, 1.6]} /><meshBasicMaterial color="#b3261e" /></mesh>
      </group>
      <mesh position={[3, 4, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.8, 0.8, 2.4, 16]} /><Metal kind="brass" /></mesh>
      <mesh position={[4.6, 4, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[1.3, 1.3, 0.9, 20]} /><meshStandardMaterial color="#1d1f21" roughness={0.6} /></mesh>
      <mesh position={[-3, 4, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.45, 0.55, 2, 14]} /><Metal kind="brass" grain="turned" /></mesh>
    </group>
  </group>
}

// ---------- 小器材 ----------
/** 分拣毛笔：笔尖朝 −y，原点在笔尖；黑漆木杆、铝箍，全长约 16 cm */
export function SortBrush() {
  const g = useMemo(() => ({
    hair: lathe([[0, 0], [0.12, 0.3], [0.24, 0.9], [0.3, 1.5], [0.3, 1.7], [0, 1.7]], { segs: 18 }),
    ferrule: lathe([[0, 0], [0.32, 0], [0.34, 0.1], [0.36, 1.6], [0.38, 1.8], [0, 1.8]], { segs: 20 }),
    handle: lathe([[0, 0], [0.38, 0], [0.42, 2], [0.36, 9], [0.28, 12.4], [0.2, 12.6], [0, 12.6]], { segs: 20 }),
  }), [])
  return <group>
    <mesh geometry={g.hair}><meshStandardMaterial color="#3d2d22" roughness={0.95} /></mesh>
    <mesh geometry={g.ferrule} position={[0, 1.6, 0]}><Metal kind="aluminum" grain="turned" /></mesh>
    <mesh geometry={g.handle} position={[0, 3.3, 0]} castShadow><meshPhysicalMaterial color="#141414" roughness={0.3} clearcoat={0.8} /></mesh>
  </group>
}
/** 手按计数器：镀铬圆壳、四位数字窗、顶上的按钮和侧面的清零钮、一个指环 */
function TallyCounter({ at, yaw = 0 }: { at: V3; yaw?: number }) {
  const g = useMemo(() => ({ body: disc(2.4, 2.2, { chamfer: 0.4 }) }), [])
  return <group position={at} rotation-y={yaw}>
    <group position={[0, 2.4, 0]} rotation-x={Math.PI / 2}>
      <mesh geometry={g.body} position={[0, -1.1, 0]} castShadow><Metal kind="stainless" rough={0.32} env={1.6} /></mesh>
    </group>
    <mesh position={[0, 2.6, 1.12]}><planeGeometry args={[2.6, 0.9]} /><meshStandardMaterial color="#0f0f10" roughness={0.3} /></mesh>
    {[0, 1, 2, 3].map(i => <mesh key={i} position={[-0.9 + i * 0.6, 2.6, 1.13]}><planeGeometry args={[0.45, 0.65]} /><meshStandardMaterial color="#f2f2ee" roughness={0.4} /></mesh>)}
    <mesh position={[0, 5.3, 0]}><cylinderGeometry args={[0.5, 0.5, 1.2, 16]} /><Metal kind="chrome" /></mesh>
    <mesh position={[2.5, 3.6, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.35, 0.35, 0.8, 12]} /><Metal kind="chrome" /></mesh>
    <mesh position={[0, 0.25, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[1.2, 0.18, 8, 24]} /><Metal kind="chrome" /></mesh>
  </group>
}
/** 白瓷计数板：带圆角的厚瓷砖，板面画 4×4 方格 */
function CountPlate() {
  const grid = useMemo(gridTex, [])
  return <group position={[COUNT_PLATE[0], B.top, COUNT_PLATE[2]]}>
    <RoundedBox args={[11, 0.8, 11]} radius={0.3} smoothness={3} position={[0, 0.4, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#f5f5f1" roughness={0.12} clearcoat={1} clearcoatRoughness={0.05} /></RoundedBox>
    <mesh position={[0, 0.81, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[10.4, 10.4]} /><meshPhysicalMaterial map={grid} roughness={0.12} clearcoat={1} /></mesh>
  </group>
}
/** 记录本（翻开、内页有手写字）和一支记号笔 */
function Notebook({ at, yaw }: { at: V3; yaw: number }) {
  const t = useMemo(bookTex, [])
  return <group position={at} rotation-y={yaw}>
    <RoundedBox args={[30, 0.4, 21]} radius={0.15} smoothness={2} position={[0, 0.2, 0]} castShadow receiveShadow><meshStandardMaterial color="#2f4a6b" roughness={0.8} /></RoundedBox>
    {[-1, 1].map(s => <group key={s} position={[s * 7.3, 0.62, 0]} rotation-z={-s * 0.025}>
      <RoundedBox args={[14.4, 0.5, 20.2]} radius={0.1} smoothness={2}><meshStandardMaterial color="#f2efe6" roughness={0.9} /></RoundedBox>
      <mesh position={[0, 0.26, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[14.2, 20]} /><meshStandardMaterial map={t} roughness={0.9} /></mesh>
    </group>)}
    <group position={[5, 1.4, 12.5]} rotation={[0, 0.3, Math.PI / 2]}>
      <mesh castShadow><cylinderGeometry args={[0.6, 0.6, 12, 16]} /><meshStandardMaterial color="#f0f0ec" roughness={0.5} /></mesh>
      <mesh position={[0, 6.8, 0]}><cylinderGeometry args={[0.62, 0.62, 2.2, 16]} /><meshStandardMaterial color="#1a1a1a" roughness={0.5} /></mesh>
    </group>
  </group>
}

// ---------- 培养瓶 ----------
/** 果蝇管：φ2.5×9.5 cm；大培养瓶：φ4×10 cm，瓶口略收 */
const VIAL = (() => ({
  small: { glass: shell([[0, 0], [1.2, 0], [1.25, 0.15], [1.25, 9.5]], 0.08, { segs: 28 }), food: 2, r: 1.17, h: 9.5, plugR: 1.17, plugH: 2.6 },
  big: { glass: shell([[0, 0], [1.9, 0], [2.0, 0.2], [2.0, 8.2], [1.7, 9.0], [1.5, 9.4], [1.5, 10]], 0.12, { segs: 32 }), food: 2.4, r: 1.88, h: 10, plugR: 1.4, plugH: 3 },
}))()
/** 海绵塞：一圈略不规则的圆柱，露在管口外 1 cm；棉塞：白色蓬松的一团 */
function plugGeo(r: number, h: number, cotton: boolean, seed: number) {
  const g = cotton ? new THREE.SphereGeometry(1, 16, 12) : new THREE.CylinderGeometry(r, r * 0.98, h, 18, 3)
  const p = g.attributes.position, rr = rng(seed)
  for (let i = 0; i < p.count; i++) {
    if (cotton) { const k = 1 + (rr() - 0.5) * 0.18; p.setXYZ(i, p.getX(i) * r * 1.15 * k, p.getY(i) * h * 0.55 * k + h * 0.2, p.getZ(i) * r * 1.15 * k) }
    else { const k = 1 + (rr() - 0.5) * 0.05; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k) }
  }
  g.computeVertexNormals(); return g
}
/** 一只培养瓶：玻璃壁、底部淡黄的玉米粉培养基（表面略起伏）、塞子；flies 只果蝇停在瓶壁上 */
export function Vial({ position, big = false, flies = 0, look, seed = 1 }: { position: V3; big?: boolean; flies?: number; look?: FlyLook; seed?: number }) {
  const v = big ? VIAL.big : VIAL.small
  const plug = useMemo(() => plugGeo(v.plugR, v.plugH, big, seed), [v, big, seed])
  const spots = useMemo(() => {
    const r = rng(seed * 7 + 3)
    return Array.from({ length: flies }, () => {
      const a = r() * Math.PI * 2, y = v.food + 0.8 + r() * (v.h - v.food - 3.4)
      const n = new THREE.Vector3(-Math.cos(a), 0, -Math.sin(a))   // 朝瓶心
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28))
      return { p: [Math.cos(a) * (v.r - 0.02), y, Math.sin(a) * (v.r - 0.02)] as V3, q }
    })
  }, [flies, seed, v])
  const o: FlyLook = look ?? { eye: 'red', body: 'gray', wing: 'long', sex: 'f' }
  return <group position={position}>
    <mesh geometry={v.glass} castShadow renderOrder={2}><GlassM /></mesh>
    <mesh position={[0, v.food / 2 + 0.08, 0]}><cylinderGeometry args={[v.r - 0.02, v.r - 0.02, v.food, 28]} /><meshStandardMaterial color="#d9c27e" roughness={0.8} /></mesh>
    <mesh position={[0, v.food + 0.09, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[v.r - 0.03, 28]} /><meshStandardMaterial color="#cbb06a" roughness={0.95} /></mesh>
    <mesh geometry={plug} position={[0, v.h - v.plugH / 2 + (big ? 0 : 1), 0]} castShadow><meshStandardMaterial color={big ? '#f4f2ec' : '#c9c3b3'} roughness={1} /></mesh>
    {spots.map((s, i) => <group key={i} position={s.p} quaternion={s.q}><Fly o={o} position={[0, 0, 0]} /></group>)}
  </group>
}
/** 白色聚丙烯管架：上下两层带孔的板，3 行 × 6 列，插满果蝇管（玻璃、培养基、塞子各合成一个模型） */
function VialRack({ at, seed }: { at: V3; seed: number }) {
  const m = useMemo(() => {
    const glass: THREE.BufferGeometry[] = [], food: THREE.BufferGeometry[] = [], plugs: THREE.BufferGeometry[] = [], r = rng(seed)
    for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) {
      if (r() < 0.08) continue
      const x = (j - 2.5) * 3.2, z = (i - 1) * 3.2, y = 1.2
      glass.push(VIAL.small.glass.clone().translate(x, y, z))
      const fh = 1.6 + r() * 0.6; food.push(new THREE.CylinderGeometry(1.15, 1.15, fh, 20).translate(x, y + fh / 2 + 0.08, z))
      plugs.push(plugGeo(1.17, 2.6, false, seed * 31 + i * 6 + j).translate(x, y + 9.5 - 0.3, z))
    }
    return { glass: mergeGeometries(glass), food: mergeGeometries(food), plugs: mergeGeometries(plugs) }
  }, [seed])
  const plate = (y: number) => <RoundedBox args={[21, 0.6, 11]} radius={0.25} smoothness={2} position={[0, y, 0]} castShadow receiveShadow><meshStandardMaterial color="#f1f1ed" roughness={0.5} /></RoundedBox>
  return <group position={at}>
    {plate(0.3)}{plate(5.2)}
    {[-1, 1].map(s => <RoundedBox key={s} args={[0.6, 5.5, 11]} radius={0.2} position={[s * 10.2, 2.75, 0]} castShadow><meshStandardMaterial color="#e8e8e3" roughness={0.5} /></RoundedBox>)}
    <mesh geometry={m.glass} renderOrder={2}><GlassM opacity={0.16} /></mesh>
    <mesh geometry={m.food}><meshStandardMaterial color="#d8c07a" roughness={0.85} /></mesh>
    <mesh geometry={m.plugs} castShadow><meshStandardMaterial color="#c4bdac" roughness={1} /></mesh>
  </group>
}

// ---------- 实验台 ----------
/** 钢制柜体（浅灰粉末喷涂）、对开门和抽屉、不锈钢拉手、调平脚；台面是 2.5 cm 厚的黑色环氧树脂板，前沿略挑出 */
function Bench() {
  const w = B.x1 - B.x0, d = B.z1 - B.z0, cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2
  const bays = 5, bw = w / bays
  return <group>
    <RoundedBox args={[w + 2, 2.5, d + 3]} radius={0.5} smoothness={3} position={[cx, B.top - 1.25, cz + 1]} castShadow receiveShadow><meshPhysicalMaterial color="#1b1d1f" roughness={0.28} clearcoat={0.5} clearcoatRoughness={0.25} /></RoundedBox>
    {/* 台面后沿的挡水边 */}
    <RoundedBox args={[w + 2, 8, 2.5]} radius={0.4} smoothness={2} position={[cx, B.top + 4, B.z0 + 1.25]} castShadow><meshPhysicalMaterial color="#1b1d1f" roughness={0.3} clearcoat={0.5} /></RoundedBox>
    {/* 柜体：踢脚凹进去一截 */}
    <RoundedBox args={[w - 2, B.top - 12.5, d - 6]} radius={0.6} smoothness={2} position={[cx, 10 + (B.top - 12.5) / 2, cz - 2]} receiveShadow><meshStandardMaterial color="#c9ccc9" roughness={0.5} metalness={0.15} /></RoundedBox>
    <mesh position={[cx, 5, cz - 6]}><boxGeometry args={[w - 6, 10, d - 16]} /><meshStandardMaterial color="#2c2f32" roughness={0.8} /></mesh>
    {Array.from({ length: bays }, (_, k) => {
      const x = B.x0 + bw * (k + 0.5), zf = B.z1 - 3.9
      return <group key={k} position={[x, 0, zf]}>
        {/* 上面一个抽屉，下面一扇门；门缝是深色的窄缝 */}
        <RoundedBox args={[bw - 1.6, 16, 1.6]} radius={0.5} smoothness={2} position={[0, B.top - 12, 0]} castShadow><meshStandardMaterial color="#d6d8d5" roughness={0.45} metalness={0.15} /></RoundedBox>
        <RoundedBox args={[bw - 1.6, B.top - 34, 1.6]} radius={0.5} smoothness={2} position={[0, 11 + (B.top - 34) / 2, 0]} castShadow><meshStandardMaterial color="#d6d8d5" roughness={0.45} metalness={0.15} /></RoundedBox>
        <mesh position={[0, B.top - 12, 1.1]}><boxGeometry args={[16, 1.4, 1.2]} /><Metal kind="aluminum" grain="brushed" rough={0.5} /></mesh>
        <mesh position={[bw / 2 - 8, B.top - 30, 1.1]}><boxGeometry args={[1.4, 14, 1.2]} /><Metal kind="aluminum" grain="brushed" rough={0.5} /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[s * (bw / 2 - 5), 1, -4]}><cylinderGeometry args={[2, 2.4, 2, 16]} /><Metal kind="stainless" /></mesh>)}
      </group>
    })}
  </group>
}

/** 整个果蝇实验台：柜子、台面和台上全部器材 */
export function FlyBench() {
  return <group>
    <Bench />
    <StereoScope />
    <Co2Pad />
    <CountPlate />
    <TallyCounter at={[SC.x + 18, B.top, SC.z + 20]} yaw={-0.4} />
    <group position={[SC.x + 20, B.top + 0.42, SC.z + 27]} rotation={[0, 0.5, Math.PI / 2]}><group rotation-z={0}><SortBrush /></group></group>
    <VialRack at={[-440, B.top, -185]} seed={3} />
    <VialRack at={[-415, B.top, -158]} seed={5} />
    <VialRack at={[-215, B.top, -186]} seed={7} />
    {[[-470, -160], [-478, -175], [-462, -178], [-240, -152]].map(([x, z], i) => <Vial key={i} position={[x, B.top, z]} big seed={20 + i} />)}
    <Notebook at={[-250, B.top, -158]} yaw={-0.12} />
  </group>
}

// ---------- 戴手套的手 ----------
// 按真手的大小（手掌宽约 8 cm）画：手套是哑光的蓝色丁腈，手腕处翻一道边，再往上只露一小截白大褂的袖子和袖口。
// 写法参照概率实验室的手套，复制在这里改成厘米。
const FINGER = new THREE.CapsuleGeometry(1, 3.2, 6, 14)
/**
 * 戴蓝色丁腈手套的右手，拇指、食指捏着工具。children 是工具（尖朝 −y、原点在尖上，比如 SortBrush）；
 * 手指捏在离尖 grip 厘米的地方，手掌和手腕往 +y 伸出去，接一小截袖子。整组的原点就是工具尖。
 */
export function GloveHand({ children, grip = 8, sleeve = 9 }: { children?: ReactNode; grip?: number; sleeve?: number }) {
  const glove = <meshStandardMaterial color="#4a76bd" roughness={0.62} />
  const cloth = <meshStandardMaterial color="#eeefea" roughness={0.88} />
  return <group>
    {children}
    {/* 手：手指朝 −y 捏住工具，手掌在工具后面一点（−z 一侧是手心） */}
    <group position={[0, grip + 4.2, 1.9]} rotation-x={0.12}>
      <RoundedBox args={[7.6, 8.4, 3.2]} radius={1.4} smoothness={4} position={[0, 0.2, 0]} castShadow>{glove}</RoundedBox>
      {[-2.6, -0.85, 0.85, 2.6].map((x, i) => <group key={x} position={[x, -4.1, 0]} rotation-x={-0.55 - i * 0.18}>
        <mesh geometry={FINGER} position={[0, -2.1 + Math.abs(i - 1.5) * 0.35, 0]} scale={[0.92, 0.9 - Math.abs(i - 1.5) * 0.08, 0.92]} castShadow>{glove}</mesh>
      </group>)}
      {/* 拇指：从掌侧斜着伸到工具上，和食指一起捏住 */}
      <group position={[-3.8, -1.6, -0.6]} rotation={[-0.5, 0, -0.65]}><mesh geometry={FINGER} position-y={-2.4} scale={[1.05, 0.8, 1.05]} castShadow>{glove}</mesh></group>
      {/* 手腕、手套口翻边、袖口和一小截袖子 */}
      <mesh position={[0, 5.9, 0]} castShadow><cylinderGeometry args={[3.5, 3.9, 3.2, 28]} />{glove}</mesh>
      <mesh position={[0, 7.5, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[3.6, 0.38, 8, 28]} />{glove}</mesh>
      <mesh position={[0, 7.9 + sleeve / 2, 0]} castShadow><cylinderGeometry args={[4.9, 4.5, sleeve, 28]} />{cloth}</mesh>
      <mesh position={[0, 8.2, 0]} castShadow><cylinderGeometry args={[4.55, 4.55, 1.1, 28]} /><meshStandardMaterial color="#e2e3de" roughness={0.9} /></mesh>
    </group>
  </group>
}
