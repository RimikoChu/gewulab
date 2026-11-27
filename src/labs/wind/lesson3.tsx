// 热力环流和风 · 第 3 课 大气的保温作用：农田里的塑料大棚旁。入夜以后地面放出长波辐射（红），
// 大气吸收它，再以大气逆辐射还给地面。晴夜逆辐射弱、降温多；阴夜逆辐射强。最后钻进大棚看棚膜怎样把热留住。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Cloud, LONG, Motes, Ray, Slab } from './air'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Big, Fin, Rows, noteTag } from './parts'
import { SKIES, dayMax, dayRange, houseMin, nightMin, type SkyKey } from './physics'
import { VOICE } from './voice'
import { HOUSE, P, SPOT, skyFor, type Want } from './world'

const TASKS: Task[] = [
  { id: 'clear', text: '晴天的傍晚，入夜看地面降温', note: '晴夜大气逆辐射弱，最低降到 12 ℃' },
  { id: 'cloudy', text: '换成阴天，再过一夜', note: '阴夜云多，逆辐射强，最低只降到 17 ℃' },
  { id: 'range', text: '比一比两天的昼夜温差', note: '晴天昼夜温差 19 ℃，阴天只有 5 ℃' },
  { id: 'house', text: '晴夜里，看看大棚里有多暖', note: '棚膜挡住了地面辐射，棚里比外面暖 4 ℃' },
]
const [HX, G0, HZ] = P.house
const Z = HZ + HOUSE.L / 2 + 1.5, X0 = HX - 12, X1 = HX + 12, TOP = 18
type V3 = [number, number, number]
const v = (x: number, y: number, z = Z): V3 => [x, y, z]
const NAMES: Record<SkyKey, string> = { clear: '晴夜', cloudy: '阴夜' }

