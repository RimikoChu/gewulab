// 水溶液里的离子平衡 · 第 4 课 溶液 pH 的计算：稀释台。一排四只 100 mL 烧杯，第一只盛 0.10 mol/L 的酸；
// 每稀释一次：用移液管取 10.00 mL 放进 100 mL 容量瓶，加水到刻线，倒进下一只烧杯，电极移过去测 pH。
// 左后方一台数据采集器，屏幕上画 pH—稀释次数的折线：盐酸每稀释十倍 pH 加 1，醋酸只加约 0.5。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useRef, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Glass as Panel, Control, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Beaker, Glove, LOOK, NarrowBottle, u } from './gear'
import { ElectrodeStand, PhMeter, Pipette, Screen, VolFlask, Wire, type Chart } from './rig'
import { Stream } from './fx'
import { Fin } from './fin'
import { LESSONS, goLesson } from './lessons'
import { armPath, armTo, ease, liftPath, seg, useRun, type Arm } from './parts'
import { DIL_MAX, dilC, dilPH, meter, type AcidKey } from './physics'
import { BZ, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l4, Y = TOP, Z = BZ + 0.6
const p = (x: number, y: number, z: number): V3 => [X0 + u(x), Y + u(y), Z + u(z)]
const STAND = { x: -0.06, z: -0.1 }
const CUPS = [-0.12, -0.04, 0.04, 0.12].map(x => ({ x, z: 0.05 }))
const FLASK = { x: 0.225, z: 0.0 }
const METER = p(-0.26, 0, 0.03)
const pose = (i: number): Arm => i < 0 ? { len: 0.08, yaw: -1.9, lift: 0.27 } : armTo(CUPS[i].x - STAND.x, CUPS[i].z - STAND.z, 0.012)
const NAME: Record<AcidKey, string> = { hcl: '盐酸', hac: '醋酸' }
const COLOR: Record<AcidKey, string> = { hcl: '#ff6b5a', hac: '#f2a43a' }
const TASKS: Task[] = [
  { id: 'hcl0', text: '测 0.10 mol/L 盐酸的 pH', note: 'pH 1.00：盐酸完全电离，c(H⁺) = 0.10 mol/L' },
  { id: 'hcl3', text: '把盐酸连续稀释三次，每次十倍', note: 'pH 1.00 → 2.00 → 3.00 → 4.00：强酸每稀释十倍，c(H⁺) 变为十分之一，pH 增大 1' },
  { id: 'hac0', text: '换醋酸，测 0.10 mol/L 醋酸的 pH', note: `pH ${meter(dilPH('hac', 0))}：浓度一样，醋酸的 pH 比盐酸大` },
  { id: 'hac3', text: '把醋酸也连续稀释三次', note: `pH ${[0, 1, 2, 3].map(n => meter(dilPH('hac', n))).join(' → ')}：每次只增大约 0.5，稀释使醋酸的电离平衡向右移动` },
]
const DUR = 6

export default function Lesson4() {
  const [acid, setAcid] = useState<AcidKey>('hcl')
  const [n, setN] = useState(-1)                 // 电极在第几只烧杯；-1 还没测
  const [pts, setPts] = useState<Record<AcidKey, number[]>>({ hcl: [], hac: [] })
  const T = useTasks('gewu:ionic:4', TASKS)
  const nRef = useRef(n); nRef.current = n
  const done = (a: AcidKey, k: number) => { setN(k); setPts(q => ({ ...q, [a]: [...q[a], k] })); T.check(id => (id === `${a}0` && k === 0) || (id === `${a}3` && k === DIL_MAX)) }
  const mea = useRun(2.6, () => done(acid, 0))
  const dil = useRun(DUR, () => done(acid, nRef.current + 1))
  const busy = mea.busy || dil.busy
  const switchTo = (a: AcidKey) => { setAcid(a); setN(-1) }
  const resetAll = () => { mea.snap(0); dil.snap(0); setAcid('hcl'); setN(-1); setPts({ hcl: [], hac: [] }); T.reset() }
  const task = T.current
  const want: AcidKey = task?.id.startsWith('hac') ? 'hac' : 'hcl'
  const { hint, next }: { hint: string; next: 'mea' | 'dil' | 'pick' | null } = !task ? { hint: '强酸稀释十倍 pH 增大 1；弱酸稀释时电离平衡右移，pH 增大不到 1。', next: null }
    : mea.busy ? { hint: '把电极放进去，等读数稳定…', next: null }
    : dil.busy ? { hint: '取 10.00 mL 放进容量瓶，加水到刻线，摇匀后倒进下一只烧杯…', next: null }
    : acid !== want ? { hint: '选“醋酸”', next: 'pick' }
    : n < 0 ? { hint: `测一测 0.10 mol/L ${NAME[acid]}的 pH`, next: 'mea' }
    : { hint: `把${NAME[acid]}再稀释十倍，看 pH 增大多少`, next: 'dil' }

  // 动作：电极架、移液管、容量瓶
  const t = dil.t, i = Math.max(0, n)
  const arm: Arm = mea.busy ? armPath(pose(-1), pose(0), seg(mea.t, 0.1, 2.3)) : dil.busy ? armPath(pose(i), pose(i + 1), t < 0.8 ? 0.3 * seg(t, 0, 0.8) : 0.3 + 0.7 * seg(t, 4.6, 5.9)) : pose(n)
  const pipRest: V3 = p(FLASK.x + 0.05, 0.3, FLASK.z + 0.1), cupTop = (k: number) => p(CUPS[k].x, 0.012, CUPS[k].z), mouth = p(FLASK.x, 0.17, FLASK.z)
  const pipAt: V3 = !dil.busy ? pipRest : t < 1.2 ? liftPath(pipRest, cupTop(i), Y + u(0.3), seg(t, 0.8, 1.2) * 0.999) : t < 1.4 ? cupTop(i) : liftPath(cupTop(i), mouth, Y + u(0.3), seg(t, 1.4, 2.1))
  const pipFill = dil.busy ? (t < 1.25 ? 0 : t < 1.4 ? seg(t, 1.25, 1.4) : 1 - seg(t, 2.1, 2.4)) : 0
  const flaskLv = dil.busy ? (t < 2.1 ? 0 : t < 2.4 ? 0.1 * seg(t, 2.1, 2.4) : t < 3.2 ? 0.1 + 0.9 * seg(t, 2.4, 3.2) : 1 - seg(t, 3.7, 4.4)) : 0
  const fk = dil.busy ? ease(seg(t, 3.2, 3.6)) - ease(seg(t, 4.4, 4.7)) : 0
  const flaskAt: V3 = fk > 0 ? liftPath(p(FLASK.x, 0, FLASK.z), p(CUPS[Math.min(3, i + 1)].x + 0.17, 0.13, CUPS[0].z), Y + u(0.16), fk) : p(FLASK.x, 0, FLASK.z)
  const tilt = dil.busy ? (ease(seg(t, 3.55, 3.75)) - ease(seg(t, 4.4, 4.6))) * 1.75 : 0
  const level = (k: number) => k === 0 ? 0.045 : k <= n ? 0.045 : dil.busy && k === i + 1 ? 0.045 * seg(t, 3.75, 4.4) : 0
  const reading = n >= 0 && !busy ? meter(dilPH(acid, n)) : '0.00'
  // 屏幕上的折线
  const chart: Chart = { title: 'pH — 稀释次数', xLabel: '稀释次数（每次十倍）', yLabel: 'pH', x: [-0.2, 3.3], y: [0, 7], xTicks: [0, 1, 2, 3], yTicks: [0, 1, 2, 3, 4, 5, 6, 7],
    series: (['hcl', 'hac'] as AcidKey[]).map(a => ({ pts: pts[a].map(k => [k, dilPH(a, k)] as [number, number]), color: COLOR[a], dots: true })),
    marker: n >= 0 && !busy ? [n, dilPH(acid, n)] : undefined, note: n >= 0 && !busy ? `${NAME[acid]} pH ${reading}` : undefined }
  const tipW: V3 = [X0 + u(STAND.x + Math.cos(arm.yaw) * arm.len), Y + u(arm.lift + 0.06), Z + u(STAND.z + Math.sin(arm.yaw) * arm.len)]
  const conc = (k: number) => k === 0 ? '0.10' : k === 1 ? '0.010' : k === 2 ? '0.0010' : '0.00010'
  const labels: Label[] = [
    { id: 'ph', at: [METER[0] + u(0.1), Y + u(0.05), METER[2] + u(0.05)], ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>pH</small>{reading}</> },
    ...CUPS.map((c, k) => ({ id: `c${k}`, at: p(c.x, -0.004, c.z + 0.032), ax: 0.5, className: 'scene-name !text-[13px]', children: `${conc(k)} mol/L` })),
    { id: 'fl', at: p(FLASK.x + 0.03, 0.2, FLASK.z), ax: 0, name: true, className: 'scene-name', children: '100 mL 容量瓶' },
  ]
  return (
    <LabShell title="水溶液里的离子平衡" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="稀释"
      stage={<Place at="l4" labels={labels}>
        {/* 数据采集器：一块带支架的屏 */}
        <group position={p(0.13, 0, -0.17)} rotation-y={-0.15}>
          <RoundedBox args={[u(0.08), u(0.012), u(0.07)]} radius={u(0.004)} position-y={u(0.006)} castShadow receiveShadow><meshPhysicalMaterial color="#2a2e33" roughness={0.4} clearcoat={0.4} /></RoundedBox>
          <mesh position={[0, u(0.06), -u(0.01)]} rotation-x={-0.25}><boxGeometry args={[u(0.02), u(0.1), u(0.008)]} /><meshPhysicalMaterial color="#2a2e33" roughness={0.4} /></mesh>
          <group position={[0, u(0.135), 0]} rotation-x={-0.18}>
            <RoundedBox args={[u(0.23), u(0.16), u(0.014)]} radius={u(0.006)} castShadow><meshPhysicalMaterial color="#22272c" roughness={0.4} clearcoat={0.4} /></RoundedBox>
            <Screen chart={chart} w={u(0.215)} h={u(0.145)} position={[0, 0, u(0.0075)]} />
          </group>
        </group>
        <group position={METER} rotation-y={0.4}><PhMeter text={reading} sub="25.0 °C" /></group>
        <group position={p(STAND.x, 0, STAND.z)}><ElectrodeStand yaw={arm.yaw} lift={arm.lift} len={arm.len} rod={0.4} /></group>
        <Wire color="#1c1e21" r={0.0018} pts={[tipW, [tipW[0] - u(0.03), tipW[1] + u(0.05), tipW[2] - u(0.04)], [X0 + u(STAND.x - 0.1), Y + u(0.2), Z + u(STAND.z - 0.02)], [METER[0] + u(0.04), Y + u(0.06), METER[2] - u(0.1)], [METER[0], Y + u(0.03), METER[2] - u(0.085)]]} />
        {CUPS.map((c, k) => <group key={k} position={p(c.x, 0, c.z)}><Beaker vol={100} level={level(k)} look={LOOK.clear} /></group>)}
        <group position={flaskAt} rotation-z={tilt}><VolFlask level={flaskLv} plug={false} /></group>
        <Stream top={[flaskAt[0] - Math.sin(tilt) * u(0.18), flaskAt[1] + Math.cos(tilt) * u(0.18), flaskAt[2]]} bottom={[X0 + u(CUPS[Math.min(3, i + 1)].x), Y + u(0.02), Z + u(CUPS[0].z)]} r={u(0.0022)} on={dil.busy && t > 3.75 && t < 4.4} />
        <Stream top={[X0 + u(FLASK.x + 0.03), Y + u(0.21), Z + u(FLASK.z)]} bottom={[X0 + u(FLASK.x + 0.002), Y + u(0.15), Z + u(FLASK.z)]} r={u(0.0015)} on={dil.busy && t > 2.4 && t < 3.2} />
        {dil.busy && t > 0.8 && t < 2.4 && <group position={pipAt}>
          <Pipette fill={pipFill} />
          <group position-y={u(0.27)} rotation={[0.2, 0.4, 0.15]}><Glove s={u(0.0055)} /></group>
        </group>}
        <group position={p(0.3, 0, -0.08)}><NarrowBottle label="蒸馏水" /></group>
      </Place>}
      lesson={<LessonBlock no="4" title="pH 的计算" concept="强酸稀释十倍 pH 加 1，弱酸加不到 1" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>pH = −lg c(H⁺)。强酸完全电离，c(H⁺) 等于酸的浓度（一元酸）；稀释十倍，c(H⁺) 变为原来的十分之一，pH 增大 1。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>弱酸稀释时，电离平衡向右移动，又电离出一部分 H⁺，所以 pH 增大不到 1</li>
            <li>pH 相同的盐酸和醋酸稀释相同倍数，醋酸的 pH 变化小</li>
            <li>酸无论怎样稀释，pH 只会趋近 7，不会超过 7：水本身也电离出 H⁺</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">醋酸的 pH 由 Ka = 1.75×10⁻⁵ 按电离平衡算出；盐酸的计算里计入了水电离出的 H⁺。</p>
        </>} />}
      finale={T.finale && <Fin tag="两种酸都稀释了一千倍" big="强酸稀释十倍 pH 加 1，弱酸加不到 1">盐酸 {[0, 1, 2, 3].map(k => meter(dilPH('hcl', k))).join(' → ')}；醋酸 {[0, 1, 2, 3].map(k => meter(dilPH('hac', k))).join(' → ')}。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">pH 计读数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{n >= 0 && !busy ? reading : '—'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="c" value={n >= 0 ? `${conc(n)}` : '—'} unit={`mol/L · ${NAME[acid]}`} />
            <ParamTile symbol="稀释" value={n >= 0 ? `${10 ** n} 倍` : '—'} unit="比起 0.10 mol/L" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">测过的 pH</h2>
          <table className="mt-2 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/55"><td>稀释次数</td>{[0, 1, 2, 3].map(k => <td key={k} className="text-right">{k}</td>)}</tr></thead>
            <tbody>{(['hcl', 'hac'] as AcidKey[]).map(a => <tr key={a}><td style={{ color: COLOR[a] }}>{NAME[a]}</td>{[0, 1, 2, 3].map(k => <td key={k} className="text-right">{pts[a].includes(k) ? meter(dilPH(a, k)) : '—'}</td>)}</tr>)}</tbody>
          </table>
          <p className="mt-3 text-[12.5px] text-white/55">浓度 {dilC(0)} mol/L 起，每次取 10.00 mL 稀释到 100 mL。</p>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'mea'} pulse={next === 'mea'} onClick={() => mea.run()} disabled={busy || n >= 0}>测 pH</LabButton>
        <LabButton primary={next === 'dil'} pulse={next === 'dil'} onClick={() => dil.run()} disabled={busy || n < 0 || n >= DIL_MAX}>稀释十倍</LabButton>
      </>}
      extras={
        <Control label="哪一种酸">
          <Segmented label="哪一种酸" pulse={next === 'pick'} want={want} value={acid} disabled={busy} onChange={a => switchTo(a as AcidKey)} options={[{ value: 'hcl', label: '盐酸' }, { value: 'hac', label: '醋酸' }]} />
        </Control>
      }
    />
  )
}
