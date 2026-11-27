// 电磁感应和电网 · 第 1 课 磁通量：实验室第一张台。亥姆霍兹线圈中间是一片匀强磁场，把小线圈转到 0°、60°、90°、180°，
// 数一数穿过它的磁感线，读出磁通量 Φ = BS cosθ。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { ANGLES, coilArea, flux, helmholtzB, linesThrough } from './physics'
import { R1, Rig1 } from './scene1'
import { Place } from './world'
import { ST } from './layout'

type Ang = '0' | '60' | '90' | '180'
const f5 = (deg: number) => (flux(deg) * 1e5).toFixed(2).replace('-0.00', '0.00')
const TASKS: Task[] = [
  { id: '0', text: '线圈平面和磁场垂直（0°），记一次', note: `穿过 ${linesThrough(0)} 根磁感线，Φ = BS = ${f5(0)}×10⁻⁵ Wb` },
  { id: '60', text: '转到 60°，再记一次', note: `只剩 ${linesThrough(60)} 根：Φ = BS cos60° = BS/2` },
  { id: '90', text: '转到 90°，再记一次', note: '线圈平面和磁场平行，没有磁感线穿过，Φ = 0' },
  { id: '180', text: '转到 180°，再记一次', note: '磁感线从背面穿过，Φ = −BS：磁通量有正负' },
]
const X = ST.l1

export default function Lesson1() {
  const [ang, setAng] = useState<Ang>('0')
  const [rows, setRows] = useState<Ang[]>([])
  const T = useTasks('gewu:induction:1', TASKS)
  const deg = useSlide(Number(ang), 45), turning = Math.abs(deg - Number(ang)) > 0.01
  const dup = rows.includes(ang)
  const record = () => { if (turning || dup) return; const n = [...rows, ang]; setRows(n); T.check(id => n.includes(id as Ang)) }
  const resetAll = () => { setAng('0'); setRows([]); T.reset() }

  const task = T.current
  type Next = 'ang' | 'rec' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '磁通量 Φ = BS cosθ，就是穿过这个面的磁感线有多少。', next: null }
    if (turning) return { hint: '线圈在转…', next: null }
    if (ang !== task.id) return { hint: `把线圈转到 ${task.id}°`, next: 'ang' }
    return { hint: `数一数穿过线圈的磁感线，记下 ${task.id}° 的磁通量`, next: 'rec' }
  })()

  const n = linesThrough(Math.round(deg)), B = helmholtzB(), S = coilArea()
  const labels: Label[] = [
    { id: 'n1', at: [X - 0.1, R1.cy + 0.25, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '亥姆霍兹线圈' },
    { id: 'n2', at: [X, R1.cy - 0.075, 0.06], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '小线圈 10 cm × 10 cm' },
    { id: 'b', at: [X + 0.27, R1.cy + 0.09, 0], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>B</small>{(B * 1e3).toFixed(2)} mT</> },
    { id: 'n', at: [X + 0.02, R1.cy + 0.08, 0.06], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: turning ? 0.4 : 1 }, children: <><small>穿过</small>{n} 根</> },
  ]
  return (
    <LabShell title="电磁感应和电网" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="记录"
      stage={<Place at="l1" cur="l1" labels={labels}><Rig1 deg={deg} /></Place>}
      lesson={<LessonBlock no="1" title="磁通量" concept="磁通量就是穿过这个面的磁感线有多少" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在磁感应强度为 B 的匀强磁场中，有一个与磁场方向垂直的平面，面积为 S，我们把 B 与 S 的乘积叫作穿过这个面积的<b className="text-white">磁通量</b>，Φ = BS，单位是韦伯（Wb）。</p>
          <p className="mt-3">平面和磁场不垂直时，用它在垂直于磁场方向上的投影面积 S cosθ 来算：Φ = BS cosθ，θ 是平面的法线和磁场的夹角。</p>
          <p className="mt-3">磁通量可以形象地理解为穿过这个面的磁感线条数。磁感线从一面穿入为正，从另一面穿入就是负。</p>
          <p className="mt-3">两只亥姆霍兹线圈相距一个半径，中间一片区域的磁场近似匀强：B = (4/5)^{3/2}·μ₀NI/R。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四个角度都记完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">磁通量 Φ = BS cosθ，就是穿过这个面的磁感线有多少</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">垂直时最大（{linesThrough(0)} 根），60° 时减半（{linesThrough(60)} 根），平行时为零，翻到背面变成负的。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">Φ = B S cos θ</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{f5(deg)}<span className="ml-1 text-[15px] font-medium text-white/55">×10⁻⁵ Wb</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">穿过线圈的磁感线 {n} 根{Math.cos(deg * Math.PI / 180) < -0.01 ? '，从背面穿过' : ''}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="B" value={(B * 1e3).toFixed(2)} unit="mT · 亥姆霍兹线圈中间" />
            <ParamTile symbol="S" value={(S * 1e4).toFixed(0)} unit="cm² · 10 cm × 10 cm" />
            <ParamTile symbol="θ" value={`${Math.round(deg)}°`} unit="法线和磁场的夹角" />
            <ParamTile symbol="cosθ" value={Math.cos(deg * Math.PI / 180).toFixed(2).replace('-0.00', '0.00')} unit="" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">记录</h2>
          <table className="mt-2 w-full text-[13.5px] tabular-nums">
            <thead className="text-white/50"><tr><th className="py-1 text-left font-normal">θ</th><th className="text-right font-normal">穿过</th><th className="text-right font-normal">Φ（×10⁻⁵ Wb）</th></tr></thead>
            <tbody>{ANGLES.map(a => { const on = rows.includes(String(a) as Ang); return <tr key={a} className={cn('border-t border-white/10', !on && 'text-white/30')}><td className="py-1">{a}°</td><td className="text-right">{on ? `${linesThrough(a)} 根` : '—'}</td><td className="text-right">{on ? f5(a) : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<LabButton primary pulse={next === 'rec'} onClick={record} disabled={turning || dup}>记录数据</LabButton>}
      extras={<Control label="线圈转到"><Segmented label="线圈转到" pulse={next === 'ang'} want={next === 'ang' ? (task?.id as Ang) : null} value={ang} onChange={k => setAng(k as Ang)} options={ANGLES.map(a => ({ value: String(a) as Ang, label: `${a}°` }))} /></Control>}
    />
  )
}
