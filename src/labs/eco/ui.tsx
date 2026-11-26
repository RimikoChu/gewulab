// 生态系统 · 各课面板里共用的小块：结论卡、一行一个条目的清单、小标题。
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
/** 一行：左边名字，右边说明；on 是现在正在看的，seen 是看过的 */
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
/** 一条食物链的写法：名字之间用箭头连起来；lit 是已经连上的几环 */
export function ChainLine({ names, lit, bad }: { names: readonly string[]; lit: number; bad?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[20px] font-bold">
      {names.map((n, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className={cn('text-[16px]', i < lit ? 'text-[#ffd36a]' : 'text-white/20')}>→</span>}
          <span className={cn(i < lit ? 'text-white' : 'text-white/25')}>{n}</span>
        </span>
      ))}
      {bad && <span className="flex items-center gap-1.5"><span className="text-[16px] text-[#ff8a8a]">→</span><span className="text-[#ff8a8a] line-through">{bad}</span></span>}
    </div>
  )
}
