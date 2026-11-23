// 电路 · 第 5 课 电压和电压表：折叠工作台上三只单节电池盒，用短导线首尾相连（串联电池组），后面一只电压表。
// 电压表的“−”接线柱接第一节的负极，另一根线接在第一、二或三节的正极上：读出一节 1.5 V、两节 3.0 V；
// 三节时用 0–3 V 量程，指针打过满刻度，换用 0–15 V 读出 4.5 V。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BLACK, BatteryBox, RED, add, boxLen, boxPosts } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Meter, meterPosts } from './meter'
import { Bench, Place, toWorld, useSettled } from './parts'
import { CELLS, RANGES, batteryU, meterRead, type Range } from './physics'
import { DialView } from './views'
import { Wire } from './wires'
import type { V3 } from './world'

type N = typeof CELLS[number]
const NAME: Record<N, string> = { 1: '一节', 2: '两节', 3: '三节' }
const TASKS: Task[] = [
  { id: 'c1', text: '把电压表并联在一节干电池两端（0–3 V），读数', note: `一节干电池的电压是 ${batteryU(1).toFixed(1)} V` },
  { id: 'c2', text: '换成两节串联，读数', note: `两节串联 ${batteryU(2).toFixed(1)} V = ${batteryU(1).toFixed(1)} V + ${batteryU(1).toFixed(1)} V` },
  { id: 'c3', text: '换成三节：指针超过了满刻度，换用 0–15 V，读数', note: `三节串联 ${batteryU(3).toFixed(1)} V：超过 3 V 就要用 0–15 V 量程` },
]
// 三只单节电池盒，从西到东；电压表在后面正中
const L1 = boxLen(1), BOX: V3[] = [-L1 - 1.6, 0, L1 + 1.6].map(x => [x, 0, 5] as V3), VM: V3 = [0, 0, -17]
const BP = boxPosts(1), MP = meterPosts()
const W = (p: V3) => toWorld('l5', p)

