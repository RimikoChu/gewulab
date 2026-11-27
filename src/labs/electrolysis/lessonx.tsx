// 电解和金属防护 · 拓展课 电冶金：电冶金车间里一台朝镜头剖开的熔盐电解槽（示意）。
// 钢壳里砌着耐火内衬，盛着熔融的电解质；左边一块阴极，右边一块吊在铜排下面的石墨阳极，阳极上方一只集气罩。
// 选钠、镁、铝三种金属之一，送电：阴极上析出金属液，流进旁边的抬包；阳极冒出气体。记录转移 6 mol 电子得到多少克金属。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Glass as Panel, Control, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, shell, useTasks, type Label } from '@/lab-kit'
import { Bubbles, Drift, Puffs } from './fx'
import { pipeGeo, POT as C } from './plant'
import { ELECTRODE, Legend, Micro, type MicroCfg, type Sp } from './micro'
import { LESSONS, goLesson } from './lessons'
import { useRun } from './parts'
import { Fin } from './fin'
import { SMELT, SMELT_NE, smeltMass, sodiumFromBrine, type SmeltKey } from './physics'
import { SPOT, Place, type V3 } from './world'

const KEYS = Object.keys(SMELT) as SmeltKey[]
const TASKS: Task[] = [
  { id: 'Na', text: '电解熔融氯化钠，记录得到多少钠', note: '阴极得到钠，阳极放出氯气。电解食盐水溶液是得不到钠的' },
  { id: 'Mg', text: '电解熔融氯化镁，记录得到多少镁', note: '同样转移 6 mol 电子，Mg²⁺ 要得 2 个电子，只得到 3 mol 镁' },
  { id: 'Al', text: '电解熔融氧化铝，记录得到多少铝', note: 'Al³⁺ 要得 3 个电子，只得到 2 mol 铝；氧化铝熔点很高，要加冰晶石助熔' },
]
const ION: Record<SmeltKey, Sp> = { Na: 'Na', Mg: 'Mg2', Al: 'Al3' }
const micro = (k: SmeltKey): MicroCfg => ({
  left: { color: ELECTRODE.steel, tag: '阴极 −', e: 1, take: { [ION[k]]: { to: 'coat', as: 'M' } } },
  right: { color: ELECTRODE.graphite, tag: '阳极 +', e: -1, take: k === 'Al' ? { O2m: { to: 'gas', as: 'O2' } } : { Cl: { to: 'gas', as: 'Cl2' } } },
  ions: k === 'Na' ? { Na: 10, Cl: 10 } : k === 'Mg' ? { Mg2: 6, Cl: 12 } : { Al3: 6, O2m: 9 }, field: 1,
})
const LEGEND: Record<SmeltKey, Sp[]> = { Na: ['Na', 'Cl', 'M', 'Cl2', 'e'], Mg: ['Mg2', 'Cl', 'M', 'Cl2', 'e'], Al: ['Al3', 'O2m', 'M', 'O2', 'e'] }
const MELT: Record<SmeltKey, string> = { Na: '熔融 NaCl', Mg: '熔融 MgCl₂', Al: '熔融 Al₂O₃ 和冰晶石' }

