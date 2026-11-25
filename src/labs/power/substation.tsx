// 小区配电房里的设备：一排四台低压配电柜（进线柜、电容补偿柜、两台出线柜），东侧围栏里一台油浸式变压器。
// 单位是场景单位（1 m = 10）。grid 是拓展课里两只开关的状态：进线柜合上没有、3 号楼那一路出线合上没有。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, lathe, mergeParts, type Part, type RY } from '@/lab-kit'
import { BENCH, CAB, PR, TF } from './layout'
import { FONT, makePlate, makeText } from './mats'

export interface Grid { main: boolean; out: boolean }
export const GRID_ON: Grid = { main: true, out: true }

/** 柜门上的方形指针表（96 × 96 mm）：白底刻度，kind 是 V 或 A */
function dialTex(kind: string, top: string) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!
  g.fillStyle = '#f4f3ee'; g.fillRect(0, 0, 256, 256)
  g.strokeStyle = '#1c1d1f'; g.lineWidth = 3
  const cx = 128, cy = 200, R = 150, a0 = -Math.PI / 2 - 0.8, a1 = -Math.PI / 2 + 0.8
  g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke()
  for (let i = 0; i <= 20; i++) { const a = a0 + (a1 - a0) * i / 20, l = i % 5 ? 10 : 20; g.lineWidth = i % 5 ? 2 : 3.5; g.beginPath(); g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * (R - l), cy + Math.sin(a) * (R - l)); g.stroke() }
  g.fillStyle = '#1c1d1f'; g.font = `700 44px ${FONT}`; g.textAlign = 'center'; g.fillText(kind, cx, 150)
  g.font = `500 22px ${FONT}`; g.fillText('0', cx + Math.cos(a0) * (R - 34), cy + Math.sin(a0) * (R - 34)); g.fillText(top, cx + Math.cos(a1) * (R - 40), cy + Math.sin(a1) * (R - 34))
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
function PanelMeter({ kind, top, k }: { kind: string; top: string; k: number }) {
  const tex = useMemo(() => dialTex(kind, top), [kind, top])
  const needle = useRef<THREE.Group>(null), cur = useRef(0)
  useFrame((_, d) => { cur.current += (k - cur.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.4)); if (needle.current) needle.current.rotation.z = 0.8 - 1.6 * cur.current })
  return <group>
    <RoundedBox args={[1.0, 1.0, 0.25]} radius={0.05} smoothness={2} position={[0, 0, 0.12]}><meshStandardMaterial color="#1b1c1e" roughness={0.5} /></RoundedBox>
    <mesh position={[0, 0, 0.26]}><planeGeometry args={[0.86, 0.86]} /><meshStandardMaterial map={tex} roughness={0.5} /></mesh>
    <group ref={needle} position={[0, -0.3, 0.28]}><mesh position={[0, 0.3, 0]}><boxGeometry args={[0.02, 0.6, 0.01]} /><meshBasicMaterial color="#c62e22" /></mesh></group>
  </group>
}
/** 一只指示灯：合闸红、分闸绿（配电柜的习惯） */
const Lamp = ({ c, on }: { c: string; on: boolean }) => <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.2, 0.22, 0.2, 20]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={on ? 2.2 : 0.05} toneMapped={!on} roughness={0.4} /></mesh>

/** 柜门上一排塑壳断路器的手柄（从观察窗看进去），on 时朝上 */
function Handle({ on }: { on: boolean }) {
  const g = useRef<THREE.Group>(null), k = useRef(on ? 1 : 0)
  useFrame((_, d) => { k.current += ((on ? 1 : 0) - k.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.08)); if (g.current) g.current.rotation.x = -0.5 + 1.0 * (1 - k.current) })
  return <group>
    <RoundedBox args={[1.1, 1.6, 0.5]} radius={0.06} smoothness={2} position={[0, 0, 0.25]}><meshStandardMaterial color="#2b2d30" roughness={0.5} /></RoundedBox>
    <group ref={g} position={[0, 0, 0.5]}><RoundedBox args={[0.34, 0.22, 0.6]} radius={0.05} smoothness={2} position={[0, 0, 0.3]}><meshStandardMaterial color="#d8d8d2" roughness={0.45} /></RoundedBox></group>
  </group>
}

