// 曲线：场景里的屏幕（画在画布贴图上）和面板里的小图（SVG）用同一份描述。数据都由各课从计算核心取来，这里只管画。
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { FONT } from './mats'

export interface Line { color: string; xs: number[]; ys: number[]; label?: string; dash?: boolean; width?: number }
export interface ChartSpec {
  title?: string
  x: { max: number; min?: number; label: string; ticks: number[]; fmt?: (v: number) => string }
  y: { max: number; min?: number; label: string; ticks: number[]; fmt?: (v: number) => string }
  lines: Line[]
  /** 竖着的一条虚线（例如“现在”） */
  vline?: number
  /** 点：x、y、颜色 */
  dots?: { x: number; y: number; color: string }[]
  /** 右上角的图例 */
  legend?: boolean
}

/** 把一张图画到画布上：深色屏幕底、浅色网格、亮色曲线 */
export function drawChart(g: CanvasRenderingContext2D, W: number, H: number, s: ChartSpec, theme: 'screen' | 'panel' = 'screen') {
  const k = W / 1024
  const bg = theme === 'screen' ? '#0b1620' : 'rgba(0,0,0,0)'
  g.clearRect(0, 0, W, H); g.fillStyle = bg; g.fillRect(0, 0, W, H)
  const L = 118 * k, Rr = 40 * k, T = (s.title ? 92 : 40) * k, B = 96 * k
  const x0 = s.x.min ?? 0, y0 = s.y.min ?? 0
  const px = (x: number) => L + (x - x0) / (s.x.max - x0) * (W - L - Rr), py = (y: number) => H - B - (y - y0) / (s.y.max - y0) * (H - T - B)
  g.font = `600 ${40 * k}px ${FONT}`; g.fillStyle = '#e8f1f6'; g.textBaseline = 'middle'; g.textAlign = 'left'
  if (s.title) g.fillText(s.title, L, 46 * k)
  // 网格和刻度
  g.lineWidth = 2 * k; g.font = `500 ${30 * k}px ${FONT}`
  for (const v of s.y.ticks) { g.strokeStyle = 'rgba(160,190,210,0.18)'; g.beginPath(); g.moveTo(L, py(v)); g.lineTo(W - Rr, py(v)); g.stroke(); g.fillStyle = 'rgba(220,235,245,0.75)'; g.textAlign = 'right'; g.fillText((s.y.fmt ?? String)(v), L - 14 * k, py(v)) }
  for (const v of s.x.ticks) { g.strokeStyle = 'rgba(160,190,210,0.12)'; g.beginPath(); g.moveTo(px(v), T); g.lineTo(px(v), H - B); g.stroke(); g.fillStyle = 'rgba(220,235,245,0.75)'; g.textAlign = 'center'; g.fillText((s.x.fmt ?? String)(v), px(v), H - B + 34 * k) }
  g.strokeStyle = 'rgba(220,235,245,0.6)'; g.lineWidth = 3 * k; g.beginPath(); g.moveTo(L, T - 10 * k); g.lineTo(L, H - B); g.lineTo(W - Rr, H - B); g.stroke()
  g.fillStyle = 'rgba(220,235,245,0.8)'; g.textAlign = 'right'; g.fillText(s.x.label, W - Rr, H - 22 * k)
  g.textAlign = 'left'; g.fillText(s.y.label, L + 12 * k, T - 4 * k)
  if (s.vline !== undefined) { g.setLineDash([12 * k, 10 * k]); g.strokeStyle = 'rgba(255,233,168,0.8)'; g.lineWidth = 3 * k; g.beginPath(); g.moveTo(px(s.vline), T); g.lineTo(px(s.vline), H - B); g.stroke(); g.setLineDash([]) }
  // 曲线
  for (const l of s.lines) {
    if (l.xs.length < 2) continue
    g.strokeStyle = l.color; g.lineWidth = (l.width ?? 6) * k; g.lineJoin = 'round'; g.lineCap = 'round'; if (l.dash) g.setLineDash([14 * k, 12 * k])
    g.beginPath(); l.xs.forEach((x, i) => (i ? g.lineTo(px(x), py(l.ys[i])) : g.moveTo(px(x), py(l.ys[i])))); g.stroke(); g.setLineDash([])
  }
  for (const d of s.dots ?? []) { g.fillStyle = d.color; g.beginPath(); g.arc(px(d.x), py(d.y), 11 * k, 0, 7); g.fill(); g.strokeStyle = '#0b1620'; g.lineWidth = 3 * k; g.stroke() }
  // 图例：画在曲线末端旁边
  if (s.legend) {
    g.font = `700 ${34 * k}px ${FONT}`; g.textAlign = 'left'
    const used: number[] = []
    for (const l of s.lines) {
      if (!l.label || !l.xs.length) continue
      let y = py(l.ys[l.ys.length - 1]); for (const u of used) if (Math.abs(u - y) < 40 * k) y = u + (y >= u ? 40 : -40) * k
      used.push(y)
      const x = Math.min(px(l.xs[l.xs.length - 1]) + 16 * k, W - Rr - 150 * k)
      g.fillStyle = l.color; g.fillText(l.label, x, y)
    }
  }
}

/** 场景里的一块显示屏：w × h（m），画上一张图。屏幕自己发光，不受场景灯光影响 */
export function Screen({ w, h, spec, res = 1024, ...rest }: { w: number; h: number; spec: ChartSpec; res?: number } & Record<string, unknown>) {
  const { tex, ctx, W, H } = useMemo(() => {
    const W = res, H = Math.round(res * h / w), c = document.createElement('canvas'); c.width = W; c.height = H
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return { tex: t, ctx: c.getContext('2d')!, W, H }
  }, [w, h, res])
  useEffect(() => { drawChart(ctx, W, H, spec); tex.needsUpdate = true })
  return <mesh {...rest}><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} toneMapped={false} color="#d8e2ea" /></mesh>
}

