// 光的反射和平面镜 · 各课面板里反复用到的几块界面：结论卡、面板顶上的大读数、数据表。
import type { ReactNode } from 'react'
import { Glass, LabButton } from '@/components/lab/lab-shell'

/** 全部任务完成时弹出的结论卡 */
export function Finale({ kicker, title, children, onClose }: { kicker: string; title: string; children?: ReactNode; onClose: () => void }) {
  return (
    <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
      <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">{kicker}</p>
      <p className="mt-2 text-[21px] leading-snug font-bold">{title}</p>
      {children && <p className="mt-3 text-[14px] leading-relaxed text-white/70">{children}</p>}
      <LabButton primary className="mx-auto mt-4" onClick={onClose}>再看一看</LabButton>
    </Glass>
  )
}
/** 面板顶上的一个大读数：上面一行小字说明，下面是数和单位；text 为真时按一句话的字号显示 */
export function Readout({ label, value, unit, text = false }: { label: string; value: string; unit?: string; text?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-[13px] text-white/60">{label}</div>
      {text ? <div className="mt-1 text-[24px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{value}</div>
        : <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{value}{unit && <span className="ml-1 text-[15px] font-medium text-white/55">{unit}</span>}</div>}
    </div>
  )
}
/** 数据表：还没有数据时显示一句提示 */
export function DataTable({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty: string }) {
  return <>
    <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
    {rows.length === 0 ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">{empty}</p>
      : <table className="mt-1 w-full text-[13.5px]">
          <thead><tr className="text-left text-[12px] text-white/50">{head.map((h, i) => <th key={h} className={`py-1 font-normal ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, k) => <tr key={k} className="row-in border-t border-white/12">{r.map((c, i) => <td key={i} className={i === 0 ? 'py-1.5 text-white/80 tabular-nums' : i === r.length - 1 ? 'text-right font-semibold text-[#7fe3d4] tabular-nums' : 'text-right tabular-nums'}>{c}</td>)}</tr>)}</tbody>
        </table>}
  </>
}
/** 面板里的一段说明文字 */
export const Note = ({ children }: { children: ReactNode }) => <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{children}</p>
