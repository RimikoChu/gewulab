// 金属和炼铁 · 第 7 课 铁的锈蚀和防护：化验台第 7 格，试管架上四支试管。
// A：铁钉一半浸在水里（水和空气）；B：铁钉浸没在煮沸过的蒸馏水里，水面上一层植物油（只有水）；C：管底放干燥剂，上面塞一团棉花，铁钉放在棉花上，塞紧（只有干燥的空气）；
// D：和 A 一样的水，先空着。放置一周，A 的铁钉在水面附近生锈；取出来比一比；再给一根新铁钉刷漆、涂油或镀锌，放进 D 里再放一周，不生锈。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Glove, Nail, SOL, Stopper, TUBE, TestTube, TubeRack } from './gear'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun, type P3 } from './parts'
import { DAYS, GUARD, TUBES, rusts, type Guard, type Tube } from './physics'
import { BZ, M, ST, TOP, Place, spot, type V3 } from './world'

const X0 = ST.l7, Y = TOP, Z = BZ + 0.15
const at = (x: number, y = 0, z = 0): V3 => [X0 + x * M, Y + y * M, Z + z * M]
const GAP = 0.06, RACK_Y = 0.066
const tubeX = (i: number) => (i - 1.5) * GAP
const VIEW = spot(X0 + 0.04 * M, Y + 0.12 * M, Z, 2.3, 1.45, [0.1, 0.3], true)
const ABC: Tube[] = ['A', 'B', 'C']
/** 每支管里：水面高、油层厚、铁钉的底（m，相对管底） */
const FILLS = { A: 0.03, B: 0.075, C: 0, D: 0.03 }, NAIL_Y = { A: 0.005, B: 0.005, C: 0.034, D: 0.005 }
const GUARDS: Guard[] = ['paint', 'oil', 'zinc']
const SEC = { week: 7, look: 4.5, guard: 5 }
const TASKS: Task[] = [
  { id: 'week', text: '三支试管放置一周', note: '一周后，A 中的铁钉在水面附近生了锈，B、C 中的仍然光亮' },
  { id: 'look', text: '取出铁钉，找出生锈的那一支', note: '只有同时接触水和氧气的 A 生锈了：铁生锈要同时有水和氧气' },
  { id: 'guard', text: '给新铁钉刷漆、涂油或镀锌', note: '防护层把铁和水、氧气隔开' },
  { id: 'again', text: '放进 D 里再放置一周', note: '做过防护的铁钉放了一周，没有生锈' },
]

