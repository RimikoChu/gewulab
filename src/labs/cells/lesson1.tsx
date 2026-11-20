// 细胞 · 第 1 课 认识显微镜（显微镜的结构和各部分的作用）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Microscope } from './models'
import { SCOPE, type ScopeKey } from './physics'
import { SPAN, SPOT, ST, TOP } from './world'

const KEYS = Object.keys(SCOPE) as ScopeKey[]
const TASKS: Task[] = [
  { id: 'lens', text: '找到目镜和物镜', note: '放大靠这两组镜头：目镜靠近眼睛，物镜靠近玻片' },
  { id: 'focus', text: '找到粗、细两个准焦螺旋', note: '粗的升降幅度大，用来找物像；细的幅度小，用来调清楚' },
  { id: 'rest', text: '再看载物台、反光镜和遮光器', note: '玻片放在载物台上；反光镜和遮光器管光线的强弱' },
]
const AT: Record<ScopeKey, [number, number, number]> = { lens: [0.12, 1.12, 0.08], focus: [0.22, 0.55, -0.22], stage: [0.3, 0.42, 0.2], light: [0.2, 0.2, 0.15] }

export default function Lesson1() {
  const [part, setPart] = useState<ScopeKey | null>(null)
  const [seen, setSeen] = useState<ScopeKey[]>([])
  const T = useTasks('gewu:cells:1', TASKS)
  const look = (k: ScopeKey) => { setPart(k); const next = seen.includes(k) ? seen : [...seen, k]; setSeen(next); T.check(id => id === 'rest' ? next.includes('stage') && next.includes('light') : next.includes(id as ScopeKey)) }
  const resetAll = () => { setPart(null); setSeen([]); T.reset() }
  const todo = KEYS.find(k => !seen.includes(k))
  const hint = !T.current ? '都认识了。下一课用它看东西。' : `选“${SCOPE[todo ?? 'light'].name}”，看它在哪、做什么`
  const labels: Label[] = KEYS.filter(k => seen.includes(k)).map(k => ({ id: k, at: [ST.scope + AT[k][0], TOP + AT[k][1], AT[k][2]], className: `scene-tag -translate-y-1/2${part === k ? ' key' : ''}`, children: SCOPE[k].name }))

  return (
    <LabShell title="细胞" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="显微镜"
      stage={<LabStage labels={labels} target={SPOT.scope} span={SPAN.scope}><Microscope position={[ST.scope, TOP, 0]} glow={part} /></LabStage>}
      lesson={<LessonBlock no="1" title="认识显微镜" concept="细胞太小，要靠显微镜才看得见" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<ul className="flex flex-col gap-2 text-[14px] text-white/80">{KEYS.map(k => <li key={k}><b className="text-[#7fe3d4]">{SCOPE[k].name}：</b>{SCOPE[k].what}</li>)}</ul>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四个部分都找到了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">镜头管放大，螺旋管升降，反光镜和遮光器管光线</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在看的是</div>
            <div className="mt-1 text-[30px] leading-none font-bold tracking-tight text-[#7fe3d4]">{part ? SCOPE[part].name : '整台显微镜'}</div>
            <div className="mt-2 text-[13px] text-white/55">{part ? SCOPE[part].does : '选一个部分，它会亮起来'}</div>
          </div>
          {part && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{SCOPE[part].what}</p>}
        </Glass>
      }
      actions={<></>}
      extras={<Control label="看哪里"><Segmented label="看哪里" pulse={!!T.current} want={T.current ? todo ?? null : null} value={(part ?? '') as ScopeKey} onChange={look} options={KEYS.map(k => ({ value: k, label: SCOPE[k].name }))} /></Control>}
    />
  )
}
