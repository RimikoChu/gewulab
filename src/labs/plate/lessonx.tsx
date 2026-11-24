// 板块运动 · 拓展课：两个小实验，都在太空里的地球上。
// 日本：为什么多火山、地震？看它在哪两块板块之间，再和离交界很远的悉尼比一比。
// 板块的速度：让大西洋从拼合的样子张开到今天，用宽度除以年代，算出两岸每年分开几厘米。
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { GLOBE, RG, globeFacing, globePoint } from './globe'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { OPEN_AGE, PLACES, atlanticGap, kmAfter, nearestBoundary, rateCmYr } from './physics'
import type { LL } from './plates'
import { VOICE } from './voice'
import { SPACE, SPOT, type Want } from './world'

type Part = 'japan' | 'speed'
const PARTS: { value: Part; label: string }[] = [{ value: 'japan', label: '日本' }, { value: 'speed', label: '板块的速度' }]
const TASKS: Task[] = [
  { id: 'japan', text: '看日本在哪两块板块之间', note: '日本在亚欧板块和太平洋板块的交界处，所以多火山、地震' },
  { id: 'sydney', text: '和悉尼比一比', note: '悉尼在板块内部，离交界很远，地壳比较稳定' },
  { id: 'speed', text: '量一量大西洋张开的速度', note: '两岸每年只分开几厘米，可上亿年下来，就隔开了一个大洋' },
]
const NEAR = { target: new THREE.Vector3(GLOBE.x, GLOBE.y, GLOBE.z + RG), span: [RG * 1.9, RG * 1.6] as [number, number], view: [0, 0] as [number, number] }
const ATL: LL = [-14, -8]
const GAP = atlanticGap(0), RATE = rateCmYr(GAP, OPEN_AGE * 100)

