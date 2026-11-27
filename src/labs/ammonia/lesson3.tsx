// 合成氨工厂 · 第 3 课 化学平衡状态。合成塔朝镜头剖开：厚壁的承压外筒、内件、两层催化剂床、床间和底部的换热器，气流从环隙下去、穿过床层出来。
// 旁边的放大窗是催化剂表面：N₂ 和 H₂ 吸附上去生成 NH₃（正反应），NH₃ 也在分解回去（逆反应）。面板上两条速率曲线，到平衡时重合。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Lens } from './molecules'
import { useRun } from './parts'
import { CV } from './plant'
import { START3, T_EQ, atEq, fmt2, rates, series } from './physics'
import { COL, MiniChart, type ChartSpec } from './screen'
import { Place } from './world'

type Start = keyof typeof START3
const TASKS: Task[] = [
  { id: 'go', text: '通入氮气和氢气，开始反应', note: '一开始只有正反应，v正 最大；随着 NH₃ 生成，逆反应也开始了' },
  { id: 'eq', text: '等到正、逆反应速率相等', note: 'v正 = v逆，各物质的浓度不再改变：达到化学平衡状态' },
  { id: 'rev', text: '换成只通入氨，再做一遍', note: '从逆反应开始，也达到同一个平衡' },
]
const RATE = 5, SEC = T_EQ / RATE, N = 240
const SER = { fwd: series(START3.fwd, T_EQ, N), rev: series(START3.rev, T_EQ, N) }
const LENS = { at: [CV.x + 6.6, 12.6, CV.z + 1.2] as [number, number, number], R: 3.4 }
/** 分子数：1 mol/L 画成 10 个；反应计数（示意）：v 每 0.01 mol/(L·min) 画成每秒 1.2 次 */
const PER = 10, VIS = 120

