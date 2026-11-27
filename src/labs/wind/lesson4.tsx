// 热力环流和风 · 第 4 课 热力环流：农田上方剖开一片大气。A 地受热、B 和 C 地冷却：空气在 A 上升、在 B、C 下沉；
// 量一量近地面和高空的气压，看等压面怎样弯曲；最后画出水平气流，两圈热力环流就合上了。镜头正对剖面。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Iso, Motes, Slab, Streams, loop, type Stream } from './air'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Fin, Rows, noteTag } from './parts'
import { CIRC, ISO_LOW, ISO_UP, columns, isoHeights } from './physics'
import { VOICE } from './voice'
import { SPOT, ZH, ground, skyFor, type Want } from './world'

const TASKS: Task[] = [
  { id: 'heat', text: '加热 A 地，看空气怎样运动', note: 'A 处空气受热上升，B、C 处冷却下沉' },
  { id: 'low', text: '量近地面的气压', note: '近地面：A 处是低压，B、C 处是高压' },
  { id: 'up', text: '量高空的气压', note: '高空正好相反：A 处是高压，B、C 处是低压' },
  { id: 'flow', text: '画出同一水平面上的气流', note: '空气从高压流向低压，两圈环流合上了' },
]
const XA = 25, XB = 12, XC = 38, X0 = 6, X1 = 44, Z = ZH, Y0 = 1, TOP = 23, YL = 3.4, YU = 17
const gy = (x: number) => ground(x, Z) + 0.4
/** 等压面的弯曲：把实际几十米的起伏放大画成几个场景单位 */
const bend = (x: number, a: number) => Math.exp(-(((x - XA) / 6) ** 2)) * a - (Math.exp(-(((x - XB) / 5) ** 2)) + Math.exp(-(((x - XC) / 5) ** 2))) * a * 0.35

