// 动量和碰撞 · 第 3 课 动量守恒定律：气垫导轨上两只滑块相碰，两只光电门测碰前碰后的遮光时间，算出速度和动量，
// 验证总动量不变；把气量调小，滑块受到阻力（外力不为零），总动量就变小了。滑块的位置由计算核心给的分段运动算出来。
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import type { Label } from '@/lab-kit'
import { AirTrack, Glider, TRACK_Y } from './bench'
import { Vec, useRun, type VecHandle } from './gear'
import { BENCH_Z, COL, ST, TOP, type V3 } from './layout'
import { LESSONS, goLesson } from './lessons'
import { BUMPS, GLIDER, TRACK, bumpPlan, momentum, pathAt, type BumpKey } from './physics'
import { Pusher } from './props'
import { useSpace, useTrial } from './trial'
import { Ledger, num } from './views'
import { Place } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const KEYS: BumpKey[] = ['same', 'heavy', 'head', 'drag']
const tot = (k: BumpKey) => `${num(bumpPlan(k).p0, 3)} → ${num(bumpPlan(k).p1, 3)}`
const TASKS: Task[] = [
  { id: 'same', text: '质量相等：推出滑块 A，去撞静止的 B', note: `A 停住，B 以同样的速度走了：总动量 ${tot('same')} kg·m/s，没有变` },
  { id: 'heavy', text: '给 A 加上配重（0.3 kg），再撞一次', note: `碰后两只都向右：总动量 ${tot('heavy')} kg·m/s，还是不变` },
  { id: 'head', text: '让两只滑块相向运动，对撞', note: '碰前碰后总动量都是 0：动量是矢量，方向相反的要相减' },
  { id: 'drag', text: '把气量调小，再做一次', note: `滑块蹭着导轨，受到阻力：总动量 ${tot('drag')} kg·m/s，不守恒了` },
]
const X0 = ST.track
/** 箭头的比例：速度每 1 m/s、动量每 1 kg·m/s 各画多长（m） */
const KV = 0.22, KP = 1.1
/** 这一次的全部节点：各次过光电门、相碰、可以记录，按时间排好 */
function events(k: BumpKey) {
  const p = bumpPlan(k)
  const ev = [...p.gates.map((g, i) => ({ t: g.t, gate: i })), { t: p.tHit, gate: -1 }, { t: p.tRec, gate: -2 }].sort((a, b) => a.t - b.t)
  return { p, ev }
}

function Rig({ mode, run, onMark, ms, tagA, tagB }: { mode: BumpKey; run: number; onMark: (i: number, last: number) => void; ms: [string, string]; tagA: V3; tagB: V3 }) {
  const { p, ev } = useMemo(() => events(mode), [mode]), c = BUMPS[mode]
  const a = useRef<THREE.Group>(null), b = useRef<THREE.Group>(null), ha = useRef<THREE.Group>(null), hb = useRef<THREE.Group>(null)
  const va = useRef<VecHandle>(null), pa = useRef<VecHandle>(null), vb = useRef<VecHandle>(null), pb = useRef<VecHandle>(null)
  const marks = useMemo(() => ev.map(e => e.t), [ev])
  useRun(run, t => {
    const A = pathAt(p.a, t), B = pathAt(p.b, t), y = TRACK_Y.top
    a.current?.position.set(A.x, 0, 0); b.current?.position.set(B.x, 0, 0)
    // 手：推到出手的位置就停下，然后收回一点
    const back = Math.min(1, Math.max(0, (t - TRACK.T) / 0.4)) * 0.05
    ha.current?.position.set(Math.min(A.x, TRACK.startA) - GLIDER.len / 2 - 0.004 - back, TRACK_Y.ridge + 0.012 + back * 0.6, 0)
    if (hb.current) { hb.current.visible = c.v2 !== 0; hb.current.position.set(Math.max(B.x, TRACK.startB) + GLIDER.len / 2 + 0.004 + back, TRACK_Y.ridge + 0.012 + back * 0.6, 0) }
    va.current?.set([A.x, y + 0.035, 0], [A.v * KV, 0, 0]); pa.current?.set([A.x, y + 0.07, 0], [momentum(c.m1, A.v) * KP, 0, 0])
    vb.current?.set([B.x, y + 0.035, 0], [B.v * KV, 0, 0]); pb.current?.set([B.x, y + 0.07, 0], [momentum(c.m2, B.v) * KP, 0, 0])
    tagA[0] = X0 + A.x; tagB[0] = X0 + B.x
  }, marks, i => onMark(i, marks.length - 1))
  return <AirTrack ms={ms}>
    <group ref={a}><Glider color={COL.A} extra={c.m1 > GLIDER.m ? 1 : 0} /></group>
    <group ref={b}><Glider color={COL.B} /></group>
    <group ref={ha}><Pusher /></group>
    <group ref={hb} visible={false}><Pusher flip /></group>
    <Vec ref={va} color={COL.v} thick={0.0035} /><Vec ref={pa} color={COL.p} thick={0.0045} /><Vec ref={vb} color={COL.v} thick={0.0035} /><Vec ref={pb} color={COL.p} thick={0.0045} />
  </AirTrack>
}

