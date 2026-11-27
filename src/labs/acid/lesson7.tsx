// 酸、碱和中和 · 第 7 课 中和反应的应用：污水处理区的中和池（朝镜头剖开）和旁边的加药间。
// 一池 100 m³ 的酸性废水含硫酸 0.005 mol/L，在线 pH 计显示 2.0。先按化学方程式算出要投 37 kg 熟石灰，
// 再分别投 20、37、50 kg：石灰乳从加药管流进池里，搅拌机搅匀，在线 pH 计的读数跟着变。每次投加前换一池新的废水。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Stream } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, seg, useRun } from './parts'
import { DISCHARGE, DOSES, MR, POND, acidMol, canDischarge, limeNeed, meter, pondPH, type Dose } from './physics'
import { DOSE_HOUSE, LIME_TANK, OUTLET, PH_BOX, POND3, type PondWant } from './plant'
import { Place, type V3 } from './world'

const TASKS: Task[] = [
  { id: 'calc', text: '算一算这一池要投多少熟石灰', note: `硫酸 ${acidMol()} mol，要 Ca(OH)₂ ${acidMol()} mol，就是 ${limeNeed().toFixed(1)} kg` },
  { id: 'd20', text: '投 20 kg，看 pH', note: `pH ${meter(pondPH(20))}：熟石灰不够，废水还是酸性` },
  { id: 'd37', text: '投 37 kg，看 pH', note: 'pH 7.0：恰好中和，在 6～9 之间，可以往下走' },
  { id: 'd50', text: '投 50 kg，看 pH', note: `pH ${meter(pondPH(50))}：投多了，废水又成了碱性，也不能排放` },
]
const SEC = 9

