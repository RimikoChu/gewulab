// 坐标系：画在公路上空的半透明平面上，或者画在电子屏上。网格、刻度、数字、箭头、原点画进一张贴图；
// 函数的直线、描的点、读数的虚线是贴图前面的三维小件，能连续地动。
// 坐标系的局部坐标：贴图平面在 z = 0，朝 +z；数据点 (x, y) 落在 (ox + x·sx, oy + y·sy)。
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { canvas, tex, FONT, NUM } from './mats'
import { clip } from './physics'

export interface Axes {
  xr: [number, number]; yr: [number, number]       // 画到哪里（数据单位）
  xStep: number; yStep: number                     // 每隔多少标一个数
  sx: number; sy: number                           // 一个数据单位多少米
  ox: number; oy: number                           // 原点在平面上的位置（m）
  xName: string; yName: string                     // 轴名，写在箭头旁边
  minor?: [number, number]                         // 细网格的间隔
  font?: number                                    // 刻度数字的字高（m）
  w: number; h: number                             // 平面的宽高（m），左下角在 (0, 0)
}
export const at = (A: Axes, x: number, y: number, z = 0.06): [number, number, number] => [A.ox + x * A.sx, A.oy + y * A.sy, z]

const fmt = (v: number) => (Math.abs(v) < 1e-9 ? '0' : String(Math.round(v * 100) / 100).replace('-', '−'))
/** 坐标系的贴图。led：电子屏（深底亮线）；否则是公路上空的茶色玻璃 */
function drawAxes(A: Axes, led: boolean) {
  const ppm = Math.min(2048 / A.h, 4096 / A.w), W = Math.round(A.w * ppm), H = Math.round(A.h * ppm)
  const { c, g } = canvas(W, H)
  const px = (x: number) => (A.ox + x * A.sx) * ppm, py = (y: number) => H - (A.oy + y * A.sy) * ppm
  g.fillStyle = led ? '#0a1216' : 'rgba(9,18,24,0.93)'; g.fillRect(0, 0, W, H)
  const [x0, x1] = A.xr, [y0, y1] = A.yr
  if (A.minor) {
    g.strokeStyle = led ? 'rgba(160,210,230,0.16)' : 'rgba(160,210,230,0.26)'; g.lineWidth = Math.max(1, ppm * 0.02)
    for (let x = Math.ceil(x0 / A.minor[0]) * A.minor[0]; x <= x1 + 1e-9; x += A.minor[0]) { g.beginPath(); g.moveTo(px(x), py(y0)); g.lineTo(px(x), py(y1)); g.stroke() }
    for (let y = Math.ceil(y0 / A.minor[1]) * A.minor[1]; y <= y1 + 1e-9; y += A.minor[1]) { g.beginPath(); g.moveTo(px(x0), py(y)); g.lineTo(px(x1), py(y)); g.stroke() }
  }
  g.strokeStyle = led ? 'rgba(180,225,240,0.34)' : 'rgba(180,225,240,0.5)'; g.lineWidth = Math.max(1.5, ppm * 0.035)
  for (let x = Math.ceil(x0 / A.xStep) * A.xStep; x <= x1 + 1e-9; x += A.xStep) { g.beginPath(); g.moveTo(px(x), py(y0)); g.lineTo(px(x), py(y1)); g.stroke() }
  for (let y = Math.ceil(y0 / A.yStep) * A.yStep; y <= y1 + 1e-9; y += A.yStep) { g.beginPath(); g.moveTo(px(x0), py(y)); g.lineTo(px(x1), py(y)); g.stroke() }
  // 两根坐标轴，正方向一头带箭头
  const fs = (A.font ?? 0.5) * ppm, lw = Math.max(3, ppm * 0.07), ah = fs * 0.75
  g.strokeStyle = g.fillStyle = '#f2f7f8'; g.lineWidth = lw; g.lineCap = 'round'
  const ax = Math.max(x0, Math.min(x1, 0)), ay = Math.max(y0, Math.min(y1, 0))
  const ex = px(x1) + fs * 1.1, ey = py(y1) - fs * 1.1
  g.beginPath(); g.moveTo(px(x0) - (x0 < 0 ? fs * 0.6 : 0), py(ay)); g.lineTo(ex, py(ay)); g.stroke()
  g.beginPath(); g.moveTo(px(ax), py(y0) + (y0 < 0 ? fs * 0.6 : 0)); g.lineTo(px(ax), ey); g.stroke()
  g.beginPath(); g.moveTo(ex + ah, py(ay)); g.lineTo(ex - ah * 0.2, py(ay) - ah * 0.55); g.lineTo(ex - ah * 0.2, py(ay) + ah * 0.55); g.closePath(); g.fill()
  g.beginPath(); g.moveTo(px(ax), ey - ah); g.lineTo(px(ax) - ah * 0.55, ey + ah * 0.2); g.lineTo(px(ax) + ah * 0.55, ey + ah * 0.2); g.closePath(); g.fill()
  // 刻度和数字
  g.font = `600 ${Math.round(fs)}px ${NUM}`; g.textBaseline = 'top'; g.textAlign = 'center'
  for (let x = Math.ceil(x0 / A.xStep) * A.xStep; x <= x1 + 1e-9; x += A.xStep) {
    if (Math.abs(x) < 1e-9) continue
    g.fillRect(px(x) - lw / 2, py(ay) - fs * 0.28, lw, fs * 0.28); g.fillText(fmt(x), px(x), py(ay) + fs * 0.25)
  }
  g.textAlign = 'right'; g.textBaseline = 'middle'
  for (let y = Math.ceil(y0 / A.yStep) * A.yStep; y <= y1 + 1e-9; y += A.yStep) {
    if (Math.abs(y) < 1e-9) continue
    g.fillRect(px(ax), py(y) - lw / 2, fs * 0.28, lw); g.fillText(fmt(y), px(ax) - fs * 0.35, py(y))
  }
  g.font = `italic 600 ${Math.round(fs * 1.05)}px "STIX Two Text","Times New Roman",serif`; g.textAlign = 'right'; g.textBaseline = 'top'
  g.fillText('O', px(ax) - fs * 0.3, py(ay) + fs * 0.22)
  // 轴名：x 轴的写在箭头下方，y 轴的写在箭头右边
  g.font = `600 ${Math.round(fs * 0.9)}px ${FONT}`
  g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(A.xName, ex + ah, py(ay) - fs * 0.55)
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(A.yName, px(ax) + fs * 0.7, ey - ah * 0.2)
  return tex(c)
}

