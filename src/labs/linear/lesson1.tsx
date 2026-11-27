// 一次函数 · 第 1 课 谁在变（常量和变量）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene1 from './scene1'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { QTY, changed, drive, type QtyKey } from './physics'

const TASKS: Task[] = [
  { id: 'one', text: '开 1 小时，读出里程和油量', note: '1 小时开了 100 km，油从 50 L 落到 42 L' },
  { id: 'three', text: '再开 2 小时，又读一次', note: '3 小时开了 300 km，还剩 26 L' },
  { id: 'still', text: '指出这四个量里哪个没有变', note: '速度一直是 100 km/h，是常量' },
]
const STOPS = [0, 1, 3]
const KEYS = Object.keys(QTY) as QtyKey[]
const UNIT: Record<QtyKey, string> = { t: 'h', s: 'km', fuel: 'L', v: 'km/h' }

export default function Lesson1() {
  const [leg, setLeg] = useState(0)                 // 开到了第几站：0 出发，1 开了 1 小时，2 开了 3 小时
  const [pick, setPick] = useState<QtyKey | null>(null)
  const T = useTasks('gewu:linear:1', TASKS)
  const goal = STOPS[leg], t = useSlide(goal, 0.42), moving = Math.abs(t - goal) > 1e-3
  const now = drive(t)
  const go = () => {
    if (moving || leg >= 2) return
    const n = leg + 1; setLeg(n)
    setTimeout(() => T.check(id => (id === 'one' && n >= 1) || (id === 'three' && n >= 2)), (STOPS[n] - STOPS[n - 1]) / 0.42 * 1000 + 150)
  }
  const choose = (k: QtyKey) => { setPick(k); if (leg === 2 && !moving && !changed(k, 0, 3)) T.check(id => id === 'still') }
  const resetAll = () => { setLeg(0); setPick(null); T.reset() }
  const arrived = !moving && leg === 2

  const { hint, next }: { hint: string; next: 'go' | 'pick' | null } = !T.current ? { hint: '会变的是变量，不变的是常量。', next: null }
    : moving ? { hint: '路上的几小时快进成几秒：看哪几块表在动…', next: null }
    : leg === 0 ? { hint: '按“开 1 小时”，看仪表盘上哪些数在变', next: 'go' }
    : leg === 1 ? { hint: '记下了第一组读数。按“再开 2 小时”', next: 'go' }
    : pick && changed(pick, 0, 3) ? { hint: `${QTY[pick]}变了，它是变量。再找找哪个没变`, next: 'pick' }
    : { hint: '对照表格，四个量里哪个一直没变？选出来', next: 'pick' }

  const rows = STOPS.slice(0, leg + 1).filter(s => s <= t + 1e-6).map(drive)
  return (
    <LabShell title="一次函数" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="开车"
      stage={<Scene1 t={t} from={STOPS[Math.max(0, leg - 1)]} to={goal} v={now.v} s={now.s} fuel={now.fuel} ms={drive(goal).s} />}
      lesson={<LessonBlock no="1" title="谁在变" concept="会变的是变量，不变的是常量" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <p>在一个变化过程中，数值发生变化的量叫<b className="text-[#7fe3d4]">变量</b>，数值始终不变的量叫<b className="text-[#7fe3d4]">常量</b>。</p>
          <p className="mt-3">汽车以 100 km/h 匀速行驶，行驶时间 t、里程 s、油箱里的油都在变，是变量；速度 100 km/h 一直不变，是常量。里程和时间的关系写成 s = 100t。</p>
          <p className="mt-3 text-[13.5px] text-white/65">换一个过程，常量也可能变成变量：车加速、减速时，速度就是变量了。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三小时开了 300 km</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">时间、里程、油量是变量，速度 100 km/h 是常量</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">里程和时间的关系是 s = 100t：100 是常量，s 和 t 是变量。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">s = 100t</div>
            <div className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">{now.s.toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">km 已开</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="t" value={t.toFixed(1)} unit="h · 行驶时间" />
            <ParamTile symbol="v" value={String(now.v)} unit="km/h · 速度" />
          </div>
          <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-[12px] text-white/50">{KEYS.map(k => <th key={k} className={`py-1 text-right font-normal first:text-left ${arrived && pick === k && !changed(k, 0, 3) ? 'text-[#7fe3d4]' : ''}`}>{QTY[k]} / {UNIT[k]}</th>)}</tr></thead>
            <tbody>{rows.map(r => <tr key={r.t} className="row-in border-t border-white/12">{KEYS.map(k => <td key={k} className={`py-1.5 text-right tabular-nums first:text-left ${k === 'v' && T.done.still ? 'font-semibold text-[#7fe3d4]' : ''}`}>{r[k]}</td>)}</tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={go} disabled={moving || leg >= 2}>{leg === 0 ? '开 1 小时' : '再开 2 小时'}</LabButton>
      </>}
      extras={<Control label="没有变的量"><Segmented label="没有变的量" pulse={next === 'pick'} want={next === 'pick' ? 'v' : null} value={(pick ?? '') as QtyKey} disabled={!arrived} onChange={k => choose(k as QtyKey)} options={KEYS.map(k => ({ value: k, label: QTY[k] }))} /></Control>}
    />
  )
}
