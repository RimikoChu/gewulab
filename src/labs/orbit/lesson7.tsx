// 地球的运动 · 第 7 课 五带（热带、温带、寒带的划分）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import Scene5 from './scene5'
import { LESSONS, goLesson } from './lessons'
import { YEAR, zones } from './physics'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TILTS = [0, 23.5, 40]
interface Row { id: number; tilt: number; tropic: number; polar: number }
const TASKS: Task[] = [
  { id: '23.5', text: '地轴倾斜 23.5°，记下回归线和极圈', note: '回归线在 23.5°，极圈在 66.5°：倾斜多少度，回归线就在多少度' },
  { id: '0', text: '把地轴扶正（0°），再记一次', note: '不倾斜，太阳永远直射赤道：没有回归线，没有极昼极夜，也就分不出五带' },
  { id: '40', text: '倾斜到 40°，再记一次', note: '倾斜得更多：热带和寒带都变宽了，温带变窄了' },
]

export default function Lesson7() {
  const [goal, setGoal] = useState(23.5)
  const [rows, setRows] = useState<Row[]>([])
  const T = useTasks('gewu:orbit:7', TASKS)
  const tilt = useSlide(goal, 18), moving = Math.abs(tilt - goal) > 0.01, z = zones(Math.round(tilt * 10) / 10)
  const dup = rows.some(x => x.tilt === goal)
  const record = () => { if (moving || dup) return; const next = [...rows, { id: Date.now(), tilt: goal, tropic: z.tropic, polar: z.polar }]; setRows(next); T.check(id => next.some(x => String(x.tilt) === id)) }
  const resetAll = () => { setGoal(23.5); setRows([]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'record' | 'tilt' | null } = (() => {
    if (!task) return { hint: '都做完了。地球的五带，是地轴斜出来的。', next: null }
    if (String(goal) !== task.id) return { hint: `把地轴的倾斜换成 ${task.id}°`, next: 'tilt' }
    if (moving) return { hint: '地轴在动…', next: null }
    return dup ? { hint: '这一组记过了', next: null } : { hint: '看回归线和极圈在哪，再按“记录数据”', next: 'record' }
  })()

  return (
    <LabShell narration={voiced(NARRATION['7'], VOICE)} title="地球的运动" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="数据"
      stage={<Scene5 day={YEAR / 4} tilt={Math.round(tilt * 10) / 10} zonesOn />}
      lesson={
        <LessonBlock no="7" title="五带" concept="地轴斜多少度，决定了五带的界线" tasks={TASKS} done={T.done} current={task?.id}
          theory={<>
            <p>按照能不能被太阳直射、有没有极昼极夜，地球表面分成<b className="text-white">五带</b>。</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#ffb394]">热带：</b>南北回归线之间，有太阳直射，终年炎热</li>
              <li><b className="text-[#a5e6a0]">北温带、南温带：</b>回归线和极圈之间，没有直射也没有极昼极夜，四季分明</li>
              <li><b className="text-[#a9d8ff]">北寒带、南寒带：</b>极圈以内，有极昼极夜，终年寒冷</li>
            </ul>
            <p className="mt-3 text-[13.5px] text-white/65">真实的地球倾斜 23.5°。另外两个角度是假设的，用来比一比。</p>
          </>} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">五带的界线，是地轴的倾斜定的</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">地轴倾斜 23.5°，所以回归线在 23.5°，极圈在 66.5°。地轴要是不斜，就没有五带之分。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">地轴倾斜</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{tilt.toFixed(1)}°</div>
            <div className="mt-2 text-[13px] text-white/55">{goal === 23.5 ? '真实的地球' : '假设的情况'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="回归线" value={z.tropic > 0.05 ? `${z.tropic}°` : '没有'} unit="南北纬" />
            <ParamTile symbol="极圈" value={z.tropic > 0.05 ? `${z.polar}°` : '没有'} unit="南北纬" />
          </div>
          <p className="mt-3 text-[13.5px] leading-snug text-white/65">{z.tropic < 0.05 ? '太阳全年直射赤道，到处昼夜等长。' : z.polar < z.tropic ? '回归线比极圈的纬度还高：有些地方既能被直射，又有极昼极夜。' : '橙色是热带，绿色是温带，蓝色是寒带。'}</p>
          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[12.5px] text-white/55">数据表</h2>
            {rows.length > 0 && <button onClick={() => setRows([])} className="h-7 rounded-md px-2 text-[12.5px] text-white/55 hover:bg-white/10">清空</button>}
          </div>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">地轴停稳以后按“记录数据”。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">倾斜</th><th className="text-right font-normal">回归线</th><th className="text-right font-normal">极圈</th></tr></thead>
                <tbody>{rows.map(x => <tr key={x.id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{x.tilt}°</td><td className="text-right">{x.tropic > 0.05 ? `${x.tropic}°` : '没有'}</td><td className="text-right font-semibold text-[#7fe3d4]">{x.tropic > 0.05 ? `${x.polar}°` : '没有'}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<LabButton primary pulse={next === 'record'} onClick={record} disabled={moving || dup}>记录数据</LabButton>}
      extras={
        <Control label="地轴倾斜多少">
          <Segmented label="地轴倾斜多少" pulse={next === 'tilt'} want={task?.id ?? null} value={String(goal)} onChange={k => setGoal(+k)} options={TILTS.map(t => ({ value: String(t), label: t === 23.5 ? '23.5°（真实）' : `${t}°` }))} />
        </Control>
      }
    />
  )
}
