// 从石油到塑料 · 第 4 课 乙烯和加成反应。化验台第二格：两只小钢瓶（甲烷、乙烯），两只洗气瓶，
// 一只装溴的四氯化碳溶液（橙红色），一只装酸性高锰酸钾溶液（紫色）。把气体通进去，看褪不褪色。放大窗里是乙烯的双键怎样打开。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { ETHENE, ETHENE_BR2, METHANE, METHANE_BR2 } from './frames'
import { GasBottle, Hose, WashBottle } from './glass'
import { LESSONS, goLesson } from './lessons'
import { Lens, Mol, lensPoint, type LensSpec } from './mol'
import { NARRATION } from './narration'
import { clamp01, ease, useRun, type V3 } from './parts'
import { ADDITION, BOND, fades, type Solution } from './physics'
import { BENCH_TOP as TOP, BZ, ST } from './room'
import { VOICE } from './voice'
import { Place, spot } from './world'

type Gas = 'methane' | 'ethene'
const TASKS: Task[] = [
  { id: 'methane-br2', text: '把甲烷通入溴的四氯化碳溶液', note: '不褪色：甲烷里都是单键，不和溴加成' },
  { id: 'methane-kmno4', text: '把甲烷通入酸性高锰酸钾溶液', note: '不褪色：甲烷不能被酸性高锰酸钾溶液氧化' },
  { id: 'ethene-br2', text: '换成乙烯，通入溴的四氯化碳溶液', note: '褪色了：CH₂=CH₂ + Br₂ → CH₂Br—CH₂Br，加成反应' },
  { id: 'ethene-kmno4', text: '把乙烯通入酸性高锰酸钾溶液', note: '也褪色了：乙烯被氧化。两种褪色的原因不一样' },
]
const X = ST.l4, VIEW: [number, number] = [-0.14, 0.32]
const SPOT = spot(X + 0.125, TOP + 0.37, BZ, 1.0, 0.5, VIEW, true)
const LENS: LensSpec = { at: [X + 0.47, TOP + 0.37, BZ + 0.02], R: 0.17, rotY: VIEW[0] }
const U = LENS.R / 5.2
const BOT: Record<Solution, number> = { br2: X - 0.02, kmno4: X + 0.2 }
const COLOR: Record<Solution, string> = { br2: '#b8380a', kmno4: '#560f74' }
const NAME: Record<Solution, string> = { br2: '溴的四氯化碳溶液', kmno4: '酸性高锰酸钾溶液' }
const GAS: Record<Gas, string> = { methane: '甲烷', ethene: '乙烯' }
const SEC = 4.2

