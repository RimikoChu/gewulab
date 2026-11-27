// 光反应和暗反应 · 第 6 课 两个阶段的联系：光反应给暗反应送 ATP 和 NADPH，暗反应把 ADP、Pi、NADP⁺ 还回去；
// 突然停止光照或停止供应 CO₂，看 C₃、C₅ 怎样变。
import { useEffect, useRef, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { DarkFlows, LightFlows, mac, useMacro } from './flows'
import { useAfter } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { ringAt } from './macro'
import { MOL_COLOR } from './mol'
import { NARRATION } from './narration'
import { STEADY, rates, shift, stepPools, type Pools } from './physics'
import { Bar, Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Place } from './world'

const TASKS: Task[] = [
  { id: 'run', text: '光照和 CO₂ 都给足，看两个阶段怎样配合', note: '光反应为暗反应提供 ATP 和 NADPH，暗反应为光反应提供 ADP、Pi 和 NADP⁺' },
  { id: 'dark', text: '突然停止光照，看 C₃ 和 C₅', note: `停光后 C₃ ${shift('dark').c3}、C₅ ${shift('dark').c5}` },
  { id: 'noCO2', text: '恢复以后，突然停止供应 CO₂', note: `停 CO₂ 后 C₃ ${shift('noCO2').c3}、C₅ ${shift('noCO2').c5}` },
]
type Mode = 'idle' | 'run' | 'dark' | 'noCO2'
const R0 = rates(STEADY, true, true)
const trend = (a: number, b: number) => b > a * 1.08 ? '增多' : b < a * 0.92 ? '减少' : undefined

export default function Lesson6() {
  const [mode, setMode] = useState<Mode>('idle')
  const [p, setP] = useState<Pools>(STEADY)
  const T = useTasks('gewu:chloroplast:6', TASKS)
  const light = mode === 'run' || mode === 'noCO2', co2 = mode === 'run' || mode === 'dark'
  const live = useRef({ light, co2 }); live.current = { light, co2 }
  // 物质的量跟着条件慢慢变（放慢了，看得清先后）
  useEffect(() => { if (mode === 'idle') { setP(STEADY); return } const t = setInterval(() => setP(q => stepPools(q, live.current.light, live.current.co2, 0.045)), 90); return () => clearInterval(t) }, [mode === 'idle'])   // eslint-disable-line react-hooks/exhaustive-deps
  const steady = Math.abs(p.c3 - STEADY.c3) < 0.4 && Math.abs(p.c5 - STEADY.c5) < 0.25 && Math.abs(p.e - STEADY.e) < 0.06
  const ran = useAfter(mode === 'run', 7000), darkSeen = useAfter(mode === 'dark', 6500), gasSeen = useAfter(mode === 'noCO2', 6500)
  useEffect(() => { T.check(id => id === 'run' ? ran : id === 'dark' ? darkSeen : gasSeen) }, [ran, darkSeen, gasSeen])   // eslint-disable-line react-hooks/exhaustive-deps
  useMacro(light ? 1 : 0, light ? 3.2 * (1 - p.e) / (1 - STEADY.e) : 0)
  const resetAll = () => { setMode('idle'); setP(STEADY); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: Mode | null } = (() => {
    if (!task) return { hint: '停光：C₃ 增多、C₅ 减少；停 CO₂：C₃ 减少、C₅ 增多。', next: null }
    if (task.id === 'run') return mode === 'run' ? { hint: '黄色的 ATP、紫色的 NADPH 去基质，用完变成 ADP、Pi、NADP⁺ 再回来…', next: null } : { hint: '左边是类囊体，右边是基质里的循环。按“光照、CO₂ 都正常”', next: 'run' }
    if (mode !== 'run' && mode !== task.id) return { hint: '先恢复原状。按“光照、CO₂ 都正常”', next: 'run' }
    if (mode === 'run') return steady ? (task.id === 'dark' ? { hint: '各种物质的量稳定了。按“突然停光”，盯住 C₃ 和 C₅', next: 'dark' } : { hint: '恢复稳定了。按“突然停 CO₂”，再看 C₃ 和 C₅', next: 'noCO2' }) : { hint: '等各种物质的量恢复稳定…', next: null }
    return { hint: mode === 'dark' ? '光反应停了：ATP、NADPH 不再生成，C₃ 没法还原…' : 'CO₂ 没有了：C₅ 用不掉，C₃ 没有新的来源…', next: null }
  })()
  const r = rates(p, light, co2), on = mode !== 'idle'
  const q = (deg: number, k: number) => { const v = ringAt(deg, k); return mac(v[0], v[1], v[2]) }
  const labels: Label[] = [
    { id: 'th', at: mac(-25, -7.4), ax: 0.5, className: 'scene-name', children: '类囊体：光反应' },
    { id: 'st', at: mac(10, -5.2, 3), ax: 0.5, className: 'scene-name', children: '基质：暗反应' },
    { id: 'c3', at: q(150, 1.24), ax: 1, className: 'scene-tag -translate-x-1 -translate-y-1/2', children: <>C₃{on && trend(STEADY.c3, p.c3) && <span className="delta">{trend(STEADY.c3, p.c3)}</span>}</> },
    { id: 'c5', at: q(22, 1.2), className: 'scene-tag translate-x-1 -translate-y-1/2', children: <>C₅{on && trend(STEADY.c5, p.c5) && <span className="delta">{trend(STEADY.c5, p.c5)}</span>}</> },
    ...(on ? [
      { id: 'in', at: mac(-2.4, 7.0, 2.4), ax: 0.5, className: 'scene-tag key -translate-y-full', style: { opacity: light ? 1 : 0.4 }, children: 'ATP · NADPH' },
      { id: 'out', at: mac(-1.6, 0.2, 2.6), ax: 0.5, className: 'scene-tag translate-y-1', children: 'ADP · Pi · NADP⁺' },
      { id: 'co2', at: mac(14.2, 12.6, 3), ax: 0.5, className: 'scene-tag -translate-y-full', style: { opacity: co2 ? 1 : 0.4 }, children: co2 ? 'CO₂' : 'CO₂ 停了' },
      { id: 'lt', at: mac(-23.5, 10.2, 3), ax: 0.5, className: 'scene-tag -translate-y-full', style: { opacity: light ? 1 : 0.4 }, children: light ? '光' : '光停了' },
    ] as Label[] : []),
  ]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="条件"
      stage={<Place at="both" labels={labels} bloom={0.7}>
        <LightFlows split={on && light} carry={on && light} make={on && light} rate={Math.min(1.4, r.supply / R0.supply)} away={false} />
        <DarkFlows fix={on} reduce={on} regen={on} co2={co2} c3={p.c3 / 12} c5={p.c5 / 6} fixRate={Math.min(1.6, r.fix / R0.fix)} redRate={Math.min(1.6, r.reduce / R0.reduce)} supply={Math.min(1, p.e * 1.5)} supplyRate={Math.min(1.6, r.supply / R0.supply)} sugar={on ? Math.floor(p.sugar * 2) % 6 : 0} glucose={on ? Math.floor(p.sugar * 2 / 6) : 0} />
      </Place>}
      lesson={<LessonBlock no="6" title="两个阶段的联系" concept="光反应和暗反应紧密联系、缺一不可" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>光反应阶段和暗反应阶段是一个整体，在光合作用的过程中，二者紧密联系、缺一不可：光反应为暗反应提供 <b className="text-white">ATP 和 NADPH</b>；暗反应为光反应提供 <b className="text-white">ADP、Pi 和 NADP⁺</b>。</p>
          <p className="mt-2"><b className="text-white">突然停止光照</b>：ATP、NADPH 不再生成，C₃ 的还原受阻，而 CO₂ 的固定还在进行，所以短时间内 C₃ 增多、C₅ 减少。</p>
          <p className="mt-2"><b className="text-white">突然停止供应 CO₂</b>：CO₂ 的固定停止，C₅ 不再消耗，而 C₃ 的还原还在进行，所以短时间内 C₃ 减少、C₅ 增多，ATP 和 NADPH 因为用得少了而增多。</p>
        </>} />}
      finale={T.finale && <Finale kicker="两种骤变都试过了" title="停光：C₃ 增多、C₅ 减少；停 CO₂：C₃ 减少、C₅ 增多" text="分析的办法是看“来源”和“去路”：停光先卡住 C₃ 的还原（去路没了，来源还在）；停 CO₂ 先卡住 CO₂ 的固定（C₃ 的来源没了，去路还在）。" notes="各物质的量是相对值，变化放慢了；只表示短时间内变化的方向。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>现在的条件</H>
          <div className="grid grid-cols-2 gap-2">
            <Row name="光照" text={mode === 'idle' ? '—' : light ? '正常' : '停止'} on={on && !light} />
            <Row name="CO₂" text={mode === 'idle' ? '—' : co2 ? '正常' : '停止'} on={on && !co2} />
          </div>
          <H>叶绿体里几种物质的相对量（竖线是原来的量）</H>
          <div className="flex flex-col gap-2.5">
            <Bar name="C₃" value={p.c3} base={STEADY.c3} max={12.5} color={MOL_COLOR.c3} note={on ? trend(STEADY.c3, p.c3) : undefined} />
            <Bar name="C₅" value={p.c5} base={STEADY.c5} max={6.25} color={MOL_COLOR.c5} note={on ? trend(STEADY.c5, p.c5) : undefined} />
            <Bar name="ATP、NADPH" value={p.e} base={STEADY.e} max={1.04} color={MOL_COLOR.atp} note={on ? trend(STEADY.e, p.e) : undefined} />
          </div>
          <H>两个过程的快慢</H>
          <div className="flex flex-col gap-2.5">
            <Bar name="CO₂ 的固定" value={on ? r.fix : 0} base={R0.fix} max={R0.fix * 2.1} color="#9fb4c8" />
            <Bar name="C₃ 的还原" value={on ? r.reduce : 0} base={R0.reduce} max={R0.reduce * 2.1} color="#9fb4c8" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'run'} onClick={() => setMode('run')} disabled={mode === 'run'}>光照、CO₂ 都正常</LabButton>
        <LabButton pulse={next === 'dark'} onClick={() => setMode('dark')} disabled={mode !== 'run' || !steady}>突然停光</LabButton>
        <LabButton pulse={next === 'noCO2'} onClick={() => setMode('noCO2')} disabled={mode !== 'run' || !steady}>突然停 CO₂</LabButton>
      </>}
      extras={null}
    />
  )
}
