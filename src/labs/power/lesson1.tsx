// 电功率和生活用电 · 第 1 课 电能和电能表：楼道里的电表箱，102 是这户人家的电能表。
// 记下月初的示数，让时间过一个月（液晶屏上的数一天天往上走），记下月末的示数，两次相减就是这个月用的电。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { DAYS, METER, R0, kwhToJ, meterShow, monthKwh } from './physics'
import { useRun, f1 } from './parts'
import { Big, Table } from './views'
import { Place } from './world'
import { CM, MB, type V3 } from './layout'
import { METER_SLOT } from './panel'

const TASKS: Task[] = [
  { id: 'r0', text: '记下月初电能表的示数', note: '月初是 3268.4 kW·h' },
  { id: 'month', text: '让时间过一个月', note: '电能表的示数一直在往上走' },
  { id: 'r1', text: '记下月末的示数', note: '月末是 3427.5 kW·h' },
  { id: 'calc', text: '算出这个月用了多少度电', note: '159.1 度电' },
]
/** 102 号表上某一处（厘米，相对表的中心）的场景坐标 */
const at102 = (p: V3): V3 => { const s = METER_SLOT(1); return [MB[0] + (s[0] + p[0]) * CM, MB[1] + (s[1] + p[1]) * CM, MB[2] + (-11 + p[2]) * CM] }

export default function Lesson1() {
  const [rows, setRows] = useState<number[]>([])
  const [shown, setShown] = useState(false)
  const T = useTasks('gewu:power:1', TASKS)
  const run = useRun(9, () => T.check(id => id === 'month'))
  const day = run.k * DAYS, reading = meterShow(day)
  const passed = run.k >= 1
  const record = () => {
    if (run.busy) return
    if (!rows.length && day === 0) { setRows([reading]); T.check(id => id === 'r0') }
    else if (rows.length === 1 && passed) { setRows([rows[0], reading]); T.check(id => id === 'r1') }
  }
  const calc = () => { if (rows.length < 2) return; setShown(true); T.check(id => id === 'calc') }
  const resetAll = () => { run.snap(0); setRows([]); setShown(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'rec' | 'month' | 'calc' | null } = !task ? { hint: '一段时间里用的电能，等于电能表末示数减去初示数。', next: null }
    : task.id === 'r0' ? { hint: '这是 102 的电能表。读出月初的示数，按“记下示数”', next: 'rec' }
    : run.busy ? { hint: '时间一天天过去，示数在往上走…', next: null }
    : task.id === 'month' ? { hint: '让时间过一个月', next: 'month' }
    : task.id === 'r1' ? { hint: '一个月过去了。读出月末的示数，按“记下示数”', next: 'rec' }
    : { hint: '两次示数都记下了。算一算这个月用了多少度电', next: 'calc' }

  const labels: Label[] = [
    { id: 'lcd', at: at102([0, 8.6, 5]), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>示数</small>{f1(reading)} kW·h</> },
    { id: 'day', at: at102([0, -12.5, 5]), ax: 0.5, className: 'scene-tag transition-opacity', style: { opacity: day > 0 ? 1 : 0 }, children: <><small>{passed ? '月末' : '第'}</small>{passed ? `${DAYS} 天` : `${Math.min(DAYS, Math.floor(day) + 1)} 天`}</> },
    { id: 'n1', at: at102([7.5, 3.85, 5]), ax: 0, className: 'scene-name -translate-y-1/2', name: true, children: '脉冲灯：每用 1/3200 kW·h 闪一次' },
    { id: 'n2', at: at102([0, -10, 5]), ax: 0.5, className: 'scene-name', name: true, children: '102 · 这户人家的电能表' },
  ]
  const used = monthKwh()
  return (
    <LabShell title="电功率和生活用电" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="电能表"
      stage={<Place at="l1" labels={labels} world={{ reading, rate: run.busy ? 14 : 0.25 }} />}
      lesson={<LessonBlock no="1" title="电能和电能表" concept="两次示数之差就是用掉的电能" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>用电器工作时消耗电能，电能转化为其他形式的能。电能的单位是焦耳（J），生活中常用千瓦时（kW·h），也叫“度”：1 kW·h = 3.6×10⁶ J。</p>
          <p className="mt-3">电能表（电度表）计量用电器在一段时间内消耗的电能。<b className="text-white">这段时间用的电 = 末示数 − 初示数。</b>示数的最后一位是小数。</p>
          <p className="mt-3 text-[13.5px] text-white/65">铭牌上“220 V”是电能表应接在 220 V 的电路中使用；“10(40) A”是标定电流 10 A、额定最大电流 40 A；“3200 imp/(kW·h)”是每用 1 kW·h 的电，指示灯闪 3200 次。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两次示数相减</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">这个月用了 {f1(used)} kW·h，也就是 {f1(used)} 度电</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{f1(meterShow(DAYS))} − {f1(R0)} = {f1(used)} kW·h ≈ {(kwhToJ(used) / 1e8).toFixed(2)}×10⁸ J。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <Big label="102 · 电能表示数" value={f1(reading)} unit="kW·h" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="U" value={String(METER.u)} unit="V · 额定电压" />
            <ParamTile symbol="I" value={METER.i} unit="A" />
          </div>
          <div className="mt-2"><ParamTile symbol="N" value={String(METER.imp)} unit="imp/(kW·h) · 每度电闪的次数" /></div>
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          <div className="mt-1.5"><Table head={['', '示数 / kW·h']} rows={[['月初', rows[0] !== undefined ? f1(rows[0]) : '—'], ['月末', rows[1] !== undefined ? f1(rows[1]) : '—']]} hl={rows.length - 1}
            foot={shown ? ['用了', `${f1(used)}`] : undefined} /></div>
          {shown && <p className="hint-in mt-2 text-center text-[13.5px] text-white/70">{f1(used)} kW·h = {f1(used)} × 3.6×10⁶ J ≈ {(kwhToJ(used) / 1e8).toFixed(2)}×10⁸ J</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={run.busy || (rows.length === 1 && !passed) || rows.length >= 2}>记下示数</LabButton>
        <LabButton pulse={next === 'month'} onClick={() => run.run()} disabled={run.busy || passed || !rows.length}>过一个月</LabButton>
        <LabButton primary={next === 'calc'} pulse={next === 'calc'} onClick={calc} disabled={rows.length < 2 || shown}>算用电量</LabButton>
      </>}
      extras={null}
    />
  )
}
