// 兴奋的传导和传递 · 拓展 药物和毒素卡在哪一步：河豚毒素、肉毒毒素、α-银环蛇毒素、有机磷农药，各试一次，看兴奋断在哪。
import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { clamp, lerp, smooth, useRun, type Run, type V3 } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Stim } from './parts'
import { DRUGS, drug, type DrugKey } from './physics'
import { AT, Synapse, newSyn, play, resetSide, type Syn } from './synapse'
import { Finale, H, Legend, Row } from './ui'
import { VOICE } from './voice'
import { setZones } from './wave'
import { POST, PRE, R, RIM_NA, Room } from './world'

const KEYS = Object.keys(DRUGS) as DrugKey[]
const TASKS: Task[] = KEYS.map(k => ({ id: k, text: `加${DRUGS[k].name}，传一次兴奋`, note: `${DRUGS[k].name}：${DRUGS[k].step}，后一个神经元${DRUGS[k].post === 'lasting' ? '持续兴奋' : '不兴奋'}` }))
const T_RUN = 12.5, T_ARR = 3.2, XS = PRE - 12, T_FIRE = T_ARR + AT.bind + 0.5
const PLUGS = RIM_NA.filter(x => x > PRE - 15 && x < PRE - 8.6)

function SceneX({ run, k, syn }: { run: Run; k: DrugKey; syn: Syn }) {
  const d = drug(k)
  useFrame(() => {
    if (run.idle) { resetSide(syn.e); setZones([]); return }
    const t = run.ref.current, z: { x: number; w: number; a: number }[] = []
    if (!d.ap) { resetSide(syn.e); z.push({ x: XS, w: 0.9, a: 0.45 * smooth(0.5, 0.7, t) * (1 - smooth(0.9, 1.6, t)) }) }
    else {
      z.push({ x: lerp(XS, PRE - 2.5, clamp((t - 0.6) / (T_ARR - 0.6))), w: 1.8, a: smooth(0.5, 0.8, t) * (1 - smooth(T_ARR + 0.6, T_ARR + 1.6, t)) })
      play(syn.e, t, { t0: T_ARR, fuse: d.release, reach: d.bind ? 1 : 0.7, open: d.bind, keep: d.post === 'lasting', clearAt: d.post === 'lasting' ? undefined : 9.5 })
      // 递质一直不被分解：后一个神经元一次接一次地兴奋
      if (d.post === 'lasting') for (const t0 of [T_FIRE, T_FIRE + 1.9, T_FIRE + 3.8]) if (t > t0) z.push({ x: POST + 1 + (t - t0) * 5.5, w: 1.6, a: smooth(t0, t0 + 0.3, t) * (1 - smooth(POST + 15, POST + 20, POST + 1 + (t - t0) * 5.5)) })
    }
    setZones(z)
  })
  useEffect(() => () => setZones([]), [])
  return <group>
    <Synapse syn={syn} toxin={k === 'bgtx'} />
    <Stim tip={[XS, R + 0.02, -0.25]} dir={[0, 1, -0.2]} len={2.8} thick={1.6} flash={() => run.idle ? 0 : clamp(1 - Math.abs(run.ref.current - 0.6) / 0.3)} />
    {k === 'ttx' && PLUGS.map(x => <mesh key={x} position={[x, R + 0.42, 0.02]}><octahedronGeometry args={[0.22, 0]} /><meshStandardMaterial color="#ff5d5d" emissive="#e03131" emissiveIntensity={0.7} roughness={0.35} flatShading /></mesh>)}
  </group>
}

