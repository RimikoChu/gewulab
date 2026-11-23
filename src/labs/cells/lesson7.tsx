// 细胞 · 第 7 课 一个变两个（细胞分裂的过程；染色体先复制再平均分配）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Dividing } from './models'
import { DIVIDE, LAST_STEP, chromosomes, type CellKind } from './physics'
import { SPAN, SPOT, ST, TOP } from './world'

const NAME: Record<CellKind, string> = { plant: '植物细胞', animal: '动物细胞' }
const TASKS: Task[] = (['plant', 'animal'] as CellKind[]).map(k => ({ id: k, text: `让一个${NAME[k]}分裂一次`, note: `最后一步：${LAST_STEP[k]}` }))

export default function Lesson7() {
  const [kind, setKind] = useState<CellKind>('plant')
  const [step, setStep] = useState(0)
  const [did, setDid] = useState<CellKind[]>([])
  const T = useTasks('gewu:cells:7', TASKS)
  const go = () => { if (step >= DIVIDE.length) return; const s = step + 1; setStep(s); if (s >= DIVIDE.length) { const next = did.includes(kind) ? did : [...did, kind]; setDid(next); T.check(id => next.includes(id as CellKind)) } }
  const pick = (k: CellKind) => { setKind(k); setStep(0) }
  const resetAll = () => { setKind('plant'); setStep(0); setDid([]); T.reset() }
  const say = (i: number) => DIVIDE[i].key === 'wall' ? LAST_STEP[kind] : DIVIDE[i].say
  const task = T.current, todo = DIVIDE[step], counts = chromosomes(step)
  const { hint, next }: { hint: string; next: 'kind' | 'go' | null } = !task ? { hint: '两种细胞都分裂过了。新细胞的染色体和原来的一样多。', next: null }
    : kind !== task.id ? { hint: `把细胞换成“${NAME[task.id as CellKind]}”`, next: 'kind' }
    : todo ? { hint: `${step ? `${say(step - 1)}。` : ''}按“下一步”`, next: 'go' } : { hint: say(DIVIDE.length - 1), next: null }

  return (
    <LabShell title="细胞" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="细胞分裂"
      stage={<LabStage labels={[{ id: 's', at: [ST.model, TOP + 1.85, 0], ax: 0.5, className: `scene-tag -translate-y-full${step ? ' key' : ''}`, children: step ? <><small>第 {step} 步</small>{DIVIDE[step - 1].name}</> : `一个${NAME[kind]}` }]} target={SPOT.model} span={SPAN.model}><Dividing position={[ST.model, TOP + 0.95, 0]} kind={kind} step={step} /></LabStage>}
      lesson={<LessonBlock no="7" title="一个变两个" concept="先分核，再分质；染色体先复制、再平分" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>细胞分裂就是一个细胞分成两个细胞。</p>
          <ol className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">{DIVIDE.map((s, i) => <li key={s.key}><b className="text-[#7fe3d4]">{i + 1}. {s.name}：</b>{s.key === 'wall' ? `植物细胞${LAST_STEP.plant}；动物细胞${LAST_STEP.animal}` : s.say}</li>)}</ol>
          <p className="mt-3">两个新细胞里的染色体，形态和数目都和原来的细胞<b className="text-white">相同</b>，所以遗传物质也一样。</p>
          <p className="mt-3 text-[13.5px] text-white/65">模型里画了 4 条染色体，只是示意。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种细胞都分裂过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">染色体先复制加倍，再平均分给两个新细胞</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">植物细胞在中间长出新的壁，动物细胞从中间缢裂。新细胞的染色体和原来一样多。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{NAME[kind]} · 每个细胞核里的染色体</div>
            <div className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">{counts.join(' 和 ')}<span className="ml-1 text-[15px] font-medium text-white/55">条</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="细胞核" value={`${counts.length} 个`} unit={counts.length > 1 ? '已经一分为二' : '还没有分开'} />
            <ParamTile symbol="细胞" value={step >= DIVIDE.length ? '2 个' : '1 个'} unit={step >= DIVIDE.length ? '分裂完成' : '正在分裂'} />
          </div>
          {step > 0 && <ol className="mt-4 flex flex-col gap-1.5 text-[13.5px]">{DIVIDE.slice(0, step).map((s, i) => <li key={s.key} className="row-in rounded-xl bg-white/6 px-3 py-2"><b className="text-white">{i + 1}. {s.name}</b><span className="ml-2 text-white/65">{say(i)}</span></li>)}</ol>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'go'} onClick={go} disabled={!todo}>{todo ? '下一步' : '分裂完成'}</LabButton></>}
      extras={<Control label="细胞"><Segmented label="细胞" pulse={next === 'kind'} want={next === 'kind' ? task!.id as CellKind : null} value={kind} onChange={pick} options={(['plant', 'animal'] as CellKind[]).map(k => ({ value: k, label: NAME[k] }))} /></Control>}
    />
  )
}
