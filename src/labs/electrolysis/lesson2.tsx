// 电解和金属防护 · 第 2 课 电解池怎样工作：化验台第二格。
// 左边一只烧杯电解池（两根石墨棒插在 CuCl₂ 溶液里，接直流电源），右边一只铜锌原电池（锌片、铜片插在稀硫酸里，接电流表和开关）。
// 中间上方一扇放大窗：通电后看离子往哪一极移、在电极上得失电子；再换成原电池对比。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass as Panel, Control, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BEAKER, Beaker, LOOK, u } from './gear'
import { CLIP_TAIL, DCSupply, GraphiteRod, KnifeSwitch, Meter, POST, PlateElectrode, Wire } from './rig'
import { Bubbles } from './fx'
import { ELECTRODE, Legend, Micro, type MicroCfg, type Sp } from './micro'
import { LESSONS, goLesson } from './lessons'
import { useRun } from './parts'
import { Fin } from './fin'
import { CELLS, electrolyze, type CellKey } from './physics'
import { BZ, SPOT, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l2, Y = TOP, Z = BZ + 0.6
const p = (x: number, y: number, z: number): V3 => [X0 + u(x), Y + u(y), Z + u(z)]
const EC: V3 = [-0.17, 0, 0.04], GC: V3 = [0.17, 0, 0.04]          // 两只烧杯
const SUPPLY: V3 = [-0.4, 0, -0.03], SYAW = 0.35, METER: V3 = [0.36, 0, -0.05], SWITCH: V3 = [0.33, 0, 0.12]
const post = (k: 'pos' | 'neg'): V3 => { const [x, y, z] = POST[k], c = Math.cos(SYAW), s = Math.sin(SYAW); return [SUPPLY[0] + x * c + z * s, y, SUPPLY[2] - x * s + z * c] }
const LIQ = 0.062, ROD = 0.15, GAP = 0.022
const R = electrolyze('cucl2')
const TASKS: Task[] = [
  { id: 'ions', text: '接通电源，看离子往哪边移', note: 'Cu²⁺ 移向阴极，Cl⁻ 移向阳极；电子只在导线里走' },
  { id: 'rx', text: '看电解池两极上的反应', note: '阴极：Cu²⁺ 得电子成铜（还原）；阳极：Cl⁻ 失电子成 Cl₂（氧化）' },
  { id: 'galv', text: '换成原电池，闭合开关', note: '没有电源：锌自己失电子，电子沿导线流到铜片' },
  { id: 'grx', text: '看原电池两极上的反应', note: '负极锌被氧化，正极上 H⁺ 得电子成 H₂：化学能变成了电能' },
]
const micro = (cell: CellKey, rx: boolean): MicroCfg => cell === 'electro'
  ? { left: { color: ELECTRODE.graphite, tag: '阴极 −', e: 1, take: rx ? { Cu2: { to: 'coat', as: 'Cu' } } : undefined }, right: { color: ELECTRODE.graphite, tag: '阳极 +', e: -1, take: rx ? { Cl: { to: 'gas', as: 'Cl2' } } : undefined }, ions: { Cu2: 8, Cl: 16 }, field: 1 }
  : { left: { color: ELECTRODE.zinc, tag: '负极 Zn', e: -1, emit: rx ? [{ sp: 'Zn2', rate: 0.7 }] : undefined }, right: { color: ELECTRODE.copper, tag: '正极 Cu', e: 1, take: rx ? { H: { to: 'gas', as: 'H2' } } : undefined }, ions: { H: 14, SO4: 7 }, field: -1 }
const LEGEND: Record<CellKey, Sp[]> = { electro: ['Cu2', 'Cl', 'Cu', 'Cl2', 'e'], galvanic: ['H', 'SO4', 'Zn2', 'H2', 'e'] }

export default function Lesson2() {
  const [cell, setCell] = useState<CellKey>('electro')
  const [on, setOn] = useState<Record<CellKey, boolean>>({ electro: false, galvanic: false })
  const [rx, setRx] = useState<Record<CellKey, boolean>>({ electro: false, galvanic: false })
  const T = useTasks('gewu:electrolysis:2', TASKS)
  const watch = useRun(4.5, () => T.check(id => (id === 'ions' && on.electro) || (id === 'galv' && on.galvanic) || (id === 'rx' && rx.electro) || (id === 'grx' && rx.galvanic)))
  const power = () => { setOn(o => ({ ...o, [cell]: true })); watch.run() }
  const react = () => { setRx(o => ({ ...o, [cell]: true })); watch.run() }
  const pick = (k: CellKey) => { if (!watch.busy) setCell(k) }
  const resetAll = () => { setCell('electro'); setOn({ electro: false, galvanic: false }); setRx({ electro: false, galvanic: false }); watch.snap(0); T.reset() }
  const task = T.current, wantCell: CellKey = task && (task.id === 'galv' || task.id === 'grx') ? 'galvanic' : 'electro'
  const { hint, next }: { hint: string; next: 'on' | 'rx' | 'cell' | null } = !task ? { hint: '电解池靠外加电源让反应发生，原电池是反应自己产生电流。', next: null }
    : watch.busy ? { hint: task.id === 'ions' ? 'Cu²⁺ 往阴极移，Cl⁻ 往阳极移…' : task.id === 'rx' ? '阴极上长出铜原子，阳极上冒出氯气分子…' : task.id === 'galv' ? '电子从锌片沿导线流向铜片…' : '锌片溶解，铜片上冒出氢气…', next: null }
    : cell !== wantCell ? { hint: wantCell === 'galvanic' ? '换成原电池：选“原电池”' : '选回“电解池”', next: 'cell' }
    : task.id === 'ions' ? { hint: '接通电源，在放大窗里看离子往哪边移', next: 'on' }
    : task.id === 'rx' ? { hint: '离子到了电极表面会怎样？看电极反应', next: 'rx' }
    : task.id === 'galv' ? { hint: '原电池没有电源。闭合开关', next: 'on' }
    : { hint: '再看原电池两极上的反应', next: 'rx' }

  const yaw = SPOT.l2.view[0], MIC = p(0, 0.335, -0.02), mr = u(0.118)
  const C = CELLS[cell], bh = BEAKER[250].h
  const er = (s: number): V3 => [EC[0] + s * GAP, 0.012, EC[2]], gr = (s: number): V3 => [GC[0] + s * GAP, 0.012, GC[2]]
  const W = (a: V3) => p(...a)
  const etail = (s: number): V3 => [er(s)[0] + CLIP_TAIL[0], er(s)[1] + ROD + CLIP_TAIL[1], er(s)[2] + CLIP_TAIL[2]]
  const gtop = (s: number): V3 => [gr(s)[0], gr(s)[1] + 0.15, gr(s)[2]]
  const labels: Label[] = [
    { id: 'ne', at: p(EC[0], -0.004, EC[2] + 0.045), ax: 0.5, className: `scene-tag ${cell === 'electro' ? 'key' : ''}`, children: <><small>CuCl₂ 溶液</small>电解池</> },
    { id: 'ng', at: p(GC[0], -0.004, GC[2] + 0.045), ax: 0.5, className: `scene-tag ${cell === 'galvanic' ? 'key' : ''}`, children: <><small>稀硫酸</small>原电池</> },
    { id: 'ps', at: p(SUPPLY[0], 0.135, SUPPLY[2]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '直流电源' },
    { id: 'mt', at: p(METER[0], 0.125, METER[2]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电流表' },
    { id: 'zn', at: p(GC[0] - GAP - 0.012, 0.17, GC[2]), ax: 1, name: true, className: 'scene-name', children: '锌片' },
    { id: 'cu', at: p(GC[0] + GAP + 0.012, 0.17, GC[2]), name: true, className: 'scene-name', children: '铜片' },
    ...(rx[cell] ? [
      { id: 'eqL', at: [MIC[0] - mr * 1.5, MIC[1] - mr * 1.08, MIC[2]] as V3, ax: 0, className: 'scene-tag', children: cell === 'electro' ? R.cathodeEq : 'Zn − 2e⁻ = Zn²⁺' },
      { id: 'eqR', at: [MIC[0] + mr * 1.5, MIC[1] - mr * 1.08, MIC[2]] as V3, ax: 1, className: 'scene-tag', children: cell === 'electro' ? R.anodeEq : '2H⁺ + 2e⁻ = H₂↑' },
    ] : []),
  ]
  return (
    <LabShell title="电解和金属防护" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel={C.name}
      stage={<Place at="l2" labels={labels}>
        {/* 电解池：烧杯、两根石墨棒、直流电源 */}
        <group position={W(EC)}><Beaker vol={250} level={LIQ} look={{ color: '#12a59a', opacity: 0.5, vivid: true }} /></group>
        {[-1, 1].map(s => <group key={s} position={W(er(s))}><GraphiteRod len={ROD} wet={LIQ - 0.012} coat={s < 0 && rx.electro ? Math.min(1, 0.3 + watch.k) : 0} clip={s < 0 ? '#16181b' : '#c8262c'} /></group>)}
        <group position={W([EC[0], bh + 0.004, EC[2]])}><mesh castShadow><boxGeometry args={[u(0.085), u(0.007), u(0.016)]} /><meshPhysicalMaterial color="#eceae4" roughness={0.4} clearcoat={0.4} /></mesh></group>
        <Bubbles at={W([er(1)[0], 0.02, EC[2]])} top={u(LIQ - 0.012)} on={on.electro} rate={22} r={u(0.0018)} spread={u(0.004)} speed={u(0.035)} color="#dff08a" opacity={0.8} seed={4} />
        <group position={W(SUPPLY)} rotation-y={SYAW}><DCSupply on={on.electro} volts="6.0" /></group>
        <Wire color="#1b1d20" flow={on.electro ? 1 : 0} pts={[W(post('neg')), W([post('neg')[0] + 0.02, 0.012, post('neg')[2] + 0.05]), W([-0.3, 0.1, 0.07]), W([er(-1)[0] - 0.03, 0.2, 0.0]), W(etail(-1))]} />
        <Wire color="#c8262c" flow={on.electro ? -1 : 0} pts={[W(post('pos')), W([post('pos')[0] + 0.02, 0.012, post('pos')[2] + 0.07]), W([-0.2, 0.012, 0.17]), W([-0.06, 0.1, 0.12]), W([er(1)[0] + 0.035, 0.2, 0.01]), W(etail(1))]} />
        {/* 原电池：烧杯、锌片、铜片、电流表、开关 */}
        <group position={W(GC)}><Beaker vol={250} level={LIQ} look={LOOK.clear} /></group>
        <group position={W(gr(-1))}><PlateElectrode kind="zinc" h={0.13} clip="#16181b" /></group>
        <group position={W(gr(1))}><PlateElectrode kind="copper" h={0.13} clip="#c8262c" /></group>
        <Bubbles at={W([gr(1)[0], 0.02, GC[2] + 0.003])} top={u(LIQ - 0.012)} on={on.galvanic} rate={20} r={u(0.0017)} spread={[u(0.012), u(0.002)]} speed={u(0.035)} seed={6} />
        <group position={W(METER)} rotation-y={-0.3}><Meter value={on.galvanic ? 0.6 : 0} /></group>
        <group position={W(SWITCH)} rotation-y={Math.PI / 2 - 0.2}><KnifeSwitch on={on.galvanic} /></group>
        <Wire color="#1b1d20" flow={on.galvanic ? 1 : 0} pts={[W([gtop(-1)[0], 0.17, GC[2]]), W([gtop(-1)[0] - 0.02, 0.22, GC[2] - 0.03]), W([0.22, 0.2, -0.08]), W([METER[0] - 0.04, 0.125, METER[2] - 0.012])]} />
        <Wire color="#c8262c" flow={on.galvanic ? 1 : 0} pts={[W([METER[0] + 0.03, 0.125, METER[2] + 0.01]), W([0.43, 0.1, 0.03]), W([0.42, 0.02, 0.1]), W([SWITCH[0] + 0.04, 0.022, SWITCH[2] + 0.008])]} />
        <Wire color="#c8262c" flow={on.galvanic ? 1 : 0} pts={[W([SWITCH[0] - 0.035, 0.022, SWITCH[2] - 0.008]), W([0.26, 0.03, 0.13]), W([gtop(1)[0] + 0.03, 0.2, GC[2] + 0.04]), W([gtop(1)[0], 0.17, GC[2]])]} />
        <Micro at={MIC} r={mr} yaw={yaw} from={W([(cell === 'electro' ? EC : GC)[0], 0.05, (cell === 'electro' ? EC : GC)[2] + 0.03])} cfg={micro(cell, rx[cell])} on={on[cell]} seed={cell === 'electro' ? 3 : 8} />
      </Place>}
      lesson={<LessonBlock no="2" title="电解池怎样工作" concept="阴极得电子被还原，阳极失电子被氧化" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>电解池是把电能转化为化学能的装置。它由直流电源、两个电极、电解质溶液（或熔融的电解质）构成闭合回路。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>电子从电源负极沿导线流到阴极，从阳极沿导线流回电源正极；电子不进溶液</li>
            <li>溶液里阳离子移向阴极，在阴极得电子，发生还原反应；阴离子移向阳极，在阳极失电子，发生氧化反应</li>
            <li>原电池正相反：没有外加电源，较活泼的负极自己失电子，化学能转化为电能</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">放大窗里粒子的大小和个数是示意。</p>
        </>} />}
      finale={T.finale && <Fin tag="两种装置都看过了" big="电解池：电能变化学能；原电池：化学能变电能">电解池里接电源负极的是阴极，发生还原反应；接正极的是阳极，发生氧化反应。阳离子总是移向发生还原反应的那一极。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">{C.name}</h2>
          <table className="mt-2 w-full text-[14px] leading-snug">
            <tbody className="[&_td]:py-1.5 [&_td]:align-top [&_td:first-child]:w-[38%] [&_td:first-child]:text-white/55">
              <tr><td>外加电源</td><td>{C.power ? '有' : '没有'}</td></tr>
              <tr><td>能量转化</td><td>{C.energy}</td></tr>
              <tr><td>氧化反应</td><td>{C.ox}（{C.oxLink}）</td></tr>
              <tr><td>还原反应</td><td>{C.red}（{C.redLink}）</td></tr>
              <tr><td>电子流向</td><td>{C.electron}</td></tr>
              <tr><td>离子移动</td><td>阳离子 → {C.cation}，阴离子 → {C.anion}</td></tr>
            </tbody>
          </table>
          <h2 className="mt-4 text-[12.5px] text-white/55">放大窗里的粒子（示意）</h2>
          <Legend items={LEGEND[cell]} />
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'on'} pulse={next === 'on'} onClick={power} disabled={on[cell] || watch.busy}>{cell === 'electro' ? '接通电源' : '闭合开关'}</LabButton>
        <LabButton primary={next === 'rx'} pulse={next === 'rx'} onClick={react} disabled={!on[cell] || rx[cell] || watch.busy}>看电极反应</LabButton>
      </>}
      extras={
        <Control label="放大窗看哪一个">
          <Segmented label="装置" pulse={next === 'cell'} want={next === 'cell' ? wantCell : null} value={cell} onChange={k => pick(k as CellKey)} disabled={watch.busy} options={[{ value: 'electro', label: '电解池' }, { value: 'galvanic', label: '原电池' }]} />
        </Control>
      }
    />
  )
}
