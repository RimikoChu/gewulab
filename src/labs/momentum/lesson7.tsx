// 动量和碰撞 · 第 7 课 火箭的推力：馆外的试车台上，横卧的发动机点火 10 s。燃气向右高速喷出，发动机受到向左的推力，
// 顶在承力墩前面的力传感器上。对喷出的燃气用动量定理：F = 每秒喷出的质量 × 喷出的速度。画面上点火过程按 2 倍速放。
import { useRef } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import type { Label } from '@/lab-kit'
import { Vec, useRun, type VecHandle } from './gear'
import { COL, STAND } from './layout'
import { LESSONS, goLesson } from './lessons'
import { BURN, BURNS, burn, type BurnKey } from './physics'
import { ENGINE, Plume } from './stand'
import { useSpace, useTrial } from './trial'
import { num } from './views'
import { Place } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const KEYS: BurnKey[] = ['a', 'b', 'c']
const kN = (k: BurnKey) => `${burn(k).F / 1000} kN`
const TASKS: Task[] = [
  { id: 'a', text: '每秒喷 100 kg、喷速 2500 m/s，点火', note: `推力 ${kN('a')}：每秒有 100 kg 燃气从静止被加速到 2500 m/s` },
  { id: 'b', text: '把每秒喷出的质量加到 200 kg', note: `每秒喷出的质量加倍，推力也加倍：${kN('b')}` },
  { id: 'c', text: '再把喷速提到 3000 m/s', note: `喷得更快，推力更大：${kN('c')}。推力 = 每秒喷出的质量 × 喷速` },
]
const X0 = STAND.x, Z0 = STAND.z, AX = STAND.axis
/** 箭头的比例：每 1 kN 画多长（m）；画的时候再折半，600 kN 是 3 m */
const KF = 0.01
const POWER: Record<BurnKey, number> = { a: 0.72, b: 0.88, c: 1 }

function Rig({ mode, run, onMark, clock }: { mode: BurnKey; run: number; onMark: (i: number, last: number) => void; clock: (t: number) => void }) {
  const power = useRef(0), fv = useRef<VecHandle>(null), gv = useRef<VecHandle>(null), F = burn(mode).F / 1000
  useRun(run, (t, dt) => {
    const on = run !== 0 && t < BURN.t
    power.current += ((on ? POWER[mode] : 0) - power.current) * (1 - Math.exp(-dt / (on ? 0.25 : 0.6)))
    const k = power.current / POWER[mode]
    fv.current?.set([-ENGINE.len + 0.9, AX + 1.75, 0], [-F * KF * k * 0.5, 0, 0]); gv.current?.set([0.3, AX + 1.75, 0], [F * KF * k * 0.5, 0, 0])
    clock(run === 0 ? 0 : Math.min(BURN.t, t))
  }, [BURN.t, BURN.t + 1.2], i => onMark(i, 1), 2)
  return <group position={[X0, 0, Z0]}>
    <Plume power={power} />
    <Vec ref={fv} color={COL.F} thick={0.09} /><Vec ref={gv} color={COL.p} thick={0.09} />
  </group>
}

