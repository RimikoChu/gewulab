// 功和机械能 · 第 3 课 功率：两台升降机把货物升到 6 m 高的平台，一台快（4 s），一台慢（12 s）。
// 做的功一样多，快的那台功率大；换成 100 kg 的货，做功少了一半，功率照样比慢机大：功率比的是做功的快慢。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { HOIST, fmt, hoist, type HoistKey, type LoadKey } from './physics'
import { useRun } from './run'
import { Big, Finale, Records } from './views'
import { VOICE } from './voice'
import { Follow, P, Place } from './world'
import { Crate, Hoist } from './yard'

const NAMES: Record<HoistKey, string> = { fast: '快机', slow: '慢机' }, LOADS: Record<LoadKey, string> = { heavy: '200 kg', light: '100 kg' }
const WANT: Record<string, [HoistKey, LoadKey]> = { a: ['fast', 'heavy'], b: ['slow', 'heavy'], c: ['fast', 'light'] }
const A = hoist('fast', 'heavy'), B = hoist('slow', 'heavy'), C = hoist('fast', 'light')
const TASKS: Task[] = [
  { id: 'a', text: '货物 200 kg：开快机，升到 6 m', note: `做功 ${fmt(A.W)} J，用了 ${fmt(A.t)} s：功率 ${fmt(A.P)} W` },
  { id: 'b', text: '同样的货：开慢机，升到 6 m', note: `做的功一样多，用了 ${fmt(B.t)} s：功率只有 ${fmt(B.P)} W` },
  { id: 'c', text: '换成 100 kg 的货：再开快机', note: `做功少了一半，功率 ${fmt(C.P)} W，还是比慢机大` },
]
const BASE = 0.12, X: Record<HoistKey, number> = { fast: -2.1, slow: 2.1 }

