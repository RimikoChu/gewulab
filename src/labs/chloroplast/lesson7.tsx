// 光反应和暗反应 · 第 7 课 影响光合速率的因素：一次只改一个条件（光照强度、CO₂ 浓度、温度），测出净光合速率的曲线，找出补偿点、饱和点和最适温度。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import type { V3 } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { FACTORS, bestTemp, compensation, curve, netOf, saturation, type Factor } from './physics'
import { CHAMBER, LAMP_Y, RateRig } from './scene7'
import { Chart, Finale, H } from './ui'
import { VOICE } from './voice'
import { BZ, M, Place, ST, TOP } from './world'

const TASKS: Task[] = [
  { id: 'light', text: '逐步增强光照，测出曲线，标出关键点', note: '光补偿点：光合速率等于呼吸速率；光饱和点：再增强光照，速率不再升高' },
  { id: 'co2', text: '改成逐步提高 CO₂ 浓度，再测一条', note: 'CO₂ 浓度升高，速率先升后平，也有补偿点和饱和点' },
  { id: 'temp', text: '改成逐步升高温度，再测一条', note: '温度通过影响酶的活性影响光合速率，有一个最适温度' },
]
const N = 40, ORDER: Factor[] = ['light', 'co2', 'temp']
const CURVES = { light: curve('light', N), co2: curve('co2', N), temp: curve('temp', N) }
const fmt = (f: Factor, x: number) => f === 'temp' ? x.toFixed(0) : x.toFixed(0)
function marksOf(f: Factor) {
  if (f === 'temp') { const t = bestTemp(); return [{ x: t, y: netOf('temp', t), name: `最适温度 ${t.toFixed(0)} ℃` }] }
  const c = compensation(f), s = saturation(f)
  return [{ x: c, y: 0, name: f === 'light' ? '光补偿点' : 'CO₂ 补偿点', color: '#8fc7ff' }, { x: s, y: netOf(f, s), name: f === 'light' ? '光饱和点' : 'CO₂ 饱和点' }]
}

