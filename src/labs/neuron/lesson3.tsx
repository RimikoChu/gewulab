// 兴奋的传导和传递 · 第 3 课 动作电位：受刺激时 Na⁺ 通道打开，Na⁺ 内流，电位上升；随后 K⁺ 通道打开，K⁺ 外流，电位降回去。面板上画出膜电位曲线。
import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { clamp, scatter, smooth, useRun, type Run, type V3 } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Channel, Charges, IonCloud, IonStream, Pump, Stim } from './parts'
import { AP_T, ION, NA_OUT, apPhase, apV, peakV, restV, type NaKey } from './physics'
import { Big, Chart, Finale, H, Legend, Row, mv } from './ui'
import { VOICE } from './voice'
import { setZones } from './wave'
import { COLOR, R, Room, SPOT, TM } from './world'

const X0 = SPOT.three.target.x, YM = R - TM / 2
const TASKS: Task[] = [
  { id: 'na', text: '给一次刺激，看 Na⁺ 往哪边走', note: 'Na⁺ 通道打开，Na⁺ 内流，膜电位上升：外负内正' },
  { id: 'peak', text: '等曲线回到静息，读出峰值', note: `峰值约 ${mv(peakV())} mV；下降是 K⁺ 外流` },
  { id: 'half', text: '把膜外 Na⁺ 减半，再刺激一次', note: '膜外 Na⁺ 少了，Na⁺ 内流变少，峰值变低' },
]
// 慢放：画面上的秒数对应真实的毫秒数。上升和下降放得最慢
const SEG: [number, number][] = [[0, 0], [1.2, AP_T.stim], [4.4, AP_T.peak], [8.2, AP_T.low], [10.4, AP_T.end], [11, 6]]
const T_RUN = 11, T_PEAK = 4.4
const msOf = (t: number) => { for (let i = 1; i < SEG.length; i++) if (t <= SEG[i][0]) return SEG[i - 1][1] + (SEG[i][1] - SEG[i - 1][1]) * (t - SEG[i - 1][0]) / (SEG[i][0] - SEG[i - 1][0]); return 6 }
const NA_CH: V3 = [X0 - 1.5, YM, 0], K_CH: V3 = [X0 + 0.4, YM, 0], PUMP: V3 = [X0 + 2.5, YM, 0]
const curve = (rest: number, peak: number, upto = 6) => Array.from({ length: 121 }, (_, i) => i * 0.05).filter(t => t <= upto + 1e-9).map(t => [t, apV(t, rest, peak)] as [number, number])

