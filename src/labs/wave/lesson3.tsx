// 机械振动和机械波 · 第 3 课 受迫振动和共振：港池里一只杆状浮标。先在静水里把它提起来松手，测它自己上下起伏的周期；
// 再让三种频率的涌浪从外海进来，看它跟着起伏多高。浮标的运动是按受迫振动的方程一步一步算出来的，不是摆好的动画。
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, lathe, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { DECK, Motor, Pontoon } from './boats'
import { num, useRun } from './gear'
import { AT, COL, PATCH, type V3 } from './layout'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { BUOY, SWELLS, WATER, buoyAmp, buoyFreeT, gain, heaveStep, type SwellKey } from './physics'
import { WavePatch, makeGrid } from './sea'
import { ResonancePlot } from './views'
import { VOICE } from './voice'
import { Place } from './world'

const KEYS: SwellKey[] = ['low', 'mid', 'high']
type RowKey = 'free' | SwellKey
const TASKS: Task[] = [
  { id: 'free', text: '静水里把浮标提起来松手，测它自己的周期', note: `它自己起伏一次约 ${num(buoyFreeT())} s：固有频率约 ${num(BUOY.f0, 1)} Hz` },
  { id: 'low', text: '起 0.25 Hz 的涌浪，读浮标的振幅', note: `浮标跟着涌浪每 4 s 起伏一次，振幅 ${num(buoyAmp(SWELLS.low.f))} m` },
  { id: 'mid', text: '把涌浪换成 0.50 Hz，再读一次', note: `涌浪的频率等于固有频率：振幅 ${num(buoyAmp(SWELLS.mid.f))} m，是涌浪的 ${num(gain(SWELLS.mid.f), 0)} 倍` },
  { id: 'high', text: '再换成 1.00 Hz', note: `涌浪更急，浮标反而几乎不动：振幅 ${num(buoyAmp(SWELLS.high.f))} m` },
]
const [BX, BZ] = AT.buoy
const LIFT = 1.5                                   // 提起来用多久（s）
const FREE_T = LIFT + 2 * buoyFreeT() + 0.4, SWELL_T = 12

const BODY: [number, number][] = [[0, -1.0], [0.24, -1.0], [0.3, -0.92], [0.3, 0.42], [0.26, 0.5], [0.07, 0.72], [0.045, 0.74], [0.045, 1.5], [0, 1.5]]
/** 杆状浮标：红色的浮体吃水 1 m，上面一根标杆，杆上有一只黄色的指针环和顶上的球形标志。原点在静水时的水线 */
function SparBuoy() {
  const body = useMemo(() => lathe(BODY, { segs: 36 }), [])
  return <group>
    <mesh geometry={body} castShadow><meshPhysicalMaterial color={COL.red} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>
    {[-0.02, 0.26].map(y => <mesh key={y} position-y={y}><cylinderGeometry args={[0.304, 0.304, 0.1, 36]} /><meshStandardMaterial color="#f2efe6" roughness={0.5} /></mesh>)}
    <mesh position-y={0.47}><torusGeometry args={[0.28, 0.02, 8, 36]} /><Metal kind="stainless" /></mesh>
    {/* 指针：对着旁边的水尺 */}
    <mesh position={[0.34, 1.0, 0]} rotation-z={-Math.PI / 2}><coneGeometry args={[0.07, 0.6, 4]} /><meshStandardMaterial color={COL.yellow} roughness={0.5} /></mesh>
    <mesh position-y={1.0}><cylinderGeometry args={[0.07, 0.07, 0.1, 16]} /><meshStandardMaterial color={COL.yellow} roughness={0.5} /></mesh>
    <mesh position-y={1.64} castShadow><sphereGeometry args={[0.15, 20, 14]} /><meshPhysicalMaterial color={COL.red} roughness={0.4} clearcoat={0.5} /></mesh>
    <mesh position-y={1.84}><torusGeometry args={[0.05, 0.012, 8, 16]} /><Metal kind="stainless" /></mesh>
  </group>
}
/** 水尺：打在水底的一根桩，上面红白相间，每格 0.1 m；静水时指针对着的那一格是黄色的 */
function Staff() {
  return <group>
    <mesh position-y={0.2} castShadow><cylinderGeometry args={[0.06, 0.06, 3.4, 16]} /><Metal kind="steel" grain="brushed" rough={0.5} /></mesh>
    {Array.from({ length: 16 }, (_, i) => i - 8).map(i => <mesh key={i} position={[-0.075, 1.0 + i * 0.1 + 0.05, 0]}><boxGeometry args={[0.03, 0.098, 0.2]} /><meshStandardMaterial color={i === 0 || i === -1 ? '#f6c21c' : (i & 1) ? '#f2efe6' : '#c6362b'} roughness={0.6} /></mesh>)}
  </group>
}

