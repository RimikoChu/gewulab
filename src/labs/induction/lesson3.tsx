// 电磁感应和电网 · 第 3 课 楞次定律：实验室第三张台。N 极、S 极各插入、拔出一次，看感应电流的方向和线圈两端的极性：
// 蓝色是磁铁的磁场，橙色是感应电流的磁场。磁通量增大时两者反向，减小时同向；磁铁靠近被推开，离开被拉住。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { CASES, DEPTH, LENZ, coilLines, galvo, lenz, type Move, type Pole } from './physics'
import { COIL_TOP } from './coilrig'
import { Rig3 } from './scene3'
import { Place } from './world'
import { COL, ST } from './layout'

const key = (p: Pole, m: Move) => `${p}${m}`
const TASKS: Task[] = [
  { id: 'Nin', text: 'N 极朝下，插入线圈', note: '磁通量增大，感应电流的磁场和原磁场反向：线圈上端成了 N 极，推开磁铁' },
  { id: 'Nout', text: '把 N 极拔出来', note: '磁通量减小，感应电流的磁场和原磁场同向：线圈上端成了 S 极，拉住磁铁' },
  { id: 'Sin', text: '换成 S 极朝下，插入', note: '原磁场反了，感应电流也反了：上端是 S 极，又是推开' },
  { id: 'Sout', text: '把 S 极拔出来', note: '上端成了 N 极，又是拉住：增反减同，来拒去留' },
]
const X = ST.l3, V = LENZ.v

export default function Lesson3() {
  const [pole, setPole] = useState<Pole>('N')
  const [goal, setGoal] = useState(0)
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:induction:3', TASKS)
  const d = useSlide(goal, V), moving = Math.abs(d - goal) > 1e-4
  const move: Move = goal > 0 ? 'in' : 'out', L = lenz(pole, move)
  const mag = moving ? Math.abs(galvo(d, V, LENZ.gain)) : 0, needle = L.needle * mag
  useEffect(() => {
    if (moving) return
    const id = key(pole, move)
    if (rows.length === 0 && id === 'Nout') return   // 刚进来时磁铁在外面，不算拔出
    if (!rows.includes(id) && d === goal && (goal > 0 || rows.includes(key(pole, 'in')))) { const n = [...rows, id]; setRows(n); T.check(t => n.includes(t)) }
  }, [moving])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setPole('N'); setGoal(0); setRows([]); T.reset() }

  const task = T.current
  type Next = 'in' | 'out' | 'pole' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '感应电流的磁场总要阻碍引起感应电流的磁通量的变化。', next: null }
    if (moving) return { hint: `${pole} 极${goal > 0 ? '往里插' : '往外拔'}：看橙色的感应磁场朝哪…`, next: null }
    const want = task.id[0] as Pole, wm = task.id.slice(1) as Move
    if (pole !== want) return goal > 0 ? { hint: '先把磁铁拔出来', next: 'out' } : { hint: `把磁铁换成 ${want} 极朝下`, next: 'pole' }
    if (wm === 'in') return goal > 0 ? { hint: '先把磁铁拔出来', next: 'out' } : { hint: `把 ${want} 极插进线圈`, next: 'in' }
    return { hint: `把 ${want} 极拔出来`, next: 'out' }
  })()

  const show = moving && mag > 0.03
  const labels: Label[] = [
    { id: 'top', at: [X - 0.045, COIL_TOP + 0.004, 0.02], ax: 1, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: show ? 1 : 0 }, children: <><small>线圈上端</small>{L.top} 极</> },
    { id: 'f', at: [X - 0.03, COIL_TOP + 0.14 - d, 0], ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: show ? 1 : 0 }, children: L.repel ? '相斥 · 阻碍靠近' : '相吸 · 阻碍离开' },
    { id: 'n2', at: [X + 0.27, 0.99, 0.05], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '灵敏电流计' },
  ]
  const cell = (id: string) => { const [p, m] = [id[0] as Pole, id.slice(1) as Move], r = lenz(p, m); return { p, m, r } }
  return (
    <LabShell title="电磁感应和电网" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="磁铁"
      stage={<Place at="l3" cur="l3" labels={labels}><Rig3 d={d} pole={pole} needle={needle} flow={needle * 3} lines={coilLines(d)} induced={show ? (L.inducedDown ? -1 : 1) : 0} inducedN={Math.round(Math.min(10, mag * 12))} /></Place>}
      lesson={<LessonBlock no="3" title="楞次定律" concept="感应电流的磁场总要阻碍磁通量的变化" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">楞次定律</b>：感应电流具有这样的方向，即感应电流的磁场总要阻碍引起感应电流的磁通量的变化。</p>
          <p className="mt-3">用法分三步：先看原磁场的方向和磁通量是增大还是减小；再定感应电流的磁场方向（增反减同）；最后用安培定则（右手螺旋定则）由感应磁场的方向定出感应电流的方向。</p>
          <p className="mt-3">从相对运动看：磁铁靠近线圈时线圈推开它，离开时线圈拉住它，“来拒去留”。这种阻碍要靠外力做功来克服，电能就是这样从机械能转化来的。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种情况都看过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">增反减同，来拒去留</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">插入时线圈上端和磁铁下端同名，相斥；拔出时异名，相吸。感应电流的磁场总在阻碍磁通量的变化。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/55">感应电流的磁场</div>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight" style={{ color: show ? COL.Bi : undefined }}>{show ? (L.inducedDown ? '向下' : '向上') : '—'}</div>
            <div className="mt-1.5 text-[13px] text-white/55">{show ? `原磁场${L.fieldDown ? '向下' : '向上'}，磁通量${L.grow ? '增大：反向' : '减小：同向'}` : '磁铁不动，没有感应电流'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">记录（俯视看感应电流）</h2>
          <table className="mt-2 w-full text-[13px]">
            <thead className="text-white/50"><tr><th className="py-1 text-left font-normal">磁铁</th><th className="text-left font-normal">Φ</th><th className="text-left font-normal">感应磁场</th><th className="text-left font-normal">电流</th><th className="text-right font-normal">上端</th></tr></thead>
            <tbody>{CASES.map(([p, m]) => { const id = key(p, m), on = rows.includes(id), { r } = cell(id); return <tr key={id} className={cn('border-t border-white/10', !on && 'text-white/30')}>
              <td className="py-1">{p} 极{m === 'in' ? '插入' : '拔出'}</td><td>{on ? (r.grow ? '增大' : '减小') : '—'}</td><td>{on ? (r.inducedDown ? '向下' : '向上') : '—'}</td><td>{on ? (r.ccw ? '逆时针' : '顺时针') : '—'}</td><td className="text-right">{on ? `${r.top}（${r.repel ? '斥' : '吸'}）` : '—'}</td>
            </tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'in'} pulse={next === 'in'} onClick={() => setGoal(DEPTH)} disabled={moving || goal > 0}>插入磁铁</LabButton>
        <LabButton primary={next === 'out'} pulse={next === 'out'} onClick={() => setGoal(0)} disabled={moving || goal === 0}>拔出磁铁</LabButton>
      </>}
      extras={<Control label="朝下的一极"><Segmented label="朝下的一极" pulse={next === 'pole'} want={next === 'pole' ? (task?.id[0] as Pole) : null} value={pole} onChange={p => setPole(p as Pole)} disabled={moving || goal > 0} options={[{ value: 'N', label: 'N 极' }, { value: 'S', label: 'S 极' }]} /></Control>}
    />
  )
}
