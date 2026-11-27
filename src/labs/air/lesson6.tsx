// 空气和氧气 · 第 6 课 二氧化锰为什么用不完：制氧车间的对比台。试管架上三支盛着过氧化氢溶液的试管，旁边是电子天平、过滤架和小烘箱。
// 第一支不加二氧化锰；第二支加 2.0 g；反应停了以后把二氧化锰滤出、烘干、再称，还是 2.0 g，加进第三支照样冒气泡。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import * as THREE from 'three'
import { Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Beaker, Glove, JarBottle, NarrowBottle, Splint, TUBE, TestTube, TubeRack } from './gear'
import { Balance, FILTER_TOP, FILTER_Z, FilterStand, OVEN_SHELF, Oven, PAN_Y, PAN_Z, Paper, Powder, Scoop } from './kit'
import { Bubbles, Drips, Flame } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun } from './parts'
import { MNO2, bubbleRate, catalystMass } from './physics'
import { BZ, M, Place, ST, TOP, type V3 } from './world'

const u = (v: number) => v * M
const X0 = ST.l6, Z0 = BZ + 0.1
const at = (x: number, y: number, z = 0): V3 => [X0 + u(x), TOP + u(y), Z0 + u(z)]
/** 试管架、天平、过滤架、烘箱、药品瓶的位置（m）；试管里溶液的多少 */
const RX = -0.36, GAP = 0.05, BX = -0.1, FX = 0.1, OX = 0.33, JARX = -0.43, FILL = 0.36, TY = 0.012
const tubeX = (i: number) => RX + (i - 1) * GAP
const mouthOf = (i: number): V3 => [tubeX(i), TY + TUBE.h + 0.012, 0]
const PANP: V3 = [BX, PAN_Y + 0.002, PAN_Z], SPL: V3 = [-0.16, 0.006, 0.24], HIGH = 0.3
const FUN: V3 = [FX, FILTER_TOP - 0.04, FILTER_Z], DOOR: V3 = [OX - 0.02, OVEN_SHELF + 0.02, 0.12]
/** 加药和回收这两段动作放慢的倍数：讲解跟得上 */
const SLOW = 1.3
const TASKS: Task[] = [
  { id: 'none', text: '不加二氧化锰，看过氧化氢自己分解多慢', note: '只有很少的气泡，带火星的木条不复燃' },
  { id: 'add', text: '加 2.0 g 二氧化锰，再试一次', note: '立刻产生大量气泡，带火星的木条复燃' },
  { id: 'back', text: '反应后滤出、烘干、称量，看还是不是 2.0 g', note: '回收的二氧化锰还是 2.000 g，加进新的溶液照样有效' },
]

