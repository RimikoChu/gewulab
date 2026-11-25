// 金属和炼铁 · 第 4 课 金属和盐溶液：化验台第 4 格，试管架上三支大试管：硫酸铜溶液（蓝色）、硝酸银溶液、硫酸铝溶液（都无色）。
// 选一组，用手把绕成螺旋的金属丝放进去，放置一会儿：铁丝表面覆盖一层红色的铜、溶液由蓝变浅绿；铜丝表面长出银白色的银、溶液渐渐变蓝；
// 铜丝放进硫酸铝溶液，没有变化。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { Glove, ReagentBottle, SOL, TestTube, TubeRack, Wire, mixSol } from './gear'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, rng, seg, useRun, type P3 } from './parts'
import { SALT, SALT_CASES, displace, type SaltCase } from './physics'
import { BZ, M, ST, TOP, Place, spot, type V3 } from './world'

const X0 = ST.l4, Y = TOP, Z = BZ + 0.15
const at = (x: number, y = 0, z = 0): V3 => [X0 + x * M, Y + y * M, Z + z * M]
const GAP = 0.07, RACK_Y = 0.066, FILL = 0.075, TUBE_H = 0.2
const tubeX = (i: number) => (i - 1) * GAP
const VIEW = spot(X0 + 0.0 * M, Y + 0.2 * M, Z, 2.2, 2.15, [0.16, 0.2], true)
const START: Record<SaltCase, { color: string; opacity: number }> = { feCu: SOL.cuso4, cuAg: SOL.agno3, cuAl: SOL.al2so4 }
const END: Record<SaltCase, { color: string; opacity: number }> = { feCu: SOL.feso4, cuAg: SOL.cuno3, cuAl: SOL.al2so4 }
const SEC = { put: 2.2, react: 9 }
const TASKS: Task[] = [
  { id: 'feCu', text: '铁丝放进硫酸铜溶液', note: '铁丝表面覆盖一层红色的铜，溶液由蓝色变成浅绿色：铁比铜活泼' },
  { id: 'cuAg', text: '铜丝放进硝酸银溶液', note: '铜丝表面生成银白色的银，溶液变成蓝色：铜比银活泼' },
  { id: 'cuAl', text: '铜丝放进硫酸铝溶液', note: '没有变化：铜不如铝活泼，换不出铝' },
]
/** 放进试管的金属丝：下面一段螺旋泡在溶液里，上面一段伸出管口、搭在管沿上（m，相对管底） */
const COIL = (() => { const p: V3[] = []; for (let i = 0; i <= 72; i++) { const a = i / 24 * Math.PI * 2; p.push([Math.cos(a) * 0.0055, 0.012 + i / 72 * 0.035, Math.sin(a) * 0.0055]) } return p })()
const LEAD: V3[] = [[0.0055, 0.047, 0], [0.004, 0.09, 0], [0.004, TUBE_H - 0.004, 0], [0.012, TUBE_H + 0.006, 0], [0.02, TUBE_H - 0.012, 0]]

