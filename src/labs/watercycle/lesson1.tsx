// 水循环 · 第 1 课 水都在哪里（水圈的组成：淡水很少，能直接用的更少）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import Basin from './basin'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { BODIES, FRESH_OF_ALL, type BodyKey } from './physics'
import { ground, riverZ } from './world'

const TASKS: Task[] = [
  { id: 'ocean', text: '先看海洋：它占了全球水量的多少', note: `约 ${BODIES.ocean.ofAll}%：地球上的水几乎都是咸的海水` },
  { id: 'ice', text: '再看冰川和地下水：淡水里谁最多', note: `冰川约占淡水的 ${BODIES.ice.ofFresh}%，地下淡水约 ${BODIES.ground.ofFresh}%` },
  { id: 'river', text: '最后看河流和湖泊', note: `只占淡水的约 ${BODIES.river.ofFresh}%：人们用得最多的偏偏是最少的这一点` },
]
const ORDER: BodyKey[] = ['ocean', 'ice', 'ground', 'river']
const AT: Record<BodyKey, [number, number, number]> = { ocean: [-31, 1.2, 6], ice: [33, ground(33, 0) + 2.2, 0], ground: [-6, -2.6, 12.3], river: [-5, ground(-5, riverZ(-5)) + 1.4, riverZ(-5)] }

export default function Lesson1() {
  const [body, setBody] = useState<BodyKey | null>(null)
  const [seen, setSeen] = useState<BodyKey[]>([])
  const T = useTasks('gewu:watercycle:1', TASKS)
  const look = (k: BodyKey) => { setBody(k); const next = seen.includes(k) ? seen : [...seen, k]; setSeen(next); T.check(id => id === 'ocean' ? next.includes('ocean') : id === 'ice' ? next.includes('ice') && next.includes('ground') : next.includes('river')) }
  const resetAll = () => { setBody(null); setSeen([]); T.reset() }
  const todo = ORDER.find(k => !seen.includes(k))
  const hint = !T.current ? '都看完了。淡水只有一点点，能直接用的更少。' : `选“${BODIES[todo ?? 'river'].name}”，看它有多少`
  const labels: Label[] = ORDER.map(k => ({ id: k, at: AT[k], ax: 0.5, className: `scene-tag -translate-y-full transition-opacity${body === k ? ' key' : ''}`, style: { opacity: seen.includes(k) ? 1 : 0.55 }, children: seen.includes(k) ? <><small>{BODIES[k].name}</small>{BODIES[k].ofFresh == null ? `占全球 ${BODIES[k].ofAll}%` : `占淡水 ${BODIES[k].ofFresh}%`}</> : BODIES[k].name }))

  return (
    <LabShell title="水循环" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="水体"
      stage={<Basin labels={labels} />}
      lesson={<LessonBlock no="1" title="水都在哪里" concept="水很多，淡水很少，能直接用的更少" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <p>地球上的水分成海洋水、陆地水和大气水。海洋水约占 {BODIES.ocean.ofAll}%；淡水只有约 {FRESH_OF_ALL}%，其余是陆地上的咸水。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            {ORDER.map(k => <li key={k}><b className="text-[#7fe3d4]">{BODIES[k].name}：</b>{BODIES[k].note}</li>)}
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">这些比例是全球估算值，不同资料在小数位上略有出入。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种水体都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">水很多，但能直接用的淡水只有一点点</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">这一点点淡水能一直用下去，靠的是它在不停地循环更新。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{body ? BODIES[body].name : '选一种水体'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{body ? BODIES[body].ofAll : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">%</span></div>
            <div className="mt-1 text-[12.5px] text-white/50">占全球水量</div>
          </div>
          {body && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{BODIES[body].note}</p>}
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="淡水" value={`${FRESH_OF_ALL}%`} unit="占全球水量" />
            <ParamTile symbol="其中" value={body && BODIES[body].ofFresh != null ? `${BODIES[body].ofFresh}%` : '—'} unit="这种水体占淡水" />
          </div>
        </Glass>
      }
      actions={<></>}
      extras={
        <Control label="看哪种水体">
          <Segmented label="看哪种水体" pulse={!!T.current} want={T.current ? todo ?? null : null} value={(body ?? '') as BodyKey} onChange={look} options={ORDER.map(k => ({ value: k, label: BODIES[k].name }))} />
        </Control>
      }
    />
  )
}
