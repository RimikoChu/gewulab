// 神经调节 · 第 1 课 神经系统的组成：展馆正中坐着的人，身体里亮着他的神经系统。逐个点亮脑、脊髓、神经，
// 再按中枢和周围分成两种颜色；最后从脚尖传一个信号上去，看它怎样沿着神经、脊髓到达脑。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { CORD, inHead, legBack, legShin } from './body'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { GROUPS, NERVE_PAIRS, PARTS, PART_ORDER, groupOf, type PartKey } from './physics'
import { Flash, Impulse, route } from './signal'
import { onBody } from './world'

const TASKS: Task[] = [
  { id: 'brain', text: '选“脑”，看它在身体的哪里', note: '脑在颅腔里，由大脑、小脑、脑干组成' },
  { id: 'cord', text: '选“脊髓”，顺着背往下看', note: '脊髓在椎管里，上面连着脑' },
  { id: 'nerves', text: '选“神经”，看它们通到哪里', note: `脑神经 ${NERVE_PAIRS.cranial} 对，脊神经 ${NERVE_PAIRS.spinal} 对，通到全身各处` },
  { id: 'split', text: '把神经系统分成两部分', note: '脑和脊髓是中枢神经系统，神经是周围神经系统' },
  { id: 'signal', text: '从脚尖传一个信号到脑', note: '信号沿神经传到脊髓，再沿脊髓传到脑' },
]
/** 从左脚尖到脑：小腿的神经 → 大腿后面的神经 → 脊髓 → 脑 */
const SIGNAL = route(...[[...legShin(1)].reverse(), [...legBack(1)].reverse(), [...CORD].reverse(), [inHead([0, -6, -2]), inHead([0, -1, -1]), inHead([1.5, 3.2, -1])]].map(l => l.map(onBody)))