export default function Lesson6() {
  const [step, setStep] = useState(0)             // 做完了几步：0 还没做；1 看过不加的；2 加过了；3 回收称过了
  const T = useTasks('gewu:air:6', TASKS)
  const a = useRun(5.2, () => { setStep(s => Math.max(s, 1)); T.check(id => id === 'none') })
  const b = useRun(9 * SLOW, () => { setStep(2); T.check(id => id === 'add') })
  const c = useRun(12.5 * SLOW, () => { setStep(3); T.check(id => id === 'back') })
  const busy = a.busy || b.busy || c.busy
  const resetAll = () => { a.snap(0); b.snap(0); c.snap(0); setStep(0); T.reset() }
  const ta = a.busy ? a.t : 0, tb = b.busy ? b.t / SLOW : 0, tc = c.busy ? c.t / SLOW : 0

  const task = T.current
  const { hint, next }: { hint: string; next: 'a' | 'b' | 'c' | null } = !task ? { hint: '二氧化锰加快了过氧化氢的分解，自己的质量和化学性质都没有变：它是催化剂。', next: null }
    : a.busy ? { hint: '过氧化氢溶液里只有很少的气泡，带火星的木条没有复燃…', next: null }
    : b.busy ? { hint: tb < 4.6 ? '用药匙取二氧化锰，在天平上称出 2.000 g，倒进第二支试管…' : '立刻冒出大量气泡，带火星的木条复燃了…', next: null }
    : c.busy ? { hint: tc < 6 ? '把第二支试管里的东西倒进漏斗过滤，滤纸上的黑色固体放进烘箱烘干…' : '烘干以后再称一次：还是 2.000 g；加进第三支试管，又冒出大量气泡…', next: null }
    : task.id === 'none' ? { hint: '先看不加二氧化锰的那一支：把带火星的木条放在管口', next: 'a' }
    : task.id === 'add' ? { hint: '称 2.0 g 二氧化锰，加进第二支试管', next: 'b' }
    : { hint: '等反应停下来，把二氧化锰滤出、烘干，再称一次', next: 'c' }

  // 黑色粉末在哪：药匙里 → 秤盘的纸上 → 第二支试管 →（回收）漏斗 → 烘箱 → 秤盘 → 第三支试管
  const jarMouth: V3 = [JARX, 0.1, -0.16]
  const scoop: V3 | null = b.busy && tb < 2 ? liftPath(jarMouth, [PANP[0], PANP[1] + 0.012, PANP[2]], HIGH, seg(tb, 0.2, 1.7)) : null
  const paper: { p: V3; tilt: number; load: number } | null =
    b.busy && tb >= 1.7 && tb < 4.9 ? { p: liftPath(PANP, mouthOf(1), HIGH, seg(tb, 2.6, 3.9)), tilt: ease(seg(tb, 3.9, 4.3)), load: tb < 4.2 ? 1 : 0 }
    : c.busy && tc >= 3 && tc < 6 ? { p: liftPath(FUN, DOOR, HIGH, seg(tc, 3.2, 4.4)), tilt: 0, load: tc < 4.5 ? 1 : 0 }
    : c.busy && tc >= 6 && tc < 10.4 ? { p: tc < 8.6 ? liftPath(DOOR, PANP, HIGH, seg(tc, 6, 7.2)) : liftPath(PANP, mouthOf(2), HIGH, seg(tc, 8.6, 9.6)), tilt: ease(seg(tc, 9.6, 10)), load: tc < 9.9 ? 1 : 0 }
    : null
  const onPan = (b.busy && tb > 1.7 && tb < 2.7) || (c.busy && tc > 7.2 && tc < 8.6)
  const reading = onPan ? catalystMass(MNO2).toFixed(3) : '0.000'
  // 三支试管：有没有二氧化锰、溶液多少、冒泡多快
  const inB = (b.busy && tb > 4.2) || (step >= 2 && !(c.busy && tc > 1.8) && step < 3), inC = (c.busy && tc > 9.9) || step >= 3
  const fillB = c.busy ? FILL * (1 - seg(tc, 1.2, 2.4)) : step >= 3 ? 0 : FILL
  const rate = [bubbleRate(false), inB && fillB > 0.1 ? bubbleRate(true) : bubbleRate(false), inC ? bubbleRate(true) : bubbleRate(false)]
  // 第二支试管倒进漏斗：提起、移到漏斗上方、倾倒、放回
  const tk = c.busy ? seg(tc, 0, 1.1) - seg(tc, 2.5, 3.4) : 0
  const tubeB: V3 = c.busy && tc < 3.4 ? liftPath([tubeX(1), TY, 0], [FX - 0.07, FILTER_TOP + 0.035, FILTER_Z], HIGH + 0.02, tk) : [tubeX(1), TY, 0]
  const pourB = c.busy ? ease(seg(tc, 1.0, 1.5)) - ease(seg(tc, 2.3, 2.7)) : 0
  const cake = c.busy ? (tc < 3.2 ? seg(tc, 1.4, 2.4) : 0) : 0
  const glow = c.busy ? ease(seg(tc, 4.4, 4.9)) - ease(seg(tc, 5.6, 6)) : 0
  // 带火星的木条：凑到某一支试管的管口
  const sp = (t: number, i: number, t0: number, t1: number): V3 => t < t1 ? liftPath(SPL, mouthOf(i), HIGH, seg(t, t0, t0 + 1.2)) : liftPath(mouthOf(i), SPL, HIGH, seg(t, t1, t1 + 1.1))
  const splint: V3 = a.busy ? sp(ta, 0, 0.3, 3.9) : b.busy && tb > 4.8 ? sp(tb, 1, 4.9, 7.8) : c.busy && tc > 9.9 ? sp(tc, 2, 10, 11.3) : SPL
  const holding = a.busy || (b.busy && tb > 4.8) || (c.busy && tc > 9.9)
  const fire = b.busy ? ease(seg(tb, 6.2, 6.6)) - ease(seg(tb, 7.9, 8.5)) : c.busy ? ease(seg(tc, 11.25, 11.6)) : 0

  const labels: Label[] = [
    { id: 'm', at: at(BX + 0.13, 0.2, PAN_Z), ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: onPan ? 1 : 0 }, children: <><small>二氧化锰</small>{reading} g</> },
    { id: 't1', at: at(tubeX(0), -0.012, 0.06), ax: 1, className: 'scene-name', children: '不加' },
    { id: 't2', at: at(tubeX(1), -0.012, 0.06), ax: 0.5, className: 'scene-name', children: '加' },
    { id: 't3', at: at(tubeX(2), -0.012, 0.06), ax: 0, className: 'scene-name', children: '加回收的' },
    { id: 'n1', at: at(RX, TY + TUBE.h + 0.04, 0), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '过氧化氢溶液' },
    { id: 'n2', at: at(FX, FILTER_TOP + 0.16, 0), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '过滤' },
    { id: 'n3', at: at(OX, 0.31, 0), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '烘箱' },
    { id: 'n4', at: at(JARX - 0.03, 0.115, -0.16), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '二氧化锰' },
  ]
  const black = <mesh position-y={u(0.012)} scale={[1, 1.5, 1]}><sphereGeometry args={[u(TUBE.r - 0.002), 14, 10]} /><meshStandardMaterial color="#17161a" roughness={1} /></mesh>
  return (
    <LabShell title="空气和氧气" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="三次对比"
      stage={<Place at="l6" labels={labels}>
        {/* 试管架和三支试管 */}
        <group position={at(RX, 0)}><TubeRack n={3} gap={GAP} /></group>
        {[0, 1, 2].map(i => { const p = i === 1 ? tubeB : [tubeX(i), TY, 0] as V3; return <group key={i} position={at(p[0], p[1], p[2])} rotation-z={i === 1 ? -1.75 * pourB : 0}>
          <TestTube fill={i === 1 ? fillB : FILL} color="#e2eef1" opacity={0.42} />
          {((i === 1 && inB) || (i === 2 && inC)) && black}
        </group> })}
        {[0, 1, 2].map(i => <Bubbles key={i} at={at(tubeX(i), TY + 0.014, 0)} top={u(FILL * TUBE.h - 0.02)} on={!(i === 1 && (c.busy || step >= 3))} rate={rate[i] * 70} r={u(0.0013)} spread={u(0.005)} speed={u(0.07)} seed={i + 2} />)}
        {/* 药品瓶 */}
        <group position={at(JARX, 0, -0.16)}><JarBottle label="二氧化锰" band="#3a3a3a" amount={0.55} solid={<Powder r={0.026} />} /></group>
        <group position={at(RX + 0.08, 0, -0.16)}><NarrowBottle label="过氧化氢" band="#2f6fb3" brown /></group>
        {/* 天平：秤盘上一张称量纸 */}
        <group position={at(BX, 0)}><Balance text={reading} /></group>
        {!paper && <group position={at(...PANP)}><Paper s={0.06} /></group>}
        {scoop && <group position={at(...scoop)} rotation={[0, 0, -0.9]}><Scoop load={1} /></group>}
        {paper && <group position={at(...paper.p)}>
          <group rotation-z={-1.1 * paper.tilt}><Paper s={0.06} /><Powder r={0.011} k={paper.load} /></group>
          {!onPan && <group position={[u(0.05), u(0.03), 0]} rotation={[0.1, 0, -1.2]}><Glove s={u(0.0056)} /></group>}
        </group>}
        {/* 过滤架、接滤液的小烧杯 */}
        <group position={at(FX, 0)}><FilterStand cake={cake} /></group>
        <group position={at(FX, 0, FILTER_Z)}><Beaker vol={100} fill={step >= 3 ? 0.45 : c.busy ? 0.45 * seg(tc, 1.5, 3.2) : 0} color="#e2eef1" opacity={0.4} marks={false} /></group>
        <Drips at={at(FX, 0.085, FILTER_Z)} drop={u(0.06)} on={c.busy && tc > 1.4 && tc < 3.4} every={0.35} r={u(0.0035)} />
        {c.busy && tc > 0.2 && tc < 3.2 && <group position={at(tubeB[0] + 0.03, tubeB[1] + 0.11, tubeB[2])} rotation={[0.2, 0, -1.3 - pourB]}><Glove s={u(0.0056)} /></group>}
        {/* 烘箱 */}
        <group position={at(OX, 0, -0.03)}><Oven glow={glow} /></group>
        {/* 带火星的木条 */}
        <group position={at(...splint)} rotation-z={holding ? -0.55 : -Math.PI / 2 + 0.05}>
          <Splint char={0.9} />
          <mesh position-y={u(0.002)}><sphereGeometry args={[u(0.0026), 10, 8]} /><meshBasicMaterial color={new THREE.Color(3.2, 0.9, 0.25)} toneMapped={false} /></mesh>
        </group>
        <Flame at={at(splint[0], splint[1] + 0.002, splint[2])} w={u(0.02)} h={u(0.045)} kind="wood" level={fire} seed={3} light={1} />
      </Place>}
      lesson={<LessonBlock no="6" title="二氧化锰为什么用不完" concept="它帮忙，但不被消耗" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在化学反应里能<b className="text-white">改变</b>其他物质的化学反应速率，而本身的<b className="text-white">质量和化学性质</b>在反应前后都没有发生变化的物质，叫做催化剂。催化剂在反应里起的作用叫催化作用。</p>
          <p className="mt-2">过氧化氢在常温下分解得很慢；加入二氧化锰以后迅速分解，放出氧气。二氧化锰是这个反应的催化剂。</p>
          <p className="mt-2 text-center text-[14px]">过氧化氢 <span className="text-white/60">—二氧化锰→</span> 水 + 氧气</p>
          <p className="mt-2">由一种反应物生成两种或两种以上其他物质的反应，叫做<b className="text-white">分解反应</b>，特点是“一变多”。</p>
          <p className="mt-2 text-[13px] text-white/60">这次实验用了 2.0 g 二氧化锰，是为了方便称量自己定的用量。催化剂是“改变”反应速率，有的催化剂是让反应变慢。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三次对比都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">催化剂改变反应速率，自己的质量和化学性质不变</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">不加二氧化锰，过氧化氢分解得很慢；加进去立刻冒出大量气泡。反应后回收的二氧化锰还是 2.000 g，再用一次照样有效。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">天平读数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{reading}<span className="ml-1 text-[15px] font-medium text-white/55">g</span></div>
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            {['第一支 · 不加二氧化锰', '第二支 · 加二氧化锰', '第三支 · 加回收的二氧化锰'].map((name, i) => { const r = i === 1 && (c.busy || step >= 3) ? 0 : rate[i]; return <div key={name}>
              <div className="flex justify-between text-[12.5px] text-white/55"><span>{name}</span><span>{r === 0 ? '已倒出过滤' : r > 0.5 ? '大量气泡' : '很少的气泡'}</span></div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#7fe3d4] transition-[width] duration-300" style={{ width: `${Math.round(r * 100)}%` }} /></div>
            </div> })}
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="m(反应前)" value={step >= 2 || (b.busy && tb > 1.7) ? MNO2.toFixed(3) : '—'} unit="g · 加入的二氧化锰" />
            <ParamTile symbol="m(反应后)" value={step >= 3 || (c.busy && tc > 7.2) ? catalystMass(MNO2).toFixed(3) : '—'} unit="g · 回收的二氧化锰" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'a'} pulse={next === 'a'} onClick={() => a.run()} disabled={busy}>不加二氧化锰</LabButton>
        <LabButton primary={next === 'b'} pulse={next === 'b'} onClick={() => b.run()} disabled={busy || step >= 2}>加 2.0 g</LabButton>
        <LabButton primary={next === 'c'} pulse={next === 'c'} onClick={() => c.run()} disabled={busy || step !== 2}>回收称量</LabButton>
      </>}
      extras={null}
    />
  )
}
