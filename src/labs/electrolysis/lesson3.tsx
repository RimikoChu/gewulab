// 电解和金属防护 · 第 3 课 离子的放电顺序：化验台第三格。
// 一只木架上并排夹着四只 U 形管，都插石墨棒，并联接在同一台直流电源上：CuCl₂、NaCl（滴了酚酞）、CuSO₄、Na₂SO₄ 溶液。
// 接通电源后逐只放大看、记录两极的产物，比出阴极、阳极上离子放电的先后。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Glass as Panel, Control, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { LOOK, u, type Look } from './gear'
import { CLIP_TAIL, DCSupply, GraphiteRod, POST, UT, UTube, Wire } from './rig'
import { Bubbles } from './fx'
import { ELECTRODE, Legend, Micro, type MicroCfg, type Side, type Sp } from './micro'
import { LESSONS, goLesson } from './lessons'
import { useClock } from './parts'
import { Fin } from './fin'
import { SOLUTIONS, electrolyze, type SolKey } from './physics'
import { BZ, SPOT, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l3, Y = TOP, Z = BZ + 0.5
const p = (x: number, y: number, z: number): V3 => [X0 + u(x), Y + u(y), Z + u(z)]
const KEYS = Object.keys(SOLUTIONS) as SolKey[]
const TX: Record<SolKey, number> = { cucl2: -0.2, nacl: -0.03, cuso4: 0.14, na2so4: 0.31 }
const BASE = 0.02, LEVEL = 0.15, ROD_Y = BASE + UT.yc + 0.014, ROD_LEN = 0.19, WET = BASE + LEVEL - ROD_Y, RAIL = 0.275
const SUPPLY: V3 = [-0.41, 0, 0.02], SYAW = 0.3
const post = (k: 'pos' | 'neg'): V3 => { const [x, y, z] = POST[k], c = Math.cos(SYAW), s = Math.sin(SYAW); return [SUPPLY[0] + x * c + z * s, y, SUPPLY[2] - x * s + z * c] }
const LOOKS: Record<SolKey, Look> = { cucl2: { color: '#12a59a', opacity: 0.5, vivid: true }, nacl: LOOK.clear, cuso4: { color: '#2468d8', opacity: 0.52, vivid: true }, na2so4: LOOK.clear }
const TASKS: Task[] = [
  { id: 'cucl2', text: '接通电源，记录 CuCl₂ 溶液两极的产物', note: '阴极 Cu、阳极 Cl₂：Cu²⁺ 比 H⁺ 先得电子，Cl⁻ 比 OH⁻ 先失电子' },
  { id: 'nacl', text: '记录 NaCl 溶液两极的产物', note: '阴极 H₂、阳极 Cl₂：Na⁺ 在水溶液里不放电，阴极附近生成 OH⁻，酚酞变红' },
  { id: 'cuso4', text: '记录 CuSO₄ 溶液两极的产物', note: '阴极 Cu、阳极 O₂：SO₄²⁻ 不放电，是水电离出的 OH⁻ 失电子' },
  { id: 'na2so4', text: '记录 Na₂SO₄ 溶液两极的产物', note: '阴极 H₂、阳极 O₂，体积比 2∶1：实际上电解的是水' },
]
const C: Side = { color: ELECTRODE.graphite, tag: '阴极 −', e: 1 }, A: Side = { color: ELECTRODE.graphite, tag: '阳极 +', e: -1 }
const MICRO: Record<SolKey, MicroCfg> = {
  cucl2: { left: { ...C, take: { Cu2: { to: 'coat', as: 'Cu' } } }, right: { ...A, take: { Cl: { to: 'gas', as: 'Cl2' } } }, ions: { Cu2: 7, Cl: 14, H: 2, OH: 2 }, field: 1 },
  nacl: { left: { ...C, take: { H: { to: 'gas', as: 'H2' } }, emit: [{ sp: 'OH', rate: 0.6 }] }, right: { ...A, take: { Cl: { to: 'gas', as: 'Cl2' } } }, ions: { Na: 10, Cl: 10, H: 4, OH: 2 }, field: 1 },
  cuso4: { left: { ...C, take: { Cu2: { to: 'coat', as: 'Cu' } } }, right: { ...A, take: { OH: { to: 'gas', as: 'O2' } }, emit: [{ sp: 'H', rate: 0.6 }] }, ions: { Cu2: 7, SO4: 7, H: 2, OH: 4 }, field: 1 },
  na2so4: { left: { ...C, take: { H: { to: 'gas', as: 'H2' } }, emit: [{ sp: 'OH', rate: 0.5 }] }, right: { ...A, take: { OH: { to: 'gas', as: 'O2' } }, emit: [{ sp: 'H', rate: 0.5 }] }, ions: { Na: 10, SO4: 5, H: 4, OH: 4 }, field: 1 },
}
const LEGEND: Record<SolKey, Sp[]> = { cucl2: ['Cu2', 'Cl', 'H', 'OH', 'Cu', 'Cl2'], nacl: ['Na', 'Cl', 'H', 'OH', 'H2', 'Cl2'], cuso4: ['Cu2', 'SO4', 'H', 'OH', 'Cu', 'O2'], na2so4: ['Na', 'SO4', 'H', 'OH', 'H2', 'O2'] }
const GAS: Record<string, string> = { 'H₂': '#ffffff', 'O₂': '#ffffff', 'Cl₂': '#dff08a' }

export default function Lesson3() {
  const [on, setOn] = useState(false)
  const [sel, setSel] = useState<SolKey>('cucl2')
  const [rows, setRows] = useState<SolKey[]>([])
  const T = useTasks('gewu:electrolysis:3', TASKS)
  const clock = useClock()
  const start = () => { setOn(true); clock.start() }
  const record = () => { if (!on || rows.includes(sel)) return; const n = [...rows, sel]; setRows(n); T.check(id => n.includes(id as SolKey)) }
  const resetAll = () => { setOn(false); setSel('cucl2'); setRows([]); clock.stop(); T.reset() }
  const t = on ? clock.t : 0, k = Math.min(1, t / 7)
  const task = T.current, want = (task?.id ?? null) as SolKey | null
  const { hint, next }: { hint: string; next: 'on' | 'rec' | 'sel' | null } = !task ? { hint: '阴极上 Cu²⁺ 比 H⁺ 先放电；阳极上 Cl⁻ 比 OH⁻ 先放电。', next: null }
    : !on ? { hint: '接通电源，四只 U 形管同时电解', next: 'on' }
    : sel !== want ? { hint: `选“${SOLUTIONS[want!].short}”`, next: 'sel' }
    : { hint: `看 ${SOLUTIONS[sel].short} 溶液的两极，记录产物`, next: 'rec' }

  const yaw = SPOT.l3.view[0], MIC = p(0.055, 0.408, -0.04), mr = u(0.098)
  const W = (a: V3) => p(...a)
  const rod = (key: SolKey, s: number): V3 => [TX[key] + s * UT.g / 2, ROD_Y, 0]
  const labels: Label[] = [
    ...KEYS.map(key => ({ id: `n${key}`, at: p(TX[key], BASE - 0.012, 0.045), ax: 0.5, className: `scene-tag ${sel === key ? 'key' : ''}`, children: SOLUTIONS[key].short })),
    ...(on ? KEYS.filter(key => rows.includes(key)).map(key => { const r = electrolyze(key); return { id: `r${key}`, at: p(TX[key], RAIL + 0.03, -0.05), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>阴</small>{r.cathode}　<small>阳</small>{r.anode}</> } }) : []),
    { id: 'ps', at: p(SUPPLY[0], 0.135, SUPPLY[2]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '直流电源' },
    { id: 'phen', at: p(TX.nacl, BASE + 0.19, 0.03), ax: 0.5, name: true, className: 'scene-name', children: '滴了酚酞' },
  ]
  return (
    <LabShell title="电解和金属防护" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="四只 U 形管"
      stage={<Place at="l3" labels={labels}>
        {/* 木架：一块底板，后面立一块背板，背板上每只管两只弹簧夹；背板顶上两根铜汇流条（红正、黑负） */}
        <group position={p(0.055, 0, 0)}>
          <RoundedBox args={[u(0.72), u(BASE), u(0.13)]} radius={u(0.004)} position={[0, u(BASE / 2), -u(0.01)]} castShadow receiveShadow><meshStandardMaterial color="#b98a58" roughness={0.6} /></RoundedBox>
          <RoundedBox args={[u(0.72), u(0.2), u(0.014)]} radius={u(0.004)} position={[0, u(BASE + 0.1), -u(0.055)]} castShadow receiveShadow><meshStandardMaterial color="#c49562" roughness={0.6} /></RoundedBox>
          {[[-1, '#16181b'], [1, '#c8262c']].map(([s, c]) => <group key={s as number} position={[0, u(RAIL + (s as number) * 0.012), -u(0.055)]}>
            <mesh rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[u(0.003), u(0.003), u(0.7), 12]} /><Metal kind="copper" grain="turned" /></mesh>
            {[-0.34, 0.34].map(x => <mesh key={x} position={[u(x), -u(0.03 + (s as number) * 0.006), 0]}><boxGeometry args={[u(0.012), u(0.07 + (s as number) * 0.012), u(0.012)]} /><meshStandardMaterial color={c as string} roughness={0.5} /></mesh>)}
          </group>)}
        </group>
        {KEYS.map((key, i) => {
          const r = electrolyze(key), cu = r.cathode === 'Cu'
          return <group key={key}>
            <group position={p(TX[key], BASE, 0)}>
              <UTube level={LEVEL} look={LOOKS[key]} arm={key === 'nacl' ? [{ look: LOOK.pink, k }, null] : undefined} />
              {[-1, 1].map(s => <group key={s} position={[s * u(UT.g / 2), u(0.13), -u(0.035)]}><mesh rotation-x={Math.PI / 2}><torusGeometry args={[u(UT.ro + 0.0015), u(0.0016), 6, 20, Math.PI]} /><Metal kind="steel" /></mesh><mesh position={[0, 0, -u(0.008)]}><boxGeometry args={[u(0.01), u(0.012), u(0.016)]} /><Metal kind="steel" /></mesh></group>)}
            </group>
            <group position={W(rod(key, -1))}><GraphiteRod len={ROD_LEN} wet={WET} coat={cu ? k : 0} clip="#16181b" /></group>
            <group position={W(rod(key, 1))}><GraphiteRod len={ROD_LEN} wet={WET} clip="#c8262c" /></group>
            {!cu && <Bubbles at={W([rod(key, -1)[0], ROD_Y + 0.004, 0])} top={u(WET - 0.006)} on={on} rate={r.ratio === 2 ? 44 : 26} r={u(0.0018)} spread={u(0.004)} speed={u(0.035)} seed={i * 2 + 1} opacity={0.8} />}
            <Bubbles at={W([rod(key, 1)[0], ROD_Y + 0.004, 0])} top={u(WET - 0.006)} on={on} rate={r.ratio === 2 ? 22 : 26} r={u(0.0018)} spread={u(0.004)} speed={u(0.035)} color={GAS[r.anode]} seed={i * 2 + 2} opacity={0.8} />
            {[-1, 1].map(s => { const e = rod(key, s), top: V3 = [e[0] + CLIP_TAIL[0], e[1] + ROD_LEN + CLIP_TAIL[1], e[2] + CLIP_TAIL[2]]; return <Wire key={s} color={s < 0 ? '#1b1d20' : '#c8262c'} r={0.0014} n={3} flow={on ? -s : 0} pts={[W([e[0], RAIL + s * 0.012, -0.055]), W([e[0], RAIL + s * 0.012 + 0.012, -0.048]), W([top[0], top[1] + 0.02, top[2] - 0.004]), W(top)]} /> })}
          </group>
        })}
        <group position={W(SUPPLY)} rotation-y={SYAW}><DCSupply on={on} volts="6.0" /></group>
        <Wire color="#1b1d20" flow={on ? 1 : 0} pts={[W(post('neg')), W([post('neg')[0] + 0.01, 0.014, post('neg')[2] + 0.05]), W([-0.36, 0.1, 0.06]), W([-0.3, RAIL - 0.02, -0.03]), W([-0.285, RAIL - 0.012, -0.055])]} />
        <Wire color="#c8262c" flow={on ? -1 : 0} pts={[W(post('pos')), W([post('pos')[0] + 0.005, 0.014, post('pos')[2] + 0.06]), W([-0.4, 0.12, 0.09]), W([-0.31, RAIL + 0.04, -0.02]), W([-0.285, RAIL + 0.012, -0.055])]} />
        <Micro at={MIC} r={mr} yaw={yaw} from={W([TX[sel], BASE + 0.09, 0.02])} cfg={MICRO[sel]} on={on} seed={KEYS.indexOf(sel) + 2} />
      </Place>}
      lesson={<LessonBlock no="3" title="离子的放电顺序" concept="谁先放电，看离子得失电子的本领" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>溶液里往往不止一种阳离子、一种阴离子（水还会电离出 H⁺ 和 OH⁻）。通电时，氧化性强的阳离子先在阴极得电子，还原性强的阴离子先在阳极失电子。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>阴极（得电子）：Ag⁺ &gt; Cu²⁺ &gt; H⁺ &gt; … 水溶液里 Na⁺、Mg²⁺、Al³⁺ 等不放电</li>
            <li>阳极（惰性电极，失电子）：S²⁻ &gt; I⁻ &gt; Br⁻ &gt; Cl⁻ &gt; OH⁻ &gt; 含氧酸根</li>
            <li>阳极如果是铜、锌、铁这样的活性电极，电极自己先失电子</li>
          </ul>
        </>} />}
      finale={T.finale && <Fin tag="四种溶液都记下了" big="阴极：Cu²⁺ > H⁺ > Na⁺；阳极：Cl⁻ > OH⁻ > SO₄²⁻">同是石墨电极，溶液不同，产物就不同：先放电的是得失电子本领强的离子。电解 Na₂SO₄ 溶液实际上是电解水，氢气和氧气的体积比是 2∶1。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">记录（石墨电极）</h2>
          <table className="mt-2 w-full text-[14px] tabular-nums">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">溶液</th><th className="font-normal">阴极产物</th><th className="font-normal">阳极产物</th></tr></thead>
            <tbody>{KEYS.map(key => { const r = electrolyze(key), ok = rows.includes(key); return <tr key={key} className={sel === key ? 'text-white' : 'text-white/70'}><td className="py-1.5">{SOLUTIONS[key].short}</td><td>{ok ? r.cathode : '—'}</td><td>{ok ? r.anode : '—'}</td></tr> })}</tbody>
          </table>
          <h2 className="mt-4 text-[12.5px] text-white/55">{SOLUTIONS[sel].name}的电极反应</h2>
          <div className="mt-2 flex flex-col gap-1.5 text-[13.5px]">
            <div className="rounded-xl bg-white/8 px-3 py-2"><span className="text-white/55">阴极　</span>{rows.includes(sel) ? electrolyze(sel).cathodeEq : '—'}</div>
            <div className="rounded-xl bg-white/8 px-3 py-2"><span className="text-white/55">阳极　</span>{rows.includes(sel) ? electrolyze(sel).anodeEq : '—'}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">放大窗里的粒子（示意）</h2>
          <Legend items={LEGEND[sel]} />
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'on'} pulse={next === 'on'} onClick={start} disabled={on}>接通电源</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!on || rows.includes(sel)}>记录两极产物</LabButton>
      </>}
      extras={
        <Control label="放大窗看哪一只">
          <Segmented label="溶液" pulse={next === 'sel'} want={next === 'sel' ? want : null} value={sel} onChange={v => setSel(v as SolKey)} options={KEYS.map(key => ({ value: key, label: SOLUTIONS[key].short }))} />
        </Control>
      }
    />
  )
}
