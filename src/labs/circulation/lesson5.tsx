// 大气环流 · 第 5 课 气压带、风带对气候的影响：镜头推近到雅典、新加坡、达尔文三处。时间一走，气压带和风带跟着直射点南北移动，
// 看每个月是谁“盖”在这个地方头上：低压带多雨、高压带少雨，西风从海上带来雨水。
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { cn } from '@/lib/utils'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Big, Fin, H2, pTag, valTag } from './parts'
import { CTRL_NAME, CTRL_WET, MONTH_DAY, PLACES, YEAR, beltLat, controlAt, monthOf, subsolarRaw, yearOf, type Air, type PlaceKey } from './physics'
import { VOICE } from './voice'
import { SPACE, at, azFor, type Want } from './world'

const TASKS: Task[] = [
  { id: 'ajul', text: '雅典：到七月，看谁控制它', note: '夏季受副热带高气压带控制：炎热干燥' },
  { id: 'ajan', text: '雅典：再到一月', note: '冬季受西风带控制：温和多雨。这就是地中海气候' },
  { id: 'sing', text: '新加坡：走过一年', note: '全年受赤道低气压带控制：全年高温多雨，热带雨林气候' },
  { id: 'darw', text: '达尔文：走过一年', note: '赤道低气压带和东南信风带交替控制：干湿季分明，热带草原气候' },
]
const WANT_PLACE: Record<string, PlaceKey> = { ajul: 'athens', ajan: 'athens', sing: 'singapore', darw: 'darwin' }
const RAD = Math.PI / 180
const SPOTS = Object.fromEntries((Object.keys(PLACES) as PlaceKey[]).map(k => {
  const p = PLACES[k], [x, y, z] = at(p.lon, p.lat, 0.92)
  return [k, { target: new THREE.Vector3(x, y, z), view: [azFor(p.lon), p.lat * RAD * 0.85 + 0.06] as [number, number] }]
})) as Record<PlaceKey, { target: THREE.Vector3; view: [number, number] }>
const SPAN: [number, number] = [19, 15]
const MONTH = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

