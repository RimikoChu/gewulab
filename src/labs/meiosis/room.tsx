// 实验室的房子和固定的陈设：环氧地坪、刷漆的墙和踢脚线、吊顶灯、两座细胞模型台、白板、挂墙大屏、墙边的柜子和培养箱。
// 果蝇实验台在 bench.tsx。画面里 1 个单位 = 1 cm。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe } from '@/lab-kit'
import { FlyBench, FlyFlock, PAD, Vial } from './bench'
import { MeiosisModel } from './cell'
import { Fertilization } from './gamete'
import { canvasTex, rng } from './parts'
import { BACK_Z, BOARD, MODEL, SCREEN, type SpotKey } from './world'

const X0 = -620, X1 = 1040, H = 300

/** 地坪：浅灰环氧地面，60 cm 一格的浅缝，零星的划痕和反光的深浅 */
function floorTex() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rng(5)
  g.fillStyle = '#8d9396'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 260; i++) { const x = r() * S, y = r() * S, R = 30 + r() * 120, q = g.createRadialGradient(x, y, 0, x, y, R); const k = r() < 0.5 ? '70,76,80' : '170,176,178'; q.addColorStop(0, `rgba(${k},0.18)`); q.addColorStop(1, `rgba(${k},0)`); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2) }
  for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,64,66' : '200,204,206'},${0.1 + r() * 0.2})`; g.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5) }
  g.strokeStyle = 'rgba(40,44,46,0.55)'; g.lineWidth = 3
  for (let k = 0; k <= 2; k++) { g.beginPath(); g.moveTo(0, k * S / 2); g.lineTo(S, k * S / 2); g.stroke(); g.beginPath(); g.moveTo(k * S / 2, 0); g.lineTo(k * S / 2, S); g.stroke() }
  const t = canvasTex(c); t.repeat.set((X1 - X0) / 120, 6); return t
}
/** 墙：米白乳胶漆，几乎看不出的滚涂纹 */
function wallTex() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, r = rng(9)
  g.fillStyle = '#b4b6b1'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '150,150,140' : '255,255,250'},${0.05 + r() * 0.08})`; g.fillRect(r() * S, r() * S, 1 + r() * 3, 1 + r() * 2) }
  const t = canvasTex(c); t.repeat.set(8, 2); return t
}

/** 细胞模型台：圆形的展台，黑色烤漆底座、拉丝铝的立柱，顶上一圈磨砂亚克力灯圈托着放大的模型 */
function ModelStand({ at }: { at: readonly [number, number, number] }) {
  const g = useMemo(() => ({
    base: lathe([[0, 0], [44, 0], [46, 1.5], [46, 6], [44, 8], [30, 9], [14, 12], [0, 12]]),
    col: lathe([[0, 0], [9, 0], [9, 70], [11, 72], [11, 76], [0, 76]], { segs: 40 }),
    top: disc(34, 4, { chamfer: 1 }),
    ring: new THREE.TorusGeometry(30, 1.2, 12, 64),
  }), [])
  return <group position={[at[0], 0, at[2]]}>
    <mesh geometry={g.base} castShadow receiveShadow><meshPhysicalMaterial color="#17191c" roughness={0.3} metalness={0.2} clearcoat={0.7} clearcoatRoughness={0.2} /></mesh>
    <mesh geometry={g.col} position={[0, 12, 0]} castShadow><Metal kind="aluminum" grain="brushed" /></mesh>
    <mesh geometry={g.top} position={[0, 88, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#1d2024" roughness={0.35} metalness={0.3} clearcoat={0.6} /></mesh>
    <mesh geometry={g.ring} position={[0, 92.2, 0]} rotation-x={Math.PI / 2}><meshStandardMaterial color="#dff4ff" emissive="#bfe8ff" emissiveIntensity={1.4} toneMapped={false} /></mesh>
    <mesh position={[0, 92.4, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[29, 64]} /><meshPhysicalMaterial color="#2a3238" roughness={0.15} metalness={0.1} clearcoat={1} /></mesh>
  </group>
}

/** 白板：铝合金边框、圆角护角、下沿的笔槽和两支白板笔；板面内容由各课画上去 */
export function Whiteboard() {
  const w = BOARD.w, h = BOARD.y1 - BOARD.y0, cy = (BOARD.y0 + BOARD.y1) / 2
  return <group position={[BOARD.x, cy, BACK_Z + 2.2]}>
    <RoundedBox args={[w + 6, h + 6, 2.2]} radius={0.8} smoothness={3} castShadow receiveShadow><Metal kind="aluminum" grain="brushed" /></RoundedBox>
    <mesh position={[0, 0, 1.12]}><planeGeometry args={[w, h]} /><meshPhysicalMaterial color="#f4f5f2" roughness={0.18} clearcoat={0.8} clearcoatRoughness={0.12} /></mesh>
    {[-1, 1].flatMap(sx => [-1, 1].map(sy => <mesh key={`${sx}${sy}`} position={[sx * (w / 2 + 2), sy * (h / 2 + 2), 0.4]}><boxGeometry args={[4.2, 4.2, 3]} /><meshStandardMaterial color="#3a3f45" roughness={0.6} /></mesh>))}
    {/* 笔槽 */}
    <group position={[0, -h / 2 - 4, 3]}>
      <RoundedBox args={[w * 0.6, 1.6, 7]} radius={0.5} smoothness={2} castShadow><Metal kind="aluminum" grain="brushed" /></RoundedBox>
      <mesh position={[0, 1.2, 2]} rotation-z={Math.PI / 2}><capsuleGeometry args={[0.8, 12, 4, 12]} /><meshStandardMaterial color="#1d4fb8" roughness={0.4} /></mesh>
      <mesh position={[16, 1.2, 1.6]} rotation-z={Math.PI / 2 + 0.05}><capsuleGeometry args={[0.8, 12, 4, 12]} /><meshStandardMaterial color="#c42a2a" roughness={0.4} /></mesh>
      <RoundedBox args={[11, 3, 5]} radius={0.5} position={[-26, 2, 1]} castShadow><meshStandardMaterial color="#2b2f34" roughness={0.8} /></RoundedBox>
    </group>
  </group>
}

/** 挂墙的大屏：窄边框、底下一条品牌位的细带；画面内容由各课画上去 */
export function WallScreen() {
  const w = SCREEN.w, h = SCREEN.y1 - SCREEN.y0, cy = (SCREEN.y0 + SCREEN.y1) / 2
  return <group position={[SCREEN.x, cy, BACK_Z + 4]}>
    <RoundedBox args={[w + 2.4, h + 2.4, 5]} radius={0.6} smoothness={3} castShadow><meshPhysicalMaterial color="#121315" roughness={0.35} metalness={0.4} clearcoat={0.6} /></RoundedBox>
    <mesh position={[0, 0, 2.52]}><planeGeometry args={[w, h]} /><meshStandardMaterial color="#05070a" roughness={0.2} /></mesh>
    <mesh position={[0, -h / 2 - 9, -2]}><boxGeometry args={[8, 18, 2]} /><Metal kind="steel" grain="brushed" /></mesh>
  </group>
}

/** 墙边的陈设：后墙一排吊柜和地柜、一台立式恒温培养箱、洗手池 */
function Furniture() {
  const r = rng(3)
  return <group>
    {/* 果蝇台上方的吊柜 */}
    {[-470, -390, -310, -230].map(x => <group key={x} position={[x, 215, BACK_Z + 18]}>
      <RoundedBox args={[78, 70, 36]} radius={1.2} smoothness={3} castShadow><meshStandardMaterial color="#e9eae6" roughness={0.55} /></RoundedBox>
      <mesh position={[0, 0, 18.1]}><planeGeometry args={[1, 66]} /><meshBasicMaterial color="#9a9d9a" /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * 4, -22, 19]}><boxGeometry args={[1.2, 14, 1.6]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
    </group>)}
    {/* 立式恒温培养箱（放果蝇培养瓶，25 ℃） */}
    <group position={[-575, 0, BACK_Z + 45]}>
      <RoundedBox args={[70, 180, 70]} radius={2} smoothness={3} position={[0, 90, 0]} castShadow receiveShadow><meshStandardMaterial color="#e6e7e3" roughness={0.45} /></RoundedBox>
      <mesh position={[0, 100, 35.2]}><planeGeometry args={[56, 130]} /><meshPhysicalMaterial color="#9fb5bd" transparent opacity={0.35} roughness={0.05} clearcoat={1} /></mesh>
      {[60, 95, 130].map(y => <mesh key={y} position={[0, y, 10]}><boxGeometry args={[56, 1, 48]} /><Metal kind="stainless" /></mesh>)}
      {[60, 95, 130].flatMap(y => Array.from({ length: 9 }, (_, i) => <mesh key={`${y}${i}`} position={[-22 + i * 5.5, y + 5, 20 + (r() - 0.5) * 4]}><cylinderGeometry args={[1.3, 1.3, 9.5, 12]} /><meshPhysicalMaterial color="#e8dfb9" transparent opacity={0.8} roughness={0.2} /></mesh>))}
      <mesh position={[0, 172, 35.3]}><planeGeometry args={[16, 5]} /><meshBasicMaterial color="#0c1410" /></mesh>
      <mesh position={[3, 172, 35.4]}><planeGeometry args={[7, 2.4]} /><meshBasicMaterial color="#7dffb0" toneMapped={false} /></mesh>
    </group>
    {/* 白板和大屏之间的地柜 */}
    <group position={[(BOARD.x + SCREEN.x) / 2 + 20, 0, BACK_Z + 30]}>
      <RoundedBox args={[90, 86, 58]} radius={1.5} smoothness={3} position={[0, 43, 0]} castShadow receiveShadow><meshStandardMaterial color="#dfe0dc" roughness={0.55} /></RoundedBox>
      <RoundedBox args={[94, 3, 62]} radius={1} position={[0, 87.5, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#1b1d1f" roughness={0.35} clearcoat={0.5} /></RoundedBox>
      {[-1, 1].map(s => <mesh key={s} position={[s * 22, 70, 29.3]}><boxGeometry args={[14, 1.2, 1.6]} /><Metal kind="stainless" grain="brushed" /></mesh>)}
    </group>
  </group>
}

/** 吊顶：一排排嵌入式的平板灯 */
function Ceiling() {
  return <group>
    <mesh position={[(X0 + X1) / 2, H, 0]} rotation-x={Math.PI / 2}><planeGeometry args={[X1 - X0, 600]} /><meshStandardMaterial color="#c9cbc7" roughness={0.9} /></mesh>
    {[-420, -120, 180, 480, 780].flatMap(x => [-140, 20].map(z => <mesh key={`${x}${z}`} position={[x, H - 0.5, z]} rotation-x={Math.PI / 2}><planeGeometry args={[60, 60]} /><meshBasicMaterial color="#fffdf6" toneMapped={false} side={THREE.DoubleSide} /></mesh>))}
  </group>
}

const QUIZ_FLIES = (() => { const r = rng(17); return Array.from({ length: 14 }, (_, i) => ({ o: { eye: i % 4 ? 'red' : 'white', body: i % 5 ? 'gray' : 'ebony', wing: i % 3 ? 'long' : 'vestigial', sex: i % 2 ? 'f' : 'm' } as const, p: [PAD.p[0] + (r() - 0.5) * 5, PAD.p[1], PAD.p[2] + (r() - 0.5) * 3] as [number, number, number], yaw: r() * 6.28, lie: true })) })()
export function Room3D({ at }: { at?: SpotKey }) {
  const floor = useMemo(floorTex, []), wall = useMemo(wallTex, [])
  return <group>
    <mesh rotation-x={-Math.PI / 2} position={[(X0 + X1) / 2, 0, 80]} receiveShadow><planeGeometry args={[X1 - X0, 600]} /><meshPhysicalMaterial map={floor} roughness={0.42} clearcoat={0.4} clearcoatRoughness={0.3} /></mesh>
    <mesh position={[(X0 + X1) / 2, H / 2, BACK_Z]} receiveShadow><planeGeometry args={[X1 - X0, H]} /><meshStandardMaterial map={wall} roughness={0.9} /></mesh>
    <mesh position={[X0, H / 2, 80]} rotation-y={Math.PI / 2} receiveShadow><planeGeometry args={[600, H]} /><meshStandardMaterial map={wall} roughness={0.9} /></mesh>
    <mesh position={[X1, H / 2, 80]} rotation-y={-Math.PI / 2} receiveShadow><planeGeometry args={[600, H]} /><meshStandardMaterial map={wall} roughness={0.9} /></mesh>
    {/* 踢脚线 */}
    <mesh position={[(X0 + X1) / 2, 5, BACK_Z + 0.6]}><boxGeometry args={[X1 - X0, 10, 1.2]} /><meshStandardMaterial color="#5d6266" roughness={0.6} /></mesh>
    <Ceiling />
    <Furniture />
    <FlyBench />
    {/* 模型台后面的深色吸音墙板：衬托模型 */}
    {[MODEL.a, MODEL.b].map((m, i) => <group key={i} position={[m[0], 0, BACK_Z + 1.5]}>
      <RoundedBox args={[250, 230, 3]} radius={1.2} smoothness={2} position={[0, 135, 0]} receiveShadow><meshStandardMaterial color="#1f2a33" roughness={0.95} /></RoundedBox>
      {Array.from({ length: 11 }, (_, k) => <mesh key={k} position={[-100 + k * 20, 135, 1.6]}><boxGeometry args={[0.8, 226, 0.4]} /><meshStandardMaterial color="#141c22" roughness={1} /></mesh>)}
    </group>)}
    <ModelStand at={MODEL.a} />
    <ModelStand at={MODEL.b} />
    {/* 随堂检测时，两座模型台上各摆一个：中期Ⅰ的细胞、等着受精的卵细胞 */}
    {at === 'room' && <MeiosisModel at={[MODEL.a[0], MODEL.y, MODEL.a[2]]} ph={3} e={1} flip={[false, true]} cross={0} crossed />}
    {at === 'room' && <Fertilization at={[MODEL.b[0], MODEL.y, MODEL.b[2]]} step={0} e={1} />}
    {/* 随堂检测：果蝇台上两只培养瓶，麻醉板上躺着几只果蝇 */}
    {at === 'room' && <group>
      <Vial position={[PAD.p[0] + 17, 90, PAD.p[2] - 5]} big flies={6} seed={3} />
      <Vial position={[PAD.p[0] + 21.5, 90, PAD.p[2] - 1.5]} big flies={6} seed={7} look={{ eye: 'white', body: 'gray', wing: 'long', sex: 'm' }} />
      <FlyFlock flies={QUIZ_FLIES} />
    </group>}
    <Whiteboard />
    <WallScreen />
    {/* 工作区上方的补光：主体亮、四周暗 */}
    <pointLight position={[MODEL.a[0] - 40, 230, MODEL.a[2] + 80]} intensity={2.2} decay={0} distance={420} color="#fff4e6" />
    <pointLight position={[MODEL.b[0] + 30, 230, MODEL.b[2] + 80]} intensity={2.0} decay={0} distance={420} color="#fff4e6" />
    <pointLight position={[BOARD.x, 260, BACK_Z + 160]} intensity={1.6} decay={0} distance={420} color="#ffffff" />
    <pointLight position={[-320, 240, BACK_Z + 120]} intensity={2.0} decay={0} distance={380} color="#fff1dd" />
    <pointLight position={[SCREEN.x, 240, BACK_Z + 150]} intensity={1.0} decay={0} distance={380} color="#ffffff" />
  </group>
}
