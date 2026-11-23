// 简单机械 · 第 2 课 探究杠杆的平衡条件：先调平衡螺母让杠杆尺在水平位置平衡，再挂三组钩码。
// 左边的钩码挂好不动，学生给右边的钩码找位置，找到能让杠杆重新水平平衡的那一格就记一组数据，三组以后比较 F₁l₁ 和 F₂l₂。
import { useEffect, useMemo, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { GRID, HookBox, Lever, PIVOT_CM, chainLen, holeShift, type LeverLive } from './gear'
import { HangChain } from './hang'
import { LESSONS, goLesson } from './lessons'
import { Arm, C1, C2, Pivot } from './marks'
import { Place, useSettled } from './parts'
import { GROUPS, NUT_OFF, RULER, balanceAt, hooksN, leverTilt, row, sideMoment } from './physics'
import { LeverView, Table } from './views'
import { BZ, ST, TOP, U, type V3 } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'level', text: '调节平衡螺母，让杠杆尺在水平位置平衡', note: '调到水平：挂上钩码以后，力臂就是支点到挂钩码那一格的距离，在尺上直接读得出来' },
  ...GROUPS.map((g, i) => ({ id: `g${i}`, text: `第 ${i + 1} 组：左边第 ${g.left.at} 格挂 ${g.left.n} 只，右边挂 ${g.right} 只，找到平衡的位置记下来`, note: (() => { const r = row(g.left, { n: g.right, at: balanceAt(g)! }); return `${r.F1} N × ${r.l1} cm = ${r.F2} N × ${r.l2} cm = ${r.m1} N·cm` })() })),
]
const X = ST.l2, BASE: V3 = [X, TOP, BZ], PY = TOP + PIVOT_CM * U, BOX: V3 = [X + 3.3, TOP, BZ + 1.1]
/** 每组开始时右边的钩码先挂在哪一格（故意不平衡，让学生自己找） */
const START = [5, 3, 1]
const hole = (side: -1 | 1, i: number): V3 => [X + side * i * GRID, PY, BZ]

