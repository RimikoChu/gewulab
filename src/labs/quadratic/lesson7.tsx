// 二次函数 · 第 7 课 围一个最大的花圃（实际问题中的最大值：配方求顶点）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene7 from './scene7'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { FENCE, fenceArea, fmt, SIDES } from './physics'

type XKey = '3' | '5' | '7'
const KEYS = SIDES.map(String) as XKey[]
const TASKS: Task[] = [
  { id: '3', text: '垂直于墙的边取 3 m，看面积', note: 'x = 3 m：14 × 3 = 42 m²' },
  { id: '7', text: '换成 7 m', note: 'x = 7 m：6 × 7 = 42 m²，和 3 m 时一样大' },
  { id: '5', text: '换成 5 m', note: 'x = 5 m：10 × 5 = 50 m²，比两边都大' },
  { id: 'max', text: '配方，求面积的最大值', note: 'S = −2(x − 5)² + 50：x = 5 m 时最大，50 m²' },
]

export default function Lesson7() {
  const [k, setK] = useState<XKey>('3')
  const [rows, setRows] = useState<XKey[]>([])
  const [peak, setPeak] = useState(false)
  const T = useTasks('gewu:quadratic:7', TASKS)
  const x = useSlide(+k, 1.2), settled = x === +k
  useEffect(() => { if (!settled) return; const next = rows.includes(k) ? rows : [...rows, k]; if (next !== rows) setRows(next); T.check(id => next.includes(id as XKey)) }, [settled, k, rows])   // eslint-disable-line react-hooks/exhaustive-deps
  const solve = () => { if (rows.length < 3) return; setPeak(true); T.check(id => id === 'max') }
  const resetAll = () => { setK('3'); setRows([]); setPeak(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'x' | 'max' | null } = !task ? { hint: '找到了：垂直于墙的边取 5 m，花圃最大，50 m²。', next: null }
    : task.id === 'max' ? { hint: '按“配方求最大”：把 S = −2x² + 20x 配成顶点式', next: 'max' }
    : k !== task.id ? { hint: `把 x 换成 ${task.id} m`, next: 'x' } : { hint: '栅栏在挪…', next: null }

  return (
    <LabShell title="二次函数" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="花圃"
      stage={<Scene7 x={x} pts={rows.map(Number)} peak={peak} />}
      lesson={<LessonBlock no="7" title="围一个最大的花圃" concept="顶点就是最大值" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>用 20 m 长的栅栏靠墙围一个矩形花圃（墙足够长）。垂直于墙的两边各长 <span className="font-formula italic">x</span> m，平行于墙的一边长 <span className="font-formula italic">(20 − 2x)</span> m，面积</p>
          <p className="mt-2 text-center font-formula italic">S = x(20 − 2x) = −2x² + 20x</p>
          <p className="mt-3">配方：<span className="font-formula italic">S = −2(x² − 10x) = −2(x² − 10x + 25 − 25) = −2(x − 5)² + 50</span>。a = −2 &lt; 0，开口向下，顶点 (5, 50) 是最高点：x = 5 m 时面积最大，是 50 m²。</p>
          <p className="mt-3">x 的取值要让每条边都是正的：0 &lt; x &lt; 10。x = 3 和 x = 7 关于对称轴 x = 5 对称，面积相等。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">最大的花圃找到了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">S = −2(x − 5)² + 50：x = 5 m 时面积最大，50 m²</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">{peak ? 'S = −2(x − 5)² + 50' : 'S = x(20 − 2x)'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{settled ? fmt(fenceArea(+k)) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m²</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="x" value={k} unit="m · 垂直于墙" />
            <ParamTile symbol="20 − 2x" value={fmt(FENCE - 2 * +k)} unit="m · 平行于墙" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">x / m</th><th className="text-right font-normal">20 − 2x</th><th className="text-right font-normal">S / m²</th></tr></thead>
            <tbody>{KEYS.filter(q => rows.includes(q)).map(q => <tr key={q} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{q}</td><td className="text-right tabular-nums">{FENCE - 2 * +q}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{fenceArea(+q)}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'max'} onClick={solve} disabled={rows.length < 3 || peak}>配方求最大</LabButton></>}
      extras={<Control label="垂直于墙的边 x"><Segmented label="垂直于墙的边 x" pulse={next === 'x'} want={next === 'x' ? task!.id as XKey : null} value={k} onChange={setK} options={KEYS.map(q => ({ value: q, label: `${q} m` }))} /></Control>}
    />
  )
}
