// 光合作用和呼吸作用 · 第 7 课 让大棚多产一点（光合作用和呼吸作用原理在生产上的应用）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import House from './house'
import { LESSONS, goLesson } from './lessons'
import { PLANS, clock, photoAt, respAt, yieldIndex, yieldSoFar, type PlanKey } from './physics'

const WHY: Record<PlanKey, string> = {
  none: '什么都不做，作为对照',
  light: '光照时间长了，光合作用进行得更久',
  co2: '二氧化碳是原料：原料多了，光合作用更快',
  cool: '夜里只有呼吸作用：温度低，呼吸作用弱，消耗的有机物少',
}
const TASKS: Task[] = (Object.keys(PLANS) as PlanKey[]).map(k => ({ id: k, text: k === 'none' ? '什么都不做，过一天，记下产量' : `试试“${PLANS[k].name}”，再记一次`, note: `${yieldIndex(k)}：${WHY[k]}` }))

export default function Lesson7() {
  const [plan, setPlan] = useState<PlanKey>('none')
  const [goal, setGoal] = useState(0)
  const [rows, setRows] = useState<PlanKey[]>([])
  const T = useTasks('gewu:leaf:7', TASKS)
  const t = useSlide(goal, 8), moving = Math.abs(t - goal) > 0.01, done = goal === 24 && !moving
  const dup = rows.includes(plan)
  const pick = (k: PlanKey) => { if (moving) return; setPlan(k); setGoal(0) }
  const record = () => { if (!done || dup) return; const next = [...rows, plan]; setRows(next); T.check(id => next.includes(id as PlanKey)) }
  const resetAll = () => { setPlan('none'); setGoal(0); setRows([]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'plan' | 'run' | 'record' | null } = (() => {
    if (!task) return { hint: '都做完了。三种办法都增产了，道理各不相同。', next: null }
    if (moving) return { hint: goal === 24 ? '这一天在过：看有机物一点点攒起来' : '回到 0 时…', next: null }
    if (plan !== task.id) return { hint: `把措施换成“${PLANS[task.id as PlanKey].name}”`, next: 'plan' }
    if (done && !dup) return { hint: `这一天的产量是 ${yieldIndex(plan)}：按“记录”`, next: 'record' }
    return { hint: '按“过一天”', next: 'run' }
  })()

  return (
    <LabShell title="光合作用和呼吸作用" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="大棚"
      stage={<House t={t} plan={plan} />}
      lesson={<LessonBlock no="7" title="让大棚多产一点" concept="多制造一些，少消耗一些" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>菜长多少，要看一天里<b className="text-white">光合作用制造的有机物</b>减去<b className="text-white">呼吸作用消耗的有机物</b>还剩多少。所以增产有两条路：</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">多制造：</b>延长光照时间；给大棚增施二氧化碳（“气肥”）；合理密植，让叶片都晒到太阳</li>
            <li><b className="text-[#7fe3d4]">少消耗：</b>夜间适当降低温度，减弱呼吸作用</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">产量是按简化的规律算的相对值（什么都不做算 100），只用来比较大小，不是真实的增产幅度。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种做法都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">增产就是多制造一些、少消耗一些</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">延长光照和增施二氧化碳是让光合作用多干活；夜间降温是让呼吸作用少花掉一些。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再试一试</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{PLANS[plan].name} · {clock(t)}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{yieldSoFar(t, plan)}</div>
            <div className="mt-1 text-[12.5px] text-white/50">有机物积累，相对值（不处理的一整天 = 100）</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="光合" value={photoAt(t, plan).toFixed(1)} unit="这一刻制造的" />
            <ParamTile symbol="呼吸" value={respAt(t, plan).toFixed(1)} unit="这一刻消耗的" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每种做法过完一天后按“记录”，比一比谁的产量高。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">做法</th><th className="text-right font-normal">一天的产量</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{PLANS[k].name}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{yieldIndex(k)}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'run'} onClick={() => setGoal(24)} disabled={moving || goal === 24}>过一天</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!done || dup}>记录</LabButton>
      </>}
      extras={
        <Control label="措施">
          <Segmented label="措施" pulse={next === 'plan'} want={next === 'plan' ? task!.id as PlanKey : null} value={plan} disabled={moving} onChange={pick} options={(Object.keys(PLANS) as PlanKey[]).map(k => ({ value: k, label: PLANS[k].name }))} />
        </Control>
      }
    />
  )
}
