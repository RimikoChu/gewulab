// 面板里的几张小图：分子的放大图、温度–时间图、四个冲程的示意、能量流向图、四缸机的点火顺序。
// 图里的数和位置都从计算核心取，这里只管画。
import { useEffect, useRef } from 'react'
import { FLOW, ORDER, STROKES, STROKE_INFO, cylAngle, strokeOf, travel, type Stroke } from './physics'

const BG = '#182026'

/** 分子的放大图：一群小球无规则地乱跑，speed 越大跑得越快；ink 是红墨水分子占的比例（0 没有） */
export function MolView({ speed, ink = 0, label }: { speed: number; ink?: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null), live = useRef({ speed, ink }); live.current = { speed, ink }
  useEffect(() => {
    const c = ref.current; if (!c) return
    const g = c.getContext('2d')!, W = c.width, H = c.height, N = 46
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
    const p = Array.from({ length: N }, (_, i) => ({ x: rnd() * W, y: rnd() * H, vx: rnd() - 0.5, vy: rnd() - 0.5, red: i < 8 }))
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const v = live.current.speed * 95
      g.fillStyle = BG; g.fillRect(0, 0, W, H)
      for (const q of p) {
        // 每一步方向都随机地偏一点：无规则运动
        q.vx += (rnd() - 0.5) * 1.6; q.vy += (rnd() - 0.5) * 1.6
        const l = Math.hypot(q.vx, q.vy) || 1; q.vx /= l; q.vy /= l
        q.x += q.vx * v * dt; q.y += q.vy * v * dt
        if (q.x < 7) { q.x = 7; q.vx = Math.abs(q.vx) } if (q.x > W - 7) { q.x = W - 7; q.vx = -Math.abs(q.vx) }
        if (q.y < 7) { q.y = 7; q.vy = Math.abs(q.vy) } if (q.y > H - 7) { q.y = H - 7; q.vy = -Math.abs(q.vy) }
        g.beginPath(); g.arc(q.x, q.y, 6, 0, 7)
        g.fillStyle = q.red && live.current.ink > 0 ? '#e5484d' : '#7fb8ff'; g.fill()
        g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; g.stroke()
        // 拖一道短尾巴：看得出往哪跑、跑多快
        g.strokeStyle = q.red && live.current.ink > 0 ? 'rgba(229,72,77,0.35)' : 'rgba(127,184,255,0.3)'; g.lineWidth = 3
        g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x - q.vx * v * 0.09, q.y - q.vy * v * 0.09); g.stroke()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div className="relative mt-2 overflow-hidden rounded-lg">
    <canvas ref={ref} width={500} height={260} className="block w-full" aria-label={`${label}里分子的运动`} />
    <span className="absolute top-2 left-2.5 rounded bg-black/40 px-1.5 py-0.5 text-[12px] text-white/85">{label} · 放大示意</span>
  </div>
}

export interface Series { name: string; color: string; pts: [number, number][]; live?: boolean }
/** 温度–时间图：横轴是分钟，纵轴是温度 */
export function TChart({ tmax, lo, hi, step, series }: { tmax: number; lo: number; hi: number; step: number; series: Series[] }) {
  const W = 250, H = 176, x0 = 34, y0 = 148, x1 = W - 12, y1 = 14
  const X = (t: number) => x0 + t / tmax * (x1 - x0), Y = (T: number) => y0 - (T - lo) / (hi - lo) * (y0 - y1)
  const ys = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label="温度随时间变化的图线">
      <rect width={W} height={H} fill={BG} />
      {ys.map(T => <g key={T}><line x1={x0} y1={Y(T)} x2={x1} y2={Y(T)} stroke="#fff" strokeOpacity={0.08} /><text x={x0 - 5} y={Y(T) + 4} textAnchor="end" fontSize={10} fill="#9fb0bb">{T}</text></g>)}
      {Array.from({ length: Math.floor(tmax / 2) + 1 }, (_, i) => i * 2).map(t => <g key={t}><line x1={X(t)} y1={y0} x2={X(t)} y2={y1} stroke="#fff" strokeOpacity={0.06} /><text x={X(t)} y={y0 + 13} textAnchor="middle" fontSize={10} fill="#9fb0bb">{t}</text></g>)}
      <path d={`M${x0} ${y1 - 6} V${y0} H${x1 + 4}`} fill="none" stroke="#9fb0bb" strokeWidth={1.2} />
      <text x={x0 + 6} y={y1 - 1} fontSize={10.5} fill="#cfd9df">温度 / ℃</text><text x={x1 + 4} y={y0 - 5} textAnchor="end" fontSize={10.5} fill="#cfd9df">时间 / min</text>
      {series.map(s => <g key={s.name}>
        {s.pts.length > 1 && <polyline points={s.pts.map(([t, T]) => `${X(t)},${Y(T)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={1.8} />}
        {s.pts.map(([t, T]) => <circle key={t} cx={X(t)} cy={Y(T)} r={3.2} fill={s.color} stroke={BG} strokeWidth={1} />)}
      </g>)}
      <g>{series.map((s, i) => <g key={s.name} transform={`translate(${x0 + 10 + i * 70}, ${y1 + 12})`}><circle cx={0} cy={-3.5} r={3.4} fill={s.color} /><text x={7} y={0} fontSize={10.5} fill="#cfd9df">{s.name}</text></g>)}</g>
    </svg>
  )
}

/** 一个缸的小剖面图：活塞的位置、两个气门开没开、缸里的气 */
function MiniCyl({ x, y, a, w = 46, on = true, title }: { x: number; y: number; a: number; w?: number; on?: boolean; title?: string }) {
  const st = strokeOf(a), i = STROKE_INFO[st], h = w * 1.3, top = y, pis = top + 12 + travel(a) * (h - 30)
  const gas = st === '吸气' ? '#6f9cff' : st === '压缩' ? '#e8a05c' : st === '做功' ? '#ffb347' : '#8a8078'
  const valve = (vx: number, open: boolean, col: string) => <g><line x1={vx} y1={top - 10} x2={vx} y2={top + (open ? 4 : 0)} stroke={col} strokeWidth={2} /><line x1={vx - 6} y1={top + (open ? 4 : 0)} x2={vx + 6} y2={top + (open ? 4 : 0)} stroke={col} strokeWidth={3} /></g>
  return <g opacity={on ? 1 : 0.35}>
    <rect x={x - w / 2} y={top} width={w} height={pis - top} fill={gas} opacity={0.55} />
    <path d={`M${x - w / 2} ${top} V${top + h} M${x + w / 2} ${top} V${top + h}`} stroke="#cfd9df" strokeWidth={2} fill="none" />
    <path d={`M${x - w / 2 - 4} ${top} H${x - 14} M${x + 14} ${top} H${x + w / 2 + 4}`} stroke="#cfd9df" strokeWidth={2} />
    {valve(x - 10, i.intake === '打开', '#7fb8ff')}{valve(x + 10, i.exhaust === '打开', '#c7b8a8')}
    <rect x={x - w / 2 + 2} y={pis} width={w - 4} height={12} rx={2} fill="#cfd5d9" />
    <line x1={x} y1={pis + 12} x2={x} y2={top + h + 8} stroke="#9fb0bb" strokeWidth={3} />
    {title && <text x={x} y={top + h + 24} textAnchor="middle" fontSize={12} fontWeight={on ? 700 : 400} fill={on ? '#fff' : '#9fb0bb'}>{title}</text>}
  </g>
}
/** 四个冲程并排：现在这一个是亮的，其余的变淡。a：现在的曲轴转角 */
export function StrokeView({ now }: { now: Stroke | null }) {
  return <svg viewBox="0 0 250 132" className="mt-2 w-full rounded-lg" role="img" aria-label="汽油机的四个冲程">
    <rect width={250} height={132} fill={BG} />
    {STROKES.map((s, k) => <MiniCyl key={s} x={33 + k * 61} y={18} a={k * 180 + 100} w={40} on={now === null || now === s} title={s} />)}
  </svg>
}

/** 四缸机：四个缸各在哪个冲程，现在在做功的那个缸标亮。a：曲轴转角 */
export function FiringView({ a }: { a: number }) {
  return <svg viewBox="0 0 250 150" className="mt-2 w-full rounded-lg" role="img" aria-label="四缸机各缸所处的冲程">
    <rect width={250} height={150} fill={BG} />
    {[1, 2, 3, 4].map((n, k) => { const ca = cylAngle(a, n), st = strokeOf(ca); return <g key={n}>
      <MiniCyl x={36 + k * 59} y={22} a={((ca % 720) + 720) % 720} w={40} on={st === '做功'} />
      <text x={36 + k * 59} y={14} textAnchor="middle" fontSize={11} fill="#cfd9df">{n} 缸</text>
      <text x={36 + k * 59} y={102} textAnchor="middle" fontSize={12} fontWeight={st === '做功' ? 700 : 400} fill={st === '做功' ? '#ffb347' : '#9fb0bb'}>{st}</text>
    </g> })}
    <text x={125} y={132} textAnchor="middle" fontSize={12} fill="#cfd9df">点火顺序 {ORDER.join(' – ')}</text>
  </svg>
}

/** 能量流向图：左边一整条是燃料放出的热，往右分成几股，宽度按比例。shown：画出来了几股 */
export function FlowView({ shown }: { shown: number }) {
  const W = 250, H = 178, x0 = 14, x1 = 130, top = 20, tall = 130
  let y = top
  return <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label="发动机里能量的去向">
    <rect width={W} height={H} fill={BG} />
    <rect x={x0} y={top} width={22} height={tall} fill="#ff9a4a" opacity={0.85} />
    <text x={x0 + 11} y={top + tall + 16} textAnchor="middle" fontSize={11} fill="#cfd9df">燃料放热</text>
    {FLOW.map((f, i) => {
      const hgt = f.share * tall, y0 = y, ty = top + i * 34 + 6; y += hgt
      const on = i < shown
      return <g key={f.key} opacity={on ? 1 : 0.18}>
        <path d={`M${x0 + 22} ${y0} C${x1 - 50} ${y0}, ${x1 - 40} ${ty}, ${x1} ${ty} V${ty + hgt} C${x1 - 40} ${ty + hgt}, ${x1 - 50} ${y0 + hgt}, ${x0 + 22} ${y0 + hgt} Z`} fill={f.color} opacity={0.7} />
        <text x={x1 + 6} y={ty + Math.min(hgt, 30) / 2 + 4} fontSize={12} fontWeight={f.key === 'work' ? 700 : 400} fill="#fff">{f.name} <tspan fill="#cfd9df">{Math.round(f.share * 100)}%</tspan></text>
      </g>
    })}
    <text x={W - 8} y={H - 6} textAnchor="end" fontSize={10.5} fill="#9fb0bb">各部分的比例是示意</text>
  </svg>
}