export default function Lesson1() {
  const [sel, setSel] = useState<PartKey | null>(null)
  const [split, setSplit] = useState(false)
  const T = useTasks('gewu:nerve:1', TASKS)
  const run = useRun(5.5, () => T.check(id => id === 'signal'))
  const choose = (k: PartKey) => { setSel(k); setSplit(false); T.check(id => id === k) }
  const doSplit = () => { if (!PART_ORDER.every(k => T.done[k])) return; setSplit(s => !s); setSel(null); T.check(id => id === 'split') }
  const doSignal = () => { if (run.busy || !T.done.split) return; setSplit(false); setSel(null); run.run() }
  const resetAll = () => { setSel(null); setSplit(false); run.snap(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'part' | 'split' | 'signal' | null } = !task ? { hint: '脑和脊髓是中枢神经系统，脑神经和脊神经组成周围神经系统。', next: null }
    : run.busy ? { hint: '信号从脚尖出发，沿着神经往上走…', next: null }
    : PART_ORDER.includes(task.id as PartKey) ? { hint: `选“${PARTS[task.id as PartKey].name}”，看它在身体的哪里`, next: 'part' }
    : task.id === 'split' ? { hint: '三部分都认过了。按“分成两部分”，看哪些是中枢、哪些是周围', next: 'split' }
    : { hint: '按“传一个信号”，从左脚尖传一个信号到脑', next: 'signal' }
  const k = run.k
  const hi = { brain: sel === 'brain' ? 1 : 0, cord: sel === 'cord' ? 1 : 0, nerves: sel === 'nerves' ? 1 : 0 }
  const labels: Label[] = split ? [
    { id: 'c', at: onBody([1.2, 15.6, 0.6]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>脑和脊髓</small>{GROUPS.central}</> },
    { id: 'p', at: onBody([3.3, 10.4, 0.3]), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>神经</small>{GROUPS.peripheral}</> },
  ] : sel ? [
    sel === 'brain' ? { id: 'b', at: onBody([0.9, 16.9, 0.3]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>颅腔里</small>脑</> }
      : sel === 'cord' ? { id: 'c', at: onBody([0.4, 12.6, -0.7]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>椎管里</small>脊髓</> }
      : { id: 'n', at: onBody([3.2, 11.2, 0.2]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>通到全身</small>神经</> },
  ] : []
  const p = sel ? PARTS[sel] : null
  return (
    <LabShell title="神经调节" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="神经系统"
      stage={<Place at={split ? 'split' : 'body'} labels={labels} want={{ body: { hi, split, chatter: !run.busy, nerves: run.busy ? 0.4 : 1, shell: run.busy ? 0.7 : 1 } }}>
        <Impulse path={SIGNAL} s={k} size={0.2} />
        <Flash at={onBody([0.99, 4.55, 4.95])} on={run.busy && k < 0.15} r={0.4} />
        <Flash at={onBody(inHead([1.5, 3.2, -1]))} on={run.busy && k > 0.93} r={0.6} />
      </Place>}
      lesson={<LessonBlock no="1" title="神经系统的组成" concept="神经系统由脑、脊髓和神经组成" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>神经系统由<b className="text-white">脑、脊髓和它们发出的神经</b>组成。</p>
          <p className="mt-3">脑和脊髓是神经系统的中枢部分，叫<b className="text-white">中枢神经系统</b>；脑发出的脑神经（{NERVE_PAIRS.cranial} 对）和脊髓发出的脊神经（{NERVE_PAIRS.spinal} 对）是神经系统的周围部分，叫<b className="text-white">周围神经系统</b>。</p>
          <p className="mt-3">脑位于颅腔内，包括大脑、小脑和脑干；脊髓位于椎管内，上端与脑相连。</p>
          <p className="mt-3 text-[13.5px] text-white/65">展馆里的人是半透明的示意模型，神经只画出主要的几条，粗细也加粗了。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">信号到了脑</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">神经系统由脑、脊髓和神经组成：脑和脊髓是中枢，神经是周围</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">脑神经 {NERVE_PAIRS.cranial} 对、脊神经 {NERVE_PAIRS.spinal} 对，把全身各处和中枢连在一起。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          {p ? <>
            <div className="text-center"><div className="text-[13px] text-white/60">{p.where}</div><div className="mt-1 text-[36px] leading-none font-bold">{p.name}</div></div>
            <p className="mt-3 text-[14.5px] leading-relaxed text-white/80">{p.job}。</p>
            {sel === 'nerves' && <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-white/8 px-3 py-2"><div className="text-[12px] text-white/55">脑神经</div><div className="text-[24px] font-bold tabular-nums">{NERVE_PAIRS.cranial}<span className="ml-1 text-[13px] text-white/55">对</span></div></div>
              <div className="rounded-xl bg-white/8 px-3 py-2"><div className="text-[12px] text-white/55">脊神经</div><div className="text-[24px] font-bold tabular-nums">{NERVE_PAIRS.spinal}<span className="ml-1 text-[13px] text-white/55">对</span></div></div>
            </div>}
          </> : <p className="text-center text-[14px] text-white/60">{run.busy || T.done.signal ? '信号从左脚尖出发' : '选一部分看看'}</p>}
          <h2 className="mt-5 text-[12.5px] text-white/55">神经系统</h2>
          <div className="mt-2 flex flex-col gap-1.5">
            {(['central', 'peripheral'] as const).map(g => <div key={g} className={`rounded-xl px-3 py-2 ${split ? (g === 'central' ? 'bg-[#8ff3ff]/18' : 'bg-[#ffc35a]/18') : 'bg-white/6'}`}>
              <div className="text-[13.5px] font-semibold">{GROUPS[g]}</div>
              <div className="mt-0.5 text-[13px] text-white/70">{PART_ORDER.filter(k => PARTS[k].group === g).map(k => k === 'nerves' ? `脑神经、脊神经` : PARTS[k].name).join('、')}</div>
            </div>)}
          </div>
          {sel && <p className="mt-2 text-[12.5px] text-white/55">{p!.name}属于{groupOf(sel)}</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'split'} pulse={next === 'split'} onClick={doSplit} disabled={!PART_ORDER.every(k => T.done[k]) || run.busy}>{split ? '合起来' : '分成两部分'}</LabButton>
        <LabButton primary={next === 'signal'} pulse={next === 'signal'} onClick={doSignal} disabled={!T.done.split || run.busy}>传一个信号</LabButton>
      </>}
      extras={
        <Control label="看哪一部分">
          <Segmented label="看哪一部分" pulse={next === 'part'} want={next === 'part' ? task!.id as PartKey : null} value={sel ?? ('' as PartKey)} onChange={k => choose(k as PartKey)} disabled={run.busy} options={PART_ORDER.map(k => ({ value: k, label: PARTS[k].name }))} />
        </Control>
      }
    />
  )
}
