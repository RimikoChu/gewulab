// 机械振动和机械波 · 第 1 课 弹簧振子：试验棚的工作台上，一根弹簧挂着砝码。电磁释放器把砝码往下拉一段再松开，
// 光电计数器数 10 次全振动的时间，后面的走纸记录器把砝码的位置画成曲线。换振幅、换砝码、换弹簧，看周期跟谁有关。
import { useEffect, useMemo, useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Bench, SR, SpringRig, TOP, WT, type SpringHandle } from './bench'
import { num, useRun } from './gear'
import { AT, QUAY } from './layout'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { SPRING, SPRINGS, shm, springT, stretch, type SpringKey } from './physics'
import { VOICE } from './voice'
import { Place } from './world'

const KEYS: SpringKey[] = ['a', 'b', 'c']
const period = (k: SpringKey) => springT(SPRINGS[k].m, SPRINGS[k].k)
type Row = `${SpringKey}${5 | 10}`
const TASKS: Task[] = [
  { id: 'a5', text: '0.5 kg 的砝码：拉下 5 cm 松手，计 10 次全振动', note: `10 次用了 ${num(period('a') * 10)} s：周期 ${num(period('a'))} s` },
  { id: 'a10', text: '这次拉下 10 cm 再松手', note: `振幅大了一倍，周期还是 ${num(period('a'))} s` },
  { id: 'b', text: '换成 2 kg 的砝码，再测一次', note: `质量是原来的 4 倍，周期变成 ${num(period('b'))} s，是原来的 2 倍` },
  { id: 'c', text: '再换成 200 N/m 的硬弹簧', note: `劲度系数也成了 4 倍，周期回到 ${num(period('c'))} s` },
]
const [BX, BZ] = AT.spring, Y0 = QUAY.y + TOP
/** 一次测量的几个时刻（s）：等旧的振动停下、释放器升上去、往下拉、停一下、松手 */
const RISE = 0.5, PULL = 1.3, HOLD = 2.1, REL = 2.5
const sm = (u: number) => { const k = Math.min(1, Math.max(0, u)); return k * k * (3 - 2 * k) }
const SPEED = 0.11, STEP = 1 / 60                    // 走纸速度（m/s）和记录的步长（s）

function Rig({ cfg, run, A, onDone, onClock, timer }: { cfg: SpringKey; run: number; A: number; onDone: () => void; onClock: (t: number, n: number) => void; timer: string }) {
  const c = SPRINGS[cfg], T = period(cfg), heavy = c.m > 1, H = (heavy ? WT.heavy : WT.light)[1]
  const rig = useRef<SpringHandle>(null)
  const eq = SPRING.L0 + stretch(c.m, c.k)
  const s = useRef({ len: eq, x: 0, acc: 0, n: 0, last: -1 }), ys = useMemo(() => new Float32Array(320), [])
  useRun(run, (tt, dt) => {
    const q = s.current
    q.len += (eq - q.len) * Math.min(1, dt * 5)                 // 换砝码、换弹簧：弹簧慢慢伸到新的长度
    const bottomEq = SR.hang - q.len - 0.036 - H
    let puck = SR.restY
    if (run === 0 || tt < RISE) q.x *= Math.exp(-dt * 7)
    else if (tt < PULL) { q.x *= Math.exp(-dt * 7); puck = SR.restY + (bottomEq - q.x - SR.restY) * sm((tt - RISE) / (PULL - RISE)) }
    else if (tt < HOLD) { q.x = A * sm((tt - PULL) / (HOLD - PULL)); puck = bottomEq - q.x }
    else if (tt < REL) { q.x = A; puck = bottomEq - A }
    else { q.x = shm(A, T, tt - REL); puck = Math.max(SR.restY, bottomEq - A - (tt - REL) * 1.6) }
    rig.current?.set(q.len + q.x, puck)
    // 记录纸：每隔一小步记一次笔尖的高度
    q.acc += dt
    while (q.acc >= STEP) { q.acc -= STEP; ys.copyWithin(1, 0); ys[0] = SR.hang - q.len - q.x - 0.036 - H / 2; q.n = Math.min(180, q.n + 1) }
    rig.current?.trace(ys, q.n, SPEED * STEP)
    // 计时器：松手起算，数满 10 次停表
    const el = run !== 0 && tt >= REL ? Math.min(tt - REL, T * SPRING.count) : 0, cnt = Math.floor(el / T + 1e-6), k = Math.round(el * 10) + cnt * 100000
    if (k !== q.last) { q.last = k; onClock(el, cnt) }
  }, [REL + T * SPRING.count + 0.02], onDone)
  return <group position={[BX, QUAY.y, BZ]}>
    <Bench />
    <group position-y={TOP}><SpringRig ref={rig} heavy={heavy} hard={c.k > 100} gateY={SR.hang - eq - 0.036 - H / 2} timer={timer} /></group>
  </group>
}

