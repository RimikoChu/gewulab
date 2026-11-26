// 等高线地形图 · 第 2 课 等高线是怎么画出来的：用一块水平的玻璃板从上往下一层层切山，交线就是等高线；再把山压平，等高线就投影到了平面上。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './stage'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { STEPS, TOP_A, Y, altitude, levels, linesOnPeak, rayToLevel, sliceLevels, type Step } from './physics'

const TASKS: Task[] = [
  { id: 'first', text: '用水平面切山，切出第一条交线', note: `海拔 ${sliceLevels(200)[0]} m 的水平面和山坡的交线，就是 ${sliceLevels(200)[0]} m 等高线` },
  { id: 'all', text: '每隔 200 m 切一层，一直切到山脚', note: `每条线上各点的海拔都相同` },
  { id: 'flat', text: '把切出的线垂直投影到平面上', note: '一圈圈的线就成了等高线地形图' },
  { id: 'step', text: '换成等高距 100 m，再看一看', note: `等高距小，线更多，地形画得更细` },
]
/** 标数字的地方：从山顶往西、西南、西北轮流找，标签不挤在一起 */
const DIRS: [number, number][] = [[-1, 0.1], [-0.75, 0.66], [-0.6, -0.8]]
const tagAt = (lv: number) => rayToLevel(TOP_A, DIRS[(lv / 200) % 3], lv)

export default function Lesson2() {
  const [step, setStep] = useState<Step>(200)
  const [cut, setCut] = useState<number[]>([])
  const [plane, setPlane] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [flat, setFlat] = useState(false)
  const [settled, setSettled] = useState(false)
  const T = useTasks('gewu:contour:2', TASKS)
  const todo = sliceLevels(200).filter(l => !cut.includes(l))
  // 水平面移到下一层要一点时间，到位以后交线才亮起来
  useEffect(() => {
    if (!busy || plane == null) return
    const t = setTimeout(() => { const next = [...cut, plane]; setCut(next); setBusy(false); T.check(id => id === 'first' || (id === 'all' && sliceLevels(200).every(l => next.includes(l)))) }, 1300)
    return () => clearTimeout(t)
  }, [busy])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSettled(false)
    const t = setTimeout(() => { setSettled(true); if (flat) T.check(id => id === 'flat' || (id === 'step' && step === 100)) }, 1900)
    return () => clearTimeout(t)
  }, [flat, step])   // eslint-disable-line react-hooks/exhaustive-deps
  const slice = () => { if (busy || !todo.length || flat) return; setPlane(todo[0]); setBusy(true) }
  const project = () => { if (busy) return; setFlat(f => !f); if (!flat) setPlane(null) }
  const resetAll = () => { setStep(200); setCut([]); setPlane(null); setBusy(false); setFlat(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'slice' | 'flat' | 'step' | null } = (() => {
    if (!task) return { hint: '都做完了。海拔相同的点连成的线，就是等高线。', next: null }
    if (busy) return { hint: '水平面正往下移…', next: null }
    if (task.id === 'first') return { hint: '用一块水平的玻璃板从上往下切山：先切一层', next: 'slice' }
    if (task.id === 'all') return { hint: '再往下切一层', next: 'slice' }
    if (task.id === 'flat') return flat ? { hint: '正在压平…', next: null } : { hint: '把切出的线垂直投影到平面上', next: 'flat' }
    if (!flat) return { hint: '先把线投影到平面上', next: 'flat' }
    return step === 100 ? { hint: '正在加线…', next: null } : { hint: '换成等高距 100 m，再看一看', next: 'step' }
  })()

  const shown = flat ? levels(step, altitude(TOP_A)) : cut
  const tagged = flat ? shown.filter(l => l % 200 === 0) : cut
  const labels: Label[] = [
    { id: 'nA', at: [TOP_A[0], Y(altitude(TOP_A)) * (flat ? 0.006 : 1) + 1.2, TOP_A[1]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `A 峰 ${altitude(TOP_A)} m` },
    ...tagged.map((lv): Label => { const [x, z] = tagAt(lv); return { id: `t${lv}`, at: [x, Y(lv) * (flat ? 0.006 : 1) + 0.1, z], ax: 1, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: !flat || settled ? 1 : 0 }, children: `${lv}` } }),
    { id: 'pl', at: [TOP_A[0] - 14, Y(plane ?? 0), TOP_A[1] + 8], className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: plane != null && !flat ? 1 : 0 }, children: <><small>水平面</small>{plane ?? ''} m</> },
  ]
  return (
    <LabShell title="等高线地形图" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="切山"
      stage={<Spot at={flat ? 'peakMap' : 'peak'} labels={labels} want={{ flat, lines: shown, glow: plane != null && cut.includes(plane) && !flat ? [plane] : [], plane: flat ? null : plane }} />}
      lesson={<LessonBlock no="2" title="等高线怎么画" concept="海拔相同的点连成的线叫等高线" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>用一组<b className="text-white">间隔相同</b>的水平面去切山体，每个水平面和山坡的交线上，各点的海拔都相同，这条线就是<b className="text-white">等高线</b>。</p>
          <p className="mt-2">把这些交线垂直投影到同一个平面上，标上海拔，就是<b className="text-white">等高线地形图</b>。相邻两条等高线的海拔差叫<b className="text-white">等高距</b>，同一幅图里等高距相同。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">海拔相同的点连成等高线；等高距 {step} m 时，A 峰上画出 {linesOnPeak(step)} 条</p>
        <p className="mt-1 text-[14px] text-white/70">用一组等间隔的水平面切山，交线投影到平面上，就是等高线地形图。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{flat ? 'A 峰上的等高线' : '已切出的交线'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{flat ? linesOnPeak(step) : cut.length}<span className="ml-1 text-[15px] font-medium text-white/55">条</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="等高距" value={String(flat ? step : 200)} unit="m · 相邻两条的高差" />
            <ParamTile symbol="水平面" value={plane != null && !flat ? String(plane) : '—'} unit="m · 海拔" />
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-white/55">山顶海拔 {altitude(TOP_A)} m。沙盘在竖直方向放大了，坡比实际陡。</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'slice'} onClick={slice} disabled={busy || flat || !todo.length}>切一层</LabButton>
        <LabButton primary pulse={next === 'flat'} onClick={project} disabled={busy || todo.length > 0}>{flat ? '把山立起来' : '投影到平面'}</LabButton>
      </>}
      extras={<Control label="等高距"><Segmented label="等高距" pulse={next === 'step'} want={next === 'step' ? '100' : null} value={String(step)} disabled={!flat} onChange={v => setStep(Number(v) as Step)} options={STEPS.map(s => ({ value: String(s), label: `${s} m` }))} /></Control>}
    />
  )
}
