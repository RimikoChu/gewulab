// 机械振动和机械波 · 第 2 课 单摆：码头面上一副落地的单摆。电磁推杆把摆球推到 5° 再缩回去，光电门数 5 次全振动的时间。
// 换摆球、换摆长，看周期跟谁有关；最后用摆长和周期算出重力加速度。
import { useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { PR, PendRig, type PendHandle } from './bench'
import { num, useRun, useSpace } from './gear'
import { AT, QUAY } from './layout'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { G, PEND, PENDS, gFrom, pendAngle, pendT, type PendKey } from './physics'
import { VOICE } from './voice'
import { Place } from './world'

const KEYS: PendKey[] = ['steel', 'wood', 'short']
const per = (k: PendKey) => pendT(PENDS[k].L)
const TASKS: Task[] = [
  { id: 'steel', text: '摆长 1.00 m、钢球：松手，计 5 次全振动', note: `5 次用了 ${num(per('steel') * 5)} s：周期 ${num(per('steel'))} s` },
  { id: 'wood', text: '换成轻得多的木球，再测一次', note: `木球只有钢球的十几分之一重，周期还是 ${num(per('wood'))} s` },
  { id: 'short', text: '换回钢球，把摆长缩到 0.25 m', note: `摆长是原来的 1/4，周期 ${num(per('short'))} s，是原来的一半` },
  { id: 'g', text: '用 1.00 m 那组数据算重力加速度', note: `g = 4π²l / T² = ${num(gFrom(1, per('steel')))} m/s²` },
]
const [PX, PZ] = AT.pend, Y0 = QUAY.y
const TH0 = (PEND.deg * Math.PI) / 180
/** 一次测量的几个时刻（s）：等旧的摆动停下、推杆把球推到位、停一下、缩回去松手 */
const PUSH = 0.4, HOLD = 1.3, REL = 1.7
const sm = (u: number) => { const k = Math.min(1, Math.max(0, u)); return k * k * (3 - 2 * k) }

function Rig({ cfg, run, onDone, onClock, timer }: { cfg: PendKey; run: number; onDone: () => void; onClock: (t: number, n: number) => void; timer: string }) {
  const L = PENDS[cfg].L, T = per(cfg), rig = useRef<PendHandle>(null), s = useRef({ th: 0, last: -1 })
  useRun(run, (tt, dt) => {
    const q = s.current, far = -L * Math.sin(TH0 * PR.show) + PR.ball
    let tip = PR.park
    if (run === 0 || tt < PUSH) q.th *= Math.exp(-dt * 6)
    else if (tt < HOLD) { tip = PR.park + (far - PR.park) * sm((tt - PUSH) / (HOLD - PUSH)); q.th = Math.min(q.th * Math.exp(-dt * 6), Math.asin(Math.max(-1, Math.min(0, tip - PR.ball) / L))) }
    else if (tt < REL) { tip = far; q.th = -TH0 * PR.show }
    else { q.th = -pendAngle(TH0, L, tt - REL) * PR.show; tip = Math.min(PR.park, far + (tt - REL) * 4) }
    rig.current?.set(q.th, tip)
    const el = run !== 0 && tt >= REL ? Math.min(tt - REL, T * PEND.count) : 0, cnt = Math.floor(el / T + 1e-6), k = Math.round(el * 10) + cnt * 100000
    if (k !== q.last) { q.last = k; onClock(el, cnt) }
  }, [REL + T * PEND.count + 0.02], onDone)
  return <group position={[PX, Y0, PZ]}><PendRig ref={rig} L={L} wood={cfg === 'wood'} timer={timer} /></group>
}

export default function Lesson2() {
  const [cfg, setCfg] = useState<PendKey>('steel')
  const [run, setRun] = useState(0), n = useRef(0)
  const [busy, setBusy] = useState(false)
  const [clock, setClock] = useState({ t: 0, n: 0 })
  const [rows, setRows] = useState<PendKey[]>([])
  const [gDone, setGDone] = useState(false)
  const T = useTasks('gewu:wave:2', TASKS)
  const c = PENDS[cfg], period = per(cfg)
  const go = () => { if (busy) return; setBusy(true); setClock({ t: 0, n: 0 }); setRun(++n.current) }
  const done = () => { setBusy(false); const next = rows.includes(cfg) ? rows : [...rows, cfg]; setRows(next); T.check(id => next.includes(id as PendKey)) }
  const calc = () => { if (!rows.includes('steel')) return; setGDone(true); T.check(id => id === 'g') }
  const pick = (k: PendKey) => { if (busy) return; setCfg(k); setRun(0); setClock({ t: 0, n: 0 }) }
  const resetAll = () => { setCfg('steel'); setRun(0); setBusy(false); setClock({ t: 0, n: 0 }); setRows([]); setGDone(false); T.reset() }
  useSpace(go)

  const task = T.current, want = task && task.id !== 'g' ? task.id as PendKey : null
  const full = clock.n >= PEND.count && run !== 0
  const { hint, next }: { hint: string; next: 'cfg' | 'go' | 'calc' | null } = (() => {
    if (!task) return { hint: '单摆的周期 T = 2π√(l/g)：只由摆长和重力加速度决定。', next: null }
    if (busy) return { hint: clock.t > 0 ? `松手了：光电门在数，已经摆了 ${clock.n} 次…` : '推杆把摆球推到 5° 的地方…', next: null }
    if (task.id === 'g') return { hint: '按“算 g”：用 l = 1.00 m 和测到的周期算重力加速度', next: 'calc' }
    if (cfg !== want) return { hint: `把单摆换成“${PENDS[want!].name}”`, next: 'cfg' }
    return { hint: '按“推到 5° 松手”，计 5 次全振动的时间', next: 'go' }
  })()
  const timer = run !== 0 && clock.t > 0 ? clock.t.toFixed(2) : '0.00'
  const labels: Label[] = [
    { id: 'T', at: [PX + 0.1, Y0 + PR.pivot - c.L * 0.55, PZ], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: full ? 1 : 0 }, children: <><small>周期</small>T = {num(period)} s</> },
    { id: 'tm', at: [PX + 0.74, Y0 + 0.44, PZ + 0.12], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>{PEND.count} 次全振动</small>{run !== 0 && clock.t > 0 ? `${num(clock.t, full ? 2 : 1)} s` : '0.00 s'}</> },
    { id: 'nL', at: [PX - 0.03, Y0 + PR.pivot - c.L * 0.35, PZ], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: `摆长 ${num(c.L)} m` },
    { id: 'nB', at: [PX - 0.09, Y0 + PR.pivot - c.L - 0.12, PZ], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: `${c.ball} · ${c.m} kg` },
    { id: 'nS', at: [PX + PR.sol + 0.02, Y0 + PR.pivot - c.L + (c.L > 0.5 ? 0.16 : 0.1), PZ], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电磁推杆' },
    { id: 'nG', at: [PX + 0.02, Y0 + PR.pivot - c.L - 0.13, PZ + 0.08], name: true, className: 'scene-name', children: '光电门' },
    { id: 'nA', at: [PX + 0.14, Y0 + PR.pivot - 0.02, PZ], className: 'scene-name -translate-y-1/2', children: '摆角示意放大（实际 5°）' },
  ]
  return (
    <LabShell title="机械振动和机械波" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="单摆"
      stage={<Place at="l2" labels={labels}><Rig key={cfg} cfg={cfg} run={run} onDone={done} onClock={(t, k) => setClock({ t, n: k })} timer={timer} /></Place>}
      lesson={<LessonBlock no="2" title="单摆" concept="单摆的周期只看摆长和 g" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>细线一端固定，另一端拴一个小球。线的质量和伸长可以忽略、球的直径比线长小得多时，这个装置叫<b className="text-white">单摆</b>。</p>
          <p className="mt-3">摆角很小（不超过 5° 左右）时，摆球受到的回复力和位移成正比，单摆做简谐运动。它的周期 T = 2π√(l/g)：只和摆长 l、当地的重力加速度 g 有关，和摆球的质量、振幅都无关。这叫单摆的<b className="text-white">等时性</b>。</p>
          <p className="mt-3">反过来，测出摆长和周期就能算出 g = 4π²l / T²。为了减小误差，从摆球经过最低点时开始计时，测几十次全振动的总时间再求周期。</p>
          <p className="mt-3 text-[13.5px] text-white/65">摆长是悬点到球心的距离，不是线长。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组都测完了，g 也算出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">周期只看摆长和 g，跟摆球多重无关</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">摆长 1.00 m，钢球和木球的周期都是 {num(per('steel'))} s；摆长缩到 0.25 m，周期 {num(per('short'))} s，是一半。由 l = 1.00 m、T = {num(per('steel'), 3)} s 算出 g = {num(gFrom(1, per('steel')))} m/s²。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再测几次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">T = 2π √(l / g)</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{full ? num(period) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">s</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="l" value={num(c.L)} unit="m · 摆长" />
            <ParamTile symbol="m" value={String(c.m)} unit={`kg · ${c.ball}`} />
            <ParamTile symbol="θ" value={`${PEND.deg}°`} unit="摆角" />
            <ParamTile symbol={`${PEND.count}T`} value={full ? num(period * PEND.count) : '—'} unit="s · 计时器" />
          </div>
          {rows.length > 0 && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
            <table className="mt-1 w-full text-[13px]">
              <thead><tr className="text-[11.5px] text-white/50"><th className="py-1 text-left font-normal">l / m</th><th className="text-left font-normal">摆球</th><th className="text-right font-normal">5T / s</th><th className="text-right font-normal">T / s</th></tr></thead>
              <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{num(PENDS[k].L)}</td><td className="text-white/75">{PENDS[k].ball}</td><td className="text-right tabular-nums">{num(per(k) * 5)}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{num(per(k))}</td></tr>)}</tbody>
            </table>
          </>}
          {gDone && <p className="hint-in mt-3 rounded-xl bg-white/8 px-3.5 py-3 text-[14px] leading-relaxed text-white/85">g = 4π² × 1.00 ÷ {num(per('steel'), 3)}² = <b className="text-[#7fe3d4]">{num(gFrom(1, per('steel')))} m/s²</b>（取值 {G}）</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={go} disabled={busy}>推到 5° 松手</LabButton>
        <LabButton pulse={next === 'calc'} onClick={calc} disabled={!rows.includes('steel') || gDone}>算 g</LabButton>
      </>}
      extras={<Control label="摆长和摆球"><Segmented label="摆长和摆球" pulse={next === 'cfg'} want={next === 'cfg' ? want : null} value={cfg} disabled={busy} onChange={pick} options={KEYS.map(k => ({ value: k, label: PENDS[k].name }))} /></Control>}
    />
  )
}
