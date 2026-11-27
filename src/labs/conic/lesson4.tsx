// 圆锥曲线 · 第 4 课 双曲线（到两定点的距离之差的绝对值是常数；渐近线；离心率）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene4 from './scene4'
import { useRun } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { HYPER, fmt, hyperC, type HyperKey } from './physics'

const UM: Record<HyperKey, number> = { wide: 1.25, narrow: 1.36 }
const TASKS: Task[] = [
  { id: 'trace', text: '让点 P 沿两支各走一遍', note: '右支上差是 6，左支上差是 −6：差的绝对值始终是 2a = 6' },
  { id: 'asym', text: '画出渐近线', note: '双曲线向两头无限靠近这两条直线 y = ±(b/a)x，但永远不相交' },
  { id: 'narrow', text: '换成 a = 4、b = 3', note: 'c 还是 5，e 从 1.67 降到 1.25：渐近线变平，开口变窄' },
]

export default function Lesson4() {
  const [k, setK] = useState<HyperKey>('wide')
  const [traced, setTraced] = useState(false)
  const [lines, setLines] = useState(false)
  const T = useTasks('gewu:conic:4', TASKS)
  const run = useRun(8), draw = useRun(1.6)
  const H = HYPER[k], a = useSlide(H.a, 0.9), b = useSlide(H.b, 0.9), um = useSlide(UM[k], 0.2), settled = a === H.a && b === H.b
  useEffect(() => { if (run.done) { setTraced(true); T.check(id => id === 'trace') } }, [run.done])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (draw.done) { setLines(true); T.check(id => id === 'asym') } }, [draw.done])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (settled && k === 'narrow' && traced && lines) T.check(id => id === 'narrow') }, [settled, k, traced, lines])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { run.reset(); draw.reset(); setK('wide'); setTraced(false); setLines(false); T.reset() }
  const task = T.current, busy = run.running || draw.running || !settled
  const { hint, next }: { hint: string; next: 'seg' | 'trace' | 'asym' | null } = !task ? { hint: '两条双曲线都看过了。e 越大，开口越开阔。', next: null }
    : busy ? { hint: run.running ? '点 P 在走…看两段距离的差' : draw.running ? '渐近线在画…' : '双曲线在变…', next: null }
    : task.id === 'trace' ? { hint: '按“走一遍”：让点 P 沿右支、左支各走一遍', next: 'trace' }
    : task.id === 'asym' ? { hint: '按“画渐近线”', next: 'asym' } : { hint: '把双曲线换成 a = 4、b = 3', next: 'seg' }
  const c = hyperC(H.a, H.b)

  return (
    <LabShell title="圆锥曲线" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="坐标屏"
      stage={<Scene4 a={a} b={b} um={um} t={run.t} traced={traced} asym={lines ? 1 : draw.t} />}
      lesson={<LessonBlock no="4" title="双曲线" concept="到两定点的距离之差的绝对值是常数" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>平面内到两个定点 <span className="font-formula italic">F₁</span>、<span className="font-formula italic">F₂</span> 的距离的差的绝对值等于非零常数（小于 |<span className="font-formula italic">F₁F₂</span>|）的点的轨迹叫做<b className="text-white">双曲线</b>。焦点在 <span className="font-formula italic">x</span> 轴上时，标准方程是 <span className="font-formula italic">x²/a² − y²/b² = 1</span>，其中 <span className="font-formula italic">c² = a² + b²</span>。</p>
          <p className="mt-3">直线 <span className="font-formula italic">y = ±(b/a)x</span> 叫双曲线的<b className="text-white">渐近线</b>。离心率 <span className="font-formula italic">e = c/a</span> &gt; 1；<span className="font-formula italic">e</span> 越大，<span className="font-formula italic">b/a</span> 越大，双曲线的开口越开阔。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两条双曲线都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">双曲线上的点到两焦点的距离之差的绝对值是 2a；渐近线是 y = ±(b/a)x</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">x²/a² − y²/b² = 1</div>
            <div className="mt-1 font-formula text-[32px] leading-none font-bold italic tabular-nums">x²/{H.a * H.a} − y²/{H.b * H.b} = 1</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-4 gap-2">
            <ParamTile symbol="a" value={String(H.a)} unit="实半轴" />
            <ParamTile symbol="b" value={String(H.b)} unit="虚半轴" />
            <ParamTile symbol="c" value={fmt(c)} unit="半焦距" />
            <ParamTile symbol="e" value={fmt(c / H.a)} unit="离心率" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="2a" value={String(H.a * 2)} unit="距离之差的绝对值" />
            <ParamTile symbol="渐近线" value={lines ? `y = ±${k === 'wide' ? '4/3' : '3/4'} x` : '—'} unit="y = ±(b/a)x" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'trace'} onClick={run.start} disabled={busy}>走一遍</LabButton>
        <LabButton pulse={next === 'asym'} onClick={draw.start} disabled={busy || lines}>画渐近线</LabButton>
      </>}
      extras={<Control label="双曲线"><Segmented label="双曲线" pulse={next === 'seg'} want={next === 'seg' ? 'narrow' : null} value={k} onChange={q => { run.reset(); setK(q) }} options={[{ value: 'wide', label: 'a = 3，b = 4' }, { value: 'narrow', label: 'a = 4，b = 3' }]} /></Control>}
    />
  )
}