export default function Lesson1() {
  const [cfg, setCfg] = useState<SpringKey>('a')
  const [A, setA] = useState(0.05)
  const [run, setRun] = useState(0), n = useRef(0)
  const [busy, setBusy] = useState(false)
  const [clock, setClock] = useState({ t: 0, n: 0 })
  const [rows, setRows] = useState<Row[]>([])
  const T = useTasks('gewu:wave:1', TASKS)
  const c = SPRINGS[cfg], per = period(cfg)
  const go = (cm: 5 | 10) => { if (busy) return; setA(cm / 100); setBusy(true); setClock({ t: 0, n: 0 }); setRun(++n.current) }
  const done = () => {
    setBusy(false)
    const key = `${cfg}${Math.round(A * 100)}` as Row, next = rows.includes(key) ? rows : [...rows, key]; setRows(next)
    T.check(id => id === 'a5' || id === 'a10' ? next.includes(id as Row) : next.some(r => r[0] === id))
  }
  const pick = (k: SpringKey) => { if (busy) return; setCfg(k); setRun(0); setClock({ t: 0, n: 0 }) }
  const resetAll = () => { setCfg('a'); setRun(0); setBusy(false); setClock({ t: 0, n: 0 }); setRows([]); T.reset() }
  useEffect(() => { const on = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target as HTMLElement | null)?.closest?.('button, input')) { e.preventDefault(); go(5) } }; window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on) })

  const task = T.current, want: SpringKey | null = !task ? null : task.id === 'b' ? 'b' : task.id === 'c' ? 'c' : 'a'
  const full = clock.n >= SPRING.count && run !== 0
  const { hint, next }: { hint: string; next: 'cfg' | 'p5' | 'p10' | null } = (() => {
    if (!task) return { hint: '弹簧振子的周期 T = 2π√(m/k)：只由质量和劲度系数决定。', next: null }
    if (busy) return { hint: clock.t > 0 ? `松手了：光电计数器在数，已经振动 ${clock.n} 次…` : '电磁释放器吸住砝码，往下拉…', next: null }
    if (cfg !== want) return { hint: `把搭配换成“${SPRINGS[want!].name}”`, next: 'cfg' }
    return task.id === 'a10' ? { hint: '按“拉下 10 cm 松手”：振幅加倍，周期会变吗？', next: 'p10' } : { hint: '按“拉下 5 cm 松手”，计 10 次全振动的时间', next: 'p5' }
  })()
  const labels: Label[] = [
    { id: 'T', at: [BX + 0.28, Y0 + SR.hang - SPRING.L0 - stretch(c.m, c.k) - 0.1, BZ], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: full ? 1 : 0 }, children: <><small>周期</small>T = {num(per)} s</> },
    { id: 'tm', at: [BX + 0.28, Y0 + SR.hang - SPRING.L0 - stretch(c.m, c.k) + 0.02, BZ], className: 'scene-tag -translate-y-1/2', children: <><small>{SPRING.count} 次全振动</small>{run !== 0 && clock.t > 0 ? `${num(clock.t, full ? 2 : 1)} s` : '0.00 s'}</> },
    { id: 'nS', at: [BX - 0.05, Y0 + SR.hang - 0.12, BZ], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: `弹簧 · ${c.k} N/m` },
    { id: 'nP', at: [BX - 0.2, Y0 + SR.hang - SPRING.L0 - stretch(c.m, c.k) + 0.2, BZ + SR.paperZ], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '走纸记录器' },
    { id: 'nW', at: [BX - 0.1, Y0 + SR.hang - SPRING.L0 - stretch(c.m, c.k) - 0.25, BZ], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: `砝码 ${c.m} kg（示意大小）` },
    { id: 'nM', at: [BX - 0.05, Y0 + 0.1, BZ], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '电磁释放器' },
    { id: 'nG', at: [BX + SR.colX + 0.03, Y0 + SR.hang - SPRING.L0 - stretch(c.m, c.k) - 0.05, BZ], name: true, className: 'scene-name -translate-y-1/2', children: '光电计数器' },
  ]
  return (
    <LabShell title="机械振动和机械波" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="电磁释放器"
      stage={<Place at="l1" labels={labels}><Rig key={cfg} cfg={cfg} run={run} A={A} onDone={done} onClock={(t, k) => setClock({ t, n: k })} timer={run !== 0 && clock.t > 0 ? clock.t.toFixed(2) : '0.00'} /></Place>}
      lesson={<LessonBlock no="1" title="弹簧振子" concept="周期由质量和弹簧决定，跟振幅无关" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>砝码静止时的位置叫<b className="text-white">平衡位置</b>。把它拉开再松手，它就在平衡位置两侧来回运动。如果位移随时间按正弦规律变化，这种运动叫<b className="text-white">简谐运动</b>：记录纸上画出来的就是一条正弦曲线。</p>
          <p className="mt-3">离开平衡位置的最大距离叫<b className="text-white">振幅 A</b>；完成一次全振动的时间叫<b className="text-white">周期 T</b>，每秒完成全振动的次数叫<b className="text-white">频率 f</b>，f = 1/T。</p>
          <p className="mt-3">使砝码回到平衡位置的力叫<b className="text-white">回复力</b>，它和位移成正比、方向相反：F = −kx。弹簧振子的周期 T = 2π√(m/k)，只和质量、劲度系数有关。</p>
          <p className="mt-3 text-[13.5px] text-white/65">竖直的弹簧振子，平衡位置在弹簧被砝码拉长以后的地方；重力只改变平衡位置，不改变周期。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四组都测完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">周期只看质量和弹簧，跟振幅无关</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">0.5 kg、50 N/m：拉下 5 cm 和 10 cm，周期都是 {num(period('a'))} s。质量换成 4 倍，周期 {num(period('b'))} s，是 2 倍；劲度系数再换成 4 倍，又回到 {num(period('c'))} s。T = 2π√(m/k)。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再测几次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">T = 2π √(m / k)</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{full ? num(per) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">s</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="m" value={String(c.m)} unit="kg · 质量" />
            <ParamTile symbol="k" value={String(c.k)} unit="N/m · 劲度系数" />
            <ParamTile symbol="A" value={run !== 0 ? num(A) : '—'} unit="m · 振幅" />
            <ParamTile symbol={`${SPRING.count}T`} value={full ? num(per * SPRING.count) : '—'} unit="s · 计时器" />
          </div>
          {rows.length > 0 && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
            <table className="mt-1 w-full text-[13px]">
              <thead><tr className="text-[11.5px] text-white/50"><th className="py-1 text-left font-normal">m / kg</th><th className="text-right font-normal">k / (N/m)</th><th className="text-right font-normal">A / cm</th><th className="text-right font-normal">10T / s</th><th className="text-right font-normal">T / s</th></tr></thead>
              <tbody>{rows.map(r => { const k = r[0] as SpringKey; return <tr key={r} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{SPRINGS[k].m}</td><td className="text-right tabular-nums">{SPRINGS[k].k}</td><td className="text-right tabular-nums">{r.slice(1)}</td><td className="text-right tabular-nums">{num(period(k) * 10)}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{num(period(k))}</td></tr> })}</tbody>
            </table>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'p5'} onClick={() => go(5)} disabled={busy}>拉下 5 cm 松手</LabButton>
        <LabButton pulse={next === 'p10'} onClick={() => go(10)} disabled={busy}>拉下 10 cm 松手</LabButton>
      </>}
      extras={<Control label="砝码和弹簧"><Segmented label="砝码和弹簧" pulse={next === 'cfg'} want={next === 'cfg' ? want : null} value={cfg} disabled={busy} onChange={pick} options={KEYS.map(k => ({ value: k, label: SPRINGS[k].name }))} /></Control>}
    />
  )
}