function Scene3({ run, na }: { run: Run; na: NaKey }) {
  const c = useMemo(() => ({
    kIn: scatter(10, [X0 - 3.4, 0.15, 0.1], [X0 + 3.4, 1.3, 1.1], 13), naOut: scatter(11, [X0 - 3.4, 2.45, -0.5], [X0 + 3.4, 3.35, 0.9], 15, 0.55),
    naIn: scatter(2, [X0 - 3, 0.3, 0.2], [X0 + 3, 1.2, 1], 16, 1.5), kOut: scatter(2, [X0 - 3, 2.5, -0.3], [X0 + 3, 3.1, 0.8], 17, 1.5),
    xs: [-3.3, -2.5, -0.55, 1.4, 3.4].map(d => X0 + d),
  }), [])
  const ms = () => run.idle ? 0 : msOf(run.ref.current), ph = () => apPhase(ms())
  const rest = restV(), peak = peakV({ ...ION, naOut: NA_OUT[na] })
  useFrame(() => { const v = apV(ms(), rest, peak); setZones([{ x: X0, w: 6, a: smooth(-45, -5, v) }]) })
  useEffect(() => () => setZones([]), [])
  return <group>
    <Channel at={NA_CH} color={COLOR.naCh} open={() => smooth(AP_T.stim, AP_T.stim + 0.08, ms()) * (1 - smooth(AP_T.peak - 0.03, AP_T.peak + 0.1, ms()))} />
    <Channel at={K_CH} color={COLOR.kCh} open={() => smooth(AP_T.peak - 0.05, AP_T.peak + 0.15, ms()) * (1 - smooth(AP_T.low - 0.1, AP_T.low + 0.5, ms()))} />
    <Pump at={PUMP} color={COLOR.pump} />
    <IonStream path={[[NA_CH[0] - 0.5, 3.1, 0.3], [NA_CH[0], 2.35, 0.06], [NA_CH[0], 1.35, 0.06], [NA_CH[0] + 0.5, 0.6, 0.4]]} color={COLOR.na} on={() => ph() === 'rise' && ms() > AP_T.stim + 0.05} n={na === 'half' ? 3 : 5} speed={0.5} />
    <IonStream path={[[K_CH[0] - 0.5, 0.6, 0.4], [K_CH[0], 1.35, 0.06], [K_CH[0], 2.35, 0.06], [K_CH[0] + 0.5, 3.1, 0.3]]} color={COLOR.k} on={() => ph() === 'fall' && ms() > AP_T.peak + 0.1} n={4} speed={0.45} />
    {/* 钠钾泵一直在慢慢地干活：送 Na⁺ 出去，接 K⁺ 回来 */}
    <IonStream path={[[PUMP[0] - 0.6, 0.7, 0.4], [PUMP[0] - 0.12, 1.3, 0.3], [PUMP[0] - 0.12, 2.4, 0.3], [PUMP[0] - 0.6, 3.0, 0.4]]} color={COLOR.na} on={() => true} n={2} speed={0.16} />
    <IonStream path={[[PUMP[0] + 0.7, 3.0, 0.4], [PUMP[0] + 0.14, 2.4, 0.32], [PUMP[0] + 0.14, 1.3, 0.32], [PUMP[0] + 0.7, 0.7, 0.4]]} color={COLOR.k} on={() => true} n={1} speed={0.16} />
    <IonCloud at={c.kIn} color={COLOR.k} /><IonCloud at={c.kOut} color={COLOR.k} />
    <IonCloud at={c.naOut} color={COLOR.na} show={na === 'half' ? 0.5 : 1} /><IonCloud at={c.naIn} color={COLOR.na} />
    <Charges xs={c.xs} yOut={R + 0.3} yIn={R - TM - 0.3} />
    <Stim tip={[X0 - 3.0, R + 0.02, 0.05]} dir={[-0.25, 1, 0.1]} len={1.9} flash={() => { const t = run.idle ? 9 : run.ref.current; return clamp(1 - Math.abs(t - 1.2) / 0.35) }} />
  </group>
}

