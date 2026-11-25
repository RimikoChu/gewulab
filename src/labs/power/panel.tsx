// 配电的器件：楼道电表箱和里面的电子式电能表、户内配电箱（导轨上的总开关、漏电保护器、各路空气开关）、瓷插式保险盒、86 型插座和开关面板。
// 器件按厘米写（外面套 Cm），原点在器件背面正中，正面朝 +z。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { FONT, makePlate, makeText } from './mats'
import { CM, Cm, MB, type V3 } from './layout'

// ---------- 电能表 ----------
/** 液晶屏：灰绿的底、黑色的笔段数字，右下角 kWh */
function useLcd(text: string, unit = 'kWh') {
  const { t, g } = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 160
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return { t, g: c.getContext('2d')! }
  }, [])
  useEffect(() => {
    const q = g.createLinearGradient(0, 0, 0, 160); q.addColorStop(0, '#b9c9a8'); q.addColorStop(1, '#a5b893')
    g.fillStyle = q; g.fillRect(0, 0, 512, 160)
    // 熄灭的笔段淡淡地透出来
    g.font = '700 112px ui-monospace, "SF Mono", Menlo, monospace'; g.textAlign = 'right'; g.textBaseline = 'middle'
    g.fillStyle = 'rgba(40,52,34,0.08)'; g.fillText('88888.8', 410, 82)
    g.fillStyle = '#1d2418'; g.fillText(text, 410, 82)
    g.font = `600 34px ${FONT}`; g.textAlign = 'left'; g.fillText(unit, 418, 118)
    g.font = `500 26px ${FONT}`; g.fillText('总', 22, 34)
    t.needsUpdate = true
  }, [text, unit, g, t])
  return t
}
/** 单相电子式电能表：外壳 13 × 21 × 6.5 cm，上面透明罩里是液晶屏、脉冲灯和铭牌，下面灰色的接线盒盖 */
export function EnergyMeter({ reading, rate = 0, no }: { reading: number; rate?: number; no: string }) {
  const lcd = useLcd(reading.toFixed(1).padStart(7, '0'))
  const tx = useMemo(() => ({
    plate: makePlate(['单相电子式电能表', '220 V  10(40) A  50 Hz', '3200 imp/(kW·h)'], { w: 512, h: 256, bg: '#e9e8e2', size: 32 }),
    no: makeText([no], { w: 128, h: 64, bg: '#e9e8e2', fg: '#2b2d30', size: 44 }),
  }), [no])
  // 脉冲灯：每用 1/3200 kW·h 闪一下。rate 是每秒闪几次
  const led = useRef<THREE.MeshStandardMaterial>(null), ph = useRef(0)
  useFrame((_, d) => {
    ph.current += Math.min(d, 1 / 30) * rate
    const on = rate > 0 && (ph.current % 1) < Math.min(0.5, 0.06 * Math.max(1, rate))
    if (led.current) led.current.emissiveIntensity = on ? 3 : 0
  })
  const shell = <meshPhysicalMaterial color="#dcdcd6" roughness={0.45} clearcoat={0.3} />
  return <group>
    {/* 底壳 */}
    <RoundedBox args={[13, 21, 4.2]} radius={0.6} smoothness={3} position={[0, 0, 2.1]} castShadow>{shell}</RoundedBox>
    {/* 上半部分的面板和透明罩 */}
    <mesh position={[0, 3.6, 4.25]}><planeGeometry args={[11.6, 12.4]} /><meshStandardMaterial color="#ecebe5" roughness={0.6} /></mesh>
    <mesh position={[0, 6.3, 4.27]}><planeGeometry args={[9.2, 2.9]} /><meshStandardMaterial map={lcd} roughness={0.35} /></mesh>
    <mesh position={[0, 6.3, 4.26]}><planeGeometry args={[9.82, 3.4]} /><meshStandardMaterial color="#2a2c2e" roughness={0.5} /></mesh>
    <mesh position={[0, 1.4, 4.27]}><planeGeometry args={[10, 5]} /><meshStandardMaterial map={tx.plate} roughness={0.6} /></mesh>
    <mesh position={[3.8, 3.85, 4.3]}><circleGeometry args={[0.32, 20]} /><meshStandardMaterial ref={led} color="#5a1410" emissive="#ff2a1a" emissiveIntensity={0} toneMapped={false} /></mesh>
    <mesh position={[-4.2, 3.85, 4.28]}><planeGeometry args={[1.6, 0.8]} /><meshStandardMaterial map={tx.no} roughness={0.6} /></mesh>
    <RoundedBox args={[12.2, 13.2, 1.4]} radius={0.5} smoothness={3} position={[0, 3.6, 4.6]}>
      <meshPhysicalMaterial color="#ffffff" transparent opacity={0.14} roughness={0.05} metalness={0} envMapIntensity={1.6} depthWrite={false} />
    </RoundedBox>
    {/* 接线盒盖和铅封螺钉 */}
    <RoundedBox args={[12.6, 6.4, 2.2]} radius={0.5} smoothness={3} position={[0, -6.9, 4.4]} castShadow><meshPhysicalMaterial color="#8d9196" roughness={0.5} /></RoundedBox>
    {[-4, 4].map(x => <mesh key={x} position={[x, -6.4, 5.55]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.36, 0.36, 0.2, 16]} /><Metal kind="zinc" /></mesh>)}
    <mesh position={[4, -7.6, 5.6]}><sphereGeometry args={[0.32, 12, 8]} /><meshStandardMaterial color="#c43a2c" roughness={0.6} /></mesh>
    {/* 进出线：四根穿出接线盒 */}
    {[-4.5, -1.5, 1.5, 4.5].map((x, i) => <mesh key={x} position={[x, -12, 3.2]}><cylinderGeometry args={[0.36, 0.36, 4, 10]} /><meshStandardMaterial color={i % 2 ? '#2a5bb0' : '#b8342a'} roughness={0.5} /></mesh>)}
  </group>
}