export default function LessonX() {
  const [k, setK] = useState<DrugKey>('ttx')
  const [got, setGot] = useState<DrugKey[]>([])
  const run = useRun(T_RUN)
  const syn = useMemo(newSyn, [])
  const T = useTasks('gewu:neuron:x', TASKS)
  useEffect(() => { if (run.done && !got.includes(k)) setGot([...got, k]) }, [run.done])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { T.check(id => got.includes(id as DrugKey)) }, [got])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setK('ttx'); setGot([]); run.reset(); T.reset() }
  const task = T.current, d = drug(k), t = run.now
  const WATCH: Record<DrugKey, string> = { ttx: '轴突上的 Na⁺ 通道被堵住了…', botox: '兴奋到了突触小体，小泡却融合不了…', bgtx: '递质放出来了，受体却被占着…', op: '递质一直留在间隙里，通道一直开着…' }
  const { hint, next, want }: { hint: string; next: 'go' | 'k' | null; want?: DrugKey } = (() => {
    if (run.running) return { hint: WATCH[k], next: null }
    if (!task) return { hint: '四种药物和毒素，卡在四个不同的步骤上。', next: null }
    if (k !== task.id) return { hint: `换成${DRUGS[task.id as DrugKey].name}`, next: 'k', want: task.id as DrugKey }
    return { hint: `加了${d.name}。按“传来一次兴奋”，看兴奋断在哪一步`, next: 'go' }
  })()
  const after = run.done || (run.running && t > 6)
  const breakAt: Record<DrugKey, V3> = { ttx: [XS + 2.5, R + 1.6, 0], botox: [PRE - 2.4, 4.9, 0], bgtx: [POST + 0.2, 4.2, 0], op: [(PRE + POST) / 2, 4.2, 0] }
  const labels: Label[] = [
    { id: 'pre', at: [PRE - 4.5, -4.9, 2], ax: 0.5, name: true, className: 'scene-name', children: '突触小体' },
    { id: 'n2', at: [POST + 4.5, -4.2, 2], ax: 0.5, name: true, className: 'scene-name', children: '下一个神经元' },
    ...(k === 'ttx' ? [{ id: 'plug', at: [PRE - 10.8, R + 1.0, 0] as V3, ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '河豚毒素堵在 Na⁺ 通道上' }] : []),
    ...(k === 'bgtx' ? [{ id: 'tox', at: [POST + 0.9, 0.2, 1] as V3, ax: 0, name: true, className: 'scene-name', children: '毒素占着受体' }] : []),
    ...(after ? [
      { id: 'brk', at: breakAt[k], ax: 0.5, className: 'scene-tag key -translate-y-full', children: d.step },
      { id: 'res', at: [POST + 2.9, -0.9, 1.5] as V3, ax: 0.5, className: 'scene-tag', children: d.post === 'lasting' ? '持续兴奋' : '不兴奋' },
    ] : []),
  ]
  const yes = (b: boolean) => b ? '有' : '没有'
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="刺激电极"
      stage={<Room at="ext" labels={labels}><SceneX run={run} k={k} syn={syn} /></Room>}
      lesson={<LessonBlock no="拓展" title="药物和毒素卡在哪一步" concept="每一步都可能被药物或毒素卡住" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>兴奋从一个神经元传到下一个，要走好几步：轴突上产生并传导动作电位 → 突触小泡释放递质 → 递质与受体结合 → 递质被降解或回收。哪一步被卡住，传递都会出问题。</p>
          <p className="mt-2"><b className="text-white">河豚毒素</b>堵住 Na⁺ 通道，动作电位产生不了。<b className="text-white">肉毒毒素</b>使突触小泡不能和突触前膜融合，递质放不出来。<b className="text-white">α-银环蛇毒素</b>抢先和突触后膜上的受体结合，递质结合不上。这三种都使下一个细胞不能兴奋，肌肉松弛、麻痹。</p>
          <p className="mt-2"><b className="text-white">有机磷农药</b>抑制分解递质的酶，递质一直留在突触间隙里，下一个细胞持续兴奋，肌肉痉挛。</p>
          <p className="mt-2">兴奋剂和毒品大多也是通过突触起作用的，比如可卡因会使递质不能被回收。珍爱生命，远离毒品。</p>
        </>} />}
      finale={T.finale && <Finale kicker="四种都试过了" title="每一步都可能被卡住" text="河豚毒素卡在动作电位的产生，肉毒毒素卡在递质的释放，α-银环蛇毒素卡在递质和受体的结合，这三种都使后一个神经元不兴奋；有机磷农药让递质不能被分解，后一个神经元持续兴奋。" notes="画面是示意：真实的毒素分子比离子大得多，作用的突触多在神经和肌肉之间。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>这一次（{d.name}）</H>
          <div className="flex flex-col gap-1.5">
            <Row wide name="轴突上的兴奋" text={run.done ? yes(d.ap) : '—'} seen={run.done} />
            <Row wide name="递质释放" text={run.done ? yes(d.release) : '—'} seen={run.done} />
            <Row wide name="和受体结合" text={run.done ? yes(d.bind) : '—'} seen={run.done} />
            <Row wide name="后一个神经元" text={run.done ? (d.post === 'lasting' ? '持续兴奋' : '不兴奋') : '—'} on={run.done} seen={run.done} />
          </div>
          <H>卡在哪一步</H>
          <div className="flex flex-col gap-1.5">{KEYS.map(x => <Row key={x} wide name={DRUGS[x].name} text={got.includes(x) ? DRUGS[x].step : '—'} on={k === x} seen={got.includes(x)} />)}</div>
          <Legend items={['nt', 'na', 'k']} />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={() => run.start()} disabled={run.running}>传来一次兴奋</LabButton>
      </>}
      extras={
        <Control label="药物或毒素">
          <Segmented label="药物或毒素" pulse={next === 'k'} want={want ?? null} value={k} disabled={run.running} onChange={x => { setK(x as DrugKey); run.reset() }} options={KEYS.map(x => ({ value: x, label: DRUGS[x].name }))} />
        </Control>
      }
    />
  )
}
