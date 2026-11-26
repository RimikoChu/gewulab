// 消化和吸收 · 第 6 课 吸收：右边展台上放大的一段小肠。剖开看环形皱襞和小肠绒毛；放大一根绒毛，看里面的毛细血管和毛细淋巴管；
// 让营养物质被吸收；最后回到人体模型，比一比胃和大肠能吸收什么。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { ABSORB, type Organ } from './physics'
import { GUT_AT, VIL_AT, VILLUS_H, VILLUS_R, gutWall } from './villi'
import { SPOTS } from './body'
import { onBody } from './world'

const TASKS: Task[] = [
  { id: 'cut', text: '剖开小肠，看环形皱襞和小肠绒毛', note: '皱襞和绒毛大大增加了小肠的内表面积' },
  { id: 'zoom', text: '放大一根绒毛，看里面的管子', note: '绒毛里有毛细血管和毛细淋巴管，绒毛壁只有一层上皮细胞' },
  { id: 'absorb', text: '让营养物质被吸收', note: '葡萄糖、氨基酸进入毛细血管，脂肪成分大多进入毛细淋巴管' },
  { id: 'stomach', text: '看胃能吸收什么', note: '胃只吸收少量的水和酒精' },
  { id: 'large', text: '看大肠能吸收什么', note: '大肠吸收少量的水、无机盐和部分维生素' },
]
const ORGANS: Organ[] = ['small', 'stomach', 'large']

