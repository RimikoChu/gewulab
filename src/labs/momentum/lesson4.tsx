// 动量和碰撞 · 第 4 课 弹性碰撞和非弹性碰撞：冰面上两只 20 kg 的冰壶，A 以 1 m/s 去撞 B。
// 换三种缓冲圈（钢圈、橡胶圈、粘扣带），碰后的速度不一样，总动量都不变，总动能却一个比一个少；最后让两只对撞后粘住，动能全没了。
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import type { Label } from '@/lab-kit'
import { Cone, Foam, Mark, Stone, Vec, useRun, type BandKind, type VecHandle } from './gear'
import { COL, RINK, type V3 } from './layout'
import { LESSONS, goLesson } from './lessons'
import { CLASH, CLASHES, STONE, clashPlan, momentum, pathAt, type ClashKey } from './physics'
import { Pusher } from './props'
import { useSpace, useTrial } from './trial'
import { Ledger, num } from './views'
import { Place } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const KEYS: ClashKey[] = ['elastic', 'partial', 'stick', 'head']
const BAND: Record<ClashKey, BandKind> = { elastic: 'steel', partial: 'rubber', stick: 'velcro', head: 'velcro' }
const BAND_NAME: Record<ClashKey, string> = { elastic: '钢圈', partial: '橡胶圈', stick: '粘扣带', head: '粘扣带' }
const ek = (k: ClashKey) => { const p = clashPlan(k); return `${num(p.ek0, 1)} J → ${num(p.ek1, 2)} J` }
const TASKS: Task[] = [
  { id: 'elastic', text: '套钢圈：让 A 以 1 m/s 去撞静止的 B', note: `A 停住，B 以 1 m/s 走了。动能 ${ek('elastic')}，一点没少：弹性碰撞` },
  { id: 'partial', text: '换成橡胶圈，再撞一次', note: `碰后 ${num(clashPlan('partial').w1)} 和 ${num(clashPlan('partial').w2)} m/s。动量没变，动能 ${ek('partial')}：非弹性碰撞` },
  { id: 'stick', text: '换成粘扣带，让它们粘在一起', note: `粘成一体，以 ${num(clashPlan('stick').w1, 1)} m/s 一起走。动能 ${ek('stick')}，损失最大：完全非弹性碰撞` },
  { id: 'head', text: '两只各以 1 m/s 对撞，粘住', note: `都停下了。总动量本来就是 0，守恒；${num(clashPlan('head').ek0, 0)} J 的动能全部损失了` },
]
const O = RINK.clash, TOPY = STONE.h + 0.075
/** 箭头的比例：速度每 1 m/s、动量每 1 kg·m/s 各画多长（m） */
const KV = 0.5, KP = 0.025

