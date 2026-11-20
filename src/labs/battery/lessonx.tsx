// 原电池 · 拓展课：三个小专题。水果电池、给船体镶锌块（牺牲阳极保护）、用完的电池去哪。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { LIQUID } from './parts'
import { METALS, negativeOf } from './physics'
import Rig, { X } from './rig'
import { TOP } from './world'

type Sub = 'fruit' | 'ship' | 'waste'
const SUBS: Record<Sub, { name: string; title: string; say: string; button: string }> = {
  fruit: { name: '水果电池', title: '柠檬汁也是电解质溶液', button: '插上电极', say: '柠檬汁里有酸，能导电。插上锌片和铜片、连上导线，四个条件都齐了，就是一个原电池。只是它的电流很小，点不亮普通的灯泡，要用电流表或发光二极管才看得出来。' },
  ship: { name: '给船体镶锌块', title: '让更活泼的锌替铁去被腐蚀', button: '镶上锌块', say: `钢铁泡在海水里会形成原电池而被腐蚀。在船体上镶几块锌：${METALS[negativeOf('Zn', 'Fe')!].name}比铁活泼，做负极，被慢慢消耗掉；铁做正极，就被保护下来了。锌块用完了再换新的。` },
  waste: { name: '用完的电池去哪', title: '分类回收，不能随手扔', button: '看一节废电池', say: '电池里有锌、锰等金属和电解质，有些电池还含有汞、镉、铅等重金属。随手扔掉，这些东西会渗进土壤和水里。把废电池分类回收，既能减少污染，又能把里面的金属重新利用。' },
}
const ORDER: Sub[] = ['fruit', 'ship', 'waste']
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：按“${SUBS[k].button}”`, note: SUBS[k].title }))

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('fruit')
  const [did, setDid] = useState<Sub[]>([])
  const T = useTasks('gewu:battery:x', TASKS)
  const on = did.includes(sub)
  const act = () => { if (on) return; const next = [...did, sub]; setDid(next); T.check(id => next.includes(id as Sub)) }
  const resetAll = () => { setSub('fruit'); setDid([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'sub' | 'act' | null } = !task ? { hint: '三个专题都看完了。', next: null }
    : sub !== task.id ? { hint: `接着看：${SUBS[task.id as Sub].name}`, next: 'sub' } : { hint: `按“${SUBS[sub].button}”`, next: 'act' }
  const ship = sub === 'ship'
  const labels: Label[] = [
    { id: 'a', at: [X - 0.3, TOP + 0.62, 0], ax: 1, className: `scene-tag -translate-y-1/2${on && sub !== 'waste' ? ' key' : ''}`, children: <><small>{on && sub !== 'waste' ? '负极' : ''}</small>{ship ? '锌块' : '锌片'}</> },
    { id: 'b', at: [X + 0.3, TOP + 0.62, 0], className: 'scene-tag -translate-y-1/2', children: <><small>{on && sub !== 'waste' ? '正极' : ''}</small>{ship ? '船体的钢板' : '铜片'}</> },
    { id: 'l', at: [X, TOP + 0.02, 0.36], ax: 0.5, name: true, className: 'scene-name', children: sub === 'fruit' ? '柠檬汁' : ship ? '海水' : '稀硫酸' },
  ]

  return (
    <LabShell title="原电池" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={<Rig left="Zn" right={ship ? 'Fe' : 'Cu'} liquid={sub === 'fruit' ? LIQUID.juice : LIQUID.acid} joined={on && sub !== 'waste'} flow={on && sub !== 'waste' ? (sub === 'fruit' ? 0.25 : 0.5) : 0} labels={labels} />}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{SUBS[sub].say}</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个专题都看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">原电池的道理，能用来发电，也能用来防腐蚀</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SUBS[sub].name}</div>
            <div className="mt-1 text-[22px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{SUBS[sub].title}</div>
          </div>
          {on && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{SUBS[sub].say}</p>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'act'} onClick={act} disabled={on}>{SUBS[sub].button}</LabButton></>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={setSub} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
