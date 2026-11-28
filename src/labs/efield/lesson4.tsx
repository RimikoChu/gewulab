// 静电场 · 第 4 课 电势和等势面：两块大平行板之间的匀强电场。先用探针量 A、B 两点的电势；再把试探电荷沿电场线从 A 移到 B、
// 沿等势面从 B 移到 C、从 A 斜着直接到 C，比较电场力做的功：只看两点的电势差，与路径无关。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { LESSONS, goLesson } from './lessons'
import { ST, TOP } from './layout'
import { UNI, fieldWork, potDiff, potential, sci, uniField, workBetween, type Pt, type V2 } from './physics'
import { R4, Rig4, inField } from './scene4'
import { useRun, useSeq } from './anim'
import { Big, Final, Sub } from './ui'
import { Place } from './world'

type Path = 'AB' | 'BC' | 'AC'
const ends = (p: Path) => [p[0] as Pt, p[1] as Pt] as const
const wj = (p: Path) => { const w = fieldWork(...ends(p)); return Math.abs(w) < 1e-12 ? '0' : sci(w) }
const TASKS: Task[] = [
  { id: 'phi', text: '用探针量 A、B 两点的电势', note: `A 点 ${potential(UNI.A[0])} V，B 点 ${potential(UNI.B[0])} V：沿电场线方向电势降低` },
  { id: 'AB', text: '把电荷沿电场线从 A 移到 B', note: `电场力做功 W = qU = ${wj('AB')} J` },
  { id: 'BC', text: '沿等势面从 B 移到 C', note: 'B、C 电势相等，电场力不做功' },
  { id: 'AC', text: '从 A 斜着直接移到 C', note: `还是 ${wj('AC')} J：做功只看电势差，与路径无关` },
]
const X = ST.l4

