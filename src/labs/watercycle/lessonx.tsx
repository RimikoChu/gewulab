// 水循环 · 拓展课：三个小专题。哪种水换得最快（更新周期）、把水调到缺水的地方（跨流域调水）、砍掉山上的森林。
import { useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import Basin from './basin'
import { LESSONS, goLesson } from './lessons'
import { RAIN, RENEW, runoff } from './physics'
import { ground } from './world'

type Sub = 'renew' | 'canal' | 'cut'
const SUBS: Record<Sub, { name: string; title: string; say: string; button: string }> = {
  renew: { name: '哪种水换得最快', title: '更新一遍，河水十几天，冰川近万年', button: '排一排', say: '水体更新得越快，被用掉、被弄脏以后恢复得越快。河水十几天就换一遍；深层地下水和冰川要上千年，抽干了、化掉了，几代人都补不回来。' },
  canal: { name: '把水调到缺水的地方', title: '跨流域调水改的是径流在空间上的分配', button: '开闸', say: '水库改的是径流在时间上的分配；修一条引水渠把水送到另一个流域，改的是它在空间上的分配。南水北调就是这样的工程。' },
  cut: { name: '砍掉山上的森林', title: '林地变裸地，雨水留不住', button: '砍掉森林再下雨', say: `同样下 ${RAIN} mm 的雨，林地流走 ${runoff('forest')} mm，变成裸地后流走 ${runoff('bare')} mm。下渗少了，地表径流多了：下雨时河水暴涨，雨一停又很快没水。` },
}
const ORDER: Sub[] = ['renew', 'canal', 'cut']
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：按“${SUBS[k].button}”`, note: SUBS[k].title }))

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('renew')
  const [did, setDid] = useState<Sub[]>([])
  const T = useTasks('gewu:watercycle:x', TASKS)
  const timer = useRef(0)
  const act = () => { if (did.includes(sub)) return; const next = [...did, sub]; setDid(next); clearTimeout(timer.current); timer.current = window.setTimeout(() => T.check(id => next.includes(id as Sub)), 1800) }
  const resetAll = () => { clearTimeout(timer.current); setSub('renew'); setDid([]); T.reset() }
  const task = T.current, on = did.includes(sub)
  const { hint, next }: { hint: string; next: 'sub' | 'act' | null } = !task ? { hint: '三个专题都看完了。', next: null }
    : sub !== task.id ? { hint: `接着看：${SUBS[task.id as Sub].name}`, next: 'sub' } : on ? { hint: '看流域里的变化…', next: null } : { hint: `按“${SUBS[sub].button}”`, next: 'act' }
  const labels: Label[] = sub === 'canal' && on ? [{ id: 'c', at: [1, ground(1, -9) + 1.4, -9], ax: 0.5, className: 'scene-tag key -translate-y-full', children: '引水渠：送往另一个流域' }]
    : sub === 'cut' && on ? [{ id: 'f', at: [15, ground(15, 5) + 2, 5], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>地表径流</small>{runoff('forest')} → {runoff('bare')} mm</> }] : []

  return (
    <LabShell title="水循环" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={<Basin at={sub === 'cut' ? 'hill' : sub === 'canal' ? 'dam' : 'all'} labels={labels} want={{ dam: sub === 'canal', canal: sub === 'canal' && on, forest: !(sub === 'cut' && on), rain: sub === 'cut' && on ? ['land'] : [], flow: sub === 'cut' && on ? 2.2 : sub === 'canal' && on ? 0.6 : 1 }} />}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{SUBS[sub].say}</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个专题都看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">人能改的主要是地表径流和下渗这两环</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">修水库、调水、种树、铺路，改的都是水在地面上怎么走。改之前，先看它会把水带到哪里。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SUBS[sub].name}</div>
            <div className="mt-1 text-[22px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{SUBS[sub].title}</div>
          </div>
          {sub === 'renew' && on && <table className="row-in mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">水体</th><th className="text-right font-normal">更新一遍要</th></tr></thead>
            <tbody>{RENEW.map(r => <tr key={r.name} className="border-t border-white/12"><td className="py-1.5 text-white/80">{r.name}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{r.text}</td></tr>)}</tbody>
          </table>}
          {sub === 'cut' && <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="林地" value={`${runoff('forest')}`} unit={`mm · 降雨 ${RAIN} mm 时流走的`} />
            <ParamTile symbol="裸地" value={on ? `${runoff('bare')}` : '—'} unit="mm · 砍掉森林以后" />
          </div>}
          {on && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{SUBS[sub].say}</p>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'act'} onClick={act} disabled={on}>{SUBS[sub].button}</LabButton></>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={setSub} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
