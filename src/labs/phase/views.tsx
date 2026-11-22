// 面板里的几张小图：温度计的特写、温度–时间图线、沸腾前后的气泡、固液气三态和六种变化的总图。
// 读数在三维画面里太小，放大了才读得清。图里的位置都从计算核心取数，这里只管画。
import { CHANGES, CHANGE_KEYS, THERMO, readT, type Change, type Phase } from './physics'

/** 温度计的特写：只画示数上下各 9 ℃ 的一段，刻度跟着液柱走。每 1 ℃ 一道短线，每 10 ℃ 一道长线加数字 */
export function ThermoView({ T, note }: { T: number; note?: string }) {
  const W = 250, H = 168, per = 8.4, cy = 84, x0 = 54
  const y = (v: number) => cy - (v - T) * per
  const lo = Math.max(THERMO.min, Math.ceil(T - 10)), hi = Math.min(THERMO.max, Math.floor(T + 10))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label={`温度计示数 ${readT(T)} 摄氏度`}>
      <rect width={W} height={H} fill="#182026" />
      <rect x={x0 - 8} y={0} width={88} height={H} fill="#cfe6ee" opacity={0.16} />
      <rect x={x0 + 4} y={0} width={22} height={H} fill="#f1eee2" />
      <rect x={x0 + 11} y={0} width={8} height={H} fill="#d9d5c6" />
      <rect x={x0 + 11} y={Math.max(0, y(T))} width={8} height={H} fill="#e2332a" />
      {Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i).map(v => { const ten = v % 10 === 0, five = v % 5 === 0; return <g key={v}><line x1={x0 + 30} y1={y(v)} x2={x0 + (ten ? 62 : five ? 52 : 44)} y2={y(v)} stroke="#f2f6f8" strokeWidth={ten ? 2 : 1} />{ten && <text x={x0 - 14} y={y(v) + 5} textAnchor="end" fontSize={15} fontWeight={700} fill="#f2f6f8">{v}</text>}</g> })}
      <line x1={x0 - 4} y1={cy} x2={W - 96} y2={cy} stroke="#ffd24a" strokeWidth={1.4} strokeDasharray="5 4" />
      <text x={W - 12} y={cy - 4} textAnchor="end" fontSize={30} fontWeight={700} fill="#ffffff">{readT(T)}<tspan fontSize={15} fill="#9fb0bb"> ℃</tspan></text>
      <text x={W - 12} y={cy + 20} textAnchor="end" fontSize={11.5} fill="#9fb0bb">{note ?? '视线和液柱的顶相平'}</text>
    </svg>
  )
}

