// 地球的运动 · 第 6 课 影子的长短（正午太阳高度随季节变化）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import Scene6 from './scene6'
import { LESSONS, goLesson } from './lessons'
import { noonAltitude, shadowLength, subsolarLat, termOf, type TermKey } from './physics'

const LAT = 40, POLE = 10
type Pick = 'equinox' | 'summer' | 'winter'
const PICKS: Record<Pick, { name: string; term: TermKey }> = { summer: { name: '夏至', term: 'summer' }, equinox: { name: '春分、秋分', term: 'spring' }, winter: { name: '冬至', term: 'winter' } }
interface Row { id: number; pick: Pick; alt: number; len: number }
const TASKS: Task[] = [
  { id: 'summer', text: '夏至正午，记下旗杆的影长', note: '夏至太阳最高，影子最短，不到 3 m' },
  { id: 'winter', text: '换到冬至，再记一次', note: '冬至太阳最低，影子最长，有 20 m' },
  { id: 'equinox', text: '换到春分或秋分，再记一次', note: '春分、秋分的太阳高度正好在中间' },
]

export default function Lesson6() {
  const [pick, setPick] = useState<Pick>('equinox')
  const [rows, setRows] = useState<Row[]>([])
  const T = useTasks('gewu:orbit:6', TASKS)
  const goal = noonAltitude(LAT, subsolarLat(termOf(PICKS[pick].term).day))
  const alt = useSlide(goal, 22), moving = Math.abs(alt - goal) > 0.01, len = shadowLength(POLE, alt)
  const dup = rows.some(x => x.pick === pick)
  const record = () => { if (moving || dup) return; const next = [...rows, { id: Date.now(), pick, alt, len }]; setRows(next); T.check(id => next.some(x => x.pick === id)) }
  const resetAll = () => { setPick('equinox'); setRows([]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'record' | 'pick' | null } = (() => {
    if (!task) return { hint: '都做完了。影子最长的那天，是一年里最冷的时候吗？', next: null }
    if (pick !== task.id) return { hint: `把日子换到${PICKS[task.id as Pick].name}`, next: 'pick' }
    if (moving) return { hint: '太阳在挪位置…', next: null }
    return dup ? { hint: '这一天记过了', next: null } : { hint: '顺着卷尺读出影子有多长，再按“记录数据”', next: 'record' }
  })()

  return (
    <LabShell title="地球的运动" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="卷尺"
      stage={<Scene6 altitude={alt} shadow={len} />}
      lesson={
        <LessonBlock no="6" title="影子的长短" concept="太阳越高，影子越短" tasks={TASKS} done={T.done} current={task?.id}
          theory={<>
            <p>正午时太阳在天上的高度，叫<b className="text-white">正午太阳高度</b>。太阳直射点离我们越近，正午的太阳就越高。</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">夏至：</b>直射点最靠北，北京的正午太阳最高，影子最短</li>
              <li><b className="text-[#7fe3d4]">冬至：</b>直射点最靠南，北京的正午太阳最低，影子最长</li>
            </ul>
            <p className="mt-3 text-[13.5px] text-white/65">太阳高，同样多的阳光照在更小的一块地上，地面得到的热量多；再加上白天长，夏天就热。和地球离太阳远近关系不大。</p>
          </>} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">夏天太阳高、影子短，冬天太阳低、影子长</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">北京正午的太阳，夏至比冬至高了 47°，正好是两条回归线之间的纬度差。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">10 m 高的旗杆，正午的影长</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{len.toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数（北京，北纬 40°）</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="H" value={`${alt.toFixed(1)}°`} unit="正午太阳高度" />
            <ParamTile symbol="杆高" value="10" unit="m" />
            <ParamTile symbol="影长" value={len.toFixed(2)} unit="m" />
          </div>
          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[12.5px] text-white/55">数据表</h2>
            {rows.length > 0 && <button onClick={() => setRows([])} className="h-7 rounded-md px-2 text-[12.5px] text-white/55 hover:bg-white/10">清空</button>}
          </div>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">太阳停稳以后按“记录数据”。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">节气</th><th className="text-right font-normal">太阳高度</th><th className="text-right font-normal">影长/m</th></tr></thead>
                <tbody>{rows.map(x => <tr key={x.id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{PICKS[x.pick].name}</td><td className="text-right">{x.alt.toFixed(1)}°</td><td className="text-right font-semibold text-[#7fe3d4]">{x.len.toFixed(2)}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<LabButton primary pulse={next === 'record'} onClick={record} disabled={moving || dup}>记录数据</LabButton>}
      extras={
        <Control label="哪一天的正午">
          <Segmented label="哪一天的正午" pulse={next === 'pick'} want={(task?.id as Pick) ?? null} value={pick} onChange={k => setPick(k as Pick)} options={(Object.keys(PICKS) as Pick[]).map(k => ({ value: k, label: PICKS[k].name }))} />
        </Control>
      }
    />
  )
}
