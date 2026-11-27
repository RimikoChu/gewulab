// 热力环流和风 · 第 5 课 高空的风：海的上空悬着一张高空天气图，高压在南、低压在北。放出一团空气：
// 只受水平气压梯度力时，它垂直等压线直奔低压；加上地转偏向力，北半球一路右偏，最后和等压线平行；南半球左偏。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { WeatherMap, mapLabels } from './map'
import { NARRATION } from './narration'
import { Big, Fin, useRun } from './parts'
import { CASES, MAP, steadyWind, windAt, windName, type CaseKey } from './physics'
import { VOICE } from './voice'
import { SPOT, skyFor, type Want } from './world'

const TASKS: Task[] = [
  { id: 'pgfOnly', text: '只有气压梯度力：放出一团空气', note: '风垂直于等压线，从高压吹向低压，越吹越快' },
  { id: 'north', text: '北半球高空：再放一次', note: '一路向右偏，最后和等压线平行，吹西风' },
  { id: 'south', text: '南半球高空：再放一次', note: '向左偏，最后也和等压线平行，吹东风' },
]
type Key = 'pgfOnly' | 'north' | 'south'
const KEYS: Key[] = ['pgfOnly', 'north', 'south']
const VALUES = [712, 708, 704, 700, 696]
const C = SPOT.high.target, CEN: [number, number, number] = [C.x, C.y, C.z], W = 36, D = 32
const START: Record<Key, [number, number]> = { pgfOnly: [0, 12], north: [-9, 12], south: [9, 12] }
const RUN = 7.5

export default function Lesson5() {
  const [kind, setKind] = useState<Key>('pgfOnly')
  const run = useRun(1, RUN)
  const [started, setStarted] = useState(false)
  const T = useTasks('gewu:wind:5', TASKS)
  const done = started && !run.on && run.v >= RUN
  useEffect(() => { if (done) T.check(id => id === kind) }, [done])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (k: Key) => { setKind(k); run.reset(); setStarted(false) }
  const release = () => { setStarted(true); run.start() }
  const resetAll = () => { pick('pgfOnly'); T.reset() }

  const task = T.current, want = (task?.id as Key) ?? null
  const { hint, next }: { hint: string; next: 'go' | 'kind' | null } = (() => {
    if (!task) return { hint: '都做完了。高空的风最后和等压线平行。', next: null }
    if (kind !== want) return { hint: `换成“${CASES[want!].name}”`, next: 'kind' }
    if (run.on) return { hint: kind === 'pgfOnly' ? '只受气压梯度力，看它往哪里走…' : kind === 'north' ? '北半球，看它怎样偏转…' : '南半球，看它怎样偏转…', next: null }
    return { hint: '放出一团空气，看它往哪里走', next: 'go' }
  })()

  const w = windAt(kind, run.v), st = steadyWind(kind)
  const cross = kind === 'pgfOnly' ? 90 : done ? Math.round(st.cross) : Math.round(90 - Math.abs(w.theta))
  const labels = mapLabels(CEN, W, D, VALUES, kind, run.v, started, START[kind])
  const s = SPOT.high
  return (
    <LabShell narration={voiced(NARRATION['5'], VOICE)} title="热力环流和风" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="气块"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...skyFor(1, [300, 1600])} world={{ day: 1 }}>
        <WeatherMap c={CEN} w={W} d={D} values={VALUES} kind={kind} t={run.v} started={started} start={START[kind]} />
      </LabStage>}
      lesson={<LessonBlock no="5" title="高空的风" concept="高空的风最后和等压线平行" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>同一水平面上的气压差，使空气受到<b className="text-white">水平气压梯度力</b>：它垂直于等压线，由高压指向低压，是形成风的直接原因。等压线越密，这个力越大，风越大。</p>
          <p className="mt-2">地球自转使水平运动的物体偏离原来的方向，这个力叫<b className="text-white">地转偏向力</b>：它始终和风向垂直，只改变风向、不改变风速；北半球向右偏，南半球向左偏，赤道上没有偏转。</p>
          <p className="mt-2">高空摩擦力很小，可以不计。风在两个力的作用下不断偏转，直到地转偏向力和水平气压梯度力大小相等、方向相反，<b className="text-white">风向和等压线平行</b>。</p>
          <p className="mt-2 text-[13.5px] text-white/65">图是示意的天气图：等压线每隔 4 hPa 一条，相距 {MAP.dn / 1000} km，北纬（南纬）{MAP.lat}°。偏转的过程放快了画。</p>
        </>} />}
      finale={T.finale && <Fin kicker="三种情形都放过了" big="高空的风最后和等压线平行" small={`只有气压梯度力时，风垂直等压线吹向低压；加上地转偏向力，北半球右偏、南半球左偏，转到和等压线平行时两个力平衡，风速约 ${steadyWind('north').v!.toFixed(1)} m/s。`} />}
      panel={
        <Glass className="px-4 py-4">
          <Big label="风向和等压线的夹角" value={started ? `${cross}` : '—'} unit="°" />
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="风向" value={started ? windName(w.theta) : '—'} unit="风从哪里吹来" />
            <ParamTile symbol="v" value={st.v === null ? (started ? '越来越大' : '—') : done ? `约 ${st.v.toFixed(1)} m/s` : '—'} unit="稳定后的风速" />
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-white/60">橙色是水平气压梯度力，紫色是地转偏向力，青色是风向。</p>
        </Glass>
      }
      actions={<LabButton primary pulse={next === 'go'} onClick={release} disabled={run.on || kind !== want && !!want}>放出一团空气</LabButton>}
      extras={
        <Control label="受力">
          <Segmented label="受力" pulse={next === 'kind'} want={want} value={kind} onChange={k => pick(k as Key)} disabled={run.on} options={KEYS.map(k => ({ value: k, label: CASES[k].name }))} />
        </Control>
      }
    />
  )
}
