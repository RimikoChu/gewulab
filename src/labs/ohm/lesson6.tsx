// 欧姆定律 · 第 6 课 串联和并联电路的电阻：岛式工作台东头。电源 3.0 V、开关、电流表，两只电阻 R₁ 10 Ω、R₂ 15 Ω，电压表接在接入的那一段两头。
// 只接 R₁、只接 R₂、两只串联、两只并联，各记一次电流，用 R = U/I 算出这一段的总电阻：串联 25 Ω 比哪只都大，并联 6 Ω 比哪只都小。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { COMBO_NAME, L6, U0, branchI, comboI, comboR, ohmR, readA, readV, type Combo } from './physics'
import { COMBO_AT, POS, Rig } from './rig'
import { f1, f2, useRun, useSettled } from './parts'
import { Readout, Table } from './views'
import { Bench, Place, toWorld } from './world'
import { add } from './gear'

const ORDER: Combo[] = ['r1', 'r2', 'series', 'parallel']
const TASKS: Task[] = [
  { id: 'r1', text: '只接 R₁（10 Ω），记下电流', note: `R₁：${f2(comboI('r1'))} A` },
  { id: 'r2', text: '只接 R₂（15 Ω），记下电流', note: `R₂：${f2(comboI('r2'))} A` },
  { id: 'series', text: '把 R₁、R₂ 串联，记下电流', note: `串联：电流只有 ${f2(comboI('series'))} A，总电阻 ${comboR('series')} Ω，比哪只都大` },
  { id: 'parallel', text: '把 R₁、R₂ 并联，记下电流', note: '' },
]
const W = (p: [number, number, number]) => toWorld('l6', p)

