// 欧姆定律 · 第 4 课 伏安法测电阻：车间中间岛式工作台的西头。一只没标阻值的电阻 Rₓ 接在伏安法的电路里，
// 在 1.3、2.0、2.6 V 下各测一组电流，用 R = U/I 各算一次电阻，三次的结果不完全一样（电流只能读到分度值），取平均值。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { L4, RX, U0, loop, mean, measure, pForU, readA, readV, rheoR } from './physics'
import { POS, Rig } from './rig'
import { f1, f2, useSettled, useTween } from './parts'
import { Readout, Table } from './views'
import { Bench, Place, toWorld } from './world'
import { add, sliderX } from './gear'

const TASKS: Task[] = [
  { id: 'a', text: '闭合开关，把电压调到 1.3 V，记一组', note: `R = 1.3 V ÷ 0.16 A ≈ ${f1(measure(RX, 1.3).R)} Ω` },
  { id: 'b', text: '调到 2.0 V，再记一组', note: `R ≈ ${f1(measure(RX, 2.0).R)} Ω：和上一次不完全一样` },
  { id: 'c', text: '调到 2.6 V，再记一组', note: `R ≈ ${f1(measure(RX, 2.6).R)} Ω` },
  { id: 'avg', text: '求三次的平均值', note: '' },
]
const W = (p: [number, number, number]) => toWorld('l4', p)

export default function Lesson4() {
  const [on, setOn] = useState(false)
  const [rows, setRows] = useState<{ u: number; i: number; r: number }[]>([])
  const [avg, setAvg] = useState(false)
  const [dragged, setDragged] = useState(false)
  const T = useTasks('gewu:ohm:4', TASKS)
  const p = useTween(1, 0.32)
  const knife = useSlide(on ? 1 : 0, 2.6), live = knife > 0.99
  const c = loop(RX, rheoR(p.x)), uR = readV(c.U), iR = readA(c.I)
  const settled = useSettled(`${on}${p.x.toFixed(4)}`, 1300) && live && !p.moving
  const target = L4.targets.find(t => !rows.some(r => r.u === t))
  const atTarget = target !== undefined && Math.abs(uR - target) < 1e-6
  const dup = rows.some(r => r.u === uR)
  const allIn = target === undefined
  const record = () => {
    if (!settled || dup) return
    const m = measure(RX, c.U), n = [...rows, { u: m.U, i: m.I, r: m.R }]; setRows(n)
    T.check(id => (id === 'a' && n.some(r => r.u === 1.3)) || (id === 'b' && n.some(r => r.u === 2.0)) || (id === 'c' && n.some(r => r.u === 2.6)))
  }
  const average = () => { if (!allIn) return; setAvg(true); T.check(id => id === 'avg') }
  const resetAll = () => { setOn(false); p.snap(1); setRows([]); setAvg(false); setDragged(false); T.reset() }
  const Rm = mean(rows.filter(r => (L4.targets as readonly number[]).includes(r.u)).map(r => r.r))

  const task = T.current
  const { hint, next }: { hint: string; next: 'switch' | 'goto' | 'record' | 'avg' | null } = !task ? { hint: `三次测量的平均值约 ${f1(Rm)} Ω。多次测量求平均值，可以减小误差。`, next: null }
    : !on ? { hint: '闭合开关前，滑片已经放在阻值最大的一端。闭合开关', next: 'switch' }
    : !live ? { hint: '合上开关…', next: null }
    : p.moving ? { hint: '移动滑片，电压表的示数在变…', next: null }
    : allIn ? { hint: '三组都测好了，三次算出的电阻不完全一样。求平均值', next: 'avg' }
    : !settled ? { hint: '等指针停稳…', next: null }
    : atTarget && !dup ? { hint: `读两只表，按“记录数据”：${f1(uR)} V，${f2(iR)} A`, next: 'record' }
    : { hint: `把电压调到 ${f1(target!)} V：按“调到 ${f1(target!)} V”，也可以直接拖滑片`, next: 'goto' }

  const labels: Label[] = [
    { id: 'u', at: W(add(POS.VOLT, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>U</small>{f1(uR)} V</> },
    { id: 'i', at: W(add(POS.AMP, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>I</small>{f2(iR)} A</> },
    { id: 'drag', at: W(add(POS.RHEO, [sliderX(p.x), 0, 4])), ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: live && !dragged && !p.moving ? 1 : 0 }, children: '可以左右拖动滑片' },
    { id: 'n2', at: W(add(POS.EL, [0, 3.4, 2])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '待测电阻 Rₓ' },
  ]
  return (
    <LabShell title="欧姆定律" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="电路"
      stage={<Place at="l4" labels={labels}>
        <Bench at="l4"><Rig mode="rheo" tag="Rₓ" print={['5W']} knife={knife} p={p.x} I={c.I} U={c.U} usup={U0} hand={p.moving}
          onDrag={v => { setDragged(true); p.snap(v) }} /></Bench>
      </Place>}
      lesson={<LessonBlock no="4" title="伏安法测电阻" concept="测出电压和电流，就能算出电阻" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>用电压表测出电阻两端的电压 U，用电流表测出通过它的电流 I，根据欧姆定律 R = U ÷ I 算出电阻。这种方法叫<b className="text-white">伏安法</b>。</p>
          <p className="mt-3">电表只能读到分度值（电流表 0.02 A），每次测量都有误差，三次算出来的电阻不完全一样。<b className="text-white">多次测量求平均值，可以减小误差。</b></p>
          <p className="mt-3 text-[13.5px] text-white/65">滑动变阻器在这里的作用：保护电路，并改变电阻两端的电压，以便多测几组。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三次测量，求了平均值</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">Rₓ ≈ {f1(Rm)} Ω</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">三次分别约 {rows.map(r => f1(r.r)).join('、')} Ω。用 R = U ÷ I 算电阻，多测几次求平均值，误差更小。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <Readout u={live ? f1(uR) : '—'} i={live ? f2(iR) : '—'} dim={!settled} />
          <div className="mt-4 text-center font-formula text-[22px] italic text-white/80">R = U ÷ I</div>
          <h2 className="mt-3 text-[12.5px] text-white/55">数据</h2>
          <div className="mt-1.5"><Table head={['次数', 'U / V', 'I / A', 'R / Ω']} rows={rows.map((r, k) => [k + 1, f1(r.u), f2(r.i), f1(r.r)])} hl={rows.length - 1} foot={avg ? ['平均', '', '', f1(Rm)] : undefined} /></div>
          {!rows.length && <p className="mt-1 text-center text-[13px] text-white/45">还没有记录</p>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="Rₓ" value={avg ? f1(Rm) : '?'} unit="Ω · 平均值" />
            <ParamTile symbol="U电源" value={f1(U0)} unit="V" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'switch'} onClick={() => setOn(o => !o)} disabled={knife > 0.01 && knife < 0.99}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton primary={next === 'avg'} pulse={next === 'goto' || next === 'avg'} onClick={() => allIn ? average() : target !== undefined && p.go(pForU(RX, target))} disabled={allIn ? avg : !live || p.moving}>{allIn ? '求平均值' : `调到 ${f1(target ?? L4.targets[0])} V`}</LabButton>
        <LabButton primary={next === 'record'} pulse={next === 'record'} onClick={record} disabled={!settled || dup || allIn}>记录数据</LabButton>
      </>}
      extras={null}
    />
  )
}
