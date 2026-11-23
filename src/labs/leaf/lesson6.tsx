// 光合作用和呼吸作用 · 第 6 课 大棚的一昼夜（光合作用只在有光时进行，呼吸作用时刻进行）
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import House from './house'
import { LESSONS, goLesson } from './lessons'
import { MARKS, balanceTimes, clock, co2At, lightAt, photoAt, respAt, stored } from './physics'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = MARKS.map(h => ({
  id: String(h), text: `到 ${h} 时，记下二氧化碳浓度`,
  note: h === 6 ? '一夜只有呼吸作用：二氧化碳越积越多' : h === 12 ? '天亮后光合作用超过了呼吸作用：二氧化碳降下来了' : h === 18 ? '晒了一整天：二氧化碳降到很低' : '天黑后又只剩呼吸作用：二氧化碳回升',
}))
// 面板上那条曲线：横轴 0–24 时，纵轴二氧化碳浓度
const CW = 264, CH = 96, LO = 50, HI = 120
const px = (t: number) => t / 24 * CW, py = (v: number) => CH - (v - LO) / (HI - LO) * CH
const CURVE = Array.from({ length: 97 }, (_, i) => `${i ? 'L' : 'M'}${px(i / 4).toFixed(1)},${py(co2At(i / 4)).toFixed(1)}`).join(' ')

export default function Lesson6() {
  const [goal, setGoal] = useState(0)
  const [rows, setRows] = useState<number[]>([])
  const T = useTasks('gewu:leaf:6', TASKS)
  const t = useSlide(goal, 4), moving = Math.abs(t - goal) > 0.01
  const dup = rows.includes(goal)
  const step = () => { if (moving || goal >= 24) return; setGoal(g => g + 6) }
  const record = () => { if (moving || goal === 0 || dup) return; const next = [...rows, goal]; setRows(next); T.check(id => next.includes(Number(id))) }
  const resetAll = () => { setGoal(0); setRows([]); T.reset() }
  const [hi, lo] = balanceTimes()

  const task = T.current
  const { hint, next }: { hint: string; next: 'step' | 'record' | null } = (() => {
    if (!task) return { hint: `都做完了。二氧化碳约 ${clock(hi)}最高、${clock(lo)}最低。`, next: null }
    if (moving) return { hint: lightAt(t) > 0 ? '白天：光合作用和呼吸作用同时进行' : '夜里：只有呼吸作用', next: null }
    if (goal === Number(task.id)) return { hint: `${goal} 时了：按“记录”`, next: 'record' }
    return { hint: `按“到下一个时刻”，走到 ${task.id} 时`, next: 'step' }
  })()

  return (
    <LabShell narration={voiced(NARRATION['6'], VOICE)} title="光合作用和呼吸作用" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="时间"
      stage={<House t={t} />}
      lesson={<LessonBlock no="6" title="大棚的一昼夜" concept="光合作用白天才有，呼吸作用昼夜不停" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>关紧门窗的大棚里，二氧化碳的多少由两件事决定：</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">光合作用：</b>吸收二氧化碳，只在有光时进行，光越强越快</li>
            <li><b className="text-[#7fe3d4]">呼吸作用：</b>放出二氧化碳，白天黑夜都在进行</li>
          </ul>
          <p className="mt-3">夜里只有呼吸作用，二氧化碳越来越多；天亮后光合作用很快超过呼吸作用，二氧化碳一路下降，直到傍晚光弱下来。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里的数都是按简化的规律算的相对值（0 时算 100），只用来比较大小和看变化的方向。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">一昼夜走完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">二氧化碳清晨最高，傍晚最低</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">24 时比 0 时低：这一天光合作用制造的有机物，比呼吸作用消耗的多，菜长了。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{clock(t)} · 棚里的二氧化碳</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{co2At(t).toFixed(1)}</div>
            <div className="mt-1 text-[12.5px] text-white/50">相对值，0 时 = 100</div>
          </div>
          <svg viewBox={`-2 -6 ${CW + 4} ${CH + 22}`} className="mt-3 w-full" role="img" aria-label="一昼夜里二氧化碳浓度的变化">
            <rect x={px(6)} y={0} width={px(12)} height={CH} fill="#ffe9a8" opacity={0.1} />
            <line x1={0} y1={py(100)} x2={CW} y2={py(100)} stroke="#ffffff" strokeOpacity={0.18} strokeDasharray="3 4" />
            <path d={CURVE} fill="none" stroke="#7fe3d4" strokeWidth={2} />
            {rows.map(h => <circle key={h} cx={px(h)} cy={py(co2At(h))} r={3.5} fill="#ffe14d" />)}
            <circle cx={px(t)} cy={py(co2At(t))} r={4.5} fill="#ffffff" />
            {[0, 6, 12, 18, 24].map(h => <text key={h} x={px(h)} y={CH + 13} textAnchor="middle" fontSize={10} fill="#ffffff" fillOpacity={0.5}>{h} 时</text>)}
          </svg>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ParamTile symbol="光合" value={photoAt(t).toFixed(1)} unit="吸收二氧化碳" />
            <ParamTile symbol="呼吸" value={respAt(t).toFixed(1)} unit="放出二氧化碳" />
            <ParamTile symbol="积累" value={stored(t).toFixed(1)} unit="有机物" />
          </div>
          {rows.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">时刻</th><th className="text-right font-normal">二氧化碳</th><th className="text-right font-normal">有机物积累</th></tr></thead>
            <tbody>{rows.map(h => <tr key={h} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{h} 时</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{co2At(h).toFixed(1)}</td><td className="text-right tabular-nums">{stored(h).toFixed(1)}</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'step'} onClick={step} disabled={moving || goal >= 24}>到下一个时刻</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={moving || goal === 0 || dup}>记录</LabButton>
      </>}
      extras={null}
    />
  )
}
