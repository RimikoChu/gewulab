// 机械运动 · 第 5 课 一直一样快吗（匀速直线运动和变速直线运动）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import At from './at'
import { LESSONS, goLesson } from './lessons'
import { gaps, posAt } from './physics'
import { TRACK, Train } from './world'

type Kind = 'uniform' | 'speeding'
const NAME: Record<Kind, string> = { uniform: '匀速行驶', speeding: '出站加速' }, N = 4, X0 = -22
const TASKS: Task[] = [
  { id: 'uniform', text: '匀速行驶：走 4 秒，每秒记一次位置', note: `每一秒都走 ${gaps('uniform', 1)[0]} m：相等的时间里路程相等` },
  { id: 'speeding', text: '出站加速：再走 4 秒，再记一次', note: `每秒走 ${gaps('speeding', N).join('、')} m：越走越多` },
]
const CW = 264, CH = 92

export default function Lesson5() {
  const [kind, setKind] = useState<Kind>('uniform')
  const [goal, setGoal] = useState(0)
  const [rows, setRows] = useState<Kind[]>([])
  const T = useTasks('gewu:motion:5', TASKS)
  const t = useSlide(goal, 1.3), moving = Math.abs(t - goal) > 0.01, done = goal === N && !moving
  const s = posAt(kind, t), dup = rows.includes(kind), top = posAt(kind, N)
  const pick = (k: Kind) => { if (moving) return; setKind(k); setGoal(0) }
  const record = () => { if (!done || dup) return; const next = [...rows, kind]; setRows(next); T.check(id => next.includes(id as Kind)) }
  const resetAll = () => { setKind('uniform'); setGoal(0); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'kind' | 'run' | 'record' | null } = !task ? { hint: '两种都记完了。匀速的点间隔一样，加速的点越来越稀。', next: null }
    : moving ? { hint: goal ? '每过 1 秒，在车头的位置留一个记号' : '回到起点…', next: null }
    : kind !== task.id ? { hint: `换成“${NAME[task.id as Kind]}”`, next: 'kind' }
    : done && !dup ? { hint: '看地上的四个记号隔得一样远吗？按“记录”', next: 'record' } : { hint: '按“走 4 秒”', next: 'run' }
  const k = kind === 'uniform' ? 1 : 6     // 加速的那一次走得很近，画面里放大 6 倍才看得清
  const marks = Array.from({ length: Math.floor(t + 1e-6) + 1 }, (_, i) => posAt(kind, i))
  const labels: Label[] = [
    { id: 's', at: [X0 + s * k, 4.2, TRACK.near], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>{t.toFixed(1)} s</small>{s.toFixed(2)} m</> },
    ...marks.map((m, i): Label => ({ id: `d${i}`, at: [X0 + m * k, 0.3, TRACK.near + 2.2], ax: 0.5, name: true, className: 'scene-name', children: `${i} s` })),
  ]

  return (
    <LabShell title="机械运动" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="检测车"
      stage={<At at="platform" labels={labels}>
        <Train x={X0 + s * k} z={TRACK.near} len={7} stripe="#e9a53a" />
        {marks.map((m, i) => <mesh key={i} position={[X0 + m * k, 0.5, TRACK.near + 1.6]}><cylinderGeometry args={[0.16, 0.16, 1, 10]} /><meshBasicMaterial color="#ff6b4a" toneMapped={false} /></mesh>)}
      </At>}
      lesson={<LessonBlock no="5" title="一直一样快吗" concept="相等的时间里路程相等，才是匀速" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>物体沿着直线、速度不变的运动，叫<b className="text-white">匀速直线运动</b>：任意相等的时间里，走过的路程都相等。</p>
          <p className="mt-3">速度变化的直线运动叫<b className="text-white">变速直线运动</b>。列车出站时越开越快，相等的时间里走的路程越来越长。这时只能说它在某一段路程上的<b className="text-white">平均速度</b>。</p>
          <p className="mt-3 text-[13.5px] text-white/65">出站加速那一次，头 4 秒只走了 {posAt('speeding', N)} m，画面里把距离放大了 6 倍；读数是真实的。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种开法比完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">匀速：每秒都是 {gaps('uniform', 1)[0]} m。加速：{gaps('speeding', N).join('、')} m</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">记号隔得一样远，是匀速；越隔越远，是越来越快。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{NAME[kind]} · 离起点</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{s.toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <svg viewBox={`-22 -6 ${CW + 30} ${CH + 26}`} className="mt-3 w-full" role="img" aria-label="路程随时间变化的图像">
            <line x1={0} y1={CH} x2={CW} y2={CH} stroke="#fff" strokeOpacity={0.3} /><line x1={0} y1={0} x2={0} y2={CH} stroke="#fff" strokeOpacity={0.3} />
            <path d={Array.from({ length: 41 }, (_, i) => `${i ? 'L' : 'M'}${(i / 40 * CW).toFixed(1)},${(CH - posAt(kind, i / 10) / top * CH).toFixed(1)}`).join(' ')} fill="none" stroke="#7fe3d4" strokeWidth={2} strokeOpacity={0.45} />
            {marks.map((m, i) => <circle key={i} cx={i / N * CW} cy={CH - m / top * CH} r={3.5} fill="#ff6b4a" />)}
            <circle cx={t / N * CW} cy={CH - s / top * CH} r={4.5} fill="#fff" />
            {[0, 1, 2, 3, 4].map(i => <text key={i} x={i / N * CW} y={CH + 13} textAnchor="middle" fontSize={10} fill="#fff" fillOpacity={0.5}>{i} s</text>)}
            <text x={-4} y={4} textAnchor="end" fontSize={10} fill="#fff" fillOpacity={0.5}>{top}</text><text x={-4} y={CH} textAnchor="end" fontSize={10} fill="#fff" fillOpacity={0.5}>0</text>
          </svg>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="每秒走的路程" value={gaps(kind, Math.max(1, Math.floor(t + 1e-6))).join('、') || '—'} unit="m" />
            <ParamTile symbol="是不是匀速" value={kind === 'uniform' ? '是' : '不是'} unit={kind === 'uniform' ? '图像是一条斜直线' : '图像越来越陡'} />
          </div>
          {rows.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">怎么开</th><th className="text-right font-normal">头 4 秒每秒走的路程</th></tr></thead>
            <tbody>{rows.map(r => <tr key={r} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{NAME[r]}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{gaps(r, N).join('、')} m</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'run'} onClick={() => setGoal(N)} disabled={moving || goal > 0}>走 4 秒</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!done || dup}>记录</LabButton>
      </>}
      extras={<Control label="怎么开"><Segmented label="怎么开" pulse={next === 'kind'} want={next === 'kind' ? task!.id as Kind : null} value={kind} disabled={moving} onChange={pick} options={(['uniform', 'speeding'] as Kind[]).map(v => ({ value: v, label: NAME[v] }))} /></Control>}
    />
  )
}
