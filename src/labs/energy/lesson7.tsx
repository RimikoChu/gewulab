// 功和机械能 · 第 7 课 机械能守恒：海盗船像一只大摆。不计阻力时，每次摆到头都回到原来的高度，机械能不变；
// 有空气阻力和转轴的摩擦时，一次比一次低，机械能一点点转化成内能。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { SHIP, fmt, shipAt, shipHeight, swingAngle, swingEnergy, swingHeight, type DragKey } from './physics'
import { PIVOT, PirateShip } from './rides'
import { useRun } from './run'
import { Bars, COL, Finale, Records } from './views'
import { VOICE } from './voice'
import { P, Place } from './world'

const MODES: Record<DragKey, string> = { none: '不计阻力', drag: '有阻力' }
const SWINGS = 3, kJ = (j: number) => j / 1000
const list = (m: DragKey) => [0, 1, 2, 3].map(n => fmt(swingHeight(m, n), 1)).join(' → ')
const TASKS: Task[] = [
  { id: 'up', text: '把船拉到比最低点高 4 m 的地方', note: `船有了 ${fmt(kJ(swingEnergy('none', 0)), 1)} kJ 的重力势能` },
  { id: 'none', text: '不计阻力：松手，看三次摆到头的高度', note: `${list('none')} m：每次都回到原来的高度，机械能不变` },
  { id: 'drag', text: '换成“有阻力”，再拉高、松手', note: `${list('drag')} m：一次比一次低，机械能在减少` },
]

