// 简单机械 · 第 3 课 斜着拉：杠杆尺左边第 3 格挂 4 只钩码，弹簧测力计钩在左边第 6 格往上拉，让杠杆在水平位置平衡。
// 竖直拉、偏 30° 拉、偏 60° 拉各读一次：作用点没变，拉的方向一斜，力臂变短，拉力就变大。力臂从支点垂直画到拉力的作用线（要延长）上。
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { GRID, HookBox, Hooks, Lever, PIVOT_CM, SpringScale, holeShift, ringAt, type LeverLive } from './gear'
import { LESSONS, goLesson } from './lessons'
import { ActionLine, Arm, C1, C2, Force, Pivot } from './marks'
import { Glove, Place, useSettled } from './parts'
import { SLANT, armOf, hooksN, leverTilt, round, sideMoment, slantArm, slantForce, type Angle } from './physics'
import { LeverView, ScaleView, Table } from './views'
import { BZ, ST, TOP, U, type V3 } from './world'

const NAME: Record<Angle, string> = { 0: '竖直向上', 30: '偏 30°', 60: '偏 60°' }
const TASKS: Task[] = SLANT.angles.map(a => ({ id: `a${a}`, text: a === 0 ? '竖直向上拉，让杠杆在水平位置平衡，记下示数' : `把拉的方向偏离竖直 ${a}°，杠杆还在水平位置平衡时记下示数`, note: `力臂 ${round(slantArm(a) * 100, 1)} cm，拉力 ${slantForce(a).toFixed(2)} N${a ? '：方向一斜，力臂变短，拉力变大' : ''}` }))
const X = ST.l3, BASE: V3 = [X, TOP, BZ], PY = TOP + PIVOT_CM * U, HANG = SLANT.hang, AT = SLANT.pullAt
const W = hooksN(HANG.n)
/** 拉力箭头每 1 N 多长（画面单位） */
const PER = 0.62

/** 测力计和握着它的手套：挂钩钩在左边第 6 格的孔上，整支测力计顺着拉的方向斜过去 */
function Puller({ deg, F, live }: { deg: number; F: number; live: React.RefObject<LeverLive> }) {
  const g = useRef<THREE.Group>(null), hand = useRef<THREE.Group>(null), force = useRef(F); force.current = F
  useFrame(() => {
    const s = holeShift(-1, AT, live.current.th)
    g.current?.position.set(X - AT * GRID + s[0], PY + s[1], BZ + 0.06); if (g.current) g.current.rotation.z = deg * Math.PI / 180
    hand.current?.position.set(0, ringAt(force.current) + 0.04, 0)
  })
  return <group ref={g}>
    <SpringScale force={force} />
    <group ref={hand}><Glove /></group>
  </group>
}

