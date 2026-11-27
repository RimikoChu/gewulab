// 地球和经纬网 · 第 4 课 经线和经度：选一条经线，地球仪转过来，亮起从北极到南极的半圆，记下它的长度
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { MERIDIANS, lonShort, lonText, meridianLength, wan } from './physics'
import { GR, faceLon, globeToWorld, onSphere } from './globe'
import { LESSONS, goLesson } from './lessons'
import { GLOBE_VIEWS, INDOOR } from './views'
import { ST, type Want } from './world'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Lon = typeof MERIDIANS[number]
const key = (l: number) => `m${l}`
const TASKS: Task[] = [
  { id: 'm0', text: '找到本初子午线（0°），记下它的长度', note: '0° 经线通过英国伦敦格林尼治天文台旧址，叫本初子午线' },
  { id: 'm120', text: '换成东经 120°', note: '0° 以东是东经，用 E 表示；长度一样' },
  { id: 'm-60', text: '换成西经 60°', note: '0° 以西是西经，用 W 表示；长度还是一样' },
  { id: 'm180', text: '最后看 180° 经线', note: '东经、西经到 180° 会合；它和 0° 经线合成一个经线圈' },
]

export default function Lesson4() {
  const [lon, setLon] = useState<Lon>(0)
  const [rows, setRows] = useState<Lon[]>([])
  const [nudge, setNudge] = useState(0)
  const T = useTasks('gewu:globe:4', TASKS)
  const spin = useSlide(faceLon(lon) + 14 + nudge, 70), turning = Math.abs(spin - faceLon(lon) - 14 - nudge) > 0.5
  const dup = rows.includes(lon)
  const record = () => { if (dup || turning) return; const next = [...rows, lon]; setRows(next); T.check(id => next.some(l => key(l) === id)) }
  const pick = (l: Lon) => { setLon(l); setNudge(0) }
  const resetAll = () => { setLon(0); setRows([]); setNudge(0); T.reset() }

  const task = T.current, want = task ? (+task.id.slice(1) as Lon) : null
  const name = (l: number) => l === 0 ? '本初子午线' : lonText(l)
  const { hint, next }: { hint: string; next: 'lon' | 'record' | null } = (() => {
    if (!task) return { hint: '都做完了。抓住地球仪转一转：经线都是从北极连到南极。', next: null }
    if (lon !== want) return { hint: `把经线换成${name(want!)}`, next: 'lon' }
    if (turning) return { hint: '地球仪在转…', next: null }
    return dup ? { hint: '这条记过了', next: null } : { hint: `${name(lon)}从北极连到南极：记下它的长度`, next: 'record' }
  })()

  const at = ST.globe
  const mid = (l: number, la: number) => globeToWorld(at, onSphere(la, l, GR * 1.01), spin)
  const labels: Label[] = [
    { id: 'lon', at: mid(lon, 12), ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>{lonShort(lon)}</small>{wan(meridianLength())} 万 km</> },
    { id: 'n', at: globeToWorld(at, [0, GR + 0.05, 0], 0), ax: 0, className: 'scene-tag -translate-y-1/2', children: '北极 ↑ 北' },
    { id: 's', at: globeToWorld(at, [0, -GR - 0.05, 0], 0), ax: 0, className: 'scene-tag -translate-y-1/2', children: '南极 ↓ 南' },
  ]
  const lons = [...rows.filter(l => l !== lon).map(l => ({ lon: l, color: '#7fe3d4' })), { lon, color: '#ffe14d', full: lon === 180 }]
  return (
    <LabShell narration={voiced(NARRATION['4'], VOICE)} title="地球和经纬网" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="经线"
      stage={<LabStage<Want> labels={labels} {...GLOBE_VIEWS.lon} {...INDOOR} world={{ globe: { spin, lons, onSpin: d => setNudge(n => n + d) } }}>{null}</LabStage>}
      lesson={<LessonBlock no="4" title="经线和经度" concept="经线是半圆，长度都相等" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在地球仪上，连接南北两极的线叫<b className="text-white">经线</b>，也叫子午线。经线指示南北方向，每一条都是半个圆圈，长度都相等。</p>
          <p className="mt-2">国际上把通过英国伦敦格林尼治天文台旧址的那条经线定为 0° 经线，叫<b className="text-white">本初子午线</b>。从它向东是<b className="text-white">东经</b>（E），向西是<b className="text-white">西经</b>（W），各分作 180°。东经 180° 和西经 180° 是同一条经线。</p>
          <p className="mt-2">两条相对的经线合起来是一个经线圈，正好把地球平分成两半。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四条经线都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">经线是半圆，长度都相等，指示南北</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">0° 是本初子午线，往东是东经，往西是西经，到 180° 会合。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{name(lon)} 的长度</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{wan(meridianLength())}<span className="ml-1 text-[16px] font-medium text-white/55">万 km</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="经度" value={lonShort(lon)} unit={lon === 0 || lon === 180 ? '不分东西' : lon > 0 ? '东经' : '西经'} />
            <ParamTile symbol="方向" value="南北" unit="经线指示的方向" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">还没有记录。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">经线</th><th className="font-normal">形状</th><th className="text-right font-normal">长度</th></tr></thead>
                <tbody>{rows.map(l => <tr key={l} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{lonShort(l)}</td><td className="text-white/70">半圆</td><td className="text-right font-semibold text-[#7fe3d4]">{wan(meridianLength())} 万 km</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={dup || turning}>记录数据</LabButton>
      </>}
      extras={
        <Control label="经线">
          <Segmented label="经线" pulse={next === 'lon'} want={want === null ? null : String(want)} value={String(lon)} onChange={k => pick(+k as Lon)} options={MERIDIANS.map(l => ({ value: String(l), label: lonShort(l) }))} />
        </Control>
      }
    />
  )
}
