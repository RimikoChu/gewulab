// 内能和热机 · 第 6 课 热机的四个冲程（样板课）：培训区展示台上一台剖开的单缸汽油机。
// 按“下一个冲程”曲轴慢慢转半圈，认出吸气、压缩、做功、排气；四个都认过以后让它连续运转，数曲轴转几圈做功一次。
import { useEffect, useRef, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Cutaway, SPOTS } from './cutaway'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Done, H2 } from './parts'
import { ENERGY, STROKES, STROKE_INFO, cycles, strokeOf, type Stroke } from './physics'
import { StrokeView } from './views'
import { VOICE } from './voice'
import { PLINTH, Room, SHOW_Z, ST } from './world'

const TASKS: Task[] = [
  { id: '吸气', text: '转到吸气冲程', note: '进气门开，活塞向下，吸进汽油和空气的混合物' },
  { id: '压缩', text: '转到压缩冲程', note: '两个气门都关，活塞向上：机械能转化为内能' },
  { id: '做功', text: '转到做功冲程', note: '火花塞点火，燃气推活塞向下：内能转化为机械能' },
  { id: '排气', text: '转到排气冲程', note: '排气门开，活塞向上，把废气排出去' },
  { id: 'run', text: '让它连续运转，数一数曲轴转几圈做功一次', note: '一个工作循环，曲轴转两圈，对外做功一次' },
]
const X = ST.s6, Z = SHOW_Z, Y0 = PLINTH + 1.62
/** 一个冲程转多久（秒）；连续运转时每秒转多少度；连续运转要转满几个循环才算数 */
const STEP_SEC = 3.6, RUN_DEG = 200, RUN_CYCLES = 2

