// 拓展课的三维场景：四个小实验共用一页，各有各的地方。
// 冰山在极地冰原上的水槽里；沉船在海底；太空在空间站舱内的水槽里；王冠在船厂工作台上的溢水杯里。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { CYL, G, LIQUIDS, POOL, TOP5, WRECK, kN, type CrownKey, type LiquidKey } from './physics'
import { BRIM, DockStage, ForceArrow, GlassTank, HALF, Painted, Rod, Water, mergeParts, useLiftDrag, type Label, type Part } from './dock'

export type Sub = 'ice' | 'salvage' | 'space' | 'crown'
const T_POOL = new THREE.Vector3(0.3, 3.6, 0), S_POOL: [number, number] = [8.4, 9.6]
const T_SEA = new THREE.Vector3(0.3, 3.4, 0), S_SEA: [number, number] = [9.6, 9.8], V_SEA: [number, number] = [-0.3, 0.1]
const MX = -3, MZ = 7, BENCH = 0.9
const T_BENCH = new THREE.Vector3(MX + 0.04, BENCH + 0.13, MZ), S_BENCH: [number, number] = [0.38, 0.36], V_BENCH: [number, number] = [0.5, 0.1]
const FLOOR = POOL.floor - POOL.brim
const BED = BRIM + FLOOR                                 // 海底（也是水槽底）的高度
const RISE = 3.2, WSCALE = 1.5                           // 海底那一幕：沉船画大一些，上浮的距离也放大
const wreckY = (b: number) => BED + (b - FLOOR) * RISE

/** 一堆有棱角的块：冰山、礁石都用它 */
function Chunks({ items, color, rough = 0.6 }: { items: [number, number, number, number, number][]; color: string; rough?: number }) {
  return <>{items.map(([x, y, z, r, sy], i) => <mesh key={i} position={[x, y, z]} scale={[r, r * sy, r]} rotation={[0, i * 1.7, 0]} castShadow receiveShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={color} roughness={rough} flatShading /></mesh>)}</>
}

/** 极地冰原：雪地、远近的冰山、一间红色的考察站小屋 */
function Polar() {
  const hut = useMemo(() => {
    const P: Part[] = [], R = '#c8372d'
    P.push({ p: [-9, 1.9, -7], s: [5, 2.6, 3], c: R }, { p: [-9, 3.3, -7], s: [5.3, 0.2, 3.3], c: '#e9eef2' }, { p: [-9, 1.7, -5.48], s: [1, 1.9, 0.05], c: '#2b2f33' }, { p: [-7.4, 2.2, -5.48], s: [0.9, 0.7, 0.05], c: '#bfe3f0' })
    for (const x of [-11.2, -6.8]) for (const z of [-8.2, -5.8]) P.push({ p: [x, 0.3, z], s: [0.2, 0.6, 0.2], c: '#3c4249' })
    P.push({ p: [-11.6, 4.6, -8], s: [0.06, 2.6, 0.06], c: '#9aa3ad', cyl: true }, { p: [-11.6, 6, -8], s: [0.5, 0.06, 0.5], c: '#9aa3ad', cyl: true })
    for (const [x, z, c] of [[5.5, 3.5, '#e8b21e'], [6.5, -2, '#c8372d'], [-5, 4.5, '#e8b21e']] as const) P.push({ p: [x, 0.9, z], s: [0.03, 1.8, 0.03], c: '#2b2f33', cyl: true }, { p: [x + 0.25, 1.6, z], s: [0.5, 0.3, 0.02], c })
    P.push({ p: [7.5, 0.25, 3], s: [2.2, 0.12, 0.8], c: '#8a6a45' }, { p: [7.5, 0.6, 3], s: [1.2, 0.6, 0.7], c: '#2f6f8f' })
    return mergeParts(P)
  }, [])
  const bergs: [number, number, number, number, number][] = [[-60, 2, -100, 9, 0.8], [40, 3, -115, 12, 1.1], [95, 1, -30, 8, 0.6], [-90, 2, -14, 10, 0.9], [10, 1, -130, 14, 1.2], [-14, 0.2, 6, 1.6, 0.5], [12, 0.3, 7, 2.2, 0.5], [36, 0.5, -20, 4, 0.6], [-40, 0.5, 30, 5, 0.6], [110, 3, -100, 15, 1], [-130, 3, -90, 16, 1], [70, 2, -70, 9, 0.9], [24, 1, -62, 6, 0.8]]
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[400, 48]} /><meshStandardMaterial color="#cfdae2" roughness={0.95} /></mesh>
      <Chunks items={bergs} color="#d8ecf5" rough={0.5} />
      <mesh geometry={hut} castShadow receiveShadow><Painted rough={0.7} metal={0.1} /></mesh>
    </group>
  )
}

