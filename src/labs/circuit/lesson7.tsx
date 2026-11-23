// 电路 · 第 7 课 电阻和滑动变阻器：楼梯口的小工作台上，后面一块电阻示教板（四根金属丝），前面一排电池盒、开关、电流表、灯泡 L₁ 和一只滑动变阻器。
// 两根导线把示教板上的一根金属丝（或变阻器）串进电路：比电流的大小就知道电阻的大小——电流越小，电阻越大。
// 最后接上滑动变阻器（一上一下），把滑片从阻值最大的一端移到另一端，电流从 0.10 A 变到 0.30 A，灯越来越亮。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { BLACK, BatteryBox, Board, KnifeSwitch, Lamp, RED, Rheostat, add, boardPosts, boxPosts, lampPosts, rheoPosts, sliderX, switchPosts, BOARD } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Meter, meterPosts } from './meter'
import { Bench, Place, toWorld, useSettled } from './parts'
import { RHEO, WIRES, boardI, lampLit, meterRead, rheoI, rheoR, round, type WireKey } from './physics'
import { DialView, Schematic, Table } from './views'
import { Wire } from './wires'
import type { V3 } from './world'

type Pick = WireKey | 'rheo'
const f2 = (x: number) => x.toFixed(2)
const TASKS: Task[] = [
  { id: 'a', text: '把 a 接进电路，记下电流', note: `a：${f2(boardI('a'))} A` },
  { id: 'b', text: '换成 b（长度减半），记下电流', note: `b 的电流 ${f2(boardI('b'))} A 比 a 大：材料、粗细相同时，导体越短电阻越小` },
  { id: 'c', text: '换成 c（横截面积加倍），记下电流', note: `c 的电流 ${f2(boardI('c'))} A 比 a 大：材料、长度相同时，导体越粗电阻越小` },
  { id: 'd', text: '换成 d（换一种材料），记下电流', note: `d 的电流 ${f2(boardI('d'))} A 比 a 大：长度、粗细相同时，电阻和材料有关` },
  { id: 'rheo', text: '换成滑动变阻器，把滑片从阻值最大的一端移到另一端', note: `电流从 ${f2(rheoI(1))} A 变到 ${f2(rheoI(0))} A：滑片移动改变了接入电路的线圈长度` },
]
const PICKS: Pick[] = ['a', 'b', 'c', 'd', 'rheo']
const BRD: V3 = [0, 0, -13], BAT: V3 = [-26, 0, 10], SW: V3 = [-9, 0, 13], MET: V3 = [7, 0, 7], LAMP_AT: V3 = [23, 0, 12], RHE: V3 = [2, 0, 28]
const BP = boxPosts(2), SP = switchPosts(), MP = meterPosts(), LP = lampPosts(), RP = rheoPosts()
const W = (p: V3) => toWorld('l7', p)