export default function Lesson3() {
  const [load, setLoad] = useState<LoadKey>('heavy')
  const [which, setWhich] = useState<HoistKey | null>(null)
  const [rows, setRows] = useState<[HoistKey, LoadKey][]>([])
  const T = useTasks('gewu:energy:3', TASKS)
  const cur = which ? hoist(which, load) : null
  const run = useRun(cur ? cur.t : 1)
  useEffect(() => { run.reset(); setWhich(null) }, [load])   // eslint-disable-line react-hooks/exhaustive-deps
  const up = which && run.t !== null ? Math.min(HOIST.h, HOIST.speed[which] * run.t) : 0, arrived = run.done && !!which
  // 没开的那一台慢慢落回地面
  const yf = useSlide(which === 'fast' ? up : 0, which === 'fast' ? 99 : 3), ys = useSlide(which === 'slow' ? up : 0, which === 'slow' ? 99 : 3), home = (which === 'fast' || yf === 0) && (which === 'slow' || ys === 0)
  useEffect(() => { if (!arrived) return; setRows(r => r.some(q => q[0] === which && q[1] === load) ? r : [...r, [which!, load]]); T.check(id => WANT[id][0] === which && WANT[id][1] === load) }, [arrived])   // eslint-disable-line react-hooks/exhaustive-deps
  const go = (k: HoistKey) => { if (run.running) return; setWhich(k); run.start() }
  const resetAll = () => { setLoad('heavy'); setWhich(null); setRows([]); run.reset(); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'load' | HoistKey | null } = !task ? { hint: '功率表示做功的快慢：P = W ÷ t。做功多不等于功率大。', next: null }
    : run.running ? { hint: `${NAMES[which!]}正在往上升，看计时器…`, next: null }
    : load !== WANT[task.id][1] ? { hint: `把货物换成 ${LOADS[WANT[task.id][1]]}`, next: 'load' }
    : !home ? { hint: '吊笼正在落回地面…', next: null }
    : { hint: `按“开${NAMES[WANT[task.id][0]]}”`, next: WANT[task.id][0] }
  const [ox, , oz] = P.hoist
  const time = (k: HoistKey) => which === k && run.t !== null ? run.t.toFixed(1) : '0.0'
  const labels: Label[] = [
    { id: 'nf', at: [ox + X.fast - 0.5, 3.3, oz], ax: 1, className: 'scene-name', children: `快机 · 每秒升 ${HOIST.speed.fast} m` },
    { id: 'ns', at: [ox + X.slow + 0.5, 3.3, oz], className: 'scene-name', children: `慢机 · 每秒升 ${HOIST.speed.slow} m` },
    { id: 'h', at: [ox + 4.9, 6.2, oz - 1.9], className: 'scene-tag -translate-y-full', children: <><small>平台</small>高 {HOIST.h} m</> },
    ...(which ? [{ id: 'p', at: [ox + X[which] + 1.0, BASE + up + 1.2, oz + 1.1] as [number, number, number], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: arrived ? 1 : 0 }, children: <><small>功率</small>{cur ? fmt(cur.P) : ''} W</> } satisfies Label] : []),
    ...(which && !arrived ? [{ id: 'up', at: [ox + X[which] + 1.0, BASE + up + 1.2, oz + 1.1] as [number, number, number], className: 'scene-tag -translate-y-1/2', children: <><small>升高</small>{fmt(up, 1)} m</> } satisfies Label] : []),
  ]
  const crate = load === 'heavy' ? <Crate s={0.95} tag="200 kg" /> : <Crate s={0.72} tag="100 kg" />
  return (
    <LabShell title="功和机械能" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="升降机"
      stage={<Place at="hoist" cur={['hoist']} labels={labels}>
        <Follow dy={Math.max(yf, ys) * 0.8} />
        <group position={[ox, 0, oz]}>
          <group position={[X.fast, 0, 0]}><Hoist y={BASE + yf} time={time('fast')}>{crate}</Hoist></group>
          <group position={[X.slow, 0, 0]}><Hoist y={BASE + ys} time={time('slow')} color="#c8372d">{crate}</Hoist></group>
        </group>
      </Place>}
      lesson={<LessonBlock no="3" title="功率" concept="功率表示做功的快慢" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">功与做功所用时间之比叫做功率</b>，它表示做功的快慢。</p>
          <p className="mt-2 font-formula text-[17px] italic">P = W ÷ t</p>
          <p className="mt-3">功的单位是焦（J），时间的单位是秒（s），功率的单位是瓦特，简称瓦（W）：1 W = 1 J/s。常用的还有千瓦，1 kW = 1000 W。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里把货物匀速升高，升降机的拉力等于货物的重力，做的功 W = G h（吊笼自己的重量不算在内）。</p>
        </>} />}
      finale={T.finale && <Finale kicker="三次都比完了" title="功率 P = W ÷ t：比的是做功的快慢，不是做功的多少" more={`同样做 ${fmt(A.W)} J 的功，快机 ${fmt(A.t)} s、${fmt(A.P)} W，慢机 ${fmt(B.t)} s、${fmt(B.P)} W。快机只做 ${fmt(C.W)} J 时，功率 ${fmt(C.P)} W，仍比慢机大。`} onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula="P = W ÷ t" value={arrived && cur ? fmt(cur.P) : '—'} unit="W" />
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数{which ? ` · ${NAMES[which]}` : ''}</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="W = G h" value={arrived && cur ? fmt(cur.W) : '—'} unit="J · 做的功" />
            <ParamTile symbol="t" value={which && run.t !== null ? run.t.toFixed(1) : '—'} unit="s · 所用的时间" />
          </div>
          <Records title="记录" head={['机', '货物', 'W / J', 't / s', 'P / W']} rows={rows.map(([k, l]) => { const q = hoist(k, l); return [NAMES[k], LOADS[l], fmt(q.W), fmt(q.t), fmt(q.P)] })} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'fast'} pulse={next === 'fast'} onClick={() => go('fast')} disabled={run.running || !home}>开快机</LabButton>
        <LabButton primary={next === 'slow'} pulse={next === 'slow'} onClick={() => go('slow')} disabled={run.running || !home}>开慢机</LabButton>
      </>}
      extras={
        <Control label="货物">
          <Segmented label="货物" pulse={next === 'load'} want={next === 'load' ? WANT[task!.id][1] : null} value={load} onChange={k => { if (!run.running) setLoad(k) }} options={(Object.keys(LOADS) as LoadKey[]).map(k => ({ value: k, label: LOADS[k] }))} />
        </Control>
      }
    />
  )
}
