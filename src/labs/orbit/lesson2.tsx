// 地球的运动 · 第 2 课 东边先天亮（时间的差异；经度和时间）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import Scene1 from './scene1'
import { LESSONS, goLesson } from './lessons'
import { CITIES, clockText, hoursText, localTime, timeGap, utcForNoon, type CityKey } from './physics'

type Other = Exclude<CityKey, 'beijing'>
interface Row { id: number; city: Other; dLon: number; gap: number; tB: number; tO: number }
const TASKS: Task[] = [
  { id: 'london', text: '北京正午时，记下伦敦是几点', note: '伦敦在北京西边 116°，太阳还要 7 个多小时才转到它头顶' },
  { id: 'urumqi', text: '换成乌鲁木齐，再记一次', note: '同在中国，乌鲁木齐比北京靠西约 29°，太阳晚到将近两小时' },
  { id: 'newyork', text: '换成纽约，再记一次', note: '纽约在地球的另一侧：北京正午时，那里还是前一天的深夜' },
]
const OTHERS: Other[] = ['london', 'urumqi', 'newyork']

export default function Lesson2() {
  const B = CITIES.beijing, noon = utcForNoon(B.lon)
  const [goal, setGoal] = useState(noon - 5)
  const [city, setCity] = useState<Other>('london')
  const [rows, setRows] = useState<Row[]>([])
  const [touched, setTouched] = useState(false)
  const T = useTasks('gewu:orbit:2', TASKS)
  const utc = useSlide(goal, 6), moving = Math.abs(utc - goal) > 0.01
  const O = CITIES[city], tB = localTime(utc, B.lon), tO = localTime(utc, O.lon), gap = timeGap(B.lon, O.lon)
  const atNoon = Math.abs(tB - 12) < 0.02
  const toNoon = () => setGoal(g => g + ((noon - g) % 24 + 24) % 24)
  const dup = rows.some(x => x.city === city)
  const record = () => {
    if (moving || !atNoon || dup) return
    const next = [...rows, { id: Date.now(), city, dLon: B.lon - O.lon, gap, tB, tO }]
    setRows(next); T.check(id => next.some(x => x.city === id))
  }
  const resetAll = () => { setGoal(noon - 5); setCity('london'); setRows([]); setTouched(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'noon' | 'record' | 'city' | null } = (() => {
    if (!task) return { hint: '都做完了。拨一拨地球，看哪座城市先看到太阳。', next: null }
    if (city !== task.id) return { hint: `把另一座城市换成${CITIES[task.id as Other].name}`, next: 'city' }
    if (moving) return { hint: '地球在转…', next: null }
    if (!atNoon) return { hint: '先让北京转到正午（太阳正对着它）', next: 'noon' }
    return dup ? { hint: '这座城市记过了', next: null } : { hint: `北京 12:00，${O.name} ${clockText(tO)}：按“记录数据”`, next: 'record' }
  })()

  return (
    <LabShell title="地球的运动" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地球（也可以直接抓住它拨）"
      stage={<Scene1 utc={utc} cities={['beijing', city]} onSpin={h => { setTouched(true); setGoal(g => g + h) }} dragHint={!touched} times />}
      lesson={
        <LessonBlock no="2" title="东边先天亮" concept="越往东，时间越早" tasks={TASKS} done={T.done} current={task?.id}
          theory={<>
            <p>地球自西向东转，<b className="text-white">东边的地方先看到太阳</b>，时间也就比西边早。</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">一圈 360°，用时 24 小时：</b>经度每差 15°，时间差 1 小时</li>
              <li><b className="text-[#7fe3d4]">东早西晚：</b>同一时刻，东边的钟点数大</li>
            </ul>
            <p className="mt-3 text-[13.5px] text-white/65">这里比的是按太阳位置算的当地时间。日常生活里为了方便，一个国家或地区会统一用一个时间。</p>
          </>} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三座城市都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">经度每差 15°，时间差 1 小时</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">地球自西向东转，东边先天亮。离得越远，时间差得越多。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再拨一拨看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div><div className="text-[13px] text-white/60">北京</div><div className="mt-1 text-[36px] leading-none font-bold tabular-nums text-[#7fe3d4]">{clockText(tB)}</div></div>
            <div><div className="text-[13px] text-white/60">{O.name}</div><div className="mt-1 text-[36px] leading-none font-bold tabular-nums">{clockText(tO)}</div></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="经度差" value={`${(B.lon - O.lon).toFixed(1)}°`} unit={`北京在${O.name}东边`} />
            <ParamTile symbol="时间差" value={hoursText(gap).replace(' 小时 ', ':').replace(' 分', '')} unit="小时:分 · 北京早" />
          </div>
          <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70">{(B.lon - O.lon).toFixed(1)}° ÷ 15° = <b className="text-white">{gap.toFixed(2)} 小时</b></p>
          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[12.5px] text-white/55">数据表（北京 12:00 时）</h2>
            {rows.length > 0 && <button onClick={() => setRows([])} className="h-7 rounded-md px-2 text-[12.5px] text-white/55 hover:bg-white/10">清空</button>}
          </div>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">北京转到正午以后按“记录数据”。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">城市</th><th className="text-right font-normal">经度差</th><th className="text-right font-normal">当地时间</th><th className="text-right font-normal">差</th></tr></thead>
                <tbody>{rows.map(x => (
                  <tr key={x.id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{CITIES[x.city].name}</td><td className="text-right">{x.dLon.toFixed(1)}°</td><td className="text-right">{clockText(x.tO)}</td><td className="text-right font-semibold text-[#7fe3d4]">{hoursText(x.gap).replace(' 小时 ', ':').replace(' 分', '')}</td></tr>
                ))}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'noon'} onClick={toNoon} disabled={moving || atNoon}>北京正午</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={moving || !atNoon || dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="另一座城市">
          <Segmented label="另一座城市" pulse={next === 'city'} want={(task?.id as Other) ?? null} value={city} onChange={k => setCity(k as Other)} options={OTHERS.map(k => ({ value: k, label: CITIES[k].name }))} />
        </Control>
      }
    />
  )
}