export default function Lesson7() {
  const [factor, setFactor] = useState<Factor>('light')
  const [at, setAt] = useState<Record<Factor, number>>({ light: -1, co2: -1, temp: -1 })     // 每条曲线测到第几个点
  const [marked, setMarked] = useState<Record<Factor, boolean>>({ light: false, co2: false, temp: false })
  const [running, setRunning] = useState(false)
  const T = useTasks('gewu:chloroplast:7', TASKS)
  useEffect(() => { if (!running) return; const t = setInterval(() => setAt(a => { const n = Math.min(N, a[factor] + 1); if (n === N) setRunning(false); return { ...a, [factor]: n } }), 110); return () => clearInterval(t) }, [running, factor])
  useEffect(() => { T.check(id => marked[id as Factor]) }, [marked])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setFactor('light'); setAt({ light: -1, co2: -1, temp: -1 }); setMarked({ light: false, co2: false, temp: false }); setRunning(false); T.reset() }
  const task = T.current, F = FACTORS[factor], i = at[factor], done = i === N, pts = CURVES[factor]
  const x = i < 0 ? F.range[0] : pts[i].x, y = i < 0 ? null : pts[i].y
  const { hint, next }: { hint: string; next: 'run' | 'mark' | 'pick' | null } = (() => {
    if (!task) return { hint: '光照强度、CO₂ 浓度、温度都影响光合速率。', next: null }
    if (running) return { hint: `${F.name}一点点${factor === 'temp' ? '升高' : '加大'}，光合仪在记录…`, next: null }
    if (task.id !== factor) return { hint: `把要改变的条件换成“${FACTORS[task.id as Factor].name}”`, next: 'pick' }
    if (!done) return { hint: `叶室夹住一片叶子，其他条件不变，只改${F.name}。按“开始测量”`, next: 'run' }
    return { hint: '曲线测出来了。按“标出关键点”', next: 'mark' }
  })()
  const light = factor === 'light' ? x / 100 : FACTORS.light.std / 100
  const O: V3 = [ST.l7, TOP, BZ]
  const labels: Label[] = [
    { id: 'ch', at: [O[0] + CHAMBER[0] - 0.05 * M, O[1] + CHAMBER[1], O[2] + CHAMBER[2] + 0.04 * M], ax: 1, name: true, className: 'scene-name -translate-x-1 -translate-y-1/2', children: '叶室' },
    { id: 'la', at: [O[0] + CHAMBER[0], O[1] + LAMP_Y + 0.03 * M, O[2] + CHAMBER[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '补光灯' },
    { id: 'an', at: [O[0] + 0.2 * M, O[1] + 0.135 * M, O[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>{F.name}</small>{fmt(factor, x)}{F.unit}<small className="ml-3">净光合速率</small>{y === null ? '—' : y.toFixed(1)}</> },
    { id: 'gas', at: [O[0] + 0.4 * M, O[1] + 0.33 * M, O[2] - 0.1 * M], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: 'CO₂ 钢瓶' },
  ]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="测量"
      stage={<Place at="rate" labels={labels}><group position={O}><RateRig light={light} a={fmt(factor, x)} b={y === null ? '--' : y.toFixed(1)} /></group></Place>}
      lesson={<LessonBlock no="7" title="影响光合速率的因素" concept="光照、CO₂ 浓度、温度都影响光合速率" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>光合作用的强度可以用单位时间内吸收 CO₂ 或放出 O₂ 的量表示。测到的是<b className="text-white">净光合速率</b>：总光合速率减去呼吸速率。</p>
          <p className="mt-2"><b className="text-white">光照强度</b>：黑暗中只有呼吸作用；光照增强到光合速率等于呼吸速率时，叫光补偿点；再增强到速率不再升高时，叫光饱和点。光照主要影响光反应。</p>
          <p className="mt-2"><b className="text-white">CO₂ 浓度</b>：CO₂ 是暗反应的原料，浓度升高，速率先升后平。<b className="text-white">温度</b>：通过影响酶的活性影响光合速率，过高或过低都会使速率下降。</p>
        </>} />}
      finale={T.finale && <Finale kicker="三条曲线都测完了" title="光照强度、CO₂ 浓度、温度都影响光合速率" text={`这株菠菜的光补偿点约 ${compensation('light').toFixed(0)}、光饱和点约 ${saturation('light').toFixed(0)}（相对值），最适温度约 ${bestTemp().toFixed(0)} ℃。生产上可以通过适当增强光照、提高 CO₂ 浓度、控制温度来提高产量。`} notes="曲线由简化的模型算出，数值是相对值；不同的植物，补偿点、饱和点和最适温度各不相同。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>净光合速率 — {F.name}</H>
          <Chart pts={pts} upto={i} xr={F.range} yr={[-4, 12]} xLabel={F.axis} yLabel="净光合速率（相对值）" marks={marked[factor] ? marksOf(factor) : []} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol={F.name} value={`${fmt(factor, x)}${F.unit}`} unit={factor === 'temp' ? '叶室温度' : '相对值'} />
            <ParamTile symbol="净光合速率" value={y === null ? '—' : y.toFixed(1)} unit="CO₂ 吸收 · 相对值" />
          </div>
          {marked[factor] && <div className="mt-2 grid grid-cols-2 gap-2">
            {factor === 'temp' ? <ParamTile symbol="最适温度" value={`${bestTemp().toFixed(0)} ℃`} unit="净光合速率最大" />
              : <><ParamTile symbol="补偿点" value={compensation(factor).toFixed(0)} unit="光合 = 呼吸" /><ParamTile symbol="饱和点" value={saturation(factor).toFixed(0)} unit="速率不再升高" /></>}
          </div>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'run'} onClick={() => { setAt(a => ({ ...a, [factor]: -1 })); setMarked(m => ({ ...m, [factor]: false })); setRunning(true) }} disabled={running}>开始测量</LabButton>
        <LabButton pulse={next === 'mark'} onClick={() => setMarked(m => ({ ...m, [factor]: true }))} disabled={!done || marked[factor]}>标出关键点</LabButton>
      </>}
      extras={
        <Control label="改变的条件">
          <Segmented label="改变的条件" pulse={next === 'pick'} want={next === 'pick' ? (task!.id as Factor) : null} value={factor} disabled={running} onChange={v => setFactor(v as Factor)} options={ORDER.map(f => ({ value: f, label: FACTORS[f].name }))} />
        </Control>
      }
    />
  )
}
