// 抛体运动 · 第 1 课 弯道上的速度方向（曲线运动：速度沿切线；合力和速度不在一条直线上）
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene1, { sideOf } from './scene1'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { fmt, MARKS, ROAD, roadAt, type MarkKey } from './physics'

const TASKS: Task[] = [
  { id: 'A', text: '开到 A 点，画出速度的方向', note: 'A 点在左弯上：速度沿弯道的切线，比出发时偏左 45°' },
  { id: 'B', text: '开到 B 点，再画一次', note: 'B 点在直道上：速度就沿着路，方向不变' },
  { id: 'C', text: '开到 C 点，再画一次', note: 'C 点在右弯上：速度还是沿切线，方向又变了' },
  { id: 'F', text: '看三处的合力各指向哪', note: '弯道上合力指向里侧，和速度不在一条直线上' },
]

export default function Lesson1() {
  const [at, setAt] = useState(-1)                    // 开到了第几个标记点（−1：还在起点）
  const [drawn, setDrawn] = useState<MarkKey[]>([])
  const [force, setForce] = useState(false)
  const T = useTasks('gewu:projectile:1', TASKS)
  const goal = at < 0 ? 0 : MARKS[at].s
  const s = useSlide(goal, ROAD.speed), moving = s !== goal
  const here = at >= 0 && !moving ? MARKS[at].key : null
  const go = () => { if (moving || at >= MARKS.length - 1) return; setAt(at + 1) }
  const draw = () => { if (!here || drawn.includes(here)) return; const n = [...drawn, here]; setDrawn(n); T.check(id => n.includes(id as MarkKey)) }
  const showForce = () => { if (drawn.length < 3) return; setForce(true); T.check(id => id === 'F') }
  const resetAll = () => { setAt(-1); setDrawn([]); setForce(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'go' | 'draw' | 'force' | null } = !task ? { hint: '走曲线时，速度的方向时刻在变，总是沿着那一点的切线。', next: null }
    : task.id === 'F' ? { hint: '按“看合力”：看看三处的合力各指向哪', next: 'force' }
    : moving ? { hint: '消防车正沿着路开过去…', next: null }
    : here === task.id ? { hint: '按“画切线”：画出这一刻速度的方向', next: 'draw' }
    : { hint: `按“开到下一点”：把消防车开到 ${task.id} 点`, next: 'go' }
  const p = roadAt(s)

  return (
    <LabShell title="抛体运动" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="消防车"
      stage={<Scene1 s={s} drawn={drawn} force={force} />}
      lesson={<LessonBlock no="1" title="弯道上的速度方向" concept="曲线运动的速度沿轨迹的切线" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>质点在某一点的速度方向，沿曲线在这一点的切线方向。走曲线时速度的方向时刻在变，所以曲线运动一定是变速运动，哪怕速度的大小一点没变。</p>
          <p className="mt-3">物体做曲线运动的条件：它受的合力的方向和速度的方向不在同一条直线上。合力总是指向轨迹弯曲的那一侧。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个点都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">速度沿切线；合力和速度不在一条直线上，车才会拐弯</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">速度方向和出发时的夹角</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{fmt(p.heading, 0)}<span className="ml-1 text-[15px] font-medium text-white/55">°</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="v" value={String(ROAD.speed)} unit="m/s · 大小不变" />
            <ParamTile symbol="路段" value={p.turn > 0 ? '左弯' : p.turn < 0 ? '右弯' : '直道'} unit={p.turn ? `半径 ${ROAD.R} m` : '方向不变'} />
          </div>
          <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">标记点</th><th className="font-normal">速度方向</th><th className="text-right font-normal">合力</th></tr></thead>
            <tbody>{MARKS.map(m => { const r = roadAt(m.s), ok = drawn.includes(m.key); return <tr key={m.key} className="border-t border-white/12"><td className="py-1.5">{m.key} · {sideOf(m.key)}</td><td className="tabular-nums">{ok ? `切线，偏左 ${fmt(r.heading, 0)}°` : '—'}</td><td className="text-right">{force ? (r.turn ? '指向里侧' : '为零') : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={go} disabled={moving || at >= MARKS.length - 1}>开到下一点</LabButton>
        <LabButton primary={next === 'draw'} pulse={next === 'draw'} onClick={draw} disabled={!here || drawn.includes(here)}>画切线</LabButton>
        <LabButton primary={next === 'force'} pulse={next === 'force'} onClick={showForce} disabled={drawn.length < 3 || force}>看合力</LabButton>
      </>}
      extras={null}
    />
  )
}