export default function Lesson4() {
  const [path, setPath] = useState<Path>('AB')
  const [probeTo, setProbeTo] = useState(0.15)
  const [seen, setSeen] = useState(0)             // 探针量过几个点
  const T = useTasks('gewu:efield:4', TASKS)
  const run = useRun(2.4), seq = useSeq()
  const probe = useSlide(probeTo, 0.16)
  const [a, b] = ends(path), from = UNI[a], to = UNI[b]
  const charge: V2 = [from[0] + (to[0] - from[0]) * run.p, from[1] + (to[1] - from[1]) * run.p]
  const W = workBetween(from[0], charge[0])
  const measure = () => seq.run([[0, () => { setSeen(0); setProbeTo(UNI.A[0]) }], [1500, () => setSeen(1)], [900, () => setProbeTo(UNI.B[0])], [2000, () => { setSeen(2); T.check(id => id === 'phi') }]])
  useEffect(() => { if (run.p >= 1) T.check(id => id === path && !!T.done.phi) }, [run.p])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (p: Path) => { run.reset(); setPath(p) }
  const resetAll = () => { seq.stop(); run.reset(); setPath('AB'); setProbeTo(0.15); setSeen(0); T.reset() }

  const task = T.current, moving = run.p > 0 && run.p < 1
  type Next = 'measure' | 'path' | 'move' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '电场力做功 W = qU，只看两点的电势差。', next: null }
    if (task.id === 'phi') return seq.busy ? { hint: '探针在量电势，看读数…', next: null } : { hint: '用探针量 A、B 两点的电势', next: 'measure' }
    if (path !== task.id) return { hint: `把路径换成 ${task.id[0]} 到 ${task.id[1]}`, next: 'path' }
    return run.p > 0 ? { hint: '电荷在走，看电场力做了多少功…', next: null } : { hint: '移动电荷', next: 'move' }
  })()

  const at = (p: V2, dx = 0, dy = 0, z = 0): [number, number, number] => { const v = inField(p, z); return [X + v[0] + dx, TOP + v[1] + dy, v[2]] }
  const labels: Label[] = [
    ...[500, 400, 300, 200, 100].map((v, i) => ({ id: `v${v}`, at: at([0.05 + i * 0.05, R4.plate / 2 - 0.005 + (i % 2) * 0.022]), ax: 0.5, className: 'scene-name -translate-y-full', children: `${v} V` })),
    { id: 'n1', at: [X - 0.17, TOP + 0.1, 0.19], ax: 1, name: true, className: 'scene-name', children: '正极板 600 V' },
    { id: 'n2', at: [X + 0.17, TOP + 0.1, 0.19], ax: 0, name: true, className: 'scene-name', children: '负极板 0 V（接地）' },
    { id: 'A', at: at(UNI.A, 0, -0.012), ax: 0.5, className: 'scene-name', children: 'A' },
    { id: 'B', at: at(UNI.B, 0, -0.012), ax: 0.5, className: 'scene-name', children: 'B' },
    { id: 'C', at: at(UNI.C, 0.012, 0.02), ax: 0, className: 'scene-name -translate-y-full', children: 'C' },
    { id: 'p', at: [X - UNI.d / 2 + probe, TOP + R4.y + 0.022, R4.rail], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>探针</small>{potential(probe).toFixed(0)} V</> },
    { id: 'w', at: at(charge, 0, 0.03), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: run.p > 0 ? 1 : 0 }, children: <><small>W</small>{Math.abs(W) < 1e-12 ? '0' : sci(W)} J</> },
  ]
  return (
    <LabShell title="静电场" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="探针和试探电荷"
      stage={<Place at="l4" cur="l4" labels={labels}><Rig4 probe={probe} charge={charge} trail={run.p > 0 ? from : null} /></Place>}
      lesson={<LessonBlock no="4" title="电势和等势面" concept="电场力做功只看两点的电势差" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>电荷在电场中具有电势能。电荷在某点的电势能与它的电荷量之比，叫这一点的<b className="text-white">电势</b> φ，单位伏（V）。电势的高低是相对的，这里取接地的负极板为 0。</p>
          <p className="mt-3">电势相等的点组成<b className="text-white">等势面</b>。等势面与电场线垂直；沿电场线方向电势降低。</p>
          <p className="mt-3">两点电势的差叫电势差 U<sub>AB</sub> = φ<sub>A</sub> − φ<sub>B</sub>。电荷 q 从 A 移到 B，电场力做的功：</p>
          <p className="mt-2 text-center font-formula text-[17px] italic">W<sub>AB</sub> = q U<sub>AB</sub></p>
          <p className="mt-3">它只由起点和终点决定，与走哪条路无关。电场力做正功，电势能减少。</p>
          <p className="mt-3">匀强电场中，沿电场方向相距 d 的两点：U = Ed。</p>
        </>} />}
      finale={T.finale && <Final kicker="三条路都走过了" title="W = qU：做功只看电势差，与路径无关"
        body={<>U<sub>AB</sub> = {potDiff('A', 'B')} V，A 到 B、A 到 C 都是 {wj('AB')} J；沿等势面 B 到 C 是 0。E = U/d = {uniField()} V/m。</>} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula="W = q U" value={run.p > 0 ? (Math.abs(W) < 1e-12 ? '0' : sci(W)) : '—'} unit="J" note={run.p > 0 ? `电荷从 ${a} 出发，电场力做的功` : `电荷停在 ${a} 点`} />
          <Sub>探针量到的电势</Sub>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol={<>φ<sub>A</sub></>} value={seen >= 1 ? String(potential(UNI.A[0])) : '—'} unit="V" />
            <ParamTile symbol={<>φ<sub>B</sub></>} value={seen >= 2 ? String(potential(UNI.B[0])) : '—'} unit="V" />
            <ParamTile symbol={<>U<sub>AB</sub></>} value={seen >= 2 ? String(potDiff('A', 'B')) : '—'} unit="V" />
          </div>
          <Sub>关键参数</Sub>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="q" value={sci(UNI.q)} unit="C · 试探电荷" />
            <ParamTile symbol="E" value={seen >= 2 ? String(uniField()) : '—'} unit="V/m · U/d" />
          </div>
          <p className="mt-3 text-[12.5px] text-white/55">A、B 沿电场线相距 0.20 m；C 在 B 正上方 {UNI.C[1].toFixed(2)} m，和 B 在同一个等势面上。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'measure'} pulse={next === 'measure'} onClick={measure} disabled={seq.busy}>量电势</LabButton>
        <LabButton primary={next === 'move'} pulse={next === 'move'} onClick={run.start} disabled={!T.done.phi || moving}>移动电荷</LabButton>
      </>}
      extras={<Control label="路径"><Segmented label="路径" pulse={next === 'path'} want={next === 'path' ? task!.id as Path : null} value={path} onChange={pick} disabled={!T.done.phi || moving} options={[{ value: 'AB', label: 'A → B' }, { value: 'BC', label: 'B → C' }, { value: 'AC', label: 'A → C' }]} /></Control>}
    />
  )
}
