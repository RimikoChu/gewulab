// 动量和碰撞 · 第 5 课 牛顿摆：五颗一样的钢球。拉起几颗松手，另一头就弹起几颗，中间的不动。
// 质量相等的弹性碰撞交换速度；面板上的“假如”表说明：只有弹出同样多的颗数，动量和动能才都守恒。
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { CRADLE_Y, Cradle, ballAt } from './bench'
import { Glove, Vec, gloveQuat, useRun, type VecHandle } from './gear'
import { BENCH_Z, COL, ST, TOP } from './layout'
import { LESSONS, goLesson } from './lessons'
import { CRADLE, cradleAngles, cradleTry, kinetic, momentum, swingPeriod, swingSpeed } from './physics'
import { useSpace } from './trial'
import { num } from './views'
import { Place } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type N = '1' | '2' | '3'
const KEYS: N[] = ['1', '2', '3']
const TASKS: Task[] = [
  { id: '1', text: '拉起 1 颗，松手', note: '另一头只弹起 1 颗，中间的三颗几乎不动：速度一颗一颗传了过去' },
  { id: '2', text: '拉起 2 颗，松手', note: '另一头弹起的也是 2 颗，不会是 1 颗飞得更快' },
  { id: '3', text: '拉起 3 颗，松手', note: '弹起 3 颗：中间那一颗跟着两边来回摆。撞进几颗，就弹出几颗' },
]
const X0 = ST.cradle, TH = CRADLE.deg * Math.PI / 180, HAND_Q = gloveQuat([1, -0.3, 0.1], [-0.25, 0.3, -1])
/** 箭头的比例：速度每 1 m/s、动量每 1 kg·m/s 各画多长（m） */
const KV = 0.1, KP = 1.6

function Rig({ n, lifted, run, onMark }: { n: number; lifted: boolean; run: number; onMark: () => void }) {
  const angles = useRef<number[]>(Array(CRADLE.n).fill(0)), prev = useRef<number[]>(Array(CRADLE.n).fill(0))
  const hand = useRef<THREE.Group>(null), away = useRef(1)
  const vl = useRef<VecHandle>(null), pl = useRef<VecHandle>(null), vr = useRef<VecHandle>(null), pr = useRef<VecHandle>(null)
  useRun(run, (t, dt) => {
    const a = angles.current
    if (run !== 0) cradleAngles(n, t).forEach((x, i) => { a[i] = x })
    else for (let i = 0; i < CRADLE.n; i++) a[i] += ((lifted && i < n ? -TH : 0) - a[i]) * (1 - Math.exp(-dt / 0.16))
    // 手：拉起时捏着最外面的一颗；松手以后往左上方让开
    away.current += ((lifted && run === 0 ? 0 : 1) - away.current) * (1 - Math.exp(-dt / 0.12))
    const b = ballAt(0, a[0])
    if (hand.current) { hand.current.visible = away.current < 0.96; hand.current.position.set(b[0] - 0.038 - away.current * 0.07, b[1] + 0.03 + away.current * 0.05, b[2] - 0.012) }
    // 两边各一组箭头：这一组球的水平速度和总动量
    const group = (from: number, vv: VecHandle | null, pv: VecHandle | null) => {
      const w = dt > 0 ? (a[from] - prev.current[from]) / dt : 0, v = run !== 0 ? CRADLE.L * Math.cos(a[from]) * w : 0
      const mid = ballAt(from + (n - 1) / 2, a[from])
      vv?.set([mid[0], CRADLE_Y.ball - 0.024, 0.02], [v * KV, 0, 0]); pv?.set([mid[0], CRADLE_Y.ball - 0.036, 0.02], [n * momentum(CRADLE.m, v) * KP, 0, 0])
    }
    group(0, a[0] < -1e-4 ? vl.current : null, a[0] < -1e-4 ? pl.current : null); group(CRADLE.n - n, a[CRADLE.n - 1] > 1e-4 ? vr.current : null, a[CRADLE.n - 1] > 1e-4 ? pr.current : null)
    if (!(a[0] < -1e-4)) { vl.current?.set([0, 0, 0], [0, 0, 0]); pl.current?.set([0, 0, 0], [0, 0, 0]) }
    if (!(a[CRADLE.n - 1] > 1e-4)) { vr.current?.set([0, 0, 0], [0, 0, 0]); pr.current?.set([0, 0, 0], [0, 0, 0]) }
    prev.current = [...a]
  }, [swingPeriod() * 2.25], onMark)
  return <>
    <Cradle angles={angles} />
    <group ref={hand} quaternion={HAND_Q} visible={false}><Glove pinch={0.45} arm={0.26} /></group>
    <Vec ref={vl} color={COL.v} thick={0.0016} /><Vec ref={pl} color={COL.p} thick={0.002} /><Vec ref={vr} color={COL.v} thick={0.0016} /><Vec ref={pr} color={COL.p} thick={0.002} />
  </>
}

