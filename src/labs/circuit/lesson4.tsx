// 电路 · 第 4 课 串、并联电路中电流的规律：两只规格不同的灯，一只电流表轮流接在 A、B、C 三处。
// 串联：三处都是 0.12 A。并联：L₁ 支路（A）0.30 A，L₂ 支路（B）0.20 A，干路（C）0.50 A。
// 换位置时开关先断开，电流表挪过去、导线接好，再自动合上开关。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { add } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Bench, Place, ease, lerp3, toWorld, useRun, useSettled } from './parts'
import { LINK_NAME, ammeterAt, meterRead, round, twoLamps, type Link, type Point } from './physics'
import { AMP_AT, POINT_TAG, TwoLampRig } from './rig'
import { DialView, Schematic, Table } from './views'
import type { V3 } from './world'

const f2 = (x: number) => x.toFixed(2)
const TASKS: Task[] = [
  { id: 's_A', text: '串联：电流表接在 A 处，记一次', note: `A 处的电流是 ${f2(ammeterAt('series', 'A'))} A` },
  { id: 's_BC', text: '再接到 B、C 两处，各记一次', note: `三处都是 ${f2(ammeterAt('series', 'C'))} A：串联电路中电流处处相等` },
  { id: 'p_AB', text: '换成并联：在 L₁、L₂ 两条支路上（A、B）各记一次', note: `L₁ 支路 ${f2(ammeterAt('parallel', 'A'))} A，L₂ 支路 ${f2(ammeterAt('parallel', 'B'))} A：规格不同，支路电流不一样` },
  { id: 'p_C', text: '在干路上（C）记一次', note: `干路 ${f2(ammeterAt('parallel', 'C'))} A = ${f2(ammeterAt('parallel', 'A'))} A + ${f2(ammeterAt('parallel', 'B'))} A` },
]
const PTS: Point[] = ['A', 'B', 'C']
const PLACE: Record<Link, Record<Point, string>> = { series: { A: 'L₁ 和电源负极之间', B: '两只灯之间', C: '开关和 L₂ 之间' }, parallel: { A: 'L₁ 支路', B: 'L₂ 支路', C: '干路' } }
const W = (p: V3) => toWorld('l4', p)

