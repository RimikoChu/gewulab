// 二次函数 · 第 1 课 画一个圆形花坛（二次函数的概念：S = πr² 是 r 的二次函数）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene1 from './scene1'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { circleArea, fmt, RADII } from './physics'

type RKey = '1' | '2' | '3'
const KEYS = RADII.map(String) as RKey[]
const TASKS: Task[] = [
  { id: '1', text: '绳长 1 m，画一个圆，记下面积', note: 'r = 1 m 时，S ≈ 3.14 m²' },
  { id: '2', text: '绳长 2 m，再画一个', note: 'r 翻一倍，面积变成 4 倍：约 12.57 m²' },
  { id: '3', text: '绳长 3 m，再画一个', note: 'r 变成 3 倍，面积变成 9 倍：约 28.27 m²' },
  { id: 'link', text: '把三个点连起来', note: '连成的是一条曲线，不是直线' },
]
const TWO_PI = Math.PI * 2

export default function Lesson1() {
  const [k, setK] = useState<RKey>('1')
  const [drawing, setDrawing] = useState(false)
  const [rows, setRows] = useState<RKey[]>([])
  const [link, setLink] = useState(false)
  const T = useTasks('gewu:quadratic:1', TASKS)
  const r = useSlide(+k, 1.6)
  const turn = useSlide(drawing ? TWO_PI : 0, drawing ? 2.4 : 1000)
  const drawn = drawing && turn >= TWO_PI - 1e-6
  const dup = rows.includes(k)
  const pick = (v: RKey) => { setK(v); setDrawing(false) }
  const draw = () => { if (Math.abs(r - +k) > 1e-6) return; setDrawing(true) }
  const record = () => { if (!drawn || dup) return; const next = [...rows, k]; setRows(next); T.check(id => next.includes(id as RKey)) }
  const connect = () => { if (rows.length < 3) return; setLink(true); T.check(id => id === 'link') }
  const resetAll = () => { setK('1'); setDrawing(false); setRows([]); setLink(false); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'r' | 'draw' | 'record' | 'link' | null } = !task ? { hint: '三个圆都画完了。S = πr² 是二次函数，它的图像是曲线。', next: null }
    : task.id === 'link' ? { hint: '按“连起来”：看三个点连成什么样', next: 'link' }
    : k !== task.id ? { hint: `把绳长换成 ${task.id} m`, next: 'r' }
    : !drawing ? { hint: '按“画圆”：绳子拉直，绕木桩走一圈', next: 'draw' }
    : !drawn ? { hint: '正在画…', next: null } : { hint: '按“记录”，记下这个圆的面积', next: 'record' }
  const soil = drawn ? +k : 0
  const rings = [...rows.map(Number), ...(drawn && !dup ? [+k] : [])]

  return (
    <LabShell title="二次函数" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="木桩和绳子"
      stage={<Scene1 r={r} turn={drawing ? turn : 0} rings={rings} soil={soil} pts={rows.map(Number)} link={link} />}
      lesson={<LessonBlock no="1" title="画一个圆形花坛" concept="面积 S 是半径 r 的二次函数" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>形如 <span className="font-formula italic">y = ax² + bx + c</span>（<span className="font-formula italic">a、b、c</span> 是常数，<span className="font-formula italic">a ≠ 0</span>）的函数，叫做<b className="text-white">二次函数</b>。自变量的最高次数是 2。</p>
          <p className="mt-3">圆的面积 <span className="font-formula italic">S = πr²</span> 里，<span className="font-formula italic">a = π，b = 0，c = 0</span>，所以 S 是 r 的二次函数。r 变成 2 倍、3 倍，S 变成 4 倍、9 倍，S 和 r 不成正比，描出的点连不成直线。</p>
          <p className="mt-3"><span className="font-formula italic">a</span> 不能是 0：<span className="font-formula italic">a = 0</span> 时就成了一次函数（或常数）。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个圆都画完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">S = πr² 是二次函数：r 翻一倍，S 变成 4 倍，图像是一条曲线</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再画一次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">S = πr²</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{drawn ? fmt(circleArea(+k)) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m²</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="r" value={k} unit="m · 绳长" />
            <ParamTile symbol="π" value="3.14…" unit="圆周率" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">r / m</th><th className="text-right font-normal">S / m²</th><th className="text-right font-normal">是 r = 1 时的几倍</th></tr></thead>
            <tbody>{KEYS.filter(q => rows.includes(q)).map(q => <tr key={q} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{q}</td><td className="text-right tabular-nums">{fmt(circleArea(+q))}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{+q * +q}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'draw'} onClick={draw} disabled={drawing}>画圆</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!drawn || dup}>记录</LabButton>
        <LabButton pulse={next === 'link'} onClick={connect} disabled={rows.length < 3 || link}>连起来</LabButton>
      </>}
      extras={<Control label="绳长"><Segmented label="绳长" pulse={next === 'r'} want={next === 'r' ? task!.id as RKey : null} value={k} onChange={pick} options={KEYS.map(q => ({ value: q, label: `${q} m` }))} /></Control>}
    />
  )
}
