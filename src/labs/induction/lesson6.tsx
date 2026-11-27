// 电磁感应和电网 · 第 6 课 变压器：升压站里剖开的主变压器。合上低压侧断路器（空载）读 U₂；接上 11 MW 的线路负载读 I₁、I₂；
// 负载减到一半；断开负载看原线圈的电流。匝数比决定电压比，理想变压器输入功率等于输出功率。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { LOADS, TF, kv, transformer, watt } from './physics'
import { Rig6 } from './scene6'
import { TK } from './tf'
import { Place } from './world'
import { YARD } from './layout'
import { useSettled, useTick } from './anim'

type Ld = keyof typeof LOADS
const full = transformer(LOADS.full), half = transformer(LOADS.half)
const TASKS: Task[] = [
  { id: 'on', text: '合上低压侧断路器（副线圈空载）', note: `U₂ = U₁ × n₂/n₁ = 10 kV × 11 = ${kv(full.U2)}` },
  { id: 'load', text: '接上 11 MW 的线路负载', note: `I₁ = ${full.I1.toFixed(0)} A，I₂ = ${full.I2.toFixed(0)} A：电流比是匝数比的倒数，P₁ = P₂` },
  { id: 'half', text: '把负载减到一半', note: `两侧电流都减半：I₁ = ${half.I1.toFixed(0)} A，I₂ = ${half.I2.toFixed(0)} A` },
  { id: 'off', text: '断开负载，看原线圈的电流', note: '副线圈不输出功率，原线圈的电流几乎为零：输入功率由输出功率决定' },
]
const [TX, , TZ] = YARD.tf

