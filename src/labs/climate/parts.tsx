// 各课共用的几样界面小件：结论卡的内容、读数面板里的小表、场景标签的写法。
import type { ReactNode } from 'react'
import { Glass } from '@/components/lab/lab-shell'
import type { Label } from '@/lab-kit'

type V3 = [number, number, number]
/** 结论条的内容：一行小字、一句结论、一两句说明 */
export function Fin({ kicker, big, small }: { kicker: string; big: string; small: ReactNode }) {
  return <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
    <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">{kicker}</p>
    <p className="mt-2 text-[21px] leading-snug font-bold">{big}</p>
    <p className="mt-3 text-[14px] leading-relaxed text-white/70">{small}</p>
  </Glass>
}

/** 读数面板里的一张小表 */
export function Rows({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return <table className="mt-2 w-full text-[13.5px] tabular-nums">
    <thead><tr className="text-white/50">{head.map((h, i) => <th key={i} className={`pb-1 font-normal ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-white/10">{r.map((c, j) => <td key={j} className={`py-1.5 ${j ? 'text-right' : 'text-left'}`}>{c}</td>)}</tr>)}</tbody>
  </table>
}

/** 器材名称（开头显示几秒后淡出） */
export const nameTag = (id: string, at: V3, text: string, ax = 0.5): Label => ({ id, at, ax, name: true, className: 'scene-name -translate-y-1/2', children: text })
/** 读数标签：key 为真时用强调色 */
export const valTag = (id: string, at: V3, small: string, text: ReactNode, key = false, show = true, ax = 0): Label =>
  ({ id, at, ax, className: `scene-tag ${key ? 'key' : ''} -translate-y-1/2 transition-opacity`, style: { opacity: show ? 1 : 0 }, children: <><small>{small}</small>{text}</> })
