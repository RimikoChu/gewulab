// 呼吸 · 第 7 课 吸入和呼出的气体：实验台上两瓶澄清石灰水。向甲瓶吹进呼出的气体，用注射器向乙瓶推进同样多的空气，
// 比较哪瓶变浑浊；再看吸入和呼出气体的成分表。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useState } from 'react'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { AIR, PUSH_ML, cloud, co2In, co2Times } from './physics'
import { FLASK_AT, at } from './world'
import type { V3 } from './sdf'

const TASKS: Task[] = [
  { id: 'a', text: `向甲瓶吹进 ${PUSH_ML} mL 呼出的气体`, note: '甲瓶里的石灰水变浑浊了' },
  { id: 'b', text: `用注射器向乙瓶推进 ${PUSH_ML} mL 空气`, note: '乙瓶几乎还是清的' },
  { id: 'table', text: '看吸入和呼出气体的成分表', note: '呼出的气体里二氧化碳和水多了，氧少了' },
]
const F = (p: V3): V3 => at(FLASK_AT, [p[0] * 0.1, p[1] * 0.1, p[2] * 0.1])

export default function Lesson7() {
  const [table, setTable] = useState(false)
  const T = useTasks('gewu:breath:7', TASKS)
  const a = useRun(5, () => T.check(id => id === 'a'))
  const b = useRun(5, () => T.check(id => id === 'b'))
  const resetAll = () => { a.snap(0); b.snap(0); setTable(false); T.reset() }
  const cA = co2In('breath', PUSH_ML * a.k), cB = co2In('air', PUSH_ML * b.k)
  const task = T.current
  const { hint, next }: { hint: string; next: 'a' | 'b' | 'table' | null } = !task ? { hint: '二氧化碳能使澄清的石灰水变浑浊。呼出的气体里二氧化碳比空气里多得多。', next: null }
    : a.busy ? { hint: '往甲瓶里吹气…', next: null }
    : b.busy ? { hint: '往乙瓶里推空气…', next: null }
    : task.id === 'a' ? { hint: '两瓶都是澄清的石灰水。按“向甲瓶吹气”', next: 'a' }
    : task.id === 'b' ? { hint: '甲瓶浑了。按“向乙瓶推空气”，推进同样多的空气比一比', next: 'b' }
    : { hint: '按“看成分表”，比比吸入和呼出的气体', next: 'table' }
  const labels: Label[] = [
    { id: 'ja', at: F([-6.5, 16.5, 0]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>甲</small>呼出的气体</> },
    { id: 'yi', at: F([6.5, 16.5, 0]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>乙</small>空气</> },
    ...(a.k > 0 ? [{ id: 'ma', at: F([-6.5, -0.8, 4.5]), ax: 0.5, className: `scene-tag ${a.k > 0.99 ? 'key' : ''}`, children: a.k > 0.99 ? '变浑浊' : '冒气泡…' }] : []),
    ...(b.k > 0 ? [{ id: 'mb', at: F([6.5, -0.8, 4.5]), ax: 0.5, className: 'scene-tag', children: b.k > 0.99 ? '几乎不变' : '冒气泡…' }] : []),
    { id: 'mp', at: F([-19.5, 2.2, 5.2]), ax: 0.5, className: 'scene-name -translate-y-full', name: true, children: '吹气管' },
    { id: 'sy', at: F([26, 5.5, -1.5]), ax: 0.5, className: 'scene-name -translate-y-full', name: true, children: '注射器' },
    { id: 'lw', at: F([0, 2.0, 5]), ax: 0.5, className: 'scene-name', name: true, children: '澄清的石灰水' },
  ]
  return (
    <LabShell title="呼吸" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="石灰水"
      stage={<Place at="flask" labels={labels} want={{ lime: { murk: [cloud(cA), cloud(cB)], bub: [a.busy, b.busy], push: b.k } }} />}
      lesson={<LessonBlock no="7" title="吸入和呼出的气体" concept="呼出的气体里二氧化碳多" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>二氧化碳能使澄清的石灰水变浑浊。向两瓶石灰水里通入同样多的气体：通入呼出气体的那瓶很快变浑浊，通入空气的那瓶几乎不变，说明<b className="text-white">呼出的气体里二氧化碳比空气里多</b>。</p>
          <p className="mt-3">和吸入的空气相比，呼出的气体里二氧化碳和水分增多了，氧减少了。氧被身体的组织细胞用掉，二氧化碳是组织细胞产生的，经血液运到肺泡、再呼出体外。</p>
          <p className="mt-3 text-[13.5px] text-white/65">浑浊的快慢是示意：画面按通入的二氧化碳多少来画。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两瓶比过了，成分表也看了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">呼出的气体里二氧化碳和水增多，氧减少</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">各通入 {PUSH_ML} mL：甲瓶进了约 {co2In('breath', PUSH_ML)} mL 二氧化碳，乙瓶只有约 {co2In('air', PUSH_ML)} mL，差了 {co2Times()} 倍左右。呼出的气体里仍有 16% 的氧。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">通入的二氧化碳</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white/8 px-2 py-2.5"><div className="text-[12.5px] text-white/60">甲 · 呼出的气体</div><div className="mt-1 text-[26px] leading-none font-bold tabular-nums">{cA.toFixed(cA < 1 ? 2 : 1)}<span className="ml-1 text-[13px] font-medium text-white/55">mL</span></div></div>
            <div className="rounded-xl bg-white/8 px-2 py-2.5"><div className="text-[12.5px] text-white/60">乙 · 空气</div><div className="mt-1 text-[26px] leading-none font-bold tabular-nums">{cB.toFixed(2)}<span className="ml-1 text-[13px] font-medium text-white/55">mL</span></div></div>
          </div>
          {table && <>
            <h2 className="hint-in mt-4 text-[12.5px] text-white/55">吸入的空气和呼出的气体（体积分数）</h2>
            <table className="hint-in mt-2 w-full text-center text-[13.5px] tabular-nums">
              <thead><tr className="text-white/55"><th className="pb-1 font-medium" /><th className="pb-1 font-medium">吸入</th><th className="pb-1 font-medium">呼出</th></tr></thead>
              <tbody>{AIR.map(g => <tr key={g.key} className={g.in !== g.out ? 'bg-white/10' : 'bg-white/[0.04]'}><td className="rounded-l-lg py-1.5 text-white/70">{g.name}</td><td>{g.in}%</td><td className={`rounded-r-lg ${g.in !== g.out ? 'font-semibold' : ''}`}>{g.out}%</td></tr>)}</tbody>
            </table>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'a'} pulse={next === 'a'} onClick={() => a.run(1, 0)} disabled={a.busy || b.busy || a.k > 0.99}>向甲瓶吹气</LabButton>
        <LabButton primary={next === 'b'} pulse={next === 'b'} onClick={() => b.run(1, 0)} disabled={a.busy || b.busy || b.k > 0.99 || !T.done.a}>向乙瓶推空气</LabButton>
        <LabButton primary={next === 'table'} pulse={next === 'table'} onClick={() => { setTable(true); T.check(id => id === 'table') }} disabled={table || !T.done.b}>看成分表</LabButton>
      </>}
      extras={null}
    />
  )
}