export default function Lesson4() {
  const T = useTasks('gewu:petro:4', TASKS)
  const [gas, setGas] = useState<Gas>('methane')
  const [last, setLast] = useState<{ gas: Gas; sol: Solution } | null>(null)
  const run = useRun(SEC, () => { if (last) T.check(id => id === `${last.gas}-${last.sol}`) })
  const start = (sol: Solution) => { if (run.busy) return; setLast({ gas, sol }); run.run() }
  const resetAll = () => { setGas('methane'); setLast(null); run.snap(0); T.reset() }

  const task = T.current?.id, [needGas, needSol] = (task ?? '-').split('-') as [Gas, Solution]
  const next: 'seg' | Solution | null = !task || run.busy ? null : gas !== needGas ? 'seg' : needSol
  const res = last ? fades(last.gas, last.sol) : null
  const hint = !task ? '乙烯有碳碳双键，能加成、能被氧化；甲烷都不能。'
    : run.busy ? (res!.fade ? '气泡一串串冒上来，溶液的颜色在变浅…' : '气泡一串串冒上来，看溶液的颜色变不变…')
    : gas !== needGas ? `把气体换成${GAS[needGas]}` : `把${GAS[gas]}通入${NAME[needSol]}`

  // 每只瓶里的颜色：正在通（或刚通完）乙烯的那一只按进度褪色，其余是新换的溶液
  const fadeOf = (sol: Solution) => last && last.sol === sol && fades(last.gas, sol).fade ? ease(clamp01((run.k - 0.15) / 0.75)) : 0
  const colorOf = (sol: Solution) => new THREE.Color(COLOR[sol]).lerp(new THREE.Color('#e9eeea'), fadeOf(sol) * 0.94)
  const adding = last?.gas === 'ethene' && last.sol === 'br2'
  const frames = adding ? ETHENE_BR2 : null
  const k = adding ? ease(clamp01((run.k - 0.2) / 0.6)) : 0
  const still = gas === 'methane' ? (last?.sol === 'kmno4' ? METHANE : METHANE_BR2) : (last?.sol === 'kmno4' ? ETHENE : ETHENE_BR2[0])
  const showFrames = adding && last.gas === gas
  const hoses = useMemo(() => {
    const y = TOP + 0.19 * 1.35, src = (g: Gas): V3 => [X - (g === 'methane' ? 0.34 : 0.22) + 0.075, TOP + 0.445, BZ - 0.06]
    const to = (g: Gas, sol: Solution): V3[] => [src(g), [src(g)[0] + 0.05, TOP + 0.47, BZ - 0.02], [BOT[sol] - 0.12, TOP + 0.3, BZ + 0.03], [BOT[sol] - 0.1, y + 0.004, BZ], [BOT[sol] - 0.0675, y, BZ]]
    return { to, vent: (sol: Solution): V3[] => [[BOT[sol] + 0.0675, y, BZ], [BOT[sol] + 0.085, y + 0.004, BZ - 0.01], [BOT[sol] + 0.1, y + 0.03, BZ - 0.06], [BOT[sol] + 0.105, y + 0.09, BZ - 0.16]] }
  }, [])
  const hoseSol: Solution = last?.sol ?? needSol ?? 'br2'
  const hose = useMemo(() => hoses.to(gas, hoseSol), [hoses, gas, hoseSol])
  const vents = useMemo(() => (['br2', 'kmno4'] as Solution[]).map(s => hoses.vent(s)), [hoses])
  const labels: Label[] = [
    { id: 'lens', at: [LENS.at[0], LENS.at[1] + LENS.R + 0.012, LENS.at[2]], ax: 0.5, className: `scene-tag ${showFrames && !run.busy ? 'key' : ''} -translate-y-full`, children: showFrames && run.k > 0.6 ? <><small>1,2-二溴乙烷</small>CH₂Br—CH₂Br</> : gas === 'methane' ? <><small>甲烷</small>CH₄ · 全是单键</> : <><small>乙烯</small>CH₂=CH₂ · 平面形，键角约 120°</> },
    { id: 'len', at: lensPoint(LENS, 0, -2.6, U), ax: 0.5, className: 'scene-name', style: { opacity: gas === 'ethene' ? 1 : 0 }, children: showFrames && run.k > 0.6 ? `C—C 单键 ${BOND.single} pm` : `C=C 双键 ${BOND.double} pm` },
    ...(['br2', 'kmno4'] as Solution[]).map(s => ({ id: s, at: [BOT[s], TOP + 0.3, BZ] as V3, ax: s === 'br2' ? 0.75 : 0.25, className: `scene-tag ${last?.sol === s && !run.busy && run.k >= 1 ? 'key' : ''} -translate-y-full`, children: <><small>{NAME[s]}</small>{last?.sol === s && run.k >= 1 ? (fades(last.gas, s).fade ? '褪色' : '不褪色') : s === 'br2' ? '橙红色' : '紫色'}</> })),
    { id: 'g1', at: [X - 0.34, TOP + 0.52, BZ - 0.06], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '甲烷' },
    { id: 'g2', at: [X - 0.22, TOP + 0.52, BZ - 0.06], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '乙烯' },
  ]
  return (
    <LabShell title="从石油到塑料" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel={`把${GAS[gas]}通进去`}
      stage={<Place at={SPOT} labels={labels}>
        <group position={[X - 0.34, TOP, BZ - 0.06]}><GasBottle color="#7a4a2a" name="甲烷" /></group>
        <group position={[X - 0.22, TOP, BZ - 0.06]}><GasBottle color="#7a4a2a" name="乙烯" text="#ffe27a" /></group>
        {(['br2', 'kmno4'] as Solution[]).map(s => <group key={s} position={[BOT[s], TOP, BZ]} scale={1.35}><WashBottle color={colorOf(s)} bubbling={run.busy && last?.sol === s} /></group>)}
        <Hose pts={hose} />
        {vents.map((v, i) => <Hose key={i} pts={v} color="#8a8f92" r={0.0035} />)}
        <Lens spec={LENS} point={[BOT[hoseSol] + 0.02, TOP + 0.06, BZ + 0.03]}>
          {showFrames && frames ? <Mol a={frames[0]} b={frames[1]} k={k} u={U} /> : <Mol a={still} u={U} />}
        </Lens>
      </Place>}
      lesson={<LessonBlock no="4" title="乙烯和加成反应" concept="双键打开一根，两头各接上一个原子" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>乙烯 CH₂=CH₂ 的两个碳原子之间是<b className="text-white">碳碳双键</b>，六个原子在同一个平面上，键角约 120°。双键里有一根键比较容易断开。</p>
          <p className="mt-3">把乙烯通入溴的四氯化碳溶液，溶液褪色：双键里的一根键断开，两个溴原子分别加到两个碳原子上，生成 1,2-二溴乙烷。有机物分子里双键（或三键）两端的碳原子和其他原子或原子团直接结合生成新的化合物，叫<b className="text-white">加成反应</b>。乙烯还能和氢气、氯化氢、水加成。</p>
          <p className="mt-3">乙烯也能使酸性高锰酸钾溶液褪色，这是乙烯被<b className="text-white">氧化</b>了，不是加成。</p>
          <p className="mt-3">甲烷分子里都是单键，不能使这两种溶液褪色。所以这两种溶液都可以用来鉴别甲烷和乙烯。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">乙烯使两种溶液都褪色，甲烷都不褪色</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">乙烯和溴是加成：{ADDITION.ethene} + {ADDITION.br2} = {ADDITION.product}，只生成一种产物。乙烯使酸性高锰酸钾溶液褪色是被氧化。碳碳双键的键长 {BOND.double} pm，加成以后变成单键，{BOND.single} pm。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <h2 className="text-[12.5px] text-white/55">通进去以后</h2>
        <table className="mt-2 w-full text-center text-[14px]">
          <thead><tr className="text-[12.5px] text-white/55"><th className="py-1 text-left font-normal">气体</th><th className="font-normal">溴的 CCl₄ 溶液</th><th className="font-normal">酸性 KMnO₄ 溶液</th></tr></thead>
          <tbody>{(['methane', 'ethene'] as Gas[]).map(g => <tr key={g} className="border-t border-white/10"><td className="py-2 text-left">{GAS[g]}</td>{(['br2', 'kmno4'] as Solution[]).map(s => { const f = fades(g, s); return <td key={s} className={T.done[`${g}-${s}`] ? (f.fade ? 'font-semibold text-[#7fe3d4]' : 'text-white/85') : 'text-white/30'}>{T.done[`${g}-${s}`] ? (f.fade ? '褪色' : '不褪色') : '—'}</td> })}</tr>)}</tbody>
        </table>
        <h2 className="mt-4 text-[12.5px] text-white/55">碳碳键的键长</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <ParamTile symbol="C=C" value={String(BOND.double)} unit="pm · 乙烯" />
          <ParamTile symbol="C—C" value={String(BOND.single)} unit="pm · 加成以后" />
        </div>
        <p className="mt-4 font-formula text-[15px] text-white/85">CH₂=CH₂ + Br₂ → CH₂Br—CH₂Br</p>
        <p className="mt-1.5 text-[13px] text-white/55">相对分子质量：{ADDITION.ethene} + {ADDITION.br2} = {ADDITION.product}</p>
      </Panel>}
      actions={<>
        <LabButton primary={next === 'br2'} pulse={next === 'br2'} disabled={run.busy} onClick={() => start('br2')}>通入溴的四氯化碳溶液</LabButton>
        <LabButton primary={next === 'kmno4'} pulse={next === 'kmno4'} disabled={run.busy} onClick={() => start('kmno4')}>通入酸性高锰酸钾溶液</LabButton>
      </>}
      extras={
        <Control label="气体">
          <Segmented label="气体" pulse={next === 'seg'} want={task ? needGas : null} disabled={run.busy} value={gas} onChange={v => { setGas(v as Gas); setLast(null); run.snap(0) }} options={[{ value: 'methane', label: '甲烷' }, { value: 'ethene', label: '乙烯' }]} />
        </Control>
      }
    />
  )
}
