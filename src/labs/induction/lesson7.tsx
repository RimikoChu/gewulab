// 电磁感应和电网 · 第 7 课 远距离输电：从升压站到城里的 110 kV 线路。同样送 11 MW，分别用 10 kV、110 kV、220 kV 送一次，
// 看线路电流和导线上的损耗 P损 = I²R；最后经变电站和配电变压器两级降压，送进住户。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { LINE as LN, LINE_U, STEPS, kv, lineLoss, stepRatio, watt } from './physics'
import { Place, type GridState } from './world'
import { CITY, LINE } from './layout'
import { useSettled } from './anim'

type Uk = '10' | '110' | '220'
const pct = (r: number) => `${(r * 100).toFixed(r < 0.01 ? 2 : 0)}%`
const L10 = lineLoss(10e3), L110 = lineLoss(110e3), L220 = lineLoss(220e3)
const TASKS: Task[] = [
  { id: '10', text: '用 10 kV 直接送 11 MW', note: `I = ${L10.I.toFixed(0)} A，导线上损耗 ${watt(L10.loss)}，一半多的电在路上发热了` },
  { id: '110', text: '升压到 110 kV 再送', note: `电流降到 ${L110.I.toFixed(0)} A，损耗只有 ${watt(L110.loss)}：电压升到 11 倍，损耗降到 1/121` },
  { id: '220', text: '换成 220 kV 送', note: `电压再加倍，损耗降到 1/4：${watt(L220.loss)}` },
  { id: 'home', text: '降压，把电送到住户', note: '变电站降到 10 kV，配电变压器再降到 400 V，住户用 220 V' },
]

