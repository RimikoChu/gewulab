// 欧姆定律 · 第 2 课 电流与电阻的关系：后墙中间的工作台。同一套电路，三只定值电阻 5 Ω、10 Ω、20 Ω 放在台子前面。
// 每次换一只电阻接进电路（先断开开关，换好再闭合），电压表的示数会变；移动滑片把电压调回 2.0 V，再记电流。最后连成 I–R 图像。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, LabButton, LabShell, LessonBlock, ParamTile, Segmented, Glass, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { L2, U0, loop, ohmI, ohmU, pForU, readA, readV, rheoR, type R2 } from './physics'
import { POS, Rig } from './rig'
import { Boards, PartsTray, type Item } from './swap'
import { f1, f2, useRun, useSettled, useTween } from './parts'
import { Chart, Readout, Table } from './views'
import { Bench, Place, toWorld } from './world'
import { add, sliderX } from './gear'

const TASKS: Task[] = [
  { id: '5', text: '接 5 Ω，调到 2.0 V，记下电流', note: '5 Ω：0.40 A' },
  { id: '10', text: '换成 10 Ω，调回 2.0 V，记下电流', note: '电阻变成 2 倍，电流变成一半：0.20 A' },
  { id: '20', text: '换成 20 Ω，调回 2.0 V，记下电流', note: '电阻再变成 2 倍，电流又变成一半：0.10 A' },
  { id: 'draw', text: '把三个点连起来，看 I–R 图像', note: '电流随电阻增大而减小' },
]
const ITEMS: Item[] = [
  { key: '5', tag: 'R = 5 Ω', print: ['5W', '5ΩJ'], home: [-20, 0.4, 26] },
  { key: '10', tag: 'R = 10 Ω', print: ['5W', '10ΩJ'], home: [-4, 0.4, 26] },
  { key: '20', tag: 'R = 20 Ω', print: ['5W', '20ΩJ'], home: [12, 0.4, 26] },
]
const W = (p: [number, number, number]) => toWorld('l2', p)

