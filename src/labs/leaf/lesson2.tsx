// 光合作用和呼吸作用 · 第 2 课 冒出来的气泡（光合作用放出氧气；光越强放得越快）
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import Scene2 from './scene2'
import { LESSONS, goLesson } from './lessons'
import { LAMP_CM, bubbles } from './physics'

type Cm = '10' | '20' | '30'
const TASKS: Task[] = [
  { id: '10', text: '灯放在 10 cm，数一分钟的气泡', note: `离得近、光强：${bubbles(10)} 个` },
  { id: '20', text: '移到 20 cm，再数一次', note: `${bubbles(20)} 个：少了很多` },
  { id: '30', text: '移到 30 cm，再数一次', note: `${bubbles(30)} 个：光越弱，气泡越少` },
  { id: 'test', text: '用带火星的木条检验攒下的气体', note: '木条复燃：这种气体是氧气' },
]
const RUN = 6000   // 画面里用 6 秒走完一分钟

export default function Lesson2() {
  const [cm, setCm] = useState<Cm>('10')
  const [on, setOn] = useState(false)
  const [count, setCount] = useState<number | null>(null)   // 这一次数到的个数；null 是还没数
  const [rows, setRows] = useState<Cm[]>([])
  const [tested, setTested] = useState(false)
  const T = useTasks('gewu:leaf:2', TASKS)
  const timer = useRef(0)
  useEffect(() => () => clearInterval(timer.current), [])
  const total = bubbles(Number(cm)), full = count === total && !on
  const start = () => {
    if (on || tested) return
    setOn(true); setCount(0); const t0 = performance.now()
    timer.current = window.setInterval(() => { const k = Math.min(1, (performance.now() - t0) / RUN); setCount(Math.round(total * k)); if (k >= 1) { clearInterval(timer.current); setOn(false) } }, 80)
  }
  const dup = rows.includes(cm)
  const record = () => { if (!full || dup) return; const next = [...rows, cm]; setRows(next); T.check(id => next.includes(id as Cm)) }
  const test = () => { if (rows.length < 3 || on) return; setTested(true); T.check(id => id === 'test') }
  const move = (v: Cm) => { if (on) return; setCm(v); setCount(null); setTested(false) }
  const resetAll = () => { clearInterval(timer.current); setCm('10'); setOn(false); setCount(null); setRows([]); setTested(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'cm' | 'start' | 'record' | 'test' | null } = (() => {
    if (!task) return { hint: '都做完了。气泡是氧气，光越强冒得越快。', next: null }
    if (on) return { hint: '正在数：一分钟…', next: null }
    if (task.id === 'test') return { hint: '试管里攒了不少气体：按“检验气体”', next: 'test' }
    if (cm !== task.id) return { hint: `把灯移到 ${task.id} cm`, next: 'cm' }
    if (full && !dup) return { hint: `数到 ${total} 个：按“记录”`, next: 'record' }
    return { hint: '按“开灯数一分钟”', next: 'start' }
  })()

  return (
    <LabShell title="光合作用和呼吸作用" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="金鱼藻"
      stage={<Scene2 cm={Number(cm)} on={on} gas={rows.length / 3 + (on ? 0.1 : 0)} tested={tested} />}
      lesson={<LessonBlock no="2" title="冒出来的气泡" concept="光合作用放出氧气，光越强放得越快" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>金鱼藻在光下不断冒出气泡。把气体收集起来，能让带火星的木条重新燃烧：这是<b className="text-white">氧气</b>。</p>
          <p className="mt-3">灯离得越近，照到水草上的光越强，光合作用越快，气泡就越多。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里的气泡数是按“光强和距离的平方成反比”算出来的，只用来比较大小。真做实验时，每次数出来都会有些出入。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">木条烧起来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">光合作用放出的气体是氧气</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">灯从 10 cm 移到 30 cm，气泡从 {bubbles(10)} 个降到 {bubbles(30)} 个：光越强，光合作用越快。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再数一数</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">这一分钟冒出的气泡</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{count ?? '—'}<span className="ml-1 text-[15px] font-medium text-white/55">个</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="灯距" value={cm} unit="cm · 灯到水草" />
            <ParamTile symbol="灯" value={on ? '开着' : '关着'} unit="数的时候才开" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">数完一分钟后按“记录”。三个距离各记一次。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">灯距</th><th className="text-right font-normal">每分钟气泡数</th></tr></thead>
                <tbody>{rows.map(r => <tr key={r} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{r} cm</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{bubbles(Number(r))} 个</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'start'} onClick={start} disabled={on || tested}>开灯数一分钟</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!full || dup}>记录</LabButton>
        <LabButton pulse={next === 'test'} onClick={test} disabled={rows.length < 3 || on || tested}>检验气体</LabButton>
      </>}
      extras={
        <Control label="灯的距离">
          <Segmented label="灯的距离" pulse={next === 'cm'} want={next === 'cm' ? task!.id as Cm : null} value={cm} disabled={on} onChange={move} options={LAMP_CM.map(d => ({ value: String(d) as Cm, label: `${d} cm` }))} />
        </Control>
      }
    />
  )
}
