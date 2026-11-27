// 各课共用的几样界面小件：结论条的内容、读数面板里的大数和小表、场景标签的写法、按时间往前走的数、把船放到海面上。
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Glass } from '@/components/lab/lab-shell'
import type { Label } from '@/lab-kit'
import { onRim, onSurface, type CutGeo } from './ocean'

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
    <tbody>{rows.map((r, i) => <tr key={i} className="row-in border-t border-white/10">{r.map((c, j) => <td key={j} className={`py-1.5 ${j ? 'text-right' : 'text-left'}`}>{c}</td>)}</tr>)}</tbody>
  </table>
}
/** 读数面板顶上的大数 */
export function Big({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return <div className="text-center">
    <div className="text-[13px] text-white/60">{label}</div>
    <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums" style={{ color }}>{value}{unit && <span className="ml-1 text-[15px] font-medium text-white/55">{unit}</span>}</div>
  </div>
}
/** 小标题 */
export const H2 = ({ children }: { children: ReactNode }) => <h2 className="mt-5 text-[12.5px] text-white/55">{children}</h2>
/** 器材名称（开头显示几秒后淡出） */
export const nameTag = (id: string, at: V3, text: string, ax = 0.5): Label => ({ id, at, ax, name: true, className: 'scene-name -translate-y-1/2', children: text })
/** 读数标签：key 为真时用强调色 */
export const valTag = (id: string, at: V3, small: string, text: ReactNode, key = false, show = true, ax = 0): Label =>
  ({ id, at, ax, className: `scene-tag ${key ? 'key' : ''} -translate-y-1/2 transition-opacity`, style: { opacity: show ? 1 : 0 }, children: <><small>{small}</small>{text}</> })
/** 画面上的说明字：深色半透明底、白字 */
export const noteTag = (id: string, at: V3, text: ReactNode, show = true, ax = 0.5, color?: string): Label =>
  ({ id, at, ax, className: 'scene-tag -translate-y-1/2 transition-opacity duration-500', style: { opacity: show ? 1 : 0, background: 'rgb(12 16 22 / 0.68)', color: color ?? '#fff', boxShadow: 'none', fontSize: 15 }, children: text })
/** 高压、低压的标签：蓝底、红底 */
export const pTag = (id: string, at: V3, text: string, high: boolean, show = true, ax = 0.5): Label =>
  ({ id, at, ax, className: 'scene-tag -translate-y-1/2 transition-opacity duration-500', style: { opacity: show ? 1 : 0, background: high ? 'rgb(30 90 220 / 0.88)' : 'rgb(215 60 40 / 0.88)', color: '#fff', boxShadow: 'none', fontSize: 15 }, children: text })

/** 一个按时间往前走的数：start() 从 from 开始以 rate 每秒涨到 to，到了就停 */
export function useRun(rate: number) {
  const [v, setV] = useState(0), [on, setOn] = useState(false), raf = useRef(0), cur = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const start = (from: number, to: number, done?: () => void) => {
    cancelAnimationFrame(raf.current); cur.current = from; setV(from); setOn(true)
    let last = performance.now(); const dir = Math.sign(to - from) || 1
    const f = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now
      cur.current += dir * rate * dt
      if ((dir > 0 && cur.current >= to) || (dir < 0 && cur.current <= to)) { cur.current = to; setV(to); setOn(false); done?.(); return }
      setV(cur.current); raf.current = requestAnimationFrame(f)
    }
    raf.current = requestAnimationFrame(f)
  }
  const reset = (x = 0) => { cancelAnimationFrame(raf.current); cur.current = x; setV(x); setOn(false) }
  return { v, on, start, reset }
}

/** 把一件东西（船、浮标）放到海面上：lon、lat 处，船头朝 heading，按 scale 缩小 */
export function OnSea({ lon, lat, heading = 0, scale, lift = 0, children }: { lon: number; lat: number; heading?: number; scale: number; lift?: number; children: ReactNode }) {
  const p = onSurface(lon, lat, heading, lift)
  return <group position={p.position} quaternion={p.quaternion} scale={scale}>{children}</group>
}
/** 放到剖面边上的海面：船身侧面朝镜头 */
export function OnRim({ cut, lon, east = false, scale, children }: { cut: CutGeo; lon: number; east?: boolean; scale: number; children: ReactNode }) {
  const p = onRim(cut, lon, east, scale * 10)
  return <group position={p.position} quaternion={p.quaternion} scale={scale}>{children}</group>
}
