// 水循环 · 第 3 课 三种循环（海陆间循环、陆地内循环、海上内循环）
import { useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import Basin from './basin'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { LINKS, LOOPS, type LoopKey } from './physics'
import { pathMid } from './world'

const KEYS = Object.keys(LOOPS) as LoopKey[]
const TASKS: Task[] = KEYS.map(k => ({ id: k, text: `让水走一圈${LOOPS[k].name}`, note: LOOPS[k].say }))

export default function Lesson3() {
  const [loop, setLoop] = useState<LoopKey>('seaLand')
  const [on, setOn] = useState(false)
  const [seen, setSeen] = useState<LoopKey[]>([])
  const T = useTasks('gewu:watercycle:3', TASKS)
  const timer = useRef(0)
  const run = () => { if (on) return; setOn(true); clearTimeout(timer.current); timer.current = window.setTimeout(() => { const next = seen.includes(loop) ? seen : [...seen, loop]; setSeen(next); T.check(id => next.includes(id as LoopKey)) }, 2600) }
  const pick = (k: LoopKey) => { clearTimeout(timer.current); setLoop(k); setOn(false) }
  const resetAll = () => { clearTimeout(timer.current); setLoop('seaLand'); setOn(false); setSeen([]); T.reset() }
  const task = T.current, links = on ? LOOPS[loop].links : []
  const { hint, next }: { hint: string; next: 'loop' | 'run' | null } = !task ? { hint: '三种循环都看过了。能给陆地补水的只有海陆间循环。', next: null }
    : loop !== task.id ? { hint: `换成“${LOOPS[task.id as LoopKey].name}”`, next: 'loop' }
    : on ? { hint: '看水走过了哪些环节…', next: null } : { hint: '按“让水走一圈”', next: 'run' }
  const labels: Label[] = links.map(k => ({ id: k, at: pathMid(k), ax: 0.5, className: 'scene-tag -translate-y-full', children: LINKS[k].name }))

  return (
    <LabShell title="水循环" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="水"
      stage={<Basin labels={labels} want={{ links, rain: on ? (loop === 'sea' ? ['sea'] : ['land']) : [] }} />}
      lesson={<LessonBlock no="3" title="三种循环" concept="按水走的范围，水循环分成三种" tasks={TASKS} done={T.done} current={task?.id}
        theory={<ul className="flex flex-col gap-2 text-[14px] text-white/80">{KEYS.map(k => <li key={k}><b className="text-[#7fe3d4]">{LOOPS[k].name}：</b>{LOOPS[k].say}</li>)}</ul>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种循环都走过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">只有海陆间循环能让陆地上的水不断更新</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">海上内循环水量最大，但水到不了陆地；陆地内循环水量很少。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在看的是</div>
            <div className="mt-1 text-[30px] leading-none font-bold tracking-tight text-[#7fe3d4]">{LOOPS[loop].name}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="环节" value={`${LOOPS[loop].links.length} 个`} unit={LOOPS[loop].links.map(k => LINKS[k].name).join('、')} />
            <ParamTile symbol="陆地水" value={LOOPS[loop].renews ? '能更新' : '不能更新'} unit="能不能给陆地补水" />
          </div>
          {seen.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">循环</th><th className="font-normal">给陆地补水</th></tr></thead>
            <tbody>{seen.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{LOOPS[k].name}</td><td className="font-semibold text-[#7fe3d4]">{LOOPS[k].renews ? '能' : '不能'}</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'run'} onClick={run} disabled={on}>让水走一圈</LabButton></>}
      extras={<Control label="哪种循环"><Segmented label="哪种循环" pulse={next === 'loop'} want={next === 'loop' ? task!.id as LoopKey : null} value={loop} onChange={pick} options={KEYS.map(k => ({ value: k, label: LOOPS[k].name }))} /></Control>}
    />
  )
}
