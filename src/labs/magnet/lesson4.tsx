// 电与磁 · 第 4 课 电磁铁：实验台第 4 格。闭合开关，电磁铁吸起大头针，断开就掉下；把电流调大、改接 100 匝、抽出铁芯，每次数吸起的大头针。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { L4 as Q, pins } from './physics'
import { L4, Scene4 } from './scene4'
import { Bench, Place, toWorld } from './world'
import { useSettled } from './anim'

const TASKS: Task[] = [
  { id: 'on', text: '闭合开关吸大头针，再断开开关', note: '通电有磁性，断电磁性消失：电磁铁的磁性有无可以控制' },
  { id: 'current', text: '把电流调到 1.0 A', note: '匝数不变，电流越大，吸起的大头针越多' },
  { id: 'turns', text: '改接 100 匝的线圈', note: '电流不变，匝数越多，吸起的大头针越多' },
  { id: 'core', text: '抽出铁芯', note: '没有铁芯，磁性弱得多：铁芯能大大增强磁性' },
]
interface Row { turns: number; I: number; core: boolean; n: number }

export default function Lesson4() {
  const [on, setOn] = useState(false)
  const [I, setI] = useState(Q.lowI)
  const [turns, setTurns] = useState<50 | 100>(50)
  const [core, setCore] = useState(true)
  const [offSeen, setOffSeen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const T = useTasks('gewu:magnet:4', TASKS)
  const knife = useSlide(on ? 1 : 0, 2.4), live = knife > 0.99
  const coreK = useSlide(core ? 0 : 1, 0.7)
  const slider = useSlide(I > 0.75 ? 0.35 : 0.8, 0.5)
  const n = pins(turns, I, core)
  const settled = useSettled(`${on}${I}${turns}${core}`, 1800) && live && Math.abs(slider - (I > 0.75 ? 0.35 : 0.8)) < 1e-3 && (core ? coreK < 1e-3 : coreK > 0.999)
  const resetAll = () => { setOn(false); setI(Q.lowI); setTurns(50); setCore(true); setOffSeen(false); setRows([]); T.reset() }
  const record = () => setRows(r => r.some(x => x.turns === turns && x.I === I && x.core === core) ? r : [...r, { turns, I, core, n }])
  useEffect(() => {
    if (settled) record()
    if (!settled) return
    if (T.current?.id === 'current' && I === Q.highI && turns === 50) T.check(id => id === 'current')
    if (T.current?.id === 'turns' && turns === 100 && I === Q.highI && core) T.check(id => id === 'turns')
    if (T.current?.id === 'core' && !core) T.check(id => id === 'core')
  }, [settled])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!on && rows.length > 0 && T.current?.id === 'on' && knife < 0.01) { setOffSeen(true); T.check(id => id === 'on') } }, [on, knife < 0.01])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  type Next = 'switch' | 'I' | 'turns' | 'core' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '电流越大、匝数越多，电磁铁的磁性越强；插入铁芯，磁性大大增强。', next: null }
    if (knife > 0.01 && knife < 0.99) return { hint: on ? '闭合开关…' : '断开开关…', next: null }
    if (coreK > 0.001 && coreK < 0.999) return { hint: '抽出铁芯…', next: null }
    if (on && !settled) return { hint: '看大头针…', next: null }
    if (task.id === 'on') return !on ? { hint: '50 匝、0.5 A。闭合开关，看电磁铁能不能吸起大头针', next: 'switch' } : { hint: `吸起了 ${n} 枚。断开开关看看`, next: 'switch' }
    if (task.id === 'current') return I !== Q.highI ? { hint: '移动滑片，把电流调到 1.0 A', next: 'I' } : { hint: '闭合开关，数一数吸起几枚', next: 'switch' }
    if (task.id === 'turns') return turns !== 100 ? { hint: '电流还是 1.0 A。断开开关，改接 100 匝的接线柱', next: 'turns' } : { hint: '闭合开关，数一数吸起几枚', next: 'switch' }
    return core ? { hint: '断开开关，把铁芯抽出来', next: 'core' } : { hint: '没有铁芯了。闭合开关，数一数吸起几枚', next: 'switch' }
  })()

  const W = (p: [number, number, number]) => toWorld('l4', p)
  const shownN = live ? n : 0
  const labels: Label[] = [
    { id: 'n1', at: W([3.4, 13, 0]), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '电磁铁（铁芯可抽出）' },
    { id: 'n2', at: W([L4.rheo[0] - 8, 1.5, L4.rheo[2] + 4]), ax: 0.5, name: true, className: 'scene-name', children: '滑动变阻器' },
    { id: 'pins', at: W([-5.5, 3.5, 2]), ax: 1, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: live && settled ? 1 : 0 }, children: <><small>吸起</small>{shownN} 枚</> },
  ]
  return (
    <LabShell title="电与磁" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="电磁铁"
      stage={<Place at="l4" labels={labels}><Bench at="l4"><Scene4 on={on} swing={knife} I={I} n={n} turns={turns} core={core} coreK={coreK} p={slider} /></Bench></Place>}
      lesson={<LessonBlock no="4" title="电磁铁" concept="电流越大、匝数越多，电磁铁磁性越强" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>内部插有铁芯的螺线管叫<b className="text-white">电磁铁</b>。铁芯被通电螺线管的磁场磁化，也变成磁体，使磁性大大增强。</p>
          <p className="mt-3">电磁铁的好处：通电有磁性、断电没有磁性；磁性强弱可以用电流大小控制；磁极可以由电流方向改变。</p>
          <p className="mt-3">探究磁性强弱和电流、匝数的关系，用的是<b className="text-white">控制变量法</b>：比较匝数时电流要相同，比较电流时匝数要相同。磁性强弱看吸起大头针的多少，这是转换法。</p>
          <p className="mt-3 text-[13.5px] text-white/65">电磁起重机靠电磁铁吊起钢材；电磁继电器用电磁铁控制电路的通断，见拓展课。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四组都数过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">电流越大、匝数越多，电磁铁的磁性越强</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">通电有磁性，断电没有；抽出铁芯，磁性弱得多。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[12.5px] text-white/55">吸起的大头针（示意）</div>
            <div className="mt-1 text-[46px] leading-none font-bold tabular-nums">{live && settled ? shownN : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">枚</span></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol="I" value={live ? I.toFixed(1) : '0.0'} unit="A" />
            <ParamTile symbol="N" value={String(turns)} unit="匝" />
            <ParamTile symbol="铁芯" value={core ? '有' : '无'} unit="" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">记录</h2>
          <table className="mt-2 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/50"><th className="py-1 text-left font-normal">匝数</th><th className="text-left font-normal">电流</th><th className="text-left font-normal">铁芯</th><th className="text-right font-normal">大头针</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-white/10"><td className="py-1.5">{r.turns}</td><td>{r.I.toFixed(1)} A</td><td>{r.core ? '有' : '无'}</td><td className="text-right font-semibold">{r.n} 枚</td></tr>)}
              {!rows.length && <tr className="border-t border-white/10 text-white/40"><td className="py-1.5" colSpan={4}>闭合开关后自动记下</td></tr>}</tbody>
          </table>
          {offSeen && <p className="mt-2 text-[12.5px] text-white/55">断开开关后，大头针全部掉了下来。</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'switch'} pulse={next === 'switch'} onClick={() => setOn(o => !o)} disabled={(knife > 0.01 && knife < 0.99) || (coreK > 0.001 && coreK < 0.999)}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton pulse={next === 'I'} onClick={() => setI(Q.highI)} disabled={I === Q.highI || !T.done.on}>把电流调到 1.0 A</LabButton>
        <LabButton pulse={next === 'core'} onClick={() => { setOn(false); setCore(false) }} disabled={!core || !T.done.turns}>抽出铁芯</LabButton>
      </>}
      extras={<Control label="线圈"><Segmented label="线圈匝数" pulse={next === 'turns'} want={next === 'turns' ? '100' : null} value={String(turns)} disabled={!T.done.current} onChange={v => { setOn(false); setTurns(Number(v) as 50 | 100) }} options={[{ value: '50', label: '50 匝' }, { value: '100', label: '100 匝' }]} /></Control>}
    />
  )
}
