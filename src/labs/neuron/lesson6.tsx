// 兴奋的传导和传递 · 第 6 课 突触怎样传递：兴奋到达突触小体，突触小泡把神经递质放进突触间隙，递质和突触后膜上的受体结合，后一个神经元兴奋。反过来刺激传不回来。
import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { clamp, lerp, smooth, useRun, type Run, type V3 } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Stim } from './parts'
import { DELAY, delayDistance, synapse } from './physics'
import { AT, E_Y, Synapse, newSyn, play, resetSide, type Syn } from './synapse'
import { Big, Finale, H, Legend, Row } from './ui'
import { VOICE } from './voice'
import { setZones } from './wave'
import { POST, PRE, R2, Room, TM } from './world'

const TASKS: Task[] = [
  { id: 'go', text: '传来一次兴奋，看信号怎样变', note: '电信号 → 化学信号 → 电信号' },
  { id: 'clear', text: '看递质的去向', note: '递质起作用后被降解或回收，不会一直结合在受体上' },
  { id: 'back', text: '刺激后一个神经元，看能不能传回来', note: '传不回来：兴奋在神经元之间只能单向传递' },
]
const T_GO = 12.5, T_CLR = 2.6, T_BACK = 5.5, T_ARR = 3, T_FIRE = T_ARR + AT.bind + 0.5
const XS = POST + 7

function Scene6({ go, clr, back, syn }: { go: Run; clr: Run; back: Run; syn: Syn }) {
  useFrame(() => {
    const z: { x: number; w: number; a: number }[] = []
    if (go.idle) resetSide(syn.e)
    else {
      const t = go.ref.current
      play(syn.e, t, { t0: T_ARR })
      if (!clr.idle) { syn.e.clear = smooth(0, T_CLR - 0.4, clr.ref.current); syn.e.open *= 1 - syn.e.clear }
      z.push({ x: lerp(PRE - 14, PRE - 2.5, t / T_ARR), w: 1.8, a: smooth(0, 0.3, t) * (1 - smooth(T_ARR + 0.6, T_ARR + 1.6, t)) })
      if (t > T_FIRE) z.push({ x: POST + 1 + (t - T_FIRE) * 4.5, w: 1.8, a: smooth(T_FIRE, T_FIRE + 0.4, t) * (1 - smooth(T_GO - 0.6, T_GO, t)) })
    }
    if (back.running) { const t = back.ref.current, d = Math.max(0, t - 0.8) * 4; z.push({ x: XS + d, w: 1.6, a: smooth(0.8, 1.1, t) }, { x: Math.max(POST + 1.2, XS - d), w: 1.6, a: smooth(0.8, 1.1, t) * (1 - smooth(2.6, 4.4, t)) }) }
    setZones(z)
  })
  useEffect(() => () => setZones([]), [])
  return <group>
    <Synapse syn={syn} />
    {!back.idle && <Stim tip={[XS, R2 + 0.02, -0.2]} dir={[0.1, 1, -0.15]} len={2.4} thick={1.3} flash={() => clamp(1 - Math.abs(back.ref.current - 0.8) / 0.3)} />}
  </group>
}

