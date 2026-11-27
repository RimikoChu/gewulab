// 水溶液里的离子平衡 · 第 3 课 水的电离：pH 计、电极架、电热板，三只烧杯（纯水、0.010 mol/L 盐酸、0.010 mol/L NaOH 溶液）。
// 25 °C 纯水 pH 7.00；放到电热板上加热到 50 °C，pH 6.64，但 c(H⁺) 仍等于 c(OH⁻)，还是中性；盐酸和 NaOH 溶液里 c(H⁺)·c(OH⁻) 仍是 1.0×10⁻¹⁴。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass as Panel, Control, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Beaker, LOOK, Thermometer, u } from './gear'
import { ElectrodeStand, HotPlate, PhMeter, Wire } from './rig'
import { Puffs } from './fx'
import { Legend, Micro, type Mix } from './micro'
import { Fin } from './fin'
import { LESSONS, goLesson } from './lessons'
import { armPath, armTo, liftPath, seg, useRun, type Arm } from './parts'
import { KW_T, WATERS, ions, meter, sci, waterPH, type Temp, type WaterKey } from './physics'
import { BZ, SPOT, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l3, Y = TOP, Z = BZ + 0.6
const p = (x: number, y: number, z: number): V3 => [X0 + u(x), Y + u(y), Z + u(z)]
const STAND = { x: 0.0, z: -0.1 }
const CUP: Record<WaterKey, { x: number; z: number }> = { water: { x: -0.1, z: 0.03 }, hcl: { x: 0.0, z: 0.06 }, naoh: { x: 0.1, z: 0.03 } }
const PLATE = { x: 0.2, z: -0.05 }, PLATE_TOP = 0.07
const METER = p(-0.21, 0, -0.02)
type Where = 'rest' | WaterKey | 'plate'
const pose = (w: Where): Arm => w === 'rest' ? { len: 0.09, yaw: -2.2, lift: 0.27 } : w === 'plate' ? armTo(PLATE.x - STAND.x, PLATE.z - STAND.z, PLATE_TOP + 0.012) : armTo(CUP[w].x - STAND.x, CUP[w].z - STAND.z, 0.012)
const TASKS: Task[] = [
  { id: 'w25', text: '测 25 °C 纯水的 pH', note: 'pH 7.00：纯水里 c(H⁺) = c(OH⁻) = 1.0×10⁻⁷ mol/L，水是极弱的电解质' },
  { id: 'w50', text: '把纯水加热到 50 °C 再测', note: `pH ${meter(waterPH('water', 50))}，但 c(H⁺) 仍等于 c(OH⁻)，还是中性：升温促进水的电离，Kw 增大到 ${sci(KW_T[50])}` },
  { id: 'hcl', text: '测 0.010 mol/L 盐酸', note: 'pH 2.00：c(H⁺) = 1.0×10⁻² mol/L，c(OH⁻) = 1.0×10⁻¹² mol/L，乘积仍是 1.0×10⁻¹⁴' },
  { id: 'naoh', text: '测 0.010 mol/L NaOH 溶液', note: 'pH 12.00：c(OH⁻) = 1.0×10⁻² mol/L，c(H⁺) = 1.0×10⁻¹² mol/L，乘积还是 1.0×10⁻¹⁴' },
]
const NAME: Record<WaterKey, string> = { water: '纯水', hcl: '盐酸', naoh: 'NaOH 溶液' }
const MIX = (k: WaterKey, t: Temp): Mix => k === 'water' ? (t === 50 ? { H: 2, OH: 2 } : { H: 1, OH: 1 }) : k === 'hcl' ? { H: 10, Cl: 10 } : { Na: 10, OH: 10 }

export default function Lesson3() {
  const [pick, setPick] = useState<WaterKey>('water')
  const [at, setAt] = useState<Where>('rest')
  const [hot, setHot] = useState(false)
  const [read, setRead] = useState<{ k: WaterKey; t: Temp } | null>(null)
  const T = useTasks('gewu:ionic:3', TASKS)
  const goal: Where = pick === 'water' && hot ? 'plate' : pick
  const mea = useRun(2.8, () => { setAt(goal); const t: Temp = pick === 'water' && hot ? 50 : 25; setRead({ k: pick, t }); T.check(id => (id === 'w25' && pick === 'water' && t === 25) || (id === 'w50' && pick === 'water' && t === 50) || id === pick) })
  const heat = useRun(6, () => { setAt('plate'); setHot(true); setRead({ k: 'water', t: 50 }); T.check(id => id === 'w50') })
  const busy = mea.busy || heat.busy
  const resetAll = () => { mea.snap(0); heat.snap(0); setPick('water'); setAt('rest'); setHot(false); setRead(null); T.reset() }
  const task = T.current
  const want: WaterKey = task?.id === 'hcl' ? 'hcl' : task?.id === 'naoh' ? 'naoh' : 'water'
  const { hint, next }: { hint: string; next: 'mea' | 'heat' | 'pick' | null } = !task ? { hint: '一定温度下，稀溶液里 c(H⁺)·c(OH⁻) = Kw，是一个常数。', next: null }
    : mea.busy ? { hint: '把电极放进去，等读数稳定…', next: null }
    : heat.busy ? { hint: '电热板慢慢把纯水加热到 50 °C…', next: null }
    : pick !== want ? { hint: `选“${NAME[want]}”`, next: 'pick' }
    : task.id === 'w25' ? { hint: '测一测 25 °C 纯水的 pH', next: 'mea' }
    : task.id === 'w50' ? { hint: '把纯水放到电热板上加热到 50 °C，再测', next: 'heat' }
    : { hint: `测一测 ${WATERS[pick].name}的 pH`, next: 'mea' }

  // 电极架和烧杯的动作
  const arm: Arm = mea.busy ? armPath(pose(at), pose(goal), seg(mea.t, 0.1, 2.4))
    : heat.busy ? armPath(pose(at), pose('plate'), heat.t < 0.9 ? 0.3 * seg(heat.t, 0, 0.9) : 0.3 + 0.7 * seg(heat.t, 4.2, 5.8))
    : pose(at)
  const wOn = p(CUP.water.x, 0, CUP.water.z), wHot = p(PLATE.x, PLATE_TOP, PLATE.z)
  const wAt: V3 = heat.busy ? liftPath(wOn, wHot, Y + u(0.18), seg(heat.t, 0.9, 2.6)) : hot ? wHot : wOn
  const warm = heat.busy ? seg(heat.t, 2.6, 4.2) : hot ? 1 : 0
  const reading = read && !busy ? meter(waterPH(read.k, read.t)) : '0.00'
  const cur = read ?? { k: pick, t: (pick === 'water' && hot ? 50 : 25) as Temp }
  const ion = ions(cur.k, cur.t)
  const yaw = SPOT.l3.view[0], MIC = p(-0.19, 0.25, 0.0)
  const micFrom: V3 = cur.k === 'water' && cur.t === 50 ? p(PLATE.x - 0.015, PLATE_TOP + 0.03, PLATE.z + 0.02) : p(CUP[cur.k].x - 0.015, 0.03, CUP[cur.k].z + 0.02)
  const tipW: V3 = [X0 + u(STAND.x + Math.cos(arm.yaw) * arm.len), Y + u(arm.lift + 0.06), Z + u(STAND.z + Math.sin(arm.yaw) * arm.len)]
  const labels: Label[] = [
    { id: 'ph', at: [METER[0] + u(0.1), Y + u(0.05), METER[2] + u(0.05)], ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>pH</small>{reading}</> },
    ...(['water', 'hcl', 'naoh'] as WaterKey[]).map(k => { const c = k === 'water' && hot ? { x: PLATE.x, z: PLATE.z + 0.06 } : { x: CUP[k].x, z: CUP[k].z + 0.035 }; return { id: k, at: p(c.x, k === 'water' && hot ? PLATE_TOP : -0.004, c.z), ax: 0.5, className: 'scene-tag', children: <>{k === 'water' ? '纯水' : k === 'hcl' ? <><small>HCl</small>0.010</> : <><small>NaOH</small>0.010</>}</> } }),
    { id: 'pl', at: p(PLATE.x + 0.04, 0.1, PLATE.z - 0.06), ax: 0, name: true, className: 'scene-name', children: '电热板' },
  ]
  return (
    <LabShell title="水溶液里的离子平衡" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="测 pH"
      stage={<Place at="l3" labels={labels}>
        <group position={METER} rotation-y={0.45}><PhMeter text={reading} sub={`${cur.t}.0 °C`} /></group>
        <group position={p(STAND.x, 0, STAND.z)}><ElectrodeStand yaw={arm.yaw} lift={arm.lift} len={arm.len} rod={0.4} /></group>
        <Wire color="#1c1e21" r={0.0018} pts={[tipW, [tipW[0] - u(0.03), tipW[1] + u(0.05), tipW[2] - u(0.04)], [X0 + u(STAND.x - 0.1), Y + u(0.22), Z + u(STAND.z - 0.03)], [METER[0] + u(0.04), Y + u(0.06), METER[2] - u(0.1)], [METER[0], Y + u(0.03), METER[2] - u(0.085)]]} />
        <group position={wAt}><Beaker vol={100} level={0.045} look={LOOK.clear} /></group>
        {(['hcl', 'naoh'] as WaterKey[]).map(k => <group key={k} position={p(CUP[k].x, 0, CUP[k].z)}><Beaker vol={100} level={0.045} look={LOOK.clear} /></group>)}
        <group position={p(PLATE.x, 0, PLATE.z - 0.012)}><HotPlate heat={warm} /></group>
        {hot && <group position={p(PLATE.x + 0.016, PLATE_TOP + 0.01, PLATE.z - 0.01)} rotation-z={-0.18}><Thermometer col={0.5} /></group>}
        <Puffs at={[wHot[0], wHot[1] + u(0.075), wHot[2]]} on={warm > 0.6} seed={5} opt={{ rate: 4, life: 2.2, size: [u(0.02), u(0.07)], speed: u(0.05), spread: 0.3, color: '#ffffff', opacity: 0.18, jitter: u(0.01) }} />
        <Micro at={MIC} r={u(0.07)} yaw={yaw} from={micFrom} mix={MIX(cur.k, cur.t)} seed={4} />
      </Place>}
      lesson={<LessonBlock no="3" title="水的电离" concept="c(H⁺)·c(OH⁻) = Kw，只随温度变" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>水是一种极弱的电解质：H₂O ⇌ H⁺ + OH⁻。一定温度下，c(H⁺) 和 c(OH⁻) 的乘积是一个常数，叫做水的离子积 Kw。25 °C 时 Kw = 1.0×10⁻¹⁴。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>水的电离吸热，升高温度 Kw 增大：50 °C 时 Kw = 5.3×10⁻¹⁴</li>
            <li>溶液的酸碱性看 c(H⁺) 和 c(OH⁻) 谁大，不看 pH 是不是 7：50 °C 纯水 pH 6.64，仍是中性</li>
            <li>Kw 不仅适用于纯水，也适用于稀的酸、碱、盐溶液</li>
            <li>pH = −lg c(H⁺)</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">盐酸和 NaOH 溶液里由水电离出的那一点 H⁺、OH⁻ 忽略不计。放大窗里水电离出的离子画得比实际多得多，是示意。</p>
        </>} />}
      finale={T.finale && <Fin tag="四次 pH 都测完了" big="c(H⁺)·c(OH⁻) = Kw，只随温度变">25 °C 纯水 pH 7.00，50 °C 纯水 pH {meter(waterPH('water', 50))}（仍是中性）；0.010 mol/L 盐酸 pH 2.00，NaOH 溶液 pH 12.00，乘积都是 1.0×10⁻¹⁴。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">pH 计读数 · {cur.t} °C</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{read && !busy ? reading : '—'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="c(H⁺)" value={read ? sci(ion.h) : '—'} unit="mol/L" />
            <ParamTile symbol="c(OH⁻)" value={read ? sci(ion.oh) : '—'} unit="mol/L" />
            <ParamTile symbol="Kw" value={read ? sci(ion.h * ion.oh) : '—'} unit={`c(H⁺)·c(OH⁻) · ${cur.t} °C`} />
            <ParamTile symbol="酸碱性" value={read ? (Math.abs(ion.h - ion.oh) < 1e-12 ? '中性' : ion.h > ion.oh ? '酸性' : '碱性') : '—'} unit={NAME[cur.k]} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">放大窗 · {NAME[cur.k]}</h2>
          <Legend items={cur.k === 'water' ? ['H', 'OH', 'H2O'] : cur.k === 'hcl' ? ['H', 'Cl', 'H2O'] : ['Na', 'OH', 'H2O']} />
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'mea'} pulse={next === 'mea'} onClick={() => mea.run()} disabled={busy || at === goal}>测 pH</LabButton>
        <LabButton primary={next === 'heat'} pulse={next === 'heat'} onClick={() => heat.run()} disabled={busy || hot || pick !== 'water' || !read}>加热到 50 °C</LabButton>
      </>}
      extras={
        <Control label="测哪一杯">
          <Segmented label="测哪一杯" pulse={next === 'pick'} want={want} value={pick} disabled={busy} onChange={k => setPick(k as WaterKey)} options={(['water', 'hcl', 'naoh'] as WaterKey[]).map(k => ({ value: k, label: NAME[k] }))} />
        </Control>
      }
    />
  )
}
