// 大气环流 · 拓展课 顺风和信风：两个小实验。
// 一、顺着西风飞：上海—旧金山的航线大半在西风带里，往东顺风、往西逆风，比一比飞行时间（北太平洋上空）。
// 二、信风和暖水：赤道太平洋上信风把暖水吹到西边；信风减弱，暖水向东扩展，这就是厄尔尼诺之前要看懂的事（赤道太平洋）。
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Big, Fin, H2, Rows, noteTag, valTag, useRun } from './parts'
import { AIRPORTS, FLY, TRADES, flightHours, routeAt, routeKm, type Air, type TradeKey } from './physics'
import { VOICE } from './voice'
import { SPACE, at, azFor, type Want } from './world'

const TASKS: Task[] = [
  { id: 'east', text: '从上海往东飞到旧金山', note: '顺着西风飞，地速 = 空速 + 风速' },
  { id: 'west', text: '再从旧金山飞回上海', note: '逆着西风飞，慢了两个多小时' },
  { id: 'normal', text: '到赤道太平洋，看信风和暖水', note: '东南信风、东北信风把暖水吹向西边，东边涌上冷水' },
  { id: 'weak', text: '让信风减弱', note: '暖水向东扩展，东太平洋变暖：这就是厄尔尼诺' },
]
type Exp = 'fly' | 'trade'
const RAD = Math.PI / 180
const SPOT: Record<Exp, { target: THREE.Vector3; view: [number, number]; span: [number, number] }> = {
  fly: { target: new THREE.Vector3(...at(-178, 42, 0.85)), view: [azFor(-178), 0.68], span: [21, 15] },
  trade: { target: new THREE.Vector3(...at(-150, 0, 0.9)), view: [azFor(-150), 0.12], span: [22, 13] },
}
const ROUTE: [number, number][] = Array.from({ length: 81 }, (_, i) => routeAt(i / 80))
const BACK = [...ROUTE].reverse()
const AIR: Air = { k: 1, sunLat: 0 }
/** 动画里每飞 1 小时用多少秒 */
const SEC_PER_H = 0.42

