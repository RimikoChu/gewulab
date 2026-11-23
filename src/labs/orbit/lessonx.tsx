// 地球的运动 · 拓展课：三个课本之外的小实验，共用一页，各在大场景里的一处。
import { useEffect, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import Scene4 from './scene4'
import Scene6 from './scene6'
import PendulumScene from './scenex'
import { LESSONS, goLesson } from './lessons'
import { TILT, YEAR, dateText, dayLength, hoursText, latText, noonAltitude, pendulumRate, shadowLength, subsolarLat, termOf } from './physics'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Sub = 'height' | 'upright' | 'pendulum'
const SUBS: Record<Sub, { name: string; title: string; concept: string }> = {
  height: { name: '算高度', title: '正午太阳高度怎么算', concept: '离直射点多少度，太阳就矮多少度' },
  upright: { name: '不倾斜', title: '如果地轴不倾斜', concept: '没有四季，到处昼夜等长' },
  pendulum: { name: '傅科摆', title: '傅科摆', concept: '摆没有拐弯，是地面在转' },
}
const ORDER: Sub[] = ['height', 'upright', 'pendulum']
const TASKS: Task[] = [
  { id: 'height', text: '算高度：夏至这天，三座城市各看一次', note: '正午太阳高度 = 90° − 这里和直射点相差的纬度' },
  { id: 'upright', text: '不倾斜：把地轴扶正，走一年', note: '直射点一直在赤道，北京每天都是 12 小时白天：四季没有了' },
  { id: 'pendulum', text: '傅科摆：在北京和赤道各摆 6 小时', note: '在北京摆动面转了将近 58°，在赤道一点不转' },
]
const CITY = { gz: { name: '广州', lat: 23.1 }, bj: { name: '北京', lat: 40 }, hrb: { name: '哈尔滨', lat: 45.8 } } as const
type CityKey = keyof typeof CITY
const SPOT = { bj: { name: '北京', lat: 40 }, eq: { name: '赤道', lat: 0 }, np: { name: '北极', lat: 90 } } as const
type SpotKey = keyof typeof SPOT

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('height')
  const T = useTasks('gewu:orbit:x', TASKS)
  // 算高度
  const [city, setCity] = useState<CityKey>('bj'), [winter, setWinter] = useState(false), [seen, setSeen] = useState<CityKey[]>([])
  const sunLat = subsolarLat(termOf(winter ? 'winter' : 'summer').day), altGoal = noonAltitude(CITY[city].lat, sunLat)
  const alt = useSlide(altGoal, 30)
  useEffect(() => { if (sub === 'height' && !winter && Math.abs(alt - altGoal) < 0.01) { const next = seen.includes(city) ? seen : [...seen, city]; if (next !== seen) setSeen(next); if (next.length === 3) T.check(id => id === 'height') } }, [alt, altGoal, city, winter, sub])   // eslint-disable-line react-hooks/exhaustive-deps
  // 不倾斜
  const [tiltGoal, setTiltGoal] = useState(TILT), [yearGoal, setYearGoal] = useState(20), from = useRef(20)
  const tilt = useSlide(tiltGoal, 20), pos = useSlide(yearGoal, 75), day = ((pos % YEAR) + YEAR) % YEAR, walking = Math.abs(pos - yearGoal) > 0.01
  useEffect(() => { if (tiltGoal === 0 && tilt < 0.01 && pos - from.current >= YEAR - 0.01) T.check(id => id === 'upright') }, [pos, tilt])   // eslint-disable-line react-hooks/exhaustive-deps
  const sub2 = subsolarLat(day, tilt)
  // 傅科摆
  const [spot, setSpot] = useState<SpotKey>('bj'), [hoursGoal, setHoursGoal] = useState(0), [swung, setSwung] = useState<SpotKey[]>([])
  const hours = useSlide(hoursGoal, 2.5), turned = pendulumRate(SPOT[spot].lat) * hours
  useEffect(() => { if (hoursGoal >= 6 && hours >= 5.99) {   // 换地点时目标先归零，读数还在往回滑，不能算这里摆过了
     const next = swung.includes(spot) ? swung : [...swung, spot]; if (next !== swung) setSwung(next); if (next.includes('bj') && next.includes('eq')) T.check(id => id === 'pendulum') } }, [hours, hoursGoal, spot])   // eslint-disable-line react-hooks/exhaustive-deps

  const resetAll = () => { setSub('height'); setCity('bj'); setWinter(false); setSeen([]); setTiltGoal(TILT); setYearGoal(20); from.current = 20; setSpot('bj'); setHoursGoal(0); setSwung([]); T.reset() }
  const nextSub = ORDER.find(k => !T.done[k])
  const { hint, next }: { hint: string; next: string | null } = (() => {
    if (T.done[sub]) return nextSub ? { hint: `这个做完了。接着做：${SUBS[nextSub].name}`, next: 'sub' } : { hint: '三个拓展实验都做完了。', next: null }
    if (sub === 'height') return winter ? { hint: '先换回夏至', next: 'a' } : { hint: `还有 ${3 - seen.length} 座城市没看：换一座城市`, next: 'seg' }
    if (sub === 'upright') return tiltGoal !== 0 ? { hint: '先把地轴扶正', next: 'a' } : walking ? { hint: '盯住北京的昼长：它变不变？', next: null } : { hint: '按“走一年”', next: 'b' }
    return swung.includes(spot) ? { hint: `换到${spot === 'bj' ? '赤道' : '北京'}再摆一次`, next: 'seg' } : hours > 0 && hours < hoursGoal ? { hint: '时间在走…', next: null } : { hint: '按“过 6 小时”', next: 'a' }
  })()

  return (
    <LabShell narration={voiced(NARRATION['x'], VOICE)} title="地球的运动" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint}
      actionsLabel={{ height: '哪一天的正午', upright: '地轴和地球', pendulum: '时间' }[sub]}
      stage={sub === 'height' ? <Scene6 altitude={alt} shadow={Math.abs(shadowLength(10, alt))} city={CITY[city].name} /> : sub === 'upright' ? <Scene4 day={day} tilt={Math.round(tilt * 10) / 10} /> : <PendulumScene turned={turned} place={SPOT[spot].name} />}
      lesson={
        <LessonBlock no="拓展" title={SUBS[sub].title} concept={SUBS[sub].concept} tasks={TASKS} done={T.done} current={sub}
          theory={{
            height: <><p>太阳直射的地方，正午的太阳在头顶正上方，高度是 90°。离直射点每远 1 个纬度，正午的太阳就低 1°。</p><p className="my-3 rounded-xl bg-white/8 py-2.5 text-center font-formula text-[17px] text-white italic">H = 90° − 纬度差</p><p>纬度差是当地纬度和直射点纬度相差的度数。两地在同一个半球就相减，分在南北两个半球就相加。</p></>,
            upright: <><p>这是一个假设。地轴要是和轨道面垂直，太阳就一年到头直射赤道：每个地方每天都是 12 小时白天，正午的太阳高度也天天一样。</p><p className="mt-2">四季、昼夜长短的变化、极昼极夜，全都是地轴倾斜带来的。</p></>,
            pendulum: <><p>1851 年，法国物理学家傅科在巴黎用一只很长的摆做了这个实验。摆一旦摆起来，摆动的方向不会自己改变；可是地面上的人看到摆动面在慢慢转。</p><p className="mt-2">转的其实是脚下的地球。在北极每小时转 15°，一天正好一圈；纬度越低转得越慢，在赤道不转。</p></>,
          }[sub]} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个拓展实验都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">地球在转，而且是斜着转</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">自转给了我们昼夜和时间，斜着公转给了我们四季、长短不一的白天和高低不同的太阳。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          {sub === 'height' && <>
            <div className="text-center"><div className="text-[13px] text-white/60">{CITY[city].name} · {winter ? '冬至' : '夏至'} 的正午太阳高度</div>
              <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{alt.toFixed(1)}°</div></div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <ParamTile symbol="当地" value={`${CITY[city].lat}°N`} unit="纬度" />
              <ParamTile symbol="直射点" value={`${Math.abs(sunLat).toFixed(1)}°${sunLat > 0 ? 'N' : 'S'}`} unit={latText(sunLat).split(' ')[0]} />
              <ParamTile symbol="纬度差" value={`${Math.abs(CITY[city].lat - sunLat).toFixed(1)}°`} unit="相差" />
            </div>
            <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70">H = 90° − {Math.abs(CITY[city].lat - sunLat).toFixed(1)}° = <b className="text-white">{altGoal.toFixed(1)}°</b></p>
          </>}
          {sub === 'upright' && <>
            <div className="text-center"><div className="text-[13px] text-white/60">北京今天的昼长</div>
              <div className="mt-1 text-[34px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{hoursText(dayLength(40, sub2))}</div>
              <div className="mt-2 text-[13px] text-white/55">{dateText(day)}</div></div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <ParamTile symbol="倾斜" value={`${tilt.toFixed(1)}°`} unit={tiltGoal === 0 ? '假设' : '真实'} />
              <ParamTile symbol="直射点" value={`${Math.abs(sub2).toFixed(1)}°`} unit={latText(sub2).split(' ')[0]} />
              <ParamTile symbol="正午高度" value={`${noonAltitude(40, sub2).toFixed(1)}°`} unit="北京" />
            </div>
            <p className="mt-3 text-[13.5px] leading-snug text-white/65">{tiltGoal === 0 ? '地轴不斜：这三个数一年到头都不变。' : '真实的地球：走一年，这三个数一直在变。'}</p>
          </>}
          {sub === 'pendulum' && <>
            <div className="text-center"><div className="text-[13px] text-white/60">{SPOT[spot].name} · 过了 {hours.toFixed(1)} 小时，摆动面转过</div>
              <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{turned.toFixed(1)}°</div></div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <ParamTile symbol="纬度" value={`${SPOT[spot].lat}°`} unit={SPOT[spot].name} />
              <ParamTile symbol="每小时" value={`约 ${pendulumRate(SPOT[spot].lat).toFixed(1)}°`} unit="摆动面转过" />
            </div>
            <p className="mt-3 text-[13.5px] leading-snug text-white/65">红线是现在的摆动方向，灰线是开始时的方向。摆的摆动为了看得清画得比真实的快。</p>
          </>}
        </Glass>
      }
      actions={{
        height: <><LabButton pulse={next === 'a'} onClick={() => setWinter(false)} disabled={!winter}>夏至</LabButton><LabButton onClick={() => setWinter(true)} disabled={winter}>冬至</LabButton></>,
        upright: <><LabButton pulse={next === 'a'} onClick={() => { setTiltGoal(t => (t === 0 ? TILT : 0)); from.current = yearGoal }}>{tiltGoal === 0 ? '斜回 23.5°' : '把地轴扶正'}</LabButton><LabButton primary pulse={next === 'b'} onClick={() => { from.current = yearGoal; setYearGoal(g => g + YEAR) }} disabled={walking}>走一年</LabButton></>,
        pendulum: <><LabButton primary pulse={next === 'a'} onClick={() => setHoursGoal(g => g + 6)} disabled={hours < hoursGoal - 0.01}>过 6 小时</LabButton><LabButton onClick={() => setHoursGoal(0)} disabled={hoursGoal === 0}>重新开始</LabButton></>,
      }[sub]}
      extras={<>
        {sub === 'height' && <Control label="城市"><Segmented label="城市" pulse={next === 'seg'} want={(Object.keys(CITY) as CityKey[]).find(k => !seen.includes(k)) ?? null} value={city} onChange={k => setCity(k as CityKey)} options={(Object.keys(CITY) as CityKey[]).map(k => ({ value: k, label: CITY[k].name }))} /></Control>}
        {sub === 'pendulum' && <Control label="在哪里摆"><Segmented label="在哪里摆" pulse={next === 'seg'} want={spot === 'bj' ? 'eq' : 'bj'} value={spot} onChange={k => { setSpot(k as SpotKey); setHoursGoal(0) }} options={(Object.keys(SPOT) as SpotKey[]).map(k => ({ value: k, label: SPOT[k].name }))} /></Control>}
        <Control label="拓展实验"><Segmented label="拓展实验" pulse={next === 'sub'} want={nextSub ?? null} value={sub} onChange={k => setSub(k as Sub)} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>
      </>}
    />
  )
}
