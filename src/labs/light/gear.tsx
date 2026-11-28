// 光学台上反复用到的器材：导轨、滑座、激光器、装狭缝片的夹持架、光屏和屏上的条纹、光束。
// 光路沿 x 方向走，光轴在 y = AX。屏上的条纹由着色器按公式逐点算出来，颜色由波长决定。
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LabStage, Metal, disc, lathe, type Label } from '@/lab-kit'
import { AX, DARK, ST, TOP, type Spot, type Want } from './world'

export type V3 = [number, number, number]
/** 暗室里环境光很弱，金属件把反射调亮一些才显得出金属的样子 */
export const ENV = 4
/** 导轨顶面的高度 */
export const RAIL_Y = TOP + 0.11
/** 光屏的宽和高（画面单位），和它代表的实际范围（mm）。屏上的条纹是放大了画的，屏下沿的毫米刻度跟着一起放大 */
export const SCREEN = { w: 2.0, h: 1.1, mm: 20 }

/** 空格键等于按一下主按钮（记录） */
export function useSpace(fn: () => void) {
  const f = useRef(fn); f.current = fn
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.code !== 'Space' || e.repeat || (e.target as HTMLElement | null)?.closest?.('button, input, textarea')) return; e.preventDefault(); f.current() }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [])
}

// ---------- 舞台 ----------
const targets = new Map<string, THREE.Vector3>()
/** 这一课的舞台：在哪张台子、镜头看向哪里（相对台子中心的偏移）、装进画面的范围、机位、射灯多亮 */
export function Dark({ at, dx = 0, dy = 0, dz = 0, span, view, lamp = 150, labels, children = null }: { at: Spot; dx?: number; dy?: number; dz?: number; span: [number, number]; view: [number, number]; lamp?: number; labels: Label[]; children?: ReactNode }) {
  const key = `${at}:${dx}:${dy}:${dz}`
  if (!targets.has(key)) targets.set(key, new THREE.Vector3(ST[at] + dx, AX + dy, dz))
  const sp = useMemo(() => span, [span[0], span[1]]), vw = useMemo(() => view, [view[0], view[1]])   // eslint-disable-line react-hooks/exhaustive-deps
  const world = useMemo<Want>(() => ({ at, lamp }), [at, lamp])
  return <LabStage<Want> labels={labels} target={targets.get(key)!} span={sp} view={vw} world={world} {...DARK}>{children}</LabStage>
}

// ---------- 材质 ----------
/** 黑色阳极氧化的铝件 */
export const Anod = ({ rough = 0.42 }: { rough?: number }) => <meshStandardMaterial color="#191c20" metalness={0.75} roughness={rough} envMapIntensity={ENV} />
/** 黑色胶木、塑料 */
export const Plastic = ({ color = '#15171a' }: { color?: string }) => <meshPhysicalMaterial color={color} roughness={0.42} clearcoat={0.4} clearcoatRoughness={0.35} />
/** 自己发光的东西（光束、指示灯）：叠加上去，不受灯光影响 */
export const Glow = ({ color, opacity = 1 }: { color: string; opacity?: number }) => <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />

