// 导数 · 第 2 课 这一瞬间开多快（瞬时变化率；导数的定义）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene2 from './scene2'
import { useRamp } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { DTS, fmt, kmh, quotient, speed, T0 } from './physics'

const TASKS: Task[] = [
  { id: 'right', text: '让 Δt 从 1 s 缩到 0.001 s', note: '平均速度 5、4.1、4.01、4.001 m/s：越来越接近 4' },
  { id: 'left', text: '再从左边逼近：Δt 从 −1 s 到 −0.001 s', note: '3、3.9、3.99、3.999 m/s：从下面也接近 4' },
  { id: 'meter', text: '让车开过测速屏，看 t = 2 s 那一刻的速度', note: '测速屏显示 14.4 km/h，正是 4 m/s' },
]
const RAMP = 5          // Δt 缩小一轮用几秒
const DRIVE = 4         // 开过测速屏：从起步开到第 4 s

export default function Lesson2() {
  const [side, setSide] = useState<0 | 1 | -1>(0)
  const [run, setRun] = useState(0)
  const [drive, setDrive] = useState(0)
  const T = useTasks('gewu:derivative:2', TASKS)
  const p = useRamp(run, RAMP, true), dt = side * 10 ** (-3 * p), shrinking = run > 0 && p < 1
  const q = useRamp(drive, DRIVE), tc = drive ? q * DRIVE : 0, driving = drive > 0 && q < 1
  useEffect(() => { if (run && p >= 1) T.check(id => (id === 'right' && side > 0) || (id === 'left' && side < 0)) }, [p >= 1, run])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (drive && q >= 1) T.check(id => id === 'meter') }, [q >= 1, drive])   // eslint-disable-line react-hooks/exhaustive-deps
  const shrink = (s: 1 | -1) => { setSide(s); setRun(r => r + 1) }
  const resetAll = () => { setSide(0); setRun(0); setDrive(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'right' | 'left' | 'meter' | null } = !task ? { hint: 'Δt 从两边趋于 0，平均速度都趋于 4 m/s：这就是 t = 2 s 时的瞬时速度。', next: null }
    : shrinking ? { hint: 'Δt 在变小：Q 沿曲线滑向 P，割线绕着 P 转…', next: null }
    : driving ? { hint: '车起步了，看它经过测速屏时的读数…', next: null }
    : task.id === 'right' ? { hint: '按“从右边逼近”：让 Δt 从 1 s 连续缩到 0.001 s', next: 'right' }
    : task.id === 'left' ? { hint: '按“从左边逼近”：Δt 取负数，Q 在 P 的左边', next: 'left' }
    : { hint: '按“开过测速屏”：车在 t = 2 s 时正好经过测速屏', next: 'meter' }
  const passed = DTS.filter(d => 10 ** (-3 * p) <= d * 1.0001)
  const rows = (s: 1 | -1) => (T.done[s > 0 ? 'right' : 'left'] ? DTS : side === s ? passed : [])
  const radar = drive && tc >= T0 ? fmt(kmh(speed(T0)), 1) : ' '
  const digits = Math.abs(dt) < 0.0095 ? 4 : Math.abs(dt) < 0.095 ? 3 : 2

  return (
    <LabShell title="导数" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="让 Δt 趋于 0"
      stage={<Scene2 dt={run ? dt : 0} tangent={!!T.done.right} tc={tc} radar={radar} />}
      lesson={<LessonBlock no="2" title="这一瞬间开多快" concept="Δt 趋于 0，平均速度趋于瞬时速度" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>平均速度只说明一段时间里开得多快。把时间段缩短：从 <span className="font-formula italic">t = 2</span> 到 <span className="font-formula italic">2 + Δt</span>，平均速度是</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">(s(2 + Δt) − s(2)) / Δt = 4 + Δt</p>
          <p className="mt-2">Δt 不能等于 0，但可以无限接近 0；不管从哪一边接近，平均速度都无限接近 4。这个确定的值就是 <span className="font-formula italic">t = 2 s</span> 时的<b className="text-white">瞬时速度</b>。</p>
          <p className="mt-3">一般地，<span className="font-formula italic">f′(x₀) = lim Δx→0 (f(x₀ + Δx) − f(x₀)) / Δx</span> 叫函数在 <span className="font-formula italic">x₀</span> 处的<b className="text-white">导数</b>（瞬时变化率）。在图像上，割线 PQ 随 Q 靠近 P 而转到一个确定的位置，就是 P 处的切线。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两边都逼近了 4 m/s</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">Δt → 0 时平均速度的极限，就是瞬时速度：s′(2) = 4 m/s</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">(s(2 + Δt) − s(2)) / Δt</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{run ? quotient(T0, dt).toFixed(digits) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m/s</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="Δt" value={run ? fmt(dt, 4) : '—'} unit="s · 时间段" />
            <ParamTile symbol="v" value={radar.trim() ? `${radar}` : '—'} unit="km/h · 测速屏" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">平均速度 / (m/s)</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">|Δt| / s</th><th className="text-right font-normal">右边 Δt &gt; 0</th><th className="text-right font-normal">左边 Δt &lt; 0</th></tr></thead>
            <tbody>{DTS.filter(d => rows(1).includes(d) || rows(-1).includes(d)).map(d => <tr key={d} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{fmt(d)}</td><td className="text-right tabular-nums">{rows(1).includes(d) ? fmt(quotient(T0, d)) : ''}</td><td className="text-right tabular-nums">{rows(-1).includes(d) ? fmt(quotient(T0, -d)) : ''}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'right'} pulse={next === 'right'} onClick={() => shrink(1)} disabled={shrinking || driving}>从右边逼近</LabButton>
        <LabButton primary={next === 'left'} pulse={next === 'left'} onClick={() => shrink(-1)} disabled={shrinking || driving || !T.done.right}>从左边逼近</LabButton>
        <LabButton primary={next === 'meter'} pulse={next === 'meter'} onClick={() => setDrive(d => d + 1)} disabled={shrinking || driving || !T.done.left}>开过测速屏</LabButton>
      </>}
      extras={null}
    />
  )
}
