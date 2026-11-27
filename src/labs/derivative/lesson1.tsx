// 导数 · 第 1 课 这几秒开了多快（平均变化率；割线的斜率）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene1 from './scene1'
import { useRamp } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { dist, fmt, RUN, SPANS, spanSpeed, type SpanKey } from './physics'

const TASKS: Task[] = [
  { id: 'go', text: '让车起步，开 8 s', note: '屏上描出的是 s = t²：路程越往后涨得越快' },
  { id: 'a', text: '选 0–2 s，读平均速度', note: 'Δs ÷ Δt = 4 ÷ 2 = 2 m/s' },
  { id: 'b', text: '选 2–6 s，再读一次', note: '32 ÷ 4 = 8 m/s：割线更陡了' },
  { id: 'c', text: '选 6–8 s，再读一次', note: '28 ÷ 2 = 14 m/s：越往后开得越快' },
]
const KEYS = Object.keys(SPANS) as SpanKey[]
const NAME: Record<SpanKey, string> = { a: '0–2 s', b: '2–6 s', c: '6–8 s' }

export default function Lesson1() {
  const [run, setRun] = useState(0)
  const [span, setSpan] = useState<SpanKey | null>(null)
  const [seen, setSeen] = useState<SpanKey[]>([])
  const [pick, setPick] = useState(0)
  const T = useTasks('gewu:derivative:1', TASKS)
  const p = useRamp(run, RUN), t = run ? p * RUN : T.done.go ? RUN : 0, arrived = run > 0 && p >= 1
  const grow = useRamp(span ? pick : 0, 1.4)
  useEffect(() => { if (arrived) T.check(id => id === 'go') }, [arrived])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (span && grow >= 1) { const n = seen.includes(span) ? seen : [...seen, span]; if (n !== seen) setSeen(n); T.check(id => id === span) } }, [grow >= 1, span])   // eslint-disable-line react-hooks/exhaustive-deps
  const go = () => { setSpan(null); setRun(r => r + 1) }
  const resetAll = () => { setRun(0); setSpan(null); setSeen([]); setPick(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'go' | 'span' | null } = !task ? { hint: '平均速度就是 s–t 图像上割线的斜率：割线越陡，这段时间开得越快。', next: null }
    : task.id === 'go' ? (run && !arrived ? { hint: '车在加速，屏上同步描出路程和时间的关系…', next: null } : { hint: '按“出发”：车从停车线起步，开 8 s', next: 'go' })
    : span === task.id && grow < 1 ? { hint: '先找 Δt、Δs，再连成割线…', next: null }
    : { hint: `把时间段换成 ${NAME[task.id as SpanKey]}`, next: 'span' }
  const sp = span ? SPANS[span] : null

  return (
    <LabShell title="导数" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="起步"
      stage={<Scene1 t={t} span={sp ? [sp[0], sp[1]] : null} grow={grow} />}
      lesson={<LessonBlock no="1" title="这几秒开了多快" concept="平均变化率就是割线的斜率" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>车从停车线起步，路程 <span className="font-formula italic">s</span>（m）和时间 <span className="font-formula italic">t</span>（s）的关系是 <span className="font-formula italic">s = t²</span>。从 <span className="font-formula italic">t₁</span> 到 <span className="font-formula italic">t₂</span> 的<b className="text-white">平均速度</b>是</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">v̄ = Δs / Δt = (s(t₂) − s(t₁)) / (t₂ − t₁)</p>
          <p className="mt-3">一般地，函数 <span className="font-formula italic">y = f(x)</span> 从 <span className="font-formula italic">x₁</span> 到 <span className="font-formula italic">x₂</span> 的<b className="text-white">平均变化率</b>是 <span className="font-formula italic">Δy/Δx</span>。它就是图像上过 <span className="font-formula italic">(x₁, f(x₁))</span>、<span className="font-formula italic">(x₂, f(x₂))</span> 两点的割线的斜率。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三段都算过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">平均速度 Δs/Δt 是割线的斜率：2、8、14 m/s，越往后越快</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">v̄ = Δs / Δt</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{span && grow >= 1 ? fmt(spanSpeed(span)) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m/s 平均速度</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="Δt" value={sp ? fmt(sp[1] - sp[0]) : '—'} unit="s · 经过的时间" />
            <ParamTile symbol="Δs" value={sp ? fmt(dist(sp[1]) - dist(sp[0])) : '—'} unit="m · 开过的路" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">算过的时间段</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">时间段</th><th className="font-normal">Δs / m</th><th className="text-right font-normal">平均速度</th></tr></thead>
            <tbody>{KEYS.filter(k => seen.includes(k)).map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{NAME[k]}</td><td className="tabular-nums">{fmt(dist(SPANS[k][1]) - dist(SPANS[k][0]))}</td><td className="text-right tabular-nums">{fmt(spanSpeed(k))} m/s</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<LabButton primary pulse={next === 'go'} onClick={go} disabled={run > 0 && !arrived}>{run ? '再开一次' : '出发'}</LabButton>}
      extras={<Control label="时间段"><Segmented label="时间段" pulse={next === 'span'} want={next === 'span' ? (task?.id as SpanKey) : null} value={(span ?? '') as SpanKey} disabled={!T.done.go} onChange={k => { setSpan(k as SpanKey); setPick(n => n + 1) }} options={KEYS.map(k => ({ value: k, label: NAME[k] }))} /></Control>}
    />
  )
}
