// 功和机械能 · 拓展课：两个小专题。蹦极（重力势能、动能、弹性势能三样之间的转化）、滚摆（一上一下，势能和动能来回转化）。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { AXLE_R, Maxwell, WHEEL_LOW } from './bench'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { BUNGEE, WHEEL, bungeeAt, bungeeFastest, fmt, wheelAt, wheelTrip } from './physics'
import { Dummy, JUMP_X, Rope } from './rides'
import { useRun } from './run'
import { Bars, COL, Finale } from './views'
import { VOICE } from './voice'
import { P, Place } from './world'

type Sub = 'bungee' | 'wheel'
const SUBS: Record<Sub, { name: string; title: string }> = {
  bungee: { name: '蹦极', title: '重力势能先变动能，再变成绳的弹性势能' },
  wheel: { name: '滚摆', title: '下降时势能变动能，上升时动能变势能' },
}
const TASKS: Task[] = [
  { id: 'taut', text: '蹦极：让假人跳下，落到绳刚好拉直', note: `落下 ${BUNGEE.rope} m，绳上还没有力：减少的重力势能全部变成动能` },
  { id: 'low', text: '接着落，到最低点', note: `速度减到 0：减少的重力势能全部变成了绳的弹性势能` },
  { id: 'wheel', text: '滚摆：松手，看它落下再升回去', note: '下降时越转越快，重力势能变成动能；上升时越转越慢，动能变回重力势能' },
]
type Phase = 'ready' | 'fall' | 'taut' | 'stretch' | 'low'