export interface Series { name: string; color: string; pts: [number, number][]; live?: boolean }
/** 温度–时间图：横轴是分钟，纵轴是温度。每条线由一个个记下的点连成；mark 是要标出来的一条水平线（熔点、沸点） */
export function TChart({ tmax, lo, hi, step, series, mark }: { tmax: number; lo: number; hi: number; step: number; series: Series[]; mark?: { T: number; text: string } }) {
  const W = 250, H = 176, x0 = 34, y0 = 148, x1 = W - 12, y1 = 14
  const X = (t: number) => x0 + t / tmax * (x1 - x0), Y = (T: number) => y0 - (T - lo) / (hi - lo) * (y0 - y1)
  const ys = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label="温度随时间变化的图线">
      <rect width={W} height={H} fill="#182026" />
      {ys.map(T => <g key={T}><line x1={x0} y1={Y(T)} x2={x1} y2={Y(T)} stroke="#ffffff" strokeOpacity={0.08} /><text x={x0 - 5} y={Y(T) + 4} textAnchor="end" fontSize={10} fill="#9fb0bb">{T}</text></g>)}
      {Array.from({ length: Math.floor(tmax / 2) + 1 }, (_, i) => i * 2).map(t => <g key={t}><line x1={X(t)} y1={y0} x2={X(t)} y2={y1} stroke="#ffffff" strokeOpacity={0.06} /><text x={X(t)} y={y0 + 13} textAnchor="middle" fontSize={10} fill="#9fb0bb">{t}</text></g>)}
      <path d={`M${x0} ${y1 - 6} V${y0} H${x1 + 4}`} fill="none" stroke="#9fb0bb" strokeWidth={1.2} />
      <text x={x0 + 6} y={y1 - 1} fontSize={10.5} fill="#cfd9df">温度 / ℃</text><text x={x1 + 4} y={y0 - 5} textAnchor="end" fontSize={10.5} fill="#cfd9df">时间 / min</text>
      {mark && <g><line x1={x0} y1={Y(mark.T)} x2={x1} y2={Y(mark.T)} stroke="#ffd24a" strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.8} /><text x={x1 - 2} y={Y(mark.T) - 5} textAnchor="end" fontSize={10.5} fill="#ffd24a">{mark.text}</text></g>}
      {series.map(s => <g key={s.name}>
        {s.pts.length > 1 && <polyline points={s.pts.map(([t, T]) => `${X(t)},${Y(T)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={1.6} strokeOpacity={s.live ? 0.9 : 0.55} />}
        {s.pts.map(([t, T], i) => <circle key={t} className={s.live && i === s.pts.length - 1 ? 'row-in' : undefined} cx={X(t)} cy={Y(T)} r={s.live ? 3.4 : 2.4} fill={s.color} stroke="#182026" strokeWidth={1} opacity={s.live ? 1 : 0.7} />)}
      </g>)}
      <g>{series.filter(s => s.pts.length).map((s, i) => <g key={s.name} transform={`translate(${x0 + 10 + i * 68}, ${H - 6})`}><circle cx={0} cy={-3.5} r={3.4} fill={s.color} /><text x={7} y={0} fontSize={10.5} fill="#cfd9df">{s.name}</text></g>)}</g>
    </svg>
  )
}

/** 沸腾前后气泡的样子：左边沸腾前（越升越小），右边沸腾时（越升越大）。now 是现在是哪一种 */
export function BubbleView({ now }: { now: 'none' | 'before' | 'boil' }) {
  const col = (k: 'before' | 'boil') => now === k ? '#ffffff' : '#7e8f9a'
  const cup = (x: number, k: 'before' | 'boil') => <g>
    <rect x={x} y={26} width={86} height={84} rx={4} fill="#3b8fcf" opacity={now === k ? 0.5 : 0.22} />
    <path d={`M${x} 12 V110 H${x + 86} V12`} fill="none" stroke="#cfe6ee" strokeOpacity={0.6} strokeWidth={1.5} />
    {[0, 1, 2, 3].map(i => { const r = k === 'before' ? 7.5 - i * 2 : 2.5 + i * 2.6; return <circle key={i} cx={x + 43 + (i % 2 ? 9 : -8)} cy={98 - i * 21} r={r} fill="none" stroke={col(k)} strokeWidth={1.5} /> })}
    <text x={x + 43} y={128} textAnchor="middle" fontSize={12} fontWeight={now === k ? 700 : 400} fill={col(k)}>{k === 'before' ? '沸腾前：越升越小' : '沸腾时：越升越大'}</text>
  </g>
  return <svg viewBox="0 0 250 138" className="mt-2 w-full rounded-lg" role="img" aria-label="沸腾前和沸腾时气泡的变化"><rect width={250} height={138} fill="#182026" />{cup(22, 'before')}{cup(142, 'boil')}</svg>
}

const NODE: Record<Phase, [number, number]> = { 固态: [46, 146], 液态: [204, 146], 气态: [125, 34] }
/** 固、液、气三态和它们之间的六种变化。shown：已经认出来的那几种才画出来；吸热的用暖色，放热的用冷色 */
export function Triangle({ shown, hot }: { shown: Change[]; hot?: Change | null }) {
  return (
    <svg viewBox="0 0 250 186" className="mt-2 w-full rounded-lg" role="img" aria-label="固态、液态、气态之间的六种物态变化">
      <rect width={250} height={186} fill="#182026" />
      <defs>{['#ff9a6a', '#7fb8ff'].map((c, i) => <marker key={c} id={`ph-arrow-${i}`} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={c} /></marker>)}</defs>
      {CHANGE_KEYS.map(k => {
        const ch = CHANGES[k], a = NODE[ch.from], b = NODE[ch.to], warm = ch.heat === '吸热', on = shown.includes(k)
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l * 7, ny = dx / l * 7, color = warm ? '#ff9a6a' : '#7fb8ff'
        const p = (q: number) => [a[0] + dx * q + nx, a[1] + dy * q + ny], [x1, y1] = p(0.26), [x2, y2] = p(0.74), [tx, ty] = [a[0] + dx * 0.5 + nx * 3.1, a[1] + dy * 0.5 + ny * 3.1]
        return <g key={k} opacity={on ? 1 : 0.16}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? color : '#9fb0bb'} strokeWidth={k === hot ? 3 : 1.8} markerEnd={on ? `url(#ph-arrow-${warm ? 0 : 1})` : undefined} />
          {on && <text x={tx} y={ty + 4} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={color}>{ch.name}<tspan fontSize={9.5} fontWeight={400}> {ch.heat}</tspan></text>}
        </g>
      })}
      {(Object.keys(NODE) as Phase[]).map(n => <g key={n}><circle cx={NODE[n][0]} cy={NODE[n][1]} r={21} fill="#243038" stroke="#cfd9df" strokeWidth={1.2} /><text x={NODE[n][0]} y={NODE[n][1] + 5} textAnchor="middle" fontSize={13.5} fontWeight={700} fill="#ffffff">{n}</text></g>)}
    </svg>
  )
}
