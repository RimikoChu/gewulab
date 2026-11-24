// 呼吸 · 第 1 课 呼吸道：头颈部的正中剖面模型。吸一口气，看空气依次走过鼻、咽、喉、气管、支气管，灰尘在哪里被拦下；
// 推近气管内壁，看纤毛把黏液往咽喉送；最后认一认咽是空气和食物共同的通道。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { AIRWAY, DUST, dustTally } from './physics'
import { AIR_MARK, HEAD_S, airwayAt } from './head'
import { CILIA_AT, HEAD_AT, at } from './world'
import type { V3 } from './sdf'

const TASKS: Task[] = [
  { id: 'path', text: '吸一口气，看空气依次经过哪几段', note: '鼻 → 咽 → 喉 → 气管 → 支气管' },
  { id: 'dust', text: '看灰尘在哪里被拦下', note: '大颗挂在鼻毛上，小颗粘在黏液上；很细的少数能进到肺里' },
  { id: 'cilia', text: '推近气管内壁，看纤毛把黏液往哪里送', note: '纤毛向咽喉方向摆动，把黏液和粘住的灰尘送到咽喉，咳出来就是痰' },
  { id: 'pharynx', text: '认一认：哪一段是空气和食物共同的通道', note: '咽既是空气的通道，也是食物的通道' },
]
/** 模型上的一点（cm）在展厅里的位置 */
const H = (p: V3): V3 => at(HEAD_AT, [p[0] * HEAD_S, p[1] * HEAD_S, p[2] * HEAD_S])
const SEG_AT: Record<string, V3> = { nose: [7.5, 20.6, 0.2], pharynx: [-1.6, 14.6, 0.2], larynx: [3.6, 9.6, 0.2], trachea: [3.9, 3.2, 0.2], bronchi: [4.2, -7.0, 4.0] }

