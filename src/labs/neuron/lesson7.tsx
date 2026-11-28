// 兴奋的传导和传递 · 第 7 课 兴奋还是抑制：两个突触小体贴着同一个神经元，一个放兴奋性递质（后膜 Na⁺ 内流），一个放抑制性递质（后膜 Cl⁻ 内流）。三种情况各传一次，读后膜电位。
import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { lerp, smooth, useRun, type Run } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { PSP, THRESHOLD, postCurve, postV, restV, type PostKey } from './physics'
import { Synapse, newSyn, play, resetSide, type Syn } from './synapse'
import { Big, Chart, Finale, H, Legend, Row, mv } from './ui'
import { VOICE } from './voice'
import { setZones } from './wave'
import { N3X, N3Y, N3_PULSE, POST, PRE, R2, Room, TM } from './world'

const NAME: Record<PostKey, string> = { exc: '只有兴奋性的', inh: '只有抑制性的', both: '两个同时' }
const KEYS: PostKey[] = ['exc', 'inh', 'both']
const TASKS: Task[] = [
  { id: 'exc', text: '让兴奋性的突触小体传来一次兴奋', note: `后膜 Na⁺ 内流，电位升到 ${mv(postV('exc').v)} mV，过了阈电位：兴奋` },
  { id: 'inh', text: '换成抑制性的，再传一次', note: `后膜 Cl⁻ 内流，电位降到 ${mv(postV('inh').v)} mV：更难兴奋` },
  { id: 'both', text: '两个同时传来', note: `一升一降，只到 ${mv(postV('both').v)} mV，没到阈电位：不兴奋` },
]
const T_RUN = 12, T_ARR = 2.5, T_SPIKE = 0.67 * T_RUN

function Scene7({ run, kind, syn }: { run: Run; kind: PostKey; syn: Syn }) {
  useFrame(() => {
    if (run.idle) { resetSide(syn.e); resetSide(syn.i); N3_PULSE.value = 0; setZones([]); return }
    const t = run.ref.current, z: { x: number; w: number; a: number }[] = []
    if (kind !== 'inh') { play(syn.e, t, { t0: T_ARR, clearAt: 9 }); z.push({ x: lerp(PRE - 12, PRE - 2.5, t / T_ARR), w: 1.8, a: smooth(0, 0.3, t) * (1 - smooth(T_ARR + 0.6, T_ARR + 1.6, t)) }) } else resetSide(syn.e)
    if (kind !== 'exc') { play(syn.i, t, { t0: T_ARR, clearAt: 9 }); N3_PULSE.value = smooth(0.4, 1.4, t) * (1 - smooth(T_ARR + 0.6, T_ARR + 1.8, t)) } else { resetSide(syn.i); N3_PULSE.value = 0 }
    if (postV(kind).fires && t > T_SPIKE) z.push({ x: POST + 1 + (t - T_SPIKE) * 5.5, w: 1.8, a: smooth(T_SPIKE, T_SPIKE + 0.3, t) * (1 - smooth(T_RUN - 0.5, T_RUN, t)) })
    setZones(z)
  })
  useEffect(() => () => { setZones([]); N3_PULSE.value = 0 }, [])
  return <Synapse syn={syn} inh />
}

