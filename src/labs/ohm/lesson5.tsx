// 欧姆定律 · 第 5 课 测小灯泡的电阻：岛式工作台中间。同一套伏安法电路，被测的换成一只 2.5 V 的小灯泡。
// 在 1.0、1.5、2.0、2.5 V 下各测一组：灯从暗红到正常发光，算出来的电阻一次比一次大，I–U 图像是一条弯曲的线。最后判断：能不能求平均值。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { L5, LAMP_U, U0, ohmI, lampGlow, lampLoop, lampP, measureLamp, readA, readV, rheoR } from './physics'
import { POS, Rig } from './rig'
import { f1, f2, useSettled, useTween } from './parts'
import { Chart, Readout, Table } from './views'
import { Bench, Place, toWorld } from './world'
import { add, sliderX } from './gear'

const TASKS: Task[] = [
  { id: 'a', text: '闭合开关，把电压调到 1.0 V，记一组', note: `灯丝发红，R ≈ ${f1(measureLamp(1).R)} Ω` },
  { id: 'b', text: '调到 1.5 V、2.0 V，各记一组', note: '灯越来越亮，算出的电阻越来越大' },
  { id: 'c', text: '调到 2.5 V（正常发光），再记一组', note: `正常发光时 R ≈ ${f1(measureLamp(2.5).R)} Ω` },
  { id: 'judge', text: '判断：能不能求平均值作为灯丝的电阻', note: '' },
]
type Ans = 'yes' | 'no'
const W = (p: [number, number, number]) => toWorld('l5', p)

