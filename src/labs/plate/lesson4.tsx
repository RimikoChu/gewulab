// 板块运动 · 第 4 课 板块张裂：东非。让一块完整的大陆张裂：先裂成一条裂谷（像今天的东非大裂谷），裂谷边上的火山喷发；
// 再接着张裂，海水灌进来，成了一条狭长的海（像今天的红海），中间长出新的洋底。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { ForceArrow, LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Eruption } from './fx'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { RIFT_RATE, RIFT_STAGES, riftWidth } from './physics'
import { KILI_Z, X, heightAt } from './shape'
import { VOICE } from './voice'
import { DAYLIGHT, SPOT, type Want } from './world'

const TASKS: Task[] = [
  { id: 'rift', text: '让大陆张裂 500 万年', note: '地面被拉开、往下陷，成了一条长长的裂谷' },
  { id: 'erupt', text: '看裂谷边上的火山喷发', note: '地壳拉薄了，岩浆顺着裂缝冒出来：张裂的地方多火山' },
  { id: 'sea', text: '再张裂 2000 万年', note: '裂谷越拉越宽、越陷越深，海水灌进来，成了狭长的海' },
]
/** 张裂的进度 r（0 完整，1 裂谷，2 狭长的海）对应过了多少百万年 */
const tOf = (r: number) => (r <= 1 ? RIFT_STAGES[1].t * r : RIFT_STAGES[1].t + (RIFT_STAGES[2].t - RIFT_STAGES[1].t) * (r - 1))

export default function Lesson4() {
  const [goal, setGoal] = useState(0)
  const r = useSlide(goal, 0.22), moving = Math.abs(r - goal) > 1e-3
  const [erupt, setErupt] = useState(false)
  const [erupted, setErupted] = useState(false)
  const T = useTasks('gewu:plate:4', TASKS)
  useEffect(() => { if (moving) return; T.check(id => (id === 'rift' && goal >= 1) || (id === 'sea' && goal >= 2)) }, [moving, goal])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!erupt) return; const t = setTimeout(() => { setErupt(false); setErupted(true); T.check(id => id === 'erupt') }, 6500); return () => clearTimeout(t) }, [erupt])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setGoal(0); setErupt(false); setErupted(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'pull' | 'erupt' | null } = (() => {
    if (!task) return { hint: '都做完了。板块张裂，形成裂谷和海洋。', next: null }
    if (moving) return { hint: '两侧的地块被拉开，中间往下陷…', next: null }
    if (erupt) return { hint: '火山喷发了…', next: null }
    if (task.id === 'rift') return { hint: '让这块大陆张裂 500 万年', next: 'pull' }
    if (task.id === 'erupt') return { hint: '看裂谷边上的火山喷发', next: 'erupt' }
    return { hint: '再张裂 2000 万年', next: 'pull' }
  })()

  const t = tOf(r), width = riftWidth(t), stage = r < 0.5 ? 0 : r < 1.5 ? 1 : 2
  const summit = heightAt(X.kili, KILI_Z, { rift: r, collide: 1 }, 8848.86)
  const labels: Label[] = [
    { id: 'v', at: [X.rift, 6.5, 0], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: r > 0.05 ? 1 : 0 }, children: <><small>裂开</small>约 {Math.round(width)} km</> },
    { id: 's', at: [X.rift - 30, 8, 0], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: stage === 1 ? 1 : 0 }, children: '像今天的东非大裂谷' },
    { id: 's2', at: [X.rift - 30, 8, 0], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: stage === 2 ? 1 : 0 }, children: '像今天的红海' },
    ...(r > 0.4 && r < 1.6 ? [{ id: 'f', at: [X.rift - 13, -4.5, 0] as [number, number, number], ax: 1, className: 'scene-name -translate-y-1/2', children: '断层' }] : []),
    { id: 'm', at: [X.rift + 3, -11, 0], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '岩浆往上涌' },
    ...(r > 0.8 && r < 1.6 ? [{ id: 'k', at: [X.kili + 3, summit + 0.6, 0] as [number, number, number], ax: 0, className: 'scene-name -translate-y-full', children: '火山' }] : []),
    { id: 'c', at: [X.rift - 30, -3, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '大陆地壳' },
  ]
  const s = SPOT.rift
  return (
    <LabShell narration={voiced(NARRATION['4'], VOICE)} title="板块运动" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="东非"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...DAYLIGHT} world={{ shape: { rift: r, collide: 1 }, glow: erupt ? 0.4 : 0 }}>
        {moving && [-1, 1].map(d => <ForceArrow key={d} tip={[X.rift + d * 30, 7, 0.5]} dir={[d, 0, 0]} len={12} color="#ffe9a8" thick={1.8} />)}
        <Eruption at={[X.kili, summit - 0.1, KILI_Z]} on={erupt ? 1 : 0} scale={0.9} />
      </LabStage>}
      lesson={<LessonBlock no="4" title="板块张裂" concept="板块张裂，形成裂谷和海洋" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>两个板块彼此分开的地方叫<b className="text-white">张裂</b>。地壳被拉薄、断开，中间的地块往下陷，形成裂谷；继续张裂，海水灌进来，就成了海洋。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">东非大裂谷：</b>非洲东部一条长长的裂谷，还在张裂</li>
            <li><b className="text-[#7fe3d4]">红海：</b>在非洲板块和印度洋板块之间，正在不断扩张</li>
            <li><b className="text-[#7fe3d4]">大西洋：</b>张裂得更久，已经成了大洋（第 2 课）</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">裂开的宽度按每年约 {RIFT_RATE} 厘米估算，示意。裂谷、狭长的海、大洋是同一种张裂走到的不同阶段。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">从裂谷到狭长的海</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">板块张裂，形成裂谷和海洋</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">东非大裂谷正在张裂，红海在不断变宽。再过很久，它们也可能变成大洋。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">裂开的宽度</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{r < 0.01 ? 0 : `约 ${Math.round(width)}`}<span className="ml-1 text-[15px] font-medium text-white/55">km</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="t" value={`${Math.round(t * 100)}`} unit="万年 · 张裂了多久" />
            <ParamTile symbol="v" value={`约 ${RIFT_RATE}`} unit="cm/年 · 两侧分开" />
          </div>
          <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70">宽度 = v × t ≈ <b className="text-white">{Math.round(width)} km</b></p>
          <h2 className="mt-5 text-[12.5px] text-white/55">现在是</h2>
          <div className="mt-2 flex gap-1.5">{RIFT_STAGES.map((x, i) => <span key={x.key} className={`flex-1 rounded-lg px-2 py-1.5 text-center text-[13.5px] ${i === stage ? 'bg-white font-semibold text-[#10151a]' : 'bg-white/8 text-white/60'}`}>{x.name}</span>)}</div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'pull'} pulse={next === 'pull'} onClick={() => setGoal(g => Math.min(2, g + 1))} disabled={moving || erupt || goal >= 2 || (goal === 1 && !erupted)}>{goal === 0 ? '张裂 500 万年' : '再张裂 2000 万年'}</LabButton>
        <LabButton primary={next === 'erupt'} pulse={next === 'erupt'} onClick={() => setErupt(true)} disabled={moving || erupt || goal !== 1}>火山喷发</LabButton>
      </>}
      extras={null}
    />
  )
}
