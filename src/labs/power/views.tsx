// 面板上的数据表和一行行的读数。
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 数据表：head 是表头，rows 每行几格；hl 高亮的那一行 */
export function Table({ head, rows, hl, foot }: { head: ReactNode[]; rows: ReactNode[][]; hl?: number; foot?: ReactNode[] }) {
  return (
    <table className="w-full text-center text-[13.5px] tabular-nums">
      <thead><tr className="text-white/55">{head.map((h, i) => <th key={i} className="pb-1 font-medium">{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => <tr key={i} className={cn('bg-white/[0.04]', i === hl && 'bg-[#35c7b3]/20')}>{r.map((c, j) => <td key={j} className={cn('py-1.5', j === 0 && 'rounded-l-lg', j === r.length - 1 && 'rounded-r-lg')}>{c}</td>)}</tr>)}
        {foot && <tr className="font-semibold text-[#7fe3d4]">{foot.map((c, j) => <td key={j} className="pt-1.5">{c}</td>)}</tr>}
      </tbody>
    </table>
  )
}

/** 一个大读数：上面一行小字，下面大字加单位 */
export function Big({ label, value, unit, dim }: { label: ReactNode; value: string; unit: string; dim?: boolean }) {
  return <div className={cn('text-center transition-opacity', dim && 'opacity-50')}>
    <div className="text-[12.5px] text-white/55">{label}</div>
    <div className="mt-0.5 text-[36px] leading-none font-bold tracking-tight tabular-nums">{value}<span className="ml-1 text-[14px] font-medium text-white/55">{unit}</span></div>
  </div>
}
