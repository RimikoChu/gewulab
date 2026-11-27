// 导数 · 第 5 课 上坡还是下坡（用导数判断函数的单调性）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene5 from './scene5'
import { useRamp } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { fmt, road, ROAD_X, rootsOfSlope, slope, SLOPE_TEXT } from './physics'

const TASKS: Task[] = [
  { id: 'drive', text: '把车开过整段山路，看下格描出的 f′', note: '上坡时 f′ 在横轴上方，下坡时在横轴下方' },
  { id: 'up', text: '标出递增区间', note: 'f′ > 0 的地方：(0, 1) 和 (5, 6)，路在上坡' },
  { id: 'down', text: '标出递减区间', note: 'f′ < 0 的地方：(1, 5)，路在下坡' },
]
const DRIVE = 12
const [R1, R2] = rootsOfSlope()

export default function Lesson5() {
  const [run, setRun] = useState(0)
  const [up, setUp] = useState(false)
  const [down, setDown] = useState(false)
  const T = useTasks('gewu:derivative:5', TASKS)
  const p = useRamp(run, DRIVE), u = run ? ROAD_X[1] * p : T.done.drive ? ROAD_X[1] : 0.25
  const driving = run > 0 && p < 1
  useEffect(() => { if (run && p >= 1) T.check(id => id === 'drive') }, [p >= 1, run])   // eslint-disable-line react-hooks/exhaustive-deps
  const markUp = () => { setUp(true); T.check(id => id === 'up') }
  const markDown = () => { setDown(true); T.check(id => id === 'down') }
  const resetAll = () => { setRun(0); setUp(false); setDown(false); T.reset() }
  const task = T.current, k = slope(u)
  const { hint, next }: { hint: string; next: 'drive' | 'up' | 'down' | null } = !task ? { hint: 'f′ > 0 的区间上函数递增，f′ < 0 的区间上递减：看导数的正负就知道路在上坡还是下坡。', next: null }
    : driving ? { hint: '600 m 的山路快进成 12 s：看车上坡、下坡时 f′ 在横轴哪一边…', next: null }
    : task.id === 'drive' ? { hint: '按“开过整段山路”：车从起点开到终点，下格同步描出 f′(x)', next: 'drive' }
    : task.id === 'up' ? { hint: '按“标出递增区间”：f′ 在横轴上方的那几段', next: 'up' }
    : { hint: '按“标出递减区间”：f′ 在横轴下方的那一段', next: 'down' }

  return (
    <LabShell title="导数" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="单调性"
      stage={<Scene5 u={u} trace={run || T.done.drive ? u : 0} up={up} down={down} />}
      lesson={<LessonBlock no="5" title="上坡还是下坡" concept="f′ > 0 递增，f′ < 0 递减" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一般地，在某个区间内，如果 <span className="font-formula italic">f′(x) &gt; 0</span>，那么 <span className="font-formula italic">f(x)</span> 在这个区间上单调递增；如果 <span className="font-formula italic">f′(x) &lt; 0</span>，那么单调递减。</p>
          <p className="mt-3">山路的 <span className="font-formula italic">{SLOPE_TEXT} = 1.5(x − 1)(x − 5)</span>。解 <span className="font-formula italic">f′(x) &gt; 0</span> 得 <span className="font-formula italic">x &lt; 1</span> 或 <span className="font-formula italic">x &gt; 5</span>；解 <span className="font-formula italic">f′(x) &lt; 0</span> 得 <span className="font-formula italic">1 &lt; x &lt; 5</span>。</p>
          <p className="mt-3">求单调区间的步骤：确定定义域 → 求 <span className="font-formula italic">f′(x)</span> → 解不等式 <span className="font-formula italic">f′(x) &gt; 0</span>、<span className="font-formula italic">f′(x) &lt; 0</span>。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">整段路分成了三段</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">f′ &gt; 0 递增：(0, 1)、(5, 6)；f′ &lt; 0 递减：(1, 5)</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">f′(x) = 1.5(x − 1)(x − 5)</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{k > 0 ? '+' : ''}{fmt(k, 2)}<span className="ml-1 text-[15px] font-medium text-white/55">% 坡度 f′(x)</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="x" value={fmt(u, 2)} unit="百米 · 车在哪" />
            <ParamTile symbol="f(x)" value={fmt(road(u), 2)} unit="m · 比谷底高" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">单调区间</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">区间</th><th className="font-normal">f′ 的符号</th><th className="text-right font-normal">f(x)</th></tr></thead>
            <tbody>
              {up && <tr className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">(0, {fmt(R1)})、({fmt(R2)}, 6)</td><td>+</td><td className="text-right text-[#6fe08a]">递增 · 上坡</td></tr>}
              {down && <tr className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">({fmt(R1)}, {fmt(R2)})</td><td>−</td><td className="text-right text-[#ff9a52]">递减 · 下坡</td></tr>}
            </tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'drive'} pulse={next === 'drive'} onClick={() => setRun(r => r + 1)} disabled={driving}>开过整段山路</LabButton>
        <LabButton primary={next === 'up'} pulse={next === 'up'} onClick={markUp} disabled={driving || !T.done.drive || up}>标出递增区间</LabButton>
        <LabButton primary={next === 'down'} pulse={next === 'down'} onClick={markDown} disabled={driving || !T.done.up || down}>标出递减区间</LabButton>
      </>}
      extras={null}
    />
  )
}
