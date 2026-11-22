// 物态变化 · 第 1 课 温度和温度计（液体温度计的原理、摄氏温度的规定、正确使用和读数、体温计）
import { useEffect, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Rod, useSlide, useTasks, type Label } from '@/lab-kit'
import { Puffs } from './fx'
import { BEAKER, Beaker, Boss, Clinical, STAND, Stand, TH, Thermo, thermoY } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Done, H2, Room, useReading } from './parts'
import { BOIL, CLINIC, CUPS, FREEZE, ROOM, THERMO, readT, steady, type CupKey } from './physics'
import { ThermoView } from './views'
import { ST, TOP } from './world'

const KEYS: CupKey[] = ['ice', 'warm', 'hot']
const TASKS: Task[] = [
  { id: 'ice', text: '把温度计放进冰水混合物，等液柱停稳，记录', note: `${CUPS.ice.T} ℃：摄氏温度把冰水混合物的温度定为 ${FREEZE} ℃` },
  { id: 'warm', text: '换到温水里，等液柱停稳再记录', note: `${CUPS.warm.T} ℃：液柱升上去了，液体受热膨胀` },
  { id: 'hot', text: '换到热水里，等液柱停稳再记录', note: `${CUPS.hot.T} ℃：要等示数稳定以后再读` },
  { id: 'out', text: '把温度计从热水里拿出来，看示数怎么变', note: '一离开热水，示数就往下掉：读数时玻璃泡要留在液体里' },
]
const X = ST.s1, Z = 0.3, K = 0.85, BAR = 3.0
const CUP_X: Record<CupKey, number> = { ice: X - 0.6, warm: X + 0.1, hot: X + 0.8 }
/** 玻璃泡的底：提起来时在多高，放进杯里时在多高 */
const UP = TOP + 0.82, DOWN = TOP + (BEAKER.floor + 0.13) * K, DEPTH = 0.46
const ICE: [number, number, number, number][] = [[-0.07, 0.4, 0.04, 0.3], [0.08, 0.41, -0.05, 1.1], [0.0, 0.34, 0.08, 0.7], [-0.02, 0.43, -0.1, 2.0], [0.1, 0.36, 0.09, 1.6]]

