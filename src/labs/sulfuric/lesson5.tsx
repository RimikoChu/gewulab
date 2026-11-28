// 接触法制硫酸 · 第 5 课 压强和空气用量。镜头从高处俯看转化工段：二氧化硫鼓风机、热交换器、接触室和它们之间的管道。
// 换压强：常压下转化率已经很高，加到 10 MPa 只多 2 个百分点；把空气减到氧气恰好够，转化率明显下降：所以用常压、通入过量空气。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Flow, GAS } from './flow'
import { LESSONS, goLesson } from './lessons'
import { useRun, type V3 } from './parts'
import { FEED, O2_EXACT, PRESS, T5, fmt1, gainByPressure, xEq, xTable } from './physics'
import { BLOW, CONV, HXV, ride } from './plant'
import { COL, MiniChart, type ChartSpec } from './screen'
import { Place } from './world'

type Pk = `${(typeof PRESS)[number]}`
const TASKS: Task[] = [
  { id: 'p0.1', text: '常压（0.1 MPa）、过量空气，记录', note: `常压下平衡转化率已经有 ${fmt1(xTable(T5, 0.1))}%` },
  { id: 'p10', text: '加压到 10 MPa，记录', note: `压强加到 100 倍，转化率只多了 ${fmt1(gainByPressure(10))} 个百分点，却要耐压的设备和更多动力` },
  { id: 'air', text: '回到常压，把空气减到氧气恰好够，记录', note: `氧气不过量，SO₂ 的平衡转化率降到约 ${fmt1(xEq(T5, 0.1, O2_EXACT))}%` },
]
const C = CONV
/** 这个条件下的平衡转化率：过量空气时取教材数据表，氧气恰好够时按平衡常数推算 */
const conv = (p: number, exact: boolean) => (exact ? xEq(T5, p, O2_EXACT) : xTable(T5, p))

