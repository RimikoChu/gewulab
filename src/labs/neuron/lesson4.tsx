// 兴奋的传导和传递 · 第 4 课 兴奋在神经纤维上的传导：在一长段纤维的中间刺激，兴奋朝两边同时传；定格看兴奋部位和未兴奋部位之间的局部电流。
import { useEffect, useMemo, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Fronts, T0, ZONE_W, msOf, reach, secOf, xOf } from './fiber'
import { clamp, useRun, type Run } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Arrow, Charges, Stim } from './parts'
import { FIBER, SPEED, arrive } from './physics'
import { Big, Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { R, Room, TM } from './world'

const TASKS: Task[] = [
  { id: 'mid', text: '在中间刺激，看兴奋朝哪边传', note: '兴奋从刺激点朝两边同时传：双向传导' },
  { id: 'cur', text: '定格，看局部电流的方向', note: '膜内的电流从兴奋部位流向未兴奋部位，和传导方向一致' },
  { id: 'left', text: '从左端刺激，读兴奋到右端的时间', note: `12 cm 用了 ${arrive(0, FIBER).toFixed(1)} ms` },
]
type Mode = 'mid' | 'cur' | 'left'
const XA = xOf(0), XM = xOf(FIBER / 2), XB = xOf(FIBER)
const T_MID = secOf(arrive(FIBER / 2, FIBER)) + 1, T_LEFT = secOf(arrive(0, FIBER)) + 1, T_HOLD = T0 + 2.1 / 1.6
const D_HOLD = reach(T_HOLD)
const flash = (run: Run) => () => run.idle ? 0 : clamp(1 - Math.abs(run.ref.current - T0) / 0.3)

function Scene4({ run, mode }: { run: Run; mode: Mode | null }) {
  const xs = useMemo(() => Array.from({ length: 17 }, (_, i) => XA + i * 0.6), [])
  const s = mode === 'left' ? XA : XM, held = run.held && mode === 'cur'
  const yo = R + 1.1, yi = R - TM - 0.75, IN = '#ffcf5c', OUT = '#8fd0ff'
  return <group>
    <Fronts run={run} s={s} lo={XA} hi={XB} left={mode !== 'left'} />
    <Charges xs={xs} yOut={R + 0.62} yIn={R - TM - 0.36} size={2.1} z={0.3} />
    {mode !== 'left' && <Stim tip={[XM, R + 0.02, -0.25]} dir={[0, 1, -0.2]} len={2.6} flash={flash(run)} />}
    {mode === 'left' && <Stim tip={[XA, R + 0.02, -0.25]} dir={[0, 1, -0.2]} len={2.6} flash={flash(run)} />}
    {held && [1, -1].map(k => { const xf = XM + k * (D_HOLD + ZONE_W * 0.4), xn = xf + k * 1.5; return <group key={k}>
      <Arrow from={[xf, yi, 0.5]} to={[xn, yi, 0.5]} bulge={[0, -0.6, 0]} color={IN} r={0.055} />
      <Arrow from={[xn, yo, 0.3]} to={[xf, yo, 0.3]} bulge={[0, 0.6, 0]} color={OUT} r={0.055} />
      <Arrow from={[XM + k * 1.5, -0.2, 1.75]} to={[XM + k * 3.9, -0.2, 1.75]} bulge={[0, 0, 0]} color="#ffffff" r={0.06} />
    </group> })}
  </group>
}

export default function Lesson4() {
  const [mode, setMode] = useState<Mode | null>(null)
  const [got, setGot] = useState<Mode[]>([])
  const run = useRun(T_LEFT)
  const T = useTasks('gewu:neuron:4', TASKS)
  const fin = mode && (mode === 'cur' ? run.held : run.done)
  useEffect(() => { if (fin && mode && !got.includes(mode)) setGot([...got, mode]) }, [fin])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { T.check(id => got.includes(id as Mode)) }, [got])   // eslint-disable-line react-hooks/exhaustive-deps
  const go = (m: Mode) => { setMode(m); if (m === 'cur') run.start(T_HOLD, true); else run.start(m === 'mid' ? T_MID : T_LEFT) }
  const resetAll = () => { setMode(null); setGot([]); run.reset(); T.reset() }
  const task = T.current, s = mode === 'left' ? 0 : FIBER / 2
  const ms = run.idle ? 0 : msOf(run.now), tA = arrive(s, 0), tB = arrive(s, FIBER)
  const { hint, next }: { hint: string; next: Mode | null } = (() => {
    if (run.running) return { hint: mode === 'cur' ? '兴奋区刚离开刺激点…' : '亮的一段是兴奋区，膜外负、膜内正…', next: null }
    if (!task) return { hint: '兴奋以电信号沿神经纤维传导，传导方向和膜内电流方向一致。', next: null }
    if (task.id === 'mid') return { hint: '膜外一排正号、膜内一排负号：整段都在静息。按“在中间刺激”', next: 'mid' }
    if (task.id === 'cur') return { hint: '兴奋朝两边同时传到了两端。按“定格看局部电流”', next: 'cur' }
    return { hint: '黄箭头是膜内的电流，蓝箭头是膜外的电流。按“从左端刺激”', next: 'left' }
  })()
  const showA = mode && mode !== 'cur' && ms >= tA - 1e-6 && mode !== 'left', showB = mode && mode !== 'cur' && ms >= tB - 1e-6
  const held = run.held && mode === 'cur'
  const labels: Label[] = [
    { id: 'c0', at: [XA, -1.3, 1.75], ax: 0.5, className: 'scene-name', children: '0 cm' },
    { id: 'c6', at: [XM, -1.3, 1.75], ax: 0.5, className: 'scene-name', children: '6 cm' },
    { id: 'c12', at: [XB, -1.3, 1.75], ax: 0.5, className: 'scene-name', children: '12 cm' },
    ...(showA ? [{ id: 'ta', at: [XA, R + 1.2, 0] as [number, number, number], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>到达</small>{tA.toFixed(1)} ms</> }] : []),
    ...(showB ? [{ id: 'tb', at: [XB, R + 1.2, 0] as [number, number, number], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>到达</small>{tB.toFixed(1)} ms</> }] : []),
    ...(held ? [
      { id: 'lo', at: [XM, R + 2.3, 0.3] as [number, number, number], ax: 0.5, className: 'scene-tag -translate-y-full', children: '膜外：未兴奋部位 → 兴奋部位' },
      { id: 'li', at: [XM, R - TM - 1.25, 0.5] as [number, number, number], ax: 0.5, className: 'scene-tag key', children: '膜内：兴奋部位 → 未兴奋部位' },
      { id: 'dir', at: [XM, -0.2, 1.75] as [number, number, number], ax: 0.5, className: 'scene-tag -translate-y-1/2', children: '传导方向' },
    ] : []),
  ]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="刺激电极"
      stage={<Room at="four" labels={labels}><Scene4 run={run} mode={mode} /></Room>}
      lesson={<LessonBlock no="4" title="兴奋在神经纤维上的传导" concept="兴奋以电信号沿神经纤维双向传导" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>兴奋部位膜外负、膜内正，邻近的未兴奋部位仍然是膜外正、膜内负。兴奋部位和未兴奋部位之间有电位差，于是发生电荷移动，形成<b className="text-white">局部电流</b>。</p>
          <p className="mt-2">局部电流又刺激相近的未兴奋部位发生同样的电位变化，兴奋就这样向前传导，后方恢复为静息电位。</p>
          <p className="mt-2">在膜外，局部电流从未兴奋部位流向兴奋部位；在膜内，从兴奋部位流向未兴奋部位。<b className="text-white">兴奋传导的方向和膜内电流的方向一致。</b></p>
          <p className="mt-2">在离体的神经纤维上，兴奋可以从刺激点向两边传导。兴奋在神经纤维上以电信号的形式传导，这种电信号也叫神经冲动。</p>
        </>} />}
      finale={T.finale && <Finale kicker="三次刺激都做完了" title="兴奋以电信号沿神经纤维双向传导" text={`在中间刺激，兴奋同时到达两端，各用 ${arrive(FIBER / 2, 0).toFixed(1)} ms；从左端刺激，${FIBER} cm 用 ${arrive(0, FIBER).toFixed(1)} ms。传导方向和膜内局部电流的方向一致。`} notes={`画面慢放了很多倍。这根纤维的传导速度按 ${SPEED} m/s 算，是为了好算取的数。`} />}
      panel={
        <Glass className="px-4 py-4">
          <Big label="刺激后" value={run.idle ? '—' : ms.toFixed(1)} unit="ms" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="v" value={String(SPEED)} unit="m/s · 传导速度" />
            <ParamTile symbol="s" value={String(FIBER)} unit="cm · 这段纤维长" />
          </div>
          <H>到达时间</H>
          <div className="flex flex-col gap-1.5">
            <Row wide name="中间 → 左端" text={got.includes('mid') ? `6 cm，${arrive(FIBER / 2, 0).toFixed(1)} ms` : '—'} seen={got.includes('mid')} />
            <Row wide name="中间 → 右端" text={got.includes('mid') ? `6 cm，${arrive(FIBER / 2, FIBER).toFixed(1)} ms` : '—'} seen={got.includes('mid')} />
            <Row wide name="左端 → 右端" text={got.includes('left') ? `12 cm，${arrive(0, FIBER).toFixed(1)} ms` : '—'} seen={got.includes('left')} />
          </div>
          <H>局部电流</H>
          <div className="flex flex-col gap-1.5">
            <Row name={<span style={{ color: '#8fd0ff' }}>膜外</span>} text="未兴奋部位 → 兴奋部位" seen={got.includes('cur')} />
            <Row name={<span style={{ color: '#ffcf5c' }}>膜内</span>} text="兴奋部位 → 未兴奋部位" seen={got.includes('cur')} />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'mid'} pulse={next === 'mid'} onClick={() => go('mid')} disabled={run.running}>在中间刺激</LabButton>
        <LabButton primary={next === 'cur'} pulse={next === 'cur'} onClick={() => go('cur')} disabled={run.running}>定格看局部电流</LabButton>
        <LabButton primary={next === 'left'} pulse={next === 'left'} onClick={() => go('left')} disabled={run.running}>从左端刺激</LabButton>
      </>}
      extras={null}
    />
  )
}
