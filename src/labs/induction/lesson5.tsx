// 电磁感应和电网 · 第 5 课 交流发电机：发电机厂房里剖开的 1 号机。先用盘车把转子慢慢转到中性面（N 极正对高亮的线圈），
// 再转过四分之一周期，最后开机：录波屏上画出正弦形的电动势。读出峰值、有效值、周期和频率。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { GEN, SLOW_T, genEmf, genFlux, genFreq, genPeak, genPeriod, kv } from './physics'
import { R5, Rig5 } from './scene5'
import { CUT_AT, GS } from './gen'
import { Place } from './world'
import { UNITS } from './layout'
import { useRunner } from './anim'

const TAU = Math.PI * 2
const TASKS: Task[] = [
  { id: 'neutral', text: '盘车，把转子转到中性面', note: 'N 极正对线圈：穿过线圈的磁通量最大，电动势却为零' },
  { id: 'quarter', text: '再转过四分之一周期', note: '线圈正对两极之间：磁通量为零，电动势最大' },
  { id: 'run', text: '开机，看两个周期的波形', note: `e = Em sinωt：转子每转过一对磁极，电动势变化一个周期` },
]
const START = TAU * 0.78, TURN = 0.7   // 盘车时转子转得很慢（电角度，每秒 0.7 rad）

export default function Lesson5() {
  const R = useRunner(START)
  const [mode, setMode] = useState<'stop' | 'turn' | 'run'>('stop')
  const [runFrom, setRunFrom] = useState(0)
  const T = useTasks('gewu:induction:5', TASKS)
  const phi = R.shown, busy = mode !== 'stop' && R.moving()
  useEffect(() => { if (mode === 'turn' && !R.moving()) { setMode('stop'); T.check(id => (id === 'neutral' && Math.abs(Math.sin(phi)) < 1e-6) || (id === 'quarter' && Math.abs(Math.cos(phi)) < 1e-6 && !!T.done.neutral)) } })
  useEffect(() => { if (mode === 'run' && phi - runFrom >= TAU * 2) T.check(id => id === 'run' && !!T.done.quarter) }, [phi])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { R.set(START); setMode('stop'); T.reset() }
  /** 盘车到下一个中性面（或再转四分之一周期） */
  const turnTo = (k: 'neutral' | 'quarter') => { const q = TAU / 4, g = k === 'neutral' ? Math.ceil(R.get() / TAU - 1e-9) * TAU : Math.floor(R.get() / q + 1e-6) * q + q; R.to(g, TURN); setMode('turn') }
  const toggleRun = () => { if (mode === 'run') { R.stop(); setMode('stop') } else { setRunFrom(R.get()); R.run(TAU / SLOW_T); setMode('run') } }

  const task = T.current
  type Next = 'neutral' | 'quarter' | 'run' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '线圈里的电动势按正弦规律变化：e = Em sinωt。', next: null }
    if (mode === 'turn') return { hint: '盘车慢慢转动转子…', next: null }
    if (task.id === 'neutral') return { hint: '盘车，把转子转到中性面', next: 'neutral' }
    if (task.id === 'quarter') return { hint: '再转过四分之一周期', next: 'quarter' }
    return mode === 'run' ? { hint: '发电机在转，看录波屏上的两条线…', next: null } : { hint: '开机，看电动势的波形', next: 'run' }
  })()

  const e = genEmf(phi), F = genFlux(phi)
  const c = [UNITS[0] + (GS.Ri + 0.2) * Math.cos(CUT_AT), GS.y1 + 0.5, (GS.Ri + 0.2) * Math.sin(CUT_AT)] as [number, number, number]
  const labels: Label[] = [
    { id: 'c', at: c, ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>e</small>{(e / 1e3).toFixed(1)} kV</> },
    { id: 'n1', at: [UNITS[0] + (GS.Ri - 0.4) * Math.cos(CUT_AT + 0.5), GS.y0 + 0.4, (GS.Ri - 0.4) * Math.sin(CUT_AT + 0.5)], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '转子磁极（红 N 蓝 S）' },
    { id: 'n2', at: [c[0] + 0.3, GS.y0 - 0.2, c[2] + 0.4], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '定子线圈' },
    { id: 'n3', at: [UNITS[0] + R5.screen[0], R5.h + 0.85, R5.screen[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '录波屏' },
  ]
  return (
    <LabShell title="电磁感应和电网" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="1 号机"
      stage={<Place at="l5" cur="l5" labels={labels}><Rig5 phi={R.get} /></Place>}
      lesson={<LessonBlock no="5" title="交流发电机" concept="转子转一圈，电动势按正弦规律变" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>线圈平面与磁场垂直的位置叫<b className="text-white">中性面</b>。在中性面上穿过线圈的磁通量最大，但此刻磁通量不变化，感应电动势为零；转过 90° 时磁通量为零，变化最快，电动势最大。</p>
          <p className="mt-3">从中性面开始计时，<span className="font-formula italic">e = Em sin ωt</span>。线圈在匀强磁场中转动时 Em = NBSω。</p>
          <p className="mt-3">让交变电流和恒定电流分别通过相同的电阻，相同时间内产生的热量相等，这个恒定电流的值叫交变电流的<b className="text-white">有效值</b>。正弦交变电流 U = Em/√2。</p>
          <p className="mt-3">水电站的发电机是磁极转、线圈不动：转子每转过一对磁极，线圈里的电动势变化一个周期。这台 {GEN.pairs} 对磁极，转速 {GEN.rpm} r/min，f = {GEN.pairs} × {GEN.rpm} / 60 = {genFreq()} Hz。画面放慢了。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">中性面、四分之一周期、波形都看过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">e = Em sinωt，有效值 U = Em/√2</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">中性面上磁通量最大、电动势为零。这台机组 Em ≈ {(genPeak() / 1e3).toFixed(1)} kV，有效值约 {kv(GEN.U)}，周期 {genPeriod()} s，频率 {genFreq()} Hz。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">e = Em sin ωt</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{(e / 1e3).toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">kV</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">磁通量 {F >= 0 ? '' : '−'}{Math.abs(F).toFixed(2)} Φm{mode === 'run' ? ' · 画面放慢' : ''}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="Em" value={(genPeak() / 1e3).toFixed(1)} unit="kV · 峰值" />
            <ParamTile symbol="U" value={(GEN.U / 1e3).toFixed(0)} unit="kV · 有效值（约）" />
            <ParamTile symbol="T" value={genPeriod().toFixed(2)} unit="s · 周期" />
            <ParamTile symbol="f" value={genFreq().toFixed(0)} unit="Hz · 频率" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'neutral'} pulse={next === 'neutral'} onClick={() => turnTo('neutral')} disabled={busy || mode === 'run'}>盘车到中性面</LabButton>
        <LabButton primary={next === 'quarter'} pulse={next === 'quarter'} onClick={() => turnTo('quarter')} disabled={busy || mode === 'run' || !T.done.neutral}>转过四分之一周期</LabButton>
        <LabButton primary={next === 'run'} pulse={next === 'run'} onClick={toggleRun} disabled={mode === 'turn' || !T.done.quarter}>{mode === 'run' ? '停机' : '开机'}</LabButton>
      </>}
      extras={null}
    />
  )
}
