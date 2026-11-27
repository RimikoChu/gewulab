// 各课共用的几样界面小件：结论条的内容、读数面板里的小表、场景标签的写法。
import { useEffect, useRef, useState, type ReactNode } from 'react'
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

/** 读数面板顶上的大数 */
export function Big({ label, value, unit }: { label: string; value: string; unit: string }) {
  return <div className="text-center">
    <div className="text-[13px] text-white/60">{label}</div>
    <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{value}<span className="ml-1 text-[15px] font-medium text-white/55">{unit}</span></div>
  </div>
}

/** 器材名称（开头显示几秒后淡出） */
export const nameTag = (id: string, at: V3, text: string, ax = 0.5): Label => ({ id, at, ax, name: true, className: 'scene-name -translate-y-1/2', children: text })
/** 读数标签：key 为真时用强调色 */
export const valTag = (id: string, at: V3, small: string, text: ReactNode, key = false, show = true, ax = 0): Label =>
  ({ id, at, ax, className: `scene-tag ${key ? 'key' : ''} -translate-y-1/2 transition-opacity`, style: { opacity: show ? 1 : 0 }, children: <><small>{small}</small>{text}</> })
/** 剖面上的说明字：白字、不带底，常驻 */
export const noteTag = (id: string, at: V3, text: ReactNode, show = true, ax = 0.5): Label =>
  ({ id, at, ax, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: show ? 1 : 0, background: 'rgb(15 20 24 / 0.62)', color: '#fff', boxShadow: 'none', fontSize: 15 }, children: text })

/** 一个按时间往前走的数：start() 从 0 开始以 rate 每秒涨到 max，到了就停 */
export function useRun(rate: number, max: number) {
  const [v, setV] = useState(0), [on, setOn] = useState(false), raf = useRef(0), cur = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const start = () => {
    cancelAnimationFrame(raf.current); cur.current = 0; setV(0); setOn(true)
    let last = performance.now()
    const f = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now
      cur.current = Math.min(max, cur.current + rate * dt); setV(cur.current)
      if (cur.current < max) raf.current = requestAnimationFrame(f); else setOn(false)
    }
    raf.current = requestAnimationFrame(f)
  }
  const reset = () => { cancelAnimationFrame(raf.current); cur.current = 0; setV(0); setOn(false) }
  return { v, on, start, reset }
}
