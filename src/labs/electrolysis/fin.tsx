// 结论卡：一行小标题、一句大字结论、一段数字。外壳把它放进底部的结论条。
import type { ReactNode } from 'react'
import { Glass } from '@/components/lab/lab-shell'

export function Fin({ tag, big, children }: { tag: string; big: string; children: ReactNode }) {
  return <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
    <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">{tag}</p>
    <p className="mt-2 text-[21px] leading-snug font-bold">{big}</p>
    <p className="mt-3 text-[14px] leading-relaxed text-white/70">{children}</p>
  </Glass>
}