/** 海底：沙地、礁石、水草、从水面照下来的几束光 */
function Seabed() {
  const weed = useMemo(() => {
    const P: Part[] = []
    for (let i = 0; i < 46; i++) { const a = i * 2.4, d = 4.2 + (i * 7 % 13), h = 0.5 + (i * 5 % 7) * 0.16, z = Math.sin(a) * d - 4; if (z > 0.5) continue; P.push({ p: [Math.cos(a) * d, BED + h / 2, z], s: [0.09, h, 0.03], c: i % 3 ? '#2f7d5a' : '#3f9a6a', r: [0, a, Math.sin(i) * 0.1] }) }
    return mergeParts(P)
  }, [])
  const rocks: [number, number, number, number, number][] = [[-5.5, BED + 0.4, -3, 1.6, 0.7], [5.2, BED + 0.3, -4.5, 2.1, 0.6], [-8, BED + 0.6, -9, 3, 0.8], [9, BED + 0.8, -11, 3.6, 0.9], [2, BED + 0.2, -8, 1.2, 0.5], [-3, BED + 0.15, 2.6, 0.7, 0.5], [6.5, BED + 0.2, 2, 0.9, 0.5], [-14, BED + 1, -16, 5, 0.8], [16, BED + 1, -20, 6, 0.9]]
  return (
    <group>
      <ambientLight color="#4fb4d6" intensity={0.9} />
      <mesh position={[0, BED, 0]} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[160, 40]} /><meshStandardMaterial color="#b9ad86" roughness={1} /></mesh>
      <Chunks items={rocks} color="#5d6b66" rough={0.95} />
      <mesh geometry={weed}><Painted rough={0.9} metal={0} /></mesh>
      {[[-4, -5, 0.5], [3, -9, 0.35], [8, -3, 0.42], [-9, -12, 0.3]].map(([x, z, o], i) => <mesh key={i} position={[x, BED + 9, z]} rotation-z={0.22}><cylinderGeometry args={[0.5, 2.2, 18, 20, 1, true]} /><meshBasicMaterial color="#bfeeff" transparent opacity={o * 0.16} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} /></mesh>)}
      <mesh position={[0, BED + 16, 0]} rotation-x={Math.PI / 2}><circleGeometry args={[160, 40]} /><meshBasicMaterial color="#8fd8ee" /></mesh>
    </group>
  )
}

