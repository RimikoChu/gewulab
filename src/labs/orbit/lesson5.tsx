// 地球的运动 · 第 5 课 白天有多长（昼夜长短随季节和纬度变化；极昼极夜）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'
import Scene5 from './scene5'
import { LESSONS, goLesson } from './lessons'
import { dayLength, hoursText, latText, subsolarLat, termOf, type TermKey } from './physics'

const PLACES = { eq: { name: '赤道', lat: 0 }, bj: { name: '北京', lat: 40 }, arctic: { name: '北纬 70°', lat: 70 } } as const
type PlaceKey = keyof typeof PLACES
interface Row { id: number; place: PlaceKey; term: TermKey; h: number }
const TASKS: Task[] = [
  { id: 'bj-summer', text: '夏至，记下北京的昼长', note: '夏至这天北京的白天将近 15 小时，是一年里最长的' },
  { id: 'bj-winter', text: '换到冬至，再记一次', note: '冬至只有 9 小时多：同一个地方，白天的长短跟着季节变' },
  { id: 'arctic-summer', text: '夏至，到北纬 70° 看看', note: '整条纬线都在亮的半边：太阳一整天不落，这叫极昼' },
]
const show = (h: number) => h === 24 ? '24 小时（极昼）' : h === 0 ? '0（极夜）' : hoursText(h)

export default function Lesson5() {
  const [term, setTerm] = useState<TermKey>('spring')
  const [place, setPlace] = useState<PlaceKey>('bj')
  const [rows, setRows] = useState<Row[]>([])
  const T = useTasks('gewu:orbit:5', TASKS)
  const day = termOf(term).day, sub = subsolarLat(day), lat = PLACES[place].lat, h = dayLength(lat, sub)
  const dup = rows.some(x => x.place === place && x.term === term)
  const record = () => { if (dup) return; const next = [...rows, { id: Date.now(), place, term, h }]; setRows(next); T.check(id => next.some(x => `${x.place}-${x.term}` === id)) }
  const resetAll = () => { setTerm('spring'); setPlace('bj'); setRows([]); T.reset() }

  const task = T.current, [wp, wt] = (task?.id ?? '-').split('-') as [PlaceKey, TermKey]
  const { hint, next }: { hint: string; next: 'summer' | 'winter' | 'record' | 'place' | null } = (() => {
    if (!task) return { hint: '都做完了。再去赤道看看：那里的昼长变不变？', next: null }
    if (place !== wp) return { hint: `把纬线换到${PLACES[wp].name}`, next: 'place' }
    if (term !== wt) return { hint: `把日子换到${termOf(wt).name}`, next: wt === 'summer' ? 'summer' : 'winter' }
    return dup ? { hint: '这一组记过了', next: null } : { hint: '看白圈有多长一段在亮的半边，再按“记录数据”', next: 'record' }
  })()

  return (
    <LabShell title="地球的运动" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="日子"
      stage={<Scene5 day={day} lat={lat} />}
      lesson={
        <LessonBlock no="5" title="白天有多长" concept="直射点在哪个半球，哪个半球白天就长" tasks={TASKS} done={T.done} current={task?.id}
          theory={<>
            <p>晨昏线把每条纬线分成亮和暗两段。<b className="text-white">亮的一段占得越多，白天越长。</b></p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">夏至：</b>北半球昼最长、夜最短，北极圈以内出现极昼</li>
              <li><b className="text-[#7fe3d4]">冬至：</b>北半球昼最短、夜最长，北极圈以内出现极夜</li>
              <li><b className="text-[#7fe3d4]">春分、秋分：</b>全球昼夜等长</li>
              <li><b className="text-[#7fe3d4]">赤道：</b>全年昼夜等长</li>
            </ul>
            <p className="mt-3 text-[13.5px] text-white/65">这里的昼长是按太阳的位置算的，没有算大气对阳光的折射；实际看到的白天还要长十来分钟。</p>
          </>} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">白天的长短，跟着季节和纬度变</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">夏天白天长、冬天白天短；纬度越高变化越大，到了极圈以内，会有太阳整天不落和整天不升的日子。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看看别的纬度</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{PLACES[place].name} · {termOf(term).name} 的昼长</div>
            <div key={`${place}${term}`} className="pop mt-1 text-[34px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{show(h)}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="纬度" value={lat === 0 ? '0°' : `${lat}°N`} unit={PLACES[place].name} />
            <ParamTile symbol="直射点" value={`${Math.abs(sub).toFixed(1)}°${sub > 0.05 ? 'N' : sub < -0.05 ? 'S' : ''}`} unit={latText(sub).replace(/ .*/, '') || '赤道'} />
            <ParamTile symbol="夜长" value={h === 24 ? '0' : h === 0 ? '24' : (24 - h).toFixed(1)} unit="小时" />
          </div>
          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[12.5px] text-white/55">数据表</h2>
            {rows.length > 0 && <button onClick={() => setRows([])} className="h-7 rounded-md px-2 text-[12.5px] text-white/55 hover:bg-white/10">清空</button>}
          </div>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">选好纬线和日子，按“记录数据”。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">地点</th><th className="font-normal">节气</th><th className="text-right font-normal">昼长</th></tr></thead>
                <tbody>{rows.map(x => <tr key={x.id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{PLACES[x.place].name}</td><td className="text-white/80">{termOf(x.term).name}</td><td className="text-right font-semibold text-[#7fe3d4]">{show(x.h)}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'summer'} onClick={() => setTerm('summer')} disabled={term === 'summer'}>夏至</LabButton>
        <LabButton pulse={next === 'winter'} onClick={() => setTerm('winter')} disabled={term === 'winter'}>冬至</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="看哪条纬线">
          <Segmented label="看哪条纬线" pulse={next === 'place'} want={wp} value={place} onChange={k => setPlace(k as PlaceKey)} options={(Object.keys(PLACES) as PlaceKey[]).map(k => ({ value: k, label: PLACES[k].name }))} />
        </Control>
      }
    />
  )
}
