// 电解和金属防护 · 第 7 课 金属的电化学防护：厂外码头栈桥下的一根钢管桩，海水朝镜头剖开。
// 四种做法各泡三个月：什么也不做；桩上焊两块锌块；换成铜块（反例）；桥面上装一台恒电位仪，负极接钢桩、正极接挂在海水里的辅助阳极。
// 看钢桩锈不锈、电子往哪流，放大窗里看谁在失电子。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Glass as Panel, Control, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Led, Metal, useTasks, type Label } from '@/lab-kit'
import { Drift } from './fx'
import { pipeGeo } from './plant'
import { ELECTRODE, Legend, Micro, SP, type MicroCfg, type Side, type Sp } from './micro'
import { LESSONS, goLesson } from './lessons'
import { useRun } from './parts'
import { Fin } from './fin'
import { GUARDS, guardFlow, sacrificial, steelRate, type GuardKey } from './physics'
import { PIER as Q } from './plant'
import { SPOT, Place, type V3 } from './world'

const KEYS = Object.keys(GUARDS) as GuardKey[]
const TASKS: Task[] = [
  { id: 'none', text: '什么也不做，泡三个月', note: '钢桩生锈了：钢里的铁做负极失电子，是吸氧腐蚀' },
  { id: 'zinc', text: '焊上锌块，再泡三个月', note: '锌块被腐蚀变小，钢桩完好：锌比铁活泼，替铁做了负极' },
  { id: 'copper', text: '把锌块换成铜块试试', note: '钢桩锈得更快：铁比铜活泼，钢桩成了负极' },
  { id: 'power', text: '接上外加电源，再泡三个月', note: '钢桩完好：它接电源负极做阴极，电子不断送过来' },
]
const O2SIDE = (color: string, tag: string): Side => ({ color, tag, e: 1, take: { O2: { to: 'gone' } }, emit: [{ sp: 'OH', rate: 0.8 }] })
const SEA = { O2: 7, Na: 5, Cl: 5 }
const MICRO: Record<GuardKey, MicroCfg> = {
  none: { left: { color: ELECTRODE.iron, tag: '负极 铁', e: -1, emit: [{ sp: 'Fe2', rate: 0.6 }] }, right: O2SIDE(ELECTRODE.graphite, '正极 碳'), ions: SEA, field: -1 },
  zinc: { left: { color: ELECTRODE.zinc, tag: '负极 锌块', e: -1, emit: [{ sp: 'Zn2', rate: 0.7 }] }, right: O2SIDE(ELECTRODE.steel, '正极 钢桩'), ions: SEA, field: -1 },
  copper: { left: { color: ELECTRODE.steel, tag: '负极 钢桩', e: -1, emit: [{ sp: 'Fe2', rate: 0.9 }] }, right: O2SIDE(ELECTRODE.copper, '正极 铜块'), ions: SEA, field: -1 },
  power: { left: { color: ELECTRODE.graphite, tag: '辅助阳极 +', e: -1 }, right: O2SIDE(ELECTRODE.steel, '阴极 钢桩 −'), ions: SEA, field: -1 },
}
const LEGEND: Record<GuardKey, Sp[]> = { none: ['Fe2', 'O2', 'OH', 'Na', 'Cl', 'e'], zinc: ['Zn2', 'O2', 'OH', 'Na', 'Cl', 'e'], copper: ['Fe2', 'O2', 'OH', 'Na', 'Cl', 'e'], power: ['O2', 'OH', 'Na', 'Cl', 'e'] }