export default function LessonX() {
  const [metal, setMetal] = useState<SmeltKey>('Na')
  const [ran, setRan] = useState(false)
  const [rec, setRec] = useState<Record<string, boolean>>({})
  const T = useTasks('gewu:electrolysis:x', TASKS)
  const run = useRun(7, () => setRan(true))
  const pick = (k: SmeltKey) => { if (run.busy || k === metal) return; setMetal(k); setRan(false); run.snap(0) }
  const record = () => { if (!ran || rec[metal]) return; setRec(r => ({ ...r, [metal]: true })); T.check(id => id === metal) }
  const resetAll = () => { setMetal('Na'); setRan(false); setRec({}); run.snap(0); T.reset() }
  const k = run.busy ? run.k : ran ? 1 : 0, on = run.busy
  const task = T.current, want = (task?.id ?? null) as SmeltKey | null
  const { hint, next }: { hint: string; next: 'on' | 'rec' | 'metal' | null } = !task ? { hint: '钠、镁、铝这样活泼的金属，靠电解它们的熔融化合物冶炼。', next: null }
    : run.busy ? { hint: '阴极上析出金属液，流进抬包…', next: null }
    : metal !== want ? { hint: `选“${SMELT[want!].name}”`, next: 'metal' }
    : !ran ? { hint: `槽里是${MELT[metal]}。送电`, next: 'on' }
    : { hint: '送电结束。记录抬包里得到多少金属', next: 'rec' }

  const S = SMELT[metal], mass = smeltMass(metal, SMELT_NE), nE = Math.round(k * SMELT_NE * 10) / 10
  const x0 = C.x - C.w / 2 + 0.3 + C.lining, x1 = C.x + C.w / 2 - 0.3 - C.lining, yb = C.y0 + 0.3 + C.lining, hIn = C.h - 0.3 - C.lining, top = C.y0 + C.h, lv = yb + hIn * C.level
  const CAT = x0 + 1.1, AN = C.x + 3.2, LAD: V3 = [C.x - C.w / 2 - 6.5, 1.5, C.z + 1.8]
  const g = useMemo(() => ({
    ladle: shell([[0, 0], [2.0, 0], [2.2, 0.3], [2.6, 3.8], [2.75, 3.9]], 0.28, { segs: 40 }),
    tap: pipeGeo([[x0 - 0.2, yb + 0.5, C.z + 2], [C.x - C.w / 2 - 1.2, yb + 0.3, C.z + 2], [LAD[0] + 0.6, LAD[1] + 4.6, LAD[2]], [LAD[0] + 0.3, LAD[1] + 4.0, LAD[2]]], 0.34),
    duct: pipeGeo([[AN, top + 4.6, C.z - 0.5], [AN, top + 8.5, C.z - 0.5], [AN, top + 11.2, C.z - 4], [AN, 24.2, -46]], 0.7),
    bus: pipeGeo([[AN + 0.9, top + 2.4, C.z + 1.2], [C.x + C.w / 2 + 3, top + 2.4, C.z + 1.2], [C.x + C.w / 2 + 3, top + 2.4, C.z - 12]], 0.3, 4),
    busN: pipeGeo([[CAT, top + 1.2, C.z + 1.2], [C.x - C.w / 2 - 2.5, top + 1.2, C.z + 1.2], [C.x - C.w / 2 - 2.5, top + 1.2, C.z - 12]], 0.3, 4),
  }), [])   // eslint-disable-line react-hooks/exhaustive-deps
  const yaw = SPOT.x.view[0], MIC: V3 = [C.x - 17, 17, C.z + 3], mr = 3.0
  const fill = 0.02 + 2.9 * k * (mass / 138)
  const labels: Label[] = [
    { id: 'cat', at: [CAT - 0.4, top + 2.2, C.z + 2], ax: 1, className: 'scene-tag -translate-y-full', children: <><small>接负极</small>阴极</> },
    { id: 'an', at: [AN + 1.6, top + 3.6, C.z + 2], className: 'scene-tag -translate-y-1/2', children: <><small>接正极</small>石墨阳极</> },
    { id: 'melt', at: [C.x - 2.5, C.y0 - 0.5, C.z + C.d / 2], ax: 0.5, className: 'scene-tag key', children: MELT[metal] },
    ...(k > 0.15 ? [{ id: 'gas', at: [AN + 3.4, lv + 1.4, C.z + 2] as V3, className: 'scene-tag -translate-y-1/2', children: S.gas }] : []),
    { id: 'lad', at: [LAD[0], 0.3, LAD[2] + 3], ax: 0.5, className: 'scene-tag', children: <><small>抬包</small>{rec[metal] ? `${S.name} ${mass} g` : k > 0.1 ? `${S.name}液` : '空'}</> },
    { id: 'pot', at: [C.x + C.w / 2 + 0.6, C.y0 + 1.5, C.z + C.d / 2], name: true, className: 'scene-name', children: '熔盐电解槽（示意）' },
  ]
  return (
    <LabShell title="电解和金属防护" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel="熔盐电解槽"
      stage={<Place at="x" labels={labels}>
        {/* 阴极：一块钢板，上端伸出槽口接铜排；阳极：吊在导杆下面的石墨块 */}
        <mesh position={[CAT, (yb + 0.3 + top + 1.2) / 2, C.z + 0.6]} castShadow><boxGeometry args={[0.7, top + 1.2 - yb - 0.3, C.d - 4]} /><meshStandardMaterial color="#6f757b" metalness={0.8} roughness={0.5} /></mesh>
        <mesh position={[AN, yb + 1 + (lv + 0.8 - yb - 1) / 2, C.z + 0.6]} castShadow><boxGeometry args={[4.6, lv + 0.8 - yb - 1, C.d - 4]} /><meshStandardMaterial color="#26282b" roughness={0.75} metalness={0.3} /></mesh>
        <mesh position={[AN, lv + 1.5, C.z + 0.6]} castShadow><boxGeometry args={[1.1, 1.4, 1.6]} /><Metal kind="steel" grain="cast" /></mesh>
        <mesh position={[AN, (lv + 2.2 + top + 2.9) / 2, C.z + 0.6]} castShadow><boxGeometry args={[0.6, top + 2.9 - lv - 2.2, 0.6]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        <mesh geometry={g.bus} castShadow><Metal kind="copper" grain="brushed" /></mesh>
        <mesh geometry={g.busN} castShadow><Metal kind="copper" grain="brushed" /></mesh>
        {/* 阳极上方的集气罩和排气管 */}
        <mesh position={[AN, top + 3.9, C.z - 0.5]} castShadow><cylinderGeometry args={[0.9, 3.4, 1.6, 4, 1, true]} /><meshStandardMaterial color="#9aa0a4" metalness={0.6} roughness={0.5} side={2} /></mesh>
        <mesh geometry={g.duct} castShadow><meshStandardMaterial color="#9aa0a4" metalness={0.6} roughness={0.5} /></mesh>
        <Bubbles at={[AN, yb + 1.2, C.z + 2.9]} top={lv - yb - 1.3} on={on} rate={46} r={0.13} spread={[2.5, 0.4]} speed={2.2} color={S.gas === 'Cl₂' ? '#dff08a' : '#ffffff'} opacity={0.8} seed={4} />
        <Puffs at={[AN, lv + 1, C.z + 1.5]} on={on} opt={{ rate: 6, life: 2, size: [1.4, 3.2], speed: 1.2, color: S.gas === 'Cl₂' ? '#c9dc5a' : '#e6e6e0', opacity: 0.2, spread: 0.4, jitter: 1.6 }} seed={6} />
        {/* 阴极上析出的金属液滴，顺着阴极流到槽底的出料口，再流进抬包 */}
        <Drift from={[CAT + 0.6, lv - 0.6, C.z + 2.6]} to={[CAT + 0.5, yb + 0.5, C.z + 2.6]} size={[0.2, 0.6, 1.2]} n={9} r={0.2} color="#eef1f4" on={on} speed={0.35} seed={2} />
        <mesh geometry={g.tap} castShadow><meshStandardMaterial color="#5a4a42" roughness={0.8} /></mesh>
        <group position={LAD}>
          <mesh geometry={g.ladle} castShadow receiveShadow><meshStandardMaterial color="#4b5258" metalness={0.6} roughness={0.6} side={2} /></mesh>
          {[-1, 1].map(s => <mesh key={s} position={[s * 2.7, 2.4, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.3, 0.3, 0.9, 12]} /><Metal kind="steel" /></mesh>)}
          <mesh position-y={0.28 + fill / 2} renderOrder={3}><cylinderGeometry args={[1.75 + fill * 0.14, 1.75, fill, 32]} /><meshStandardMaterial color="#e6e9ec" emissive="#ff9a4a" emissiveIntensity={0.35} metalness={0.9} roughness={0.2} /></mesh>
          {/* 小车：一块平板、四只轮子 */}
          <mesh position-y={-0.45} castShadow><boxGeometry args={[6.4, 0.5, 4.4]} /><meshStandardMaterial color="#d9a520" roughness={0.5} /></mesh>
          {[-1, 1].flatMap(a => [-1, 1].map(b => <mesh key={`${a}${b}`} position={[a * 2.2, -0.75, b * 1.6]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.42, 0.42, 0.3, 16]} /><Metal kind="steel" /></mesh>))}
        </group>
        {(on || ran) && <Micro at={MIC} r={mr} yaw={yaw} from={[CAT + 0.4, lv - 1.2, C.z + C.d / 2]} cfg={micro(metal)} on={on || ran} seed={KEYS.indexOf(metal) + 5} />}
      </Place>}
      lesson={<LessonBlock no="拓展" title="电冶金" concept="活泼金属靠电解熔融的化合物冶炼" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>电解是最强有力的氧化还原手段。钠、镁、铝这样活泼的金属，很难用还原剂把它们从化合物里还原出来，工业上用电解法冶炼。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            {KEYS.map(key => <li key={key}>{SMELT[key].name}：{SMELT[key].total}</li>)}
            <li>必须电解熔融物，不能用水溶液：水溶液里 H⁺ 比 Na⁺、Mg²⁺、Al³⁺ 先放电{sodiumFromBrine() ? '' : '，阴极只会得到氢气'}</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">工业上三种金属的电解槽各不相同，这里共用一台示意的熔盐电解槽。</p>
        </>} />}
      finale={T.finale && <Fin tag="三种金属都炼过了" big="同样 6 mol 电子：钠 138 g，镁 72 g，铝 54 g">金属离子带几个正电荷，1 mol 就要得几摩尔电子：{KEYS.map(key => `${SMELT[key].ion} 得 ${SMELT[key].z} 个`).join('，')}。所以冶炼铝特别耗电。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">冶炼{S.name} · 原料：{S.raw}</h2>
          <div className="mt-2 flex flex-col gap-1.5 text-[13.5px]">
            <div className="rounded-xl bg-white/8 px-3 py-2"><span className="text-white/55">阴极　</span>{S.cathodeEq}</div>
            <div className="rounded-xl bg-white/8 px-3 py-2"><span className="text-white/55">阳极　</span>{S.anodeEq}</div>
            <div className="rounded-xl bg-white/8 px-3 py-2"><span className="text-white/55">总反应　</span>{S.total}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol={<>n(e⁻)</>} value={nE.toFixed(1)} unit="mol · 转移的电子" />
            <ParamTile symbol={`m(${metal})`} value={rec[metal] ? String(mass) : '—'} unit="g · 抬包里" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">三种金属（各转移 {SMELT_NE} mol 电子）</h2>
          <table className="mt-1 w-full text-[13.5px] tabular-nums">
            <tbody>{KEYS.map(key => <tr key={key} className={key === metal ? 'text-white' : 'text-white/65'}><td className="py-1">{SMELT[key].name}</td><td>{SMELT[key].ion}</td><td>{rec[key] ? `${smeltMass(key, SMELT_NE)} g` : '—'}</td></tr>)}</tbody>
          </table>
          {(on || ran) && <>
            <h2 className="mt-3 text-[12.5px] text-white/55">放大窗里的粒子（示意）</h2>
            <Legend items={LEGEND[metal]} />
          </>}
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'on'} pulse={next === 'on'} onClick={() => run.run()} disabled={run.busy || ran}>送电</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!ran || !!rec[metal]}>记录</LabButton>
      </>}
      extras={
        <Control label="冶炼哪种金属">
          <Segmented label="金属" pulse={next === 'metal'} want={next === 'metal' ? want : null} value={metal} onChange={v => pick(v as SmeltKey)} disabled={run.busy} options={KEYS.map(key => ({ value: key, label: SMELT[key].name }))} />
        </Control>
      }
    />
  )
}