export default function Lesson2() {
  const [on, setOn] = useState(false)
  const [r, setR] = useState<R2>(5)
  const [from, setFrom] = useState<R2 | null>(null)
  const [rows, setRows] = useState<{ r: R2; u: number; i: number }[]>([])
  const [drawn, setDrawn] = useState(false)
  const [dragged, setDragged] = useState(false)
  const T = useTasks('gewu:ohm:2', TASKS)
  const p = useTween(1, 0.32)
  const knife = useSlide(on ? 1 : 0, 2.6), live = knife > 0.99
  const swap = useRun(1.8, () => { setFrom(null); setOn(true) })
  const c = loop(r, rheoR(p.x)), uR = readV(c.U), iR = readA(c.I)
  const settled = useSettled(`${on}${r}${p.x.toFixed(4)}`, 1300) && live && !p.moving
  const targetR = L2.Rs.find(x => !rows.some(q => q.r === x))
  const done = (x: R2) => rows.some(q => q.r === x)
  const atU = Math.abs(uR - L2.U) < 1e-6
  const pick = (x: R2) => { if (x === r || swap.busy) return; setOn(false); setFrom(r); setR(x); setTimeout(() => swap.run(), 500) }
  const record = () => {
    if (!settled || !atU || done(r)) return
    const n = [...rows, { r, u: uR, i: iR }]; setRows(n)
    T.check(id => id !== 'draw' && n.some(q => String(q.r) === id))
  }
  const draw = () => { if (targetR !== undefined) return; setDrawn(true); T.check(id => id === 'draw') }
  const resetAll = () => { setOn(false); setR(5); setFrom(null); swap.snap(0); p.snap(1); setRows([]); setDrawn(false); setDragged(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'switch' | 'pick' | 'goto' | 'record' | 'draw' | null } = !task ? { hint: '电压一定时，通过导体的电流与导体的电阻成反比。', next: null }
    : swap.busy || from !== null ? { hint: '断开开关，换电阻…', next: null }
    : targetR !== undefined && r !== targetR && rows.length > 0 ? { hint: `换成 ${targetR} Ω 的电阻`, next: 'pick' }
    : !on ? { hint: '闭合开关前，滑片已经放在阻值最大的一端。闭合开关', next: 'switch' }
    : !live ? { hint: '合上开关…', next: null }
    : p.moving ? { hint: '移动滑片，电压表的示数在变…', next: null }
    : targetR === undefined ? { hint: '三组都记好了。把三个点连起来', next: 'draw' }
    : !settled ? { hint: '等指针停稳…', next: null }
    : atU ? { hint: `电压是 2.0 V。读电流表，按“记录数据”：${f2(iR)} A`, next: 'record' }
    : rows.length > 0 && uR > L2.U ? { hint: `换了电阻，电压表变成 ${f1(uR)} V。把电压调回 2.0 V`, next: 'goto' }
    : { hint: `把电压调到 2.0 V（现在 ${f1(uR)} V）：按“调到 2.0 V”，也可以直接拖滑片`, next: 'goto' }

  const labels: Label[] = [
    { id: 'u', at: W(add(POS.VOLT, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>U</small>{f1(uR)} V</> },
    { id: 'i', at: W(add(POS.AMP, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>I</small>{f2(iR)} A</> },
    { id: 'drag', at: W(add(POS.RHEO, [sliderX(p.x), 0, 4])), ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: live && !dragged && !p.moving ? 1 : 0 }, children: '可以左右拖动滑片' },
    { id: 'n1', at: W(add(POS.EL, [0, 3.4, 2])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '接在电路里的电阻' },
    { id: 'n2', at: W([-4, 2, 30]), ax: 0.5, name: true, className: 'scene-name', children: '换用的电阻' },
  ]
  const pts = rows.map(q => ({ x: q.r, y: q.i }))
  return (
    <LabShell title="欧姆定律" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="电路"
      stage={<Place at="l2" labels={labels}>
        <Bench at="l2"><Rig mode="rheo" knife={knife} p={p.x} I={c.I} U={c.U} usup={U0} hand={p.moving} elWires={from === null}
          spare={<PartsTray />} el={<Boards items={ITEMS} at={String(r)} from={from === null ? null : String(from)} k={swap.k} />}
          onDrag={v => { setDragged(true); p.snap(v) }} /></Bench>
      </Place>}
      lesson={<LessonBlock no="2" title="电流与电阻的关系" concept="电压一定，电流和电阻成反比" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>换用不同的电阻，每次都调节滑动变阻器，使电阻两端的电压保持 2.0 V 不变，测出电流：5 Ω 时 0.40 A，10 Ω 时 0.20 A，20 Ω 时 0.10 A。</p>
          <p className="mt-3">结论：<b className="text-white">在电压一定的情况下，通过导体的电流与导体的电阻成反比。</b></p>
          <p className="mt-3 text-[13.5px] text-white/65">换上阻值更大的电阻，它分到的电压会变大，所以要把滑片往阻值大的一端移，才能把电压调回原来的值。这里滑动变阻器的作用是保持电阻两端的电压不变。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三只电阻，电压都是 2.0 V</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">电压一定时，电流与电阻成反比</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">每一组 I × R 都是 2.0 V：电阻变成 2 倍，电流变成一半。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <Readout u={live ? f1(uR) : '—'} i={live ? f2(iR) : '—'} dim={!settled} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="R" value={String(r)} unit="Ω · 接在电路里" />
            <ParamTile symbol="U" value={f1(L2.U)} unit="V · 要保持的电压" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">数据</h2>
          <div className="mt-1.5"><Table head={['R / Ω', 'U / V', 'I / A', 'I × R / V']} rows={rows.map(q => [q.r, f1(q.u), f2(q.i), f1(ohmU(q.i, q.r))])} hl={rows.length - 1} /></div>
          {!rows.length && <p className="mt-1 text-center text-[13px] text-white/45">还没有记录</p>}
          <h2 className="mt-4 text-[12.5px] text-white/55">I–R 图像</h2>
          <Chart xLabel="R / Ω" yLabel="I / A" xMax={25} yMax={0.5} xStep={5} yStep={0.1} fmtY={y => y ? y.toFixed(1) : '0'} pts={pts} now={live && !from ? { x: r, y: iR } : null} fn={drawn ? (x => ohmI(L2.U, x)) : null} />
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'switch'} onClick={() => setOn(o => !o)} disabled={(knife > 0.01 && knife < 0.99) || swap.busy}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton primary={next === 'draw'} pulse={next === 'goto' || next === 'draw'} onClick={() => targetR === undefined ? draw() : p.go(pForU(r, L2.U))} disabled={targetR === undefined ? drawn : !live || p.moving || atU}>{targetR === undefined ? '连成图像' : '调到 2.0 V'}</LabButton>
        <LabButton primary={next === 'record'} pulse={next === 'record'} onClick={record} disabled={!settled || !atU || done(r)}>记录数据</LabButton>
      </>}
      extras={
        <Control label="接入的电阻">
          <Segmented label="接入的电阻" pulse={next === 'pick'} want={next === 'pick' && targetR !== undefined ? String(targetR) : null} disabled={swap.busy} value={String(r)} onChange={v => pick(+v as R2)} options={L2.Rs.map(x => ({ value: String(x), label: `${x} Ω` }))} />
        </Control>
      }
    />
  )
}
