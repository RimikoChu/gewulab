// 地球和经纬网 · 第 5 课 用经纬网定位：在驾驶台上读卫星定位屏的经纬度，在电子海图上选出船在哪个点
import { useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { CHART_POINTS, STOPS, latShort, lonShort, pointAt, type PointKey } from './physics'
import { ECDIS, GNSS_AT, ecdisWorld } from './bridge'
import { LESSONS, goLesson } from './lessons'
import type { Want } from './world'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 's0', text: '第一站：在海图上选出船的位置', note: '北纬 10°、东经 170°：A 点' },
  { id: 's1', text: '驶向第二站，再找一次', note: '过了赤道是南纬，过了 180° 是西经：D 点' },
  { id: 's2', text: '驶向第三站，再找一次', note: '北纬 10°、西经 170°：B 点' },
]
const KEYS = Object.keys(CHART_POINTS) as PointKey[]
const TARGET = new THREE.Vector3(ECDIS.c.x - 0.05, ECDIS.c.y - 0.02, ECDIS.c.z + 0.22)

export default function Lesson5() {
  const [stop, setStop] = useState(0)
  const [picked, setPicked] = useState<PointKey | null>(null)
  const [done, setDone] = useState<number[]>([])
  const T = useTasks('gewu:globe:5', TASKS)
  const sail = useSlide(stop, 0.45), sailing = Math.abs(sail - stop) > 0.001
  const here = STOPS[stop], right = pointAt(here.lat, here.lon)!
  const recorded = done.includes(stop)
  // 走过的航迹：已经记过的站
  const track = done.map(i => STOPS[i])
  const record = () => { if (picked !== right || recorded) return; const next = [...done, stop]; setDone(next); T.check(id => next.some(i => `s${i}` === id)) }
  const go = () => { if (stop < STOPS.length - 1) { setStop(stop + 1); setPicked(null) } }
  const resetAll = () => { setStop(0); setPicked(null); setDone([]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'pick' | 'record' | 'go' | null } = (() => {
    if (!task) return { hint: '都做完了。看看海图上的航迹：船跨过了赤道，也跨过了 180° 经线。', next: null }
    if (sailing) return { hint: '船在航行，卫星定位屏在找位置…', next: null }
    if (recorded) return { hint: '驶向下一站', next: 'go' }
    if (picked === null) return { hint: `卫星定位屏：${latShort(here.lat)}、${lonShort(here.lon)}。在海图上选出船在哪个点`, next: 'pick' }
    if (picked !== right) {
      const p = CHART_POINTS[picked]
      const why = p.lat !== here.lat ? (here.lat > 0 ? '先看纬度：北纬在赤道以北' : '先看纬度：南纬在赤道以南') : (here.lon > 0 ? '再看经度：东经在 180° 以西这一边' : '再看经度：西经在 180° 以东这一边')
      return { hint: `${picked} 点不对。${why}`, next: 'pick' }
    }
    return { hint: `${right} 点就是 ${latShort(here.lat)}、${lonShort(here.lon)}：记录位置`, next: 'record' }
  })()

  const labels: Label[] = [
    { id: 'gnss', at: [GNSS_AT.x - 0.1, GNSS_AT.y + 0.16, GNSS_AT.z], ax: 0.5, className: 'scene-tag -translate-y-full', children: sailing ? <><small>卫星定位</small>…</> : <><small>卫星定位</small>{latShort(here.lat)} {lonShort(here.lon)}</> },
    { id: 'ec', at: [ECDIS.c.x, ECDIS.c.y + ECDIS.h / 2 + 0.06, ECDIS.c.z + 0.3], ax: 0.5, className: 'scene-name -translate-y-full', name: true, children: '电子海图' },
    ...(picked ? [{ id: 'pk', at: ecdisWorld(CHART_POINTS[picked].lat, CHART_POINTS[picked].lon), ax: 0.5, className: `scene-tag ${picked === right ? 'key' : ''} -translate-y-[140%]`, children: picked === right ? '船在这里' : '不是这里' } as Label] : []),
  ]
  const ship = recorded ? here : null
  return (
    <LabShell narration={voiced(NARRATION['5'], VOICE)} title="地球和经纬网" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="航行"
      stage={<LabStage<Want> labels={labels} target={TARGET} span={[1.25, 0.82]} view={[-Math.PI / 2 + 0.1, 0.34]} env={0.8} sun={1.6} fog={[150, 1500]} world={{ ecdis: { ship, picked, track, sailing: sail }, gnss: sailing ? null : here }}>{null}</LabStage>}
      lesson={<LessonBlock no="5" title="用经纬网定位" concept="有了经度和纬度，就能确定位置" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>经线和纬线交织成<b className="text-white">经纬网</b>。任何一个地点，只要知道它的经度和纬度，就能在经纬网上找到它。</p>
          <p className="mt-2">找的时候分两步：先看纬度，北纬在赤道以北、度数向北增大，南纬在赤道以南、度数向南增大；再看经度，东经度数向东增大，西经度数向西增大。</p>
          <p className="mt-2">远洋船上的卫星定位接收机，显示的就是船所在的经度和纬度。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三站都找对了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">经度和纬度合起来，就能确定一个点</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">先看纬度定南北，再看经度定东西。过了赤道北纬变南纬，过了 180° 东经变西经。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看看海图</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">第 {stop + 1} 站 · 卫星定位</div>
            <div className="mt-1 text-[34px] leading-tight font-bold tracking-tight tabular-nums text-[#7fe3d4]">{sailing ? '—' : `${latShort(here.lat)}  ${lonShort(here.lon)}`}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="纬度" value={sailing ? '—' : latShort(here.lat)} unit={here.lat > 0 ? '北纬：赤道以北' : '南纬：赤道以南'} />
            <ParamTile symbol="经度" value={sailing ? '—' : lonShort(here.lon)} unit={here.lon > 0 ? '东经：度数向东增大' : '西经：度数向西增大'} />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">航海日志</h2>
          {done.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">还没有记录。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">站</th><th className="font-normal">纬度</th><th className="font-normal">经度</th><th className="text-right font-normal">海图上</th></tr></thead>
                <tbody>{done.map(i => <tr key={i} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">第 {i + 1} 站</td><td>{latShort(STOPS[i].lat)}</td><td>{lonShort(STOPS[i].lon)}</td><td className="text-right font-semibold text-[#7fe3d4]">{pointAt(STOPS[i].lat, STOPS[i].lon)} 点</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'go'} onClick={go} disabled={sailing || !recorded || stop === STOPS.length - 1}>驶向下一站</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={sailing || picked !== right || recorded}>记录位置</LabButton>
      </>}
      extras={
        <Control label="船在海图上的哪个点">
          <Segmented label="船在海图上的哪个点" pulse={next === 'pick'} want={right} disabled={sailing || recorded} value={(picked ?? '') as PointKey} onChange={k => setPicked(k as PointKey)} options={KEYS.map(k => ({ value: k, label: `${k} 点` }))} />
        </Control>
      }
    />
  )
}
