// 勾股定理 · 第 4 课 木板过门框：木工坊的门洞宽 1 m、高 2 m，门前一块长 3 m、宽 2.2 m 的薄木板，要搬进屋里。
// 横着推、竖着推都卡在门框上；量一量门框的对角线 √(1² + 2²) = √5 ≈ 2.24 m，比 2.2 m 宽，斜着就推得进去。
import { useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { COL, Glove, Place, ease, sideStyle, useRun } from './parts'
import { BOARD, DIAG2, DOOR, HOLD, approx, boardPass, diag, rootOf, type Hold } from './physics'
import { woodPlank } from './mats'
import { ST } from './world'

const KEYS = Object.keys(HOLD) as Hold[]
const X = ST.l4.x, ZD = ST.l4.z          // 门洞中线、门脸
const FRONT = ZD + 0.2                   // 门框外沿
const Z0 = ZD + 3.0                         // 木板中心一开始在哪（z）
const ZHIT = FRONT + BOARD.len / 2 + 0.02, ZIN = ZD - BOARD.len / 2 - 0.25
const ANG: Record<Hold, number> = { across: 0, upright: Math.PI / 2, slant: Math.atan2(DOOR.h, DOOR.w) }
const CY: Record<Hold, number> = { across: 1.0, upright: BOARD.wid / 2 + 0.03, slant: DOOR.h / 2 }
const TASKS: Task[] = [
  { id: 'across', text: '木板横着拿，往门里推', note: `木板宽 ${BOARD.wid} m，门框只有 ${DOOR.w} m 宽：过不去` },
  { id: 'upright', text: '木板竖着拿，再推一次', note: `门框高 ${DOOR.h} m，还是比 ${BOARD.wid} m 小：过不去` },
  { id: 'diag', text: '量一量门框的对角线', note: `对角线 = √(1² + 2²) = ${rootOf(DIAG2)} ≈ ${approx(diag())} m，比 ${BOARD.wid} m 长` },
  { id: 'slant', text: '木板斜着拿，推进去', note: `木板顺着对角线斜过来，${approx(diag())} m > ${BOARD.wid} m，推进去了` },
]

export default function Lesson4() {
  const [hold, setHold] = useState<Hold>('across')
  const [tried, setTried] = useState<Hold[]>([])
  const [inside, setInside] = useState(false)
  const Tk = useTasks('gewu:pyth:4', TASKS)
  const ang = useSlide(ANG[hold], 1.1), cy = useSlide(CY[hold], 0.5)
  const ready = Math.abs(ang - ANG[hold]) < 1e-6 && Math.abs(cy - CY[hold]) < 1e-6
  const fits = boardPass(hold).fits
  const push = useRun(fits ? 3.2 : 2.8, () => { const n = [...tried, hold]; setTried(n); if (fits) setInside(true); Tk.check(id => id === hold) })
  const meas = useRun(1.8, () => Tk.check(id => id === 'diag'))
  const busy = push.busy || meas.busy
  const pick = (h: Hold) => { if (busy || inside) return; setHold(h); push.snap(0) }
  const go = () => { if (busy || !ready || inside) return; push.snap(0); push.run() }
  const resetAll = () => { setHold('across'); setTried([]); setInside(false); push.snap(0); meas.snap(0); Tk.reset() }

  // 木板中心沿 z 走：过不去的，碰到门框停一下再退回来；过得去的，一直推进屋里
  const k = push.k
  const zc = inside ? ZIN : !push.busy ? Z0 : fits ? Z0 + (ZIN - Z0) * ease(k)
    : k < 0.55 ? Z0 + (ZHIT - Z0) * ease(k / 0.55) : k < 0.68 ? ZHIT + Math.sin((k - 0.55) / 0.13 * Math.PI) * 0.04 : ZHIT + (Z0 - ZHIT) * ease((k - 0.68) / 0.32)
  const stuck = push.busy && !fits && k > 0.5 && k < 0.7

  const task = Tk.current
  const { hint, next }: { hint: string; next: 'hold' | 'push' | 'meas' | null } = (() => {
    if (!task) return { hint: '门框的对角线 √5 ≈ 2.24 m，比木板宽 2.2 m 长：斜着就搬得进去。', next: null }
    if (push.busy) return { hint: stuck ? '卡在门框上了…' : '往门里推…', next: null }
    if (meas.busy) return { hint: '从门洞的一角量到对角…', next: null }
    if (task.id === 'diag') return { hint: '横着竖着都过不去。量一量门框的对角线', next: 'meas' }
    if (hold !== task.id) return { hint: `把木板换成${HOLD[task.id as Hold]}拿`, next: 'hold' }
    if (!ready) return { hint: '木板转过来…', next: null }
    return { hint: `${HOLD[hold]}拿着，推过去试试`, next: 'push' }
  })()

  const showDiag = meas.k > 0
  const labels: Label[] = [
    { id: 'w', at: [X, DOOR.h + 0.32, FRONT], ax: 0.5, className: 'scene-tag -translate-y-1/2', style: sideStyle('a'), children: <><small style={{ color: '#fff' }}>门宽</small>{DOOR.w} m</> },
    { id: 'h', at: [X + DOOR.w / 2 + 0.2, DOOR.h * 0.62, FRONT], ax: 0, className: 'scene-tag -translate-y-1/2', style: sideStyle('b'), children: <><small style={{ color: '#3a2600' }}>门高</small>{DOOR.h} m</> },
    { id: 'd', at: [X - 0.05, DOOR.h / 2 + 0.25, ZD - 0.02], ax: 1, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: meas.k >= 1 ? 1 : 0, background: COL.c }, children: <><small>对角线</small>√5 ≈ {approx(diag())} m</> },
    { id: 'bw', at: [X - Math.cos(ang) * 1.1 - 0.15, cy - Math.sin(ang) * 1.1, zc + 1.2], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>木板宽</small>{BOARD.wid} m</> },
    { id: 'n1', at: [X - 1.4, 2.6, ZD + 0.1], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '木工坊的门洞' },
    { id: 'n2', at: [X + 1.6, 0.25, zc + 1.4], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: `薄木板 ${BOARD.len} m × ${BOARD.wid} m` },
  ]
  return (
    <LabShell title="勾股定理" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel="木板"
      stage={<Place at="l4" labels={labels}>
        {/* 门洞里的三条量线：宽（蓝）、高（橙）、对角线（绿，量的时候从左下角长到右上角） */}
        <group position={[X, 0, ZD + 0.012]}>
          <mesh position={[0, DOOR.h - 0.03, 0]}><boxGeometry args={[DOOR.w, 0.025, 0.01]} /><meshBasicMaterial color={COL.a} toneMapped={false} /></mesh>
          <mesh position={[DOOR.w / 2 - 0.03, DOOR.h / 2, 0]}><boxGeometry args={[0.025, DOOR.h, 0.01]} /><meshBasicMaterial color={COL.b} toneMapped={false} /></mesh>
          {showDiag && (() => { const L = diag() * Math.min(1, meas.k * 1.15), a = ANG.slant; return <mesh position={[-DOOR.w / 2 + Math.cos(a) * L / 2, Math.sin(a) * L / 2, 0.005]} rotation-z={a}><boxGeometry args={[L, 0.035, 0.01]} /><meshBasicMaterial color={COL.c} toneMapped={false} /></mesh> })()}
        </group>
        {/* 木板：中心在 (X, cy, zc)，宽边转到 ang；两只手套扶着后头 */}
        <group position={[X, cy, zc]} rotation-z={ang}>
          <Board />
          {[-0.75, 0.75].map(dx => <group key={dx} position={[dx, 0.016, BOARD.len / 2 - 0.12]}><Glove /></group>)}
        </group>
        {stuck && <mesh position={[X, cy, FRONT + 0.02]}><ringGeometry args={[0.35, 0.42, 40]} /><meshBasicMaterial color="#ff6b6b" transparent opacity={0.85} toneMapped={false} /></mesh>}
      </Place>}
      lesson={<LessonBlock no="4" title="木板过门框" concept="已知两直角边，c = √(a² + b²)" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p>门框的宽、高和对角线围成一个直角三角形：两条直角边是 1 m 和 2 m，对角线是斜边。</p>
          <p className="mt-3">由勾股定理，对角线 c = √(1² + 2²) = √5 ≈ 2.24 m（保留两位小数）。</p>
          <p className="mt-3">木板宽 2.2 m，比门宽 1 m、门高 2 m 都大，横着、竖着都过不去；比对角线 2.24 m 小，斜着就能过去。木板很薄，厚度不计。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">门框对角线 √(1² + 2²) = √5 ≈ 2.24 m，比木板宽 2.2 m 长，斜着搬得进去</p>
        <p className="mt-1 text-[14px] text-white/70">已知直角三角形的两条直角边 a、b，斜边 c = √(a² + b²)。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">门框的对角线</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{meas.k >= 1 ? `√5 ≈ ${approx(diag())}` : '?'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol={<span style={{ color: COL.a }}>宽</span>} value={`${DOOR.w}`} unit="m · 门" />
            <ParamTile symbol={<span style={{ color: COL.b }}>高</span>} value={`${DOOR.h}`} unit="m · 门" />
            <ParamTile symbol="木板" value={`${BOARD.wid}`} unit="m · 宽" />
          </div>
          <div className="mt-2 rounded-xl bg-white/8 px-3 py-2.5">
            <div className="text-[12.5px] text-white/55">对角线 = √(宽² + 高²)</div>
            <div className="mt-1 text-[17px] font-bold tabular-nums">{meas.k >= 1 ? `√(1² + 2²) = √5 ≈ ${approx(diag())} m` : '—'}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">试过的拿法</h2>
          <table className="mt-1.5 w-full text-[14px] tabular-nums">
            <tbody>{KEYS.map(h => { const p = boardPass(h), on = tried.includes(h); return <tr key={h} className={on ? 'text-white' : 'text-white/30'}><td className="py-1">{HOLD[h]}</td><td>{p.what}</td><td className="text-right">{on ? `${h === 'slant' ? approx(p.room) : p.room} m ${p.fits ? '>' : '<'} ${BOARD.wid} m` : '—'}</td><td className={on ? (p.fits ? 'pl-2 text-right text-[#7fe3d4]' : 'pl-2 text-right text-[#ff9b9b]') : 'pl-2 text-right'}>{on ? (p.fits ? '能过' : '过不去') : ''}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'push'} onClick={go} disabled={busy || !ready || inside || tried.includes(hold)}>推过去</LabButton>
        <LabButton pulse={next === 'meas'} onClick={() => { if (!busy && meas.k === 0) meas.run() }} disabled={busy || meas.k > 0}>量对角线</LabButton>
      </>}
      extras={<Control label="木板怎么拿"><Segmented label="木板怎么拿" pulse={next === 'hold'} want={next === 'hold' ? task!.id as Hold : null} disabled={busy || inside} value={hold} onChange={pick} options={KEYS.map(h => ({ value: h, label: HOLD[h] }))} /></Control>}
    />
  )
}

/** 薄木板：几块长木条拼起来的板，板缝清楚，两头各一道横档 */
function Board() {
  const map = woodPlank()
  const n = 5, w = BOARD.wid / n
  return <group>
    {Array.from({ length: n }, (_, i) => <RoundedBox key={i} args={[w - 0.006, 0.025, BOARD.len]} radius={0.005} smoothness={2} position={[-BOARD.wid / 2 + w * (i + 0.5), 0, 0]} castShadow receiveShadow>
      <meshStandardMaterial map={map} color={i % 2 ? '#f0dcc0' : '#e6cfaa'} roughness={0.7} />
    </RoundedBox>)}
    {[-1, 1].map(s => <RoundedBox key={s} args={[BOARD.wid - 0.1, 0.02, 0.09]} radius={0.004} position={[0, -0.022, s * (BOARD.len / 2 - 0.2)]} castShadow><meshStandardMaterial map={map} color="#c8a878" roughness={0.75} /></RoundedBox>)}
  </group>
}
