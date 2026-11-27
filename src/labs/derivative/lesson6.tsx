// 导数 · 第 6 课 坡顶和谷底（极值；闭区间上的最值）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene6 from './scene6'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { classify, extremaOn, fmt, RANGE6, road, slope } from './physics'

const TASKS: Task[] = [
  { id: 'max', text: '让车停在坡顶，看 f′ 在两边的符号', note: 'f′(1) = 0，左边正、右边负：f(1) = 16 m 是极大值' },
  { id: 'min', text: '再停到谷底', note: 'f′(5) = 0，左边负、右边正：f(5) = 0 是极小值' },
  { id: 'range', text: '求 [2, 6] 这一段的最大值和最小值', note: '比较 f(2) = 13.5、f(5) = 0、f(6) = 3.5：最大 13.5 在端点，最小 0' },
]
const EX = extremaOn(...RANGE6)
const START = 0.3

export default function Lesson6() {
  const [goal, setGoal] = useState(START)
  const [range, setRange] = useState(false)
  const T = useTasks('gewu:derivative:6', TASKS)
  const u = useSlide(goal, 0.75), moving = Math.abs(u - goal) > 1e-3
  useEffect(() => { if (moving) return; T.check(id => (id === 'max' && goal === 1) || (id === 'min' && goal === 5)) }, [moving, goal])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setGoal(START); setRange(false); T.reset() }
  const task = T.current
  const top = !!T.done.max || (goal === 1 && !moving), bottom = !!T.done.min || (goal === 5 && !moving)
  const { hint, next }: { hint: string; next: 'max' | 'min' | 'range' | null } = !task ? { hint: 'f′ 由正变负是极大值，由负变正是极小值；闭区间上的最值，还要和端点比一比。', next: null }
    : moving ? { hint: '车开过去…', next: null }
    : task.id === 'max' ? { hint: '按“停在坡顶”：车开到 x = 1 停下', next: 'max' }
    : task.id === 'min' ? { hint: '按“停在谷底”：车开到桥上，x = 5', next: 'min' }
    : { hint: '按“求 [2, 6] 上的最值”：从 x = 2 到 x = 6 这一段，最高、最低各在哪', next: 'range' }
  const c = classify(u)

  return (
    <LabShell title="导数" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="极值和最值"
      stage={<Scene6 u={u} top={top} bottom={bottom} range={range} />}
      lesson={<LessonBlock no="6" title="坡顶和谷底" concept="f′ 变号处是极值，最值还要比端点" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>若 <span className="font-formula italic">f′(x₀) = 0</span>，且在 <span className="font-formula italic">x₀</span> 左侧 <span className="font-formula italic">f′(x) &gt; 0</span>、右侧 <span className="font-formula italic">f′(x) &lt; 0</span>，则 <span className="font-formula italic">f(x₀)</span> 是<b className="text-white">极大值</b>；左负右正是<b className="text-white">极小值</b>。只有 <span className="font-formula italic">f′(x₀) = 0</span> 而两侧不变号的点（比如 <span className="font-formula italic">y = x³</span> 在 0 处）不是极值点。</p>
          <p className="mt-3">求闭区间 <span className="font-formula italic">[a, b]</span> 上的最值：求出区间内的极值，再和端点值 <span className="font-formula italic">f(a)</span>、<span className="font-formula italic">f(b)</span> 比较，最大的是最大值，最小的是最小值。</p>
          <p className="mt-3">在 [2, 6] 上：<span className="font-formula italic">f(2) = 13.5</span>，极小值 <span className="font-formula italic">f(5) = 0</span>，<span className="font-formula italic">f(6) = 3.5</span>。最大值 13.5 在端点，不在极值点。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">坡顶、谷底、端点都比过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">极大值 16、极小值 0；[2, 6] 上最大值 13.5 在端点 x = 2，最小值 0</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">f′(x) = 1.5(x − 1)(x − 5)</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{fmt(slope(u), 2)}<span className="ml-1 text-[15px] font-medium text-white/55">f′(x)</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="x" value={fmt(u, 2)} unit="百米 · 车在哪" />
            <ParamTile symbol="f(x)" value={fmt(road(u), 2)} unit="m · 比谷底高" />
          </div>
          {!moving && (goal === 1 || goal === 5) && <p className="row-in mt-3 rounded-xl bg-white/8 px-3 py-2 text-center text-[14px]">左边 f′ = {fmt(c.left)}，右边 f′ = {fmt(c.right)}</p>}
          <h2 className="mt-4 text-[12.5px] text-white/55">比一比</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">点</th><th className="font-normal">f(x) / m</th><th className="text-right font-normal">是什么</th></tr></thead>
            <tbody>
              {top && <tr className="row-in border-t border-white/12"><td className="py-1.5">x = 1 坡顶</td><td className="tabular-nums">16</td><td className="text-right">极大值</td></tr>}
              {bottom && <tr className="row-in border-t border-white/12"><td className="py-1.5">x = 5 谷底</td><td className="tabular-nums">0</td><td className="text-right">极小值</td></tr>}
              {range && EX.cand.filter(q => q.x !== 5).map(q => <tr key={q.x} className="row-in border-t border-white/12"><td className="py-1.5">x = {fmt(q.x)} 端点</td><td className="tabular-nums">{fmt(q.y)}</td><td className="text-right">{q.x === EX.max.x ? <b className="text-[#ffe9a8]">[2, 6] 上最大</b> : '—'}</td></tr>)}
            </tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'max'} pulse={next === 'max'} onClick={() => setGoal(1)} disabled={moving}>停在坡顶</LabButton>
        <LabButton primary={next === 'min'} pulse={next === 'min'} onClick={() => setGoal(5)} disabled={moving || !T.done.max}>停在谷底</LabButton>
        <LabButton primary={next === 'range'} pulse={next === 'range'} onClick={() => { setRange(true); T.check(id => id === 'range') }} disabled={moving || !T.done.min || range}>求 [2, 6] 上的最值</LabButton>
      </>}
      extras={null}
    />
  )
}
