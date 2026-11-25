// 电功率和生活用电 · 拓展课：小区配电房、一天的电（课本之外，随堂检测不考）。
// 拓展 1：配电房东侧的油浸式变压器把 10 kV 降到 400 V，送进低压配电柜；合上进线柜，再合上出线柜里 1–3 号楼那一路，住宅楼就来电了。
// 拓展 2：回到这户人家，一项项记下一天里各电器用的电（W = Pt），加起来大约 5 度。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { DAY, TRANSFORMER, dayBill, itemKwh } from './physics'
import { f2 } from './parts'
import { Big, Table } from './views'
import { Place } from './world'
import { CAB, COUNTER, Cm, LIV, TF, WASHER, type V3 } from './layout'
import { Kettle, RiceCooker } from './home'

const TASKS: Task[] = [
  { id: 'main', text: '合上低压进线柜', note: '变压器送来的 400 V 进了配电柜' },
  { id: 'out', text: '合上出线柜里 1–3 号楼那一路', note: '电沿电缆送到住宅楼' },
  { id: 'day', text: '一项项记下这户人家一天用的电', note: '一天大约 5 度电' },
]
type Part = 'grid' | 'day'
/** 一天的电里各项在画面上的位置（看得见的才标） */
const SPOTS: Record<string, V3> = { 冰箱: [6.6, 19.4, -41.7], 电视: [LIV.tv[0], LIV.tv[1] + 4.5, LIV.tv[2]], 电水壶: [-22.2, COUNTER.y + 2.6, -42.2], 电饭煲: [-15.6, COUNTER.y + 2.6, -42.4], 灯: [LIV.lamp[0], LIV.lamp[1] - 1.4, LIV.lamp[2]], 洗衣机: [WASHER[0], 9.5, WASHER[2]] }