export default function Lesson5() {
  const [on, setOn] = useState(false)
  const [rows, setRows] = useState<{ u: number; i: number; r: number }[]>([])
  const [said, setSaid] = useState<Ans | null>(null)
  const [dragged, setDragged] = useState(false)
  const T = useTasks('gewu:ohm:5', TASKS)
  const p = useTween(1, 0.32)
  const knife = useSlide(on ? 1 : 0, 2.6), live = knife > 0.99
  const c = lampLoop(rheoR(p.x)), uR = readV(c.U), iR = readA(c.I)
  const settled = useSettled(`${on}${p.x.toFixed(4)}`, 1300) && live && !p.moving
  const target = L5.targets.find(t => !rows.some(r => r.u === t))
  const atTarget = target !== undefined && Math.abs(uR - target) < 1e-6
  const dup = rows.some(r => r.u === uR)
  const allIn = target === undefined
  const has = (n: { u: number }[], ...us: number[]) => us.every(u => n.some(r => r.u === u))
  const record = () => {
    if (!settled || dup) return
    const m = measureLamp(c.U), n = [...rows, { u: m.U, i: m.I, r: m.R }]; setRows(n)
    T.check(id => id === 'a' ? has(n, 1.0) : id === 'b' ? has(n, 1.5, 2.0) : id === 'c' ? has(n, 2.5) : false)
  }
  const judge = (a: Ans) => { if (!allIn) return; setSaid(a); if (a === 'no') T.check(id => id === 'judge') }
  const resetAll = () => { setOn(false); p.snap(1); setRows([]); setSaid(null); setDragged(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'switch' | 'goto' | 'record' | 'judge' | null } = !task ? { hint: '灯丝的电阻随温度升高而增大。不同电压下的电阻不同，不能求平均值。', next: null }
    : !on ? { hint: '闭合开关前，滑片已经放在阻值最大的一端。闭合开关', next: 'switch' }
    : !live ? { hint: '合上开关…', next: null }
    : p.moving ? { hint: '移动滑片，灯的亮度在变…', next: null }
    : allIn && said === 'yes' ? { hint: '不对：四次的电阻是在不同温度下测的，本来就不一样，平均值没有意义。再选一次', next: 'judge' }
    : allIn ? { hint: '电阻一次比一次大。能不能把四次的平均值当作灯丝的电阻？', next: 'judge' }
    : !settled ? { hint: '等指针停稳…', next: null }
    : atTarget && !dup ? { hint: `读两只表，按“记录数据”：${f1(uR)} V，${f2(iR)} A`, next: 'record' }
    : { hint: `把电压调到 ${f1(target!)} V：按“调到 ${f1(target!)} V”，也可以直接拖滑片`, next: 'goto' }

  const labels: Label[] = [
    { id: 'u', at: W(add(POS.VOLT, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>U</small>{f1(uR)} V</> },
    { id: 'i', at: W(add(POS.AMP, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>I</small>{f2(iR)} A</> },
    { id: 'drag', at: W(add(POS.RHEO, [sliderX(p.x), 0, 4])), ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: live && !dragged && !p.moving ? 1 : 0 }, children: '可以左右拖动滑片' },
    { id: 'n2', at: W(add(POS.EL, [-4, 5, 2])), ax: 1, name: true, className: 'scene-name -translate-y-full', children: `小灯泡 · 额定电压 ${LAMP_U} V` },
  ]
  const last = rows[0]
  return (
    <LabShell title="欧姆定律" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="电路"
      stage={<Place at="l5" labels={labels}>
        <Bench at="l5"><Rig mode="rheo" tag={`${LAMP_U} V`} lamp={lampGlow(c.U)} knife={knife} p={p.x} I={c.I} U={c.U} usup={U0} hand={p.moving}
          onDrag={v => { setDragged(true); p.snap(v) }} /></Bench>
      </Place>}
      lesson={<LessonBlock no="5" title="测小灯泡的电阻" concept="灯越亮，灯丝越热，电阻越大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>用伏安法测小灯泡在不同电压下的电阻：电压越高，灯越亮，灯丝的温度越高，算出来的电阻越大。小灯泡的 I–U 图像不是直线，而是一条弯向电压轴的曲线。</p>
          <p className="mt-3"><b className="text-white">灯丝的电阻随温度升高而增大。</b>几次测得的电阻本来就不同，求平均值没有意义；测定值电阻时多次测量是为了求平均、减小误差，两者目的不同。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里灯丝的电阻用的是示意的数，只表示“电压越高电阻越大”的趋势。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四组数据，四个不同的电阻</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">灯丝的电阻随温度升高而增大</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">从 {rows.length ? f1(rows[0].r) : ''} Ω 变到 {rows.length ? f1(rows[rows.length - 1].r) : ''} Ω（示意），I–U 图像是曲线；不能求平均值。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <Readout u={live ? f1(uR) : '—'} i={live ? f2(iR) : '—'} dim={!settled} />
          <h2 className="mt-4 text-[12.5px] text-white/55">数据（示意）</h2>
          <div className="mt-1.5"><Table head={['U / V', 'I / A', 'R / Ω', '灯']} rows={rows.map(r => [f1(r.u), f2(r.i), f1(r.r), r.u >= LAMP_U ? '正常发光' : r.u >= 1.5 ? '较亮' : '暗红'])} hl={rows.length - 1} /></div>
          {!rows.length && <p className="mt-1 text-center text-[13px] text-white/45">还没有记录</p>}
          <h2 className="mt-4 text-[12.5px] text-white/55">I–U 图像</h2>
          <Chart xLabel="U / V" yLabel="I / A" xMax={3} yMax={0.4} xStep={0.5} yStep={0.1} fmtY={y => y ? y.toFixed(1) : '0'} pts={rows.map(r => ({ x: r.u, y: r.i }))} now={live ? { x: uR, y: iR } : null} curve={allIn} refK={allIn && last ? ohmI(1, last.r) : null} />
          {allIn && <p className="mt-1 text-[12.5px] text-white/50">虚线：按 1.0 V 时的电阻画的直线</p>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'switch'} onClick={() => setOn(o => !o)} disabled={knife > 0.01 && knife < 0.99}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton pulse={next === 'goto'} onClick={() => target !== undefined && p.go(lampP(target))} disabled={!live || p.moving || allIn}>调到 {f1(target ?? LAMP_U)} V</LabButton>
        <LabButton primary={next === 'record'} pulse={next === 'record'} onClick={record} disabled={!settled || dup || allIn}>记录数据</LabButton>
      </>}
      extras={
        <Control label="能求平均值吗">
          <Segmented label="能不能求平均值" pulse={next === 'judge'} want={next === 'judge' ? 'no' : null} disabled={!allIn} value={(said ?? 'none') as Ans} onChange={v => judge(v as Ans)} options={[{ value: 'yes', label: '能' }, { value: 'no', label: '不能' }]} />
        </Control>
      }
    />
  )
}
