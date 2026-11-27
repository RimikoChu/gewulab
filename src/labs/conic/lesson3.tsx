// 圆锥曲线 · 第 3 课 椭圆的方程和离心率（x²/a² + y²/b² = 1；a² = b² + c²；e = c/a 越大越扁）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene3 from './scene3'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { A3, C3, ecc, ellipseB, fmt } from './physics'

type Key = '3' | '4' | '1.4'
const KEYS = C3.map(String) as Key[]
const TASKS: Task[] = [
  { id: 'abc', text: 'c = 3 时，标出 a、b、c', note: 'a、b、c 围成一个直角三角形：a² = b² + c²，25 = 16 + 9' },
  { id: 'pt', text: '验一验点 (3, 3.2) 在不在椭圆上', note: '代进方程左边正好得 1：点在椭圆上' },
  { id: '4', text: '把 c 换成 4', note: 'e = 0.8：焦点靠近长轴的端点，椭圆更扁' },
  { id: '1.4', text: '把 c 换成 1.4', note: 'e = 0.28：焦点靠近中心，椭圆接近圆' },
]

export default function Lesson3() {
  const [k, setK] = useState<Key>('3')
  const [marks, setMarks] = useState(false)
  const [check, setCheck] = useState(false)
  const [seen, setSeen] = useState<Key[]>(['3'])
  const T = useTasks('gewu:conic:3', TASKS)
  const target = Number(k), c = useSlide(target, 1.6), settled = c === target
  useEffect(() => { if (!settled) return; const next = seen.includes(k) ? seen : [...seen, k]; if (next !== seen) setSeen(next); if (marks && check) T.check(id => next.includes(id as Key)) }, [settled, k, marks, check])   // eslint-disable-line react-hooks/exhaustive-deps
  const mark = () => { setMarks(true); T.check(id => id === 'abc') }
  const verify = () => { setCheck(true); T.check(id => id === 'pt') }
  const resetAll = () => { setK('3'); setMarks(false); setCheck(false); setSeen(['3']); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'seg' | 'mark' | 'check' | null } = !task ? { hint: '三种 c 都看过了。a 不变，c 越大，b 越小，椭圆越扁。', next: null }
    : task.id === 'abc' || task.id === 'pt' ? (k !== '3' ? { hint: '先把 c 换回 3', next: 'seg' } : task.id === 'abc' ? { hint: '按“标出 a、b、c”', next: 'mark' } : { hint: '按“验一个点”：把 (3, 3.2) 代进方程', next: 'check' })
    : k !== task.id ? { hint: `把 c 换成 ${task.id}`, next: 'seg' } : { hint: '椭圆在变…', next: null }
  const b = ellipseB(A3, target)
  const want = (task?.id === 'abc' || task?.id === 'pt' ? '3' : task?.id) as Key | undefined

  return (
    <LabShell title="圆锥曲线" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="坐标屏"
      stage={<Scene3 c={c} marks={marks} check={check && k === '3' && settled} />}
      lesson={<LessonBlock no="3" title="椭圆的方程和离心率" concept="e = c / a 越大，椭圆越扁" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>以两焦点所在直线为 <span className="font-formula italic">x</span> 轴、线段 <span className="font-formula italic">F₁F₂</span> 的垂直平分线为 <span className="font-formula italic">y</span> 轴，椭圆的<b className="text-white">标准方程</b>是 <span className="font-formula italic">x²/a² + y²/b² = 1</span>（<span className="font-formula italic">a &gt; b &gt;</span> 0），其中 <span className="font-formula italic">b² = a² − c²</span>。</p>
          <p className="mt-3">椭圆和坐标轴的四个交点叫顶点。长轴长 2<span className="font-formula italic">a</span>，短轴长 2<span className="font-formula italic">b</span>，焦距 2<span className="font-formula italic">c</span>。</p>
          <p className="mt-3"><b className="text-white">离心率</b> <span className="font-formula italic">e = c/a</span>，0 &lt; <span className="font-formula italic">e</span> &lt; 1。<span className="font-formula italic">e</span> 越接近 1，椭圆越扁；越接近 0，椭圆越接近圆。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种 c 都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">a² = b² + c²；离心率 e = c/a 越大，椭圆越扁</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">x²/a² + y²/b² = 1</div>
            <div className="mt-1 font-formula text-[32px] leading-none font-bold italic tabular-nums">x²/25 + y²/{fmt(b * b)} = 1</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-4 gap-2">
            <ParamTile symbol="a" value={String(A3)} unit="长半轴" />
            <ParamTile symbol="b" value={fmt(b)} unit="短半轴" />
            <ParamTile symbol="c" value={fmt(target)} unit="半焦距" />
            <ParamTile symbol="e" value={fmt(ecc(A3, target))} unit="离心率" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">看过的椭圆</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">c</th><th className="font-normal">b</th><th className="font-normal">e = c/a</th><th className="text-right font-normal">形状</th></tr></thead>
            <tbody>{KEYS.filter(q => seen.includes(q)).map(q => <tr key={q} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{q}</td><td className="tabular-nums">{fmt(ellipseB(A3, Number(q)))}</td><td className="tabular-nums">{fmt(ecc(A3, Number(q)))}</td><td className="text-right">{q === '4' ? '更扁' : q === '1.4' ? '接近圆' : '—'}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'mark'} onClick={mark} disabled={marks || k !== '3'}>标出 a、b、c</LabButton>
        <LabButton pulse={next === 'check'} onClick={verify} disabled={check || k !== '3'}>验一个点</LabButton>
      </>}
      extras={<Control label="c 的值"><Segmented label="c 的值" pulse={next === 'seg'} want={next === 'seg' ? want ?? null : null} value={k} onChange={setK} options={KEYS.map(q => ({ value: q, label: `c = ${q}` }))} /></Control>}
    />
  )
}
