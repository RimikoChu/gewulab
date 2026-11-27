// 遗传和变异 · 各课面板里共用的小块：结论卡、一行一项的清单、小标题、遗传图解的方格。
import { Fragment, type ReactNode } from 'react'
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
/** 遗传图解的方格：上面一行是一方的两种生殖细胞，左边一列是另一方的，格子里是组合出来的基因组成 */
export function Punnett({ top, left, cells, show = true }: { top: string[]; left: string[]; cells: string[]; show?: boolean }) {
  const tall = (g: string) => g.includes('D') || g.includes('R')
  return <div className="grid gap-1.5 text-center text-[15px] tabular-nums" style={{ gridTemplateColumns: '2.2em 1fr 1fr' }}>
    <span />
    {top.map((t, i) => <span key={i} className="rounded-lg bg-white/8 py-1 font-semibold" style={{ color: '#9cc2ff' }}>{t}</span>)}
    {left.map((l, r) => <Fragment key={r}>
      <span className="grid place-items-center rounded-lg bg-white/8 font-semibold" style={{ color: '#ffc59c' }}>{l}</span>
      {[0, 1].map(c => { const g = cells[r * 2 + c]; return <span key={`${r}${c}`} className="rounded-lg py-1.5 font-bold transition-opacity" style={{ opacity: show ? 1 : 0, background: tall(g) ? 'rgb(53 199 179 / 0.22)' : 'rgb(255 210 122 / 0.22)', color: tall(g) ? '#ffffff' : '#ffe3a6' }}>{g}<span className="ml-1 text-[11.5px] font-medium text-white/60">{tall(g) ? (g.includes('D') ? '高茎' : '圆粒') : (g.includes('d') ? '矮茎' : '皱粒')}</span></span> })}
    </Fragment>)}
  </div>
}
