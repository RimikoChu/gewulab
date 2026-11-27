// 水溶液里的离子平衡 · 第 6 课 盐类的水解：一块白瓷砖上三只 100 mL 烧杯，分别盛 0.10 mol/L 的 CH₃COONa、NH₄Cl、NaCl 溶液；
// 电极架转到哪一杯就测哪一杯。CH₃COONa 显碱性（8.88），NH₄Cl 显酸性（5.13），NaCl 中性（7.00）；放大窗里看水解。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass as Panel, Control, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Beaker, LOOK, NarrowBottle, Tile, u } from './gear'
import { ElectrodeStand, PhMeter, Wire } from './rig'
import { Legend, Micro, type Mix, type Sp } from './micro'
import { Fin } from './fin'
import { LESSONS, goLesson } from './lessons'
import { armPath, armTo, seg, useRun, type Arm } from './parts'
import { SALTS, acidity, meter, saltPH, type SaltKey } from './physics'
import { BZ, SPOT, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l6, Y = TOP, Z = BZ + 0.7
const p = (x: number, y: number, z: number): V3 => [X0 + u(x), Y + u(y), Z + u(z)]
const KEYS: SaltKey[] = ['hac', 'nh4', 'nacl']
const CUP: Record<SaltKey, { x: number; z: number }> = { hac: { x: -0.09, z: 0.04 }, nh4: { x: 0, z: 0.04 }, nacl: { x: 0.09, z: 0.04 } }
const STAND = { x: 0.0, z: -0.09 }, TILE_H = 0.006
const METER = p(0.23, 0, -0.02)
const pose = (k: SaltKey | null): Arm => k ? armTo(CUP[k].x - STAND.x, CUP[k].z - STAND.z, TILE_H + 0.012) : { len: 0.08, yaw: -1.2, lift: 0.27 }
const TASKS: Task[] = [
  { id: 'hac', text: '测 0.10 mol/L CH₃COONa 溶液的 pH', note: `pH ${meter(saltPH('hac'))}，显碱性：CH₃COO⁻ 结合水电离出的 H⁺ 生成弱电解质 CH₃COOH，c(OH⁻) > c(H⁺)` },
  { id: 'nh4', text: '测 0.10 mol/L NH₄Cl 溶液的 pH', note: `pH ${meter(saltPH('nh4'))}，显酸性：NH₄⁺ 结合水电离出的 OH⁻ 生成弱电解质 NH₃·H₂O，c(H⁺) > c(OH⁻)` },
  { id: 'nacl', text: '测 0.10 mol/L NaCl 溶液的 pH', note: 'pH 7.00，中性：Na⁺、Cl⁻ 都不和水电离出的离子结合，NaCl 不水解' },
]
const MIX: Record<SaltKey, Mix> = { hac: { Na: 7, Ac: 6, HAc: 1, OH: 1 }, nh4: { NH4: 6, Cl: 7, NH3: 1, H: 1 }, nacl: { Na: 7, Cl: 7 } }
const LEG: Record<SaltKey, Sp[]> = { hac: ['Na', 'Ac', 'HAc', 'OH', 'H2O'], nh4: ['NH4', 'Cl', 'NH3', 'H', 'H2O'], nacl: ['Na', 'Cl', 'H2O'] }
const EQ: Record<SaltKey, string> = { hac: 'CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻', nh4: 'NH₄⁺ + H₂O ⇌ NH₃·H₂O + H⁺', nacl: 'Na⁺、Cl⁻ 不水解' }

export default function Lesson6() {
  const [pick, setPick] = useState<SaltKey>('hac')
  const [at, setAt] = useState<SaltKey | null>(null)
  const [seen, setSeen] = useState<SaltKey[]>([])
  const T = useTasks('gewu:ionic:6', TASKS)
  const mea = useRun(2.8, () => { setAt(pick); setSeen(s => s.includes(pick) ? s : [...s, pick]); T.check(id => id === pick) })
  const resetAll = () => { mea.snap(0); setPick('hac'); setAt(null); setSeen([]); T.reset() }
  const task = T.current
  const want = (task?.id ?? 'hac') as SaltKey
  const { hint, next }: { hint: string; next: 'mea' | 'pick' | null } = !task ? { hint: '谁弱谁水解，谁强显谁性：强碱弱酸盐显碱性，强酸弱碱盐显酸性。', next: null }
    : mea.busy ? { hint: '把电极移过去，等读数稳定…', next: null }
    : pick !== want ? { hint: `选“${SALTS[want].formula}”`, next: 'pick' }
    : { hint: `测一测 ${SALTS[pick].formula} 溶液的 pH`, next: 'mea' }
  const arm = mea.busy ? armPath(pose(at), pose(pick), seg(mea.t, 0.1, 2.4)) : pose(at)
  const reading = at && !mea.busy ? meter(saltPH(at)) : '0.00'
  const show = at ?? pick
  const yaw = SPOT.l6.view[0], MIC = p(-0.21, 0.22, 0.0)
  const tipW: V3 = [X0 + u(STAND.x + Math.cos(arm.yaw) * arm.len), Y + u(arm.lift + 0.06), Z + u(STAND.z + Math.sin(arm.yaw) * arm.len)]
  const labels: Label[] = [
    { id: 'ph', at: [METER[0], Y + u(0.17), METER[2] - u(0.03)], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>pH</small>{reading}</> },
    ...KEYS.map(k => ({ id: k, at: p(CUP[k].x, -0.002, CUP[k].z + 0.06), ax: 0.5, className: 'scene-tag', children: SALTS[k].formula })),
  ]
  return (
    <LabShell title="水溶液里的离子平衡" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="测 pH"
      stage={<Place at="l6" labels={labels}>
        <group position={p(0, 0, 0.05)}><Tile w={0.3} d={0.12} /></group>
        {KEYS.map(k => <group key={k} position={p(CUP[k].x, TILE_H, CUP[k].z)}><Beaker vol={100} level={0.045} look={LOOK.clear} /></group>)}
        <group position={p(STAND.x, 0, STAND.z)}><ElectrodeStand yaw={arm.yaw} lift={arm.lift} len={arm.len} rod={0.4} /></group>
        <Wire color="#1c1e21" r={0.0018} pts={[tipW, [tipW[0] + u(0.03), tipW[1] + u(0.05), tipW[2] - u(0.04)], [X0 + u(STAND.x + 0.1), Y + u(0.22), Z + u(STAND.z - 0.03)], [METER[0] - u(0.03), Y + u(0.06), METER[2] - u(0.1)], [METER[0], Y + u(0.03), METER[2] - u(0.085)]]} />
        <group position={METER} rotation-y={-0.45}><PhMeter text={reading} sub="25.0 °C" /></group>
        {KEYS.map((k, i) => <group key={k} position={p(-0.13 + i * 0.075, 0, -0.17)}><NarrowBottle label={SALTS[k].name} sub="0.10 mol/L" band={i === 0 ? '#e09a2a' : i === 1 ? '#2fa8a0' : '#6a7a88'} /></group>)}
        <Micro at={MIC} r={u(0.07)} yaw={yaw} from={p(CUP[show].x - 0.015, TILE_H + 0.03, CUP[show].z + 0.02)} mix={MIX[show]} seed={6} />
      </Place>}
      lesson={<LessonBlock no="6" title="盐类的水解" concept="谁弱谁水解，谁强显谁性" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在溶液中，盐电离出来的离子跟水电离出来的 H⁺ 或 OH⁻ 结合生成弱电解质的反应，叫做盐类的水解。水解破坏了水的电离平衡，使 c(H⁺) ≠ c(OH⁻)。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻：强碱弱酸盐显碱性</li>
            <li>NH₄⁺ + H₂O ⇌ NH₃·H₂O + H⁺：强酸弱碱盐显酸性</li>
            <li>强酸强碱盐不水解，溶液显中性</li>
            <li>水解程度一般很小，水解是中和反应的逆反应，是吸热的</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">pH 由水解常数 Kh = Kw/Ka（或 Kw/Kb）算出：Ka(CH₃COOH) = 1.75×10⁻⁵，Kb(NH₃·H₂O) = 1.8×10⁻⁵。放大窗里水解的那一份画得比实际多，是示意。</p>
        </>} />}
      finale={T.finale && <Fin tag="三种盐溶液都测过了" big="谁弱谁水解，谁强显谁性">0.10 mol/L CH₃COONa pH {meter(saltPH('hac'))}（碱性），NH₄Cl pH {meter(saltPH('nh4'))}（酸性），NaCl pH 7.00（中性）。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">pH 计读数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{at && !mea.busy ? reading : '—'}</div>
            <div className="mt-1 text-[13px] text-white/60">{at && !mea.busy ? acidity(saltPH(at)) : ''}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">测过的 pH</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {KEYS.map(k => <ParamTile key={k} symbol={SALTS[k].formula} value={seen.includes(k) ? meter(saltPH(k)) : '—'} unit={seen.includes(k) ? acidity(saltPH(k)) : ''} />)}
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">放大窗 · {SALTS[show].formula} 溶液</h2>
          <p className="mt-1 text-[14px] text-white/85">{EQ[show]}</p>
          <Legend items={LEG[show]} />
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'mea'} pulse={next === 'mea'} onClick={() => mea.run()} disabled={mea.busy || at === pick}>测 pH</LabButton>
      </>}
      extras={
        <Control label="测哪一杯">
          <Segmented label="测哪一杯" pulse={next === 'pick'} want={want} value={pick} disabled={mea.busy} onChange={k => setPick(k as SaltKey)} options={KEYS.map(k => ({ value: k, label: SALTS[k].formula }))} />
        </Control>
      }
    />
  )
}
