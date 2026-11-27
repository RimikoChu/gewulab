// 抛体运动 · 第 3 课 无人机同时投弹（探究平抛运动的特点：水平匀速、竖直自由落体）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene3 from './scene3'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { DRONE, fallTime, flat, fmt, G, strobeTimes } from './physics'
import { useRun } from './run'

const TASKS: Task[] = [
  { id: 'drop', text: '让两架无人机同时投弹', note: '一只直直落下，一只往前飞，却同时落地：都用了 2 s' },
  { id: 'strobe', text: '打开频闪，看每 0.5 s 的位置', note: '水平方向每 0.5 s 都走 5 m；竖直方向和自由下落一样' },
  { id: 'slow', text: '把水平速度换成 5 m/s，再投一次', note: '还是 2 s 落地，只是落点近了一半' },
]
type Sp = '10' | '5'
const T_FALL = fallTime(DRONE.h)

export default function Lesson3() {
  const [sp, setSp] = useState<Sp>('10')
  const [strobe, setStrobe] = useState(false)
  const T = useTasks('gewu:projectile:3', TASKS)
  const v0 = +sp
  const run = useRun(T_FALL + 0.5, 0.8)
  useEffect(() => { run.reset() }, [sp])   // eslint-disable-line react-hooks/exhaustive-deps
  const landed = run.t !== null && run.t >= T_FALL
  useEffect(() => { if (landed) T.check(id => id === 'drop' || (id === 'slow' && v0 === 5 && !!T.done.strobe)) }, [landed])   // eslint-disable-line react-hooks/exhaustive-deps
  const flash = () => { if (!T.done.drop) return; setStrobe(true); T.check(id => id === 'strobe') }
  const resetAll = () => { setSp('10'); setStrobe(false); run.reset(); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'drop' | 'strobe' | 'sp' | null } = !task ? { hint: '平抛 = 水平方向的匀速直线运动 + 竖直方向的自由落体运动。', next: null }
    : run.running ? { hint: '两只灭火弹正在下落…', next: null }
    : task.id === 'drop' ? { hint: '按“同时投弹”：看哪一只先落地', next: 'drop' }
    : task.id === 'strobe' ? { hint: '按“看频闪”：每隔 0.5 s 留一个影子', next: 'strobe' }
    : sp !== '5' ? { hint: '把水平速度换成 5 m/s', next: 'sp' }
    : { hint: '按“同时投弹”：飞得慢了，落地会不会晚', next: 'drop' }
  const tt = Math.min(run.t ?? 0, T_FALL), f = flat(v0, tt)
  const times = strobeTimes(DRONE.h, DRONE.strobe)

  return (
    <LabShell title="抛体运动" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="无人机"
      stage={<Scene3 v0={v0} t={run.t} strobe={strobe} />}
      lesson={<LessonBlock no="3" title="无人机同时投弹" concept="平抛：水平匀速，竖直自由落体" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>以一定的速度把物体沿水平方向抛出，不计空气阻力，物体只受重力，这样的运动叫平抛运动。</p>
          <p className="mt-3">水平方向不受力，速度不变，是匀速直线运动；竖直方向只受重力、初速度为零，是自由落体运动。两个方向互不影响，所以平抛的弹和自由下落的弹任何时刻都一样高，同时落地。</p>
          <p className="mt-3">从 19.6 m 高处落下：<span className="font-formula italic">t = √(2h ÷ g)</span> = √(2 × 19.6 ÷ {G}) = 2 s，和水平速度无关。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种速度都投过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">平抛在水平方向匀速、竖直方向自由下落；落地时间只由高度决定</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">投弹后</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{run.t === null ? '—' : tt.toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">s</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol={<span style={{ color: '#5ad1ff' }}>x = v₀t</span>} value={run.t === null ? '—' : fmt(f.x, 1)} unit="m · 水平走了" />
            <ParamTile symbol={<span style={{ color: '#ff7a59' }}>y = ½gt²</span>} value={run.t === null ? '—' : fmt(f.drop, 1)} unit="m · 往下落了" />
            <ParamTile symbol={<span style={{ color: '#5ad1ff' }}>v<sub>x</sub></span>} value={fmt(v0, 0)} unit="m/s · 不变" />
            <ParamTile symbol={<span style={{ color: '#ff7a59' }}>v<sub>y</sub> = gt</span>} value={run.t === null ? '—' : fmt(f.vy, 1)} unit="m/s" />
          </div>
          {strobe && <table className="row-in mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">t / s</th>{times.map(s => <th key={s} className="text-right font-normal tabular-nums">{s}</th>)}</tr></thead>
            <tbody>
              <tr className="border-t border-white/12"><td className="py-1.5 text-[#5ad1ff]">x / m</td>{times.map(s => <td key={s} className="text-right tabular-nums">{fmt(flat(v0, s).x, 1)}</td>)}</tr>
              <tr className="border-t border-white/12"><td className="py-1.5 text-[#ff7a59]">y / m</td>{times.map(s => <td key={s} className="text-right tabular-nums">{fmt(flat(v0, s).drop, 1)}</td>)}</tr>
            </tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'drop'} pulse={next === 'drop'} onClick={run.start} disabled={run.running}>同时投弹</LabButton>
        <LabButton primary={next === 'strobe'} pulse={next === 'strobe'} onClick={flash} disabled={!T.done.drop || strobe || run.running}>看频闪</LabButton>
      </>}
      extras={
        <Control label="水平速度">
          <Segmented label="水平速度" pulse={next === 'sp'} want={next === 'sp' ? '5' : null} value={sp} onChange={k => { if (!run.running) setSp(k) }} options={[{ value: '10', label: '10 m/s' }, { value: '5', label: '5 m/s' }]} />
        </Control>
      }
    />
  )
}
