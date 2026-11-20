// 机械运动 · 第 4 课 谁跑得快（速度；v = s/t；单位换算）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import At from './at'
import { LESSONS, goLesson } from './lessons'
import { TRAINS, distance, speed, toMs, type TrainKey } from './physics'
import { LINE, Train, lineX } from './world'

const KEYS = Object.keys(TRAINS) as TrainKey[], T10 = 10
const TASKS: Task[] = KEYS.map(k => ({ id: k, text: `让${TRAINS[k].name}跑 ${T10} 秒，记下路程`, note: `${distance(k, T10).toFixed(0)} m ÷ ${T10} s ≈ ${toMs(TRAINS[k].kmh).toFixed(1)} m/s，也就是 ${TRAINS[k].kmh} km/h` }))
const TINT: Record<TrainKey, string> = { hsr: '#2f7fb8', normal: '#3d9a5f', freight: '#b0703a' }

export default function Lesson4() {
  const [train, setTrain] = useState<TrainKey>('hsr')
  const [goal, setGoal] = useState(0)
  const [rows, setRows] = useState<TrainKey[]>([])
  const T = useTasks('gewu:motion:4', TASKS)
  const t = useSlide(goal, 3.2), moving = Math.abs(t - goal) > 0.01, done = goal === T10 && !moving
  const s = distance(train, t), dup = rows.includes(train)
  const pick = (k: TrainKey) => { if (moving) return; setTrain(k); setGoal(0) }
  const record = () => { if (!done || dup) return; const next = [...rows, train]; setRows(next); T.check(id => next.includes(id as TrainKey)) }
  const resetAll = () => { setTrain('hsr'); setGoal(0); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'train' | 'run' | 'record' | null } = !task ? { hint: '三列车都记完了。时间一样，走得远的快。', next: null }
    : moving ? { hint: goal ? '计时中：看它过了几根里程桩' : '回到起点…', next: null }
    : train !== task.id ? { hint: `换成“${TRAINS[task.id as TrainKey].name}”`, next: 'train' }
    : done && !dup ? { hint: `${T10} 秒走了 ${s.toFixed(0)} m：按“记录”`, next: 'record' } : { hint: `按“跑 ${T10} 秒”`, next: 'run' }
  const labels: Label[] = [
    { id: 's', at: [lineX(s), 4.6, LINE.z], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>{t.toFixed(1)} s</small>{s.toFixed(0)} m</> },
    ...[0, 500, 1000].map((m): Label => ({ id: `m${m}`, at: [lineX(m), 2.6, LINE.z + 2.6], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `${m} m` })),
  ]

  return (
    <LabShell title="机械运动" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="列车"
      stage={<At at="line" labels={labels}><Train x={lineX(s)} z={LINE.z} len={25} s={0.8} stripe={TINT[train]} y={0.3} /></At>}
      lesson={<LessonBlock no="4" title="谁跑得快" concept="速度 = 路程 ÷ 时间" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>比较快慢有两种办法：时间相同，看谁走得远；路程相同，看谁用的时间少。把两种办法合起来，就是<b className="text-white">速度</b>：路程和时间的比，v = s/t。</p>
          <p className="mt-3">速度的单位是米每秒（m/s）；交通上常用千米每小时（km/h）。<b className="text-white">1 m/s = 3.6 km/h</b>。</p>
          <p className="mt-3 text-[13.5px] text-white/65">画面里的线路按 1∶10 缩小了，读数是真实的路程。三种速度取的是方便换算的数。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三列车都跑完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">同样 {T10} 秒：{KEYS.map(k => `${distance(k, T10).toFixed(0)} m`).join('、')}</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">路程除以时间就是速度。高铁每秒走 {toMs(TRAINS.hsr.kmh).toFixed(1)} m，货运列车每秒走 {toMs(TRAINS.freight.kmh).toFixed(0)} m。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">v = s / t</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{done || dup ? speed(distance(train, T10), T10).toFixed(1) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m/s</span></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol="s" value={s.toFixed(0)} unit="m · 路程" />
            <ParamTile symbol="t" value={t.toFixed(1)} unit="s · 时间" />
            <ParamTile symbol="合" value={done || dup ? String(TRAINS[train].kmh) : '—'} unit="km/h" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每列车跑完 {T10} 秒后按“记录”。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">列车</th><th className="text-right font-normal">路程</th><th className="text-right font-normal">m/s</th><th className="text-right font-normal">km/h</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{TRAINS[k].name}</td><td className="text-right tabular-nums">{distance(k, T10).toFixed(0)} m</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{toMs(TRAINS[k].kmh).toFixed(1)}</td><td className="text-right tabular-nums">{TRAINS[k].kmh}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'run'} onClick={() => setGoal(T10)} disabled={moving || goal > 0}>跑 {T10} 秒</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!done || dup}>记录</LabButton>
      </>}
      extras={<Control label="列车"><Segmented label="列车" pulse={next === 'train'} want={next === 'train' ? task!.id as TrainKey : null} value={train} disabled={moving} onChange={pick} options={KEYS.map(k => ({ value: k, label: TRAINS[k].name }))} /></Control>}
    />
  )
}