export default function Lesson2() {
  const [leveled, setLeveled] = useState(false)
  const [gi, setGi] = useState(-1)                 // 现在挂着第几组（−1 还没挂）
  const [out, setOut] = useState(false)            // 钩码是不是离开了盒子
  const [pos, setPos] = useState(1)                // 右边挂在第几格
  const [moving, setMoving] = useState({ L: false, R: false })
  const [rows, setRows] = useState<number[]>([])
  const T = useTasks('gewu:machine:2', TASKS)
  const live = useRef<LeverLive>({ th: 0 })
  const nut = useSlide(leveled ? 1 : 0, 0.55)
  const g = gi >= 0 ? GROUPS[gi] : null, busy = moving.L || moving.R
  const hung = !!g && out && !busy
  const net = NUT_OFF * (1 - nut) + (g && out && !moving.L ? sideMoment(g.left) : 0) - (g && out && !moving.R ? sideMoment({ n: g.right, at: pos }) : 0)
  const tilt = leverTilt(net)
  const ok = hung && !!g && balanceAt(g) === pos
  const settled = useSettled(`${leveled}${gi}${pos}${hung}`, 2400)
  const done = rows.includes(gi)
  useEffect(() => { if (leveled && settled && nut >= 1) T.check(id => id === 'level') })
  // 换下一组：先把两串钩码收回盒子，再挂出新的一组
  const [swap, setSwap] = useState(false)
  useEffect(() => { if (!swap) return; const t = setTimeout(() => { setGi(i => i + 1); setPos(START[gi + 1]); setOut(true); setSwap(false) }, 1500); return () => clearTimeout(t) }, [swap, gi])
  const hang = () => { if (!leveled || busy || swap || gi >= GROUPS.length - 1 || (gi >= 0 && !done)) return; if (gi < 0) { setGi(0); setPos(START[0]); setOut(true) } else { setOut(false); setSwap(true) } }
  const record = () => { if (!ok || !settled || done) return; const next = [...rows, gi]; setRows(next); T.check(id => id === `g${gi}`) }
  const resetAll = () => { setLeveled(false); setGi(-1); setOut(false); setPos(1); setRows([]); setSwap(false); T.reset() }

  const task = T.current
  const want = g ? balanceAt(g) : null
  const { hint, next }: { hint: string; next: 'level' | 'hang' | 'pos' | 'record' | null } = (() => {
    if (!task) return { hint: '三组都记完了：每一组都是 F₁l₁ = F₂l₂。', next: null }
    if (!leveled) return { hint: '杠杆尺左端下沉。把平衡螺母向右调：按“调平衡螺母”', next: 'level' }
    if (!settled && !g) return { hint: '杠杆尺慢慢摆到水平…', next: null }
    if (gi < 0 || (done && gi < GROUPS.length - 1)) return { hint: `按“挂上第 ${gi + 2} 组钩码”`, next: 'hang' }
    if (busy || swap || !out) return { hint: '挂钩码…', next: null }
    if (!ok) return { hint: tilt > 0 ? `左端下沉：右边的钩码往外挪，换到第 ${Math.min(RULER.n, pos + 1)} 格以外试试` : `右端下沉：右边的钩码往里挪，换到第 ${Math.max(1, pos - 1)} 格以内试试`, next: 'pos' }
    if (!settled) return { hint: '杠杆尺慢慢停在水平位置…', next: null }
    return { hint: `水平平衡了：右边挂在第 ${pos} 格。按“记录数据”`, next: 'record' }
  })()
  const showArms = ok && settled
  const r = g ? row(g.left, { n: g.right, at: pos }) : null
  const follow = (side: -1 | 1, i: number) => () => holeShift(side, i, live.current.th)
  const labels: Label[] = [
    ...(g && out ? [
      { id: 'L', at: [X - g.left.at * GRID - 0.2, PY - chainLen(g.left.n) * 0.6, BZ] as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>F₁</small>{hooksN(g.left.n)} N</> },
      { id: 'R', at: [X + pos * GRID + 0.2, PY - chainLen(g.right) * 0.6, BZ] as V3, ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>F₂</small>{hooksN(g.right)} N</> },
    ] : []),
    ...(showArms && g ? [
      { id: 'l1', at: [X - g.left.at * GRID / 2, PY + 0.62, BZ] as V3, ax: 0.5, className: 'force-tag -translate-y-1/2', style: { color: C1 }, children: `l₁ = ${r!.l1} cm` },
      { id: 'l2', at: [X + pos * GRID / 2, PY + 0.62, BZ] as V3, ax: 0.5, className: 'force-tag -translate-y-1/2', style: { color: C2 }, children: `l₂ = ${r!.l2} cm` },
    ] : []),
    { id: 'n1', at: [X + 2.5, PY - 0.35, BZ], ax: 0, name: true, className: 'scene-name', children: '平衡螺母' },
    { id: 'n2', at: [X + 0.25, PY - 0.45, BZ], ax: 0, name: true, className: 'scene-name', children: '支点 · 转轴' },
    { id: 'n3', at: [BOX[0], TOP + 0.55, BOX[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '钩码盒 · 每只 50 g' },
  ]
  const arms = useMemo(() => g && showArms ? [
    { O: [X, PY + 0.45, BZ + 0.2] as V3, F: [X - g.left.at * GRID, PY + 0.45, BZ + 0.2] as V3, c: C1 },
    { O: [X, PY + 0.45, BZ + 0.2] as V3, F: [X + pos * GRID, PY + 0.45, BZ + 0.2] as V3, c: C2 },
  ] : [], [g, showArms, pos])
  return (
    <LabShell title="简单机械" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="杠杆尺"
      stage={<Place at="l2" labels={labels}>
        <group position={BASE}><Lever tilt={tilt} nut={-0.8 + nut * 0.8} live={live} /></group>
        <group position={BOX}><HookBox /></group>
        {g && <HangChain n={g.left.n} at={out ? hole(-1, g.left.at) : null} box={BOX} follow={follow(-1, g.left.at)} onMove={m => setMoving(s => ({ ...s, L: m }))} />}
        {g && <HangChain n={g.right} at={out ? hole(1, pos) : null} box={[BOX[0] + 0.4, BOX[1], BOX[2]]} follow={follow(1, pos)} onMove={m => setMoving(s => ({ ...s, R: m }))} />}
        {showArms && <Pivot at={[X, PY, BZ + 0.2]} s={0.07} />}
        {arms.map((a, i) => <Arm key={i} O={a.O} F={a.F} line={[0, -1]} color={a.c} s={0.14} r={0.01} />)}
      </Place>}
      lesson={<LessonBlock no="2" title="探究杠杆的平衡条件" concept="动力 × 动力臂 = 阻力 × 阻力臂" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>杠杆在动力和阻力的作用下静止，或者匀速转动，就说杠杆<b className="text-white">平衡</b>了。</p>
          <p className="mt-3">实验前先调节两端的平衡螺母，让杠杆在<b className="text-white">水平位置</b>平衡：一来杠杆自身的重力作用在支点上，不影响转动；二来挂上钩码以后，钩码的拉力竖直向下，和杠杆垂直，支点到挂钩码处的距离就是力臂，可以直接在尺上读出来。</p>
          <p className="mt-3">记下三组数据，比较每一组的 F₁l₁ 和 F₂l₂，得到杠杆的平衡条件：</p>
          <p className="mt-2 text-center font-formula text-[18px] italic">F₁l₁ = F₂l₂</p>
          <p className="mt-3 text-[13.5px] text-white/65">只做一组就下结论，可能是巧合；要多做几组、换着改变力和力臂，结论才可靠。挂上钩码以后不能再动平衡螺母。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据都记下了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">杠杆的平衡条件：F₁l₁ = F₂l₂</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">三组的乘积分别是 {GROUPS.map(gg => row(gg.left, { n: gg.right, at: balanceAt(gg)! }).m1).join('、')} N·cm，每一组两边都相等。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="F₁l₁" value={r ? `${r.m1} N·cm` : '—'} unit={r ? `${r.F1} N × ${r.l1} cm` : '左边'} />
            <ParamTile symbol="F₂l₂" value={r ? `${r.m2} N·cm` : '—'} unit={r ? `${r.F2} N × ${r.l2} cm` : '右边'} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">杠杆尺（每格 {RULER.grid * 100} cm）</h2>
          <LeverView left={g && out ? g.left : null} right={g && out ? { n: g.right, at: pos } : null} tilt={tilt} arms={showArms} />
          <h2 className="mt-4 text-[12.5px] text-white/55">实验数据</h2>
          <Table head={['次', 'F₁/N', 'l₁/cm', 'F₂/N', 'l₂/cm', 'F₁l₁', 'F₂l₂']} total={GROUPS.length} hi={rows.length - 1}
            rows={rows.map(i => { const gg = GROUPS[i], x = row(gg.left, { n: gg.right, at: balanceAt(gg)! }); return [i + 1, x.F1, x.l1, x.F2, x.l2, x.m1, x.m2] })} />
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'level'} onClick={() => setLeveled(true)} disabled={leveled}>调平衡螺母</LabButton>
        <LabButton primary={next === 'hang'} pulse={next === 'hang'} onClick={hang} disabled={!leveled || busy || swap || gi >= GROUPS.length - 1 || (gi >= 0 && !done)}>{`挂上第 ${Math.min(GROUPS.length, gi + 2)} 组钩码`}</LabButton>
        <LabButton primary={next === 'record'} pulse={next === 'record'} onClick={record} disabled={!ok || !settled || done}>记录数据</LabButton>
      </>}
      extras={
        <Control label="右边的钩码挂在">
          <Segmented label="右边的钩码挂在" pulse={next === 'pos'} want={next === 'pos' && want ? String(want) : null} disabled={!hung || done} value={String(pos)} onChange={v => setPos(+v)} options={Array.from({ length: RULER.n }, (_, i) => ({ value: String(i + 1), label: `第 ${i + 1} 格` }))} />
        </Control>
      }
    />
  )
}
