// 压强 · 第 6 课 空气也在压（大气压强；托里拆利实验）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import Scene6 from './scene6'
import { LESSONS, goLesson } from './lessons'
import { SPOTS, TUBE, kPa, solve6, type SpotKey } from './physics'
import { useSlide, useTasks } from '@/lab-kit'

interface Row { id: number; spot: SpotKey; tilt: number; thick: boolean; h: number; len: number }
const TASKS: Task[] = [
  { id: 'up', text: '管子竖直，记下水银柱的高度', note: '大气压托住了 760 mm 高的水银柱' },
  { id: 'tilt', text: '把管子倾斜，再记一次', note: '管里的水银变长了，竖直高度还是 760 mm' },
  { id: 'peak', text: '带到雪山顶，再做一次', note: '山顶空气稀薄，大气压小，托住的水银柱也矮' },
]

export default function Lesson6() {
  const [spot, setSpot] = useState<SpotKey>('crest')
  const [goal, setGoal] = useState(0)
  const [thick, setThick] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [touched, setTouched] = useState(false)
  const T = useTasks('gewu:pressure:6', TASKS)
  const tilt = useSlide(goal, 40)
  const r = solve6(spot, tilt), mm = Math.round(r.h * 1000)
  const moving = Math.abs(tilt - goal) > 0.01
  const dup = rows.some(x => x.spot === spot && x.thick === thick && Math.abs(x.tilt - tilt) < 2)
  const record = () => {
    if (moving || dup) return
    const next = [...rows, { id: Date.now(), spot, tilt: Math.round(tilt), thick, h: mm, len: Math.round(r.len * 1000) }]
    setRows(next)
    T.check(id => id === 'up' ? next.some(x => x.spot === 'crest' && x.tilt === 0) : id === 'tilt' ? next.some(x => x.spot === 'crest' && x.tilt >= 10) : next.some(x => x.spot === 'peak'))
  }
  const resetAll = () => { setSpot('crest'); setGoal(0); setThick(false); setRows([]); setTouched(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'tilt' | 'record' | 'spot' | null } = (() => {
    if (!task) return { hint: '都做完了。换粗管再试试：水银柱的高度变不变？', next: null }
    if (task.id === 'peak') return spot !== 'peak' ? { hint: '把地点换到雪山顶', next: 'spot' } : dup ? { hint: '这一组记过了', next: null } : { hint: '按“记录数据”', next: 'record' }
    if (spot !== 'crest') return { hint: '先回到坝顶', next: 'spot' }
    if (moving) return { hint: '…', next: null }
    if (task.id === 'up') return tilt > 0.5 ? { hint: '先把管子扶正', next: 'tilt' } : { hint: '按“记录数据”，记下水银柱有多高', next: 'record' }
    return tilt < 10 ? { hint: '把管子倾斜（点按钮，或者抓住管子往右拖）', next: 'tilt' } : dup ? { hint: '这一组记过了', next: null } : { hint: '按“记录数据”', next: 'record' }
  })()

  return (
    <LabShell title="压强" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="玻璃管（也可以直接抓住它倾斜）"
      stage={<Scene6 spot={spot} tilt={tilt} thick={thick} h={r.h} len={r.len} onTilt={d => { setTouched(true); setGoal(d) }} dragHint={!touched} />}
      lesson={
        <LessonBlock no="6" title="空气也在压" concept="我们头顶上压着一整片空气" tasks={TASKS} done={T.done} current={task?.id}
          theory={<>
            <p>空气有重力，又能流动，所以大气对浸在里面的物体也有压强，叫<b className="text-white">大气压强</b>。</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">托里拆利实验：</b>管外的大气压托住了管里的水银柱</li>
              <li><b className="text-[#7fe3d4]">标准大气压：</b>760 mm 水银柱，约 1.013×10⁵ Pa</li>
              <li><b className="text-[#7fe3d4]">看的是竖直高度：</b>和管子粗细、是否倾斜无关</li>
              <li><b className="text-[#ffd27a]">海拔越高：</b>大气压越小</li>
            </ul>
            <p className="mt-3 text-[13.5px] text-white/65">如果把水银换成水，要 10.3 m 高的水柱才顶得住。</p>
          </>} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">大气压托住了 760 mm 高的水银柱</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">管子斜了、粗了，竖直高度都不变；到了高处，大气压变小，水银柱才变矮。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再试一试</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">水银柱的竖直高度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{mm}<span className="ml-1 text-[15px] font-medium text-white/55">mm</span></div>
            <div className="mt-2 text-[13px] text-white/55">这里的大气压约 {kPa(r.p0)} kPa</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">{SPOTS[spot].name}（{SPOTS[spot].note}）</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="高度" value={String(mm)} unit="mm · 竖直" />
            <ParamTile symbol="长度" value={String(Math.round(r.len * 1000))} unit="mm · 管里" />
            <ParamTile symbol="倾斜" value={`${Math.round(tilt)}°`} unit={thick ? '粗管' : '细管'} />
          </div>
          <p className="mt-3 text-[13.5px] leading-snug text-white/65">{r.full ? '管子太斜，水银已经充满整根管，顶上没有真空了。' : tilt >= 5 ? '管子斜了，水银在管里走得更长，可是顶端离槽里水银面的竖直高度没变。' : '管里水银柱产生的压强，正好等于管外的大气压。'}</p>
          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[12.5px] text-white/55">数据表</h2>
            {rows.length > 0 && <button onClick={() => setRows([])} className="h-7 rounded-md px-2 text-[12.5px] text-white/55 hover:bg-white/10">清空</button>}
          </div>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">按“记录数据”记下水银柱的高度。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">地点</th><th className="text-right font-normal">管子</th><th className="text-right font-normal">长度/mm</th><th className="text-right font-normal">高度/mm</th></tr></thead>
                <tbody>{rows.map(x => (
                  <tr key={x.id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{SPOTS[x.spot].name}</td><td className="text-right text-white/80">{x.thick ? '粗' : '细'} {x.tilt}°</td><td className="text-right">{x.len}</td><td className="text-right font-semibold text-[#7fe3d4]">{x.h}</td></tr>
                ))}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'tilt'} onClick={() => { setTouched(true); setGoal(goal > 0.5 ? 0 : TUBE.tilt) }}>{goal > 0.5 ? '扶正' : `倾斜 ${TUBE.tilt}°`}</LabButton>
        <LabButton onClick={() => setThick(v => !v)}>{thick ? '换细管' : '换粗管'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={moving || dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="在哪里做">
          <Segmented label="在哪里做" pulse={next === 'spot'} want={task?.id === 'peak' ? 'peak' : 'crest'} value={spot} onChange={k => { setSpot(k as SpotKey); setGoal(0) }} options={(Object.keys(SPOTS) as SpotKey[]).map(k => ({ value: k, label: SPOTS[k].name }))} />
        </Control>
      }
    />
  )
}
