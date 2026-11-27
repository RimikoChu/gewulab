// 导数 · 拓展课：区间测速（平均速度超限，中途一定有一刻正好这么快）；最省油的车速
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import SceneX from './scenex'
import { useRamp } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { fmt, fuel, fuelBest, fuelD, mvtTimes, tripSpeed, ZONE, zoneAvg } from './physics'

const TASKS: Task[] = [
  { id: 'avg', text: '区间测速：算这辆车的平均速度', note: '20 km 用了 12 min，平均 100 km/h，超过限速 80 km/h' },
  { id: 'mvt', text: '找出和割线平行的切线', note: 't ≈ 2.54 min 和 9.46 min 时，车速正好是 100 km/h' },
  { id: 'fuel', text: '最省油的车速：求导找最小', note: 'Q′(v) = 0 时 v = 80 km/h，走 100 km 耗油 11.25 L' },
]
const [M1, M2] = mvtTimes()
const FB = fuelBest()
const T0 = 0.3, V0 = 48

export default function LessonX() {
  const [avg, setAvg] = useState(false)
  const [mvt, setMvt] = useState(0)
  const [topic, setTopic] = useState<'zone' | 'fuel'>('zone')
  const [solve, setSolve] = useState(0)
  const T = useTasks('gewu:derivative:x', TASKS)
  const p = useRamp(mvt, 4.5, true), q = useRamp(solve, 4, true)
  const sliding = mvt > 0 && p < 1, solving = solve > 0 && q < 1
  const tc = mvt && p < 1 ? T0 + (M1 - T0) * p : null
  const both = (mvt && p >= 1) || (T.done.mvt && !mvt) ? [M1, M2] : []
  const vc = solve ? V0 + (FB.v - V0) * q : null
  useEffect(() => { if (mvt && p >= 1) T.check(id => id === 'mvt') }, [p >= 1, mvt])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (solve && q >= 1) T.check(id => id === 'fuel') }, [q >= 1, solve])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setAvg(false); setMvt(0); setTopic('zone'); setSolve(0); T.reset() }
  const task = T.current
  const third = topic === 'zone' ? '接着看：最省油的车速' : '求导找最省'
  const { hint, next }: { hint: string; next: 'avg' | 'mvt' | 'third' | null } = !task ? { hint: '平均速度超了限速，中途一定有某一刻正好开这么快；耗油最少的车速，也是令导数为 0 求出来的。', next: null }
    : sliding ? { hint: '切线沿着曲线滑，斜率一点点变大…', next: null }
    : solving ? { hint: '切线滑向最低点，斜率越来越接近 0…', next: null }
    : task.id === 'avg' ? { hint: '按“算平均速度”：区间全长 20 km，这辆车走了 12 min', next: 'avg' }
    : task.id === 'mvt' ? { hint: '按“找平行的切线”：哪一刻的瞬时速度正好等于平均速度', next: 'mvt' }
    : topic === 'zone' ? { hint: '接着看：最省油的车速', next: 'third' }
    : { hint: '按“求导找最省”：令 Q′(v) = 0', next: 'third' }
  const onThird = () => { if (topic === 'zone') setTopic('fuel'); else setSolve(s => s + 1) }

  return (
    <LabShell title="导数" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={topic === 'zone' ? '区间测速' : '最省油的车速'}
      stage={<SceneX topic={topic} avg={avg || !!T.done.avg} tc={tc} both={topic === 'zone' ? both : []} vc={vc ?? (T.done.fuel && topic === 'fuel' ? FB.v : null)} />}
      lesson={<LessonBlock no="拓展" title="区间测速 · 最省油" concept="平均超速，就一定有一刻在超速" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">区间测速</b>：在一段路的起点和终点各拍一次，用路程除以时间得到平均速度。这辆车的路程 s(t) 是一条光滑的曲线，割线斜率 20 ÷ 12 km/min 就是 100 km/h。曲线上一定有一点的切线和这条割线平行，那一刻的瞬时速度正好是 100 km/h，超过了 80 km/h。</p>
          <p className="mt-3">这里的路程曲线是示意的：进出测速点时都是 80 km/h，中途最快 110 km/h。</p>
          <p className="mt-3"><b className="text-white">最省油的车速</b>：按一个常用的耗油模型（示意），以 v km/h 匀速行驶时每小时耗油 <span className="font-formula italic">v³/128000 − 3v/80 + 8</span> 升。走 100 km 要 100/v 小时，耗油 <span className="font-formula italic">Q(v) = v²/1280 + 800/v − 15/4</span>。<span className="font-formula italic">Q′(v) = v/640 − 800/v² = 0</span>，得 <span className="font-formula italic">v³ = 512000</span>，<span className="font-formula italic">v = 80</span>。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个专题都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">平均 100 km/h，中途必有一刻正好 100 km/h；80 km/h 最省油，100 km 耗油 11.25 L</p>
        </Glass>
      )}
      panel={topic === 'zone' ? (
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">v̄ = Δs / Δt</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{avg || T.done.avg ? fmt(zoneAvg()) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">km/h 平均速度</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="Δs" value={String(ZONE.km)} unit="km · 区间全长" />
            <ParamTile symbol="Δt" value={String(ZONE.min)} unit="min · 用时" />
            <ParamTile symbol="限速" value={String(ZONE.limit)} unit="km/h" />
            <ParamTile symbol="v(t)" value={tc !== null ? fmt(tripSpeed(tc), 1) : both.length ? '100' : '—'} unit="km/h · 切线斜率" />
          </div>
          {both.length > 0 && <p className="row-in mt-3 rounded-xl bg-white/8 px-3 py-2 text-center text-[14px]">t = 6 − 2√3 ≈ {fmt(M1, 2)} min，t = 6 + 2√3 ≈ {fmt(M2, 2)} min</p>}
        </Glass>
      ) : (
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">Q(v) = v²/1280 + 800/v − 15/4</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{vc !== null ? fmt(fuel(vc), 2) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">L / 100 km</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="v" value={vc !== null ? fmt(vc, 1) : '—'} unit="km/h · 车速" />
            <ParamTile symbol="Q′(v)" value={vc !== null ? fmt(fuelD(vc), 3) : '—'} unit="切线斜率" />
          </div>
          <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">车速 km/h</th><th className="text-right font-normal">走 100 km 耗油 / L</th></tr></thead>
            <tbody>{[60, 80, 100].map(v => <tr key={v} className="border-t border-white/12"><td className="py-1.5 tabular-nums">{v}</td><td className={`text-right tabular-nums ${v === 80 && T.done.fuel ? 'font-semibold text-[#7fe3d4]' : ''}`}>{fuel(v).toFixed(2)}</td></tr>)}</tbody>
          </table>
        </Glass>
      )}
      actions={<>
        <LabButton primary={next === 'avg'} pulse={next === 'avg'} onClick={() => { setAvg(true); T.check(id => id === 'avg') }} disabled={topic !== 'zone' || avg || !!T.done.avg}>算平均速度</LabButton>
        <LabButton primary={next === 'mvt'} pulse={next === 'mvt'} onClick={() => setMvt(m => m + 1)} disabled={topic !== 'zone' || sliding || !T.done.avg}>找平行的切线</LabButton>
        <LabButton primary={next === 'third'} pulse={next === 'third'} onClick={onThird} disabled={sliding || solving || !T.done.mvt}>{third}</LabButton>
      </>}
      extras={null}
    />
  )
}