/** 楼道电表箱：灰白的钢板箱，带玻璃观察窗的门，里面两排六只电能表。102 的示数和闪的快慢由当前这一课决定 */
const METERS: { no: string; r: number }[] = [{ no: '101', r: 5021.7 }, { no: '102', r: 0 }, { no: '103', r: 2186.3 }, { no: '201', r: 4410.9 }, { no: '202', r: 3870.2 }, { no: '203', r: 1592.6 }]
export const METER_SLOT = (i: number): V3 => [-19 + (i % 3) * 19, (i < 3 ? 13 : -15), 0]
export function MeterBox({ reading = 3268.4, rate = 0 }: { reading?: number; rate?: number }) {
  const W = 66, Hh = 72, D = 16
  const steel = <meshPhysicalMaterial color="#d6d8d4" roughness={0.42} clearcoat={0.35} />
  const tag = useMemo(() => makeText(['计量箱'], { w: 256, h: 64, bg: '#d6d8d4', fg: '#3a3c3e', size: 36 }), [])
  return <Cm p={[MB[0], MB[1], MB[2]]}>
    {/* 箱体（嵌在墙上，凸出 4 cm），里面的背板 */}
    <mesh position={[0, 0, D / 2 - 12]}><boxGeometry args={[W, Hh, D]} /><meshStandardMaterial color="#c9cbc6" roughness={0.6} side={THREE.BackSide} /></mesh>
    <mesh position={[0, 0, -11.9]}><planeGeometry args={[W - 1, Hh - 1]} /><meshStandardMaterial color="#e4e4df" roughness={0.7} /></mesh>
    {/* 门框和门：门上一大块观察窗 */}
    {([[0, Hh / 2 - 2, W, 4], [0, -Hh / 2 + 2, W, 4], [-W / 2 + 2, 0, 4, Hh], [W / 2 - 2, 0, 4, Hh]] as [number, number, number, number][]).map(([x, y, w, h], i) =>
      <RoundedBox key={i} args={[w, h, 4]} radius={0.5} smoothness={2} position={[x, y, 2]} castShadow>{steel}</RoundedBox>)}
    {([[0, 0, W - 8, 2.2]] as [number, number, number, number][]).map(([x, y, w, h], i) => <RoundedBox key={i} args={[w, h, 2]} radius={0.4} smoothness={2} position={[x, y, 2.6]}>{steel}</RoundedBox>)}
    <mesh position={[0, 0, 3.3]}><planeGeometry args={[W - 8, Hh - 8]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.1} roughness={0.04} envMapIntensity={1.8} depthWrite={false} /></mesh>
    <mesh position={[W / 2 - 2, -4, 4.3]}><boxGeometry args={[1.2, 6, 1]} /><Metal kind="chrome" /></mesh>
    <mesh position={[0, Hh / 2 - 2, 4.05]}><planeGeometry args={[8, 2]} /><meshStandardMaterial map={tag} roughness={0.6} /></mesh>
    {/* 装表的横档 */}
    {[13, -15].map(y => <mesh key={y} position={[0, y, -11]}><boxGeometry args={[W - 4, 2.4, 1]} /><Metal kind="zinc" grain="brushed" /></mesh>)}
    {METERS.map((m, i) => { const s = METER_SLOT(i); return <group key={m.no} position={[s[0], s[1], -11]}><EnergyMeter no={m.no} reading={m.no === '102' ? reading : m.r} rate={m.no === '102' ? rate : 0.3 + i * 0.07} /></group> })}
    {/* 下面出线的线管 */}
    {[-19, 0, 19].map(x => <mesh key={x} position={[x, -Hh / 2 - 20, -8]}><cylinderGeometry args={[1.2, 1.2, 40, 14]} /><meshStandardMaterial color="#e6e5df" roughness={0.6} /></mesh>)}
  </Cm>
}