export default function Lesson3() {
  const L = useTrial<BumpKey>('gewu:momentum:3', TASKS, 'same')
  const { mode, stage, rows, task, next, busy } = L, c = BUMPS[mode]
  const { p, ev } = useMemo(() => events(mode), [mode])
  const seen = ev.slice(0, stage), hit = seen.some(e => e.gate === -1), rec = seen.some(e => e.gate === -2)
  const got = seen.filter(e => e.gate >= 0).map(e => p.gates[e.gate])
  const last = (g: 'A' | 'B') => { const r = [...got].reverse().find(x => x.gate === g); return r ? r.ms.toFixed(1) : '0.0' }
  const read = (who: 1 | 2, after: boolean) => got.find(g => g.who === who && g.after === after)?.v
  // 表里的速度：过了光电门才有；没动的滑块是 0；碰后一直没过光电门的，到记录时按 0 记（它停在原地）
  const v10 = read(1, false) ?? null, v20 = c.v2 === 0 ? 0 : read(2, false) ?? null
  const v11 = read(1, true) ?? (rec ? p.w1 : null), v21 = read(2, true) ?? (rec ? p.w2 : null)
  const tagA = useRef<V3>([X0 + TRACK.startA, TOP + TRACK_Y.top + 0.12, BENCH_Z]).current, tagB = useRef<V3>([X0 + TRACK.restB, TOP + TRACK_Y.top + 0.12, BENCH_Z]).current
  useSpace(L.go)
  const hint = !task ? '系统不受外力，或者所受外力的矢量和为 0，总动量保持不变。'
    : busy ? (hit ? '碰过了：读计时器上碰后的遮光时间…' : '看滑块过光电门时计时器的读数…')
    : next === 'mode' ? `把条件换成“${BUMPS[task.id as BumpKey].name}”`
    : next === 'home' ? '按“放回原处”，把滑块摆回去'
    : mode === 'head' ? '按“推出滑块”：两只手同时把两只滑块推向中间' : '按“推出滑块”：把滑块 A 推向静止的 B'
  const labels: Label[] = [
    { id: 'A', at: tagA, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>A · {c.m1} kg</small>{hit ? `p₁′ = ${num(v11 == null ? null : momentum(c.m1, v11), 3)}` : `p₁ = ${num(v10 == null ? null : momentum(c.m1, v10), 3)}`}</> },
    { id: 'B', at: tagB, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>B · {c.m2} kg</small>{hit ? `p₂′ = ${num(v21 == null ? null : momentum(c.m2, v21), 3)}` : `p₂ = ${num(v20 == null ? null : momentum(c.m2, v20), 3)}`}</> },
    { id: 'g1', at: [X0 + TRACK.gateA, TOP + 0.03, BENCH_Z + 0.09], ax: 0.5, name: true, className: 'scene-name', children: '光电门 1' },
    { id: 'g2', at: [X0 + TRACK.gateB, TOP + 0.03, BENCH_Z + 0.09], ax: 0.5, name: true, className: 'scene-name', children: '光电门 2' },
    { id: 'timer', at: [X0 + 0.56, TOP + 0.26, BENCH_Z - 0.3], name: true, className: 'scene-name -translate-y-1/2', children: '数字计时器（ms）' },
    { id: 'air', at: [X0 - 0.86, TOP + 0.17, BENCH_Z - 0.3], ax: 0.5, name: !(mode === 'drag'), className: 'scene-name -translate-y-full', children: mode === 'drag' ? '气源 · 气量调小了' : '气源' },
  ]
  return (
    <LabShell title="动量和碰撞" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={L.T.banner} onReset={L.resetAll} hint={hint} actionsLabel="滑块"
      stage={<Place at="l3" cur="track" labels={labels}><group position={[X0, TOP, BENCH_Z]}><Rig key={mode} mode={mode} run={L.run} onMark={L.mark} ms={[last('A'), last('B')]} tagA={tagA} tagB={tagB} /></group></Place>}
      lesson={<LessonBlock no="3" title="动量守恒定律" concept="不受外力，系统的总动量不变" tasks={TASKS} done={L.T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">动量守恒定律</b>：如果一个系统不受外力，或者所受外力的矢量和为 0，这个系统的总动量保持不变。m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′。</p>
          <p className="mt-3">气垫导轨喷出的气把滑块托起来，摩擦小到可以忽略；重力和支持力抵消。两只滑块组成的系统在水平方向不受外力，碰撞时它们互相推的力是<b className="text-white">内力</b>，不改变总动量。</p>
          <p className="mt-3">测速度的办法：遮光条宽 d = {GLIDER.flag * 100} cm，过光电门时挡住光的时间是 t，速度 v = d / t。向右为正，向左走的速度记成负的。</p>
          <p className="mt-3 text-[13.5px] text-white/65">气量不足时滑块蹭着导轨，阻力是外力，总动量就不守恒了。实验前要把导轨调平、气量调够。</p>
        </>} />}
      finale={L.T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四组数据都测完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">系统不受外力，总动量保持不变</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">前三组碰前碰后的总动量都相等（{tot('same')}、{tot('heavy')}、0 → 0 kg·m/s）。气量不足时有阻力这个外力，总动量从 {num(bumpPlan('drag').p0, 3)} 掉到 {num(bumpPlan('drag').p1, 3)}：守恒是有条件的。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => L.T.setFinale(false)}>再做几次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center"><div className="font-formula text-[17px] italic text-white/65">m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′</div></div>
          <h2 className="mt-3 text-[12.5px] text-white/55">遮光时间（d = {GLIDER.flag * 100} cm，v = d / t）</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="t₁" value={last('A')} unit="ms · 光电门 1" />
            <ParamTile symbol="t₂" value={last('B')} unit="ms · 光电门 2" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">速度和动量（向右为正）</h2>
          <Ledger d={3} ek={false} bodies={[{ name: 'A', color: COL.A, m: c.m1, v0: v10, v1: v11 }, { name: 'B', color: COL.B, m: c.m2, v0: v20, v1: v21 }]} />
          {rows.length > 0 && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">记录：总动量 / (kg·m/s)</h2>
            <table className="mt-1 w-full text-[13px]"><tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{BUMPS[k].name}</td><td className="text-right font-semibold tabular-nums" style={{ color: k === 'drag' ? '#ff9a7a' : COL.ok }}>{tot(k)}</td></tr>)}</tbody></table>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={L.go} disabled={busy || L.run !== 0}>推出滑块</LabButton>
        <LabButton pulse={next === 'home'} onClick={L.home} disabled={busy || L.run === 0}>放回原处</LabButton>
      </>}
      extras={<Control label="条件"><Segmented label="条件" pulse={next === 'mode'} want={next === 'mode' ? L.want : null} value={mode} disabled={busy} onChange={L.pick} options={KEYS.map(k => ({ value: k, label: BUMPS[k].name }))} /></Control>}
    />
  )
}
