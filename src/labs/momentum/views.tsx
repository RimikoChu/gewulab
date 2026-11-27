// 面板里的几张小图和表：各物体的 m、v、p 和总动量、总动能的对照表；力和时间的图；动量的矢量三角形。
// 数都是传进来的，这里只管排版，不做物理计算（求和、乘法用计算核心里的函数）。
import { kinetic, momentum } from './physics'
import { COL } from './layout'

/** 一个数：null 画成短横线；接近 0 的负数不写成 −0 */
export const num = (v: number | null | undefined, d = 2) => v == null ? '—' : (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('-', '−')

export interface Body { name: string; color: string; m: number; v0: number | null; v1: number | null }
/**
 * 对照表：每个物体一行（质量、作用前后的速度和动量），底下两行是系统的总动量和总动能。
 * heads：两列的名字（默认“碰前”“碰后”）；ek：要不要总动能那一行；d、md、ed：动量、质量、动能各保留几位小数
 */
export function Ledger({ bodies, heads = ['碰前', '碰后'], ek = true, d = 2, md = 1, ed = 2 }: { bodies: Body[]; heads?: [string, string]; ek?: boolean; d?: number; md?: number; ed?: number }) {
  const sum = (f: (b: Body) => number | null) => bodies.reduce<number | null>((a, b) => { const x = f(b); return a == null || x == null ? null : a + x }, 0)
  const p0 = sum(b => b.v0 == null ? null : momentum(b.m, b.v0)), p1 = sum(b => b.v1 == null ? null : momentum(b.m, b.v1))
  const e0 = sum(b => b.v0 == null ? null : kinetic(b.m, b.v0)), e1 = sum(b => b.v1 == null ? null : kinetic(b.m, b.v1))
  const th = 'py-1 text-right font-normal', td = 'text-right tabular-nums'
  return (
    <table className="mt-2 w-full text-[13px]">
      <thead>
        <tr className="text-[11.5px] text-white/50"><th className="py-1 text-left font-normal" /><th className={th}>m / kg</th><th className={th} colSpan={2}>v / (m/s)</th><th className={th} colSpan={2}>p / (kg·m/s)</th></tr>
        <tr className="text-[11.5px] text-white/45"><th /><th /><th className={th}>{heads[0]}</th><th className={th}>{heads[1]}</th><th className={th}>{heads[0]}</th><th className={th}>{heads[1]}</th></tr>
      </thead>
      <tbody>
        {bodies.map(b => (
          <tr key={b.name} className="border-t border-white/12">
            <td className="py-1.5 text-white/85"><span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: b.color }} />{b.name}</td>
            <td className={td}>{b.m.toFixed(md)}</td><td className={td}>{num(b.v0)}</td><td className={td}>{num(b.v1)}</td>
            <td className={td} style={{ color: COL.p }}>{num(b.v0 == null ? null : momentum(b.m, b.v0), d)}</td><td className={td} style={{ color: COL.p }}>{num(b.v1 == null ? null : momentum(b.m, b.v1), d)}</td>
          </tr>
        ))}
        <tr className="border-t border-white/25 font-semibold"><td className="py-1.5" colSpan={4}>总动量 / (kg·m/s)</td><td className={td} style={{ color: COL.p }}>{num(p0, d)}</td><td className={td} style={{ color: COL.p }}>{num(p1, d)}</td></tr>
        {ek && <tr className="border-t border-white/12 font-semibold"><td className="py-1.5" colSpan={4}>总动能 / J</td><td className={td}>{num(e0, ed)}</td><td className={`${td} ${e0 != null && e1 != null && e1 < e0 - 1e-9 ? 'text-[#ff9a7a]' : ''}`}>{num(e1, ed)}</td></tr>}
      </tbody>
    </table>
  )
}

