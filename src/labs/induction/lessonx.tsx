// 电磁感应和电网 · 拓展课 涡流和电磁阻尼：实验室最东头的一张台。强磁铁从有机玻璃管和铝管里各落一次，比下落时间；
// 再给跳环装置的线圈通电，看闭合铝环和开口铝环。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { G, PIPE, fallDist, fallTime } from './physics'
import { RX, RigX, type Pipe } from './scenex'
import { Place } from './world'
import { ST, TOP } from './layout'

type Ex = 'plastic' | 'alu' | 'closed' | 'open'
const TASKS: Task[] = [
  { id: 'plastic', text: '让磁铁从有机玻璃管里落下', note: `落 ${PIPE.h} m 只要 ${fallTime('plastic').toFixed(2)} s，和自由落体一样` },
  { id: 'alu', text: '换铝管，再放一次', note: '慢得多：磁铁在铝管壁里激起涡流，涡流的磁场阻碍它下落' },
  { id: 'closed', text: '给线圈通电，看闭合铝环', note: '铝环一下子跳起来：感应电流的磁场和线圈的磁场相斥' },
  { id: 'open', text: '换开口铝环，再通电', note: '开口铝环不动：回路不闭合，没有感应电流' },
]
const NAMES: Record<Ex, string> = { plastic: '有机玻璃管', alu: '铝管', closed: '闭合铝环', open: '开口铝环' }
const X = ST.x