/** 锈迹：一张带透明度的斑驳贴图，裹在钢桩外面 */
function rustTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512
  const g = c.getContext('2d')!; let s = 19; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 520; i++) { const x = r() * 256, y = r() * 512, R = 8 + r() * 30, q = g.createRadialGradient(x, y, 0, x, y, R); const col = r() < 0.5 ? '150,70,28' : r() < 0.6 ? '196,110,48' : '104,48,22'; q.addColorStop(0, `rgba(${col},0.85)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x - R, y - R, R * 2, R * 2); if (x < 40) { g.fillStyle = q; g.save(); g.translate(256, 0); g.fillRect(x - R, y - R, R * 2, R * 2); g.restore() } }
  for (let i = 0; i < 60; i++) { const x = r() * 256, y = r() * 300; g.fillStyle = 'rgba(120,56,24,0.35)'; g.fillRect(x, y, 2 + r() * 3, 40 + r() * 140) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); return t
}

export default function Lesson7() {
  const [guard, setGuard] = useState<GuardKey>('none')
  const [done, setDone] = useState<Record<string, boolean>>({})
  const T = useTasks('gewu:electrolysis:7', TASKS)
  const soak = useRun(6.5, () => { setDone(d => ({ ...d, [guard]: true })); T.check(id => id === guard) })
  const pick = (k: GuardKey) => { if (soak.busy || k === guard) return; setGuard(k); soak.snap(0) }
  const resetAll = () => { setGuard('none'); setDone({}); soak.snap(0); T.reset() }
  const k = soak.busy ? soak.k : done[guard] && soak.t > 0 ? 1 : 0, rate = steelRate(guard)
  const task = T.current, want = (task?.id ?? null) as GuardKey | null
  const { hint, next }: { hint: string; next: 'soak' | 'guard' | null } = !task ? { hint: '让被保护的金属做原电池的正极，或者做电解池的阴极。', next: null }
    : soak.busy ? { hint: '海水里一天天泡着…', next: null }
    : guard !== want ? { hint: `选“${GUARDS[want!].name}”`, next: 'guard' }
    : { hint: guard === 'none' ? '钢桩什么保护也没有。泡三个月，看它锈不锈' : guard === 'zinc' ? '桩上焊了两块锌块。再泡三个月' : guard === 'copper' ? '锌块换成了铜块。泡三个月看看' : '恒电位仪的负极接钢桩，正极接海水里的辅助阳极。再泡三个月', next: 'soak' }

  const tex = useMemo(() => rustTex(), [])
  const G = GUARDS[guard], months = Math.round(k * 3 * 10) / 10
  const rustK = rate === 0 ? 0 : Math.min(1, k * (rate === 2 ? 1.25 : 0.7))
  const blockZ = Q.z + Q.r + 0.42, BY = [-10.5, -17.5]
  const shrink = guard === 'zinc' ? 1 - 0.45 * k : 1
  const CAB: V3 = [Q.x - 11, Q.deck + 0.7, -6.4], AUX: V3 = [Q.x - 10, -13, Q.z + 1]
  const cable = useMemo(() => ({
    neg: pipeGeo([[CAB[0] + 0.8, CAB[1] + 1.2, CAB[2] + 1.1], [CAB[0] + 2.4, CAB[1] + 0.3, CAB[2] + 1.6], [Q.x - 2.4, Q.deck + 0.9, -5], [Q.x - 1, Q.deck - 0.6, -4.6], [Q.x, Q.deck - 2.6, Q.z + Q.r + 0.1], [Q.x, Q.deck - 4, Q.z + Q.r + 0.05]], 0.13, 8),
    pos: pipeGeo([[CAB[0] - 0.6, CAB[1] + 1.2, CAB[2] + 1.1], [CAB[0] - 0.4, CAB[1] + 0.3, CAB[2] + 1.6], [AUX[0] + 1, Q.deck + 0.9, -4.9], [AUX[0], Q.deck + 0.4, -4.6], [AUX[0], Q.sea, AUX[2]], [AUX[0], AUX[1] + 3.6, AUX[2]]], 0.13, 8),
  }), [])   // eslint-disable-line react-hooks/exhaustive-deps
  const yaw = SPOT.l7.view[0], MIC: V3 = [Q.x + 10.5, -16.2, Q.cut + 4], mr = 4.6
  const labels: Label[] = [
    { id: 'pile', at: [Q.x + Q.r + 0.6, -3.2, Q.z], className: 'scene-tag -translate-y-1/2', children: <><small>钢桩是</small>{G.steel}</> },
    ...(k > 0.5 ? [{ id: 'rust', at: [Q.x + Q.r + 0.6, -7.2, Q.z] as V3, className: `scene-tag ${rate ? '' : 'key'} -translate-y-1/2`, children: rate === 0 ? '钢桩完好' : rate === 2 ? '锈得更快' : '生锈了' }] : []),
    ...(guard === 'zinc' || guard === 'copper' ? [{ id: 'blk', at: [Q.x - 1.3, BY[0], blockZ] as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: guard === 'zinc' ? <><small>负极</small>锌块</> : <><small>正极</small>铜块</> }] : []),
    ...(guard === 'power' ? [
      { id: 'cab', at: [CAB[0] + 2, CAB[1] + 1.6, CAB[2] + 1.2] as V3, className: 'scene-tag -translate-y-1/2', children: <><small>直流电源</small>恒电位仪</> },
      { id: 'aux', at: [AUX[0] - 0.9, AUX[1], AUX[2]] as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>接正极</small>辅助阳极</> },
    ] : []),
    { id: 'sea', at: [Q.x + 12, Q.sea - 1.2, Q.cut], ax: 0.5, name: true, className: 'scene-name', children: '海水' },
    { id: 'bed', at: [Q.x + 12, Q.bed - 2, Q.cut], ax: 0.5, name: true, className: 'scene-name', children: '海床' },
  ]
  return (
    <LabShell title="电解和金属防护" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="码头钢桩"
      stage={<Place at="l7" labels={labels}>
        {/* 锈：从潮差段往下，裹在钢桩外面的一层 */}
        <mesh position={[Q.x, (Q.sea + 2.5 + Q.bed) / 2, Q.z]} renderOrder={3}><cylinderGeometry args={[Q.r + 0.03, Q.r + 0.03, Q.sea + 2.5 - Q.bed, 40, 1, true]} /><meshStandardMaterial map={tex} transparent opacity={rustK} roughness={0.95} depthWrite={false} /></mesh>
        {/* 焊在桩上的两块牺牲阳极（锌）或者铜块：梯形的铸块，两头各一条扁钢焊脚 */}
        {(guard === 'zinc' || guard === 'copper') && BY.map(y => <group key={y} position={[Q.x, y, blockZ]}>
          {[-1, 1].map(s => <mesh key={s} position={[0, s * 1.75, -0.2]}><boxGeometry args={[0.36, 0.5, 0.5]} /><Metal kind="steel" /></mesh>)}
          <RoundedBox args={[1.25 * shrink, 3.4 * (0.6 + 0.4 * shrink), 0.8 * shrink]} radius={0.14 * shrink} smoothness={3} castShadow>{guard === 'zinc' ? <meshStandardMaterial color={new THREE.Color('#8f9aa8').lerp(new THREE.Color('#c9cdc6'), k)} metalness={0.6 - 0.4 * k} roughness={0.5 + 0.4 * k} /> : <meshStandardMaterial color="#c8643c" emissive="#6a2a12" emissiveIntensity={0.5} metalness={0.6} roughness={0.5} />}</RoundedBox>
          <Drift from={guard === 'zinc' ? [Q.x, y, blockZ - 0.1] : [Q.x, y + 2.6, Q.z + Q.r]} to={guard === 'zinc' ? [Q.x, y + 2.6, Q.z + Q.r] : [Q.x, y, blockZ - 0.1]} size={[0.5, 0.3, 0.1]} n={5} r={0.14} color={SP.e.color} on={soak.busy} speed={0.5} seed={Math.round(-y)} />
        </group>)}
        {/* 外加电流：桥面上一台恒电位仪，黑色电缆接钢桩，红色电缆接挂在海水里的辅助阳极 */}
        {guard === 'power' && <group>
          <RoundedBox args={[3.6, 3.4, 2.2]} radius={0.12} position={[CAB[0], CAB[1] + 1.7, CAB[2]]} castShadow><meshPhysicalMaterial color="#d6dad8" roughness={0.45} metalness={0.3} clearcoat={0.3} /></RoundedBox>
          <mesh position={[CAB[0], CAB[1] + 3.5, CAB[2]]}><boxGeometry args={[4, 0.2, 2.6]} /><meshStandardMaterial color="#8d9396" roughness={0.6} /></mesh>
          <Led text={soak.busy ? '-0.85' : '0.00'} w={1.7} h={0.7} position={[CAB[0] - 0.6, CAB[1] + 2.3, CAB[2] + 1.12]} />
          <mesh position={[CAB[0] + 1.1, CAB[1] + 2.3, CAB[2] + 1.12]}><circleGeometry args={[0.2, 16]} /><meshBasicMaterial color={soak.busy ? '#5cff8a' : '#24352a'} toneMapped={!soak.busy} /></mesh>
          <mesh geometry={cable.neg} castShadow><meshStandardMaterial color="#16181b" roughness={0.6} /></mesh>
          <mesh geometry={cable.pos} castShadow><meshStandardMaterial color="#b8262c" roughness={0.6} /></mesh>
          <mesh position={[AUX[0], AUX[1], AUX[2]]} castShadow><cylinderGeometry args={[0.42, 0.42, 7.2, 20]} /><meshStandardMaterial color="#33363a" roughness={0.6} metalness={0.4} /></mesh>
          <mesh position={[AUX[0], AUX[1] + 3.8, AUX[2]]}><cylinderGeometry args={[0.5, 0.5, 0.5, 20]} /><meshStandardMaterial color="#b8262c" roughness={0.5} /></mesh>
          <Drift from={[CAB[0] + 2, Q.deck + 1.2, -5]} to={[Q.x, Q.deck - 3, Q.z + Q.r + 0.3]} size={[0.2, 0.2, 0.2]} n={5} r={0.16} color={SP.e.color} on={soak.busy} speed={0.4} seed={3} />
          <Drift from={[Q.x, Q.deck - 4, Q.z + Q.r + 0.3]} to={[Q.x, Q.bed + 3, Q.z + Q.r + 0.3]} size={[0.6, 0.2, 0.1]} n={9} r={0.16} color={SP.e.color} on={soak.busy} speed={0.3} seed={4} />
        </group>}
        {(soak.busy || k > 0) && <Micro at={MIC} r={mr} yaw={yaw} from={[Q.x + Q.r, -15, Q.z + 0.6]} cfg={MICRO[guard]} on={soak.busy || k > 0} seed={KEYS.indexOf(guard) + 3} />}
      </Place>}
      lesson={<LessonBlock no="7" title="金属的电化学防护" concept="让被保护的金属做正极或者阴极" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>电化学腐蚀里被腐蚀的是失电子的那一极。只要让要保护的金属不失电子，它就不会被腐蚀。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>牺牲阳极法（原电池原理）：给钢铁连上一块更活泼的金属（锌、镁合金等）。它做负极被腐蚀，钢铁做正极受到保护；锌块用完了要换</li>
            <li>外加电流法（电解池原理）：钢铁接直流电源的负极做阴极，电源正极接一个惰性的辅助阳极，都浸在海水或土壤里</li>
            <li>连上比铁不活泼的金属（比如铜）适得其反：铁成了负极，腐蚀得更快</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">为了看得清，三个月的变化画得很夸张；锈蚀只分“完好、生锈、锈得更快”，不是测量值。</p>
        </>} />}
      finale={T.finale && <Fin tag="四种做法都试过了" big="牺牲阳极法和外加电流法都能保护钢桩">挂{sacrificial('Zn') ? '锌块' : ''}时钢桩是原电池的正极；接外加电源时钢桩是电解池的阴极。两种办法都让电子流向钢桩，铁不再失电子。挂铜块适得其反。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="t" value={months.toFixed(1)} unit="个月 · 泡了多久" />
            <ParamTile symbol="钢桩" value={G.steel} unit={G.principle.length > 8 ? '微小的原电池' : G.principle} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">{G.name}{G.method && ` · ${G.method}`}</h2>
          <div className="mt-2 flex flex-col gap-1.5 text-[13.5px]">
            <div className="rounded-xl bg-white/8 px-3 py-2"><span className="text-white/55">电子流向　</span>{guardFlow(guard)}</div>
            <div className="rounded-xl bg-white/8 px-3 py-2"><span className="text-white/55">三个月后　</span>{done[guard] && k === 1 ? (rate === 0 ? '钢桩完好' : rate === 2 ? '钢桩锈得更快' : '钢桩生锈') : '—'}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">四种做法</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <tbody>{KEYS.map(key => <tr key={key} className={key === guard ? 'text-white' : 'text-white/65'}><td className="py-1">{GUARDS[key].name}</td><td>{T.done[key] ? (steelRate(key) === 0 ? '完好' : steelRate(key) === 2 ? '锈得更快' : '生锈') : '—'}</td></tr>)}</tbody>
          </table>
          {(soak.busy || k > 0) && <>
            <h2 className="mt-3 text-[12.5px] text-white/55">放大窗里的粒子（示意）</h2>
            <Legend items={LEGEND[guard]} />
          </>}
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'soak'} pulse={next === 'soak'} onClick={() => soak.run()} disabled={soak.busy || (done[guard] && k === 1)}>泡三个月</LabButton>
      </>}
      extras={
        <Control label="怎么保护钢桩">
          <Segmented label="做法" pulse={next === 'guard'} want={next === 'guard' ? want : null} value={guard} onChange={v => pick(v as GuardKey)} disabled={soak.busy} options={KEYS.map(key => ({ value: key, label: GUARDS[key].name }))} />
        </Control>
      }
    />
  )
}
