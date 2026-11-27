// 功和机械能 · 第 4 课 动能：科学小站的实验桌上，钢球从斜面滚下撞木块，木块被撞得越远，说明钢球的动能越大。
// 同一只球从更高处放（到底端更快）、同一高度换更重的球，各比一次。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { BLOCK, BLOCK_X0, Ball, RampSet, SLOPE, WoodBlock, onSlope } from './bench'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { RAMP, fmt, slide, type BallKey, type HeightKey } from './physics'
import { useRun } from './run'
import { Big, Finale, Records } from './views'
import { VOICE } from './voice'
import { P, Place } from './world'

const BALLS: Record<BallKey, { name: string; r: number }> = { small: { name: '小钢球 0.1 kg', r: 0.026 }, big: { name: '大钢球 0.2 kg', r: 0.033 } }
const HS: Record<HeightKey, string> = { low: '10 cm', high: '20 cm' }
const WANT: Record<string, [BallKey, HeightKey]> = { a: ['small', 'low'], b: ['small', 'high'], c: ['big', 'low'] }
const cm = (b: BallKey, h: HeightKey) => fmt(slide(b, h) * 100)
const TASKS: Task[] = [
  { id: 'a', text: '小钢球从 10 cm 高处放', note: `木块被撞出 ${cm('small', 'low')} cm` },
  { id: 'b', text: '同一只球，改从 20 cm 高处放', note: `到底端时更快，木块被撞出 ${cm('small', 'high')} cm：质量相同，速度越大，动能越大` },
  { id: 'c', text: '换大钢球，还从 10 cm 高处放', note: `到底端时一样快，木块被撞出 ${cm('big', 'low')} cm：速度相同，质量越大，动能越大` },
]
/** 画面上的过程（放慢了）：滚下斜面用 T1 秒，撞上以后木块用 T2 秒滑到头 */
const T1 = (h: HeightKey) => (h === 'low' ? 0.9 : 1.25), T2 = 1.0, WAIT = 0.5

