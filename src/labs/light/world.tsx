// 光的波动性和光电效应实验室的大场景：一间光学暗室。靠墙一排五张光学平台，从左到右是
// 激光双缝台、双缝干涉仪台、薄膜台、衍射和偏振台、光电效应台。整个实验室只有这一个世界，换课时画布不重建，镜头沿着平台飞过去。
// 只有正在上课的那一张台子头顶的射灯是亮的，别的台子留在暗处。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Metal, Painted, disc, lathe, mergeParts, type Part } from '@/lab-kit'

/** 台面高度、光路（光轴）的高度 */
export const TOP = 0.9, AX = TOP + 0.8
/** 五张平台的中心位置（x） */
export const ST = { slit: -30, rig: -15, film: 0, wave: 15, photo: 30 }
export type Spot = keyof typeof ST
/** 每张平台的长和进深 */
export const TW = 8.2, TD = 2.9
/** 暗室里的舞台设置：不画天空，背景近黑，环境光调小，亮的东西带一圈泛光 */
export const DARK = { sky: false, backdrop: '#06080b', env: 0.55, sun: 0, fog: [14, 30] as [number, number], bloom: 0.8, studio: true }
/** 各课交给大场景的要求：现在在哪张台子上课，射灯开多亮（看条纹时调暗） */
export interface Want { at: Spot; lamp?: number }

/** 光学平台的台面：哑光的不锈钢面板，上面一格一格的螺纹孔 */
function makeBoard() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#3d4349'; g.fillRect(0, 0, S, S)
  let s = 5; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.035})`; g.fillRect(rnd() * S, rnd() * S, 6 + rnd() * 30, 1) }   // 拉丝的细纹
  for (const x of [64, 192]) for (const y of [64, 192]) {
    const r = g.createRadialGradient(x, y, 2, x, y, 13); r.addColorStop(0, '#040608'); r.addColorStop(0.6, '#0a0d10'); r.addColorStop(0.7, '#7d868e'); r.addColorStop(0.86, '#4a5158'); r.addColorStop(1, 'rgba(61,67,73,0)')
    g.fillStyle = r; g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fill()
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 遮光帘：一道道竖着的褶 */
function makeCurtain() {
  const W = 512, c = document.createElement('canvas'); c.width = W; c.height = 8
  const g = c.getContext('2d')!
  for (let x = 0; x < W; x++) { const k = 0.5 + 0.5 * Math.sin(x / W * Math.PI * 2 * 11) * Math.sin(x / W * Math.PI * 2 * 3 + 1); const v = Math.round(9 + 20 * k); g.fillStyle = `rgb(${v},${v + 1},${v + 5})`; g.fillRect(x, 0, 1, 8) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping
  return t
}
/** 地面：深色的环氧地坪，带一点深浅不匀 */
function makeFloor() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#15191d'; g.fillRect(0, 0, S, S)
  let s = 11; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
  for (let i = 0; i < 60; i++) { const x = rnd() * S, y = rnd() * S, r = 20 + rnd() * 50, q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(${rnd() < 0.5 ? '40,46,52' : '8,10,12'},0.35)`); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/** 头顶的射灯：整间暗室只开正在上课的那一张台子上方的一盏 */
function Lamp({ x, power }: { x: number; power: number }) {
  const aim = useMemo(() => new THREE.Object3D(), [])
  aim.position.set(x, TOP, 0)
  return <>
    <primitive object={aim} />
    <spotLight position={[x - 1.2, 5.2, 3.4]} target={aim} angle={0.72} penumbra={1} intensity={power} distance={18} decay={1.5} color="#dfe6f5" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0008} />
    <pointLight position={[x + 2.5, 2.2, -2.2]} intensity={power * 0.05} distance={9} decay={1.4} color="#5a7fb8" />
  </>
}

// 隔振腿：一根粗圆筒，上下各一圈法兰，顶上是气囊的波纹
const LEG = lathe([[0, 0], [0.2, 0], [0.2, 0.03], [0.15, 0.04], [0.15, TOP - 0.42], [0.17, TOP - 0.41], [0.17, TOP - 0.37], [0.13, TOP - 0.36], [0.15, TOP - 0.33], [0.13, TOP - 0.3], [0.16, TOP - 0.285], [0.16, TOP - 0.26], [0, TOP - 0.26]], { segs: 32 })
const FOOT = disc(0.05, 0.012)

export function World({ at, lamp = 150 }: Partial<Want>) {
  const board = useMemo(() => { const t = makeBoard(); t.repeat.set(TW / 0.5, TD / 0.5); return t }, [])
  const curtain = useMemo(() => { const t = makeCurtain(); t.repeat.set(11, 1); return t }, [])
  const floor = useMemo(() => { const t = makeFloor(); t.repeat.set(17, 4); return t }, [])
  const geo = useMemo(() => {
    const parts: Part[] = []
    for (const x of Object.values(ST)) {
      // 台体：厚厚的蜂窝夹芯板，侧面黑色，上下各包一道不锈钢边
      parts.push({ p: [x, TOP - 0.13, 0], s: [TW, 0.22, TD], c: '#121518' })
      parts.push({ p: [x, TOP - 0.012, 0], s: [TW + 0.02, 0.024, TD + 0.02], c: '#565e66' })
      parts.push({ p: [x, TOP - 0.25, 0], s: [TW + 0.02, 0.022, TD + 0.02], c: '#3b4248' })
      // 腿之间的横撑
      for (const z of [-TD / 2 + 0.34, TD / 2 - 0.34]) parts.push({ p: [x, 0.22, z], s: [TW - 1.1, 0.07, 0.07], c: '#1b1f23' })
      for (const sx of [-1, 1]) parts.push({ p: [x + sx * (TW / 2 - 0.5), 0.22, 0], s: [0.07, 0.07, TD - 0.68], c: '#1b1f23' })
    }
    // 墙根的线槽
    parts.push({ p: [0, 0.12, -3.3], s: [100, 0.16, 0.08], c: '#22272c' })
    return mergeParts(parts)
  }, [])
  const legs = useMemo(() => Object.values(ST).flatMap(x => [-1, 1].flatMap(sx => [-1, 1].map(sz => [x + sx * (TW / 2 - 0.5), 0, sz * (TD / 2 - 0.34)] as [number, number, number]))), [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[110, 26]} /><meshStandardMaterial map={floor} roughness={0.55} metalness={0.1} envMapIntensity={0.5} /></mesh>
      <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.55} metal={0.4} /></mesh>
      {Object.values(ST).map(x => <mesh key={x} rotation-x={-Math.PI / 2} position={[x, TOP + 0.001, 0]} receiveShadow><planeGeometry args={[TW, TD]} /><meshStandardMaterial map={board} roughness={0.52} metalness={0.5} envMapIntensity={1.1} /></mesh>)}
      {legs.map((p, i) => <mesh key={i} geometry={LEG} position={p} castShadow><meshStandardMaterial color="#20252a" metalness={0.6} roughness={0.42} envMapIntensity={2} /></mesh>)}
      {legs.map((p, i) => <mesh key={i} geometry={FOOT} position={[p[0], TOP - 0.262, p[2]]}><Metal kind="stainless" grain="turned" env={3} /></mesh>)}
      {/* 背后的遮光帘和帘子上方的滑轨 */}
      <mesh position={[0, 2.9, -3.4]}><planeGeometry args={[100, 6]} /><meshStandardMaterial map={curtain} roughness={1} /></mesh>
      <mesh position={[0, 5.86, -3.36]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.04, 0.04, 100, 10]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <Lamp x={ST[at ?? 'slit']} power={lamp} />
    </group>
  )
}
