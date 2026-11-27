// 光的波动性和光电效应 · 第 1 课 两束光叠出条纹（光的双缝干涉）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Bench, { X_LASER, X_SLIT, benchAt, onScreen } from './bench'
import { useSpace } from './gear'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { L1, LIGHTS, doubleSlitI, fringeGap } from './physics'
import { FringeView } from './views'
import { VOICE } from './voice'

const { L, d } = L1, { nm, hex } = LIGHTS[L1.light], GAP = fringeGap(L, nm, d)
const TASKS: Task[] = [
  { id: 'both', text: '激光照在双缝上，记下屏上的图样', note: '一排等间距的明暗条纹：亮、暗、亮、暗……' },
  { id: 'one', text: '挡住其中一条缝，再记一次', note: '条纹没了，只剩一片中间亮两边暗的光带' },
  { id: 'gap', text: '重新打开两条缝，量出相邻亮纹的间距', note: `5 个间距长 ${(GAP * 5).toFixed(1)} mm，每个 ${GAP.toFixed(1)} mm` },
]
const SEEN = { both: '明暗相间的条纹', one: '一片光带，没有条纹' }

export default function Lesson1() {
  const [half, setHalf] = useState(false)
  const [rows, setRows] = useState<('both' | 'one')[]>([])
  const [measured, setMeasured] = useState(false)
  const T = useTasks('gewu:light:1', TASKS)
  const one = useSlide(half ? 1 : 0, 1.6), steady = one === (half ? 1 : 0), now = half ? 'one' : 'both', dup = rows.includes(now)
  const record = () => { if (!steady || dup) return; const next = [...rows, now] as ('both' | 'one')[]; setRows(next); T.check(id => next.includes(id as 'both')) }
  const measure = () => { if (half || !steady) return; setMeasured(true); T.check(id => id === 'gap' && rows.length === 2) }
  useSpace(record)
  const resetAll = () => { setHalf(false); setRows([]); setMeasured(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'half' | 'record' | 'measure' | null } = !task ? { hint: '都做完了。两条缝都透光才有条纹：条纹是两束光叠加出来的。', next: null }
    : task.id === 'both' ? (half ? { hint: '按“打开两条缝”', next: 'half' } : { hint: '看屏上是什么样的，按“记录”', next: 'record' })
    : task.id === 'one' ? (!half ? { hint: '按“挡住一条缝”', next: 'half' } : { hint: '看条纹还在不在，按“记录”', next: 'record' })
    : half ? { hint: '按“打开两条缝”', next: 'half' } : { hint: '按“量间距”，量一量相邻两条亮纹离多远', next: 'measure' }
  const show = measured && !half
  const labels: Label[] = [
    { id: 'laser', at: benchAt(X_LASER - 0.3, 0.3), ax: 0.2, name: true, className: 'scene-name -translate-y-full', children: `激光器 · 红光 ${nm} nm` },
    { id: 'slit', at: benchAt(X_SLIT, 0.42), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: half ? '双缝（挡住了一条）' : `双缝 · 缝距 ${d.toFixed(2)} mm` },
    { id: 'screen', at: onScreen(L, 0, 0.72), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '光屏' },
    { id: 'gap', at: onScreen(L, 0, 0.5), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: show ? 1 : 0 }, children: <><small>条纹间距 Δx</small>{GAP.toFixed(1)} mm</> },
  ]
  return (
    <LabShell narration={voiced(NARRATION['1'], VOICE)} title={TITLE} lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="双缝和光屏"
      stage={<Bench light={L1.light} d={d} L={L} one={one} labels={labels} />}
      lesson={<LessonBlock no="1" title="两束光叠出条纹" concept="两束相干光叠加，出现明暗相间的条纹" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>激光照在双缝上，两条缝成了两个振动情况完全相同的光源，它们发出的光在屏上叠加。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>屏上某点到两条缝的路程差是波长的整数倍，两束光互相加强，出现<b className="text-white">亮条纹</b></li>
            <li>路程差是半波长的奇数倍，两束光互相削弱，出现<b className="text-white">暗条纹</b></li>
            <li>挡住一条缝，只剩一束光，没有叠加，也就没有条纹</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">干涉是波特有的现象。1801 年托马斯·杨用双缝做出了光的干涉，说明光是一种波。屏上的条纹是放大了画的，屏下沿的毫米刻度也一起放大了。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三件事都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">两条缝都透光才有条纹：光会干涉，光是波</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">红光 {nm} nm、缝距 {d.toFixed(2)} mm、屏距 {L.toFixed(2)} m 时，相邻亮纹相隔 {GAP.toFixed(1)} mm。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">相邻亮纹的间距 Δx</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{show ? GAP.toFixed(1) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">mm</span></div>
          </div>
          <FringeView I={x => doubleSlitI(x, L, nm, d) * (1 - one) + doubleSlitI(x, L, nm, d, false) * one * 2.2} hex={hex} mark={show ? { from: -2.5 * GAP, to: 2.5 * GAP, text: `5 个间距 ${(GAP * 5).toFixed(1)} mm` } : null} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ParamTile symbol="λ" value={String(nm)} unit="nm · 波长" />
            <ParamTile symbol="d" value={d.toFixed(2)} unit="mm · 缝距" />
            <ParamTile symbol="L" value={L.toFixed(2)} unit="m · 屏距" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">观察记录</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">两条缝都透光、只留一条缝，各记一次。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">透光的缝</th><th className="text-right font-normal">屏上的图样</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{k === 'both' ? '两条' : '一条'}</td><td className="text-right font-semibold text-[#7fe3d4]">{SEEN[k]}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'half'} onClick={() => setHalf(h => !h)} disabled={!steady}>{half ? '打开两条缝' : '挡住一条缝'}</LabButton>
        <LabButton pulse={next === 'measure'} onClick={measure} disabled={half || !steady}>量间距</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!steady || dup}>记录</LabButton>
      </>}
      extras={<Control label="光源"><span className="flex h-11 items-center rounded-xl bg-white/8 px-3 text-[14px] text-white/80">红色激光 {nm} nm</span></Control>}
    />
  )
}
