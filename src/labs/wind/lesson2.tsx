// 热力环流和风 · 第 2 课 太阳辐射和削弱作用：气象观测站上空剖开一片大气。太阳短波辐射（黄）照下来，
// 一部分被云和大气反射、被大气吸收，其余到达地面；地面晒热后放出长波辐射（红），近地面大气跟着变暖。换成阴天再看一次。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Cloud, LONG, Motes, Ray, SHORT, Slab } from './air'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Big, Fin, Rows, noteTag } from './parts'
import { SKIES, dayMax, type SkyKey } from './physics'
import { VOICE } from './voice'
import { P, SPOT, skyFor, type Want } from './world'

const TASKS: Task[] = [
  { id: 'sun', text: '让太阳照下来', note: '太阳辐射穿过大气，一部分被反射、被吸收' },
  { id: 'noon', text: '等到午后，看地面放出什么', note: '地面晒热了，放出长波辐射，烘暖了近地面的空气' },
  { id: 'cloudy', text: '换成阴天，再看到达地面的有多少', note: '云把大部分阳光反射回去，地面只吸收约 20 份' },
]
const [CX, G0, CZ] = P.station
const X0 = CX - 15, X1 = CX + 15, TOP = 25, Z = CZ + 0.4
type V3 = [number, number, number]
const v = (x: number, y: number): V3 => [x, y, Z]

