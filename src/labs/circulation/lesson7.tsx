// 大气环流 · 第 7 课 季风：镜头推近到东亚和南亚。冬季亚欧大陆冷（蓝），亚洲高压的风吹向海洋；夏季大陆热（红），风从海洋吹向大陆。
// 记下上海、孟买冬夏的风向；再放一团空气跟着走：冬季从亚洲高压吹出来，夏季从南半球吹来，越过赤道向右偏成西南风。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Big, Fin, H2, Rows, noteTag, pTag, valTag, useRun } from './parts'
import { CENTERS, CITIES, airOf, landVsSea, monsoonAt, trace, type CityKey, type Month } from './physics'
import { VOICE } from './voice'
import { SPACE, at, azFor, type Want } from './world'

const TASKS: Task[] = [
  { id: 'wr', text: '冬季：记下上海、孟买的风向', note: '冬季风：东亚吹西北风，南亚吹东北风' },
  { id: 'wt', text: '冬季：从亚洲高压放一团空气', note: '大陆冷、成高压，风从大陆吹向海洋' },
  { id: 'sr', text: '换到夏季，再记一次风向', note: '夏季风：东亚吹东南风，南亚吹西南风，冬夏风向相反' },
  { id: 'st', text: '夏季：从南半球放一团空气', note: '东南信风越过赤道，向右偏成了西南风' },
]
const NAME: Record<Month, string> = { jan: '冬季（1 月）', jul: '夏季（7 月）' }
const RAD = Math.PI / 180
const LON = 98, LAT = 24, AZ = azFor(LON), EL = LAT * RAD
const VIEW: [number, number] = [AZ, EL], SPAN: [number, number] = [17.5, 14.5]
const TARGET = new THREE.Vector3(...at(LON, LAT, 0.9))
const FROM: Record<Month, [number, number]> = { jan: [104, 43], jul: [84, -14] }
const KEYS = Object.keys(CITIES) as CityKey[]

