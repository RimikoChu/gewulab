// 电磁感应和电网 · 第 4 课 法拉第电磁感应定律：实验室第四张台。电磁铁两极之间是 0.50 T 的竖直磁场，
// 推着导体棒在导轨上匀速走：回路围住的磁场面积每秒增加 Lv，磁通量每秒增加 BLv，毫伏表读出 E = BLv。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { CUT, CUT_V, cutEmf, loopFlux } from './physics'
import { R4, Rig4 } from './scene4'
import { Place } from './world'
import { ST, TOP } from './layout'
import { useSettled } from './anim'

const mV = (E: number) => `${(E * 1e3).toFixed(1)} mV`
const TASKS: Task[] = [
  { id: 'v1', text: '以 0.10 m/s 推导体棒，读 E', note: `E = BLv = ${CUT.B} T × ${CUT.L} m × 0.10 m/s = ${mV(cutEmf(0.1))}` },
  { id: 'back', text: '把导体棒拉回去', note: '回路的面积在减小，电动势反向：−5.0 mV' },
  { id: 'v2', text: '换成 0.20 m/s，再推一次', note: `速度加倍，磁通量变化率加倍，E = ${mV(cutEmf(0.2))}` },
  { id: 'stop', text: '让导体棒停在磁场里，再读', note: '导体棒不动，磁通量不变，E = 0' },
]
type Vk = '0.1' | '0.2'
const X = ST.l4, END = R4.start + CUT.run

export default function Lesson4() {
  const [goal, setGoal] = useState(R4.start)
  const [vk, setVk] = useState<Vk>('0.1')
  const [last, setLast] = useState<number | null>(null)
  const T = useTasks('gewu:induction:4', TASKS)
  const v = Number(vk), x = useSlide(goal, v), moving = Math.abs(x - goal) > 1e-5
  const dir = Math.sign(goal - x), E = moving ? cutEmf(v) * dir : 0
  const runE = useRef(0); if (moving) runE.current = E
  const still = useSettled(`${goal}${moving}`, 5500) && !moving && goal === END
  useEffect(() => {
    if (moving) return
    const e = runE.current; runE.current = 0
    if (!e) return
    setLast(e)
    T.check(id => (id === 'v1' && e > 0 && v === 0.1) || (id === 'back' && e < 0 && !!T.done.v1) || (id === 'v2' && e > 0 && v === 0.2 && !!T.done.back))
  }, [moving])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (still) T.check(id => id === 'stop' && !!T.done.v2) }, [still])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setGoal(R4.start); setVk('0.1'); setLast(null); T.reset() }

  const task = T.current
  type Next = 'push' | 'pull' | 'v' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '磁通量变化得越快，感应电动势越大：E = BLv。', next: null }
    if (moving) return { hint: dir < 0 ? '导体棒往左走，回路面积在减小…' : v > 0.15 ? '导体棒以两倍的速度往右走…' : '导体棒往右走，回路面积在增大…', next: null }
    if (task.id === 'v1') return goal === END ? { hint: '先把导体棒拉回去', next: 'pull' } : { hint: '以 0.10 m/s 推导体棒，读 E', next: 'push' }
    if (task.id === 'back') return { hint: '把导体棒拉回去', next: 'pull' }
    if (task.id === 'v2') return vk !== '0.2' ? { hint: '把速度换成 0.20 m/s', next: 'v' } : { hint: '以 0.20 m/s 推导体棒', next: 'push' }
    return { hint: '导体棒停在磁场里不动，看读数…', next: null }
  })()

  const labels: Label[] = [
    { id: 'n1', at: [X - 0.05, TOP + 0.32, -0.2], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电磁铁' },
    { id: 'n2', at: [X + R4.meter[0], TOP + 0.15, R4.meter[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '毫伏表' },
    { id: 'e', at: [X + x + 0.03, R4.railY + 0.02, 0.08], ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>E</small>{mV(E)}</> },
    { id: 'b', at: [X + 0.18, R4.railY + 0.06, -0.02], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>B</small>{CUT.B.toFixed(2)} T</> },
  ]
  return (
    <LabShell title="电磁感应和电网" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="导体棒"
      stage={<Place at="l4" cur="l4" labels={labels}><Rig4 x={x} emf={E} flow={E * 200} push={moving ? 1 : 0} /></Place>}
      lesson={<LessonBlock no="4" title="法拉第电磁感应定律" concept="磁通量变化得越快，感应电动势越大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">法拉第电磁感应定律</b>：闭合电路中感应电动势的大小，跟穿过这一电路的磁通量的变化率成正比。n 匝线圈：E = n ΔΦ/Δt。</p>
          <p className="mt-3">导体棒以速度 v 垂直切割磁感线：Δt 内回路围住的磁场面积增加 ΔS = L v Δt，ΔΦ = B L v Δt，所以 <span className="font-formula italic">E = BLv</span>。</p>
          <p className="mt-3">速度方向和磁场成 θ 角时，只有垂直于磁场的分量起作用：E = BLv sinθ。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种速度、拉回、停下都做过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">E = ΔΦ/Δt = BLv：磁通量变得越快，电动势越大</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">0.10 m/s 时 {mV(cutEmf(0.1))}，0.20 m/s 时 {mV(cutEmf(0.2))}；拉回时反向，停下时为零。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">E = B L v</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{(E * 1e3).toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">mV</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">{moving ? `每秒磁通量变化 ${(cutEmf(v) * 1e3).toFixed(1)}×10⁻³ Wb` : last !== null ? `刚才那一趟：${mV(last)}` : '导体棒没动'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="B" value={CUT.B.toFixed(2)} unit="T · 竖直向下" />
            <ParamTile symbol="L" value={CUT.L.toFixed(2)} unit="m · 两导轨间距" />
            <ParamTile symbol="v" value={moving ? v.toFixed(2) : '0'} unit="m/s · 导体棒的速度" />
            <ParamTile symbol="Φ" value={(loopFlux(x + R4.poleL / 2) * 1e3).toFixed(2)} unit="×10⁻³ Wb · 回路里的磁通量" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'push'} pulse={next === 'push'} onClick={() => setGoal(END)} disabled={moving || goal === END}>向右推</LabButton>
        <LabButton primary={next === 'pull'} pulse={next === 'pull'} onClick={() => setGoal(R4.start)} disabled={moving || goal === R4.start}>向左拉</LabButton>
      </>}
      extras={<Control label="速度"><Segmented label="速度" pulse={next === 'v'} want={next === 'v' ? '0.2' : null} value={vk} onChange={k => setVk(k as Vk)} disabled={moving} options={CUT_V.map(s => ({ value: String(s) as Vk, label: `${s.toFixed(2)} m/s` }))} /></Control>}
    />
  )
}
