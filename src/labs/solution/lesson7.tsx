// 溶液 · 第 7 课 溶质的质量分数：化验台第 6 格，配 50 g 质量分数为 6% 的氯化钠溶液。
// 计算 → 在电子天平上称 3.0 g 氯化钠 → 用 50 mL 量筒量 47 mL 水 → 倒进烧杯搅拌溶解、装进细口瓶 → 再取 25 g 这种溶液加 25 mL 水，稀释成 3%。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import * as THREE from 'three'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BAL, BEAKER, Balance, Beaker, CYL, Cylinder, GlassRod, Glove, JarBottle, NarrowBottle, SqueezeBottle, Spoon, WeighPaper, cylLevel } from './gear'
import { Crystals, Grains } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun, type P3 } from './parts'
import { L7, dilute, fraction, recipe } from './physics'
import { BZ, M, ST, TOP, Place } from './world'

const X0 = ST.l7, Y = TOP, Z = BZ + 0.15
const RC = recipe(L7.total, L7.w), DL = dilute(L7.total, L7.w, L7.low)
const BAL_AT: P3 = [X0 - 0.15 * M, Y, Z - 0.03 * M], PAPER: P3 = [BAL_AT[0], Y + BAL.pan * M, BAL_AT[2] - 0.02 * M]
const JAR: P3 = [X0 - 0.25 * M, Y, Z - 0.15 * M], WASH: P3 = [X0 + 0.01 * M, Y, Z - 0.15 * M]
const CYL0: P3 = [X0 - 0.03 * M, Y, Z + 0.01 * M], CUP: P3 = [X0 + 0.06 * M, Y, Z], BOT: P3 = [X0 + 0.15 * M, Y, Z - 0.04 * M], CUP2: P3 = [X0 + 0.23 * M, Y, Z + 0.01 * M]
const SPOON0: P3 = [X0 - 0.26 * M, Y + 0.004 * M, Z + 0.07 * M], ROD0: P3 = [X0 + 0.04 * M, Y + 0.004 * M, Z + 0.1 * M]
const RB = BEAKER[100].r * M, HB = BEAKER[100].h * M, AREA = Math.PI * (BEAKER[100].r - 0.002) ** 2
const lv = (mL: number) => mL * 1e-6 / AREA
const STEP = ['calc', 'weigh', 'measure', 'dissolve', 'dilute'] as const
type Step = typeof STEP[number]
const DUR: Record<Step, number> = { calc: 1.2, weigh: 4.2, measure: 4.2, dissolve: 9, dilute: 8 }
const TASKS: Task[] = [
  { id: 'calc', text: '计算：要多少氯化钠、多少水', note: `氯化钠 ${L7.total} g × ${L7.w}% = ${RC.solute.toFixed(1)} g，水 ${L7.total} g − ${RC.solute.toFixed(1)} g = ${RC.water.toFixed(0)} g，即 ${RC.mL.toFixed(0)} mL` },
  { id: 'weigh', text: `用天平称 ${RC.solute.toFixed(1)} g 氯化钠`, note: '放在称量纸上称，用药匙一点点加' },
  { id: 'measure', text: `用 50 mL 量筒量 ${RC.mL.toFixed(0)} mL 水`, note: '视线与量筒内凹液面的最低处保持水平' },
  { id: 'dissolve', text: '倒进烧杯搅拌溶解，装瓶贴标签', note: `得到 ${L7.total} g 质量分数为 ${L7.w}% 的氯化钠溶液` },
  { id: 'dilute', text: `取 ${DL.conc.toFixed(0)} g 这种溶液，加 ${DL.water.toFixed(0)} mL 水`, note: `溶质不变，溶液变成 ${L7.total} g，质量分数变为 ${L7.low}%` },
]

