// 静电场 · 第 7 课 粒子的偏转：喷码机打印头的教学模型。不充电的墨滴直飞进回收槽；充了电的墨滴在偏转板里做类平抛运动，
// 打到纸上。电荷量加倍，落点的侧移加倍；偏转电压减半，侧移减半。
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { LESSONS, goLesson } from './lessons'
import { ST, TOP } from './layout'
import { JET, deflect, sci } from './physics'
import { R7, Rig7, type Shot } from './scene7'
import { useClock } from './anim'
import { Big, Final, Sub } from './ui'
import { Place } from './world'

type Q = '0' | '1' | '2'
const mm = (q: number, U: number = JET.U) => (deflect(q, U).y * 1e3).toFixed(1)
const qs = (q: number) => q === 0 ? '0' : sci(q)
const TASKS: Task[] = [
  { id: 'q0', text: '不给墨滴充电，喷一滴', note: '不带电的墨滴不受电场力，直飞进回收槽' },
  { id: 'q1', text: `给墨滴充 ${qs(JET.q[1])} C，喷一滴`, note: `墨滴向上偏，落在纸上 ${mm(JET.q[1])} mm 处` },
  { id: 'q2', text: `充 ${qs(JET.q[2])} C，再喷一滴`, note: `电荷量加倍，落点的侧移也加倍：${mm(JET.q[2])} mm` },
  { id: 'u', text: '把偏转电压减半，再喷一滴', note: `电压减半，侧移减半：回到 ${mm(JET.q[2], JET.U / 2)} mm` },
]
const WANT: Record<string, { q: Q; half: boolean }> = { q0: { q: '0', half: false }, q1: { q: '1', half: false }, q2: { q: '2', half: false }, u: { q: '2', half: true } }
const X = ST.l7, SPEED = 0.5

