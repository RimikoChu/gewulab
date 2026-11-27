// 带电粒子在磁场中 · 第 2 课 洛伦兹力：第二张实验台上的电子射线管。接通高压，荧光屏上出现一道直的亮线；
// 用条形磁体的 N 极、S 极从前面靠近，亮线一次向下弯、一次向上弯；再把电子的速度和受力画出来，看洛伦兹力为什么不做功。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { CRT, crtForce, crtRadius, crtSpeed, sci } from './physics'
import { R2, Rig2 } from './scene2'
import { Place } from './world'
import { ST } from './layout'
import { useClock, useSettled } from './anim'

const TASKS: Task[] = [
  { id: 'beam', text: '接通高压，看电子束', note: '电子束沿直线射出，在荧光屏上留下一道亮线' },
  { id: 'n', text: '用磁体的 N 极从前面靠近', note: '电子束向下弯：运动的电子在磁场中受到洛伦兹力' },
  { id: 's', text: '换 S 极再靠近', note: '电子束向上弯：磁场反向，洛伦兹力也反向' },
  { id: 'work', text: '画出电子的速度和受力', note: '洛伦兹力总与速度垂直，只改变速度的方向，不改变大小' },
]
const X = ST.l2

export default function Lesson2() {
  const [on, setOn] = useState(false)
  const [near, setNear] = useState(false)
  const [face, setFace] = useState<'N' | 'S'>('N')
  const [show, setShow] = useState(false)
  const T = useTasks('gewu:bfield:2', TASKS)
  const clock = useClock(0.25)
  const nearK = useSlide(near ? 1 : 0, 1.6), moving = Math.abs(nearK - (near ? 1 : 0)) > 1e-3
  const bent = near && !moving && on
  const settled = useSettled(`${on}${near}${face}${show}`, 1600) && on && !moving
  const resetAll = () => { setOn(false); setNear(false); setFace('N'); setShow(false); clock.stop(); T.reset() }
  useEffect(() => { if (on) clock.start(); else clock.stop() }, [on])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!settled) return
    T.check(id => id === 'beam'
      || (id === 'n' && near && face === 'N')
      || (id === 's' && near && face === 'S' && !!T.done.n)
      || (id === 'work' && near && show && !!T.done.s))
  }, [settled])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  type Next = 'hv' | 'near' | 'face' | 'show' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '洛伦兹力只改变速度方向，不做功。', next: null }
    if (moving) return { hint: near ? '磁体靠近…' : '把磁体拿开…', next: null }
    if (!on) return { hint: '接通高压，看电子束', next: 'hv' }
    if (task.id === 'beam') return { hint: '电子束射出来了…', next: null }
    if (task.id === 'n') return near ? { hint: '亮线弯了，看往哪边…', next: null } : { hint: '用磁体的 N 极从前面靠近', next: 'near' }
    if (task.id === 's') {
      if (face === 'N') return near ? { hint: '先把磁体拿开', next: 'near' } : { hint: '换成 S 极朝前', next: 'face' }
      return near ? { hint: '这回往哪边弯…', next: null } : { hint: '用磁体的 S 极从前面靠近', next: 'near' }
    }
    return show ? { hint: '看速度和洛伦兹力的箭头…', next: null } : { hint: '画出电子的速度和受力', next: 'show' }
  })()

  const v = crtSpeed()
  const labels: Label[] = [
    { id: 'n1', at: [X + R2.tube[0], R2.tube[1] + 0.05, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电子射线管' },
    { id: 'n2', at: [X + R2.tube[0] - R2.len / 2, R2.tube[1] - 0.05, 0.02], ax: 0.5, name: true, className: 'scene-name', children: '阴极' },
    { id: 'n3', at: [X + R2.supply[0], R2.supply[1] + 0.17, R2.supply[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '高压电源' },
    { id: 'b', at: [X + R2.tube[0] + 0.1, R2.tube[1] + 0.05, 0.04], ax: 0, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: bent ? 1 : 0 }, children: <><small>B</small>{face === 'N' ? '垂直纸面向里 ×' : '垂直纸面向外 ·'}</> },
  ]
  return (
    <LabShell title="带电粒子在磁场中" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="射线管和磁体"
      stage={<Place at="l2" cur="l2" labels={labels}>
        <Rig2 on={on} near={nearK} face={face} show={show} clock={clock.now} />
      </Place>}
      lesson={<LessonBlock no="2" title="洛伦兹力" concept="洛伦兹力只改变速度方向，不做功" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>运动电荷在磁场中受到的力叫<b className="text-white">洛伦兹力</b>。通电导线受到的安培力，是导线里大量定向移动的电荷所受洛伦兹力的宏观表现。</p>
          <p className="mt-3">方向用<b className="text-white">左手定则</b>：磁感线垂直穿过掌心，四指指向正电荷运动的方向，拇指所指就是正电荷受力的方向。<b className="text-white">负电荷</b>受力的方向与正电荷相反，四指要指向它运动的反方向。</p>
          <p className="mt-3">v 与 B 垂直时，<span className="font-formula italic">F = qvB</span>。洛伦兹力总与速度垂直，所以对电荷<b className="text-white">不做功</b>，只改变速度的方向。</p>
          <p className="mt-3">这里的电子从阴极出发，经 {CRT.U} V 的电压加速，速度约 {sci(v, 2)} m/s；磁体靠近时管里的磁场按约 {CRT.B * 1000} mT 的匀强磁场算。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四件事都做完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">洛伦兹力 F = qvB，总与速度垂直，不做功</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">N 极靠近时电子束向下弯，S 极靠近时向上弯：电子带负电，四指要指向它运动的反方向。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">F = q v B</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{bent ? sci(crtForce(), 1) : '0'}<span className="ml-1 text-[15px] font-medium text-white/55">N</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">{!on ? '高压没接通' : bent ? `电子束向${face === 'N' ? '下' : '上'}弯` : '磁体离得远，电子束不弯'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="q" value="−e" unit="电子带负电" />
            <ParamTile symbol="v" value={on ? sci(v, 2) : '0'} unit="m/s · 大小一直不变" />
            <ParamTile symbol="B" value={bent ? `约 ${(CRT.B * 1000).toFixed(1)}` : '0'} unit="mT" />
            <ParamTile symbol="r" value={bent ? (crtRadius() * 100).toFixed(1) : '—'} unit="cm · 弯道的半径" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'hv'} pulse={next === 'hv'} onClick={() => setOn(o => !o)} disabled={moving}>{on ? '断开高压' : '接通高压'}</LabButton>
        <LabButton pulse={next === 'near'} onClick={() => setNear(n => !n)} disabled={moving || !T.done.beam}>{near ? '把磁体拿开' : '磁体靠近'}</LabButton>
        <LabButton pulse={next === 'show'} onClick={() => setShow(s => !s)} disabled={!T.done.s}>{show ? '隐藏力和速度' : '画出力和速度'}</LabButton>
      </>}
      extras={<Control label="磁体朝前的一端"><Segmented label="磁体朝前的一端" pulse={next === 'face'} want={next === 'face' ? 'S' : null} value={face} onChange={k => setFace(k as 'N' | 'S')} disabled={near || moving} options={[{ value: 'N', label: 'N 极' }, { value: 'S', label: 'S 极' }]} /></Control>}
    />
  )
}