export default function Lesson7() {
  const T = useTasks('gewu:metal:7', TASKS)
  const [guard, setGuard] = useState<Guard>('paint')
  const [chosen, setChosen] = useState<Guard | null>(null)
  const week = useRun(SEC.week, () => T.check(id => id === (T.done.guard ? 'again' : 'week')))
  const look = useRun(SEC.look, () => T.check(id => id === 'look'))
  const coat = useRun(SEC.guard, () => { setChosen(guard); T.check(id => id === 'guard') })
  const resetAll = () => { week.snap(0); look.snap(0); coat.snap(0); setGuard('paint'); setChosen(null); T.reset() }
  const task = T.current?.id
  const busy = week.busy || look.busy || coat.busy
  // 天数：第一周给 A、B、C，第二周给 D
  const day1 = T.done.week ? DAYS : week.busy && !T.done.guard ? week.t : 0
  const day2 = T.done.again ? DAYS : week.busy && T.done.guard ? week.t : 0
  const rustA = rusts(TUBES.A.water, TUBES.A.air) ? day1 / DAYS : 0
  const lift = look.busy ? ease(seg(look.t, 0, 1.2)) * (1 - ease(seg(look.t, SEC.look - 1.2, SEC.look))) : 0
  // 做防护：新铁钉从台上拿起，在手里转一转刷上（涂上、镀上），再放进 D
  const nailRest: P3 = at(0.15, 0.003, 0.03), dIn: P3 = at(tubeX(3), RACK_Y + NAIL_Y.D)
  const ct = coat.t
  const nailK = coat.busy ? ease(seg(ct, 0.8, 3.0)) : chosen ? 1 : 0
  const inD = !!chosen && !coat.busy
  const nailAt: P3 = !coat.busy ? nailRest : ct < 0.8 ? liftPath(nailRest, at(0.15, 0.12, 0.03), at(0, 0.12)[1], seg(ct, 0, 0.8)) : ct < 3.2 ? at(0.15, 0.12, 0.03) : liftPath(at(0.15, 0.12, 0.03), dIn, at(0, RACK_Y + TUBE.h + 0.05)[1], seg(ct, 3.2, SEC.guard - 0.1))
  const spin = coat.busy && ct > 0.8 && ct < 3.2 ? (ct - 0.8) * 4 : 0
  const lying = !coat.busy && !chosen

  const next = busy ? null : !T.done.week ? 'week' : !T.done.look ? 'look' : !T.done.guard ? 'guard' : !T.done.again ? 'week' : null
  const hint = !task ? '铁同时接触水和氧气才会生锈；把铁和水、氧气隔开就能防锈。'
    : week.busy ? `放置中，第 ${Math.min(DAYS, Math.floor(week.t) + 1)} 天…`
    : look.busy ? '把三根铁钉取出来比一比…'
    : coat.busy ? `给新铁钉${GUARD[guard].name}，再放进 D…`
    : !T.done.week ? '三支试管里的铁钉接触的东西不同。放置一周'
    : !T.done.look ? '一周到了。把铁钉取出来，看哪一根生了锈'
    : !T.done.guard ? '选一种办法，给新铁钉做防护'
    : '把做过防护的铁钉放在 D 里，和 A 的条件一样，再放置一周'
  const nailIn = (k: Tube | 'D'): P3 => { const i = k === 'D' ? 3 : ABC.indexOf(k); return at(tubeX(i), RACK_Y + NAIL_Y[k] + (k === 'D' ? 0 : lift * 0.17)) }

  const labels: Label[] = [
    ...ABC.map((k, i) => ({ id: `t${k}`, at: at(tubeX(i), RACK_Y + TUBE.h + 0.012) as V3, ax: 0.5, className: `scene-tag ${T.done.look && k === 'A' ? 'key' : ''} -translate-y-full`, children: <><small>{k}</small>{T.done.week || (week.busy && !T.done.guard && week.t > 4) ? (k === 'A' ? '生锈了' : '没生锈') : TUBES[k].name}</> })),
    { id: 'tD', at: at(tubeX(3), RACK_Y + TUBE.h + 0.012) as V3, ax: 0.5, className: `scene-tag ${T.done.again ? 'key' : ''} -translate-y-full`, children: <><small>D</small>{T.done.again ? '没生锈' : chosen ? GUARD[chosen].name : '水和空气'}</> },
    { id: 'n1', at: at(0.15, 0.01, 0.06), ax: 0.5, name: true, className: 'scene-name', children: '新铁钉' },
  ]
  return (
    <LabShell title="金属和炼铁" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="锈蚀和防护"
      stage={<Place at={VIEW} labels={labels}>
        <group position={at(0, 0, 0)}><TubeRack n={4} gap={GAP} /></group>
        {/* A、D：一半的水；B：满一些的水加一层油；C：干燥剂、棉花、塞子 */}
        <group position={at(tubeX(0), RACK_Y)}><TestTube fill={FILLS.A} sol={SOL.water} /></group>
        <group position={at(tubeX(1), RACK_Y)}><TestTube fill={FILLS.B} sol={SOL.water} layer={0.012} /></group>
        <group position={at(tubeX(2), RACK_Y)}><TestTube>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => <mesh key={n} position={[Math.cos(n * 2.3) * 0.0032 * M * (n % 3 ? 1 : 0.3), (0.004 + (n % 3) * 0.004) * M, Math.sin(n * 2.3) * 0.0032 * M * (n % 3 ? 1 : 0.3)]}><dodecahedronGeometry args={[0.0028 * M, 0]} /><meshStandardMaterial color="#f2f1ec" roughness={0.8} /></mesh>)}
          <mesh position-y={0.03 * M}><cylinderGeometry args={[(TUBE.r - 0.001) * M, (TUBE.r - 0.001) * M, 0.009 * M, 16]} /><meshStandardMaterial color="#fbfaf6" roughness={1} /></mesh>
        </TestTube></group>
        <group position={at(tubeX(2), RACK_Y + TUBE.h - 0.012)}><Stopper /></group>
        <group position={at(tubeX(3), RACK_Y)}><TestTube fill={FILLS.D} sol={SOL.water} /></group>
        {ABC.map(k => <group key={k} position={nailIn(k)} rotation-y={lift * 0.6}><Nail rust={k === 'A' ? rustA : 0} band={[0.012, 0.036]} /></group>)}
        {/* 新铁钉：平放在台上 → 拿在手里做防护 → 放进 D */}
        <group position={inD ? nailIn('D') : nailAt} rotation={lying ? [0, 0.4, Math.PI / 2] : [0, spin, 0]}>
          <Nail guard={nailK > 0.5 ? (coat.busy ? guard : chosen ?? undefined) : undefined} rust={0} />
          {coat.busy && <group position={[0.012 * M, 0.04 * M, 0]} rotation={[0, 0, -0.5]}><Glove s={0.0052 * M} /></group>}
        </group>
      </Place>}
      lesson={<LessonBlock no="7" title="铁的锈蚀和防护" concept="铁同时接触水和氧气才会生锈" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>铁生锈，实际上是铁和空气中的<b className="text-white">氧气、水</b>等发生化学反应的过程。A 中的铁钉同时接触水和空气，生锈了；B 只接触水（蒸馏水煮沸除去溶解的氧气，植物油隔绝空气），C 只接触干燥的空气，都没有生锈。</p>
          <p className="mt-3">铁锈很疏松，不能阻碍里层的铁继续和氧气、水反应，所以铁制品会被锈蚀穿。</p>
          <p className="mt-3">防锈的原理是<b className="text-white">隔绝氧气和水</b>：保持铁制品表面洁净干燥；在表面刷漆、涂油、镀上其他金属、烤蓝；或者把铁制成不锈钢等合金。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">铁同时接触水和氧气才会生锈；隔绝水和氧气就能防锈</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">A 生锈，B、C 没有；{chosen ? GUARD[chosen].name : '做过防护'}的铁钉在和 A 一样的条件下放了一周，也没有生锈。</p>
      </>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">放置的天数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{Math.floor(T.done.guard ? day2 : day1)}<span className="ml-1 text-[15px] font-medium text-white/55">天</span></div>
          </div>
          <table className="mt-4 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium" /><th className="pb-1 font-medium">水</th><th className="pb-1 font-medium">氧气</th><th className="pb-1 font-medium">生锈</th></tr></thead>
            <tbody>{ABC.map(k => <tr key={k} className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">{k}</td><td>{TUBES[k].water ? '有' : '无'}</td><td>{TUBES[k].air ? '有' : '无'}</td><td className={`rounded-r-lg font-semibold ${T.done.week && rusts(TUBES[k].water, TUBES[k].air) ? 'text-[#ffb0a8]' : ''}`}>{T.done.week ? (rusts(TUBES[k].water, TUBES[k].air) ? '生锈' : '不生锈') : '—'}</td></tr>)}
              <tr className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">D</td><td>有</td><td>有</td><td className="rounded-r-lg font-semibold text-[#7fe3d4]">{T.done.again ? `不生锈（${chosen ? GUARD[chosen].name : ''}）` : '—'}</td></tr>
            </tbody>
          </table>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="防护" value={chosen ? GUARD[chosen].name : '—'} unit={chosen ? GUARD[chosen].how : '还没做'} />
            <ParamTile symbol="条件" value="水 + 氧气" unit="生锈要两样都有" />
          </div>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'week'} pulse={next === 'week'} disabled={busy || (T.done.week && !T.done.guard) || !!T.done.again} onClick={() => week.run()}>放置一周</LabButton>
        <LabButton primary={next === 'look'} pulse={next === 'look'} disabled={busy || !T.done.week || !!T.done.look} onClick={() => look.run()}>取出来看</LabButton>
        <LabButton primary={next === 'guard'} pulse={next === 'guard'} disabled={busy || !T.done.look || !!T.done.guard} onClick={() => coat.run()}>做防护</LabButton>
      </>}
      extras={<Control label="防护办法">
        <Segmented label="防护办法" want={'paint'} disabled={busy || !!T.done.guard} value={guard} onChange={g => setGuard(g as Guard)} options={GUARDS.map(g => ({ value: g, label: GUARD[g].name }))} />
      </Control>}
    />
  )
}
