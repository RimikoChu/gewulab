// 水溶液里的离子平衡 · 第 7 课 沉淀溶解平衡：离心机旁。透明试管架上一支离心管，盛 2 mL 0.1 mol/L NaCl 溶液；
// 先滴 2 滴 0.1 mol/L AgNO₃（Q 远大于 Ksp，析出白色 AgCl），再滴 4 滴 0.1 mol/L KI（白色沉淀转化成黄色 AgI），最后放进离心机，沉淀沉到管底。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Glass as Panel, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { DropBottle, Dropper, Glove, LOOK, u } from './gear'
import { CentTube, Centrifuge } from './rig'
import { Drop } from './fx'
import { Legend, Micro, type Mix } from './micro'
import { Fin } from './fin'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, mixHex, seg, useRun } from './parts'
import { KSP, PPT, convK, qAgCl, qAgI, sci } from './physics'
import { BZ, SPOT, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l7, Y = TOP, Z = BZ + 0.6
const p = (x: number, y: number, z: number): V3 => [X0 + u(x), Y + u(y), Z + u(z)]
const RACK = p(-0.03, 0, 0.04), TUBE0 = p(-0.03, 0.006, 0.04)
const CF = p(0.14, 0, -0.05), CS = 0.62                  // 离心机的位置和缩放
const SLOT: V3 = [CF[0] + u(0.058 * CS), CF[1] + u((0.05 - 0.04) * CS), CF[2]]
const BOT = { ag: p(-0.14, 0, 0.06), ki: p(-0.1, 0, 0.11) }
const TASKS: Task[] = [
  { id: 'ag', text: '往 NaCl 溶液里滴 2 滴 AgNO₃ 溶液', note: `析出白色沉淀：Q(AgCl) = ${sci(qAgCl())}，远大于 Ksp = ${sci(KSP.AgCl)}` },
  { id: 'ki', text: '再滴 4 滴 KI 溶液', note: `白色沉淀变成黄色：Ksp(AgI) = ${sci(KSP.AgI)} 更小，AgCl 转化成更难溶的 AgI` },
  { id: 'spin', text: '放进离心机，分离沉淀', note: '黄色的 AgI 沉到管底，上层清液澄清' },
]
const MIX = { start: { Na: 7, Cl: 7 }, ag: { Na: 7, Cl: 5, NO3: 2, AgCl: 2 }, ki: { Na: 7, Cl: 7, NO3: 2, K: 4, I: 2, AgI: 2 } } satisfies Record<string, Mix>

export default function Lesson7() {
  const [stage, setStage] = useState<'start' | 'ag' | 'ki' | 'spun'>('start')
  const T = useTasks('gewu:ionic:7', TASKS)
  const ag = useRun(3.2, () => { setStage('ag'); T.check(id => id === 'ag') })
  const ki = useRun(3.6, () => { setStage('ki'); T.check(id => id === 'ki') })
  const spin = useRun(7.2, () => { setStage('spun'); T.check(id => id === 'spin') })
  const busy = ag.busy || ki.busy || spin.busy
  const resetAll = () => { ag.snap(0); ki.snap(0); spin.snap(0); setStage('start'); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'ag' | 'ki' | 'spin' | null } = !task ? { hint: '沉淀溶解平衡也会移动：沉淀一般向溶解度更小的方向转化。', next: null }
    : ag.busy ? { hint: '用胶头滴管滴 2 滴 AgNO₃ 溶液…', next: null }
    : ki.busy ? { hint: '用胶头滴管滴 4 滴 KI 溶液…', next: null }
    : spin.busy ? { hint: '离心管放进转子，对面放一支等量的水管配平，盖上盖子…', next: null }
    : task.id === 'ag' ? { hint: '往 NaCl 溶液里滴 2 滴 AgNO₃ 溶液，看有没有沉淀', next: 'ag' }
    : task.id === 'ki' ? { hint: '有白色沉淀。再滴 4 滴 KI 溶液，看沉淀怎么变', next: 'ki' }
    : { hint: '沉淀变黄了。把离心管放进离心机，分离沉淀', next: 'spin' }

  // 滴液：滴管从滴瓶拿到离心管口上方，挤几滴，放回去
  const run = ag.busy ? ag : ki.busy ? ki : null, from = ag.busy ? BOT.ag : BOT.ki, nDrops = ag.busy ? 2 : 4
  const len = ag.busy ? 3.2 : 3.6
  const dk = run ? ease(seg(run.t, 0, 0.9)) - ease(seg(run.t, len - 0.9, len)) : 0
  const tubeMouth: V3 = [TUBE0[0], TUBE0[1] + u(0.115), TUBE0[2]]
  const dropperAt: V3 = liftPath([from[0], Y + u(0.03), from[2]], [tubeMouth[0], tubeMouth[1] + u(0.02), tubeMouth[2]], Y + u(0.2), dk)
  const dripping = run ? seg(run.t, 0.9, len - 0.9) : 0
  // 沉淀的样子：白 → 黄；离心以后沉到管底
  const yellow = stage === 'ki' || stage === 'spun' ? 1 : ki.busy ? seg(ki.t, 1.2, 2.8) : 0
  const cloudK = stage === 'start' ? (ag.busy ? seg(ag.t, 1.1, 2.4) : 0) : stage === 'spun' ? 0 : spin.busy ? 1 - seg(spin.t, 2.6, 4.6) : 1
  const sedK = stage === 'spun' ? 1 : spin.busy ? seg(spin.t, 2.6, 4.6) : 0
  const pColor = mixHex('#f3f3ee', '#e8cf45', yellow)
  // 离心：开盖、放管、关盖、转、停、开盖、取管
  const st = spin.t
  const lid = spin.busy ? ease(seg(st, 0, 0.6)) - ease(seg(st, 2.0, 2.5)) + ease(seg(st, 5.3, 5.8)) - ease(seg(st, 6.6, 7.1)) : 0
  const inRotor = spin.busy && st > 1.6 && st < 6.0
  const tubeAt: V3 = !spin.busy ? TUBE0 : st < 1.6 ? liftPath(TUBE0, SLOT, Y + u(0.3), seg(st, 0.6, 1.6)) : st < 6 ? SLOT : liftPath(SLOT, TUBE0, Y + u(0.3), seg(st, 6.0, 7.0))
  const tube = <CentTube fill={0.22} look={LOOK.clear} cloud={{ color: pColor, k: cloudK }} sed={{ color: pColor, k: sedK }} />
  const micKey = stage === 'spun' ? 'ki' : stage
  const yaw = SPOT.l7.view[0], MIC = p(-0.13, 0.23, -0.03)
  const labels: Label[] = [
    { id: 't', at: [TUBE0[0] + u(0.02), TUBE0[1] + u(0.13), TUBE0[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>NaCl</small>2 mL 0.1 mol/L</> },
    { id: 'ag', at: [BOT.ag[0], Y - u(0.003), BOT.ag[2] + u(0.03)], ax: 0.5, name: true, className: 'scene-name', children: 'AgNO₃' },
    { id: 'ki', at: [BOT.ki[0], Y - u(0.003), BOT.ki[2] + u(0.03)], ax: 0.5, name: true, className: 'scene-name', children: 'KI' },
    { id: 'cf', at: [CF[0], Y + u(0.18), CF[2] + u(0.1)], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '离心机' },
  ]
  return (
    <LabShell title="水溶液里的离子平衡" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="沉淀"
      stage={<Place at="l7" labels={labels}>
        {/* 透明的亚克力试管架 */}
        <group position={RACK}>
          <RoundedBox args={[u(0.1), u(0.006), u(0.05)]} radius={u(0.002)} position-y={u(0.003)} receiveShadow><meshPhysicalMaterial color="#e8f0f2" transparent opacity={0.55} roughness={0.1} clearcoat={1} /></RoundedBox>
          <RoundedBox args={[u(0.1), u(0.006), u(0.05)]} radius={u(0.002)} position-y={u(0.06)} castShadow><meshPhysicalMaterial color="#e8f0f2" transparent opacity={0.45} roughness={0.1} clearcoat={1} depthWrite={false} /></RoundedBox>
          {[-1, 1].map(s => <RoundedBox key={s} args={[u(0.006), u(0.063), u(0.05)]} radius={u(0.002)} position={[s * u(0.047), u(0.0315), 0]}><meshPhysicalMaterial color="#e8f0f2" transparent opacity={0.45} roughness={0.1} clearcoat={1} depthWrite={false} /></RoundedBox>)}
        </group>
        {!inRotor && <group position={tubeAt}>{tube}</group>}
        <group position={CF} scale={CS}>
          <Centrifuge open={lid} spin={spin.busy && st > 2.5 && st < 4.8} rpm={spin.busy && st > 2.5 && st < 4.8 ? '4000' : '0'}>
            {inRotor && <group position={[u(0.058), u(-0.04), 0]} scale={1 / CS}>{tube}</group>}
            <group position={[-u(0.058), u(-0.04), 0]} scale={1 / CS}><CentTube fill={0.22} look={LOOK.clear} /></group>
          </Centrifuge>
        </group>
        <group position={BOT.ag} rotation-y={-0.3}><DropBottle label="AgNO₃" band="#6a7a88" look={LOOK.clear} brown dropper={!ag.busy} /></group>
        <group position={BOT.ki} rotation-y={-0.2}><DropBottle label="KI" band="#7a4fd6" look={LOOK.clear} dropper={!ki.busy} /></group>
        {run && <group position={dropperAt}>
          <Dropper fill={dripping < 0.5 ? 0.4 : 0.1} />
          <group position={[0, u(0.1), 0]} rotation={[0.25, 0.3, 0.1]}><Glove s={u(0.0055)} /></group>
        </group>}
        {run && Array.from({ length: nDrops }, (_, i) => <Drop key={i} at={[tubeMouth[0], tubeMouth[1] + u(0.02), tubeMouth[2]]} drop={u(0.1)} t={(dripping * nDrops - i)} r={u(0.0018)} />)}
        <Micro at={MIC} r={u(0.07)} yaw={yaw} from={[TUBE0[0] - u(0.006), TUBE0[1] + u(0.025), TUBE0[2] + u(0.008)]} mix={MIX[micKey]} water={false} seed={7} />
      </Place>}
      lesson={<LessonBlock no="7" title="沉淀溶解平衡" concept="沉淀向更难溶的方向转化" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>难溶电解质在水中也会溶解一点，溶解和沉淀的速率相等时达到沉淀溶解平衡：AgCl(s) ⇌ Ag⁺(aq) + Cl⁻(aq)。Ksp = c(Ag⁺)·c(Cl⁻)，叫做溶度积。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>离子积 Q &gt; Ksp：溶液过饱和，有沉淀析出；Q = Ksp：平衡；Q &lt; Ksp：沉淀溶解</li>
            <li>25 °C：Ksp(AgCl) = {sci(KSP.AgCl)}，Ksp(AgI) = {sci(KSP.AgI)}</li>
            <li>沉淀的转化：AgCl(s) + I⁻ ⇌ AgI(s) + Cl⁻，K = Ksp(AgCl)/Ksp(AgI) ≈ {sci(convK())}</li>
            <li>离心机里离心管要对称放置、质量相近，转子才平稳</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">一滴按 {PPT.drop} mL 算，混合后体积相加。放大窗里的粒子个数是示意。</p>
        </>} />}
      finale={T.finale && <Fin tag="沉淀转化做完了" big="沉淀向更难溶的方向转化">Q(AgCl) = {sci(qAgCl())} &gt; Ksp，析出 AgCl；滴 KI 后 Q(AgI) = {sci(qAgI())} &gt; Ksp(AgI) = {sci(KSP.AgI)}，白色的 AgCl 转化成黄色的 AgI，K ≈ {sci(convK())}。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">离子积 Q 和溶度积 Ksp</h2>
          <table className="mt-2 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/55"><td></td><td className="text-right">Q</td><td className="text-right">Ksp</td></tr></thead>
            <tbody>
              <tr><td>AgCl</td><td className="text-right">{stage !== 'start' ? sci(qAgCl()) : '—'}</td><td className="text-right">{sci(KSP.AgCl)}</td></tr>
              <tr><td>AgI</td><td className="text-right">{stage === 'ki' || stage === 'spun' ? sci(qAgI()) : '—'}</td><td className="text-right">{sci(KSP.AgI)}</td></tr>
            </tbody>
          </table>
          <div className="mt-3 rounded-xl bg-white/8 px-3 py-2.5 text-[14.5px]">{stage === 'start' ? '还没有沉淀' : stage === 'ag' ? 'Q > Ksp：析出白色 AgCl 沉淀' : 'AgCl 转化成黄色 AgI 沉淀'}</div>
          <h2 className="mt-4 text-[12.5px] text-white/55">放大窗</h2>
          <Legend items={stage === 'start' ? ['Na', 'Cl'] : stage === 'ag' ? ['Na', 'Cl', 'NO3', 'AgCl'] : ['Na', 'Cl', 'K', 'I', 'AgI']} />
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'ag'} pulse={next === 'ag'} onClick={() => ag.run()} disabled={busy || stage !== 'start'}>滴 AgNO₃</LabButton>
        <LabButton primary={next === 'ki'} pulse={next === 'ki'} onClick={() => ki.run()} disabled={busy || stage !== 'ag'}>滴 KI</LabButton>
        <LabButton primary={next === 'spin'} pulse={next === 'spin'} onClick={() => spin.run()} disabled={busy || stage !== 'ki'}>离心</LabButton>
      </>}
      extras={null}
    />
  )
}
