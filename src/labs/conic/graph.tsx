// 画图用的小件：坐标屏（深色不透明的大屏，网格、刻度、轴名画进一张贴图）、曲线、点、线段、填充。
// 都画在一个平面里（局部坐标的 z = 0，朝 +z），尺寸按米；数据单位乘 A.s 换成米。曲线可以只画前一段（frac），所以能“一笔一笔画出来”。
// 颜色全实验室统一：曲线金黄，焦点橙红，焦半径一青一粉，准线紫，渐近线淡蓝，光线和电波亮黄。
import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { canvas, tex, FONT, NUM, SERIF } from './mats'
import type { P2 } from './physics'

export const COL = { curve: '#ffd25a', focus: '#ff7a59', r1: '#62e6d2', r2: '#ff9ec4', directrix: '#c9a6ff', asym: '#9fd8ff', ray: '#fff1a0', ink: '#f4f8f9', ghost: '#8fa6ad' }

/** 画在最前面：立在实物剖面上的图，不让前面的支架挡住 */
export const FrontCtx = createContext(false)

export interface Axes {
  xr: [number, number]; yr: [number, number]       // 画到哪里（数据单位）
  step: number                                     // 每隔多少标一个数
  s: number                                        // 一个数据单位多少米
  xName?: string; yName?: string
  font?: number                                    // 刻度数字的字高（m）
  pad?: number                                     // 屏比数据范围四周多出多少米
  tint?: string                                    // 底色（可以半透明）
  minor?: number                                   // 细网格的间隔
  light?: boolean                                  // 立在实物剖面上的浅色半透明平面：只有网格和轴线，线带深色描边
}
export const pt = (A: Axes, x: number, y: number): P2 => [x * A.s, y * A.s]
export const bounds = (A: Axes) => { const p = A.pad ?? 0.3; return { x0: A.xr[0] * A.s - p, x1: A.xr[1] * A.s + p, y0: A.yr[0] * A.s - p, y1: A.yr[1] * A.s + p } }

