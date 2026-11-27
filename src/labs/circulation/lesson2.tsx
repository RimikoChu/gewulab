// 大气环流 · 第 2 课 三圈环流：在第 1 课的基础上让地球自转。剖面上的一个大圈分成三个，地面上的风跟着偏转；
// 再跟着一团赤道高空的空气往北走，看它在地转偏向力作用下越偏越东，到 30°N 附近堆积下沉。镜头从大西洋上空侧看。
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Big, Fin, H2, Rows, noteTag, pTag, useRun } from './parts'
import { BELTS, upperDrift, upperHeading, type Air } from './physics'
import { VOICE } from './voice'
import { SPACE, at, azFor, cutView, type Want } from './world'

const TASKS: Task[] = [
  { id: 'spin', text: '让地球自西向东自转', note: '一个大圈分成了三个：低纬、中纬、高纬环流' },
  { id: 'parcel', text: '跟一团赤道高空的空气往北走', note: '它越走越偏东，到 30°N 附近几乎成了西风，空气堆积下沉' },
  { id: 'record', text: '记下近地面 0°、30°、60°、90° 的气压', note: '低、高、低、高：气压带相间分布' },
]
const LON = -30, AZ = azFor(LON), EL = 0.16
const VIEW: [number, number] = [AZ, EL], TARGET = new THREE.Vector3(...cutView(AZ, 40, 0.62)), SPAN: [number, number] = [21, 10.5]
/** 那团空气从哪个经度出发 */
const LON0 = LON - 99
/** 跟那团空气时，镜头转到地球没切开的一面，从斜上方看它走过的路线 */
const P_VIEW: [number, number] = [azFor(LON0 + 34), 0.42], P_TARGET = new THREE.Vector3(...at(LON0 + 34, 22, 0.6)), P_SPAN: [number, number] = [19, 17]
const PATH: [number, number][] = Array.from({ length: 61 }, (_, i) => { const lat = i * 0.5; return [LON0 + upperDrift(lat), lat] })
const ROWS = (['eq', 'sthN', 'splN', 'polarN'] as const).map(k => BELTS.find(b => b.key === k)!)