// ---------- 户内配电箱 ----------
/** 配电箱里各个开关：true 是合上 */
export interface BoxState { main?: boolean; rcd?: boolean; light?: boolean; socket?: boolean; kitchen?: boolean; ac?: boolean; fuse?: 'ok' | 'blown' | null }
export const BOX_ON: BoxState = { main: true, rcd: true, light: true, socket: true, kitchen: true, ac: true, fuse: null }
/** 导轨上的模块：宽度（cm，1P 是 1.8）、名字、是不是两极 */
const MODS = [{ k: 'main', w: 3.6, name: '总开关' }, { k: 'rcd', w: 3.6, name: '漏电保护' }, { k: 'light', w: 1.8, name: '照明' }, { k: 'socket', w: 1.8, name: '插座' }, { k: 'kitchen', w: 1.8, name: '厨房' }, { k: 'ac', w: 1.8, name: '空调' }] as const
export type ModKey = typeof MODS[number]['k']
/** 每个模块中心的 x（cm，以箱子中心为原点） */
export const modX = (() => { const out: Record<string, number> = {}; let x = -9.2; for (const m of MODS) { out[m.k] = x + m.w / 2; x += m.w + 0.15 } return out })()
/** 模块手柄位置（cm，相对箱子中心）：标签从这里引出 */
export const modAt = (k: ModKey): V3 => [modX[k], 1.2, 6]

/** 一只导轨式断路器：白色外壳，前面凸起的手柄，上合下分；rcd 多一只试验按钮 */
function Breaker({ w, on, rcd, name }: { w: number; on: boolean; rcd?: boolean; name: string }) {
  const k = useRef(on ? 1 : 0), handle = useRef<THREE.Group>(null)
  useFrame((_, d) => { k.current += ((on ? 1 : 0) - k.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.06)); if (handle.current) handle.current.rotation.x = -0.55 + 1.1 * (1 - k.current) })
  const body = <meshPhysicalMaterial color="#f1f0eb" roughness={0.4} clearcoat={0.3} />
  const label = useMemo(() => makeText([name], { w: 256, h: 96, bg: '#f7f6f1', fg: '#2b2d30', size: name.length > 3 ? 46 : 58 }), [name])
  return <group>
    <RoundedBox args={[w - 0.08, 8.6, 6.4]} radius={0.25} smoothness={2} position={[0, 0, 3.2]} castShadow>{body}</RoundedBox>
    <RoundedBox args={[w - 0.3, 4.4, 1.6]} radius={0.2} smoothness={2} position={[0, 0, 7]}>{body}</RoundedBox>
    {/* 手柄：合上时朝上；露出的一小块绿色（合）或红色（分）指示窗 */}
    <group ref={handle} position={[0, 0, 7.6]}>
      <RoundedBox args={[Math.min(w - 0.8, 1.6), 0.8, 2.4]} radius={0.2} smoothness={2} position={[0, 0, 1.2]}><meshPhysicalMaterial color={rcd ? '#2f6fd0' : '#2b2d31'} roughness={0.45} clearcoat={0.3} /></RoundedBox>
    </group>
    <mesh position={[0, -3.2, 7.81]}><planeGeometry args={[Math.min(w - 0.8, 1.2), 0.5]} /><meshBasicMaterial color={on ? '#2aa84f' : '#d23a2c'} /></mesh>
    {rcd && <mesh position={[0, 2.8, 7.85]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.45, 0.45, 0.4, 16]} /><meshStandardMaterial color="#e2c23a" roughness={0.5} /></mesh>}
    <mesh position={[0, -5.6, 6.43]}><planeGeometry args={[w - 0.2, 1.1]} /><meshStandardMaterial map={label} roughness={0.7} /></mesh>
  </group>
}

