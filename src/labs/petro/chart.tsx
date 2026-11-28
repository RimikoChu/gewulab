// 面板里的小图：折线、散点、横向的色带。只负责画，数从计算核心来。
import type { ReactNode } from 'react'

interface Axis { min: number; max: number; ticks: number[]; label: string }
export interface ChartSpec {
  x: Axis; y: Axis
  lines?: { pts: [number, number][]; color: string }[]
  dots?: { x: number; y: number; color: string; r?: number; ring?: boolean }[]
  /** 横向的色带：y 从 lo 到 hi */
  bands?: { lo: number; hi: number; color: string; label?: string }[]
}
export function MiniChart({ spec, height = 150 }: { spec: ChartSpec; height?: number }) {
  const W = 290, H = height, L = 38, R = 8, T = 8, B = 26
  const sx = (v: number) => L + (v - spec.x.min) / (spec.x.max - spec.x.min) * (W - L - R), sy = (v: number) => H - B - (Math.max(spec.y.min, Math.min(spec.y.max, v)) - spec.y.min) / (spec.y.max - spec.y.min) * (H - T - B)
  const items: ReactNode[] = []
  spec.bands?.forEach((b, i) => { items.push(<rect key={'b' + i} x={L} y={sy(b.hi)} width={W - L - R} height={Math.max(0, sy(b.lo) - sy(b.hi))} fill={b.color} opacity={0.22} />); if (b.label) items.push(<text key={'bl' + i} x={W - R - 3} y={(sy(b.lo) + sy(b.hi)) / 2 + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.7)">{b.label}</text>) })
  return <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full">
    {items}
    {spec.y.ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} stroke="rgba(255,255,255,0.1)" /><text x={L - 5} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.55)">{t}</text></g>)}
    {spec.x.ticks.map(t => <text key={t} x={sx(t)} y={H - B + 13} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.55)">{t}</text>)}
    <line x1={L} x2={L} y1={T} y2={H - B} stroke="rgba(255,255,255,0.3)" /><line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="rgba(255,255,255,0.3)" />
    <text x={W - R} y={H - 2} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.55)">{spec.x.label}</text>
    <text x={L + 4} y={T + 9} fontSize="11" fill="rgba(255,255,255,0.55)">{spec.y.label}</text>
    {spec.lines?.map((l, i) => <polyline key={i} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" points={l.pts.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ')} />)}
    {spec.dots?.map((d, i) => <circle key={i} cx={sx(d.x)} cy={sy(d.y)} r={d.r ?? 3} fill={d.ring ? 'none' : d.color} stroke={d.color} strokeWidth={d.ring ? 2 : 0} />)}
  </svg>
}
