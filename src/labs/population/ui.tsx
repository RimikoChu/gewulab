// 种群和生态系统 · 各课面板里共用的小块：结论卡、小标题、一行读数、算式。
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
export const H = ({ children }: { children: ReactNode }) => <h2 className="mt-4 mb-2 text-[12.5px] text-white/55">{children}</h2>
/** 一行：左边名字，右边读数；on 是现在正在看的，dim 是还没有的 */
export function Row({ name, value, on, dim, color }: { name: ReactNode; value: ReactNode; on?: boolean; dim?: boolean; color?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-[14px] leading-snug transition-colors', on ? 'bg-[#35c7b3]/20' : 'bg-white/6')}>
      <span className={cn('flex items-center gap-2', dim ? 'text-white/40' : 'text-white/80')}>{color && <i className="inline-block size-2.5 rounded-full" style={{ background: color }} />}{name}</span>
      <span className={cn('font-semibold tabular-nums', dim ? 'text-white/30' : 'text-white')}>{value}</span>
    </div>
  )
}
/** 大字的算式和结果 */
export function Big({ formula, value, unit }: { formula: ReactNode; value: ReactNode; unit: string }) {
  return (
    <div className="text-center">
      <div className="font-formula text-[18px] italic text-white/65">{formula}</div>
      <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{value}<span className="ml-1 text-[15px] font-medium text-white/55">{unit}</span></div>
    </div>
  )
}