/** 面板里的小图：同一份描述画成 SVG */
export function MiniChart({ spec, height = 150 }: { spec: ChartSpec; height?: number }) {
  const W = 290, H = height, L = 34, Rr = 10, T = 16, B = 28
  const x0 = spec.x.min ?? 0, y0 = spec.y.min ?? 0
  const px = (x: number) => L + (x - x0) / (spec.x.max - x0) * (W - L - Rr), py = (y: number) => H - B - (y - y0) / (spec.y.max - y0) * (H - T - B)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={spec.title ?? spec.y.label}>
      {spec.y.ticks.map(v => <g key={`y${v}`}><line x1={L} x2={W - Rr} y1={py(v)} y2={py(v)} stroke="rgb(255 255 255 / 0.1)" /><text x={L - 5} y={py(v) + 4} textAnchor="end" fontSize="10.5" fill="rgb(255 255 255 / 0.55)">{(spec.y.fmt ?? String)(v)}</text></g>)}
      {spec.x.ticks.map(v => <text key={`x${v}`} x={px(v)} y={H - B + 14} textAnchor="middle" fontSize="10.5" fill="rgb(255 255 255 / 0.55)">{(spec.x.fmt ?? String)(v)}</text>)}
      <path d={`M${L},${T - 4}V${H - B}H${W - Rr}`} fill="none" stroke="rgb(255 255 255 / 0.35)" />
      <text x={W - Rr} y={H - 3} textAnchor="end" fontSize="10.5" fill="rgb(255 255 255 / 0.6)">{spec.x.label}</text>
      <text x={L + 4} y={T - 6} fontSize="10.5" fill="rgb(255 255 255 / 0.6)">{spec.y.label}</text>
      {spec.vline !== undefined && <line x1={px(spec.vline)} x2={px(spec.vline)} y1={T} y2={H - B} stroke="#ffe9a8" strokeDasharray="4 3" opacity={0.8} />}
      {spec.lines.map((l, i) => l.xs.length > 1 && <polyline key={i} fill="none" stroke={l.color} strokeWidth={l.width ? l.width / 2.4 : 2.4} strokeDasharray={l.dash ? '5 4' : undefined} strokeLinejoin="round" points={l.xs.map((x, j) => `${px(x).toFixed(1)},${py(l.ys[j]).toFixed(1)}`).join(' ')} />)}
      {(spec.dots ?? []).map((d, i) => <circle key={i} cx={px(d.x)} cy={py(d.y)} r={4} fill={d.color} stroke="#10151a" strokeWidth={1.5} />)}
    </svg>
  )
}

/** 全实验室统一的曲线颜色：N₂ 蓝、H₂ 浅灰、NH₃ 青绿；正反应橙、逆反应紫 */
export const COL = { n2: '#5b8cff', h2: '#d9dde2', nh3: '#35c7b3', fwd: '#ff9b4a', rev: '#b48cff', eq: '#ffe9a8', out: '#ff9b4a' }

/** 场景里的一块屏：自己画（表格、流程图）。draw 每次渲染重画一遍 */
export function Board({ w, h, draw, res = 1024, ...rest }: { w: number; h: number; draw: (g: CanvasRenderingContext2D, W: number, H: number) => void; res?: number } & Record<string, unknown>) {
  const { tex, ctx, W, H } = useMemo(() => {
    const W = res, H = Math.round(res * h / w), c = document.createElement('canvas'); c.width = W; c.height = H
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return { tex: t, ctx: c.getContext('2d')!, W, H }
  }, [w, h, res])
  useEffect(() => { draw(ctx, W, H); tex.needsUpdate = true })
  return <mesh {...rest}><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} toneMapped={false} color="#d8e2ea" /></mesh>
}
/** 在屏上画一张表：表头一行，下面几行；cols 是每列的相对宽度 */
export function drawTable(g: CanvasRenderingContext2D, W: number, H: number, title: string, head: string[], rows: string[][], cols: number[], hi = -1) {
  g.fillStyle = '#0b1620'; g.fillRect(0, 0, W, H)
  const k = W / 1024, x0 = 40 * k, sum = cols.reduce((a, b) => a + b, 0), cw = cols.map(c => c / sum * (W - 2 * x0))
  g.fillStyle = '#e8f1f6'; g.font = `600 ${44 * k}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(title, x0, 56 * k)
  const rh = Math.min(140 * k, (H - 120 * k) / (rows.length + 1))
  const line = (cells: string[], y: number, head: boolean, on: boolean) => {
    if (on) { g.fillStyle = 'rgba(53,199,179,0.22)'; g.fillRect(x0 - 10 * k, y - rh / 2, W - 2 * x0 + 20 * k, rh) }
    let x = x0
    cells.forEach((s, i) => { g.fillStyle = head ? 'rgba(220,235,245,0.6)' : '#f2f7fa'; g.font = `${head ? 500 : 600} ${(head ? 40 : 50) * k}px ${FONT}`; g.textAlign = i ? 'right' : 'left'; g.fillText(s, i ? x + cw[i] - 10 * k : x, y); x += cw[i] })
  }
  line(head, 120 * k + rh / 2, true, false)
  g.strokeStyle = 'rgba(220,235,245,0.3)'; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(x0, 120 * k + rh); g.lineTo(W - x0, 120 * k + rh); g.stroke()
  rows.forEach((r, i) => line(r, 120 * k + rh * (i + 1.5), false, i === hi))
}
