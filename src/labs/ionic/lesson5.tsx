// 水溶液里的离子平衡 · 第 5 课 酸碱中和滴定：电位滴定仪。铁架台的蝴蝶夹夹着一支 25 mL 滴定管（聚四氟乙烯活塞，0 刻度在上），装 0.1000 mol/L NaOH 溶液；
// 下面磁力搅拌器上一只 250 mL 烧杯，盛 20.00 mL 0.1000 mol/L 盐酸，插着复合电极，电极线接到左边的滴定仪主机，主机屏幕实时画 pH—V 曲线。
// 先选指示剂、滴两滴；快速放到 19.90 mL；再半滴（0.02 mL）半滴地加，到颜色突变；最后放到 25.00 mL，看完整的滴定曲线和突跃。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useRef, useState } from 'react'
import { Glass as Panel, Control, HoldButton, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BUR, Beaker, Burette, ButterflyClamp, DropBottle, Dropper, Electrode, Glove, IronStand, LOOK, MagStirrer, StirBar, u, type Look } from './gear'
import { Titrator, Wire, type Chart } from './rig'
import { Drop, Stream } from './fx'
import { Fin } from './fin'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, mixHex, seg, useRun } from './parts'
import { INDICATORS, JUMP, TITR, burette, meter, phenolPink, titrationPH, type IndKey } from './physics'
import { BZ, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l5, Y = TOP, Z = BZ + 0.4
const p = (x: number, y: number, z: number): V3 => [X0 + u(x), Y + u(y), Z + u(z)]
const STIR_TOP = 0.025 + 0.06
const BK = p(0, STIR_TOP, 0.01)
const TIP = p(-0.01, STIR_TOP + 0.085, 0.01)
const STAND = p(0.035, 0, 0.02)
const CLAMP_Y = STIR_TOP + 0.085 + 0.36
const UNIT = p(-0.24, 0, -0.05)
const IND_AT: Record<IndKey, V3> = { phenol: p(0.1, 0, 0.1), methyl: p(0.14, 0, 0.06), litmus: p(0.18, 0, 0.02) }
const TASKS: Task[] = [
  { id: 'ind', text: '选好指示剂，往盐酸里滴两滴', note: '强碱滴定强酸，酚酞（8.2–10.0）和甲基橙（3.1–4.4）都可以；石蕊变色不敏锐，不用' },
  { id: 'fast', text: '打开活塞，先放到 19.90 mL', note: `pH ${meter(titrationPH(TITR.fast))}：加了 19.90 mL，溶液还是酸性，pH 只升了 2.6` },
  { id: 'end', text: '半滴半滴地加，到溶液变色', note: `终点前后差 0.04 mL，pH 从 ${meter(JUMP.lo)} 跳到 ${meter(JUMP.hi)}：这就是突跃，指示剂在这里变色` },
  { id: 'full', text: '放到 25.00 mL，看完整的曲线', note: `pH ${meter(titrationPH(TITR.full))}：突跃之后曲线又变平了` },
]
/** 记成百分之一毫升的整数，免得一点点加出小数误差 */
const toV = (c: number) => c / 100
const FAST = Math.round(TITR.fast * 100), HALF = Math.round(TITR.half * 100), FULL = Math.round(TITR.full * 100)

/** 烧杯里溶液的样子 */
function solLook(ind: IndKey | null, pH: number): Look {
  if (!ind) return LOOK.clear
  if (ind === 'phenol') { const k = phenolPink(pH); return k <= 0 ? LOOK.clear : { color: mixHex('#f2c6d6', '#e0407e', k), opacity: 0.32 + 0.33 * k, vivid: true } }
  if (ind === 'methyl') return pH < 3.1 ? { color: '#d8343a', opacity: 0.55, vivid: true } : pH <= 4.4 ? { color: '#ee8a2a', opacity: 0.55, vivid: true } : { color: '#f0c33a', opacity: 0.5, vivid: true }
  return pH < 5 ? { color: '#c83a5a', opacity: 0.5, vivid: true } : pH > 8 ? { color: '#3a5ac8', opacity: 0.55, vivid: true } : { color: '#7a3e96', opacity: 0.55, vivid: true }
}
/** 终点到了没有：酚酞变浅红，甲基橙由橙变黄 */
const atEnd = (ind: IndKey | null, pH: number) => ind === 'phenol' ? pH >= INDICATORS.phenol.range[0] : ind === 'methyl' ? pH > INDICATORS.methyl.range[1] : false
const IND_LOOK: Record<IndKey, Look> = { phenol: LOOK.clear, methyl: { color: '#e0702a', opacity: 0.7, vivid: true }, litmus: { color: '#7a3e96', opacity: 0.7, vivid: true } }

export default function Lesson5() {
  const [pick, setPick] = useState<IndKey>('phenol')
  const [ind, setInd] = useState<IndKey | null>(null)
  const [cV, setCV] = useState(0)
  const [pts, setPts] = useState<[number, number][]>([[0, titrationPH(0)]])
  const [holding, setHolding] = useState(false)
  const T = useTasks('gewu:ionic:5', TASKS)
  const record = (c: number) => { const v = toV(c); setPts(q => (q.length && Math.abs(q[q.length - 1][0] - v) < 0.2 && (v < 19.4 || v > 20.6) ? q : [...q, [v, titrationPH(v)]])) }
  const drip = useRun(2.8, () => { setInd(pick); T.check(id => id === 'ind') })
  const target = cV < FAST ? FAST : FULL
  const fast = useRun(6, () => { setCV(target); record(target); T.check(id => (id === 'fast' && target === FAST) || (id === 'full' && target === FULL)) })
  const cRef = useRef(cV); cRef.current = cV
  const indRef = useRef(ind); indRef.current = ind
  const drop = useRun(0.9, () => { const c = cRef.current + HALF; setCV(c); record(c); if (atEnd(indRef.current, titrationPH(toV(c)))) { setHolding(false); T.check(id => id === 'end') } })
  const from = useRef(0)
  const fastC = fast.busy ? Math.round((from.current + (target - from.current) * ease(seg(fast.t, 0.5, 5.4))) / 5) * 5 : null
  useEffect(() => { if (fastC !== null) record(fastC) }, [fastC])   // eslint-disable-line react-hooks/exhaustive-deps
  const shownC = fastC ?? cV, V = toV(shownC), pH = titrationPH(V)
  useEffect(() => { if (holding && !drop.busy && cV < FULL) drop.run() }, [holding, drop.busy])   // eslint-disable-line react-hooks/exhaustive-deps
  const busy = drip.busy || fast.busy
  const ended = !!T.done.end
  const resetAll = () => { drip.snap(0); fast.snap(0); drop.snap(0); setHolding(false); setPick('phenol'); setInd(null); setCV(0); setPts([[0, titrationPH(0)]]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'pick' | 'ind' | 'fast' | 'drop' | null } = !task ? { hint: '终点附近一滴碱，pH 突跃好几个单位；指示剂的变色范围要落在突跃里。', next: null }
    : drip.busy ? { hint: `用胶头滴管滴两滴${INDICATORS[pick].name}…`, next: null }
    : fast.busy ? { hint: '打开活塞放 NaOH 溶液，搅拌子一直在转…', next: null }
    : task.id === 'ind' ? (pick === 'litmus' ? { hint: '石蕊变色不敏锐，不用作滴定的指示剂。选“酚酞”', next: 'pick' } : { hint: `往盐酸里滴两滴${INDICATORS[pick].name}`, next: 'ind' })
    : task.id === 'fast' ? { hint: '打开活塞，先把 NaOH 溶液放到 19.90 mL', next: 'fast' }
    : task.id === 'end' ? { hint: '半滴半滴地加，看屏幕上的曲线和溶液的颜色', next: 'drop' }
    : { hint: '溶液变色，到终点了。再放到 25.00 mL，看完整的曲线', next: 'fast' }

  // 滴指示剂：滴管从滴瓶拿到烧杯口上方，挤两滴，放回去
  const IA = IND_AT[pick]
  const dk = drip.busy ? ease(seg(drip.t, 0, 1.0)) - ease(seg(drip.t, 1.8, 2.8)) : 0
  const dropperAt: V3 = liftPath([IA[0], Y + u(0.03), IA[2]], [BK[0] + u(0.02), BK[1] + u(0.11), BK[2] + u(0.0)], Y + u(0.28), dk)
  const look = solLook(ind ?? (drip.busy && drip.t > 1.45 ? pick : null), pH)
  const level = 0.022 + V * 0.0006
  const surf = BK[1] + u(0.0018 + level)
  const open = fast.busy ? ease(seg(fast.t, 0.1, 0.5)) - ease(seg(fast.t, 5.4, 5.9)) : drop.busy ? (drop.t < 0.6 ? 0.3 : 0) : 0
  const chart: Chart = { title: 'pH — V(NaOH)', xLabel: 'V(NaOH) / mL', yLabel: 'pH', x: [0, 25], y: [0, 14], xTicks: [0, 5, 10, 15, 20, 25], yTicks: [0, 2, 4, 6, 8, 10, 12, 14],
    series: [{ pts, color: '#35c7b3' }], marker: [V, pH], note: `pH ${meter(pH)}`,
    band: ind ? [[INDICATORS[ind].range[0], INDICATORS[ind].range[1], ind === 'phenol' ? 'rgba(224,64,126,0.22)' : 'rgba(238,138,42,0.22)']] : undefined }
  const labels: Label[] = [
    { id: 'v', at: [TIP[0] - u(0.02), TIP[1] + u(BUR.cock + 0.05), TIP[2]], ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>滴定管</small>{burette(V)} mL</> },
    { id: 'n1', at: [TIP[0] + u(0.012), TIP[1] + u(BUR.cock + 0.11), TIP[2]], ax: 0, name: true, className: 'scene-name', children: 'NaOH 溶液 0.1000 mol/L' },
    { id: 'n2', at: [BK[0] + u(0.04), BK[1] + u(0.02), BK[2] + u(0.03)], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>盐酸</small>20.00 mL</> },
    { id: 'n3', at: p(-0.24, 0.32, -0.05), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电位滴定仪' },
    ...(['phenol', 'methyl', 'litmus'] as IndKey[]).map(k => ({ id: k, at: [IND_AT[k][0], Y - u(0.003), IND_AT[k][2] + u(0.03)] as V3, ax: 0.5, name: true, className: 'scene-name', children: INDICATORS[k].name })),
  ]
  const W = 286, H = 150, px = (v: number) => 26 + v / 25 * (W - 34), py = (q: number) => 8 + (14 - q) / 14 * (H - 30)
  return (
    <LabShell title="水溶液里的离子平衡" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="滴定"
      stage={<Place at="l5" labels={labels}>
        <group position={UNIT} rotation-y={0.25} scale={1.25}><Titrator chart={chart} /></group>
        <group position={STAND}>
          <IronStand rodH={0.72} rodZ={-0.09} w={0.2} d={0.3}>
            <group position={[0, u(CLAMP_Y), u(-0.09)]}><ButterflyClamp gap={0.045} reach={0.08} /></group>
          </IronStand>
        </group>
        <group position={TIP}><Burette level={V} open={open} /></group>
        <group position={p(0, 0.025, 0.02)}><MagStirrer on /></group>
        <group position={BK}><Beaker vol={250} level={level} look={look}><StirBar on /></Beaker></group>
        <Stream top={TIP} bottom={[TIP[0], surf, TIP[2]]} r={u(0.0011)} on={fast.busy && fast.t > 0.5 && fast.t < 5.4} />
        {drop.busy && <Drop at={TIP} drop={TIP[1] - surf} t={drop.t / 0.62} r={u(0.0016)} />}
        <group position={[BK[0] + u(0.02), BK[1] + u(0.008), BK[2] - u(0.012)]} rotation-z={-0.08}><Electrode /></group>
        <Wire color="#1c1e21" r={0.0018} pts={[[BK[0] + u(0.019), BK[1] + u(0.17), BK[2] - u(0.012)], [BK[0] + u(0.0), BK[1] + u(0.24), BK[2] - u(0.06)], [UNIT[0] + u(0.15), Y + u(0.2), UNIT[2] - u(0.05)], [UNIT[0] + u(0.21), Y + u(0.07), UNIT[2] + u(0.02)]]} />
        {(['phenol', 'methyl', 'litmus'] as IndKey[]).map(k => <group key={k} position={IND_AT[k]} rotation-y={-0.3}><DropBottle label={INDICATORS[k].name} band={k === 'phenol' ? '#c23a6a' : k === 'methyl' ? '#e0702a' : '#6a3e96'} look={IND_LOOK[k]} brown={k === 'phenol'} dropper={!(drip.busy && pick === k)} /></group>)}
        {drip.busy && <group position={dropperAt}>
          <Dropper fill={drip.t < 1.5 ? 0.4 : 0.1} look={IND_LOOK[pick]} />
          <group position={[0, u(0.1), 0]} rotation={[0.25, 0.3, 0.1]}><Glove s={u(0.0055)} /></group>
        </group>}
        {drip.busy && <Drop at={[BK[0] + u(0.02), BK[1] + u(0.108), BK[2]]} drop={BK[1] + u(0.108) - surf} t={seg(drip.t, 1.0, 1.5)} r={u(0.0022)} color={pick === 'phenol' ? '#e4eef0' : IND_LOOK[pick].color} />}
      </Place>}
      lesson={<LessonBlock no="5" title="中和滴定" concept="终点附近一滴碱，pH 突跃好几个单位" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>用已知浓度的酸（或碱）来测定未知浓度的碱（或酸）的方法，叫做酸碱中和滴定。恰好中和时 c(酸)·V(酸) = c(碱)·V(碱)（一元酸碱）。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>滴定管 0 刻度在上，读到 0.01 mL；先用标准溶液润洗，排出尖嘴的气泡再调液面</li>
            <li>终点前后（差 ±0.1%，±0.02 mL），pH 从 {meter(JUMP.lo)} 突跃到 {meter(JUMP.hi)}</li>
            <li>指示剂的变色范围落在突跃之内就能用：酚酞 8.2–10.0，甲基橙 3.1–4.4；石蕊变色范围宽、颜色变化不明显，不用</li>
            <li>判断终点：滴入最后半滴，溶液颜色突变，并且半分钟内不恢复原色</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">半滴按 0.02 mL 算；pH 由两种溶液的浓度和体积算出（体积相加）。</p>
        </>} />}
      finale={T.finale && <Fin tag="一次中和滴定做完了" big="终点附近一滴碱，pH 突跃好几个单位">19.98 mL 时 pH {meter(JUMP.lo)}，20.02 mL 时 pH {meter(JUMP.hi)}；{ind ? INDICATORS[ind].name : '指示剂'}的变色范围落在突跃里。消耗 NaOH 溶液 20.00 mL，c(HCl) = 0.1000 mol/L。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">pH</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{meter(pH)}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="V" value={burette(V)} unit="mL · 加入的 NaOH 溶液" />
            <ParamTile symbol="颜色" value={!ind ? '—' : ind === 'phenol' ? (pH >= 8.2 ? '浅红' : '无色') : pH < 3.1 ? '红色' : pH <= 4.4 ? '橙色' : '黄色'} unit={ind ? INDICATORS[ind].name : '还没滴指示剂'} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">滴定曲线</h2>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full">
            {ind && <rect x={26} width={W - 34} y={py(INDICATORS[ind].range[1])} height={py(INDICATORS[ind].range[0]) - py(INDICATORS[ind].range[1])} fill={ind === 'phenol' ? 'rgb(224 64 126 / 0.2)' : 'rgb(238 138 42 / 0.2)'} />}
            {[0, 7, 14].map(q => <g key={q}><line x1={26} x2={W - 8} y1={py(q)} y2={py(q)} stroke="rgb(255 255 255 / 0.14)" strokeDasharray={q === 7 ? '4 3' : undefined} /><text x={20} y={py(q) + 4} textAnchor="end" fontSize="10.5" fill="rgb(255 255 255 / 0.55)">{q}</text></g>)}
            {[0, 10, 20, 25].map(v => <text key={v} x={px(v)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="rgb(255 255 255 / 0.55)">{v}</text>)}
            <polyline points={pts.map(([v, q]) => `${px(v).toFixed(1)},${py(q).toFixed(1)}`).join(' ')} fill="none" stroke="#35c7b3" strokeWidth={2.2} strokeLinejoin="round" />
            <circle cx={px(V)} cy={py(pH)} r={4} fill="#ffe9a8" />
            <text x={W - 8} y={H - 18} textAnchor="end" fontSize="10.5" fill="rgb(255 255 255 / 0.55)">NaOH / mL</text>
          </svg>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'ind'} pulse={next === 'ind'} onClick={() => drip.run()} disabled={busy || drop.busy || !!ind || pick === 'litmus'}>滴指示剂</LabButton>
        <LabButton primary={next === 'fast'} pulse={next === 'fast'} onClick={() => { from.current = cV; fast.run() }} disabled={busy || drop.busy || !ind || (cV >= FAST && !ended) || cV >= FULL}>{cV < FAST ? '放到 19.90 mL' : '放到 25.00 mL'}</LabButton>
        <HoldButton pulse={next === 'drop'} onStep={() => { if (!drop.busy) drop.run() }} onHold={() => setHolding(true)} onRelease={() => setHolding(false)} disabled={busy || cV < FAST || ended}>滴半滴</HoldButton>
      </>}
      extras={
        <Control label="指示剂">
          <Segmented label="指示剂" pulse={next === 'pick'} want="phenol" value={pick} disabled={busy || !!ind} onChange={k => setPick(k as IndKey)} options={(['phenol', 'methyl', 'litmus'] as IndKey[]).map(k => ({ value: k, label: INDICATORS[k].name }))} />
        </Control>
      }
    />
  )
}
