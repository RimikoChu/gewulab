// 压强 · 第 7 课 流得快，压得轻（流体压强与流速的关系）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import Scene7 from './scene7'
import { LESSONS, goLesson } from './lessons'
import { WIND, paperGap, solve7 } from './physics'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

interface Row { id: number; v: number; top: number; bot: number; dp: number }
const TASKS: Task[] = [
  { id: 'paper', text: '往两张纸中间吹气', note: '中间的空气流得快、压强小，两边的空气把纸往中间推' },
  { id: 'low', text: '换成机翼，开小风，记下上下表面的压强', note: '上表面的气流快，压强比下表面小' },
  { id: 'high', text: '开大风，再记一次', note: '风越大，压强差越大：机翼被托起来了' },
]
type Mode = 'paper' | 'wing'

export default function Lesson7() {
  const [mode, setMode] = useState<Mode>('paper')
  const [goal, setGoal] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const T = useTasks('gewu:pressure:7', TASKS)
  const v = useSlide(goal, 14)
  const r = solve7(v), steady = Math.abs(v - goal) < 0.01
  useEffect(() => { if (mode !== 'paper' || goal < WIND.low || !steady) return; const t = setTimeout(() => T.check(id => id === 'paper'), 1200); return () => clearTimeout(t) }, [mode, goal, steady])   // eslint-disable-line react-hooks/exhaustive-deps
  const wind = (x: number) => setGoal(g => (g === x ? 0 : x))
  const dup = rows.some(x => x.v === Math.round(v))
  const record = () => {
    if (mode !== 'wing' || !steady || v < 1 || dup) return
    const next = [...rows, { id: Date.now(), v: Math.round(v), top: r.top, bot: r.bot, dp: r.dp }]
    setRows(next)
    T.check(id => id === 'low' ? next.some(x => x.v === WIND.low) : id === 'high' && next.some(x => x.v === WIND.high))
  }
  const resetAll = () => { setMode('paper'); setGoal(0); setRows([]); T.reset() }

  const task = T.current, wantMode: Mode = task?.id === 'paper' ? 'paper' : 'wing', wantV = task?.id === 'high' ? WIND.high : WIND.low
  const { hint, next }: { hint: string; next: 'low' | 'high' | 'record' | 'mode' | null } = (() => {
    if (!task) return { hint: '都做完了。火车进站时，人为什么要站在安全线外？', next: null }
    if (mode !== wantMode) return { hint: wantMode === 'wing' ? '换成机翼' : '换回两张纸', next: 'mode' }
    if (goal !== wantV) return { hint: task.id === 'paper' ? '打开风：先猜，两张纸会分开还是靠拢？' : `把风开到${wantV === WIND.low ? '小风' : '大风'}`, next: wantV === WIND.low ? 'low' : 'high' }
    if (!steady) return { hint: '风速在变…', next: null }
    return task.id === 'paper' ? { hint: '两张纸向中间靠拢了', next: null } : { hint: '按“记录数据”', next: 'record' }
  })()

  return (
    <LabShell narration={voiced(NARRATION['7'], VOICE)} title="压强" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="风（再点一次关掉）"
      stage={<Scene7 mode={mode} v={v} r={r} />}
      lesson={
        <LessonBlock no="7" title="流得快，压得轻" concept="流得快的那一边，压强小" tasks={TASKS} done={T.done} current={task?.id}
          theory={<>
            <p>在气体和液体中，<b className="text-white">流速越大的位置，压强越小</b>。</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">机翼：</b>上表面拱起，气流走得快，压强小；下表面压强大，合起来有向上的升力</li>
              <li><b className="text-[#7fe3d4]">安全线：</b>列车带动身边的空气快速流动，人身后的气压会把人推向列车</li>
              <li><b className="text-[#7fe3d4]">并排的船：</b>两船中间的水流得快，会被两侧的水挤到一起</li>
            </ul>
          </>} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三项都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">流速越大的地方，压强越小</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">机翼上方的气流比下方快，下面的压强比上面大，飞机就被托了起来。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再试一试</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {mode === 'paper' ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">两张纸下端相距</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{Math.round(paperGap(v) * 100)}<span className="ml-1 text-[15px] font-medium text-white/55">cm</span></div>
              <div className="mt-2 text-[13px] text-white/55">不吹的时候是 50 cm</div>
            </div>
            <p className="mt-4 text-[13.5px] leading-snug text-white/65">{v < 1 ? '两张纸自然下垂。往中间吹气，它们会分开还是靠拢？' : '中间的空气在流动，压强变小了；纸外侧的空气没动，压强大，把纸往中间推。'}</p>
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">上下表面的压强差</div>
              <div key={String(r.up)} className={r.up ? 'pop mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]' : 'mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums'}>{r.dp.toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">Pa</span></div>
              <div className="mt-2 text-[13px] text-white/55">{r.up ? '向上的力超过了机翼的重力：托起来了' : '下面压强大，上面压强小'}</div>
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <ParamTile symbol="v" value={v.toFixed(0)} unit="m/s · 风速" />
              <ParamTile symbol="上表面" value={`−${r.top.toFixed(0)}`} unit="Pa · 比周围低" />
              <ParamTile symbol="下表面" value={`+${r.bot.toFixed(0)}`} unit="Pa · 比周围高" />
            </div>
            <p className="mt-3 text-[13.5px] leading-snug text-white/65">压强差 × 机翼面积 {WIND.wingS} m² = 向上的力 {r.lift.toFixed(0)} N；机翼重 {WIND.wingW} N。</p>
            <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
            {rows.length === 0
              ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">风速稳定以后按“记录数据”。</p>
              : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                  <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">风速</th><th className="text-right font-normal">上/Pa</th><th className="text-right font-normal">下/Pa</th><th className="text-right font-normal">差/Pa</th></tr></thead>
                  <tbody>{rows.map(x => (
                    <tr key={x.id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{x.v} m/s</td><td className="text-right">−{x.top.toFixed(0)}</td><td className="text-right">+{x.bot.toFixed(0)}</td><td className="text-right font-semibold text-[#7fe3d4]">{x.dp.toFixed(0)}</td></tr>
                  ))}</tbody>
                </table>}
          </>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'low'} onClick={() => wind(WIND.low)}>{goal === WIND.low ? '关风' : `小风 ${WIND.low} m/s`}</LabButton>
        <LabButton pulse={next === 'high'} onClick={() => wind(WIND.high)}>{goal === WIND.high ? '关风' : `大风 ${WIND.high} m/s`}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={mode !== 'wing' || !steady || v < 1 || dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="吹什么">
          <Segmented label="吹什么" pulse={next === 'mode'} want={wantMode} value={mode} onChange={k => { setMode(k as Mode); setGoal(0) }} options={[{ value: 'paper', label: '两张纸' }, { value: 'wing', label: '机翼' }]} />
        </Control>
      }
    />
  )
}
