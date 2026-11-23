// 面板里的放大小图和数据表：杠杆尺的示意图（格数、钩码、力和力臂）、测力计刻度的特写、功的分配条、逐行记录的数据表。
// 图里的位置都按传进来的数画，这里不做物理计算。
import type { ReactNode } from 'react'
import { SCALE } from './gear'
import { RULER } from './physics'

const F1C = '#ffb547', F2C = '#5ec8ff'

/**
 * 杠杆尺的示意图：一根尺、正中的支点，两边各 6 格。left、right：挂在哪一格、几只钩码（没有就是 null）；
 * tilt：尺子此刻歪了多少度（左端下沉为正）；arms：杠杆水平平衡时画出两个力臂。pull：测力计拉在第几格、偏离竖直多少度（第 3 课）
 */
export function LeverView({ left, right, tilt, arms, pull, lc = F1C, rc = F2C }: { left: { n: number; at: number } | null; right: { n: number; at: number } | null; tilt: number; arms: boolean; pull?: { at: number; deg: number; F: number }; lc?: string; rc?: string }) {
  const W = 260, H = 150, cx = W / 2, cy = 52, per = 17, n = RULER.n
  const chain = (side: -1 | 1, h: { n: number; at: number }, color: string) => {
    const x = cx + side * h.at * per
    return <g key={side}>
      {Array.from({ length: h.n }, (_, i) => <rect key={i} x={x - 4} y={cy + 6 + i * 10} width={8} height={8} rx={1.5} fill="#c9a23e" stroke="#7a5f1c" strokeWidth={0.8} />)}
      <line x1={x} y1={cy} x2={x} y2={cy + 6} stroke="#cfd9df" strokeWidth={1} />
      <line x1={x + side * 9} y1={cy + 2} x2={x + side * 9} y2={cy + 2 + h.n * 9} stroke={color} strokeWidth={2.2} markerEnd={`url(#lv${color.slice(1)})`} />
    </g>
  }
  const th = pull ? pull.deg * Math.PI / 180 : 0, px = pull ? cx - pull.at * per : 0
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label="杠杆尺的示意图">
      <defs>{[F1C, F2C].map(c => <marker key={c} id={`lv${c.slice(1)}`} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={5} markerHeight={5} orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill={c} /></marker>)}</defs>
      <rect width={W} height={H} fill="#182026" />
      <g style={{ transform: `rotate(${-tilt}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'transform 0.6s ease-out' }}>
        <rect x={cx - (n + 0.7) * per} y={cy - 5} width={(2 * n + 1.4) * per} height={10} rx={2} fill="#d9dde0" />
        {Array.from({ length: 2 * n + 1 }, (_, i) => i - n).map(k => <g key={k}><circle cx={cx + k * per} cy={cy} r={k === 0 ? 2.6 : 1.8} fill="#182026" /><text x={cx + k * per} y={cy - 9} textAnchor="middle" fontSize={10} fontWeight={700} fill={k === 0 ? '#ff9f84' : '#cfd9df'}>{Math.abs(k)}</text></g>)}
        {left && chain(-1, left, lc)}{right && chain(1, right, rc)}
        {pull && <g><line x1={px} y1={cy} x2={px - Math.sin(th) * 52} y2={cy - Math.cos(th) * 52} stroke={F1C} strokeWidth={2.2} markerEnd={`url(#lv${F1C.slice(1)})`} />
          {th > 0 && <line x1={px + Math.sin(th) * 60} y1={cy + Math.cos(th) * 60} x2={px} y2={cy} stroke={F1C} strokeWidth={1} strokeDasharray="3 3" />}</g>}
      </g>
      <path d={`M${cx} ${cy} l-7 13 h14z`} fill="#8d99a3" />
      {/* 力臂：杠杆水平平衡时，画在尺子下面 */}
      {arms && left && <Dim x1={cx - left.at * per} x2={cx} y={H - 30} color={lc} text={`${Math.round(left.at * RULER.grid * 1000) / 10} cm`} />}
      {arms && right && <Dim x1={cx} x2={cx + right.at * per} y={H - 30} color={rc} text={`${Math.round(right.at * RULER.grid * 1000) / 10} cm`} />}
      {arms && pull && (() => { const L = pull.at * per * Math.cos(th), fx = cx - L * Math.cos(th), fy = cy + L * Math.sin(th); return <g><line x1={cx} y1={cy} x2={fx} y2={fy} stroke={F1C} strokeWidth={1.8} /><text x={fx - 6} y={fy + 14} textAnchor="end" fontSize={11.5} fontWeight={700} fill={F1C}>{`${(pull.at * RULER.grid * 100 * Math.cos(th)).toFixed(1)} cm`}</text></g> })()}
    </svg>
  )
}
function Dim({ x1, x2, y, color, text }: { x1: number; x2: number; y: number; color: string; text: string }) {
  return <g>
    <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={1.6} />
    <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} stroke={color} strokeWidth={1.6} /><line x1={x2} y1={y - 5} x2={x2} y2={y + 5} stroke={color} strokeWidth={1.6} />
    <text x={(x1 + x2) / 2} y={y + 17} textAnchor="middle" fontSize={12} fontWeight={700} fill={color}>{text}</text>
  </g>
}

