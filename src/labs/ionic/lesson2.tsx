// 水溶液里的离子平衡 · 第 2 课 弱电解质的电离平衡：pH 计、电极架、恒温水浴。
// 左边一只 100 mL 烧杯盛 0.10 mol/L 醋酸；先测它的 pH、算 Ka。再用容量瓶里配好的 0.010 mol/L 醋酸（稀释十倍）倒进右边的烧杯再测：
// pH 变大、电离度变大、Ka 不变。最后把稀溶液放进 50 °C 的水浴：电离吸热，平衡向电离的方向移动（只讲方向）。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Beaker, LOOK, NarrowBottle, Thermometer, u } from './gear'
import { ElectrodeStand, PhMeter, VolFlask, WaterBath, Wire, BATH } from './rig'
import { Stream } from './fx'
import { Legend, Micro, type Mix } from './micro'
import { Fin } from './fin'
import { LESSONS, goLesson } from './lessons'
import { armPath, armTo, ease, liftPath, seg, useRun, type Arm } from './parts'
import { HAC, KA_HAC, alphaOf, hacPH, kaFromPH, meter, sci } from './physics'
import { BZ, SPOT, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l2, Y = TOP, Z = BZ + 0.6
const p = (x: number, y: number, z: number): V3 => [X0 + u(x), Y + u(y), Z + u(z)]
const STAND = { x: -0.04, z: -0.1 }
const A = { x: -0.06, z: 0.05 }, B = { x: 0.05, z: 0.05 }, BATH_AT = { x: 0.19, z: -0.01 }, FLASK = { x: 0.1, z: -0.14 }
const METER = p(-0.19, 0, 0.01)
const IN_BATH = BATH.h - 0.05                 // 放进水浴后烧杯底离台面多高
const tip = (c: { x: number; z: number }, bottom = 0) => armTo(c.x - STAND.x, c.z - STAND.z, bottom + 0.012)
const REST: Arm = { len: 0.1, yaw: 0.6, lift: 0.26 }
type Where = 'rest' | 'A' | 'B' | 'bath'
const POSE: Record<Where, Arm> = { rest: REST, A: tip(A), B: tip(B), bath: tip(BATH_AT, IN_BATH) }
const TASKS: Task[] = [
  { id: 'm1', text: '测 0.10 mol/L 醋酸的 pH', note: `pH ${meter(hacPH(HAC.c0))}：c(H⁺) = ${sci(10 ** -hacPH(HAC.c0))} mol/L，只电离了 ${(alphaOf(HAC.c0) * 100).toFixed(1)}%，Ka = ${sci(KA_HAC, 2)}` },
  { id: 'dil', text: '稀释十倍，再测 pH', note: `pH ${meter(hacPH(HAC.c1))}，没有增大 1：稀释使电离平衡向右移动，电离度增大到 ${(alphaOf(HAC.c1) * 100).toFixed(1)}%，Ka 不变` },
  { id: 'heat', text: '把稀醋酸放进 50 °C 的水浴', note: '弱电解质的电离是吸热过程，升高温度，电离平衡向电离的方向移动，Ka 增大' },
]
const MIX: Record<'c0' | 'c1' | 'hot', Mix> = { c0: { HAc: 16, H: 1, Ac: 1 }, c1: { HAc: 9, H: 2, Ac: 2 }, hot: { HAc: 7, H: 3, Ac: 3 } }

export default function Lesson2() {
  const [at, setAt] = useState<Where>('rest')
  const [read, setRead] = useState<'c0' | 'c1' | 'hot' | null>(null)
  const [filled, setFilled] = useState(false)
  const [hot, setHot] = useState(false)
  const T = useTasks('gewu:ionic:2', TASKS)
  const m1 = useRun(3, () => { setAt('A'); setRead('c0'); T.check(id => id === 'm1') })
  const dil = useRun(6.5, () => { setAt('B'); setFilled(true); setRead('c1'); T.check(id => id === 'dil') })
  const heat = useRun(5.5, () => { setAt('bath'); setHot(true); setRead('hot'); T.check(id => id === 'heat') })
  const busy = m1.busy || dil.busy || heat.busy
  const resetAll = () => { m1.snap(0); dil.snap(0); heat.snap(0); setAt('rest'); setRead(null); setFilled(false); setHot(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'm1' | 'dil' | 'heat' | null } = !task ? { hint: '弱电解质的电离平衡会随浓度、温度移动；电离常数 Ka 只随温度变化。', next: null }
    : m1.busy ? { hint: '把电极放进 0.10 mol/L 醋酸里，等读数稳定…', next: null }
    : dil.busy ? { hint: '把配好的 0.010 mol/L 醋酸倒进烧杯，再测…', next: null }
    : heat.busy ? { hint: '把烧杯放进 50 °C 的水浴里…', next: null }
    : task.id === 'm1' ? { hint: '测一测 0.10 mol/L 醋酸的 pH', next: 'm1' }
    : task.id === 'dil' ? { hint: '把醋酸稀释十倍，看 pH 是不是增大 1', next: 'dil' }
    : { hint: '把稀醋酸放进 50 °C 的水浴，看平衡往哪边移动', next: 'heat' }

  // 电极架的姿态
  const arm: Arm = m1.busy ? armPath(POSE.rest, POSE.A, seg(m1.t, 0.2, 2.4))
    : dil.busy ? armPath(POSE.A, POSE.B, seg(dil.t, 4.4, 6.2))
    : heat.busy ? armPath(POSE.B, POSE.bath, heat.t < 0.9 ? 0.3 * seg(heat.t, 0, 0.9) : 0.3 + 0.7 * seg(heat.t, 2.9, 5.2))
    : POSE[at]
  // 容量瓶：提起来、倾斜，往右边烧杯里倒
  const dk = dil.busy ? ease(seg(dil.t, 0, 1.0)) - ease(seg(dil.t, 3.4, 4.3)) : 0
  const flaskAt: V3 = dk > 0 ? liftPath(p(FLASK.x, 0, FLASK.z), p(B.x + 0.17, 0.13, B.z), Y + u(0.16), dk) : p(FLASK.x, 0, FLASK.z)
  const tilt = dil.busy ? (ease(seg(dil.t, 1.0, 1.5)) - ease(seg(dil.t, 3.0, 3.4))) * 1.75 : 0
  const pourK = dil.busy ? seg(dil.t, 1.4, 3.1) : filled ? 1 : 0
  // 烧杯 B 放进水浴
  const bOn: V3 = p(B.x, 0, B.z), bIn: V3 = p(BATH_AT.x, IN_BATH, BATH_AT.z)
  const bAt: V3 = heat.busy ? liftPath(bOn, bIn, Y + u(0.2), seg(heat.t, 0.9, 2.9)) : hot ? bIn : bOn
  const reading = read && !busy ? (read === 'hot' ? '- - -' : meter(hacPH(read === 'c0' ? HAC.c0 : HAC.c1))) : '0.00'
  const cNow = read === 'c0' ? HAC.c0 : HAC.c1
  const yaw = SPOT.l2.view[0], MIC = p(-0.17, 0.235, 0.0)
  const micKey = (busy ? null : read) ?? (filled ? 'c1' : 'c0')
  const micFrom: V3 = micKey === 'c0' ? p(A.x - 0.015, 0.03, A.z + 0.02) : micKey === 'hot' ? p(BATH_AT.x - 0.015, IN_BATH + 0.04, BATH_AT.z + 0.02) : p(B.x - 0.015, 0.03, B.z + 0.02)
  const tipW: V3 = [X0 + u(STAND.x + Math.cos(arm.yaw) * arm.len), Y + u(arm.lift + 0.06), Z + u(STAND.z + Math.sin(arm.yaw) * arm.len)]
  const labels: Label[] = [
    { id: 'ph', at: [METER[0] + u(0.1), Y + u(0.05), METER[2] + u(0.05)], ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>pH</small>{reading}</> },
    { id: 'na', at: p(A.x, -0.004, A.z + 0.035), ax: 0.5, className: 'scene-tag', children: <><small>醋酸</small>0.10 mol/L</> },
    ...(filled || dil.t > 2 ? [{ id: 'nb', at: (hot ? p(BATH_AT.x, IN_BATH + 0.0, BATH_AT.z + 0.12) : p(B.x, -0.004, B.z + 0.035)) as V3, ax: 0.5, className: 'scene-tag', children: <><small>醋酸</small>0.010 mol/L</> }] : []),
    { id: 'bath', at: p(BATH_AT.x + 0.05, BATH.h + 0.01, BATH_AT.z - 0.05), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '恒温水浴 50 °C' },
    { id: 'fl', at: p(FLASK.x + 0.02, 0.19, FLASK.z), ax: 0, name: true, className: 'scene-name', children: '0.010 mol/L 醋酸（容量瓶）' },
  ]
  return (
    <LabShell title="水溶液里的离子平衡" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['2'], VOICE)} actionsLabel="醋酸"
      stage={<Place at="l2" labels={labels}>
        <group position={METER} rotation-y={0.35}><PhMeter text={reading} sub={read === 'hot' ? '50.0 °C' : '25.0 °C'} /></group>
        <group position={p(STAND.x, 0, STAND.z)}><ElectrodeStand yaw={arm.yaw} lift={arm.lift} len={arm.len} rod={0.4} /></group>
        <Wire color="#1c1e21" r={0.0018} pts={[tipW, [tipW[0] - u(0.03), tipW[1] + u(0.05), tipW[2] - u(0.04)], [X0 + u(STAND.x - 0.08), Y + u(0.2), Z + u(STAND.z - 0.02)], [METER[0] + u(0.03), Y + u(0.06), METER[2] - u(0.1)], [METER[0], Y + u(0.03), METER[2] - u(0.085)]]} />
        <group position={p(A.x, 0, A.z)}><Beaker vol={100} level={0.045} look={LOOK.clear} /></group>
        <group position={bAt}><Beaker vol={100} level={0.045 * pourK} look={LOOK.clear} /></group>
        <group position={flaskAt} rotation-z={tilt}><VolFlask level={1 - pourK * 0.95} plug={!dil.busy} /></group>
        <Stream top={[flaskAt[0] - Math.sin(tilt) * u(0.18), flaskAt[1] + Math.cos(tilt) * u(0.18), flaskAt[2]]} bottom={[bOn[0], Y + u(0.02), bOn[2]]} r={u(0.0022)} on={dil.busy && dil.t > 1.45 && dil.t < 3.05} />
        <group position={p(BATH_AT.x, 0, BATH_AT.z)}><WaterBath temp="50.0" on /></group>
        <group position={p(BATH_AT.x + 0.075, BATH.h - 0.02, BATH_AT.z - 0.06)} rotation-z={0.12}><Thermometer col={0.55} /></group>
        <group position={p(-0.13, 0, -0.15)}><NarrowBottle label="醋酸" sub="0.10 mol/L" /></group>
        <Micro at={MIC} r={u(0.07)} yaw={yaw} from={micFrom} mix={MIX[micKey]} seed={3} />
      </Place>}
      lesson={<LessonBlock no="2" title="电离平衡" concept="平衡会移动，Ka 只随温度变" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在一定条件下，弱电解质分子电离成离子的速率和离子结合成分子的速率相等时，电离过程达到平衡：CH₃COOH ⇌ CH₃COO⁻ + H⁺。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>电离常数 Ka = c(CH₃COO⁻)·c(H⁺) / c(CH₃COOH)，25 °C 时醋酸的 Ka = 1.75×10⁻⁵</li>
            <li>Ka 只和温度有关；Ka 越大，酸性越强</li>
            <li>稀释：平衡向电离的方向移动，电离度增大，但 c(H⁺) 减小，pH 增大不到 1</li>
            <li>升温：电离吸热，平衡向电离的方向移动</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">Ka 由 pH 计读数算出：Ka = c(H⁺)² / (c − c(H⁺))。放大窗里的粒子个数是示意。</p>
        </>} />}
      finale={T.finale && <Fin tag="稀释和加热都试过了" big="平衡会移动，Ka 只随温度变">0.10 mol/L 醋酸 pH {meter(hacPH(HAC.c0))}，稀释十倍 pH {meter(hacPH(HAC.c1))}，电离度从 {(alphaOf(HAC.c0) * 100).toFixed(1)}% 增大到 {(alphaOf(HAC.c1) * 100).toFixed(1)}%，两次算出的 Ka 都是 {sci(KA_HAC, 2)}。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">pH 计读数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{read === 'hot' ? '变小' : reading === '0.00' ? '—' : reading}</div>
            {read === 'hot' && <div className="mt-1 text-[13px] text-white/60">升温，c(H⁺) 增大</div>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="c" value={read ? cNow.toFixed(read === 'c0' ? 2 : 3) : '—'} unit="mol/L · 醋酸" />
            <ParamTile symbol="α" value={read && read !== 'hot' ? `${(alphaOf(cNow) * 100).toFixed(1)}%` : read === 'hot' ? '增大' : '—'} unit="电离度" />
            <ParamTile symbol="Ka" value={read && read !== 'hot' ? sci(kaFromPH(cNow, hacPH(cNow)), 2) : read === 'hot' ? '增大' : '—'} unit={read === 'hot' ? '50 °C' : '25 °C'} />
            <ParamTile symbol="c(H⁺)" value={read && read !== 'hot' ? sci(10 ** -hacPH(cNow)) : '—'} unit="mol/L" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">放大窗</h2>
          <Legend items={['HAc', 'Ac', 'H', 'H2O']} />
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'm1'} pulse={next === 'm1'} onClick={() => m1.run()} disabled={busy || !!read}>测 pH</LabButton>
        <LabButton primary={next === 'dil'} pulse={next === 'dil'} onClick={() => dil.run()} disabled={busy || read !== 'c0'}>稀释十倍</LabButton>
        <LabButton primary={next === 'heat'} pulse={next === 'heat'} onClick={() => heat.run()} disabled={busy || read !== 'c1'}>放进 50 °C 水浴</LabButton>
      </>}
      extras={null}
    />
  )
}
