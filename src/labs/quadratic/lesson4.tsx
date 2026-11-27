// 二次函数 · 第 4 课 投篮的轨迹（一般式配方成顶点式；顶点公式）
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { cn } from '@/lib/utils'
import Scene4 from './scene4'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { complete, fmt, HOOP, SHOT, shotSpeed, vertexOf } from './physics'

const TASKS: Task[] = [
  { id: 'shoot', text: '投一次篮', note: '球沿抛物线 y = −0.2x² + x + 2.25 进了篮' },
  { id: 's1', text: '配方第一步：提出二次项系数', note: '把 −0.2 提到括号外：x² − 5x' },
  { id: 's2', text: '配方第二步：加上再减去一次项系数一半的平方', note: '(−5 ÷ 2)² = 6.25，加上再减去，式子不变' },
  { id: 's3', text: '配方第三步：写成顶点式', note: 'y = −0.2(x − 2.5)² + 3.5：球最高 3.5 m' },
]
const LINES = complete(SHOT.a, SHOT.b, SHOT.c)
const NOTE = ['一般式', '提出 −0.2', '加上再减去 6.25', '顶点式']
const FLIGHT = HOOP.x / shotSpeed() + 0.9   // 出手到落地（s）

export default function Lesson4() {
  const [shot, setShot] = useState(false)
  const [step, setStep] = useState(0)
  const T = useTasks('gewu:quadratic:4', TASKS)
  const t = useSlide(shot ? FLIGHT : 0, shot ? 1 : 1000)
  const flown = shot && t >= FLIGHT - 1e-6
  const shoot = () => { setShot(true); setTimeout(() => T.check(id => id === 'shoot'), (FLIGHT - 0.6) * 1000) }
  const again = () => { setShot(false); setTimeout(() => setShot(true), 60) }
  const nextStep = () => { if (step >= 3) return; const s = step + 1; setStep(s); T.check(id => id === `s${s}` || (id === 'shoot' && flown)) }
  const resetAll = () => { setShot(false); setStep(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'shoot' | 'step' | null } = !task ? { hint: '配方配出了顶点：球在离出手处水平 2.5 m 时最高，3.5 m。', next: null }
    : task.id === 'shoot' ? (shot ? { hint: '球飞出去了…', next: null } : { hint: '按“投篮”：投篮机把球投出去', next: 'shoot' })
    : task.id === 's1' ? { hint: '按“配方下一步”：先把 −0.2 提到括号外', next: 'step' }
    : task.id === 's2' ? { hint: '按“配方下一步”：括号里加上再减去 6.25', next: 'step' }
    : { hint: '按“配方下一步”：凑成完全平方，整理成顶点式', next: 'step' }
  const [vx, vy] = vertexOf(SHOT.a, SHOT.b, SHOT.c)

  return (
    <LabShell title="二次函数" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="投篮和配方"
      stage={<Scene4 t={shot ? t : null} flown={flown || step > 0} vertex={step >= 3} />}
      lesson={<LessonBlock no="4" title="投篮的轨迹" concept="配方，就能读出顶点" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一般式 <span className="font-formula italic">y = ax² + bx + c</span> 看不出顶点。配方：先把 <span className="font-formula italic">a</span> 提出来，括号里加上再减去一次项系数一半的平方，凑成完全平方，就得到顶点式 <span className="font-formula italic">y = a(x − h)² + k</span>。</p>
          <p className="mt-3">一般地，顶点是 <span className="font-formula italic">(−b/2a, (4ac − b²)/4a)</span>，对称轴是 <span className="font-formula italic">x = −b/2a</span>。这里 <span className="font-formula italic">−b/2a = −1 ÷ (−0.4) = 2.5</span>。</p>
          <p className="mt-3">球出手离地 2.25 m，篮圈离出手处水平 4 m：把 x = 4 代进去，y = 3.05 m，正是篮圈的高度。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">配方配完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">y = −0.2(x − 2.5)² + 3.5：顶点 (2.5, 3.5)，球最高 3.5 m</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">配方</h2>
          <ol className="mt-2 flex flex-col gap-1.5">
            {LINES.map((l, i) => (
              <li key={i} className={cn('rounded-xl px-3 py-2 transition-opacity', i <= step ? 'bg-white/8 opacity-100' : 'opacity-25', i === step && 'row-in')}>
                <div className="text-[11.5px] text-white/50">{NOTE[i]}</div>
                <div className={cn('font-formula text-[17px] leading-snug italic', i === 3 && i <= step && 'font-bold text-[#7fe3d4]')}>{i <= step ? l : '…'}</div>
              </li>
            ))}
          </ol>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="顶点" value={step >= 3 ? `(${fmt(vx)}, ${fmt(vy)})` : '—'} unit="m · 最高点" />
            <ParamTile symbol="x = 4 时" value={flown || step > 0 ? fmt(HOOP.y) : '—'} unit="m · 篮圈高" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'shoot'} pulse={next === 'shoot'} onClick={shot ? again : shoot} disabled={shot && !flown}>{shot ? '再投一次' : '投篮'}</LabButton>
        <LabButton primary={next === 'step'} pulse={next === 'step'} onClick={nextStep} disabled={step >= 3 || !T.done.shoot}>配方下一步</LabButton>
      </>}
      extras={null}
    />
  )
}
