// 简单机械 · 拓展课：三个工地上的小专题。塔吊为什么要配重（把塔吊看成绕塔身转的杠杆）；
// 脚手架上的手摇绞车（轮轴：轮半径大、轴半径小，省力但手要多走路）；实验台上的斜面（省力，但机械效率小于 1）。
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, Rod, disc, lathe, shell, useTasks, type Label, type RY } from '@/lab-kit'
import { SpringScale, ringAt } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Arm, C1, C2, Force, Pivot, Seg } from './marks'
import { Glove, Place, useRun } from './parts'
import { CRANE, INCLINE, WINCH, craneMoments, craneReach, incline, pct, round, sci, weightOf, winchForce, winchTurn } from './physics'
import { BZ, M, ST, TC, TOP, U, YARD, trolleyX, type V3 } from './world'

type Sub = 'crane' | 'winch' | 'ramp'
const SUBS: Record<Sub, { name: string; button: string; note: string }> = {
  crane: { name: '塔吊的配重', button: '吊起钢筋往外开', note: `吊 ${CRANE.load / 1000} t 的钢筋，最远只能开到离塔身 ${craneReach()} m：再往外，吊重 × 幅度就超过配重 × 配重臂了` },
  winch: { name: '手摇绞车', button: '摇一圈', note: `轮半径 ${WINCH.R * 100} cm、轴半径 ${WINCH.r * 100} cm，拉力只要 ${winchForce()} N；手走 ${round(winchTurn().hand, 2)} m，桶才升高 ${round(winchTurn().rise, 2)} m` },
  ramp: { name: '斜面', button: '把小车拉上去', note: `拉力 ${incline().F} N，比小车重 ${INCLINE.G} N 小；有摩擦，机械效率 ${pct(incline().eta)}` },
}
const ORDER: Sub[] = ['crane', 'winch', 'ramp']
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：按“${SUBS[k].button}”`, note: SUBS[k].note }))
const AT: Record<Sub, 'crane' | 'winch' | 'inc'> = { crane: 'crane', winch: 'winch', ramp: 'inc' }

// ---------- 手摇绞车和砂浆桶 ----------
const W0: V3 = [YARD.winch.x, 12.6, YARD.winch.z + 7.4]           // 绞车的轴心（画面单位）：伸出脚手架外沿，绳子直落到地上的桶
const m = (p: RY[]): RY[] => p.map(([r, y]) => [r * M, y * M])
const DRUM = lathe(m([[0.03, -0.14], [0.13, -0.14], [0.13, -0.12], [WINCH.r, -0.11], [WINCH.r, 0.11], [0.13, 0.12], [0.13, 0.14], [0.03, 0.14]]), { segs: 40, closed: true }); DRUM.rotateX(Math.PI / 2)
const BUCKET = shell(m([[0, 0], [0.13, 0], [0.15, 0.01], [0.17, 0.26], [0.18, 0.27]]), 0.006 * M, { segs: 40 })
const BAIL = new THREE.TorusGeometry(0.18 * M, 0.006 * M, 8, 32, Math.PI)
/** 绞车：两块钢板夹着轴，轴上一只卷绳的鼓筒，前端一根摇把；th 是摇把转过的角度。原点在轴心，轴朝 +z */
function Winch({ th }: { th: React.RefObject<number> }) {
  const rot = useRef<THREE.Group>(null)
  useFrame(() => { if (rot.current) rot.current.rotation.z = th.current ?? 0 })
  const plate = <meshPhysicalMaterial color="#2f6fb3" roughness={0.4} clearcoat={0.5} />
  return <group>
    {/* 支架：前后两块立板，下面一块底板，用两只扣件卡在脚手架的横杆上 */}
    {[-0.17, 0.17].map(z => <RoundedBox key={z} args={[0.36 * M, 0.42 * M, 0.02 * M]} radius={0.01 * M} smoothness={2} position={[0, -0.1 * M, z * M]} castShadow>{plate}</RoundedBox>)}
    <RoundedBox args={[0.4 * M, 0.03 * M, 0.5 * M]} radius={0.008 * M} smoothness={2} position={[0, -0.32 * M, -0.05 * M]} castShadow>{plate}</RoundedBox>
    {[-0.12, 0.12].map(x => <mesh key={x} position={[x * M, -0.36 * M, -0.05 * M]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.028 * M, 0.028 * M, 0.5 * M, 12]} /><Metal kind="steel" grain="brushed" /></mesh>)}
    <group ref={rot}>
      <mesh geometry={DRUM} castShadow><Metal kind="steel" grain="turned" rough={0.4} /></mesh>
      {/* 鼓筒上绕着的几圈钢丝绳（转起来看得见） */}
      {[-0.08, -0.04, 0, 0.04].map(z => <mesh key={z} position={[0, 0, z * M]}><torusGeometry args={[(WINCH.r + 0.006) * M, 0.006 * M, 6, 32]} /><meshStandardMaterial color="#4a4d50" metalness={0.6} roughness={0.5} /></mesh>)}
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.02 * M, 0.02 * M, 0.5 * M, 12]} /><Metal kind="steel" /></mesh>
      {/* 摇把：一根扁钢臂，头上一只能转的木把手 */}
      <RoundedBox args={[WINCH.R * M, 0.04 * M, 0.02 * M]} radius={0.006 * M} smoothness={2} position={[WINCH.R / 2 * M, 0, 0.24 * M]} castShadow><Metal kind="steel" grain="brushed" rough={0.4} /></RoundedBox>
      <mesh position={[WINCH.R * M, 0, 0.32 * M]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.022 * M, 0.022 * M, 0.14 * M, 14]} /><meshStandardMaterial color="#8a5a30" roughness={0.6} /></mesh>
    </group>
  </group>
}

// ---------- 斜面和小车 ----------
const RX = ST.inc - 1.4, RZ = BZ + 0.4                              // 斜面底端（画面单位）
const ANG = Math.asin(INCLINE.h / INCLINE.L)
const WHEEL = disc(1.2 * U, 0.6 * U, { hole: 0.2 * U }); WHEEL.rotateX(Math.PI / 2)
/** 实验小车：铝车身、四只轮子，车上压着两块砝码。原点在车底面正中、贴着板面，车头朝 +x */
function Cart() {
  return <group>
    <RoundedBox args={[12 * U, 2.4 * U, 7 * U]} radius={0.012} smoothness={3} position={[0, 2.6 * U, 0]} castShadow><Metal kind="aluminum" grain="brushed" rough={0.45} /></RoundedBox>
    {[-3.6, 3.6].flatMap(x => [-3.9, 3.9].map(z => <mesh key={`${x}${z}`} geometry={WHEEL} position={[x * U, 1.2 * U, z * U]} castShadow><meshStandardMaterial color="#1b1d20" roughness={0.85} /></mesh>))}
    {[-2.2, 2.2].map(x => <mesh key={x} position={[x * U, 3.8 * U, 0]} castShadow><cylinderGeometry args={[2.2 * U, 2.2 * U, 1.8 * U, 28]} /><Metal kind="brass" grain="turned" /></mesh>)}
    <mesh position={[6.4 * U, 2.6 * U, 0]} rotation-y={Math.PI / 2}><torusGeometry args={[0.4 * U, 0.1 * U, 8, 18]} /><Metal kind="steel" /></mesh>
  </group>
}

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('crane')
  const [done, setDone] = useState<Sub[]>([])
  const T = useTasks('gewu:machine:x', TASKS)
  const finish = () => { const next = done.includes(sub) ? done : [...done, sub]; setDone(next); T.check(id => next.includes(id as Sub)) }
  const run = useRun(sub === 'crane' ? 6 : sub === 'winch' ? 4 : 3.2, finish)
  const go = () => { if (run.busy) return; run.snap(0); run.run() }
  const pick = (k: Sub) => { if (run.busy) return; setSub(k); run.snap(0) }
  const resetAll = () => { setSub('crane'); setDone([]); run.snap(0); T.reset() }
  const k = run.k, seen = done.includes(sub) && !run.busy
  // 塔吊：小车匀速往外开，开到配重刚好平衡的地方停下
  const r = sub === 'crane' ? CRANE.start + (craneReach() - CRANE.start) * k : CRANE.start, mo = craneMoments(r)
  // 绞车：摇把转过的角度、桶升高了多少（m）
  const turn = sub === 'winch' ? k : 0, th = useRef(0); th.current = -turn * Math.PI * 2
  const rise = winchTurn().rise * turn
  // 斜面：小车沿板走了多远（m）
  const along = sub === 'ramp' ? (INCLINE.L - 0.16) * k : 0
  const task = T.current
  const { hint, next }: { hint: string; next: 'sub' | 'go' | null } = !task ? { hint: '塔吊靠配重平衡，绞车是轮轴，斜面也省力——都离不开“省力就要多走距离”。', next: null }
    : run.busy ? { hint: sub === 'crane' ? '小车往外开，看吊重和配重的转动效果…' : sub === 'winch' ? '摇把转一圈，看手走了多远、桶升了多高…' : '匀速拉着小车沿斜面往上走…', next: null }
    : task.id !== sub ? { hint: `${done.includes(sub) ? '看完了。' : ''}换到“${SUBS[task.id as Sub].name}”`, next: 'sub' }
    : { hint: `按“${SUBS[sub].button}”`, next: 'go' }

  // ---------- 标签 ----------
  const yb = TC.h + 4.2, CW = TC.x + CRANE.counterArm * M
  const labels: Label[] = sub === 'crane' ? [
    { id: 'c1', at: [CW + 8, yb - 18, TC.z], className: 'scene-tag -translate-y-1/2', children: <><small>配重</small>{CRANE.counter / 1000} t</> },
    { id: 'c2', at: [trolleyX(r) - 14, 112, TC.z], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>吊重</small>{CRANE.load / 1000} t · 离塔身 {round(r, 1)} m</> },
    { id: 'c3', at: [(TC.x + CW) / 2, yb + 26, TC.z], ax: 0.5, className: 'force-tag -translate-y-full', style: { color: C2 }, children: `${CRANE.counterArm} m` },
    { id: 'c4', at: [(TC.x + trolleyX(r)) / 2, yb + 26, TC.z], ax: 0.5, className: 'force-tag -translate-y-full', style: { color: C1 }, children: `${round(r, 1)} m` },
  ] : sub === 'winch' ? [
    { id: 'w1', at: [W0[0] + WINCH.R * M + 0.6, W0[1] + 0.4, W0[2]], className: 'scene-tag -translate-y-1/2', children: <><small>F</small>{winchForce()} N</> },
    { id: 'w2', at: [W0[0] - WINCH.r * M - 0.5, 1.4 + rise * M, W0[2]], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>G</small>{WINCH.G} N</> },
    ...(seen ? [{ id: 'w3', at: [W0[0] + 2.4, W0[1] - 4.2, W0[2]] as V3, className: 'scene-tag key -translate-y-1/2', children: <><small>手走了</small>{round(winchTurn().hand, 2)} m<small className="ml-2">桶升高</small>{round(winchTurn().rise, 2)} m</> }] : []),
    { id: 'w4', at: [W0[0] + WINCH.R * M / 2, W0[1] - 0.7, W0[2] + 0.3 * M], ax: 0.5, className: 'force-tag', style: { color: C1 }, children: `R = ${WINCH.R * 100} cm` },
    { id: 'w5', at: [W0[0] - WINCH.r * M - 0.3, W0[1] + 0.5, W0[2] + 0.3 * M], ax: 1, className: 'force-tag -translate-y-1/2', style: { color: C2 }, children: `r = ${WINCH.r * 100} cm` },
  ] : [
    { id: 'r1', at: [RX + (INCLINE.L * Math.cos(ANG) * 100 + 4) * U, TOP + INCLINE.h * 100 * U / 2, RZ], className: 'force-tag -translate-y-1/2', style: { color: '#ffe9a8' }, children: `h = ${INCLINE.h * 100} cm` },
    { id: 'r2', at: [RX + INCLINE.L * Math.cos(ANG) * 50 * U - 0.2, TOP + INCLINE.h * 50 * U + 0.42, RZ], ax: 1, className: 'force-tag -translate-y-full', style: { color: '#ffe9a8' }, children: `L = ${INCLINE.L * 100} cm` },
    { id: 'r3', at: [RX + (along + 0.24) * Math.cos(ANG) * M + 0.5, TOP + ((along + 0.24) * Math.sin(ANG) + 0.08) * M + 0.4, RZ], className: 'scene-tag -translate-y-1/2', children: <><small>F</small>{seen || run.busy ? incline().F : '—'} N</> },
    { id: 'r4', at: [RX + (along + 0.06) * Math.cos(ANG) * M - 0.2, TOP + (along + 0.06) * Math.sin(ANG) * M - 0.25, RZ], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>G</small>{INCLINE.G} N</> },
  ]
  return (
    <LabShell title="简单机械" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={<Place at={AT[sub]} labels={labels} trolley={r}>
        {sub === 'crane' && <CraneMarks r={r} />}
        <WinchScene th={th} rise={rise} />
        {sub === 'winch' && !run.busy && <WinchMarks />}
        <RampScene along={along} F={sub === 'ramp' && (run.busy || seen) ? incline().F : 0} marks={sub === 'ramp'} />
      </Place>}
      lesson={<LessonBlock no="拓展" title="塔吊 · 轮轴 · 斜面" concept="省力的机械，都要多走距离" tasks={TASKS} done={T.done} current={task?.id}
        theory={sub === 'crane' ? <>
          <p>把塔吊看成一根绕塔身转动的杠杆：一边是吊着的东西，一边是平衡臂上的配重。</p>
          <p className="mt-3">吊重 × 幅度（吊钩离塔身的距离）不能超过配重 × 配重臂，否则塔吊会向起重臂一侧倾覆。所以吊得越远，能吊的越轻；司机室里有力矩限制器，超了会报警。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里没有算起重臂、平衡臂自己的重，只为看清杠杆的道理；真的塔吊要把它们都算进去。</p>
        </> : sub === 'winch' ? <>
          <p>由一个轮和一个轴组成、能绕共同的轴线转动的简单机械叫<b className="text-white">轮轴</b>。绞车的摇把转的圆是“轮”，卷绳的鼓筒是“轴”。</p>
          <p className="mt-2 text-center font-formula text-[18px] italic">F R = G r</p>
          <p className="mt-3">轮半径是轴半径的几倍，作用在轮上的力就是轴上的几分之一，但手要多走几倍的距离。方向盘、门把手、辘轳、螺丝刀都是轮轴。</p>
        </> : <>
          <p><b className="text-white">斜面</b>也是一种省力的机械：斜面越长越平缓，越省力，但要多走距离。不计摩擦时 F L = G h。</p>
          <p className="mt-3">实际有摩擦：有用功 W有 = G h，总功 W总 = F L，机械效率 η = W有 ÷ W总，总小于 1。盘山公路、螺丝钉上的螺纹，都是绕起来的斜面。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个专题都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">省力的机械都要多走距离，没有省功的机械</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">塔吊靠配重保持平衡；绞车是轮轴，手多走几倍路就省几倍力；斜面越平缓越省力，有摩擦时机械效率小于 1。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {sub === 'crane' ? <>
            <div className="text-center"><div className="text-[13px] text-white/60">小车离塔身</div><div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{round(r, 1)}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="G配 l配" value={`${sci(mo.counter)}`} unit={`N·m · ${weightOf(CRANE.counter) / 1e4}×10⁴ N × ${CRANE.counterArm} m`} />
              <ParamTile symbol="G吊 l吊" value={`${sci(round(mo.load, 0))}`} unit={`N·m · ${weightOf(CRANE.load) / 1e4}×10⁴ N × ${round(r, 1)} m`} />
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#ffb547]" style={{ width: `${Math.min(100, mo.load / mo.counter * 100)}%` }} /></div>
            <p className="mt-1.5 text-[12.5px] text-white/55">吊重的转动效果占配重的 {Math.round(mo.load / mo.counter * 100)}%</p>
          </> : sub === 'winch' ? <>
            <div className="text-center"><div className="text-[13px] text-white/60">摇把上要用的力</div><div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{winchForce()}<span className="ml-1 text-[15px] font-medium text-white/55">N</span></div><div className="mt-1.5 text-[13px] text-white/55">F = G r ÷ R</div></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="R" value={`${WINCH.R * 100} cm`} unit="轮半径 · 摇把" />
              <ParamTile symbol="r" value={`${WINCH.r * 100} cm`} unit="轴半径 · 鼓筒" />
              <ParamTile symbol="G" value={`${WINCH.G} N`} unit="一桶砂浆" />
              <ParamTile symbol="h" value={`${round(rise, 2)} m`} unit="桶升高" />
            </div>
          </> : <>
            <div className="text-center"><div className="text-[13px] text-white/60">斜面的机械效率</div><div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{seen ? pct(incline().eta) : '—'}</div></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="G" value={`${INCLINE.G} N`} unit="小车和砝码" />
              <ParamTile symbol="F" value={seen || run.busy ? `${incline().F} N` : '—'} unit="沿斜面匀速拉" />
              <ParamTile symbol="W有" value={seen ? `${round(incline().Wu, 2)} J` : '—'} unit={`G h = ${INCLINE.G} N × ${INCLINE.h} m`} />
              <ParamTile symbol="W总" value={seen ? `${round(incline().Wt, 2)} J` : '—'} unit={`F L = ${incline().F} N × ${INCLINE.L} m`} />
            </div>
            <p className="mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/70">不计摩擦时只要 {incline().ideal} N；多出来的 {round(incline().F - incline().ideal, 2)} N 用来克服摩擦。</p>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={go} disabled={run.busy}>{SUBS[sub].button}</LabButton>
      </>}
      extras={
        <Control label="专题">
          <Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} disabled={run.busy} value={sub} onChange={pick} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} />
        </Control>
      }
    />
  )
}

/** 塔吊上的示意：塔身中心当支点，配重和吊重两个向下的力，两段力臂画在起重臂上方 */
function CraneMarks({ r }: { r: number }) {
  const yb = TC.h + 4.2, z = TC.z + 14, CW = TC.x + CRANE.counterArm * M, per = 0.0011, y = yb + 18
  return <>
    <Pivot at={[TC.x, yb, z]} s={3.2} />
    <Force from={[CW, yb - 8, z]} dir={[0, -1]} len={weightOf(CRANE.counter) * per} color={C2} thick={28} />
    <Force from={[trolleyX(r), 104, z]} dir={[0, -1]} len={weightOf(CRANE.load) * per} color={C1} thick={28} />
    <Arm O={[TC.x, y, z]} F={[CW, y, z]} line={[0, -1]} color={C2} s={9} r={0.9} />
    <Arm O={[TC.x, y, z]} F={[trolleyX(r), y, z]} line={[0, -1]} color={C1} s={9} r={0.9} />
    <Seg a={[CW, y, z]} b={[CW, yb - 8, z]} color={C2} r={0.5} dash seg={4} opacity={0.7} />
    <Seg a={[trolleyX(r), y, z]} b={[trolleyX(r), yb - 2, z]} color={C1} r={0.5} dash seg={4} opacity={0.7} />
  </>
}

/** 绞车装在脚手架第一步架的外沿；钢丝绳从鼓筒左边直落下来，吊着地上的一只砂浆桶 */
function WinchScene({ th, rise }: { th: React.RefObject<number>; rise: number }) {
  const hand = useRef<THREE.Group>(null)
  useFrame(() => { const a = th.current ?? 0; hand.current?.position.set(W0[0] + Math.cos(a) * WINCH.R * M, W0[1] + Math.sin(a) * WINCH.R * M, W0[2] + 0.36 * M) })
  const by = rise * M, ropeX = W0[0] - WINCH.r * M, top = W0[1], bot = by + 0.3 * M + 0.9
  const conc = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 1 }), [])
  return <>
    <group position={W0}><Winch th={th} /></group>
    {/* 挑出去的支架：两根钢管从绞车底板伸回脚手架外排立杆，下面各一根斜撑 */}
    {[-0.75, 0.75].map(dx => <group key={dx}>
      <Rod from={[W0[0] + dx, W0[1] - 2.2, W0[2] + 1.2]} to={[W0[0] + dx, W0[1] - 2.2, -52.4]} r={0.15}><Metal kind="steel" grain="brushed" rough={0.45} /></Rod>
      <Rod from={[W0[0] + dx, W0[1] - 2.2, W0[2] + 0.6]} to={[W0[0] + dx * 0.3, W0[1] - 7, -52.4]} r={0.15}><Metal kind="steel" grain="brushed" rough={0.45} /></Rod>
    </group>)}
    <group ref={hand} rotation-y={Math.PI / 2}><Glove /></group>
    <mesh position={[ropeX, (top + bot) / 2, W0[2] - 0.08 * M]}><cylinderGeometry args={[0.006 * M, 0.006 * M, top - bot, 8]} /><meshStandardMaterial color="#3d4043" metalness={0.6} roughness={0.5} /></mesh>
    <group position={[ropeX, by, W0[2] - 0.08 * M]}>
      <mesh position={[0, 0.3 * M + 0.5, 0]}><torusGeometry args={[0.03 * M, 0.006 * M, 8, 16]} /><Metal kind="steel" /></mesh>
      <mesh geometry={BUCKET} castShadow receiveShadow><meshPhysicalMaterial color="#2b2d30" roughness={0.55} clearcoat={0.3} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.22 * M, 0]} material={conc}><cylinderGeometry args={[0.16 * M, 0.15 * M, 0.02 * M, 32]} /></mesh>
      <mesh geometry={BAIL} position={[0, 0.27 * M, 0]}><Metal kind="steel" /></mesh>
    </group>
  </>
}
function WinchMarks() {
  const z = W0[2] + 0.42 * M, O: V3 = [W0[0], W0[1], z]
  return <>
    <Pivot at={O} s={0.12} />
    <Arm O={O} F={[W0[0] + WINCH.R * M, W0[1], z]} line={[0, 1]} color={C1} s={0.2} r={0.02} />
    <Arm O={[W0[0], W0[1] + 0.5, z]} F={[W0[0] - WINCH.r * M, W0[1] + 0.5, z]} line={[0, -1]} color={C2} s={0.2} r={0.02} />
    <Force from={[W0[0] + WINCH.R * M, W0[1], z]} dir={[0, -1]} len={winchForce() * 0.03} color={C1} thick={0.5} />
    <Force from={[W0[0] - WINCH.r * M, W0[1] - 0.3, z]} dir={[0, -1]} len={WINCH.G * 0.03} color={C2} thick={0.5} />
  </>
}

/** 实验台上的斜面：一块木板一头垫高，小车被弹簧测力计沿板面往上拉 */
function RampScene({ along, F, marks }: { along: number; F: number; marks: boolean }) {
  const L = INCLINE.L * 100, h = INCLINE.h * 100, w = L * Math.cos(ANG)
  const force = useRef(F); force.current = F
  const board = useMemo(() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(w, h); s.lineTo(w, h - 1.6 / Math.cos(ANG)); s.lineTo(1.6 / Math.sin(ANG), 0); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 14, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2 }); g.translate(0, 0, -7); g.scale(U, U, U); return g }, [w, h])
  const c = Math.cos(ANG), s = Math.sin(ANG), x = (along + 0.06) * 100, cart: V3 = [RX + x * c * U, TOP + x * s * U, RZ]
  const hook: V3 = [cart[0] + (6.8 * c - 2.6 * s) * U, cart[1] + (6.8 * s + 2.6 * c) * U, RZ]
  return <>
    <mesh geometry={board} position={[RX, TOP, RZ]} castShadow receiveShadow><meshStandardMaterial color="#c49a62" roughness={0.6} /></mesh>
    <RoundedBox args={[6 * U, (h - 1.4) * U, 15 * U]} radius={0.01} smoothness={2} position={[RX + (w - 2.6) * U, TOP + (h - 1.4) / 2 * U, RZ]} castShadow receiveShadow><meshStandardMaterial color="#8a5f37" roughness={0.7} /></RoundedBox>
    <group position={cart} rotation-z={ANG}><Cart /></group>
    <group position={hook} rotation-z={ANG - Math.PI / 2}>
      <SpringScale force={force} />
      <group position={[0, ringAt(F) + 0.035, 0]}><Glove /></group>
    </group>
    {marks && <>
      <Seg a={[RX + w * U + 0.25, TOP, RZ + 0.5]} b={[RX + w * U + 0.25, TOP + h * U, RZ + 0.5]} color="#ffe9a8" r={0.012} />
      <Seg a={[RX - 0.15 * s, TOP + 0.15 * c + 0.05, RZ + 0.5]} b={[RX + w * U - 0.15 * s, TOP + h * U + 0.15 * c + 0.05, RZ + 0.5]} color="#ffe9a8" r={0.012} />
      {F > 0 && <Force from={[hook[0], hook[1], RZ + 0.5]} dir={[c, s]} len={F * 0.42} color={C1} thick={0.3} />}
      <Force from={[cart[0], cart[1] + 2.6 * U, RZ + 0.5]} dir={[0, -1]} len={INCLINE.G * 0.42} color={C2} thick={0.3} />
    </>}
  </>
}
