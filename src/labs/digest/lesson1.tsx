// 消化和吸收 · 第 1 课 食物中的营养物质：实验台左半边。往馒头上滴碘液、把花生在白纸上挤压、把纱布包着的面团放在清水里揉洗，
// 认出淀粉、脂肪、蛋白质；面板上列出六类营养物质，哪三类能供能。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { L1_ORDER, NUTRIENTS, TESTS, energyKinds, type TestKey } from './physics'
import { L1_SPOTS } from './bench'

const TASKS: Task[] = [
  { id: 'iodine', text: '往馒头上滴碘液', note: '馒头变蓝：淀粉遇碘变蓝，馒头里有淀粉' },
  { id: 'peanut', text: '把花生放在白纸上挤压', note: '白纸上留下油斑：花生里有脂肪' },
  { id: 'dough', text: '把面团包在纱布里，在清水中揉洗', note: '纱布里剩下黄白色的面筋：主要是蛋白质' },
]

export default function Lesson1() {
  const T = useTasks('gewu:digest:1', TASKS)
  const iod = useRun(3.6, () => T.check(id => id === 'iodine'))
  const pea = useRun(3.2, () => T.check(id => id === 'peanut'))
  const dou = useRun(5.0, () => T.check(id => id === 'dough'))
  const run: Record<TestKey, ReturnType<typeof useRun>> = { iodine: iod, peanut: pea, dough: dou }
  const busy = iod.busy || pea.busy || dou.busy
  const resetAll = () => { iod.snap(0); pea.snap(0); dou.snap(0); T.reset() }
  const task = T.current
  const nextKey = L1_ORDER.find(k => !T.done[k]) ?? null
  // 镜头对准的那件实验：做完一件先停一会儿看结果，再挪到下一件
  const [focus, setFocus] = useState<TestKey>('iodine')
  useEffect(() => { if (!nextKey) return; const t = setTimeout(() => setFocus(nextKey), nextKey === 'iodine' ? 0 : 1800); return () => clearTimeout(t) }, [nextKey])
  const hint = !task ? '食物中含有糖类、脂肪、蛋白质、水、无机盐和维生素六类营养物质。'
    : iod.busy ? '正在滴碘液…' : pea.busy ? '正在挤压…' : dou.busy ? '正在揉洗…'
    : nextKey === 'iodine' ? '先找淀粉：往馒头上滴碘液'
    : nextKey === 'peanut' ? '馒头变蓝了，说明有淀粉。再找脂肪：把花生放在白纸上挤压'
    : '纸上留下了油斑，说明有脂肪。再找蛋白质：把面团包在纱布里，在清水中揉洗'
  const tag = (k: TestKey, at: [number, number, number], ax: number): Label => T.done[k]
    ? { id: k, at, ax, className: 'scene-tag key -translate-y-1/2', children: <><small>{TESTS[k].food}{TESTS[k].mark === '面筋' ? '洗出面筋' : TESTS[k].mark}</small>有{TESTS[k].has}</> }
    : { id: k, at, ax, name: true, className: 'scene-name -translate-y-1/2', children: TESTS[k].food }
  const labels: Label[] = [tag('iodine', [L1_SPOTS.bun[0] + 0.1, L1_SPOTS.bun[1] + 0.05, L1_SPOTS.bun[2] + 0.5], 0.5), tag('peanut', [L1_SPOTS.paper[0], L1_SPOTS.paper[1], L1_SPOTS.paper[2] + 0.55], 0.5), tag('dough', [L1_SPOTS.beaker[0] + 0.45, L1_SPOTS.beaker[1], L1_SPOTS.beaker[2]], 0)]
  return (
    <LabShell title="消化和吸收" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="三个小实验"
      stage={<Place at={T.finale || !task ? 'l1' : ({ iodine: 'l1a', peanut: 'l1b', dough: 'l1c' } as const)[(['iodine', 'peanut', 'dough'] as TestKey[]).find(k => run[k].busy) ?? focus]} labels={labels} want={{ l1: { iodine: iod.k, peanut: pea.k, dough: dou.k } }} />}
      lesson={<LessonBlock no="1" title="食物中的营养物质" concept="食物里含有六类营养物质" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>食物中含有糖类、脂肪、蛋白质、水、无机盐和维生素六类营养物质。糖类、脂肪、蛋白质能为生命活动提供能量；水、无机盐、维生素不提供能量。</p>
          <p className="mt-3">淀粉遇碘变蓝，可以用碘液检验淀粉。脂肪能在纸上留下透亮的油斑。面团在清水中揉洗，淀粉被洗掉，纱布里剩下的面筋主要是蛋白质。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[12.5px] text-[#7fe3d4]">三种营养物质都找到了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">食物里含有六类营养物质</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/70">馒头里有淀粉，花生里有脂肪，面粉里有蛋白质。糖类、脂肪、蛋白质能供能，水、无机盐、维生素不供能。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">找到的营养物质</div>
            <div className="mt-1 text-[40px] leading-none font-bold tabular-nums">{L1_ORDER.filter(k => T.done[k]).length}<span className="ml-1 text-[18px] font-medium text-white/55">/ 3</span></div>
          </div>
          <ul className="mt-4 flex flex-col gap-1.5">
            {L1_ORDER.map(k => <li key={k} className={cn('rounded-lg px-3 py-2 text-[13.5px]', T.done[k] ? 'bg-white/10 text-white/85' : run[k].busy ? 'bg-[#ffb070]/20 text-white' : 'bg-white/4 text-white/40')}>
              <div className="flex justify-between"><span className="font-semibold">{TESTS[k].food} · {TESTS[k].act}</span><span>{T.done[k] ? TESTS[k].has : '—'}</span></div>
              {T.done[k] && <div className="mt-0.5 text-[12.5px] text-white/60">{TESTS[k].see}</div>}
            </li>)}
          </ul>
          <h2 className="mt-4 text-[13px] text-white/60">六类营养物质（{energyKinds()} 类能供能）</h2>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {NUTRIENTS.map(n => <div key={n.key} className={cn('rounded-lg px-2 py-1.5 text-center text-[13.5px]', n.energy ? 'bg-[#ffb070]/18 text-white' : 'bg-white/6 text-white/70')}>{n.name}<div className="text-[11.5px] text-white/50">{n.energy ? '供能' : '不供能'}</div></div>)}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={nextKey === 'iodine'} pulse={!busy && nextKey === 'iodine'} onClick={() => iod.run()} disabled={busy || iod.k >= 1}>滴碘液</LabButton>
        <LabButton primary={nextKey === 'peanut'} pulse={!busy && nextKey === 'peanut'} onClick={() => pea.run()} disabled={busy || pea.k >= 1}>挤压花生</LabButton>
        <LabButton primary={nextKey === 'dough'} pulse={!busy && nextKey === 'dough'} onClick={() => dou.run()} disabled={busy || dou.k >= 1}>揉洗面团</LabButton>
      </>}
      extras={null}
    />
  )
}