// ---------- 导轨和滑座 ----------
/** 导轨的截面：燕尾形。底宽 0.2，上面一条上宽下窄的导棱 */
function railGeo(len: number) {
  const s = new THREE.Shape()
  const pts: [number, number][] = [[-0.1, 0], [0.1, 0], [0.1, 0.028], [0.052, 0.034], [0.082, 0.074], [0.078, 0.08], [-0.078, 0.08], [-0.082, 0.074], [-0.052, 0.034], [-0.1, 0.028]]
  pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])))
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false })
  g.translate(0, 0, -len / 2); g.rotateY(Math.PI / 2)
  return g
}
/** 导轨顶上的刻度尺：每厘米一道线，每 10 cm 一个数。perM：1 m 画成多少个单位 */
function makeScale(len: number, perM: number) {
  const cm = Math.round(len / perM * 100), W = 4096, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, px = W / cm
  g.fillStyle = '#e9e6da'; g.fillRect(0, 0, W, H); g.fillStyle = '#1c2024'; g.textAlign = 'center'; g.font = '600 30px sans-serif'
  for (let i = 0; i <= cm; i++) {
    const x = Math.min(W - 2, Math.max(2, i * px)), h = i % 10 === 0 ? 30 : i % 5 === 0 ? 22 : 13
    g.fillRect(x - (i % 10 === 0 ? 2 : 1), H - h, i % 10 === 0 ? 4 : 2, h)
    if (i % 10 === 0 && i > 0 && i < cm) g.fillText(String(i), x, 28)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
const PAD = disc(0.06, 0.016), PAD_SCREW = lathe([[0, 0], [0.012, 0], [0.012, 0.03], [0.026, 0.03], [0.028, 0.033], [0.028, 0.044], [0, 0.044]], { segs: 20 })
/** 一根光学导轨：从 x0 到 x1，两端各一根横梁落在调平脚上 */
export function Rail({ x0, x1, z = 0, perM = 3.2 }: { x0: number; x1: number; z?: number; perM?: number }) {
  const len = x1 - x0, geo = useMemo(() => railGeo(len), [len]), scale = useMemo(() => makeScale(len - 0.3, perM), [len, perM])
  return <group position={[(x0 + x1) / 2, TOP, z]}>
    <mesh geometry={geo} position-y={0.03} castShadow receiveShadow><Anod /></mesh>
    <mesh position={[0, 0.1104, 0.052]} rotation-x={-Math.PI / 2}><planeGeometry args={[len - 0.3, 0.04]} /><meshStandardMaterial map={scale} color="#b7b4aa" roughness={0.8} /></mesh>
    {[-1, 1].map(s => <group key={s} position={[s * (len / 2 - 0.12), 0, 0]}>
      <mesh position-y={0.022} castShadow><boxGeometry args={[0.16, 0.022, 0.5]} /><Anod rough={0.5} /></mesh>
      {[-1, 1].map(k => <group key={k} position={[0, 0, k * 0.2]}>
        <mesh geometry={PAD}><Metal kind="iron" grain="cast" env={3} /></mesh>
        <mesh geometry={PAD_SCREW}><Metal kind="stainless" grain="turned" env={ENV} /></mesh>
      </group>)}
    </group>)}
  </group>
}

export const KNOB = lathe([[0, 0], [0.008, 0], [0.008, 0.012], [0.024, 0.012], [0.027, 0.015], [0.027, 0.028], [0.024, 0.031], [0, 0.031]], { segs: 20 })
const SLEEVE = lathe([[0, 0], [0.036, 0], [0.038, 0.003], [0.038, 0.02], [0.031, 0.026], [0.029, 0.09], [0.027, 0.096], [0, 0.096]])
/** 骑在导轨上的滑座和立杆：立杆从滑座一直顶到 y 处。z 是导轨的位置 */
export function Carrier({ x, y, z = 0 }: { x: number; y: number; z?: number }) {
  return <group position={[x, 0, z]}>
    <mesh position-y={RAIL_Y + 0.016} castShadow><boxGeometry args={[0.17, 0.05, 0.25]} /><Metal kind="aluminum" grain="brushed" env={ENV} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[0, RAIL_Y - 0.03, s * 0.108]}><boxGeometry args={[0.17, 0.06, 0.034]} /><Metal kind="aluminum" grain="brushed" env={ENV} /></mesh>)}
    <mesh geometry={KNOB} position={[0, RAIL_Y - 0.03, 0.125]} rotation-x={Math.PI / 2}><Plastic /></mesh>
    <mesh geometry={SLEEVE} position-y={RAIL_Y + 0.041} castShadow><Metal kind="stainless" grain="turned" env={ENV} /></mesh>
    <mesh geometry={KNOB} position={[0.03, RAIL_Y + 0.1, 0]} rotation-z={-Math.PI / 2} scale={0.6}><Plastic /></mesh>
    <mesh position-y={(RAIL_Y + 0.13 + y) / 2} castShadow><cylinderGeometry args={[0.014, 0.014, Math.max(0.01, y - RAIL_Y - 0.13), 16]} /><Metal kind="chrome" rough={0.14} env={ENV} /></mesh>
  </group>
}

