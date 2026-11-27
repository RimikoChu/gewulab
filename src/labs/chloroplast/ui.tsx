// 光反应和暗反应 · 各课面板里共用的小块：结论条里的内容、小标题、一行一项、大读数、分子图例、横条、曲线图。
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { MOL_COLOR, MOL_NAME, type MolKind } from './mol'

/** 结论条里的内容：一行小字、一句结论、一段说明；notes 是这一课的画面做了哪些简化 */
export function Finale({ kicker, title, text, notes }: { kicker: string; title: string; text: string; notes?: string }) {
  return <div>
    <p className="text-[12.5px] tracking-[0.12em] text-[#7fe3d4]">{kicker}</p>
    <p className="mt-0.5 text-[18px] leading-snug font-bold">{title}</p>
    <p className="mt-1 text-[13.5px] leading-relaxed text-white/75">{text}</p>
    {notes && <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">{notes}</p>}
  </div>
}
export const H = ({ children }: { children: ReactNode }) => <h2 className="mt-4 mb-2 text-[12.5px] text-white/55 first:mt-0">{children}</h2>
/** 一行：左边名字，右边说明；on 是正在看的；seen 还没出现的发灰 */
export function Row({ name, text, on, seen = true, dot, wide }: { name: ReactNode; text: ReactNode; on?: boolean; seen?: boolean; dot?: string; wide?: boolean }) {
  return <div className={cn('flex items-baseline gap-2.5 rounded-xl px-3 py-2 text-[13.5px] leading-snug transition-colors', on ? 'bg-[#35c7b3]/20' : 'bg-white/6')}>
    {dot && <span className="size-2.5 flex-none translate-y-[1px] rounded-full" style={{ background: dot, opacity: seen ? 1 : 0.3 }} />}
    <span className={cn('flex-none font-semibold', wide ? 'w-[6.4em]' : 'w-[4.8em]', on ? 'text-[#7fe3d4]' : seen ? 'text-white' : 'text-white/45')}>{name}</span>
    <span className={cn('min-w-0 flex-1 tabular-nums', seen ? 'text-white/85' : 'text-white/35')}>{text}</span>
  </div>
}
/** 大读数 */
export function Big({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return <div className="text-center">
    <div className="text-[13px] text-white/60">{label}</div>
    <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{value}{unit && <span className="ml-1 text-[15px] font-medium text-white/55">{unit}</span>}</div>
  </div>
}
/** 分子颜色图例 */
export function Legend({ kinds }: { kinds: MolKind[] }) {
  return <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[12.5px] text-white/65">{kinds.map(k => <span key={k} className="flex items-center gap-1"><span className="size-2.5 rounded-full" style={{ background: MOL_COLOR[k] }} />{MOL_NAME[k]}</span>)}</div>
}
/** 一根横条：名字、现在的量、和原来比是多了还是少了。base 是原来的量（画一道竖线），max 是满格 */
export function Bar({ name, value, base, max, color, note }: { name: ReactNode; value: number; base: number; max: number; color: string; note?: string }) {
  return <div className="flex items-center gap-2.5 text-[13.5px]">
    <span className="w-[5.6em] flex-none font-semibold">{name}</span>
    <div className="relative min-w-0 flex-1 rounded-full bg-white/10" style={{ height: 14 }}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, value / max * 100)}%`, background: color }} />
      <div className="absolute bg-white/75" style={{ left: `${base / max * 100}%`, top: -3, bottom: -3, width: 2 }} />
    </div>
    <span className={cn('w-[4.2em] flex-none text-right text-[12.5px] tabular-nums', note === '增多' ? 'text-[#ffd76a]' : note === '减少' ? 'text-[#8fc7ff]' : 'text-white/55')}>{note ?? ''}</span>
  </div>
}
/** 曲线图：横轴 x、纵轴 y。pts 是整条曲线，upto 画到第几个点；marks 是要标出来的点；zero 画不画 y=0 的横线 */
export function Chart({ pts, upto, xr, yr, xLabel, yLabel, marks = [], color = '#7fe3d4', bands }: { pts: { x: number; y: number }[]; upto: number; xr: [number, number]; yr: [number, number]; xLabel: string; yLabel: string; marks?: { x: number; y: number; name: string; color?: string }[]; color?: string; bands?: { from: number; to: number; color: string }[] }) {
  const W = 290, Hh = 170, L = 34, R = 8, T = 10, B = 28
  const X = (x: number) => L + (x - xr[0]) / (xr[1] - xr[0]) * (W - L - R), Y = (y: number) => T + (1 - (y - yr[0]) / (yr[1] - yr[0])) * (Hh - T - B)
  const d = pts.slice(0, upto + 1).map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(k => xr[0] + (xr[1] - xr[0]) * k)
  return <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
    {bands?.map((b, i) => <rect key={i} x={X(b.from)} y={T} width={X(b.to) - X(b.from)} height={Hh - T - B} fill={b.color} opacity={0.3} />)}
    <line x1={L} y1={T} x2={L} y2={Hh - B} stroke="rgba(255,255,255,0.35)" /><line x1={L} y1={Hh - B} x2={W - R} y2={Hh - B} stroke="rgba(255,255,255,0.35)" />
    {yr[0] < 0 && <><line x1={L} y1={Y(0)} x2={W - R} y2={Y(0)} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" /><text x={L - 5} y={Y(0) + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.6)">0</text></>}
    {ticks.map(t => <text key={t} x={X(t)} y={Hh - B + 13} textAnchor="middle" fontSize="10.5" fill="rgba(255,255,255,0.55)">{Math.round(t)}</text>)}
    <text x={(L + W - R) / 2} y={Hh - 2} textAnchor="middle" fontSize="11.5" fill="rgba(255,255,255,0.7)">{xLabel}</text>
    <text x={11} y={(T + Hh - B) / 2} textAnchor="middle" fontSize="11.5" fill="rgba(255,255,255,0.7)" transform={`rotate(-90 11 ${(T + Hh - B) / 2})`}>{yLabel}</text>
    {d && <path d={d} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />}
    {upto >= 0 && upto < pts.length && <circle cx={X(pts[upto].x)} cy={Y(pts[upto].y)} r="3.6" fill="#fff" />}
    {marks.map(k => <g key={k.name}><line x1={X(k.x)} y1={Y(k.y)} x2={X(k.x)} y2={Hh - B} stroke={k.color ?? '#ffe9a8'} strokeDasharray="3 3" /><circle cx={X(k.x)} cy={Y(k.y)} r="4.2" fill={k.color ?? '#ffe9a8'} /><text x={Math.min(W - 40, X(k.x) + 6)} y={Y(k.y) + (k.y > (yr[0] + yr[1]) / 2 ? 16 : -8)} fontSize="11.5" fontWeight="600" fill={k.color ?? '#ffe9a8'}>{k.name}</text></g>)}
  </svg>
}