export default function Lesson3() {
  const T = useTasks('gewu:ammonia:3', TASKS)
  const [start, setStart] = useState<Start>('fwd')
  const [eqAt, setEqAt] = useState<number | null>(null)
  const clock = useRun(SEC)
  const t = clock.k * T_EQ
  const i = Math.min(N, Math.round(clock.k * N)), ser = SER[start], c = ser[i]
  const r = rates(c), eq = clock.k > 0 && atEq(c)
  useEffect(() => {
    if (!eq || eqAt !== null) return
    setEqAt(t)
    T.check(id => (start === 'fwd' ? id === 'eq' : id === 'rev'))
  }, [eq])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setStart('fwd'); setEqAt(null); clock.snap(0); T.reset() }
  const go = () => { setEqAt(null); clock.run(); if (start === 'fwd') T.check(id => id === 'go') }
  const choose = (k: Start) => { if (clock.busy) return; setStart(k); setEqAt(null); clock.snap(0) }

  const task = T.current?.id
  const running = clock.busy
  const want: Start = task === 'rev' ? 'rev' : 'fwd'
  const next: 'seg' | 'go' | null = !task ? null : running ? null : start !== want ? 'seg' : (task === 'eq' && clock.k > 0) ? null : 'go'
  const hint = !task ? '平衡时正逆反应都在进行，速率相等，是动态平衡。'
    : running && eqAt === null ? (start === 'fwd' ? '看两条速率曲线：v正 在减小，v逆 在增大…' : '只有氨：一开始只有逆反应，看两条速率曲线…')
    : running ? '两条速率曲线重合了，浓度不再改变'
    : start !== want ? '换成“只有氨”'
    : start === 'fwd' ? '通入氮气和氢气，开始反应' : '通入氨，开始反应'

  const n = i
  const xs = useMemo(() => Array.from({ length: N + 1 }, (_, j) => j / N * T_EQ), [])
  const vF = ser.map(s => rates(s).fwd), vR = ser.map(s => rates(s).rev)
  const vMax = start === 'fwd' ? 0.18 : 0.06
  const vSpec: ChartSpec = { x: { max: T_EQ, label: 't / min', ticks: [0, 20, 40, 60, 80] }, y: { max: vMax, label: 'v / (mol·L⁻¹·min⁻¹)', ticks: start === 'fwd' ? [0, 0.05, 0.1, 0.15] : [0, 0.02, 0.04, 0.06], fmt: v => v.toFixed(2) },
    lines: [{ color: COL.fwd, xs: xs.slice(0, n + 1), ys: vF.slice(0, n + 1) }, { color: COL.rev, xs: xs.slice(0, n + 1), ys: vR.slice(0, n + 1) }] }
  const cSpec: ChartSpec = { x: { max: T_EQ, label: 't / min', ticks: [0, 20, 40, 60, 80] }, y: { max: 3.2, label: 'c / (mol·L⁻¹)', ticks: [0, 1, 2, 3] },
    lines: [{ color: COL.h2, xs: xs.slice(0, n + 1), ys: ser.slice(0, n + 1).map(s => s.h2) }, { color: COL.n2, xs: xs.slice(0, n + 1), ys: ser.slice(0, n + 1).map(s => s.n2) }, { color: COL.nh3, xs: xs.slice(0, n + 1), ys: ser.slice(0, n + 1).map(s => s.nh3) }] }

  const c0 = START3[start]
  const labels: Label[] = [
    { id: 'lens', at: [LENS.at[0], LENS.at[1] + LENS.R + 0.2, LENS.at[2]], ax: 0.5, className: 'scene-name -translate-y-full', children: '催化剂表面（放大示意）' },
    { id: 'f', at: [LENS.at[0] - 0.15, LENS.at[1] - LENS.R - 0.3, LENS.at[2]], ax: 1, className: 'scene-tag', style: { borderLeft: `4px solid ${COL.fwd}` }, children: <><small>正反应</small>N₂ + 3H₂ → 2NH₃</> },
    { id: 'r', at: [LENS.at[0] + 0.15, LENS.at[1] - LENS.R - 0.3, LENS.at[2]], ax: 0, className: 'scene-tag', style: { borderLeft: `4px solid ${COL.rev}` }, children: <><small>逆反应</small>2NH₃ → N₂ + 3H₂</> },
    { id: 'b1', at: [CV.x - 1.5, (CV.bed1[0] + CV.bed1[1]) / 2, CV.z + 0.1], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '一段催化剂床' },
    { id: 'hx', at: [CV.x - 1.5, (CV.hx[0] + CV.hx[1]) / 2, CV.z + 0.1], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '底部换热器（换热管）' },
    { id: 'mx', at: [CV.x - 1.5, (CV.mid[0] + CV.mid[1]) / 2, CV.z + 0.1], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '床间换热器' },
    { id: 'b2', at: [CV.x - 1.5, (CV.bed2[0] + CV.bed2[1]) / 2, CV.z + 0.1], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '二段催化剂床' },
    { id: 'sh', at: [CV.x - 1.7, 19.6, CV.z], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '承压外筒（厚壁）' },
    ...(eqAt !== null ? [{ id: 'eq', at: [LENS.at[0], LENS.at[1] - LENS.R - 1.5, LENS.at[2]] as [number, number, number], ax: 0.5, className: 'scene-tag key', children: <>v正 = v逆</> }] : []),
  ]
  return (
    <LabShell title="合成氨工厂" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="合成塔"
      stage={<Place at="l3" labels={labels} cut temp={450} flow={running || clock.k > 0 ? 1 : 0.35} speed={1}>
        {/* 剖面前方一盏补光，把剖开的塔身照亮 */}
        <pointLight position={[CV.x - 1.5, 13, CV.z + 6]} intensity={2.2} distance={24} decay={0} color="#fff4e6" />
        <Lens at={LENS.at} R={LENS.R} rotY={-0.2} point={[CV.x + 0.7, 15.6, CV.z + 0.1]} surface counts={{ n2: Math.round(c0.n2 * PER), h2: Math.round(c0.h2 * PER), nh3: Math.round(c0.nh3 * PER) }} snap={start + (clock.k === 0 ? '0' : '1')}
          target={Math.round(c.nh3 * PER)} fwd={Math.min(4, r.fwd * VIS)} rev={Math.min(4, r.rev * VIS)} running={running || clock.k > 0} tint="#0d1b26" />
      </Place>}
      lesson={<LessonBlock no="3" title="化学平衡状态" concept="正逆反应速率相等，浓度就不再变" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>在同一条件下，既能向正反应方向进行、又能向逆反应方向进行的反应，叫<b className="text-white">可逆反应</b>，用“⇌”表示。合成氨就是可逆反应：N₂ 和 H₂ 不能全部变成 NH₃。</p>
          <p className="mt-3">一定条件下，可逆反应进行到<b className="text-white">正反应速率和逆反应速率相等</b>时，反应物和生成物的浓度都不再改变，这种状态叫<b className="text-white">化学平衡状态</b>。这时反应并没有停止，正逆反应都还在进行，是一种<b className="text-white">动态平衡</b>。</p>
          <p className="mt-3">同样的条件下，从正反应开始（N₂ 和 H₂），或者从逆反应开始（相当量的 NH₃），最后达到同一个平衡状态。这一课的速率按简化的速率式算，平衡浓度和下一课的平衡常数一致。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">v正 = v逆，各物质的浓度不再改变</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">从 1、3 mol/L 的 N₂、H₂ 开始，或者从 2 mol/L 的 NH₃ 开始，最后都是 c(N₂) = 0.50、c(H₂) = 1.50、c(NH₃) = 1.00 mol/L。平衡时正逆反应仍在进行，是动态平衡。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          <ParamTile symbol={<span style={{ color: COL.fwd }}>v正</span>} value={r.fwd.toFixed(3)} unit="mol/(L·min)" />
          <ParamTile symbol={<span style={{ color: COL.rev }}>v逆</span>} value={r.rev.toFixed(3)} unit="mol/(L·min)" />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">速率-时间图 <span style={{ color: COL.fwd }}>— 正</span> <span style={{ color: COL.rev }}>— 逆</span></h2>
        <MiniChart spec={vSpec} height={136} />
        <h2 className="mt-2 text-[12.5px] text-white/55">浓度-时间图 <span style={{ color: COL.n2 }}>N₂</span> <span style={{ color: COL.h2 }}>H₂</span> <span style={{ color: COL.nh3 }}>NH₃</span></h2>
        <MiniChart spec={cSpec} height={136} />
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[13px]">
          {([['N₂', c.n2], ['H₂', c.h2], ['NH₃', c.nh3]] as const).map(([s, v]) => <div key={s} className="rounded-lg bg-white/[0.05] py-1.5"><div className="font-formula text-white/60">{s}</div><div className="text-[16px] font-semibold tabular-nums">{fmt2(v)}</div></div>)}
        </div>
        <p className="mt-2 text-[12.5px] text-white/50">t = {t.toFixed(0)} min · 浓度单位 mol/L</p>
      </Panel>}
      actions={<>
        <LabButton primary pulse={next === 'go'} disabled={running} onClick={go}>{start === 'fwd' ? '通入氮气和氢气' : '通入氨'}</LabButton>
      </>}
      extras={
        <Control label="起始物质">
          <Segmented label="起始物质" pulse={next === 'seg'} want={want} disabled={running} value={start} onChange={k => choose(k as Start)} options={[{ value: 'fwd', label: '氮气和氢气' }, { value: 'rev', label: '只有氨' }]} />
        </Control>
      }
    />
  )
}
