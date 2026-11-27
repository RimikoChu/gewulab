// 面板里的小图：共振曲线。数都是传进来的，这里只管画。
/** 共振曲线：横轴驱动频率，纵轴浮标振幅。pts 是已经测到的点；curve 给了就把整条曲线画出来；f0 给了就在固有频率处画一条虚线 */
export function ResonancePlot({ pts, curve, f0, cur }: { pts: { f: number; a: number }[]; curve?: (f: number) => number; f0?: number | null; cur?: number }) {
  const W = 250, H = 170, x0 = 34, y0 = 142, fm = 1.25, am = 0.6, X = (f: number) => x0 + (f / fm) * (W - x0 - 12), Y = (a: number) => y0 - (a / am) * (y0 - 14)
  const path = curve ? Array.from({ length: 101 }, (_, i) => { const f = 0.05 + (i / 100) * (fm - 0.05); return `${i ? 'L' : 'M'}${X(f).toFixed(1)},${Y(Math.min(am, curve(f))).toFixed(1)}` }).join(' ') : ''
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label="浮标振幅和涌浪频率的关系">
      <rect width={W} height={H} fill="#182026" />
      {[0, 0.2, 0.4, 0.6].map(a => <g key={a}><line x1={x0} y1={Y(a)} x2={W - 12} y2={Y(a)} stroke="#ffffff" strokeOpacity={a ? 0.08 : 0.4} /><text x={x0 - 5} y={Y(a) + 4} textAnchor="end" fontSize={10} fill="#ffffff" fillOpacity={0.55}>{a.toFixed(1)}</text></g>)}
      {[0, 0.25, 0.5, 0.75, 1].map(f => <text key={f} x={X(f)} y={y0 + 13} textAnchor="middle" fontSize={10} fill="#ffffff" fillOpacity={0.55}>{f}</text>)}
      <line x1={x0} y1={12} x2={x0} y2={y0} stroke="#ffffff" strokeOpacity={0.4} />
      <text x={6} y={12} fontSize={10} fill="#ffffff" fillOpacity={0.6}>浮标振幅 / m</text><text x={W - 10} y={y0 + 24} textAnchor="end" fontSize={10} fill="#ffffff" fillOpacity={0.6}>涌浪频率 / Hz</text>
      {f0 != null && <g><line x1={X(f0)} y1={14} x2={X(f0)} y2={y0} stroke="#ffe17a" strokeOpacity={0.7} strokeDasharray="4 3" /><text x={X(f0) + 4} y={24} fontSize={10} fill="#ffe17a">固有频率</text></g>}
      {path && <path d={path} fill="none" stroke="#7fe3d4" strokeWidth={1.6} strokeOpacity={0.8} />}
      {pts.map(p => <circle key={p.f} cx={X(p.f)} cy={Y(p.a)} r={p.f === cur ? 5 : 4} fill="#7fe3d4" stroke="#0f1418" strokeWidth={1.2} />)}
    </svg>
  )
}