export default function LessonX() {
  const [ex, setEx] = useState<Ex>('plastic')
  const [t, setT] = useState<number | null>(null)       // 从放手（或通电）起过了多久
  const [times, setTimes] = useState<Partial<Record<Pipe, number>>>({})
  const T = useTasks('gewu:induction:x', TASKS)
  const t0 = useRef(0)
  const pipe = ex === 'plastic' || ex === 'alu', dur = pipe ? fallTime(ex as Pipe) : 1.4, busy = t !== null && t < dur + 0.6
  useEffect(() => {
    if (t === null) return
    let raf = 0
    const f = () => { const s = (performance.now() - t0.current) / 1000; setT(s); if (s < dur + 0.6) raf = requestAnimationFrame(f); else { if (pipe) setTimes(m => ({ ...m, [ex]: dur })); T.check(id => id === ex) } }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [t === null])   // eslint-disable-line react-hooks/exhaustive-deps
  const go = () => { if (busy) return; t0.current = performance.now(); setT(0) }
  const choose = (e: Ex) => { setEx(e); setT(null) }
  const resetAll = () => { setEx('plastic'); setT(null); setTimes({}); T.reset() }

  const task = T.current
  type Next = 'go' | 'ex' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '变化的磁场在导体里激起涡流，涡流的磁场阻碍相对运动。', next: null }
    if (busy) return { hint: pipe ? `磁铁在${NAMES[ex]}里往下落…` : `线圈通电了，看${NAMES[ex]}…`, next: null }
    if (ex !== task.id) return { hint: `换成${NAMES[task.id as Ex]}`, next: 'ex' }
    return pipe ? { hint: `松手，让磁铁从${NAMES[ex]}里落下`, next: 'go' } : { hint: `给线圈通电，看${NAMES[ex]}`, next: 'go' }
  })()

  const s = t ?? 0, d = pipe && t !== null ? fallDist(ex as Pipe, Math.min(s, dur)) : 0
  const drop: [number, number] = [ex === 'plastic' ? d : 0, ex === 'alu' ? d : 0]
  const ringT = !pipe && t !== null ? Math.min(s, 1.4) : 0
  const lift = ex === 'closed' && ringT > 0 ? 0.2 * Math.sin(Math.PI * ringT / 1.4) : 0
  const pulse = !pipe && t !== null && s < 1.4 ? 1 : 0
  const labels: Label[] = [
    { id: 'p', at: [X + RX.pipes[0] - 0.02, RX.base + PIPE.h + 0.06, 0], ax: 1, name: true, className: 'scene-name -translate-y-full', children: '有机玻璃管' },
    { id: 'a', at: [X + RX.pipes[1] + 0.02, RX.base + PIPE.h + 0.06, 0], ax: 0, name: true, className: 'scene-name -translate-y-full', children: '铝管（剖开）' },
    { id: 'r', at: [X + RX.ring[0], TOP + RX.coreH + 0.08, RX.ring[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '跳环装置' },
    { id: 't', at: [X + (pipe ? RX.pipes[ex === 'alu' ? 1 : 0] + 0.04 : RX.ring[0] + 0.08), pipe ? RX.base + PIPE.h - d : TOP + 0.2 + lift, 0], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: t !== null ? 1 : 0 }, children: pipe ? <><small>t</small>{Math.min(s, dur).toFixed(2)} s</> : <>{ex === 'closed' ? '跳起来了' : '不动'}</> },
  ]
  return (
    <LabShell title="电磁感应和电网" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={pipe ? '磁铁' : '线圈'}
      stage={<Place at="x" cur="x" labels={labels}><RigX drop={drop} held={pipe && t === null ? (ex as Pipe) : null} lift={lift} open={ex === 'open'} pulse={pulse} eddy={ex === 'alu' && t !== null && s < dur ? 1 : 0} /></Place>}
      lesson={<LessonBlock no="拓展" title="涡流和电磁阻尼" concept="涡流的磁场总在阻碍相对运动" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>整块的导体放在变化的磁场里，导体内部会产生一圈圈旋涡状的感应电流，叫<b className="text-white">涡流</b>。</p>
          <p className="mt-3">磁铁在铝管里下落，磁铁下方的管壁磁通量增大、上方减小，两处涡流的方向相反，它们的磁场都阻碍磁铁下落：这就是<b className="text-white">电磁阻尼</b>。磁铁很快达到一个不大的速度匀速下落（这里取约 {PIPE.vt} m/s，示意）。</p>
          <p className="mt-3">线圈突然通电，穿过铝环的磁通量增大，铝环里的感应电流和线圈电流方向相反，两者相斥，铝环跳起：来拒去留。开口的铝环不能形成回路，没有感应电流。</p>
          <p className="mt-3">电磁炉、金属探测器、电表的阻尼、高铁的电磁制动都用到涡流。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两根管、两个环都试过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">涡流的磁场总在阻碍相对运动</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">有机玻璃管 {fallTime('plastic').toFixed(2)} s，铝管约 {fallTime('alu').toFixed(1)} s；闭合铝环跳起，开口铝环不动。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/55">{pipe ? '下落时间' : '铝环'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{pipe ? (t === null ? '—' : Math.min(s, dur).toFixed(2)) : ex === 'closed' ? (t === null ? '—' : '跳起') : (t === null ? '—' : '不动')}{pipe && <span className="ml-1 text-[15px] font-medium text-white/55">s</span>}</div>
            <div className="mt-1.5 text-[13px] text-white/55">{NAMES[ex]}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="h" value={PIPE.h.toFixed(1)} unit="m · 管长" />
            <ParamTile symbol="g" value={String(G)} unit="N/kg" />
            <ParamTile symbol="t塑" value={times.plastic ? times.plastic.toFixed(2) : '—'} unit="s · 有机玻璃管" />
            <ParamTile symbol="t铝" value={times.alu ? `约 ${times.alu.toFixed(1)}` : '—'} unit="s · 铝管" />
          </div>
        </Glass>
      }
      actions={<LabButton primary pulse={next === 'go'} onClick={go} disabled={busy}>{pipe ? '松手' : '通电'}</LabButton>}
      extras={<Control label="试哪一个"><Segmented label="试哪一个" pulse={next === 'ex'} want={next === 'ex' ? (task?.id as Ex) : null} value={ex} onChange={k => choose(k as Ex)} disabled={busy} options={(Object.keys(NAMES) as Ex[]).map(k => ({ value: k, label: NAMES[k] }))} /></Control>}
    />
  )
}
