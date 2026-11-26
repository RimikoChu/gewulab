// 电与磁 · 第 5 课 电动机：实验台第 5 格。闭合开关，导轨上的铜棒滚起来；改变电流方向、对调磁极各做一次；
// 最后接通直流电动机模型，看换向器让线圈一直转下去。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { commutations, forceX } from './physics'
import { L5, Scene5 } from './scene5'
import { Bench, Place, toWorld } from './world'

const TASKS: Task[] = [
  { id: 'force', text: '闭合开关，看导轨上的铜棒', note: '铜棒滚了起来：通电导线在磁场中受到力的作用' },
  { id: 'current', text: '改变电流方向，再闭合开关', note: '铜棒往反方向滚：力的方向跟电流方向有关' },
  { id: 'field', text: '对调磁极，再闭合开关', note: '又反过来了：力的方向跟磁场方向有关' },
  { id: 'motor', text: '接通电动机模型，看它转三圈', note: '' },
]
const ROD0 = L5.mag[0]

export default function Lesson5() {
  const [on, setOn] = useState(false)
  const [dir, setDir] = useState<1 | -1>(1)
  const [b, setB] = useState<1 | -1>(1)
  const [motor, setMotor] = useState(false)
  const [runs, setRuns] = useState<{ dir: number; b: number; f: number }[]>([])
  const T = useTasks('gewu:magnet:5', TASKS.map(t => t.id === 'motor' ? { ...t, note: '换向器每半圈改变一次线圈里的电流方向，线圈就能一直转下去' } : t))
  const knife = useSlide(on ? 1 : 0, 2.4), live = knife > 0.99
  const F = forceX(dir, b)
  const rodX = useSlide(on && !motor && live ? ROD0 + F * 9 : ROD0, on ? 9 : 4)
  // 电动机模型：通电后加速到每秒 0.8 圈；转过的角度累加
  const [theta, setTheta] = useState(0), spin = useRef({ w: 0, a: 0 })
  useEffect(() => {
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now
      const s = spin.current, goal = on && motor && live ? 0.8 * Math.PI * 2 : 0
      s.w += (goal - s.w) * (1 - Math.exp(-dt / 0.6)); s.a += s.w * dt
      setTheta(s.a); raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [on, motor, live])
  const rev = theta / (Math.PI * 2)
  const arrived = Math.abs(rodX - (ROD0 + F * 9)) < 1e-3 && live && on && !motor
  const resetAll = () => { setOn(false); setDir(1); setB(1); setMotor(false); setRuns([]); spin.current = { w: 0, a: 0 }; setTheta(0); T.reset() }
  useEffect(() => {
    if (!arrived) return
    setRuns(r => r.some(x => x.dir === dir && x.b === b) ? r : [...r, { dir, b, f: F }])
    if (dir === 1 && b === 1) T.check(id => id === 'force')
    if (dir === -1 && b === 1) T.check(id => id === 'current')
    if (b === -1 && T.done.current) T.check(id => id === 'field')
  }, [arrived])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (motor && rev >= 3) T.check(id => id === 'motor') }, [motor, rev >= 3])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  type Next = 'switch' | 'dir' | 'b' | 'motor' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '通电导线在磁场中受到力的作用，电动机就是这样转起来的。', next: null }
    if (knife > 0.01 && knife < 0.99) return { hint: on ? '闭合开关…' : '断开开关…', next: null }
    if (on && !motor && !arrived) return { hint: '看铜棒…', next: null }
    if (task.id === 'force') return on ? { hint: '看铜棒…', next: null } : { hint: 'N 极在上，磁场向下。闭合开关，看铜棒', next: 'switch' }
    if (task.id === 'current') return on ? { hint: '断开开关，把铜棒放回中间', next: 'switch' } : dir === 1 ? { hint: '改变电流方向', next: 'dir' } : { hint: '电流反过来了。闭合开关', next: 'switch' }
    if (task.id === 'field') return on ? { hint: '断开开关，把铜棒放回中间', next: 'switch' } : b === 1 ? { hint: '电流方向不动，把磁体翻过来：S 极在上', next: 'b' } : { hint: '磁极对调了。闭合开关', next: 'switch' }
    if (!motor) return on ? { hint: '断开开关，准备换电动机模型', next: 'switch' } : { hint: '换成电动机模型', next: 'motor' }
    return on ? { hint: `线圈在转：已经转了 ${Math.floor(rev)} 圈…`, next: null } : { hint: '闭合开关，看线圈转起来', next: 'switch' }
  })()

  const W = (p: [number, number, number]) => toWorld('l5', p)
  const labels: Label[] = motor ? [
    { id: 'm1', at: W([L5.motor[0], 7.4, 6.2]), ax: 0, name: true, className: 'scene-name -translate-y-full', children: '换向器和电刷' },
    { id: 'm2', at: W([L5.motor[0], 10.5, -0.5]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '线圈' },
  ] : [
    { id: 'n1', at: W([L5.mag[0], 15.5, 2]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '蹄形磁体' },
    { id: 'n2', at: W([L5.railX[0] + 4, L5.railY + 1, L5.railZ[1] + 3]), ax: 0.5, name: true, className: 'scene-name', children: '导轨' },
    { id: 'f', at: W([rodX + F * 4, L5.railY + 2.4, L5.railZ[1] + 3.2]), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: on && live && !motor ? 1 : 0 }, children: <><small>受力</small>向{F > 0 ? '东' : '西'}</> },
  ]
  return (
    <LabShell title="电与磁" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="电路"
      stage={<Place at={motor ? 'l5b' : 'l5'} labels={labels}><Bench at="l5"><Scene5 on={on} swing={knife} dir={dir} b={b} rodX={rodX} motor={motor} theta={theta} /></Bench></Place>}
      lesson={<LessonBlock no="5" title="电动机" concept="通电导线在磁场中受到力的作用" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>通电导线在磁场中会受到力的作用，力的方向跟<b className="text-white">电流的方向</b>、<b className="text-white">磁感线的方向</b>都有关系。只改变其中一个，力的方向就反过来；两个同时改变，力的方向不变。</p>
          <p className="mt-3">电动机由转子（线圈）和定子（磁体）组成。通电线圈在磁场中受力转动，转到线圈平面和磁感线垂直的位置（平衡位置）时，<b className="text-white">换向器</b>自动改变线圈中的电流方向，线圈就能继续转下去。</p>
          <p className="mt-3">电动机工作时，把电能转化为机械能。风机机舱里的偏航电机、变桨电机都是电动机。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">铜棒和电动机模型都转过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">通电导线在磁场中受力，方向跟电流方向、磁场方向有关</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">电动机靠换向器每半圈改变一次电流方向，持续转动，把电能转化为机械能。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          {motor ? <>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-white/[0.06] py-3"><div className="text-[12.5px] text-white/55">线圈转过</div><div className="mt-1 text-[38px] leading-none font-bold tabular-nums">{Math.floor(rev)}<span className="ml-1 text-[14px] font-medium text-white/55">圈</span></div></div>
              <div className="rounded-xl bg-white/[0.06] py-3"><div className="text-[12.5px] text-white/55">换向器换向</div><div className="mt-1 text-[38px] leading-none font-bold tabular-nums">{commutations(rev)}<span className="ml-1 text-[14px] font-medium text-white/55">次</span></div></div>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-white/60">每转半圈，换向器改变一次线圈里的电流方向。</p>
          </> : <>
            <div className="grid grid-cols-2 gap-2">
              <ParamTile symbol="电流" value={dir > 0 ? '向南' : '向北'} unit="铜棒里" />
              <ParamTile symbol="磁场" value={b > 0 ? '向下' : '向上'} unit={b > 0 ? 'N 极在上' : 'S 极在上'} />
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">铜棒往哪边滚</h2>
            <table className="mt-2 w-full text-[14px]">
              <thead><tr className="text-white/50"><th className="py-1 text-left font-normal">电流</th><th className="text-left font-normal">磁场</th><th className="text-right font-normal">受力</th></tr></thead>
              <tbody>{runs.map((r, i) => <tr key={i} className="border-t border-white/10"><td className="py-1.5">{r.dir > 0 ? '向南' : '向北'}</td><td>{r.b > 0 ? '向下' : '向上'}</td><td className="text-right font-semibold">向{r.f > 0 ? '东' : '西'}</td></tr>)}
                {!runs.length && <tr className="border-t border-white/10 text-white/40"><td className="py-1.5" colSpan={3}>闭合开关后自动记下</td></tr>}</tbody>
            </table>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'switch'} pulse={next === 'switch'} onClick={() => setOn(o => !o)} disabled={knife > 0.01 && knife < 0.99}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton pulse={next === 'dir'} onClick={() => { setOn(false); setDir(d => (d > 0 ? -1 : 1)) }} disabled={motor || (knife > 0.01 && knife < 0.99)}>改变电流方向</LabButton>
        <LabButton pulse={next === 'motor'} onClick={() => { setOn(false); setMotor(true) }} disabled={motor || !T.done.field}>换成电动机模型</LabButton>
      </>}
      extras={<Control label="蹄形磁体"><Segmented label="磁极" pulse={next === 'b'} want={next === 'b' ? 'S' : null} value={b > 0 ? 'N' : 'S'} disabled={motor || !T.done.current} onChange={v => { setOn(false); setB(v === 'N' ? 1 : -1) }} options={[{ value: 'N', label: 'N 极在上' }, { value: 'S', label: 'S 极在上' }]} /></Control>}
    />
  )
}