/** 假人往下落：每帧按这时的速度往下挪，到绳拉直、到最低点各报告一次 */
function Faller({ phase, state, onArrive, onDepth }: { phase: Phase; state: { d: number }; onArrive: (p: Phase) => void; onDepth: (d: number) => void }) {
  const acc = useRef(0)
  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 1 / 30)
    if (phase === 'ready') state.d = 0
    else if (phase === 'fall') { state.d += Math.max(1.5, bungeeAt(state.d).v) * dt; if (state.d >= BUNGEE.rope) { state.d = BUNGEE.rope; onArrive('taut') } }
    else if (phase === 'stretch') { state.d += Math.max(1.2, bungeeAt(state.d).v) * dt; if (state.d >= BUNGEE.fall) { state.d = BUNGEE.fall; onArrive('low') } }
    acc.current += dt; if (acc.current > 0.06) { acc.current = 0; onDepth(state.d) }
  })
  return null
}

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('bungee')
  const [phase, setPhase] = useState<Phase>('ready')
  const [d, setD] = useState(0)
  const T = useTasks('gewu:energy:x', TASKS)
  const state = useMemo(() => ({ d: 0 }), []), tag = useRef<[number, number, number]>([0, 0, 0]).current
  const run = useRun(2 * wheelTrip())
  useEffect(() => { run.reset(); state.d = 0; setPhase('ready'); setD(0) }, [sub])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (run.done) T.check(id => id === 'wheel') }, [run.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const arrive = (p: Phase) => { setPhase(p); setD(state.d); T.check(id => id === p) }
  const resetAll = () => { setSub('bungee'); state.d = 0; setPhase('ready'); setD(0); run.reset(); T.reset() }
  const task = T.current, want: Sub = task?.id === 'wheel' ? 'wheel' : 'bungee'
  const moving = phase === 'fall' || phase === 'stretch' || run.running
  const jump = () => { if (sub === 'wheel') { run.start(); return } if (phase === 'ready') setPhase('fall'); else if (phase === 'taut') setPhase('stretch'); else if (phase === 'low') { state.d = 0; setD(0); setPhase('ready') } }
  const { hint, next }: { hint: string; next: 'sub' | 'act' | null } = !task ? { hint: '两个专题都看完了。', next: null }
    : phase === 'fall' ? { hint: '绳还松着，假人越落越快…', next: null }
    : phase === 'stretch' ? { hint: d < bungeeFastest() ? '绳开始拉长，拉力还比重力小，假人还在加速…' : '拉力超过了重力，假人越落越慢…', next: null }
    : run.running ? { hint: (run.t ?? 0) < wheelTrip() ? '滚摆往下落，越转越快…' : '到最低点了，它又往上爬，越转越慢…', next: null }
    : sub !== want ? { hint: `接着看：${SUBS[want].name}`, next: 'sub' }
    : sub === 'wheel' ? { hint: '按“松手”', next: 'act' }
    : phase === 'ready' ? { hint: '按“跳下”', next: 'act' }
    : phase === 'taut' ? { hint: '绳刚好拉直（画面定格）。按“接着落”', next: 'act' }
    : { hint: '按“拉回跳台”，再做一次', next: 'act' }

  // ---------- 蹦极 ----------
  const bungee = () => {
    const e = bungeeAt(d), [tx, , tz] = P.tower, jx = tx + JUMP_X + 1.4, y = BUNGEE.top - d
    tag[0] = jx + 1.2; tag[1] = y - 0.6; tag[2] = tz
    const labels: Label[] = [
      { id: 'd', at: tag, className: 'scene-tag key -translate-y-1/2', children: <><small>落下 {fmt(d, 1)} m</small>{fmt(e.v, 1)} m/s</> },
      { id: 'top', at: [jx - 4, BUNGEE.top + 1.6, tz], ax: 1, name: true, className: 'scene-name -translate-y-full', children: `跳台 · 高 ${BUNGEE.top} m` },
      { id: 'taut', at: [jx - 1.2, BUNGEE.top - BUNGEE.rope, tz], ax: 1, className: 'scene-name -translate-y-1/2', children: `绳刚拉直 · 落下 ${BUNGEE.rope} m` },
      { id: 'low', at: [jx - 1.2, BUNGEE.top - BUNGEE.fall, tz], ax: 1, className: 'scene-name -translate-y-1/2', children: `最低点 · 落下 ${BUNGEE.fall} m` },
    ]
    return <Place at={phase === 'ready' ? 'bungee' : phase === 'fall' || phase === 'taut' ? 'taut' : 'low'} cur={[]} labels={labels}>
      <Faller phase={phase} state={state} onArrive={arrive} onDepth={setD} />
      <Jumper state={state} x={jx} z={tz} />
      {[BUNGEE.rope, BUNGEE.fall].map(m => <mesh key={m} position={[jx - 0.6, BUNGEE.top - m, tz]}><boxGeometry args={[1.0, 0.05, 0.05]} /><meshBasicMaterial color="#ffe9a8" toneMapped={false} /></mesh>)}
    </Place>
  }
  // ---------- 滚摆 ----------
  const wheel = () => {
    const w = wheelAt(run.t ?? 0), [ox, oy, oz] = P.table2
    const labels: Label[] = [
      { id: 'h', at: [ox + 0.12, oy + WHEEL_LOW + w.h, oz], className: 'scene-tag key -translate-y-1/2', children: <><small>高</small>{fmt(w.h * 100)} cm</> },
      { id: 'n1', at: [ox, oy + 0.76, oz], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '滚摆' },
    ]
    return <Place at="maxwell" cur={['maxwell']} labels={labels}><group position={P.table2}><Maxwell y={WHEEL_LOW + w.h} turn={(WHEEL.h - w.h) / AXLE_R} /></group></Place>
  }
  const e = bungeeAt(d), w = wheelAt(run.t ?? 0)
  return (
    <LabShell title="功和机械能" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={sub === 'bungee' ? bungee() : wheel()}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id}
        theory={sub === 'bungee' ? <>
          <p>假人从 {BUNGEE.top} m 高的跳台落下，弹力绳原长 {BUNGEE.rope} m。绳拉直以前，绳上没有力，重力势能转化为动能。</p>
          <p className="mt-3">绳拉直以后开始伸长，有了弹性势能。起初拉力比重力小，假人还在加速；落下约 {fmt(bungeeFastest(), 1)} m 时拉力等于重力，速度最大；再往下拉力更大，假人减速，到最低点速度为 0。</p>
          <p className="mt-3 text-[13.5px] text-white/65">不计空气阻力和绳的质量。重力势能从最低点算起。</p>
        </> : <p>滚摆的线绕在轴上。松手后它一边转一边下降，高度降低、转得越来越快，重力势能转化为动能；到最低点，线又反着绕上去，它一边转一边上升，动能转化为重力势能。有空气阻力和摩擦，它每次上升的高度会略低一点；这里没有算这一点，画面里的过程也放慢了。</p>} />}
      finale={T.finale && <Finale kicker="两个专题都看完了" title="能量在重力势能、动能、弹性势能之间转化，总量不变" more="蹦极：重力势能 → 动能 → 弹性势能。滚摆：重力势能 ⇄ 动能。都不计空气阻力和摩擦。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center"><div className="text-[13px] text-white/60">{SUBS[sub].name}</div><div className="mt-1 text-[19px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{SUBS[sub].title}</div></div>
          {sub === 'bungee' ? <>
            <div className="mt-4"><Bars unit="J" d={0} max={e.total} items={[{ name: '重力势能（从最低点算起）', value: e.total - e.lost, color: COL.ep }, { name: '动能', value: e.Ek, color: COL.ek }, { name: '绳的弹性势能', value: e.Es, color: COL.es }]} /></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="落下" value={fmt(d, 1)} unit="m" />
              <ParamTile symbol="v" value={fmt(e.v, 1)} unit="m/s · 速度" />
            </div>
            <p className="mt-3 text-[12.5px] text-white/50">假人 {BUNGEE.mass} kg，绳原长 {BUNGEE.rope} m</p>
          </> : <>
            <div className="mt-4"><Bars unit="%" d={0} max={100} items={[{ name: '重力势能', value: (1 - w.kinetic) * 100, color: COL.ep }, { name: '动能', value: w.kinetic * 100, color: COL.ek }]} /></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="h" value={fmt(w.h * 100)} unit="cm · 离最低处" />
              <ParamTile symbol="t" value={run.t === null ? '—' : run.t.toFixed(1)} unit="s" />
            </div>
          </>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'act'} onClick={jump} disabled={moving}>{sub === 'wheel' ? '松手' : phase === 'taut' ? '接着落' : phase === 'low' ? '拉回跳台' : '跳下'}</LabButton></>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? want : null} value={sub} onChange={k => { if (!moving) setSub(k) }} options={(Object.keys(SUBS) as Sub[]).map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}

