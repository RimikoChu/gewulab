// 消化和吸收 · 第 3 课 口腔里的消化：实验台右半边，教材里的探究“馒头在口腔中的变化”。
// 三支试管放进 37 ℃ 温水保温 10 分钟，各滴 2 滴碘液：1 号不变蓝、2 号变蓝、3 号部分变蓝；再换成 0 ℃ 冰水重做，三支都变蓝。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { BLUE_NAME, IODINE_DROPS, TUBES, WARM_MIN, iodineColor, starchLeft, type Blue, type Temp, type TubeNo } from './physics'
import { BATH_AT, tubeAt } from './bench'

const TASKS: Task[] = [
  { id: 'warm', text: `把三支试管放进 37 ℃ 的温水里保温 ${WARM_MIN} 分钟`, note: '37 ℃ 和口腔里的温度差不多' },
  { id: 'iodine', text: `各滴 ${IODINE_DROPS} 滴碘液，找出不变蓝的那支`, note: '1 号不变蓝：淀粉被唾液分解了' },
  { id: 'cold', text: '换成 0 ℃ 的冰水，重做一遍', note: '0 ℃ 时三支都变蓝：温度太低，唾液淀粉酶不起作用' },
]
const SWATCH: Record<Blue, string> = { none: '#c98a2a', part: '#4b4a8a', blue: '#1a2070' }
const NOS: TubeNo[] = [1, 2, 3]

export default function Lesson3() {
  const [temp, setTemp] = useState<Temp>(37)
  const T = useTasks('gewu:digest:3', TASKS)
  const warm = useRun(6.5, () => { if (temp === 37) T.check(id => id === 'warm') })
  const drop = useRun(4.8, () => T.check(id => (temp === 37 ? id === 'iodine' : id === 'cold')))
  const busy = warm.busy || drop.busy
  const minutes = Math.round(Math.min(1, Math.max(0, (warm.k - 0.2) / 0.6)) * WARM_MIN)
  const color = Object.fromEntries(NOS.map(n => [n, iodineColor(starchLeft(n, temp, WARM_MIN))])) as Record<TubeNo, Blue>
  const shown = drop.k >= 1
  const pickTemp = (t: Temp) => { if (busy || t === temp) return; setTemp(t); warm.snap(0); drop.snap(0) }
  const resetAll = () => { setTemp(37); warm.snap(0); drop.snap(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'warm' | 'drop' | 'temp' | null } = !task ? { hint: '唾液淀粉酶能把淀粉分解成麦芽糖，37 ℃ 时作用最好。', next: null }
    : warm.busy ? { hint: '保温中…', next: null }
    : drop.busy ? { hint: '正在滴碘液…', next: null }
    : shown && temp === 37 ? { hint: '1 号不变蓝。把水温换成 0 ℃，重做一遍', next: 'temp' }
    : warm.k >= 1 ? { hint: `保温 ${WARM_MIN} 分钟了。取出来，各滴 ${IODINE_DROPS} 滴碘液`, next: 'drop' }
    : temp === 0 ? { hint: '换上了冰水和三支新配的试管。放进 0 ℃ 的冰水里保温', next: 'warm' }
    : { hint: '三支试管都配好了。把它们放进 37 ℃ 的温水里保温', next: 'warm' }
  const labels: Label[] = [
    ...NOS.map((n, i): Label => { const p = tubeAt(n); return { id: `t${n}`, at: [p[0] + (i - 1) * 0.04, p[1] + 1.08 + (i % 2) * 0.13, p[2]], ax: 0.5, className: `scene-tag ${shown && color[n] === 'none' ? 'key' : ''} -translate-y-full`, children: <><small>{n} 号</small>{shown ? BLUE_NAME[color[n]] : n === 3 ? '馒头块' : '碎屑'}</> } }),
    { id: 'bath', at: [BATH_AT[0] + 0.62, BATH_AT[1] + 1.2, BATH_AT[2]], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>{temp === 37 ? '温水' : '冰水'}</small>{temp} ℃</> },
  ]
  return (
    <LabShell title="消化和吸收" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="试管"
      stage={<Place at="l3" labels={labels} want={{ l3: { temp, warm: warm.k, drop: drop.k, color, minutes } }} />}
      lesson={<LessonBlock no="3" title="口腔里的消化" concept="唾液淀粉酶把淀粉分解成麦芽糖" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>1 号和 2 号只差一个条件：有没有唾液。1 号不变蓝，说明淀粉被唾液里的<b className="text-white">唾液淀粉酶</b>分解成了麦芽糖；2 号变蓝，说明清水不能分解淀粉。</p>
          <p className="mt-3">3 号是整块馒头、不搅拌，唾液只接触到表面，里面的淀粉还在，所以部分变蓝。这说明牙齿的咀嚼和舌的搅拌能帮助消化。</p>
          <p className="mt-3">换成 0 ℃ 的冰水，1 号也变蓝：温度太低时，唾液淀粉酶几乎不起作用。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[12.5px] text-[#7fe3d4]">温水、冰水各做了一遍</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">唾液淀粉酶把淀粉分解成麦芽糖</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/70">37 ℃ 时只有加了唾液、又搅拌的 1 号不变蓝；0 ℃ 时三支都变蓝。淀粉在口腔里开始被消化。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="t" value={String(temp)} unit="℃ · 水温" />
            <ParamTile symbol="保温" value={String(minutes)} unit="分钟" />
          </div>
          <ul className="mt-4 flex flex-col gap-1.5">
            {NOS.map(n => <li key={n} className={cn('flex items-center gap-3 rounded-lg px-3 py-2', shown && color[n] === 'none' ? 'bg-[#35c7b3]/18' : 'bg-white/6')}>
              <span className="text-[15px] font-semibold tabular-nums">{n} 号</span>
              <span className="flex-1 text-[12.5px] leading-snug text-white/70">{TUBES[n].food} + {TUBES[n].liquid}<br />{TUBES[n].stir ? '搅拌' : '不搅拌'}</span>
              <span className="flex flex-col items-center gap-1"><span className="size-5 rounded-full ring-1 ring-white/25" style={{ background: shown ? SWATCH[color[n]] : '#efece2' }} /><span className="text-[12px] text-white/75">{shown ? BLUE_NAME[color[n]] : '—'}</span></span>
            </li>)}
          </ul>
          <p className="mt-3 rounded-xl bg-white/6 px-3 py-2.5 text-[13px] leading-relaxed text-white/70">滴 {IODINE_DROPS} 滴碘液：还有淀粉就变蓝；淀粉被分解了，就是碘液本来的黄褐色。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'warm'} pulse={next === 'warm'} onClick={() => warm.run()} disabled={busy || warm.k > 0}>放进水里保温</LabButton>
        <LabButton primary={next === 'drop'} pulse={next === 'drop'} onClick={() => drop.run()} disabled={busy || warm.k < 1 || drop.k > 0}>滴加碘液</LabButton>
      </>}
      extras={
        <Control label="水温">
          <Segmented label="水温" pulse={next === 'temp'} want={next === 'temp' ? '0' : null} value={String(temp)} onChange={v => pickTemp(Number(v) as Temp)} disabled={busy} options={[{ value: '37', label: '37 ℃ 温水' }, { value: '0', label: '0 ℃ 冰水' }]} />
        </Control>
      }
    />
  )
}