/** 力和时间的图：每次下落画成一个矩形（宽是作用时间，高是平均作用力），面积就是冲量。cur 是现在这一次 */
export function FtPlot({ bars, cur }: { bars: { key: string; name: string; dt: number; F: number; color: string }[]; cur?: string }) {
  const W = 250, H = 170, x0 = 34, y0 = 142, tm = 0.06, fm = 80, X = (t: number) => x0 + t / tm * (W - x0 - 12), Y = (f: number) => y0 - f / fm * (y0 - 14)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label="力和作用时间的图">
      <rect width={W} height={H} fill="#182026" />
      {[0, 20, 40, 60, 80].map(f => <g key={f}><line x1={x0} y1={Y(f)} x2={W - 12} y2={Y(f)} stroke="#ffffff" strokeOpacity={f ? 0.08 : 0.4} /><text x={x0 - 5} y={Y(f) + 4} textAnchor="end" fontSize={10} fill="#ffffff" fillOpacity={0.55}>{f}</text></g>)}
      {[0, 0.02, 0.04, 0.06].map(t => <text key={t} x={X(t)} y={y0 + 13} textAnchor="middle" fontSize={10} fill="#ffffff" fillOpacity={0.55}>{t}</text>)}
      <line x1={x0} y1={12} x2={x0} y2={y0} stroke="#ffffff" strokeOpacity={0.4} />
      <text x={6} y={12} fontSize={10} fill="#ffffff" fillOpacity={0.6}>F / N</text><text x={W - 10} y={y0 + 24} textAnchor="end" fontSize={10} fill="#ffffff" fillOpacity={0.6}>t / s</text>
      {bars.map(b => <g key={b.key}>
        <rect x={X(0)} y={Y(b.F)} width={Math.max(2.2, X(b.dt) - X(0))} height={y0 - Y(b.F)} fill={b.color} fillOpacity={b.key === cur ? 0.6 : 0.28} stroke={b.color} strokeWidth={b.key === cur ? 1.6 : 0.8} />
        <text x={Math.max(X(b.dt), X(0) + 4) + 3} y={Math.min(y0 - 4, Y(b.F) + 10)} fontSize={10} fill={b.color}>{b.name}</text>
      </g>)}
    </svg>
  )
}

/** 动量的矢量图：从同一点画出碰前的动量（黄）和碰后两个物体的动量（红、蓝），再用虚线把碰后两个首尾相接。单位任意，max 是最长能画多长 */
export function VecPlot({ p0, pa, pb, max }: { p0: [number, number]; pa: [number, number] | null; pb: [number, number] | null; max: number }) {
  const W = 250, H = 196, ox = 36, oy = 98, k = (W - ox - 34) / max
  const tip = (v: [number, number]) => [ox + v[0] * k, oy - v[1] * k]
  const arrow = (from: number[], v: [number, number], color: string, dash = false) => {
    const to = [from[0] + v[0] * k, from[1] - v[1] * k], len = Math.hypot(to[0] - from[0], to[1] - from[1]); if (len < 2) return null
    const ux = (to[0] - from[0]) / len, uy = (to[1] - from[1]) / len
    return <g><line x1={from[0]} y1={from[1]} x2={to[0] - ux * 6} y2={to[1] - uy * 6} stroke={color} strokeWidth={dash ? 1.6 : 2.6} strokeDasharray={dash ? '4 3' : undefined} /><polygon points={`${to[0]},${to[1]} ${to[0] - ux * 9 - uy * 4},${to[1] - uy * 9 + ux * 4} ${to[0] - ux * 9 + uy * 4},${to[1] - uy * 9 - ux * 4}`} fill={color} /></g>
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label="动量的矢量图">
      <rect width={W} height={H} fill="#182026" />
      {arrow([ox, oy], p0, COL.p)}
      {pa && arrow([ox, oy], pa, COL.A)}{pb && arrow([ox, oy], pb, COL.B)}
      {pa && pb && arrow(tip(pb), pa, COL.A, true)}
      <circle cx={ox} cy={oy} r={3} fill="#ffffff" />
      <text x={ox + p0[0] * k - 4} y={oy + 16} textAnchor="end" fontSize={10.5} fill={COL.p}>碰前的总动量</text>
    </svg>
  )
}
