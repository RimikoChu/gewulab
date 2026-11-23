// 电路 · 第 3 课 电流和电流表：电池盒、开关、灯泡 L₁ 和一只电流表串成一圈，电流表在正中。
// 先用“−”和“3”（0–3 A）试触：指针只偏一点，读不准；改用“−”和“0.6”（0–0.6 A）：指针偏到一半，读出 0.30 A；
// 最后把正负接线柱接反：指针往左打到头。换接线时开关先断开。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { BLACK, BatteryBox, KnifeSwitch, Lamp, RED, add, boxPosts, lampPosts, switchPosts } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Meter, meterPosts } from './meter'
import { Bench, Place, toWorld, useSettled } from './parts'
import { RANGES, brightness, lessonThreeI, LAMP, U0, meterRead } from './physics'
import { DialView, Schematic } from './views'
import { Wire } from './wires'
import type { V3 } from './world'

type Hook = 'hi' | 'lo' | 'rev'
const HOOK: Record<Hook, string> = { hi: '“−”和“3”', lo: '“−”和“0.6”', rev: '正负接反' }
const I = lessonThreeI()
const TASKS: Task[] = [
  { id: 'hi', text: '用“−”和“3”两个接线柱（0–3 A），闭合开关试触', note: `指针只偏了一小格多：${I.toFixed(1)} A 在 0–3 A 量程里太小，读不准` },
  { id: 'lo', text: '改用“−”和“0.6”（0–0.6 A），读出电流', note: `指针偏到一半，读下面一排刻度：${I.toFixed(2)} A` },
  { id: 'rev', text: '把正负接线柱接反，闭合开关看指针', note: '指针往左偏，打到头：电流要从“+”接线柱流进、从“−”接线柱流出' },
]
const BAT: V3 = [-13, 0, 7], SW: V3 = [11, 0, 8], LAMP_AT: V3 = [12, 0, -7], MET: V3 = [-2, 0, -6]
const BP = boxPosts(2), LP = lampPosts(), SP = switchPosts(), MP = meterPosts()
const W = (p: V3) => toWorld('l3', p)

