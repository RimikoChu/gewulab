// 动量和碰撞 · 拓展：冰面上的三个小实验，都在一圈泡棉围栏里。
// 弹开：两只冰壶之间压着弹簧，细线一断各奔一边；长板和小车：小车在板上往前开，板在冰上往后退（“人船模型”）；
// 斜碰：冰球擦着边撞另一只，两只分开成直角，动量按矢量相加还是守恒。每个专题有两种做法，各做一次。
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Foam, HockeyStick, Mark, Puck, Stone, Vec, useRun, type VecHandle } from './gear'
import { COL, RINK, type V3 } from './layout'
import { LESSONS, goLesson } from './lessons'
import { BOAT, BURST, GLANCE, PUCK, STONE, boat, boatAt, burstPlan, glancePlan, momentum, pathAt } from './physics'
import { BOARD_Y, Board, Car, Spring } from './props'
import { Ledger, VecPlot, num } from './views'
import { Place } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Sub = 'burst' | 'boat' | 'glance'
const ORDER: Sub[] = ['burst', 'boat', 'glance']
const SUBS: Record<Sub, { name: string; a: string; b: string; title: string; say: string }> = {
  burst: { name: '弹开', a: '两只一样重', b: '一只轻一半', title: '弹开后，两个动量大小相等、方向相反',
    say: '两只冰壶原来静止，总动量是 0。细线一断，弹簧把它们推开，弹簧的力是内力，总动量还是 0：m₁v₁ = m₂v₂。质量小的那只跑得快，分到的动能也多。爆炸、原子核的衰变也是这样：碎片的动量加起来等于原来的动量。' },
  boat: { name: '长板和小车', a: '1 kg 的小车', b: '2 kg 的小车', title: '小车往前走，长板往后退',
    say: '这就是“人船模型”：人在船上往前走，船往后退。系统原来静止，水平方向不受外力，任何时刻都有 mv₁ = Mv₂，所以走过的距离也满足 m·x₁ = M·x₂；两段距离加起来等于小车在板上走过的长度 d。小车越重，板退得越多。' },
  glance: { name: '斜碰', a: '正碰', b: '斜碰', title: '平面上的碰撞，动量按矢量相加也守恒',
    say: '两球的速度不在一条直线上时，动量守恒要按矢量来算：把碰后两个动量首尾相接，正好等于碰前的动量。质量相等的弹性碰撞，一动一静，斜碰以后两球的运动方向互相垂直。' },
}
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：“${SUBS[k].a}”和“${SUBS[k].b}”各做一次`, note: SUBS[k].title }))
const O = RINK.pen
type RigProps = { alt: boolean; run: number; onMark: (i: number, last: number) => void }

/** 弹开：A 向左、B 向右 */
function BurstRig({ alt, run, onMark, tagA, tagB }: RigProps & { tagA: V3; tagB: V3 }) {
  const p = useMemo(() => burstPlan(alt), [alt]), size = alt ? 0.8 : 1
  const a = useRef<THREE.Group>(null), b = useRef<THREE.Group>(null), sp = useRef<THREE.Group>(null), len = useRef(0.1)
  const va = useRef<VecHandle>(null), pa = useRef<VecHandle>(null), vb = useRef<VecHandle>(null), pb = useRef<VecHandle>(null)
  useRun(run, t => {
    const A = pathAt(p.a, t), B = pathAt(p.b, t), y = STONE.h + 0.13
    a.current?.position.set(O.x + A.x, 0, O.z); b.current?.position.set(O.x + B.x, 0, O.z)
    // 弹簧：压在两只冰壶之间，伸到原长（0.3 m）就留在原地
    const free = Math.min(0.3, (B.x - STONE.r * size) - (A.x + STONE.r))
    len.current = free; sp.current?.position.set(O.x + (free < 0.3 ? (A.x + STONE.r + B.x - STONE.r * size) / 2 : (STONE.r - STONE.r * size) / 2), 0.062, O.z)
    va.current?.set([O.x + A.x, y, O.z], [A.v * 0.6, 0, 0]); pa.current?.set([O.x + A.x, y + 0.09, O.z], [momentum(p.m1, A.v) * 0.06, 0, 0])
    vb.current?.set([O.x + B.x, y, O.z], [B.v * 0.6, 0, 0]); pb.current?.set([O.x + B.x, y + 0.09, O.z], [momentum(p.m2, B.v) * 0.06, 0, 0])
    tagA[0] = O.x + A.x; tagB[0] = O.x + B.x
  }, [BURST.T, p.tRec], i => onMark(i, 1))
  return <>
    <group ref={a}><Stone color={COL.A} band="steel" /></group>
    <group ref={b} rotation-y={Math.PI}><Stone color={COL.B} band="steel" size={size} /></group>
    <group ref={sp}><Spring len={len} /></group>
    {/* 捆住两只冰壶的细线：一断就不见了 */}
    {run === 0 && <mesh position={[O.x + (STONE.r - STONE.r * size) / 2 * 0, 0.1, O.z + 0.02]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.003, 0.003, BURST.gap + 0.12, 6]} /><meshStandardMaterial color="#c2362c" roughness={0.8} /></mesh>}
    <Vec ref={va} color={COL.v} thick={0.011} /><Vec ref={pa} color={COL.p} thick={0.015} /><Vec ref={vb} color={COL.v} thick={0.011} /><Vec ref={pb} color={COL.p} thick={0.015} />
    {[-1, 1].map(s => <group key={s} position={[O.x + s * (BURST.pad + STONE.r + 0.13), 0, O.z]} rotation-y={Math.PI / 2}><Foam len={1.1} color={s < 0 ? '#b5372d' : '#2f6fb8'} /></group>)}
  </>
}

/** 长板和小车 */
function BoatRig({ alt, run, onMark, tagA, tagB }: RigProps & { tagA: V3; tagB: V3 }) {
  const m = alt ? BOAT.heavy : BOAT.light
  const board = useRef<THREE.Group>(null), car = useRef<THREE.Group>(null), spin = useRef(0), prev = useRef({ c: -BOAT.d / 2, b: 0 })
  const pc = useRef<VecHandle>(null), pb = useRef<VecHandle>(null)
  useRun(run, (t, dt) => {
    const q = boatAt(m, t), vc = dt > 0 ? (q.car - prev.current.c) / dt : 0, vb = dt > 0 ? (q.board - prev.current.b) / dt : 0
    prev.current = { c: q.car, b: q.board }; spin.current = q.s
    board.current?.position.set(O.x + q.board, 0, O.z); car.current?.position.set(O.x + q.car, BOARD_Y, O.z)
    pc.current?.set([O.x + q.car, 0.25, O.z], [momentum(m, vc) * 1.1, 0, 0]); pb.current?.set([O.x + q.board, 0.1, O.z + 0.2], [momentum(BOAT.M, vb) * 1.1, 0, 0])
    tagA[0] = O.x + q.car; tagB[0] = O.x + q.board - 0.6
  }, [boatAt(m, 0).T + 0.4], i => onMark(i, 0))
  return <>
    <group ref={board}><Board /></group>
    <group ref={car}><Car heavy={alt} spin={spin} /></group>
    <Vec ref={pc} color={COL.p} thick={0.011} /><Vec ref={pb} color={COL.p} thick={0.011} />
    {/* 冰面上的标线：板两头原来的位置、小车原来的位置 */}
    {[-BOAT.L / 2, BOAT.L / 2].map(x => <group key={x} position={[O.x + x, 0, O.z + 0.32]} rotation-y={Math.PI / 2}><Mark len={0.3} /></group>)}
    <group position={[O.x - BOAT.d / 2, 0, O.z - 0.3]} rotation-y={Math.PI / 2}><Mark len={0.24} color="#ffffff" /></group>
  </>
}

/** 冰球放大到几倍画（界面上写明） */
const BIG = 2.2
const OCT = Array.from({ length: 8 }, (_, i) => i * Math.PI / 4).filter(a => Math.abs(a - Math.PI) > 0.1)
/** 斜碰：A 从左边过来，B 静止在中间 */
function GlanceRig({ alt, run, onMark, tagA, tagB }: RigProps & { tagA: V3; tagB: V3 }) {
  const p = useMemo(() => glancePlan(alt, PUCK.r * BIG), [alt])
  const a = useRef<THREE.Group>(null), b = useRef<THREE.Group>(null), stick = useRef<THREE.Group>(null)
  const pa = useRef<VecHandle>(null), pb = useRef<VecHandle>(null), K = 3
  useRun(run, t => {
    const q = p.at(t)
    a.current?.position.set(O.x + q.a.x, 0, O.z + q.a.z); b.current?.position.set(O.x + q.b.x, 0, O.z + q.b.z)
    stick.current?.position.set(O.x + Math.min(q.a.x, t > p.tHit ? GLANCE.start + 0.15 : q.a.x, GLANCE.start + 0.15) - PUCK.r * BIG, 0, O.z + p.at(0).a.z)
    pa.current?.set([O.x + q.a.x, 0.12, O.z + q.a.z], [momentum(PUCK.m, q.a.vx) * K, 0, momentum(PUCK.m, q.a.vz) * K])
    pb.current?.set([O.x + q.b.x, 0.12, O.z + q.b.z], [momentum(PUCK.m, q.b.vx) * K, 0, momentum(PUCK.m, q.b.vz) * K])
    tagA[0] = O.x + q.a.x; tagA[2] = O.z + q.a.z; tagB[0] = O.x + q.b.x; tagB[2] = O.z + q.b.z
  }, [p.tHit, p.tRec], i => onMark(i, 1))
  return <>
    <group ref={a}><Puck color={COL.A} size={BIG} /></group>
    <group ref={b}><Puck color={COL.B} size={BIG} /></group>
    <group ref={stick}><HockeyStick /></group>
    <Vec ref={pa} color={COL.p} thick={0.012} /><Vec ref={pb} color={COL.p} thick={0.012} />
    {OCT.map(ang => <group key={ang} position={[O.x + Math.cos(ang) * 1.38, 0, O.z + Math.sin(ang) * 1.38]} rotation-y={Math.PI / 2 - ang}><Foam len={1.1} color={Math.cos(ang) > 0.5 ? '#2f6fb8' : '#b5372d'} h={0.22} /></group>)}
  </>
}

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('burst')
  const [alt, setAlt] = useState(false)
  const [run, setRun] = useState(0), id = useRef(0)
  const [busy, setBusy] = useState(false), [stage, setStage] = useState(0)
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:momentum:x', TASKS)
  const S = SUBS[sub], key = (s: Sub, b: boolean) => `${s}:${b ? 'b' : 'a'}`, did = (b: boolean) => rows.includes(key(sub, b))
  const go = (b: boolean) => { if (busy) return; setAlt(b); setStage(0); setBusy(true); setRun(++id.current) }
  const mark = (i: number, last: number) => {
    setStage(i + 1); if (i < last) return
    setBusy(false); const k = key(sub, alt), next = rows.includes(k) ? rows : [...rows, k]; setRows(next); T.check(s => next.includes(`${s}:a`) && next.includes(`${s}:b`))
  }
  const pick = (k: Sub) => { if (busy) return; setSub(k); setAlt(false); setRun(0); setStage(0) }
  const resetAll = () => { setSub('burst'); setAlt(false); setRun(0); setBusy(false); setStage(0); setRows([]); T.reset() }
  const task = T.current, done = run !== 0 && !busy
  const next: 'sub' | 'a' | 'b' | null = !task || busy ? null : sub !== task.id ? 'sub' : !did(false) ? 'a' : 'b'
  const hint = !task ? '三个专题都做过了，可以换着再看。'
    : busy ? (sub === 'burst' ? '细线断了，看两只冰壶各往哪边走、谁快…' : sub === 'boat' ? '小车往前开，看长板往哪边动…' : '看碰后两只冰球各往哪边走…')
    : next === 'sub' ? `换到“${SUBS[task.id as Sub].name}”`
    : `按“${next === 'a' ? S.a : S.b}”，做一次`
  const tagA = useRef<V3>([O.x, 0.6, O.z]).current, tagB = useRef<V3>([O.x, 0.6, O.z]).current
  const bp = useMemo(() => burstPlan(alt), [alt]), m = alt ? BOAT.heavy : BOAT.light, bt = boat(m, BOAT.M, BOAT.d), gp = useMemo(() => glancePlan(alt), [alt])
  const after = sub === 'boat' ? done : stage >= 1
  tagA[1] = tagB[1] = sub === 'burst' ? 0.5 : sub === 'boat' ? 0.36 : 0.22
  const labels: Label[] = sub === 'burst' ? [
    { id: 'A', at: tagA, ax: 0.9, className: 'scene-tag -translate-y-full', children: <><small>A · {bp.m1} kg</small>{after ? `${num(-bp.v1)} m/s` : '静止'}</> },
    { id: 'B', at: tagB, ax: 0.1, className: 'scene-tag -translate-y-full', children: <><small>B · {bp.m2} kg</small>{after ? `${num(bp.v2)} m/s` : '静止'}</> },
    { id: 'sp', at: [O.x, 0.02, O.z + 0.3], ax: 0.5, name: true, className: 'scene-name', children: '压缩的弹簧，用细线捆着' },
  ] : sub === 'boat' ? [
    { id: 'A', at: tagA, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>小车 · {m} kg</small>{done ? `前进 ${num(bt.fwd)} m` : '向右开'}</> },
    { id: 'B', at: tagB, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>长板 · {BOAT.M} kg</small>{done ? `后退 ${num(bt.back)} m` : busy ? '向左退' : '静止'}</> },
    { id: 'mk', at: [O.x + BOAT.L / 2, 0.02, O.z + 0.5], ax: 0.5, name: true, className: 'scene-name', children: '黄线：板两头原来的位置' },
  ] : [
    { id: 'A', at: tagA, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>A</small>{after ? `${num(gp.v1)} m/s` : `${num(GLANCE.v, 1)} m/s`}</> },
    { id: 'B', at: tagB, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>B</small>{after ? `${num(gp.v2)} m/s` : '静止'}</> },
    { id: 'big', at: [O.x + 0.2, 0.02, O.z + 0.75], ax: 0.5, name: true, className: 'scene-name', children: `冰球 · ${PUCK.m} kg（放大了画，示意大小）` },
  ]
  const mp = momentum(PUCK.m, 1)
  return (
    <LabShell title="动量和碰撞" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={S.name}
      stage={sub === 'burst' ? <Place at="xa" labels={labels}><BurstRig alt={alt} run={run} onMark={mark} tagA={tagA} tagB={tagB} /></Place>
        : sub === 'boat' ? <Place at="xb" labels={labels}><BoatRig alt={alt} run={run} onMark={mark} tagA={tagA} tagB={tagB} /></Place>
        : <Place at="xc" labels={labels}><GlanceRig alt={alt} run={run} onMark={mark} tagA={tagA} tagB={tagB} /></Place>}
      lesson={<LessonBlock no="拓展" title="弹开 · 长板和小车 · 斜碰" concept={S.title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{S.say}</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个专题都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">弹开、人在船上走、斜着碰，系统的总动量都不变</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">原来静止的系统，分开以后两部分的动量大小相等、方向相反，质量小的走得快、走得远。不在一条直线上的碰撞，动量按矢量相加守恒。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{sub === 'burst' ? '弹开后两只冰壶的速度之比' : sub === 'boat' ? '长板后退的距离' : '碰后两球运动方向的夹角'}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">
              {sub === 'burst' ? (after ? `1 : ${num(bp.v2 / bp.v1, 0)}` : '—') : sub === 'boat' ? (done ? num(bt.back) : '—') : after ? (alt ? gp.a1 - gp.a2 : 0) : '—'}
              <span className="ml-1 text-[15px] font-medium text-white/55">{sub === 'boat' ? 'm' : sub === 'glance' ? '°' : ''}</span>
            </div>
          </div>
          {sub === 'burst' && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">弹开前后（向右为正）</h2>
            <Ledger d={1} md={0} heads={['弹开前', '弹开后']} bodies={[{ name: 'A', color: COL.A, m: bp.m1, v0: 0, v1: after ? -bp.v1 : null }, { name: 'B', color: COL.B, m: bp.m2, v0: 0, v1: after ? bp.v2 : null }]} />
            <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">多出来的 {BURST.E} J 动能，是弹簧的弹性势能变来的。</p>
          </>}
          {sub === 'boat' && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">m · x₁ = M · x₂，x₁ + x₂ = d</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <ParamTile symbol="m" value={String(m)} unit="kg · 小车" /><ParamTile symbol="M" value={String(BOAT.M)} unit="kg · 长板" /><ParamTile symbol="d" value={String(BOAT.d)} unit="m · 车在板上走的" />
              <ParamTile symbol="x₁" value={done ? num(bt.fwd) : '—'} unit="m · 小车前进" /><ParamTile symbol="x₂" value={done ? num(bt.back) : '—'} unit="m · 长板后退" /><ParamTile symbol="mx₁" value={done ? num(m * bt.fwd) : '—'} unit={`Mx₂ = ${done ? num(BOAT.M * bt.back) : '—'}`} />
            </div>
          </>}
          {sub === 'glance' && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">动量的矢量图（从上往下看）</h2>
            <VecPlot max={mp * GLANCE.v} p0={[mp * GLANCE.v, 0]} pa={after ? [mp * gp.ua[0], -mp * gp.ua[1]] : null} pb={after ? [mp * gp.ub[0], -mp * gp.ub[1]] : null} />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <ParamTile symbol="v" value={num(GLANCE.v, 1)} unit="m/s · A 碰前" /><ParamTile symbol="v₁′" value={after ? num(gp.v1) : '—'} unit="m/s · A 碰后" /><ParamTile symbol="v₂′" value={after ? num(gp.v2) : '—'} unit="m/s · B 碰后" />
            </div>
          </>}
          <h2 className="mt-4 text-[12.5px] text-white/55">做过的</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
            {[false, true].map(b => <div key={String(b)} className={`rounded-xl px-3 py-2 ${did(b) ? 'bg-[#35c7b3]/20 text-white' : 'bg-white/6 text-white/50'}`}>{b ? S.b : S.a}{did(b) ? ' · 做过了' : ''}</div>)}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next !== 'b'} pulse={next === 'a'} onClick={() => go(false)} disabled={busy}>{S.a}</LabButton>
        <LabButton primary={next === 'b'} pulse={next === 'b'} onClick={() => go(true)} disabled={busy}>{S.b}</LabButton>
      </>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} disabled={busy} onChange={pick} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
