// 欧姆定律 · 第 1 课 电流与电压的关系：后墙西头的防静电工作台。定值电阻 10 Ω 和滑动变阻器串联在 3.0 V 的电源上，
// 电压表接在电阻两端，电流表串在电路里。闭合开关（滑片先放在阻值最大处），移动滑片让电压是 1.0、1.6、2.2、2.8 V，各记一次电流，最后连成 I–U 图像。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { L1, U0, fitK, ohmR, loop, pForU, readA, readV, rheoR } from './physics'
import { POS, Rig } from './rig'
import { f1, f2, useSettled, useTween } from './parts'
import { Chart, Readout, Table } from './views'
import { Bench, Place, toWorld } from './world'
import { add, sliderX } from './gear'

const R = L1.R
const TASKS: Task[] = [
  { id: 'a', text: '闭合开关，记下电压 1.0 V 时的电流', note: '1.0 V 时电流是 0.10 A' },
  { id: 'b', text: '移动滑片，记下 1.6 V、2.2 V 时的电流', note: '电压变大，电流也跟着变大' },
  { id: 'c', text: '再记下 2.8 V 时的电流', note: '每一组 U ÷ I 都是 10 Ω' },
  { id: 'd', text: '把四个点连起来，看 I–U 图像', note: '一条过原点的直线' },
]
export const W1 = (p: [number, number, number]) => toWorld('l1', p)

