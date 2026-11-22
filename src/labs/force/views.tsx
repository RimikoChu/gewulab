// 面板里的几张小图：测力计刻度的特写、过原点的图线、比长短的横条、力的示意图。位置都按传进来的数画，这里不做物理计算。
import { SCALE } from './physics'

/** 测力计刻度的特写：把刻度板横过来放大，红线是指针。F 是现在的示数（N） */
export function ScaleView({ F }: { F: number }) {
  const W = 250, x0 = 16, per = (W - 32) / SCALE.max, n = Math.round(SCALE.max / SCALE.step), x = x0 + Math.max(0, Math.min(SCALE.max + 0.15, F)) * per
  return (
    <svg viewBox={`0 0 ${W} 74`} className="mt-2 w-full rounded-lg" role="img" aria-label={`测力计的示数 ${F.toFixed(2)} 牛`}>
      <rect width={W} height={74} fill="#182026" /><rect x={6} y={8} width={W - 12} height={58} rx={4} fill="#f3efe2" />
      {Array.from({ length: n + 1 }, (_, i) => { const tx = x0 + i * SCALE.step * per, big = i % 10 === 0, mid = i % 5 === 0; return <g key={i}><line x1={tx} y1={8} x2={tx} y2={big ? 30 : mid ? 25 : 19} stroke="#1b2026" strokeWidth={big ? 1.6 : 0.8} />{big && <text x={tx} y={48} textAnchor="middle" fontSize={15} fontWeight={700} fill="#1b2026">{Math.round(i * SCALE.step)}</text>}</g> })}
      <text x={W - 14} y={61} textAnchor="end" fontSize={11} fill="#1b2026">N</text>
      <line x1={x} y1={4} x2={x} y2={70} stroke="#d2362f" strokeWidth={2.2} style={{ transition: 'all 0.35s ease-out' }} />
    </svg>
  )
}

/** 过原点的图线：横轴最大 xm、纵轴最大 ym，pts 是记下来的点；两个点以上就连成过原点的直线 */
export function Plot({ pts, xm, ym, xt, yt, xl, yl, label }: { pts: { x: number; y: number }[]; xm: number; ym: number; xt: number[]; yt: number[]; xl: string; yl: string; label: string }) {
  const W = 250, H = 170, x0 = 36, y0 = 142, X = (v: number) => x0 + v / xm * (W - x0 - 14), Y = (v: number) => y0 - v / ym * (y0 - 16)
  const far = pts.reduce((a, p) => p.x > a.x ? p : a, { x: 0, y: 0 })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label={label}>
      <rect width={W} height={H} fill="#182026" />
      {yt.map(v => <g key={v}><line x1={x0} y1={Y(v)} x2={W - 12} y2={Y(v)} stroke="#ffffff" strokeOpacity={0.08} /><text x={x0 - 5} y={Y(v) + 4} textAnchor="end" fontSize={10} fill="#9fb0bb">{v}</text></g>)}
      {xt.map(v => <g key={v}><line x1={X(v)} y1={y0} x2={X(v)} y2={14} stroke="#ffffff" strokeOpacity={0.08} /><text x={X(v)} y={y0 + 13} textAnchor="middle" fontSize={10} fill="#9fb0bb">{v}</text></g>)}
      <path d={`M${x0} 10 V${y0} H${W - 8}`} fill="none" stroke="#9fb0bb" strokeWidth={1.2} />
      <text x={x0 - 4} y={y0 + 13} textAnchor="end" fontSize={10} fill="#9fb0bb">0</text>
      <text x={x0 + 6} y={13} fontSize={10.5} fill="#cfd9df">{yl}</text><text x={W - 8} y={y0 + 25} textAnchor="end" fontSize={10.5} fill="#cfd9df">{xl}</text>
      {pts.length >= 2 && <line x1={X(0)} y1={Y(0)} x2={X(far.x)} y2={Y(far.y)} stroke="#7fe3d4" strokeWidth={1.6} strokeOpacity={0.85} />}
      {pts.map(p => <circle key={p.x} cx={X(p.x)} cy={Y(p.y)} r={4} fill="#7fe3d4" stroke="#182026" strokeWidth={1.2} />)}
    </svg>
  )
}