export default function Lesson7() {
  const [calc, setCalc] = useState(false)
  const [dose, setDose] = useState<Dose>(20)
  const [last, setLast] = useState<Dose | null>(null)          // 这一池最后投的量；null 是还没投的新废水
  const [rows, setRows] = useState<Dose[]>([])
  const T = useTasks('gewu:acid:7', TASKS)
  const think = useRun(2.2, () => { setCalc(true); T.check(id => id === 'calc') })
  const run = useRun(SEC, () => { setLast(dose); setRows(r => r.includes(dose) ? r : [...r, dose]); T.check(id => id === `d${dose}`) })
  const busy = think.busy || run.busy
  const resetAll = () => { think.snap(0); run.snap(0); setCalc(false); setDose(20); setLast(null); setRows([]); T.reset() }

  // 投加过程：前 0.8 秒放掉上一池、换一池新废水；石灰乳流 1–4.5 秒；搅匀到 8.5 秒
  const t = run.t
  const mix = run.busy ? ease(seg(t, 1.2, 8.4)) : last !== null ? 1 : 0
  const kg = run.busy ? dose : last ?? 0
  const pH = run.busy && t < 0.8 ? pondPH(0) : pondPH(kg * mix)
  const dosing = run.busy && t > 1.0 && t < 4.5
  const pond = useMemo<PondWant>(() => ({ stir: true, dosing, mix: run.busy ? seg(t, 1.0, 8.6) : last !== null ? 1 : 0, ph: meter(pH), milk: kg / 50 }), [dosing, Math.round(t * 10), last, pH, kg])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  const want: Dose = task?.id === 'd37' ? 37 : task?.id === 'd50' ? 50 : 20
  const { hint, next }: { hint: string; next: 'calc' | 'dose' | 'pick' | null } = !task ? { hint: '用熟石灰中和酸性废水：投多少要按化学方程式算，投少了、投多了都不能排放。', next: null }
    : think.busy ? { hint: '按化学方程式算熟石灰的用量…', next: null }
    : run.busy ? { hint: '换一池新的废水，石灰乳流进中和池，搅拌机搅匀…', next: null }
    : task.id === 'calc' ? { hint: '在线 pH 计显示 2.0。先算一算这一池要投多少熟石灰', next: 'calc' }
    : dose !== want ? { hint: `选“${want} kg”`, next: 'pick' }
    : { hint: `投 ${want} kg 熟石灰，看在线 pH 计`, next: 'dose' }

  const ok = canDischarge(pH)
  const labels: Label[] = [
    { id: 'ph', at: [PH_BOX[0] - 2.4, PH_BOX[1] + 0.6, PH_BOX[2]], ax: 1, className: `scene-tag key -translate-y-1/2`, children: <><small>在线 pH 计</small>{meter(pH)}</> },
    { id: 'kg', at: [102, 4.5, -23], ax: 0.5, className: `scene-tag ${run.busy ? 'key' : ''} -translate-y-full transition-opacity`, style: { opacity: run.busy || last !== null ? 1 : 0 }, children: <><small>熟石灰</small>{kg} kg</> },
    { id: 'n1', at: [(POND3.x0 + POND3.x1) / 2, 1.5, POND3.z1 + 2], ax: 0.5, name: true, className: 'scene-name', children: '中和池 · 100 m³ 酸性废水' },
    { id: 'n2', at: [LIME_TANK.x, LIME_TANK.h + 9, LIME_TANK.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '石灰乳罐' },
    { id: 'n3', at: [(DOSE_HOUSE.x0 + DOSE_HOUSE.x1) / 2 + 6, DOSE_HOUSE.ridge + 1, DOSE_HOUSE.z1], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '加药间' },
    { id: 'n4', at: [(POND3.x0 + POND3.x1) / 2 + 3, POND3.h + 9, -30], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '搅拌机' },
  ]
  return (
    <LabShell title="酸、碱和中和" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="投加熟石灰"
      stage={<Place at="l7" labels={labels} pond={pond}>
        <Stream top={OUTLET as V3} bottom={[OUTLET[0], POND3.water, OUTLET[2]]} r={0.16} on={dosing} color="#f1f2ec" opacity={0.9} />
      </Place>}
      lesson={<LessonBlock no="7" title="中和反应的应用" concept="用熟石灰中和酸性废水" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>化工厂排出的废水常含硫酸等酸性物质，要用碱中和到 pH 6～9 才能排放。熟石灰价格低、来源广，污水厂常把它调成石灰乳来投加：</p>
          <p className="mt-2 tabular-nums">Ca(OH)₂ + H₂SO₄ = CaSO₄ + 2H₂O</p>
          <p className="mt-2">两者按 1 : 1 的分子个数反应。这一池废水 100 m³，含硫酸 0.005 mol/L：硫酸 500 mol，熟石灰也要 500 mol，500 mol × 74 g/mol = 37 kg。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>中和反应的其他应用：用熟石灰改良酸性土壤；服用含氢氧化铝的药物治疗胃酸过多；被蚊虫叮咬后涂肥皂水</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">池子的大小和废水的含酸量是为了算题设定的。真实的废水里还有别的物质，投加量要靠在线 pH 计一边测一边调。搅匀的过程加快了。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种投加量都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">用熟石灰中和酸性废水</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">按化学方程式算出 37 kg，pH 正好到 7.0；20 kg 不够，50 kg 又太多。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">在线 pH 计</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{meter(pH)}</div>
            <div className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-[13px] font-semibold ${ok ? 'bg-[#35c7b3] text-[#06231f]' : 'bg-white/10 text-white/75'}`}>{ok ? `在 ${DISCHARGE[0]}～${DISCHARGE[1]} 之间` : pH < DISCHARGE[0] ? '酸性，不能排放' : '碱性，不能排放'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="V" value={String(POND.vol)} unit="m³ · 一池废水" />
            <ParamTile symbol="c" value={String(POND.cAcid)} unit="mol/L · 硫酸" />
          </div>
          {calc && <div className="hint-in mt-3 rounded-xl bg-white/8 px-3.5 py-3 text-[14px] leading-relaxed tabular-nums">
            <div className="text-white/60">算一算</div>
            <div>n(H₂SO₄) = {POND.vol} m³ × 1000 L/m³ × {POND.cAcid} mol/L = {acidMol()} mol</div>
            <div>n(Ca(OH)₂) = n(H₂SO₄) = {acidMol()} mol</div>
            <div>m = {acidMol()} mol × {MR.CaOH2} g/mol = <b className="text-[#7fe3d4]">{limeNeed().toFixed(1)} kg</b></div>
          </div>}
          {rows.length > 0 && <table className="mt-3 w-full text-center text-[13.5px] tabular-nums">
            <thead><tr className="text-white/55"><th className="pb-1 font-medium">熟石灰</th><th className="pb-1 font-medium">pH</th><th className="pb-1 font-medium">能否排放</th></tr></thead>
            <tbody>{[...rows].sort((a, b) => a - b).map((d, i) => <tr key={d} className={i % 2 ? '' : 'bg-white/[0.04]'}><td className="rounded-l-lg py-1.5">{d} kg</td><td>{meter(pondPH(d))}</td><td className="rounded-r-lg">{canDischarge(pondPH(d)) ? '可以' : '不行'}</td></tr>)}</tbody>
          </table>}
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'calc'} pulse={next === 'calc'} onClick={() => think.run()} disabled={busy || calc}>算投加量</LabButton>
        <LabButton primary={next === 'dose'} pulse={next === 'dose'} onClick={() => run.run()} disabled={busy || !calc}>投加熟石灰</LabButton>
      </>}
      extras={
        <Control label="投加量">
          <Segmented label="投加量" pulse={next === 'pick'} want={String(want)} value={String(dose)} disabled={busy || !calc} onChange={k => setDose(Number(k) as Dose)} options={DOSES.map(d => ({ value: String(d), label: `${d} kg` }))} />
        </Control>
      }
    />
  )
}
