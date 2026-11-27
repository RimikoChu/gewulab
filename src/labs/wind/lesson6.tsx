// 热力环流和风 · 第 6 课 近地面的风：海边步道上方铺着一张近地面天气图，左半边下面是海、右半边是陆地。
// 近地面的空气还受摩擦力：风偏到一半就停住，斜穿等压线。海面摩擦小、陆地摩擦大。最后看风向袋，读出风向。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { WeatherMap, mapLabels } from './map'
import { NARRATION } from './narration'
import { Big, Fin, Rows, noteTag, useRun } from './parts'
import { CASES, steadyWind, windAt, windName } from './physics'
import { VOICE } from './voice'
import { COAST, P, SPOT, skyFor, type Want } from './world'

const TASKS: Task[] = [
  { id: 'sea', text: '在海面上放出一团空气', note: '海面摩擦小：风和等压线夹角约 22°，风速约 8.5 m/s' },
  { id: 'land', text: '在陆地上再放一次', note: '陆地摩擦大：夹角约 42°，风速只有约 6.8 m/s' },
  { id: 'read', text: '看海边的风向袋，读出风向', note: '风向袋鼓向东北：风从西南吹来，是西南风' },
]
type Key = 'sea' | 'land'
const VALUES = [1012, 1008, 1004, 1000]
const C = SPOT.low.target, CEN: [number, number, number] = [C.x, 9, -3], W = 28, D = 24
const START: Record<Key, [number, number]> = { sea: [-10, 8], land: [3.5, 8] }
const RUN = 5

export default function Lesson6() {
  const [kind, setKind] = useState<Key>('sea')
  const run = useRun(1, RUN)
  const [started, setStarted] = useState(false)
  const [read, setRead] = useState(false)
  const T = useTasks('gewu:wind:6', TASKS)
  const done = started && !run.on && run.v >= RUN
  useEffect(() => { if (done) T.check(id => id === kind) }, [done])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (k: Key) => { setKind(k); run.reset(); setStarted(false) }
  const release = () => { setStarted(true); run.start() }
  const doRead = () => { setRead(true); setTimeout(() => T.check(id => id === 'read'), 1500) }
  const resetAll = () => { pick('sea'); setRead(false); T.reset() }

  const task = T.current
  const want: Key | null = task?.id === 'sea' ? 'sea' : task?.id === 'land' ? 'land' : null
  const { hint, next }: { hint: string; next: 'go' | 'kind' | 'read' | null } = (() => {
    if (!task) return { hint: '都做完了。近地面的风斜穿等压线。', next: null }
    if (task.id === 'read') return read ? { hint: '风向袋鼓起来的方向…', next: null } : { hint: '风稳定下来了。看风向袋，读出风向', next: 'read' }
    if (want && kind !== want) return { hint: `换到“${CASES[want].name}”`, next: 'kind' }
    if (run.on) return { hint: `${CASES[kind].name}，看它怎样偏转…`, next: null }
    return { hint: `在${CASES[kind].name}放出一团空气`, next: 'go' }
  })()

  const w = windAt(kind, run.v), st = steadyWind(kind)
  const sockTo = started ? w.theta : 60, sockK = started ? Math.min(1, w.speed * st.v! / 9) : 0.25
  const labels: Label[] = [
    ...mapLabels(CEN, W, D, VALUES, kind, run.v, started, START[kind]),
    noteTag('sea', [COAST - 8, 2, 12], '海面', true), noteTag('land', [COAST + 9, 2.5, 12], '陆地', true),
    { id: 'sock', at: [P.sock[0] + 1.4, P.sock[1] + 6.6, P.sock[2]], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: read ? 1 : 0 }, children: <><small>风向袋</small>{windName(steadyWind('land').theta)}</> },
  ]
  const s = SPOT.low
  return (
    <LabShell narration={voiced(NARRATION['6'], VOICE)} title="热力环流和风" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="气块"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...skyFor(1)} world={{ day: 1, sock: { to: sockTo, k: sockK } }}>
        <WeatherMap c={CEN} w={W} d={D} values={VALUES} kind={kind} t={run.v} started={started} start={START[kind]} />
      </LabStage>}
      lesson={<LessonBlock no="6" title="近地面的风" concept="近地面的风斜穿等压线" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>近地面的空气除了受水平气压梯度力和地转偏向力，还受<b className="text-white">摩擦力</b>：它和风向相反，使风速减小。</p>
          <p className="mt-2">三个力平衡时，风向和等压线<b className="text-white">斜交</b>：北半球偏在水平气压梯度力的右边，南半球偏在左边。地面越粗糙、摩擦力越大，风速越小，风向和等压线的夹角越大。</p>
          <p className="mt-2"><b className="text-white">风向是风吹来的方向</b>。风向袋鼓起来朝哪边，风就往哪边吹；风是从它的反方向来的。</p>
          <p className="mt-2 text-[13.5px] text-white/65">图是示意的天气图：等压线每隔 4 hPa 一条，相距 500 km，北纬 30°。海面、陆地的摩擦大小是示意值，偏转的过程放快了画。</p>
        </>} />}
      finale={T.finale && <Fin kicker="海面、陆地都放过了" big="近地面的风斜穿等压线" small="近地面多了摩擦力，风偏不到和等压线平行就稳定了。摩擦越大，夹角越大、风越小：海面上约 22°、8.5 m/s，陆地上约 42°、6.8 m/s，吹西南风。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label="风向和等压线的夹角" value={done ? `${Math.round(st.cross)}` : started ? `${Math.round(90 - Math.abs(w.theta))}` : '—'} unit="°" />
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="风向" value={started ? windName(w.theta) : '—'} unit="风从哪里吹来" />
            <ParamTile symbol="v" value={done ? `约 ${st.v!.toFixed(1)} m/s` : '—'} unit="稳定后的风速" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">稳定以后</h2>
          <Rows head={['', '夹角', '风速']} rows={(['sea', 'land'] as Key[]).map(k => [CASES[k].name, T.done[k] ? `约 ${steadyWind(k).cross.toFixed(0)}°` : '—', T.done[k] ? `约 ${steadyWind(k).v!.toFixed(1)} m/s` : '—'])} />
          <p className="mt-3 text-[13px] leading-relaxed text-white/60">橙色是水平气压梯度力，紫色是地转偏向力，灰色是摩擦力，青色是风向。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={release} disabled={run.on || (want !== null && kind !== want) || task?.id === 'read'}>放出一团空气</LabButton>
        <LabButton primary={next === 'read'} pulse={next === 'read'} onClick={doRead} disabled={task?.id !== 'read' || read}>读风向</LabButton>
      </>}
      extras={
        <Control label="下垫面">
          <Segmented label="下垫面" pulse={next === 'kind'} want={want} value={kind} onChange={k => pick(k as Key)} disabled={run.on} options={(['sea', 'land'] as Key[]).map(k => ({ value: k, label: CASES[k].name }))} />
        </Control>
      }
    />
  )
}