/** 空间站舱内：白色壁板、扶手、设备柜，后墙上一扇圆舷窗。墙只画朝里的一面 */
function Station({ orbit }: { orbit: boolean }) {
  const W = 12, Hh = 7.6, D = 5, F = 9
  const earth = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256
    const g = c.getContext('2d')!
    g.fillStyle = '#04060b'; g.fillRect(0, 0, 256, 256)
    g.fillStyle = '#7cc4f5'; g.beginPath(); g.arc(128, 400, 318, 0, Math.PI * 2); g.fill()      // 大气层的一圈亮边
    g.fillStyle = '#2a7fd6'; g.beginPath(); g.arc(128, 400, 310, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#3f9a5f'; for (const [x, y, w, h] of [[70, 170, 46, 22], [170, 200, 60, 30]]) { g.beginPath(); g.ellipse(x, y, w, h, 0.3, 0, Math.PI * 2); g.fill() }
    g.fillStyle = 'rgba(255,255,255,0.8)'; for (const [x, y, w] of [[40, 150, 70], [140, 130, 90], [100, 215, 120], [200, 170, 50]]) { g.beginPath(); g.ellipse(x, y, w / 2, 7, -0.15, 0, Math.PI * 2); g.fill() }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const kit = useMemo(() => {
    const P: Part[] = [], BLUE = '#2d6fb5'
    // 壁板的拼缝、扶手、设备柜
    for (let i = -3; i <= 3; i++) P.push({ p: [i * 1.7, Hh / 2, -D + 0.02], s: [0.04, Hh, 0.04], c: '#aab2ba' })
    for (const y of [2.6, 5.2]) P.push({ p: [0, y, -D + 0.02], s: [W, 0.04, 0.04], c: '#aab2ba' })
    for (const x of [-4.4, 4.4]) { P.push({ p: [x, 3.9, -D + 0.22], s: [0.06, 2.6, 0.06], c: BLUE, cyl: true }); for (const y of [2.7, 5.1]) P.push({ p: [x, y, -D + 0.12], s: [0.06, 0.06, 0.24], c: BLUE }) }
    for (const [x, c] of [[-5.2, '#e9eef2'], [5.2, '#dfe5ea']] as const) for (let k = 0; k < 3; k++) { P.push({ p: [x, 1.1 + k * 2.1, -D + 0.5], s: [1.3, 1.9, 0.9], c }); P.push({ p: [x, 1.6 + k * 2.1, -D + 0.96], s: [0.9, 0.5, 0.03], c: k % 2 ? '#22354a' : '#3c4249' }); P.push({ p: [x - 0.3, 0.7 + k * 2.1, -D + 0.96], s: [0.12, 0.12, 0.04], c: k % 2 ? '#35c7b3' : '#e8b21e' }) }
    // 舷窗的框
    return mergeParts(P)
  }, [])
  const panel = <meshStandardMaterial color="#e6eaee" roughness={0.6} />
  const lamp = <meshBasicMaterial color="#f4f8fb" toneMapped={false} />
  return (
    <group>
      <ambientLight intensity={0.55} />
      <mesh position={[0, 0, (F - D) / 2]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[W, F + D]} /><meshStandardMaterial color="#c9d0d6" roughness={0.7} /></mesh>
      <mesh position={[0, Hh, (F - D) / 2]} rotation-x={Math.PI / 2}><planeGeometry args={[W, F + D]} />{panel}</mesh>
      <mesh position={[0, Hh / 2, -D]}><planeGeometry args={[W, Hh]} />{panel}</mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * W / 2, Hh / 2, (F - D) / 2]} rotation-y={-s * Math.PI / 2}><planeGeometry args={[F + D, Hh]} />{panel}</mesh>)}
      {[-2.6, 2.6].map(x => <mesh key={x} position={[x, Hh - 0.02, 1]} rotation-x={Math.PI / 2}><planeGeometry args={[0.5, 7]} />{lamp}</mesh>)}
      <mesh geometry={kit} castShadow><Painted rough={0.6} metal={0.2} /></mesh>
      {/* 舷窗：在轨道上看到地球的弧线，在地面上看到蓝天 */}
      <mesh position={[2.9, 5.3, -D + 0.07]}><circleGeometry args={[1.0, 48]} />{orbit ? <meshBasicMaterial key="orbit" map={earth} toneMapped={false} /> : <meshBasicMaterial key="ground" color="#9fd0f2" toneMapped={false} />}</mesh>
      <mesh position={[2.9, 5.3, -D + 0.09]}><ringGeometry args={[1.0, 1.16, 48]} /><meshStandardMaterial color="#8d949c" metalness={0.7} roughness={0.35} /></mesh>
    </group>
  )
}
const ML = 1e-6 / (Math.PI * CYL.r ** 2)                 // 量杯里每毫升水有多高（m）

export interface XProps {
  sub: Sub; liquid: LiquidKey
  ice: { side: number; level: number; bottom: number; under: number; start: number }
  wreck: { b: number; bags: number; level: number; g: number; fBuoy: number }
  space: { b: number; level: number; wet: number; g: number; fBuoy: number; mass: number; onMove: (b: number) => void; onEnd: () => void }
  crown: { item: CrownKey | null; p: number; ml: number }
}

