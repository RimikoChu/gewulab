// 带电粒子在磁场中 · 第 5 课 速度选择器：支架上剖开的真空室。离子源一直在发射质子；先只加电场，质子弯向下板；
// 再加磁场，速度正好的质子沿直线穿过狭缝；换成快质子，往上偏；换成电子，两个力都反过来，照样直线通过。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { SEL, SEL_BEAMS, sci, selE, selForces, selSpeed, type BeamKey } from './physics'
import { R5, Rig5, selPath } from './scene5'
import { Place } from './world'
import { ST } from './layout'
import { useClock, useSettled } from './anim'

const TASKS: Task[] = [
  { id: 'e', text: '只加电场，看质子往哪偏', note: '质子受向下的电场力，打在下板（负极板）上' },
  { id: 'eb', text: '再加磁场', note: `qE = qvB，v = E/B = ${sci(selSpeed(), 1)} m/s 的质子沿直线穿过狭缝` },
  { id: 'fast', text: '换成快质子', note: '速度大，洛伦兹力大于电场力，往上偏，过不了狭缝' },
  { id: 'neg', text: '换成电子', note: '电子带负电，两个力都反过来，仍然平衡：速度选择器只选速度' },
]
const X = ST.l5
const BEAMS: BeamKey[] = ['slow', 'mid', 'fast', 'electron']

export default function Lesson5() {
  const [e, setE] = useState(false)
  const [b, setB] = useState(false)
  const [beam, setBeam] = useState<BeamKey>('mid')
  const T = useTasks('gewu:bfield:5', TASKS)
  const clock = useClock(0.5)
  useEffect(() => { clock.start() }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  const settled = useSettled(`${e}${b}${beam}`, 2200)
  const path = selPath(beam, e, b), f = selForces(beam, e, b)
  const resetAll = () => { setE(false); setB(false); setBeam('mid'); T.reset() }
  useEffect(() => {
    if (!settled) return
    T.check(id => (id === 'e' && e && !b && beam === 'mid')
      || (id === 'eb' && e && b && beam === 'mid' && !!T.done.e)
      || (id === 'fast' && e && b && beam === 'fast' && !!T.done.eb)
      || (id === 'neg' && e && b && beam === 'electron' && !!T.done.fast))
  }, [settled])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  type Next = 'e' | 'b' | 'beam' | null
  const want: BeamKey | null = task?.id === 'fast' ? 'fast' : task?.id === 'neg' ? 'electron' : 'mid'
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '只有 v = E/B 的粒子能直线通过。', next: null }
    if (beam !== want) return { hint: task.id === 'fast' ? '换成快质子' : task.id === 'neg' ? '换成电子' : '换回速度正好的质子', next: 'beam' }
    if (task.id === 'e') return b ? { hint: '先把磁场撤掉', next: 'b' } : e ? { hint: '质子往哪边偏…', next: null } : { hint: '只加电场，看质子往哪偏', next: 'e' }
    if (!e) return { hint: '加上电场', next: 'e' }
    if (!b) return { hint: '再加磁场', next: 'b' }
    return { hint: task.id === 'eb' ? '看质子能不能穿过狭缝…' : task.id === 'fast' ? '快质子往哪边偏…' : '电子能不能通过…', next: null }
  })()

  const p = SEL_BEAMS[beam]
  const labels: Label[] = [
    { id: 'n1', at: [X - 0.32, R5.y + 0.05, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '离子源' },
    { id: 'n2', at: [X + 0.32, R5.y + 0.09, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '狭缝和计数器' },
    { id: 'n3', at: [X, R5.y + 0.06, 0.03], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '平行金属板' },
    { id: 'res', at: [X + R5.slit + 0.01, R5.y - 0.035, 0.02], ax: 0, className: 'scene-tag key transition-opacity', style: { opacity: settled ? 1 : 0 }, children: path.through ? '直线通过' : path.hit === 'top' ? '打在上板' : path.hit === 'bottom' ? '打在下板' : '偏了，挡在狭缝外' },
  ]
  return (
    <LabShell title="带电粒子在磁场中" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="电场和磁场"
      stage={<Place at="l5" cur="l5" labels={labels}>
        <Rig5 e={e} b={b} beam={beam} clock={clock.now} />
      </Place>}
      lesson={<LessonBlock no="5" title="速度选择器" concept="只有 v = E/B 的粒子能直线通过" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>两块平行金属板间加电压，产生竖直的匀强电场；同时加垂直纸面的匀强磁场。带电粒子同时受电场力 qE 和洛伦兹力 qvB，两者方向相反。</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">qE = qvB，v = E / B</p>
          <p className="mt-3">只有速度恰好为 E/B 的粒子受力平衡，沿直线穿过狭缝。速度大了，洛伦兹力大于电场力；速度小了，电场力占上风，都会偏开。</p>
          <p className="mt-3">粒子带负电时，两个力都反向，仍然平衡。所以速度选择器只选择速度，与粒子的电性、电荷量、质量无关。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四件事都做完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">qE = qvB：只有 v = E/B 的粒子能直线通过</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">E = {sci(selE(), 1)} V/m，B = {SEL.B.toFixed(2)} T，选出的速度是 {sci(selSpeed(), 1)} m/s；它只看速度，不看电性和质量。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">v = E / B</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{sci(selSpeed(), 1)}<span className="ml-1 text-[15px] font-medium text-white/55">m/s</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">能直线通过的速度</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">{p.name} · v = {sci(f.v, 1)} m/s</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="qE" value={e ? sci(f.fe, 1) : '0'} unit="N · 电场力" />
            <ParamTile symbol="qvB" value={b ? sci(f.fb, 1) : '0'} unit="N · 洛伦兹力" />
            <ParamTile symbol="E" value={e ? sci(selE(), 1) : '0'} unit={`V/m · ${SEL.U} V ÷ ${SEL.d * 100} cm`} />
            <ParamTile symbol="B" value={b ? SEL.B.toFixed(2) : '0'} unit="T · 垂直纸面向里" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'e'} pulse={next === 'e'} onClick={() => setE(v => !v)}>{e ? '撤去电场' : '加电场'}</LabButton>
        <LabButton primary={next === 'b'} pulse={next === 'b'} onClick={() => setB(v => !v)} disabled={!T.done.e && !b}>{b ? '撤去磁场' : '加磁场'}</LabButton>
      </>}
      extras={<Control label="射入的粒子"><Segmented label="射入的粒子" pulse={next === 'beam'} want={next === 'beam' ? want : null} value={beam} onChange={k => setBeam(k as BeamKey)} disabled={!T.done.eb && beam === 'mid'} options={BEAMS.map(k => ({ value: k, label: SEL_BEAMS[k].name }))} /></Control>}
    />
  )
}