export default function Lesson5() {
  const T = useTasks('gewu:sulfuric:5', TASKS)
  const [pk, setPk] = useState<Pk>('0.1')
  const [exact, setExact] = useState(false)
  const [rows, setRows] = useState<string[]>([])
  const settle = useRun(1.4)
  const p = +pk, x = conv(p, exact), id = exact ? (p === 0.1 ? 'air' : `x${pk}`) : `p${pk}`
  const resetAll = () => { setPk('0.1'); setExact(false); setRows([]); settle.snap(0); T.reset() }
  const choose = (k: Pk) => { if (settle.busy) return; setPk(k); settle.run() }
  const toggle = () => { if (settle.busy) return; setExact(e => !e); settle.run() }
  const record = () => { if (settle.busy || rows.includes(id)) return; setRows(r => [...r, id]); T.check(t => t === id) }
  const task = T.current?.id
  const wantP: Pk | null = !task ? null : task === 'p10' ? '10' : '0.1'
  const wantExact = task === 'air'
  const next: 'seg' | 'air' | 'rec' | null = !task || settle.busy ? null : exact !== wantExact ? 'air' : pk !== wantP ? 'seg' : 'rec'
  const hint = !task ? '常压下转化率已经很高，多给空气更划算。'
    : settle.busy ? '装置换到新的条件…'
    : exact !== wantExact ? (wantExact ? '把空气减到氧气恰好够反应' : '先恢复过量空气')
    : pk !== wantP ? `把压强调到 ${wantP} MPa`
    : `${pk} MPa、${exact ? '氧气恰好够' : '过量空气'}。记录这一组`

  const paths = useMemo<V3[][]>(() => [ride('d2b'), ride('b2h'), [[HXV.x, 3.4, HXV.r + 0.15], [HXV.x, 12.6, HXV.r + 0.15]], ride('h2c'), ride('c2h'), ride('h2a').slice(0, 5)], [])
  const xs = PRESS.map((_, i) => i)
  const spec: ChartSpec = {
    x: { min: -0.3, max: 3.3, label: 'p / MPa', ticks: xs, fmt: v => `${PRESS[v]}` }, y: { min: 85, max: 100, label: 'SO₂ 的平衡转化率 / %', ticks: [85, 90, 95, 100] },
    lines: [{ color: COL.eq, xs, ys: PRESS.map(q => conv(q, false)) }, { color: COL.none, xs, ys: PRESS.map(q => conv(q, true)), dash: true }],
    dots: [{ x: PRESS.indexOf(p as (typeof PRESS)[number]), y: x, color: exact ? COL.none : COL.eq }],
  }
  const o2 = exact ? O2_EXACT : FEED.o2
  const labels: Label[] = [
    { id: 'n1', at: [BLOW.x + 1.5, 6.0, BLOW.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '二氧化硫鼓风机' },
    { id: 'n2', at: [HXV.x, HXV.y1 + 2.4, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '热交换器' },
    { id: 'n3', at: [C.x + 2.5, C.y1 + 2.0, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '接触室' },
    { id: 'p', at: [BLOW.x, 5.2, BLOW.z + 1.6], ax: 0.5, className: `scene-tag ${settle.busy ? '' : 'key'} -translate-y-full`, children: <><small>压强</small>{pk} MPa</> },
    { id: 'o2', at: [BLOW.x + 0.5, 0.6, BLOW.z + 3.4], ax: 0.5, className: 'scene-tag', style: { borderLeft: `4px solid ${GAS.air}` }, children: <><small>原料气</small>SO₂ {FEED.so2}%、O₂ {o2}%</> },
    { id: 'x', at: [C.x - 1.5, 8.6, C.r + 0.3], ax: 0.5, className: 'scene-tag -translate-y-1/2', children: <><small>{T5} °C 平衡转化率</small>{fmt1(x)}%</> },
  ]
  const name = (r: string) => r === 'air' ? ['0.1', '恰好够'] : r.startsWith('x') ? [r.slice(1), '恰好够'] : [r.slice(1), '过量']
  return (
    <LabShell title="接触法制硫酸" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="转化工段"
      stage={<Place at="l5" labels={labels} hot={0.4}>
        <Flow paths={paths} density={1.5} speed={3.2} size={0.14} color={(_u, q, i) => (i % (exact ? 5 : 3) === 0 ? GAS.air : q < 4 ? GAS.so2 : (x / 100 > ((i * 7) % 10) / 10 ? GAS.so3 : GAS.so2))} />
      </Place>}
      lesson={<LessonBlock no="5" title="压强和空气用量" concept="常压就够，多给空气更划算" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p><span className="font-formula">2SO₂ + O₂ ⇌ 2SO₃</span> 的正反应气体分子数减小，<b className="text-white">增大压强</b>，平衡向生成 SO₃ 的方向移动。</p>
          <p className="mt-3">但从数据表看，<b className="text-white">常压</b>下 SO₂ 的平衡转化率已经很高，再加压提高不了多少，反而要用耐高压的设备、消耗更多的动力。所以工业上采用常压。</p>
          <p className="mt-3">空气便宜。<b className="text-white">通入过量的空气</b>，增大 O₂ 的浓度，平衡正向移动，可以提高更贵的原料 SO₂ 的转化率。</p>
          <p className="mt-3">过量空气的那条线取自教材的数据表（{T5} °C，原料气中 SO₂ {FEED.so2}%、O₂ {FEED.o2}%）。“氧气恰好够”的那条线是把 O₂ 改成 {O2_EXACT}%、用同一个平衡常数推算出来的。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">采用常压，通入过量空气</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{T5} °C 时，常压下平衡转化率 {fmt1(xTable(T5, 0.1))}%，加到 10 MPa 是 {fmt1(xTable(T5, 10))}%，只多 {fmt1(gainByPressure(10))} 个百分点。氧气恰好够时只有约 {fmt1(xEq(T5, 0.1, O2_EXACT))}%：多通空气能提高 SO₂ 的转化率。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-center">
          <div className="text-[13px] text-white/60">SO₂ 的平衡转化率 · {T5} °C</div>
          <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{fmt1(x)}<span className="ml-1 text-[18px] font-medium text-white/55">%</span></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ParamTile symbol="p" value={pk} unit="MPa · 压强" />
          <ParamTile symbol="φ(O₂)" value={`${o2}%`} unit={exact ? '恰好够' : '过量空气'} />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55"><span style={{ color: COL.eq }}>— 过量空气</span> <span style={{ color: COL.none }}>┄ 氧气恰好够</span></h2>
        <MiniChart spec={spec} height={150} />
        <table className="mt-2 w-full border-separate border-spacing-y-1 text-[13.5px]">
          <thead><tr className="text-left text-[12px] text-white/50"><th className="pl-2.5 font-normal">压强 / MPa</th><th className="font-normal">空气</th><th className="pr-2 text-right font-normal">转化率</th></tr></thead>
          <tbody>{rows.length === 0 ? <tr className="bg-white/[0.04]"><td colSpan={3} className="rounded-lg px-2.5 py-1.5 text-white/45">还没有记录</td></tr> : rows.map(r => { const [a, b] = name(r); return <tr key={r} className="bg-white/[0.04]"><td className="rounded-l-lg px-2.5 py-1.5 tabular-nums">{a}</td><td>{b}</td><td className="rounded-r-lg pr-2 text-right tabular-nums">{fmt1(conv(+a, b === '恰好够'))}%</td></tr> })}</tbody>
        </table>
      </Panel>}
      actions={<>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} disabled={settle.busy || rows.includes(id)} onClick={record}>记录这一组</LabButton>
        <LabButton primary={next === 'air'} pulse={next === 'air'} disabled={settle.busy} onClick={toggle}>{exact ? '恢复过量空气' : '空气减到恰好够'}</LabButton>
      </>}
      extras={
        <Control label="压强 / MPa">
          <Segmented label="压强" pulse={next === 'seg'} want={wantP} disabled={settle.busy} value={pk} onChange={k => choose(k as Pk)} options={PRESS.map(q => ({ value: `${q}` as Pk, label: `${q}` }))} />
        </Control>
      }
    />
  )
}