/** 一段沉在池底的钢船体，上面系着橙色的浮筒 */
function Wreck({ b, bags }: { b: number; bags: number }) {
  const hull = useMemo(() => {
    const c = '#7a4a36', P: Part[] = [{ p: [0, 0.3, 0], s: [1.7, 0.6, 0.8], c }, { p: [1.02, 0.32, 0], s: [0.5, 0.56, 0.56], c, r: [0, Math.PI / 4, 0] }, { p: [-0.3, 0.72, 0], s: [0.6, 0.26, 0.5], c: '#8c5a43' }, { p: [0, 0.03, 0], s: [1.9, 0.06, 0.12], c: '#5e3a2b' }]
    return mergeParts(P)
  }, [])
  const y = wreckY(b)
  const spots = Array.from({ length: bags }, (_, i) => [-1.05 + (i % 4) * 0.7, i < 4 ? 0.42 : -0.42] as const)
  return (
    <group position={[0, y, 0]} scale={WSCALE}>
      <mesh geometry={hull} castShadow><Painted rough={0.9} metal={0.3} /></mesh>
      {spots.map(([x, z], i) => (
        <group key={i}>
          <Rod from={[x * 0.6, 0.6, z * 0.5]} to={[x, 1.25, z]} r={0.012}><meshStandardMaterial color="#2b2f33" /></Rod>
          <mesh position={[x, 1.72, z]} scale={[1, 1.22, 1]}><sphereGeometry args={[0.46, 24, 16]} /><meshStandardMaterial color="#f08a24" roughness={0.6} /></mesh>
        </group>
      ))}
    </group>
  )
}

function Crate() {
  const slats = useMemo(() => {
    const P: Part[] = [], c = '#8a5a30'
    for (const y of [-0.34, 0, 0.34]) for (const s of [-1, 1]) { P.push({ p: [0, y, s * 0.505], s: [1.02, 0.12, 0.03], c }); P.push({ p: [s * 0.505, y, 0], s: [0.03, 0.12, 1.02], c }) }
    return mergeParts(P)
  }, [])
  return <><RoundedBox args={[1, 1, 1]} radius={0.015} castShadow><meshStandardMaterial color="#b98650" roughness={0.85} /></RoundedBox><mesh geometry={slats}><Painted rough={0.9} metal={0} /></mesh></>
}

