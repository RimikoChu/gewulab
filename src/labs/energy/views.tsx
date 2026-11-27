// 各课面板里共用的小部件：能量条、记录表、结论卡。
import type { ReactNode } from 'react'
import { Glass, LabButton } from '@/components/lab/lab-shell'

/** 各种能量的颜色：全实验室统一 */
export const COL = { ep: '#ffb84d', ek: '#5ad1ff', es: '#b78cff', e: '#7fe3d4', heat: '#ff8a70', f: '#ff7a59', s: '#5ad1ff' }

/** 一组横向的能量条：max 是满格对应的值 */
export function Bars({ items, max, unit = 'kJ', d = 1 }: { items: { name: string; value: number; color: string }[]; max: number; unit?: string; d?: number }) {
  return <div className="flex flex-col gap-2.5">
    {items.map(b => <div key={b.name}>
      <div className="flex items-baseline justify-between text-[13px]"><span style={{ color: b.color }}>{b.name}</span><span className="font-semibold tabular-nums">{b.value.toFixed(d)} <span className="text-[12px] font-normal text-white/55">{unit}</span></span></div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, b.value / max)) * 100}%`, background: b.color }} /></div>
    </div>)}
  </div>
}

/** 记录表：head 是表头，rows 是每一行的格子（最后一格加粗） */
export function Records({ title, head, rows }: { title: string; head: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return null
  return <>
    <h2 className="mt-4 text-[12.5px] text-white/55">{title}</h2>
    <table className="mt-1 w-full text-[13px]">
      <thead><tr className="text-left text-[12px] text-white/50">{head.map((h, i) => <th key={h} className={`py-1 font-normal ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, k) => <tr key={k} className="row-in border-t border-white/12">{r.map((c, i) => <td key={i} className={`py-1.5 tabular-nums ${i ? 'text-right' : 'text-white/80'} ${i === r.length - 1 ? 'font-semibold text-[#7fe3d4]' : ''}`}>{c}</td>)}</tr>)}</tbody>
    </table>
  </>
}

/** 结论卡：小标题、一句结论、补充说明 */
export function Finale({ kicker, title, more, onClose }: { kicker: string; title: string; more?: ReactNode; onClose: () => void }) {
  return <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
    <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">{kicker}</p>
    <p className="mt-2 text-[21px] leading-snug font-bold">{title}</p>
    {more && <p className="mt-3 text-[14px] leading-relaxed text-white/70">{more}</p>}
    <LabButton primary className="mx-auto mt-4" onClick={onClose}>再看一看</LabButton>
  </Glass>
}
/** 面板顶上的大读数 */
export function Big({ formula, value, unit }: { formula: ReactNode; value: string; unit: string }) {
  return <div className="text-center">
    <div className="font-formula text-[18px] italic text-white/65">{formula}</div>
    <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{value}<span className="ml-1 text-[15px] font-medium text-white/55">{unit}</span></div>
  </div>
}