/** 比长短的横条：每行一个名字、一个数；max 是满格对应的数。value 是 null 的画成一直伸出去的箭头 */
export function Bars({ rows, max, unit, label }: { rows: { name: string; value: number | null; text: string }[]; max: number; unit: string; label: string }) {
  const W = 250, rh = 30, x0 = 62, full = W - x0 - 14
  return (
    <svg viewBox={`0 0 ${W} ${rows.length * rh + 12}`} className="mt-2 w-full rounded-lg" role="img" aria-label={label}>
      <rect width={W} height={rows.length * rh + 12} fill="#182026" />
      {rows.map((r, i) => { const y = 8 + i * rh, w = r.value === null ? full : Math.max(2, r.value / max * (full - 34)); return <g key={r.name}>
        <text x={x0 - 8} y={y + 16} textAnchor="end" fontSize={12} fill="#cfd9df">{r.name}</text>
        <rect x={x0} y={y + 5} width={w} height={14} rx={3} fill={r.value === null ? '#ffd24a' : '#7fe3d4'} opacity={0.9} />
        {r.value === null ? <path d={`M${x0 + full} ${y + 1} l12 11 l-12 11z`} fill="#ffd24a" /> : <text x={x0 + w + 6} y={y + 16} fontSize={11.5} fontWeight={700} fill="#e8f1f5">{r.text}{r.value ? ` ${unit}` : ''}</text>}
        {r.value === null && <text x={x0 + 8} y={y + 16} fontSize={11} fontWeight={700} fill="#3a2c00">{r.text}</text>}
      </g> })}
    </svg>
  )
}

/**
 * 力的示意图：一个受力物体（圆或方块），从作用点画出带箭头的线段，线段的长短表示力的大小。
 * forces 里每个力：从哪一点画出（−1 到 1，物体的左右、上下）、朝哪边、多大、叫什么、什么颜色；max 是最长的箭头对应多大的力
 */
export interface Arrow { at: [number, number]; dir: [number, number]; F: number; name: string; color: string }
export function Diagram({ round = false, forces, max, label }: { round?: boolean; forces: Arrow[]; max: number; label: string }) {
  const W = 250, H = 120, cx = W / 2, cy = H / 2 + 4, bw = round ? 22 : 30, bh = round ? 22 : 16, L = 78
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label={label}>
      <defs>{forces.map((f, i) => <marker key={i} id={`fa${i}${f.color.slice(1)}`} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill={f.color} /></marker>)}</defs>
      <rect width={W} height={H} fill="#182026" />
      {round ? <circle cx={cx} cy={cy} r={bw} fill="#3a4650" stroke="#9fb0bb" strokeWidth={1.2} /> : <rect x={cx - bw} y={cy - bh} width={bw * 2} height={bh * 2} rx={3} fill="#3a4650" stroke="#9fb0bb" strokeWidth={1.2} />}
      {forces.filter(f => f.F > 0).map((f, i) => { const x = cx + f.at[0] * bw, y = cy - f.at[1] * bh, len = Math.max(10, f.F / max * L), x2 = x + f.dir[0] * len, y2 = y - f.dir[1] * len
        return <g key={i}><line x1={x} y1={y} x2={x2} y2={y2} stroke={f.color} strokeWidth={2.4} markerEnd={`url(#fa${i}${f.color.slice(1)})`} /><circle cx={x} cy={y} r={3} fill={f.color} />
          <text x={x2 + f.dir[0] * 6 + (f.dir[0] === 0 ? 8 : 0)} y={y2 - f.dir[1] * 6 + (f.dir[1] === 0 ? -7 : 4)} textAnchor={f.dir[0] < 0 ? 'end' : f.dir[0] > 0 ? 'start' : 'start'} fontSize={12} fontWeight={700} fill={f.color}>{f.name}</text></g> })}
    </svg>
  )
}