export default function Lesson7() {
  const L = useTrial<BurnKey>('gewu:momentum:7', TASKS, 'a', id => id as BurnKey, true)
  const { mode, stage, rows, task, next, busy } = L, b = BURNS[mode], r = burn(mode), fired = stage >= 1, on = busy && !fired
  const sec = useRef<HTMLSpanElement>(null)
  useSpace(L.go)
  const hint = !task ? '推力 F = (Δm/Δt)·u：每秒喷出的燃气越多、喷得越快，推力越大。'
    : on ? '燃气向右喷，看力传感器上的推力…'
    : busy ? '关机了'
    : next === 'mode' ? `把条件换成“${BURNS[task.id as BurnKey].name}”`
    : `按“点火”：每秒喷出 ${b.rate} kg 燃气，喷速 ${b.u} m/s，点火 ${BURN.t} s`
  const labels: Label[] = [
    { id: 'F', at: [X0 - ENGINE.len + 0.3, AX + 2.25, Z0], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: on || fired ? 1 : 0 }, children: <><small>推力 F（向左）</small>{r.F / 1000} kN</> },
    { id: 'gas', at: [X0 + 3.4, AX + 2.25, Z0], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: on ? 1 : 0 }, children: <><small>燃气（向右）</small>{b.rate} kg/s · {b.u} m/s</> },
    { id: 't', at: [X0 + 2.5, 0.5, Z0 + 2.2], ax: 0.5, className: 'scene-tag transition-opacity', style: { opacity: L.run ? 1 : 0 }, children: <><small>点火时间</small><span ref={sec}>0.0</span> s</> },
    { id: 'cell', at: [X0 + ENGINE.block + 0.4, AX - 0.5, Z0 + 1], ax: 0.5, name: true, className: 'scene-name', children: '力传感器' },
    { id: 'block', at: [X0 + ENGINE.block - 1.6, 5.2, Z0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '承力墩' },
    { id: 'engine', at: [X0 - 1.4, AX - 1.3, Z0 + 1.2], ax: 0.5, name: true, className: 'scene-name', children: '发动机' },
    { id: 'duct', at: [X0 + 9.3, 6.4, Z0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '导流槽' },
  ]
  return (
    <LabShell title="动量和碰撞" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={L.T.banner} onReset={L.resetAll} hint={hint} actionsLabel="试车台"
      stage={<Place at="l7" labels={labels}><Rig mode={mode} run={L.run} onMark={L.mark} clock={t => { if (sec.current) sec.current.textContent = t.toFixed(1) }} /></Place>}
      lesson={<LessonBlock no="7" title="火箭的推力" concept="每秒喷得越多、越快，推力越大" tasks={TASKS} done={L.T.done} current={task?.id}
        theory={<>
          <p>火箭靠<b className="text-white">反冲</b>前进：燃料燃烧生成的高温燃气从喷管高速向后喷出，火箭受到向前的推力。它不靠推空气，在真空里照样工作。</p>
          <p className="mt-3">对 Δt 时间里喷出的燃气用动量定理：这些燃气的质量是 Δm，从静止被加速到 u，发动机给它的力满足 FΔt = Δm·u。燃气反过来推发动机的力一样大，所以推力 F = (Δm/Δt)·u。</p>
          <p className="mt-3">火箭最终能达到的速度，取决于喷气速度和质量比（起飞时的质量与燃料烧完时的质量之比）：喷气速度越大、质量比越大，速度越大。多级火箭把用完的一级扔掉，就是为了提高质量比。</p>
          <p className="mt-3 text-[13.5px] text-white/65">试车时发动机横放在可以沿轴线微动的动架上，推力全部压在承力墩前的力传感器上。这里的流量和喷速取的是整数的量级，不对应某一型真实的发动机。</p>
        </>} />}
      finale={L.T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三次试车都完成了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">推力等于每秒喷出的质量乘以喷速</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">100 kg/s × 2500 m/s 是 {kN('a')}；流量加倍是 {kN('b')}；喷速再提到 3000 m/s 是 {kN('c')}。{kN('a')} 的推力作用 {BURN.t} s，冲量是 {num(burn('a').I / 1e6, 1)}×10⁶ N·s，能让 {BURN.rocket / 1000} t 的箭体增加 {burn('a').dv} m/s（不计重力和质量的减少）。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => L.T.setFinale(false)}>再试几次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">F = (Δm / Δt) · u</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums" style={{ color: COL.F }}>{on || fired ? r.F / 1000 : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">kN</span></div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="Δm/Δt" value={String(b.rate)} unit="kg/s · 每秒喷出的质量" />
            <ParamTile symbol="u" value={String(b.u)} unit="m/s · 喷速" />
            <ParamTile symbol="I" value={fired ? `${num(r.I / 1e6, 1)}×10⁶` : '—'} unit={`N·s · 点火 ${BURN.t} s 的冲量`} />
            <ParamTile symbol="Δv" value={fired ? String(r.dv) : '—'} unit={`m/s · 推 ${BURN.rocket / 1000} t 的箭体`} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每次试车点火 {BURN.t} s 后自动关机，记一行。橙红色箭头是发动机受到的推力，黄色箭头是燃气每秒得到的动量。</p>
            : <table className="mt-1 w-full text-[13px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">kg/s</th><th className="text-right font-normal">u / (m/s)</th><th className="text-right font-normal">F / kN</th><th className="text-right font-normal">I / (10⁶ N·s)</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums text-white/80">{BURNS[k].rate}</td><td className="text-right tabular-nums">{BURNS[k].u}</td><td className="text-right font-semibold tabular-nums" style={{ color: COL.F }}>{burn(k).F / 1000}</td><td className="text-right tabular-nums">{num(burn(k).I / 1e6, 1)}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={L.go} disabled={busy}>点火</LabButton>
      </>}
      extras={<Control label="条件"><Segmented label="条件" pulse={next === 'mode'} want={next === 'mode' ? L.want : null} value={mode} disabled={busy} onChange={L.pick} options={KEYS.map(k => ({ value: k, label: BURNS[k].name }))} /></Control>}
    />
  )
}
