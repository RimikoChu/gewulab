// 物态变化 · 第 3 课 蒸发（影响蒸发快慢的三个因素：液体的温度、表面积、液面上方的空气流动；蒸发吸热有致冷作用）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Micro, Motes } from './fx'
import { Beaker, Clamp, Fan, GAUZE_T, Gauze, Glass3, Lamp, Ring, STAND, Stand, Thermo, thermoY } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Done, H2, Room, useRun } from './parts'
import { COOL, EVAP, FACTORS, ROOM, dryTime, readT, waterLeft, wetT, type Factor } from './physics'
import { ThermoView } from './views'
import { ST, TOP } from './world'

type Mode = Factor | 'cool'
const MODES: Mode[] = ['temp', 'area', 'wind', 'cool']
const SEG: Record<Mode, string> = { temp: '温度', area: '表面积', wind: '空气流动', cool: '蒸发吸热' }
const TASKS: Task[] = [
  ...(['temp', 'area', 'wind'] as Factor[]).map(k => ({ id: k, text: `只改变${FACTORS[k].name}：${FACTORS[k].change}，看哪一滴先干`, note: FACTORS[k].say })),
  { id: 'cool', text: '给温度计的玻璃泡蘸上酒精，看示数怎么变', note: `示数从 ${ROOM} ℃ 降到约 ${readT(wetT(COOL.at))} ℃：酒精蒸发要吸热` },
]
const X = ST.s3, Z = 0.4, RING = 0.86, PLATE = TOP + RING + GAUZE_T
const LX = X - 0.75, RX = X + 0.85, LC = LX + 0.12, RC = RX + 0.12, TX = X - 2.3, BULB = TOP + 0.95
const LENS: [number, number, number] = [RC + 0.75, TOP + 2.25, Z + 0.1]

