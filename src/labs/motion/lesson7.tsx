// 机械运动 · 第 7 课 赶火车（平均速度的计算；列车过桥）
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import At from './at'
import { LESSONS, goLesson } from './lessons'
import { BRIDGE, TRIP, bridgeTime, bridgeTimeWrong, toMs, tripSpeed } from './physics'
import { LINE, Train, lineX } from './world'

const TASKS: Task[] = [
  { id: 'trip', text: '看时刻表：算这趟车的平均速度', note: `${TRIP.km} km ÷ ${TRIP.hours} h = ${tripSpeed()} km/h，约 ${toMs(tripSpeed()).toFixed(1)} m/s` },
  { id: 'bridge', text: '算整列车完全通过大桥要多久', note: `（${BRIDGE.bridge} + ${BRIDGE.train}）m ÷ ${BRIDGE.v} m/s = ${bridgeTime()} s：要加上车长` },
]

export default function Lesson7() {
  const [trip, setTrip] = useState(false)
  const [goal, setGoal] = useState(0)
  const T = useTasks('gewu:motion:7', TASKS)
  const t = useSlide(goal, 13), moving = Math.abs(t - goal) > 0.01, crossed = goal > 0 && !moving
  const head = BRIDGE.v * t          // 车头离桥头多远（m）
  const doTrip = () => { setTrip(true); T.check(id => id === 'trip') }
  const doBridge = () => { if (goal) return; setGoal(bridgeTime()); setTimeout(() => T.check(id => id === 'trip' ? trip : true), 3300) }
  const resetAll = () => { setTrip(false); setGoal(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'trip' | 'bridge' | null } = !task ? { hint: '两道题都算完了。过桥要从车头上桥算到车尾下桥。', next: null }
    : task.id === 'trip' ? { hint: '按“算平均速度”', next: 'trip' } : moving ? { hint: '车头上桥开始计时，车尾下桥才算过完', next: null } : { hint: '按“算过桥时间”', next: 'bridge' }
  const labels: Label[] = [
    { id: 'b0', at: [lineX(0), 3, LINE.z + 2.6], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '桥头' },
    { id: 'b1', at: [lineX(BRIDGE.bridge), 3, LINE.z + 2.6], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `桥尾 · 桥长 ${BRIDGE.bridge} m` },
    { id: 't', at: [lineX(head - BRIDGE.train / 2), 5.4, LINE.z], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>车长 {BRIDGE.train} m</small>{goal ? `${t.toFixed(0)} s` : `${BRIDGE.v} m/s`}</> },
  ]

  return (
    <LabShell title="机械运动" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="算一算"
      stage={<At at="line" labels={labels}>
        <Train x={lineX(head)} z={LINE.z} len={BRIDGE.train * LINE.scale / 0.8} s={0.8} y={0.3} />
        {/* 大桥：正线下面的一排桥墩和桥面 */}
        <mesh position={[lineX(BRIDGE.bridge / 2), -0.2, LINE.z]}><boxGeometry args={[BRIDGE.bridge * LINE.scale, 0.5, 3]} /><meshStandardMaterial color="#c9c7bf" roughness={0.8} /></mesh>
        {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[lineX(i * 200), -2.4, LINE.z]}><boxGeometry args={[1.2, 4, 2.4]} /><meshStandardMaterial color="#aeaba3" roughness={0.9} /></mesh>)}
        <mesh position={[lineX(BRIDGE.bridge / 2), -4.3, LINE.z]} rotation-x={-Math.PI / 2}><planeGeometry args={[BRIDGE.bridge * LINE.scale + 30, 30]} /><meshStandardMaterial color="#3f86b8" roughness={0.2} /></mesh>
      </At>}
      lesson={<LessonBlock no="7" title="赶火车" concept="用 v = s/t 解决路上的问题" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">时刻表：</b>两站相距 {TRIP.km} km，列车用了 {TRIP.hours} h。平均速度 = 总路程 ÷ 总时间，中途停站的时间也算在里面。</p>
          <p className="mt-3"><b className="text-white">过桥：</b>“完全通过”是从车头上桥到车尾离桥。这段时间里列车走的路程是<b className="text-white">桥长加车长</b>，不只是桥长。</p>
          <p className="mt-3 text-[13.5px] text-white/65">站名、里程、车长、桥长都是为了好算取的整数，不是真实的线路。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两道题都算对了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">过桥用 {bridgeTime()} 秒，不是 {bridgeTimeWrong().toFixed(0)} 秒</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">少算的那 {(bridgeTime() - bridgeTimeWrong()).toFixed(0)} 秒，是车身自己还在桥上的时间。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">时刻表</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">站</th><th className="text-right font-normal">时刻</th><th className="text-right font-normal">里程</th></tr></thead>
            <tbody>
              <tr className="border-t border-white/12"><td className="py-1.5 text-white/80">甲站 开</td><td className="text-right tabular-nums">08:00</td><td className="text-right tabular-nums">0 km</td></tr>
              <tr className="border-t border-white/12"><td className="py-1.5 text-white/80">乙站 到</td><td className="text-right tabular-nums">09:30</td><td className="text-right tabular-nums">{TRIP.km} km</td></tr>
            </tbody>
          </table>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="平均速度" value={trip ? `${tripSpeed()}` : '—'} unit="km/h" />
            <ParamTile symbol="合" value={trip ? toMs(tripSpeed()).toFixed(1) : '—'} unit="m/s" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">过桥</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="要走的路程" value={crossed ? `${BRIDGE.bridge + BRIDGE.train}` : '—'} unit="m · 桥长 + 车长" />
            <ParamTile symbol="过桥时间" value={crossed ? `${bridgeTime()}` : '—'} unit={`s · 速度 ${BRIDGE.v} m/s`} />
          </div>
          {crossed && <p className="row-in mt-3 rounded-xl bg-white/6 px-3 py-2.5 text-[13.5px] leading-relaxed text-white/75">只用桥长算会得到约 {bridgeTimeWrong().toFixed(1)} s：那时车头刚到桥尾，车身还在桥上。</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={!trip} pulse={next === 'trip'} onClick={doTrip} disabled={trip}>算平均速度</LabButton>
        <LabButton primary={trip} pulse={next === 'bridge'} onClick={doBridge} disabled={goal > 0}>算过桥时间</LabButton>
      </>}
      extras={null}
    />
  )
}
