// 质量与密度 · 第 5 课 密度（ρ = m/V；同体积的铝、铁、铜质量不同；g/cm³ 和 kg/m³ 的换算）
import { useRef, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Balance, WeightSet, panAt, useWeigh } from './balance'
import { LESSONS, goLesson } from './lessons'
import { Block, Carry, Room, newLive, useSettled, type V3 } from './parts'
import { BARS, BAR_V, RHO, density, massOf, sci, toSI, type Metal3 } from './physics'
import { ST, TOP } from './world'

const rho = (k: Metal3) => density(massOf(k, BAR_V), BAR_V)
const TASKS: Task[] = BARS.map(k => ({ id: k, text: `称 ${BAR_V} cm³ 的${RHO[k].name}块，算出它的密度`, note: `ρ = ${massOf(k, BAR_V)} g ÷ ${BAR_V} cm³ = ${rho(k).toFixed(1)} g/cm³ = ${sci(toSI(rho(k)))} kg/m³` }))
const X = ST.s5, BASE: V3 = [X - 0.3, TOP, 0.15], BOX: V3 = [X + 1.72, TOP, 0.8]
const home = (j: number): V3 => [X - 2.05 + j * 0.46, TOP + 0.02, 1.02]

export default function Lesson5() {
  const [metal, setMetal] = useState<Metal3>('al')
  const [placed, setPlaced] = useState(false)
  const [rows, setRows] = useState<Metal3[]>([])
  const T = useTasks('gewu:density:5', TASKS)
  const live = useRef(newLive())
  const m = massOf(metal, BAR_V), Wg = useWeigh(placed ? m : null), settled = useSettled(`${metal}${placed}`, 4300), dup = rows.includes(metal)
  const put = () => { if (!settled || placed) return; setPlaced(true) }
  const record = () => { if (!placed || !settled || dup) return; const next = [...rows, metal]; setRows(next); T.check(id => next.includes(id as Metal3)) }
  const pick = (k: Metal3) => { if (!settled) return; setMetal(k); setPlaced(false) }
  const resetAll = () => { setMetal('al'); setPlaced(false); setRows([]); T.reset() }
  const task = T.current, show = placed && settled
  const { hint, next }: { hint: string; next: 'metal' | 'put' | 'record' | null } = !task ? { hint: '三块一样大，质量不一样：密度是物质的一种特性。', next: null }
    : !settled ? { hint: placed ? '放上金属块，加砝码、移游码…' : '把上一块拿回去…', next: null }
    : metal !== task.id ? { hint: `换成${RHO[task.id as Metal3].name}块：三块的体积都是 ${BAR_V} cm³`, next: 'metal' }
    : !placed ? { hint: `按“放上天平”，称出这块${RHO[metal].name}的质量`, next: 'put' }
    : { hint: `m = ${m} g，V = ${BAR_V} cm³，ρ = m ÷ V = ${rho(metal).toFixed(1)} g/cm³。按“记录”`, next: 'record' }
  const labels: Label[] = [
    { id: 'm', at: [BASE[0], TOP + 1.66, BASE[2]], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: show ? 1 : 0 }, children: <><small>{RHO[metal].name}块的质量</small>{m.toFixed(1)} g</> },
    ...BARS.map((k, j) => ({ id: k, at: [home(j)[0], TOP + 0.2, home(j)[2]] as V3, ax: 0.5, name: true, className: 'scene-name -translate-y-full', style: metal === k && placed ? { display: 'none' } : undefined, children: RHO[k].name })),
  ]
  return (
    <LabShell title="质量与密度" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={`${RHO[metal].name}块`}
      stage={<Room at="s5" labels={labels}>
        <Balance at={BASE} left={Wg.left} right={Wg.right} rider={Wg.rider} live={live} />
        <WeightSet box={BOX} base={BASE} on={Wg.on} live={live} />
        <RoundedBox args={[1.5, 0.02, 0.5]} radius={0.008} smoothness={2} position={[X - 1.6, TOP + 0.01, 1.02]} receiveShadow><meshStandardMaterial color="#2e4a44" roughness={0.95} /></RoundedBox>
        {BARS.map((k, j) => { const up = metal === k && placed; return <Carry key={k} at={up ? panAt(BASE, -1) : home(j)} ride={up ? 'L' : null} live={live}><Block kind={k} size={[2, 2, BAR_V / 4]} /></Carry> })}
      </Room>}
      lesson={<LessonBlock no="5" title="密度" concept="密度 ρ = m/V，是物质的一种特性" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>某种物质组成的物体的质量与它的体积之比，叫做这种物质的<b className="text-white">密度</b>，用 ρ 表示。</p>
          <p className="font-formula mt-2 text-center text-[19px] italic">ρ = m / V</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>单位：千克每立方米（kg/m³），常用的还有克每立方厘米（g/cm³）</li>
            <li>1 g/cm³ = 1×10³ kg/m³</li>
            <li>水的密度是 {sci(toSI(RHO.water.rho))} kg/m³：1 m³ 的水，质量是 {toSI(RHO.water.rho)} kg</li>
            <li>密度是物质的一种特性：同一种物质（状态不变时）密度一定，和这块东西的质量、体积无关</li>
          </ul>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种金属都算出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">密度 ρ = m/V，是物质的一种特性</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">一样大的三块，铝 {massOf('al', BAR_V)} g、铁 {massOf('fe', BAR_V)} g、铜 {massOf('cu', BAR_V)} g。密度分别是 {BARS.map(k => sci(toSI(rho(k)))).join('、')} kg/m³。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">ρ = m / V</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{show ? rho(metal).toFixed(1) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">g/cm³</span></div>
            <div className="mt-1.5 text-[15px] text-[#7fe3d4] tabular-nums">{show ? `= ${sci(toSI(rho(metal)))} kg/m³` : ' '}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="m" value={show ? `${m.toFixed(1)} g` : '—'} unit={show ? `砝码 ${Wg.sum} g + 游码 ${Wg.rider.toFixed(1)} g` : '质量'} />
            <ParamTile symbol="V" value={`${BAR_V} cm³`} unit="2 cm × 2 cm × 5 cm" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每称一块，按“记录”。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">物质</th><th className="text-right font-normal">m / g</th><th className="text-right font-normal">g/cm³</th><th className="text-right font-normal">kg/m³</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{RHO[k].name}</td><td className="text-right tabular-nums">{massOf(k, BAR_V)}</td><td className="text-right tabular-nums">{rho(k).toFixed(1)}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{sci(toSI(rho(k)))}</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'put'} onClick={put} disabled={!settled || placed}>放上天平</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!show || dup}>记录</LabButton>
      </>}
      extras={<Control label="物质"><Segmented label="物质" pulse={next === 'metal'} want={next === 'metal' ? task!.id as Metal3 : null} value={metal} disabled={!settled} onChange={pick} options={BARS.map(k => ({ value: k, label: `${RHO[k].name}块` }))} /></Control>}
    />
  )
}
