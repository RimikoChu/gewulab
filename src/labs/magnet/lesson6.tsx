// 电与磁 · 第 6 课 电磁感应：实验台第 6 格。铜棒在蹄形磁体两极之间，和灵敏电流计组成闭合电路。
// 让铜棒上下运动（顺着磁感线）、向左、向右运动（切割磁感线）；对调磁极再向左运动，看电流计的指针。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { induced, type Move } from './physics'
import { L6, Scene6 } from './scene6'
import { Bench, Place, toWorld } from './world'
import { useGoto, useSeq } from './anim'

const TASKS: Task[] = [
  { id: 'along', text: '让铜棒上下运动', note: '上下运动是顺着磁感线，不切割磁感线：没有电流' },
  { id: 'left', text: '让铜棒向左运动', note: '切割磁感线，电流计的指针偏了：产生了感应电流' },
  { id: 'right', text: '让铜棒向右运动', note: '指针向另一边偏：感应电流方向跟运动方向有关' },
  { id: 'flip', text: '对调磁极，再向左运动', note: '指针又反过来：感应电流方向跟磁场方向有关' },
]
const NAME: Record<Move, string> = { up: '上下', down: '上下', left: '向左', right: '向右' }
const side = (i: number) => (i > 0 ? '向右偏' : i < 0 ? '向左偏' : '不偏')

export default function Lesson6() {
  const [b, setB] = useState<1 | -1>(1)
  const [goal, setGoal] = useState([0, 0])
  const [k, setK] = useState(0)
  const [rows, setRows] = useState<{ move: Move; b: number; i: number }[]>([])
  const [last, setLast] = useState<{ move: Move; b: number } | null>(null)
  const T = useTasks('gewu:magnet:6', TASKS)
  const seq = useSeq()
  const pos = useGoto(goal, 7)
  const resetAll = () => { seq.stop(); setB(1); setGoal([0, 0]); pos.snap([0, 0]); setK(0); setRows([]); setLast(null); T.reset() }
  const move = (m: Move) => {
    if (seq.busy) return
    const i = induced(m, b), bb = b
    const steps: [number, () => void][] = m === 'up'
      ? [[0, () => setGoal([0, 2.6])], [450, () => setGoal([0, -2.6])], [750, () => setGoal([0, 2.6])], [750, () => setGoal([0, 0])], [700, () => {}]]
      : [[0, () => { setGoal([m === 'left' ? -7 : 7, 0]); setK(i * 0.72) }], [1100, () => setK(0)], [900, () => { setGoal([0, 0]); setK(-i * 0.16) }], [1500, () => setK(0)], [600, () => {}]]
    steps.push([0, () => { setRows(r => [...r.filter(x => !(x.move === m && x.b === bb)), { move: m, b: bb, i }]); setLast({ move: m, b: bb }) }])
    seq.run(steps)
  }
  useEffect(() => {
    if (!last) return
    if (last.move === 'up' && last.b === 1) T.check(id => id === 'along')
    if (last.move === 'left' && last.b === 1) T.check(id => id === 'left')
    if (last.move === 'right' && last.b === 1 && T.done.left) T.check(id => id === 'right')
    if (last.move === 'left' && last.b === -1 && T.done.right) T.check(id => id === 'flip')
  }, [last])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  type Next = 'up' | 'left' | 'right' | 'b' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '闭合电路的一部分导体切割磁感线，就产生感应电流。', next: null }
    if (seq.busy) return { hint: '看电流计的指针…', next: null }
    if (task.id === 'along') return { hint: '磁感线是竖直的。让铜棒上下运动', next: 'up' }
    if (task.id === 'left') return { hint: '让铜棒向左运动，切割磁感线', next: 'left' }
    if (task.id === 'right') return { hint: '让铜棒向右运动', next: 'right' }
    return b === 1 ? { hint: '把磁体翻过来，S 极在上', next: 'b' } : { hint: '磁极对调了。让铜棒向左运动', next: 'left' }
  })()

  const W = (p: [number, number, number]) => toWorld('l6', p)
  const labels: Label[] = [
    { id: 'n1', at: W([L6.g[0], 13.5, L6.g[2] - 2]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '灵敏电流计' },
    { id: 'n2', at: W([0, 16, 0]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '蹄形磁体' },
    { id: 'i', at: W([L6.g[0], 15.5, L6.g[2]]), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: Math.abs(k) > 0.3 ? 1 : 0 }, children: <><small>指针</small>{side(Math.sign(k))}</> },
  ]
  return (
    <LabShell title="电与磁" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="铜棒"
      stage={<Place at="l6" labels={labels}><Bench at="l6"><Scene6 b={b} dx={pos.x[0]} dy={pos.x[1]} k={k} /></Bench></Place>}
      lesson={<LessonBlock no="6" title="电磁感应" concept="切割磁感线，就产生感应电流" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>1831 年，英国物理学家<b className="text-white">法拉第</b>发现：闭合电路的一部分导体在磁场中做<b className="text-white">切割磁感线</b>的运动时，导体中就产生电流。这种现象叫电磁感应，产生的电流叫感应电流。</p>
          <p className="mt-3">感应电流的方向跟导体的运动方向、磁感线的方向都有关。</p>
          <p className="mt-3">两个条件缺一不可：电路要闭合；导体要切割磁感线。顺着磁感线上下运动，不切割，就没有电流。</p>
          <p className="mt-3 text-[13.5px] text-white/65">电磁感应把机械能转化为电能。发电机、动圈式话筒都是根据这个原理工作的。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种运动都试过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">闭合电路的一部分导体切割磁感线，产生感应电流</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">感应电流的方向跟导体运动方向、磁场方向有关；顺着磁感线运动不产生电流。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[12.5px] text-white/55">灵敏电流计的指针</div>
            <div className="mt-1 text-[36px] leading-none font-bold">{seq.busy ? (Math.abs(k) > 0.3 ? side(Math.sign(k)) : '不偏') : '—'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="磁场" value={b > 0 ? '向下' : '向上'} unit={b > 0 ? 'N 极在上' : 'S 极在上'} />
            <ParamTile symbol="电路" value="闭合" unit="铜棒和电流计" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">记录</h2>
          <table className="mt-2 w-full text-[14px]">
            <thead><tr className="text-white/50"><th className="py-1 text-left font-normal">运动</th><th className="text-left font-normal">磁场</th><th className="text-right font-normal">指针</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-white/10"><td className="py-1.5">{NAME[r.move]}</td><td>{r.b > 0 ? '向下' : '向上'}</td><td className="text-right font-semibold">{side(r.i)}</td></tr>)}
              {!rows.length && <tr className="border-t border-white/10 text-white/40"><td className="py-1.5" colSpan={3}>动一下铜棒，自动记下</td></tr>}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'up'} onClick={() => move('up')} disabled={seq.busy}>上下运动</LabButton>
        <LabButton primary={next === 'left'} pulse={next === 'left'} onClick={() => move('left')} disabled={seq.busy}>向左运动</LabButton>
        <LabButton pulse={next === 'right'} onClick={() => move('right')} disabled={seq.busy}>向右运动</LabButton>
      </>}
      extras={<Control label="蹄形磁体"><Segmented label="磁极" pulse={next === 'b'} want={next === 'b' ? 'S' : null} value={b > 0 ? 'N' : 'S'} disabled={seq.busy || !T.done.right} onChange={v => setB(v === 'N' ? 1 : -1)} options={[{ value: 'N', label: 'N 极在上' }, { value: 'S', label: 'S 极在上' }]} /></Control>}
    />
  )
}
