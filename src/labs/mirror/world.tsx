// 光的反射和平面镜实验室的大场景：一间光学暗室。一张长长的实验台，从左到右八处器材；背后是遮光帘，台子靠墙一侧摆着器材箱和试剂瓶。
// 整个实验室只有这一个世界，换课时画布不重建，镜头沿着台子飞过去；头顶那盏射灯跟着照到当前这一处。画面里 1 cm 画成 CM 个单位。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, Painted, disc, lathe, makeGround, mergeParts, type Part } from '@/lab-kit'

export const TOP = 0.9, CM = 0.06      // 台面高度、1 cm 在画面里多长
/** 各课的器材在台子上的位置（x 坐标），从左到右 */
export const ST = { hole: -16.5, law: -11, rough: -5.5, plate: 0, draw: 5.5, use: 11, curve: 16.5, extra: 22 }
export type Spot = keyof typeof ST
const X0 = -20, X1 = 25.5, DEPTH = 2.8
// 机位。正面：稍微偏一点、俯一点，光路所在的平面基本正对镜头；玻璃板那一课要透过玻璃板看像，镜头绕到蜡烛这一侧
const FRONT: [number, number] = [-0.2, 0.17]
export const VIEWS = { front: FRONT, plate: [-1.02, 0.3] as [number, number], card: [-0.3, 0.34] as [number, number], top: [-0.12, 0.72] as [number, number] }
const at = (x: number, y: number, w: number, h: number, view: [number, number] = FRONT) => ({ target: new THREE.Vector3(x, TOP + y, 0), span: [w, h] as [number, number], view })
export const SPOT = {
  hole: at(ST.hole - 0.4, 0.56, 3.7, 1.8), law: at(ST.law, 0.66, 3.5, 2.1), rough: at(ST.rough - 0.2, 0.98, 4.2, 2.5),
  plate: at(ST.plate + 0.15, 0.42, 2.9, 1.8, VIEWS.plate), draw: at(ST.draw - 0.3, 0.72, 3.0, 1.75),
  use: at(ST.use - 0.15, 0.98, 3.7, 2.4), use2: at(ST.use - 0.2, 0.62, 3.3, 1.8), curve: at(ST.curve - 0.4, 0.8, 4.2, 1.9),
  extra: at(ST.extra - 0.1, 0.78, 4.3, 2.1), extraTop: at(ST.extra, 0.25, 2.9, 1.9, VIEWS.top),
}
export type SpotKey = keyof typeof SPOT
/** 暗室里的舞台设置：不画天空，背景近黑，环境光调小，亮的东西带一圈泛光 */
export const DARK = { sky: false, backdrop: '#07090c', env: 0.6, sun: 0, fog: [30, 120] as [number, number], bloom: 0.7, studio: true }

