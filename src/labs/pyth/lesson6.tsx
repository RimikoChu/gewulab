// 勾股定理 · 第 6 课 在数轴上画出 √13：广场地上嵌着一条花岗石数轴，单位长度 1 m。
// 在数轴上 p 处立一根长 q 的垂线，绳子一头钉在原点，拉到垂线顶上（绳长就是斜边 √(p² + q²)），再绕着原点转下来，绳头落在数轴上的点就表示这个数。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { COL, Glove, Place, Rope, Strip, ease, onPlane, sideStyle, useRun } from './parts'
import { ROOTS, approx, numberLine, type RootKey } from './physics'
import { woodDark } from './mats'
import { AXIS, ST } from './world'

const KEYS = Object.keys(ROOTS) as RootKey[]
/** 数轴上原点的位置：刻在石条上的那条线 */
const O: [number, number, number] = [ST.l6.x, AXIS.y + 0.002, AXIS.z]
const at = onPlane(O, 1)
const TASKS: Task[] = KEYS.map(k => { const n = numberLine(k); return { id: k, text: `在数轴上画出 ${n.name}`, note: `${n.p}² + ${n.q}² = ${n.n2}，弧落在 ${n.name} ≈ ${approx(n.x)} 处` } })

export default function Lesson6() {
  const [root, setRoot] = useState<RootKey>('r2')
  const [stage, setStage] = useState(0)                   // 0 空，1 垂线立好，2 弧画好
  const [marks, setMarks] = useState<RootKey[]>([])
  const Tk = useTasks('gewu:pyth:6', TASKS)
  const perp = useRun(1.6, () => setStage(1))
  const arc = useRun(3.0, () => { setStage(2); const n = [...marks, root]; setMarks(n); Tk.check(id => n.includes(id as RootKey)) })
  const busy = perp.busy || arc.busy
  const n = numberLine(root)
  const pick = (k: RootKey) => { if (busy) return; setRoot(k); setStage(0); perp.snap(0); arc.snap(0) }
  const resetAll = () => { setRoot('r2'); setStage(0); setMarks([]); perp.snap(0); arc.snap(0); Tk.reset() }

  const task = Tk.current
  const { hint, next }: { hint: string; next: 'root' | 'perp' | 'arc' | null } = (() => {
    if (!task) return { hint: '√2、√5、√13 都在数轴上找到了：先拼一个斜边是它的直角三角形，再用圆规转下来。', next: null }
    if (perp.busy) return { hint: '立垂线…', next: null }
    if (arc.busy) return { hint: '绳子绕着原点转下来…', next: null }
    if (root !== task.id) return { hint: `换成画 ${numberLine(task.id as RootKey).name}`, next: 'root' }
    if (stage === 0) return { hint: `在数轴上 ${n.p} 处立一条长 ${n.q} 的垂线`, next: 'perp' }
    if (stage === 1) return { hint: '以原点为圆心、斜边为半径，拉着绳子画弧到数轴上', next: 'arc' }
    return { hint: `换成画 ${numberLine(task.id as RootKey).name}`, next: 'root' }
  })()

  // 垂线长出来；绳子从原点拉到垂线顶上，再绕原点转到数轴上
  const q = n.q * ease(perp.k), th0 = Math.atan2(n.q, n.p), th = th0 * (1 - ease(arc.k))
  const end: [number, number] = [n.x * Math.cos(th), n.x * Math.sin(th)]
  const showRope = stage >= 1 && !perp.busy
  const arcPts: [number, number, number][] = []
  if (arc.k > 0) for (let i = 0; i <= 40; i++) { const t = th0 - (th0 - th) * i / 40; arcPts.push(at(n.x * Math.cos(t), n.x * Math.sin(t), 0.004)) }
  const labels: Label[] = [
    ...(stage >= 1 || perp.busy ? [
      { id: 'p', at: at(n.p / 2, -0.42, 0.02), ax: 0.5, className: 'scene-tag -translate-y-1/2', style: sideStyle('a'), children: <><small style={{ color: '#fff' }}>p</small>{n.p}</> },
      { id: 'q', at: at(n.p + 0.12, q / 2, 0.02), ax: 0, className: 'scene-tag -translate-y-1/2', style: sideStyle('b'), children: <><small style={{ color: '#3a2600' }}>q</small>{n.q}</> },
    ] : []),
    ...(showRope && stage < 2 && !arc.busy ? [{ id: 'c', at: at(n.p / 2 - 0.25, n.q / 2 + 0.15, 0.02), ax: 1, className: 'scene-tag -translate-y-1/2', style: sideStyle('c'), children: <><small style={{ color: '#fff' }}>斜边</small>√({n.p}² + {n.q}²) = {n.name}</> }] : []),
    ...marks.map(k => { const m = numberLine(k); return { id: `m${k}`, at: at(m.x, 0.55 + (k === 'r5' ? 0.35 : 0), 0.02), ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: <>{m.name} ≈ {approx(m.x)}</> } }),
    { id: 'o', at: at(-0.15, 0.3, 0.02), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '原点 0' },
  ]
  return (
    <LabShell title="勾股定理" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel="画图"
      stage={<Place at="l6" labels={labels}>
        <group position={O}>
          {/* 原点上的木桩：绳子的一头拴在这里 */}
          <Peg />
          {/* p 段（蓝）、垂线（橙） */}
          {(stage >= 1 || perp.busy) && <>
            <Strip p={[0, 0]} q={[n.p, 0]} w={0.05} h={0.006} color={COL.a} glow />
            <Strip p={[n.p, 0]} q={[n.p, Math.max(0.001, q)]} w={0.05} h={0.006} color={COL.b} glow />
            <Strip p={[n.p, 0.16]} q={[n.p - 0.16, 0.16]} w={0.02} h={0.006} color="#fffbe8" glow />
            <Strip p={[n.p - 0.16, 0]} q={[n.p - 0.16, 0.16]} w={0.02} h={0.006} color="#fffbe8" glow />
            <group position={[n.p, 0, -q]}><Peg /></group>
          </>}
          {/* 画过的点：数轴上一面小旗 */}
          {marks.map(k => <group key={k} position={[numberLine(k).x, 0, 0]}><Flagpin /></group>)}
        </group>
        {/* 粉笔画的弧 */}
        {arcPts.length > 1 && <Rope pts={arcPts} r={0.014} color="#fffbe8" />}
        {/* 绳子：绿色的线绳，从原点拉到绳头；绳头一只手套捏着 */}
        {showRope && <Rope pts={[at(0, 0, 0.05), at(end[0], end[1], 0.05)]} r={0.012} color={COL.c} />}
        {showRope && stage < 2 && <group position={at(end[0], end[1], 0.03)} rotation-y={-th + Math.PI / 2}><Glove /></group>}
      </Place>}
      lesson={<LessonBlock no="6" title="在数轴上画出 √13" concept="斜边转到数轴上，就是 √(p² + q²)" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p>√13 是无理数，没法直接在尺子上找到。但 13 = 2² + 3²：两条直角边是 2 和 3 的直角三角形，斜边正好是 √13。</p>
          <p className="mt-3">画法：在数轴上 2 处作垂线，取长 3 的一段；连接原点和垂线的顶端，得到斜边；以原点为圆心、斜边为半径画弧，交数轴正半轴于一点，这一点表示 √13。</p>
          <p className="mt-3">√2 = √(1² + 1²)，√5 = √(2² + 1²) 也可以这样画。近似值保留两位小数：√2 ≈ 1.41，√5 ≈ 2.24，√13 ≈ 3.61。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">√2、√5、√13 都画在了数轴上：先找斜边是它的直角三角形，再画弧转下来</p>
        <p className="mt-1 text-[14px] text-white/70">1² + 1² = 2，2² + 1² = 5，2² + 3² = 13。每个无理数都对应数轴上的一个点。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">弧落在数轴上</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{stage === 2 ? `${n.name} ≈ ${approx(n.x)}` : '?'}</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol={<span style={{ color: COL.a }}>p</span>} value={String(n.p)} unit="数轴上" />
            <ParamTile symbol={<span style={{ color: COL.b }}>q</span>} value={String(n.q)} unit="垂线" />
            <ParamTile symbol={<span style={{ color: COL.c }}>斜边²</span>} value={stage >= 1 ? String(n.n2) : '—'} unit={`${n.p}² + ${n.q}²`} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">画出的点</h2>
          <table className="mt-1.5 w-full text-[14px] tabular-nums">
            <tbody>{KEYS.map(k => { const m = numberLine(k), on = marks.includes(k); return <tr key={k} className={on ? 'text-white' : 'text-white/30'}><td className="py-1">{m.p} 和 {m.q}</td><td>{m.p}² + {m.q}² = {m.n2}</td><td className="text-right">{on ? `${m.name} ≈ ${approx(m.x)}` : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'perp'} onClick={() => { if (stage === 0 && !busy) perp.run() }} disabled={busy || stage !== 0}>立垂线</LabButton>
        <LabButton primary pulse={next === 'arc'} onClick={() => { if (stage === 1 && !busy) arc.run() }} disabled={busy || stage !== 1}>拉绳画弧</LabButton>
      </>}
      extras={<Control label="画哪一个数"><Segmented label="画哪一个数" pulse={next === 'root'} want={next === 'root' ? task!.id as RootKey : null} disabled={busy} value={root} onChange={pick} options={KEYS.map(k => ({ value: k, label: numberLine(k).name }))} /></Control>}
    />
  )
}

/** 钉在地上的小木桩：方截面、削尖的头埋进砖缝，顶上一圈铁箍 */
function Peg() {
  const wood = woodDark()
  return <group>
    <mesh position={[0, 0.09, 0]} castShadow><boxGeometry args={[0.045, 0.18, 0.045]} /><meshStandardMaterial map={wood} roughness={0.8} /></mesh>
    <mesh position={[0, 0.17, 0]}><boxGeometry args={[0.05, 0.015, 0.05]} /><meshStandardMaterial color="#3a3d40" metalness={0.8} roughness={0.5} /></mesh>
  </group>
}
/** 数轴上的标记：一根细杆顶着一面小三角旗 */
function Flagpin() {
  return <group>
    <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.006, 0.006, 0.4, 8]} /><meshStandardMaterial color="#d8d8d8" metalness={0.8} roughness={0.3} /></mesh>
    <mesh position={[0.06, 0.34, 0]} rotation-z={-Math.PI / 2} castShadow><coneGeometry args={[0.05, 0.12, 3]} /><meshStandardMaterial color="#35c7b3" roughness={0.6} /></mesh>
  </group>
}