export default function Lesson4() {
  const [heated, setHeated] = useState(false)
  const [level, setLevel] = useState(0)        // 量过几层气压：0、1（近地面）、2（高空）
  const [flow, setFlow] = useState(false)
  const T = useTasks('gewu:wind:4', TASKS)
  const w = useSlide(heated ? 1 : 0, 0.4)
  useEffect(() => { if (!heated) return; const t = setTimeout(() => T.check(id => id === 'heat'), 3000); return () => clearTimeout(t) }, [heated])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!flow) return; const t = setTimeout(() => T.check(id => id === 'flow'), 2600); return () => clearTimeout(t) }, [flow])   // eslint-disable-line react-hooks/exhaustive-deps
  const measure = () => { const n = level + 1; setLevel(n); setTimeout(() => T.check(id => (id === 'low' && n >= 1) || (id === 'up' && n >= 2)), 1600) }
  const resetAll = () => { setHeated(false); setLevel(0); setFlow(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'heat' | 'measure' | 'flow' | null } = (() => {
    if (!task) return { hint: '都做完了。冷热不均，空气就转起圈来。', next: null }
    if (!heated) return { hint: 'A 地被太阳晒得更热。加热 A 地', next: 'heat' }
    if (task.id === 'heat') return { hint: 'A 地在升温，看空气怎样动…', next: null }
    if (task.id === 'low') return level < 1 ? { hint: '量一量近地面 A、B、C 三处的气压', next: 'measure' } : { hint: '近地面的读数出来了…', next: null }
    if (task.id === 'up') return level < 2 ? { hint: '再量一量高空的气压', next: 'measure' } : { hint: '高空的读数出来了…', next: null }
    return flow ? { hint: '空气在同一水平面上流动…', next: null } : { hint: '同一水平面上有了气压差。画出水平气流', next: 'flow' }
  })()

  const k = columns(true), k0 = columns(false), lo = isoHeights(true, ISO_LOW), up = isoHeights(true, ISO_UP)
  const aLow = level >= 1 ? 1 : 0, aUp = level >= 2 ? 1 : 0
  // 冷暖：A 上空暖，B、C 上空冷
  const field = (u: number, v: number) => { const x = X0 + u * (X1 - X0); return w * (Math.exp(-(((x - XA) / 6) ** 2)) * 1.1 - (Math.exp(-(((x - XB) / 5) ** 2)) + Math.exp(-(((x - XC) / 5) ** 2))) * 0.8) * (1 - v * 0.55) - 0.15 * v }
  // 垂直运动：A 上升，B、C 下沉；画出水平气流以后换成两圈闭合的环流
  const vertical: Stream[] = [
    ...[-1.6, 0, 1.6].map(d => ({ pts: [[XA + d, gy(XA) + 0.5, Z + 0.4], [XA + d * 0.8, 12, Z + 0.4], [XA + d * 0.6, YU - 1.5, Z + 0.4]] as [number, number, number][], heat: [1, 0.8, 0.5] })),
    ...[XB, XC].flatMap(x => [-1, 1].map(d => ({ pts: [[x + d, YU - 1.5, Z + 0.4], [x + d * 0.9, 10, Z + 0.4], [x + d * 0.8, gy(x) + 0.8, Z + 0.4]] as [number, number, number][], heat: [-0.4, -0.7, -0.9] }))),
  ]
  const loops: Stream[] = [loop(XB, XA, YL - 1.2, YU, Z + 0.4, false, 'right'), loop(XA, XC, YL - 1.2, YU, Z + 0.4, true, 'left')]
  const p = (x: number) => (v: number) => `${v.toFixed(x)} hPa`
  const labels: Label[] = [
    noteTag('A', [XA, gy(XA) - 1.6, Z], 'A 地 · 受热'), noteTag('B', [XB, gy(XB) - 1.6, Z], 'B 地 · 冷却'), noteTag('C', [XC, gy(XC) - 1.6, Z], 'C 地 · 冷却'),
    { id: 'pa', at: [XA, YL + 1.4, Z], ax: 0.5, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: aLow }, children: <><small>A 低压</small>{p(0)(k.A.ps)}</> },
    { id: 'pb', at: [XB, YL + 1.4, Z], ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: aLow }, children: <><small>B 高压</small>{p(0)(k.B.ps)}</> },
    { id: 'pc', at: [XC, YL + 1.4, Z], ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: aLow }, children: <><small>C 高压</small>{p(0)(k.B.ps)}</> },
    { id: 'ua', at: [XA, YU + 2.6, Z], ax: 0.5, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: aUp }, children: <><small>A′ 高压</small>{p(1)(k.A.up)}</> },
    { id: 'ub', at: [XB, YU + 2.6, Z], ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: aUp }, children: <><small>B′ 低压</small>{p(1)(k.B.up)}</> },
    { id: 'uc', at: [XC, YU + 2.6, Z], ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: aUp }, children: <><small>C′ 低压</small>{p(1)(k.B.up)}</> },
    noteTag('il', [X1 - 0.4, YL + bend(X1, -1.4) - 1.1, Z], `等压面 ${ISO_LOW} hPa`, true, 1),
    noteTag('iu', [X1 - 0.4, YU + bend(X1, 1.6) - 1.2, Z], `等压面 ${ISO_UP} hPa`, true, 1),
  ]
  const s = SPOT.field
  return (
    <LabShell narration={voiced(NARRATION['4'], VOICE)} title="热力环流和风" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="热力环流"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...skyFor(1)} world={{ day: 1, heat: [{ x0: XA - 5, x1: XA + 5, v: w }, { x0: XB - 5, x1: XB + 5, v: -w * 0.7 }, { x0: XC - 5, x1: XC + 5, v: -w * 0.7 }] }}>
        <Slab x0={X0} x1={X1} y0={Y0} y1={TOP} z={Z} field={field} fieldKey={String(heated)} amount={0.2 + w * 0.8} tint={0.1} />
        <Streams streams={vertical} on={heated && !flow ? 1 : 0} speed={2.4} per={0.9} size={1.5} />
        <Streams streams={loops} on={flow ? 1 : 0} speed={3.2} per={0.8} size={1.5} />
        {/* 两张等压面：近地面在 A 处下凹，高空在 A 处上凸；高低按实际差放大画 */}
        <Iso x0={X0} x1={X1} z0={Z - 10} z1={Z} h={x => YL + bend(x, -1.4 * w * Math.sign(lo.B - lo.A))} hKey={`lo${w.toFixed(2)}`} on={Math.max(0.5, aLow)} />
        <Iso x0={X0} x1={X1} z0={Z - 10} z1={Z} h={x => YU + bend(x, 1.6 * w * Math.sign(up.A - up.B))} hKey={`up${w.toFixed(2)}`} on={Math.max(0.5, aUp)} />
        <Motes x0={X0} x1={X1} y0={Y0 + 0.6} y1={TOP} z={Z + 0.2} n={260} heat={(x, y) => field((x - X0) / (X1 - X0), (y - Y0) / (TOP - Y0))} drift={x => [0, w * (Math.exp(-(((x - XA) / 4) ** 2)) * 2.2 - (Math.exp(-(((x - XB) / 4) ** 2)) + Math.exp(-(((x - XC) / 4) ** 2))) * 1.4)]} />
      </LabStage>}
      lesson={<LessonBlock no="4" title="热力环流" concept="冷热不均，空气就转起圈来" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>由于地面冷热不均而形成的空气环流，叫<b className="text-white">热力环流</b>。它是大气运动最简单的形式。</p>
          <p className="mt-2">A 地受热多，近地面空气膨胀<b className="text-white">上升</b>；B、C 两地受热少，空气收缩<b className="text-white">下沉</b>。于是近地面 A 处空气密度变小，形成<b className="text-white">低压</b>，B、C 处形成高压；高空正好相反，A 处上空是高压，B、C 上空是低压。</p>
          <p className="mt-2">同一水平面上有了气压差，空气就从高压流向低压：近地面从 B、C 流向 A，高空从 A 流向 B、C，形成两圈环流。</p>
          <p className="mt-2"><b className="text-white">等压面</b>：气压相等的各点连成的面。等压面向上凸的地方是高压，向下凹的地方是低压。</p>
          <p className="mt-2 text-[13.5px] text-white/65">气压由压高公式算出（地面气压是示意值），等压面的起伏放大了画。</p>
        </>} />}
      finale={T.finale && <Fin kicker="热力环流画完了" big="冷热不均，空气就转起圈来" small="受热处空气上升，近地面成低压、高空成高压；冷却处空气下沉，近地面成高压、高空成低压。同一水平面上空气从高压流向低压，形成热力环流。" />}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">气温</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="A" value={`${(heated ? k.A.t : k0.A.t).toFixed(0)} ℃`} unit="受热" />
            <ParamTile symbol="B、C" value={`${(heated ? k.B.t : k0.B.t).toFixed(0)} ℃`} unit="冷却" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">气压</h2>
          <Rows head={['', 'A', 'B、C']} rows={[
            ['近地面', level >= 1 ? `${k.A.ps} hPa` : '—', level >= 1 ? `${k.B.ps} hPa` : '—'],
            [`高空 ${CIRC.zUp} m`, level >= 2 ? `${k.A.up.toFixed(1)} hPa` : '—', level >= 2 ? `${k.B.up.toFixed(1)} hPa` : '—'],
          ]} />
          <p className="mt-3 text-[13px] leading-relaxed text-white/60">加热以前，三处近地面都是 {CIRC.p0} hPa，{CIRC.zUp} m 高处都是约 {k0.A.up.toFixed(1)} hPa。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'heat'} pulse={next === 'heat'} onClick={() => setHeated(true)} disabled={heated}>加热 A 地</LabButton>
        <LabButton primary={next === 'measure'} pulse={next === 'measure'} onClick={measure} disabled={!T.done.heat || level >= 2}>{level < 1 ? '量近地面气压' : '量高空气压'}</LabButton>
        <LabButton primary={next === 'flow'} pulse={next === 'flow'} onClick={() => setFlow(true)} disabled={level < 2 || flow}>画出水平气流</LabButton>
      </>}
      extras={null}
    />
  )
}