export default function Lesson4() {
  const [link, setLink] = useState<Link>('series')
  const [at, setAt] = useState<Point>('A'), [from, setFrom] = useState<Point>('A')
  const [on, setOn] = useState(true)
  const [rows, setRows] = useState<Record<Link, Partial<Record<Point, number>>>>({ series: {}, parallel: {} })
  const [last, setLast] = useState<string | null>(null)
  const T = useTasks('gewu:circuit:4', TASKS)
  const move = useSlide(link === 'parallel' ? 1 : 0, 1.1), wired = move === (link === 'parallel' ? 1 : 0)
  const hop = useRun(1.1, () => setOn(true))
  const knife = useSlide(on ? 1 : 0, 2.6), live = knife > 0.99 && wired && !hop.busy
  const c = twoLamps(link, true), I = ammeterAt(link, at), m = meterRead('A', 'lo', live ? I : 0)
  const settled = useSettled(`${link}${at}${live}`, 1300) && live
  // 电流表从一处挪到另一处：先提起来，平移过去，再放下
  const k = ease(hop.k), p0 = AMP_AT[link][from], p1 = AMP_AT[link][at]
  const ampPos: V3 | null = hop.busy ? add(lerp3(p0, p1, k), [0, Math.sin(k * Math.PI) * 6, 0]) : null
  const pick = (p: Point) => { if (p === at || hop.busy) return; setOn(false); setFrom(at); setAt(p); hop.snap(0); setTimeout(() => hop.run(), 350) }
  const toParallel = () => { setOn(false); setLink('parallel'); setAt('A'); setFrom('A'); setTimeout(() => setOn(true), 1400) }
  const done = rows[link]
  const record = () => {
    if (!settled || done[at] !== undefined) return
    const n = { ...rows, [link]: { ...done, [at]: round(I, 2) } }; setRows(n); setLast(`${link}${at}`)
    T.check(id => id === 's_A' ? n.series.A !== undefined : id === 's_BC' ? n.series.B !== undefined && n.series.C !== undefined : id === 'p_AB' ? n.parallel.A !== undefined && n.parallel.B !== undefined : n.parallel.C !== undefined && T.done.p_AB)
  }
  const resetAll = () => { setLink('series'); setAt('A'); setFrom('A'); setOn(true); hop.snap(0); setRows({ series: {}, parallel: {} }); setLast(null); T.reset() }
  const task = T.current
  const todo: Point | null = !task ? null : task.id === 's_A' ? 'A' : task.id === 's_BC' ? (done.B === undefined && link === 'series' ? 'B' : 'C') : task.id === 'p_AB' ? (done.A === undefined ? 'A' : 'B') : 'C'
  const needLink = !!task && task.id.startsWith('p') && link === 'series'
  const want = !needLink && todo && todo !== at ? todo : null
  const busy = hop.busy || !wired || !live
  const { hint, next }: { hint: string; next: 'rec' | 'link' | 'pt' | null } = !task ? { hint: '串联电路中电流处处相等；并联电路中干路电流等于各支路电流之和。', next: null }
    : needLink ? { hint: '串联的三处都一样。按“换成并联电路”', next: 'link' }
    : busy ? { hint: hop.busy ? '断开开关，电流表挪过去，接好导线…' : '接好了，闭合开关…', next: null }
    : want ? { hint: `把电流表接到 ${want} 处（${PLACE[link][want]}）`, next: 'pt' }
    : !settled ? { hint: '指针在摆…', next: null }
    : { hint: `电流表在 ${at} 处，读下面一排刻度。按“记录数据”`, next: 'rec' }
  const M = AMP_AT[link][at]
  const labels: Label[] = [
    { id: 'r', at: W(add(ampPos ?? M, [0, 11.4, -2])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: settled ? 1 : 0 }, children: <><small>I<sub>{at}</sub></small>{f2(I)} A</> },
    ...PTS.filter(p => p !== at || hop.busy).map(p => ({ id: `p${p}`, at: W(POINT_TAG[link][p]), ax: 0.5, className: 'scene-name -translate-y-full', children: `${p} 处` })),
    { id: 'pm', at: W(add(ampPos ?? M, [-6.6, 3, 3])), ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: hop.busy ? 0 : 1 }, children: <><small>接在</small>{at} 处</> },
  ]
  const head = ['', ...PTS.map(p => <span key={p} className="font-formula italic">I<sub>{p}</sub> / A</span>)]
  const show = (l: Link) => [LINK_NAME[l], ...PTS.map(p => rows[l][p] !== undefined ? f2(rows[l][p]!) : '—')]
  return (
    <LabShell title="电路" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="电流表"
      stage={<Place at="l4" labels={labels}>
        <Bench at="l4"><TwoLampRig link={link} c={live ? c : twoLamps(link, false)} knife={knife} move={move} wired={wired} amp={at} ampK={m.k} ampPos={ampPos} /></Bench>
      </Place>}
      lesson={<LessonBlock no="4" title="串、并联电路中电流的规律" concept="串联处处相等，并联干路等于支路之和" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>串联电路中，电流只有一条路径，流过 A、B、C 各处的电流相等：<span className="font-formula italic">I<sub>A</sub> = I<sub>B</sub> = I<sub>C</sub></span>。</p>
          <p className="mt-3">并联电路中，干路电流在分支处分成两股，干路电流等于各支路电流之和：<span className="font-formula italic">I = I₁ + I₂</span>。</p>
          <p className="mt-3 text-[13.5px] text-white/65">要用规格不同的两只灯泡，并多做几次。两只灯一样时，并联的两条支路电流也一样，容易误以为“支路电流总相等”。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">六个数都记下了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">串联电路中电流处处相等；并联电路中干路电流等于各支路电流之和</p>
          <p className="mt-3 font-formula text-[18px] italic text-white/80">{f2(ammeterAt('parallel', 'C'))} A = {f2(ammeterAt('parallel', 'A'))} A + {f2(ammeterAt('parallel', 'B'))} A</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{at} 处的电流（{PLACE[link][at]}）</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{settled ? f2(I) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">A</span></div>
          </div>
          <DialView kind="A" range="lo" k={m.k} />
          <h2 className="mt-4 text-[12.5px] text-white/55">电路图</h2>
          <Schematic link={link} on={on && !hop.busy} lit1={live ? c.b1 : 0} lit2={live ? c.b2 : 0} amp={at} hot={{ main: live, b1: live, b2: live }} />
          <h2 className="mt-4 text-[12.5px] text-white/55">数据</h2>
          <Table head={head} rows={[show('series'), show('parallel')]} total={2} hi={last?.startsWith('series') ? 0 : last ? 1 : undefined} eq={T.finale} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!settled || done[at] !== undefined}>记录数据</LabButton>
        <LabButton primary={next === 'link'} pulse={next === 'link'} onClick={toParallel} disabled={link === 'parallel' || !T.done.s_BC}>换成并联电路</LabButton>
      </>}
      extras={
        <Control label="电流表接在">
          <Segmented label="电流表接在" pulse={next === 'pt'} want={want} disabled={hop.busy || !wired} value={at} onChange={pick} options={PTS.map(p => ({ value: p, label: `${p} 处` }))} />
        </Control>
      }
    />
  )
}
