// 面板里的小图：电路图（用教材的符号画）、放大的电表表盘、逐行记录的数据表。
// 图里只按传进来的状态画，不做物理计算。
import type { ReactNode } from 'react'
import type { Across, MeterKind, Point, Range } from './physics'

const BG = '#182026', WIRE = '#7d8a93', HOT = '#ffe27a', INK = '#e7ecef'

/** 元件的符号：画在 (x, y)，横着（vertical 为真时竖着）。先画一块底色盖住导线，再画符号 */
function Lamp({ x, y, lit, gone }: { x: number; y: number; lit: number; gone?: boolean }) {
  if (gone) return <g><rect x={x - 11} y={y - 11} width={22} height={22} fill={BG} /><circle cx={x} cy={y} r={9} fill="none" stroke={INK} strokeOpacity={0.35} strokeDasharray="3 3" /></g>
  return <g>
    <rect x={x - 11} y={y - 11} width={22} height={22} fill={BG} />
    {lit > 0 && <circle cx={x} cy={y} r={13} fill="#ffd27a" opacity={0.18 + lit * 0.4} />}
    <circle cx={x} cy={y} r={9} fill={BG} stroke={lit > 0 ? HOT : INK} strokeWidth={1.6} />
    <path d={`M${x - 6.4} ${y - 6.4} L${x + 6.4} ${y + 6.4} M${x + 6.4} ${y - 6.4} L${x - 6.4} ${y + 6.4}`} stroke={lit > 0 ? HOT : INK} strokeWidth={1.6} />
  </g>
}
function Cell({ x, y, n = 2 }: { x: number; y: number; n?: number }) {
  const w = n * 9
  return <g>
    <rect x={x - w / 2 - 3} y={y - 12} width={w + 6} height={24} fill={BG} />
    {Array.from({ length: n }, (_, i) => { const cx = x - w / 2 + 4.5 + i * 9; return <g key={i}><line x1={cx - 3} y1={y - 10} x2={cx - 3} y2={y + 10} stroke={INK} strokeWidth={1.6} /><line x1={cx + 3} y1={y - 5} x2={cx + 3} y2={y + 5} stroke={INK} strokeWidth={3.2} /></g> })}
    <line x1={x - w / 2 - 3} y1={y} x2={x - w / 2 + 1.5} y2={y} stroke={WIRE} strokeWidth={1.6} /><line x1={x + w / 2 - 1.5} y1={y} x2={x + w / 2 + 3} y2={y} stroke={WIRE} strokeWidth={1.6} />
  </g>
}
function Sw({ x, y, on }: { x: number; y: number; on: boolean }) {
  return <g>
    <rect x={x - 12} y={y - 12} width={24} height={16} fill={BG} />
    <circle cx={x - 9} cy={y} r={1.8} fill={INK} /><circle cx={x + 9} cy={y} r={1.8} fill={INK} />
    <line x1={x - 9} y1={y} x2={on ? x + 9 : x + 6} y2={on ? y : y - 9} stroke={INK} strokeWidth={1.6} />
  </g>
}
function Dial({ x, y, kind }: { x: number; y: number; kind: MeterKind }) {
  return <g><circle cx={x} cy={y} r={9} fill={BG} stroke="#7fe3d4" strokeWidth={1.6} /><text x={x} y={y + 4.2} textAnchor="middle" fontSize={12} fontWeight={700} fill="#7fe3d4">{kind}</text></g>
}
function Res({ x, y, rheo }: { x: number; y: number; rheo?: boolean }) {
  return <g><rect x={x - 13} y={y - 5} width={26} height={10} fill={BG} stroke={INK} strokeWidth={1.6} />{rheo && <path d={`M${x - 13} ${y + 13} L${x + 9} ${y - 9}`} stroke={INK} strokeWidth={1.4} markerEnd="url(#sArr)" />}</g>
}
const T = ({ x, y, children, c = INK }: { x: number; y: number; children: ReactNode; c?: string }) => <text x={x} y={y} textAnchor="middle" fontSize={11} fontWeight={600} fill={c}>{children}</text>
const L = ({ d, hot }: { d: string; hot: boolean }) => <path d={d} fill="none" stroke={hot ? HOT : WIRE} strokeWidth={hot ? 2 : 1.6} strokeLinejoin="round" />

