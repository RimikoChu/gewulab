// 面板上的小图和表：坐标图（记一组数据多一个点，连成图像后画出直线或曲线）、数据表。
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface Pt { x: number; y: number }
/**
 * 坐标图。pts：记下的点；now：现在的读数（空心圈，跟着走）；line：过原点直线的斜率（连线以后才给）；
 * curve：把点按顺序连成一条光滑的线（小灯泡）；fn：一条函数曲线（I–R 图像）；ref：一条淡淡的参照直线的斜率
 */
export function Chart({ xLabel, yLabel, xMax, yMax, xStep, yStep, pts, now, line, curve, fn, refK, fmtX = String, fmtY = String }: {
  xLabel: string; yLabel: string; xMax: number; yMax: number; xStep: number; yStep: number; pts: Pt[]; now?: Pt | null
  line?: number | null; curve?: boolean; fn?: ((x: number) => number) | null; refK?: number | null; fmtX?: (x: number) => string; fmtY?: (y: number) => string
}) {
  const W = 290, H = 196, L = 40, B = 30, T = 12, R = 14, w = W - L - R, h = H - T - B
  const X = (x: number) => L + x / xMax * w, Y = (y: number) => T + h - Math.min(1.04, y / yMax) * h
  const xs: number[] = [], ys: number[] = []
  for (let x = 0; x <= xMax + 1e-9; x += xStep) xs.push(+x.toFixed(6))
  for (let y = 0; y <= yMax + 1e-9; y += yStep) ys.push(+y.toFixed(6))
  const sorted = [...pts].sort((a, b) => a.x - b.x)
  // 光滑曲线：从原点出发，经过各点（Catmull–Rom 换成三次贝塞尔）
  const path = (() => {
    if (!curve || sorted.length < 2) return ''
    const q = [{ x: 0, y: 0 }, ...sorted].map(p => [X(p.x), Y(p.y)])
    let d = `M${q[0][0]},${q[0][1]}`
    for (let i = 0; i < q.length - 1; i++) {
      const p0 = q[Math.max(0, i - 1)], p1 = q[i], p2 = q[i + 1], p3 = q[Math.min(q.length - 1, i + 2)]
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`
    }
    return d
  })()
  const fnPath = fn ? Array.from({ length: 80 }, (_, i) => xMax * (0.02 + 0.98 * i / 79)).filter(x => fn(x) <= yMax).map((x, i) => `${i ? 'L' : 'M'}${X(x)},${Y(fn(x))}`).join(' ') : ''
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${yLabel}–${xLabel} 图像`}>
      {xs.map(x => <line key={`x${x}`} x1={X(x)} x2={X(x)} y1={T} y2={T + h} stroke="white" strokeOpacity={x === 0 ? 0.5 : 0.1} />)}
      {ys.map(y => <line key={`y${y}`} x1={L} x2={L + w} y1={Y(y)} y2={Y(y)} stroke="white" strokeOpacity={y === 0 ? 0.5 : 0.1} />)}
      {xs.map(x => <text key={`tx${x}`} x={X(x)} y={T + h + 16} fill="white" fillOpacity={0.6} fontSize={11} textAnchor="middle">{fmtX(x)}</text>)}
      {ys.map(y => <text key={`ty${y}`} x={L - 6} y={Y(y) + 4} fill="white" fillOpacity={0.6} fontSize={11} textAnchor="end">{fmtY(y)}</text>)}
      <text x={L + w} y={T + h + 28} fill="white" fillOpacity={0.75} fontSize={11.5} textAnchor="end">{xLabel}</text>
      <text x={L - 4} y={T - 2} fill="white" fillOpacity={0.75} fontSize={11.5} textAnchor="start">{yLabel}</text>
      {refK != null && <line x1={X(0)} y1={Y(0)} x2={X(xMax)} y2={Y(refK * xMax)} stroke="white" strokeOpacity={0.35} strokeDasharray="4 4" />}
      {line != null && <line x1={X(0)} y1={Y(0)} x2={X(Math.min(xMax, yMax / line))} y2={Y(Math.min(yMax, line * xMax))} stroke="#35c7b3" strokeWidth={2.2} />}
      {path && <path d={path} fill="none" stroke="#35c7b3" strokeWidth={2.2} />}
      {fnPath && <path d={fnPath} fill="none" stroke="#35c7b3" strokeWidth={2.2} />}
      {now && <circle cx={X(now.x)} cy={Y(now.y)} r={5} fill="none" stroke="#ffe9a8" strokeWidth={1.6} />}
      {pts.map((p, i) => <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={4.2} fill="#ffffff" />)}
    </svg>
  )
}

/** 数据表：head 是表头，rows 每行几格；hl 高亮最后记的那一行 */
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

/** 两个大读数并排：电压表、电流表 */
export function Readout({ u, i, dim }: { u: string; i: string; dim?: boolean }) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 text-center transition-opacity', dim && 'opacity-50')}>
      <div><div className="text-[12.5px] text-white/55">电压表</div><div className="mt-0.5 text-[36px] leading-none font-bold tracking-tight tabular-nums">{u}<span className="ml-1 text-[14px] font-medium text-white/55">V</span></div></div>
      <div><div className="text-[12.5px] text-white/55">电流表</div><div className="mt-0.5 text-[36px] leading-none font-bold tracking-tight tabular-nums">{i}<span className="ml-1 text-[14px] font-medium text-white/55">A</span></div></div>
    </div>
  )
}
