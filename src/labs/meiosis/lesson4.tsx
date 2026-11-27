// 减数分裂和遗传规律 · 第 4 课 受精作用：一个 AaBb 的个体能产生 4 种精子（非同源染色体自由组合）；一个精子的头部进入卵细胞，
// 卵细胞膜外出现一层阻止其他精子进入的膜；精子的细胞核和卵细胞的细胞核融合，受精卵的染色体数目恢复，一半来自父方、一半来自母方。
import { useEffect, useState } from 'react'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { ENTER, Fertilization, SWIM } from './gamete'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { CHROMOSOMES, diGametes, gameteKinds, zygote } from './physics'
import { Finale, H, Legend } from './ui'
import { VOICE } from './voice'
import { MODEL, Room } from './world'

const AT: [number, number, number] = [MODEL.b[0], MODEL.y, MODEL.b[2]]
type Sp = 'model' | 'fly' | 'human'
const SPECIES: Record<Sp, { name: string; twoN: number }> = { model: { name: '示意细胞', twoN: CHROMOSOMES.model }, fly: { name: '果蝇', twoN: CHROMOSOMES.fly }, human: { name: '人', twoN: CHROMOSOMES.human } }
const KINDS = diGametes('AaBb')
const n = (s: Sp) => SPECIES[s].twoN / 2
const TASKS: Task[] = [
  { id: 'kinds', text: '看一看 AaBb 的个体能产生几种精子', note: `两对同源染色体自由组合：2² = ${gameteKinds(2)} 种（${KINDS.join('、')}）` },
  { id: 'enter', text: '让一个精子和卵细胞结合', note: '精子的头部进入卵细胞，尾部留在外面；卵细胞膜外出现一层膜，别的精子进不来' },
  { id: 'fuse', text: '让精子的细胞核和卵细胞的细胞核融合', note: `受精卵 ${zygote(n('model'), n('model'))} 条染色体：一半来自父方，一半来自母方` },
  { id: 'human', text: '换成人，看受精卵的染色体数和配子的种类', note: `人：${n('human')} + ${n('human')} = ${zygote(n('human'), n('human'))} 条；配子 2²³ = ${gameteKinds(23).toLocaleString('zh-CN')} 种` },
]