export default function LessonX() {
  const [exp, setExp] = useState<Exp>('fly')
  const [dir, setDir] = useState<'east' | 'west' | null>(null)
  const [flights, setFlights] = useState<('east' | 'west')[]>([])
  const [trade, setTrade] = useState<TradeKey | null>(null)
  const runE = useRun(1 / (flightHours(true) * SEC_PER_H)), runW = useRun(1 / (flightHours(false) * SEC_PER_H))
  const T = useTasks('gewu:circulation:x', TASKS)
  const tRef = useRef(T); tRef.current = T
  const run = dir === 'west' ? runW : runE
  const flying = runE.on || runW.on
  const fly = (d: 'east' | 'west') => {
    setDir(d); (d === 'east' ? runW : runE).reset()
    ;(d === 'east' ? runE : runW).start(0, 1, () => { setFlights(f => f.includes(d) ? f : [...f, d]); tRef.current.check(id => id === d) })
  }
  const pick = (e: Exp) => { setExp(e); runE.reset(); runW.reset(); setDir(null) }
  const look = (t: TradeKey) => { setTrade(t); setTimeout(() => tRef.current.check(id => id === t), 2600) }
  const resetAll = () => { pick('fly'); setFlights([]); setTrade(null); T.reset() }

  const task = T.current
  const wantE: Exp | null = task ? (task.id === 'east' || task.id === 'west' ? 'fly' : 'trade') : null
  const { hint, next }: { hint: string; next: 'exp' | 'a' | 'b' | null } = (() => {
    if (!task) return { hint: '都做完了。顺着西风飞得快；信风一减弱，暖水就往东跑。', next: null }
    if (wantE && exp !== wantE) return { hint: '到赤道太平洋，看看信风', next: 'exp' }
    if (flying) return { hint: dir === 'east' ? '飞机顺着西风往东飞…' : '飞机逆着西风往西飞…', next: null }
    if (task.id === 'east') return { hint: '从上海起飞，往东飞到旧金山', next: 'a' }
    if (task.id === 'west') return { hint: '再从旧金山飞回上海', next: 'b' }
    if (task.id === 'normal') return trade === 'normal' ? { hint: '信风在吹，看暖水堆在哪边…', next: null } : { hint: '看赤道太平洋上正常的信风', next: 'a' }
    return trade === 'weak' ? { hint: '信风弱了，看暖水往哪里去…', next: null } : { hint: '让信风减弱', next: 'b' }
  })()

  const hours = dir ? flightHours(dir === 'east') : 0
  const t = trade ?? 'normal'
  const s = SPOT[exp]
  const mid = ROUTE[40]
  const labels: Label[] = exp === 'fly' ? [
    valTag('pvg', at(AIRPORTS.pvg.lon, AIRPORTS.pvg.lat, 1.02), '起点', AIRPORTS.pvg.name, false, true, 0),
    valTag('sfo', at(AIRPORTS.sfo.lon, AIRPORTS.sfo.lat, 1.02), '终点', AIRPORTS.sfo.name, false, true, 1),
    noteTag('west', at(mid[0], mid[1] - 9, 1.02), '西风带 · 风从西往东吹', true, 0.5),
  ] : [
    noteTag('warm', at(trade === 'weak' ? -150 : 150, 0, 1.03), '暖水', !!trade, 0.5, '#ffb08a'),
    noteTag('cold', at(-100, -4, 1.03), '冷水上涌', trade === 'normal', 0.5, '#9cc4ff'),
    noteTag('tr', at(-135, 14, 1.03), trade === 'weak' ? '信风减弱' : '东北信风', !!trade, 0.5),
  ]
  const want: Want = exp === 'fly' ? {
    sun: { az: s.view[0] / RAD + 20, lat: 15 }, night: 0.4, cloud: 0.45, grid: 0.25,
    winds: { air: AIR, on: 1, n: 130, box: [110, 260, 28, 56], size: 0.8 },
    trace: dir ? { pts: dir === 'east' ? ROUTE : BACK, alt: 0.22, t: run.v, key: dir } : undefined,
    marks: [{ lon: AIRPORTS.pvg.lon, lat: AIRPORTS.pvg.lat, color: '#ffe14d' }, { lon: AIRPORTS.sfo.lon, lat: AIRPORTS.sfo.lat, color: '#ffe14d' }],
  } : {
    sun: { az: s.view[0] / RAD + 20, lat: 0 }, night: 0.4, cloud: 0.3, grid: 0.25,
    winds: { air: AIR, on: trade ? 1 : 0, n: 110, box: [115, 285, -16, 16], size: 0.8, speed: 7 * TRADES[t].strength },
    warm: { east: TRADES[t].east, amt: trade ? 1 : 0 },
  }
  const rows = useMemo(() => flights.map(d => [d === 'east' ? '上海 → 旧金山' : '旧金山 → 上海', d === 'east' ? '顺风' : '逆风', `约 ${flightHours(d === 'east')} h`]), [flights])
  return (
    <LabShell narration={voiced(NARRATION['x'], VOICE)} title="大气环流" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={exp === 'fly' ? '航班' : '赤道太平洋'}
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...SPACE} world={want}>{null}</LabStage>}
      lesson={<LessonBlock no="拓展" title="顺风和信风" concept="风带管着飞机的快慢，也管着海水的冷暖" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">顺着西风飞</b>：上海和旧金山都在中纬度，航线大半在西风带里。往东飞顺风，地速是空速加风速；往西飞逆风，地速是空速减风速。</p>
          <p className="mt-2"><b className="text-white">信风和暖水</b>：赤道太平洋上，信风从东往西吹，把表层的暖水吹到西太平洋，东太平洋深处的冷水上涌。信风减弱时，暖水向东扩展，东太平洋海面变暖，这种现象叫<b className="text-white">厄尔尼诺</b>，会让很多地方的天气反常。</p>
          <p className="mt-2 text-[13.5px] text-white/65">空速 {FLY.air} km/h、沿线平均西风 {FLY.west} km/h 是示意值；暖水的范围也是示意的。</p>
        </>} />}
      finale={T.finale && <Fin kicker="拓展" big="风带管着飞机的快慢，也管着海水的冷暖" small={`上海飞旧金山顺着西风约 ${flightHours(true)} h，飞回来逆风约 ${flightHours(false)} h。信风把暖水吹到西太平洋；信风减弱，暖水东移，就是厄尔尼诺。`} />}
      panel={exp === 'fly' ? (
        <Glass className="px-4 py-4">
          <Big label={dir ? `${dir === 'east' ? '往东' : '往西'} · 已飞` : '飞行时间（约）'} value={dir ? (run.v * hours).toFixed(1) : '—'} unit="h" />
          <H2>关键参数</H2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="s" value={`${routeKm()}`} unit="km · 航线长" />
            <ParamTile symbol="v空" value={`${FLY.air}`} unit="km/h · 空速" />
            <ParamTile symbol="v风" value={`${FLY.west}`} unit="km/h · 西风，示意" />
            <ParamTile symbol="v地" value={dir ? `${FLY.air + (dir === 'east' ? 1 : -1) * FLY.west}` : '—'} unit="km/h · 地速" />
          </div>
          <H2>数据表</H2>
          {rows.length ? <Rows head={['航线', '风', '时间']} rows={rows} /> : <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">飞完一趟会记在这里。</p>}
        </Glass>
      ) : (
        <Glass className="px-4 py-4">
          <Big label="赤道太平洋上的信风" value={trade ? TRADES[t].name : '—'} />
          <H2>看到的</H2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="暖水" value={!trade ? '—' : t === 'normal' ? '堆在西边' : '向东扩展'} unit="表层海水" />
            <ParamTile symbol="东太平洋" value={!trade ? '—' : t === 'normal' ? '冷水上涌' : '变暖'} unit="秘鲁沿岸" />
          </div>
        </Glass>
      )}
      actions={exp === 'fly' ? <>
        <LabButton primary pulse={next === 'a'} onClick={() => fly('east')} disabled={flying}>往东飞</LabButton>
        <LabButton pulse={next === 'b'} onClick={() => fly('west')} disabled={flying}>往西飞</LabButton>
      </> : <>
        <LabButton primary pulse={next === 'a'} onClick={() => look('normal')} disabled={trade === 'normal'}>看信风</LabButton>
        <LabButton pulse={next === 'b'} onClick={() => look('weak')} disabled={!trade || trade === 'weak'}>让信风减弱</LabButton>
      </>}
      extras={<Control label="实验"><Segmented label="实验" pulse={next === 'exp'} want={wantE} value={exp} onChange={v => pick(v as Exp)} disabled={flying} options={[{ value: 'fly', label: '顺着西风飞' }, { value: 'trade', label: '信风和暖水' }]} /></Control>}
    />
  )
}
