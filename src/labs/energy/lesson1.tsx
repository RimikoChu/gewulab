// 功和机械能 · 第 1 课 力做功了没有：货场里一台叉车，四种情形（举高、顶墙、端着平移、松油门滑行），
// 逐个看“有没有力、物体在力的方向上有没有移动”，只有举高那一次做了功。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { ForceArrow, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { CASES, caseWork, fmt, type CaseKey } from './physics'
import { ease, useRun } from './run'
import { Big, COL, Finale, Records } from './views'
import { VOICE } from './voice'
import { P, Place, WALL_X } from './world'
import { Crate, Forklift } from './yard'

const ORDER: CaseKey[] = ['lift', 'wall', 'carry', 'coast']
const TASKS: Task[] = [
  { id: 'lift', text: '把货箱举高 2 m，记一次', note: '举力向上，货箱也向上移动了：做功 1960 N × 2 m = 3920 J' },
  { id: 'wall', text: '顶住墙使劲推，记一次', note: '有推力，墙没有动：移动的距离是 0，不做功' },
  { id: 'carry', text: '端着货箱水平走 3 m，记一次', note: '举力向上，货箱水平移动：在力的方向上没有移动，不做功' },
  { id: 'coast', text: '松开油门滑行 2 m，记一次', note: '靠惯性移动，没有牵引力：不做功' },
]
/** 货箱的中心比叉车原点靠前多少；货箱的前面再靠前半个箱子 */
const AHEAD = 1.26, X_WALL = WALL_X - AHEAD - 0.5, X0 = -2.2, DUR: Record<CaseKey, number> = { lift: 2.6, wall: 2.6, carry: 3.2, coast: 3.2 }
/** 这一种情形进行到 k（0–1）时叉车在哪、货叉多高 */
function pose(m: CaseKey, k: number) {
  if (m === 'lift') return { x: X0, lift: 0.15 + CASES.lift.moved * ease(k) }
  if (m === 'wall') return { x: X_WALL, lift: 0.15 }
  if (m === 'carry') return { x: X0 + CASES.carry.moved * ease(k), lift: 1.0 }
  return { x: X0 + CASES.coast.moved * (2 * k - k * k), lift: 0.15 }
}

