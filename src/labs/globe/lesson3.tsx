// 地球和经纬网 · 第 3 课 纬线和纬度：选一条纬线，地球仪上亮起这一圈，记下它的长度
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { PARALLELS, latShort, latText, parallelLength, wan } from './physics'
import { GR, faceLon, globeToWorld, onSphere } from './globe'
import { LESSONS, goLesson } from './lessons'
import { GLOBE_VIEWS, INDOOR } from './views'
import { ST, type Want } from './world'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Lat = typeof PARALLELS[number]
const key = (l: number) => `p${l}`
const TASKS: Task[] = [
  { id: 'p0', text: '选赤道，记下它的长度', note: '赤道是最长的纬线，约 4 万 km' },
  { id: 'p30', text: '换成北纬 30°，再记一次', note: '往北走，纬线变短了' },
  { id: 'p60', text: '换成北纬 60°', note: '60° 纬线只有赤道的一半长' },
  { id: 'p-30', text: '换成南纬 30°', note: '和北纬 30° 一样长：赤道以南是南纬' },
  { id: 'p90', text: '最后看北纬 90°', note: '北纬 90° 已经不是一圈，而是一个点：北极' },
]
const FACE = faceLon(105)

export default function Lesson3() {
  const [lat, setLat] = useState<Lat>(0)
  const [rows, setRows] = useState<Lat[]>([])
  const [goal, setGoal] = useState(FACE)
  const T = useTasks('gewu:globe:3', TASKS)
  const spin = useSlide(goal, 60)
  const len = parallelLength(lat), dup = rows.includes(lat)
  const record = () => { if (dup) return; const next = [...rows, lat]; setRows(next); T.check(id => next.some(l => key(l) === id)) }
  const resetAll = () => { setLat(0); setRows([]); setGoal(FACE); T.reset() }

  const task = T.current, want = task ? (+task.id.slice(1) as Lat) : null
  const { hint, next }: { hint: string; next: 'lat' | 'record' | null } = (() => {
    if (!task) return { hint: '都做完了。抓住地球仪转一转：纬线一圈都是东西方向。', next: null }
    if (lat !== want) return { hint: `把纬线换成${want === 0 ? '赤道' : latText(want!)}`, next: 'lat' }
    return { hint: lat === 90 ? '北纬 90°：看它还是不是一圈。记下来' : `${lat === 0 ? '赤道' : latText(lat)}的长度：记下来`, next: 'record' }
  })()

  const at = ST.globe
  const front = (l: number) => globeToWorld(at, onSphere(l, -90 - spin + 18, GR * 1.01), spin)
  const labels: Label[] = [
    { id: 'lat', at: front(lat), ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>{lat === 0 ? '赤道' : latShort(lat)}</small>{lat === 90 ? '一个点' : `${wan(len)} 万 km`}</> },
    { id: 'e', at: globeToWorld(at, onSphere(lat === 90 ? 80 : lat, -90 - spin - 50, GR * 1.04), spin), ax: 1, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: lat === 90 ? 0 : 1 }, children: '← 西' },
    { id: 'w', at: globeToWorld(at, onSphere(lat === 90 ? 80 : lat, -90 - spin + 75, GR * 1.04), spin), ax: 0, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: lat === 90 ? 0 : 1 }, children: '东 →' },
    { id: 'np', at: globeToWorld(at, [0, GR + 0.05, 0], 0), ax: 0, className: 'scene-name -translate-y-1/2', name: true, children: '北极' },
  ]
  const lats = [...rows.filter(l => l !== lat).map(l => ({ lat: l, color: '#7fe3d4' })), { lat, color: '#ffe14d' }]
  return (
    <LabShell narration={voiced(NARRATION['3'], VOICE)} title="地球和经纬网" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="纬线"
      stage={<LabStage<Want> labels={labels} {...GLOBE_VIEWS.lat} {...INDOOR} world={{ globe: { spin, lats, onSpin: d => setGoal(g => g + d) } }}>{null}</LabStage>}
      lesson={<LessonBlock no="3" title="纬线和纬度" concept="纬线是圆圈，越往两极越短" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在地球仪上，顺着东西方向、环绕地球仪一周的圆圈，叫<b className="text-white">纬线</b>。纬线指示东西方向，每一条都是一个圆圈。</p>
          <p className="mt-2">赤道最长，往两极逐渐变短，到南北两极缩成一个点。</p>
          <p className="mt-2">赤道的纬度是 0°。赤道以北是<b className="text-white">北纬</b>，用 N 表示；以南是<b className="text-white">南纬</b>，用 S 表示。北极是北纬 90°，南极是南纬 90°。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">五条纬线都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">纬线是圆圈，赤道最长，向两极变短</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">纬线指示东西方向。赤道以北是北纬，以南是南纬；到 90° 缩成一个点。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{lat === 0 ? '赤道' : latText(lat)} 的长度</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{lat === 90 ? '0' : wan(len)}<span className="ml-1 text-[16px] font-medium text-white/55">万 km</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">和赤道比</h2>
          <div className="mt-2 flex flex-col gap-1.5">
            {PARALLELS.map(l => (
              <div key={l} className="flex items-center gap-2 text-[13px] tabular-nums">
                <span className="w-14 text-white/70">{l === 0 ? '赤道' : latShort(l)}</span>
                <div className="h-2.5 flex-1 rounded-full bg-white/8"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${rows.includes(l) ? (parallelLength(l) / parallelLength(0)) * 100 : 0}%`, background: l === lat ? '#ffe14d' : '#35c7b3' }} /></div>
                <span className="w-14 text-right text-white/80">{rows.includes(l) ? (l === 90 ? '一个点' : wan(parallelLength(l))) : '—'}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="纬度" value={lat === 0 ? '0°' : latShort(lat)} unit={lat === 0 ? '赤道' : lat > 0 ? '北纬' : '南纬'} />
            <ParamTile symbol="方向" value="东西" unit="纬线指示的方向" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="纬线">
          <Segmented label="纬线" pulse={next === 'lat'} want={want === null ? null : String(want)} value={String(lat)} onChange={k => setLat(+k as Lat)} options={PARALLELS.map(l => ({ value: String(l), label: l === 0 ? '赤道' : latShort(l) }))} />
        </Control>
      }
    />
  )
}
