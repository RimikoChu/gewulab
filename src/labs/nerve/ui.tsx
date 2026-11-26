// 读数面板里共用的小部件：一串依次经过的站（走到哪亮到哪）、一个大读数。
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 一串站：state 为 'on' 已经走到、'now' 正在走、'off' 没走到、'cut' 断了 */
export function Chain({ items }: { items: { name: string; sub?: string; state: 'on' | 'now' | 'off' | 'cut' }[] }) {
  return <ol className="flex flex-col gap-1">
    {items.map((it, i) => <li key={i} className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[14px] transition-colors',
      it.state === 'now' ? 'bg-[#35c7b3] font-semibold text-[#06231f]' : it.state === 'on' ? 'bg-[#35c7b3]/20 text-white' : it.state === 'cut' ? 'bg-[#ff6b6b]/20 text-[#ffb1b1]' : 'bg-white/6 text-white/50')}>
      <span className={cn('grid size-5 flex-none place-items-center rounded-full text-[11.5px] tabular-nums', it.state === 'now' ? 'bg-[#06231f]/20' : 'bg-white/12')}>{i + 1}</span>
      <span className="min-w-0 flex-1">{it.name}{it.sub && <span className={cn('ml-1.5 text-[12px] font-normal', it.state === 'now' ? 'text-[#06231f]/70' : 'text-white/45')}>{it.sub}</span>}</span>
      {it.state === 'cut' && <span className="text-[12px] font-semibold">断了</span>}
    </li>)}
  </ol>
}
/** 一个大读数 */
export function Big({ label, value, unit, tone }: { label: ReactNode; value: ReactNode; unit?: string; tone?: 'good' | 'bad' }) {
  return <div className="rounded-xl bg-white/8 px-3 py-2.5 text-center">
    <div className="text-[12.5px] text-white/55">{label}</div>
    <div className={cn('mt-0.5 text-[26px] leading-tight font-bold tabular-nums', tone === 'good' && 'text-[#7fe3d4]', tone === 'bad' && 'text-[#ff8a8f]')}>{value}{unit && <span className="ml-1 text-[14px] font-medium text-white/55">{unit}</span>}</div>
  </div>
}