export default function Lesson1() {
  const [view, setView] = useState<'head' | 'cilia'>('head')
  const [food, setFood] = useState(false)
  const [counting, setCounting] = useState(false)
  const T = useTasks('gewu:breath:1', TASKS)
  const flow = useRun(7, () => { T.check(id => id === 'path'); setCounting(true) })
  useEffect(() => { if (!counting) return; const t = setTimeout(() => { setCounting(false); T.check(id => id === 'dust') }, 3200); return () => clearTimeout(t) }, [counting])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (view !== 'cilia') return; const t = setTimeout(() => T.check(id => id === 'cilia'), 4500); return () => clearTimeout(t) }, [view])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!food) return; const t = setTimeout(() => T.check(id => id === 'pharynx'), 3000); return () => clearTimeout(t) }, [food])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { flow.snap(0); setView('head'); setFood(false); setCounting(false); T.reset() }
  const task = T.current
  const f = flow.k, here = f > 0 ? airwayAt(Math.min(1, f)) : null
  const tally = dustTally(DUST)
  const { hint, next }: { hint: string; next: 'air' | 'zoom' | 'food' | null } = !task ? { hint: '呼吸道是气体的通道，还能使空气变得清洁、温暖、湿润；但它的处理能力是有限的。', next: null }
    : flow.busy ? { hint: `空气走到了${AIRWAY.find(a => a.key === here)?.name ?? '鼻'}…`, next: null }
    : task.id === 'path' ? { hint: '这是头颈部的正中剖面。按“吸一口气”', next: 'air' }
    : task.id === 'dust' ? { hint: '看：灰尘停在了哪里', next: null }
    : task.id === 'cilia' ? (view === 'cilia' ? { hint: '看：纤毛一起朝一个方向摆…', next: null } : { hint: '气管的内表面有纤毛和黏液。按“推近气管内壁”', next: 'zoom' })
    : food ? { hint: '看：黄色是食物走的路…', next: null } : { hint: '口腔后面那一段是谁？按“看咽”', next: 'food' }
  const passed = (k: string) => f >= (AIR_MARK as Record<string, number>)[k] - 1e-6
  const labels: Label[] = view === 'head' ? [
    ...AIRWAY.map(a => ({ id: a.key, at: H(SEG_AT[a.key]), ax: 0.5, className: cn('scene-tag -translate-y-1/2 transition-opacity', here === a.key && flow.busy ? 'key' : ''), style: { opacity: passed(a.key) || T.done.path ? 1 : 0.55 }, children: a.name })),
    { id: 'hair', at: H([13.6, 15.6, 0.3]), ax: 0, className: 'scene-name -translate-y-1/2', name: true, children: '鼻毛' },
    { id: 'tur', at: H([10.6, 21.4, 0.3]), ax: 0, className: 'scene-name -translate-y-1/2', name: true, children: '鼻腔（黏膜）' },
    { id: 'epi', at: H([0.2, 12.4, 0.3]), ax: 1, className: 'scene-name -translate-y-1/2', name: true, children: '会厌' },
    { id: 'mouth', at: H([8.4, 13.6, 0.3]), ax: 0, className: 'scene-name -translate-y-1/2', name: true, children: '口腔' },
    { id: 'eso', at: H([-0.6, 3.6, 0.3]), ax: 1, className: 'scene-name -translate-y-1/2', name: true, children: '食管' },
    ...(food ? [{ id: 'food', at: H([-3.0, 11.0, 0.3]), ax: 1, className: 'scene-tag key -translate-y-1/2', children: '咽：空气和食物都从这里过' }] : []),
  ] : [
    { id: 'c1', at: at(CILIA_AT, [-1.0, 0.55, 0.6]), ax: 1, className: 'scene-tag -translate-y-1/2', children: '黏液' },
    { id: 'c2', at: at(CILIA_AT, [1.25, 0.25, 0.75]), ax: 0, className: 'scene-tag -translate-y-1/2', children: '纤毛' },
    { id: 'c3', at: at(CILIA_AT, [1.3, 0.9, 0.3]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: '往咽喉 →' },
    { id: 'c4', at: at(CILIA_AT, [0, -1.1, 0.6]), ax: 0.5, className: 'scene-name', name: true, children: '气管内壁 · 放大的示意' },
  ]
  return (
    <LabShell title="呼吸" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="呼吸道"
      stage={<Place at={view} labels={labels} want={{ head: { flow: f, pharynx: food, cilia: view === 'cilia' } }} />}
      lesson={<LessonBlock no="1" title="呼吸道" concept="呼吸道让空气变得清洁、温暖、湿润" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>呼吸系统由<b className="text-white">呼吸道</b>和<b className="text-white">肺</b>组成。呼吸道包括鼻、咽、喉、气管、支气管，是气体进出肺的通道。</p>
          <p className="mt-3">鼻腔前部的<b className="text-white">鼻毛</b>能阻挡灰尘；鼻黏膜分泌的黏液能粘住灰尘和细菌，还使空气变得湿润；黏膜中丰富的毛细血管能温暖空气。气管和支气管的内表面有<b className="text-white">纤毛</b>和黏液，纤毛向咽喉方向摆动，把粘着灰尘、细菌的黏液送到咽喉，咳出来就是痰。</p>
          <p className="mt-3"><b className="text-white">咽</b>是空气和食物的共同通道。吞咽时会厌盖住喉口，食物进入食管。呼吸道对空气的处理能力是有限的，空气污染严重时要做好防护。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">一口气走完了呼吸道</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">鼻 → 咽 → 喉 → 气管 → 支气管：清洁、温暖、湿润空气</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">鼻毛和黏液拦下了大部分灰尘，纤毛把黏液送到咽喉。很细的颗粒仍有少数进到肺里，所以呼吸道的处理能力是有限的。</p>
          <p className="mt-2 text-[12.5px] text-white/50">灰尘的颗数、大小是示意。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">空气走过的路</h2>
          <div className="mt-2 flex flex-col gap-1.5">
            {AIRWAY.map(a => <div key={a.key} className={cn('rounded-xl px-3 py-2 text-[13.5px] transition-colors', here === a.key && flow.busy ? 'bg-[#35c7b3]/25' : passed(a.key) || T.done.path ? 'bg-white/10' : 'bg-white/[0.04] text-white/45')}>
              <span className="font-semibold text-white">{a.name}</span>
              {(passed(a.key) || T.done.path) && <div className="hint-in mt-0.5 text-[12.5px] leading-snug text-white/65">{a.job}</div>}
            </div>)}
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">一口气里的 {DUST.length} 颗灰尘（示意）</h2>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {([['鼻毛拦下', tally.hair], ['黏液粘住', tally.mucus], ['进到肺里', tally.lung]] as [string, number][]).map(([n, v]) => <div key={n} className="rounded-xl bg-white/8 px-1 py-2"><div className="text-[24px] leading-none font-bold tabular-nums">{T.done.path || counting ? v : '—'}</div><div className="mt-1 text-[12px] text-white/60">{n}</div></div>)}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'air'} pulse={next === 'air'} onClick={() => { setView('head'); flow.run(1, 0) }} disabled={flow.busy}>吸一口气</LabButton>
        <LabButton primary={next === 'zoom'} pulse={next === 'zoom'} onClick={() => setView(v => (v === 'cilia' ? 'head' : 'cilia'))} disabled={flow.busy || !T.done.dust}>{view === 'cilia' ? '回到剖面' : '推近气管内壁'}</LabButton>
        <LabButton primary={next === 'food'} pulse={next === 'food'} onClick={() => { setView('head'); setFood(true) }} disabled={flow.busy || !T.done.cilia || food}>看咽</LabButton>
      </>}
      extras={null}
    />
  )
}
