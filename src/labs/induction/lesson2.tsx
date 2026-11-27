// 电磁感应和电网 · 第 2 课 感应电流的条件：实验室第二张台。条形磁铁插进线圈、停住、拔出、快速插入，
// 看灵敏电流计的指针：只有穿过线圈的磁通量在变的时候，回路里才有感应电流。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { DEPTH, MAX_LINES, SPEEDS, coilLines, divisions, galvo, type Speed } from './physics'
import { COIL_TOP, CR } from './coilrig'
import { Rig2 } from './scene2'
import { Place } from './world'
import { ST } from './layout'
import { useSettled } from './anim'

const TASKS: Task[] = [
  { id: 'in', text: '把磁铁插进线圈，看电流计', note: '指针偏了：磁通量在增大，回路里有感应电流' },
  { id: 'stay', text: '让磁铁停在线圈里，再看', note: '指针回到零：磁通量不变，就没有感应电流' },
  { id: 'out', text: '把磁铁拔出来', note: '指针偏向另一边：磁通量减小，感应电流反向' },
  { id: 'fast', text: '换成“快”，再插一次', note: '插得越快，磁通量变得越快，指针偏得越大' },
]
const X = ST.l2

export default function Lesson2() {
  const [goal, setGoal] = useState(0)
  const [speed, setSpeed] = useState<Speed>('slow')
  const [peaks, setPeaks] = useState<{ slow: number; fast: number }>({ slow: 0, fast: 0 })
  const T = useTasks('gewu:induction:2', TASKS)
  const d = useSlide(goal, SPEEDS[speed]), moving = Math.abs(d - goal) > 1e-4
  const v = moving ? Math.sign(goal - d) * SPEEDS[speed] : 0
  const k = galvo(d, v), lines = coilLines(d)
  const peak = useRef(0); if (moving && Math.abs(k) > Math.abs(peak.current)) peak.current = k
  const still = useSettled(`${goal}${moving}`, 5500) && !moving && goal > 0
  // 每次停下来：判定任务、记下这一趟的最大偏转
  useEffect(() => {
    if (moving) return
    const p = peak.current; peak.current = 0
    if (goal > 0 && p) { setPeaks(s => ({ ...s, [speed]: Math.max(s[speed], Math.abs(p)) })); T.check(id => id === 'in' || (id === 'fast' && speed === 'fast' && !!T.done.out)) }
    if (goal === 0 && p) T.check(id => id === 'out' && !!T.done.stay)
  }, [moving])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (still) T.check(id => id === 'stay' && !!T.done.in) }, [still])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setGoal(0); setSpeed('slow'); setPeaks({ slow: 0, fast: 0 }); T.reset() }

  const task = T.current
  type Next = 'in' | 'out' | 'speed' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '穿过闭合回路的磁通量发生变化，回路中就产生感应电流。', next: null }
    if (moving) return { hint: goal > 0 ? '磁铁正往里插，看指针…' : '磁铁正往外拔，看指针…', next: null }
    if (task.id === 'in') return goal > 0 ? { hint: '先把磁铁拔出来', next: 'out' } : { hint: '把磁铁插进线圈，看电流计', next: 'in' }
    if (task.id === 'stay') return { hint: '磁铁停在线圈里不动，看指针…', next: null }
    if (task.id === 'out') return { hint: '把磁铁拔出来', next: 'out' }
    if (speed !== 'fast') return { hint: '把速度换成“快”', next: 'speed' }
    return goal > 0 ? { hint: '先把磁铁拔出来', next: 'out' } : { hint: '快速把磁铁插进去', next: 'in' }
  })()

  const labels: Label[] = [
    { id: 'n1', at: [X, COIL_TOP + 0.01, 0.05], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '线圈' },
    { id: 'n2', at: [X + CR.meter[0], CR.meter[1] + 0.13, CR.meter[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '灵敏电流计' },
    { id: 'n3', at: [X - 0.02, COIL_TOP + 0.24 - d, 0], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '条形磁铁' },
    { id: 'l', at: [X - 0.05, COIL_TOP - 0.05, 0.03], ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>穿过线圈</small>{lines} 根</> },
  ]
  return (
    <LabShell title="电磁感应和电网" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="磁铁"
      stage={<Place at="l2" cur="l2" labels={labels}><Rig2 d={d} needle={k} flow={k * 3} lines={lines} /></Place>}
      lesson={<LessonBlock no="2" title="感应电流的条件" concept="磁通量变化，闭合回路里才有感应电流" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>线圈和灵敏电流计连成一个闭合回路。磁铁插入时，穿过线圈的磁感线变多；拔出时变少；停着不动时不变。</p>
          <p className="mt-3">实验表明：<b className="text-white">只要穿过闭合导体回路的磁通量发生变化，闭合导体回路中就有感应电流</b>。这种利用磁场产生电流的现象叫作电磁感应。</p>
          <p className="mt-3">回路不闭合时，磁通量变化也会产生感应电动势，只是没有电流。磁通量变化得越快，感应电流越大，这一点在第 4 课定量研究。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">插、停、拔、快插都做过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">磁通量变化，闭合回路里才有感应电流</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">插入和拔出时指针偏向两边，磁铁停着时指针为零；插得越快，偏得越大。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/55">穿过线圈的磁感线</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{lines}<span className="ml-1 text-[15px] font-medium text-white/55">/ {MAX_LINES} 根</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">{moving ? (goal > 0 ? '磁通量在增大' : '磁通量在减小') : '磁通量不变'} · {Math.abs(k) > 0.02 ? '有感应电流' : '没有感应电流'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="v" value={SPEEDS[speed].toFixed(2)} unit="m/s · 磁铁的速度" />
            <ParamTile symbol="d" value={(d * 100).toFixed(1)} unit={`cm · 插入深度（最深 ${DEPTH * 100} cm）`} />
            <ParamTile symbol="慢" value={peaks.slow ? divisions(peaks.slow).toFixed(1) : '—'} unit="格 · 指针最大偏转" />
            <ParamTile symbol="快" value={peaks.fast ? divisions(peaks.fast).toFixed(1) : '—'} unit="格 · 指针最大偏转" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'in'} pulse={next === 'in'} onClick={() => setGoal(DEPTH)} disabled={moving || goal > 0}>插入磁铁</LabButton>
        <LabButton primary={next === 'out'} pulse={next === 'out'} onClick={() => setGoal(0)} disabled={moving || goal === 0}>拔出磁铁</LabButton>
      </>}
      extras={<Control label="速度"><Segmented label="速度" pulse={next === 'speed'} want={next === 'speed' ? 'fast' : null} value={speed} onChange={s => setSpeed(s as Speed)} disabled={moving} options={[{ value: 'slow', label: '慢' }, { value: 'fast', label: '快' }]} /></Control>}
    />
  )
}
