// 减数分裂和遗传规律 · 各课面板里共用的小块：结论卡、一行一项的清单、小标题、大读数、颜色图例。
import type { ReactNode } from 'react'
import { Glass, LabButton } from '@/components/lab/lab-shell'
import { cn } from '@/lib/utils'

/** 全部任务完成时的结论卡。notes：这一课的画面做了哪些简化 */
export function Finale({ kicker, title, text, notes, onClose }: { kicker: string; title: string; text: string; notes?: string; onClose: () => void }) {
  return (
    <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
      <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">{kicker}</p>
      <p className="mt-2 text-[21px] leading-snug font-bold">{title}</p>
      <p className="mt-3 text-[14px] leading-relaxed text-white/70">{text}</p>
      {notes && <p className="mt-3 border-t border-white/12 pt-3 text-[12.5px] leading-relaxed text-white/50">{notes}</p>}
      <LabButton primary className="mx-auto mt-4" onClick={onClose}>再看一看</LabButton>
    </Glass>
  )
}
/** 一行：左边名字，右边说明；on 是正在看的，seen 是看过的 */
export function Row({ name, text, on, seen, tag }: { name: ReactNode; text: ReactNode; on?: boolean; seen?: boolean; tag?: ReactNode }) {
  return (
    <div className={cn('flex items-baseline gap-2.5 rounded-xl px-3 py-2 text-[13.5px] leading-snug transition-colors', on ? 'bg-[#35c7b3]/20' : 'bg-white/6')}>
      <span className={cn('w-[4.6em] flex-none font-semibold', on ? 'text-[#7fe3d4]' : seen ? 'text-white' : 'text-white/45')}>{name}</span>
      <span className={cn('min-w-0 flex-1', on || seen ? 'text-white/85' : 'text-white/35')}>{text}</span>
      {tag && <span className="flex-none rounded-md bg-white/10 px-1.5 py-0.5 text-[11.5px] text-white/70">{tag}</span>}
    </div>
  )
}
export const H = ({ children }: { children: ReactNode }) => <h2 className="mt-4 mb-2 text-[12.5px] text-white/55">{children}</h2>
/** 大读数：上面一行小字，下面一个大数 */
export function Big({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return <div className="text-center">
    <div className="text-[13px] text-white/60">{label}</div>
    <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{value}{unit && <span className="ml-1 text-[15px] font-medium text-white/55">{unit}</span>}</div>
  </div>
}
/** 母方、父方染色体的颜色图例 */
export function Legend() {
  return <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-white/60">
    <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-4 rounded-full bg-[#d0573c]" />来自母方</span>
    <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-4 rounded-full bg-[#4277c4]" />来自父方</span>
    <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-4 rounded-full bg-[#ffe27a]" />基因的位置</span>
  </div>
}
/** 一个细胞里染色体数（实线）和核 DNA 数（虚线）随时期的变化：阶梯折线，现在的时期竖一道亮线 */
export function Curve({ data, at, mark }: { data: { short: string; chr: number; dna: number }[]; at: number; mark?: number[] }) {
  const W = 290, Hh = 150, L = 26, B = 22, T = 8, max = Math.max(...data.map(d => d.dna))
  const x = (i: number) => L + (i + 0.5) * (W - L - 4) / data.length, y = (v: number) => T + (Hh - T - B) * (1 - v / max)
  const step = (k: 'chr' | 'dna') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i) - (W - L - 4) / data.length / 2},${y(d[k])} L${x(i) + (W - L - 4) / data.length / 2},${y(d[k])}`).join(' ')
  return <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
    {[0, max / 2, max].map(v => <g key={v}><line x1={L} x2={W - 4} y1={y(v)} y2={y(v)} stroke="rgb(255 255 255 / 0.1)" /><text x={L - 5} y={y(v) + 4} textAnchor="end" fontSize="11" fill="rgb(255 255 255 / 0.5)">{v}</text></g>)}
    {mark?.map(i => <rect key={i} x={x(i) - (W - L - 4) / data.length / 2} y={T} width={(W - L - 4) / data.length} height={Hh - T - B} fill="rgb(255 233 168 / 0.16)" />)}
    <rect x={x(at) - (W - L - 4) / data.length / 2} y={T} width={(W - L - 4) / data.length} height={Hh - T - B} fill="rgb(53 199 179 / 0.22)" />
    <path d={step('dna')} fill="none" stroke="#ffb37a" strokeWidth="2.4" strokeDasharray="5 3" />
    <path d={step('chr')} fill="none" stroke="#7fe3d4" strokeWidth="2.6" />
    {data.map((d, i) => <text key={i} x={x(i)} y={Hh - 6} textAnchor="middle" fontSize="9.5" fill={i === at ? '#ffffff' : 'rgb(255 255 255 / 0.5)'}>{d.short}</text>)}
  </svg>
}
export function CurveKey() {
  return <div className="mt-1 flex gap-4 text-[12.5px] text-white/60"><span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-[#7fe3d4]" />染色体数</span><span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-[#ffb37a]" />核 DNA 数</span></div>
}
/** 性染色体上的基因写成上标：XWXw → XᵂXʷ */
const SUP: Record<string, string> = { W: 'ᵂ', w: 'ʷ', B: 'ᴮ', b: 'ᵇ' }
export const xPretty = (g: string[]) => g.map(x => (x === 'Y' ? 'Y' : `X${SUP[x[1]] ?? x[1]}`)).join('')