// ---------- 激光器 ----------
// 机身：后盖、几道散热片、筒身、前端收口的出光嘴。按转轴朝上车出来，用的时候放倒
const BODY = (() => {
  const p: [number, number][] = [[0, 0], [0.05, 0], [0.058, 0.008], [0.058, 0.04], [0.05, 0.046]]
  for (let i = 0; i < 6; i++) { const y = 0.05 + i * 0.03; p.push([0.05, y], [0.068, y + 0.003], [0.068, y + 0.015], [0.05, y + 0.018]) }
  p.push([0.05, 0.235], [0.062, 0.24], [0.062, 0.58], [0.056, 0.588], [0.056, 0.6], [0.046, 0.61], [0.046, 0.655], [0.04, 0.66], [0.022, 0.66], [0.022, 0.635], [0, 0.635])
  return lathe(p, { segs: 40 })
})()
const NOSE = lathe([[0.047, 0], [0.05, 0.003], [0.05, 0.012], [0.047, 0.015]], { segs: 40 })
const CLAMP = lathe([[0.064, 0], [0.086, 0], [0.09, 0.004], [0.09, 0.056], [0.086, 0.06], [0.064, 0.06]], { segs: 40, closed: true })
let sticker: THREE.CanvasTexture | null = null
/** 机身上的警示标签：黄底黑三角 */
function getSticker() {
  if (sticker) return sticker
  const c = document.createElement('canvas'); c.width = 160; c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#f2c200'; g.fillRect(0, 0, 160, 64); g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(2, 2, 156, 60)
  g.beginPath(); g.moveTo(30, 12); g.lineTo(52, 50); g.lineTo(8, 50); g.closePath(); g.stroke()
  g.fillStyle = '#111'; g.beginPath(); g.arc(30, 38, 4, 0, 7); g.fill(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.fillRect(30 + Math.cos(a) * 7 - 1, 38 + Math.sin(a) * 7 - 1, 2.5, 2.5) }
  g.font = '700 22px sans-serif'; g.fillText('激光', 66, 30); g.font = '600 15px sans-serif'; g.fillText('勿直视光束', 66, 50)
  sticker = new THREE.CanvasTexture(c); sticker.colorSpace = THREE.SRGBColorSpace; sticker.anisotropy = 8
  return sticker
}
/** 激光器：出光嘴在 x 处，朝 +x 方向出光，架在滑座上。on：是否出光 */
export function Laser({ x, y = AX, color, on = true, z = 0 }: { x: number; y?: number; color: string; on?: boolean; z?: number }) {
  const cable = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.66, 0, 0), new THREE.Vector3(-0.82, -0.03, 0), new THREE.Vector3(-0.98, -0.3, -0.06), new THREE.Vector3(-1.0, TOP + 0.012 - y, -0.2), new THREE.Vector3(-0.8, TOP + 0.012 - y, -0.7), new THREE.Vector3(-0.45, TOP + 0.02 - y, -1.05), new THREE.Vector3(-0.3, TOP + 0.09 - y, -1.14)]), 48, 0.012, 8), [y])
  return <group>
    <group position={[x, y, z]}>
      <group rotation-z={-Math.PI / 2} position-x={-0.66}>
        <mesh geometry={BODY} castShadow><Anod /></mesh>
        <mesh geometry={NOSE} position-y={0.625}><Metal kind="brass" grain="turned" env={ENV} /></mesh>
        <mesh position-y={0.636} rotation-x={-Math.PI / 2}><circleGeometry args={[0.021, 20]} /><meshBasicMaterial color={on ? color : '#111'} toneMapped={false} /></mesh>
        {[0.3, 0.5].map(h => <mesh key={h} geometry={CLAMP} position-y={h}><Metal kind="aluminum" grain="turned" env={ENV} /></mesh>)}
      </group>
      {/* 两只抱箍下面的托板，立杆顶在托板上 */}
      <mesh position={[-0.26, -0.105, 0]} castShadow><boxGeometry args={[0.32, 0.03, 0.09]} /><Metal kind="aluminum" grain="brushed" env={ENV} /></mesh>
      <mesh position={[-0.2, 0, 0.0625]} rotation-y={0}><planeGeometry args={[0.15, 0.06]} /><meshStandardMaterial map={getSticker()} roughness={0.6} /></mesh>
      <mesh geometry={cable}><Plastic color="#0e0f11" /></mesh>
      {/* 电线另一头接着的激光电源：一只小铁盒，面板上一只翘板开关和一盏指示灯 */}
      <group position={[-0.05, TOP - y, -1.22]} rotation-y={0.25}>
        <RoundedBox args={[0.56, 0.2, 0.4]} radius={0.02} smoothness={3} position-y={0.11} castShadow receiveShadow><meshStandardMaterial color="#2c3238" metalness={0.55} roughness={0.5} envMapIntensity={ENV} /></RoundedBox>
        <mesh position={[0, 0.11, 0.201]}><planeGeometry args={[0.5, 0.15]} /><meshStandardMaterial color="#8d8a81" roughness={0.8} /></mesh>
        <mesh position={[-0.12, 0.11, 0.206]} rotation-x={on ? -0.2 : 0.2}><boxGeometry args={[0.07, 0.09, 0.02]} /><Plastic color="#b3271e" /></mesh>
        <mesh position={[0.12, 0.11, 0.203]}><circleGeometry args={[0.016, 14]} /><meshBasicMaterial color={on ? '#7dffb0' : '#1d2a22'} toneMapped={false} /></mesh>
        {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 0.22, 0.006, sz * 0.15]}><cylinderGeometry args={[0.025, 0.028, 0.012, 12]} /><Plastic /></mesh>))}
      </group>
      {/* 电源指示灯 */}
      <mesh position={[-0.64, 0.059, 0]}><sphereGeometry args={[0.008, 10, 8]} /><meshBasicMaterial color={on ? '#7dffb0' : '#1d2a22'} toneMapped={false} /></mesh>
    </group>
    <Carrier x={x - 0.26} y={y - 0.12} z={z} />
  </group>
}

