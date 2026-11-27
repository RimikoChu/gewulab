// 电子屏和屏上的坐标系。屏是深色不透明的户外 LED 屏：钢框、遮雨檐、背后桁架、两根立柱、混凝土基础。
// 网格、刻度、数字、箭头画进一张贴图；曲线、割线、切线、点、虚线是贴在屏面前面的三维小件，参数一变就连续地动。
// 全实验室统一的线色在 C 里：函数琥珀色、割线天蓝、切线珊瑚红、导函数紫色、递增绿、递减橙。
import { useLayoutEffect, useMemo, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { canvas, tex, FONT, NUM } from './mats'
import { fmt } from './physics'

export const C = { curve: '#ffc94a', secant: '#5cc4ff', tangent: '#ff6250', deriv: '#c69bff', up: '#6fe08a', down: '#ff9a52', dot: '#ffffff', guide: '#ffe9a8' }

type V3 = [number, number, number]
export interface AxesIn { xr: [number, number]; yr: [number, number]; xStep: number; yStep: number; xName: string; yName: string; w: number; h: number; font?: number; minor?: [number, number] }
export interface Axes extends AxesIn { sx: number; sy: number; ox: number; oy: number; font: number }
/** 坐标系：一格面板 w × h（m），四边留出写数字的地方，数据范围铺满其余部分 */
export function axes(i: AxesIn): Axes {
  const font = i.font ?? 0.42, mL = font * 3.2, mR = font * 2.6, mB = font * 2.1, mT = font * 1.9
  const sx = (i.w - mL - mR) / (i.xr[1] - i.xr[0]), sy = (i.h - mB - mT) / (i.yr[1] - i.yr[0])
  return { ...i, font, sx, sy, ox: mL - i.xr[0] * sx, oy: mB - i.yr[0] * sy }
}
/** 数据点 (x, y) 在面板上的位置（面板左下角为原点） */
export const at = (A: Axes, x: number, y: number, z = 0.06): V3 => [A.ox + x * A.sx, A.oy + y * A.sy, z]

function drawAxes(A: Axes) {
  const ppm = Math.min(2048 / A.h, 4096 / A.w), W = Math.round(A.w * ppm), Hh = Math.round(A.h * ppm)
  const { c, g } = canvas(W, Hh)
  const px = (x: number) => (A.ox + x * A.sx) * ppm, py = (y: number) => Hh - (A.oy + y * A.sy) * ppm
  g.fillStyle = '#060b0e'; g.fillRect(0, 0, W, Hh)
  // LED 屏的像素点：很淡的一层小方格，近看是屏，远看看不出来
  const pitch = Math.max(3, Math.round(ppm * 0.05))
  g.fillStyle = 'rgba(120,150,170,0.05)'
  for (let y = 0; y < Hh; y += pitch) for (let x = 0; x < W; x += pitch) g.fillRect(x, y, pitch * 0.55, pitch * 0.55)
  const [x0, x1] = A.xr, [y0, y1] = A.yr, fs = A.font * ppm
  const vline = (x: number) => { g.beginPath(); g.moveTo(px(x), py(y0)); g.lineTo(px(x), py(y1)); g.stroke() }
  const hline = (y: number) => { g.beginPath(); g.moveTo(px(x0), py(y)); g.lineTo(px(x1), py(y)); g.stroke() }
  const each = (a: number, b: number, s: number, f: (v: number) => void) => { for (let v = Math.ceil(a / s - 1e-9) * s; v <= b + 1e-9; v += s) f(Math.round(v * 1e6) / 1e6) }
  if (A.minor) { g.strokeStyle = 'rgba(150,200,225,0.10)'; g.lineWidth = Math.max(1, fs * 0.04); each(x0, x1, A.minor[0], vline); each(y0, y1, A.minor[1], hline) }
  g.strokeStyle = 'rgba(160,210,232,0.26)'; g.lineWidth = Math.max(1.5, fs * 0.06); each(x0, x1, A.xStep, vline); each(y0, y1, A.yStep, hline)
  // 坐标轴：落在 0 上；0 不在范围里就落在边上
  const ax = Math.max(x0, Math.min(x1, 0)), ay = Math.max(y0, Math.min(y1, 0)), lw = Math.max(3, fs * 0.11), ah = fs * 0.6
  const ex = px(x1) + fs * 1.15, ey = py(y1) - fs * 1.15
  g.strokeStyle = g.fillStyle = '#eef4f6'; g.lineWidth = lw; g.lineCap = 'round'
  g.beginPath(); g.moveTo(px(x0), py(ay)); g.lineTo(ex, py(ay)); g.stroke()
  g.beginPath(); g.moveTo(px(ax), py(y0)); g.lineTo(px(ax), ey); g.stroke()
  g.beginPath(); g.moveTo(ex + ah, py(ay)); g.lineTo(ex - ah * 0.3, py(ay) - ah * 0.55); g.lineTo(ex - ah * 0.3, py(ay) + ah * 0.55); g.closePath(); g.fill()
  g.beginPath(); g.moveTo(px(ax), ey - ah); g.lineTo(px(ax) - ah * 0.55, ey + ah * 0.3); g.lineTo(px(ax) + ah * 0.55, ey + ah * 0.3); g.closePath(); g.fill()
  g.font = `600 ${Math.round(fs)}px ${NUM}`; g.fillStyle = '#dfe8ec'
  g.textAlign = 'center'; g.textBaseline = 'top'
  each(x0, x1, A.xStep, x => { if (Math.abs(x - ax) < 1e-9 && ax === 0) return; g.fillRect(px(x) - lw / 2, py(ay) - fs * 0.28, lw, fs * 0.56); g.fillText(fmt(x, 2), px(x), py(ay) + fs * 0.4) })
  g.textAlign = 'right'; g.textBaseline = 'middle'
  each(y0, y1, A.yStep, y => { if (Math.abs(y - ay) < 1e-9 && ay === 0) return; g.fillRect(px(ax) - fs * 0.28, py(y) - lw / 2, fs * 0.56, lw); g.fillText(fmt(y, 2), px(ax) - fs * 0.45, py(y)) })
  if (ax === 0 && ay === 0) { g.font = `italic 600 ${Math.round(fs * 1.05)}px "STIX Two Text","Times New Roman",serif`; g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText('O', px(0) - fs * 0.3, py(0) + fs * 0.25) }
  g.font = `600 ${Math.round(fs * 0.95)}px ${FONT}`; g.fillStyle = '#eef4f6'
  g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(A.xName, ex + ah, py(ay) - fs * 0.45)
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(A.yName, px(ax) + fs * 0.7, ey)
  return tex(c)
}

/** 一格坐标系面板：左下角在 (0, 0)，朝 +z。children 用面板坐标 */
export function Panel({ A, children }: { A: Axes; children?: ReactNode }) {
  const map = useMemo(() => drawAxes(A), [A])
  return (
    <group>
      <mesh position={[A.w / 2, A.h / 2, 0]}><planeGeometry args={[A.w, A.h]} /><meshBasicMaterial map={map} toneMapped={false} color="#dfe4e6" /></mesh>
      {children}
    </group>
  )
}

/** 立在地上的电子屏。原点在屏下方的地面上（屏面中线），屏面朝 +z；屏面左下角在 (−w/2, lift)。children 放在屏面坐标里 */
export function Screen({ w, h, lift = 3.2, children }: { w: number; h: number; lift?: number; children?: ReactNode }) {
  const f = 0.32, d = 0.55, legH = lift + h * 0.72
  return (
    <group>
      <group position={[0, lift, 0]}>
        {/* 屏体：深色钢框、背后的箱体和两道横梁；顶上一道铝遮雨檐 */}
        <RoundedBox args={[w + f * 2, h + f * 2, d]} radius={0.07} position={[0, h / 2, -d / 2 - 0.01]} castShadow receiveShadow><meshStandardMaterial color="#1b1f23" roughness={0.5} metalness={0.55} /></RoundedBox>
        <mesh position={[0, h / 2, -0.012]}><boxGeometry args={[w + 0.06, h + 0.06, 0.01]} /><meshStandardMaterial color="#0b0d0f" roughness={0.4} /></mesh>
        <mesh position={[0, h + f + 0.06, 0.12]} rotation-x={0.18} castShadow><boxGeometry args={[w + f * 2 + 0.3, 0.06, 0.9]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        {[h * 0.22, h * 0.78].map(y => <mesh key={y} position={[0, y, -d - 0.22]} castShadow><boxGeometry args={[w * 0.92, 0.22, 0.22]} /><Metal kind="steel" grain="brushed" rough={0.5} /></mesh>)}
        {/* 屏下沿的铭牌条、检修灯 */}
        <mesh position={[0, -f + 0.08, 0.005]}><boxGeometry args={[w * 0.18, 0.1, 0.02]} /><Metal kind="stainless" grain="brushed" /></mesh>
        <group position={[-w / 2, 0, 0]}>{children}</group>
      </group>
      {[-w * 0.28, w * 0.28].map(x => <group key={x} position={[x, 0, -d - 0.45]}>
        <mesh position={[0, legH / 2, 0]} castShadow><cylinderGeometry args={[0.3, 0.34, legH, 28]} /><meshStandardMaterial color="#c3c7ca" metalness={0.6} roughness={0.42} /></mesh>
        <mesh position={[0, 0.42, 0]} castShadow><cylinderGeometry args={[0.5, 0.5, 0.06, 28]} /><Metal kind="steel" grain="cast" /></mesh>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow><boxGeometry args={[1.7, 0.42, 1.7]} /><meshStandardMaterial color="#a9a69e" roughness={0.92} /></mesh>
        {[[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]].map(([a, b]) => <mesh key={`${a}${b}`} position={[a, 0.48, b]}><cylinderGeometry args={[0.035, 0.035, 0.1, 6]} /><Metal kind="steel" /></mesh>)}
      </group>)}
    </group>
  )
}

/** 一条曲线 y = f(x)：画成面板上的一条宽带，只画落在范围里的那一段 */
export function Curve({ A, f, xr, color, width = 0.11, opacity = 1, z = 0.05, n = 160 }: { A: Axes; f: (x: number) => number; xr: [number, number]; color: string; width?: number; opacity?: number; z?: number; n?: number }) {
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((n + 1) * 2 * 3), 3)); const idx: number[] = []; for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); g.setIndex(idx); return g }, [n])
  useLayoutEffect(() => {
    const p = geo.attributes.position as THREE.BufferAttribute
    let lo = Math.max(xr[0], A.xr[0]), hi = Math.min(xr[1], A.xr[1])
    const ok = (x: number) => { const y = f(x); return Number.isFinite(y) && y >= A.yr[0] - 0.02 * (A.yr[1] - A.yr[0]) && y <= A.yr[1] + 0.02 * (A.yr[1] - A.yr[0]) }
    const M = 600; let a0 = -1, a1 = -1
    for (let i = 0; i <= M; i++) { const x = lo + (hi - lo) * i / M; if (ok(x)) { if (a0 < 0) a0 = i; a1 = i } }
    if (a0 < 0 || hi <= lo) { a0 = 0; a1 = 0 }
    ;[lo, hi] = [lo + (hi - lo) * a0 / M, lo + (hi - lo) * a1 / M]
    const pts: [number, number][] = []
    for (let i = 0; i <= n; i++) { const x = lo + (hi - lo) * i / n, y = Math.max(A.yr[0], Math.min(A.yr[1], f(x))); pts.push([A.ox + x * A.sx, A.oy + y * A.sy]) }
    for (let i = 0; i <= n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * width / 2, ny = dx / l * width / 2
      p.setXYZ(i * 2, pts[i][0] + nx, pts[i][1] + ny, z); p.setXYZ(i * 2 + 1, pts[i][0] - nx, pts[i][1] - ny, z)
    }
    p.needsUpdate = true; geo.computeBoundingSphere()
  })
  return <mesh geometry={geo} renderOrder={3} frustumCulled={false}><meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} /></mesh>
}