/** 假人和弹力绳：每帧按落下的距离摆好。站在跳台边时头朝上，落下去以后头朝下 */
function Jumper({ state, x, z }: { state: { d: number }; x: number; z: number }) {
  const g = useRef<import('three').Group>(null)
  useFrame(() => { const o = g.current; if (!o) return; o.position.set(x, BUNGEE.top - state.d, z); o.rotation.z = -Math.min(Math.PI, state.d * 0.9) })
  const pts = (out: Float32Array) => {
    const n = out.length / 2, ax = x - 0.9, ay = BUNGEE.top - 0.25, by = BUNGEE.top - state.d, dist = Math.hypot(x - ax, by - ay), sag = Math.sqrt(Math.max(0, BUNGEE.rope ** 2 - dist ** 2)) * 0.42
    for (let i = 0; i < n; i++) { const u = i / (n - 1); out[i * 2] = ax + (x - ax) * u - sag * 0.25 * Math.sin(Math.PI * u); out[i * 2 + 1] = ay + (by - ay) * u - sag * 4 * u * (1 - u) }
  }
  return <>
    <group ref={g} position={[x, BUNGEE.top, z]}><group scale={1.6}><Dummy /></group></group>
    <group position={[0, 0, z]}><Rope points={pts} width={0.2} /></group>
  </>
}
