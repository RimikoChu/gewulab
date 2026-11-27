// 万有引力与航天 · 第 5 课 宇宙速度（牛顿的大炮；第一、二、三宇宙速度）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene5, { FATE_COLOR, SHOT_SECONDS } from './scene5'
import { LESSONS, goLesson } from './lessons'
import { SHOTS, cannonRange, g, km, shotFate, v1, v1FromG, v2, type Shot } from './physics'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: '2000', text: '用 2 km/s 开一炮', note: '炮弹沿曲线落回地面，落在约 630 km 外' },
  { id: '6000', text: '加到 6 km/s 再开一炮', note: '打得越快，落得越远：6 km/s 落到了 2900 km 外' },
  { id: '7900', text: '加到 7.9 km/s', note: '炮弹落不下来了：它绕地球一圈，回到了山顶' },
  { id: '11200', text: '加到 11.2 km/s', note: '炮弹一去不回：挣脱了地球的引力' },
]
const FATE = { fall: '落回地面', orbit: '绕地球转', escape: '一去不回' }

export default function Lesson5() {
  const [v, setV] = useState<Shot>(2000)
  const [shots, setShots] = useState<{ v: Shot; start: number; done: boolean }[]>([])
  const T = useTasks('gewu:gravity:5', TASKS)
  const flying = shots.find(s => !s.done)
  useEffect(() => {
    if (!flying) return
    const t = setTimeout(() => { setShots(a => a.map(s => s === flying ? { ...s, done: true } : s)); T.check(id => id === String(flying.v)) }, SHOT_SECONDS[shotFate(flying.v)] * 1000 + 200)
    return () => clearTimeout(t)
  }, [flying])   // eslint-disable-line react-hooks/exhaustive-deps
  const fired = shots.some(s => s.v === v)
  const fire = () => { if (flying || fired) return; setShots(a => [...a, { v, start: performance.now(), done: false }]) }
  const resetAll = () => { setV(2000); setShots([]); T.reset() }
  const task = T.current, last = [...shots].reverse().find(s => s.done)
  const { hint, next }: { hint: string; next: 'pick' | 'fire' | null } = (() => {
    if (!task) return { hint: '都做完了。7.9 km/s 绕地球转，11.2 km/s 一去不回。', next: null }
    if (flying) return { hint: '炮弹在飞…', next: null }
    if (String(v) !== task.id) return { hint: `把出口速度调到 ${(+task.id / 1000).toFixed(1)} km/s`, next: 'pick' }
    return { hint: '开炮', next: 'fire' }
  })()
  const show = last ?? null
  const range = show ? cannonRange(show.v) : null
  return (
    <LabShell narration={voiced(NARRATION['5'], VOICE)} title="万有引力与航天" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="大炮"
      stage={<Scene5 shots={shots} wide={!!T.done['6000']} />}
      lesson={<LessonBlock no="5" title="宇宙速度" concept="抛得越快落得越远，快到 7.9 km/s 就绕着地球转" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>牛顿设想：在高山上水平抛出物体，速度越大落得越远；速度足够大时，物体永远落不到地面，绕地球转起来，成为人造地球卫星。</p>
          <p className="mt-2"><b className="text-white">第一宇宙速度</b> v₁ = √(GM/R) = √(gR) = 7.9 km/s：卫星贴着地面绕地球的速度，是最小的发射速度、最大的环绕速度。</p>
          <p className="mt-2"><b className="text-white">第二宇宙速度</b> 11.2 km/s：达到它，就挣脱地球引力，不再绕地球转。</p>
          <p className="mt-2"><b className="text-white">第三宇宙速度</b> 16.7 km/s：达到它，就挣脱太阳引力，飞到太阳系外。</p>
          <p className="mt-3 text-[13.5px] text-white/65">高山是想象的，画得夸张了；不计空气阻力。山顶比地面高，所以 7.9 km/s 在这里绕出的是一个稍扁的圈。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="px-6 py-5">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四炮都打完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">第一宇宙速度 7.9 km/s，第二 11.2 km/s，第三 16.7 km/s</p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/70">不到 7.9 km/s 会落回地面；7.9 到 11.2 km/s 之间绕地球转；达到 11.2 km/s 就飞离地球。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{show ? `${km(show.v).toFixed(1)} km/s 的这一炮` : '还没开炮'}</div>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight" style={{ color: show ? FATE_COLOR[shotFate(show.v)] : undefined }}>{show ? FATE[shotFate(show.v)] : '—'}</div>
            {range != null && <div className="mt-2 text-[15px] text-white/75 tabular-nums">落在 {Math.round(km(range)).toLocaleString()} km 外</div>}
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">宇宙速度</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="v₁" value={km(v1()).toFixed(1)} unit="km/s · 绕地球" />
            <ParamTile symbol="v₂" value={km(v2()).toFixed(1)} unit="km/s · 离开地球" />
            <ParamTile symbol="v₃" value="16.7" unit="km/s · 离开太阳系" />
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-white/60">v₁ = √(gR) = √({g} × 6.37 × 10⁶) m/s ≈ {km(v1FromG()).toFixed(1)} km/s</p>
          {shots.length > 0 && <table className="mt-3 w-full text-[13.5px] tabular-nums">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">出口速度</th><th className="font-normal">结果</th><th className="text-right font-normal">射程</th></tr></thead>
            <tbody>{shots.filter(s => s.done).map(s => { const f = shotFate(s.v), r = cannonRange(s.v); return <tr key={s.v} className="row-in border-t border-white/12"><td className="py-1.5">{km(s.v).toFixed(1)} km/s</td><td style={{ color: FATE_COLOR[f] }}>{FATE[f]}</td><td className="text-right">{r != null ? `${Math.round(km(r)).toLocaleString()} km` : '—'}</td></tr> })}</tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'fire'} onClick={fire} disabled={!!flying || fired}>开炮</LabButton>
      </>}
      extras={
        <Control label="出口速度">
          <Segmented label="出口速度" pulse={next === 'pick'} want={task ? task.id as `${Shot}` : null} value={String(v) as `${Shot}`} onChange={k => setV(+k as Shot)} options={SHOTS.map(s => ({ value: String(s) as `${Shot}`, label: `${km(s).toFixed(1)} km/s` }))} />
        </Control>
      }
    />
  )
}