function Rig({ mode, run, onMark, tagA, tagB }: { mode: ClashKey; run: number; onMark: (i: number, last: number) => void; tagA: V3; tagB: V3 }) {
  const p = useMemo(() => clashPlan(mode), [mode]), c = CLASHES[mode]
  const a = useRef<THREE.Group>(null), b = useRef<THREE.Group>(null), ha = useRef<THREE.Group>(null), hb = useRef<THREE.Group>(null)
  const va = useRef<VecHandle>(null), pa = useRef<VecHandle>(null), vb = useRef<VecHandle>(null), pb = useRef<VecHandle>(null)
  useRun(run, t => {
    const A = pathAt(p.a, t), B = pathAt(p.b, t)
    a.current?.position.set(O.x + A.x, 0, O.z); b.current?.position.set(O.x + B.x, 0, O.z)
    const back = Math.min(1, Math.max(0, (t - CLASH.T) / 0.5)) * 0.14
    ha.current?.position.set(O.x + Math.min(A.x, CLASH.startA) - STONE.r - 0.004 - back, 0.07 + back * 0.5, O.z)
    if (hb.current) { hb.current.visible = c.v2 !== 0; hb.current.position.set(O.x + Math.max(B.x, CLASH.startB) + STONE.r + 0.004 + back, 0.07 + back * 0.5, O.z) }
    va.current?.set([O.x + A.x, TOPY + 0.06, O.z], [A.v * KV, 0, 0]); pa.current?.set([O.x + A.x, TOPY + 0.15, O.z], [momentum(STONE.m, A.v) * KP, 0, 0])
    vb.current?.set([O.x + B.x, TOPY + 0.06, O.z], [B.v * KV, 0, 0]); pb.current?.set([O.x + B.x, TOPY + 0.15, O.z], [momentum(STONE.m, B.v) * KP, 0, 0])
    tagA[0] = O.x + A.x; tagB[0] = O.x + B.x
  }, [p.tHit, p.tRec], i => onMark(i, 1))
  return <>
    <group ref={a}><Stone color={COL.A} band={BAND[mode]} /></group>
    <group ref={b} rotation-y={Math.PI}><Stone color={COL.B} band={BAND[mode]} /></group>
    <group ref={ha}><Pusher /></group>
    <group ref={hb} visible={false}><Pusher flip /></group>
    <Vec ref={va} color={COL.v} thick={0.01} /><Vec ref={pa} color={COL.p} thick={0.013} /><Vec ref={vb} color={COL.v} thick={0.01} /><Vec ref={pb} color={COL.p} thick={0.013} />
    {/* 两头的泡棉垫，出发线 */}
    {[-1, 1].map(s => <group key={s} position={[O.x + s * (CLASH.pad + STONE.r + 0.13), 0, O.z]} rotation-y={Math.PI / 2}><Foam len={1.2} color={s < 0 ? '#b5372d' : '#2f6fb8'} /></group>)}
    <group position={[O.x + CLASH.startA, 0, O.z]} rotation-y={Math.PI / 2}><Mark len={0.9} /></group>
    {/* 场边：一只备用的冰壶、两只标志桶 */}
    <group position={[O.x + 1.75, 0, O.z + 0.8]} rotation-y={0.7}><Stone color="#d8a52a" /></group>
    <group position={[O.x + 0.35, 0, O.z - 0.95]}><Cone /></group>
    <group position={[O.x - 1.75, 0, O.z - 0.7]}><Cone /></group>
  </>
}