/** 坐标系平面本身。led 为真时是电子屏的屏面（自发光），否则是半透明的茶色玻璃。children 放在坐标系的局部坐标里 */
export function AxesPlane({ A, led = false, children }: { A: Axes; led?: boolean; children?: ReactNode }) {
  const map = useMemo(() => drawAxes(A, led), [A, led])
  return (
    <group>
      <mesh position={[A.w / 2, A.h / 2, 0]} renderOrder={1}>
        <planeGeometry args={[A.w, A.h]} />
        {led ? <meshBasicMaterial map={map} toneMapped={false} color="#d8dde0" /> : <meshBasicMaterial map={map} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} color="#e4e8ea" />}
      </mesh>
      {children}
    </group>
  )
}

/** 公路上空的平面框：四边细铝框，底下两根立柱落在中央分隔带上（立柱高 base） */
export function GlassFrame({ A, base }: { A: Axes; base: number }) {
  const t = 0.12
  return (
    <group>
      {[[A.w / 2, 0, A.w + t, t], [A.w / 2, A.h, A.w + t, t]].map(([x, y, w, h], i) => <mesh key={`h${i}`} position={[x, y, 0]} castShadow><boxGeometry args={[w, h, 0.14]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
      {[0, A.w].map(x => <mesh key={`v${x}`} position={[x, A.h / 2, 0]} castShadow><boxGeometry args={[t, A.h, 0.14]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
      {[A.w * 0.12, A.w * 0.88].map(x => <group key={x}>
        <mesh position={[x, -base / 2, -0.05]} castShadow><boxGeometry args={[0.32, base, 0.32]} /><Metal kind="steel" grain="brushed" rough={0.5} /></mesh>
        <mesh position={[x, -base + 0.02, -0.05]}><boxGeometry args={[0.6, 0.04, 0.6]} /><Metal kind="steel" grain="cast" /></mesh>
      </group>)}
    </group>
  )
}

/** 电子屏：钢框、屏面、背后的桁架、两根立柱和混凝土基础。坐标系的平面贴在屏面上，屏面下沿离地 lift 米 */
export function LedBoard({ A, lift, children }: { A: Axes; lift: number; children?: ReactNode }) {
  const f = 0.3, d = 0.5
  return (
    <group>
      <group position={[0, lift, 0]}>
        <RoundedBox args={[A.w + f * 2, A.h + f * 2, d]} radius={0.06} position={[A.w / 2, A.h / 2, -d / 2 - 0.01]} castShadow receiveShadow><meshStandardMaterial color="#1d2125" roughness={0.55} metalness={0.5} /></RoundedBox>
        {[A.h * 0.25, A.h * 0.75].map(y => <mesh key={y} position={[A.w / 2, y, -d - 0.3]}><boxGeometry args={[A.w, 0.16, 0.16]} /><Metal kind="steel" rough={0.5} /></mesh>)}
        <AxesPlane A={A} led>{children}</AxesPlane>
      </group>
      {[A.w * 0.22, A.w * 0.78].map(x => <group key={x} position={[x, 0, -d - 0.3]}>
        <mesh position={[0, (lift + A.h * 0.75) / 2, 0]} castShadow><cylinderGeometry args={[0.32, 0.36, lift + A.h * 0.75, 24]} /><meshStandardMaterial color="#c9ccce" metalness={0.6} roughness={0.42} /></mesh>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow><boxGeometry args={[1.6, 0.5, 1.6]} /><meshStandardMaterial color="#a8a69f" roughness={0.9} /></mesh>
      </group>)}
    </group>
  )
}

/** 一条直线 y = kx + b，画在坐标系的框里。k、b 可以是正在过渡中的值 */
export function FnLine({ A, k, b, color, width = 0.12, opacity = 1, xr }: { A: Axes; k: number; b: number; color: string; width?: number; opacity?: number; xr?: [number, number] }) {
  const ref = useRef<THREE.Mesh>(null)
  const seg = clip(k, b, xr ?? A.xr, A.yr)
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return
    if (!seg) { m.visible = false; return }
    const p = new THREE.Vector3(...at(A, ...seg[0], 0.08)), q = new THREE.Vector3(...at(A, ...seg[1], 0.08))
    m.visible = true; m.position.copy(p).add(q).multiplyScalar(0.5); m.scale.set(p.distanceTo(q), 1, 1); m.rotation.set(0, 0, Math.atan2(q.y - p.y, q.x - p.x))
  })
  return <mesh ref={ref} renderOrder={3}><boxGeometry args={[1, width, 0.02]} /><meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} /></mesh>
}

/** 两点之间的一段（连线、分段函数用） */
export function Seg({ A, p, q, color, width = 0.12, opacity = 1 }: { A: Axes; p: [number, number]; q: [number, number]; color: string; width?: number; opacity?: number }) {
  const P = new THREE.Vector3(...at(A, ...p, 0.08)), Q = new THREE.Vector3(...at(A, ...q, 0.08)), l = P.distanceTo(Q)
  if (l < 1e-4) return null
  return <mesh renderOrder={3} position={P.clone().add(Q).multiplyScalar(0.5)} rotation-z={Math.atan2(Q.y - P.y, Q.x - P.x)}><boxGeometry args={[l, width, 0.02]} /><meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} /></mesh>
}

/** 描的点：实心圆加一圈白边 */
export function Dot({ A, x, y, color = '#ffd25a', r = 0.3, ring = true }: { A: Axes; x: number; y: number; color?: string; r?: number; ring?: boolean }) {
  return (
    <group position={at(A, x, y, 0.1)}>
      {ring && <mesh renderOrder={4}><circleGeometry args={[r * 1.35, 32]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>}
      <mesh position={[0, 0, 0.01]} renderOrder={5}><circleGeometry args={[r, 32]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    </group>
  )
}

/** 读数用的虚线：从 (x, y) 垂直落到 x 轴、水平连到 y 轴 */
export function Guides({ A, x, y, color = '#ffe9a8', both = true }: { A: Axes; x: number; y: number; color?: string; both?: boolean }) {
  const dash = (p: [number, number, number], q: [number, number, number]) => {
    const P = new THREE.Vector3(...p), Q = new THREE.Vector3(...q), l = P.distanceTo(Q), n = Math.max(1, Math.floor(l / 0.5)), out: ReactNode[] = []
    for (let i = 0; i < n; i += 1) { const a = P.clone().lerp(Q, (i + 0.15) / n), c = P.clone().lerp(Q, (i + 0.65) / n); out.push(<mesh key={`${p}${i}`} position={a.clone().add(c).multiplyScalar(0.5)} rotation-z={Math.atan2(Q.y - P.y, Q.x - P.x)} renderOrder={3}><boxGeometry args={[a.distanceTo(c), 0.07, 0.01]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>) }
    return out
  }
  const y0 = Math.max(A.yr[0], Math.min(A.yr[1], 0)), x0 = Math.max(A.xr[0], Math.min(A.xr[1], 0))
  return <group>{dash(at(A, x, y, 0.07), at(A, x, y0, 0.07))}{both && dash(at(A, x, y, 0.07), at(A, x0, y, 0.07))}</group>
}
