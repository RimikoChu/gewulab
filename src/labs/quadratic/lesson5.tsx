// 二次函数 · 第 5 课 水滴能升多高（二次函数和一元二次方程；判别式和交点个数）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene5 from './scene5'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { discAt, fmt, LEVELS, timesAt } from './physics'

type MKey = '15' | '20' | '25' | '0'
const KEYS = LEVELS.map(String) as MKey[]
const TASKS: Task[] = [
  { id: '15', text: '水滴能升到 15 m 吗？解方程', note: 'Δ > 0，两个根：1 s 时往上经过，3 s 时往下经过' },
  { id: '20', text: '能升到 20 m 吗？', note: 'Δ = 0，一个根：2 s 时刚好到 20 m，这就是最高点' },
  { id: '25', text: '能升到 25 m 吗？', note: 'Δ < 0，没有实数根：水滴到不了 25 m' },
  { id: '0', text: '水滴多久落回水面？', note: 'h = 0 时 t = 0 s 或 4 s：喷出 4 s 后落回' },
]

export default function Lesson5() {
  const [k, setK] = useState<MKey>('15')
  const [rows, setRows] = useState<MKey[]>([])
  const T = useTasks('gewu:quadratic:5', TASKS)
  const eq = k === '0' ? '−5t² + 20t = 0' : `−5t² + 20t − ${k} = 0`
  const m = +k, solved = rows.includes(k), d = discAt(m), ts = timesAt(m)
  const solve = () => { if (solved) return; const next = [...rows, k]; setRows(next); T.check(id => next.includes(id as MKey)) }
  const resetAll = () => { setK('15'); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'm' | 'solve' | null } = !task ? { hint: '四个高度都问过了。交点有几个，看判别式。', next: null }
    : k !== task.id ? { hint: `把高度换成 ${task.id} m`, next: 'm' }
    : { hint: `按“解方程”：解 ${eq}`, next: 'solve' }

  return (
    <LabShell title="二次函数" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="方程"
      stage={<Scene5 m={m} solved={solved} />}
      lesson={<LessonBlock no="5" title="水滴能升多高" concept="交点的个数看判别式" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>江心高喷的水从水面以 20 m/s 竖直喷出，不计空气阻力，水滴离水面的高度 <span className="font-formula italic">h</span>（m）和时间 <span className="font-formula italic">t</span>（s）满足 <span className="font-formula italic">h = 20t − 5t²</span>。图上的抛物线是高度随时间的变化，不是水柱的形状。</p>
          <p className="mt-3">问“水滴什么时候到 m 米高”，就是解一元二次方程 <span className="font-formula italic">−5t² + 20t = m</span>，也就是看抛物线和直线 <span className="font-formula italic">h = m</span> 有几个交点。</p>
          <p className="mt-3">方程 <span className="font-formula italic">ax² + bx + c = 0</span> 的判别式 <span className="font-formula italic">Δ = b² − 4ac</span>：Δ &gt; 0 有两个不等的实数根，图像和 x 轴有两个交点；Δ = 0 有两个相等的实数根，只有一个交点；Δ &lt; 0 没有实数根，没有交点。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四个高度都问过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">方程有几个实数根，抛物线和直线就有几个交点：看 Δ</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">{eq}</div>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight tabular-nums">{solved ? (ts.length ? ts.map(t => `${fmt(t)} s`).join('、') : '无实数根') : '—'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="Δ = b² − 4ac" value={solved ? fmt(d) : '—'} unit={solved ? (d > 0 ? '大于 0 · 两个交点' : d === 0 ? '等于 0 · 一个交点' : '小于 0 · 没有交点') : '解了才知道'} />
            <ParamTile symbol="m" value={k} unit="m · 问的高度" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">h / m</th><th className="text-right font-normal">Δ</th><th className="text-right font-normal">t / s</th></tr></thead>
            <tbody>{KEYS.filter(q => rows.includes(q)).map(q => { const r = timesAt(+q); return <tr key={q} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{q}</td><td className="text-right tabular-nums">{fmt(discAt(+q))}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{r.length ? r.map(t => fmt(t)).join('、') : '无'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'solve'} onClick={solve} disabled={solved}>解方程</LabButton></>}
      extras={<Control label="问的高度"><Segmented label="问的高度" pulse={next === 'm'} want={next === 'm' ? task!.id as MKey : null} value={k} onChange={setK} options={KEYS.map(q => ({ value: q, label: `${q} m` }))} /></Control>}
    />
  )
}
