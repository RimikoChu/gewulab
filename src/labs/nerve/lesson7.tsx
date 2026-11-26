// 神经调节 · 第 7 课 大脑、小脑、脑干：头顶悬着一个放大的脑，逐个认大脑（皮层上的几个功能区）、小脑、脑干；
// 再到左边的展台上测自己的反应时间：尺子被释放夹松开往下掉，看到就立刻捏住，从捏住的刻度算出用了多长时间。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import type { TagKey } from './brain'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { AREAS, BRAIN, DEMO_RT, G, RULER, catchAt, fallDist, fallTime, mean, type AreaKey, type BrainKey } from './physics'
import type { V3 } from './sdf'
import { Big } from './ui'
import { BENCH7, FINGER_Y, RULER_X, RULER_Z, onBig } from './world'

const TASKS: Task[] = [
  { id: 'cortex', text: '选“大脑”，看大脑皮层上的功能区', note: '大脑皮层是调节人体生命活动的最高级中枢' },
  { id: 'cerebellum', text: '选“小脑”', note: '小脑使运动协调、准确，维持身体平衡' },
  { id: 'stem', text: '选“脑干”', note: '脑干里有调节心跳、呼吸、血压的中枢' },
  { id: 'one', text: '测一次反应时间：尺子一掉就捏住', note: '从尺子落下的距离算出反应时间' },
  { id: 'three', text: '一共测三次，算平均', note: '多测几次取平均，结果更可靠' },
]
const PARTS: BrainKey[] = ['cortex', 'cerebellum', 'stem']
const AREA_AT: Record<AreaKey, V3> = { motor: [5.0, 4.2, 2.2], sense: [5.6, 2.4, -1.8], speech: [6.4, 0.2, 4.4], vision: [3.4, 1.0, -7.6], hearing: [6.8, -1.6, 0.4] }
const AREA_TAG: Record<AreaKey, TagKey> = { motor: 'motor', sense: 'sense', speech: 'speech', vision: 'vision', hearing: 'hearing' }
type Drop = { phase: 'idle' | 'armed' | 'falling' | 'caught' | 'missed'; t0: number; h: number }

