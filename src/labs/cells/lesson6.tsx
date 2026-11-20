// 细胞 · 第 6 课 动物细胞少了什么（动物细胞没有细胞壁、液泡、叶绿体）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Cell } from './models'
import { PARTS, PART_KEYS, has, onlyPlant, type CellKind } from './physics'
import { SPAN, SPOT, ST, TOP } from './world'

const NAME: Record<CellKind, string> = { plant: '植物细胞', animal: '动物细胞' }
const TASKS: Task[] = [
  { id: 'animal', text: '换成动物细胞模型，看它的样子', note: '没有固定的方方正正的外形：它没有细胞壁' },
  { id: 'diff', text: '按“比一比”，找出植物细胞多了什么', note: `多了${onlyPlant().map(k => PARTS[k].name).join('、')}` },
]

export default function Lesson6() {
  const [kind, setKind] = useState<CellKind>('plant')
  const [seen, setSeen] = useState(false)
  const [cmp, setCmp] = useState(false)
  const T = useTasks('gewu:cells:6', TASKS)
  const pick = (k: CellKind) => { setKind(k); setCmp(false); if (k === 'animal') { setSeen(true); T.check(id => id === 'animal') } }
  const compare = () => { if (!seen) return; setKind('plant'); setCmp(true); T.check(() => true) }
  const resetAll = () => { setKind('plant'); setSeen(false); setCmp(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'kind' | 'cmp' | null } = !task ? { hint: '比完了。亮着的三样，是植物细胞才有的。', next: null }
    : task.id === 'animal' ? { hint: '把模型换成“动物细胞”', next: 'kind' } : { hint: '按“比一比”：植物细胞比它多了哪几样', next: 'cmp' }

  return (
    <LabShell title="细胞" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="细胞模型"
      stage={<LabStage labels={[{ id: 'n', at: [ST.model, TOP + 1.85, 0], ax: 0.5, className: `scene-tag -translate-y-full${cmp ? ' key' : ''}`, children: cmp ? <><small>植物细胞才有</small>{onlyPlant().map(k => PARTS[k].name).join(' · ')}</> : NAME[kind] }]} target={SPOT.model} span={SPAN.model}><Cell position={[ST.model, TOP + 0.95, 0]} kind={kind} glow={cmp ? onlyPlant() : []} /></LabStage>}
      lesson={<LessonBlock no="6" title="动物细胞少了什么" concept="都有膜、质、核；植物细胞多三样" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">相同的：</b>都有细胞膜、细胞质、细胞核，细胞质里都有线粒体。</p>
          <p className="mt-3"><b className="text-white">不同的：</b>植物细胞还有细胞壁和液泡，绿色部分的细胞还有叶绿体；动物细胞这三样都没有。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种细胞比完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">动物细胞没有细胞壁、液泡和叶绿体</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">细胞膜、细胞质、细胞核、线粒体，两种细胞都有。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在的模型是</div>
            <div className="mt-1 text-[30px] leading-none font-bold tracking-tight text-[#7fe3d4]">{NAME[kind]}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">结构</th><th className="text-center font-normal">植物细胞</th><th className="text-center font-normal">动物细胞</th></tr></thead>
            <tbody>{PART_KEYS.map(k => <tr key={k} className={`border-t border-white/12 ${cmp && !has('animal', k) ? 'text-[#7fe3d4]' : ''}`}><td className="py-1.5">{PARTS[k].name}</td><td className="text-center">有</td><td className="text-center font-semibold">{seen ? (has('animal', k) ? '有' : '没有') : '—'}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'cmp'} onClick={compare} disabled={!seen || cmp}>比一比</LabButton></>}
      extras={<Control label="细胞"><Segmented label="细胞" pulse={next === 'kind'} want={next === 'kind' ? 'animal' : null} value={kind} onChange={pick} options={(['plant', 'animal'] as CellKind[]).map(k => ({ value: k, label: NAME[k] }))} /></Control>}
    />
  )
}
