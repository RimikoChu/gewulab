// 合成氨工厂 · 第 2 课 影响化学反应速率的因素。镜头推近第一格的反应釜，旁边一个放大窗里是釜里的分子：
// 蓝色的 N₂、白色的 H₂；能量够高的活化分子带一圈橙色的光，发生有效碰撞时闪一下。换条件（浓度加倍、升到 500 °C、加铁催化剂），各测 10 s。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Lens } from './molecules'
import { useRun } from './parts'
import { COND2, cond2, type Cond2 } from './physics'
import { RIG, Rig } from './rig'
import { Place, TOP } from './world'

const TASKS: Task[] = [
  { id: 'base', text: '在原来的条件下测 10 s', note: '400 °C、没有催化剂：活化分子约占 10%' },
  { id: 'conc', text: '浓度加倍，再测', note: '单位体积里分子多了一倍，活化分子百分数不变，活化分子数加倍' },
  { id: 'hot', text: '升到 500 °C，再测', note: '分子能量升高，活化分子百分数增大' },
  { id: 'cat', text: '加铁催化剂，再测', note: '催化剂降低了活化能，活化分子百分数大大增加' },
]
const ORDER: Cond2[] = ['base', 'conc', 'hot', 'cat']
const SEC = 10
const LENS = { at: [RIG.clave[0] + 0.46, TOP + 0.36, RIG.clave[2] + 0.12] as [number, number, number], R: 0.27 }

export default function Lesson2() {
  const T = useTasks('gewu:ammonia:2', TASKS)
  const [cond, setCond] = useState<Cond2>('base')
  const [rows, setRows] = useState<Cond2[]>([])
  const meas = useRun(SEC, () => { setRows(r => (r.includes(cond) ? r : [...r, cond])); T.check(id => id === cond) })
  const resetAll = () => { setCond('base'); setRows([]); meas.snap(0); T.reset() }
  const cur = cond2(cond), C = COND2[cond]
  const counted = meas.busy ? Math.floor(cur.hits * meas.k) : rows.includes(cond) ? cur.hits : 0
  const choose = (k: Cond2) => { if (meas.busy) return; setCond(k); meas.snap(0) }

  const task = T.current?.id as Cond2 | undefined
  const next: 'seg' | 'go' | null = !task ? null : cond !== task ? 'seg' : meas.busy ? null : 'go'
  const hint = !task ? '活化分子越多，有效碰撞越多，反应越快。'
    : meas.busy ? '正在数有效碰撞…'
    : cond !== task ? `换成“${COND2[task].name}”`
    : `条件是“${C.name}”。测 10 s，数一数有效碰撞`

  const p = cur.p
  const labels: Label[] = [
    { id: 'lens', at: [LENS.at[0], LENS.at[1] - LENS.R - 0.02, LENS.at[2]], ax: 0.5, className: 'scene-name', children: '釜里的分子（放大示意）' },
    { id: 'act', at: [LENS.at[0] - 0.03, LENS.at[1] + LENS.R + 0.03, LENS.at[2]], ax: 1, className: 'scene-tag -translate-y-full', children: <><small>活化分子</small>{(cur.f * 100).toFixed(1)}%</> },
    { id: 'hit', at: [LENS.at[0] + 0.03, LENS.at[1] + LENS.R + 0.03, LENS.at[2]], ax: 0, className: `scene-tag ${meas.busy ? 'key' : ''} -translate-y-full`, children: <><small>有效碰撞</small>{counted} 次</> },
    { id: 'c', at: [RIG.clave[0] - 0.05, TOP + 0.42, RIG.clave[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>釜内</small>{C.t} °C · {p.toFixed(1)} MPa</> },
  ]
  return (
    <LabShell title="合成氨工厂" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="测量"
      stage={<Place at="l2" labels={labels}>
        <Rig p={p} temp={C.t} heat={C.t > 450 ? 1 : 0.7} />
        <Lens at={LENS.at} R={LENS.R} point={[RIG.clave[0] + 0.03, TOP + 0.16, RIG.clave[2] + 0.07]} counts={{ n2: C.n / 4, h2: C.n * 3 / 4, nh3: 0 }} snap={cond} surface={C.cat} speed={cur.speed} active={cur.f} hits={cur.hits / SEC} />
      </Place>}
      lesson={<LessonBlock no="2" title="影响速率的因素" concept="活化分子越多，有效碰撞越多，反应越快" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>反应物分子要发生碰撞才可能反应，但不是每次碰撞都能反应。能量足够高的<b className="text-white">活化分子</b>，以合适的取向相碰，才能发生<b className="text-white">有效碰撞</b>。活化分子比普通分子多出的那部分能量叫<b className="text-white">活化能</b>。</p>
          <p className="mt-3"><b className="text-white">增大浓度</b>：单位体积里的分子数增多，活化分子百分数不变，单位体积的活化分子数增多。<b className="text-white">升高温度</b>：分子能量升高，更多分子成为活化分子，活化分子百分数增大。<b className="text-white">使用催化剂</b>：改变反应的路径，降低活化能，活化分子百分数大大增加。对有气体参加的反应，增大压强相当于增大浓度。</p>
          <p className="mt-3">放大窗里的分子数、百分数和碰撞次数都是按简化模型画的示意，只表示变化的方向和大致倍数。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">活化分子越多，有效碰撞越多，反应越快</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">浓度加倍，活化分子百分数不变、个数加倍；升温和加催化剂，活化分子百分数增大。10 s 里的有效碰撞从 {cond2('base').hits} 次变成 {cond2('conc').hits}、{cond2('hot').hits}、{cond2('cat').hits} 次（示意）。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-center">
          <div className="text-[13px] text-white/60">10 s 内有效碰撞（示意）</div>
          <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{counted}<span className="ml-1 text-[15px] font-medium text-white/55">次</span></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ParamTile symbol="n" value={String(cur.n)} unit="单位体积分子数" />
          <ParamTile symbol="活化" value={`${(cur.f * 100).toFixed(1)}%`} unit="活化分子百分数" />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">测过的条件</h2>
        <table className="mt-2 w-full border-separate border-spacing-y-1 text-[13.5px]">
          <thead><tr className="text-left text-[12px] text-white/50"><th className="pl-2.5 font-normal">条件</th><th className="font-normal">分子数</th><th className="font-normal">活化</th><th className="pr-2 text-right font-normal">碰撞</th></tr></thead>
          <tbody>{ORDER.filter(k => rows.includes(k)).map(k => { const d = cond2(k); return <tr key={k} className="bg-white/[0.04]"><td className="rounded-l-lg px-2.5 py-1.5 whitespace-nowrap">{COND2[k].name}</td><td className="tabular-nums">{d.n}</td><td className="tabular-nums">{(d.f * 100).toFixed(1)}%</td><td className="rounded-r-lg pr-2 text-right tabular-nums">{d.hits}</td></tr> })}</tbody>
        </table>
        {!rows.length && <p className="mt-1 text-[13px] text-white/45">还没有测</p>}
      </Panel>}
      actions={<>
        <LabButton primary pulse={next === 'go'} disabled={meas.busy} onClick={() => meas.run()}>测 10 s</LabButton>
      </>}
      extras={
        <Control label="条件">
          <Segmented label="条件" pulse={next === 'seg'} want={task ?? null} disabled={meas.busy} value={cond} onChange={k => choose(k as Cond2)} options={ORDER.map(k => ({ value: k, label: COND2[k].name }))} />
        </Control>
      }
    />
  )
}