const num = (v: number) => (Math.abs(v) < 1e-9 ? '0' : String(Math.round(v * 100) / 100).replace('-', '−'))
function drawAxes(A: Axes) {
  const B = bounds(A), w = B.x1 - B.x0, h = B.y1 - B.y0
  const ppm = Math.min(2048 / h, 2048 / w), W = Math.round(w * ppm), H = Math.round(h * ppm)
  const { c, g } = canvas(W, H)
  const px = (x: number) => (x * A.s - B.x0) * ppm, py = (y: number) => H - (y * A.s - B.y0) * ppm
  g.fillStyle = A.tint ?? (A.light ? 'rgba(205,228,240,0.16)' : '#0d1a22'); g.fillRect(0, 0, W, H)
  const [x0, x1] = A.xr, [y0, y1] = A.yr
  const grid = (step: number, col: string, lw: number) => {
    g.strokeStyle = col; g.lineWidth = lw
    for (let x = Math.ceil(x0 / step - 1e-9) * step; x <= x1 + 1e-9; x += step) { g.beginPath(); g.moveTo(px(x), py(y0)); g.lineTo(px(x), py(y1)); g.stroke() }
    for (let y = Math.ceil(y0 / step - 1e-9) * step; y <= y1 + 1e-9; y += step) { g.beginPath(); g.moveTo(px(x0), py(y)); g.lineTo(px(x1), py(y)); g.stroke() }
  }
  const fs = (A.font ?? 0.16) * ppm, lw = Math.max(3, fs * 0.12), ah = fs * 0.7
  if (A.minor) grid(A.minor, 'rgba(170,215,235,0.10)', Math.max(1, fs * 0.03))
  if (A.light) grid(A.step, 'rgba(16,40,56,0.34)', Math.max(2.5, fs * 0.09))
  grid(A.step, A.light ? 'rgba(240,248,252,0.6)' : 'rgba(180,225,245,0.22)', Math.max(1.5, fs * 0.05))
  // 两根坐标轴，正方向一头带箭头
  const ex = px(x1) + fs * 0.4, ey = py(y1) - fs * 0.4
  const ink = A.light ? '#0e2636' : COL.ink, rim = A.light ? 'rgba(255,255,255,0.8)' : 'rgba(8,18,24,0.8)'
  for (const [col, w] of (A.light ? [[rim, lw * 2.2], [ink, lw]] : [[ink, lw]]) as [string, number][]) {
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'
    g.beginPath(); g.moveTo(px(x0), py(0)); g.lineTo(ex, py(0)); g.stroke()
    g.beginPath(); g.moveTo(px(0), py(y0)); g.lineTo(px(0), ey); g.stroke()
  }
  g.strokeStyle = g.fillStyle = ink; g.lineWidth = lw
  g.beginPath(); g.moveTo(ex + ah, py(0)); g.lineTo(ex - ah * 0.25, py(0) - ah * 0.55); g.lineTo(ex - ah * 0.25, py(0) + ah * 0.55); g.closePath(); g.fill()
  g.beginPath(); g.moveTo(px(0), ey - ah); g.lineTo(px(0) - ah * 0.55, ey + ah * 0.25); g.lineTo(px(0) + ah * 0.55, ey + ah * 0.25); g.closePath(); g.fill()
  // 刻度和数字
  g.font = `600 ${Math.round(fs)}px ${NUM}`; g.lineJoin = 'round'
  const label = (s: string, x: number, y: number) => { g.strokeStyle = rim; g.lineWidth = fs * 0.24; g.strokeText(s, x, y); g.fillStyle = ink; g.fillText(s, x, y) }
  g.textBaseline = 'top'; g.textAlign = 'center'
  for (let x = Math.ceil(x0 / A.step - 1e-9) * A.step; x <= x1 - A.step * 0.4; x += A.step) { if (Math.abs(x) < 1e-9) continue; g.fillStyle = ink; g.fillRect(px(x) - lw / 2, py(0) - fs * 0.3, lw, fs * 0.6); label(num(x), px(x), py(0) + fs * 0.4) }
  g.textAlign = 'right'; g.textBaseline = 'middle'
  for (let y = Math.ceil(y0 / A.step - 1e-9) * A.step; y <= y1 - A.step * 0.4; y += A.step) { if (Math.abs(y) < 1e-9) continue; g.fillStyle = ink; g.fillRect(px(0) - fs * 0.3, py(y) - lw / 2, fs * 0.6, lw); label(num(y), px(0) - fs * 0.45, py(y)) }
  g.font = `italic 600 ${Math.round(fs * 1.15)}px ${SERIF}`; g.textAlign = 'right'; g.textBaseline = 'top'
  label('O', px(0) - fs * 0.3, py(0) + fs * 0.25)
  g.font = `italic 600 ${Math.round(fs * 1.25)}px ${A.xName && A.xName.length > 1 ? FONT : SERIF}`
  g.textAlign = 'right'; g.textBaseline = 'bottom'; label(A.xName ?? 'x', ex + ah, py(0) - fs * 0.5)
  g.textAlign = 'left'; g.textBaseline = 'middle'; label(A.yName ?? 'y', px(0) + fs * 0.7, ey - ah * 0.2)
  return tex(c)
}

