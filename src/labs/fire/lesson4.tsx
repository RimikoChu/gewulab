// 燃烧和灭火 · 第 4 课 燃烧的三个条件：训练场上的燃烧箱。箱里一垛木柴，门下一道风门，旁边一把点火枪。
// 三个条件都有时点火，木柴烧起来；拿走木柴、关上门和风门、不点火，各试一次，都烧不起来。可燃物、氧气、温度达到着火点，缺一不可。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Glove } from './gear'
import { BOX, BurnBox, WoodCrib } from './yardgear'
import { Blaze, Flame, Puffs, SMOKE } from './fx'
import { ease, lerp, seg, useRun } from './parts'
import { LACK_NAME, ROOM, SETUPS, WOOD_RANGE, triangle, type Lack, type Setup } from './physics'
import { M, YARD, Place, type V3 } from './world'

const { x: X0, z: Z0 } = YARD.box
const FLOOR = BOX.leg * M + 0.012 * M + 0.1 * M     // 炉箅子上面
const ORDER: Setup[] = ['all', 'fuel', 'air', 'heat']
const TASKS: Task[] = [
  { id: 'all', text: '三个条件都有：放好木柴、开着门，点火', note: '木柴烧起来了：可燃物、氧气、温度三个条件都有' },
  { id: 'fuel', text: '拿走木柴，再点火', note: '没有可燃物，点火枪一走，什么也烧不起来' },
  { id: 'air', text: '点着以后关上门和风门', note: '箱里的氧气用完，空气又进不来，火熄灭了' },
  { id: 'heat', text: '放好木柴、开着门，但不点火', note: '木柴一直是 20 °C，达不到着火点，不会自己烧起来' },
]
/** 点火的过程（s）：点火枪伸进去、打火、烧一会儿、收回；关门；等着看 */
const TT = { reach: [0, 1.2], spark: [1.2, 3.2], back: [3.2, 4.2], close: [4.4, 5.4], end: 8.5 } as const

/** 火三角：三条边各是一个条件，缺的那条边是暗的 */
function TriangleView({ lack, burn, on }: { lack: Lack | null; burn: boolean; on: boolean }) {
  const P = { a: [130, 14], b: [24, 150], c: [236, 150] }
  const side = (k: Lack, p: number[], q: number[], tx: number, ty: number, anchor: 'start' | 'middle' | 'end') => {
    const ok = on && lack !== k
    return <g key={k}><line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={ok ? '#ffb547' : '#55606a'} strokeWidth={ok ? 6 : 4} strokeLinecap="round" strokeDasharray={on && lack === k ? '6 8' : undefined} />
      <text x={tx} y={ty} textAnchor={anchor} fontSize={13} fontWeight={700} fill={ok ? '#ffd08a' : '#8a96a2'}>{LACK_NAME[k]}</text></g>
  }
  return <svg viewBox="0 0 260 176" className="mt-2 w-full rounded-lg" role="img" aria-label="燃烧的三个条件">
    <rect width={260} height={176} fill="#182026" />
    {side('fuel', P.b, P.c, 130, 170, 'middle')}
    {side('oxygen', P.a, P.b, 66, 78, 'end')}
    {side('heat', P.a, P.c, 196, 78, 'start')}
    <text x={130} y={112} textAnchor="middle" fontSize={20} fontWeight={800} fill={on ? (burn ? '#ffb547' : '#cfd9df') : '#55606a'}>{on ? (burn ? '燃烧' : '不燃烧') : '?'}</text>
  </svg>
}