/** 瓷插式保险盒：白瓷底座，上面插着瓷盖，两头黄铜触点之间一根保险丝；熔断时丝断开，留下一片熏黑 */
export function FuseHolder({ blown }: { blown: boolean }) {
  const porcelain = <meshPhysicalMaterial color="#f3f1ea" roughness={0.18} clearcoat={0.8} clearcoatRoughness={0.1} />
  return <group>
    <RoundedBox args={[3.6, 8.6, 4]} radius={0.5} smoothness={3} position={[0, 0, 2]} castShadow>{porcelain}</RoundedBox>
    <RoundedBox args={[3.2, 6.4, 2.4]} radius={0.6} smoothness={3} position={[0, 0, 5]} castShadow>{porcelain}</RoundedBox>
    {[-2.4, 2.4].map(y => <mesh key={y} position={[0, y, 6.25]}><boxGeometry args={[1.6, 0.9, 0.2]} /><Metal kind="brass" /></mesh>)}
    {[-2.4, 2.4].map(y => <mesh key={`s${y}`} position={[0, y, 6.4]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.32, 0.32, 0.18, 6]} /><Metal kind="brass" grain="turned" /></mesh>)}
    {!blown && <mesh position={[0, 0, 6.42]}><boxGeometry args={[0.09, 4.8, 0.09]} /><meshStandardMaterial color="#b7b6b0" metalness={0.8} roughness={0.35} /></mesh>}
    {blown && <>
      <mesh position={[0, 1.6, 6.42]}><boxGeometry args={[0.09, 1.6, 0.09]} /><meshStandardMaterial color="#8a8984" metalness={0.8} roughness={0.5} /></mesh>
      <mesh position={[0.1, -1.7, 6.42]} rotation-z={0.3}><boxGeometry args={[0.09, 1.4, 0.09]} /><meshStandardMaterial color="#8a8984" metalness={0.8} roughness={0.5} /></mesh>
      <mesh position={[0, 0.1, 6.36]}><circleGeometry args={[1.1, 24]} /><meshStandardMaterial color="#2a2522" transparent opacity={0.55} roughness={1} depthWrite={false} /></mesh>
    </>}
  </group>
}

/** 户内配电箱：嵌在墙里，36 × 26 cm 的面框，翻盖是透明的；里面一条导轨上排着总开关、漏电保护器和四路空气开关 */
export function DistBox({ at, state = BOX_ON }: { at: V3; state?: BoxState }) {
  const W = 36, Hh = 26
  const tag = useMemo(() => makeText(['强电箱'], { w: 256, h: 64, bg: '#f4f3ee', fg: '#5a5d61', size: 34 }), [])
  return <Cm p={[at[0], at[1], at[2] + 0.02]}>
    {/* 箱体：凹进墙里，里面是镀锌底板 */}
    <mesh position={[0, 0, -4]}><boxGeometry args={[W - 2, Hh - 2, 8]} /><meshStandardMaterial color="#cfd2d4" metalness={0.6} roughness={0.5} side={THREE.BackSide} /></mesh>
    {/* 面框：一圈白色的钢板，窗口露出导轨上的模块 */}
    {([[0, Hh / 2 - 3.5, W, 7], [0, -Hh / 2 + 4, W, 8], [-W / 2 + 4, 0, 8, Hh], [W / 2 - 4, 0, 8, Hh]] as [number, number, number, number][]).map(([x, y, w, h], i) =>
      <RoundedBox key={i} args={[w, h, 1]} radius={0.3} smoothness={2} position={[x, y, 0.5]} castShadow><meshPhysicalMaterial color="#f4f3ee" roughness={0.38} clearcoat={0.4} /></RoundedBox>)}
    <mesh position={[0, Hh / 2 - 3.5, 1.02]}><planeGeometry args={[7, 1.8]} /><meshStandardMaterial map={tag} roughness={0.6} /></mesh>
    {/* 导轨 */}
    <mesh position={[0, 0, -6.5]}><boxGeometry args={[W - 8, 3.5, 0.8]} /><Metal kind="zinc" grain="brushed" /></mesh>
    {MODS.map(m => <group key={m.k} position={[modX[m.k], 0, -7]}>
      {m.k === 'kitchen' && state.fuse ? <FuseHolder blown={state.fuse === 'blown'} /> : <Breaker w={m.w} on={!!state[m.k]} rcd={m.k === 'rcd'} name={m.name} />}
    </group>)}
    {/* 透明翻盖，掀开着 */}
    <group position={[0, Hh / 2 - 7, 1.2]} rotation-x={-1.15}>
      <RoundedBox args={[W - 16, 12, 0.4]} radius={0.2} smoothness={2} position={[0, 6, 0]}><meshPhysicalMaterial color="#e9eef2" transparent opacity={0.22} roughness={0.08} depthWrite={false} /></RoundedBox>
    </group>
  </Cm>
}