export default function Lesson4() {
  const [kinds, setKinds] = useState(false)
  const [step, setStep] = useState(0)
  const [sp, setSp] = useState<Sp>('model')
  const T = useTasks('gewu:meiosis:4', TASKS)
  const run = useRun(step, 3.2), e = step === 0 ? 1 : Math.min(1, Math.max(0, run - (step - 1)))
  const moving = step > 0 && e < 1
  useEffect(() => {
    if (moving) return
    T.check(id => (id === 'kinds' && kinds) || (id === 'enter' && step >= 1) || (id === 'fuse' && step >= 2) || (id === 'human' && sp === 'human' && step >= 2))
  }, [kinds, step, moving, sp])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setKinds(false); setStep(0); setSp('model'); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'kinds' | 'enter' | 'fuse' | 'sp' | null } = (() => {
    if (!task) return { hint: '减数分裂和受精作用，保持了每种生物前后代体细胞中染色体数目的恒定。', next: null }
    if (moving) return { hint: step === 1 ? '精子的头部进入卵细胞…' : '两个细胞核靠近、融合…', next: null }
    if (!kinds) return { hint: '四个精子游向卵细胞。按“看精子种类”，看它们的基因组成', next: 'kinds' }
    if (step === 0) return { hint: '精子有 4 种，卵细胞只和其中一个结合。按“受精”', next: 'enter' }
    if (step === 1) return { hint: '精子的细胞核进来了。按“核融合”', next: 'fuse' }
    return { hint: '在“物种”里选“人”', next: 'sp' }
  })()
  const labels: Label[] = []
  if (kinds) SWIM.forEach((s, i) => { if (i === ENTER && step >= 1) return; labels.push({ id: `k${i}`, at: [AT[0] + s.at[0] + 6, AT[1] + s.at[1] + 2.5, AT[2] + s.at[2]], ax: 0, className: 'scene-tag -translate-y-full', children: <><small>精子</small>{s.g}</> }) })
  labels.push({ id: 'egg', at: [AT[0], AT[1] - 31, AT[2] + 6], ax: 0.5, className: step >= 2 && !moving ? 'scene-tag key' : 'scene-tag', children: step >= 2 && !moving ? <><small>受精卵</small>{zygote(n('model'), n('model'))} 条染色体</> : <><small>卵细胞</small>{n('model')} 条染色体</> })
  const s = SPECIES[sp]
  return (
    <LabShell title="减数分裂和遗传规律" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="受精"
      stage={<Room at="modelB2" labels={labels}><Fertilization at={AT} step={step} e={e} /></Room>}
      lesson={<LessonBlock no="4" title="受精作用" concept="受精卵的染色体一半来自父方，一半来自母方" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>卵细胞和精子相互识别、融合成为受精卵的过程，叫作<b className="text-white">受精作用</b>。精子的头部进入卵细胞，尾部留在外面；紧接着，卵细胞的细胞膜会发生复杂的生理反应，阻止其他精子再进入。精子的细胞核与卵细胞的细胞核相融合，使彼此的染色体会合在一起。</p>
          <p className="mt-2">受精卵中的染色体数目又恢复到体细胞中的数目，其中有一半染色体来自精子（父方），另一半来自卵细胞（母方）。</p>
          <p className="mt-2">减数分裂中非同源染色体自由组合、四分体中非姐妹染色单体交叉互换，使配子的染色体组合多种多样；加上受精时卵细胞和精子结合的随机性，同一双亲的后代呈现多样性。</p>
        </>} />}
      finale={T.finale && <Finale kicker="受精作用" title="减数分裂减半，受精作用恢复" text={`精子和卵细胞各带 ${n('model')} 条染色体，受精卵 ${zygote(n('model'), n('model'))} 条；人是 ${n('human')} + ${n('human')} = ${zygote(n('human'), n('human'))} 条。减数分裂和受精作用，保证了每种生物前后代体细胞中染色体数目的恒定。`} notes="细胞放大了很多倍，精子画得比实际粗；配子种类只算了非同源染色体的自由组合，没有算交叉互换。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center text-[13px] text-white/60">{s.name} · 一个细胞里的染色体</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="精子" value={String(n(sp))} unit="条" />
            <ParamTile symbol="卵细胞" value={String(n(sp))} unit="条" />
            <ParamTile symbol="受精卵" value={step >= 2 && !moving ? String(zygote(n(sp), n(sp))) : '—'} unit="条" />
          </div>
          <H>一个个体能产生的配子种类（只算自由组合）</H>
          <div className="rounded-xl bg-white/6 px-3 py-2.5 text-center">
            <span className="font-formula text-[18px] italic text-white/70">2<sup>n</sup></span>
            <span className="ml-3 text-[24px] font-bold tabular-nums">{gameteKinds(n(sp)).toLocaleString('zh-CN')}</span>
            <span className="ml-1 text-[13px] text-white/55">种 · n = {n(sp)} 对</span>
          </div>
          <Legend />
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 'kinds'} onClick={() => setKinds(true)} disabled={kinds}>看精子种类</LabButton>
        <LabButton primary pulse={next === 'enter'} onClick={() => setStep(1)} disabled={!kinds || step !== 0}>受精</LabButton>
        <LabButton pulse={next === 'fuse'} onClick={() => setStep(2)} disabled={step !== 1 || moving}>核融合</LabButton>
      </>}
      extras={
        <Control label="物种">
          <Segmented label="物种" pulse={next === 'sp'} want={task?.id === 'human' ? 'human' : null} value={sp} onChange={v => setSp(v as Sp)} options={(Object.keys(SPECIES) as Sp[]).map(k => ({ value: k, label: SPECIES[k].name }))} />
        </Control>
      }
    />
  )
}
