// 导数 · 第 3 课 坡有多陡（导数的几何意义：切线的斜率；切线方程）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene3 from './scene3'
import { useRamp } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { DXS, fmt, lineText, P3, Q3, road, ROAD_TEXT, secant3, slope, tangent } from './physics'

const TASKS: Task[] = [
  { id: 'sec', text: '连割线 PQ（Q 在 x = 5）', note: '割线斜率 (0 − 8) ÷ 2 = −4：这一段平均每百米降 4 m' },
  { id: 'near', text: '让 Q 沿着路逼近 P', note: '斜率 −4、−5.5、−5.875、−5.995：越来越接近 −6' },
  { id: 'tan', text: '画出 P 处的切线，写出切线方程', note: '切线斜率 f′(3) = −6，切线 y = −6x + 26；路牌上写的正是下坡 6%' },
]
const D0 = Q3 - P3, D1 = 0.02
const T = tangent(road, slope, P3)

export default function Lesson3() {
  const [sec, setSec] = useState(0)
  const [near, setNear] = useState(0)
  const [tan, setTan] = useState(0)
  const K = useTasks('gewu:derivative:3', TASKS)
  const grow = useRamp(sec, 1.6), p = useRamp(near, 5.5, true), tg = useRamp(tan, 1.4, true)
  const dx = !(sec || K.done.sec) ? 0 : near ? D0 * (D1 / D0) ** p : D0
  const busy = (sec > 0 && grow < 1) || (near > 0 && p < 1) || (tan > 0 && tg < 1)
  useEffect(() => { if (sec && grow >= 1) K.check(id => id === 'sec') }, [grow >= 1, sec])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (near && p >= 1) K.check(id => id === 'near') }, [p >= 1, near])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tan && tg >= 1) K.check(id => id === 'tan') }, [tg >= 1, tan])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setSec(0); setNear(0); setTan(0); K.reset() }
  const task = K.current
  const { hint, next }: { hint: string; next: 'sec' | 'near' | 'tan' | null } = !task ? { hint: '切线的斜率就是导数：f′(3) = −6，这里是下坡 6%。', next: null }
    : busy ? { hint: near && p < 1 ? 'Q 沿着路滑向 P，割线绕着 P 转…' : '正在画…', next: null }
    : task.id === 'sec' ? { hint: '按“连割线 PQ”：车停在 P（x = 3），Q 在前面 200 m 的谷底', next: 'sec' }
    : task.id === 'near' ? { hint: '按“Q 逼近 P”：让 Q 沿着路一直滑到 P 跟前', next: 'near' }
    : { hint: '按“画切线”：割线转到的那个位置，就是 P 处的切线', next: 'tan' }
  const passed = DXS.filter(d => dx <= d * 1.0001)

  return (
    <LabShell title="导数" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={K.banner} onReset={resetAll} hint={hint} actionsLabel="割线和切线"
      stage={<Scene3 dx={dx} grow={sec ? grow : dx ? 1 : 0} tan={tan ? tg : K.done.tan ? 1 : 0} />}
      lesson={<LessonBlock no="3" title="坡有多陡" concept="切线的斜率就是导数" tasks={TASKS} done={K.done} current={task?.id}
        theory={<>
          <p>山路的纵断面是 <span className="font-formula italic">{ROAD_TEXT}</span>。<span className="font-formula italic">x</span> 的单位是百米，<span className="font-formula italic">y</span> 的单位是米，所以斜率就是“每走 100 m 升高几米”，正好是路牌上的坡度百分数。</p>
          <p className="mt-3">Q 沿曲线逼近 P 时，割线 PQ 绕着 P 转，趋于一个确定的位置，这条直线叫曲线在 P 处的<b className="text-white">切线</b>。切线的斜率就是 <span className="font-formula italic">f′(x₀)</span>：这是导数的<b className="text-white">几何意义</b>。</p>
          <p className="mt-3">P 处的切线方程是 <span className="font-formula italic">y − f(x₀) = f′(x₀)(x − x₀)</span>。这里 <span className="font-formula italic">y − 8 = −6(x − 3)</span>，即 <span className="font-formula italic">y = −6x + 26</span>。</p>
        </>} />}
      finale={K.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">割线转成了切线</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">切线的斜率就是导数：f′(3) = −6，切线 y = −6x + 26，下坡 6%</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">{tg >= 1 ? 'f′(3)' : 'Δy / Δx'}</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{tg >= 1 ? fmt(T.k) : sec ? fmt(secant3(dx), dx < 0.05 ? 4 : 3) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">{tg >= 1 ? '切线斜率' : '割线斜率'}</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="Δx" value={sec ? fmt(dx, 3) : '—'} unit="百米 · Q 离 P" />
            <ParamTile symbol="坡度" value={tg >= 1 ? '−6%' : '—'} unit="下坡 · 路牌" />
          </div>
          {tg >= 1 && <p className="row-in mt-3 rounded-xl bg-white/8 px-3 py-2 text-center font-formula text-[18px] italic">{lineText(T.k, T.b)}</p>}
          <h2 className="mt-4 text-[12.5px] text-white/55">割线 PQ 的斜率</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">Δx / 百米</th><th className="text-right font-normal">斜率</th></tr></thead>
            <tbody>{sec ? passed.map(d => <tr key={d} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{fmt(d)}</td><td className="text-right tabular-nums">{fmt(secant3(d))}</td></tr>) : null}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'sec'} pulse={next === 'sec'} onClick={() => setSec(s => s + 1)} disabled={busy || sec > 0}>连割线 PQ</LabButton>
        <LabButton primary={next === 'near'} pulse={next === 'near'} onClick={() => setNear(n => n + 1)} disabled={busy || !K.done.sec}>Q 逼近 P</LabButton>
        <LabButton primary={next === 'tan'} pulse={next === 'tan'} onClick={() => setTan(t => t + 1)} disabled={busy || !K.done.near || tan > 0}>画切线</LabButton>
      </>}
      extras={null}
    />
  )
}