/** 实验台的台面：墨绿色的实芯理化板，细碎的斑点和几道使用留下的浅划痕 */
function makeTop() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  let s = 5; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
  g.fillStyle = '#2b3836'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 5200; i++) { const v = rnd(); g.fillStyle = v < 0.5 ? `rgba(160,190,180,${0.05 + rnd() * 0.09})` : `rgba(6,12,11,${0.1 + rnd() * 0.16})`; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2) }
  g.lineWidth = 1
  for (let i = 0; i < 26; i++) { const x = rnd() * S, y = rnd() * S, a = rnd() * 6.3, l = 20 + rnd() * 90; g.strokeStyle = `rgba(190,215,205,${0.04 + rnd() * 0.06})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 遮光帘：一道道竖着的褶，深蓝绿色的绒布 */
function makeCurtain() {
  const W = 512, c = document.createElement('canvas'); c.width = W; c.height = 8
  const g = c.getContext('2d')!
  for (let x = 0; x < W; x++) { const k = 0.5 + 0.5 * Math.sin(x / W * Math.PI * 2 * 11) * Math.sin(x / W * Math.PI * 2 * 2.3 + 1); const v = 8 + 24 * k; g.fillStyle = `rgb(${Math.round(v * 0.5)},${Math.round(v * 0.85)},${Math.round(v)})`; g.fillRect(x, 0, 1, 8) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping
  return t
}
/** 木头：顺着纹理方向的深浅条纹 */
function makeWood() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  let s = 9; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
  g.fillStyle = '#8a6238'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 150; i++) { const y = rnd() * S, h = 1 + rnd() * 3; g.fillStyle = rnd() < 0.5 ? `rgba(60,36,14,${0.08 + rnd() * 0.2})` : `rgba(214,170,110,${0.06 + rnd() * 0.14})`; g.fillRect(0, y, S, h) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
let wood: THREE.CanvasTexture | null = null
/** 上过清漆的木头：器材箱、暗箱、底板都用它 */
export function Wood({ tint = '#ffffff', repeat = 1 }: { tint?: string; repeat?: number }) {
  const map = useMemo(() => { wood ??= makeWood(); const t = wood.clone(); t.repeat.set(repeat, repeat); t.needsUpdate = true; return t }, [repeat])
  return <meshPhysicalMaterial map={map} color={tint} roughness={0.5} clearcoat={0.45} clearcoatRoughness={0.3} envMapIntensity={1.6} />
}

// 试剂瓶：棕色的细口瓶，车出来的
const BOTTLE = lathe([[0, 0], [0.085, 0], [0.09, 0.008], [0.09, 0.2], [0.075, 0.25], [0.034, 0.285], [0.034, 0.33], [0.042, 0.334], [0.042, 0.348], [0, 0.348]])
const STOPPER = lathe([[0, 0], [0.03, 0], [0.036, 0.04], [0.046, 0.044], [0.046, 0.06], [0, 0.06]], { segs: 20 })
const LEG_PAD = disc(0.09, 0.03)

/** 靠墙一侧摆的东西：一只带搭扣的木头器材箱，上面摞一只小盒，旁边两只试剂瓶。只是陈设，不参与实验 */
function Shelf({ x, flip = false }: { x: number; flip?: boolean }) {
  const s = flip ? -1 : 1
  return (
    <group position={[x, TOP, -1.02]}>
      <RoundedBox args={[0.95, 0.34, 0.5]} radius={0.02} position={[0, 0.17, 0]} castShadow><Wood tint="#b89a78" repeat={2} /></RoundedBox>
      <mesh position={[0, 0.262, 0.251]}><boxGeometry args={[0.95, 0.006, 0.004]} /><meshStandardMaterial color="#1c1410" /></mesh>
      {[-0.28, 0.28].map(dx => <mesh key={dx} position={[dx, 0.25, 0.256]}><boxGeometry args={[0.07, 0.09, 0.012]} /><Metal kind="brass" grain="brushed" env={3} /></mesh>)}
      <RoundedBox args={[0.5, 0.16, 0.34]} radius={0.015} position={[-0.12 * s, 0.42, -0.02]} rotation-y={0.18 * s} castShadow><meshStandardMaterial color="#27405a" roughness={0.7} /></RoundedBox>
      {[0.72, 0.95].map((dx, i) => <group key={dx} position={[dx * s, 0, 0.08 - i * 0.16]}>
        <mesh geometry={BOTTLE} castShadow><meshPhysicalMaterial color="#5a2f0e" roughness={0.12} transmission={0.35} thickness={0.1} clearcoat={1} envMapIntensity={2} /></mesh>
        <mesh geometry={STOPPER} position-y={0.31}><meshStandardMaterial color="#c8c4b8" roughness={0.35} /></mesh>
      </group>)}
    </group>
  )
}

/** 头顶的一盏射灯，照着当前这一处器材 */
function Lamp({ x }: { x: number }) {
  const aim = useMemo(() => { const o = new THREE.Object3D(); o.position.set(x, TOP, 0); o.updateMatrixWorld(); return o }, [x])
  return <>
    <primitive object={aim} />
    <spotLight position={[x - 0.6, 4.4, 2.6]} target={aim} angle={0.62} penumbra={1} intensity={125} distance={16} decay={1.6} color="#e6e9f2" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0008} />
  </>
}

export function World({ at: here = 'hole' }: { at?: Spot }) {
  const top = useMemo(() => { const t = makeTop(); t.repeat.set((X1 - X0) / 1.4, DEPTH / 1.4); return t }, [])
  const floor = useMemo(() => { const t = makeGround('#15171a', '46,48,52', '6,7,9'); t.repeat.set(16, 7); return t }, [])
  const curtain = useMemo(() => { const t = makeCurtain(); t.repeat.set(6, 1); return t }, [])
  const geo = useMemo(() => {
    const parts: Part[] = [], cx = (X0 + X1) / 2, len = X1 - X0
    // 台体：台面板、正面一道木头封边、下面一圈钢梁、一排方钢腿、腿之间一根横撑
    parts.push({ p: [cx, TOP - 0.035, 0], s: [len, 0.07, DEPTH], c: '#1a2322' })
    parts.push({ p: [cx, TOP - 0.035, DEPTH / 2 + 0.012], s: [len + 0.02, 0.074, 0.024], c: '#8a5c32' }, { p: [cx, TOP - 0.035, -DEPTH / 2 - 0.012], s: [len + 0.02, 0.074, 0.024], c: '#8a5c32' })
    for (const z of [-DEPTH / 2 + 0.12, DEPTH / 2 - 0.12]) parts.push({ p: [cx, TOP - 0.15, z], s: [len - 0.2, 0.16, 0.05], c: '#2c3238' })
    for (let x = X0 + 0.5; x <= X1 - 0.4; x += 6.37) {
      for (const z of [-DEPTH / 2 + 0.12, DEPTH / 2 - 0.12]) parts.push({ p: [x, (TOP - 0.07) / 2 + 0.015, z], s: [0.11, TOP - 0.1, 0.11], c: '#262b30' })
      parts.push({ p: [x, 0.22, 0], s: [0.07, 0.07, DEPTH - 0.24], c: '#2c3238' })
    }
    // 墙脚的一道踢脚线
    parts.push({ p: [cx, 0.12, -3.36], s: [len + 8, 0.24, 0.06], c: '#1a1d21' })
    return mergeParts(parts)
  }, [])
  const legs = useMemo(() => { const out: [number, number][] = []; for (let x = X0 + 0.5; x <= X1 - 0.4; x += 6.37) for (const z of [-DEPTH / 2 + 0.12, DEPTH / 2 - 0.12]) out.push([x, z]); return out }, [])
  const keys = Object.keys(ST) as Spot[]
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[3, 0, 0]} receiveShadow><planeGeometry args={[70, 26]} /><meshStandardMaterial map={floor} roughness={0.85} /></mesh>
      <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.55} metal={0.3} /></mesh>
      {legs.map(([x, z]) => <mesh key={`${x}${z}`} geometry={LEG_PAD} position={[x, 0, z]}><Metal kind="iron" grain="cast" env={2} /></mesh>)}
      <mesh rotation-x={-Math.PI / 2} position={[(X0 + X1) / 2, TOP + 0.001, 0]} receiveShadow><planeGeometry args={[X1 - X0, DEPTH]} /><meshStandardMaterial map={top} roughness={0.42} metalness={0.1} envMapIntensity={1.3} /></mesh>
      {/* 背后的遮光帘，由一盏很暗的灯从下往上抹亮一点 */}
      <mesh position={[3, 2.7, -3.4]}><planeGeometry args={[60, 5.6]} /><meshStandardMaterial map={curtain} roughness={1} /></mesh>
      <pointLight position={[ST[here], 0.5, -2.3]} intensity={10} distance={18} decay={1.2} color="#4f86a8" />
      {keys.slice(0, -1).map((k, i) => k === 'plate' ? null : <Shelf key={k} x={(ST[k] + ST[keys[i + 1]]) / 2} flip={i % 2 === 1} />)}
      <Lamp x={ST[here]} />
    </group>
  )
}
