// 神经调节 · 第 2 课 神经元：展馆左上方悬着一个放大的神经元。逐个认细胞体、树突、轴突（连同神经末梢），
// 然后刺激一枝树突，看神经冲动从树突走到细胞体、沿轴突一直走到神经末梢；最后看一段剖开的神经：许多神经纤维集结成束。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { AXON, DENDRITES, IMPULSE_LEGS, TERMINALS } from './neuron'
import { Place, useRun } from './parts'
import { IMPULSE_PATH, NEURON, type NeuronKey } from './physics'
import { Flash, Impulse, route } from './signal'
import type { V3 } from './sdf'
import { Chain } from './ui'
import { BUNDLE_AT, NEURON_AT } from './world'

const PICK = ['body', 'dendrite', 'axon'] as const
type Pick = typeof PICK[number]
const TASKS: Task[] = [
  { id: 'body', text: '选“细胞体”：神经元中间鼓起来的部分', note: '细胞体里有细胞核' },
  { id: 'dendrite', text: '选“树突”：细胞体上分出的短枝', note: '树突短而多，分枝多' },
  { id: 'axon', text: '选“轴突”：那一根长长的突起', note: '轴突一条、很长，末端分成神经末梢' },
  { id: 'fire', text: '刺激一枝树突，看冲动走到哪里', note: '神经冲动：树突 → 细胞体 → 轴突 → 神经末梢' },
  { id: 'bundle', text: '看一段神经的切面', note: '许多神经纤维集结成束，外面包着膜，就是一条神经' },
]
const W = (p: V3): V3 => [NEURON_AT[0] + p[0], NEURON_AT[1] + p[1], NEURON_AT[2] + p[2]]
const PATH = route(...IMPULSE_LEGS().map(l => l.map(W)))
/** 冲动走到各部分的时刻（占全程的比例） */
const AT = { body: 0.27, axon: 0.33, terminal: 0.9 }
const stageOf = (k: number): NeuronKey => (k < AT.body ? 'dendrite' : k < AT.axon ? 'body' : k < AT.terminal ? 'axon' : 'terminal')

