// 呼吸 · 第 3 课 呼吸运动：胸廓。让肋间肌收缩、舒张，看一根根肋骨绕着和脊柱相连的关节往上往外转、胸骨往上往前，读胸廓的前后径和左右径；
// 再从上面看一次，比较胸廓收缩前后的大小。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useRef, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { ForceArrow, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { LOOK, Place, useRun } from './parts'
import { RestRing } from './marks'
import { CHEST, chestDepth, chestWidth, ribTurn, round } from './physics'

const TASKS: Task[] = [
  { id: 'up', text: '让肋间肌收缩，看肋骨和胸骨往哪里动', note: '肋骨向上向外，胸骨向上向前' },
  { id: 'read', text: '读胸廓的前后径和左右径', note: `前后径、左右径都变大了` },
  { id: 'down', text: '让肋间肌舒张，看胸廓变回去', note: '肋骨和胸骨落回原位，胸廓变小' },
  { id: 'top', text: '从上面看，再收缩一次', note: '从上面看，胸廓的一圈明显变大' },
]

export default function Lesson3() {
  const [top, setTop] = useState(false)
  const [reading, setReading] = useState(false)
  const T = useTasks('gewu:breath:3', TASKS)
  const dirRef = useRef(1), topRef = useRef(false); topRef.current = top
  const run = useRun(2.2, () => {
    if (dirRef.current > 0) { T.check(id => id === 'up' || (id === 'top' && topRef.current)); if (!T.done.read) setReading(true) }
    else T.check(id => id === 'down')
  })
  useEffect(() => { if (!reading) return; const t = setTimeout(() => { setReading(false); T.check(id => id === 'read') }, 2600); return () => clearTimeout(t) }, [reading])   // eslint-disable-line react-hooks/exhaustive-deps
  const k = run.k
  const contract = () => { dirRef.current = 1; run.run(1) }
  const relax = () => { dirRef.current = -1; run.run(0) }
  const resetAll = () => { run.snap(0); setTop(false); setReading(false); T.reset() }
  const task = T.current
  const atTop = k > 0.999, atRest = k < 0.001
  const { hint, next }: { hint: string; next: 'up' | 'down' | 'top' | null } = !task ? { hint: '肋间肌收缩，肋骨向上向外，胸骨向上向前，胸廓的前后径和左右径都变大。', next: null }
    : run.busy ? { hint: dirRef.current > 0 ? '肋间肌收缩…' : '肋间肌舒张…', next: null }
    : task.id === 'up' ? { hint: '肋骨之间红色的是肋间肌。按“肋间肌收缩”', next: 'up' }
    : task.id === 'read' ? { hint: '读右边的前后径和左右径，和舒张时比一比', next: null }
    : task.id === 'down' ? { hint: '按“肋间肌舒张”，看胸廓怎样', next: 'down' }
    : !top ? { hint: '按“从上面看”，换个角度', next: 'top' }
    : atRest ? { hint: '从上面看着胸廓的一圈，再按“肋间肌收缩”', next: 'up' }
    : { hint: '按“肋间肌舒张”', next: 'down' }
  const d = chestDepth(k), w = chestWidth(k)
  const moving = run.busy && dirRef.current > 0
  const labels: Label[] = [
    { id: 'st', at: [0.42, 13.3, 0.95], ax: 0, className: 'scene-name', name: true, children: '胸骨' },
    { id: 'rib', at: [-1.62, 13.2, 0.1], ax: 1, className: 'scene-name', name: true, children: '肋骨' },
    { id: 'ic', at: [1.62, 12.4, 0.2], ax: 0, className: `scene-tag ${k > 0.05 ? 'key' : ''} -translate-y-1/2`, children: k > 0.05 ? <><small>肋间肌</small>收缩</> : '肋间肌' },
    { id: 'sp', at: [0.3, 10.6, -0.6], ax: 0, className: 'scene-name', name: true, children: '脊柱' },
    ...(atTop || T.done.read ? [
      { id: 'dep', at: [-1.75, 13.9, 0.4] as [number, number, number], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>前后径</small>{d.toFixed(1)} cm{k > 0.05 && <span className="delta">+{(d - CHEST.depth).toFixed(1)}</span>}</> },
      { id: 'wid', at: [1.75, 13.4, 0.3] as [number, number, number], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>左右径</small>{w.toFixed(1)} cm{k > 0.05 && <span className="delta">+{(w - CHEST.width).toFixed(1)}</span>}</> },
    ] : []),
  ]
  return (
    <LabShell title="呼吸" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="肋间肌"
      stage={<Place at={top ? 'top' : 'ribs'} labels={labels} want={{ rib: k, dia: 0, look: { ...LOOK, skin: top ? 0.15 : 1, lungs: 0.88, hl: 'inter' } }}>
        {top && <RestRing />}
        {/* 收缩时：胸骨往上往前、两侧肋骨往外 */}
        {moving && <>
          <ForceArrow tip={[0, 13.75, 1.35]} dir={[0, 0.55, 0.83]} len={0.55} color="#ffe9a8" />
          <ForceArrow tip={[-2.05, 12.6, -0.05]} dir={[-1, 0.3, 0]} len={0.5} color="#ffe9a8" />
          <ForceArrow tip={[2.05, 12.6, -0.05]} dir={[1, 0.3, 0]} len={0.5} color="#ffe9a8" />
        </>}
      </Place>}
      lesson={<LessonBlock no="3" title="呼吸运动：胸廓" concept="肋间肌收缩，胸廓前后左右变大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>胸廓由脊柱、肋骨、胸骨和肋间肌等组成。肋骨的后端和脊柱相连，前端借肋软骨连到胸骨上。</p>
          <p className="mt-3"><b className="text-white">肋间肌收缩</b>时，肋骨向上向外运动，胸骨向上向前运动，胸廓的<b className="text-white">前后径和左右径都增大</b>；肋间肌舒张时，肋骨和胸骨因重力等原因回到原位，胸廓缩小。</p>
          <p className="mt-3 text-[13.5px] text-white/65">为了看得清，画面里肋骨转动的角度放大了，读数是按这个角度算出来的示意值。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">胸廓收缩、舒张都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">肋间肌收缩，肋骨向上向外、胸骨向上向前，胸廓前后径和左右径变大</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">前后径 {CHEST.depth} → {round(chestDepth(1), 1)} cm，左右径 {CHEST.width} → {round(chestWidth(1), 1)} cm。肋间肌舒张时胸廓变回去。</p>
          <p className="mt-2 text-[12.5px] text-white/50">示意，动作放大。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">肋间肌</div>
            <div className="mt-1 text-[30px] leading-none font-bold">{k > 0.999 ? '收缩' : k < 0.001 ? '舒张' : dirRef.current > 0 ? '正在收缩' : '正在舒张'}</div>
            <div className="mt-2 text-[14px] text-white/70">肋骨上提 {ribTurn(k).toFixed(0)}°</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">胸廓的大小（示意）</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="前后径" value={d.toFixed(1)} unit={`cm · 舒张时 ${CHEST.depth}`} />
            <ParamTile symbol="左右径" value={w.toFixed(1)} unit={`cm · 舒张时 ${CHEST.width}`} />
          </div>
          <p className="mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/70">肋骨像水桶的提手：后端连在脊柱上不动，前端和中间往上一抬，胸廓就往前、往两边撑开。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'up'} pulse={next === 'up'} onClick={contract} disabled={run.busy || atTop}>肋间肌收缩</LabButton>
        <LabButton primary={next === 'down'} pulse={next === 'down'} onClick={relax} disabled={run.busy || atRest || task?.id === 'read'}>肋间肌舒张</LabButton>
        <LabButton primary={next === 'top'} pulse={next === 'top'} onClick={() => setTop(t => !t)} disabled={run.busy}>{top ? '从正面看' : '从上面看'}</LabButton>
      </>}
      extras={null}
    />
  )
}