function Rig({ mode, run, swell, onMark, tag }: { mode: 'idle' | 'free' | 'swell'; run: number; swell: SwellKey; onMark: () => void; tag: V3 }) {
  const grid = useMemo(() => makeGrid(PATCH.buoy), [])
  const f = SWELLS[swell].f
  const s = useRef({ y: 0, v: 0, env: 0, t: 0, ph: 0 }), buoy = useRef<THREE.Group>(null), rope = useRef<THREE.Mesh>(null)
  const TIP: V3 = [BX, 2.95, BZ]
  useRun(run, (tt, dt) => {
    const q = s.current
    q.t += dt
    q.env = mode === 'swell' && run !== 0 ? Math.min(1, q.env + dt / 2) : Math.max(0, q.env - dt / 1.5)
    q.ph += 2 * Math.PI * f * dt                                 // 涌浪的相位一直往前走，起浪、停浪时只改振幅
    const yw = q.env * BUOY.A * Math.sin(q.ph)
    const held = mode === 'free' && run !== 0 && tt < LIFT
    if (held) { const k = tt / LIFT; q.y = BUOY.push * k * k * (3 - 2 * k); q.v = 0 }
    else for (let i = 0; i < 4; i++) [q.y, q.v] = heaveStep(q.y, q.v, yw, dt / 4)
    buoy.current?.position.setY(q.y)
    tag[1] = q.y + 2.25
    // 吊绳：提的时候绷直，松手以后收上去
    const r = rope.current
    if (r) { const top = TIP[1], bot = held ? q.y + 1.88 : top - 0.5, len = top - bot; r.visible = true; r.scale.y = len; r.position.y = (top + bot) / 2 }
  }, [mode === 'free' ? FREE_T : SWELL_T], onMark)
  return <>
    <WavePatch grid={grid} high={0.22} fill={out => { const q = s.current, { zs, n } = grid, k = (2 * Math.PI * f) / WATER.v, a = q.env * BUOY.A; if (a === 0) { out.fill(0); return } for (let i = 0; i < n; i++) out[i] = a * Math.sin(q.ph - k * (zs[i] - BZ)) }} />
    <group ref={buoy} position={[BX, 0, BZ]}><SparBuoy /></group>
    <group position={[BX + 0.62, 0, BZ]}><Staff /></group>
    <mesh ref={rope} position={[TIP[0], 4, TIP[2]]}><cylinderGeometry args={[0.012, 0.012, 1, 6]} /><meshStandardMaterial color="#d8d2c0" roughness={0.9} /></mesh>
    <mesh position={[TIP[0], TIP[1] - 0.52, TIP[2]]}><torusGeometry args={[0.05, 0.014, 8, 16, Math.PI * 1.5]} /><Metal kind="steel" /></mesh>
    {/* 浮码头和小吊臂：立柱、斜撑、伸到浮标正上方的横臂 */}
    <group position={[BX - 2.9, 0, BZ + 0.2]}>
      <Pontoon w={3.2} d={2.6}>
        <mesh position={[1.1, DECK + 0.06, -0.2]}><cylinderGeometry args={[0.22, 0.26, 0.12, 24]} /><Metal kind="iron" grain="cast" /></mesh>
        <mesh position={[1.1, DECK + 1.3, -0.2]} castShadow><cylinderGeometry args={[0.07, 0.07, 2.55, 20]} /><meshPhysicalMaterial color="#d9a21b" roughness={0.45} clearcoat={0.4} /></mesh>
        <mesh position={[1.95, 2.95, -0.2]} rotation-z={Math.PI / 2} castShadow><boxGeometry args={[0.12, 2.1, 0.08]} /><meshPhysicalMaterial color="#d9a21b" roughness={0.45} clearcoat={0.4} /></mesh>
        <mesh position={[1.55, 2.51, -0.2]} rotation-z={-0.82} castShadow><boxGeometry args={[0.05, 1.25, 0.05]} /><meshPhysicalMaterial color="#d9a21b" roughness={0.45} clearcoat={0.4} /></mesh>
        {/* 卷扬机：电机盒和一只卷着绳的卷筒 */}
        <group position={[0.1, DECK, 0.5]}><Motor /></group>
        <mesh position={[0.62, DECK + 0.2, 0.5]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.16, 0.16, 0.34, 24]} /><meshStandardMaterial color="#d8d2c0" roughness={0.9} /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[0.62, DECK + 0.2, 0.5 + s * 0.18]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.22, 0.22, 0.02, 24]} /><Metal kind="steel" grain="turned" /></mesh>)}
        <mesh position={[2.9, 2.95, -0.2]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.09, 0.09, 0.12, 20]} /><Metal kind="steel" grain="turned" /></mesh>
      </Pontoon>
    </group>
  </>
}

