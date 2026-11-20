// 机械运动 · 第 2 课 掐一掐时间（停表的读法：小表盘读分，大表盘读秒）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import At from './at'
import { LESSONS, goLesson } from './lessons'
import { RUNS, stopwatch, type RunKey } from './physics'
import { DESK } from './world'

const KEYS = Object.keys(RUNS) as RunKey[]
const text = (s: number) => { const r = stopwatch(s); return r.min ? `${r.min} 分 ${r.sec.toFixed(1)} 秒` : `${r.sec.toFixed(1)} 秒` }
const TASKS: Task[] = KEYS.map(k => ({ id: k, text: `给${RUNS[k].name}通过两根标杆计时，读出停表`, note: `${text(RUNS[k].seconds)}${RUNS[k].seconds > 60 ? '：小表盘走过了 1 格，是 1 分；大表盘指着 36.5 秒' : '：不到一分钟，小表盘还没走到 1'}` }))

export default function Lesson2() {
  const [run, setRun] = useState<RunKey>('fast')
  const [goal, setGoal] = useState(0)
  const [rows, setRows] = useState<RunKey[]>([])
  const T = useTasks('gewu:motion:2', TASKS)
  const total = RUNS[run].seconds, t = useSlide(goal, total / 3.2), moving = Math.abs(t - goal) > 0.02, done = goal === total && !moving
  const r = stopwatch(t), dup = rows.includes(run)
  const pick = (k: RunKey) => { if (moving) return; setRun(k); setGoal(0) }
  const record = () => { if (!done || dup) return; const next = [...rows, run]; setRows(next); T.check(id => next.includes(id as RunKey)) }
  const resetAll = () => { setRun('fast'); setGoal(0); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'run' | 'start' | 'record' | null } = !task ? { hint: '两次都读对了。先看小表盘是几分，再看大表盘是几秒。', next: null }
    : moving ? { hint: '车头过第一根标杆时按下，过第二根时再按一下…', next: null }
    : run !== task.id ? { hint: `换成“${RUNS[task.id as RunKey].name}”`, next: 'run' }
    : done && !dup ? { hint: '停表停住了：先读小表盘，再读大表盘，按“记录”', next: 'record' } : { hint: '按“开始计时”', next: 'start' }
  const hand = (deg: number, len: number, w: number, c: string, cx: number, cy: number) => <line x1={cx} y1={cy} x2={cx + Math.sin(deg * Math.PI / 180) * len} y2={cy - Math.cos(deg * Math.PI / 180) * len} stroke={c} strokeWidth={w} strokeLinecap="round" />

  return (
    <LabShell title="机械运动" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="停表"
      stage={<At at="desk" labels={[{ id: 'n', at: [DESK[0], DESK[1] + 1.0, DESK[2]], ax: 0.5, name: true, className: 'scene-name', children: '停表' }]}>
        <group position={[DESK[0], DESK[1] + 0.9, DESK[2]]} rotation-x={-0.5}>
          <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.2, 0.2, 0.05, 40]} /><meshStandardMaterial color="#c9ced2" metalness={0.8} roughness={0.3} /></mesh>
          <mesh position={[0, 0, 0.027]}><circleGeometry args={[0.18, 40]} /><meshBasicMaterial color="#f6f4ea" toneMapped={false} /></mesh>
          <mesh position={[0, 0, 0.03]} rotation-z={-(t % 60) / 60 * Math.PI * 2}><planeGeometry args={[0.008, 0.3]} /><meshBasicMaterial color="#d2362f" toneMapped={false} /></mesh>
          <mesh position={[0, 0.24, 0]}><cylinderGeometry args={[0.03, 0.03, 0.08, 12]} /><meshStandardMaterial color="#9aa3a6" metalness={0.8} roughness={0.3} /></mesh>
        </group>
      </At>}
      lesson={<LessonBlock no="2" title="掐一掐时间" concept="小表盘读分，大表盘读秒，加起来" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>停表上有两个表盘：</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">小表盘：</b>读分钟。指针走过了几格，就是几分钟</li>
            <li><b className="text-[#7fe3d4]">大表盘：</b>读秒。指针转一圈是 60 秒</li>
          </ul>
          <p className="mt-3">两个读数加起来才是测得的时间。在国际单位制里，时间的基本单位是秒（s）。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这只停表画的是大表盘一圈 60 秒的那一种。有的停表一圈是 30 秒，读法要看小表盘的指针过没过半格。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两次计时都读出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">{RUNS.slow.name}用了 {text(RUNS.slow.seconds)}，也就是 {RUNS.slow.seconds} 秒</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">超过一分钟时，别忘了把小表盘上的分钟加进去。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{RUNS[run].name} · 停表读数</div>
            <div className="mt-1 text-[36px] leading-none font-bold tracking-tight tabular-nums">{goal ? text(t) : '—'}</div>
          </div>
          <svg viewBox="0 0 200 200" className="mx-auto mt-3 w-[190px]" role="img" aria-label="停表的表盘">
            <circle cx={100} cy={100} r={94} fill="#f6f4ea" stroke="#c9ced2" strokeWidth={6} />
            {Array.from({ length: 60 }, (_, i) => { const a = i * 6 * Math.PI / 180, r0 = i % 5 ? 84 : 78; return <line key={i} x1={100 + Math.sin(a) * r0} y1={100 - Math.cos(a) * r0} x2={100 + Math.sin(a) * 90} y2={100 - Math.cos(a) * 90} stroke="#30343a" strokeWidth={i % 5 ? 0.8 : 1.8} /> })}
            {[0, 10, 20, 30, 40, 50].map(s => { const a = s * 6 * Math.PI / 180; return <text key={s} x={100 + Math.sin(a) * 68} y={104 - Math.cos(a) * 68} textAnchor="middle" fontSize={12} fill="#30343a">{s || 60}</text> })}
            <circle cx={100} cy={62} r={22} fill="#fff" stroke="#30343a" strokeWidth={1} />
            {[0, 1, 2, 3, 4].map(m => { const a = m * 72 * Math.PI / 180; return <text key={m} x={100 + Math.sin(a) * 15} y={65 - Math.cos(a) * 15} textAnchor="middle" fontSize={8} fill="#30343a">{m}</text> })}
            {hand(t / 60 * 72, 14, 1.8, '#1f6feb', 100, 62)}
            {hand((t % 60) * 6, 74, 2.2, '#d2362f', 100, 100)}<circle cx={100} cy={100} r={4} fill="#30343a" />
          </svg>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="小表盘" value={goal ? `${r.min} 分` : '—'} unit="蓝针，读分钟" />
            <ParamTile symbol="大表盘" value={goal ? `${r.sec.toFixed(1)} 秒` : '—'} unit="红针，读秒" />
          </div>
          {rows.length > 0 && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">列车</th><th className="text-right font-normal">停表读数</th><th className="text-right font-normal">合多少秒</th></tr></thead>
            <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{RUNS[k].name}</td><td className="text-right font-semibold text-[#7fe3d4]">{text(RUNS[k].seconds)}</td><td className="text-right tabular-nums">{RUNS[k].seconds.toFixed(1)} s</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'start'} onClick={() => setGoal(total)} disabled={moving || goal > 0}>开始计时</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!done || dup}>记录</LabButton>
      </>}
      extras={<Control label="列车"><Segmented label="列车" pulse={next === 'run'} want={next === 'run' ? task!.id as RunKey : null} value={run} disabled={moving} onChange={pick} options={KEYS.map(k => ({ value: k, label: RUNS[k].name }))} /></Control>}
    />
  )
}