// ---------- 夹持架和狭缝片 ----------
/** 方形夹持架：一块带圆孔的黑色铝板，厚度沿光路方向 */
function frameGeo(w: number, h: number, hole: number, t: number) {
  const s = new THREE.Shape(), r = 0.03
  s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  const o = new THREE.Path(); o.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(o)
  const g = new THREE.ExtrudeGeometry(s, { depth: t - 0.008, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 40 })
  g.translate(0, 0, -(t - 0.008) / 2); g.rotateY(Math.PI / 2)
  return g
}
export const FRAME = frameGeo(0.46, 0.46, 0.15, 0.04), RETAIN = lathe([[0.138, -0.024], [0.156, -0.024], [0.156, 0.024], [0.138, 0.024]], { segs: 48, closed: true })
/** 装在夹持架里的一块镀膜玻璃片，上面刻着透光的细缝。slits：几条缝；half：挡住其中一条；spot：朝激光那一面被照亮的颜色 */
export function SlitHolder({ x, y = AX, slits = 2, half = false, spot, wide = 1, z = 0, children = null }: { x: number; y?: number; slits?: 0 | 1 | 2; half?: boolean; spot?: string; wide?: number; z?: number; children?: ReactNode }) {
  return <group>
    <group position={[x, y, z]}>
      <mesh geometry={FRAME} castShadow><Anod /></mesh>
      <mesh geometry={RETAIN} rotation-z={-Math.PI / 2}><Metal kind="stainless" grain="turned" env={ENV} /></mesh>
      {/* 玻璃片：镀了一层不透光的铬膜，只有细缝透光 */}
      <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.14, 0.14, 0.012, 40]} /><meshPhysicalMaterial color={slits ? '#0b0c0f' : '#cfe6ee'} metalness={slits ? 0.85 : 0} roughness={slits ? 0.18 : 0.05} transparent={!slits} opacity={slits ? 1 : 0.18} envMapIntensity={3} /></mesh>
      {slits > 0 && spot && (slits === 2 ? [-1, 1] : [0]).map(s => (half && s === 1 ? null : <mesh key={s} position={[0.0075, 0, s * 0.008]} rotation-y={Math.PI / 2}><planeGeometry args={[0.004 * wide, 0.12]} /><Glow color={spot} /></mesh>))}
      {spot && <mesh position={[-0.0075, 0, 0]} rotation-y={-Math.PI / 2}><circleGeometry args={[0.028, 20]} /><Glow color={spot} opacity={0.8} /></mesh>}
      {/* 挡住一条缝的小挡片：从侧面推进来 */}
      {slits === 2 && <mesh position={[-0.012, 0, half ? 0.075 : 0.2]}><boxGeometry args={[0.006, 0.2, 0.13]} /><Anod rough={0.6} /></mesh>}
      <mesh geometry={KNOB} position={[0, 0.23, 0]}><Plastic /></mesh>
      <mesh position={[0, -0.27, 0]}><cylinderGeometry args={[0.016, 0.016, 0.08, 14]} /><Metal kind="stainless" env={ENV} /></mesh>
      {children}
    </group>
    <Carrier x={x} y={y - 0.29} z={z} />
  </group>
}

