// 抛体运动 · 第 4 课 描轨迹求初速度（实验：斜槽小球，描出平抛的轨迹，由轨迹上的点求初速度）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene4, { shotTime, SLOW } from './scene4'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { fallTime, fmt, G, hitX, RAMP, v0From } from './physics'
import { useRun } from './run'

const TASKS: Task[] = [
  { id: 'p1', text: '从槽上固定的位置释放小球，记下第 1 个点', note: '挡板在槽口下 4.9 cm：球打在离槽口 12 cm 处' },
  { id: 'p2', text: '挡板下移，再释放，记下第 2 个点', note: '挡板在 19.6 cm：球打在 24 cm 处' },
  { id: 'p3', text: '挡板再下移，记下第 3 个点', note: '挡板在 44.1 cm：球打在 36 cm 处' },
  { id: 'curve', text: '用平滑的曲线把点连起来', note: '描出的轨迹是一条抛物线' },
  { id: 'v0', text: '取一个点，求小球的初速度', note: 'v₀ = x √(g ÷ 2y) = 1.2 m/s' },
]
const N = RAMP.drops.length

export default function Lesson4() {
  const [marks, setMarks] = useState(0)
  const [curve, setCurve] = useState(false)
  const [solved, setSolved] = useState(false)
  const T = useTasks('gewu:projectile:4', TASKS)
  const drop = RAMP.drops[Math.min(marks, N - 1)]
  const bar = useSlide(drop, 0.22), barMoving = bar !== drop
  const run = useRun(shotTime(drop))
  useEffect(() => { if (!run.done) return; const n = Math.min(N, marks + 1); setMarks(n); run.reset(); T.check(id => /^p\d$/.test(id) && +id[1] <= n) }, [run.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const release = () => { if (run.running || barMoving || marks >= N) return; run.start() }
  const draw = () => { if (marks < N) return; setCurve(true); T.check(id => id === 'curve') }
  const solve = () => { if (!curve) return; setSolved(true); T.check(id => id === 'v0') }
  const resetAll = () => { setMarks(0); setCurve(false); setSolved(false); run.reset(); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'go' | 'curve' | 'v0' | null } = !task ? { hint: '由轨迹上一个点的 x 和 y，就能求出平抛的初速度。', next: null }
    : task.id === 'curve' ? { hint: '按“描轨迹”：用平滑的曲线把三个点和 O 连起来', next: 'curve' }
    : task.id === 'v0' ? { hint: '按“求初速度”：取中间那个点来算', next: 'v0' }
    : run.running ? { hint: '小球滚下斜槽，从槽口水平飞出…', next: null }
    : barMoving ? { hint: '把挡板往下移…', next: null }
    : { hint: '按“释放小球”：每次都从槽上同一个位置松手', next: 'go' }
  const [px, py] = [hitX(RAMP.drops[1]), RAMP.drops[1]]

  return (
    <LabShell title="抛体运动" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="平抛实验器"
      stage={<Scene4 marks={marks} bar={bar} u={run.running ? run.t : null} curve={curve} solved={solved} />}
      lesson={<LessonBlock no="4" title="描轨迹求初速度" concept="由轨迹上的点求平抛的初速度" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>实验要点：斜槽末端要水平（小球放在槽口不滚动）；背板要竖直（用重垂线检查）；每次从斜槽上同一位置由静止释放小球，它离开槽口的速度才相同。</p>
          <p className="mt-3">以槽口处小球的球心为原点 O，水平向右为 x 轴，竖直向下为 y 轴。轨迹上任取一点，量出 x 和 y：由 <span className="font-formula italic">y = ½gt²</span> 得 <span className="font-formula italic">t = √(2y ÷ g)</span>，再由 <span className="font-formula italic">x = v₀t</span> 得 <span className="font-formula italic">v₀ = x √(g ÷ 2y)</span>。</p>
          <p className="mt-3">小球飞行只有零点几秒，画面里放慢了 {SLOW} 倍。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">初速度求出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">取点 (24 cm, 19.6 cm)：t = 0.2 s，v₀ = 0.24 ÷ 0.2 = 1.2 m/s</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">v₀ = x √(g ÷ 2y)</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{solved ? fmt(v0From(px, py)) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m/s</span></div>
          </div>
          <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">点</th><th className="text-right font-normal">x / cm</th><th className="text-right font-normal">y / cm</th><th className="text-right font-normal">t / s</th></tr></thead>
            <tbody>{RAMP.drops.map((d, i) => <tr key={d} className={`border-t border-white/12 ${solved && i === 1 ? 'font-semibold text-[#7fe3d4]' : ''}`}><td className="py-1.5">{i + 1}</td><td className="text-right tabular-nums">{i < marks ? fmt(hitX(d) * 100, 1) : '—'}</td><td className="text-right tabular-nums">{i < marks ? fmt(d * 100, 1) : '—'}</td><td className="text-right tabular-nums">{solved ? fmt(fallTime(d), 2) : '—'}</td></tr>)}</tbody>
          </table>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="挡板" value={fmt(bar * 100, 1)} unit="cm · 在槽口下" />
            <ParamTile symbol="g" value={String(G)} unit="m/s²" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={release} disabled={run.running || barMoving || marks >= N}>释放小球</LabButton>
        <LabButton primary={next === 'curve'} pulse={next === 'curve'} onClick={draw} disabled={marks < N || curve}>描轨迹</LabButton>
        <LabButton primary={next === 'v0'} pulse={next === 'v0'} onClick={solve} disabled={!curve || solved}>求初速度</LabButton>
      </>}
      extras={null}
    />
  )
}
