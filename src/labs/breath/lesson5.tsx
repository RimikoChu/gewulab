// 呼吸 · 第 5 课 吸气和呼气时的气压：从侧面看胸腔模型，让胸廓扩大（吸气）、缩小（呼气）。肺内气压按气体的体积和压强的关系一步步算，
// 学生在吸气中途、吸气停住、呼气中途各记一次，看肺内气压和外界比是低、相等还是高，气流朝哪边。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useRef, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { ForceArrow, useTasks, type Label } from '@/lab-kit'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { LOOK, Place } from './parts'
import { LUNG, P0, breathStep, diffPa, flowDir, lungVolume } from './physics'

type Phase = 'in' | 'hold' | 'out'
const TASKS: Task[] = [
  { id: 'in', text: '吸气中途记一次肺内气压', note: '吸气时肺内气压比外界低，外界的空气流进肺' },
  { id: 'hold', text: '吸气停住时再记一次', note: '胸廓不动了，肺内气压和外界相等，没有气流' },
  { id: 'out', text: '呼气中途记一次', note: '呼气时肺内气压比外界高，肺里的气体流出去' },
]
const PH_NAME: Record<Phase, string> = { in: '吸气中途', hold: '吸气停住', out: '呼气中途' }
/** 吸气 2.4 s、呼气 3 s，胸廓按余弦曲线平滑地动 */
const DUR = { in: 2.4, out: 3.0 }

