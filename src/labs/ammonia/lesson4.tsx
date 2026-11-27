// 合成氨工厂 · 第 4 课 化学平衡常数。中控室的大屏：左边画这一组的浓度-时间曲线，右边一张表，每做完一组记下平衡浓度、K 和转化率。
// 三组起始浓度不同（N₂ 加倍、一开始就有氨），同一温度下 K 都一样，转化率却不一样。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { useRun } from './parts'
import { KC, Kc, RUNS4, T_EQ, conversion, equilibrium, fmt2, series } from './physics'
import { Board, COL, Screen, drawTable, type ChartSpec } from './screen'
import { HALL, Place, ST } from './world'

const TASKS: Task[] = [
  { id: 'a', text: '第一组：1 mol/L N₂ 和 3 mol/L H₂', note: 'K ≈ 0.59，N₂ 和 H₂ 的转化率都是 50%' },
  { id: 'b', text: '第二组：N₂ 加倍到 2 mol/L', note: 'K 还是约 0.59；H₂ 的转化率升高，N₂ 的反而降低' },
  { id: 'c', text: '第三组：一开始就有 1 mol/L NH₃', note: '起始有生成物，K 仍然约 0.59' },
]
type G = 'a' | 'b' | 'c'
const RATE = 5, SEC = T_EQ / RATE, N = 240
const SER = Object.fromEntries(RUNS4.map(r => [r.key, series(r.c0, T_EQ, N)])) as Record<G, ReturnType<typeof series>>
const EQ = Object.fromEntries(RUNS4.map(r => { const e = equilibrium(r.c0); return [r.key, { e, K: Kc(e), a: conversion(r.c0, e) }] })) as Record<G, { e: ReturnType<typeof equilibrium>; K: number; a: { n2: number; h2: number } }>
const WALL = { x: ST.wall, y: 2.3, z: HALL.z0 + 0.36 }
const pct = (x: number) => `${(x * 100).toFixed(0)}%`

