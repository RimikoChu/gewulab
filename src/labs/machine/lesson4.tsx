// 简单机械 · 第 4 课 杠杆的分类：材料场上的手推车、铁锹，试验室里的托盘天平。每一件都用一用，
// 看它的支点、动力和阻力在哪，比一比动力臂和阻力臂谁长：动力臂长的省力但费距离，短的费力但省距离，一样长的既不省力也不省距离。
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { ActionLine, Arm, C1, C2, CO, Force, Pivot, Seg } from './marks'
import { Glove, Place, ease, useRun } from './parts'
import { TOOLS, round, toolUse, type Tool } from './physics'
import { BAL, BARROW, MiniBalance, Shovel, TestCube, Wheelbarrow } from './tools'
import { BZ, M, ST, TOP, YARD, type SpotKey, type V3 } from './world'

const ORDER: Tool[] = ['barrow', 'shovel', 'balance']
const cm = (x: number) => round(x * 100, 1)
const TASKS: Task[] = ORDER.map(t => { const T = TOOLS[t], u = toolUse(t); return { id: t, text: `${T.name}：用一用，比一比两个力臂`, note: `动力臂 ${cm(T.l1)} cm，阻力臂 ${cm(T.l2)} cm：${u.kind}${t === 'balance' ? '，不省力也不费力' : t === 'barrow' ? `，手抬高 ${cm(T.hand)} cm，砖只升高 ${cm(u.load)} cm` : `，手抬高 ${cm(T.hand)} cm，锹头升高 ${cm(u.load)} cm`}` } })
const SPOTS: Record<Tool, SpotKey> = { barrow: 'barrow', shovel: 'shovel', balance: 'bal' }
/** 每件工具的支点在画面里的位置、力的箭头每 1 N 多长、标记画在哪个 z 上 */
const RIG: Record<Tool, { O: V3; per: number; z: number; s: number }> = {
  barrow: { O: [YARD.barrow.x, BARROW.r * M, YARD.barrow.z], per: 0.0019, z: YARD.barrow.z + BARROW.half * M + 0.4, s: 0.22 },
  shovel: { O: [YARD.shovel.x, 0.95 * M, YARD.shovel.z], per: 0.012, z: YARD.shovel.z + 0.6, s: 0.2 },
  balance: { O: [ST.bal, TOP + BAL.pivot * M, BZ + 0.4], per: 0.5, z: BZ + 0.4 + 0.3, s: 0.06 },
}
/** 用一用的那一下：抬起、停一停、放下（0 到 1），返回此刻抬起了几成 */
const lift = (k: number) => k < 0.4 ? ease(k / 0.4) : k < 0.6 ? 1 : 1 - ease((k - 0.6) / 0.4)

