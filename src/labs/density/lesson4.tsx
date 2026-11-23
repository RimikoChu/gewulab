// 质量与密度 · 第 4 课 质量和体积成正比（同种物质的质量与体积的关系：称几块铝、几块铜，画 m–V 图线）
import { useRef, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Balance, WeightSet, panAt, useWeigh } from './balance'
import { LESSONS, goLesson } from './lessons'
import { Block, Carry, Room, newLive, useSettled, type V3 } from './parts'
import { BLOCK_V, CAPACITY, RHO, blocks, density } from './physics'
import { ST, TOP, CM } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type M = 'al' | 'cu'
const METALS: M[] = ['al', 'cu'], TINT: Record<M, string> = { al: '#d5dce2', cu: '#e8a07a' }
const LAST = BLOCK_V.length - 1
const TASKS: Task[] = [
  { id: 'al0', text: `称 ${BLOCK_V[0]} cm³ 的铝块，记下质量`, note: `${blocks('al')[0].m} g` },
  { id: 'al', text: '把另外两块铝也称了，看图上的三个点', note: `三个点连成一条过原点的直线：质量和体积成正比，比值都是 ${RHO.al.rho} g/cm³` },
  { id: 'cu', text: '换成铜块，三块都称一遍', note: `也是一条过原点的直线，但更陡：比值都是 ${RHO.cu.rho} g/cm³` },
]
const X = ST.s4, BASE: V3 = [X - 0.3, TOP, 0.15], BOX: V3 = [X + 1.7, TOP, 0.75]
/** 六块金属在垫子上各放在哪：铝一排，铜一排 */
const home = (m: M, j: number): V3 => [X - 2.0 + j * 0.42, TOP + 0.02, m === 'al' ? 0.95 : 1.3]
const key = (m: M, j: number) => `${m}:${j}`

/** 面板里的 m–V 图：记过的点，同一种金属有两个点以上就连成过原点的直线 */
function Chart({ rows }: { rows: string[] }) {
  const W = 250, H = 170, x0 = 34, y0 = 144, vx = (V: number) => x0 + V / 22 * (W - x0 - 12), my = (m: number) => y0 - m / CAPACITY * (y0 - 14)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label="质量随体积变化的图线">
      <rect width={W} height={H} fill="#182026" />
      {[50, 100, 150, 200].map(m => <g key={m}><line x1={x0} y1={my(m)} x2={W - 12} y2={my(m)} stroke="#ffffff" strokeOpacity={0.08} /><text x={x0 - 5} y={my(m) + 4} textAnchor="end" fontSize={10} fill="#9fb0bb">{m}</text></g>)}
      {[10, 20].map(V => <g key={V}><line x1={vx(V)} y1={y0} x2={vx(V)} y2={14} stroke="#ffffff" strokeOpacity={0.08} /><text x={vx(V)} y={y0 + 13} textAnchor="middle" fontSize={10} fill="#9fb0bb">{V}</text></g>)}
      <path d={`M${x0} 10 V${y0} H${W - 8}`} fill="none" stroke="#9fb0bb" strokeWidth={1.2} />
      <text x={x0 - 4} y={y0 + 13} textAnchor="end" fontSize={10} fill="#9fb0bb">0</text>
      <text x={x0 + 6} y={13} fontSize={10.5} fill="#cfd9df">m / g</text><text x={W - 8} y={y0 + 24} textAnchor="end" fontSize={10.5} fill="#cfd9df">V / cm³</text>
      {METALS.map(m => { const pts = blocks(m).filter((_, j) => rows.includes(key(m, j))), far = blocks(m)[LAST]
        return <g key={m}>
          {pts.length >= 2 && <><line x1={vx(0)} y1={my(0)} x2={vx(far.V)} y2={my(far.m)} stroke={TINT[m]} strokeWidth={1.6} strokeOpacity={0.8} /><text x={vx(far.V) - 6} y={my(far.m) + (m === 'cu' ? 4 : -8)} textAnchor="end" fontSize={11.5} fontWeight={700} fill={TINT[m]}>{RHO[m].name}</text></>}
          {pts.map(p => <circle key={p.V} cx={vx(p.V)} cy={my(p.m)} r={4} fill={TINT[m]} stroke="#182026" strokeWidth={1.2} />)}
        </g> })}
    </svg>
  )
}