/** 测力计刻度的特写：把刻度板横过来放大，红线是指针。F 是现在的示数（N） */
export function ScaleView({ F, max = SCALE.max }: { F: number; max?: number }) {
  const W = 260, x0 = 18, per = (W - 36) / max, n = Math.round(max / SCALE.step), x = x0 + Math.max(0, Math.min(max + 0.1, F)) * per
  return (
    <svg viewBox={`0 0 ${W} 74`} className="mt-2 w-full rounded-lg" role="img" aria-label={`测力计的示数 ${F.toFixed(2)} 牛`}>
      <rect width={W} height={74} fill="#182026" /><rect x={6} y={8} width={W - 12} height={58} rx={4} fill="#f1ecdd" />
      {Array.from({ length: n + 1 }, (_, i) => { const tx = x0 + i * SCALE.step * per, big = i % 10 === 0, mid = i % 5 === 0; return <g key={i}><line x1={tx} y1={8} x2={tx} y2={big ? 30 : mid ? 25 : 19} stroke="#1b2026" strokeWidth={big ? 1.6 : 0.8} />{big && <text x={tx} y={48} textAnchor="middle" fontSize={15} fontWeight={700} fill="#1b2026">{Math.round(i * SCALE.step)}</text>}</g> })}
      <text x={W - 14} y={61} textAnchor="end" fontSize={11} fill="#1b2026">N</text>
      <line x1={x} y1={4} x2={x} y2={70} stroke="#d2362f" strokeWidth={2.2} />
    </svg>
  )
}

/** 一张数据表：head 是表头，rows 是已经记下的行，空着的行用 — 占位。hi：刚记下的那一行高亮 */
export function Table({ head, rows, total, hi }: { head: ReactNode[]; rows: ReactNode[][]; total: number; hi?: number }) {
  return (
    <table className="mt-2 w-full text-center text-[13px] tabular-nums">
      <thead><tr className="text-white/55">{head.map((h, i) => <th key={i} className="px-1 pb-1 font-medium">{h}</th>)}</tr></thead>
      <tbody>{Array.from({ length: total }, (_, i) => <tr key={i} className={i === hi ? 'row-in bg-white/10' : 'bg-white/[0.04]'}>{head.map((_, j) => <td key={j} className={`px-1 py-1.5 ${j === 0 ? 'rounded-l-lg text-white/60' : ''} ${j === head.length - 1 ? 'rounded-r-lg font-semibold' : ''}`}>{rows[i]?.[j] ?? '—'}</td>)}</tr>)}</tbody>
    </table>
  )
}

/** 功的分配：一条横条，有用功一段、额外功一段，总功是整条。max 是满格对应多少焦 */
export function WorkBar({ useful, extra, max }: { useful: number; extra: number; max: number }) {
  const W = 260, x0 = 8, full = W - 16, wu = useful / max * full, wx = extra / max * full
  return (
    <svg viewBox={`0 0 ${W} 40`} className="mt-2 w-full rounded-lg" role="img" aria-label={`有用功 ${useful.toFixed(2)} 焦，额外功 ${extra.toFixed(2)} 焦`}>
      <rect width={W} height={40} fill="#182026" />
      <rect x={x0} y={8} width={wu} height={16} rx={3} fill="#7fe3d4" style={{ transition: 'width 0.6s' }} />
      <rect x={x0 + wu} y={8} width={wx} height={16} rx={3} fill="#ff9f84" style={{ transition: 'all 0.6s' }} />
      <text x={x0} y={36} fontSize={10.5} fill="#7fe3d4">有用功</text><text x={W - 8} y={36} textAnchor="end" fontSize={10.5} fill="#ff9f84">额外功</text>
    </svg>
  )
}