export default function Lesson7() {
  const [qsel, setQsel] = useState<Q>('0')
  const [half, setHalf] = useState(false)
  const [shot, setShot] = useState<Shot | null>(null)
  const [landed, setLanded] = useState<{ q: number; U: number } | null>(null)
  const [dots, setDots] = useState<{ y: number; z: number }[]>([])
  const T = useTasks('gewu:efield:7', TASKS)
  const clock = useClock(0.2), timer = useRef(0)
  useEffect(() => { clock.start(); return () => clearTimeout(timer.current) }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  const q = JET.q[Number(qsel)], U = half ? JET.U / 2 : JET.U, f = deflect(q, U)
  const busy = !!shot && !landed
  const fire = () => {
    if (busy) return
    const s = { q, U, t0: clock.now() }; setShot(s); setLanded(null)
    const dist = (q > 0 ? R7.paper : R7.gutter) - R7.nozzle
    timer.current = window.setTimeout(() => {
      setLanded({ q, U }); if (q > 0) setDots(d => [...d, { y: deflect(q, U).y, z: 0 }])
      T.check(id => { const w = WANT[id]; return JET.q[Number(w.q)] === q && (w.half ? JET.U / 2 : JET.U) === U })
    }, dist / SPEED * 1000 + 80)
  }
  const clear = () => { clearTimeout(timer.current); setShot(null); setLanded(null) }
  const resetAll = () => { clear(); setQsel('0'); setHalf(false); setDots([]); T.reset() }

  const task = T.current
  type Next = 'q' | 'half' | 'fire' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '带电粒子垂直进入匀强电场，做类平抛运动。', next: null }
    const w = WANT[task.id]
    if (busy) return { hint: '墨滴在飞，看它落在哪…', next: null }
    if (half !== w.half) return { hint: w.half ? '把偏转电压减半' : '把偏转电压调回原样', next: 'half' }
    if (qsel !== w.q) return { hint: w.q === '0' ? '把墨滴的电荷量调到 0' : `把墨滴的电荷量调到 ${qs(JET.q[Number(w.q)])} C`, next: 'q' }
    return { hint: '喷一滴', next: 'fire' }
  })()

  const hit = landed && landed.q > 0 ? deflect(landed.q, landed.U).y : null
  const labels: Label[] = [
    { id: 'n1', at: [X - 0.4, TOP + R7.y - 0.05, 0.04], ax: 0.5, name: true, className: 'scene-name', children: '喷嘴' },
    { id: 'n2', at: [X - 0.235, TOP + R7.y - 0.04, 0.03], ax: 0.5, name: true, className: 'scene-name', children: '充电电极' },
    { id: 'n3', at: [X, TOP + R7.y + 0.075, 0.04], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '偏转板' },
    { id: 'n4', at: [X + R7.gutter + 0.03, TOP + R7.y - 0.03, 0.02], ax: 0.5, name: true, className: 'scene-name', children: '回收槽' },
    { id: 'n5', at: [X + R7.paper + 0.02, TOP + R7.y + 0.14, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '纸' },
    { id: 'e', at: [X, TOP + R7.y - 0.085, 0.04], ax: 0.5, className: 'scene-tag', children: <><small>E</small>{sci(f.E)} V/m</> },
    { id: 'y', at: [X + R7.paper - 0.012, TOP + R7.y + (hit ?? 0) * R7.S, 0.02], ax: 1, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: hit ? 1 : 0 }, children: <><small>y</small>{((hit ?? 0) * 1e3).toFixed(1)} mm</> },
    { id: 'g', at: [X + R7.gutter - 0.01, TOP + R7.y + 0.03, 0.02], ax: 1, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: landed && landed.q === 0 ? 1 : 0 }, children: '进了回收槽' },
  ]
  return (
    <LabShell title="静电场" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="打印头"
      stage={<Place at="l7" cur="l7" labels={labels}><Rig7 U={U} shots={shot ? [shot] : []} clock={clock.now} speed={SPEED} trace={landed} dots={dots} /></Place>}
      lesson={<LessonBlock no="7" title="粒子的偏转" concept="垂直进入匀强电场，粒子做类平抛运动" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>带电粒子以速度 v₀ 垂直于电场方向进入匀强电场：沿初速度方向不受力，做匀速直线运动；沿电场方向受恒定的电场力，做初速度为 0 的匀加速直线运动。合起来和平抛运动一样，叫<b className="text-white">类平抛运动</b>。</p>
          <p className="mt-3">板长 L、板距 d、电压 U，粒子质量 m、电荷量 q：</p>
          <p className="mt-2 text-center font-formula text-[16px] italic">a = qU / (md)，t = L / v₀</p>
          <p className="mt-1 text-center font-formula text-[16px] italic">y₁ = ½ a t²，tan θ = a t / v₀</p>
          <p className="mt-3">出板以后不再受力，沿直线飞到纸上。落点的侧移与 q 成正比，也与 U 成正比。</p>
          <p className="mt-3">喷码机就是这样工作的：喷嘴连续喷出墨滴，要打点的墨滴按位置充上不同的电荷量，不打点的不充电，直飞进回收槽。</p>
          <p className="mt-3 text-white/60">模型放大了 10 倍，墨滴也放慢了；读数是真实打印头里的大小。墨滴受的重力比电场力小得多，没有算。</p>
        </>} />}
      finale={T.finale && <Final kicker="四滴都喷过了" title="类平抛：落点的侧移与电荷量、偏转电压成正比"
        body={<>{qs(JET.q[1])} C 落在 {mm(JET.q[1])} mm，{qs(JET.q[2])} C 落在 {mm(JET.q[2])} mm；电压减半又回到 {mm(JET.q[2], JET.U / 2)} mm。不带电的进回收槽。</>} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula="y = y₁ + D tan θ" value={q > 0 ? (f.y * 1e3).toFixed(1) : '0'} unit="mm" note={q > 0 ? '按现在的设置，墨滴落在纸上的侧移' : '不带电：墨滴不偏，进回收槽'} />
          <Sub>在偏转板里</Sub>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="a" value={f.a.toFixed(0)} unit="m/s²" />
            <ParamTile symbol="y₁" value={(f.y1 * 1e3).toFixed(1)} unit="mm · 出板" />
            <ParamTile symbol="tan θ" value={f.tan.toFixed(2)} unit="偏角" />
          </div>
          <Sub>关键参数</Sub>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="q" value={qs(q)} unit="C · 墨滴" />
            <ParamTile symbol="U" value={String(U)} unit="V · 偏转电压" />
            <ParamTile symbol="m" value={sci(JET.m)} unit="kg · 墨滴" />
            <ParamTile symbol="v₀" value={String(JET.v0)} unit="m/s" />
          </div>
          <p className="mt-3 text-[12.5px] text-white/55">板长 L = {JET.L * 1e3} mm，板距 d = {JET.d * 1e3} mm，出板到纸 D = {JET.D * 1e3} mm；穿过偏转板用 {(f.t * 1e3).toFixed(1)} ms。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'fire'} onClick={fire} disabled={busy}>喷一滴</LabButton>
        <LabButton pulse={next === 'half'} onClick={() => { clear(); setHalf(h => !h) }} disabled={busy}>{half ? '电压调回原样' : '电压减半'}</LabButton>
      </>}
      extras={<Control label="墨滴的电荷量"><Segmented label="墨滴的电荷量" pulse={next === 'q'} want={next === 'q' ? WANT[task!.id].q : null} value={qsel} onChange={k => { clear(); setQsel(k) }} disabled={busy} options={[{ value: '0', label: '不充电' }, { value: '1', label: `${qs(JET.q[1])} C` }, { value: '2', label: `${qs(JET.q[2])} C` }]} /></Control>}
    />
  )
}