export default function Lesson3() {
  const [sky, setSky] = useState<SkyKey>('clear')
  const [night, setNight] = useState(false)
  const [nights, setNights] = useState<SkyKey[]>([])
  const [range, setRange] = useState(false)
  const [inside, setInside] = useState(false)
  const T = useTasks('gewu:wind:3', TASKS)
  const day = useSlide(night ? 0.02 : 0.5, 0.3), dark = day < 0.06
  useEffect(() => { if (!dark || !night) return; const t = setTimeout(() => { setNights(n => { const m = n.includes(sky) ? n : [...n, sky]; T.check(id => m.includes(id as SkyKey)); return m }) }, 1400); return () => clearTimeout(t) }, [dark, night, sky])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!inside) return; const t = setTimeout(() => T.check(id => id === 'house'), 2800); return () => clearTimeout(t) }, [inside])   // eslint-disable-line react-hooks/exhaustive-deps
  const pickSky = (k: SkyKey) => { setSky(k); setNight(false); setInside(false) }
  const resetAll = () => { setSky('clear'); setNight(false); setNights([]); setRange(false); setInside(false); T.reset() }
  const compare = () => { setRange(true); T.check(id => id === 'range') }

  const task = T.current
  const want: SkyKey | null = task ? (task.id === 'cloudy' ? 'cloudy' : task.id === 'range' ? null : 'clear') : null
  const { hint, next }: { hint: string; next: 'night' | 'sky' | 'range' | 'house' | null } = (() => {
    if (!task) return { hint: '都做完了。大气逆辐射给地面保温。', next: null }
    if (want && sky !== want) return { hint: `换成${SKIES[want].name}`, next: 'sky' }
    if (task.id === 'range') return { hint: '两种夜晚都过完了。比一比昼夜温差', next: 'range' }
    if (!night) return task.id === 'house' ? { hint: '再到晴天的夜里，去看看大棚', next: 'night' } : { hint: `${SKIES[sky].name}的傍晚。让夜晚降临`, next: 'night' }
    if (!dark) return { hint: '天黑下来了…', next: null }
    if (task.id === 'house') return inside ? { hint: '看棚膜怎样把热留住…', next: null } : { hint: '走近大棚，看看里面', next: 'house' }
    return { hint: '地面在放热，看热量去了哪里…', next: null }
  })()

  const ln = night ? Math.max(0, Math.min(1, (0.4 - day) / 0.3)) : 0, S = SKIES[sky]
  const gy = G0 + 0.15, tOut = nightMin(sky), tIn = houseMin()
  const field = (_u: number, y: number) => -0.25 - 0.35 * y + (sky === 'cloudy' ? 0.25 : 0) * Math.exp(-y * 3)
  const s = inside ? SPOT.houseIn : SPOT.house
  // 棚里：地面长波辐射碰到棚膜，大部分被挡回来
  const hx = HX - HOUSE.gap, hz = HZ + HOUSE.L / 2 - 0.3
  const labels: Label[] = [
    noteTag('lw', [X0 + 2.5, 9.5, Z], '地面辐射（长波）', ln > 0.5 && !inside, 1),
    noteTag('out', [X0 + 5.2, TOP - 0.3, Z], `射向宇宙 ${sky === 'clear' ? '多' : '少'}`, ln > 0.5 && !inside, 0),
    noteTag('back', [X1 - 3, 7.5, Z], `大气逆辐射 ${sky === 'clear' ? '弱' : '强'}`, ln > 0.5 && !inside, 0),
    { id: 'tout', at: [X0 + 8.5, gy + 2.2, Z + 0.5], ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: dark && night ? 1 : 0 }, children: <><small>棚外最低</small>{tOut.toFixed(0)} ℃</> },
    { id: 'tin', at: [hx + 0.3, G0 + 1.0, hz], ax: 0.5, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: inside && dark ? 1 : 0 }, children: <><small>棚内最低</small>{tIn.toFixed(0)} ℃</> },
    noteTag('film', [hx - HOUSE.r - 0.1, G0 + 1.5, hz], '棚膜挡住长波', inside && dark, 1),
  ]
  return (
    <LabShell narration={voiced(NARRATION['3'], VOICE)} title="热力环流和风" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="夜晚"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...skyFor(day, [200, 1400])} world={{ day, heat: [{ x0: X0 - 3, x1: X1 + 3, v: -ln * (sky === 'clear' ? 0.75 : 0.3) }] }}>
        {!inside && <Slab x0={X0} x1={X1} y0={G0} y1={TOP} z={Z - 0.3} field={field} fieldKey={sky} amount={0.6 + ln * 0.4} tint={0.08} />}
        {!inside && <Motes x0={X0} x1={X1} y0={G0 + 0.3} y1={TOP} z={Z} n={200} heat={(x, y) => field((x - X0) / (X1 - X0), (y - G0) / (TOP - G0))} />}
        <Cloud c={[(X0 + X1) / 2, 13.5, Z - 3]} size={[30, 2, 8]} n={sky === 'cloudy' ? 30 : 4} r={[3, 5]} amount={sky === 'cloudy' ? 1 : 0.3} dark={0.6} seed={sky === 'cloudy' ? 6 : 7} />
        {/* 地面长波辐射：一部分穿出大气射向宇宙，大部分被大气吸收 */}
        <Ray pts={[v(X0 + 3, gy), v(X0 + 4, TOP + 0.5)]} color={LONG} wave={1.2} amp={0.22} on={inside ? 0 : ln > 0 ? 1 : 0.3} k={sky === 'clear' ? 1 : 0.2} r={0.11} />
        {[X0 + 7, X0 + 10.5].map((x, i) => <Ray key={i} pts={[v(x, gy), v(x + 0.5, 8 + i)]} color={LONG} wave={1.2} amp={0.22} on={inside ? 0 : ln > 0 ? 1 : 0.3} k={0.8} r={0.11} />)}
        {/* 大气逆辐射：从大气射回地面 */}
        {[X1 - 8, X1 - 5, X1 - 2].map((x, i) => <Ray key={i} pts={[v(x, 9.5 + i * 0.4), v(x - 0.3, gy)]} color={LONG} wave={1.2} amp={0.22} on={inside ? 0 : ln > 0 ? 1 : 0.3} k={S.counter > 0.9 ? 1 : 0.35} r={0.11} />)}
        {/* 棚里：地面放出的长波辐射碰到棚膜，大部分被挡回来 */}
        {[-0.8, 0, 0.8].map((dx, i) => <Ray key={i} pts={[v(hx + dx, G0 + 0.25, hz), v(hx + dx * 1.2, G0 + Math.sqrt(HOUSE.r ** 2 - (dx * 1.2) ** 2) - 0.05, hz), v(hx + dx * 1.2 + (i - 1) * 0.35 + 0.25, G0 + 0.3, hz)]} color={LONG} wave={0.42} amp={0.07} on={inside && dark ? 1 : 0} r={0.045} />)}
      </LabStage>}
      lesson={<LessonBlock no="3" title="大气的保温作用" concept="大气逆辐射给地面保温" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>地面放出的长波辐射，绝大部分被近地面大气中的水汽、二氧化碳吸收。大气增温后也放出长波辐射，其中射向地面的部分叫<b className="text-white">大气逆辐射</b>，它把热量还给地面，对地面起<b className="text-white">保温作用</b>。</p>
          <p className="mt-2">晴天：白天云少，削弱作用弱，气温高；夜里云少，逆辐射弱，气温低。所以晴天的<b className="text-white">昼夜温差大</b>，阴天小。</p>
          <p className="mt-2">塑料大棚、玻璃温室让太阳短波辐射进来，又挡住棚里地面放出的长波辐射，热量留在棚里。大气中二氧化碳等气体增多、保温作用增强，全球变暖，这就是“温室效应”这个名字的由来。</p>
          <p className="mt-2 text-[13.5px] text-white/65">图中的最低气温是示意值。</p>
        </>} />}
      finale={T.finale && <Fin kicker="两个夜晚和大棚都看过了" big="大气逆辐射给地面保温" small={`晴天昼夜温差 ${dayRange('clear')} ℃，阴天只有 ${dayRange('cloudy')} ℃：云多时白天削弱作用强、夜里逆辐射强。大棚的膜挡住地面长波辐射，晴夜棚里比外面暖 ${tIn - nightMin('clear')} ℃。`} />}
      panel={
        <Glass className="px-4 py-4">
          <Big label={inside ? '晴夜 · 棚内最低气温' : `${NAMES[sky]} · 最低气温`} value={dark && night ? (inside ? tIn : tOut).toFixed(0) : '—'} unit="℃" />
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="最高" value={`${dayMax(sky).toFixed(0)} ℃`} unit={`${S.name}白天`} />
            <ParamTile symbol="逆辐射" value={sky === 'clear' ? '弱' : '强'} unit={`${NAMES[sky]}`} />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">两天的气温</h2>
          <Rows head={['', '最高', '最低', '昼夜温差']} rows={(['clear', 'cloudy'] as SkyKey[]).map(k => [SKIES[k].name, `${dayMax(k).toFixed(0)} ℃`, nights.includes(k) ? `${nightMin(k).toFixed(0)} ℃` : '—', range ? <b key={k}>{dayRange(k)} ℃</b> : '—'])} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'night'} pulse={next === 'night'} onClick={() => setNight(true)} disabled={night}>入夜</LabButton>
        <LabButton primary={next === 'range'} pulse={next === 'range'} onClick={compare} disabled={nights.length < 2 || range}>比一比昼夜温差</LabButton>
        <LabButton primary={next === 'house'} pulse={next === 'house'} onClick={() => setInside(true)} disabled={!dark || !night || sky !== 'clear' || inside || !range}>看大棚里</LabButton>
      </>}
      extras={
        <Control label="天气">
          <Segmented label="天气" pulse={next === 'sky'} want={want} value={sky} onChange={k => pickSky(k as SkyKey)} options={(Object.keys(SKIES) as SkyKey[]).map(k => ({ value: k, label: SKIES[k].name }))} />
        </Control>
      }
    />
  )
}