// ---------- 墙上的插座和开关 ----------
/** 86 型面板的外框：8.6 × 8.6 cm，白色，四边倒圆 */
function Plate() { return <RoundedBox args={[8.6, 8.6, 0.9]} radius={0.35} smoothness={3} position={[0, 0, 0.45]} castShadow><meshPhysicalMaterial color="#f6f5f1" roughness={0.3} clearcoat={0.5} /></RoundedBox> }
/** 五孔插座：上面两孔（左零右火），下面三孔（上地、左零、右火）。孔的位置（cm，相对面板中心） */
export const HOLE5 = { left: [-1.0, 2.0] as [number, number], right: [1.0, 2.0] as [number, number], e: [0, -0.6] as [number, number], l3: [-1.25, -2.4] as [number, number], r3: [1.25, -2.4] as [number, number] }
export function Socket5() {
  const dark = <meshStandardMaterial color="#141516" roughness={0.8} />
  return <group>
    <Plate />
    {/* 两孔：竖着的一对直缝 */}
    {[HOLE5.left, HOLE5.right].map(([x, y], i) => <mesh key={i} position={[x, y, 0.91]}><planeGeometry args={[0.22, 0.75]} />{dark}</mesh>)}
    {/* 三孔：上面一条竖缝接地，下面两条八字缝 */}
    <mesh position={[HOLE5.e[0], HOLE5.e[1], 0.91]}><planeGeometry args={[0.22, 0.85]} />{dark}</mesh>
    {([[HOLE5.l3, 0.52], [HOLE5.r3, -0.52]] as [[number, number], number][]).map(([[x, y], a], i) => <mesh key={i} position={[x, y, 0.91]} rotation-z={a}><planeGeometry args={[0.22, 0.85]} />{dark}</mesh>)}
    {/* 插孔周围浅浅的一圈凹槽 */}
    <mesh position={[0, 2.0, 0.905]}><planeGeometry args={[3.6, 1.6]} /><meshStandardMaterial color="#ebeae5" roughness={0.5} /></mesh>
  </group>
}
/** 三孔插座（16 A，空调、洗衣机用） */
export function Socket3() {
  const dark = <meshStandardMaterial color="#141516" roughness={0.8} />
  return <group>
    <Plate />
    <mesh position={[0, 1.2, 0.91]}><planeGeometry args={[0.26, 1.0]} />{dark}</mesh>
    {[[-1.5, -1.2, 0.52], [1.5, -1.2, -0.52]].map(([x, y, a], i) => <mesh key={i} position={[x, y, 0.91]} rotation-z={a}><planeGeometry args={[0.26, 1.0]} />{dark}</mesh>)}
  </group>
}
/** 墙壁开关：一块大翘板，按下的一边陷进去 */
export function WallSwitch({ on }: { on: boolean }) {
  return <group>
    <Plate />
    <RoundedBox args={[6.6, 6.6, 0.6]} radius={0.3} smoothness={3} position={[0, 0, 1.1]} rotation-x={on ? -0.05 : 0.05}><meshPhysicalMaterial color="#fbfaf7" roughness={0.28} clearcoat={0.5} /></RoundedBox>
    <mesh position={[0, -2.6, 1.45]}><planeGeometry args={[0.8, 0.18]} /><meshBasicMaterial color={on ? '#7bd88f' : '#c9c8c2'} /></mesh>
  </group>
}
/** 插座、开关按厘米放到墙上（world 坐标给中心） */
export const OnWall = ({ p, children }: { p: V3; children: React.ReactNode }) => <group position={p}><group scale={CM}>{children}</group></group>
/** 跳闸、熔断时的一下电火花 */
export function Spark({ at, t }: { at: V3; t: number }) {
  const [, setN] = useState(0)
  useEffect(() => { if (!t) return; let raf = 0; const f = () => { setN(n => n + 1); if (performance.now() - t < 500) raf = requestAnimationFrame(f) }; raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf) }, [t])
  const k = t ? Math.max(0, 1 - (performance.now() - t) / 450) : 0
  if (k <= 0) return null
  return <group position={at}>
    <mesh><sphereGeometry args={[0.25 + (1 - k) * 0.6, 16, 12]} /><meshBasicMaterial color="#fff3c2" transparent opacity={k} toneMapped={false} /></mesh>
    <pointLight color="#ffd88a" intensity={40 * k} distance={12} decay={2} />
  </group>
}