export default function Lesson4() {
  const L = useTrial<ClashKey>('gewu:momentum:4', TASKS, 'elastic')
  const { mode, stage, rows, task, next, busy } = L, c = CLASHES[mode], p = useMemo(() => clashPlan(mode), [mode]), hit = stage >= 1
  const tagA = useRef<V3>([O.x + CLASH.startA, TOPY + 0.3, O.z]).current, tagB = useRef<V3>([O.x, TOPY + 0.3, O.z]).current
  useSpace(L.go)
  const hint = !task ? '碰撞中动量都守恒；动能不变的叫弹性碰撞，粘在一起的损失最大。'
    : busy ? (hit ? '碰过了：比一比碰前碰后的总动量和总动能…' : '看两只冰壶相碰…')
    : next === 'mode' ? `把碰撞方式换成“${CLASHES[task.id as ClashKey].name}”`
    : next === 'home' ? '按“放回原处”，把冰壶摆回去'
    : mode === 'head' ? '按“推出冰壶”：两只冰壶各以 1 m/s 对撞' : `按“推出冰壶”：A 以 1 m/s 去撞 B（套的是${BAND_NAME[mode]}）`
  const labels: Label[] = [
    { id: 'A', at: tagA, ax: 0.85, className: 'scene-tag -translate-y-full', children: <><small>A · {STONE.m} kg</small>{hit ? `v₁′ = ${num(p.w1)} m/s` : `v₁ = ${num(L.run ? p.v1 : 0, 1)} m/s`}</> },
    { id: 'B', at: tagB, ax: 0.15, className: 'scene-tag -translate-y-full', children: <><small>B · {STONE.m} kg</small>{hit ? `v₂′ = ${num(p.w2)} m/s` : `v₂ = ${num(L.run ? p.v2 : 0, 1)} m/s`}</> },
    { id: 'band', at: [O.x + (c.v2 ? CLASH.startB : 0) + 0.3, 0.08, O.z + 0.25], name: true, className: 'scene-name -translate-y-1/2', children: `缓冲圈：${BAND_NAME[mode]}` },
  ]
  return (
    <LabShell title="动量和碰撞" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={L.T.banner} onReset={L.resetAll} hint={hint} actionsLabel="冰壶"
      stage={<Place at="l4" labels={labels}><Rig key={mode} mode={mode} run={L.run} onMark={L.mark} tagA={tagA} tagB={tagB} /></Place>}
      lesson={<LessonBlock no="4" title="弹性碰撞和非弹性碰撞" concept="碰撞都守恒动量，动能不一定" tasks={TASKS} done={L.T.done} current={task?.id}
        theory={<>
          <p>碰撞的时间很短，相互作用的内力远大于外力，系统的<b className="text-white">动量守恒</b>。动能就不一定了：</p>
          <p className="mt-3"><b className="text-white">弹性碰撞</b>：碰撞前后总动能不变。钢球、台球之间的碰撞接近弹性碰撞。</p>
          <p className="mt-3"><b className="text-white">非弹性碰撞</b>：碰后总动能减少，减少的动能变成了内能（发热、形变）。碰后粘在一起、以同一速度运动的，叫<b className="text-white">完全非弹性碰撞</b>，动能损失最大。</p>
          <p className="mt-3 text-[13.5px] text-white/65">碰后的总动能不会比碰前多。画面上白色箭头是速度，黄色箭头是动量；冰面的摩擦忽略不计。</p>
        </>} />}
      finale={L.T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种碰撞都做过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">碰撞中动量都守恒，动能只有弹性碰撞才不变</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">A 撞静止的 B，总动量始终是 {num(clashPlan('elastic').p0, 0)} kg·m/s。动能：钢圈 {ek('elastic')}，橡胶圈 {ek('partial')}，粘在一起 {ek('stick')}。对撞后粘住，动量 0 → 0，{num(clashPlan('head').ek0, 0)} J 动能全部损失。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => L.T.setFinale(false)}>再撞几次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">损失的动能</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{hit ? num(p.loss) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">J</span></div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">速度、动量和动能（向右为正）</h2>
          <Ledger d={1} md={0} ed={2} bodies={[{ name: 'A', color: COL.A, m: STONE.m, v0: L.run ? p.v1 : null, v1: hit ? p.w1 : null }, { name: 'B', color: COL.B, m: STONE.m, v0: L.run ? p.v2 : null, v1: hit ? p.w2 : null }]} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="e" value={String(c.e)} unit="恢复系数" />
            <ParamTile symbol="ΔEk" value={hit ? `−${num(p.loss)}` : '—'} unit="J" />
          </div>
          {rows.length > 0 && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">记录：总动能</h2>
            <table className="mt-1 w-full text-[13px]"><tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{CLASHES[k].name}</td><td className="text-right font-semibold tabular-nums" style={{ color: clashPlan(k).loss > 1e-9 ? '#ff9a7a' : COL.ok }}>{ek(k)}</td></tr>)}</tbody></table>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={L.go} disabled={busy || L.run !== 0}>推出冰壶</LabButton>
        <LabButton pulse={next === 'home'} onClick={L.home} disabled={busy || L.run === 0}>放回原处</LabButton>
      </>}
      extras={<Control label="碰撞方式"><Segmented label="碰撞方式" pulse={next === 'mode'} want={next === 'mode' ? L.want : null} value={mode} disabled={busy} onChange={L.pick} options={KEYS.map(k => ({ value: k, label: CLASHES[k].name }))} /></Control>}
    />
  )
}