export default function Lesson4() {
  const T = useTasks('gewu:ammonia:4', TASKS)
  const [grp, setGrp] = useState<G>('a')
  const [done, setDone] = useState<G[]>([])
  const clock = useRun(SEC, () => { setDone(d => (d.includes(grp) ? d : [...d, grp])); T.check(id => id === grp) })
  const resetAll = () => { setGrp('a'); setDone([]); clock.snap(0); T.reset() }
  const choose = (k: G) => { if (clock.busy) return; setGrp(k); clock.snap(0) }
  const run = RUNS4.find(r => r.key === grp)!
  const i = Math.min(N, Math.round(clock.k * N)), ser = SER[grp], c = ser[i]

  const task = T.current?.id as G | undefined
  const next: 'seg' | 'go' | null = !task || clock.busy ? null : grp !== task ? 'seg' : 'go'
  const hint = !task ? '温度一定，K 是一个定值，和起始浓度无关。'
    : clock.busy ? '反应进行中，等它达到平衡…'
    : grp !== task ? `换成“${RUNS4.find(r => r.key === task)!.name}”`
    : `${run.name}：开始反应，做到平衡`

  const xs = useMemo(() => Array.from({ length: N + 1 }, (_, j) => j / N * T_EQ), [])
  const spec: ChartSpec = {
    title: `${run.name}  浓度 c / (mol·L⁻¹)`,
    x: { max: T_EQ, label: 't / min', ticks: [0, 20, 40, 60, 80] },
    y: { max: 3.2, label: '', ticks: [0, 1, 2, 3] },
    lines: [
      { color: COL.h2, xs: xs.slice(0, i + 1), ys: ser.slice(0, i + 1).map(s => s.h2), label: 'H₂' },
      { color: COL.n2, xs: xs.slice(0, i + 1), ys: ser.slice(0, i + 1).map(s => s.n2), label: 'N₂' },
      { color: COL.nh3, xs: xs.slice(0, i + 1), ys: ser.slice(0, i + 1).map(s => s.nh3), label: 'NH₃' },
    ],
    legend: true,
  }
  const rows = RUNS4.map(r => done.includes(r.key as G) ? [r.name, fmt2(EQ[r.key as G].e.n2), fmt2(EQ[r.key as G].e.h2), fmt2(EQ[r.key as G].e.nh3), EQ[r.key as G].K.toFixed(2), pct(EQ[r.key as G].a.n2), pct(EQ[r.key as G].a.h2)] : [r.name, '', '', '', '', '', ''])
  const labels: Label[] = [
    { id: 'w', at: [WALL.x - 1.4, WALL.y + 1.35, WALL.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '中控室大屏' },
    { id: 't', at: [WALL.x - 1.4, WALL.y - 1.4, WALL.z + 0.1], ax: 0.5, className: `scene-tag ${clock.busy ? 'key' : ''}`, children: <><small>反应时间</small>{(clock.k * T_EQ).toFixed(0)} min</> },
  ]
  const k = done.includes(grp) ? EQ[grp].K : Kc(c)
  return (
    <LabShell title="合成氨工厂" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="反应"
      stage={<Place at="l4" labels={labels}>
        <mesh position={[WALL.x, WALL.y, WALL.z - 0.06]}><boxGeometry args={[7.5, 2.7, 0.1]} /><meshStandardMaterial color="#14171a" roughness={0.5} metalness={0.3} /></mesh>
        <Screen w={4.3} h={2.4} spec={spec} position={[WALL.x - 1.4, WALL.y, WALL.z]} res={1280} />
        <Board w={2.9} h={2.4} position={[WALL.x + 2.25, WALL.y, WALL.z]} draw={(g, W, H) => drawTable(g, W, H, '平衡时（mol/L）', ['组', 'N₂', 'H₂', 'NH₃', 'K', 'α(N₂)', 'α(H₂)'], rows, [1.6, 1, 1, 1, 1, 1.1, 1.1], RUNS4.findIndex(r => r.key === grp))} />
      </Place>}
      lesson={<LessonBlock no="4" title="化学平衡常数" concept="温度一定，K 就是一个定值" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>在一定温度下，一个可逆反应达到平衡时，生成物浓度幂之积与反应物浓度幂之积的比值是一个常数，叫<b className="text-white">化学平衡常数</b>。对 N₂ + 3H₂ ⇌ 2NH₃：</p>
          <p className="mt-2 text-center font-formula text-[16px]">K = c²(NH₃) / [c(N₂) · c³(H₂)]</p>
          <p className="mt-3">K 只受温度影响，和起始浓度无关。K 越大，反应进行得越完全。某反应物的<b className="text-white">平衡转化率</b> = 该反应物已转化的量 / 起始量。增大一种反应物的浓度，另一种反应物的转化率升高，它自己的转化率降低。</p>
          <p className="mt-3">这里的三组实验在同一个示意温度下进行，K 取约 0.59。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">三组起始浓度不同，K 都约是 {KC.toFixed(2)}</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">温度不变，K 就不变。N₂ 加倍以后，H₂ 的转化率从 {pct(EQ.a.a.h2)} 升到 {pct(EQ.b.a.h2)}，N₂ 自己的转化率从 {pct(EQ.a.a.n2)} 降到 {pct(EQ.b.a.n2)}。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-center">
          <div className="font-formula text-[16px] italic text-white/65">K = c²(NH₃) / [c(N₂)·c³(H₂)]</div>
          <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{clock.k > 0 || done.includes(grp) ? k.toFixed(2) : '—'}</div>
          <div className="mt-1.5 text-[13px] text-white/55">{clock.busy ? '浓度商 Q（还没到平衡）' : done.includes(grp) ? '平衡常数 K' : '开始反应后显示'}</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ParamTile symbol="N₂" value={fmt2(c.n2)} unit="mol/L" />
          <ParamTile symbol="H₂" value={fmt2(c.h2)} unit="mol/L" />
          <ParamTile symbol="NH₃" value={fmt2(c.nh3)} unit="mol/L" />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">三组的起始浓度（mol/L）</h2>
        <table className="mt-2 w-full border-separate border-spacing-y-1 text-[13.5px]">
          <tbody>{RUNS4.map(r => <tr key={r.key} className={r.key === grp ? 'bg-white/10' : 'bg-white/[0.04]'}><td className="rounded-l-lg px-2.5 py-1.5">{r.name}</td><td className="tabular-nums">{fmt2(r.c0.n2)}</td><td className="tabular-nums">{fmt2(r.c0.h2)}</td><td className="rounded-r-lg pr-2 text-right tabular-nums">{fmt2(r.c0.nh3)}</td></tr>)}</tbody>
        </table>
        <p className="mt-1 text-[12px] text-white/45">依次是 N₂、H₂、NH₃</p>
      </Panel>}
      actions={<>
        <LabButton primary pulse={next === 'go'} disabled={clock.busy} onClick={() => clock.run()}>开始反应</LabButton>
      </>}
      extras={
        <Control label="实验组">
          <Segmented label="实验组" pulse={next === 'seg'} want={task ?? null} disabled={clock.busy} value={grp} onChange={k => choose(k as G)} options={RUNS4.map(r => ({ value: r.key as G, label: r.name }))} />
        </Control>
      }
    />
  )
}
