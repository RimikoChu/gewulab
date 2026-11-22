// 光学暗室里反复用到的东西：这一课的舞台、光线和光路、角度弧线、蜡烛和烛台、激光笔、眼睛，以及“镜子里的像”。
// 光路都画在正对镜头的那个竖直平面里（z = 0 附近）。
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LabStage, Metal, Rod, disc, lathe, shell, type Label } from '@/lab-kit'
import { DARK, SPOT, ST, TOP, type Spot, type SpotKey } from './world'

export type V2 = [number, number]
/** 暗室里环境光很弱，金属件把反射调亮一些才显得出金属的样子 */
export const ENV = 4
const RAD = Math.PI / 180

/** 这一课的舞台：选一处机位，暗室的设置都一样。lamp：射灯照在哪一处（默认按机位的名字） */
export function Dark({ at, labels, view, children = null }: { at: SpotKey; labels: Label[]; view?: [number, number]; children?: ReactNode }) {
  const v = SPOT[at], lamp = (at in ST ? at : at.replace(/2$|Top$/, '')) as Spot
  return <LabStage<{ at: Spot }> labels={labels} target={v.target} span={v.span} view={view ?? v.view} {...DARK} world={{ at: lamp }}>{children}</LabStage>
}

/** 一个数缓缓变到目标值：先慢、中间快、最后慢，按时间算。光线画出来、纸板折过去、蜡烛挪位置都用它 */
export function useEase(to: number, dur = 0.7) {
  const [x, setX] = useState(to), st = useRef({ from: to, to, t0: 0, cur: to })
  useEffect(() => {
    const s = st.current
    if (s.cur === to) { s.to = to; return }
    s.from = s.cur; s.to = to; s.t0 = performance.now()
    let raf = 0
    const frame = (now: number) => {
      const t = Math.min(1, (now - s.t0) / (dur * 1000)), k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      s.cur = t >= 1 ? s.to : s.from + (s.to - s.from) * k; setX(s.cur)
      if (t < 1) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [to, dur])
  return x
}

/** 一条光线：从 a 到 b。实线带一圈淡淡的光晕；dash 画成虚线（法线、反向延长线）；arrow 在中间画一个箭头表示方向；fade 画得很淡 */
export function Ray({ a, b, color = '#ff5a4a', r = 0.009, dash = false, z = 0, glow = true, arrow = false, fade = 1 }: { a: V2; b: V2; color?: string; r?: number; dash?: boolean; z?: number; glow?: boolean; arrow?: boolean; fade?: number }) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy)
  if (len < 2e-3) return null
  if (dash) {
    const n = Math.max(2, Math.round(len / 0.075))
    return <>{Array.from({ length: n }, (_, i) => i % 2 ? null : <Rod key={i} from={[a[0] + dx * i / n, a[1] + dy * i / n, z]} to={[a[0] + dx * (i + 1) / n, a[1] + dy * (i + 1) / n, z]} r={r * 0.7}><meshBasicMaterial color={color} transparent opacity={0.75 * fade} toneMapped={false} /></Rod>)}</>
  }
  return <>
    <Rod from={[a[0], a[1], z]} to={[b[0], b[1], z]} r={r}><meshBasicMaterial color={color} transparent={fade < 1} opacity={fade} toneMapped={false} /></Rod>
    {glow && fade >= 1 && <Rod from={[a[0], a[1], z]} to={[b[0], b[1], z]} r={r * 3.4}><meshBasicMaterial color={color} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></Rod>}
    {arrow && len > 0.25 && <mesh position={[a[0] + dx * 0.56, a[1] + dy * 0.56, z]} rotation-z={Math.atan2(dy, dx) - Math.PI / 2}><coneGeometry args={[r * 3.4, r * 10, 14]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>}
  </>
}

/** 一条折线光路：光依次经过 pts 这些点。k 从 0 到 1 表示画出了多少（光从第一个点一路走过去） */
export function Path({ pts, k = 1, color, r, z = 0, arrow = true }: { pts: V2[]; k?: number; color?: string; r?: number; z?: number; arrow?: boolean }) {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
  let left = lens.reduce((s, l) => s + l, 0) * k
  return <>{lens.map((l, i) => {
    if (left <= 1e-4) return null
    const f = Math.min(1, left / l), a = pts[i], b = pts[i + 1]; left -= l
    return <Ray key={i} a={a} b={[a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]} color={color} r={r} z={z} arrow={arrow && f >= 1} />
  })}</>
}

/** 标角度的一小段圆弧：圆心在 at，从 from 度画到 to 度（从 +x 方向起、逆时针为正） */
export function Arc({ at, from, to, r = 0.26, color = '#ffffff', z = 0.008 }: { at: V2; from: number; to: number; r?: number; color?: string; z?: number }) {
  const a = Math.min(from, to), len = Math.abs(to - from)
  return len < 0.5 ? null : <mesh position={[at[0], at[1], z]} rotation-z={a * RAD}><torusGeometry args={[r, 0.006, 6, 32, len * RAD]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
}
/** 一个小圆点：入射点、像点 */
export const Dot = ({ at, color = '#ffffff', r = 0.018, z = 0.01 }: { at: V2; color?: string; r?: number; z?: number }) => <mesh position={[at[0], at[1], z]}><sphereGeometry args={[r, 12, 10]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>

/** 一片光：几个点围成的半透明亮区 */
export function Beam({ pts, color = '#ffe6b8', opacity = 0.085, z = -0.012 }: { pts: V2[]; color?: string; opacity?: number; z?: number }) {
  const key = pts.map(p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ')
  const geo = useMemo(() => { const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); return new THREE.ShapeGeometry(s) }, [key])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={geo} position={[0, 0, z]}><meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>
}

// ---------- 蜡烛 ----------
// 都按“高 1、半径 1”车出来，用的时候再缩放：蜡烛身（顶上烧出一个浅窝）、火焰（水滴形）
const WAX = lathe([[0, 0], [0.95, 0], [1, 0.012], [1, 0.965], [0.9, 1], [0.55, 0.972], [0, 0.962]], { segs: 28 })
const FLAME = lathe([[0, 0], [0.45, 0.05], [0.88, 0.2], [1, 0.34], [0.82, 0.55], [0.45, 0.78], [0.14, 0.94], [0, 1]], { segs: 20, crease: 80 })
const dishes = new Map<number, THREE.BufferGeometry>()
/** 烛台：一只黄铜小碟，有壁厚，边上翻出一道沿 */
function dishOf(w: number) {
  if (!dishes.has(w)) dishes.set(w, shell([[0, -0.035], [w * 1.5, -0.035], [w * 1.7, -0.028], [w * 1.9, -0.012], [w * 2.6, -0.004], [w * 2.8, 0.008], [w * 2.95, 0.01]], 0.007, { segs: 40 }))
  return dishes.get(w)!
}
let glowTex: THREE.CanvasTexture | null = null
/** 烛焰周围的一团光晕：一张始终朝着镜头的贴图 */
function Glow({ y, s }: { y: number; s: number }) {
  const tex = useMemo(() => {
    if (!glowTex) {
      const c = document.createElement('canvas'); c.width = c.height = 128
      const g = c.getContext('2d')!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
      r.addColorStop(0, 'rgba(255,220,150,0.85)'); r.addColorStop(0.25, 'rgba(255,170,70,0.3)'); r.addColorStop(1, 'rgba(255,140,40,0)')
      g.fillStyle = r; g.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace
    }
    return glowTex
  }, [])
  return <sprite position={[0, y, 0.02]} scale={[s, s, 1]}><spriteMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
}
/**
 * 一支蜡烛：底在 (x, y)，连火焰高 h；h 是负数就倒过来画（小孔成的倒像）。
 * lit：点着没有；dish：底下配不配小碟；image：这是像而不是实物（半透明、不发光、没有碟）；tint：像的颜色偏一点（虚像偏蓝）；flat：压扁成贴在屏上的一片
 */
export function Candle({ x, y, h, z = 0, lit = true, dish = true, image = false, tint, flat = false }: { x: number; y: number; h: number; z?: number; lit?: boolean; dish?: boolean; image?: boolean; tint?: string; flat?: boolean }) {
  const up = h >= 0 ? 1 : -1, len = Math.abs(h), w = len * 0.085 + 0.012, o = image ? 0.55 : 1
  return (
    <group position={[x, y, z]} scale={[flat ? 0.12 : 1, up, 1]}>
      <mesh geometry={WAX} scale={[w, len * 0.74, w]} castShadow={!image}>
        {image ? <meshStandardMaterial color={tint ?? '#f1e6cf'} emissive={tint ?? '#e8b877'} emissiveIntensity={0.4} roughness={0.6} transparent opacity={o} depthWrite={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
          : <meshStandardMaterial color="#e6dcc4" roughness={0.48} emissive={lit ? '#d99a52' : '#000000'} emissiveIntensity={lit ? 0.16 : 0} />}
      </mesh>
      <mesh position={[0, len * 0.755, 0]}><cylinderGeometry args={[w * 0.1, w * 0.1, len * 0.05, 6]} /><meshBasicMaterial color="#241a12" transparent={image} opacity={o} /></mesh>
      {lit && <>
        <mesh geometry={FLAME} position={[0, len * 0.765, 0]} scale={[w * 0.78, len * 0.235, w * 0.62]} renderOrder={3}><meshBasicMaterial color={tint ?? '#ff9a2e'} transparent opacity={image ? 0.7 : 0.95} depthWrite={false} toneMapped={false} /></mesh>
        <mesh geometry={FLAME} position={[0, len * 0.775, 0]} scale={[w * 0.4, len * 0.13, w * 0.32]} renderOrder={4}><meshBasicMaterial color={tint ? '#e9f4ff' : '#fff1b0'} transparent opacity={image ? 0.7 : 1} depthWrite={false} toneMapped={false} /></mesh>
        {!image && <pointLight position={[0, len * 0.9, 0.2]} intensity={0.8} distance={2.2} decay={1.6} color="#ffb060" />}
        {!image && <Glow y={len * 0.87} s={len * 1.35} />}
      </>}
      {dish && !image && <mesh geometry={dishOf(Math.round(w * 1000) / 1000)} castShadow><Metal kind="brass" grain="turned" rough={0.45} env={ENV * 1.6} /></mesh>}
    </group>
  )
}
const sticks = new Map<number, THREE.BufferGeometry>()
/** 高烛台：一根车出来的黄铜柱，底下一只宽脚，中间一个鼓肚，顶上一只接蜡油的小盘。底在 (x, y0)，高 h */
export function Candlestick({ x, y0, h, z = 0 }: { x: number; y0: number; h: number; z?: number }) {
  const key = Math.round(h * 1000)
  if (!sticks.has(key)) sticks.set(key, lathe([[0, 0], [0.125, 0], [0.13, 0.01], [0.118, 0.028], [0.06, 0.046], [0.034, 0.075], [0.028, h * 0.32], [0.05, h * 0.38], [0.05, h * 0.42], [0.026, h * 0.5], [0.021, h - 0.065], [0.03, h - 0.05], [0.07, h - 0.03], [0.074, h - 0.012], [0.045, h - 0.008], [0.04, h], [0, h]], { segs: 40 }))
  return <mesh geometry={sticks.get(key)!} position={[x, y0, z]} castShadow><Metal kind="brass" grain="turned" rough={0.4} env={ENV * 1.5} /></mesh>
}

// ---------- 激光笔 ----------
// 笔尖在原点，朝 +y 射出；笔身往 −y 方向伸。黑色的笔身上有几道防滑槽，前头一截黄铜的笔头
const PEN = lathe([[0, -0.5], [0.028, -0.5], [0.033, -0.494], [0.033, -0.462], [0.03, -0.458], [0.03, -0.44],
  ...[0, 1, 2, 3, 4].flatMap(i => [[0.033, -0.436 + i * 0.03], [0.033, -0.42 + i * 0.03], [0.03, -0.417 + i * 0.03], [0.03, -0.409 + i * 0.03]] as [number, number][]),
  [0.033, -0.286], [0.033, -0.142], [0.029, -0.138], [0.029, -0.02], [0, -0.02]], { segs: 28 })
const PEN_HEAD = lathe([[0.029, -0.136], [0.036, -0.132], [0.036, -0.05], [0.033, -0.044], [0.033, -0.03], [0.027, -0.004], [0.014, 0], [0.014, -0.016], [0.029, -0.016]], { segs: 28, closed: true })
/** 激光笔：tip 是笔尖的位置，dir 是光射出的方向。mount：背后带一块磁吸座（吸在铁质的光屏上） */
export function Laser({ tip, dir, on = true, z = 0, mount = false, color = '#ff5a4a' }: { tip: V2; dir: V2; on?: boolean; z?: number; mount?: boolean; color?: string }) {
  return (
    <group position={[tip[0], tip[1], z]} rotation-z={Math.atan2(dir[1], dir[0]) - Math.PI / 2}>
      <mesh geometry={PEN} castShadow><meshPhysicalMaterial color="#17191c" metalness={0.6} roughness={0.38} clearcoat={0.5} clearcoatRoughness={0.3} envMapIntensity={ENV * 0.8} /></mesh>
      <mesh geometry={PEN_HEAD} castShadow><Metal kind="brass" grain="turned" env={ENV * 1.4} /></mesh>
      {/* 笔夹和开关 */}
      <mesh position={[0, -0.37, 0.037]}><boxGeometry args={[0.014, 0.2, 0.005]} /><Metal kind="stainless" grain="brushed" env={ENV} /></mesh>
      <mesh position={[0, -0.465, 0.034]}><boxGeometry args={[0.016, 0.02, 0.012]} /><Metal kind="stainless" env={ENV} /></mesh>
      <mesh position={[0, -0.2, 0.031]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.011, 0.011, 0.012, 14]} /><meshStandardMaterial color={on ? '#d8402e' : '#6a2a22'} roughness={0.4} emissive={on ? '#ff3a24' : '#000000'} emissiveIntensity={on ? 0.5 : 0} /></mesh>
      {on && <mesh position={[0, -0.006, 0]}><cylinderGeometry args={[0.012, 0.012, 0.01, 14]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>}
      {mount && <>
        <mesh position={[0, -0.3, -0.045]}><boxGeometry args={[0.07, 0.18, 0.028]} /><meshStandardMaterial color="#20242a" roughness={0.6} /></mesh>
        <mesh position={[0, -0.3, -0.027]}><boxGeometry args={[0.05, 0.06, 0.02]} /><meshStandardMaterial color="#20242a" roughness={0.6} /></mesh>
      </>}
    </group>
  )
}

// ---------- 眼睛 ----------
const IRIS = disc(0.5, 0.06, { chamfer: 0.02, segs: 28 }), EYE_BASE = lathe([[0, 0], [0.11, 0], [0.116, 0.006], [0.116, 0.022], [0.1, 0.032], [0.03, 0.04], [0, 0.04]], { segs: 32 })
/** 一只眼睛的模型：白色的眼球，前面是虹膜和瞳孔。at 是眼球中心，look 是它看的方向 */
export function Eye({ at, look, r = 0.1, z = 0 }: { at: V2; look: V2; r?: number; z?: number }) {
  return (<>
    {/* 眼球模型架在一根细杆上，杆立在一只小圆座上 */}
    <mesh position={[at[0], (at[1] - r + TOP) / 2, z]} castShadow><cylinderGeometry args={[0.012, 0.012, at[1] - r - TOP, 12]} /><meshStandardMaterial color="#5d6166" metalness={0.8} roughness={0.4} /></mesh>
    <mesh geometry={EYE_BASE} position={[at[0], TOP, z]} castShadow><Metal kind="iron" grain="cast" env={ENV * 0.7} /></mesh>
    <group position={[at[0], at[1], z]} rotation-z={Math.atan2(look[1], look[0])} scale={r}>
      <mesh castShadow><sphereGeometry args={[1, 28, 20]} /><meshPhysicalMaterial color="#8f8a84" roughness={0.5} clearcoat={0.3} clearcoatRoughness={0.2} envMapIntensity={1} /></mesh>
      <mesh geometry={IRIS} position={[0.9, 0, 0]} rotation-z={-Math.PI / 2}><meshStandardMaterial color="#3d6f86" roughness={0.4} /></mesh>
      <mesh position={[0.955, 0, 0]} rotation-z={-Math.PI / 2}><cylinderGeometry args={[0.23, 0.23, 0.03, 20]} /><meshBasicMaterial color="#0a0b0d" /></mesh>
      <mesh position={[0.72, 0, 0]}><sphereGeometry args={[0.58, 24, 16]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.22} roughness={0.02} clearcoat={1} depthWrite={false} envMapIntensity={2.5} /></mesh>
    </group>
  </>)
}

// ---------- 镜子里的像 ----------
/**
 * 镜子里的像：把 children 按镜面对称再画一份，放在镜子后面，而且只有透过镜面那一块才看得见。
 * 镜面在 x 处，竖直，正面朝 −x；镜面这一块的范围是 z0–z1、y0–y1。每一帧按镜头的位置算出四个裁剪面（镜头和镜面四条边各定一个面），
 * 所以转动视角时像的位置和能看到的范围都是对的；镜头绕到镜子背后就看不到像。
 */
export function Mirrored({ x, y0, y1, z0, z1, children }: { x: number; y0: number; y1: number; z0: number; z1: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null), gl = useThree(s => s.gl)
  const planes = useMemo(() => Array.from({ length: 4 }, () => new THREE.Plane()), [])
  const tmp = useMemo(() => ({ c: new THREE.Vector3(), p: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] }), [])
  useLayoutEffect(() => {
    gl.localClippingEnabled = true
    g.current?.traverse(o => { const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined; if (m && !Array.isArray(m) && m.clippingPlanes !== planes) { m.clippingPlanes = planes; m.needsUpdate = true } })
  })
  useFrame(({ camera }) => {
    if (!g.current) return
    g.current.visible = camera.position.x < x
    tmp.p[0].set(x, y0, z0); tmp.p[1].set(x, y0, z1); tmp.p[2].set(x, y1, z1); tmp.p[3].set(x, y1, z0); tmp.c.set(x, (y0 + y1) / 2, (z0 + z1) / 2)
    for (let i = 0; i < 4; i++) { planes[i].setFromCoplanarPoints(camera.position, tmp.p[i], tmp.p[(i + 1) % 4]); if (planes[i].distanceToPoint(tmp.c) < 0) planes[i].negate() }
  })
  return <group ref={g} position={[2 * x, 0, 0]} scale={[-1, 1, 1]}>{children}</group>
}