export default function Lesson4() {
  const [setup, setSetup] = useState<Setup>('all')
  const [rows, setRows] = useState<Partial<Record<Setup, boolean>>>({})
  const T = useTasks('gewu:fire:4', TASKS)
  const run = useRun(TT.end, () => { setRows(r => ({ ...r, [setup]: triangle(setup).burn })); T.check(id => id === setup) })
  const c = SETUPS[setup], res = triangle(setup), t = run.t
  const doneRun = rows[setup] !== undefined && !run.busy
  // 门和风门：只有“关上风门”这一项，点着以后才关上
  const shut = setup === 'air' && (run.busy || doneRun) ? ease(seg(t, TT.close[0], TT.close[1])) : 0
  const door = useSlide(shut, 1.6), damper = door
  // 火：点火枪打着火以后，木柴慢慢烧旺；关上门以后慢慢熄灭
  const ignite = c.fuel && c.lit && (run.busy || doneRun) ? ease(seg(t, TT.spark[0] + 0.8, TT.back[1] + 0.5)) : 0
  const choke = setup === 'air' ? 1 - seg(t, TT.close[1], TT.end - 0.6) : 1
  const level = ignite * choke
  const gun = c.lit && run.busy ? seg(t, TT.reach[0], TT.reach[1]) - seg(t, TT.back[0], TT.back[1]) : 0
  const gunFlame = c.lit && run.busy && t > TT.spark[0] && t < TT.spark[1]
  const pick = (k: Setup) => { if (run.busy) return; run.snap(0); setSetup(k) }
  const resetAll = () => { run.snap(0); setSetup('all'); setRows({}); T.reset() }
  const task = T.current, want = (task?.id as Setup | undefined) ?? null
  const { hint, next }: { hint: string; next: 'go' | 'setup' | null } = !task ? { hint: '可燃物、氧气、温度达到着火点：三个条件同时具备，才能燃烧。', next: null }
    : run.busy ? { hint: setup === 'heat' ? '不点火，等一会儿，看木柴会不会自己烧起来…' : t < TT.back[1] ? '点火枪伸进箱里打火…' : setup === 'air' ? (t < TT.close[1] ? '关上门和风门…' : '空气进不来，火越来越小…') : '看箱里…', next: null }
    : setup !== want ? { hint: `把条件换成“${SETUPS[want!].name}”`, next: 'setup' }
    : { hint: setup === 'heat' ? '按“不点火，等一会儿”' : `按“点火”${setup === 'air' ? '：点着以后会关上门和风门' : ''}`, next: 'go' }
  const top = BOX.leg * M + BOX.h * M
  const labels: Label[] = [
    ...(doneRun ? [{ id: 'r', at: [X0 + BOX.w * M / 2 + 0.3, BOX.leg * M + BOX.h * M * 0.7, Z0 + BOX.d * M / 2] as V3, className: 'scene-tag key -translate-y-1/2', children: <><small>{SETUPS[setup].name}</small>{res.burn ? '燃烧' : '不燃烧'}</> }] : []),
    ...(setup === 'heat' && (run.busy || doneRun) ? [{ id: 'tmp', at: [X0 - 0.2, FLOOR + 0.25 * M, Z0 + BOX.d * M / 2 + 0.3] as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>木柴</small>{ROOM} °C</> }] : []),
    { id: 'n1', at: [X0 - BOX.w * M / 2 - 0.3, top - 0.6, Z0 + BOX.d * M / 2], ax: 1, name: true, className: 'scene-name', children: '燃烧箱' },
    { id: 'n2', at: [X0 - 0.6, BOX.leg * M + 0.15, Z0 + BOX.d * M / 2 + 0.6], ax: 1, name: true, className: 'scene-name', children: '风门' },
    { id: 'n3', at: [X0 + BOX.w * M * 0.3 + 0.5, top + 0.15 * M, Z0 + 1.2], name: true, className: 'scene-name', children: '点火枪' },
  ]
  // 点火枪：从箱子右前方伸进门里，枪口对着木柴
  const gunHome: V3 = [X0 + BOX.w * M * 0.3, top + 0.04 * M, Z0 + 1.2], gunIn: V3 = [X0 + 1.4, FLOOR + 0.18 * M, Z0 + 0.9]
  const gp: V3 = [lerp(gunHome[0], gunIn[0], ease(gun)), lerp(gunHome[1], gunIn[1], ease(gun)), lerp(gunHome[2], gunIn[2], ease(gun))]
  return (
    <LabShell title="燃烧和灭火" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="燃烧箱"
      stage={<Place at="l4" labels={labels}>
        <group position={[X0, 0, Z0]}><BurnBox door={door} damper={damper} /></group>
        {c.fuel && <group position={[X0, FLOOR, Z0]}><WoodCrib n={4} len={0.5} sec={0.055} char={Math.min(1, level * 0.7)} glow={level * 0.8} /></group>}
        <Blaze at={[X0, FLOOR + 0.05 * M, Z0]} w={0.32 * M} h={0.55 * M} spread={0.16 * M} kind="wood" level={level} n={6} light={30} seed={2} />
        <Puffs at={[X0 + BOX.w * M * 0.28, top + 0.8 * M, Z0 - BOX.d * M * 0.2]} on={level > 0.15 || (setup === 'air' && t > TT.close[1] && run.busy)} opt={SMOKE.dark(1.4)} seed={3} />
        {/* 点火枪：红色的枪柄，一根长长的不锈钢枪管；一只消防手套握着 */}
        <group position={gp} rotation-y={0.55}>
          <mesh position={[-0.2 * M, 0, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.007 * M, 0.007 * M, 0.3 * M, 12]} /><meshStandardMaterial color="#c9ccce" metalness={1} roughness={0.3} /></mesh>
          <mesh position={[-0.02 * M, -0.02 * M, 0]} castShadow><boxGeometry args={[0.1 * M, 0.05 * M, 0.03 * M]} /><meshPhysicalMaterial color="#c3281f" roughness={0.35} clearcoat={0.6} /></mesh>
          <mesh position={[0.02 * M, -0.07 * M, 0]} rotation-z={-0.3} castShadow><boxGeometry args={[0.035 * M, 0.09 * M, 0.028 * M]} /><meshPhysicalMaterial color="#c3281f" roughness={0.35} clearcoat={0.6} /></mesh>
          {run.busy && <group position={[0.02 * M, -0.065 * M, 0]} rotation={[0, 0, 0.3]}><group rotation-z={Math.PI / 2}><Glove kind="fire" s={0.009 * M} /></group></group>}
        </group>
        {gunFlame && <Flame at={[gp[0] - Math.cos(0.55) * 0.35 * M, gp[1] - 0.012 * M, gp[2] + Math.sin(0.55) * 0.35 * M]} w={0.03 * M} h={0.07 * M} kind="gas" light={2} seed={9} />}
      </Place>}
      lesson={<LessonBlock no="4" title="燃烧的三个条件" concept="可燃物、氧气、温度达到着火点，缺一不可" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>燃烧需要三个条件同时具备：</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>（1）可燃物</li>
            <li>（2）氧气（或空气）</li>
            <li>（3）达到燃烧所需的最低温度（着火点）</li>
          </ul>
          <p className="mt-3">少了哪一个，燃烧都不能发生。木材的着火点是 {WOOD_RANGE[0]}–{WOOD_RANGE[1]} °C，放着不点火，木柴只有室温，不会自己烧起来。</p>
          <p className="mt-3 text-[13.5px] text-white/65">反过来想：灭火，就是去掉其中的一个条件。下一课就做这件事。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种情况都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">可燃物、氧气、温度达到着火点，三个条件缺一不可</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">只有三个都有的那一次烧起来了。拿走木柴、隔绝空气、不点火，都烧不起来。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SETUPS[setup].name}</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight">{doneRun ? (res.burn ? '燃烧' : '不燃烧') : '—'}</div>
            {doneRun && res.lack && <div className="mt-1.5 text-[13px] text-white/60">缺少：{LACK_NAME[res.lack]}</div>}
          </div>
          <TriangleView lack={res.lack} burn={res.burn} on={doneRun} />
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          <ul className="mt-2 grid grid-cols-2 gap-1.5 text-[13.5px]">
            {ORDER.map(k => <li key={k} className={`rounded-lg px-2.5 py-1.5 ${k === setup ? 'bg-white/12' : 'bg-white/[0.05]'}`}><span className="text-white/70">{SETUPS[k].name}</span><b className={`float-right ${rows[k] ? 'text-[#ffb547]' : ''}`}>{rows[k] === undefined ? '—' : rows[k] ? '燃烧' : '不燃烧'}</b></li>)}
          </ul>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={() => run.run()} disabled={run.busy || doneRun}>{setup === 'heat' ? '不点火，等一会儿' : '点火'}</LabButton>
      </>}
      extras={
        <Control label="条件">
          <Segmented label="条件" pulse={next === 'setup'} want={next === 'setup' ? want : null} disabled={run.busy} value={setup} onChange={k => pick(k as Setup)} options={ORDER.map(k => ({ value: k, label: SETUPS[k].name }))} />
        </Control>
      }
    />
  )
}