export default function LessonX() {
  const [part, setPart] = useState<Part>('grid')
  const [main, setMain] = useState(false)
  const [out, setOut] = useState(false)
  const [n, setN] = useState(0)
  const T = useTasks('gewu:power:x', TASKS)
  const closeMain = () => { setMain(true); T.check(id => id === 'main') }
  const closeOut = () => { if (!main) return; setOut(true); T.check(id => id === 'out') }
  const add = () => { if (n >= DAY.length) return; const m = n + 1; setN(m); if (m === DAY.length) T.check(id => id === 'day') }
  const resetAll = () => { setPart('grid'); setMain(false); setOut(false); setN(0); T.reset() }

  const task = T.current
  const { hint, next, want }: { hint: string; next: 'main' | 'out' | 'add' | 'part' | null; want?: Part } = !task ? { hint: '电从配电房送到家里，用掉多少由电能表计量。', next: null }
    : task.id !== 'day' && part !== 'grid' ? { hint: '回到配电房', next: 'part', want: 'grid' }
    : task.id === 'main' ? { hint: '这是小区的变压器：10 kV 进，400 V 出。合上低压进线柜', next: 'main' }
    : task.id === 'out' ? { hint: '合上出线柜里 1–3 号楼那一路', next: 'out' }
    : part !== 'day' ? { hint: '回到这户人家，算一算一天用多少电', next: 'part', want: 'day' }
    : { hint: `记下${DAY[n].name}一天用的电`, next: 'add' }

  const cab = (i: number, y: number): V3 => [CAB.x0 + CAB.w * (i + 0.5), y, -45 + CAB.d + 0.3]
  const grid: Label[] = [
    { id: 'hv', at: [TF[0] - 4, 22, TF[2] - 1], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>高压进</small>{TRANSFORMER.hv} kV</> },
    { id: 'lv', at: [TF[0] + 5, 21, TF[2] + 3.4], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>低压出</small>{TRANSFORMER.lv * 1000} V</> },
    { id: 'tf', at: [TF[0], 2, TF[2] + 8], ax: 0.5, name: true, className: 'scene-name', children: `变压器 ${TRANSFORMER.kva} kVA` },
    { id: 'v', at: cab(0, 20.4), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: main ? 1 : 0 }, children: <><small>进线电压</small>400 V</> },
    { id: 'c0', at: cab(0, 13.6), ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: main ? 1 : 0 }, children: '低压进线柜' },
    { id: 'c2', at: cab(2, 13.6), ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: main ? 1 : 0 }, children: `1–3 号楼：${out ? '送电' : '断开'}` },
  ]
  const day: Label[] = DAY.slice(0, n).filter(d => SPOTS[d.name]).map(d => ({ id: d.name, at: SPOTS[d.name], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>{d.name}</small>{f2(itemKwh(DAY.indexOf(d)))} kW·h</> }))
  const at = part === 'day' ? 'xDay' : main ? 'x' : 'xTf'
  return (
    <LabShell title="电功率和生活用电" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={part === 'grid' ? '配电房' : '一天的电'}
      stage={<Place at={at} labels={part === 'grid' ? grid : day} world={{ grid: { main, out }, lamp: part === 'day', tv: part === 'day' }}>
        {part === 'day' && <>
          <Cm p={[-22.2, COUNTER.y, -42.2]} yaw={1.2}><Kettle on={false} /></Cm>
          <Cm p={[-15.6, COUNTER.y, -42.4]} yaw={-0.15}><RiceCooker on={false} /></Cm>
        </>}
      </Place>}
      lesson={<LessonBlock no="拓展" title="配电房 · 一天的电" concept="电从配电房来，按度数计量" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>城市里的电先用高压送到小区的配电房，配电变压器把 10 kV 降到 400 V（火线之间 380 V，火线和零线之间 220 V），再由低压配电柜分成一路路，用电缆送到各栋楼、各户的电能表。</p>
          <p className="mt-3">一户人家一天用的电，是各个用电器用的电加起来：W = Pt。功率大、用得久的电器（电热水器、空调）用电最多；冰箱功率不大，但整天开着。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里各电器的功率和使用时间是设定的一种情况，各家不一样。配电变压器的规格也只是一种常见的设定。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">从配电房到这户人家</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">这户人家一天用了 {f2(dayBill())} kW·h，大约 5 度电</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">电热水器一项就占了 2 度；每一项都是 W = Pt。</p>
      </div>}
      panel={part === 'grid' ? (
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <Big label="进线柜" value={main ? '合' : '分'} unit="" />
            <Big label="1–3 号楼" value={out ? '送电' : '断开'} unit="" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="U₁" value={String(TRANSFORMER.hv)} unit="kV · 高压侧" />
            <ParamTile symbol="U₂" value={String(TRANSFORMER.lv)} unit="kV · 低压侧" />
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/65">配电柜上：红灯亮表示合闸送电，绿灯亮表示分闸。</p>
        </Glass>
      ) : (
        <Glass className="px-4 py-4">
          <Big label="一天合计" value={f2(dayBill(n))} unit="kW·h" />
          <h2 className="mt-4 text-[12.5px] text-white/55">一天的用电账（W = Pt）</h2>
          <div className="mt-1.5"><Table head={['电器', 'P / W', 't / h', 'W / kW·h']} rows={DAY.slice(0, n).map((d, i) => [d.name, d.p ? String(d.p) : '—', d.p ? String(d.h) : '全天', f2(itemKwh(i))])} hl={n - 1} /></div>
          {!n && <p className="mt-1 text-center text-[13px] text-white/45">还没有记录</p>}
        </Glass>
      )}
      actions={<>
        <LabButton primary={next === 'main'} pulse={next === 'main'} onClick={closeMain} disabled={main || part !== 'grid'}>合上进线柜</LabButton>
        <LabButton pulse={next === 'out'} onClick={closeOut} disabled={!main || out || part !== 'grid'}>合上 1–3 号楼</LabButton>
        <LabButton primary={next === 'add'} pulse={next === 'add'} onClick={add} disabled={part !== 'day' || n >= DAY.length}>记下一项</LabButton>
      </>}
      extras={
        <Control label="看哪里">
          <Segmented label="看哪里" pulse={next === 'part'} want={want ?? null} value={part} onChange={p => setPart(p as Part)} options={[{ value: 'grid', label: '配电房' }, { value: 'day', label: '一天的电' }]} />
        </Control>
      }
    />
  )
}
