// 带电粒子在磁场中 · 第 3 课 圆周运动的半径：遮光罩里的洛伦兹力演示仪。接通电子枪，电子束沿直线射出；
// 给亥姆霍兹线圈通电，电子束弯成一个圆；磁场加倍，圆缩成一半；再把速度加倍，圆又回到原来大小。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { BULB, E, ME, bulbPeriod, bulbRadius, bulbSpeed, coilCurrent, qm, sci } from './physics'
import { R3, Rig3 } from './scene3'
import { Place } from './world'
import { ST } from './layout'
import { useClock, useSettled } from './anim'

const B0 = BULB.B0, U0 = BULB.U0
const r = (B: number, U: number) => bulbRadius(B, U) * 100
const TASKS: Task[] = [
  { id: 'line', text: '接通电子枪，看电子束', note: '没有磁场时，电子束沿直线射出，打到玻璃泡上' },
  { id: 'circle', text: '给线圈通电，磁场调到 B₀', note: `电子束弯成一个圆，r = ${r(B0, U0).toFixed(2)} cm：洛伦兹力提供向心力` },
  { id: 'b2', text: '把磁场加倍', note: `圆缩成一半，r = ${r(2 * B0, U0).toFixed(2)} cm：B 越大，半径越小` },
  { id: 'v2', text: '把电子的速度加倍', note: `圆又变回 ${r(2 * B0, 4 * U0).toFixed(2)} cm：v 越大，半径越大` },
]
type Lv = '0' | '1' | '2'
const X = ST.l3