function PoolSubs({ sub, liquid, ice, wreck, space }: XProps) {
  const stir = useRef(0.15)
  const grab = useLiftDrag(TOP5 - space.b, TOP5 - FLOOR, v => space.onMove(TOP5 - v), T_POOL, space.onEnd)
  const level = sub === 'ice' ? ice.level : sub === 'salvage' ? wreck.level : space.level
  const k = sub === 'salvage' ? 1.6 / Math.max(wreck.g, wreck.fBuoy) : 1.5 / (LIQUIDS[liquid].rho * G)
  const sMid = BRIM + space.b + 0.5
  return (
    <group>
      {sub === 'ice' && <Polar />}
      {sub === 'salvage' && <Seabed />}
      {sub === 'space' && <Station orbit={space.g === 0} />}
      {sub !== 'salvage' && <><GlassTank lid={sub === 'space'} /><Water levelY={BRIM + level} color={LIQUIDS[liquid].color} stir={stir} /></>}
      {sub === 'ice' && <>
        {ice.side > 0.02 && <RoundedBox args={[ice.side, ice.side, ice.side]} radius={Math.min(0.06, ice.side * 0.2)} smoothness={4} position={[0, BRIM + ice.bottom + ice.side / 2, 0]}>
          <meshPhysicalMaterial color="#e6f6fc" transparent opacity={0.85} roughness={0.12} envMapIntensity={1.6} clearcoat={1} />
        </RoundedBox>}
        {/* 融化前的水面位置：池壁上一道黄线 */}
        <mesh position={[0, BRIM + ice.start, -HALF + 0.012]}><planeGeometry args={[POOL.side, 0.03]} /><meshBasicMaterial color="#ffe14d" toneMapped={false} /></mesh>
        <mesh position={[HALF - 0.012, BRIM + ice.start, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[POOL.side, 0.03]} /><meshBasicMaterial color="#ffe14d" toneMapped={false} /></mesh>
      </>}
      {sub === 'salvage' && <>
        <Wreck b={wreck.b} bags={wreck.bags} />
        <ForceArrow tip={[-2, wreckY(wreck.b) + 0.6 - wreck.g * k, 0.9]} dir={[0, -1, 0]} len={wreck.g * k} color="#ff8a5c" thick={1.3} />
        <ForceArrow tip={[2, wreckY(wreck.b) + 0.6 + wreck.fBuoy * k, 0.9]} dir={[0, 1, 0]} len={wreck.fBuoy * k} color="#35c7b3" thick={1.3} />
      </>}
      {sub === 'space' && <>
        <group {...grab} position={[0, sMid, 0]}><Crate /><mesh visible={false}><boxGeometry args={[1.4, 1.4, 1.4]} /></mesh></group>
        <ForceArrow tip={[-0.3, sMid - space.mass * space.g * k, 0.75]} dir={[0, -1, 0]} len={space.mass * space.g * k} color="#ff8a5c" />
        <ForceArrow tip={[0.3, sMid + space.fBuoy * k, 0.75]} dir={[0, 1, 0]} len={space.fBuoy * k} color="#35c7b3" />
      </>}
    </group>
  )
}

/** 王冠：一圈带尖齿的冠圈（齿尖顶着小金珠），上下各一道滚边，冠圈上镶着红蓝宝石 */
const CR = { r: 0.026, band: 0.012, peak: 0.022, n: 8 }
function Crown() {
  const shell = useMemo(() => {
    const seg = 128, pos: number[] = [], idx: number[] = []
    for (const [k, rr] of [[0, CR.r], [1, CR.r - 0.0016]] as const) {       // 外壁和内壁
      for (let i = 0; i <= seg; i++) {
        const t = i / seg, a = t * Math.PI * 2, u = (t * CR.n) % 1
        const top = CR.band + CR.peak * Math.pow(1 - Math.abs(u * 2 - 1), 1.35) * ((Math.floor(t * CR.n) % 2) ? 0.72 : 1)   // 一高一低的尖齿
        pos.push(Math.cos(a) * rr, 0, Math.sin(a) * rr, Math.cos(a) * rr, top, Math.sin(a) * rr)
      }
      const o = k * (seg + 1) * 2
      for (let i = 0; i < seg; i++) { const p = o + i * 2; if (k) idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); else idx.push(p, p + 2, p + 1, p + 1, p + 2, p + 3) }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
    return g
  }, [])
  const gold = <meshStandardMaterial color="#e9b830" metalness={1} roughness={0.22} envMapIntensity={1.6} side={THREE.DoubleSide} />
  const at = (i: number, r: number, y: number): [number, number, number] => { const a = (i + 0.5) / CR.n * Math.PI * 2; return [Math.cos(a) * r, y, Math.sin(a) * r] }
  return (
    <group position={[0, -0.018, 0]}>
      <mesh geometry={shell} castShadow>{gold}</mesh>
      {[0.0012, CR.band].map(y => <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2} castShadow><torusGeometry args={[CR.r, 0.0018, 10, 64]} />{gold}</mesh>)}
      {Array.from({ length: CR.n }, (_, i) => <group key={i}>
        <mesh position={at(i, CR.r - 0.0008, CR.band + CR.peak * (i % 2 ? 0.72 : 1) + 0.0018)} castShadow><sphereGeometry args={[0.0026, 16, 12]} />{gold}</mesh>
        <mesh position={at(i, CR.r + 0.0012, CR.band * 0.52)} scale={[1, 1.25, 1]}><sphereGeometry args={[0.0027, 16, 12]} /><meshPhysicalMaterial color={i % 2 ? '#1f5fd0' : '#c81e3a'} roughness={0.08} metalness={0.1} clearcoat={1} envMapIntensity={1.8} /></mesh>
      </group>)}
    </group>
  )
}
/** 金块：上窄下宽的金锭 */
function Ingot() {
  return <mesh rotation-y={Math.PI / 4} scale={[1.5, 1, 0.82]} castShadow><cylinderGeometry args={[0.014, 0.019, 0.022, 4]} /><meshStandardMaterial color="#e9b830" metalness={1} roughness={0.25} envMapIntensity={1.6} flatShading /></mesh>
}