export default function Lesson6() {
  const [on, setOn] = useState(false)
  const [load, setLoad] = useState(false)
  const [size, setSize] = useState<Ld>('full')
  const T = useTasks('gewu:induction:6', TASKS)
  const tick = useTick(1000, on), sgn = tick % 2 ? -1 : 1
  const P = on && load ? LOADS[size] : 0, t = transformer(P)
  const ok = useSettled(`${on}${load}${size}`, 1800)
  useEffect(() => {
    if (!ok) return
    T.check(id => (id === 'on' && on && !load) || (id === 'load' && on && load && size === 'full' && !!T.done.on) || (id === 'half' && on && load && size === 'half' && !!T.done.load) || (id === 'off' && on && !load && !!T.done.half))
  }, [ok])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setOn(false); setLoad(false); setSize('full'); T.reset() }

  const task = T.current
  type Next = 'on' | 'load' | 'size' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: 'U₁/U₂ = n₁/n₂；理想变压器 P₁ = P₂，输入功率由输出功率决定。', next: null }
    if (!on) return { hint: '合上低压侧断路器', next: 'on' }
    if (!ok) return { hint: !load ? (T.done.half ? '负载断开了，看原线圈的电流…' : '断路器合上了，看高压侧的电压…') : size === 'full' ? '接上 11 MW 负载，看两侧的电流…' : '负载减到一半，看两侧的电流…', next: null }
    if (task.id === 'on') return { hint: '先断开负载', next: 'load' }
    if (task.id === 'load') return size !== 'full' ? { hint: '把负载选成 11 MW', next: 'size' } : { hint: '接上 11 MW 的线路负载', next: 'load' }
    if (task.id === 'half') return !load ? { hint: '接上负载', next: 'load' } : { hint: '把负载减到 5.5 MW', next: 'size' }
    return { hint: '断开负载，看原线圈的电流', next: 'load' }
  })()

  const labels: Label[] = [
    { id: 'u1', at: [TX - TK.L / 2 - 0.1, 1.6, TZ + 0.4], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>U₁</small>{on ? kv(TF.U1) : '0'}</> },
    { id: 'u2', at: [TX + 0.2, TK.H + 2.6, TZ + 0.35], ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>U₂</small>{on ? kv(t.U2) : '0'}</> },
    { id: 'n1', at: [TX, 0.9, TZ + 1.05], ax: 0.5, name: true, className: 'scene-name -translate-y-1/2', children: '内层低压绕组 · 外层高压绕组' },
    { id: 'n2', at: [TX - 1.25, TK.H + 2.4, TZ + 0.35], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '高压套管' },
    { id: 'n3', at: [TX + 1.6, 1.0, TZ + 1.0], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '铁芯' },
  ]
  return (
    <LabShell title="电磁感应和电网" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="主变压器"
      stage={<Place at="l6" cur="l6" labels={labels}><Rig6 flux={on ? sgn : 0} i1={on ? sgn * (0.06 + t.I1 / full.I1) : 0} i2={on && load ? sgn * t.I2 / full.I2 : 0} /></Place>}
      lesson={<LessonBlock no="6" title="变压器" concept="匝数比决定电压比，输入功率等于输出功率" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>变压器由闭合铁芯和绕在铁芯上的两个线圈组成。原线圈接交流电源，铁芯中产生交变的磁通量，穿过副线圈，在副线圈中产生感应电动势：这就是<b className="text-white">互感</b>。</p>
          <p className="mt-3">每匝线圈里的感应电动势相同，所以 <span className="font-formula italic">U₁/U₂ = n₁/n₂</span>。n₂ &gt; n₁ 是升压变压器，n₂ &lt; n₁ 是降压变压器。</p>
          <p className="mt-3">没有能量损失的变压器叫理想变压器，P₁ = P₂，所以 I₁/I₂ = n₂/n₁。电流大的低压线圈用粗导线，匝数少；高压线圈导线细，匝数多。</p>
          <p className="mt-3">变压器只能改变交流电压：恒定电流产生的磁通量不变，副线圈里没有感应电动势。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">合闸、接负载、减负载、断负载都做过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">U₁/U₂ = n₁/n₂，理想变压器 P₁ = P₂</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">匝数比 1 : 11，10 kV 升到 110 kV；送 11 MW 时低压侧 {full.I1.toFixed(0)} A、高压侧只有 {full.I2.toFixed(0)} A。副线圈不用电，原线圈也几乎不取电。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">U₁ / U₂ = n₁ / n₂</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{on ? (t.U2 / 1e3).toFixed(0) : '0'}<span className="ml-1 text-[15px] font-medium text-white/55">kV</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">{on ? (load ? `送出 ${watt(P)}：P₁ = P₂` : '副线圈空载') : '断路器断开'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="n₁ : n₂" value={`${TF.n1} : ${TF.n2}`} unit="匝数比" />
            <ParamTile symbol="U₁" value={on ? (TF.U1 / 1e3).toFixed(0) : '0'} unit="kV · 低压侧（发电机）" />
            <ParamTile symbol="I₁" value={on ? t.I1.toFixed(0) : '0'} unit="A · 低压侧电流" />
            <ParamTile symbol="I₂" value={on ? t.I2.toFixed(0) : '0'} unit="A · 高压侧电流" />
            <ParamTile symbol="P₁" value={on ? watt(t.P1) : '0'} unit="输入功率" />
            <ParamTile symbol="P₂" value={on ? watt(t.P2) : '0'} unit="输出功率" />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'on'} pulse={next === 'on'} onClick={() => { setOn(o => !o); setLoad(false) }}>{on ? '断开断路器' : '合上断路器'}</LabButton>
        <LabButton primary={next === 'load'} pulse={next === 'load'} onClick={() => setLoad(l => !l)} disabled={!on}>{load ? '断开负载' : '接上负载'}</LabButton>
      </>}
      extras={<Control label="负载"><Segmented label="负载" pulse={next === 'size'} want={next === 'size' ? (task?.id === 'half' ? 'half' : 'full') : null} value={size} onChange={k => setSize(k as Ld)} options={[{ value: 'full', label: '11 MW' }, { value: 'half', label: '5.5 MW' }]} /></Control>}
    />
  )
}
