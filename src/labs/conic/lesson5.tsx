// 圆锥曲线 · 第 5 课 抛物线：焦点和准线（抛物线上的点到焦点和到准线的距离相等；x² = 2py）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene5 from './scene5'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { DISH, MEASURE5, fmt, paraDirDist, paraFocalDist, paraY } from './physics'

type PKey = '8' | '4'
const TASKS: Task[] = [
  { id: 'm0', text: '量顶点 (0, 0)：到焦点、到准线各多远', note: '都是 4 m：顶点在焦点和准线的正中间' },
  { id: 'm1', text: '再量 x = 4 处的点', note: '都是 5 m' },
  { id: 'm2', text: '再量口沿 x = 6 处的点', note: '都是 6.25 m：抛物线上每一点到焦点和到准线的距离都相等' },
  { id: 'p4', text: '把 p 换成 4，和天线的抛物线比一比', note: 'p 是焦点到准线的距离。p 变小，焦点更靠近顶点，开口更窄' },
]

export default function Lesson5() {
  const [i, setI] = useState(-1)                 // 量到第几个点（−1 还没量）
  const [rows, setRows] = useState<number[]>([])
  const [pk, setPk] = useState<PKey>('8')
  const T = useTasks('gewu:conic:5', TASKS)
  const target = i < 0 ? 0 : MEASURE5[i], x = useSlide(target, 2.4), settled = x === target
  useEffect(() => { if (i < 0 || !settled) return; const next = rows.includes(i) ? rows : [...rows, i]; if (next !== rows) setRows(next); T.check(id => next.some(r => id === `m${r}`)) }, [settled, i])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (pk === '4' && rows.length === MEASURE5.length) T.check(id => id === 'p4') }, [pk, rows])   // eslint-disable-line react-hooks/exhaustive-deps
  const measure = () => { if (i < MEASURE5.length - 1 && settled) setI(i + 1) }
  const resetAll = () => { setI(-1); setRows([]); setPk('8'); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'seg' | 'm' | null } = !task ? { hint: '都做完了。天线的截面是抛物线，馈源就在它的焦点上。', next: null }
    : task.id === 'p4' ? { hint: '把 p 换成 4：看焦点和开口怎么变', next: 'seg' }
    : !settled ? { hint: '点 P 在挪…', next: null } : { hint: i < 0 ? '按“量下一个点”：先量顶点' : '按“量下一个点”', next: 'm' }
  const p = DISH.p

  return (
    <LabShell title="圆锥曲线" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="天线的截面"
      stage={<Scene5 x={x} measuring={i >= 0} other={pk === '4' ? 4 : null} />}
      lesson={<LessonBlock no="5" title="抛物线：焦点和准线" concept="到焦点和到准线的距离相等" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>平面内到一个定点 <span className="font-formula italic">F</span> 和一条定直线 <span className="font-formula italic">l</span>（不经过 <span className="font-formula italic">F</span>）的距离相等的点的轨迹叫做<b className="text-white">抛物线</b>。点 <span className="font-formula italic">F</span> 叫焦点，直线 <span className="font-formula italic">l</span> 叫准线。</p>
          <p className="mt-3">焦点到准线的距离记作 <span className="font-formula italic">p</span>。开口向上、顶点在原点时，标准方程是 <span className="font-formula italic">x² = 2py</span>，焦点 (0, <span className="font-formula italic">p</span>/2)，准线 <span className="font-formula italic">y = −p</span>/2。开口向右时是 <span className="font-formula italic">y² = 2px</span>，焦点 (<span className="font-formula italic">p</span>/2, 0)，准线 <span className="font-formula italic">x = −p</span>/2。</p>
          <p className="mt-3">这口天线 <span className="font-formula italic">p</span> = 8 m，截面是 <span className="font-formula italic">x² = 16y</span>。抛物线的离心率是 1。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个点都量过，p 也换过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">抛物线上的点到焦点和到准线的距离相等；x² = 2py 的焦点是 (0, p/2)</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">x² = 2py</div>
            <div className="mt-1 font-formula text-[38px] leading-none font-bold italic tabular-nums">x² = {2 * p}y</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="p" value={String(p)} unit="m · 焦点到准线" />
            <ParamTile symbol="F" value={`(0, ${fmt(p / 2)})`} unit="焦点" />
            <ParamTile symbol="l" value={`y = −${fmt(p / 2)}`} unit="准线" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">量过的点</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">点 P</th><th className="text-right font-normal">到焦点</th><th className="text-right font-normal">到准线</th></tr></thead>
            <tbody>{MEASURE5.map((mx, r) => rows.includes(r) && <tr key={mx} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">({mx}, {fmt(paraY(p, mx))})</td><td className="text-right tabular-nums">{fmt(paraFocalDist(p, mx))} m</td><td className="text-right tabular-nums">{fmt(paraDirDist(p, mx))} m</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'm'} onClick={measure} disabled={!settled || i >= MEASURE5.length - 1}>量下一个点</LabButton></>}
      extras={<Control label="p 的值"><Segmented label="p 的值" pulse={next === 'seg'} want={next === 'seg' ? '4' : null} value={pk} onChange={setPk} options={[{ value: '8', label: 'p = 8（天线）' }, { value: '4', label: 'p = 4（对比）' }]} /></Control>}
    />
  )
}