export default function Lesson1() {
  const [mode, setMode] = useState<CaseKey>('lift')
  const [rows, setRows] = useState<CaseKey[]>([])
  const T = useTasks('gewu:energy:1', TASKS)
  const run = useRun(DUR[mode])
  useEffect(() => { run.reset() }, [mode])   // eslint-disable-line react-hooks/exhaustive-deps
  const k = run.t === null ? 0 : run.t / DUR[mode], to = pose(mode, k)
  const x = useSlide(to.x, 5), lift = useSlide(to.lift, 2.2), ready = x === to.x && lift === to.lift
  const c = CASES[mode], done = run.done, dup = rows.includes(mode)
  const moved = mode === 'lift' ? lift - 0.15 : mode === 'wall' ? 0 : run.t === null ? 0 : x - X0
  const record = () => { if (!done || dup) return; const n = [...rows, mode]; setRows(n); T.check(id => n.includes(id as CaseKey)) }
  const resetAll = () => { setMode('lift'); setRows([]); run.reset(); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'mode' | 'go' | 'rec' | null } = !task ? { hint: '做功要两样都有：作用在物体上的力，物体在这个力的方向上移动的距离。', next: null }
    : run.running ? { hint: mode === 'lift' ? '货叉托着货箱往上升…' : mode === 'wall' ? '叉车顶着墙使劲，墙纹丝不动…' : mode === 'carry' ? '叉车端着货箱往前开…' : '松开油门，叉车靠惯性往前滑…', next: null }
    : mode !== task.id ? { hint: `把情形换成“${CASES[task.id as CaseKey].name}”`, next: 'mode' }
    : !done ? (ready ? { hint: '按“开动叉车”', next: 'go' } : { hint: '叉车正在就位…', next: null })
    : { hint: '按“记录数据”', next: 'rec' }

  const [ox, , oz] = P.yard, cx = ox + x + AHEAD, top = lift + 0.14 + 1.0
  const pushing = mode === 'wall' && run.running, shake = pushing ? Math.sin((run.t ?? 0) * 40) * 0.006 : 0
  const labels: Label[] = [
    { id: 'f', at: mode === 'wall' ? [cx - 0.4, lift + 1.75, oz] : mode === 'coast' ? [ox + x - 0.8, 2.5, oz] : [cx + 0.25, top + 1.25, oz], className: 'scene-tag -translate-y-1/2', children: <><small>{c.force}</small>{fmt(c.F)} N{mode === 'wall' ? ' →' : mode === 'coast' ? '' : ' ↑'}</> },
    { id: 's', at: mode === 'lift' ? [cx + 0.9, 0.3 + (lift - 0.15) / 2 + 0.5, oz + 0.6] : [ox + (mode === 'wall' ? x : (X0 + x) / 2), 0.15, oz + 1.3], ax: 0.5, className: 'scene-tag', style: { opacity: run.t !== null || mode === 'wall' ? 1 : 0.0 }, children: <><small>移动了</small>{fmt(moved, 1)} m{mode === 'lift' ? ' ↑' : mode === 'wall' ? '' : ' →'}</> },
    { id: 'w', at: [cx, top + (mode === 'wall' || mode === 'coast' ? 0.6 : 2.1), oz], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: done ? 1 : 0 }, children: <><small>{caseWork(mode) > 0 ? '做了功' : '没有做功'}</small>W = {fmt(caseWork(mode))} J</> },
    { id: 'nWall', at: [ox + WALL_X + 0.4, 2.85, oz], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '混凝土墙' },
    { id: 'nBox', at: [cx, lift + 0.5, oz + 0.62], ax: 0.5, name: true, className: 'scene-name', children: '货箱 200 kg' },
  ]
  return (
    <LabShell title="功和机械能" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="叉车"
      stage={<Place at="yard" cur={['forklift']} labels={labels}>
        <group position={[ox + x + shake, 0, oz]}><Forklift lift={lift} spin={x + (pushing ? (run.t ?? 0) * 0.5 : 0)}><Crate /></Forklift></group>
        {/* 力的箭头：举力朝上，推力朝墙；没有力就不画 */}
        {(mode === 'lift' || mode === 'carry') && <ForceArrow tip={[cx, top + 1.2, oz]} dir={[0, 1, 0]} len={1.1} color={COL.f} thick={1.5} />}
        {mode === 'wall' && <ForceArrow tip={[ox + WALL_X - 0.04, lift + 1.45, oz]} dir={[1, 0, 0]} len={pushing || done ? 1.5 : 0.9} color={COL.f} thick={1.5} />}
        {/* 移动的距离：地上（或货箱旁）一支青色箭头，从起点画到现在的位置 */}
        {mode === 'lift' && lift > 0.2 && <ForceArrow tip={[cx + 0.75, 0.3 + lift - 0.15, oz + 0.6]} dir={[0, 1, 0]} len={lift - 0.15} color={COL.s} thick={1.2} />}
        {(mode === 'carry' || mode === 'coast') && run.t !== null && x - X0 > 0.05 && <ForceArrow tip={[ox + x, 0.08, oz + 1.0]} dir={[1, 0, 0]} len={x - X0} color={COL.s} thick={1.2} />}
        {/* 起点线 */}
        <mesh rotation-x={-Math.PI / 2} position={[ox + X0, 0.02, oz + 1.0]}><planeGeometry args={[0.08, 0.7]} /><meshStandardMaterial color="#f2c230" roughness={0.6} /></mesh>
      </Place>}
      lesson={<LessonBlock no="1" title="力做功了没有" concept="有力，还要在力的方向上移动" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>如果一个力作用在物体上，物体<b className="text-white">在这个力的方向上移动了一段距离</b>，就说这个力对物体做了功。</p>
          <p className="mt-3">做功有两个必要因素：一是作用在物体上的力，二是物体在这个力的方向上移动的距离。缺一个都不算做功。</p>
          <p className="mt-3">三种不做功的情形：有力，物体没有移动（推墙）；有力也有移动，但移动的方向和力垂直（端着货箱水平走）；物体靠惯性移动，这个方向上没有力（松油门滑行）。</p>
        </>} />}
      finale={T.finale && <Finale kicker="四种情形都记完了" title="只有“举高”做了功：有力，并且在力的方向上移动了距离" more="顶墙：有力没有距离。端着平移：力向上、移动是水平的，方向垂直。滑行：有距离没有力。三种都不做功。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula="W = F s" value={done ? fmt(caseWork(mode)) : '—'} unit="J" />
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数 · {c.name}</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol={<span style={{ color: COL.f }}>F</span>} value={fmt(c.F)} unit={`N · ${c.force}`} />
            <ParamTile symbol={<span style={{ color: COL.s }}>s</span>} value={done ? fmt(c.F > 0 ? c.along : c.moved, 0) : '—'} unit={c.F > 0 ? 'm · 沿力的方向' : 'm · 滑行的距离'} />
          </div>
          {done && <p className="row-in mt-3 rounded-xl bg-white/6 px-3 py-2.5 text-[13.5px] leading-relaxed text-white/80">{c.why}</p>}
          <Records title="记录" head={['情形', 'F / N', 's / m', 'W / J']} rows={rows.map(r => [CASES[r].name, fmt(CASES[r].F), fmt(CASES[r].F > 0 ? CASES[r].along : CASES[r].moved), fmt(caseWork(r))])} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={run.start} disabled={run.running || !ready || done}>开动叉车</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!done || dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="情形">
          <Segmented label="情形" pulse={next === 'mode'} want={next === 'mode' ? task!.id as CaseKey : null} value={mode} onChange={m => { if (!run.running) setMode(m) }} options={ORDER.map(m => ({ value: m, label: CASES[m].name }))} />
        </Control>
      }
    />
  )
}