export default function Lesson3() {
  const [hook, setHook] = useState<Hook>('hi')
  const [on, setOn] = useState(false)
  const [rec, setRec] = useState(false)
  const T = useTasks('gewu:circuit:3', TASKS)
  const knife = useSlide(on ? 1 : 0, 2.6), live = knife > 0.99
  const range = hook === 'hi' ? 'hi' : 'lo', m = meterRead('A', range, live ? I : 0, hook === 'rev')
  const settled = useSettled(`${hook}${on}`, 1400) && live
  useEffect(() => {
    if (!settled) return
    if (hook === 'hi') T.check(id => id === 'hi')
    if (hook === 'rev' && T.done.lo) T.check(id => id === 'rev')
  }, [settled, hook])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (h: Hook) => { if (h === hook) return; setOn(false); setRec(false); setHook(h) }
  const record = () => { setRec(true); T.check(id => id === 'lo') }
  const resetAll = () => { setHook('hi'); setOn(false); setRec(false); T.reset() }
  const task = T.current
  const want: Hook | null = task && task.id !== hook ? task.id as Hook : null
  const { hint, next }: { hint: string; next: 'sw' | 'rec' | 'hook' | null } = !task ? { hint: '电流表要串联，电流从“+”进、从“−”出；不知道电流多大，先用大量程试触。', next: null }
    : want ? { hint: task.id === 'lo' ? '指针偏得太小，读不准。换成“−”和“0.6”两个接线柱' : '再试一试：把电流表的正负接线柱接反', next: 'hook' }
    : !on ? { hint: hook === 'hi' ? '电流表串联在电路里，接的是“−”和“3”。按“闭合开关”试触' : hook === 'rev' ? '电流现在从“−”接线柱流进去。按“闭合开关”，马上看指针' : '按“闭合开关”', next: 'sw' }
    : !settled ? { hint: '指针在摆…', next: null }
    : task.id === 'lo' ? { hint: `用的是 0–0.6 A，看下面一排刻度，每小格 ${RANGES.A.lo.step} A。按“记下读数”`, next: 'rec' }
    : { hint: '', next: null }
  const lA = add(LAMP_AT, LP.a), lB = add(LAMP_AT, LP.b), sA = add(SW, SP.a), sB = add(SW, SP.b), bPlus = add(BAT, BP.plus), bMinus = add(BAT, BP.minus)
  const plusPost = add(MET, hook === 'hi' ? MP.hi : MP.lo), negPost = add(MET, MP.neg)
  const [into, outOf] = hook === 'rev' ? [negPost, plusPost] : [plusPost, negPost]
  const lit = live ? brightness(U0, LAMP.L1) : 0
  const labels: Label[] = [
    { id: 'r', at: W(add(MET, [0, 11.4, -2])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: rec && hook === 'lo' && live ? 1 : 0 }, children: <><small>电流</small>{I.toFixed(2)} A</> },
    { id: 'w', at: W(add(MET, [0, 11.4, -2])), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: settled && (hook === 'rev' || hook === 'hi') ? 1 : 0 }, children: hook === 'rev' ? <><small>指针</small>反向偏转</> : <><small>指针</small>偏得太小</> },
    { id: 'n1', at: W(add(MET, [-6.8, 9, -1])), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '电流表' },
    { id: 'n2', at: W(add(LAMP_AT, [0, 4.6, 0])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: 'L₁' },
    { id: 'n3', at: W(add(BAT, [0, 4.8, 0])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电池盒' },
  ]
  return (
    <LabShell title="电路" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="电路"
      stage={<Place at="l3" labels={labels}>
        <Bench at="l3">
          <group position={BAT}><BatteryBox n={2} /></group>
          <group position={SW}><KnifeSwitch on={knife} /></group>
          <group position={LAMP_AT}><Lamp lit={lit} name="L₁" /></group>
          <group position={MET}><Meter kind="A" k={m.k} /></group>
          <Wire a={bPlus} b={sA} color={RED} flow={live ? I : 0} />
          <Wire a={sB} b={lB} color="#d8b33a" flow={live ? I : 0} via={[[18, 0, 0]]} />
          <Wire key={`a${hook}`} a={lA} b={into} color={RED} flow={live ? I : 0} via={[[6, 0, 0.5]]} />
          <Wire key={`b${hook}`} a={outOf} b={bMinus} color={BLACK} flow={live ? I : 0} via={[[-13, 0, 0.5], [-22, 0, 2]]} />
        </Bench>
      </Place>}
      lesson={<LessonBlock no="3" title="电流和电流表" concept="电流表要串联，电流从“+”进、从“−”出" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>电流表示电流的强弱，符号 <i className="font-formula">I</i>，单位是安培（A），常用的还有毫安（mA）：1 A = 1000 mA。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>电流表要和被测的用电器<b className="text-white">串联</b></li>
            <li>电流要从“+”接线柱流入、从“−”接线柱流出</li>
            <li>被测电流不能超过量程；不知道多大时，先用大量程<b className="text-white">试触</b>，再选合适的量程</li>
            <li>绝不允许不经过用电器，把电流表直接接到电源两极上</li>
          </ul>
          <p className="mt-3">读数：先看接的是哪个量程，再看这个量程的分度值。0–0.6 A 每小格 0.02 A，0–3 A 每小格 0.1 A；指针在同一个位置，大量程的读数是小量程的 5 倍。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">电流表会用了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">电流表串联在电路里，电流从“+”进、“−”出，先试触再选量程</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">通过 L₁ 的电流是 {I.toFixed(2)} A。用 0–3 A 时指针只偏一小格多，用 0–0.6 A 读得准；接反了指针往左打，会损坏电流表。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">电流表的示数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{settled && m.value !== null ? m.value.toFixed(range === 'lo' ? 2 : 1) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">A</span></div>
          </div>
          <DialView kind="A" range={range} k={m.k} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="量程" value={`0–${RANGES.A[range].max} A`} unit={hook === 'rev' ? '“0.6”和“−”接反了' : `接 ${HOOK[hook]}`} />
            <ParamTile symbol="分度值" value={`${RANGES.A[range].step} A`} unit="每一小格" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">电路图</h2>
          <Schematic link="single" on={on} lit1={lit} amp="loop" hot={{ main: live }} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'sw'} pulse={next === 'sw'} onClick={() => { setOn(o => !o); setRec(false) }}>{on ? '断开开关' : '闭合开关'}</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!(settled && hook === 'lo') || rec}>记下读数</LabButton>
      </>}
      extras={
        <Control label="电流表接的接线柱">
          <Segmented label="电流表接的接线柱" pulse={next === 'hook'} want={want} value={hook} onChange={pick} options={(['hi', 'lo', 'rev'] as Hook[]).map(h => ({ value: h, label: HOOK[h] }))} />
        </Control>
      }
    />
  )
}