export default function Lesson2() {
  const [sel, setSel] = useState<Pick | null>(null)
  const [view, setView] = useState<'neuron' | 'bundle'>('neuron')
  const T = useTasks('gewu:nerve:2', TASKS)
  const run = useRun(6, () => T.check(id => id === 'fire'))
  const choose = (k: Pick) => { setSel(k); setView('neuron'); T.check(id => id === k) }
  const fire = () => { if (run.busy || !PICK.every(k => T.done[k])) return; setSel(null); setView('neuron'); run.run() }
  const toBundle = () => { if (run.busy || !T.done.fire) return; setView(v => (v === 'bundle' ? 'neuron' : 'bundle')); T.check(id => id === 'bundle') }
  const resetAll = () => { setSel(null); setView('neuron'); run.snap(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'pick' | 'fire' | 'bundle' | null } = !task ? { hint: '神经元由细胞体和突起组成；神经冲动从树突传向细胞体，再沿轴突传出去。', next: null }
    : run.busy ? { hint: `冲动走到了${NEURON[stageOf(run.k)].name}…`, next: null }
    : PICK.includes(task.id as Pick) ? { hint: `选“${NEURON[task.id as Pick].name}”`, next: 'pick' }
    : task.id === 'fire' ? { hint: '三部分都认过了。按“刺激树突”，在左边一枝树突的末梢给一个刺激', next: 'fire' }
    : { hint: '按“看一段神经”，看许多神经纤维怎样集结成神经', next: 'bundle' }
  const k = run.k, st = run.busy || k >= 1 ? stageOf(k) : null
  const hi: Partial<Record<NeuronKey, number>> = sel === 'axon' ? { axon: 1, terminal: 1 } : sel ? { [sel]: 1 } : st ? { [st]: 1 } : {}
  const d0 = DENDRITES[0].pts, mid = AXON[2], tEnd = TERMINALS[1][2]
  const labels: Label[] = view === 'bundle' ? [
    { id: 'f', at: [BUNDLE_AT[0] + 0.1, BUNDLE_AT[1] + 0.95, BUNDLE_AT[2] + 0.2], ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>切面上一个个小圆</small>神经纤维</> },
    { id: 'm', at: [BUNDLE_AT[0] - 1.5, BUNDLE_AT[1] - 1.0, BUNDLE_AT[2]], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>外面</small>包着的膜</> },
  ] : [
    { id: 'b', at: W([-0.3, 1.15, 0.4]), ax: 0.5, className: `scene-tag ${sel === 'body' || st === 'body' ? 'key' : ''} -translate-y-full`, children: '细胞体' },
    { id: 'd', at: W([d0[2][0] - 0.2, d0[2][1] - 0.45, d0[2][2]]), ax: 1, className: `scene-tag ${sel === 'dendrite' || st === 'dendrite' ? 'key' : ''} -translate-y-1/2`, children: '树突' },
    { id: 'a', at: W([mid[0], mid[1] - 0.55, mid[2]]), ax: 0.5, className: `scene-tag ${sel === 'axon' || st === 'axon' ? 'key' : ''}`, children: <><small>外面一节节是髓鞘</small>轴突</> },
    { id: 't', at: W([tEnd[0] + 0.35, tEnd[1], tEnd[2]]), ax: 0, className: `scene-tag ${sel === 'axon' || st === 'terminal' ? 'key' : ''} -translate-y-1/2`, children: '神经末梢' },
  ]
  const n = sel ? NEURON[sel] : st ? NEURON[st] : null
  return (
    <LabShell title="神经调节" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="神经元"
      stage={<Place at={view === 'bundle' ? 'bundle' : 'neuron'} labels={labels} want={{ neuron: { hi, dim: sel || st ? 0.6 : 0 } }}>
        <Impulse path={PATH} s={k} size={0.13} />
        <Flash at={PATH.at(0).toArray() as V3} on={run.busy && k < 0.08} r={0.45} />
        <Flash at={W(tEnd)} on={run.busy && k > 0.92} r={0.5} />
      </Place>}
      lesson={<LessonBlock no="2" title="神经元" concept="神经元是神经系统结构和功能的基本单位" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>神经元也叫神经细胞，由<b className="text-white">细胞体</b>和<b className="text-white">突起</b>两部分组成。突起有两种：短而多的<b className="text-white">树突</b>，一条长的<b className="text-white">轴突</b>。轴突末端的细小分枝叫<b className="text-white">神经末梢</b>。</p>
          <p className="mt-3">神经元受到刺激后能产生神经冲动，并能把冲动传导到其他神经元。冲动在一个神经元里的方向是：树突 → 细胞体 → 轴突 → 神经末梢。</p>
          <p className="mt-3">轴突和套在外面的髓鞘叫神经纤维。神经纤维集结成束，外面包着膜，就构成一条神经。</p>
          <p className="mt-3 text-[13.5px] text-white/65">神经元放大了很多很多倍；真实的轴突可以很长，这里画短了。冲动的速度放慢了。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">冲动走完了一个神经元</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">神经元由细胞体和突起组成，冲动从树突传到细胞体，再沿轴突传到神经末梢</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">许多神经纤维集结成束，外面包着膜，构成一条神经。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          {n ? <div className="text-center"><div className="text-[13px] text-white/60">{n.short}</div><div className="mt-1 text-[34px] leading-none font-bold">{n.name}</div><p className="mt-2 text-[14px] text-white/75">{n.job}</p></div>
            : <p className="text-center text-[14px] text-white/60">{view === 'bundle' ? '一段神经，横着切开' : '选一部分看看'}</p>}
          <h2 className="mt-5 text-[12.5px] text-white/55">神经冲动的方向</h2>
          <div className="mt-2"><Chain items={IMPULSE_PATH.map(p => ({ name: NEURON[p].name, state: st === p && run.busy ? 'now' : st && IMPULSE_PATH.indexOf(p) <= IMPULSE_PATH.indexOf(st) ? 'on' : 'off' }))} /></div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'fire'} pulse={next === 'fire'} onClick={fire} disabled={run.busy || !PICK.every(k => T.done[k])}>刺激树突</LabButton>
        <LabButton primary={next === 'bundle'} pulse={next === 'bundle'} onClick={toBundle} disabled={run.busy || !T.done.fire}>{view === 'bundle' ? '回到神经元' : '看一段神经'}</LabButton>
      </>}
      extras={
        <Control label="看哪一部分">
          <Segmented label="看哪一部分" pulse={next === 'pick'} want={next === 'pick' ? task!.id as Pick : null} value={sel ?? ('' as Pick)} onChange={v => choose(v as Pick)} disabled={run.busy} options={PICK.map(k => ({ value: k, label: NEURON[k].name }))} />
        </Control>
      }
    />
  )
}