/** 一块方玻璃片和上面的一滴水。left：还剩多少（0–1）；wide：摊开了 */
function Plate({ at, left, wide = false }: { at: [number, number, number]; left: number; wide?: boolean }) {
  const r = (wide ? 0.26 : 0.14) * Math.sqrt(left), h = wide ? 0.14 : 0.5
  return <group position={at}>
    <mesh position-y={0.012} renderOrder={3} castShadow><boxGeometry args={[0.62, 0.024, 0.62]} /><Glass3 o={0.22} /></mesh>
    {left > 0.004 && <mesh position-y={0.024} scale={[r, r * h, r]} renderOrder={4}><sphereGeometry args={[1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#6fb6ee" transparent opacity={0.85} roughness={0.04} clearcoat={1} envMapIntensity={2.2} /></mesh>}
  </group>
}

export default function Lesson3() {
  const [mode, setMode] = useState<Mode>('temp')
  const [on, setOn] = useState(false)
  const [rows, setRows] = useState<Mode[]>([])
  const f = mode === 'cool' ? undefined : mode, max = mode === 'cool' ? COOL.end : dryTime(mode) + 1.2
  const [t, setT] = useRun(on, 1, max)
  const T = useTasks('gewu:phase:3', TASKS)
  const done = on && t >= max, busy = on && !done
  const lit = useSlide(on && mode === 'temp' ? 1 : 0, 2.5), wind = useSlide(busy && mode === 'wind' ? 1 : 0, 1.5), drip = useSlide(on && mode !== 'cool' ? 1 : 0, 3)
  const L = on && f ? waterLeft(t) : 1, R = on && f ? waterLeft(t, f) : 1, temp = mode === 'cool' && on ? wetT(t) : ROOM
  useEffect(() => { if (done && !rows.includes(mode)) setRows(r => [...r, mode]); T.check(id => rows.includes(id as Mode)) })
  const pick = (m: Mode) => { if (busy || m === mode) return; setMode(m); setOn(false); setT(0) }
  const resetAll = () => { setMode('temp'); setOn(false); setT(0); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'mode' | 'go' | null } = !task ? { hint: '温度越高、表面积越大、空气流动越快，蒸发越快；蒸发要吸热。', next: null }
    : busy ? { hint: mode === 'cool' ? '酒精在蒸发，示数在往下降…' : R > 0 ? `两滴水一样多，${FACTORS[mode as Factor].change}，别的条件都一样…` : '右边这一滴已经干了，左边的还剩不少', next: null }
    : mode !== task.id ? { hint: `换成“${SEG[task.id as Mode]}”`, next: 'mode' }
    : { hint: mode === 'cool' ? '温度计现在是室温。按“蘸上酒精”' : `按“滴水并开始”：两块玻璃片各滴一滴一样多的水，${FACTORS[mode as Factor].change}`, next: 'go' }
  const labels: Label[] = [
    { id: 'l', at: [LC, PLATE + 0.2, Z], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: on && f ? 1 : 0 }, children: <><small>对照</small>还剩 {Math.round(L * 100)}%</> },
    { id: 'r', at: [RC, PLATE + 0.2, Z], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: on && f ? 1 : 0 }, children: <><small>{f ? SEG[f] : ''}</small>{R > 0 ? `还剩 ${Math.round(R * 100)}%` : '干了'}</> },
    { id: 't', at: [TX + 0.2, BULB + thermoY(temp), Z], className: 'scene-tag -translate-y-1/2', children: `${readT(temp)} ℃` },
    { id: 'm', at: [LENS[0], LENS[1] + 0.52, LENS[2]], ax: 0.5, className: 'scene-name -translate-y-full', children: '放大看：水面上的粒子' },
    { id: 'n1', at: [X + 2.25, TOP + 1.0, Z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '风扇' },
    { id: 'n2', at: [TX + 0.62, TOP + 0.5, Z + 0.3], name: true, className: 'scene-name', children: '酒精' },
  ]
  return (
    <LabShell title="物态变化" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={mode === 'cool' ? '温度计' : '两滴水'}
      stage={<Room at="s3" labels={labels} bloom={0.3}>
        {/* 左边：对照的那一滴；右边：改变一个条件的那一滴 */}
        <Stand at={[LX, TOP, Z]} h={2.2}><Ring y={RING} /></Stand>
        <Gauze at={[LC, TOP + RING, Z]} /><Plate at={[LC, PLATE, Z]} left={L * drip} />
        <Stand at={[RX, TOP, Z]} h={2.2}><Ring y={RING} /></Stand>
        <Gauze at={[RC, TOP + RING, Z]} /><Plate at={[RC, PLATE, Z]} left={R * drip} wide={mode === 'area'} />
        <Lamp at={[RC, TOP + STAND.baseH, Z]} lit={lit * 0.75} capAt={[0.1, -STAND.baseH, 0.75]} />
        <Lamp at={[LC, TOP + STAND.baseH, Z]} lit={0} />
        <Fan at={[X + 2.25, TOP, Z]} on={wind} />
        {on && f && <>
          <Motes at={[LC, PLATE + 0.04, Z]} r={0.08} rate={L > 0 ? 0.3 : 0} h={0.6} />
          <Motes at={[RC, PLATE + 0.04, Z]} r={mode === 'area' ? 0.17 : 0.08} rate={R > 0 ? 0.3 * EVAP.times[f] : 0} h={0.7} n={26} wind={mode === 'wind' ? -0.9 : 0} />
        </>}
        <Micro at={LENS} R={0.46} from={[RC + 0.05, PLATE + 0.06, Z]} liquid={1} gas={on && f ? 0.75 * (1 - R) : 0} pool tone="#6fb6ee" />
        {/* 最左边：夹在铁架台上的温度计，玻璃泡包着棉花；旁边一小杯酒精 */}
        <Stand at={[TX, TOP, Z]} h={2.9}><Clamp y={BULB - TOP + 1.45} grip={0.04} /></Stand>
        <Thermo at={[TX + 0.12, BULB, Z]} T={temp} cotton wet={mode === 'cool' && on ? Math.max(0, 1 - t / COOL.end) : 0} />
        {mode === 'cool' && busy && <Motes at={[TX + 0.12, BULB + 0.08, Z]} r={0.07} rate={0.9} h={0.6} color="#d9f0ff" />}
        <Beaker at={[TX + 0.42, TOP + STAND.baseH, Z + 0.1]} k={0.5} level={0.3} color="#9cc3e6" o={0.25} marks={false} />
      </Room>}
      lesson={<LessonBlock no="3" title="蒸发" concept="蒸发在任何温度下都能发生，要吸热" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>物质从液态变成气态叫<b className="text-white">汽化</b>。蒸发是汽化的一种：只在液体表面发生，在任何温度下都能发生。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            {(['temp', 'area', 'wind'] as Factor[]).map(k => <li key={k}>{FACTORS[k].say}</li>)}
            <li>液体蒸发时要从周围吸热，所以蒸发有致冷作用</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">每次只改变一个条件，别的都保持一样，才能看出是哪个条件在起作用。画面里把蒸发放快了，“还剩百分之几”只用来比较快慢。</p>
        </>} />}
      finale={T.finale && <Done head="四次都做完了" title="温度高、表面积大、空气流动快，蒸发就快" onClose={() => T.setFinale(false)}>三次比较里，每次都是改变了条件的那一滴先干。温度计蘸了酒精，示数降到约 {readT(wetT(COOL.at))} ℃：蒸发吸热，有致冷作用。</Done>}
      panel={
        <Glass className="px-4 py-4">
          {mode === 'cool' ? <><h2 className="text-[12.5px] text-white/55">温度计</h2><ThermoView T={temp} note={on ? '玻璃泡上有酒精' : '玻璃泡是干的'} /></> : <>
            <h2 className="text-[12.5px] text-white/55">两滴水各还剩多少</h2>
            {[{ name: '左：对照', v: on ? L : 1 }, { name: `右：${FACTORS[mode].change.replace('右边的', '')}`, v: on ? R : 1 }].map(b => <div key={b.name} className="mt-3">
              <div className="flex justify-between text-[13.5px]"><span className="text-white/75">{b.name}</span><span className="font-semibold tabular-nums">{b.v > 0 ? `${Math.round(b.v * 100)}%` : '干了'}</span></div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#6fb6ee]" style={{ width: `${b.v * 100}%` }} /></div>
            </div>)}
          </>}
          <H2>比较的结果</H2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每次只改变一个条件，看哪一滴先干。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">改变了什么</th><th className="text-right font-normal">结果</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{k === 'cool' ? '玻璃泡蘸酒精' : FACTORS[k].name}</td><td className="text-right font-semibold text-[#7fe3d4]">{k === 'cool' ? '示数下降' : k === 'temp' ? '热的先干' : k === 'area' ? '摊开的先干' : '吹风的先干'}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={() => { setT(0); setOn(true) }} disabled={on}>{mode === 'cool' ? '蘸上酒精' : '滴水并开始'}</LabButton>
      </>}
      extras={<Control label="改变哪个条件"><Segmented label="改变哪个条件" pulse={next === 'mode'} want={next === 'mode' ? task!.id as Mode : null} value={mode} disabled={busy} onChange={pick} options={MODES.map(k => ({ value: k, label: SEG[k] }))} /></Control>}
    />
  )
}
