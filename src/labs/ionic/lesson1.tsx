// 水溶液里的离子平衡 · 第 1 课 强电解质和弱电解质：实验台西头的导电性实验装置。
// 一块木底板上并排两只 250 mL 烧杯，分别盛 0.10 mol/L 盐酸和 0.10 mol/L 醋酸，各插一对石墨电极，各串一只小灯泡；
// 左边一台学生电源和一只闸刀开关。闭合开关，盐酸那只灯亮、醋酸那只很暗；放大窗里看两杯溶液里有什么。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Glass as Panel, Control, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Beaker, LOOK, u } from './gear'
import { Bulb, GraphitePair, KnifeSwitch, PowerSupply, Wire } from './rig'
import { Legend, Micro, type Mix } from './micro'
import { LESSONS, goLesson } from './lessons'
import { useRun } from './parts'
import { Fin } from './fin'
import { CELLS, cellAlpha, cellH, glow, sci, type CellKey } from './physics'
import { BZ, SPOT, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l1, Y = TOP, Z = BZ + 0.6
const p = (x: number, y: number, z: number): V3 => [X0 + u(x), Y + u(y), Z + u(z)]
const BOARD_H = 0.018
const CUP: Record<CellKey, V3> = { hcl: p(-0.03, BOARD_H, 0.05), hac: p(0.1, BOARD_H, 0.05) }
const SHELF = 0.135, LAMP: Record<CellKey, V3> = { hcl: p(-0.03, BOARD_H + SHELF, -0.085), hac: p(0.1, BOARD_H + SHELF, -0.085) }
const SUPPLY = p(-0.19, 0, -0.07), SWITCH = p(-0.13, 0, 0.09)
const LIQ = 0.06
const TASKS: Task[] = [
  { id: 'on', text: '闭合开关，比较两只灯泡', note: '浓度一样，盐酸那只灯很亮，醋酸那只很暗：盐酸里自由移动的离子多得多' },
  { id: 'hcl', text: '放大看盐酸里有什么', note: '只有 H⁺ 和 Cl⁻，没有 HCl 分子：HCl 在水里完全电离，是强电解质' },
  { id: 'hac', text: '放大看醋酸里有什么', note: '大多是 CH₃COOH 分子，只有约 1.3% 电离成离子：醋酸是弱电解质' },
]
/** 放大窗里画几个粒子：盐酸全部电离；醋酸大部分是分子（示意，离子画得比实际多一点才看得见） */
const MIX: Record<CellKey, Mix> = { hcl: { H: 11, Cl: 11 }, hac: { HAc: 16, H: 1, Ac: 1 } }

export default function Lesson1() {
  const [on, setOn] = useState(false)
  const [view, setView] = useState<CellKey | ''>('')
  const T = useTasks('gewu:ionic:1', TASKS)
  const look = useRun(3, () => T.check(id => id === view))
  const resetAll = () => { look.snap(0); setOn(false); setView(''); T.reset() }
  const pick = (k: CellKey) => { setView(k); if (on) look.run() }
  const close = () => { setOn(true); setTimeout(() => T.check(id => id === 'on'), 1400) }
  const task = T.current
  const { hint, next }: { hint: string; next: 'on' | 'view' | null } = !task ? { hint: '在水溶液中完全电离的是强电解质，部分电离的是弱电解质。', next: null }
    : task.id === 'on' ? (on ? { hint: '电流通过两杯溶液…', next: null } : { hint: '两杯酸的浓度都是 0.10 mol/L。闭合开关，看两只灯泡', next: 'on' })
    : look.busy ? { hint: '放大窗里的粒子在不停地运动…', next: null }
    : task.id === 'hcl' ? { hint: '一只亮、一只暗。放大看盐酸里有什么', next: 'view' }
    : { hint: '再放大看醋酸里有什么', next: 'view' }

  const yaw = SPOT.l1.view[0]
  const MIC = p(-0.14, 0.24, 0.0)
  const labels: Label[] = [
    ...(['hcl', 'hac'] as CellKey[]).map(k => ({ id: `n${k}`, at: [CUP[k][0], CUP[k][1] - u(0.004), CUP[k][2] + u(0.035)] as V3, ax: 0.5, className: 'scene-tag -translate-y-0', children: <><small>{CELLS[k].name}</small>0.10 mol/L</> })),
    ...(view ? [{ id: 'mic', at: [MIC[0], MIC[1] + u(0.08), MIC[2]] as V3, ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>放大窗</small>{CELLS[view].name}</> }] : []),
    { id: 'ps', at: [SUPPLY[0], Y + u(0.13), SUPPLY[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '学生电源' },
    { id: 'sw', at: [SWITCH[0] - u(0.03), Y + u(0.01), SWITCH[2] + u(0.03)], ax: 1, name: true, className: 'scene-name', children: '开关' },
  ]
  const lit = (k: CellKey) => on ? glow(k) : 0
  const wire = (k: CellKey, s: number): V3 => [CUP[k][0] + s * u(0.015), CUP[k][1] + u(0.11), CUP[k][2]]
  return (
    <LabShell title="水溶液里的离子平衡" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="导电性实验"
      stage={<Place at="l1" labels={labels}>
        {/* 木底板 */}
        <RoundedBox args={[u(0.3), u(BOARD_H), u(0.26)]} radius={u(0.004)} position={[X0 + u(0.035), Y + u(BOARD_H / 2), Z]} castShadow receiveShadow><meshStandardMaterial color="#b98a58" roughness={0.6} /></RoundedBox>
        {/* 灯板：底板后沿立一块木板，板前一条搁板，两只灯座装在搁板上 */}
        <RoundedBox args={[u(0.3), u(SHELF + 0.03), u(0.014)]} radius={u(0.003)} position={[X0 + u(0.035), Y + u(BOARD_H + (SHELF + 0.03) / 2), Z - u(0.118)]} castShadow receiveShadow><meshStandardMaterial color="#c49562" roughness={0.6} /></RoundedBox>
        <RoundedBox args={[u(0.3), u(0.012), u(0.06)]} radius={u(0.003)} position={[X0 + u(0.035), Y + u(BOARD_H + SHELF - 0.006), Z - u(0.085)]} castShadow receiveShadow><meshStandardMaterial color="#c49562" roughness={0.6} /></RoundedBox>
        {(['hcl', 'hac'] as CellKey[]).map(k => <group key={k}>
          <group position={CUP[k]}><Beaker vol={250} level={LIQ} look={LOOK.clear} /></group>
          <group position={[CUP[k][0], CUP[k][1] + u(0.097), CUP[k][2]]}><GraphitePair depth={0.07} gap={0.03} /></group>
          <group position={LAMP[k]}><Bulb glow={lit(k)} /></group>
          {/* 电极 → 灯座，灯座 → 电源的公共线 */}
          <Wire pts={[wire(k, -1), [wire(k, -1)[0] - u(0.01), wire(k, -1)[1] + u(0.03), wire(k, -1)[2] - u(0.03)], [LAMP[k][0] - u(0.03), LAMP[k][1] + u(0.02), LAMP[k][2] + u(0.02)], [LAMP[k][0] - u(0.018), LAMP[k][1] + u(0.012), LAMP[k][2]]]} />
          <Wire color="#1b1d20" pts={[wire(k, 1), [wire(k, 1)[0] + u(0.02), wire(k, 1)[1] + u(0.02), wire(k, 1)[2] + u(0.02)], [wire(k, 1)[0] + u(0.03), Y + u(0.03), CUP[k][2] + u(0.1)], [SWITCH[0] + u(0.02), Y + u(0.012), SWITCH[2] + u(0.06)], [SWITCH[0], Y + u(0.02), SWITCH[2] + u(0.035)]]} />
          <Wire pts={[[LAMP[k][0] + u(0.018), LAMP[k][1] + u(0.012), LAMP[k][2]], [LAMP[k][0] + u(0.025), LAMP[k][1] - u(0.01), LAMP[k][2] - u(0.03)], [SUPPLY[0] + u(0.05), Y + u(0.06), LAMP[k][2] - u(0.04)], [SUPPLY[0] - u(0.03), Y + u(0.03), SUPPLY[2] + u(0.086)]]} />
        </group>)}
        <Wire color="#1b1d20" pts={[[SWITCH[0], Y + u(0.02), SWITCH[2] - u(0.035)], [SWITCH[0] + u(0.02), Y + u(0.015), SWITCH[2] - u(0.06)], [SUPPLY[0], Y + u(0.03), SUPPLY[2] + u(0.086)]]} />
        <group position={SUPPLY} rotation-y={0.25}><PowerSupply on={on} volts="6.0" /></group>
        <group position={SWITCH} rotation-y={0.1}><KnifeSwitch on={on} /></group>
        {view && <Micro at={MIC} r={u(0.07)} yaw={yaw} from={[CUP[view][0] + u(0.03), CUP[view][1] + u(0.035), CUP[view][2] + u(0.02)]} mix={MIX[view]} seed={view === 'hcl' ? 1 : 2} />}
      </Place>}
      lesson={<LessonBlock no="1" title="电解质的强弱" concept="浓度相同，盐酸里的离子多得多" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在水溶液中能够全部电离的电解质叫做强电解质，只能部分电离的叫做弱电解质。强酸、强碱和大部分盐是强电解质；弱酸、弱碱和水是弱电解质。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>HCl = H⁺ + Cl⁻（完全电离，用等号）</li>
            <li>CH₃COOH ⇌ CH₃COO⁻ + H⁺（部分电离，用可逆符号）</li>
            <li>溶液的导电能力取决于自由移动的离子的浓度和所带电荷：两杯浓度相同，盐酸里的离子多得多，灯泡就亮得多</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">灯泡亮度按两杯溶液里离子的浓度之比画出，是示意；放大窗里的粒子个数也是示意。</p>
        </>} />}
      finale={T.finale && <Fin tag="两杯酸都看过了" big="盐酸完全电离，醋酸只部分电离">同是 0.10 mol/L：盐酸里 c(H⁺) = 0.10 mol/L，醋酸里只有 {sci(cellH('hac'))} mol/L，电离了约 {(cellAlpha('hac') * 100).toFixed(1)}%。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">溶液里的 c(H⁺)</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="盐酸" value={CELLS.hcl.c.toFixed(2)} unit="mol/L · 电离 100%" />
            <ParamTile symbol="醋酸" value={sci(cellH('hac'))} unit={`mol/L · 电离 ${(cellAlpha('hac') * 100).toFixed(1)}%`} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">灯泡</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[15px]">
            <div className="rounded-xl bg-white/8 px-3 py-2.5">盐酸：{on ? '很亮' : '不亮'}</div>
            <div className="rounded-xl bg-white/8 px-3 py-2.5">醋酸：{on ? '很暗' : '不亮'}</div>
          </div>
          {view && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">放大窗 · {CELLS[view].name}</h2>
            <Legend items={view === 'hcl' ? ['H', 'Cl', 'H2O'] : ['HAc', 'Ac', 'H', 'H2O']} />
          </>}
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'on'} pulse={next === 'on'} onClick={close} disabled={on}>闭合开关</LabButton>
      </>}
      extras={
        <Control label="放大窗看哪一杯">
          <Segmented label="放大窗" pulse={next === 'view'} want={next === 'view' ? (task?.id as CellKey) : null} value={view} onChange={k => pick(k as CellKey)} disabled={!on || look.busy} options={[{ value: 'hcl', label: '盐酸' }, { value: 'hac', label: '醋酸' }]} />
        </Control>
      }
    />
  )
}
