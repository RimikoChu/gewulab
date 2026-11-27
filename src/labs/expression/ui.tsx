// 基因的表达 · 各课面板里共用的小块：结论条里的内容、彩色的碱基序列、小标题、一行一项、大读数。
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { BASE_COLOR } from './mol'
import type { Base } from './physics'

/** 结论条里的内容：一行小字、一句结论、一段说明；notes 是这一课的画面做了哪些简化 */
export function Finale({ kicker, title, text, notes }: { kicker: string; title: string; text: string; notes?: string }) {
  return <div>
    <p className="text-[12.5px] tracking-[0.12em] text-[#7fe3d4]">{kicker}</p>
    <p className="mt-0.5 text-[18px] leading-snug font-bold">{title}</p>
    <p className="mt-1 text-[13.5px] leading-relaxed text-white/75">{text}</p>
    {notes && <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">{notes}</p>}
  </div>
}
/** 一串碱基，按碱基上色；group 每几个空一格（密码子）；mark 是要标出来的位置；faint 之后的还没合成 */
export function Seq({ s, group = 0, mark = [], upto, className, label }: { s: string; group?: number; mark?: number[]; upto?: number; className?: string; label?: ReactNode }) {
  return <div className={cn('flex items-baseline gap-2', className)}>
    {label && <span className="w-[3.2em] flex-none text-[12px] text-white/55">{label}</span>}
    <span className="font-mono text-[15px] leading-relaxed font-bold tracking-[0.06em] break-all">
      {[...s].map((b, i) => <span key={i} className={cn(group && i % group === 0 && i ? 'ml-[0.4em]' : '', mark.includes(i) && 'rounded-[3px] px-[1px]')} style={{ background: mark.includes(i) ? 'rgba(255,255,255,0.88)' : undefined, color: mark.includes(i) ? '#10151a' : BASE_COLOR[b as Base] ?? '#fff', opacity: upto !== undefined && i >= upto ? 0.18 : 1 }}>{b}</span>)}
    </span>
  </div>
}
export const H = ({ children }: { children: ReactNode }) => <h2 className="mt-4 mb-2 text-[12.5px] text-white/55">{children}</h2>
/** 一行：左边名字，右边说明；on 是正在看的 */
export function Row({ name, text, on, seen = true }: { name: ReactNode; text: ReactNode; on?: boolean; seen?: boolean }) {
  return <div className={cn('flex items-baseline gap-2.5 rounded-xl px-3 py-2 text-[13.5px] leading-snug transition-colors', on ? 'bg-[#35c7b3]/20' : 'bg-white/6')}>
    <span className={cn('w-[4.8em] flex-none font-semibold', on ? 'text-[#7fe3d4]' : seen ? 'text-white' : 'text-white/45')}>{name}</span>
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
/** 碱基颜色图例 */
export function Legend({ rna }: { rna?: boolean }) {
  const list: Base[] = rna ? ['A', 'U', 'G', 'C'] : ['A', 'T', 'G', 'C']
  return <div className="mt-3 flex justify-center gap-3 text-[12.5px] text-white/65">{list.map(b => <span key={b} className="flex items-center gap-1"><span className="size-2.5 rounded-sm" style={{ background: BASE_COLOR[b] }} />{b}</span>)}</div>
}