const NAMES = [['1AA', '低压进线柜'], ['2AA', '电容补偿柜'], ['3AA', '出线柜 1–3 号楼'], ['4AA', '出线柜 4–6 号楼']]
/** 低压配电柜：浅灰的钢板柜，上门是仪表门（电压表、电流表、指示灯、转换开关），中间一扇装断路器的门，下门是百叶 */
export function Cabinets({ grid = GRID_ON }: { grid?: Grid }) {
  const { x0, w, h, d, n } = CAB, z = PR.z0 + d / 2
  const tags = useMemo(() => NAMES.map(([a, b]) => makeText([`${a}  ${b}`], { w: 512, h: 72, bg: '#d4d6d2', fg: '#26282b', size: 34 })), [])
  const louver = useMemo(() => { const P: Part[] = []; for (let i = 0; i < n; i++) for (let k = 0; k < 7; k++) P.push({ p: [x0 + w * (i + 0.5), 1.8 + k * 0.7, z + d / 2 + 0.1], s: [w - 3, 0.18, 0.25], c: '#9a9d9b', r: [0.6, 0, 0] }); return mergeParts(P) }, [x0, w, n, z, d])
  return <group>
    {Array.from({ length: n }, (_, i) => {
      const cx = x0 + w * (i + 0.5), live = grid.main && (i < 2 || i === 3 || grid.out)
      return <group key={i} position={[cx, 0, z]}>
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[w, 1, d]} /><meshStandardMaterial color="#3a3c3e" roughness={0.7} /></mesh>
        <RoundedBox args={[w - 0.1, h - 1, d]} radius={0.08} smoothness={2} position={[0, (h + 1) / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#d4d6d2" roughness={0.42} clearcoat={0.35} /></RoundedBox>
        {/* 三扇门的门缝 */}
        {[h - 6.5, 8.2].map(y => <mesh key={y} position={[0, y, d / 2 + 0.01]}><planeGeometry args={[w - 0.6, 0.06]} /><meshBasicMaterial color="#5f6264" /></mesh>)}
        <mesh position={[0, (h + 1) / 2, d / 2 + 0.012]}><planeGeometry args={[0.05, h - 1.6]} /><meshBasicMaterial color="#8a8d8f" /></mesh>
        <mesh position={[0, h - 0.9, d / 2 + 0.02]}><planeGeometry args={[w - 1, 1.1]} /><meshStandardMaterial map={tags[i]} roughness={0.6} /></mesh>
        {/* 仪表门：两只表、两只灯、一只转换开关 */}
        <group position={[0, h - 3.6, d / 2 + 0.02]}>
          <group position={[-2, 0.6, 0]}><PanelMeter kind="V" top="500" k={live ? 400 / 500 : 0} /></group>
          <group position={[0, 0.6, 0]}><PanelMeter kind="A" top={i === 0 ? '1000' : '400'} k={live ? (i === 0 ? 0.42 : i === 1 ? 0.2 : 0.5) : 0} /></group>
          <group position={[2, 0.6, 0]}><PanelMeter kind="A" top={i === 0 ? '1000' : '400'} k={live ? (i === 0 ? 0.4 : i === 1 ? 0.2 : 0.47) : 0} /></group>
          <group position={[-1.2, -1.3, 0.1]}><Lamp c="#e0392a" on={live} /></group>
          <group position={[-0.4, -1.3, 0.1]}><Lamp c="#2fbf5a" on={!live} /></group>
          <mesh position={[1.6, -1.3, 0.15]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.35, 0.38, 0.3, 24]} /><meshStandardMaterial color="#1b1c1e" roughness={0.5} /></mesh>
        </group>
        {/* 中间的门：断路器操作手柄 */}
        <group position={[0, 11.5, d / 2]}>
          {i === 0 ? <group position={[0, 0, 0]} scale={2.2}><Handle on={grid.main} /></group>
            : i === 1 ? [-2, 0, 2].map(x => <mesh key={x} position={[x, 0, 0.3]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.7, 0.7, 0.6, 24]} /><meshStandardMaterial color="#8b8f92" metalness={0.6} roughness={0.4} /></mesh>)
            : [-2.2, -0.7, 0.8, 2.3].map((x, k) => <group key={x} position={[x, 0, 0]}><Handle on={grid.main && (i === 3 || k > 0 || grid.out)} /></group>)}
        </group>
        {/* 门把手 */}
        <mesh position={[w / 2 - 0.8, 11.5, d / 2 + 0.3]}><boxGeometry args={[0.3, 1.6, 0.4]} /><Metal kind="chrome" /></mesh>
      </group>
    })}
    <mesh geometry={louver} castShadow><Painted rough={0.5} metal={0.4} /></mesh>
    {/* 柜顶的电缆桥架，从东墙进来 */}
    <mesh position={[(x0 + PR.x1) / 2 + 2, h + 1.5, PR.z0 + 2]}><boxGeometry args={[PR.x1 - x0 + 2, 1, 3]} /><Metal kind="zinc" grain="brushed" /></mesh>
  </group>
}

