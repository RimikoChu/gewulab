// 欧姆定律 · 第 3 课 欧姆定律：后墙东头的工作台。电源的电压可以调，电路里没有变阻器：电源、开关、电流表、一只电阻串成一圈，电压表接在电阻两端。
// 四道题，每道先选出答案，再调电源、闭合开关，用电表验证：I = U/R，U = IR，R = U/I，电阻不随电压改变。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Q3, U0, round, loop, ohmI, ohmR, ohmU, readA, readV, type Q3Id } from './physics'
import { POS, Rig } from './rig'
import { Boards, PartsTray, type Item } from './swap'
import { f1, f2, useRun, useSettled, useTween } from './parts'
import { Readout } from './views'
import { Bench, Place, toWorld } from './world'
import { add } from './gear'

const TASKS: Task[] = [
  { id: 'i', text: '10 Ω 接在 3.0 V 上：先算电流，再验证', note: 'I = U ÷ R = 3.0 V ÷ 10 Ω = 0.3 A，电流表也是 0.30 A' },
  { id: 'u', text: '20 Ω 要通过 0.1 A：先算电压，再验证', note: 'U = I R = 0.1 A × 20 Ω = 2 V，电流表 0.10 A' },
  { id: 'r', text: '一只没标阻值的电阻：读两只表，算电阻', note: 'R = U ÷ I = 2.4 V ÷ 0.3 A = 8 Ω' },
  { id: 'same', text: '把电压调到 1.6 V：电阻变不变？', note: '1.6 V ÷ 0.2 A 还是 8 Ω：电阻不随电压改变' },
]
/** 每道题用哪只电阻 */
const BOARD: Record<Q3Id, string> = { i: 'r10', u: 'r20', r: 'rx', same: 'rx' }
const ITEMS: Item[] = [
  { key: 'r10', tag: 'R = 10 Ω', print: ['5W', '10ΩJ'], home: [-20, 0.4, 26] },
  { key: 'r20', tag: 'R = 20 Ω', print: ['5W', '20ΩJ'], home: [-4, 0.4, 26] },
  { key: 'rx', tag: 'R = ?', print: ['5W'], home: [12, 0.4, 26] },
]
const R_OF: Record<string, number> = { r10: Q3[0].R, r20: Q3[1].R, rx: Q3[2].R }
const ASK_FIRST = new Set<Q3Id>(['i', 'u'])
const W = (p: [number, number, number]) => toWorld('l3', p)

