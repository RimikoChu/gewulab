// 合成氨工厂 · 第 1 课 化学反应速率。化验台第一格：小型高压反应釜里充着 1 mol/L 的 N₂ 和 3 mol/L 的 H₂，
// 开始反应后压力表慢慢回落，旁边的显示器画三种物质的浓度-时间曲线；2 min 时记下浓度，算出三种速率。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { useRun } from './parts'
import { FEED, T1, fmt2, pressure, rate1, reading1, run, series } from './physics'
import { RIG, Rig } from './rig'
import { COL, type ChartSpec } from './screen'
import { Place, TOP } from './world'

const TASKS: Task[] = [
  { id: 'go', text: '开始反应，看三种物质的浓度怎么变', note: 'N₂、H₂ 的浓度减小，NH₃ 的浓度增大' },
  { id: 'rec', text: '2 min 时记下三种物质的浓度', note: '2 min 里 N₂ 减少 0.20 mol/L，H₂ 减少 0.60 mol/L，NH₃ 增加 0.40 mol/L' },
  { id: 'v', text: '算出用三种物质表示的速率', note: '速率之比 1 : 3 : 2，等于化学计量数之比' },
]
const SEC = 7
const SER = series(FEED, T1, 60)

export default function Lesson1() {
  const T = useTasks('gewu:ammonia:1', TASKS)
  const [rec, setRec] = useState(false), [calc, setCalc] = useState(false)
  const go = useRun(SEC, () => T.check(id => id === 'go'))
  const t = go.k * T1
  const c = useMemo(() => run(FEED, t), [t])
  const r1 = reading1(), v = rate1()
  const resetAll = () => { go.snap(0); setRec(false); setCalc(false); T.reset() }
  const started = go.busy || go.k > 0, ended = go.k >= 1
  const record = () => { if (!ended || rec) return; setRec(true); T.check(id => id === 'rec') }
  const compute = () => { if (!rec || calc) return; setCalc(true); T.check(id => id === 'v') }

  const task = T.current?.id
  const next = !started ? 'go' : !ended ? null : !rec ? 'rec' : !calc ? 'v' : null
  const hint = !task ? '速率之比等于化学计量数之比。'
    : !started ? '开始反应：釜里充着氮气和氢气'
    : !ended ? '反应进行中，看压力表和屏幕上的三条线…'
    : !rec ? '到 2 min 了。记下三种物质的浓度'
    : '用浓度的变化除以时间，算出三种速率'

  // 屏幕上的曲线：画到现在这一刻
  const n = Math.round(go.k * 60)
  const xs = SER.slice(0, n + 1).map((_, i) => i / 60 * T1)
  const spec: ChartSpec = {
    title: '釜内浓度 c / (mol·L⁻¹)',
    x: { max: T1, label: 't / min', ticks: [0, 0.5, 1, 1.5, 2] },
    y: { max: 3.2, label: '', ticks: [0, 1, 2, 3] },
    lines: [
      { color: COL.h2, xs, ys: SER.slice(0, n + 1).map(s => s.h2), label: 'H₂' },
      { color: COL.n2, xs, ys: SER.slice(0, n + 1).map(s => s.n2), label: 'N₂' },
      { color: COL.nh3, xs, ys: SER.slice(0, n + 1).map(s => s.nh3), label: 'NH₃' },
    ],
    dots: rec ? [{ x: T1, y: r1.h2, color: COL.h2 }, { x: T1, y: r1.n2, color: COL.n2 }, { x: T1, y: r1.nh3, color: COL.nh3 }] : [],
    legend: true,
  }
  const p = pressure(c)
  const labels: Label[] = [
    { id: 'n1', at: [RIG.clave[0] - 0.02, TOP + 0.36, RIG.clave[2]], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '高压反应釜' },
    { id: 'p', at: [RIG.clave[0] + 0.1, TOP + 0.43, RIG.clave[2] + 0.04], ax: 0, className: `scene-tag ${started && !ended ? 'key' : ''} -translate-y-1/2`, children: <><small>压力</small>{p.toFixed(1)} MPa</> },
    { id: 'n2', at: [RIG.ctrl[0], TOP + 0.2, RIG.ctrl[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '控制器' },
    { id: 't', at: [RIG.mon[0], TOP + 0.58, RIG.mon[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>反应时间</small>{t.toFixed(1)} min</> },
  ]
  const row = (sym: string, c0: number, c2: number | null, dv: string | null) => (
    <tr key={sym} className="bg-white/[0.04]"><td className="rounded-l-lg px-2.5 py-1.5 font-formula">{sym}</td><td className="tabular-nums">{fmt2(c0)}</td><td className="tabular-nums">{c2 === null ? '—' : fmt2(c2)}</td><td className="rounded-r-lg pr-2 text-right tabular-nums">{dv ?? '—'}</td></tr>
  )
  return (
    <LabShell title="合成氨工厂" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="高压反应釜"
      stage={<Place at="l1" labels={labels}><Rig p={p} temp={400} heat={1} spec={spec} /></Place>}
      lesson={<LessonBlock no="1" title="化学反应速率" concept="速率是单位时间里浓度的变化" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>化学反应速率用单位时间内反应物浓度的减少或生成物浓度的增加来表示：<span className="font-formula">v = Δc / Δt</span>，单位常用 mol/(L·min) 或 mol/(L·s)。</p>
          <p className="mt-3">同一个反应，用不同的物质表示，速率的数值可能不同，但表示的是同一个反应的快慢。它们之比等于化学方程式中的化学计量数之比：<span className="font-formula">v(N₂) : v(H₂) : v(NH₃) = 1 : 3 : 2</span>。所以说速率时要指明是哪种物质。</p>
          <p className="mt-3">这里算的是 2 min 内的平均速率。釜的容积和温度不变，气体总的物质的量减少，压力就跟着降低。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">v(N₂) : v(H₂) : v(NH₃) = 1 : 3 : 2</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">2 min 内 v(N₂) = {v.n2.toFixed(2)}、v(H₂) = {v.h2.toFixed(2)}、v(NH₃) = {v.nh3.toFixed(2)} mol/(L·min)。数值不同，说的是同一个反应的快慢；速率之比等于化学计量数之比。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-center">
          <div className="font-formula text-[18px] italic text-white/65">v = Δc / Δt</div>
          <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{calc ? v.n2.toFixed(2) : '—'}</div>
          <div className="mt-1.5 text-[13px] text-white/55">v(N₂) · mol/(L·min)</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ParamTile symbol="t" value={t.toFixed(1)} unit="min · 反应时间" />
          <ParamTile symbol="p" value={p.toFixed(1)} unit="MPa · 釜内压力" />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">浓度（mol/L）和速率（mol/(L·min)）</h2>
        <table className="mt-2 w-full border-separate border-spacing-y-1 text-[13.5px]">
          <thead><tr className="text-left text-[12px] text-white/50"><th className="pl-2.5 font-normal">物质</th><th className="font-normal">0 min</th><th className="font-normal">2 min</th><th className="pr-2 text-right font-normal">速率</th></tr></thead>
          <tbody>
            {row('N₂', FEED.n2, rec ? r1.n2 : null, calc ? v.n2.toFixed(2) : null)}
            {row('H₂', FEED.h2, rec ? r1.h2 : null, calc ? v.h2.toFixed(2) : null)}
            {row('NH₃', FEED.nh3, rec ? r1.nh3 : null, calc ? v.nh3.toFixed(2) : null)}
          </tbody>
        </table>
        <p className="mt-3 font-formula text-[14.5px] text-white/80">N₂ + 3H₂ ⇌ 2NH₃</p>
      </Panel>}
      actions={<>
        <LabButton primary={next === 'go'} pulse={next === 'go'} disabled={started} onClick={() => go.run()}>开始反应</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} disabled={!ended || rec} onClick={record}>记录 2 min 的浓度</LabButton>
        <LabButton primary={next === 'v'} pulse={next === 'v'} disabled={!rec || calc} onClick={compute}>算速率</LabButton>
      </>}
      extras={null}
    />
  )
}
