// 水循环 · 第 5 课 修一座水库（人类活动改变地表径流的时间分配）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import Basin from './basin'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { FLOW, flowAt, flowRange, meanFlow } from './physics'
import { ground, riverZ } from './world'

type Dam = 'no' | 'yes'
const NAME: Record<Dam, string> = { no: '没有水库', yes: '修好了水库' }
const TASKS: Task[] = [
  { id: 'no', text: '没有水库：过一年，记下最大和最小的月流量', note: `夏天 ${flowRange(false).max}，冬天只有 ${flowRange(false).min}：汛期发洪水，枯水期没水用` },
  { id: 'yes', text: '修好水库：再过一年，再记一次', note: `最大降到 ${flowRange(true).max}，最小升到 ${flowRange(true).min}：汛期蓄水，枯水期放水` },
]
const CW = 264, CH = 92, bx = (m: number) => (m + 0.5) / 12 * CW, by = (q: number) => CH - q / 210 * CH

export default function Lesson5() {
  const [dam, setDam] = useState<Dam>('no')
  const [goal, setGoal] = useState(0)
  const [rows, setRows] = useState<Dam[]>([])
  const T = useTasks('gewu:watercycle:5', TASKS)
  const t = useSlide(goal, 3.2), moving = Math.abs(t - goal) > 0.01, month = Math.min(11, Math.floor(t)), done = goal === 11.99 && !moving
  const has = dam === 'yes', q = flowAt(month, has), dup = rows.includes(dam)
  const pick = (d: Dam) => { if (moving) return; setDam(d); setGoal(0) }
  const record = () => { if (!done || dup) return; const next = [...rows, dam]; setRows(next); T.check(id => next.includes(id as Dam)) }
  const resetAll = () => { setDam('no'); setGoal(0); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'dam' | 'run' | 'record' | null } = !task ? { hint: '两年都记完了。水库把洪水存起来，留到枯水期用。', next: null }
    : moving ? { hint: goal ? `${month + 1} 月：${has ? (FLOW[month] > meanFlow() ? '来水多，水库在蓄水' : '来水少，水库在放水') : '河里来多少水就流走多少'}` : '回到 1 月…', next: null }
    : dam !== task.id ? { hint: `把水库换成“${NAME[task.id as Dam]}”`, next: 'dam' }
    : done && !dup ? { hint: '一年过完了：按“记录”', next: 'record' } : { hint: '按“过一年”', next: 'run' }
  const dx = 9.5, labels: Label[] = [
    { id: 'q', at: [0, ground(0, riverZ(0)) + 1.6, riverZ(0)], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>{month + 1} 月 · 下游流量</small>{q.toFixed(0)}</> },
    ...(has ? [{ id: 'dam', at: [dx + 3, ground(dx, riverZ(dx)) + 4.4, riverZ(dx)] as [number, number, number], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '水库' }] : []),
  ]

  return (
    <LabShell title="水循环" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="时间"
      stage={<Basin at="dam" labels={labels} want={{ dam: has, flow: q / meanFlow(), rain: FLOW[month] > 100 && goal > 0 ? ['land'] : [] }} />}
      lesson={<LessonBlock no="5" title="修一座水库" concept="水库改变的是河水在一年里的分配" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>很多河流夏天雨多、水大，冬天雨少、水小。修水库就是在汛期把一部分洪水拦在库里，到枯水期再放出来。</p>
          <p className="mt-3">这样改变的是<b className="text-white">地表径流</b>这个环节在<b className="text-white">时间</b>上的分配：一年里流走的总水量差不多，但各月之间的差别小了。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里的流量是相对值，水库的作用按“把丰枯之间的差削掉六成”来算，只用来比较大小。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两年的流量比完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">水库削低了洪峰，补上了枯水</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">最大月流量从 {flowRange(false).max} 降到 {flowRange(true).max}，最小月从 {flowRange(false).min} 升到 {flowRange(true).min}。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{NAME[dam]} · {month + 1} 月 · 下游流量</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{q.toFixed(0)}</div>
            <div className="mt-1 text-[12.5px] text-white/50">相对值，年平均 = {meanFlow()}</div>
          </div>
          <svg viewBox={`-2 -4 ${CW + 4} ${CH + 20}`} className="mt-3 w-full" role="img" aria-label="一年十二个月的流量">
            {FLOW.map((v, m) => <rect key={m} x={bx(m) - 7} y={by(v)} width={14} height={CH - by(v)} fill="#ffffff" opacity={0.16} />)}
            {has && <path d={FLOW.map((_, m) => `${m ? 'L' : 'M'}${bx(m)},${by(flowAt(m, true))}`).join(' ')} fill="none" stroke="#7fe3d4" strokeWidth={2} />}
            <line x1={0} y1={by(meanFlow())} x2={CW} y2={by(meanFlow())} stroke="#ffffff" strokeOpacity={0.25} strokeDasharray="3 4" />
            <circle cx={bx(month)} cy={by(q)} r={4.5} fill="#ffe14d" />
            {[0, 2, 4, 6, 8, 10].map(m => <text key={m} x={bx(m)} y={CH + 13} textAnchor="middle" fontSize={10} fill="#ffffff" fillOpacity={0.5}>{m + 1} 月</text>)}
          </svg>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="最大月" value={String(flowRange(has).max)} unit="汛期" />
            <ParamTile symbol="最小月" value={String(flowRange(has).min)} unit="枯水期" />
          </div>
          {rows.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">情况</th><th className="text-right font-normal">最大月</th><th className="text-right font-normal">最小月</th></tr></thead>
            <tbody>{rows.map(d => <tr key={d} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{NAME[d]}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{flowRange(d === 'yes').max}</td><td className="text-right tabular-nums">{flowRange(d === 'yes').min}</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'run'} onClick={() => setGoal(11.99)} disabled={moving || goal > 0}>过一年</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!done || dup}>记录</LabButton>
      </>}
      extras={<Control label="水库"><Segmented label="水库" pulse={next === 'dam'} want={next === 'dam' ? task!.id as Dam : null} value={dam} disabled={moving} onChange={pick} options={(['no', 'yes'] as Dam[]).map(d => ({ value: d, label: d === 'no' ? '没有' : '修好了' }))} /></Control>}
    />
  )
}
