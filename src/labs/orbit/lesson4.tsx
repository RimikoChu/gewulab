// 地球的运动 · 第 4 课 太阳直射到哪了（太阳直射点在南北回归线之间移动；二分二至）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import Scene4 from './scene4'
import { LESSONS, goLesson } from './lessons'
import { TERMS, TILT, YEAR, dateText, latText, nearTerm, subsolarLat, type TermKey } from './physics'

interface Row { id: number; day: number; term: TermKey | null; lat: number }
const TASKS: Task[] = [
  { id: 'summer', text: '让地球走到夏至，记下直射点', note: '夏至：太阳直射北回归线（北纬 23.5°），再不往北了' },
  { id: 'winter', text: '走到冬至，再记一次', note: '冬至：太阳直射南回归线（南纬 23.5°），再不往南了' },
  { id: 'equinox', text: '走到春分或秋分，再记一次', note: '春分和秋分：太阳直射赤道' },
]

export default function Lesson4() {
  const [goal, setGoal] = useState(40)                 // 从春分起的天数；可以超过一年，画面上取余数
  const [rows, setRows] = useState<Row[]>([])
  const T = useTasks('gewu:orbit:4', TASKS)
  const pos = useSlide(goal, 75), day = ((pos % YEAR) + YEAR) % YEAR
  const moving = Math.abs(pos - goal) > 0.01
  const sub = subsolarLat(day), term = nearTerm(day)
  const nextTerm = () => { const k = Math.floor(goal / (YEAR / 4) + 1e-6) + 1; setGoal(k * YEAR / 4) }
  const dup = rows.some(x => Math.abs(x.day - day) < 1.5)
  const record = () => {
    if (moving || dup) return
    const next = [...rows, { id: Date.now(), day, term: term?.key ?? null, lat: sub }]
    setRows(next)
    T.check(id => id === 'equinox' ? next.some(x => x.term === 'spring' || x.term === 'autumn') : next.some(x => x.term === id))
  }
  const resetAll = () => { setGoal(40); setRows([]); T.reset() }

  const task = T.current
  const want = (id?: string) => id === 'equinox' ? ['spring', 'autumn'] : id ? [id] : []
  const { hint, next }: { hint: string; next: 'term' | 'record' | null } = (() => {
    if (!task) return { hint: '都做完了。拖一拖日期，看直射点怎样在两条回归线之间来回。', next: null }
    if (moving) return { hint: '地球在走…', next: null }
    if (term && want(task.id).includes(term.key)) return dup ? { hint: '这一天记过了', next: null } : { hint: `到${term.name}了：按“记录数据”`, next: 'record' }
    return { hint: `让地球走到${task.id === 'equinox' ? '春分或秋分' : TERMS.find(t => t.key === task.id)!.name}（按“下一个节气”，或者拖日期）`, next: 'term' }
  })()

  return (
    <LabShell title="地球的运动" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地球"
      stage={<Scene4 day={day} />}
      lesson={
        <LessonBlock no="4" title="太阳直射到哪了" concept="直射点在两条回归线之间来回" tasks={TASKS} done={T.done} current={task?.id}
          theory={<>
            <p>地球斜着身子绕太阳转，地轴始终指着同一个方向。所以一年里，<b className="text-white">太阳直射点在南、北回归线之间来回移动</b>。</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">春分、秋分：</b>直射赤道</li>
              <li><b className="text-[#7fe3d4]">夏至：</b>直射北回归线（北纬 23.5°）</li>
              <li><b className="text-[#7fe3d4]">冬至：</b>直射南回归线（南纬 23.5°）</li>
            </ul>
            <p className="mt-3 text-[13.5px] text-white/65">节气的名字是按北半球叫的。</p>
          </>} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">太阳直射点在南北回归线之间来回</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">最北到北纬 23.5°（夏至），最南到南纬 23.5°（冬至），一年经过赤道两次（春分、秋分）。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再拖一拖看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">太阳直射点的纬度</div>
            <div className="mt-1 text-[38px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{latText(sub)}</div>
            <div className="mt-2 text-[13px] text-white/55">{dateText(day)}{term ? ` · ${term.name}` : ''}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="日期" value={dateText(day).replace(/ /g, '')} unit={term ? term.name : '从春分起第 ' + Math.round(day) + ' 天'} />
            <ParamTile symbol="北回归线" value={`${TILT}°`} unit="北纬" />
            <ParamTile symbol="南回归线" value={`${TILT}°`} unit="南纬" />
          </div>
          <p className="mt-3 text-[13.5px] leading-snug text-white/65">{Math.abs(sub) < 0.5 ? '太阳正照在赤道上，南北半球得到的阳光一样多。' : sub > 0 ? '直射点在北半球：北半球得到的阳光多。' : '直射点在南半球：南半球得到的阳光多。'}</p>
          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[12.5px] text-white/55">数据表</h2>
            {rows.length > 0 && <button onClick={() => setRows([])} className="h-7 rounded-md px-2 text-[12.5px] text-white/55 hover:bg-white/10">清空</button>}
          </div>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">地球停稳以后按“记录数据”。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">日期</th><th className="font-normal">节气</th><th className="text-right font-normal">直射点</th></tr></thead>
                <tbody>{rows.map(x => (
                  <tr key={x.id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{dateText(x.day)}</td><td className="text-white/80">{x.term ? TERMS.find(t => t.key === x.term)!.name : '—'}</td><td className="text-right font-semibold text-[#7fe3d4]">{latText(x.lat)}</td></tr>
                ))}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'term'} onClick={nextTerm} disabled={moving}>下一个节气</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={moving || dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label={`日期（拖动）：${dateText(day)}`}>
          <input type="range" min={0} max={YEAR - 1} step={1} value={Math.round(day)} aria-label="日期" onChange={e => setGoal(+e.target.value)}
            className="h-11 w-56 cursor-pointer accent-[#35c7b3]" />
        </Control>
      }
    />
  )
}