export default function Lesson7() {
  const [uk, setUk] = useState<Uk>('10')
  const [on, setOn] = useState(false)
  const [home, setHome] = useState(false)
  const T = useTasks('gewu:induction:7', TASKS)
  const U = Number(uk) * 1e3, r = lineLoss(U)
  const ok = useSettled(`${on}${uk}${home}`, 3000) && on
  useEffect(() => { if (ok) T.check(id => (id === uk && !home) || (id === 'home' && home && !!T.done['220'])) }, [ok])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setUk('10'); setOn(false); setHome(false); T.reset() }
  const grid = useMemo<GridState>(() => ({ on, U, I: r.I, ratio: r.ratio, lamp: on ? 0.25 + 0.75 * (r.arrive / LN.P) : 0 }), [on, U, r.I, r.ratio, r.arrive])

  const task = T.current
  type Next = 'on' | 'u' | 'home' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '升压输电、到用户处降压：电压升到 n 倍，线路损耗降到 1/n²。', next: null }
    if (task.id === 'home') {
      if (!on) return { hint: '送电', next: 'on' }
      return home ? { hint: '电送进城里了，看住户的灯…', next: null } : { hint: '降压，把电送到住户', next: 'home' }
    }
    if (uk !== task.id) return { hint: `把输电电压换成 ${task.id} kV`, next: 'u' }
    if (!on) return { hint: `用 ${task.id} kV 送电`, next: 'on' }
    return { hint: `${task.id} kV 送电中，看线路电流和损耗…`, next: null }
  })()

  const mid = (LINE.towers[1] + LINE.towers[2]) / 2
  const labels: Label[] = home ? [
    { id: 's', at: [CITY.sub, 9, LINE.z], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>变电站</small>{kv(STEPS.sub[0])} → {kv(STEPS.sub[1])}</> },
    { id: 'p', at: [CITY.pole, 13, LINE.z], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>配电变压器</small>{kv(STEPS.dist[0])} → {kv(STEPS.dist[1])}</> },
    { id: 'h', at: [370, 22, 14], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>住户</small>{STEPS.home} V</> },
  ] : [
    { id: 'i', at: [mid, 24, LINE.z], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: on ? 1 : 0.35 }, children: <><small>I</small>{on ? `${r.I.toFixed(0)} A` : '0'}</> },
    { id: 'l', at: [LINE.towers[2] + 8, 14, LINE.z], ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: on ? 1 : 0 }, children: <><small>P损</small>{watt(r.loss)}</> },
    { id: 'n1', at: [LINE.towers[0], 32, LINE.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '110 kV 铁塔' },
    { id: 'n2', at: [CITY.x0 + 20, 26, LINE.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '城里' },
  ]
  return (
    <LabShell title="电磁感应和电网" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="输电"
      stage={<Place at={home ? 'l7c' : 'l7'} cur="l7" labels={labels} grid={grid} />}
      lesson={<LessonBlock no="7" title="远距离输电" concept="电压升到 n 倍，线路损耗降到 1/n²" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>输电线有电阻 R，电流 I 通过时损失的功率 <span className="font-formula italic">P损 = I²R</span>。输送的功率 P 一定时 I = P/U，所以 P损 = (P/U)²R：电压升高到 n 倍，损耗降到 1/n²。</p>
          <p className="mt-3">注意：P损 = I²R 里的 I 是线路电流。不能用输电电压 U 去算 U²/R，导线两端的电压降只是 IR。</p>
          <p className="mt-3">减小导线电阻要用更粗的导线，代价大；所以远距离输电用<b className="text-white">高压</b>：发电厂用升压变压器升压，到用户附近再用降压变压器一级一级降下来。</p>
          <p className="mt-3">这里线路电阻按 {LN.R} Ω 算，输送功率 {watt(LN.P)}。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种电压都送过，电也进了城</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">升压—输电—降压：电压升到 n 倍，损耗降到 1/n²</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">同样送 11 MW：10 kV 损耗 {pct(L10.ratio)}，110 kV 只有 {pct(L110.ratio)}，220 kV 是 {pct(L220.ratio)}。到城里再降压 {stepRatio(STEPS.sub)} 倍和 {stepRatio(STEPS.dist)} 倍。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">P损 = I² R</div>
            <div className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">{on ? watt(r.loss) : '0'}</div>
            <div className="mt-1.5 text-[13px] text-white/55">{on ? `占输送功率的 ${pct(r.ratio)}，到达 ${watt(r.arrive)}` : '没有送电'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="P" value={watt(LN.P)} unit="输送功率" />
            <ParamTile symbol="U" value={kv(U)} unit="输电电压" />
            <ParamTile symbol="I" value={on ? r.I.toFixed(0) : '0'} unit="A · I = P/U" />
            <ParamTile symbol="R" value={String(LN.R)} unit="Ω · 线路电阻" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">比一比</h2>
          <table className="mt-2 w-full text-[13.5px] tabular-nums">
            <thead className="text-white/50"><tr><th className="py-1 text-left font-normal">U</th><th className="text-right font-normal">I</th><th className="text-right font-normal">P损</th><th className="text-right font-normal">占比</th></tr></thead>
            <tbody>{LINE_U.map(u => { const d = !!T.done[String(u / 1e3)], x = lineLoss(u); return <tr key={u} className={cn('border-t border-white/10', !d && 'text-white/30')}><td className="py-1">{kv(u)}</td><td className="text-right">{d ? `${x.I.toFixed(0)} A` : '—'}</td><td className="text-right">{d ? watt(x.loss) : '—'}</td><td className="text-right">{d ? pct(x.ratio) : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'on'} pulse={next === 'on'} onClick={() => setOn(o => !o)}>{on ? '停电' : '送电'}</LabButton>
        <LabButton primary={next === 'home'} pulse={next === 'home'} onClick={() => { if (!home) setUk('110'); setHome(h => !h) }} disabled={!T.done['220']}>{home ? '回到输电线' : '送到住户'}</LabButton>
      </>}
      extras={<Control label="输电电压"><Segmented label="输电电压" pulse={next === 'u'} want={next === 'u' ? (task?.id as Uk) : null} value={uk} onChange={k => setUk(k as Uk)} disabled={home} options={LINE_U.map(u => ({ value: String(u / 1e3) as Uk, label: kv(u) }))} /></Control>}
    />
  )
}