export default function Lesson7() {
  const [kind, setKind] = useState<PostKey>('exc')
  const [got, setGot] = useState<PostKey[]>([])
  const run = useRun(T_RUN)
  const syn = useMemo(newSyn, [])
  const T = useTasks('gewu:neuron:7', TASKS)
  useEffect(() => { if (run.done && !got.includes(kind)) setGot([...got, kind]) }, [run.done])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { T.check(id => got.includes(id as PostKey)) }, [got])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setKind('exc'); setGot([]); run.reset(); T.reset() }
  const task = T.current, u = run.idle ? 0 : run.now / T_RUN, v = postCurve(kind, u), res = postV(kind)
  const { hint, next, want }: { hint: string; next: 'go' | 'kind' | null; want?: PostKey } = (() => {
    if (run.running) return { hint: u < 0.5 ? '兴奋到了突触小体，小泡释放递质…' : kind === 'exc' ? 'Na⁺ 流进后膜，电位上升…' : kind === 'inh' ? 'Cl⁻ 流进后膜，膜内更负了…' : 'Na⁺ 和 Cl⁻ 同时流进后膜…', next: null }
    if (!task) return { hint: '兴奋性递质使下一个神经元兴奋，抑制性递质使它更难兴奋。', next: null }
    if (kind !== task.id) return { hint: task.id === 'inh' ? '后一个神经元兴奋了。换成“只有抑制性的”' : task.id === 'both' ? '后膜电位更低了。换成“两个同时”' : '先选“只有兴奋性的”', next: 'kind', want: task.id as PostKey }
    return { hint: kind === 'exc' ? '左边的突触小体放兴奋性递质，上面的放抑制性递质。按“传来一次兴奋”' : kind === 'inh' ? '这次只让上面那个突触小体兴奋。按“传来一次兴奋”' : '两个突触小体同时兴奋。按“传来一次兴奋”', next: 'go' }
  })()
  const curve = Array.from({ length: 201 }, (_, i) => i / 200).filter(x => x <= (run.idle ? 0 : u) + 1e-9).map(x => [x * 10, postCurve(kind, x)] as [number, number])
  const labels: Label[] = [
    { id: 'e', at: [PRE - 5.6, -3.4, 2], ax: 0.5, className: 'scene-tag', children: '兴奋性突触' },
    { id: 'i', at: [N3X - 3.3, N3Y + 3.4, 0], ax: 1, className: 'scene-tag -translate-y-1/2', children: '抑制性突触' },
    { id: 'v', at: [POST + 4.6, 0.9, 1.2], ax: 0.5, className: 'scene-tag key', children: <><small>后膜电位</small>{mv(v)} mV</> },
    { id: 'na', at: [POST + TM + 0.3, 3.05, 0], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: 'Na⁺ 通道' },
    { id: 'cl', at: [N3X + 1.6, R2 - TM - 0.5, 0], ax: 0, name: true, className: 'scene-name', children: 'Cl⁻ 通道' },
    ...(run.done ? [{ id: 'r', at: [POST + 4.6, -0.3, 1.2] as [number, number, number], ax: 0.5, className: 'scene-tag', children: res.fires ? '产生动作电位' : '没有产生动作电位' }] : []),
  ]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="突触小体"
      stage={<Room at="seven" labels={labels}><Scene7 run={run} kind={kind} syn={syn} /></Room>}
      lesson={<LessonBlock no="7" title="兴奋还是抑制" concept="递质使下一个神经元兴奋或抑制" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>神经递质和突触后膜上的受体结合后，引起突触后膜的电位变化。不同的递质，效果不同：</p>
          <p className="mt-2"><b className="text-white">兴奋性递质</b>使突触后膜对 Na⁺ 的通透性增加，Na⁺ 内流，膜电位升高；升到一定程度（阈电位）就产生动作电位，下一个神经元兴奋。</p>
          <p className="mt-2"><b className="text-white">抑制性递质</b>使突触后膜对 Cl⁻ 的通透性增加，Cl⁻ 内流，膜内更负，离阈电位更远，下一个神经元更难兴奋，这就是抑制。</p>
          <p className="mt-2">一个神经元同时接受许多突触传来的信息，兴奋还是不兴奋，要看它们加在一起的结果。</p>
        </>} />}
      finale={T.finale && <Finale kicker="三种情况都试过了" title="兴奋性递质引起 Na⁺ 内流，抑制性递质引起 Cl⁻ 内流" text={`只有兴奋性的：后膜升到 ${mv(postV('exc').v)} mV，过了阈电位 ${mv(THRESHOLD)} mV，产生动作电位。只有抑制性的：降到 ${mv(postV('inh').v)} mV。两个同时：只到 ${mv(postV('both').v)} mV，不兴奋。`} notes={`一次释放使后膜升 ${PSP.exc} mV、降 ${-PSP.inh} mV 是为了看得清取的数；真实的一次要小得多，要许多个叠加才到阈电位。`} />}
      panel={
        <Glass className="px-4 py-4">
          <Big label="突触后膜的电位" value={mv(v)} unit="mV" />
          <div className="mt-3"><Chart x={[0, 10]} y={[-90, 45]} yTicks={[-70, 0, 30]} xTicks={[]} xLabel="时间（示意）" series={[{ pts: curve, color: kind === 'exc' ? '#ffb62e' : kind === 'inh' ? '#b9f04a' : '#7fe3d4' }]} lines={[{ v: THRESHOLD, label: `阈电位 ${mv(THRESHOLD)}` }]} /></div>
          <H>结果</H>
          <div className="flex flex-col gap-1.5">{KEYS.map(k => { const r = postV(k); return <Row key={k} wide name={NAME[k]} text={got.includes(k) ? `${mv(restV())} → ${mv(r.v)} mV，${r.fires ? '兴奋' : '不兴奋'}` : '—'} on={kind === k} seen={got.includes(k)} /> })}</div>
          <Legend items={['nt', 'nti', 'na', 'cl']} />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={() => run.start()} disabled={run.running}>传来一次兴奋</LabButton>
      </>}
      extras={
        <Control label="哪个突触小体兴奋">
          <Segmented label="哪个突触小体兴奋" pulse={next === 'kind'} want={want ?? null} value={kind} disabled={run.running} onChange={x => { setKind(x as PostKey); run.reset() }} options={KEYS.map(k => ({ value: k, label: NAME[k] }))} />
        </Control>
      }
    />
  )
}