export default function Lesson2() {
  const [spun, setSpun] = useState(false)
  const [rec, setRec] = useState(false)
  const run = useRun(0.2)
  const [flown, setFlown] = useState(false)
  const T = useTasks('gewu:circulation:2', TASKS)
  const tRef = useRef(T); tRef.current = T
  const k = useSlide(spun ? 1 : 0, 0.24), turning = spun && k < 0.999
  useEffect(() => { if (spun && k >= 0.999) tRef.current.check(id => id === 'spin') }, [spun, k])
  const fly = () => { setFlown(true); run.start(0, 1, () => tRef.current.check(id => id === 'parcel')) }
  const record = () => { setRec(true); T.check(id => id === 'record') }
  const resetAll = () => { setSpun(false); setRec(false); setFlown(false); run.reset(); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'spin' | 'fly' | 'record' | null } = (() => {
    if (!task) return { hint: '都做完了。地球一自转，一个大圈就分成了三个。', next: null }
    if (!spun) return { hint: '让地球自转起来', next: 'spin' }
    if (turning) return { hint: '地球在自转，看剖面上的环流怎样变…', next: null }
    if (task.id === 'parcel') return run.on ? { hint: '这团空气越往北，偏得越厉害…', next: null } : { hint: '跟着一团赤道高空的空气往北走', next: 'fly' }
    return { hint: '记下近地面四个纬度的气压', next: 'record' }
  })()

  const follow = spun && !turning && !rec
  const air: Air = useMemo(() => ({ k, sunLat: 0 }), [k])
  const lat = run.v * 30, head = upperHeading(lat)
  const arrived = flown && !run.on && run.v >= 1
  const labels: Label[] = [
    noteTag('c1', cutView(AZ, 15, 0.5), <><small>哈德莱环流圈</small>低纬环流</>, k > 0.9 && !follow, 0.5),
    noteTag('c2', cutView(AZ, 45, 0.5), <><small>费雷尔环流圈</small>中纬环流</>, k > 0.9 && !follow, 0.5),
    noteTag('c3', cutView(AZ, 74, 0.5), <><small>极地环流圈</small>高纬环流</>, k > 0.9 && !follow, 0.5),
    noteTag('one', cutView(AZ, 45, 0.5), '单圈环流', !spun, 0.5),
    noteTag('shell', cutView(AZ, 62, 1.06), '大气层（厚度放大，示意）', !follow, 0),
    noteTag('pp', at(PATH[Math.min(60, Math.round(run.v * 60))][0], lat, 1.16), `偏向角 ${head.toFixed(0)}°`, flown && run.on, 1),
    noteTag('sink', at(LON0 + upperDrift(30), 30, 1.16), '堆积下沉', arrived && follow, 1),
    noteTag('spinTag', at(LON - 60, -12, 1.04), '地球自西向东自转', turning, 0.5),
    ...ROWS.map((b, i) => pTag(`r${i}`, cutView(AZ, Math.min(b.lat, 86) + (b.lat ? 0 : 3), -0.3), b.kind === 'high' ? '高压' : '低压', b.kind === 'high', (rec || k > 0.9) && !follow, 0.5)),
  ]
  const want: Want = {
    sun: { az: AZ / (Math.PI / 180) + 38, lat: 0 }, uniform: 0.95, night: 0.12, cloud: 0.3, grid: 0.45, turns: spun ? 1 : 0,
    tilt: !follow, cut: { az: AZ, heat: 1, k, on: 1 },
    winds: { air, on: 1, n: 1100 },
    press: { air: { k: 1, sunLat: 0 }, key: 'three', on: rec ? 0.75 : 0 },
    trace: flown ? { pts: PATH, alt: 0.25, t: run.v, key: 'up' } : undefined,
  }
  return (
    <LabShell narration={voiced(NARRATION['2'], VOICE)} title="大气环流" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地球自转 · 地表均匀"
      stage={<LabStage<Want> labels={labels} target={follow ? P_TARGET : TARGET} span={follow ? P_SPAN : SPAN} view={follow ? P_VIEW : VIEW} {...SPACE} world={want}>{null}</LabStage>}
      lesson={<LessonBlock no="2" title="三圈环流" concept="地球一自转，一个大圈就分成了三个" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>地球自转，水平运动的物体受<b className="text-white">地转偏向力</b>：北半球向右偏，南半球向左偏，赤道上没有偏转。</p>
          <p className="mt-2">赤道上空的空气流向极地，在北半球不断向右偏，到 30°N 附近几乎变成了西风，后面的空气流不过去，在那里<b className="text-white">堆积下沉</b>，近地面形成<b className="text-[#8fb0ff]">副热带高气压带</b>。</p>
          <p className="mt-2">于是单圈环流分成三个：<b className="text-white">低纬环流</b>（0°–30°）、<b className="text-white">中纬环流</b>（30°–60°）、<b className="text-white">高纬环流</b>（60°–90°），近地面高压、低压相间排列。</p>
          <p className="mt-2 text-[13.5px] text-white/65">偏向角是按角动量守恒估算的示意值。</p>
        </>} />}
      finale={T.finale && <Fin kicker="三个环流圈" big="地球一自转，一个大圈就分成了三个" small="赤道上空流向极地的气流受地转偏向力，北半球向右偏，在 30° 附近堆积下沉。近地面从赤道到极地：低压、高压、低压、高压。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label={flown ? `高空气流 · ${lat.toFixed(0)}°N` : '高空气流的偏向角（示意）'} value={flown ? head.toFixed(0) : '—'} unit="°" />
          <H2>关键参数</H2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="自转" value={spun ? '自西向东' : '不自转'} unit="地转偏向力" />
            <ParamTile symbol="环流圈" value={k > 0.9 ? '3 个' : '1 个'} unit="每个半球" />
            <ParamTile symbol="φ" value={`${lat.toFixed(0)}°N`} unit="这团空气的纬度" />
            <ParamTile symbol="东偏" value={`${upperDrift(lat).toFixed(0)}°`} unit="往东偏过的经度" />
          </div>
          <H2>近地面的气压</H2>
          {rec ? <Rows head={['纬度', '气压']} rows={ROWS.map(b => [`${b.lat}°${b.lat ? 'N' : ''}`, <span key={b.key} className={b.kind === 'high' ? 'text-[#8fb0ff]' : 'text-[#ff8a8f]'}>{b.kind === 'high' ? '高压' : '低压'}</span>])} />
            : <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">按“记录气压”，记下四个纬度近地面的高低。</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={!spun} pulse={next === 'spin'} onClick={() => setSpun(true)} disabled={spun}>让地球自转</LabButton>
        <LabButton pulse={next === 'fly'} onClick={fly} disabled={!spun || turning || run.on}>跟一团空气</LabButton>
        <LabButton primary={spun} pulse={next === 'record'} onClick={record} disabled={!T.done.parcel || rec}>记录气压</LabButton>
      </>}
      extras={null}
    />
  )
}
