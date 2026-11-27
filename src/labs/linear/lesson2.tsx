// 一次函数 · 第 2 课 一个对一个（函数的概念：自变量、函数值）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene2 from './scene2'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { PRICE, cost } from './physics'

const TASKS: Task[] = [
  { id: '10', text: '加 10 升，读出金额', note: '10 升，75.00 元' },
  { id: '20', text: '加到 20 升，再读', note: '20 升，150.00 元' },
  { id: '30', text: '加到 30 升，写出金额和升数的关系', note: 'y = 7.5x：每个升数只对应一个金额' },
]
const STEPS = [10, 20, 30]

export default function Lesson2() {
  const [goal, setGoal] = useState(0)
  const [rows, setRows] = useState<number[]>([])
  const T = useTasks('gewu:linear:2', TASKS)
  const x = useSlide(goal, 5), moving = Math.abs(x - goal) > 1e-3
  // 跳表停下：记一行
  useEffect(() => { if (moving || !goal || rows.includes(goal)) return; const n = [...rows, goal]; setRows(n); T.check(id => n.includes(+id)) }, [moving, goal])   // eslint-disable-line react-hooks/exhaustive-deps
  const fill = () => { if (moving || goal >= 30) return; setGoal(goal + 10) }
  const resetAll = () => { setGoal(0); setRows([]); T.reset() }
  const { hint, next }: { hint: string; next: 'fill' | null } = !T.current ? { hint: '升数每取一个值，金额都只有一个值和它对应。', next: null }
    : moving ? { hint: '加油机在跳表：升数和金额一起往上走…', next: null }
    : goal === 0 ? { hint: '按“加 10 升”，看屏上的金额', next: 'fill' }
    : { hint: `${goal} 升是 ${cost(goal).toFixed(2)} 元。按“加 10 升”，再加一次`, next: 'fill' }
  return (
    <LabShell title="一次函数" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="加油机"
      stage={<Scene2 litres={x} money={cost(x)} />}
      lesson={<LessonBlock no="2" title="一个对一个" concept="一个 x 只对应一个 y，y 就是 x 的函数" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <p>在一个变化过程中，有两个变量 x 和 y。如果 x 每取一个确定的值，y 都有<b className="text-[#7fe3d4]">唯一确定</b>的值和它对应，就说 x 是<b className="text-[#7fe3d4]">自变量</b>，y 是 x 的<b className="text-[#7fe3d4]">函数</b>。</p>
          <p className="mt-3">加油时，加油量 x 升是自变量，金额 y 元是 x 的函数：y = 7.5x。x = 20 时，函数值 y = 150。</p>
          <p className="mt-3 text-[13.5px] text-white/65">单价 7.50 元/升在这一次加油里不变，是常量。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">加了 30 升，225.00 元</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">金额 y 是加油量 x 的函数：y = 7.5x</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">x 是自变量。x 每取一个值，y 都有唯一的值和它对应：10 升只能是 75 元，不会有第二个价钱。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">y = 7.5x</div>
            <div className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">{cost(x).toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">元</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="x" value={x.toFixed(2)} unit="升 · 加油量（自变量）" />
            <ParamTile symbol="单价" value={PRICE.toFixed(2)} unit="元/升 · 不变" />
          </div>
          <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">加油量 x / 升</th><th className="text-right font-normal">金额 y / 元</th></tr></thead>
            <tbody>{rows.map(v => <tr key={v} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{v}</td><td className="text-right font-semibold text-[#ffd25a] tabular-nums">{cost(v).toFixed(2)}</td></tr>)}</tbody>
          </table>
          {rows.length === STEPS.length && <p className="row-in mt-3 text-[13.5px] leading-relaxed text-white/75">每一行的 y 都是 x 的 7.5 倍：一个 x 只对应一个 y。</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'fill'} onClick={fill} disabled={moving || goal >= 30}>加 10 升</LabButton>
      </>}
      extras={null}
    />
  )
}
