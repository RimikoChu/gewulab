// 带电粒子在磁场中 · 第 7 课 回旋加速器：大厅东头的回旋加速器。开始加速，质子从中心螺旋着走到 D 形盒边缘引出；
// 去控制台看示波器，质子每次过缝都正好赶上电压反向；电压加倍，圈数减半，最大动能不变；换大的 D 形盒，最大动能变大。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { CYCLO, E, MEV, cycloEk, cycloFreq, cycloTurns, orbitPeriod } from './physics'
import { HALF, R7, Rig7, spiral } from './scene7'
import { Place } from './world'
import { ST } from './layout'
import { useClock, useSettled } from './anim'

type Rk = '0.30' | '0.50'
const U0 = CYCLO.U, [RA, RB] = CYCLO.radii
const mev = (R: number) => (cycloEk(R) / MEV).toFixed(R < 0.4 ? 2 : 1)
const TASKS: Task[] = [
  { id: 'run', text: '开始加速，看质子怎么走', note: `质子转了 ${cycloTurns(RA)} 圈，从 D 形盒边缘引出，动能 ${mev(RA)} MeV` },
  { id: 'sync', text: '看示波器上的交变电压', note: `质子每次过缝，电压都正好反向：交变电压的周期等于回旋周期 ${(orbitPeriod('proton', CYCLO.B) * 1e9).toFixed(1)} ns` },
  { id: 'u2', text: '把电压加倍，再加速一次', note: `只转了 ${cycloTurns(RA, 2 * U0)} 圈，引出时的动能还是 ${mev(RA)} MeV` },
  { id: 'big', text: '换成半径 0.50 m 的 D 形盒，再加速', note: `动能增大到 ${mev(RB)} MeV：最大动能由 D 形盒半径和磁场决定` },
]
const X = ST.l7