interface Row { ph: Phase; p: number; d: number; dir: string }
export default function Lesson5() {
  const T = useTasks('gewu:breath:5', TASKS)
  const [s, setS] = useState({ k: 0, p: P0, q: 0, moving: null as null | 'in' | 'out' })
  const [rows, setRows] = useState<Row[]>([])
  const [trace, setTrace] = useState<number[]>([])
  const sim = useRef({ k: 0, n: LUNG.rest, t: 0, mode: null as null | 'in' | 'out', from: 0, raf: 0, acc: 0, ui: 0, wasStill: false, trace: [] as number[] })
  useEffect(() => {
    let last = performance.now(), lastMode: null | 'in' | 'out' = null
    const f = (now: number) => {
      const S = sim.current, dt = Math.min(0.05, (now - last) / 1000); last = now
      const V0 = lungVolume(S.k)
      if (S.mode) {
        S.t += dt
        const D = DUR[S.mode], x = Math.min(1, S.t / D), e = (1 - Math.cos(Math.PI * x)) / 2
        S.k = S.mode === 'in' ? S.from + (1 - S.from) * e : S.from * (1 - e)
        if (x >= 1) S.mode = null
      }
      const r = breathStep(S.n, V0, lungVolume(S.k), dt); S.n = r.n
      S.acc += dt
      const still = !S.mode && diffPa(r.p) === 0
      if (S.acc > 0.08 && !(still && S.trace.at(-1) === 0)) { S.acc = 0; S.trace = [...S.trace.slice(-99), diffPa(r.p)]; setTrace(S.trace) }
      // 界面和场景每秒刷新约 30 次就够了（胸腔模型自己会平滑地跟）
      S.ui += dt; if ((S.ui > 0.033 && !(still && S.wasStill)) || !S.mode !== !lastMode) { S.wasStill = still; S.ui = 0; setS({ k: S.k, p: r.p, q: r.q, moving: S.mode }) }
      lastMode = S.mode
      S.raf = requestAnimationFrame(f)
    }
    sim.current.raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(sim.current.raf)
  }, [])
  const go = (m: 'in' | 'out') => { const S = sim.current; S.mode = m; S.t = 0; S.from = S.k }
  const d = diffPa(s.p), dir = flowDir(s.p)
  const phase: Phase | null = s.moving === 'in' ? 'in' : s.moving === 'out' ? 'out' : s.k > 0.999 && dir === 'none' ? 'hold' : null
  const record = () => {
    if (!phase || rows.some(r => r.ph === phase)) return
    const next = [...rows, { ph: phase, p: s.p, d, dir: dir === 'in' ? '流进肺' : dir === 'out' ? '流出肺' : '不流动' }]; setRows(next)
    T.check(id => next.some(r => r.ph === id))
  }
  const resetAll = () => { const S = sim.current; S.k = 0; S.n = LUNG.rest; S.mode = null; S.trace = []; setTrace([]); setRows([]); T.reset() }
  const task = T.current
  const has = (p: Phase) => rows.some(r => r.ph === p)
  const { hint, next }: { hint: string; next: 'in' | 'out' | 'rec' | null } = !task ? { hint: '肺内气压低于外界就吸气，高于外界就呼气；相等时气体不流动。', next: null }
    : task.id === 'in' ? (s.moving === 'in' ? { hint: '正在吸气：趁现在按“记录数据”', next: 'rec' } : s.k > 0.01 ? { hint: '先呼气，让胸廓回到原位', next: 'out' } : { hint: '从侧面看胸腔。按“吸气”，胸廓扩大', next: 'in' })
    : task.id === 'hold' ? (s.moving ? { hint: '等胸廓停住…', next: null } : s.k > 0.999 && dir === 'none' ? { hint: '胸廓停住了，气流也停了。按“记录数据”', next: 'rec' } : { hint: '再按“吸气”，吸到底停住', next: 'in' })
    : s.moving === 'out' ? { hint: '正在呼气：趁现在按“记录数据”', next: 'rec' } : { hint: '按“呼气”，胸廓缩小', next: 'out' }
  const labels: Label[] = [
    { id: 'pl', at: [-1.2, 13.4, 0.4], ax: 1, className: cn('scene-tag -translate-y-1/2', d < -2 || d > 2 ? 'key' : ''), children: <><small>肺内</small>{s.p.toFixed(2)} kPa</> },
    { id: 'p0', at: [0, 16.0, 2.5], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>外界</small>{P0.toFixed(2)} kPa</> },
    ...(dir !== 'none' ? [{ id: 'fl', at: [0, 16.25, 2.2] as [number, number, number], ax: 0.5, className: 'scene-tag -translate-y-full', children: dir === 'in' ? '空气流进来' : '气体流出去' }] : []),
  ]
  const W = 260, Hh = 90, mx = 110
  const path = trace.map((v, i) => `${i ? 'L' : 'M'}${(i / 99) * W},${Hh / 2 - (v / mx) * (Hh / 2)}`).join('')
  return (
    <LabShell title="呼吸" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="呼吸"
      stage={<Place at="side" labels={labels} want={{ rib: s.k, dia: s.k, look: { ...LOOK, lungs: 0.85 } }}>
        {dir === 'in' && <ForceArrow tip={[0, 16.2, 1.05]} dir={[0, -0.2, -1]} len={0.3 + Math.min(0.6, -d / 160)} color="#7fe3ff" />}
        {dir === 'out' && <ForceArrow tip={[0, 16.15, 2.0]} dir={[0, 0.1, 1]} len={0.3 + Math.min(0.6, d / 110)} color="#ffe9a8" />}
      </Place>}
      lesson={<LessonBlock no="5" title="吸气和呼气时的气压" concept="肺内气压低于外界就吸气，高于外界就呼气" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">吸气</b>：肋间肌和膈肌收缩 → 胸廓扩大 → 肺随着扩张 → 肺内气压低于外界气压 → 外界气体进入肺。</p>
          <p className="mt-3"><b className="text-white">呼气</b>：肋间肌和膈肌舒张 → 胸廓缩小 → 肺随着回缩 → 肺内气压高于外界气压 → 肺内气体排出。</p>
          <p className="mt-3">一定量的气体，温度不变时，体积越大压强越小。肺的容积一变大，里面的气压就降一点，空气马上流进来补上；所以平静呼吸时肺内气压只比外界低或高一点点。</p>
          <p className="mt-3 text-[13.5px] text-white/65">读数由一个简化的模型算出（平静呼气末肺里 2.5 L，一次吸进 0.5 L），是示意。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">吸气、停住、呼气各记了一次</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">肺内气压低于外界就吸气，高于外界就呼气，相等时不流动</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">{rows.map(r => `${PH_NAME[r.ph]} ${r.d > 0 ? '+' : ''}${r.d} Pa`).join('，')}。差得不多，空气就流得很顺。</p>
          <p className="mt-2 text-[12.5px] text-white/50">读数是示意模型算出的约数。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再试一试</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">肺内气压 − 外界气压</div>
            <div className="mt-1 text-[44px] leading-none font-bold tabular-nums">{d > 0 ? '+' : ''}{d}<span className="ml-1 text-[15px] font-medium text-white/55">Pa</span></div>
            <div className="mt-2 text-[14px] text-white/70">{dir === 'in' ? '比外界低 → 空气流进肺' : dir === 'out' ? '比外界高 → 气体流出肺' : '和外界相等 → 不流动'}</div>
          </div>
          <svg viewBox={`0 0 ${W} ${Hh}`} className="mt-3 w-full rounded-xl bg-white/[0.05]" aria-label="气压差随时间">
            <line x1="0" x2={W} y1={Hh / 2} y2={Hh / 2} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
            <path d={path} fill="none" stroke="#7fe3d4" strokeWidth="2" />
            <text x="4" y="12" fontSize="10" fill="rgba(255,255,255,0.5)">高于外界</text>
            <text x="4" y={Hh - 4} fontSize="10" fill="rgba(255,255,255,0.5)">低于外界</text>
          </svg>
          <div className="mt-2 text-[13px] text-white/60">肺的容积 <b className="text-white tabular-nums">{lungVolume(s.k).toFixed(2)}</b> L</div>
          <table className="mt-3 w-full text-center text-[13px] tabular-nums">
            <thead><tr className="text-white/55"><th className="pb-1 font-medium">什么时候</th><th className="pb-1 font-medium">肺内 kPa</th><th className="pb-1 font-medium">差 Pa</th><th className="pb-1 font-medium">气流</th></tr></thead>
            <tbody>{(['in', 'hold', 'out'] as Phase[]).map(ph => { const r = rows.find(x => x.ph === ph); return <tr key={ph} className={r ? 'row-in bg-white/10' : 'bg-white/[0.04]'}><td className="rounded-l-lg py-1.5">{PH_NAME[ph]}</td><td>{r ? r.p.toFixed(2) : '—'}</td><td className="font-semibold">{r ? `${r.d > 0 ? '+' : ''}${r.d}` : '—'}</td><td className="rounded-r-lg">{r ? r.dir : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'in'} pulse={next === 'in'} onClick={() => go('in')} disabled={!!s.moving || s.k > 0.999}>吸气</LabButton>
        <LabButton primary={next === 'out'} pulse={next === 'out'} onClick={() => go('out')} disabled={!!s.moving || s.k < 0.001}>呼气</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!phase || has(phase)}>记录数据</LabButton>
      </>}
      extras={null}
    />
  )
}