export default function Lesson7() {
  const [mode, setMode] = useState<DragKey>('none')
  const [up, setUp] = useState(false)
  const [seen, setSeen] = useState<Record<DragKey, number>>({ none: -1, drag: -1 })   // 各种情况下已经记到第几次摆到头
  const T = useTasks('gewu:energy:7', TASKS)
  const run = useRun((SWINGS + 2) * SHIP.half)
  useEffect(() => { run.reset(); setUp(false) }, [mode])   // eslint-disable-line react-hooks/exhaustive-deps
  const a0 = swingAngle(SHIP.h0), raise = useSlide(up && run.t === null ? a0 : 0, run.t === null ? 0.3 : 99), raised = up && raise === a0 && run.t === null
  useEffect(() => { if (raised) T.check(id => id === 'up') }, [raised])   // eslint-disable-line react-hooks/exhaustive-deps
  // 摆动：前三个半程照计算核心走；之后刹车，两个半程里慢慢停下
  const t = run.t, sw = t === null ? null : shipAt(mode, t), brake = t === null ? 1 : Math.max(0, 1 - Math.max(0, t - SWINGS * SHIP.half) / (2 * SHIP.half))
  const angle = sw ? sw.angle * brake * brake : raise, n = sw ? Math.min(SWINGS, sw.n) : -1
  useEffect(() => { if (n < 0) return; setSeen(s => s[mode] >= n ? s : { ...s, [mode]: n }); if (n >= SWINGS) T.check(id => id === mode) }, [n])   // eslint-disable-line react-hooks/exhaustive-deps
  const braking = t !== null && t > SWINGS * SHIP.half
  const resetAll = () => { setMode('none'); setUp(false); setSeen({ none: -1, drag: -1 }); run.reset(); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'mode' | 'up' | 'go' | null } = !task ? { hint: '只有动能和势能相互转化时，机械能守恒；有阻力时，机械能减少，转化成了内能。', next: null }
    : run.running ? { hint: braking ? '三次都记下了，刹车把船停下来…' : `摆起来了：第 ${Math.min(SWINGS, n + 1)} 次摆到头，看它有多高…`, next: null }
    : task.id !== 'up' && mode !== task.id ? { hint: `把条件换成“${MODES[task.id as DragKey]}”`, next: 'mode' }
    : !up || run.done ? { hint: '按“拉到 4 m 高”', next: 'up' }
    : raised ? { hint: '按“松手”', next: 'go' } : { hint: '正在把船拉到高处…', next: null }
  const hNow = shipHeight(angle), k = seen[mode], E0 = swingEnergy(mode, 0), E = k >= 0 ? swingEnergy(mode, k) : raised ? E0 : 0
  const [sx, , sz] = P.ship, at = (a: number, dr = 0): [number, number, number] => [sx + Math.sin(a) * (SHIP.arm + dr), PIVOT - Math.cos(a) * (SHIP.arm + dr), sz + 2.2]
  const labels: Label[] = [
    { id: 'h', at: at(angle, 2.4), ax: 0.5, className: 'scene-tag', children: <><small>比最低点高</small>{fmt(hNow, 1)} m</> },
    ...(k >= 1 ? Array.from({ length: k }, (_, i) => ({ id: `t${i}`, at: at((i % 2 ? 1 : -1) * swingAngle(swingHeight(mode, i + 1)), -3.4 - (i === 2 ? 1.5 : 0)), ax: i % 2 ? 0 : 1, className: 'scene-tag key -translate-y-1/2', children: <><small>第 {i + 1} 次</small>{fmt(swingHeight(mode, i + 1), 1)} m</> } satisfies Label)) : []),
    { id: 'n1', at: [sx, PIVOT + 1.1, sz], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '转轴' },
    { id: 'n2', at: [sx - 8.4, 4.6, sz + 3.5], ax: 1, name: true, className: 'scene-name', children: '人字架' },
  ]
  return (
    <LabShell title="功和机械能" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="海盗船"
      stage={<Place at="ship" cur={['ship']} labels={labels}>
        <group position={P.ship}><PirateShip angle={() => angle} /></group>
      </Place>}
      lesson={<LessonBlock no="7" title="机械能守恒" concept="只有动能和势能转化时，机械能不变" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>动能、重力势能和弹性势能统称为<b className="text-white">机械能</b>。如果只有动能和势能相互转化，机械能的总和不变：<b className="text-white">机械能守恒</b>。</p>
          <p className="mt-3">船摆到两头最高处，速度是 0，机械能全是重力势能；摆到最低点，重力势能最小、动能最大。所以比一比每次摆到头的高度，就知道机械能变没变。</p>
          <p className="mt-3">有空气阻力和转轴的摩擦时，船要克服阻力做功，一部分机械能转化成内能，摆得一次比一次低。真的海盗船要靠底下的驱动轮不断补充能量。</p>
          <p className="mt-3 text-[13.5px] text-white/65">“有阻力”这一档按每摆到另一头、高度降到上一次的 0.9 来算，只用来比较。</p>
        </>} />}
      finale={T.finale && <Finale kicker="两种情况都看过了" title="只有动能和势能相互转化时，机械能守恒；有阻力时，机械能减少" more={`不计阻力：${list('none')} m。有阻力：${list('drag')} m，少掉的机械能转化成了内能。`} onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center text-[13px] text-white/60">{MODES[mode]} · 摆到头时的机械能</div>
          <div className="mt-4"><Bars max={kJ(E0)} items={[{ name: '机械能', value: kJ(E), color: COL.e }, ...(mode === 'drag' ? [{ name: '转化成内能', value: k >= 0 ? kJ(E0 - E) : 0, color: COL.heat }] : [])]} /></div>
          <h2 className="mt-5 text-[12.5px] text-white/55">船这一刻</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="h" value={fmt(hNow, 1)} unit="m · 比最低点高" />
            <ParamTile symbol="m" value={String(SHIP.mass)} unit="kg · 船的质量" />
          </div>
          <Records title="每次摆到头的高度 / m" head={['条件', '松手', '第 1 次', '第 2 次', '第 3 次']} rows={(Object.keys(MODES) as DragKey[]).filter(m => seen[m] >= 0).map(m => [MODES[m], ...[0, 1, 2, 3].map(i => i <= seen[m] ? fmt(swingHeight(m, i), 1) : '—')])} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'up'} pulse={next === 'up'} onClick={() => { if (!run.running) { run.reset(); setUp(true) } }} disabled={run.running || (up && !run.done)}>拉到 4 m 高</LabButton>
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={run.start} disabled={!raised}>松手</LabButton>
      </>}
      extras={
        <Control label="阻力">
          <Segmented label="阻力" pulse={next === 'mode'} want={next === 'mode' ? task!.id as DragKey : null} value={mode} onChange={m => { if (!run.running) setMode(m) }} options={(Object.keys(MODES) as DragKey[]).map(m => ({ value: m, label: MODES[m] }))} />
        </Control>
      }
    />
  )
}