// ---------- 变压器 ----------
/** 瓷套管：一节节伞裙，顶上一只导电杆 */
const bushing = (n: number, r: number, step: number): RY[] => {
  const p: RY[] = [[0, 0], [r * 1.25, 0], [r * 1.25, 0.25]]
  for (let i = 0; i < n; i++) { const y = 0.3 + i * step; p.push([r, y], [r * 2.1, y + step * 0.25], [r * 2.1, y + step * 0.35], [r, y + step * 0.7]) }
  p.push([r * 0.9, 0.3 + n * step + 0.1], [0, 0.3 + n * step + 0.1])
  return p
}
/** 油浸式变压器：钢板油箱四周一圈波纹散热片，顶上三只高压瓷套管、四只低压瓷套管，背上一只储油柜和油位计，下面槽钢底座 */
export function Transformer({ grid = GRID_ON }: { grid?: Grid }) {
  const L = 17, W = 10, Hh = 12, base = 1.6
  const geo = useMemo(() => {
    const fins: THREE.BufferGeometry[] = []
    // 两条长边、两头各一排散热片
    for (let i = 0; i < 26; i++) for (const s of [-1, 1]) { if (s > 0 && i >= 10 && i <= 15) continue; const g = new THREE.BoxGeometry(0.12, Hh - 2, 2.2); g.translate(-L / 2 + 0.9 + i * (L - 1.8) / 25, base + Hh / 2, s * (W / 2 + 1.1)); fins.push(g) }
    for (let i = 0; i < 12; i++) for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(2.2, Hh - 2, 0.12); g.translate(s * (L / 2 + 1.1), base + Hh / 2, -W / 2 + 0.9 + i * (W - 1.8) / 11); fins.push(g) }
    const P: Part[] = [
      { p: [0, base / 2, 0], s: [L + 3, 0.3, W + 4], c: '#3b3d40' }, ...[-1, 1].map(s => ({ p: [0, base / 2, s * (W / 2 - 1)], s: [L + 5, base, 1.2], c: '#2e3033' } as Part)),
      { p: [0, base + Hh + 0.3, 0], s: [L + 0.6, 0.6, W + 0.6], c: '#7d8a83' },
      // 储油柜的支架
      ...[-5, 5].map(x => ({ p: [x, base + Hh + 2.2, -W / 2 + 1.5], s: [0.5, 3.4, 0.5], c: '#6e7a73' } as Part)),
      // 低压出线的铜排
      ...[-4.5, -1.5, 1.5, 4.5].map(x => ({ p: [x, base + Hh + 4.6, W / 2 - 1.6], s: [0.6, 1.2, 0.15], c: '#c08a4a' } as Part)),
    ]
    return { fins: mergeGeometries(fins), parts: mergeParts(P), hv: lathe(bushing(5, 0.42, 0.7), { segs: 28 }), lv: lathe(bushing(2, 0.38, 0.6), { segs: 24 }) }
  }, [])
  const plate = useMemo(() => makePlate(['电力变压器', '10 kV / 0.4 kV  630 kVA', '油浸式  50 Hz'], { w: 512, h: 256, size: 30 }), [])
  const tank = <meshPhysicalMaterial color="#8f9c95" roughness={0.48} clearcoat={0.3} />
  const hum = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => { if (hum.current) hum.current.emissiveIntensity = grid.main ? 0.6 + 0.2 * Math.sin(clock.elapsedTime * 3) : 0 })
  return <group position={TF}>
    <mesh geometry={geo.parts} castShadow receiveShadow><Painted rough={0.5} metal={0.3} /></mesh>
    <RoundedBox args={[L, Hh, W]} radius={0.2} smoothness={2} position={[0, base + Hh / 2, 0]} castShadow receiveShadow>{tank}</RoundedBox>
    <mesh geometry={geo.fins} castShadow receiveShadow>{tank}</mesh>
    {/* 储油柜：横着的圆筒，一头一只油位计 */}
    <mesh position={[0, base + Hh + 4.6, -W / 2 + 1.5]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[1.5, 1.5, 13, 32]} />{tank}</mesh>
    <mesh position={[6.6, base + Hh + 4.6, -W / 2 + 1.5]} rotation-z={Math.PI / 2}><cylinderGeometry args={[1.52, 1.52, 0.3, 32]} /><meshStandardMaterial color="#6d7872" roughness={0.5} /></mesh>
    <mesh position={[6.85, base + Hh + 4.6, -W / 2 + 1.5]} rotation-z={-Math.PI / 2}><circleGeometry args={[0.8, 24]} /><meshStandardMaterial ref={hum} color="#f2efe4" emissive="#ffd36a" emissiveIntensity={0} roughness={0.3} /></mesh>
    {/* 高压套管在后面一排，低压套管在前面一排 */}
    {[-4, 0, 4].map(x => <group key={x} position={[x, base + Hh + 0.6, -W / 2 + 4]}>
      <mesh geometry={geo.hv} castShadow><meshPhysicalMaterial color="#7a5a46" roughness={0.15} clearcoat={0.9} /></mesh>
      <mesh position={[0, 4.6, 0]}><cylinderGeometry args={[0.15, 0.15, 1.4, 12]} /><Metal kind="copper" /></mesh>
    </group>)}
    {[-4.5, -1.5, 1.5, 4.5].map(x => <group key={x} position={[x, base + Hh + 0.6, W / 2 - 1.6]}>
      <mesh geometry={geo.lv} castShadow><meshPhysicalMaterial color="#7a5a46" roughness={0.15} clearcoat={0.9} /></mesh>
    </group>)}
    {/* 高压电缆：从地下上来接到高压套管 */}
    {[-4, 0, 4].map(x => <mesh key={x} position={[-10, (base + Hh + 5.8) / 2, -W / 2 + 4 + x * 0.25]}><cylinderGeometry args={[0.35, 0.35, base + Hh + 5.8, 12]} /><meshStandardMaterial color="#1d1e20" roughness={0.7} /></mesh>)}
    {[-4, 0, 4].map(x => <mesh key={`h${x}`} position={[(x - 10) / 2, base + Hh + 5.8 + x * 0.05, -W / 2 + 4]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.3, 0.3, x + 10, 12]} /><meshStandardMaterial color="#1d1e20" roughness={0.7} /></mesh>)}
    {/* 低压母线槽：从低压套管走到配电房的东墙 */}
    <mesh position={[(PR.x1 + 2.4 - TF[0]) / 2 + 2.5, base + Hh + 6.2, W / 2 - 1.6]} castShadow><boxGeometry args={[TF[0] - PR.x1 - 2.4 + 4 + 5, 1.6, 2.4]} /><Metal kind="aluminum" grain="brushed" rough={0.5} /></mesh>
    <mesh position={[0, base + Hh / 2 + 1, W / 2 + 0.06]}><planeGeometry args={[4.4, 2.2]} /><meshStandardMaterial map={plate} roughness={0.5} /></mesh>
  </group>
}