export default function Lesson7() {
  const [rk, setRk] = useState<Rk>('0.30')
  const [U, setU] = useState(U0)
  const [run, setRun] = useState<string | null>(null)   // 正在加速的那一次的设置
  const [scope, setScope] = useState(false)
  const T = useTasks('gewu:bfield:7', TASKS)
  const clock = useClock(0.1)
  const R = Number(rk), key = `${rk}-${U}`
  const sp = spiral(R, U)
  const running = run === key, finished = running && clock.tick >= sp.end + 0.5
  const half = running ? Math.min(sp.halves.length, Math.floor(Math.max(0, clock.tick) / HALF)) : 0
  const atScope = useSettled(`${scope}`, 4500) && scope
  const start = () => { setRun(key); clock.start() }
  const resetAll = () => { setRk('0.30'); setU(U0); setRun(null); setScope(false); clock.stop(); T.reset() }
  useEffect(() => {
    if (!finished) return
    T.check(id => (id === 'run' && R === RA)
      || (id === 'u2' && U === 2 * U0 && R === RA && !!T.done.sync)
      || (id === 'big' && R === RB && !!T.done.u2))
  }, [finished])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (atScope) T.check(id => id === 'sync') }, [atScope])   // eslint-disable-line react-hooks/exhaustive-deps
  // 去看示波器时重新加速一次，屏上的波形是动的
  useEffect(() => { if (scope) start() }, [scope])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  type Next = 'run' | 'scope' | 'u' | 'r' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '最大动能由 D 形盒半径和磁场决定，和电压无关。', next: null }
    if (task.id === 'sync') return scope ? { hint: '看质子过缝时电压的方向…', next: null } : { hint: '看示波器上的交变电压', next: 'scope' }
    if (scope) return { hint: '回到加速器', next: 'scope' }
    if (task.id === 'u2' && U !== 2 * U0) return { hint: '把电压加倍', next: 'u' }
    if (task.id === 'big' && R !== RB) return { hint: '换成半径 0.50 m 的 D 形盒', next: 'r' }
    if (running && !finished) return { hint: '质子在加速，一圈圈往外走…', next: null }
    if (running && finished) return { hint: '质子引出来了…', next: null }
    return { hint: task.id === 'run' ? '开始加速，看质子怎么走' : '开始加速', next: 'run' }
  })()

  const turns = Math.ceil(half / 2), ek = running ? Math.min(cycloEk(R), half * E * U) : 0
  const labels: Label[] = [
    { id: 'n1', at: [X - 0.75, R7.y + 0.62, 0.0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电磁铁' },
    { id: 'n2', at: [X + R * 0.6, R7.y + 0.06, -R * 0.5], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: 'D 形盒' },
    { id: 'n3', at: [X, 1.95, -1.25], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '高频电源' },
    { id: 'n4', at: [X + R7.desk[0] + 0.3, 1.2, R7.desk[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '控制台和示波器' },
    { id: 'ek', at: [X + sp.exitDir * (R + 0.5), R7.y + 0.06, sp.exitZ], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: finished && !scope ? 1 : 0 }, children: <><small>引出</small>{mev(R)} MeV</> },
  ]
  return (
    <LabShell title="带电粒子在磁场中" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="回旋加速器"
      stage={<Place at={scope ? 'l7s' : 'l7'} cur="l7" labels={labels}>
        <Rig7 R={R} U={U} run={running} clock={clock.now} />
      </Place>}
      lesson={<LessonBlock no="7" title="回旋加速器" concept="最大动能由 D 形盒半径和磁场决定" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>两个 D 形盒之间留一条窄缝，缝里加交变电压；盒内没有电场，只有垂直盒面的匀强磁场。质子在盒内转半圈，到缝里被电场加速一次，速度变大，下一个半圈的半径也变大。</p>
          <p className="mt-3">质子转半圈的时间 T/2 = πm/(qB) 与速度无关，所以交变电压的周期只要等于回旋周期，质子每次到缝里，电压都正好反向，能一直被加速：</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">f = qB / (2πm)</p>
          <p className="mt-3">质子走到 D 形盒边缘（半径 R）时速度最大：</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">E<sub>k</sub> = q²B²R² / (2m)</p>
          <p className="mt-3">它只由 B 和 R 决定。电压越大，每次加得越多，转的圈数越少，但引出时的动能不变。</p>
          <p className="mt-3 text-white/60">质子转一圈只要几十纳秒，画面放慢了。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四件事都做完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">E<sub>k</sub> = q²B²R²/(2m)：最大动能由 D 形盒半径和磁场决定</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">R = {RA} m 时 {mev(RA)} MeV，电压加倍还是 {mev(RA)} MeV，只是圈数从 {cycloTurns(RA)} 圈变成 {cycloTurns(RA, 2 * U0)} 圈；R = {RB} m 时 {mev(RB)} MeV。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">E<sub>k</sub> = q²B²R² / (2m)</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{finished ? mev(R) : running ? (ek / MEV).toFixed(2) : '0'}<span className="ml-1 text-[15px] font-medium text-white/55">MeV</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">{finished ? `最大动能 · 转了 ${cycloTurns(R, U)} 圈` : running ? `第 ${turns} 圈` : `这只 D 形盒最多加到 ${mev(R)} MeV`}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="B" value={CYCLO.B.toFixed(1)} unit="T · 竖直向上" />
            <ParamTile symbol="R" value={R.toFixed(2)} unit="m · D 形盒半径" />
            <ParamTile symbol="U" value={(U / 1000).toFixed(0)} unit="kV · 交变电压" />
            <ParamTile symbol="f" value={(cycloFreq() / 1e6).toFixed(1)} unit="MHz · 交变电压的频率" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'run'} pulse={next === 'run'} onClick={start} disabled={scope}>开始加速</LabButton>
        <LabButton pulse={next === 'scope'} onClick={() => setScope(s => !s)} disabled={!T.done.run}>{scope ? '回到加速器' : '看示波器'}</LabButton>
        <LabButton pulse={next === 'u'} onClick={() => { setU(u => (u === U0 ? 2 * U0 : U0)); setRun(null); clock.stop() }} disabled={!T.done.sync || scope}>{U === U0 ? '电压加倍' : '电压还原'}</LabButton>
      </>}
      extras={<Control label="D 形盒半径"><Segmented label="D 形盒半径" pulse={next === 'r'} want={next === 'r' ? '0.50' : null} value={rk} onChange={k => { setRk(k as Rk); setRun(null); clock.stop() }} disabled={!T.done.u2 || scope} options={[{ value: '0.30', label: '0.30 m' }, { value: '0.50', label: '0.50 m' }]} /></Control>}
    />
  )
}