export default function Lesson5() {
  const [n, setN] = useState<N>(1)
  const [hooked, setHooked] = useState(false)
  const [range, setRange] = useState<Range>('lo')
  const T = useTasks('gewu:circuit:5', TASKS)
  const U = batteryU(n), m = meterRead('V', range, hooked ? U : 0)
  const settled = useSettled(`${n}${range}${hooked}`, 1400) && hooked
  useEffect(() => {
    if (!settled || m.over) return
    if (n === 1 && range === 'lo') T.check(id => id === 'c1')
    if (n === 2 && range === 'lo' && T.done.c1) T.check(id => id === 'c2')
    if (n === 3 && range === 'hi' && T.done.c2) T.check(id => id === 'c3')
  }, [settled, n, range])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setN(1); setHooked(false); setRange('lo'); T.reset() }
  const task = T.current
  const goal: N | null = !task ? null : task.id === 'c1' ? 1 : task.id === 'c2' ? 2 : 3
  const want = goal && goal !== n ? goal : null
  const { hint, next }: { hint: string; next: 'hook' | 'range' | 'n' | null } = !task ? { hint: '电压表要并联在被测的两点之间；一节干电池 1.5 V，串联电池组的电压等于各节电压之和。', next: null }
    : want ? { hint: `把电压表的另一根线接到第 ${want} 节的正极上（测${NAME[want]}）`, next: 'n' }
    : !hooked ? { hint: '电压表的“−”接电池负极，“3”接正极，和电池并联。按“接上电压表”', next: 'hook' }
    : !settled ? { hint: '指针在摆…', next: null }
    : m.over ? { hint: '指针打过了满刻度，电压超过 3 V 了！按“换用 0–15 V 量程”', next: 'range' }
    : (task.id === 'c1' || task.id === 'c2') && range === 'hi' ? { hint: '不到 3 V，换回 0–3 V 量程读得更准', next: 'range' }
    : { hint: '读数…', next: null }
  const vNeg = add(VM, MP.neg), vPlus = add(VM, range === 'lo' ? MP.lo : MP.hi)
  const first = add(BOX[0], BP.minus), end = add(BOX[n - 1], BP.plus)
  const labels: Label[] = [
    { id: 'r', at: W(add(VM, [0, 11.4, -2])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: settled ? 1 : 0 }, children: m.over ? <><small>电压</small>超过量程</> : <><small>电压</small>{U.toFixed(1)} V</> },
    ...BOX.map((b, i) => ({ id: `c${i}`, at: W(add(b, [0, 0.4, 3.2])), ax: 0.5, className: 'scene-name', style: { color: i < n && hooked ? '#7fe3d4' : undefined }, children: `第 ${i + 1} 节` })),
    { id: 'n1', at: W(add(VM, [-6.8, 9, -1])), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '电压表' },
  ]
  return (
    <LabShell title="电路" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="电压表"
      stage={<Place at="l5" labels={labels}>
        <Bench at="l5">
          {BOX.map((b, i) => <group key={i} position={b}><BatteryBox n={1} /></group>)}
          {/* 电池盒之间的短导线：前一节的正极接后一节的负极 */}
          {[0, 1].map(i => <Wire key={i} a={add(BOX[i], BP.plus)} b={add(BOX[i + 1], BP.minus)} color="#d8b33a" lift={2.2} />)}
          <group position={VM}><Meter kind="V" k={m.k} /></group>
          {hooked && <>
            <Wire a={vNeg} b={first} color={BLACK} via={[[-14, 0, -1]]} />
            <Wire key={`${n}${range}`} a={vPlus} b={end} color={RED} via={[[BOX[n - 1][0] + 2, 0, -1]]} />
          </>}
        </Bench>
      </Place>}
      lesson={<LessonBlock no="5" title="电压和电压表" concept="电压表要并联在被测的两点之间" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>电压是电路中形成电流的原因，电源是提供电压的装置。电压的符号是 <i className="font-formula">U</i>，单位是伏特（V），还有千伏（kV）、毫伏（mV）。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>电压表要和被测的那部分电路<b className="text-white">并联</b></li>
            <li>电流从“+”接线柱流入、从“−”接线柱流出</li>
            <li>被测电压不能超过量程，不知道多大时先用大量程试触</li>
            <li>电压表可以直接接在电源两极上，测的就是电源电压（电流表绝不允许这样接）</li>
          </ul>
          <p className="mt-3">常见的电压：一节干电池 1.5 V，家庭电路 220 V，对人体安全的电压不高于 36 V。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三次都读出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">电压表并联在电源两端，量程要选对</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">一节 {batteryU(1).toFixed(1)} V，两节 {batteryU(2).toFixed(1)} V，三节 {batteryU(3).toFixed(1)} V：串联电池组的电压等于各节电压之和。超过 3 V 要换 0–15 V 量程。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">电压表的示数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{settled && m.value !== null ? m.value.toFixed(1) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">V</span></div>
          </div>
          <DialView kind="V" range={range} k={m.k} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="量程" value={`0–${RANGES.V[range].max} V`} unit={range === 'lo' ? '接“−”和“3”' : '接“−”和“15”'} />
            <ParamTile symbol="分度值" value={`${RANGES.V[range].step} V`} unit="每一小格" />
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-1 text-center text-[13px] tabular-nums">
            {CELLS.map(k => <li key={k} className="rounded-lg bg-white/6 px-0.5 py-2" style={{ color: T.done[`c${k}`] ? '#7fe3d4' : 'rgb(255 255 255 / 0.45)' }}>{NAME[k]} · {T.done[`c${k}`] ? `${batteryU(k).toFixed(1)} V` : '—'}</li>)}
          </ul>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'hook'} pulse={next === 'hook'} onClick={() => setHooked(h => !h)}>{hooked ? '拿开电压表' : '接上电压表'}</LabButton>
        <LabButton primary={next === 'range'} pulse={next === 'range'} onClick={() => setRange(r => r === 'lo' ? 'hi' : 'lo')}>{range === 'lo' ? '换用 0–15 V 量程' : '换用 0–3 V 量程'}</LabButton>
      </>}
      extras={
        <Control label="电压表测">
          <Segmented label="电压表测" pulse={next === 'n'} want={want ? String(want) as '1' | '2' | '3' : null} value={String(n) as '1' | '2' | '3'} onChange={v => setN(Number(v) as N)} options={CELLS.map(k => ({ value: String(k) as '1' | '2' | '3', label: NAME[k] }))} />
        </Control>
      }
    />
  )
}