export default function Lesson6() {
  const go = useRun(T_GO), clr = useRun(T_CLR), back = useRun(T_BACK)
  const syn = useMemo(newSyn, [])
  const T = useTasks('gewu:neuron:6', TASKS)
  useEffect(() => { T.check(id => id === 'go' ? go.done : id === 'clear' ? clr.done : back.done) }, [go.done, clr.done, back.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { go.reset(); clr.reset(); back.reset(); resetSide(syn.e); T.reset() }
  const busy = go.running || clr.running || back.running, task = T.current, t = go.now
  const stage = go.idle ? 0 : t < T_ARR ? 1 : t < T_ARR + AT.release ? 2 : t < T_ARR + AT.bind ? 3 : 4
  const { hint, next }: { hint: string; next: 'go' | 'clear' | 'back' | null } = (() => {
    if (go.running) return { hint: ['', '电信号沿着轴突传到了突触小体…', '突触小泡移向突触前膜，和它融合…', '神经递质放进突触间隙，扩散到突触后膜…', '递质和受体结合，通道打开，Na⁺ 内流，后一个神经元兴奋…'][stage], next: null }
    if (clr.running) return { hint: '递质离开受体，被降解或回收…', next: null }
    if (back.running) return { hint: '兴奋朝两边传，传到突触后膜…', next: null }
    if (!task) return { hint: '递质只能由突触前膜释放，作用于突触后膜。', next: null }
    if (task.id === 'go') return { hint: '左边是突触小体，右边是下一个神经元。按“传来一次兴奋”', next: 'go' }
    if (task.id === 'clear') return { hint: '递质还结合在受体上。按“看递质的去向”', next: 'clear' }
    return { hint: '间隙里的递质清掉了，通道也关了。按“刺激后一个神经元”，看能不能传回来', next: 'back' }
  })()
  const tag = (id: string, at: V3, text: string, on: boolean): Label[] => on ? [{ id, at, ax: 0.5, className: 'scene-tag key -translate-y-full', children: text }] : []
  const labels: Label[] = [
    { id: 'ves', at: [PRE - 3.3, 3.3, 0.3], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '突触小泡' },
    { id: 'pre', at: [PRE - TM / 2, -0.25, 0.2], ax: 1, className: 'scene-tag translate-y-1', children: '突触前膜' },
    { id: 'post', at: [POST + TM / 2, -0.25, 0.2], ax: 0, className: 'scene-tag translate-y-1', children: '突触后膜' },
    { id: 'gap', at: [(PRE + POST) / 2, 3.75, 0], ax: 0.5, className: 'scene-tag -translate-y-full', children: '突触间隙' },
    { id: 'rec', at: [POST + TM + 0.25, E_Y[2] + 0.45, 0], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '受体' },
    ...tag('s1', [PRE - 4.2, 5.0, 0], '电信号', stage >= 1 && !back.running),
    ...tag('s2', [(PRE + POST) / 2, 4.75, 0], '化学信号', stage >= 3 && !back.running && clr.idle),
    ...tag('s3', [POST + 3.6, 4.4, 0], '电信号', stage >= 4 && go.now > T_FIRE && !back.running),
    ...(back.done || (back.running && back.now > 3) ? [{ id: 'no', at: [PRE - 3, 5.0, 0] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: '没有兴奋' }] : []),
  ]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="突触"
      stage={<Room at="six" labels={labels}><Scene6 go={go} clr={clr} back={back} syn={syn} /></Room>}
      lesson={<LessonBlock no="6" title="突触怎样传递" concept="电信号 → 化学信号 → 电信号，单向传递" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>神经元的轴突末梢膨大成<b className="text-white">突触小体</b>，和另一个神经元的细胞体或树突相接近，共同形成突触。突触由<b className="text-white">突触前膜、突触间隙、突触后膜</b>组成。</p>
          <p className="mt-2">神经冲动传到突触小体时，突触小泡向突触前膜移动并与它融合，释放神经递质；递质经扩散通过突触间隙，与突触后膜上的受体结合，突触后膜上的离子通道发生变化，引发电位变化。</p>
          <p className="mt-2">递质随后与受体分开，被降解或回收。由于神经递质只存在于突触小泡中，<b className="text-white">只能由突触前膜释放，作用于突触后膜</b>，所以兴奋在神经元之间只能单向传递。</p>
          <p className="mt-2">递质的释放、扩散和结合都要时间，所以兴奋过突触比在神经纤维上传导慢。</p>
        </>} />}
      finale={T.finale && <Finale kicker="正着传过去了，反着传不回来" title="突触：电信号 → 化学信号 → 电信号，单向传递" text={`神经递质只能由突触前膜释放、作用于突触后膜，所以只能单向传递。过一次突触大约要 ${DELAY} ms，同样的时间兴奋在这根纤维上能走 ${delayDistance()} cm。`} notes="画面慢放了很多倍；小泡、递质、受体的大小和数量是示意，突触间隙画宽了。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label="过一次突触（突触延搁）" value={go.done ? `约 ${DELAY}` : '—'} unit="ms" />
          <div className="mt-4 grid grid-cols-1 gap-2"><ParamTile symbol="同样的时间" value={go.done ? String(delayDistance()) : '—'} unit="cm · 兴奋在这根纤维上能走这么远" /></div>
          <H>信号的变化</H>
          <div className="flex flex-col gap-1.5">
            <Row name="电信号" text="兴奋沿轴突传到突触小体" on={go.running && stage === 1} seen={stage >= 1} />
            <Row name="化学信号" text="递质释放、扩散、与受体结合" on={go.running && (stage === 2 || stage === 3)} seen={stage >= 2} />
            <Row name="电信号" text="后膜 Na⁺ 内流，产生兴奋" on={go.running && stage === 4} seen={stage >= 4} />
          </div>
          <H>能不能传过去</H>
          <div className="flex flex-col gap-1.5">
            <Row name="前 → 后" text={go.done ? (synapse('pre').crosses ? '能' : '不能') : '—'} seen={go.done} />
            <Row name="后 → 前" text={back.done ? (synapse('post').crosses ? '能' : '不能：突触后膜放不出递质') : '—'} seen={back.done} />
          </div>
          <Legend items={['nt', 'na', 'k']} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={() => { clr.reset(); back.reset(); go.start() }} disabled={busy}>传来一次兴奋</LabButton>
        <LabButton primary={next === 'clear'} pulse={next === 'clear'} onClick={() => clr.start()} disabled={busy || !go.done || !clr.idle}>看递质的去向</LabButton>
        <LabButton primary={next === 'back'} pulse={next === 'back'} onClick={() => back.start()} disabled={busy}>刺激后一个神经元</LabButton>
      </>}
      extras={null}
    />
  )
}