export default function LessonX() {
  const [part, setPart] = useState<Part>('japan')
  const [face, setFace] = useState<LL>([139.7, 35.7])
  const lon = useSlide(face[0], 30), lat = useSlide(face[1], 30), turning = Math.abs(lon - face[0]) > 0.05 || Math.abs(lat - face[1]) > 0.05
  const [shown, setShown] = useState<'none' | 'tokyo' | 'sydney'>('none')
  const [open, setOpen] = useState(false)
  const k = useSlide(part === 'speed' && !open ? 1 : 0, 0.2), opening = part === 'speed' && open && k > 1e-3
  const T = useTasks('gewu:plate:x', TASKS)
  useEffect(() => { if (turning || shown === 'none') return; T.check(id => (id === 'japan' && shown === 'tokyo') || (id === 'sydney' && shown === 'sydney')) }, [turning, shown])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (part === 'speed' && open && k < 1e-3) T.check(id => id === 'speed') }, [part, open, k < 1e-3])   // eslint-disable-line react-hooks/exhaustive-deps
  const choosePart = (p: Part) => { setPart(p); setOpen(false); if (p === 'speed') setFace(ATL); else { setFace([139.7, 35.7]); setShown('none') } }
  const resetAll = () => { setPart('japan'); setFace([139.7, 35.7]); setShown('none'); setOpen(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'japan' | 'sydney' | 'part' | 'open' | null } = (() => {
    if (!task) return { hint: '都做完了。', next: null }
    if (task.id === 'speed' && part === 'speed' && !open && k < 0.999) return { hint: '先把两岸拼回一亿多年前的样子…', next: null }
    if (turning) return { hint: '地球转过来…', next: null }
    if (task.id === 'speed') {
      if (part !== 'speed') return { hint: '这个做完了。接着做：板块的速度', next: 'part' }
      return opening ? { hint: '大西洋一点点张开…', next: null } : { hint: '让大西洋从拼合的样子张开到今天', next: 'open' }
    }
    if (part !== 'japan') return { hint: '实验换成“日本”', next: 'part' }
    return task.id === 'japan' ? { hint: '看看日本在哪两块板块之间', next: 'japan' } : { hint: '再看看悉尼，和日本比一比', next: 'sydney' }
  })()

  const f: LL = [lon, lat]
  const place = shown === 'sydney' ? PLACES.sydney : PLACES.tokyo, dist = nearestBoundary(place.at).km
  const labels: Label[] = part === 'japan' ? [
    ...(shown !== 'none' ? [{ id: 'p', at: globePoint(place.at, f, 1.02), ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: turning ? 0 : 1 }, children: <><small>{place.name}</small>离交界约 {Math.round(dist / 10) * 10} km</> }] : []),
    { id: 'eu', at: globePoint([118, 46], f, 1.02), ax: 0.5, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: shown !== 'none' && globeFacing([118, 46], f) && !turning ? 1 : 0 }, children: '亚欧板块' },
    { id: 'pa', at: globePoint([162, 30], f, 1.02), ax: 0.5, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: shown !== 'none' && globeFacing([162, 30], f) && !turning ? 1 : 0 }, children: '太平洋板块' },
    { id: 'io', at: globePoint([134, -24], f, 1.02), ax: 0.5, className: 'scene-name -translate-y-1/2 transition-opacity', style: { opacity: shown === 'sydney' && !turning ? 1 : 0 }, children: '印度洋板块' },
  ] : [
    { id: 'gap', at: globePoint([-24, -12], f, 1.02), ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: <><small>大西洋</small>约 {Math.round(atlanticGap(k) / 100) * 100} km</> },
  ]
  const g = SPOT.globe, cam = part === 'japan' ? NEAR : g
  return (
    <LabShell narration={voiced(NARRATION['x'], VOICE)} title="板块运动" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={part === 'japan' ? '日本' : '板块的速度'}
      stage={<LabStage<Want> labels={labels} target={cam.target} span={cam.span} view={cam.view} {...SPACE} world={{ globe: { face: f, lines: part === 'japan' && shown !== 'none' ? 1 : 0, fill: part === 'japan' && shown !== 'none' ? 1 : 0, hi: shown === 'sydney' ? ['indian'] : ['eurasia', 'pacific'], volcanoes: part === 'japan' && shown !== 'none' ? 1 : 0, quakes: part === 'japan' && shown !== 'none' ? 1 : 0, places: shown === 'none' ? [] : [shown], drift: part === 'speed' ? k : 0 } }}>{null}</LabStage>}
      lesson={<LessonBlock no="拓展" title="日本 · 板块的速度" concept="交界处多火山地震；板块每年移动几厘米" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">日本</b>位于亚欧板块和太平洋板块的交界处，太平洋板块在这里俯冲到亚欧板块下面（和第 6 课一样），所以日本多火山、地震。</p>
          <p className="mt-3"><b className="text-white">板块的速度</b>很慢，一般每年只移动几厘米。可是时间一长，几千万年、上亿年下来，就能走出几千千米。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里的速度用“今天的宽度 ÷ 张开的年代”估算，是平均值，示意。离交界的距离按简化的边界线量，误差约一两百千米。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个小实验都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">交界处多火山地震；板块每年移动几厘米</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">大西洋两岸每年分开约 {RATE.toFixed(1)} 厘米，一亿多年就隔开了约 {Math.round(GAP / 100) * 100} 千米。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {part === 'japan' ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">{shown === 'none' ? '离最近的板块交界' : `${place.name}离最近的板块交界`}</div>
              <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{shown === 'none' || turning ? '—' : `约 ${Math.round(dist / 10) * 10}`}<span className="ml-1 text-[15px] font-medium text-white/55">km</span></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <ParamTile symbol="东京" value={T.done.japan ? `约 ${Math.round(nearestBoundary(PLACES.tokyo.at).km / 10) * 10}` : '—'} unit="km · 在交界旁边" />
              <ParamTile symbol="悉尼" value={T.done.sydney ? `约 ${Math.round(nearestBoundary(PLACES.sydney.at).km / 10) * 10}` : '—'} unit="km · 在板块内部" />
            </div>
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">两岸每年分开</div>
              <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{T.done.speed ? `约 ${RATE.toFixed(1)}` : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">cm/年</span></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <ParamTile symbol="宽度" value={`约 ${Math.round(GAP / 100) * 100}`} unit="km · 纳塔尔到对岸" />
              <ParamTile symbol="年代" value={`约 ${OPEN_AGE}`} unit="亿年 · 开始张开" />
            </div>
            <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70">速度 = 宽度 ÷ 年代 ≈ <b className="text-white">{RATE.toFixed(1)} cm/年</b></p>
            <p className="mt-2 text-[13px] text-white/55">按这个速度，一万年只分开约 {kmAfter(RATE, 0.01).toFixed(2)} km。</p>
          </>}
        </Glass>
      }
      actions={part === 'japan' ? <>
        <LabButton primary={next === 'japan'} pulse={next === 'japan'} onClick={() => { setShown('tokyo'); setFace([139.7, 35.7]) }} disabled={turning}>看日本</LabButton>
        <LabButton primary={next === 'sydney'} pulse={next === 'sydney'} onClick={() => { setShown('sydney'); setFace([146, -18]) }} disabled={turning || shown === 'none'}>比一比悉尼</LabButton>
      </> : <>
        <LabButton primary={next === 'open'} pulse={next === 'open'} onClick={() => setOpen(true)} disabled={turning || open || k < 0.999}>大西洋张开</LabButton>
      </>}
      extras={
        <Control label="实验">
          <Segmented label="实验" pulse={next === 'part'} want={next === 'part' ? (task?.id === 'speed' ? 'speed' : 'japan') : null} value={part} onChange={p => choosePart(p as Part)} disabled={opening} options={PARTS} />
        </Control>
      }
    />
  )
}