export default function Lesson7() {
  const [pick, setPick] = useState<Pick>('a')
  const [on, setOn] = useState(true)
  const [goal, setGoal] = useState(1)                   // 滑片要去的位置：1 阻值最大，0 阻值最小
  const [rows, setRows] = useState<Partial<Record<WireKey, number>>>({})
  const [last, setLast] = useState<number | undefined>()
  const T = useTasks('gewu:circuit:7', TASKS)
  const p = useSlide(goal, 0.42)
  const knife = useSlide(on ? 1 : 0, 2.6), live = knife > 0.99
  const I = live ? (pick === 'rheo' ? rheoI(p) : boardI(pick)) : 0, m = meterRead('A', 'lo', I)
  const settled = useSettled(`${pick}${live}`, 1300) && live
  useEffect(() => { if (pick === 'rheo' && live && T.done.d && p < 0.001 && goal === 0) T.check(id => id === 'rheo') }, [p, pick, live])   // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (k: Pick) => { if (k === pick) return; setOn(false); setPick(k); if (k === 'rheo') setGoal(1); setTimeout(() => setOn(true), 900) }
  const record = () => {
    if (!settled || pick === 'rheo' || rows[pick] !== undefined) return
    const n = { ...rows, [pick]: round(I, 2) }; setRows(n); setLast(PICKS.indexOf(pick))
    const order: WireKey[] = ['a', 'b', 'c', 'd']
    T.check(id => order.includes(id as WireKey) && n[id as WireKey] !== undefined && order.slice(0, order.indexOf(id as WireKey)).every(k => n[k] !== undefined))
  }
  const resetAll = () => { setPick('a'); setOn(true); setGoal(1); setRows({}); setLast(undefined); T.reset() }
  const task = T.current
  const want: Pick | null = task && task.id !== pick ? task.id as Pick : null
  const { hint, next }: { hint: string; next: 'rec' | 'slide' | 'pick' | null } = !task ? { hint: '导体的电阻和材料、长度、横截面积有关；滑动变阻器靠改变接入电路的线圈长度改变电阻。', next: null }
    : want ? { hint: task.id === 'rheo' ? '四根都比过了。把接入电路的换成“滑动变阻器”' : `把 ${want} 接进电路：${WIRES[want as WireKey].desc}`, next: 'pick' }
    : !settled ? { hint: '接好导线，闭合开关…', next: null }
    : pick !== 'rheo' ? { hint: `${WIRES[pick].desc}。读电流表，按“记录数据”`, next: 'rec' }
    : goal === 1 && p > 0.999 ? { hint: '闭合开关前，滑片已经放在阻值最大的一端。按“滑片移到另一端”，也可以直接拖滑片', next: 'slide' }
    : { hint: '滑片在移动：接入电路的线圈越来越短…', next: null }
  // 两根导线：从灯泡、电池负极接到被测的那一段导体两头
  const lb = add(LAMP_AT, LP.b), bMinus = add(BAT, BP.minus)
  const [e1, e2]: [V3, V3] = pick === 'rheo' ? [add(RHE, RP.C), add(RHE, RP.A)] : (() => { const q = boardPosts(pick); return [add(BRD, q.b), add(BRD, q.a)] })()
  const labels: Label[] = [
    { id: 'r', at: W(add(MET, [0, 11.4, -2])), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: settled ? 1 : 0 }, children: <><small>电流</small>{f2(I)} A</> },
    ...(['a', 'b', 'c', 'd'] as WireKey[]).map(k => ({ id: k, at: W(add(BRD, [BOARD.x0 - 5, 1.2, BOARD.rows[k]])), ax: 1, className: 'scene-name -translate-y-1/2', style: { color: pick === k ? '#7fe3d4' : undefined }, children: k })),
    { id: 'rv', at: W(add(RHE, [sliderX(p), 11, 0])), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: pick === 'rheo' && live ? 1 : 0 }, children: <><small>接入</small>{round(rheoR(p), 0)} Ω</> },
    { id: 'n1', at: W(add(BRD, [0, 2.4, -11])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电阻示教板' },
    { id: 'n2', at: W(add(RHE, [-15, 1, 5])), ax: 1, name: true, className: 'scene-name -translate-y-full', children: `滑动变阻器 · ${RHEO.max} Ω ${RHEO.amp} A` },
    { id: 'n3', at: W(add(LAMP_AT, [0, 4.6, 0])), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: 'L₁' },
  ]
  const head = ['', 'a', 'b', 'c', 'd']
  return (
    <LabShell title="电路" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="电路"
      stage={<Place at="l7" labels={labels}>
        <Bench at="l7">
          <group position={BRD}><Board active={pick === 'rheo' ? null : pick} /></group>
          <group position={BAT}><BatteryBox n={2} /></group>
          <group position={SW}><KnifeSwitch on={knife} /></group>
          <group position={MET}><Meter kind="A" k={m.k} /></group>
          <group position={LAMP_AT}><Lamp lit={lampLit(I)} name="L₁" /></group>
          <group position={RHE}><Rheostat p={p} onDrag={pick === 'rheo' && live ? v => setGoal(v) : undefined} /></group>
          <Wire a={add(BAT, BP.plus)} b={add(SW, SP.a)} color={RED} flow={I} />
          <Wire a={add(SW, SP.b)} b={add(MET, MP.lo)} color={RED} flow={I} lift={2.2} />
          <Wire a={add(MET, MP.neg)} b={add(LAMP_AT, LP.a)} color={BLACK} flow={I} via={[[3, 0, 16], [16, 0, 16]]} />
          <Wire key={`p${pick}`} a={lb} b={e1} color="#d8b33a" flow={I} via={pick === 'rheo' ? [[26, 0, 22]] : [[29, 0, 2]]} />
          <Wire key={`m${pick}`} a={e2} b={bMinus} color="#2f62b0" flow={I} via={pick === 'rheo' ? [[-30, 0, 26]] : [[-31, 0, -3]]} />
        </Bench>
      </Place>}
      lesson={<LessonBlock no="7" title="电阻和滑动变阻器" concept="导体越长、越细，电阻越大" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>电阻表示导体对电流阻碍作用的大小，符号 <i className="font-formula">R</i>，单位是欧姆（Ω）。电压一定时，电阻越大，电流越小，所以可以比电流来比电阻。</p>
          <p className="mt-3">导体的电阻是导体本身的一种性质，它的大小决定于导体的<b className="text-white">材料、长度和横截面积</b>，还和温度有关。每次只改变一个因素，其余的保持相同，这叫控制变量法。</p>
          <p className="mt-3">滑动变阻器靠改变接入电路中电阻丝的长度来改变电阻。要“一上一下”接两个接线柱；闭合开关前，滑片要放在阻值最大的位置。同时接下面两个，滑片不起作用；同时接上面两个，接入的电阻为零。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四根金属丝和变阻器都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">导体的电阻和材料、长度、横截面积有关；滑动变阻器靠改变接入的长度改变电阻</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">a {f2(boardI('a'))} A，b {f2(boardI('b'))} A，c {f2(boardI('c'))} A，d {f2(boardI('d'))} A。滑片从一端移到另一端，电流从 {f2(rheoI(1))} A 变到 {f2(rheoI(0))} A。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">电流表的示数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{settled ? f2(I) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">A</span></div>
            <div className="mt-1.5 text-[13px] text-white/55">{pick === 'rheo' ? `滑动变阻器 · 接入 ${round(rheoR(p), 0)} Ω` : WIRES[pick].desc}</div>
          </div>
          <DialView kind="A" range="lo" k={m.k} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="U" value="3.0 V" unit="电源" />
            <ParamTile symbol="L₁" value={lampLit(I) > 0.6 ? '较亮' : lampLit(I) > 0.3 ? '亮' : lampLit(I) > 0 ? '较暗' : '不亮'} unit="灯泡的亮度" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">电路图</h2>
          <Schematic link="board" on={on} lit1={lampLit(I)} amp="loop" rheo={pick === 'rheo'} hot={{ main: live }} />
          <h2 className="mt-4 text-[12.5px] text-white/55">电流（A）</h2>
          <Table head={head} rows={[['电流', ...(['a', 'b', 'c', 'd'] as WireKey[]).map(k => rows[k] !== undefined ? f2(rows[k]!) : '—')]]} total={1} hi={last !== undefined ? 0 : undefined} eq={T.finale} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!settled || pick === 'rheo' || rows[pick as WireKey] !== undefined}>记录数据</LabButton>
        <LabButton primary={next === 'slide'} pulse={next === 'slide'} onClick={() => setGoal(g => g > 0.5 ? 0 : 1)} disabled={pick !== 'rheo' || !live}>滑片移到另一端</LabButton>
      </>}
      extras={
        <Control label="接入电路的是">
          <Segmented label="接入电路的是" pulse={next === 'pick'} want={want} value={pick} onChange={choose} options={PICKS.map(k => ({ value: k, label: k === 'rheo' ? '滑动变阻器' : k }))} />
        </Control>
      }
    />
  )
}