export interface SchemProps {
  /** single 只有一只灯；series、parallel 两只灯；board 一只灯加一段电阻 */
  link: 'single' | 'series' | 'parallel' | 'board'
  on: boolean
  lit1?: number; lit2?: number
  /** 拧下了哪只灯 */
  off?: 'L1' | 'L2' | null
  /** 电流表接在哪：single、board 时 'loop' 表示接在回路里 */
  amp?: Point | 'loop' | null
  volt?: Across | null
  /** 第 1 课：电池两极被导线直接连起来 */
  short?: boolean
  /** 哪几段有电流：主路、两条支路 */
  hot?: { main: boolean; b1?: boolean; b2?: boolean }
  rheo?: boolean
  cells?: number
}
/** 电路图：电源在下，开关在左下，用电器在上（并联时两条支路上下排） */
export function Schematic({ link, on, lit1 = 0, lit2 = 0, off = null, amp = null, volt = null, short = false, hot = { main: false }, rheo = false, cells = 2 }: SchemProps) {
  const W = 260, H = 150
  const box = (top: number) => `M40 120 L40 ${top} L220 ${top} L220 120 Z`
  const body = (() => {
    if (link === 'parallel') {
      return <>
        <L d="M40 120 L40 30 L220 30 L220 120 Z" hot={hot.main} />
        <L d="M60 30 L60 72 L200 72 L200 30" hot={!!hot.b2} />
        <L d="M60 30 L200 30" hot={!!hot.b1} />
        <circle cx={60} cy={30} r={2.6} fill={INK} /><circle cx={200} cy={30} r={2.6} fill={INK} />
        <Lamp x={130} y={30} lit={lit1} gone={off === 'L1'} /><T x={130} y={16}>L₁</T>
        <Lamp x={130} y={72} lit={lit2} gone={off === 'L2'} /><T x={130} y={96}>L₂</T>
        {amp === 'A' && <Dial x={88} y={30} kind="A" />}{amp === 'B' && <Dial x={88} y={72} kind="A" />}{amp === 'C' && <Dial x={220} y={84} kind="A" />}
        {amp && amp !== 'loop' && <T x={amp === 'C' ? 238 : 88} y={amp === 'A' ? 18 : amp === 'B' ? 92 : 88} c="#7fe3d4">{amp}</T>}
      </>
    }
    const two = link === 'series'
    return <>
      <L d={box(40)} hot={hot.main} />
      {two ? <><Lamp x={100} y={40} lit={lit1} gone={off === 'L1'} /><T x={100} y={24}>L₁</T><Lamp x={170} y={40} lit={lit2} gone={off === 'L2'} /><T x={170} y={24}>L₂</T></>
        : <><Lamp x={link === 'board' ? 90 : 130} y={40} lit={lit1} /><T x={link === 'board' ? 90 : 130} y={24}>L₁</T></>}
      {link === 'board' && <Res x={160} y={40} rheo={rheo} />}
      {two && amp === 'A' && <Dial x={64} y={40} kind="A" />}{two && amp === 'B' && <Dial x={135} y={40} kind="A" />}{two && amp === 'C' && <Dial x={220} y={80} kind="A" />}
      {two && amp && amp !== 'loop' && <T x={amp === 'C' ? 238 : amp === 'A' ? 64 : 135} y={amp === 'C' ? 84 : 62} c="#7fe3d4">{amp}</T>}
      {!two && amp === 'loop' && <Dial x={220} y={80} kind="A" />}
    </>
  })()
  // 电压表：画在被测元件旁边，两根虚线接到元件两头
  const vm = (() => {
    if (!volt) return null
    const par = link === 'parallel'
    if (volt === 'src') return <g><path d="M110 120 L110 140 L150 140 L150 120" fill="none" stroke="#7fe3d4" strokeWidth={1.4} strokeDasharray="4 3" /><Dial x={130} y={140} kind="V" /></g>
    const y = volt === 'L1' ? (par ? 30 : 40) : par ? 72 : 40, x = volt === 'L1' ? (par ? 130 : 100) : par ? 130 : 170
    const up = par && volt === 'L2' ? 1 : -1, yy = y + up * 22
    return <g><path d={`M${x - 18} ${y} L${x - 18} ${yy} L${x + 18} ${yy} L${x + 18} ${y}`} fill="none" stroke="#7fe3d4" strokeWidth={1.4} strokeDasharray="4 3" /><Dial x={x} y={yy} kind="V" /></g>
  })()
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label="电路图">
      <defs><marker id="sArr" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={5} markerHeight={5} orient="auto"><path d="M0 0 L10 5 L0 10z" fill={INK} /></marker></defs>
      <rect width={W} height={H} fill={BG} />
      {body}
      {short && <path d="M108 120 L108 104 L152 104 L152 120" fill="none" stroke={HOT} strokeWidth={2.2} />}
      <Cell x={130} y={120} n={cells} />
      <T x={130} y={144}>{volt === 'src' ? '' : '电源'}</T>
      <Sw x={40} y={86} on={on} />
      {vm}
    </svg>
  )
}

