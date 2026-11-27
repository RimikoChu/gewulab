// 热力环流和风 · 第 7 课 生活中的热力环流：同一座海滨城市的三处——海岸、山谷、城区——各剖开一片大气。
// 白天、夜晚切换，看海陆风、山谷风怎样掉头，城市热岛环流怎样日夜都在。地表按冷暖着色，海边的风向袋跟着转。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Slab, Streams, loop, type Stream } from './air'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Fin, Rows, noteTag } from './parts'
import { PLACES, breeze, type PlaceKey } from './physics'
import { VOICE } from './voice'
import { COAST, SPOT, ZH, ground, skyFor, type Want } from './world'

const TASKS: Task[] = [
  { id: 'coast-d', text: '海边，天亮以后吹什么风', note: '白天陆地比海面热：风从海上吹来，是海风' },
  { id: 'coast-n', text: '海边，到夜晚再看', note: '夜里陆地比海面凉：风从陆地吹向海，是陆风' },
  { id: 'valley-n', text: '山谷里，夜晚吹什么风', note: '夜里山坡冷得快：冷空气顺坡流下，是山风' },
  { id: 'valley-d', text: '山谷里，到白天再看', note: '白天山坡热得快：空气沿坡往上爬，是谷风' },
  { id: 'city-n', text: '到城区，看夜里的热岛环流', note: '城区比郊区暖：近地面风从郊区吹向城区' },
]
type V3 = [number, number, number]
const Z = ZH + 0.35
const gz = (x: number) => ground(x, ZH)
/** 三处剖面的范围 */
const BOX: Record<PlaceKey, { x0: number; x1: number; top: number }> = {
  coast: { x0: -78, x1: -26, top: 18 },
  valley: { x0: 50, x1: 92, top: 32 },
  city: { x0: -62, x1: 16, top: 26 },
}
const XC = -23   // 市中心
/** 山谷一侧的环流：贴着坡面，从谷底到山脊，再从高空回到谷中央。up 为真时沿坡往上走 */
function slopeLoop(xv: number, xr: number, up: boolean): Stream {
  const n = 7, pts: V3[] = [], heat: number[] = []
  for (let i = 0; i <= n; i++) { const x = xv + (xr - xv) * (i / n); pts.push([x, gz(x) + 1.4 + i * 0.12, Z]); heat.push(up ? 0.3 + 0.6 * (i / n) : -0.9) }
  pts.push([xr, gz(xr) + 5, Z], [xr + (xv - xr) * 0.2, 29, Z], [xv + (xr - xv) * 0.15, 29, Z], [xv, 22, Z], [xv, gz(xv) + 6, Z]); heat.push(0.2, 0, -0.1, -0.3, -0.4)
  if (!up) { pts.reverse(); heat.reverse() }
  return { pts, heat, closed: true }
}
function streams(place: PlaceKey, day: boolean): Stream[] {
  if (place === 'coast') return [day ? loop(-74, -30, 1.4, 15, Z, false, 'right') : loop(-74, -30, 1.4, 15, Z, true, 'left')]
  if (place === 'valley') { const up = day; return [slopeLoop(71, 58.5, up), slopeLoop(71, 85, up)] }
  return [loop(-58, XC, 1.8, 22, Z, false, 'right'), loop(XC, 12, 1.8, 22, Z, true, 'left')]
}
function heat(place: PlaceKey, day: boolean) {
  const b = breeze(place, day), k = Math.min(1, b.diff / 5)
  if (place === 'coast') return [{ x0: COAST, x1: -26, v: (b.toA ? 1 : -1) * k * 0.9 }, { x0: -94, x1: COAST, v: (b.toA ? -1 : 1) * k * 0.5 }]
  if (place === 'valley') return [{ x0: 54, x1: 64, v: (b.toA ? 1 : -1) * 0.8 }, { x0: 78, x1: 90, v: (b.toA ? 1 : -1) * 0.8 }]
  return [{ x0: -41, x1: -5, v: 0.4 + 0.5 * k }, { x0: -62, x1: -42, v: -0.3 * k }, { x0: -4, x1: 16, v: -0.3 * k }]
}