export default function Lesson3() {
  const [na, setNa] = useState<NaKey>('normal')
  const [got, setGot] = useState<NaKey[]>([])
  const run = useRun(T_RUN)
  const T = useTasks('gewu:neuron:3', TASKS)
  const rest = restV(), peak = peakV({ ...ION, naOut: NA_OUT[na] })
  const ms = run.idle ? 0 : msOf(run.now), v = apV(ms, rest, peak), ph = apPhase(ms)
  useEffect(() => { if (run.done && !got.includes(na)) setGot([...got, na]) }, [run.done])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { T.check(id => id === 'na' ? (na === 'normal' && run.now >= T_PEAK) || got.includes('normal') : id === 'peak' ? got.includes('normal') : got.includes('half')) }, [run.now >= T_PEAK, got])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setNa('normal'); setGot([]); run.reset(); T.reset() }
  const task = T.current
  const { hint, next, want }: { hint: string; next: 'stim' | 'na' | null; want?: NaKey } = (() => {
    if (run.running) return {
      hint: ph === 'rest' ? (ms < AP_T.stim ? '刺激电极放电…' : '回到静息电位了…') : ph === 'rise' ? 'Na⁺ 通道打开，Na⁺ 涌进膜内，电位上升…' : ph === 'fall' ? 'Na⁺ 通道关了，K⁺ 通道打开，K⁺ 流出去，电位下降…' : '钠钾泵把 Na⁺ 送出去、把 K⁺ 接回来…', next: null,
    }
    if (!task) return { hint: '上升是 Na⁺ 内流，下降是 K⁺ 外流。', next: null }
    if (task.id !== 'half') return na === 'normal' ? { hint: '膜处在静息状态：外正内负。按“给一次刺激”', next: 'stim' } : { hint: '先把膜外 Na⁺ 换回正常', next: 'na', want: 'normal' }
    if (na !== 'half') return { hint: `峰值是 ${mv(peakV())} mV。把膜外 Na⁺ 减半`, next: 'na', want: 'half' }
    return { hint: '膜外的 Na⁺ 少了一半。再按“给一次刺激”', next: 'stim' }
  })()
  const labels: Label[] = [
    { id: 'out', at: [X0 + 3.3, 2.85, 0], ax: 1, className: 'scene-tag -translate-y-1/2', children: '膜外' },
    { id: 'in', at: [X0 + 3.3, 1.0, 0.2], ax: 1, className: 'scene-tag -translate-y-1/2', children: '膜内' },
    { id: 'v', at: [X0 - 0.55, 0.55, 0.9], ax: 0.5, className: 'scene-tag key', children: <><small>膜电位</small>{mv(v)} mV</> },
    { id: 'na', at: [NA_CH[0], YM + 0.8, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: 'Na⁺ 通道' },
    { id: 'k', at: [K_CH[0], YM + 0.8, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: 'K⁺ 通道' },
    { id: 'p', at: [PUMP[0], YM + 0.9, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '钠钾泵' },
  ]
  const normalDone = got.includes('normal')
  const series = [
    ...(na === 'half' && normalDone ? [{ pts: curve(rest, peakV()), color: '#ffffff', faint: true }] : []),
    { pts: curve(rest, peak, run.idle ? 0 : ms), color: na === 'half' ? '#ffb62e' : '#7fe3d4' },
  ]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="刺激电极"
      stage={<Room at="three" labels={labels}><Scene3 run={run} na={na} /></Room>}
      lesson={<LessonBlock no="3" title="动作电位" concept="受刺激时 Na⁺ 内流，膜外负、膜内正" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>神经纤维某一部位受到刺激时，细胞膜对 Na⁺ 的通透性增加，<b className="text-white">Na⁺ 内流</b>，这个部位的膜两侧出现暂时性的电位变化，表现为<b className="text-white">内正外负</b>的兴奋状态，这就是动作电位。</p>
          <p className="mt-2">随后 Na⁺ 通道关闭、K⁺ 通道打开，K⁺ 外流，膜电位降回静息水平。Na⁺ 内流和 K⁺ 外流都是顺浓度梯度、经通道蛋白进行的，不消耗能量（协助扩散）。</p>
          <p className="mt-2"><b className="text-white">钠钾泵</b>把流进来的 Na⁺ 送出去、把流出去的 K⁺ 接回来，是逆浓度梯度的，要消耗能量（主动运输）。它维持着膜内外的浓度差。</p>
        </>} />}
      finale={T.finale && <Finale kicker="两条曲线都画出来了" title="动作电位：上升是 Na⁺ 内流，下降是 K⁺ 外流" text={`正常时峰值约 ${mv(peakV())} mV。膜外 Na⁺ 减半，流进来的 Na⁺ 少了，峰值降到约 ${mv(peakV({ ...ION, naOut: NA_OUT.half }))} mV；静息电位没有变。`} notes="画面慢放了很多倍：真实的一次动作电位只有几毫秒。离子和通道的大小、数量是示意。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label="膜电位" value={mv(v)} unit="mV" />
          <div className="mt-3"><Chart x={[0, 6]} y={[-95, 50]} yTicks={[-70, 0, 30]} xTicks={[0, 1, 2, 3, 4, 5, 6]} series={series} dot={run.running ? [ms, v] : null} /></div>
          <H>现在膜上</H>
          <div className="flex flex-col gap-1.5">
            <Row wide name="Na⁺ 通道" text={run.running && ph === 'rise' ? '开，Na⁺ 内流' : '关'} on={run.running && ph === 'rise'} />
            <Row wide name="K⁺ 通道" text={run.running && ph === 'fall' ? '开，K⁺ 外流' : '关'} on={run.running && ph === 'fall'} />
          </div>
          <H>峰值</H>
          <div className="flex flex-col gap-1.5">
            <Row wide name={`Na⁺ ${NA_OUT.normal}`} text={normalDone ? `${mv(peakV())} mV` : '—'} seen={normalDone} />
            <Row wide name={`Na⁺ ${NA_OUT.half}`} text={got.includes('half') ? `${mv(peakV({ ...ION, naOut: NA_OUT.half }))} mV` : '—'} seen={got.includes('half')} />
          </div>
          <Legend items={['na', 'k']} />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'stim'} onClick={() => run.start()} disabled={run.running}>给一次刺激</LabButton>
      </>}
      extras={
        <Control label="膜外 Na⁺ 浓度">
          <Segmented label="膜外 Na⁺ 浓度" pulse={next === 'na'} want={want ?? null} value={na} disabled={run.running} onChange={x => { setNa(x as NaKey); run.reset() }} options={[{ value: 'normal', label: `正常 ${NA_OUT.normal}` }, { value: 'half', label: `减半 ${NA_OUT.half}` }]} />
        </Control>
      }
    />
  )
}