/** 备用的狭缝片：一只带插槽的黑盒子，里面立着几片镀膜玻璃片 */
export function SlideBox({ x, z }: { x: number; z: number }) {
  return <group position={[x, TOP, z]} rotation-y={0.35}>
    <RoundedBox args={[0.5, 0.1, 0.36]} radius={0.015} smoothness={3} position-y={0.05} castShadow receiveShadow><Plastic color="#1b1d20" /></RoundedBox>
    {[-0.15, -0.05, 0.05].map((k, i) => <group key={k} position={[k, 0.2, 0]} rotation-z={-0.08}>
      <mesh castShadow><boxGeometry args={[0.012, 0.3, 0.3]} /><meshPhysicalMaterial color="#0b0c0f" metalness={0.85} roughness={0.2} envMapIntensity={3} /></mesh>
      <mesh position={[0.0065, 0.11, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[0.2, 0.04]} /><meshStandardMaterial color={['#e9e6da', '#d9e6c8', '#e6d3c8'][i]} roughness={0.9} /></mesh>
    </group>)}
  </group>
}

// ---------- 光屏和屏上的条纹 ----------
/** 屏下沿的毫米刻度：−20 到 20 mm，每毫米一道线，每 10 mm 一个数 */
let ruler: THREE.CanvasTexture | null = null
function getRuler() {
  if (ruler) return ruler
  const W = 2048, H = 72, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, px = W / (SCREEN.mm * 2)
  g.fillStyle = '#d9d6cb'; g.fillRect(0, 0, W, H); g.fillStyle = '#16191c'; g.textAlign = 'center'; g.font = '600 30px sans-serif'
  for (let i = -SCREEN.mm; i <= SCREEN.mm; i++) {
    const x = Math.min(W - 2, Math.max(2, (i + SCREEN.mm) * px)), h = i % 10 === 0 ? 30 : i % 5 === 0 ? 22 : 12
    g.fillRect(x - (i % 5 === 0 ? 2 : 1), 0, i % 5 === 0 ? 4 : 2, h)
    if (i % 10 === 0 && Math.abs(i) < SCREEN.mm) g.fillText(i === 0 ? '0' : String(Math.abs(i)), x, 64)
  }
  g.font = '500 22px sans-serif'; g.fillText('mm', W - 40, 62)
  ruler = new THREE.CanvasTexture(c); ruler.colorSpace = THREE.SRGBColorSpace; ruler.anisotropy = 8
  return ruler
}
/** 光屏：一块白色的漫反射板，四周一圈铝边，下沿一条毫米刻度；正面朝 −x（朝着光源）。children 画在屏面上 */
export function Screen({ x, y = AX, z = 0, children = null }: { x: number; y?: number; z?: number; children?: ReactNode }) {
  const { w, h } = SCREEN, H = h + 0.12
  return <group>
    <group position={[x, y, z]}>
      <mesh position={[0.012, -0.06, 0]} castShadow><boxGeometry args={[0.02, H, w]} /><meshStandardMaterial color="#a9a79f" roughness={1} /></mesh>
      <mesh position={[0.032, -0.06, 0]} castShadow><boxGeometry args={[0.02, H + 0.05, w + 0.05]} /><Anod rough={0.55} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[0.012, -0.06, s * (w / 2 + 0.012)]}><boxGeometry args={[0.034, H + 0.05, 0.025]} /><Metal kind="aluminum" grain="brushed" env={ENV} /></mesh>)}
      {[-1, 1].map(s => <mesh key={s} position={[0.012, -0.06 + s * (H / 2 + 0.012), 0]}><boxGeometry args={[0.034, 0.025, w + 0.05]} /><Metal kind="aluminum" grain="brushed" env={ENV} /></mesh>)}
      <mesh position={[0.0015, -h / 2 - 0.06, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[w, 0.12]} /><meshStandardMaterial map={getRuler()} color="#9d9a90" roughness={0.9} /></mesh>
      {/* 背后的加强筋和插进立杆的柄 */}
      <mesh position={[0.05, -0.06, 0]}><boxGeometry args={[0.02, 0.05, w * 0.9]} /><Anod /></mesh>
      <mesh position={[0.032, -H / 2 - 0.13, 0]}><cylinderGeometry args={[0.018, 0.018, 0.12, 14]} /><Metal kind="stainless" env={ENV} /></mesh>
      {children}
    </group>
    <Carrier x={x + 0.032} y={y - H / 2 - 0.18} z={z} />
  </group>
}

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
const FRAG = `
varying vec2 vUv;
uniform vec3 uColor; uniform float uMode, uPeriod, uEnv, uGain, uHalfW, uHalfH, uOne;
const float PI = 3.14159265;
float sinc2(float u) { float a = abs(u) < 1e-4 ? 1.0 : sin(u) / u; return a * a; }
void main() {
  float x = (vUv.x - 0.5) * 2.0 * uHalfW, y = (vUv.y - 0.5) * 2.0 * uHalfH, I = 0.0;
  // 屏的边上渐渐收掉，条纹不会一刀切断
  float edge = smoothstep(0.0, 0.05, vUv.x) * smoothstep(0.0, 0.05, 1.0 - vUv.x) * smoothstep(0.0, 0.08, vUv.y) * smoothstep(0.0, 0.08, 1.0 - vUv.y);
  if (uMode < 0.5) {            // 双缝干涉：cos² 条纹，外面套着单缝的光带；uOne 从 0 到 1 是挡住一条缝的过程
    float f = cos(PI * x / uPeriod); f = f * f;
    I = sinc2(PI * x / uEnv) * mix(f, 0.25, uOne) * exp(-y * y / 40.0);
  } else if (uMode < 1.5) {     // 单缝衍射：中央亮纹宽是两侧的两倍
    I = sinc2(PI * x / uEnv) * exp(-y * y / 40.0);
  } else if (uMode < 2.5) {     // 一个圆光斑
    I = exp(-(x * x + y * y) / (uEnv * uEnv));
  } else {                      // 小圆板的影子：边上一圈圈衍射环，影子正中间一个亮斑
    float r = length(vec2(x, y)), R = uEnv;
    float outside = smoothstep(R - 0.25, R + 0.35, r) * (0.62 + 0.38 * cos((r - R) * (r - R) * 1.6 + 0.6) * exp(-(r - R) * 0.45)) * exp(-r * r / 150.0);
    float rings = (1.0 - smoothstep(R - 0.6, R, r)) * 0.07 * (0.5 + 0.5 * cos(r * 5.2)) * smoothstep(0.5, 1.6, r);
    I = outside + rings + 0.85 * exp(-r * r / 0.22);
  }
  vec3 c = uColor * I + vec3(1.0) * pow(max(I, 0.0), 6.0) * 0.35;   // 最亮的地方略微发白
  gl_FragColor = vec4(c * uGain * edge, 1.0);
}`
/** 屏上的图样。mode：double 双缝、single 单缝、spot 光斑、disc 小圆板的影子；period：条纹间距（mm）；env：光带第一个暗处离中央多远（mm），spot 时是光斑半径，disc 时是影子半径；gain：亮度；one：挡住一条缝（0–1） */
export function Pattern({ mode, color, period = 1, env = 10, gain = 1, one = 0 }: { mode: 'double' | 'single' | 'spot' | 'disc'; color: string; period?: number; env?: number; gain?: number; one?: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    uniforms: { uColor: { value: new THREE.Color() }, uMode: { value: 0 }, uPeriod: { value: 1 }, uEnv: { value: 10 }, uGain: { value: 1 }, uHalfW: { value: SCREEN.mm }, uHalfH: { value: SCREEN.mm * SCREEN.h / SCREEN.w }, uOne: { value: 0 } } }), [])
  const tint = useMemo(() => new THREE.Color(color), [color])
  // 换颜色时慢慢过渡过去
  useFrame((_, dt) => { (mat.uniforms.uColor.value as THREE.Color).lerp(tint, Math.min(1, dt * 6)) })
  const u = mat.uniforms
  u.uMode.value = { double: 0, single: 1, spot: 2, disc: 3 }[mode]; u.uPeriod.value = Math.max(0.05, period); u.uEnv.value = Math.max(0.05, env); u.uGain.value = gain; u.uOne.value = one
  return <mesh position={[-0.002, 0, 0]} rotation-y={-Math.PI / 2} material={mat} renderOrder={5}><planeGeometry args={[SCREEN.w, SCREEN.h]} /></mesh>
}