export default function Lesson3() {
  const [on, setOn] = useState(false)
  const [lv, setLv] = useState<Lv>('0')
  const [fast, setFast] = useState(false)
  const T = useTasks('gewu:bfield:3', TASKS)
  const clock = useClock(0.25)
  // 磁场和电压都慢慢变到设定值，圆跟着连续地缩放
  const B = useSlide(Number(lv) * B0, B0 * 1.2), U = useSlide(fast ? 4 * U0 : U0, U0 * 2.4)
  const changing = Math.abs(B - Number(lv) * B0) > 1e-9 || Math.abs(U - (fast ? 4 * U0 : U0)) > 1e-6
  const rad = B > 1e-7 ? bulbRadius(B, U) : Infinity
  const settled = useSettled(`${on}${lv}${fast}`, 1800) && on && !changing
  const resetAll = () => { setOn(false); setLv('0'); setFast(false); T.reset() }
  useEffect(() => { if (on) clock.start(); else clock.stop() }, [on])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!settled) return
    T.check(id => (id === 'line' && lv === '0')
      || (id === 'circle' && lv === '1' && !fast)
      || (id === 'b2' && lv === '2' && !fast && !!T.done.circle)
      || (id === 'v2' && lv === '2' && fast && !!T.done.b2))
  }, [settled])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  type Next = 'gun' | 'lv' | 'fast' | null
  const want: Lv | null = task?.id === 'circle' ? '1' : task?.id === 'b2' || task?.id === 'v2' ? '2' : task?.id === 'line' ? '0' : null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '半径 r = mv/(qB)：速度越大半径越大，磁场越强半径越小。', next: null }
    if (!on) return { hint: '接通电子枪，看电子束', next: 'gun' }
    if (changing) return { hint: '圆在变…', next: null }
    if (want && lv !== want) return { hint: task.id === 'circle' ? '给线圈通电，磁场调到 B₀' : task.id === 'line' ? '先把线圈断电' : '把磁场加倍', next: 'lv' }
    if (task.id === 'v2' && !fast) return { hint: '把电子的速度加倍', next: 'fast' }
    if (task.id === 'line') return { hint: '电子束射出来了…', next: null }
    return { hint: task.id === 'circle' ? '电子束弯成了圆…' : task.id === 'b2' ? '磁场加倍了，看圆…' : '速度加倍了，看圆…', next: null }
  })()

  const v = bulbSpeed(U)
  const labels: Label[] = [
    { id: 'n1', at: [X + R3.bulb[0] - 0.13, R3.bulb[1] + 0.17, R3.bulb[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '亥姆霍兹线圈' },
    { id: 'n2', at: [X + R3.bulb[0] + 0.07, R3.bulb[1] - 0.09, R3.bulb[2] + 0.08], ax: 0, name: true, className: 'scene-name', children: '玻璃泡' },
    { id: 'n3', at: [X + R3.bulb[0] + R3.gun[0] - 0.03, R3.bulb[1] + R3.gun[1] - 0.012, 0.03], ax: 1, name: true, className: 'scene-name', children: '电子枪' },
    { id: 'r', at: [X + R3.bulb[0] + R3.gun[0] + (isFinite(rad) ? rad : 0) + 0.012, R3.bulb[1] + R3.gun[1] + (isFinite(rad) ? 2 * rad : 0), 0.03], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: on && isFinite(rad) && !changing ? 1 : 0 }, children: <><small>r</small>{isFinite(rad) ? (rad * 100).toFixed(2) : ''} cm</> },
  ]
  return (
    <LabShell title="带电粒子在磁场中" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="电子枪"
      stage={<Place at="l3" cur="l3" labels={labels}>
        <Rig3 on={on} B={B} U={U} r={rad} clock={clock.now} />
      </Place>}
      lesson={<LessonBlock no="3" title="圆周运动的半径" concept="半径 r = mv/(qB)" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>带电粒子的速度与匀强磁场垂直时，洛伦兹力始终与速度垂直，大小不变，提供向心力，粒子做<b className="text-white">匀速圆周运动</b>：</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">qvB = m v² / r，r = mv / (qB)</p>
          <p className="mt-3">洛伦兹力演示仪里，玻璃泡中充有稀薄气体，电子撞上气体分子使它发光，就看得见电子的径迹。亥姆霍兹线圈是一对相距一个半径的线圈，中间的磁场近似匀强，方向沿线圈的轴线。</p>
          <p className="mt-3">电子经加速电压 U 加速后，速度 v = √(2eU/m)。速度加倍，加速电压要变为 4 倍。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四件事都做完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">r = mv/(qB)：半径跟速度成正比，跟磁感应强度成反比</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">B₀ 时 {r(B0, U0).toFixed(2)} cm；磁场加倍 {r(2 * B0, U0).toFixed(2)} cm；再把速度加倍又是 {r(2 * B0, 4 * U0).toFixed(2)} cm。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">r = m v / (q B)</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{on && isFinite(rad) ? (rad * 100).toFixed(2) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">cm</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">{!on ? '电子枪没接通' : isFinite(rad) ? `转一圈 T = ${(bulbPeriod(B) * 1e9).toFixed(1)} ns` : '没有磁场，电子束是直的'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="B" value={(B * 1e3).toFixed(2)} unit={`mT · 线圈电流 ${coilCurrent(B).toFixed(2)} A`} />
            <ParamTile symbol="U" value={Math.round(U).toString()} unit="V · 加速电压" />
            <ParamTile symbol="v" value={on ? sci(v, 2) : '0'} unit="m/s" />
            <ParamTile symbol="m/q" value="电子" unit={`比荷 ${sci(qm(E, ME), 2)} C/kg`} />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'gun'} pulse={next === 'gun'} onClick={() => setOn(o => !o)}>{on ? '关闭电子枪' : '接通电子枪'}</LabButton>
        <LabButton pulse={next === 'fast'} onClick={() => setFast(f => !f)} disabled={!T.done.b2 || changing}>{fast ? '速度还原' : '速度加倍'}</LabButton>
      </>}
      extras={<Control label="线圈电流（磁场）"><Segmented label="磁场" pulse={next === 'lv'} want={next === 'lv' ? want : null} value={lv} onChange={k => setLv(k as Lv)} disabled={!T.done.line || changing} options={[{ value: '0', label: '断电' }, { value: '1', label: 'B₀' }, { value: '2', label: '2B₀' }]} /></Control>}
    />
  )
}