export default function Lesson3() {
  const [deg, setDeg] = useState<Angle>(0)
  const [pulled, setPulled] = useState(false)
  const [rows, setRows] = useState<Angle[]>([])
  const T = useTasks('gewu:machine:3', TASKS)
  const live = useRef<LeverLive>({ th: 0 })
  const k = useSlide(pulled ? 1 : 0, 0.65), d = useSlide(deg, 22)
  const F = k * slantForce(d)                          // 此刻测力计的示数：按此刻的方向和拉到了几成算
  const tilt = leverTilt(sideMoment(HANG) - F * slantArm(d))
  const settled = useSettled(`${pulled}${deg}`, 2600), level = pulled && k >= 1 && d === deg && settled
  const done = rows.includes(deg)
  const record = () => { if (!level || done) return; const next = [...rows, deg]; setRows(next); T.check(id => next.includes(+id.slice(1) as Angle)) }
  const resetAll = () => { setDeg(0); setPulled(false); setRows([]); T.reset() }
  const task = T.current, want = task ? +task.id.slice(1) as Angle : null
  const { hint, next }: { hint: string; next: 'pull' | 'dir' | 'record' | null } = !task ? { hint: '方向越斜，力臂越短，拉力越大。', next: null }
    : !pulled ? { hint: '钩码让杠杆左端下沉。按“拉住测力计”，往上拉到杠杆水平', next: 'pull' }
    : k < 1 || d !== deg || !settled ? { hint: '杠杆尺慢慢回到水平位置…', next: null }
    : want !== null && deg !== want ? { hint: `${rows.length ? '记下了。' : ''}把拉的方向换成“${NAME[want]}”`, next: 'dir' }
    : { hint: `杠杆在水平位置平衡，测力计的示数是 ${F.toFixed(2)} N。按“记录读数”`, next: 'record' }
  // 力臂：支点到拉力作用线的垂足（以支点为原点，cm）
  const th = d * Math.PI / 180, A: [number, number] = [-AT * 5, 0], dir: [number, number] = [-Math.sin(th), Math.cos(th)]
  const a1 = armOf([0, 0], A, dir), O: V3 = [X, PY, BZ + 0.3]
  const P = (p: [number, number]): V3 => [X + p[0] * U, PY + p[1] * U, BZ + 0.3]
  const l1 = round(slantArm(d) * 100, 1)
  const labels: Label[] = [
    { id: 'F1', at: [P(A)[0] - Math.sin(th) * 1.25 - 0.18, PY + Math.cos(th) * 1.25, BZ], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>F₁</small>{F.toFixed(2)} N</> },
    { id: 'F2', at: [X - HANG.at * GRID - 0.25, PY - 1.25, BZ], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>F₂</small>{W} N</> },
    ...(level ? [
      { id: 'l1', at: d < 1 ? [X - AT * GRID / 2, PY + 0.95, BZ] as V3 : P([a1.foot[0] / 2 + 1.5, a1.foot[1] / 2 - 2.6]), ax: d < 1 ? 0.5 : 0, className: 'force-tag -translate-y-1/2', style: { color: C1 }, children: `l₁ = ${l1} cm` },
      { id: 'l2', at: [X - HANG.at * GRID / 2, PY + 0.55, BZ] as V3, ax: 0.5, className: 'force-tag -translate-y-1/2', style: { color: C2 }, children: `l₂ = ${HANG.at * 5} cm` },
    ] : []),
    { id: 'n1', at: [X + 1.2, PY - 1.6, BZ], name: true, className: 'scene-name', children: '杠杆尺 · 每格 5 cm' },
  ]
  return (
    <LabShell title="简单机械" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="弹簧测力计"
      stage={<Place at="l3" labels={labels}>
        <group position={BASE}><Lever tilt={tilt} live={live} /></group>
        <group position={[X + 3.0, TOP, BZ + 1.1]}><HookBox n={6} /></group>
        <HooksOn live={live} />
        <Puller deg={d} F={F} live={live} />
        {level && <>
          <Pivot at={O} s={0.07} />
          <Force from={P(A)} dir={dir} len={F * PER} color={C1} thick={0.32} />
          <Force from={[X - HANG.at * GRID, PY, BZ + 0.3]} dir={[0, -1]} len={W * PER} color={C2} thick={0.32} />
          {d > 0 && <ActionLine A={P(A)} F={P(a1.foot)} dir={dir} color={C1} extra={0.3} />}
          <Arm O={d < 1 ? [X, PY + 0.75, BZ + 0.3] : O} F={d < 1 ? [X - AT * GRID, PY + 0.75, BZ + 0.3] : P(a1.foot)} line={dir} color={C1} s={0.13} r={0.01} />
          <Arm O={[X, PY + 0.4, BZ + 0.3]} F={[X - HANG.at * GRID, PY + 0.4, BZ + 0.3]} line={[0, -1]} color={C2} s={0.12} r={0.01} />
        </>}
      </Place>}
      lesson={<LessonBlock no="3" title="用测力计斜着拉" concept="拉力方向变斜，力臂变短，拉力变大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">力臂</b>是支点到力的<b className="text-white">作用线</b>的距离，不是支点到作用点的距离。</p>
          <p className="mt-3">竖直向上拉时，拉力和水平的杠杆垂直，支点到第 6 格的距离就是力臂。斜着拉时，作用点没变，但要把拉力的作用线反向延长，再从支点向它作垂线，垂线段才是力臂：方向偏离竖直 θ，力臂就变成原来的 cos θ 倍，变短了。</p>
          <p className="mt-3">阻力和阻力臂都没变，F₂l₂ 不变；F₁l₁ 要和它相等，l₁ 变短，F₁ 就要变大。</p>
          <p className="mt-3 text-[13.5px] text-white/65">要用最小的力，就让力的方向和“支点到作用点的连线”垂直，这时力臂最长。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个方向都拉过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">方向越斜，力臂越短，拉力越大</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">力臂从 {round(slantArm(0) * 100, 1)} cm 变到 {round(slantArm(30) * 100, 1)} cm、{round(slantArm(60) * 100, 1)} cm，拉力从 {slantForce(0).toFixed(2)} N 变到 {slantForce(30).toFixed(2)} N、{slantForce(60).toFixed(2)} N；每一次 F₁l₁ 都是 {round(sideMoment(HANG) * 100, 1)} N·cm。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">测力计的示数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{pulled ? F.toFixed(2) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">N</span></div>
          </div>
          <ScaleView F={F} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="l₁" value={`${l1} cm`} unit={`动力臂 · ${NAME[deg]}`} />
            <ParamTile symbol="F₂l₂" value={`${round(sideMoment(HANG) * 100, 1)} N·cm`} unit={`${W} N × ${HANG.at * 5} cm`} />
          </div>
          <LeverView left={HANG} right={null} tilt={tilt} arms={level} pull={{ at: AT, deg: d, F }} lc={C2} />
          <Table head={['方向', 'l₁/cm', 'F₁/N', 'F₁l₁']} total={SLANT.angles.length} hi={rows.length - 1}
            rows={rows.map(a => [NAME[a], round(slantArm(a) * 100, 1), slantForce(a).toFixed(2), round(slantForce(a) * slantArm(a) * 100, 1)])} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'pull'} pulse={next === 'pull'} onClick={() => setPulled(true)} disabled={pulled}>拉住测力计</LabButton>
        <LabButton primary={next === 'record'} pulse={next === 'record'} onClick={record} disabled={!level || done}>记录读数</LabButton>
      </>}
      extras={
        <Control label="拉的方向">
          <Segmented label="拉的方向" pulse={next === 'dir'} want={next === 'dir' && want !== null ? String(want) : null} value={String(deg)} onChange={v => setDeg(+v as Angle)} options={SLANT.angles.map(a => ({ value: String(a), label: NAME[a] }))} />
        </Control>
      }
    />
  )
}

/** 左边第 3 格挂着的 4 只钩码：跟着杠杆上下 */
function HooksOn({ live }: { live: React.RefObject<LeverLive> }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => { const s = holeShift(-1, HANG.at, live.current.th); g.current?.position.set(X - HANG.at * GRID + s[0], PY + s[1], BZ) })
  return <group ref={g}><Hooks n={HANG.n} /></group>
}