export default function Lesson4() {
  const [metal, setMetal] = useState<M>('al')
  const [cur, setCur] = useState<string | null>(null)
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:density:4', TASKS)
  const live = useRef(newLive())
  const list = blocks(metal), j = cur ? Number(cur.split(':')[1]) : -1, b = j >= 0 ? list[j] : null
  const Wg = useWeigh(b ? b.m : null), settled = useSettled(cur ?? '', 4300)
  const todo = list.findIndex((_, k) => !rows.includes(key(metal, k)))
  const dup = !cur || rows.includes(cur)
  const nextBlock = () => { if (todo < 0 || !settled || (cur && !dup)) return; setCur(key(metal, todo)) }
  const record = () => { if (!cur || dup || !settled) return; const next = [...rows, cur]; setRows(next); T.check(id => id === 'al0' ? next.includes('al:0') : BLOCK_V.every((_, k) => next.includes(`${id}:${k}`))) }
  const pick = (m: M) => { if (!settled) return; setMetal(m); setCur(null) }
  const resetAll = () => { setMetal('al'); setCur(null); setRows([]); T.reset() }
  const task = T.current, tm = (task ? task.id.slice(0, 2) : metal) as M
  const { hint, next }: { hint: string; next: 'metal' | 'next' | 'record' | null } = !task ? { hint: '同种物质的质量和体积成正比；不同物质，比值一般不同。', next: null }
    : !settled ? { hint: '放上金属块，再从大到小加砝码、移游码…', next: null }
    : metal !== tm ? { hint: `换成${RHO[tm].name}块`, next: 'metal' }
    : cur && !dup ? { hint: `天平平衡了：${b!.V} cm³ 的${RHO[metal].name}块是 ${b!.m} g。按“记录”，图上会多一个点`, next: 'record' }
    : { hint: `按“称下一块”：${list[todo].V} cm³ 的${RHO[metal].name}块`, next: 'next' }
  const show = !!b && settled
  const labels: Label[] = [
    { id: 'm', at: [BASE[0], TOP + 1.66, BASE[2]], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: show ? 1 : 0 }, children: b ? <><small>{b.V} cm³ 的{RHO[metal].name}块</small>{b.m.toFixed(1)} g</> : null },
    { id: 'al', at: [home('al', 0)[0] - 0.2, TOP + 0.14, 0.95], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '铝块' },
    { id: 'cu', at: [home('cu', 0)[0] - 0.2, TOP + 0.14, 1.3], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '铜块' },
  ]
  return (
    <LabShell narration={voiced(NARRATION['4'], VOICE)} title="质量与密度" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={`${RHO[metal].name}块`}
      stage={<Room at="s4" labels={labels}>
        <Balance at={BASE} left={Wg.left} right={Wg.right} rider={Wg.rider} live={live} />
        <WeightSet box={BOX} base={BASE} on={Wg.on} live={live} />
        {/* 垫子上的六块金属：截面都是 2 cm × 2 cm，长短不同 */}
        <RoundedBox args={[1.5, 0.02, 0.86]} radius={0.008} smoothness={2} position={[X - 1.62, TOP + 0.01, 1.12]} receiveShadow><meshStandardMaterial color="#2e4a44" roughness={0.95} /></RoundedBox>
        {METALS.flatMap(m => BLOCK_V.map((V, k) => { const up = cur === key(m, k); return <Carry key={key(m, k)} at={up ? panAt(BASE, -1) : home(m, k)} ride={up ? 'L' : null} live={live} grip={[V / 4 * CM, 1.3 * CM]}><Block kind={m} size={[V / 4, 2, 2]} /></Carry> }))}
      </Room>}
      lesson={<LessonBlock no="4" title="质量和体积成正比" concept="同种物质，质量与体积成正比" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>同种物质的质量与体积成正比：体积大到几倍，质量也大到几倍，所以<b className="text-white">质量与体积的比值是一定的</b>。</p>
          <p className="mt-3">物质不同，这个比值一般不同。铝是 {RHO.al.rho} g/cm³，铜是 {RHO.cu.rho} g/cm³：同样大的一块，铜比铝重得多。</p>
          <p className="mt-3 text-[13.5px] text-white/65">图上横轴是体积、纵轴是质量。同一种物质的点落在同一条过原点的直线上；直线越陡，比值越大。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">六块都称过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">同种物质，质量与体积成正比</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">铝块的比值都是 {RHO.al.rho} g/cm³，铜块都是 {RHO.cu.rho} g/cm³。这个比值只跟是什么物质有关，下一课给它起个名字。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">质量 ÷ 体积</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{show ? density(b!.m, b!.V).toFixed(1) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">g/cm³</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="m" value={show ? `${b!.m.toFixed(1)} g` : '—'} unit="质量" />
            <ParamTile symbol="V" value={b ? `${b.V} cm³` : '—'} unit="体积" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">m–V 图</h2>
          <Chart rows={rows} />
          <h2 className="mt-4 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每称一块，按“记录”。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">物质</th><th className="text-right font-normal">V / cm³</th><th className="text-right font-normal">m / g</th><th className="text-right font-normal">m ÷ V</th></tr></thead>
                <tbody>{rows.map(r => { const [m, k] = r.split(':') as [M, string], q = blocks(m)[Number(k)]; return <tr key={r} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{RHO[m].name}</td><td className="text-right tabular-nums">{q.V}</td><td className="text-right tabular-nums">{q.m.toFixed(1)}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{density(q.m, q.V).toFixed(1)}</td></tr> })}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'next'} onClick={nextBlock} disabled={!settled || todo < 0 || (!!cur && !dup)}>称下一块</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!settled || dup}>记录</LabButton>
      </>}
      extras={<Control label="物质"><Segmented label="物质" pulse={next === 'metal'} want={next === 'metal' ? tm : null} value={metal} disabled={!settled} onChange={pick} options={METALS.map(m => ({ value: m, label: `${RHO[m].name}块` }))} /></Control>}
    />
  )
}