export default function Lesson4() {
  const [pick, setPick] = useState<SaltCase>('feCu')
  const [state, setState] = useState<Partial<Record<SaltCase, boolean>>>({})
  const T = useTasks('gewu:metal:4', TASKS)
  const put = useRun(SEC.put, () => react.run())
  const react = useRun(SEC.react, () => { setState(s => ({ ...s, [pick]: true })); T.check(id => id === pick) })
  const resetAll = () => { put.snap(0); react.snap(0); setState({}); setPick('feCu'); T.reset() }
  const busy = put.busy || react.busy
  const task = T.current?.id as SaltCase | undefined
  /** 每支管的反应进度 0–1（不能反应的一直是 0）；金属丝在不在管里 */
  const prog = (c: SaltCase) => !displace(c) ? 0 : state[c] ? 1 : c === pick && react.busy ? ease(seg(react.t, 0.6, SEC.react - 0.5)) : 0
  const wireIn = (c: SaltCase) => !!state[c] || (c === pick && react.busy)

  // 放金属丝：手捏着丝的上端，从右边拿过来，提起，放进管里
  const i = SALT_CASES.indexOf(pick)
  const rest: P3 = at(0.16, 0.004, -0.01), into: P3 = at(tubeX(i), RACK_Y, 0)
  const wp: P3 = put.busy ? liftPath(rest, into, at(0, RACK_Y + TUBE_H + 0.06)[1], put.t / SEC.put) : rest
  const restRot = put.busy ? (1 - ease(seg(put.t, 0, 0.6))) : 1

  const next = !task || busy ? null : pick !== task ? 'pick' : 'put'
  const hint = !task ? '活动性强的金属能把弱的从它的盐溶液里置换出来。'
    : put.busy ? `把${SALT[pick].metal}放进${SALT[pick].solution}…`
    : react.busy ? '放置一会儿，看金属丝表面和溶液的颜色…'
    : pick !== task ? `选“${SALT[task].short}”` : `把${SALT[task].metal}放进${SALT[task].solution}`

  const crystals = useMemo(() => { const r = rng(23); return Array.from({ length: 70 }, () => { const a = r() * Math.PI * 2, y = 0.012 + r() * 0.035; return { p: [Math.cos(a) * 0.0062, y, Math.sin(a) * 0.0062] as V3, rot: [r() * 3, a, r() * 3] as V3, s: 0.5 + r() * 0.8 } }) }, [])
  const labels: Label[] = [
    ...SALT_CASES.map((c, k) => ({ id: `t${c}`, at: at(tubeX(k), RACK_Y + TUBE_H + 0.012, 0) as V3, ax: 0.5, className: `scene-tag ${state[c] && SALT[c].ok ? 'key' : ''} -translate-y-full`, children: <><small>{SALT[c].solution.replace('溶液', '')}</small>{state[c] ? (SALT[c].ok ? '反应了' : '没变化') : wireIn(c) ? '…' : SALT[c].metal}</> })),
    ...(prog('feCu') > 0.5 ? [{ id: 'k1', at: at(tubeX(0) - 0.016, RACK_Y + 0.035, 0) as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>铁丝表面</small>红色的铜</> }] : []),
    ...(prog('cuAg') > 0.5 ? [{ id: 'k2', at: at(tubeX(1) + 0.016, RACK_Y + 0.035, 0) as V3, ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>铜丝表面</small>银白色的银</> }] : []),
  ]
  const wire = (c: SaltCase) => {
    const fe = c === 'feCu', p = prog(c)
    return <>
      <Wire pts={COIL.map(([x, y, z]) => [x * M, y * M, z * M] as V3)} r={0.00075 * M} kind={fe ? 'steel' : 'copper'} rough={fe ? 0.4 : undefined} coat={fe ? '#a2442a' : undefined} coatK={fe ? p : 0} />
      <Wire pts={LEAD.map(([x, y, z]) => [x * M, y * M, z * M] as V3)} r={0.00075 * M} kind={fe ? 'steel' : 'copper'} rough={fe ? 0.4 : undefined} />
      {c === 'cuAg' && p > 0.02 && crystals.map((q, n) => <mesh key={n} position={[q.p[0] * M, q.p[1] * M, q.p[2] * M]} rotation={q.rot} scale={[1, q.s * p, 1]}><coneGeometry args={[0.0007 * M, 0.006 * M, 4]} /><Metal kind="chrome" rough={0.2} /></mesh>)}
    </>
  }
  return (
    <LabShell title="金属和炼铁" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="置换"
      stage={<Place at={VIEW} labels={labels}>
        <group position={at(0, 0, 0)}><TubeRack n={3} gap={GAP} big /></group>
        {SALT_CASES.map((c, k) => {
          const sol = mixSol(START[c], END[c], c === 'cuAg' ? prog(c) * 0.75 : prog(c) * 0.85)
          return <group key={c}>
            <group position={at(tubeX(k), RACK_Y, 0)}><TestTube big fill={FILL} sol={sol}>{wireIn(c) && wire(c)}</TestTube></group>
          </group>
        })}
        {/* 还没放进去的金属丝：平放在台上，或者被手拿着 */}
        {!wireIn(pick) && <group position={wp} rotation-z={restRot * Math.PI / 2}>
          {wire(pick)}
          {put.busy && <group position={[0.018 * M, (TUBE_H + 0.03) * M, 0]} rotation={[0, 0, -0.3]}><Glove s={0.0055 * M} /></group>}
        </group>}
        <group position={at(-0.17, 0, -0.11)}><ReagentBottle label="硫酸铜" sol={SOL.cuso4} /></group>
        <group position={at(-0.24, 0, -0.1)}><ReagentBottle label="硝酸银" sol={SOL.agno3} brown /></group>
      </Place>}
      lesson={<LessonBlock no="4" title="金属和盐溶液" concept="强的金属能把弱的从它的盐溶液里换出来" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>铁能把铜从硫酸铜溶液中置换出来，说明<b className="text-white">铁比铜活泼</b>；铜能把银从硝酸银溶液中置换出来，说明<b className="text-white">铜比银活泼</b>；铜不能和硫酸铝溶液反应，说明<b className="text-white">铝比铜活泼</b>。</p>
          <p className="mt-3">一种单质和一种化合物反应，生成另一种单质和另一种化合物，这类反应叫做<b className="text-white">置换反应</b>。</p>
          <p className="mt-3 text-[13.5px] text-white/65">我国古代就有“曾青得铁则化为铜”的记载，“曾青”就是硫酸铜一类的溶液，这是湿法炼铜的先驱。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">活动性：铝 &gt; 铁 &gt; 铜 &gt; 银</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">铁换出了铜，铜换出了银，铜换不出铝。强的金属能把弱的从它的盐溶液里置换出来。</p>
      </>}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SALT[pick].short}</div>
            <div className="mt-1 font-formula text-[16px] leading-snug">{SALT[pick].eq ?? '不反应'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="放进去" value={SALT[pick].ok ? `${SALT[pick].inG} g` : '—'} unit={SALT[pick].ok ? SALT[pick].metal.slice(0, 1) : '不反应'} />
            <ParamTile symbol="换出来" value={SALT[pick].ok && state[pick] ? `${SALT[pick].outG} g` : '—'} unit={SALT[pick].ok ? (pick === 'feCu' ? '铜 · 固体质量增加' : '银 · 固体质量增加') : '—'} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">三组的结果</h2>
          <ul className="mt-2 flex flex-col gap-1 text-[13.5px]">
            {SALT_CASES.map(c => <li key={c} className={`rounded-lg px-2.5 py-1.5 ${c === pick ? 'bg-white/10' : 'bg-white/[0.04]'}`}><div className="flex justify-between"><span>{SALT[c].short}</span><span className={state[c] ? (SALT[c].ok ? 'font-semibold text-[#7fe3d4]' : 'text-white/70') : 'text-white/40'}>{state[c] ? (SALT[c].ok ? '能反应' : '不反应') : '—'}</span></div>{state[c] && <p className="mt-0.5 text-[12.5px] text-white/60">{SALT[c].see}</p>}</li>)}
          </ul>
        </Panel>
      }
      actions={<LabButton primary pulse={next === 'put'} disabled={busy || !!state[pick]} onClick={() => put.run()}>放入金属丝</LabButton>}
      extras={<Control label="哪一组">
        <Segmented label="哪一组" pulse={next === 'pick'} want={task ?? null} disabled={busy} value={pick} onChange={c => setPick(c as SaltCase)} options={SALT_CASES.map(c => ({ value: c, label: SALT[c].short }))} />
      </Control>}
    />
  )
}