export default function Lesson7() {
  const [sel, setSel] = useState<BrainKey | null>(null)
  const [mode, setMode] = useState<'brain' | 'ruler'>('brain')
  const [drop, setDrop] = useState<Drop>({ phase: 'idle', t0: 0, h: 0 })
  const [rts, setRts] = useState<number[]>([])
  const T = useTasks('gewu:nerve:7', TASKS)
  const D = useRef(drop); D.current = drop
  const demo = useRef(false), timers = useRef<number[]>([]), raf = useRef(0)
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; cancelAnimationFrame(raf.current) }
  useEffect(() => clear, [])
  const choose = (k: BrainKey) => { setSel(k); setMode('brain'); T.check(id => id === k) }
  const doCatch = () => {
    const d = D.current; if (d.phase !== 'falling') return
    cancelAnimationFrame(raf.current)
    const t = (performance.now() - d.t0) / 1000, h = catchAt(t)
    if (h === null) return
    setDrop({ ...d, phase: 'caught', h })
    const n = [...rts, fallTime(h)]; setRts(n)
    T.check(id => id === 'one' || (id === 'three' && n.length >= 3))
  }
  const arm = () => {
    if (!PARTS.every(k => T.done[k]) || D.current.phase === 'armed' || D.current.phase === 'falling') return
    clear(); setMode('ruler'); setSel(null); setDrop({ phase: 'armed', t0: 0, h: 0 })
    const wait = 1500 + Math.random() * 1500, i = rts.length
    timers.current.push(window.setTimeout(() => {
      const t0 = performance.now(); setDrop({ phase: 'falling', t0, h: 0 })
      const f = () => {
        const t = (performance.now() - t0) / 1000, h = fallDist(t)
        if (h > RULER + 0.02) { setDrop({ phase: 'missed', t0, h: Math.min(h, 1.2) }); return }
        setDrop({ phase: 'falling', t0, h }); raf.current = requestAnimationFrame(f)
      }
      raf.current = requestAnimationFrame(f)
      // 自动演示时，替学生按反应时间捏住
      if (demo.current) timers.current.push(window.setTimeout(() => { doCatchRef.current() }, DEMO_RT[i % DEMO_RT.length] * 1000))
    }, demo.current ? 1200 : wait))
  }
  const doCatchRef = useRef(doCatch); doCatchRef.current = doCatch
  useEffect(() => { const on = (e: KeyboardEvent) => { if (e.code === 'Space' && D.current.phase === 'falling') { e.preventDefault(); doCatchRef.current() } }; window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on) }, [])
  const resetAll = () => { clear(); demo.current = false; setSel(null); setMode('brain'); setDrop({ phase: 'idle', t0: 0, h: 0 }); setRts([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'part' | 'arm' | 'catch' | null } = !task ? { hint: '大脑、小脑、脑干各管各的事；接住尺子要靠眼、大脑和手一起配合。', next: null }
    : drop.phase === 'armed' ? { hint: '盯住尺子，它随时会掉下来…', next: null }
    : drop.phase === 'falling' ? { hint: '尺子掉了！快捏住（也可以按空格键）', next: 'catch' }
    : PARTS.includes(task.id as BrainKey) ? { hint: `选“${BRAIN[task.id as BrainKey].name}”`, next: 'part' }
    : drop.phase === 'missed' ? { hint: '尺子掉下去了，没接住。按“准备”再来一次', next: 'arm' }
    : rts.length === 0 ? { hint: '三部分都认过了。按“准备”，尺子的 0 刻度对着手指，随时会掉', next: 'arm' }
    : { hint: `测了 ${rts.length} 次。按“准备”再测一次`, next: 'arm' }
  const hi: Partial<Record<TagKey, number>> = sel === 'cortex' ? { cortex: 0.12, motor: 1, sense: 1, speech: 1, vision: 1, hearing: 1 } : sel === 'cerebellum' ? { cerebellum: 1 } : sel === 'stem' ? { stem: 1 } : {}
  const labels: Label[] = mode === 'ruler' ? [
    ...(drop.phase === 'caught' ? [{ id: 'h', at: [RULER_X + 0.3, FINGER_Y + 0.05, RULER_Z] as V3, ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>捏在</small>{(drop.h * 100).toFixed(1)} cm</> }] : []),
    { id: 'r', at: [RULER_X - 1.25, FINGER_Y + 5.6, RULER_Z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '释放夹' },
  ] : sel === 'cortex' ? (Object.keys(AREAS) as AreaKey[]).map(a => ({ id: a, at: onBig(AREA_AT[a]), ax: 0.5, className: 'scene-tag -translate-y-1/2', children: AREAS[a] }))
    : sel === 'cerebellum' ? [{ id: 'c', at: onBig([4, -4.0, -5.8]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: '小脑' }]
    : sel === 'stem' ? [{ id: 's', at: onBig([1.8, -6.6, -2.6]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: '脑干' }] : []
  const lastRt = drop.phase === 'caught' ? fallTime(drop.h) : null
  return (
    <LabShell title="神经调节" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="脑和反应"
      autoStep={() => { demo.current = true; return false }}
      stage={<Place at={mode === 'ruler' ? 'ruler' : 'brain'} labels={labels} want={{ brain: { hi, dim: sel ? 0.7 : 0 }, ruler: { y: drop.phase === 'idle' || drop.phase === 'armed' ? 0 : Math.min(drop.h * 10, FINGER_Y - BENCH7.top - 0.02), pose: drop.phase === 'caught' ? 'pinch' : 'open', held: drop.phase === 'idle' || drop.phase === 'armed' } }} />}
      lesson={<LessonBlock no="7" title="大脑、小脑、脑干" concept="大脑皮层是最高级的神经中枢" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>脑包括大脑、小脑和脑干。</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-white/80">
            {PARTS.map(k => <li key={k}><b className="text-white">{BRAIN[k].name}</b>：{BRAIN[k].job}。</li>)}
          </ul>
          <p className="mt-3">测反应时间：同学捏住尺子上端，你的拇指和食指对准尺子下端的 0 刻度。尺子一松开就立刻捏住，读出捏住处的刻度 h，用 h = ½gt² 算出反应时间 t。这一反射要经过眼、大脑皮层、脊髓和手的肌肉。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里用电磁释放夹代替同学的手；尺子长 50 cm，落过 50 cm 就是没接住。g 取 {G} N/kg。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三次都测完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">大脑皮层是最高级中枢，小脑管协调和平衡，脑干管心跳和呼吸</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">三次反应时间平均 {rts.length >= 3 ? mean(rts.slice(-3)).toFixed(2) : '—'} s。看见尺子掉、再让手指捏住，要经过眼、大脑皮层、脊髓和肌肉。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          {mode === 'brain' ? <>
            {sel ? <div className="text-center"><div className="mt-1 text-[34px] leading-none font-bold">{BRAIN[sel].name}</div><p className="mt-2 text-[14px] leading-relaxed text-white/75">{BRAIN[sel].job}。</p></div>
              : <p className="text-center text-[14px] text-white/60">选一部分看看</p>}
            {sel === 'cortex' && <div className="mt-3 flex flex-wrap justify-center gap-1.5">{(Object.keys(AREAS) as AreaKey[]).map(a => <span key={a} className="rounded-lg bg-[#35c7b3]/20 px-2 py-1 text-[13px]">{AREAS[a]}</span>)}</div>}
          </> : <>
            <div className="grid grid-cols-2 gap-2">
              <Big label="尺子落下" value={drop.phase === 'caught' ? (drop.h * 100).toFixed(1) : drop.phase === 'missed' ? '没接住' : '—'} unit={drop.phase === 'caught' ? 'cm' : undefined} tone={drop.phase === 'missed' ? 'bad' : undefined} />
              <Big label="反应时间" value={lastRt !== null ? lastRt.toFixed(2) : '—'} unit={lastRt !== null ? 's' : undefined} />
            </div>
            <p className="mt-2 text-center font-formula text-[15px] italic text-white/60">h = ½ g t²</p>
          </>}
          <h2 className="mt-4 text-[12.5px] text-white/55">反应时间</h2>
          <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
            {[0, 1, 2].map(i => <div key={i} className="rounded-lg bg-white/6 py-1.5"><div className="text-[11.5px] text-white/50">第 {i + 1} 次</div><div className="text-[15px] font-semibold tabular-nums">{rts[i] !== undefined ? rts[i].toFixed(2) : '—'}</div></div>)}
            <div className="rounded-lg bg-[#35c7b3]/18 py-1.5"><div className="text-[11.5px] text-white/60">平均</div><div className="text-[15px] font-semibold tabular-nums">{rts.length >= 3 ? mean(rts.slice(0, 3)).toFixed(2) : '—'}</div></div>
          </div>
          <p className="mt-1 text-right text-[12px] text-white/45">单位：s</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'arm'} pulse={next === 'arm'} onClick={arm} disabled={!PARTS.every(k => T.done[k]) || drop.phase === 'armed' || drop.phase === 'falling'}>准备</LabButton>
        <LabButton primary={next === 'catch'} pulse={next === 'catch'} onClick={doCatch} disabled={drop.phase !== 'falling'}>捏住</LabButton>
      </>}
      extras={
        <Control label="脑">
          <Segmented label="脑" pulse={next === 'part'} want={next === 'part' ? task!.id as BrainKey : null} value={sel ?? ('' as BrainKey)} onChange={v => choose(v as BrainKey)} disabled={drop.phase === 'armed' || drop.phase === 'falling'} options={PARTS.map(k => ({ value: k, label: BRAIN[k].name }))} />
        </Control>
      }
    />
  )
}
