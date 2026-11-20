// 光合作用和呼吸作用 · 第 5 课 种子也在呼吸（呼吸作用消耗氧气、放出二氧化碳、释放能量）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import Scene5 from './scene5'
import { LESSONS, goLesson } from './lessons'
import { SEEDS, T0, WAIT_H, breathes, flaskTemp, type SeedKey } from './physics'

const TASKS: Task[] = [
  { id: 'wait', text: `等 ${WAIT_H} 小时，比较两瓶的温度`, note: `萌发的那瓶升到 ${flaskTemp('alive', WAIT_H)} ℃：呼吸作用释放了能量，一部分变成热` },
  { id: 'lime', text: '把萌发种子瓶里的气体通进石灰水', note: '石灰水变浑浊：种子放出了二氧化碳' },
  { id: 'candle', text: '把燃烧的蜡烛伸进萌发种子的瓶里', note: '蜡烛熄灭：瓶里的氧气被种子用掉了' },
  { id: 'boiled', text: '煮熟的种子那一瓶，两样都再做一遍', note: '石灰水没变，蜡烛照样烧：死的种子不呼吸' },
]

export default function Lesson5() {
  const [goal, setGoal] = useState(0)
  const [pick, setPick] = useState<SeedKey>('alive')
  const [lime, setLime] = useState<SeedKey[]>([])
  const [candle, setCandle] = useState<SeedKey[]>([])
  const T = useTasks('gewu:leaf:5', TASKS)
  const hours = useSlide(goal, 2.4), waited = hours >= WAIT_H - 0.01
  const ok = (l: SeedKey[], c: SeedKey[]) => (id: string) => id === 'wait' ? waited : id === 'lime' ? l.includes('alive') : id === 'candle' ? c.includes('alive') : l.includes('boiled') && c.includes('boiled')
  useEffect(() => { if (waited) T.check(ok(lime, candle)) }, [waited])   // eslint-disable-line react-hooks/exhaustive-deps
  const doLime = () => { if (!waited || lime.includes(pick)) return; const n = [...lime, pick]; setLime(n); T.check(ok(n, candle)) }
  const doCandle = () => { if (!waited || candle.includes(pick)) return; const n = [...candle, pick]; setCandle(n); T.check(ok(lime, n)) }
  const resetAll = () => { setGoal(0); setPick('alive'); setLime([]); setCandle([]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'wait' | 'pick' | 'lime' | 'candle' | null } = (() => {
    if (!task) return { hint: '都做完了。活的种子在呼吸，死的不呼吸。', next: null }
    if (task.id === 'wait') return goal ? { hint: '时间在走：盯住两支温度计', next: null } : { hint: `按“等 ${WAIT_H} 小时”`, next: 'wait' }
    const want: SeedKey = task.id === 'boiled' ? 'boiled' : 'alive'
    if (pick !== want) return { hint: `选“${SEEDS[want].name}”那一瓶`, next: 'pick' }
    if (task.id === 'lime' || (task.id === 'boiled' && !lime.includes('boiled'))) return { hint: '按“通石灰水”', next: 'lime' }
    return { hint: '按“伸进蜡烛”', next: 'candle' }
  })()
  const wantPick: SeedKey = task?.id === 'boiled' ? 'boiled' : 'alive'

  return (
    <LabShell title="光合作用和呼吸作用" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="两瓶种子"
      stage={<Scene5 hours={hours} pick={pick} lime={lime} candle={candle} />}
      lesson={<LessonBlock no="5" title="种子也在呼吸" concept="呼吸作用：吸进氧气，放出二氧化碳，释放能量" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>细胞利用氧气，把有机物分解成二氧化碳和水，同时把有机物里的能量释放出来，这就是<b className="text-white">呼吸作用</b>。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">温度升高：</b>释放的能量有一部分变成了热</li>
            <li><b className="text-[#7fe3d4]">石灰水变浑浊：</b>放出了二氧化碳</li>
            <li><b className="text-[#7fe3d4]">蜡烛熄灭：</b>氧气被消耗了</li>
          </ul>
          <p className="mt-3">呼吸作用在所有活细胞里时刻进行，白天黑夜都不停。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里的温度是按简单的规律算的，只用来比较两瓶谁高谁低。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两瓶种子比完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">活的种子吸进氧气，放出二氧化碳和热</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">煮熟的种子什么变化都没有。呼吸作用是活细胞才有的。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SEEDS[pick].name} · 过了 {hours.toFixed(0)} 小时</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{flaskTemp(pick, hours).toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">℃</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="开始时" value={`${T0}`} unit="℃ · 两瓶一样" />
            <ParamTile symbol="温度差" value={(flaskTemp('alive', hours) - flaskTemp('boiled', hours)).toFixed(1)} unit="℃ · 萌发的比煮熟的高" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">种子</th><th className="font-normal">石灰水</th><th className="font-normal">蜡烛</th></tr></thead>
            <tbody>{(Object.keys(SEEDS) as SeedKey[]).map(k => <tr key={k} className="border-t border-white/12"><td className="py-1.5 text-white/80">{SEEDS[k].name}</td><td className="font-semibold text-[#7fe3d4]">{lime.includes(k) ? (breathes(k) ? '变浑浊' : '没变') : '—'}</td><td className="font-semibold text-[#7fe3d4]">{candle.includes(k) ? (breathes(k) ? '熄灭' : '继续烧') : '—'}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'wait'} onClick={() => setGoal(WAIT_H)} disabled={goal > 0}>等 {WAIT_H} 小时</LabButton>
        <LabButton primary={next === 'lime'} pulse={next === 'lime'} onClick={doLime} disabled={!waited || lime.includes(pick)}>通石灰水</LabButton>
        <LabButton primary={next === 'candle'} pulse={next === 'candle'} onClick={doCandle} disabled={!waited || candle.includes(pick)}>伸进蜡烛</LabButton>
      </>}
      extras={
        <Control label="哪一瓶">
          <Segmented label="哪一瓶" pulse={next === 'pick'} want={next === 'pick' ? wantPick : null} value={pick} onChange={setPick} options={(Object.keys(SEEDS) as SeedKey[]).map(k => ({ value: k, label: SEEDS[k].name }))} />
        </Control>
      }
    />
  )
}
