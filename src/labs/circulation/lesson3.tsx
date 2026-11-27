// 大气环流 · 第 3 课 气压带和风带：正对大西洋看整颗地球。先在地面上画出七个气压带（蓝高红低），再画出六个风带（流动的白色箭头），
// 换到北半球、南半球各看一次，比一比风向偏向哪边。
import { useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Fin, H2, Rows, noteTag, pTag } from './parts'
import { BELTS, WINDS, windAtName, type Air } from './physics'
import { VOICE } from './voice'
import { SPACE, at, azFor, facing, type Want } from './world'

const TASKS: Task[] = [
  { id: 'belts', text: '画出近地面的七个气压带', note: '高压、低压相间分布，以赤道为中心南北对称' },
  { id: 'winds', text: '画出六个风带', note: '风从高压带吹向低压带' },
  { id: 'north', text: '在北半球记下三个风带的风向', note: '北半球向右偏：东北信风、西南风、东北风' },
  { id: 'south', text: '换到南半球，再记一次', note: '南半球向左偏：东南信风、西北风、东南风' },
]
type Half = 'n' | 's'
const LON = -20, AZ = azFor(LON)
const EL: Record<Half, number> = { n: 0.32, s: -0.32 }
const TARGET = new THREE.Vector3(0, 0, 0), SPAN: [number, number] = [23.5, 22.5]
const AIR: Air = { k: 1, sunLat: 0 }
const VIEWS: Record<Half, [number, number]> = { n: [AZ, EL.n], s: [AZ, EL.s] }
const BAND_LON = LON - 32, WIND_LON = LON + 26

export default function Lesson3() {
  const [belts, setBelts] = useState(false)
  const [winds, setWinds] = useState(false)
  const [half, setHalf] = useState<Half>('n')
  const [rows, setRows] = useState<Half[]>([])
  const T = useTasks('gewu:circulation:3', TASKS)
  const record = () => { if (rows.includes(half)) return; const n = [...rows, half]; setRows(n); T.check(id => (id === 'north' && n.includes('n')) || (id === 'south' && n.includes('s'))) }
  const resetAll = () => { setBelts(false); setWinds(false); setHalf('n'); setRows([]); T.reset() }

  const task = T.current
  const wantHalf: Half | null = task?.id === 'south' ? 's' : task?.id === 'north' ? 'n' : null
  const { hint, next }: { hint: string; next: 'belts' | 'winds' | 'half' | 'record' | null } = (() => {
    if (!task) return { hint: '都做完了。七个气压带、六个风带相间分布。', next: null }
    if (!belts) return { hint: '画出近地面的七个气压带', next: 'belts' }
    if (!winds) return { hint: '风从高压吹向低压。画出六个风带', next: 'winds' }
    if (wantHalf && half !== wantHalf) return { hint: '换到南半球看看', next: 'half' }
    return { hint: half === 'n' ? '北半球：记下三个风带的风向' : '南半球：记下三个风带的风向', next: 'record' }
  })()

  const [az, el] = VIEWS[half]
  const vis = (lon: number, lat: number) => facing(lon, lat, az, el, 0.08)
  const labels: Label[] = [
    ...BELTS.map(b => { const lat = Math.sign(b.lat) * Math.min(Math.abs(b.lat), 82); return pTag(b.key, at(BAND_LON, lat, 1.02), b.name, b.kind === 'high', belts && vis(BAND_LON, lat), 1) }),
    ...WINDS.map(w => { const lat = (w.from + w.to) / 2; return noteTag(w.key, at(WIND_LON, lat, 1.02), `${w.name} · ${windAtName(WIND_LON, lat, AIR)}`, winds && vis(WIND_LON, lat), 0) }),
  ]
  const shown = WINDS.filter(w => (half === 'n' ? w.from >= 0 : w.to <= 0))
  const want: Want = {
    sun: { az: AZ / (Math.PI / 180) + 30, lat: 0 }, night: 0.45, cloud: 0.45, grid: 0.4,
    press: { air: AIR, key: 'three', on: belts ? 0.85 : 0 },
    winds: { air: AIR, on: winds ? 1 : 0, n: 1500 },
  }
  return (
    <LabShell narration={voiced(NARRATION['3'], VOICE)} title="大气环流" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="近地面"
      stage={<LabStage<Want> labels={labels} target={TARGET} span={SPAN} view={VIEWS[half]} {...SPACE} world={want}>{null}</LabStage>}
      lesson={<LessonBlock no="3" title="气压带和风带" concept="七个气压带、六个风带相间分布" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>三圈环流在近地面形成<b className="text-white">七个气压带</b>：</p>
          <ul className="mt-2 flex flex-col gap-1 text-[14px] text-white/80">
            <li><b className="text-[#ff8a8f]">赤道低气压带</b>：终年受热多，空气上升（热力原因）</li>
            <li><b className="text-[#8fb0ff]">副热带高气压带</b>：高空气流堆积下沉（动力原因）</li>
            <li><b className="text-[#ff8a8f]">副极地低气压带</b>：冷暖空气相遇，暖空气被抬升（动力原因）</li>
            <li><b className="text-[#8fb0ff]">极地高气压带</b>：气温低，空气冷却下沉（热力原因）</li>
          </ul>
          <p className="mt-2">相邻的高压带和低压带之间是<b className="text-white">风带</b>：风从高压吹向低压，北半球向右偏、南半球向左偏，形成信风带、西风带、极地东风带。</p>
        </>} />}
      finale={T.finale && <Fin kicker="南北两个半球都看过了" big="七个气压带、六个风带相间分布" small="信风带、西风带、极地东风带：北半球依次是东北风、西南风、东北风；南半球向左偏，是东南风、西北风、东南风。" />}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">气压带</h2>
          <Rows head={['名称', '纬度', '成因']} rows={BELTS.filter(b => b.lat >= 0).map(b => [<span key={b.key} className={b.kind === 'high' ? 'text-[#8fb0ff]' : 'text-[#ff8a8f]'}>{b.name}</span>, b.lat ? `${b.lat}°` : '0°', b.cause])} />
          <p className="mt-1.5 text-[12.5px] text-white/50">南半球和北半球对称，共七个。</p>
          <H2>风带的风向 · {half === 'n' ? '北半球' : '南半球'}</H2>
          {rows.includes(half)
            ? <Rows head={['风带', '风向']} rows={shown.map(w => [w.name, <b key={w.key} className="text-[#7fe3d4]">{windAtName(WIND_LON, (w.from + w.to) / 2, AIR)}</b>])} />
            : <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">画出风带以后按“记录风向”。</p>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="偏向" value={half === 'n' ? '向右' : '向左'} unit={half === 'n' ? '北半球' : '南半球'} />
            <ParamTile symbol="风" value="高 → 低" unit="从高压吹向低压" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={!belts} pulse={next === 'belts'} onClick={() => { setBelts(true); T.check(id => id === 'belts') }} disabled={belts}>画出气压带</LabButton>
        <LabButton primary={belts && !winds} pulse={next === 'winds'} onClick={() => { setWinds(true); T.check(id => id === 'winds') }} disabled={!belts || winds}>画出风带</LabButton>
        <LabButton primary={winds} pulse={next === 'record'} onClick={record} disabled={!winds || rows.includes(half)}>记录风向</LabButton>
      </>}
      extras={<Control label="看哪个半球"><Segmented label="半球" pulse={next === 'half'} want={wantHalf} value={half} onChange={v => setHalf(v as Half)} options={[{ value: 'n', label: '北半球' }, { value: 's', label: '南半球' }]} /></Control>}
    />
  )
}
