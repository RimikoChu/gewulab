// 电路 · 第 6 课 串、并联电路中电压的规律：两只规格不同的灯，一只电压表的两根线轮流接在 L₁、L₂、电源两端。
// 串联：U₁ 1.2 V + U₂ 1.8 V = U 3.0 V。并联：三处都是 3.0 V。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { add } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Bench, Place, toWorld, useSettled } from './parts'
import { LINK_NAME, meterRead, round, twoLamps, voltmeterAt, type Across, type Link } from './physics'
import { TwoLampRig, VOLT_AT } from './rig'
import { DialView, Schematic, Table } from './views'
import type { V3 } from './world'

const f1 = (x: number) => x.toFixed(1)
const AC: Across[] = ['L1', 'L2', 'src']
const AC_NAME: Record<Across, string> = { L1: 'L₁ 两端', L2: 'L₂ 两端', src: '电源两端' }
const SYM: Record<Across, string> = { L1: 'U₁', L2: 'U₂', src: 'U' }
const TASKS: Task[] = [
  { id: 's_1', text: '串联：电压表接在 L₁ 两端，记一次', note: `U₁ = ${f1(voltmeterAt('series', 'L1'))} V` },
  { id: 's_2', text: '再接在 L₂ 两端、电源两端，各记一次', note: `${f1(voltmeterAt('series', 'L1'))} V + ${f1(voltmeterAt('series', 'L2'))} V = ${f1(voltmeterAt('series', 'src'))} V：串联电路两端的电压等于各部分电压之和` },
  { id: 'p_all', text: '换成并联：L₁、L₂、电源两端各记一次', note: `三处都是 ${f1(voltmeterAt('parallel', 'src'))} V：并联电路各支路两端的电压相等` },
]
const W = (p: V3) => toWorld('l6', p)

export default function Lesson6() {
  const [link, setLink] = useState<Link>('series')
  const [ac, setAc] = useState<Across>('L1')
  const [on, setOn] = useState(true)
  const [rows, setRows] = useState<Record<Link, Partial<Record<Across, number>>>>({ series: {}, parallel: {} })
  const [last, setLast] = useState<Link | null>(null)
  const T = useTasks('gewu:circuit:6', TASKS)
  const move = useSlide(link === 'parallel' ? 1 : 0, 1.1), wired = move === (link === 'parallel' ? 1 : 0)
  const knife = useSlide(on ? 1 : 0, 2.6), live = knife > 0.99 && wired
  const c = twoLamps(link, true), U = voltmeterAt(link, ac), m = meterRead('V', 'lo', live ? U : 0)
  const settled = useSettled(`${link}${ac}${live}`, 1300) && live
  const done = rows[link]
  const record = () => {
    if (!settled || done[ac] !== undefined) return
    const n = { ...rows, [link]: { ...done, [ac]: round(U, 1) } }; setRows(n); setLast(link)
    T.check(id => id === 's_1' ? n.series.L1 !== undefined : id === 's_2' ? n.series.L2 !== undefined && n.series.src !== undefined && n.series.L1 !== undefined : AC.every(a => n.parallel[a] !== undefined))
  }
  const toParallel = () => { setOn(false); setLink('parallel'); setAc('L1'); setTimeout(() => setOn(true), 1400) }
  const resetAll = () => { setLink('series'); setAc('L1'); setOn(true); setRows({ series: {}, parallel: {} }); setLast(null); T.reset() }
  const task = T.current
  const needLink = task?.id === 'p_all' && link === 'series'
  const todo: Across | null = !task || needLink ? null : task.id === 's_1' ? 'L1' : AC.find(a => done[a] === undefined) ?? null
  const want = todo && todo !== ac ? todo : null
  const { hint, next }: { hint: string; next: 'rec' | 'link' | 'ac' | null } = !task ? { hint: '串联电路两端的电压等于各部分电压之和；并联电路各支路两端的电压相等。', next: null }
    : needLink ? { hint: '串联的三个电压记好了。按“换成并联电路”', next: 'link' }
    : !live ? { hint: '重新连好导线，闭合开关…', next: null }
    : want ? { hint: `把电压表的两根线接到${AC_NAME[want]}`, next: 'ac' }
    : !settled ? { hint: '指针在摆…', next: null }
    : { hint: `电压表并联在${AC_NAME[ac]}，读下面一排刻度（0–3 V）。按“记录数据”`, next: 'rec' }
  const labels: Label[] = [
    { id: 'r', at: W(add(VOLT_AT, [0, 11.4, -2])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: settled ? 1 : 0 }, children: <><small>{SYM[ac]}</small>{f1(U)} V</> },
    { id: 'n1', at: W(add(VOLT_AT, [-6.8, 9, -1])), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '电压表' },
  ]
  const head = ['', 'U₁ / V', 'U₂ / V', 'U / V']
  const show = (l: Link) => [LINK_NAME[l], ...AC.map(a => rows[l][a] !== undefined ? f1(rows[l][a]!) : '—')]
  return (
    <LabShell title="电路" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="电压表"
      stage={<Place at="l6" labels={labels}>
        <Bench at="l6"><TwoLampRig link={link} c={live ? c : twoLamps(link, false)} knife={knife} move={move} wired={wired} volt={ac} voltK={m.k} /></Bench>
      </Place>}
      lesson={<LessonBlock no="6" title="串、并联电路中电压的规律" concept="串联电压相加，并联电压相等" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>串联电路两端的总电压等于各部分电路两端电压之和：<span className="font-formula italic">U = U₁ + U₂</span>。</p>
          <p className="mt-3">并联电路中，各支路两端的电压相等，都等于电源两端的电压：<span className="font-formula italic">U = U₁ = U₂</span>。</p>
          <p className="mt-3 text-[13.5px] text-white/65">串联时两只灯规格不同，分到的电压也不同；规格相同时两者相等，那只是特例。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">六个电压都记下了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">串联电路总电压等于各部分电压之和；并联各支路两端电压相等</p>
          <p className="mt-3 font-formula text-[18px] italic text-white/80">{f1(voltmeterAt('series', 'L1'))} V + {f1(voltmeterAt('series', 'L2'))} V = {f1(voltmeterAt('series', 'src'))} V</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{AC_NAME[ac]}的电压 {SYM[ac]}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{settled ? f1(U) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">V</span></div>
          </div>
          <DialView kind="V" range="lo" k={m.k} />
          <h2 className="mt-4 text-[12.5px] text-white/55">电路图</h2>
          <Schematic link={link} on={on} lit1={live ? c.b1 : 0} lit2={live ? c.b2 : 0} volt={ac} hot={{ main: live, b1: live, b2: live }} />
          <h2 className="mt-4 text-[12.5px] text-white/55">数据</h2>
          <Table head={head} rows={[show('series'), show('parallel')]} total={2} hi={last === 'series' ? 0 : last ? 1 : undefined} eq={T.finale} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!settled || done[ac] !== undefined}>记录数据</LabButton>
        <LabButton primary={next === 'link'} pulse={next === 'link'} onClick={toParallel} disabled={link === 'parallel' || !T.done.s_2}>换成并联电路</LabButton>
      </>}
      extras={
        <Control label="电压表接在">
          <Segmented label="电压表接在" pulse={next === 'ac'} want={want} disabled={!wired} value={ac} onChange={setAc} options={AC.map(a => ({ value: a, label: AC_NAME[a] }))} />
        </Control>
      }
    />
  )
}
