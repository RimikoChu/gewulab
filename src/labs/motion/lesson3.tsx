// 机械运动 · 第 3 课 到底谁在动（机械运动；参照物；运动和静止是相对的）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import At from './at'
import { LESSONS, goLesson } from './lessons'
import { REFS, THINGS, moving, type RefKey, type ThingKey } from './physics'
import { PLAT, TRACK, Train } from './world'

const RKEYS = Object.keys(REFS) as RefKey[], TKEYS = Object.keys(THINGS) as ThingKey[]
const TASKS: Task[] = [
  { id: 'platform', text: '让旁边的车开走；以站台为参照物，看谁在动', note: '旁边的车在动，我和站台没动' },
  { id: 'other', text: '改成以旁边那列车为参照物，再看一遍', note: '在那列车上的人看来，是我和站台在往后退' },
  { id: 'mine', text: '再以自己坐的这列车为参照物', note: '我相对自己的车没动；旁边的车在动' },
]

export default function Lesson3() {
  const [gone, setGone] = useState(false)
  const [ref, setRef] = useState<RefKey>('platform')
  const [seen, setSeen] = useState<RefKey[]>([])
  const T = useTasks('gewu:motion:3', TASKS)
  const x = useSlide(gone ? 34 : 6, 5), away = x > 8
  const look = (k: RefKey, g = gone) => { setRef(k); if (!g) return; const next = seen.includes(k) ? seen : [...seen, k]; setSeen(next); T.check(id => next.includes(id as RefKey)) }
  const depart = () => { if (gone) return; setGone(true); look(ref, true) }
  const resetAll = () => { setGone(false); setRef('platform'); setSeen([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'go' | 'ref' | null } = !task ? { hint: '三个参照物都换过了。说“动没动”之前，先说清楚跟谁比。', next: null }
    : !gone ? { hint: '按“让旁边的车开走”', next: 'go' } : ref !== task.id ? { hint: `把参照物换成“${REFS[task.id as RefKey]}”`, next: 'ref' } : { hint: '看右边的表：谁在动，谁没动', next: null }
  const labels: Label[] = [
    { id: 'me', at: [-6, PLAT + 3.4, TRACK.near], ax: 0.5, className: `scene-tag -translate-y-full${ref === 'mine' ? ' key' : ''}`, children: <><small>我坐的车</small>{gone ? (moving('me', ref) ? '运动' : '静止') : '停着'}</> },
    { id: 'ot', at: [x - 12, PLAT + 3.4, TRACK.far], ax: 0.5, className: `scene-tag -translate-y-full${ref === 'other' ? ' key' : ''}`, children: <><small>旁边的车</small>{gone ? (moving('other', ref) ? '运动' : '静止') : '停着'}</> },
    { id: 'pl', at: [-24, PLAT + 0.4, 4.5], ax: 0.5, className: `scene-tag${ref === 'platform' ? ' key' : ''}`, children: <><small>站台</small>{gone ? (moving('platform', ref) ? '运动' : '静止') : '参照物'}</> },
  ]

  return (
    <LabShell title="机械运动" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="两列车"
      stage={<At at="platform" labels={labels}><Train x={6} z={TRACK.near} /><Train x={x} z={TRACK.far} color="#f1ede4" stripe="#c9453a" /></At>}
      lesson={<LessonBlock no="3" title="到底谁在动" concept="动还是没动，要看跟谁比" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一个物体相对另一个物体的位置变了，就叫<b className="text-white">机械运动</b>。判断时被选作标准的那个物体叫<b className="text-white">参照物</b>。</p>
          <p className="mt-3">同一个物体，选的参照物不同，结论可能不一样：这就是运动和静止的<b className="text-white">相对性</b>。坐在停着的车里，看到旁边的车开走，常会觉得是自己在后退，就是因为不知不觉把那列车当成了参照物。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个参照物都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">同一个我：对站台是静止的，对开走的车是运动的</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">没有绝对的“动”和“不动”。先定参照物，再下结论。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在的参照物</div>
            <div className="mt-1 text-[28px] leading-none font-bold tracking-tight text-[#7fe3d4]">{REFS[ref]}</div>
            <div className="mt-2 text-[13px] text-white/55">{gone ? (away ? '旁边的车已经开出去了' : '旁边的车刚起步') : '两列车都还停着'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">以它为参照物</th>{TKEYS.map(k => <th key={k} className="text-center font-normal">{k === 'me' ? '我' : k === 'other' ? '旁边的车' : '站台'}</th>)}</tr></thead>
            <tbody>{RKEYS.map(rk => <tr key={rk} className={`border-t border-white/12 ${rk === ref ? 'text-white' : 'text-white/55'}`}><td className="py-1.5">{REFS[rk]}</td>{TKEYS.map(tk => <td key={tk} className="text-center font-semibold">{seen.includes(rk) ? (moving(tk, rk) ? <span className="text-[#ffb86b]">运动</span> : <span className="text-[#7fe3d4]">静止</span>) : '—'}</td>)}</tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'go'} onClick={depart} disabled={gone}>让旁边的车开走</LabButton></>}
      extras={<Control label="参照物"><Segmented label="参照物" pulse={next === 'ref'} want={next === 'ref' ? task!.id as RefKey : null} value={ref} onChange={k => look(k)} options={RKEYS.map(k => ({ value: k, label: k === 'platform' ? '站台' : k === 'mine' ? '自己的车' : '旁边的车' }))} /></Control>}
    />
  )
}