export default function Lesson7() {
  const [step, setStep] = useState(0)          // 做完了几步
  const T = useTasks('gewu:solution:7', TASKS)
  const cur = STEP[Math.min(step, STEP.length - 1)]
  const run = useRun(DUR[cur], () => { const s = step + 1; setStep(s); T.check(id => STEP.indexOf(id as Step) < s) })
  const resetAll = () => { run.snap(0); setStep(0); T.reset() }
  const did = (s: Step) => step > STEP.indexOf(s), doing = (s: Step) => run.busy && cur === s
  const t = run.t

  // 各件东西现在的状态
  const salt = doing('weigh') ? RC.solute * Math.min(1, Math.floor(seg(t, 0, 3.6) * 3 + 0.001) / 3 + (seg(t, 3.2, 3.6) > 0 ? 1 : 0)) : did('weigh') && !did('dissolve') && !(doing('dissolve') && t > 1.4) ? RC.solute : 0
  const cylML = doing('measure') ? RC.mL * ease(seg(t, 0.6, 3.4)) : did('measure') && !did('dissolve') ? (doing('dissolve') ? RC.mL * (1 - seg(t, 1.8, 3.2)) : RC.mL) : doing('dilute') ? DL.water * (t < 2.6 ? ease(seg(t, 0.4, 2.4)) : 1 - seg(t, 3.0, 4.6)) : 0
  const cupML = doing('dissolve') ? RC.mL * seg(t, 1.8, 3.2) * (1 - seg(t, 6.2, 8.2)) : 0
  const botML = doing('dissolve') ? L7.total * seg(t, 6.2, 8.2) : did('dissolve') ? L7.total - (doing('dilute') ? DL.conc * seg(t, 4.8, 6.6) : did('dilute') ? DL.conc : 0) : 0
  const cup2ML = doing('dilute') ? DL.water * seg(t, 3.0, 4.6) + DL.conc * seg(t, 4.8, 6.6) : did('dilute') ? L7.total : 0
  const reading = doing('weigh') || (did('weigh') && !did('dissolve') && !(doing('dissolve') && t > 1.4)) ? salt : 0

  // 动作
  const moving = doing('weigh') && t < 3.6, trip = Math.min(2, Math.floor(seg(t, 0, 3.6) * 3)), u = seg(t, 0, 3.6) * 3 - trip
  const jarTop: P3 = [JAR[0] + 0.03 * M, Y + 0.03 * M, JAR[2] + 0.06 * M], over: P3 = [PAPER[0] - 0.01 * M, PAPER[1] + 0.03 * M, PAPER[2]]
  const sp: P3 = !moving ? SPOON0 : u < 0.45 ? liftPath(trip ? over : SPOON0, jarTop, Y + 0.16 * M, seg(u, 0, 0.45)) : u < 0.8 ? liftPath(jarTop, over, Y + 0.16 * M, seg(u, 0.45, 0.8)) : over
  const tap = moving && u > 0.8 ? Math.sin(t * 40) * 0.08 : 0
  const pw = doing('measure') ? ease(seg(t, 0, 0.6)) * (1 - ease(seg(t, 3.4, 4))) : doing('dilute') ? ease(seg(t, 0, 0.4)) * (1 - ease(seg(t, 2.4, 2.8))) : 0
  const washAt: P3 = [WASH[0] + (CYL0[0] - 0.05 * M - WASH[0]) * pw, Y + pw * (CYL.h + 0.02) * M, WASH[2] + (CYL0[2] - WASH[2]) * pw]
  const cylMove = doing('dissolve') ? ease(seg(t, 1.2, 1.8)) * (1 - ease(seg(t, 3.2, 3.8))) : doing('dilute') ? ease(seg(t, 2.6, 3.0)) * (1 - ease(seg(t, 4.6, 5))) : 0
  const cylTo: P3 = doing('dilute') ? [CUP2[0] - 0.06 * M, Y + 0.09 * M, CUP2[2]] : [CUP[0] - 0.06 * M, Y + 0.09 * M, CUP[2]]
  const cylAt: P3 = [CYL0[0] + (cylTo[0] - CYL0[0]) * cylMove, CYL0[1] + (cylTo[1] - CYL0[1]) * cylMove, CYL0[2] + (cylTo[2] - CYL0[2]) * cylMove]
  const paperK = doing('dissolve') ? ease(seg(t, 0, 0.7)) * (1 - ease(seg(t, 1.2, 1.4))) : 0
  const paperGone = did('dissolve') || (doing('dissolve') && t > 1.4)
  const paperAt: P3 = [PAPER[0] + (CUP[0] - 0.03 * M - PAPER[0]) * paperK, PAPER[1] + (Y + HB + 0.02 * M - PAPER[1]) * paperK, PAPER[2] + (CUP[2] - PAPER[2]) * paperK]
  const stirring = (doing('dissolve') && t > 3.4 && t < 6) || (doing('dilute') && t > 6.6)
  const ang = performance.now() / 1000 * 9, sc = doing('dilute') ? CUP2 : CUP
  const rodAt: P3 = stirring ? [sc[0] + Math.cos(ang) * RB * 0.4, Y + 0.008 * M, sc[2] + Math.sin(ang) * RB * 0.3] : ROD0
  const cupTilt = doing('dissolve') ? ease(seg(t, 6.0, 6.5)) * (1 - ease(seg(t, 8.2, 8.8))) : 0
  const cupAt: P3 = [CUP[0] + (BOT[0] - 0.06 * M - CUP[0]) * cupTilt, Y + cupTilt * 0.12 * M, CUP[2] + (BOT[2] - CUP[2]) * cupTilt]
  const botTilt = doing('dilute') ? ease(seg(t, 4.4, 4.8)) * (1 - ease(seg(t, 6.6, 7))) : 0
  const botAt: P3 = [BOT[0] + (CUP2[0] - 0.07 * M - BOT[0]) * botTilt, Y + botTilt * 0.11 * M, BOT[2] + (CUP2[2] - BOT[2]) * botTilt]
  const dissolveLeft = doing('dissolve') ? 1 - seg(t, 3.4, 5.8) : 0

  const task = T.current
  const { hint, next }: { hint: string; next: 'main' | 'dilute' | null } = !task ? { hint: `溶质的质量分数 = 溶质质量 ÷ 溶液质量。稀释前后溶质的质量不变。`, next: null }
    : run.busy ? { hint: cur === 'weigh' ? '用药匙一点点加，看天平读数…' : cur === 'measure' ? '往量筒里倒水，接近刻度时慢慢加…' : cur === 'dissolve' ? (t < 3.4 ? '把氯化钠和水倒进烧杯…' : t < 6 ? '用玻璃棒搅拌，使氯化钠溶解…' : '装进细口瓶，贴上标签…') : cur === 'dilute' ? '取 25 g 溶液，加 25 mL 水，搅拌…' : '算一算…', next: null }
    : task.id === 'calc' ? { hint: `先计算：配 ${L7.total} g ${L7.w}% 的氯化钠溶液，要多少氯化钠、多少水`, next: 'main' }
    : task.id === 'weigh' ? { hint: `用天平称 ${RC.solute.toFixed(1)} g 氯化钠`, next: 'main' }
    : task.id === 'measure' ? { hint: `用 50 mL 量筒量 ${RC.mL.toFixed(0)} mL 水`, next: 'main' }
    : task.id === 'dissolve' ? { hint: '倒进烧杯搅拌溶解，再装瓶贴标签', next: 'main' }
    : { hint: `再把它稀释成 ${L7.low}%：取 ${DL.conc.toFixed(0)} g，加 ${DL.water.toFixed(0)} mL 水`, next: 'dilute' }
  const mainLabel = ['计算', '称量', '量取', '溶解，装瓶', '溶解，装瓶'][step]

  const labels: Label[] = [
    { id: 'b', at: [BAL_AT[0], Y + 0.13 * M, BAL_AT[2]], ax: 0.5, className: `scene-tag ${did('weigh') ? 'key' : ''} -translate-y-full`, children: <><small>天平</small>{reading.toFixed(1)} g</> },
    { id: 'c', at: [CYL0[0], Y + (CYL.h + 0.02) * M, CYL0[2]], ax: 0.5, className: `scene-tag ${did('measure') && !did('dissolve') ? 'key' : ''} -translate-y-full`, children: <><small>量筒</small>{Math.round(cylML)} mL</> },
    ...(did('dissolve') ? [{ id: 'bo', at: [BOT[0], Y + 0.14 * M, BOT[2]] as P3, ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>氯化钠溶液</small>{L7.w}%</> }] : []),
    ...(did('dilute') ? [{ id: 'c2', at: [CUP2[0], Y + HB + 0.03 * M, CUP2[2]] as P3, ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>稀释后</small>{L7.low}%</> }] : []),
    ...(doing('measure') && t > 2.6 ? [{ id: 'eye', at: [CYL0[0] + 0.03 * M, Y + cylLevel(RC.mL) * M, CYL0[2]] as P3, ax: 0, className: 'scene-name -translate-y-1/2', children: '视线与凹液面最低处相平' }] : []),
    { id: 'n1', at: [JAR[0], Y + 0.1 * M, JAR[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '氯化钠' },
    { id: 'n2', at: [WASH[0], Y + 0.15 * M, WASH[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '蒸馏水' },
  ]
  const w = did('dilute') ? fraction(RC.solute * DL.conc / L7.total, L7.total) : did('dissolve') ? fraction(RC.solute, L7.total) : null
  return (
    <LabShell title="溶液" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="配制溶液"
      stage={<Place at="l7" labels={labels}>
        <group position={BAL_AT}><Balance text={reading.toFixed(1)} /></group>
        {!paperGone && <group position={paperAt} rotation-z={paperK * 1.1}><WeighPaper />
          <Crystals at={[0, 0.001 * M, 0]} R={0.012 * M} amount={salt / RC.solute} size={0.0016 * M} n={70} seed={31} heap={1.4} />
        </group>}
        <group position={JAR}><JarBottle label="氯化钠" amount={0.6} stopper={false} /></group>
        <group position={sp} rotation={[0, moving ? 0 : 0.6, tap + (moving && u > 0.8 ? 0.5 : 0)]}><Spoon load={moving && u > 0.4 ? 0.7 : 0} />
          {moving && <group position={[0.15 * M, 0.02 * M, -0.01 * M]} rotation={[-1.0, 0.3, -0.9]}><Glove /></group>}
        </group>
        <group position={washAt} rotation-z={Math.PI * 0.62 * pw}><SqueezeBottle label="蒸馏水" />
          {pw > 0.9 && <mesh position={[0.008 * M, 0.15 * M, 0]} rotation-z={-Math.PI * 0.62}><cylinderGeometry args={[0.0009 * M, 0.0009 * M, 0.05 * M, 8]} /><meshPhysicalMaterial color="#d6eef4" transparent opacity={0.6} roughness={0.02} /></mesh>}
          {pw > 0.05 && <group position={[0, 0.05 * M, -0.03 * M]} rotation={[-0.5, 0, 0]}><Glove /></group>}
        </group>
        <group position={cylAt} rotation-z={-1.9 * cylMove}><Cylinder mL={cylML} />
          {cylMove > 0.05 && <group position={[0, 0.12 * M, -0.02 * M]} rotation={[-0.5, 0, 0]}><Glove /></group>}
        </group>
        <group position={cupAt} rotation-z={-1.7 * cupTilt}><Beaker vol={100} level={lv(cupML + (doing('dissolve') && t > 1.4 && t < 6.2 ? 1.2 : 0))} color="#cbe4ea" /></group>
        <Grains at={CUP} R={RB * 0.6} H={lv(cupML) * M} fall={doing('dissolve') ? seg(t, 0.8, 1.6) : 0} left={dissolveLeft} size={0.0018 * M} n={50} seed={8} swirl={stirring ? 1 : 0} />
        <group position={botAt} rotation-z={-1.75 * botTilt}><NarrowBottle label="氯化钠溶液" sub={did('dissolve') || doing('dissolve') && t > 8 ? `${L7.w}%` : undefined} color="#cfe5eb" opacity={botML > 0.5 ? 0.45 : 0} />
          {(cupTilt > 0.05 || botTilt > 0.05) && botTilt > 0.05 && <group position={[0, 0.06 * M, -0.03 * M]} rotation={[-0.5, 0, 0]}><Glove /></group>}
        </group>
        <group position={CUP2}><Beaker vol={100} level={lv(cup2ML)} color="#cbe4ea" /></group>
        <group position={rodAt} rotation={stirring ? [Math.sin(ang) * 0.15, 0, -Math.cos(ang) * 0.15] : [0, 0.2, Math.PI / 2 - 0.02]}><GlassRod len={0.18} />
          {stirring && <group position={[0, 0.14 * M, 0]} rotation={[-0.45, 0, 0]}><Glove /></group>}
        </group>
        {/* 量取时：一条和凹液面最低处平齐的视线 */}
        {doing('measure') && t > 2.6 && <mesh position={[CYL0[0] + 0.1 * M, Y + cylLevel(RC.mL) * M, CYL0[2] + 0.02 * M]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.0008 * M, 0.0008 * M, 0.2 * M, 6]} /><meshBasicMaterial color="#ffe9a8" transparent opacity={0.85} toneMapped={false} side={THREE.DoubleSide} /></mesh>}
      </Place>}
      lesson={<LessonBlock no="7" title="溶质的质量分数" concept="质量分数 = 溶质质量 ÷ 溶液质量" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">溶质的质量分数</b> = 溶质质量 ÷ 溶液质量 × 100%，溶液质量 = 溶质质量 + 溶剂质量。</p>
          <p className="mt-3">配制一定溶质质量分数的溶液，步骤是：<b className="text-white">计算、称量、量取、溶解、装瓶贴标签</b>。称量用托盘天平或电子天平，量取水用量筒，读数时视线与凹液面的最低处保持水平。</p>
          <p className="mt-3">用水稀释浓溶液时，<b className="text-white">稀释前后溶质的质量不变</b>：25 g × 6% = 50 g × 3%。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">溶液配好了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">质量分数 = 溶质质量 ÷ 溶液质量 × 100%</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">{RC.solute.toFixed(1)} g 氯化钠加 {RC.mL.toFixed(0)} mL 水，得 {L7.total} g {L7.w}% 的溶液；取 {DL.conc.toFixed(0)} g 加 {DL.water.toFixed(0)} g 水，稀释成 {L7.low}%。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[17px] italic text-white/65">w = m质 ÷ m液 × 100%</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{w === null ? '—' : w.toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">%</span></div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">配 {L7.total} g {L7.w}% 的氯化钠溶液</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="m质" value={step > 0 ? RC.solute.toFixed(1) : '?'} unit="g · 氯化钠" />
            <ParamTile symbol="V水" value={step > 0 ? RC.mL.toFixed(0) : '?'} unit={`mL · 即 ${RC.water.toFixed(0)} g 水`} />
          </div>
          <ol className="mt-4 flex flex-col gap-1 text-[13.5px]">
            {['计算', '称量', '量取', '溶解、装瓶', `稀释成 ${L7.low}%`].map((s, i) => <li key={s} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${step > i ? 'bg-white/[0.08] text-white' : step === i ? 'bg-white/[0.04] text-white/85' : 'text-white/45'}`}><span className="w-4 tabular-nums text-white/50">{i + 1}</span>{s}</li>)}
          </ol>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'main'} pulse={next === 'main'} onClick={() => { if (run.busy || step > 3) return; run.run() }} disabled={run.busy || step > 3}>{mainLabel}</LabButton>
        <LabButton primary={next === 'dilute'} pulse={next === 'dilute'} onClick={() => { if (run.busy || step !== 4) return; run.run() }} disabled={run.busy || step !== 4}>稀释成 {L7.low}%</LabButton>
      </>}
      extras={null}
    />
  )
}
