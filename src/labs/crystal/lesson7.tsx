// 分子的形状和晶体 · 第 7 课 四类晶体：东墙 X 射线衍射仪旁边的展台。转台上一块晶体的模型夹在两块电极板中间，导线接到一只小灯上。
// 铜、氯化钠、干冰、金刚石轮流放上来：加电压，看灯亮不亮；加热，看温度升到多少晶体才散开。铜和氯化钠熔化后流进下面的瓷槽里，氯化钠熔化以后再加一次电压。
import { useState } from 'react'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { A, CellModel } from './cell'
import { Fin, Row } from './fin'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { ease, seg, useRun, useTime } from './parts'
import { CRYSTALS, CRYSTAL_KEYS, breaksUp, conducts, heatTemp, tempText, type CrystalKey, type Site, type V3 } from './physics'
import { Circuit, Electrons, TROUGH, Trough } from './rig'
import { VOICE } from './voice'
import { Place, center } from './world'

const TASKS: Task[] = [
  { id: 'Cu', text: '铜：加电压，再加热', note: '金属晶体：固态就导电，1083 °C 熔化' },
  { id: 'NaCl', text: '氯化钠：加电压，加热，熔化后再加一次电压', note: '离子晶体：固态不导电，801 °C 熔化后导电' },
  { id: 'dryice', text: '干冰：加电压，再加热', note: '分子晶体：不导电，−78.5 °C 就升华了，分子本身没变' },
  { id: 'diamond', text: '金刚石：加电压，再加热', note: '共价晶体：不导电，到 3500 °C 还没熔化' },
]
const DROP = 3.2, C = center('l7', DROP), ROT = -0.55, HEAT = 4.4, ALL = 6.8
/** 槽底离模型中心多远；液面多高 */
const POOL = -DROP + TROUGH.t, LEVEL = 0.82
const INTRO: Record<CrystalKey, string> = {
  Cu: '铜晶体里有能自由移动的电子（蓝色的小点）。给它加上电压', NaCl: '氯化钠晶体由 Na⁺ 和 Cl⁻ 构成。给它加上电压',
  dryice: '干冰晶体由一个个 CO₂ 分子构成。给它加上电压', diamond: '金刚石里每个碳原子都和 4 个碳原子用共价键连着。给它加上电压',
}
const AFTER: Record<CrystalKey, string> = {
  Cu: '灯亮了：自由电子在定向移动。现在加热', NaCl: '灯不亮：离子被离子键固定在原位。现在加热',
  dryice: '灯不亮：CO₂ 分子不带电。现在加热', diamond: '灯不亮：价电子都用来形成共价键了。现在加热',
}
const GLOW: Record<CrystalKey, number> = { Cu: 0.3, NaCl: 0.14, dryice: 0, diamond: 0.5 }
const heatResult = (c: CrystalKey) => CRYSTALS[c].sublime ? `${tempText(CRYSTALS[c].top)} 升华` : breaksUp(c) ? `${tempText(CRYSTALS[c].top)} 熔化` : `到 ${tempText(CRYSTALS[c].top)} 还没熔化`

