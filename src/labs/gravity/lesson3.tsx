// 万有引力与航天 · 第 3 课 称出引力常量（万有引力定律、卡文迪什扭秤）
import { useEffect, useRef, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene3 from './scene3'
import { ARM_A } from './balance'
import { LESSONS, goLesson } from './lessons'
import { BAL, G, ballForce, measureG, sci, spotOf, swing, twist } from './physics'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const TASKS: Task[] = [
  { id: 'A', text: '把大球转到 A 侧，记下光点', note: '大球吸小球，T 形架扭过一个很小的角度，光点移了几厘米' },
  { id: 'B', text: '把大球转到 B 侧，再记一次', note: '换到另一侧，扭转方向反过来，光点移到零点另一边' },
  { id: 'G', text: '用两次读数算出 G', note: 'G ≈ 6.67 × 10⁻¹¹ N·m²/kg²：引力常量是这样“称”出来的' },
]
type Side = 'A' | 'B'
const PARK = Math.PI / 2   // 大球支架不用时转到和细杆垂直的位置，离小球远

export default function Lesson3() {
  const [side, setSide] = useState<Side | null>(null)
  const [reads, setReads] = useState<Partial<Record<Side, number>>>({})
  const [gOut, setGOut] = useState<number | null>(null)
  const T = useTasks('gewu:gravity:3', TASKS)
  const arm = useSlide(side === 'A' ? ARM_A : side === 'B' ? -ARM_A : PARK, 0.9)
  const turning = Math.abs(arm - (side === 'A' ? ARM_A : side === 'B' ? -ARM_A : PARK)) > 1e-4
  // T 形架的扭转：大球到位以后开始摆，几秒后停在新的平衡位置
  const target = side === 'A' ? twist() : side === 'B' ? -twist() : 0
  const [th, setTh] = useState(0)
  const swingRef = useRef({ from: 0, t0: 0 })
  useEffect(() => {
    if (turning) return
    swingRef.current = { from: th, t0: performance.now() }
    let raf = 0
    const f = () => { const t = (performance.now() - swingRef.current.t0) / 1000; setTh(swing(swingRef.current.from, target, t)); if (t < 7) raf = requestAnimationFrame(f); else setTh(target) }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [turning, target])   // eslint-disable-line react-hooks/exhaustive-deps
  const settled = !turning && Math.abs(th - target) < 1e-7
  const spot = spotOf(th)
  const record = () => { if (!side || !settled || reads[side] != null) return; const n = { ...reads, [side]: spot }; setReads(n); T.check(id => id === side) }
  const turn = () => setSide(s => (s === 'A' ? 'B' : 'A'))
  const calc = () => { if (reads.A == null || reads.B == null) return; setGOut(measureG(reads.A - reads.B)); T.check(id => id === 'G') }
  const resetAll = () => { setSide(null); setReads({}); setGOut(null); setTh(0); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'turn' | 'record' | 'calc' | null } = (() => {
    if (!task) return { hint: '都做完了。光杠杆把看不见的扭转放大成了几厘米。', next: null }
    if (turning) return { hint: '大球正在转过去…', next: null }
    if (task.id === 'G') return { hint: '两次读数都有了：算出 G', next: 'calc' }
    if (side !== task.id) return { hint: `把大球转到 ${task.id} 侧`, next: 'turn' }
    if (!settled) return { hint: 'T 形架在摆：等光点停稳', next: null }
    return { hint: '光点停稳了：记下它的位置', next: 'record' }
  })()

  return (
    <LabShell narration={voiced(NARRATION['3'], VOICE)} title="万有引力与航天" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="扭秤"
      stage={<Scene3 arm={arm} twist={th} spot={spot} side={turning ? null : side} />}
      lesson={<LessonBlock no="3" title="称出引力常量" concept="小镜子把看不见的扭转放大成光点的移动" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">万有引力定律：</b>两个物体之间的引力，大小和它们质量的乘积成正比，和距离的二次方成反比：</p>
          <p className="my-2 text-center font-formula text-[19px] italic">F = G m₁m₂ / r²</p>
          <p>卡文迪什用扭秤测出了 G。两个大球吸两个小球，两个力的力矩 F·L 让石英丝扭过 θ，和丝的回复力矩 κθ 平衡。θ 太小看不出来，就在丝下粘一面小镜子：镜子转 θ，反射光转 2θ，落到几米外的尺上就成了几厘米。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这台扭秤的参数是示意值，量级和卡文迪什的装置相近。真实的扭秤摆一个来回要好几分钟，这里放快了。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="px-6 py-5">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">G 算出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">G = 6.67 × 10⁻¹¹ N·m²/kg²：两个 100 kg 的人相距 1 m，引力只有 6.67 × 10⁻⁷ N</p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/70">引力太小，所以要用光杠杆把扭转放大；测出 G，就能去“称”地球了。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{gOut ? '算出的引力常量' : '一个大球吸小球的力'}</div>
            <div className="mt-1 text-[30px] leading-none font-bold tracking-tight tabular-nums">{gOut ? sci(gOut) : side && settled ? sci(ballForce()) : '—'}<span className="ml-1 text-[14px] font-medium text-white/55">{gOut ? 'N·m²/kg²' : 'N'}</span></div>
          </div>
          <div className="mt-4 text-[12.5px] text-white/55">刻度尺（放大）</div>
          <svg viewBox="0 0 290 56" className="mt-1.5 w-full">
            <rect x="0" y="0" width="290" height="40" rx="4" fill="#f2efe4" />
            {Array.from({ length: 41 }, (_, i) => { const cm = i / 2 - 10, x = 145 + cm * 13.5; return <g key={i}><line x1={x} x2={x} y1={0} y2={i % 2 ? 8 : 15} stroke="#1d2327" strokeWidth="1.2" />{i % 4 === 0 && <text x={x} y={31} textAnchor="middle" fontSize="11" fill="#1d2327">{Math.abs(cm)}</text>}</g> })}
            <circle cx={145 + spot * 100 * 13.5} cy={20} r={5} fill="#ff5a3c" />
            <text x="145" y="52" textAnchor="middle" fontSize="11" fill="rgb(255 255 255 / 0.55)">0（大球远离时）　单位 cm</text>
          </svg>
          <h2 className="mt-4 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="M" value={String(BAL.M)} unit="kg · 大球" />
            <ParamTile symbol="m" value={String(BAL.m)} unit="kg · 小球" />
            <ParamTile symbol="r" value={String(BAL.r)} unit="m · 球心距" />
            <ParamTile symbol="L" value={String(BAL.L)} unit="m · 杆长" />
            <ParamTile symbol="κ" value="6.0×10⁻⁵" unit="N·m/rad" />
            <ParamTile symbol="D" value={String(BAL.D)} unit="m · 到尺" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            {(['A', 'B'] as Side[]).map(s => <div key={s} className="rounded-xl bg-white/6 px-3 py-2"><div className="text-[12px] text-white/55">{s} 侧读数</div><div className="text-[20px] font-bold tabular-nums">{reads[s] == null ? '—' : `${reads[s]! >= 0 ? '+' : '−'}${Math.abs(reads[s]! * 100).toFixed(2)} cm`}</div></div>)}
          </div>
          {gOut && <p className="row-in mt-3 rounded-xl bg-[#35c7b3]/15 px-3 py-2.5 text-[13.5px] leading-relaxed text-white/85">两侧相差 {Math.abs((reads.A! - reads.B!) * 100).toFixed(2)} cm → θ = {(twist() * 1000).toFixed(2)} × 10⁻³ rad → G = κθr²/(LMm) = {sci(gOut)}（公认值 {sci(G)}）</p>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'turn'} onClick={turn} disabled={turning}>{side === 'A' ? '转到 B 侧' : '转到 A 侧'}</LabButton>
        <LabButton pulse={next === 'record'} onClick={record} disabled={!side || !settled || reads[side] != null}>记录光点</LabButton>
        <LabButton primary pulse={next === 'calc'} onClick={calc} disabled={reads.A == null || reads.B == null || gOut != null}>算出 G</LabButton>
      </>}
      extras={null}
    />
  )
}
