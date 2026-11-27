// 万有引力与航天 · 第 6 课 人造卫星（v、ω、T 随轨道半径的变化；同步卫星）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene6 from './scene6'
import { LESSONS, goLesson } from './lessons'
import { ORBITS, circT, circV, circW, height, km, type OrbitKey } from './physics'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'leo', text: '选近地轨道，记下 v、ω、T', note: '近地轨道：7.71 km/s，一个半小时绕一圈' },
  { id: 'meo', text: '换成中圆轨道，再记一次', note: '高了，速度降到 3.78 km/s，周期变成 12.9 小时' },
  { id: 'geo', text: '换成同步轨道，再记一次', note: '同步轨道周期正好 24 小时，和地球自转一样：卫星总在赤道上同一点的上空' },
]
const KEYS = Object.keys(ORBITS) as OrbitKey[]
const hours = (s: number) => (s / 3600).toFixed(s < 36000 ? 2 : 1)
const rad = (w: number) => (w * 1e4).toFixed(w < 1e-4 ? 3 : 2)

export default function Lesson6() {
  const [focus, setFocus] = useState<OrbitKey>('leo')
  const [rows, setRows] = useState<OrbitKey[]>([])
  const T = useTasks('gewu:gravity:6', TASKS)
  const dup = rows.includes(focus)
  const record = () => { if (dup) return; const n = [...rows, focus]; setRows(n); T.check(id => n.includes(id as OrbitKey)) }
  const resetAll = () => { setFocus('leo'); setRows([]); T.reset() }
  const task = T.current, r = ORBITS[focus].r
  const { hint, next }: { hint: string; next: 'pick' | 'record' | null } = (() => {
    if (!task) return { hint: '都做完了。看同步卫星：它一直停在那个黄色标记的正上方。', next: null }
    if (focus !== task.id) return { hint: `把卫星换到${ORBITS[task.id as OrbitKey].name}`, next: 'pick' }
    return dup ? { hint: '这条轨道记过了', next: null } : { hint: '看它转得多快，记下 v、ω、T', next: 'record' }
  })()
  return (
    <LabShell narration={voiced(NARRATION['6'], VOICE)} title="万有引力与航天" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="数据"
      stage={<Scene6 focus={focus} />}
      lesson={<LessonBlock no="6" title="人造卫星" concept="轨道越高，卫星越慢，转一圈越久" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>卫星绕地球做匀速圆周运动，万有引力提供向心力：</p>
          <p className="my-2 text-center font-formula text-[18px] italic">GMm/r² = mv²/r = mω²r = m(2π/T)²r</p>
          <p>得 v = √(GM/r)，ω = √(GM/r³)，T = 2π√(r³/GM)：r 越大，v、ω 越小，T 越大——“高轨低速长周期”。</p>
          <p className="mt-2"><b className="text-white">同步卫星：</b>周期和地球自转相同（24 h），轨道在赤道平面内，离地面约 3.6 × 10⁴ km，相对地面静止。</p>
          <p className="mt-3 text-[13.5px] text-white/65">画面里轨道半径之比是真实的，卫星画大了；转动按真实的快慢之比加快了。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="px-6 py-5">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三条轨道都记下了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">高轨低速长周期；同步卫星 24 小时一圈，在赤道上空约 3.6 万千米</p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/70">从近地到同步，轨道半径大了 6 倍多，速度降到不到一半，周期长了十几倍。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{ORBITS[focus].name}上的线速度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{km(circV(r)).toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">km/s</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="r" value={Math.round(km(r)).toLocaleString()} unit="km · 轨道半径" />
            <ParamTile symbol="ω" value={rad(circW(r))} unit="×10⁻⁴ rad/s" />
            <ParamTile symbol="T" value={hours(circT(r))} unit="小时" />
          </div>
          <p className="mt-2 text-[13px] text-white/55">离地面 {Math.round(km(height(r))).toLocaleString()} km</p>
          <div className="mt-4 flex items-baseline justify-between"><h2 className="text-[12.5px] text-white/55">数据表</h2></div>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">选好轨道，按“记录数据”。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">轨道</th><th className="font-normal">r/km</th><th className="font-normal">v/(km/s)</th><th className="text-right font-normal">T/h</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{ORBITS[k].name}</td><td>{Math.round(km(ORBITS[k].r)).toLocaleString()}</td><td className="font-semibold text-[#7fe3d4]">{km(circV(ORBITS[k].r)).toFixed(2)}</td><td className="text-right font-semibold text-[#7fe3d4]">{hours(circT(ORBITS[k].r))}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="轨道">
          <Segmented label="轨道" pulse={next === 'pick'} want={(task?.id as OrbitKey) ?? null} value={focus} onChange={k => setFocus(k as OrbitKey)} options={KEYS.map(k => ({ value: k, label: ORBITS[k].name }))} />
        </Control>
      }
    />
  )
}