/** 放大的表盘：两排刻度，正在用的那一排加亮；k 是指针偏了满偏的几分之几 */
export function DialView({ kind, range, k }: { kind: MeterKind; range: Range; k: number }) {
  const W = 260, H = 128, cx = 130, cy = 120, r1 = 96, r2 = 74, half = 45
  const hi = kind === 'A' ? ['0', '1', '2', '3'] : ['0', '5', '10', '15'], lo = kind === 'A' ? ['0', '0.2', '0.4', '0.6'] : ['0', '1', '2', '3']
  const at = (t: number, R: number) => { const a = (-half + 2 * half * t) * Math.PI / 180; return [cx + Math.sin(a) * R, cy - Math.cos(a) * R] }
  const scale = (R: number, inward: boolean, labels: string[], on: boolean) => {
    const c = on ? '#1b2026' : '#9aa1a6', ticks = []
    for (let i = 0; i <= 30; i++) { const big = i % 10 === 0, mid = i % 5 === 0, l = big ? 9 : mid ? 6.5 : 4, [x0, y0] = at(i / 30, R), [x1, y1] = at(i / 30, inward ? R - l : R + l); ticks.push(<line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={c} strokeWidth={big ? 1.6 : 0.9} />) }
    return <g>{ticks}{labels.map((l, i) => { const [x, y] = at(i / 3, inward ? R - 17 : R + 15); return <text key={i} x={x} y={y + 4} textAnchor="middle" fontSize={on ? 13 : 11} fontWeight={700} fill={c}>{l}</text> })}</g>
  }
  const t = Math.max(-0.07, Math.min(1.07, k)), [nx, ny] = at(t, r1 + 4)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label="放大的表盘">
      <rect width={W} height={H} fill={BG} /><rect x={8} y={6} width={W - 16} height={H - 12} rx={6} fill="#f1efe6" />
      {scale(r1, false, hi, range === 'hi')}{scale(r2, true, lo, range === 'lo')}
      <text x={cx} y={cy - 32} textAnchor="middle" fontSize={18} fontWeight={700} fill="#1b2026">{kind}</text>
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#c0221a" strokeWidth={2} style={{ transition: 'all 0.5s cubic-bezier(0.3,1.4,0.5,1)' }} />
      <circle cx={cx} cy={cy} r={4} fill="#1b2026" />
    </svg>
  )
}

/** 一张数据表：head 是表头，rows 是已经记下的行，空着的行用 — 占位。hi：刚记下的那一行高亮；eq：结论成立时把最后一列标成青绿 */
export function Table({ head, rows, total, hi, eq }: { head: ReactNode[]; rows: ReactNode[][]; total: number; hi?: number; eq?: boolean }) {
  return (
    <table className="mt-2 w-full text-center text-[13px] tabular-nums">
      <thead><tr className="text-white/55">{head.map((h, i) => <th key={i} className="px-1 pb-1 font-medium">{h}</th>)}</tr></thead>
      <tbody>{Array.from({ length: total }, (_, i) => <tr key={i} className={i === hi ? 'row-in bg-white/10' : 'bg-white/[0.04]'}>{head.map((_, j) => <td key={j} className={`px-1 py-1.5 ${j === 0 ? 'rounded-l-lg text-white/60' : ''} ${j === head.length - 1 ? `rounded-r-lg font-semibold ${eq ? 'text-[#7fe3d4]' : ''}` : ''}`}>{rows[i]?.[j] ?? '—'}</td>)}</tr>)}</tbody>
    </table>
  )
}
