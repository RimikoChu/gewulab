// 血液循环 · 第 4 课 心脏怎样泵血：剖开的心脏一步一步跳：心房收缩、心室收缩、全心舒张；看瓣膜开合、红细胞往哪里走；
// 试着让血倒流，被关着的瓣膜挡住；最后按真实的节拍连续跳动，读出一次心跳 0.8 s。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useRef, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { CH_AT, VALVE_AT, beat, runPhase } from './heart'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { CHAMBERS, HR, PHASES, period, phaseAt, valves, type PhaseKey } from './physics'
import { onHeart } from './world'

const TASKS: Task[] = [
  { id: 'atria', text: '让心房收缩：血从心房进心室', note: '心房收缩，房室瓣开着，血被压进心室' },
  { id: 'ventricles', text: '让心室收缩：血射进动脉', note: '心室收缩，房室瓣关上、动脉瓣打开，血射进动脉' },
  { id: 'rest', text: '全心舒张：血从静脉流回心房', note: '心房和心室都舒张，静脉里的血流回心房，再流进心室' },
  { id: 'back', text: '让血倒流一下，看看流不流得回去', note: '瓣膜关上了，血流不回去：血只能从心房流向心室、从心室流向动脉' },
  { id: 'beat', text: '让心脏连续跳动，读出一次心跳用多长时间', note: `心率 ${HR} 次/分时，一次心跳 ${period().toFixed(1)} s` },
]
/** 每个时期放慢成几秒走完（示意，真实的时长写在面板上） */
const SLOW: Record<PhaseKey, number> = { atria: 2.4, ventricles: 3.0, rest: 3.2 }

