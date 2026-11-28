// 兴奋的传导和传递 · 各课面板里共用的小块：结论条里的内容、小标题、一行一项、大读数、曲线图、离子图例。
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { COLOR } from './world'

/** 结论条里的内容：一行小字、一句结论、一段说明；notes 是这一课的画面做了哪些简化 */
export function Finale({ kicker, title, text, notes }: { kicker: string; title: string; text: string; notes?: string }) {
  return <div>
    <p className="text-[12.5px] tracking-[0.12em] text-[#7fe3d4]">{kicker}</p>
    <p className="mt-0.5 text-[18px] leading-snug font-bold">{title}</p>
    <p className="mt-1 text-[13.5px] leading-relaxed text-white/75">{text}</p>
    {notes && <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">{notes}</p>}
  </div>
}
export const H = ({ children }: { children: ReactNode }) => <h2 className="mt-4 mb-2 text-[12.5px] text-white/55">{children}</h2>
/** 一行：左边名字，右边说明；on 是正在看的；seen 还没做到的变淡 */
export function Row({ name, text, on, seen = true, wide }: { name: ReactNode; text: ReactNode; on?: boolean; seen?: boolean; wide?: boolean }) {
  return <div className={cn('flex items-baseline gap-2.5 rounded-xl px-3 py-2 text-[13.5px] leading-snug transition-colors', on ? 'bg-[#35c7b3]/20' : 'bg-white/6')}>
    <span className={cn('flex-none font-semibold', wide ? 'w-[6.6em]' : 'w-[4.6em]', on ? 'text-[#7fe3d4]' : seen ? 'text-white' : 'text-white/45')}>{name}</span>
    <span className={cn('min-w-0 flex-1 tabular-nums', seen ? 'text-white/85' : 'text-white/35')}>{text}</span>
  </div>
}
/** 大读数 */
export function Big({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return <div className="text-center">
    <div className="text-[13px] text-white/60">{label}</div>
    <div className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">{value}{unit && <span className="ml-1 text-[15px] font-medium text-white/55">{unit}</span>}</div>
  </div>
}
/** 带正负号的毫伏数 */
export const mv = (v: number) => { const r = Math.round(v); return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : '0' }
/** 离子图例 */
export function Legend({ items }: { items: ('na' | 'k' | 'cl' | 'nt' | 'nti')[] }) {
  const NAME = { na: 'Na⁺', k: 'K⁺', cl: 'Cl⁻', nt: '兴奋性递质', nti: '抑制性递质' }
  return <div className="mt-3 flex flex-wrap justify-center gap-x-3.5 gap-y-1 text-[12.5px] text-white/70">{items.map(k => <span key={k} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: COLOR[k] }} />{NAME[k]}</span>)}</div>
}

export interface Series { pts: [number, number][]; color: string; faint?: boolean }
/**
 * 曲线图：横轴时间，纵轴电位。x、y 是坐标范围；yTicks 纵轴刻度；lines 是要画出来的水平参考线；dot 是曲线上现在走到的点
 */
export function Chart({ x, y, yTicks, xTicks, series, lines = [], dot, xLabel = '时间 / ms', yLabel = '膜电位 / mV', h = 150 }: {
  x: [number, number]; y: [number, number]; yTicks: number[]; xTicks: number[]; series: Series[]; lines?: { v: number; label: string }[]; dot?: [number, number] | null; xLabel?: string; yLabel?: string; h?: number
}) {
  const W = 290, L = 36, Rr = 8, T = 16, B = 30
  const px = (t: number) => L + (t - x[0]) / (x[1] - x[0]) * (W - L - Rr), py = (v: number) => T + (y[1] - v) / (y[1] - y[0]) * (h - T - B)
  return <svg viewBox={`0 0 ${W} ${h}`} className="w-full" role="img" aria-label={yLabel}>
    <text x={2} y={10} fontSize="10.5" fill="rgba(255,255,255,0.5)">{yLabel}</text>
    {yTicks.map(v => <g key={v}><line x1={L} x2={W - Rr} y1={py(v)} y2={py(v)} stroke={v === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.09)'} /><text x={L - 5} y={py(v) + 3.5} fontSize="10.5" textAnchor="end" fill="rgba(255,255,255,0.6)">{mv(v)}</text></g>)}
    {xTicks.map(t => <text key={t} x={px(t)} y={h - 16} fontSize="10.5" textAnchor="middle" fill="rgba(255,255,255,0.6)">{t}</text>)}
    <text x={L} y={h - 0.5} fontSize="10.5" fill="rgba(255,255,255,0.5)">{xLabel}</text>
    {lines.map(l => <g key={l.label}><line x1={L} x2={W - Rr} y1={py(l.v)} y2={py(l.v)} stroke="#ffe9a8" strokeDasharray="4 4" strokeOpacity={0.7} /><text x={W - Rr - 2} y={py(l.v) - 4} fontSize="10.5" textAnchor="end" fill="#ffe9a8">{l.label}</text></g>)}
    {series.map((s, i) => s.pts.length > 1 && <polyline key={i} fill="none" stroke={s.color} strokeOpacity={s.faint ? 0.45 : 1} strokeWidth={s.faint ? 1.6 : 2.4} strokeLinejoin="round" strokeLinecap="round" points={s.pts.map(p => `${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ')} />)}
    {dot && <circle cx={px(dot[0])} cy={py(dot[1])} r={4} fill="#fff" />}
  </svg>
}
