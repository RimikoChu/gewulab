// 结论卡：一行小标题、一句大字结论、一段说明。外壳把它放进底部的结论条。
import type { ReactNode } from 'react'
import { Glass } from '@/components/lab/lab-shell'

export function Fin({ tag, big, children }: { tag: string; big: string; children: ReactNode }) {
  return <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
    <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">{tag}</p>
    <p className="mt-2 text-[21px] leading-snug font-bold">{big}</p>
    <p className="mt-3 text-[14px] leading-relaxed text-white/70">{children}</p>
  </Glass>
}
/** 面板里的一行：左边是名字，右边是值 */
export function Row({ name, children, on = true }: { name: string; children: ReactNode; on?: boolean }) {
  return <div className="flex items-baseline justify-between gap-3 border-b border-white/8 py-1.5 text-[14.5px] last:border-0"><span className="flex-none text-white/60">{name}</span><span className={on ? 'text-right font-medium tabular-nums' : 'text-white/35'}>{on ? children : '—'}</span></div>
}