export default function Lesson5() {
  const [place, setPlace] = useState<PlaceKey>('athens')
  const [goal, setGoal] = useState(MONTH_DAY[3])
  const [year, setYear] = useState<{ place: PlaceKey; to: number } | null>(null)
  const T = useTasks('gewu:circulation:5', TASKS)
  const pos = useSlide(goal, 70), day = ((pos % YEAR) + YEAR) % YEAR, moving = Math.abs(pos - goal) > 0.01
  const P = PLACES[place], m = monthOf(day), ctrl = controlAt(P.lat, day)
  const tRef = useRef(T); tRef.current = T
  useEffect(() => {
    if (moving) return
    if (year && Math.abs(pos - year.to) < 0.01) { const p = year.place; setYear(null); tRef.current.check(id => (id === 'sing' && p === 'singapore') || (id === 'darw' && p === 'darwin')) }
    if (place === 'athens') tRef.current.check(id => (id === 'ajul' && m === 7) || (id === 'ajan' && m === 1 && !!tRef.current.done.ajul))
  }, [moving, pos])   // eslint-disable-line react-hooks/exhaustive-deps
  const toMonth = (mm: number) => setGoal(g => g - (((g % YEAR) + YEAR) % YEAR) + MONTH_DAY[mm - 1] + (MONTH_DAY[mm - 1] < ((g % YEAR) + YEAR) % YEAR ? YEAR : 0))
  const walkYear = () => { setYear({ place, to: goal + YEAR }); setGoal(g => g + YEAR) }
  const pick = (k: PlaceKey) => { setPlace(k); setYear(null) }
  const resetAll = () => { setPlace('athens'); setGoal(MONTH_DAY[3]); setYear(null); T.reset() }

  const task = T.current
  const wp = task ? WANT_PLACE[task.id] : null
  const { hint, next }: { hint: string; next: 'place' | 'jul' | 'jan' | 'year' | null } = (() => {
    if (!task) return { hint: '都做完了。谁控制这里，就决定这里下不下雨。', next: null }
    if (wp && place !== wp) return { hint: `换到${PLACES[wp].name}`, next: 'place' }
    if (moving) return { hint: '时间在走，看是哪个气压带或风带盖在这里…', next: null }
    if (task.id === 'ajul') return { hint: '到七月，看谁控制雅典', next: 'jul' }
    if (task.id === 'ajan') return { hint: '再到一月，看看雅典', next: 'jan' }
    return { hint: `让${P.name}走过一年`, next: 'year' }
  })()

  const sr = Math.round(subsolarRaw(day) * 2) / 2
  const air: Air = useMemo(() => ({ k: 1, sunLat: sr }), [sr])
  const months = yearOf(place)
  const shown = place === 'athens' ? !!T.done.ajan : place === 'singapore' ? !!T.done.sing : !!T.done.darw
  const tagLon = P.lon + 16
  const north = P.lat > 3
  const labels: Label[] = [
    valTag('pl', at(P.lon, P.lat, 1.02), `${P.name} · ${m} 月`, CTRL_NAME[ctrl], true, true, 0),
    pTag('eq', at(tagLon, beltLat('eq', sr), 1.02), '赤道低气压带', false, true, 0),
    pTag('sth', at(tagLon, beltLat(north ? 'sthN' : 'sthS', sr), 1.02), '副热带高气压带', true, true, 0),
  ]
  const s = SPOTS[place]
  const want: Want = {
    sun: { az: s.view[0] / RAD + 25, lat: subsolarRaw(day) }, night: 0.35, cloud: 0.5, grid: 0.25,
    press: { air, key: `c${sr}`, on: 0.4 },
    winds: { air, on: 1, n: 120, box: [P.lon - 45, P.lon + 45, P.lat - 22, P.lat + 22], size: 0.8 },
    marks: [{ lon: P.lon, lat: P.lat, color: '#ffe14d' }],
  }
  return (
    <LabShell narration={voiced(NARRATION['5'], VOICE)} title="大气环流" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="时间"
      stage={<LabStage<Want> labels={labels} target={s.target} span={SPAN} view={s.view} {...SPACE} world={want}>{null}</LabStage>}
      lesson={<LessonBlock no="5" title="对气候的影响" concept="谁控制这里，就决定这里下不下雨" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>气压带、风带控制的地方，降水很不一样：</p>
          <ul className="mt-2 flex flex-col gap-1 text-[14px] text-white/80">
            <li><b className="text-[#ff8a8f]">低气压带</b>：空气上升，容易成云致雨，多雨</li>
            <li><b className="text-[#8fb0ff]">高气压带</b>：空气下沉，不易成云，少雨</li>
            <li><b className="text-white">西风带</b>：从海洋上吹来，大陆西岸多雨</li>
          </ul>
          <p className="mt-2">它们随季节南北移动，于是有的地方全年受同一个气压带控制（热带雨林气候），有的地方冬夏受不同的气压带、风带控制（地中海气候、热带草原气候）。</p>
          <p className="mt-2 text-[13.5px] text-white/65">图上的“多雨”“少雨”只按控制它的气压带、风带来分，是简化的示意；真实的降水还和海陆位置、地形有关。</p>
        </>} />}
      finale={T.finale && <Fin kicker="三个地方都走过一遍" big="谁控制这里，就决定这里下不下雨" small="新加坡全年受赤道低气压带控制，全年多雨；雅典夏季受副热带高压、冬季受西风带控制，夏干冬雨；达尔文受赤道低压和东南信风带交替控制，干湿季分明。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label={`${P.name} · ${m} 月 受它控制`} value={CTRL_NAME[ctrl]} color={CTRL_WET[ctrl] ? '#7fe3d4' : '#ffd27a'} />
          <p className="mt-1 text-center text-[13px] text-white/60">{CTRL_WET[ctrl] ? '多雨' : '少雨'}</p>
          <H2>一年十二个月（{P.name}，{P.lat > 0 ? `${P.lat.toFixed(1)}°N` : `${(-P.lat).toFixed(1)}°S`}）</H2>
          <div className="mt-2 grid gap-0.5" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}>
            {months.map((x, i) => <div key={i} title={CTRL_NAME[x.c]} style={{ background: x.wet ? 'rgb(44 143 138 / 0.75)' : 'rgb(181 138 60 / 0.6)' }} className={cn('flex h-12 flex-col items-center justify-end rounded-md pb-1 text-[11px] tabular-nums', i + 1 === m && 'ring-2 ring-white')}>{MONTH[i]}</div>)}
          </div>
          <div className="mt-1.5 flex gap-3 text-[12px] text-white/55"><span><i className="mr-1 inline-block size-2.5 rounded-sm" style={{ background: 'rgb(44 143 138)' }} />多雨</span><span><i className="mr-1 inline-block size-2.5 rounded-sm" style={{ background: 'rgb(181 138 60)' }} />少雨</span></div>
          <H2>这是什么气候</H2>
          <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[15px] font-semibold">{shown ? P.climate : <span className="text-[13.5px] font-normal text-white/55">做完这个地方的任务再看。</span>}</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'jul'} onClick={() => toMonth(7)} disabled={moving}>到七月</LabButton>
        <LabButton pulse={next === 'jan'} onClick={() => toMonth(1)} disabled={moving}>到一月</LabButton>
        <LabButton primary pulse={next === 'year'} onClick={walkYear} disabled={moving}>走一年</LabButton>
      </>}
      extras={<Control label="地方"><Segmented label="地方" pulse={next === 'place'} want={wp} value={place} onChange={v => pick(v as PlaceKey)} disabled={moving} options={(Object.keys(PLACES) as PlaceKey[]).map(k => ({ value: k, label: PLACES[k].name }))} /></Control>}
    />
  )
}
