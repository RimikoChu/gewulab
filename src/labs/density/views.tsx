// 面板里的几张放大的小图：分度盘和标尺的特写、量筒液面的特写。读数在三维画面里太小，放大了才读得清。
// 图里的位置都从计算核心取数，这里只管画。
import { CYL, RIDER, columnCm, pointerSays, sightReading } from './physics'

/** 天平的特写：上面是分度盘和指针（t：−1 到 1，正数偏左），下面是标尺和游码（读游码左边缘对着的刻度） */
export function BalanceView({ t, rider }: { t: number; rider: number }) {
  const W = 250, x0 = 22, per = 41, n = Math.round(RIDER.max / RIDER.step), xr = x0 + rider * per
  return (
    <svg viewBox={`0 0 ${W} 132`} className="mt-2 w-full rounded-lg" role="img" aria-label={`指针${pointerSays(t)}，游码示数 ${rider.toFixed(1)} 克`}>
      <rect width={W} height={132} fill="#182026" />
      {/* 分度盘 */}
      <rect x={36} y={8} width={110} height={46} rx={4} fill="#ebe9df" />
      {Array.from({ length: 11 }, (_, i) => i - 5).map(k => { const a = k * 0.085, r1 = k === 0 ? 96 : 88; return <line key={k} x1={91 + Math.sin(a) * 74} y1={112 - Math.cos(a) * 74} x2={91 + Math.sin(a) * r1} y2={112 - Math.cos(a) * r1} stroke={k === 0 ? '#c0392b' : '#1b2026'} strokeWidth={k === 0 ? 2.2 : 1.3} /> })}
      <g style={{ transform: `rotate(${-t * 21}deg)`, transformOrigin: '91px 112px', transition: 'transform 1.5s cubic-bezier(0.3, 1.6, 0.5, 1)' }}><line x1={91} y1={62} x2={91} y2={16} stroke="#22272b" strokeWidth={2.4} strokeLinecap="round" /><line x1={91} y1={24} x2={91} y2={16} stroke="#d2362f" strokeWidth={2.4} strokeLinecap="round" /></g>
      <text x={156} y={36} fill="#cfd9df" fontSize={11.5}>{pointerSays(t)}</text>
      {/* 标尺和游码 */}
      <rect x={8} y={70} width={W - 16} height={50} rx={3} fill="#e9e7dc" />
      {Array.from({ length: n + 1 }, (_, i) => { const x = x0 + i * RIDER.step * per, big = i % 5 === 0; return <g key={i}><line x1={x} y1={70} x2={x} y2={big ? 92 : 82} stroke="#1b2026" strokeWidth={big ? 1.6 : 0.9} />{big && <text x={x} y={112} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1b2026">{Math.round(i * RIDER.step)}</text>}</g> })}
      <text x={W - 14} y={112} textAnchor="end" fontSize={11} fill="#1b2026">g</text>
      <rect x={xr} y={64} width={13} height={34} rx={1.5} fill="#c9a23e" stroke="#7a5f1c" strokeWidth={0.8} opacity={0.92} />
      <line x1={xr} y1={62} x2={xr} y2={100} stroke="#d2362f" strokeWidth={1.8} />
    </svg>
  )
}

/**
 * 量筒液面的特写（从侧面看的剖面）：V 是真实的体积，deg 是视线的倾角（俯视为正）。
 * 视线对准凹液面的最低处，延长到近处的筒壁，落在哪条刻线上就读成多少。
 */
export function CylView({ V, deg, color = '#78b6de' }: { V: number; deg: number; color?: string }) {
  const W = 250, H = 170, xl = 96, xr = 206, cx = (xl + xr) / 2, per = (cx - xl) * columnCm(1, CYL.r) / CYL.r, yL = 92
  const y = (v: number) => yL - (v - V) * per, seen = sightReading(V, deg), ys = y(seen), slope = (ys - yL) / (xl - cx), ex = 20, ey = yL + slope * (ex - cx)
  const lo = Math.max(0, Math.ceil(V - 16)), hi = Math.min(CYL.max, Math.floor(V + 16))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label={`量筒读数约 ${seen.toFixed(0)} 毫升`}>
      <rect width={W} height={H} fill="#182026" />
      <path d={`M${xl} ${yL - 6} Q ${cx} ${yL + 6} ${xr} ${yL - 6} L ${xr} ${H} L ${xl} ${H} Z`} fill={color} opacity={0.55} />
      <path d={`M${xl} ${yL - 6} Q ${cx} ${yL + 6} ${xr} ${yL - 6}`} fill="none" stroke="#e8f6ff" strokeWidth={1.6} />
      <rect x={xl - 5} y={0} width={5} height={H} fill="#cfe6ee" opacity={0.5} /><rect x={xr} y={0} width={5} height={H} fill="#cfe6ee" opacity={0.5} />
      {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map(v => { const ten = v % 10 === 0, five = v % 5 === 0; return <g key={v}><line x1={xl} y1={y(v)} x2={xl + (ten ? 30 : five ? 21 : 13)} y2={y(v)} stroke="#f2f6f8" strokeWidth={ten ? 1.8 : 1} />{ten && <text x={xl + 35} y={y(v) + 5} fontSize={14} fontWeight={700} fill="#f2f6f8">{v}</text>}</g> })}
      {/* 视线：从眼睛到凹液面最低处 */}
      <line x1={ex} y1={ey} x2={cx} y2={yL} stroke="#ffd24a" strokeWidth={1.6} strokeDasharray={deg === 0 ? undefined : '5 4'} />
      <circle cx={cx} cy={yL} r={3} fill="#ffd24a" />
      <circle cx={ex} cy={ey} r={9} fill="#f1ebe4" /><circle cx={ex + 4} cy={ey + slope * 4} r={4} fill="#14181c" />
      <circle cx={xl} cy={ys} r={4.5} fill="none" stroke="#ff7a59" strokeWidth={2} />
      <text x={xl - 10} y={Math.max(14, Math.min(H - 6, ys + (deg > 0 ? 21 : -10)))} textAnchor="end" fontSize={12.5} fontWeight={700} fill="#ff9f84">{deg === 0 ? `${seen.toFixed(0)} mL` : `约 ${seen.toFixed(0)} mL`}</text>
    </svg>
  )
}