export default function Lesson7() {
  const [place, setPlace] = useState<PlaceKey>('coast')
  const [isDay, setIsDay] = useState(false)
  const [seen, setSeen] = useState<string[]>([])
  const T = useTasks('gewu:wind:7', TASKS)
  const day = useSlide(isDay ? 1 : 0.03, 0.32), settled = Math.abs(day - (isDay ? 1 : 0.03)) < 0.01
  const key = `${place}-${isDay ? 'd' : 'n'}`
  useEffect(() => { if (!settled) return; const t = setTimeout(() => { if (key !== T.current?.id) return; setSeen(s => s.includes(key) ? s : [...s, key]); T.check(id => id === key) }, 2400); return () => clearTimeout(t) }, [settled, key])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setPlace('coast'); setIsDay(false); setSeen([]); T.reset() }

  const task = T.current
  const [wp, wd] = (task?.id ?? 'coast-d').split('-') as [PlaceKey, string]
  const { hint, next }: { hint: string; next: 'place' | 'time' | null } = (() => {
    if (!task) return { hint: '都做完了。冷热不均，就有热力环流。', next: null }
    if (place !== wp) return { hint: `换到${wp === 'coast' ? '海边' : wp === 'valley' ? '山谷' : '城区'}`, next: 'place' }
    if ((wd === 'd') !== isDay) return { hint: wd === 'd' ? '让白天到来' : '让夜晚降临', next: 'time' }
    return { hint: `${isDay ? '白天' : '夜里'}的${place === 'coast' ? '海边' : place === 'valley' ? '山谷' : '城区'}：看地面冷暖和空气怎样转…`, next: null }
  })()

  const B = BOX[place], b = breeze(place, isDay), P = PLACES[place]
  const strong = place === 'city' ? (isDay ? 0.6 : 1) : 1
  const field = (u: number, v: number) => {
    const x = B.x0 + u * (B.x1 - B.x0), y = v * B.top, g = gz(x)
    if (place === 'valley') { const s = b.toA ? 1 : -1, slope = Math.exp(-(((x - 59) / 6) ** 2)) + Math.exp(-(((x - 84) / 7) ** 2)); return s * slope * Math.exp(-Math.max(0, y - g) / 4) * 0.9 - 0.15 * v }
    if (place === 'coast') { const land = x > COAST ? 1 : -1, s = b.toA ? 1 : -1; return s * land * 0.7 * Math.exp(-y / 7) - 0.15 * v }
    return (Math.exp(-(((x - XC) / 14) ** 2)) * 1.1 - 0.35) * strong * Math.exp(-y / 14) - 0.1 * v
  }
  const mask = place === 'valley' ? (u: number, v: number) => v * B.top > gz(B.x0 + u * (B.x1 - B.x0)) + 0.3 : undefined
  const at = (x: number, dy = 2.6): V3 => [x, gz(x) + dy, Z]
  const nameAt: V3 = place === 'coast' ? at(-50, 3.2) : place === 'valley' ? at(64, 3.6) : at(-42, 3.2)
  const aAt: V3 = place === 'coast' ? at(-36, 7.5) : place === 'valley' ? at(59, 4.5) : at(XC, 18.5)
  const bAt: V3 = place === 'coast' ? at(-66, 7.5) : place === 'valley' ? [71, 20, Z] : at(-54, 9)
  const labels: Label[] = [
    { id: 'name', at: nameAt, ax: 0.5, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: settled ? 1 : 0 }, children: <><small>近地面</small>{b.name}</> },
    noteTag('a', aAt, `${P.a} ${b.ta} ℃`, settled),
    noteTag('b', bAt, `${P.b} ${b.tb} ℃`, settled),
  ]
  const s = SPOT[place]
  const flows = streams(place, isDay)
  return (
    <LabShell narration={voiced(NARRATION['7'], VOICE)} title="热力环流和风" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="时间"
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...skyFor(day)} world={{ day, heat: heat(place, isDay), sock: { to: place === 'coast' ? (isDay ? 90 : 270) : 90, k: place === 'coast' && settled ? 0.85 : 0.3 } }}>
        <Slab key={place} x0={B.x0} x1={B.x1} y0={place === 'valley' ? 3 : 1} y1={B.top} z={ZH + 0.25} field={field} fieldKey={key} amount={settled ? 1 : 0.4} tint={0.08} mask={mask} />
        <Streams key={key} streams={flows} on={settled ? 1 : 0} speed={2.6 * strong + 0.6} per={0.8} size={1.9} />
      </LabStage>}
      lesson={<LessonBlock no="7" title="生活中的热力环流" concept="冷热不均，就有热力环流" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">海陆风</b>：海水比热容大，升温、降温都慢。白天陆地比海面热，陆地上空气上升、近地面成低压，风从海上吹向陆地，叫海风；夜里正好相反，吹陆风。</p>
          <p className="mt-2"><b className="text-white">山谷风</b>：白天山坡受热快，坡上的空气比谷地上空同一高度的空气热，沿坡上升，风从谷地吹向山坡，叫谷风；夜里山坡冷得快，冷空气沿坡下沉，叫山风。</p>
          <p className="mt-2"><b className="text-white">城市热岛环流</b>：城市人口多、车多、工厂多，放出的热量多，路面和楼房吸热多，城区气温比郊区高，近地面风从郊区吹向城区。这种差别夜里更明显。</p>
          <p className="mt-2 text-[13.5px] text-white/65">各处的气温是示意值，剖面的高度放大了画。</p>
        </>} />}
      finale={T.finale && <Fin kicker="海边、山谷、城区都看过了" big="冷热不均，就有热力环流" small="白天吹海风、谷风，夜晚吹陆风、山风；城区比郊区暖，近地面风总从郊区吹向城区。近地面的风总是从冷的一侧（高压）吹向热的一侧（低压）。" />}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">{P.name} · {isDay ? '白天' : '夜晚'}</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol={P.a} value={`${b.ta} ℃`} unit={b.toA ? '较热 · 低压' : '较冷 · 高压'} />
            <ParamTile symbol={P.b} value={`${b.tb} ℃`} unit={b.toA ? '较冷 · 高压' : '较热 · 低压'} />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">看过的</h2>
          <Rows head={['地方', '白天', '夜晚']} rows={(['coast', 'valley', 'city'] as PlaceKey[]).map(k => [PLACES[k].name, seen.includes(`${k}-d`) ? breeze(k, true).name : '—', seen.includes(`${k}-n`) ? breeze(k, false).name : '—'])} />
        </Glass>
      }
      actions={<LabButton primary pulse={next === 'time'} onClick={() => setIsDay(d => !d)}>{isDay ? '到夜晚' : '到白天'}</LabButton>}
      extras={
        <Control label="地方">
          <Segmented label="地方" pulse={next === 'place'} want={next === 'place' ? wp : null} value={place} onChange={k => setPlace(k as PlaceKey)} options={(['coast', 'valley', 'city'] as PlaceKey[]).map(k => ({ value: k, label: PLACES[k].name }))} />
        </Control>
      }
    />
  )
}