export default function Lesson7() {
  const [month, setMonth] = useState<Month>('jan')
  const [rec, setRec] = useState<Month[]>([])
  const [flown, setFlown] = useState(false)
  const run = useRun(0.2)
  const T = useTasks('gewu:circulation:7', TASKS)
  const air = useMemo(() => airOf(month), [month])
  const path = useMemo(() => trace(FROM[month][0], FROM[month][1], air, month === 'jan' ? 70 : 85), [month, air])
  const pick = (m: Month) => { setMonth(m); setFlown(false); run.reset() }
  const record = () => { if (rec.includes(month)) return; const n = [...rec, month]; setRec(n); T.check(id => (id === 'wr' && n.includes('jan')) || (id === 'sr' && n.includes('jul'))) }
  const fly = () => { setFlown(true); const m = month; run.start(0, 1, () => T.check(id => (id === 'wt' && m === 'jan') || (id === 'st' && m === 'jul'))) }
  const resetAll = () => { pick('jan'); setRec([]); T.reset() }

  const task = T.current
  const wantM: Month | null = task ? (task.id === 'wr' || task.id === 'wt' ? 'jan' : 'jul') : null
  const { hint, next }: { hint: string; next: 'month' | 'rec' | 'fly' | null } = (() => {
    if (!task) return { hint: '都做完了。冬夏风向相反，就是季风。', next: null }
    if (wantM && month !== wantM) return { hint: '换到夏季', next: 'month' }
    if (run.on) return { hint: month === 'jan' ? '这团空气从大陆吹向海洋…' : '这团空气向北越过赤道，看它往哪边偏…', next: null }
    if (task.id === 'wr' || task.id === 'sr') return { hint: `${NAME[month]}：记下上海、孟买的风向`, next: 'rec' }
    return { hint: month === 'jan' ? '从亚洲高压放一团空气，跟着它走' : '从南半球的印度洋放一团空气，跟着它走', next: 'fly' }
  })()

  const done = rec.includes(month)
  const cen = CENTERS[month].find(c => c.key === (month === 'jan' ? 'asiaH' : 'asiaL'))!
  const crossed = month === 'jul' && flown && run.v > 0.42
  const labels: Label[] = [
    ...KEYS.map(k => valTag(k, at(CITIES[k].lon, CITIES[k].lat, 1.02), CITIES[k].name, done ? monsoonAt(k, month) : '—', done, true, 0)),
    pTag('cen', at(cen.lon, cen.lat, 1.02), cen.name, cen.p > 0, true),
    noteTag('eqn', at(LON - 30, 0.5, 1.02), '赤道', true, 1, '#ffe14d'),
    noteTag('se', at(path[6][0], path[6][1], 1.03), '东南信风', month === 'jul' && flown, 0),
    noteTag('sw', at(path[Math.round(path.length * 0.62)][0], path[Math.round(path.length * 0.62)][1], 1.03), '向右偏 → 西南风', crossed, 0),
  ]
  const want: Want = {
    sun: { az: AZ / RAD + 22, lat: month === 'jan' ? 0 : 20 }, night: 0.45, cloud: 0.25, grid: 0.2, lines: false,
    landT: landVsSea(month) * 0.6, landOnly: true,
    press: { air, key: month, on: 0 },
    winds: { air, on: 1, n: 280, box: [62, 140, -14, 50], size: 0.85 },
    trace: flown ? { pts: path, t: run.v, key: `t${month}` } : undefined,
    marks: KEYS.map(k => ({ lon: CITIES[k].lon, lat: CITIES[k].lat, color: '#ffe14d' })),
  }
  return (
    <LabShell narration={voiced(NARRATION['7'], VOICE)} title="大气环流" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="东亚和南亚"
      stage={<LabStage<Want> labels={labels} target={TARGET} span={SPAN} view={VIEW} {...SPACE} world={want}>{null}</LabStage>}
      lesson={<LessonBlock no="7" title="季风" concept="冬夏风向相反，就是季风" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一年中风向随季节有规律地变化，叫<b className="text-white">季风</b>。亚洲东部和南部季风最典型。</p>
          <ul className="mt-2 flex flex-col gap-1 text-[14px] text-white/80">
            <li><b className="text-white">东亚季风</b>：冬季西北风，寒冷干燥；夏季东南风，高温多雨。主要由海陆热力性质差异形成。</li>
            <li><b className="text-white">南亚季风</b>：冬季东北风；夏季西南风。夏季风主要是气压带、风带季节移动的结果：南半球的东南信风北移、越过赤道后在地转偏向力作用下向右偏，成了西南风；海陆热力差异也加强了它。</li>
          </ul>
        </>} />}
      finale={T.finale && <Fin kicker="冬季、夏季都记下了" big="冬夏风向相反，就是季风" small="东亚：冬季西北风、夏季东南风，主要因为海陆热力性质差异。南亚：冬季东北风、夏季西南风，夏季风是东南信风越过赤道向右偏形成的。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label={`${NAME[month]} · 亚欧大陆`} value={landVsSea(month) < 0 ? '冷 · 高压' : '热 · 低压'} color={landVsSea(month) < 0 ? '#7fb2ff' : '#ff8a70'} />
          <H2>风向记录</H2>
          {rec.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">按“记录风向”。</p>
            : <Rows head={['季节', '上海（东亚）', '孟买（南亚）']} rows={rec.map(m => [m === 'jan' ? '冬季' : '夏季', <b key="a" className="text-[#7fe3d4]">{monsoonAt('shanghai', m)}</b>, <b key="b" className="text-[#7fe3d4]">{monsoonAt('mumbai', m)}</b>])} />}
          <H2>看图</H2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">陆地上的蓝色是冷、红色是热；白色箭头是近地面的风，淡黄色是跟着走的那团空气。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={done || run.on}>记录风向</LabButton>
        <LabButton pulse={next === 'fly'} onClick={fly} disabled={run.on}>放一团空气</LabButton>
      </>}
      extras={<Control label="季节"><Segmented label="季节" pulse={next === 'month'} want={wantM} value={month} onChange={v => pick(v as Month)} disabled={run.on} options={[{ value: 'jan', label: '冬季' }, { value: 'jul', label: '夏季' }]} /></Control>}
    />
  )
}
