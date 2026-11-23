// 物态变化 · 第 4 课 沸腾（水的沸腾实验：气泡的变化、温度–时间图线、沸点、沸腾时持续吸热而温度不变）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Bubbles, Puffs } from './fx'
import { BEAKER, Beaker, Clamp, GAUZE_T, Gauze, Lamp, Lid, Matches, Ring, STAND, Stand, Stopwatch, Thermo, thermoY } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Done, H2, Room, useRun } from './parts'
import { BOIL, BOILING, afterOff, boilAt, boilT, boilTotal, bubbles, readT, samples } from './physics'
import { BubbleView, TChart, ThermoView } from './views'
import { ST, TOP } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'boil', text: `点燃酒精灯，从 ${BOILING.start} ℃ 起每分钟记一次，加热到水沸腾`, note: `第 ${boilAt()} 分钟水沸腾了，温度是 ${BOIL} ℃` },
  { id: 'keep', text: `沸腾后继续加热 ${BOILING.keep} 分钟，看温度变不变`, note: `一直是 ${BOIL} ℃：沸腾时吸热，温度保持不变` },
  { id: 'off', text: '熄灭酒精灯，看水还沸腾不沸腾', note: '沸腾很快停了：沸腾需要持续吸热' },
]
const X = ST.s4, Z = 0.3, CX = X + 0.12
const RING = 0.86, CUP = TOP + RING + GAUZE_T, DEPTH = 0.44, BULB = CUP + BEAKER.floor + 0.16
/** 画面里一秒钟算实验的几分钟 */
const SPEED = 1 / 1.3, OFF_MIN = 3

