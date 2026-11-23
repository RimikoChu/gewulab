// 力和运动 · 拓展课：三个小专题。同一直线上两个力的合力（两根推杆同向、反向推冰壶）；冰壶比赛为什么要擦冰；滚动代替滑动为什么省力。
// 每个专题两个按钮，做一次对比。数都从计算核心取。
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Broom, Force, Place, Spares, Stick, Stone, TIP, useRun, type V3 } from './gear'
import { DragRig, DragStage, dragP } from './lesson7'
import { LESSONS, goLesson } from './lessons'
import { COMBO, STONE, SWEEP, comboShove, friction, glideAt, resultant, rolling, shoveAt, sweepDist, sweepTime, tipSquash } from './physics'
import { ScaleView } from './views'
import { HOUSE, LANE, M, RINK, U } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Sub = 'sum' | 'sweep' | 'roll'
const SUBS: Record<Sub, { name: string; title: string; a: string; b: string; say: string }> = {
  sum: { name: '二力的合成', title: '同向相加，反向相减', a: '同向推', b: '反向推', say: `两根推杆沿同一直线推冰壶，一根 ${COMBO.F1} N，一根 ${COMBO.F2} N。方向相同时，合力是 ${resultant(COMBO.F1, COMBO.F2, true)} N；方向相反时，合力只有 ${resultant(COMBO.F1, COMBO.F2, false)} N，方向跟较大的那个力相同。合力就是和这两个力共同作用效果相同的那一个力。` },
  sweep: { name: '擦冰', title: '接触面更光滑，摩擦力更小', a: '不擦冰', b: '擦冰', say: `冰刷在冰壶前面快速擦冰，冰面的最上一层受热变得更滑，冰壶受到的摩擦力变小，速度减小得更慢，就能滑得更远。同样以 ${SWEEP.v} m/s 出手，不擦冰滑 ${sweepDist(false).toFixed(2)} m，一路擦冰滑 ${sweepDist(true).toFixed(2)} m。运动员就是靠擦与不擦来控制冰壶停在哪里。` },
  roll: { name: '滚动代替滑动', title: '滚动时的阻力比滑动小得多', a: '直接拖', b: '垫上圆铅笔', say: `同一个木块，直接在木板上拖要 ${friction('base').toFixed(2)} N；在下面垫几根圆铅笔，让它滚着走，只要约 ${rolling().toFixed(2)} N。用滚动代替滑动可以大大减小摩擦：行李箱装轮子、机器里用滚动轴承，都是这个办法。` },
}
const ORDER: Sub[] = ['sum', 'sweep', 'roll']
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：“${SUBS[k].a}”和“${SUBS[k].b}”各做一次`, note: SUBS[k].title }))
const X0 = RINK.push, R = STONE.r * M, Y = TIP.y * U
const PER = 0.9          // 力的箭头：每 10 N 画多长

/** 二力的合成：两根推杆推同一只冰壶。same：同向（都从后面推）；否则第二根从前面顶着 */
function SumRig({ same, run, onEnd }: { same: boolean; run: number; onEnd: () => void }) {
  const s = comboShove(same), z = 0.42, edge = Math.sqrt(R * R - z * z)
  const stone = useRef<THREE.Group>(null), k1 = useRef<THREE.Group>(null), k2 = useRef<THREE.Group>(null), sum = useRef<THREE.Group>(null)
  const q1 = useRef(0), q2 = useRef(0), cur = useRef(0)
  useRun(run, s.tEnd + 0.4, (t, dt) => {
    const k = shoveAt(s, t)
    cur.current = run === 0 ? cur.current + (0 - cur.current) * (1 - Math.exp(-dt / 0.18)) : k.x * M
    const e = 1 - Math.exp(-dt / 0.05), on = k.pushing ? 1 : 0
    q1.current += (on * tipSquash(COMBO.F1) * M - q1.current) * e; q2.current += (on * tipSquash(COMBO.F2) * M - q2.current) * e
    const x = X0 + cur.current, px = X0 + (run === 0 ? cur.current : Math.min(k.x, s.d1) * M)
    stone.current?.position.set(x, 0, LANE)
    k1.current?.position.set(px - edge, Y, LANE + z); k2.current?.position.set(same ? px - edge : px + edge, Y, LANE - z)
    sum.current?.position.set(x, 2.7, LANE); if (sum.current) sum.current.visible = run === 0 ? Math.abs(cur.current) < 0.05 : k.pushing
  }, onEnd)
  return <>
    <group ref={stone} position={[X0, 0, LANE]}><Stone /></group>
    <group ref={k1}><Stick squash={q1} />{<Force from={[0, 0.9, 0]} dir={[1, 0, 0]} len={COMBO.F1 / 10 * PER} color="#ffd24a" thick={1.1} />}</group>
    <group ref={k2}><group rotation-y={same ? 0 : Math.PI}><Stick squash={q2} /></group><Force from={[0, 0.9, 0]} dir={[same ? 1 : -1, 0, 0]} len={COMBO.F2 / 10 * PER} color="#7fd0ff" thick={1.1} /></group>
    <group ref={sum}><Force from={[0, 0, 0]} dir={[1, 0, 0]} len={s.F / 10 * PER} color="#ff7a59" thick={1.3} /></group>
  </>
}

/** 擦冰那一段的出发点：一路擦冰时，冰壶正好停在大本营的圆心 */
const XS = HOUSE - sweepDist(true) * M
/** 擦冰：冰壶以同样的速度出手。swept：冰刷在它前面一路擦 */
function SweepRig({ swept, run, onEnd }: { swept: boolean; run: number; onEnd: () => void }) {
  const mu = swept ? SWEEP.swept : SWEEP.mu
  const stone = useRef<THREE.Group>(null), broom = useRef<THREE.Group>(null), cur = useRef(0), idle = useRef(0)
  useRun(run, sweepTime(swept) + 0.5, (t, dt) => {
    const going = run > 0 && t < sweepTime(swept)
    cur.current = run === 0 ? cur.current + (0 - cur.current) * (1 - Math.exp(-dt / 0.22)) : glideAt(SWEEP.v, mu, t) * M
    stone.current?.position.set(XS + cur.current, 0, LANE)
    // 冰刷：擦的时候在壶前面半米处来回刷；不擦就靠在一旁
    const b = broom.current; if (!b) return
    if (swept && going) b.position.set(XS + cur.current + 0.55 * M, 0, LANE + Math.sin(t * 26) * 0.9)
    else b.position.set(XS + cur.current + 0.55 * M, 0, LANE + 3.6)
    idle.current = 0
  }, onEnd)
  return <>
    <group ref={stone} position={[XS, 0, LANE]}><Stone /></group>
    <group ref={broom} rotation-y={-Math.PI / 2 + 0.5}><Broom /></group>
    <group position={[XS - R, Y, LANE]}><Stick squash={idle} /></group>
  </>
}

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('sum')
  const [alt, setAlt] = useState(false)                    // 现在做的是每个专题里的第二种做法吗
  const [run, setRun] = useState(0), n = useRef(0), timer = useRef(0)
  const [busy, setBusy] = useState(false), [seen, setSeen] = useState(false)
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:force:x', TASKS)
  useEffect(() => () => clearTimeout(timer.current), [])
  const S = SUBS[sub], key = (s: Sub, b: boolean) => `${s}:${b ? 'b' : 'a'}`
  // 每次先摆回起点，再开始
  const start = (b: boolean) => { if (busy) return; const moved = run !== 0; setBusy(true); setSeen(false); setAlt(b); setRun(0); timer.current = window.setTimeout(() => setRun(++n.current), moved || b !== alt ? 1100 : 60) }
  const ended = () => { setBusy(false); setSeen(true); const k = key(sub, alt), next = rows.includes(k) ? rows : [...rows, k]; setRows(next); T.check(id => next.includes(`${id}:a`) && next.includes(`${id}:b`)) }
  const pick = (k: Sub) => { if (busy) return; clearTimeout(timer.current); setSub(k); setAlt(false); setRun(0); setSeen(false) }
  const resetAll = () => { clearTimeout(timer.current); setSub('sum'); setAlt(false); setRun(0); setBusy(false); setSeen(false); setRows([]); T.reset() }
  const task = T.current, did = (b: boolean) => rows.includes(key(sub, b))
  const { hint, next }: { hint: string; next: 'sub' | 'a' | 'b' | null } = !task ? { hint: '三个专题都做过了，可以换着再看。', next: null }
    : busy ? { hint: '看它怎样动…', next: null }
    : sub !== task.id ? { hint: `换到“${SUBS[task.id as Sub].name}”`, next: 'sub' }
    : !did(false) ? { hint: `按“${S.a}”`, next: 'a' } : { hint: `再按“${S.b}”，和刚才比一比`, next: 'b' }
  const sum = comboShove(alt ? false : true), same = !alt
  const sumEnd = (b: boolean) => comboShove(!b).total, at = (m: number, y: number, z = LANE): V3 => [X0 + m * M, y, z]
  const labels: Label[] = sub === 'sum' ? [
    { id: 'f', at: at(0, 3.9), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: seen ? 0 : 1 }, children: <><small>合力</small>{COMBO.F1} {same ? '+' : '−'} {COMBO.F2} = {sum.F} N</> },
    { id: 'd', at: at(sum.total, 3.8), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: seen ? 1 : 0 }, children: <><small>{same ? '同向' : '反向'}</small>滑了 {sum.total.toFixed(2)} m</> },
  ] : sub === 'sweep' ? [
    ...[false, true].filter(b => did(b)).map((b): Label => ({ id: `s${b}`, at: [XS + sweepDist(b) * M, b ? 5.6 : 4, LANE], ax: 0.5, className: `scene-tag ${b ? 'key' : ''} -translate-y-full`, children: <><small>{b ? '擦冰' : '不擦冰'}</small>{sweepDist(b).toFixed(2)} m</> })),
    { id: 'h', at: [HOUSE, 0.6, LANE - 12], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '大本营' },
  ] : [
    { id: 'F', at: dragP(4, 15), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: seen ? 1 : 0 }, children: <><small>{alt ? '滚动' : '滑动'}</small>{(alt ? rolling() : friction('base')).toFixed(2)} N</> },
  ]
  const big = sub === 'sum' ? { t: '合力', v: String(sum.F), u: 'N' } : sub === 'sweep' ? { t: '冰壶滑行的距离', v: seen ? sweepDist(alt).toFixed(2) : '—', u: 'm' } : { t: '拉动木块要用的力', v: seen ? (alt ? rolling() : friction('base')).toFixed(2) : '—', u: 'N' }
  const shell = {
    title: '力和运动', lessons: LESSONS, current: 'x', narration: voiced(NARRATION['x'], VOICE), onLesson: goLesson, banner: T.banner, onReset: resetAll, hint, actionsLabel: S.name,
    lesson: <LessonBlock no="拓展" title="合力 · 擦冰 · 滚动" concept={S.title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{S.say}</p>} />,
    finale: T.finale && (
      <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个专题都做过了</p>
        <p className="mt-2 text-[21px] leading-snug font-bold">合力决定运动状态怎样变；摩擦可以想办法减小</p>
        <p className="mt-3 text-[14px] leading-relaxed text-white/70">同向 {resultant(COMBO.F1, COMBO.F2, true)} N、反向 {resultant(COMBO.F1, COMBO.F2, false)} N；擦冰让冰壶从 {sweepDist(false).toFixed(2)} m 滑到 {sweepDist(true).toFixed(2)} m；垫上圆铅笔，拉力从 {friction('base').toFixed(2)} N 降到约 {rolling().toFixed(2)} N。</p>
        <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
      </Glass>
    ),
    panel: (
      <Glass className="px-4 py-4">
        <div className="text-center">
          <div className="text-[13px] text-white/60">{big.t}</div>
          <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{big.v}<span className="ml-1 text-[15px] font-medium text-white/55">{big.u}</span></div>
        </div>
        {sub === 'roll' && <ScaleView F={seen ? (alt ? rolling() : friction('base')) : 0} />}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {sub === 'sum' && <><ParamTile symbol="F₁" value={`${COMBO.F1} N`} unit="向前" /><ParamTile symbol="F₂" value={`${COMBO.F2} N`} unit={same ? '向前' : '向后'} /><ParamTile symbol="同向" value={did(false) ? `${sumEnd(false).toFixed(2)} m` : '—'} unit="滑行的距离" /><ParamTile symbol="反向" value={did(true) ? `${sumEnd(true).toFixed(2)} m` : '—'} unit="滑行的距离" /></>}
          {sub === 'sweep' && <><ParamTile symbol="v" value={`${SWEEP.v} m/s`} unit="出手速度" /><ParamTile symbol="μ" value={String(alt ? SWEEP.swept : SWEEP.mu)} unit="摩擦因数（示意）" /><ParamTile symbol="不擦" value={did(false) ? `${sweepDist(false).toFixed(2)} m` : '—'} unit="滑行的距离" /><ParamTile symbol="擦冰" value={did(true) ? `${sweepDist(true).toFixed(2)} m` : '—'} unit="滑行的距离" /></>}
          {sub === 'roll' && <><ParamTile symbol="滑动" value={did(false) ? `${friction('base').toFixed(2)} N` : '—'} unit="直接拖" /><ParamTile symbol="滚动" value={did(true) ? `约 ${rolling().toFixed(2)} N` : '—'} unit="垫上圆铅笔" /></>}
        </div>
        <p className="mt-4 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/75">{S.say}</p>
      </Glass>
    ),
    actions: <>
      <LabButton primary={next !== 'b'} pulse={next === 'a'} onClick={() => start(false)} disabled={busy}>{S.a}</LabButton>
      <LabButton primary={next === 'b'} pulse={next === 'b'} onClick={() => start(true)} disabled={busy}>{S.b}</LabButton>
    </>,
    extras: <Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} disabled={busy} onChange={pick} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>,
  }
  return <LabShell {...shell} stage={
    sub === 'sum' ? <Place at="xa" labels={labels}><SumRig same={same} run={run} onEnd={ended} /><Spares /></Place>
    : sub === 'sweep' ? <Place at="xb" labels={labels}><SweepRig swept={alt} run={run} onEnd={ended} /><Spares /></Place>
    : <DragStage at="xc" labels={labels}><DragRig face="wood" rollers={alt} f={alt ? rolling() : friction('base')} run={run} onEnd={ended} /></DragStage>} />
}