export default function Lesson6() {
  const [on, setOn] = useState(false)
  const [combo, setCombo] = useState<Combo>('r1')
  const [from, setFrom] = useState<Combo | null>(null)
  const [rows, setRows] = useState<{ c: Combo; u: number; i: number }[]>([])
  const T = useTasks('gewu:ohm:6', TASKS)
  const knife = useSlide(on ? 1 : 0, 2.6), live = knife > 0.99
  const move = useRun(2.0, () => { setFrom(null); setOn(true) })
  const I = comboI(combo), uR = readV(U0), iR = readA(I)
  const settled = useSettled(`${on}${combo}${from}`, 1300) && live && from === null
  const done = (c: Combo) => rows.some(r => r.c === c)
  const pick = (c: Combo) => { if (c === combo || move.busy) return; setOn(false); setFrom(combo); setCombo(c); setTimeout(() => move.run(), 500) }
  const record = () => { if (!settled || done(combo)) return; const n = [...rows, { c: combo, u: uR, i: iR }]; setRows(n); T.check(id => n.some(r => r.c === id)) }
  const resetAll = () => { setOn(false); setCombo('r1'); setFrom(null); move.snap(0); setRows([]); T.reset() }

  const task = T.current, want = task ? task.id as Combo : null
  const { hint, next }: { hint: string; next: 'switch' | 'pick' | 'record' | null } = !task ? { hint: '串联电路的总电阻比任何一个分电阻都大；并联电路的总电阻比任何一个分电阻都小。', next: null }
    : move.busy || from !== null ? { hint: '断开开关，重新接线…', next: null }
    : want !== combo ? { hint: `把接法换成“${COMBO_NAME[want!]}”`, next: 'pick' }
    : !on ? { hint: '闭合开关', next: 'switch' }
    : !settled ? { hint: '等指针停稳…', next: null }
    : { hint: `读两只表，按“记录数据”：${f1(uR)} V，${f2(iR)} A`, next: 'record' }

  const at = COMBO_AT[combo]
  const labels: Label[] = [
    { id: 'u', at: W(add(POS.VOLT, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>U</small>{f1(uR)} V</> },
    { id: 'i', at: W(add(POS.AMP, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>I</small>{f2(iR)} A</> },
    { id: 'r1', at: W(add(at.r1, [0, 3.6, 0])), ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: from ? 0 : 1 }, children: 'R₁' },
    { id: 'r2', at: W(add(at.r2, [0, 3.6, 0])), ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: from ? 0 : 1 }, children: 'R₂' },
  ]
  const { i2 } = branchI()
  return (
    <LabShell title="欧姆定律" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="电路"
      stage={<Place at="l6" labels={labels}>
        <Bench at="l6"><Rig mode="combo" combo={combo} from={from} k={move.k} knife={knife} I={I} U={U0} usup={U0} i2={i2} /></Bench>
      </Place>}
      lesson={<LessonBlock no="6" title="串联和并联的电阻" concept="串联电阻变大，并联电阻变小" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>电压不变时，电流越小，说明接入的电阻越大。用 R = U ÷ I 可以算出接入那一段的总电阻。</p>
          <p className="mt-3"><b className="text-white">串联电路的总电阻等于各电阻之和：R = R₁ + R₂</b>，相当于增加了导体的长度，所以比任何一个分电阻都大。</p>
          <p className="mt-3"><b className="text-white">并联电路的总电阻比任何一个分电阻都小</b>，相当于增大了导体的横截面积。两只电阻并联时，1/R = 1/R₁ + 1/R₂。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种接法都测过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">串联 {comboR('series')} Ω，比哪只都大；并联 {f1(comboR('parallel'))} Ω，比哪只都小</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">R₁ = {L6.R1} Ω，R₂ = {L6.R2} Ω；串联 R = R₁ + R₂，并联 1/R = 1/R₁ + 1/R₂。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <Readout u={live ? f1(uR) : '—'} i={live ? f2(iR) : '—'} dim={!settled} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="R₁" value={String(L6.R1)} unit="Ω" />
            <ParamTile symbol="R₂" value={String(L6.R2)} unit="Ω" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">数据</h2>
          <div className="mt-1.5"><Table head={['接法', 'U / V', 'I / A', 'R = U ÷ I']} rows={ORDER.filter(done).map(c => { const r = rows.find(x => x.c === c)!; return [COMBO_NAME[c], f1(r.u), f2(r.i), `${f1(ohmR(r.u, r.i))} Ω`] })} hl={ORDER.filter(done).indexOf(rows[rows.length - 1]?.c)} /></div>
          {!rows.length && <p className="mt-1 text-center text-[13px] text-white/45">还没有记录</p>}
          {/* 一条数轴：四个电阻排在上面，一眼看出串联最大、并联最小 */}
          {rows.length > 0 && <div className="mt-4">
            <div className="relative h-10">
              <div className="absolute inset-x-0 top-5 h-px bg-white/30" />
              {ORDER.filter(done).map(c => { const x = comboR(c) / 30 * 100; return <div key={c} className="absolute top-0 -translate-x-1/2 text-center text-[11.5px] whitespace-nowrap" style={{ left: `${x}%` }}><div className={c === 'series' || c === 'parallel' ? 'text-[#7fe3d4]' : 'text-white/70'}>{c === 'r1' ? 'R₁' : c === 'r2' ? 'R₂' : COMBO_NAME[c]}</div><div className="mx-auto mt-0.5 size-2 rounded-full bg-white" /></div> })}
            </div>
            <div className="flex justify-between text-[11px] text-white/45"><span>0 Ω</span><span>30 Ω</span></div>
          </div>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'switch'} pulse={next === 'switch'} onClick={() => setOn(o => !o)} disabled={(knife > 0.01 && knife < 0.99) || move.busy}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton primary={next === 'record'} pulse={next === 'record'} onClick={record} disabled={!settled || done(combo)}>记录数据</LabButton>
      </>}
      extras={
        <Control label="接法">
          <Segmented label="接法" pulse={next === 'pick'} want={next === 'pick' ? want : null} disabled={move.busy} value={combo} onChange={v => pick(v as Combo)} options={ORDER.map(c => ({ value: c, label: COMBO_NAME[c] }))} />
        </Control>
      }
    />
  )
}