export default function Lesson5() {
  const [mode, setMode] = useState<N>('1')
  const [lifted, setLifted] = useState(false)
  const [run, setRun] = useState(0), id = useRef(0)
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState<N[]>([])
  const T = useTasks('gewu:momentum:5', TASKS)
  const n = Number(mode), v = swingSpeed(), swung = run !== 0 && !busy
  const lift = () => { if (busy) return; setRun(0); setLifted(true) }
  const release = () => { if (busy || !lifted || run !== 0) return; setBusy(true); setRun(++id.current) }
  const ended = () => { setBusy(false); const next = rows.includes(mode) ? rows : [...rows, mode]; setRows(next); T.check(k => next.includes(k as N)) }
  const pick = (k: N) => { if (busy) return; setMode(k); setRun(0); setLifted(false) }
  const resetAll = () => { setMode('1'); setLifted(false); setRun(0); setBusy(false); setRows([]); T.reset() }
  useSpace(() => (lifted && run === 0 ? release() : lift()))
  const task = T.current
  const next: 'mode' | 'lift' | 'go' | null = !task || busy ? null : mode !== task.id ? 'mode' : lifted && run === 0 ? 'go' : 'lift'
  const hint = !task ? '质量相等的弹性碰撞，交换速度：撞进几颗，就弹出几颗。'
    : busy ? '数一数另一头弹起了几颗…'
    : next === 'mode' ? `把颗数换成“${task.id} 颗”`
    : next === 'go' ? '按“松手”' : `按“拉起”：把左边 ${n} 颗钢球拉到 ${CRADLE.deg}°`
  const labels: Label[] = [
    { id: 'in', at: [X0 + ballAt(0, -TH)[0] - 0.01, TOP + CRADLE_Y.rail + 0.035, BENCH_Z], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: lifted ? 1 : 0 }, children: <><small>拉起</small>{n} 颗</> },
    { id: 'out', at: [X0 + ballAt(CRADLE.n - 1, TH)[0] + 0.01, TOP + CRADLE_Y.rail + 0.035, BENCH_Z], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: swung ? 1 : 0 }, children: <><small>弹起</small>{n} 颗</> },
    { id: 'ball', at: [X0 + 0.07, TOP + CRADLE_Y.ball - 0.012, BENCH_Z + 0.03], name: true, className: 'scene-name -translate-y-1/2', children: `钢球 · 每颗 ${CRADLE.m * 1000} g` },
    { id: 'line', at: [X0 + 0.095, TOP + CRADLE_Y.rail - 0.03, BENCH_Z + 0.06], name: true, className: 'scene-name -translate-y-1/2', children: `摆线 · 摆长 ${CRADLE.L * 100} cm` },
  ]
  return (
    <LabShell title="动量和碰撞" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="钢球"
      stage={<Place at="l5" cur="cradle" labels={labels}><group position={[X0, TOP, BENCH_Z]}><Rig key={mode} n={n} lifted={lifted} run={run} onMark={ended} /></group></Place>}
      lesson={<LessonBlock no="5" title="牛顿摆" concept="质量相等的弹性碰撞，交换速度" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>钢球之间的碰撞很接近<b className="text-white">弹性碰撞</b>：动量守恒，动能也不变。两个方程联立，碰后的速度是</p>
          <p className="mt-2 font-formula text-[15px] italic text-white/90">v₁′ = (m₁ − m₂) v₁ / (m₁ + m₂)，v₂′ = 2 m₁ v₁ / (m₁ + m₂)</p>
          <p className="mt-3">质量相等时，v₁′ = 0，v₂′ = v₁：<b className="text-white">两球交换速度</b>。牛顿摆里，速度就这样一颗一颗传到另一头。</p>
          <p className="mt-3">m₁ 比 m₂ 大得多时，大球几乎不减速，小球以接近 2 倍的速度弹开；m₁ 比 m₂ 小得多时，小球几乎原速弹回，大球几乎不动。</p>
          <p className="mt-3 text-[13.5px] text-white/65">钢球到最低点的速度由机械能守恒算出：v = √(2gL(1 − cos θ))。这里不计能量损失，实际的牛顿摆会慢慢停下来。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">1 颗、2 颗、3 颗都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">质量相等的弹性碰撞，交换速度</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">撞进几颗，就弹出几颗、速度也一样。假如拉起 2 颗只弹出 1 颗，要动量守恒它的速度得是 2 倍，动能就成了原来的 {num(cradleTry(2, 1).ek1 / cradleTry(2, 1).ek0, 0)} 倍，这不可能：动量和动能要同时守恒。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再摆几次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">另一头弹起</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{swung ? n : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">颗</span></div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">撞进去的 {n} 颗（到最低点时）</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="v" value={num(v)} unit="m/s" />
            <ParamTile symbol="p" value={num(n * momentum(CRADLE.m, v), 3)} unit="kg·m/s" />
            <ParamTile symbol="Ek" value={num(n * kinetic(CRADLE.m, v) * 1000, 1)} unit="×10⁻³ J" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">假如另一头弹出的是…（动量已经按守恒算）</h2>
          <table className="mt-1 w-full text-[13px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">弹出</th><th className="text-right font-normal">每颗速度 / (m/s)</th><th className="text-right font-normal">动能 / ×10⁻³ J</th><th className="text-right font-normal">行不行</th></tr></thead>
            <tbody>{[1, 2, 3, 4].map(k => { const r = cradleTry(n, k); return <tr key={k} className={`border-t border-white/12 ${k === n ? 'font-semibold text-white' : 'text-white/70'}`}><td className="py-1.5">{k} 颗</td><td className="text-right tabular-nums">{num(r.u)}</td><td className="text-right tabular-nums">{num(r.ek1 * 1000, 1)}</td><td className="text-right" style={{ color: r.ok ? COL.ok : '#ff9a7a' }}>{r.ok ? '动能也守恒' : r.ek1 > r.ek0 ? '动能变多了' : '动能变少了'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'lift'} onClick={lift} disabled={busy || (lifted && run === 0)}>拉起</LabButton>
        <LabButton primary pulse={next === 'go'} onClick={release} disabled={busy || !lifted || run !== 0}>松手</LabButton>
      </>}
      extras={<Control label="拉起几颗"><Segmented label="拉起几颗" pulse={next === 'mode'} want={next === 'mode' ? task!.id as N : null} value={mode} disabled={busy} onChange={pick} options={KEYS.map(k => ({ value: k, label: `${k} 颗` }))} /></Control>}
    />
  )
}
