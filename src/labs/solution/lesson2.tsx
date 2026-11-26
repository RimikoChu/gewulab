// 溶液 · 第 2 课 溶解时的吸热和放热：化验台第 2 格，三只烧杯各盛 50 mL 水，各斜靠一支温度计；后面是硝酸铵、氢氧化钠、氯化钠。
// 依次往三杯里加 5 g 搅拌，看温度计：硝酸铵那杯明显降温（外壁凝出水珠），氢氧化钠那杯明显升温，氯化钠那杯几乎不变。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BEAKER, Beaker, GlassRod, Glove, JarBottle, Spoon, Thermometer } from './gear'
import { Dew, Grains, Steam } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun, type P3 } from './parts'
import { HEAT, L2, ROOM, tempAfter, type HeatKey } from './physics'
import { BZ, M, ST, TOP, Place } from './world'

const X0 = ST.l2, Y = TOP, Z = BZ + 0.15
const R = BEAKER[100].r * M, H = BEAKER[100].h * M
const LV = L2.water * 1e-6 / (Math.PI * (BEAKER[100].r - 0.002) ** 2)     // 50 mL 水的液面高度（m）
const KEYS: HeatKey[] = ['NH4NO3', 'NaOH', 'NaCl']
const AT: Record<HeatKey, P3> = { NH4NO3: [X0 - 0.12 * M, Y, Z], NaOH: [X0, Y, Z], NaCl: [X0 + 0.12 * M, Y, Z] }
const JAR: Record<HeatKey, P3> = { NH4NO3: [X0 - 0.16 * M, Y, Z - 0.15 * M], NaOH: [X0 - 0.04 * M, Y, Z - 0.16 * M], NaCl: [X0 + 0.08 * M, Y, Z - 0.16 * M] }
const SPOON0: P3 = [X0 + 0.24 * M, Y + 0.004 * M, Z + 0.02 * M], ROD0: P3 = [X0 - 0.06 * M, Y + 0.004 * M, Z + 0.075 * M]
const ADD = 1.8, STIR = 3.4
const TASKS: Task[] = KEYS.map(k => ({ id: k, text: `往一杯水里加 5 g ${HEAT[k].name}，搅拌，读温度`, note: k === 'NH4NO3' ? `温度降到约 ${Math.round(tempAfter('NH4NO3', L2.solute, L2.water))} ℃：硝酸铵溶解时吸热` : k === 'NaOH' ? `温度升到约 ${Math.round(tempAfter('NaOH', L2.solute, L2.water))} ℃：氢氧化钠溶解时放热` : `约 ${Math.round(tempAfter('NaCl', L2.solute, L2.water))} ℃，几乎不变` }))
const tFinal = (k: HeatKey) => tempAfter(k, L2.solute, L2.water)