/** 工作台上的溢水杯和量杯：溢水杯装满到溢水口，把金块或王冠放进去，挤出来的水流进旁边的量杯 */
const CUP = { r: 0.048, h: 0.12, stand: 0.075 }          // 溢水杯：内半径、溢水口离杯底多高、垫高多少
const JAR = { x: 0.105, h: 0.085 }                       // 量杯：在溢水杯右边多远、杯高
function CrownBench({ crown }: { crown: XProps['crown'] }) {
  const spin = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (spin.current) spin.current.rotation.y = clock.elapsedTime * 0.4 })
  const base = BENCH + CUP.stand, lip = base + CUP.h, h = crown.ml * ML
  const glass = <meshBasicMaterial color="#ffffff" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
  const rim = <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
  const y = lip + 0.12 - crown.p * (lip + 0.12 - base - 0.022)      // 从杯口上方落到杯底
  const pouring = crown.p > 0.55 && crown.p < 0.82
  return (
    <group position={[MX, 0, MZ]}>
      <mesh position={[0, BENCH - 0.03, 0]} castShadow receiveShadow><boxGeometry args={[1.5, 0.06, 0.8]} /><meshStandardMaterial color="#6d757c" metalness={0.5} roughness={0.5} /></mesh>
      {[[-0.68, -0.33], [0.68, -0.33], [-0.68, 0.33], [0.68, 0.33]].map(([x, z], i) => <mesh key={i} position={[x, BENCH / 2 - 0.03, z]}><boxGeometry args={[0.05, BENCH - 0.06, 0.05]} /><meshStandardMaterial color="#3c4249" /></mesh>)}
      {/* 垫块：把溢水杯垫高，溢水口才够得着量杯 */}
      <mesh position={[0, BENCH + CUP.stand / 2, 0]} castShadow><boxGeometry args={[0.14, CUP.stand, 0.14]} /><meshStandardMaterial color="#8a6a45" roughness={0.8} /></mesh>
      {/* 溢水杯：水一直满到溢水口 */}
      <mesh position={[0, base + CUP.h / 2, 0]} renderOrder={2}><cylinderGeometry args={[CUP.r - 0.001, CUP.r - 0.001, CUP.h, 40]} /><meshBasicMaterial color="#1b8fc8" transparent opacity={0.36} depthWrite={false} /></mesh>
      <mesh position={[0, base + (CUP.h + 0.02) / 2, 0]} renderOrder={3}><cylinderGeometry args={[CUP.r + 0.002, CUP.r + 0.002, CUP.h + 0.02, 40, 1, true]} />{glass}</mesh>
      {[lip + 0.02, base + 0.001].map(t => <mesh key={t} position={[0, t, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[CUP.r + 0.002, 0.0016, 8, 48]} />{rim}</mesh>)}
      <mesh position={[CUP.r + 0.016, lip - 0.004, 0]} rotation-z={Math.PI / 2 + 0.3}><cylinderGeometry args={[0.005, 0.005, 0.036, 12]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.6} /></mesh>
      {/* 流进量杯的那一股水 */}
      {pouring && <mesh position={[JAR.x - 0.004, (lip - 0.012 + BENCH + h) / 2, 0]}><cylinderGeometry args={[0.0022, 0.0022, lip - 0.012 - BENCH - h, 8]} /><meshBasicMaterial color="#5cc4e6" transparent opacity={0.8} /></mesh>}
      {/* 量杯：接住溢出来的水，壁上每 10 mL 一道刻度 */}
      <group position={[JAR.x, BENCH + 0.004, 0]}>
        {h > 0.0005 && <mesh position={[0, h / 2, 0]} renderOrder={2}><cylinderGeometry args={[CYL.r - 0.001, CYL.r - 0.001, h, 32]} /><meshBasicMaterial color="#1b8fc8" transparent opacity={0.5} depthWrite={false} /></mesh>}
        <mesh position={[0, JAR.h / 2, 0]} renderOrder={3}><cylinderGeometry args={[CYL.r + 0.0015, CYL.r + 0.0015, JAR.h, 32, 1, true]} />{glass}</mesh>
        {[JAR.h, 0.001].map(t => <mesh key={t} position={[0, t, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[CYL.r + 0.0015, 0.0012, 8, 40]} />{rim}</mesh>)}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => <mesh key={v} position={[0, v * ML, CYL.r + 0.002]}><boxGeometry args={[v % 50 ? 0.012 : 0.022, 0.001, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
      </group>
      {crown.item && <group ref={spin} position={[0, y, 0]}>{crown.item === 'gold' ? <Ingot /> : <Crown />}</group>}
      {/* 背板：挡住后面的杂物，杯里的水和金色才显眼 */}
      <mesh position={[0.2, BENCH + 0.5, -0.36]} receiveShadow><boxGeometry args={[3.2, 1.2, 0.03]} /><meshStandardMaterial color="#27333a" roughness={0.9} /></mesh>
    </group>
  )
}

export default function SceneX(props: XProps) {
  const { sub, liquid, ice, wreck, space, crown } = props
  const liq: Label = { id: 'liq', at: [HALF + 0.35, BRIM - 0.1, HALF + 0.2], className: 'scene-tag -translate-y-1/2', children: <><small>{sub === 'salvage' ? '这里是' : '槽里是'}</small>{LIQUIDS[liquid].name}</> }
  const labels: Label[] = sub === 'ice' ? [liq,
    { id: 'under', at: [0.65, BRIM + ice.bottom + ice.side * 0.4, 0.55], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: ice.side > 0.25 ? 1 : 0 }, children: <><small>水下</small>{Math.round(ice.under * 100)}%</> },
    { id: 'mark', at: [-HALF - 0.2, BRIM + ice.start, HALF + 0.15], ax: 1, className: 'scene-name -translate-y-1/2', children: '黄线：融化前的水面' },
  ] : sub === 'salvage' ? [{ ...liq, at: [3.6, BED + 0.5, 1.5] },
    { id: 'fB', at: [2.3, wreckY(wreck.b) + 1.5, 0.9], className: 'scene-tag key -translate-y-1/2', children: <><small>F浮</small>{kN(wreck.fBuoy)} kN</> },
    { id: 'fG', at: [-2.3, wreckY(wreck.b) - 0.1, 0.9], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small style={{ color: '#d2542a' }}>G</small>{kN(wreck.g)} kN</> },
    { id: 'nBag', at: [0, wreckY(wreck.b) + 3.9, 0], ax: 0.5, name: true, className: 'scene-name', children: `浮筒：每只 ${WRECK.bagV} m³` },
  ] : sub === 'space' ? [liq,
    { id: 'fB', at: [0.5, BRIM + space.b + 0.9, 0.75], className: 'scene-tag key -translate-y-1/2', children: <><small>F浮</small>{kN(space.fBuoy)} kN</> },
    { id: 'g', at: [-HALF - 0.2, BRIM + 0.4, HALF + 0.15], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>{space.g === 0 ? '在轨道上 g' : '在地面 g'}</small>{space.g === 0 ? '≈ 0' : '9.8 N/kg'}</> },
    { id: 'nWin', at: [2.9, 6.6, -4.9], ax: 0.5, name: true, className: 'scene-name', children: space.g === 0 ? '舷窗外：地球' : '舷窗外：蓝天（还在地面训练舱）' },
  ] : [
    { id: 'ml', at: [MX + JAR.x + CYL.r + 0.012, BENCH + 0.004 + Math.max(0.012, crown.ml * ML), MZ], className: 'scene-tag key -translate-y-1/2', children: <><small>量杯</small>{crown.ml.toFixed(0)} mL</> },
    { id: 'nCyl', at: [MX - CUP.r - 0.012, BENCH + CUP.stand + CUP.h * 0.6, MZ], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '溢水杯 · 水满到溢水口' },
  ]
  const bench = sub === 'crown'
  return (
    <DockStage labels={labels} target={bench ? T_BENCH : sub === 'salvage' ? T_SEA : T_POOL} span={bench ? S_BENCH : sub === 'salvage' ? S_SEA : S_POOL} view={bench ? V_BENCH : sub === 'salvage' ? V_SEA : undefined}
      indoor={!bench} sky={bench || sub === 'ice'} backdrop={sub === 'salvage' ? '#0e4558' : '#06080b'} fog={sub === 'salvage' ? [4, 46] : [70, 420]} sun={sub === 'salvage' ? 1.3 : sub === 'space' ? 1.6 : sub === 'ice' ? 2.3 : 3.4}>
      <PoolSubs {...props} />
      {bench && <CrownBench crown={crown} />}
    </DockStage>
  )
}
