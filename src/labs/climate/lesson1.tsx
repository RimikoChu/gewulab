// 天气和气候 · 第 1 课 天气和气候：站房前的天气预报屏。换着读今天、明天、后天的预报，观测场上空跟着变；
// 再看这里多年平均的气温和降水，分清“天气”和“气候”。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import type { BoardView } from './boards'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Fin, Rows, nameTag } from './parts'
import { FORECAST, annual, annualMeanTemp, type DayKey } from './physics'
import { P } from './station'
import { VOICE } from './voice'
import { NEAR, SPOT, type Want } from './world'

const NAMES: Record<BoardView, string> = { today: '今天', tomorrow: '明天', after: '后天', avg: '多年平均' }
const TASKS: Task[] = [
  { id: 'today', text: '读今天的天气预报', note: '今天晴，22～31 ℃' },
  { id: 'tomorrow', text: '换到明天，再读一条', note: '明天就转成小雨，凉了好几度：天气变得很快' },
  { id: 'after', text: '读后天的预报', note: '后天又转多云。几天之内阴晴冷暖一直在变' },
  { id: 'avg', text: '看这里多年平均的气温和降水', note: '' },
]
const HINT: Record<BoardView, string> = {
  today: '读一读今天的预报，记下来', tomorrow: '读一读明天的预报，记下来', after: '读一读后天的预报，记下来', avg: '读一读这里多年平均的气温和降水，记下来',
}
const MEAN = Math.round(annualMeanTemp()), YEAR = annual()

export default function Lesson1() {
  const [view, setView] = useState<BoardView>('today')
  const [settled, setSettled] = useState(false)
  const [got, setGot] = useState<BoardView[]>([])
  const T = useTasks('gewu:climate:1', TASKS)
  useEffect(() => { setSettled(false); const t = setTimeout(() => setSettled(true), 1800); return () => clearTimeout(t) }, [view])
  const read = () => { if (!settled || got.includes(view)) return; const n = [...got, view]; setGot(n); T.check(id => n.includes(id as BoardView)) }
  const resetAll = () => { setView('today'); setGot([]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'view' | 'read' | null } = (() => {
    if (!task) return { hint: '都做完了。天气多变，气候是多年的平均状况。', next: null }
    if (view !== task.id) return { hint: `把屏幕换到“${NAMES[task.id as BoardView]}”`, next: 'view' }
    if (!settled) return { hint: '天空在变…', next: null }
    return { hint: HINT[view], next: 'read' }
  })()

  const wx = view === 'avg' ? 'cloud' : FORECAST[view as DayKey].wx
  const labels: Label[] = [
    nameTag('nb', [P.forecast[0], 3.35, P.forecast[2]], '天气预报屏'),
    nameTag('nf', [P.forecast[0] + 12, 1.3, P.forecast[2] - 4], '观测场'),
  ]
  const s = SPOT.forecast
  return (
    <LabShell narration={voiced(NARRATION['1'], VOICE)} title="天气和气候" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="预报屏"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...NEAR} sun={wx === 'rain' ? 1.2 : wx === 'cloud' ? 2.4 : 3.4} env={wx === 'rain' ? 0.55 : 0.8} world={{ board: view, wx, windFrom: view === 'tomorrow' ? 225 : 180 }}>{null}</LabStage>}
      lesson={<LessonBlock no="1" title="天气和气候" concept="天气多变，气候是多年的平均状况" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">天气</b>是一个地方短时间里的阴晴、冷暖、风雨等状况，变化很快，今天和明天可能大不一样。</p>
          <p className="mt-2"><b className="text-white">气候</b>是一个地方多年的天气平均状况，比较稳定。“夏季高温多雨、冬季寒冷干燥”说的是气候。</p>
          <p className="mt-2 text-[13.5px] text-white/65">天气预报用符号表示天气：太阳是晴，太阳加云是多云，云下画雨丝是雨；还要报气温和风向、风力。</p>
        </>} />}
      finale={T.finale && <Fin kicker="四条都读过了" big="天气多变，气候是多年的平均状况" small={`三天里从晴转小雨又转多云，是天气；这里年平均气温约 ${MEAN} ℃、年降水量 ${YEAR} mm、夏季多雨，是气候。`} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{view === 'avg' ? '山前气象站 · 多年平均（示意）' : `山前气象站 · ${NAMES[view]}`}</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{view === 'avg' ? <>约 {MEAN}<span className="ml-1 text-[15px] font-medium text-white/55">℃ · 年平均</span></> : <>{FORECAST[view as DayKey].text}<span className="ml-2 text-[22px] font-semibold">{FORECAST[view as DayKey].lo}～{FORECAST[view as DayKey].hi} ℃</span></>}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="时间" value={view === 'avg' ? '多年' : '一天'} unit={view === 'avg' ? '平均状况，稳定' : '短时间，多变'} />
            <ParamTile symbol={view === 'avg' ? '降水' : '风'} value={view === 'avg' ? `${YEAR} mm` : FORECAST[view as DayKey].wind} unit={view === 'avg' ? '年降水量' : '风向、风力'} />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">记下来的</h2>
          {got.length ? <Rows head={['', '天气 / 气候', '气温']} rows={got.map(k => k === 'avg' ? ['多年平均', '夏季多雨', `年平均约 ${MEAN} ℃`] : [NAMES[k], FORECAST[k as DayKey].text, `${FORECAST[k as DayKey].lo}～${FORECAST[k as DayKey].hi} ℃`])} /> : <p className="mt-2 text-[13.5px] text-white/50">还没有记录</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'read'} onClick={read} disabled={!settled || got.includes(view)}>读这一条</LabButton>
      </>}
      extras={
        <Control label="屏幕上显示">
          <Segmented label="屏幕" pulse={next === 'view'} want={next === 'view' ? (task?.id as BoardView) : null} value={view} onChange={v => setView(v as BoardView)} options={(['today', 'tomorrow', 'after', 'avg'] as BoardView[]).map(k => ({ value: k, label: NAMES[k] }))} />
        </Control>
      }
    />
  )
}
