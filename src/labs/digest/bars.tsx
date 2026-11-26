// 面板上的三根条：淀粉、蛋白质、脂肪各还剩多少没被消化（示意，不标数）。第 4、5 课和拓展课用。
import { cn } from '@/lib/utils'
import { MACRO, type Macro } from './physics'

const WORD = (k: number) => (k > 0.97 ? '还没消化' : k < 0.02 ? '全部分解' : '部分分解')
export function Bars({ left, hl }: { left: Record<Macro, number>; hl: Macro | null }) {
  return <ul className="mt-2 flex flex-col gap-2">
    {(Object.keys(MACRO) as Macro[]).map(m => <li key={m} className={cn('rounded-lg px-3 py-2', hl === m ? 'bg-white/12' : 'bg-white/5')}>
      <div className="flex justify-between text-[13.5px]"><span className={hl === m ? 'font-semibold text-white' : 'text-white/80'}>{MACRO[m].name}</span><span className="text-white/60">{WORD(left[m])}</span></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${left[m] * 100}%`, background: MACRO[m].color }} /></div>
    </li>)}
  </ul>
}
