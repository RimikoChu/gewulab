// 兴奋的传导和传递 · 第 5 课 电表指针偏转几次：两个电极搭在膜外，接一只零点在中间的电表；刺激点换三处，数指针偏转的次数。
import { useEffect, useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Fronts, T0, msOf, secOf, xOf } from './fiber'
import { clamp, useRun, type Run, type V3 } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Charges, Meter, POSTS, Probe, Stim, Wire } from './parts'
import { PROBE, SITES, deflect, needle, type SiteKey } from './physics'
import { Chart, Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { excitedAt } from './wave'
import { R, Room, TM } from './world'

const NAME: Record<SiteKey, string> = { left: 'a 的左边', mid: 'a、b 正中间', right: 'b 的右边' }
const TASKS: Task[] = (Object.keys(SITES) as SiteKey[]).map(k => {
  const d = deflect(SITES[k])
  return { id: k, text: `在 ${NAME[k]}刺激一次，数指针偏几次`, note: d.times ? `兴奋先到 ${d.order[0]}、后到 ${d.order[1]}：偏转 2 次，方向相反` : '兴奋同时到达 a 和 b：指针不偏' }
})
const XA = xOf(PROBE.a), XB = xOf(PROBE.b), T_RUN = secOf(3) + 1.4, T_END = 4
const METER: V3 = [(XA + XB) / 2, 5.6, -0.7], MS = 1.25
const post = (i: number): V3 => [METER[0] + POSTS[i][0] * MS, METER[1] + POSTS[i][1] * MS, METER[2] + POSTS[i][2] * MS]
const DIR_A: V3 = [0.12, 1, -0.12], DIR_B: V3 = [-0.12, 1, -0.12], PL = 1.9
const tail = (x: number, d: V3): V3 => { const l = Math.hypot(...d); return [x + d[0] / l * PL, R + d[1] / l * PL, -0.15 + d[2] / l * PL] }
const result = (k: SiteKey) => { const d = deflect(SITES[k]); return d.times ? `2 次：先偏向 ${d.order[0]}，再偏向 ${d.order[1]}` : '0 次：不偏转' }

function Scene5({ run, site }: { run: Run; site: SiteKey }) {
  const xs = useMemo(() => Array.from({ length: 20 }, (_, i) => xOf(0) + i * 0.6), [])
  const s = xOf(SITES[site]), a = post(0), b = post(1), ta = tail(XA, DIR_A), tb = tail(XB, DIR_B)
  return <group>
    <Fronts run={run} s={s} lo={xOf(0)} hi={xOf(14)} />
    <Charges xs={xs} yOut={R + 0.62} yIn={R - TM - 0.36} size={2.1} z={0.3} />
    <Stim tip={[s, R + 0.02, 0.35]} dir={[0, 0.75, 1]} len={2.4} flash={() => run.idle ? 0 : clamp(1 - Math.abs(run.ref.current - T0) / 0.3)} />
    <Probe tip={[XA, R + 0.02, -0.15]} dir={DIR_A} len={PL} sleeve="#b3261e" thick={1.2} />
    <Probe tip={[XB, R + 0.02, -0.15]} dir={DIR_B} len={PL} thick={1.2} />
    <Meter position={METER} rotation={[-0.05, 0.1, 0]} scale={MS} ticks={['', '', '0', '', '']} unit="G" value={() => 0.85 * (excitedAt(XB) - excitedAt(XA))} />
    <Wire pts={[ta, [ta[0] + 0.1, ta[1] + 0.5, ta[2] - 0.2], [a[0] - 0.8, a[1] - 0.7, a[2] - 0.2], [a[0] - 0.15, a[1] - 0.5, a[2]], [a[0], a[1] - 0.16, a[2]]]} color="#b3261e" r={0.04} />
    <Wire pts={[tb, [tb[0] - 0.1, tb[1] + 0.5, tb[2] - 0.2], [b[0] + 0.8, b[1] - 0.7, b[2] - 0.2], [b[0] + 0.15, b[1] - 0.5, b[2]], [b[0], b[1] - 0.16, b[2]]]} r={0.04} />
  </group>
}

export default function Lesson5() {
  const [site, setSite] = useState<SiteKey>('left')
  const [got, setGot] = useState<SiteKey[]>([])
  const run = useRun(T_RUN)
  const T = useTasks('gewu:neuron:5', TASKS)
  useEffect(() => { if (run.done && !got.includes(site)) setGot([...got, site]) }, [run.done])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { T.check(id => got.includes(id as SiteKey)) }, [got])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setSite('left'); setGot([]); run.reset(); T.reset() }
  const task = T.current, d = deflect(SITES[site]), ms = run.idle ? 0 : msOf(run.now)
  const { hint, next, want }: { hint: string; next: 'stim' | 'site' | null; want?: SiteKey } = (() => {
    if (run.running) return { hint: '盯着电表的指针…', next: null }
    if (!task) return { hint: '先后到达偏两次，同时到达不偏。', next: null }
    if (site !== task.id) return { hint: `把刺激点换到 ${NAME[task.id as SiteKey]}`, next: 'site', want: task.id as SiteKey }
    return { hint: `刺激点在 ${NAME[site]}。按“给一次刺激”，数指针偏了几次`, next: 'stim' }
  })()
  const trace = Array.from({ length: 81 }, (_, i) => i * 0.05).filter(t => t <= (run.idle ? 0 : run.done ? T_END : ms) + 1e-9).map(t => [t, needle(SITES[site], t)] as [number, number])
  const labels: Label[] = [
    { id: 'a', at: [XA - 0.3, R + 1.0, 0], ax: 1, className: 'scene-tag -translate-y-1/2', children: 'a' },
    { id: 'b', at: [XB + 0.3, R + 1.0, 0], ax: 0, className: 'scene-tag -translate-y-1/2', children: 'b' },
    { id: 's', at: [xOf(SITES[site]), R + 1.0, 1.9], ax: 0.5, className: 'scene-tag key -translate-y-full', children: '刺激点' },
    ...(!run.idle && ms >= d.ta ? [{ id: 'ta', at: [XA, -1.3, 1.75] as V3, ax: 0.5, className: 'scene-tag', children: <><small>到 a</small>{d.ta.toFixed(1)} ms</> }] : []),
    ...(!run.idle && ms >= d.tb ? [{ id: 'tb', at: [XB, -1.3, 1.75] as V3, ax: 0.5, className: 'scene-tag', children: <><small>到 b</small>{d.tb.toFixed(1)} ms</> }] : []),
    { id: 'm', at: [METER[0], METER[1] + 1.25, METER[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电表（零点在中间）' },
  ]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="刺激电极"
      stage={<Room at="five" labels={labels}><Scene5 run={run} site={site} /></Room>}
      lesson={<LessonBlock no="5" title="电表指针偏转几次" concept="兴奋先到哪个电极，指针先朝哪边偏" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>两个电极都搭在神经纤维的膜外。静息时膜外各处都是正电位，两个电极之间没有电位差，指针指在正中。</p>
          <p className="mt-2">兴奋传到电极 a 时，a 处膜外变负，b 处还是正，两个电极之间有了电位差，指针偏向一边；兴奋离开 a，指针回到正中；兴奋传到 b 时，电位差反过来，指针偏向另一边。所以<b className="text-white">偏转两次、方向相反</b>。</p>
          <p className="mt-2">如果刺激点到两个电极一样远，兴奋<b className="text-white">同时</b>到达 a 和 b，两处膜外同时变负，没有电位差，指针不偏转。</p>
        </>} />}
      finale={T.finale && <Finale kicker="三个刺激点都试过了" title="先后到达偏两次，同时到达不偏" text="兴奋先后经过两个电极，指针偏转两次、方向相反；刺激点在两个电极正中间，兴奋同时到达，指针不偏。判断这类题，先看兴奋到两个电极的先后。" notes="指针朝哪边偏，这里约定为朝着膜外先变负的那个电极；画面慢放了很多倍。" />}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="到 a" value={d.ta.toFixed(1)} unit="ms" />
            <ParamTile symbol="到 b" value={d.tb.toFixed(1)} unit="ms" />
          </div>
          <H>指针的位置（上：偏向 b，下：偏向 a）</H>
          <Chart x={[0, T_END]} y={[-1.2, 1.2]} yTicks={[0]} xTicks={[0, 1, 2, 3, 4]} series={[{ pts: trace, color: '#7fe3d4' }]} yLabel="" h={120} />
          <H>结果</H>
          <div className="flex flex-col gap-1.5">{(Object.keys(SITES) as SiteKey[]).map(k => <Row key={k} wide name={NAME[k]} text={got.includes(k) ? result(k) : '—'} on={site === k} seen={got.includes(k)} />)}</div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/55">电极 a 在 {PROBE.a} cm 处，b 在 {PROBE.b} cm 处；三个刺激点在 {SITES.left}、{SITES.mid}、{SITES.right} cm 处。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'stim'} onClick={() => run.start()} disabled={run.running}>给一次刺激</LabButton>
      </>}
      extras={
        <Control label="刺激点">
          <Segmented label="刺激点" pulse={next === 'site'} want={want ?? null} value={site} disabled={run.running} onChange={x => { setSite(x as SiteKey); run.reset() }} options={(Object.keys(SITES) as SiteKey[]).map(k => ({ value: k, label: NAME[k] }))} />
        </Control>
      }
    />
  )
}