export default function Lesson3() {
  const [swell, setSwell] = useState<SwellKey>('low')
  const [mode, setMode] = useState<'idle' | 'free' | 'swell'>('idle')
  const [run, setRun] = useState(0), n = useRef(0)
  const [steady, setSteady] = useState(false)
  const [rows, setRows] = useState<RowKey[]>([])
  const T = useTasks('gewu:wave:3', TASKS)
  const tag = useRef<V3>([BX, 2.25, BZ]).current
  const f = SWELLS[swell].f, busy = run !== 0 && !steady
  const start = (m: 'free' | 'swell') => { if (run !== 0) return; setSteady(false); setMode(m); setRun(++n.current) }
  const stop = () => { setRun(0); setMode('idle'); setSteady(false) }
  const mark = () => {
    const key: RowKey = mode === 'free' ? 'free' : swell
    setSteady(true); const next = rows.includes(key) ? rows : [...rows, key]; setRows(next); T.check(id => next.includes(id as RowKey))
    if (mode === 'free') { setRun(0); setMode('idle') }
  }
  const resetAll = () => { setSwell('low'); stop(); setRows([]); T.reset() }

  const task = T.current, want = task && task.id !== 'free' ? task.id as SwellKey : null
  const { hint, next }: { hint: string; next: 'lift' | 'swell' | 'go' | 'stop' | null } = (() => {
    if (!task) return { hint: '受迫振动的频率等于驱动力的频率；驱动力的频率等于固有频率时，振幅最大。', next: null }
    if (busy) return { hint: mode === 'free' ? '松手了：没有涌浪推它，数一数它自己起伏一次要多久…' : '浮标慢慢跟上了涌浪的节奏，等它稳定下来…', next: null }
    if (run !== 0) return { hint: '按“停浪”，让水面静下来', next: 'stop' }
    if (task.id === 'free') return { hint: '按“提起松手”：小吊臂把浮标提高 0.4 m，然后松开', next: 'lift' }
    if (swell !== want) return { hint: `把涌浪换成 ${SWELLS[want!].name}`, next: 'swell' }
    return { hint: `按“起浪”：让 ${SWELLS[swell].name} 的涌浪从外海进来`, next: 'go' }
  })()
  const got = rows.filter((k): k is SwellKey => k !== 'free'), knowF0 = rows.includes('free')
  const amp = mode === 'swell' && steady ? buoyAmp(f) : null
  const labels: Label[] = [
    { id: 'buoy', at: tag, ax: 0.5, className: `scene-tag ${amp != null ? 'key' : ''} -translate-y-full`, children: <><small>浮标</small>{amp != null ? `振幅 ${num(amp)} m` : mode === 'free' ? '自己在起伏' : '静止'}</> },
    { id: 'sw', at: [BX + 2.6, 0.3, BZ + 2.2], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: mode === 'swell' ? 1 : 0 }, children: <><small>涌浪 {SWELLS[swell].name}</small>振幅 {num(BUOY.A)} m</> },
    { id: 'nS', at: [BX + 0.75, 0.55, BZ], name: true, className: 'scene-name -translate-y-1/2', children: '水尺 · 每格 0.1 m' },
  ]
  return (
    <LabShell title="机械振动和机械波" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="浮标和涌浪"
      stage={<Place at="l3" labels={labels}><Rig mode={mode} run={run} swell={swell} onMark={mark} tag={tag} /></Place>}
      lesson={<LessonBlock no="3" title="受迫振动和共振" concept="驱动频率等于固有频率时振幅最大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>系统不受外力、只靠自己的回复力振动，叫<b className="text-white">自由振动</b>，它的频率叫<b className="text-white">固有频率</b>，由系统自己决定。实际的振动都有阻尼，振幅会越来越小。</p>
          <p className="mt-3">系统在周期性的驱动力作用下的振动叫<b className="text-white">受迫振动</b>。稳定以后，受迫振动的频率等于驱动力的频率，跟固有频率无关。</p>
          <p className="mt-3">驱动力的频率越接近固有频率，受迫振动的振幅越大；两者相等时振幅最大，这就是<b className="text-white">共振</b>。</p>
          <p className="mt-3 text-[13.5px] text-white/65">船在涌浪里也是这样：涌浪的周期碰上船自己摇晃的周期，船会越摇越厉害，所以船长要改航向或者航速来避开。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种涌浪都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">驱动频率等于固有频率，振幅最大</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">涌浪的振幅一直是 {num(BUOY.A)} m。浮标的振幅：0.25 Hz 时 {num(buoyAmp(0.25))} m，0.50 Hz 时 {num(buoyAmp(0.5))} m，1.00 Hz 时 {num(buoyAmp(1))} m。浮标每次都按涌浪的频率起伏，只有 0.50 Hz 正好是它的固有频率，发生了共振。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/65">浮标的振幅</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{num(amp)}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="f" value={mode === 'swell' ? num(f) : '—'} unit="Hz · 涌浪" />
            <ParamTile symbol="f′" value={amp != null ? num(f) : '—'} unit="Hz · 浮标" />
            <ParamTile symbol="f₀" value={knowF0 ? num(BUOY.f0) : '—'} unit="Hz · 固有" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">共振曲线</h2>
          <ResonancePlot pts={got.map(k => ({ f: SWELLS[k].f, a: buoyAmp(SWELLS[k].f) }))} f0={knowF0 ? BUOY.f0 : null} cur={mode === 'swell' ? f : undefined} curve={got.length === 3 ? x => buoyAmp(x) : undefined} />
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'lift'} onClick={() => start('free')} disabled={run !== 0}>提起松手</LabButton>
        <LabButton primary pulse={next === 'go'} onClick={() => start('swell')} disabled={run !== 0}>起浪</LabButton>
        <LabButton pulse={next === 'stop'} onClick={stop} disabled={run === 0 || mode === 'free'}>停浪</LabButton>
      </>}
      extras={<Control label="涌浪的频率"><Segmented label="涌浪的频率" pulse={next === 'swell'} want={next === 'swell' ? want : null} value={swell} disabled={run !== 0} onChange={k => { setSwell(k); setSteady(false) }} options={KEYS.map(k => ({ value: k, label: SWELLS[k].name }))} /></Control>}
    />
  )
}
