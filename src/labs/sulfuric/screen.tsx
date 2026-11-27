// 面板里的小图（SVG）。数据都由各课从计算核心取来，这里只管画。
export interface Line { color: string; xs: number[]; ys: number[]; dash?: boolean; width?: number }
export interface ChartSpec {
  title?: string
  x: { max: number; min?: number; label: string; ticks: number[]; fmt?: (v: number) => string }
  y: { max: number; min?: number; label: string; ticks: number[]; fmt?: (v: number) => string }
  lines: Line[]
  /** 竖着的一条虚线（例如“现在”） */
  vline?: number
  /** 横着的一条虚线（例如平衡转化率） */
  hline?: number
  dots?: { x: number; y: number; color: string }[]
}
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
      {spec.hline !== undefined && <line x1={L} x2={W - Rr} y1={py(spec.hline)} y2={py(spec.hline)} stroke="#ffe9a8" strokeDasharray="4 3" opacity={0.8} />}
      {spec.lines.map((l, i) => l.xs.length > 1 && <polyline key={i} fill="none" stroke={l.color} strokeWidth={l.width ?? 2.4} strokeDasharray={l.dash ? '5 4' : undefined} strokeLinejoin="round" points={l.xs.map((x, j) => `${px(x).toFixed(1)},${py(l.ys[j]).toFixed(1)}`).join(' ')} />)}
      {(spec.dots ?? []).map((d, i) => <circle key={i} cx={px(d.x)} cy={py(d.y)} r={4} fill={d.color} stroke="#10151a" strokeWidth={1.5} />)}
    </svg>
  )
}
/** 全实验室统一的曲线颜色：平衡黄、实际橙、正反应橙、逆反应紫、不装催化剂灰 */
export const COL = { eq: '#ffe9a8', out: '#ff9b4a', fwd: '#ff9b4a', rev: '#b48cff', none: '#aab4bd', cat: '#4fe0c8' }