export default function Lesson4() {
  const [tool, setTool] = useState<Tool>('barrow')
  const [used, setUsed] = useState<Tool[]>([])
  const T = useTasks('gewu:machine:4', TASKS)
  const run = useRun(3.4, () => { const next = used.includes(tool) ? used : [...used, tool]; setUsed(next); T.check(id => next.includes(id as Tool)) })
  const angle = useRef(0), beam = useRef(0), kick = useRef(0)
  const Tl = TOOLS[tool], u = toolUse(tool), up = lift(run.k)
  // 抬起的角度：手抬高 hand，绕支点转过 asin(hand / l1)
  const a = Math.asin(Tl.hand / Tl.l1) * up
  angle.current = a
  const go = () => { if (run.busy) return; if (tool === 'balance') kick.current = 0.5; run.snap(0); run.run() }
  const pick = (t: Tool) => { if (run.busy) return; setTool(t); run.snap(0) }
  const resetAll = () => { setTool('barrow'); setUsed([]); run.snap(0); T.reset() }
  const seen = used.includes(tool) && !run.busy
  const task = T.current
  const { hint, next }: { hint: string; next: 'tool' | 'use' | null } = !task ? { hint: '动力臂长的省力费距离，短的费力省距离，一样长的等臂。', next: null }
    : run.busy ? { hint: tool === 'balance' ? '横梁摆几下，停在水平位置…' : '手抬起来，看手和重物各移动了多远…', next: null }
    : task.id !== tool && used.includes(tool) ? { hint: `${Tl.name}是${u.kind}。下一件：换成“${TOOLS[task.id as Tool].name}”`, next: 'tool' }
    : task.id !== tool ? { hint: `换成“${TOOLS[task.id as Tool].name}”`, next: 'tool' }
    : { hint: `按“用一用”：看${Tl.name}的支点、动力和阻力`, next: 'use' }
  // 支点、力的作用点（以支点为原点，m）：动力和阻力都竖直，作用点的水平距离就是力臂
  const R = RIG[tool], P = (x: number, y: number): V3 => [R.O[0] + x * M, R.O[1] + y * M, R.z]
  const pts = tool === 'barrow' ? { A1: [BARROW.grip, 0.16], A2: [Tl.l2, 0.1], d1: 1 } : tool === 'shovel' ? { A1: [Tl.l1, 0], A2: [Tl.l2, 0], d1: 1 } : { A1: [BAL.arm, 0], A2: [-BAL.arm, 0], d1: -1 }
  const O = P(0, 0), A1 = P(pts.A1[0], pts.A1[1]), A2 = P(pts.A2[0], pts.A2[1])
  const F1 = u.F1, F2 = Tl.F2
  const labels: Label[] = [
    ...(seen ? [
      { id: 'O', at: [O[0], O[1] - R.s * 1.6, R.z] as V3, ax: 0.5, className: 'force-tag', style: { color: CO }, children: 'O' },
      { id: 'F1', at: [A1[0] - R.s * 1.2, A1[1] + pts.d1 * F1 * R.per * 0.8, R.z] as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>动力 F₁</small>{round(F1, 1)} N</> },
      { id: 'F2', at: [A2[0] - R.s * 1.2, A2[1] - F2 * R.per * 0.7, R.z] as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>阻力 F₂</small>{round(F2, 1)} N</> },
      { id: 'l1', at: [(O[0] + A1[0]) / 2, O[1] + (tool === 'balance' ? -1 : -1) * R.s * 2.4, R.z] as V3, ax: 0.5, className: 'force-tag', style: { color: C1 }, children: `l₁ = ${cm(Tl.l1)} cm` },
      { id: 'l2', at: [(O[0] + A2[0]) / 2, O[1] + R.s * 1.4, R.z] as V3, ax: 0.5, className: 'force-tag -translate-y-full', style: { color: C2 }, children: `l₂ = ${cm(Tl.l2)} cm` },
    ] : []),
    ...(tool !== 'balance' && used.includes(tool) && !run.busy ? [
      { id: 's1', at: P(pts.A1[0] + (tool === 'shovel' ? 0.1 : -0.06), pts.A1[1] + Tl.hand / 2 - (tool === 'shovel' ? 0.12 : -0.06)), ax: tool === 'shovel' ? 0 : 1, className: 'scene-tag -translate-y-1/2', children: <><small>手抬高</small>{cm(Tl.hand)} cm</> },
      { id: 's2', at: P(pts.A2[0] - 0.06, pts.A2[1] + u.load / 2 + (tool === 'shovel' ? 0.08 : 0.25)), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>{tool === 'barrow' ? '砖升高' : '锹头升高'}</small>{cm(u.load)} cm</> },
    ] : []),
    { id: 'n', at: tool === 'balance' ? [ST.bal, TOP + 0.05, BZ + 1.1] : tool === 'barrow' ? [YARD.barrow.x + 3, 0.2, YARD.barrow.z + 2.5] : [YARD.shovel.x + 2, 0.2, YARD.shovel.z + 2], ax: 0.5, name: true, className: 'scene-name', children: Tl.name },
  ]
  return (
    <LabShell title="简单机械" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={Tl.name}
      stage={<Place at={SPOTS[tool]} labels={labels}>
        {/* 手推车：轮轴是支点，砖的重力是阻力，手抬车把 */}
        <group position={RIG.barrow.O}>
          <Wheelbarrow tilt={tool === 'barrow' ? angle : ZERO}>
            {[-1, 1].map(k => <group key={k} position={[(BARROW.grip - 0.05) * M, 0.155 * M, k * BARROW.half * M]}><Glove /></group>)}
          </Wheelbarrow>
        </group>
        {/* 铁锹：后手握住锹把顶端当支点，前手往上抬 */}
        <group position={RIG.shovel.O}>
          <Shovel tilt={tool === 'shovel' ? angle : ZERO}>
            <Glove />
            <group position={[TOOLS.shovel.l1 * M, 0, 0]} rotation-x={Math.PI}><Glove /></group>
          </Shovel>
        </group>
        {/* 托盘天平和几块混凝土试块 */}
        <Swing kick={kick} out={beam} />
        <group position={[ST.bal, TOP, BZ + 0.4]}><MiniBalance th={beam} /></group>
        {[[-2.6, -1.4], [-3.4, -1.0], [2.8, -1.3], [3.5, -0.9]].map(([x, z], i) => <group key={i} position={[ST.bal + x, TOP, BZ + z]} rotation-y={i * 0.4}><TestCube /></group>)}
        {seen && <>
          <Pivot at={O} s={R.s * 0.55} />
          <Force from={A1} dir={[0, pts.d1]} len={F1 * R.per} color={C1} thick={R.s * 1.6} />
          <Force from={A2} dir={[0, -1]} len={F2 * R.per} color={C2} thick={R.s * 1.6} />
          <ActionLine A={A1} F={[A1[0], O[1], R.z]} dir={[0, 1]} color={C1} extra={R.s * 0.8} r={R.s * 0.05} seg={R.s * 0.6} />
          <ActionLine A={A2} F={[A2[0], O[1], R.z]} dir={[0, 1]} color={C2} extra={R.s * 0.8} r={R.s * 0.05} seg={R.s * 0.6} />
          <Arm O={[O[0], O[1] - R.s * 1.2, R.z]} F={[A1[0], O[1] - R.s * 1.2, R.z]} line={[0, 1]} color={C1} s={R.s} r={R.s * 0.08} />
          <Arm O={[O[0], O[1] + R.s * 0.9, R.z]} F={[A2[0], O[1] + R.s * 0.9, R.z]} line={[0, 1]} color={C2} s={R.s} r={R.s * 0.08} />
        </>}
        {tool !== 'balance' && used.includes(tool) && !run.busy && <>
          <Seg a={P(pts.A1[0] + 0.05, pts.A1[1])} b={P(pts.A1[0] + 0.05, pts.A1[1] + Tl.hand)} color="#ffe9a8" r={0.02} />
          <Seg a={P(pts.A2[0] + 0.05, pts.A2[1] + (tool === 'shovel' ? 0.06 : 0.2))} b={P(pts.A2[0] + 0.05, pts.A2[1] + (tool === 'shovel' ? 0.06 : 0.2) + u.load)} color="#ffe9a8" r={0.02} />
        </>}
      </Place>}
      lesson={<LessonBlock no="4" title="杠杆的分类" concept="省力杠杆费距离，费力杠杆省距离" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>由 F₁l₁ = F₂l₂ 可知：</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">省力杠杆</b>：l₁ &gt; l₂，F₁ &lt; F₂。省了力，动力作用点却要多移动一段距离。手推车、撬棍、钢丝钳都是</li>
            <li><b className="text-white">费力杠杆</b>：l₁ &lt; l₂，F₁ &gt; F₂。费了力，却省了距离：手动一点，另一头动得多。铁锹、筷子、钓鱼竿都是</li>
            <li><b className="text-white">等臂杠杆</b>：l₁ = l₂，F₁ = F₂。不省力也不费力，天平就是</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">既省力又省距离的杠杆是没有的。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三件工具都用过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">省力的费距离，费力的省距离；没有既省力又省距离的杠杆</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">手推车是省力杠杆，铁锹是费力杠杆，天平是等臂杠杆。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{Tl.name}是</div>
            <div className="mt-1 text-[34px] leading-tight font-bold tracking-tight">{seen ? u.kind : '—'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="l₁" value={`${cm(Tl.l1)} cm`} unit="动力臂" />
            <ParamTile symbol="l₂" value={`${cm(Tl.l2)} cm`} unit="阻力臂" />
            <ParamTile symbol="F₂" value={`${Tl.F2} N`} unit="阻力" />
            <ParamTile symbol="F₁" value={seen ? `${round(F1, 1)} N` : '—'} unit="F₁ = F₂l₂ ÷ l₁" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">比一比</h2>
          <table className="mt-2 w-full text-center text-[13px] tabular-nums">
            <thead><tr className="text-white/55"><th className="pb-1 font-medium">工具</th><th className="pb-1 font-medium">l₁ 和 l₂</th><th className="pb-1 font-medium">类别</th></tr></thead>
            <tbody>{ORDER.map(t => { const on = used.includes(t), T2 = TOOLS[t]; return <tr key={t} className="bg-white/[0.04]"><td className="rounded-l-lg py-1.5 text-white/70">{T2.name}</td><td>{on ? `${cm(T2.l1)} ${T2.l1 > T2.l2 ? '>' : T2.l1 < T2.l2 ? '<' : '='} ${cm(T2.l2)}` : '—'}</td><td className="rounded-r-lg font-semibold">{on ? toolUse(t).kind : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'use'} onClick={go} disabled={run.busy}>用一用</LabButton>
      </>}
      extras={
        <Control label="工具">
          <Segmented label="工具" pulse={next === 'tool'} want={next === 'tool' ? task!.id as Tool : null} disabled={run.busy} value={tool} onChange={pick} options={ORDER.map(t => ({ value: t, label: TOOLS[t].name }))} />
        </Control>
      }
    />
  )
}
const ZERO = { current: 0 }
/** 天平：碰一下，横梁摆几下；两边一样重、两臂一样长，最后停在水平位置 */
function Swing({ kick, out }: { kick: React.RefObject<number>; out: React.RefObject<number> }) {
  const s = useRef({ th: 0, w: 0 })
  useFrame((_, d) => {
    const q = s.current, dt = Math.min(d, 1 / 30)
    if (kick.current) { q.w += kick.current; kick.current = 0 }
    q.w += (-36 * q.th - 1.2 * q.w) * dt; q.th += q.w * dt; out.current = q.th
  })
  return null
}