/** 坐标平面：一张贴图。glass 为真时是半透明的（立在实物的剖面上） */
export function AxesPlane({ A, glass = false, opacity = 1 }: { A: Axes; glass?: boolean; opacity?: number }) {
  const map = useMemo(() => drawAxes(A), [A]), front = useContext(FrontCtx)
  const B = bounds(A)
  return (
    <mesh position={[(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, 0]} renderOrder={glass ? 4 : 0}>
      <planeGeometry args={[B.x1 - B.x0, B.y1 - B.y0]} />
      <meshBasicMaterial map={map} transparent={glass} opacity={opacity} depthWrite={!glass} depthTest={!front} side={THREE.DoubleSide} toneMapped={false} color="#dfe5e8" />
    </mesh>
  )
}

/** 坐标屏：深色的大屏装在黑色铝框里，背后是钢架，两条腿落在底板上。这一组的原点是坐标原点；lift 是原点离地多高 */
export function Board({ A, lift, children }: { A: Axes; lift: number; children?: ReactNode }) {
  const B = bounds(A), w = B.x1 - B.x0, h = B.y1 - B.y0, cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2, t = 0.09
  const dark = <meshStandardMaterial color="#15191c" roughness={0.45} metalness={0.6} />
  return (
    <group>
      <mesh position={[cx, cy, -0.09]} castShadow><boxGeometry args={[w + t * 2, h + t * 2, 0.16]} />{dark}</mesh>
      <AxesPlane A={A} />
      {/* 四边的框压住屏的边 */}
      {[B.y0 - t / 2, B.y1 + t / 2].map(y => <mesh key={y} position={[cx, y, 0.0]} castShadow><boxGeometry args={[w + t * 2, t, 0.06]} />{dark}</mesh>)}
      {[B.x0 - t / 2, B.x1 + t / 2].map(x => <mesh key={x} position={[x, cy, 0.0]} castShadow><boxGeometry args={[t, h, 0.06]} />{dark}</mesh>)}
      {/* 背后的横梁、两条腿、底板和地脚螺栓 */}
      {[B.y0 + h * 0.25, B.y0 + h * 0.75].map(y => <mesh key={y} position={[cx, y, -0.22]}><boxGeometry args={[w * 0.9, 0.1, 0.1]} /><Metal kind="steel" grain="brushed" /></mesh>)}
      {[B.x0 + w * 0.2, B.x1 - w * 0.2].map(x => <group key={x} position={[x, 0, -0.26]}>
        <mesh position-y={(B.y1 - lift) / 2 - 0.2} castShadow><boxGeometry args={[0.14, B.y1 + lift - 0.4, 0.14]} /><Metal kind="steel" grain="brushed" /></mesh>
        <mesh position={[0, (B.y0 - lift) / 2, 0.38]} rotation-x={-0.5} castShadow><boxGeometry args={[0.08, (B.y0 + lift) * 1.1, 0.08]} /><Metal kind="steel" grain="brushed" /></mesh>
        <mesh position={[0, -lift + 0.02, 0.2]} castShadow receiveShadow><boxGeometry args={[0.46, 0.04, 1.1]} /><Metal kind="iron" grain="cast" /></mesh>
      </group>)}
      {children}
    </group>
  )
}

const MAXN = 720
/** 一条曲线：过一串点的一条宽带。frac：只画前面这一段（0–1）；closed：首尾相接 */
export function Path({ pts, color = COL.curve, width = 0.05, frac = 1, z = 0.02, opacity = 1, closed = false }: { pts: P2[]; color?: string; width?: number; frac?: number; z?: number; opacity?: number; closed?: boolean }) {
  const front = useContext(FrontCtx)
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXN * 2 * 3), 3))
    const idx: number[] = []; for (let i = 0; i < MAXN - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    g.setIndex(idx); return g
  }, [])
  useLayoutEffect(() => {
    const p = geo.attributes.position as THREE.BufferAttribute, n = Math.min(MAXN, pts.length)
    for (let i = 0; i < n; i++) {
      const a = pts[closed ? (i - 1 + n - (i === 0 ? 1 : 0)) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1 + (i === n - 1 ? 1 : 0)) % n : Math.min(n - 1, i + 1)]
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * width / 2, ny = dx / l * width / 2
      p.setXYZ(i * 2, pts[i][0] + nx, pts[i][1] + ny, z); p.setXYZ(i * 2 + 1, pts[i][0] - nx, pts[i][1] - ny, z)
    }
    p.needsUpdate = true; geo.setDrawRange(0, Math.max(0, Math.round(Math.min(1, frac) * (n - 1))) * 6); geo.computeBoundingSphere()
  })
  return <mesh geometry={geo} renderOrder={6} frustumCulled={false}><meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} depthWrite={false} depthTest={!front} side={THREE.DoubleSide} /></mesh>
}