export default function Lesson1() {
  const [on, setOn] = useState(false)
  const [rows, setRows] = useState<{ u: number; i: number }[]>([])
  const [drawn, setDrawn] = useState(false)
  const [dragged, setDragged] = useState(false)
  const T = useTasks('gewu:ohm:1', TASKS)
  const p = useTween(1, 0.32)
  const knife = useSlide(on ? 1 : 0, 2.6), live = knife > 0.99
  const c = loop(R, rheoR(p.x)), uR = readV(c.U), iR = readA(c.I)
  const settled = useSettled(`${on}${p.x.toFixed(4)}`, 1300) && live && !p.moving
  const target = L1.targets.find(t => !rows.some(r => r.u === t))
  const atTarget = target !== undefined && Math.abs(uR - target) < 1e-6
  const dup = rows.some(r => r.u === uR)
  const has = (rs: { u: number }[], ...us: number[]) => us.every(u => rs.some(r => r.u === u))
  const record = () => {
    if (!settled || dup) return
    const n = [...rows, { u: uR, i: iR }]; setRows(n)
    T.check(id => id === 'a' ? has(n, 1.0) : id === 'b' ? has(n, 1.6, 2.2) : id === 'c' ? has(n, 2.8) : false)
  }
  const draw = () => { if (!has(rows, ...L1.targets)) return; setDrawn(true); T.check(id => id === 'd') }
  const goto = () => { if (target !== undefined) p.go(pForU(R, target)) }
  const resetAll = () => { setOn(false); p.snap(1); setRows([]); setDrawn(false); setDragged(false); T.reset() }
  const allIn = has(rows, ...L1.targets)

  const task = T.current
  const { hint, next }: { hint: string; next: 'switch' | 'goto' | 'record' | 'draw' | null } = !task ? { hint: '电阻一定时，通过导体的电流与导体两端的电压成正比。', next: null }
    : !on ? { hint: '闭合开关前，滑片已经放在阻值最大的一端。闭合开关', next: 'switch' }
    : !live ? { hint: '合上开关…', next: null }
    : p.moving ? { hint: '移动滑片，电压表的示数在变…', next: null }
    : allIn ? { hint: '四组都记好了。把四个点连起来', next: 'draw' }
    : !settled ? { hint: '等指针停稳…', next: null }
    : atTarget && !dup ? { hint: `读两只表，按“记录数据”：${f1(uR)} V，${f2(iR)} A`, next: 'record' }
    : { hint: `把电压调到 ${f1(target!)} V：按“调到 ${f1(target!)} V”，也可以直接拖滑片`, next: 'goto' }

  const RH = POS.RHEO
  const labels: Label[] = [
    { id: 'u', at: W1(add(POS.VOLT, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>U</small>{f1(uR)} V</> },
    { id: 'i', at: W1(add(POS.AMP, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>I</small>{f2(iR)} A</> },
    { id: 'drag', at: W1(add(RH, [sliderX(p.x), 0, 4])), ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: live && !dragged && !p.moving ? 1 : 0 }, children: '可以左右拖动滑片' },
    { id: 'n1', at: W1(add(POS.SUP, [0, 12.5, 0])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '直流稳压电源 3.0 V' },
    { id: 'n2', at: W1(add(POS.EL, [0, 3.4, 2])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `定值电阻 R = ${R} Ω` },
    { id: 'n3', at: W1(add(RH, [-15, 2, 2])), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '滑动变阻器 20 Ω' },
    { id: 'n4', at: W1(add(POS.SW, [0, 2.4, 2])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '开关' },
  ]
  return (
    <LabShell title="欧姆定律" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="电路"
      stage={<Place at="l1" labels={labels}>
        <Bench at="l1"><Rig mode="rheo" tag={`R = ${R} Ω`} print={['5W', '10ΩJ']} knife={knife} p={p.x} I={c.I} U={c.U} usup={U0} hand={p.moving}
          onDrag={v => { setDragged(true); p.snap(v) }} /></Bench>
      </Place>}
      lesson={<LessonBlock no="1" title="电流与电压的关系" concept="电阻一定，电流和电压成正比" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>保持电阻不变，用滑动变阻器改变电阻两端的电压，测出对应的电流。电压是 1.0 V 时电流 0.10 A，电压变成 2 倍、近 3 倍，电流也变成 2 倍、近 3 倍。</p>
          <p className="mt-3">结论：<b className="text-white">在电阻一定的情况下，通过导体的电流与导体两端的电压成正比。</b>I–U 图像是一条过原点的直线。</p>
          <p className="mt-3 text-[13.5px] text-white/65">闭合开关前，滑片要放在阻值最大的位置，保护电路。说“电流与电压成正比”，不说“电压与电流成正比”：电压是使电荷定向移动形成电流的原因。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四组数据连成了一条直线</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">电阻一定时，电流与电压成正比</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">每一组 U ÷ I 都是 {R} Ω；I–U 图像是一条过原点的直线。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <Readout u={live ? f1(uR) : '—'} i={live ? f2(iR) : '—'} dim={!settled} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="R" value={String(R)} unit="Ω · 定值电阻" />
            <ParamTile symbol="U电源" value={f1(U0)} unit="V" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">数据</h2>
          <div className="mt-1.5"><Table head={['U / V', 'I / A', 'U ÷ I / Ω']} rows={rows.map(r => [f1(r.u), f2(r.i), f1(ohmR(r.u, r.i))])} hl={rows.length - 1} /></div>
          {!rows.length && <p className="mt-1 text-center text-[13px] text-white/45">还没有记录</p>}
          <h2 className="mt-4 text-[12.5px] text-white/55">I–U 图像</h2>
          <Chart xLabel="U / V" yLabel="I / A" xMax={3} yMax={0.3} xStep={0.5} yStep={0.1} fmtY={y => y ? y.toFixed(1) : '0'} pts={rows.map(r => ({ x: r.u, y: r.i }))} now={live ? { x: uR, y: iR } : null} line={drawn ? fitK(rows) : null} />
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'switch'} onClick={() => setOn(o => !o)} disabled={knife > 0.01 && knife < 0.99}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton primary={next === 'draw'} pulse={next === 'goto' || next === 'draw'} onClick={allIn ? draw : goto} disabled={allIn ? drawn : !live || p.moving || target === undefined}>{allIn ? '连成图像' : `调到 ${f1(target ?? L1.targets[0])} V`}</LabButton>
        <LabButton primary={next === 'record'} pulse={next === 'record'} onClick={record} disabled={!settled || dup}>记录数据</LabButton>
      </>}
      extras={null}
    />
  )
}
