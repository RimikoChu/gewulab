// 导数 · 第 7 课 最省料的易拉罐（用导数解决实际问题中的最优化）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene7 from './scene7'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { canArea, canAreaD, canBest, canHeight, CAN_V, fmt } from './physics'

const TASKS: Task[] = [
  { id: 'r3', text: '把底面半径换成 3 cm，读用料', note: '又细又高：h ≈ 11.67 cm，S ≈ 276.5 cm²' },
  { id: 'r5', text: '换成 5 cm，再读一次', note: '又矮又胖：h ≈ 4.20 cm，S ≈ 289.1 cm²，反而更费料' },
  { id: 'best', text: '求导，找出最省料的半径', note: 'S′(r) = 0 时 r ≈ 3.74 cm，h = 2r ≈ 7.49 cm，S ≈ 264.4 cm²' },
]
type RKey = '3' | '5'
const B = canBest()
const START = 4.4

export default function Lesson7() {
  const [goal, setGoal] = useState(START)
  const [pick, setPick] = useState<RKey | ''>('')
  const [seen, setSeen] = useState<number[]>([])
  const T = useTasks('gewu:derivative:7', TASKS)
  const r = useSlide(goal, 0.9), moving = Math.abs(r - goal) > 1e-4
  useEffect(() => {
    if (moving || goal === START) return
    if (!seen.includes(goal)) setSeen(s => [...s, goal])
    T.check(id => (id === 'r3' && goal === 3) || (id === 'r5' && goal === 5) || (id === 'best' && goal === B.r))
  }, [moving, goal])   // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (k: RKey) => { setPick(k); setGoal(Number(k)) }
  const resetAll = () => { setGoal(START); setPick(''); setSeen([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'r' | 'best' | null } = !task ? { hint: '令 S′(r) = 0 求出的 r，就是最省料的半径：这时罐子的高正好等于底面直径。', next: null }
    : moving ? { hint: '罐子在变形，容积一直是 330 mL…', next: null }
    : task.id === 'r3' ? { hint: '把半径换成 3 cm：看罐子多高、要多少料', next: 'r' }
    : task.id === 'r5' ? { hint: '把半径换成 5 cm，再比一比', next: 'r' }
    : { hint: '按“求导找最省”：令 S′(r) = 0，解出 r', next: 'best' }
  const best = !moving && goal === B.r

  return (
    <LabShell title="导数" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="最省料"
      stage={<Scene7 r={r} best={best} />}
      lesson={<LessonBlock no="7" title="最省料的易拉罐" concept="令导数为 0，找出最省的那一个" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>把易拉罐看成圆柱，容积 <span className="font-formula italic">V = 330 cm³</span> 一定。底面半径 <span className="font-formula italic">r</span>，高 <span className="font-formula italic">h = V/(πr²)</span>，用料（表面积）</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">S(r) = 2πr² + 2πrh = 2πr² + 660/r</p>
          <p className="mt-2"><span className="font-formula italic">S′(r) = 4πr − 660/r²</span>。令 <span className="font-formula italic">S′(r) = 0</span>，得 <span className="font-formula italic">r³ = 165/π</span>，<span className="font-formula italic">r ≈ 3.74 cm</span>。在它左边 <span className="font-formula italic">S′ &lt; 0</span>、右边 <span className="font-formula italic">S′ &gt; 0</span>，所以这里 <span className="font-formula italic">S</span> 最小。这时 <span className="font-formula italic">h = 2r</span>：高等于底面直径。</p>
          <p className="mt-3">解实际问题的步骤：设变量、列函数（写明定义域）→ 求导 → 令导数为 0 求出可能的最值点 → 检验、作答。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">找到最省料的罐子了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">S′(r) = 0 时 r ≈ 3.74 cm，高等于直径，用料最少约 264.4 cm²</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">S(r) = 2πr² + 660/r</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{canArea(r).toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">cm² 用料</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="r" value={fmt(r, 2)} unit="cm · 底面半径" />
            <ParamTile symbol="h" value={fmt(canHeight(r), 2)} unit={`cm · 高（V = ${CAN_V} cm³）`} />
            <ParamTile symbol="S′(r)" value={fmt(canAreaD(r), 1)} unit={Math.abs(canAreaD(r)) < 0.05 ? '等于 0：最省' : canAreaD(r) < 0 ? '小于 0：再粗一点更省' : '大于 0：再细一点更省'} />
            <ParamTile symbol="h ÷ 2r" value={fmt(canHeight(r) / (2 * r), 2)} unit="高和直径之比" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">比过的罐子</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">r / cm</th><th className="font-normal">h / cm</th><th className="text-right font-normal">S / cm²</th></tr></thead>
            <tbody>{seen.map(v => <tr key={v} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{fmt(v, 2)}</td><td className="tabular-nums">{fmt(canHeight(v), 2)}</td><td className={`text-right tabular-nums ${v === B.r ? 'font-semibold text-[#7fe3d4]' : ''}`}>{canArea(v).toFixed(1)}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<LabButton primary pulse={next === 'best'} onClick={() => { setPick(''); setGoal(B.r) }} disabled={moving || !T.done.r5}>求导找最省</LabButton>}
      extras={<Control label="底面半径"><Segmented label="底面半径" pulse={next === 'r'} want={next === 'r' ? (task?.id === 'r3' ? '3' : '5') : null} value={pick as RKey} disabled={moving} onChange={k => choose(k as RKey)} options={[{ value: '3', label: '3 cm' }, { value: '5', label: '5 cm' }]} /></Control>}
    />
  )
}