export default function Lesson7() {
  const T = useTasks('gewu:crystal:7', TASKS)
  const [cry, setCry] = useState<CrystalKey>('Cu')
  const [vS, setVS] = useState(false), [heated, setHeated] = useState(false), [vM, setVM] = useState(false)
  const t = useTime()
  const volt = useRun(3.4, () => { if (heated) { setVM(true); if (cry === 'NaCl') T.check(id => id === cry) } else setVS(true) })
  const heat = useRun(ALL, () => { setHeated(true); if (cry !== 'NaCl') T.check(id => id === cry) })
  const pick = (c: CrystalKey) => { setCry(c); setVS(false); setHeated(false); setVM(false); volt.snap(0); heat.snap(0) }
  const resetAll = () => { pick('Cu'); T.reset() }
  const busy = volt.busy || heat.busy, K = CRYSTALS[cry], task = T.current
  const hk = heat.busy ? seg(heat.t, 0, HEAT) : heated ? 1 : 0
  const mk = !breaksUp(cry) ? 0 : heat.busy ? ease(seg(heat.t, HEAT, ALL)) : heated ? 1 : 0
  const melted = heated && breaksUp(cry), lit = volt.busy && volt.t > 0.6 && conducts(cry, melted)
  const want = CRYSTAL_KEYS.find(c => !T.done[c]) ?? null, liquid = breaksUp(cry) && !CRYSTALS[cry].sublime

  const { hint, next }: { hint: string; next: 'cry' | 'volt' | 'heat' | null } = !task || !want ? { hint: '四类晶体都试过了。', next: null }
    : volt.busy ? { hint: '加上电压，看小灯亮不亮…', next: null }
    : heat.busy ? { hint: '加热，温度一路升高…', next: null }
    : cry !== want ? { hint: `把晶体换成${CRYSTALS[want].name}`, next: 'cry' }
    : !vS ? { hint: INTRO[cry], next: 'volt' }
    : !heated ? { hint: AFTER[cry], next: 'heat' }
    : { hint: '801 °C，氯化钠熔化了，离子能自由移动了。再加一次电压', next: 'volt' }

  // 每个粒子偏离原位多少：受热振动越来越厉害；熔化后到处游动；干冰的分子一个个飞散；熔融的氯化钠通电时阴、阳离子各往一边移动
  const offset = (i: number, s: Site): V3 => {
    const w = 0.7 + (i * 0.37) % 1, amp = 0.02 + 0.1 * hk * (1 - mk)
    const o: V3 = [Math.sin(t * 11 * w + i) * amp, Math.sin(t * 13 * w + i * 2.1) * amp, Math.cos(t * 12 * w + i * 1.3) * amp]
    if (mk > 0) {
      const wx = Math.sin(t * 0.9 * w + i * 1.7), wy = Math.sin(t * 0.7 * w + i * 2.9), wz = Math.cos(t * 0.8 * w + i * 0.6)
      if (cry === 'dryice') { const d = [s.p[0] - 0.5, s.p[1] - 0.2, s.p[2] - 0.5], l = Math.hypot(d[0], d[1], d[2]) || 1, far = mk * (1.3 + (i % 4) * 0.45); o[0] += d[0] / l * far + wx * 0.35 * mk; o[1] += d[1] / l * far + wy * 0.35 * mk; o[2] += d[2] / l * far + wz * 0.35 * mk }
      else {
        // 熔化：粒子落进槽里，在液面下面游动
        const f = (k: number) => (i * k) % 1, tx = (f(0.618) - 0.5) * 2 * (TROUGH.hx - 1.05), tz = (f(0.414) - 0.5) * 2 * (TROUGH.hz - 0.5), ty = POOL + 0.16 + f(0.732) * 0.14
        o[0] += (tx - (s.p[0] - 0.5) * A + wx * 0.22) * mk; o[1] += (ty - (s.p[1] - 0.5) * A + wy * 0.04) * mk; o[2] += (tz - (s.p[2] - 0.5) * A + wz * 0.22) * mk
      }
      if (cry === 'NaCl' && volt.busy) o[0] += (s.el === 'Na' ? -1 : 1) * 0.7 * Math.sin(Math.PI * ease(volt.k))
    }
    return o
  }
  const labels: Label[] = [
    { id: 'n', at: [C[0], C[1] + 3.1, C[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `${K.name}晶体的模型，夹在两块电极板中间，下面是一只瓷槽` },
    { id: 't', at: [C[0], C[1] + 2.5, C[2]], ax: 0.5, className: `scene-tag ${heated ? 'key' : ''} -translate-y-full transition-opacity`, style: { opacity: heat.busy || heated ? 1 : 0 }, children: <><small>温度</small>{heat.busy && hk < 1 ? `${heatTemp(cry, hk).toFixed(0).replace('-', '−')} °C` : heatResult(cry)}</> },
    { id: 'l', at: [C[0] + 3.15 * Math.sin(ROT) + 1.2, C[1] - 2.2, C[2] + 3.15 * Math.cos(ROT)], ax: 0, className: `scene-tag ${lit ? 'key' : ''} -translate-y-1/2 transition-opacity`, style: { opacity: volt.busy && volt.t > 0.8 ? 1 : 0 }, children: lit ? '灯亮了' : '灯不亮' },
  ]
  return (
    <LabShell title="分子的形状和晶体" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="操作"
      stage={<Place at="l7" labels={labels}><group position={C} rotation-y={ROT}>
        <CellModel key={cry} c={cry} offset={offset} sticks={1 - mk} frame={liquid ? 1 - mk : 1 - 0.8 * mk} heat={GLOW[cry] * hk * (1 - 0.5 * mk)} heatColor={cry === 'diamond' ? '#ffd9a0' : '#ff6a2a'} shrink={liquid ? mk : 0} />
        <Trough y={-DROP} level={liquid ? LEVEL * mk : 0} color={cry === 'Cu' ? '#ff8a3a' : '#ffc890'} glow={cry === 'Cu' ? 0.45 : 0.1} opacity={cry === 'Cu' ? 0.42 : 0.2} />
        <Circuit w={A / 2 + 0.95} drop={DROP} on={volt.busy} lit={lit} size={[A + 1.7, A + 0.3]} at={[0, 3.15]} />
        {cry === 'Cu' && <group position-y={(POOL + 0.25) * mk}><Electrons n={26} box={[A + 0.9, A * (1 - mk) + 0.2 * mk, A]} t={t} drift={volt.busy ? 5 : 0} /></group>}
      </group></Place>}
      lesson={<LessonBlock no="7" title="四类晶体" concept="粒子间的作用力决定晶体的性质" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>晶体按构成粒子和粒子间的作用力分成四类。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>金属晶体：金属阳离子和自由电子，靠金属键结合；有自由电子，所以导电</li>
            <li>离子晶体：阴、阳离子，靠离子键结合；固态时离子不能移动，熔融或溶于水才导电；熔点较高</li>
            <li>分子晶体：分子，分子间靠范德华力（有的还有氢键）结合；熔点低，熔化、升华时分子里的共价键不被破坏</li>
            <li>共价晶体：原子，靠共价键连成空间网状结构；熔点很高、硬度很大</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">加热的快慢是示意。干冰从 −100 °C 开始加热，其余从 25 °C 开始；干冰在常压下不熔化，直接升华。</p>
        </>} />}
      finale={T.finale && <Fin tag="四类晶体都试过了" big="构成的粒子和作用力不同，性质就不同">铜靠金属键，有自由电子，能导电；氯化钠靠离子键，熔化后才导电；干冰靠范德华力，−78.5 °C 就升华；金刚石全是共价键，3500 °C 还不熔化。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[12.5px] text-white/55">{K.name} · 温度</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{tempText(Math.round(heatTemp(cry, hk) * 10) / 10)}</div>
            <div className="mt-1.5 text-[14px] text-[#7fe3d4]">{T.done[cry] ? K.type : ' '}</div>
          </div>
          <div className="mt-3">
            <Row name="构成粒子">{K.particle}</Row>
            <Row name="粒子间的作用">{K.force}</Row>
            <Row name="固态加电压" on={vS}>{conducts(cry, false) ? '灯亮，导电' : '灯不亮，不导电'}</Row>
            <Row name="加热" on={heated}>{heatResult(cry)}</Row>
            {cry === 'NaCl' && <Row name="熔化后加电压" on={vM}>灯亮，导电</Row>}
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">试过的晶体</h2>
          <div className="mt-1">{CRYSTAL_KEYS.map(c => <Row key={c} name={CRYSTALS[c].name} on={!!T.done[c]}>{CRYSTALS[c].type}</Row>)}</div>
        </Panel>
      }
      actions={<>
        <LabButton pulse={next === 'volt'} onClick={() => volt.run()} disabled={busy || (vS && !heated) || (heated && (cry !== 'NaCl' || vM))}>加电压</LabButton>
        <LabButton primary pulse={next === 'heat'} onClick={() => heat.run()} disabled={busy || !vS || heated}>加热</LabButton>
      </>}
      extras={
        <Control label="晶体">
          <Segmented label="晶体" pulse={next === 'cry'} want={next === 'cry' ? want : null} value={cry} onChange={c => pick(c as CrystalKey)} disabled={busy} options={CRYSTAL_KEYS.map(c => ({ value: c, label: CRYSTALS[c].name }))} />
        </Control>
      }
    />
  )
}
