// 兴奋的传导和传递 · 第 2 课 静息电位：膜上的 K⁺ 通道开着，K⁺ 外流；把玻璃微电极插进膜内，电表读到膜内比膜外低约 70 mV。
import { useEffect, useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { lerp, scatter, type V3 } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Channel, Charges, IonCloud, IonStream, Meter, POSTS, Pipette, Probe, Wire } from './parts'
import { ION, K_OUT, meterV, nernst, type KKey } from './physics'
import { Big, Finale, H, Legend, Row, mv } from './ui'
import { VOICE } from './voice'
import { COLOR, R, Room, SPOT, TM } from './world'

const X0 = SPOT.two.target.x, YM = R - TM / 2
const TASKS: Task[] = [
  { id: 'out', text: '两个电极都放在膜外，记一次', note: '两个电极都在膜外：0 mV，膜外各处没有电位差' },
  { id: 'in', text: '把玻璃微电极插进膜内，记一次', note: `膜内比膜外低约 ${-Math.round(meterV(true, 'normal'))} mV：外正内负` },
  { id: 'high', text: '把膜外 K⁺ 提高到 10 mmol/L，再记一次', note: '膜外 K⁺ 多了，K⁺ 外流变少，静息电位的绝对值变小' },
]
const CH: V3 = [X0 + 0.7, YM, 0]
const METER: V3 = [X0 + 2.3, 4.0, -0.5], MS = 0.82
const post = (i: number): V3 => [METER[0] + POSTS[i][0] * MS, METER[1] + POSTS[i][1] * MS, METER[2] + POSTS[i][2] * MS]
const PIP_DIR: V3 = [-0.2, 1, 0.04], PIP_LEN = 2.5, REF_TIP: V3 = [X0 - 2.7, 2.34, 0.1], REF_DIR: V3 = [-0.25, 1, 0]

function Scene2({ p, k }: { p: number; k: KKey }) {
  const c = useMemo(() => ({
    kIn: scatter(11, [X0 - 3.6, 0.15, 0.1], [X0 + 3.6, 1.35, 1.1], 3), kOut: scatter(4, [X0 - 0.4, 2.5, -0.4], [X0 + 3.4, 3.1, 0.9], 4, 0.7),
    naOut: scatter(10, [X0 - 3.6, 2.45, -0.5], [X0 + 3.6, 3.3, 0.9], 5, 0.6), naIn: scatter(2, [X0 - 3, 0.3, 0.2], [X0 + 3, 1.2, 1], 6, 1.5),
    xs: [-3.4, -2.6, -1.9, -0.6, 0.0, 1.5, 2.3, 3.1].map(d => X0 + d),
  }), [])
  const tip: V3 = [X0 - 1.25, lerp(2.42, 1.12, p), 0.03]
  const l = Math.hypot(...PIP_DIR), tail: V3 = [tip[0] + PIP_DIR[0] / l * (PIP_LEN + 0.25), tip[1] + PIP_DIR[1] / l * (PIP_LEN + 0.25), tip[2] + PIP_DIR[2] / l * (PIP_LEN + 0.25)]
  const rl = Math.hypot(...REF_DIR), rtail: V3 = [REF_TIP[0] + REF_DIR[0] / rl * 1.9, REF_TIP[1] + REF_DIR[1] / rl * 1.9, REF_TIP[2]]
  const a = post(0), b = post(1)
  return <group>
    <Channel at={CH} color={COLOR.kCh} open={1} />
    <IonStream path={[[CH[0] - 0.5, 0.75, 0.3], [CH[0], 1.35, 0.06], [CH[0], 2.3, 0.06], [CH[0] + 0.45, 3.0, 0.3]]} color={COLOR.k} on={() => true} n={3} speed={k === 'high' ? 0.13 : 0.24} />
    <IonCloud at={c.kIn} color={COLOR.k} />
    <IonCloud at={c.kOut} color={COLOR.k} show={k === 'high' ? 1 : 0.5} />
    <IonCloud at={c.naOut} color={COLOR.na} />
    <IonCloud at={c.naIn} color={COLOR.na} />
    <Charges xs={c.xs} yOut={R + 0.3} yIn={R - TM - 0.3} />
    <Pipette tip={() => tip} dir={PIP_DIR} len={PIP_LEN} />
    <Probe tip={REF_TIP} dir={REF_DIR} len={1.9} />
    <Meter position={METER} rotation={[-0.06, -0.12, 0]} scale={MS} ticks={['−100', '−50', '0', '+50', '+100']} unit="mV" value={() => meterV(p >= 1, k) / 100} />
    <Wire pts={[tail, [tail[0] + 0.25, tail[1] + 0.55, tail[2] - 0.3], [a[0] - 1.5, a[1] + 1.1, -1.0], [a[0] - 0.75, a[1] - 0.1, -0.8], [a[0] - 0.2, a[1] - 0.42, a[2] - 0.2], [a[0], a[1] - 0.14, a[2]]]} color="#b3261e" />
    <Wire pts={[rtail, [rtail[0] + 0.2, rtail[1] + 1.2, rtail[2] - 0.5], [X0 - 0.6, 5.6, -1.2], [b[0] + 0.3, b[1] + 2.5, -1.2], [b[0] + 0.75, b[1] + 0.2, -0.8], [b[0] + 0.2, b[1] - 0.42, b[2] - 0.2], [b[0], b[1] - 0.14, b[2]]]} />
  </group>
}