export default function Lesson6() {
  const [zoom, setZoom] = useState(false)
  const [organ, setOrgan] = useState<Organ>('small')
  const T = useTasks('gewu:digest:6', TASKS)
  const cut = useRun(2.6, () => T.check(id => id === 'cut'))
  const abs = useRun(6.5, () => T.check(id => id === 'absorb'))
  const busy = cut.busy || abs.busy
  const doZoom = () => { if (cut.k < 1 || zoom) return; setZoom(true); T.check(id => id === 'zoom') }
  const pick = (o: Organ) => { if (abs.k < 1 || busy) return; setOrgan(o); if (o !== 'small') T.check(id => id === o) }
  const resetAll = () => { cut.snap(0); abs.snap(0); setZoom(false); setOrgan('small'); T.reset() }
  const task = T.current
  const { hint, next, want }: { hint: string; next: 'cut' | 'zoom' | 'abs' | 'organ' | null; want?: Organ } = !task ? { hint: '小肠是吸收营养物质的主要器官。', next: null }
    : cut.busy ? { hint: '正在剖开…', next: null }
    : abs.busy ? { hint: '营养物质正在穿过绒毛壁…', next: null }
    : cut.k < 1 ? { hint: '这是放大的一段小肠。把它纵向剖开', next: 'cut' }
    : !zoom ? { hint: '内壁上一圈圈的是环形皱襞，皱襞上铺满了小肠绒毛。放大一根绒毛', next: 'zoom' }
    : abs.k < 1 ? { hint: '绒毛壁很薄，里面有毛细血管和毛细淋巴管。让营养物质被吸收', next: 'abs' }
    : !T.done.stomach ? { hint: '营养物质主要在小肠吸收。再看胃能吸收什么：选“胃”', next: 'organ', want: 'stomach' }
    : { hint: '胃只能吸收少量的水和酒精。再看大肠：选“大肠”', next: 'organ', want: 'large' }
  const at = organ !== 'small' ? 'belly' : zoom ? 'vil' : 'gut'
  const v = (x: number, y: number, z = 0.05): [number, number, number] => [VIL_AT[0] + x, VIL_AT[1] + y, VIL_AT[2] + z]
  const labels: Label[] = organ !== 'small'
    ? [{ id: 'o', at: onBody(organ === 'stomach' ? SPOTS.stomach : [1.12, 9.7, 0.2]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>{ABSORB[organ].name}吸收</small>{ABSORB[organ].what}</> }]
    : zoom ? [
      { id: 'epi', at: v(-VILLUS_R - 0.05, VILLUS_H * 0.62), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>绒毛壁</small>一层上皮细胞</> },
      { id: 'cap', at: v(VILLUS_R * 0.75, VILLUS_H * 0.35, 0.1), ax: 0, className: `scene-tag ${abs.k > 0 ? 'key' : ''} -translate-y-1/2`, children: <><small>葡萄糖、氨基酸进入</small>毛细血管</> },
      { id: 'lac', at: v(0.05, VILLUS_H * 0.82, 0.1), ax: 0, className: `scene-tag ${abs.k > 0 ? 'key' : ''} -translate-y-1/2`, children: <><small>脂肪成分大多进入</small>毛细淋巴管</> },
    ]
    : [
      ...(cut.k >= 1 ? [
        { id: 'fold', at: gutWall(-1.24, Math.PI * 1.5), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>一圈圈</small>环形皱襞</> },
        { id: 'vil', at: gutWall(1.55, Math.PI * 1.25), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>皱襞上密密麻麻的</small>小肠绒毛</> },
      ] as Label[] : [{ id: 'n', at: [GUT_AT[0] + 2.0, GUT_AT[1] + 2.6, GUT_AT[2]], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '放大的一段小肠 · 示意' } as Label]),
    ]
  return (
    <LabShell title="消化和吸收" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="放大的小肠"
      stage={<Place at={at} labels={labels} want={{ gut: { cut: cut.k, absorb: abs.k, zoom }, body: organ !== 'small' ? { hl: [organ === 'stomach' ? 'stomach' : 'large'], dim: 0.3 } : {} }} />}
      lesson={<LessonBlock no="6" title="吸收" concept="小肠是吸收的主要器官" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>营养物质通过消化道壁进入循环系统的过程叫吸收。小肠很长，内表面有许多<b className="text-white">环形皱襞</b>，皱襞上有许多<b className="text-white">小肠绒毛</b>，大大增加了吸收的面积。</p>
          <p className="mt-3">绒毛壁和绒毛内毛细血管的壁都只由一层上皮细胞构成，营养物质很容易穿过。葡萄糖、氨基酸进入毛细血管；甘油和脂肪酸大部分进入毛细淋巴管。</p>
          <p className="mt-3">胃能吸收少量的水和酒精；大肠能吸收少量的水、无机盐和部分维生素。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[12.5px] text-[#7fe3d4]">小肠、胃、大肠都比过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">小肠是吸收的主要器官</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/70">皱襞和绒毛扩大了面积，绒毛壁、毛细血管壁都只有一层细胞。胃吸收少量水和酒精，大肠吸收少量水、无机盐和部分维生素。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[13px] text-white/60">各段能吸收什么</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {ORGANS.map(o => { const seen = o === 'small' ? abs.k >= 1 : T.done[o]; return <li key={o} className={cn('rounded-lg px-3 py-2', organ === o && seen ? 'bg-[#ffb070]/20' : seen ? 'bg-white/10' : 'bg-white/4')}>
              <div className={cn('text-[14px] font-semibold', seen ? 'text-white' : 'text-white/40')}>{ABSORB[o].name}</div>
              <div className={cn('mt-0.5 text-[13px] leading-snug', seen ? 'text-white/75' : 'text-white/30')}>{seen ? ABSORB[o].what : '—'}</div>
            </li> })}
          </ul>
          <h2 className="mt-4 text-[13px] text-white/60">绒毛里的去向</h2>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[13px]">
            <div className="rounded-lg bg-[#c8323c]/25 px-2.5 py-2"><div className="font-semibold">毛细血管</div><div className="text-white/70">葡萄糖、氨基酸</div></div>
            <div className="rounded-lg bg-[#f4ecd2]/15 px-2.5 py-2"><div className="font-semibold">毛细淋巴管</div><div className="text-white/70">大部分甘油、脂肪酸</div></div>
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'cut'} pulse={next === 'cut'} onClick={() => cut.run()} disabled={busy || cut.k > 0}>剖开小肠</LabButton>
        <LabButton primary={next === 'zoom'} pulse={next === 'zoom'} onClick={doZoom} disabled={busy || cut.k < 1 || zoom}>放大绒毛</LabButton>
        <LabButton primary={next === 'abs'} pulse={next === 'abs'} onClick={() => { if (organ !== 'small') setOrgan('small'); abs.run() }} disabled={busy || !zoom || abs.k > 0}>吸收营养</LabButton>
      </>}
      extras={
        <Control label="部位">
          <Segmented label="部位" pulse={next === 'organ'} want={want ?? null} value={organ} onChange={o => pick(o as Organ)} disabled={busy || abs.k < 1} options={ORGANS.map(o => ({ value: o, label: ABSORB[o].name }))} />
        </Control>
      }
    />
  )
}