export default function Lesson4() {
  const [ball, setBall] = useState<BallKey>('small')
  const [h, setH] = useState<HeightKey | null>(null)
  const [rows, setRows] = useState<[BallKey, HeightKey][]>([])
  const T = useTasks('gewu:energy:4', TASKS)
  const hk = h ?? 'low', t1 = T1(hk), run = useRun(WAIT + t1 + T2 + 0.4)
  useEffect(() => { run.reset(); setH(null) }, [ball])   // eslint-disable-line react-hooks/exhaustive-deps
  const stopped = run.done && h !== null
  useEffect(() => { if (!stopped) return; setRows(r => r.some(q => q[0] === ball && q[1] === h) ? r : [...r, [ball, h!]]); T.check(id => WANT[id][0] === ball && WANT[id][1] === h) }, [stopped])   // eslint-disable-line react-hooks/exhaustive-deps
  const drop = (k: HeightKey) => { if (run.running) return; setH(k); run.start() }
  const resetAll = () => { setBall('small'); setH(null); setRows([]); run.reset(); T.reset() }
  const task = T.current
  // 球和木块在哪：先在释放线上被手捏着，松手后沿斜面匀加速滚下，到底端撞上木块；木块匀减速滑到头，球跟在后面停下
  const r = BALLS[ball].r, H = RAMP.heights[hk], s = h ? slide(ball, h) : 0, t = run.t === null ? null : run.t - WAIT
  const gap = BLOCK_X0 - r                                    // 球心到底端以后还要走这么远才碰到木块
  const sn = Math.sin(SLOPE), cs = Math.cos(SLOPE)
  /** 球在斜面上高 hh 处时球心的位置；k 是球心离槽底几个半径（卡在 V 形槽里，比 1 大一点） */
  const onRamp = (hh: number, k: number): [number, number] => { const [x, y] = onSlope(hh); return [x + sn * r * k, y + cs * r * k] }
  let bx: number, by: number, block = 0, held = true
  if (t === null || t <= 0 || h === null) [bx, by] = onRamp(H, 1.25)
  else if (t < t1) { const u = (t / t1) ** 2; held = false; [bx, by] = onRamp(H * (1 - u), 1.25 - 0.25 * u) }
  else { const u = Math.min(1, Math.max(0, t - t1 - 0.06) / T2); held = false; block = s * (2 * u - u * u); bx = Math.min(gap + block - 0.002, sn * r + (gap - sn * r) * Math.min(1, (t - t1) / 0.06) + block * 0.96); by = r }
  // 挡板：挡在钢球下坡的一侧，松开时往上一提
  const [gx0, gy0] = onRamp(H, 1.25), up = held ? 0 : Math.min(0.07, (t ?? 0) * 0.5), gate: [number, number, number] = [gx0 + cs * (r + 0.005) + sn * (0.012 + up), gy0 - sn * (r + 0.005) + cs * (0.012 + up), 0]
  const hit = t !== null && t >= t1 + 0.06
  const { hint, next }: { hint: string; next: 'ball' | HeightKey | null } = !task ? { hint: '质量相同的物体，速度越大，动能越大；速度相同的物体，质量越大，动能越大。', next: null }
    : run.running ? { hint: hit ? '撞上了：看木块滑出多远…' : '钢球滚下斜面，越滚越快…', next: null }
    : ball !== WANT[task.id][0] ? { hint: `把钢球换成“${BALLS[WANT[task.id][0]].name}”`, next: 'ball' }
    : { hint: `按“从 ${HS[WANT[task.id][1]]} 高处放”`, next: WANT[task.id][1] }
  const [ox, oy, tz] = P.table, oz = tz + 0.2, X = ox, Y = oy + 0.018
  const labels: Label[] = [
    { id: 's', at: [X + BLOCK_X0 + block + BLOCK.len / 2, Y + 0.085, oz], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: hit ? 1 : 0 }, children: <><small>木块滑出</small>{fmt(block * 100, stopped ? 0 : 1)} cm</> },
    { id: 'hh', at: [X + onSlope(H)[0], Y + H + 0.1, oz], ax: 0.5, className: 'scene-tag -translate-y-full', style: { opacity: h ? 1 : 0 }, children: <><small>释放高度</small>{HS[hk]}</> },
    { id: 'n0', at: [X + gate[0], Y + gate[1] + 0.06, oz], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '挡板' },
    { id: 'n1', at: [X - 0.2, Y + 0.0, oz + 0.09], ax: 0.5, name: true, className: 'scene-name', children: '斜面' },
    { id: 'n2', at: [X + BLOCK_X0 + 0.035, Y - 0.01, oz + 0.1], ax: 0.5, name: true, className: 'scene-name', children: '木块' },
    { id: 'n3', at: [X + 0.36, Y - 0.01, oz + 0.1], ax: 0.5, name: true, className: 'scene-name', children: '厘米刻度尺' },
  ]
  return (
    <LabShell title="功和机械能" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="释放钢球"
      stage={<Place at="ramp" cur={['ramp']} labels={labels}>
        <group position={[X, Y, oz]}>
          <RampSet>
            <group position={[BLOCK_X0 + block, 0, 0]}><WoodBlock /></group>
            <group position={gate} rotation-z={-SLOPE}>
              <mesh castShadow><boxGeometry args={[0.005, 0.07, 0.09]} /><meshPhysicalMaterial color="#c8372d" roughness={0.4} clearcoat={0.5} /></mesh>
              <mesh position={[0, 0.05, 0]} castShadow><cylinderGeometry args={[0.004, 0.004, 0.04, 10]} /><meshStandardMaterial color="#8d949a" metalness={0.8} roughness={0.3} /></mesh>
              <mesh position={[0, 0.075, 0]} castShadow><sphereGeometry args={[0.011, 16, 12]} /><meshStandardMaterial color="#23272c" roughness={0.5} /></mesh>
            </group>
            <group position={[bx, by, 0]}><Ball r={r} />
            </group>
          </RampSet>
        </group>
      </Place>}
      lesson={<LessonBlock no="4" title="动能" concept="动能的大小跟质量和速度有关" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>物体由于<b className="text-white">运动</b>而具有的能，叫做动能。一个物体能够对外做功，就说它具有能量；能做的功越多，能量越大。</p>
          <p className="mt-3">钢球撞木块，对木块做功。木块被撞得越远，说明钢球做的功越多，它撞上去时的动能越大。这样把看不见的动能，转换成看得见的距离。</p>
          <p className="mt-3">每次只改一个条件：同一只球从不同高度放，到底端的速度不同；不同的球从同一高度放，到底端的速度相同。</p>
          <p className="mt-3 text-[13.5px] text-white/65">钢球画得比实际大（示意大小），滚下来的过程也放慢了。木块滑行的距离是按简化的模型算的，只用来比较远近。</p>
        </>} />}
      finale={T.finale && <Finale kicker="三次都比完了" title="质量相同，速度越大，动能越大；速度相同，质量越大，动能越大" more={`木块依次被撞出 ${cm('small', 'low')}、${cm('small', 'high')}、${cm('big', 'low')} cm。`} onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula="木块被撞出的距离" value={stopped ? cm(ball, h!) : hit ? fmt(block * 100, 1) : '—'} unit="cm" />
          <h2 className="mt-5 text-[12.5px] text-white/55">这一次的条件</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="m" value={String(RAMP.balls[ball])} unit="kg · 钢球的质量" />
            <ParamTile symbol="h" value={h ? fmt(RAMP.heights[h] * 100) : '—'} unit="cm · 释放的高度" />
          </div>
          <Records title="记录" head={['钢球', '高度', '木块滑出']} rows={rows.map(([b, k]) => [`${RAMP.balls[b]} kg`, HS[k], `${cm(b, k)} cm`])} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'low'} pulse={next === 'low'} onClick={() => drop('low')} disabled={run.running}>从 10 cm 高处放</LabButton>
        <LabButton primary={next === 'high'} pulse={next === 'high'} onClick={() => drop('high')} disabled={run.running}>从 20 cm 高处放</LabButton>
      </>}
      extras={
        <Control label="钢球">
          <Segmented label="钢球" pulse={next === 'ball'} want={next === 'ball' ? WANT[task!.id][0] : null} value={ball} onChange={k => { if (!run.running) setBall(k) }} options={(Object.keys(BALLS) as BallKey[]).map(k => ({ value: k, label: BALLS[k].name }))} />
        </Control>
      }
    />
  )
}
