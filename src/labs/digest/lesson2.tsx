// 消化和吸收 · 第 2 课 消化系统的组成：展厅正中的人体模型。沿消化道从口腔走到肛门，走到哪一段那一段亮；再逐个认五种消化腺。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { GLANDS, SMALL_LEN, TRACT } from './physics'
import { SPOTS, type OrganKey } from './body'
import { onBody, type SpotKey } from './world'

const TASKS: Task[] = [
  { id: 'tract', text: '从口腔走到肛门，认消化道的七段', note: '消化道：口腔、咽、食道、胃、小肠、大肠、肛门' },
  { id: 'out', text: '认消化道外的三种消化腺', note: '唾液腺、肝、胰在消化道外，通过导管把消化液送进消化道' },
  { id: 'wall', text: '认长在消化道壁内的两种消化腺', note: '胃腺、肠腺是消化道壁内的小腺体' },
]
/** 每一段、每种腺体用哪个机位看 */
const VIEW: Record<string, SpotKey> = { mouth: 'head', pharynx: 'head', esophagus: 'chest', saliva: 'head' }

export default function Lesson2() {
  const [ti, setTi] = useState(-1)        // 消化道走到第几段
  const [gi, setGi] = useState(-1)        // 认到第几种消化腺
  const T = useTasks('gewu:digest:2', TASKS)
  const tractDone = ti >= TRACT.length - 1
  const nextTract = () => { if (tractDone) return; const n = ti + 1; setTi(n); if (n === TRACT.length - 1) T.check(id => id === 'tract') }
  const nextGland = () => { if (!tractDone || gi >= GLANDS.length - 1) return; const n = gi + 1; setGi(n); if (n === 2) T.check(id => id === 'out'); if (n === 4) T.check(id => id === 'wall') }
  const resetAll = () => { setTi(-1); setGi(-1); T.reset() }
  const tract = ti >= 0 && gi < 0 ? TRACT[ti] : null, gland = gi >= 0 ? GLANDS[gi] : null
  const key = (gland?.key ?? tract?.key) as OrganKey | undefined
  const at: SpotKey = T.finale || !key ? 'tract' : VIEW[key] ?? 'belly'
  const task = T.current
  const { hint, next }: { hint: string; next: 'tract' | 'gland' | null } = !task ? { hint: '消化系统由消化道和消化腺组成。', next: null }
    : ti < 0 ? { hint: '从口腔开始，沿着消化道往下走。按“下一段”', next: 'tract' }
    : !tractDone ? { hint: `这是${TRACT[ti].name}。按“下一段”`, next: 'tract' }
    : gi < 0 ? { hint: '消化道认完了。再认消化腺：按“下一个消化腺”', next: 'gland' }
    : { hint: `这是${GLANDS[gi].name}，分泌${GLANDS[gi].juice}。按“下一个消化腺”`, next: 'gland' }
  const labels: Label[] = key ? [
    { id: 'k', at: onBody(SPOTS[key]), ax: SPOTS[key][0] < 0 ? 1 : 0, className: 'scene-tag key -translate-y-1/2', children: <><small>{gland ? `${gland.inWall ? '在消化道壁内' : '在消化道外'}` : `消化道 · 第 ${ti + 1} 段`}</small>{gland ? `${gland.name} → ${gland.juice}` : tract!.name}</> },
    ...(key === 'liver' ? [{ id: 'g', at: onBody(SPOTS.gall), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>储存胆汁</small>胆囊</> }] : []),
  ] : [{ id: 'n', at: onBody([0.9, 12.6, 0.3]), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '人体消化系统模型' }]
  return (
    <LabShell title="消化和吸收" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="人体模型"
      stage={<Place at={at} labels={labels} want={{ body: { hl: key ? [key] : [], dim: 0.32, shell: at === 'head' ? 0.15 : 1, head: at === 'head' || at === 'chest' ? 1 : 0 } }} />}
      lesson={<LessonBlock no="2" title="消化系统的组成" concept="消化系统由消化道和消化腺组成" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>消化道依次是口腔、咽、食道、胃、小肠、大肠、肛门。小肠是消化道中最长的一段，长约 {SMALL_LEN[0]}–{SMALL_LEN[1]} m。</p>
          <p className="mt-3">消化腺有两类：一类在消化道外，如<b className="text-white">唾液腺、肝、胰</b>，分泌的消化液通过导管流入消化道；一类是消化道壁内的小腺体，如<b className="text-white">胃腺、肠腺</b>。</p>
          <p className="mt-3">肝是人体最大的消化腺，分泌的胆汁先储存在胆囊里，再经导管流入小肠。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[12.5px] text-[#7fe3d4]">消化道七段、消化腺五种都认过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">消化系统由消化道和消化腺组成</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/70">唾液腺、肝、胰在消化道外，胃腺、肠腺在消化道壁内。肝是最大的消化腺。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[13px] text-white/60">消化道</h2>
          <ol className="mt-2 grid grid-cols-2 gap-1.5">
            {TRACT.map((t, i) => <li key={t.key} className={cn('rounded-lg px-2.5 py-1.5 text-[14px]', i === ti && gi < 0 ? 'bg-[#ffb070]/25 font-semibold text-white' : i <= ti ? 'bg-white/10 text-white/85' : 'bg-white/4 text-white/35')}><span className="mr-1.5 text-[12px] tabular-nums opacity-60">{i + 1}</span>{t.name}</li>)}
          </ol>
          {tract && <p className="mt-3 text-[13.5px] leading-relaxed text-white/75">{tract.note}{tract.key === 'small' ? `，长约 ${SMALL_LEN[0]}–${SMALL_LEN[1]} m。` : '。'}</p>}
          <h2 className="mt-4 text-[13px] text-white/60">消化腺</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {GLANDS.map((g, i) => <li key={g.key} className={cn('flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[14px]', i === gi ? 'bg-[#ffb070]/25 text-white' : i < gi ? 'bg-white/10 text-white/85' : 'bg-white/4 text-white/35')}>
              <span className={i === gi ? 'font-semibold' : ''}>{g.name}</span><span className="text-[13px] tabular-nums">{i <= gi ? `${g.juice} → ${g.to}` : '—'}</span>
            </li>)}
          </ul>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'tract'} pulse={next === 'tract'} onClick={nextTract} disabled={tractDone}>下一段</LabButton>
        <LabButton primary={next === 'gland'} pulse={next === 'gland'} onClick={nextGland} disabled={!tractDone || gi >= GLANDS.length - 1}>下一个消化腺</LabButton>
      </>}
      extras={null}
    />
  )
}