export default function Lesson4() {
  const [mode, setMode] = useState<'idle' | 'heat' | 'off'>('idle')
  const [t, setT] = useRun(mode === 'heat', SPEED, boilTotal())
  const [tOff, setOff] = useRun(mode === 'off', SPEED, OFF_MIN)
  const T = useTasks('gewu:phase:4', TASKS)
  const lit = useSlide(mode === 'heat' ? 1 : 0, 2.5)
  const temp = mode === 'off' ? afterOff(boilT(t), tOff) : boilT(t)
  const b = bubbles(temp, mode === 'heat' || (mode === 'off' && tOff < 0.35))
  const boiled = t >= boilAt(), kept = t >= boilTotal()
  useEffect(() => { T.check(id => id === 'boil' ? boiled : id === 'keep' ? kept : mode === 'off' && tOff >= 1) })
  const resetAll = () => { setMode('idle'); setT(0); setOff(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'on' | 'off' | null } = !task ? { hint: `水沸腾时温度保持在 ${BOIL} ℃；一停止加热，沸腾就停。`, next: null }
    : mode === 'idle' ? { hint: `水已经热到 ${BOILING.start} ℃。按“点燃酒精灯”，每过 1 分钟图上会多一个点`, next: 'on' }
    : mode === 'heat' && !boiled ? { hint: b.kind === 'before' ? '杯底冒出气泡了：还没沸腾，气泡上升时越来越小' : '水温在上升…', next: null }
    : mode === 'heat' && !kept ? { hint: '沸腾了：气泡上升时越来越大，到水面破裂。继续加热，看温度…', next: null }
    : mode === 'heat' ? { hint: `加热了 ${BOILING.keep} 分钟，温度没有再升。按“熄灭酒精灯”`, next: 'off' }
    : { hint: '火灭了，看烧杯里的气泡…', next: null }
  const state = b.kind === 'boil' ? '沸腾' : mode === 'off' ? '停止沸腾' : b.kind === 'before' ? '快要沸腾' : '没有沸腾'
  const labels: Label[] = [
    { id: 't', at: [CX + 0.08, BULB + thermoY(temp), Z], className: 'scene-tag key -translate-y-1/2', children: <><small>水温</small>{readT(temp)} ℃</> },
    { id: 'n1', at: [CX + 0.3, CUP + BEAKER.h + 0.02, Z], name: true, className: 'scene-name -translate-y-full', children: '纸板盖' },
    { id: 'n2', at: [CX + 0.42, TOP + RING, Z + 0.2], name: true, className: 'scene-name', children: '石棉网' },
    { id: 'n3', at: [CX + 0.28, TOP + 0.3, Z + 0.2], name: true, className: 'scene-name', children: '酒精灯' },
    { id: 'n4', at: [X - 0.56, TOP + 2.3, Z], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '铁架台' },
    { id: 'n5', at: [X + 1.02, TOP + 0.14, Z + 0.62], name: true, className: 'scene-name -translate-y-full', children: '停表' },
  ]
  const pts = samples(boilT, t), offPts = mode === 'off' ? samples(m => afterOff(boilT(t), m), tOff).map(([m, v]) => [boilTotal() + m, v] as [number, number]) : []
  return (
    <LabShell title="物态变化" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="酒精灯"
      stage={<Room at="s4" labels={labels} bloom={0.35}>
        <Stand at={[X, TOP, Z]}>
          <Ring y={RING} />
          <Clamp y={BULB - TOP + 1.5} grip={0.04} />
        </Stand>
        <Lamp at={[CX, TOP + STAND.baseH, Z]} lit={lit} capAt={[0.62, -STAND.baseH, 0.42]} />
        <Gauze at={[CX, TOP + RING, Z]} />
        <Beaker at={[CX, CUP, Z]} level={DEPTH}><Bubbles r={BEAKER.inR} h={DEPTH} kind={b.kind} vigor={b.vigor} /></Beaker>
        <Lid at={[CX, CUP + BEAKER.h, Z]} />
        <Thermo at={[CX, BULB, Z]} T={temp} />
        <Puffs at={[CX, CUP + BEAKER.h + 0.03, Z]} on={b.kind === 'boil' ? 1 : b.kind === 'before' ? 0.3 * b.vigor : 0} len={1.0} size={0.34} spread={0.14} dense={1.6} skip={0.06} n={22} color="#e6ecf0" />
        <Stopwatch at={[X + 1.02, TOP, Z + 0.62]} turn={(t + tOff) / 60 * 60 / 60} />
        <Matches at={[X - 0.95, TOP, Z + 0.75]} />
      </Room>}
      lesson={<LessonBlock no="4" title="沸腾" concept="沸腾时吸热，温度保持不变" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">沸腾</b>是在液体内部和表面同时发生的剧烈的汽化现象。液体沸腾时的温度叫<b className="text-white">沸点</b>。在标准大气压下，水的沸点是 {BOIL} ℃。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>沸腾前：气泡在上升过程中越来越小</li>
            <li>沸腾时：气泡在上升过程中越来越大，到水面破裂，里面的水蒸气散到空气里</li>
            <li>沸腾的条件：温度达到沸点，并且继续吸热</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">烧杯上方的“白气”不是水蒸气，是水蒸气遇冷变成的小水滴。</p>
        </>} />}
      finale={T.finale && <Done head="三步都做完了" title="沸腾时吸热，温度保持不变" onClose={() => T.setFinale(false)}>水从 {BOILING.start} ℃ 升到 {BOIL} ℃ 就沸腾了，再怎么加热温度也不升；酒精灯一熄，沸腾就停。液体沸腾要达到沸点，还要继续吸热。</Done>}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">温度计</h2>
          <ThermoView T={temp} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="t" value={`${Math.floor(t + tOff + 1e-6)} min`} unit="加热和冷却的时间" />
            <ParamTile symbol="状态" value={state} unit="烧杯里的水" />
          </div>
          <H2>温度–时间图</H2>
          <TChart tmax={12} lo={88} hi={102} step={2} mark={{ T: BOIL, text: `沸点 ${BOIL} ℃` }} series={[{ name: '加热', color: '#ff9a6a', pts, live: mode !== 'off' }, { name: '熄灯以后', color: '#7fb8ff', pts: offPts, live: true }]} />
          <H2>气泡</H2>
          <BubbleView now={b.kind} />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'on'} onClick={() => setMode('heat')} disabled={mode !== 'idle'}>点燃酒精灯</LabButton>
        <LabButton pulse={next === 'off'} onClick={() => setMode('off')} disabled={mode !== 'heat' || !kept}>熄灭酒精灯</LabButton>
      </>}
      extras={null}
    />
  )
}