export default function Lesson2() {
  const [sun, setSun] = useState(false)
  const [noon, setNoon] = useState(false)
  const [sky, setSky] = useState<SkyKey>('clear')
  const [settled, setSettled] = useState(false)
  const T = useTasks('gewu:wind:2', TASKS)
  const day = useSlide(sun ? 1 : 0.42, 0.35), warm = useSlide(noon ? 1 : 0, 0.45)
  const S = SKIES[sky]
  useEffect(() => { if (!sun) return; const t = setTimeout(() => T.check(id => id === 'sun'), 2600); return () => clearTimeout(t) }, [sun])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!noon) return; const t = setTimeout(() => T.check(id => id === 'noon'), 2600); return () => clearTimeout(t) }, [noon])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSettled(false); if (sky !== 'cloudy' || !noon) return; const t = setTimeout(() => { setSettled(true); T.check(id => id === 'cloudy') }, 2600); return () => clearTimeout(t) }, [sky, noon])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setSun(false); setNoon(false); setSky('clear'); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'sun' | 'noon' | 'sky' | null } = (() => {
    if (!task) return { hint: '都做完了。太阳暖大地，大地暖大气。', next: null }
    if (!sun) return { hint: '天刚亮。让太阳照下来', next: 'sun' }
    if (task.id === 'sun') return { hint: '阳光穿过大气，看它都去了哪里…', next: null }
    if (!noon) return { hint: '等到午后，看地面晒热以后会怎样', next: 'noon' }
    if (task.id === 'noon') return { hint: '地面在变热…', next: null }
    if (sky !== 'cloudy') return { hint: '换成阴天，比一比到达地面的阳光', next: 'sky' }
    return { hint: '云多了，看阳光去了哪里…', next: null }
  })()

  const on = sun ? 1 : 0.35, gk = S.ground / 65, gy = G0 + 0.2
  const heatV = warm * (sky === 'clear' ? 0.9 : 0.35)
  const field = (_u: number, y: number) => 0.2 - 0.6 * y + heatV * Math.exp(-y * 5) * 1.1
  const labels: Label[] = [
    noteTag('top', [X0 + 1, TOP + 1.2, Z], '大气上界', true, 0),
    noteTag('r', [X0 + 1.5, 17.5, Z], `云和大气反射 约 ${S.reflect}`, sun, 0),
    noteTag('a', [CX - 9.5, 9.2, Z], `大气吸收 约 ${S.absorb}`, sun, 1),
    noteTag('g', [CX + 3.8, 12, Z], `到达地面 约 ${S.ground}`, sun, 0),
    noteTag('gr', [X1 - 0.5, 9, Z], `地面反射 约 ${S.groundReflect}`, sun, 1),
    noteTag('l', [CX - 2, 5.6, Z], '地面辐射（长波）', warm > 0.5, 1),
    noteTag('sw', [CX + 0.5, TOP - 2.6, Z], '太阳辐射（短波）', sun, 0),
    { id: 't', at: [CX + 9, gy + 1.1, Z], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: noon ? 1 : 0 }, children: <><small>近地面气温</small>{(sky === 'clear' || settled ? dayMax(sky) : dayMax('clear')).toFixed(0)} ℃</> },
  ]
  const s = SPOT.station
  return (
    <LabShell narration={voiced(NARRATION['2'], VOICE)} title="热力环流和风" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="时间"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...skyFor(day)} world={{ day, heat: [{ x0: X0, x1: X1, v: heatV }] }}>
        <Slab x0={X0} x1={X1} y0={G0} y1={TOP} z={CZ} field={field} fieldKey={`${sky}${noon}`} amount={0.75 + warm * 0.25} tint={0.1} />
        <Motes x0={X0} x1={X1} y0={G0 + 0.3} y1={TOP} z={Z - 0.2} n={220} heat={(x, y) => field((x - X0) / (X1 - X0), (y - G0) / (TOP - G0))} drift={(x, y) => [0, warm * 0.9 * Math.exp(-(y - G0) / 5)]} />
        <Cloud c={[X0 + 7, 16.5, CZ - 1]} size={sky === 'cloudy' ? [30, 2, 6] : [8, 1.5, 4]} n={sky === 'cloudy' ? 30 : 8} r={[2.5, 4.5]} amount={sun ? (sky === 'cloudy' ? 1 : 0.7) : 0.4} dark={sky === 'cloudy' ? 0.45 : 0} seed={sky === 'cloudy' ? 4 : 3} />
        {/* 太阳短波辐射：反射、吸收、到达地面、地面反射 */}
        <Ray pts={[v(X0 + 3, TOP), v(X0 + 5.5, 16.5), v(X0 + 2.5, TOP + 0.5)]} color={SHORT} wave={0.5} amp={0.14} on={on} k={S.reflect / 52} />
        <Ray pts={[v(X0 + 9, TOP), v(X0 + 9.5, 9.6)]} color={SHORT} wave={0.5} amp={0.14} on={on} k={S.absorb / 25} />
        <Ray pts={[v(CX + 1.5, TOP), v(CX + 1.5, gy)]} color={SHORT} wave={0.5} amp={0.14} on={on} k={gk} />
        <Ray pts={[v(CX + 6.5, TOP), v(CX + 6.5, gy)]} color={SHORT} wave={0.5} amp={0.14} on={on} k={gk} />
        <Ray pts={[v(X1 - 6, TOP), v(X1 - 4, gy), v(X1 - 1.5, 10)]} color={SHORT} wave={0.5} amp={0.14} on={on} k={S.groundReflect / 7} />
        {/* 地面长波辐射：大部分被近地面大气吸收 */}
        {[CX - 6, CX - 3, CX + 4].map((x, i) => <Ray key={i} pts={[v(x, gy), v(x - 0.6, 4.6 + i * 0.6)]} color={LONG} wave={1.3} amp={0.22} on={warm > 0.4 ? 1 : 0} k={sky === 'clear' ? 1 : 0.55} r={0.11} />)}
      </LabStage>}
      lesson={<LessonBlock no="2" title="太阳辐射和削弱作用" concept="太阳暖大地，大地暖大气" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>太阳表面温度很高，<b className="text-white">太阳辐射</b>的能量主要集中在波长较短的部分，叫短波辐射。</p>
          <p className="mt-2">太阳辐射穿过大气时，一部分被<b className="text-white">反射</b>（云层越厚反射越多）、被<b className="text-white">吸收</b>（臭氧吸收紫外线，水汽和二氧化碳吸收红外线）、被<b className="text-white">散射</b>，这叫大气对太阳辐射的<b className="text-white">削弱作用</b>。</p>
          <p className="mt-2">对流层大气直接吸收的太阳辐射很少，大部分太阳辐射到达地面，地面吸收后增温，再以<b className="text-white">长波辐射</b>的形式向外放热。近地面大气吸收地面长波辐射而增温。所以，<b className="text-white">地面是近地面大气主要、直接的热源</b>。</p>
          <p className="mt-2 text-[13.5px] text-white/65">图中把到达大气上界的太阳辐射记作 100 份，各部分的份数是示意的约数。</p>
        </>} />}
      finale={T.finale && <Fin kicker="晴天、阴天都看过了" big="太阳暖大地，大地暖大气" small="大气直接吸收的太阳辐射很少；地面吸收太阳短波辐射增温，再放出长波辐射，近地面大气吸收它而增温。云层越厚，削弱作用越强，白天气温越低。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label={`${S.name} · 到达地面被吸收`} value={sun ? `约 ${S.ground}` : '—'} unit="份" />
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="100" value="份" unit="到达大气上界" />
            <ParamTile symbol="T" value={noon ? `${dayMax(sky).toFixed(0)} ℃` : '—'} unit="午后近地面气温" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">100 份太阳辐射去了哪里</h2>
          <Rows head={['去向', '晴天', '阴天']} rows={[
            ['云和大气反射', `约 ${SKIES.clear.reflect}`, `约 ${SKIES.cloudy.reflect}`],
            ['大气吸收', `约 ${SKIES.clear.absorb}`, `约 ${SKIES.cloudy.absorb}`],
            ['地面反射', `约 ${SKIES.clear.groundReflect}`, `约 ${SKIES.cloudy.groundReflect}`],
            [<b key="g">地面吸收</b>, <b key="c">约 {SKIES.clear.ground}</b>, <b key="o">约 {SKIES.cloudy.ground}</b>],
          ]} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'sun'} pulse={next === 'sun'} onClick={() => setSun(true)} disabled={sun}>让太阳照下来</LabButton>
        <LabButton primary={next === 'noon'} pulse={next === 'noon'} onClick={() => setNoon(true)} disabled={!sun || noon || !T.done.sun}>等到午后</LabButton>
      </>}
      extras={
        <Control label="天气">
          <Segmented label="天气" pulse={next === 'sky'} want={next === 'sky' ? 'cloudy' : null} value={sky} onChange={k => setSky(k as SkyKey)} disabled={!sun} options={(Object.keys(SKIES) as SkyKey[]).map(k => ({ value: k, label: SKIES[k].name }))} />
        </Control>
      }
    />
  )
}
