// 电解和金属防护 · 第 6 课 金属的电化学腐蚀：化验台最东头的一格。
// 两套一样的装置：铁架台夹着一支具支试管，里面放几枚铁钉，塞紧橡胶塞，支管接一根玻璃导管，插进一小杯红墨水里。
// 左边的铁钉用食盐水浸过（中性），右边的用稀酸浸过。等几分钟：左边导管里的水柱上升（吸氧腐蚀），右边被压下去、导管口冒气泡（析氢腐蚀）。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import { Glass as Panel, Control, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { lathe, useTasks, type Label } from '@/lab-kit'
import { Beaker, ButterflyClamp, IronStand, TUBE, TestTube, m, u } from './gear'
import { GlassTube } from './rig'
import { Bubbles } from './fx'
import { ELECTRODE, Legend, Micro, type MicroCfg, type Sp } from './micro'
import { LESSONS, goLesson } from './lessons'
import { mixHex, useRun } from './parts'
import { Fin } from './fin'
import { CORROSION, columnShift, type EnvKey } from './physics'
import { BZ, SPOT, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l6, Y = TOP, Z = BZ + 0.6
const p = (x: number, y: number, z: number): V3 => [X0 + u(x), Y + u(y), Z + u(z)]
const SX: Record<EnvKey, number> = { neutral: -0.22, acid: 0.13 }      // 两支试管的 x
const S = 1.35, TY = 0.075, ARM = TY + 0.2, CUP = 0.105, WATER = 0.042, TIP = 0.012     // 试管放大的倍数、管底高、支管高；小烧杯离试管多远、杯里水深、导管口离杯底多高
const MIN = 6, SHOW = 2                                                  // 等 6 分钟；水柱的变化画成两倍，看得清
const TASKS: Task[] = [
  { id: 'salt', text: '等几分钟，看食盐水那支的导管', note: '水柱上升：试管里的气体变少了，氧气被消耗掉了' },
  { id: 'micro1', text: '放大看这支铁钉的表面', note: '铁失电子，氧气在碳上得电子：这是吸氧腐蚀' },
  { id: 'acid', text: '换看稀酸那支的导管', note: '水柱被压下去，导管口冒气泡：试管里生成了气体' },
  { id: 'micro2', text: '放大看它的铁钉表面', note: '铁失电子，H⁺ 在碳上得电子成氢气：这是析氢腐蚀' },
]
const MICRO: Record<EnvKey, MicroCfg> = {
  neutral: { left: { color: ELECTRODE.iron, tag: '负极 铁', e: -1, emit: [{ sp: 'Fe2', rate: 0.6 }] }, right: { color: ELECTRODE.graphite, tag: '正极 碳', e: 1, take: { O2: { to: 'gone' } }, emit: [{ sp: 'OH', rate: 0.8 }] }, ions: { O2: 7, Na: 5, Cl: 5 }, field: -1 },
  acid: { left: { color: ELECTRODE.iron, tag: '负极 铁', e: -1, emit: [{ sp: 'Fe2', rate: 0.6 }] }, right: { color: ELECTRODE.graphite, tag: '正极 碳', e: 1, take: { H: { to: 'gas', as: 'H2' } } }, ions: { H: 14, SO4: 7 }, field: -1 },
}
const LEGEND: Record<EnvKey, Sp[]> = { neutral: ['Fe2', 'O2', 'OH', 'Na', 'Cl', 'e'], acid: ['Fe2', 'H', 'H2', 'SO4', 'e'] }

/** 一枚铁钉：细长的钉身、扁圆的钉帽、尖头。原点在钉尖，沿 y 朝上 */
function Nail({ color }: { color: string }) {
  const g = useMemo(() => lathe(m([[0, 0], [0.0016, 0.006], [0.0016, 0.058], [0.0036, 0.0585], [0.0036, 0.06], [0, 0.0604]]), { segs: 12 }), [])
  return <mesh geometry={g} castShadow><meshStandardMaterial color={color} metalness={0.6} roughness={0.55} /></mesh>
}
const stopper = (() => { let g: ReturnType<typeof lathe> | null = null; return () => (g ??= lathe(m([[0, -0.012], [0.0105, -0.012], [0.0135, 0.012], [0, 0.012]]), { segs: 24 })) })()

export default function Lesson6() {
  const [env, setEnv] = useState<EnvKey>('neutral')
  const [waited, setWaited] = useState(false)
  const [zoom, setZoom] = useState<Record<EnvKey, boolean>>({ neutral: false, acid: false })
  const T = useTasks('gewu:electrolysis:6', TASKS)
  const wait = useRun(6, () => { setWaited(true); T.check(id => id === 'salt') })
  const look = useRun(4.5, () => T.check(id => (id === 'micro1' && zoom.neutral) || (id === 'micro2' && zoom.acid)))
  const pick = (k: EnvKey) => { if (look.busy || wait.busy) return; setEnv(k) }
  useEffect(() => { if (!waited || env !== 'acid' || T.current?.id !== 'acid') return; const t = setTimeout(() => T.check(id => id === 'acid'), 1300); return () => clearTimeout(t) }, [waited, env, T.current?.id])   // eslint-disable-line react-hooks/exhaustive-deps
  const magnify = () => { setZoom(z => ({ ...z, [env]: true })); look.run() }
  const resetAll = () => { setEnv('neutral'); setWaited(false); setZoom({ neutral: false, acid: false }); wait.snap(0); look.snap(0); T.reset() }
  const min = waited ? MIN : wait.k * MIN
  const task = T.current
  const { hint, next }: { hint: string; next: 'wait' | 'zoom' | 'env' | null } = !task ? { hint: '钢铁在潮湿的空气里主要发生吸氧腐蚀；水膜酸性较强时发生析氢腐蚀。', next: null }
    : wait.busy ? { hint: '几分钟过去…盯住两根导管里的红墨水', next: null }
    : look.busy ? { hint: env === 'neutral' ? '铁失去电子，氧气在碳上得到电子…' : '铁失去电子，H⁺ 在碳上得到电子变成氢气…', next: null }
    : task.id === 'salt' ? { hint: '两支试管都塞紧了，导管插在红墨水里。等几分钟', next: 'wait' }
    : task.id === 'micro1' ? (env !== 'neutral' ? { hint: '选回“食盐水”', next: 'env' } : { hint: '左边导管里的水柱升上去了。放大看铁钉表面', next: 'zoom' })
    : env !== 'acid' ? { hint: '再看右边那支：选“稀酸”', next: 'env' }
    : task.id === 'acid' ? { hint: '右边的水柱被压了下去…', next: null }
    : { hint: '右边导管口在冒气泡。放大看这支铁钉的表面', next: 'zoom' }

  const yaw = SPOT.l6.view[0], MIC = p(-0.012, 0.2, 0.04), mr = u(0.064)
  const shift = (k: EnvKey) => columnShift(k, min)
  const rust = Math.min(1, min / MIN)
  const labels: Label[] = [
    ...(['neutral', 'acid'] as EnvKey[]).flatMap(k => [
      { id: `n${k}`, at: p(SX[k] + 0.03, -0.004, 0.06), ax: 0.5, className: `scene-tag ${env === k ? 'key' : ''}`, children: <><small>铁钉浸过</small>{k === 'neutral' ? '食盐水' : '稀酸'}</> },
      ...(min > 0.3 ? [{ id: `s${k}`, at: p(SX[k] + CUP + 0.02, WATER + 0.035, 0.0), className: 'scene-tag -translate-y-1/2', children: <>水柱 {shift(k) > 0 ? '+' : '−'}{Math.abs(shift(k)).toFixed(1)} cm</> }] : []),
    ]),
    { id: 'tube', at: p(SX.neutral - 0.02, TY + 0.26, 0), ax: 1, name: true, className: 'scene-name', children: '具支试管' },
    { id: 'ink', at: p(SX.acid + CUP, -0.004, 0.05), ax: 0.5, name: true, className: 'scene-name', children: '红墨水' },
  ]
  const ink = { color: '#d8263a', opacity: 0.7, vivid: true }
  return (
    <LabShell title="电解和金属防护" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="铁钉腐蚀实验"
      stage={<Place at="l6" labels={labels}>
        {(['neutral', 'acid'] as EnvKey[]).map((k, i) => {
          const colTop = Math.max(TIP + 0.001, WATER + shift(k) / 100 * SHOW), nailC = k === 'neutral' ? mixHex('#7d848b', '#a2542a', rust * 0.85) : mixHex('#7d848b', '#5c6166', rust)
          return <group key={k} position={p(SX[k], 0, 0)}>
            <group position={[u(0.03), 0, 0]}><IronStand rodH={0.31} rodZ={-0.07} w={0.15} d={0.2}><group position={[0, u(0.2), -u(0.07)]}><ButterflyClamp gap={0.03} reach={0.07} hold={[true, false]} /></group></IronStand></group>
            {/* 具支试管：一支大试管，靠上的地方伸出一截支管；管口塞着橡胶塞 */}
            <group position-y={u(TY)}>
              <group scale={S}><TestTube fill={0} /></group>
              <mesh geometry={stopper()} position-y={u(TUBE.h * S - 0.004)} castShadow><meshStandardMaterial color="#7a3b2e" roughness={0.75} /></mesh>
              {[[0.004, 0.02, 0.3], [-0.004, 0.06, -0.35], [0.001, -0.07, 0.15]].map(([x, rz, ry], j) => <group key={j} position={[u(x), u(0.006 + j * 0.002), u(j === 1 ? 0.003 : -0.002)]} rotation={[rz, ry, rz * 2]} scale={1.35}><Nail color={nailC} /></group>)}
              {k === 'acid' && <Bubbles at={[0, u(0.02), 0]} top={u(0.05)} on={min > 0.2} rate={10} r={u(0.001)} spread={u(0.006)} speed={u(0.025)} seed={9} />}
            </group>
            <GlassTube r={0.0032} pts={[[TUBE.r * S - 0.001, ARM, 0], [0.04, ARM, 0]]} />
            <mesh position={[u(0.047), u(ARM), 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[u(0.0045), u(0.0045), u(0.03), 14]} /><meshStandardMaterial color="#8a5a34" roughness={0.6} /></mesh>
            <GlassTube r={0.0042} pts={[[0.055, ARM, 0], [CUP - 0.012, ARM, 0], [CUP, ARM - 0.012, 0], [CUP, 0.12, 0], [CUP, TIP, 0]]} />
            {/* 小烧杯里的红墨水，和导管里的那一段水柱 */}
            <group position={[u(CUP), 0, 0]}>
              <Beaker vol={100} level={WATER - 0.002} look={ink} marks={false} />
              <mesh position-y={u((TIP + colTop) / 2)} renderOrder={8}><cylinderGeometry args={[u(0.0031), u(0.0031), u(colTop - TIP), 12]} /><meshBasicMaterial color="#e0263c" toneMapped={false} /></mesh>
              {k === 'acid' && <Bubbles at={[u(0.004), u(TIP), 0]} top={u(WATER - TIP - 0.004)} on={min > 2.5} rate={7} r={u(0.0016)} spread={u(0.002)} speed={u(0.04)} seed={12 + i} opacity={0.85} />}
            </group>
          </group>
        })}
        {zoom[env] && <Micro at={MIC} r={mr} yaw={yaw} from={p(SX[env] + (env === 'neutral' ? 0.014 : -0.014), TY + 0.04, 0.01)} cfg={MICRO[env]} on seed={env === 'neutral' ? 6 : 10} />}
      </Place>}
      lesson={<LessonBlock no="6" title="金属的电化学腐蚀" concept="水膜呈中性时吸氧，酸性较强时析氢" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>不纯的金属接触电解质溶液时会构成原电池，较活泼的金属失电子被氧化，这叫电化学腐蚀。钢铁是铁碳合金，表面的水膜溶有氧气、二氧化碳等：铁是负极，碳是正极。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>负极（两种腐蚀都一样）：{CORROSION.neutral.neg}</li>
            <li>吸氧腐蚀（水膜酸性很弱或呈中性）正极：{CORROSION.neutral.pos}</li>
            <li>析氢腐蚀（水膜酸性较强）正极：{CORROSION.acid.pos}</li>
            <li>钢铁的腐蚀以吸氧腐蚀为主。生成的 Fe(OH)₂ 再被氧气氧化、脱水，成了铁锈（主要成分 Fe₂O₃·xH₂O）</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">水柱变化的数值是示意，画面上还放大了一倍。</p>
        </>} />}
      finale={T.finale && <Fin tag="两支试管都看过了" big="食盐水里吸氧腐蚀，酸里析氢腐蚀">两种腐蚀里铁都是负极，{CORROSION.neutral.neg}。区别在正极：中性水膜里氧气得电子，试管里气体减少；酸性较强时 H⁺ 得电子放出氢气。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="t" value={min.toFixed(0)} unit="min · 观察了多久" />
            <ParamTile symbol="Δh" value={min > 0 ? `${shift(env) > 0 ? '+' : '−'}${Math.abs(shift(env)).toFixed(1)}` : '—'} unit="cm · 水柱（示意）" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">{CORROSION[env].name}</h2>
          <div className="mt-2 flex flex-col gap-1.5 text-[13.5px]">
            <div className="rounded-xl bg-white/8 px-3 py-2"><span className="text-white/55">导管水柱　</span>{min < 0.3 ? '—' : env === 'neutral' ? '上升' : '下降，导管口冒气泡'}</div>
            <div className="rounded-xl bg-white/8 px-3 py-2"><span className="text-white/55">腐蚀类型　</span>{zoom[env] ? CORROSION[env].kind : '—'}</div>
            <div className="rounded-xl bg-white/8 px-3 py-2"><span className="text-white/55">负极（铁）　</span>{zoom[env] ? CORROSION[env].neg : '—'}</div>
            <div className="rounded-xl bg-white/8 px-3 py-2"><span className="text-white/55">正极（碳）　</span>{zoom[env] ? CORROSION[env].pos : '—'}</div>
          </div>
          {zoom[env] && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">放大窗里的粒子（示意）</h2>
            <Legend items={LEGEND[env]} />
          </>}
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'wait'} pulse={next === 'wait'} onClick={() => wait.run()} disabled={waited || wait.busy}>等几分钟</LabButton>
        <LabButton primary={next === 'zoom'} pulse={next === 'zoom'} onClick={magnify} disabled={!waited || zoom[env] || look.busy}>放大看铁钉</LabButton>
      </>}
      extras={
        <Control label="看哪一支">
          <Segmented label="铁钉" pulse={next === 'env'} want={next === 'env' ? (task?.id === 'micro1' ? 'neutral' : 'acid') : null} value={env} onChange={k => pick(k as EnvKey)} disabled={look.busy || wait.busy} options={[{ value: 'neutral', label: '食盐水' }, { value: 'acid', label: '稀酸' }]} />
        </Control>
      }
    />
  )
}