export default function Lesson2() {
  const [ins, setIns] = useState(false)
  const [k, setK] = useState<KKey>('normal')
  const [rows, setRows] = useState<string[]>([])
  const p = useSlide(ins ? 1 : 0, 1.1), settled = p === (ins ? 1 : 0)
  const T = useTasks('gewu:neuron:2', TASKS)
  const key = !ins ? 'out' : k === 'normal' ? 'in' : 'high'
  const v = meterV(ins && settled, k), dup = rows.includes(key)
  const record = () => { if (!settled || dup) return; setRows([...rows, key]) }
  useEffect(() => { T.check(id => rows.includes(id)) }, [rows])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setIns(false); setK('normal'); setRows([]); T.reset() }
  const task = T.current
  const { hint, next, want }: { hint: string; next: 'ins' | 'rec' | 'k' | null; want?: KKey } = (() => {
    if (!task) return { hint: '静息时 K⁺ 外流，膜外正、膜内负。', next: null }
    if (!settled) return { hint: ins ? '微电极穿过细胞膜…' : '微电极退出来…', next: null }
    if (task.id === 'out') return ins ? { hint: '先把微电极拔出来，两个电极都放在膜外', next: 'ins' } : { hint: '两个电极都在膜外。按“记录读数”', next: 'rec' }
    if (task.id === 'in') {
      if (k !== 'normal') return { hint: '先把膜外 K⁺ 换回 5 mmol/L', next: 'k', want: 'normal' }
      return ins ? { hint: '指针偏到了负的一边。按“记录读数”', next: 'rec' } : { hint: '按“插进膜内”，把玻璃微电极扎进膜里', next: 'ins' }
    }
    if (k !== 'high') return { hint: '把膜外 K⁺ 换成 10 mmol/L，看 K⁺ 外流有什么变化', next: 'k', want: 'high' }
    return ins ? { hint: '膜外 K⁺ 多了，K⁺ 流出去的少了。再按“记录读数”', next: 'rec' } : { hint: '按“插进膜内”，再测一次', next: 'ins' }
  })()
  const labels: Label[] = [
    { id: 'out', at: [X0 - 3.5, 2.75, 0], ax: 0, className: 'scene-tag -translate-y-1/2', children: '膜外' },
    { id: 'in', at: [X0 - 3.5, 1.2, 0.2], ax: 0, className: 'scene-tag -translate-y-1/2', children: '膜内' },
    { id: 'v', at: [METER[0] + 1.15, METER[1] + 0.2, METER[2]], ax: 0, className: 'scene-tag key translate-x-2 -translate-y-1/2', children: settled ? `${mv(v)} mV` : '…' },
    { id: 'ch', at: [CH[0] + 0.5, YM + 0.75, 0], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: 'K⁺ 通道（开着）' },
    { id: 'pip', at: [X0 - 1.9, 3.6, 0], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '玻璃微电极' },
    { id: 'ref', at: [REF_TIP[0] - 0.5, 3.3, 0], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '参考电极' },
  ]
  const REC: [string, string, number][] = [['out', '都在膜外', meterV(false, 'normal')], ['in', '一个在膜内', meterV(true, 'normal')], ['high', '膜外 K⁺ 10', meterV(true, 'high')]]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="微电极和电表"
      stage={<Room at="two" labels={labels}><Scene2 p={p} k={k} /></Room>}
      lesson={<LessonBlock no="2" title="静息电位" concept="静息时 K⁺ 外流，膜外正、膜内负" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>神经细胞内 K⁺ 浓度明显高于膜外，而 Na⁺ 浓度比膜外低。静息时，膜主要对 K⁺ 有通透性，<b className="text-white">K⁺ 外流</b>，使膜外阳离子浓度高于膜内，膜两侧的电位表现为<b className="text-white">外正内负</b>，这就是静息电位。</p>
          <p className="mt-2">K⁺ 顺着浓度梯度、经通道蛋白流出去，不消耗能量，属于协助扩散。</p>
          <p className="mt-2">只让 K⁺ 通过时，膜电位会停在 K⁺ 的平衡电位（按这里的浓度算约 {mv(nernst(ION.kOut, ION.kIn))} mV）。实际的静息电位略高一些，因为还有少量 Na⁺ 漏进来。</p>
        </>} />}
      finale={T.finale && <Finale kicker="三次读数都记下了" title="静息电位：K⁺ 外流，外正内负" text={`膜内比膜外低约 ${-Math.round(meterV(true, 'normal'))} mV。膜外 K⁺ 从 ${K_OUT.normal} 提高到 ${K_OUT.high} mmol/L，K⁺ 外流减少，读数变成 ${mv(meterV(true, 'high'))} mV，绝对值变小了。`} notes="模型放大了很多倍，离子和通道的大小、数量是示意；浓度是神经细胞的典型值。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label="电表读数" value={settled ? mv(v) : '…'} unit="mV" />
          <H>离子浓度（约，mmol/L）</H>
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="K⁺ 膜外" value={String(K_OUT[k])} unit="mmol/L" />
            <ParamTile symbol="Na⁺ 膜外" value={String(ION.naOut)} unit="mmol/L" />
            <ParamTile symbol="K⁺ 膜内" value={String(ION.kIn)} unit="mmol/L" />
            <ParamTile symbol="Na⁺ 膜内" value={String(ION.naIn)} unit="mmol/L" />
          </div>
          <H>记录</H>
          <div className="flex flex-col gap-1.5">{REC.map(([id, name, val]) => <Row key={id} wide name={name} text={rows.includes(id) ? `${mv(val)} mV` : '—'} on={key === id && settled} seen={rows.includes(id)} />)}</div>
          <Legend items={['k', 'na']} />
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'ins'} onClick={() => setIns(i => !i)} disabled={!settled}>{ins ? '拔出来' : '插进膜内'}</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={!settled || dup}>记录读数</LabButton>
      </>}
      extras={
        <Control label="膜外 K⁺ 浓度">
          <Segmented label="膜外 K⁺ 浓度" pulse={next === 'k'} want={want ?? null} value={k} onChange={x => setK(x as KKey)} options={[{ value: 'normal', label: `${K_OUT.normal} mmol/L` }, { value: 'high', label: `${K_OUT.high} mmol/L` }]} />
        </Control>
      }
    />
  )
}
