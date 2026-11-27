// 带电粒子在磁场中 · 第 4 课 周期与速度无关：C 形电磁铁两极之间的真空室。先发射一个质子看它转一圈；
// 再同时发射三个速度不同的质子，三个圆大小不同，却同时回到出发点；磁场加倍，转一圈的时间减半；换成 α 粒子，周期变长。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { CYC, PARTICLES, orbitPeriod, orbitRadius, qm, sci } from './physics'
import { R4, Rig4, type Orbit } from './scene4'
import { Place } from './world'
import { ST } from './layout'
import { useClock } from './anim'

type Kind = 'proton' | 'alpha'
/** 画面放慢：0.50 T 里的质子转一圈画成 2.4 秒 */
const SLOW = 2.4 / orbitPeriod('proton', CYC.B0)
const ns = (k: Kind, B: number) => (orbitPeriod(k, B) * 1e9).toFixed(1)
const TASKS: Task[] = [
  { id: 'one', text: '发射一个质子，看它转一圈', note: `转一圈用 ${ns('proton', CYC.B0)} ns` },
  { id: 'three', text: '同时发射三个速度不同的质子', note: '三个圆大小不同，却同时回到出发点：周期与速度无关' },
  { id: 'b2', text: '把磁场加倍，再发射', note: `转一圈只要 ${ns('proton', 2 * CYC.B0)} ns：B 加倍，周期减半` },
  { id: 'alpha', text: '换成 α 粒子', note: `α 粒子的比荷约是质子的一半，转一圈 ${ns('alpha', 2 * CYC.B0)} ns，约为质子的两倍` },
]
const X = ST.l4

export default function Lesson4() {
  const [kind, setKind] = useState<Kind>('proton')
  const [big, setBig] = useState(false)
  const [n, setN] = useState(0)
  const T = useTasks('gewu:bfield:4', TASKS)
  const clock = useClock(0.1)
  const B = big ? 2 * CYC.B0 : CYC.B0
  const P = orbitPeriod(kind, B) * SLOW
  const orbits: Orbit[] = CYC.mult.slice(0, n).map(k => ({ r: orbitRadius(kind, B, k * CYC.v0), P, t0: 0, k }))
  const laps = n ? Math.floor(clock.tick / P + 1e-6) : 0
  const lapDone = n > 0 && clock.tick >= P + 0.3
  const launch = (m: number) => { setN(m); clock.start() }
  const resetAll = () => { setKind('proton'); setBig(false); setN(0); clock.stop(); T.reset() }
  // 换了磁场或粒子：已经在转的那几个重新发射
  useEffect(() => { if (n) clock.start() }, [kind, big])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!lapDone) return
    T.check(id => (id === 'one' && n >= 1)
      || (id === 'three' && n === 3 && !big && kind === 'proton')
      || (id === 'b2' && n === 3 && big && kind === 'proton' && !!T.done.three)
      || (id === 'alpha' && n === 3 && kind === 'alpha' && !!T.done.b2))
  }, [lapDone])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  type Next = 'one' | 'three' | 'big' | 'kind' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '周期 T = 2πm/(qB)，与速度无关。', next: null }
    if (task.id === 'one') return n === 1 ? { hint: '质子在转，等它回到出发点…', next: null } : { hint: '发射一个质子，看它转一圈', next: 'one' }
    if (task.id === 'three') return n === 3 ? { hint: '三个质子在转，看谁先回到出发点…', next: null } : { hint: '同时发射三个速度不同的质子', next: 'three' }
    if (task.id === 'b2') return big ? { hint: '磁场加倍了，看转一圈要多久…', next: null } : { hint: '把磁场加倍', next: 'big' }
    return kind === 'alpha' ? { hint: 'α 粒子在转，看转一圈要多久…', next: null } : { hint: '换成 α 粒子', next: 'kind' }
  })()

  const p = PARTICLES[kind]
  const labels: Label[] = [
    { id: 'n1', at: [X - 0.36, R4.y + 0.42, -0.2], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: 'C 形电磁铁' },
    { id: 'n2', at: [X + R4.pole + 0.03, R4.y + 0.03, 0.1], ax: 0, name: true, className: 'scene-name', children: '真空室' },
    { id: 'n3', at: [X + R4.src[0] - 0.05, R4.y - 0.01, R4.src[1]], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '粒子源' },
    { id: 'lap', at: [X + R4.src[0], R4.y + 0.04, R4.src[1]], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: n && laps > 0 ? 1 : 0 }, children: <><small>回到出发点</small>{laps} 次</> },
  ]
  return (
    <LabShell title="带电粒子在磁场中" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="粒子源和磁场"
      stage={<Place at="l4" cur="l4" labels={labels}>
        <Rig4 B={B} orbits={orbits} clock={clock.now} />
      </Place>}
      lesson={<LessonBlock no="4" title="周期与速度无关" concept="周期 T = 2πm/(qB)，与速度无关" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>匀速圆周运动的周期 T = 2πr / v。把 r = mv/(qB) 代进去：</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">T = 2πm / (qB)</p>
          <p className="mt-3">速度越大，半径越大，要走的路也越长，两者成正比，所以转一圈的时间不变。周期只由粒子的<b className="text-white">比荷 q/m</b> 和<b className="text-white">磁感应强度 B</b> 决定。</p>
          <p className="mt-3">这一点是回旋加速器能工作的关键：粒子越转越快，转半圈的时间却总是一样。</p>
          <p className="mt-3 text-white/60">粒子实际转一圈只要一百多纳秒，画面放慢了。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四件事都做完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">T = 2πm/(qB)：与速度、半径无关，只看比荷和磁场</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">质子在 {CYC.B0} T 中 {ns('proton', CYC.B0)} ns，在 {2 * CYC.B0} T 中 {ns('proton', 2 * CYC.B0)} ns；α 粒子在 {2 * CYC.B0} T 中 {ns('alpha', 2 * CYC.B0)} ns。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">T = 2π m / (q B)</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{ns(kind, B)}<span className="ml-1 text-[15px] font-medium text-white/55">ns</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">{p.name}转一圈的时间 · 画面放慢</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">三个速度的半径（cm）</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {CYC.mult.map(k => <ParamTile key={k} symbol={k === 1 ? 'v₀' : `${k}v₀`} value={(orbitRadius(kind, B, k * CYC.v0) * 100).toFixed(1)} unit={n >= k ? '在转' : '没发射'} />)}
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="B" value={B.toFixed(2)} unit="T · 竖直向上" />
            <ParamTile symbol="q/m" value={sci(qm(p.q, p.m), 2)} unit={`C/kg · ${p.name}`} />
          </div>
          <p className="mt-3 text-[12.5px] text-white/55">v₀ = {sci(CYC.v0, 1)} m/s</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'one'} pulse={next === 'one'} onClick={() => launch(1)}>发射一个</LabButton>
        <LabButton primary={next === 'three'} pulse={next === 'three'} onClick={() => launch(3)} disabled={!T.done.one}>同时发射三个</LabButton>
        <LabButton pulse={next === 'big'} onClick={() => setBig(b => !b)} disabled={!T.done.three}>{big ? '磁场还原' : '磁场加倍'}</LabButton>
      </>}
      extras={<Control label="粒子"><Segmented label="粒子" pulse={next === 'kind'} want={next === 'kind' ? 'alpha' : null} value={kind} onChange={k => setKind(k as Kind)} disabled={!T.done.b2} options={[{ value: 'proton', label: '质子' }, { value: 'alpha', label: 'α 粒子' }]} /></Control>}
    />
  )
}