export default function Lesson3() {
  const [on, setOn] = useState(false)
  const [board, setBoard] = useState('r10')
  const [from, setFrom] = useState<string | null>(null)
  const [picked, setPicked] = useState<Partial<Record<Q3Id, string>>>({})
  const T = useTasks('gewu:ohm:3', TASKS)
  const sup = useTween(U0, 0.8)
  const knife = useSlide(on ? 1 : 0, 2.6), live = knife > 0.99
  const swap = useRun(1.8, () => setFrom(null))
  const c = loop(R_OF[board], 0, sup.x), uR = readV(c.U), iR = readA(c.I)
  const settled = useSettled(`${on}${board}${sup.x.toFixed(3)}`, 1300) && live && !sup.moving
  const task = T.current, q = Q3.find(x => x.id === task?.id)
  const right = q ? picked[q.id] === q.answer : false
  const wrong = q ? picked[q.id] !== undefined && !right : false
  const atU = q ? Math.abs(sup.x - q.U) < 1e-6 : false
  // 条件都满足了（答对、电源调好、开关合上、指针停稳），这一题就算做完
  useEffect(() => { if (q && right && board === BOARD[q.id] && atU && settled && from === null) T.check(id => id === q.id) }, [q?.id, right, board, atU, settled, from])   // eslint-disable-line react-hooks/exhaustive-deps
  const doSwap = () => { if (!q || swap.busy || board === BOARD[q.id]) return; setOn(false); setFrom(board); setBoard(BOARD[q.id]); setTimeout(() => swap.run(), 500) }
  const resetAll = () => { setOn(false); setBoard('r10'); setFrom(null); swap.snap(0); sup.snap(U0); setPicked({}); T.reset() }

  type Next = 'swap' | 'ask' | 'sup' | 'switch' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!q) return { hint: '导体中的电流，跟导体两端的电压成正比，跟导体的电阻成反比：I = U ÷ R。', next: null }
    if (swap.busy || from !== null) return { hint: '断开开关，换电阻…', next: null }
    if (board !== BOARD[q.id]) return { hint: q.id === 'u' ? '换下一只电阻：20 Ω' : '换下一只电阻：一只没标阻值的', next: 'swap' }
    const ask = (): { hint: string; next: Next } => wrong ? {
      hint: q.id === 'i' ? '不对：I = U ÷ R，用 3.0 V 除以 10 Ω。再选一次' : q.id === 'u' ? '不对：U = I R，用 0.1 A 乘 20 Ω。再选一次' : q.id === 'r' ? '不对：R = U ÷ I，用 2.4 V 除以 0.3 A。再选一次' : '不对：算一算 1.6 V ÷ 0.2 A。再选一次', next: 'ask' }
      : { hint: q.id === 'i' ? '10 Ω 的电阻接在 3.0 V 上，电流是多少？先算一算' : q.id === 'u' ? '要让 20 Ω 的电阻通过 0.1 A 的电流，电压要多大？先算一算' : q.id === 'r' ? `电压表 ${f1(uR)} V，电流表 ${f2(iR)} A。这只电阻多大？` : `电压降到 ${f1(uR)} V，电流变成 ${f2(iR)} A。电阻变了没有？`, next: 'ask' }
    if (ASK_FIRST.has(q.id) && !right) return ask()
    if (!atU) return { hint: q.id === 'same' ? '电阻不换，把电源调到 1.6 V' : `把电源调到 ${f1(q.U)} V`, next: 'sup' }
    if (sup.moving) return { hint: '调电源…', next: null }
    if (!on) return { hint: q.id === 'i' ? '算出来是 0.3 A。闭合开关，用电流表验证' : q.id === 'u' ? '电源是 2.0 V 了。闭合开关验证' : '闭合开关，读两只表', next: 'switch' }
    if (!settled) return { hint: '等指针停稳…', next: null }
    if (!right) return ask()
    return { hint: '对上了。', next: null }
  })()

  const labels: Label[] = [
    { id: 'u', at: W(add(POS.VOLT, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>U</small>{f1(uR)} V</> },
    { id: 'i', at: W(add(POS.AMP, [0, 13.5, -3])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: live ? 1 : 0 }, children: <><small>I</small>{f2(iR)} A</> },
    { id: 'n1', at: W(add(POS.SUP, [6, 12.5, 0])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电源（电压可调）' },
    { id: 'n2', at: W([-4, 2, 30]), ax: 0.5, name: true, className: 'scene-name', children: '换用的电阻' },
  ]
  const lines: { id: Q3Id; f: string }[] = [
    { id: 'i', f: `I = U ÷ R = ${f1(Q3[0].U)} V ÷ ${Q3[0].R} Ω = ${round(ohmI(Q3[0].U, Q3[0].R), 2)} A` },
    { id: 'u', f: `U = I R = 0.1 A × ${Q3[1].R} Ω = ${round(ohmU(0.1, Q3[1].R), 2)} V` },
    { id: 'r', f: `R = U ÷ I = ${f1(Q3[2].U)} V ÷ 0.3 A = ${round(ohmR(Q3[2].U, 0.3), 2)} Ω` },
    { id: 'same', f: `R = ${f1(Q3[3].U)} V ÷ 0.2 A = ${round(ohmR(Q3[3].U, 0.2), 2)} Ω（不变）` },
  ]
  return (
    <LabShell title="欧姆定律" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="电路"
      stage={<Place at="l3" labels={labels}>
        <Bench at="l3"><Rig mode="direct" knife={knife} I={c.I} U={c.U} usup={sup.x} knob={sup.x / U0} elWires={from === null}
          spare={<PartsTray />} el={<Boards items={ITEMS} at={board} from={from} k={swap.k} />} /></Bench>
      </Place>}
      lesson={<LessonBlock no="3" title="欧姆定律" concept="电流等于电压除以电阻" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>把前两课的结论合在一起：<b className="text-white">导体中的电流，跟导体两端的电压成正比，跟导体的电阻成反比。</b>这就是欧姆定律，写成 I = U ÷ R。</p>
          <p className="mt-3">U 的单位是伏（V），R 的单位是欧（Ω），算出来的 I 的单位是安（A）。知道其中两个量，就能求第三个：U = I R，R = U ÷ I。</p>
          <p className="mt-3 text-[13.5px] text-white/65">R = U ÷ I 只是算电阻的方法。电阻是导体本身的性质，电压变了，电流跟着变，两者的比值不变；不能说电阻跟电压成正比。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四道题都验证过了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">I = U ÷ R：电流跟电压成正比，跟电阻成反比</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">知道两个量就能求第三个；电压从 2.4 V 降到 1.6 V，电阻还是 8 Ω。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <Readout u={live ? f1(uR) : '—'} i={live ? f2(iR) : '—'} dim={!settled} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="R" value={board === 'rx' && !T.done.r ? '?' : String(R_OF[board])} unit="Ω · 接在电路里" />
            <ParamTile symbol="U电源" value={f2(sup.x)} unit="V" />
          </div>
          <div className="mt-4 text-center font-formula text-[22px] italic text-white/80">I = U ÷ R</div>
          <h2 className="mt-3 text-[12.5px] text-white/55">算一算，再验证</h2>
          <ol className="mt-2 flex flex-col gap-1.5 text-[13.5px] tabular-nums">
            {lines.map((l, k) => <li key={l.id} className={`rounded-lg px-2.5 py-1.5 ${T.done[l.id] ? 'bg-[#35c7b3]/15 text-white' : q?.id === l.id ? 'bg-white/10 text-white/85' : 'bg-white/[0.04] text-white/40'}`}>{k + 1}. {T.done[l.id] ? l.f : q?.id === l.id ? '先选出答案…' : '—'}</li>)}
          </ol>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'switch'} pulse={next === 'switch'} onClick={() => setOn(o => !o)} disabled={(knife > 0.01 && knife < 0.99) || swap.busy}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton pulse={next === 'sup'} onClick={() => q && sup.go(q.U)} disabled={!q || atU || sup.moving || (ASK_FIRST.has(q.id) && !right)}>调电源到 {f1(q?.U ?? U0)} V</LabButton>
        <LabButton pulse={next === 'swap'} onClick={doSwap} disabled={!q || board === BOARD[q.id] || swap.busy}>换下一只电阻</LabButton>
      </>}
      extras={q &&
        <Control label={q.ask === 'I' ? '电流 I =' : q.ask === 'U' ? '电压 U =' : q.ask === 'R' ? '电阻 R =' : '电阻'}>
          <Segmented label="选出答案" pulse={next === 'ask'} want={next === 'ask' ? q.answer : null} disabled={next !== 'ask' && !wrong} value={picked[q.id] ?? 'none'} onChange={v => setPicked(s => ({ ...s, [q.id]: v }))} options={q.options.map(o => ({ value: o, label: o }))} />
        </Control>
      }
    />
  )
}