// ---------- 光束 ----------
const UP = new THREE.Vector3(0, 1, 0)
/** 两点之间的一根圆柱（不投影子）：光束都用它画 */
function Rod({ from, to, r, children }: { from: V3; to: V3; r: number; children: ReactNode }) {
  const a = new THREE.Vector3(...from), d = new THREE.Vector3(...to).sub(a), len = d.length()
  if (len < 1e-4) return null
  return <mesh position={a.clone().addScaledVector(d, 0.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())} scale={[r, len, r]}><cylinderGeometry args={[1, 1, 1, 14, 1, true]} />{children}</mesh>
}
/** 一束细的激光：亮的芯加一圈光晕 */
export function Beam({ a, b, color, r = 0.007, k = 1 }: { a: V3; b: V3; color: string; r?: number; k?: number }) {
  if (k <= 0.01) return null
  return <>
    <Rod from={a} to={b} r={r}><Glow color={color} opacity={0.95 * k} /></Rod>
    <Rod from={a} to={b} r={r * 3.6}><Glow color={color} opacity={0.2 * k} /></Rod>
  </>
}
/** 从狭缝到光屏散开的一片光：水平的一个扇面，half 是它在屏上的半宽 */
export function Fan({ x0, x1, half, color, y = AX, k = 1 }: { x0: number; x1: number; half: number; color: string; y?: number; k?: number }) {
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 1, 1, 0, -1]), 3)); return g }, [])
  if (k <= 0.01) return null
  return <>
    <mesh geometry={geo} position={[x0, y, 0]} scale={[x1 - x0, 1, half]}><meshBasicMaterial color={color} transparent opacity={0.075 * k} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>
    <mesh geometry={geo} position={[x0, y, 0]} scale={[x1 - x0, 1, half * 0.35]}><meshBasicMaterial color={color} transparent opacity={0.09 * k} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>
  </>
}
/** 一束粗的光柱（灯发出来的光）：从 a 到 b，半径 r */
export function Shaft({ a, b, r, color, k = 1 }: { a: V3; b: V3; r: number; color: string; k?: number }) {
  if (k <= 0.01) return null
  // 三层套在一起：越靠中间越亮，看着像一根有体积的光柱，而不是一块平板
  return <>{[1, 0.72, 0.42].map(q => <Rod key={q} from={a} to={b} r={r * q}><meshBasicMaterial color={color} transparent opacity={0.026 * k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></Rod>)}</>
}
