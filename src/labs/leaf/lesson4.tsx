// 光合作用和呼吸作用 · 第 4 课 走进一片叶子（叶片的结构；叶绿体是光合作用的场所；气孔是气体进出的门）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import Scene4 from './scene4'
import { LESSONS, goLesson } from './lessons'
import { PARTS, stomaOpen, type PartKey } from './physics'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'look', text: '依次看一看表皮、叶肉、叶脉', note: '表皮保护，叶肉制造有机物，叶脉运输' },
  { id: 'open', text: '让气孔张开', note: '保卫细胞吸水鼓起来，气孔张开：二氧化碳进来，氧气和水蒸气出去' },
  { id: 'close', text: '再让气孔关闭', note: '保卫细胞失水瘪下去，气孔关闭：气体进出不了' },
]
const ORDER: PartKey[] = ['skin', 'meso', 'vein']

export default function Lesson4() {
  const [part, setPart] = useState<PartKey | null>(null)
  const [seen, setSeen] = useState<PartKey[]>([])
  const [guard, setGuard] = useState<'swollen' | 'shrunk'>('shrunk')
  const [opened, setOpened] = useState(false)
  const T = useTasks('gewu:leaf:4', TASKS)
  const open = stomaOpen(guard)
  const look = (k: PartKey) => { setPart(k); const next = seen.includes(k) ? seen : [...seen, k]; setSeen(next); if (ORDER.every(o => next.includes(o))) T.check(id => id === 'look') }
  const toggle = () => {
    const g = open ? 'shrunk' : 'swollen'; setGuard(g); setPart('stoma')
    if (g === 'swollen') { setOpened(true); T.check(id => id === 'open') } else if (opened) T.check(id => id === 'open' || id === 'close')
  }
  const resetAll = () => { setPart(null); setSeen([]); setGuard('shrunk'); setOpened(false); T.reset() }

  const task = T.current, todo = ORDER.find(o => !seen.includes(o))
  const { hint, next }: { hint: string; next: 'part' | 'toggle' | null } = (() => {
    if (!task) return { hint: '都做完了。叶片上的每一部分，都在为光合作用出力。', next: null }
    if (task.id === 'look' && todo) return { hint: `选“${PARTS[todo].name}”，看它在哪、做什么`, next: 'part' }
    return { hint: task.id === 'close' ? '按“关闭气孔”，看气体还进不进得来' : '按“张开气孔”，看什么东西从这里进出', next: 'toggle' }
  })()

  return (
    <LabShell narration={voiced(NARRATION['4'], VOICE)} title="光合作用和呼吸作用" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="气孔"
      stage={<Scene4 part={part} open={open} />}
      lesson={<LessonBlock no="4" title="走进一片叶子" concept="叶绿体是加工厂，气孔是大门" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>把叶片横着切开放大，能看到三部分：<b className="text-white">表皮、叶肉、叶脉</b>。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            {(Object.keys(PARTS) as PartKey[]).map(k => <li key={k}><b className="text-[#7fe3d4]">{PARTS[k].name}：</b>{PARTS[k].what}</li>)}
          </ul>
          <p className="mt-3">光合作用在叶肉细胞的<b className="text-white">叶绿体</b>里进行：二氧化碳从气孔进来，水从叶脉的导管运来，制造出的有机物由筛管运走，氧气从气孔出去。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">一片叶子看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">叶绿体是加工厂，气孔是大门，叶脉是运输线</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">气孔一关，二氧化碳进不来，光合作用就慢下来了。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在看的是</div>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight text-[#7fe3d4]">{part ? PARTS[part].name : '整片叶子'}</div>
            <div className="mt-2 text-[13px] text-white/55">{part ? PARTS[part].does : '选一个部分，别的会变淡'}</div>
          </div>
          {part && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{PARTS[part].what}</p>}
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="保卫细胞" value={open ? '吸水鼓起' : '失水瘪下'} unit="控制气孔的开闭" />
            <ParamTile symbol="气孔" value={open ? '张开' : '关闭'} unit={open ? '气体可以进出' : '气体进出不了'} />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'toggle'} onClick={toggle}>{open ? '关闭气孔' : '张开气孔'}</LabButton>
      </>}
      extras={
        <Control label="看哪里">
          <Segmented label="看哪里" pulse={next === 'part'} want={next === 'part' ? todo! : null} value={(part ?? '') as PartKey} onChange={look} options={(Object.keys(PARTS) as PartKey[]).map(k => ({ value: k, label: PARTS[k].name }))} />
        </Control>
      }
    />
  )
}