/** 直线 y = kx + b 和面板数据范围的交线段 */
function clip(A: Axes, k: number, b: number, xr = A.xr): [[number, number], [number, number]] | null {
  let x0 = Math.max(xr[0], A.xr[0]), x1 = Math.min(xr[1], A.xr[1])
  const [y0, y1] = A.yr
  if (Math.abs(k) > 1e-12) { const xa = (y0 - b) / k, xb = (y1 - b) / k; x0 = Math.max(x0, Math.min(xa, xb)); x1 = Math.min(x1, Math.max(xa, xb)) }
  else if (b < y0 || b > y1) return null
  if (x1 <= x0) return null
  return [[x0, k * x0 + b], [x1, k * x1 + b]]
}
/** 一段实线（面板坐标里的两个数据点） */
export function Seg({ A, p, q, color, width = 0.1, opacity = 1, z = 0.07 }: { A: Axes; p: [number, number]; q: [number, number]; color: string; width?: number; opacity?: number; z?: number }) {
  const P = new THREE.Vector3(...at(A, ...p, z)), Q = new THREE.Vector3(...at(A, ...q, z)), l = P.distanceTo(Q)
  if (l < 1e-4) return null
  return <mesh renderOrder={4} position={P.clone().add(Q).multiplyScalar(0.5)} rotation-z={Math.atan2(Q.y - P.y, Q.x - P.x)}><planeGeometry args={[l, width]} /><meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} depthWrite={false} /></mesh>
}
/** 直线 y = kx + b（割线、切线），截在面板里；xr 可以只画一段 */
export function Line({ A, k, b, color, width = 0.1, opacity = 1, xr }: { A: Axes; k: number; b: number; color: string; width?: number; opacity?: number; xr?: [number, number] }) {
  const s = clip(A, k, b, xr)
  return s ? <Seg A={A} p={s[0]} q={s[1]} color={color} width={width} opacity={opacity} z={0.08} /> : null
}
/** 虚线 */
export function Dash({ A, p, q, color = C.guide, width = 0.06, gap = 0.4, opacity = 0.85 }: { A: Axes; p: [number, number]; q: [number, number]; color?: string; width?: number; gap?: number; opacity?: number }) {
  const P = new THREE.Vector3(...at(A, ...p, 0.065)), Q = new THREE.Vector3(...at(A, ...q, 0.065)), l = P.distanceTo(Q)
  if (l < 1e-3) return null
  const n = Math.max(1, Math.round(l / gap)), rot = Math.atan2(Q.y - P.y, Q.x - P.x), out: ReactNode[] = []
  for (let i = 0; i < n; i++) { const a = P.clone().lerp(Q, i / n), c = P.clone().lerp(Q, (i + 0.55) / n); out.push(<mesh key={i} position={a.clone().add(c).multiplyScalar(0.5)} rotation-z={rot} renderOrder={4}><planeGeometry args={[a.distanceTo(c), width]} /><meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} depthWrite={false} /></mesh>) }
  return <group>{out}</group>
}
/** 描的点：实心圆加一圈白边 */
export function Dot({ A, x, y, color = C.dot, r = 0.16, ring = '#0b1014' }: { A: Axes; x: number; y: number; color?: string; r?: number; ring?: string }) {
  return (
    <group position={at(A, x, y, 0.1)}>
      <mesh renderOrder={5}><circleGeometry args={[r * 1.45, 32]} /><meshBasicMaterial color={ring} toneMapped={false} transparent depthWrite={false} /></mesh>
      <mesh position={[0, 0, 0.01]} renderOrder={6}><circleGeometry args={[r, 32]} /><meshBasicMaterial color={color} toneMapped={false} transparent depthWrite={false} /></mesh>
    </group>
  )
}
/** 一段区间的底色：x0 到 x1 整条竖带，标递增、递减区间用 */
export function Band({ A, x0, x1, color, opacity = 0.2 }: { A: Axes; x0: number; x1: number; color: string; opacity?: number }) {
  const a = at(A, x0, A.yr[0], 0.02), b = at(A, x1, A.yr[1], 0.02)
  return <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.02]} renderOrder={2}><planeGeometry args={[Math.max(1e-3, b[0] - a[0]), b[1] - a[1]]} /><meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} depthWrite={false} /></mesh>
}

/** 一块屏在世界里的位置：origin 是屏下方地面上的点，az 是屏面朝向（绕 y 轴），w、lift 同 Screen */
export interface Mount { origin: V3; az: number; w: number; lift: number }
/** 屏面坐标（左下角为原点）换成世界坐标，out 是离屏面多远 */
export function faceWorld(M: Mount, p: [number, number], out = 0.2): V3 {
  const lx = p[0] - M.w / 2, c = Math.cos(M.az), s = Math.sin(M.az)
  return [M.origin[0] + lx * c + out * s, M.origin[1] + M.lift + p[1], M.origin[2] - lx * s + out * c]
}
/** 面板 off 处的数据点 (x, y) 的世界坐标（给文字标签用） */
export const dataWorld = (M: Mount, off: [number, number], A: Axes, x: number, y: number, out = 0.2): V3 => faceWorld(M, [off[0] + A.ox + x * A.sx, off[1] + A.oy + y * A.sy], out)
/** 把一块屏立到世界里 */
export function Mounted({ M, h, children }: { M: Mount; h: number; children?: ReactNode }) {
  return <group position={M.origin} rotation-y={M.az}><Screen w={M.w} h={h} lift={M.lift}>{children}</Screen></group>
}
