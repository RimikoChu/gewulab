// 各课面板里重复出现的两块：顶上的公式和大读数、结论条里的三行字。
import type { ReactNode } from 'react'

/** 面板顶上：公式、一个大读数、一行说明 */
export function Big({ formula, value, unit, note }: { formula: string; value: string; unit: string; note?: ReactNode }) {
  return <div className="text-center">
    <div className="font-formula text-[18px] italic text-white/65">{formula}</div>
    <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{value}<span className="ml-1 text-[15px] font-medium text-white/55">{unit}</span></div>
    {note && <div className="mt-1.5 text-[13px] text-white/55">{note}</div>}
  </div>
}
/** 结论条里的内容：一行小字、一句结论、一行数据 */
export function Final({ kicker, title, body }: { kicker: string; title: string; body: ReactNode }) {
  return <div>
    <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">{kicker}</p>
    <p className="mt-1 text-[19px] leading-snug font-bold">{title}</p>
    <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{body}</p>
  </div>
}
/** 面板里的小标题 */
export const Sub = ({ children }: { children: ReactNode }) => <h2 className="mt-5 text-[12.5px] text-white/55">{children}</h2>