export default function Lesson2() {
  const [pick, setPick] = useState<HeatKey>('NH4NO3')
  const [added, setAdded] = useState<Record<HeatKey, boolean>>({ NH4NO3: false, NaOH: false, NaCl: false })
  const [read, setRead] = useState<Record<HeatKey, boolean>>({ NH4NO3: false, NaOH: false, NaCl: false })
  const [act, setAct] = useState<HeatKey>('NH4NO3')
  const T = useTasks('gewu:solution:2', TASKS)
  const run = useRun(ADD + STIR, () => setAdded(a => ({ ...a, [act]: true })))
  const doAdd = () => { if (run.busy || added[pick]) return; setAct(pick); run.run() }
  const doRead = () => { if (run.busy || !added[pick] || read[pick]) return; const n = { ...read, [pick]: true }; setRead(n); T.check(id => n[id as HeatKey]) }
  const resetAll = () => { run.snap(0); setPick('NH4NO3'); setAdded({ NH4NO3: false, NaOH: false, NaCl: false }); setRead({ NH4NO3: false, NaOH: false, NaCl: false }); T.reset() }

  const temp = (k: HeatKey) => act === k && run.busy ? ROOM + (tFinal(k) - ROOM) * ease(seg(run.t, ADD + 0.3, ADD + STIR)) : added[k] ? tFinal(k) : ROOM
  const task = T.current, want = (task?.id as HeatKey) ?? null
  const { hint, next }: { hint: string; next: 'pick' | 'add' | 'read' | null } = !task ? { hint: '硝酸铵溶解吸热，氢氧化钠溶解放热，氯化钠溶解时温度几乎不变。', next: null }
    : run.busy ? { hint: run.t < ADD ? `加 5 g ${HEAT[act].name}…` : '搅拌，看温度计…', next: null }
    : pick !== want ? { hint: `换成${HEAT[want!].name}那一杯`, next: 'pick' }
    : !added[pick] ? { hint: `往这杯水里加 5 g ${HEAT[pick].name}，搅拌`, next: 'add' }
    : { hint: '温度计不动了，读一读温度', next: 'read' }

  const a = run.t, c0 = act
  const jarTop: P3 = [JAR[c0][0] + 0.03 * M, Y + 0.03 * M, JAR[c0][2] + 0.06 * M], over: P3 = [AT[c0][0] - 0.015 * M, Y + H + 0.03 * M, AT[c0][2]]
  const moving = run.busy && a < ADD
  const sp: P3 = !moving ? SPOON0 : a < 0.5 ? liftPath(SPOON0, jarTop, Y + 0.12 * M, seg(a, 0, 0.5)) : a < 1.1 ? liftPath(jarTop, over, Y + H + 0.06 * M, seg(a, 0.5, 1.1)) : liftPath(over, SPOON0, Y + H + 0.06 * M, seg(a, 1.4, ADD))
  const flip = moving ? ease(seg(a, 1.05, 1.25)) * (1 - ease(seg(a, 1.35, 1.45))) : 0
  const stirring = run.busy && a > ADD
  const ang = (a - ADD) * 9
  const rodAt: P3 = stirring ? [AT[c0][0] + Math.cos(ang) * R * 0.4, Y + 0.008 * M, AT[c0][2] + 0.004 * M + Math.sin(ang) * R * 0.3] : ROD0

  const labels: Label[] = [
    ...KEYS.map(k => ({ id: k, at: [AT[k][0], Y + 0.25 * M, AT[k][2] - 0.02 * M] as P3, ax: 0.5, className: `scene-tag ${read[k] ? 'key' : ''} -translate-y-full`, children: <><small>{HEAT[k].name}</small>{added[k] || (act === k && run.busy) ? `约 ${Math.round(temp(k))} ℃` : `${ROOM} ℃`}</> })),
    ...KEYS.map((k, i) => ({ id: `n${i}`, at: [JAR[k][0], Y + 0.1 * M, JAR[k][2]] as P3, ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: HEAT[k].name })),
  ]
  const tPick = temp(pick)
  return (
    <LabShell title="溶液" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="溶解"
      stage={<Place at="l2" labels={labels}>
        {KEYS.map(k => <group key={k} position={AT[k]}>
          <Beaker vol={100} level={LV}>
            {/* 温度计斜靠在杯壁上 */}
            <group position={[0.006 * M, 0.002 * M, 0.008 * M]} rotation={[-0.16, 0, -0.1]}><Thermometer temp={temp(k)} /></group>
          </Beaker>
        </group>)}
        {KEYS.map(k => <Grains key={k} at={AT[k]} R={R * 0.7} H={LV * M} fall={act === k && run.busy ? seg(a, 1.15, 2.1) : 0} left={act === k && run.busy ? 1 - seg(a, 1.5, ADD + STIR * 0.8) : 0} size={0.0024 * M} n={40} seed={k.length} swirl={act === k && stirring ? 1 : 0} />)}
        {/* 硝酸铵那杯外壁凝出小水珠；氢氧化钠那杯冒一点热气 */}
        <Dew at={[AT.NH4NO3[0], Y + 0.003 * M, AT.NH4NO3[2]]} R={R + 0.012} H={LV * M * 1.2} k={Math.max(0, (ROOM - temp('NH4NO3')) / 7)} />
        <Steam at={[AT.NaOH[0], Y + (LV + 0.01) * M, AT.NaOH[2]]} on={temp('NaOH') > 38} s={0.05 * M} rate={4} jitter={0.02 * M} opacity={0.18} />
        {KEYS.map(k => <group key={k} position={JAR[k]}><JarBottle label={HEAT[k].name} amount={0.5} band={k === 'NaOH' ? '#b8352a' : undefined} stopper={false} /></group>)}
        <group position={sp} rotation={[0, moving ? 0 : 0.6, Math.PI * 0.85 * flip]}><Spoon load={moving && a > 0.45 && a < 1.3 ? 1 - flip : 0} />
          {moving && <group position={[0.15 * M, 0.02 * M, -0.01 * M]} rotation={[-1.0, 0.3, -0.9]}><Glove /></group>}
        </group>
        <group position={rodAt} rotation={stirring ? [Math.sin(ang) * 0.15, 0, -Math.cos(ang) * 0.15] : [0, 0, Math.PI / 2 - 0.02]}><GlassRod len={0.18} />
          {stirring && <group position={[0, 0.14 * M, 0]} rotation={[-0.45, 0, 0]}><Glove /></group>}
        </group>
      </Place>}
      lesson={<LessonBlock no="2" title="溶解时的吸热和放热" concept="有的物质溶解吸热，有的放热" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>物质溶解时，常常伴随着温度的变化。</p>
          <p className="mt-3"><b className="text-white">硝酸铵</b>溶于水时吸收热量，溶液温度降低；<b className="text-white">氢氧化钠</b>溶于水时放出热量，溶液温度升高；<b className="text-white">氯化钠</b>溶于水时温度几乎不变。</p>
          <p className="mt-3 text-[13.5px] text-white/65">图上的温度是按 5 g 溶于 50 mL 水、不计散热估算的，实际会因用量和散热略有不同。氢氧化钠有强烈的腐蚀性，要戴好手套和护目镜。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三杯的温度都读过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">硝酸铵溶解吸热，氢氧化钠溶解放热</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">从 {ROOM} ℃ 开始：硝酸铵约 {Math.round(tFinal('NH4NO3'))} ℃，氢氧化钠约 {Math.round(tFinal('NaOH'))} ℃，氯化钠约 {Math.round(tFinal('NaCl'))} ℃，几乎不变。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{HEAT[pick].name}那杯的温度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{added[pick] || (act === pick && run.busy) ? `约 ${Math.round(tPick)}` : ROOM}<span className="ml-1 text-[15px] font-medium text-white/55">℃</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="t₀" value={String(ROOM)} unit="℃ · 开始时" />
            <ParamTile symbol="m" value={`${L2.solute} g`} unit={`溶进 ${L2.water} mL 水`} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">三杯的温度</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium" /><th className="pb-1 font-medium">溶解后</th><th className="pb-1 font-medium">温度</th></tr></thead>
            <tbody>{KEYS.map(k => { const d = tFinal(k) - ROOM; return <tr key={k} className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">{HEAT[k].name}</td><td className="tabular-nums">{read[k] ? `约 ${Math.round(tFinal(k))} ℃` : '—'}</td><td className={`rounded-r-lg font-semibold ${read[k] ? (d < -3 ? 'text-[#8cc8ff]' : d > 3 ? 'text-[#ffb08a]' : '') : ''}`}>{read[k] ? (d < -3 ? '降低' : d > 3 ? '升高' : '几乎不变') : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'add'} pulse={next === 'add'} onClick={doAdd} disabled={run.busy || added[pick]}>加 5 g，搅拌</LabButton>
        <LabButton primary={next === 'read'} pulse={next === 'read'} onClick={doRead} disabled={run.busy || !added[pick] || read[pick]}>读温度</LabButton>
      </>}
      extras={
        <Control label="加什么">
          <Segmented label="加什么" pulse={next === 'pick'} want={want} value={pick} disabled={run.busy} onChange={k => setPick(k as HeatKey)} options={KEYS.map(k => ({ value: k, label: HEAT[k].name }))} />
        </Control>
      }
    />
  )
}