export default function Lesson6() {
  const [angle, setAngle] = useState(0)
  const [goal, setGoal] = useState(0)
  const [run, setRun] = useState(false)
  const [runFrom, setRunFrom] = useState(0)
  const cur = useRef(0), live = useRef({ goal, run }); live.current = { goal, run }
  const T = useTasks('gewu:heat:6', TASKS)
  useEffect(() => {
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const L = live.current
      if (L.run) cur.current += RUN_DEG * dt
      else if (cur.current < L.goal) cur.current = Math.min(L.goal, cur.current + 180 / STEP_SEC * dt)
      setAngle(cur.current)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  const moving = !run && angle < goal - 1e-6
  const strokesDone = Math.min(4, Math.floor(angle / 180 + 1e-6))
  const ran = run ? (angle - runFrom) / 720 : 0
  useEffect(() => { T.check(id => id === 'run' ? ran >= RUN_CYCLES : STROKES.indexOf(id as Stroke) < strokesDone) })
  const next = () => { if (moving || run) return; setGoal(g => Math.floor(cur.current / 180 + 1e-6) * 180 + 180) }
  const toggleRun = () => { if (run) { setRun(false); const g = Math.ceil(cur.current / 180 - 1e-6) * 180; setGoal(g) } else { setRunFrom(cur.current); setRun(true) } }
  const resetAll = () => { cur.current = 0; setAngle(0); setGoal(0); setRun(false); T.reset() }
  // 停着的时候，显示刚转完的那个冲程；转着的时候显示正在进行的那个
  const now: Stroke | null = angle < 1e-6 && !moving && !run ? null : strokeOf(Math.max(0, angle - (moving || run ? 0 : 1e-3)))
  const task = T.current, cyc = cycles(angle)
  const four = strokesDone >= 4
  const { hint, step }: { hint: string; step: 'next' | 'run' | null } = (() => {
    if (!task) return { hint: '一个工作循环有四个冲程，只有做功冲程对外做功。', step: null }
    if (run) return { hint: `连续运转：曲轴转了 ${cyc.turns} 圈，做功 ${cyc.works} 次…`, step: null }
    if (moving) return { hint: `${now}冲程：${STROKE_INFO[now!].intake === '打开' ? '进气门打开' : STROKE_INFO[now!].exhaust === '打开' ? '排气门打开' : '两个气门都关闭'}，活塞${STROKE_INFO[now!].piston}运动`, step: null }
    if (!four) return { hint: `按“下一个冲程”，转到${STROKES[strokesDone]}冲程`, step: 'next' }
    return { hint: '四个冲程都认过了。按“连续运转”，数一数曲轴转几圈做功一次', step: 'run' }
  })()
  const info = now ? STROKE_INFO[now] : null
  const at = (p: [number, number, number]): [number, number, number] => [X + p[0], Y0 + p[1], Z + p[2]]
  const labels: Label[] = [
    { id: 'k', at: at([1.25, 2.15, 0]), className: 'scene-tag key -translate-y-1/2', style: { opacity: now ? 1 : 0 }, children: <><small>{now ?? ''}冲程</small>{now ? ENERGY[now] : ''}</> },
    { id: 'n1', at: at(SPOTS.plug), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '火花塞' },
    { id: 'n2', at: at([-1.05, 2.98, 0.1]), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '进气门' },
    { id: 'n3', at: at([1.05, 2.98, 0.1]), name: true, className: 'scene-name -translate-y-1/2', children: '排气门' },
    { id: 'n4', at: at([-0.48, 1.6, 0.4]), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '活塞' },
    { id: 'n5', at: at([0.62, 0.62, 0.2]), name: true, className: 'scene-name -translate-y-1/2', children: '连杆' },
    { id: 'n6', at: at([-0.75, -0.25, 0.4]), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '曲轴' },
    { id: 'n7', at: at([-1.0, 3.55, 0.1]), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '凸轮轴' },
    { id: 'n8', at: at([0.85, 1.5, 0.05]), name: true, className: 'scene-name -translate-y-1/2', children: '气缸' },
  ]
  return (
    <LabShell title="内能和热机" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="曲轴"
      stage={<Room at="s6" labels={labels} bloom={0.9}>
        {/* 展示台：深灰的台座，上面一块钢板和两个托架 */}
        <RoundedBox args={[4.4, PLINTH, 3.2]} radius={0.08} smoothness={3} position={[X, PLINTH / 2, Z - 0.4]} castShadow receiveShadow><meshPhysicalMaterial color="#2d3237" roughness={0.5} clearcoat={0.4} clearcoatRoughness={0.4} /></RoundedBox>
        <RoundedBox args={[4.6, 0.12, 3.4]} radius={0.03} smoothness={2} position={[X, PLINTH + 0.06, Z - 0.4]} castShadow receiveShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
        {[-1, 1].map(s => <RoundedBox key={s} args={[0.3, 0.2, 1.6]} radius={0.03} smoothness={2} position={[X + s * 0.75, PLINTH + 0.2, Z - 0.8]} castShadow><Metal kind="steel" grain="brushed" /></RoundedBox>)}
        <Cutaway at={[X, Y0, Z]} angle={angle} />
      </Room>}
      lesson={<LessonBlock no="6" title="热机的四个冲程" concept="做功冲程把内能转化为机械能" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>燃料在气缸内燃烧、产生动力的热机叫<b className="text-white">内燃机</b>，汽油机是其中的一种。活塞在气缸里往复运动，从气缸一端运动到另一端叫一个<b className="text-white">冲程</b>。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>吸气冲程：进气门打开，排气门关闭，活塞向下，吸进汽油和空气的混合物</li>
            <li>压缩冲程：两个气门都关闭，活塞向上，压缩混合物，机械能转化为内能</li>
            <li>做功冲程：火花塞点火，燃气推动活塞向下，内能转化为机械能</li>
            <li>排气冲程：排气门打开，活塞向上，把废气排出气缸</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">一个工作循环有四个冲程，活塞往复两次，曲轴转两周，对外做功一次。吸气、压缩、排气三个冲程靠飞轮的惯性完成。</p>
        </>} />}
      finale={T.finale && <Done head="四个冲程都转过了" title="做功冲程把内能转化为机械能" onClose={() => T.setFinale(false)}>吸气、压缩、做功、排气四个冲程是一个工作循环，曲轴转两圈，对外做功一次。压缩冲程把机械能转化为内能，做功冲程把内能转化为机械能。</Done>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在是</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight">{now ? `${now}冲程` : '—'}</div>
            <div className="mt-2 text-[14px] text-[#ffd59a]">{now ? ENERGY[now] : '曲轴停在吸气冲程开始的位置'}</div>
          </div>
          <StrokeView now={now} />
          <H2>气门和活塞</H2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="进气门" value={info?.intake ?? '—'} unit="" />
            <ParamTile symbol="排气门" value={info?.exhaust ?? '—'} unit="" />
            <ParamTile symbol="活塞" value={info?.piston ?? '—'} unit="" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="曲轴" value={`${cyc.turns} 圈`} unit="一共转了多少" />
            <ParamTile symbol="做功" value={`${cyc.works} 次`} unit="对外做功的次数" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={step === 'next'} onClick={next} disabled={moving || run}>下一个冲程</LabButton>
        <LabButton pulse={step === 'run'} onClick={toggleRun} disabled={moving || (!four && !run)}>{run ? '停下' : '连续运转'}</LabButton>
      </>}
      extras={null}
    />
  )
}