/** 把一圈点围成的区域涂上淡淡的颜色 */
export function Fill({ pts, color = COL.curve, opacity = 0.25, z = 0.012 }: { pts: P2[]; color?: string; opacity?: number; z?: number }) {
  const front = useContext(FrontCtx)
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((MAXN + 1) * 3), 3)); const idx: number[] = []; for (let i = 0; i < MAXN - 1; i++) idx.push(0, i + 1, i + 2); g.setIndex(idx); return g }, [])
  useLayoutEffect(() => {
    const p = geo.attributes.position as THREE.BufferAttribute, n = Math.min(MAXN, pts.length)
    let cx = 0, cy = 0; for (let i = 0; i < n; i++) { cx += pts[i][0]; cy += pts[i][1] }
    p.setXYZ(0, n ? cx / n : 0, n ? cy / n : 0, z)
    for (let i = 0; i < n; i++) p.setXYZ(i + 1, pts[i][0], pts[i][1], z)
    p.needsUpdate = true; geo.setDrawRange(0, Math.max(0, n - 1) * 3); geo.computeBoundingSphere()
  })
  return <mesh geometry={geo} renderOrder={5} frustumCulled={false}><meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} depthWrite={false} depthTest={!front} side={THREE.DoubleSide} /></mesh>
}

/** 一个点：实心圆加一圈白边 */
export function Dot({ at, color = COL.curve, r = 0.07, z = 0.03, opacity = 1 }: { at: P2; color?: string; r?: number; z?: number; opacity?: number }) {
  const front = useContext(FrontCtx)
  return (
    <group position={[at[0], at[1], z]}>
      <mesh renderOrder={7}><circleGeometry args={[r * 1.38, 32]} /><meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={opacity} depthWrite={false} depthTest={!front} side={THREE.DoubleSide} /></mesh>
      <mesh position-z={0.004} renderOrder={8}><circleGeometry args={[r, 32]} /><meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} depthWrite={false} depthTest={!front} side={THREE.DoubleSide} /></mesh>
    </group>
  )
}

/** 一条线段，从 a 到 b；dash 大于 0 时画成虚线（每段多长，m） */
export function Seg({ a, b, color = COL.ink, width = 0.035, z = 0.022, dash = 0, opacity = 1 }: { a: P2; b: P2; color?: string; width?: number; z?: number; dash?: number; opacity?: number }) {
  const front = useContext(FrontCtx)
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1e-3) return null
  const rot = Math.atan2(b[1] - a[1], b[0] - a[0])
  const mat = <meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} depthWrite={false} depthTest={!front} side={THREE.DoubleSide} />
  if (!dash) return <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z]} rotation-z={rot} renderOrder={6}><planeGeometry args={[l, width]} />{mat}</mesh>
  const n = Math.max(1, Math.round(l / dash)), out: ReactNode[] = []
  for (let i = 0; i < n; i++) { const u = (i + 0.3) / n; out.push(<mesh key={i} position={[a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, z]} rotation-z={rot} renderOrder={6}><planeGeometry args={[l / n * 0.58, width]} />{mat}</mesh>) }
  return <group>{out}</group>
}

/** 箭头尖：在 at 处，朝 dir 方向 */
export function Tip({ at, dir, color = COL.ray, size = 0.16, z = 0.026, opacity = 1 }: { at: P2; dir: P2; color?: string; size?: number; z?: number; opacity?: number }) {
  const front = useContext(FrontCtx)
  const geo = useMemo(() => { const s = new THREE.Shape(); s.moveTo(0.6, 0); s.lineTo(-0.4, 0.42); s.lineTo(-0.4, -0.42); s.closePath(); return new THREE.ShapeGeometry(s) }, [])
  return <mesh geometry={geo} position={[at[0], at[1], z]} rotation-z={Math.atan2(dir[1], dir[0])} scale={size} renderOrder={7}><meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} depthWrite={false} depthTest={!front} side={THREE.DoubleSide} /></mesh>
}

/** 一条折线从头走了 len 这么长时的样子：返回走过的那一段、走到的位置和方向（光线、电波一点点飞过去用） */
export function upto(pts: P2[], len: number): { pts: P2[]; head: P2; dir: P2 } {
  const out: P2[] = [pts[0]]; let left = Math.max(0, len), dir: P2 = [0, 1]
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1e-9) continue
    dir = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]
    if (left >= l) { out.push(b); left -= l } else { out.push([a[0] + dir[0] * left, a[1] + dir[1] * left]); left = 0; break }
  }
  return { pts: out, head: out[out.length - 1], dir }
}
export const pathLen = (pts: P2[]) => pts.slice(1).reduce((s, b, i) => s + Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1]), 0)