// ---------- 电工值班室的工作台 ----------
/** 工作台：钢架、厚木台面、台下两只抽屉柜；后墙一块洞洞板挂着工具、安全帽和绝缘手套；台子一头一只凳子 */
export function DutyBench() {
  const geo = useMemo(() => {
    const { x0, x1, y, z0, z1 } = BENCH, P: Part[] = [], L = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, f = '#4b5866'
    for (const sx of [x0 + 0.5, x1 - 0.5]) for (const sz of [z0 + 0.5, z1 - 0.5]) P.push({ p: [sx, (y - 0.5) / 2, sz], s: [0.5, y - 0.5, 0.5], c: f })
    P.push({ p: [cx, 1.2, cz], s: [L - 1, 0.4, 0.4], c: f }, { p: [cx, y - 0.8, z1 - 0.5], s: [L - 1, 0.6, 0.4], c: f })
    // 抽屉柜：每只三层抽屉，有缝和拉手
    for (const dx of [4.5, L - 4.5]) {
      P.push({ p: [x0 + dx, 4.4, cz], s: [7, 6.6, D - 1.2], c: '#5f6f80' })
      for (let k = 0; k < 3; k++) { const yy = 2.6 + k * 1.8; P.push({ p: [x0 + dx, yy + 0.9, z1 - 0.58], s: [6.6, 0.05, 0.05], c: '#2c343c' }, { p: [x0 + dx, yy + 0.4, z1 - 0.5], s: [2.4, 0.25, 0.25], c: '#c9ccd0' }) }
    }
    // 洞洞板：灰色钢板上挂着几样工具的轮廓
    P.push({ p: [cx, 15.5, z0 + 0.1], s: [L - 2, 9, 0.2], c: '#9aa3ab' })
    const tools: [number, number, number, number, string][] = [[-14, 16, 0.4, 4, '#c43a2c'], [-12.5, 16, 0.4, 4.4, '#2b5aa8'], [-11, 16.2, 0.4, 3.6, '#e0b020'], [-8, 15.6, 1.6, 3, '#d23a2c'], [-5.6, 15.6, 1.6, 3, '#2a2b2d'], [9, 16.5, 3.4, 0.5, '#c9ccd0'], [9, 15.2, 3.4, 0.5, '#c9ccd0']]
    for (const [x, yy, w, h, c] of tools) P.push({ p: [cx + x, yy, z0 + 0.45], s: [w, h, 0.4], c })
    // 凳子
    P.push({ p: [x1 + 3.4, 4.6, cz + 4], s: [1.8, 0.5, 1.8], c: '#2b2f33', cyl: true }, { p: [x1 + 3.4, 2.3, cz + 4], s: [0.3, 4.4, 0.3], c: '#9aa1a6', cyl: true }, { p: [x1 + 3.4, 0.2, cz + 4], s: [1.6, 0.4, 1.6], c: '#2b2f33', cyl: true })
    return mergeParts(P)
  }, [])
  const top = useMemo(() => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d')!; g.fillStyle = '#a77d52'; g.fillRect(0, 0, 512, 128); for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(90,58,30,${0.05 + Math.random() * 0.12})`; g.lineWidth = 1 + Math.random() * 2; const y = Math.random() * 128; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + (Math.random() - 0.5) * 8, 340, y + (Math.random() - 0.5) * 8, 512, y); g.stroke() } for (let k = 1; k < 4; k++) { g.fillStyle = 'rgba(60,40,20,0.5)'; g.fillRect(0, k * 32, 512, 1.5) } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }, [])
  const helmet = useMemo(() => lathe([[0, 1.6], [0.9, 1.45], [1.35, 0.9], [1.5, 0.2], [1.9, 0.05], [1.9, 0], [0, 0]], { segs: 32, closed: true }), [])
  const { x0, x1, y, z0, z1 } = BENCH
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.5} metal={0.35} /></mesh>
    <RoundedBox args={[x1 - x0, 0.5, z1 - z0]} radius={0.08} smoothness={2} position={[(x0 + x1) / 2, y - 0.25, (z0 + z1) / 2]} castShadow receiveShadow><meshStandardMaterial map={top} roughness={0.6} /></RoundedBox>
    <mesh geometry={helmet} position={[(x0 + x1) / 2 + 2, 14.2, z0 + 1.6]} castShadow><meshPhysicalMaterial color="#f2c21a" roughness={0.35} clearcoat={0.6} /></mesh>
    {[0, 1.6].map(dx => <RoundedBox key={dx} args={[1.3, 3.6, 0.4]} radius={0.3} smoothness={2} position={[(x0 + x1) / 2 + 4 + dx, 15.4, z0 + 0.5]} castShadow><meshStandardMaterial color="#e2b13a" roughness={0.8} /></RoundedBox>)}
  </group>
}