export default function Lesson1() {
  const [cup, setCup] = useState<CupKey>('ice')
  const [down, setDown] = useState(false)
  const [rows, setRows] = useState<CupKey[]>([])
  const [xGoal, setXGoal] = useState(CUP_X.ice), [dGoal, setDGoal] = useState(0)
  const x = useSlide(xGoal, 1.4), drop = useSlide(dGoal, 1.5)
  const T = useTasks('gewu:phase:1', TASKS)
  // 换杯子：先提起来，平移过去，再放下
  const wantX = CUP_X[cup]
  useEffect(() => {
    if (xGoal !== wantX) { if (drop > 0.001) { if (dGoal !== 0) setDGoal(0) } else setXGoal(wantX) }
    else if (x === xGoal) { const d = down ? 1 : 0; if (dGoal !== d) setDGoal(d) }
  }, [wantX, xGoal, x, drop, down, dGoal])
  const there = xGoal === wantX && x === xGoal, inLiquid = there && drop > 0.55, moving = !there || drop !== dGoal || dGoal !== (down ? 1 : 0)
  const [temp, setTemp] = useReading(inLiquid ? CUPS[cup].T : ROOM, inLiquid ? 0.75 : 5, ROOM)
  const settled = inLiquid && drop === 1 && steady(temp, CUPS[cup].T)
  const dup = rows.includes(cup)
  const outOk = rows.includes('hot') && cup === 'hot' && !down && drop === 0 && temp < CUPS.hot.T - 6
  useEffect(() => { T.check(id => id === 'out' ? outOk : rows.includes(id as CupKey)) })
  const record = () => { if (settled && !dup) setRows(r => [...r, cup]) }
  const pick = (k: CupKey) => { if (k === cup) return; setCup(k); setDown(false) }
  const resetAll = () => { setCup('ice'); setDown(false); setRows([]); setXGoal(CUP_X.ice); setDGoal(0); setTemp(ROOM); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'cup' | 'toggle' | 'record' | null } = !task ? { hint: '温度计用完了。读数时玻璃泡留在液体里，等示数稳定，视线和液柱的顶相平。', next: null }
    : task.id === 'out' ? (down ? { hint: '按“拿出来”，盯着示数', next: 'toggle' } : { hint: '示数在往下掉…', next: null })
    : cup !== task.id ? { hint: `换到“${CUPS[task.id as CupKey].name}”`, next: 'cup' }
    : !down ? { hint: '按“放进杯里”：玻璃泡要全部浸入液体，不碰杯底和杯壁', next: 'toggle' }
    : !settled ? { hint: '液柱还在变，等它停稳…', next: null }
    : { hint: '液柱停稳了。视线和液柱的顶相平，读数，按“记录”', next: 'record' }
  const bulb = UP + (DOWN - UP) * drop
  const labels: Label[] = [
    { id: 't', at: [x + 0.07, bulb + thermoY(temp), Z], className: 'scene-tag key -translate-y-1/2', children: <><small>示数</small>{readT(temp)} ℃</> },
    ...KEYS.map((k, i): Label => ({ id: k, at: [CUP_X[k], TOP + 0.02, Z + 0.4 + i * 0.01], ax: 0.5, name: true, className: 'scene-name translate-y-2', children: CUPS[k].name })),
    { id: 'c', at: [X - 1.4, TOP + 0.12, Z + 1.05], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '体温计' },
    { id: 'th', at: [x - 0.06, bulb + 1.5, Z], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '温度计' },
  ]
  return (
    <LabShell title="物态变化" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="温度计"
      stage={<Room at="s1" labels={labels}>
        {/* 两只铁架台架着一根横杆，温度计用细线挂在横杆上 */}
        <Stand at={[X - 1.7, TOP, Z]}><Boss y={BAR} /></Stand>
        <group position={[X + 1.7, TOP, Z]} rotation-y={Math.PI}><Stand at={[0, 0, 0]}><Boss y={BAR} /></Stand></group>
        <Rod from={[X - 1.7 + STAND.rodX - 0.2, TOP + BAR, Z + 0.045]} to={[X + 1.7 - STAND.rodX + 0.2, TOP + BAR, Z + 0.045]} r={0.022}><meshStandardMaterial color="#8a8f94" metalness={1} roughness={0.3} /></Rod>
        <mesh position={[x, TOP + BAR - 0.03, Z + 0.045]} rotation-y={Math.PI / 2}><torusGeometry args={[0.04, 0.008, 8, 20]} /><meshStandardMaterial color="#d9c27a" metalness={1} roughness={0.3} /></mesh>
        <Rod from={[x, TOP + BAR - 0.07, Z + 0.045]} to={[x, bulb + TH.len + 0.04, Z]} r={0.004}><meshStandardMaterial color="#e9e4d4" roughness={0.9} /></Rod>
        <Thermo at={[x, bulb, Z]} T={temp} />
        {KEYS.map(k => <Beaker key={k} at={[CUP_X[k], TOP, Z]} k={K} level={DEPTH} o={k === 'ice' ? 0.3 : 0.42} color={k === 'hot' ? '#3f86c2' : '#2a7cc6'}>
          {k === 'ice' && ICE.map(([ix, iy, iz, r], i) => <RoundedBox key={i} args={[0.1, 0.09, 0.09]} radius={0.018} smoothness={3} position={[ix, iy, iz]} rotation={[r, r * 1.7, r * 0.6]}><meshPhysicalMaterial color="#eef7fb" transparent opacity={0.85} roughness={0.2} clearcoat={0.8} envMapIntensity={1.6} /></RoundedBox>)}
        </Beaker>)}
        <Puffs at={[CUP_X.hot, TOP + BEAKER.h * K, Z]} on={1} n={12} len={0.6} size={0.28} spread={0.1} dense={1.0} speed={0.3} color="#e6ecf0" />
        <Clinical at={[X - 1.4, TOP, Z + 1.05]} />
      </Room>}
      lesson={<LessonBlock no="1" title="温度和温度计" concept="玻璃泡留在液体里，示数稳定后再读" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>物体的冷热程度叫<b className="text-white">温度</b>。常用的液体温度计是根据<b className="text-white">液体热胀冷缩</b>的规律制成的。</p>
          <p className="mt-3"><b className="text-white">摄氏温度</b>：在标准大气压下，把冰水混合物的温度定为 {FREEZE} ℃，沸水的温度定为 {BOIL} ℃，它们之间分成 100 等份，每一等份是 1 ℃。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>用之前先看量程和分度值：这支是 {THERMO.min} ℃ 到 {THERMO.max} ℃，分度值 {THERMO.step} ℃</li>
            <li>玻璃泡全部浸入被测的液体，不碰容器底和容器壁</li>
            <li>稍等一会儿，示数稳定后再读</li>
            <li>读数时玻璃泡留在液体里，视线与液柱的液面相平</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">体温计的量程是 {CLINIC.min} ℃ 到 {CLINIC.max} ℃，分度值 {CLINIC.step} ℃。它的玻璃泡上方有一段很细的缩口，离开人体后液柱不会自己退回去，所以可以拿出来读数，用之前要甩一甩。</p>
        </>} />}
      finale={T.finale && <Done head="四步都做完了" title="玻璃泡留在液体里，示数稳定后再读" onClose={() => T.setFinale(false)}>冰水混合物 {CUPS.ice.T} ℃，温水 {CUPS.warm.T} ℃，热水 {CUPS.hot.T} ℃。温度计一离开被测的液体，示数就变了，所以不能拿出来读。</Done>}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">温度计</h2>
          <ThermoView T={temp} note={settled ? '示数稳定了' : inLiquid ? '液柱还在变' : '在空气里'} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="量程" value={`${THERMO.min}~${THERMO.max}`} unit="℃" />
            <ParamTile symbol="分度值" value={`${THERMO.step} ℃`} unit="每一小格" />
          </div>
          <H2>数据表</H2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每测一杯，等液柱停稳，按“记录”。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">被测的液体</th><th className="text-right font-normal">温度</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{CUPS[k].name}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{CUPS[k].T} ℃</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'toggle'} onClick={() => setDown(d => !d)} disabled={moving}>{down ? '拿出来' : '放进杯里'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!settled || dup}>记录</LabButton>
      </>}
      extras={<Control label="放进哪一杯"><Segmented label="放进哪一杯" pulse={next === 'cup'} want={next === 'cup' ? task!.id as CupKey : null} value={cup} disabled={moving} onChange={pick} options={KEYS.map(k => ({ value: k, label: CUPS[k].name }))} /></Control>}
    />
  )
}
