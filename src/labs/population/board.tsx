// 野外监测屏和屏上的图。屏是立在草地上的户外电子屏：深色屏体、铝边框、两根镀锌立柱、混凝土墩、顶上一小块太阳能板、背后一只设备箱。
// 屏架（BoardFrame）一直立在岛上；屏面（BoardFace）由各课自己画：坐标系、逐点描出的曲线、柱形图都画进一张画布贴图。
import { useEffect, useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'

export const FONT = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif'
export const NUM = 'Geist, "Helvetica Neue", Arial, sans-serif'
/** 屏上统一的线色：兔琥珀色、狐珊瑚红、增长速率天蓝、参考线浅黄、草绿 */
export const C = { rabbit: '#ffc94a', fox: '#ff7358', rate: '#5cc4ff', guide: '#ffe9a8', grass: '#8fd16a', ink: '#eef4f6', dim: 'rgba(170,210,232,0.3)', heat: '#ff9a52', soil: '#b08a5a', idle: '#8d99a3' }
/** 每米多少像素 */
const PPM = 108

export interface Size { w: number; h: number; lift: number }
/** 屏架：原点在屏下方的地面上，屏面朝 +z */
export function BoardFrame({ w, h, lift }: Size) {
  const d = 0.2, postH = lift + h + 0.25
  const cell = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128
    const g = c.getContext('2d')!; g.fillStyle = '#16233c'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#8fa3c0'; g.lineWidth = 3; g.strokeRect(1, 1, 126, 126); g.strokeStyle = 'rgba(160,180,210,0.35)'; g.lineWidth = 1
    for (let i = 16; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke() }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t
  }, [])
  return (
    <group>
      <group position={[0, lift + h / 2, 0]}>
        <RoundedBox args={[w + 0.2, h + 0.2, d]} radius={0.04} position={[0, 0, -d / 2 - 0.012]} castShadow receiveShadow><meshStandardMaterial color="#1a1e22" roughness={0.45} metalness={0.6} /></RoundedBox>
        {/* 铝边框：四条压边 */}
        {[[0, h / 2 + 0.05, w + 0.2, 0.035], [0, -h / 2 - 0.05, w + 0.2, 0.035], [-w / 2 - 0.05, 0, 0.035, h + 0.2], [w / 2 + 0.05, 0, 0.035, h + 0.2]].map(([x, y, a, b], i) => <mesh key={i} position={[x, y, 0.004]}><boxGeometry args={[a, b, 0.03]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
        <mesh position={[0, 0, -0.008]}><planeGeometry args={[w, h]} /><meshStandardMaterial color="#16232f" roughness={0.25} /></mesh>
        {/* 遮雨檐 */}
        <mesh position={[0, h / 2 + 0.14, 0.14]} rotation-x={0.2} castShadow><boxGeometry args={[w + 0.44, 0.035, 0.55]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        {/* 背后的横梁和设备箱 */}
        {[-h * 0.28, h * 0.28].map(y => <mesh key={y} position={[0, y, -d - 0.09]} castShadow><boxGeometry args={[w * 0.9, 0.12, 0.12]} /><Metal kind="steel" grain="brushed" rough={0.5} /></mesh>)}
        <RoundedBox args={[0.7, 0.9, 0.32]} radius={0.03} position={[w * 0.28, -h * 0.05, -d - 0.3]} castShadow><meshStandardMaterial color="#c9ccc8" roughness={0.55} metalness={0.3} /></RoundedBox>
      </group>
      {[-w * 0.3, w * 0.3].map(x => <group key={x} position={[x, 0, -d - 0.2]}>
        <mesh position={[0, postH / 2 - 0.2, 0]} castShadow><cylinderGeometry args={[0.075, 0.075, postH + 0.4, 20]} /><Metal kind="zinc" grain="brushed" rough={0.55} /></mesh>
        <mesh position={[0, 0.04, 0]} castShadow receiveShadow><cylinderGeometry args={[0.3, 0.34, 0.3, 20]} /><meshStandardMaterial color="#a5a39b" roughness={0.95} /></mesh>
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.16, 0.16, 0.025, 20]} /><Metal kind="steel" grain="cast" /></mesh>
      </group>)}
      {/* 顶上的太阳能板 */}
      <group position={[-w * 0.3, lift + h + 0.42, -d - 0.2]} rotation={[-0.6, 0.2, 0]}>
        <mesh castShadow><boxGeometry args={[1.25, 0.04, 0.8]} /><meshStandardMaterial color="#d7dadb" metalness={0.7} roughness={0.4} /></mesh>
        <mesh position={[0, 0.022, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[1.19, 0.74]} /><meshPhysicalMaterial map={cell} roughness={0.15} clearcoat={1} envMapIntensity={1.4} /></mesh>
      </group>
    </group>
  )
}

export type Draw = (g: CanvasRenderingContext2D, W: number, H: number) => void
/** 屏面：dep 变了就重画一次。放在和屏架同一个位置上 */
export function BoardFace({ w, h, lift, draw, dep }: Size & { draw: Draw; dep: unknown }) {
  const { tex, g, W, H } = useMemo(() => {
    const c = document.createElement('canvas'); c.width = Math.round(w * PPM); c.height = Math.round(h * PPM)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return { tex: t, g: c.getContext('2d')!, W: c.width, H: c.height }
  }, [w, h])
  useEffect(() => {
    g.fillStyle = '#16232f'; g.fillRect(0, 0, W, H)
    g.strokeStyle = 'rgba(150,185,205,0.5)'; g.lineWidth = 2; g.strokeRect(5, 5, W - 10, H - 10)
    g.fillStyle = 'rgba(150,180,200,0.045)'; for (let y = 8; y < H - 8; y += 7) for (let x = 8; x < W - 8; x += 7) g.fillRect(x, y, 4, 4)   // 屏的像素点：很淡的一层小方格
    draw(g, W, H); tex.needsUpdate = true
  }, [dep, draw, g, W, H, tex])
  useEffect(() => () => tex.dispose(), [tex])
  return <mesh position={[0, lift + h / 2, 0.002]}><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} toneMapped={false} color="#e6eaec" /></mesh>
}

// ---------- 画图 ----------
/** 一格坐标系：左上角 (x, y)、宽高（像素）、数据范围、刻度间隔、轴的名字 */
export interface Plot { x: number; y: number; w: number; h: number; xr: [number, number]; yr: [number, number]; xStep: number; yStep: number; xName: string; yName: string; title?: string; fs?: number }
export interface Map2 { X: (v: number) => number; Y: (v: number) => number }
const each = (a: number, b: number, s: number, f: (v: number) => void) => { for (let v = Math.ceil(a / s - 1e-9) * s; v <= b + 1e-9; v += s) f(Math.round(v * 1e6) / 1e6) }
/** 画网格、坐标轴、刻度和数字；返回数据到像素的换算 */
export function axes(g: CanvasRenderingContext2D, P: Plot): Map2 {
  const fs = (P.fs ?? 26) * 1.16, L = P.x + fs * 3.3, R = P.x + P.w - fs * 2.1, T = P.y + fs * 2.2, B = P.y + P.h - fs * 1.7
  const X = (v: number) => L + ((v - P.xr[0]) / (P.xr[1] - P.xr[0])) * (R - L), Y = (v: number) => B - ((v - P.yr[0]) / (P.yr[1] - P.yr[0])) * (B - T)
  g.strokeStyle = C.dim; g.lineWidth = 1.5
  each(P.xr[0], P.xr[1], P.xStep, v => { g.beginPath(); g.moveTo(X(v), B); g.lineTo(X(v), T); g.stroke() })
  each(P.yr[0], P.yr[1], P.yStep, v => { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(R, Y(v)); g.stroke() })
  g.strokeStyle = g.fillStyle = C.ink; g.lineWidth = 4.5; g.lineCap = 'round'
  g.beginPath(); g.moveTo(L, T - fs * 0.9); g.lineTo(L, B); g.lineTo(R + fs * 0.9, B); g.stroke()
  const ah = fs * 0.5
  g.beginPath(); g.moveTo(R + fs * 0.9 + ah, B); g.lineTo(R + fs * 0.9 - ah * 0.3, B - ah * 0.55); g.lineTo(R + fs * 0.9 - ah * 0.3, B + ah * 0.55); g.closePath(); g.fill()
  g.beginPath(); g.moveTo(L, T - fs * 0.9 - ah); g.lineTo(L - ah * 0.55, T - fs * 0.9 + ah * 0.3); g.lineTo(L + ah * 0.55, T - fs * 0.9 + ah * 0.3); g.closePath(); g.fill()
  g.font = `700 ${fs}px ${NUM}`; g.fillStyle = '#f2f7f9'
  g.textAlign = 'center'; g.textBaseline = 'top'; each(P.xr[0], P.xr[1], P.xStep, v => g.fillText(String(v), X(v), B + fs * 0.35))
  g.textAlign = 'right'; g.textBaseline = 'middle'; each(P.yr[0], P.yr[1], P.yStep, v => { if (v !== P.yr[0] || v !== 0) g.fillText(String(v), L - fs * 0.4, Y(v)) })
  g.font = `700 ${fs}px ${FONT}`; g.fillStyle = C.ink
  g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(P.xName, R + fs * 1.5, B - fs * 0.45)
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(P.yName, L + fs * 0.7, T - fs * 0.9)
  if (P.title) { g.textAlign = 'right'; g.textBaseline = 'middle'; g.font = `700 ${fs * 1.1}px ${FONT}`; g.fillText(P.title, R, T - fs * 0.9) }
  return { X, Y }
}
/** 一条折线；dots 为 true 时每个点画一个圆点 */
export function line(g: CanvasRenderingContext2D, M: Map2, pts: [number, number][], color: string, { dots = false, width = 7.5, alpha = 1 }: { dots?: boolean; width?: number; alpha?: number } = {}) {
  if (!pts.length) return
  g.save(); g.globalAlpha = alpha; g.strokeStyle = g.fillStyle = color; g.lineWidth = width; g.lineJoin = g.lineCap = 'round'
  g.shadowColor = color; g.shadowBlur = 10
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(M.X(x), M.Y(y)) : g.moveTo(M.X(x), M.Y(y)))); g.stroke()
  g.shadowBlur = 0
  if (dots) for (const [x, y] of pts) { g.beginPath(); g.arc(M.X(x), M.Y(y), Math.max(8, width * 1.35), 0, 6.3); g.fill() }
  g.restore()
}
/** 最新的那个点：大一圈，带白芯 */
export function head(g: CanvasRenderingContext2D, M: Map2, x: number, y: number, color: string, r = 11) {
  g.save(); g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 16; g.beginPath(); g.arc(M.X(x), M.Y(y), r, 0, 6.3); g.fill(); g.shadowBlur = 0
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(M.X(x), M.Y(y), r * 0.45, 0, 6.3); g.fill(); g.restore()
}
/** 虚线（两端都是数据坐标） */
export function dash(g: CanvasRenderingContext2D, M: Map2, a: [number, number], b: [number, number], color = C.guide, width = 3) {
  g.save(); g.strokeStyle = color; g.lineWidth = width; g.setLineDash([14, 10]); g.beginPath(); g.moveTo(M.X(a[0]), M.Y(a[1])); g.lineTo(M.X(b[0]), M.Y(b[1])); g.stroke(); g.restore()
}
/** 图上的一句话；at 是数据坐标 */
export function note(g: CanvasRenderingContext2D, M: Map2, at: [number, number], text: string, { color = C.guide, align = 'left' as CanvasTextAlign, dy = -14, fs = 27 } = {}) {
  g.save(); g.font = `700 ${fs}px ${FONT}`; g.textAlign = align; g.textBaseline = 'bottom'
  const x = M.X(at[0]) + (align === 'left' ? 12 : align === 'right' ? -12 : 0), y = M.Y(at[1]) + dy, w = g.measureText(text).width
  g.fillStyle = 'rgba(16,26,36,0.86)'; g.fillRect(align === 'left' ? x - 6 : align === 'right' ? x - w - 6 : x - w / 2 - 6, y - fs - 4, w + 12, fs + 8)
  g.fillStyle = color; g.fillText(text, x, y); g.restore()
}
/** 一行字（像素坐标） */
export function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, { fs = 28, color = C.ink, align = 'left' as CanvasTextAlign, weight = 600, num = false } = {}) {
  g.save(); g.font = `${weight} ${fs}px ${num ? NUM : FONT}`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); g.restore()
}
/** 一个圆角矩形条 */
export function bar(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, alpha = 1) {
  if (w <= 0 || h <= 0) return
  g.save(); g.globalAlpha = alpha; g.fillStyle = color; g.beginPath(); g.roundRect(x, y, w, h, Math.min(6, w / 2, h / 2)); g.fill(); g.restore()
}