export default function Lesson4() {
  const [step, setStep] = useState(0)                         // 下一个要做的时期
  const [busy, setBusy] = useState(false)
  const [shown, setShown] = useState<PhaseKey | null>(null)    // 刚做完或正在做的时期
  const [rev, setRev] = useState(false)
  const [live, setLive] = useState(false)
  const [, tick] = useState(0)
  const T = useTasks('gewu:blood:4', TASKS)
  const timer = useRef(0)
  useEffect(() => { beat.mode = 'manual'; beat.phase = 'rest'; beat.start = 0; beat.rev = false; return () => { clearTimeout(timer.current); beat.mode = 'auto'; beat.rev = false } }, [])
  // 连续跳动时，面板上的时期每秒刷新十次
  useEffect(() => { if (!live) return; const t = setInterval(() => tick(x => x + 1), 100); return () => clearInterval(t) }, [live])
  const doPhase = () => {
    if (busy || live) return
    const p = PHASES[step % 3].key
    runPhase(p, SLOW[p]); setShown(p); setBusy(true); setRev(false)
    timer.current = window.setTimeout(() => { setBusy(false); setStep(s => s + 1); T.check(id => id === p) }, SLOW[p] * 1000 + 200)
  }
  const doBack = () => {
    if (busy || live) return
    beat.mode = 'manual'; beat.phase = 'rest'; beat.start = performance.now() / 1000; beat.dur = 3; beat.rev = true
    setRev(true); setBusy(true); setShown(null)
    timer.current = window.setTimeout(() => { beat.rev = false; setBusy(false); T.check(id => id === 'back') }, 3600)
  }
  const doBeat = () => {
    if (busy) return
    if (live) { setLive(false); beat.mode = 'manual'; beat.phase = 'rest'; beat.start = 0; return }
    beat.mode = 'auto'; beat.slow = 1; beat.rev = false; setLive(true); setRev(false)
    timer.current = window.setTimeout(() => T.check(id => id === 'beat'), 2600)
  }
  const resetAll = () => { clearTimeout(timer.current); setStep(0); setBusy(false); setShown(null); setRev(false); setLive(false); beat.mode = 'manual'; beat.phase = 'rest'; beat.start = 0; beat.rev = false; T.reset() }
  const task = T.current
  const p3 = PHASES[step % 3]
  const cur: PhaseKey | null = live ? phaseAt(performance.now() / 1000).key : shown
  const v = rev ? { av: false, sl: false } : cur ? valves(cur) : { av: true, sl: false }
  const { hint, next }: { hint: string; next: 'phase' | 'back' | 'beat' | null } = !task ? { hint: '心房收缩 → 心室收缩 → 全心舒张，一次接一次。瓣膜保证血只能朝一个方向流。', next: null }
    : busy ? { hint: rev ? '血往回挤，可是房室瓣和动脉瓣都合上了…' : `${PHASES.find(p => p.key === shown)!.short}…看瓣膜和血往哪里走`, next: null }
    : ['atria', 'ventricles', 'rest'].includes(task.id) ? { hint: `按“${p3.name}”${step === 0 ? '：先让上面的两个心房收缩' : ''}`, next: 'phase' }
    : task.id === 'back' ? { hint: '三个时期都做过了。按“让血倒流”，看看血能不能从心室流回心房、从动脉流回心室', next: 'back' }
    : live ? { hint: `心脏按 ${HR} 次/分跳着，看面板上的时间轴`, next: null }
    : { hint: '按“连续跳动”，让心脏按真实的节拍跳起来', next: 'beat' }
  const tag = (open: boolean) => <span className={open ? 'text-[#0b8277]' : 'text-[#c0392b]'}>{open ? '开' : '关'}</span>
  const labels: Label[] = [
    ...(['ra', 'la', 'rv', 'lv'] as const).map(k => ({ id: k, at: onHeart(CH_AT[k]), ax: 0.5, className: 'scene-name -translate-y-1/2', children: CHAMBERS[k].name })),
    { id: 'avL', at: onHeart([VALVE_AT.avL[0] + 1.0, VALVE_AT.avL[1] + 0.1, 0]), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>房室瓣</small>{tag(v.av)}</> },
    { id: 'avR', at: onHeart([VALVE_AT.avR[0] - 1.0, VALVE_AT.avR[1] + 0.1, 0]), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>房室瓣</small>{tag(v.av)}</> },
    { id: 'sl', at: onHeart([VALVE_AT.slA[0] + 0.9, VALVE_AT.slA[1] + 0.6, 0]), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>动脉瓣</small>{tag(v.sl)}</> },
  ]
  const T0 = period(), sum = PHASES.reduce((s, p) => s + p.sec, 0)
  const at = live ? ((performance.now() / 1000) % T0) / T0 : null
  return (
    <LabShell title="血液循环" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="心脏"
      stage={<Place at="pump" labels={labels} want={{ look: { shell: 0.1, lungs: 0, tree: 0 }, heart: { cut: 1, flow: true }, stream: 'none' }} />}
      lesson={<LessonBlock no="4" title="心脏怎样泵血" concept="瓣膜让血只能朝一个方向流" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>心脏一刻不停地收缩和舒张。一次心跳分三个时期：</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">心房收缩</b>：血被压进心室。房室瓣开，动脉瓣关。</li>
            <li><b className="text-white">心室收缩</b>：房室瓣被冲得关上，动脉瓣被顶开，血射进动脉。</li>
            <li><b className="text-white">全心舒张</b>：静脉里的血流回心房，再流进心室。房室瓣开，动脉瓣关。</li>
          </ul>
          <p className="mt-3">房室瓣只能朝心室开，动脉瓣只能朝动脉开，所以血只能 静脉 → 心房 → 心室 → 动脉，不能倒流。</p>
          <p className="mt-3 text-[13.5px] text-white/65">按“下一步”时每个时期放慢成两三秒；“连续跳动”是真实的快慢。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">心脏跳起来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">瓣膜只朝一个方向开，血只能从心房流向心室、从心室流向动脉</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">心率 {HR} 次/分时，一次心跳 {T0.toFixed(1)} s：心房收缩 {PHASES[0].sec} s，心室收缩 {PHASES[1].sec} s，全心舒张 {PHASES[2].sec} s。</p>
          <p className="mt-2 text-[12.5px] text-white/50">红细胞画得比真的大得多；按步做时把每个时期放慢了。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{live ? `连续跳动 · ${HR} 次/分` : '现在'}</div>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight">{rev ? '让血倒流' : cur ? PHASES.find(p => p.key === cur)!.name : '静止'}</div>
            <div className="mt-2 text-[14px] text-white/70">{rev ? '两道瓣膜都合上了' : cur ? PHASES.find(p => p.key === cur)!.short : '按“下一步”开始'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white/8 px-3 py-2.5"><div className="text-[12px] text-white/55">房室瓣</div><div className={`mt-0.5 text-[22px] font-bold ${v.av ? 'text-[#7fe3d4]' : 'text-[#ff8a8f]'}`}>{v.av ? '开' : '关'}</div></div>
            <div className="rounded-xl bg-white/8 px-3 py-2.5"><div className="text-[12px] text-white/55">动脉瓣</div><div className={`mt-0.5 text-[22px] font-bold ${v.sl ? 'text-[#7fe3d4]' : 'text-[#ff8a8f]'}`}>{v.sl ? '开' : '关'}</div></div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">一次心跳（心率 {HR} 次/分）</h2>
          <div className="relative mt-2 flex h-9 overflow-hidden rounded-lg text-[12px]">
            {PHASES.map(p => <div key={p.key} style={{ width: `${p.sec / sum * 100}%` }} className={`grid place-items-center border-r border-black/30 ${cur === p.key && !rev ? 'bg-[#35c7b3] font-semibold text-[#06231f]' : 'bg-white/10 text-white/70'}`}>{p.sec} s</div>)}
            {at !== null && <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${at * 100}%` }} />}
          </div>
          <div className="mt-1 flex text-[11.5px] text-white/50">{PHASES.map(p => <span key={p.key} style={{ width: `${p.sec / sum * 100}%` }} className="text-center">{p.name}</span>)}</div>
          <div className="mt-3 rounded-xl bg-white/6 px-3 py-2.5 text-center"><span className="text-[13px] text-white/60">一次心跳 </span><span className="text-[22px] font-bold tabular-nums">{T.done.beat || live ? `${T0.toFixed(1)} s` : '—'}</span><span className="ml-2 text-[12.5px] text-white/50">= 60 s ÷ {HR}</span></div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'phase'} pulse={next === 'phase'} onClick={doPhase} disabled={busy || live}>{p3.name}</LabButton>
        <LabButton primary={next === 'back'} pulse={next === 'back'} onClick={doBack} disabled={busy || live || !T.done.rest}>让血倒流</LabButton>
        <LabButton primary={next === 'beat'} pulse={next === 'beat'} onClick={doBeat} disabled={busy || !T.done.back}>{live ? '停下' : '连续跳动'}</LabButton>
      </>}
      extras={null}
    />
  )
}
